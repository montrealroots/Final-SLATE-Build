import { getPlace, findPlace, isCatalogPlace, registerPlace, type Place } from '../data/places';
import { settledTitle } from '../data/identity';
import { observance } from './observances';
import { copyPlain } from './copy';
import { hashString } from './rng';
import {
  DAY, MINUTE, addLocal, ageOn, dateKey, formatClock, formatDateKey, localParts, localToInstant, observedBirthday, parseYmd, isDateKey,
} from './time';
import type {
  Attention, CharacterIdentity, CreationDraft, CreationStepId, GameState, LogEntry, Plan, Route, ScheduledEvent,
} from './types';
import { SAVE_VERSION } from './types';
import { citizenshipFor, draftNames, isNationality, isPortrait, legalName, splitBackgrounds } from './identity';

export function newId(state: GameState, prefix: string): string {
  state.idCounter += 1;
  return `${prefix}${state.idCounter.toString(36)}`;
}

/** The inheritance a new story starts with unless it is changed: $25,000,000 (the owner's v8 package, data/scenario.json). */
export const DEFAULT_INHERITANCE_MINOR = 2_500_000_000;

export function emptyDraft(): CreationDraft {
  return {
    step: 'identity', firstName: '', middleName: '', lastName: '', preferredName: '', pronouns: '', actingTitle: '', birthDate: '', birthplaceId: '', heritages: [], heritageCustomText: '', nationalities: [], observances: [],
    mainLanguage: '', languages: [], startPlaceId: '', startDate: '2026-01-05', startTime: '08:00', updatedAt: 0,
    inheritance: { currency: 'USD', amountMinor: DEFAULT_INHERITANCE_MINOR },
  };
}

/**
 * Character creation's screens in order, with the fields each one owns. Everything that names a screen (navigation,
 * validation, Review's edit actions, saved drafts) uses these ids, never a position.
 */
export const CREATION_STEPS: readonly { id: CreationStepId; title: string; fields: readonly (keyof CreationDraft)[] }[] = [
  { id: 'identity', title: 'Identity', fields: ['portrait', 'firstName', 'middleName', 'lastName', 'preferredName', 'pronouns', 'actingTitle', 'birthDate', 'birthplaceId'] },
  { id: 'background', title: 'Background & Languages', fields: ['heritages', 'heritageCustomText', 'nationalities', 'observances', 'mainLanguage', 'languages'] },
  { id: 'starting-point', title: 'Starting Point', fields: ['startPlaceId', 'startDate', 'startTime'] },
  { id: 'review', title: 'Review', fields: [] },
];
/** Drafts saved by the eight-step creation reopen on the step that now holds the same fields. */
const OLD_STEPS: Record<string, CreationStepId> = {
  name: 'identity', pronouns: 'identity', birthday: 'identity', background: 'background', languages: 'background',
  'start-date': 'starting-point', 'start-location': 'starting-point', review: 'review',
};
const OLD_ORDER = ['name', 'pronouns', 'background', 'languages', 'birthday', 'start-date', 'start-location', 'review'];
export const creationStep = (id: CreationStepId) => CREATION_STEPS.find((x) => x.id === id)!;
export const creationStepIndex = (id: CreationStepId) => CREATION_STEPS.findIndex((x) => x.id === id);

