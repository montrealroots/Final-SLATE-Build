// A simulated season as its page tells it (docs/WORLD.md, Phase 2): its nights, its breaks, who returns and how old they
// are at the premiere, and what was decided after it. Everything here follows from the save's world and the records; an
// episode's title or story isn't recorded or simulated, so nothing here makes one up. Loaded with the catalog's pages,
// never at startup.
import { DAY } from '../engine';
import { outletOf, type SeriesProfile, type SimOutcome, type SimSeason, type SimSeries } from '../engine/industry';

const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];
const dayNumber = (key: string) => Date.parse(`${key}T12:00:00Z`) / DAY;

/** The nights a season airs on, as words: "Wednesdays", "Mondays to Fridays", "Tuesdays and Thursdays". */
export function nightsOf(dates: string[]): string {
  const days = [...new Set(dates.map((d) => new Date(`${d}T12:00:00Z`).getUTCDay()))].sort();
  if (days.join() === '1,2,3,4,5') return 'Mondays to Fridays';
  const words = days.map((d) => WEEKDAYS[d]);
  return words.length <= 1 ? (words[0] ?? '') : `${words.slice(0, -1).join(', ')} and ${words.at(-1)}`;
}

/** A pause in a season: no new episode between two that aired more than half again the season's usual gap apart. */
export interface Break { after: number; from: string; to: string; days: number }
export function breaksOf(dates: string[], gap: number): Break[] {
  const out: Break[] = [];
  for (let i = 1; i < dates.length; i++) {
    const days = dayNumber(dates[i]) - dayNumber(dates[i - 1]);
    if (gap > 0 && days > 1.5 * gap) out.push({ after: i, from: dates[i - 1], to: dates[i], days });
  }
  return out;
}

/** How long a break was, in plain words: "4 weeks", "10 days". */
export const breakLength = (days: number) => (days % 7 === 0 ? `${days / 7} weeks` : `${days} days`);

/** Whole years from a birth date to a date (both YYYY-MM-DD). */
export function ageOn(born: string, on: string): number {
  return Number(on.slice(0, 4)) - Number(born.slice(0, 4)) - (on.slice(5) < born.slice(5) ? 1 : 0);
}

/**
 * Who returns for a simulated season: the recorded regulars, less anyone the records say died before its premiere. The
 * engine casts nobody else (the owner's rule), so a regular who has died leaves the cast smaller rather than recast.
 */
export function castFor(p: SeriesProfile, premiere: string) {
  return {
    back: p.regulars.filter((c) => !(c.died && c.died <= premiere)),
    gone: p.regulars.filter((c) => c.died && c.died <= premiere),
  };
}

/** The decision that announced a season, and the one that followed it, as known at the save's date. */
export function decisionsFor(sim: SimSeries, n: number, today: string): { announced?: SimOutcome; after?: SimOutcome } {
  const known = sim.outcomes.filter((o) => o.at <= today);
  return {
    announced: known.find((o) => o.n === n && (o.kind === 'renewed' || o.kind === 'dated' || o.kind === 'ordered')),
    after: known.find((o) => (o.n === n && (o.kind === 'cancelled' || o.kind === 'concluded')) || (o.n === n + 1 && (o.kind === 'renewed' || o.kind === 'dated'))),
  };
}

/** A simulated season the save's world has announced by its date, or nothing. */
export function announcedSeason(sim: SimSeries | undefined, n: number, today: string): SimSeason | undefined {
  return sim && decisionsFor(sim, n, today).announced ? sim.seasons.find((x) => x.n === n) : undefined;
}

/** When the series' outlet usually decides, for a season whose future isn't known yet. It names the habit, not a date. */
export function usualDecision(p: SeriesProfile): string {
  const net = p.net[0] ?? 'Its network';
  switch (outletOf(p)) {
    case 'broadcast': return `${net} usually decides at the May upfronts, after a season that runs September to May, or within weeks of a summer finale.`;
    case 'cable': return `${net} usually decides one to three months after the finale.`;
    case 'streaming': return `${net} usually decides one to four months after the finale.`;
    case 'kids': return `${net} usually decides one to five months after the finale.`;
    default: return 'Its next year is usually confirmed about a month before this one ends.';
  }
}
