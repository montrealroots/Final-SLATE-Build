/**
 * Each card's own offers (`systems/cardoffers.ts`): module 8 of
 * `docs/BANKING-FUNCTIONS.md`, against the cards' researched terms.
 */
import { describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY, startOfNextDay } from '../../src/engine/bankworld/core/time';
import { cardOf, cardTerms, DUE_KIND, minimumDue, STATEMENT_KIND } from '../../src/engine/bankworld/systems/credit';
import { allocatePayment } from '../../src/engine/bankworld/systems/cash';
import { planLeftOf } from '../../src/engine/bankworld/systems/cardoffers';
import { payingTheMinimum } from '../../src/engine/bankworld/systems/statements';
import { spend } from '../../src/engine/bankworld/systems/spending';

const lifeIn = (cityId: string, extra: Record<string, unknown> = {}, seed = 'co') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, wealth: 'comfortable', ...extra }, seed);
const card = (sim: Simulation) => cardOf(sim, sim.player)!;
const run = (sim: Simulation, kind: string, payload: Record<string, unknown> = {}) => sim.execute({ kind, payload });
const give = (sim: Simulation, accountId: string, amount: number) => sim.post({ memo: 'test', category: 'test', postings: [{ accountId, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });
const nextStatement = (sim: Simulation) => sim.timeline.pending().find((i) => i.kind === STATEMENT_KIND && i.payload.personId === sim.player.id)!.at;
const nextDue = (sim: Simulation) => sim.timeline.pending().find((i) => i.kind === DUE_KIND && i.payload.personId === sim.player.id)?.at;
function broke(sim: Simulation): void {
  for (const a of Object.values(sim.universe.accounts)) {
    if (a.ownerId !== sim.player.id || a.nominal || a.closedAt || (a.kind !== 'checking' && a.kind !== 'savings')) continue;
    if (a.balance !== 0) give(sim, a.id, -a.balance);
  }
}

describe('the research', () => {
  it('reaches Bank of Ireland’s and KB Kookmin’s cards, which it had filed under other names', () => {
    for (const [city, bankId] of [['ie-lei-dublin', 'ie-bank-of-ireland'], ['kr-11-seoul', 'kr-kb-kookmin']] as const) {
      const sim = lifeIn(city, { bankId }, `co-${bankId}`);
      const terms = cardTerms(sim, card(sim), 700);
      expect(terms.bankId).toBe(bankId);
      expect(terms.estimated).not.toContain('cashAdvance');
    }
  });
});

describe('an introductory rate', () => {
  it('runs Chase’s 0% for fifteen months from opening, then the card’s own rate', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-intro');
    const c = card(sim);
    const terms = cardTerms(sim, c, 700);
    expect(terms.apr).toBe(0);
    expect(terms.standardApr).toBeGreaterThan(0.18);
    expect(Math.round((terms.introUntil! - c.openedAt) / (30.44 * MS_DAY))).toBe(15);
    c.openedAt -= 16 * 30.44 * MS_DAY;
    const after = cardTerms(sim, c, 700);
    expect(after.apr).toBe(terms.standardApr);
    expect(after.standardApr).toBeUndefined();
  });

  it('charges nothing on a balance carried during it', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-intro-carry');
    const c = card(sim);
    give(sim, c.id, -c.balance - 2_000_00);
    sim.player.credit!.carrying = true;
    sim.advanceTo(nextStatement(sim) + 1000);
    expect(sim.player.credit!.statementInterest ?? 0).toBe(0);
  });

  /** Until brief 21 (2026-10-22) at the second due date missed, about 30 days late, with no notice. */
  it('ends on a US card 45 days after the notice a minimum more than 60 days late brings', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase', wealth: 'scraping' }, 'co-intro-late');
    const c = card(sim);
    // A new card, its fifteen months ahead of it.
    c.openedAt = sim.now;
    give(sim, c.id, -c.balance - 500_00);
    for (let i = 0; i < 2; i += 1) {
      let due = nextDue(sim);
      while (due === undefined) { sim.advanceTo(nextStatement(sim) + 1000); due = nextDue(sim); }
      broke(sim);
      sim.advanceTo(due + 1000);
      expect(sim.player.credit!.introLost).toBeUndefined();
    }
    const first = sim.player.credit!.pastDue![0]!.at;
    const to = (days: number) => { while (sim.now < first + days * MS_DAY) { broke(sim); sim.advanceTo(Math.min(first + days * MS_DAY, sim.now + MS_DAY)); } };
    to(61);
    const ends = sim.player.credit!.introEndsAt!;
    expect(ends - startOfNextDay(first + 60 * MS_DAY, sim.homeZone)).toBe(45 * MS_DAY);
    expect(cardTerms(sim, c, sim.player.credit!.score).apr).toBe(0);
    sim.advanceTo(ends + 1000);
    expect(sim.player.credit!.introLost).toBe(true);
    expect(cardTerms(sim, c, sim.player.credit!.score).apr).toBeGreaterThan(0.18);
  });

  it('is counted for its months and the card’s own rate after, in the statement’s warning', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-intro-warn');
    const c = card(sim);
    const intro = cardTerms(sim, c, 700);
    const during = payingTheMinimum(sim, 5_000_00, intro);
    const standard = payingTheMinimum(sim, 5_000_00, { ...intro, apr: intro.standardApr!, standardApr: undefined, introUntil: undefined });
    if (during === 'never' || standard === 'never') throw new Error('never');
    expect(during.total).toBeLessThan(standard.total);
    expect(during.threeYears).toBeLessThan(standard.threeYears);
    expect(during.threeYears).toBeGreaterThan(Math.ceil(5_000_00 / 36));
  });
});

