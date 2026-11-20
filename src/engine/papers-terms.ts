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
import { theCountry } from './bankworld/systems/documents';
import { countryName } from '../world/gazetteer/gazetteer';

export interface Source { kind: 'official' | 'secondary'; url: string; what: string }
interface Recorded {
  route?: string; name?: string; fee: number; currency: string; feeBasis: string;
  /** Left out where research found the fee but no decision time (from November 17, 2026): the time is then estimated. */
  days?: number | [number, number]; daysBasis?: string; stayDays?: number; stayBasis?: string; sources: Source[];
  /** A further fee paid only once it is issued (from November 20, 2026: Mauritius' permit fee after its application fee). */
  issuance?: { amount: number; currency: string };
}
/** An authorization's record, and the passports whose authorization there differs (Australia's free eVisitor for Europeans). */
interface Authority extends Recorded { passports?: (Partial<Recorded> & { codes: string[] })[] }
/** A territory whose visitors hold its sovereign's visa (from November 17, 2026), and the law or page that says so. */
interface VisaAuthority { authority: string; basis: string; sources: Source[] }
const TERMS = termsData as unknown as { permits: Record<string, Recorded>; permitAuthorities?: Record<string, string>; visas?: Record<string, Recorded>; visaAuthorities?: Record<string, VisaAuthority>; authorizations: Record<string, Authority> };

export interface Terms {
  /** The route as the records name it. */
  route: string;
  fee: { amount: number; currency: string };
  /**
   * A further fee paid only once it is issued (from November 20, 2026, papers-scoped.ts: Colombia's issuance fee after
   * its study fee). A refusal costs only `fee`.
   */
  issuance?: { amount: number; currency: string };
  /** Calendar days from applying to the decision (a range's middle). */
  days: number;
  /** The decision time in words: "21 days", "between 90 and 180 days". */
  daysText: string;
  /** Days the permission lasts once issued, or null where nothing says. */
  stayDays: number | null;
  basis: string;
  sources: Source[];
  /**
   * Set when research doesn't give this route's figures: what the estimate was made from, and, where the fee is
   * researched and only the decision time is estimated, `only: 'days'`.
   */
  estimate: null | { from: string[]; where: string; only?: 'days' };
}

export const continentOf = (iso: string) => WORLD_COUNTRIES.find((c) => c.iso2 === iso)?.continent ?? '';
const middle = (d: number | [number, number]) => (Array.isArray(d) ? Math.round((d[0] + d[1]) / 2) : d);
const words = (d: number | [number, number]) => (Array.isArray(d) ? `between ${d[0]} and ${d[1]} days` : `${d} days`);
const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const usd = (amount: number, currency: string) => (exchange(Math.round(amount * 100), currency, 'USD') ?? NaN) / 100;

function researched(r: Recorded, route: string, country = '', pool: [string, Recorded][] = []): Terms {
  if (r.days === undefined) {
    // The fee is researched; the decision time is the middle of the researched ones near it, said as the game's estimate.
    const e = estimated(country, route, pool);
    return {
      route: r.route ?? r.name ?? route, fee: { amount: r.fee, currency: r.currency }, days: e.days, daysText: e.daysText,
      stayDays: r.stayDays ?? null,
      basis: [r.feeBasis, r.stayBasis, `How long it takes to decide is the game's estimate: no source found gives it, so it takes the middle of the ${e.estimate!.where} (${e.estimate!.from.join(', ')}).`].filter(Boolean).join(' '),
      sources: r.sources, estimate: { ...e.estimate!, only: 'days' }, ...(r.issuance ? { issuance: r.issuance } : {}),
    };
  }
  return {
    route: r.route ?? r.name ?? route, fee: { amount: r.fee, currency: r.currency }, days: middle(r.days), daysText: words(r.days),
    stayDays: r.stayDays ?? null, basis: [r.feeBasis, r.daysBasis, r.stayBasis].filter(Boolean).join(' '), sources: r.sources, estimate: null,
    ...(r.issuance ? { issuance: r.issuance } : {}),
  };
}

/** The game's estimate for `country` from researched routes: the same continent's, or all of them. */
function estimated(country: string, route: string, pool: [string, Recorded][]): Terms {
  const cont = continentOf(country);
  // Only routes researched in full: a route whose time is itself estimated doesn't feed another's estimate.
  const full = pool.filter(([, r]) => r.days !== undefined);
  const near = full.filter(([c]) => continentOf(c) === cont);
  const use = (near.length ? near : full).filter(([, r]) => Number.isFinite(usd(r.fee, r.currency)));
  const fee = Math.round(median(use.map(([, r]) => usd(r.fee, r.currency))));
  const days = median(use.map(([, r]) => middle(r.days!)));
  const stays = use.map(([, r]) => r.stayDays).filter((x): x is number => !!x);
  const where = near.length ? `researched routes in ${CONTINENT_NAMES[cont] ?? cont}` : 'all researched routes';
  return {
    route, fee: { amount: fee, currency: 'USD' }, days, daysText: `${days} days`, stayDays: stays.length ? median(stays) : null,
    basis: `The game's estimate: no research yet gives this route's fee or decision time, so it takes the middle of the ${where} (${use.map(([c]) => c).join(', ')}).`,
    sources: [], estimate: { from: use.map(([c]) => c), where },
  };
}

