/**
 * SLATE — The one authoritative world clock.
 *
 * LAW: there is exactly one canonical world instant, stored as UTC epoch
 * milliseconds. There is no Bank clock, no Career clock, no Production clock.
 * Every subsystem asks this module what time it is, in whatever zone it cares
 * about. Zone conversion goes through Intl, so DST transitions, leap years and
 * historical zone rules are handled by the platform rather than by hand-rolled
 * offset arithmetic.
 */

/** UTC milliseconds since the epoch. The single canonical representation. */
export type Instant = number;

/** An IANA time zone identifier, e.g. 'America/Los_Angeles'. */
export type TimeZone = string;

export const MS_SECOND = 1000;
export const MS_MINUTE = 60 * MS_SECOND;
export const MS_HOUR = 60 * MS_MINUTE;
export const MS_DAY = 24 * MS_HOUR;

export interface ZonedParts {
  year: number;
  /** 1-12 */
  month: number;
  /** 1-31 */
  day: number;
  /** 0-23 */
  hour: number;
  minute: number;
  second: number;
  /** 0 = Sunday .. 6 = Saturday */
  weekday: number;
  zone: TimeZone;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

export const WEEKDAY_NAMES = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
] as const;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

const partsFormatterCache = new Map<TimeZone, Intl.DateTimeFormat>();

function partsFormatter(zone: TimeZone): Intl.DateTimeFormat {
  let fmt = partsFormatterCache.get(zone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
      era: 'short',
    });
    partsFormatterCache.set(zone, fmt);
  }
  return fmt;
}

/** Decomposes a canonical instant into wall-clock parts for a zone. */
export function zonedParts(instant: Instant, zone: TimeZone): ZonedParts {
  const parts = partsFormatter(zone).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    for (const p of parts) if (p.type === type) return p.value;
    return '';
  };
  const era = get('era');
  const rawYear = Number(get('year'));
  return {
    year: era === 'BC' ? 1 - rawYear : rawYear,
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')) % 24,
    minute: Number(get('minute')),
    second: Number(get('second')),
    weekday: WEEKDAY_INDEX[get('weekday')] ?? 0,
    zone,
  };
}

