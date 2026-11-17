// Buying, owning and selling (from November 17, 2026; the package's 03-RENT-BUY-LIVE-MOVE "Buying cycle" and
// 06-OWNERSHIP-LETTING-RISK-AND-EXIT "Sale and ownership exit").
// Offer → the seller's answer → the deposit held → an inspection, if you chose one → the mortgage decided, if you
// borrow → completion: the price paid from your money and the loan, ownership from that day. A failed payment at
// completion grants nothing. A mortgage is debt, never income: its advance pays the seller directly, its payments are
// interest (an expense) and principal (less debt). A sale repays the mortgage before anything reaches you, and what
// does is the proceeds of your own home, not earnings.
//
// The researched rules that apply only where they're scoped: Mexico's restricted zone (a bank trust, not direct
// ownership), Kenya's leasehold for noncitizens, Singapore's approval for a foreigner buying a landed home, and HDB's
// own eligibility, which hasn't been researched and so isn't assumed.
import { getPlace } from '../../data/places';
import { mortgageOwed, moveBetweenBooks, postHousing } from '../bank';
import { newId } from '../state';
import type { GameState } from '../types';
import { HOME_RULES } from './market';
import { MORTGAGE_MODEL, levelPayment, rulesFor, type Home } from './model';
import {
  BOOK, addDaysToKey, addMonths, book, canPay, days, document, dollarsOf, formatDateKey, homeOf, homesOf, instantOn, money, note, parseYmdDay,
  payOut, pin, record, scheduleHome, todayAt, type Owned, type Purchase, type Sale,
} from './core';

/** The game's purchase model, said as the game's: what's paid besides the price, and how long things take. */
export const BUYING = { earnestShare: 0.05, closingShare: 0.03, inspectionUsd: 600, answerDays: 3, inspectionDays: 5, financeDays: 7, completionDays: 30, saleFeeShare: 0.02, buyerDays: 21 } as const;
export const isCitizenOf = (state: GameState, country: string) => (state.character.nationalities ?? []).map((n) => n.toUpperCase()).includes(country.toUpperCase());

export interface Plan { finance: 'cash' | 'mortgage'; depositShare?: number; years?: number; inspect: boolean }
export interface PurchaseQuote { priceMinor: number; earnestMinor: number; closingMinor: number; inspectionMinor: number; loanMinor: number; paymentMinor: number; rate: number; months: number; cashAtCompletionMinor: number; route?: string; lines: { what: string; minor: number }[]; notes: string[] }

/** A rule's route for this buyer and home, or a refusal: researched rules only, in their scope. */
export function buyerRoute(state: GameState, home: Home): { route?: string; refused?: string; approvalDays?: number } {
  const citizen = isCitizenOf(state, home.country);
  if (home.form === 'hdb-flat' && !citizen) return { refused: "Who may buy an HDB flat is HDB's own eligibility, which hasn't been researched for you: the game doesn't let you buy one without it." };
  const sg = rulesFor(HOME_RULES, home.scopes).find((r) => r.id === 'sg.landed_foreign');
  if (sg && !citizen && (home.form === 'detached' || home.form === 'townhouse' || home.form === 'land')) return { route: "A foreigner's purchase of landed property in Singapore needs approval first; the assessment takes about 30 working days, with no guarantee.", approvalDays: 42 };
  const mx = rulesFor(HOME_RULES, home.scopes).find((r) => r.id === 'mx.restricted');
  if (mx && !citizen && home.coastal) return { route: "This home is in Mexico's restricted zone (within 50 km of the coast): a foreigner can't own it directly. You'd hold it through a bank trust (fideicomiso) of up to 50 years." };
  const ke = rulesFor(HOME_RULES, home.scopes).find((r) => r.id === 'ke.foreign_land');
  if (ke && !citizen) return { route: "As a noncitizen in Kenya you can hold land on a lease of up to 99 years, not freehold. It gives you no right to live or work there." };
  return {};
}

