// Festivals and awards. Institutions are real names. Where an organizer's rules for an edition were read, they are
// applied from versioned rulebooks (rulebooks.ts) and labelled official or projected; everything else uses SIMULATED
// game rules modeled on each event's general shape. Dates are official only where docs/DATA-PROVENANCE.md cites an
// announcement; all others are generated once per edition from a seasonal window and saved, so reloading never moves them.

import { getPlace } from '../data/places';
import { ledgerTotals, money, spend } from './budget';
import { genre } from './genres';
import { personById } from './people';
import { approvedScenes as approvedScenesOf, isEpisodic, isNonfiction } from './projects';
import { travelHours } from './state';
import { gaussian, intBetween, pick, stream, unit } from './rng';
import { addLog, onNewGame, registerCommitmentSource, registerHandler, schedule, type HandlerResult } from './state';
import { DAY, addDaysToKey, dateKey, formatDateKey, localParts, localToInstant, parseYmd, weekdayOfKey, ymd } from './time';
import type { Credit, Edition, EditionEntry, Format, GameState, Medium, Project, RivalFilm, Screening } from './types';
import { currentRulebook, rulebook, type CategoryRules, type DeadlineRule, type RuleBook, type RuntimeRule } from './rulebooks';

export type Recipient = 'project' | 'director' | 'writer' | 'lead' | 'supporting' | 'producer' | 'voice' | 'ensemble';
export type Judging = 'programmers' | 'jury' | 'members' | 'audience';

export interface Category {
  id: string;
  name: string;
  recipient: Recipient;
  formats: Format[];
  mediums?: Medium[];
  runtime?: [number, number];
  judging: Judging;
  slots: number;
  competitive: boolean;
  fee: number;
  actingTitle?: 'Actor' | 'Actress';
  genres?: string[]; // at least one of these genre ids required
  excludeGenres?: string[];
  premiere?: 'world' | 'international' | 'none';
  /** First and last edition years the organizer held this category, where it hasn't always existed. */
  years?: [number, number];
}

export interface Institution {
  id: string;
  name: string;
  short: string;
  kind: 'festival' | 'award';
  placeId: string;
  /** Seasonal window for the start (festival) or ceremony (award): month, first day, last day. */
  window: [number, number, number];
  duration: number;
  cadence: 1 | 2;
  cadenceParity?: 0 | 1; // for biennial events: year % 2
  eligibility: 'premiere' | 'prior-year' | 'jun-may' | 'oct-sep';
  origin?: string[]; // production base countries allowed
  requiresRelease?: { routes: string[]; countries?: string[] };
  prestige: number; // rival strength (simulation assumption)
  categories: Category[];
  /** Dates the organizer announced. A missing deadline means it wasn't confirmed: a planning deadline is used and labelled. */
  official?: Record<number, { start: string; end: string; deadline?: string; opens?: string; label?: string; source: string; checked?: string }>;
  description: string;
  ordinalBase?: number;
}

const FILM: Format[] = ['feature'];
const SHORTS: Format[] = ['short', 'documentary-short'];
const DOCS: Format[] = ['documentary-feature'];
const SERIES: Format[] = ['series', 'limited-series', 'anthology-series', 'web-series'];
const ONGOING: Format[] = ['series', 'anthology-series', 'web-series'];
const DOC_SERIES: Format[] = ['documentary-series', 'unscripted-series'];
const COMEDY_MUSICAL = ['comedy', 'musical', 'romantic-comedy', 'action-comedy', 'buddy-comedy', 'screwball-comedy', 'slapstick', 'farce', 'parody', 'satire', 'black-comedy', 'stoner-comedy', 'horror-comedy', 'backstage-musical', 'jukebox-musical'];
const GENRE_FANTASTIC = ['horror', 'fantasy', 'science-fiction', 'dark-fantasy', 'cosmic-horror', 'slasher', 'zombie', 'vampire', 'werewolf', 'creature-feature', 'monster-movie', 'kaiju', 'body-horror', 'folk-horror', 'gothic-horror', 'psychological-horror', 'supernatural', 'occult', 'splatter', 'cyberpunk', 'space-opera', 'time-travel', 'giallo', 'sword-and-sorcery', 'science-fantasy', 'horror-comedy', 'eco-horror'];

const C = (id: string, name: string, recipient: Recipient, formats: Format[], judging: Judging, slots: number, extra: Partial<Category> = {}): Category => ({
  id, name, recipient, formats, judging, slots, competitive: true, fee: 0, ...extra,
});

/** The categories an edition actually holds. Lookups by ID use the full list, so older saves keep their entries. */
export function categoriesFor(inst: Institution, year: number): Category[] {
  return inst.categories.filter((c) => !c.years || (year >= c.years[0] && year <= c.years[1]));
}

const AFRICA = ['NG', 'BF', 'KE', 'ZA', 'EG', 'MA', 'GH', 'SN'];
const EUROPE = ['GB', 'IE', 'FR', 'DE', 'ES', 'IT', 'NL', 'CH', 'CZ', 'SE', 'NO', 'DK', 'MC'];

