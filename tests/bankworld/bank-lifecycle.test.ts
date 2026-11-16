/**
 * Banking at every bank held, and its lifecycle's exceptional paths (from 2026-10-10): lending at a second bank, its
 * repayment account kept through a change of primary, wages counted once across loans; an overdraft at a second bank;
 * a switch called off, and one that fails part-way; a statement kept as it was cut. PLAYER JOURNEYS play through
 * commands; FIXTURES set a state by hand, and say so.
 */
import { describe, expect, it } from 'vitest';
import { loadSave, quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { chargeForItem, checkingsOf, loanOf, loansOf, overdraftOffer, repaymentAccount, SWITCH_KIND } from '../../src/engine/bankworld/systems/lending';
import { cardsOf, stateOf } from '../../src/engine/bankworld/systems/credit';
import { cardStatement, periodsOf } from '../../src/engine/bankworld/systems/statements';

const lifeIn = (cityId: string, extra: Record<string, unknown>, seed: string) => quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, ...extra }, seed);
const reload = (sim: Simulation) => loadSave(deserialise(serialise(sim.universe)) as never);
const primary = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
/** FIXTURE: a month's wages paid in, as a payday posts them. */
const wages = (sim: Simulation, id: string, amount: number) => sim.post({ memo: 'Wages', category: 'salary', postings: [{ accountId: id, amount }, { accountId: sim.nominalAccount('income', 'Wages').id, amount: -amount }] });
const fund = (sim: Simulation, id: string, amount: number) => sim.post({ memo: 'TEST SETUP', category: 'test', postings: [{ accountId: id, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });

describe('PLAYER JOURNEY: a loan at the second bank', () => {
  it('borrows at Citi while Chase is primary, pays into Chase, repays from Citi through a change of primary, and counts the loan against the next', () => {
    let sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'comfortable' }, 'lc-loan2');
    const chase = primary(sim).id;
    const citi = sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'us-citi' } }).accountId;
    wages(sim, chase, 5_000_00);
    // Chase publishes no personal loan; Citi does.
    expect(sim.execute({ kind: 'bank.borrow', payload: { amount: 3_000_00, months: 24 } }).error).toMatch(/No personal loan rate was found for Chase/);
    const before = sim.universe.accounts[chase]!.balance;
    const loan = sim.must<{ loanId: string; payment: number }>({ kind: 'bank.borrow', payload: { amount: 3_000_00, months: 24, bankId: 'us-citi', intoId: chase, repayFromId: citi } });
    expect(sim.universe.accounts[chase]!.balance - before).toBe(3_000_00);
    expect(loanOf(sim, sim.player, 'us-citi')!.repayFromId).toBe(citi);
    // A change of primary moves no lender, rate or repayment account.
    sim.must({ kind: 'bank.set_primary', payload: { accountId: citi } });
    sim.must({ kind: 'bank.set_primary', payload: { accountId: chase } });
    sim = reload(sim);
    const held = loansOf(sim, sim.player)[0]!;
    expect(repaymentAccount(sim, sim.player, held)!.id).toBe(citi);
    fund(sim, citi, 1_000_00);
    const citiBefore = sim.universe.accounts[citi]!.balance;
    sim.advanceTo(sim.now + 32 * MS_DAY);
    expect(sim.universe.accounts[citi]!.balance).toBeLessThan(citiBefore);
    // A second loan at the same bank is refused; and every loan held counts against the same wages.
    expect(sim.execute({ kind: 'bank.borrow', payload: { amount: 3_000_00, months: 24, bankId: 'us-citi' } }).error).toMatch(/already have a loan with Citi/);
    held.loanPayment = 1_600_00;
    wages(sim, chase, 5_000_00);
    // Closing the repayment account is refused while the loan pays from it.
    expect(sim.execute({ kind: 'bank.close_current', payload: { accountId: citi, remainderTo: chase } }).error).toMatch(/Personal Loan’s payments come from it/);
    expect(loan.payment).toBeGreaterThan(0);
  });
});

describe('an overdraft at the second bank', () => {
  it('is arranged on the account named, and what’s arranged elsewhere comes off what wages allow', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays', wealth: 'comfortable' }, 'lc-od');
    const barclays = primary(sim);
    const natwest = sim.universe.accounts[sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'gb-natwest' } }).accountId]!;
    wages(sim, barclays.id, 3_000_00);
    const alone = overdraftOffer(sim, sim.player, natwest);
    expect('max' in alone).toBe(true);
    const max = (alone as { max: number }).max;
    sim.must({ kind: 'bank.arrange_overdraft', payload: { limit: Math.round(max / 2), accountId: barclays.id } });
    const after = overdraftOffer(sim, sim.player, natwest) as { max: number };
    expect(after.max).toBe(max - Math.round(max / 2));
    sim.must({ kind: 'bank.arrange_overdraft', payload: { limit: Math.min(after.max, 100_00), accountId: natwest.id } });
    expect(natwest.overdraftLimit).toBe(Math.min(after.max, 100_00));
    expect(barclays.overdraftLimit).toBe(Math.round(max / 2));
  });
});

