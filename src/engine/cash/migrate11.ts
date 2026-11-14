// Save version 10 to 11 (from November 14, 2026; the owner's command "Complete banking, papers and homepage migration",
// 6 "Existing saves"). Until 11 the player's own money was in the v8 journal (cash/journal.ts): the account
// 'player:cash:USD' and any v8 bank account (engine/banking.ts, retired the same day). From 11 it is in the bank, 1221's
// ledger (engine/bank.ts), the one journal of the player's money. Nothing is deleted and nothing is counted twice:
// - Each player account in dollars is brought into the bank's current account once, as one posting that names it, and
//   in the v8 journal the same amount moves out of it to a clearing account named for the move. The two must agree to the
//   cent or the save isn't opened.
// - A hold on such an account (a v8 transfer waiting) is released: the transfer never settled, and the money is brought.
// - A player account in another currency isn't brought: there is no dated rate to bring it at (docs/v9/FX.md). It stays
//   in the v8 journal, listed below as not brought, with its amount in its own currency.
// - The company is inventoried, not dissolved: its cash, what it put into projects, the projects it produces and the
//   first-look deals that pay it. Its money stays its own, in the v8 journal, and is never added to yours: whose it is
//   now is the owner's to decide, and the record says it needs that decision. A first-look deal signed while the company
//   held it goes on paying the company (`payee`), so no contract's counterparty is rewritten.
//
// The record is kept in the save (`reconciliation`) and shown on Your Bank. The stored copy from before the upgrade is
// kept untouched by save.ts, as for every upgrade.
import type { GameState } from '../types';
import { available, held, journalOf, posted, type Journal } from './journal';
import { startBank } from '../bank';
import { bankSim } from '../bankworld';
import { capitalOutstanding } from '../company';

type Obj = Record<string, unknown>;

export interface Reconciliation {
  at: number;
  from: 10; to: 11;
  /** Each account brought into the bank: its v8 id and name, what it held settled, and the holds released on it. */
  brought: { account: string; label: string; currency: string; minor: number; holdsReleased: number }[];
  /** Each account left where it was, and why. */
  notBrought: { account: string; label: string; currency: string; minor: number; why: string }[];
  company?: {
    name: string; status: string;
    /** In its own account, settled, in cents. */
    cashMinor: number;
    capitalOutstanding: number;
    projectsProduced: string[];
    projectDeals: { projectId: string; dealId: string; amount: number; received: number }[];
    firstLooksPayingIt: string[];
    needsOwnershipDecision: boolean;
  };
  /** What was checked, in words. */
  checks: string[];
}

/** The raw step: marks the save for the bank to be opened once its places are known (`openBankFromJournal`). */
export function migrateV10toV11(raw: Obj): Obj {
  if (raw.bank || raw.reconciliation) return raw; // idempotent
  return { ...raw, bankPending: true };
}

/**
 * The bank opened for a save brought from version 10, after its places are registered (save.ts `migrate`). Run once:
 * a save with a bank or a record already is left as it is.
 */
