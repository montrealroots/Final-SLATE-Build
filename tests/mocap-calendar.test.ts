import { describe, expect, it } from 'vitest';
import {
  DAY, FACIAL_RIG_PER_SESSION, MOCAP_SESSION_STAGE, bookMocap, computeCredits, deliver, ledgerTotals, makeOffer, personById, processUntil, releaseHire, roleCandidates,
  sessionConflict, upcomingCommitments,
} from '../src/engine';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction } from './helpers';

function captured(tag: string, extraChars: { name: string; patch: Record<string, unknown> }[] = []) {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Golem', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
    [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }, { name: 'Child', patch: { roleSize: 'supporting' } }, ...extraChars],
    [{ place: 'Quarry', chars: ['Golem', 'Child', ...extraChars.map((c) => c.name)], minutes: 1 }, { place: 'Cave', chars: ['Golem'], minutes: 1 }]);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 10; i++) {
    processUntil(s, s.now + DAY, 'tick', 100000);
    castAll(s, p);
    staffAll(s, p);
  }
  startProduction(s, p, 3);
  const golem = p.characters.find((c) => c.name === 'Golem')!;
  return { s, p, golem };
}
const sessions = (p: Project, id: string) => p.mocap![id].sessions!;

describe('capture sessions are dated, on the calendar, and avoid clashes', () => {
  it('booking dates every session on working days, one a day, and lists them on the shared calendar', () => {
    const { s, p, golem } = captured('mc-dated');
    bookMocap(s, p, golem.id, ['body']);
    const ss = sessions(p, golem.id);
    expect(ss.map((x) => x.kind)).toEqual(['calibration', 'capture', 'capture']);
    expect(new Set(ss.map((x) => x.date)).size).toBe(3);
    const cal = upcomingCommitments(s, s.now, s.now + 120 * DAY).filter((c) => c.label.startsWith('Capture'));
    expect(cal.map((c) => c.label)).toEqual([
      expect.stringMatching(/^Capture Calibration: Golem \(.+\), Golem$/), expect.stringMatching(/^Capture Session: Golem/), expect.stringMatching(/^Capture Session: Golem/),
    ]);
    // Sessions run on their dates and are marked done.
    runDays(s, p, 120);
    expect(sessions(p, golem.id).filter((x) => x.status === 'done').length).toBeGreaterThanOrEqual(3);
    expect(p.mocap![golem.id].takes.every((t) => t.performer === p.cast.find((c) => c.characterId === golem.id && c.method === 'motion-capture')!.performer)).toBe(true);
  }, 120_000);

  it('a date the performer is shooting, or the stage is taken for another character, is passed over with the reason', () => {
    const { s, p, golem } = captured('mc-clash', [{ name: 'Wraith', patch: { roleSize: 'supporting', entity: 'supernatural', methods: ['motion-capture'] } }]);
    const wraith = p.characters.find((c) => c.name === 'Wraith')!;
    bookMocap(s, p, golem.id, ['body']);
    const first = sessions(p, golem.id)[0].date;
    expect(sessionConflict(s, p, wraith.id, first)).toBe('the stage is booked for Golem');
    const passed = bookMocap(s, p, wraith.id, ['body']);
    expect(sessions(p, wraith.id).some((x) => sessions(p, golem.id).some((y) => y.date === x.date))).toBe(false);
    expect(passed.some((x) => x.reason === 'the stage is booked for Golem')).toBe(true);
  }, 120_000);
});

describe('body and facial capture are told apart', () => {
  it('facial capture costs a rig per session, adds a facial solve before animation, and is credited as such', () => {
    const body = captured('mc-body');
    bookMocap(body.s, body.p, body.golem.id, ['body']);
    const face = captured('mc-face');
    const before = ledgerTotals(face.p).available;
    bookMocap(face.s, face.p, face.golem.id, ['face']);
    expect(before - ledgerTotals(face.p).available).toBe(3 * (MOCAP_SESSION_STAGE + FACIAL_RIG_PER_SESSION));
    const solve = face.p.tasks.find((t) => t.id === `anim:mocap-face:${face.golem.id}`)!;
    expect(solve.dependsOn).toEqual([`anim:mocap-cleanup:${face.golem.id}`]);
    expect(face.p.tasks.filter((t) => t.kind === 'anim:animation' && t.sceneIds.some((id) => face.p.scenes.find((sc) => sc.id === id)?.participants.includes(face.golem.id))).every((t) => t.dependsOn.includes(solve.id))).toBe(true);
    expect(body.p.tasks.some((t) => t.kind === 'anim:mocap-face')).toBe(false);
    const credit = (x: { s: GameState; p: Project }) => computeCredits(x.s, x.p).find((c) => c.characterName === 'Golem' && c.contribution !== 'Voice Cast')?.contribution;
    expect(credit(body)).toBe('Motion Capture');
    expect(credit(face)).toBe('Facial Capture');
  }, 120_000);
});

describe('a performer replaced after contributing', () => {
  it('keeps what they were paid, is paid nothing after release, and is still credited for the work that stays in the film', () => {
    const s = startLife('mc-replace');
    const p = buildProject(s, { title: 'Two Doors', format: 'short', medium: 'live-action', runtime: 6 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }, { name: 'Tom' }],
      [{ place: 'Hall', chars: ['Ines', 'Tom'], minutes: 3 }, { place: 'Stairs', chars: ['Ines'], minutes: 3 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 10; i++) { processUntil(s, s.now + DAY, 'tick', 100000); castAll(s, p); staffAll(s, p); }
    startProduction(s, p, 3);
    const ines = p.characters.find((c) => c.name === 'Ines')!;
    const first = p.hires.find((h) => h.kind === 'cast' && h.characterId === ines.id && h.status === 'accepted')!;
    // Shoot until something with Ines is captured, then replace her.
    for (let i = 0; i < 60 && !p.captures.some((c) => c.performers?.includes(first.personId)); i++) runDays(s, p, 1);
    expect(p.captures.some((c) => c.performers?.includes(first.personId))).toBe(true);
    expect(first.daysWorked).toBeGreaterThan(0);
    const paidBefore = p.obligations.find((o) => o.id === first.obligationId)!.settled;
    expect(paidBefore).toBe(first.daysWorked * first.dayRate);
    releaseHire(s, p, first.id);
    const busy = new Set(p.cast.map((c) => c.performer));
    const next = roleCandidates(s, p, 'actor').find((c) => c.id !== first.personId && !busy.has(c.id))!;
    makeOffer(s, p, { personId: next.id, roleId: 'actor', dayRate: next.dayRate, characterId: ines.id, method: 'on-camera' });
    for (let i = 0; i < 10; i++) { processUntil(s, s.now + DAY, 'tick', 100000); castAll(s, p); }
    runDays(s, p, 150);
    expect(p.obligations.find((o) => o.id === first.obligationId)!.settled).toBe(paidBefore); // nothing after release
    if (!p.delivered) deliver(s, p);
    const credits = computeCredits(s, p).filter((c) => c.characterName === 'Ines').map((c) => c.personName);
    expect(credits).toContain(personById(s, first.personId).name);
  }, 180_000);
});
