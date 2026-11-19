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
//     invented, as the world's films' people are; from November 19, 2026 its cast are real actors (castPicture).
// You are paid your fee; the box office is the studio's, before any share of the profits, which aren't modelled.
import { noticeGrades } from './grade-news';
import type { OutsideJob } from './jobs';
import { fameOf, filmFeeFrom, genderOf, performerFee, recognisedIn, recognitionData } from './recognition';
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

/** One of a picture's cast: a real actor (`tmdbId`, from the industry's record of awards) or an invented one, and the part they play. */
export interface PictureCastMember { name: string; tmdbId?: number; character?: string; gender?: 'woman' | 'man' }
/** One of its crew: you, a real person the awards record recognised in the job (`tmdbId`), or someone invented. */
export interface PictureCrewMember { job: string; department: string; name: string; tmdbId?: number; you?: true }
/** A picture's lead takes up to this share of its budget, and each of the others up to the second. Game calibration. */
export const LEAD_SHARE = 0.15;
export const SUPPORTING_SHARE = 0.03;
/** Each head of department's fee, at most this share of the budget. Game calibration. */
export const CREW_SHARE = 0.02;
/** The budget a picture is cast for when the studio named none. Game calibration. */
export const UNSTATED_BUDGET = 40_000_000;
/** Of the people a part's money reaches, the best-paid this many are the ones the studio asks. Game calibration. */
export const ASKED = 40;

/** The parts' first names, by the gender of who plays them, and for a part anyone could play. Invented by the game. */
export const WOMEN_FIRSTS = ['Amara', 'Clara', 'Hanna', 'Ines', 'Joy', 'Lena', 'Mara', 'Nadia', 'Nora', 'Rosa', 'Sade', 'Tess', 'Vera', 'Yara', 'Zoe', 'Elise', 'Grace', 'Ruth', 'Leila', 'Mina'];
export const MEN_FIRSTS = ['Abel', 'Caleb', 'Daniel', 'Elias', 'Felix', 'Hugo', 'Isaac', 'Jonah', 'Kofi', 'Leon', 'Marco', 'Noah', 'Omar', 'Paul', 'Samuel', 'Tomas', 'Victor', 'Walter', 'Malik', 'Teo'];
export const ANY_FIRSTS = ['Alex', 'Ari', 'Jordan', 'Kai', 'Noor', 'Robin', 'Sam', 'Quinn'];

/** The heads of department a studio picture credits, with the awards record's job for each, as TMDB sorts them. */
export const PICTURE_CREW: { job: string; department: string; recognised?: string }[] = [
  { job: 'Director', department: 'Directing', recognised: 'episode-director' },
  { job: 'Screenplay', department: 'Writing', recognised: 'co-writer' },
  { job: 'Producer', department: 'Production' }, { job: 'Producer', department: 'Production' },
  { job: 'Casting', department: 'Production', recognised: 'casting-director' },
  { job: 'Director of Photography', department: 'Camera', recognised: 'dop' },
  { job: 'Editor', department: 'Editing', recognised: 'editor' },
  { job: 'Original Music Composer', department: 'Sound', recognised: 'composer' },
  { job: 'Supervising Sound Editor', department: 'Sound', recognised: 'sound-designer' },
  { job: 'Production Design', department: 'Art', recognised: 'production-designer' },
  { job: 'Costume Design', department: 'Costume & Make-Up', recognised: 'costume-designer' },
  { job: 'Makeup Artist', department: 'Costume & Make-Up', recognised: 'hair-makeup' },
  { job: 'Visual Effects Supervisor', department: 'Visual Effects', recognised: 'vfx-artist' },
];

/**
 * Its cast and crew, chosen once from real people (from November 19, 2026, the owner: "now do one with real cast", then
 * "the crew should be real too. Except for director because that'll be me ... if there's a writer part that's me too").
 * Until then everyone on a picture but you was invented.
 *   - The cast: actors the awards record has recognised before the year it comes out, alive and grown by then, whose
 *     asking fee (recognition.ts performerFee) its budget can pay, the lead from up to LEAD_SHARE of it and the other
 *     seven from up to SUPPORTING_SHARE; a part none will take for that goes to an unknown, invented. Each part is named
 *     by the game, a woman's or a man's name by the actor's gender as the record states it (genderOf). Parts went unnamed
 *     for a few hours the same day, when gender wasn't read: a name drawn blind read wrong beside the actor playing it.
 *   - The crew: you direct and write it. Each other head of department is someone recognised in the job before then,
 *     whose fee (filmFeeFrom) fits CREW_SHARE of the budget; the producers, whom the record doesn't cover, are invented.
 * Kept in the save, so it stays whoever was hired; with the record not loaded nothing is chosen yet, and the page shows
 * the invented credits a picture had before (pictureCredits).
 */
