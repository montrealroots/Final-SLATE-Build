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
// credited when done. A studio back for more offers a multi-picture deal (from November 18, 2026): its pictures come one
// at a time through the same offers, each a month after the last is done, at the deal's fees; declining one ends it.
//
// The money is the trade's (the owner: "real money ... big franchises getting big payday and budget"): the fee is in the
// range The Hollywood Reporter's salary surveys report for your standing, placed by the picture's real budget, which is the
// franchise's latest recorded budget or the studio's median (TMDB, in the catalog), and never under the guild minimum.
// Until it was set this way the fee was the guild minimum times 3 for a franchise, 1.5 for an original.
//
// A franchise whose last film is recorded as having taken less than twice its budget worldwide (box-office-recorded.ts,
// Wikidata; the twice-budget rule, PROFIT_MULTIPLE) isn't continued: the studio offers another, or an original. One
// whose last film made it says so in the offer. Until November 22, 2026 no real gross was read.
import { candidates, dealTier, activeOverall, type DealTier } from './first-look';
import { JOB_ANSWER_DAYS, rolesOffered, type OutsideJob } from './jobs';
import { honoursIn, roleCraft, standingIn, standingWeight } from './reputation';
import { strategyOf } from './strategy';
import { addLog, currentPlace, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, DAY, formatDateKey, weekdayOfKey } from './time';
import { DGA_HIGH_BUDGET_WEEK, WGA_DRAFT_DAYS, WGA_SCREENPLAY } from './union';
import { money } from './budget';
import { PROFIT_MULTIPLE, worldwideAsOf } from './box-office-recorded';
import type { StudioProfile } from './studios';
import { COMPANIES } from '../catalog/registry';
import { pick, stream } from './rng';
import { WORDS_A, WORDS_B } from './studios';
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
export const countryOf = (company: string): string | undefined => {
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
/**
 * A multi-picture deal (the owner, November 18, 2026: "Build the multi-picture deals next"): a studio whose picture you
 * made comes back for its next two, three once you're Leading, each paid a step above the last. Game calibration: no
 * published schedule of deal sizes or steps was found; the counts follow the two- and three-picture deals the trade
 * reports, and the step is the game's.
 */
export const STUDIO_DEAL_PICTURES: Record<string, number> = { Established: 2, 'In Demand': 2, Leading: 3 };
export const STUDIO_DEAL_STEP = 0.15;
const PICTURES_WORD: Record<number, string> = { 2: 'two', 3: 'three' };
/** A franchise entry's subtitle, as sequels are titled ("Godzilla: Resurgence"). Invented by the game. */
const FRANCHISE_SUBTITLES = ['Resurgence', 'Reckoning', 'Dominion', 'Awakening', 'Legacy', 'Requiem', 'Uprising', 'Rebirth', 'Retribution', 'Ascension',
  'Aftermath', 'Revelation', 'Exodus', 'Eclipse', 'Inferno', 'Black Tide', 'Last Light', 'Fallout', 'Homecoming', 'First Strike', 'The Return',
  'Undertow', 'Firestorm', 'Nightfall', 'Shockwave', 'Wildfire', 'Stormfront', 'Deep Water', 'Zero Hour', 'Endgame'];
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
  const profiles = state.industry?.studios ?? [];
  const done = jobs.filter((j) => j.status === 'done').sort((a, b) => b.offeredAt - a.offeredAt)[0];
  const untouched = done && !jobs.some((j) => j.company === done.company && j.offeredAt > done.offeredAt);
  // A deal's next picture is owed once the last is made, whatever the gap or the grade: the studio holds you to it.
  const owed = untouched && done.studio!.deal && done.studio!.deal.picture < done.studio!.deal.of ? done : undefined;
  if (!owed && jobs.some((j) => state.now - j.offeredAt < STUDIO_PROJECT_GAP_DAYS * DAY)) return null;
  // Studios ask for the roles you've worked in, once your work in one has made you Established in it.
  const roles = owed ? [owed.role as 'directing' | 'writing'] : rolesOffered(state).filter((r): r is 'directing' | 'writing' => r !== 'acting' && studioReach(state, r) > 0);
  if (!roles.length) return null;
  // The role your record is strongest in, directing before writing on a tie.
  const role = roles.sort((a, b) => standingWeight(standingIn(state, b)) - standingWeight(standingIn(state, a)) || (a === 'directing' ? -1 : 1))[0];
  const reach = owed ? Infinity : studioReach(state, role);
  // The studio: the one whose deal has a picture owed; the one whose overall deal you're on; else one whose picture you
  // made, back for the next with a deal (continuity); else the one your work fits best among those that haven't asked in
  // two years (freshness), the best fit if all have.
  const overall = owed ? undefined : activeOverall(state);
  const back = untouched ? profiles.find((x) => strategyOf(x).name === done.company) : undefined;
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
  const day = dateKey(state.now, currentPlace(state).zone);
  const within = (studio?.fr ?? []).filter((f) => (f.budget ?? studio?.mb ?? 0) <= reach);
  // Not one whose last film is recorded as losing money; one whose result isn't recorded is taken as before.
  const viable = within.filter((f) => lastResult(f, day)?.profit !== false);
  const live = (sequel?.studio?.franchise ? within.find((f) => franchiseName(f.name) === sequel.studio!.franchise) : undefined)
    ?? viable.find((f) => !offered.has(franchiseName(f.name))) ?? viable[0];
  const franchise = live ? franchiseName(live.name) : undefined;
  const last = live ? lastResult(live, day) : null;
  // The picture's genres: the franchise's latest film's, where the build kept them; else the studio's own.
  const lastFilm = live?.films?.[live.films.length - 1];
  const genre = strategy.families[0]?.genre ?? 'Drama';
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
  const owedDeal = owed?.studio!.deal;
  // The DGA's and WGA's minimums bind American studios, which sign their agreements; a studio elsewhere pays its own way.
  // A studio the registry doesn't place (a test's fixture) is taken as American.
  const abroad = (countryOf(strategy.company) ?? 'US') !== 'US';
  const floor = abroad ? 0 : directing ? inForce(DGA_HIGH_BUDGET_WEEK, day) * DGA_GUARANTEE_WEEKS : inForce(WGA_SCREENPLAY, day);
  const range = Math.round((lo + (hi - lo) * at) / 1000) * 1000;
  const share = budget ? Math.min(range, Math.round(budget * STUDIO_FEE_SHARE / 1000) * 1000) : range;
  // Under a deal the fee is the deal's for that picture, agreed when it was signed.
  const fee = owedDeal ? owedDeal.fees[owedDeal.picture] : Math.max(floor, share);
  // What set the fee, for the offer to say: the guild's minimum, the budget's share, or (unsaid) the trade's range.
  const set = owedDeal ? undefined : fee === floor && floor > share ? 'guild' as const : share < range ? 'share' as const : undefined;
  // A studio back for more offers a deal: this picture and its next, or its next two once you're Leading, each a step up.
  const of = !owed && sequel ? STUDIO_DEAL_PICTURES[standingIn(state, role).grade] ?? 0 : 0;
  const deal = owedDeal ? { ...owedDeal, picture: owedDeal.picture + 1 }
    : of > 1 ? { picture: 1, of, fees: Array.from({ length: of }, (_, k) => Math.round((fee * (1 + STUDIO_DEAL_STEP) ** k) / 1000) * 1000) } : undefined;
  const weeks = (STUDIO_SHOOT_WEEKS.find(([from]) => (budget ?? 0) >= from) ?? [0, 8])[1];
  const days = weekdaysFrom(addDaysToKey(day, directing ? 56 : 14), directing ? weeks * 5 : WGA_DRAFT_DAYS);
  const place = currentPlace(state);
  const lastAsk = Math.max(0, ...jobs.filter((j) => j.company === strategy.name).map((j) => j.offeredAt));
  const why = owedDeal ? `Picture ${deal!.picture} of your ${PICTURES_WORD[deal!.of] ?? deal!.of}-picture deal with ${strategy.name}.`
    : sequel ? `You ${sequel.role === 'directing' ? 'directed' : 'wrote'} ${sequel.studio?.franchise ? `its last ${sequel.studio.franchise} film` : `${sequel.production} for it`}, and it wants you back.` : whyAsked(state, role, lastAsk);
  // The title it will be released under, the studio's own, invented as the world's films are (studios.ts): a franchise
  // entry carries the franchise's name. Said only once the work is done; the offer has the working title.
  const r = stream(state.seed, 'studio-title', day, strategy.company);
  const title = franchise ? `${franchise}: ${pick(r, FRANCHISE_SUBTITLES)}` : `${pick(r, ['The ', '', 'A '])}${pick(r, WORDS_A)} ${pick(r, WORDS_B)}`;
  return {
    id: `studio-${day}`, role,
    production: franchise ? `Untitled ${franchise} Film` : `Untitled ${strategy.name} ${genre} Picture`,
    company: strategy.name,
    part: directing ? 'Directing the picture' : 'Writing the screenplay',
    material: franchise ? `${live!.entries === 1 ? `The ${franchise} film` : `The ${franchise} films so far`}, and the studio's notes for the next one.` : `The studio's brief for ${/^[aeiou]/i.test(genre) ? 'an' : 'a'} ${genre.toLowerCase()} picture.`,
    requirement: directing ? `On set in ${place.name} each shooting day.` : `With the studio's producers in ${place.name}; the draft is due on the last day.`,
    dayRate: Math.round(fee / days.length), days, placeId: place.id, zone: place.zone,
    status: 'offered', offeredAt: state.now, answerBy: state.now + JOB_ANSWER_DAYS * DAY, attended: [], missed: [],
    studio: { fee, ...(franchise ? { franchise } : {}), genre, ...(budget ? { budget, budgetOf } : {}), ...(last?.profit ? { last: { title: last.title, gross: last.gross, known: last.known, source: last.source } } : {}), first, ...(set ? { set } : {}), ...(why ? { why } : {}), ...(deal ? { deal } : {}), title, genres: lastFilm?.g?.length ? lastFilm.g : [strategy.families[0]?.genre ?? 'Drama'] },
  };
}

