// @ts-nocheck: 1221's test, ported (docs/v9/PARITY.md). Its skipped cases name 1221 fields and exports SLATE doesn't carry.
/**
 * Brief 21's banking proof (P2): each defect the brief names, played through the commands and the clock, against figures
 * worked by hand from the dated sources in docs/verification/genre-banking-2026-10-22/banking-sources.md, never asked of
 * the engine's helpers. Each section says when a charge comes and, beside it, when it mustn't.
 *
 * - B1, a rate quoted as a yield (an APY, an AER, a TAE, a GAT) is what a year earns with the interest left in, so a
 *   day's interest is worked from the nominal rate r that earns it as the account credits it, m times a year:
 *   r = m × ((1 + y)^(1/m) − 1), and m is 365 where the bank compounds daily. Until 2026-10-22 every rate ran as nominal,
 *   so Capital One's 3.00% APY paid $3,041.59 a year on $100,000. Each account type: monthly (Capital One), daily
 *   compounding (Wells Fargo), yearly from its opening (Lloyds), every six months from its opening (Bankinter), April and
 *   October (AIB), and a rate the bank gives as nominal, left as it is (RBC).
 * - B2 and B3, a US card's minimum more than 60 days late: the bank's notice on the 61st day after its due date
 *   (Reg Z §1026.55(b)(4)), the penalty rate and the end of an introductory rate 45 days on (§1026.9(g)), a default notice
 *   on the 150th, and the charge-off on the 180th (the FFIEC's Uniform Retail Credit Classification and Account
 *   Management Policy). Until then the penalty came at the second due date missed, about 30 days late, and the
 *   charge-off at the sixth, about 150.
 * - B5, a US card's due date is one day each month (§1026.7(b)(11)(i)(A)) at least 21 days after the statement
 *   (§1026.5(b)(2)(ii)). Until then the statement and the bank's days, so Chase's fell on the 10th, 11th or 13th.
 * - B6, a standing order from a British, EU or EEA bank dated on a day that isn't a business day there is made on the
 *   next one (PSRs 2017 reg. 81(6); PSD2 art. 78(2)). Elsewhere it's made on its day, an assumption.
 * - S, a save from before brief 21 with a US card behind: dated on opening, nothing charged for the days before.
 *
 * Every life is new, as creation makes it, and played by the clock. The seeds are arbitrary, none picked for what it
 * draws. TEST SETUP, said where it's done: a balance set by hand so a figure is round and nothing else draws on it.
 */
import { describe, expect, it } from 'vitest';
import { createSave, loadSave, migrate, quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import type { Account } from '../../src/engine/bankworld/core/ledger';
import { newLifeConfig } from '../../src/engine/bankworld/world/bootstrap';
import { MS_DAY, dateKey, instantFromZoned, type Instant } from '../../src/engine/bankworld/core/time';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { cardsOf, cardTerms, dueAt, stateOf, US_LATE, usDueDay } from '../../src/engine/bankworld/systems/credit';
import { addCountryHolidays } from '../../src/engine/bankworld/content/holidays';
import { readFileSync } from 'node:fs';

// TEST SETUP: Britain's holidays, which the app fetches for a save's countries when it opens (`loadPlacesFor`), read from
// disk, so a business day is counted as the bank counts it.
addCountryHolidays('uk', readFileSync('src/engine/bankworld/data/holidays/uk.tsv', 'utf8'));

const NY = 'America/New_York';
const at = (y: number, m: number, d: number, h = 12, min = 0, zone = NY): Instant => instantFromZoned({ year: y, month: m, day: d, hour: h, minute: min }, zone);
const student = (seed: string, bankId: string): Simulation => createSave(1, seed, {
  ...newLifeConfig(), homeRegionId: 'us-ny-newyork', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her', bankId,
});
const abroad = (cityId: string, bankId: string, seed: string, start?: { startYear: number; startMonth: number; startDay: number }): Simulation =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, wealth: 'comfortable', bankId, ...start }, seed);
const mine = (sim: Simulation, kind: Account['kind'], bankId?: string): Account => sim.ledger.accountsOf(sim.player.id)
  .find((a) => a.kind === kind && !a.closedAt && !a.nominal && a.category !== 'term' && (!bankId || a.bankId === bankId))!;
