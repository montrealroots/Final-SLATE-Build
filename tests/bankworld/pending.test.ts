/**
 * A card payment authorized, held and posted (`systems/pending.ts`): module 9
 * of `docs/BANKING-FUNCTIONS.md`.
 */
import { describe, expect, it } from 'vitest';
import { quickSave } from '../../src/engine/bankworld';
import type { Simulation } from '../../src/engine/bankworld/core/simulation';
import { MS_DAY } from '../../src/engine/bankworld/core/time';
import { cardOf } from '../../src/engine/bankworld/systems/credit';
import { payFromCurrent, spend } from '../../src/engine/bankworld/systems/spending';
import { ESTIMATE_PENDING_DAYS, pendingDaysOf, pendingOn, postedBalance } from '../../src/engine/bankworld/systems/pending';
import { activity } from '../../src/engine/bankworld/systems/statements';
import { afterBusinessDays } from '../../src/engine/bankworld/content/bankdays';

const lifeIn = (cityId: string, bankId: string, seed = 'pend') =>
  quickSave({ startLocationId: cityId, homeRegionId: cityId, livesWhereBorn: true, wealth: 'comfortable', bankId }, seed);
const current = (sim: Simulation) => sim.universe.accounts[sim.player.primaryAccountId!]!;
/** The bank's business days on from a moment, as time: its weekends and holidays skipped (`content/bankdays.ts`). */
const calendar = (from: number, business: number) => afterBusinessDays(from, business, 'us', 'America/New_York') - from;

describe('a card payment', () => {
  it('is held against the available balance at once and posts in the bank’s days', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'pend-debit');
    sim.must({ kind: 'bank.set_payments', payload: { everyday: 'debit' } });
    const account = current(sim);
    const before = account.balance;
    const posted = postedBalance(sim, account);
    expect(spend(sim, sim.player, 45_00, 'Groceries', 'food')).toBe(true);
    const txn = sim.universe.transactions.at(-1)!;
    expect(account.balance).toBeLessThan(before);
    expect(pendingOn(sim, account)).toBeLessThanOrEqual(-45_00);
    expect(postedBalance(sim, account)).toBe(posted);
    // Two business days from a Monday: the Wednesday.
    expect(txn.postsAt! - txn.at).toBe(calendar(txn.at, pendingDaysOf(account).days));
    expect(txn.postsAt! - txn.at).toBe(2 * MS_DAY);
    const line = activity(sim, account, txn.at, txn.at + 1).lines.find((l) => l.id === txn.id)!;
    expect(line.pending).toBe(true);
    sim.advanceTo(txn.postsAt! + 1000);
    expect(activity(sim, account, txn.at, txn.at + 1).lines.find((l) => l.id === txn.id)!.pending).toBeUndefined();
    expect(pendingOn(sim, account, txn.at + 1)).toBeLessThanOrEqual(-45_00);
    // Posted, it counts no longer: only what's still to post does.
    const still = sim.universe.transactions.filter((t) => t.postsAt !== undefined && t.postsAt > sim.now && t.at <= sim.now)
      .reduce((sum, t) => sum + t.postings.filter((p) => p.accountId === account.id).reduce((a, p) => a + p.amount, 0), 0);
    expect(pendingOn(sim, account)).toBe(still);
  });

  it('is held on the credit card too', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'pend-credit');
    sim.must({ kind: 'bank.set_payments', payload: { everyday: 'credit' } });
    const card = cardOf(sim, sim.player)!;
    expect(spend(sim, sim.player, 30_00, 'Groceries', 'food')).toBe(true);
    const txn = sim.universe.transactions.at(-1)!;
    expect(txn.postings.some((p) => p.accountId === card.id)).toBe(true);
    expect(txn.postsAt! - txn.at).toBe(calendar(txn.at, pendingDaysOf(card).days));
    expect(pendingOn(sim, card)).toBeLessThanOrEqual(-30_00);
  });

  it('isn’t a direct debit, which posts as it’s paid', () => {
    const sim = lifeIn('uk-eng-london', 'gb-barclays', 'pend-dd');
    expect(payFromCurrent(sim, sim.player, 60_00, 'Bills', 'bills')).toBe(true);
    expect(sim.universe.transactions.at(-1)!.postsAt).toBeUndefined();
  });

  it('posts in two business days within Chase’s three and five, and at once in Japan', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'pend-chase');
    expect(pendingDaysOf(current(sim))).toEqual({ days: 2, most: 3 });
    expect(pendingDaysOf(cardOf(sim, sim.player)!)).toEqual({ days: 2, most: 5 });
    expect(pendingDaysOf({ ...current(sim), bankId: 'jp-mufg' })).toEqual({ days: 0, most: 0 });
    const jp = lifeIn('jp-13-tokyo', 'jp-mufg', 'pend-jp');
    jp.must({ kind: 'bank.set_payments', payload: { everyday: 'debit' } });
    expect(spend(jp, jp.player, 1_000_00, 'Groceries', 'food')).toBe(true);
    expect(pendingOn(jp, current(jp))).toBe(0);
  });

  it('posts in SLATE’s estimated two business days where the bank doesn’t say', () => {
    const sim = lifeIn('us-ny-newyork', 'us-chase', 'pend-est');
    const account = { ...current(sim), bankId: 'nowhere' };
    expect(pendingDaysOf(account)).toEqual({ days: ESTIMATE_PENDING_DAYS });
  });
});
