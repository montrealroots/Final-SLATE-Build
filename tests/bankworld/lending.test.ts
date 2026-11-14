/**
 * What the bank lends and holds, the way each bank does it.
 *
 * Each claim in `systems/lending.ts` against the researched terms in
 * `content/banks-lending.ts`: Chase's fee by the item, capped by the day and
 * spared under its grace; an arranged overdraft's interest past its free
 * buffer, charged on the first, its limit and the rate a record earns;
 * CommBank's midnight fee; MUFG's loan against time deposits; a personal
 * loan paid down month by month, missed onto the record, and paid off; a
 * term deposit locked and paid out; and a switch, the same day or through
 * Britain's seven working days.
 */

import { quickSave } from '../../src/engine/bankworld';
import type { Account } from '../../src/engine/bankworld/core/ledger';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY,instantFromZoned } from '../../src/engine/bankworld/core/time';
import { bankAccountsOf,bankOf } from '../../src/engine/bankworld/systems/banking';
import {
LOAN_DUE_KIND,SWITCH_KIND,closeForOverdraft,collectionsOf,loanOf,monthlyPayment,overdraftHeadroom,overdraftOffer,overdraftRoom,rateForRecord,termsOf
} from '../../src/engine/bankworld/systems/lending';
import { spend } from '../../src/engine/bankworld/systems/spending';
import { describe,expect,it } from 'vitest';

const lifeIn = (cityId: string, extra: Record<string, unknown> = {}, seed = 'lend') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, ...extra }, seed);
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const savings = (sim: Simulation) => bankAccountsOf(sim, sim.player).find((a) => a.kind === 'savings');

function set(sim: Simulation, account: Account | undefined, amount: number): void {
  if (!account) return;
  const diff = amount - account.balance;
  if (diff !== 0) {
    sim.post({ memo: 'Test', category: 'test', postings: [{ accountId: account.id, amount: diff }, { accountId: sim.nominalAccount('equity', 'Test').id, amount: -diff }] });
  }
}
function wages(sim: Simulation, amount: number): void {
  sim.post({ memo: 'Wages', category: 'salary', postings: [{ accountId: current(sim).id, amount }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -amount }] });
}
const feesOn = (sim: Simulation, account: Account, memo: string) => sim.universe.transactions
  .filter((t) => t.memo.startsWith(memo)).flatMap((t) => t.postings).filter((p) => p.accountId === account.id).map((p) => p.amount);

describe('an account left overdrawn', () => {

  it('sets off only what savings there needs to give, and charges off the rest', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'modest' });
    set(sim, current(sim), -400_00);
    set(sim, savings(sim), 100_00);
    closeForOverdraft(sim, sim.player, bankOf(sim, sim.player)!);
    expect(-collectionsOf(sim, sim.player)!.balance).toBe(300_00);
  });
});

