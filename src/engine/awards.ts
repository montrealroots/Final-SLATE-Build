// Festivals and awards. Institutions are real names. Where an organizer's rules for an edition were read, they are
// applied from versioned rulebooks (rulebooks.ts) and labelled official or projected; everything else uses SIMULATED
// game rules modeled on each event's general shape. Dates are official only where docs/DATA-PROVENANCE.md cites an
// announcement; all others are generated once per edition from a seasonal window and saved, so reloading never moves them.

import { getPlace } from '../data/places';
import institutionsUrl from '../data/institutions.json?url';
import { versionRuntime } from './versions';
import { castPlacement, documentsNeeded } from './script-effects';
import { genre } from './genres';
import { personById } from './people';
import { countryName } from '../world/gazetteer/gazetteer';
import { isEpisodic, isNonfiction } from './projects';
import { travelHours } from './state';
import { gaussian, intBetween, pick, stream, unit } from './rng';
import { addLog, onNewGame, registerCommitmentSource, registerHandler, schedule, type HandlerResult } from './state';
import { DAY, addDaysToKey, dateKey, formatDateKey, localParts, localToInstant, parseYmd, weekdayOfKey, ymd } from './time';
import type { Credit, Edition, Format, GameState, Medium, Project, RivalFilm, Screening } from './types';
import { currentRulebook, registerRulebooks, rulebook, type CategoryRules, type DeadlineRule, type QualifyingAward, type QualifyingList, type RuleBook, type RuntimeRule } from './rulebooks';

export type Recipient = 'project' | 'director' | 'writer' | 'lead' | 'supporting' | 'producer' | 'voice' | 'ensemble' | 'guest' | 'performer' | 'host' | 'narrator' | 'craft' | 'song' | 'national' | 'career';
/** How a category is decided (docs/awards/DESIGN.md). Categories without one are older data: entered and judged as awards. */
export type CategoryKind = 'award' | 'area' | 'juried' | 'section' | 'prize' | 'audience' | 'partner' | 'honorary';
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
  kind?: CategoryKind;
  /** Prizes, audience and partner awards: the sections whose selected works they are decided among. */
  parents?: string[];
  /** Craft awards: the crew roles credited for the craft. */
  crafts?: string[];
  /** Further recipient groups (an award to the producers and the director). */
  with?: Recipient[];
  material?: 'original' | 'adapted';
  /** Comedy or drama, from the project's own declaration. */
  class?: 'comedy' | 'drama';
  family?: string[];
  episodes?: [number, number];
  /** Requirements beyond format and medium (awards-rules.ts). */
  need?: string[];
  career?: string;
  section?: string;
  /** False when the organizer's material for it wasn't read; its rules are the game's. */
  verified?: boolean;
  /** No longer held: kept so older entries and results keep their category. */
  retired?: boolean;
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


/** The categories an edition actually holds. Lookups by ID use the full list, so older saves keep their entries. */
export function categoriesFor(inst: Institution, year: number): Category[] {
  return inst.categories.filter((c) => !c.retired && (!c.years || (year >= c.years[0] && year <= c.years[1])));
}

/** Whether a category takes entries: prizes are decided among a section's films, honorary awards from a body of work. */
export const enterable = (c: Category): boolean => !c.kind || c.kind === 'award' || c.kind === 'area' || c.kind === 'juried' || c.kind === 'section';

/**
 * The festivals and awards with their categories, rules and announced dates: data, not code, in data/institutions.json
 * (November 8, 2026). It was part of the startup JavaScript (about 60 kB with its builders) until then; now it is fetched
 * in the background from startup, like the genre catalog, and every game waits for it before opening (ui/store.ts enter),
 * so nothing that runs in a game reads it empty. Published whole or not at all; a failed load is fetched again.
 */
export const INSTITUTIONS: Institution[] = [];
const instById = new Map<string, Institution>();
let institutionsLoad: Promise<void> | null = null;

/**
 * What the catalog's requirement and recipient fields mean (awards-rules.ts) loads with the catalog, not at startup: it
 * took the startup JavaScript over its budget on November 9, 2026 (705 kB against 700).
 */
