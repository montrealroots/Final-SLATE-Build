/**
 * Keeping a second bank and moving between banks as the separate acts they are (`systems/bankmoves.ts`, from
 * 2026-10-10). Until then "Switch Bank" in the US opened the new bank's accounts, moved every penny, closed the old ones
 * and moved the primary account in one click, the same day, as often as it was clicked
 * (docs/verification/BANKING-SWITCH.md). The New Haven student, as a new life starts.
 *
 * PLAYER JOURNEYS play a life forward through the commands the screen gives; FIXTURES set a state up by hand to reach
 * one rule, and say so.
 */
import { describe, expect, it } from 'vitest';
import { createSave, loadSave, quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY, instantFromZoned } from '../../src/engine/bankworld/core/time';
import { newLifeConfig } from '../../src/engine/bankworld/world/bootstrap';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import { netWorth } from '../../src/engine/bankworld/systems/finance';
import { paymentsOf } from '../../src/engine/bankworld/systems/payments';
import { payeeAccount } from '../../src/engine/bankworld/systems/cash';
import { applicationsOf, inTransitOf, transfersOf, PRIMARY_DOES } from '../../src/engine/bankworld/systems/bankmoves';
import { checkingsOf } from '../../src/engine/bankworld/systems/lending';
import { DEPOSIT_LEAD } from '../../src/engine/bankworld/systems/routing';
import { autopaySource, cardsOf } from '../../src/engine/bankworld/systems/credit';