export const INSTITUTIONS: Institution[] = [
  {
    id: 'sundance', name: 'Sundance Film Festival', short: 'Sundance', kind: 'festival', placeId: 'us-boulder', window: [1, 20, 27], duration: 11, cadence: 1, eligibility: 'premiere', prestige: 66,
    official: { 2027: { start: '2027-01-21', end: '2027-01-31', source: 'https://www.cu.edu/node/348345', checked: '2026-11-06' } },
    description: 'An independent film festival in January with dramatic, documentary, short and episodic programs.',
    categories: [
      C('dramatic', 'Dramatic Competition', 'project', FILM, 'programmers', 16, { fee: 100, premiere: 'world' }),
      C('documentary', 'Documentary Competition', 'project', DOCS, 'programmers', 16, { fee: 100, premiere: 'world' }),
      C('shorts', 'Short Film Program', 'project', SHORTS, 'programmers', 40, { fee: 60, premiere: 'international' }),
      C('episodic', 'Episodic Program', 'project', [...SERIES, ...DOC_SERIES], 'programmers', 6, { fee: 80, competitive: false, premiere: 'world' }),
    ],
  },
  {
    id: 'berlinale', name: 'Berlin International Film Festival', short: 'Berlinale', kind: 'festival', placeId: 'de-berlin', window: [2, 10, 16], duration: 11, cadence: 1, eligibility: 'premiere', prestige: 70,
    official: { 2027: { start: '2027-02-10', end: '2027-02-21', label: '77th Berlin International Film Festival', source: 'https://www.berlinale.de/en/2027/news-press-releases/278428.html', checked: '2026-11-06' } },
    description: 'A February festival with a main competition, a panorama of audience favorites and short films.',
    categories: [
      C('competition', 'Competition', 'project', [...FILM, ...DOCS], 'jury', 20, { fee: 100, premiere: 'world' }),
      C('panorama', 'Panorama Audience Award', 'project', [...FILM, ...DOCS], 'audience', 30, { fee: 100, premiere: 'international' }),
      C('shorts', 'Short Film Competition', 'project', SHORTS, 'jury', 20, { fee: 60, premiere: 'world' }),
    ],
  },
  {
    id: 'cannes', name: 'Cannes Film Festival', short: 'Cannes', kind: 'festival', placeId: 'fr-cannes', window: [5, 12, 19], duration: 12, cadence: 1, eligibility: 'premiere', prestige: 76,
    official: { 2027: { start: '2027-05-11', end: '2027-05-22', label: '80th Cannes Film Festival', source: 'https://www.screendaily.com/news/cannes-film-festival-confirms-2027-dates-for-80th-edition/5217448.article', checked: '2026-11-06' } },
    description: 'A May festival with a main competition, out-of-competition screenings and a short film competition.',
    categories: [
      C('competition', 'Competition', 'project', FILM, 'jury', 21, { fee: 150, premiere: 'world' }),
      C('special', 'Special Screenings', 'project', [...FILM, ...DOCS], 'programmers', 12, { fee: 150, competitive: false, premiere: 'world' }),
      C('shorts', 'Short Film Competition', 'project', ['short'], 'jury', 10, { fee: 60, premiere: 'world' }),
    ],
  },
  {
    id: 'annecy', name: 'Annecy International Animation Film Festival', short: 'Annecy', kind: 'festival', placeId: 'fr-annecy', window: [6, 8, 15], duration: 7, cadence: 1, eligibility: 'premiere', prestige: 68,
    description: 'A June festival dedicated to animation, with feature, short and television competitions.',
    categories: [
      C('features', 'Feature Film Competition', 'project', [...FILM, ...DOCS], 'jury', 10, { mediums: ['animation', 'hybrid'], fee: 80, premiere: 'international' }),
      C('shorts', 'Short Film Competition', 'project', SHORTS, 'jury', 40, { mediums: ['animation', 'hybrid'], fee: 40, premiere: 'none' }),
      C('tv', 'Television Competition', 'project', [...SERIES, 'tv-film'], 'jury', 12, { mediums: ['animation', 'hybrid'], fee: 60, premiere: 'none' }),
    ],
  },
  {
    id: 'venice', name: 'Venice International Film Festival', short: 'Venice', kind: 'festival', placeId: 'it-venice', window: [8, 26, 31], duration: 11, cadence: 1, eligibility: 'premiere', prestige: 74,
    description: 'A late-summer festival with a main competition and an out-of-competition program.',
    categories: [
      C('competition', 'Competition', 'project', FILM, 'jury', 21, { fee: 120, premiere: 'world' }),
      C('orizzonti', 'Horizons', 'project', [...FILM, ...DOCS, 'short'], 'jury', 18, { fee: 100, premiere: 'world' }),
    ],
  },
  {
    id: 'tiff', name: 'Toronto International Film Festival', short: 'TIFF', kind: 'festival', placeId: 'ca-toronto', window: [9, 3, 10], duration: 11, cadence: 1, eligibility: 'premiere', prestige: 68,
    description: 'A September festival whose audience award is decided by festival audiences.',
    categories: [
      C('peoples-choice', "People's Choice Award", 'project', [...FILM, ...DOCS], 'audience', 60, { fee: 120, premiere: 'international' }),
      C('shorts', 'Short Cuts', 'project', SHORTS, 'programmers', 40, { fee: 60, premiere: 'international' }),
    ],
  },
  {
    id: 'san-sebastian', name: 'San Sebastián International Film Festival', short: 'San Sebastián', kind: 'festival', placeId: 'es-san-sebastian', window: [9, 17, 24], duration: 9, cadence: 1, eligibility: 'premiere', prestige: 66,
    description: 'A September festival in the Basque Country with an official competition.',
    categories: [C('official', 'Official Selection', 'project', FILM, 'jury', 16, { fee: 90, premiere: 'international' })],
  },
  {
    id: 'busan', name: 'Busan International Film Festival', short: 'Busan', kind: 'festival', placeId: 'kr-busan', window: [9, 29, 30], duration: 10, cadence: 1, eligibility: 'premiere', prestige: 63,
    description: 'An autumn festival with a competition and a large program of new work.',
    categories: [C('competition', 'Competition', 'project', [...FILM, ...DOCS], 'jury', 12, { fee: 80, premiere: 'international' }), C('shorts', 'Short Films', 'project', SHORTS, 'programmers', 30, { fee: 40, premiere: 'none' })],
  },
  {
    id: 'sitges', name: 'Sitges Film Festival', short: 'Sitges', kind: 'festival', placeId: 'es-sitges', window: [10, 2, 9], duration: 10, cadence: 1, eligibility: 'premiere', prestige: 60,
    description: 'An October festival of fantastic and horror cinema.',
    categories: [C('fantastic', 'Fantastic Competition', 'project', [...FILM, 'short'], 'jury', 24, { fee: 70, genres: GENRE_FANTASTIC, premiere: 'none' })],
  },
  {
    id: 'idfa', name: 'International Documentary Film Festival Amsterdam', short: 'IDFA', kind: 'festival', placeId: 'nl-amsterdam', window: [11, 12, 19], duration: 11, cadence: 1, eligibility: 'premiere', prestige: 66,
    official: { 2026: { start: '2026-11-12', end: '2026-11-22', source: 'https://festival.idfa.nl/en/idfa-2026-2/', checked: '2026-11-06' } },
    description: 'A November documentary festival with feature and short competitions.',
    categories: [
      C('features', 'Feature Documentary Competition', 'project', [...DOCS, ...DOC_SERIES], 'jury', 16, { fee: 80, premiere: 'international' }),
      C('shorts', 'Short Documentary Competition', 'project', ['documentary-short'], 'jury', 16, { fee: 40, premiere: 'international' }),
    ],
  },
  {
    id: 'hot-docs', name: 'Hot Docs Canadian International Documentary Festival', short: 'Hot Docs', kind: 'festival', placeId: 'ca-toronto', window: [4, 23, 30], duration: 11, cadence: 1, eligibility: 'premiere', prestige: 60,
    description: 'An April documentary festival with an audience award.',
    categories: [C('audience', 'Audience Award', 'project', [...DOCS, 'documentary-short'], 'audience', 40, { fee: 60, premiere: 'none' })],
  },
  {
    id: 'clermont', name: 'Clermont-Ferrand International Short Film Festival', short: 'Clermont-Ferrand', kind: 'festival', placeId: 'fr-clermont-ferrand', window: [1, 30, 31], duration: 9, cadence: 1, eligibility: 'premiere', prestige: 62,
    official: { 2027: { start: '2027-01-29', end: '2027-02-06', deadline: '2026-09-24', label: '49th Clermont-Ferrand International Short Film Festival', source: 'https://www.lecourt-clermont.org/wp-content/uploads/2026/06/EN-Reglement-international-2027.pdf', checked: '2026-11-06' } },
    description: 'A short film festival in late January and early February.',
    categories: [C('international', 'International Competition', 'project', SHORTS, 'jury', 75, { fee: 0, premiere: 'none' })],
  },
  {
    id: 'sxsw', name: 'SXSW Film & TV Festival', short: 'SXSW', kind: 'festival', placeId: 'us-austin', window: [3, 6, 13], duration: 9, cadence: 1, eligibility: 'premiere', prestige: 60,
    official: { 2027: { start: '2027-03-13', end: '2027-03-21', source: 'https://sxsw.com/wp-content/uploads/2026/04/SXSW-Announces-2027-Dates.pdf', checked: '2026-11-06' } },
    description: 'A March festival with narrative, documentary, short and episodic programs and audience awards.',
    categories: [
      C('narrative', 'Narrative Feature Competition', 'project', FILM, 'jury', 10, { fee: 90, premiere: 'world' }),
      C('documentary', 'Documentary Feature Competition', 'project', DOCS, 'jury', 10, { fee: 90, premiere: 'world' }),
      C('episodic', 'Episodic Pilot Competition', 'project', [...SERIES, ...DOC_SERIES], 'audience', 12, { fee: 70, premiere: 'world' }),
      C('shorts', 'Short Film Competition', 'project', SHORTS, 'jury', 40, { fee: 50, premiere: 'none' }),
    ],
  },
  {
    id: 'series-mania', name: 'Series Mania', short: 'Series Mania', kind: 'festival', placeId: 'fr-lille', window: [3, 19, 27], duration: 8, cadence: 1, eligibility: 'premiere', prestige: 62,
    description: 'A March festival for television series.',
    categories: [C('international', 'International Competition', 'project', [...SERIES, ...DOC_SERIES], 'jury', 10, { fee: 0, premiere: 'international' })],
  },
  {
    id: 'locarno', name: 'Locarno Film Festival', short: 'Locarno', kind: 'festival', placeId: 'ch-locarno', window: [8, 5, 8], duration: 11, cadence: 1, eligibility: 'premiere', prestige: 64,
    description: 'An August festival with an international competition and a large open-air audience.',
    categories: [C('concorso', 'International Competition', 'project', FILM, 'jury', 17, { fee: 80, premiere: 'world' })],
  },
  {
    id: 'fespaco', name: 'FESPACO', short: 'FESPACO', kind: 'festival', placeId: 'bf-ouagadougou', window: [2, 22, 28], duration: 8, cadence: 2, cadenceParity: 1, eligibility: 'premiere', prestige: 60,
    origin: AFRICA, description: 'The Pan-African film and television festival, held every two years in Ouagadougou. In this game, entries need an African production base.',
    categories: [
      C('fiction', 'Feature Fiction Competition', 'project', FILM, 'jury', 20, { fee: 0, premiere: 'none' }),
      C('documentary', 'Documentary Competition', 'project', DOCS, 'jury', 15, { fee: 0, premiere: 'none' }),
      C('shorts', 'Short Film Competition', 'project', SHORTS, 'jury', 20, { fee: 0, premiere: 'none' }),
      C('series', 'Series Competition', 'project', SERIES, 'jury', 8, { fee: 0, premiere: 'none' }),
    ],
    official: { 2027: { start: '2027-03-20', end: '2027-03-27', deadline: '2026-10-20', opens: '2026-02-24', source: 'https://fespaco.bf/en/call-for-entries-fespaco-2027/' } },
  },
  // ---------------- Awards ----------------
  {
    id: 'oscars', name: 'Academy Awards', short: 'Oscars', kind: 'award', placeId: 'us-los-angeles', window: [3, 1, 15], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 80, ordinalBase: 1928,
    requiresRelease: { routes: ['theatrical'], countries: ['US'] },
    description: 'Annual film awards voted by Academy members. In this game, features need a theatrical release in the United States during the eligibility year; shorts need a festival award or a US theatrical release.',
    categories: [
      C('picture', 'Best Picture', 'producer', FILM, 'members', 10),
      C('director', 'Best Director', 'director', FILM, 'members', 5),
      C('screenplay', 'Best Original Screenplay', 'writer', FILM, 'members', 5),
      C('actor', 'Best Actor In A Leading Role', 'lead', FILM, 'members', 5, { actingTitle: 'Actor' }),
      C('actress', 'Best Actress In A Leading Role', 'lead', FILM, 'members', 5, { actingTitle: 'Actress' }),
      C('supporting-actor', 'Best Actor In A Supporting Role', 'supporting', FILM, 'members', 5, { actingTitle: 'Actor' }),
      C('supporting-actress', 'Best Actress In A Supporting Role', 'supporting', FILM, 'members', 5, { actingTitle: 'Actress' }),
      C('animated', 'Best Animated Feature Film', 'producer', FILM, 'members', 5, { mediums: ['animation'] }),
      C('documentary', 'Best Documentary Feature Film', 'producer', DOCS, 'members', 5),
      C('live-short', 'Best Live Action Short Film', 'producer', ['short'], 'members', 5, { mediums: ['live-action', 'hybrid'] }),
      C('animated-short', 'Best Animated Short Film', 'producer', ['short'], 'members', 5, { mediums: ['animation'] }),
      C('doc-short', 'Best Documentary Short Film', 'producer', ['documentary-short'], 'members', 5),
    ],
    official: {
      2027: { start: '2027-03-14', end: '2027-03-14', deadline: '2026-11-14', label: '99th Academy Awards', source: 'https://press.oscars.org/news/academy-and-abc-announce-show-dates-99th-and-100th-oscarsr' },
      2028: { start: '2028-03-05', end: '2028-03-05', deadline: '2027-11-13', label: '100th Academy Awards', source: 'https://press.oscars.org/news/academy-and-abc-announce-show-dates-99th-and-100th-oscarsr' },
    },
  },
  {
    id: 'bafta-film', name: 'BAFTA Film Awards', short: 'BAFTA Film', kind: 'award', placeId: 'gb-london', window: [2, 14, 23], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 76,
    requiresRelease: { routes: ['theatrical'], countries: ['GB'] },
    description: 'Annual film awards. In this game, entries need a UK theatrical release during the eligibility year.',
    categories: [
      C('film', 'Best Film', 'producer', FILM, 'members', 5), C('director', 'Director', 'director', FILM, 'members', 6),
      C('screenplay', 'Original Screenplay', 'writer', FILM, 'members', 5), C('leading-actor', 'Leading Actor', 'lead', FILM, 'members', 6, { actingTitle: 'Actor' }),
      C('leading-actress', 'Leading Actress', 'lead', FILM, 'members', 6, { actingTitle: 'Actress' }), C('animated', 'Animated Film', 'producer', FILM, 'members', 4, { mediums: ['animation'] }),
      C('documentary', 'Documentary', 'producer', DOCS, 'members', 5),
    ],
  },
  {
    id: 'bafta-tv', name: 'BAFTA Television Awards', short: 'BAFTA TV', kind: 'award', placeId: 'gb-london', window: [5, 4, 15], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 72,
    requiresRelease: { routes: ['broadcast', 'streaming'], countries: ['GB'] },
    description: 'Annual television awards. In this game, entries need a UK broadcast or streaming release during the eligibility year.',
    categories: [
      C('drama', 'Drama Series', 'producer', ['series', 'anthology-series', 'web-series'], 'jury', 4), C('limited', 'Limited Drama', 'producer', ['limited-series'], 'jury', 4),
      C('factual', 'Factual Series', 'producer', DOC_SERIES, 'jury', 4), C('leading-actor', 'Leading Actor', 'lead', SERIES, 'jury', 6, { actingTitle: 'Actor' }),
      C('leading-actress', 'Leading Actress', 'lead', SERIES, 'jury', 6, { actingTitle: 'Actress' }),
    ],
  },
  {
    id: 'golden-globes', name: 'Golden Globe Awards', short: 'Golden Globes', kind: 'award', placeId: 'us-los-angeles', window: [1, 4, 12], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 72,
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast'], countries: ['US'] },
    official: { 2027: { start: '2027-01-10', end: '2027-01-10', label: '84th Golden Globe Awards', source: 'https://www.paramountpressexpress.com/cbs-entertainment/shows/84th-annual-golden-globes/about/', checked: '2026-11-06' } },
    description: 'Annual film and television awards. Film comedy and musical work competes separately from drama.',
    categories: [
      C('drama', 'Best Motion Picture, Drama', 'producer', FILM, 'members', 6, { excludeGenres: COMEDY_MUSICAL }),
      C('comedy', 'Best Motion Picture, Musical Or Comedy', 'producer', FILM, 'members', 6, { genres: COMEDY_MUSICAL }),
      C('animated', 'Best Motion Picture, Animated', 'producer', FILM, 'members', 6, { mediums: ['animation'] }),
      C('director', 'Best Director, Motion Picture', 'director', FILM, 'members', 6), C('screenplay', 'Best Screenplay, Motion Picture', 'writer', FILM, 'members', 6),
      C('tv-drama', 'Best Television Series, Drama', 'producer', SERIES, 'members', 6, { excludeGenres: COMEDY_MUSICAL }),
      C('tv-comedy', 'Best Television Series, Musical Or Comedy', 'producer', SERIES, 'members', 6, { genres: COMEDY_MUSICAL }),
    ],
  },
  {
    id: 'emmys', name: 'Primetime Emmy Awards', short: 'Emmys', kind: 'award', placeId: 'us-los-angeles', window: [9, 13, 21], duration: 1, cadence: 1, eligibility: 'jun-may', prestige: 74,
    requiresRelease: { routes: ['broadcast', 'streaming'], countries: ['US'] },
    description: 'Annual US television awards. In this game, entries need a US broadcast or streaming release between June 1 and May 31.',
    categories: [
      C('drama', 'Outstanding Drama Series', 'producer', ['series', 'anthology-series', 'web-series'], 'members', 7, { excludeGenres: COMEDY_MUSICAL }),
      C('comedy', 'Outstanding Comedy Series', 'producer', ['series', 'anthology-series', 'web-series'], 'members', 7, { genres: COMEDY_MUSICAL }),
      C('limited', 'Outstanding Limited Or Anthology Series', 'producer', ['limited-series', 'anthology-series'], 'members', 5),
      // The Television Academy splits these by drama and comedy (limited series have their own, not modeled here).
      C('directing', 'Outstanding Directing For A Drama Series', 'director', ONGOING, 'members', 6, { excludeGenres: COMEDY_MUSICAL }),
      C('writing', 'Outstanding Writing For A Drama Series', 'writer', ONGOING, 'members', 6, { excludeGenres: COMEDY_MUSICAL }),
      C('lead-actor', 'Outstanding Lead Actor In A Drama Series', 'lead', ONGOING, 'members', 6, { actingTitle: 'Actor', excludeGenres: COMEDY_MUSICAL }),
      C('lead-actress', 'Outstanding Lead Actress In A Drama Series', 'lead', ONGOING, 'members', 6, { actingTitle: 'Actress', excludeGenres: COMEDY_MUSICAL }),
      C('directing-comedy', 'Outstanding Directing For A Comedy Series', 'director', ONGOING, 'members', 6, { genres: COMEDY_MUSICAL }),
      C('writing-comedy', 'Outstanding Writing For A Comedy Series', 'writer', ONGOING, 'members', 6, { genres: COMEDY_MUSICAL }),
      C('lead-actor-comedy', 'Outstanding Lead Actor In A Comedy Series', 'lead', ONGOING, 'members', 6, { actingTitle: 'Actor', genres: COMEDY_MUSICAL }),
      C('lead-actress-comedy', 'Outstanding Lead Actress In A Comedy Series', 'lead', ONGOING, 'members', 6, { actingTitle: 'Actress', genres: COMEDY_MUSICAL }),
      // Renamed Outstanding Movie for the 78th Emmys (2025-2026 Rules and Procedures, category 82); older editions keep the old name.
      C('tv-movie', 'Outstanding Television Movie', 'producer', ['tv-film'], 'members', 5, { years: [1900, 2025] }),
      C('movie', 'Outstanding Movie', 'producer', ['tv-film'], 'members', 5, { years: [2026, 9999] }),
      C('documentary', 'Outstanding Documentary Or Nonfiction Series', 'producer', DOC_SERIES, 'members', 5),
    ],
  },
  {
    id: 'international-emmys', name: 'International Emmy Awards', short: 'International Emmys', kind: 'award', placeId: 'us-new-york', window: [11, 20, 25], duration: 1, cadence: 1, eligibility: 'oct-sep', prestige: 66,
    requiresRelease: { routes: ['broadcast', 'streaming'] },
    official: { 2026: { start: '2026-11-23', end: '2026-11-23', label: '54th International Emmy Awards', source: 'https://en.unifrance.org/news/17531/the-nominations-for-french-audiovisual-productions-at-the-54th-international-emmy-awards', checked: '2026-11-06' } },
    description: 'Annual awards for television made outside the United States. In this game, entries need a production base outside the US and a broadcast or streaming release.',
    origin: ['CA', 'MX', 'BR', 'AR', 'GB', 'IE', 'FR', 'MC', 'DE', 'ES', 'IT', 'NL', 'CH', 'CZ', 'SE', 'NO', 'DK', 'TR', 'EG', 'MA', 'NG', 'BF', 'KE', 'ZA', 'AE', 'SA', 'IN', 'JP', 'KR', 'CN', 'AU', 'NZ'],
    categories: [
      C('drama', 'Drama Series', 'producer', ['series', 'limited-series', 'anthology-series'], 'jury', 4, { excludeGenres: COMEDY_MUSICAL }),
      C('comedy', 'Comedy', 'producer', ['series', 'web-series'], 'jury', 4, { genres: COMEDY_MUSICAL }),
      C('tv-movie', 'TV Movie Or Mini-Series', 'producer', ['tv-film', 'limited-series'], 'jury', 4), C('documentary', 'Documentary', 'producer', [...DOC_SERIES, 'documentary-feature'], 'jury', 4),
      C('actor', 'Best Performance By An Actor', 'lead', [...SERIES, 'tv-film'], 'jury', 4, { actingTitle: 'Actor' }),
      C('actress', 'Best Performance By An Actress', 'lead', [...SERIES, 'tv-film'], 'jury', 4, { actingTitle: 'Actress' }),
    ],
  },
  {
    id: 'annie', name: 'Annie Awards', short: 'Annies', kind: 'award', placeId: 'us-los-angeles', window: [2, 15, 28], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 66,
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast', 'digital'] },
    official: { 2027: { start: '2027-02-20', end: '2027-02-20', label: '54th Annie Awards', source: 'https://www.cartoonbrew.com/awards/annie-award-submissions-open-anime-category-265121.html', checked: '2026-11-06' } },
    description: 'Annual animation awards with feature, short, television and individual achievement categories.',
    categories: [
      C('feature', 'Best Feature', 'producer', FILM, 'members', 5, { mediums: ['animation', 'hybrid'] }),
      C('short', 'Best Short Subject', 'producer', SHORTS, 'members', 5, { mediums: ['animation', 'hybrid'] }),
      C('tv', 'Best TV Or Media Production', 'producer', [...SERIES, 'tv-film'], 'members', 5, { mediums: ['animation', 'hybrid'] }),
      C('directing', 'Directing In A Feature Production', 'director', FILM, 'members', 5, { mediums: ['animation', 'hybrid'] }),
      C('writing', 'Writing In A Feature Production', 'writer', FILM, 'members', 5, { mediums: ['animation', 'hybrid'] }),
      C('voice', 'Voice Acting In A Feature Production', 'voice', FILM, 'members', 5, { mediums: ['animation', 'hybrid'] }),
    ],
  },
  {
    id: 'spirit', name: 'Film Independent Spirit Awards', short: 'Spirit Awards', kind: 'award', placeId: 'us-los-angeles', window: [2, 21, 28], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 64,
    requiresRelease: { routes: ['theatrical', 'streaming', 'festival-premiere', 'digital'] },
    official: { 2027: { start: '2027-03-06', end: '2027-03-06', deadline: '2026-12-02', label: '42nd Film Independent Spirit Awards', source: 'https://www.filmindependent.org/press-releases/film-independent-spirit-awards-announces-2027-and-2028-dates/', checked: '2026-11-06' } },
    description: 'Annual awards for independent film and television. Performance categories are gender-neutral. In this game, commissioned projects are not eligible.',
    categories: [
      C('feature', 'Best Feature', 'producer', FILM, 'members', 5), C('director', 'Best Director', 'director', FILM, 'members', 5),
      C('screenplay', 'Best Screenplay', 'writer', FILM, 'members', 5), C('lead', 'Best Lead Performance', 'lead', FILM, 'members', 10),
      C('supporting', 'Best Supporting Performance', 'supporting', FILM, 'members', 10), C('documentary', 'Best Documentary Feature', 'producer', DOCS, 'members', 5),
      C('series', 'Best New Scripted Series', 'producer', SERIES, 'members', 5),
    ],
  },
  {
    id: 'gotham', name: 'Gotham Awards', short: 'Gothams', kind: 'award', placeId: 'us-new-york', window: [12, 1, 3], duration: 1, cadence: 1, eligibility: 'oct-sep', prestige: 62,
    requiresRelease: { routes: ['theatrical', 'streaming', 'festival-premiere', 'digital', 'broadcast'] },
    official: { 2026: { start: '2026-11-30', end: '2026-11-30', label: '36th Gotham Film Awards', source: 'https://thegotham.org/press/dates-set-3rd-annual-gotham-television-awards-36th-annual-gotham-film-awards/', checked: '2026-11-06' } },
    description: 'Annual awards for independent film. Performance categories are gender-neutral. Series awards moved to separate television awards in 2024.',
    categories: [
      C('feature', 'Best Feature', 'producer', FILM, 'jury', 5), C('documentary', 'Best Documentary Feature', 'producer', DOCS, 'jury', 5),
      C('lead', 'Outstanding Lead Performance', 'lead', FILM, 'jury', 10), C('series', 'Breakthrough Series', 'producer', SERIES, 'jury', 5, { years: [2015, 2023] }), // moved to the Gotham TV Awards in 2024
    ],
  },
  {
    id: 'dga', name: 'Directors Guild Of America Awards', short: 'DGA Awards', kind: 'award', placeId: 'us-los-angeles', window: [2, 7, 14], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 72,
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast'] },
    official: { 2027: { start: '2027-01-30', end: '2027-01-30', label: '79th DGA Awards', source: 'https://www.dga.org/News/PressReleases/2026/260416_DGA-Announces-Date-For-2027-Awards-Ceremony', checked: '2026-11-06' } },
    description: 'Annual awards for directing in film, documentary and television.',
    categories: [C('feature', 'Theatrical Feature Film', 'director', FILM, 'members', 5), C('documentary', 'Documentary', 'director', DOCS, 'members', 5), C('drama', 'Dramatic Series', 'director', SERIES, 'jury', 5)],
  },
  {
    id: 'wga', name: 'Writers Guild Awards', short: 'WGA Awards', kind: 'award', placeId: 'us-los-angeles', window: [2, 28, 28], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 70,
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast'] },
    description: 'Annual awards for screen and television writing.',
    categories: [C('original', 'Original Screenplay', 'writer', FILM, 'members', 5), C('episodic', 'Episodic Drama', 'writer', SERIES, 'members', 5)],
  },
  {
    id: 'pga', name: 'Producers Guild Awards', short: 'PGA Awards', kind: 'award', placeId: 'us-los-angeles', window: [2, 21, 28], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 70,
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast'] },
    official: { 2027: { start: '2027-02-27', end: '2027-02-27', label: '38th PGA Awards', source: 'https://producersguild.org/2027-2028-producers-guild-awards-key-dates/', checked: '2026-11-06' } },
    description: 'Annual awards for producing in film and television.',
    categories: [C('theatrical', 'Theatrical Motion Picture', 'producer', FILM, 'members', 10), C('animated', 'Animated Theatrical Motion Picture', 'producer', FILM, 'members', 5, { mediums: ['animation'] }), C('documentary', 'Documentary Motion Picture', 'producer', DOCS, 'members', 5), C('drama', 'Episodic Television, Drama', 'producer', SERIES, 'members', 5)],
  },
  {
    id: 'actor-awards', name: 'Actor Awards', short: 'Actor Awards', kind: 'award', placeId: 'us-los-angeles', window: [3, 1, 1], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 72,
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast'] },
    official: { 2027: { start: '2027-02-28', end: '2027-02-28', label: '33rd Actor Awards', source: 'https://www.thewrap.com/creative-content/movies/actor-awards-set-2027-2028-dates-at-netflix/', checked: '2026-11-06' } },
    description: 'Annual awards for screen performers, voted by performers.',
    categories: [
      C('male-lead', 'Male Actor In A Leading Role', 'lead', FILM, 'members', 5, { actingTitle: 'Actor' }),
      C('female-lead', 'Female Actor In A Leading Role', 'lead', FILM, 'members', 5, { actingTitle: 'Actress' }),
      C('cast', 'Cast In A Motion Picture', 'ensemble', FILM, 'members', 5),
    ],
  },
  {
    id: 'cesar', name: 'César Awards', short: 'César', kind: 'award', placeId: 'fr-paris', window: [2, 20, 28], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 68, origin: ['FR', 'MC'],
    requiresRelease: { routes: ['theatrical'], countries: ['FR'] },
    official: { 2027: { start: '2027-02-25', end: '2027-02-25', label: '52nd César Awards', source: 'https://www.parismatch.be/culture/cinema/2026/09/29/voici-le-nom-de-la-personne-qui-succede-a-benjamin-lavernhe-a-lanimation-de-la-ceremonie-des-cesar-2027-V3WASYGVRBDQZC4IUSXG2DBZ7Q/', checked: '2026-11-06' } },
    description: 'Annual French film awards. In this game, entries need a French production base and a theatrical release in France.',
    categories: [C('film', 'Best Film', 'producer', FILM, 'members', 5), C('director', 'Best Director', 'director', FILM, 'members', 5), C('screenplay', 'Best Original Screenplay', 'writer', FILM, 'members', 5), C('animated', 'Best Animated Film', 'producer', FILM, 'members', 3, { mediums: ['animation'] }), C('documentary', 'Best Documentary', 'producer', DOCS, 'members', 5)],
  },
  {
    id: 'goya', name: 'Goya Awards', short: 'Goya', kind: 'award', placeId: 'es-madrid', window: [2, 7, 14], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 66, origin: ['ES'],
    requiresRelease: { routes: ['theatrical'], countries: ['ES'] },
    official: { 2027: { start: '2027-02-06', end: '2027-02-06', label: '41st Goya Awards', source: 'https://rtvc.es/pamplona-acogera-gala-premios-goya-30-septiemmbre-2026/', checked: '2026-11-06' } },
    description: 'Annual Spanish film awards. In this game, entries need a Spanish production base and a theatrical release in Spain.',
    categories: [C('film', 'Best Film', 'producer', FILM, 'members', 5), C('director', 'Best Director', 'director', FILM, 'members', 5), C('screenplay', 'Best Original Screenplay', 'writer', FILM, 'members', 5)],
  },
  {
    id: 'canadian-screen', name: 'Canadian Screen Awards', short: 'Canadian Screen Awards', kind: 'award', placeId: 'ca-toronto', window: [5, 25, 31], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 60, origin: ['CA'],
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast', 'digital'], countries: ['CA'] },
    description: 'Annual Canadian film and television awards. In this game, entries need a Canadian production base.',
    categories: [C('film', 'Best Motion Picture', 'producer', FILM, 'members', 5), C('drama', 'Best Drama Series', 'producer', SERIES, 'members', 5), C('documentary', 'Best Feature Length Documentary', 'producer', DOCS, 'members', 5)],
  },
  {
    id: 'aacta', name: 'AACTA Awards', short: 'AACTA', kind: 'award', placeId: 'au-sydney', window: [2, 5, 12], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 60, origin: ['AU', 'NZ'],
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast'], countries: ['AU'] },
    description: 'Annual Australian screen awards. In this game, entries need an Australian or New Zealand production base and an Australian release.',
    categories: [C('film', 'Best Film', 'producer', FILM, 'members', 6), C('drama', 'Best Drama Series', 'producer', SERIES, 'members', 6), C('documentary', 'Best Documentary', 'producer', [...DOCS, ...DOC_SERIES], 'jury', 5)],
  },
  {
    id: 'amaa', name: 'Africa Movie Academy Awards', short: 'AMAA', kind: 'award', placeId: 'ng-lagos', window: [10, 15, 30], duration: 1, cadence: 1, eligibility: 'oct-sep', prestige: 58, origin: AFRICA,
    requiresRelease: { routes: ['theatrical', 'streaming', 'broadcast', 'festival-premiere', 'digital'] },
    description: 'Annual awards for African film. In this game, entries need an African production base.',
    categories: [C('film', 'Best Film', 'producer', FILM, 'jury', 6), C('director', 'Best Director', 'director', FILM, 'jury', 6), C('documentary', 'Best Documentary', 'producer', DOCS, 'jury', 5), C('short', 'Best Short Film', 'producer', SHORTS, 'jury', 6)],
  },
  {
    id: 'japan-academy', name: 'Japan Academy Film Prize', short: 'Japan Academy Film Prize', kind: 'award', placeId: 'jp-tokyo', window: [3, 6, 14], duration: 1, cadence: 1, eligibility: 'prior-year', prestige: 62, origin: ['JP'],
    requiresRelease: { routes: ['theatrical'], countries: ['JP'] },
    description: 'Annual Japanese film awards. In this game, entries need a Japanese production base and a theatrical release in Japan.',
    categories: [C('picture', 'Picture Of The Year', 'producer', FILM, 'members', 5), C('animation', 'Animation Of The Year', 'producer', FILM, 'members', 5, { mediums: ['animation'] }), C('director', 'Director Of The Year', 'director', FILM, 'members', 5)],
  },
  {
    id: 'blue-dragon', name: 'Blue Dragon Film Awards', short: 'Blue Dragon', kind: 'award', placeId: 'kr-seoul', window: [11, 18, 28], duration: 1, cadence: 1, eligibility: 'oct-sep', prestige: 62, origin: ['KR'],
    requiresRelease: { routes: ['theatrical'], countries: ['KR'] },
    description: 'Annual South Korean film awards. In this game, entries need a South Korean production base and a theatrical release in South Korea.',
    categories: [C('film', 'Best Film', 'producer', FILM, 'jury', 5), C('director', 'Best Director', 'director', FILM, 'jury', 5), C('screenplay', 'Best Screenplay', 'writer', FILM, 'jury', 5)],
  },
  {
    id: 'european-film-awards', name: 'European Film Awards', short: 'European Film Awards', kind: 'award', placeId: 'de-berlin', window: [12, 6, 13], duration: 1, cadence: 1, eligibility: 'oct-sep', prestige: 64, origin: EUROPE,
    requiresRelease: { routes: ['theatrical', 'festival-premiere', 'streaming'] },
    official: { 2026: { start: '2027-01-16', end: '2027-01-16', label: '39th European Film Awards', source: 'https://www.europeanfilmawards.eu/regulations/', checked: '2026-11-06' } },
    description: 'Annual awards for European film. In this game, entries need a European production base.',
    categories: [C('film', 'European Film', 'producer', [...FILM, ...DOCS], 'members', 5), C('director', 'European Director', 'director', FILM, 'members', 5), C('animated', 'European Animated Feature Film', 'producer', FILM, 'members', 4, { mediums: ['animation'] })],
  },
];