let rulesModule: typeof import('./awards-rules') | null = null;
const catalogRules = () => {
  if (!rulesModule) throw new Error('The festival and awards rules are still loading.');
  return rulesModule;
};
/** How prizes, honorary awards and national committees are decided, and results shown (awards-results.ts), likewise. */
let resultsModule: typeof import('./awards-results') | null = null;
const deciding = () => {
  if (!resultsModule) throw new Error('The festival and awards rules are still loading.');
  return resultsModule;
};

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
    const data = fetch(institutionsUrl).then((r) => {
      if (!r.ok) throw new Error(`Couldn't load the festival and awards calendar (${r.status}).`);
      return r.json() as Promise<unknown>;
    });
    const attempt: Promise<void> = Promise.all([data, import('./awards-rules'), import('./awards-results')])
      .then(([raw, m, r]) => { applyInstitutions(raw); rulesModule = m; resultsModule = r; registerRulebooks(m.RULEBOOK_DATA); })
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
export function applyRulebook(ed: Pick<Edition, 'institutionId' | 'year' | 'deadline' | 'submissionOpens' | 'deadlinePlanned' | 'rulesId' | 'defaultDeadline' | 'announce' | 'start'>, book: RuleBook): void {
  ed.rulesId = book.id;
  ed.defaultDeadline ??= ed.deadline;
  const inst = institution(ed.institutionId);
  const held = categoriesFor(inst, ed.year);
  const all = held.filter(enterable).flatMap((c) => book.categories[c.id]?.deadlines?.value ?? []).map(deadlineInstant);
  const everyCategoryRuled = held.filter(enterable).every((c) => book.categories[c.id]?.deadlines);
  ed.deadline = Math.max(everyCategoryRuled ? -Infinity : ed.defaultDeadline, ...all);
  if (everyCategoryRuled) ed.deadlinePlanned = undefined;
  // A deadline the organizer set later than the game's announcement moves the announcement after it, so entries are
  // judged. Until November 9, 2026 the Golden Globes' December 3 deadline fell after their simulated November 26
  // nominations, and entries made in between were never judged.
  if (ed.announce <= ed.deadline) ed.announce = Math.min(ed.start - DAY, ed.deadline + 7 * DAY);
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
  /** Why the entry is provisional, when it isn't a planned release. */
  provisionalNote?: string;
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

export function countryWords(c: string): string {
  // Named from the gazetteer: until November 9, 2026 every country but three showed as its code ("a release in ES").
  return c === 'US' ? 'the United States' : c === 'GB' ? 'the United Kingdom' : countryName(c).replace(/^The /, 'the '); // mid-sentence
}

type ReleaseFit = { ok: boolean; provisional: boolean; reason?: string; via?: 'release' | 'festival' | 'category'; note?: string };

/** An entry the organizer deemed eligible: accepted, or judged after that. */
const DEEMED_ELIGIBLE: EditionEntryStatus[] = ['accepted', 'selected', 'nominated', 'not-nominated', 'won', 'lost', 'mention'];
type EditionEntryStatus = Edition['entries'][number]['status'];

/**
 * A qualifying release under an organizer's rule, or another route it allows: a win on its qualifying-festival list
 * (`list`, from the rule unless given), or an accepted entry in another of the edition's categories.
 */
function ruledReleaseFits(state: GameState, p: Project, ed: Edition, rules: CategoryRules, list = rules.release?.value.festivalList ? catalogRules().qualifyingList(rules.release.value.festivalList) : undefined): ReleaseFit {
  const { routes, countries, outside, exempt, festivalAwards, viaCategory, festivalSelection } = rules.release!.value;
  if (exempt?.includes(p.axes.format)) return { ok: true, provisional: false };
  const win = rules.qualifying?.value ?? ed.eligibility;
  const home = getPlace(p.axes.basePlaceId).country;
  // 'origin' stands for the production country (the Golden Globes' Non-English Language award, A.3.c.vi).
  const where = (t: string) => (outside ? !outside.includes(t) : countries.includes(t) || (countries.includes('origin') && t === home));
  const fits = (r: Project['releases'][number]) => (routes as string[]).includes(r.route) && r.territories.some(where) && r.date >= win.from && r.date <= win.to;
  if (p.releases.some((r) => r.status === 'released' && fits(r))) return { ok: true, provisional: false, via: 'release' };
  if (list && qualifyingWin(state, p, list)) return { ok: true, provisional: false, via: 'festival' };
  if (festivalAwards && festivalWin(state, p, festivalAwards, win)) return { ok: true, provisional: false, via: 'festival' };
  if (festivalSelection && state.editions.some((e) => {
    if (!festivalSelection.includes(e.institutionId)) return false;
    const end = dateKey(e.end, getPlace(institution(e.institutionId).placeId).zone);
    return end >= win.from && end <= win.to && e.entries.some((x) => x.projectId === p.id && ['selected', 'nominated', 'won', 'lost', 'mention'].includes(x.status));
  })) return { ok: true, provisional: false, via: 'festival' };
  const via = viaCategory ? ed.entries.find((x) => x.projectId === p.id && x.categoryId === viaCategory && x.status !== 'withdrawn') : undefined;
  const viaName = viaCategory ? institution(ed.institutionId).categories.find((c) => c.id === viaCategory)?.name ?? viaCategory : '';
  if (via && DEEMED_ELIGIBLE.includes(via.status)) return { ok: true, provisional: false, via: 'category' };
  if (p.releases.some((r) => r.status === 'planned' && fits(r))) return { ok: true, provisional: true, via: 'release' };
  if (via?.status === 'submitted') return { ok: true, provisional: true, via: 'category', note: `Entered provisionally. It qualifies through its ${viaName} entry, which must be accepted.` };
  // A festival-only route (the Goyas' shorts): no release qualifies, only a selection.
  if (!routes.length && festivalSelection) return { ok: false, provisional: false, reason: `It needs a selection at ${festivalSelection.map((i) => institution(i).short).join(', ')} between ${formatDateKey(win.from)} and ${formatDateKey(win.to)}.` };
  const how = routes.length === 1 ? `a ${routes[0]} release` : 'a release';
  const place = outside ? `outside ${outside.map(countryWords).join(' and ')}` : `in ${countries.map((c) => (c === 'origin' ? countryWords(home) : countryWords(c))).join(' or ')}`;
  const orFest = list ? `, or a win of an award on the ${institution(ed.institutionId).short} qualifying-festival list between ${formatDateKey(list.window.from)} and ${formatDateKey(list.window.to)}` : festivalAwards ? ', or a top award at one of its qualifying festivals in that time' : '';
  const orVia = viaCategory ? `, or an accepted ${viaName} entry` : '';
  const orSel = festivalSelection ? `, or a selection at ${festivalSelection.map((i) => institution(i).short).join(', ')} in that time` : '';
  return { ok: false, provisional: false, reason: `It needs ${how} ${place} between ${formatDateKey(win.from)} and ${formatDateKey(win.to)}${orFest}${orSel}${orVia}.` };
}

/** Version 1 of the 99th Oscars' shorts rule only: any listed "institution:category" result inside the window. */
function festivalWin(state: GameState, p: Project, awards: string[], win: { from: string; to: string }): boolean {
  return state.editions.some((e) => {
    const end = dateKey(e.end, getPlace(institution(e.institutionId).placeId).zone);
    return end >= win.from && end <= win.to && Object.entries(e.results).some(([catId, r]) => r.revealed && (r.winner === p.id || !!r.winners?.includes(p.id)) && awards.includes(`${e.institutionId}:${catId}`));
  });
}

/**
 * The award on a qualifying list that the project won, on a festival closing day inside the list's window. It counts
 * only when the project's entry for that exact award says won and the result is out: a withdrawn or disqualified entry,
 * a selection, a mention, another prize at the same festival or a win outside the window doesn't qualify.
 */
export function qualifyingWin(state: GameState, p: Project, list: QualifyingList): { award: QualifyingAward; label: string; date: string } | undefined {
  for (const e of state.editions) {
    const end = dateKey(e.end, getPlace(institution(e.institutionId).placeId).zone);
    if (end < list.window.from || end > list.window.to) continue;
    for (const x of e.entries) {
      if (x.projectId !== p.id || x.status !== 'won' || !e.results[x.categoryId]?.revealed) continue;
      const award = list.awards.find((a) => a.institution === e.institutionId && a.category === x.categoryId);
      if (award) return { award, label: e.label, date: end };
    }
  }
  return undefined;
}

const OSCAR_LIST_KIND: Record<string, 'shorts' | 'documentary' | 'international'> = { 'live-short': 'shorts', 'animated-short': 'shorts', 'doc-short': 'shorts', documentary: 'documentary', international: 'international' };

/**
 * The qualifying-festival list an edition's category reads: its rulebook's, or, for an Academy Awards category the
 * rulebook leaves to SLATE, the Academy's list for that year (projected from the newest one for a later year).
 */
export function festivalListFor(ed: Edition, categoryId: string): QualifyingList | undefined {
  const ruled = categoryRules(ed, categoryId);
  if (ruled) return ruled.release?.value.festivalList ? catalogRules().qualifyingList(ruled.release.value.festivalList) : undefined;
  const kind = ed.institutionId === 'oscars' ? OSCAR_LIST_KIND[categoryId] : undefined;
  return kind ? catalogRules().projectedList(kind, 'oscars', ed.year)?.list : undefined;
}

/**
 * Release routes for Academy Awards categories the rulebook leaves to SLATE: shorts and documentary features by a US
 * theatrical run or a listed festival award, the documentary also by an accepted International Feature Film entry, and
 * International Feature Film by a theatrical release outside the United States or a listed award (Rules Thirteen,
 * Sixteen and the shorts rules, as read for the 99th Awards). Simulated: the dates are the edition's own.
 */
function simulatedOscarRelease(ed: Edition, categoryId: string): CategoryRules | undefined {
  const kind = OSCAR_LIST_KIND[categoryId];
  if (ed.institutionId !== 'oscars' || !kind || categoryRules(ed, categoryId)) return undefined;
  const r = (value: NonNullable<CategoryRules['release']>['value']) => ({ release: { value, status: 'projected' as const, source: 'simulated', note: 'SLATE\u2019s rules for an edition whose rules weren\u2019t read.' } });
  if (kind === 'international') return r({ routes: ['theatrical'], countries: [], outside: ['US'] });
  return r({ routes: ['theatrical'], countries: ['US'], viaCategory: kind === 'documentary' ? 'international' : undefined });
}

function runtimeProblem(rt: number, r: RuntimeRule, episodes = false): string | null {
  const it = episodes ? `Its episodes average ${rt} minutes.` : `It runs ${rt} minutes.`;
  const of = episodes ? 'episodes of ' : '';
  if (r.over !== undefined && rt <= r.over) return `${it} This category needs ${of}more than ${r.over}.`;
  if (r.atLeast !== undefined && rt < r.atLeast) return `${it} This category needs ${of}at least ${r.atLeast}.`;
  if (r.atMost !== undefined && rt > r.atMost) return `${it} This category takes ${of}${r.atMost} minutes or less, credits included.`;
  if (r.under !== undefined && rt >= r.under) return `${it} This category takes ${episodes ? 'episodes' : 'work'} under ${r.under} minutes, credits included.`;
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

export function checkEligibility(state: GameState, p: Project, ed: Edition, cat: Category, recipientIds?: string[], versionId?: string, episode?: number): Eligibility {
  const inst = institution(ed.institutionId);
  const rules = categoryRules(ed, cat.id);
  const reasons: string[] = [];
  let provisional = false;
  let provisionalNote: string | undefined;
  const origin = getPlace(p.axes.basePlaceId).country;
  if (!enterable(cat)) reasons.push(cat.kind === 'honorary' ? 'Honorary awards take no entries: the organizer chooses from a body of work.' : 'This award is decided among the films selected for its section. Enter the section instead.');
  const formats = rules?.formats?.value ?? cat.formats;
  if (!formats.includes(p.axes.format)) reasons.push(`This category doesn't accept ${p.axes.format.replace('-', ' ')} projects.`);
  // A rule that measures the dialogue replaces the check of the declared language.
  reasons.push(...catalogRules().requirementProblems(state, p, rules?.nonEnglish ? { ...cat, need: cat.need?.filter((n) => n !== 'non-english') } : cat));
  if (cat.recipient === 'national') {
    if (getPlace(p.axes.basePlaceId).country === 'US') reasons.push('This category is for films made outside the United States.');
    if (!rules?.nonEnglish && p.axes.dialogueLanguages[0] === 'en') reasons.push('This category is for films whose dialogue is mostly not in English.');
  }
  if (rules?.boxOffice) {
    const want = rules.boxOffice.value;
    const got = catalogRules().boxOffice(p, want.country, rules.qualifying?.value);
    const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    if (got.worldwide < want.worldwide || got.domestic < want.domestic) reasons.push(`Its cinemas have reported ${usd(got.worldwide)} worldwide, ${usd(got.domestic)} of it in ${countryWords(want.country)}, in the qualifying year; this award needs ${usd(want.worldwide)}, ${usd(want.domestic)} of it in ${countryWords(want.country)}.`);
  }
  if (rules?.nonEnglish) {
    const share = catalogRules().nonEnglishShare(p);
    if (share === null && p.axes.dialogueLanguages[0] === 'en') reasons.push('It has no written dialogue and its first dialogue language is English; this category needs more than half the dialogue in another language.');
    else if (share !== null && share <= rules.nonEnglish.value) reasons.push(`${Math.round(share * 100)}% of its written dialogue is in a language other than English; this category needs more than ${Math.round(rules.nonEnglish.value * 100)}%.`);
  }
  // A version entered instead of the main cut is judged at its own runtime (versions.ts).
  const version = versionId ? p.versions?.find((v) => v.id === versionId) : undefined;
  if (versionId && !version) reasons.push('That version no longer exists.');
  if (p.delivered) {
    const rt = version ? versionRuntime(p, version) : p.delivered.runtimeMin;
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
  if (rules?.maxBudget && (p.finance?.estimate ?? 0) >= rules.maxBudget.value) reasons.push(`Its budget is ${(p.finance?.estimate ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}. This category takes films made for under ${rules.maxBudget.value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })}.`);
  if (rules?.episodeRuntime && p.delivered) {
    const episodic = isEpisodic(p.axes.format);
    const why = runtimeProblem(Math.round(p.delivered.runtimeMin / (episodic ? Math.max(1, p.axes.episodeCount) : 1)), rules.episodeRuntime.value, episodic);
    if (why) reasons.push(why);
  }
  if (rules?.minEpisodes && isEpisodic(p.axes.format) && p.axes.episodeCount < rules.minEpisodes.value) reasons.push(`It has ${p.axes.episodeCount} episode${p.axes.episodeCount === 1 ? '' : 's'}. This category needs at least ${rules.minEpisodes.value}.`);
  // Drama or comedy is the category's `class`, read by requirementProblems from where the project says it competes. A
  // reference check against the genre list did this until November 9, 2026, and never matched the JSON catalog.
  if (cat.genres && !p.axes.genres.some((g) => cat.genres!.includes(g.id))) reasons.push(`This category needs one of its genres, such as ${genre(cat.genres[0]).name}.`);
  if (cat.excludeGenres && p.axes.genres.some((g) => cat.excludeGenres!.includes(g.id))) reasons.push('Its genres compete in a separate category.');
  // A category for work from elsewhere (a "non-" requirement: the Goyas' European and Ibero-American films, the Césars' and
  // the Japan Academy's foreign films) isn't held to the event's own countries. Until November 9, 2026 it was, so those
  // four categories took nothing at all.
  const foreignCategory = cat.need?.some((n) => n.startsWith('non-') || n.includes('-non-'));
  if (inst.origin && !foreignCategory && !inst.origin.includes(origin)) reasons.push('Your production base country isn\'t eligible for this event.');
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
    if (rules?.unreleased && shown.some((x) => x.route !== 'festival-premiere')) reasons.push('It has already been released, and this section only takes work not yet released in cinemas, on television, online or on home video.');
    if (rules?.europeanPremiere && shown.some((x) => x.countries.some((c) => c !== origin && catalogRules().EUROPE.includes(c)))) reasons.push('This section requires at least a European premiere, and your project has already been shown in Europe outside its home country.');
    const nsi = rules?.notShownIn?.value;
    if (nsi) {
      const endKey = dateKey(ed.end, getPlace(inst.placeId).zone);
      const excepted = (x: { route: string }) => x.route === 'festival-premiere' && !!p.premiere?.editionId && (nsi.exceptAt ?? []).includes(state.editions.find((e) => e.id === p.premiere!.editionId)?.institutionId ?? '');
      if (showingsBefore(p, endKey, ed.id).some((x) => x.countries.some((c) => nsi.countries.includes(c)) && !excepted(x))) {
        reasons.push(`It has been shown publicly in ${nsi.countries.map(countryWords).join(' or ')}, which this section doesn't allow before the festival${nsi.exceptAt?.length ? ` (a ${nsi.exceptAt.map((i) => institution(i).short).join(' or ')} screening is the exception)` : ''}.`);
      }
    }
  } else {
    const sim = simulatedOscarRelease(ed, cat.id);
    const rel: ReleaseFit = rules?.release ? ruledReleaseFits(state, p, ed, rules) : sim ? ruledReleaseFits(state, p, ed, sim, festivalListFor(ed, cat.id)) : releaseFits(p, inst, ed);
    if (!rel.ok) reasons.push(rel.reason!);
    provisional = rel.provisional;
    provisionalNote = rel.note;
    const tf = rules?.theatricalFirst?.value;
    if (tf && !(tf.unlessFestival && rel.via === 'festival')) {
      const home = getPlace(p.axes.basePlaceId).country; // 'origin': the production country (the Goyas' European and Ibero-American awards)
      const inC = (r: Project['releases'][number]) => r.status !== 'cancelled' && r.territories.some((t) => tf.countries.includes('*') || tf.countries.includes(t) || (tf.countries.includes('origin') && t === home));
      const theatrical = p.releases.filter((r) => inC(r) && r.route === 'theatrical').map((r) => r.date).sort()[0];
      // A festival screening isn't a release outside cinemas; until November 9, 2026 it counted as one, and ruled out of the
      // Goyas, the Oscars' documentary and the guild awards a film that premiered at a festival before its theatrical run.
      const other = p.releases.filter((r) => inC(r) && r.route !== 'theatrical' && r.route !== 'festival-premiere').map((r) => r.date).sort()[0];
      const there = tf.countries.includes('*') ? '' : ` in ${tf.countries.map((c) => countryWords(c === 'origin' ? home : c)).join(' or ')}`;
      if (other && (!theatrical || other < theatrical)) reasons.push(`It was released on ${formatDateKey(other)} outside cinemas${there}, before any theatrical run${there ? ' there' : ''}, which rules it out.`);
    }
    const tv = rules?.tvFirst?.value;
    if (tv) {
      const inC = (r: Project['releases'][number]) => r.status !== 'cancelled' && (tv.countries.includes('*') || r.territories.some((t) => tv.countries.includes(t)));
      const cinema = p.releases.filter((r) => inC(r) && r.route === 'theatrical').map((r) => r.date).sort()[0];
      const aired = p.releases.filter((r) => inC(r) && r.route !== 'theatrical' && r.route !== 'festival-premiere').map((r) => r.date).sort()[0];
      const where = tv.countries.includes('*') ? '' : ` in ${tv.countries.map(countryWords).join(' or ')}`;
      if (cinema && tv.never) reasons.push(`It opened in cinemas${where} on ${formatDateKey(cinema)}; this award is for films that are never released in cinemas.`);
      else if (cinema && (!aired || cinema < aired)) reasons.push(`It opened in cinemas${where} on ${formatDateKey(cinema)}, before airing there, which rules it out of television awards.`);
    }
  }
  // Until November 9, 2026, an Oscar short whose rules weren't read qualified through any festival win at all; it now
  // reads the Academy's list (simulatedOscarRelease above).
  const single = rules?.oneEpisode && isEpisodic(p.axes.format);
  if (single && episode !== undefined && !(Number.isInteger(episode) && episode >= 1 && episode <= p.axes.episodeCount)) reasons.push(`${p.title} has ${p.axes.episodeCount} episodes; choose one of them.`);
  const recipients = categoryRecipients(state, p, cat, recipientIds, rules, episode);
  if (!recipients.length && single && categoryRecipients(state, p, cat, recipientIds).length) {
    reasons.push(`Nobody credited for this category worked on episode ${episode ?? entryEpisodes(state, p, cat, rules)[0] ?? 1}.`);
  } else if (!recipients.length) {
    // Credited, but ruled out by the category's own rules: every rule that rules out the first one credited.
    const c = categoryRecipients(state, p, cat, recipientIds)[0];
    const why: string[] = [];
    if (c) {
      const R = catalogRules();
      const name = c.characterName ?? c.personName;
      const span = rules?.episodeShare?.value;
      const earlier = rules?.notAfterNomination?.value;
      const screen = rules?.screenShare?.value;
      if (rules?.noNarrators && R.isNarrator(p, c)) why.push('A narrator can\'t be entered in this performer category; the narration can be entered for a narrator award.');
      if (earlier && R.nominatedEarlier(state, p, c, earlier.institution, earlier.categories)) why.push(`${name} was nominated as a lead or supporting performance in an earlier season, so the part can't be entered as a guest.`);
      if (span && ((span.under !== undefined && R.episodeShare(p, c) >= span.under) || (span.atLeast !== undefined && R.episodeShare(p, c) < span.atLeast))) {
        why.push(`This category takes performers in ${span.under !== undefined ? 'fewer than half' : 'at least half'} of the episodes; ${name} is in ${c.episodes === 'all' ? p.axes.episodeCount : c.episodes.length} of ${p.axes.episodeCount}.`);
      }
      if (screen && R.screenShare(p, c, screen.per) < screen.atLeast) why.push(`${name} is on screen for ${Math.round(R.screenShare(p, c, screen.per) * 100)}% of ${screen.per === 'episode' ? 'their biggest episode' : 'the running time'} in the approved script; this category needs at least ${Math.round(screen.atLeast * 100)}%.`);
    }
    reasons.push(...(why.length ? why : [recipientMissingReason(cat)]));
  }
  return { eligible: reasons.length === 0, provisional, provisionalNote, reasons, recipients };
}

function recipientMissingReason(cat: Category): string {
  if (cat.recipient === 'lead' || cat.recipient === 'supporting') {
    return cat.actingTitle ? `No credited ${cat.recipient === 'lead' ? 'lead' : 'supporting'} performance can be entered as ${cat.actingTitle.toLowerCase()} in this category.` : `No credited ${cat.recipient} performance.`;
  }
  if (cat.recipient === 'voice') return 'No credited voice performance.';
  if (cat.recipient === 'narrator') return 'No credited narrator: cast a part whose story function is Narrator, and give the program a narration sequence.';
  return 'No credited person for this category.';
}

/** Credited recipients: only people with the relevant actual contribution, less any the category's rules exclude. */
export function categoryRecipients(state: GameState, p: Project, cat: Category, chosen?: string[], rules?: CategoryRules, episode?: number): Credit[] {
  const all = ruledRecipients(state, p, cat, chosen, rules);
  if (!rules?.oneEpisode || !isEpisodic(p.axes.format)) return all;
  // One episode: those credited on it (the first episode with anyone credited, until one is chosen), at most `max`;
  // entered whole when there is no episode to choose (`wholeWhenAll`).
  const ep = episode ?? entryEpisodes(state, p, cat, rules)[0];
  if (ep === undefined) return rules.oneEpisode.value.max ? all.slice(0, rules.oneEpisode.value.max) : all;
  const on = all.filter((c) => c.episodes === 'all' || c.episodes.includes(ep)).sort((a, b) => a.billing - b.billing);
  return rules.oneEpisode.value.max ? on.slice(0, rules.oneEpisode.value.max) : on;
}

/**
 * For a category entered for one episode: the episodes someone credited for it worked on, in order. None when the work
 * is entered whole (`wholeWhenAll`, everyone credited on every part).
 */
export function entryEpisodes(state: GameState, p: Project, cat: Category, rules?: CategoryRules): number[] {
  const all = ruledRecipients(state, p, cat, undefined, rules);
  if (rules?.oneEpisode?.value.wholeWhenAll && all.every((c) => c.episodes === 'all' || c.episodes.length >= p.axes.episodeCount)) return [];
  return Array.from({ length: p.axes.episodeCount }, (_, i) => i + 1).filter((n) => all.some((c) => c.episodes === 'all' || c.episodes.includes(n)));
}

function ruledRecipients(state: GameState, p: Project, cat: Category, chosen?: string[], rules?: CategoryRules): Credit[] {
  const all = creditedRecipients(state, p, cat, chosen, rules);
  if (!rules?.noNarrators && !rules?.episodeShare && !rules?.notAfterNomination && !rules?.screenShare) return all;
  const span = rules.episodeShare?.value;
  const before = rules.notAfterNomination?.value;
  const screen = rules.screenShare?.value;
  return all.filter((c) => !(rules.noNarrators && catalogRules().isNarrator(p, c))
    && (!span || ((span.under === undefined || catalogRules().episodeShare(p, c) < span.under) && (span.atLeast === undefined || catalogRules().episodeShare(p, c) >= span.atLeast)))
    && !(before && catalogRules().nominatedEarlier(state, p, c, before.institution, before.categories))
    && !(screen && catalogRules().screenShare(p, c, screen.per) < screen.atLeast));
}





function creditedRecipients(state: GameState, p: Project, cat: Category, chosen?: string[], rules?: CategoryRules): Credit[] {
  const credits = p.credits;
  const chars = p.drafts.find((d) => d.number === p.approvedDraft)?.characters ?? [];
  // Leading or supporting as the producer placed the part, else by its size; story functions never decide it.
  const placed = (name?: string) => { const ch = chars.find((x) => x.name === name); return ch ? castPlacement(ch) : null; };
  const added = catalogRules().newRecipients(state, p, cat, placed);
  if (added) return chosen?.length ? added.filter((c) => chosen.includes(c.id)) : added;
  if (cat.with?.length) {
    // Several recipient groups (producers and the director): each credited person once.
    const all: Credit[] = [];
    for (const g of [cat.recipient, ...cat.with]) for (const c of categoryRecipients(state, p, { ...cat, recipient: g, with: undefined }, undefined, rules)) if (!all.includes(c)) all.push(c);
    return chosen?.length ? all.filter((c) => chosen.includes(c.id)) : all;
  }
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

export function involved(state: GameState, ed: Edition): boolean {
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
  // Validation: entries are rechecked against their rules at the deadline. National selections are decided first, so a
  // category that a national entry qualifies for (the Academy's documentary route 3) reads the committee's decision.
  const national = (x: { categoryId: string }) => inst.categories.find((c) => c.id === x.categoryId)?.recipient === 'national';
  const submitted = ed.entries.filter((x) => x.status === 'submitted');
  // A country puts forward one film: your strongest is considered first, and a later one from the same country isn't.
  const strength = (x: { projectId: string }) => state.projects.find((q) => q.id === x.projectId)?.quality?.overall ?? 0;
  submitted.sort((a, b) => Number(national(b)) - Number(national(a)) || (national(a) ? strength(b) - strength(a) : 0));
  const represented = new Map<string, string>();
  for (const e of submitted) {
    const p = state.projects.find((x) => x.id === e.projectId);
    const cat = inst.categories.find((c) => c.id === e.categoryId);
    if (!p || !cat) continue;
    const saved = state.now;
    state.now = Math.min(ed.deadline, categoryDeadline(ed, cat, p)) - 1;
    const el = checkEligibility(state, p, ed, cat, e.recipients, e.versionId);
    state.now = saved;
    if (el.eligible && cat.recipient === 'national') {
      // The production country's committee puts forward one film (docs/awards/DESIGN.md rule 7).
      const country = getPlace(p.axes.basePlaceId).country;
      const taken = represented.get(country);
      const c = deciding().committee(state, ed, p, taken);
      if (c.chosen && c.via === 'committee') represented.set(country, p.title);
      e.status = c.chosen ? 'accepted' : 'not-selected';
      e.reason = c.reason;
      addLog(state, `${p.title}: ${c.reason}`, 'award', { projectId: p.id, route: { view: 'event', editionId: ed.id } });
    } else if (el.eligible) e.status = 'accepted';
    else {
      e.status = 'rejected';
      e.reason = el.reasons[0];
      addLog(state, `${p.title}'s entry for ${cat.name} at the ${ed.label} was not accepted. ${el.reasons[0]}`, 'warning', { projectId: p.id, route: { view: 'event', editionId: ed.id } });
    }
  }
  return { suppressInterrupt: true };
});

export const RIVAL_WORDS_A = ['Quiet', 'Salt', 'Paper', 'Northern', 'Last', 'Glass', 'Hollow', 'Bright', 'Small', 'Burning', 'Silent', 'Iron', 'Little', 'Distant', 'Golden', 'Low', 'Wild', 'Late', 'Blue', 'Second'];
export const RIVAL_WORDS_B = ['Harbor', 'Summer', 'Orchard', 'Signal', 'River', 'Kingdom', 'Witness', 'Houses', 'Tide', 'Season', 'Weather', 'Mountain', 'Archive', 'Garden', 'Crossing', 'Lights', 'Hours', 'Field', 'Animals', 'Room'];

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
      scores: withDerived({ project: base, producer: base, director: base + off(), writer: base + off(), lead: base + off(), supporting: base + off(), voice: base + off(), ensemble: base + off() }),
    });
  }
  // The same title can't appear twice in one season.
  const seen = new Set<string>();
  const unique = out.filter((f) => (seen.has(f.title) ? false : (seen.add(f.title), true)));
  if (slateCache.size > 40) slateCache.clear();
  slateCache.set(key, unique);
  return unique;
}

