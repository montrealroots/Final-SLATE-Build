// Adapting a real work (the v3 package, 02; the first steps of its loop: discover, read, check what is recorded about
// its rights, and declare the script adapted from it). The work comes from the source-material catalog (sources.ts).
//
// What this does not do, and says so on screen: it grants nothing. Choosing a work declares what the screenplay is
// based on. It is not permission to use a real work, and no agreement made in the game is one.
//
// The option (from November 12, 2026) is this story's own: an agreement with "the work's rights holder", who is nobody
// real, on terms the game makes up from the project's own size. It is there because a producer does not start filming
// a book on a handshake, and the game's production should not either. It is said to be fiction wherever it is shown.
import type { AdaptationApproach, GameState, Project, SourceChange, SourceOption, SourceRef } from './types';
import { addLog, registerHandler, schedule } from './state';
import { DAY } from './time';
import { rightsLine, rightsStanding, type SourceWork } from './sources';
import { fundingScenario, isEpisodic, isNonfiction } from './projects';
import { money, spend } from './budget';
import { addLocal } from './time';
import { getPlace } from '../data/places';

/** Why a project can't take a source work now, or null. */
export function adaptRefusal(p: Project): string | null {
  if (p.delivered) return 'This project is delivered. What it was adapted from is part of its record now.';
  if (isNonfiction(p.axes.format)) return "A documentary isn't adapted from a work of fiction. Its sources are its contributors, research and evidence.";
  return null;
}

/** The line a screenplay credit would carry. */
export const basedOn = (w: Pick<SourceWork, 'title' | 'creators'>): string => {
  const by = w.creators.filter((c) => c.role !== 'developer').map((c) => c.name);
  const made = w.creators.filter((c) => c.role === 'developer').map((c) => c.name);
  return `${w.title}${by.length ? ` by ${by.join(' and ')}` : made.length ? `, developed by ${made.join(' and ')}` : ''}`;
};

/**
 * Declare the script adapted from a catalog work. Two things change and nothing else: Source Material becomes Adapted,
 * and Adapted From names the work. The record is kept as it stood, with what it said about rights that day.
 */
export function adaptFrom(state: GameState, p: Project, w: SourceWork): void {
  const no = adaptRefusal(p);
  if (no) throw new Error(no);
  // The same work again is recorded afresh, and what was agreed for it stands; another work leaves the first in the record.
  const same = p.source?.ref?.id === w.id ? p.source : undefined;
  if (!same) retireSource(p, state.now);
  const ref: SourceRef = { id: w.id, title: w.title, medium: w.medium, year: w.year, creators: w.creators.map((c) => c.name), standing: rightsStanding(w), recorded: rightsLine(w), at: state.now };
  p.source = { kind: 'adapted', work: basedOn(w).slice(0, 120), ref, ...(same?.option ? { option: same.option } : {}), ...(same?.changes ? { changes: same.changes } : {}), ...(same?.approval ? { approval: same.approval } : {}) };
}

/** Keep the script adapted, by the player's own words alone: the catalog work is let go. */
export function forgetSourceWork(state: GameState, p: Project): void {
  if (!p.source?.ref) return;
  retireSource(p, state.now);
  p.source = { kind: 'adapted', work: p.source.work ?? '' };
}

/**
 * A work the project leaves behind keeps what was agreed for it in the record (the v4 package, 03; ledger V4-021.02):
 * its option, what was paid, and a draft out for approval, whose answer then changes nothing. What was paid stays on the
 * ledger under its own keys. Until November 12, 2026 choosing another work, or letting one go, erased all of it.
 */
function retireSource(p: Project, at: number): void {
  const s = p.source;
  if (s?.ref && (s.option || s.approval)) (p.sourceHistory ??= []).push({ ref: s.ref, ...(s.option ? { option: s.option } : {}), ...(s.approval ? { approval: s.approval } : {}), endedAt: at });
}

/** What a chosen work means for the script, said plainly: one line for each standing. */
export const STANDING_SAYS: Record<SourceRef['standing'], string> = {
  'public-domain-recorded': 'Recorded as public domain somewhere. That is a record about a place, not a clearance for yours.',
  'copyrighted-recorded': 'Recorded as copyrighted. Adapting it for real would need its rights holder; the game can only note that.',
  'not-recorded': 'No copyright status is recorded. Its rights are unknown to the game.',
};

