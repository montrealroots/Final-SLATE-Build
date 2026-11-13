// Project financing: who puts money into a project, why, when it arrives, and what they get in return.
//
// A project's budget size gives an estimate and a financing target; it never puts money in the project. Money arrives
// only from a deal the player accepted after seeing its terms, and only as the deal says (on signing, or on delivery).
// Every term the game shows is one it enforces: repayment from income, a share of income, approval rights, a credit,
// and a delivery deadline. Amounts and decisions are game calibration, not industry figures.

import { theBacker } from './backer-words';
import { closeSettled, ledgerTotals, money, reserve, settle } from './budget';
import { getPlace } from '../data/places';
import { TERRITORY_CITIZENSHIP, countryInSentence, homeCountries } from './identity';
import { DOCUMENTS, documentNames, documentsNeeded, type DocumentId } from './script-effects';
import { isNonfiction, scriptIssues } from './projects';
import { OFFER_OPEN_DAYS, openOffer } from './negotiation';
import { genre } from './genres';
import { stream } from './rng';
import { FORMAT_LABELS } from './projects';
import { ANIMATION_HOUSE, MONTHS, familyKey, pitchRead, reachTerritories, slateRoom, strategyOf, type PitchRead, type StudioStrategy } from './strategy';
import { bindingFor, commissionerHold, considerDaysFor, firstLookHold, noteSubmission, repayTurnaround, scopeOf } from './first-look';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY, dateKey } from './time';
import type { FinanceDeal, FinanceDealKind, GameState, Obligation, Project } from './types';

/** The kinds of backer that are approached as a kind. A followed studio is approached by name (pitchToStudio). */
export type BackerKind = Exclude<FinanceDealKind, 'agreed' | 'studio' | 'company' | 'first-look'>;

