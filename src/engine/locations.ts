// Choosing among scouted locations, keeping a backup, and losing one (SLATE-11-02.02, November 8, 2026). Until now each
// place in the script was simply "the location", at the budget size's one day fee, and could never fall through. Now,
// once scouting is done, each place offers three sites the location manager found: the real place, a stage set built to
// match, and a cheaper stand-in. They differ in day fee and in how likely the owner is to pull out. You choose one, and
// can keep another as the backup. On a shoot day the chosen site can fall through (decided from the world seed, by its
// risk): with a backup the day goes ahead there, at the backup's fee; without one the day is lost, its scenes move to a
// later day, and that place needs a new choice. Nothing chosen means the real place, as before, at the old fee and with
// no risk, so saves and projects from before this play exactly as they did. Fees and risks are game calibration.
import { stream } from './rng';
import type { Project } from './types';

export interface SiteOption { id: 'real' | 'stage' | 'standin'; name: string; factor: number; risk: number; note: string }

export const SITES: SiteOption[] = [
  { id: 'real', name: 'The Real Place', factor: 1, risk: 0.05, note: 'As written; the owner may change their mind.' },
  { id: 'stage', name: 'A Stage Set Built To Match', factor: 1.6, risk: 0, note: 'Costs more each day and never falls through.' },
  { id: 'standin', name: 'A Cheaper Stand-In', factor: 0.6, risk: 0.15, note: 'Costs less; arrangements like this fall through more often.' },
];

export const site = (id: string | undefined): SiteOption | undefined => SITES.find((x) => x.id === id);

/** The places in the script that need a site, once scouting has found the options. */
export function scoutedPlaces(p: Project): string[] {
  if (p.tasks.find((t) => t.kind === 'prep:locations')?.status !== 'done') return [];
  return [...new Set(p.schedule.days.filter((d) => d.status === 'scheduled').map((d) => d.locationLabel))].sort();
}

/** The fee multiple for a day at this place: the chosen site's, or the real place's when nothing was chosen. */
export function siteFactor(p: Project, place: string): number {
  return site(p.locationChoices?.[place]?.main)?.factor ?? 1;
}

export function chooseSite(p: Project, place: string, which: 'main' | 'backup', id: SiteOption['id'] | null): void {
  if (!scoutedPlaces(p).includes(place)) throw new Error('Scouting hasn\'t found sites for that place yet.');
  const rec = ((p.locationChoices ??= {})[place] ??= {});
  if (id && rec.lost?.includes(id)) throw new Error('That site fell through and is no longer available.');
  if (id && (which === 'main' ? rec.backup : rec.main) === id) throw new Error('The main site and the backup must be different.');
  if (which === 'main' && !id) throw new Error('Choose a site.');
  if (id) rec[which] = id;
  else delete rec[which];
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
    return { lost: false, text: `${main.name} for ${place} fell through this morning. The shoot went to your backup, ${backup.name.toLowerCase()}.` };
  }
  delete rec.main;
  delete rec.backup;
  return { lost: true, text: `${main.name} for ${place} fell through this morning and there was no backup. The day is lost; choose another site.` };
}
