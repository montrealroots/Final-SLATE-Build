// Your studio pictures in the world (the owner, November 18, 2026: "Release my picture into the world with box office and
// awards. And my movie should have a page just like the other films and series also listing actors and etc."). A picture
// you directed or wrote for a studio (studio-projects.ts) was until then a job and a title: paid, credited, and never
// released. Now it is a film of the world's, like the studios' simulated films (studios.ts), and the same machinery
// carries it:
//   - its quality is set when the work is done (jobs.ts): your craft in the role (reputation.ts roleCraft), give or take
//     the luck of a picture (YOUR_FILM_SPREAD);
//   - it opens on its release date, and the news says so with its first week (the `your-film-release` event);
//   - its box office is drawn from its budget and its quality, week by week (yourBoxOffice), simulated and labelled so;
//   - it enters every award whose rules it meets beside the world's other films (awards-results.ts studioCandidates),
//     judged on its quality, and its selections, nominations and wins in your role are your honours (reputation.ts);
//   - once released, its reception counts as a work in your role (reputation.ts roleCraft);
//   - it has a page like the catalog's films (Catalog.tsx), with its cast and crew: you in your role, everyone else
//     invented, as the world's films' people are.
// You are paid your fee; the box office is the studio's, before any share of the profits, which aren't modelled.
import { noticeGrades } from './grade-news';
import type { OutsideJob } from './jobs';
import { roleCraft } from './reputation';
import { gaussian, intBetween, pick, stream } from './rng';
import { addLog, registerHandler } from './state';
import { FIRSTS, LASTS, type StudioFilm } from './studios';
import { addDaysToKey, dateKey } from './time';
import { money } from './budget';
import { ASIA_PACIFIC, EUROPE, LATIN_AMERICA } from './awards-rules';
import { countryOf } from './studio-projects';
import type { Category, Institution } from './awards';
import type { GameState } from './types';

/** How far a picture's quality can fall from your craft in the role: a standard deviation of 8 points. Game calibration. */
export const YOUR_FILM_SPREAD = 8;
/** Weeks a picture plays in cinemas, and each week's takings against the last: 14 weeks, falling by 45% a week. Game calibration. */
export const RUN_WEEKS = 14;
export const WEEKLY_HOLD = 0.55;
/**
 * Its worldwide gross against its budget, by quality: 0.3 times at 40 or less, rising 0.07 a point to 4 times, and a quarter
 * more for a franchise's following. Game calibration, in the range big studio pictures gross against their budgets.
 */
export const GROSS_FLOOR = 0.3;
export const GROSS_PER_POINT = 0.07;
export const GROSS_CEILING = 4;
export const FRANCHISE_LIFT = 1.25;

export const yourFilmId = (j: OutsideJob): string => `your-film:${j.id}`;
/** Your studio pictures with a title and a release date: made and waiting, or out. */
export const yourPictures = (state: GameState): OutsideJob[] => (state.jobs ?? []).filter((j) => j.status === 'done' && j.studio?.title && j.studio.released);
export const yourPicture = (state: GameState, id: string): OutsideJob | undefined => yourPictures(state).find((j) => yourFilmId(j) === id);
const today = (state: GameState): string => dateKey(state.now, 'UTC');
export const isOut = (state: GameState, j: OutsideJob): boolean => !!j.studio?.released && j.studio.released <= today(state);

/** Its quality, set once the work is done: your craft in the role, else the midpoint, with a picture's luck. */
export function pictureQuality(state: GameState, j: OutsideJob): number {
  const craft = roleCraft(state, j.role === 'writing' ? 'writing' : 'directing').craft ?? 55;
  return Math.round(Math.max(20, Math.min(97, gaussian(stream(state.seed, 'your-film', j.id), craft, YOUR_FILM_SPREAD))));
}

