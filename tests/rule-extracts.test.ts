// Partial eligibility (src/engine/rule-extracts.ts; the v7 package, decision 10 and reference
// test_partial_eligibility_never_claims_full_approval): a known violation fails, a missing fact stays unknown, and no
// extract ever approves an entry.
import { describe, expect, it } from 'vitest';
import { RULE_EXTRACTS, checkExtract, extractsFor } from '../src/engine/rule-extracts';

const get = (id: string) => RULE_EXTRACTS.find((x) => x.id === id)!;
const facts = (o: Partial<{ runtimeMinutes: number | null; animationShare: number | null; firstRelease: string | null }>) => ({ runtimeMinutes: null, animationShare: null, firstRelease: null, ...o });

describe('partial eligibility rules', () => {
  it('fail a stated rule, and leave everything else unknown, never eligible', () => {
    expect(checkExtract(get('oscar98-general'), facts({ runtimeMinutes: 40, firstRelease: '2025-06-01' })).verdict).toBe('ineligible'); // 40 is not more than 40
    expect(checkExtract(get('oscar98-general'), facts({ runtimeMinutes: 41, firstRelease: '2025-06-01' })).verdict).toBe('unknown');
    expect(checkExtract(get('oscar98-general'), facts({ runtimeMinutes: 95, firstRelease: '2026-02-01' })).reasons).toEqual(['It was first released 2026-02-01, outside 2025-01-01 to 2025-12-31.']);
    expect(checkExtract(get('oscar98-animation'), facts({ runtimeMinutes: 90, animationShare: 0.6 })).reasons).toEqual(['60% of it is animated; this needs 75%, credits left out.']);
    expect(checkExtract(get('cannes2026-short'), facts({ runtimeMinutes: 16 })).verdict).toBe('ineligible');
    expect(checkExtract(get('cannes2026-short'), facts({ runtimeMinutes: 15 })).verdict).toBe('unknown');
    // A missing fact is not a pass.
    const blank = checkExtract(get('oscar98-general'), facts({}));
    expect(blank.verdict).toBe('unknown');
    expect(blank.reasons[0]).toBe('Its running time isn\'t known yet.');
    // Every extract, every case: no verdict but ineligible or unknown.
    for (const x of RULE_EXTRACTS) for (const f of [facts({}), facts({ runtimeMinutes: 12, animationShare: 1, firstRelease: '2025-07-01' }), facts({ runtimeMinutes: 120, animationShare: 1, firstRelease: '2025-07-01' })]) {
      expect(['ineligible', 'unknown']).toContain(checkExtract(x, f).verdict);
    }
  });

  it('belong to their editions, each incomplete and sourced', () => {
    expect(extractsFor('oscars', 2026).map((x) => x.id)).toEqual(['oscar98-general', 'oscar98-animation']);
    for (const x of RULE_EXTRACTS) { expect(x.complete).toBe(false); expect(x.source.url).toMatch(/^https:\/\//); }
  });
});
