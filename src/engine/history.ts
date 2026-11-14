// Recorded history (the owner's v6 package, 01-REALISM-CONTRACT.md and 02-WORLD-AND-HISTORY.md; from November 13, 2026).
// A verified observation is a cited fact for a date, kept apart from what the game simulates and from what the player
// does. Each has the date it happened, the date it was published and the date it was imported, its source, and a
// revision. A save never stores one: what a save shows follows from the data and the save's own clock, so a reload
// can't duplicate one and a later correction can't rewrite what a save already settled.
//
// Reportable from its published date, in the player's own calendar (the owner's v7 package, reference visible() and its
// decision: a date known only to the day must not be given a made-up time). Until November 13, 2026 a result waited
// until its day had ended where it was announced. No publication date, no report: an unknown is never shown as known.
import awards2026 from '../data/history/awards-2026.json';
import awardsReference from '../data/history/awards-2026-reference.json';
import audienceReference from '../data/history/audience-2026-reference.json';

export interface HistorySource { url: string; title: string; provider: string; retrieved: string; section: string; access: string }
export interface Observation {
  id: string;
  kind: 'winner' | 'nominees';
  institution: string;
  year: number;
  edition: string;
  /** The game's category id for it, or null where the game has no such category; and the name as the organizer gives it. */
  category: string | null;
  categoryName: string;
  /** Works or people, as the source writes them. */
  subjects: string[];
  /** For a person's award, the work it was for; for a work's, who received it, as the source writes it. */
  work?: string;
  credited?: string;
  occurred: string;
  /** null: when it was published isn't known, and it isn't shown. */
  published: string | null;
  precision: 'day';
  /** Who the record names: a person, or only the work (and no individual recipient is assigned from it). */
  recipients?: 'named_person' | 'work_only';
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

export const DATASETS: HistoryDataset[] = [awards2026 as HistoryDataset, awardsReference as HistoryDataset];

/** Whether an observation is reportable on `today` (YYYY-MM-DD, the player's own date): published, and by then. */
export const reportable = (o: Pick<Observation, 'published' | 'occurred'>, today: string): boolean => !!o.published && o.published <= today && o.occurred <= today;

/** Observations reportable on `today`, each at its latest revision published by then. */
export function observationsAt(today: string, keep: (o: Observation) => boolean = () => true, datasets = DATASETS): Observation[] {
  const latest = new Map<string, Observation>();
  for (const d of datasets) for (const o of d.observations) {
    if (!keep(o) || !reportable(o, today)) continue;
    const had = latest.get(o.id);
    if (!had || o.revision > had.revision) latest.set(o.id, o);
  }
  return [...latest.values()];
}

/** Whether any recorded results exist for this institution's edition, published or not (not what they are). */
export const holdsRecords = (institution: string, year: number, datasets = DATASETS) => datasets.some((d) => d.observations.some((o) => o.institution === institution && o.year === year));
/** The recorded results of one edition reportable on `today`, by category in the order the data lists them. */
export const recordedResults = (institution: string, year: number, today: string, datasets = DATASETS) => observationsAt(today, (o) => o.institution === institution && o.year === year, datasets);

export function sourceOf(o: Observation, datasets = DATASETS): HistorySource {
  const d = datasets.find((x) => x.observations.includes(o) || x.observations.some((y) => y.id === o.id))!;
  return d.sources[o.source];
}

// ---- Audience charts (the v7 package, MET01-MET04). A chart row keeps its unit, territory, period and method; two rows
// are comparable only when all of those match (reference comparable()). A row whose publication is inferred, not
// observed, is shown only in a playback that opts into inference; strict playback (the default) leaves it out.
export interface AudienceRow { id: string; title: string; rank: number; value: number; unit: string; period_start: string; period_end: string; territory: string; chart: string; source_id: string; available_on: string | null; availability_basis: string; raw_precision: number; methodology?: string }
export const AUDIENCE_ROWS = (audienceReference as unknown as { rows: AudienceRow[] }).rows;
export const inferred = (r: Pick<AudienceRow, 'availability_basis'>) => r.availability_basis.startsWith('inferred');
export function audienceAt(today: string, allowInferred = false, rows = AUDIENCE_ROWS): AudienceRow[] {
  return rows.filter((r) => !!r.available_on && r.available_on <= today && r.period_end <= today && (allowInferred || !inferred(r)));
}
type Scope = Partial<Pick<AudienceRow, 'unit' | 'territory' | 'period_start' | 'period_end' | 'methodology'>> & { metric?: string };
/** Whether two figures can be set side by side: the same metric, unit, territory, period and method, none of them missing. */
export function comparable(a: Scope, b: Scope): boolean {
  return (['metric', 'unit', 'territory', 'period_start', 'period_end', 'methodology'] as const).every((k) => a[k] != null && a[k] === b[k]);
}
/** A displayed value as it was displayed: 8.6 million views stays "8.6 million", not 8,600,000 people. */
export const displayed = (r: Pick<AudienceRow, 'value' | 'raw_precision' | 'unit'>) => `${r.value.toFixed(r.raw_precision)} million ${r.unit.startsWith('million_views') ? 'views' : r.unit}`;
