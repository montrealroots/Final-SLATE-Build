/**
 * How each thing is paid (`systems/payments.ts`), module 2 of
 * `docs/BANKING-FUNCTIONS.md`. Until 2026-09-26 every payment fell through
 * checking, savings, the card and then owing, and a landlord took a card.
 * The rent's and the bills' ways, checks and SEPA debits taken back went with
 * the home in 2026-10-09's scope reset.
 */
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY, dateKey, instantFromZoned } from '../../src/engine/bankworld/core/time';
import { paymentsOf } from '../../src/engine/bankworld/systems/payments';
import { spend } from '../../src/engine/bankworld/systems/spending';
import { describe,expect,it } from 'vitest';

const lifeIn = (cityId: string, extra: Record<string, unknown> = {}, seed = 'pay') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, ...extra }, seed);
const accountOf = (sim: Simulation, kind: string) => Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && a.kind === kind && !a.closedAt && a.category !== 'term');
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
const setCurrent = (sim: Simulation, to: number) => {
  const move = to - current(sim).balance;
  if (move !== 0) sim.post({ memo: 'test', category: 'test', postings: [{ accountId: current(sim).id, amount: move }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -move }] });
};
const run = (sim: Simulation, kind: string, payload: Record<string, unknown>) => {
  const answer = sim.execute({ kind, payload });
  expect(answer.ok, `${kind}: ${answer.error}`).toBe(true);
  return answer;
};

describe('a new life', () => {
  it('pays the day on the debit card, with savings not linked, as a bank opens it', () => {
    const sim = lifeIn('us-ny-newyork', {}, 'pay-new');
    expect(paymentsOf(sim.player)).toEqual({ everyday: 'debit', linkSavings: false, standingOrders: [] });
  });

  it('keeps a save from before running as it ran: savings swept', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'pay-old');
    delete sim.player.payments;
    expect(paymentsOf(sim.player)).toMatchObject({ everyday: 'debit', linkSavings: true });
  });

  it('takes no setting for the rent or the bills, which went with the home', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'pay-no-rent');
    run(sim, 'bank.set_payments', { rent: 'check', bills: 'card' });
    expect(paymentsOf(sim.player)).toEqual({ everyday: 'debit', linkSavings: false, standingOrders: [] });
    expect(sim.commandKinds()).not.toContain('bank.stop_check');
    expect(sim.commandKinds()).not.toContain('bank.reclaim_debit');
  });
});

describe('savings linked to the current account', () => {
  it('pays from savings what the current account can’t, only where it’s linked', () => {
    const pay = (link: boolean) => {
      const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'pay-linked');
      if (link) run(sim, 'bank.set_payments', { linkSavings: true });
      setCurrent(sim, 1_000_00);
      const savings = accountOf(sim, 'savings')!;
      const before = savings.balance;
      // A school bill bigger than the current account holds: from the current account first, then linked savings.
      const paid = spend(sim, sim.player, 5_000_00, 'A test bill', 'school');
      return { paid, fromSavings: before - savings.balance };
    };
    const linked = pay(true);
    const unlinked = pay(false);
    expect(linked.paid).toBe(true);
    expect(linked.fromSavings).toBeGreaterThan(0);
    expect(unlinked.fromSavings).toBe(0);
  });

  it('refuses a link with no savings to make it', () => {
    const sim = lifeIn('is-39-mosfellsbr', {}, 'pay-no-savings');
    for (const a of Object.values(sim.universe.accounts)) if (a.ownerId === sim.player.id && a.kind === 'savings') a.closedAt = sim.now;
    expect(sim.execute({ kind: 'bank.set_payments', payload: { linkSavings: true } }).error).toMatch(/no savings account/);
  });
});

describe('the day’s spending', () => {

  it('puts the groceries on the credit card first where that’s the choice', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'pay-everyday');
    run(sim, 'bank.set_payments', { everyday: 'credit' });
    const card = accountOf(sim, 'credit_card')!;
    const before = { card: card.balance, current: current(sim).balance };
    spend(sim, sim.player, 2_000_00, 'Groceries', 'food');
    expect(card.balance).toBe(before.card - 2_000_00);
    expect(current(sim).balance).toBe(before.current);
  });
});

