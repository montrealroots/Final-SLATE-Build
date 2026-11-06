// Other calendars' months as day counts (2000-2100), adapted from SLATE-REBUILD: Umm al-Qura, Hebrew, Chinese, Korean,
// Persian and Ethiopian (donor register R-0106; the donor's compile tool isn't in the package, so the tables are
// taken as supplied and spot-checked against official dates in tests). See docs/DATA-PROVENANCE.md.
import { civilFromDays } from './rules';

export type CalendarId = 'islamic-umalqura' | 'hebrew' | 'chinese' | 'dangi' | 'persian' | 'ethiopic';
export interface CalendarData { from: number; to: number; calendars: Record<string, Record<string, number>> }
interface Month { first: number; last: number }

const indexes = new WeakMap<CalendarData, Map<string, Map<string, Month[]>>>();
function monthsOf(data: CalendarData, calendar: CalendarId): Map<string, Month[]> | undefined {
  let index = indexes.get(data);
  if (!index) {
    index = new Map(Object.entries(data.calendars).map(([c, months]) => [c, monthIndex(months, data.to)]));
    indexes.set(data, index);
  }
  return index.get(calendar);
}

/** A calendar's months ("1447/9": its first day) by month, each to the day before the next one's first. */
export function monthIndex(months: Record<string, number>, to: number): Map<string, Month[]> {
  const out = new Map<string, Month[]>();
  const entries = Object.entries(months);
  entries.forEach(([key, first], i) => {
    const m = { first, last: (entries[i + 1]?.[1] ?? to + 1) - 1 };
    const month = key.split('/')[1];
    const list = out.get(month);
    if (list) list.push(m);
    else out.set(month, [m]);
  });
  return out;
}

/** The days of a Gregorian year that are a given day of a month of another calendar: none, one, or (Islamic) two. */
export function daysIn(data: CalendarData, calendar: CalendarId, month: string, day: number, year: number): number[] {
  const months = monthsOf(data, calendar)?.get(month);
  if (!months) throw new RangeError(`the ${calendar} calendar has no month ${month}`);
  const out: number[] = [];
  for (const m of months) {
    const d = m.first + day - 1;
    if (day >= 1 && d <= m.last && civilFromDays(d).year === year) out.push(d);
  }
  return out;
}