const instById = new Map(INSTITUTIONS.map((i) => [i.id, i]));
export function institution(id: string): Institution {
  const i = instById.get(id);
  if (!i) throw new Error('Unknown event');
  return i;
}

// ---------------- Editions ----------------

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export function editionDates(seed: number, inst: Institution, year: number) {
  const off = inst.official?.[year];
  const zone = getPlace(inst.placeId).zone;
  let startKey: string;
  let endKey: string;
  let deadlineKey: string;
  let opensKey: string;
  let provenance: 'official' | 'simulated' = 'simulated';
  let deadlinePlanned = false;
  if (off) {
    startKey = off.start;
    endKey = off.end;
    deadlineKey = off.deadline ?? addDaysToKey(startKey, inst.kind === 'award' ? -100 : -110);
    opensKey = off.opens ?? addDaysToKey(deadlineKey, -150);
    deadlinePlanned = !off.deadline;
    provenance = 'official';
  } else {
    const [m, d1, d2] = inst.window;
    const span = Math.max(0, d2 - d1);
    const offset = Math.floor(unit(seed, 'edition', inst.id, year) * (span + 1));
    startKey = ymd(year, m, d1 + offset);
    if (inst.kind === 'award') {
      // Ceremonies here prefer Sundays; festivals open on the generated day.
      while (weekdayOfKey(startKey) !== 0 && startKey < ymd(year, m, Math.min(28, d2 + 6))) startKey = addDaysToKey(startKey, 1);
    }
    endKey = addDaysToKey(startKey, inst.duration - 1);
    deadlineKey = addDaysToKey(startKey, inst.kind === 'award' ? -100 : -110);
    opensKey = addDaysToKey(deadlineKey, -150);
  }
  const announceKey = addDaysToKey(startKey, inst.kind === 'award' ? -45 : -24);
  const at = (k: string, h: number) => {
    const p = parseYmd(k);
    return localToInstant(zone, p.year, p.month, p.day, h).instant;
  };
  return {
    start: at(startKey, inst.kind === 'award' ? 17 : 10), end: at(endKey, 22), deadline: at(deadlineKey, 23) + 59 * 60000 + 59000, submissionOpens: at(opensKey, 9),
    announce: at(announceKey, 9), provenance, startKey, endKey, deadlineKey, label: off?.label, deadlinePlanned,
  };
}