/** A stored draft made safe to reopen: missing fields take their defaults, and an old numeric step becomes its id. */
export function normalizeDraft(raw: unknown): CreationDraft | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const base = emptyDraft();
  const d = { ...base, ...r } as CreationDraft;
  const step = r.step;
  // A number is the eight-step creation's index, older than its ids.
  const old = typeof step === 'number' ? OLD_ORDER[Math.max(0, Math.min(OLD_ORDER.length - 1, Math.trunc(step)))] : step;
  d.step = CREATION_STEPS.some((x) => x.id === old) ? (old as CreationStepId) : typeof old === 'string' && OLD_STEPS[old] ? OLD_STEPS[old] : 'identity';
  for (const k of ['firstName', 'middleName', 'lastName', 'preferredName', 'pronouns', 'actingTitle', 'birthDate', 'birthplaceId', 'heritageCustomText', 'mainLanguage', 'startPlaceId', 'startDate', 'startTime'] as const) {
    if (typeof d[k] !== 'string') (d as unknown as Record<string, unknown>)[k] = base[k];
  }
  // A draft from before names had parts holds one name: its first word is the first name, the rest the last.
  Object.assign(d, draftNames(d));
  delete d.name;
  if (typeof d.portrait !== 'string' || !isPortrait(d.portrait)) delete d.portrait;
  if (!Array.isArray(d.heritages)) d.heritages = [];
  // A draft from before nationality was asked: its nationality words become countries (identity.ts splitBackgrounds).
  if (!Array.isArray(r.nationalities)) Object.assign(d, splitBackgrounds(d.heritages, citizenshipFor(d.birthplaceId)));
  d.nationalities = [...new Set(d.nationalities.filter(isNationality))];
  if (!Array.isArray(d.languages)) d.languages = [];
  d.observances = Array.isArray(d.observances) ? d.observances.filter((o): o is string => typeof o === 'string' && !!observance(o)) : [];
  if (typeof d.updatedAt !== 'number') d.updatedAt = 0;
  if (d.returnToReview !== true) delete d.returnToReview;
  // A draft from before the pronouns settled the title takes the settled one.
  const settled = settledTitle(d.pronouns);
  if (settled) d.actingTitle = settled;
  // From November 14, 2026 a new story starts with an inheritance and no family menus: a saved draft's family choices go.
  delete d.savings;
  delete d.family;
  const inh = d.inheritance as { currency?: unknown; amountMinor?: unknown } | undefined;
  if (!inh || inh.currency !== 'USD' || !Number.isSafeInteger(inh.amountMinor)) d.inheritance = { ...base.inheritance! };
  return d;
}

export interface DraftProblem {
  field: string;
  message: string;
  step: CreationStepId;
}

/** Validation for creation. Birth date is checked against the chosen start date. */
/** Make a world-catalog place available to a save (and to the engine for this session). */
export function adoptPlace(state: GameState, place: Place): void {
  registerPlace(place);
  if (!isCatalogPlace(place.id)) state.places[place.id] = place;
}

/**
 * When a story can begin, and how old you must be (the owner's rules, November 8, 2026). 2026 is the default year and any
 * later one up to 2050 can be chosen, so a 50-year career stays within the dated holiday rules (to 2100). You must be at
 * least 19 on the starting date; it was 16 before.
 */
export const FIRST_START_YEAR = 2026;
export const LAST_START_YEAR = 2050;
/**
 * You start at exactly 19 (the owner's v8 package, decision 1; from November 14, 2026). Until then 19 was the least you
 * could be. MIN_START_AGE keeps its name for the code that reads it as a floor, which it still is.
 */
export const START_AGE = 19;
export const MIN_START_AGE = START_AGE;

/** The earliest birth date that still makes you START_AGE on this starting date: the day after your 20th birthday would fall. */
export function earliestBirthDate(startDate: string): string | null {
  if (!isDateKey(startDate)) return null;
  const { year, month, day } = parseYmd(startDate);
  const t = new Date(Date.UTC(year - START_AGE - 1, month - 1, day));
  // A 29 February start: twenty years back has no such day in a common year, and Date rolls it to 1 March, the right answer.
  t.setUTCDate(t.getUTCDate() + 1);
  return t.toISOString().slice(0, 10);
}

