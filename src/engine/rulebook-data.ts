// The organizers' rulebooks, edition by edition: the data the types in rulebooks.ts describe (sources, statuses, notes
// and history rules there). Loaded with the festival and awards catalog through awards-rules.ts, not at startup: at
// startup the rules took the startup JavaScript to its 220 kB gzipped budget (November 9, 2026) before most categories
// had their organizer's rules, and the research continues category by category.
import type { CategoryRules, RuleBook, RuleSource, Ruled, RuntimeRule } from './rulebooks';

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

/**
 * Version 2 (November 9, 2026): "The regulations of the International Competition also apply to the Lab Competition except
 * article 11" (awards), so Lab reads them; the National Competition has its own regulations (French only), read the same
 * day: French production completed after October 1, 2025, under 60 minutes, no premiere rule, no resubmission, July 9 for
 * films finished in 2025 and October 1, 2026 for 2026 films (1.1, 2). The main production country is the one with 50
 * percent or more of the financing; SLATE uses the production base.
 */
const CF27_NATIONAL: RuleSource = { id: 'cf27-national', publisher: 'Sauve Qui Peut le Court Métrage', title: 'Règlement - compétition nationale 2027', url: 'https://www.lecourt-clermont.org/wp-content/uploads/2026/06/FR-Reglement-national-2027.pdf', edition: '49th Clermont-Ferrand International Short Film Festival (2027)', retrieved: '2026-11-09' };
const CLERMONT_2027_2: RuleBook = {
  ...CLERMONT_2027, id: 'clermont-2027@2', version: 2, checked: '2026-11-09', sources: [...CLERMONT_2027.sources, CF27_NATIONAL],
  categories: {
    ...CLERMONT_2027.categories,
    lab: CLERMONT_2027.categories.international,
    national: {
      runtime: v({ under: 60 }, 'cf27-national', 'Under 60 minutes (1.1).'),
      completedFrom: v('2025-10-02', 'cf27-national', 'French production completed after October 1, 2025 (1.1).'),
      premiere: v('none', 'cf27-national', 'No premiere rule (1.1).'),
      origin: v({ only: ['FR'] }, 'cf27-national', 'French production: the main production country holds 50 percent or more of the financing (1.1); SLATE uses the production base.'),
      noReentry: v(true, 'cf27-national', 'A film already submitted can\u2019t be entered again, even in a new version (1.1).'),
      deadlines: v([
        { date: '2026-07-09', time: '23:59', zone: 'Europe/Paris', ifCompletedBefore: '2026-01-01', timeAssumed: true },
        { date: '2026-10-01', time: '23:59', zone: 'Europe/Paris', timeAssumed: true },
      ], 'cf27-national', 'July 9 for films completed from October to December 2025, October 1 for films made in 2026 (2). The time of day is not given; SLATE uses the end of the day in France.'),
      recipients: v({ credit: 'director' }, 'cf27-national', 'Prizes go to the director.'),
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

/**
 * Version 2 (November 9, 2026): the call for submissions sets eligibility for the competition as a whole ("animated
 * productions released in the United States in 2026", with its exceptions, and the August 3 to November 30 window), so
 * every entered category held for the 54th reads it, not only the nine named first. Category definitions and individual
 * achievement rules are in the rules page, which didn't load from here (docs/world/RULEBOOK-AUDIT.md); they stay unread.
 */
const ANNIE_2027_2: RuleBook = {
  ...ANNIE_2027, id: 'annie-2027@2', version: 2, checked: '2026-11-09',
  categories: { ...ANNIE_2027.categories, ...Object.fromEntries(['feature-independent', 'special', 'fx-tv', 'fx-feature', 'character-animation-tv', 'character-animation-feature', 'character-animation-live', 'character-design-tv', 'character-design-feature', 'directing-tv', 'music-tv', 'music-feature', 'production-design-tv', 'production-design-feature', 'storyboarding-tv', 'storyboarding-feature', 'voice-tv', 'writing-tv', 'editorial-tv', 'editorial-feature'].map((id) => [id, ANNIE_2027.categories.feature])) },
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


/**
 * Version 2 (November 9, 2026): the Official Selection's feature sections, from the 2026 feature regulations (Article 4
 * applies to every section Article 3 lists: Competition, Un Certain Regard, Cannes Première, special screenings),
 * projected to 2027. Not modeled: Article 4's French theatrical release pledge for Competition films, and "an
 * international selection" (SLATE counts any earlier festival premiere, as for the shorts).
 */
const FDC26_FEATURES = { id: 'fdc26-features', publisher: 'Festival de Cannes', title: '2026 Regulations - Official Selection Feature Films', url: 'https://cdn.festival-cannes.com/media/uploads/2025/11/reglement_longs-metrages_2026_en.pdf', edition: '79th Festival de Cannes (2026)', retrieved: '2026-11-09' };
const CANNES_FEATURE: CategoryRules = {
  completedFrom: proj('2026-05-11', 'fdc26-features', 'Produced in the twelve months before the festival (2026 Article 4, applied to the 2027 dates).'),
  premiere: proj('international', 'fdc26-features', 'Not screened elsewhere than its home country (2026 Article 4).'),
  noOtherFestival: proj(true, 'fdc26-features', 'Not in another festival\u2019s international selection (2026 Article 4); SLATE treats any earlier festival premiere as one.'),
  noOnline: proj(true, 'fdc26-features', 'Not screened on the internet (2026 Article 4).'),
  deadlines: proj([{ date: '2027-03-13', time: '23:59', zone: 'Europe/Paris', timeAssumed: true }], 'fdc26-features', 'The 2026 deadline was March 13 (Article 10); the 2027 date is not announced.'),
};
const CANNES_2027_2: RuleBook = {
  ...CANNES_2027, id: 'cannes-2027@2', version: 2, checked: '2026-11-09', sources: [...CANNES_2027.sources, FDC26_FEATURES],
  categories: { ...CANNES_2027.categories, competition: CANNES_FEATURE, 'un-certain-regard': CANNES_FEATURE, 'cannes-premiere': CANNES_FEATURE, special: CANNES_FEATURE },
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

/**
 * Version 2 (November 9, 2026): the sections the 2026 terms name beyond Official. The feature terms apply "in all
 * categories: Official, Contrechamp, Midnight Specials, Annecy Presents" (section 2); the short film terms list Off-Limits
 * and Perspectives among their competitive categories (section 5); TV films and web series have their own regulations
 * (French only, section 2). Not modeled: one episode per series and no pilots (SLATE enters a project, not an episode).
 */
const AN26_TV: RuleSource = { id: 'an26-tv', publisher: 'CITIA, Annecy International Animation Film Festival', title: 'Règlement 2026 – Films de télévision', url: 'https://www.annecyfestival.com/sites/default/files/2025-11/Annecy_Festival_2026_Reglements_Films_de_TV.pdf', edition: 'Annecy 2026', retrieved: '2026-11-09' };
function annecy2(year: number, mk: typeof v): Record<string, CategoryRules> {
  const first = annecy(year, mk);
  const projNote = year === 2026 ? '' : ' From the 2026 regulations; the 2027 regulations are not published yet.';
  return {
    ...first,
    contrechamp: first.features,
    'off-limits': first.shorts,
    perspectives: first.shorts,
    tv: {
      completedFrom: mk(`${year - 1}-01-02`, 'an26-tv', `Completed after January 1, ${year - 1} (section 2).${projNote}`),
      noReentry: mk(true, 'an26-tv', `Submitted for the first time (section 2).${projNote}`),
      deadlines: mk([{ date: `${year}-02-14`, time: '23:59', zone: PARIS, timeAssumed: true }], 'an26-tv', `${BEFORE_DAY} Before February 15 (section 2).${projNote}`),
    },
  };
}
const ANNECY_2026_2: RuleBook = { ...ANNECY_2026, id: 'annecy-2026@2', version: 2, checked: '2026-11-09', sources: [...ANNECY_SOURCES, AN26_TV], categories: annecy2(2026, v) };
const ANNECY_2027_2: RuleBook = {
  ...ANNECY_2027, id: 'annecy-2027@2', version: 2, checked: '2026-11-09', sources: [...ANNECY_SOURCES, AN26_TV],
  categories: annecy2(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 terms.')) as typeof v),
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

/**
 * Version 2 (November 9, 2026): Article 3's criteria are the Official Selection's, so Out of Competition (3.2) and Venice
 * Spotlight (3.4: "provided their duration exceeds 60 minutes") take them too, with the features' June 4 deadline (7.1).
 * The Settimana Internazionale della Critica and the Giornate degli Autori are "independent and parallel sections" chosen
 * under their own associations' regulations (Article 5), which these regulations don't give: they stay on SLATE's rules.
 */
function venice2(year: number, mk: typeof v): Record<string, CategoryRules> {
  const first = venice(year, mk);
  const p = year === 2026 ? '' : ' From the 2026 regulations; the 2027 regulations are not published yet.';
  const { runtime: _features, ...common } = first.competition;
  void _features;
  return {
    ...first,
    'out-of-competition': common,
    spotlight: { ...common, runtime: mk({ over: 60 }, 've83-reg', `Longer than 60 minutes (Article 3.4).${p}`) },
  };
}
/**
 * Version 3 (November 9, 2026): the Giornate degli Autori's own regulations for its 23rd edition (2026), Article 2: longer
 * than 60 minutes, produced after September 30, 2025, European films world premieres, not at another international
 * festival, not released in cinemas, on home video or online, entries by June 15. SLATE counts any earlier festival
 * premiere as one, which also covers the European world-premiere rule; a film refused at the 2025 selection is ineligible,
 * for which SLATE refuses any earlier Venice entry. The Settimana Internazionale della Critica's site didn't answer (HTTP
 * 503); it stays on SLATE's rules.
 */
const GDA26: RuleSource = { id: 'gda26-reg', publisher: 'Giornate degli Autori (ANAC and 100autori)', title: 'Regulation and Entry Form - 23rd Giornate degli Autori', url: 'https://www.giornatedegliautori.com/?p=381', edition: '23rd Giornate degli Autori (2026)', retrieved: '2026-11-09' };
function giornate(year: number, mk: typeof v): CategoryRules {
  const p = year === 2026 ? '' : ' From the 2026 regulations; the 2027 regulations are not published yet.';
  return {
    runtime: mk({ over: 60 }, 'gda26-reg', `Features and documentaries longer than 60 minutes (Article 2).${p}`),
    completedFrom: mk(`${year - 1}-10-01`, 'gda26-reg', `Produced after September 30, ${year - 1} (Article 2).${p}`),
    noOtherFestival: mk(true, 'gda26-reg', `Not at another international festival or major film event (Article 2); SLATE counts any earlier festival premiere.${p}`),
    unreleased: mk(true, 'gda26-reg', `Not released in cinemas, on home video or online (Article 2).${p}`),
    noReentry: mk(true, 'gda26-reg', `Not refused at the previous edition's selection (Article 2); SLATE refuses any earlier Venice entry.${p}`),
    deadlines: mk([{ date: `${year}-06-15`, time: '23:59', zone: ROME, timeAssumed: true }], 'gda26-reg', `Entries by June 15 (Article 2). The time of day is not given; SLATE uses the end of the day in Venice.${p}`),
  };
}
const VENICE_2026_2: RuleBook = { ...VENICE_2026, id: 'venice-2026@2', version: 2, checked: '2026-11-09', categories: venice2(2026, v) };
const VENICE_2027_2: RuleBook = { ...VENICE_2027, id: 'venice-2027@2', version: 2, checked: '2026-11-09', categories: venice2(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 regulations.')) as typeof v) };

const VENICE_2026_3: RuleBook = { ...VENICE_2026_2, id: 'venice-2026@3', version: 3, sources: [...VENICE_SOURCES, GDA26], categories: { ...VENICE_2026_2.categories, giornate: giornate(2026, v) } };
const VENICE_2027_3: RuleBook = { ...VENICE_2027_2, id: 'venice-2027@3', version: 3, sources: [...VENICE_SOURCES, GDA26], categories: { ...VENICE_2027_2.categories, giornate: giornate(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 regulations.')) as typeof v) } };

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

/**
 * Version 2 (November 9, 2026): the regulations' section II applies to every section, since "All films submitted will be
 * considered for any of the Festival sections making up the programme" (II, article 3), so New Directors, Horizontes
 * Latinos, Zabaltegi-Tabakalera, Perlak, Culinary Zinema and Velodrome read it too. The FAQ adds that there has been no open
 * entry for short films since 2025, which the over-60-minutes rule already gives Zabaltegi's shorts. The sections' own
 * guidelines, which article 2 mentions but the page doesn't reproduce, weren't found; the catalog keeps its own section
 * requirements (debut, Latin America, food).
 */
function sanSebastian2(year: number, mk: typeof v): Record<string, CategoryRules> {
  const first = sanSebastian(year, mk);
  return { ...first, ...Object.fromEntries(['new-directors', 'horizontes', 'zabaltegi', 'perlak', 'culinary', 'velodrome'].map((id) => [id, first.official])) };
}
const SAN_SEBASTIAN_2026_2: RuleBook = { ...SAN_SEBASTIAN_2026, id: 'san-sebastian-2026@2', version: 2, checked: '2026-11-09', categories: sanSebastian2(2026, v) };
const SAN_SEBASTIAN_2027_2: RuleBook = { ...SAN_SEBASTIAN_2027, id: 'san-sebastian-2027@2', version: 2, checked: '2026-11-09', categories: sanSebastian2(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 regulations.')) as typeof v) };

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

/**
 * Version 2 (November 9, 2026): every entered category reads its part of the rules. Film acting, score and song take the
 * motion picture rules (A.1); Non-English Language takes A.3.c (first released in its country of origin for seven days
 * in 2026, no US release needed, submitted once); Cinematic and Box Office Achievement takes the film rules (B; the $150
 * million threshold is the catalog's box-office requirement, which reads a theatrical release, recorded as a gap); the
 * television limited series and acting categories take the television rules (C). Not modeled: A.1.c, that a film must
 * also be submitted for Best Motion Picture to be eligible for the individual awards (except non-English and low-budget
 * independent films), and the acting rules that exclude voice-only and cameo performances (A.3.d).
 */
const { recipients: _ggProducers, ...GG_TV_INDIVIDUAL } = GG_TV;
void _ggProducers;
const GOLDEN_GLOBES_2027_2: RuleBook = {
  ...GOLDEN_GLOBES_2027, id: 'golden-globes-2027@2', version: 2, checked: '2026-11-09',
  categories: {
    ...GOLDEN_GLOBES_2027.categories,
    ...Object.fromEntries(['actress-drama', 'actor-drama', 'actress-comedy', 'actor-comedy', 'supporting-actress', 'supporting-actor', 'score', 'song', 'box-office'].map((id) => [id, GG_FILM])),
    'non-english': {
      ...GG_FILM,
      release: v({ routes: ['theatrical'], countries: ['origin'] }, 'gg84-rules', 'First released in its country of origin for at least seven consecutive days in 2026 (A.3.c.vi); no US release is needed (viii). SLATE uses the production base as the country of origin and a theatrical release there as the run.'),
      noReentry: v(true, 'gg84-rules', 'Submitted only once (A.3.c.vii).'),
      recipients: v({ credit: 'director-and-producer' }, 'gg84-rules', 'Given to the directors and the individual producers accredited by the Producers Guild (A.3.i.ii).'),
    },
    'tv-limited': GG_TV,
    ...Object.fromEntries(['tv-actress-drama', 'tv-actor-drama', 'tv-actress-comedy', 'tv-actor-comedy', 'tv-actress-limited', 'tv-actor-limited', 'tv-supporting-actress', 'tv-supporting-actor'].map((id) => [id, GG_TV_INDIVIDUAL])),
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

// ---------------- Sitges: 59th (2026, verified) and 60th (2027, projected) ----------------

/**
 * Read November 9, 2026: the 2026 Regulations, section I (each in-competition section's conditions), and the 2026 Rules,
 * section II (the deadline). Not modeled: the Official Selection's rule that films produced entirely in Spain be world
 * premieres; "not publicly screened or broadcast via streaming platforms operating in European territory" (SLATE refuses
 * any earlier online release); Anima't shorts must be unreleased in Catalonia (SLATE checks Spain); Panorama's
 * "independent productions"; the Programming Committee's exceptions for films shown at another Spanish festival.
 */
const SITGES_SOURCES: RuleSource[] = [
  { id: 'sg26-reg', publisher: 'Fundació Sitges Festival Internacional de Cinema de Catalunya', title: 'Sitges 2026 Regulations', url: 'https://sitgesfilmfestival.com/sites/default/files/2026-02/SIFFFC%202026_Regulations_ENG_23F.pdf', edition: '59th Sitges Film Festival (2026)', retrieved: '2026-11-09' },
  { id: 'sg26-rules', publisher: 'Fundació Sitges Festival Internacional de Cinema de Catalunya', title: 'Sitges 2026 Rules (entry fees and deadlines)', url: 'https://sitgesfilmfestival.com/sites/default/files/2026-02/SIFFFC%202026_Rules_ENG.pdf', edition: '59th Sitges Film Festival (2026)', retrieved: '2026-11-09' },
];
function sitges(year: number, mk: typeof v): Record<string, CategoryRules> {
  const p = year === 2026 ? '' : ' From the 2026 regulations; the 2027 regulations are not published yet.';
  const deadline = mk([{ date: `${year}-07-16`, time: '12:00', zone: 'Europe/Madrid' }], 'sg26-rules', `No films after noon on July 16 (Rules II; the document says CET, SLATE uses local time in Sitges).${p}`);
  const produced = mk(`${year - 1}-01-01`, 'sg26-reg', `Produced in ${year - 1} or ${year} (I, 1.1).${p}`);
  const spain = mk({ countries: ['ES'] }, 'sg26-reg', `Previously unreleased in Spain (I, 1.1).${p}`);
  const section: CategoryRules = { completedFrom: produced, notShownIn: spain, deadlines: deadline };
  return {
    fantastic: {
      ...section,
      completedFrom: mk(`${year - 1}-10-08`, 'sg26-reg', `Features produced in the 12 months before the festival opens (I, 1.1.1; applied to the ${year} dates). Shorts may be from ${year - 1}, which SLATE doesn't separate.${p}`),
      runtime: mk({ atLeast: 60 }, 'sg26-reg', `Features at least 60 minutes (I, 1.1.1).${p}`),
      runtimeShort: mk({ atMost: 30 }, 'sg26-reg', `Shorts at most 30 minutes (I, 1.1.1).${p}`),
      noOnline: mk(true, 'sg26-reg', `Not screened or streamed on platforms operating in Europe before the festival (I, 1.1.1); SLATE refuses any earlier online release.${p}`),
    },
    animat: { ...section, runtimeShort: mk({ atMost: 30 }, 'sg26-reg', `Shorts at most 30 minutes (I, 1.1.3).${p}`) },
    'noves-visions': section,
    panorama: section,
    midnight: { completedFrom: produced, deadlines: deadline },
    documenta: section,
  };
}
const SITGES_2026: RuleBook = { id: 'sitges-2026@1', institutionId: 'sitges', year: 2026, version: 1, checked: '2026-11-09', sources: SITGES_SOURCES, categories: sitges(2026, v) };
const SITGES_2027: RuleBook = { id: 'sitges-2027@1', institutionId: 'sitges', year: 2027, version: 1, checked: '2026-11-09', sources: SITGES_SOURCES, categories: sitges(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 regulations.')) as typeof v) };

// ---------------- IDFA: 39th (2026, verified) and 40th (2027, projected) ----------------

/**
 * Read November 9, 2026: the 39th edition's Festival Entry Regulations (1.1 deadlines, 1.2 eligibility, 2.4 sections).
 * Not modeled: Dutch productions in the short competition must be world premieres (2.4.4); IDFA's private-screening
 * exception for premiere status.
 */
const IDFA_SOURCE: RuleSource = { id: 'idfa39-reg', publisher: 'IDFA', title: 'Festival Entry Regulations - 39th IDFA', url: 'https://professionals.idfa.nl/program/festival-entries/festival-entry-regulations/', edition: '39th IDFA (2026)', retrieved: '2026-11-09' };
function idfa(year: number, mk: typeof v): Record<string, CategoryRules> {
  const p = year === 2026 ? '' : ' From the 2026 regulations; the 2027 regulations are not published yet.';
  const common: CategoryRules = {
    completedFrom: mk(`${year - 1}-07-11`, 'idfa39-reg', `Completed after July 10, ${year - 1} (1.2).${p}`),
    notShownIn: mk({ countries: ['NL'] }, 'idfa39-reg', `Not screened, broadcast or online in the Netherlands before the festival (1.2).${p}`),
    europeanPremiere: mk(true, 'idfa39-reg', `World, international or European premiere (2.4).${p}`),
    deadlines: mk([{ date: `${year}-07-09`, time: '23:59', zone: 'Europe/Amsterdam', timeAssumed: true }], 'idfa39-reg', `Final entry deadline July 9 (1.1). The time of day is not given; SLATE uses the end of the day in Amsterdam.${p}`),
  };
  const over = (n: number, where: string) => mk({ over: n }, 'idfa39-reg', `Over ${n} minutes (${where}).${p}`);
  return {
    features: { ...common, runtime: over(60, '2.4.1, International Competition') },
    envision: { ...common, runtime: over(40, '2.4.1, Envision Competition') },
    luminous: { ...common, runtime: over(40, '2.4.2; shorts only by invitation') },
    frontlight: { ...common, runtime: over(40, '2.4.2; shorts only by invitation') },
    shorts: { ...common, runtime: mk({ atMost: 40 }, 'idfa39-reg', `Up to 40 minutes (2.4.4).${p}`) },
  };
}
const IDFA_2026: RuleBook = { id: 'idfa-2026@1', institutionId: 'idfa', year: 2026, version: 1, checked: '2026-11-09', sources: [IDFA_SOURCE], categories: idfa(2026, v) };
const IDFA_2027: RuleBook = { id: 'idfa-2027@1', institutionId: 'idfa', year: 2027, version: 1, checked: '2026-11-09', sources: [IDFA_SOURCE], categories: idfa(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 regulations.')) as typeof v) };

// ---------------- Hot Docs 2027 ----------------

/**
 * Read November 9, 2026: the Submit A Film page for the 2027 festival (April 23 to May 2, 2027). Not modeled: the Ontario
 * premiere for features, mid-lengths and series and the Toronto premiere for shorts (SLATE records releases by country,
 * not province or city), and the English or English-subtitled requirement.
 */
const HOTDOCS_SOURCE: RuleSource = { id: 'hd27-submit', publisher: 'Hot Docs', title: 'Submit A Film (2027 Festival)', url: 'https://hotdocs.ca/industry/submit-a-film', edition: '2027 Hot Docs Festival', retrieved: '2026-11-09' };
const HOT_DOCS_2027: RuleBook = {
  id: 'hot-docs-2027@1', institutionId: 'hot-docs', year: 2027, version: 1, checked: '2026-11-09', sources: [HOTDOCS_SOURCE],
  categories: {
    festival: {
      completedFrom: v('2026-01-02', 'hd27-submit', 'Completed after January 1, 2026.'),
      noOnline: v(true, 'hd27-submit', 'Not available online to audiences in Ontario before the festival, broadcast versions included; a short available online is no longer a Toronto premiere. SLATE refuses any earlier online release.'),
      deadlines: v([{ date: '2027-01-04', time: '23:59', zone: 'America/Toronto', timeAssumed: true }], 'hd27-submit', 'The late deadline; early October 29 and regular December 10, 2026 cost less. The time of day is not given; SLATE uses the end of the day in Toronto.'),
    },
  },
};

// ---------------- Canadian Screen Awards: 2026 (verified) and 2027 (projected) ----------------

/**
 * Read November 9, 2026: the 2026 Film Rules & Regulations (sections II, V, VI, XX) and Television & Digital Media Rules &
 * Regulations (sections II, V). The 2027 rules aren't published; 2027 carries the 2026 rules a year forward, projected. The
 * 2026 entry deadline (November 3, 2025) had passed when a game starts, so the 2026 edition is closed to new entries, as it
 * was. Not modeled: five screening dates with one in Montreal, Toronto or Vancouver (SLATE: a Canadian theatrical
 * release); the Academy's list of approved streaming services (SLATE: a Canadian streaming release); first public
 * exposure within 1.5 years of the period; minority co-productions only where Canadians are credited; citizenship of
 * nominees (since 2026, Canadian citizens or permanent residents only in certified productions).
 */
const CSA_SOURCES: RuleSource[] = [
  { id: 'csa26-film', publisher: 'Academy of Canadian Cinema & Television', title: '2026 Canadian Screen Awards Film Rules & Regulations', url: 'https://www.academy.ca/wp-content/uploads/2025/09/2026-Canadian-Screen-Awards-Film-Rules-Regulations.pdf', edition: '2026 Canadian Screen Awards', retrieved: '2026-11-09' },
  { id: 'csa26-tv', publisher: 'Academy of Canadian Cinema & Television', title: '2026 Canadian Screen Awards Television & Digital Media Rules & Regulations', url: 'https://www.academy.ca/wp-content/uploads/2025/09/2026-Canadian-Screen-Awards-Television-Digital-Media-Rules-Regulations.pdf', edition: '2026 Canadian Screen Awards', retrieved: '2026-11-09' },
];
const CSA_FEATURES = ['film', 'art-direction', 'makeup', 'costume', 'hair', 'cinematography', 'direction', 'editing', 'score', 'song', 'lead-drama', 'lead-comedy', 'supporting-drama', 'supporting-comedy', 'voice-film', 'visual-effects', 'sound-mixing', 'sound-editing', 'original-screenplay', 'adapted-screenplay', 'stunts-film', 'casting-film', 'first-feature', 'golden-screen-film'];
const CSA_TV = ['tv-donald-brittain-award-for-best-social-political-', 'tv-documentary-program', 'tv-direction-documentary-program', 'tv-movie', 'drama', 'tv-comedy-series', 'tv-comedy-special', 'tv-reality-competition-program-or-series', 'tv-sketch-comedy-show-ensemble-performance', 'tv-live-entertainment-special', 'tv-history-documentary-program-or-series', 'tv-talk-series', 'tv-rob-stewart-award-for-best-science-or-nature-doc', 'tv-biography-or-arts-documentary-program-or-series', 'tv-childrens-or-youth-animated-program-or-series', 'tv-pre-school-program-or-series', 'tv-childrens-or-youth-fiction-program-or-series', 'tv-childrens-or-youth-non-fiction-program-or-series', 'tv-factual-series', 'tv-web-program-or-series-fiction', 'tv-web-program-or-series-non-fiction', 'tv-lead-performance-web-program-or-series', 'tv-supporting-performance-web-program-or-series', 'tv-direction-web-program-or-series', 'tv-writing-web-program-or-series', 'tv-host-web-program-or-series', 'tv-picture-editing-web-program-or-series', 'tv-direction-tv-movie', 'tv-direction-drama-series', 'tv-direction-variety-or-sketch-comedy', 'tv-direction-comedy', 'tv-direction-documentary-series', 'tv-direction-childrens-or-youth', 'tv-direction-animation', 'tv-direction-reality-competition', 'tv-direction-factual', 'tv-writing-tv-movie', 'tv-writing-drama-series', 'tv-writing-comedy', 'tv-writing-lifestyle-or-reality-competition', 'tv-writing-documentary', 'tv-writing-childrens-or-youth', 'tv-writing-variety-or-sketch-comedy', 'tv-writing-childrens-or-youth-animation', 'tv-writing-factual', 'tv-writing-pre-school', 'tv-photography-drama', 'tv-photography-comedy', 'tv-photography-lifestyle-or-reality-competition', 'tv-photography-documentary-or-factual', 'tv-picture-editing-drama', 'tv-picture-editing-factual', 'tv-picture-editing-documentary', 'tv-picture-editing-reality-competition', 'tv-picture-editing-comedy', 'tv-picture-editing-childrens-or-youth', 'tv-sound-fiction', 'tv-sound-animation', 'tv-sound-documentary-or-factual', 'tv-sound-lifestyle-reality-or-entertainment', 'tv-production-design-or-art-direction-fiction', 'tv-production-design-or-art-direction-non-fiction', 'tv-costume-design', 'tv-achievement-in-make-up', 'tv-visual-effects', 'tv-achievement-in-hair', 'tv-original-music-animation', 'tv-original-music-drama', 'tv-original-music-comedy', 'tv-original-music-documentary', 'tv-original-music-factual-lifestyle-reality-or-ente', 'tv-original-music-original-song', 'tv-lead-performer-tv-movie', 'tv-lead-performer-drama-series', 'tv-guest-performance-drama-series', 'tv-supporting-performer-drama', 'tv-stunt-coordination', 'tv-ensemble-performance-comedy', 'tv-supporting-performer-childrens-or-youth', 'tv-lead-performer-childrens-or-youth', 'tv-achievement-in-casting-fiction', 'tv-voice-performance', 'tv-host-or-presenter-factual-or-reality-competition', 'tv-lead-performer-comedy', 'tv-supporting-performer-comedy', 'tv-guest-performance-comedy', 'tv-achievement-in-casting-non-fiction']; // television's documentary programs included
function canadianScreen(year: number, mk: typeof v): Record<string, CategoryRules> {
  const p = year === 2026 ? '' : ' From the 2026 rules, a year on; the 2027 rules are not published yet.';
  const deadline = (src: string) => mk([{ date: `${year - 1}-11-03`, time: '23:59', zone: 'America/Toronto', timeAssumed: true }], src, `Final entry deadline November 3 (section II). The time of day is not given; SLATE uses the end of the day in Toronto.${p}`);
  const once = (src: string) => mk(true as const, src, `Not entered at an earlier Canadian Screen Awards (section V).${p}`);
  const film: CategoryRules = {
    qualifying: mk({ from: `${year - 1}-01-01`, to: `${year}-03-31` }, 'csa26-film', `Publicly exhibited January 1, ${year - 1} to March 31, ${year} (section VI).${p}`),
    release: mk({ routes: ['theatrical', 'streaming'], countries: ['CA'] }, 'csa26-film', `First commercial release in Canada in cinemas or on an approved streaming service (sections V, VI). SLATE treats a Canadian theatrical or streaming release as that.${p}`),
    noReentry: once('csa26-film'),
    deadlines: deadline('csa26-film'),
  };
  const tv: CategoryRules = {
    qualifying: mk({ from: `${year - 2}-09-01`, to: `${year - 1}-11-15` }, 'csa26-tv', `Made available in Canada September 1, ${year - 2} to November 15, ${year - 1} (section V).${p}`),
    release: mk({ routes: ['broadcast', 'streaming', 'digital'], countries: ['CA'] }, 'csa26-tv', `Broadcast or made available in Canada (section V).${p}`),
    noReentry: once('csa26-tv'),
    deadlines: deadline('csa26-tv'),
  };
  const runtime = (r: RuntimeRule, note: string): CategoryRules => ({ ...film, runtime: mk(r, 'csa26-film', `${note} (section XX, definitions).${p}`) });
  return {
    ...Object.fromEntries(CSA_FEATURES.map((id) => [id, runtime({ atLeast: 60 }, 'Feature films run at least 60 minutes')])),
    documentary: runtime({ over: 45 }, 'Feature documentaries run more than 45 minutes'),
    'short-documentary': runtime({ under: 45 }, 'Short documentaries run less than 45 minutes'),
    'short-drama': runtime({ atMost: 59 }, 'Live action short dramas run at most 59 minutes'),
    'short-animated': runtime({ atMost: 59 }, 'Animated shorts run at most 59 minutes'),
    ...Object.fromEntries(CSA_TV.map((id) => [id, tv])),
  };
}
const CANADIAN_SCREEN_2026: RuleBook = { id: 'canadian-screen-2026@1', institutionId: 'canadian-screen', year: 2026, version: 1, checked: '2026-11-09', sources: CSA_SOURCES, categories: canadianScreen(2026, v) };
const CANADIAN_SCREEN_2027: RuleBook = { id: 'canadian-screen-2027@1', institutionId: 'canadian-screen', year: 2027, version: 1, checked: '2026-11-09', sources: CSA_SOURCES, categories: canadianScreen(2027, ((value: unknown, source: string, note?: string) => proj(value, source, note ?? 'From the 2026 rules.')) as typeof v) };

// ---------------- Goya Awards, 41st (2027) ----------------

/**
 * Read November 9, 2026: the Bases of the 41st Premios Goya, section 3.1 (features) and 5.1 (deadlines). Best European
 * Film, Best Ibero-American Film and the three short film awards follow their own specific Bases (section 2), not read;
 * they stay on SLATE's rules. Not modeled: the seven consecutive days in one cinema (three for documentaries), the ICAA
 * rating before release, and the earlier July 28 deadline for films released January to June (SLATE uses September 9).
 */
const GOYA41: RuleSource = { id: 'goya41-bases', publisher: 'Academia de las Artes y las Ciencias Cinematográficas de España', title: 'Bases de los 41 Premios Goya', url: 'https://www.premiosgoya.com/pdfs/bases-de-los-41-premios-goya/', edition: '41st Goya Awards (2027)', retrieved: '2026-11-09' };
const GOYA_FEATURE: CategoryRules = {
  runtime: v({ atLeast: 60 }, 'goya41-bases', 'Fiction and animated features at least 60 minutes (3.1).'),
  qualifying: v({ from: '2026-01-01', to: '2026-12-31' }, 'goya41-bases', 'Released commercially in Spain in 2026 (3.1).'),
  release: v({ routes: ['theatrical'], countries: ['ES'] }, 'goya41-bases', 'In Spanish cinemas, in the original version, with tickets on sale (3.1); SLATE treats a Spanish theatrical release as the run.'),
  theatricalFirst: v({ countries: ['*'] }, 'goya41-bases', 'Not available online before its release in cinemas, unless as part of a festival (3.1.e).'),
  noReentry: v(true, 'goya41-bases', 'Not in an earlier edition of the Goyas (3.1.b).'),
  deadlines: v([{ date: '2026-09-09', time: '14:00', zone: 'Europe/Madrid' }], 'goya41-bases', 'Materials before 14:00 on September 9 for films released July to December (5.1); films released January to June were due July 28, which SLATE doesn\u2019t separate.'),
};
const GOYA_2027: RuleBook = {
  id: 'goya-2027@1', institutionId: 'goya', year: 2027, version: 1, checked: '2026-11-09', sources: [GOYA41],
  categories: {
    ...Object.fromEntries(['film', 'animated', 'director', 'new-director', 'screenplay', 'adapted-screenplay', 'actor', 'actress', 'supporting-actor', 'supporting-actress', 'new-actor', 'new-actress', 'score', 'song', 'production-management', 'cinematography', 'editing', 'art-direction', 'costume', 'makeup', 'sound', 'effects'].map((id) => [id, GOYA_FEATURE])),
    ...Object.fromEntries(['documentary'].map((id) => [id, { ...GOYA_FEATURE, runtime: v({ atLeast: 70 }, 'goya41-bases', 'Feature documentaries at least 70 minutes (3.1).') }])),
  },
};

/** Every rulebook ever shipped. Append only: an edition may refer to any of these ids for good. */
export const RULEBOOK_DATA: RuleBook[] = [
  OSCARS_2027, OSCARS_2027_2, SUNDANCE_2027, CLERMONT_2027, ANNIE_2027, CANNES_2027,
  ANNECY_2026, ANNECY_2027, VENICE_2026, VENICE_2027, BERLINALE_2027, GOLDEN_GLOBES_2027, EMMYS_2026, EMMYS_2027, SAN_SEBASTIAN_2026, SAN_SEBASTIAN_2027, EMMYS_2026_2, EMMYS_2027_2, BERLINALE_2027_2, CANNES_2027_2, ANNECY_2026_2, ANNECY_2027_2, VENICE_2026_2, VENICE_2027_2, SAN_SEBASTIAN_2026_2, SAN_SEBASTIAN_2027_2, GOLDEN_GLOBES_2027_2, ANNIE_2027_2, CLERMONT_2027_2, SITGES_2026, SITGES_2027, VENICE_2026_3, VENICE_2027_3, IDFA_2026, IDFA_2027, HOT_DOCS_2027, CANADIAN_SCREEN_2026, CANADIAN_SCREEN_2027, GOYA_2027,
];