describe('a switching service', () => {
  it('can be called off until seven working days before its date, then not; called off, nothing moves', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays' }, 'lc-cancel');
    const barclays = primary(sim).id;
    // A date three weeks out, so there's a window to call it off.
    const on = new Date(sim.now + 21 * MS_DAY);
    while ([0, 6].includes(on.getUTCDay())) on.setUTCDate(on.getUTCDate() + 1);
    const set = sim.must<{ at: number; cancellableUntil: number }>({ kind: 'bank.switch', payload: { bankId: 'gb-hsbc', on: on.toISOString().slice(0, 10) } });
    expect(set.cancellableUntil).toBeLessThan(set.at);
    expect(sim.execute({ kind: 'bank.cancel_switch', payload: {} }).error).toMatch(/Confirm/);
    sim.must({ kind: 'bank.cancel_switch', payload: { confirm: true } });
    expect(sim.universe.scheduled.some((i) => i.kind === SWITCH_KIND && i.status === 'pending')).toBe(false);
    sim.advanceTo(set.at + MS_DAY);
    expect(primary(sim).id).toBe(barclays);
    // Started again at the earliest date: past its window at once, and refused.
    sim.must({ kind: 'bank.switch', payload: { bankId: 'gb-hsbc' } });
    sim.advanceTo(sim.now + MS_DAY);
    expect(sim.execute({ kind: 'bank.cancel_switch', payload: { confirm: true } }).error).toMatch(/under way/);
  });

  it('PLAYER JOURNEY: fails part-way when the old account is overdrawn on the day: the new account opens and payments move, the debt stays', () => {
    let sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays' }, 'lc-partial');
    const barclays = primary(sim).id;
    const at = sim.must<{ at: number }>({ kind: 'bank.switch', payload: { bankId: 'gb-hsbc' } }).at;
    sim = reload(sim);
    // FIXTURE: overdrawn before the switch date, past what the switch can take across.
    fund(sim, barclays, -sim.universe.accounts[barclays]!.balance - 200_00);
    sim.advanceTo(at + 60_000);
    const old = sim.universe.accounts[barclays]!;
    expect(old.closedAt).toBeUndefined();
    expect(old.balance).toBeLessThan(0);
    expect(primary(sim).bankId).toBe('gb-hsbc');
    expect(sim.universe.notifications.some((n) => n.title === 'The Switch To HSBC UK Is Only Part Done')).toBe(true);
    expect(checkingsOf(sim, sim.player).map((a) => a.bankId).sort()).toEqual(['gb-barclays', 'gb-hsbc']);
  });
});

describe('a card statement', () => {
  it('keeps the minimum it said when it was cut, whatever the terms are later', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'comfortable' }, 'lc-stmt');
    const card = cardsOf(sim, sim.player)[0]!;
    // FIXTURE: $900 spent on the card, played to its statement.
    sim.post({ memo: 'TEST SETUP', category: 'test', postings: [{ accountId: card.id, amount: -900_00 }, { accountId: sim.nominalAccount('expense', 'Test').id, amount: 900_00 }] });
    sim.advanceTo(sim.now + 35 * MS_DAY);
    const issued = stateOf(sim.player, card).issued!.at(-1)!;
    const period = periodsOf(sim, card).find((p) => Math.abs(p.to - issued.at) < 60_000)!;
    const then = cardStatement(sim, card, period).minimum;
    expect(then).toBe(issued.minimum);
    // The record collapses, and the card's terms with it; the statement already cut doesn't move.
    sim.player.credit!.score = 520;
    expect(cardStatement(sim, card, period).minimum).toBe(then);
  });
});