const run = <T = unknown>(sim: Simulation, kind: string, payload: Record<string, unknown> = {}): T => {
  const answer = sim.execute<T>({ kind, payload });
  expect(answer.ok, `${kind}: ${answer.error}`).toBe(true);
  return answer.value as T;
};
/** TEST SETUP: an account's balance set by hand, against the test's own equity, and the cent's fraction carried set aside. */
function setTo(sim: Simulation, account: Account, to: number): void {
  const by = to - account.balance;
  if (by !== 0) sim.post({ memo: 'TEST SETUP', category: 'test', postings: [{ accountId: account.id, amount: by }, { accountId: sim.nominalAccount('equity', 'Test').id, amount: -by }] });
  account.accrued = 0;
}
/** What each posting with this memo put on one account, with when. */
const posted = (sim: Simulation, account: Account, memo: RegExp | string) => sim.universe.transactions
  .filter((t) => (typeof memo === 'string' ? t.memo === memo : memo.test(t.memo)) && t.postings.some((p) => p.accountId === account.id))
  .map((t) => ({ at: t.at, amount: t.postings.filter((p) => p.accountId === account.id).reduce((n, p) => n + p.amount, 0), tax: t.postings.filter((p) => p.accountId !== account.id && p.amount > 0).reduce((n, p) => n + p.amount, 0) }));
const titled = (sim: Simulation, title: string) => sim.universe.notifications.filter((n) => n.title === title);
const reload = (sim: Simulation): Simulation => loadSave(deserialise(serialise(sim.universe)) as never);

// ---------------------------------------------------------------------------
// B1. A yield's nominal rate, credited as each account credits it
// ---------------------------------------------------------------------------

