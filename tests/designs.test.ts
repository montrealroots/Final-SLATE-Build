// SLATE-11-03.02: a design is approved before it is built; asking for changes costs a day of visual development first.
import { describe, expect, it } from 'vitest';
import { DAY, depsMet, processUntil } from './engine-api';
import { approveDesign, askForDesignChanges, designStatus, designsToReview } from '../src/engine/designs';
import { approve, buildProject, castAll, staffAll, startLife, startProduction } from './helpers';

function threeD(tag: string) {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Gearheart', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 2, quality: 'limited' },
    [{ name: 'Tilly', patch: { roleSize: 'lead' } }, { name: 'Cog', patch: { roleSize: 'supporting' } }],
    [{ place: 'Workshop', chars: ['Tilly', 'Cog'], minutes: 1 }]);
  approve(s, p);
  for (let i = 0; i < 6; i++) { castAll(s, p); staffAll(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 2);
  const visdev = p.tasks.find((t) => t.kind === 'anim:visdev')!;
  for (let i = 0; i < 120 && visdev.status !== 'done'; i++) { staffAll(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  return { s, p, visdev };
}
const id = (p: ReturnType<typeof threeD>['p'], n: string) => p.characters.find((c) => c.name === n)!.id;

describe('design approval', () => {
  it('builds wait for an approved design; asking for changes reopens the visual development, which every build waits for', () => {
    const { s, p, visdev } = threeD('designs');
    expect(visdev.status).toBe('done');
    const tilly = id(p, 'Tilly');
    const cog = id(p, 'Cog');
    expect(designsToReview(p)).toEqual([tilly, cog]);
    const model = p.tasks.find((t) => t.kind === 'anim:model' && t.assetRef === tilly)!;
    expect(depsMet(p, model)).toEqual({ ok: false, reason: "Waiting for you to approve Tilly's design." });
    approveDesign(p, tilly);
    expect(depsMet(p, model).ok).toBe(true);
    expect(() => approveDesign(p, tilly)).toThrow('That design is approved already.');
    // Changes to Cog: another day of the visual development artist's paid work, and Tilly's builds wait for it too.
    const units = visdev.units;
    askForDesignChanges(p, cog);
    expect(visdev.units).toBe(units + 1);
    expect(designStatus(p, cog)).toBe('changes');
    expect(depsMet(p, model)).toEqual({ ok: false, reason: 'Waiting for Visual Development And Designs.' });
    for (let i = 0; i < 60 && visdev.status !== 'done'; i++) { staffAll(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    expect(designStatus(p, cog)).toBe('awaiting');
    expect(designStatus(p, tilly)).toBe('approved');
    // A design changed later on the Characters page needs approving again.
    p.characters.find((c) => c.id === tilly)!.designVersion += 1;
    expect(designStatus(p, tilly)).toBe('awaiting');
  }, 60000);

  it('a project from before design approval existed builds without it', () => {
    const { p } = threeD('designs-old');
    delete p.designReview; // labelled fixture: started before November 8, 2026
    expect(designsToReview(p)).toEqual([]);
    const model = p.tasks.find((t) => t.kind === 'anim:model')!;
    expect(depsMet(p, model).ok).toBe(true);
  }, 60000);
});