// ---------- the approach, and what the script changes ----------

/**
 * How closely the script follows the work. It is chosen with the option, it is what the rights holder later reads a draft
 * against, and it is priced: a freer adaptation costs more. The multipliers and the share are game calibration.
 */
export const APPROACHES: Record<AdaptationApproach, { label: string; says: string; allows: SourceChange[]; price: number }> = {
  faithful: { label: 'Faithful', says: 'The work\'s story, its people, its time and place and its ending, kept.', allows: [], price: 1 },
  updated: { label: 'Moved To Another Time Or Place', says: 'The work\'s story and people and its ending kept; where and when it happens may change.', allows: ['setting', 'period'], price: 1.15 },
  free: { label: 'Freely Adapted', says: 'Taken from the work; anything in it may change.', allows: ['setting', 'period', 'ending', 'people'], price: 1.4 },
};
export const APPROACH_ORDER: AdaptationApproach[] = ['faithful', 'updated', 'free'];
export const CHANGES: Record<SourceChange, string> = { setting: 'Where It Happens', period: 'When It Happens', ending: 'How It Ends', people: 'Who Is In It' };
export const CHANGE_ORDER: SourceChange[] = ['setting', 'period', 'ending', 'people'];
/** The rights holder's share of what the project earns, taken as income arrives. Game calibration. */
export const PARTICIPATION = 0.025;
/** How long the rights holder takes to read a draft. Game calibration. */
export const APPROVAL_DAYS = 7;

/** What the script is declared to change from the work. The game takes the player's word: it reads no prose. */
export function setSourceChange(p: Project, change: SourceChange, on: boolean): void {
  if (!p.source?.ref) throw new Error('Choose the work this script adapts first.');
  const now = new Set(p.source.changes ?? []);
  if (on) now.add(change); else now.delete(change);
  p.source.changes = CHANGE_ORDER.filter((c) => now.has(c));
}

// ---------- the option ----------

/** The rights are needed, in this story, unless the record says public domain somewhere: the game's rule, not the law's. */
export const needsOption = (p: Project): boolean => !!p.source?.ref && p.source.ref.standing !== 'public-domain-recorded';

/**
 * The terms this story's rights holder asks, from the project's own size and nothing about the work: a price of 2.5%
 * of the production's starting fund (never under $2,000 or over $2,500,000), a tenth of it for an eighteen-month
 * option, counted towards the price, and as much again for one renewal of twelve months, which is not.
 */
export function optionTerms(p: Project, approach: AdaptationApproach = 'faithful'): SourceOption['terms'] {
  const fund = fundingScenario(p.funding.scenarioId).fund;
  const base = Math.min(2_500_000, Math.max(2_000, Math.round((fund * 0.025) / 100) * 100));
  // Latitude is paid for: the more the agreement lets the script change, the more the rights holder asks.
  const price = Math.round((base * APPROACHES[approach].price) / 100) * 100;
  const fee = Math.round(price / 10);
  return { approach, participation: PARTICIPATION, price, fee, renewalFee: fee, months: 18, renewalMonths: 12, territory: 'Worldwide', media: isEpisodic(p.axes.format) ? 'television' : 'film', credit: `Based On ${(p.source?.ref ? `${p.source.ref.title}${p.source.ref.creators.length ? ` By ${p.source.ref.creators.join(' And ')}` : ''}` : p.source?.work ?? 'The Work').trim()}` };
}

export type OptionStanding = 'not-needed' | 'none' | 'held' | 'expired' | 'exercised';
export function optionStanding(p: Project, now: number): OptionStanding {
  if (!needsOption(p)) return 'not-needed';
  const o = p.source!.option;
  if (!o) return 'none';
  if (o.exercisedAt !== undefined) return 'exercised';
  return now < o.expires ? 'held' : 'expired';
}
const zoneOf = (p: Project) => getPlace(p.axes.basePlaceId).zone;

