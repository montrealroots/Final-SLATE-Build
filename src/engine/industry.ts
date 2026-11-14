// The living world's engine, Phase 2 (docs/WORLD.md, November 10, 2026). Every series still running when the records end
// goes on in the save. Once its season has ended, its network decides to renew it, to make the next season its last,
// or to cancel it. A renewed series gets a dated new season with the same release pattern, and its recorded regulars
// return. A limited series concludes. A daily programme rolls into its next year. A pilot is ordered to series or passed
// on. A series announced without a date gets one.
//
// It starts only where the records end. Before the catalog's retrieval date, the recorded world is the world, so no
// decision is dated earlier. Each decision is a scheduled event stored in the save, decided by the save's seed, so it
// holds across reloads and is the same for a seed. Nothing reads TMDB's ratings or popularity: the odds come from the
// series' own run (how many seasons it has had) and the kind of outlet it is on. They and the timing below are game
// calibration chosen by judgement, not measured or sourced renewal rates (docs/WORLD.md).
import { stream } from './rng';
import { registerHandler, schedule } from './state';
import { DAY, addDaysToKey } from './time';
import { snapshotStudios, withSeriesRecord, type StudioProfile } from './studios';
import type { GameState } from './types';

export interface SeasonFact { n: number; eps: number; dated: number; d0: string; d1: string | null; gap: number; drop: 0 | 1; offs?: number[] }
export interface SeriesProfile {
  r: string;
  t: string;
  status: string;
  type: string | null;
  net: string[];
  /** The kinds of outlet its networks are, where Wikidata records one (tools/screen-catalog/networks.mjs). */
  nk?: ('cable' | 'streaming')[];
  ci: string[];
  genres: string[];
  daily: 0 | 1;
  aired: number;
  seasons: SeasonFact[];
  /** The last season's top-billed cast, with their recorded birth and death dates where TMDB has them. */
  regulars: { p: number; name: string; ch: string | null; born?: string; died?: string }[];
}
/** `from` is when the oldest of the catalog's records was gathered (its index's `retrieved.from`), where known. */
export interface IndustryWorld { horizon: string; builtAt: string; from?: string; series: SeriesProfile[]; studios?: StudioProfile[] }

/**
 * A season the save's world made: its premiere, how it is released, and whether it was announced as the last. `offs` is
 * each episode's day in the season, copied from the series' last complete one, so its breaks come with it.
 */
export interface SimSeason { n: number; eps: number; premiere: string; gap: number; drop: boolean; final: boolean; offs?: number[] }
export interface SimOutcome { at: string; kind: 'renewed' | 'cancelled' | 'concluded' | 'ordered' | 'passed' | 'dated'; n: number; final?: boolean }
/** A season as the decisions read it: when it opened, how many episodes, how they are released, when it ended. */
export interface FrozenRun { n: number; eps: number; d0: string; gap: number; drop: boolean; end: string; offs?: number[] }
/**
 * What this save's decisions read about one series, taken once when the save's world starts and kept in the save
 * (November 11, 2026, the Creative Depth package, milestone A). Until then only the last recorded season number was
 * kept (`rec`), and every decision read the installed catalog: a refreshed catalog that moved a series to another
 * network, re-dated its last season or changed its cast changed what an old save decided next.
 *
 * Two kinds of thing are here, kept apart because they last differently (docs/WORLD.md, "What A Save Keeps"):
 * - the game's own classes, which never expire: the rules version, the kind of outlet, whether it is a limited series
 *   or a pilot, whether it is animated, seasons aired (counted only as far as the rules read, to six), the number of
 *   the season it is patterned on, a daily programme's anchor date, and the returning regulars' person IDs;
 * - a copy of recorded facts, `last` and `model`: the last recorded season and the one new seasons are patterned on.
 *   They are needed only until the save makes its own first season, and are deleted then. Any still here when TMDB's
 *   six months have passed since they were gathered are deleted too (`expireIndustrySources`), so a save never holds
 *   TMDB's records longer than TMDB allows.
 */
