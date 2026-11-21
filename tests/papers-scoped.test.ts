// Fees researched for one route and one kind of applicant (src/engine/papers-scoped.ts; the owner's research recovery
// package of November 19, 2026, docs/03-PAPERS-INTEGRATION.md and its acceptance tests). A record applies only where
// its conditions hold; a conflicting, undated or not-yet-in-force one is never charged; an issuance fee is paid only on
// issue, once.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { ROUTE_RECORDS, scopedRecords, withScope, workingDays } from '../src/engine/papers-scoped';
import { applications, applyForVisa, visaCheck, visaFor } from '../src/engine/papers';
import { permitTerms, visaTerms } from '../src/engine/papers-terms';
import { personalPostings } from '../src/engine/personal';
import { deserialize, serialize } from '../src/engine/save';
import { newGame } from '../src/engine/state';
import { draft } from './fixtures';
import type { GameState } from '../src/engine/types';

const life = (tag: string, place: string, nationalities: string[], startDate = '2026-06-01') =>
  newGame(draft({ startPlaceId: place, birthplaceId: place, nationalities, startDate }), 0, `save-${tag}`);
// Papers' postings after the first day's (a life abroad pays its own work visa on arriving).
const fees = (s: GameState) => personalPostings(s).filter((p) => (p.kind as string) === 'papers').map((p) => p.amount).filter((x, i, xs) => !(i === 0 && xs.length && x === ARRIVAL.get(s)));
const ARRIVAL = new WeakMap<GameState, number>();

