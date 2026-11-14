/**
 * SLATE — the United States' holidays that the engine reads, as rules.
 *
 * The calendar's holidays (`content/holidays.ts`) are fetched a country at a
 * time, so the simulation can't wait on them. What the engine needs of them
 * is the United States': the Federal Reserve's holidays, on which a US bank
 * does no business, and SAG-AFTRA's, on which a production doesn't shoot.
 * Both are rules, so they're kept here as rules. Until 2026-09-27 nothing in
 * the engine read a holiday, and a shoot or a bank's business day fell on
 * Thanksgiving as on any Thursday.
 *
 * The Federal Reserve observes a holiday that falls on a Sunday on the
 * Monday, and one on a Saturday not at all. SAG-AFTRA's contract moves one on
 * a Saturday to the Friday and one on a Sunday to the Monday.
 */

/** A date's weekday, 0 Sunday to 6 Saturday. */
const weekday = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const key = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);

/** The nth given weekday of a month; n of -1 is the last. */
export function nth(y: number, m: number, day: number, n: number): string {
  if (n > 0) {
    const first = weekday(y, m, 1);
    return key(y, m, 1 + ((day - first + 7) % 7) + (n - 1) * 7);
  }
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lastDay = weekday(y, m, last);
  return key(y, m, last - ((lastDay - day + 7) % 7));
}

/** Easter Sunday, by the anonymous Gregorian algorithm. */
export function easter(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return key(y, month, day);
}

/** A fixed date as observed: a Sunday on the Monday; a Saturday on the Friday, or not at all. */
function observed(y: number, m: number, d: number, saturdayToFriday: boolean): string[] {
  const w = weekday(y, m, d);
  if (w === 0) return [key(y, m, d + 1)];
  if (w === 6) return saturdayToFriday ? [key(y, m, d - 1)] : [];
  return [key(y, m, d)];
}

const cache = new Map<string, Set<string>>();

function year(kind: 'fed' | 'sag' | 'yale', y: number): Set<string> {
  const id = `${kind}-${y}`;
  const hit = cache.get(id);
  if (hit) return hit;
  // Yale’s nine holidays are SAG-AFTRA’s but Presidents’ Day, moved off a weekend the same way, and its recess days
  // added below.
  const sag = kind !== 'fed';
  const days = new Set<string>([
    ...observed(y, 1, 1, sag),
    nth(y, 1, 1, 3), // Martin Luther King Jr. Day
    nth(y, 2, 1, 3), // Washington's Birthday, Presidents' Day
    nth(y, 5, 1, -1), // Memorial Day
    ...observed(y, 6, 19, sag), // Juneteenth
    ...observed(y, 7, 4, sag),
    nth(y, 9, 1, 1), // Labor Day
    nth(y, 11, 4, 4), // Thanksgiving
    ...observed(y, 12, 25, sag),
  ]);
  if (sag) {
    // Good Friday, and the day after Thanksgiving.
    const [ey, em, ed] = easter(y).split('-').map(Number) as [number, number, number];
    days.add(key(ey, em, ed - 2));
    const [ty, tm, td] = nth(y, 11, 4, 4).split('-').map(Number) as [number, number, number];
    days.add(key(ty, tm, td + 1));
  } else {
    days.add(nth(y, 10, 1, 2)); // Columbus Day
    for (const one of observed(y, 11, 11, false)) days.add(one); // Veterans Day
  }
  // New Year's Day of the next year, observed on this year's last Friday.
  if (sag && weekday(y + 1, 1, 1) === 6) days.add(key(y, 12, 31));
  // Yale keeps no Presidents’ Day; its recess days are the day after Thanksgiving, above, and every weekday from 24 to
  // 31 December.
  if (kind === 'yale') days.delete(nth(y, 2, 1, 3));
  if (kind === 'yale') for (let d = 24; d <= 31; d += 1) if (weekday(y, 12, d) % 6 !== 0) days.add(key(y, 12, d));
  cache.set(id, days);
  return days;
}

/** Whether a US bank does business on a date, 'YYYY-MM-DD': not on a weekend or a Federal Reserve holiday. */
export function usBankHoliday(date: string): boolean {
  return year('fed', Number(date.slice(0, 4))).has(date);
}

/** Whether a date is one of SAG-AFTRA's holidays, on which a production doesn't shoot. */
export function sagHoliday(date: string): boolean {
  return year('sag', Number(date.slice(0, 4))).has(date);
}

/**
 * Whether Yale is closed on a date, 'YYYY-MM-DD': its nine official holidays (New Year’s Day, Martin Luther King Jr.
 * Day, Good Friday, Memorial Day, Juneteenth, Independence Day, Labor Day, Thanksgiving, Christmas), one on a Saturday
 * kept on the Friday and one on a Sunday on the Monday, and its six recess days, the day after Thanksgiving and the
 * weekdays of the last week of December ("Official Yale Holidays", your.yale.edu, 2026 and 2027, read on 2026-10-13).
 * From that day the School’s working days (`systems/leave.ts`) skip them; until then they counted Monday to Friday.
 */
export function yaleHoliday(date: string): boolean {
  return year('yale', Number(date.slice(0, 4))).has(date);
}

export const US_HOLIDAYS_SOURCE = 'https://www.federalreserve.gov/aboutthefed/k8.htm; https://www.sagaftra.org/contracts-industry-resources/contracts/2023-tvtheatrical-contracts (MLK Day and Juneteenth from 2024)';
