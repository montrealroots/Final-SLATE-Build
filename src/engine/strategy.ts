// How a followed studio reads a pitch (the Creative Depth package, milestone F, 04-WORLD-STUDIOS-AND-MEDIA.md "Distinct
// studio behavior"). Until November 11, 2026 a studio was picked for an offer by its films a year alone
// (studios.ts careerStudio), so the busiest studio wanted everything and nothing about a project changed who asked.
//
// A studio's strategy is derived from the pace the save froze when its world began (IndustryState.studios), never from
// a later catalog: what it has released by genre, how much of it is animation or documentary, which months it opens
// films in, and how many films a year it carries. Nothing reads TMDB's ratings, popularity, budgets or box office. What
// the strategy can't know from that record is modeled and says so: how far it releases a film, and how much room its
// slate has in a year. A thin record is said to be thin; it is never read as no interest.
//
// The read of a pitch has no dice in it. The same project put to the same studio gets the same answer and the same
// reasons, and two studios with different records give different ones. Every figure is game calibration
// (docs/ASSUMPTIONS.md, "How A Studio Reads A Pitch").
import { studioYear, type StudioProfile } from './studios';
import type { Format, Medium } from './types';

export const STRATEGY_VERSION = 1;
/** Below this many films a year the genre shares stand on too few films to rule anything out. */
export const THIN_RECORD = 2;
/** A studio can carry half as many films again as its recorded pace, rounded up, and never fewer than two: the room a pitch can take. */
export const SLATE_HEADROOM = 1.5;
export const SLATE_FLOOR = 2;
/**
 * Shares are of genre credits, and a film carries about three genres, so a studio whose every film is animated shows
 * Animation at about a third. Under the lower share a studio makes almost no animation; at the upper one or over, with
 * Animation its largest genre, it is an animation house.
 */
export const ANIMATION_LITTLE = 0.05;
export const ANIMATION_HOUSE = 0.25;

export interface StudioStrategy {
  v: typeof STRATEGY_VERSION;
  company: string;
  name: string;
  /** Films a year, as recorded, and the slate it can carry. */
  pace: number;
  capacity: number;
  /** Its recorded films' genres as shares of its films, largest first (TMDB's genre names). */
  families: { genre: string; share: number }[];
  animation: number;
  documentary: number;
  /** The month it most often opens a film in (0 is January), or null where none is recorded. */
  window: number | null;
  record: 'full' | 'thin';
  /** How far it releases a film. Modeled from its pace; no source says where a studio releases. */
  reach: 'home' | 'home-and-majors' | 'worldwide';
}

/** The strategy a save's frozen profile gives. Pure: the same profile always gives the same strategy. */
export function strategyOf(p: StudioProfile): StudioStrategy {
  const total = p.g.reduce((a, [, n]) => a + n, 0);
  // A film can carry several genres, so shares are of genre credits and can't be read as "x% of its films are only this".
  const families = p.g.map(([genre, n]) => ({ genre, share: total ? n / total : 0 })).sort((a, b) => b.share - a.share || a.genre.localeCompare(b.genre));
  const share = (g: string) => families.find((f) => f.genre === g)?.share ?? 0;
  const best = Math.max(...p.m, 0);
  return {
    v: STRATEGY_VERSION, company: p.c, name: p.name ?? p.c.replace(/^company:/, ''), pace: p.n, capacity: Math.max(SLATE_FLOOR, Math.ceil(p.n * SLATE_HEADROOM)),
    families, animation: share('Animation'), documentary: share('Documentary'),
    // A month it opens films in more than any other. Where every month is alike it has no window, and none is made up.
    window: best > 0 && p.m.filter((x) => x === best).length === 1 ? p.m.indexOf(best) : null,
    record: p.n < THIN_RECORD || total < 6 ? 'thin' : 'full',
    reach: p.n >= 8 ? 'worldwide' : p.n >= 3 ? 'home-and-majors' : 'home',
  };
}

