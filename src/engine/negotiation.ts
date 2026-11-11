// Negotiating a backer's offer, and offers that lapse (SLATE-08-03.02 and .03, November 8, 2026). Until now finance
// terms were take-or-leave and an offer stayed open for ever. Now:
// - An offer is open for OFFER_OPEN_DAYS from when it is made; after that it lapses and can't be accepted. Approaching
//   the same kind of backer again is possible, as before for a refusal by them.
// - Once per offer you can ask for one better term the backer supports: a smaller share of income, less to repay first,
//   more of the money on signing, or no casting approval. Asking takes a few days and doesn't stop the offer lapsing.
// - Whether they agree is decided from your leverage, never from chance alone: the script's open notes, the projects you
//   have delivered, and whether another backer's offer is open at the same time. Leverage gives the odds; a roll from
//   the world seed settles it, so the same game always gets the same answer. A big shortfall of leverage can make them
//   take the offer back, which is the risk of asking.
// Grants and the agreed starting backing aren't negotiable: their terms are the fund's rules. Amounts and odds are game
// calibration, not industry figures.
import { money } from './budget';
import { theBacker } from './backer-words';
import { deals, delivered, scriptScore } from './finance';
import { stream } from './rng';
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { FinanceDeal, GameState, Project } from './types';

/** How long an offer stays open once made. Game calibration. */
export const OFFER_OPEN_DAYS = 21;
/** How long a backer takes to answer a request for better terms. Game calibration. */
export const COUNTER_DAYS = 5;

export type BetterTerm = 'share' | 'recoup' | 'signing' | 'approval';

export const NOT_NEGOTIABLE = new Set(['starting', 'grant', 'agreed', 'earnings', 'capital']);

/** The better terms you could ask this backer for, each with what it would change. */
export function betterTerms(d: FinanceDeal): { term: BetterTerm; label: string; change: string }[] {
  if (NOT_NEGOTIABLE.has(d.kind)) return [];
  const t = d.terms;
  const out: { term: BetterTerm; label: string; change: string }[] = [];
  if (t.incomeShare >= 0.2) out.push({ term: 'share', label: 'A Smaller Share Of Income', change: `${Math.round(t.incomeShare * 100)}% of income becomes ${Math.round(t.incomeShare * 100) - 10}%.` });
  if (t.recoup > d.amount) out.push({ term: 'recoup', label: 'Less To Repay First', change: `They are repaid ${money(d.amount)}, what they put in, instead of ${money(t.recoup)}.` });
  if (t.onDelivery > 0) out.push({ term: 'signing', label: 'More On Signing', change: `${money(Math.round(t.onDelivery / 2))} of the ${money(t.onDelivery)} due on delivery comes when you sign.` });
  if (t.approvalRights.includes('Casting Approval')) out.push({ term: 'approval', label: 'No Casting Approval', change: 'They no longer approve who plays the leads.' });
  return out;
}

/** Your leverage with this backer, 0 to 1: the script's open notes, your delivered work, and a competing offer. */
export function leverage(state: GameState, p: Project, d: FinanceDeal): number {
  const competing = deals(p).some((x) => x.id !== d.id && x.status === 'offered');
  return Math.min(0.95, 0.15 + scriptScore(p) / 400 + Math.min(0.3, delivered(state) * 0.1) + (competing ? 0.2 : 0));
}

/** Open an offer: it stays open OFFER_OPEN_DAYS, then lapses. Every offered deal goes through here. */
export function openOffer(state: GameState, p: Project, d: FinanceDeal): void {
  d.expiresAt = state.now + OFFER_OPEN_DAYS * DAY;
  schedule(state, d.expiresAt, 'finance-offer-lapse', { projectId: p.id, dealId: d.id }, { attention: 'notify', priority: 40 });
}

function apply(d: FinanceDeal, term: BetterTerm): void {
  const t = d.terms;
  if (term === 'share') t.incomeShare = Math.round((t.incomeShare - 0.1) * 100) / 100;
  if (term === 'recoup') t.recoup = d.amount;
  if (term === 'signing') t.onDelivery -= Math.round(t.onDelivery / 2);
  if (term === 'approval') t.approvalRights = t.approvalRights.filter((r) => r !== 'Casting Approval');
}

registerHandler('finance-counter', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p && deals(p).find((x) => x.id === ev.payload.dealId);
  if (!p || !d || d.status !== 'offered' || !d.counter || d.counter.outcome) return { suppressInterrupt: true };
  const lev = leverage(state, p, d);
  const roll = stream(state.seed, 'finance-counter', p.id, d.id)();
  const label = betterTerms(d).find((x) => x.term === d.counter!.term)?.label.toLowerCase() ?? 'better terms';
  let text: string;
  if (roll < lev) {
    apply(d, d.counter.term);
    d.counter.outcome = 'agreed';
    text = `${theBacker(d, true)} agreed to ${label} for ${p.title}. The offer stands with the new terms.`;
  } else if (roll > lev + 0.5) {
    d.counter.outcome = 'withdrawn';
    d.status = 'withdrawn';
    d.reason = `They took the offer back when you asked for ${label}.`;
    text = `${theBacker(d, true)} took back their offer for ${p.title} when you asked for ${label}.`;
  } else {
    d.counter.outcome = 'held';
    text = `${theBacker(d, true)} kept their terms for ${p.title}. The offer is still open as it was.`;
  }
  addLog(state, text, d.status === 'withdrawn' ? 'warning' : 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return { message: text };
});

registerHandler('finance-offer-lapse', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p && deals(p).find((x) => x.id === ev.payload.dealId);
  if (!p || !d || d.status !== 'offered' || (d.expiresAt ?? Infinity) > state.now) return { suppressInterrupt: true };
  d.status = 'lapsed';
  d.reason = 'The offer lapsed before you answered it.';
  const text = `${theBacker(d, true)}'s offer for ${p.title} lapsed unanswered.`;
  addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return { message: text };
});
