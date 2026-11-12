// Choosing among scouted locations, keeping a backup, and losing one (SLATE-11-02.02, November 8, 2026). Until now each
// place in the script was simply "the location", at the budget size's one day fee, and could never fall through. Now,
// once scouting is done, each place offers three sites the location manager found: the real place, a stage set built to
// match, and a cheaper stand-in. They differ in day fee and in how likely the owner is to pull out. You choose one, and
// can keep another as the backup. On a shoot day the chosen site can fall through (decided from the world seed, by its
// risk): with a backup the day goes ahead there, at the backup's fee; without one the day is lost, its scenes move to a
// later day, and that place needs a new choice. Nothing chosen means the real place, as before, at the old fee and with
// no risk, so saves and projects from before this play exactly as they did. Fees and risks are game calibration.
import { filmedAt, underCover } from './destinations';
import { stream } from './rng';
import type { Project } from './types';

export interface SiteOption { id: 'real' | 'stage' | 'standin'; name: string; factor: number; risk: number; note: string }

export const SITES: SiteOption[] = [
  { id: 'real', name: 'The Real Place', factor: 1, risk: 0.05, note: 'As written; the owner may change their mind.' },
  { id: 'stage', name: 'A Stage Set Built To Match', factor: 1.6, risk: 0, note: 'Costs more each day, never falls through, and is under a roof: rain and short days do not stop it.' },
  { id: 'standin', name: 'A Cheaper Stand-In', factor: 0.6, risk: 0.15, note: 'Costs less; arrangements like this fall through more often.' },
];

export const site = (id: string | undefined): SiteOption | undefined => SITES.find((x) => x.id === id);

/**
 * What a site is called for this place. Where the place is filmed somewhere the player chose (destinations.ts), the
 * first of the three is the candidate the game made up there, and is never called a real place.
 */
export const siteName = (p: Project, place: string, id: SiteOption['id']): string =>
  id === 'real' && filmedAt(p, place) ? 'The Candidate Site' : site(id)!.name;
export const siteNote = (p: Project, place: string, id: SiteOption['id']): string =>
  id === 'real' && filmedAt(p, place) ? 'The site the game made up there; arrangements can still fall through.' : site(id)!.note;

/**
 * Whether this place is filmed under a roof: on a soundstage (destinations.ts), or on the stage set built to match. An
 * exterior written there isn't stopped by rain or snow, doesn't wait for daylight and gets no rain warning. Until
 * November 11, 2026 a stage set cost more and never fell through, but the weather still stopped it.
 */
export const roofed = (p: Project, place: string): boolean => underCover(p, place) || p.locationChoices?.[place]?.main === 'stage';

/** The places in the script that need a site, once scouting has found the options. */
export function scoutedPlaces(p: Project): string[] {
  if (p.tasks.find((t) => t.kind === 'prep:locations')?.status !== 'done') return [];
  return [...new Set(p.schedule.days.filter((d) => d.status === 'scheduled').map((d) => d.locationLabel))].sort();
}

/** The fee multiple for a day at this place: the chosen site's, or the real place's when nothing was chosen. */
export function siteFactor(p: Project, place: string): number {
  return site(p.locationChoices?.[place]?.main)?.factor ?? 1;
}

/**
 * On a shoot day: whether the chosen site fell through, and what happened. Only a site the producer chose can fall
 * through; with no choice made the day runs as it always did. Deterministic for the world seed, place and date.
 */
export function siteOnTheDay(seed: number, p: Project, place: string, date: string): { lost: boolean; text?: string } {
  const rec = p.locationChoices?.[place];
  if (rec && !rec.main && rec.lost?.length) return { lost: true, text: `No site is chosen for ${place} since the last one fell through, so the day is lost. Choose one on the Schedule page.` };
  const main = site(rec?.main);
  if (!rec || !main || stream(seed, 'location', p.id, place, date)() >= main.risk) return { lost: false };
  (rec.lost ??= []).push(main.id);
  const backup = site(rec.backup);
  if (backup && !rec.lost.includes(backup.id)) {
    rec.main = backup.id;
    delete rec.backup;
    return { lost: false, text: `${siteName(p, place, main.id)} for ${place} fell through this morning. The shoot went to your backup, ${siteName(p, place, backup.id).toLowerCase()}.` };
  }
  delete rec.main;
  delete rec.backup;
  return { lost: true, text: `${siteName(p, place, main.id)} for ${place} fell through this morning and there was no backup. The day is lost; choose another site.` };
}