describe('an overdraft by the item', () => {

  it('won’t pay a debit card purchase into an overdraft unless the person opted in (Regulation E)', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'modest' });
    set(sim, current(sim), 0);
    set(sim, savings(sim), 0);
    // Not opted in: the card takes the groceries, and the account stays at zero.
    expect(spend(sim, sim.player, 60_00, 'Groceries', 'food')).toBe(true);
    expect(current(sim).balance).toBe(0);
    // Opted in: the bank pays it below zero.
    sim.must({ kind: 'bank.debit_overdraft', payload: { on: true } });
    spend(sim, sim.player, 60_00, 'Groceries', 'food');
    expect(current(sim).balance).toBe(-60_00);
    // A bill goes into the overdraft either way.
    sim.must({ kind: 'bank.debit_overdraft', payload: { on: false } });
    spend(sim, sim.player, 40_00, 'Electric', 'bills');
    expect(current(sim).balance).toBe(-100_00);
  });

  it('declines a debit card purchase with no card to take it, rather than owing it to the landlord', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'nothing' });
    set(sim, current(sim), 0);
    set(sim, savings(sim), 0);
    expect(spend(sim, sim.player, 60_00, 'Groceries', 'food')).toBe(false);
    expect(current(sim).balance).toBe(0);
    expect(sim.universe.transactions.some((t) => t.memo === 'Groceries')).toBe(false);
  });

  it('never pays a Bank of America debit card purchase into an overdraft, and charges no fee for one the card took', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-bank-of-america', wealth: 'modest' });
    set(sim, savings(sim), 0);
    set(sim, current(sim), -20_00);
    expect(sim.execute({ kind: 'bank.debit_overdraft', payload: { on: true } }).ok).toBe(false);
    spend(sim, sim.player, 60_00, 'Groceries', 'food');
    expect(current(sim).balance).toBe(-20_00);
    expect(feesOn(sim, current(sim), 'Overdraft fee')).toEqual([]);
  });

  it('covers only so far, then the card takes it', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'scraping' });
    set(sim, current(sim), 0);
    set(sim, savings(sim), 0);
    expect(overdraftRoom(sim, sim.player)).toBe(500_00);
    spend(sim, sim.player, 700_00, 'Test', 'bills');
    expect(current(sim).balance).toBeGreaterThanOrEqual(-500_00 - 34_00 * 3);
    expect(overdraftHeadroom(sim, sim.player)).toBe(0);
  });
});

describe('an arranged overdraft', () => {
  it('is refused without wages paid in, and arranged up to a month of them', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays' });
    expect('refused' in overdraftOffer(sim, sim.player)).toBe(true);
    wages(sim, 2_000_00);
    const offer = overdraftOffer(sim, sim.player);
    expect(offer).toEqual({ min: 1_00, max: 2_000_00, rate: 0.35 });
    expect(sim.execute({ kind: 'bank.arrange_overdraft', payload: { limit: 2_500_00 } }).ok).toBe(false);
    expect(sim.execute({ kind: 'bank.arrange_overdraft', payload: { limit: 1_000_00 } }).ok).toBe(true);
    expect(overdraftRoom(sim, sim.player)).toBe(1_000_00);
  });

  it('charges interest past Barclays’ free £15, on the first of the month', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays' });
    wages(sim, 2_000_00);
    sim.must({ kind: 'bank.arrange_overdraft', payload: { limit: 1_000_00 } });
    const zone = sim.homeZone;
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 20, hour: 12 }, zone));
    set(sim, current(sim), -415_00);
    set(sim, savings(sim), 0);
    const account = current(sim);
    account.odAccrued = 0;
    // The rollovers of the 21st to the 31st: 11 days on £400.
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 31, hour: 12 }, zone));
    const built = account.odAccrued ?? 0;
    expect(built).toBeGreaterThan(0);
    // No spending moves it in these days by more than the day's food, so the
    // interest is about £400 × 35% / 365 a day.
    expect(built / 11).toBeLessThan((1_000_00 * 0.35) / 365);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, zone));
    expect(feesOn(sim, account, 'Overdraft interest').length).toBe(1);
  });

  it('prices by the record where the bank does: Lloyds, 19.9% to 49.9%', () => {
    expect(rateForRecord(0.199, 0.499, 780)).toBe(0.199);
    expect(rateForRecord(0.199, 0.499, 580)).toBe(0.499);
    expect(rateForRecord(0.199, 0.499, 680)).toBe(0.349);
    expect(rateForRecord(0.35, undefined, 600)).toBe(0.35);
  });

  it('charges TD’s $5 a month and an Irish bank’s yearly fee on arranging', () => {
    const td = lifeIn('ca-on-toronto', { bankId: 'ca-td' });
    wages(td, 3_000_00);
    td.must({ kind: 'bank.arrange_overdraft', payload: { limit: 1_000_00 } });
    td.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 1, hour: 6 }, td.homeZone));
    expect(feesOn(td, current(td), 'Overdraft fee')).toEqual([-5_00]);
    const ie = lifeIn('ie-lei-dublin', { bankId: 'ie-bank-of-ireland' });
    wages(ie, 3_000_00);
    ie.must({ kind: 'bank.arrange_overdraft', payload: { limit: 1_000_00 } });
    expect(feesOn(ie, current(ie), 'Overdraft facility fee')).toEqual([-30_00]);
  });

  it('lends MUFG’s way: against time deposits, 90% up to ¥2 million', () => {
    const sim = lifeIn('jp-13-tokyo', { bankId: 'jp-mufg', wealth: 'wealthy' });
    expect(overdraftRoom(sim, sim.player)).toBe(0);
    sim.must({ kind: 'bank.open_term', payload: { amount: 1_000_000_00 } });
    expect(overdraftRoom(sim, sim.player)).toBe(900_000_00);
    sim.must({ kind: 'bank.open_term', payload: { amount: 2_000_000_00 } });
    expect(overdraftRoom(sim, sim.player)).toBe(2_000_000_00);
  });
});

