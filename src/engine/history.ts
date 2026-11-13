// Recorded history (the owner's v6 package, 01-REALISM-CONTRACT.md and 02-WORLD-AND-HISTORY.md; from November 13, 2026).
// A verified observation is a cited fact for a date, kept apart from what the game simulates and from what the player
// does. Each has the date it happened, the date it was published and the date it was imported, its source, and a
// revision. A save never stores one: what a save shows follows from the data and the save's own clock, so a reload
// can't duplicate one and a later correction can't rewrite what a save already settled.
//
// Reportable only once published. A date without a time becomes reportable when that date has ended where it was
// published: a ceremony in Los Angeles on March 15 is news from midnight going into March 16 there, so no player
// anywhere learns a result before it happened. A player in Los Angeles hears of it a few hours late; that is the price.
import awards2026 from '../data/history/awards-2026.json';
import { addDaysToKey, localToInstant, parseYmd } from './time';

export interface HistorySource { url: string; title: string; provider: string; retrieved: string; section: string; access: string }
export interface Observation {
  id: string;
  kind: 'winner' | 'nominees';
  institution: string;
  year: number;
  edition: string;
  /** The game's category id for it, and the name as the organizer gives it. */
  category: string;
  categoryName: string;
  /** Works or people, as the source writes them. */
  subjects: string[];
  /** For a person's award, the work it was for; for a work's, who received it, as the source writes it. */
  work?: string;
  credited?: string;
  occurred: string;
  published: string;
  precision: 'day';
  source: string;
  /** Where the publication date comes from, when that isn't the main source. */
  publishedSource?: string;
  status: 'verified';
  /** A correction is a later revision of the same id, published on its own date; earlier revisions stay. */
  revision: number;
  imported: string;
}
export interface HistoryDataset {
  dataset: string;
  version: number;
  about: string;
  coverage: { requested: string; observed: string; editions: string[]; notInSet: string };
  sources: Record<string, HistorySource>;
  observations: Observation[];
}

export const DATASETS: HistoryDataset[] = [awards2026 as HistoryDataset];
/** Where each institution announces its results, for the end of a published day. */
const ZONES: Record<string, string> = { oscars: 'America/Los_Angeles', 'golden-globes': 'America/Los_Angeles' };

/** The instant an observation becomes reportable: the end of its published day where it was published. */
export function reportableFrom(o: Observation): number {
  const next = parseYmd(addDaysToKey(o.published, 1));
  return localToInstant(ZONES[o.institution] ?? 'Etc/GMT+12', next.year, next.month, next.day, 0).instant;
}

/** Observations reportable at `now`, each at its latest revision published by then. */
export function observationsAt(now: number, keep: (o: Observation) => boolean = () => true, datasets = DATASETS): Observation[] {
  const latest = new Map<string, Observation>();
  for (const d of datasets) for (const o of d.observations) {
    if (!keep(o) || reportableFrom(o) > now) continue;
    const had = latest.get(o.id);
    if (!had || o.revision > had.revision) latest.set(o.id, o);
  }
  return [...latest.values()];
}

/** Whether any recorded results exist for this institution's edition, published or not (not what they are). */
export const holdsRecords = (institution: string, year: number, datasets = DATASETS) => datasets.some((d) => d.observations.some((o) => o.institution === institution && o.year === year));
/** The recorded results of one edition reportable at `now`, by category in the order the data lists them. */
export const recordedResults = (institution: string, year: number, now: number, datasets = DATASETS) => observationsAt(now, (o) => o.institution === institution && o.year === year, datasets);

export function sourceOf(o: Observation, datasets = DATASETS): HistorySource {
  const d = datasets.find((x) => x.observations.includes(o) || x.observations.some((y) => y.id === o.id))!;
  return d.sources[o.source];
}
