// SLATE-12-02.02 and 12-03: setups and takes use the day, and the edit chooses among recorded takes.
import { chooseTake, setShotPlan } from '../src/engine/takes-actions';
import { describe, expect, it } from 'vitest';
import { DAY, assessQuality, processUntil } from './engine-api';
import { COVERAGE, TAKES, coverageEdit, planTime } from '../src/engine/takes';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

function shot(tag: string, plan?: { coverage: 'master' | 'standard' | 'full'; takes: 'one' | 'few' | 'many' }) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Weathered', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }],
    [{ place: 'Kitchen', chars: ['Ada'], minutes: 3 }, { place: 'Kitchen', chars: ['Ada'], minutes: 3 }]);
  approve(s, p);
  if (plan) for (const sc of p.scenes) setShotPlan(p, sc.id, plan);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 8; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 3);
  runDays(s, p, 40, () => undefined);
  return { s, p };
}

describe('setups and takes', () => {
  it('each scene records the takes its plan allows, and the cut uses the best balanced one', () => {
    const { p } = shot('takes-few');
    const c = p.captures.find((x) => x.takes)!;
    expect(c.takes!.length).toBe(TAKES.few.n);
    const best = c.takes!.reduce((b, t, i) => (t.perf + t.tech > c.takes![b].perf + c.takes![b].tech ? i : b), 0);
    expect(c.chosenTake).toBe(best);
    expect(c.quality).toBe(Math.round((c.takes![best].perf + c.takes![best].tech) / 2));
    expect(c.perf).toBe(c.takes![best].perf);
  }, 60000);

  it('more coverage and more takes use more of the day: the same scenes need more shoot days', () => {
    const lean = shot('takes-time', { coverage: 'master', takes: 'one' }).p;
    const rich = shot('takes-time', { coverage: 'full', takes: 'many' }).p;
    expect(planTime(lean, lean.scenes[0])).toBeCloseTo(COVERAGE.master.time * TAKES.one.time, 5);
    expect(planTime(rich, rich.scenes[0])).toBeCloseTo(COVERAGE.full.time * TAKES.many.time, 5);
    const days = (p: typeof lean) => p.schedule.days.filter((d) => d.status === 'shot' || d.status === 'partial').length;
    expect(days(rich)).toBeGreaterThan(days(lean));
    expect(rich.captures.find((x) => x.takes)!.takes!.length).toBe(TAKES.many.n);
    expect(lean.captures.find((x) => x.takes)!.takes!.length).toBe(1);
    // Coverage gives the editor options: a master only is harder to cut.
    expect(coverageEdit(lean, lean.scenes.map((x) => x.id))).toBe(COVERAGE.master.edit);
    expect(coverageEdit(rich, rich.scenes.map((x) => x.id))).toBe(COVERAGE.full.edit);
  }, 120000);

  it('choosing another take moves the performance and the direction; it is refused once picture is locked', () => {
    const { s, p } = shot('takes-choose', { coverage: 'standard', takes: 'many' });
    p.edit.pictureLocked = false; // labelled fixture: back in the edit
    const c = p.captures.find((x) => x.takes && x.takes.length > 1)!;
    const other = c.takes!.findIndex((t, i) => i !== c.chosenTake && t.perf !== c.takes![c.chosenTake!].perf);
    const before = assessQuality(s, p);
    chooseTake(p, c.sceneId, other);
    expect(c.perf).toBe(c.takes![other].perf);
    const after = assessQuality(s, p);
    const key = Object.keys(after).find((k) => k.startsWith('performance:'))!;
    expect(after[key]).not.toBe(before[key]);
    p.edit.pictureLocked = true;
    expect(() => chooseTake(p, c.sceneId, 0)).toThrow('Picture is locked.');
  }, 60000);

  it('a project from before shot plans captures each scene as one result', () => {
    const s = startLife('takes-old', 'gb-london');
    const p = buildProject(s, { title: 'Old', format: 'short', medium: 'live-action', runtime: 4 }, [{ name: 'Ada' }], [{ place: 'Kitchen', chars: ['Ada'], minutes: 2 }]);
    delete p.takesModel; // labelled fixture: started before November 8, 2026
    expect(planTime(p, p.scenes[0])).toBe(1);
    expect(() => setShotPlan(p, p.scenes[0].id, { takes: 'many' })).toThrow('This project captures each scene as one result.');
  });
});
