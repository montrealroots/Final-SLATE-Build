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
// calibration from how renewals usually go, not industry statistics.
import { stream } from './rng';
import { registerHandler, schedule } from './state';
import { DAY, addDaysToKey } from './time';
import type { GameState } from './types';

export interface SeasonFact { n: number; eps: number; dated: number; d0: string; d1: string | null; gap: number; drop: 0 | 1 }
export interface SeriesProfile {
  r: string;
  t: string;
  status: string;
  type: string | null;
  net: string[];
  ci: string[];
  genres: string[];
  daily: 0 | 1;
  aired: number;
  seasons: SeasonFact[];
  regulars: { p: number; name: string; ch: string | null }[];
}
export interface IndustryWorld { horizon: string; builtAt: string; series: SeriesProfile[] }

/** A season the save's world made: its premiere, how it is released, and whether it was announced as the last. */
export interface SimSeason { n: number; eps: number; premiere: string; gap: number; drop: boolean; final: boolean }
export interface SimOutcome { at: string; kind: 'renewed' | 'cancelled' | 'concluded' | 'ordered' | 'passed' | 'dated'; n: number; final?: boolean }
export interface SimSeries { seasons: SimSeason[]; outcomes: SimOutcome[]; closed: boolean }
export interface IndustryState {
  /** The records' end: no simulated decision is dated before it. */
  horizon: string;
  /** The catalog build the world started from. */
  builtAt: string;
  series: Record<string, SimSeries>;
}

let WORLD: IndustryWorld | null = null;
let byRef = new Map<string, SeriesProfile>();
/** Set when the catalog's world file loads. Without it, the engine waits and changes nothing. */
export function setIndustryWorld(w: IndustryWorld | null): void {
  WORLD = w;
  byRef = new Map((w?.series ?? []).map((p) => [p.r, p]));
}
export const seriesProfile = (r: string) => byRef.get(r);

export type Outlet = 'daily' | 'kids' | 'broadcast' | 'cable' | 'streaming';
const BROADCAST = new Set(['ABC', 'FOX', 'CBS', 'NBC', 'The CW', 'BBC One', 'PBS']);
const CABLE = new Set(['FX', 'FXX', 'AMC', 'Syfy', 'TBS', 'Adult Swim', 'Nat Geo Wild', 'National Geographic', 'Freeform']);
const KIDS = /Disney Junior|Disney Channel|Disney XD|DisneyNOW|PBS Kids|Universal Kids|Nick Jr|KiKa|StarWarsKids/;
/** The kind of outlet, which sets when decisions come and how long a new season takes. */
export function outletOf(p: SeriesProfile): Outlet {
  if (p.daily) return 'daily';
  if (p.genres.includes('Kids') || p.net.some((n) => KIDS.test(n))) return 'kids';
  if (p.net.some((n) => BROADCAST.has(n))) return 'broadcast';
  if (p.net.some((n) => CABLE.has(n))) return 'cable';
  return 'streaming';
}

const instant = (key: string) => Date.parse(`${key}T16:00:00Z`);
const keyOf = (at: number) => new Date(at).toISOString().slice(0, 10);
const later = (a: string, b: string) => (a > b ? a : b);
/** The same date a year on (February 29 becomes the 28th): a daily programme's year starts on its usual date. */
const nextYear = (key: string) => `${Number(key.slice(0, 4)) + 1}${key.slice(4) === '-02-29' ? '-02-28' : key.slice(4)}`;

/** A season as the engine reads it, recorded or simulated: when it opened, how many episodes, how they are released. */
interface Run { n: number; eps: number; d0: string; gap: number; drop: boolean; final: boolean; end: string }
function recordedRun(f: SeasonFact): Run {
  // Episodes the record lists without dates are counted on at the season's usual gap.
  const listed = f.d1 ?? f.d0;
  const end = f.drop ? f.d0 : addDaysToKey(listed, Math.max(0, f.eps - Math.max(1, f.dated)) * f.gap);
  return { n: f.n, eps: f.eps, d0: f.d0, gap: f.gap, drop: !!f.drop, final: false, end };
}
const simRun = (s: SimSeason): Run => ({ n: s.n, eps: s.eps, d0: s.premiere, gap: s.gap, drop: s.drop, final: s.final, end: s.drop ? s.premiere : addDaysToKey(s.premiere, s.gap * (s.eps - 1)) });
/**
 * The season a new one is modelled on: the last simulated one, or the last recorded season that is complete. A season
 * still airing when the records end lists only the episodes known so far, so its count and spacing aren't the
 * series' own (found on the real catalog, where it gave a broadcast comedy 9 episodes and a drama 1).
 */
