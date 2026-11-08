// SLATE-03-03.02 and 08-05.03: ways to cost less, each with the saving the engine's own estimate gives for it.
import { describe, expect, it } from 'vitest';
import { costCuts, deleteScene, projectedCost } from './engine-api';
import { approve, buildProject, startLife } from './helpers';

function script(tag: string, scenario = 'low') {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', scenario, runtime: 14 },
    [{ name: 'Ines', patch: { roleSize: 'lead' } }, { name: 'Tomas' }],
    [
      { place: 'Quay', chars: ['Ines'], minutes: 4, extra: { essential: true } },
      { place: 'Market', intExt: 'EXT', chars: ['Ines', 'Tomas'], minutes: 5, extra: { crowd: 60 } },
      { place: 'Kitchen', chars: ['Tomas'], minutes: 3 },
    ]);
  approve(s, p);
  return { s, p };
}

describe('ways to cost less', () => {
  it('lists cuts with their savings, largest first, never an essential scene', () => {
    const { s, p } = script('cuts');
    const cuts = costCuts(s, p);
    expect(cuts.length).toBeGreaterThan(2);
    expect(cuts.map((c) => c.saving)).toEqual([...cuts.map((c) => c.saving)].sort((a, b) => b - a));
    expect(cuts.every((c) => c.saving >= 1000 && c.saving % 1000 === 0)).toBe(true);
    expect(cuts.some((c) => c.label.startsWith('Cut Quay'))).toBe(false); // essential
    expect(cuts.some((c) => c.label === 'Halve the crowd in Market (60 to 30)')).toBe(true);
    expect(cuts.some((c) => c.label === 'Make it at the micro budget size')).toBe(true);
  });

  it('the saving shown is what the estimate really drops by when the cut is made', () => {
    const { s, p } = script('cuts-real');
    const cut = costCuts(s, p).find((c) => c.label.startsWith('Cut Kitchen'))!;
    expect(cut).toBeDefined();
    const before = projectedCost(s, p).total;
    deleteScene(p, p.scenes.find((x) => x.heading.place === 'Kitchen')!.id);
    approve(s, p);
    const after = projectedCost(s, p).total;
    expect(Math.abs(before - after - cut.saving)).toBeLessThanOrEqual(500); // the shown saving is rounded to the thousand
  });

  it('asking changes nothing, and an unapproved script has no options yet', () => {
    const { s, p } = script('cuts-pure');
    const snapshot = JSON.stringify(p);
    costCuts(s, p);
    expect(JSON.stringify(p)).toBe(snapshot);
    const q = buildProject(s, { title: 'Unapproved', format: 'short', medium: 'live-action', runtime: 5 }, [{ name: 'A' }], [{ place: 'Room', chars: ['A'] }]);
    expect(costCuts(s, q)).toEqual([]);
  });
});