describe('instructions on a closing account', () => {
  it('a closing account takes no new standing order or autopay', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'lc-closing');
    const cap = sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'us-capital-one' } }).accountId;
    // FIXTURE: Capital One closing, as Citi's restricted close leaves an account.
    sim.universe.accounts[cap]!.closingAt = sim.now + 5 * MS_DAY;
    const card = cardsOf(sim, sim.player)[0]!;
    expect(sim.execute({ kind: 'card.set_autopay_from', payload: { cardId: card.id, accountId: cap } }).error).toMatch(/closing/);
    // A standing order is made from the primary, which is never a closing account, and can’t be moved onto one. Until
    // 2026-10-13 this test said so in its title and didn’t assert it.
    const saver = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.kind === 'savings' && a.bankId === 'us-chase' && !a.closedAt && a.category !== 'term')
      ?? sim.universe.accounts[sim.must<{ accountId: string }>({ kind: 'bank.open_savings', payload: { bankId: 'us-chase' } }).accountId]!;
    const order = sim.must<{ id: string }>({ kind: 'bank.add_standing_order', payload: { toId: saver.id, amount: 100_00, day: 15 } }).id;
    const capName = sim.universe.accounts[cap]!.name;
    expect(sim.execute({ kind: 'bank.set_order_source', payload: { orderId: order, accountId: cap } }).error).toBe(`${capName} is closing, so a standing order can’t pay from it.`);
  });
});

// From November 16, 2026, when the ported bank screens' controls were added to the input audit
// (docs/input-audit/CONTROLS.csv): Repaid From and Pay Toward It had no test that issued their commands but the proofs.
describe('a loan repaid from another account', () => {
  it('moves the next payment to the account chosen, and refuses one that is closing or not a checking account', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'comfortable' }, 'lc-repay-from');
    const chase = primary(sim).id;
    const citi = sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'us-citi' } }).accountId;
    wages(sim, chase, 5_000_00);
    const { loanId } = sim.must<{ loanId: string }>({ kind: 'bank.borrow', payload: { amount: 3_000_00, months: 24, bankId: 'us-citi', intoId: chase, repayFromId: citi } });
    const name = sim.universe.accounts[loanId]!.name;
    sim.must({ kind: 'bank.set_loan_repayment', payload: { loanId, accountId: chase } });
    expect(loansOf(sim, sim.player)[0]!.repayFromId).toBe(chase);
    fund(sim, citi, 1_000_00);
    sim.advanceTo(sim.now + 32 * MS_DAY);
    const paid = sim.universe.transactions.filter((t) => t.memo === `Payment: ${name}`);
    expect(paid.length).toBe(1);
    // The payment comes out of Chase alone: nothing of it from Citi, which it would have come from.
    expect(paid[0]!.postings.filter((q) => q.amount < 0).map((q) => q.accountId)).toEqual([chase]);
    expect(sim.execute({ kind: 'bank.set_loan_repayment', payload: { loanId, accountId: loanId } }).error).toBe('A loan has to be repaid from one of your open checking accounts.');
    expect(sim.execute({ kind: 'bank.set_loan_repayment', payload: { loanId: 'no-such-loan', accountId: chase } }).error).toBe('That isn’t an open loan of yours.');
  });
});

describe('a debt in collections', () => {
  it('is paid toward from the checking account, never more than is owed or held, and closes when it is paid', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'comfortable' }, 'lc-collections');
    const chase = primary(sim);
    // FIXTURE: a debt of $500 in collections, as a charge-off leaves one (credit.ts, lending.ts).
    const debt = sim.openAccount({ id: sim.nextId('account'), kind: 'loan', category: 'collections', name: 'Owed To Chase, In Collections', ownerId: sim.player.id, institution: 'Chase', openedAt: sim.now });
    sim.post({ memo: 'TEST SETUP', category: 'test', postings: [{ accountId: debt.id, amount: -500_00 }, { accountId: sim.nominalAccount('income', 'Test').id, amount: 500_00 }] });
    fund(sim, chase.id, 10_000_00);
    const before = chase.balance;
    expect(sim.must<{ paid: number; left: number }>({ kind: 'bank.pay_collections', payload: { amount: 200_00, debtId: debt.id } })).toEqual({ paid: 200_00, left: 300_00 });
    expect(before - chase.balance).toBe(200_00);
    // Asked for more than is owed, it pays what is owed, and the debt is closed.
    expect(sim.must<{ paid: number; left: number }>({ kind: 'bank.pay_collections', payload: { amount: 1_000_00, debtId: debt.id } })).toEqual({ paid: 300_00, left: 0 });
    expect(before - chase.balance).toBe(500_00);
    expect(debt.closedAt).toBe(sim.now);
    expect(sim.execute({ kind: 'bank.pay_collections', payload: { amount: 100_00 } }).error).toBe('You don’t owe anything in collections.');
  });

  it('pays only what the checking account holds, and nothing from an empty one', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'comfortable' }, 'lc-collections-short');
    const chase = primary(sim);
    const debt = sim.openAccount({ id: sim.nextId('account'), kind: 'loan', category: 'collections', name: 'Owed To Chase, In Collections', ownerId: sim.player.id, institution: 'Chase', openedAt: sim.now });
    sim.post({ memo: 'TEST SETUP', category: 'test', postings: [{ accountId: debt.id, amount: -500_00 }, { accountId: sim.nominalAccount('income', 'Test').id, amount: 500_00 }] });
    fund(sim, chase.id, 120_00 - chase.balance); // TEST SETUP: $120 held
    expect(sim.must<{ paid: number; left: number }>({ kind: 'bank.pay_collections', payload: { amount: 500_00 } })).toEqual({ paid: 120_00, left: 380_00 });
    expect(chase.balance).toBe(0);
    expect(sim.execute({ kind: 'bank.pay_collections', payload: { amount: 50_00 } }).error).toBe(`${chase.name} has nothing available to pay it with, so nothing was paid.`);
    expect(debt.closedAt).toBeUndefined();
  });
});

