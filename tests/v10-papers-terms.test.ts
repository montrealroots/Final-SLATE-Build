// Every permit and visa can be applied for (the owner's command of November 14, 2026: "make them absolutely possible",
// choosing research, then estimate). This holds the two halves of that:
// - every researched figure names a source that says what it is, and is a real amount and a real time;
// - every route no research covers has an estimate with a finite fee and time, and the estimates are listed in
//   docs/v10/papers-estimates.json, the research queue, whose count may fall and may not rise.
import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import terms from '../src/data/papers/terms.json';
import workData from '../src/data/papers/work.json';
import { COUNTRIES } from '../src/world/gazetteer/gazetteer';
import { permitTerms, visaTerms } from '../src/engine/papers-terms';

type Recorded = { fee: number; currency: string; days: number | [number, number]; sources: { kind: string; url: string; what: string }[] };
const WORK = workData as unknown as { countries: Record<string, { others?: { route?: string } }> };

describe('papers terms', () => {
  it('names a source for every researched figure, and each is a real amount and a real time', () => {
    for (const [c, r] of Object.entries((terms as unknown as { permits: Record<string, Recorded>; visas?: Record<string, Recorded> }).permits)) {
      expect(r.fee, c).toBeGreaterThan(0);
      expect(r.currency, c).toMatch(/^[A-Z]{3}$/);
      for (const d of [r.days].flat()) expect(d, c).toBeGreaterThan(0);
      expect(r.sources.length, c).toBeGreaterThan(0);
      for (const s of r.sources) {
        expect(['official', 'secondary'], c).toContain(s.kind);
        expect(s.url, c).toMatch(/^https:\/\//);
        expect(s.what.length, c).toBeGreaterThan(10);
      }
    }
  });

  it('gives every country a permit and a visa with a finite fee and time, and lets the estimates fall and never rise', () => {
    const estimates: Record<string, string[]> = { permits: [], visas: [] };
    for (const { code } of COUNTRIES) {
      if (!WORK.countries[code]) continue; // a place no one lives
      const p = permitTerms(code, WORK.countries[code].others?.route ?? 'Work permit');
      const v = visaTerms(code);
      for (const t of [p, v]) {
        expect(Number.isFinite(t.fee.amount) && t.fee.amount > 0, `${code} ${t.route}`).toBe(true);
        expect(t.days, `${code} ${t.route}`).toBeGreaterThan(0);
        if (t.estimate) expect(t.basis, code).toMatch(/^The game's estimate/);
      }
      if (p.estimate) estimates.permits.push(code);
      if (v.estimate) estimates.visas.push(code);
    }
    const file = 'docs/v10/papers-estimates.json';
    const text = JSON.stringify({ counts: { permits: estimates.permits.length, visas: estimates.visas.length }, ...estimates }, null, 1) + '\n';
    const before = JSON.parse(readFileSync(file, 'utf8')) as { counts: { permits: number; visas: number } };
    if (process.env.SLATE_WRITE_AUDIT) writeFileSync(file, text);
    expect(estimates.permits.length, 'more permits are estimated than before').toBeLessThanOrEqual(before.counts.permits);
    expect(estimates.visas.length, 'more visas are estimated than before').toBeLessThanOrEqual(before.counts.visas);
    expect(readFileSync(file, 'utf8'), `${file} is out of date: run with SLATE_WRITE_AUDIT=1`).toBe(text);
  });
});
