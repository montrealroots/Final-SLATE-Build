// What a performer must be paid at least: SAG-AFTRA's minimums for theatrical work (November 15, 2026; the owner's ask for
// "real SAG payouts"). A production's budget decides which agreement it works under, and each agreement has its own day
// minimum, raised each July 1. Read from the union's own tables where they could be read (docs/depth/PRODUCTION-SOURCES.md
// says which, and which are modeled):
// - the Theatrical Wage Table (SAG-AFTRA, 07/01/25 to 06/30/30): the day and weekly performer and the background actor;
// - SAGindie's 2026 TV/Theatrical page: the Low, Moderate Low and Ultra Low Budget day minimums from 07/01/26;
// - the year before (07/01/25), those three are the 2026 figures less the 3% raise, as reported elsewhere.
// Budget lines: Ultra Low up to $300,000, Moderate Low up to $700,000, Low under $2,000,000; above, the full agreement.
// A background actor's minimum applies under the full agreement only: the low-budget agreements leave background work
// to the producer. What is paid above a minimum is the performer's own asking rate (guests.ts, people.ts).

export type Agreement = 'ultra-low' | 'moderate-low' | 'low' | 'theatrical';
export const AGREEMENT_NAME: Record<Agreement, string> = {
  'ultra-low': 'SAG-AFTRA Ultra Low Budget Agreement',
  'moderate-low': 'SAG-AFTRA Moderate Low Budget Agreement',
  low: 'SAG-AFTRA Low Budget Agreement',
  theatrical: 'SAG-AFTRA Theatrical Agreement',
};
/** The most a production may cost to work under each low-budget agreement, in dollars. */
export const AGREEMENT_CEILING: [Agreement, number][] = [['ultra-low', 300_000], ['moderate-low', 700_000], ['low', 1_999_999]];

interface Period { from: string; day: Record<Agreement, number>; week: number; background: number }
/** Each period's minimums in whole dollars, from its first day. */
export const SAG_PERIODS: Period[] = [
  { from: '2025-07-01', day: { 'ultra-low': 249, 'moderate-low': 436, low: 810, theatrical: 1246 }, week: 4326, background: 224 },
  { from: '2026-07-01', day: { 'ultra-low': 257, 'moderate-low': 449, low: 834, theatrical: 1283 }, week: 4456, background: 231 },
  { from: '2027-07-01', day: { 'ultra-low': 264, 'moderate-low': 462, low: 859, theatrical: 1321 }, week: 4590, background: 238 },
  { from: '2028-07-01', day: { 'ultra-low': 272, 'moderate-low': 476, low: 885, theatrical: 1361 }, week: 4728, background: 245 },
  { from: '2029-07-01', day: { 'ultra-low': 280, 'moderate-low': 491, low: 911, theatrical: 1402 }, week: 4870, background: 252 },
];

/** The agreement a production of this budget works under. */
export function agreementFor(budget: number): Agreement {
  return AGREEMENT_CEILING.find(([, max]) => budget <= max)?.[0] ?? 'theatrical';
}

/** The minimums in force on a date (YYYY-MM-DD): the last period begun by then; before the first, the first. */
export function periodOn(date: string): Period {
  return [...SAG_PERIODS].reverse().find((x) => x.from <= date) ?? SAG_PERIODS[0];
}

/** Roles a performer's minimum covers, and which minimum. */
const PERFORMING = new Set(['actor', 'voice-actor']);

/** The least a day of this role may be paid on a production of this budget on this date, and under what; null where no minimum applies. */
export function performerMinimum(roleId: string, budget: number, date: string): { amount: number; agreement: Agreement } | null {
  const agreement = agreementFor(budget);
  const period = periodOn(date);
  if (PERFORMING.has(roleId)) return { amount: period.day[agreement], agreement };
  if (roleId === 'background' && agreement === 'theatrical') return { amount: period.background, agreement };
  return null;
}

/**
 * A director's and a writer's minimums, where a production is large enough that the guild's full terms apply (November
 * 15, 2026; until then neither had any). Below these lines the guilds' low-budget terms set pay by level or leave it to
 * be negotiated, and the game sets none.
 * - Directors: the DGA Basic Agreement's freelance minimum for a high-budget theatrical, a week, from the 2026-30 wage
 *   tables (AMPTP, printed June 25, 2026), read as a day over a five-day week, on a production over $11 million (above
 *   the DGA's low-budget sideletter, whose top level, 4c, ends at $11 million).
 * - Writers: the WGA's minimum for an original screenplay with treatment on a film of $5 million or more, $173,215 from
 *   May 2, 2026 (2026 Schedule of Minimums), read as a day over the 25 days a feature's draft takes (writing-jobs.ts).
 */
export const DGA_HIGH_BUDGET_WEEK: [string, number][] = [['2025-07-01', 24_599], ['2026-07-01', 25_214], ['2027-07-01', 25_970], ['2028-07-01', 26_749], ['2029-07-01', 27_551]];
export const DGA_FULL_TERMS_ABOVE = 11_000_000;
export const WGA_SCREENPLAY: [string, number][] = [['2026-05-02', 173_215]];
export const WGA_HIGH_BUDGET_FROM = 5_000_000;
export const WGA_DRAFT_DAYS = 25;
const inForce = (table: [string, number][], date: string): number => ([...table].reverse().find(([from]) => from <= date) ?? table[0])[1];
const WRITING = new Set(['episode-writer', 'co-writer']);

/** The least a day of a director's or a writer's work may be paid on this production on this date, and under what; null where none applies. */
export function guildMinimum(roleId: string, budget: number, date: string): { amount: number; agreement: string } | null {
  if (roleId === 'episode-director' && budget > DGA_FULL_TERMS_ABOVE) return { amount: Math.round(inForce(DGA_HIGH_BUDGET_WEEK, date) / 5), agreement: 'DGA Basic Agreement' };
  if (WRITING.has(roleId) && budget >= WGA_HIGH_BUDGET_FROM) return { amount: Math.round(inForce(WGA_SCREENPLAY, date) / WGA_DRAFT_DAYS), agreement: 'WGA Minimum Basic Agreement' };
  return null;
}