describe('B1: a rate quoted as a yield earns that yield in a year, and a nominal one is left as it is', () => {
  it('pays Capital One’s 3.00% APY as $2,999.99 a year on $100,000, credited monthly at 12 × (1.03^(1/12) − 1) = 2.9595%, where it paid $3,041.59 until brief 21', () => {
    const sim = student('b21-yield-capone', 'us-capital-one');
    sim.advanceTo(at(2026, 8, 31, 23, 30));
    const savings = mine(sim, 'savings');
    setTo(sim, savings, 100_000_00); // TEST SETUP: after August's interest, at 11 PM
    setTo(sim, mine(sim, 'checking'), 1_000_000_00); // TEST SETUP: so nothing ever draws on the savings
    sim.advanceTo(at(2027, 9, 1, 1));
    // Worked by hand (yields.py in the receipt): each month's day-ends on the balance with the months credited before it,
    // at 0.029595/365 a day, whole cents at each month's end and the fraction carried. September 2026 to August 2027.
    const months = posted(sim, savings, 'Interest: 360 Performance Savings').filter((p) => p.at > at(2026, 8, 31, 23, 30));
    expect(months.map((p) => p.amount)).toEqual([243_24, 251_97, 244_45, 253_22, 253_85, 229_87, 255_06, 247_46, 256_34, 248_68, 257_60, 258_25]);
    expect(months.map((p) => dateKey(p.at, NY))).toEqual(['2026-09-30', '2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31', '2027-02-28', '2027-03-31', '2027-04-30', '2027-05-31', '2027-06-30', '2027-07-31', '2027-08-31']);
    // The year: 3.00% less a cent's fraction carried, where the 3% run as nominal and credited monthly made $3,041.59.
    expect(months.reduce((n, p) => n + p.amount, 0)).toBe(2_999_99);
    expect(savings.balance).toBe(100_000_00 + 2_999_99);
  }, 300_000);

  it('pays Wells Fargo’s 0.01% APY compounded daily as $1,000.00 a year on $10,000,000: each day’s interest earns from the next', () => {
    const sim = student('b21-yield-wf', 'us-wells-fargo');
    sim.advanceTo(at(2026, 8, 31, 23, 30));
    const savings = mine(sim, 'savings');
    setTo(sim, savings, 10_000_000_00); // TEST SETUP
    setTo(sim, mine(sim, 'checking'), 1_000_000_00); // TEST SETUP
    sim.advanceTo(at(2027, 9, 1, 1));
    // r = 365 × (1.0001^(1/365) − 1) = 0.0099995%, a day's interest on the balance and the interest built since the
    // last credit; paid monthly. A simple 0.01% would make $1,000.04.
    const months = posted(sim, savings, 'Interest: Way2Save Savings').filter((p) => p.at > at(2026, 8, 31, 23, 30));
    expect(months.map((p) => p.amount)).toEqual([82_18, 84_93, 82_19, 84_93, 84_93, 76_71, 84_93, 82_20, 84_93, 82_19, 84_94, 84_94]);
    expect(months.reduce((n, p) => n + p.amount, 0)).toBe(1_000_00);
  }, 300_000);

  it('pays Lloyds’ Easy Saver its 1.00% AER once, a year after it opened, and nothing at a month’s end before it', () => {
    const sim = abroad('uk-eng-london', 'gb-lloyds', 'b21-yield-lloyds');
    const London = 'Europe/London';
    const saver = mine(sim, 'savings', 'gb-lloyds');
    expect(dateKey(saver.openedAt!, London)).toBe('2026-01-05');
    // SLATE: 1221 converted the starting euros at its fixed rate, £36,065; the dated record's rate gives more. Set to
    // 1221's figure (TEST SETUP), so the interest this case checks is checked on the balance it was written for.
    setTo(sim, saver, 36_065_00); // TEST SETUP: the fraction carried set aside
    setTo(sim, mine(sim, 'checking', 'gb-lloyds'), 1_000_000_00); // TEST SETUP: so nothing draws on the savings
    const held = saver.balance;
    expect(held).toBe(36_065_00);
    sim.advanceTo(at(2027, 1, 4, 23, 0, London));
    expect(posted(sim, saver, 'Interest: Easy Saver')).toEqual([]);
    sim.advanceTo(at(2027, 1, 5, 9, 0, London));
    // Credited once a year, so the AER is the rate: 365 day-ends from 5 January 2026 at 1%, £360.65, on 5 January 2027.
    // Britain takes no tax at the bank. Until brief 21 it was paid at each month's end.
    expect(posted(sim, saver, 'Interest: Easy Saver').map((p) => [dateKey(p.at, London), p.amount])).toEqual([['2027-01-05', 360_65]]);
  }, 300_000);

  it('pays Bankinter’s 5% TAE every six months from the opening, at 2 × (1.05^(1/2) − 1) = 4.939% on up to €10,000: €244.92 on 5 July, before Spain’s 19%', () => {
    const sim = abroad('es-md-madrid', 'es-bankinter', 'b21-yield-bankinter');
    const Madrid = 'Europe/Madrid';
    const nomina = mine(sim, 'checking', 'es-bankinter');
    expect(dateKey(nomina.openedAt!, Madrid)).toBe('2026-01-05');
    setTo(sim, nomina, 100_000_00); // TEST SETUP: over the €10,000 it pays on, all year
    sim.advanceTo(at(2026, 7, 4, 23, 0, Madrid));
    expect(posted(sim, nomina, 'Interest: Cuenta Nómina')).toEqual([]);
    sim.advanceTo(at(2026, 7, 5, 9, 0, Madrid));
    // 181 day-ends from 5 January on €10,000 at 4.939%: €244.921, €244.92. Until brief 21, 5% as nominal at each month's
    // end: €247.95 in the half-year.
    const [paid] = posted(sim, nomina, 'Interest: Cuenta Nómina');
    expect(dateKey(paid!.at, Madrid)).toBe('2026-07-05');
    expect(paid!.amount + paid!.tax).toBe(244_92);
    expect(paid!.tax).toBe(Math.round(244_92 * 0.19));
  }, 300_000);

  it('pays AIB’s 0.25% AER in April and October, at 2 × (1.0025^(1/2) − 1) = 0.2498%: €33.06 and €52.92 before DIRT', () => {
    const sim = abroad('ie-lei-dublin', 'ie-aib', 'b21-yield-aib');
    const Dublin = 'Europe/Dublin';
    const saver = mine(sim, 'savings', 'ie-aib');
    setTo(sim, saver, 42_000_00); // TEST SETUP: the fraction carried set aside
    setTo(sim, mine(sim, 'checking', 'ie-aib'), 1_000_000_00); // TEST SETUP
    sim.advanceTo(at(2026, 11, 1, 9, 0, Dublin));
    const paid = posted(sim, saver, 'Interest: Demand Deposit Account');
    expect(paid.map((p) => dateKey(p.at, Dublin))).toEqual(['2026-04-30', '2026-10-31']);
    // April: 115 day-ends from 5 January on €42,000, €33.0615, €33.06, DIRT's 33% kept back. October: 184 day-ends on
    // €42,022.15 with April's net, and April's fraction, €52.9279, €52.92.
    expect(paid.map((p) => p.amount + p.tax)).toEqual([33_06, 52_92]);
    expect(paid[0]!.tax).toBe(Math.round(33_06 * 0.33));
  }, 300_000);

  it('leaves RBC’s 0.55%, which RBC gives as a yearly rate and no yield, as it is: $24.50 for January’s 26 day-ends on $62,543', () => {
    const sim = abroad('ca-on-toronto', 'ca-rbc', 'b21-yield-rbc');
    const Toronto = 'America/Toronto';
    const saver = mine(sim, 'savings', 'ca-rbc');
    // SLATE: 1221's figure, its fixed rate's conversion of the starting euros (TEST SETUP; see the Lloyds case).
    setTo(sim, saver, 62_543_00); // TEST SETUP: the fraction carried set aside
    setTo(sim, mine(sim, 'checking', 'ca-rbc'), 1_000_000_00); // TEST SETUP
    expect(saver.balance).toBe(62_543_00);
    sim.advanceTo(at(2026, 7, 1, 9, 0, Toronto));
    // 0.55% a day at a 365th, monthly: January's 26 day-ends from the 5th, then each month's on the balance with the
    // interest before it. Converted as if it were a yield it would have been $24.44, $26.33 and so on.
    expect(posted(sim, saver, 'Interest: RBC High Interest eSavings').map((p) => p.amount)).toEqual([24_50, 26_40, 29_24, 28_30, 29_27, 28_34]);
  }, 300_000);
});