export function openBankFromJournal(s: GameState): void {
  const raw = s as unknown as Obj;
  if (!raw.bankPending) return;
  delete raw.bankPending;
  if (s.bank || s.reconciliation) return;
  const j: Journal = journalOf(s);
  const rec: Reconciliation = { at: s.now, from: 10, to: 11, brought: [], notBrought: [], checks: [] };
  startBank(s);
  const bank = s.bank!;
  const primary = bank.people[bank.playerId]!.primaryAccountId!;
  const startBalance = bank.accounts[primary]!.balance;
  let seq = j.seq;
  const clearing = 'outside:moved-to-bank:USD';
  for (const a of Object.values(j.accounts)) {
    if (a.owner !== 'player') continue;
    const settled = posted(s, a.id);
    if (a.currency !== 'USD') {
      if (settled !== 0) rec.notBrought.push({ account: a.id, label: a.label, currency: a.currency, minor: settled, why: 'It is in another currency, and there is no dated rate to bring it at. It stays where it was.' });
      continue;
    }
    // Holds on it released: a v8 transfer that never settled is money still here.
    const holds = j.holds.filter((h) => h.account === a.id && h.status === 'active');
    for (const h of holds) { h.status = 'released'; h.endedAt = s.now; h.reason = `${h.reason} Released when your money moved to your bank.`; }
    if (settled === 0) continue;
    if (settled < 0) { rec.notBrought.push({ account: a.id, label: a.label, currency: 'USD', minor: settled, why: 'It was overdrawn: what it owes is kept on its record, not added to your bank.' }); continue; }
    j.accounts[clearing] ??= { id: clearing, owner: 'outside', type: 'clearing', currency: 'USD', label: 'Moved To Your Bank', state: 'open', openedAt: s.now };
    j.txs.push({ id: `tx-${++seq}`, key: `moved-to-bank:${a.id}`, at: s.now, kind: 'moved-to-bank', memo: `Moved to your bank: ${a.label}`, status: 'settled',
      lines: [{ account: a.id, minor: -settled, kind: 'moved-to-bank', label: 'Moved To Your Bank' }, { account: clearing, minor: settled }],
      history: [{ at: s.now, status: 'settled', reason: 'save version 10 to 11' }] });
    rec.brought.push({ account: a.id, label: a.label, currency: 'USD', minor: settled, holdsReleased: holds.length });
  }
  j.seq = seq;
  const total = rec.brought.reduce((x, b) => x + b.minor, 0);
  if (total > 0) {
    // One opening posting in the bank for each account brought, so the statement names where each came from.
    for (const b of rec.brought) bringIn(s, b.minor, `Brought From ${b.label}`, `brought:${b.account}`);
  }
  // The checks: the bank holds what was brought, and the v8 accounts hold nothing of it now.
  const got = bank.accounts[primary]!.balance - startBalance;
  if (got !== total) throw new Error(`Your bank received ${got} cents where ${total} were brought.`);
  for (const b of rec.brought) if (posted(s, b.account) !== 0 || held(s, b.account) !== 0 || available(s, b.account) !== 0) throw new Error(`${b.label} still holds money after it was brought.`);
  rec.checks.push(`Brought ${rec.brought.length} account${rec.brought.length === 1 ? '' : 's'}, ${(total / 100).toFixed(2)} dollars in all, and the bank received exactly that.`);
  rec.checks.push('Each account brought holds nothing in the old journal now, so nothing is counted twice.');

  if (s.company) {
    const c = s.company;
    const cash = Object.values(j.accounts).filter((a) => a.owner === 'company').reduce((x, a) => x + posted(s, a.id), 0);
    const projectDeals = s.projects.flatMap((p) => (p.finance?.deals ?? []).filter((d) => d.kind === 'company').map((d) => ({ projectId: p.id, dealId: d.id, amount: d.amount, received: d.received })));
    const paying = (s.firstLooks ?? []).filter((f) => f.status === 'active' || f.status === 'offered');
    for (const f of paying) f.payee = 'company';
    rec.company = {
      name: c.name, status: c.status ?? 'registered', cashMinor: cash, capitalOutstanding: capitalOutstanding(s),
      projectsProduced: s.projects.filter((p) => p.producedBy).map((p) => p.id), projectDeals,
      firstLooksPayingIt: paying.map((f) => f.id),
      needsOwnershipDecision: cash !== 0 || projectDeals.length > 0 || paying.length > 0,
    };
    rec.checks.push(`${c.name} was inventoried and left as it was: its money stays its own and was not added to yours.`);
  }
  s.reconciliation = rec;
}

/** One posting into the bank's current account from the old journal's clearing, in cents. */
function bringIn(s: GameState, minor: number, memo: string, key: string): void {
  const u = s.bank!;
  if (u.counters[`slate:${key}`] === 1) return;
  const sim = bankSimFor(s);
  sim.post({ memo, category: `slate:brought#${key}`, postings: [
    { accountId: sim.player.primaryAccountId!, amount: minor },
    { accountId: sim.nominalAccount('equity', 'Your Earlier Account').id, amount: -minor },
  ] });
  u.counters[`slate:${key}`] = 1;
}

const bankSimFor = (s: GameState) => bankSim(s.bank!);
