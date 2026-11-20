// Letting a home you own (from November 17, 2026; the package's 06-OWNERSHIP-LETTING-RISK-AND-EXIT "Letting cycle" and
// "Managers and services").
// Eligible (yours, empty, fit to live in) → advertised at your rent → applicants, each with what they offer, judged on
// their documented means and never who they are → a tenant: their deposit held by you as a liability, not profit; rent
// received each month as income (never wages, so never your earnings from work), less a manager's fee where you have one
// → repairs, paid by you, by the manager within the limit you set → notice → the deposit returned less what's owed →
// vacant again. Vacancy is rent you don't get, not a cost; repairs still cost while it's empty.
import { newId } from '../state';
import { unit } from '../rng';
import type { GameState } from '../types';
import { valuation } from './buying';
import { HOME_RULES } from './rules';
import { depositFor } from './model';
import {
  BOOK, addDaysToKey, addMonths, book, canPay, dollarsOf, formatDateKey, homeOf, homesOf, instantOn, money, note, parseYmdDay, payIn, payOut, record, scheduleHome, todayAt, type Letting,
} from './core';
import { moveBetweenBooks } from '../bank';

export const LETTING = { noticeDays: 60, applicantsDays: 10, managerShare: 0.1, repairChance: 0.08, lateChance: 0.05 } as const;
const NAMES = ['A. Okafor', 'M. Lindqvist', 'R. Haddad', 'S. Moreau', 'J. Tanaka', 'L. Ferreira', 'K. Nowak', 'D. Mensah'];