// ---------------------------------------------------------------------------
// B5. A US card's due date, one day each month
// ---------------------------------------------------------------------------

describe('B5: a US card’s due date is one day each month, at least the bank’s days after the statement', () => {
  it('keeps the bank’s days after a statement on the same day in every month, February the shortest; Citi and Capital One, whose days weren’t found, the 15th, later after a statement past the 22nd', () => {
    // [statement day, the bank's days] → the due day, and whether it's next month. Worked: the day plus its days, less 28
    // where that's past the 28th; with no days found, the 15th, later where under 21 days in February.
    expect([[20, 21], [5, 21], [7, 21], [8, 21], [20, 25], [3, 25], [4, 25]].map(([d, g]) => usDueDay(d!, g))).toEqual([
      { day: 13, next: true }, { day: 26, next: false }, { day: 28, next: false }, { day: 1, next: true },
      { day: 17, next: true }, { day: 28, next: false }, { day: 1, next: true },
    ]);
    expect([20, 5, 22, 23, 28].map((d) => usDueDay(d))).toEqual([15, 15, 15, 16, 21].map((day) => ({ day, next: true })));
    // Every statement day of every month from January 2026 to December 2029, for 21 and 25 days and none: the same day
    // each month, never under 21 days after the statement (22 to 24 for Chase's 13th after the 20th, 21 in February,
    // 22 in a leap year's).
    for (const grace of [21, 25, undefined]) for (let day = 1; day <= 28; day += 1) {
      const dueDays = new Set<number>();
      for (let year = 2026; year <= 2029; year += 1) for (let month = 1; month <= 12; month += 1) {
        const statement = at(year, month, day, 9);
        const due = dueAt(NY, statement, grace, true);
        expect(Math.round((due - statement) / MS_DAY), `${year}-${month}-${day} at ${grace}`).toBeGreaterThanOrEqual(21);
        dueDays.add(Number(dateKey(due, NY).slice(8)));
      }
      expect(dueDays.size, `the ${day}th at ${grace}`).toBe(1);
    }
    expect(dateKey(dueAt(NY, at(2027, 2, 20, 9), 21, true), NY)).toBe('2027-03-13');
    expect(dateKey(dueAt(NY, at(2028, 2, 20, 9), 21, true), NY)).toBe('2028-03-13');
    expect(dateKey(dueAt(NY, at(2026, 12, 20, 9), 21, true), NY)).toBe('2027-01-13');
    // Elsewhere, the statement and its days (no rule asking otherwise was read): 25 days after 20 January and after
    // 20 February fall on different days.
    expect([dateKey(dueAt(NY, at(2027, 1, 20, 9), 25), NY), dateKey(dueAt(NY, at(2027, 2, 20, 9), 25), NY)]).toEqual(['2027-02-14', '2027-03-17']);
  });

  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('takes a Chase card’s autopay on the 13th of every month through February, and on the 26th once its statement day is the 5th', () => {
    const sim = student('b21-due-chase', 'us-chase');
    run(sim, 'bank.set_payments', { everyday: 'credit' });
    run(sim, 'finance.set_autopay', { mode: 'full' });
    const card = cardsOf(sim, sim.player)[0]!;
    sim.advanceTo(at(2027, 3, 21, 9));
    const paidOn = () => posted(sim, card, 'Paid Chase Freedom Unlimited').map((p) => dateKey(p.at, NY));
    expect(paidOn()).toEqual(['2026-10-13', '2026-11-13', '2026-12-13', '2027-01-13', '2027-02-13', '2027-03-13']);
    expect(titled(sim, 'A Late Card Payment')).toEqual([]);
    // Moved to the 5th: its first statement there is due on the 26th of the same month, 21 days on.
    run(sim, 'card.set_statement_day', { day: 5 });
    sim.advanceTo(at(2027, 6, 1, 9));
    const fifth = stateOf(sim.player, card).cuts!.filter((c) => dateKey(c, NY).endsWith('-05'));
    expect(fifth.length).toBeGreaterThan(0);
    for (const cut of fifth) expect(paidOn()).toContain(`${dateKey(cut, NY).slice(0, 8)}26`);
  }, 300_000);
});