/** Scores for the recipient kinds added November 9, 2026, derived without new draws so every season's slate is unchanged. */
function withDerived(x: Record<'project' | 'producer' | 'director' | 'writer' | 'lead' | 'supporting' | 'voice' | 'ensemble', number>): Record<Recipient, number> {
  return { ...x, guest: x.supporting, performer: Math.max(x.lead, x.supporting), host: x.lead, narrator: x.voice, craft: (x.director + x.project) / 2, song: x.project, national: x.project, career: x.project };
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
    if (r.winners) r.winners = r.winners.map((id) => film.get(id) ?? id);
  }
  ed.rivals = [];
  ed.compact = true;
}

registerHandler('edition-announce', (state, ev) => deciding().announce(state, edition(state, ev.payload.editionId as string)));
registerHandler('edition-start', (state, ev) => deciding().festivalOpens(state, edition(state, ev.payload.editionId as string)));
registerHandler('screening', (state, ev) => deciding().screeningHappens(state, ev));
registerHandler('screening-reminder', (state, ev) => deciding().screeningReminder(state, ev));
registerHandler('edition-results', (state, ev) => deciding().editionResults(state, edition(state, ev.payload.editionId as string)));

/** Selection or nominations for an edition (awards-results.ts announce). Results persist once and are never rerolled. */
export const announceEdition = (state: GameState, ed: Edition): HandlerResult => deciding().announce(state, ed);

