// The organizers' rulebooks, edition by edition: the data the types in rulebooks.ts describe (sources, statuses, notes
// and history rules there). Loaded with the festival and awards catalog through awards-rules.ts, not at startup: at
// startup the rules took the startup JavaScript to its 220 kB gzipped budget (November 9, 2026) before most categories
// had their organizer's rules, and the research continues category by category.
import type { CategoryRules, RuleBook, RuleSource, Ruled } from './rulebooks';

const CHECKED = '2026-11-06';
const PT = 'America/Los_Angeles';
const v = <T>(value: T, source: string, note?: string): Ruled<T> => ({ value, status: 'verified', source, note });
const proj = <T>(value: T, source: string, note: string): Ruled<T> => ({ value, status: 'projected', source, note });

// ---------------- Academy Awards, 99th (2027) ----------------

const OSCARS_SOURCES: RuleSource[] = [
  { id: 'aa99-rules', publisher: 'Academy of Motion Picture Arts and Sciences', title: '99th Oscars Complete Rules', url: 'https://www.oscars.org/sites/oscars/files/2026-05/99th_oscars_complete_rules.pdf', edition: '99th Academy Awards (2027)', retrieved: CHECKED },
  { id: 'aa99-shorts-festivals', publisher: 'Academy of Motion Picture Arts and Sciences', title: '99th Academy Awards Short Films Qualifying Festival List', url: 'https://www.oscars.org/sites/oscars/files/2026-05/99AA_Shorts%20Qualifying%20Festivals.pdf', edition: '99th Academy Awards (2027)', retrieved: CHECKED },
  { id: 'aa99-documentary-festivals', publisher: 'Academy of Motion Picture Arts and Sciences', title: '99th Academy Awards Documentary Feature Film Qualifying Festival List', url: 'https://www.oscars.org/sites/oscars/files/2026-04/99AA_Documentary%20Feature%20Qualifying%20Festivals.pdf', edition: '99th Academy Awards (2027)', retrieved: '2026-11-09' },
  { id: 'aa99-international-faq', publisher: 'Academy of Motion Picture Arts and Sciences', title: 'International Feature Film FAQs', url: 'https://www.oscars.org/sites/oscars/files/2026-07/99AA_International_Feature_FAQs.pdf', edition: '99th Academy Awards (2027)', retrieved: '2026-11-09' },
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
// From November 9, 2026 a festival's sections select and its prizes are awarded among them, so each names the section's
// top short-film prize (FESPACO's and IDFA's prizes weren't read: their sections can't qualify a short yet).
const OSCAR_SHORT_FESTIVALS = ['annecy:short-cristal', 'berlinale:shorts-golden-bear', 'cannes:short-palme', 'clermont:grand-prix', 'fespaco:shorts', 'hot-docs:audience', 'idfa:shorts', 'sitges:short', 'sxsw:shorts-jury', 'sundance:shorts-grand-jury', 'tiff:short-cuts-international', 'tiff:short-cuts-canadian', 'tiff:short-cuts-animated', 'venice:orizzonti-short'];
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
    // Rule Two's eligibility and the general deadline apply to every feature category (rosters, November 9, 2026).
    ...Object.fromEntries(['adapted-screenplay', 'casting', 'cinematography', 'costume', 'editing', 'makeup', 'score', 'song', 'musical', 'production-design', 'sound', 'visual-effects'].map((id) => [id, OSCAR_FEATURE])),
  },
};

/**
 * Version 2 (November 9, 2026): the qualifying-festival routes read from the Academy's own lists. Version 1's shorts
 * list named festival sections and audience awards the Academy doesn't list and admitted any win there; the documentary
 * feature had no festival route, and International Feature Film had no rules here, so it asked for a US theatrical
 * release. Editions created with version 1 keep it (adoptRulebook moves only untouched future editions).
 */