export interface FrozenSeries {
  /** The decision rules this series is decided under (INDUSTRY_RULES when it was frozen). */
  v: number;
  o: Outlet;
  mini: boolean;
  pilot: boolean;
  anim: boolean;
  /** Seasons aired when the records ended, counted to six: the rules read no finer. */
  aired: number;
  /** The number of the recorded season its seasons are patterned on. */
  m?: number;
  /** A daily programme's year opens near this date, on its weekday. */
  anchor?: string;
  /** The last season's top-billed cast, by person ID: who returns. Their names stay in the catalog. */
  reg: number[];
  last?: FrozenRun;
  model?: FrozenRun;
  /** Set when `last` and `model` were deleted for their age before the save made a season of its own. */
  expired?: true;
}
/** One opt-in to newer records (`applyWorldRefresh`): when, which catalog build, how many series took it. */
export interface WorldRefresh { at: string; builtAt: string; series: number; added: number }

export interface SimSeries {
  seasons: SimSeason[];
  outcomes: SimOutcome[];
  closed: boolean;
  /**
   * The last season the catalog recorded when this save's world began. Seasons after it are this save's own: a later
   * catalog that records more of the real series doesn't add them (November 11, 2026). Absent in saves begun before then,
   * where it is taken from the first catalog that loads.
   */
  rec?: number;
  /** What its decisions read, frozen. Absent in saves begun before it was kept, which take it from the first catalog that loads. */
  p?: FrozenSeries;
}
export interface IndustryState {
  /** The records' end: no simulated decision is dated before it. */
  horizon: string;
  /** The catalog build the world started from: the save's source-data version. A later catalog corrects what it recorded
   * up to `horizon`, and never what the save's world has decided since. */
  builtAt: string;
  /** When the oldest of those records was gathered: TMDB's six months for the copies in `FrozenSeries` count from it. */
  from?: string;
  series: Record<string, SimSeries>;
  /**
   * Each followed studio's recorded film pace, kept when the save's world starts (studios.ts): the save's films follow
   * from it and the seed. Absent in saves begun before November 11, 2026, where it is taken from the first catalog that
   * has it.
   */
  studios?: StudioProfile[];
  /** Each time the player chose to take newer records for series not yet decided. */
  refreshes?: WorldRefresh[];
}

let WORLD: IndustryWorld | null = null;
let byRef = new Map<string, SeriesProfile>();
/** Set when the catalog's world file loads. Without it, the engine waits and changes nothing. */
export function setIndustryWorld(w: IndustryWorld | null): void {
  WORLD = w;
  byRef = new Map((w?.series ?? []).map((p) => [p.r, p]));
}
export const seriesProfile = (r: string) => byRef.get(r);

/**
 * A series as this save knows it: the catalog's profile without seasons recorded after the ones the save began with,
 * since the save's world has made its own. For the pages, which show names and recorded history; the decisions read
 * the save's frozen copy instead.
 */
export function profileFor(state: GameState | null, r: string): SeriesProfile | undefined {
  const p = byRef.get(r);
  const rec = state?.industry?.series[r]?.rec;
  if (!p || rec === undefined || !p.seasons.some((f) => f.n > rec)) return p;
  return { ...p, seasons: p.seasons.filter((f) => f.n <= rec), aired: Math.min(p.aired, rec) };
}
/** The last recorded season a simulated series of this save may show, or undefined for one the save doesn't simulate. */
export const recordedUpTo = (state: GameState | null, r: string): number | undefined => {
  const sim = state?.industry?.series[r];
  return sim ? sim.rec ?? byRef.get(r)?.seasons.at(-1)?.n : undefined;
};

