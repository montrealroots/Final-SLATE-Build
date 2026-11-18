// Studio projects (the owner, November 18, 2026): a studio asks the player to direct or write its own next picture, by
// name: "Universal Pictures wants you to direct the next Fast and the Furious film". Where the studio has a live franchise
// (its films' TMDB collection, tools/screen-catalog/franchises.mjs) the picture is the franchise's next entry, invented by
// the game, as the owner asked ("they create invented films and add it to the franchise because it's a fantasy world");
// otherwise its next original in the genre it makes most. The rights are the game's credits' business.
//
// It comes a month after a delivery, or a fortnight after a win (awards-results.ts), once your work has made you
// Established in the role (reputation.ts: your standing follows the quality of your work and its honours), and the
// picture is no bigger than your grade is trusted with (STUDIO_REACH). The studio is the one whose overall deal you're on
// (your services are its alone); else one whose picture you made, back for the next; else the best fit that hasn't asked
// in two years. It says why it asks. At most one every six months. Until November 18, 2026 (the owner: "continuity and
// freshness") it came from the best fit alone, for its latest franchise whatever its size, on the track record's tier.
// Taken, it is a job like any other (jobs.ts): its days on the calendar, worked in person, paid for the days worked,
// credited when done.
//
// The money is the trade's (the owner: "real money ... big franchises getting big payday and budget"): the fee is in the
// range The Hollywood Reporter's salary surveys report for your standing, placed by the picture's real budget, which is the
// franchise's latest recorded budget or the studio's median (TMDB, in the catalog), and never under the guild minimum.
// Until it was set this way the fee was the guild minimum times 3 for a franchise, 1.5 for an original.
import { candidates, dealTier, activeOverall, type DealTier } from './first-look';
import { JOB_ANSWER_DAYS, rolesOffered, type OutsideJob } from './jobs';
import { honoursIn, roleCraft, standingIn, standingWeight } from './reputation';
import { strategyOf } from './strategy';
import { addLog, currentPlace, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, DAY, formatDateKey, weekdayOfKey } from './time';
import { DGA_HIGH_BUDGET_WEEK, WGA_DRAFT_DAYS, WGA_SCREENPLAY } from './union';
import { money } from './budget';
import { COMPANIES } from '../catalog/registry';
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
/**
 * The most a studio pays for the role, as a share of the picture's budget: 5%. Game calibration, set on November 18, 2026
 * when the international studios joined: no source for the share was found (Stephen Follows's budget study folds the fee
 * into the whole director line), and without a cap CJ ENM offered a first-time director $450,000, The Hollywood
 * Reporter's Hollywood range, for a $1.7 million Korean picture. In America the guild's minimum still comes first.
 */
export const STUDIO_FEE_SHARE = 0.05;
/** Where a studio is based, by the registry's TMDB record: its own, else its group's. */
const countryOf = (company: string): string | undefined => {
  const c = COMPANIES.find((x) => x.id === company);
  return c?.tmdb?.country ?? COMPANIES.find((x) => x.id === c?.parent?.id)?.tmdb?.country;
};
/** Weeks of shooting by budget: a tentpole of $150 million or more 18, $50 million or more 12, less 8. Game calibration. */
export const STUDIO_SHOOT_WEEKS: [number, number][] = [[150_000_000, 18], [50_000_000, 12], [0, 8]];
/** The guild's guaranteed period on a high-budget film (DGA): ten weeks, the director's floor. */
export const DGA_GUARANTEE_WEEKS = 10;

/**
 * How people say a franchise TMDB names some other way, read off the built catalog's names on November 18, 2026 (the
 * owner: "Make it say the next Godzilla film"). shortcut: a list of names, not a rule; read the catalog's names again
 * after a build that brings new studios in.
 */
