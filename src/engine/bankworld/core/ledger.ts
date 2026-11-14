/**
 * SLATE — Double-entry ledger.
 *
 * LAW: a balance is never a number someone typed. It is the sum of postings.
 * Every transaction balances to exactly zero across its postings, with income
 * and expense modeled as nominal counter-accounts, so the universe can prove
 * at any moment that no money was invented or destroyed.
 *
 * An account at a bank whose currency isn't the save's (from 2026-10-16, the
 * owner's decision that a Yale student may keep a bank account at home) keeps
 * a second figure beside its balance: `held`, the bank's own, in its own minor
 * units, the sum of its postings' `native`. Until then such an account could
 * be kept only in the save's cents, and that isn't exact: a sum of
 * conversions isn't the conversion of the sum (five postings of 1¢ are 1p
 * each at the bank, 5p, and 5¢ converted is 4p), and £10,000 a bank sold for
 * $12,700 reads £10,033.00 converted back. A
 * transaction still balances in the save's cents, so conservation, the
 * server's sums and every balance are as they were; `held` is what the bank
 * shows. Rates don't move, so there is no gain or loss on exchange.
 */

import type { Instant } from './time';
import type { Money } from './money';

export type AccountKind =
  | 'checking' | 'savings' | 'cash' | 'credit_card' | 'loan' | 'mortgage'
  | 'auto_loan' | 'brokerage' | 'company_cash' | 'company_credit'
  | 'escrow' | 'production_account'
  // Nominal counter-accounts. These never hold player money; they exist so
  // every posting has a balancing partner and every dollar has a provenance.
  | 'income' | 'expense' | 'equity' | 'asset_value' | 'liability_other';

export const NOMINAL_KINDS: readonly AccountKind[] = ['income', 'expense', 'equity', 'asset_value', 'liability_other'];

/** Liability accounts carry a negative balance when money is owed. */
export const LIABILITY_KINDS: readonly AccountKind[] = ['credit_card', 'loan', 'mortgage', 'auto_loan', 'company_credit'];

export function isLiability(kind: AccountKind): boolean {
  return LIABILITY_KINDS.includes(kind);
}

/** A card in the hand: its number's last four, its expiry, whether it's locked or stopped and why, a replacement on its way, and whether the bills on it still have its number. */
export interface Plastic {
  last4: string;
  expiresAt: Instant;
  issued?: number;
  locked?: boolean;
  /** Stopped, and why; `new` is a new account's first card, not yet arrived (from 2026-10-10, `systems/bankmoves.ts`). */
  stopped?: 'lost' | 'stolen' | 'damaged' | 'fraud' | 'new';
  replacementAt?: Instant;
}