/** Take the option: the fee is paid from the project now, and the clock starts. */
export function takeOption(state: GameState, p: Project, approach: AdaptationApproach = 'faithful'): void {
  const st = optionStanding(p, state.now);
  if (st === 'not-needed') throw new Error(p.source?.ref ? 'This work is recorded as public domain somewhere, so the game asks no option of you. That is the game\'s rule, not advice.' : 'Choose the work this script adapts first.');
  if (st === 'held') throw new Error('You already hold an option on this work.');
  if (st === 'exercised') throw new Error('The rights were bought when the option was exercised.');
  if (p.delivered) throw new Error('This project is delivered.');
  const terms = optionTerms(p, approach);
  // A second option after one ran out is a new agreement, paid for again, and nothing approved under the old one stands.
  delete p.source!.approval;
  spend(state, p, `Option On ${p.source!.ref!.title}`, 'licensing', terms.fee, `option:${p.id}:${state.now}`);
  p.source!.option = { terms, takenAt: state.now, expires: addLocal(state.now, zoneOf(p), { months: terms.months }) };
}

/** Renew once, before it runs out: the renewal fee is paid and the term runs twelve months longer. */
export function renewOption(state: GameState, p: Project): void {
  const o = p.source?.option;
  if (!o || optionStanding(p, state.now) !== 'held') throw new Error('There is no option running to renew.');
  if (o.renewedAt !== undefined) throw new Error('This option has been renewed once, which is all it allows. Exercise it, or let it run out and take a new one.');
  spend(state, p, `Option Renewal: ${p.source!.ref!.title}`, 'licensing', o.terms.renewalFee, `option-renew:${p.id}:${o.takenAt}`);
  o.renewedAt = state.now;
  o.expires = addLocal(o.expires, zoneOf(p), { months: o.terms.renewalMonths });
}

/** Exercise it: the rest of the price is paid, and the rights are the production's, in this story, for this project. */
export function exerciseOption(state: GameState, p: Project): void {
  const o = p.source?.option;
  const st = optionStanding(p, state.now);
  if (!o || st === 'none' || st === 'not-needed') throw new Error('Take an option on the work first.');
  if (st === 'exercised') throw new Error('The option has been exercised already.');
  if (st === 'expired') throw new Error('The option ran out. Take a new one before buying the rights.');
  spend(state, p, `Rights To ${p.source!.ref!.title}`, 'licensing', o.terms.price - o.terms.fee, `option-exercise:${p.id}:${o.takenAt}`);
  o.exercisedAt = state.now;
}

/** Why production can't be planned yet because of the work it adapts, or null. Read by generatePlan. */
export function adaptationBlocker(p: Project, now: number): string | null {
  const st = optionStanding(p, now);
  if (st === 'not-needed') return null;
  if (st === 'exercised') {
    const ap = approvalStanding(p);
    if (ap === 'not-needed' || ap === 'approved') return null;
    const title = p.source!.ref!.title;
    return {
      'not-sent': `The rights holder of ${title} hasn't read this script. Send them the approved draft before planning production (Budget, Adaptation Rights).`,
      sent: `The rights holder of ${title} is reading the draft you sent. Production can be planned once they approve it.`,
      refused: `The rights holder of ${title} didn't approve the draft. ${p.source!.approval?.reason ?? ''} Then send it again (Budget, Adaptation Rights).`,
      stale: `The script has changed since the rights holder of ${title} approved it. Send them the approved draft again before planning production (Budget, Adaptation Rights).`,
    }[ap];
  }
  const ref = p.source!.ref!;
  const why = ref.standing === 'copyrighted-recorded' ? 'is recorded as copyrighted' : 'has no rights status recorded';
  const next = st === 'none' ? 'Take an option on it and exercise the option' : st === 'held' ? 'Exercise the option' : 'The option ran out: take a new one and exercise it';
  return `This script is adapted from ${ref.title}, which ${why}. ${next} before planning production (Budget, Adaptation Rights). This is the game's rule for its own story, not advice about the real work.`;
}

// ---------- the rights holder's approval ----------

export type ApprovalStanding = 'not-needed' | 'not-sent' | 'sent' | 'approved' | 'refused' | 'stale';
/** Where the rights holder's approval of the script stands. An agreement from before approvals existed asks none. */
export function approvalStanding(p: Project): ApprovalStanding {
  const o = p.source?.option;
  if (!needsOption(p) || !o || !o.terms.approach) return 'not-needed';
  const a = p.source!.approval;
  if (!a) return 'not-sent';
  if (!a.outcome) return 'sent';
  if (a.outcome === 'refused') return 'refused';
  // Approved, for that draft as it was declared: a later approved draft, or a change declared since, is not what they read.
  const same = a.draft === p.approvedDraft && a.changes.join() === (p.source!.changes ?? []).join();
  return same ? 'approved' : 'stale';
}

