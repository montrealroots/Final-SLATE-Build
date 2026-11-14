/**
 * Brief 20's D2: a card's limit held to the holder's ability to pay (docs/verification/audit-2026-10-21/criteria.md).
 * Until 2026-10-21 the six-monthly review raised a limit a fifth for a score of 700 and no late payment in a year,
 * whatever the holder earned or held, and an ask could be made again at once, so every life brief 19 played reached six
 * figures (life A's Chase card $194,736 by October 2029, on a student's income). Now both are held to Regulation Z
 * §1026.51(a): the minimum on the whole new limit, with what's already owed each month, within a quarter of a month's
 * income over the past year (`PAYMENTS_SHARE`), or the new limit and the rest owed covered by what's in the bank; and an
 * ask waits six months from the card's opening and from the last ask or raise (`ASK_EVERY`).
 *
 * TEST SETUP, in every test: the record's score and its late payments, and the review's last date, set by hand (the
 * inputs the review reads, as tests/cardlife.test.ts sets them); wages recorded as paychecks into the earnings record for
 * the months before (the income the bank reads); and the bank's balances set by hand (the assets it reads). Never the
 * limit, which is the consequence under test.
 */
import { describe, expect, it } from 'vitest';
import { loadSave, quickSave } from '../../src/engine/bankworld';
import { deserialise, serialise } from '../../src/engine/bankworld/persistence/adapter';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY, zonedParts } from '../../src/engine/bankworld/core/time';
import { cardOf, cardTerms, monthlyIncome, PAYMENTS_SHARE, STATEMENT_KIND } from '../../src/engine/bankworld/systems/credit';
import { ASK_EVERY } from '../../src/engine/bankworld/systems/cardlife';
import { earningsOf, recordWages } from '../../src/engine/bankworld/systems/earnings';

