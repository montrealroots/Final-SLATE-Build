/**
 * SLATE — a bank's business days, in its own country.
 *
 * A US bank keeps the Federal Reserve's holidays (`content/usholidays.ts`),
 * which are rules. Every other bank keeps its country's public and bank
 * holidays, read from the country's holiday file (`content/holidays.ts`,
 * the date-holidays dataset), which the save's places bring in before play
 * (`loadPlacesFor`). A country whose file isn't in hand keeps weekends only,
 * as every bank outside the US did until 2026-09-28, when a card payment in
 * London posted over Easter Monday and one in Tokyo over Golden Week.
 */

import { addDays, instantFromZoned, zonedParts, type Instant } from '../core/time';
import { holidaysOn } from './holidays';
import { usBankHoliday } from './usholidays';
import { CITIES } from './geography';
import { bankById } from './banks';

/**
 * Whose days an account keeps: its bank's country, and the region its holder lives in; or, for an account kept at a
 * bank in the country they lived in before (from 2026-10-16), the region they lived in there, since a bank in England
 * keeps England's summer bank holiday and not Connecticut's region.
 */
export function daysOfAccount(account: { bankId?: string }, holder?: { home?: { cityId: string }; homeRegionId?: string; currentLocationId?: string; priorResidence?: { cityId: string } }): { countryId: string; regionId?: string } {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const countryId = bank ? countryOfIso(bank.iso) : '';
  const here = holder ? CITIES.get(holder.currentLocationId ?? holder.homeRegionId ?? '') : undefined;
  const before = holder?.priorResidence ? CITIES.get(holder.priorResidence.cityId) : undefined;
  const city = before && before.countryId === countryId && here?.countryId !== countryId ? before : here;
  return { countryId, ...(city ? { regionId: city.parentId } : {}) };
}

/** A bank's ISO country as SLATE's country id: Britain is `uk`, the rest their code. */
export const countryOfIso = (iso: string): string => (iso === 'GB' ? 'uk' : iso.toLowerCase());

/**
 * Whether a bank in a country does no business on a date, 'YYYY-MM-DD',
 * beyond the weekend: the country's public and bank holidays, and those of
 * the region the customer lives in (England's summer bank holiday isn't
 * Scotland's).
 */
export function bankHoliday(countryId: string, date: string, regionId?: string): boolean {
  if (countryId === 'us') return usBankHoliday(date);
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  // Noon UTC names the date in any zone within twelve hours of it.
  return holidaysOn(Date.UTC(y, m - 1, d, 12), 'UTC', countryId, regionId).some((h) => h.type === 'public' || h.type === 'bank');
}

/** Whether a date is a business day at a bank in a country: a weekday and not a holiday it keeps. */
export function businessDay(countryId: string, date: string, regionId?: string): boolean {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return weekday !== 0 && weekday !== 6 && !bankHoliday(countryId, date, regionId);
}

const keyOf = (at: Instant, zone: string) => {
  const p = zonedParts(at, zone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

/** The moment some business days on from a moment, at the same hour, counting the bank's country's days. */
export function afterBusinessDays(from: Instant, business: number, countryId: string, zone: string, regionId?: string): Instant {
  let at = from;
  let left = business;
  for (let guard = 0; left > 0 && guard < 60; guard += 1) {
    at = addDays(at, 1, zone);
    if (businessDay(countryId, keyOf(at, zone), regionId)) left -= 1;
  }
  return at;
}

/** Business days from one moment to another, the first day not counted. */
export function businessDaysBetween(from: Instant, to: Instant, countryId: string, zone: string, regionId?: string): number {
  let days = 0;
  for (let at = addDays(from, 1, zone); at <= to && days <= 30; at = addDays(at, 1, zone)) if (businessDay(countryId, keyOf(at, zone), regionId)) days += 1;
  return days;
}

/**
 * The moment a payment between two countries arrives (from 2026-10-16): so many days that are business days at both
 * banks, the sending one's country and the receiving one's, counted from the day after it's sent, at five in the
 * afternoon. A day either country keeps as a holiday counts for neither, as a payment that clears through both waits on
 * both: a pound payment sent on the Friday before England's summer bank holiday lands on the Wednesday, and a dollar one
 * sent the Friday before Labor Day lands on the Wednesday too.
 */
export function afterBusinessDaysIn(from: Instant, business: number, places: readonly { countryId: string; regionId?: string }[], zone: string): Instant {
  let at = from;
  let left = business;
  for (let guard = 0; left > 0 && guard < 90; guard += 1) {
    at = addDays(at, 1, zone);
    const day = keyOf(at, zone);
    if (places.every((p) => businessDay(p.countryId, day, p.regionId))) left -= 1;
  }
  const p = zonedParts(at, zone);
  return instantFromZoned({ year: p.year, month: p.month, day: p.day, hour: 17 }, zone);
}