/** How a studio says it: "Universal Pictures wants you to direct the next Fast and the Furious film: $X for eight weeks ...". */
export function studioPitch(j: OutsideJob): string {
  const what = j.studio?.franchise ? `the next ${j.studio.franchise} film` : `its next ${(j.studio?.genre ?? 'drama').toLowerCase()} picture`;
  const work = j.role === 'directing' ? `direct ${what}: ${money(j.studio!.fee)} for ${j.days.length / 5} weeks of shooting` : `write ${what}: ${money(j.studio!.fee)} for the screenplay, ${j.days.length} working days`;
  const deal = j.studio?.deal;
  // A deal's first picture is the deal's offer: the picture, then what follows and for how much.
  if (deal && deal.picture === 1) {
    const rest = deal.fees.slice(1).map((f) => money(f));
    const more = deal.of === 2 ? `then its next picture for ${rest[0]}` : `then its next ${PICTURES_WORD[deal.of - 1] ?? deal.of - 1} pictures for ${rest.slice(0, -1).join(', ')} and ${rest[rest.length - 1]}`;
    const first = j.role === 'directing' ? `${what} for ${money(j.studio!.fee)}, ${j.days.length / 5} weeks of shooting from ${formatDateKey(j.days[0])}` : `${what} for ${money(j.studio!.fee)}, ${j.days.length} working days from ${formatDateKey(j.days[0])}`;
    return `${j.company} offers you a ${PICTURES_WORD[deal.of] ?? deal.of}-picture deal to ${j.role === 'directing' ? 'direct' : 'write'}: ${first}, ${more}. Each picture comes a month after the one before is done; declining one ends the deal.${j.studio?.why ? ` ${j.studio.why}` : ''}`;
  }
  return `${j.company} wants you to ${work}, from ${formatDateKey(j.days[0])}.${j.studio?.why ? ` ${j.studio.why}` : ''}`;
}
/**
 * A franchise's last film, read by the twice-budget rule on `day`: its worldwide gross as recorded by then, against the
 * franchise's budget when that budget is the same film's. Null when either isn't recorded.
 */