/** The people on it: you in your role; everyone else invented, as the world's films' people are (studios.ts). */
export function pictureCredits(state: GameState, j: OutsideJob): { cast: string[]; crew: { job: string; name: string }[] } {
  const r = stream(state.seed, 'your-film-people', j.id);
  const someone = () => `${pick(r, FIRSTS)} ${pick(r, LASTS)}`;
  const cast = Array.from({ length: 8 }, someone);
  const me = state.character.name;
  const crew = [
    { job: 'Director', name: j.role === 'directing' ? me : someone() },
    { job: 'Screenplay', name: j.role === 'writing' ? me : someone() },
    { job: 'Producer', name: someone() }, { job: 'Producer', name: someone() },
    { job: 'Director of Photography', name: someone() }, { job: 'Editor', name: someone() },
    { job: 'Original Music Composer', name: someone() }, { job: 'Production Design', name: someone() },
  ];
  return { cast, crew };
}

/** It as one of the world's films, for the awards' fields (awards-results.ts) and its page. */
export function asWorldFilm(state: GameState, j: OutsideJob): StudioFilm {
  const company = (state.industry?.studios ?? []).find((p) => p.name === j.company)?.c ?? j.company;
  const r = stream(state.seed, 'your-film-runtime', j.id);
  const { cast, crew } = pictureCredits(state, j);
  return {
    id: yourFilmId(j), company, title: j.studio!.title!, date: j.studio!.released!, genres: j.studio!.genres ?? [j.studio!.genre],
    runtimeMin: intBetween(r, 105, 140),
    people: { director: crew[0].name, writer: crew[1].name, lead: cast[0] },
  };
}

/** Your pictures released from `from` to `to`, as the world's films. */
export const yourWorldFilms = (state: GameState, from: string, to: string): StudioFilm[] =>
  yourPictures(state).filter((j) => j.studio!.quality !== undefined && j.studio!.released! >= from && j.studio!.released! <= to).map((j) => asWorldFilm(state, j));

/** Its worldwide gross, all told: its budget times the multiple its quality earns, a franchise's lifted. */
export function lifetimeGross(j: OutsideJob): number {
  const q = j.studio!.quality ?? 50;
  const multiple = Math.min(GROSS_CEILING, Math.max(GROSS_FLOOR, GROSS_FLOOR + GROSS_PER_POINT * (q - 40))) * (j.studio!.franchise ? FRANCHISE_LIFT : 1);
  return Math.round((j.studio!.budget ?? 30_000_000) * multiple);
}

/** Its run, week by week: each week's gross and the day it ends; weeks not yet ended are left out. Simulated. */
function weekly(j: OutsideJob): { ends: string; gross: number }[] {
  const weights = Array.from({ length: RUN_WEEKS }, (_, i) => WEEKLY_HOLD ** i);
  const sum = weights.reduce((a, b) => a + b, 0);
  const life = lifetimeGross(j);
  return weights.map((w, i) => ({ ends: addDaysToKey(j.studio!.released!, 7 * (i + 1) - 1), gross: Math.round((life * w) / sum) }));
}
export function yourBoxOffice(state: GameState, j: OutsideJob): { weeks: { ends: string; gross: number }[]; total: number; lifetime: number; running: boolean } {
  const all = weekly(j);
  const weeks = all.filter((w) => w.ends <= today(state));
  return { weeks, total: weeks.reduce((a, w) => a + w.gross, 0), lifetime: all.reduce((a, w) => a + w.gross, 0), running: weeks.length < RUN_WEEKS };
}

/** The opening: it's out, the news says so with its first week, and its reception may move a grade. */
registerHandler('your-film-release', (state, ev) => {
  const j = yourPictures(state).find((x) => x.id === ev.payload.jobId);
  if (!j) return { suppressInterrupt: true };
  const first = weekly(j)[0].gross;
  const text = `${j.studio!.title}, which you ${j.role === 'directing' ? 'directed' : 'wrote'} for ${j.company}, opens today. The studio expects ${money(first)} in its first week (simulated).`;
  addLog(state, text, 'personal', { route: { view: 'title', ref: yourFilmId(j) } });
  noticeGrades(state, `the reception of ${j.studio!.title}`);
  return { message: text };
});

