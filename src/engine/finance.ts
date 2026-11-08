// Project financing: who puts money into a project, why, when it arrives, and what they get in return.
//
// A project's budget size gives an estimate and a financing target; it never puts money in the project. Money arrives
// only from a deal the player accepted after seeing its terms, and only as the deal says (on signing, or on delivery).
// Every term the game shows is one it enforces: repayment from income, a share of income, approval rights, a credit,
// and a delivery deadline. Amounts and decisions are game calibration, not industry figures.

import { money } from './budget';
import { getPlace } from '../data/places';
import { TERRITORY_CITIZENSHIP, countryInSentence, homeCountries } from './identity';
import { DOCUMENTS, documentNames, documentsNeeded, type DocumentId } from './script-effects';
import { isNonfiction, scriptIssues } from './projects';
import { OFFER_OPEN_DAYS, openOffer } from './negotiation';
import { stream } from './rng';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { FinanceDeal, FinanceDealKind, GameState, Project } from './types';

/** What each kind of backer is, said once, the same everywhere. */
export const BACKERS: Record<Exclude<FinanceDealKind, 'agreed'>, { name: string; who: string; why: string; decideDays: number }> = {
  starting: {
    name: 'Starting Backing',
    who: 'The backer who agreed, as part of your starting situation, to fund your first project.',
    why: 'Agreed when your story began: they back one first project up to the low-budget size once its script is approved.',
    decideDays: 0,
  },
  grant: {
    name: 'Screen Arts Fund Grant',
    who: 'A public arts fund that supports new screen work by the citizens and residents of the country where the project is based.',
    why: 'Its panel reads approved scripts and funds the ones it rates highest each round; a finished project of yours helps.',
    decideDays: 21,
  },
  investor: {
    name: 'Private Investor',
    who: 'A private investor looking for a return.',
    why: 'They invest when the amount fits your track record: modest sums for a first project, more after you deliver.',
    decideDays: 14,
  },
  'co-producer': {
    name: 'Co-Production Partner',
    who: 'A production company that puts in money alongside other backers.',
    why: 'They match half of what is already promised, so they only join a project that has backing.',
    decideDays: 10,
  },
  commissioner: {
    name: 'Commissioner',
    who: 'A broadcaster or streamer that orders the project and owns it.',
    why: 'They commission producers who have delivered before, and pay the full target.',
    decideDays: 28,
  },
};

/** The largest amount each backer will consider, by the player's delivered projects. Game calibration. */
const GRANT_CAP = 120_000;
const INVESTOR_CAP_FIRST = 150_000;
const INVESTOR_CAP_PROVEN = 2_000_000;
/** The starting backing covers a first project up to the low-budget size. */
export const STARTING_BACKING_CAP = 400_000;
/** A grant must be delivered within this long, or it is repaid. */
const GRANT_DELIVERY_DAYS = 540;

export function deals(p: Project): FinanceDeal[] {
  return p.finance?.deals ?? [];
}
const accepted = (p: Project) => deals(p).filter((d) => d.status === 'accepted' || d.status === 'breached');

/** The four amounts the player sees, kept apart: estimate, target, promised, and money actually received. */
export function financeSummary(p: Project) {
  const estimate = p.finance?.estimate ?? p.funding.fund;
  const target = p.finance?.target ?? p.funding.fund;
  const promised = accepted(p).reduce((s, d) => s + d.amount, 0) + p.funding.extra.reduce((s, e) => s + e.amount, 0);
  const received = accepted(p).reduce((s, d) => s + d.received, 0) + p.funding.extra.reduce((s, e) => s + e.amount, 0);
  return { estimate, target, promised, received, stillToRaise: Math.max(0, target - promised), owedOnDelivery: promised - received };
}

export const delivered = (state: GameState) => state.projects.filter((x) => x.delivered !== null).length;

/**
 * Backers' modeled read of the script, 20 to 90: open readiness notes on it lower it (scriptIssues: structure, causality...).
 * Advisory prompts (a text field left empty, a fit suggestion) aren't faults and don't count (projects.ts Issue).
 */
export function scriptScore(p: Project): number {
  return Math.max(20, 90 - scriptIssues(p).filter((i) => i.severity !== 'blocking' && !i.advisory).length * 8);
}
const usedStarting = (state: GameState) => state.projects.some((x) => deals(x).some((d) => d.kind === 'starting' && d.status !== 'declined' && d.status !== 'refused'));
const scriptApproved = (p: Project) => p.approvedDraft !== null && p.approvedDraft !== undefined;

