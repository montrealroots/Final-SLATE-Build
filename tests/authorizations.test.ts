// Electronic travel authorizations (papers-terms.ts authorizationTerms, from November 16, 2026): until then every
// destination that asks for one (an ESTA, the UK's ETA, Canada's eTA, ...) charged its visitor visa instead, an ESTA
// $135 and 64 days. Each is now its own researched record, or the game's estimate where none could be confirmed.
import { describe, expect, it } from 'vitest';
import visitsData from '../src/data/papers/visits.json';
import termsData from '../src/data/papers/terms.json';
import { RESEARCHED_AUTHORIZATIONS, authorizationTerms } from '../src/engine/papers-terms';
import { visaCheck, visaFor } from '../src/engine/papers';
import { startLife } from './helpers';

const passportsOf = (tag: string, nationalities: string[]) => startLife(`auth-${tag}`, 'ca-toronto', { nationalities, birthplaceId: 'jp-tokyo' } as never);

/** Every destination some passport needs an electronic authorization for, in the visit records. */
function etaDestinations(): string[] {
  const v = visitsData as unknown as { groups: Record<string, { passports: Record<string, { entry: string }>; others: { entry: string } }>; countries: Record<string, { group?: string; passports?: Record<string, { entry: string }>; others?: { entry: string } }> };
  return Object.entries(v.countries).filter(([, e]) => {
    const l = e.group ? { passports: { ...v.groups[e.group].passports, ...(e.passports ?? {}) }, others: v.groups[e.group].others } : (e as { passports: Record<string, { entry: string }>; others: { entry: string } });
    return [...Object.values(l.passports), l.others].some((r) => r.entry === 'eta');
  }).map(([c]) => c).sort();
}

describe('electronic travel authorizations', () => {
  it('records each with a source, a fee of nothing or more, a decision time and a name', () => {
    const records = (termsData as unknown as { authorizations: Record<string, { name: string; fee: number; days: number | number[]; sources: { url: string }[] }> }).authorizations;
    for (const [c, r] of Object.entries(records)) {
      expect(r.fee, c).toBeGreaterThanOrEqual(0);
      for (const d of [r.days].flat()) expect(d, c).toBeGreaterThan(0);
      expect(r.sources.length, c).toBeGreaterThan(0);
      for (const s of r.sources) expect(s.url, c).toMatch(/^https:\/\//);
      expect(r.name.length, c).toBeGreaterThan(3);
    }
  });

  it('covers every destination that asks for one: none is estimated', () => {
    // Until later on November 16, 2026, Morocco's AEVM (and Western Sahara's), Russia's electronic application and Saudi
    // Arabia's ETA for British visitors were the game's estimate. Researched since; the list may not grow again.
    expect(etaDestinations().filter((c) => authorizationTerms(c, ['JP']).estimate)).toEqual([]);
    expect(RESEARCHED_AUTHORIZATIONS.length).toBe(23);
    expect(authorizationTerms('EH', ['GH']).route).toBe(authorizationTerms('MA', ['GH']).route);
    expect(authorizationTerms('RU', ['BR'])).toMatchObject({ fee: { amount: 0 }, days: 3 });
    expect(authorizationTerms('SA', ['GB'])).toMatchObject({ fee: { amount: 50, currency: 'SAR' }, stayDays: 365 });
  });

  it('charges a Japanese visitor to the United States the ESTA, decided in three days and good for two years', () => {
    const s = passportsOf('us', ['JP']);
    expect(visaFor(s, 'US')).toMatchObject({ route: 'ESTA (Electronic System for Travel Authorization)', fee: { amount: 40.62, currency: 'USD' }, days: 3, stayDays: 730, estimate: null });
    const c = visaCheck(s, 'US');
    expect(c.ok && c.feeText).toBe('40.62 USD');
    // Puerto Rico is entered on the same ESTA; Jersey on the UK's ETA.
    expect(visaFor(s, 'PR').route).toBe(visaFor(s, 'US').route);
    expect(visaFor(s, 'JE')).toMatchObject({ route: 'Electronic Travel Authorisation (ETA)', fee: { amount: 20, currency: 'GBP' } });
  });

  it('takes the passport that pays least: a French passport visits Australia on the free eVisitor, a Japanese one on the ETA', () => {
    expect(visaFor(passportsOf('au-jp', ['JP']), 'AU')).toMatchObject({ route: 'Electronic Travel Authority (subclass 601)', fee: { amount: 20, currency: 'AUD' } });
    expect(visaFor(passportsOf('au-fr', ['FR']), 'AU')).toMatchObject({ route: 'eVisitor (subclass 651)', fee: { amount: 0, currency: 'AUD' } });
    const free = visaCheck(passportsOf('au-fr-check', ['FR']), 'AU');
    expect(free.ok && free.feeText).toBe('free');
    expect(visaFor(passportsOf('au-both', ['JP', 'FR']), 'AU').route).toBe('eVisitor (subclass 651)');
    // Sri Lanka's tourist ETA: free for the 40 nationalities from May 25, 2026, about $50 for the rest.
    expect(authorizationTerms('LK', ['US']).fee.amount).toBe(0);
    expect(authorizationTerms('LK', ['BR']).fee).toEqual({ amount: 50, currency: 'USD' });
  });

  it('charges a visitor whose waiver is closed the visa, not the authorization: the B-1/B-2 for the United States', () => {
    const s = passportsOf('us-closed', ['JP']);
    s.overstays = [{ country: 'US', area: 'the United States', from: s.now - 30 * 86_400_000, left: s.now - 20 * 86_400_000 }];
    expect(visaFor(s, 'US')).toMatchObject({ route: 'B-1/B-2 Visitor Visa', fee: { amount: 185, currency: 'USD' }, estimate: null });
  });
});
