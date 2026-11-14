// Your own money and your family's support (the v4 package, 02 "Starting finances and family"; ledger V4-016, V4-017).
// Built November 12, 2026. Until then the player had no money of their own: money lived only in projects.
//
// Three things are kept apart, as the package asks:
// - Your family's circumstances: how much they could offer at most. They decide nothing else about you: not who you are,
//   not your talent, not who you know.
// - What they actually offer: nothing, a gift, a loan you repay monthly, or an investment that takes a share of what
//   you bring home from your projects until they have had back what the terms say.
// - Your own savings: money you have when the story starts.
//
// Your personal account is the sum of its postings; nothing is typed. Money moves between it and a project only by an
// explicit transfer: putting your own money into a project (a backer line, "Your Own Money", whose unspent part stays
// yours), or taking home what a delivered project kept. A loan is not earnings, a gift is not ticket sales, and a
// transfer home is not profit: each posting says what it is. A save from before has no personal account and gains no
// money: it opens with nothing in it, and says so.
import { BACKERS, deals, financeSummary, moneyKept, ownMoney, scriptApprovedFor } from './finance';
import { closeSettled, ledgerTotals, money, reserve, settle } from './budget';
import { addLog, newId, onDraftCheck, onNewGame, registerHandler, schedule } from './state';
import { DAY } from './time';
import { available, ensureAccount, outsideAccount, postTx, statementLines } from './cash/journal';
import { fromMinor, toMinor } from './cash/money';
import type { FinanceDeal, GameState, Project } from './types';

export type FamilyCircumstances = 'stretched' | 'getting-by' | 'comfortable' | 'wealthy';
export type FamilySupportKind = 'none' | 'gift' | 'loan' | 'investment' | 'equipment';
export type PersonalKind = 'savings' | 'gift' | 'loan' | 'investment' | 'repayment' | 'participation' | 'to-project' | 'from-project' | 'equipment' | 'equipment-sale' | 'paid-work' | 'commission' | 'company' | 'overhead';
export interface PersonalPosting { id: string; at: number; kind: PersonalKind; amount: number; label: string; key: string }
export interface FamilyTerms {
  circumstances: FamilyCircumstances;
  support: FamilySupportKind;
  amount: number;
  /** A loan: what is due each month, for how many months. */
  monthly?: number;
  months?: number;
  /** An investment: the share of what you take home from a project's income, until they have had back `cap`. */
  share?: number;
  cap?: number;
  /** Equipment lent (equipment.ts): what, by shop id. `amount` is its value at listed prices; no money moves. */
  gear?: string[];
}
/**
 * What the account knows beyond its transactions: a family's terms, from a save made before the v8 start. The postings
 * themselves live in the journal (cash/journal.ts) from November 14, 2026; personalPostings reads them back. Before then
 * they were a list here, migrated by migrateV9toV10.
 */
export interface PersonalMoney { family?: FamilyTerms }

/** How much each family could offer at most. Game calibration, not income data; it decides nothing else. */
export const CIRCUMSTANCES: Record<FamilyCircumstances, { label: string; says: string; most: number }> = {
  stretched: { label: 'Stretched', says: 'Your family has nothing to spare.', most: 0 },
  'getting-by': { label: 'Getting By', says: 'Your family could find a little, once.', most: 3_000 },
  comfortable: { label: 'Comfortable', says: 'Your family could help with a few thousand.', most: 20_000 },
  wealthy: { label: 'Wealthy', says: 'Your family could put in a real sum.', most: 150_000 },
};
export const SUPPORT_LABELS: Record<FamilySupportKind, string> = { none: 'Nothing', gift: 'A Gift', loan: 'A Loan', investment: 'An Investment', equipment: 'Equipment To Use' };
/** Your own savings at the start, at most. Game calibration. */
export const SAVINGS_MOST = 25_000;
/** A family loan: repaid in equal months, without interest. A family investment: a share of what you take home, until they have had back this multiple. Game calibration. */
export const LOAN_MONTHS = 24;
export const INVESTMENT_SHARE = 0.25;
export const INVESTMENT_RETURN = 1.5;

