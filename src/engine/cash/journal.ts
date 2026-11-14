// One transaction journal for every account the player or their company holds (the owner's v8 package, 03 "Canonical
// money"; A02, A07, A08; from November 14, 2026). Until then the personal account and the company account were two lists
// of postings, and a move between them was two postings with nothing joining them.
//
// Each transaction is a set of lines that sum to zero in each currency: money leaving one account arrives in another, or
// comes from or goes to the outside world through an account that says what it is (an inheritance, paid work, a fee). A
// balance is the sum of its settled lines and is never stored. Every transaction carries an idempotency key: posting the
// same key again returns the first transaction and moves nothing, so a retried command or a reloaded month can't pay
// twice. Validation happens before anything is written, so a refused transaction changes no balance.
//
// A hold sets money aside without spending it: available = posted − held. Capturing a hold posts the payment and
// releases the hold in one step, so the same money is never counted out twice. Pending transactions show as pending and
// count toward no balance until they settle; a reversal is a new transaction linked to the old one, never a deletion.
import { checkMinor, convert, currencyInfo, type Money, type Rate } from './money';
import type { GameState } from '../types';

export type AccountType = 'asset' | 'liability' | 'equity' | 'income' | 'expense' | 'clearing';
export type AccountOwner = 'player' | 'company' | 'outside';
export type AccountState = 'draft' | 'pending' | 'open' | 'restricted' | 'closing' | 'closed';
export interface Account {
  id: string; owner: AccountOwner; type: AccountType; currency: string; label: string; state: AccountState; openedAt: number;
  /** A bank product this account is held under (banking step), when there is one. */
  product?: string;
}
export interface JournalLine { account: string; minor: number; kind?: string; label?: string }
export type TxStatus = 'pending' | 'settled' | 'failed' | 'reversed';
export interface FxRecord { source: Money; target: Money; rate: Rate; fee: Money | null; rounding: string }
export interface JournalTx {
  id: string; key: string; at: number; kind: string; memo: string; status: TxStatus; lines: JournalLine[];
  history: { at: number; status: TxStatus; reason: string }[];
  /** A reversal names what it reverses; the reversed transaction names its reversal. */
  reverses?: string; reversedBy?: string;
  fx?: FxRecord;
}
export interface Hold { id: string; key: string; account: string; minor: number; at: number; reason: string; status: 'active' | 'released' | 'captured'; endedAt?: number }
export interface Journal { accounts: Record<string, Account>; txs: JournalTx[]; holds: Hold[]; seq: number }

export const emptyJournal = (): Journal => ({ accounts: {}, txs: [], holds: [], seq: 0 });
/** The journal, made on first write. A read of a state that has none sees an empty one and leaves the state alone. */
export const journalOf = (state: GameState): Journal => (state.journal ??= emptyJournal());
const readJournal = (state: GameState): Journal => state.journal ?? emptyJournal();

/** Open (or return) an account. Opening one twice with different terms is a mistake, and refused. */
export function ensureAccount(state: GameState, a: Omit<Account, 'state' | 'openedAt'> & { state?: AccountState }): Account {
  currencyInfo(a.currency);
  const j = journalOf(state);
  const had = j.accounts[a.id];
  if (had) {
    if (had.currency !== a.currency || had.owner !== a.owner || had.type !== a.type) throw new Error(`Account ${a.id} already exists with other terms.`);
    return had;
  }
  return (j.accounts[a.id] = { ...a, state: a.state ?? 'open', openedAt: state.now });
}

/** The outside world's side of a movement: where money came from or went. One per kind and currency. */
export function outsideAccount(state: GameState, kind: string, currency: string, type: AccountType = 'clearing'): string {
  return ensureAccount(state, { id: `outside:${kind}:${currency}`, owner: 'outside', type, currency, label: kind }).id;
}

const txByKey = (j: Journal, key: string) => j.txs.find((t) => t.key === key);

export interface TxInput { key: string; kind: string; memo: string; lines: JournalLine[]; status?: 'pending' | 'settled'; fx?: FxRecord }

/**
 * Check a transaction without writing it: every amount a safe whole number, every account open and in the line's
 * currency, each currency summing to zero, and no player or company asset account taken below what is available.
 */
