// Studio projects (the owner, November 18, 2026): a studio asks the player to direct or write its own next picture, by
// name: "Universal Pictures wants you to direct the next Fast and the Furious film". Where the studio has a live franchise
// (its films' TMDB collection, tools/screen-catalog/franchises.mjs) the picture is the franchise's next entry, invented by
// the game, as the owner asked ("they create invented films and add it to the franchise because it's a fantasy world");
// otherwise its next original in the genre it makes most. The rights are the game's credits' business.
//
// It comes after a delivery, for a record past its start, from the studio that fits the work best, or from the studio
// whose overall deal you're on (your services are its alone). At most one every six months. Taken, it is a job like any
// other (jobs.ts): its days on the calendar, worked in person, paid for the days worked, credited when done.
//
// The money is the trade's (the owner: "real money ... big franchises getting big payday and budget"): the fee is in the
// range The Hollywood Reporter's salary surveys report for your standing, placed by the picture's real budget, which is the
// franchise's latest recorded budget or the studio's median (TMDB, in the catalog), and never under the guild minimum.
// Until it was set this way the fee was the guild minimum times 3 for a franchise, 1.5 for an original.
import { candidates, dealTier, activeOverall, type DealTier } from './first-look';
import { JOB_ANSWER_DAYS, rolesOffered, type JobRole, type OutsideJob } from './jobs';
import { standingIn, standingWeight } from './reputation';
import { strategyOf } from './strategy';
import { addLog, currentPlace, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, DAY, formatDateKey, weekdayOfKey } from './time';
import { DGA_HIGH_BUDGET_WEEK, WGA_DRAFT_DAYS, WGA_SCREENPLAY } from './union';
import { money } from './budget';
import type { GameState } from './types';

/** The least time between two studio offers. Game calibration. (The notice after a delivery is first-look.ts
 * STUDIO_PROJECT_NOTICE_DAYS, scheduled with the first-look check.) */
export const STUDIO_PROJECT_GAP_DAYS = 180;
/**
 * What a studio pays for its picture, by your standing, from The Hollywood Reporter's salary surveys: a director's first
 * studio feature from DGA scale up to $450,000 to $750,000; the next, after a success, $1 million to $2 million; an
 * experienced director at a studio $2.5 million to $5 million; the very top about $20 million (the elite band's floor of
 * $5 million is the game's, between the two). A writer's first studio script $75,000 to $100,000; an established writer
 * $150,000 to $600,000; the top $1 million to $2 million. Upfront fees only: backend shares aren't modelled.
 */
export const STUDIO_FEES: Record<'directing' | 'writing', Record<'first' | DealTier, [number, number]>> = {
  directing: { first: [450_000, 750_000], emerging: [450_000, 750_000], proven: [1_000_000, 2_000_000], established: [2_500_000, 5_000_000], elite: [5_000_000, 20_000_000] },
  writing: { first: [75_000, 100_000], emerging: [75_000, 100_000], proven: [150_000, 600_000], established: [150_000, 600_000], elite: [1_000_000, 2_000_000] },
};
/** Where in its range a fee falls, by the picture's budget: the bottom at $20 million or less, the top at $300 million or more, on a log scale. Game calibration. */
export const STUDIO_BUDGET_SCALE: [number, number] = [20_000_000, 300_000_000];
/** Weeks of shooting by budget: a tentpole of $150 million or more 18, $50 million or more 12, less 8. Game calibration. */
export const STUDIO_SHOOT_WEEKS: [number, number][] = [[150_000_000, 18], [50_000_000, 12], [0, 8]];
/** The guild's guaranteed period on a high-budget film (DGA): ten weeks, the director's floor. */
export const DGA_GUARANTEE_WEEKS = 10;

