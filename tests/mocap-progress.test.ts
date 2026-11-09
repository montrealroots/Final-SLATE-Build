// Motion-capture calibration makes progress whichever way the days fall (November 9, 2026). Main's CI after #47 failed a
// browser journey that waited up to 60 days to see calibration "waiting only for its session". Across seeds that state
// exists in some worlds and not in others: when the animatic finishes on a day with a booked calibration session, the
// calibration runs that same day and is never seen waiting. These tests check what must hold in every world instead: no
// calibration before its prerequisites, only on a booked session, sessions that pass meanwhile are moved and never used
// up, a slow prerequisite delays it without a deadlock, and a session the performer can't attend is missed and rebooked.
// Seeds are documented below; each bound is a deadlock guard, not a promise about how long production takes.
import { describe, expect, it } from 'vitest';
import { DAY, addDaysToKey, bookMocap, dateKey, processUntil, releaseHire } from '../src/engine';
import { getPlace } from '../src/data/places';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, staffAll, startLife, startProduction } from './helpers';

/** The browser journey's film: a 3D short with a motion-captured monster, cast, staffed and its stage booked. */
function booked(tag: string) {
  const s = startLife(tag, 'ca-vancouver');
  const p = buildProject(s, { title: 'Iron Orchard', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 2, quality: 'limited' },
    [{ name: 'Wren', patch: { roleSize: 'lead' } }, { name: 'The Golem', patch: { roleSize: 'supporting', entity: 'monster', methods: ['voice', 'motion-capture'] } }],
    [{ place: 'Orchard', chars: ['Wren', 'The Golem'], minutes: 0.5 }]);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  processUntil(s, s.now + DAY, 'tick', 100000);
  startProduction(s, p, 1);
  const golem = p.characters.find((c) => c.name === 'The Golem')!;
  for (let d = 0; d < 84 && p.mocap?.[golem.id]?.status !== 'booked'; d++) {
    processUntil(s, s.now + DAY, 'tick', 100000);
    const cast = p.cast.find((c) => c.characterId === golem.id && c.method === 'motion-capture');
    if (cast && p.hires.some((h) => h.id === cast.hireId && h.status === 'accepted')) bookMocap(s, p, golem.id);
    else if (d % 7 === 6) manage(s, p);
  }
  expect(p.mocap?.[golem.id]?.status).toBe('booked');
  return { s, p, golem, zone: getPlace(p.axes.basePlaceId).zone };
}

/** One day: work runs at 6 PM, checked the next morning, so the day whose work was just done is yesterday. */
function nextDay(s: GameState, zone: string): string {
  processUntil(s, s.now + DAY, 'tick', 100000);
  return addDaysToKey(dateKey(s.now, zone), -1);
}

const task = (p: Project, id: string) => p.tasks.find((t) => t.id === id)!;

/** Day by day until the calibration is done, checking the invariants each day. Returns what happened. */
function runToCalibration(s: GameState, p: Project, characterId: string, zone: string, opts: { manageWeekly?: boolean; maxDays: number }) {
  let animaticDone = '';
  let sawWaitingForSession = false;
  for (let d = 0; d < opts.maxDays; d++) {
    if (opts.manageWeekly && d % 7 === 0) manage(s, p);
    const day = nextDay(s, zone);
    if (!animaticDone && task(p, 'anim:animatic:all').status === 'done') animaticDone = day;
    const calib = task(p, `anim:mocap-calib:${characterId}`);
    const sessions = p.mocap![characterId].sessions!;
    if (/^Next calibration session: /.test(calib.blockedReason ?? '') && calib.status !== 'done') sawWaitingForSession = true;
    if (calib.status === 'done') {
      const ran = sessions.find((x) => x.kind === 'calibration' && x.status === 'done');
      return { animaticDone, calibrated: day, ranOn: ran?.date, sawWaitingForSession, sessions };
    }
    // Unfinished, its prerequisite done: a calibration session is still booked (yesterday's is moved by today's work).
    if (animaticDone) expect(sessions.some((x) => x.kind === 'calibration' && x.status === 'booked' && x.date >= day), `no calibration session after ${day}`).toBe(true);
  }
  throw new Error(`Calibration wasn't done within ${opts.maxDays} days: ${task(p, `anim:mocap-calib:${characterId}`).blockedReason}`);
}

