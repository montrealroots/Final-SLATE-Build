// Weeks in cinemas, and the record book (the v3 package, 02, "Box office and history books"). Until November 12, 2026 a
// theatrical release was six monthly figures from its distributor and nothing behind them.
//
// What is here, and what is not. Every figure is this game's own simulation and is labelled so wherever it is shown; no
// recorded historical result is imported, and none is made up to stand beside these. The money a film earns is exactly
// what it was: the distributor's monthly report (distribution.ts reportedGross) is still the amount, and these weeks are
// that report in the four weeks it covers. Not built: screens and bookings, holdovers decided week by week, publicity
// spending, competition from other films, and currency other than the game's dollars.
//
// - A week's posting is one number: the film rental, which is what the cinemas paid the distributor. The rest is worked
//   out from it and never stored, so nothing can drift from it: ticket sales are the rental over the share cinemas pass
//   on, admissions are ticket sales over a ticket's price, the cinemas keep the difference, the distributor's fee comes
//   off the rental, and what is left goes towards the guarantee.
// - A week is first reported the day it ends, provisionally, from the film as it stands that day. The distributor's
//   report for the month then settles its four weeks: they are made to add up to the report exactly, and a week whose
//   figure moved keeps what it first said. So a month's report is the sum of its weeks, always, and a correction is
//   visible instead of silent.
// - Gross is ticket sales. It is not what the distributor received, not profit and not what reached the player, and
//   each of those has its own column.
import type { BoxOfficeWeek, DistributionOffer, GameState, Project } from './types';
import { addDaysToKey } from './time';

/** A distributor's report covers four weeks in cinemas; a run is reported for as many months as distribution.ts REPORT_MONTHS. */
export const WEEKS_PER_REPORT = 4;
/** The share of ticket sales cinemas pass to the distributor as film rental. A modeled assumption. */
export const RENTAL_SHARE = 0.5;
/** A ticket's price, in the game's dollars, everywhere. A modeled assumption: one price, so admissions are comparable. */
export const TICKET_PRICE = 10;
/**
 * How a month's takings fall across its four weeks. The monthly curve loses two fifths a month (distribution.ts), so a
 * week loses the fourth root of that; these are those four weights, in thousandths, adding to 1000.
 */
export const WEEK_WEIGHTS = [300, 264, 232, 204] as const;

const hundred = (n: number) => Math.round(n / 100) * 100;
export const monthOfWeek = (week: number): number => Math.ceil(week / WEEKS_PER_REPORT);
const weeksOfMonth = (o: DistributionOffer, month: number): BoxOfficeWeek[] => (o.weeks ?? []).filter((w) => monthOfWeek(w.week) === month);

/** The week's dates, from the day the film opened. */
export function weekDates(opened: string, week: number): { from: string; to: string } {
  return { from: addDaysToKey(opened, (week - 1) * 7), to: addDaysToKey(opened, week * 7 - 1) };
}

/**
 * The provisional figure for a week: its share of what the month's report would be if it were made today. The last
 * week's share is what the other three leave of that same figure, so four weeks reported on an unchanged film add up to
 * its report to the dollar. It is never what earlier weeks left of it: until this was tried in a browser (a film that
 * opened abroad in its third week), the last week took the whole of any change, came out larger than the first, and
 * the settlement had nothing to correct.
 */
export function provisionalRental(week: number, monthToday: number): number {
  const share = (k: number) => hundred((monthToday * WEEK_WEIGHTS[k]) / 1000);
  const k = (week - 1) % WEEKS_PER_REPORT;
  return k < WEEKS_PER_REPORT - 1 ? share(k) : Math.max(0, monthToday - share(0) - share(1) - share(2));
}

/** Record a week as it ends. Recorded once: a week already there is left alone. */
export function recordWeek(o: DistributionOffer, week: number, opened: string, territories: number, monthToday: number): BoxOfficeWeek | null {
  if ((o.weeks ?? []).some((w) => w.week === week)) return null;
  const w: BoxOfficeWeek = { week, ...weekDates(opened, week), territories, rental: provisionalRental(week, monthToday), status: 'provisional' };
  (o.weeks ??= []).push(w);
  o.weeks.sort((a, b) => a.week - b.week);
  return w;
}

/**
 * Settle a month: its weeks are made to add up to the distributor's report for it, in the proportions they were first
 * reported in, the last week taking what rounding leaves. A week that moves keeps its first figure. A month with no
 * weeks recorded (a film that opened before weeks were kept, or a week whose day was missed) gets them now, final.
 */
