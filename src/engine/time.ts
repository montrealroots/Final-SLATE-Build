// One canonical world instant (milliseconds since the Unix epoch, UTC). Local time is
// always derived from IANA zone rules supplied by the runtime's Intl implementation.

export const SECOND = 1000;
export const MINUTE = 60 * SECOND;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export interface LocalParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number; // 0 Sunday ... 6 Saturday
}

const partFormatters = new Map<string, Intl.DateTimeFormat>();
function partFormatter(zone: string): Intl.DateTimeFormat {
  let f = partFormatters.get(zone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      weekday: 'short',
    });
    partFormatters.set(zone, f);
  }
  return f;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function localParts(instant: number, zone: string): LocalParts {
  const out: Record<string, string> = {};
  for (const p of partFormatter(zone).formatToParts(new Date(instant))) out[p.type] = p.value;
  return {
    year: Number(out.year),
    month: Number(out.month),
    day: Number(out.day),
    hour: Number(out.hour) % 24,
    minute: Number(out.minute),
    second: Number(out.second),
    weekday: WEEKDAYS.indexOf(out.weekday),
  };
}

/** Zone offset from UTC in minutes at an instant (e.g. -300 for New York in winter). */
export function zoneOffsetMinutes(instant: number, zone: string): number {
  const p = localParts(instant, zone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / MINUTE);
}

export type LocalResolution = 'exact' | 'gap' | 'ambiguous';

/**
 * Convert a local wall time to an instant. Nonexistent times (spring-forward gaps) move
 * forward by the gap length; ambiguous times (fall-back overlaps) resolve to the earlier
 * instant. The resolution is reported so callers can tell the player.
 */
export function localToInstant(
  zone: string,
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
): { instant: number; resolution: LocalResolution } {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const offsets = new Set([
    zoneOffsetMinutes(wall - DAY, zone),
    zoneOffsetMinutes(wall, zone),
    zoneOffsetMinutes(wall + DAY, zone),
  ]);
  const matches: number[] = [];
  for (const off of offsets) {
    const t = wall - off * MINUTE;
    const p = localParts(t, zone);
    if (
      p.year === year && p.month === month && p.day === day &&
      p.hour === hour && p.minute === minute && p.second === second
    ) matches.push(t);
  }
  if (matches.length === 1) return { instant: matches[0], resolution: 'exact' };
  if (matches.length > 1) return { instant: Math.min(...matches), resolution: 'ambiguous' };
  // Gap: use the offset in force before the transition, which lands after the gap.
  const before = zoneOffsetMinutes(wall - DAY, zone);
  return { instant: wall - before * MINUTE, resolution: 'gap' };
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** Add calendar days/months/years in a zone, preserving local wall time. Month-end clamps (Jan 31 + 1 month = Feb 28/29). */
export function addLocal(instant: number, zone: string, amount: { days?: number; months?: number; years?: number }): number {
  const p = localParts(instant, zone);
  let year = p.year + (amount.years ?? 0);
  let monthIndex = p.month - 1 + (amount.months ?? 0);
  year += Math.floor(monthIndex / 12);
  monthIndex = ((monthIndex % 12) + 12) % 12;
  const day = Math.min(p.day, daysInMonth(year, monthIndex + 1));
  const base = new Date(Date.UTC(year, monthIndex, day + (amount.days ?? 0)));
  return localToInstant(zone, base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate(), p.hour, p.minute, p.second).instant;
}

/** Start of the local day containing an instant. */
export function startOfLocalDay(instant: number, zone: string): number {
  const p = localParts(instant, zone);
  return localToInstant(zone, p.year, p.month, p.day, 0, 0, 0).instant;
}

/** Local date key "YYYY-MM-DD". */
export function dateKey(instant: number, zone: string): string {
  const p = localParts(instant, zone);
  return ymd(p.year, p.month, p.day);
}

export function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function parseYmd(key: string): { year: number; month: number; day: number } {
  const [year, month, day] = key.split('-').map(Number);
  return { year, month, day };
}

/** Day-number of a calendar date key (days since 1970-01-01), independent of zone. */
export function dayNumber(key: string): number {
  const { year, month, day } = parseYmd(key);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY);
}

export function keyFromDayNumber(n: number): string {
  const d = new Date(n * DAY);
  return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDaysToKey(key: string, days: number): string {
  return keyFromDayNumber(dayNumber(key) + days);
}

export function weekdayOfKey(key: string): number {
  return new Date(dayNumber(key) * DAY).getUTCDay();
}

export function isValidDate(year: number, month: number, day: number): boolean {
  return Number.isInteger(year) && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

export function dayOfYear(year: number, month: number, day: number): number {
  return Math.floor((Date.UTC(year, month - 1, day) - Date.UTC(year, 0, 1)) / DAY) + 1;
}

// ---------- Human formatting (en-US conventions, zone-correct) ----------

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function monthName(month: number): string {
  return MONTHS[month - 1];
}
export function weekdayName(weekday: number): string {
  return WEEKDAY_NAMES[weekday];
}

export function formatClock(hour: number, minute: number): string {
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}:${String(minute).padStart(2, '0')} ${hour < 12 ? 'AM' : 'PM'}`;
}

export function formatTime(instant: number, zone: string, withSeconds = false): string {
  const p = localParts(instant, zone);
  const base = formatClock(p.hour, p.minute);
  if (!withSeconds) return base;
  const [hm, ampm] = base.split(' ');
  return `${hm}:${String(p.second).padStart(2, '0')} ${ampm}`;
}

export function formatDate(instant: number, zone: string): string {
  const p = localParts(instant, zone);
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}

export function formatDateKey(key: string, withWeekday = false): string {
  const { year, month, day } = parseYmd(key);
  const base = `${MONTHS[month - 1]} ${day}, ${year}`;
  return withWeekday ? `${WEEKDAY_NAMES[weekdayOfKey(key)]}, ${base}` : base;
}

export function formatLongDate(instant: number, zone: string): string {
  const p = localParts(instant, zone);
  return `${WEEKDAY_NAMES[p.weekday]}, ${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}

export function formatZoneAbbrev(instant: number, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' }).formatToParts(new Date(instant));
  return parts.find((p) => p.type === 'timeZoneName')?.value ?? zone;
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / MINUTE);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours) parts.push(`${hours} ${hours === 1 ? 'hour' : 'hours'}`);
  if (minutes && !days) parts.push(`${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`);
  return parts.length ? parts.join(' ') : 'less than a minute';
}

/** Whole years between a birth date and a local date (birthday counted on the observed day). */
export function ageOn(birth: { year: number; month: number; day: number }, on: { year: number; month: number; day: number }): number {
  let age = on.year - birth.year;
  const observed = observedBirthday(birth, on.year);
  if (on.month < observed.month || (on.month === observed.month && on.day < observed.day)) age -= 1;
  return age;
}

/** Working default: February 29 birthdays are observed on February 28 in non-leap years. */
export function observedBirthday(birth: { month: number; day: number }, year: number): { month: number; day: number } {
  if (birth.month === 2 && birth.day === 29 && !isLeapYear(year)) return { month: 2, day: 28 };
  return { month: birth.month, day: birth.day };
}
