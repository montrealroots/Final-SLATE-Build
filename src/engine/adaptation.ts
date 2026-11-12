// Adapting a real work (the v3 package, 02; the first steps of its loop: discover, read, check what is recorded about
// its rights, and declare the script adapted from it). The work comes from the source-material catalog (sources.ts).
//
// What this does not do, and says so on screen: it grants nothing. Choosing a work declares what the screenplay is
// based on. It is not permission to use a real work, and no agreement made in the game is one.
//
// The option (from November 12, 2026) is this story's own: an agreement with "the work's rights holder", who is nobody
// real, on terms the game makes up from the project's own size. It is there because a producer does not start filming
// a book on a handshake, and the game's production should not either. It is said to be fiction wherever it is shown.
import type { GameState, Project, SourceOption, SourceRef } from './types';
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
  const ref: SourceRef = { id: w.id, title: w.title, medium: w.medium, year: w.year, creators: w.creators.map((c) => c.name), standing: rightsStanding(w), recorded: rightsLine(w), at: state.now };
  p.source = { kind: 'adapted', work: basedOn(w).slice(0, 120), ref };
}

/** Keep the script adapted, by the player's own words alone: the catalog work is let go. */
export function forgetSourceWork(p: Project): void {
  if (p.source?.ref) p.source = { kind: 'adapted', work: p.source.work ?? '' };
}

/** What a chosen work means for the script, said plainly: one line for each standing. */
export const STANDING_SAYS: Record<SourceRef['standing'], string> = {
  'public-domain-recorded': 'Recorded as public domain somewhere. That is a record about a place, not a clearance for yours.',
  'copyrighted-recorded': 'Recorded as copyrighted. Adapting it for real would need its rights holder; the game can only note that.',
  'not-recorded': 'No copyright status is recorded. Its rights are unknown to the game.',
};

// ---------- the option ----------

/** The rights are needed, in this story, unless the record says public domain somewhere: the game's rule, not the law's. */
export const needsOption = (p: Project): boolean => !!p.source?.ref && p.source.ref.standing !== 'public-domain-recorded';

/**
 * The terms this story's rights holder asks, from the project's own size and nothing about the work: a price of 2.5%
 * of the production's starting fund (never under $2,000 or over $2,500,000), a tenth of it for an eighteen-month
 * option, counted towards the price, and as much again for one renewal of twelve months, which is not.
 */
export function optionTerms(p: Project): SourceOption['terms'] {
  const fund = fundingScenario(p.funding.scenarioId).fund;
  const price = Math.min(2_500_000, Math.max(2_000, Math.round((fund * 0.025) / 100) * 100));
  const fee = Math.round(price / 10);
  return { price, fee, renewalFee: fee, months: 18, renewalMonths: 12, territory: 'Worldwide', media: isEpisodic(p.axes.format) ? 'television' : 'film', credit: `Based On ${(p.source?.ref ? `${p.source.ref.title}${p.source.ref.creators.length ? ` By ${p.source.ref.creators.join(' And ')}` : ''}` : p.source?.work ?? 'The Work').trim()}` };
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
export function takeOption(state: GameState, p: Project): void {
  const st = optionStanding(p, state.now);
  if (st === 'not-needed') throw new Error(p.source?.ref ? 'This work is recorded as public domain somewhere, so the game asks no option of you. That is the game\'s rule, not advice.' : 'Choose the work this script adapts first.');
  if (st === 'held') throw new Error('You already hold an option on this work.');
  if (st === 'exercised') throw new Error('The rights were bought when the option was exercised.');
  if (p.delivered) throw new Error('This project is delivered.');
  const terms = optionTerms(p);
  // A second option after one ran out is a new agreement, paid for again.
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
  if (st === 'not-needed' || st === 'exercised') return null;
  const ref = p.source!.ref!;
  const why = ref.standing === 'copyrighted-recorded' ? 'is recorded as copyrighted' : 'has no rights status recorded';
  const next = st === 'none' ? 'Take an option on it and exercise the option' : st === 'held' ? 'Exercise the option' : 'The option ran out: take a new one and exercise it';
  return `This script is adapted from ${ref.title}, which ${why}. ${next} before planning production (Budget, Adaptation Rights). This is the game's rule for its own story, not advice about the real work.`;
}

/** The chain of title, in this story: each step with its date and what was paid. */
export function chainOfTitle(p: Project, date: (at: number) => string): string[] {
  const ref = p.source?.ref;
  if (!ref) return [];
  const o = p.source!.option;
  const out = [`The work: ${ref.title}${ref.creators.length ? `, by ${ref.creators.join(' and ')}` : ''}. ${ref.recorded}`];
  if (!needsOption(p)) out.push('No option is asked: the record says public domain somewhere. That is the game\'s rule.');
  if (o) {
    out.push(`Option taken ${date(o.takenAt)} for ${money(o.terms.fee)}: ${o.terms.months} months, ${o.terms.territory.toLowerCase()}, ${o.terms.media} only, this project only.`);
    if (o.renewedAt !== undefined) out.push(`Renewed ${date(o.renewedAt)} for ${money(o.terms.renewalFee)}: ${o.terms.renewalMonths} months more.`);
    out.push(o.exercisedAt !== undefined ? `Exercised ${date(o.exercisedAt)}: ${money(o.terms.price - o.terms.fee)} more paid, ${money(o.terms.price)} in all. The credit agreed: ${o.terms.credit}.` : `Runs out ${date(o.expires)} unless renewed or exercised.`);
  }
  return out;
}