export type Outlet = 'daily' | 'kids' | 'broadcast' | 'cable' | 'streaming';
// Broadcast networks by name: Wikidata's classes don't tell them apart from cable (tools/screen-catalog/networks.mjs). The
// list grew on November 11, 2026 to the catalog's other free-to-air networks.
const BROADCAST = new Set(['ABC', 'FOX', 'CBS', 'NBC', 'The CW', 'BBC One', 'BBC Two', 'PBS', 'The WB', 'UPN', 'Univision', 'ITV1', 'ABC TV', 'Seven Network', 'Global TV', 'TF1', 'M6', 'TV Tokyo']);
const CABLE = new Set(['FX', 'FXX', 'AMC', 'Syfy', 'TBS', 'Adult Swim', 'Nat Geo Wild', 'National Geographic', 'Freeform']);
const KIDS = /Disney Junior|Disney Channel|Disney XD|DisneyNOW|PBS Kids|Universal Kids|Nick Jr|KiKa|StarWarsKids/;
/** The kind of outlet, which sets when decisions come and how long a new season takes. */
export function outletOf(p: SeriesProfile): Outlet {
  if (p.daily) return 'daily';
  if (p.genres.includes('Kids') || p.net.some((n) => KIDS.test(n))) return 'kids';
  if (p.net.some((n) => BROADCAST.has(n))) return 'broadcast';
  if (p.net.some((n) => CABLE.has(n))) return 'cable';
  // Until November 11, 2026 every other series counted as streaming, HBO's, Showtime's and USA Network's among them.
  // Now a network Wikidata records as a cable channel makes it cable.
  if (p.nk?.includes('cable')) return 'cable';
  return 'streaming';
}

const instant = (key: string) => Date.parse(`${key}T16:00:00Z`);
const keyOf = (at: number) => new Date(at).toISOString().slice(0, 10);
const later = (a: string, b: string) => (a > b ? a : b);
const weekday = (key: string) => new Date(`${key}T12:00:00Z`).getUTCDay();
/** The day nearest `key`, within three days either way, that falls on the weekday of `like`. */
const nearestWeekday = (key: string, like: string) => { const d = (weekday(like) - weekday(key) + 7) % 7; return addDaysToKey(key, d > 3 ? d - 7 : d); };

/** A season as the engine reads it, recorded or simulated. */
interface Run extends FrozenRun { final: boolean }
function recordedRun(f: SeasonFact): FrozenRun {
  // Episodes the record lists without dates are counted on at the season's usual gap.
  const listed = f.d1 ?? f.d0;
  const end = f.drop ? f.d0 : addDaysToKey(listed, Math.max(0, f.eps - Math.max(1, f.dated)) * f.gap);
  return { n: f.n, eps: f.eps, d0: f.d0, gap: f.gap, drop: !!f.drop, end, ...(f.offs?.length === f.eps ? { offs: f.offs } : {}) };
}
const simRun = (s: SimSeason): Run => ({ n: s.n, eps: s.eps, d0: s.premiere, gap: s.gap, drop: s.drop, final: s.final, offs: s.offs, end: episodeDates(s).at(-1)! });
/**
 * The season a new one is modelled on: the last simulated one, or the last recorded season that is complete. A season
 * still airing when the records end lists only the episodes known so far, so its count and spacing aren't the
 * series' own (found on the real catalog, where it gave a broadcast comedy 9 episodes and a drama 1).
 */
/** The recorded season every simulated one descends from: the last complete one, else the last there is. */
export const recordedModel = (p: SeriesProfile, horizon: string): SeasonFact | undefined =>
  p.seasons.filter((f) => f.dated === f.eps && (f.d1 ?? f.d0) < horizon).at(-1) ?? p.seasons.at(-1);

/** The decision rules in force. A change to the odds or timing below takes a new number; a save keeps the one it has. */
export const INDUSTRY_RULES = 1;
/** The recorded facts a frozen series copies: its last season and the one new seasons are patterned on. */
function pattern(p: SeriesProfile, horizon: string): Pick<FrozenSeries, 'last' | 'model' | 'm' | 'anchor'> {
  const lastFact = p.seasons.at(-1);
  const modelFact = recordedModel(p, horizon);
  const model = modelFact && recordedRun(modelFact);
  return {
    ...(lastFact ? { last: recordedRun(lastFact) } : {}),
    ...(model ? { model: { ...model, gap: model.drop ? 0 : Math.max(1, model.gap) }, m: model.n } : {}),
    ...(model && p.daily ? { anchor: model.d0 } : {}),
  };
}
/** What a save keeps of a series when its world starts: every input its decisions read (FrozenSeries). */
export function freezeSeries(p: SeriesProfile, horizon: string): FrozenSeries {
  return {
    v: INDUSTRY_RULES, o: outletOf(p), mini: p.type === 'Miniseries', pilot: p.status === 'Pilot', anim: p.genres.includes('Animation'),
    aired: Math.min(p.aired, 6), reg: p.regulars.map((c) => c.p), ...pattern(p, horizon),
  };
}