export interface Account {
  id: string;
  saveId: string;
  kind: AccountKind;
  name: string;
  /** Person id, company id, or 'world' for nominal accounts. */
  ownerId: string;
  institution?: string;
  /** Derived from postings; never assigned directly outside `post`. */
  balance: Money;
  /** Credit limit for revolving accounts (positive cents). */
  creditLimit?: Money;
  /** Annual percentage rate as a decimal, e.g. 0.2249. */
  apr?: number;
  openedAt: Instant;
  closedAt?: Instant;
  /** Nominal accounts are hidden from the player's account list. */
  nominal: boolean;
  /** Grouping for statements: 'housing', 'transport', 'career', ... */
  category?: string;
  last4?: string;
  /** The card on it: the debit card on a current account, the credit card on a card's own (`systems/security.ts`). */
  plastic?: Plastic;
  /** The real bank it is held at (`content/banks.ts`), for a bank account. */
  bankId?: string;
  /** The account's number as its country writes it (`systems/banknumber.ts`). */
  number?: string;
  /**
   * A number known to somebody who shouldn't have it (from 2026-10-10, `systems/security.ts`): which number, since
   * when, and until when attempts on it are drawn.
   */
  exposed?: { number: string; at: number; until: number };
  /** Interest built up since it was last paid, in fractional hundredths. */
  accrued?: number;
  /** The lowest it has stood at this month, for a fee's waiver. */
  lowest?: Money;
  /** The month's daily balances added up, and the days counted, for an average balance. */
  monthSum?: number;
  monthDays?: number;
  /** A bonus rate's interest this month, kept only if the month earns it. */
  bonusAccrued?: number;
  /** What it held when the month began, for a bonus paid on growth. */
  monthOpen?: Money;
  /** An arranged overdraft: its limit, its rate, when it was arranged, and interest built on it (`systems/lending.ts`). */
  overdraftLimit?: Money;
  overdraftRate?: number;
  /** An arranged overdraft paid for by the use rather than the month, where the bank sells it so. */
  overdraftPerUse?: boolean;
  overdraftSince?: Instant;
  odAccrued?: number;
  /** Overdraft items charged today, where a bank charges by the item and caps the day. */
  itemsDay?: string;
  itemsCount?: number;
  /** A term deposit's fixed rate and the day it ends. */
  fixedRate?: number;
  maturesAt?: Instant;
  /** Items charged this month, where a bank caps them by the month. */
  itemsMonth?: string;
  itemsMonthCount?: number;
  /** The most the account was overdrawn this month, for Spain's commission. */
  odPeak?: Money;
  /** The month's overdrawn balances, summed day by day, for Spain's legal cap on what an overdraft may cost. */
  odDaySum?: Money;
  /** Midnights this month the account sat past its limit by more than the bank's margin, for New Zealand's unarranged overdraft fee. */
  odBeyondDays?: number;
  /** Items that overdrew it on a day, whose fees wait for the end of the next business day (Chase, Wells Fargo). */
  pendingItems?: { day: string; count: number }[];
  /** Since when it has been below zero past any arranged limit, for the bank closing it. */
  negativeSince?: number;
  /** The last day a payment took it below zero, for a bank that charges one fee for a day that ends overdrawn. */
  overdrewDay?: string;
  /** Opted into the bank paying everyday debit card purchases into an overdraft (a US bank's Regulation E choice). */
  debitOverdraft?: boolean;
  /** When a returned payment's fee and a dormant account's fee were last charged. */
  returnedAt?: Instant;
  /**
   * When the debit card's year running began (`Bank.card.year`, `CardYear`, from brief 10, 2026-10-16): its charge's
   * night where it was paid ahead, the night it opened where it's charged behind. Until then the moment the yearly fee was
   * last charged, which is the same for a year paid ahead.
   */
  cardFeeAt?: Instant;
  /**
   * What the debit card's yearly fee took for the year running, in the bank's own money, where it was paid ahead and its
   * days left come back on a close (`cardYearDue`, from 2026-10-16): none where the year was free, is charged behind, or
   * was given back.
   */
  cardFeePaid?: Money;
  /**
   * The rule the card year running was opened under, `CardYear.paid` then (from brief 10, 2026-10-16), so it's settled by
   * that rule whatever the bank's setting is now.
   */
  cardYearRule?: 'ahead' | 'behind';
  dormantFeeAt?: Instant;
  /** Germany: the quarter's fees so far, charged at the quarterly closing. */
  feesDue?: Money;
  /** The same in the bank's own figure, on an account in another currency (from 2026-10-16). */
  feesDueHeld?: Money;
  /**
   * When a closing settled its fees: they end there, as BGB § 675h(3) owes them only to the contract's end, and nothing
   * more accrues on an account kept open after it only to be paid off (from 2026-10-16, `settleFees`).
   */
  feesEndedAt?: Instant;
  /** Untouched past the bank's months: inactive, then dormant and blocked until used again. */
  inactive?: boolean;
  dormant?: boolean;
  /** When its holder last had a dormant account reactivated, which counts as using it. */
  reactivatedAt?: Instant;
  /** When the bank wrote that the balance goes to the state unless the holder gets in touch (`ESCHEAT_NOTICE_DAYS`). */
  escheatWarned?: Instant;
  /** A term deposit renewed: until when it can be taken without penalty, and whether the bank has written about its end. */
  graceUntil?: Instant;
  maturityNoticed?: boolean;
  /** A term deposit whose early close has been asked for, on the notice the bank needs, closing on this day. */
  breakAt?: number;
  /** France: the month's letter about an overrun sent, the credit offered at three months, and the closing's notice given. */
  overrunInformed?: boolean;
  creditOffered?: { amount: number; apr: number; months: number };
  closingNoticed?: boolean;
  /** A second-chance account, opened for somebody the mainstream banks turned away: a monthly fee and no overdraft. */
  secondChance?: boolean;
  /** When a term deposit last renewed: its current term runs from here. */
  renewedAt?: Instant;
  /** What its holder has told the bank to do with a term deposit at its end, where it differs from the bank's default. */
  atEnd?: 'renews' | 'savings' | 'paid_out';
  /**
   * A new current account the bank waits on (from 2026-10-10, `systems/bankmoves.ts`): the deposit that funds it, and
   * the day it closes unfunded where the bank closes one; since when it has held nothing, for a bank that closes an
   * account at zero; and the day it closes, where the bank keeps it open for items pending.
   */
  awaitingFunds?: Money;
  fundBy?: Instant;
  zeroSince?: Instant;
  closingAt?: Instant;
  /** A loan's repayment account, as agreed when it was taken (from 2026-10-10): any current account of theirs. */
  repayFromId?: string;
  /** Left open by a switch while still in debt: blocked to all but repayment, closed once it's repaid (`SWITCH_DEBT_KIND`). */
  switchDebt?: boolean;
  /** A loan's monthly payment and its term. */
  loanPayment?: Money;
  loanMonths?: number;
  /**
   * The bank's currency, only where it isn't the save's (from 2026-10-16): the account then keeps `held`, and each
   * posting to it a `native`.
   */
  currency?: string;
  /** What the bank shows, in its currency's minor units: the sum of the postings' `native`, never assigned outside `post`. */
  held?: Money;
  /**
   * When it was last used before the save began, for an account a person brought into it (from 2026-10-16): until then
   * an account nothing had posted to counted as untouched since it opened, and one opened years before the save would
   * have gone inactive at its first month's end (`systems/lending.ts` `lastUsed`).
   */
  lastUsedBefore?: Instant;
  /**
   * At a bank outside America, held by a US person: by calendar year, the most it held at a day's end and what it held
   * at the last day's end, in its own money (from 2026-10-16, written each night by `systems/banking.ts`). America's
   * reports on accounts abroad read it, FinCEN's FBAR the most and Form 8938 both (`foreignAccountsNotice`).
   */
  peak?: Record<string, { max: Money; last: Money }>;
  /**
   * On the current account: a fee for a customer abroad that no account at the bank held when it fell due, at a bank
   * whose account can't go below zero (`NonResidentFee.unpaid`), in the bank's own money: owed, and taken the first night
   * one holds it (from 2026-10-16).
   */
  feeOwedHeld?: Money;
  /**
   * On a term deposit: the transactions of interest taken out of it during its term by a build before 2026-10-15's
   * second recheck, which posted nothing against the term, found once when that build's save is opened
   * (`findTermInterest`, `systems/accountlife.ts`, from 2026-10-16), so canceling it finds them (`interestPaidSince`).
   */
  untaggedTakes?: string[];
}

