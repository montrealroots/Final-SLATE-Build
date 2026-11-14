// The player's own production company (the owner's v5 brief, 9: "Complete company accounts and explicit transfers between
// personal, project and company funds"). Built November 13, 2026: until then the game had a personal account and project
// ledgers, and nothing between them.
//
// A company is formed by the player, with a name and capital moved from their own account. It has an account of its own,
// a list of postings like the personal one, so its balance is always the sum of what moved and never a number someone
// typed. Every movement is explicit and posted once on both sides:
// - personal to company (capital) and company to personal (a draw);
// - company to a project (company money in, a backer line like your own money: nobody is repaid from it, and what the
//   project doesn't spend is the company's again);
// - a delivered project's kept income, or the company's unspent money, back to the company.
// A project the company puts money into is produced by it: its credits say so ("A … Production").
// What the game doesn't model, and says nowhere it does: tax, payroll, limited liability, company law. The formation fee
// is game calibration, not a registry's real fee.
import { ledgerTotals, money, reserve, settle, closeSettled } from './budget';
import { financeSummary, moneyKept, scriptApprovedFor } from './finance';
import { openPersonalAccount, PERSONAL_CASH, personalBalance, postPersonal } from './personal';
import { available, ensureAccount, outsideAccount, postTx, statementLines } from './cash/journal';
import { fromMinor, toMinor } from './cash/money';
import { addLog, newId } from './state';
import type { FinanceDeal, GameState, Project } from './types';

export type CompanyKind = 'capital' | 'draw' | 'to-project' | 'from-project' | 'formation' | 'overhead';
export interface CompanyPosting { id: string; at: number; kind: CompanyKind; amount: number; label: string; key: string }
/** The company's postings live in the journal from November 14, 2026 (companyPostings reads them); before, a list here. */
export interface Company { name: string; foundedAt: number }

/** What forming a company costs, from your own account. Game calibration, not a registry's fee. */
export const FORMATION_FEE = 300;
export const COMPANY_LABELS: Record<CompanyKind, string> = {
  capital: 'Put In By You', draw: 'Drawn By You', 'to-project': 'Put Into Projects', 'from-project': 'Back From Projects', formation: 'Formation', overhead: 'Overhead From A First-Look Deal',
};

// The company's account is the journal's company cash account. A move between you and the company is one transaction
// with a line on each account, so the two can't disagree and the pair is never revenue (A02). Before November 14, 2026
// it was a posting on each side, joined only by their keys.
export const COMPANY_CASH = 'company:cash:USD';
const COUNTER: Record<CompanyKind, string> = { capital: 'company-transfers', draw: 'company-transfers', 'to-project': 'projects', 'from-project': 'projects', formation: 'formation', overhead: 'first-look-overhead' };
const openCompanyAccount = (state: GameState) => ensureAccount(state, { id: COMPANY_CASH, owner: 'company', type: 'asset', currency: 'USD', label: `${state.company!.name}'s Account` });
/** A movement between the company and the outside world (a project, a studio's overhead). */
export const postCompany = (state: GameState, kind: CompanyKind, amount: number, label: string, key: string) => {
  openCompanyAccount(state);
  const minor = toMinor(Math.round(amount));
  postTx(state, { key, kind, memo: label, lines: [{ account: COMPANY_CASH, minor, kind, label }, { account: outsideAccount(state, COUNTER[kind], 'USD'), minor: -minor }] });
};
/** A movement between your account and the company's, as one transaction. `amount` > 0 goes to the company. */
function transfer(state: GameState, amount: number, key: string, mine: string, theirs: string): void {
  openCompanyAccount(state);
  openPersonalAccount(state);
  const minor = toMinor(Math.round(amount));
  const kind: CompanyKind = minor > 0 ? 'capital' : 'draw';
  postTx(state, { key, kind, memo: minor > 0 ? mine : theirs, lines: [{ account: PERSONAL_CASH, minor: -minor, kind: 'company', label: mine }, { account: COMPANY_CASH, minor, kind, label: theirs }] });
}
export const companyPostings = (state: GameState): CompanyPosting[] =>
  statementLines(state, COMPANY_CASH).map(({ tx, line }) => ({ id: tx.id, at: tx.at, kind: line.kind as CompanyKind, amount: fromMinor(line.minor), label: line.label ?? tx.memo, key: tx.key }));
export const companyBalance = (state: GameState): number => fromMinor(available(state, COMPANY_CASH));
/** The company's account by what each part is, so money put in by you never reads as income. */
export const companyStatement = (state: GameState): { kind: CompanyKind; total: number }[] =>
  (Object.keys(COMPANY_LABELS) as CompanyKind[]).map((kind) => ({ kind, total: companyPostings(state).filter((x) => x.kind === kind).reduce((a, x) => a + x.amount, 0) })).filter((x) => x.total !== 0);

/** Why a company can't be formed with this name and capital, or null. */
export function formRefusal(state: GameState, name: string, capital: number): string | null {
  if (state.company) return `You already have a company, ${state.company.name}.`;
  const n = name.trim();
  if (n.length < 2) return 'Give the company a name.';
  if (n.length > 60) return 'Keep the name to 60 characters.';
  if (!(capital >= 0) || !Number.isFinite(capital)) return 'Say how much to put in, or nothing.';
  const need = Math.round(capital) + FORMATION_FEE;
  if (need > personalBalance(state)) return `Forming it costs ${money(FORMATION_FEE)}${capital > 0 ? `, and ${money(capital)} goes in` : ''}: you have ${money(personalBalance(state))} in your own account.`;
  return null;
}