function model(f: FrozenSeries, sim: SimSeries): Run | null {
  if (sim.seasons.length) return simRun(sim.seasons.at(-1)!);
  return f.model ? { ...f.model, final: false } : null;
}
function lastRun(f: FrozenSeries, sim: SimSeries): Run | null {
  if (sim.seasons.length) return simRun(sim.seasons.at(-1)!);
  return f.last ? { ...f.last, final: false } : null;
}
/**
 * Episode dates of a simulated season. Its breaks are the series' own when the record has them: a 22-episode broadcast
 * season copied at its median gap alone ran straight from October to March, where the real ones pause over the holidays
 * and run into April (found on the real catalog, November 10, 2026).
 */
export function episodeDates(s: SimSeason): string[] {
  if (s.offs?.length === s.eps) return s.offs.map((o) => addDaysToKey(s.premiere, o));
  return Array.from({ length: s.eps }, (_, i) => (s.drop ? s.premiere : addDaysToKey(s.premiere, s.gap * i)));
}
/** The first date on or after `key` that falls on the weekday of `like`: a series premieres on its usual night. */
function onWeekday(key: string, like: string): string {
  return addDaysToKey(key, (weekday(like) - weekday(key) + 7) % 7);
}

/**
 * When the outlet decides, after a season's last episode. Broadcast networks announce at the May upfronts for seasons
 * that ran September to May, and within weeks for a summer series. Cable, streaming and kids' channels decide one to
 * four months after the season ends. A daily programme rolls into its next year a month before the year is up.
 */
function decisionDate(f: FrozenSeries, run: Run, r: () => number): string {
  const o = f.o;
  const end = run.end;
  const m = Number(end.slice(5, 7));
  if (o === 'daily') return addDaysToKey(run.d0, 335);
  // A final season or a limited series ends with its finale; there is nothing left to decide. Dating it at the next
  // upfronts had told a final season's ending in May, two months after it aired.
  if (run.final || f.mini) return end;
  if (o === 'broadcast') {
    const inSeason = m >= 9 || end.slice(5) <= '05-20';
    if (inSeason) return later(`${m >= 9 ? Number(end.slice(0, 4)) + 1 : end.slice(0, 4)}-05-${String(10 + Math.floor(r() * 10)).padStart(2, '0')}`, addDaysToKey(end, 7));
    return addDaysToKey(end, 30 + Math.floor(r() * 45));
  }
  const span = { cable: 60, streaming: 90, kids: 120 }[o];
  return addDaysToKey(end, 30 + Math.floor(r() * span));
}

/** The odds of renewal by seasons run and outlet: new series are riskiest; long-running ones mostly continue. */
export function renewalOdds(f: Pick<FrozenSeries, 'o' | 'anim'>, seasonsRun: number): number {
  const o = f.o;
  if (o === 'daily') return 0.97;
  const table: Record<Exclude<Outlet, 'daily'>, number[]> = {
    broadcast: [0.45, 0.62, 0.72, 0.8], cable: [0.55, 0.65, 0.72, 0.72], streaming: [0.5, 0.6, 0.62, 0.55], kids: [0.75, 0.78, 0.65, 0.5],
  };
  const i = seasonsRun <= 1 ? 0 : seasonsRun === 2 ? 1 : seasonsRun <= 5 ? 2 : 3;
  if (o === 'broadcast' && seasonsRun >= 6 && f.anim) return 0.93; // the long-running animated comedies
  return table[o][i];
}

