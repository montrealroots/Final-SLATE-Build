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
    expect(ROUTE_RECORDS).toHaveLength(45);
    // Serbia's long-stay route doesn't stand in for its work permit.
    expect(scopedRecords('RS', 'permit', { livesIn: 'US', passports: ['IN'], today: '2026-06-01' })).toEqual({ application: undefined, issuance: undefined });
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
