// Save version 9 to 10 (the owner's v8 package, 07 step 2 and A21; from November 14, 2026): the personal account's and the
// company's postings move into the journal, in US cents, each as a transaction against the outside account its kind
// names. Their order, dates, labels and keys are kept. The two sides of an old move between you and your company were
// separate postings, and stay separate transactions here through the company-transfers clearing account, which therefore
// nets to zero only when both sides were posted.
//
// Reconciled before it is accepted: each account's journal balance must equal the sum of the postings it replaced, in
// cents, or the migration throws, the save is not opened, and the stored copy (kept untouched by save.ts before any
// upgrade) is what remains. Nothing is rounded: an old amount that isn't a whole number of cents is refused, not fixed.
import type { Journal, JournalTx } from './journal';
import { emptyJournal } from './journal';
import { checkMinor } from './money';
import { counterOf, PERSONAL_CASH, type PersonalKind } from '../personal';

type Obj = Record<string, unknown>;
interface OldPosting { id: string; at: number; kind: string; amount: number; label: string; key: string }

const COMPANY_COUNTER: Record<string, string> = { capital: 'company-transfers', draw: 'company-transfers', 'to-project': 'projects', 'from-project': 'projects', formation: 'formation', overhead: 'first-look-overhead' };
const COMPANY_CASH = 'company:cash:USD';

export function migrateV9toV10(raw: Obj): Obj {
  if (raw.journal) return raw; // idempotent
  const money = raw.money as { postings?: OldPosting[]; family?: unknown } | undefined;
  const company = raw.company as { name: string; foundedAt: number; postings?: OldPosting[] } | undefined;
  const j: Journal = emptyJournal();
  const open = (id: string, owner: 'player' | 'company' | 'outside', type: 'asset' | 'clearing', label: string, at: number) => {
    j.accounts[id] ??= { id, owner, type, currency: 'USD', label, state: 'open', openedAt: at };
  };
  const all: { side: 'player' | 'company'; p: OldPosting }[] = [
    ...(money?.postings ?? []).map((p) => ({ side: 'player' as const, p })),
    ...(company?.postings ?? []).map((p) => ({ side: 'company' as const, p })),
  ].sort((a, b) => a.p.at - b.p.at); // stable: within a moment, the order each list had
  const keys = new Set<string>();
  const want = { player: 0, company: 0 };
  for (const { side, p } of all) {
    const minor = p.amount * 100;
    checkMinor(minor); // refuses a fraction of a cent or an unsafe sum: the save is not opened
    want[side] += minor;
    const cash = side === 'player' ? PERSONAL_CASH : COMPANY_CASH;
    if (side === 'player') open(PERSONAL_CASH, 'player', 'asset', 'Your Account', p.at);
    else open(COMPANY_CASH, 'company', 'asset', `${company!.name}'s Account`, p.at);
    // A formation fee was posted on your side as a move to the company; it went to the outside world, and goes there now.
    const counter = side === 'player' ? (p.key.startsWith('company:form:') ? 'formation' : counterOf(p.kind as PersonalKind)) : COMPANY_COUNTER[p.kind];
    if (!counter) throw new Error(`An old posting has an unknown kind: ${p.kind}.`);
    const other = `outside:${counter}:USD`;
    open(other, 'outside', 'clearing', counter, p.at);
    // An old key used twice keeps both postings: the second gets the posting's id after it, so neither is lost.
    const key = keys.has(p.key) ? `${p.key}#${p.id}` : p.key;
    keys.add(key);
    const tx: JournalTx = { id: `tx-${++j.seq}`, key, at: p.at, kind: p.kind, memo: p.label, status: 'settled',
      lines: [{ account: cash, minor, kind: p.kind, label: p.label }, { account: other, minor: -minor }], history: [{ at: p.at, status: 'settled', reason: 'migrated from save version 9' }] };
    j.txs.push(tx);
  }
  const got = (acc: string) => j.txs.reduce((a, t) => a + t.lines.filter((l) => l.account === acc).reduce((b, l) => b + l.minor, 0), 0);
  if (got(PERSONAL_CASH) !== want.player || got(COMPANY_CASH) !== want.company) throw new Error('The accounts did not reconcile when this save was updated.');
  const out: Obj = { ...raw, journal: j };
  if (money) out.money = money.family !== undefined ? { family: money.family } : {};
  if (company) out.company = { name: company.name, foundedAt: company.foundedAt };
  return out;
}