export function settleMonth(o: DistributionOffer, month: number, reported: number, opened: string, territories: number): void {
  for (let k = 0; k < WEEKS_PER_REPORT; k++) {
    const week = (month - 1) * WEEKS_PER_REPORT + k + 1;
    if (!(o.weeks ?? []).some((w) => w.week === week)) {
      (o.weeks ??= []).push({ week, ...weekDates(opened, week), territories, rental: 0, status: 'provisional', late: true });
    }
  }
  o.weeks!.sort((a, b) => a.week - b.week);
  const weeks = weeksOfMonth(o, month);
  const before = weeks.reduce((n, w) => n + w.rental, 0);
  let left = reported;
  weeks.forEach((w, i) => {
    const share = before > 0 ? w.rental / before : WEEK_WEIGHTS[(w.week - 1) % WEEKS_PER_REPORT] / 1000;
    const settled = i === weeks.length - 1 ? left : Math.min(left, hundred(reported * share));
    left -= settled;
    if (settled !== w.rental && !w.late) w.first = w.rental;
    w.rental = settled;
    w.status = 'final';
  });
}

/** Everything a week's rental implies, worked out and never stored. `fee` is the distributor's share of the rental. */
export function weekMoney(w: BoxOfficeWeek, fee: number): { gross: number; admissions: number; cinemas: number; rental: number; fee: number; net: number } {
  const gross = Math.round(w.rental / RENTAL_SHARE);
  const feeTaken = Math.round(w.rental * fee);
  return { gross, admissions: Math.round(gross / TICKET_PRICE), cinemas: gross - w.rental, rental: w.rental, fee: feeTaken, net: w.rental - feeTaken };
}

// ---------------- The record book ----------------

export interface BookRow {
  projectId: string;
  title: string;
  /** The day its first cinema run opened. */
  opened: string;
  /** Ticket sales in the first week of its first run. A later run adds to the lifetime and is never an opening. */
  opening: number;
  /** Its best single week, and which week of which run. */
  best: { gross: number; week: number };
  lifetime: number;
  admissions: number;
  /** Weeks with any takings, across its runs. */
  weeks: number;
  runs: number;
  /** Whether every week counted is settled; a book entry with a provisional week can still move. */
  settled: boolean;
  /** Ticket sales by the calendar year a week ended in. */
  byYear: Record<string, number>;
  /** Places in this career's book. Equal figures share a place; the earlier opening is listed first. */
  rank: { opening: number; lifetime: number };
}

const theatricalRuns = (p: Project) => p.offers.filter((o) => o.route === 'theatrical' && o.weeks?.length).sort((a, b) => a.weeks![0].from.localeCompare(b.weeks![0].from));

/**
 * This career's cinema results: one row a film, from its weeks. Simulated, every figure; the book holds nothing that
 * was not played. It is worked out from the weeks each time it is read, so a settled month or a corrected week is in
 * it at once and there is no second copy to fall behind.
 */
export function recordBook(state: GameState): BookRow[] {
  const gross = (w: BoxOfficeWeek) => Math.round(w.rental / RENTAL_SHARE);
  const rows: BookRow[] = [];
  for (const p of state.projects) {
    const runs = theatricalRuns(p);
    if (!runs.length) continue;
    const all = runs.flatMap((o) => o.weeks!);
    const byYear: Record<string, number> = {};
    for (const w of all) byYear[w.to.slice(0, 4)] = (byYear[w.to.slice(0, 4)] ?? 0) + gross(w);
    const best = all.reduce((b, w) => (gross(w) > b.gross ? { gross: gross(w), week: w.week } : b), { gross: 0, week: 0 });
    const lifetime = all.reduce((n, w) => n + gross(w), 0);
    rows.push({
      projectId: p.id, title: p.title, opened: runs[0].weeks![0].from, opening: gross(runs[0].weeks!.find((w) => w.week === 1) ?? runs[0].weeks![0]), best, lifetime,
      admissions: Math.round(lifetime / TICKET_PRICE), weeks: all.filter((w) => w.rental > 0).length, runs: runs.length, settled: all.every((w) => w.status === 'final'), byYear, rank: { opening: 0, lifetime: 0 },
    });
  }
  for (const r of rows) r.rank = { opening: 1 + rows.filter((x) => x.opening > r.opening).length, lifetime: 1 + rows.filter((x) => x.lifetime > r.lifetime).length };
  return rows.sort((a, b) => b.lifetime - a.lifetime || a.opened.localeCompare(b.opened) || a.title.localeCompare(b.title));
}