export function txRefusal(state: GameState, t: TxInput): string | null {
  const j = readJournal(state);
  if (!t.key) return 'A transaction needs a key.';
  if (!t.lines.length) return 'A transaction needs lines.';
  const sums = new Map<string, bigint>();
  for (const l of t.lines) {
    try { checkMinor(l.minor); } catch (e) { return (e as Error).message; }
    const a = j.accounts[l.account];
    if (!a) return `No account ${l.account}.`;
    if (a.state === 'closed' || a.state === 'draft') return `${a.label} isn't open.`;
    sums.set(a.currency, (sums.get(a.currency) ?? 0n) + BigInt(l.minor));
  }
  for (const [cur, s] of sums) if (s !== 0n) return `The lines don't balance in ${cur}.`;
  if ((t.status ?? 'settled') === 'settled') {
    const out = new Map<string, number>();
    for (const l of t.lines) out.set(l.account, (out.get(l.account) ?? 0) + l.minor);
    for (const [id, delta] of out) {
      const a = j.accounts[id];
      if (delta >= 0 || a.owner === 'outside' || a.type !== 'asset') continue;
      if (a.state === 'restricted') return `${a.label} is restricted.`;
      if (available(state, id) + delta < 0) return `${a.label} doesn't have enough available.`;
    }
  }
  return null;
}

/** Post a transaction, or return the one already posted under its key. Atomic: refused means nothing is written. */
export function postTx(state: GameState, t: TxInput): JournalTx {
  const j = journalOf(state);
  const had = txByKey(j, t.key);
  if (had) return had;
  const no = txRefusal(state, t);
  if (no) throw new Error(no);
  const status = t.status ?? 'settled';
  const tx: JournalTx = { id: `tx-${++j.seq}`, key: t.key, at: state.now, kind: t.kind, memo: t.memo, status, lines: t.lines.map((l) => ({ ...l })), history: [{ at: state.now, status, reason: 'posted' }], ...(t.fx ? { fx: t.fx } : {}) };
  j.txs.push(tx);
  return tx;
}

/** A pending transaction settles (its lines now count) or fails (they never will). Settling checks funds then. */
export function setTxStatus(state: GameState, id: string, status: 'settled' | 'failed', reason: string): JournalTx {
  const j = journalOf(state);
  const tx = j.txs.find((t) => t.id === id);
  if (!tx) throw new Error(`No transaction ${id}.`);
  if (tx.status !== 'pending') throw new Error(`That transaction is ${tx.status}, not pending.`);
  if (status === 'settled') {
    const no = txRefusal(state, { key: '-', kind: tx.kind, memo: tx.memo, lines: tx.lines });
    if (no) throw new Error(no);
  }
  tx.status = status;
  tx.history.push({ at: state.now, status, reason });
  return tx;
}

/** Undo a settled transaction with a linked one that moves everything back. History keeps both. */
export function reverseTx(state: GameState, id: string, reason: string): JournalTx {
  const j = journalOf(state);
  const tx = j.txs.find((t) => t.id === id);
  if (!tx) throw new Error(`No transaction ${id}.`);
  if (tx.status !== 'settled') throw new Error(`Only a settled transaction can be reversed; this one is ${tx.status}.`);
  const back = postTx(state, { key: `reverse:${tx.key}`, kind: tx.kind, memo: `Reversed: ${tx.memo} (${reason})`, lines: tx.lines.map((l) => ({ ...l, minor: -l.minor })) });
  back.reverses = tx.id;
  tx.reversedBy = back.id;
  tx.status = 'reversed';
  tx.history.push({ at: state.now, status: 'reversed', reason });
  // A reversed transaction's lines still count, and its reversal's cancel them: the balance is history's sum, never a deletion.
  return back;
}

const countsInBalance = (t: JournalTx) => t.status === 'settled' || t.status === 'reversed';

/** The settled balance of an account, in its minor units. */
export function posted(state: GameState, account: string): number {
  let s = 0;
  for (const t of readJournal(state).txs) if (countsInBalance(t)) for (const l of t.lines) if (l.account === account) s += l.minor;
  return s;
}
export function held(state: GameState, account: string): number {
  return readJournal(state).holds.filter((h) => h.account === account && h.status === 'active').reduce((a, h) => a + h.minor, 0);
}
/** What can be spent now: settled, less what is held. Money still on its way isn't here. */
export const available = (state: GameState, account: string): number => posted(state, account) - held(state, account);
export function pendingIn(state: GameState, account: string): number {
  let s = 0;
  for (const t of readJournal(state).txs) if (t.status === 'pending') for (const l of t.lines) if (l.account === account && l.minor > 0) s += l.minor;
  return s;
}