describe('a personal loan', () => {
  it('is priced by the record, paid down monthly, and closed when it’s paid', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-citi', wealth: 'comfortable' });
    wages(sim, 4_000_00);
    // Savings behind the current account: a loan payment reaches savings only where it's linked (`drawFromBank`).
    sim.player.payments = { ...(sim.player.payments ?? {}), linkSavings: true } as typeof sim.player.payments;
    const answer = sim.must<{ apr: number; payment: number }>({ kind: 'bank.borrow', payload: { amount: 3_000_00, months: 12 } });
    const score = sim.player.credit!.score;
    expect(answer.apr).toBe(rateForRecord(0.1024, 0.1849, score));
    expect(answer.payment).toBe(monthlyPayment(3_000_00, answer.apr, 12));
    const loan = loanOf(sim, sim.player)!;
    expect(loan.balance).toBe(-3_000_00);
    // A payment a little under what clears it, as rounding can leave one: the term's last payment takes the rest.
    loan.loanPayment = (loan.loanPayment ?? 0) - 1_00;
    const interestPaid = () => sim.universe.transactions.filter((t) => t.category === 'loan_interest')
      .flatMap((t) => t.postings).filter((p) => p.accountId === loan.id).reduce((sum, p) => sum - p.amount, 0);
    sim.advanceBy(40 * MS_DAY);
    expect(loan.balance).toBeGreaterThan(-3_000_00);
    sim.advanceBy(340 * MS_DAY);
    expect(loan.closedAt).toBeDefined();
    expect(loan.balance).toBe(0);
    // The term's last payment clears what the months rounded, so it closes with its twelfth, not a thirteenth for the pennies.
    expect(loan.closedAt! - loan.openedAt).toBeLessThan(12 * 30.44 * MS_DAY + 10 * MS_DAY);
    // The interest is what twelve equal payments carry over the principal,
    // within the pennies each month rounds.
    expect(Math.abs(interestPaid() - (answer.payment * 12 - 3_000_00))).toBeLessThan(24_00);
    expect(interestPaid()).toBeGreaterThan(0);
  });

  it('refuses without wages, past 35% of them, to a poor record, and at Wells Fargo a customer of under a year', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-citi' });
    expect(sim.execute({ kind: 'bank.borrow', payload: { amount: 1_000_00, months: 12 } }).ok).toBe(false);
    wages(sim, 1_000_00);
    expect(sim.execute({ kind: 'bank.borrow', payload: { amount: 50_000_00, months: 12 } }).ok).toBe(false);
    sim.player.credit!.score = 560;
    expect(sim.execute({ kind: 'bank.borrow', payload: { amount: 1_000_00, months: 12 } }).ok).toBe(false);
    const wf = lifeIn('us-ny-newyork', { bankId: 'us-wells-fargo' });
    wages(wf, 10_000_00);
    wf.player.credit!.score = 700;
    // Wells Fargo lends to customers of 12 months or more (from 2026-10-10): the account opened today isn't one yet.
    expect(wf.execute({ kind: 'bank.borrow', payload: { amount: 5_000_00, months: 24 } }).error).toMatch(/customers of 12 months/);
    // TEST SETUP: the account opened thirteen months before.
    wf.universe.accounts[wf.player.primaryAccountId!]!.openedAt -= 13 * 30.44 * MS_DAY;
    expect(wf.execute({ kind: 'bank.borrow', payload: { amount: 5_000_00, months: 24 } }).ok).toBe(true);
    expect(wf.execute({ kind: 'bank.borrow', payload: { amount: 1_000_00, months: 24 } }).ok).toBe(false);
  });

  it('puts a missed payment on the record', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-citi', wealth: 'comfortable' });
    wages(sim, 4_000_00);
    sim.must({ kind: 'bank.borrow', payload: { amount: 3_000_00, months: 12 } });
    const before = sim.player.credit!.score;
    const lates = sim.player.credit!.late.length;
    // Nothing in the bank and no overdraft room when it falls due.
    for (const account of Object.values(sim.universe.accounts)) if (account.ownerId === sim.player.id && account.kind !== 'loan' && account.kind !== 'credit_card') set(sim, account, 0);
    const due = sim.universe.scheduled.find((one) => one.kind === LOAN_DUE_KIND && one.status === 'pending')!;
    set(sim, current(sim), -500_00);
    sim.advanceTo(due.at + 60_000);
    expect(sim.player.credit!.late.length).toBe(lates + 1);
    expect(sim.player.credit!.score).toBeLessThan(before);
  });

  it('is paid off early, and nothing more falls due', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-citi', wealth: 'comfortable' });
    wages(sim, 4_000_00);
    sim.must({ kind: 'bank.borrow', payload: { amount: 3_000_00, months: 12 } });
    set(sim, current(sim), 10_000_00);
    expect(sim.execute({ kind: 'bank.repay_loan', payload: {} }).ok).toBe(true);
    expect(loanOf(sim, sim.player)).toBeUndefined();
    expect(sim.universe.scheduled.some((one) => one.kind === LOAN_DUE_KIND && one.status === 'pending')).toBe(false);
  });
});

