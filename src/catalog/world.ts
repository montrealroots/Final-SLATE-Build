// The industry around the player (docs/WORLD.md). Phase 1, November 10, 2026: the screen catalog's dated records play on
// their real dates. A film comes out, a series or season premieres, episodes air and a finale airs on the day TMDB records.
// A series TMDB records as ended or cancelled is told at the records' end, because when that was announced isn't
// recorded. Nothing here is stored in a save: real events follow from the catalog and the save's date. Simulated events,
// once there are any (later phases), are kept in the save and labelled as simulated.
import { formatDateKey } from '../engine/time';
import { company } from './registry';
import { useCatalogFile, type Loaded } from './load';

export interface WorldEvent {
  /** The day it happens, YYYY-MM-DD, as TMDB records it (for 'end', the day the records were taken). */
  d: string;
  k: 'film' | 'season' | 'episode' | 'end';
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
  /** Last episode's air date, for 'end'. */
  la?: string;
}
export interface WorldSeed { version: 1; builtAt: string; horizon: string; from: string; events: WorldEvent[] }

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
export const isNews = (ev: WorldEvent) => !ev.daily && (ev.k !== 'episode' || ev.f === 1);
/** What the calendar shows: everything but a continuous programme's daily episodes and seasons, and endings (told on Home). */
export const onCalendar = (ev: WorldEvent) => ev.k !== 'end' && !ev.daily;

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
    case 'end':
      return `${ev.t} ${ev.st === 'Canceled' ? 'has been cancelled' : 'has ended'}. Its last episode aired ${formatDateKey(ev.la!)}; when this was announced isn't recorded.`;
  }
}

export function useWorld(): Loaded<WorldSeed> {
  return useCatalogFile<WorldSeed>('world.json');
}
