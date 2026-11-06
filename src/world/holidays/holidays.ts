// Worldwide public holidays (218 entries), adapted from SLATE-REBUILD. The rules (about 660 kB) and calendar tables are
// fetched once when the game starts, not bundled; until then, and if the fetch fails, a country's holidays are reported
// as not loaded rather than as ordinary days. Years outside 2026-2100 are reported as outside the supported range.

import seasons from '../seasons.json' with { type: 'json' };
import rulesUrl from './countries.json?url';
import calendarsUrl from './calendars.json?url';
import type { CalendarData } from './calendars';
import { daysFromCivil, holidaysIn, toKey, type CountryRules, type Rule, type RuleContext } from './rules';

export const FIRST_YEAR = 2026;
export const LAST_YEAR = 2100;

type Kept = CountryRules | { of: string };
let RULES: Record<string, Kept> | null = null;
let CTX: RuleContext | null = null;

const SEASONS = seasons as { first: number; last: number; starts: number[][] };
const seasonStarts = (year: number): readonly number[] => SEASONS.starts[year - SEASONS.first] ?? [];

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status}).`);
  return (await res.json()) as T;
}

let pending: Promise<void> | null = null;
/** Fetch the rules and calendars once; a failed fetch is tried again on the next call. */
export function loadWorldHolidays(): Promise<void> {
  if (RULES && CTX) return Promise.resolve();
  if (!pending) {
    pending = Promise.all([fetchJson<Record<string, Kept>>(rulesUrl), fetchJson<CalendarData>(calendarsUrl)]).then(([r, c]) => {
      RULES = r;
      CTX = { calendars: c, seasonStarts };
      cache.clear();
    });
    pending.catch(() => { pending = null; });
  }
  return pending;
}
export const worldHolidaysLoaded = (): boolean => RULES !== null;

function rulesOf(country: string): CountryRules | undefined {
  const kept = RULES?.[country];
  return kept && 'of' in kept ? (RULES![kept.of] as CountryRules) : kept;
}

export type HolidayCoverage =
  | { kind: 'kept'; announcedTo?: number }
  | { kind: 'projected'; announcedTo: number } // later than the last year the government has announced
  | { kind: 'not-kept' } // no rules for this country
  | { kind: 'outside-years' }
  | { kind: 'not-loaded' };

export function worldHolidayCoverage(country: string, year: number, regionKey?: string): HolidayCoverage {
  if (!RULES) return { kind: 'not-loaded' };
  const rules = rulesOf(country);
  if (!rules) return { kind: 'not-kept' };
  if (year < FIRST_YEAR || year > LAST_YEAR) return { kind: 'outside-years' };
  const last = (regionKey && rules.regionsAnnouncedTo?.[regionKey]) || rules.announcedTo;
  return last !== undefined && year > last ? { kind: 'projected', announcedTo: last } : { kind: 'kept', announcedTo: last };
}

export interface WorldHoliday {
  date: string;
  name: string;
  /** A day off in place of a holiday that fell on a rest day. */
  substitute?: boolean;
  /** Depends on a moon sighting or an announcement; the date shown is the calendar's. */
  estimated?: boolean;
  /** Later than the government's last announced year: projected from the law. */
  projected?: boolean;
  lunar?: boolean;
}

const isLunar = (r: Rule) => 'lunar' in r.when;
const isSighted = (r: Rule) => 'lunar' in r.when && r.when.lunar[0] === 'islamic-umalqura';

const cache = new Map<string, WorldHoliday[]>();
/** A country's holidays in a year (and its region's, given a gazetteer region key), in date order. */
export function worldHolidaysForYear(country: string, year: number, regionKey?: string): WorldHoliday[] {
  const key = `${country}|${regionKey ?? ''}|${year}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const rules = rulesOf(country);
  if (!rules || !CTX || year < FIRST_YEAR || year > LAST_YEAR) return [];
  const projected = worldHolidayCoverage(country, year, regionKey).kind === 'projected';
  const byName = new Map(rules.holidays.map((r) => [r.name, r]));
  const out = holidaysIn(rules, year, CTX, regionKey)
    .filter((h) => !h.moved)
    .map((h): WorldHoliday => {
      const rule = byName.get(h.name);
      const date = toKey(h.day);
      return {
        date, name: h.substitute ? `${h.name} (Observed)` : h.name,
        substitute: h.substitute || undefined,
        estimated: rule ? isSighted(rule) : undefined,
        lunar: rule ? isLunar(rule) : undefined,
        projected: projected || undefined,
      };
    });
  cache.set(key, out);
  return out;
}

export const dayNumber = (date: string): number => daysFromCivil(Number(date.slice(0, 4)), Number(date.slice(5, 7)), Number(date.slice(8, 10)));