describe('a term deposit', () => {
  it('is locked away, kept from spending, and paid out with its interest less the tax', () => {
    const sim = lifeIn('is-39-mosfellsbr', { bankId: 'is-arion', wealth: 'comfortable' });
    const account = current(sim);
    const before = account.balance;
    sim.must({ kind: 'bank.open_term', payload: { amount: 1_000_000_00 } });
    expect(account.balance).toBe(before - 1_000_000_00);
    const term = termsOf(sim, sim.player)[0]!;
    expect(term.fixedRate).toBe(0.0805);
    expect(bankAccountsOf(sim, sim.player).some((a) => a.id === term.id)).toBe(false);
    // Spending never reaches it, even with no other savings to take from.
    set(sim, account, 0);
    sim.must({ kind: 'bank.close_savings', payload: { accountId: savings(sim)!.id } });
    set(sim, account, 0);
    spend(sim, sim.player, 100_000_00, 'Test', 'food');
    expect(term.balance).toBe(1_000_000_00);
    set(sim, account, 5_000_000_00);
    sim.advanceTo(term.maturesAt! + 2 * MS_DAY);
    expect(term.closedAt).toBeDefined();
    const paid = sim.universe.transactions.find((t) => t.memo === `${term.name} paid out`)!;
    const gross = -paid.postings.find((p) => sim.universe.accounts[p.accountId]?.kind === 'income')!.amount;
    // A year at 8.05%, give or take the leap of a day.
    expect(gross).toBeGreaterThan(1_000_000_00 * 0.0805 * 0.99);
    expect(gross).toBeLessThan(1_000_000_00 * 0.0805 * 1.01);
    // Into the current account, less Iceland's 22%.
    const into = paid.postings.find((p) => p.accountId === account.id)!.amount;
    expect(into).toBe(1_000_000_00 + gross - Math.round(gross * 0.22));
  });

  it('keeps ING’s €100,000 floor: a cent short is refused in its words and opens nothing; €100,000 opens', () => {
    // Until 2026-10-13 this asked only that €50,000 was refused, for any reason, and never what it said.
    const sim = lifeIn('de-be-berlin', { bankId: 'de-ing', wealth: 'wealthy' });
    set(sim, current(sim), 150_000_00);
    expect(sim.execute({ kind: 'bank.open_term', payload: { amount: 99_999_99 } })).toMatchObject({ ok: false, error: 'A term deposit there needs at least €100,000.' });
    expect(termsOf(sim, sim.player)).toEqual([]);
    expect(current(sim).balance).toBe(150_000_00);
    expect(sim.execute({ kind: 'bank.open_term', payload: { amount: 100_000_00 } }).ok).toBe(true);
    expect(termsOf(sim, sim.player).map((t) => t.balance)).toEqual([100_000_00]);
    expect(current(sim).balance).toBe(50_000_00);
  });
});