export function lastResult(f: NonNullable<StudioProfile['fr']>[number], day: string): { title: string; gross: number; known: string; source: string | null; profit: boolean } | null {
  const film = f.films?.[f.films.length - 1];
  const tmdb = film && /^movie:(\d+)$/.exec(film.r)?.[1];
  if (!tmdb || !f.budget || f.budgetOf !== film.t) return null;
  const fig = worldwideAsOf(day, Number(tmdb));
  return fig ? { title: film.t, gross: fig.amount, known: fig.known, source: fig.source, profit: fig.amount >= f.budget * PROFIT_MULTIPLE } : null;
}

/** The picture's scale and where the fee comes from, for the offer's second line. */
export function studioScale(j: OutsideJob): string {
  const st = j.studio!;
  const result = st.last ? ` Its last film, ${st.last.title}, took ${money(st.last.gross)} worldwide${st.last.source ? `, as ${st.last.source} reported it` : ''} (recorded ${formatDateKey(st.last.known)}), at least twice what it cost, which as a rule of thumb means it made a profit.` : '';
  const budget = (st.budget ? `A picture of about ${money(st.budget)}${st.budgetOf ? `, as ${st.budgetOf.endsWith('budget') ? `${st.budgetOf} is` : `${st.budgetOf} cost`}` : ''}.` : 'Its budget isn\'t recorded.') + result;
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