/** A franchise's name as people say it: "The Batman Collection" is the Batman films, "Superman (DCU)" Superman's. */
export const franchiseName = (collection: string): string =>
  collection.replace(/\s*-?\s*Coll?ection$/i, '').replace(/\s*Colletion$/i, '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/^The\s+/i, '').trim();

const inForce = (table: [string, number][], day: string): number => [...table].reverse().find(([from]) => from <= day)?.[1] ?? table[0][1];
const weekdaysFrom = (start: string, n: number): string[] => {
  const out: string[] = [];
  for (let k = start; out.length < n; k = addDaysToKey(k, 1)) if (weekdayOfKey(k) !== 0 && weekdayOfKey(k) !== 6) out.push(k);
  return out;
};

/** The offer a studio would make now, or null: who, what, the role and the fee. Pure: the same save gives the same answer. */
export function studioProjectOffer(state: GameState): OutsideJob | null {
  if (dealTier(state) === 'emerging') return null;
  if ((state.jobs ?? []).some((j) => j.studio && state.now - j.offeredAt < STUDIO_PROJECT_GAP_DAYS * DAY)) return null;
  const roles = rolesOffered(state).filter((r): r is Exclude<JobRole, 'acting'> => r !== 'acting');
  if (!roles.length) return null;
  // The studio: the one whose overall deal you're on, else the one your work fits best.
  const overall = activeOverall(state);
  const profile = overall ? state.industry?.studios?.find((x) => x.c === overall.company) : undefined;
  const strategy = profile ? strategyOf(profile) : candidates(state, 'film')[0]?.strategy;
  if (!strategy) return null;
  const studio = profile ?? state.industry?.studios?.find((x) => x.c === strategy.company);
  // The role your record is strongest in, directing before writing on a tie.
  const role = roles.sort((a, b) => standingWeight(standingIn(state, b)) - standingWeight(standingIn(state, a)) || (a === 'directing' ? -1 : 1))[0];
  const live = studio?.fr?.[0];
  const franchise = live ? franchiseName(live.name) : undefined;
  const genre = strategy.families[0]?.genre ?? 'Drama';
  const day = dateKey(state.now, currentPlace(state).zone);
  const directing = role === 'directing';
  // The picture's budget: its franchise's latest recorded, else the studio's median; unknown, the middle of the scale.
  const budget = live?.budget ?? studio?.mb;
  const budgetOf = live?.budget ? live.budgetOf : studio?.mb ? `${strategy.name}'s median budget` : undefined;
  const [b0, b1] = STUDIO_BUDGET_SCALE;
  const at = budget ? Math.min(1, Math.max(0, Math.log(budget / b0) / Math.log(b1 / b0))) : 0.5;
  // Your first studio picture in the role is a first studio feature, whatever else you've done.
  const first = !(state.jobs ?? []).some((j) => j.studio && j.role === role && j.status === 'done');
  const [lo, hi] = STUDIO_FEES[role][first ? 'first' : dealTier(state)];
  const floor = directing ? inForce(DGA_HIGH_BUDGET_WEEK, day) * DGA_GUARANTEE_WEEKS : inForce(WGA_SCREENPLAY, day);
  const fee = Math.max(floor, Math.round((lo + (hi - lo) * at) / 1000) * 1000);
  const weeks = (STUDIO_SHOOT_WEEKS.find(([from]) => (budget ?? 0) >= from) ?? [0, 8])[1];
  const days = weekdaysFrom(addDaysToKey(day, directing ? 56 : 14), directing ? weeks * 5 : WGA_DRAFT_DAYS);
  const place = currentPlace(state);
  return {
    id: `studio-${day}`, role,
    production: franchise ? `Untitled ${franchise} Film` : `Untitled ${strategy.name} ${genre} Picture`,
    company: strategy.name,
    part: directing ? 'Directing the picture' : 'Writing the screenplay',
    material: franchise ? `The ${franchise} films so far, and the studio's notes for the next one.` : `The studio's brief for a ${genre.toLowerCase()} picture.`,
    requirement: directing ? `On set in ${place.name} each shooting day.` : `With the studio's producers in ${place.name}; the draft is due on the last day.`,
    dayRate: Math.round(fee / days.length), days, placeId: place.id, zone: place.zone,
    status: 'offered', offeredAt: state.now, answerBy: state.now + JOB_ANSWER_DAYS * DAY, attended: [], missed: [],
    studio: { fee, ...(franchise ? { franchise } : {}), genre, ...(budget ? { budget, budgetOf } : {}), first },
  };
}

/** How a studio says it: "Universal Pictures wants you to direct the next Fast and the Furious film: $X for eight weeks ...". */
export function studioPitch(j: OutsideJob): string {
  const what = j.studio?.franchise ? `the next ${j.studio.franchise} film` : `its next ${(j.studio?.genre ?? 'drama').toLowerCase()} picture`;
  const work = j.role === 'directing' ? `direct ${what}: ${money(j.studio!.fee)} for ${j.days.length / 5} weeks of shooting` : `write ${what}: ${money(j.studio!.fee)} for the screenplay, ${j.days.length} working days`;
  return `${j.company} wants you to ${work}, from ${formatDateKey(j.days[0])}.`;
}
/** The picture's scale and where the fee comes from, for the offer's second line. */
export function studioScale(j: OutsideJob): string {
  const st = j.studio!;
  const budget = st.budget ? `A picture of about ${money(st.budget)}${st.budgetOf ? `, as ${st.budgetOf.endsWith('budget') ? `${st.budgetOf} is` : `${st.budgetOf} cost`}` : ''}.` : 'Its budget isn\'t recorded.';
  return `${budget} The fee is what studios pay ${st.first ? `for a ${j.role === 'directing' ? "director's" : "writer's"} first studio picture` : `a ${j.role === 'directing' ? 'director' : 'writer'} with your record`}, as the trade reports it, before any share of the profits.`;
}

registerHandler('studio-project', (state) => {
  const j = studioProjectOffer(state);
  if (!j) return { suppressInterrupt: true };
  (state.jobs ??= []).push(j);
  schedule(state, j.answerBy, 'job-lapse', { jobId: j.id }, { attention: 'silent', priority: 70, id: `job-lapse:${j.id}` });
  const text = `${studioPitch(j)} Answer by ${formatDateKey(dateKey(j.answerBy, j.zone))}.`;
  addLog(state, text, 'personal', { route: { view: 'profile' } });
  return { message: text };
});
