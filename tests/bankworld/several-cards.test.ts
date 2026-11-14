/**
 * Several cards at once (2026-09-28): a card applied for at any bank in the
 * country, one from each; each card its own statement, due date and state;
 * the day's spending on the everyday card; the record reading what's used of
 * all of them; and the everyday place passing on when its card closes.
 */
import { describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { cardOf, cardsOf, DUE_KIND, stateOf, STATEMENT_KIND } from '../../src/engine/bankworld/systems/credit';
import { troubles } from '../../src/engine/bankworld/systems/spending';
import { cashOwedOn } from '../../src/engine/bankworld/systems/cash';

const lifeIn = (seed: string) =>
  quickSave({ startLocationId: 'us-ny-newyork', homeRegionId: 'us-ny-newyork', livesWhereBorn: true, wealth: 'comfortable', bankId: 'us-chase' }, seed);
const run = (sim: Simulation, kind: string, payload: Record<string, unknown> = {}) => sim.execute({ kind, payload });
const give = (sim: Simulation, accountId: string, amount: number) => sim.post({ memo: 'test', category: 'test', postings: [{ accountId, amount }, { accountId: sim.nominalAccount('income', 'Test').id, amount: -amount }] });
const statementsFor = (sim: Simulation, accountId: string) => sim.timeline.pending().filter((i) => i.kind === STATEMENT_KIND && i.payload.accountId === accountId);

/** A Chase card held, and Citi's applied for and arrived beside it. */
function twoCards(seed: string): { sim: Simulation; chase: ReturnType<typeof cardOf> & object; citi: ReturnType<typeof cardOf> & object } {
  const sim = lifeIn(seed);
  const chase = cardOf(sim, sim.player)!;
  sim.player.credit!.score = 760;
  expect(run(sim, 'card.apply', { bankId: 'us-citi' }).ok).toBe(true);
  sim.advanceBy(8 * MS_DAY);
  const citi = cardsOf(sim, sim.player).find((c) => c.bankId === 'us-citi')!;
  return { sim, chase, citi };
}

describe('applying for another card', () => {
  it('is taken by another bank in the country while a card is held, and refused by the bank that issued one', () => {
    const { sim, chase, citi } = twoCards('sc-apply');
    expect(citi).toBeDefined();
    expect(cardsOf(sim, sim.player).map((c) => c.id)).toEqual([chase.id, citi.id]);
    // The everyday card stays where it was; the new card has its own state.
    expect(cardOf(sim, sim.player)!.id).toBe(chase.id);
    expect(sim.player.credit!.cards![citi.id]).toMatchObject({ statementBalance: 0, missed: 0 });
    expect(statementsFor(sim, citi.id)).toHaveLength(1);
    expect(run(sim, 'card.apply', { bankId: 'us-chase' }).error).toMatch(/already/);
    expect(run(sim, 'card.apply', { bankId: 'gb-natwest' }).error).toMatch(/country/);
  });
});

describe('each card', () => {
  it('states on its own day, owes on its own statement, and is behind on its own', () => {
    const { sim, chase, citi } = twoCards('sc-own');
    const chaseDay = stateOf(sim.player, chase).statementDay ?? 20;
    const day = chaseDay === 5 ? 6 : 5;
    expect(run(sim, 'card.set_statement_day', { day, accountId: citi.id }).ok).toBe(true);
    expect(stateOf(sim.player, citi).statementDay).toBe(day);
    expect(stateOf(sim.player, chase).statementDay ?? 20).toBe(chaseDay);
    expect(statementsFor(sim, chase.id)).toHaveLength(1);
    const citiNext = statementsFor(sim, citi.id);
    expect(citiNext).toHaveLength(1);
    expect(new Date(citiNext[0]!.at).getUTCDate()).toBe(day);
    // Owed on Citi's alone: its statement asks it, Chase's own asks nothing of it.
    give(sim, citi.id, -citi.balance - 400_00);
    const chaseBefore = stateOf(sim.player, chase).statementBalance;
    sim.advanceTo(citiNext[0]!.at + 1000);
    expect(stateOf(sim.player, citi).statementBalance).toBe(400_00);
    expect(stateOf(sim.player, chase).statementBalance).toBe(chaseBefore);
    // Behind on Citi's, and trouble names it.
    stateOf(sim.player, citi).missed = 1;
    expect(troubles(sim, sim.player)).toContainEqual({ kind: 'card_behind', amount: 400_00, accountId: citi.id });
    expect(troubles(sim, sim.player).filter((t) => t.kind === 'card_behind')).toHaveLength(1);
  });

  it('takes commands by its account: autopay, closing, and a cash advance on its own balance', () => {
    const { sim, chase, citi } = twoCards('sc-commands');
    expect(run(sim, 'finance.set_autopay', { mode: 'minimum', accountId: citi.id }).ok).toBe(true);
    expect(stateOf(sim.player, citi).autopay).toBe('minimum');
    expect(stateOf(sim.player, chase).autopay).toBe('full');
    expect(run(sim, 'cash.withdraw', { amount: 100_00, from: 'card', accountId: citi.id }).ok).toBe(true);
    expect(stateOf(sim.player, citi).cashOwed).toBe(100_00);
    expect(stateOf(sim.player, chase).cashOwed ?? 0).toBe(0);
    expect(cashOwedOn(sim.player, citi)).toBe(100_00);
    expect(cashOwedOn(sim.player, chase)).toBe(0);
    expect(citi.balance).toBeLessThan(-100_00);
    give(sim, citi.id, -citi.balance);
    expect(run(sim, 'card.close', { accountId: citi.id }).ok).toBe(true);
    expect(citi.closedAt).toBeDefined();
    expect(chase.closedAt).toBeUndefined();
  });
});

describe('the everyday card', () => {
  it('is the one made it, its state moving with it and back', () => {
    const { sim, chase, citi } = twoCards('sc-everyday');
    stateOf(sim.player, chase).statementDay = 12;
    stateOf(sim.player, citi).statementDay = 3;
    expect(run(sim, 'card.set_everyday', { accountId: citi.id }).ok).toBe(true);
    expect(cardOf(sim, sim.player)!.id).toBe(citi.id);
    expect(cardsOf(sim, sim.player).map((c) => c.id)).toEqual([citi.id, chase.id]);
    expect(sim.player.credit!.statementDay).toBe(3);
    expect(stateOf(sim.player, chase).statementDay).toBe(12);
    expect(stateOf(sim.player, citi).statementDay).toBe(3);
    expect(run(sim, 'card.set_everyday', { accountId: chase.id }).ok).toBe(true);
    expect(sim.player.credit!.statementDay).toBe(12);
    expect(sim.player.credit!.cards![citi.id]!.statementDay).toBe(3);
  });

  it('passes to the card left when it closes', () => {
    const { sim, chase, citi } = twoCards('sc-promote');
    stateOf(sim.player, citi).statementDay = 7;
    give(sim, chase.id, -chase.balance);
    expect(run(sim, 'card.close', { accountId: chase.id }).ok).toBe(true);
    expect(cardOf(sim, sim.player)!.id).toBe(citi.id);
    expect(sim.player.credit!.primaryId).toBe(citi.id);
    expect(sim.player.credit!.statementDay).toBe(7);
    expect(sim.player.credit!.cards?.[chase.id]).toBeUndefined();
  });
});

describe('the record', () => {
  it('reads what’s used of every card’s limit together', () => {
    // The same month paid on Citi's card, with Chase's full or empty beside it.
    const moved = (full: boolean) => {
      const { sim, chase, citi } = twoCards('sc-used');
      // Its own day, apart from Chase's.
      run(sim, 'card.set_statement_day', { day: (stateOf(sim.player, chase).statementDay ?? 20) === 5 ? 6 : 5, accountId: citi.id });
      give(sim, citi.id, -citi.balance);
      give(sim, chase.id, -chase.balance - (full ? chase.creditLimit! : 0));
      // Across Citi's statement alone.
      const at = statementsFor(sim, citi.id)[0]!.at;
      sim.advanceTo(at - 1);
      const before = sim.player.credit!.score;
      sim.advanceTo(at + 1000);
      return sim.player.credit!.score - before;
    };
    expect(moved(false)).toBeGreaterThan(moved(true));
  });

  it('counts a month paid as agreed once however many cards report it, and a late payment on any card as the whole mark', () => {
    // Paid as agreed: one card's three points, or two cards' shares of them.
    const agreed = (s: Simulation) => {
      for (const c of cardsOf(s, s.player)) give(s, c.id, -c.balance);
      const before = s.player.credit!.score;
      const last = Math.max(...cardsOf(s, s.player).map((c) => statementsFor(s, c.id)[0]?.at ?? s.timeline.pending().find((i) => i.kind === STATEMENT_KIND && i.payload.personId === s.player.id)!.at));
      s.advanceTo(last + 1000);
      return s.player.credit!.score - before;
    };
    expect(agreed(lifeIn('sc-agreed-one'))).toBe(3);
    expect(agreed(twoCards('sc-agreed-two').sim)).toBeCloseTo(3, 6);
    // Late, the second miss that puts a US payment on the record: the whole fifty either way.
    const late = (s: Simulation, card: { id: string; balance: number }) => {
      give(s, card.id, -card.balance - 50_00);
      s.advanceTo((statementsFor(s, card.id)[0] ?? s.timeline.pending().find((i) => i.kind === STATEMENT_KIND && i.payload.personId === s.player.id)!).at + 1000);
      for (const a of Object.values(s.universe.accounts)) {
        if (a.ownerId === s.player.id && !a.nominal && !a.closedAt && (a.kind === 'checking' || a.kind === 'savings') && a.balance !== 0) give(s, a.id, -a.balance);
      }
      stateOf(s.player, s.universe.accounts[card.id]!).missed = 1;
      const due = s.timeline.pending().find((i) => i.kind === DUE_KIND && i.payload.accountId === card.id)!.at;
      s.advanceTo(due - 1);
      const before = s.player.credit!.score;
      s.advanceTo(due + 1000);
      return s.player.credit!.score - before;
    };
    const one = lifeIn('sc-late-one');
    const two = twoCards('sc-late-two');
    expect(late(one, cardOf(one, one.player)!)).toBe(-50);
    expect(late(two.sim, two.citi)).toBe(-50);
  });
});
