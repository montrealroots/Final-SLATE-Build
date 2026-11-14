/**
 * The Statements tab’s least to pay on a hardship plan (`ui/bank/BankStatements.tsx`), found by the guide’s audit of
 * 2026-10-13: until that day the tab gave the card’s own minimum, kept with the statement (`CardState.issued`), while the
 * due date judges the plan’s payment (`autopayAsk`), so a holder on a $100 plan who paid the $48 the tab asked was
 * charged the late fee. The guide’s Ask For Help With Payments and late-fee lines (`content/guide/money.ts`) send the
 * player to that tab.
 *
 * PLAYER JOURNEY: a new life (`createSave` with `newLifeConfig`), Ada Cole of New Haven, at Yale, banking at Chase (the
 * Freedom Unlimited at 0% until 20 October 2026, 1% of the statement plus the month’s interest and never under $40 as its
 * minimum, due 21 days after the statement on the 20th), starting Monday 24 August 2026 at 7:30 AM; and her twin, the
 * same life with no plan.
 *
 * TEST SETUP, said again where it’s done: $4,800 of purchases put on the card against a test line; the checking set to
 * $3,000 and the savings emptied against a test equity line, so the bank can’t clear the card and the plan is granted;
 * the account and period chosen on the screen, which a static render can’t click to; and every current and savings
 * account emptied the minute before the due date.
 */
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import type { Account } from '../../src/engine/bankworld/core/ledger';
import { newLifeConfig } from '../../src/engine/bankworld/world/bootstrap';
import { stateOf } from '../../src/engine/bankworld/systems/credit';

const h = vi.hoisted(() => ({
  sim: undefined as unknown as import('../../src/engine/bankworld/core/simulation').Simulation,
  /** TEST SETUP: what each useState starts at, in render order, in place of its own initial value. */
  states: [] as unknown[],
}));

// Without the original: it imports the looks, which import it back, and would get the original’s hooks.
vi.mock('../../src/ui/bankworld/app/game-context', () => {
  const noop = () => undefined;
  const game = () => new Proxy({
    get sim() { return h.sim; },
    version: 0,
    run: (kind: string, payload: Record<string, unknown> = {}) => h.sim.execute({ kind, payload }),
    toast: noop,
  } as Record<string, unknown>, { get: (t, k) => (k in t ? t[k as string] : noop) });
  return { useGame: () => game(), useWorld: <T,>(read: (s: Simulation) => T) => read(h.sim) };
});

vi.mock('react', async (orig) => {
  const real = await orig<typeof import('react')>();
  const useState = ((initial: unknown) => {
    const [value, set] = real.useState(initial);
    return h.states.length === 0 ? [value, set] : [h.states.shift(), set];
  }) as typeof real.useState;
  return { ...real, default: { ...real, useState }, useState };
});

const { BankStatements } = await import('../../src/ui/bankworld/ui/bank/BankStatements');

const NEW_HAVEN = 'us-ct-newhaven';
/** The life a new player lives: Ada Cole of New Haven, at Yale, banking at Chase. */
const student = (seed: string): Simulation => createSave(1, seed, {
  ...newLifeConfig(), homeRegionId: NEW_HAVEN, firstName: 'Ada', lastName: 'Cole', pronouns: 'she/her',
});
/** New Haven’s clock in Eastern Daylight Time (UTC−4), worked out here: in force until 1 November 2026. */
const edt = (y: number, m: number, d: number, hour: number, min = 0) => Date.UTC(y, m - 1, d, hour + 4, min);

const own = (sim: Simulation, kind: Account['kind']): Account => Object.values(sim.universe.accounts)
  .find((a) => a.ownerId === sim.player.id && a.kind === kind && a.bankId === 'us-chase' && !a.nominal && a.category !== 'term')!;
const run = <T = unknown>(sim: Simulation, kind: string, payload: Record<string, unknown> = {}): T => {
  const answer = sim.execute<T>({ kind, payload });
  expect(answer.ok, `${kind}: ${answer.error}`).toBe(true);
  return answer.value as T;
};
/** TEST SETUP: purchases on the card, against a test line. */
function purchases(sim: Simulation, account: Account, amount: number): void {
  sim.post({ memo: 'TEST SETUP: purchases', category: 'shopping', postings: [{ accountId: account.id, amount: -amount }, { accountId: sim.nominalAccount('expense', 'Test Setup').id, amount }] });
}
/** TEST SETUP: an account’s balance set, against a test equity line. */
function setBalance(sim: Simulation, account: Account, to: number): void {
  const by = to - account.balance;
  if (by !== 0) sim.post({ memo: 'TEST SETUP: balance', category: 'test', postings: [{ accountId: account.id, amount: by }, { accountId: sim.nominalAccount('equity', 'Test').id, amount: -by }] });
}
/** What the player reads on the Statements tab, the account and period chosen (TEST SETUP: the selects’ state). */
const statementsScreen = (sim: Simulation, accountId: string, period: number): string => {
  h.sim = sim;
  h.states = [accountId, period];
  return renderToStaticMarkup(createElement(BankStatements)).replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ');
};