/** The changes the script declares that its agreement doesn't allow. */
export function changesOutsideGrant(p: Project, changes: SourceChange[] = p.source?.changes ?? []): SourceChange[] {
  const approach = p.source?.option?.terms.approach;
  return approach ? changes.filter((c) => !APPROACHES[approach].allows.includes(c)) : [];
}

/** Why a draft can't be sent to the rights holder now, or null. */
export function approvalRefusal(p: Project, now: number): string | null {
  const st = optionStanding(p, now);
  if (approvalStanding(p) === 'not-needed') return 'This agreement asks no approval of the script.';
  if (st !== 'held' && st !== 'exercised') return 'There is no agreement in force to send a draft under.';
  if (p.approvedDraft === null) return 'Approve a draft first: they read the approved script.';
  if (approvalStanding(p) === 'sent') return 'They are reading the draft you sent.';
  if (approvalStanding(p) === 'approved') return 'They have approved this draft.';
  return null;
}

/** Send the approved draft to the rights holder. They answer in APPROVAL_DAYS, from what the script is declared to change. */
export function sendForApproval(state: GameState, p: Project): void {
  const why = approvalRefusal(p, state.now);
  if (why) throw new Error(why);
  p.source!.approval = { draft: p.approvedDraft!, changes: [...(p.source!.changes ?? [])], sentAt: state.now, answerAt: state.now + APPROVAL_DAYS * DAY };
  schedule(state, p.source!.approval.answerAt, 'source-approval', { projectId: p.id, sentAt: state.now }, { attention: 'notify', priority: 45 });
  addLog(state, `You sent draft ${p.approvedDraft} of ${p.title} to the rights holder of ${p.source!.ref!.title}. They answer within ${APPROVAL_DAYS} days.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

const listed = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);

registerHandler('source-approval', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const a = p?.source?.approval;
  if (!p || !a || a.outcome || a.sentAt !== ev.payload.sentAt) return { suppressInterrupt: true };
  const title = p.source!.ref!.title;
  const outside = changesOutsideGrant(p, a.changes);
  let text: string;
  if (outside.length) {
    const approach = p.source!.option!.terms.approach!;
    a.outcome = 'refused';
    a.reason = `Your agreement is for a ${APPROACHES[approach].label.toLowerCase()} adaptation, and the script changes ${listed(outside.map((c) => CHANGES[c].toLowerCase()))}. Keep ${outside.length === 1 ? 'that' : 'those'} as the work has ${outside.length === 1 ? 'it' : 'them'}, or widen the agreement.`;
    text = `The rights holder of ${title} didn't approve draft ${a.draft} of ${p.title}. ${a.reason}`;
  } else {
    a.outcome = 'approved';
    text = `The rights holder of ${title} approved draft ${a.draft} of ${p.title}.`;
  }
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
  return { message: text };
});

/** What widening the agreement to a freer approach costs now: the difference in the option's fee, or in the price once it is exercised. */
export function widenCost(p: Project, approach: AdaptationApproach): number | null {
  const o = p.source?.option;
  if (!o?.terms.approach || APPROACH_ORDER.indexOf(approach) <= APPROACH_ORDER.indexOf(o.terms.approach)) return null;
  const next = optionTerms(p, approach);
  return o.exercisedAt !== undefined ? next.price - o.terms.price : next.fee - o.terms.fee;
}

/** Widen the agreement: the difference is paid now, the terms are the freer ones, and a draft they refused can be sent again. */
export function widenAgreement(state: GameState, p: Project, approach: AdaptationApproach): void {
  const o = p.source?.option;
  const st = optionStanding(p, state.now);
  const cost = widenCost(p, approach);
  if (!o || cost === null) throw new Error('The agreement already allows that much.');
  if (st !== 'held' && st !== 'exercised') throw new Error('There is no agreement in force to widen.');
  spend(state, p, `Wider Agreement On ${p.source!.ref!.title}: ${APPROACHES[approach].label}`, 'licensing', cost, `option-widen:${p.id}:${o.takenAt}:${approach}`);
  const next = optionTerms(p, approach);
  o.terms = { ...o.terms, approach, price: next.price, fee: next.fee, renewalFee: next.renewalFee };
  (o.widened ??= []).push({ at: state.now, to: approach, paid: cost });
}