// ---------------------------------------------------------------------------
// B2, B3. A US card's minimum more than 60 days late, by days
// ---------------------------------------------------------------------------

/** A Chase card behind: the day's groceries on it, autopay on the whole statement, and the checking moved to savings an hour before each of the due dates it should miss. */
function behind(seed: string) {
  const sim = student(seed, 'us-chase');
  run(sim, 'bank.set_payments', { everyday: 'credit' });
  run(sim, 'finance.set_autopay', { mode: 'full' });
  const id = mineCard(sim);
  const card = () => sim.universe.accounts[id]!;
  return { sim, card };
}
const mineCard = (sim: Simulation) => sim.ledger.accountsOf(sim.player.id).find((a) => a.kind === 'credit_card' && a.bankId === 'us-chase')!.id;
/** To an hour before the due date, the checking moved to savings, then past it: a miss. */
function miss(sim: Simulation, due: Instant): void {
  sim.advanceTo(due - 3_600_000);
  const checking = mine(sim, 'checking');
  if (checking.balance > 0) run(sim, 'bank.transfer', { fromId: checking.id, toId: mine(sim, 'savings').id, amount: checking.balance });
  sim.advanceTo(due + 60_000);
}
const CHASE_DUES = [at(2026, 10, 13), at(2026, 11, 13), at(2026, 12, 13), at(2027, 1, 13), at(2027, 2, 13), at(2027, 3, 13)];