export function purchaseQuote(state: GameState, home: Home, plan: Plan, offerMinor = home.priceMinor): PurchaseQuote {
  const earnest = Math.round(offerMinor * BUYING.earnestShare / 100) * 100;
  const closing = Math.round(offerMinor * BUYING.closingShare / 100) * 100;
  const inspection = plan.inspect ? Math.round(dollarsToLocal(state, home, BUYING.inspectionUsd * 100) / 100) * 100 : 0;
  const mortgage = plan.finance === 'mortgage' && home.form !== 'land';
  const depositShare = Math.max(1 - MORTGAGE_MODEL.maxLoanToValue, plan.depositShare ?? 0.2);
  const loan = mortgage ? Math.round((offerMinor * (1 - depositShare)) / 100) * 100 : 0;
  const months = (plan.years ?? 25) * 12;
  const payment = loan ? levelPayment(loan, MORTGAGE_MODEL.ratePerYear, months) : 0;
  const route = buyerRoute(state, home);
  const lines = [{ what: 'Deposit to the seller when your offer is accepted (held, part of the price)', minor: earnest }, ...(inspection ? [{ what: 'Inspection', minor: inspection }] : []), { what: 'Closing costs (the game\'s 3% estimate; taxes on the purchase aren\'t modeled)', minor: closing }, ...(loan ? [{ what: 'Mortgage advance, paid to the seller', minor: loan }] : []), { what: 'The rest of the price from your money at completion', minor: offerMinor - earnest - loan }];
  return {
    priceMinor: offerMinor, earnestMinor: earnest, closingMinor: closing, inspectionMinor: inspection, loanMinor: loan, paymentMinor: payment, rate: MORTGAGE_MODEL.ratePerYear, months,
    cashAtCompletionMinor: offerMinor - earnest - loan + closing, route: route.route, lines,
    notes: [
      ...(loan ? [`The mortgage is the game's model: ${(MORTGAGE_MODEL.ratePerYear * 100).toFixed(1)}% fixed for ${months / 12} years, ${money(home.currency, payment)} a month. It isn't any real lender's product.`] : []),
      ...(home.form === 'land' && plan.finance === 'mortgage' ? ['Land is bought with your own money in the game: no mortgage is offered on a building plot.'] : []),
      'Buying a home gives you no right to live in its country: Your Papers decides that.',
    ],
  };
}
function dollarsToLocal(state: GameState, home: Home, usdCents: number): number {
  const rate = dollarsOf(state, home.currency, 10000) / 100; // dollars per 100 units of the home's currency
  return Math.round(usdCents / rate);
}

export function offerRefusal(state: GameState, home: Home, offerMinor: number, plan: Plan): string | null {
  if (home.market !== 'sale') return "This home isn't for sale.";
  if (todayAt(state, home) > home.validUntil) return 'This offer has lapsed: the seller has taken the home off the market at that price.';
  if (!(offerMinor > 0) || !Number.isFinite(offerMinor)) return 'Say what you offer.';
  const hs = homesOf(state);
  if (hs.purchases.some((p) => p.homeId === home.id && !['rejected', 'withdrawn', 'failed', 'completed'].includes(p.stage))) return 'You already have an offer on this home.';
  if (hs.owned.some((o) => o.homeId === home.id && !o.soldAt)) return 'You own this home.';
  const route = buyerRoute(state, home);
  if (route.refused) return route.refused;
  const q = purchaseQuote(state, home, plan, offerMinor);
  if (!canPay(state, home.currency, q.earnestMinor + q.inspectionMinor)) return `You need ${money(home.currency, q.earnestMinor + q.inspectionMinor)} available now: the deposit${q.inspectionMinor ? ' and the inspection' : ''}.`;
  return null;
}