/**
 * The documents each backer's submission includes, besides the approved script: the backer reads them, and SLATE never
 * judges them. Asking for a synopsis, a treatment and a statement of intent is what screen funds and commissioners do; which
 * backer asks for which is a simulation assumption. Until the review of November 7, 2026 a missing treatment made every
 * backer answer a week later instead; it now simply has to be written before the application that includes it is sent.
 */
export const BACKER_DOCUMENTS: Record<Exclude<FinanceDealKind, 'agreed'>, DocumentId[]> = {
  starting: [], investor: ['pitch'], 'co-producer': ['pitch'], commissioner: ['pitch', 'treatment'], grant: ['pitch', 'treatment', 'statement'],
};
const SUBMISSION: Record<Exclude<FinanceDealKind, 'agreed'>, string> = {
  starting: 'The starting backing', investor: 'An approach to an investor', 'co-producer': 'An approach to a co-production partner',
  commissioner: 'A pitch to a commissioner', grant: 'A grant application',
};

/** What a backer's submission includes, in words, for the approach button and its record. */
export function backerDocuments(kind: Exclude<FinanceDealKind, 'agreed'>): string {
  const d = BACKER_DOCUMENTS[kind];
  return d.length ? `${SUBMISSION[kind]} includes the approved script and ${documentNames(d)}.` : '';
}

/**
 * A country's public screen fund supports its citizens and the people who live there (November 8, 2026, with
 * citizenship from 1221's Identity): the fund approached is the one where the project is based. Null when you may apply.
 */
export function fundClosedTo(state: GameState, p: Project): string | null {
  const where = getPlace(p.axes.basePlaceId).country;
  const country = TERRITORY_CITIZENSHIP[where] ?? where;
  const home = homeCountries(state);
  if (home.some((h) => h.code === country)) return null;
  const citizen = home.find((h) => h.citizen);
  const resident = home.find((h) => h.resident);
  const you = [citizen && `a citizen of ${countryInSentence(citizen.code)}`, resident && `live in ${countryInSentence(resident.code)}`].filter(Boolean).join(' and ');
  return `This project is based in ${countryInSentence(country)}, and its public fund supports its citizens and the people who live there. You're ${you}.`;
}

/** Each backer the player could approach for this project, with what it needs and whether that is met. */
export function backerOptions(state: GameState, p: Project): { kind: Exclude<FinanceDealKind, 'agreed'>; ready: boolean; needs: string }[] {
  // One approach per backer per project: a backer who said no, or was turned down, isn't asked again for it.
  const has = (k: FinanceDealKind) => deals(p).some((d) => d.kind === k);
  const { promised, stillToRaise } = financeSummary(p);
  const out: { kind: Exclude<FinanceDealKind, 'agreed'>; ready: boolean; needs: string }[] = [];
  const closed = p.delivered ? 'This project is delivered.' : stillToRaise <= 0 ? 'Your target is fully promised.' : '';
  const why = (k: FinanceDealKind, extra: string | null) => closed || (has(k) ? 'Already approached for this project.' : extra ?? '');
  if (!usedStarting(state) || has('starting')) {
    out.push({ kind: 'starting', ready: false, needs: why('starting', state.projects.some((x) => x.id !== p.id && x.delivered) ? 'Only for your first project.' : !scriptApproved(p) ? 'Approve a script first.' : null) });
  }
  // The documents a submission includes must be written before it is sent (BACKER_DOCUMENTS).
  const docs = (k: Exclude<FinanceDealKind, 'agreed'>) => documentsNeeded(p, BACKER_DOCUMENTS[k], isNonfiction(p.axes.format), SUBMISSION[k]);
  out.push({ kind: 'grant', ready: false, needs: why('grant', !scriptApproved(p) ? 'Approve a script first.' : fundClosedTo(state, p) ?? docs('grant')) });
  out.push({ kind: 'investor', ready: false, needs: why('investor', !scriptApproved(p) ? 'Approve a script first.' : docs('investor')) });
  out.push({ kind: 'co-producer', ready: false, needs: why('co-producer', promised <= 0 ? 'Get some funding promised first; they only match other backers.' : docs('co-producer')) });
  // A commissioner who didn't renew the series won't fund its next season (continuation.ts).
  const notRenewed = p.continues && state.projects.find((x) => x.id === p.continues!.from)?.renewal?.outcome === 'cancelled' ? "The commissioner didn't renew the series." : null;
  out.push({ kind: 'commissioner', ready: false, needs: why('commissioner', delivered(state) === 0 ? 'Deliver a project first.' : notRenewed ?? (!scriptApproved(p) ? 'Approve a script first.' : docs('commissioner'))) });
  for (const o of out) o.ready = o.needs === '';
  return out;
}

