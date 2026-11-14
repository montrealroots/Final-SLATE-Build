// What Home's Your Bank says (SLATE's own, from November 14, 2026; the owner's command, 5 "Home entry points"): read
// from the journal (the bank world's postings), never stored. Three figures are kept apart, never added into each other:
// - available: what the player's own accounts hold now, posted, and not yet owed to anybody (a card paid over counts);
// - pending: what is on its way and not yet posted (a hold's postings, `systems/pending.ts`), in or out;
// - owed: every card, loan and overdraft's balance owed.
// And each currency apart: an account held in another currency than the save's is counted in its own (`held`), and
// nothing in one currency is added to another without a dated rate, which is the exchange's to give (docs/v9/FX.md).
import type { Simulation } from './core/simulation';
import { isLiability, type Account } from './core/ledger';
import { saveCurrency, type Money } from './core/money';
import { pendingOn } from './systems/pending';

export interface CurrencyFigures { currency: string; available: Money; pending: Money; owed: Money; accounts: number }

/** An account's figure in its own currency, and its currency: the save's, or the bank's where it isn't the save's. */
function native(sim: Simulation, a: Account, amount: Money): { currency: string; minor: Money } {
  if (a.currency && a.currency !== saveCurrency(sim.universe)) {
    // `held` is the bank's own figure; a pending amount is in the save's money, scaled by the account's own rate.
    const rate = a.balance !== 0 ? (a.held ?? 0) / a.balance : 0;
    return { currency: a.currency, minor: amount === a.balance ? a.held ?? 0 : Math.round(amount * rate) };
  }
  return { currency: saveCurrency(sim.universe), minor: amount };
}

export function bankSummary(sim: Simulation, ownerId = sim.universe.playerId): CurrencyFigures[] {
  const by = new Map<string, CurrencyFigures>();
  const of = (c: string) => by.get(c) ?? (by.set(c, { currency: c, available: 0, pending: 0, owed: 0, accounts: 0 }), by.get(c)!);
  for (const a of sim.ledger.accountsOf(ownerId)) {
    if (a.nominal || a.closedAt) continue;
    const waiting = pendingOn(sim, a);
    const posted = a.balance - waiting;
    const p = native(sim, a, posted);
    const w = native(sim, a, waiting);
    const f = of(p.currency);
    f.accounts += 1;
    f.pending += w.minor;
    if (a.kind === 'escrow') { f.pending += p.minor; continue; } // money on its way between banks (`systems/bankmoves.ts`)
    if (isLiability(a.kind)) { if (p.minor < 0) f.owed += -p.minor; else f.available += p.minor; }
    else if (p.minor < 0) f.owed += -p.minor; // an overdraft: owed to the bank, not money less
    else f.available += p.minor;
  }
  return [...by.values()].sort((x, y) => (x.currency === saveCurrency(sim.universe) ? -1 : y.currency === saveCurrency(sim.universe) ? 1 : x.currency.localeCompare(y.currency)));
}