/** Make an offer: the seller answers in a few days. Nothing is paid until it's accepted. */
export function makeOffer(state: GameState, offer: Home, offerMinor: number, plan: Plan): Purchase {
  const no = offerRefusal(state, offer, offerMinor, plan);
  if (no) throw new Error(no);
  const home = pin(state, offer);
  const q = purchaseQuote(state, home, plan, offerMinor);
  const route = buyerRoute(state, home);
  const p: Purchase = {
    id: newId(state, 'buy'), homeId: home.id, stage: 'offered', offerMinor, askedAt: state.now, answerAt: state.now + days(BUYING.answerDays),
    finance: plan.finance === 'mortgage' && q.loanMinor ? { kind: 'mortgage', loanMinor: q.loanMinor, years: q.months / 12, paymentMinor: q.paymentMinor, rate: q.rate } : { kind: 'cash' },
    inspect: plan.inspect, earnestMinor: q.earnestMinor, closingMinor: q.closingMinor, payments: [], ...(route.route ? { route: route.route } : {}),
  };
  homesOf(state).purchases.push(p);
  scheduleHome(state, p.answerAt, 'offer-answer', { id: p.id });
  note(state, home.id, `You offered ${money(home.currency, offerMinor)} for ${home.title}. The seller answers by ${formatDateKey(addDaysToKey(todayAt(state, home), BUYING.answerDays))}.`);
  return p;
}

/** The seller's answer, kept once: at 97% of the asking price or more, accepted; from 90%, a counter at the asking price. */
export function answerOffer(state: GameState, p: Purchase): void {
  if (p.stage !== 'offered') return;
  const home = homeOf(state, p.homeId);
  const share = p.offerMinor / home.priceMinor;
  if (share >= 0.97) acceptPurchase(state, p, p.offerMinor);
  else if (share >= 0.9) { p.stage = 'countered'; p.counterMinor = home.priceMinor; note(state, home.id, `The seller of ${home.title} countered at ${money(home.currency, home.priceMinor)}. Accept it or withdraw.`); }
  else { p.stage = 'rejected'; note(state, home.id, `The seller of ${home.title} turned down your offer of ${money(home.currency, p.offerMinor)}: it was too far below the asking price.`, 'warning'); }
}
export function acceptCounter(state: GameState, id: string): void {
  const p = homesOf(state).purchases.find((x) => x.id === id);
  if (!p || p.stage !== 'countered') throw new Error('There is no counteroffer to accept.');
  const home = homeOf(state, p.homeId);
  if (!canPay(state, home.currency, Math.round(p.counterMinor! * BUYING.earnestShare))) throw new Error(`You need ${money(home.currency, Math.round(p.counterMinor! * BUYING.earnestShare))} available for the deposit.`);
  p.offerMinor = p.counterMinor!;
  const q = purchaseQuote(state, home, { finance: p.finance.kind, depositShare: p.finance.kind === 'mortgage' ? 1 - p.finance.loanMinor / home.priceMinor : undefined, years: p.finance.kind === 'mortgage' ? p.finance.years : undefined, inspect: p.inspect }, p.offerMinor);
  p.earnestMinor = q.earnestMinor; p.closingMinor = q.closingMinor;
  if (p.finance.kind === 'mortgage') p.finance = { ...p.finance, loanMinor: q.loanMinor, paymentMinor: q.paymentMinor };
  acceptPurchase(state, p, p.offerMinor);
}
/** Accepted: the deposit is held (it is part of the price, not spent), and the conditions start. */
function acceptPurchase(state: GameState, p: Purchase, price: number): void {
  const home = homeOf(state, p.homeId);
  try {
    book(state, home, `earnest:${p.id}`, -p.earnestMinor, `Deposit on your purchase of ${home.title}`, BOOK.purchaseDeposits);
  } catch {
    p.stage = 'failed';
    p.says = "Your deposit couldn't be paid, so the seller's acceptance lapsed. Nothing was bought.";
    note(state, home.id, `${home.title}: ${p.says}`, 'warning');
    return;
  }
  record(p.payments, { key: `earnest:${p.id}`, label: 'Deposit held toward the price', minor: p.earnestMinor, kind: 'held' }, state);
  p.stage = p.inspect ? 'inspecting' : p.finance.kind === 'mortgage' ? 'financing' : 'ready';
  const today = todayAt(state, home);
  p.completeOn = addDaysToKey(today, BUYING.completionDays + (p.route && /approval/.test(p.route) ? 42 : 0));
  if (p.inspect) {
    try {
      payOut(state, home, `inspect:${p.id}`, purchaseQuote(state, home, { finance: 'cash', inspect: true }, price).inspectionMinor, `Inspection: ${home.title}`, 'Purchase Costs');
    } catch { /* the inspection is skipped if it can't be paid; the purchase goes on without it */ p.inspect = false; p.stage = p.finance.kind === 'mortgage' ? 'financing' : 'ready'; }
    if (p.inspect) scheduleHome(state, instantOn(home, addDaysToKey(today, BUYING.inspectionDays)), 'inspection', { id: p.id });
  }
  if (p.finance.kind === 'mortgage') scheduleHome(state, instantOn(home, addDaysToKey(today, BUYING.financeDays)), 'finance-decision', { id: p.id });
  scheduleHome(state, instantOn(home, p.completeOn), 'completion', { id: p.id }, 'notify', `home-complete:${p.id}`);
  note(state, home.id, `Your offer of ${money(home.currency, price)} for ${home.title} was accepted. ${money(home.currency, p.earnestMinor)} is held as your deposit toward the price. Completion is set for ${formatDateKey(p.completeOn)}.`, 'money');
}