const NY = 'us-ny-newyork';
const life = (seed: string, extra: Record<string, unknown> = {}) => quickSave({ startLocationId: NY, homeRegionId: NY, livesWhereBorn: true, wealth: 'modest', ...extra }, seed);
const card = (sim: Simulation) => cardOf(sim, sim.player)!;
const ask = (sim: Simulation, limit: number) => sim.execute({ kind: 'card.request_limit', payload: { limit, accountId: card(sim).id } });
const give = (sim: Simulation, accountId: string, amount: number) => sim.post({ memo: 'test', category: 'test', postings: [{ accountId, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });
const fifthMore = (limit: number) => Math.round((limit * 1.2) / 100) * 100;
const notes = (sim: Simulation, title: string) => Object.values(sim.universe.notifications).filter((n) => n.title === title).map((n) => n.body);

/** TEST SETUP: the bank's balances set to `held` in all, in the current account, and nothing owed on the card. */
function holding(sim: Simulation, held: number): void {
  const accounts = Object.values(sim.universe.accounts).filter((a) => a.ownerId === sim.player.id && !a.nominal && !a.closedAt && (a.kind === 'checking' || a.kind === 'savings'));
  for (const a of accounts) if (a.balance !== 0) give(sim, a.id, -a.balance);
  give(sim, sim.player.primaryAccountId!, held);
  const c = card(sim);
  if (c.balance < 0) give(sim, c.id, -c.balance);
}

/**
 * TEST SETUP: a paycheck of `monthly` recorded in this month and each of the twelve before it, as the payroll records one,
 * so the twelve months a review reads are paid whether its statement falls in this month or the next.
 */
function earning(sim: Simulation, monthly: number): void {
  const now = zonedParts(sim.now, sim.homeZone);
  for (let back = 0; back <= 12; back += 1) {
    const at = Date.UTC(now.year, now.month - 1 - back, 15, 17);
    const m = zonedParts(at, sim.homeZone);
    if (earningsOf(sim.player).months[`${m.year}-${String(m.month).padStart(2, '0')}`]) continue;
    recordWages(sim.player, at, sim.homeZone, { gross: monthly, employer: 'Test Payroll' });
  }
}

/** TEST SETUP: a clean record of 800, its review due; then the clock run past the next statement, where the review is. */
function review(sim: Simulation): void {
  const credit = sim.player.credit!;
  credit.score = 800;
  credit.late = [];
  credit.reviewedAt = sim.now - 200 * MS_DAY;
  const next = sim.timeline.pending().find((i) => i.kind === STATEMENT_KIND && i.payload.personId === sim.player.id)!.at;
  sim.advanceTo(next + 1000);
}

describe('the six-monthly review, held to income or savings', () => {
  it('raises a fifth for a holder whose income covers the payments, and nothing for a twin with the same record and no income or savings', () => {
    const earner = life('b20-d2-income');
    const twin = life('b20-d2-income');
    for (const sim of [earner, twin]) holding(sim, 500_00);
    earning(earner, 4_000_00);
    const was = card(earner).creditLimit!;
    expect(card(twin).creditLimit).toBe(was);
    review(earner);
    review(twin);
    // The relevant side: income of $4,000 a month leaves $1,000 to spare, and a fifth more on a limit this size asks far less.
    expect(card(earner).creditLimit).toBe(fifthMore(was));
    expect(notes(earner, 'Your Card Limit Went Up').at(-1)).toBe(`The ${card(earner).name}’s limit is $${(fifthMore(was) / 100).toLocaleString('en-US')}.00 now, because your credit score is 700 or more, you haven’t paid late in the past year, and your income or savings cover the payments on it.`);
    // The same record, nothing earned, $500 in the bank: the limit stays, and nothing says it went up.
    expect(card(twin).creditLimit).toBe(was);
    expect(notes(twin, 'Your Card Limit Went Up')).toEqual([]);
  });

  it('raises a fifth for a holder with no income whose savings cover the new limit and all they owe, and not for one whose savings don’t', () => {
    const saver = life('b20-d2-assets');
    const short = life('b20-d2-assets');
    const was = card(saver).creditLimit!;
    // Each with the month's spending to come before the statement: $5,000 over the new limit, and $5,000 under it.
    holding(saver, fifthMore(was) + 5_000_00);
    holding(short, fifthMore(was) - 5_000_00);
    review(saver);
    review(short);
    expect(card(saver).creditLimit).toBe(fifthMore(was));
    expect(card(short).creditLimit).toBe(was);
  });

  it('stops where the income stops covering it: review after review on $2,000 a month, the limit rises to the last dollar the minimum payment on it fits a quarter of, and no further', () => {
    const sim = life('b20-d2-ceiling');
    // $3,000 in the bank to pay the card each month from, under any limit here, so only the income can carry a raise.
    holding(sim, 3_000_00);
    const limits: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      earning(sim, 2_000_00);
      holding(sim, 3_000_00);
      review(sim);
      limits.push(card(sim).creditLimit!);
    }
    expect(monthlyIncome(sim, sim.player)).toBe(2_000_00);
    // An independent reading of the Chase card's minimum (1% and the month's interest, or $40 if more) at the rate it
    // charges now, its introductory months over: the most whole dollars whose minimum fits a quarter of $2,000.
    const terms = cardTerms(sim, card(sim), 800);
    expect(terms.apr).toBeGreaterThan(0);
    const perDollar = terms.minimumShare + (terms.minimumPlusInterest ? terms.apr / 12 : 0);
    const ceiling = Math.floor((2_000_00 * PAYMENTS_SHARE) / perDollar / 100) * 100;
    // At the ceiling, within a dollar of the minimum's own rounding to the cent.
    expect(Math.max(...limits)).toBeLessThanOrEqual(ceiling);
    expect(Math.max(...limits)).toBeGreaterThanOrEqual(ceiling - 1_00);
    // It rose to get there, and once there it stays: the last three reviews raise nothing.
    expect(limits[0]).toBeLessThan(Math.max(...limits));
    expect(new Set(limits.slice(-3)).size).toBe(1);
    expect(limits.at(-1)).toBe(Math.max(...limits));
  });
});

describe('asking for a higher limit', () => {
  it('waits six months from the last raise, the way the bank says, and is granted once it has passed; ten asks in a row raise it once', () => {
    const sim = life('b20-d2-ask');
    // The review left out, so only the asks raise it.
    expect(sim.execute({ kind: 'card.set_auto_raise', payload: { on: false } }).ok).toBe(true);
    // $3,000 to pay the card from while six months pass, under the limit, so only the income can carry a raise.
    holding(sim, 3_000_00);
    earning(sim, 6_000_00);
    sim.player.credit!.score = 800;
    sim.player.credit!.late = [];
    const was = card(sim).creditLimit!;
    const first = ask(sim, was * 10);
    expect(first.ok).toBe(true);
    expect(card(sim).creditLimit).toBe(fifthMore(was));
    for (let i = 0; i < 9; i += 1) {
      const again = ask(sim, was * 10);
      expect(again.ok).toBe(false);
      expect(again.error).toMatch(/^The bank looks at a higher limit six months after it last raised your limit, so you can ask from [A-Z][a-z]+ \d{1,2}, \d{4}\.$/);
    }
    expect(card(sim).creditLimit).toBe(fifthMore(was));
    // Six months on, the ask is looked at again, and the income still covers a fifth more.
    sim.advanceBy(ASK_EVERY);
    earning(sim, 6_000_00);
    holding(sim, 3_000_00);
    expect(ask(sim, was * 10).ok).toBe(true);
    expect(card(sim).creditLimit).toBe(fifthMore(fifthMore(was)));
  });

  it('is declined, in the bank’s own words, for a holder with no income or savings to cover it, and the ask counts: the next waits six months, across a save and a load', () => {
    const sim = life('b20-d2-declined');
    holding(sim, 0);
    sim.player.credit!.score = 800;
    sim.player.credit!.late = [];
    const was = card(sim).creditLimit!;
    const answer = ask(sim, was * 2);
    expect(answer.ok).toBe(true);
    expect((answer.value as { granted: boolean }).granted).toBe(false);
    expect(card(sim).creditLimit).toBe(was);
    expect(notes(sim, 'Limit Increase Declined').at(-1)).toBe(`The bank kept your limit at $${(was / 100).toLocaleString('en-US')}.00. It raises a limit only with a credit score of 700 or more, no late payment in the last year, and income or savings that cover the payments on a higher one.`);
    const opened = loadSave(deserialise(serialise(sim.universe)) as never);
    const again = opened.execute({ kind: 'card.request_limit', payload: { limit: was * 2, accountId: card(opened).id } });
    expect(again.ok).toBe(false);
    expect(again.error).toMatch(/six months after you last asked/);
  });

  it('waits six months from a raise the review gave, as from one asked for', () => {
    const sim = life('b20-d2-after-review');
    holding(sim, 3_000_00);
    earning(sim, 6_000_00);
    const was = card(sim).creditLimit!;
    review(sim);
    expect(card(sim).creditLimit).toBe(fifthMore(was));
    const answer = ask(sim, was * 10);
    expect(answer.ok).toBe(false);
    expect(answer.error).toMatch(/^The bank looks at a higher limit six months after it last raised your limit, so you can ask from /);
  });

  it('waits six months from a new card’s opening', () => {
    const sim = life('b20-d2-new');
    holding(sim, 20_000_00);
    sim.player.credit!.score = 800;
    // A second bank's card, applied for and arrived a week on.
    const applied = sim.execute({ kind: 'card.apply', payload: { bankId: 'us-citi' } });
    expect(applied.ok, applied.error).toBe(true);
    sim.advanceBy(8 * MS_DAY);
    const fresh = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.kind === 'credit_card' && !a.closedAt && a.bankId === 'us-citi')!;
    expect(fresh).toBeDefined();
    const answer = sim.execute({ kind: 'card.request_limit', payload: { limit: (fresh.creditLimit ?? 0) * 2, accountId: fresh.id } });
    expect(answer.ok).toBe(false);
    expect(answer.error).toMatch(/^The bank looks at a higher limit six months after the card opened, so you can ask from /);
  });

  it('a lower limit is granted at once, wait or no wait, and the holder’s title, a thing the bank never reads, changes nothing', () => {
    const actress = life('b20-d2-lower', { pronouns: 'she/her' });
    const actor = life('b20-d2-lower', { pronouns: 'he/him' });
    for (const sim of [actress, actor]) { holding(sim, 0); earning(sim, 6_000_00); sim.player.credit!.score = 800; sim.player.credit!.late = []; }
    const was = card(actress).creditLimit!;
    for (const sim of [actress, actor]) {
      expect(ask(sim, was * 2).ok).toBe(true);
      expect(ask(sim, 1_000_00).ok).toBe(true);
    }
    expect(card(actress).creditLimit).toBe(1_000_00);
    expect(card(actor).creditLimit).toBe(card(actress).creditLimit);
  });
});