/** What each kind of backer is, said once, the same everywhere. */
export const BACKERS: Record<BackerKind, { name: string; who: string; why: string; decideDays: number }> = {
  starting: {
    name: 'Starting Backing',
    who: 'The backer who agreed, as part of your starting situation, to fund your first project.',
    why: 'Agreed when your story began: they back one first project up to the low-budget size once its script is approved.',
    decideDays: 0,
  },
  grant: {
    name: 'Screen Arts Fund Grant',
    who: 'A public arts fund that supports new screen work by the citizens and residents of the country where the project is based.',
    why: 'Its panel reads approved scripts and funds the ones it rates highest each round; a finished project of yours helps, more so one that was well received or won awards.',
    decideDays: 21,
  },
  investor: {
    name: 'Private Investor',
    who: 'A private investor looking for a return.',
    why: 'They invest when the amount fits your track record: modest sums for a first project, more after you deliver, and more readily when your work was well received or won awards.',
    decideDays: 14,
  },
  'co-producer': {
    name: 'Co-Production Partner',
    who: 'A production company that puts in money alongside other backers.',
    why: 'They match half of what is already promised, so they only join a project that has backing.',
    decideDays: 10,
  },
  earnings: {
    name: 'Your Earnings',
    who: 'The income your delivered projects kept once their backers were repaid and paid their shares.',
    why: 'Yours to put into a new project. Nobody is repaid from it, nobody takes a share and nobody holds approval rights.',
    decideDays: 0,
  },
  savings: {
    name: 'Your Own Money',
    who: 'Money from your own account (personal.ts), put in by you.',
    why: 'Yours: nobody is repaid from it, nobody takes a share, and what the project doesn\'t spend stays yours.',
    decideDays: 0,
  },
  capital: {
    name: 'Your Unspent Money',
    who: 'Money you put into your delivered projects that they didn\'t spend.',
    why: 'It was yours before and is yours again. It isn\'t income: it is money you already had, back to put into a new project.',
    decideDays: 0,
  },
  commissioner: {
    name: 'Commissioner',
    who: 'A broadcaster or streamer that orders the project and owns it.',
    why: 'They commission producers who have delivered before, more readily after well-received or award-winning work, and pay the full target.',
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
 * How the player's delivered work went, as backers weigh it (November 10, 2026). Until then they counted delivered projects
 * and nothing else, so a film nobody liked and one that won prizes opened the same doors. Reception is the average over
 * delivered, assessed work; wins are the awards and prizes that work won. The bonus to a backer's chance is game
 * calibration: up to ten points either way for reception (none at 55), and five a win up to ten.
 */
export function trackRecord(state: GameState): { works: number; reception: number | null; wins: number; bonus: number; note: string } {
  const works = state.projects.filter((x) => x.delivered && x.quality);
  const reception = works.length ? Math.round(works.reduce((s, x) => s + x.quality!.reception, 0) / works.length) : null;
  const ids = new Set(works.map((x) => x.id));
  const wins = state.editions.reduce((n, e) => n + e.entries.filter((x) => ids.has(x.projectId) && x.status === 'won').length, 0);
  const bonus = (reception === null ? 0 : Math.max(-0.1, Math.min(0.1, (reception - 55) / 200))) + Math.min(0.1, wins * 0.05);
  const note = wins ? `The ${wins === 1 ? 'award' : `${wins} awards`} your work has won counted for you.`
    : reception === null ? '' : reception >= 70 ? 'How well your delivered work was received counted for you.'
    : reception < 50 ? 'How coolly your delivered work was received counted against you.' : '';
  return { works: works.length, reception, wins, bonus, note };
}
const withNote = (text: string, note: string) => (note ? `${text} ${note}` : text);

// What a project's money is, and whose (November 10, 2026). Until then any money a delivered project had left was offered
// to the next one as Your Earnings, so an unspent grant or an investor's money could be moved out of the project it was
// raised for and called income. A project's money now comes in three parts, each from what was recorded:
//   - production funding: what backers paid in (deals, and partners recorded before deals existed) under terms that keep
//     what is unspent with the project ('stays'), or under no such term at all, which is read the same way;
//   - your own money: what you put in from earlier projects, whose deals say what is unspent is yours again ('yours');
//   - income the project kept: p.revenue, which receiveIncome has already paid backers' repayments and shares out of.
// What the project spent, and every bill agreed or held but not yet paid, is charged to production funding first, then
// to your own money, then to income. That order is a simulation assumption: money raised to make a project pays for
// making it. Moving money out of a project is a budget line whose ref names the transfer and the kind of money it moved.

/** Your own money, as a new project can take it: income a delivered project kept, or money you put in that it didn't spend. */
export type OwnMoneyKind = 'earnings' | 'capital';
export const OWN_MONEY: ReadonlySet<FinanceDealKind> = new Set<FinanceDealKind>(['earnings', 'capital']);

/** How much a budget line takes from the project: paid, plus agreed or held and not yet paid. */
const used = (o: Obligation) => o.settled + (o.state === 'reserved' || o.state === 'committed' ? Math.max(0, o.amount - o.settled) : 0);
/** The kind of your money a line moved to another project, or null if it isn't a transfer. */
const transferKind = (o: Obligation): OwnMoneyKind | null => {
  const k = o.ref?.startsWith('transfer:') ? o.ref.split(':')[2] : null;
  return k === 'earnings' || k === 'capital' ? k : null;
};
/** Money moved out under the rule before November 10, 2026: a finance payment keyed earnings:<deal>, which recorded no kind. */
const movedUnderOldRule = (o: Obligation) => o.category === 'finance' && !o.ref && o.postings.some((x) => x.key.startsWith('earnings:'));

export interface MoneyKept {
  /** Production funding the project still has, which stays with it. */
  restricted: number;
  /** Bills agreed or held and not yet paid: part of what the project has used. */
  held: number;
  /** Income the project kept, unspent and not yet moved. */
  earnings: number;
  /** Money you put in that the project hasn't spent or moved. */
  capital: number;
  moved: Record<OwnMoneyKind, number>;
  /** The budget line that moved money out under the old rule, if any: no more can move out of this project. */
  oldMove: Obligation | null;
}

/** The parts of a project's money, from its deals, income and budget lines. They add up to what the ledger has uncommitted. */
export function moneyKept(p: Project): MoneyKept {
  let cost = Math.max(0, -p.revenue); // income taken back (a cancelled release) is a cost like any other
  let held = 0;
  let oldMove: Obligation | null = null;
  const moved: Record<OwnMoneyKind, number> = { earnings: 0, capital: 0 };
  for (const o of p.obligations) {
    const k = transferKind(o);
    if (k) { moved[k] += used(o); continue; }
    if (movedUnderOldRule(o)) oldMove = o;
    cost += used(o);
    held += used(o) - o.settled;
  }
  const yours = accepted(p).filter((d) => d.terms.unspent === 'yours').reduce((s, d) => s + d.received, 0);
  const raised = p.funding.fund + p.funding.extra.reduce((s, e) => s + e.amount, 0);
  const charge = (pool: number) => { const t = Math.max(0, Math.min(pool, cost)); cost -= t; return pool - t; };
  const restricted = charge(raised - yours);
  const capital = charge(yours - moved.capital);
  const earnings = Math.max(0, p.revenue) - moved.earnings - cost;
  return { restricted: Math.max(0, restricted), held, earnings: Math.max(0, earnings), capital: Math.max(0, capital), moved, oldMove };
}

/** What a delivered project can give a new one of each kind of your money: never more than its ledger has uncommitted. */
function movable(p: Project, k: OwnMoneyKind): number {
  if (!p.delivered) return 0;
  const m = moneyKept(p);
  return m.oldMove ? 0 : Math.max(0, Math.floor(Math.min(m[k], ledgerTotals(p).available)));
}

/** Your money in your other projects, by kind, most first, and where the rest of their money is. */
export function ownMoney(state: GameState, except?: string) {
  const others = state.projects.filter((x) => x.id !== except);
  const from = (k: OwnMoneyKind) => others.map((p) => ({ p, amount: movable(p, k) })).filter((x) => x.amount > 0).sort((a, b) => b.amount - a.amount || a.p.id.localeCompare(b.p.id));
  const done = others.filter((x) => x.delivered).map((p) => ({ p, m: moneyKept(p) }));
  return {
    earnings: from('earnings'),
    capital: from('capital'),
    restricted: done.filter((x) => x.m.restricted >= 1).map((x) => ({ p: x.p, amount: Math.floor(x.m.restricted) })),
    held: done.reduce((s, x) => s + x.m.held, 0),
    oldRule: done.filter((x) => x.m.oldMove).map((x) => ({ p: x.p, line: x.m.oldMove! })),
    inProduction: others.filter((x) => !x.delivered && ledgerTotals(x).available >= 1).length,
    everPutIn: state.projects.some((x) => accepted(x).some((d) => d.terms.unspent === 'yours')),
  };
}
export const ownMoneyTotal = (state: GameState, k: OwnMoneyKind, except?: string) => ownMoney(state, except)[k].reduce((s, x) => s + x.amount, 0);

const titles = (xs: { p: Project; amount: number }[]) => xs.map((x) => `${x.p.title} (${money(x.amount)})`).join(', ');

/** Why your other money can't go into this project, in sentences for the Raise Money card. */
export function ownMoneyNotes(state: GameState, p: Project): string[] {
  const o = ownMoney(state, p.id);
  const out: string[] = [];
  if (o.restricted.length) out.push(`Production funding still in your delivered projects stays with them: it was raised to make them. ${titles(o.restricted)}.`);
  if (o.held >= 1) out.push(`${money(o.held)} in your delivered projects is held for bills they still have to pay.`);
  if (o.inProduction) out.push(`Money in ${o.inProduction === 1 ? 'a project' : 'projects'} you haven't delivered is in use until ${o.inProduction === 1 ? 'it is' : 'they are'} delivered.`);
  for (const x of o.oldRule) out.push(`${money(x.line.settled)} was moved out of ${x.p.title} under the earlier rule, which didn't tell its income from its production funding. That move stands, and no more money can move out of ${x.p.title}.`);
  return out;
}

/**
 * Moves your money from delivered projects into this one as one transfer, at the moment the offer is accepted: each source
 * pays a budget line out, the deal records where it came from, and acceptDeal credits this project once. Checked again
 * now, and refused with nothing changed if less is there than was offered or the money was moved already.
 */
function moveOwnMoney(state: GameState, p: Project, d: FinanceDeal): void {
  const kind = d.kind as OwnMoneyKind;
  const id = `tr-${d.id}`;
  // Either side of the transfer already recorded means it happened: a retry, a reload or a second acceptance moves nothing.
  if (state.projects.some((x) => deals(x).some((y) => y.transfer?.id === id) || x.obligations.some((o) => o.ref?.startsWith(`transfer:${id}:`)))) throw new Error('This money has already been moved.');
  const sources = ownMoney(state, p.id)[kind];
  const there = sources.reduce((s, x) => s + x.amount, 0);
  if (there < d.amount) throw new Error(`${BACKERS[kind].name} ${there ? `comes to ${money(there)} now` : 'has nothing in it now'}, less than the ${money(d.amount)} offered, so nothing was moved. Turn this offer down and put in what there is.`);
  const plan: { p: Project; amount: number }[] = [];
  let left = d.amount;
  for (const x of sources) {
    if (left <= 0) break;
    const take = Math.min(left, x.amount);
    plan.push({ p: x.p, amount: take });
    left -= take;
  }
  const counter = state.idCounter;
  const added: { p: Project; id: string }[] = [];
  try {
    for (const x of plan) {
      const o = reserve(state, x.p, `Put Into ${p.title}`, 'finance', x.amount, `transfer:${id}:${kind}`);
      added.push({ p: x.p, id: o.id });
      settle(state, x.p, o.id, x.amount, `transfer:${id}`);
      closeSettled(x.p, o.id);
    }
  } catch (e) {
    for (const a of added) a.p.obligations = a.p.obligations.filter((o) => o.id !== a.id);
    state.idCounter = counter;
    throw e;
  }
  d.transfer = { id, sources: plan.map((x) => ({ projectId: x.p.id, amount: x.amount })) };
  const what = kind === 'earnings' ? 'income it kept' : 'money you put in that it didn\'t spend';
  for (const x of plan) x.p.history.push({ at: state.now, text: `${money(x.amount)} of the ${what} was put into ${p.title}.` });
}

/**
 * Backers' modeled read of the script, 20 to 90: open readiness notes on it lower it (scriptIssues: structure, causality...).
 * Advisory prompts (a text field left empty, a fit suggestion) aren't faults and don't count (projects.ts Issue).
 */
export function scriptScore(p: Project): number {
  return Math.max(20, 90 - scriptIssues(p).filter((i) => i.severity !== 'blocking' && !i.advisory).length * 8);
}
const usedStarting = (state: GameState) => state.projects.some((x) => deals(x).some((d) => d.kind === 'starting' && d.status !== 'declined' && d.status !== 'refused'));
const scriptApproved = (p: Project) => p.approvedDraft !== null && p.approvedDraft !== undefined;
export const scriptApprovedFor = scriptApproved;

/**
 * The documents each backer's submission includes, besides the approved script: the backer reads them, and SLATE never
 * judges them. Asking for a synopsis, a treatment and a statement of intent is what screen funds and commissioners do; which
 * backer asks for which is a simulation assumption. Until the review of November 7, 2026 a missing treatment made every
 * backer answer a week later instead; it now simply has to be written before the application that includes it is sent.
 */
export const BACKER_DOCUMENTS: Record<BackerKind, DocumentId[]> = {
  starting: [], earnings: [], capital: [], savings: [], investor: ['pitch'], 'co-producer': ['pitch'], commissioner: ['pitch', 'treatment'], grant: ['pitch', 'treatment', 'statement'],
};
const SUBMISSION: Record<BackerKind, string> = {
  starting: 'The starting backing', earnings: 'Your earnings', capital: 'Your unspent money', savings: 'Your own money', investor: 'An approach to an investor', 'co-producer': 'An approach to a co-production partner',
  commissioner: 'A pitch to a commissioner', grant: 'A grant application',
};

/** What a backer's submission includes, in words, for the approach button and its record. */
export function backerDocuments(kind: BackerKind): string {
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
export function backerOptions(state: GameState, p: Project, throughAgent = false): { kind: BackerKind; ready: boolean; needs: string }[] {
  // One approach per backer per project: a backer who said no, or was turned down, isn't asked again for it.
  const has = (k: FinanceDealKind) => deals(p).some((d) => d.kind === k);
  const { promised, stillToRaise } = financeSummary(p);
  const out: { kind: BackerKind; ready: boolean; needs: string }[] = [];
  const closed = p.delivered ? 'This project is delivered.' : stillToRaise <= 0 ? 'Your target is fully promised.' : '';
  const why = (k: FinanceDealKind, extra: string | null) => closed || (has(k) ? 'Already approached for this project.' : extra ?? '');
  if (!usedStarting(state) || has('starting')) {
    out.push({ kind: 'starting', ready: false, needs: why('starting', state.projects.some((x) => x.id !== p.id && x.delivered) ? 'Only for your first project.' : !scriptApproved(p) ? 'Approve a script first.' : null) });
  }
  // The documents a submission includes must be written before it is sent (BACKER_DOCUMENTS).
  const docs = (k: BackerKind) => documentsNeeded(p, BACKER_DOCUMENTS[k], isNonfiction(p.axes.format), SUBMISSION[k]);
  // Your own money from delivered projects (moneyKept). It can be put in more than once, as more of it comes in.
  const own = ownMoney(state, p.id);
  out.push({ kind: 'earnings', ready: false, needs: closed || (!own.earnings.length ? 'Your delivered projects haven\'t kept any income yet: what they earn counts once their backers are repaid and paid their shares.' : !scriptApproved(p) ? 'Approve a script first.' : '') });
  if (own.everPutIn) out.push({ kind: 'capital', ready: false, needs: closed || (!own.capital.length ? 'None of the money you put into your delivered projects is left unspent.' : !scriptApproved(p) ? 'Approve a script first.' : '') });
  out.push({ kind: 'grant', ready: false, needs: why('grant', !scriptApproved(p) ? 'Approve a script first.' : fundClosedTo(state, p) ?? docs('grant')) });
  out.push({ kind: 'investor', ready: false, needs: why('investor', !scriptApproved(p) ? 'Approve a script first.' : docs('investor')) });
  out.push({ kind: 'co-producer', ready: false, needs: why('co-producer', promised <= 0 ? 'Get some funding promised first; they only match other backers.' : docs('co-producer')) });
  // A commissioner who didn't renew the series won't fund its next season (continuation.ts).
  const notRenewed = p.continues && state.projects.find((x) => x.id === p.continues!.from)?.renewal?.outcome === 'cancelled' ? "The commissioner didn't renew the series." : null;
  out.push({ kind: 'commissioner', ready: false, needs: why('commissioner', delivered(state) === 0 && !throughAgent ? 'Deliver a project first.' : notRenewed ?? (commissionerHold(state, p) || (!scriptApproved(p) ? 'Approve a script first.' : docs('commissioner')))) });
  for (const o of out) o.ready = o.needs === '';
  return out;
}

/** Ask a backer to fund this project. Most take some days to decide; the starting backing is already agreed. */
export function approachBacker(state: GameState, p: Project, kind: BackerKind, via?: FinanceDeal['via']): FinanceDeal {
  const opt = backerOptions(state, p, !!via).find((o) => o.kind === kind);
  if (!opt) throw new Error('That backer is not available for this project.');
  if (!opt.ready) throw new Error(opt.needs);
  p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] };
  // Asking again for your own money replaces an offer of it still unanswered, so two offers never count the same money.
  if (OWN_MONEY.has(kind)) for (const d of p.finance.deals) if (d.kind === kind && d.status === 'offered') d.status = 'withdrawn';
  const b = BACKERS[kind];
  const days = b.decideDays;
  const sent = BACKER_DOCUMENTS[kind].map((d) => DOCUMENTS[d].name);
  // A copy of each document as it stands now: what the backer reads is what was sent, whatever is edited later.
  const nf = isNonfiction(p.axes.format);
  const documents = BACKER_DOCUMENTS[kind].map((d) => ({ name: DOCUMENTS[d].name, fields: DOCUMENTS[d].fields(nf).map(([k, label]) => ({ label, text: String(p.story[k] ?? '') })) }));
  const deal: FinanceDeal = {
    id: newId(state, 'fd'), kind, backer: b.name, amount: 0, status: 'considering', askedAt: state.now, decideAt: state.now + days * DAY,
    reason: '', received: 0, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: OWN_MONEY.has(kind) ? 'yours' : 'stays' },
    ...(sent.length ? { sent, sentCopy: { draft: p.approvedDraft, documents } } : {}),
    ...(via ? { via } : {}),
  };
  p.finance.deals.push(deal);
  if (b.decideDays === 0) decide(state, p, deal);
  else {
    schedule(state, deal.decideAt!, 'finance-decision', { projectId: p.id, dealId: deal.id }, { attention: 'notify', priority: 40 });
    addLog(state, `${via ? `${via.name} submitted ${p.title} to the ${b.name.toLowerCase()}` : `You asked the ${b.name.toLowerCase()} to back ${p.title}`}${sent.length ? `, sending the approved script and your ${sent.join(', ').toLowerCase()}` : ''}. They will answer in about ${days} days.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  }
  return deal;
}

/** The backer's answer: an offer with exact terms, or a refusal with the reason. Deterministic for a world seed. */
function decide(state: GameState, p: Project, deal: FinanceDeal): void {
  const { stillToRaise, promised, target } = financeSummary(p);
  const roll = stream(state.seed, 'finance', p.id, deal.id)();
  const proven = delivered(state);
  const record = trackRecord(state);
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
      const chance = 0.1 + script / 300 + Math.min(0.2, proven * 0.1) + record.bonus; // competitive: at best about 4 in 10 for new work
      if (roll < chance) {
        offer = Math.min(stillToRaise, GRANT_CAP);
        t.credit = 'Supported By';
        t.deliverBy = state.now + GRANT_DELIVERY_DAYS * DAY;
        deal.reason = withNote(notes ? `The panel backed the script despite ${notes === 1 ? 'one open note' : `${notes} open notes`} on it.` : 'The panel backed the script; it had no open notes.', record.bonus > 0 ? record.note : '');
      } else refusal = withNote(`The fund's panel chose other projects this round${notes ? ` (the script had ${notes === 1 ? 'one open note' : `${notes} open notes`})` : ''}.`, record.bonus < 0 ? record.note : '');
      break;
    }
    case 'investor': {
      const cap = proven ? INVESTOR_CAP_PROVEN : INVESTOR_CAP_FIRST;
      const chance = 0.45 + script / 300 + Math.min(0.25, proven * 0.1) + record.bonus;
      if (roll < chance) {
        offer = Math.min(stillToRaise, cap);
        t.recoup = Math.round(offer * 1.2);
        t.incomeShare = 0.3;
        t.credit = 'Executive Producer';
        deal.reason = proven ? withNote('Your delivered work convinced them.', record.bonus > 0 ? record.note : '') : `A modest first stake: they invest up to ${money(cap)} before you have delivered a project.`;
      } else refusal = proven ? withNote('They passed on this one.', record.bonus < 0 ? record.note : '') : 'They want to see a finished project from you first.';
      break;
    }
    case 'earnings':
    case 'capital': {
      const from = ownMoney(state, p.id)[deal.kind];
      offer = Math.min(stillToRaise, from.reduce((s, x) => s + x.amount, 0));
      deal.reason = `${deal.kind === 'earnings' ? 'Income kept by' : 'Money you put in and left unspent in'} ${titles(from)}. Nobody is repaid from it and nobody takes a share.`;
      if (offer <= 0) refusal = deal.kind === 'earnings' ? 'Your delivered projects haven\'t kept any income.' : 'None of the money you put in is left unspent.';
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
    case 'studio': {
      // A followed studio's answer has no chance in it: the read made when the pitch was sent, by today's facts.
      const opt = studioOption(state, p, deal.studio!.company);
      const read = opt?.read;
      if (!opt || !read) { refusal = 'It is no longer one of the studios your story follows.'; break; }
      deal.studio = { ...deal.studio!, verdict: read.verdict, for: read.for, against: read.against, next: read.next, year: opt.year };
      if (read.verdict === 'offer' || read.verdict === 'option') {
        const full = read.verdict === 'offer';
        offer = full ? stillToRaise : Math.min(stillToRaise, Math.max(STUDIO_OPTION_FLOOR, Math.round((target * STUDIO_OPTION_SHARE) / 1000) * 1000));
        t.recoup = offer;
        t.incomeShare = full ? 0.6 : 0.25;
        t.approvalRights = full ? ['Casting Approval', 'Picture Approval'] : ['Picture Approval'];
        t.credit = full ? 'Presented By' : 'In Association With';
        t.deliverBy = state.now + STUDIO_DELIVERY_DAYS * DAY;
        deal.studio.territories = reachTerritories(opt.strategy, getPlace(p.axes.basePlaceId).country);
        deal.studio.window = opt.strategy.window;
        deal.reason = `${full ? 'It will finance the film.' : 'An option: development money and a release, not the whole budget.'} ${read.for.join(' ')}${read.next ? ` ${read.next}` : ''}`;
      } else refusal = `${read.verdict === 'notes' ? 'Not yet.' : 'It passed.'} ${read.against.join(' ')} ${read.next}`.trim();
      break;
    }
    case 'commissioner':
      if (deal.firstLook) {
        // A series submitted under a television first look: the deal's company decides by its read of it, as a studio
        // reads a film (strategy.ts pitchRead), with no chance in it. The deal covers series, so a series isn't ruled out
        // for not being a film; what it makes, the script and the record still count, and so does its slate.
        const fl = (state.firstLooks ?? []).find((x) => x.id === deal.firstLook);
        const read = fl ? studioOption(state, p, fl.company)?.read : undefined;
        if (!fl || !read) { refusal = 'It is no longer one of the companies your story follows.'; break; }
        if (read.verdict === 'offer' || read.verdict === 'option') {
          offer = stillToRaise;
          t.onDelivery = Math.round(offer * 0.2);
          t.incomeShare = 0.85;
          t.approvalRights = ['Casting Approval', 'Picture Approval'];
          t.credit = 'Commissioned By';
          deal.reason = `It commissions the series under your first-look deal. ${read.for.join(' ')}`.trim();
        } else refusal = `${read.verdict === 'notes' ? 'Not this one.' : 'It passed.'} ${read.against.join(' ')} You may take it to a commissioner.`.trim();
        break;
      }
      if (roll < 0.35 + Math.min(0.4, proven * 0.15) + record.bonus) {
        offer = stillToRaise;
        t.onDelivery = Math.round(offer * 0.2);
        t.incomeShare = 0.85;
        t.approvalRights = ['Casting Approval', 'Picture Approval'];
        t.credit = 'Commissioned By';
        deal.reason = withNote('Your delivered work earned a commission.', record.bonus > 0 ? record.note : '');
      } else refusal = withNote('They have no slot for this project.', record.bonus < 0 ? record.note : '');
      break;
  }
  void target;
  if (offer <= 0) {
    deal.status = 'declined';
    deal.reason = refusal || 'Nothing is left to raise.';
    addLog(state, `${theBacker(deal, true)} won't back ${p.title}. ${deal.reason}`, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
    return;
  }
  deal.amount = offer;
  deal.status = 'offered';
  // The agreed starting backing stays open; any other offer lapses if it isn't answered (negotiation.ts).
  if (deal.kind !== 'starting' && !OWN_MONEY.has(deal.kind)) openOffer(state, p, deal); // your own money doesn't lapse
  addLog(state, `${theBacker(deal, true)} offered ${money(offer)} for ${p.title}.${deal.expiresAt ? ` It is open for ${OFFER_OPEN_DAYS} days.` : ''} Read the terms before you accept.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

registerHandler('finance-decision', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const deal = p && deals(p).find((d) => d.id === ev.payload.dealId);
  if (!p || !deal || deal.status !== 'considering') return { suppressInterrupt: true };
  decide(state, p, deal);
  return { message: (deal.status as FinanceDeal['status']) === 'offered' ? `${theBacker(deal, true)} made an offer for ${p.title}.` : `${theBacker(deal, true)} won't back ${p.title}.` };
});

// ---------------- A followed studio as a backer (strategy.ts; the Creative Depth package, milestone F) ----------------

/** What a first film's option pays: a share of the target, with a floor. Game calibration. */
export const STUDIO_OPTION_SHARE = 0.15;
export const STUDIO_OPTION_FLOOR = 10_000;
/** How long a studio takes to answer, and how long it gives to deliver. */
export const STUDIO_DECIDE_DAYS = 14;
export const STUDIO_DELIVERY_DAYS = 720;
/** What a pitch to a studio includes, besides the approved script. */
export const STUDIO_DOCUMENTS: DocumentId[] = ['pitch', 'treatment'];

export interface StudioOption { company: string; name: string; strategy: StudioStrategy; year: number; read: PitchRead; needs: string }

/** The year a film pitched now would come out: next year, by the base's calendar. */
const pitchYear = (state: GameState, p: Project) => Number(dateKey(state.now, getPlace(p.axes.basePlaceId).zone).slice(0, 4)) + 1;

/** A project's genre families, primary first, as strategy.ts names them. */
export function projectFamilies(p: Project): string[] {
  const picks = [...p.axes.genres].sort((a, b) => (a.emphasis === 'primary' ? 0 : 1) - (b.emphasis === 'primary' ? 0 : 1));
  const out: string[] = [];
  for (const g of picks) { let parent = ''; try { parent = genre(g.id).parent; } catch { parent = ''; } const k = familyKey(parent); if (k && !out.includes(k)) out.push(k); }
  if (isNonfiction(p.axes.format) && !out.includes('documentary')) out.unshift('documentary');
  if (p.axes.medium === 'animation' && !out.includes('animation')) out.push('animation');
  return out;
}

/**
 * One followed studio's read of this project today, and why it can't be pitched to if it can't. The read is shown
 * before the pitch is sent: it is the studio's strategy against the project, with nothing hidden and no chance in it.
 */
export function studioOption(state: GameState, p: Project, company: string): StudioOption | null {
  const ind = state.industry;
  const profile = ind?.studios?.find((x) => x.c === company);
  if (!ind || !profile) return null;
  const strategy = strategyOf(profile);
  const year = pitchYear(state, p);
  const mine = (d: FinanceDeal) => d.kind === 'studio' && d.studio?.company === company;
  const held = state.projects.filter((x) => x.id !== p.id && deals(x).some((d) => mine(d) && d.status === 'accepted' && d.studio!.year === year)).length;
  const theirs = state.projects.flatMap((x) => deals(x).filter(mine).map((d) => ({ x, d })));
  const record = trackRecord(state);
  const animated = p.axes.medium === 'animation';
  const better = (ind.studios ?? []).filter((x) => x.c !== company && x.name).map(strategyOf).sort((a, b) => (animated ? b.animation - a.animation : a.animation - b.animation))[0];
  const read = pitchRead(strategy, {
    title: p.title, format: p.axes.format, formatLabel: FORMAT_LABELS[p.axes.format], medium: p.axes.medium, families: projectFamilies(p), script: scriptScore(p),
    works: record.works, reception: record.reception, wins: record.wins,
    deliveredForThem: theirs.filter(({ x, d }) => d.status === 'accepted' && x.delivered).length, brokenWithThem: theirs.filter(({ d }) => d.status === 'breached').length,
    year, room: slateRoom(state.seed, ind.horizon, profile, year, held),
    ...(better && (animated ? better.animation >= 0.15 : better.animation < ANIMATION_HOUSE) ? { betterFit: better.name } : {}),
    ...(bindingFor(state, p)?.status === 'active' && bindingFor(state, p)!.company === company ? { firstLook: true } : {}),
  });
  const { stillToRaise } = financeSummary(p);
  const before = deals(p).filter(mine);
  const last = before[before.length - 1];
  const needs = p.delivered ? 'This project is delivered.' : stillToRaise <= 0 ? 'Your target is fully promised.'
    : !scriptApproved(p) ? 'Approve a script first.'
    : last && (last.status === 'considering' || last.status === 'offered') ? 'It has this project in front of it now.'
    : last && last.status === 'accepted' ? 'It already backs this project.'
    : last && last.status === 'refused' ? 'You turned its offer down.'
    : last && last.sentCopy?.draft === p.approvedDraft ? 'It has read this draft. It reads a project again only with a newer approved draft.'
    : last && last.studio?.verdict === 'pass' ? 'It passed on this project.'
    : firstLookHold(state, p, company) || (documentsNeeded(p, STUDIO_DOCUMENTS, isNonfiction(p.axes.format), 'A pitch to a studio') ?? '');
  return { company, name: strategy.name, strategy, year, read, needs };
}

/** Every studio this save's world follows by name, each with its read of the project. */
export function studioOptions(state: GameState, p: Project): StudioOption[] {
  return (state.industry?.studios ?? []).filter((x) => x.name).map((x) => studioOption(state, p, x.c)!).sort((a, b) => b.read.score - a.read.score || a.name.localeCompare(b.name));
}

/** Send the pitch. The studio answers in two weeks, by the facts as they are then. */
/**
 * Submit a series to the company of a television first-look deal (first-look.ts). It is a commission, as a commissioner's
 * is (the company owns the series and renews it or not, continuation.ts), answered in the deal's days by its read.
 */
export function submitSeries(state: GameState, p: Project): FinanceDeal {
  const fl = bindingFor(state, p);
  if (!fl || fl.status !== 'active' || scopeOf(fl.terms) !== 'television') throw new Error('No television first-look deal covers this project.');
  if (commissionerHold(state, p) !== `Your first-look deal gives ${fl.name} the first chance at ${p.title}: submit it to them first.`) throw new Error(commissionerHold(state, p) || `${fl.name} has already answered for ${p.title}.`);
  if (p.delivered) throw new Error('This project is delivered.');
  if (!scriptApproved(p)) throw new Error('Approve a script first.');
  const missing = documentsNeeded(p, BACKER_DOCUMENTS.commissioner, isNonfiction(p.axes.format), SUBMISSION.commissioner);
  if (missing) throw new Error(missing);
  p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] };
  const nf = isNonfiction(p.axes.format);
  const sent = BACKER_DOCUMENTS.commissioner.map((d) => DOCUMENTS[d].name);
  const documents = BACKER_DOCUMENTS.commissioner.map((d) => ({ name: DOCUMENTS[d].name, fields: DOCUMENTS[d].fields(nf).map(([k, label]) => ({ label, text: String(p.story[k] ?? '') })) }));
  const deal: FinanceDeal = {
    id: newId(state, 'fd'), kind: 'commissioner', backer: fl.name, amount: 0, status: 'considering', askedAt: state.now, decideAt: state.now + fl.terms.considerDays * DAY,
    reason: '', received: 0, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: 'stays' },
    sent, sentCopy: { draft: p.approvedDraft, documents }, firstLook: fl.id,
  };
  p.finance.deals.push(deal);
  noteSubmission(state, p, deal);
  schedule(state, deal.decideAt!, 'finance-decision', { projectId: p.id, dealId: deal.id }, { attention: 'notify', priority: 40 });
  addLog(state, `You submitted ${p.title} to ${fl.name} under your first-look deal, sending the approved script and your ${sent.join(', ').toLowerCase()}. It answers by ${new Date(deal.decideAt!).toISOString().slice(0, 10)}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return deal;
}

export function pitchToStudio(state: GameState, p: Project, company: string): FinanceDeal {
  const opt = studioOption(state, p, company);
  if (!opt) throw new Error('That studio isn\'t one your story follows.');
  if (opt.needs) throw new Error(opt.needs);
  const nf = isNonfiction(p.axes.format);
  const documents = STUDIO_DOCUMENTS.map((d) => ({ name: DOCUMENTS[d].name, fields: DOCUMENTS[d].fields(nf).map(([k, label]) => ({ label, text: String(p.story[k] ?? '') })) }));
  const deal: FinanceDeal = {
    id: newId(state, 'fd'), kind: 'studio', backer: opt.name, amount: 0, status: 'considering', askedAt: state.now, decideAt: state.now + (considerDaysFor(state, p, company) ?? STUDIO_DECIDE_DAYS) * DAY,
    reason: '', received: 0, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null, unspent: 'stays' },
    sent: STUDIO_DOCUMENTS.map((d) => DOCUMENTS[d].name), sentCopy: { draft: p.approvedDraft, documents },
    studio: { company, v: opt.strategy.v, verdict: opt.read.verdict, for: [], against: [], next: '', year: opt.year, territories: [], window: null },
  };
  (p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] }).deals.push(deal);
  noteSubmission(state, p, deal);
  schedule(state, deal.decideAt!, 'finance-decision', { projectId: p.id, dealId: deal.id }, { attention: 'notify', priority: 40 });
  addLog(state, `You pitched ${p.title} to ${opt.name}, sending the approved script and your ${deal.sent!.join(' and ').toLowerCase()}. It will answer in about ${Math.round((deal.decideAt! - state.now) / DAY)} days.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return deal;
}