/**
 * The room a studio's slate has in a year: what it can carry, less the films it has dated or will release that year in
 * this save's world, less the player's films it already backs for that year. Never below zero.
 */
export function slateRoom(seed: number, horizon: string, p: StudioProfile, year: number, held = 0): { capacity: number; taken: number; room: number } {
  const capacity = strategyOf(p).capacity;
  const taken = (p.ann[String(year)] ?? 0) + studioYear(seed, horizon, p, year).length + held;
  return { capacity, taken, room: Math.max(0, capacity - taken) };
}

/**
 * How near a studio's record is to work of these families in this medium, for choosing which studio makes an offer
 * (studios.ts careerStudio): the share of its genre credits in those families, and nothing where its medium rules the
 * work out. Among studios releasing two or more films a year, size counts for nothing.
 *
 * A thin record counts a little for anything (THIN_FIT), never its own shares, and less the more rarely the studio
 * releases. Measured over a hundred worlds on November 11, 2026 (tests/offer-concentration.test.ts): read by its
 * shares, a label with two drama credits scored a perfect fit for every drama and made 36% of all offers, more than
 * any studio with a real record.
 */
export const THIN_FIT = 0.15;
/** The least a studio with a full record counts for a documentary, however few are credited to it. */
export const DOCUMENTARY_FLOOR = 0.05;
export function fitWeight(p: StudioProfile, families: string[], medium: Medium): number {
  const s = strategyOf(p);
  const animated = medium === 'animation';
  if (animated && s.record === 'full' && s.animation < ANIMATION_LITTLE) return 0;
  if (!animated && s.animation >= ANIMATION_HOUSE && s.families[0]?.genre === 'Animation') return 0;
  const names = [...new Set(families.flatMap((f) => FAMILY_AS_RECORDED[f] ?? []))];
  const share = s.families.filter((f) => names.includes(f.genre)).reduce((a, f) => a + f.share, 0);
  if (s.record === 'thin') return THIN_FIT * Math.min(1, p.n / THIN_RECORD);
  // Few documentaries are credited to any studio, which isn't the same as no interest (pitchRead says the same).
  return families.includes('documentary') ? Math.max(share, DOCUMENTARY_FLOOR) : share;
}

/** SLATE's genre families (genres.ts GenreRecord.parent, lowercased with hyphens) as TMDB's genre names. */
export const FAMILY_AS_RECORDED: Record<string, string[]> = {
  action: ['Action'], adventure: ['Adventure'], animation: ['Animation'], comedy: ['Comedy'], crime: ['Crime'], documentary: ['Documentary'],
  drama: ['Drama', 'History'], family: ['Family'], fantasy: ['Fantasy'], horror: ['Horror'], musical: ['Music'], romance: ['Romance'],
  'science-fiction': ['Science Fiction'], suspense: ['Mystery'], thriller: ['Thriller'], war: ['War'], western: ['Western'],
};
export const familyKey = (parent: string): string => parent.trim().toLowerCase().replace(/[^a-z]+/g, '-');

export interface PitchInput {
  title: string;
  format: Format;
  formatLabel: string;
  medium: Medium;
  /** The project's genre families (familyKey of each chosen genre's parent), primary first. */
  families: string[];
  /** The script's modeled read, 20 to 90 (finance.ts scriptScore). */
  script: number;
  /** Delivered work: how many, how received on average, awards won. */
  works: number;
  reception: number | null;
  wins: number;
  /** Films of yours this studio backed that you delivered, and ones you didn't deliver in time. */
  deliveredForThem: number;
  brokenWithThem: number;
  year: number;
  room: { capacity: number; taken: number; room: number };
  /** Another followed studio whose record fits the medium better, for a pass that names a route. */
  betterFit?: string;
}