describe('a balance transfer', () => {
  it('moves a Chase card’s balance onto Citi’s card after switching, for Citi’s fee, at 0% for eighteen months', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-bt');
    const old = card(sim);
    give(sim, old.id, -old.balance - 800_00);
    // Banking at Citi now: an account opened there and made primary (a US switch has no service to run, from 2026-10-10).
    sim.must({ kind: 'bank.set_primary', payload: { accountId: sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'us-citi' } }).accountId } });
    sim.advanceBy(10 * MS_DAY);
    expect(card(sim).bankId).toBe('us-chase');
    const score = sim.player.credit!.score;
    expect(run(sim, 'card.apply', { transfer: true }).ok).toBe(true);
    expect(sim.player.credit!.score).toBeLessThan(score);
    expect(sim.player.credit!.closing).toBeDefined();
    const owed = -old.balance;
    sim.advanceBy(8 * MS_DAY);
    const moved = card(sim);
    expect(moved.bankId).toBe('us-citi');
    // Printed with its own last four, not ···0000.
    expect(moved.last4).toMatch(/^\d{4}$/);
    expect(moved.last4).not.toBe('0000');
    expect(moved.last4).not.toBe(old.last4);
    expect(old.closedAt).toBeDefined();
    expect(old.balance).toBe(0);
    const fee = Math.max(5_00, Math.round(owed * 0.05));
    const transfer = sim.player.credit!.transfers![0]!;
    expect(transfer).toMatchObject({ kind: 'balance', introApr: 0 });
    expect(transfer.owed).toBeGreaterThanOrEqual(owed + fee);
    expect(Math.round((transfer.introUntil! - moved.openedAt) / (30.44 * MS_DAY))).toBe(18);
    expect(transfer.accrued).toBe(0);
    expect(sim.player.credit!.closing).toBeUndefined();
  });

  it('isn’t made where the new limit won’t take it with its fee, before the bank looks', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-bt-big');
    const old = card(sim);
    give(sim, old.id, -old.balance - 100_000_00);
    sim.must({ kind: 'bank.set_primary', payload: { accountId: sim.must<{ accountId: string }>({ kind: 'bank.open_current', payload: { bankId: 'us-citi' } }).accountId } });
    sim.advanceBy(10 * MS_DAY);
    const score = sim.player.credit!.score;
    expect(run(sim, 'card.apply', { transfer: true }).ok).toBe(false);
    expect(sim.player.credit!.score).toBe(score);
    // A second card from the bank already issuing one is refused; until 2026-09-28 any second card was.
    expect(run(sim, 'card.apply', { bankId: 'us-chase' }).error).toMatch(/already/);
    const same = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-bt-same');
    give(same, card(same).id, -card(same).balance - 100_00);
    expect(run(same, 'card.apply', { transfer: true }).error).toMatch(/another bank/);
  });
});

describe('a money transfer', () => {
  it('pays NatWest’s card into the current account for 3%, at its transfer rate from the day it’s made', () => {
    const sim = lifeIn('uk-eng-london', { bankId: 'gb-natwest' }, 'co-mt');
    const c = card(sim);
    const current = sim.universe.accounts[sim.player.primaryAccountId!]!;
    const before = current.balance;
    const owedBefore = -c.balance;
    sim.must({ kind: 'card.money_transfer', payload: { amount: 500_00 } });
    expect(current.balance - before).toBe(500_00);
    expect(-c.balance - owedBefore).toBe(515_00);
    const transfer = sim.player.credit!.transfers!.at(-1)!;
    expect(transfer).toMatchObject({ kind: 'money', owed: 515_00, apr: 0.129 });
    const credit = sim.player.credit!;
    credit.carrying = true;
    credit.accrued = 0;
    const purchases = -c.balance - 515_00;
    sim.advanceBy(MS_DAY);
    expect(transfer.accrued).toBeCloseTo(515_00 * 0.129 / 365, 0);
    // Purchases' interest leaves the transfer out.
    expect(credit.accrued).toBeCloseTo(purchases * cardTerms(sim, c, credit.score).apr / 365, 0);
    sim.advanceTo(nextStatement(sim) + 1000);
    const charged = sim.universe.transactions.find((t) => t.memo === 'Money transfer interest')!;
    expect(transfer.owed).toBe(515_00 - charged.postings.find((p) => p.accountId === c.id)!.amount);
    const chase = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-mt-chase');
    expect(run(chase, 'card.money_transfer', { amount: 100_00 }).error).toMatch(/doesn’t offer money transfers/);
  });
});

