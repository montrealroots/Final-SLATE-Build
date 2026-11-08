// Festivals and awards. Institutions are real names. Where an organizer's rules for an edition were read, they are
// applied from versioned rulebooks (rulebooks.ts) and labelled official or projected; everything else uses SIMULATED
// game rules modeled on each event's general shape. Dates are official only where docs/DATA-PROVENANCE.md cites an
// announcement; all others are generated once per edition from a seasonal window and saved, so reloading never moves them.

import { getPlace } from '../data/places';
import institutionsUrl from '../data/institutions.json?url';
import { COMEDY_MUSICAL, castPlacement, competesAs, documentsNeeded } from './script-effects';
import { genre } from './genres';
import { personById } from './people';
import { isNonfiction } from './projects';
import { travelHours } from './state';
import { gaussian, intBetween, pick, stream, unit } from './rng';
import { addLog, onNewGame, registerCommitmentSource, registerHandler, schedule, type HandlerResult } from './state';
import { DAY, addDaysToKey, dateKey, formatDateKey, localParts, localToInstant, parseYmd, weekdayOfKey, ymd } from './time';
import type { Credit, Edition, Format, GameState, Medium, Project, RivalFilm, Screening } from './types';
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

const SHORTS: Format[] = ['short', 'documentary-short'];

/** The categories an edition actually holds. Lookups by ID use the full list, so older saves keep their entries. */
export function categoriesFor(inst: Institution, year: number): Category[] {
  return inst.categories.filter((c) => !c.years || (year >= c.years[0] && year <= c.years[1]));
}

/**
 * The festivals and awards with their categories, rules and announced dates: data, not code, in data/institutions.json
 * (November 8, 2026). It was part of the startup JavaScript (about 60 kB with its builders) until then; now it is fetched
 * in the background from startup, like the genre catalog, and every game waits for it before opening (ui/store.ts enter),
 * so nothing that runs in a game reads it empty. Published whole or not at all; a failed load is fetched again.
 */
export const INSTITUTIONS: Institution[] = [];
const instById = new Map<string, Institution>();
let institutionsLoad: Promise<void> | null = null;

/** Build and check the institutions from their raw file, without publishing anything. Throws on the first problem. */
export function buildInstitutions(raw: unknown): Institution[] {
  const list = (raw as { institutions?: unknown } | null)?.institutions;
  if (!Array.isArray(list) || !list.length) throw new Error('The festival and awards calendar has no entries.');
  const seen = new Set<string>();
  for (const [n, inst] of list.entries()) {
    const ok = inst && typeof inst.id === 'string' && typeof inst.name === 'string' && typeof inst.placeId === 'string' && Array.isArray(inst.window) && Array.isArray(inst.categories) && inst.categories.length > 0;
    if (!ok) throw new Error(`Festival or award ${n + 1} is malformed.`);
    if (seen.has(inst.id)) throw new Error(`${inst.id} appears twice.`);
    seen.add(inst.id);
  }
  return list as Institution[];
}

export function applyInstitutions(raw: unknown): void {
  const built = buildInstitutions(raw);
  INSTITUTIONS.splice(0, INSTITUTIONS.length, ...built);
  instById.clear();
  for (const i of built) instById.set(i.id, i);
}

export const institutionsLoaded = (): boolean => INSTITUTIONS.length > 0;

/** Load the calendar; callers at the same time share one load, and a failed load publishes nothing and is retried. */
export function loadInstitutions(): Promise<void> {
  if (institutionsLoaded()) return Promise.resolve();
  if (!institutionsLoad) {
    const attempt: Promise<void> = fetch(institutionsUrl)
      .then((r) => {
        if (!r.ok) throw new Error(`Couldn't load the festival and awards calendar (${r.status}).`);
        return r.json() as Promise<unknown>;
      })
      .then(applyInstitutions)
      .finally(() => { if (institutionsLoad === attempt) institutionsLoad = null; });
    institutionsLoad = attempt;
  }
  return institutionsLoad;
}

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
  // Drama or comedy: where you said it competes, else its genres (competesAs).
  if (cat.genres === COMEDY_MUSICAL) { if (competesAs(p) !== 'comedy') reasons.push('This category is for comedy and musical work; this project competes as drama.'); }
  else if (cat.genres && !p.axes.genres.some((g) => cat.genres!.includes(g.id))) reasons.push(`This category needs one of its genres, such as ${genre(cat.genres[0]).name}.`);
  if (cat.excludeGenres === COMEDY_MUSICAL) { if (competesAs(p) === 'comedy') reasons.push('Comedy and musical work competes in a separate category.'); }
  else if (cat.excludeGenres && p.axes.genres.some((g) => cat.excludeGenres!.includes(g.id))) reasons.push('Its genres compete in a separate category.');
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
      // Leading or supporting as the producer placed the part, else by its size; story functions never decide it.
      const placed = (name?: string) => { const ch = chars.find((x) => x.name === name); return ch ? castPlacement(ch) : null; };
      pool = credits.filter((c) => (c.contribution === 'Cast' || c.contribution === 'Performance Capture') && placed(c.characterName) === cat.recipient);
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

/** What an entry form still needs from the Story panel, or null. */
export function entryNeeds(p: Project): string | null {
  return documentsNeeded(p, ['pitch'], isNonfiction(p.axes.format), 'Every entry form');
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