export function eligibilityWindow(inst: Institution, year: number, startKey: string): { from: string; to: string } {
  if (inst.eligibility === 'prior-year') return { from: ymd(year - 1, 1, 1), to: ymd(year - 1, 12, 31) };
  if (inst.eligibility === 'jun-may') return { from: ymd(year - 1, 6, 1), to: ymd(year, 5, 31) };
  if (inst.eligibility === 'oct-sep') return { from: ymd(year - 1, 10, 1), to: ymd(year, 9, 30) };
  return { from: addDaysToKey(startKey, -365), to: startKey };
}

export function ensureEditions(state: GameState, year: number): void {
  for (const inst of INSTITUTIONS) {
    if (inst.cadence === 2 && year % 2 !== (inst.cadenceParity ?? 0)) continue;
    const id = `${inst.id}-${year}`;
    if (state.editions.some((e) => e.id === id)) continue;
    const d = editionDates(state.seed, inst, year);
    const label = d.label ?? (inst.ordinalBase ? `${ordinal(year - inst.ordinalBase)} ${inst.name}` : `${inst.name} ${year}`);
    const ed: Edition = {
      id, institutionId: inst.id, year, label, start: d.start, end: d.end, submissionOpens: d.submissionOpens, deadline: d.deadline, announce: d.announce,
      eligibility: eligibilityWindow(inst, year, d.startKey), provenance: d.provenance, deadlinePlanned: d.deadlinePlanned || undefined, entries: [], rivals: [], results: {},
      status: 'upcoming', rulesId: 'simulated',
    };
    const book = currentRulebook(inst.id, year);
    if (book) applyRulebook(ed, book);
    ed.status = state.now > ed.deadline ? 'closed' : state.now >= ed.submissionOpens ? 'open' : 'upcoming';
    state.editions.push(ed);
    if (ed.deadline > state.now) {
      if (d.submissionOpens > state.now) schedule(state, d.submissionOpens, 'edition-open', { editionId: id }, { id: `${id}:open` });
      schedule(state, ed.deadline - DAY, 'edition-deadline-soon', { editionId: id }, { attention: 'notify', id: `${id}:soon`, priority: 25 });
      schedule(state, ed.deadline, 'edition-deadline', { editionId: id }, { id: `${id}:deadline`, priority: 26 });
    }
    if (ed.announce > state.now) schedule(state, ed.announce, 'edition-announce', { editionId: id }, { attention: 'notify', id: `${id}:announce`, priority: 27 });
    if (ed.start > state.now) schedule(state, ed.start, 'edition-start', { editionId: id }, { attention: 'notify', id: `${id}:start`, priority: 28 });
    schedule(state, Math.max(ed.end, state.now + 1), 'edition-results', { editionId: id }, { attention: 'notify', id: `${id}:results`, priority: 29 });
  }
  state.editions.sort((a, b) => a.start - b.start);
}

onNewGame((state) => {
  const y = localParts(state.now, 'UTC').year;
  ensureEditions(state, y);
  ensureEditions(state, y + 1);
  const next = Date.UTC(y + 1, 0, 1);
  schedule(state, next, 'editions-roll', { year: y + 2 }, { id: `roll-${y + 2}` });
});

registerHandler('editions-roll', (state, ev) => {
  const y = ev.payload.year as number;
  ensureEditions(state, y);
  schedule(state, Date.UTC(y, 0, 1), 'editions-roll', { year: y + 1 }, { id: `roll-${y + 1}` });
});

function deadlineInstant(d: DeadlineRule): number {
  const { year, month, day } = parseYmd(d.date);
  const [hh, mm] = d.time.split(':').map(Number);
  return localToInstant(d.zone, year, month, day, hh, mm).instant + (mm === 59 ? 59_000 : 0);
}

/**
 * Attach a rulebook to an edition being created (or, through the save migration, to a future edition nobody has
 * entered): its opening date, and per-category deadlines. The edition's own deadline becomes the latest of them, so
 * the edition stays open for every category; categories without a rule deadline keep the edition's general deadline.
 */
export function applyRulebook(ed: Pick<Edition, 'institutionId' | 'year' | 'deadline' | 'submissionOpens' | 'deadlinePlanned' | 'rulesId' | 'defaultDeadline'>, book: RuleBook): void {
  ed.rulesId = book.id;
  ed.defaultDeadline ??= ed.deadline;
  const inst = institution(ed.institutionId);
  const held = categoriesFor(inst, ed.year);
  const all = held.flatMap((c) => book.categories[c.id]?.deadlines?.value ?? []).map(deadlineInstant);
  const everyCategoryRuled = held.every((c) => book.categories[c.id]?.deadlines);
  ed.deadline = Math.max(everyCategoryRuled ? -Infinity : ed.defaultDeadline, ...all);
  if (everyCategoryRuled) ed.deadlinePlanned = undefined;
  if (book.opens) {
    const { year, month, day } = parseYmd(book.opens.value);
    ed.submissionOpens = localToInstant(getPlace(inst.placeId).zone, year, month, day, 9).instant;
  }
}

/** The rules an edition's category is judged by, if the organizer's were read; otherwise SLATE's simulated rules. */
export function categoryRules(ed: Edition, categoryId: string): CategoryRules | undefined {
  return rulebook(ed.rulesId)?.categories[categoryId];
}

function completedKey(p: Project): string | null {
  return p.delivered ? dateKey(p.delivered.at, getPlace(p.axes.basePlaceId).zone) : null;
}

/** When entries for one category close: its own rule deadline (which can depend on when the work was completed), else the edition's. */
export function categoryDeadline(ed: Edition, cat: Category, p?: Project): number {
  const list = categoryRules(ed, cat.id)?.deadlines?.value;
  if (!list?.length) return ed.defaultDeadline ?? ed.deadline;
  const done = p ? completedKey(p) : null;
  const applies = list.filter((d) => !d.formats || (p ? d.formats.includes(p.axes.format) : false));
  const pick = applies.find((d) => !d.ifCompletedBefore || (done !== null && done < d.ifCompletedBefore)) ?? applies.filter((d) => !d.ifCompletedBefore).at(-1) ?? list.filter((d) => !d.formats).at(-1) ?? list[list.length - 1];
  return deadlineInstant(pick);
}

export function edition(state: GameState, id: string): Edition {
  const e = state.editions.find((x) => x.id === id);
  if (!e) throw new Error('That event edition no longer exists.');
  return e;
}

// ---------------- Eligibility ----------------

export interface Eligibility {
  eligible: boolean;
  provisional: boolean;
  reasons: string[];
  recipients: Credit[];
}

function releaseFits(p: Project, inst: Institution, ed: Edition): { ok: boolean; provisional: boolean; reason?: string } {
  if (!inst.requiresRelease) return { ok: true, provisional: false };
  const { routes, countries } = inst.requiresRelease;
  const fits = (r: { route: string; territories: string[]; date: string }) =>
    routes.includes(r.route) && (!countries || r.territories.some((t) => countries.includes(t))) && r.date >= ed.eligibility.from && r.date <= ed.eligibility.to;
  const all = [...p.releases.map((r) => ({ route: r.route, territories: r.territories, date: r.date, status: r.status }))];
  if (p.premiere?.editionId) all.push({ route: 'festival-premiere', territories: [p.premiere.country], date: p.premiere.date, status: 'released' });
  if (all.some((r) => r.status === 'released' && fits(r))) return { ok: true, provisional: false };
  if (all.some((r) => r.status === 'planned' && fits(r))) return { ok: true, provisional: true };
  const where = countries ? ` in ${countries.map(countryWords).join(' or ')}` : '';
  const routeWords = routes.map((r) => (r === 'festival-premiere' ? 'festival premiere' : r)).join(', ');
  return { ok: false, provisional: false, reason: `It needs a ${routeWords} release${where} between ${formatDateKey(ed.eligibility.from)} and ${formatDateKey(ed.eligibility.to)}.` };
}

