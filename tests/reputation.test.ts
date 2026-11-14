// Reputation by role (engine/reputation.ts; the v4 package, 04; ledger V4-031.01): read from the record, never stored,
// and followed by offers of outside work. Each comparison changes one input and reads what the offers do with it.
import { describe, expect, it } from 'vitest';
import { STANDING_RATE_BOUNDS, hasLeverage, reputation, roleCraft, standingFrom, standingRate, standingWeight } from '../src/engine/reputation';
import { JOB_ROLES, jobDayRate } from '../src/engine/jobs';
import { processUntil, schedule } from '../src/engine/state';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

/** Labelled fixture: a delivered film the player wrote and directed, with the assessment set as given. */
function delivered(s: GameState, title: string, q: { script: number; direction: number; reception: number }): Project {
  const p = buildProject(s, { title, format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'] }]);
  approve(s, p);
  p.delivered = { at: s.now, runtimeMin: 10 };
  p.phase = 'delivered';
  p.quality = { script: q.script, direction: q.direction, craft: 60, editing: 60, overall: 60, reception: q.reception };
  return p;
}

describe('reputation by role', () => {
  it('is read from the work done in each role, with what it is read from; nothing about it is stored', () => {
    const s = startLife('rep-read');
    expect(roleCraft(s, 'directing')).toEqual({ craft: null, works: [] });
    delivered(s, 'Low Tide', { script: 80, direction: 50, reception: 70 });
    const r = reputation(s);
    expect([r.roles.writing.craft, r.roles.directing.craft, r.roles.acting.craft]).toEqual([80, 50, null]);
    expect(r.roles.writing.works).toEqual([{ title: 'Low Tide', score: 80 }]);
    expect(r.audience).toBe(70);
    expect(r.budget).toEqual({ delivered: 1, onBudget: 1, shelved: 0 });
    expect(Object.keys(s)).not.toContain('reputation');
    // Someone else directs the next one: it adds to writing, not to directing.
    const q = delivered(s, 'High Water', { script: 60, direction: 90, reception: 60 });
    q.episodes[0].director = 'np_director_GB_1';
    expect([roleCraft(s, 'writing').craft, roleCraft(s, 'directing').craft]).toEqual([70, 50]);
  });

  it('a role\'s craft moves its day rate within bounds, and no other role\'s', () => {
    const s = startLife('rep-rate');
    const p = delivered(s, 'Low Tide', { script: 60, direction: 60, reception: 60 });
    const acting = jobDayRate(s, 'acting', false);
    const solid = jobDayRate(s, 'directing', false);
    p.quality!.direction = 85;
    expect(jobDayRate(s, 'directing', false)).toBeGreaterThan(solid);
    expect(jobDayRate(s, 'acting', false)).toBe(acting);
    p.quality!.direction = 20;
    expect(jobDayRate(s, 'directing', false)).toBeLessThan(solid);
    // Read from the role's standing (from November 14, 2026): bounded, and nothing with no completed work.
    expect(standingRate(standingFrom('directing', Array(10).fill(0)))).toBe(STANDING_RATE_BOUNDS[0]);
    expect(standingRate(standingFrom('directing', Array(10).fill(100)))).toBe(STANDING_RATE_BOUNDS[1]);
    expect(standingRate(standingFrom('directing', []))).toBe(1);
    // One brilliant work moves the rate less than several: the standing leans to the midpoint until there are more.
    expect(standingRate(standingFrom('directing', [100]))).toBeLessThan(standingRate(standingFrom('directing', [100, 100, 100, 100])));
    // Leverage, which agrees a request for more, needs a grade above Emerging: two completed works at least.
    expect([hasLeverage(standingFrom('directing', [100])), hasLeverage(standingFrom('directing', [100, 100]))]).toEqual([false, true]);
    expect(JOB_ROLES.directing.base).toBeGreaterThan(0);
  });

  it('offers lean to the role the work is strongest in', () => {
    const count = (direction: number) => {
      const s = startLife('rep-lean');
      delivered(s, 'Low Tide', { script: 40, direction, reception: 60 });
      for (let i = 0; i < 60; i++) {
        schedule(s, s.now + 1000, 'job-offer', { after: 'fixture' }, { attention: 'silent', priority: 70, id: `job-offer:fixture:${i}` });
        processUntil(s, s.now + 2000, 'tick', 1000);
      }
      return (s.jobs ?? []).filter((j) => j.role === 'directing').length / Math.max(1, (s.jobs ?? []).length);
    };
    expect(standingWeight(standingFrom('directing', [90]))).toBeGreaterThan(standingWeight(standingFrom('directing', [40])));
    expect(count(95)).toBeGreaterThan(count(30));
  });
});