const student = (seed: string, bankId = 'us-chase', extra: Record<string, unknown> = {}) =>
  createSave(1, seed, { ...newLifeConfig(), homeRegionId: 'us-ny-newyork', firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her', bankId, ...extra });
const reload = (sim: Simulation) => loadSave(deserialise(serialise(sim.universe)) as never);
const primary = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const at = (sim: Simulation, bankId: string) => checkingsOf(sim, sim.player).find((a) => a.bankId === bankId);
const run = <T = unknown>(sim: Simulation, kind: string, payload: Record<string, unknown>) => {
  const answer = sim.execute<T>({ kind, payload });
  expect(answer.ok, `${kind}: ${answer.error}`).toBe(true);
  return answer.value as T;
};
const refused = (sim: Simulation, kind: string, payload: Record<string, unknown>) => {
  const answer = sim.execute({ kind, payload });
  expect(answer.ok, kind).toBe(false);
  return String(answer.error);
};
const worth = (sim: Simulation) => netWorth(sim, sim.player.id).total;
/** TEST SETUP: money put in an account from outside, as a deposit from family would be. */
const fund = (sim: Simulation, accountId: string, amount: number) =>
  sim.post({ memo: 'TEST SETUP', category: 'test', postings: [{ accountId, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });

describe('switching banks in the US', () => {
  it('runs no switch: there is no US switching service, and the screen gives the steps instead', () => {
    const sim = student('mv-noswitch');
    expect(refused(sim, 'bank.switch', { bankId: 'us-citi' })).toMatch(/no switching service/);
    expect(primary(sim).bankId).toBe('us-chase');
    expect(checkingsOf(sim, sim.player)).toHaveLength(1);
  });
});

describe('PLAYER JOURNEY: a second bank, opened and funded', () => {
  it('opens Capital One at nothing, sends money from Chase in its days, and the card follows', () => {
    let sim = student('mv-second');
    const chase = primary(sim);
    fund(sim, chase.id, 2_000_00);
    const before = worth(sim);
    const chaseBefore = chase.balance;
    const opened = run<{ accountId: string; cardAt: number }>(sim, 'bank.open_current', { bankId: 'us-capital-one' });
    const cap = sim.universe.accounts[opened.accountId]!;
    // Opened at nothing: none of Chase's money, none of its history, a new account's date.
    expect(cap.balance).toBe(0);
    expect(cap.openedAt).toBe(sim.now);
    expect(sim.universe.transactions.some((t) => t.postings.some((p) => p.accountId === cap.id))).toBe(false);
    expect(cap.awaitingFunds).toBe(1);
    expect(cap.plastic).toMatchObject({ stopped: 'new' });
    // Capital One: 5-7 business days for the card.
    expect((opened.cardAt - sim.now) / MS_DAY).toBeGreaterThanOrEqual(7);
    expect(primary(sim).id).toBe(chase.id);
    // The same bank again is refused, and so is a second click.
    expect(refused(sim, 'bank.open_current', { bankId: 'us-capital-one' })).toMatch(/already have a checking account/);
    sim = reload(sim);
    const sent = run<{ arrivesAt: number }>(sim, 'bank.transfer', { fromId: chase.id, toId: cap.id, amount: 500_00 });
    // Out of Chase now, in neither in between, worth the same throughout.
    expect(sim.universe.accounts[chase.id]!.balance).toBe(chaseBefore - 500_00);
    expect(sim.universe.accounts[cap.id]!.balance).toBe(0);
    expect(inTransitOf(sim, sim.player).balance).toBe(500_00);
    expect(worth(sim)).toBe(before);
    // Chase: 2-3 business days, the longer end taken.
    expect(sent.arrivesAt - sim.now).toBeGreaterThanOrEqual(3 * MS_DAY);
    sim = reload(sim);
    sim.advanceTo(sent.arrivesAt - 60_000);
    expect(sim.universe.accounts[cap.id]!.balance).toBe(0);
    sim.advanceTo(sent.arrivesAt + 60_000);
    expect(sim.universe.accounts[cap.id]!.balance).toBe(500_00);
    expect(sim.universe.accounts[cap.id]!.awaitingFunds).toBeUndefined();
    expect(inTransitOf(sim, sim.player).balance).toBe(0);
    sim.advanceTo(opened.cardAt + 60_000);
    expect(sim.universe.accounts[cap.id]!.plastic?.stopped).toBeUndefined();
    expect(sim.universe.accounts[cap.id]!.plastic?.last4).toBe(cap.plastic!.last4);
  });

  it('reviews a Bank of America application for two business days, its $100 deposit waiting on the decision', () => {
    let sim = student('mv-bofa');
    const chase = primary(sim);
    fund(sim, chase.id, 1_000_00);
    expect(refused(sim, 'bank.open_current', { bankId: 'us-bank-of-america' })).toMatch(/opening deposit of \$100/);
    expect(refused(sim, 'bank.open_current', { bankId: 'us-bank-of-america', fundFrom: chase.id, amount: 50_00 })).toMatch(/\$100/);
    const answer = run<{ decidedAt: number; arrivesAt: number }>(sim, 'bank.open_current', { bankId: 'us-bank-of-america', fundFrom: chase.id, amount: 100_00 });
    expect(at(sim, 'us-bank-of-america')).toBeUndefined();
    expect(applicationsOf(sim, sim.player)).toHaveLength(1);
    expect(refused(sim, 'bank.open_current', { bankId: 'us-bank-of-america', fundFrom: chase.id, amount: 100_00 })).toMatch(/still reviewing/);
    sim = reload(sim);
    sim.advanceTo(answer.decidedAt + 120_000);
    const bofa = at(sim, 'us-bank-of-america')!;
    expect(bofa).toBeDefined();
    // Bank of America's digital card works from the day the account opens, and no plastic is sent after it (until later
    // on 2026-10-12 this said it worked "while the plastic is on its way", which none ever was).
    expect(bofa.plastic?.stopped).toBeUndefined();
    sim.advanceTo(Math.max(answer.arrivesAt, answer.decidedAt) + 2 * MS_DAY);
    expect(sim.universe.accounts[bofa.id]!.balance).toBe(100_00);
  });

  it('sends a deposit back where it came from when the bank turns the application down', () => {
    const sim = student('mv-declined');
    const chase = primary(sim);
    fund(sim, chase.id, 1_000_00);
    const before = chase.balance;
    const answer = run<{ decidedAt: number }>(sim, 'bank.open_current', { bankId: 'us-bank-of-america', fundFrom: chase.id, amount: 100_00 });
    // FIXTURE: the photo ID lapses before the decision, so the bank's identity check fails on the day.
    for (const d of sim.player.documents ?? []) d.expiresAt = sim.now + MS_DAY;
    sim.advanceTo(answer.decidedAt + 10 * MS_DAY);
    expect(at(sim, 'us-bank-of-america')).toBeUndefined();
    expect(sim.universe.notifications.some((n) => n.title === 'Bank of America Turned Down Your Application')).toBe(true);
    expect(inTransitOf(sim, sim.player).balance).toBe(0);
    const back = sim.universe.transactions.find((t) => t.memo.startsWith('Returned'));
    expect(back?.postings.find((p) => p.accountId === chase.id)?.amount).toBe(100_00);
    expect(before).toBeGreaterThan(0);
  });
});

describe('PLAYER JOURNEY: moving the relationship, with school money arriving during it', () => {
  it('moves the primary account, then wages, then orders, then closes Chase, with nothing lost', () => {
    let sim = student('mv-move');
    const chase = primary(sim);
    fund(sim, chase.id, 3_000_00);
    const cap = sim.universe.accounts[run<{ accountId: string }>(sim, 'bank.open_current', { bankId: 'us-capital-one' }).accountId]!;
    const savings = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && !a.closedAt && a.kind === 'savings' && a.bankId === 'us-chase')
      ?? sim.universe.accounts[run<{ accountId: string }>(sim, 'bank.open_savings', {}).accountId]!;
    run(sim, 'bank.add_standing_order', { toId: savings.id, amount: 10_00, day: 28 });
    const order = paymentsOf(sim.player).standingOrders[0]!;
    // Primary moves the card's purchases and bills paid by hand, and nothing already set up.
    const set = run<{ affects: string[]; unchanged: string[] }>(sim, 'bank.set_primary', { accountId: cap.id });
    expect(set.affects).toEqual([...PRIMARY_DOES]);
    expect(set.unchanged.join(' ')).toMatch(/wages/);
    expect(payeeAccount(sim, sim.player).id).toBe(chase.id);
    expect(paymentsOf(sim.player).standingOrders[0]!.fromId).toBe(chase.id);
    // Closing Chase now is refused for each thing still on it.
    expect(refused(sim, 'bank.close_current', { accountId: chase.id, remainderTo: cap.id })).toMatch(/wages and other payments are paid into it/i);
    sim = reload(sim);
    // Wages: from DEPOSIT_LEAD on. A payment before then still goes to Chase.
    const change = run<{ at: number }>(sim, 'bank.redirect_deposits', { accountId: cap.id });
    expect(change.at - sim.now).toBe(DEPOSIT_LEAD.days * MS_DAY);
    expect(payeeAccount(sim, sim.player).id).toBe(chase.id);
    sim.advanceTo(change.at + 60_000);
    expect(payeeAccount(sim, sim.player).id).toBe(cap.id);
    expect(refused(sim, 'bank.close_current', { accountId: chase.id, remainderTo: cap.id })).toMatch(/standing order pays from it/);
    run(sim, 'bank.set_order_source', { orderId: order.id, accountId: cap.id });
    expect(paymentsOf(sim.player).standingOrders[0]!.fromId).toBe(cap.id);
    // A card's autopay stayed on Chase through the primary change, and is moved by hand.
    for (const card of cardsOf(sim, sim.player)) {
      expect(autopaySource(sim, sim.player, card)?.id).toBe(chase.id);
      expect(refused(sim, 'bank.close_current', { accountId: chase.id, remainderTo: cap.id })).toMatch(/autopay pays from it/);
      run(sim, 'card.set_autopay_from', { cardId: card.id, accountId: cap.id });
    }
    // Savings beside it closes first, into Chase's current account, and its order into it goes with it.
    expect(refused(sim, 'bank.close_current', { accountId: chase.id, remainderTo: cap.id })).toMatch(/still open at the same bank/);
    run(sim, 'bank.close_savings', { accountId: savings.id });
    expect(paymentsOf(sim.player).standingOrders).toHaveLength(0);
    sim = reload(sim);
    const before = worth(sim);
    const held = sim.universe.accounts[chase.id]!.balance;
    const closed = run<{ arrivesAt?: number }>(sim, 'bank.close_current', { accountId: chase.id, remainderTo: cap.id });
    expect(sim.universe.accounts[chase.id]!.closedAt).toBe(sim.now);
    expect(worth(sim)).toBe(before);
    // Its history stays.
    expect(sim.universe.transactions.some((t) => t.postings.some((p) => p.accountId === chase.id))).toBe(true);
    if (held > 0) {
      expect(closed.arrivesAt).toBeGreaterThan(sim.now);
      const capBefore = sim.universe.accounts[cap.id]!.balance;
      sim.advanceTo(closed.arrivesAt! + 60_000);
      expect(sim.universe.accounts[cap.id]!.balance - capBefore).toBeGreaterThanOrEqual(held);
    }
    expect(checkingsOf(sim, sim.player).map((a) => a.bankId)).toEqual(['us-capital-one']);
  });

  // Not ported: 1221's student status, school and scholarships are excluded (no Yale-only assumptions).
  it.skip('pays a need-based scholarship into the account wages go to, not the one just made primary', () => {
    // mv-aid3: a seed whose life holds a photo ID (some don't, and no bank opens for them).
    const sim = student('mv-aid3', 'us-chase', { family: undefined, wealth: 'scraping' });
    const chase = primary(sim);
    const cap = sim.universe.accounts[run<{ accountId: string }>(sim, 'bank.open_current', { bankId: 'us-capital-one' }).accountId]!;
    run(sim, 'bank.set_primary', { accountId: cap.id });
    const chaseBefore = chase.balance;
    sim.advanceTo(instantFromZoned({ year: 2026, month: 9, day: 2, hour: 12 }, sim.zone));
    const paid = sim.universe.transactions.filter((t) => t.category === 'scholarship');
    expect(paid.length).toBeGreaterThan(0);
    expect(paid.every((t) => t.postings.some((p) => p.accountId === chase.id))).toBe(true);
    expect(sim.universe.accounts[chase.id]!.balance).toBeGreaterThan(chaseBefore);
  });

  it('keeps a save from before running as it ran: an instruction it never had is pinned before the primary moves', () => {
    let sim = student('mv-legacy');
    const chase = primary(sim);
    const cap = run<{ accountId: string }>(sim, 'bank.open_current', { bankId: 'us-capital-one' }).accountId;
    // FIXTURE: the instructions a save from before 2026-10-10 never had.
    const pay = paymentsOf(sim.player);
    sim.player.payments = { everyday: pay.everyday, linkSavings: pay.linkSavings, standingOrders: pay.standingOrders.map(({ fromId: _f, ...o }) => o) };
    if (sim.player.credit) { delete sim.player.credit.autopayFrom; for (const s of Object.values(sim.player.credit.cards ?? {})) delete s.autopayFrom; }
    sim = reload(sim);
    run(sim, 'bank.set_primary', { accountId: cap });
    expect(payeeAccount(sim, sim.player).id).toBe(chase.id);
    for (const card of cardsOf(sim, sim.player)) expect(autopaySource(sim, sim.player, card)?.id).toBe(chase.id);
  });
});

describe('the exploits the old switch allowed', () => {
  it('can’t send money it doesn’t have, can’t close an account with money on its way, and loses nothing on a closed destination', () => {
    const sim = student('mv-exploit');
    const chase = primary(sim);
    fund(sim, chase.id, 1_000_00);
    const cap = sim.universe.accounts[run<{ accountId: string }>(sim, 'bank.open_current', { bankId: 'us-capital-one' }).accountId]!;
    expect(refused(sim, 'bank.transfer', { fromId: chase.id, toId: cap.id, amount: chase.balance + 1 })).toMatch(/has only/);
    const before = worth(sim);
    const sent = run<{ arrivesAt: number }>(sim, 'bank.transfer', { fromId: chase.id, toId: cap.id, amount: 200_00 });
    expect(worth(sim)).toBe(before);
    run(sim, 'bank.set_primary', { accountId: cap.id });
    // FIXTURE: Chase's savings and wages taken off it by hand, to reach the transfer's own refusal.
    for (const a of Object.values(sim.universe.accounts)) if (a.ownerId === sim.player.id && a.kind === 'savings' && a.bankId === 'us-chase') { a.closedAt = sim.now; }
    sim.player.payments = { ...paymentsOf(sim.player), depositTo: cap.id };
    const kept = worth(sim);
    expect(refused(sim, 'bank.close_current', { accountId: chase.id, remainderTo: cap.id })).toMatch(/on its way/);
    expect(transfersOf(sim, sim.player)).toHaveLength(1);
    // FIXTURE: the destination closed behind it (by hand), so the money has nowhere to land.
    sim.universe.accounts[cap.id]!.closedAt = sim.now;
    sim.player.primaryAccountId = chase.id;
    sim.advanceTo(sent.arrivesAt + 60_000);
    expect(inTransitOf(sim, sim.player).balance).toBe(0);
    // Worth what it was, less the days' living.
    expect(worth(sim) - kept).toBeGreaterThan(-5_000_00);
    expect(sim.universe.transactions.find((t) => t.memo.startsWith('Returned'))?.postings.find((p) => p.accountId === chase.id)?.amount).toBe(200_00);
    expect(sim.universe.notifications.some((n) => n.title === 'A Transfer Came Back')).toBe(true);
  });

  it('keeps Citi’s published limits: $10,000 a day to other banks', () => {
    const sim = student('mv-citi', 'us-chase', { family: undefined });
    const chase = primary(sim);
    const citi = sim.universe.accounts[run<{ accountId: string }>(sim, 'bank.open_current', { bankId: 'us-citi' }).accountId]!;
    fund(sim, citi.id, 30_000_00);
    run(sim, 'bank.transfer', { fromId: citi.id, toId: chase.id, amount: 9_000_00 });
    expect(refused(sim, 'bank.transfer', { fromId: citi.id, toId: chase.id, amount: 2_000_00 })).toMatch(/Citi lets you send \$10,000 a day to other banks/);
    // Chase publishes no limit, so sending into Citi isn't held to one.
    fund(sim, chase.id, 30_000_00);
    run(sim, 'bank.transfer', { fromId: chase.id, toId: citi.id, amount: 20_000_00 });
  });

  it('closes an unfunded Capital One account after its 60 days, the money it never held nowhere to lose', () => {
    const sim = student('mv-unfunded');
    const cap = run<{ accountId: string }>(sim, 'bank.open_current', { bankId: 'us-capital-one' }).accountId;
    sim.advanceTo(sim.now + 59 * MS_DAY);
    expect(sim.universe.accounts[cap]!.closedAt).toBeUndefined();
    sim.advanceTo(sim.now + 2 * MS_DAY);
    expect(sim.universe.accounts[cap]!.closedAt).toBeDefined();
  });
});

describe('a country with a switching service', () => {
  it('still switches in Britain, in CASS’s seven working days', () => {
    const sim = quickSave({ startLocationId: 'uk-eng-london', homeRegionId: 'uk-eng-london', livesWhereBorn: true, bankId: 'gb-barclays' }, 'mv-gb');
    const answer = run<{ at: number }>(sim, 'bank.switch', { bankId: 'gb-hsbc' });
    expect(answer.at - sim.now).toBeGreaterThanOrEqual(7 * MS_DAY);
    // A transfer between two British banks arrives at once, by Faster Payments.
    const hsbc = sim.universe.accounts[run<{ accountId: string }>(sim, 'bank.open_current', { bankId: 'gb-natwest' }).accountId]!;
    fund(sim, primary(sim).id, 100_00);
    const sent = run<{ arrivesAt: number }>(sim, 'bank.transfer', { fromId: primary(sim).id, toId: hsbc.id, amount: 100_00 });
    expect(sent.arrivesAt).toBe(sim.now);
    expect(sim.universe.accounts[hsbc.id]!.balance).toBe(100_00);
  });
});