/** The terms an offer would carry, or why it can't be. Pure. */
export function familyTerms(circumstances: FamilyCircumstances, support: FamilySupportKind, amount: number, gear?: string[]): FamilyTerms | string {
  if (support === 'none') return { circumstances, support, amount: 0 };
  const most = CIRCUMSTANCES[circumstances].most;
  if (!(amount > 0) || !Number.isFinite(amount)) return support === 'equipment' ? 'Choose what your family lends.' : 'Say how much they offer.';
  if (amount > most) return most ? `A ${CIRCUMSTANCES[circumstances].label.toLowerCase()} family could offer at most ${money(most)}.` : 'A family with nothing to spare can offer nothing.';
  const a = Math.round(amount);
  if (support === 'loan') return { circumstances, support, amount: a, months: LOAN_MONTHS, monthly: Math.ceil(a / LOAN_MONTHS) };
  if (support === 'investment') return { circumstances, support, amount: a, share: INVESTMENT_SHARE, cap: Math.round(a * INVESTMENT_RETURN) };
  if (support === 'equipment') return { circumstances, support, amount: a, gear: [...(gear ?? [])] };
  return { circumstances, support, amount: a };
}

/** What you start with, line by line, and what you will owe: read on Review before the story starts. */
export function openingPreview(savings: number, terms: FamilyTerms | null): { lines: { label: string; amount: number }[]; balance: number; owe: string[] } {
  const lines = [{ label: 'Your Savings', amount: Math.max(0, Math.round(savings)) }];
  if (terms && terms.support !== 'none' && terms.support !== 'equipment') lines.push({ label: `From Your Family: ${SUPPORT_LABELS[terms.support]}`, amount: terms.amount });
  const owe: string[] = [];
  if (terms?.support === 'loan') owe.push(`You repay your family ${money(terms.monthly!)} a month for ${terms.months} months, ${money(terms.amount)} in all, from your own account. A month you can't pay is owed on.`);
  if (terms?.support === 'investment') owe.push(`Your family takes ${Math.round(terms.share! * 100)}% of what you take home from your projects' income, until they have had ${money(terms.cap!)} back. Nothing is owed if you take nothing home.`);
  if (terms?.support === 'gift') owe.push('A gift: nothing is owed.');
  if (terms?.support === 'equipment') owe.push(`Your family lends you equipment worth ${money(terms.amount)} at listed prices, for as long as you need it. Nothing is owed; it isn't yours to sell.`);
  return { lines, balance: lines.reduce((a, x) => a + x.amount, 0), owe };
}

// The account is the journal's player cash account (cash/journal.ts). Each kind of movement comes from or goes to its own
// outside account, so the statement can say what it was; a key posted twice moves money once (from November 14, 2026;
// until then nothing guarded a repeated key, and each caller made sure it posted only once).
export const PERSONAL_CASH = 'player:cash:USD';
const COUNTER: Record<PersonalKind, string> = {
  savings: 'opening-savings', gift: 'family-gift', loan: 'family-loan', investment: 'family-investment', repayment: 'family-loan', participation: 'family-investment',
  'to-project': 'projects', 'from-project': 'projects', equipment: 'equipment', 'equipment-sale': 'equipment', 'paid-work': 'paid-work', commission: 'agent-commission',
  company: 'company-transfers', overhead: 'first-look-overhead',
};
export const counterOf = (kind: PersonalKind) => COUNTER[kind];
export const openPersonalAccount = (state: GameState) => ensureAccount(state, { id: PERSONAL_CASH, owner: 'player', type: 'asset', currency: 'USD', label: 'Your Account' });
export const postPersonal = (state: GameState, kind: PersonalKind, amount: number, label: string, key: string, counter = COUNTER[kind]) => {
  state.money ??= {};
  openPersonalAccount(state);
  const minor = toMinor(Math.round(amount));
  postTx(state, { key, kind, memo: label, lines: [{ account: PERSONAL_CASH, minor, kind, label }, { account: outsideAccount(state, counter, 'USD'), minor: -minor }] });
};
/** The account's postings, read back from the journal in whole dollars, oldest first. */
export const personalPostings = (state: GameState): PersonalPosting[] =>
  statementLines(state, PERSONAL_CASH).map(({ tx, line }) => ({ id: tx.id, at: tx.at, kind: line.kind as PersonalKind, amount: fromMinor(line.minor), label: line.label ?? tx.memo, key: tx.key }));

