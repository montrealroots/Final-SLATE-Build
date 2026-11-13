// Other people's productions, kept (the owner's v5 brief, 7; built November 13, 2026). Until then an outside job named a
// production and a company drawn from ten titles and six names (jobs.ts PRODUCTIONS, COMPANIES), and neither existed
// before the offer or after the job. Now the place the player works in has a slate of productions that persists:
// - each has a company, a kind (a feature, a short or a series), a genre, its parts, a place, and dates: when it shoots,
//   when it wraps and when it comes out. They follow from the save's seed, once, and are kept in the save;
// - the company is one of the studios the save's world follows, where it follows any, or one of the game's own, which
//   recur from production to production;
// - outside work is offered on these (jobs.ts): a part in one, a place in its writers' room, an episode or the second
//   unit to direct, inside its shooting dates;
// - it comes out on its date and is received (simulated, and said so), and how the productions the player worked on were
//   received counts toward the next offers.
// The slate is topped up as productions wrap, never reset, and nothing is made up to be dramatic: a production does
// what its dates say. Names, companies and results are invented and labelled; so are the world's studios' slates.
import { stream } from './rng';
import { addLog, registerHandler, schedule } from './state';
import { DAY, addDaysToKey, dateKey } from './time';
import type { GameState } from './types';

export type ProductionKind = 'feature' | 'short' | 'series';
export interface Production {
  id: string;
  title: string;
  company: string;
  kind: ProductionKind;
  genre: string;
  /** The parts it casts, by the size of each. */
  parts: { name: string; size: 'lead' | 'supporting' | 'day player' }[];
  episodes?: number;
  placeId: string;
  zone: string;
  shootsFrom: string;
  wrapsOn: string;
  releasesOn: string;
  /** How it was received when it came out: simulated, labelled so. */
  result?: { reception: number };
}

/** How many productions the slate keeps before they wrap, and how far ahead they are dated. Game calibration. */
export const SLATE_SIZE = 6;
const GAME_COMPANIES = ['Halfmoon Pictures', 'Copperline Films', 'Northlight Television', 'Fieldwork Productions', 'Gannet Media', 'Stillwater Studios', 'Brightwater Films', 'Marrow Lane Pictures', 'Second Act Television', 'Kitebird Media', 'Foundry Street Films', 'Tallow & Wick'];
const A = ['Quiet', 'Salt', 'Paper', 'Northern', 'Last', 'Glass', 'Hollow', 'Bright', 'Small', 'Burning', 'Silent', 'Iron', 'Little', 'Distant', 'Golden', 'Low', 'Wild', 'Late', 'Blue', 'Second', 'Hidden', 'Winter', 'Lost', 'Crimson', 'Brave', 'Secret', 'Midnight', 'Borrowed', 'Open', 'Restless'];
const B = ['Harbour', 'Summer', 'Orchard', 'Signal', 'River', 'Kingdom', 'Witness', 'Houses', 'Tide', 'Season', 'Weather', 'Mountain', 'Archive', 'Garden', 'Crossing', 'Lights', 'Hours', 'Field', 'Room', 'Voyage', 'Machine', 'Promise', 'Lantern', 'Forest', 'Island', 'Engine', 'Ferry', 'Doors', 'Kings', 'Quarter'];
const GENRES = ['drama', 'comedy', 'thriller', 'romance', 'crime', 'family', 'horror', 'science fiction', 'period drama', 'mystery'];
const NAMES = ['Iris', 'Teo', 'Marisol', 'Kwame', 'Ana', 'Lars', 'Mina', 'Rafi', 'Odile', 'Leila', 'Joaquín', 'Ngozi', 'Yuki', 'Farid', 'Elsa', 'Dara', 'Ines', 'Malik', 'Priya', 'Bram', 'Cass', 'Wren', 'Hollis', 'Juno'];

export const productions = (s: GameState): Production[] => s.productions ?? [];
export const productionById = (s: GameState, id: string): Production | undefined => (s.productions ?? []).find((p) => p.id === id);