/** When a renewed series' next season opens, and never sooner than production allows after the decision. */
function nextPremiere(f: FrozenSeries, prev: Run | null, decided: string, r: () => number): string {
  const o = f.o;
  const base = prev?.d0 ?? decided;
  if (o === 'daily') {
    // A daily programme's year opens near the date of the season it is modelled on, on the same weekday, so the weekdays it
    // copies from that season stay weekdays. Pinning the calendar date had moved the weekday each year, stepping from each
    // simulated year drifted the date, and anchoring to a newer season than the model put General Hospital on Saturdays
    // (all found on the real catalog, November 10, 2026). February 29 becomes the 28th.
    const a = f.anchor ?? base;
    for (let y = Number(decided.slice(0, 4)); ; y++) {
      const d = nearestWeekday(`${y}${a.slice(4) === '-02-29' ? '-02-28' : a.slice(4)}`, a);
      if (d > decided) return d;
    }
  }
  if (o === 'broadcast') {
    const fall = !prev || Number(prev.d0.slice(5, 7)) >= 8;
    const y = Number(decided.slice(0, 4)) + (decided.slice(5) > '08-31' ? 1 : 0);
    const d = fall ? addDaysToKey(`${y}-09-20`, Math.floor(r() * 21)) : addDaysToKey(base, 365 + Math.floor(r() * 29) - 14);
    return later(d, addDaysToKey(decided, 90));
  }
  const [lag, spread, floor] = { cable: [365, 120, 150], streaming: [420, 330, 240], kids: [330, 150, 120] }[o];
  return later(addDaysToKey(base, lag + Math.floor(r() * spread)), addDaysToKey(decided, floor));
}

/** Schedules a series' next decision. `floor` is the earliest day it may fall on, after the records' end by default. */
function plan(state: GameState, ref: string, sim: SimSeries, floor?: string): void {
  const f = sim.p;
  if (sim.closed || !f) return;
  const r = stream(state.seed, 'industry', ref, 'when', sim.outcomes.length);
  const run = lastRun(f, sim);
  const horizon = state.industry!.horizon;
  // A series still listed as running whose last season had ended by the records' end has already been renewed: its next
  // season is dated soon after, rather than decided again.
  const renewedAlready = !sim.outcomes.length && !!run && run.end < horizon && !f.pilot && !f.mini;
  const at = run && !renewedAlready ? decisionDate(f, run, r) : addDaysToKey(horizon, 1 + Math.floor(r() * (run ? 30 : 120)));
  schedule(state, instant(later(at, floor ?? addDaysToKey(horizon, 1))), 'industry-decision', { r: ref, step: sim.outcomes.length }, { priority: 60, id: `ind:${ref}:${sim.outcomes.length}` });
}

/**
 * Start the save's world when the catalog is present, once. Returns whether anything was added to the save now: the
 * world itself, or, for a save begun before they were kept, the studios' pace or the series' frozen profiles.
 */
export function ensureIndustry(state: GameState): boolean {
  if (!WORLD) return false;
  if (state.industry) {
    let changed = false;
    // A save whose world began before studios kept releasing takes their pace now, once.
    if (!state.industry.studios && WORLD.studios) { state.industry.studios = withSeriesRecord(snapshotStudios(WORLD.studios), WORLD.series); changed = true; }
    // A save whose studios were kept before their television record was (November 14, 2026) takes it now, once.
    else if (state.industry.studios?.length && !state.industry.studios.some((x) => x.tv) && WORLD.series.length) { state.industry.studios = withSeriesRecord(state.industry.studios, WORLD.series); changed = true; }
    // A save whose world began before a series' inputs were frozen takes them now, from the seasons it began with.
    for (const [ref, sim] of Object.entries(state.industry.series)) if (takeProfile(state, ref, sim)) changed = true;
    return changed;
  }
  state.industry = { horizon: WORLD.horizon, builtAt: WORLD.builtAt, from: WORLD.from ?? WORLD.horizon, series: {}, ...(WORLD.studios ? { studios: withSeriesRecord(snapshotStudios(WORLD.studios), WORLD.series) } : {}) };
  for (const p of WORLD.series) {
    const sim: SimSeries = { seasons: [], outcomes: [], closed: false, rec: p.seasons.at(-1)?.n ?? 0, p: freezeSeries(p, WORLD.horizon) };
    state.industry.series[p.r] = sim;
    plan(state, p.r, sim);
  }
  return true;
}

