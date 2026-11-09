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
   * - `festivalSelection`: selected for a section of one of these institutions' editions closing inside `qualifying` (a
   *   selection, not a win: the Spirit Awards' "programmed at one of nine festivals").
   * `festivalAwards` ("institution:category", any win inside `qualifying`) is version 1 of the 99th Oscars' shorts rule,
   * kept for editions created with it; it named festivals' sections the Academy doesn't list (rulebooks, November 9, 2026).
   */
  release?: Ruled<{ routes: ('theatrical' | 'streaming' | 'broadcast' | 'digital')[]; countries: string[]; outside?: string[]; exempt?: Format[]; festivalAwards?: string[]; festivalList?: string; viaCategory?: string; festivalSelection?: string[] }>;
  /** The production's budget must be under this many dollars (the project's estimate). */
  maxBudget?: Ruled<number>;
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
  /** No release of any kind (cinemas, television, online, home video) before the festival starts. */
  unreleased?: Ruled<true>;
  /** Not shown publicly in a European country other than the production country before the festival (a European premiere). */
  europeanPremiere?: Ruled<true>;
  /** Television work must not have had a theatrical release in these countries before its first broadcast or stream there. */
  tvFirst?: Ruled<{ countries: string[] }>;
  /** Production countries (SLATE uses the production base as the country of origin). */
  origin?: Ruled<{ only?: string[]; not?: string[] }>;
  /** A work entered at an earlier edition can't be entered again. */
  noReentry?: Ruled<true>;
  deadlines?: Ruled<DeadlineRule[]>;
  /**
   * Parts whose story function is Narrator can't be entered: the Emmys' Performer Categories, "Voice-over performers and
   * narrators may not enter in lead, support or guest performer categories" (a voice part is never in those pools anyway).
   */
  noNarrators?: Ruled<true>;
  /**
   * More than this share of the dialogue is in a language other than English, counted in words over the approved script's
   * lines (the Oscars' International Feature, Rule Sixteen II.D; the Golden Globes' Non-English Language, A.3.c.i). A work
   * with no written dialogue is read by its first declared dialogue language.
   */
  nonEnglish?: Ruled<number>;
  /**
   * A series is entered for one episode, and the award goes to the people credited on it, at most `max` (the Emmys'
   * directing and writing categories: "for a single episode of a comedy series", "an entry is limited to two directors").
   * Applies to episodic work only; a special or movie is entered whole. With `wholeWhenAll` (the Emmys' limited series), a
   * work whose credited people all worked on every part is entered whole; otherwise one part.
   */
  oneEpisode?: Ruled<{ max?: number; wholeWhenAll?: true }>;
  /**
   * A performer's share of the program's episodes, from the episodes they are credited in: the Emmys' guest categories take
   * "less than 50% of the eligible episodes", Short Form Performer "50% or more" (Performer Awards, Entry Information).
   */
  episodeShare?: Ruled<{ under?: number; atLeast?: number }>;
  /**
   * A performer nominated at this organizer, in a category starting with one of these ids, for the same part in an earlier
   * season of the series can't be entered here: the Emmys' "Guest Performer Eligibility" (nominated or won as lead or
   * supporting, then not as a guest "in a subsequent Emmy year for playing the same role in the same series").
   */
  notAfterNomination?: Ruled<{ institution: string; categories: string[] }>;
  /**
   * A performance fills at least this share of the running time, measured from the approved script's scene minutes the
   * part appears in: of its best episode (`per: 'episode'`, the Emmys' guest performers) or of the whole work (`'whole'`,
   * supporting performers in a limited series or movie). "The minimum stand-alone and contiguous-screen time ... is 5%".
   */
  screenShare?: Ruled<{ atLeast: number; per: 'episode' | 'whole' }>;
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