/** The productions not yet wrapped where the player is, topped up to the slate's size. Each is made once and kept. */
export function slateHere(state: GameState, placeId: string, zone: string): Production[] {
  const all = (state.productions ??= []);
  const today = dateKey(state.now, zone);
  const live = () => all.filter((p) => p.placeId === placeId && p.wrapsOn >= today);
  while (live().length < SLATE_SIZE) {
    // Its draw is keyed by how many productions this place has had: the same save makes the same slate, and a later one
    // never changes an earlier one.
    const n = all.filter((p) => p.placeId === placeId).length;
    const r = stream(state.seed, 'production', placeId, String(n));
    const pick = <T>(xs: T[]): T => xs[Math.floor(r() * xs.length)];
    const kind: ProductionKind = r() < 0.4 ? 'series' : r() < 0.85 ? 'feature' : 'short';
    const studios = (state.industry?.studios ?? []).filter((x) => x.name).map((x) => x.name!);
    const company = studios.length && kind !== 'series' && r() < 0.5 ? pick(studios) : pick(GAME_COMPANIES);
    const lead = 14 + Math.floor(r() * 90);
    const shootsFrom = addDaysToKey(today, lead);
    const length = kind === 'series' ? 40 + Math.floor(r() * 50) : kind === 'feature' ? 25 + Math.floor(r() * 30) : 4 + Math.floor(r() * 6);
    const wrapsOn = addDaysToKey(shootsFrom, length);
    const releasesOn = addDaysToKey(wrapsOn, (kind === 'short' ? 90 : 180) + Math.floor(r() * 180));
    const pool = [...NAMES];
    for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
    const names = pool.slice(0, kind === 'short' ? 3 : 6);
    const p: Production = {
      id: `prod-${placeId}-${n}`, title: `${pick(A)} ${pick(B)}`, company, kind, genre: pick(GENRES),
      parts: names.map((name, i) => ({ name, size: i === 0 ? 'lead' : i < 3 ? 'supporting' : 'day player' })),
      ...(kind === 'series' ? { episodes: 6 + Math.floor(r() * 5) } : {}), placeId, zone, shootsFrom, wrapsOn, releasesOn,
    };
    if (all.some((x) => x.title === p.title)) p.title = `${p.title} ${['II', 'Again', 'Returns'][n % 3]}`;
    all.push(p);
    const [y, m, d] = releasesOn.split('-').map(Number);
    schedule(state, Date.UTC(y, m - 1, d, 9), 'production-release', { id: p.id }, { attention: 'silent', priority: 70, id: `prod-release:${p.id}` });
  }
  return live();
}

/** A production comes out on its date and is received. Simulated. The player hears of it only if they worked on it. */
registerHandler('production-release', (state, ev) => {
  const p = productionById(state, String(ev.payload.id));
  if (!p || p.result) return { suppressInterrupt: true };
  const r = stream(state.seed, 'production-result', p.id);
  p.result = { reception: Math.round(35 + r() * 50) };
  const worked = (state.jobs ?? []).filter((j) => j.productionId === p.id && j.attended.length > 0);
  if (worked.length) addLog(state, `${p.title}, which you worked on, came out and was received at ${p.result.reception}. Simulated.`, 'personal', { route: { view: 'profile' } });
  return { suppressInterrupt: true };
});

/**
 * How the productions the player worked on were received, as the next offers weigh it: 1 with none out yet, more for
 * work received well, less for work received coolly. Game calibration: from 0.8 to 1.2.
 */
export function industryStanding(state: GameState): number {
  const out = (state.jobs ?? []).filter((j) => j.attended.length > 0 && j.productionId).map((j) => productionById(state, j.productionId!)?.result?.reception).filter((x): x is number => x !== undefined);
  if (!out.length) return 1;
  const avg = out.reduce((a, b) => a + b, 0) / out.length;
  return Math.max(0.8, Math.min(1.2, 1 + (avg - 60) / 100));
}

export const PRODUCTION_KIND_LABELS: Record<ProductionKind, string> = { feature: 'A Feature', short: 'A Short', series: 'A Series' };
export const shootingDays = (p: Production): string[] => {
  const out: string[] = [];
  for (let k = p.shootsFrom; k <= p.wrapsOn; k = addDaysToKey(k, 1)) out.push(k);
  return out;
};
export const daysUntil = (state: GameState, p: Production): number => Math.round((Date.parse(p.shootsFrom) - Date.parse(dateKey(state.now, p.zone))) / DAY);
