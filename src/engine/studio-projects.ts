// Studio projects (the owner, November 18, 2026): a studio asks the player to direct or write its own next picture, by
// name: "Universal Pictures wants you to direct the next Fast and the Furious film". Where the studio has a live franchise
// (its films' TMDB collection, tools/screen-catalog/franchises.mjs) the picture is the franchise's next entry, invented by
// the game, as the owner asked ("they create invented films and add it to the franchise because it's a fantasy world");
// otherwise its next original in the genre it makes most. The rights are the game's credits' business.
//
// It comes after a delivery, for a record past its start, from the studio that fits the work best, or from the studio
// whose overall deal you're on (your services are its alone). At most one every six months. Taken, it is a job like any
// other (jobs.ts): its days on the calendar, worked in person, paid for the days worked, credited when done. The fee is
// the guild minimum for the work (DGA high-budget weeks, WGA screenplay) times a multiple for a studio picture, moved by
// your standing in the role: game calibration.
import { candidates, dealTier, activeOverall } from './first-look';
import { JOB_ANSWER_DAYS, rolesOffered, type JobRole, type OutsideJob } from './jobs';
import { standingIn, standingRate, standingWeight } from './reputation';
import { strategyOf } from './strategy';
import { addLog, currentPlace, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, DAY, formatDateKey, weekdayOfKey } from './time';
import { DGA_HIGH_BUDGET_WEEK, WGA_DRAFT_DAYS, WGA_SCREENPLAY } from './union';
import { money } from './budget';
import type { GameState } from './types';

/** The least time between two studio offers, and the weeks of a director's work. Game calibration. (The notice after a
 * delivery is first-look.ts STUDIO_PROJECT_NOTICE_DAYS, scheduled with the first-look check.) */
export const STUDIO_PROJECT_GAP_DAYS = 180;
export const STUDIO_DIRECTING_WEEKS = 8;
/** A studio picture pays this many times the guild minimum: a franchise entry more than an original. Game calibration. */
export const STUDIO_FEE_MULTIPLE = { franchise: 3, original: 1.5 } as const;

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
  const days = weekdaysFrom(addDaysToKey(day, directing ? 56 : 14), directing ? STUDIO_DIRECTING_WEEKS * 5 : WGA_DRAFT_DAYS);
  const scale = directing ? inForce(DGA_HIGH_BUDGET_WEEK, day) * STUDIO_DIRECTING_WEEKS : inForce(WGA_SCREENPLAY, day);
  const fee = Math.round((scale * STUDIO_FEE_MULTIPLE[franchise ? 'franchise' : 'original'] * standingRate(standingIn(state, role))) / 1000) * 1000;
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
    studio: { fee, ...(franchise ? { franchise } : {}), genre },
  };
}

/** How a studio says it: "Universal Pictures wants you to direct the next Fast and the Furious film: $X for eight weeks ...". */
export function studioPitch(j: OutsideJob): string {
  const what = j.studio?.franchise ? `the next ${j.studio.franchise} film` : `its next ${(j.studio?.genre ?? 'drama').toLowerCase()} picture`;
  const work = j.role === 'directing' ? `direct ${what}: ${money(j.studio!.fee)} for ${j.days.length / 5} weeks of shooting` : `write ${what}: ${money(j.studio!.fee)} for the screenplay, ${j.days.length} working days`;
  return `${j.company} wants you to ${work}, from ${formatDateKey(j.days[0])}.`;
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