describe('standing orders and payments set for a date', () => {
  it('moves the amount into savings on its day each month, skips a month it can’t, and stops when canceled', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'pay-so');
    const savings = accountOf(sim, 'savings')!;
    run(sim, 'bank.add_standing_order', { toId: savings.id, amount: 5_000_00, day: 10 });
    const moved = () => sim.universe.transactions.filter((t) => t.memo.startsWith('Standing order')).length;
    // Saturday 10 January isn't a business day for an Icelandic bank, so the order is made on Monday the 12th, as the
    // EEA's rule has it (PSD2 art. 78(2), Iceland's Act no. 114/2021), from 2026-10-22 (brief 21): until then it was made
    // on the Saturday, and this looked on the 11th.
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 11, hour: 12 }, sim.zone));
    expect(moved()).toBe(0);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 13, hour: 12 }, sim.zone));
    expect(moved()).toBe(1);
    const made = sim.universe.transactions.find((t) => t.memo.startsWith('Standing order'))!;
    expect(dateKey(made.at, sim.zone)).toBe('2026-01-12');
    setCurrent(sim, 0);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 2, day: 11, hour: 12 }, sim.zone));
    expect(moved()).toBe(1);
    expect(sim.universe.notifications.some((n) => n.title === 'A Standing Order Didn’t Go')).toBe(true);
    run(sim, 'bank.cancel_standing_order', { id: paymentsOf(sim.player).standingOrders[0]!.id });
    setCurrent(sim, 1_000_000_00);
    sim.advanceTo(instantFromZoned({ year: 2026, month: 3, day: 11, hour: 12 }, sim.zone));
    expect(moved()).toBe(1);
  });

  it('moves with the accounts when a switching service moves the bank', () => {
    // Britain's: a US switch has no service to run from 2026-10-10, and the player moves each order themselves.
    const sim = lifeIn('uk-eng-london', { wealth: 'comfortable', bankId: 'gb-barclays' }, 'pay-switch');
    const oldSavings = accountOf(sim, 'savings') ?? sim.universe.accounts[(run(sim, 'bank.open_savings', {}).value as { accountId: string }).accountId]!;
    run(sim, 'bank.add_standing_order', { toId: oldSavings.id, amount: 100_00, day: 20 });
    const done = (run(sim, 'bank.switch', { bankId: 'gb-hsbc' }).value as { at: number }).at;
    const at = done + MS_DAY;
    run(sim, 'bank.schedule_payment', { fromId: current(sim).id, toId: oldSavings.id, amount: 50_00, at });
    sim.advanceTo(done + 60_000);
    const savings = Object.values(sim.universe.accounts).find((a) => a.ownerId === sim.player.id && !a.closedAt && a.kind === 'savings' && a.bankId === 'gb-hsbc')!;
    expect(paymentsOf(sim.player).standingOrders[0]!.toId).toBe(savings.id);
    expect(paymentsOf(sim.player).standingOrders[0]!.fromId ?? current(sim).id).toBe(current(sim).id);
    expect(current(sim).bankId).toBe('gb-hsbc');
    setCurrent(sim, 1_000_00);
    const before = savings.balance;
    sim.advanceTo(instantFromZoned({ year: 2026, month: 1, day: 21, hour: 12 }, sim.zone));
    expect(savings.balance - before).toBeGreaterThanOrEqual(150_00);
    expect(sim.universe.notifications.some((n) => n.title === 'A Standing Order Didn’t Go')).toBe(false);
  });

  it('pays on the day set, and not once canceled', () => {
    const sim = lifeIn('is-39-mosfellsbr', { wealth: 'comfortable' }, 'pay-sched');
    const savings = accountOf(sim, 'savings')!;
    const at = sim.now + 5 * MS_DAY;
    const one = run(sim, 'bank.schedule_payment', { fromId: current(sim).id, toId: savings.id, amount: 1_000_00, at }).value as { id: string };
    const two = run(sim, 'bank.schedule_payment', { fromId: current(sim).id, toId: savings.id, amount: 2_000_00, at }).value as { id: string };
    run(sim, 'bank.cancel_scheduled', { id: two.id });
    const before = savings.balance;
    sim.advanceTo(at + 60_000);
    expect(savings.balance - before).toBe(1_000_00);
    expect(one.id).toBeTruthy();
    expect(sim.execute({ kind: 'bank.schedule_payment', payload: { fromId: current(sim).id, toId: savings.id, amount: 1_00, at: sim.now - 1 } }).ok).toBe(false);
    // One the account can't cover on the day isn't made.
    const later = sim.now + 3 * MS_DAY;
    run(sim, 'bank.schedule_payment', { fromId: current(sim).id, toId: savings.id, amount: current(sim).balance + 1_000_000_00, at: later });
    const held = savings.balance;
    sim.advanceTo(later + 60_000);
    expect(savings.balance).toBe(held);
    expect(sim.universe.notifications.some((n) => n.title === 'A Scheduled Payment Didn’t Go')).toBe(true);
  });
});