describe('a plan', () => {
  it('pays a Chase purchase off in equal months for 1.72% a month, asked in the minimum, and draws no interest', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-plan');
    const c = card(sim);
    c.openedAt -= 16 * 30.44 * MS_DAY;
    give(sim, c.id, -c.balance - 10_000_00);
    expect(run(sim, 'card.plan', { amount: 6_000_00, months: 4 }).ok).toBe(false);
    expect(run(sim, 'card.plan', { amount: 11_000_00, months: 3 }).ok).toBe(false);
    sim.must({ kind: 'card.plan', payload: { amount: 6_000_00, months: 3 } });
    const credit = sim.player.credit!;
    expect(credit.plans).toEqual([{ left: 6_000_00, monthly: 2_000_00, fee: 103_20, monthsLeft: 3 }]);
    credit.carrying = true;
    credit.accrued = 0;
    sim.advanceBy(MS_DAY);
    // Interest on the $4,000 outside the plan only.
    const terms = cardTerms(sim, c, credit.score);
    expect(credit.accrued).toBeCloseTo(4_000_00 * terms.apr / 365, 0);
    sim.advanceTo(nextStatement(sim) + 1000);
    expect(credit.statementPlanDue).toBe(2_103_20);
    expect(planLeftOf(credit)).toBe(4_000_00);
    expect(sim.universe.transactions.some((t) => t.memo === 'Plan fee')).toBe(true);
    // The plan's month in full, and the card's share of the rest.
    const rest = Math.round((credit.statementBalance - 2_103_20) * terms.minimumShare) + (terms.minimumPlusInterest ? credit.statementInterest ?? 0 : 0);
    expect(minimumDue(sim, credit.statementBalance, terms, credit.statementInterest ?? 0, credit.statementPlanDue)).toBe(Math.max(terms.minimumFloor, rest) + 2_103_20);
    const nat = lifeIn('uk-eng-london', { bankId: 'gb-natwest' }, 'co-plan-gb');
    expect(run(nat, 'card.plan', { amount: 100_00, months: 3 }).error).toMatch(/No payment plan terms were found/);
  });
});

describe('a plan charged as interest', () => {
  it('pays a Bank of Ireland purchase off in equal months at 6.7%, from €250, over its own lengths', () => {
    const sim = lifeIn('ie-lei-dublin', { bankId: 'ie-bank-of-ireland' }, 'co-plan-boi');
    const c = card(sim);
    give(sim, c.id, -c.balance - 2_000_00);
    expect(run(sim, 'card.plan', { amount: 1_000_00, months: 3 }).error).toMatch(/6, 12 or 24 months/);
    expect(run(sim, 'card.plan', { amount: 200_00, months: 12 }).error).toMatch(/at least/);
    sim.must({ kind: 'card.plan', payload: { amount: 1_000_00, months: 12 } });
    const credit = sim.player.credit!;
    const plan = credit.plans![0]!;
    const r = 0.067 / 12;
    expect(plan.apr).toBe(0.067);
    expect(plan.monthly).toBe(Math.ceil(1_000_00 * r / (1 - (1 + r) ** -12)));
    sim.advanceTo(nextStatement(sim) + 1000);
    // The month's interest on the whole, and the rest of the equal month off it.
    const interest = sim.universe.transactions.find((t) => t.memo === 'Plan interest')!;
    expect(interest.postings.find((p) => p.accountId === c.id)!.amount).toBe(-Math.round(1_000_00 * r));
    expect(credit.statementPlanDue).toBe(plan.monthly);
    expect(planLeftOf(credit)).toBe(1_000_00 - (plan.monthly - Math.round(1_000_00 * r)));
  });
});

