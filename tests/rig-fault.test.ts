// A rig fault and a constrained render farm in 3D animation, and the finish date they move (src/engine/production/
// workday.ts rigFault, forecast.ts; the owner's v6 package, J06; from November 14, 2026). Each comparison changes one
// input and reads the date the production gives.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { forecastFinish, workDaysLeft } from '../src/engine/production/forecast';
import { rigFault } from '../src/engine/production/workday';
import { dateKey } from '../src/engine/time';
import { getPlace } from '../src/data/places';
import { approve, buildProject, castAll, manage, staffAll, startLife, startProduction } from './helpers';
import type { GameState, Project } from '../src/engine/types';

function orbit(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Orbit Garden', format: 'short', medium: 'animation', technique: '3d-cg', genres: ['romantic-drama'], runtime: 5, quality: 'limited' },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Unit 7', patch: { roleSize: 'co-lead', entity: 'robot' } }],
    [{ place: 'Greenhouse', chars: ['Ada', 'Unit 7'], minutes: 1 }, { place: 'Airlock', chars: ['Unit 7'], minutes: 1 }]);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 12; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 2);
  return { s, p };
}
const today = (s: GameState, p: Project) => dateKey(s.now, getPlace(p.axes.basePlaceId).zone);
const rigOf = (p: Project, name: string) => p.characters.find((c) => c.name === name)!.id;

describe('a 3D production\'s finish', () => {
  it('is the longest chain of what is left, and moves with the render farm', () => {
    const { s, p } = orbit('forecast-nodes');
    const at = (nodes: number) => { p.schedule.renderNodes = nodes; return forecastFinish(p, today(s, p))!; };
    const one = at(1);
    const twenty = at(20);
    expect(one.workingDays).toBeGreaterThan(twenty.workingDays); // one node renders slower than twenty
    expect(one.finish > twenty.finish).toBe(true);
    // It runs through the picture lock to work nothing else waits for, not to the assembly edit.
    const last = p.tasks.find((t) => t.label === twenty.chain.at(-1))!;
    expect(p.tasks.some((t) => t.status !== 'done' && t.dependsOn.includes(last.id))).toBe(false);
    expect(twenty.chain).toEqual(expect.arrayContaining(['Assembly Edit']));
    expect(twenty.chain.indexOf('Assembly Edit')).toBeLessThan(twenty.chain.length - 1);
    const render = p.tasks.find((t) => t.kind === 'anim:render')!;
    p.schedule.renderNodes = 1;
    const slow = workDaysLeft(p, render);
    p.schedule.renderNodes = 20;
    expect(workDaysLeft(p, render)).toBeLessThan(slow);
  });

  it('a rig fault holds that character\'s unfinished shots for a fix, moves the finish, says so, and is undone by fixing it', () => {
    const { s, p } = orbit('forecast-rig');
    // Labelled fixture: everything before animation finished (designs, boards, voices, models, rigs, layouts), so the
    // rigs are what animation waits on and a fault found in one is on the chain.
    for (const t of p.tasks.filter((x) => /^anim:(visdev|boards|animatic|voice|model|envs|rig|layout)$/.test(x.kind))) Object.assign(t, { done: t.units, status: 'done', workedDays: Math.ceil(t.units) });
    const before = forecastFinish(p, today(s, p))!;
    const unit7 = rigOf(p, 'Unit 7');
    const fix = rigFault(s, p, unit7, today(s, p));
    const after = forecastFinish(p, today(s, p))!;
    expect(after.workingDays).toBe(before.workingDays + 2); // the fix is two days' rigging, and every shot with Unit 7 waits
    expect(after.chain).toContain('Fix Rig: Unit 7');
    // Every unfinished shot with Unit 7 waits for the fix; Ada's own shots, if any, don't.
    const shots = p.tasks.filter((t) => t.kind === 'anim:animation');
    expect(shots.filter((t) => t.dependsOn.includes(fix.id)).length).toBe(2); // Unit 7 is in both scenes
    expect(s.log[0].text).toMatch(/^Unit 7's rig showed a fault in animation\. A rigger fixes it; shots with Unit 7 wait until then\. The work now finishes around [A-Z][a-z]+ \d+, \d{4}, not [A-Z][a-z]+ \d+, \d{4}\.$/);
    // The same fault found twice the same day is one fix.
    expect(rigFault(s, p, unit7, today(s, p))).toBe(fix);
    expect(p.tasks.filter((t) => t.kind === 'anim:rig-fix')).toHaveLength(1);
    // Fixed: the forecast is back to what the rest of the work needs.
    Object.assign(fix, { done: fix.units, status: 'done' });
    expect(forecastFinish(p, today(s, p))!.workingDays).toBe(before.workingDays);
  });

  it('a production with a fault still delivers, once the fix is done', () => {
    const { s, p } = orbit('forecast-deliver');
    for (const t of p.tasks.filter((x) => x.kind === 'anim:rig')) Object.assign(t, { done: t.units, status: 'done', workedDays: t.units });
    rigFault(s, p, rigOf(p, 'Ada'), today(s, p));
    for (let i = 0; i < 300 && !p.delivered; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    expect(p.delivered).not.toBeNull();
    expect(p.tasks.find((t) => t.kind === 'anim:rig-fix')!.status).toBe('done');
  }, 60_000);
});