/** What the inspection found, persisted once. It finds what's visible and in its scope; it can't promise there's nothing else. */
export function inspect(state: GameState, p: Purchase): void {
  if (p.stage !== 'inspecting' || p.inspection) return;
  const home = homeOf(state, p.homeId);
  const found = (Object.entries(home.condition) as [string, string][]).filter(([, g]) => g !== 'good').map(([k, g]) => `${k === 'finishes' ? 'Floors and walls' : k[0].toUpperCase() + k.slice(1)}: ${g}`);
  p.inspection = { at: state.now, found, feeMinor: 0 };
  p.stage = p.finance.kind === 'mortgage' && !p.finance.decision ? 'financing' : 'ready';
  document(state, home.id, 'Inspection Report', [...(found.length ? found : ['Nothing beyond normal wear found in what was inspected.']), 'The inspection covers what can be seen and reached. It can\'t promise concealed defects aren\'t there.']);
  note(state, home.id, `The inspection of ${home.title} is done: ${found.length ? `${found.length} thing${found.length > 1 ? 's' : ''} to note (${found.join('; ')})` : 'nothing beyond normal wear'}. You can go on or withdraw before completion.`);
}
/** The lender's decision, the game's model: a loan up to 80% of the price, with savings covering a year of payments. */
export function decideFinance(state: GameState, p: Purchase): void {
  if (p.finance.kind !== 'mortgage' || p.finance.decision) return;
  const home = homeOf(state, p.homeId);
  const need = p.offerMinor - p.earnestMinor - p.finance.loanMinor + p.closingMinor + 12 * p.finance.paymentMinor;
  const ok = canPay(state, home.currency, need);
  p.finance = { ...p.finance, decision: ok ? 'approved' : 'refused', decidedAt: state.now, says: ok ? `The mortgage of ${money(home.currency, p.finance.loanMinor)} is approved.` : `The mortgage was refused: the lender looks for ${money(home.currency, need)} available, the rest of the price and a year's payments.` };
  if (p.stage === 'financing') p.stage = ok ? 'ready' : 'failed';
  if (!ok) {
    // A finance condition that fails gives the deposit back (the game's purchase contract), and the purchase ends.
    book(state, home, `earnest:${p.id}:back`, p.earnestMinor, `Deposit returned: ${home.title}`, BOOK.purchaseDeposits);
    record(p.payments, { key: `earnest:${p.id}:back`, label: 'Deposit returned: finance refused', minor: p.earnestMinor, kind: 'released' }, state);
    p.stage = 'failed';
  }
  note(state, home.id, `${home.title}: ${p.finance.says}${ok ? '' : ' Your deposit is returned and the purchase has ended.'}`, ok ? 'money' : 'warning');
}
export function withdrawPurchase(state: GameState, id: string): void {
  const p = homesOf(state).purchases.find((x) => x.id === id);
  if (!p || ['completed', 'failed', 'withdrawn', 'rejected'].includes(p.stage)) throw new Error('There is no purchase to withdraw from.');
  const home = homeOf(state, p.homeId);
  // Before the inspection and finance conditions are satisfied, the deposit comes back; after, the seller keeps it.
  const conditional = p.stage === 'offered' || p.stage === 'countered' || p.stage === 'inspecting' || p.stage === 'financing' || (p.stage === 'ready' && !!p.inspection && state.now - p.inspection.at < days(7));
  if (p.payments.some((x) => x.key === `earnest:${p.id}`)) {
    if (conditional) { book(state, home, `earnest:${p.id}:back`, p.earnestMinor, `Deposit returned: ${home.title}`, BOOK.purchaseDeposits); record(p.payments, { key: `earnest:${p.id}:back`, label: 'Deposit returned', minor: p.earnestMinor, kind: 'released' }, state); }
    else { moveBetweenBooks(state, `earnest:${p.id}:forfeit`, dollarsOf(state, home.currency, p.earnestMinor), `Deposit kept by the seller: ${home.title}`, BOOK.purchaseDeposits, { kind: 'expense', name: 'Purchase Costs' }); record(p.payments, { key: `earnest:${p.id}:forfeit`, label: 'Deposit kept by the seller', minor: p.earnestMinor, kind: 'paid' }, state); }
  }
  p.stage = 'withdrawn';
  note(state, home.id, `You withdrew from buying ${home.title}.${p.payments.some((x) => x.kind === 'released') ? ' Your deposit is back.' : p.payments.some((x) => /forfeit/.test(x.key)) ? ' The conditions were already met, so the seller keeps your deposit.' : ''}`);
}