/**
 * Gives a series the frozen profile it lacks, or the recorded pattern an expired one still needs, from the loaded
 * catalog and only up to the seasons the save began with. Returns whether the save changed. Nothing changes for a
 * series that has what it needs, whatever the catalog now says.
 */
function takeProfile(state: GameState, ref: string, sim: SimSeries): boolean {
  if (sim.closed || !byRef.has(ref)) return false;
  const hadRec = sim.rec !== undefined;
  // A save begun before `rec` was kept takes it from the first catalog that loads, and keeps it.
  if (!hadRec) sim.rec = byRef.get(ref)!.seasons.at(-1)?.n ?? 0;
  const needsPattern = !!sim.p?.expired && !sim.seasons.length;
  if (sim.p && !needsPattern) return !hadRec;
  const p = profileFor(state, ref)!;
  if (!sim.p) sim.p = freezeSeries(p, state.industry!.horizon);
  else { Object.assign(sim.p, pattern(p, state.industry!.horizon)); delete sim.p.expired; }
  return true;
}

function decide(state: GameState, ref: string, sim: SimSeries, today: string): void {
  const f = sim.p!;
  const r = stream(state.seed, 'industry', ref, 'what', sim.outcomes.length);
  const run = lastRun(f, sim);
  const o = f.o;
  const seasonsRun = f.aired + sim.seasons.length;
  const add = (kind: SimOutcome['kind'], n: number, final?: boolean) => sim.outcomes.push({ at: today, kind, n, ...(final ? { final } : {}) });
  const open = (n: number, premiere: string, eps: number, gap: number, drop: boolean, final: boolean, offs?: number[]) => {
    sim.seasons.push({ n, eps, premiere, gap, drop, final, ...(offs ? { offs } : {}) });
    // From its first season on, the save's own season is the pattern: the copy of the recorded ones has done its work.
    delete f.last;
    delete f.model;
  };
  // A new season copies the model season: its count, its pattern and its breaks, on the night it usually airs.
  const like = (m: Run, premiere: string) => (o === 'daily' ? premiere : onWeekday(premiere, m.d0));
  if (!run) {
    // Not yet aired. A pilot is ordered to series or passed on; a series announced without a date is given one.
    const eps = { broadcast: 13, cable: 10, streaming: 8, kids: 20, daily: 150 }[o];
    if (f.pilot) {
      if (r() < (o === 'broadcast' ? 0.4 : 0.5)) { add('ordered', 1); open(1, addDaysToKey(today, 240 + Math.floor(r() * 180)), eps, 7, o === 'streaming' && r() < 0.4, false); }
      else { add('passed', 1); sim.closed = true; }
    } else { add('dated', 1); open(1, addDaysToKey(today, 90 + Math.floor(r() * 360)), eps, 7, o === 'streaming' && r() < 0.4, false); }
    return;
  }
  if (f.mini || run.final) { add('concluded', run.n); sim.closed = true; return; }
  if (!sim.outcomes.length && run.end < state.industry!.horizon && !f.pilot) {
    // Already renewed by the records' end (it is still listed as running): its next season gets a date. A broadcast show
    // past the fall slot goes to midseason.
    const premiere = o === 'broadcast' && today.slice(5) >= '09-01'
      ? addDaysToKey(`${Number(today.slice(0, 4)) + 1}-01-10`, Math.floor(r() * 60))
      : later(nextPremiere(f, run, today, r), addDaysToKey(today, 60));
    const m = model(f, sim)!;
    add('dated', run.n + 1);
    open(run.n + 1, like(m, premiere), m.eps, m.gap, m.drop, false, m.offs);
    return;
  }
  // Not renewed is cancelled, a daily programme's included: its year is announced as its last while it still airs.
  if (r() >= renewalOdds(f, seasonsRun)) { add('cancelled', run.n); sim.closed = true; return; }
  // A final season is announced for a series in its later years, rarely for a long-running broadcast animation.
  const evergreen = o === 'broadcast' && seasonsRun >= 6 && f.anim;
  const final = o !== 'daily' && seasonsRun >= (o === 'broadcast' ? 5 : 3) && r() < (evergreen ? 0.03 : o === 'broadcast' ? 0.15 : 0.3);
  const m = model(f, sim)!;
  add('renewed', run.n + 1, final);
  open(run.n + 1, like(m, nextPremiere(f, run, today, r)), m.eps, m.gap, m.drop, final, m.offs);
}