/** Set money aside for an obligation. Idempotent by key; refused when it isn't available. */
export function placeHold(state: GameState, key: string, account: string, minor: number, reason: string): Hold {
  const j = journalOf(state);
  const had = j.holds.find((h) => h.key === key);
  if (had) return had;
  checkMinor(minor);
  if (!(minor > 0)) throw new Error('A hold must be for more than nothing.');
  if (!j.accounts[account]) throw new Error(`No account ${account}.`);
  if (available(state, account) < minor) throw new Error(`${j.accounts[account].label} doesn't have enough available.`);
  const h: Hold = { id: `hold-${++j.seq}`, key, account, minor, at: state.now, reason, status: 'active' };
  j.holds.push(h);
  return h;
}
/** Release a hold: the money is available again, and nothing was paid. */
export function releaseHold(state: GameState, id: string): void {
  const h = journalOf(state).holds.find((x) => x.id === id);
  if (!h || h.status !== 'active') throw new Error('That hold isn\'t active.');
  h.status = 'released';
  h.endedAt = state.now;
}
/**
 * Pay what a hold set aside: the hold ends and the payment posts as one step. Paying less releases the rest. The amount
 * paid is checked against the account with the hold already gone, so it isn't refused for the money it was held for.
 */
export function captureHold(state: GameState, id: string, t: Omit<TxInput, 'status'>): JournalTx {
  const j = journalOf(state);
  const h = j.holds.find((x) => x.id === id);
  if (!h || h.status !== 'active') throw new Error('That hold isn\'t active.');
  const out = -t.lines.filter((l) => l.account === h.account).reduce((a, l) => a + l.minor, 0);
  if (out > h.minor) throw new Error('A capture can\'t pay more than was held.');
  h.status = 'captured';
  try {
    const tx = postTx(state, t);
    h.endedAt = state.now;
    return tx;
  } catch (e) {
    h.status = 'active'; // refused: the hold stands, and nothing was paid
    throw e;
  }
}

/**
 * Exchange between two of the same owner's accounts at a dated rate, with an optional fee in the source currency. Each
 * currency balances through an FX clearing account, and the quote, fee and rounding are kept on the transaction.
 */
export function exchange(state: GameState, key: string, from: string, to: string, sourceMinor: number, rate: Rate, feeMinor = 0): JournalTx {
  const j = journalOf(state);
  const had = txByKey(j, key);
  if (had) return had;
  const a = j.accounts[from], b = j.accounts[to];
  if (!a || !b) throw new Error('Both accounts must exist.');
  if (a.currency !== rate.from || b.currency !== rate.to) throw new Error('The rate doesn\'t match these accounts.');
  checkMinor(sourceMinor); checkMinor(feeMinor);
  if (!(sourceMinor > 0) || feeMinor < 0) throw new Error('Exchange more than nothing, and a fee of nothing or more.');
  const { target, rounding } = convert({ currency: a.currency, minor: sourceMinor }, rate);
  const fxA = outsideAccount(state, 'fx', a.currency), fxB = outsideAccount(state, 'fx', b.currency);
  const lines: JournalLine[] = [
    { account: from, minor: -sourceMinor, kind: 'fx', label: `Exchanged To ${b.currency}` }, { account: fxA, minor: sourceMinor },
    { account: fxB, minor: -target.minor }, { account: to, minor: target.minor, kind: 'fx', label: `Exchanged From ${a.currency}` },
  ];
  if (feeMinor) lines.push({ account: from, minor: -feeMinor, kind: 'fee', label: 'Exchange Fee' }, { account: outsideAccount(state, 'bank-fees', a.currency), minor: feeMinor });
  return postTx(state, { key, kind: 'fx', memo: `${a.currency} to ${b.currency} at ${rate.num}/${rate.den} (${rate.asOf})`, lines,
    fx: { source: { currency: a.currency, minor: sourceMinor }, target, rate: { ...rate }, fee: feeMinor ? { currency: a.currency, minor: feeMinor } : null, rounding } });
}

/** Every settled line on an account, oldest first: the statement a balance is the sum of. */
export function statementLines(state: GameState, account: string): { tx: JournalTx; line: JournalLine }[] {
  const out: { tx: JournalTx; line: JournalLine }[] = [];
  for (const t of readJournal(state).txs) if (countsInBalance(t)) for (const l of t.lines) if (l.account === account) out.push({ tx: t, line: l });
  return out;
}