describe('B2 and B3: a US card’s minimum more than 60 days late, counted in days from its due date', () => {
  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('notices on the 61st day, not the 60th; the penalty rate 45 days on; the default notice on the 150th; the charge-off on the 180th, not the 179th', () => {
    const { sim, card } = behind('b21-late-days');
    miss(sim, CHASE_DUES[0]!);
    // 13 October's $40 minimum unpaid: the next statement's minimum payment due takes it in, and says so.
    sim.advanceTo(at(2026, 10, 20, 10));
    const statement = titled(sim, 'Statement Ready: Chase Freedom Unlimited').at(-1)!.body;
    expect(statement).toMatch(/The minimum payment is \$[\d,]+\.\d\d, \$40\.00 of it past due\./);
    miss(sim, CHASE_DUES[1]!);
    expect(stateOf(sim.player, card()).missed).toBe(2);
    // 13 October's minimum: day 60 is 12 December, day 61 the 13th.
    sim.advanceTo(at(2026, 12, 12, 23));
    expect(titled(sim, 'A Penalty Rate Is Coming')).toEqual([]);
    miss(sim, CHASE_DUES[2]!);
    expect(titled(sim, 'A Penalty Rate Is Coming').map((n) => dateKey(n.at, NY))).toEqual(['2026-12-13']);
    // In force 45 days after the notice, 27 January: not on the 26th.
    miss(sim, CHASE_DUES[3]!);
    sim.advanceTo(at(2027, 1, 26, 23));
    expect(cardTerms(sim, card(), sim.player.credit!.score).penaltyInForce).toBe(false);
    sim.advanceTo(at(2027, 1, 27, 1));
    expect(cardTerms(sim, card(), sim.player.credit!.score).penaltyInForce).toBe(true);
    for (const due of CHASE_DUES.slice(4)) miss(sim, due);
    // Day 150, 12 March: not on the 11th.
    expect(titled(sim, 'A Default Notice').map((n) => dateKey(n.at, NY))).toEqual(['2027-03-12']);
    // Day 180, 11 April: not on the 10th. What it owed goes to collections, and the card closes.
    sim.advanceTo(at(2027, 4, 10, 23));
    expect(card().closedAt).toBeUndefined();
    const owing = -card().balance;
    sim.advanceTo(at(2027, 4, 11, 1));
    expect(card().closedAt).toBeDefined();
    expect(titled(sim, 'Your Card Was Charged Off').map((n) => dateKey(n.at, NY))).toEqual(['2027-04-11']);
    const collections = sim.ledger.accountsOf(sim.player.id).find((a) => a.category === 'collections')!;
    expect(-collections.balance).toBe(owing);
  }, 300_000);

  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('sends nothing to a twin who misses 13 October and pays the whole statement at 13 November: no notice, no penalty, missed back to none', () => {
    const { sim, card } = behind('b21-late-days');
    miss(sim, CHASE_DUES[0]!);
    expect(stateOf(sim.player, card()).pastDue?.map((p) => dateKey(p.at, NY))).toEqual(['2026-10-13']);
    // The money moved back the day before the next due date, as the player moves it: autopay takes the whole statement.
    sim.advanceTo(at(2026, 11, 12, 12));
    run(sim, 'bank.transfer', { fromId: mine(sim, 'savings').id, toId: mine(sim, 'checking').id, amount: mine(sim, 'savings').balance });
    sim.advanceTo(at(2027, 2, 1, 9));
    expect(stateOf(sim.player, card()).missed).toBe(0);
    expect(stateOf(sim.player, card()).pastDue).toBeUndefined();
    expect(titled(sim, 'A Penalty Rate Is Coming')).toEqual([]);
    expect(stateOf(sim.player, card()).penalty).toBeUndefined();
  }, 300_000);

  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('counts from the oldest minimum still short: 13 October’s paid by hand on 12 December, day 60, leaves 13 November’s, noticed on 13 January', () => {
    const { sim, card } = behind('b21-late-days');
    for (const due of CHASE_DUES.slice(0, 2)) miss(sim, due);
    const [oldest] = stateOf(sim.player, card()).pastDue!;
    sim.advanceTo(at(2026, 12, 12, 9));
    setTo(sim, mine(sim, 'checking'), mine(sim, 'checking').balance + oldest!.short); // TEST SETUP: the means to pay it
    run(sim, 'finance.pay_card', { amount: oldest!.short });
    expect(stateOf(sim.player, card()).pastDue!.map((p) => dateKey(p.at, NY))).toEqual(['2026-11-13']);
    miss(sim, CHASE_DUES[2]!);
    sim.advanceTo(at(2026, 12, 14, 9));
    // 13 December's own minimum is short too: what was paid on the 12th went to 13 October's and counts once
    // (`towardPastDue`). Counted again toward December's, that minimum read as paid and one fewer was past due: the defect
    // this test found, and mutation B21-B12, which the notice's date alone couldn't tell (13 November's is the oldest either way).
    expect(stateOf(sim.player, card()).pastDue!.map((p) => dateKey(p.at, NY))).toEqual(['2026-11-13', '2026-12-13']);
    expect(titled(sim, 'A Penalty Rate Is Coming')).toEqual([]);
    miss(sim, CHASE_DUES[3]!);
    sim.advanceTo(at(2027, 1, 14, 9));
    // 13 November plus 61 days.
    expect(titled(sim, 'A Penalty Rate Is Coming').map((n) => dateKey(n.at, NY))).toEqual(['2027-01-13']);
  }, 300_000);

  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('comes to the same days and the same balance played a day at a time, jumped from due date to due date, and saved and loaded between', () => {
    const lives = ['steps', 'jumps', 'reloaded'].map(() => behind('b21-late-jump'));
    for (const { sim } of lives) for (const due of CHASE_DUES.slice(0, 2)) miss(sim, due);
    const [steps, jumps] = lives as [ReturnType<typeof behind>, ReturnType<typeof behind>, ReturnType<typeof behind>];
    let reloaded = lives[2]!.sim;
    const end = at(2027, 4, 20, 9);
    // A day at a time, the due dates missed as they come.
    for (let now = steps.sim.now + MS_DAY; now <= end; now += MS_DAY) {
      const due = CHASE_DUES.find((d) => d > now - MS_DAY && d <= now);
      if (due) miss(steps.sim, due); else steps.sim.advanceTo(now);
    }
    steps.sim.advanceTo(end);
    for (const due of CHASE_DUES.slice(2)) miss(jumps.sim, due);
    jumps.sim.advanceTo(end);
    for (const due of CHASE_DUES.slice(2)) { miss(reloaded, due); reloaded = reload(reloaded); }
    reloaded.advanceTo(end);
    const read = (sim: Simulation) => ({
      notices: ['A Penalty Rate Is Coming', 'A Default Notice', 'Your Card Was Charged Off'].map((t) => titled(sim, t).map((n) => dateKey(n.at, NY))),
      owed: -sim.ledger.accountsOf(sim.player.id).find((a) => a.category === 'collections')!.balance,
    });
    expect(read(steps.sim)).toEqual({ notices: [['2026-12-13'], ['2027-03-12'], ['2027-04-11']], owed: read(jumps.sim).owed });
    expect(read(jumps.sim)).toEqual(read(steps.sim));
    expect(read(reloaded)).toEqual(read(steps.sim));
  }, 600_000);

  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('counts the leap day: a minimum due 13 November 2026 is charged off on 12 May 2027, one due 13 November 2027 on 11 May 2028', () => {
    const offOn = (startYear: number) => {
      const sim = abroad('us-ny-newyork', 'us-chase', 'b21-late-leap', { startYear, startMonth: 10, startDay: 1 });
      run(sim, 'bank.set_payments', { everyday: 'credit' });
      run(sim, 'finance.set_autopay', { mode: 'full' });
      const card = sim.ledger.accountsOf(sim.player.id).find((a) => a.kind === 'credit_card' && a.bankId === 'us-chase')!;
      sim.advanceTo(at(startYear, 10, 21, 9));
      expect(stateOf(sim.player, card).statementBalance).toBeGreaterThan(0);
      for (let k = 0; k < 7; k += 1) {
        const due = at(startYear + Math.floor((10 + k) / 12), ((10 + k) % 12) + 1, 13);
        if (card.closedAt) break;
        miss(sim, due);
      }
      sim.advanceTo(at(startYear + 1, 5, 20, 9));
      expect(stateOf(sim.player, card).pastDue).toBeUndefined();
      return titled(sim, 'Your Card Was Charged Off').map((n) => dateKey(n.at, NY));
    };
    expect(offOn(2026)).toEqual(['2027-05-12']);
    expect(offOn(2027)).toEqual(['2028-05-11']);
  }, 600_000);

  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('leaves a card outside the US as it was: a Barclaycard three due dates behind has no days past due kept and no 61st-day notice', () => {
    const sim = abroad('uk-eng-london', 'gb-barclays', 'b21-late-uk');
    run(sim, 'bank.set_payments', { everyday: 'credit' });
    const card = sim.ledger.accountsOf(sim.player.id).find((a) => a.kind === 'credit_card')!;
    const London = 'Europe/London';
    for (let k = 0; k < 4; k += 1) {
      const due = sim.universe.scheduled.filter((i) => i.status === 'pending' && i.kind === 'card.due').sort((a, b) => a.at - b.at)[0];
      if (!due) { sim.advanceTo(sim.now + 10 * MS_DAY); continue; }
      sim.advanceTo(due.at - 3_600_000);
      const checking = mine(sim, 'checking');
      if (checking.balance > 0) run(sim, 'bank.transfer', { fromId: checking.id, toId: mine(sim, 'savings').id, amount: checking.balance });
      sim.advanceTo(due.at + 60_000);
    }
    sim.advanceTo(at(2026, 6, 1, 9, 0, London));
    expect(stateOf(sim.player, card).missed ?? 0).toBeGreaterThanOrEqual(2);
    expect(stateOf(sim.player, card).pastDue).toBeUndefined();
    expect(titled(sim, 'A Penalty Rate Is Coming')).toEqual([]);
    expect(titled(sim, 'A Default Notice')).toEqual([]);
  }, 300_000);
});