export interface Posting {
  accountId: string;
  /** In the save's cents; a transaction's amounts sum to zero. */
  amount: Money;
  /**
   * The same movement in the account's own currency (from 2026-10-16), on a posting to an account with a `currency` and
   * on no other. A caller that knows it exactly passes it; otherwise `post` works it out.
   */
  native?: Money;
}

/** An amount in the save's cents, in a currency's minor units; nothing where there's no rate. */
export type ToCurrency = (amount: Money, currency: string) => Money | undefined;

export interface LedgerTransaction {
  id: string;
  saveId: string;
  at: Instant;
  memo: string;
  /** Statement category: 'salary', 'rent', 'groceries', 'production', ... */
  category: string;
  postings: Posting[];
  /** Set when a transaction has been reversed; points at the reversing txn. */
  reversedBy?: string;
  reverses?: string;
  /** A card payment authorized and held against the available balance, posting then (`systems/pending.ts`). */
  postsAt?: Instant;
}

export interface LedgerHost {
  accounts: Record<string, Account>;
  transactions: LedgerTransaction[];
}

export class LedgerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LedgerError';
  }
}

export class Ledger {
  /**
   * `toCurrency` converts the save's cents into an account's currency, for a posting that doesn't say its `native`;
   * `toSave` back, for an account whose two figures would disagree in sign (`nativesOf`).
   */
  constructor(private host: LedgerHost, private toCurrency?: ToCurrency, private toSave?: ToCurrency) {}

  account(id: string): Account {
    const acct = this.host.accounts[id];
    if (!acct) throw new LedgerError(`No such account: ${id}`);
    return acct;
  }

  tryAccount(id: string): Account | undefined {
    return this.host.accounts[id];
  }