describe('the Statements tab on a hardship plan', () => {
  it('asks the plan’s payment, which the due date judges, where its twin with no plan is asked the card’s minimum', () => {
    const planned = student('st-hardship');
    const twin = student('st-hardship');
    for (const sim of [planned, twin]) {
      purchases(sim, own(sim, 'credit_card'), 4_800_00); // TEST SETUP
      setBalance(sim, own(sim, 'checking'), 3_000_00); // TEST SETUP
      setBalance(sim, own(sim, 'savings'), 0); // TEST SETUP
    }
    // $4,800 over 48 months, rounded up to the dollar: $100.
    expect(run(planned, 'card.request_hardship')).toEqual({ payment: 100_00 });
    for (const sim of [planned, twin]) sim.advanceTo(edt(2026, 9, 20, 10));

    // The statement of 20 September: $4,800 owed, due 13 October, the day each month that keeps Chase’s 21 days after a
    // statement on the 20th (11 October, 21 days on, until brief 21, 2026-10-22). Chase’s minimum is 1% ($48) plus the
    // month’s interest ($0 at the introductory 0%), never under $40: $48. On the plan the due date asks $100.
    const card = own(planned, 'credit_card');
    const onPlan = statementsScreen(planned, card.id, 1);
    expect(onPlan).toContain('New Balance $4,800.00');
    expect(onPlan).toContain('The plan’s payment is $100.00, due October 13, 2026.');
    expect(onPlan).not.toContain('The minimum payment is $48.00');
    expect(statementsScreen(twin, own(twin, 'credit_card').id, 1)).toContain('The minimum payment is $48.00, due October 13, 2026.');

    // What the tab said before 2026-10-13, paid: the card’s $48 minimum by hand, the bank emptied the minute before the
    // due date, and the due date finds $48 of the plan’s $100 paid, late. Chase’s late fee held to the US safe harbor’s
    // first $30, which is under the $100 it was late on. The $48 is typed in: until later on 2026-10-13 paying “the
    // minimum” paid the card’s own on a plan, and from then it pays the plan’s (`tests/hardship-plan-minimum.test.ts`).
    expect(run<{ paid: number }>(planned, 'finance.pay_card', { amount: 48_00 })).toEqual({ paid: 48_00 });
    planned.advanceTo(edt(2026, 10, 13, 11, 59));
    for (const a of Object.values(planned.universe.accounts)) {
      if (a.ownerId === planned.player.id && !a.nominal && !a.closedAt && (a.kind === 'checking' || a.kind === 'savings')) setBalance(planned, a, 0); // TEST SETUP
    }
    planned.advanceTo(edt(2026, 10, 13, 12, 1));
    const late = planned.universe.notifications.filter((n) => n.title === 'A Late Card Payment');
    expect(late.map((n) => n.body)).toEqual(['The plan’s payment on the Chase Freedom Unlimited, $100.00, was due October 13, 2026, and only $48.00 was paid. That costs a $30.00 late fee. If the payment is still short at the next due date, thirty days late, it goes on your credit record. Pay the card on Money, under Cards.']);
    expect(stateOf(planned.player, card).hardship?.payment).toBe(100_00);
  });

  it('asks the card’s minimum on a statement due before the plan began, and the plan’s payment no higher than the statement', () => {
    const sim = student('st-hardship-later');
    const card = own(sim, 'credit_card');
    run(sim, 'finance.set_autopay', { mode: 'minimum' });
    purchases(sim, card, 4_800_00); // TEST SETUP
    setBalance(sim, own(sim, 'checking'), 3_000_00); // TEST SETUP
    setBalance(sim, own(sim, 'savings'), 0); // TEST SETUP
    // The statement of 20 September asks Chase’s $48; autopay pays it on 13 October (11 October until brief 21,
    // 2026-10-22), leaving $4,752.
    sim.advanceTo(edt(2026, 10, 14, 10));
    expect(card.balance).toBe(-4_752_00);
    // Asked for the next day, after that due date: $4,752 over 48 months is $99 exactly.
    expect(run(sim, 'card.request_hardship')).toEqual({ payment: 99_00 });
    // TEST SETUP: money to pay it down with, and paid down to $60 by hand before the next statement.
    setBalance(sim, own(sim, 'checking'), 5_000_00);
    expect(run<{ paid: number }>(sim, 'finance.pay_card', { amount: 4_692_00 })).toEqual({ paid: 4_692_00 });
    sim.advanceTo(edt(2026, 10, 20, 10));

    // The statement of 20 October: $60, due 13 November (10 November until brief 21), under the plan. Chase’s minimum would be its $40 floor and the
    // plan’s payment $99; the due date judges the lesser of the plan’s payment and the statement, $60.
    const october = statementsScreen(sim, card.id, 1);
    expect(october).toContain('New Balance $60.00');
    expect(october).toContain('The plan’s payment is $60.00, due November 13, 2026.');
    // The statement of 20 September was due on 13 October, before the plan: the card’s minimum, as it was judged.
    expect(statementsScreen(sim, card.id, 2)).toContain('The minimum payment is $48.00, due October 13, 2026.');
  });
});
