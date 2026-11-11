// Studios keep releasing (docs/WORLD.md, "Studios Keep Releasing", November 11, 2026). After the records end, each
// studio the catalog follows goes on releasing films at its recorded pace, in its recorded genres and months, with invented
// titles and invented people. A film the records already date (an announced release) plays as recorded, and counts
// toward its year: the simulated films fill only what the studio's pace leaves. Nothing reads TMDB's ratings, budgets or
// box office.
//
// The pace is taken once, when the save's world starts, and kept in the save (`IndustryState.studios`), so a later
// catalog never changes films this save has already seen. The films themselves follow from the save's seed and that
// snapshot, so they are the same on every reload and are not stored.
import { gaussian, intBetween, pick, stream } from './rng';
import { addDaysToKey } from './time';
import type { GameState } from './types';

/** A studio's recorded pace (tools/screen-catalog/build.mjs): films a year, genres by count, release months by count. */
export interface StudioProfile {
  /** Registry company ID, and its name (the build's, so the engine needn't load the registry). */
  c: string;
  name?: string;
  /** Films a year over the five years before the records end. */
  n: number;
  g: [string, number][];
  m: number[];
  /** Films already dated in each year from the records' end on. */
  ann: Record<string, number>;
  /** The studio's latest dated film. */
  last?: string;
}

/** A film the save's world released: invented, labelled simulated wherever it appears. */
export interface StudioFilm {
  /** `sim-film:<company>:<year>:<n>`. */
  id: string;
  company: string;
  title: string;
  date: string;
  genres: string[];
  runtimeMin: number;
  people: { director: string; writer: string; lead: string };
}

const WORDS_A = ['Quiet', 'Salt', 'Paper', 'Northern', 'Last', 'Glass', 'Hollow', 'Bright', 'Small', 'Burning', 'Silent', 'Iron', 'Little', 'Distant', 'Golden', 'Low', 'Wild', 'Late', 'Blue', 'Second', 'Hidden', 'Starlit', 'Winter', 'Lost', 'Crimson', 'Endless', 'Brave', 'Secret', 'Midnight', 'Forgotten'];
const WORDS_B = ['Harbor', 'Summer', 'Orchard', 'Signal', 'River', 'Kingdom', 'Witness', 'Houses', 'Tide', 'Season', 'Weather', 'Mountain', 'Archive', 'Garden', 'Crossing', 'Lights', 'Hours', 'Field', 'Animals', 'Room', 'Voyage', 'Machine', 'Frontier', 'Promise', 'Comet', 'Lantern', 'Forest', 'Island', 'Engine', 'Legend'];
const FIRSTS = ['Iris', 'Teo', 'Marisol', 'Kwame', 'Ana', 'Lars', 'Mina', 'Rafi', 'Odile', 'Sung-min', 'Leila', 'Joaquín', 'Ngozi', 'Yuki', 'Farid', 'Elsa', 'Dara', 'Ines', 'Malik', 'Priya'];
const LASTS = ['Varga', 'Mbeki', 'Holt', 'Ruiz', 'Okoro', 'Aalto', 'Brandt', 'Sato', 'Navarro', 'Achterberg', 'Kader', 'Lindqvist', 'Moreau', 'Osei', 'Petrova', 'Tanaka', 'Quist', 'Delacroix', 'Haddad', 'Ferreira'];

/** A count drawn around a mean, never negative: films in a year at the studio's pace. */
function countAround(r: () => number, mean: number): number {
  if (mean <= 0) return 0;
  // Poisson by inversion; the paces here are small (under 10 a year).
  const l = Math.exp(-mean);
  let k = 0;
  let p = 1;
  do { k += 1; p *= r(); } while (p > l && k < 60);
  return k - 1;
}

function weighted<T>(r: () => number, items: [T, number][]): T {
  const total = items.reduce((a, [, w]) => a + w, 0);
  let x = r() * total;
  for (const [v, w] of items) { x -= w; if (x < 0) return v; }
  return items[items.length - 1][0];
}

/** The pace kept in the save, once: from the world file when the save's world starts (industry.ts ensureIndustry). */
export function snapshotStudios(profiles: StudioProfile[] | undefined): StudioProfile[] {
  return (profiles ?? []).map((p) => ({ c: p.c, ...(p.name ? { name: p.name } : {}), n: p.n, g: p.g.map(([g, w]) => [g, w] as [string, number]), m: [...p.m], ann: { ...p.ann }, ...(p.last ? { last: p.last } : {}) }));
}