/** Completion: the rest of the price from your money and the loan, then ownership. All or nothing. */
export function complete(state: GameState, p: Purchase): void {
  if (p.stage === 'completed' || p.stage === 'failed' || p.stage === 'withdrawn' || p.stage === 'rejected') return;
  const home = homeOf(state, p.homeId);
  if (p.stage === 'inspecting' || p.stage === 'financing') {
    // A condition still open on the day moves completion a week (the game's contract), once settled it completes.
    p.completeOn = addDaysToKey(todayAt(state, home), 7);
    scheduleHome(state, instantOn(home, p.completeOn), 'completion', { id: p.id }, 'notify', `home-complete:${p.id}:${p.completeOn}`);
    return;
  }
  const loan = p.finance.kind === 'mortgage' && p.finance.decision === 'approved' ? p.finance.loanMinor : 0;
  const cash = p.offerMinor - p.earnestMinor - loan;
  if (!canPay(state, home.currency, cash + p.closingMinor)) {
    // Failed: nothing changes hands. The deposit is the seller's, as the contract has it once its conditions were met.
    moveBetweenBooks(state, `earnest:${p.id}:forfeit`, dollarsOf(state, home.currency, p.earnestMinor), `Deposit kept by the seller: ${home.title}`, BOOK.purchaseDeposits, { kind: 'expense', name: 'Purchase Costs' });
    record(p.payments, { key: `earnest:${p.id}:forfeit`, label: 'Deposit kept: completion failed', minor: p.earnestMinor, kind: 'paid' }, state);
    p.stage = 'failed';
    p.says = `Completion failed: you needed ${money(home.currency, cash + p.closingMinor)} available. Nothing was bought, and the seller keeps your deposit.`;
    note(state, home.id, `${home.title}: ${p.says}`, 'warning');
    return;
  }
  const mortgageName = `Mortgage: ${home.title}`;
  book(state, home, `buy:${p.id}:cash`, -cash, `Purchase of ${home.title}`, BOOK.homesOwned);
  moveBetweenBooks(state, `buy:${p.id}:earnest`, dollarsOf(state, home.currency, p.earnestMinor), `Deposit applied to the price: ${home.title}`, BOOK.purchaseDeposits, BOOK.homesOwned);
  if (loan) moveBetweenBooks(state, `buy:${p.id}:loan`, dollarsOf(state, home.currency, loan), `Mortgage advance paid to the seller: ${home.title}`, { mortgage: mortgageName }, BOOK.homesOwned);
  payOut(state, home, `buy:${p.id}:closing`, p.closingMinor, `Closing costs: ${home.title}`, 'Purchase Costs');
  record(p.payments, { key: `buy:${p.id}:cash`, label: 'Rest of the price', minor: cash, kind: 'paid' }, state);
  if (loan) record(p.payments, { key: `buy:${p.id}:loan`, label: 'Mortgage advance (debt, not income)', minor: loan, kind: 'borrowed' }, state);
  record(p.payments, { key: `buy:${p.id}:closing`, label: 'Closing costs', minor: p.closingMinor, kind: 'paid' }, state);
  p.stage = 'completed';
  const today = todayAt(state, home);
  const owned: Owned = { homeId: home.id, since: state.now, costMinor: p.offerMinor, payments: [] };
  if (loan && p.finance.kind === 'mortgage') {
    owned.mortgage = { name: mortgageName, principalMinor: loan, rate: p.finance.rate, months: p.finance.years * 12, paymentMinor: p.finance.paymentMinor, paidMonths: 0, anchorDay: parseYmdDay(today), start: today, arrearsMinor: 0 };
    scheduleHome(state, instantOn(home, addMonths(today, 1)), 'mortgage-due', { homeId: home.id, n: 1 }, 'silent', `home-mort:${home.id}:1`);
  }
  homesOf(state).owned.push(owned);
  home.market = 'sale';
  document(state, home.id, 'Title And Completion', [`You own ${home.title} from ${formatDateKey(today)}, ${home.tenure === 'strata' ? 'as a unit in a building whose shared parts its owners hold together' : home.tenure === 'hdb-lease' ? `on HDB's lease${home.leaseYearsLeft ? `, ${home.leaseYearsLeft} years left` : ''}` : home.tenure}.`, `Price ${money(home.currency, p.offerMinor)}; closing costs ${money(home.currency, p.closingMinor)}.`, ...(loan ? [`Mortgage ${money(home.currency, loan)} at ${(p.finance.kind === 'mortgage' ? p.finance.rate * 100 : 0).toFixed(1)}%, ${money(home.currency, owned.mortgage!.paymentMinor)} a month for ${owned.mortgage!.months / 12} years.`] : []), ...(p.route ? [p.route] : [])]);
  note(state, home.id, `You own ${home.title}.${loan ? ` Your first mortgage payment, ${money(home.currency, owned.mortgage!.paymentMinor)}, is due on ${formatDateKey(addMonths(today, 1))}.` : ''} Move in from Your Properties.`, 'money');
}

/** A month's mortgage payment: the interest an expense, the principal less debt. Short, it's owed, and you're told. */
export function mortgageDue(state: GameState, homeId: string, n: number): void {
  const o = homesOf(state).owned.find((x) => x.homeId === homeId && !x.soldAt);
  const m = o?.mortgage;
  if (!o || !m || m.paidMonths >= n || m.months < n) return;
  const home = homeOf(state, homeId);
  const owed = Math.round(mortgageOwed(state, m.name) * 100);
  const owedLocal = Math.round(owed / (dollarsOf(state, home.currency, 10000) / 100));
  const interest = Math.round((owedLocal * m.rate) / 12);
  const principal = Math.max(0, Math.min(owedLocal, m.paymentMinor - interest));
  try {
    if (!canPay(state, home.currency, interest + principal)) throw new Error('short');
    payOut(state, home, `mort:${homeId}:${n}:interest`, interest, `Mortgage interest: ${home.title}`, 'Mortgage Interest');
    book(state, home, `mort:${homeId}:${n}:principal`, -principal, `Mortgage repayment: ${home.title}`, { mortgage: m.name });
    record(o.payments, { key: `mort:${homeId}:${n}`, label: `Mortgage payment ${n}: interest ${money(home.currency, interest)}, principal ${money(home.currency, principal)}`, minor: interest + principal, kind: 'repaid' }, state);
  } catch {
    m.arrearsMinor += m.paymentMinor;
    note(state, homeId, `Your mortgage payment on ${home.title} couldn't be paid. ${money(home.currency, m.arrearsMinor)} is overdue. What a lender does next isn't modeled; the debt stays owed.`, 'warning');
  }
  m.paidMonths = n;
  if (n < m.months && mortgageOwed(state, m.name) > 0.005) scheduleHome(state, instantOn(home, addMonths(m.start, n + 1, m.anchorDay)), 'mortgage-due', { homeId, n: n + 1 }, 'silent', `home-mort:${homeId}:${n + 1}`);
}

// ---------------- Selling ----------------

export function saleRefusal(state: GameState, homeId: string): string | null {
  const hs = homesOf(state);
  if (!hs.owned.some((o) => o.homeId === homeId && !o.soldAt)) return "You don't own this home.";
  if (hs.sales.some((s) => s.homeId === homeId && (s.stage === 'listed' || s.stage === 'offer' || s.stage === 'agreed'))) return "It's already for sale.";
  if (hs.lettings.some((l) => l.homeId === homeId && (l.stage === 'let' || l.stage === 'notice'))) return 'Your tenant lives here: a sale with vacant possession waits until their tenancy has ended.';
  if (hs.jobs.some((j) => j.homeId === homeId && (j.stage === 'working' || j.stage === 'scheduled'))) return 'Work is under way: finish or cancel it before you sell.';
  return null;
}
/** List an owned home for sale at your asking price; a buyer's offer comes, by the asking price against what it's worth. */
export function listForSale(state: GameState, homeId: string, askingMinor: number): Sale {
  const no = saleRefusal(state, homeId);
  if (no) throw new Error(no);
  if (!(askingMinor > 0)) throw new Error('Say what you ask for it.');
  const home = homeOf(state, homeId);
  const s: Sale = { id: newId(state, 'sale'), homeId, askingMinor, listedAt: state.now, stage: 'listed', feeMinor: Math.round(askingMinor * BUYING.saleFeeShare / 100) * 100, payments: [] };
  homesOf(state).sales.push(s);
  const worth = valuation(state, home);
  const wait = Math.round(BUYING.buyerDays * Math.max(0.5, Math.min(3, askingMinor / worth)));
  scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), wait)), 'buyer-offer', { id: s.id });
  note(state, homeId, `${home.title} is for sale at ${money(home.currency, askingMinor)}. The agent's fee is ${money(home.currency, s.feeMinor)} on completion (the game's 2%).`);
  return s;
}
/** What a home is worth now, the game's model: what it cost, adjusted for its condition and work done since. */
export function valuation(state: GameState, home: Home): number {
  const o = homesOf(state).owned.find((x) => x.homeId === home.id);
  const base = o?.costMinor ?? home.priceMinor;
  const poor = Object.values(home.condition).filter((g) => g === 'poor').length;
  const improved = homesOf(state).jobs.filter((j) => j.homeId === home.id && j.stage === 'done').reduce((a, j) => a + j.quoteMinor * 0.6, 0);
  return Math.round((base * (1 - poor * 0.03) + improved) / 100) * 100;
}
export function buyerOffer(state: GameState, s: Sale): void {
  if (s.stage !== 'listed') return;
  const home = homeOf(state, s.homeId);
  const worth = valuation(state, home);
  s.offerMinor = Math.round(Math.min(s.askingMinor, worth * 1.05) * 0.98 / 100) * 100;
  s.stage = 'offer';
  s.buyerAt = state.now;
  note(state, home.id, `A buyer offered ${money(home.currency, s.offerMinor)} for ${home.title}. Accept it, or wait for the next.`);
}
export function acceptSaleRefusal(state: GameState, s: Sale): string | null {
  if (s.stage !== 'offer') return 'There is no offer to accept.';
  const home = homeOf(state, s.homeId);
  const o = homesOf(state).owned.find((x) => x.homeId === s.homeId && !x.soldAt)!;
  const debt = o.mortgage ? Math.round(mortgageOwed(state, o.mortgage.name) * 100 / (dollarsOf(state, home.currency, 10000) / 100)) : 0;
  const shortfall = debt + s.feeMinor - s.offerMinor!;
  // Negative equity: the sale can't repay the mortgage, so the rest must come from your own money at completion.
  if (shortfall > 0 && !canPay(state, home.currency, shortfall)) return `This offer wouldn't repay your mortgage: you'd need ${money(home.currency, shortfall)} of your own at completion, and you don't have it.`;
  return null;
}
export function acceptSaleOffer(state: GameState, id: string): void {
  const s = homesOf(state).sales.find((x) => x.id === id);
  if (!s) throw new Error('That sale is no longer on record.');
  const no = acceptSaleRefusal(state, s);
  if (no) throw new Error(no);
  const home = homeOf(state, s.homeId);
  s.stage = 'agreed';
  s.completeOn = addDaysToKey(todayAt(state, home), BUYING.completionDays);
  scheduleHome(state, instantOn(home, s.completeOn), 'sale-completion', { id: s.id }, 'notify', `home-salec:${s.id}`);
  note(state, home.id, `You accepted ${money(home.currency, s.offerMinor!)} for ${home.title}. The sale completes on ${formatDateKey(s.completeOn)}.`);
}
export function declineSaleOffer(state: GameState, id: string): void {
  const s = homesOf(state).sales.find((x) => x.id === id);
  if (!s || s.stage !== 'offer') throw new Error('There is no offer to decline.');
  const home = homeOf(state, s.homeId);
  s.stage = 'listed';
  s.offerMinor = undefined;
  scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), BUYING.buyerDays)), 'buyer-offer', { id: s.id, again: state.now });
  note(state, home.id, `You declined the offer for ${home.title}. It stays on the market.`);
}
/** Completion of a sale: the price in, the mortgage repaid first, the agent paid; what's left is yours, not income. */
export function completeSale(state: GameState, s: Sale): void {
  if (s.stage !== 'agreed') return;
  const hs = homesOf(state);
  const home = homeOf(state, s.homeId);
  const o = hs.owned.find((x) => x.homeId === s.homeId && !x.soldAt)!;
  const price = s.offerMinor!;
  book(state, home, `sale:${s.id}:price`, price, `Sale of ${home.title}`, BOOK.homesOwned);
  let debt = 0;
  if (o.mortgage) {
    const owedDollars = mortgageOwed(state, o.mortgage.name);
    debt = Math.round(owedDollars * 100 / (dollarsOf(state, home.currency, 10000) / 100));
    if (owedDollars > 0) postHousingDollars(state, `sale:${s.id}:debt`, -owedDollars, `Mortgage repaid on sale: ${home.title}`, o.mortgage.name);
    record(s.payments, { key: `sale:${s.id}:debt`, label: 'Mortgage repaid', minor: debt, kind: 'repaid' }, state);
  }
  payOut(state, home, `sale:${s.id}:fee`, s.feeMinor, `Agent's fee: sale of ${home.title}`, 'Selling Costs');
  record(s.payments, { key: `sale:${s.id}:price`, label: 'Sale price received (your own property, not income)', minor: price, kind: 'received' }, state);
  record(s.payments, { key: `sale:${s.id}:fee`, label: "Agent's fee", minor: s.feeMinor, kind: 'paid' }, state);
  s.stage = 'completed';
  s.proceedsMinor = price - debt - s.feeMinor;
  s.debtRepaidMinor = debt;
  o.soldAt = state.now;
  if (hs.residence === home.id) hs.residence = undefined;
  for (const it of hs.items.filter((i) => i.homeId === home.id && i.owner === 'you' && !i.builtIn)) { it.homeId = null; it.roomId = null; it.stage = 'stored'; }
  for (const it of hs.items.filter((i) => i.homeId === home.id && i.builtIn)) it.stage = 'sold';
  document(state, home.id, 'Sale Completion', [`Sold for ${money(home.currency, price)} on ${formatDateKey(todayAt(state, home))}.`, ...(debt ? [`Mortgage repaid: ${money(home.currency, debt)}.`] : []), `Agent's fee: ${money(home.currency, s.feeMinor)}.`, `Proceeds to you: ${money(home.currency, s.proceedsMinor)}.`, 'Built-in fittings stay with the home; your movable belongings went into storage.']);
  note(state, home.id, `The sale of ${home.title} is complete. ${debt ? `Your mortgage, ${money(home.currency, debt)}, is repaid. ` : ''}${money(home.currency, s.proceedsMinor)} came to you after the agent's fee.`, 'money');
}
function postHousingDollars(state: GameState, key: string, dollars: number, label: string, mortgage: string): void {
  postHousing(state, key, dollars, label, { mortgage });
}
export const placeName = (h: Home) => getPlace(h.placeId).name;
