/**
 * Cash (`systems/cash.ts`): module 3 of `docs/BANKING-FUNCTIONS.md`.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY, instantFromZoned } from '../../src/engine/bankworld/core/time';
import { CARDS, type CardProduct } from '../../src/engine/bankworld/content/cards';
import { CASH } from '../../src/engine/bankworld/content/cash';
import { cardOf, STATEMENT_KIND } from '../../src/engine/bankworld/systems/credit';
import { allocatePayment, walletOf } from '../../src/engine/bankworld/systems/cash';
import { spend } from '../../src/engine/bankworld/systems/spending';

const cards = CARDS as Record<string, CardProduct | { none: true; source: string }>;
const kept = new Map<string, unknown>();
function withCard(bankId: string, product: CardProduct) { if (!kept.has(bankId)) kept.set(bankId, cards[bankId]); cards[bankId] = product; }
afterEach(() => { for (const [k, v] of kept) { if (v) cards[k] = v as CardProduct; else delete cards[k]; } kept.clear(); });

const lifeIn = (cityId: string, extra: Record<string, unknown> = {}, seed = 'cash') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, wealth: 'comfortable', ...extra }, seed);
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const give = (sim: Simulation, accountId: string, amount: number) => sim.post({ memo: 'test', category: 'test', postings: [{ accountId, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });
const run = (sim: Simulation, kind: string, payload: Record<string, unknown>) => sim.execute({ kind, payload });

describe('taking cash out', () => {
  it('is free at the bank’s own ATM and costs the bank’s fee at another’s, and in the US its owner’s average $3.22', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'cash-atm');
    give(sim, current(sim).id, 5_000_00);
    const before = current(sim).balance;
    expect(run(sim, 'cash.withdraw', { amount: 100_00, from: 'atm' }).ok).toBe(true);
    expect(before - current(sim).balance).toBe(100_00);
    const mid = current(sim).balance;
    const other = run(sim, 'cash.withdraw', { amount: 100_00, from: 'other_atm' });
    expect(other.ok).toBe(true);
    expect(other.value).toMatchObject({ fee: CASH['us-chase']!.other, ownerCharge: 3_22 });
    expect(mid - current(sim).balance).toBe(100_00 + CASH['us-chase']!.other! + 3_22);
    expect(walletOf(sim, sim.player)!.balance).toBe(200_00);
  });

  it('says a machine’s owner may charge where no average is published', () => {
    const sim = lifeIn('ca-on-toronto', { bankId: 'ca-td' }, 'cash-atm-ca');
    give(sim, current(sim).id, 5_000_00);
    expect(run(sim, 'cash.withdraw', { amount: 100_00, from: 'other_atm' }).value).toMatchObject({ ownerFee: true });
  });

  it('lets no more out of machines in a day than the bank allows, and the counter has no such limit', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'cash-daily');
    give(sim, current(sim).id, 50_000_00);
    const daily = CASH['us-chase']!.daily!;
    expect(run(sim, 'cash.withdraw', { amount: daily, from: 'atm' }).ok).toBe(true);
    const over = run(sim, 'cash.withdraw', { amount: 1_00, from: 'other_atm' });
    expect(over.ok).toBe(false);
    expect(over.error).toMatch(/a day out of machines/);
    expect(run(sim, 'cash.withdraw', { amount: 2_000_00, from: 'counter' }).ok).toBe(true);
    sim.advanceBy(MS_DAY);
    expect(run(sim, 'cash.withdraw', { amount: 1_00, from: 'atm' }).ok).toBe(true);
  });

  it('charges the counter’s fee where the bank has one', () => {
    const sim = lifeIn('is-39-mosfellsbr', { bankId: 'is-arion' }, 'cash-teller');
    const fee = CASH['is-arion']!.teller!;
    expect(fee).toBeGreaterThan(0);
    const before = current(sim).balance;
    expect(run(sim, 'cash.withdraw', { amount: 10_000_00, from: 'counter' }).ok).toBe(true);
    expect(before - current(sim).balance).toBe(10_000_00 + fee);
  });

  it('can use the Post Office in Britain where the bank lets it, and pay in only where it allows that too', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-barclays' }, 'cash-po');
    expect(run(sim, 'cash.withdraw', { amount: 50_00, from: 'post_office' }).ok).toBe(true);
    expect(run(sim, 'cash.deposit', { amount: 20_00, toId: current(sim).id, at: 'post_office' }).ok).toBe(true);
    const nw = lifeIn('uk-eng-london', { bankId: 'gb-nationwide' }, 'cash-po-nw');
    expect(run(nw, 'cash.withdraw', { amount: 50_00, from: 'post_office' }).ok).toBe(true);
    expect(run(nw, 'cash.deposit', { amount: 20_00, toId: current(nw).id, at: 'post_office' }).ok).toBe(false);
    const us = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'cash-po-us');
    expect(run(us, 'cash.withdraw', { amount: 50_00, from: 'post_office' }).ok).toBe(false);
  });
});

describe('a cash advance', () => {
  it('costs the card’s fee, never under its minimum, and draws its rate from the day it’s taken with no grace period', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'scraping' }, 'cash-advance');
    const card = cardOf(sim, sim.player)!;
    withCard(card.bankId!, { name: 'Test', kind: 'revolving', apr: 0.2, cashFeeShare: 0.05, cashFeeMin: 10_00, cashApr: 0.3, source: 'test', asOf: '2026-09-26' });
    give(sim, card.id, -card.balance);
    sim.player.credit!.carrying = false;
    const small = run(sim, 'cash.withdraw', { amount: 100_00, from: 'card' });
    expect(small.value).toMatchObject({ fee: 10_00 });
    const big = run(sim, 'cash.withdraw', { amount: 400_00, from: 'card' });
    expect(big.value).toMatchObject({ fee: 20_00 });
    expect(sim.player.credit!.cashOwed).toBe(500_00);
    // A card in its grace period still pays for the cash, from the first night.
    sim.advanceBy(3 * MS_DAY);
    expect(sim.player.credit!.cashAccrued).toBeGreaterThan(0);
    expect(sim.player.credit!.accrued ?? 0).toBeGreaterThanOrEqual(0);
    const statement = sim.timeline.pending().find((i) => i.kind === STATEMENT_KIND)!.at;
    sim.advanceTo(statement + 1000);
    expect(sim.universe.transactions.some((t) => t.memo === 'Cash advance interest')).toBe(true);
  });

  it('stops at the card’s cash limit', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'scraping' }, 'cash-limit');
    const card = cardOf(sim, sim.player)!;
    withCard(card.bankId!, { name: 'Test', kind: 'revolving', apr: 0.2, cashFeeShare: 0.05, cashApr: 0.3, cashLimit: 300_00, source: 'test', asOf: '2026-09-26' });
    give(sim, card.id, -card.balance);
    expect(run(sim, 'cash.withdraw', { amount: 250_00, from: 'card' }).ok).toBe(true);
    const over = run(sim, 'cash.withdraw', { amount: 100_00, from: 'card' });
    expect(over.ok).toBe(false);
    expect(over.error).toMatch(/as cash/);
  });
});

describe('a payment to the card', () => {
  it('goes to the cash balance first, but a US card’s minimum to the purchases first', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'scraping' }, 'cash-allocate');
    const card = cardOf(sim, sim.player)!;
    give(sim, card.id, -card.balance - 1_000_00);
    sim.player.credit!.cashOwed = 400_00;
    // $300 paid against a $100 minimum: $100 to purchases, $200 to cash.
    give(sim, card.id, 300_00);
    allocatePayment(sim, sim.player, card, 300_00, 100_00, { cash: 0.2849, purchases: 0.2 });
    expect(sim.player.credit!.cashOwed).toBe(200_00);
    const gb = lifeIn('uk-eng-london', { wealth: 'scraping' }, 'cash-allocate-gb');
    const gcard = cardOf(gb, gb.player)!;
    give(gb, gcard.id, -gcard.balance - 1_000_00);
    gb.player.credit!.cashOwed = 400_00;
    give(gb, gcard.id, 300_00);
    allocatePayment(gb, gb.player, gcard, 300_00, 100_00, { cash: 0.3, purchases: 0.25 });
    expect(gb.player.credit!.cashOwed).toBe(100_00);
  });
});

describe('paying cash in and spending it', () => {
  it('pays it into savings, and the day’s groceries come out of the wallet first where that’s the choice', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'cash-in');
    expect(run(sim, 'cash.withdraw', { amount: 20_000_00, from: 'atm' }).ok).toBe(true);
    const savings = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.kind === 'savings')!;
    const held = savings.balance;
    expect(run(sim, 'cash.deposit', { amount: 5_000_00, toId: savings.id, at: 'counter' }).ok).toBe(true);
    expect(savings.balance - held).toBe(5_000_00);
    expect(run(sim, 'cash.deposit', { amount: 50_000_00, toId: savings.id, at: 'counter' }).ok).toBe(false);
    expect(run(sim, 'bank.set_payments', { everyday: 'cash' }).ok).toBe(true);
    const wallet = walletOf(sim, sim.player)!;
    const inHand = wallet.balance;
    const bank = current(sim).balance;
    spend(sim, sim.player, 1_000_00, 'Groceries', 'food');
    expect(inHand - wallet.balance).toBe(1_000_00);
    expect(current(sim).balance).toBe(bank);
  });
});

describe('Germany’s savings', () => {
  it('let €2,000 out a month without notice, and more waits for the next month', () => {
    const sim = lifeIn('de-be-berlin', { bankId: 'de-deutsche-bank', wealth: 'inherited' }, 'cash-de');
    const savings = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.kind === 'savings')!;
    give(sim, savings.id, 10_000_00);
    expect(run(sim, 'bank.transfer', { fromId: savings.id, toId: current(sim).id, amount: 1_500_00 }).ok).toBe(true);
    const over = run(sim, 'bank.transfer', { fromId: savings.id, toId: current(sim).id, amount: 600_00 });
    expect(over.ok).toBe(false);
    expect(over.error).toMatch(/notice/);
    expect(run(sim, 'bank.transfer', { fromId: savings.id, toId: current(sim).id, amount: 500_00 }).ok).toBe(true);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 2, hour: 12 }, sim.zone));
    expect(run(sim, 'bank.transfer', { fromId: savings.id, toId: current(sim).id, amount: 2_000_00 }).ok).toBe(true);
    // A bank that doesn't set the limit.
    const ing = lifeIn('de-be-berlin', { bankId: 'de-ing', wealth: 'inherited' }, 'cash-de-ing');
    const s2 = Object.values(ing.universe.accounts).find((a) => a.ownerId === ing.player.id && a.kind === 'savings')!;
    give(ing, s2.id, 10_000_00);
    expect(run(ing, 'bank.transfer', { fromId: s2.id, toId: current(ing).id, amount: 5_000_00 }).ok).toBe(true);
  });
});