/** The zone's UTC offset, in milliseconds, at a given instant. */
export function zoneOffsetMs(instant: Instant, zone: TimeZone): number {
  const p = zonedParts(instant, zone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  // Round to the second to discard sub-second noise from the formatter.
  return asUtc - Math.floor(instant / MS_SECOND) * MS_SECOND;
}

export interface WallClock {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  second?: number;
}

/**
 * Converts a wall-clock reading in a zone back to the canonical instant.
 *
 * DST is genuinely hard here, so we solve it rather than guess:
 *  - "spring forward" gaps (2:30 AM on a day that has no 2:30 AM) resolve
 *    forward to the first valid instant after the gap;
 *  - "fall back" overlaps (1:30 AM occurring twice) resolve to the earlier,
 *    first occurrence, which is what a person setting an alarm means.
 */
/**
 * A date whose day or month has run over (the 32nd of a month, the 13th
 * month) as the real date it lands on. `instantFromZoned` takes such a
 * reading down its gap path and returns it a minute late, so a reading made
 * by adding days or months is put through this first.
 */
export function normalDate(year: number, month: number, day: number): { year: number; month: number; day: number } {
  const t = new Date(Date.UTC(year, month - 1, day));
  return { year: t.getUTCFullYear(), month: t.getUTCMonth() + 1, day: t.getUTCDate() };
}

export function instantFromZoned(wall: WallClock, zone: TimeZone): Instant {
  const target = Date.UTC(
    wall.year, wall.month - 1, wall.day,
    wall.hour ?? 0, wall.minute ?? 0, wall.second ?? 0,
  );

  // First approximation: treat the wall reading as if it were UTC, then correct
  // by the offset in effect near that moment. Two passes converge for every
  // real-world zone; a third pass is belt and braces.
  let guess = target - zoneOffsetMs(target, zone);
  for (let i = 0; i < 3; i++) {
    const offset = zoneOffsetMs(guess, zone);
    const next = target - offset;
    if (next === guess) break;
    guess = next;
  }

  const check = zonedParts(guess, zone);
  const matches =
    check.year === wall.year &&
    check.month === wall.month &&
    check.day === wall.day &&
    check.hour === (wall.hour ?? 0) &&
    check.minute === (wall.minute ?? 0);

  if (matches) {
    // Overlap case: an earlier instant may render the same wall reading.
    const earlier = guess - MS_HOUR;
    const ep = zonedParts(earlier, zone);
    if (
      ep.year === wall.year && ep.month === wall.month && ep.day === wall.day &&
      ep.hour === (wall.hour ?? 0) && ep.minute === (wall.minute ?? 0)
    ) {
      return earlier;
    }
    return guess;
  }

  // Gap case: the requested wall time does not exist. Walk forward minute by
  // minute (bounded) to the first instant at or after the requested reading.
  //
  // In a gap the passes above swing between an instant reading the request
  // less the gap and one reading it plus the gap, and stop on either: before
  // the gap in zones west of Greenwich, after it in zones at or east of it.
  // The walk used to step on from wherever they stopped, so where they stopped
  // after the gap it returned the reading plus the gap plus a minute, not the
  // end of the gap. At Beirut and Cairo's midnight that was 01:01, so their
  // days of the jump in 2026 began at 01:01 where Havana's began at 01:00, and
  // London's 01:30 on 29 March 2026 came out 02:31. It steps on from the
  // instant before the gap now, whichever the passes stopped on, and lands on
  // the end of the gap. That instant reads earlier than the request, so the
  // walk still starts a minute past it, as it did. A reading that overflows
  // its day or month (30 February) comes here too, with the passes agreeing,
  // and still comes back a minute late, which was not changed. A reading with
  // seconds keeps them: it lands that many seconds past the end of the gap,
  // where at or east of Greenwich it had landed that many past the reading
  // plus the gap plus a minute.
  const start = Math.min(guess, target - zoneOffsetMs(guess, zone));
  for (let m = 1; m <= 180; m++) {
    const candidate = start + m * MS_MINUTE;
    const cp = zonedParts(candidate, zone);
    const candidateWall = Date.UTC(cp.year, cp.month - 1, cp.day, cp.hour, cp.minute, 0);
    if (candidateWall >= target) return candidate;
  }
  return guess;
}

/**
 * The first instant of the local day containing `instant`: midnight, or the
 * end of the gap on a day whose clocks skip midnight.
 */
export function startOfDay(instant: Instant, zone: TimeZone): Instant {
  const p = zonedParts(instant, zone);
  return instantFromZoned({ year: p.year, month: p.month, day: p.day, hour: 0, minute: 0, second: 0 }, zone);
}

/**
 * The first instant of the local day after the one containing `instant`:
 * midnight, or the end of the gap on a day whose clocks skip midnight.
 *
 * Worked out from the calendar date, not by adding a day to the start of
 * today. `addDays` keeps the wall-clock hour, and a day that skipped midnight
 * started at one, so the day after it was taken to start at one as well. The
 * midnight rollover was armed that way, and in the five home zones whose
 * clocks go forward at midnight it ran an hour late on the day after: at one
 * in Havana, Santiago and the Azores, and at 01:01 in Beirut and Cairo, whose
 * days of the jump began at 01:01 (see the gap walk in `instantFromZoned`).
 *
 * Always later than `instant`. A date a zone skipped outright, as Apia and
 * Fakaofo skipped 30 December 2011, resolves to a time before it, so the date
 * after that is taken: the rollover re-arms from here, and an answer that was
 * not later ran it at the same instant until the clock gave up.
 */
export function startOfNextDay(instant: Instant, zone: TimeZone): Instant {
  const p = zonedParts(instant, zone);
  for (let days = 1; ; days += 1) {
    const next = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
    const at = instantFromZoned(
      { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1, day: next.getUTCDate() },
      zone,
    );
    if (at > instant) return at;
  }
}

/**
 * Noon on the calendar date `days` after the one `instant` falls on.
 *
 * For stepping by date where only the date matters. `addDays` keeps the time
 * of day, and where that time falls in a gap at the end of a date it lands on
 * the next date: Nuuk's 28 March 2026 has no hour from eleven, so a day on from
 * half past eleven the evening before was the 29th. Noon is in every date a
 * zone keeps.
 */
export function noonOf(instant: Instant, days: number, zone: TimeZone): Instant {
  const p = zonedParts(instant, zone);
  const date = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return instantFromZoned(
    { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(), hour: 12 },
    zone,
  );
}

/** The last representable millisecond of the local day containing `instant`. */
export function endOfDay(instant: Instant, zone: TimeZone): Instant {
  return startOfNextDay(instant, zone) - 1;
}

/** Calendar-correct day arithmetic: adding 1 day across a DST change keeps the wall time. */
export function addDays(instant: Instant, days: number, zone: TimeZone): Instant {
  const p = zonedParts(instant, zone);
  const shifted = new Date(Date.UTC(p.year, p.month - 1, p.day + days));
  return instantFromZoned(
    {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: p.hour, minute: p.minute, second: p.second,
    },
    zone,
  );
}

/** Calendar-correct month arithmetic, clamping to the last valid day (Jan 31 + 1mo = Feb 28/29). */
export function addMonths(instant: Instant, months: number, zone: TimeZone): Instant {
  const p = zonedParts(instant, zone);
  const totalMonths = (p.year * 12) + (p.month - 1) + months;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12 + 12) % 12 + 1;
  const day = Math.min(p.day, daysInMonth(year, month));
  return instantFromZoned({ year, month, day, hour: p.hour, minute: p.minute, second: p.second }, zone);
}

