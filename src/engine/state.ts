import { getPlace, findPlace, isCatalogPlace, registerPlace, type Place } from '../data/places';
import { copyPlain } from './copy';
import { hashString } from './rng';
import {
  DAY, MINUTE, addLocal, ageOn, formatClock, localParts, localToInstant, observedBirthday, parseYmd, isDateKey,
} from './time';
import type {
  Attention, CharacterIdentity, CreationDraft, GameState, LogEntry, Route, ScheduledEvent,
} from './types';
import { SAVE_VERSION } from './types';

export function newId(state: GameState, prefix: string): string {
  state.idCounter += 1;
  return `${prefix}${state.idCounter.toString(36)}`;
}

export function emptyDraft(): CreationDraft {
  return {
    step: 0, name: '', pronouns: '', actingTitle: '', birthDate: '', birthplaceId: '', heritages: [], heritageCustomText: '',
    mainLanguage: '', languages: [], startPlaceId: '', startDate: '2026-01-05', startTime: '08:00', updatedAt: 0,
  };
}

export interface DraftProblem {
  field: string;
  message: string;
  step: number;
}

/** Validation for creation. Birth date is checked against the chosen start date. */
/** Make a world-catalog place available to a save (and to the engine for this session). */
export function adoptPlace(state: GameState, place: Place): void {
  registerPlace(place);
  if (!isCatalogPlace(place.id)) state.places[place.id] = place;
}

export function validateDraft(d: CreationDraft): DraftProblem[] {
  for (const pl of Object.values(d.places ?? {})) registerPlace(pl);
  const out: DraftProblem[] = [];
  if (!d.name.trim()) out.push({ field: 'name', step: 0, message: 'Enter a name.' });
  if (d.name.trim().length > 80) out.push({ field: 'name', step: 0, message: 'Use 80 characters or fewer.' });
  if (!d.pronouns) out.push({ field: 'pronouns', step: 1, message: 'Choose pronouns.' });
  if (!d.actingTitle) out.push({ field: 'actingTitle', step: 1, message: 'Choose an acting title.' });
  // Real calendar dates only: Date.UTC would quietly turn 31 February into 3 March.
  const start = isDateKey(d.startDate) ? parseYmd(d.startDate) : null;
  const birth = isDateKey(d.birthDate) ? parseYmd(d.birthDate) : null;
  if (!birth) {
    out.push({ field: 'birthDate', step: 4, message: 'Enter your birth date.' });
  } else if (start) {
    const age = ageOn(birth, start);
    if (Date.UTC(birth.year, birth.month - 1, birth.day) > Date.UTC(start.year, start.month - 1, start.day)) {
      out.push({ field: 'birthDate', step: 4, message: 'Your birth date must be before your starting date.' });
    } else if (age < 16) {
      // Working default: a configurable minimum so working-age rules can be added later.
      out.push({ field: 'birthDate', step: 4, message: 'Your character must be at least 16 on the starting date.' });
    } else if (age > 100) {
      out.push({ field: 'birthDate', step: 4, message: 'Choose a birth date within the last 100 years.' });
    }
  }
  if (!findPlace(d.birthplaceId)) out.push({ field: 'birthplaceId', step: 4, message: 'Choose a birthplace.' });
  if (d.heritages.length === 0) out.push({ field: 'heritages', step: 2, message: 'Add at least one background, or describe your own.' });
  if (!d.mainLanguage) out.push({ field: 'mainLanguage', step: 3, message: 'Choose your main language.' });
  if (!findPlace(d.startPlaceId)) out.push({ field: 'startPlaceId', step: 6, message: 'Choose where your story begins.' });
  if (!start || start.year !== 2026) {
    out.push({ field: 'startDate', step: 5, message: 'Choose a date in 2026.' });
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(d.startTime)) out.push({ field: 'startTime', step: 5, message: 'Enter a time such as 08:00.' });
  return out;
}

