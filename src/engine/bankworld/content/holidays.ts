/**
 * SLATE — the holidays of wherever you are.
 *
 * Stand in Tokyo and the calendar says 元日; stand in Paris and it says
 * Fête nationale; stand in Sacramento and César Chávez Day is a day off that
 * it is not in Reno. Every country's holidays live in a file on disk built
 * from the date-holidays dataset (tools/build-holidays.mjs) and are fetched
 * a country at a time, the same way the city lists are. Each entry keeps the
 * name as it is written on a calendar there and the English name beside it.
 *
 * Nothing here is invented. If a country has no file, it has no holidays on
 * the calendar rather than somebody else's.
 */

import { zonedParts, type Instant } from '../core/time';
import { HOLIDAY_FILES } from './holiday-data';

const HOLIDAY_URLS = import.meta.glob('../data/holidays/*.tsv', { query: '?url', import: 'default', eager: true }) as Record<string, string>;
import { COUNTRIES, REGIONS } from './geography';

export type HolidayType = 'public' | 'bank' | 'school' | 'optional' | 'observance';

export interface HolidayEntry {
  /** The name as it appears on a calendar in that country. */
  name: string;
  /** The English name, or the same text when there is no separate one. */
  englishName: string;
  type: HolidayType;
  /** Set when only one state or province keeps the day. */
  regionCode?: string;
}

interface CountryHolidays {
  /** Subdivision code → name, for matching a SLATE region to the file's codes. */
  regions: Map<string, string>;
  /** 'YYYY-MM-DD' → the holidays that day, national ones first. */
  days: Map<string, HolidayEntry[]>;
}

const TYPES = new Set<HolidayType>(['public', 'bank', 'school', 'optional', 'observance']);
const table = new Map<string, CountryHolidays>();
const loaded = new Set<string>();

/** Whether a country's holidays are in memory. */
export function isHolidaysLoaded(countryId: string): boolean {
  return loaded.has(countryId);
}

/**
 * Adds one country's holidays from its tab-delimited file. Lines starting
 * with "# " name the subdivisions the file knows. The fetch below uses this;
 * so can anything that already has the file in hand.
 */
export function addCountryHolidays(countryId: string, text: string): number {
  if (loaded.has(countryId)) return 0;
  const entry: CountryHolidays = { regions: new Map(), days: new Map() };
  let count = 0;
  // Split on either ending, so a checkout that converts line endings cannot
  // leave a carriage return stuck to a region code or a holiday type.
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    if (line.startsWith('# ')) {
      const [code, name] = line.slice(2).split('\t');
      if (code) entry.regions.set(code, name ?? code);
      continue;
    }
    const [date, name, englishName, type, region] = line.split('\t');
    if (!date || !name) continue;
    const holiday: HolidayEntry = {
      name,
      englishName: englishName || name,
      type: TYPES.has(type as HolidayType) ? (type as HolidayType) : 'public',
      ...(region ? { regionCode: region } : {}),
    };
    const list = entry.days.get(date);
    if (list) list.push(holiday);
    else entry.days.set(date, [holiday]);
    count++;
  }
  table.set(countryId, entry);
  loaded.add(countryId);
  return count;
}

/** Pulls in one country's holidays. Asking twice is free. */
export async function loadCountryHolidays(countryId: string): Promise<number> {
  if (loaded.has(countryId)) return 0;
  if (!HOLIDAY_FILES[countryId]) {
    loaded.add(countryId);
    return 0;
  }
  // SLATE: the files are kept with the port (src/engine/bankworld/data/holidays) and served as Vite assets, where 1221
  // served them from public/holidays.
  const url = HOLIDAY_URLS[`../data/holidays/${countryId}.tsv`];
  if (!url) throw new Error(`The holidays for ${COUNTRIES.get(countryId)?.name ?? countryId} couldn’t be loaded.`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`The holidays for ${COUNTRIES.get(countryId)?.name ?? countryId} couldn’t be loaded.`);
  }
  return addCountryHolidays(countryId, await response.text());
}

/**
 * The code the holiday file uses for one of SLATE's regions: by code where
 * the two agree (US states), else by name (Ontario, New South Wales), else
 * nothing, in which case only the national holidays apply.
 */
export function regionCodeFor(countryId: string, regionId: string | undefined): string | undefined {
  if (!regionId) return undefined;
  const country = table.get(countryId);
  const region = REGIONS.get(regionId);
  if (!country || !region) return undefined;
  if (country.regions.has(region.code)) return region.code;
  const wanted = region.name.trim().toLowerCase();
  for (const [code, name] of country.regions) {
    if (name.trim().toLowerCase() === wanted) return code;
  }
  return undefined;
}

function dayKey(instant: Instant, zone: string): string {
  const parts = zonedParts(instant, zone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

/** A calendar somebody keeps: a country, and the region of it they are in. */
export interface Calendar {
  countryId: string;
  regionId?: string;
}

/** A holiday, and which of the calendars it came off. */
export interface KeptHoliday extends HolidayEntry {
  countryId: string;
  countryName: string;
}

/**
 * The holidays on one day across every calendar somebody keeps.
 *
 * A life is not always lived in one country's year. Somebody on the family
 * land in Iceland working in an American business keeps both: the shops shut
 * for Sumardagurinn fyrsti and nobody in Los Angeles picks up the phone on
 * Thanksgiving, and a calendar that showed only one of those would be wrong
 * about half the days that matter.
 *
 * Ordered by the calendars given, and deduplicated by name: New Year's Day is
 * one day, not one per country.
 */
export function holidaysAcross(instant: Instant, zone: string, calendars: readonly Calendar[]): KeptHoliday[] {
  const out: KeptHoliday[] = [];
  const seen = new Set<string>();
  for (const calendar of calendars) {
    const countryName = COUNTRIES.get(calendar.countryId)?.name ?? calendar.countryId;
    for (const holiday of holidaysOn(instant, zone, calendar.countryId, calendar.regionId)) {
      const key = (holiday.englishName || holiday.name).trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ ...holiday, countryId: calendar.countryId, countryName });
    }
  }
  return out;
}

/**
 * The holidays on one day in one country — the national ones, and the ones
 * the given region keeps. Empty until that country's file has been loaded.
 */
export function holidaysOn(instant: Instant, zone: string, countryId: string, regionId?: string): HolidayEntry[] {
  const country = table.get(countryId);
  if (!country) return [];
  const all = country.days.get(dayKey(instant, zone)) ?? [];
  const code = regionCodeFor(countryId, regionId);
  return all.filter((h) => !h.regionCode || h.regionCode === code);
}

/** Every holiday in a country in one year, in date order, for a list. */
export function holidaysInYear(countryId: string, year: number, regionId?: string): { date: string; holiday: HolidayEntry }[] {
  const country = table.get(countryId);
  if (!country) return [];
  const code = regionCodeFor(countryId, regionId);
  const prefix = `${year}-`;
  const out: { date: string; holiday: HolidayEntry }[] = [];
  for (const [date, list] of country.days) {
    if (!date.startsWith(prefix)) continue;
    for (const holiday of list) if (!holiday.regionCode || holiday.regionCode === code) out.push({ date, holiday });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** "元日 (New Year's Day)", or just the name when the two are the same. */
export function holidayLabel(holiday: HolidayEntry): string {
  return holiday.englishName && holiday.englishName !== holiday.name ? `${holiday.name} (${holiday.englishName})` : holiday.name;
}