/** How long the trip to a screening's venue takes from where you are, and whether you'd arrive in time. */
export function screeningTravel(state: GameState, ed: Edition, sc: Screening): { here: boolean; hours: number; arrivesInTime: boolean } {
  const venue = getPlace(institution(ed.institutionId).placeId);
  const here = state.locationId === venue.id && !state.travel;
  const hours = here ? 0 : travelHours(getPlace(state.locationId), venue);
  return { here, hours, arrivesInTime: here || state.now + hours * 3600_000 <= sc.at };
}

// ---------------- Honors (profile) ----------------

export interface Honor {
  editionLabel: string;
  category: string;
  projectTitle: string;
  result: 'Won' | 'Nominated' | 'Selected' | 'Special Mention' | 'Honorary';
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
  // An older version of the same edition's rules is replaced too (a corrected rulebook); another edition's never is.
  const older = ed.rulesId?.split('@')[0] === book?.id.split('@')[0];
  if (!book || ed.rulesId === book.id || (ed.rulesId !== undefined && ed.rulesId !== 'simulated' && !older)) return false;
  if (ed.entries.length > 0 || (ed.status !== 'upcoming' && ed.status !== 'open')) return false;
  applyRulebook(ed, book);
  for (const ev of events) {
    if (ev.id === `${ed.id}:deadline`) ev.at = ed.deadline;
    if (ev.id === `${ed.id}:soon`) ev.at = ed.deadline - DAY;
    if (ev.id === `${ed.id}:open`) ev.at = ed.submissionOpens;
    if (ev.id === `${ed.id}:announce`) ev.at = ed.announce;
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