const ENGLISH = ['US', 'GB', 'AU', 'CA', 'IE', 'NZ'];
const COMEDY = ['Comedy', 'Music', 'Musical'];
const FANTASY = ['Science Fiction', 'Fantasy'];

/**
 * Whether a category's rules let your studio picture in, where the rules a project is held to (awards-rules.ts) can be read
 * off it: its studio's country, its language by that country, its genres, its length and budget, a franchise sequel's
 * screenplay counted as adapted (as the Academy counts sequels), and you having made features before. It opens in
 * cinemas, so it premieres at no festival and is in none of their sections or prizes; a rule it can't be shown to meet
 * (a children's film, a co-production, a series' first season) leaves it out. Until November 18, 2026 it was judged as
 * the world's simulated films are, by format and genre alone, and was selected for Cannes after it opened.
 */
export function pictureEligible(state: GameState, j: OutsideJob, inst: Institution, cat: Category, runtimeMin: number): boolean {
  if (inst.kind === 'festival' || cat.kind === 'section' || cat.parents?.length || cat.premiere === 'world' || cat.premiere === 'international') return false;
  const genres = j.studio!.genres ?? [j.studio!.genre];
  const company = (state.industry?.studios ?? []).find((p) => p.name === j.company)?.c ?? '';
  const o = countryOf(company) ?? 'US';
  const adapted = !!j.studio!.franchise;
  if (cat.material && (cat.material === 'adapted') !== adapted) return false;
  if (cat.class && (cat.class === 'comedy') !== genres.some((g) => COMEDY.includes(g))) return false;
  const byCountry: Record<string, string> = { fr: 'FR', es: 'ES', ca: 'CA', au: 'AU', jp: 'JP', nl: 'NL' };
  for (const n of cat.need ?? []) {
    switch (n) {
      // Never a debut: a studio offers its picture only to a record Established in the role (studio-projects.ts).
      case 'debut': case 'writer-debut': return false;
      case 'over-60': if (runtimeMin <= 60) return false; break;
      case 'over-70': if (runtimeMin <= 70) return false; break;
      case 'under-60': case 'max-20': case 'half': case 'hour': return false;
      case 'under-1m': if ((j.studio!.budget ?? Infinity) >= 1_000_000) return false; break;
      case 'indie': case 'independent': return false;
      case 'box-office': case 'la-ny-theatrical': case 'mature': case 'breakthrough': break;
      case 'non-english': if (ENGLISH.includes(o)) return false; break;
      case 'fantasy': if (!genres.some((g) => FANTASY.includes(g))) return false; break;
      case 'contemporary': if (genres.some((g) => FANTASY.includes(g))) return false; break;
      case 'us': if (o !== 'US') return false; break;
      case 'non-us': if (o === 'US') return false; break;
      case 'europe': if (!EUROPE.includes(o)) return false; break;
      case 'europe-non-es': if (!EUROPE.includes(o) || o === 'ES') return false; break;
      case 'iberoamerica-non-es': if (!LATIN_AMERICA.includes(o) && o !== 'PT') return false; break;
      case 'latin-america': if (!LATIN_AMERICA.includes(o)) return false; break;
      case 'asia-pacific': if (!ASIA_PACIFIC.includes(o)) return false; break;
      default:
        if (byCountry[n]) { if (o !== byCountry[n]) return false; break; }
        if (n.startsWith('non-')) { if (o === n.slice(4).toUpperCase()) return false; break; }
        return false;
    }
  }
  // A song award needs an original song, and a country's submission (the national category) a country's choosing: neither is recorded.
  if (cat.recipient === 'song' || cat.recipient === 'national') return false;
  return true;
}