export function castPicture(state: GameState, j: OutsideJob, data = recognitionData()): void {
  const st = j.studio;
  if (!st?.released || (st.cast && st.crew) || !data) return;
  const year = Number(st.released.slice(0, 4));
  const budget = st.budget ?? UNSTATED_BUDGET;
  const ok = (tmdbId: number) => { const [, born, died] = data.people[String(tmdbId)]; return (!died || died > st.released!) && (!born || Number(born.slice(0, 4)) <= year - 18); };
  const taken = new Set<number>();
  const asker = (r: () => number, pool: { tmdbId: number; name: string; fee: number }[]) => (cap: number) => {
    const open = pool.filter((a) => a.fee <= cap && !taken.has(a.tmdbId)).sort((a, b) => b.fee - a.fee || a.tmdbId - b.tmdbId).slice(0, ASKED);
    const a = open.length ? pick(r, open) : undefined;
    if (a) taken.add(a.tmdbId);
    return a;
  };
  const r = stream(state.seed, 'your-film-cast', j.id);
  if (!st.cast) {
    const ask = asker(r, recognisedIn('actor', year, data).filter((a) => ok(a.tmdbId)).map((a) => ({ ...a, fee: performerFee(a.standing.points, fameOf(a.tmdbId)) })));
    st.cast = Array.from({ length: 8 }, (_, i) => {
      const a = ask(budget * (i === 0 ? LEAD_SHARE : SUPPORTING_SHARE));
      if (a) return { name: a.name, tmdbId: a.tmdbId };
      const gender = pick(r, ['woman', 'man'] as const);
      return { name: `${pick(r, gender === 'woman' ? WOMEN_FIRSTS : MEN_FIRSTS)} ${pick(r, LASTS)}`, gender };
    });
  }
  // A cast chosen before parts were named (earlier on November 19, 2026) keeps its actors and is given its parts.
  for (const m of st.cast) {
    if (m.tmdbId) taken.add(m.tmdbId);
    if (m.character) continue;
    const gender = m.gender ?? (m.tmdbId ? genderOf(m.tmdbId, data) : undefined);
    if (gender) m.gender = gender;
    m.character = `${pick(r, gender === 'woman' ? WOMEN_FIRSTS : gender === 'man' ? MEN_FIRSTS : ANY_FIRSTS)} ${pick(r, LASTS)}`;
  }
  const rc = stream(state.seed, 'your-film-crew', j.id);
  const me = state.character.name;
  st.crew = PICTURE_CREW.map(({ job, department, recognised }) => {
    if (job === 'Director' || job === 'Screenplay') return { job, department, name: me, you: true as const };
    const a = recognised ? asker(rc, recognisedIn(recognised, year, data).filter((x) => ok(x.tmdbId)).map((x) => ({ ...x, fee: filmFeeFrom(x.standing.points) })))(budget * CREW_SHARE) : undefined;
    return a ? { job, department, name: a.name, tmdbId: a.tmdbId } : { job, department, name: `${pick(rc, [...WOMEN_FIRSTS, ...MEN_FIRSTS])} ${pick(rc, LASTS)}` };
  });
}

/** The people on it: its cast and crew as chosen (castPicture), else as invented before November 19, 2026, you in your role. */
export function pictureCredits(state: GameState, j: OutsideJob): { cast: PictureCastMember[]; crew: PictureCrewMember[] } {
  const r = stream(state.seed, 'your-film-people', j.id);
  const someone = () => `${pick(r, FIRSTS)} ${pick(r, LASTS)}`;
  // Drawn even when the cast is chosen, so an older save's invented crew keep the names they had.
  const invented = Array.from({ length: 8 }, someone);
  const cast = j.studio?.cast ?? invented.map((name) => ({ name }));
  if (j.studio?.crew) return { cast, crew: j.studio.crew };
  const me = state.character.name;
  const crew: PictureCrewMember[] = [
    { job: 'Director', department: 'Directing', name: j.role === 'directing' ? me : someone() },
    { job: 'Screenplay', department: 'Writing', name: j.role === 'writing' ? me : someone() },
    { job: 'Producer', department: 'Production', name: someone() }, { job: 'Producer', department: 'Production', name: someone() },
    { job: 'Director of Photography', department: 'Camera', name: someone() }, { job: 'Editor', department: 'Editing', name: someone() },
    { job: 'Original Music Composer', department: 'Sound', name: someone() }, { job: 'Production Design', department: 'Art', name: someone() },
  ].map((c) => (c.name === me ? { ...c, you: true as const } : c));
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
    people: { director: crew[0].name, writer: crew[1].name, lead: cast[0].name },
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