const OSCAR_SHORT_2: CategoryRules = {
  ...OSCAR_SHORT,
  release: v({ routes: ['theatrical'], countries: ['US'], festivalList: 'aa99-shorts' }, 'aa99-shorts-festivals',
    `${US_THEATRICAL_NOTE} Or an award on the Academy\u2019s list, won October 1, 2025 to September 30, 2026.`),
};
const OSCARS_2027_2: RuleBook = {
  ...OSCARS_2027, id: 'oscars-2027@2', version: 2, checked: '2026-11-09',
  categories: {
    ...OSCARS_2027.categories,
    'live-short': { ...OSCAR_SHORT_2, formats: OSCARS_2027.categories['live-short'].formats },
    'animated-short': { ...OSCAR_SHORT_2, mediums: OSCARS_2027.categories['animated-short'].mediums },
    'doc-short': OSCAR_SHORT_2,
    documentary: {
      ...OSCARS_2027.categories.documentary,
      release: v({ routes: ['theatrical'], countries: ['US'], festivalList: 'aa99-documentary', viaCategory: 'international' }, 'aa99-rules',
        `${US_THEATRICAL_NOTE} Or an award on the Academy\u2019s list, won October 1, 2025 to September 30, 2026, or an accepted International Feature Film entry.`),
      theatricalFirst: v({ countries: ['US'], unlessFestival: true }, 'aa99-rules', 'A listed award qualifies whatever was shown before.'),
    },
    international: {
      runtime: v({ over: 40 }, 'aa99-rules'),
      release: v({ routes: ['theatrical'], countries: [], outside: ['US'], festivalList: 'aa99-international' }, 'aa99-rules',
        'SLATE treats a theatrical release by a distributor as the required seven consecutive days in one venue. Or an award on the Academy\u2019s list.'),
      qualifying: v({ from: '2025-10-01', to: '2026-09-30' }, 'aa99-rules'),
      theatricalFirst: v({ countries: ['*'], unlessFestival: true }, 'aa99-rules', 'Not applied to a film qualifying by a listed award, which has no qualifying theatrical release.'),
      deadlines: v([{ date: '2026-09-30', time: '17:00', zone: PT }], 'aa99-rules'),
    },
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
    // The World Cinema competitions take international features under the same rules (sff27-submit, November 9, 2026).
    'world-dramatic': {
      runtime: v({ atLeast: 50 }, 'sff27-faq'),
      premiere: v('world-if-domestic', 'sff27-faq', SUNDANCE_ORIGIN_NOTE),
      completedFrom: v('2025-01-01', 'sff27-faq'),
      deadlines: sundanceDeadline('2026-09-21'),
    },
    'world-documentary': {
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
  // 'tv' became the age-group and limited-series categories for the 54th (roster, November 9, 2026).
  categories: Object.fromEntries(['feature', 'short', 'tv-preschool', 'tv-children', 'tv-mature', 'tv-limited', 'directing', 'writing', 'voice'].map((id) => [id, {
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
    // Orizzonti took shorts too until November 9, 2026; Orizzonti Corti is their section (Article 3.3).
    orizzonti: { ...common, runtime: mk({ atLeast: 60 }, 've83-reg', `Features at least 60 minutes, credits included.${p}`), deadlines: mk([{ date: `${year}-06-04`, ...time }], 've83-reg', `The time of day is not given; SLATE uses the end of the day in Venice.${p}`) },
    'orizzonti-corti': { ...common, runtimeShort: mk({ atMost: 20 }, 've83-reg', `Short films in competition at most 20 minutes, credits included.${p}`), deadlines: mk([{ date: `${year}-05-28`, ...time }], 've83-reg', `Shorts close May 28. The time of day is not given; SLATE uses the end of the day in Venice.${p}`) },
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

/**
 * Version 2 (November 9, 2026): the regulations of the five other sections, read on their own pages. Like the
 * Competition's, the pages name no edition year, so every rule is projected. Not modeled: "intended for theatrical
 * release", and Generation's audience, which the page's eligibility rules don't state (the catalog keeps its family need).
 */
const blSection = (page: string) => ({ id: `bl-${page}`, publisher: 'Internationale Filmfestspiele Berlin', title: `${page === 'berlinale-shorts' ? 'Berlinale Shorts' : page[0].toUpperCase() + page.slice(1)} Regulations`, url: `https://www.berlinale.de/en/film-entry/guidelines/${page}.html`, edition: 'Current regulations; the page names no edition year', retrieved: '2026-11-09' });
const blCommon = (src: string): CategoryRules => ({
  notShownIn: proj({ countries: ['DE'] }, src, 'Not presented publicly in Germany (undated regulations page, section 1).'),
  noTvOrOnline: proj(true, src, 'Neither broadcast on television nor presented on the internet or VOD (undated regulations page, section 1).'),
  completedFrom: proj('2026-02-10', src, 'Completed within the 12 months before the festival (undated regulations page, applied to the 2027 dates).'),
  noReentry: proj(true, src, 'Never submitted to the Berlinale for selection before (undated regulations page, section 1).'),
});
const blFeature = (src: string): CategoryRules => ({
  ...blCommon(src),
  runtime: proj({ atLeast: 60 }, src, 'At least 60 minutes (undated regulations page, section 1).'),
  premiere: proj('none', src, 'World, international or European premieres: SLATE checks the European rule below and Germany.'),
  europeanPremiere: proj(true, src, 'Not presented publicly in Europe outside the country of origin (undated regulations page, section 1).'),
});
const BERLINALE_2027_2: RuleBook = {
  ...BERLINALE_2027, id: 'berlinale-2027@2', version: 2, checked: '2026-11-09',
  sources: [...BERLINALE_2027.sources, ...['perspectives', 'panorama', 'forum', 'generation', 'berlinale-shorts'].map(blSection)],
  categories: {
    ...BERLINALE_2027.categories,
    perspectives: blFeature('bl-perspectives'), // the debut rule is the catalog's own requirement
    panorama: blFeature('bl-panorama'),
    forum: blFeature('bl-forum'),
    generation: { ...blFeature('bl-generation'), runtimeShort: proj({ atMost: 20 }, 'bl-generation', 'Shorts run at most 20 minutes (undated regulations page, section 1).') },
    shorts: {
      ...blCommon('bl-berlinale-shorts'),
      runtime: proj({ atMost: 30 }, 'bl-berlinale-shorts', 'At most 30 minutes (undated regulations page, section 1).'),
      premiere: proj('international', 'bl-berlinale-shorts', 'World or international premieres: not presented publicly outside the country of origin (undated regulations page).'),
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

/**
 * Version 2 (November 9, 2026): the 78th rules' general eligibility (Eligibility 1-17: the June 1 to May 31 year, a US
 * national platform, no general US theatrical release first, US production or co-production, entries by May 7) applies to
 * every category, so every entered Emmy category now reads it, not only the 13 read first. Eligibility 11c's episode
 * minimums apply where a category takes series only: six for animation, comedy, drama, variety, short form and reality
 * series, three for documentary and hosted nonfiction series. Categories that also take specials, movies or limited series
 * have no minimum here (the rule is per program, and a category's formats can't say which one is entered). Not modeled
 * yet, and said so in docs/world/RULEBOOK-AUDIT.md: guest performers' fewer than half of the episodes, the 2 to 20 minute
 * short form running time, 65 percent new animation, 35 percent of the music, voice-over's audience of 13 and over, and
 * the producer caps other than short form's six.
 */
const EMMY_PROGRAMS = ['animated-program', 'variety-series', 'variety-special-live', 'variety-special-recorded', 'short-form-series', 'short-form-nonfiction', 'documentary-special', 'hosted-nonfiction', 'documentary-merit', 'structured-reality', 'unstructured-reality', 'reality-competition'];
const EMMY_INDIVIDUAL = [
  'lead-actor-limited', 'lead-actress-limited', 'supporting-actor-comedy', 'supporting-actor', 'supporting-actor-limited', 'supporting-actress-comedy', 'supporting-actress', 'supporting-actress-limited',
  'guest-actor-comedy', 'guest-actor', 'guest-actress-comedy', 'guest-actress', 'short-form-performer', 'voice-over', 'reality-host',
  'directing-limited', 'directing-variety', 'directing-variety-special', 'directing-nonfiction', 'directing-reality',
  'writing-limited', 'writing-variety', 'writing-variety-special', 'writing-nonfiction', 'animation-individual',
  'production-design-contemporary', 'production-design-period', 'production-design-half-hour', 'production-design-variety', 'production-design-variety-special',
  'casting-comedy', 'casting-drama', 'casting-limited', 'casting-reality', 'choreography-variety', 'choreography-scripted',
  'cinematography-half-hour', 'cinematography-hour', 'cinematography-limited', 'cinematography-nonfiction', 'cinematography-reality',
  'costumes-period', 'costumes-fantasy', 'costumes-contemporary', 'costumes-variety',
  'editing-drama', 'editing-comedy', 'editing-limited', 'editing-variety', 'editing-nonfiction', 'editing-structured-reality', 'editing-unstructured-reality',
  'hairstyling-contemporary', 'hairstyling-period', 'hairstyling-variety', 'makeup-contemporary', 'makeup-period', 'makeup-variety', 'makeup-prosthetic',
  'lighting-series', 'lighting-special', 'title-design', 'motion-design', 'technical-direction-series', 'technical-direction-special',
  'music-series', 'music-limited', 'music-nonfiction', 'music-direction', 'original-music-lyrics', 'main-title-theme', 'music-supervision',
  'sound-editing-hour', 'sound-editing-half-hour', 'sound-editing-limited', 'sound-editing-nonfiction', 'sound-mixing-hour', 'sound-mixing-limited', 'sound-mixing-half-hour',
  'sound-mixing-variety', 'sound-mixing-nonfiction', 'sound-mixing-reality', 'vfx-season', 'vfx-episode', 'stunt-comedy', 'stunt-drama',
];
/** Categories that take series only (scripted series formats, or unscripted series of two or more episodes). */
const EMMY_SIX = [
  'variety-series', 'short-form-series', 'short-form-nonfiction', 'structured-reality', 'unstructured-reality', 'reality-competition',
  'supporting-actor-comedy', 'supporting-actor', 'supporting-actress-comedy', 'supporting-actress', 'guest-actor-comedy', 'guest-actor', 'guest-actress-comedy', 'guest-actress', 'short-form-performer',
  'directing-variety', 'writing-variety', 'production-design-variety', 'casting-comedy', 'casting-drama', 'choreography-variety', 'cinematography-half-hour', 'cinematography-hour',
  'costumes-variety', 'editing-drama', 'editing-comedy', 'hairstyling-variety', 'makeup-variety', 'lighting-series', 'technical-direction-series', 'music-series',
  'sound-editing-hour', 'sound-mixing-hour', 'stunt-comedy',
];
function emmys2(year: number, mk: typeof v): Record<string, CategoryRules> {
  const first = emmys(year, mk);
  const p = year === 2026 ? '' : ' From the 2025-2026 rules; the 2026-2027 rules are not published yet.';
  const { minEpisodes: _series, ...individual } = first.directing;
  void _series;
  const out: Record<string, CategoryRules> = {};
  for (const id of EMMY_PROGRAMS) out[id] = first.limited; // the general rules, to the credited producers
  for (const id of EMMY_INDIVIDUAL) out[id] = individual;
  const six = mk(6, 'em78-rules', `Eligibility 11c: six episodes must premiere by May 31.${p}`);
  for (const id of EMMY_SIX) out[id] = { ...out[id], minEpisodes: six };
  out['hosted-nonfiction'] = { ...out['hosted-nonfiction'], minEpisodes: mk(3, 'em78-rules', `Eligibility 11c: three episodes for hosted nonfiction series.${p}`) };
  out['short-form-series'] = { ...out['short-form-series'], recipients: mk({ credit: 'producer', max: 6 }, 'em78-rules', `Category 86: at most six entrants; petitions to exceed the cap aren't considered.${p}`) };
  return { ...out, ...first };
}
const EMMYS_2026_2: RuleBook = { ...EMMYS_2026, id: 'emmys-2026@2', version: 2, checked: '2026-11-09', categories: emmys2(2026, v) };
const EMMYS_2027_2: RuleBook = { ...EMMYS_2027, id: 'emmys-2027@2', version: 2, checked: '2026-11-09', categories: emmys2(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2025-2026 rules.')) as typeof v) };

/** Every rulebook ever shipped. Append only: an edition may refer to any of these ids for good. */
export const RULEBOOK_DATA: RuleBook[] = [
  OSCARS_2027, OSCARS_2027_2, SUNDANCE_2027, CLERMONT_2027, ANNIE_2027, CANNES_2027,
  ANNECY_2026, ANNECY_2027, VENICE_2026, VENICE_2027, BERLINALE_2027, GOLDEN_GLOBES_2027, EMMYS_2026, EMMYS_2027, SAN_SEBASTIAN_2026, SAN_SEBASTIAN_2027, EMMYS_2026_2, EMMYS_2027_2, BERLINALE_2027_2,
];
