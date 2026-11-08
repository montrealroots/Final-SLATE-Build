// Stage 12 of the gameplay-depth package: tests for production children built before the package that had none
// (docs/depth/COVERAGE-LEDGER.csv rows marked IMPLEMENTED UNVERIFIED).
import { describe, expect, it } from 'vitest';
import { DAY, addDaysToKey, bookMocap, castPlayer, ledgerTotals, mocapRecord, precipitationDuring, processUntil, weatherOn } from '../src/engine';
import { rebookMissed } from '../src/engine/mocap';
import { getPlace } from '../src/data/places';
import { maybePuppetDamage } from '../src/engine/production/workday';
import { buildTasks } from '../src/engine/production/tasks';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

function puppets(tag: string): { s: GameState; p: Project; ada: string } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Clay Harbour', format: 'short', medium: 'animation', technique: 'stop-motion', runtime: 4 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Harbour', chars: ['Ada'], minutes: 2 }]);
  approve(s, p);
  p.tasks = buildTasks(p); // as production start builds them
  const anim = p.tasks.find((t) => t.kind === 'sm:animation')!;
  anim.status = 'active'; // labelled fixture: the stage is shooting
  return { s, p, ada: p.characters.find((c) => c.name === 'Ada')!.id };
}
/** The first stage day, from a fixed start, on which this world seed damages a puppet. */
function firstDamage(s: GameState, p: Project): string {
  for (let i = 0; i < 400; i++) {
    const day = addDaysToKey('2026-06-01', i);
    const before = p.tasks.length;
    maybePuppetDamage(s, p, day);
    if (p.tasks.length > before) return day;
  }
  throw new Error('No damage in 400 stage days.');
}

describe('puppet damage and repair (SLATE-11-03, 13-03)', () => {
  it('a damaged puppet is repaired by its maker, and the shots with it wait for the repair', () => {
    const { s, p, ada } = puppets('gaps-puppet');
    const day = firstDamage(s, p);
    const repair = p.tasks.find((t) => t.id === `sm:repair:${ada}:${day}`)!;
    expect(repair).toMatchObject({ kind: 'sm:repair', roleId: 'puppet-fabricator', units: 1, assetRef: ada });
    const anim = p.tasks.filter((t) => t.kind === 'sm:animation');
    for (const t of anim) expect(t.dependsOn).toContain(repair.id);
    expect(s.log[0].text).toBe("Ada's puppet was damaged on set. Shots with Ada wait for a repair unless a duplicate is available.");
    maybePuppetDamage(s, p, day); // the same day never breaks the same puppet twice
    expect(p.tasks.filter((t) => t.kind === 'sm:repair').length).toBe(1);
  });

  it('with a duplicate puppet the shots carry on while the repair is made', () => {
    const { s, p, ada } = puppets('gaps-puppet');
    p.schedule.puppetCopies[ada] = 2;
    const day = firstDamage(s, p);
    expect(p.tasks.some((t) => t.id === `sm:repair:${ada}:${day}`)).toBe(true);
    for (const t of p.tasks.filter((x) => x.kind === 'sm:animation')) expect(t.dependsOn.some((d) => d.startsWith('sm:repair:'))).toBe(false);
  });

  it('nothing is damaged when no stage is shooting', () => {
    const { s, p } = puppets('gaps-puppet-idle');
    for (const t of p.tasks) if (t.kind === 'sm:animation') t.status = 'waiting';
    const n = p.tasks.length;
    for (let i = 0; i < 200; i++) maybePuppetDamage(s, p, addDaysToKey('2026-06-01', i));
    expect(p.tasks.length).toBe(n);
  });
});

