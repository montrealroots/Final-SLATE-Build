/**
 * Brief 26's money trace (2026-10-24): a card closed while it holds a credit balance. A holder who paid more than they
 * owed holds the difference as a credit on the card (`payCard`, C23), and `card.refund_credit` sends it back on asking.
 * Closing the card, by Close The Card at once with nothing owed, or at the statement once a card being closed is paid
 * off, left that credit in the closed account until 2026-10-24: `cardsOf` and `cardFor` read open cards only, so Send
 * The Credit To My Account refused it ("The card holds no credit to send back."), Money's cash and net worth no longer
 * counted it, and nothing could ever reach it again. A bank refunds a credit balance when it closes a card. From
 * 2026-10-24 every close of a card (`closeCard`, systems/credit.ts) sends a credit back to the current account first, as
 * `card.refund_credit` sends it, and says so: the statement's Card Closed as it always has, with the credit's clause, and
 * Close The Card at once only where a credit went back (closed owing nothing and holding nothing, it says nothing, as before).
 *
 * Measured before the fix on a Chase card: $500.00 paid over what was owed, Close The Card pressed, the card closed with
 * $500.00 still on it, the checking account unchanged, and net worth $500.00 down.
 */
import { describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { cardOf, STATEMENT_KIND } from '../../src/engine/bankworld/systems/credit';
import { netWorth } from '../../src/engine/bankworld/systems/finance';

/** A New Yorker banking at Chase, comfortable, as tests/interest.test.ts makes one. */
const lifeIn = (seed: string) => quickSave({ startLocationId: 'us-ny-newyork', homeRegionId: 'us-ny-newyork', livesWhereBorn: true, bankId: 'us-chase', wealth: 'comfortable' } as never, seed);
const give = (sim: Simulation, accountId: string, amount: number) => sim.post({ memo: 'test', category: 'test', postings: [{ accountId, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const refunds = (sim: Simulation) => sim.universe.transactions.filter((t) => t.memo.startsWith('Credit refunded'));
const titled = (sim: Simulation, title: string) => sim.universe.notifications.filter((n) => n.title === title);

describe('a card closed with a credit balance on it', () => {
  it('DEFECT: Close The Card, with nothing owed: the credit goes back to the checking account as the card closes, net worth unchanged, and the notice says so (until 2026-10-24 it stayed on the closed card)', () => {
    const sim = lifeIn('b26-card-credit-close');
    const card = cardOf(sim, sim.player)!;
    give(sim, current(sim).id, 10_000_00);
    const worth0 = netWorth(sim, sim.player.id);
    const owed0 = -card.balance;
    // TEST SETUP: $500.00 more than is owed, paid by hand, which the card holds as a credit (C23).
    expect(sim.execute({ kind: 'finance.pay_card', payload: { amount: owed0 + 500_00 } }).ok).toBe(true);
    expect(card.balance).toBe(500_00);
    // Paying the card moves the holder's own money: what was owed is gone from the debts and from the cash, and the
    // $500.00 over is theirs still, a credit counted with the cash, so net worth stands where it stood (from 2026-10-24:
    // until then a credit on a card counted as nothing, and net worth read $500.00 under what the player had).
    const before = { checking: current(sim).balance, worth: netWorth(sim, sim.player.id) };
    expect(before.worth.liabilities).toBe(worth0.liabilities - owed0);
    expect(before.worth.cash).toBe(worth0.cash - owed0);
    expect(before.worth.total).toBe(worth0.total);
    expect(sim.execute({ kind: 'card.close', payload: { accountId: card.id } }).ok).toBe(true);
    expect(card.closedAt).toBe(sim.now);
    expect(card.balance).toBe(0);
    expect(current(sim).balance - before.checking).toBe(500_00);
    expect(netWorth(sim, sim.player.id).total).toBe(worth0.total);
    expect(refunds(sim)).toHaveLength(1);
    expect(titled(sim, 'Card Closed').map((n) => n.body)).toEqual([`The ${card.name} is closed, and the $500.00 it held as a credit went back to your ${current(sim).name}.`]);
    // Nothing left to send back, and nothing sent twice.
    expect(sim.execute({ kind: 'card.refund_credit', payload: { accountId: card.id } }).ok).toBe(false);
  });

  it('a card being closed, paid off past what it owed before its statement: the statement closes it and sends the credit back', () => {
    const sim = lifeIn('b26-card-credit-statement');
    const card = cardOf(sim, sim.player)!;
    give(sim, current(sim).id, 10_000_00);
    // TEST SETUP: something owed, so Close The Card leaves it closing, not closed.
    give(sim, card.id, -200_00);
    expect(card.balance).toBeLessThan(0);
    expect(sim.execute({ kind: 'card.close', payload: { accountId: card.id } }).ok).toBe(true);
    expect(card.closedAt).toBeUndefined();
    // Paid off, and $120.00 over, by hand.
    expect(sim.execute({ kind: 'finance.pay_card', payload: { amount: -card.balance + 120_00, accountId: card.id } }).ok).toBe(true);
    expect(card.balance).toBe(120_00);
    const statementAt = sim.timeline.pending().find((i) => i.kind === STATEMENT_KIND && i.payload.personId === sim.player.id)!.at;
    sim.advanceTo(statementAt + 60_000);
    expect(card.closedAt).toBeDefined();
    expect(card.balance).toBe(0);
    // The days between spend from the checking account, so the refund is read on its own posting: $120.00 from the card
    // into the checking account, once.
    expect(refunds(sim).map((t) => t.postings.map((p) => [p.accountId === card.id ? 'card' : p.accountId === current(sim).id ? 'checking' : 'other', p.amount]))).toEqual([[['card', -120_00], ['checking', 120_00]]]);
    expect(titled(sim, 'Card Closed').map((n) => n.body)).toEqual([`The ${card.name} is paid off and closed, and the $120.00 it held as a credit went back to your ${current(sim).name}.`]);
  });

  it('a card closed owing nothing and holding nothing: closed at once, no refund posted, and no notice, as before', () => {
    const sim = lifeIn('b26-card-close-plain');
    const card = cardOf(sim, sim.player)!;
    give(sim, current(sim).id, 10_000_00);
    if (card.balance < 0) expect(sim.execute({ kind: 'finance.pay_card', payload: { amount: 'full' } }).ok).toBe(true);
    expect(card.balance).toBe(0);
    sim.advanceBy(MS_DAY);
    expect(sim.execute({ kind: 'card.close', payload: { accountId: card.id } }).ok).toBe(true);
    expect(card.closedAt).toBeDefined();
    expect(refunds(sim)).toHaveLength(0);
    expect(titled(sim, 'Card Closed')).toHaveLength(0);
  });
});
