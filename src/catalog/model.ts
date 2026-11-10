// The screen catalog as the game reads it (tools/screen-catalog/build.mjs writes it; docs/CATALOG.md), and the rules for
// showing it at a save's date. The catalog is reference material: real titles, credits and companies as TMDB records them.
// Nothing in it is part of a save, and nothing in the simulation reads it. A credit isn't availability, employment,
// skill or a relationship, and TMDB's ratings, budgets and revenue are shown as TMDB's figures, never used as game values.
import { COMPANIES, LEADERSHIP, type LeadershipRole } from './registry';
import { ageOn as engineAgeOn } from '../engine/time';

export interface Rating { average: number; count: number }
export interface CastCredit { person: number; name: string; character: string | null; order: number }
export interface CrewCredit { person: number; name: string; department: string; job: string }

export interface CatalogIndex {
  version: 1;
  builtAt: string;
  registryChecked: string;
  retrieved: { from: string | null; to: string | null; maxAgeDays: number };
  counts: Record<string, number>;
  /** Whose details were fetched: top-billed cast and key crew, or (`all`, from November 10, 2026) everyone credited. */
  peopleRule: { cast: number; jobs: string[]; all?: boolean };
  discovery: { company: number; type: 'movie' | 'tv'; reported: number | null; found: number; pages: number; split: boolean; failedPages: (number | string)[] }[];
  failures: number;
  stale: number;
  companies: { tmdbId: number; titles: number; movies: number; series: number }[];
}
export interface FilmographyEntry { ref: string; title: string; date: string | null; credited: string | null; genres: string[]; status: string | null }
export interface CompanyFilmography { tmdbId: number; entries: FilmographyEntry[] }
export interface TitleRecord {
  ref: string;
  type: 'movie' | 'tv';
  title: string;
  originalTitle: string;
  status: string | null;
  date: string | null;
  lastAirDate?: string | null;
  originalLanguage: string | null;
  languages: string[];
  countries: string[];
  genres: string[];
  runtime: number | null;
  episodeRuntimes?: number[];
  overview: string | null;
  tagline: string | null;
  companies: { tmdbId: number; name: string; country: string | null }[];
  networks?: string[];
  createdBy?: { person: number; name: string }[];
  externalIds: { imdb: string | null; wikidata: string | null };
  collection: { id: number; name: string } | null;
  classifications: { country: string; rating: string }[];
  budget: number | null;
  revenue: number | null;
  rating: Rating | null;
  retrievedAt: string;
  discoveredVia: number[];
  cast: CastCredit[];
  crew: CrewCredit[];
  seriesCast?: { person: number; name: string; roles: { character: string | null; episodes: number }[]; episodes: number }[];
  seriesCrew?: { person: number; name: string; department: string; jobs: { job: string; episodes: number }[]; episodes: number }[];
  seasons?: { ref: string; number: number; name: string; date: string | null; episodes: number; available: boolean }[];
}
export interface EpisodeRecord {
  number: number;
  name: string;
  date: string | null;
  runtime: number | null;
  overview: string | null;
  rating: Rating | null;
  crew: CrewCredit[];
  guests: CastCredit[];
}
export interface SeasonRecord { ref: string; series: string; seriesTitle: string; number: number; name: string; date: string | null; overview: string | null; retrievedAt: string; cast: CastCredit[]; episodes: EpisodeRecord[] }
export interface PersonCredit { ref: string; title: string; date: string | null; kind: 'cast' | 'crew' | 'series-cast' | 'series-crew' | 'episode-crew' | 'episode-guest' | 'creator'; role: string | null; department?: string; episodes?: number }
export interface PersonRecord {
  id: number;
  name: string;
  details: { birthday: string | null; deathday: string | null; placeOfBirth: string | null; knownFor: string | null; biography: string | null; alsoKnownAs: string[]; imdb: string | null; retrievedAt: string } | null;
  credits: PersonCredit[];
}

/** References, stable across builds: movie:<tmdb>, tv:<tmdb>, tv:<tmdb>:s:<n>, tv:<tmdb>:s:<n>:e:<n>, person:<tmdb>. */
export function parseRef(ref: string): { kind: 'movie' | 'tv' | 'season' | 'episode' | 'person'; id: number; season?: number; episode?: number } | null {
  const m = /^(movie|tv|person):(\d+)(?::s:(\d+)(?::e:(\d+))?)?$/.exec(ref);
  if (!m) return null;
  const id = Number(m[2]);
  if (m[1] === 'tv' && m[3] !== undefined) return m[4] !== undefined ? { kind: 'episode', id, season: Number(m[3]), episode: Number(m[4]) } : { kind: 'season', id, season: Number(m[3]) };
  if (m[1] !== 'tv' && m[3] !== undefined) return null;
  return { kind: m[1] as 'movie' | 'tv' | 'person', id };
}
/** Where each record is stored in the built catalog. */
export function fileFor(ref: string): string | null {
  const r = parseRef(ref);
  if (!r) return null;
  if (r.kind === 'movie' || r.kind === 'tv') return `titles/${r.kind}-${r.id}.json`;
  if (r.kind === 'season' || r.kind === 'episode') return `seasons/${r.id}-${r.season}.json`;
  return `people/${r.id % PEOPLE_BUCKETS}.json`;
}
export const PEOPLE_BUCKETS = 500;