/** The starting dates that keep this birth date START_AGE: from the 19th birthday to the day before the 20th. */
export function startWindow(birthDate: string): { from: string; to: string } {
  const birth = parseYmd(birthDate);
  // The first day ageOn calls you `age`: the birthday, or, born 29 February, the day after 28 February in a common year.
  const turns = (age: number) => {
    const y = birth.year + age;
    const t = new Date(Date.UTC(y, birth.month - 1, Math.min(birth.day, new Date(Date.UTC(y, birth.month, 0)).getUTCDate())));
    const key = () => t.toISOString().slice(0, 10);
    while (ageOn(birth, parseYmd(key())) < age) t.setUTCDate(t.getUTCDate() + 1);
    return t;
  };
  const to = turns(START_AGE + 1);
  to.setUTCDate(to.getUTCDate() - 1);
  return { from: turns(START_AGE).toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

/** The latest birth date that makes you START_AGE on this starting date (29 February becomes 28 February). */
export function latestBirthDate(startDate: string): string | null {
  if (!isDateKey(startDate)) return null;
  const { year, month, day } = parseYmd(startDate);
  const y = year - MIN_START_AGE;
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dd = month === 2 && day === 29 && !leap ? 28 : day;
  return `${y}-${String(month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

export function validateDraft(d: CreationDraft): DraftProblem[] {
  for (const pl of Object.values(d.places ?? {})) registerPlace(pl);
  const out: DraftProblem[] = [];
  const n = draftNames(d);
  // As 1221's: a first and a last name. Each part, and the legal name they make, has room for long names, not essays.
  if (!n.firstName) out.push({ field: 'firstName', step: 'identity', message: 'Enter a first name.' });
  if (!n.lastName) out.push({ field: 'lastName', step: 'identity', message: 'Enter a last name.' });
  if (legalName(n).length > 80) out.push({ field: 'lastName', step: 'identity', message: 'Your full name has to be 80 characters or fewer.' });
  if ((d.preferredName ?? '').trim().length > 40) out.push({ field: 'preferredName', step: 'identity', message: 'Use 40 characters or fewer.' });
  if (!d.pronouns) out.push({ field: 'pronouns', step: 'identity', message: 'Choose pronouns.' });
  // Settled by He/Him and She/Her; with They/Them it's the player's choice, and must be made.
  if (!settledTitle(d.pronouns) && !d.actingTitle) out.push({ field: 'actingTitle', step: 'identity', message: 'Choose how you are billed.' });
  // Real calendar dates only: Date.UTC would quietly turn 31 February into 3 March.
  const start = isDateKey(d.startDate) ? parseYmd(d.startDate) : null;
  const birth = isDateKey(d.birthDate) ? parseYmd(d.birthDate) : null;
  // You start at exactly 19 (from November 14, 2026). Identity asks only for a birth date that is 19 on some day the story
  // can start; Starting Point, where the date is chosen, says whether that date keeps you 19 and which dates do. Until
  // then Identity held both, which stopped someone born early in 2007 there while the start date still read January.
  if (!birth) {
    out.push({ field: 'birthDate', step: 'identity', message: 'Enter your birth date.' });
  } else {
    const first = `${FIRST_START_YEAR}-01-01`, last = `${LAST_START_YEAR}-12-31`;
    if (start && d.birthDate > d.startDate) {
      out.push({ field: 'birthDate', step: 'identity', message: 'Your birth date must be before your starting date.' });
    } else if (d.birthDate < earliestBirthDate(first)! || d.birthDate > latestBirthDate(last)!) {
      out.push({ field: 'birthDate', step: 'identity', message: `You start at ${START_AGE}, in a year from ${FIRST_START_YEAR} to ${LAST_START_YEAR}: choose a birth date from ${formatDateKey(earliestBirthDate(first)!)} to ${formatDateKey(latestBirthDate(last)!)}.` });
    } else if (start && ageOn(birth, start) !== START_AGE) {
      const w = startWindow(d.birthDate);
      out.push({ field: 'startDate', step: 'starting-point', message: `On ${formatDateKey(d.startDate)} you would be ${ageOn(birth, start)}. You start at ${START_AGE}: choose a date from ${formatDateKey(w.from)} to ${formatDateKey(w.to)}.` });
    }
  }
  if (!findPlace(d.birthplaceId)) out.push({ field: 'birthplaceId', step: 'identity', message: 'Choose a birthplace.' });
  if (d.heritages.length === 0) out.push({ field: 'heritages', step: 'background', message: 'Add at least one ethnicity, or describe your own.' });
  if (!(d.nationalities ?? []).some(isNationality)) out.push({ field: 'nationalities', step: 'background', message: 'Add at least one nationality.' });
  if (!d.mainLanguage) out.push({ field: 'mainLanguage', step: 'background', message: 'Choose your main language.' });
  if (!findPlace(d.startPlaceId)) out.push({ field: 'startPlaceId', step: 'starting-point', message: 'Choose where your story begins.' });
  if (!start || start.year < FIRST_START_YEAR || start.year > LAST_START_YEAR) {
    out.push({ field: 'startDate', step: 'starting-point', message: `Choose a date from ${FIRST_START_YEAR} to ${LAST_START_YEAR}.` });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startTime)) out.push({ field: 'startTime', step: 'starting-point', message: 'Enter a time such as 08:00.' });
  for (const fn of draftChecks) out.push(...fn(d));
  return out;
}

/** Modules that add to creation (personal.ts: your savings and your family's offer) check their part of a draft here. */
const draftChecks: ((d: CreationDraft) => DraftProblem[])[] = [];
export function onDraftCheck(fn: (d: CreationDraft) => DraftProblem[]): void {
  draftChecks.push(fn);
}

export function newGame(d: CreationDraft, realNow: number, saveId: string): GameState {
  const problems = validateDraft(d);
  if (problems.length) throw new Error(problems[0].message);
  const start = parseYmd(d.startDate);
  const [hh, mm] = d.startTime.split(':').map(Number);
  const place = getPlace(d.startPlaceId);
  const { instant } = localToInstant(place.zone, start.year, start.month, start.day, hh, mm);
  const character: CharacterIdentity = {
    name: legalName(draftNames(d)),
    ...draftNames(d),
    ...(d.preferredName?.trim() ? { preferredName: d.preferredName.trim() } : {}),
    livesIn: d.startPlaceId,
    ...(d.portrait && isPortrait(d.portrait) ? { portrait: d.portrait } : {}),
    pronouns: d.pronouns as CharacterIdentity['pronouns'],
    actingTitle: (settledTitle(d.pronouns) ?? d.actingTitle) as CharacterIdentity['actingTitle'],
    birth: parseYmd(d.birthDate),
    birthplaceId: d.birthplaceId,
    heritages: d.heritages,
    nationalities: [...new Set(d.nationalities.filter(isNationality))],
    mainLanguage: d.mainLanguage,
    languages: d.languages.filter((l) => l.code !== d.mainLanguage),
    observances: d.observances?.filter((o) => !!observance(o)) ?? [],
  };
  // The legal name is joined as the one-field name was, so a save's seed is what it was before names had parts.
  const seed = hashString(`${saveId}|${legalName(draftNames(d))}|${d.birthDate}|${d.startDate}`);
  const state: GameState = {
    version: SAVE_VERSION,
    saveId,
    saveName: `${character.name}`,
    createdAtReal: realNow,
    updatedAtReal: realNow,
    seed,
    idCounter: 0,
    now: instant,
    startedAt: instant,
    character,
    locationId: place.id,
    // Age reference zone: the birthplace's zone, so travel never changes age.
    ageZone: getPlace(d.birthplaceId).zone,
    events: [],
    processedEventIds: [],
    log: [],
    plans: [],
    sleep: { asleep: false, alarm: true },
    projects: [],
    people: {},
    editions: [],
    rivalFilms: {},
    followed: [],
    calendarFilters: ['Birthdays', 'Holidays', 'Festivals', 'Awards', 'Deadlines', 'My Schedule', 'Film And Television'],
    settings: { theme: 'dark', wakeForObligations: true },
    places: {},
  };
  for (const id of [d.birthplaceId, d.startPlaceId]) {
    const pl = d.places?.[id];
    if (pl) adoptPlace(state, pl);
  }
  scheduleNextBirthday(state);
  for (const fn of initHooks) fn(state, d);
  return state;
}

/** Modules (awards, industry) register world setup that runs once when a life begins. */
const initHooks: ((s: GameState, d: CreationDraft) => void)[] = [];
export function onNewGame(fn: (s: GameState, d: CreationDraft) => void): void {
  initHooks.push(fn);
}

// ---------------- Log ----------------

export function addLog(state: GameState, text: string, kind: LogEntry['kind'], extra: Pick<LogEntry, 'projectId' | 'route'> = {}): LogEntry {
  const entry: LogEntry = { id: newId(state, 'l'), at: state.now, text, kind, ...extra };
  state.log.unshift(entry);
  if (state.log.length > 400) state.log.length = 400;
  return entry;
}

// ---------------- Events ----------------

export function schedule(
  state: GameState,
  at: number,
  kind: string,
  payload: Record<string, unknown> = {},
  opts: { priority?: number; attention?: Attention; id?: string } = {},
): ScheduledEvent {
  const ev: ScheduledEvent = {
    id: opts.id ?? newId(state, 'e'),
    at,
    kind,
    priority: opts.priority ?? 50,
    attention: opts.attention ?? 'silent',
    payload,
  };
  if (state.events.some((e) => e.id === ev.id)) return state.events.find((e) => e.id === ev.id)!;
  const i = state.events.findIndex((e) => compareEvents(ev, e) < 0);
  if (i < 0) state.events.push(ev);
  else state.events.splice(i, 0, ev);
  return ev;
}

export function cancelEvents(state: GameState, predicate: (e: ScheduledEvent) => boolean): number {
  const before = state.events.length;
  state.events = state.events.filter((e) => !predicate(e));
  return before - state.events.length;
}

function compareEvents(a: ScheduledEvent, b: ScheduledEvent): number {
  return a.at - b.at || a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export interface HandlerResult {
  /** Text shown when this event ends an Advance or Sleep. */
  message?: string;
  /** Override: this occurrence should not interrupt (e.g. a reminder for a cancelled plan). */
  suppressInterrupt?: boolean;
}

type Handler = (state: GameState, ev: ScheduledEvent) => HandlerResult | void;
const handlers = new Map<string, Handler>();

export function registerHandler(kind: string, fn: Handler): void {
  handlers.set(kind, fn);
}

/** The handler a kind of event has now, for a proof that switches one off and puts it back (tests/proof/probe.ts). */
export function handlerOf(kind: string): Handler | undefined {
  return handlers.get(kind);
}

export type Mode = 'tick' | 'advance' | 'sleep';

export interface ProcessResult {
  reached: number;
  done: boolean;
  interruptedBy?: { event: ScheduledEvent; message: string };
  processed: number;
}

/**
 * The single time-passage rule used by natural ticking, Advance and Sleep. Events run once,
 * in (time, priority, id) order. Advance/Sleep stop at events whose attention is 'interrupt'.
 * Processing is bounded by maxEvents so the UI can show progress and stay responsive.
 */
/** An event handler failed. The batch was rolled back: no event was skipped, run twice, or half-applied. */
export class ProcessingError extends Error {
  constructor(public eventKind: string, public cause: unknown) {
    super(`Something went wrong while time passed (${eventKind.replace(/-/g, ' ')}). Your game was returned to how it was before, so nothing was skipped or paid twice.`);
  }
}

/**
 * Run due events up to `target`. Each call is all-or-nothing: if a handler throws, the state is restored in place to
 * how it was when the call began (the event stays queued) and a ProcessingError is thrown.
 */
export function processUntil(state: GameState, target: number, mode: Mode, maxEvents = 500): ProcessResult {
  if (!(state.events.length && state.events[0].at <= target)) {
    state.now = Math.max(state.now, target);
    moveClock(state, state.now);
    return { reached: state.now, done: true, processed: 0 };
  }
  const snapshot = copyPlain(state);
  let current = '';
  try {
    return runEvents(state, target, mode, maxEvents, (kind) => { current = kind; });
  } catch (e) {
    for (const k of Object.keys(state)) delete (state as unknown as Record<string, unknown>)[k];
    Object.assign(state, snapshot);
    throw new ProcessingError(current || 'an event', e);
  }
}

function runEvents(state: GameState, target: number, mode: Mode, maxEvents: number, onEvent: (kind: string) => void): ProcessResult {
  let processed = 0;
  while (state.events.length && state.events[0].at <= target) {
    if (processed >= maxEvents) return { reached: state.now, done: false, processed };
    const ev = state.events.shift()!;
    if (state.processedEventIds.includes(ev.id)) continue;
    onEvent(ev.kind);
    state.now = Math.max(state.now, ev.at);
    moveClock(state, state.now);
    const fn = handlers.get(ev.kind);
    const res = fn ? fn(state, ev) ?? {} : {};
    state.processedEventIds.push(ev.id);
    if (state.processedEventIds.length > 300) state.processedEventIds.splice(0, state.processedEventIds.length - 300);
    processed += 1;
    const interrupts = mode !== 'tick' && ev.attention === 'interrupt' && !res.suppressInterrupt &&
      (mode === 'advance' || ev.kind === 'wake' || state.settings.wakeForObligations);
    if (interrupts) {
      if (mode === 'sleep' && ev.kind !== 'wake') wakeEarly(state);
      return { reached: state.now, done: false, processed, interruptedBy: { event: ev, message: res.message ?? '' } };
    }
  }
  state.now = Math.max(state.now, target);
  moveClock(state, state.now);
  return { reached: state.now, done: true, processed };
}

/**
 * What else keeps the game's clock (from November 14, 2026: the bank, engine/bank.ts): told each instant the clock
 * reaches, before an event at it runs, so what it does by then is done when the event reads it.
 */
const clockHooks: ((state: GameState, to: number) => void)[] = [];
export function onClockMove(fn: (state: GameState, to: number) => void): void {
  clockHooks.push(fn);
}
function moveClock(state: GameState, to: number): void {
  for (const fn of clockHooks) fn(state, to);
}

/** The next event the player would want to jump to (anything that is not silent). */
export function nextNotableEvent(state: GameState): ScheduledEvent | undefined {
  return state.events.find((e) => e.attention !== 'silent' && e.at > state.now);
}

// ---------------- Location / identity helpers ----------------

export function currentPlace(state: GameState) {
  return getPlace(state.locationId);
}

export function currentZone(state: GameState): string {
  return currentPlace(state).zone;
}

export function characterAge(state: GameState): number {
  const p = localParts(state.now, state.ageZone);
  return ageOn(state.character.birth, p);
}

// ---------------- Birthdays ----------------

export function nextBirthdayInstant(state: GameState, after: number): { at: number; age: number } {
  const p = localParts(after, state.ageZone);
  for (let y = p.year; y <= p.year + 2; y++) {
    const obs = observedBirthday(state.character.birth, y);
    const at = localToInstant(state.ageZone, y, obs.month, obs.day, 0, 0).instant;
    if (at > after) return { at, age: y - state.character.birth.year };
  }
  throw new Error('No birthday found');
}

export function scheduleNextBirthday(state: GameState): void {
  const { at, age } = nextBirthdayInstant(state, state.now);
  schedule(state, at, 'birthday', { age, year: localParts(at, state.ageZone).year }, { priority: 10, attention: 'notify', id: `bday-${age}` });
}

// The living world's decisions (industry.ts) are handled once that module has loaded with the film catalog, which
// replaces this handler. Until then a decision that comes due waits a day rather than being lost: an event with no
// handler is consumed. Until November 11, 2026 industry.ts loaded at startup, which put the startup bundle over budget.
// The decision keeps the day it was due (`due`), so how long it waited never changes it; until November 11, 2026 it was
// decided on the day the wait ended, and a slow catalog changed the save's world.
registerHandler('industry-decision', (state, ev) => {
  schedule(state, ev.at + DAY, 'industry-decision', { ...ev.payload, due: ev.payload.due ?? ev.at }, { priority: 60, id: `ind:${ev.payload.r}:${ev.payload.step}:held:${Math.floor(ev.at / DAY) + 1}` });
  return { suppressInterrupt: true };
});

registerHandler('birthday', (state, ev) => {
  const age = ev.payload.age as number;
  addLog(state, `Today is your birthday. You're ${age}.`, 'personal', { route: { view: 'profile' } });
  scheduleNextBirthday(state);
});

// ---------------- Plans, reminders and sleep ----------------

/** How long before a plan its reminder comes, in words. */
export function reminderWords(min: number | null): string {
  if (min === null) return 'No reminder';
  if (min % 1440 === 0) return min === 1440 ? 'A day before' : `${min / 1440} days before`;
  if (min % 60 === 0) return min === 60 ? 'An hour before' : `${min / 60} hours before`;
  return `${min} minutes before`;
}

/** Where a plan leads: a project's plan to its festivals, anything else to the calendar. */
const planRoute = (plan: Plan): Route => (plan.kind === 'project' && plan.projectId ? { view: 'project', projectId: plan.projectId, tab: 'festivals' } : { view: 'calendar' });

registerHandler('plan-reminder', (state, ev) => {
  const plan = state.plans.find((p) => p.id === ev.payload.planId);
  if (!plan || plan.status !== 'upcoming') return { suppressInterrupt: true };
  const zone = getPlace(plan.placeId).zone;
  const p = localParts(plan.start, zone);
  // The reminder says how far off the plan is, as it was asked for: a day ahead names the day.
  const when = plan.remindMin !== null && plan.remindMin >= 1440 ? `on ${formatDateKey(dateKey(plan.start, zone))} at` : 'at';
  const text = `${plan.title} starts ${when} ${formatClock(p.hour, p.minute)}.`;
  addLog(state, text, 'personal', { route: planRoute(plan), ...(plan.projectId ? { projectId: plan.projectId } : {}) });
  return { message: text };
});

registerHandler('plan-start', (state, ev) => {
  const plan = state.plans.find((p) => p.id === ev.payload.planId);
  if (!plan || plan.status !== 'upcoming') return { suppressInterrupt: true };
  if (state.sleep.asleep) {
    plan.status = 'missed';
    addLog(state, `You slept through ${plan.title}.`, 'warning', { route: planRoute(plan) });
    return { message: `You slept through ${plan.title}.` };
  }
  plan.status = 'done';
  addLog(state, `${plan.title} has started.`, 'personal', { route: planRoute(plan) });
  return { message: `${plan.title} has started.` };
});

export function addPlan(
  state: GameState,
  input: { title: string; start: number; durationMin: number; remindMin: number | null; placeId?: string; projectId?: string },
): string {
  const title = input.title.trim();
  if (!title) throw new Error('Give the plan a title.');
  if (input.start <= state.now) throw new Error('Choose a time later than now.');
  if (!(input.durationMin > 0)) throw new Error('Choose a length.');
  const id = newId(state, 'p');
  // A plan made for a project (attending its festival) is the project's: it leads there and says so on the calendar.
  state.plans.push({ id, title, start: input.start, durationMin: input.durationMin, remindMin: input.remindMin, placeId: input.placeId ?? state.locationId, kind: input.projectId ? 'project' : 'personal', ...(input.projectId ? { projectId: input.projectId } : {}), status: 'upcoming' });
  if (input.remindMin !== null) {
    const at = Math.max(state.now + MINUTE, input.start - input.remindMin * MINUTE);
    schedule(state, at, 'plan-reminder', { planId: id }, { attention: 'interrupt', priority: 20 });
  }
  schedule(state, input.start, 'plan-start', { planId: id }, { attention: 'notify', priority: 30 });
  return id;
}

export function cancelPlan(state: GameState, planId: string): void {
  const plan = state.plans.find((p) => p.id === planId);
  if (!plan || plan.status !== 'upcoming') throw new Error('That plan has already happened.');
  plan.status = 'cancelled';
  cancelEvents(state, (e) => e.payload.planId === planId);
}

registerHandler('wake', (state) => {
  const slept = state.sleep.since !== undefined ? state.now - state.sleep.since : null;
  state.sleep = { asleep: false, alarm: state.sleep.alarm };
  const message = `${slept !== null ? `${sleptWords(slept)} ` : ''}${wakeMessage(state)}`;
  addLog(state, message, 'personal');
  return { message };
});

/** How long a night was, as the wake message says it: to the half hour, or in minutes under an hour. */
export function sleptWords(ms: number): string {
  if (ms < 60 * MINUTE) return `You slept ${Math.max(1, Math.round(ms / MINUTE))} minutes.`;
  const h = Math.round(ms / (30 * MINUTE)) / 2;
  return `You slept ${Number.isInteger(h) ? h : `${Math.floor(h)} and a half`} ${h === 1 ? 'hour' : 'hours'}.`;
}

export function wakeMessage(state: GameState): string {
  const zone = currentZone(state);
  const p = localParts(state.now, zone);
  const hourWords = ['midnight', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'noon'];
  const h12 = p.hour % 12;
  const spoken = p.minute === 0 ? (p.hour === 0 ? 'midnight' : p.hour === 12 ? 'noon' : hourWords[h12]) : formatClock(p.hour, p.minute);
  const endOfDay = localToInstant(zone, p.year, p.month, p.day, 23, 59).instant;
  const next = upcomingCommitments(state, state.now, endOfDay)[0];
  if (next) {
    const np = localParts(next.at, zone);
    return `It's ${spoken}. ${next.label} starts at ${formatClock(np.hour, np.minute)}.`;
  }
  return `It's ${spoken}. You have nothing scheduled for the rest of today.`;
}

export interface Commitment {
  /** Stable, where entries can read alike (two releases in one country on one day); the list keys by it. */
  id?: string;
  at: number;
  label: string;
  route: Route;
  kind: 'plan' | 'project' | 'deadline' | 'event';
}

/** Hooks so project/award modules contribute commitments without circular imports. */
const commitmentSources: ((state: GameState, from: number, to: number) => Commitment[])[] = [];
export function registerCommitmentSource(fn: (state: GameState, from: number, to: number) => Commitment[]): void {
  commitmentSources.push(fn);
}

export function upcomingCommitments(state: GameState, from: number, to: number): Commitment[] {
  const out: Commitment[] = state.plans
    .filter((p) => p.status === 'upcoming' && p.start >= from && p.start <= to)
    .map((p) => ({ at: p.start, label: p.title, route: planRoute(p), kind: 'plan' as const }));
  for (const fn of commitmentSources) out.push(...fn(state, from, to));
  return out.sort((a, b) => a.at - b.at);
}

export class SleepError extends Error {}

/** Begin sleeping until a wake instant. The caller then processes time with mode 'sleep'. */
export function startSleep(state: GameState, wakeAt: number, alarm: boolean): void {
  if (state.sleep.asleep) throw new SleepError("You're already asleep.");
  if (wakeAt <= state.now + MINUTE) throw new SleepError('Choose a wake time later than now.');
  if (wakeAt - state.now > 2 * DAY) throw new SleepError('Choose a wake time within the next two days.');
  state.sleep = { asleep: true, since: state.now, wakeAt, alarm };
  cancelEvents(state, (e) => e.kind === 'wake');
  // Without an alarm the character still wakes naturally at the chosen time; the alarm
  // matters for obligations (see wakeForObligations) and is recorded for messaging.
  schedule(state, wakeAt, 'wake', {}, { attention: 'interrupt', priority: 5, id: newId(state, 'wake') });
}

/** Called when Sleep stops early at an obligation: the character is awake. */
export function wakeEarly(state: GameState): void {
  if (!state.sleep.asleep) return;
  cancelEvents(state, (e) => e.kind === 'wake');
  state.sleep = { asleep: false, alarm: state.sleep.alarm };
}

/** Snooze: sleep again for a few minutes. Obligations can then be missed. */
export function snooze(state: GameState, minutes = 9): void {
  startSleep(state, state.now + minutes * MINUTE + MINUTE, true);
}

export type AdvanceTarget = 'next-event' | 'next-day' | 'week' | 'month' | { at: number };

export function advanceTargetInstant(state: GameState, target: AdvanceTarget): number {
  const zone = currentZone(state);
  if (typeof target === 'object') return target.at;
  if (target === 'next-day') return addLocal(state.now, zone, { days: 1 });
  if (target === 'week') return addLocal(state.now, zone, { days: 7 });
  if (target === 'month') return addLocal(state.now, zone, { months: 1 });
  const ev = nextNotableEvent(state);
  return ev ? ev.at : addLocal(state.now, zone, { days: 1 });
}

// ---------------- Travel (location changes go through the same clock) ----------------

export function distanceKm(a: Place, b: Place): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Working default: ground travel under 300 km at 80 km/h; otherwise flights at 800 km/h plus 3 hours. */
export function travelHours(a: Place, b: Place): number {
  const km = distanceKm(a, b);
  if (km < 300) return Math.max(1, Math.round(km / 80));
  return Math.round(km / 800 + 3);
}

export function travelTo(state: GameState, placeId: string): number {
  if (state.sleep.asleep) throw new Error("You're asleep.");
  if (state.travel) throw new Error("You're already traveling.");
  if (placeId === state.locationId) throw new Error("You're already here.");
  const from = getPlace(state.locationId);
  const to = getPlace(placeId);
  adoptPlace(state, to); // a world place travelled to is kept in the save
  const arriveAt = state.now + travelHours(from, to) * 3600_000;
  state.travel = { from: from.id, to: to.id, arriveAt };
  schedule(state, arriveAt, 'arrive', { to: to.id }, { attention: 'interrupt', priority: 6 });
  return arriveAt;
}

registerHandler('arrive', (state, ev) => {
  const to = String(ev.payload.to);
  state.locationId = to;
  state.travel = null;
  const place = getPlace(to);
  const text = `You've arrived in ${place.name}.`;
  addLog(state, text, 'personal', { route: { view: 'place', placeId: to } });
  return { message: text };
});
