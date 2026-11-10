// The industry around the player (docs/WORLD.md). Phase 1, November 10, 2026: the screen catalog's dated records play on
// their real dates. A film comes out, a series or season premieres, episodes air and a finale airs on the day TMDB records.
// A series TMDB records as ended or cancelled is told at the records' end, because when that was announced isn't
// recorded. Nothing here is stored in a save: real events follow from the catalog and the save's date. Simulated events,
// once there are any (later phases), are kept in the save and labelled as simulated.
import { formatDateKey } from '../engine/time';
import { episodeDates, outletOf, seriesProfile } from '../engine/industry';
import type { GameState, Route } from '../engine/types';
import { company } from './registry';
import { useCatalogFile, type Loaded } from './load';

export interface WorldEvent {
  /** The day it happens, YYYY-MM-DD, as TMDB records it (for 'end', the day the records were taken). */
  d: string;
  k: 'film' | 'season' | 'episode' | 'end' | 'decision';
  /** The catalog record it links to. */
  r: string;
  /** Title of the film or series. */
  t: string;
  s?: number;
  e?: number;
  /** Episode name. */
  n?: string;
  /** The season's last episode. */
  f?: 1;
  /** A series' first season. */
  first?: boolean;
  eps?: number;
  /** A season released all at once: every episode on one day. */
  drop?: 1;
  /** A talk show, soap or news programme, which runs continuously: no premiere or finale news, no calendar entry per episode. */
  daily?: 1;
  net?: string[];
  /** Registry companies credited. */
  ci?: string[];
  st?: 'Ended' | 'Canceled';
  /** Made by this save's world after the records end (Phase 2), not recorded: shown as simulated. */
  sim?: 1;
  /** For a decision: what was decided, and for a dated season, its premiere. */
  outcome?: 'renewed' | 'cancelled' | 'concluded' | 'ordered' | 'passed' | 'dated';
  final?: boolean;
  premiere?: string;
  /** Last episode's air date, for 'end'. */
  la?: string;
}
export interface WorldSeed { version: 1; builtAt: string; horizon: string; from: string; events: WorldEvent[]; series?: import('../engine/industry').SeriesProfile[] }

/** Events dated from `from` to `to`, both YYYY-MM-DD and inclusive, in date order. */
export function eventsBetween(w: WorldSeed, from: string, to: string): WorldEvent[] {
  let lo = 0;
  let hi = w.events.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (w.events[mid].d < from) lo = mid + 1; else hi = mid; }
  const out: WorldEvent[] = [];
  for (let i = lo; i < w.events.length && w.events[i].d <= to; i++) out.push(w.events[i]);
  return out;
}

/**
 * Whether an event belongs in this save's world. An ending is news only if the series' last episode aired after the
 * story began: a show that ended before then is already history.
 */
export const inStory = (ev: WorldEvent, storyStart: string) => ev.k !== 'end' || (ev.la ?? '') >= storyStart;

/** The news, the events worth telling on Home: not each episode, which the calendar carries. */
export const isNews = (ev: WorldEvent) => (ev.k === 'decision' ? !(ev.daily && ev.outcome === 'renewed') : !ev.daily && (ev.k !== 'episode' || ev.f === 1));
/** What the calendar shows: everything but a continuous programme's daily episodes and seasons, and endings (told on Home). */
export const onCalendar = (ev: WorldEvent) => ev.k !== 'end' && ev.k !== 'decision' && !ev.daily;

const studio = (ev: WorldEvent) => {
  const names = (ev.ci ?? []).map((id) => company(id)?.name).filter(Boolean) as string[];
  return names.length ? names.join(' and ') : null;
};
const on = (ev: WorldEvent) => (ev.net?.length ? ` on ${ev.net.join(' and ')}` : '');

/**
 * The event in words at the save's date: past tense once it has happened, future once it is still to come. Every
 * date is TMDB's record. A date still to come was the schedule when the records were taken, and may change.
 */