export type PitchVerdict = 'pass' | 'notes' | 'option' | 'offer';
export interface PitchRead {
  verdict: PitchVerdict;
  /** 0 to 100, shown to nobody as a number: the page says the reasons. */
  score: number;
  /** What counted for the pitch and against it, in the order they were weighed. */
  for: string[];
  against: string[];
  /** For notes: what would change the answer. For a pass on fit: where else to take it. */
  next: string;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const FILM_FORMATS: ReadonlySet<Format> = new Set<Format>(['feature', 'documentary-feature']);
/** At or above this the studio wants it; a first film gets an option, a proven filmmaker an offer. */
export const WANT = 60;
/** From here to WANT the studio gives notes and will read a new draft. */
export const NOTES = 40;

/** A studio's read of a pitch: a verdict with its reasons. No chance is involved. */
export function pitchRead(s: StudioStrategy, x: PitchInput): PitchRead {
  const pros: string[] = [];
  const cons: string[] = [];
  const pass = (why: string, next: string): PitchRead => ({ verdict: 'pass', score: 0, for: pros, against: [why, ...cons], next });

  // 1. The kind of work. Its record here is feature films.
  if (!FILM_FORMATS.has(x.format)) {
    return pass(`${s.name}'s record here is feature films. A ${x.formatLabel.toLowerCase()} isn't something it takes on.`,
      'A commissioner, a festival run or releasing it yourself is the route for this one.');
  }
  // 2. The medium. An animation house and a studio that makes almost none each say so, and name a better fit if there is one.
  const animated = x.medium === 'animation';
  if (animated && s.record === 'full' && s.animation < ANIMATION_LITTLE) {
    return pass(`${s.name} has released almost no animation (${pct(s.animation)} of its genre credits).`, x.betterFit ? `${x.betterFit}'s record is the nearer fit for an animated film.` : 'A studio whose record is animation is the fit for this one.');
  }
  if (!animated && s.animation >= ANIMATION_HOUSE && s.families[0]?.genre === 'Animation') {
    return pass(`${s.name} is an animation studio: Animation is the largest part of its record, ${pct(s.animation)} of its genre credits. A ${x.medium === 'hybrid' ? 'hybrid' : 'live-action'} film isn't what it makes.`,
      x.betterFit ? `${x.betterFit}'s record is the nearer fit for it.` : 'A studio whose record is live action is the fit for this one.');
  }
  // 3. Room on the slate for the year it would come out.
  if (x.room.room <= 0) {
    return pass(`Its slate for ${x.year} is full: it carries about ${x.room.capacity} ${x.room.capacity === 1 ? 'film' : 'films'} a year, and ${x.room.taken} ${x.room.taken === 1 ? 'is' : 'are'} dated or in work.`,
      `Its slate for ${x.year + 1} may have room: ask again with a draft approved then.`);
  }
  pros.push(`Its slate for ${x.year} has room for ${x.room.room} more.`);

  // 4. What it makes: the project's families against its record.
  const names = [...new Set(x.families.flatMap((f) => FAMILY_AS_RECORDED[f] ?? []))];
  const matched = s.families.filter((f) => names.includes(f.genre));
  let share = matched.reduce((a, f) => a + f.share, 0);
  if (s.record === 'thin') {
    share = Math.max(share, 0.15);
    pros.push('Its record is too thin to say what it won\'t make, so the genre counts neither for nor against.');
  } else if (matched.length) {
    pros.push(`It makes this kind of film: ${matched.slice(0, 3).map((f) => `${f.genre} is ${pct(f.share)} of its genre credits`).join(', ')}.`);
  } else if (x.families.includes('documentary')) {
    share = 0.1; // few documentaries credited isn't the same as no interest
    pros.push('Few documentaries are credited to it, which isn\'t the same as no interest.');
  } else {
    cons.push(`Nothing like it is in its record: its films are mostly ${s.families.slice(0, 3).map((f) => f.genre).join(', ') || 'unrecorded'}.`);
  }
  const fit = 40 * Math.min(1, share / 0.3);
  // 5. The medium, where it didn't rule the pitch out.
  const medium = animated ? (s.animation >= 0.15 ? 15 : 5) : s.animation < ANIMATION_HOUSE ? 15 : 5;
  if (animated && s.animation >= 0.15) pros.push(`Animation is ${pct(s.animation)} of its genre credits.`);
  // 6. The script, as backers read it (open notes on it lower it).
  const script = Math.round(((x.script - 20) / 70) * 20);
  if (x.script < 70) cons.push('The script has open notes on it.');
  // 7. What you have delivered, how it was received, and what it won.
  let record = x.works === 0 ? 0 : x.works === 1 ? 8 : 12;
  if (x.reception !== null) record += Math.max(-8, Math.min(8, Math.round((x.reception - 55) / 4)));
  record += Math.min(10, x.wins * 5);
  if (x.works === 0) cons.push('You haven\'t delivered a film yet.');
  else if (x.reception !== null && x.reception >= 65) pros.push('Your delivered work was well received.');
  else if (x.reception !== null && x.reception < 50) cons.push('Your delivered work was coolly received.');
  if (x.wins) pros.push(`Your work has won ${x.wins === 1 ? 'an award' : `${x.wins} awards`}.`);
  // 8. Your history with this studio.
  const history = Math.min(10, x.deliveredForThem * 8) - x.brokenWithThem * 15;
  if (x.deliveredForThem) pros.push(`You delivered ${x.deliveredForThem === 1 ? 'a film' : `${x.deliveredForThem} films`} it backed.`);
  if (x.brokenWithThem) cons.push('A film it backed wasn\'t delivered in time.');

  const score = Math.max(0, Math.min(100, Math.round(fit + medium + script + record + history)));
  if (score >= WANT) {
    return x.works === 0
      ? { verdict: 'option', score, for: pros, against: cons, next: 'A first film gets development money and a release, not the whole budget: raise the rest elsewhere.' }
      : { verdict: 'offer', score, for: pros, against: cons, next: '' };
  }
  if (score >= NOTES) {
    const next = fit < 20 ? 'It would read a film nearer to what it makes.' : x.script < 70 ? 'It would read a new approved draft with the open notes dealt with.' : x.works === 0 ? 'It would read this again once you have delivered a film.' : 'It would read a new approved draft.';
    return { verdict: 'notes', score, for: pros, against: cons, next };
  }
  return { verdict: 'pass', score, for: pros, against: cons.length ? cons : ['It didn\'t see this as one of its films.'], next: 'Another studio, or another backer, is the route for this one.' };
}

/** Where a studio releases a film it backs, home first: modeled from its reach. */
export const MAJOR_MARKETS = ['US', 'GB', 'FR', 'DE', 'ES', 'IT', 'JP', 'BR', 'CA', 'AU', 'KR', 'MX', 'IN'];
export function reachTerritories(s: StudioStrategy, home: string): string[] {
  const others = MAJOR_MARKETS.filter((c) => c !== home);
  return s.reach === 'worldwide' ? [home, ...others] : s.reach === 'home-and-majors' ? [home, ...others.slice(0, 4)] : [home];
}

/** A studio's strategy in words, for its panel on the Budget page and the Companies page. */
export function strategyWords(s: StudioStrategy): string[] {
  const out = [
    `About ${s.pace < 1 ? 'one film every few years' : `${Math.round(s.pace)} ${Math.round(s.pace) === 1 ? 'film' : 'films'} a year`}, as recorded when your story's world began; it can carry about ${s.capacity}.`,
    s.families.length ? `Mostly ${s.families.slice(0, 4).map((f) => `${f.genre} (${pct(f.share)})`).join(', ')}, by genre credits.` : 'No genres are recorded for it.',
  ];
  if (s.record === 'thin') out.push('Its record is thin: too few films to say what it won\'t make.');
  if (s.window !== null) out.push(`It most often opens a film in ${MONTHS[s.window]}.`);
  out.push(`Modeled, not recorded: it releases a film ${s.reach === 'worldwide' ? 'in your home country and twelve large markets' : s.reach === 'home-and-majors' ? 'in your home country and four large markets' : 'in your home country only'}.`);
  return out;
}
export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