describe('route-scoped fees', () => {
  it('resolves one destination differently by passport: the Philippines\' Washington list for a Chinese and an Indian applicant', () => {
    const who = (p: string) => ({ livesIn: 'US', passports: [p], today: '2026-06-01' });
    expect(scopedRecords('PH', 'visa', who('CN')).application).toMatchObject({ amount: 25, currency: 'USD' });
    expect(scopedRecords('PH', 'visa', who('IN')).application).toMatchObject({ amount: 40, currency: 'USD' });
    // Living elsewhere, the Washington list isn't theirs: the country's terms stand.
    expect(scopedRecords('PH', 'visa', { ...who('IN'), livesIn: 'IN' })).toEqual({ application: undefined, issuance: undefined });
  });

  it('charges one passport two currencies by where it applies from, and nothing before the schedule is in force', () => {
    const at = (livesIn: string, today = '2026-06-01') => scopedRecords('CO', 'visa', { livesIn, passports: ['IN'], today });
    expect(at('FR')).toMatchObject({ application: { amount: 44, currency: 'EUR' }, issuance: { amount: 106, currency: 'EUR' } });
    expect(at('US')).toMatchObject({ application: { amount: 56, currency: 'USD' }, issuance: { amount: 138, currency: 'USD' } });
    expect(at('US', '2026-03-31')).toEqual({ application: undefined, issuance: undefined }); // Resolution 03969 from April 1
    const t = withScope(visaTerms('CO'), 'CO', 'visa', { livesIn: 'US', passports: ['IN'], today: '2026-06-01' });
    expect(t).toMatchObject({ fee: { amount: 56, currency: 'USD' }, issuance: { amount: 138, currency: 'USD' }, estimate: { only: 'days' } });
  });

  it('counts a decision in working days: weekends and the country\'s holidays don\'t count', () => {
    // From Friday, November 20, 2026: 14 working days end on Wednesday, December 10, 20 days on.
    expect(workingDays('BW', '2026-11-20', 14)).toBe(20);
    expect(workingDays('BW', '2026-11-20', 1)).toBe(3); // Monday
    const t = withScope(permitTerms('BW', 'Work permit'), 'BW', 'permit', { livesIn: 'BW', passports: ['GB'], today: '2026-11-20' });
    expect(t).toMatchObject({ fee: { amount: 1500, currency: 'BWP' }, days: 20, estimate: null });
    expect(t.daysText).toBe('14 working days (about 20 days)');
  });

  it('never charges a record that is conflicting, undated or not yet in force, nor a worker\'s route as a visitor\'s', () => {
    const unsettled = ROUTE_RECORDS.filter((r) => /conflict|undated|commencement/.test(r.evidence));
    expect(unsettled.map((r) => r.country).sort()).toEqual(['KY', 'MW', 'MW', 'NA', 'NA']);
    expect(unsettled.every((r) => !r.applies && r.held)).toBe(true);
    // Every record is either applied or held with a reason; none is silently dropped.
    expect(ROUTE_RECORDS.every((r) => !!r.applies !== !!r.held)).toBe(true);
    // A decision time names its unit, and the unit is one withScope applies (from November 21, 2026).
    expect(ROUTE_RECORDS.filter((r) => r.days).every((r) => r.dayUnit === 'working' || r.dayUnit === 'calendar')).toBe(true);
    expect(ROUTE_RECORDS).toHaveLength(81);
    // Serbia's long-stay route doesn't stand in for its work permit.
    expect(scopedRecords('RS', 'permit', { livesIn: 'US', passports: ['IN'], today: '2026-06-01' })).toEqual({ application: undefined, issuance: undefined });
  });

  // From November 20, 2026: Trinidad and Tobago's missions price its visa apart, so each is one consulate's, never everyone's.
  it('charges Trinidad and Tobago\'s visa at the Washington embassy\'s and the Canadian missions\' prices, and no one else\'s', () => {
    const at = (livesIn: string) => withScope(visaTerms('TT'), 'TT', 'visa', { livesIn, passports: ['IN'], today: '2026-11-20' });
    expect(at('US')).toMatchObject({ fee: { amount: 85, currency: 'USD' }, estimate: null, daysText: '12 working days (about 18 days)' });
    expect(at('CA').fee).toEqual({ amount: 160, currency: 'CAD' });
    expect(at('CA').estimate?.only).toBe('days');
    expect(at('IN')).toEqual(visaTerms('TT'));
  });

  // From November 20, 2026 (Grenada's Ministry of Labour guidelines): the application's XCD 100 now, the permit's fee by
  // nationality only once it's approved; a passport in two tiers pays the lower.
  it('charges Grenada\'s permit fee by nationality, and only on approval', () => {
    const at = (passports: string[]) => withScope(permitTerms('GD', 'Work permit'), 'GD', 'permit', { livesIn: 'US', passports, today: '2026-11-20' });
    expect(at(['CN'])).toMatchObject({ fee: { amount: 100, currency: 'XCD' }, issuance: { amount: 5000, currency: 'XCD' }, days: 17, estimate: null });
    expect(at(['US']).issuance).toEqual({ amount: 3000, currency: 'XCD' });
    expect(at(['IN']).issuance).toEqual({ amount: 3000, currency: 'XCD' });
    expect(at(['JM']).issuance).toEqual({ amount: 1000, currency: 'XCD' });
    expect(at(['GB', 'JM']).issuance).toEqual({ amount: 1000, currency: 'XCD' });
  });

  // Batch 14 (November 20, 2026): Botswana's Washington embassy prices its visitor visa for applicants who live in the
  // United States; Turks and Caicos takes its administration fee on applying and the permit's annual fee after approval.
  it('charges Botswana\'s visa at the Washington embassy\'s price, and Turks and Caicos\' permit fee only after approval', () => {
    const bw = (livesIn: string) => withScope(visaTerms('BW'), 'BW', 'visa', { livesIn, passports: ['IN'], today: '2026-11-20' });
    expect(bw('US').fee).toEqual({ amount: 30, currency: 'USD' });
    expect(bw('US').estimate?.only).toBe('days');
    expect(bw('GB')).toEqual(visaTerms('BW'));
    expect(permitTerms('TC', 'Work permit (Employed)')).toMatchObject({ fee: { amount: 270, currency: 'USD' }, issuance: { amount: 2700, currency: 'USD' }, days: 20, daysText: 'between 15 and 25 days', estimate: null });
  });

  // Batch 16 (November 20, 2026): Jamaica prices its visa by nationality (the High Commission's list of March 30, 2023).
  it('charges Jamaica\'s visa by nationality, free where the list says gratis, and never before the list', () => {
    const at = (p: string, today = '2026-11-20') => withScope(visaTerms('JM'), 'JM', 'visa', { livesIn: 'GB', passports: [p], today });
    expect(at('IR').fee).toEqual({ amount: 3.5, currency: 'USD' });
    expect(at('KZ').fee).toEqual({ amount: 100, currency: 'USD' });
    expect(at('KY').fee).toEqual({ amount: 102.4, currency: 'USD' });
    expect(at('CU').fee).toEqual({ amount: 35, currency: 'USD' });
    expect(at('PK').fee).toEqual({ amount: 0, currency: 'USD' });
    expect(at('IR').estimate?.only).toBe('days');
    expect(at('IR', '2023-01-01')).toEqual(visaTerms('JM'));
    // Every passport is in one fee at most.
    const jm = ROUTE_RECORDS.filter((r) => r.id.startsWith('jm-visa-')).flatMap((r) => r.applies!.when.passport!);
    expect(new Set(jm).size).toBe(jm.length);
  });

  // Batch 18 (November 21, 2026): Grenada's London High Commission prices its visa for applicants who live in the UK.
  it('charges Grenada\'s visa at the London High Commission\'s price, its processing fee included', () => {
    const at = (livesIn: string) => withScope(visaTerms('GD'), 'GD', 'visa', { livesIn, passports: ['CN'], today: '2026-11-21' });
    expect(at('GB').fee).toEqual({ amount: 230, currency: 'GBP' });
    expect(at('US')).toEqual(visaTerms('GD'));
  });

  it('charges the Cayman Islands\' visa processing fee to the two nationalities its page names', () => {
    const at = (p: string) => withScope(visaTerms('KY'), 'KY', 'visa', { livesIn: 'US', passports: [p], today: '2026-11-21' });
    expect(at('JM')).toMatchObject({ fee: { amount: 92, currency: 'KYD' }, days: 14, daysText: '14 days', estimate: null });
    expect(at('HN').fee).toEqual({ amount: 92, currency: 'KYD' });
    expect(at('IN')).toEqual(visaTerms('KY'));
  });

  // From November 20, 2026 (Nepal Tourism Board): some passports get no visa on arrival in Nepal and apply at a mission
  // first, which no source times, so their time is the game's estimate, not the arrival desk's day; Chinese nationals
  // pay nothing; everyone else keeps the US$30 on arrival.
  it('times Nepal\'s mission-only passports by estimate, frees Chinese nationals, and leaves the rest at the desk', () => {
    const at = (p: string) => withScope(visaTerms('NP'), 'NP', 'visa', { livesIn: 'US', passports: [p], today: '2026-11-20' });
    const ng = at('NG');
    expect(ng.fee).toEqual({ amount: 30, currency: 'USD' });
    expect(ng.days).toBeGreaterThan(1);
    expect(ng.estimate?.only).toBe('days');
    expect(ng.basis).toMatch(/applied for at a mission first.*the game's estimate/);
    expect(at('CN')).toMatchObject({ fee: { amount: 0, currency: 'USD' }, days: 1, estimate: null });
    expect(at('US')).toMatchObject({ fee: { amount: 30, currency: 'USD' }, days: 1, estimate: null });
    // Holding both, the mission rule wins: the Chinese record never applies to a Nigerian passport.
    expect(withScope(visaTerms('NP'), 'NP', 'visa', { livesIn: 'US', passports: ['CN', 'NG'], today: '2026-11-20' }).fee.amount).toBe(30);
  });
});

describe('a fee paid in parts', () => {
  // A Pakistani passport living in Los Angeles needs a visa for Colombia (1221's records), on its dollar schedule.
  const pakistani = (tag: string) => { const s = life(tag, 'us-los-angeles', ['PK']); const first = personalPostings(s).filter((p) => (p.kind as string) === 'papers').map((p) => p.amount); if (first.length) ARRIVAL.set(s, first[0]); return s; };

  it('takes the study fee on applying and the issuance fee only on issue, once, across a reload', () => {
    let issued: GameState | undefined;
    let refused: GameState | undefined;
    for (let i = 0; i < 40 && !(issued && refused); i++) {
      const s = pakistani(`co-parts-${i}`);
      const c = visaCheck(s, 'CO');
      expect(c).toMatchObject({ ok: true, feeText: '56 USD, and 138 USD if it\'s issued' });
      const a = applyForVisa(s, 'CO');
      expect(fees(s)).toEqual([-56]);
      processUntil(s, a.decideAt + DAY, 'tick', 2_000_000);
      if (a.stage === 'issued') issued ??= s; else refused ??= s;
    }
    // Refused: the study fee is spent, the issuance fee never charged.
    expect(fees(refused!)).toEqual([-56]);
    expect(applications(refused!).find((a) => a.kind === 'visa')!.issuance).toMatchObject({ minor: 13800, currency: 'USD', paidUsdMinor: 0 });
    // Issued: both, each once; a reload and another day charge nothing more.
    expect(fees(issued!)).toEqual([-56, -138]);
    const back = deserialize(serialize(issued!));
    ARRIVAL.set(back, ARRIVAL.get(issued!)!);
    processUntil(back, back.now + 2 * DAY, 'tick', 2_000_000);
    expect(fees(back)).toEqual([-56, -138]);
    expect(applications(back).find((a) => a.kind === 'visa')!.issuance).toMatchObject({ paidUsdMinor: 13800 });
  }, 300_000);

  it('leaves a destination with no record for the applicant on its own terms', () => {
    const s = pakistani('co-none');
    expect(visaFor(s, 'MW').issuance).toBeUndefined();
    expect(visaFor(s, 'MW')).toEqual(visaTerms('MW'));
  });
});