describe('an overdraft paid for by the use', () => {
  it('at TD charges $5 the first time a day it is used and nothing a month; the monthly plan charges $5 a month and nothing a use', () => {
    const toronto = (perUse: boolean) => {
      const sim = lifeIn('ca-on-toronto', { bankId: 'ca-td', wealth: 'comfortable' }, `lc-od-${perUse}`);
      const td = primary(sim);
      wages(sim, td.id, 5_000_00); // TD arranges one against the wages paid in
      sim.must({ kind: 'bank.arrange_overdraft', payload: { limit: 500_00, perUse } });
      return { sim, td };
    };
    const fees = (sim: Simulation, id: string) => sim.universe.transactions.filter((t) => t.memo === 'Overdraft fee' && t.postings.some((q) => q.accountId === id)).map((t) => t.postings.find((q) => q.accountId === id)!.amount);
    const use = toronto(true);
    const plan = toronto(false);
    expect([use.td.overdraftPerUse, plan.td.overdraftPerUse]).toEqual([true, undefined]);
    for (const { sim, td } of [use, plan]) {
      fund(sim, td.id, -td.balance - 100_00); // TEST SETUP: $100 overdrawn
      chargeForItem(sim, sim.player, 100_00);
      chargeForItem(sim, sim.player, 20_00); // a second use the same day
    }
    expect(fees(use.sim, use.td.id)).toEqual([-5_00]);
    expect(fees(plan.sim, plan.td.id)).toEqual([]);
    // Into the next month: the monthly plan's fee, and none for paying by the use.
    for (const { sim } of [use, plan]) sim.advanceTo(sim.now + 32 * MS_DAY);
    expect(fees(use.sim, use.td.id)).toEqual([-5_00]);
    expect(fees(plan.sim, plan.td.id)).toEqual([-5_00]);
  });
});

describe('a partial switch', () => {
  it('in Britain takes CASS’s 20 working days to the full switch’s 7, and leaves the old account open with its balance', () => {
    const london = (partial: boolean) => {
      const sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays', wealth: 'comfortable' }, `lc-partial-${partial}`);
      const old = primary(sim);
      const set = sim.must<{ at: number }>({ kind: 'bank.switch', payload: { bankId: 'gb-hsbc', ...(partial ? { partial: true } : {}) } });
      return { sim, old, at: set.at };
    };
    const part = london(true);
    const full = london(false);
    expect(part.at).toBeGreaterThan(full.at + 13 * MS_DAY);
    part.sim.advanceTo(part.at + MS_DAY);
    expect(part.old.closedAt).toBeUndefined();
    expect(part.old.balance).toBeGreaterThan(0);
    full.sim.advanceTo(full.at + MS_DAY);
    expect(full.old.closedAt).toBeDefined();
    // Only Britain's service runs one.
    const ny = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'lc-partial-us');
    expect(ny.execute({ kind: 'bank.switch', payload: { bankId: 'us-citi', partial: true } }).error).toBeDefined();
  });
});

describe('what a loan is for', () => {
  it('at Capital One, an education expense is refused in Discover’s terms, and any other purpose is lent', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'comfortable' }, 'lc-purpose');
    const chase = primary(sim).id;
    sim.must({ kind: 'bank.open_current', payload: { bankId: 'us-capital-one' } });
    wages(sim, chase, 5_000_00);
    const ask = (purpose: 'education' | 'other') => sim.execute({ kind: 'bank.borrow', payload: { amount: 5_000_00, months: 36, bankId: 'us-capital-one', purpose } });
    expect(ask('education').error).toBe('Discover Personal Loans doesn’t lend for a post-secondary education expense.');
    expect(ask('other').error).toBeUndefined();
  });
});