describe('a switch', () => {
  it('runs Iceland’s switching service in its twelve business days, and moves every balance whole', () => {
    // Until 2026-10-10 Iceland had no switching service here, and the switch moved everything the same day.
    const sim = lifeIn('is-39-mosfellsbr', { bankId: 'is-landsbankinn', wealth: 'modest' });
    const total = bankAccountsOf(sim, sim.player).reduce((sum, a) => sum + a.balance, 0);
    const at = sim.must<{ at: number }>({ kind: 'bank.switch', payload: { bankId: 'is-islandsbanki' } }).at;
    expect(at - sim.now).toBeGreaterThanOrEqual(12 * MS_DAY);
    expect(bankOf(sim, sim.player)?.name).toBe('Landsbankinn');
    // TEST SETUP: the life's spending held still while the service runs, so the balances can be compared whole.
    sim.universe.scheduled = sim.universe.scheduled.filter((i) => i.kind === SWITCH_KIND);
    sim.advanceTo(at + 60_000);
    expect(bankOf(sim, sim.player)?.name).toBe('Íslandsbanki');
    expect(current(sim).name).toBe('Almennur reikningur');
    const now = bankAccountsOf(sim, sim.player);
    expect(now.every((a) => a.bankId === 'is-islandsbanki')).toBe(true);
    expect(now.reduce((sum, a) => sum + a.balance, 0)).toBeGreaterThan(total * 0.9);
  });

  it('runs no switch where there’s no service, and says what to do instead', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'modest' });
    expect(sim.execute({ kind: 'bank.switch', payload: { bankId: 'us-citi' } }).error).toMatch(/no switching service here: open an account at Citi/);
  });

  it('takes Britain’s seven working days, and waits for an overdraft to be cleared', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays', wealth: 'modest' });
    set(sim, current(sim), -10_00);
    expect(sim.execute({ kind: 'bank.switch', payload: { bankId: 'gb-hsbc' } }).ok).toBe(false);
    set(sim, current(sim), 1_000_00);
    // Monday 5 January 2026: seven working days on is Wednesday the 14th.
    const at = sim.must<{ at: number }>({ kind: 'bank.switch', payload: { bankId: 'gb-hsbc' } }).at;
    expect(new Date(at).toISOString().slice(0, 10)).toBe('2026-01-14');
    expect(bankOf(sim, sim.player)?.name).toBe('Barclays');
    expect(sim.execute({ kind: 'bank.switch', payload: { bankId: 'gb-natwest' } }).ok).toBe(false);
    sim.advanceTo(at + 60_000);
    expect(bankOf(sim, sim.player)?.name).toBe('HSBC UK');
    expect(sim.universe.scheduled.some((one) => one.kind === SWITCH_KIND && one.status === 'pending')).toBe(false);
  });
});