// ---------------------------------------------------------------------------
// B6. A standing order on a weekend or a bank holiday
// ---------------------------------------------------------------------------

describe('B6: a standing order on a day that isn’t a business day', () => {
  it('is made on the next business day from a British bank, Good Friday and Easter Monday and May’s bank holiday passed over, and on its own day the month after', () => {
    const sim = abroad('uk-eng-london', 'gb-barclays', 'b21-order-uk');
    const London = 'Europe/London';
    setTo(sim, mine(sim, 'checking'), 100_000_00); // TEST SETUP: enough for each month's order
    run(sim, 'bank.add_standing_order', { toId: mine(sim, 'savings').id, amount: 100_00, day: 3 });
    sim.advanceTo(at(2026, 6, 10, 9, 0, London));
    const made = sim.universe.transactions.filter((t) => t.memo.startsWith('Standing order')).map((t) => dateKey(t.at, London));
    // 3 February and 3 March are Tuesdays; 3 April is Good Friday and the 6th Easter Monday, so Tuesday the 7th; 3 May a
    // Sunday and the 4th the Early May bank holiday, so Tuesday the 5th; 3 June a Wednesday. Until brief 21 each went on
    // the 3rd.
    expect(made).toEqual(['2026-02-03', '2026-03-03', '2026-04-07', '2026-05-05', '2026-06-03']);
  }, 300_000);

  it('is made on its day from a US bank, a Saturday included: no rule moving it was read, so that’s an assumption', () => {
    const sim = student('b21-order-us', 'us-chase');
    run(sim, 'bank.add_standing_order', { toId: mine(sim, 'savings').id, amount: 10_00, day: 3 });
    sim.advanceTo(at(2026, 11, 10));
    const made = sim.universe.transactions.filter((t) => t.memo.startsWith('Standing order')).map((t) => dateKey(t.at, NY));
    // 3 October 2026 is a Saturday.
    expect(made).toEqual(['2026-09-03', '2026-10-03', '2026-11-03']);
  }, 300_000);
});

