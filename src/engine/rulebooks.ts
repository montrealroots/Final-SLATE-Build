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
}

export interface CategoryRules {
  runtime?: Ruled<RuntimeRule>;
  mediums?: Ruled<Medium[]>;
  formats?: Ruled<Format[]>;
  /** The work must be completed on or after this date. */
  completedFrom?: Ruled<string>;
  /** Release or qualification must fall in this window (inclusive date keys). */
  qualifying?: Ruled<{ from: string; to: string }>;
  /**
   * The release that qualifies the work: one of these routes in one of these countries, inside `qualifying`.
   * Formats in `exempt` need no release. A win in one of `festivalAwards` ("institution:category") inside the window
   * also qualifies.
   */
  release?: Ruled<{ routes: ('theatrical' | 'streaming' | 'broadcast' | 'digital')[]; countries: string[]; exempt?: Format[]; festivalAwards?: string[] }>;
  /** No streaming, digital or broadcast release in these countries before the first theatrical release there. */
  theatricalFirst?: Ruled<{ countries: string[] }>;
  /** world: never shown publicly; international: not shown outside its production country; world-if-domestic: world
   *  premiere for work from the festival's country, international premiere for everything else; none: no requirement. */
  premiere?: Ruled<'world' | 'international' | 'world-if-domestic' | 'none'>;
  /** No public showing before this date, unless the work was completed after `unlessCompletedAfter`. */
  notShownBefore?: Ruled<{ date: string; unlessCompletedAfter?: string }>;
  /** Not shown at another festival, and not online, before this festival. */
  noOtherFestival?: Ruled<true>;
  noOnline?: Ruled<true>;
  /** Production countries (SLATE uses the production base as the country of origin). */
  origin?: Ruled<{ only?: string[]; not?: string[] }>;
  /** A work entered at an earlier edition can't be entered again. */
  noReentry?: Ruled<true>;
  deadlines?: Ruled<DeadlineRule[]>;
  /** Who is named and receives the award for a work: credited directors, or credited producers (at most `max`). */
  recipients?: Ruled<{ credit: 'director' | 'producer'; max?: number }>;
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

const CHECKED = '2026-11-06';
const PT = 'America/Los_Angeles';
const v = <T>(value: T, source: string, note?: string): Ruled<T> => ({ value, status: 'verified', source, note });
const proj = <T>(value: T, source: string, note: string): Ruled<T> => ({ value, status: 'projected', source, note });

// ---------------- Academy Awards, 99th (2027) ----------------

const OSCARS_SOURCES: RuleSource[] = [
  { id: 'aa99-rules', publisher: 'Academy of Motion Picture Arts and Sciences', title: '99th Oscars Complete Rules', url: 'https://www.oscars.org/sites/oscars/files/2026-05/99th_oscars_complete_rules.pdf', edition: '99th Academy Awards (2027)', retrieved: CHECKED },
  { id: 'aa99-shorts-festivals', publisher: 'Academy of Motion Picture Arts and Sciences', title: '99th Academy Awards Short Films Qualifying Festival List', url: 'https://www.oscars.org/sites/oscars/files/2026-05/99AA_Shorts%20Qualifying%20Festivals.pdf', edition: '99th Academy Awards (2027)', retrieved: CHECKED },
  { id: 'aa99-press', publisher: 'Academy of Motion Picture Arts and Sciences', title: 'Awards Rules and Campaign Promotional Regulations Approved for 99th Oscars', url: 'https://press.oscars.org/news/awards-rules-and-campaign-promotional-regulations-approved-99th-oscarsr', edition: '99th Academy Awards (2027)', retrieved: CHECKED },
];

const US_THEATRICAL_NOTE = 'SLATE treats a US theatrical release by a distributor as the required run of at least seven consecutive days in one of the six qualifying US metro areas.';
const OSCAR_FEATURE: CategoryRules = {
  runtime: v({ over: 40 }, 'aa99-rules'),
  qualifying: v({ from: '2026-01-01', to: '2026-12-31' }, 'aa99-rules'),
  release: v({ routes: ['theatrical'], countries: ['US'] }, 'aa99-rules', US_THEATRICAL_NOTE),
  theatricalFirst: v({ countries: ['US'] }, 'aa99-rules'),
  deadlines: v([{ date: '2026-11-12', time: '17:00', zone: PT }], 'aa99-rules', 'Final deadline for films qualifying from July to December 2026; SLATE uses it for every film.'),
};
/** Short Film Qualifying Festival List awards that exist in SLATE ("institution:category"). */
const OSCAR_SHORT_FESTIVALS = ['annecy:shorts', 'berlinale:shorts', 'cannes:shorts', 'clermont:international', 'fespaco:shorts', 'hot-docs:audience', 'idfa:shorts', 'sitges:fantastic', 'sxsw:shorts', 'sundance:shorts', 'tiff:shorts', 'venice:orizzonti'];
const OSCAR_SHORT: CategoryRules = {
  runtime: v({ atMost: 40 }, 'aa99-rules'),
  qualifying: v({ from: '2025-10-01', to: '2026-09-30' }, 'aa99-rules'),
  release: v({ routes: ['theatrical'], countries: ['US'], festivalAwards: OSCAR_SHORT_FESTIVALS }, 'aa99-shorts-festivals',
    `${US_THEATRICAL_NOTE} A win counts when it is the top award of a SLATE section that the Academy's list names for that festival.`),
  deadlines: v([{ date: '2026-10-08', time: '17:00', zone: PT }], 'aa99-rules'),
};

const OSCARS_2027: RuleBook = {
  id: 'oscars-2027@1', institutionId: 'oscars', year: 2027, version: 1, checked: CHECKED, sources: OSCARS_SOURCES,
  categories: {
    picture: { ...OSCAR_FEATURE, recipients: v({ credit: 'producer', max: 3 }, 'aa99-rules', 'Only credited producers ("producer" or "produced by"); executive and co-producers are not named.') },
    director: OSCAR_FEATURE,
    screenplay: OSCAR_FEATURE,
    actor: OSCAR_FEATURE,
    actress: OSCAR_FEATURE,
    'supporting-actor': OSCAR_FEATURE,
    'supporting-actress': OSCAR_FEATURE,
    animated: { ...OSCAR_FEATURE, mediums: v(['animation'], 'aa99-rules', 'At least 75 percent of the running time must be animation; SLATE accepts animated projects and not hybrid ones.') },
    documentary: { ...OSCAR_FEATURE, deadlines: v([{ date: '2026-10-15', time: '17:00', zone: PT }], 'aa99-rules') },
    'live-short': { ...OSCAR_SHORT, formats: v(['short'], 'aa99-rules', 'Documentary shorts are not accepted in the live action category.') },
    'animated-short': { ...OSCAR_SHORT, mediums: v(['animation'], 'aa99-rules', 'At least 75 percent animation; SLATE accepts animated projects and not hybrid ones.') },
    'doc-short': OSCAR_SHORT,
  },
};

// ---------------- Sundance Film Festival 2027 ----------------

const SUNDANCE_SOURCES: RuleSource[] = [
  { id: 'sff27-faq', publisher: 'Sundance Institute', title: 'Submitting Your Project to the 2027 Sundance Film Festival (FAQ)', url: 'https://www.sundance.org/submissions-faq', edition: '2027 Sundance Film Festival', retrieved: CHECKED },
  { id: 'sff27-submit', publisher: 'Sundance Institute', title: 'Submit (2027 deadlines and fees)', url: 'https://www.sundance.org/festivals/sundance-film-festival/submit', edition: '2027 Sundance Film Festival', retrieved: CHECKED },
  { id: 'sff27-rules', publisher: 'Sundance Institute', title: 'Rules & Regulations for Submitting to the 2027 Sundance Film Festival', url: 'https://www.sundance.org/submissions-rules', edition: '2027 Sundance Film Festival', retrieved: CHECKED },
];
const DENVER = 'America/Denver';
const SUNDANCE_ORIGIN_NOTE = 'Sundance decides US or international by where at least half the financing comes from; SLATE uses the production base.';
const sundanceDeadline = (date: string) => v([{ date, time: '23:59', zone: DENVER, timeAssumed: true }], 'sff27-submit', 'Late deadline. The page gives the date only; SLATE uses the end of that day in Boulder.');

const SUNDANCE_2027: RuleBook = {
  id: 'sundance-2027@1', institutionId: 'sundance', year: 2027, version: 1, checked: CHECKED, sources: SUNDANCE_SOURCES,
  categories: {
    dramatic: {
      runtime: v({ atLeast: 50 }, 'sff27-faq'),
      premiere: v('world-if-domestic', 'sff27-faq', SUNDANCE_ORIGIN_NOTE),
      completedFrom: v('2025-01-01', 'sff27-faq'),
      deadlines: sundanceDeadline('2026-09-21'),
    },
    documentary: {
      runtime: v({ atLeast: 50 }, 'sff27-faq'),
      premiere: v('world-if-domestic', 'sff27-faq', SUNDANCE_ORIGIN_NOTE),
      completedFrom: v('2025-01-01', 'sff27-faq'),
      deadlines: sundanceDeadline('2026-09-21'),
    },
    shorts: {
      runtime: v({ under: 50 }, 'sff27-faq'),
      premiere: v('none', 'sff27-faq'),
      notShownBefore: v({ date: '2026-01-01', unlessCompletedAfter: '2025-12-31' }, 'sff27-faq'),
      deadlines: sundanceDeadline('2026-08-31'),
    },
    episodic: {
      premiere: v('world', 'sff27-faq', 'Episodic work must not be public anywhere before February 1, 2027. The 60-minute split changes only the fee.'),
      completedFrom: v('2025-01-01', 'sff27-faq'),
      deadlines: sundanceDeadline('2026-09-11'),
    },
  },
};

// ---------------- Clermont-Ferrand International Short Film Festival, 49th (2027) ----------------

const CLERMONT_2027: RuleBook = {
  id: 'clermont-2027@1', institutionId: 'clermont', year: 2027, version: 1, checked: CHECKED,
  sources: [{ id: 'cf27-reg', publisher: 'Sauve Qui Peut le Court Métrage', title: 'Regulations - International Competition 2027', url: 'https://www.lecourt-clermont.org/wp-content/uploads/2026/06/EN-Reglement-international-2027.pdf', edition: '49th Clermont-Ferrand International Short Film Festival (2027)', retrieved: CHECKED }],
  categories: {
    international: {
      runtime: v({ atMost: 40 }, 'cf27-reg'),
      completedFrom: v('2025-10-02', 'cf27-reg', 'Only films completed after October 1, 2025.'),
      premiere: v('none', 'cf27-reg', 'No premiere status is required.'),
      origin: v({ not: ['FR'] }, 'cf27-reg', 'Films whose main production country is France go to the national competition; SLATE uses the production base.'),
      noReentry: v(true, 'cf27-reg'),
      deadlines: v([
        { date: '2026-07-09', time: '23:59', zone: 'Europe/Paris', ifCompletedBefore: '2026-01-01', timeAssumed: true },
        { date: '2026-09-24', time: '23:59', zone: 'Europe/Paris', timeAssumed: true },
      ], 'cf27-reg', 'July 9 for films completed from October to December 2025, September 24 for films made in 2026. The time of day is not given; SLATE uses the end of the day in France.'),
      recipients: v({ credit: 'director' }, 'cf27-reg', 'Prizes go to the director.'),
    },
  },
};

// ---------------- Annie Awards, 54th (2027) ----------------

const ANNIE_2027: RuleBook = {
  id: 'annie-2027@1', institutionId: 'annie', year: 2027, version: 1, checked: CHECKED,
  sources: [{ id: 'annie54-call', publisher: 'ASIFA-Hollywood (announcement, republished by Animation Scoop)', title: '54th Annie Awards "Call For Submissions" Begin Today', url: 'https://www.animationscoop.com/54th-annie-awards-call-for-submissions-begin-today/', edition: '54th Annie Awards (2027)', retrieved: CHECKED }],
  opens: v('2026-08-03', 'annie54-call'),
  categories: Object.fromEntries(['feature', 'short', 'tv', 'directing', 'writing', 'voice'].map((id) => [id, {
    qualifying: v({ from: '2026-01-01', to: '2026-12-31' }, 'annie54-call'),
    release: v({ routes: ['theatrical', 'streaming', 'broadcast', 'digital'], countries: ['US'], exempt: ['short', 'documentary-short'] }, 'annie54-call',
      'Work must be released in the United States in 2026; short subjects can enter without a US release.'),
    deadlines: v([{ date: '2026-11-30', time: '23:59', zone: PT, timeAssumed: true }], 'annie54-call', 'The time of day is not given; SLATE uses the end of the day in Los Angeles.'),
  } satisfies CategoryRules])),
};

// ---------------- Cannes Film Festival 2027: short films, projected from 2026 ----------------

const CANNES_2027: RuleBook = {
  id: 'cannes-2027@1', institutionId: 'cannes', year: 2027, version: 1, checked: CHECKED,
  sources: [{ id: 'fdc26-shorts', publisher: 'Festival de Cannes', title: '2026 Regulations - Short Films In Competition', url: 'https://cdn.festival-cannes.com/media/uploads/2025/11/reglement_courts-metrages_2026-en.pdf', edition: '79th Festival de Cannes (2026)', retrieved: CHECKED }],
  categories: {
    shorts: {
      runtime: proj({ atMost: 15 }, 'fdc26-shorts', 'From the 2026 regulations; the 2027 regulations are not published yet.'),
      completedFrom: proj('2026-05-11', 'fdc26-shorts', 'Made in the twelve months before the festival (2026 rule, applied to the 2027 dates).'),
      premiere: proj('international', 'fdc26-shorts', 'Not shown outside its home country (2026 rule).'),
      noOtherFestival: proj(true, 'fdc26-shorts', 'Not in another festival\'s international selection (2026 rule); SLATE treats any earlier festival premiere as one.'),
      noOnline: proj(true, 'fdc26-shorts', 'Not shown on the internet (2026 rule).'),
      deadlines: proj([{ date: '2027-03-02', time: '23:59', zone: 'Europe/Paris', timeAssumed: true }], 'fdc26-shorts', 'The 2026 deadline was March 2; the 2027 date is not announced.'),
    },
  },
};

/** Every rulebook ever shipped. Append only: an edition may refer to any of these ids for good. */
export const RULEBOOKS: RuleBook[] = [OSCARS_2027, SUNDANCE_2027, CLERMONT_2027, ANNIE_2027, CANNES_2027];

const byId = new Map(RULEBOOKS.map((b) => [b.id, b]));

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