function countryWords(c: string): string {
  return c === 'US' ? 'the United States' : c === 'GB' ? 'the United Kingdom' : c === 'FR' ? 'France' : c;
}

/** A qualifying release under an organizer's rule, or a top award at one of its qualifying festivals. */
function ruledReleaseFits(state: GameState, p: Project, ed: Edition, rules: CategoryRules): { ok: boolean; provisional: boolean; reason?: string } {
  const { routes, countries, exempt, festivalAwards } = rules.release!.value;
  if (exempt?.includes(p.axes.format)) return { ok: true, provisional: false };
  const win = rules.qualifying?.value ?? ed.eligibility;
  const fits = (r: Project['releases'][number]) => (routes as string[]).includes(r.route) && r.territories.some((t) => countries.includes(t)) && r.date >= win.from && r.date <= win.to;
  if (p.releases.some((r) => r.status === 'released' && fits(r))) return { ok: true, provisional: false };
  if (festivalAwards && festivalWin(state, p, festivalAwards, win)) return { ok: true, provisional: false };
  if (p.releases.some((r) => r.status === 'planned' && fits(r))) return { ok: true, provisional: true };
  const how = routes.length === 1 ? `a ${routes[0]} release` : 'a release';
  const orFest = festivalAwards ? ', or a top award at one of its qualifying festivals in that time' : '';
  return { ok: false, provisional: false, reason: `It needs ${how} in ${countries.map(countryWords).join(' or ')} between ${formatDateKey(win.from)} and ${formatDateKey(win.to)}${orFest}.` };
}

function festivalWin(state: GameState, p: Project, awards: string[], win: { from: string; to: string }): boolean {
  return state.editions.some((e) => {
    const end = dateKey(e.end, getPlace(institution(e.institutionId).placeId).zone);
    return end >= win.from && end <= win.to && Object.entries(e.results).some(([catId, r]) => r.revealed && r.winner === p.id && awards.includes(`${e.institutionId}:${catId}`));
  });
}

function runtimeProblem(rt: number, r: RuntimeRule): string | null {
  if (r.over !== undefined && rt <= r.over) return `It runs ${rt} minutes. This category needs more than ${r.over}.`;
  if (r.atLeast !== undefined && rt < r.atLeast) return `It runs ${rt} minutes. This category needs at least ${r.atLeast}.`;
  if (r.atMost !== undefined && rt > r.atMost) return `It runs ${rt} minutes. This category takes ${r.atMost} minutes or less, credits included.`;
  if (r.under !== undefined && rt >= r.under) return `It runs ${rt} minutes. This category takes work under ${r.under} minutes, credits included.`;
  return null;
}

/** Public showings before a date: releases that weren't cancelled, and a premiere at another edition. */
function showingsBefore(p: Project, before: string, exceptEdition?: string): { date: string; countries: string[]; route: string }[] {
  const out = p.releases.filter((r) => r.status !== 'cancelled' && r.date < before).map((r) => ({ date: r.date, countries: r.territories, route: r.route as string }));
  if (p.premiere && p.premiere.date < before && (!p.premiere.editionId || p.premiere.editionId !== exceptEdition)) {
    out.push({ date: p.premiere.date, countries: [p.premiere.country], route: p.premiere.editionId ? 'festival-premiere' : 'release' });
  }
  return out;
}

export function checkEligibility(state: GameState, p: Project, ed: Edition, cat: Category, recipientIds?: string[]): Eligibility {
  const inst = institution(ed.institutionId);
  const rules = categoryRules(ed, cat.id);
  const reasons: string[] = [];
  let provisional = false;
  const origin = getPlace(p.axes.basePlaceId).country;
  const formats = rules?.formats?.value ?? cat.formats;
  if (!formats.includes(p.axes.format)) reasons.push(`This category doesn't accept ${p.axes.format.replace('-', ' ')} projects.`);
  if (p.delivered) {
    const rt = p.delivered.runtimeMin;
    const shortForm = p.axes.format === 'short' || p.axes.format === 'documentary-short';
    const runtimeRule = shortForm && rules?.runtimeShort ? rules.runtimeShort : rules?.runtime;
    if (runtimeRule) {
      const why = runtimeProblem(rt, runtimeRule.value);
      if (why) reasons.push(why);
    } else {
      // Runtime classification in this game: features run more than 40 minutes, shorts 40 or fewer.
      if (cat.formats.some((f) => f === 'feature' || f === 'documentary-feature') && !cat.formats.some((f) => f === 'short' || f === 'documentary-short') && rt <= 40) reasons.push(`It runs ${rt} minutes. Feature categories need more than 40.`);
      if (cat.formats.every((f) => f === 'short' || f === 'documentary-short') && rt > 40) reasons.push(`It runs ${rt} minutes. Short categories need 40 or fewer.`);
    }
  }
  const mediums = rules?.mediums?.value ?? cat.mediums;
  if (mediums && !mediums.includes(p.axes.medium)) reasons.push(`This category is for ${mediums.join(' or ').replace('-', ' ')} work.`);
  if (rules?.minEpisodes && p.axes.episodeCount < rules.minEpisodes.value) reasons.push(`It has ${p.axes.episodeCount} episode${p.axes.episodeCount === 1 ? '' : 's'}. This category needs at least ${rules.minEpisodes.value}.`);
  if (cat.genres && !p.axes.genres.some((g) => cat.genres!.includes(g.id))) reasons.push(`This category needs one of its genres, such as ${genre(cat.genres[0]).name}.`);
  if (cat.excludeGenres && p.axes.genres.some((g) => cat.excludeGenres!.includes(g.id))) reasons.push('Comedy and musical work competes in a separate category.');
  if (inst.origin && !inst.origin.includes(origin)) reasons.push('Your production base country isn\'t eligible for this event.');
  if (rules?.origin?.value.only && !rules.origin.value.only.includes(origin)) reasons.push(`This section is for work made in ${rules.origin.value.only.map(countryWords).join(' or ')}.`);
  if (rules?.origin?.value.not?.includes(origin)) reasons.push(`Work made mainly in ${countryWords(origin)} enters the festival's national competition instead.`);
  if (inst.id === 'international-emmys' && origin === 'US') reasons.push('This event is for productions made outside the United States.');
  if (inst.id === 'spirit' && (p.funding.scenarioId === 'commissioned' || p.finance?.deals.some((d) => d.kind === 'commissioner' && d.status === 'accepted'))) reasons.push('Commissioned projects aren\'t eligible in this game.');
  if (!p.delivered) {
    if (inst.kind === 'festival') reasons.push('Deliver the project before submitting it.');
    else reasons.push('Deliver the project before entering it.');
  }
  const done = completedKey(p);
  if (rules?.completedFrom && done && done < rules.completedFrom.value) reasons.push(`It was completed on ${formatDateKey(done)}. This category takes work completed from ${formatDateKey(rules.completedFrom.value)}.`);
  if (state.now > categoryDeadline(ed, cat, p)) reasons.push('The entry deadline has passed.');
  if (state.now < ed.submissionOpens) reasons.push(`Entries open on ${formatDateKey(dateKey(ed.submissionOpens, getPlace(inst.placeId).zone))}.`);
  if (rules?.noReentry && state.editions.some((e) => e.institutionId === ed.institutionId && e.year < ed.year && e.entries.some((x) => x.projectId === p.id))) {
    reasons.push(`It was entered at an earlier ${inst.short}, and work can't be entered again.`);
  }
  if (inst.kind === 'festival') {
    const startKey = dateKey(ed.start, getPlace(inst.placeId).zone);
    const shown = showingsBefore(p, startKey, ed.id);
    const asked = rules?.premiere?.value ?? cat.premiere;
    const premiere = asked === 'world-if-domestic' ? (origin === getPlace(inst.placeId).country ? 'world' : 'international') : asked;
    if (premiere === 'world' && shown.length) reasons.push('This section requires a world premiere, and your project has already been shown.');
    if (premiere === 'international' && shown.some((x) => x.countries.some((c) => c !== origin))) reasons.push('This section requires an international premiere, and your project has already been shown abroad.');
    if (p.premiere?.editionId && p.premiere.editionId !== ed.id && premiere === 'world') reasons.push(`It premiered at ${state.editions.find((e) => e.id === p.premiere?.editionId)?.label ?? 'another festival'}.`);
    const nsb = rules?.notShownBefore?.value;
    if (nsb && !(nsb.unlessCompletedAfter && done && done > nsb.unlessCompletedAfter) && showingsBefore(p, nsb.date, ed.id).length) {
      reasons.push(`It was shown publicly before ${formatDateKey(nsb.date)}${nsb.unlessCompletedAfter ? ` and completed before ${formatDateKey(addDaysToKey(nsb.unlessCompletedAfter, 1))}` : ''}.`);
    }
    if (rules?.noOtherFestival && p.premiere?.editionId && p.premiere.editionId !== ed.id && p.premiere.date < startKey) reasons.push(`It has already screened at the ${state.editions.find((e) => e.id === p.premiere?.editionId)?.label ?? 'another festival'}.`);
    if (rules?.noOnline && shown.some((x) => x.route === 'streaming' || x.route === 'digital')) reasons.push('It has been released online, and this section only takes work not yet shown online.');
    if (rules?.noTvOrOnline && shown.some((x) => x.route === 'streaming' || x.route === 'digital' || x.route === 'broadcast')) reasons.push('It has been on television or online, and this section only takes work not yet shown there.');
    const nsi = rules?.notShownIn?.value;
    if (nsi) {
      const endKey = dateKey(ed.end, getPlace(inst.placeId).zone);
      const excepted = (x: { route: string }) => x.route === 'festival-premiere' && !!p.premiere?.editionId && (nsi.exceptAt ?? []).includes(state.editions.find((e) => e.id === p.premiere!.editionId)?.institutionId ?? '');
      if (showingsBefore(p, endKey, ed.id).some((x) => x.countries.some((c) => nsi.countries.includes(c)) && !excepted(x))) {
        reasons.push(`It has been shown publicly in ${nsi.countries.map(countryWords).join(' or ')}, which this section doesn't allow before the festival${nsi.exceptAt?.length ? ` (a ${nsi.exceptAt.map((i) => institution(i).short).join(' or ')} screening is the exception)` : ''}.`);
      }
    }
  } else {
    const rel = rules?.release ? ruledReleaseFits(state, p, ed, rules) : releaseFits(p, inst, ed);
    if (!rel.ok) reasons.push(rel.reason!);
    provisional = rel.provisional;
    const tf = rules?.theatricalFirst?.value;
    if (tf) {
      const inC = (r: Project['releases'][number]) => r.status !== 'cancelled' && r.territories.some((t) => tf.countries.includes(t));
      const theatrical = p.releases.filter((r) => inC(r) && r.route === 'theatrical').map((r) => r.date).sort()[0];
      const other = p.releases.filter((r) => inC(r) && r.route !== 'theatrical').map((r) => r.date).sort()[0];
      if (other && (!theatrical || other < theatrical)) reasons.push(`It was released on ${formatDateKey(other)} outside cinemas in ${tf.countries.map(countryWords).join(' or ')}, before any theatrical run there, which rules it out.`);
    }
    const tv = rules?.tvFirst?.value;
    if (tv) {
      const inC = (r: Project['releases'][number]) => r.status !== 'cancelled' && r.territories.some((t) => tv.countries.includes(t));
      const cinema = p.releases.filter((r) => inC(r) && r.route === 'theatrical').map((r) => r.date).sort()[0];
      const aired = p.releases.filter((r) => inC(r) && r.route !== 'theatrical').map((r) => r.date).sort()[0];
      if (cinema && (!aired || cinema < aired)) reasons.push(`It opened in cinemas in ${tv.countries.map(countryWords).join(' or ')} on ${formatDateKey(cinema)}, before airing there, which rules it out of television awards.`);
    }
  }
  // Simulated rules only: shorts at the Oscars qualify through any festival win, or a US theatrical release.
  if (!rules && inst.id === 'oscars' && SHORTS.includes(p.axes.format) && reasons.some((r) => r.startsWith('It needs a'))) {
    const festivalWon = state.editions.some((e) => institution(e.institutionId).kind === 'festival' && Object.values(e.results).some((r) => r.revealed && r.winner === p.id));
    if (festivalWon) reasons.splice(reasons.findIndex((r) => r.startsWith('It needs a')), 1);
  }
  const recipients = categoryRecipients(state, p, cat, recipientIds, rules);
  if (!recipients.length) reasons.push(recipientMissingReason(cat));
  return { eligible: reasons.length === 0, provisional, reasons, recipients };
}

