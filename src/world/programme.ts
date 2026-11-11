// What the cinemas are showing (November 11, 2026, the owner: "those theaters will hold what movies will release").
// A film plays in a country's cinemas from the day it opened there, as TMDB records it by country, and the player's own
// films from the day their theatrical release opens, in its territories. Which cinemas booked which film isn't recorded
// anywhere the game reads, so that part is simulated and labelled: each cinema taken to show films (no closure recorded,
// and a website or operator in Wikidata, which is a sign, not a check) books a film by a fixed draw, more often for a wide
// release than a limited one, so the same cinema shows the same films on every visit.
//
// Nothing here changes money. What a film earns is the gross its distributor reports (src/engine/finish.ts), which reads
// no cinema, booking or coverage count, so uneven cinema records between countries can't become a market effect and a
// booking is never counted twice (tests/programme.test.ts checks the engine doesn't import this file).
import type { GameState } from '../engine/types';
import { showsFilms, type Cinema } from './cinemas';

/** One opening, as the catalog build writes it (theatrical.json): title ref, title, country, date, limited (1) or wide (0). */
export type Opening = [string, string, string, string, 0 | 1];

/** How long a run lasts. TMDB records openings, not closings: game calibration. */
export const RUN_DAYS = { wide: 56, limited: 28 };
/** The share of a country's recorded cinemas that book a catalog film: game calibration. */
export const BOOKED = { wide: 0.6, limited: 0.08 };
/** Most films one cinema shows at once: game calibration, as screens aren't recorded. */
export const SCREENS = 8;

export interface Showing {
  ref: string;
  title: string;
  opened: string;
  limited: boolean;
  /** The share of the country's cinemas that book it. */
  share: number;
  /** The player's own film: its project. */
  projectId?: string;
}

const addDays = (key: string, n: number) => new Date(Date.parse(`${key}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const playing = (opened: string, limited: boolean, today: string) => opened <= today && today < addDays(opened, limited ? RUN_DAYS.limited : RUN_DAYS.wide);

/**
 * The share of cinemas that book the player's film: from its reception, as a distributor books more screens for a film
 * that was received well. A film not yet assessed is booked as a middling one. Game calibration.
 */
export const yourShare = (reception: number | undefined) => Math.min(0.6, 0.04 + Math.max(0, ((reception ?? 50) - 35) / 65) * 0.5);

/** The films in their run in a country on a date: the catalog's and the player's, newest first. */
export function inCinemas(openings: Opening[], state: Pick<GameState, 'projects'> | null, country: string, today: string): Showing[] {
  const out: Showing[] = openings
    .filter((o) => o[2] === country && playing(o[3], o[4] === 1, today))
    .map((o) => ({ ref: o[0], title: o[1], opened: o[3], limited: o[4] === 1, share: o[4] === 1 ? BOOKED.limited : BOOKED.wide }));
  for (const p of state?.projects ?? []) {
    for (const r of p.releases ?? []) {
      // As the release system has it: a theatrical release that has happened, in its territories. A cancelled one is gone
      // and a planned one isn't in cinemas yet (until November 11, 2026 a release still marked planned on its date played).
      // The release system records no run length, so the player's film runs as a wide release does.
      if (r.route !== 'theatrical' || r.status !== 'released' || !r.territories.includes(country) || !playing(r.date, false, today)) continue;
      out.push({ ref: `project:${p.id}`, title: p.title, opened: r.date, limited: false, share: yourShare(p.quality?.reception), projectId: p.id });
    }
  }
  return out.sort((a, b) => b.opened.localeCompare(a.opened) || a.title.localeCompare(b.title));
}

/** The catalog's films opening in a country in the coming days. */
export function openingSoon(openings: Opening[], country: string, today: string, days = 14): Opening[] {
  const until = addDays(today, days);
  return openings.filter((o) => o[2] === country && o[3] > today && o[3] <= until);
}

/** A fixed draw in [0, 1) for a cinema and a film (FNV-1a), so a booking doesn't change between visits. */
export function draw(cinemaId: string, ref: string): number {
  let h = 0x811c9dc5;
  for (const ch of `${cinemaId}|${ref}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193) >>> 0;
  return h / 2 ** 32;
}

/** What a cinema shows on a date: nothing unless it shows films then (cinemas.ts); otherwise the films it booked. */
export function programme(c: Cinema, showings: Showing[], today: string): Showing[] {
  if (!showsFilms(c, today)) return [];
  // The player's film first among equals: a cinema that booked it shows it even when its screens are full.
  const booked = showings.filter((s) => draw(c.id, s.ref) < s.share);
  const yours = booked.filter((s) => s.projectId);
  return [...yours, ...booked.filter((s) => !s.projectId)].slice(0, Math.max(SCREENS, yours.length));
}
