// Revising the animatic (src/engine/revisions.ts; the owner's v6 package, J05): before animation it costs the animatic's
// own days and little else; after animation, everything built on it starts over, and the preview says how many days that
// is before anything is reset. Work not built on the animatic stays.
import { describe, expect, it } from 'vitest';
import { buildTasks, dependents } from '../src/engine/production/tasks';
import { animaticRevisionImpact, reviseAnimatic } from '../src/engine/revisions';
import { approve, buildProject, staffAll, startLife } from './helpers';

function twoD(seed: string) {
  const s = startLife(seed);
  const p = buildProject(s, { title: 'Paper Moon', format: 'short', medium: 'animation', technique: '2d-drawn', runtime: 4 }, [{ name: 'Lune', patch: { roleSize: 'lead' } }], [{ place: 'Roof', chars: ['Lune'], minutes: 2 }]);
  approve(s, p);
  staffAll(s, p);
  for (const h of p.hires) h.status = 'accepted'; // labelled fixture: every offer answered yes
  p.tasks = buildTasks(p);
  return p;
}
// Labelled fixture: work done as the days pass, without running the clock.
const work = (t: { done: number; workedDays: number; status: string }, days: number) => Object.assign(t, { done: 1, workedDays: days, status: 'done' });

describe('revising the animatic', () => {
  it('costs little before animation, much after, says how much first, and keeps work not built on it', () => {
    const before = twoD('animatic-before');
    const after = twoD('animatic-after');
    for (const p of [before, after]) {
      for (const t of p.tasks.filter((x) => /^anim:(visdev|boards|design)/.test(x.kind))) work(t, 2);
      work(p.tasks.find((x) => x.id === 'anim:animatic:all')!, 3);
    }
    expect(animaticRevisionImpact(twoD('animatic-none'))).toEqual({ reset: [], days: 0, cost: 0 });
    // After: the animation built on the animatic, however far down, is done too.
    const built = dependents(after.tasks, 'anim:animatic:all');
    for (const t of after.tasks.filter((x) => built.has(x.id) && x.id !== 'anim:animatic:all')) work(t, 4);

    const early = animaticRevisionImpact(before);
    const late = animaticRevisionImpact(after);
    expect(early.reset.map((x) => x.id)).toEqual(['anim:animatic:all']);
    expect(early.days).toBe(3);
    expect(late.reset.length).toBeGreaterThan(3);
    expect(late.reset.map((x) => x.kind)).toEqual(expect.arrayContaining(['anim:animation', 'anim:composite']));
    expect(late.days).toBe(3 + 4 * (late.reset.length - 1));
    // What doing it again costs, at the team's rates (from November 14, 2026): more after animation than before.
    expect(early.cost).toBeGreaterThan(0);
    expect(late.cost).toBeGreaterThan(early.cost);

    const kept = after.tasks.filter((x) => !built.has(x.id) && x.done > 0).map((x) => [x.id, x.workedDays]);
    expect(kept.length).toBeGreaterThan(0);
    expect(reviseAnimatic(after).map((x) => x.id)).toEqual(late.reset.map((x) => x.id)); // the preview is what happens
    expect(after.tasks.filter((x) => built.has(x.id)).every((x) => x.done === 0 && x.workedDays === 0)).toBe(true);
    expect(after.tasks.filter((x) => !built.has(x.id) && x.done > 0).map((x) => [x.id, x.workedDays])).toEqual(kept);
    expect(() => reviseAnimatic(twoD('animatic-none'))).toThrow('The animatic hasn\'t been started yet');
  });
});