function recipientMissingReason(cat: Category): string {
  if (cat.recipient === 'lead' || cat.recipient === 'supporting') {
    return cat.actingTitle ? `No credited ${cat.recipient === 'lead' ? 'lead' : 'supporting'} performance can be entered as ${cat.actingTitle.toLowerCase()} in this category.` : `No credited ${cat.recipient} performance.`;
  }
  if (cat.recipient === 'voice') return 'No credited voice performance.';
  return 'No credited person for this category.';
}

/** Credited recipients: only people with the relevant actual contribution. */
export function categoryRecipients(state: GameState, p: Project, cat: Category, chosen?: string[], rules?: CategoryRules): Credit[] {
  const credits = p.credits;
  const chars = p.drafts.find((d) => d.number === p.approvedDraft)?.characters ?? [];
  let pool: Credit[];
  const named = rules?.recipients?.value;
  if (named) {
    // The organizer names who receives the award: credited directors, or credited producers up to a limit.
    const wanted = (c: Credit) => (named.credit !== 'producer' && c.contribution === 'Directed By') || (named.credit !== 'director' && c.roleId === 'producer');
    pool = credits.filter(wanted).sort((a, b) => a.billing - b.billing);
    if (chosen?.length) pool = pool.filter((c) => chosen.includes(c.id));
    return named.max ? pool.slice(0, named.max) : pool;
  }
  switch (cat.recipient) {
    case 'director': pool = credits.filter((c) => c.contribution === 'Directed By'); break;
    case 'writer': pool = credits.filter((c) => c.contribution === 'Written By' || c.contribution === 'Co-Written By'); break;
    case 'producer': case 'project': pool = credits.filter((c) => c.roleId === 'producer'); break;
    case 'ensemble': pool = credits.filter((c) => c.contribution === 'Cast'); break;
    case 'voice': pool = credits.filter((c) => c.contribution === 'Voice Cast'); break;
    default: {
      const sizes = cat.recipient === 'lead' ? ['lead', 'co-lead', 'ensemble-lead'] : ['supporting', 'featured'];
      pool = credits.filter((c) => (c.contribution === 'Cast' || c.contribution === 'Performance Capture') && sizes.includes(chars.find((x) => x.name === c.characterName)?.roleSize ?? ''));
      if (cat.actingTitle) {
        // Gendered categories: the player's own entry uses the acting title they chose. Simulated
        // performers are not auto-assigned a gendered category from pronouns.
        pool = pool.filter((c) => c.person === 'player' && state.character.actingTitle === cat.actingTitle);
      }
    }
  }
  if (chosen?.length) pool = pool.filter((c) => chosen.includes(c.id));
  return pool;
}

// ---------------- Submission ----------------

export function submitEntry(state: GameState, p: Project, editionId: string, categoryId: string, recipientIds?: string[]): EditionEntry {
  const ed = edition(state, editionId);
  const inst = institution(ed.institutionId);
  const cat = inst.categories.find((c) => c.id === categoryId);
  if (!cat) throw new Error('That category doesn\'t exist.');
  if (!categoriesFor(inst, ed.year).includes(cat)) throw new Error(`The ${ed.label} doesn't hold that category.`);
  if (ed.entries.some((e) => e.projectId === p.id && e.categoryId === categoryId && e.status !== 'withdrawn')) throw new Error('This project is already entered in that category.');
  const el = checkEligibility(state, p, ed, cat, recipientIds);
  if (!el.eligible) throw new Error(el.reasons[0]);
  // One fee per project, category and edition: entering again after withdrawing doesn't charge it twice.
  const feeKey = `fee:${editionId}:${categoryId}`;
  const alreadyPaid = p.obligations.some((o) => o.postings.some((x) => x.key === feeKey));
  if (cat.fee && !alreadyPaid) {
    if (ledgerTotals(p).available < cat.fee) throw new Error(`The entry fee is ${money(cat.fee)}, and this project has ${money(ledgerTotals(p).available)} uncommitted.`);
    spend(state, p, `${inst.short} Entry Fee`, 'festival', cat.fee, feeKey);
  }
  const base = `${editionId}:${categoryId}:${p.id}`;
  const tries = ed.entries.filter((e) => e.id === base || e.id.startsWith(`${base}#`)).length;
  const entry: EditionEntry = {
    id: tries ? `${base}#${tries + 1}` : base, projectId: p.id, categoryId, submittedAt: state.now, status: 'submitted', recipients: el.recipients.map((r) => r.id), fee: cat.fee && !alreadyPaid ? cat.fee : 0,
    reason: el.provisional ? 'Entered provisionally. The planned release must happen within the eligibility period.' : undefined,
  };
  ed.entries.push(entry);
  if (!state.followed.includes(inst.id)) state.followed.push(inst.id);
  addLog(state, `You entered ${p.title} for ${cat.name} at the ${ed.label}.`, inst.kind === 'festival' ? 'festival' : 'award', { projectId: p.id, route: { view: 'event', editionId } });
  return entry;
}

export function withdrawEntry(state: GameState, editionId: string, entryId: string): void {
  const ed = edition(state, editionId);
  const e = ed.entries.find((x) => x.id === entryId);
  if (!e || !['submitted', 'accepted', 'needs-correction'].includes(e.status)) throw new Error('That entry can no longer be withdrawn.');
  e.status = 'withdrawn';
  e.reason = 'You withdrew this entry. Entry fees are not refunded.';
}

// ---------------- Lifecycle handlers ----------------

function involved(state: GameState, ed: Edition): boolean {
  return ed.entries.length > 0 || state.followed.includes(ed.institutionId);
}

registerHandler('edition-open', (state, ev) => {
  const ed = edition(state, ev.payload.editionId as string);
  if (ed.status === 'upcoming') ed.status = 'open';
  return { suppressInterrupt: true };
});

registerHandler('edition-deadline-soon', (state, ev) => {
  const ed = edition(state, ev.payload.editionId as string);
  if (!state.followed.includes(ed.institutionId)) return { suppressInterrupt: true };
  const zone = getPlace(state.locationId).zone;
  const p = localParts(ed.deadline, zone);
  const text = `Entries for the ${ed.label} close tomorrow at ${p.hour % 12 || 12}:${String(p.minute).padStart(2, '0')} ${p.hour < 12 ? 'AM' : 'PM'} your time.`;
  addLog(state, text, institution(ed.institutionId).kind === 'festival' ? 'festival' : 'award', { route: { view: 'event', editionId: ed.id } });
  return { message: text };
});

registerHandler('edition-deadline', (state, ev) => {
  const ed = edition(state, ev.payload.editionId as string);
  ed.status = 'closed';
  const inst = institution(ed.institutionId);
  // Validation: entries are rechecked against their rules at the deadline.
  for (const e of ed.entries.filter((x) => x.status === 'submitted')) {
    const p = state.projects.find((x) => x.id === e.projectId);
    const cat = inst.categories.find((c) => c.id === e.categoryId);
    if (!p || !cat) continue;
    const saved = state.now;
    state.now = Math.min(ed.deadline, categoryDeadline(ed, cat, p)) - 1;
    const el = checkEligibility(state, p, ed, cat, e.recipients);
    state.now = saved;
    if (el.eligible) e.status = 'accepted';
    else {
      e.status = 'rejected';
      e.reason = el.reasons[0];
      addLog(state, `${p.title}'s entry for ${cat.name} at the ${ed.label} was not accepted. ${el.reasons[0]}`, 'warning', { projectId: p.id, route: { view: 'event', editionId: ed.id } });
    }
  }
  return { suppressInterrupt: true };
});

const RIVAL_WORDS_A = ['Quiet', 'Salt', 'Paper', 'Northern', 'Last', 'Glass', 'Hollow', 'Bright', 'Small', 'Burning', 'Silent', 'Iron', 'Little', 'Distant', 'Golden', 'Low', 'Wild', 'Late', 'Blue', 'Second'];
const RIVAL_WORDS_B = ['Harbor', 'Summer', 'Orchard', 'Signal', 'River', 'Kingdom', 'Witness', 'Houses', 'Tide', 'Season', 'Weather', 'Mountain', 'Archive', 'Garden', 'Crossing', 'Lights', 'Hours', 'Field', 'Animals', 'Room'];

export interface SlateFilm {
  id: string;
  title: string;
  format: Format;
  medium: Medium;
  genres: string[];
  runtimeMin: number;
  people: Record<string, string>;
  scores: Record<Recipient, number>;
}

const SLATE_GENRES = ['drama', 'comedy', 'thriller', 'horror', 'romance', 'science-fiction', 'fantasy', 'crime', 'musical', 'documentary', 'war', 'western', 'family'];
const slateCache = new Map<string, SlateFilm[]>();

/**
 * One season's competing work: a deterministic slate of simulated films and series, so the same
 * titles move from festivals into the following awards season with consistent strengths.
 */
export function seasonSlate(seed: number, seasonYear: number): SlateFilm[] {
  const key = `${seed}|${seasonYear}`;
  const hit = slateCache.get(key);
  if (hit) return hit;
  const r = stream(seed, 'slate', seasonYear);
  const out: SlateFilm[] = [];
  const firsts = ['Iris', 'Teo', 'Marisol', 'Kwame', 'Ana', 'Lars', 'Mina', 'Rafi', 'Odile', 'Sung-min', 'Leila', 'Joaquín', 'Ngozi', 'Yuki', 'Farid', 'Elsa'];
  const lasts = ['Varga', 'Mbeki', 'Holt', 'Ruiz', 'Okoro', 'Aalto', 'Brandt', 'Sato', 'Navarro', 'Achterberg', 'Kader', 'Lindqvist', 'Moreau', 'Osei', 'Petrova', 'Tanaka'];
  const name = () => `${pick(r, firsts)} ${pick(r, lasts)}`;
  for (let i = 0; i < 120; i++) {
    const roll = r();
    const format: Format = roll < 0.5 ? 'feature' : roll < 0.62 ? 'documentary-feature' : roll < 0.74 ? 'short' : roll < 0.8 ? 'documentary-short' : roll < 0.9 ? 'series' : roll < 0.95 ? 'limited-series' : 'documentary-series';
    const m = r();
    const medium: Medium = format.startsWith('documentary') ? (m < 0.9 ? 'live-action' : 'animation') : m < 0.72 ? 'live-action' : m < 0.94 ? 'animation' : 'hybrid';
    const base = Math.max(25, Math.min(96, gaussian(r, 62, 11)));
    const off = () => gaussian(r, 0, 6);
    const genres = format.startsWith('documentary') ? ['documentary'] : [pick(r, SLATE_GENRES.filter((g) => g !== 'documentary'))];
    if (r() < 0.3) genres.push(pick(r, SLATE_GENRES.filter((g) => g !== 'documentary')));
    out.push({
      id: `sl${seasonYear}-${i}`,
      title: `${pick(r, ['The ', '', '', 'A '])}${pick(r, RIVAL_WORDS_A)} ${pick(r, RIVAL_WORDS_B)}`,
      format, medium, genres, runtimeMin: format === 'short' || format === 'documentary-short' ? intBetween(r, 6, 30) : format.includes('series') ? intBetween(r, 25, 60) : intBetween(r, 80, 150),
      people: { director: name(), writer: name(), lead: name() },
      scores: { project: base, producer: base, director: base + off(), writer: base + off(), lead: base + off(), supporting: base + off(), voice: base + off(), ensemble: base + off() },
    });
  }
  // The same title can't appear twice in one season.
  const seen = new Set<string>();
  const unique = out.filter((f) => (seen.has(f.title) ? false : (seen.add(f.title), true)));
  if (slateCache.size > 40) slateCache.clear();
  slateCache.set(key, unique);
  return unique;
}

function seasonOf(ed: Edition): number {
  return institution(ed.institutionId).kind === 'festival' ? ed.year : ed.year - 1;
}

/** A candidate competing work for one category: its film (stored once per save if chosen) and its strength there. */
interface Candidate { id: string; filmKey: string; film: RivalFilm; score: number }

