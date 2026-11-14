/**
 * Statements, the year, and alerts (`systems/statements.ts`), and Germany's
 * quarterly closing (`closesQuarterly` in `systems/banking.ts`). Module 1 of
 * `docs/BANKING-FUNCTIONS.md`. Until 2026-09-26 no screen showed a single
 * transaction.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY, instantFromZoned, zonedParts } from '../../src/engine/bankworld/core/time';
import {
  accountStatement, activity, apyOf, cardStatement, payingTheMinimum, periodsOf, yearSummary,
} from '../../src/engine/bankworld/systems/statements';
import { cardOf, cardTerms } from '../../src/engine/bankworld/systems/credit';

const lifeIn = (cityId: string, extra: Record<string, unknown> = {}, seed = 'st') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, ...extra }, seed);
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const give = (sim: Simulation, amount: number) => sim.post({
  memo: 'test', category: 'test',
  postings: [{ accountId: current(sim).id, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }],
});

describe('an account’s entries', () => {
  // Not ported: it depends on 1221's daily food spending, which SLATE doesn't have: the day's purchases are what made the lines, the balance changes and the remainders it reads.
  it.skip('open at the balance before them, and each carries the balance after it, to the balance now', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'st-running');
    sim.advanceBy(45 * MS_DAY);
    const account = current(sim);
    const { opening, closing, lines } = activity(sim, account, sim.now - 40 * MS_DAY, sim.now + 1);
    expect(lines.length).toBeGreaterThan(10);
    expect(closing).toBe(account.balance);
    expect(opening + lines.reduce((s, l) => s + l.amount, 0)).toBe(closing);
    expect(lines.at(-1)!.balance).toBe(account.balance);
    for (let i = 1; i < lines.length; i += 1) expect(lines[i]!.balance).toBe(lines[i - 1]!.balance + lines[i]!.amount);
  });

  it('close a past period where the next one opens', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'st-close');
    sim.advanceBy(75 * MS_DAY);
    const [now, last, before] = periodsOf(sim, current(sim));
    const a = accountStatement(sim, current(sim), before!);
    const b = accountStatement(sim, current(sim), last!);
    const c = accountStatement(sim, current(sim), now!);
    expect(a.closing).toBe(b.opening);
    expect(b.closing).toBe(c.opening);
    expect(b.opening + b.moneyIn - b.moneyOut).toBe(b.closing);
    expect(c.closing).toBe(current(sim).balance);
  });
});

describe('the periods', () => {
  it('run by calendar month for an account, the current one so far, back to when it opened', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'st-periods');
    sim.advanceBy(70 * MS_DAY);
    const periods = periodsOf(sim, current(sim));
    expect(periods[0]!.label).toMatch(/So Far$/);
    expect(periods[0]!.from).toBeLessThanOrEqual(sim.now);
    expect(periods.at(-1)!.from).toBeLessThanOrEqual(current(sim).openedAt);
    for (let i = 1; i < periods.length; i += 1) expect(periods[i]!.to).toBe(periods[i - 1]!.from);
  });

  it('run from the 20th to the 20th for the card, as its statements do', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'st-card-periods');
    sim.advanceBy(50 * MS_DAY);
    const periods = periodsOf(sim, cardOf(sim, sim.player)!);
    for (const p of periods.slice(0, 3)) {
      expect(zonedParts(p.to, sim.zone).day).toBe(20);
      expect(zonedParts(p.from, sim.zone).day).toBe(20);
    }
    expect(periods[0]!.to).toBeGreaterThan(sim.now);
    expect(periods[1]!.to).toBeLessThanOrEqual(sim.now);
  });

  it('run a quarter in Germany, whose banks close an account each quarter', () => {
    const sim = lifeIn('de-be-berlin', { bankId: 'de-deutsche-bank' }, 'st-de-periods');
    const [first] = periodsOf(sim, current(sim));
    const from = zonedParts(first!.from, sim.zone);
    expect(from.month % 3).toBe(1);
    expect(first!.label).toMatch(/^January To March/);
  });
});

describe('Germany’s quarterly closing', () => {
  it('charges the quarter’s fees in one at the end of March, not month by month', () => {
    const sim = lifeIn('de-be-berlin', { bankId: 'de-deutsche-bank', wealth: 'comfortable' }, 'st-de-fees');
    const fees = () => sim.universe.transactions.filter((t) => t.category === 'bank_fee' && t.memo.includes('AktivKonto'));
    sim.advanceTo(instantFromZoned({ year: 2026, month: 3, day: 15, hour: 12 }, sim.zone));
    expect(fees()).toHaveLength(0);
    // The AktivKonto opened on 5 January, and Deutsche Bank's price list leaves the month it opens free: February's €6.90
    // kept, and at the closing February's and March's. Until 2026-10-16, when that was read, January's was charged too,
    // and these were 2 × €6.90 and 3 × €6.90.
    expect(current(sim).feesDue).toBe(6_90);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 4, day: 2, hour: 12 }, sim.zone));
    expect(fees()).toHaveLength(1);
    expect(fees()[0]!.memo).toMatch(/^Quarterly closing/);
    expect(-fees()[0]!.postings.find((p) => p.accountId === current(sim).id)!.amount).toBe(2 * 6_90);
    expect(current(sim).feesDue).toBe(0);
    expect(sim.ledger.audit()).toEqual([]);
  });

  it('pays the quarter’s interest at the closing, and none in the months before it', () => {
    const sim = lifeIn('de-be-berlin', { bankId: 'de-deutsche-bank', wealth: 'comfortable' }, 'st-de-interest');
    const savings = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.kind === 'savings')!;
    const paid = () => sim.universe.transactions.filter((t) => t.category === 'interest' && t.postings.some((p) => p.accountId === savings.id));
    sim.advanceTo(instantFromZoned({ year: 2026, month: 3, day: 15, hour: 12 }, sim.zone));
    expect(paid()).toHaveLength(0);
    expect(savings.accrued ?? 0).toBeGreaterThan(0);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 4, day: 2, hour: 12 }, sim.zone));
    expect(paid()).toHaveLength(1);
  });

  it('leaves everywhere else charging each month', () => {
    const sim = lifeIn('is-39-mosfellsbr', { bankId: 'is-arion', wealth: 'comfortable' }, 'st-monthly');
    sim.advanceTo(instantFromZoned({ year: 2026, month: 3, day: 15, hour: 12 }, sim.zone));
    expect(current(sim).feesDue ?? 0).toBe(0);
  });
});

describe('an account’s statement', () => {
  it('adds up what came in and went out, and counts interest after tax and the fees', () => {
    const sim = lifeIn('de-be-berlin', { bankId: 'de-deutsche-bank', wealth: 'comfortable' }, 'st-sum');
    sim.advanceTo(instantFromZoned({ year: 2026, month: 4, day: 2, hour: 12 }, sim.zone));
    const quarter = periodsOf(sim, current(sim))[1]!;
    const st = accountStatement(sim, current(sim), quarter);
    expect(st.opening + st.moneyIn - st.moneyOut).toBe(st.closing);
    // February's and March's: January, the month the AktivKonto opened, is free by Deutsche Bank's price list (from
    // 2026-10-16; until then 3 × €6.90).
    expect(st.fees).toBe(2 * 6_90);
  });
});

describe('the card’s statement', () => {
  it('brings the balance forward, takes payments off, and asks the minimum with the warning', () => {
    const sim = lifeIn('us-ny-newyork', { wealth: 'scraping', bankId: 'us-chase' }, 'st-card');
    sim.advanceBy(40 * MS_DAY);
    const card = cardOf(sim, sim.player)!;
    const closed = periodsOf(sim, card).find((p) => p.to <= sim.now)!;
    const st = cardStatement(sim, card, closed);
    expect(st.previous + st.spending + st.fees + st.interest - st.payments).toBe(st.newBalance);
    expect(st.newBalance).toBeGreaterThan(0);
    expect(st.minimum).toBeGreaterThan(0);
    expect(st.minimumOnly).not.toBeUndefined();
  });

  it('works out paying only the minimum by the card’s own terms, and says never where the minimum doesn’t cover the interest', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'st-min');
    const card = cardOf(sim, sim.player)!;
    // Past its introductory rate.
    card.openedAt -= 2 * 365 * MS_DAY;
    const terms = cardTerms(sim, card, 700);
    const paid = payingTheMinimum(sim, 5_000_00, terms);
    expect(paid).not.toBe('never');
    if (paid === 'never') return;
    expect(paid.months).toBeGreaterThan(36);
    expect(paid.total).toBeGreaterThan(5_000_00);
    const r = terms.apr / 12;
    expect(paid.threeYears).toBe(Math.ceil(5_000_00 * r / (1 - (1 + r) ** -36)));
    expect(payingTheMinimum(sim, 5_000_00, { ...terms, minimumShare: 0.01, minimumPlusInterest: false, minimumFloor: 0, apr: 0.3 })).toBe('never');
  });
});

describe('the year', () => {
  it('counts a term deposit’s interest, not the deposit paid back beside it, and the tax taken', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'st-year');
    sim.advanceBy(70 * MS_DAY);
    const y = yearSummary(sim, sim.player.id, 2026);
    expect(y.interestEarned).toBeGreaterThan(0);
    // Iceland's banks take 22% of interest.
    expect(y.taxTaken).toBeGreaterThan(0);
    expect(y.taxTaken).toBeLessThanOrEqual(Math.ceil(y.interestEarned * 0.22) + 1);
    const lines = sim.universe.transactions.filter((t) => t.category === 'interest');
    const credited = lines.reduce((s, t) => s + t.postings.filter((p) => sim.universe.accounts[p.accountId]?.ownerId === sim.player.id && sim.universe.accounts[p.accountId]?.kind !== 'credit_card').reduce((a, p) => a + p.amount, 0), 0);
    expect(y.interestEarned - y.taxTaken).toBe(credited);
  });
});

describe('alerts', () => {
  // Not ported: it depends on 1221's daily food spending, which SLATE doesn't have: the day's purchases are what made the lines, the balance changes and the remainders it reads.
  it.skip('tell once when the current account ends a day under the line, and again only after it’s back over', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'st-low');
    const answer = sim.execute({ kind: 'bank.set_alerts', payload: { lowBalance: current(sim).balance + 1_000_00 } });
    expect(answer.ok, answer.error).toBe(true);
    const lows = () => sim.universe.notifications.filter((n) => n.title.startsWith('Low Balance')).length;
    sim.advanceBy(3 * MS_DAY);
    expect(lows()).toBe(1);
    // Still under: no second alert.
    sim.advanceBy(2 * MS_DAY);
    expect(lows()).toBe(1);
    // Back over the line for a day, then under again: a second.
    give(sim, 10_000_000_00);
    sim.advanceBy(2 * MS_DAY);
    give(sim, -10_000_000_00);
    sim.advanceBy(2 * MS_DAY);
    expect(lows()).toBe(2);
  });

  it('tell when a statement is ready, and stop when turned off', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'st-ready');
    // Off by default since 2026-09-28, but for a statement with a payment due.
    sim.execute({ kind: 'bank.set_alerts', payload: { statements: true } });
    sim.advanceBy(35 * MS_DAY);
    const ready = () => sim.universe.notifications.filter((n) => n.title.startsWith('Statement Ready')).length;
    const before = ready();
    expect(before).toBeGreaterThan(0);
    // On, a statement with nothing to pay tells them too: what turning it off stops.
    const quiet = (from: number) => sim.universe.notifications.slice(from).filter((n) => n.title.startsWith('Statement Ready') && !/^The statement comes to /.test(n.body)).length;
    expect(quiet(0)).toBeGreaterThan(0);
    sim.execute({ kind: 'bank.set_alerts', payload: { statements: false } });
    const notices = sim.universe.notifications.length;
    sim.advanceBy(35 * MS_DAY);
    // Off, only a statement with a payment due still tells them.
    // Until 2026-10-13 this also held that the count hadn’t fallen, which no count can.
    expect(quiet(notices)).toBe(0);
  });

  it('refuses a line that isn’t an amount', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'st-bad');
    expect(sim.execute({ kind: 'bank.set_alerts', payload: { lowBalance: -5 } }).ok).toBe(false);
  });
});

describe('the rate and the screen', () => {
  it('gives the APY of a rate credited monthly', () => {
    expect(apyOf(0.12)).toBeCloseTo(0.126825, 6);
    expect(apyOf(0.05, 1)).toBeCloseTo(0.05, 10);
  });

  it('puts statements, the year and alerts on the bank’s screen', () => {
    const screen = readFileSync('src/ui/bankworld/ui/workspaces/BankWorkspace.tsx', 'utf8');
    const statements = readFileSync('src/ui/bankworld/ui/bank/BankStatements.tsx', 'utf8');
    expect(screen).toContain('<BankStatements />');
    expect(statements).toContain('feature="bank.set_alerts"');
  });
});