/** The game's estimate of a fair rent for your home: 0.4% of what it's worth, a month. Not a market observation. */
export function fairRent(state: GameState, homeId: string): number {
  return Math.round(valuation(state, homeOf(state, homeId)) * 0.004 / 100) * 100;
}
export function letRefusal(state: GameState, homeId: string): string | null {
  const hs = homesOf(state);
  const home = hs.homes[homeId];
  if (!home || !hs.owned.some((o) => o.homeId === homeId && !o.soldAt)) return "You don't own this home.";
  if (home.form === 'land') return 'A plot of land has no home to let.';
  if (hs.residence === homeId) return 'You live here: move out before you let it.';
  if (hs.lettings.some((l) => l.homeId === homeId && ['advertised', 'applicants', 'let', 'notice'].includes(l.stage))) return "It's already being let.";
  if (hs.sales.some((s) => s.homeId === homeId && ['listed', 'offer', 'agreed'].includes(s.stage))) return "It's for sale: take it off the market first.";
  const poor = Object.entries(home.condition).filter(([, g]) => g === 'poor').map(([k]) => k);
  if (poor.length) return `It isn't fit to let until the ${poor.join(' and ')} ${poor.length > 1 ? 'are' : 'is'} repaired.`;
  if (hs.jobs.some((j) => j.homeId === homeId && (j.stage === 'working' || j.stage === 'scheduled'))) return 'Work is under way: finish it first.';
  return null;
}
/** Advertise at your rent. Applicants come in about ten days: more, and offering your rent, when it's fair. */
export function advertise(state: GameState, homeId: string, rentMinor: number, manager: boolean, capMinor: number): Letting {
  const no = letRefusal(state, homeId);
  if (no) throw new Error(no);
  if (!(rentMinor > 0)) throw new Error('Set the rent.');
  if (manager && !(capMinor >= 0)) throw new Error('Set the manager\'s repair limit.');
  const home = homeOf(state, homeId);
  const l: Letting = { id: newId(state, 'let'), homeId, stage: 'advertised', rentMinor, listedAt: state.now, applicants: [], rentsReceived: 0, arrearsMinor: 0, repairs: [], payments: [], vacantSince: state.now, ...(manager ? { manager: { feeShare: LETTING.managerShare, capMinor } } : {}) };
  homesOf(state).lettings.push(l);
  scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), LETTING.applicantsDays)), 'let-applicants', { id: l.id });
  note(state, homeId, `${home.title} is advertised to let at ${money(home.currency, rentMinor)} a month${manager ? `, managed for ${Math.round(LETTING.managerShare * 100)}% of the rent with a ${money(home.currency, capMinor)} limit on repairs` : ''}. The game estimates a fair rent at ${money(home.currency, fairRent(state, homeId))}. Local letting rules haven't been researched.`);
  return l;
}
export function applicantsArrive(state: GameState, l: Letting): void {
  if (l.stage !== 'advertised') return;
  const home = homeOf(state, l.homeId);
  const fair = fairRent(state, l.homeId);
  const ratio = l.rentMinor / fair;
  const n = ratio > 1.4 ? 0 : ratio > 1.15 ? 1 : ratio > 0.95 ? 2 : 3;
  for (let i = 0; i < n; i++) {
    const r = unit(state.seed, 'applicant', l.id, i);
    l.applicants.push({ name: NAMES[Math.floor(r * NAMES.length)], offerMinor: l.rentMinor, checks: r < 0.75 ? 'Their income and references check out.' : 'Their references check out; their income is below three times the rent.' });
  }
  if (!n) { scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), LETTING.applicantsDays)), 'let-applicants', { id: l.id, again: state.now }); note(state, home.id, `Nobody applied for ${home.title} at ${money(home.currency, l.rentMinor)} a month. It stays advertised; a lower rent brings applicants sooner.`, 'warning'); return; }
  l.stage = 'applicants';
  note(state, home.id, `${n} applicant${n > 1 ? 's' : ''} for ${home.title}. Choose a tenant under Your Properties.`);
}
export function changeRent(state: GameState, id: string, rentMinor: number): void {
  const l = homesOf(state).lettings.find((x) => x.id === id);
  if (!l || (l.stage !== 'advertised' && l.stage !== 'applicants')) throw new Error('The rent can only be changed while it\'s advertised.');
  if (!(rentMinor > 0)) throw new Error('Set the rent.');
  l.rentMinor = rentMinor;
  l.applicants = [];
  l.stage = 'advertised';
  const home = homeOf(state, l.homeId);
  scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), LETTING.applicantsDays)), 'let-applicants', { id: l.id, rent: rentMinor });
  note(state, home.id, `${home.title} is advertised again at ${money(home.currency, rentMinor)} a month.`);
}
/** Choose a tenant: their deposit comes to you and is owed back (a liability), their first rent is income. */
export function chooseTenant(state: GameState, id: string, index: number): void {
  const l = homesOf(state).lettings.find((x) => x.id === id);
  if (!l || l.stage !== 'applicants') throw new Error('There are no applicants to choose from.');
  const a = l.applicants[index];
  if (!a) throw new Error('That applicant has gone.');
  const home = homeOf(state, l.homeId);
  const dep = depositFor(HOME_RULES, home.scopes, l.rentMinor, home.furnished);
  const today = todayAt(state, home);
  l.tenant = a.name; l.start = today; l.anchorDay = parseYmdDay(today); l.depositMinor = dep.amountMinor; l.stage = 'let'; l.vacantSince = undefined;
  book(state, home, `let:${l.id}:deposit`, dep.amountMinor, `Your tenant's deposit (owed back to them): ${home.title}`, BOOK.tenantDeposits);
  record(l.payments, { key: `let:${l.id}:deposit`, label: "Tenant's deposit held (owed back to them)", minor: dep.amountMinor, kind: 'held' }, state);
  receiveRent(state, l, 1);
  note(state, home.id, `${a.name} is your tenant at ${home.title} from ${formatDateKey(today)}. Their deposit, ${money(home.currency, dep.amountMinor)}, is held by you and owed back to them: it isn't yours to spend. ${dep.says}`, 'money');
}
/** A month's rent from your tenant: income, less the manager's share; late now and then (seeded), owed till paid. */
export function receiveRent(state: GameState, l: Letting, n: number): void {
  if ((l.stage !== 'let' && l.stage !== 'notice') || l.rentsReceived >= n) return;
  const home = homeOf(state, l.homeId);
  const late = n > 1 && unit(state.seed, 'let-late', l.id, n) < LETTING.lateChance;
  if (late) { l.arrearsMinor += l.rentMinor; note(state, home.id, `${l.tenant}'s rent for ${home.title} is late. ${money(home.currency, l.arrearsMinor)} is owed; it usually comes with the next month's.`, 'warning'); }
  else {
    const amount = l.rentMinor + l.arrearsMinor;
    payIn(state, home, `let:${l.id}:rent:${n}`, amount, `Rent from your tenant: ${home.title}`, 'Rental Income');
    record(l.payments, { key: `let:${l.id}:rent:${n}`, label: `Rent received${l.arrearsMinor ? ', with what was late' : ''}`, minor: amount, kind: 'received' }, state);
    if (l.manager) {
      const fee = Math.round(amount * l.manager.feeShare / 100) * 100;
      payOut(state, home, `let:${l.id}:fee:${n}`, fee, `Manager's fee: ${home.title}`, 'Property Management');
      record(l.payments, { key: `let:${l.id}:fee:${n}`, label: "Manager's fee", minor: fee, kind: 'paid' }, state);
    }
    l.arrearsMinor = 0;
  }
  l.rentsReceived = n;
  // A repair request now and then (seeded per month): a manager handles it within your limit; above it, you decide.
  if (n > 1 && unit(state.seed, 'let-repair', l.id, n) < LETTING.repairChance) {
    const cost = Math.round(dollarsToLocal(state, home.currency, 400 + unit(state.seed, 'let-repair-cost', l.id, n) * 1600) / 100) * 100;
    const r = { what: ['A leaking tap', 'The boiler', 'A broken window catch', 'Damp in the bathroom'][n % 4], minor: cost, stage: 'asked' as const };
    l.repairs.push(r);
    if (l.manager && cost <= l.manager.capMinor) landlordRepair(state, l, l.repairs.length - 1);
    else { (l.repairs.at(-1)!).stage = 'awaiting-you'; note(state, home.id, `${l.tenant} reported a repair at ${home.title}: ${r.what.toLowerCase()}, about ${money(home.currency, cost)}.${l.manager ? ' It\'s over your manager\'s limit, so they need your approval.' : ' Approve it under Your Properties.'}`, 'warning'); }
  }
  const next = addMonths(l.start!, n, l.anchorDay);
  if (!l.endsOn || next < l.endsOn) scheduleHome(state, instantOn(home, next), 'let-rent', { id: l.id, n: n + 1 }, 'silent', `home-letrent:${l.id}:${n + 1}`);
}
const dollarsToLocal = (state: GameState, cur: string, usd: number) => Math.round(usd * 100 / (dollarsOf(state, cur, 10000) / 100));
export function approveLandlordRepair(state: GameState, id: string, index: number): void {
  const l = homesOf(state).lettings.find((x) => x.id === id);
  const r = l?.repairs[index];
  if (!l || !r || r.stage !== 'awaiting-you') throw new Error('There is no repair waiting for you.');
  landlordRepair(state, l, index);
}
function landlordRepair(state: GameState, l: Letting, index: number): void {
  const home = homeOf(state, l.homeId);
  const r = l.repairs[index];
  if (!canPay(state, home.currency, r.minor)) { r.stage = 'awaiting-you'; note(state, home.id, `The repair at ${home.title} (${money(home.currency, r.minor)}) couldn't be paid: it's waiting until it can be.`, 'warning'); return; }
  payOut(state, home, `let:${l.id}:repair:${index}`, r.minor, `Repair for your tenant: ${r.what}, ${home.title}`, 'Landlord Repairs');
  record(l.payments, { key: `let:${l.id}:repair:${index}`, label: `Repair: ${r.what}`, minor: r.minor, kind: 'paid' }, state);
  r.stage = 'done';
  note(state, home.id, `${r.what} at ${home.title} was repaired for ${l.tenant}: ${money(home.currency, r.minor)}${l.manager ? ', arranged by your manager' : ''}.`, 'money');
}
/** End the tenancy with notice (the game's 60 days; local notice rules haven't been researched). */
export function endLetting(state: GameState, id: string): void {
  const l = homesOf(state).lettings.find((x) => x.id === id);
  if (!l) throw new Error('That letting is no longer on record.');
  const home = homeOf(state, l.homeId);
  if (l.stage === 'advertised' || l.stage === 'applicants') { l.stage = 'withdrawn'; note(state, home.id, `You took ${home.title} off the rental market.`); return; }
  if (l.stage !== 'let') throw new Error('There is no tenancy to end.');
  l.stage = 'notice';
  l.endsOn = addDaysToKey(todayAt(state, home), LETTING.noticeDays);
  scheduleHome(state, instantOn(home, l.endsOn, 12), 'let-end', { id: l.id }, 'notify', `home-letend:${l.id}`);
  note(state, home.id, `You gave ${l.tenant} notice: the tenancy at ${home.title} ends on ${formatDateKey(l.endsOn)} (the game's ${LETTING.noticeDays} days). Rent is due until then.`);
}
/** The tenancy's end: the deposit back to them less rent owed, once. The home is empty and yours again. */
export function lettingEnds(state: GameState, l: Letting): void {
  if (l.stage !== 'notice') return;
  const home = homeOf(state, l.homeId);
  const dep = l.depositMinor ?? 0;
  const kept = Math.min(dep, l.arrearsMinor);
  if (kept) {
    moveBetweenBooks(state, `let:${l.id}:kept`, dollarsOf(state, home.currency, kept), `Rent owed kept from the deposit: ${home.title}`, BOOK.tenantDeposits, BOOK.depositsRetained);
    record(l.payments, { key: `let:${l.id}:kept`, label: 'Kept from the deposit for rent owed', minor: kept, kind: 'received' }, state);
  }
  if (dep - kept > 0) {
    book(state, home, `let:${l.id}:return`, -(dep - kept), `Deposit returned to your tenant: ${home.title}`, BOOK.tenantDeposits);
    record(l.payments, { key: `let:${l.id}:return`, label: 'Deposit returned to the tenant', minor: dep - kept, kind: 'refunded' }, state);
  }
  l.stage = 'ended';
  l.vacantSince = state.now;
  l.arrearsMinor -= kept;
  note(state, home.id, `${l.tenant} has moved out of ${home.title}. ${money(home.currency, dep - kept)} of their deposit went back to them${kept ? `; ${money(home.currency, kept)} was kept for rent owed` : ''}. It's empty: let it again, live in it or sell it.`, 'money');
}