const cache = new Map<string, StudioFilm[]>();

/** One studio's simulated films in one year, after the records end. The same for a seed, a snapshot and a year. */
export function studioYear(seed: number, horizon: string, p: StudioProfile, year: number): StudioFilm[] {
  // Keyed on the whole profile: a save's snapshot, not the company alone, decides its films.
  const key = `${seed}|${horizon}|${year}|${JSON.stringify(p)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const out: StudioFilm[] = [];
  const startYear = Number(horizon.slice(0, 4));
  if (year >= startYear && p.n > 0 && p.m.some((x) => x > 0)) {
    const r = stream(seed, 'studio-films', p.c, year);
    // The year's films at the studio's pace, less the ones the records already date. In the records' last year, only the
    // part of the year after they end is simulated.
    const share = year === startYear ? Math.max(0, (Date.parse(`${year}-12-31`) - Date.parse(horizon)) / (365 * 86_400_000)) : 1;
    const n = Math.max(0, countAround(r, p.n * share) - (p.ann[String(year)] ?? 0));
    const months = p.m.map((w, i) => [i, w] as [number, number]).filter(([, w]) => w > 0);
    for (let i = 0; i < n; i++) {
      let date = '';
      for (let tries = 0; tries < 12; tries++) {
        const month = weighted(r, months);
        const d = `${year}-${String(month + 1).padStart(2, '0')}-${String(intBetween(r, 1, 28)).padStart(2, '0')}`;
        if (d > horizon) { date = d; break; }
      }
      if (!date) date = addDaysToKey(horizon, intBetween(r, 7, 60));
      const genres = [weighted(r, p.g)];
      if (r() < 0.5 && p.g.length > 1) {
        const second = weighted(r, p.g.filter(([g]) => g !== genres[0]));
        genres.push(second);
      }
      const animated = genres.includes('Animation');
      out.push({
        id: `sim-film:${p.c}:${year}:${i}`,
        company: p.c,
        title: `${pick(r, ['The ', '', '', 'A '])}${pick(r, WORDS_A)} ${pick(r, WORDS_B)}`,
        date,
        genres,
        runtimeMin: Math.round(Math.max(70, Math.min(170, gaussian(r, animated ? 98 : 118, 14)))),
        people: { director: `${pick(r, FIRSTS)} ${pick(r, LASTS)}`, writer: `${pick(r, FIRSTS)} ${pick(r, LASTS)}`, lead: `${pick(r, FIRSTS)} ${pick(r, LASTS)}` },
      });
    }
    out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }
  if (cache.size > 2000) cache.clear();
  cache.set(key, out);
  return out;
}

/** Every studio's simulated films dated from `from` to `to` (YYYY-MM-DD, inclusive), in date order. */
export function studioFilms(state: GameState, from: string, to: string): StudioFilm[] {
  const ind = state.industry;
  if (!ind?.studios?.length || to <= ind.horizon) return [];
  const out: StudioFilm[] = [];
  for (let y = Math.max(Number(from.slice(0, 4)), Number(ind.horizon.slice(0, 4))); y <= Number(to.slice(0, 4)); y++) {
    for (const p of ind.studios) for (const f of studioYear(state.seed, ind.horizon, p, y)) if (f.date >= from && f.date <= to) out.push(f);
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/**
 * A followed studio to make a career offer (docs/WORLD.md, "Careers"): half the time, once the save's world has studios,
 * one of those with a recorded pace, from a stream keyed on the offer. Undefined otherwise, and the offer comes from the
 * game's own invented companies as before.
 */
export function careerStudio(state: GameState, key: string): string | undefined {
  const named = (state.industry?.studios ?? []).filter((p) => p.name && p.n >= 1);
  if (!named.length) return undefined;
  const r = stream(state.seed, 'career-studio', key);
  return r() < 0.5 ? weighted(r, named.map((p) => [p.name!, p.n] as [string, number])) : undefined;
}

/** One simulated film by its ID, if this save's world released it (or will). */
export function studioFilm(state: GameState, id: string): StudioFilm | undefined {
  const m = /^sim-film:(.+):(\d{4}):(\d+)$/.exec(id);
  const p = m && state.industry?.studios?.find((x) => x.c === m[1]);
  return p ? studioYear(state.seed, state.industry!.horizon, p, Number(m![2])).find((f) => f.id === id) : undefined;
}