function rivalsFor(state: GameState, ed: Edition, cat: Category): Candidate[] {
  const slate = seasonSlate(state.seed, seasonOf(ed)).filter((f) =>
    cat.formats.includes(f.format) && (!cat.mediums || cat.mediums.includes(f.medium)) &&
    (!cat.genres || f.genres.some((g) => cat.genres!.includes(g))) && (!cat.excludeGenres || !f.genres.some((g) => cat.excludeGenres!.includes(g))));
  const fromSlate: Candidate[] = slate.map((f) => ({
    id: `${ed.id}:${cat.id}:${f.id}`, filmKey: f.id, film: { title: f.title, people: f.people, format: f.format, medium: f.medium, runtimeMin: f.runtimeMin }, score: f.scores[cat.recipient],
  }));
  const needed = Math.max(cat.slots * 3, cat.slots + 6);
  if (fromSlate.length >= needed) return fromSlate;
  return [...fromSlate, ...generatedRivals(state, ed, cat, needed - fromSlate.length)];
}

function generatedRivals(state: GameState, ed: Edition, cat: Category, n: number): Candidate[] {
  const inst = institution(ed.institutionId);
  const r = stream(state.seed, 'rivals', ed.id, cat.id);
  const out: Candidate[] = [];
  for (let i = 0; i < n; i++) {
    const title = `${pick(r, ['The ', '', '', 'A '])}${pick(r, RIVAL_WORDS_A)} ${pick(r, RIVAL_WORDS_B)}`;
    // Rival work strength by event prestige; a simulation assumption.
    const score = Math.max(20, Math.min(97, gaussian(r, inst.prestige - 8, 10)));
    const id = `${ed.id}:${cat.id}:r${i}`;
    out.push({
      id, filmKey: id, score,
      film: {
        title, people: { lead: `${pick(r, ['Iris', 'Teo', 'Marisol', 'Kwame', 'Ana', 'Lars', 'Mina', 'Rafi', 'Odile', 'Sung-min'])} ${pick(r, ['Varga', 'Mbeki', 'Holt', 'Ruiz', 'Okoro', 'Aalto', 'Brandt', 'Sato', 'Navarro', 'Achterberg'])}` },
        format: cat.formats[0], medium: cat.mediums?.[0] ?? 'live-action', runtimeMin: cat.formats.includes('short') ? intBetween(r, 6, 30) : intBetween(r, 80, 140),
      },
    });
  }
  return out;
}

/** The title of a competing work in an edition, by its entry ID. */
export function rivalTitle(state: GameState, ed: Edition, id: string): string | undefined {
  if (ed.compact) return state.rivalFilms[id]?.title;
  const r = ed.rivals.find((x) => x.id === id);
  return r ? state.rivalFilms[r.film]?.title : undefined;
}

/**
 * A finished edition keeps who was selected, nominated and won, but not the competing works' strengths, which only
 * mattered while judging (measured: about half of a long career's save). Idempotent.
 */
export function compactEdition(ed: Edition): void {
  if (ed.compact || ed.status !== 'complete') return;
  const film = new Map(ed.rivals.map((r) => [r.id, r.film]));
  for (const r of Object.values(ed.results)) {
    r.rivalIds = r.rivalIds.map((id) => film.get(id) ?? id);
    if (r.winner && film.has(r.winner)) r.winner = film.get(r.winner);
  }
  ed.rivals = [];
  ed.compact = true;
}

function playerScore(p: Project, cat: Category, recipients: string[], judging: Judging): number {
  const q = p.quality ?? {};
  const perf = (rid: string) => {
    const credit = p.credits.find((c) => c.id === rid);
    const chars = p.drafts.find((d) => d.number === p.approvedDraft)?.characters ?? [];
    const ch = chars.find((x) => x.name === credit?.characterName);
    const key = Object.keys(q).find((k) => k.startsWith(`performance:${ch?.id}:`) && k.endsWith(`:${credit?.person}`));
    return key ? q[key] : q.overall ?? 50;
  };
  switch (cat.recipient) {
    case 'director': return q.direction ?? 50;
    case 'writer': return q.script ?? 50;
    case 'lead': case 'supporting': case 'voice': return recipients.length ? Math.max(...recipients.map(perf)) : 50;
    case 'ensemble': return q.overall ?? 50;
    default: {
      if (judging === 'audience') return q.reception ?? q.overall ?? 50;
      if (cat.mediums?.includes('animation') && q.animation) return (q.overall + q.animation) / 2;
      return q.overall ?? 50;
    }
  }
}

/** Season visibility: earlier festival selections and wins in the past year help with members' ballots. */
function visibility(state: GameState, p: Project, before: number): number {
  let v = 0;
  for (const e of state.editions) {
    if (e.end > before || e.end < before - 400 * DAY) continue;
    for (const [, r] of Object.entries(e.results)) {
      if (!r.revealed) continue;
      if (r.winner === p.id) v += 3;
      else if (r.projectIds.includes(p.id)) v += 1;
    }
  }
  return Math.min(8, v);
}

const NOISE: Record<Judging, number> = { programmers: 7, jury: 9, members: 5, audience: 6 };

function judge(state: GameState, ed: Edition, cat: Category, stage: 'selection' | 'winner', pool: { id: string; kind: 'project' | 'rival'; score: number }[]): { id: string; kind: 'project' | 'rival'; score: number }[] {
  const r = stream(state.seed, 'judging', ed.id, cat.id, stage);
  return pool
    .map((x) => ({ ...x, score: x.score + gaussian(r, 0, NOISE[cat.judging]) }))
    .sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
}

registerHandler('edition-announce', (state, ev) => announceEdition(state, edition(state, ev.payload.editionId as string)));

/** Selection or nominations. Results persist once and are never rerolled. */
export function announceEdition(state: GameState, ed: Edition): HandlerResult {
  if (ed.status === 'announced' || ed.status === 'complete') return { suppressInterrupt: true };
  const inst = institution(ed.institutionId);
  ed.status = 'announced';
  const messages: string[] = [];
  for (const cat of categoriesFor(inst, ed.year)) {
    if (ed.results[cat.id]) continue; // persisted once; never rerolled
    const entries = ed.entries.filter((e) => e.categoryId === cat.id && e.status === 'accepted');
    const rivals = rivalsFor(state, ed, cat);
    const pool = [
      ...entries.map((e) => {
        const p = state.projects.find((x) => x.id === e.projectId)!;
        const vis = cat.judging === 'members' ? visibility(state, p, ed.announce) : 0;
        return { id: p.id, kind: 'project' as const, score: playerScore(p, cat, e.recipients, cat.judging) + vis };
      }),
      ...rivals.map((x) => ({ id: x.id, kind: 'rival' as const, score: x.score })),
    ];
    const ranked = judge(state, ed, cat, 'selection', pool).slice(0, cat.slots);
    const chosenRivals = rivals.filter((x) => ranked.some((y) => y.id === x.id));
    for (const x of chosenRivals) {
      state.rivalFilms[x.filmKey] ??= x.film;
      ed.rivals.push({ id: x.id, film: x.filmKey, score: x.score });
    }
    ed.results[cat.id] = { stage: inst.kind === 'festival' ? 'selection' : 'nomination', projectIds: ranked.filter((x) => x.kind === 'project').map((x) => x.id), rivalIds: chosenRivals.map((x) => x.id), revealed: true };
    for (const e of entries) {
      const p = state.projects.find((x) => x.id === e.projectId)!;
      const picked = ranked.some((x) => x.id === p.id);
      e.status = inst.kind === 'festival' ? (picked ? 'selected' : 'not-selected') : picked ? 'nominated' : 'not-nominated';
      if (picked) {
        const zone = getPlace(state.locationId).zone;
        messages.push(inst.kind === 'festival'
          ? `${p.title} has been selected for ${cat.name} at the ${ed.label}. The festival runs from ${formatDateKey(dateKey(ed.start, zone))}.`
          : `${p.title} was nominated for ${cat.name} at the ${ed.label}. The ceremony is on ${formatDateKey(dateKey(ed.start, zone))}.`);
        p.history.push({ at: state.now, text: `${inst.kind === 'festival' ? 'Selected' : 'Nominated'}: ${cat.name}, ${ed.label}.` });
      } else {
        messages.push(`${p.title} wasn't ${inst.kind === 'festival' ? 'selected' : 'nominated'} for ${cat.name} at the ${ed.label}.`);
      }
    }
  }
  for (const m of messages) addLog(state, m, inst.kind === 'festival' ? 'festival' : 'award', { route: { view: 'event', editionId: ed.id } });
  if (!messages.length) return involved(state, ed) ? { message: `The ${ed.label} announced its ${inst.kind === 'festival' ? 'selection' : 'nominations'}.` } : { suppressInterrupt: true };
  return { message: messages[0] };
}

registerHandler('edition-start', (state, ev) => {
  const ed = edition(state, ev.payload.editionId as string);
  const inst = institution(ed.institutionId);
  if (inst.kind !== 'festival') return involved(state, ed) ? { message: `The ${ed.label} ceremony is today.` } : { suppressInterrupt: true };
  const zone = getPlace(inst.placeId).zone;
  const startKey = dateKey(ed.start, zone);
  const messages: string[] = [];
  for (const e of ed.entries.filter((x) => x.status === 'selected')) {
    const p = state.projects.find((x) => x.id === e.projectId);
    if (!p) continue;
    const cat = inst.categories.find((c) => c.id === e.categoryId)!;
    if (cat.premiere === 'world' && p.premiere && p.premiere.editionId !== ed.id && p.premiere.date < startKey) {
      e.status = 'withdrawn';
      e.reason = 'It premiered elsewhere first, so it no longer qualifies for this section.';
      messages.push(`${p.title} can't screen in ${cat.name} at the ${ed.label}: it premiered elsewhere first.`);
      continue;
    }
    if (!p.premiere) p.premiere = { kind: 'world', date: startKey, country: getPlace(inst.placeId).country, venue: ed.label, editionId: ed.id };
    // Two public screenings inside the festival dates. They happen whether or not you attend.
    ed.screenings ??= [];
    const slots: [number, number][] = [[1, 19], [3, 14]];
    for (const [dayOffset, hour] of slots) {
      const k = addDaysToKey(startKey, Math.min(dayOffset, inst.duration - 1));
      const { year, month, day } = parseYmd(k);
      const at = Math.min(ed.end - 3600_000, localToInstant(zone, year, month, day, hour).instant);
      if (ed.screenings.some((x) => x.projectId === p.id && x.at === at)) continue;
      // You're invited to attend; reply at least a day ahead. The screening happens either way.
      ed.screenings.push({ projectId: p.id, at, done: false, rsvpBy: at - DAY, rsvp: 'pending' });
      schedule(state, at, 'screening', { editionId: ed.id, projectId: p.id, at }, { attention: 'notify', priority: 31 });
      schedule(state, at - 30 * 60_000, 'screening-reminder', { editionId: ed.id, projectId: p.id, at }, { attention: 'interrupt', priority: 30 });
    }
    messages.push(`${p.title} screens at the ${ed.label} this week.`);
    schedule(state, ed.end + DAY, 'distribution-offer', { projectId: p.id, wave: ed.id, exposure: Math.round(institution(ed.institutionId).prestige / 8) }, { attention: 'notify', priority: 55 });
  }
  for (const m of messages) addLog(state, m, 'festival', { route: { view: 'event', editionId: ed.id } });
  return messages.length ? { message: messages[0] } : involved(state, ed) ? { message: `The ${ed.label} opens today.` } : { suppressInterrupt: true };
});

registerHandler('screening', (state, ev) => {
  const ed = edition(state, ev.payload.editionId as string);
  const sc = ed.screenings?.find((x) => x.projectId === ev.payload.projectId && x.at === ev.payload.at);
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  if (!sc || sc.done) return { suppressInterrupt: true };
  sc.done = true;
  const inst = institution(ed.institutionId);
  sc.attended = sc.rsvp === 'accepted' && state.locationId === inst.placeId && !state.travel;
  if (sc.rsvp === 'pending') sc.rsvp = 'expired';
  const reception = p?.quality?.reception ?? 50;
  const response = reception >= 75 ? 'warm' : reception >= 55 ? 'mixed but attentive' : 'cool';
  const presence = sc.attended ? ' You were there and answered questions afterward.' : sc.rsvp === 'accepted' ? " You'd said you would attend, but you weren't there." : '';
  const text = `${p?.title ?? 'Your film'} screened at the ${ed.label}. The audience response was ${response}.${presence}`;
  p?.history.push({ at: state.now, text });
  addLog(state, text, 'festival', { projectId: p?.id, route: { view: 'event', editionId: ed.id } });
  return { message: text };
});

registerHandler('screening-reminder', (state, ev) => {
  const ed = edition(state, ev.payload.editionId as string);
  const sc = ed.screenings?.find((x) => x.projectId === ev.payload.projectId && x.at === ev.payload.at);
  if (!sc || sc.done || sc.rsvp === 'declined') return { suppressInterrupt: true };
  const text = 'Your screening starts in 30 minutes.';
  addLog(state, text, 'festival', { projectId: sc.projectId, route: { view: 'event', editionId: ed.id } });
  return { message: text };
});

