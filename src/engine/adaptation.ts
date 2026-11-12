// Adapting a real work (the v3 package, 02; the first steps of its loop: discover, read, check what is recorded about
// its rights, and declare the script adapted from it). The work comes from the source-material catalog (sources.ts).
//
// What this does not do, and says so on screen: it grants nothing. Choosing a work declares what the screenplay is
// based on. It is not permission to use a real work, and no agreement made in the game is one. An option agreement
// with terms, a term, a territory and an expiry is the next step of the loop and is not built yet (docs/v3/LEDGER.md).
import type { GameState, Project, SourceRef } from './types';
import { rightsLine, rightsStanding, type SourceWork } from './sources';
import { isNonfiction } from './projects';

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