registerHandler('industry-decision', (state, ev) => {
  const ref = ev.payload.r as string;
  const sim = state.industry?.series[ref];
  if (!sim || sim.closed || ev.payload.step !== sim.outcomes.length) return { suppressInterrupt: true };
  // The day it was due, however long it waited (state.ts's placeholder and the wait below keep it).
  const due = (ev.payload.due as number | undefined) ?? ev.at;
  // A save begun before the profiles were kept, or one whose copied pattern went with its age, takes what it lacks from
  // the loaded catalog.
  takeProfile(state, ref, sim);
  if (!WORLD || !sim.p || (sim.p.expired && !sim.seasons.length)) {
    // No catalog is loaded (or, for a series still lacking its profile, the catalog no longer has it): the world waits
    // rather than go on unseen, and nothing is erased.
    schedule(state, ev.at + 30 * DAY, 'industry-decision', { ...ev.payload, due }, { priority: 60, id: `ind:${ref}:${sim.outcomes.length}:wait:${keyOf(ev.at)}` });
    return { suppressInterrupt: true };
  }
  decide(state, ref, sim, keyOf(due));
  plan(state, ref, sim);
  return { suppressInterrupt: true };
});

// ---------- what a save keeps, and for how long (docs/WORLD.md, "What A Save Keeps") ----------

/** TMDB's limit on keeping its content (API Terms 1.C), as the server and the packs keep it. */
export const SOURCE_DAYS = 180;
/** When the copies of recorded seasons in this save must go. */
export const sourcesExpire = (ind: IndustryState): number => Date.parse(ind.from ?? ind.horizon) + SOURCE_DAYS * DAY;
/**
 * Deletes the copies of recorded seasons (`last`, `model`) once TMDB's six months have passed since they were
 * gathered, by the real clock. Every decision the save has made stays: those are the save's own. A series that hadn't
 * yet been decided takes its pattern again, up to the seasons the save began with, from the catalog installed when its
 * decision comes due; without one, it waits. Returns whether anything was deleted.
 */
export function expireIndustrySources(state: GameState, realNow: number): boolean {
  const ind = state.industry;
  if (!ind || realNow < sourcesExpire(ind)) return false;
  let changed = false;
  for (const sim of Object.values(ind.series)) {
    if (!sim.p || (!sim.p.last && !sim.p.model)) continue;
    delete sim.p.last;
    delete sim.p.model;
    if (!sim.seasons.length && !sim.closed) sim.p.expired = true;
    changed = true;
  }
  return changed;
}

// ---------- newer records, only when the player asks (docs/WORLD.md, "Taking Newer Records") ----------

export interface RefreshChange { r: string; title: string; what: string[] }
export interface RefreshPreview {
  /** The installed catalog's build, newer than the one this save last took. */
  builtAt: string;
  /** Series nothing has been decided for yet, whose frozen inputs differ from the newer records. */
  changes: RefreshChange[];
  /** Series the newer records follow that this save's world doesn't have. */
  added: { r: string; title: string }[];
  /** Series this save has already decided for: never changed. */
  kept: number;
}
const OUTLET_WORDS: Record<Outlet, string> = { daily: 'a daily programme', kids: "a children's channel", broadcast: 'a broadcast network', cable: 'a cable channel', streaming: 'a streaming service' };
const undecided = (sim: SimSeries) => !sim.closed && !sim.outcomes.length && !sim.seasons.length;

