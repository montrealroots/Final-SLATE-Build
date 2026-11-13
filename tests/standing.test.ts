// Standing and grade by role (src/engine/reputation.ts; the owner's v7 package, reputation-design.json and reference
// test_reputation_idempotent_role_scoped_bounded; the v6 package's J22): bounded, role-scoped, counted once, and a grade
// needs several completed works.
import { describe, expect, it } from 'vitest';
import { REPUTATION_MODEL, contribution, standingFrom, standings } from '../src/engine/reputation';
import { serialize, deserialize } from '../src/engine/save';
import { buildProject, startLife } from './helpers';

describe('standing by role', () => {
  it('bounds each work, leans to the midpoint, and needs several works for a grade', () => {
    expect([contribution(100), contribution(50), contribution(0), contribution(1000)]).toEqual([1, 0, -1, 1]); // an extreme result counts no more than a fine one
    expect(standingFrom('writing', [])).toMatchObject({ grade: 'Emerging', standing: 50, works: 0 });
    // One brilliant work: a standing a single result can't push far, and no grade without more works.
    const one = standingFrom('directing', [100]);
    expect(one.standing).toBe(60);
    expect(one).toMatchObject({ grade: 'Emerging', next: 'Established needs 2 completed works in this role; you have 1.' });
    expect(standingFrom('directing', [100, 100])).toMatchObject({ standing: 67, grade: 'Established' });
    expect(standingFrom('directing', [100, 100, 100, 100]).grade).toBe('In Demand');
    expect(standingFrom('directing', Array(8).fill(100))).toMatchObject({ standing: 83, grade: 'In Demand' }); // eight perfect works: still short of 85
    expect(standingFrom('directing', Array(10).fill(100)).grade).toBe('Leading');
    expect(standingFrom('directing', Array(8).fill(65)).grade).toBe('Established'); // enough works, not enough standing for more
    expect(REPUTATION_MODEL.model_version).toBe('v7-reference-1');
  });

  it('stands each role on its own work, counts a work once, and is the same after a reload', () => {
    const s = startLife('standing');
    const p = buildProject(s, { title: 'Alder', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 3 }]);
    // Labelled fixture: delivered, written and directed by the player, not acted in.
    p.delivered = { at: s.now, runtimeMin: 8 };
    p.quality = { script: 90, direction: 90, reception: 70 } as never;
    for (const e of p.episodes) { e.writer = 'player'; e.director = 'player'; }
    const by = (r: string) => standings(s).find((x) => x.role === r)!;
    expect([by('writing').works, by('directing').works, by('acting').works]).toEqual([1, 1, 0]);
    expect(by('acting')).toMatchObject({ standing: 50, grade: 'Emerging' }); // directing well raises no acting standing
    expect(by('writing').standing).toBeGreaterThan(50);
    expect(standings(deserialize(serialize(s)))).toEqual(standings(s)); // a reload counts nothing twice
  });

  it('the v6 package\'s J22 exploits give nothing twice and nothing beyond the role (November 13, 2026)', () => {
    const s = startLife('standing-j22');
    const p = buildProject(s, { title: 'Wick', format: 'limited-series', medium: 'live-action', episodes: 3, runtime: 10 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [1, 2, 3].map((episode) => ({ place: 'Pier', chars: ['Ada'], minutes: 2, extra: { episode } })));
    // Labelled fixture: a tiny series that did impossibly well, written by the player on every episode and directed by
    // someone else.
    p.delivered = { at: s.now, runtimeMin: 30 };
    p.quality = { script: 100, direction: 40, reception: 100 } as never;
    for (const e of p.episodes) { e.writer = 'player'; e.director = 'person:fixture-director'; }
    const by = (r: string) => standings(s).find((x) => x.role === r)!;
    const once = by('writing');
    expect(once).toMatchObject({ works: 1, standing: 60 }); // three episodes are one work, and an extreme result counts as a fine one
    // The same credit written again, and the same award recorded twice: neither is a work, so neither moves a standing.
    p.credits.push(...p.credits.filter((c) => c.person === 'player'));
    (s as unknown as { awardResults?: unknown[] }).awardResults = [{ project: p.id, won: true }, { project: p.id, won: true }];
    expect(by('writing')).toEqual(once);
    expect(by('directing')).toMatchObject({ works: 0, standing: 50 }); // the writing's success is no directing standing
    expect(standings(deserialize(serialize(s)))).toEqual(standings(s)); // read again before any negotiation: the same
  });
});