/** Where and when a studio that backs the film releases it, as a term of its offer. */
export function studioReleaseWords(d: FinanceDeal): string {
  const s = d.studio!;
  const n = s.territories.length;
  return `They release it in cinemas in ${n === 1 ? 'your home country' : `your home country and ${n - 1} other ${n === 2 ? 'territory' : 'territories'}`}${s.window !== null ? `, opening in ${MONTHS[s.window]}` : ''}, each territory on its own date, and hold those rights for a year. They pay for the delivery materials and the subtitles.`;
}

/** Every term of an offer, in the words shown before accepting. */
export function dealTerms(d: FinanceDeal): string[] {
  const t = d.terms;
  const out: string[] = [];
  const now = d.amount - t.onDelivery;
  out.push(t.onDelivery ? `${money(now)} when you sign, and ${money(t.onDelivery)} when you deliver the project.` : `${money(d.amount)} when you sign.`);
  if (t.recoup) out.push(`They are repaid ${money(t.recoup)} from the project's income before the project keeps any.`);
  if (t.incomeShare) out.push(`${t.recoup ? 'After that, they' : 'They'} take ${Math.round(t.incomeShare * 100)}% of the project's income${d.kind === 'commissioner' ? ' (they own the project)' : ''}.`);
  if (d.studio?.territories.length) out.push(studioReleaseWords(d));
  for (const r of t.approvalRights) out.push(r === 'Casting Approval' ? 'They approve who plays the leads, which adds a couple of days to lead casting offers.' : 'They approve the final cut before you can lock picture.');
  if (t.deliverBy) out.push(`Deliver by ${new Date(t.deliverBy).toISOString().slice(0, 10)}, or ${d.kind === 'studio' ? 'what they paid in' : 'the grant'} must be repaid.`);
  if (t.credit) out.push(`They are credited: "${t.credit} ${d.backer}".`);
  if (t.unspent === 'yours') out.push('What the project doesn\'t spend of it is yours again once the project is delivered.');
  else if (t.unspent === 'stays') out.push('What the project doesn\'t spend of it stays with the project.');
  else if (OWN_MONEY.has(d.kind)) out.push('Put in under the earlier rule, which didn\'t record whose money it was: what the project doesn\'t spend of it stays with the project.');
  return out;
}