/** Form the company: the fee is paid and the capital moved from your own account, each posted on both sides. */
export function formCompany(state: GameState, name: string, capital: number): Company {
  const no = formRefusal(state, name, capital);
  if (no) throw new Error(no);
  state.company = { name: name.trim(), foundedAt: state.now };
  const id = newId(state, 'co');
  postPersonal(state, 'company', -FORMATION_FEE, `Forming ${state.company.name}`, `company:form:${id}`, 'formation');
  if (capital > 0) transfer(state, capital, `company:capital:${id}`, `Put Into ${state.company.name}`, 'Put In By You When It Was Formed');
  addLog(state, `You formed ${state.company.name}${capital > 0 ? ` with ${money(capital)} of your own money` : ''}. Forming it cost ${money(FORMATION_FEE)}.`, 'money', { route: { view: 'profile' } });
  return state.company;
}

/** Move money between your own account and the company's: in is capital, out is a draw. */
export function moveCompanyMoney(state: GameState, direction: 'in' | 'out', amount: number): void {
  const c = state.company;
  if (!c) throw new Error('Form a company first.');
  const a = Math.round(amount);
  if (!(a > 0)) throw new Error('Say how much to move.');
  const id = newId(state, 'cm');
  if (direction === 'in') {
    if (a > personalBalance(state)) throw new Error(`You have ${money(personalBalance(state))} in your own account.`);
    transfer(state, a, `company:capital:${id}`, `Put Into ${c.name}`, 'Put In By You');
  } else {
    if (a > companyBalance(state)) throw new Error(`${c.name} has ${money(companyBalance(state))}.`);
    transfer(state, -a, `company:draw:${id}`, `Drawn From ${c.name}`, 'Drawn By You');
  }
  addLog(state, direction === 'in' ? `You put ${money(a)} into ${c.name}.` : `You drew ${money(a)} from ${c.name}.`, 'money', { route: { view: 'profile' } });
}

/** Why the company's money can't go into this project now, or null. */
export function companyInRefusal(state: GameState, p: Project, amount: number): string | null {
  const c = state.company;
  if (!c) return 'Form a company first.';
  if (p.delivered) return 'This project is delivered.';
  if (!scriptApprovedFor(p)) return 'Approve a script first.';
  if (!(amount > 0) || !Number.isFinite(amount)) return 'Say how much to put in.';
  if (amount > companyBalance(state)) return `${c.name} has ${money(companyBalance(state))}.`;
  const { stillToRaise } = financeSummary(p);
  if (amount > stillToRaise) return stillToRaise > 0 ? `This project has ${money(stillToRaise)} still to raise.` : 'This project has nothing left to raise.';
  return null;
}

/** Put the company's money into a project: a backer line nobody is repaid from; what isn't spent is the company's again. */
export function companyIntoProject(state: GameState, p: Project, amount: number): FinanceDeal {
  const no = companyInRefusal(state, p, amount);
  if (no) throw new Error(no);
  const c = state.company!;
  const a = Math.round(amount);
  const d: FinanceDeal = {
    id: newId(state, 'fd'), kind: 'company', backer: c.name, amount: a, status: 'accepted', askedAt: state.now, reason: `From ${c.name}'s account.`,
    received: a, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: 'yours' },
  };
  (p.finance ??= { estimate: 0, target: 0, deals: [] }).deals.push(d);
  p.funding.fund += a;
  p.producedBy ??= c.name;
  postCompany(state, 'to-project', -a, `Put Into ${p.title}`, `to-project:${d.id}`);
  addLog(state, `${c.name} put ${money(a)} into ${p.title}, and produces it.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return d;
}

/**
 * Take a delivered project's kept income, or the unspent money put into it, to the company rather than home: it leaves
 * the project's ledger as a transfer line and arrives in the company's account. The same amounts a take-home could move
 * (personal.ts takeHomeAvailable), so neither can move what the other already has.
 */
export function takeToCompany(state: GameState, p: Project, kind: 'earnings' | 'capital', amount: number): void {
  const c = state.company;
  if (!c) throw new Error('Form a company first.');
  if (!p.delivered) throw new Error('Deliver the project first.');
  const m = moneyKept(p);
  const free = Math.max(0, ledgerTotals(p).available);
  const can = m.oldMove ? 0 : kind === 'earnings' ? Math.floor(Math.min(m.earnings, free)) : Math.floor(Math.min(m.capital, free - Math.min(m.earnings, free)));
  if (!(amount > 0) || amount > can) throw new Error(can > 0 ? `At most ${money(can)} can go to ${c.name} from ${p.title} now.` : `${p.title} has nothing of that kind to move.`);
  const a = Math.floor(amount);
  const id = newId(state, 'tc');
  const o = reserve(state, p, `Moved To ${c.name}`, 'finance', a, `transfer:company-${id}:${kind}`);
  settle(state, p, o.id, a, `transfer:company-${id}`);
  closeSettled(p, o.id);
  p.history.push({ at: state.now, text: `${money(a)} of the ${kind === 'earnings' ? 'income it kept' : 'money put in that it didn\'t spend'} went to ${c.name}.` });
  postCompany(state, 'from-project', a, kind === 'earnings' ? `Income From ${p.title}` : `Unspent Money Back From ${p.title}`, `from-project:${id}`);
  addLog(state, `${money(a)} went from ${p.title} to ${c.name}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

