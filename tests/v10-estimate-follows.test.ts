// The budget estimate follows the shooting plan (estimate.ts followPlan, from November 14, 2026): found by the feature
// proofs, where a full-coverage plan raised what the old plan cost and the production stalled for want of its crew.
import { describe, expect, it } from 'vitest';
import { approve, startLife } from './helpers';
import { defaultProject } from './proof/career';
import { setShotPlan } from '../src/engine/takes-actions';
import { setFinanceTarget } from '../src/engine/finance';
import { approvedScenes } from '../src/engine/projects';

// The proof careers' short (tests/proof/career.ts), whose cost is above its scenario's floor.
const short = (tag: string) => {
  const s = startLife(tag);
  const p = defaultProject(s, 0);
  approve(s, p);
  return { s, p };
};

describe('the estimate follows the shot plan', () => {
  it('full coverage and many takes raise the estimate and the target that follows it', () => {
    const { s, p } = short('follow-plan');
    expect(p.takesModel).toBeTruthy();
    const before = p.finance!.estimate;
    for (const sc of approvedScenes(p)) setShotPlan(p, sc.id, { coverage: 'full', takes: 'many' }, s);
    expect(p.finance!.estimate).toBeGreaterThan(before);
    expect(p.finance!.target).toBe(p.finance!.estimate);
  });

  it('a target the player set stays theirs; the estimate still follows', () => {
    const { s, p } = short('follow-plan-own');
    setFinanceTarget(p, p.finance!.estimate + 5_000);
    const target = p.finance!.target;
    const before = p.finance!.estimate;
    for (const sc of approvedScenes(p)) setShotPlan(p, sc.id, { coverage: 'full', takes: 'many' }, s);
    expect(p.finance!.estimate).toBeGreaterThan(before);
    expect(p.finance!.target).toBe(target);
  });
});