/** How long the trip to a screening's venue takes from where you are, and whether you'd arrive in time. */
export function screeningTravel(state: GameState, ed: Edition, sc: Screening): { here: boolean; hours: number; arrivesInTime: boolean } {
  const venue = getPlace(institution(ed.institutionId).placeId);
  const here = state.locationId === venue.id && !state.travel;
  const hours = here ? 0 : travelHours(getPlace(state.locationId), venue);
  return { here, hours, arrivesInTime: here || state.now + hours * 3600_000 <= sc.at };
}

/** Your own work that overlaps a screening day: shoot days you direct or act on. */
export function screeningConflicts(state: GameState, ed: Edition, sc: Screening): string[] {
  const out: string[] = [];
  for (const p of state.projects) {
    if (p.delivered) continue;
    const zone = getPlace(p.axes.basePlaceId).zone;
    const day = dateKey(sc.at, zone);
    for (const d of p.schedule.days.filter((x) => x.date === day && x.status === 'scheduled')) {
      const eps = [...new Set(approvedScenesOf(p).filter((s) => d.sceneIds.includes(s.id)).map((s) => s.episode))];
      const what = isEpisodic(p.axes.format) && eps.length ? `Episode ${eps.join(' and ')}` : p.title;
      out.push(`You're scheduled to direct ${what} during this screening.`);
    }
  }
  void ed;
  return out;
}

/** Answer a screening invitation. Accepting checks that you can get there in time; declining keeps the selection. */
export function rsvpScreening(state: GameState, editionId: string, projectId: string, at: number, accept: boolean): void {
  const ed = edition(state, editionId);
  const sc = ed.screenings?.find((x) => x.projectId === projectId && x.at === at);
  if (!sc || sc.done) throw new Error('That screening has already happened.');
  if (sc.rsvpBy !== undefined && state.now > sc.rsvpBy && sc.rsvp === 'pending') {
    sc.rsvp = 'expired';
    throw new Error('The reply deadline has passed.');
  }
  if (!accept) {
    sc.rsvp = 'declined';
    addLog(state, `You declined the invitation to attend the screening at the ${ed.label}. It still screens.`, 'festival', { route: { view: 'event', editionId: ed.id } });
    return;
  }
  const t = screeningTravel(state, ed, sc);
  if (!t.arrivesInTime) throw new Error(`You couldn't arrive in time: the trip takes about ${Math.round(t.hours)} hours.`);
  sc.rsvp = 'accepted';
}

registerHandler('edition-results', (state, ev) => {
  const ed = edition(state, ev.payload.editionId as string);
  if (ed.status === 'complete') return { suppressInterrupt: true };
  const inst = institution(ed.institutionId);
  if (ed.status !== 'announced') {
    // Events that finished before the life began (or without an announcement) still record public results.
    announceEdition(state, ed);
  }
  const messages: string[] = [];
  for (const cat of categoriesFor(inst, ed.year)) {
    const res = ed.results[cat.id];
    if (!res || !cat.competitive || res.winner) continue;
    const pool = [
      ...res.projectIds.map((id) => {
        const p = state.projects.find((x) => x.id === id)!;
        const e = ed.entries.find((x) => x.projectId === id && x.categoryId === cat.id)!;
        const vis = cat.judging === 'members' ? visibility(state, p, ed.start) : 0;
        return { id, kind: 'project' as const, score: playerScore(p, cat, e?.recipients ?? [], cat.judging) + vis };
      }).filter((x) => ed.entries.some((e) => e.projectId === x.id && e.categoryId === cat.id && e.status !== 'withdrawn')),
      ...res.rivalIds.map((id) => ({ id, kind: 'rival' as const, score: ed.rivals.find((r) => r.id === id)?.score ?? 50 })),
    ];
    if (!pool.length) continue;
    const ranked = judge(state, ed, cat, 'winner', pool);
    res.winner = ranked[0].id;
    res.stage = 'winner';
    for (const e of ed.entries.filter((x) => x.categoryId === cat.id && (x.status === 'selected' || x.status === 'nominated'))) {
      const p = state.projects.find((x) => x.id === e.projectId)!;
      const won = res.winner === p.id;
      e.status = won ? 'won' : 'lost';
      if (won) {
        const names = e.recipients.map((rid) => p.credits.find((c) => c.id === rid)?.personName).filter(Boolean);
        const who = cat.recipient === 'project' || cat.recipient === 'producer' ? p.title : `${names.join(' and ')} for ${p.title}`;
        messages.push(`${who} won ${cat.name} at the ${ed.label}.`);
        p.history.push({ at: state.now, text: `Won ${cat.name}, ${ed.label}.` });
      } else {
        const winnerTitle = state.projects.find((x) => x.id === res.winner)?.title ?? rivalTitle(state, ed, res.winner!) ?? 'another work';
        messages.push(`${p.title} didn't win ${cat.name} at the ${ed.label}. It went to ${winnerTitle}.`);
      }
    }
  }
  ed.status = 'complete';
  compactEdition(ed);
  for (const m of messages) addLog(state, m, inst.kind === 'festival' ? 'festival' : 'award', { route: { view: 'event', editionId: ed.id } });
  return messages.length ? { message: messages[0] } : { suppressInterrupt: true };
});

// ---------------- Honors (profile) ----------------

export interface Honor {
  editionLabel: string;
  category: string;
  projectTitle: string;
  result: 'Won' | 'Nominated' | 'Selected';
  personal: boolean;
  at: number;
}

export function honors(state: GameState): Honor[] {
  const out: Honor[] = [];
  for (const ed of state.editions) {
    const inst = institution(ed.institutionId);
    for (const e of ed.entries) {
      if (!['selected', 'nominated', 'won', 'lost'].includes(e.status)) continue;
      const p = state.projects.find((x) => x.id === e.projectId);
      const cat = inst.categories.find((c) => c.id === e.categoryId);
      if (!p || !cat) continue;
      const personal = e.recipients.some((rid) => p.credits.find((c) => c.id === rid)?.person === 'player');
      const result = e.status === 'won' ? 'Won' : inst.kind === 'festival' ? 'Selected' : 'Nominated';
      out.push({ editionLabel: ed.label, category: cat.name, projectTitle: p.title, result, personal, at: ed.end });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

// ---------------- Calendar contributions ----------------

registerCommitmentSource((state, from, to) => {
  const out: { at: number; label: string; route: { view: string; editionId: string }; kind: 'deadline' | 'event' }[] = [];
  for (const ed of state.editions) {
    const mine = ed.entries.some((e) => ['selected', 'nominated'].includes(e.status));
    if (mine && ed.start >= from && ed.start <= to) out.push({ at: ed.start, label: ed.label, route: { view: 'event', editionId: ed.id }, kind: 'event' });
    for (const sc of ed.screenings ?? []) {
      if (sc.done || sc.at < from || sc.at > to) continue;
      const title = state.projects.find((x) => x.id === sc.projectId)?.title ?? 'Your film';
      out.push({ at: sc.at, label: `Screening Of ${title} At The ${ed.label}`, route: { view: 'event', editionId: ed.id }, kind: 'event' });
    }
    if (state.followed.includes(ed.institutionId) && ed.deadline >= from && ed.deadline <= to) out.push({ at: ed.deadline, label: `${ed.label} entry deadline`, route: { view: 'event', editionId: ed.id }, kind: 'deadline' });
  }
  return out;
});

export function isTv(p: Project): boolean {
  return isEpisodic(p.axes.format) || p.axes.format === 'tv-film';
}
export { isNonfiction, personById };

// ---------------- Adopting rules published after an edition was created ----------------

/**
 * A future edition nobody has entered takes the organizer's newest published rulebook, with its deadline events moved
 * to match. Past and current editions, and any edition with an entry, keep the rules they were created with, so no
 * entry or result is ever judged differently. Returns whether it adopted one. Idempotent.
 */
export function adoptRulebook(ed: Edition, events: GameState['events']): boolean {
  const book = currentRulebook(ed.institutionId, ed.year);
  if (!book || ed.rulesId === book.id || (ed.rulesId !== undefined && ed.rulesId !== 'simulated')) return false;
  if (ed.entries.length > 0 || (ed.status !== 'upcoming' && ed.status !== 'open')) return false;
  applyRulebook(ed, book);
  for (const ev of events) {
    if (ev.id === `${ed.id}:deadline`) ev.at = ed.deadline;
    if (ev.id === `${ed.id}:soon`) ev.at = ed.deadline - DAY;
    if (ev.id === `${ed.id}:open`) ev.at = ed.submissionOpens;
  }
  return true;
}

/** Categories the organizer renamed: editions from `fromYear` on hold `to` instead of `from`. */
const RENAMED: { institutionId: string; from: string; to: string; fromYear: number }[] = [
  { institutionId: 'emmys', from: 'tv-movie', to: 'movie', fromYear: 2026 }, // 78th Emmys rules, category 82
];

/** Entries and results a save filed under a category's old name move to the new one, so they are still judged. Idempotent. */
function carryRenamedCategories(ed: Edition): void {
  for (const r of RENAMED) {
    if (ed.institutionId !== r.institutionId || ed.year < r.fromYear) continue;
    for (const e of ed.entries) if (e.categoryId === r.from) e.categoryId = r.to;
    if (ed.results[r.from] && !ed.results[r.to]) ed.results[r.to] = ed.results[r.from];
    delete ed.results[r.from];
  }
}

/** Run on every loaded save: rules published since it was last opened apply to its untouched future editions. */
export function adoptPublishedRules(state: GameState): void {
  let moved = false;
  for (const ed of state.editions) carryRenamedCategories(ed);
  for (const ed of state.editions) if (adoptRulebook(ed, state.events)) moved = true;
  if (moved) state.events.sort((a, b) => a.at - b.at || a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

// ---------------- Save version 2 -> 3 ----------------

/**
 * Version 3 stores each competing film once (GameState.rivalFilms) instead of in every category of every edition, and
 * records which rules each edition is judged by. Past and current editions, and any edition with entries, keep the
 * simulated rules they were created with (`rulesId: 'simulated'`), so no entry or result is judged differently. A
 * future edition nobody has entered adopts the organizer's published rules, with its deadlines moved to match.
 */
export function migrateV2toV3(raw: Record<string, unknown>): Record<string, unknown> {
  type RawRival = { id: string; film?: string; score?: number; title?: string; people?: Record<string, string>; format?: Format; medium?: Medium; runtimeMin?: number; scores?: Record<string, number> };
  type RawEdition = Omit<Edition, 'rivals'> & { rivals: RawRival[] };
  const films: Record<string, RivalFilm> = { ...((raw.rivalFilms as Record<string, RivalFilm> | undefined) ?? {}) };
  const events = [...((raw.events as GameState['events'] | undefined) ?? [])];
  const editions = ((raw.editions as RawEdition[] | undefined) ?? []).map((e) => {
    const rivals = (e.rivals ?? []).map((r) => {
      if (r.film !== undefined && r.score !== undefined) return { id: r.id, film: r.film, score: r.score };
      const parts = String(r.id).split(':');
      const tail = parts[parts.length - 1];
      const film: RivalFilm = { title: r.title ?? 'Untitled', people: r.people ?? {}, format: r.format ?? 'feature', medium: r.medium ?? 'live-action', runtimeMin: r.runtimeMin ?? 90 };
      // Season films share a key across editions; anything else, or a mismatch, keeps its own key.
      let key = /^sl\d/.test(tail) ? tail : r.id;
      if (films[key] && JSON.stringify(films[key]) !== JSON.stringify(film)) key = r.id;
      films[key] ??= film;
      const catId = parts.length >= 3 ? parts[parts.length - 2] : '';
      return { id: r.id, film: key, score: r.scores?.[catId] ?? Object.values(r.scores ?? {})[0] ?? 50 };
    });
    const ed: Edition = { ...e, rivals };
    if (ed.rulesId === undefined && !adoptRulebook(ed, events)) ed.rulesId = 'simulated';
    return ed;
  });
  events.sort((a, b) => a.at - b.at || a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { ...raw, editions, events, rivalFilms: films };
}

/** Version 4: finished editions are compacted (compactEdition). */
export function migrateV3toV4(raw: Record<string, unknown>): Record<string, unknown> {
  const editions = ((raw.editions as Edition[] | undefined) ?? []).map((e) => {
    const ed: Edition = { ...e, results: Object.fromEntries(Object.entries(e.results ?? {}).map(([k, r]) => [k, { ...r, rivalIds: [...r.rivalIds] }])), rivals: [...(e.rivals ?? [])] };
    compactEdition(ed);
    return ed;
  });
  return { ...raw, editions };
}
