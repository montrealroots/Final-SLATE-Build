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


// ---------------- Annecy 2026 (verified) and 2027 (projected) ----------------

const ANNECY_SOURCES: RuleSource[] = [
  { id: 'an26-features', publisher: 'CITIA, Annecy International Animation Film Festival', title: '2026 Terms and Conditions - Feature Films', url: 'https://www.annecyfestival.com/sites/default/files/2025-11/Annecy_Festival_2026_Feature_Films_Terms_and_Conditions.pdf', edition: 'Annecy 2026', retrieved: CHECKED },
  { id: 'an26-shorts', publisher: 'CITIA, Annecy International Animation Film Festival', title: '2026 Terms and Conditions - Short Films', url: 'https://www.annecyfestival.com/sites/default/files/2025-11/Annecy_Festival_2026_Short_Films_Terms_and_Conditions.pdf', edition: 'Annecy 2026', retrieved: CHECKED },
];
const PARIS = 'Europe/Paris';
const BEFORE_DAY = 'The document says "before" the date; SLATE closes entries at the end of the previous day in France.';

function annecy(year: number, mk: typeof v): Record<string, CategoryRules> {
  const projNote = year === 2026 ? undefined : 'From the 2026 terms; the 2027 terms are not published yet.';
  const note = (n?: string) => [n, projNote].filter(Boolean).join(' ') || undefined;
  return {
    features: {
      runtime: mk({ over: 60 }, 'an26-features', note('Over 60 minutes, credits included.')!),
      completedFrom: mk(`${year - 1}-01-02`, 'an26-features', note(`Completed after January 1, ${year - 1}.`)!),
      noReentry: mk(true, 'an26-features', note('Submitted for the first time.')!),
      notShownIn: mk({ countries: ['FR'], exceptAt: ['cannes'] }, 'an26-features', note('Selected features must not have been screened in France before the festival ends; the Cannes Film Festival is the exception.')!),
      deadlines: mk([{ date: `${year}-03-14`, time: '23:59', zone: PARIS, timeAssumed: true }], 'an26-features', note(BEFORE_DAY)!),
    },
    shorts: {
      runtime: mk({ under: 60 }, 'an26-shorts', note('Under 59 minutes 59 seconds, credits included.')!),
      completedFrom: mk(`${year - 1}-01-02`, 'an26-shorts', note(`Completed after January 1, ${year - 1}.`)!),
      noReentry: mk(true, 'an26-shorts', note('Submitted for the first time.')!),
      premiere: mk('none', 'an26-shorts', note('No premiere requirement for short films.')!),
      deadlines: mk([{ date: `${year}-02-14`, time: '23:59', zone: PARIS, timeAssumed: true }], 'an26-shorts', note(BEFORE_DAY)!),
    },
  };
}
const ANNECY_2026: RuleBook = { id: 'annecy-2026@1', institutionId: 'annecy', year: 2026, version: 1, checked: CHECKED, sources: ANNECY_SOURCES, categories: annecy(2026, v) };
const ANNECY_2027: RuleBook = {
  id: 'annecy-2027@1', institutionId: 'annecy', year: 2027, version: 1, checked: CHECKED, sources: ANNECY_SOURCES,
  categories: annecy(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 terms.')) as typeof v),
};

// ---------------- Venice: 83rd (2026, verified) and 84th (2027, projected) ----------------

const VENICE_SOURCES: RuleSource[] = [
  { id: 've83-reg', publisher: 'La Biennale di Venezia', title: 'Regulations - 83rd Venice International Film Festival', url: 'https://static.labiennale.org/files/cinema/2026/Documenti/regulations-83.pdf', edition: '83rd Venice International Film Festival (2026)', retrieved: CHECKED },
];
const ROME = 'Europe/Rome';
function venice(year: number, mk: typeof v): Record<string, CategoryRules> {
  const p = year === 2026 ? '' : ' From the 2026 regulations; the 2027 regulations are not published yet.';
  const common: CategoryRules = {
    premiere: mk('world', 've83-reg', `World premieres only: not shown to the public or press, nor at another festival, even at home.${p}`),
    noOtherFestival: mk(true, 've83-reg', `Not presented at any other festival or film event.${p}`),
    noOnline: mk(true, 've83-reg', `No commercial distribution or exhibition on the internet.${p}`),
    completedFrom: mk(`${year - 1}-09-07`, 've83-reg', `Completed after September 6, ${year - 1}.${p}`),
    noReentry: mk(true, 've83-reg', `Not presented in any form for selection at an earlier Venice edition.${p}`),
  };
  const time = { time: '23:59', zone: ROME, timeAssumed: true };
  return {
    competition: { ...common, runtime: mk({ atLeast: 60 }, 've83-reg', `At least 60 minutes, credits included.${p}`), deadlines: mk([{ date: `${year}-06-04`, ...time }], 've83-reg', `The time of day is not given; SLATE uses the end of the day in Venice.${p}`) },
    orizzonti: {
      ...common,
      runtime: mk({ atLeast: 60 }, 've83-reg', `Features at least 60 minutes, credits included.${p}`),
      runtimeShort: mk({ atMost: 20 }, 've83-reg', `Short films in competition at most 20 minutes, credits included.${p}`),
      deadlines: mk([{ date: `${year}-05-28`, ...time, formats: ['short', 'documentary-short'] }, { date: `${year}-06-04`, ...time }], 've83-reg', `Shorts close May 28, features June 4. The time of day is not given; SLATE uses the end of the day in Venice.${p}`),
    },
  };
}
const VENICE_2026: RuleBook = { id: 'venice-2026@1', institutionId: 'venice', year: 2026, version: 1, checked: CHECKED, sources: VENICE_SOURCES, opens: v('2026-02-09', 've83-reg'), categories: venice(2026, v) };
const VENICE_2027: RuleBook = { id: 'venice-2027@1', institutionId: 'venice', year: 2027, version: 1, checked: CHECKED, sources: VENICE_SOURCES, categories: venice(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 regulations.')) as typeof v) };

// ---------------- San Sebastián: 74th (2026, verified) and 75th (2027, projected) ----------------

const SS_SOURCE: RuleSource = { id: 'ss74-rules', publisher: 'Festival de San Sebastián', title: 'Rules and Regulations - 74th San Sebastian International Film Festival', url: 'https://www.sansebastianfestival.com/2026/film_registration/rules_and_regulations/1/23002/in', edition: '74th San Sebastian International Film Festival (2026)', retrieved: CHECKED };
function sanSebastian(year: number, mk: typeof v): Record<string, CategoryRules> {
  const p = year === 2026 ? '' : ' From the 2026 regulations; the 2027 regulations are not published yet.';
  return {
    official: {
      runtime: mk({ over: 60 }, 'ss74-rules', `Feature films over 60 minutes (II, article 2).${p}`),
      completedFrom: mk(`${year - 1}-09-18`, 'ss74-rules', `Produced in the 12 months before the festival starts (II, article 2).${p}`),
      noOtherFestival: mk(true, 'ss74-rules', `Not in any other festival before San Sebastián (II, article 7). The exceptions for FIAPF non-competitive festivals and national competitions at home aren't modeled, and films produced entirely in Spain must also be world premieres, which SLATE doesn't check separately.${p}`),
      noOnline: mk(true, 'ss74-rules', `Not on video-on-demand platforms before the festival (II, article 7).${p}`),
      deadlines: mk([{ date: `${year}-06-16`, time: '23:59', zone: 'Europe/Madrid', timeAssumed: true }], 'ss74-rules', `Films for pre-selection by June 16 (II, article 6); the festival may accept later entries. The time of day is not given; SLATE uses the end of the day in San Sebastián.${p}`),
    },
  };
}
const SAN_SEBASTIAN_2026: RuleBook = { id: 'san-sebastian-2026@1', institutionId: 'san-sebastian', year: 2026, version: 1, checked: CHECKED, sources: [SS_SOURCE], opens: v('2026-01-16', 'ss74-rules'), categories: sanSebastian(2026, v) };
const SAN_SEBASTIAN_2027: RuleBook = { id: 'san-sebastian-2027@1', institutionId: 'san-sebastian', year: 2027, version: 1, checked: CHECKED, sources: [SS_SOURCE], categories: sanSebastian(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 regulations.')) as typeof v) };

// ---------------- Berlinale 2027: Competition, projected ----------------

const BERLINALE_2027: RuleBook = {
  id: 'berlinale-2027@1', institutionId: 'berlinale', year: 2027, version: 1, checked: CHECKED,
  sources: [{ id: 'bl-competition', publisher: 'Internationale Filmfestspiele Berlin', title: 'Competition Regulations', url: 'https://www.berlinale.de/en/film-entry/guidelines/competition.html', edition: 'Current regulations; the page names no edition year', retrieved: CHECKED }],
  categories: {
    competition: {
      runtime: proj({ atLeast: 60 }, 'bl-competition', 'At least 60 minutes. The regulations page names no edition year, so its rules are shown as projected.'),
      premiere: proj('international', 'bl-competition', 'World or international premieres: not presented publicly outside the country of origin (undated regulations page).'),
      noTvOrOnline: proj(true, 'bl-competition', 'Neither broadcast on television nor presented on the internet or VOD (undated regulations page).'),
      completedFrom: proj('2026-02-10', 'bl-competition', 'Completed within the 12 months before the festival (undated regulations page, applied to the 2027 dates).'),
    },
  },
};

// ---------------- Golden Globes, 84th (2027) ----------------

const GG_SOURCE: RuleSource = { id: 'gg84-rules', publisher: 'Golden Globes', title: '84th Annual Golden Globes Eligibility and Consideration Rules (updated August 3, 2026)', url: 'https://goldenglobes.com/wp-content/uploads/2026/08/FINAL_84th-ANNUAL-GOLDEN-GLOBES-ELIGIBILITY-AND-CONSIDERATION-RULES_8_3_2026.pdf', edition: '84th Golden Globes (2027)', retrieved: CHECKED };
const GG_FILM: CategoryRules = {
  runtime: v({ atLeast: 70 }, 'gg84-rules', 'Feature-length scripted motion pictures, 70 minutes or longer.'),
  qualifying: v({ from: '2026-01-01', to: '2026-12-31' }, 'gg84-rules'),
  release: v({ routes: ['theatrical', 'digital'], countries: ['US'] }, 'gg84-rules', 'Released in commercial theaters or on pay-per-view (not subscription) in one of seven US metro areas for seven consecutive days; SLATE treats a US theatrical or digital release as that. A festival screening alone does not count.'),
  deadlines: v([{ date: '2026-12-02', time: '23:59', zone: PT, timeAssumed: true }], 'gg84-rules', 'The film must be on the voters\' viewing platform by December 2, 2026. The time of day is not given; SLATE uses the end of the day in Los Angeles.'),
};
const GG_TV: CategoryRules = {
  qualifying: v({ from: '2026-01-01', to: '2026-12-31' }, 'gg84-rules', 'The season\'s first episode first made available in the United States in 2026.'),
  release: v({ routes: ['broadcast', 'streaming', 'digital'], countries: ['US'] }, 'gg84-rules'),
  origin: v({ only: ['US'] }, 'gg84-rules', 'Programs produced principally outside the United States are eligible only as US co-productions; SLATE uses the production base.'),
  recipients: v({ credit: 'producer' }, 'gg84-rules'),
};
const GOLDEN_GLOBES_2027: RuleBook = {
  id: 'golden-globes-2027@1', institutionId: 'golden-globes', year: 2027, version: 1, checked: CHECKED, sources: [GG_SOURCE],
  categories: {
    drama: { ...GG_FILM, recipients: v({ credit: 'producer' }, 'gg84-rules', 'All accredited producers.') },
    comedy: { ...GG_FILM, recipients: v({ credit: 'producer' }, 'gg84-rules', 'All accredited producers.') },
    animated: { ...GG_FILM, mediums: v(['animation'], 'gg84-rules', 'At least 75 percent animation of the main characters; motion capture alone does not count. SLATE accepts animated projects and not hybrid ones.'), recipients: v({ credit: 'director-and-producer' }, 'gg84-rules', 'Directors, co-directors and accredited producers.') },
    director: GG_FILM,
    screenplay: GG_FILM,
    'tv-drama': GG_TV,
    'tv-comedy': GG_TV,
  },
};

// ---------------- Primetime Emmys: 78th (2026, verified) and 79th (2027, projected) ----------------

const EMMY_SOURCE: RuleSource = { id: 'em78-rules', publisher: 'Television Academy', title: '78th Emmy Awards 2025-2026 Rules and Procedures (version 4, April 7, 2026)', url: 'https://www.televisionacademy.com/rules', edition: '78th Primetime Emmy Awards (2026)', retrieved: CHECKED };
function emmys(year: number, mk: typeof v): Record<string, CategoryRules> {
  const p = year === 2026 ? '' : ' From the 2025-2026 rules; the 2026-2027 rules are not published yet.';
  const base: CategoryRules = {
    qualifying: mk({ from: `${year - 1}-06-01`, to: `${year}-05-31` }, 'em78-rules', `Premiere airing on a US national platform in the eligibility year.${p}`),
    release: mk({ routes: ['broadcast', 'streaming', 'digital'], countries: ['US'] }, 'em78-rules', p.trim() || undefined),
    tvFirst: mk({ countries: ['US'] }, 'em78-rules', `A general US theatrical release before airing rules a program out (SLATE doesn't model limited releases).${p}`),
    origin: mk({ only: ['US'] }, 'em78-rules', `Foreign productions are eligible only as US co-productions begun before production; SLATE uses the production base.${p}`),
    deadlines: mk([{ date: `${year}-05-07`, time: '23:59', zone: PT, timeAssumed: true }], 'em78-rules', `Entries close May 7. The time of day is not given; SLATE uses the end of the day in Los Angeles.${p}`),
    recipients: mk({ credit: 'producer' }, 'em78-rules', `Producers whose credit and functions support it.${p}`),
  };
  const series = { ...base, minEpisodes: mk(6, 'em78-rules', `Six episodes must premiere by May 31.${p}`) };
  const { recipients: _producers, ...individual } = series; // individual categories name the credited person, not producers
  void _producers;
  return {
    drama: series, comedy: series,
    limited: base,
    directing: individual, writing: individual, 'lead-actor': individual, 'lead-actress': individual,
    'directing-comedy': individual, 'writing-comedy': individual, 'lead-actor-comedy': individual, 'lead-actress-comedy': individual,
    movie: { ...base, runtime: mk({ atLeast: 75 }, 'em78-rules', `One part of at least 75 minutes.${p}`) },
    documentary: { ...base, minEpisodes: mk(3, 'em78-rules', `Three episodes for documentary series.${p}`) },
  };
}
const EMMYS_2026: RuleBook = { id: 'emmys-2026@1', institutionId: 'emmys', year: 2026, version: 1, checked: CHECKED, sources: [EMMY_SOURCE], categories: emmys(2026, v) };
const EMMYS_2027: RuleBook = { id: 'emmys-2027@1', institutionId: 'emmys', year: 2027, version: 1, checked: CHECKED, sources: [EMMY_SOURCE], categories: emmys(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2025-2026 rules.')) as typeof v) };

/** Every rulebook ever shipped. Append only: an edition may refer to any of these ids for good. */
export const RULEBOOKS: RuleBook[] = [
  OSCARS_2027, SUNDANCE_2027, CLERMONT_2027, ANNIE_2027, CANNES_2027,
  ANNECY_2026, ANNECY_2027, VENICE_2026, VENICE_2027, BERLINALE_2027, GOLDEN_GLOBES_2027, EMMYS_2026, EMMYS_2027, SAN_SEBASTIAN_2026, SAN_SEBASTIAN_2027,
];

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