/** Ask a backer to fund this project. Most take some days to decide; the starting backing is already agreed. */
export function approachBacker(state: GameState, p: Project, kind: Exclude<FinanceDealKind, 'agreed'>): FinanceDeal {
  const opt = backerOptions(state, p).find((o) => o.kind === kind);
  if (!opt) throw new Error('That backer is not available for this project.');
  if (!opt.ready) throw new Error(opt.needs);
  p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] };
  const b = BACKERS[kind];
  const days = b.decideDays;
  const sent = BACKER_DOCUMENTS[kind].map((d) => DOCUMENTS[d].name);
  // A copy of each document as it stands now: what the backer reads is what was sent, whatever is edited later.
  const nf = isNonfiction(p.axes.format);
  const documents = BACKER_DOCUMENTS[kind].map((d) => ({ name: DOCUMENTS[d].name, fields: DOCUMENTS[d].fields(nf).map(([k, label]) => ({ label, text: String(p.story[k] ?? '') })) }));
  const deal: FinanceDeal = {
    id: newId(state, 'fd'), kind, backer: b.name, amount: 0, status: 'considering', askedAt: state.now, decideAt: state.now + days * DAY,
    reason: '', received: 0, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null },
    ...(sent.length ? { sent, sentCopy: { draft: p.approvedDraft, documents } } : {}),
  };
  p.finance.deals.push(deal);
  if (b.decideDays === 0) decide(state, p, deal);
  else {
    schedule(state, deal.decideAt!, 'finance-decision', { projectId: p.id, dealId: deal.id }, { attention: 'notify', priority: 40 });
    addLog(state, `You asked the ${b.name.toLowerCase()} to back ${p.title}${sent.length ? `, sending the approved script and your ${sent.join(', ').toLowerCase()}` : ''}. They will answer in about ${days} days.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  }
  return deal;
}

/** The backer's answer: an offer with exact terms, or a refusal with the reason. Deterministic for a world seed. */
function decide(state: GameState, p: Project, deal: FinanceDeal): void {
  const { stillToRaise, promised, target } = financeSummary(p);
  const roll = stream(state.seed, 'finance', p.id, deal.id)();
  const proven = delivered(state);
  const notes = scriptIssues(p).filter((i) => i.severity !== 'blocking' && !i.advisory).length;
  const script = scriptScore(p);
  const t = deal.terms;
  let offer = 0;
  let refusal = '';
  switch (deal.kind) {
    case 'starting':
      offer = Math.min(stillToRaise, STARTING_BACKING_CAP);
      t.recoup = offer;
      t.credit = 'With Thanks To';
      deal.reason = 'Agreed when your story began. They are repaid from the project\'s income first.';
      break;
    case 'grant': {
      const chance = 0.1 + script / 300 + Math.min(0.2, proven * 0.1); // competitive: at best about 4 in 10 for new work
      if (roll < chance) {
        offer = Math.min(stillToRaise, GRANT_CAP);
        t.credit = 'Supported By';
        t.deliverBy = state.now + GRANT_DELIVERY_DAYS * DAY;
        deal.reason = notes ? `The panel backed the script despite ${notes === 1 ? 'one open note' : `${notes} open notes`} on it.` : 'The panel backed the script; it had no open notes.';
      } else refusal = `The fund's panel chose other projects this round${notes ? ` (the script had ${notes === 1 ? 'one open note' : `${notes} open notes`})` : ''}.`;
      break;
    }
    case 'investor': {
      const cap = proven ? INVESTOR_CAP_PROVEN : INVESTOR_CAP_FIRST;
      const chance = 0.45 + script / 300 + Math.min(0.25, proven * 0.1);
      if (roll < chance) {
        offer = Math.min(stillToRaise, cap);
        t.recoup = Math.round(offer * 1.2);
        t.incomeShare = 0.3;
        t.credit = 'Executive Producer';
        deal.reason = proven ? 'Your delivered work convinced them.' : `A modest first stake: they invest up to ${money(cap)} before you have delivered a project.`;
      } else refusal = proven ? 'They passed on this one.' : 'They want to see a finished project from you first.';
      break;
    }
    case 'co-producer':
      if (roll < 0.75) {
        offer = Math.min(stillToRaise, Math.round(promised * 0.5));
        t.incomeShare = 0.5;
        t.approvalRights = ['Casting Approval'];
        t.credit = 'Co-Production Partner';
        deal.reason = 'They match half of what is already promised.';
      } else refusal = 'Their slate is full this year.';
      break;
    case 'commissioner':
      if (roll < 0.35 + Math.min(0.4, proven * 0.15)) {
        offer = stillToRaise;
        t.onDelivery = Math.round(offer * 0.2);
        t.incomeShare = 0.85;
        t.approvalRights = ['Casting Approval', 'Picture Approval'];
        t.credit = 'Commissioned By';
        deal.reason = 'Your delivered work earned a commission.';
      } else refusal = 'They have no slot for this project.';
      break;
  }
  void target;
  if (offer <= 0) {
    deal.status = 'declined';
    deal.reason = refusal || 'Nothing is left to raise.';
    addLog(state, `The ${deal.backer.toLowerCase()} won't back ${p.title}. ${deal.reason}`, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
    return;
  }
  deal.amount = offer;
  deal.status = 'offered';
  // The agreed starting backing stays open; any other offer lapses if it isn't answered (negotiation.ts).
  if (deal.kind !== 'starting') openOffer(state, p, deal);
  addLog(state, `The ${deal.backer.toLowerCase()} offered ${money(offer)} for ${p.title}.${deal.expiresAt ? ` It is open for ${OFFER_OPEN_DAYS} days.` : ''} Read the terms before you accept.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

registerHandler('finance-decision', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const deal = p && deals(p).find((d) => d.id === ev.payload.dealId);
  if (!p || !deal || deal.status !== 'considering') return { suppressInterrupt: true };
  decide(state, p, deal);
  return { message: (deal.status as FinanceDeal['status']) === 'offered' ? `The ${deal.backer.toLowerCase()} made an offer for ${p.title}.` : `The ${deal.backer.toLowerCase()} won't back ${p.title}.` };
});