// ---------------------------------------------------------------------------
// S. A save from before brief 21
// ---------------------------------------------------------------------------

describe('S: a save from before brief 21 with a US card behind', () => {
  // Not ported: it depends on 1221's daily food spending on the card, which SLATE doesn't have: the day's groceries
  // are what make the statements, minimums and late payments it reads.
  it.skip('is dated on opening from its last late fee and its count, says so once, posts and charges nothing, and charges off 180 days from the first miss', () => {
    const { sim, card } = behind('b21-old-save');
    for (const due of CHASE_DUES.slice(0, 2)) miss(sim, due);
    // TEST SETUP: what a save written before 2026-10-22 held at the second miss: no due dates kept, only the count and the
    // last late fee's time; the penalty rate noticed and the introductory rate ended by the old rule.
    const state = stateOf(sim.player, card()) as unknown as Record<string, unknown>;
    for (const k of ['pastDue', 'noticedFor', 'introEndsAt', 'defaultNoticedFor']) delete state[k];
    state.penalty = { noticeAt: CHASE_DUES[1]! + 60_000, from: CHASE_DUES[1]! + 60_000 + 45 * MS_DAY, onTime: 0 };
    state.introLost = true;
    const text = serialise(sim.universe);
    const universe = deserialise(text) as never as Parameters<typeof migrate>[0];
    const [transactions, notifications] = [universe.transactions.length, universe.notifications.length];
    const result = migrate(universe);
    expect(result.steps).toContain('Counted the days past due on 1 US card behind on its payments, from the first due date missed.');
    expect([universe.transactions.length, universe.notifications.length]).toEqual([transactions, notifications]);
    const opened = loadSave(universe);
    const kept = stateOf(opened.player, opened.universe.accounts[mineCard(opened)]!);
    // The second miss's late fee, 13 November at noon, less a month: 13 October, all of the last statement short.
    expect(kept.pastDue).toEqual([{ at: CHASE_DUES[0], short: kept.statementBalance }]);
    expect(kept.noticedFor).toBe(CHASE_DUES[0]);
    // Opened again: nothing more to do.
    expect(migrate(deserialise(serialise(opened.universe)) as never).steps.filter((s) => s.startsWith('Counted the days past due'))).toEqual([]);
    // Played on: no second penalty notice, the old rule's penalty stands, and the charge-off on 11 April 2027.
    for (const due of CHASE_DUES.slice(2)) miss(opened, due);
    opened.advanceTo(at(2027, 4, 12, 9));
    expect(titled(opened, 'A Penalty Rate Is Coming')).toHaveLength(titled(sim, 'A Penalty Rate Is Coming').length);
    expect(titled(opened, 'Your Card Was Charged Off').map((n) => dateKey(n.at, NY))).toEqual(['2027-04-11']);
  }, 300_000);
});

// 1221's tutorial and guide text about the card's days isn't ported (tutorial gating and 1221's reference are excluded).