/** Whether a dated thing had happened by the save's date (both YYYY-MM-DD). An undated one hasn't, as far as anyone knows. */
export const happenedBy = (date: string | null | undefined, today: string) => !!date && date <= today;

/**
 * What a title is at the save's date. A title released after it is announced, not history: its rating, budget and revenue
 * are later knowledge and aren't shown.
 */
export function titleStanding(t: { date: string | null; status: string | null }, today: string): 'released' | 'upcoming' | 'undated' {
  if (happenedBy(t.date, today)) return 'released';
  return t.date ? 'upcoming' : 'undated';
}

/** A person's dates as known at the save's date: a death after it hasn't happened yet. */
export function lifeAt(d: { birthday: string | null; deathday: string | null }, today: string): { born: string | null; died: string | null } {
  return { born: happenedBy(d.birthday, today) ? d.birthday : null, died: happenedBy(d.deathday, today) ? d.deathday : null };
}

/**
 * Whole years from a birth date to a date (both YYYY-MM-DD), by the game's own rule (src/engine/time.ts): the age turns
 * on the birthday, and a February 29 birthday is observed on February 28 in other years. The season page's first version
 * had counted it on March 1, out of step with the player's own age.
 */
export function ageOn(born: string, on: string): number {
  const parts = (k: string) => ({ year: Number(k.slice(0, 4)), month: Number(k.slice(5, 7)), day: Number(k.slice(8, 10)) });
  return engineAgeOn(parts(born), parts(on));
}

/**
 * A person's age at the save's date, or the age they died at if they had died by then. It is null without a full
 * recorded birth date, or before they are born.
 */
export function ageAt(d: { birthday: string | null; deathday: string | null }, today: string): { years: number; atDeath: boolean } | null {
  const life = lifeAt(d, today);
  if (!life.born || life.born.length !== 10) return null;
  return life.died ? { years: ageOn(life.born, life.died), atDeath: true } : { years: ageOn(life.born, today), atDeath: false };
}

export type LeadershipStanding = 'current' | 'former' | 'incoming' | 'listed';

/**
 * A role at the save's date. Current: begun (or with no recorded start, listed by its source) and not yet ended. Former:
 * ended, or its end was announced. Incoming: announced but not yet begun. Hidden (null): announced after the save's date.
 * A role whose start isn't recorded, seen at a date before the registry was checked, is "listed": the source lists it,
 * and when it began isn't known, so the page says that rather than calling it current.
 */
export function standingAt(r: LeadershipRole, today: string, checked: string): LeadershipStanding | null {
  if (r.announced && r.announced > today) return null;
  if (r.end && r.end <= today) return 'former';
  if (r.endAnnounced && r.endAnnounced <= today) return 'former';
  if (r.start && r.start > today) return 'incoming';
  if (r.start) return 'current';
  if (r.end) return 'current'; // ended after today, start not recorded: it was held then
  if (r.announced) return 'current';
  return today >= checked ? 'current' : 'listed';
}

export function leadershipAt(companyId: string, today: string, checked: string): { role: LeadershipRole; standing: LeadershipStanding }[] {
  const order: LeadershipStanding[] = ['current', 'listed', 'incoming', 'former'];
  return LEADERSHIP.filter((r) => r.companyId === companyId)
    .map((role) => ({ role, standing: standingAt(role, today, checked) }))
    .filter((x): x is { role: LeadershipRole; standing: LeadershipStanding } => x.standing !== null)
    .sort((a, b) => order.indexOf(a.standing) - order.indexOf(b.standing));
}

export function executive(personId: string) {
  const roles = LEADERSHIP.filter((r) => r.personId === personId);
  return roles.length ? { personId, name: roles[0].name, roles } : null;
}

/** The registry company a TMDB company ID belongs to, if it is one the catalog covers. */
export const registryFor = (tmdbId: number) => COMPANIES.find((c) => c.tmdb?.id === tmdbId);

/**
 * Whether a title credited to a Disney-owned company was made after Disney owned it. A title made before the
 * acquisition is credited to that company, not to Disney; one with no date can't be placed.
 */
export function madeUnderDisney(tmdbId: number, date: string | null): boolean | null {
  const c = registryFor(tmdbId);
  if (!c?.parent || c.parent.how !== 'acquired') return c ? true : null;
  if (!date || !c.parent.from) return null;
  return date >= c.parent.from;
}

export type SortKey = 'newest' | 'oldest' | 'title';
/** Filter and sort a filmography for a page of it. */
export function filmographyView(entries: FilmographyEntry[], o: { query: string; type: 'all' | 'movie' | 'tv'; sort: SortKey; today: string; later: boolean }): FilmographyEntry[] {
  const q = o.query.trim().toLowerCase();
  const out = entries.filter((e) => (o.type === 'all' || e.ref.startsWith(`${o.type}:`)) && (!q || e.title.toLowerCase().includes(q)) && (o.later || happenedBy(e.date, o.today)));
  const byDate = (a: FilmographyEntry, b: FilmographyEntry) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || a.title.localeCompare(b.title);
  return out.sort(o.sort === 'title' ? (a, b) => a.title.localeCompare(b.title) || byDate(a, b) : o.sort === 'oldest' ? byDate : (a, b) => byDate(b, a));
}

/** Money as TMDB gives it, or the plain fact that it isn't recorded. Never $0 for a figure TMDB doesn't have. */
export const moneyOrUnknown = (n: number | null) => (n === null ? 'Not recorded' : `$${n.toLocaleString('en-US')}`);
