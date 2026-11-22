// 2026's real US weekends at the box office (tools/box-office/weekends.mjs, from Wikipedia, CC BY-SA 4.0;
// docs/BOX-OFFICE-WEEKENDS.md). The owner asked on November 22, 2026 for the year to move as it did in real life up to
// that day and be simulated from there. So a week of your film's run whose weekend is one of these meets that weekend's
// competition, read from how big its number-one film's weekend was; a week after the last one recorded meets the game's
// own, drawn as before (box-office.ts recordWeek). Small (47 weekends), so it ships in the engine.
import data from '../data/box-office/weekends-us-2026.json';

export interface RealWeekend { week: number; end: string; film: string; gross: number; source: string | null }

export const WEEKENDS: { source: string; page: string; licence: string; territory: string; retrieved: string; weekends: RealWeekend[] } = data;
/** The last weekend recorded: after it, the weekends are the game's own. */
export const LAST_REAL_WEEKEND = WEEKENDS.weekends[WEEKENDS.weekends.length - 1].end;

/** The recorded weekend that ends within a week of a run (`from` to `to`, YYYY-MM-DD), if there is one. */
export const realWeekendIn = (from: string, to: string): RealWeekend | undefined => WEEKENDS.weekends.find((w) => w.end >= from && w.end <= to);

/**
 * How many other wide releases a weekend stood for, 0 to `max`: its number-one film's gross placed among the year's
 * recorded weekends, in equal bands (with four, a weekend bigger than four in five of the year's is the busiest). The
 * year's own spread decides it, not a figure the game sets.
 */
export function competitionOf(gross: number, max: number): number {
  const all = WEEKENDS.weekends;
  const below = all.filter((w) => w.gross < gross).length;
  return Math.min(max, Math.floor((below / all.length) * (max + 1)));
}

/** The recorded weekends that had ended by `today`, the latest first. */
export const weekendsBy = (today: string): RealWeekend[] => WEEKENDS.weekends.filter((w) => w.end <= today).reverse();
