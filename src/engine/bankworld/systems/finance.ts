/**
 * SLATE — What the money adds up to.
 *
 * The bills, the credit, the tax years and the standing orders went with the
 * systems that raised them. Wages came back in `work.ts`, which went with the
 * job engine on 2026-09-26; rent, bills and food came back in `household.ts`,
 * which went with the home on 2026-10-09; the card came back in `credit.ts`,
 * which is still here. This header named all three as where they were until
 * 2026-10-12. What is here is the one read model Home and the save-slot
 * summary ask for: what a person is worth right now, derived from the ledger,
 * never stored.
 */

import type { Simulation } from '../core/simulation';
import { isLiability } from '../core/ledger';
import type { Money } from '../core/money';
import type { Id } from '../domain/model';

export interface Worth {
  /**
   * In the bank and in hand: every account of theirs that isn’t held, a pension or owed, Cash In Hand
   * (`systems/cash.ts`) among them. Until 2026-10-12 this said every account but a deposit a landlord held.
   */
  cash: Money;
  /**
   * Theirs, held apart in an escrow account: Money In Transit between their banks (`systems/bankmoves.ts`) and SNAP
   * on an EBT card (`systems/assistance.ts`). It was a rent deposit (`systems/household.ts`) until the home went on
   * 2026-10-09, when the deposit was paid back and its account closed (`returnTheHomesMoney`, `engine/index.ts`); this
   * said so until 2026-10-12.
   */
  held: Money;
  /**
   * `held` by what holds it: each escrow account’s balance, summed under its category (`'in_transit'`, `'ebt'`), so
   * the parts sum to `held`. From 2026-10-12, so that net worth names each part from what holds it. Until then it had
   * one phrase for all of it, "held as a deposit", and for part of that day "held apart, on its way between your
   * banks or as SNAP on an EBT card", in Toronto as in New York.
   */
  heldAs: Readonly<Record<string, Money>>;
  /**
   * In a pension fund, theirs but locked until they retire. The day job's pay
   * went into one until the job engine went on 2026-09-26; a save from before
   * keeps it, and nothing adds to it now.
   */
  pension: Money;
  // The homes they owned, their cars, their land and a house being built were worth here too until the scope reset
  // of 2026-10-09 (`home`, `vehicles`, `land`).
  liabilities: Money;
  total: Money;
}

/**
 * What somebody is worth, recomputed from the ledger every time it is asked
 * for. Balances are derived from postings, so this cannot drift from the
 * transactions that produced it.
 */
export function netWorth(sim: Simulation, ownerId: Id): Worth {
  let cash = 0;
  let held = 0;
  let pension = 0;
  let liabilities = 0;
  const heldAs: Record<string, Money> = {};
  // A deposit counted as money in the bank, and Home said 343,750 kr was in
  // the bank when 112,750 of it was with the landlord.
  for (const account of sim.ledger.accountsOf(ownerId)) {
    // A card paid past what it owed holds the difference as a credit, the holder's money (`payCard`, C23): counted with
    // the cash from 2026-10-24 (brief 26's money trace). Until then a liability account counted only what was owed on
    // it, so $500.00 paid over on a card took $500.00 off net worth until it was sent back.
    if (isLiability(account.kind)) { if (account.balance < 0) liabilities += -account.balance; else cash += account.balance; }
    else if (account.kind === 'escrow') {
      held += account.balance;
      const as = account.category ?? '';
      heldAs[as] = (heldAs[as] ?? 0) + account.balance;
    } else if (account.category === 'pension') pension += account.balance;
    else cash += account.balance;
  }

  // Homes, cars, a plane, a boat and land, each at its value and its loan among the debts, were counted here until
  // they went in the scope reset of 2026-10-09.
  return { cash, held, heldAs, pension, liabilities, total: cash + held + pension - liabilities };
}
