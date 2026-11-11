// Cinemas worldwide, as Wikidata records them (November 11, 2026, docs/CINEMAS.md). tools/cinemas/import.mjs builds one
// file per country; the game reads a country's file when a place page asks for it. Wikidata holds historic cinemas as
// well as working ones, and many former cinemas are something else now, so the game never calls a cinema open: it says
// whether a closure is recorded, and when.
import { distanceKm } from './climate';

export interface Cinema {
  id: string;
  name: string | null;
  lat: number;
  lon: number;
  /** Dates as recorded: a day (1932-05-07), a month (1932-05) or a year (1932). */
  opened: string | null;
  closed: string | null;
  /** Wikidata's state of use, such as "permanently closed", if it records one. */
  state: string | null;
  seats: number | null;
  operator: string | null;
  in: string | null;
  /** Its official website, if Wikidata records one (gathered from November 11, 2026; older files lack it). */
  site?: string | null;
}

/** When the records were read: a closure recorded with no date is known only to have happened by then. */
export const CINEMAS_READ = 'November 2026';
const SHUT = /closed|demolished|destroyed|disused|abandoned/i;

export type CinemaStanding =
  | { kind: 'not-yet' } // its recorded opening is after the date
  | { kind: 'closed'; on: string } // closed on or before the date
  | { kind: 'closed-undated' } // recorded as closed, with no date
  | { kind: 'no-closure' }; // no closure recorded by the date

/**
 * How a cinema stood on a date, as far as the record goes. A month or year date counts as reached once that month or
 * year has begun for an opening, and once it is over for a closing, so a part-known date never shows the future.
 */
export function cinemaOn(c: Cinema, today: string): CinemaStanding {
  if (c.opened && c.opened > today) return { kind: 'not-yet' };
  if (c.closed) {
    const shut = c.closed.length === 10 ? c.closed <= today : today.slice(0, c.closed.length) > c.closed;
    return shut ? { kind: 'closed', on: c.closed } : { kind: 'no-closure' };
  }
  // Recorded as closed but not when. Most such closures are decades old, so it is shown as closed at any date, said to be
  // undated: calling it unclosed at an earlier date would mislead more often than the rare closure after that date.
  if (c.state && SHUT.test(c.state)) return { kind: 'closed-undated' };
  return { kind: 'no-closure' };
}

/** The cinemas within a distance of a point, nearest first, leaving out those not yet opened by the date. */
export function cinemasNear(list: Cinema[], lat: number, lon: number, km: number, today: string): { c: Cinema; km: number; standing: CinemaStanding }[] {
  return list
    .map((c) => ({ c, km: distanceKm(lat, lon, c.lat, c.lon), standing: cinemaOn(c, today) }))
    .filter((x) => x.km <= km && x.standing.kind !== 'not-yet')
    .sort((a, b) => a.km - b.km);
}

/**
 * Whether a cinema may still show films on a date: no closure recorded, and a sign it is trading, which is a website or an
 * operator in Wikidata. Many cinemas with no closure recorded closed long ago and nobody noted it (London's Jacey
 * Leicester Square), so having no closure isn't enough. The sign is imperfect: a former cinema that is a music venue now
 * may have a website too.
 */
export const showsFilms = (c: Cinema, today: string) => cinemaOn(c, today).kind === 'no-closure' && !!(c.site || c.operator);