function model(p: SeriesProfile, sim: SimSeries, horizon: string): Run | null {
  if (sim.seasons.length) return simRun(sim.seasons.at(-1)!);
  const done = p.seasons.filter((f) => f.dated === f.eps && (f.d1 ?? f.d0) < horizon);
  const f = done.at(-1) ?? p.seasons.at(-1);
  if (!f) return null;
  const r = recordedRun(f);
  return { ...r, gap: r.drop ? 0 : Math.max(1, r.gap) };
}
function lastRun(p: SeriesProfile, sim: SimSeries): Run | null {
  if (sim.seasons.length) return simRun(sim.seasons.at(-1)!);
  const f = p.seasons.at(-1);
  return f ? recordedRun(f) : null;
}
/** Episode dates of a simulated season. */
export function episodeDates(s: SimSeason): string[] {
  return Array.from({ length: s.eps }, (_, i) => (s.drop ? s.premiere : addDaysToKey(s.premiere, s.gap * i)));
}

/**
 * When the outlet decides, after a season's last episode. Broadcast networks announce at the May upfronts for seasons
 * that ran September to May, and within weeks for a summer series. Cable, streaming and kids' channels decide one to
 * four months after the season ends. A daily programme rolls into its next year a month before the year is up.
 */
function decisionDate(p: SeriesProfile, run: Run, r: () => number): string {
  const o = outletOf(p);
  const end = run.end;
  const m = Number(end.slice(5, 7));
  if (o === 'daily') return addDaysToKey(run.d0, 335);
  if (o === 'broadcast') {
    const inSeason = m >= 9 || end.slice(5) <= '05-20';
    if (inSeason) return later(`${m >= 9 ? Number(end.slice(0, 4)) + 1 : end.slice(0, 4)}-05-${String(10 + Math.floor(r() * 10)).padStart(2, '0')}`, addDaysToKey(end, 7));
    return addDaysToKey(end, 30 + Math.floor(r() * 45));
  }
  const span = { cable: 60, streaming: 90, kids: 120 }[o];
  return addDaysToKey(end, 30 + Math.floor(r() * span));
}

/** The odds of renewal by seasons run and outlet: new series are riskiest; long-running ones mostly continue. */
export function renewalOdds(p: SeriesProfile, seasonsRun: number): number {
  const o = outletOf(p);
  if (o === 'daily') return 0.97;
  const table: Record<Exclude<Outlet, 'daily'>, number[]> = {
    broadcast: [0.45, 0.62, 0.72, 0.8], cable: [0.55, 0.65, 0.72, 0.72], streaming: [0.5, 0.6, 0.62, 0.55], kids: [0.75, 0.78, 0.65, 0.5],
  };
  const i = seasonsRun <= 1 ? 0 : seasonsRun === 2 ? 1 : seasonsRun <= 5 ? 2 : 3;
  if (o === 'broadcast' && seasonsRun >= 6 && p.genres.includes('Animation')) return 0.93; // the long-running animated comedies
  return table[o][i];
}

/** When a renewed series' next season opens, and never sooner than production allows after the decision. */
function nextPremiere(p: SeriesProfile, prev: Run | null, decided: string, r: () => number): string {
  const o = outletOf(p);
  const base = prev?.d0 ?? decided;
  if (o === 'daily') { let d = nextYear(base); while (d <= decided) d = nextYear(d); return d; }
  if (o === 'broadcast') {
    const fall = !prev || Number(prev.d0.slice(5, 7)) >= 8;
    const y = Number(decided.slice(0, 4)) + (decided.slice(5) > '08-31' ? 1 : 0);
    const d = fall ? addDaysToKey(`${y}-09-20`, Math.floor(r() * 21)) : addDaysToKey(base, 365 + Math.floor(r() * 29) - 14);
    return later(d, addDaysToKey(decided, 90));
  }
  const [lag, spread, floor] = { cable: [365, 120, 150], streaming: [420, 330, 240], kids: [330, 150, 120] }[o];
  return later(addDaysToKey(base, lag + Math.floor(r() * spread)), addDaysToKey(decided, floor));
}

function plan(state: GameState, p: SeriesProfile, sim: SimSeries): void {
  if (sim.closed) return;
  const r = stream(state.seed, 'industry', p.r, 'when', sim.outcomes.length);
  const run = lastRun(p, sim);
  const horizon = state.industry!.horizon;
  // A series still listed as running whose last season had ended by the records' end has already been renewed: its next
  // season is dated soon after, rather than decided again.
  const renewedAlready = !sim.outcomes.length && !!run && run.end < horizon && p.status !== 'Pilot' && p.type !== 'Miniseries';
  const at = run && !renewedAlready ? decisionDate(p, run, r) : addDaysToKey(horizon, 1 + Math.floor(r() * (run ? 30 : 120)));
  schedule(state, instant(later(at, addDaysToKey(horizon, 1))), 'industry-decision', { r: p.r, step: sim.outcomes.length }, { priority: 60, id: `ind:${p.r}:${sim.outcomes.length}` });
}

