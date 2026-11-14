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
import { addLog, newId, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, localToInstant, parseYmd, weekdayOfKey } from './time';
import { getPlace } from '../data/places';
import type { FinanceDeal, GameState, Project } from './types';

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

/** What forming a company costs, from your own account. Game calibration, not a registry's fee. */
export const FORMATION_FEE = 300;
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
/** A movement between your account and the company's, as one transaction. `amount` > 0 goes to the company. */
function transfer(state: GameState, amount: number, key: string, mine: string, theirs: string, out: CompanyKind = 'draw'): void {
  openCompanyAccount(state);
  openPersonalAccount(state);
  const minor = toMinor(Math.round(amount));
  const kind: CompanyKind = minor > 0 ? 'capital' : out;
  postTx(state, { key, kind, memo: minor > 0 ? mine : theirs, lines: [{ account: PERSONAL_CASH, minor: -minor, kind: 'company', label: mine }, { account: COMPANY_CASH, minor, kind, label: theirs }] });
}
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

/** What applying costs: game calibration standing in for a registry's fee, which isn't researched for any country yet. */
export const APPLICATION_DAYS = 5;

/**
 * Apply to register a company where you live. The fee is paid now; the registry decides five business days on. A name
 * already used by a studio in the world is refused. Nothing moves into the company until it is registered.
 */
export function applyForCompany(state: GameState, name: string, capital: number): Company {
  const no = formRefusal(state, name, capital);
  if (no) throw new Error(no);
  const id = newId(state, 'co');
  postPersonal(state, 'company', -FORMATION_FEE, `Applying To Register ${name.trim()}`, `company:form:${id}`, 'formation');
  const home = getPlace(state.character.livesIn ?? state.locationId);
  state.company = { name: name.trim(), foundedAt: 0, status: 'pending', jurisdiction: home.country, appliedAt: state.now, intendedCapital: Math.round(capital) };
  const k = dateKey(state.now, home.zone);
  let d = k;
  for (let n = 0; n < APPLICATION_DAYS;) { d = addDaysToKey(d, 1); if (weekdayOfKey(d) !== 0 && weekdayOfKey(d) !== 6) n++; }
  const pd = parseYmd(d);
  schedule(state, localToInstant(home.zone, pd.year, pd.month, pd.day, 11).instant, 'company-decision', {}, { attention: 'notify', priority: 55, id: `company-decision:${id}` });
  addLog(state, `You applied to register ${state.company.name} in ${home.countryName}, for ${money(FORMATION_FEE)}. The registry decides by ${d}.`, 'money', { route: { view: 'profile' } });
  return state.company;
}

registerHandler('company-decision', (state) => {
  const c = state.company;
  if (!c || c.status !== 'pending') return { suppressInterrupt: true };
  const taken = (state.industry?.studios ?? []).some((x) => x.name?.toLowerCase() === c.name.toLowerCase());
  if (taken) {
    c.status = 'refused';
    c.reason = `The name ${c.name} is already registered to a studio.`;
    const message = `The registry refused ${c.name}: ${c.reason} The fee isn't returned. You can apply again under another name.`;
    addLog(state, message, 'money', { route: { view: 'profile' } });
    return { message };
  }
  c.status = 'registered';
  c.foundedAt = state.now;
  const capital = Math.min(c.intendedCapital ?? 0, Math.max(0, personalBalance(state)));
  if (capital > 0) transfer(state, capital, `company:capital:registered-${c.appliedAt}`, `Put Into ${c.name}`, 'Put In By You When It Was Registered');
  const message = `${c.name} is registered.${capital > 0 ? ` ${money(capital)} of your money moved into it.` : ''}${(c.intendedCapital ?? 0) > capital ? ` You said ${money(c.intendedCapital!)}, but had only ${money(capital)}.` : ''}`;
  addLog(state, message, 'money', { route: { view: 'profile' } });
  return { message };
});

/** Why a company can't be formed with this name and capital, or null. */
export function formRefusal(state: GameState, name: string, capital: number): string | null {
  if (state.company && state.company.status !== 'refused') return state.company.status === 'pending' ? `${state.company.name} is waiting for the registry.` : `You already have a company, ${state.company.name}.`;
  const n = name.trim();
  if (n.length < 2) return 'Give the company a name.';
  if (n.length > 60) return 'Keep the name to 60 characters.';
  if (!(capital >= 0) || !Number.isFinite(capital)) return 'Say how much to put in, or nothing.';
  const need = Math.round(capital) + FORMATION_FEE;
  if (need > personalBalance(state)) return `Forming it costs ${money(FORMATION_FEE)}${capital > 0 ? `, and ${money(capital)} goes in` : ''}: you have ${money(personalBalance(state))} in your own account.`;
  return null;
}

/**
 * A company registered at once: the fee paid and the capital moved. The screens apply instead (applyForCompany); this is
 * the registration a decision makes, kept for the tests that need a registered company to start from.
 */
export function formCompany(state: GameState, name: string, capital: number): Company {
  const no = formRefusal(state, name, capital);
  if (no) throw new Error(no);
  state.company = { name: name.trim(), foundedAt: state.now, status: 'registered', jurisdiction: getPlace(state.character.livesIn ?? state.locationId).country };
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
  if (!registered(state)) throw new Error(`${c.name} isn't registered yet.`);
  const a = Math.round(amount);
  if (!(a > 0)) throw new Error('Say how much to move.');
  const id = newId(state, 'cm');
  if (direction === 'in') {
    if (a > personalBalance(state)) throw new Error(`You have ${money(personalBalance(state))} in your own account.`);
    transfer(state, a, `company:capital:${id}`, `Put Into ${c.name}`, 'Put In By You');
  } else {
    if (a > companyBalance(state)) throw new Error(`${c.name} has ${money(companyBalance(state))}.`);
    // A draw is your capital back first, then the company's earnings paid out: never both called one thing (A11).
    const back = Math.min(a, capitalOutstanding(state));
    if (back > 0) transfer(state, -back, `company:draw:${id}`, `Your Capital Back From ${c.name}`, 'Capital Returned To You');
    if (a - back > 0) transfer(state, -(a - back), `company:distribution:${id}`, `Paid Out By ${c.name}`, 'Earnings Paid Out To You', 'distribution');
  }
  addLog(state, direction === 'in' ? `You put ${money(a)} into ${c.name}.` : `You drew ${money(a)} from ${c.name}.`, 'money', { route: { view: 'profile' } });
}

/** Why the company's money can't go into this project now, or null. */
export function companyInRefusal(state: GameState, p: Project, amount: number): string | null {
  const c = state.company;
  if (!c) return 'Form a company first.';
  if (!registered(state)) return `${c.name} isn't registered yet.`;
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
  if (!registered(state)) throw new Error(`${c.name} isn't registered yet.`);
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

