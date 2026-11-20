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
  // From November 17, 2026: a territory takes its sovereign's permit only where the work records give it the same route,
  // and its sovereign's visa only where a law or page says so (terms.json permitAuthorities, visaAuthorities).
  it('gives a territory its sovereign\'s permit only on the same route, and its sovereign\'s visa with the law that says so', () => {
    const t = terms as unknown as { permits: Record<string, { route: string }>; permitAuthorities: Record<string, string>; visaAuthorities: Record<string, { authority: string; sources: { url: string }[] }> };
    for (const [c, by] of Object.entries(t.permitAuthorities)) {
      expect(WORK.countries[c].others?.route, c).toBe(t.permits[by].route);
      expect(permitTerms(c, WORK.countries[c].others!.route!)).toMatchObject({ fee: permitTerms(by, t.permits[by].route).fee, estimate: null });
    }
    // A route named only "Work permit" is not Canada's because Canada's is named so too.
    expect(permitTerms('AF', 'Work permit').estimate).not.toBeNull();
    expect(permitTerms('GU', WORK.countries.GU.others!.route!).basis).toMatch(/^The same permit the United States issues, under the same law\. /);
    for (const [c, v] of Object.entries(t.visaAuthorities)) {
      expect(v.sources.length, c).toBeGreaterThan(0);
      expect(visaTerms(c)).toMatchObject({ fee: visaTerms(v.authority).fee, estimate: visaTerms(v.authority).estimate });
      expect(visaTerms(v.authority).estimate === null || visaTerms(v.authority).estimate?.only === 'days', c).toBe(true);
    }
    expect(visaTerms('JE').route).toBe(visaTerms('GB').route);
  });

  // From November 20, 2026: a researched record can carry a fee paid only once it is issued, as a route-scoped record
  // already could (papers-scoped.ts). Mauritius takes US$50 on applying and its US$300 permit fee after approval; the
  // application then pays the second only on issue (papers.ts), and a refusal costs only the first.
  it('carries a researched issuance fee to the terms: Mauritius\' application fee now, its permit fee only on issue', () => {
    const mu = permitTerms('MU', 'Work permit');
    expect(mu).toMatchObject({ route: 'Short-term Occupation Permit', fee: { amount: 50, currency: 'USD' }, issuance: { amount: 300, currency: 'USD' }, stayDays: 270 });
    expect(mu.estimate?.only).toBe('days');
    expect(permitTerms('UG', 'Work permit').issuance).toBeUndefined();
  });

  // The owner's six-destination research of November 20, 2026: each figure keeps what kind of fact it is.
  it('keeps each researched time what it is: a target, an average, an arrival desk; and each fee its parts', () => {
    // Papua New Guinea: a nil visa fee and a US$50 online charge, paid once, so US$50 in all (not 0, not 100).
    const pg = visaTerms('PG');
    expect(pg.fee).toEqual({ amount: 50, currency: 'USD' });
    expect(pg.issuance).toBeUndefined();
    expect(pg.basis).toMatch(/no fee; the online application carries a US\$50 eVisa charge, paid once/);
    expect(pg.basis).toMatch(/target of 10 working days.*not a promise/);
    // Ukraine: the e-visa's three working days, not the general page's nine, nor the consular route's terms.
    const ua = visaTerms('UA');
    expect(ua).toMatchObject({ fee: { amount: 20, currency: 'USD' }, days: 5, estimate: null });
    expect(ua.basis).toMatch(/three working days/);
    expect(ua.basis).toMatch(/still says nine working days/);
    // Iceland: an observed average, said as one, never a deadline.
    const is = permitTerms('IS', 'Work permit');
    expect(is).toMatchObject({ fee: { amount: 80000, currency: 'ISK' }, days: 60, daysText: 'about 60 days, on average', estimate: null });
    expect(is.basis).toMatch(/on average.*can't be expedited/);
    // Nepal: issued at the desk on arrival; the receipt's 15 days are never the wait.
    const np = visaTerms('NP');
    expect(np).toMatchObject({ fee: { amount: 30, currency: 'USD' }, days: 1, stayDays: 15 });
    expect(np.basis).toMatch(/15-day validity is how long the receipt lasts, not a wait/);
    // Cyprus: the general fee with its reductions named, and the conflicting time kept in view.
    const cy = visaTerms('CY');
    expect(cy).toMatchObject({ fee: { amount: 90, currency: 'EUR' }, days: 30, daysText: 'between 15 and 45 days', estimate: null });
    expect(cy.basis).toMatch(/€35 under facilitation agreements/);
    expect(cy.basis).toMatch(/10 calendar days, up to 30, instead/);
    // A source read from the authority's indexed text says so.
    for (const t of [pg, ua, is, np, cy]) expect(t.sources.some((s) => /official search index/.test(s.what)), t.route).toBe(true);
  });

  // Batch 12 (November 20, 2026): a fee charged by the month is taken for the game's three months, as Trinidad and
  // Tobago's permit is; a decision time in business days is said as calendar days.
  it('charges Seychelles\' permit by the month for three months, and times the Bahamas\' visa in business days', () => {
    expect(permitTerms('SC', 'Gainful Occupation Permit')).toMatchObject({ fee: { amount: 2500, currency: 'SCR' }, days: 3, daysText: 'between 1 and 5 days', stayDays: 90, estimate: null });
    expect(visaTerms('BS')).toMatchObject({ fee: { amount: 160, currency: 'BSD' }, days: 12, estimate: null });
    expect(visaTerms('BS').basis).toMatch(/7 to 10 business days/);
    // Fiji: 14 working days, about 20; Vanuatu: the 2025 directive's fee, its decision time still the game's estimate.
    expect(visaTerms('FJ')).toMatchObject({ fee: { amount: 93, currency: 'FJD' }, days: 20, estimate: null });
    expect(permitTerms('VU', 'Work permit (Department of Labour)')).toMatchObject({ route: 'Temporary Work Permit', fee: { amount: 60000, currency: 'VUV' }, stayDays: 120 });
    expect(permitTerms('VU', 'Work permit (Department of Labour)').estimate?.only).toBe('days');
  });

  it('names a source for every researched figure, and each is a real amount and a real time', () => {
    for (const [c, r] of Object.entries((terms as unknown as { permits: Record<string, Recorded>; visas?: Record<string, Recorded> }).permits)) {
      // A researched fee may be nothing: Belgium's short-term permit is free (from November 17, 2026).
      expect(r.fee, c).toBeGreaterThanOrEqual(0);
      expect(r.currency, c).toMatch(/^[A-Z]{3}$/);
      // A record may leave out the decision time where no source gives it (from November 17, 2026): it's then estimated.
      for (const d of [r.days ?? []].flat()) expect(d, c).toBeGreaterThan(0);
      expect(r.sources.length, c).toBeGreaterThan(0);
      for (const s of r.sources) {
        expect(['official', 'secondary'], c).toContain(s.kind);
        expect(s.url, c).toMatch(/^https:\/\//);
        expect(s.what.length, c).toBeGreaterThan(10);
      }
    }
  });

  it('gives every country a permit and a visa with a finite fee and time, and lets the estimates fall and never rise', () => {
    // Fully estimated routes, and routes whose fee is researched but whose decision time is still estimated.
    const estimates: Record<string, string[]> = { permits: [], visas: [], permitTimes: [], visaTimes: [] };
    for (const { code } of COUNTRIES) {
      if (!WORK.countries[code]) continue; // a place no one lives
      const p = permitTerms(code, WORK.countries[code].others?.route ?? 'Work permit');
      const v = visaTerms(code);
      for (const t of [p, v]) {
        expect(Number.isFinite(t.fee.amount) && (t.fee.amount > 0 || (!t.estimate && t.fee.amount === 0)), `${code} ${t.route}`).toBe(true);
        expect(t.days, `${code} ${t.route}`).toBeGreaterThan(0);
        if (t.estimate && !t.estimate.only) expect(t.basis, code).toMatch(/^The game's estimate/);
        if (t.estimate?.only) expect(t.basis, code).toMatch(/How long it takes to decide is the game's estimate/);
      }
      if (p.estimate) estimates[p.estimate.only ? 'permitTimes' : 'permits'].push(code);
      if (v.estimate) estimates[v.estimate.only ? 'visaTimes' : 'visas'].push(code);
      if (p.estimate?.only) expect(p.sources.length, code).toBeGreaterThan(0);
    }
    const file = 'docs/v10/papers-estimates.json';
    const counts = Object.fromEntries(Object.entries(estimates).map(([k, v]) => [k, v.length]));
    const text = JSON.stringify({ counts, ...estimates }, null, 1) + '\n';
    const before = JSON.parse(readFileSync(file, 'utf8')) as { counts: Record<string, number> };
    if (process.env.SLATE_WRITE_AUDIT) writeFileSync(file, text);
    // Neither the fully estimated routes nor every route with anything estimated may grow.
    expect(estimates.permits.length, 'more permits are estimated than before').toBeLessThanOrEqual(before.counts.permits);
    expect(estimates.visas.length, 'more visas are estimated than before').toBeLessThanOrEqual(before.counts.visas);
    expect(estimates.permits.length + estimates.permitTimes.length, 'more permit times are estimated than before').toBeLessThanOrEqual(before.counts.permits + (before.counts.permitTimes ?? 0));
    expect(estimates.visas.length + estimates.visaTimes.length, 'more visa times are estimated than before').toBeLessThanOrEqual(before.counts.visas + (before.counts.visaTimes ?? 0));
    expect(readFileSync(file, 'utf8'), `${file} is out of date: run with SLATE_WRITE_AUDIT=1`).toBe(text);
  });
});