describe('motion-capture calibration makes progress in every world', () => {
  // Seeds 1 and 3: the animatic finishes before a booked session, so calibration is seen waiting for it. Seeds 5, 6 and
  // 13: the animatic finishes on a session day and calibration runs at once (measured November 9, 2026).
  const seeds = [1, 3, 5, 6, 13];
  const results = seeds.map((n) => {
    const { s, p, golem, zone } = booked(`mcseed-${n}`);
    return { n, ...runToCalibration(s, p, golem.id, zone, { maxDays: 120 }) };
  });

  it('calibrates only after the animatic, on a booked session date, in each of five documented seeds', () => {
    for (const r of results) {
      expect(r.ranOn, `seed ${r.n}`).toBe(r.calibrated);
      expect(r.calibrated >= r.animaticDone, `seed ${r.n}`).toBe(true);
    }
  });

  it('is seen waiting for its session in some worlds and not in others, so a journey cannot require that state', () => {
    expect(results.filter((r) => r.sawWaitingForSession).map((r) => r.n)).toEqual([1, 3]);
    expect(results.filter((r) => !r.sawWaitingForSession).map((r) => r.n)).toEqual([5, 6, 13]);
  });
}, 120_000);

describe('a prerequisite that takes longer than planned', () => {
  it('moves the sessions it passes, uses none of them up, and calibrates once the storyboards are redone', () => {
    // Seed 2: the storyboard artist is released before the boards are done. The replacement the staffing proposes is
    // the same artist, who asks for more after being let go; the producer accepts the counteroffer (helpers manage()).
    const { s, p, golem, zone } = booked('mcseed-2');
    const firstSession = p.mocap![golem.id].sessions!.find((x) => x.kind === 'calibration')!.date;
    const artist = p.hires.find((h) => h.roleId === 'storyboard-artist' && h.status === 'accepted')!;
    expect(task(p, 'anim:boards:all').status).not.toBe('done');
    releaseHire(s, p, artist.id);
    const r = runToCalibration(s, p, golem.id, zone, { manageWeekly: true, maxDays: 180 });
    expect(r.animaticDone > firstSession).toBe(true); // the delay was real
    expect(r.ranOn! > firstSession).toBe(true); // the first session was moved, not spent while waiting
    expect(r.sessions.filter((x) => x.kind === 'calibration' && x.status === 'done')).toHaveLength(1);
    expect(r.sessions.some((x) => x.status === 'missed')).toBe(false); // passing a session while not ready isn't missing it
  }, 120_000);
});

describe('a session the performer cannot attend', () => {
  it('is marked missed with the reason and rebooked later, for the same kind of session', () => {
    for (const n of [1, 5]) {
      const { s, p, golem, zone } = booked(`mcseed-${n}`);
      const rec = p.mocap![golem.id];
      // The first session the work is ready for and waits on: calibration's where it waits (seed 1), else the capture's,
      // which always comes at least a day after calibration (one session a day per character).
      let next: NonNullable<typeof rec.sessions>[number] | undefined;
      for (let d = 0; d < 120 && !next; d++) {
        const day = nextDay(s, zone);
        const ready = [`anim:mocap-calib:${golem.id}`, `anim:mocap:${golem.id}`].map((id) => task(p, id)).find((t) => t.status !== 'done' && /^Next (calibration|capture) session: /.test(t.blockedReason ?? ''));
        if (ready) next = rec.sessions!.filter((x) => x.status === 'booked' && x.kind === (ready.kind === 'anim:mocap-calib' ? 'calibration' : 'capture') && x.date > day).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
      }
      expect(next, `seed ${n}`).toBeDefined();
      const performer = p.cast.find((c) => c.characterId === golem.id && c.method === 'motion-capture')!.performer;
      // Labelled fixture: the capture performer is shooting another production on that session's date.
      const other = JSON.parse(JSON.stringify(p)) as Project;
      Object.assign(other, { id: 'p-fixture-other', title: 'Other Picture', mocap: {}, tasks: [], obligations: [], hires: [], delivered: null, cast: [{ characterId: golem.id, performer, method: 'on-camera', note: '' }] });
      other.schedule.days = [{ ...p.schedule.days[0], id: 'd-other', date: next!.date, sceneIds: [p.scenes[0].id], status: 'scheduled', playerActing: false, conflicts: [] }];
      s.projects.push(other);
      for (let d = 0; d < 30 && nextDay(s, zone) < next!.date; d++) { /* to the session date */ }
      const missed = rec.sessions!.find((x) => x.status === 'missed');
      expect(missed, `seed ${n}`).toBeDefined();
      expect(missed!.date).toBe(next!.date);
      expect(missed!.kind).toBe(next!.kind);
      expect(missed!.note).toMatch(/was shooting Other Picture/);
      expect(rec.sessions!.some((x) => x.kind === missed!.kind && x.date > missed!.date && x.status === 'booked')).toBe(true);
      expect(s.log.some((l) => l.text.startsWith('The capture session for The Golem on ') && /It is rebooked for /.test(l.text))).toBe(true);
    }
  }, 120_000);
});
