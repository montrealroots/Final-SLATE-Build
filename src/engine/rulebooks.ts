// Versioned festival and award rules, edition by edition, taken from the organizers' own documents.
//
// Each rule records its status and source:
//   verified  - read in the organizer's document for that edition (sources below, retrieved on `checked`);
//   projected - the organizer hasn't published this edition's rules; the previous edition's rule is carried forward
//               and labelled as such.
// A category or rule with no entry here uses SLATE's simulated rules (awards.ts), labelled "simulated".
//
// History: a rulebook is never edited once an edition has used it. A correction adds a new version (a new `id`), and
// each edition keeps the id it was created with (`Edition.rulesId`), so past entries and results are judged by the
// rules that applied then. Full audit with quotes: docs/world/RULEBOOK-AUDIT.md.

import type { Format, Medium } from './types';

export type RuleStatus = 'verified' | 'projected';

export interface RuleSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
  /** The edition the document is for. */
  edition: string;
  retrieved: string;
}

/** A rule with where it came from. `note` says how SLATE applies it where the game is simpler than the real process. */
export interface Ruled<T> {
  value: T;
  status: RuleStatus;
  source: string;
  note?: string;
}

/** Running time in minutes, credits included: over/under are exclusive, atLeast/atMost inclusive. */
export interface RuntimeRule { over?: number; atLeast?: number; atMost?: number; under?: number }

export interface DeadlineRule {
  date: string;
  /** Local time of day, 24-hour. */
  time: string;
  zone: string;
  /** Applies only to work completed before this date (an earlier deadline for older work). */
  ifCompletedBefore?: string;
  /** True when the document gives the date but not the time; SLATE uses the end of that day. */
  timeAssumed?: boolean;
  /** Applies only to these formats (a section with different deadlines for shorts and features). */
  formats?: Format[];
}

export interface CategoryRules {
  runtime?: Ruled<RuntimeRule>;
  /** Running time for short formats where a section takes shorts and features under different limits. */
  runtimeShort?: Ruled<RuntimeRule>;
  /** Series must have at least this many episodes. */
  minEpisodes?: Ruled<number>;
  mediums?: Ruled<Medium[]>;
  formats?: Ruled<Format[]>;
  /** The work must be completed on or after this date. */
  completedFrom?: Ruled<string>;
  /** Release or qualification must fall in this window (inclusive date keys). */
  qualifying?: Ruled<{ from: string; to: string }>;
  /**
   * The release that qualifies the work: one of these routes in one of these countries (or, with `outside`, anywhere but
   * those), inside `qualifying`. Formats in `exempt` need no release. Other routes that also qualify:
   * - `festivalList`: a win of one of the awards on that qualifying list (QUALIFYING_LISTS), inside the list's own window;
   * - `viaCategory`: an entry in that category of the same edition that was accepted (the Academy's documentary route 3,
   *   "submitted and deemed eligible in the International Feature Film category").
   * `festivalAwards` ("institution:category", any win inside `qualifying`) is version 1 of the 99th Oscars' shorts rule,
   * kept for editions created with it; it named festivals' sections the Academy doesn't list (rulebooks, November 9, 2026).
   */
  release?: Ruled<{ routes: ('theatrical' | 'streaming' | 'broadcast' | 'digital')[]; countries: string[]; outside?: string[]; exempt?: Format[]; festivalAwards?: string[]; festivalList?: string; viaCategory?: string }>;
  /**
   * No streaming, digital or broadcast release in these countries ('*' for anywhere) before the first theatrical release
   * there. With `unlessFestival`, a work qualifying through its festival list is exempt.
   */
  theatricalFirst?: Ruled<{ countries: string[]; unlessFestival?: boolean }>;
  /** world: never shown publicly; international: not shown outside its production country; world-if-domestic: world
   *  premiere for work from the festival's country, international premiere for everything else; none: no requirement. */
  premiere?: Ruled<'world' | 'international' | 'world-if-domestic' | 'none'>;
  /** No public showing before this date, unless the work was completed after `unlessCompletedAfter`. */
  notShownBefore?: Ruled<{ date: string; unlessCompletedAfter?: string }>;
  /** Not shown at another festival, and not online, before this festival. */
  noOtherFestival?: Ruled<true>;
  noOnline?: Ruled<true>;
  /** Not broadcast on television or released online (streaming or digital) before this festival. */
  noTvOrOnline?: Ruled<true>;
  /** Not shown publicly in these countries before the festival, except at these institutions' editions. */
  notShownIn?: Ruled<{ countries: string[]; exceptAt?: string[] }>;
  /** Television work must not have had a theatrical release in these countries before its first broadcast or stream there. */
  tvFirst?: Ruled<{ countries: string[] }>;
  /** Production countries (SLATE uses the production base as the country of origin). */
  origin?: Ruled<{ only?: string[]; not?: string[] }>;
  /** A work entered at an earlier edition can't be entered again. */
  noReentry?: Ruled<true>;
  deadlines?: Ruled<DeadlineRule[]>;
  /** Who is named and receives the award for a work: credited directors, or credited producers (at most `max`). */
  recipients?: Ruled<{ credit: 'director' | 'producer' | 'director-and-producer'; max?: number }>;
}

