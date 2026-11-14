// The player's own production company, out of play (the owner's command of November 14, 2026: "Remove the company system
// from active gameplay for now"). From November 13, 2026 the player could form a company, move money in and out of it,
// put its money into projects and take their money back to it; on November 14 it was applied for and decided by a
// registry. All of that is gone from play: no company is applied for, formed, funded or drawn on, and no screen offers
// it. What stays:
// - the banner, a name your work is credited under, which is you by another name (A03);
// - a save's company from before, kept as it was (cash/migrate11.ts inventories it): its account read back from the v8
//   journal, its capital, the projects it produces, and the overhead of a first-look deal signed while it held one, which
//   goes on being paid to it (first-look.ts `payee`), so no signed deal's counterparty is rewritten;
// - an application still waiting in an old save, answered as withdrawn when its day comes, with nothing charged.
// Whose the company's money is now is the owner's to decide; nothing here moves it.
import { available, ensureAccount, outsideAccount, postTx, statementLines } from './cash/journal';
import { fromMinor, toMinor } from './cash/money';
import { addLog, registerHandler } from './state';
import type { GameState, Project } from './types';

export type CompanyKind = 'capital' | 'draw' | 'distribution' | 'to-project' | 'from-project' | 'formation' | 'overhead';
export interface CompanyPosting { id: string; at: number; kind: CompanyKind; amount: number; label: string; key: string }
/**
 * The company's postings live in the journal from November 14, 2026 (companyPostings reads them); before, a list here.
 * From the same day a company is applied for and registered, or refused (the owner's v8 package, 02 "Entity cycle"):
 * `status` absent is a company registered before applications existed.
 */
export interface Company {
  name: string; foundedAt: number;
  status?: 'pending' | 'registered' | 'refused';
  /** Where it is registered: where you lived when you applied. */
  jurisdiction?: string;
  appliedAt?: number;
  /** What you said you would put in once it is registered: it moves then, if you still have it. */
  intendedCapital?: number;
  reason?: string;
}
/**
 * A banner: the name your work is credited under, "A … Production". It is you by another name: no company, no owner but
 * you, no account, no liability shield and no rights moved (A03). Set and cleared freely.
 */
export interface Banner { name: string; setAt: number }
export const registered = (state: GameState) => !!state.company && (state.company.status ?? 'registered') === 'registered';

export const COMPANY_LABELS: Record<CompanyKind, string> = {
  capital: 'Put In By You', draw: 'Capital Returned To You', distribution: 'Earnings Paid Out To You', 'to-project': 'Put Into Projects', 'from-project': 'Back From Projects', formation: 'Formation', overhead: 'Overhead From A First-Look Deal',
};

// The company's account is the journal's company cash account. A move between you and the company is one transaction
// with a line on each account, so the two can't disagree and the pair is never revenue (A02). Before November 14, 2026
// it was a posting on each side, joined only by their keys.
export const COMPANY_CASH = 'company:cash:USD';
const COUNTER: Record<CompanyKind, string> = { capital: 'company-transfers', draw: 'company-transfers', distribution: 'company-transfers', 'to-project': 'projects', 'from-project': 'projects', formation: 'formation', overhead: 'first-look-overhead' };
const openCompanyAccount = (state: GameState) => ensureAccount(state, { id: COMPANY_CASH, owner: 'company', type: 'asset', currency: 'USD', label: `${state.company!.name}'s Account` });
/** A movement between the company and the outside world (a project, a studio's overhead). */
export const postCompany = (state: GameState, kind: CompanyKind, amount: number, label: string, key: string) => {
  openCompanyAccount(state);
  const minor = toMinor(Math.round(amount));
  postTx(state, { key, kind, memo: label, lines: [{ account: COMPANY_CASH, minor, kind, label }, { account: outsideAccount(state, COUNTER[kind], 'USD'), minor: -minor }] });
};
export const companyPostings = (state: GameState): CompanyPosting[] =>
  statementLines(state, COMPANY_CASH).map(({ tx, line }) => ({ id: tx.id, at: tx.at, kind: line.kind as CompanyKind, amount: fromMinor(line.minor), label: line.label ?? tx.memo, key: tx.key }));
export const companyBalance = (state: GameState): number => fromMinor(available(state, COMPANY_CASH));
/** The company's account by what each part is, so money put in by you never reads as income. */
export const companyStatement = (state: GameState): { kind: CompanyKind; total: number }[] =>
  (Object.keys(COMPANY_LABELS) as CompanyKind[]).map((kind) => ({ kind, total: companyPostings(state).filter((x) => x.kind === kind).reduce((a, x) => a + x.amount, 0) })).filter((x) => x.total !== 0);

/** Your capital still in the company: what you put in, less what came back as capital. Earnings paid out aren't counted. */
export function capitalOutstanding(state: GameState): number {
  const ps = companyPostings(state);
  return Math.max(0, ps.filter((x) => x.kind === 'capital').reduce((a, x) => a + x.amount, 0) + ps.filter((x) => x.key.startsWith('company:draw:')).reduce((a, x) => a + x.amount, 0));
}

/** Set (or clear, with an empty name) the banner your work is credited under. Nothing else changes. */
export function setBanner(state: GameState, name: string): void {
  const n = name.trim();
  if (n && (n.length < 2 || n.length > 60)) throw new Error('A banner name is 2 to 60 characters.');
  if (n) state.banner = { name: n, setAt: state.now };
  else delete state.banner;
}
/** The line a project's credits open with: the producing company's, else your banner's, else none. */
export const productionCredit = (state: GameState, p: Project): string | null => p.producedBy ?? state.banner?.name ?? null;

// An application waiting in a save from before the company left play: answered as withdrawn on its day. Its fee was paid
// when it was made, and stays paid; nothing else is charged and nothing moves.
registerHandler('company-decision', (state) => {
  const c = state.company;
  if (!c || c.status !== 'pending') return { suppressInterrupt: true };
  c.status = 'refused';
  c.reason = 'Companies left the game before the registry answered, so the application was withdrawn.';
  const message = `Your application to register ${c.name} was withdrawn: companies left the game before the registry answered. The fee you paid when you applied isn't returned.`;
  addLog(state, message, 'money', { route: { view: 'profile' } });
  return { message };
});