export function describe(ev: WorldEvent, today: string): string {
  const done = ev.d <= today;
  const st = studio(ev);
  switch (ev.k) {
    case 'film': return done ? `${ev.t}${st ? `, from ${st},` : ''} came out.` : `${ev.t}${st ? `, from ${st},` : ''} is due to come out.`;
    case 'season':
      if (ev.drop) {
        const all = `${ev.eps === 2 ? 'Both' : `All ${ev.eps}`} episodes of ${ev.first ? '' : `Season ${ev.s} of `}${ev.t}`;
        return done ? `${all} came out${on(ev)}.` : `${all} are due to come out${on(ev)}.`;
      }
      return ev.first
        ? (done ? `${ev.t} premiered${on(ev)}.` : `${ev.t} is due to premiere${on(ev)}.`)
        : (done ? `Season ${ev.s} of ${ev.t} began${on(ev)}.` : `Season ${ev.s} of ${ev.t} is due to begin${on(ev)}.`);
    case 'episode':
      return ev.f
        ? (done ? `The Season ${ev.s} finale of ${ev.t}, "${ev.n}", aired${on(ev)}.` : `The Season ${ev.s} finale of ${ev.t}, "${ev.n}", is due to air${on(ev)}.`)
        : `${ev.t}, Season ${ev.s} Episode ${ev.e}: "${ev.n}".`;
    case 'decision': {
      const who = ev.net?.[0] ?? 'Its network';
      switch (ev.outcome) {
        case 'renewed': return ev.final ? `${ev.t} was renewed for a final season, Season ${ev.s}.` : `${ev.t} was renewed for Season ${ev.s}.`;
        case 'cancelled': return `${who} cancelled ${ev.t} after ${ev.s === 1 ? 'one season' : `${ev.s} seasons`}.`;
        case 'concluded': return `${ev.t} came to its planned end after ${ev.s === 1 ? 'one season' : `${ev.s} seasons`}.`;
        case 'ordered': return `${who} ordered ${ev.t} to series.`;
        case 'passed': return `${who} passed on ${ev.t}; it won't go to series.`;
        default: return `Season ${ev.s} of ${ev.t} was given a date: it ${done && ev.premiere! <= today ? 'premiered' : 'premieres'} ${formatDateKey(ev.premiere!)}.`;
      }
    }
    case 'end':
      return `${ev.t} ${ev.st === 'Canceled' ? 'has been cancelled' : 'has ended'}. Its last episode aired ${formatDateKey(ev.la!)}; when this was announced isn't recorded.`;
  }
}

export function useWorld(): Loaded<WorldSeed> {
  return useCatalogFile<WorldSeed>('world.json');
}

/**
 * What this save's world made after the records end (src/engine/industry.ts), as events from `from` to `to`: decisions,
 * and the premieres, episodes and finales of simulated seasons. Each is marked simulated. A series whose catalog record
 * isn't loaded is left out rather than told without its name.
 */
export function simulatedEvents(state: GameState, from: string, to: string): WorldEvent[] {
  const out: WorldEvent[] = [];
  for (const [r, sim] of Object.entries(state.industry?.series ?? {})) {
    const p = seriesProfile(r);
    if (!p) continue;
    const base = { r, t: p.t, net: p.net, ci: p.ci, sim: 1 as const, daily: p.daily ? (1 as const) : undefined };
    for (const o of sim.outcomes) {
      if (o.at < from || o.at > to) continue;
      const season = sim.seasons.find((x) => x.n === o.n);
      out.push({ ...base, d: o.at, k: 'decision', outcome: o.kind, s: o.n, final: o.final, premiere: season?.premiere });
    }
    for (const season of sim.seasons) {
      if (season.premiere >= from && season.premiere <= to) out.push({ ...base, d: season.premiere, k: 'season', s: season.n, eps: season.eps, first: season.n === 1, drop: season.drop ? 1 : undefined });
      if (season.drop) continue;
      episodeDates(season).forEach((d, i) => {
        if (d >= from && d <= to) out.push({ ...base, d, k: 'episode', s: season.n, e: i + 1, n: `Episode ${i + 1}`, f: i === season.eps - 1 && season.eps > 1 && outletOf(p) !== 'daily' ? 1 : undefined });
      });
    }
  }
  return out.sort((a, b) => a.d.localeCompare(b.d) || a.t.localeCompare(b.t));
}

/**
 * Where a simulated event opens: its season's page for a premiere, an episode or a decision that brings a season, and the
 * series' page for an ending or a pilot passed on.
 */
export function simRoute(e: WorldEvent): Route {
  const season = e.k === 'season' || e.k === 'episode' || (e.k === 'decision' && (e.outcome === 'renewed' || e.outcome === 'dated' || e.outcome === 'ordered'));
  return (season ? { view: 'season', ref: `${e.r}:s:${e.s}` } : { view: 'title', ref: e.r }) as Route;
}

/** Recorded and simulated events together, in date order. */
export function worldEventsBetween(w: WorldSeed, state: GameState, from: string, to: string): WorldEvent[] {
  return [...eventsBetween(w, from, to), ...simulatedEvents(state, from, to)].sort((a, b) => a.d.localeCompare(b.d));
}