export function addYears(instant: Instant, years: number, zone: TimeZone): Instant {
  return addMonths(instant, years * 12, zone);
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] ?? 30;
}

/** Whole local days between two instants (calendar days, not 24-hour blocks). */
export function daysBetween(a: Instant, b: Instant, zone: TimeZone): number {
  const da = startOfDay(a, zone);
  const db = startOfDay(b, zone);
  return Math.round((db - da) / MS_DAY);
}

export function sameLocalDay(a: Instant, b: Instant, zone: TimeZone): boolean {
  const pa = zonedParts(a, zone);
  const pb = zonedParts(b, zone);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}

/** Stable local date key, 'YYYY-MM-DD'. Used for calendar bucketing and indexes. */
export function dateKey(instant: Instant, zone: TimeZone): string {
  const p = zonedParts(instant, zone);
  return `${p.year.toString().padStart(4, '0')}-${p.month.toString().padStart(2, '0')}-${p.day.toString().padStart(2, '0')}`;
}

export function parseDateKey(key: string, zone: TimeZone, hour = 0, minute = 0): Instant {
  const [y, m, d] = key.split('-').map(Number);
  return instantFromZoned({ year: y ?? 2000, month: m ?? 1, day: d ?? 1, hour, minute }, zone);
}

// ---------------------------------------------------------------------------
// Presentation. Player-facing time reads naturally: "8:30 PM", not "20:30".
// ---------------------------------------------------------------------------

export function formatTime(instant: Instant, zone: TimeZone): string {
  const p = zonedParts(instant, zone);
  const suffix = p.hour < 12 ? 'AM' : 'PM';
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${h12}:${p.minute.toString().padStart(2, '0')} ${suffix}`;
}

export function formatDate(instant: Instant, zone: TimeZone): string {
  const p = zonedParts(instant, zone);
  return `${MONTH_NAMES[p.month - 1]} ${p.day}, ${p.year}`;
}

/**
 * A day kept as a key ('YYYY-MM-DD'), as the game writes a date: "September 26, 2026". The research's days are kept
 * that way, as data (the day a card's terms were read, a round-up rule checked), and the screens that show one say it
 * through this (from 2026-10-17, brief 14: until then "Source: …, 2026-09-26.").
 */
export function formatDateKey(key: string): string {
  return formatDate(parseDateKey(key, 'UTC', 12), 'UTC');
}

export function formatWeekdayDate(instant: Instant, zone: TimeZone): string {
  const p = zonedParts(instant, zone);
  return `${WEEKDAY_NAMES[p.weekday]}, ${MONTH_NAMES[p.month - 1]} ${p.day}, ${p.year}`;
}

export function formatDateTime(instant: Instant, zone: TimeZone): string {
  return `${formatDate(instant, zone)} at ${formatTime(instant, zone)}`;
}

/** Short zone label, e.g. 'PDT'. */
export function zoneAbbreviation(instant: Instant, zone: TimeZone): string {
  try {
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'short' });
    for (const part of fmt.formatToParts(new Date(instant))) {
      if (part.type === 'timeZoneName') return part.value;
    }
  } catch {
    /* fall through */
  }
  return '';
}

/** Human duration: "3 days", "4 hours", "25 minutes", "in a moment". */
export function formatDuration(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < MS_MINUTE) return 'less than a minute';

  // Round to the smallest unit shown *first*, then split. Flooring the hours
  // and rounding the minutes separately printed "22h 60m" for 22h 59.6m.
  const totalMinutes = Math.round(abs / MS_MINUTE);
  if (totalMinutes < 60) return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
  if (totalMinutes < 24 * 60) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h} hour${h === 1 ? '' : 's'}`;
  }

  const totalHours = Math.round(abs / MS_HOUR);
  const d = Math.floor(totalHours / 24);
  if (d < 14) {
    const h = totalHours % 24;
    return h > 0 ? `${d}d ${h}h` : `${d} day${d === 1 ? '' : 's'}`;
  }
  if (d < 60) return `${Math.round(d / 7)} weeks`;
  if (d < 730) return `${Math.round(d / 30.44)} months`;
  return `${(d / 365.25).toFixed(1)} years`;
}