/**
 * What `country`'s work permit route costs and takes: researched, or the game's estimate, said as one. A territory
 * whose route is its sovereign's (permitAuthorities: the work records give Guam the O-1, Réunion France's carte de
 * séjour, Christmas Island Australia's subclass 408) takes the sovereign's terms, as the same law issues it (from
 * November 17, 2026; until then each was estimated from its own continent's). Matching on the route's name alone
 * would have given every "Work permit" Canada's.
 */
export function permitTerms(country: string, route: string): Terms {
  const r = TERMS.permits[country];
  if (r) return researched(r, route, country, Object.entries(TERMS.permits));
  const by = TERMS.permitAuthorities?.[country];
  if (by) {
    const t = researched(TERMS.permits[by], route);
    return { ...t, basis: `The same permit ${theCountry(countryName(by))} issues, under the same law. ${t.basis}` };
  }
  return estimated(country, route, Object.entries(TERMS.permits));
}

/** The researched visitor visas: terms.json's by destination, and 1221's records (one per destination, the first). */
function visaPool(): [string, Recorded][] {
  const own = Object.entries(TERMS.visas ?? {});
  const from1221 = Object.entries(VISAS).map(([k, v]) => [k.split('<')[0], { name: v.name, fee: v.fee, currency: v.currency, feeBasis: v.basis, days: v.days, daysBasis: '', sources: [{ kind: 'secondary', url: v.source, what: '1221\'s visa record' }] }] as [string, Recorded]);
  const seen = new Set(own.map(([c]) => c));
  return [...own, ...from1221.filter(([c]) => !seen.has(c) && (seen.add(c), true))];
}

/**
 * What a visitor visa for `country` costs and takes, for a passport 1221 has no pair for: researched, 1221's record for
 * the destination (from November 16, 2026: until then the United States' B-1/B-2, recorded at $185, was estimated at
 * $135 for every passport but Mexico's and Brazil's), or estimated.
 */
export function visaTerms(country: string): Terms {
  const r = TERMS.visas?.[country] ?? visaPool().find(([c]) => c === country)?.[1];
  if (r) return researched(r, r.name ?? 'Visitor visa', country, visaPool());
  const by = TERMS.visaAuthorities?.[country];
  if (by) {
    const t = visaTerms(by.authority);
    return { ...t, basis: `${by.basis} ${t.basis}`, sources: [...by.sources, ...t.sources] };
  }
  return estimated(country, 'Visitor visa', visaPool());
}

/**
 * The authority whose authorization a territory's visitors hold: Puerto Rico and the US Virgin Islands are entered on an
 * ESTA, the Crown Dependencies on the UK's ETA, Australia's external territories on its ETA, the Palestinian territories
 * through Israel's ETA-IL, and Western Sahara through Morocco's.
 */
const AUTHORITY_OF: Record<string, string> = { PR: 'US', VI: 'US', GG: 'GB', IM: 'GB', JE: 'GB', CC: 'AU', CX: 'AU', NF: 'AU', PS: 'IL', EH: 'MA', MP: 'GU' };

/**
 * What the electronic travel authorization for `country` costs and takes for the best of `passports` (from November 16,
 * 2026: until then every authorization was charged the destination's visitor visa, an ESTA $135 and 64 days). Researched
 * where terms.json records it, or the game's estimate from the authorizations that are.
 */
export function authorizationTerms(country: string, passports: string[]): Terms {
  const r = TERMS.authorizations[AUTHORITY_OF[country] ?? country];
  if (!r) return estimated(country, 'Electronic travel authorization', Object.entries(TERMS.authorizations));
  const forPassport = (p: string): Recorded => ({ ...r, ...(r.passports?.find((x) => x.codes.includes(p)) ?? {}) });
  const best = passports.map(forPassport).sort((a, b) => usd(a.fee, a.currency) - usd(b.fee, b.currency))[0] ?? r;
  return researched(best, best.name ?? 'Electronic travel authorization');
}

/** Every researched permit country (for the coverage matrix). */
export const RESEARCHED_PERMITS = Object.keys(TERMS.permits);
export const RESEARCHED_VISAS = Object.keys(TERMS.visas ?? {});
/** Every territory whose visitors hold their sovereign's visa, by territory. */
export const VISA_AUTHORITY_OF: Record<string, string> = Object.fromEntries(Object.entries(TERMS.visaAuthorities ?? {}).map(([c, v]) => [c, v.authority]));
/** Every researched authorization, by the destination that issues it. */
export const RESEARCHED_AUTHORIZATIONS = Object.keys(TERMS.authorizations);
