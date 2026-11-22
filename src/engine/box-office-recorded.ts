// Real films' box office as recorded in Wikidata (CC0; tools/box-office/wikidata.mjs, docs/BOX-OFFICE-RECORDED.md). The
// owner chose it on November 22, 2026, while a licensed, dated feed is sought (box-office-feed.ts takes that one). Each
// figure is a total as recorded on a day, with where it was for, its currency and its source; never a weekend report.
//
// What holds:
// - Nothing before it was known: on a save's date, only figures recorded by then are read (`known`), each film's latest
//   for each territory. A save set before a figure was recorded doesn't see it.
// - Nothing converted: a figure keeps its currency, and the rankings compare US dollars with US dollars.
// - Nothing mixed with the game's own: a player's films are simulated, and are placed among the real ones, never added in.
// The data is loaded on demand, once (it is 0.65 MB), before a game starts (ui/store.ts beginOnce); until then nothing is
// recorded, as on a day before any figure was.

export interface RecordedFigure {
  amount: number;
  currency: string;
  /** WORLD, NA (North America, the trade's "domestic"), a country's code, or UNSPECIFIED when Wikidata doesn't say. */
  where: string;
  /** The day the figure runs through, and the day it was first recorded. */
  through: string;
  known: string;
  source: string | null;
  url?: string;
}
export interface RecordedFilm { q: string; title: string; released?: string; tmdb?: number; figures: RecordedFigure[] }

type Raw = {
  source: string; licence: string; retrieved: string;
  counts: Record<string, number>;
  sources: string[];
  films: Record<string, { t: string; y?: string; tmdb?: number; f: [number, string, string, string, string, number, string?][] }>;
};

let films: RecordedFilm[] = [];
let byTmdb = new Map<number, RecordedFilm>();
let meta: Pick<Raw, 'source' | 'licence' | 'retrieved' | 'counts'> | null = null;
let loading: Promise<void> | null = null;

/** Takes in the shipped data, or a test's. */
export function setRecorded(raw: Raw | null): void {
  meta = raw && { source: raw.source, licence: raw.licence, retrieved: raw.retrieved, counts: raw.counts };
  films = raw ? Object.entries(raw.films).map(([q, f]) => ({
    q, title: f.t, ...(f.y ? { released: f.y } : {}), ...(f.tmdb ? { tmdb: f.tmdb } : {}),
    figures: f.f.map(([amount, currency, where, through, known, src, url]) => ({ amount, currency, where, through, known, source: raw.sources[src] ?? null, ...(url ? { url } : {}) })),
  })) : [];
  byTmdb = new Map(films.filter((f) => f.tmdb).map((f) => [f.tmdb!, f]));
}

/** Loads the shipped figures, once. */
export const loadRecorded = (): Promise<void> =>
  (loading ??= import('../data/box-office/wikidata.json').then((m) => setRecorded(m.default as unknown as Raw)).catch((e) => { loading = null; throw e; }));
export const recordedMeta = () => meta;
export const recordedLoaded = (): boolean => meta !== null;

/** A film's figures as known on `today`: its latest recorded for each territory, the world first. */
export function recordedFor(today: string, film: RecordedFilm | undefined): RecordedFigure[] {
  if (!film) return [];
  const latest = new Map<string, RecordedFigure>();
  for (const f of film.figures) {
    if (f.known > today) continue;
    const had = latest.get(f.where);
    if (!had || f.through > had.through || (f.through === had.through && f.known > had.known)) latest.set(f.where, f);
  }
  const order = (w: string) => (w === 'WORLD' ? 0 : w === 'NA' ? 1 : w === 'UNSPECIFIED' ? 3 : 2);
  return [...latest.values()].sort((a, b) => order(a.where) - order(b.where) || a.where.localeCompare(b.where));
}
export const recordedFilm = (tmdb: number): RecordedFilm | undefined => byTmdb.get(tmdb);

/** A film's worldwide gross in US dollars as known on `today`, or null. */
export function worldwideAsOf(today: string, tmdb: number): RecordedFigure | null {
  return recordedFor(today, byTmdb.get(tmdb)).find((f) => f.where === 'WORLD' && f.currency === 'USD') ?? null;
}

/** Real films ranked by their worldwide gross in US dollars, as known on `today`. */
export function worldwideRanking(today: string): { film: RecordedFilm; figure: RecordedFigure }[] {
  const out: { film: RecordedFilm; figure: RecordedFigure }[] = [];
  for (const film of films) {
    const figure = recordedFor(today, film).find((f) => f.where === 'WORLD' && f.currency === 'USD');
    if (figure) out.push({ film, figure });
  }
  return out.sort((a, b) => b.figure.amount - a.figure.amount || a.film.title.localeCompare(b.film.title));
}

/** Where a sum would place among the real films' worldwide grosses known on `today`: 1 for the highest. */
export const placeAmong = (ranking: { figure: RecordedFigure }[], amount: number): number => ranking.filter((r) => r.figure.amount > amount).length + 1;

/**
 * A film that took twice its production budget worldwide very likely made a profit: the rule of thumb the BFI gave,
 * which Stephen Follows tested on two datasets and found right 72% and 75% of the time ("Do Hollywood movies make a
 * profit?", July 25, 2016). Studios read a franchise's last film by it (studio-projects.ts).
 */
export const PROFIT_MULTIPLE = 2;