/** Relative phrasing against the world clock: "in 3 hours", "2 days ago". */
export function formatRelative(target: Instant, now: Instant): string {
  const delta = target - now;
  if (Math.abs(delta) < 45 * MS_SECOND) return 'now';
  return delta > 0 ? `in ${formatDuration(delta)}` : `${formatDuration(delta)} ago`;
}

/**
 * A duration as a sentence says it (from 2026-10-17, brief 14's dynamic cases): "15 hours and 59 minutes", "2 days and
 * 3 hours", and otherwise `formatDuration`'s own words. "15h 59m" is a list's and a clock's form; until then sentences
 * took it too ("That’s in 15h 59m.", "It came up 2d 3h ago"). The rounding is `formatDuration`'s, so the two never
 * disagree about the figure.
 */
export function formatDurationWords(ms: number): string {
  const unit = (n: string, one: string) => `${n} ${one}${n === '1' ? '' : 's'}`;
  return formatDuration(ms)
    .replace(/^(\d+)h (\d+)m$/, (_, h: string, m: string) => `${unit(h, 'hour')} and ${unit(m, 'minute')}`)
    .replace(/^(\d+)d (\d+)h$/, (_, d: string, h: string) => `${unit(d, 'day')} and ${unit(h, 'hour')}`);
}

/** `formatRelative` as a sentence says it: "in 15 hours and 59 minutes", "2 days and 3 hours ago". */
export function formatRelativeWords(target: Instant, now: Instant): string {
  const delta = target - now;
  if (Math.abs(delta) < 45 * MS_SECOND) return 'now';
  return delta > 0 ? `in ${formatDurationWords(delta)}` : `${formatDurationWords(delta)} ago`;
}

// ---------------------------------------------------------------------------
// Seasons and age.
// ---------------------------------------------------------------------------

export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

/** Meteorological seasons, flipped for the southern hemisphere. */
export function seasonOf(instant: Instant, zone: TimeZone, latitude = 34): Season {
  const p = zonedParts(instant, zone);
  const northern: Season[] = [
    'Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer',
    'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter',
  ];
  const season = northern[p.month - 1] ?? 'Winter';
  if (latitude >= 0) return season;
  const flip: Record<Season, Season> = { Spring: 'Autumn', Summer: 'Winter', Autumn: 'Spring', Winter: 'Summer' };
  return flip[season];
}

/** Age in whole years on a given instant. */
export function ageOn(birthInstant: Instant, at: Instant, zone: TimeZone): number {
  const b = zonedParts(birthInstant, zone);
  const n = zonedParts(at, zone);
  return ageOnDate(b, n);
}

/**
 * The same, from plain calendar parts.
 *
 * Character creation knows a birthday and a start date as numbers rather than
 * instants, and it used to do this arithmetic itself as `startYear -
 * birthYear`. That is wrong for anybody whose birthday has not come round yet
 * that year: the screen promised a character of 25 and the game handed back
 * one of 24. There is one definition of how old somebody is, and this is it.
 */
export function ageOnDate(
  born: { year: number; month: number; day: number },
  at: { year: number; month: number; day: number },
): number {
  let age = at.year - born.year;
  if (at.month < born.month || (at.month === born.month && at.day < born.day)) age -= 1;
  return Math.max(0, age);
}

/** The next occurrence of a month/day anniversary at or after `from`. */
export function nextAnniversary(month: number, day: number, from: Instant, zone: TimeZone): Instant {
  const p = zonedParts(from, zone);
  const clampDay = (y: number) => Math.min(day, daysInMonth(y, month));
  const thisYear = instantFromZoned({ year: p.year, month, day: clampDay(p.year), hour: 9, minute: 0 }, zone);
  if (thisYear >= from) return thisYear;
  return instantFromZoned({ year: p.year + 1, month, day: clampDay(p.year + 1), hour: 9, minute: 0 }, zone);
}

/** Nth weekday of a month, e.g. the 3rd Monday of January. Negative n counts back. */
export function nthWeekdayOfMonth(year: number, month: number, weekday: number, n: number, zone: TimeZone): Instant {
  if (n > 0) {
    const first = instantFromZoned({ year, month, day: 1 }, zone);
    const firstWeekday = zonedParts(first, zone).weekday;
    const delta = (weekday - firstWeekday + 7) % 7;
    return addDays(first, delta + (n - 1) * 7, zone);
  }
  const last = instantFromZoned({ year, month, day: daysInMonth(year, month) }, zone);
  const lastWeekday = zonedParts(last, zone).weekday;
  const delta = (lastWeekday - weekday + 7) % 7;
  return addDays(last, -delta + (n + 1) * 7, zone);
}