/**
 * What taking the installed catalog's newer records would change, without changing anything. Null when the installed
 * catalog is the one this save already has. Only a series with nothing decided yet can change; the studios' pace, the
 * records' end and everything decided stay as they are.
 */
export function worldRefreshPreview(state: GameState): RefreshPreview | null {
  const ind = state.industry;
  if (!ind || !WORLD) return null;
  const have = ind.refreshes?.at(-1)?.builtAt ?? ind.builtAt;
  if (WORLD.builtAt <= have) return null;
  const changes: RefreshChange[] = [];
  let kept = 0;
  for (const [r, sim] of Object.entries(ind.series)) {
    const p = byRef.get(r);
    if (!undecided(sim) || !sim.p) { kept += 1; continue; }
    if (!p) continue;
    const next = freezeSeries(p, ind.horizon);
    const was = sim.p;
    const what: string[] = [];
    const lastN = p.seasons.at(-1)?.n ?? 0;
    if (lastN > (sim.rec ?? 0)) what.push(`The records now go to Season ${lastN}; your story began with Season ${sim.rec ?? 0}.`);
    if (next.o !== was.o) what.push(`It is now counted as on ${OUTLET_WORDS[next.o]}, not ${OUTLET_WORDS[was.o]}, which changes when its future is decided.`);
    if (next.mini !== was.mini) what.push(next.mini ? 'It is now recorded as a limited series.' : 'It is no longer recorded as a limited series.');
    if (next.pilot !== was.pilot) what.push(next.pilot ? 'It is now recorded as a pilot.' : 'It is no longer recorded as a pilot.');
    if (next.model && was.model && (next.model.eps !== was.model.eps || next.model.gap !== was.model.gap || next.model.drop !== was.model.drop)) what.push(`A new season would have ${next.model.eps} episodes, not ${was.model.eps}.`);
    else if (next.model && was.model && JSON.stringify(next.model) !== JSON.stringify(was.model)) what.push('Its seasons would follow different dates.');
    if (next.last && was.last && next.last.end !== was.last.end && lastN === (sim.rec ?? 0)) what.push('Its last recorded season ends on a different day, which moves its decision.');
    if (JSON.stringify(next.reg) !== JSON.stringify(was.reg)) what.push('Its returning cast is different.');
    if (what.length) changes.push({ r, title: p.t, what });
  }
  const added = WORLD.series.filter((p) => !ind.series[p.r]).map((p) => ({ r: p.r, title: p.t }));
  return { builtAt: WORLD.builtAt, changes: changes.sort((a, b) => a.title.localeCompare(b.title)), added: added.sort((a, b) => a.title.localeCompare(b.title)), kept };
}

/**
 * Takes the newer records for the series the preview lists, and nothing else. A series' pending decision is planned
 * again from its new inputs, never dated before `today`. Returns the record of what was taken, or null when there was
 * nothing to take. The caller keeps a copy of the save first (the store's Take Newer Records).
 */
export function applyWorldRefresh(state: GameState, today: string): WorldRefresh | null {
  const preview = worldRefreshPreview(state);
  const ind = state.industry;
  if (!preview || !ind) return null;
  const floor = later(addDaysToKey(today, 1), addDaysToKey(ind.horizon, 1));
  for (const c of preview.changes) {
    const sim = ind.series[c.r];
    const p = byRef.get(c.r)!;
    state.events = state.events.filter((e) => !(e.kind === 'industry-decision' && e.payload.r === c.r));
    sim.rec = p.seasons.at(-1)?.n ?? 0;
    sim.p = freezeSeries(p, ind.horizon);
    plan(state, c.r, sim, floor);
  }
  for (const a of preview.added) {
    const p = byRef.get(a.r)!;
    const sim: SimSeries = { seasons: [], outcomes: [], closed: false, rec: p.seasons.at(-1)?.n ?? 0, p: freezeSeries(p, ind.horizon) };
    ind.series[a.r] = sim;
    plan(state, a.r, sim, floor);
  }
  const taken: WorldRefresh = { at: today, builtAt: preview.builtAt, series: preview.changes.length, added: preview.added.length };
  (ind.refreshes ??= []).push(taken);
  return taken;
}