describe('weather on a shoot day (SLATE-12-04)', () => {
  function rainyShoot(tag: string, anyway: boolean) {
    const s = startLife(tag, 'gb-london', { startDate: '2026-10-05', startTime: '09:00' });
    const p = buildProject(s, { title: 'Wet Streets', format: 'short', medium: 'live-action', scenario: 'micro', runtime: 12 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }],
      Array.from({ length: 4 }, (_, i) => ({ place: `Street ${i + 1}`, intExt: 'EXT' as const, time: 'DAY' as const, chars: ['Ada'], minutes: 2 })));
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 8; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 3);
    if (anyway) for (const d of p.schedule.days) d.weatherAnyway = true;
    runDays(s, p, 40, () => { if (anyway) for (const d of p.schedule.days) d.weatherAnyway = true; });
    return { s, p };
  }
  const rainedOn = (s: GameState, p: Project, date: string) => precipitationDuring(weatherOn(s.seed, getPlace(p.axes.basePlaceId), date), 7, 19);

  it('rain stops an exterior day, the log says so, and the scenes move to a new day', () => {
    const { s, p } = rainyShoot('gaps-rain', false);
    const ran = p.schedule.days.filter((d) => d.status !== 'scheduled');
    const wet = ran.filter((d) => rainedOn(s, p, d.date));
    expect(wet.length).toBeGreaterThan(0); // an October in London has rain on some shoot day
    for (const d of wet) {
      expect(d.status).toBe('lost');
      expect(d.result).toMatch(/^(Rain|Snow) stopped /);
      expect(s.log.some((l) => l.text.startsWith(`Wet Streets, `) && l.text.includes(d.result!) && l.text.endsWith('The remaining work moved to a new day.'))).toBe(true);
      expect(p.schedule.days.some((x) => x.date > d.date && x.sceneIds.some((id) => d.sceneIds.includes(id)))).toBe(true);
    }
    for (const d of ran.filter((x) => !rainedOn(s, p, x.date) && x.status === 'shot')) expect(d.result).not.toMatch(/stopped/);
  }, 60000);

  it('shooting in the rain anyway records the scene, compromised', () => {
    const { s, p } = rainyShoot('gaps-rain', true);
    const wet = p.schedule.days.filter((d) => d.status !== 'scheduled' && rainedOn(s, p, d.date) && d.status !== 'lost');
    expect(wet.length).toBeGreaterThan(0);
    const compromised = p.captures.filter((c) => c.weatherCompromised);
    expect(compromised.length).toBeGreaterThan(0);
    for (const c of compromised) expect(wet.some((d) => d.sceneIds.includes(c.sceneId))).toBe(true);
  }, 60000);
});

describe('a missed capture session (SLATE-13-04)', () => {
  it('is marked missed with the reason and rebooked on the next free date, of the same kind, at no extra stage charge', () => {
    const s = startLife('gaps-mocap');
    const p = buildProject(s, { title: 'Golem', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
      [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }], [{ place: 'Quarry', chars: ['Golem'], minutes: 1 }]);
    approve(s, p);
    for (let i = 0; i < 10; i++) { castAll(s, p); staffAll(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 3);
    const golem = p.characters.find((c) => c.name === 'Golem')!.id;
    bookMocap(s, p, golem, ['body']);
    const available = ledgerTotals(p).available;
    const first = mocapRecord(p, golem).sessions!.find((x) => x.status === 'booked')!;
    const next = rebookMissed(s, p, golem, first, 'Ines was shooting Night Ferry');
    expect([first.status, first.note]).toEqual(['missed', 'Ines was shooting Night Ferry']);
    expect(next.status).toBe('booked');
    expect(next.kind).toBe(first.kind);
    expect(next.date > first.date).toBe(true);
    expect(mocapRecord(p, golem).sessions!.filter((x) => x.date === next.date && x.status === 'booked').length).toBe(1);
    expect(s.log[0].text).toMatch(/^The capture session for Golem on .+ couldn't run \(Ines was shooting Night Ferry\)\. It is rebooked for .+\.$/);
    expect(ledgerTotals(p).available).toBe(available);
  }, 60000);
});

describe('one method never fulfils another (SLATE-05-03)', () => {
  it('a voice performer is not a capture performer: the stage refuses, and the animation waits for both pieces of work', () => {
    const s = startLife('gaps-methods');
    const p = buildProject(s, { title: 'Golem', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3, quality: 'limited' },
      [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }], [{ place: 'Quarry', chars: ['Golem'], minutes: 1 }]);
    approve(s, p);
    const golem = p.characters.find((c) => c.name === 'Golem')!.id;
    castPlayer(s, p, golem, 'voice');
    p.tasks = buildTasks(p); // as production start builds them
    expect(() => bookMocap(s, p, golem, ['body'])).toThrow('Cast a capture performer for this character first.');
    const voice = p.tasks.find((t) => t.id === `anim:voice:${golem}`)!;
    const anim = p.tasks.find((t) => t.kind === 'anim:animation')!;
    expect(anim.dependsOn).toContain(voice.id);
    expect(anim.dependsOn.some((d) => d.startsWith('anim:mocap'))).toBe(true);
    castPlayer(s, p, golem, 'motion-capture');
    expect(p.cast.filter((c) => c.characterId === golem).map((c) => c.method).sort()).toEqual(['motion-capture', 'voice']);
  });
});