export const SAID_AS: Record<string, string> = {
  'Godzilla Minus': 'Godzilla', 'Alien: Romulus': 'Alien', 'Spider-Man: Spider-Verse': 'Spider-Verse',
  'Hunger Games – New Trilogy': 'Hunger Games', 'Angels in the ...': 'Angels in the Outfield', 'Welcome to the...': 'Welcome to the South',
  'Beatles: A Four Film Cinematic Event': 'Beatles', 'Scary Movie': 'Scary Movie',
};
/** A franchise's name as people say it: "The Batman Collection" is the Batman films, "Superman (DCU)" Superman's. */
export const franchiseName = (collection: string): string => {
  // TMDB names some collections in their own language: Rai's "Ferie d'agosto - Collezione", Constantin's "Manitu
  // Filmreihe", CJ ENM's "Cumali Ceber Koleksiyonu", Televisa's "Carrosel: Coleção", StudioCanal's "... - Saga".
  const name = collection.replace(/\s*[-:]?\s*(Coll?ection|Colletion|Collezione|Coleção|Colección|Koleksiyonu|Filmreihe)$/i, '').replace(/\s+-\s+Saga$/, '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/^The\s+/i, '').trim();
  if (SAID_AS[name]) return SAID_AS[name];
  // "Minecraft Movie" is said "Minecraft", or the offer says "the next Minecraft Movie film"; "Crayon Shinchan the Movie"
  // "Crayon Shinchan"; "Rebel Highway Series" and "Girls Band Cry Compilation" without the last word.
  return name.replace(/\s+Movie$/, '').replace(/\s+the$/i, '').replace(/\s+(Series|Compilation)$/, '');
};

const inForce = (table: [string, number][], day: string): number => [...table].reverse().find(([from]) => from <= day)?.[1] ?? table[0][1];
const weekdaysFrom = (start: string, n: number): string[] => {
  const out: string[] = [];
  for (let k = start; out.length < n; k = addDaysToKey(k, 1)) if (weekdayOfKey(k) !== 0 && weekdayOfKey(k) !== 6) out.push(k);
  return out;
};

/**
 * How big a picture a studio trusts to you, by your grade in the role (reputation.ts: your standing from the quality of
 * your work and its honours): none while you're Emerging; up to $160 million Established, the size studios have handed a
 * director after one or two well-received films (Colin Trevorrow's Jurassic World, $150 million, after Safety Not
 * Guaranteed; Gareth Edwards's Godzilla, $160 million, after Monsters); up to $250 million In Demand; any picture they make
 * once you're Leading. Game calibration, set November 18, 2026 (the owner: "as the reputation and credibility build, as
 * I win awards, I'll start getting these offers").
 */
export const STUDIO_REACH: Record<string, number> = { Emerging: 0, Established: 160_000_000, 'In Demand': 250_000_000, Leading: Infinity };
/** A studio that asked you lately gives way to another, so the offers stay fresh: two years. Game calibration. */
export const STUDIO_ROTATION_DAYS = 730;

/** What a studio would trust to you in a role now: the largest budget, by your grade in it. */
export const studioReach = (state: GameState, role: 'directing' | 'writing'): number => STUDIO_REACH[standingIn(state, role).grade] ?? 0;

/** Why the studio asks, in a sentence: the work it saw. A win or nomination newer than its last ask counts first. */
function whyAsked(state: GameState, role: 'directing' | 'writing', since: number): string | undefined {
  const honour = honoursIn(state, role).filter((h) => (h.status === 'won' || h.status === 'nominated') && h.at > since && h.at <= state.now).sort((a, b) => b.at - a.at || b.score - a.score)[0];
  if (honour) return honour.status === 'won' ? `After ${honour.title} won ${honour.category} at the ${honour.event}.` : `After ${honour.title}'s nomination for ${honour.category} at the ${honour.event}.`;
  const best = [...roleCraft(state, role).works].sort((a, b) => b.score - a.score)[0];
  return best ? `On the strength of ${best.title}.` : undefined;
}

/** The offer a studio would make now, or null: who, what, the role and the fee. Pure: the same save gives the same answer. */
export function studioProjectOffer(state: GameState): OutsideJob | null {
  const jobs = (state.jobs ?? []).filter((j) => j.studio);
  if (jobs.some((j) => state.now - j.offeredAt < STUDIO_PROJECT_GAP_DAYS * DAY)) return null;
  // Studios ask for the roles you've worked in, once your work in one has made you Established in it.
  const roles = rolesOffered(state).filter((r): r is 'directing' | 'writing' => r !== 'acting' && studioReach(state, r) > 0);
  if (!roles.length) return null;
  // The role your record is strongest in, directing before writing on a tie.
  const role = roles.sort((a, b) => standingWeight(standingIn(state, b)) - standingWeight(standingIn(state, a)) || (a === 'directing' ? -1 : 1))[0];
  const reach = studioReach(state, role);
  const profiles = state.industry?.studios ?? [];
  // The studio: the one whose overall deal you're on; else one whose picture you made, back for the next (continuity);
  // else the one your work fits best among those that haven't asked in two years (freshness), the best fit if all have.
  const overall = activeOverall(state);
  const done = jobs.filter((j) => j.status === 'done').sort((a, b) => b.offeredAt - a.offeredAt)[0];
  const back = done && !jobs.some((j) => j.company === done.company && j.offeredAt > done.offeredAt) ? profiles.find((x) => strategyOf(x).name === done.company) : undefined;
  const recent = new Set(jobs.filter((j) => state.now - j.offeredAt < STUDIO_ROTATION_DAYS * DAY).map((j) => j.company));
  const fits = candidates(state, 'film').map((x) => x.strategy);
  const profile = overall ? profiles.find((x) => x.c === overall.company) : back;
  const strategy = profile ? strategyOf(profile) : fits.find((x) => !recent.has(x.name)) ?? fits[0];
  if (!strategy) return null;
  const studio = profile ?? profiles.find((x) => x.c === strategy.company);
  const sequel = !overall && back ? done : undefined;
  // The picture: the franchise you made for it, else a live franchise within your reach that it hasn't offered you yet,
  // the most recent first; else one it has; else an original.
  const offered = new Set(jobs.filter((j) => j.company === strategy.name).map((j) => j.studio!.franchise));
  const within = (studio?.fr ?? []).filter((f) => (f.budget ?? studio?.mb ?? 0) <= reach);
  const live = (sequel?.studio?.franchise ? within.find((f) => franchiseName(f.name) === sequel.studio!.franchise) : undefined)
    ?? within.find((f) => !offered.has(franchiseName(f.name))) ?? within[0];
  const franchise = live ? franchiseName(live.name) : undefined;
  const genre = strategy.families[0]?.genre ?? 'Drama';
  const day = dateKey(state.now, currentPlace(state).zone);
  const directing = role === 'directing';
  // The picture's budget: its franchise's latest recorded, else the studio's median within your reach; unknown, the middle of the scale.
  const median = studio?.mb ? Math.min(studio.mb, reach) : undefined;
  const budget = live?.budget ?? median;
  const budgetOf = live?.budget ? live.budgetOf : median && median === studio?.mb ? `${strategy.name}'s median budget` : undefined;
  const [b0, b1] = STUDIO_BUDGET_SCALE;
  const at = budget ? Math.min(1, Math.max(0, Math.log(budget / b0) / Math.log(b1 / b0))) : 0.5;
  // Your first studio picture in the role is a first studio feature, whatever else you've done.
  const first = !jobs.some((j) => j.role === role && j.status === 'done');
  const [lo, hi] = STUDIO_FEES[role][first ? 'first' : dealTier(state)];
  // The DGA's and WGA's minimums bind American studios, which sign their agreements; a studio elsewhere pays its own way.
  // A studio the registry doesn't place (a test's fixture) is taken as American.
  const abroad = (countryOf(strategy.company) ?? 'US') !== 'US';
  const floor = abroad ? 0 : directing ? inForce(DGA_HIGH_BUDGET_WEEK, day) * DGA_GUARANTEE_WEEKS : inForce(WGA_SCREENPLAY, day);
  const range = Math.round((lo + (hi - lo) * at) / 1000) * 1000;
  const share = budget ? Math.min(range, Math.round(budget * STUDIO_FEE_SHARE / 1000) * 1000) : range;
  const fee = Math.max(floor, share);
  // What set the fee, for the offer to say: the guild's minimum, the budget's share, or (unsaid) the trade's range.
  const set = fee === floor && floor > share ? 'guild' as const : share < range ? 'share' as const : undefined;
  const weeks = (STUDIO_SHOOT_WEEKS.find(([from]) => (budget ?? 0) >= from) ?? [0, 8])[1];
  const days = weekdaysFrom(addDaysToKey(day, directing ? 56 : 14), directing ? weeks * 5 : WGA_DRAFT_DAYS);
  const place = currentPlace(state);
  const lastAsk = Math.max(0, ...jobs.filter((j) => j.company === strategy.name).map((j) => j.offeredAt));
  const why = sequel ? `You ${sequel.role === 'directing' ? 'directed' : 'wrote'} ${sequel.studio?.franchise ? `its last ${sequel.studio.franchise} film` : `${sequel.production} for it`}, and it wants you back.` : whyAsked(state, role, lastAsk);
  return {
    id: `studio-${day}`, role,
    production: franchise ? `Untitled ${franchise} Film` : `Untitled ${strategy.name} ${genre} Picture`,
    company: strategy.name,
    part: directing ? 'Directing the picture' : 'Writing the screenplay',
    material: franchise ? `${live!.entries === 1 ? `The ${franchise} film` : `The ${franchise} films so far`}, and the studio's notes for the next one.` : `The studio's brief for ${/^[aeiou]/i.test(genre) ? 'an' : 'a'} ${genre.toLowerCase()} picture.`,
    requirement: directing ? `On set in ${place.name} each shooting day.` : `With the studio's producers in ${place.name}; the draft is due on the last day.`,
    dayRate: Math.round(fee / days.length), days, placeId: place.id, zone: place.zone,
    status: 'offered', offeredAt: state.now, answerBy: state.now + JOB_ANSWER_DAYS * DAY, attended: [], missed: [],
    studio: { fee, ...(franchise ? { franchise } : {}), genre, ...(budget ? { budget, budgetOf } : {}), first, ...(set ? { set } : {}), ...(why ? { why } : {}) },
  };
}

/** How a studio says it: "Universal Pictures wants you to direct the next Fast and the Furious film: $X for eight weeks ...". */
export function studioPitch(j: OutsideJob): string {
  const what = j.studio?.franchise ? `the next ${j.studio.franchise} film` : `its next ${(j.studio?.genre ?? 'drama').toLowerCase()} picture`;
  const work = j.role === 'directing' ? `direct ${what}: ${money(j.studio!.fee)} for ${j.days.length / 5} weeks of shooting` : `write ${what}: ${money(j.studio!.fee)} for the screenplay, ${j.days.length} working days`;
  return `${j.company} wants you to ${work}, from ${formatDateKey(j.days[0])}.${j.studio?.why ? ` ${j.studio.why}` : ''}`;
}
/** The picture's scale and where the fee comes from, for the offer's second line. */
export function studioScale(j: OutsideJob): string {
  const st = j.studio!;
  const budget = st.budget ? `A picture of about ${money(st.budget)}${st.budgetOf ? `, as ${st.budgetOf.endsWith('budget') ? `${st.budgetOf} is` : `${st.budgetOf} cost`}` : ''}.` : 'Its budget isn\'t recorded.';
  const who = j.role === 'directing' ? 'director' : 'writer';
  if (st.set === 'guild') return `${budget} The fee is the ${j.role === 'directing' ? "DGA's minimum for ten weeks" : "WGA's minimum for a screenplay"}, the least an American studio may pay, before any share of the profits.`;
  if (st.set === 'share') return `${budget} The fee is a twentieth of the budget, all a picture this size pays its ${who}, before any share of the profits.`;
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