export function newGame(d: CreationDraft, realNow: number, saveId: string): GameState {
  const problems = validateDraft(d);
  if (problems.length) throw new Error(problems[0].message);
  const start = parseYmd(d.startDate);
  const [hh, mm] = d.startTime.split(':').map(Number);
  const place = getPlace(d.startPlaceId);
  const { instant } = localToInstant(place.zone, start.year, start.month, start.day, hh, mm);
  const character: CharacterIdentity = {
    name: d.name.trim(),
    pronouns: d.pronouns as CharacterIdentity['pronouns'],
    actingTitle: d.actingTitle as CharacterIdentity['actingTitle'],
    birth: parseYmd(d.birthDate),
    birthplaceId: d.birthplaceId,
    heritages: d.heritages,
    mainLanguage: d.mainLanguage,
    languages: d.languages.filter((l) => l.code !== d.mainLanguage),
  };
  const seed = hashString(`${saveId}|${d.name}|${d.birthDate}|${d.startDate}`);
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
    calendarFilters: ['Birthdays', 'Holidays', 'Festivals', 'Awards', 'Deadlines', 'My Schedule'],
    settings: { theme: 'dark', reducedMotion: false, largeText: false, wakeForObligations: true },
    places: {},
  };
  for (const id of [d.birthplaceId, d.startPlaceId]) {
    const pl = d.places?.[id];
    if (pl) adoptPlace(state, pl);
  }
  scheduleNextBirthday(state);
  for (const fn of initHooks) fn(state);
  return state;
}

/** Modules (awards, industry) register world setup that runs once when a life begins. */
const initHooks: ((s: GameState) => void)[] = [];
export function onNewGame(fn: (s: GameState) => void): void {
  initHooks.push(fn);
}

// ---------------- Log ----------------

export function addLog(state: GameState, text: string, kind: LogEntry['kind'], extra: { projectId?: string; route?: Route } = {}): LogEntry {
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
  return { reached: state.now, done: true, processed };
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

registerHandler('birthday', (state, ev) => {
  const age = ev.payload.age as number;
  addLog(state, `Today is your birthday. You're ${age}.`, 'personal', { route: { view: 'profile' } });
  scheduleNextBirthday(state);
});

// ---------------- Plans, reminders and sleep ----------------

registerHandler('plan-reminder', (state, ev) => {
  const plan = state.plans.find((p) => p.id === ev.payload.planId);
  if (!plan || plan.status !== 'upcoming') return { suppressInterrupt: true };
  const zone = getPlace(plan.placeId).zone;
  const p = localParts(plan.start, zone);
  const text = `${plan.title} starts at ${formatClock(p.hour, p.minute)}.`;
  addLog(state, text, 'personal', { route: { view: 'calendar' } });
  return { message: text };
});

registerHandler('plan-start', (state, ev) => {
  const plan = state.plans.find((p) => p.id === ev.payload.planId);
  if (!plan || plan.status !== 'upcoming') return { suppressInterrupt: true };
  if (state.sleep.asleep) {
    plan.status = 'missed';
    addLog(state, `You slept through ${plan.title}.`, 'warning', { route: { view: 'calendar' } });
    return { message: `You slept through ${plan.title}.` };
  }
  plan.status = 'done';
  addLog(state, `${plan.title} has started.`, 'personal', { route: { view: 'calendar' } });
  return { message: `${plan.title} has started.` };
});

export function addPlan(
  state: GameState,
  input: { title: string; start: number; durationMin: number; remindMin: number | null; placeId?: string },
): string {
  const title = input.title.trim();
  if (!title) throw new Error('Give the plan a title.');
  if (input.start <= state.now) throw new Error('Choose a time later than now.');
  if (!(input.durationMin > 0)) throw new Error('Choose a length.');
  const id = newId(state, 'p');
  state.plans.push({ id, title, start: input.start, durationMin: input.durationMin, remindMin: input.remindMin, placeId: input.placeId ?? state.locationId, kind: 'personal', status: 'upcoming' });
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
  state.sleep = { asleep: false, alarm: state.sleep.alarm };
  const message = wakeMessage(state);
  addLog(state, message, 'personal');
  return { message };
});

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
    .map((p) => ({ at: p.start, label: p.title, route: { view: 'calendar' }, kind: 'plan' as const }));
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
