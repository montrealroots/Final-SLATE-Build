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
import { checkingsOf, loanOf, loansOf, overdraftOffer, repaymentAccount, SWITCH_KIND } from '../../src/engine/bankworld/systems/lending';
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