/** Every term of an offer, in the words shown before accepting. */
export function dealTerms(d: FinanceDeal): string[] {
  const t = d.terms;
  const out: string[] = [];
  const now = d.amount - t.onDelivery;
  out.push(t.onDelivery ? `${money(now)} when you sign, and ${money(t.onDelivery)} when you deliver the project.` : `${money(d.amount)} when you sign.`);
  if (t.recoup) out.push(`They are repaid ${money(t.recoup)} from the project's income before the project keeps any.`);
  if (t.incomeShare) out.push(`${t.recoup ? 'After that, they' : 'They'} take ${Math.round(t.incomeShare * 100)}% of the project's income${d.kind === 'commissioner' ? ' (they own the project)' : ''}.`);
  for (const r of t.approvalRights) out.push(r === 'Casting Approval' ? 'They approve who plays the leads, which adds a couple of days to lead casting offers.' : 'They approve the final cut before you can lock picture.');
  if (t.deliverBy) out.push(`Deliver by ${new Date(t.deliverBy).toISOString().slice(0, 10)}, or the grant must be repaid.`);
  if (t.credit) out.push(`They are credited: "${t.credit} ${d.backer}".`);
  return out;
}

/** Accept an offer: its signing money arrives now and its terms apply from now on. */
export function acceptDeal(state: GameState, p: Project, dealId: string): void {
  const d = deals(p).find((x) => x.id === dealId);
  if (!d || d.status !== 'offered' || (d.expiresAt !== undefined && state.now >= d.expiresAt)) throw new Error('That offer is no longer open.');
  if (d.counter && !d.counter.outcome) throw new Error('They are considering the better terms you asked for. Wait for their answer.');
  if (p.delivered && d.terms.onDelivery) throw new Error('This project is already delivered.');
  d.status = 'accepted';
  const now = d.amount - d.terms.onDelivery;
  d.received = now;
  p.funding.fund += now;
  if (d.terms.deliverBy) schedule(state, d.terms.deliverBy, 'finance-deadline', { projectId: p.id, dealId: d.id }, { attention: 'interrupt', priority: 35 });
  p.history.push({ at: state.now, text: `${d.backer} backs the project with ${money(d.amount)}.` });
  addLog(state, `You accepted ${money(d.amount)} from the ${d.backer.toLowerCase()} for ${p.title}. ${money(now)} is now in the budget.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

/** Turn an offer down. A backer who was turned down isn't asked again for this project. */
export function refuseDeal(state: GameState, p: Project, dealId: string): void {
  const d = deals(p).find((x) => x.id === dealId);
  if (!d || d.status !== 'offered') throw new Error('That offer is no longer open.');
  d.status = 'refused';
  addLog(state, `You turned down the ${d.backer.toLowerCase()}'s offer for ${p.title}.`, 'money', { projectId: p.id });
}

/** Approval rights the project's backers hold. */
export function financeRights(p: Project): string[] {
  return accepted(p).flatMap((d) => d.terms.approvalRights);
}

/** Credits the backers are owed (shown with the project's credits). */
export function financeCredits(p: Project): { label: string; backer: string }[] {
  return accepted(p).filter((d) => d.terms.credit).map((d) => ({ label: d.terms.credit!, backer: d.backer }));
}

/** On delivery: money owed on delivery arrives. */
export function onProjectDelivered(state: GameState, p: Project): void {
  for (const d of accepted(p)) {
    const due = d.amount - d.received;
    if (due > 0) {
      d.received += due;
      p.funding.fund += due;
      addLog(state, `The ${d.backer.toLowerCase()} paid ${money(due)} on delivery of ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
    }
  }
}

/**
 * Income the project earns (a distributor's minimum guarantee): backers are repaid first, in the order they signed,
 * then take their share of the rest. Returns what the project keeps.
 */
export function receiveIncome(state: GameState, p: Project, amount: number, from: string): number {
  let left = Math.max(0, Math.round(amount));
  const notes: string[] = [];
  for (const d of accepted(p)) {
    const owed = d.terms.recoup - d.repaid;
    if (owed > 0 && left > 0) {
      const pay = Math.min(owed, left);
      d.repaid += pay;
      left -= pay;
      notes.push(`${money(pay)} repaid to the ${d.backer.toLowerCase()}`);
    }
  }
  const shares = accepted(p).filter((d) => d.terms.incomeShare > 0 && d.repaid >= d.terms.recoup);
  const before = left;
  for (const d of shares) {
    const take = Math.round(before * d.terms.incomeShare);
    const pay = Math.min(take, left);
    if (pay > 0) {
      d.repaid += pay;
      left -= pay;
      notes.push(`${money(pay)} to the ${d.backer.toLowerCase()} (their share)`);
    }
  }
  if (notes.length) addLog(state, `Of ${money(amount)} from ${from} for ${p.title}: ${notes.join('; ')}. The project keeps ${money(left)}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return left;
}

registerHandler('finance-deadline', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p && deals(p).find((x) => x.id === ev.payload.dealId);
  if (!p || !d || d.status !== 'accepted' || p.delivered) return { suppressInterrupt: true };
  d.status = 'breached';
  // The repayment is owed whatever the budget holds: it is recorded as agreed, even if that leaves the budget short.
  p.obligations.push({ id: newId(state, 'o'), label: `Repay The ${d.backer}`, category: 'finance', amount: d.received, state: 'committed', settled: 0, ref: `finance:${d.id}`, postings: [{ at: state.now, kind: 'commit', amount: d.received, key: `finance:${d.id}:breach` }] });
  const text = `${p.title} wasn't delivered by the ${d.backer.toLowerCase()}'s deadline, so its ${money(d.received)} grant must be repaid.`;
  addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return { message: text };
});

/** Save version 5: money a project already had is kept, recorded as funding agreed before financing existed. */
export function migrateV4toV5(raw: Record<string, unknown>): Record<string, unknown> {
  const projects = (raw.projects as Record<string, any>[] | undefined) ?? []; // eslint-disable-line @typescript-eslint/no-explicit-any
  return {
    ...raw,
    projects: projects.map((p) => {
      if (p.finance) return p;
      const fund = Number(p.funding?.fund) || 0;
      const rights: Record<string, string[]> = { mid: ['Casting Approval'], commissioned: ['Casting Approval', 'Picture Approval'] };
      const deal: FinanceDeal = {
        id: `${p.id}-agreed`, kind: 'agreed', backer: 'Funding agreed before financing was added', amount: fund, status: 'accepted', askedAt: Number(p.createdAt) || 0,
        reason: 'This project was funded in an earlier version of SLATE, where choosing a budget size provided the money. It keeps that money and those terms.',
        received: fund, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: rights[p.funding?.scenarioId] ?? [], credit: null, onDelivery: 0, deliverBy: null },
      };
      return { ...p, finance: { estimate: fund, target: fund, deals: fund > 0 ? [deal] : [] } };
    }),
  };
}

/** Change how much the player aims to raise. It never changes money promised or received. */
export function setFinanceTarget(p: Project, target: number): void {
  if (!Number.isFinite(target) || target < 1000 || target > 100_000_000) throw new Error('Choose a target between $1,000 and $100,000,000.');
  p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] };
  p.finance.target = Math.round(target);
}