export interface RuleBook {
  /** Never reused: `${institution}-${year}@${version}`. */
  id: string;
  institutionId: string;
  year: number;
  version: number;
  /** Day the documents were read. */
  checked: string;
  /** Entries open (when the organizer published it). */
  opens?: Ruled<string>;
  sources: RuleSource[];
  categories: Record<string, CategoryRules>;
}


// ---------------- Qualifying-festival lists ----------------

/**
 * One award on an organizer's qualifying list and the SLATE category that is that award. `match` is 'interpreted' where
 * the list's wording and the roster's name differ and the mapping is SLATE's reading, said in `note`.
 */
export interface QualifyingAward { institution: string; category: string; listed: string; match: 'exact' | 'interpreted'; note?: string }

/**
 * An organizer's list of festival awards that qualify a work for one edition. Only these awards, won inside the window,
 * qualify: another prize at the same festival, a selection, an audience, partner or honorary award doesn't, and nor does
 * a win before or after the window. `notInGame` names what the list holds that SLATE's rosters don't, so none of those
 * can be won in a game. Never edited once an edition has used it: a corrected list is a new id.
 */
export interface QualifyingList {
  id: string;
  /** The awarding institution and edition year whose categories the list qualifies for. */
  institutionId: string;
  year: number;
  /** The days the award must be won on (the festival's closing day, inclusive keys). */
  window: { from: string; to: string };
  awards: QualifyingAward[];
  notInGame: string[];
  source: string;
  /** Where in the source the list or its rule is. */
  section: string;
  note?: string;
  /** Set on a list carried forward to a later edition (projectedList): the list it was carried from. */
  projectedFrom?: string;
}

// The lists themselves (QUALIFYING_LISTS, qualifyingList, projectedList) are in qualifying-lists.ts, which loads with
// the catalog: at startup they took the startup JavaScript over its 220 kB gzipped budget (222 kB, November 9, 2026).


const byId = new Map<string, RuleBook>();

/**
 * Every rulebook ever shipped, from rulebook-data.ts, published when the catalog loads (awards.ts loadInstitutions), in
 * the same step as the institutions, so nothing reads one without the other. Append only: an edition may refer to any of
 * these ids for good.
 */
export const RULEBOOKS: RuleBook[] = [];

export function registerRulebooks(books: RuleBook[]): void {
  RULEBOOKS.splice(0, RULEBOOKS.length, ...books);
  byId.clear();
  for (const b of books) byId.set(b.id, b);
}

/** The newest rulebook for an institution's edition, if one exists. */
export function currentRulebook(institutionId: string, year: number): RuleBook | undefined {
  return RULEBOOKS.filter((b) => b.institutionId === institutionId && b.year === year).sort((a, b) => b.version - a.version)[0];
}

export function rulebook(id: string | undefined): RuleBook | undefined {
  return id ? byId.get(id) : undefined;
}

/** Whether a category's rules are the organizer's for this edition, carried forward, or SLATE's simulation. */
export function categoryRuleStatus(book: RuleBook | undefined, categoryId: string): 'verified' | 'projected' | 'simulated' {
  const c = book?.categories[categoryId];
  if (!c) return 'simulated';
  return Object.values(c).some((r) => (r as Ruled<unknown>).status === 'projected') ? 'projected' : 'verified';
}