/** Your account at the start of a new story, from what was chosen at creation. */
export function openPersonalMoney(state: GameState, savings: number, terms: FamilyTerms | null): void {
  state.money = terms ? { family: terms } : {};
  openPersonalAccount(state);
  if (savings > 0) postPersonal(state, 'savings', Math.min(SAVINGS_MOST, savings), 'Your Savings', 'opening:savings');
  if (!terms || terms.support === 'none' || terms.support === 'equipment') return; // lent equipment is equipment.ts's
  postPersonal(state, terms.support, terms.amount, `From Your Family: ${SUPPORT_LABELS[terms.support]}`, `opening:${terms.support}`);
  if (terms.support === 'loan') schedule(state, state.now + 30 * DAY, 'family-repayment', { month: 1 }, { attention: 'silent', priority: 60 });
}

/** What you can spend now, in whole dollars: settled, less anything held. */
export const personalBalance = (state: GameState): number => fromMinor(available(state, PERSONAL_CASH));
export const sumOf = (state: GameState, kind: PersonalKind) => personalPostings(state).filter((x) => x.kind === kind).reduce((a, x) => a + x.amount, 0);

/** Where a family loan stands: repaid so far and what is still owed. Derived from postings. */
export function loanStanding(state: GameState): { repaid: number; owed: number } | null {
  const f = state.money?.family;
  if (f?.support !== 'loan') return null;
  const repaid = 0 - sumOf(state, 'repayment'); // never -0
  return { repaid, owed: Math.max(0, f.amount - repaid) };
}

/** Each month a loan's repayment is taken from your account: what is due, plus any month missed, as far as the account allows. */
registerHandler('family-repayment', (state, ev) => {
  const f = state.money?.family;
  const st = loanStanding(state);
  if (!f || !st || st.owed <= 0) return { suppressInterrupt: true };
  const month = ev.payload.month as number;
  const due = Math.min(st.owed, f.monthly! * month - st.repaid);
  const pay = Math.max(0, Math.min(due, personalBalance(state)));
  if (pay > 0) postPersonal(state, 'repayment', -pay, `Repaid To Your Family: Month ${month}`, `repayment:${month}`);
  if (pay < due) addLog(state, `You couldn't repay your family all that was due this month: ${money(due - pay)} is still owed, and is due with next month's.`, 'money');
  if (loanStanding(state)!.owed > 0) schedule(state, state.now + 30 * DAY, 'family-repayment', { month: month + 1 }, { attention: 'silent', priority: 60 });
  else addLog(state, 'Your family loan is repaid in full.', 'money');
  return { suppressInterrupt: pay >= due };
});

/** Why your own money can't go into this project now, or null. */
export function putInRefusal(state: GameState, p: Project, amount: number): string | null {
  if (p.delivered) return 'This project is delivered.';
  if (!scriptApprovedFor(p)) return 'Approve a script first.';
  if (!(amount > 0) || !Number.isFinite(amount)) return 'Say how much to put in.';
  const have = personalBalance(state);
  if (amount > have) return `You have ${money(have)} in your own account.`;
  const { stillToRaise } = financeSummary(p);
  if (amount > stillToRaise) return stillToRaise > 0 ? `This project has ${money(stillToRaise)} still to raise.` : 'This project has nothing left to raise.';
  return null;
}

