/**
 * The card in the hand (`systems/security.ts`): module 6 of
 * `docs/BANKING-FUNCTIONS.md`, against each bank's terms and each country's
 * law in `content/security.ts`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { FRAUD_LAW, SECURITY, type FraudLaw } from '../../src/engine/bankworld/content/security';
import { cardOf, cardRoom } from '../../src/engine/bankworld/systems/credit';
import { spend } from '../../src/engine/bankworld/systems/spending';
import { cardAccount, fraudOn, liabilityFor, plasticOf } from '../../src/engine/bankworld/systems/security';

const laws = FRAUD_LAW as Record<string, FraudLaw>;
const kept = new Map<string, FraudLaw>();
function withLaw(iso: string, change: Partial<FraudLaw>) { if (!kept.has(iso)) kept.set(iso, laws[iso]!); laws[iso] = { ...laws[iso]!, ...change }; }
afterEach(() => { for (const [k, v] of kept) laws[k] = v; kept.clear(); });

const lifeIn = (cityId: string, bankId: string, seed = 'sec') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, wealth: 'comfortable', bankId }, seed);
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const run = (sim: Simulation, kind: string, payload: Record<string, unknown> = {}) => sim.execute({ kind, payload });

describe('locking a card', () => {
  it('stops new purchases on it, and a locked debit card buys on the credit card', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'sec-lock');
    const card = cardOf(sim, sim.player)!;
    const room = cardRoom(sim.player, card);
    sim.must({ kind: 'card.lock', payload: { which: 'credit', locked: true } });
    expect(cardRoom(sim.player, card)).toBe(0);
    sim.must({ kind: 'card.lock', payload: { which: 'credit', locked: false } });
    expect(cardRoom(sim.player, card)).toBe(room);
    sim.must({ kind: 'card.lock', payload: { which: 'debit', locked: true } });
    const before = current(sim).balance;
    const owed = card.balance;
    expect(spend(sim, sim.player, 20_00, 'Groceries', 'food')).toBe(true);
    expect(current(sim).balance).toBe(before);
    expect(owed - card.balance).toBe(20_00);
    // Machines need the debit card; the counter doesn't.
    expect(run(sim, 'cash.withdraw', { amount: 20_00, from: 'atm' }).ok).toBe(false);
    expect(run(sim, 'cash.withdraw', { amount: 20_00, from: 'counter' }).ok).toBe(true);
    // With the credit card locked too and no cash, the shopping isn't bought.
    sim.must({ kind: 'card.lock', payload: { which: 'credit', locked: true } });
    const wallet = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.kind === 'cash')!;
    sim.post({ memo: 'test', category: 'test', postings: [{ accountId: wallet.id, amount: -wallet.balance }, { accountId: sim.nominalAccount('income', 'Test').id, amount: wallet.balance }] });
    expect(spend(sim, sim.player, 20_00, 'Groceries', 'food')).toBe(false);
  });
});

describe('a card reported lost, stolen or damaged', () => {
  it('stops at once, charges BBVA México’s fee, and a new number follows in SLATE’s estimated days', () => {
    const sim = lifeIn('mx-cmx-mexicocity', 'mx-bbva', 'sec-lost');
    const account = current(sim);
    const before = account.balance;
    const old = plasticOf(sim, account, 'debit').last4;
    const answer = sim.must<{ arrivesAt: number; fee: number }>({ kind: 'card.report', payload: { which: 'debit', why: 'lost' } });
    expect(answer.fee).toBe(SECURITY['mx-bbva']!.replaceFeeDebit);
    expect(before - account.balance).toBe(answer.fee);
    expect(account.plastic!.stopped).toBe('lost');
    // Seven business days, the bank not saying: from a Monday, the Wednesday of the week after.
    expect(answer.arrivesAt - sim.now).toBe(9 * MS_DAY);
    expect(run(sim, 'card.report', { which: 'debit', why: 'lost' }).ok).toBe(false);
    sim.advanceTo(answer.arrivesAt + 1000);
    expect(account.plastic!.stopped).toBeUndefined();
    expect(account.plastic!.last4).not.toBe(old);
  });

  it('rushes Chase’s for $15 in two business days, refuses a rush Lloyds has none of, and replaces a stolen card free where the bank does', () => {
    const us = lifeIn('us-ny-newyork', 'us-chase', 'sec-rush');
    const rush = us.must<{ arrivesAt: number; fee: number }>({ kind: 'card.report', payload: { which: 'debit', why: 'stolen', rush: true } });
    expect(rush.fee).toBe(15_00);
    expect(rush.arrivesAt - us.now).toBe(2 * MS_DAY);
    const gb = lifeIn('uk-eng-london', 'gb-lloyds', 'sec-rush-gb');
    expect(run(gb, 'card.report', { which: 'debit', why: 'lost', rush: true }).error).toMatch(/No rushed replacement was found/);
    const es = lifeIn('es-md-madrid', 'es-santander', 'sec-stolen');
    expect(es.must<{ fee: number }>({ kind: 'card.report', payload: { which: 'debit', why: 'stolen' } }).fee).toBe(0);
    const es2 = lifeIn('es-md-madrid', 'es-santander', 'sec-lost-es');
    expect(es2.must<{ fee: number }>({ kind: 'card.report', payload: { which: 'debit', why: 'lost' } }).fee).toBe(5_00);
  });

  // A replaced card's bills declined until they had its number (`card.update_billers`) were tested here until
  // 2026-10-09, when nothing charged a card as a bill any more.
  it('takes a replaced card for anything new once it arrives, and has no billers to tell', () => {
    const gb = lifeIn('uk-eng-london', 'gb-santander', 'sec-billers');
    const card = cardOf(gb, gb.player)!;
    const at = gb.must<{ arrivesAt: number }>({ kind: 'card.report', payload: { which: 'credit', why: 'lost' } }).arrivesAt;
    expect(cardRoom(gb.player, card)).toBe(0);
    gb.advanceTo(at + 1000);
    expect(cardRoom(gb.player, card)).toBeGreaterThan(0);
    expect(gb.commandKinds()).not.toContain('card.update_billers');
  });
});

describe('a card’s expiry', () => {
  it('sends a new card with the same number a month before', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'sec-expiry');
    const p = plasticOf(sim, current(sim), 'debit');
    p.expiresAt = sim.now + 20 * MS_DAY;
    const last4 = p.last4;
    sim.advanceBy(MS_DAY);
    expect(p.expiresAt - sim.now).toBeGreaterThan(3 * 365 * MS_DAY);
    expect(p.last4).toBe(last4);
  });
});

describe('a new account number', () => {
  it('is given by Bank of America, not by Chase', () => {
    const boa = lifeIn('us-ny-newyork', 'us-bank-of-america', 'sec-number');
    const before = current(boa).number;
    boa.must({ kind: 'bank.new_number', payload: {} });
    expect(current(boa).number).not.toBe(before);
    expect(current(boa).plastic!.stopped).toBe('fraud');
    expect(run(lifeIn('us-ny-newyork', 'us-chase', 'sec-number-chase'), 'bank.new_number').ok).toBe(false);
  });
});

describe('somebody else’s use', () => {
  it('meets a Mexican cardholder at CONDUSEF’s average claim, now it’s published', () => {
    expect(laws.MX!.avgLoss).toBe(4_285_00);
    withLaw('MX', { fraudRate: 1 });
    const sim = lifeIn('mx-cmx-mexicocity', 'mx-bbva', 'sec-mx-fraud');
    const hit = fraudOn(sim, sim.player, sim.now);
    expect(hit).toBeDefined();
    // A quarter to seven quarters of the average.
    expect(hit!.amount).toBeGreaterThanOrEqual(Math.round(4_285_00 * 0.25) - 1);
    expect(hit!.amount).toBeLessThanOrEqual(Math.round(4_285_00 * 1.75) + 1);
  });

  it('is stopped by a British bank at its share, and otherwise goes through, on the country’s rate', () => {
    withLaw('GB', { fraudRate: 1 });
    let stopped = 0;
    let through = 0;
    for (const seed of ['a', 'b', 'c', 'd', 'e', 'f']) {
      const sim = lifeIn('uk-eng-london', 'gb-barclays', `sec-gb-${seed}`);
      sim.advanceBy(MS_DAY);
      if (sim.universe.notifications.some((n) => n.title === 'Your Bank Stopped A Payment')) stopped += 1;
      if ((sim.player.fraud ?? []).length > 0) through += 1;
    }
    expect(stopped + through).toBe(6);
    expect(stopped).toBeGreaterThan(0);
    withLaw('GB', { fraudRate: 0 });
    const quiet = lifeIn('uk-eng-london', 'gb-barclays', 'sec-gb-quiet');
    quiet.advanceBy(30 * MS_DAY);
    expect(quiet.player.fraud ?? []).toEqual([]);
  });

  it('leaves a US holder $50 of a debit card’s use reported at once, $500 later, and refunds the rest', () => {
    withLaw('US', { fraudRate: 1 });
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'sec-us');
    sim.player.alerts = { statements: true, largePayment: 1 };
    sim.advanceBy(MS_DAY);
    withLaw('US', { fraudRate: 0 });
    const one = sim.player.fraud![0]!;
    expect(one.learnedAt).toBe(one.at);
    const account = sim.universe.accounts[one.accountId]!;
    const answer = sim.must<{ carried: number; refundAt: number }>({ kind: 'card.dispute', payload: { index: 0 } });
    expect(answer.carried).toBe(Math.min(one.amount, 50_00));
    expect(account.plastic!.stopped).toBe('fraud');
    expect(run(sim, 'card.dispute', { index: 0 }).ok).toBe(false);
    sim.advanceTo(answer.refundAt + 1000);
    const done = sim.player.fraud![0]!;
    expect(done.refunded).toBe(one.amount - answer.carried);
    expect(sim.universe.transactions.some((t) => t.memo === 'Refund: a payment you didn’t make' && t.postings.some((p) => p.accountId === account.id && p.amount === done.refunded))).toBe(true);
    // Each tier on its own clock, from the use's record as the game keeps it. Until 2026-10-12 these passed a bare
    // number of days (1, 30, 90), which counted every tier from it, a path the game never took; the record replaced
    // it. Learned of and reported the same moment: $50. Learned of by an alert 70 days ago, its statement 42 days ago:
    // past the $50 tier's two business days, inside the $500 tier's 60 from the statement, where 70 days from learning
    // of it would have left all of it. The statement 90 days ago: all of it on a debit card, and a credit card's $50.
    const now = sim.now;
    const debit = cardAccount(sim, sim.player, 'debit')!;
    expect(liabilityFor(sim, debit, 'debit', 900_00, { learnedAt: now, statedAt: now })).toBe(50_00);
    expect(liabilityFor(sim, debit, 'debit', 900_00, { learnedAt: now - 70 * MS_DAY, statedAt: now - 42 * MS_DAY })).toBe(500_00);
    expect(liabilityFor(sim, debit, 'debit', 900_00, { learnedAt: now - 90 * MS_DAY, statedAt: now - 90 * MS_DAY })).toBe(900_00);
    expect(liabilityFor(sim, cardOf(sim, sim.player)!, 'credit', 900_00, { learnedAt: now - 90 * MS_DAY, statedAt: now - 90 * MS_DAY })).toBe(50_00);
  });

  it('never comes in Japan, which publishes no rate for it', () => {
    const sim = lifeIn('jp-13-tokyo', 'jp-mufg', 'sec-jp');
    sim.advanceBy(60 * MS_DAY);
    expect(sim.player.fraud ?? []).toEqual([]);
    expect(sim.universe.notifications.some((n) => n.title === 'Your Bank Stopped A Payment')).toBe(false);
    for (let day = 0; day < 400; day += 1) expect(fraudOn(sim, sim.player, sim.now + day * MS_DAY)).toBeUndefined();
  });

  it('can’t be reported past the law’s days from the statement', () => {
    withLaw('GB', { fraudRate: 1, preventedShare: 0 });
    const sim = lifeIn('uk-eng-london', 'gb-barclays', 'sec-late');
    sim.advanceBy(MS_DAY);
    withLaw('GB', { fraudRate: 0 });
    expect(sim.player.fraud!.length).toBe(1);
    sim.advanceBy(440 * MS_DAY);
    expect(run(sim, 'card.dispute', { index: 0 }).error).toMatch(/passed/);
  });
});