  accountsOf(ownerId: string): Account[] {
    return Object.values(this.host.accounts)
      .filter((a) => a.ownerId === ownerId && !a.nominal && !a.closedAt)
      .sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name));
  }

  open(account: Account): Account {
    if (this.host.accounts[account.id]) throw new LedgerError(`Account already exists: ${account.id}`);
    this.host.accounts[account.id] = account;
    return account;
  }

  /**
   * Records a balanced transaction. Throws if postings do not sum to zero,
   * which is the guard that makes money conservation a structural property
   * rather than something we hope holds.
   */
  post(txn: LedgerTransaction): LedgerTransaction {
    if (txn.postings.length < 2) {
      throw new LedgerError(`Transaction ${txn.id} ('${txn.memo}') needs at least two postings.`);
    }
    let sum = 0;
    for (const p of txn.postings) {
      if (!Number.isInteger(p.amount)) {
        throw new LedgerError(`Non-integer posting amount ${p.amount} in ${txn.id} ('${txn.memo}'). Money is always cents.`);
      }
      sum += p.amount;
    }
    if (sum !== 0) {
      throw new LedgerError(
        `Transaction ${txn.id} ('${txn.memo}') doesn’t balance: postings sum to ${sum} cents, expected 0.`,
      );
    }
    // Every account found and every native worked out before anything moves (from 2026-10-16), so a refused posting
    // leaves no balance changed.
    const accounts = txn.postings.map((p) => this.account(p.accountId));
    const natives = accounts.some((a) => a.currency !== undefined) || txn.postings.some((p) => p.native !== undefined)
      ? this.nativesOf(txn, accounts) : undefined;
    txn.postings.forEach((p, i) => {
      const acct = accounts[i]!;
      acct.balance += p.amount;
      const native = natives?.[i];
      if (native !== undefined) {
        p.native = native;
        acct.held = (acct.held ?? 0) + native;
      }
    });
    this.host.transactions.push(txn);
    return txn;
  }

  /**
   * Each posting's figure in its account's currency, or nothing for an account kept in the save's (from 2026-10-16).
   *
   * A posting that takes out exactly what the account holds takes out exactly what the bank shows, so an account
   * emptied is empty in both figures: converting the balance instead would leave behind whatever the two figures had
   * drifted apart by (five 1¢ postings hold 5p, and 5¢ converted is 4p, so 1p would stay at the bank).
   */
  private nativesOf(txn: LedgerTransaction, accounts: Account[]): (Money | undefined)[] {
    const balance = new Map<string, Money>();
    const held = new Map<string, Money>();
    return txn.postings.map((p, i) => {
      const acct = accounts[i]!;
      if (acct.currency === undefined) {
        if (p.native !== undefined) {
          throw new LedgerError(`Transaction ${txn.id} ('${txn.memo}') gives ${acct.name} a figure in another currency, and it’s kept in the save’s.`);
        }
        return undefined;
      }
      const was = balance.get(acct.id) ?? acct.balance;
      const wasHeld = held.get(acct.id) ?? acct.held ?? 0;
      let native = p.native;
      if (native === undefined) {
        native = p.amount === -was ? -wasHeld : this.toCurrency?.(p.amount, acct.currency);
        if (native === undefined) {
          throw new LedgerError(`Transaction ${txn.id} ('${txn.memo}') can’t be put in ${acct.currency} for ${acct.name}: there’s no rate.`);
        }
      }
      if (!Number.isInteger(native)) {
        throw new LedgerError(`Non-integer native amount ${native} in ${txn.id} ('${txn.memo}'). Money is always minor units.`);
      }
      // The two figures agree in sign (from 2026-10-16): where a posting would leave the account empty in its own money
      // and not in the save's, or below zero in one and above it in the other, the save's figure becomes what its own is
      // worth (a cent at least, either way), the cents moved between this posting and the transaction's nominal side, a
      // fee's expense or a purchase's, which stays balanced. Until then a fee in pounds that took the last of what the bank
      // showed left 2¢, and the next day bought 2¢ of food from an account at £0.00; and thirty-four of Santander
      // México's fees left it 68 centavos to the good and 4¢ below zero. A transfer between two of the holder's own
      // accounts has no nominal side, and is left as it is.
      const heldAfter = wasHeld + native;
      const after = was + p.amount;
      if (Math.sign(heldAfter) !== Math.sign(after)) {
        const worth = heldAfter === 0 ? 0 : this.toSave?.(heldAfter, acct.currency);
        const target = worth === undefined ? after : worth === 0 && heldAfter !== 0 ? Math.sign(heldAfter) : worth;
        const nominal = txn.postings.findIndex((_q, j) => j !== i && accounts[j]!.nominal && accounts[j]!.currency === undefined);
        if (nominal >= 0 && target !== after) {
          p.amount += target - after;
          txn.postings[nominal]!.amount -= target - after;
        }
      }
      balance.set(acct.id, was + p.amount);
      held.set(acct.id, wasHeld + native);
      return native;
    });
  }

  /** Available spend: cash balance, or remaining credit on a revolving line. */
  availableFunds(accountId: string): Money {
    const a = this.account(accountId);
    if (a.kind === 'credit_card' || a.kind === 'company_credit') {
      return Math.max(0, (a.creditLimit ?? 0) + a.balance);
    }
    return a.balance;
  }

  /** Transactions touching an account, newest first. */
  history(accountId: string, limit = 100): LedgerTransaction[] {
    const out: LedgerTransaction[] = [];
    for (let i = this.host.transactions.length - 1; i >= 0 && out.length < limit; i--) {
      const t = this.host.transactions[i] as LedgerTransaction;
      if (t.postings.some((p) => p.accountId === accountId)) out.push(t);
    }
    return out;
  }

  /** Net effect of a transaction on one account. */
  static effectOn(txn: LedgerTransaction, accountId: string): Money {
    return txn.postings.reduce((s, p) => (p.accountId === accountId ? s + p.amount : s), 0);
  }

  /** Recomputes every balance from postings. Used by reconciliation tests. */
  recompute(): Record<string, Money> {
    const totals: Record<string, Money> = {};
    for (const id of Object.keys(this.host.accounts)) totals[id] = 0;
    for (const txn of this.host.transactions) {
      for (const p of txn.postings) {
        totals[p.accountId] = (totals[p.accountId] ?? 0) + p.amount;
      }
    }
    return totals;
  }

  /** Recomputes what each account in another currency holds, from its postings' `native` (from 2026-10-16). */
  recomputeHeld(): Record<string, Money> {
    const totals: Record<string, Money> = {};
    for (const [id, acct] of Object.entries(this.host.accounts)) if (acct.currency !== undefined) totals[id] = 0;
    for (const txn of this.host.transactions) {
      for (const p of txn.postings) {
        const was = totals[p.accountId];
        if (p.native !== undefined && was !== undefined) totals[p.accountId] = was + p.native;
      }
    }
    return totals;
  }

  /**
   * Proves the ledger is internally consistent. Returns a list of problems;
   * an empty list means the books balance.
   */
  audit(): string[] {
    const problems: string[] = [];
    const recomputed = this.recompute();
    for (const [id, acct] of Object.entries(this.host.accounts)) {
      const expected = recomputed[id] ?? 0;
      if (expected !== acct.balance) {
        problems.push(`Account ${id} (${acct.name}) cached balance ${acct.balance} != posted total ${expected}.`);
      }
    }
    // The second figure's law (from 2026-10-16): what the bank shows is the sum of the postings' native, every posting
    // to an account in another currency carries one, and no other posting does.
    for (const [id, total] of Object.entries(this.recomputeHeld())) {
      const acct = this.host.accounts[id]!;
      if ((acct.held ?? 0) !== total) problems.push(`Account ${id} (${acct.name}) holds ${acct.held ?? 0} ${acct.currency} != posted total ${total}.`);
    }
    for (const [id, acct] of Object.entries(this.host.accounts)) {
      if (acct.currency === undefined && acct.held !== undefined) problems.push(`Account ${id} (${acct.name}) holds a figure in another currency, and it’s kept in the save’s.`);
    }
    for (const txn of this.host.transactions) {
      for (const p of txn.postings) {
        const currency = this.host.accounts[p.accountId]?.currency;
        if (currency !== undefined && p.native === undefined) problems.push(`Transaction ${txn.id} ('${txn.memo}') posts to ${p.accountId} without its figure in ${currency}.`);
        if (currency === undefined && p.native !== undefined) problems.push(`Transaction ${txn.id} ('${txn.memo}') gives ${p.accountId} a figure in another currency, and it’s kept in the save’s.`);
      }
    }
    let grand = 0;
    for (const txn of this.host.transactions) {
      const sum = txn.postings.reduce((s, p) => s + p.amount, 0);
      if (sum !== 0) problems.push(`Transaction ${txn.id} ('${txn.memo}') sums to ${sum}, expected 0.`);
      grand += sum;
    }
    if (grand !== 0) problems.push(`Universe-wide posting total is ${grand}, expected 0. Money was created or destroyed.`);
    return problems;
  }

  /** Sum of real (non-nominal) balances for an owner. Liabilities count negative. */
  netWorthCash(ownerId: string): Money {
    return this.accountsOf(ownerId).reduce((s, a) => s + a.balance, 0);
  }

  /** Total spend in a category over a window. */
  spendByCategory(ownerId: string, from: Instant, to: Instant): Record<string, Money> {
    const owned = new Set(this.accountsOf(ownerId).map((a) => a.id));
    const out: Record<string, Money> = {};
    for (const txn of this.host.transactions) {
      if (txn.at < from || txn.at > to) continue;
      const delta = txn.postings.reduce((s, p) => (owned.has(p.accountId) ? s + p.amount : s), 0);
      if (delta < 0) out[txn.category] = (out[txn.category] ?? 0) + -delta;
    }
    return out;
  }
}
