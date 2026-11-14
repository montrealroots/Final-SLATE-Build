/**
 * SLATE — a card payment authorized, held and then posted (module 9 of
 * `docs/BANKING-FUNCTIONS.md`), from each bank's own terms
 * (`content/pending.ts`).
 *
 * Until 2026-09-26 a card purchase was on the account the moment it was
 * made and there was one balance. Now a debit or credit card payment is
 * authorized at once and held against the available balance, which is what
 * pays and declines things (A95, A96, A140, C36), and posts SLATE's
 * estimated two business days later, never past the most the bank says a
 * hold lasts, and at once where the card takes the money at the purchase.
 * The posted balance, completed items only, is shown beside the available
 * one, and a statement marks what's still pending. Where a European bank
 * dates an entry's value apart from its booking, the statement shows both
 * (A98).
 */

import type { Simulation } from '../core/simulation';
import type { Account, LedgerTransaction } from '../core/ledger';
import type { Money } from '../core/money';
import { MS_DAY, type Instant } from '../core/time';
import { PENDING } from '../content/pending';
import { afterBusinessDays, daysOfAccount } from '../content/bankdays';

/**
 * Business days a card payment stays pending before it posts: SLATE's
 * estimate, as a shop's payment settles in a day or two. What the banks
 * publish is the most a hold can last before it's released (Barclays' seven,
 * CommBank's ten), which is when a payment the shop never completes comes
 * back, not when an ordinary one posts. Until 2026-09-26 every payment waited
 * the bank's most, and a London life's groceries sat pending ten days each.
 */
export const ESTIMATE_PENDING_DAYS = 2;

/** The business days a card payment on an account stays pending: SLATE's estimate, never past the most the bank says a hold lasts; and that most. */
export function pendingDaysOf(account: Account): { days: number; most?: number } {
  const rules = account.bankId ? PENDING[account.bankId] : undefined;
  const most = account.kind === 'credit_card' ? rules?.creditPendingDays ?? rules?.pendingDays : rules?.pendingDays;
  return { days: Math.min(ESTIMATE_PENDING_DAYS, most ?? ESTIMATE_PENDING_DAYS), ...(most !== undefined ? { most } : {}) };
}

/** A card payment just made: held against the available balance until it posts. */
export function hold(sim: Simulation, txn: LedgerTransaction | undefined, account: Account): void {
  if (!txn) return;
  // Posted after the bank's business days, its weekends and holidays not counted (`content/bankdays.ts`); until 2026-09-28 a week's five in seven everywhere.
  const days = daysOfAccount(account, sim.universe.people[account.ownerId ?? '']);
  txn.postsAt = afterBusinessDays(sim.now, pendingDaysOf(account).days, days.countryId, sim.homeZone, days.regionId);
}

/** What's pending on an account, in the ledger's sense (a debit negative). */
export function pendingOn(sim: Simulation, account: Account, at: Instant = sim.now): Money {
  let sum = 0;
  const list = sim.universe.transactions;
  // Nothing stays pending a month; stop looking back past that.
  for (let i = list.length - 1; i >= 0 && list[i]!.at > at - 31 * MS_DAY; i -= 1) {
    const txn = list[i]!;
    if (txn.postsAt === undefined || txn.postsAt <= at || txn.at > at) continue;
    for (const p of txn.postings) if (p.accountId === account.id) sum += p.amount;
  }
  return sum;
}

/** The posted balance: completed items only, what the bank calls the ledger or account balance (A96). */
export function postedBalance(sim: Simulation, account: Account): Money {
  return account.balance - pendingOn(sim, account);
}