/** Put your own money into a project: it leaves your account and arrives as a backer line nobody is repaid from, whose unspent part stays yours. */
export function putInOwnMoney(state: GameState, p: Project, amount: number): FinanceDeal {
  const no = putInRefusal(state, p, amount);
  if (no) throw new Error(no);
  const a = Math.round(amount);
  const d: FinanceDeal = {
    id: newId(state, 'fd'), kind: 'savings', backer: BACKERS.savings.name, amount: a, status: 'accepted', askedAt: state.now, reason: 'From your own account.',
    received: a, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: 'yours' },
  };
  (p.finance ??= { estimate: 0, target: 0, deals: [] }).deals.push(d);
  p.funding.fund += a;
  postPersonal(state, 'to-project', -a, `Put Into ${p.title}`, `to-project:${d.id}`);
  addLog(state, `You put ${money(a)} of your own money into ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return d;
}

/** What you could take home from a delivered project now: its kept income and your unspent money, never more than its ledger has uncommitted. */
export function takeHomeAvailable(p: Project): { earnings: number; capital: number } {
  if (!p.delivered) return { earnings: 0, capital: 0 };
  const m = moneyKept(p);
  if (m.oldMove) return { earnings: 0, capital: 0 };
  const free = Math.max(0, ledgerTotals(p).available);
  const earnings = Math.floor(Math.min(m.earnings, free));
  return { earnings, capital: Math.floor(Math.min(m.capital, free - earnings)) };
}

/**
 * Take money home from a delivered project: it leaves the project's ledger as a transfer line and arrives in your account.
 * Kept income taken home is what a family investment shares in; your own unspent money coming back is not.
 */
export function takeHome(state: GameState, p: Project, kind: 'earnings' | 'capital', amount: number): void {
  const can = takeHomeAvailable(p)[kind];
  if (!(amount > 0) || amount > can) throw new Error(can > 0 ? `At most ${money(can)} can come home from ${p.title} now.` : `${p.title} has nothing of that kind to take home.`);
  const a = Math.floor(amount);
  const id = newId(state, 'th');
  const o = reserve(state, p, 'Taken Home', 'finance', a, `transfer:home-${id}:${kind}`);
  settle(state, p, o.id, a, `transfer:home-${id}`);
  closeSettled(p, o.id);
  p.history.push({ at: state.now, text: `${money(a)} of the ${kind === 'earnings' ? 'income it kept' : 'money you put in that it didn\'t spend'} was taken home.` });
  postPersonal(state, 'from-project', a, kind === 'earnings' ? `Income Taken Home From ${p.title}` : `Your Unspent Money Back From ${p.title}`, `from-project:${id}`);
  const f = state.money?.family;
  if (kind === 'earnings' && f?.support === 'investment') {
    const had = -sumOf(state, 'participation');
    const share = Math.min(Math.round(a * f.share!), Math.max(0, f.cap! - had));
    if (share > 0) postPersonal(state, 'participation', -share, `Your Family's Share: ${Math.round(f.share! * 100)}% Of ${money(a)} From ${p.title}`, `participation:${id}`);
  }
  addLog(state, `You took ${money(a)} home from ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

/** Your account's postings grouped by what they are, so a loan never reads as earnings. */
export function personalStatement(state: GameState): { kind: PersonalKind; total: number }[] {
  // Every kind, in the labels' order: a typed Record can't leave one out. Until November 12, 2026 this was a list of its
  // own, and equipment bought or sold would have been missing from the statement while still in the balance.
  const order = Object.keys(PERSONAL_LABELS) as PersonalKind[];
  return order.map((kind) => ({ kind, total: sumOf(state, kind) })).filter((x) => x.total !== 0);
}
export const PERSONAL_LABELS: Record<PersonalKind, string> = {
  savings: 'Your Savings', gift: 'Gift From Your Family', loan: 'Loan From Your Family', investment: 'Investment From Your Family', 'from-project': 'Taken Home From Your Projects',
  'to-project': 'Put Into Your Projects', repayment: 'Repaid To Your Family', participation: "Your Family's Share Of What You Took Home",
  equipment: 'Equipment Bought And Serviced', 'equipment-sale': 'Equipment Sold', 'paid-work': 'Paid For Work On Others\' Productions', commission: 'Commission To Your Agent', company: 'To And From Your Company', overhead: 'Overhead From A First-Look Deal',
};
void deals; void ownMoney;

// A new story opens your account from what was chosen at creation; a draft from before has none of either.
const draftTerms = (d: { family?: { circumstances: FamilyCircumstances; support: FamilySupportKind; amount: number; gear?: string[] } }): FamilyTerms | string | null => (d.family ? familyTerms(d.family.circumstances, d.family.support, d.family.amount, d.family.gear) : null);
onDraftCheck((d) => {
  const out: { field: string; step: 'starting-point'; message: string }[] = [];
  if (d.savings !== undefined && !(d.savings >= 0 && d.savings <= SAVINGS_MOST)) out.push({ field: 'savings', step: 'starting-point', message: `Your savings can be from nothing to ${money(SAVINGS_MOST)}.` });
  const t = draftTerms(d);
  if (typeof t === 'string') out.push({ field: 'family', step: 'starting-point', message: t });
  return out;
});
onNewGame((state, d) => { const t = draftTerms(d); openPersonalMoney(state, d.savings ?? 0, typeof t === 'string' ? null : t); });
