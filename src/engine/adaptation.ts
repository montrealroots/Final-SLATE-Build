// Adapting a real work (the v3 package, 02; the first steps of its loop: discover, read, check what is recorded about
// its rights, and declare the script adapted from it). The work comes from the source-material catalog (sources.ts).
//
// What this does not do, and says so on screen: it grants nothing. Choosing a work declares what the screenplay is
// based on. It is not permission to use a real work, and no agreement made in the game is one.
//
// A copyrighted work is credited, not cleared (the owner, November 13, 2026: "you can just put in credits that it's
// copyrighted"): see "Copyright" below for the option this file asked for until then.
import type { AdaptationApproach, GameState, Project, SourceRef } from './types';
import { rightsLine, rightsStanding, type SourceWork } from './sources';
import { isNonfiction } from './projects';
import { money } from './budget';

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
  p.source = { kind: 'adapted', work: basedOn(w).slice(0, 120), ref, ...(same?.option ? { option: same.option } : {}), ...(same?.approval ? { approval: same.approval } : {}) };
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
  'copyrighted-recorded': 'Recorded as copyrighted. The game credits it as copyrighted; adapting it for real would need its rights holder.',
  'not-recorded': 'No copyright status is recorded. Its rights are unknown to the game.',
};

// ---------- the approach ----------

/**
 * How closely the script follows the work. The proposal reads it (proposal.ts): an updated adaptation is moved to the
 * game's year, a free one writes its own ending. Until November 13, 2026 it was also what an option was priced on and
 * what the rights holder read a draft against; see "Copyright" below.
 */
export const APPROACHES: Record<AdaptationApproach, { label: string; says: string }> = {
  faithful: { label: 'Faithful', says: 'The work\'s story, its people, its time and place and its ending, kept.' },
  updated: { label: 'Moved To Another Time Or Place', says: 'The work\'s story and people and its ending kept; where and when it happens may change.' },
  free: { label: 'Freely Adapted', says: 'Taken from the work; anything in it may change.' },
};
export const APPROACH_ORDER: AdaptationApproach[] = ['faithful', 'updated', 'free'];

// ---------- copyright: credited, not cleared ----------
//
// The owner's decision of November 13, 2026: a copyrighted work is credited, and nothing blocks the production. From
// November 12 to 13 the game asked for an option on any work not recorded as public domain, the rights bought, and the
// rights holder's approval of the draft before production could be planned (adaptationBlocker, takeOption, renewOption,
// exerciseOption, sendForApproval, widenAgreement). Those are gone. An agreement a save made in that time stands as it
// was made: its record is kept (chainOfTitle), and the rights holder's share of income is still paid on it
// (finance.ts receiveIncome). A draft that was out for approval needs no answer now.

/** What the project's credits say about the work it adapts: what it is based on, and its recorded copyright. */
export function creditLine(p: Project): string | null {
  const ref = p.source?.ref;
  if (!ref) return p.source?.kind === 'adapted' && p.source.work?.trim() ? `Based on ${p.source.work.trim()}.` : null;
  const by = ref.creators.length ? `, by ${ref.creators.join(' and ')}` : '';
  const owned = ref.standing === 'copyrighted-recorded' ? ` ${ref.title} is recorded as copyrighted; its rights belong to their holders.`
    : ref.standing === 'public-domain-recorded' ? ` ${ref.title} is recorded as public domain.` : ` No copyright status is recorded for ${ref.title}.`;
  const story = p.proposal?.workId === ref.id ? p.proposal.story : undefined;
  const told = story ? ` Its story outline is from the ${story.section} section of the English Wikipedia article "${story.article}" (${story.licence}).` : '';
  const cast = p.proposal?.workId === ref.id ? p.proposal.cast : undefined;
  const listed = cast ? ` Some of its characters' names are from ${cast.section === 'whole article' ? '' : `the ${cast.section} section of `}the English Wikipedia article "${cast.article}" (${cast.licence}).` : '';
  return `Based on ${ref.title}${by}.${owned}${told}${listed}`;
}

/** What the rights holder has been paid of the project's income, on an agreement made before November 13, 2026. */
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
  if (o) {
    // What was paid is read from the project's ledger, by the key each payment was posted under, never from the terms:
    // a widened agreement's terms are the wider ones, and the fee paid on the day was the narrower.
    out.push(`Option taken ${date(o.takenAt)} for ${money(paidFor(`option:${p.id}:${o.takenAt}`) || o.terms.fee)}: ${o.terms.months} months, ${o.terms.territory.toLowerCase()}, ${o.terms.media} only, this project only.`);
    if (o.terms.approach) out.push(`It is for a ${APPROACHES[o.terms.approach].label.toLowerCase()} adaptation. ${APPROACHES[o.terms.approach].says} The rights holder takes ${Math.round(o.terms.participation! * 1000) / 10}% of what the project earns, as it arrives.`);
    for (const w of o.widened ?? []) out.push(`Widened ${date(w.at)} to ${APPROACHES[w.to].label.toLowerCase()} for ${money(w.paid)}.`);
    if (o.renewedAt !== undefined) out.push(`Renewed ${date(o.renewedAt)} for ${money(o.terms.renewalFee)}: ${o.terms.renewalMonths} months more.`);
    if (o.exercisedAt !== undefined) out.push(`Exercised ${date(o.exercisedAt)}: ${money(paidFor(`option-exercise:${p.id}:${o.takenAt}`) || o.terms.price - o.terms.fee)} more paid, ${money(o.terms.price)} in all. The credit agreed: ${o.terms.credit}.`);
    const a = p.source!.approval;
    if (a) out.push(a.outcome === 'approved' ? `Draft ${a.draft} approved by the rights holder, sent ${date(a.sentAt)}.` : a.outcome === 'refused' ? `Draft ${a.draft} not approved, sent ${date(a.sentAt)}. ${a.reason}` : `Draft ${a.draft} sent to the rights holder ${date(a.sentAt)}. No answer is needed now.`);
    for (const x of o.statements ?? []) out.push(`Statement ${date(x.at)}: ${money(x.share)} to the rights holder, their share of ${money(x.income)} from ${x.from}.`);
  }
  return [...out, ...before];
}