/** Accept an offer: its signing money arrives now and its terms apply from now on. */
export function acceptDeal(state: GameState, p: Project, dealId: string): void {
  const d = deals(p).find((x) => x.id === dealId);
  if (!d || d.status !== 'offered' || (d.expiresAt !== undefined && state.now >= d.expiresAt)) throw new Error('That offer is no longer open.');
  if (d.counter && !d.counter.outcome) throw new Error('They are considering the better terms you asked for. Wait for their answer.');
  if (p.delivered && d.terms.onDelivery) throw new Error('This project is already delivered.');
  const rival = d.kind === 'studio' && deals(p).find((x) => x.kind === 'studio' && x.id !== d.id && (x.status === 'accepted' || x.status === 'breached'));
  if (rival) throw new Error(`${rival.backer} already backs it as its studio, with its own release. One studio releases a film.`);
  if (OWN_MONEY.has(d.kind)) moveOwnMoney(state, p, d);
  d.status = 'accepted';
  const now = d.amount - d.terms.onDelivery;
  d.received = now;
  p.funding.fund += now;
  if (d.terms.deliverBy) schedule(state, d.terms.deliverBy, 'finance-deadline', { projectId: p.id, dealId: d.id }, { attention: 'interrupt', priority: 35 });
  p.history.push({ at: state.now, text: `${d.backer} backs the project with ${money(d.amount)}.` });
  repayTurnaround(state, p, d);
  addLog(state, `You accepted ${money(d.amount)} from ${theBacker(d)} for ${p.title}. ${money(now)} is now in the budget.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  payCommission(state, p, d, now);
}

/**
 * An agent's commission on a payment from a deal they submitted (representation.ts): their rate of what just arrived,
 * taken then, as a line of its own on this project's ledger. It is owed whatever else the project has committed, so it
 * is posted as paid rather than asked of what is uncommitted, as a backer's repayment is.
 */
function payCommission(state: GameState, p: Project, d: FinanceDeal, received: number): void {
  if (!d.via || received <= 0) return;
  const fee = Math.round(received * d.via.rate);
  if (fee <= 0) return;
  p.obligations.push({
    id: newId(state, 'o'), label: `${d.via.name}'s Commission: ${Math.round(d.via.rate * 1000) / 10}% Of ${money(received)} From The ${d.backer}`, category: 'finance', amount: fee, state: 'settled', settled: fee,
    ref: `commission:${d.via.agentId}:${d.id}`, postings: [{ at: state.now, kind: 'settle', amount: fee, key: `commission:${d.id}:${d.received}` }],
  });
  addLog(state, `${d.via.name} took ${money(fee)} commission on the ${money(received)} ${theBacker(d)} paid into ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

/** Turn an offer down. A backer who was turned down isn't asked again for this project. */
export function refuseDeal(state: GameState, p: Project, dealId: string): void {
  const d = deals(p).find((x) => x.id === dealId);
  if (!d || d.status !== 'offered') throw new Error('That offer is no longer open.');
  d.status = 'refused';
  addLog(state, `You turned down ${theBacker(d)}'s offer for ${p.title}.`, 'money', { projectId: p.id });
}

