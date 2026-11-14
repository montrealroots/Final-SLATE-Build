// What an application costs and how long it takes (the owner's command of November 14, 2026, choosing "research, then
// estimate"): every permit and visa route can be applied for. A route's fee and decision time are:
// - researched, where src/data/papers/terms.json (permits, visitor visas) or 1221's visa records give them, each with its
//   source and whether that is the government's own page;
// - otherwise the game's estimate, said as one wherever it shows: the median of the researched routes on the same
//   continent (all researched routes, where none is on it), in dollars at the day's reference rate. Every estimate is
//   listed by tests/v10-papers-terms.test.ts, so research can replace it; their number may fall and may not rise.
// Until November 14, 2026 nothing was taken where a figure was missing: the screen said what was missing, and stopped.
import termsData from '../data/papers/terms.json';
import { WORLD_COUNTRIES } from './bankworld/content/world-data';
import { CONTINENT_NAMES } from './bankworld/content/geography';
import { exchange } from './bankworld/content/currency';
import { VISAS } from './bankworld/content/visas';

export interface Source { kind: 'official' | 'secondary'; url: string; what: string }
interface Recorded {
  route?: string; name?: string; fee: number; currency: string; feeBasis: string;
  days: number | [number, number]; daysBasis: string; stayDays?: number; stayBasis?: string; sources: Source[];
}
const TERMS = termsData as unknown as { permits: Record<string, Recorded>; visas?: Record<string, Recorded> };

export interface Terms {
  /** The route as the records name it. */
  route: string;
  fee: { amount: number; currency: string };
  /** Calendar days from applying to the decision (a range's middle). */
  days: number;
  /** The decision time in words: "21 days", "between 90 and 180 days". */
  daysText: string;
  /** Days the permission lasts once issued, or null where nothing says. */
  stayDays: number | null;
  basis: string;
  sources: Source[];
  /** Set when no research gives this route's figures: what the estimate was made from. */
  estimate: null | { from: string[]; where: string };
}

export const continentOf = (iso: string) => WORLD_COUNTRIES.find((c) => c.iso2 === iso)?.continent ?? '';
const middle = (d: number | [number, number]) => (Array.isArray(d) ? Math.round((d[0] + d[1]) / 2) : d);
const words = (d: number | [number, number]) => (Array.isArray(d) ? `between ${d[0]} and ${d[1]} days` : `${d} days`);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const usd = (amount: number, currency: string) => (exchange(Math.round(amount * 100), currency, 'USD') ?? NaN) / 100;

function researched(r: Recorded, route: string): Terms {
  return {
    route: r.route ?? r.name ?? route, fee: { amount: r.fee, currency: r.currency }, days: middle(r.days), daysText: words(r.days),
    stayDays: r.stayDays ?? null, basis: [r.feeBasis, r.daysBasis, r.stayBasis].filter(Boolean).join(' '), sources: r.sources, estimate: null,
  };
}

/** The game's estimate for `country` from researched routes: the same continent's, or all of them. */
function estimated(country: string, route: string, pool: [string, Recorded][]): Terms {
  const cont = continentOf(country);
  const near = pool.filter(([c]) => continentOf(c) === cont);
  const use = (near.length ? near : pool).filter(([, r]) => Number.isFinite(usd(r.fee, r.currency)));
  const fee = Math.round(median(use.map(([, r]) => usd(r.fee, r.currency))));
  const days = median(use.map(([, r]) => middle(r.days)));
  const stays = use.map(([, r]) => r.stayDays).filter((x): x is number => !!x);
  const where = near.length ? `researched routes in ${CONTINENT_NAMES[cont] ?? cont}` : 'all researched routes';
  return {
    route, fee: { amount: fee, currency: 'USD' }, days, daysText: `${days} days`, stayDays: stays.length ? median(stays) : null,
    basis: `The game's estimate: no research yet gives this route's fee or decision time, so it takes the middle of the ${where} (${use.map(([c]) => c).join(', ')}).`,
    sources: [], estimate: { from: use.map(([c]) => c), where },
  };
}

/** What `country`'s work permit route costs and takes: researched, or the game's estimate, said as one. */
export function permitTerms(country: string, route: string): Terms {
  const r = TERMS.permits[country];
  return r ? researched(r, route) : estimated(country, route, Object.entries(TERMS.permits));
}

/** The researched visitor visas: terms.json's by destination, and 1221's records (one per destination, the first). */
function visaPool(): [string, Recorded][] {
  const own = Object.entries(TERMS.visas ?? {});
  const from1221 = Object.entries(VISAS).map(([k, v]) => [k.split('<')[0], { name: v.name, fee: v.fee, currency: v.currency, feeBasis: v.basis, days: v.days, daysBasis: '', sources: [{ kind: 'secondary', url: v.source, what: '1221\'s visa record' }] }] as [string, Recorded]);
  const seen = new Set(own.map(([c]) => c));
  return [...own, ...from1221.filter(([c]) => !seen.has(c) && (seen.add(c), true))];
}

/** What a visitor visa for `country` costs and takes, for a passport 1221 has no pair for: researched, or estimated. */
export function visaTerms(country: string): Terms {
  const r = TERMS.visas?.[country];
  return r ? researched(r, r.name ?? 'Visitor visa') : estimated(country, 'Visitor visa', visaPool());
}

/** Every researched permit country (for the coverage matrix). */
export const RESEARCHED_PERMITS = Object.keys(TERMS.permits);
export const RESEARCHED_VISAS = Object.keys(TERMS.visas ?? {});