/** Start the save's world when the catalog is present, once. Returns whether it started now. */
export function ensureIndustry(state: GameState): boolean {
  if (!WORLD || state.industry) return false;
  state.industry = { horizon: WORLD.horizon, builtAt: WORLD.builtAt, series: {} };
  for (const p of WORLD.series) {
    const sim: SimSeries = { seasons: [], outcomes: [], closed: false };
    state.industry.series[p.r] = sim;
    plan(state, p, sim);
  }
  return true;
}

function decide(state: GameState, p: SeriesProfile, sim: SimSeries, today: string): void {
  const r = stream(state.seed, 'industry', p.r, 'what', sim.outcomes.length);
  const run = lastRun(p, sim);
  const o = outletOf(p);
  const seasonsRun = p.aired + sim.seasons.length;
  const add = (kind: SimOutcome['kind'], n: number, final?: boolean) => sim.outcomes.push({ at: today, kind, n, ...(final ? { final } : {}) });
  const open = (n: number, premiere: string, eps: number, gap: number, drop: boolean, final: boolean) => sim.seasons.push({ n, eps, premiere, gap, drop, final });
  if (!run) {
    // Not yet aired. A pilot is ordered to series or passed on; a series announced without a date is given one.
    const eps = { broadcast: 13, cable: 10, streaming: 8, kids: 20, daily: 150 }[o];
    if (p.status === 'Pilot') {
      if (r() < (o === 'broadcast' ? 0.4 : 0.5)) { add('ordered', 1); open(1, addDaysToKey(today, 240 + Math.floor(r() * 180)), eps, 7, o === 'streaming' && r() < 0.4, false); }
      else { add('passed', 1); sim.closed = true; }
    } else { add('dated', 1); open(1, addDaysToKey(today, 90 + Math.floor(r() * 360)), eps, 7, o === 'streaming' && r() < 0.4, false); }
    return;
  }
  if (p.type === 'Miniseries' || run.final) { add('concluded', run.n); sim.closed = true; return; }
  if (!sim.outcomes.length && run.end < state.industry!.horizon && p.status !== 'Pilot') {
    // Already renewed by the records' end (it is still listed as running): its next season gets a date. A broadcast show
    // past the fall slot goes to midseason.
    const premiere = o === 'broadcast' && today.slice(5) >= '09-01'
      ? addDaysToKey(`${Number(today.slice(0, 4)) + 1}-01-10`, Math.floor(r() * 60))
      : later(nextPremiere(p, run, today, r), addDaysToKey(today, 60));
    const m = model(p, sim, state.industry!.horizon)!;
    add('dated', run.n + 1);
    open(run.n + 1, premiere, m.eps, m.gap, m.drop, false);
    return;
  }
  if (r() >= renewalOdds(p, seasonsRun)) { add(o === 'daily' ? 'concluded' : 'cancelled', run.n); sim.closed = true; return; }
  // A final season is announced for a series in its later years, rarely for a long-running broadcast animation.
  const evergreen = o === 'broadcast' && seasonsRun >= 6 && p.genres.includes('Animation');
  const final = o !== 'daily' && seasonsRun >= (o === 'broadcast' ? 5 : 3) && r() < (evergreen ? 0.03 : o === 'broadcast' ? 0.15 : 0.3);
  const m = model(p, sim, state.industry!.horizon)!;
  add('renewed', run.n + 1, final);
  open(run.n + 1, nextPremiere(p, run, today, r), m.eps, m.gap, m.drop, final);
}

registerHandler('industry-decision', (state, ev) => {
  const ref = ev.payload.r as string;
  const sim = state.industry?.series[ref];
  if (!sim || sim.closed || ev.payload.step !== sim.outcomes.length) return { suppressInterrupt: true };
  const p = byRef.get(ref);
  if (!p) {
    // The catalog isn't loaded (or no longer has the series): wait rather than decide blind.
    schedule(state, ev.at + 30 * DAY, 'industry-decision', ev.payload, { priority: 60, id: `ind:${ref}:${sim.outcomes.length}:wait:${keyOf(ev.at)}` });
    return { suppressInterrupt: true };
  }
  decide(state, p, sim, keyOf(ev.at));
  plan(state, p, sim);
  return { suppressInterrupt: true };
});