/** Approval rights the project's backers hold. */
export function financeRights(p: Project): string[] {
  return accepted(p).flatMap((d) => d.terms.approvalRights);
}

/** Credits the backers are owed (shown with the project's credits). */
export function financeCredits(p: Project): { label: string; backer: string }[] {
  return accepted(p).filter((d) => d.terms.credit).map((d) => ({ label: d.terms.credit!, backer: d.backer }));
}

/** On delivery: money owed on delivery arrives, and a studio that backed the film sets its release (finish.ts 'studio-release'). */
export function onProjectDelivered(state: GameState, p: Project): void {
  for (const d of accepted(p)) {
    if (d.kind === 'studio' && d.studio?.territories.length && !d.studio.releaseId) schedule(state, state.now, 'studio-release', { projectId: p.id, dealId: d.id }, { attention: 'notify', priority: 31 });
    const due = d.amount - d.received;
    if (due > 0) {
      d.received += due;
      p.funding.fund += due;
      payCommission(state, p, d, due);
      addLog(state, `${theBacker(d, true)} paid ${money(due)} on delivery of ${p.title}.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
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
  // The rights holder of a work this project adapts takes their share first, of everything that arrives, once the rights
  // are bought (adaptation.ts; from November 12, 2026). Each payment is a statement on the agreement.
  const rights = p.source?.option;
  if (rights?.exercisedAt !== undefined && rights.terms.participation && left > 0) {
    const share = Math.round(left * rights.terms.participation);
    if (share > 0) {
      (rights.statements ??= []).push({ at: state.now, from, income: left, share });
      left -= share;
      notes.push(`${money(share)} to the rights holder of ${p.source!.ref!.title} (their share)`);
    }
  }
  for (const d of accepted(p)) {
    const owed = d.terms.recoup - d.repaid;
    if (owed > 0 && left > 0) {
      const pay = Math.min(owed, left);
      d.repaid += pay;
      left -= pay;
      notes.push(`${money(pay)} repaid to ${theBacker(d)}`);
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
      notes.push(`${money(pay)} to ${theBacker(d)} (their share)`);
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
  const text = `${p.title} wasn't delivered by ${theBacker(d)}'s deadline, so ${d.kind === 'studio' ? `the ${money(d.received)} it paid in` : `its ${money(d.received)} grant`} must be repaid.`;
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