describe('a payment to the card', () => {
  it('goes to the dearest balance first and a plan last, a US minimum to the cheapest', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-alloc');
    const c = card(sim);
    const credit = sim.player.credit!;
    // $200 cash at 20%, $300 transferred at 0%, $400 in a plan, $100 of purchases at 29%.
    give(sim, c.id, -c.balance - 1_000_00);
    credit.cashOwed = 200_00;
    credit.transfers = [{ kind: 'balance', owed: 300_00, accrued: 0, apr: 0 }];
    credit.plans = [{ left: 400_00, monthly: 100_00, fee: 0, monthsLeft: 4 }];
    // $350 against a $150 minimum: the $150 to the cheapest, the transfer, then $200 to the dearest, purchases' $100 and then cash.
    give(sim, c.id, 350_00);
    allocatePayment(sim, sim.player, c, 350_00, 150_00, { cash: 0.2, purchases: 0.29 });
    expect(credit.cashOwed).toBe(100_00);
    expect(credit.transfers).toEqual([{ kind: 'balance', owed: 150_00, accrued: 0, apr: 0 }]);
    expect(planLeftOf(credit)).toBe(400_00);
    // Paid off entirely, the plan goes too.
    give(sim, c.id, 650_00);
    allocatePayment(sim, sim.player, c, 650_00, 0, { cash: 0.2, purchases: 0.29 });
    expect(credit.cashOwed).toBe(0);
    expect(credit.transfers).toEqual([]);
    expect(credit.plans).toEqual([]);
  });
});

describe('rewards', () => {
  it('pays CIBC’s 2% on groceries and 1% on bills at the statement, and 0.5% on the rest', () => {
    const sim = lifeIn('ca-on-toronto', { bankId: 'ca-cibc' }, 'co-bonus');
    const c = card(sim);
    give(sim, c.id, -c.balance);
    sim.player.credit!.rewardsFrom = sim.now;
    sim.must({ kind: 'bank.set_payments', payload: { everyday: 'credit' } });
    spend(sim, sim.player, 200_00, 'Groceries', 'food');
    const from = sim.player.credit!.rewardsFrom!;
    sim.advanceTo(nextStatement(sim) + 1000);
    const on = (cats: string[] | null) => sim.universe.transactions.filter((t) => t.at >= from && t.at < sim.now && !['interest', 'fees', 'cash', 'test', 'card-payment', 'transfer'].includes(t.category) && (cats === null ? !['food', 'bills'].includes(t.category) : cats.includes(t.category)))
      .reduce((sum, t) => sum + t.postings.filter((p) => p.accountId === c.id && p.amount < 0).reduce((a, p) => a - p.amount, 0), 0);
    expect(on(['food'])).toBeGreaterThanOrEqual(200_00);
    expect(sim.player.credit!.rewards).toBe(Math.round(on(['food']) * 0.02 + on(['bills']) * 0.01 + on(null) * 0.005));
  });


  it('pays Chase’s 1.5% on purchases at the statement, not on cash, and redeems onto the card', () => {
    const sim = lifeIn('us-ny-newyork', { bankId: 'us-chase' }, 'co-rewards');
    const c = card(sim);
    give(sim, c.id, -c.balance);
    sim.player.credit!.rewardsFrom = sim.now;
    sim.must({ kind: 'bank.set_payments', payload: { everyday: 'credit' } });
    spend(sim, sim.player, 200_00, 'Groceries', 'food');
    sim.must({ kind: 'cash.withdraw', payload: { amount: 100_00, from: 'card' } });
    const from = sim.player.credit!.rewardsFrom!;
    sim.advanceTo(nextStatement(sim) + 1000);
    const purchases = sim.universe.transactions.filter((t) => t.at >= from && t.at < sim.now && !['interest', 'fees', 'cash', 'test'].includes(t.category))
      .reduce((sum, t) => sum + t.postings.filter((p) => p.accountId === c.id && p.amount < 0).reduce((a, p) => a - p.amount, 0), 0);
    expect(purchases).toBeGreaterThanOrEqual(200_00);
    const rewards = sim.player.credit!.rewards!;
    expect(rewards).toBe(Math.round(purchases * 0.015));
    const before = c.balance;
    sim.must({ kind: 'card.redeem_rewards', payload: {} });
    expect(c.balance - before).toBe(rewards);
    expect(sim.player.credit!.rewards).toBe(0);
    expect(run(sim, 'card.redeem_rewards').ok).toBe(false);
    // The next statement counts only its own cycle.
    const next = sim.now;
    sim.advanceTo(nextStatement(sim) + 1000);
    const cycle = sim.universe.transactions.filter((t) => t.at >= next && t.at < sim.now && !['interest', 'fees', 'cash', 'test', 'rewards', 'card-payment'].includes(t.category))
      .reduce((sum, t) => sum + t.postings.filter((p) => p.accountId === c.id && p.amount < 0).reduce((a, p) => a - p.amount, 0), 0);
    expect(sim.player.credit!.rewards).toBe(Math.round(cycle * 0.015));
  });
});