/** What the rights holder has been paid of the project's income: the statements added up. */
export const participationPaid = (p: Project): number => (p.source?.option?.statements ?? []).reduce((n, x) => n + x.share, 0);

/** The chain of title, in this story: each step with its date and what was paid. */
export function chainOfTitle(p: Project, date: (at: number) => string): string[] {
  const paidFor = (key: string) => p.obligations.filter((x) => x.postings.some((q) => q.key === key)).reduce((n, x) => n + x.settled, 0);
  const before = (p.sourceHistory ?? []).map((h) => {
    const o = h.option;
    const paid = o ? paidFor(`option:${p.id}:${o.takenAt}`) + paidFor(`option-exercise:${p.id}:${o.takenAt}`) + (o.widened ?? []).reduce((n, w) => n + w.paid, 0) : 0;
    const pending = h.approval && !h.approval.outcome ? ` Draft ${h.approval.draft} was with its rights holder; their answer no longer applies.` : '';
    return `Earlier: ${h.ref.title}.${o ? ` Option taken ${date(o.takenAt)}; ${money(paid)} paid, which stays paid.` : ''} Let go ${date(h.endedAt)}: no right to it remains.${pending}`;
  });
  const ref = p.source?.ref;
  if (!ref) return before;
  const o = p.source!.option;
  const out = [`The work: ${ref.title}${ref.creators.length ? `, by ${ref.creators.join(' and ')}` : ''}. ${ref.recorded}`];
  if (!needsOption(p)) out.push('No option is asked: the record says public domain somewhere. That is the game\'s rule.');
  if (o) {
    // What was paid is read from the project's ledger, by the key each payment was posted under, never from the terms:
    // a widened agreement's terms are the wider ones, and the fee paid on the day was the narrower.
    const paid = (key: string) => p.obligations.filter((x) => x.postings.some((q) => q.key === key)).reduce((n, x) => n + x.settled, 0);
    out.push(`Option taken ${date(o.takenAt)} for ${money(paid(`option:${p.id}:${o.takenAt}`) || o.terms.fee)}: ${o.terms.months} months, ${o.terms.territory.toLowerCase()}, ${o.terms.media} only, this project only.`);
    if (o.terms.approach) out.push(`It is for a ${APPROACHES[o.terms.approach].label.toLowerCase()} adaptation. ${APPROACHES[o.terms.approach].says} The rights holder reads the approved draft before production, and takes ${Math.round(o.terms.participation! * 1000) / 10}% of what the project earns, as it arrives.`);
    for (const w of o.widened ?? []) out.push(`Widened ${date(w.at)} to ${APPROACHES[w.to].label.toLowerCase()} for ${money(w.paid)}.`);
    if (o.renewedAt !== undefined) out.push(`Renewed ${date(o.renewedAt)} for ${money(o.terms.renewalFee)}: ${o.terms.renewalMonths} months more.`);
    out.push(o.exercisedAt !== undefined ? `Exercised ${date(o.exercisedAt)}: ${money(paid(`option-exercise:${p.id}:${o.takenAt}`) || o.terms.price - o.terms.fee)} more paid, ${money(o.terms.price)} in all. The credit agreed: ${o.terms.credit}.` : `Runs out ${date(o.expires)} unless renewed or exercised.`);
    const a = p.source!.approval;
    if (a) out.push(a.outcome === 'approved' ? `Draft ${a.draft} approved by the rights holder, sent ${date(a.sentAt)}.` : a.outcome === 'refused' ? `Draft ${a.draft} not approved, sent ${date(a.sentAt)}. ${a.reason}` : `Draft ${a.draft} sent to the rights holder ${date(a.sentAt)}; their answer is due ${date(a.answerAt)}.`);
    for (const x of o.statements ?? []) out.push(`Statement ${date(x.at)}: ${money(x.share)} to the rights holder, their share of ${money(x.income)} from ${x.from}.`);
    if (o.terms.approach) out.push('A sequel or another season is not covered: it needs an agreement of its own.');
  }
  return [...out, ...before];
}
