// What the market offers in a place, and the evidence behind it (from November 17, 2026). Evidence comes from the
// housing packs (src/data/homes, written by tools/homes/import.mjs), fetched when a place is looked at, never at startup
// and never copied into a save: a home the player acts on is pinned with the figures it was offered at.
//
// Offers are simulated, every one: the package has no current listing anywhere. They are drawn from the save's seed,
// the place and the month, so reopening a screen or reloading the game shows the same homes at the same prices, and a
// new month brings a new set. Each says what its price comes from.
import { getPlace, type Place } from '../../data/places';
import { bankCurrencyFor } from '../bank';
import { exchange } from '../bankworld/content/currency';
import { intBetween, pick, stream, unit, type Rng } from '../rng';
import { addDaysToKey } from '../time';
import {
  PLACEHOLDER, RUNNING_USD, inBuilding, roomsFrom, scopesOf,
  FORM_WORDS, type Condition, type Design, type Evidence, type Form, type Home, type Room, type RoomKind,
} from './model';

export { HOME_RULES } from './rules';

const HUD = import.meta.glob<string>('../../data/homes/hud/*.json', { query: '?url', import: 'default', eager: true });
const FR = import.meta.glob<string>('../../data/homes/fr/*.json', { query: '?url', import: 'default', eager: true });
const SG = import.meta.glob<string>('../../data/homes/sg/*.json', { query: '?url', import: 'default', eager: true });
const BENCH = import.meta.glob<string>('../../data/homes/benchmarks.json', { query: '?url', import: 'default', eager: true });
const COUNTIES = import.meta.glob<string>('../../data/homes/hud/counties.json', { query: '?url', import: 'default', eager: true });
const FR_CODES = import.meta.glob<string>('../../data/homes/fr/communes.json', { query: '?url', import: 'default', eager: true });
const CENSUS = import.meta.glob<string>('../../data/homes/census/*.json', { query: '?url', import: 'default', eager: true });
const FHFA = import.meta.glob<string>('../../data/homes/fhfa.json', { query: '?url', import: 'default', eager: true });

/**
 * Each factual dataset's geography, dates, units, method and source (from November 17, 2026: the owner's brief, 3).
 * A figure is known to the player from `availableFrom`: its publication where that's verified, otherwise the
 * conservative date the package allows (its effective date where the law fixes publication before it, or the day it
 * was retrieved). Before that, the game still uses it to reconstruct the market then, and says so: "retrospective".
 */
export const DATASETS = {
  'US-HUD': { geography: 'US county or HUD metro area', effectiveFrom: '2025-10-01', effectiveTo: '2026-09-30', publishedAt: null, availableFrom: '2025-10-01', retrievedAt: '2026-11-16', currency: 'USD', units: 'dollars a month, gross rent (rent and utilities), by bedrooms', method: "HUD's FY2026 Fair Market Rents: the 40th percentile of recent movers' gross rents, revised. Publication date not verified: unlocked from the fiscal year's start, before which HUD must publish them", source: 'https://www.huduser.gov/portal/datasets/fmr.html' },
  'US-NAHB': { geography: 'United States (national)', effectiveFrom: '2024-01-01', effectiveTo: '2024-12-31', publishedAt: '2025-01-01', availableFrom: '2025-01-01', retrievedAt: '2026-11-16', currency: 'USD', units: 'dollars per new single-family home; square feet', method: "NAHB's 2024 survey of builders: average sales price, construction cost, lot cost and finished area. Published January 2025 (the report's own date)", source: 'NAHB Cost of Constructing a Home, 2024 (January 2025)' },
  'US-EIA': { geography: 'US state', effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', publishedAt: '2026-10-21', availableFrom: '2026-10-21', retrievedAt: '2026-11-16', currency: 'USD', units: 'US cents per kWh, residential average', method: 'EIA Electric Power Annual, data for 2025: revenue divided by kWh sold. Released October 21, 2026', source: 'https://www.eia.gov/electricity/annual/' },
  'GB-ONS': { geography: 'UK nation (England, Wales, Scotland) or UK', effectiveFrom: '2026-09-01', effectiveTo: '2026-09-30', publishedAt: '2026-10-21', availableFrom: '2026-10-21', retrievedAt: '2026-11-16', currency: 'GBP', units: 'pounds a month, average private rent', method: 'ONS Price Index of Private Rents, September 2026, provisional. Published October 21, 2026', source: 'https://www.ons.gov.uk/economy/inflationandpriceindices/bulletins/privaterentandhousepricesuk/october2026' },
  'FR-DVF-2025': { geography: 'French commune', effectiveFrom: '2025-01-01', effectiveTo: '2025-12-31', publishedAt: null, availableFrom: '2026-11-16', retrievedAt: '2026-11-16', currency: 'EUR', units: 'euros per square metre, median of single-home sales', method: 'DVF recorded sales in 2025, kept as commune medians by the game. Publication date not verified: unlocked from the day it was retrieved', source: 'https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees' },
  'US-ACS-2023': { geography: 'US place (city, town or census-designated place), or its county', effectiveFrom: '2019-01-01', effectiveTo: '2023-12-31', publishedAt: '2024-12-12', availableFrom: '2024-12-12', retrievedAt: '2026-11-17', currency: 'USD', units: 'dollars: median value of owner-occupied homes; median gross rent a month by bedrooms', method: "Census Bureau, American Community Survey 2019-2023 5-year estimates, tables B25077 and B25031, in 2023 dollars; a figure is used only when its margin of error is at most 30% of it. Released December 12, 2024", source: 'https://www2.census.gov/programs-surveys/acs/summary_file/2023/table-based-SF/' },
  'US-ACS-2024': { geography: 'US place (city, town or census-designated place), or its county', effectiveFrom: '2020-01-01', effectiveTo: '2024-12-31', publishedAt: '2026-01-29', availableFrom: '2026-01-29', retrievedAt: '2026-11-17', currency: 'USD', units: 'dollars: median value of owner-occupied homes; median gross rent a month by bedrooms', method: "Census Bureau, American Community Survey 2020-2024 5-year estimates, tables B25077 and B25031, in 2024 dollars; a figure is used only when its margin of error is at most 30% of it. Released January 29, 2026, after the 2025 shutdown delayed it", source: 'https://www2.census.gov/programs-surveys/acs/summary_file/2024/table-based-SF/' },
  'US-FHFA': { geography: 'US metro area or metro division (OMB, July 2023), or the state outside one', effectiveFrom: '1975-01-01', effectiveTo: '2026-06-30', publishedAt: null, availableFrom: 'by quarter', retrievedAt: '2026-11-17', currency: 'USD', units: 'index, not seasonally adjusted', method: "FHFA's all-transactions house price index, quarterly: repeat sales and refinance appraisals of the same homes. The game takes a quarter as known from the end of the second month after it (FHFA publishes in the last week of that month)", source: 'https://www.fhfa.gov/data/hpi/datasets' },
  'SG-HDB': { geography: 'HDB town', effectiveFrom: '2017-01-01', effectiveTo: '2026-10-31', publishedAt: null, availableFrom: 'by month', retrievedAt: '2026-11-16', currency: 'SGD', units: 'Singapore dollars per resale', method: "HDB resale transactions by month: only those up to the game's month are used", source: 'https://data.gov.sg/datasets/d_8b84c4ee58e3cfc0ece0d773c8ca6abc/view' },
} as const;
/** A figure's words, said as retrospective when the game's date is before the figure was available to anyone. */
function dated(says: string, id: keyof typeof DATASETS, day: string): { says: string; retrospective?: true } {
  const d = DATASETS[id];
  if (/^\d/.test(d.availableFrom) && day < d.availableFrom) return { says: `${says} Retrospective: these figures were only available from ${d.availableFrom}, after this date; the game uses them to reconstruct the market then.`, retrospective: true };
  if (id !== 'SG-HDB' && id !== 'US-FHFA' && day > d.effectiveTo) return { says: `${says} The latest figures the game holds; they describe ${d.effectiveTo.slice(0, 4)}.` };
  return { says };
}
const cache = new Map<string, Promise<unknown>>();
async function fetchJson<T>(url: string | undefined): Promise<T | undefined> {
  if (!url) return undefined;
  let p = cache.get(url);
  if (!p) {
    p = fetch(url).then((r) => { if (!r.ok) throw new Error(`Couldn't load housing data (${r.status}).`); return r.json(); });
    p.catch(() => cache.delete(url));
    cache.set(url, p);
  }
  return p as Promise<T>;
}
const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

const US_STATES: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO', Connecticut: 'CT', Delaware: 'DE', 'District of Columbia': 'DC', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID', Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA', Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN', Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR', Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD', Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA', 'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'Puerto Rico': 'PR',
};

/** What's known about housing in a place, summarised from the packs: the evidence its offers are drawn from. */
export interface MarketEvidence {
  placeId: string;
  currency: string;
  /** Monthly rent by bedrooms 0–4, in hundredths, where a benchmark gives it. */
  rent?: { byBedrooms: number[]; evidence: Evidence; original?: number[] };
  /** Purchase price per square metre, in hundredths, by kind of home, where evidence gives it. */
  sale?: { houseM2?: number; apartmentM2?: number; evidence: Evidence; medianAreaM2?: number; /** Recorded sales behind it, where it's from sales. */ records?: number; /** A Census median: the place's own, or its county's. */ scope?: 'place' | 'county' };
  /** Singapore: the HDB town and its recent resales by flat type. */
  hdb?: { town: string; byType: Record<string, { price: number; area: number; storey: string; leaseFrom: number; remainingMonths: number | null }[]>; evidence: Evidence };
  /** Recorded sales nearby, for the player to read: never "available now". */
  nearby: { label: string; detail: string }[];
  /** Average delivered electricity price, US cents per kWh, where EIA gives the state's. Not a tariff. */
  electricity?: { centsPerKwh: number; evidence: Evidence };
  land?: { perM2: number; evidence: Evidence };
}

interface CensusPlace { fips: string; name: string; value: Record<string, number>; rent: Record<string, number[]> }
/** The American Housing Survey's median size of a single-family home, 1,800 square feet (2011 survey; Census Bureau release CB13-04), in m². */
const HOME_M2 = 1800 * 0.092903;
/**
 * How much prices have moved since the Census year, by FHFA's index for the place's metro (or its state outside one):
 * the latest quarter known on the game's day over the Census year's average. The Census median is taken as that year's
 * level (the game's assumption: a 5-year median is in the final year's dollars, but drawn from all five).
 */
export async function priceTrend(county: string | undefined, st: string, year: string, day: string): Promise<{ factor: number; says: string; series?: string; quarter?: string }> {
  const f = await fetchJson<{ last: [number, number]; series: Record<string, { name: string; from: [number, number]; index: (number | null)[] }>; metro: Record<string, string> }>(FHFA['../../data/homes/fhfa.json']);
  const code = (county && f?.metro[county]) || st;
  const s = f?.series[code];
  if (!s) return { factor: 1, says: 'No price index covers it: the Census figure is used as it stands.' };
  const at = (y: number, q: number) => s.index[y * 4 + q - 1 - (s.from[0] * 4 + s.from[1] - 1)] ?? null;
  // The latest quarter published by the game's day: one ending in June is known from the first of September.
  const month = Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
  let k = Math.floor(month / 3);
  while (Math.floor(k / 4) * 12 + (k % 4) * 3 + 4 >= month) k--;
  const lastK = f!.last[0] * 4 + f!.last[1] - 1;
  k = Math.min(k, lastK);
  let i: number | null = null;
  while (k >= s.from[0] * 4 + s.from[1] - 1 && (i = at(Math.floor(k / 4), (k % 4) + 1)) === null) k--;
  const ref = [1, 2, 3, 4].map((q) => at(Number(year), q)).filter((x): x is number => x !== null);
  if (i === null || !ref.length) return { factor: 1, says: `No index for ${s.name} at this date: the Census figure is used as it stands.`, series: s.name };
  const base = ref.reduce((a, x) => a + x, 0) / ref.length;
  const factor = i / base;
  const quarter = `${Math.floor(k / 4)} Q${(k % 4) + 1}`;
  const pct = Math.round((factor - 1) * 1000) / 10;
  return { factor, series: s.name, quarter, says: `FHFA's house price index for ${s.name} ${pct === 0 ? `was where it stood in ${year}` : pct > 0 ? `had risen ${pct}% from ${year}` : `had fallen ${-pct}% from ${year}`} by ${quarter}, the latest quarter published by this date; the price follows it.` };
}

/** Evidence for a place, from whichever pack covers it; nothing (and the placeholder model) where none does. */
export async function marketEvidence(placeId: string, day: string): Promise<MarketEvidence> {
  const place = getPlace(placeId);
  const currency = bankCurrencyFor(place.country, day);
  const ev: MarketEvidence = { placeId, currency, nearby: [] };
  const toLocal = (usdCents: number) => exchange(usdCents, 'USD', currency, day) ?? usdCents;
  if (place.country === 'US') {
    const st = US_STATES[place.region];
    const hud = await fetchJson<{ areas: { fips: string; areaName: string; county: string; town: string | null; pop2023: number | null; revised: number[]; original: number[] | null }[] }>(HUD[`../../data/homes/hud/${st}.json`]);
    // The place's own county (GeoNames' county code, tools/homes/counties.mjs), from November 17, 2026: until then a
    // town was matched by name, so Lancaster, Texas, in Dallas County, got the placeholder.
    const counties = await fetchJson<Record<string, string>>(COUNTIES['../../data/homes/hud/counties.json']);
    const county = counties?.[placeId.replace(/^gn:/, '')];
    const name = fold(place.name);
    const inCounty = county ? (hud?.areas ?? []).filter((a) => a.fips.slice(0, 5) === county) : [];
    const match = (inCounty.find((a) => fold(a.town ?? '') === name) ?? inCounty.sort((a, b) => (b.pop2023 ?? 0) - (a.pop2023 ?? 0))[0])
      ?? (county ? undefined : hud?.areas.filter((a) => fold(a.areaName).includes(name) || fold(a.town ?? '').includes(name) || fold(a.county).startsWith(name)).sort((a, b) => (b.pop2023 ?? 0) - (a.pop2023 ?? 0))[0]);
    // The place's own Census figures (tools/homes/census.py), from November 17, 2026: until then its rent was HUD's for
    // its county and its price NAHB's national average for a new house. The release the game's day could know: the
    // 2020-2024 estimates from January 29, 2026, the 2019-2023 before (and, before December 12, 2024, retrospectively).
    const year = day >= DATASETS['US-ACS-2024'].availableFrom ? '2024' : '2023';
    const acsId = `US-ACS-${year}` as const;
    const pack = await fetchJson<{ places: Record<string, CensusPlace>; counties: Record<string, { name: string; value: Record<string, number> }> }>(CENSUS[`../../data/homes/census/${st}.json`]);
    const own = pack?.places[placeId.replace(/^gn:/, '')];
    const rentRow = own?.rent[year];
    if (rentRow) {
      ev.rent = { byBedrooms: rentRow.map((d) => toLocal(d * 100)), evidence: { basis: 'benchmark', sourceId: acsId, ...dated(`The Census Bureau's median gross rent (rent plus utilities) in ${own!.name}, by bedrooms, from the American Community Survey ${Number(year) - 4}-${year}: every renter's rent, long tenancies too, so a new tenancy often costs more.`, acsId, day) } };
      ev.nearby.push({ label: `Census median rent, ${own!.name}`, detail: `${Number(year) - 4}-${year} survey: ${rentRow.map((d, i) => `${i === 0 ? 'studio' : `${i} bed`} $${d.toLocaleString('en-US')}`).join(', ')} a month (gross rent).` });
    }
    if (match) {
      const where = match.town ? `${match.town}, ${match.county}` : match.county;
      if (!ev.rent) ev.rent = { byBedrooms: match.revised.map((d) => toLocal(d * 100)), original: match.original?.map((d) => toLocal(d * 100)), evidence: { basis: 'benchmark', sourceId: 'US-HUD', ...dated(`HUD's FY2026 Fair Market Rent for ${where} (${match.areaName}): a 40th-percentile gross rent (rent plus utilities), not an asking rent.`, 'US-HUD', day) } };
      ev.nearby.push({ label: `HUD Fair Market Rent, ${where}`, detail: `FY2026, revised: ${match.revised.map((d, i) => `${i === 0 ? 'studio' : `${i} bed`} $${d.toLocaleString('en-US')}`).join(', ')} a month (gross rent).` });
    }
    const bench = await fetchJson<{ nahb: { sales_price: number; finished_area_sqft: number; finished_lot_cost: number }; eia: { geography: string; geography_type: string; residential_us_cents_per_kwh_2025: number }[] }>(BENCH['../../data/homes/benchmarks.json']);
    const countyRow = county ? pack?.counties[county] : undefined;
    const median = own?.value[year] ? { value: own.value[year], name: own.name, scope: 'place' as const } : countyRow?.value[year] ? { value: countyRow.value[year], name: countyRow.name, scope: 'county' as const } : undefined;
    if (median) {
      const trend = await priceTrend(county, st, year, day);
      const perM2 = (median.value * 100 * trend.factor) / HOME_M2;
      const whose = median.scope === 'place' ? `in ${median.name}` : `in ${median.name}, as ${place.name} has no figure of its own good enough to use`;
      ev.sale = { houseM2: toLocal(Math.round(perM2)), apartmentM2: toLocal(Math.round(perM2 * 0.85)), scope: median.scope, evidence: { basis: 'benchmark', sourceId: acsId, ...dated(`The Census Bureau's median value of owner-occupied homes ${whose}, from the American Community Survey ${Number(year) - 4}-${year}: $${median.value.toLocaleString('en-US')}, priced by the square metre at the American Housing Survey's median home of 1,800 square feet. ${trend.says} Apartments are priced at 85% of it, the game's assumption.`, acsId, day) } };
      ev.nearby.push({ label: `Census median home value, ${median.name}`, detail: `${Number(year) - 4}-${year} survey: $${median.value.toLocaleString('en-US')}, the value owners put on their homes. Not a sale price.` });
      if (trend.series) ev.nearby.push({ label: `FHFA house price index, ${trend.series}`, detail: trend.says });
    }
    if (bench) {
      if (!ev.sale) {
        const perM2 = Math.round((bench.nahb.sales_price / (bench.nahb.finished_area_sqft * 0.092903)) * 100);
        ev.sale = { houseM2: toLocal(perM2), apartmentM2: toLocal(Math.round(perM2 * 0.85)), evidence: { basis: 'benchmark', sourceId: 'US-NAHB', ...dated("NAHB's 2024 national survey of new single-family homes: an average sales price per square foot, across the country, not this city's market. Apartments are priced at 85% of it, the game's assumption.", 'US-NAHB', day) } };
      }
      ev.land = { perM2: toLocal(Math.round((bench.nahb.finished_lot_cost / 900) * 100)), evidence: { basis: 'benchmark', sourceId: 'US-NAHB', ...dated("NAHB's national average finished-lot cost, spread over a 900 m² lot (the game's assumption): not this town's land price.", 'US-NAHB', day) } };
      const e = bench.eia.find((x) => x.geography === place.region && x.geography_type === 'state_or_district');
      if (e) ev.electricity = { centsPerKwh: e.residential_us_cents_per_kwh_2025, evidence: { basis: 'benchmark', sourceId: 'US-EIA', ...dated(`EIA's 2025 average residential price in ${place.region}: revenue per kWh delivered, not your tariff.`, 'US-EIA', day) } };
    }
  } else if (place.country === 'GB') {
    const bench = await fetchJson<{ ons: { region: string; value: number; observation_period: string; provisional: boolean }[] }>(BENCH['../../data/homes/benchmarks.json']);
    const region = place.region === 'England' || place.region === 'Wales' || place.region === 'Scotland' ? place.region : 'UK';
    const ons = bench?.ons.find((o) => o.region === region);
    if (ons) {
      const avg = ons.value * 100;
      // A population average: the game spreads it by size, a studio at 70% and each bedroom more, as its own model.
      ev.rent = { byBedrooms: [0.7, 0.85, 1.05, 1.3, 1.6].map((f) => exchange(Math.round(avg * f), 'GBP', currency, day) ?? Math.round(avg * f)), evidence: { basis: 'benchmark', sourceId: 'GB-ONS', ...dated(`ONS's average private rent in ${region}, ${ons.observation_period} (provisional): £${ons.value.toLocaleString('en-GB')} a month across all homes. Spread by size by the game.`, 'GB-ONS', day) } };
      ev.nearby.push({ label: `ONS average private rent, ${region}`, detail: `£${ons.value.toLocaleString('en-GB')} a month, ${ons.observation_period}, provisional. An average across all rented homes, not a listing.` });
    }
  } else if (place.country === 'FR') {
    // The place's own commune, by its INSEE code (tools/homes/place-codes.mjs), from November 17, 2026: until then by
    // name across all of France, so one Saint-Martin could be priced from another's sales. Paris, Lyon and Marseille
    // are recorded by arrondissement: the city is its arrondissements together.
    const codes = await fetchJson<Record<string, string>>(FR_CODES['../../data/homes/fr/communes.json']);
    const code = codes?.[placeId.replace(/^gn:/, '')];
    const ARRONDISSEMENTS: Record<string, RegExp> = { '75056': /^751\d\d$/, '69123': /^6938\d$/, '13055': /^132\d\d$/ };
    const communes: { code: string; name: string; house: { sales: number; medianPricePerM2Eur: number; medianFloorAreaM2: number } | null; apartment: { sales: number; medianPricePerM2Eur: number; medianFloorAreaM2: number } | null }[] = [];
    if (code) {
      const dept = code.startsWith('97') ? code.slice(0, 3) : code.slice(0, 2);
      const pack = await fetchJson<{ communes: typeof communes }>(FR[`../../data/homes/fr/${dept}.json`]);
      for (const c of pack?.communes ?? []) if (c.code === code || ARRONDISSEMENTS[code]?.test(c.code)) communes.push(c);
    }
    if (communes.length) {
      const wavg = (k: 'house' | 'apartment') => { const xs = communes.filter((c) => c[k]); const n = xs.reduce((a, c) => a + c[k]!.sales, 0); return n ? Math.round(xs.reduce((a, c) => a + c[k]!.medianPricePerM2Eur * c[k]!.sales, 0) / n) : undefined; };
      const h = wavg('house'), a = wavg('apartment');
      const sales = communes.reduce((s, c) => s + (c.house?.sales ?? 0) + (c.apartment?.sales ?? 0), 0);
      const eur = (v: number | undefined) => (v === undefined ? undefined : exchange(v * 100, 'EUR', currency, day) ?? v * 100);
      ev.sale = { houseM2: eur(h ?? a), apartmentM2: eur(a ?? h), records: sales, evidence: { basis: 'historical-sales', sourceId: 'FR-DVF-2025', ...dated(`Recorded 2025 sales in ${place.name} (DVF, ${sales.toLocaleString('en-US')} single-home sales): the median price per square metre. Past sales, not homes for sale now.`, 'FR-DVF-2025', day) } };
      ev.nearby.push({ label: `Recorded 2025 sales, ${place.name}`, detail: `${sales.toLocaleString('en-US')} sales of a single house or flat (DVF). Median ${a ? `€${a.toLocaleString('en-US')}/m² for flats` : ''}${a && h ? ', ' : ''}${h ? `€${h.toLocaleString('en-US')}/m² for houses` : ''}. Historical, not available now.` });
    }
  } else if (place.country === 'SG') {
    const towns = await fetchJson<{ towns: { town: string; file: string; transactions: number; medianPriceLast12: number | null }[] }>(SG['../../data/homes/sg/towns.json']);
    // The place's own HDB town only (from November 17, 2026: until then a place that wasn't an HDB town was given a
    // random town's resales, a neighbour's records counted as its own).
    const t = towns?.towns.find((x) => fold(x.town) === fold(place.name));
    if (t) {
      const pack = await fetchJson<{ dict: { month: string[]; flatType: string[]; storey: string[] }; rows: (number | string | null)[][] }>(SG[`../../data/homes/sg/${t.file}.json`]);
      const byType: NonNullable<MarketEvidence['hdb']>['byType'] = {};
      for (const r of pack?.rows ?? []) {
        const month = pack!.dict.month[r[1] as number];
        if (month < '2025-11' || month > day.slice(0, 7)) continue; // the year to the game's month; never a sale after today
        const type = pack!.dict.flatType[r[2] as number];
        (byType[type] ??= []).push({ price: (r[10] as number) * 100, area: r[6] as number, storey: pack!.dict.storey[r[5] as number], leaseFrom: r[8] as number, remainingMonths: r[9] as number | null });
      }
      ev.hdb = { town: t.town, byType, evidence: { basis: 'historical-sales', sourceId: 'SG-HDB', says: `Recorded HDB resales in ${t.town} in the year to this month (data.gov.sg): prices, flat types and storey bands of past sales, not flats for sale now.` } };
      ev.nearby.push({ label: `Recorded HDB resales, ${t.town}`, detail: `${t.transactions.toLocaleString('en-US')} resales since January 2017; the median in the last year S$${(t.medianPriceLast12 ?? 0).toLocaleString('en-US')}. Block and street only: no unit is recorded.` });
    }
  }
  return ev;
}

// ---------------- Offers ----------------

const PALETTE = { wall: ['white', 'cream', 'grey', 'terracotta', 'sage', 'navy', 'sand'], roof: ['charcoal', 'red', 'brown', 'grey', 'green'], frame: ['white', 'black', 'oak', 'grey'], door: ['red', 'navy', 'black', 'green', 'yellow', 'oak'] };
function designFor(rng: Rng, form: Form, floorAreaM2: number, plotAreaM2: number | null, warm: boolean): Design {
  const r = rng;
  const building = inBuilding(form);
  const floors = building ? intBetween(rng, form === 'hdb-flat' ? 10 : 4, form === 'hdb-flat' ? 25 : 14) : form === 'townhouse' ? intBetween(rng, 2, 3) : intBetween(rng, 1, 2);
  // A building's footprint holds several homes a floor (the game's model); a house's is its floor area over its floors.
  const footprint = building ? floorAreaM2 * intBetween(rng, 3, 6) : floorAreaM2 / floors;
  const widthM = Math.max(6, Math.round(Math.sqrt(footprint * (building ? 2 : 1.3))));
  const depthM = Math.max(5, Math.round(footprint / widthM));
  const detached = form === 'detached';
  return {
    revision: 1,
    style: building ? (form === 'hdb-flat' ? 'tower' : pick(rng, ['modernist', 'traditional', 'tower'] as const)) : form === 'townhouse' ? 'terrace' : pick(rng, ['contemporary', 'traditional', 'cottage'] as const),
    floors, widthM, depthM,
    roof: building ? 'flat' : pick(rng, ['gable', 'hip', 'gable', 'flat'] as const),
    roofMaterial: building ? 'membrane' : pick(rng, ['tile', 'slate', 'metal', 'shingle'] as const),
    roofColor: pick(rng, PALETTE.roof),
    walls: building ? pick(rng, ['concrete', 'brick', 'render', 'glass'] as const) : pick(rng, ['brick', 'render', 'timber', 'stone'] as const),
    wallColor: pick(rng, PALETTE.wall),
    windowsPerFloor: building ? intBetween(rng, 4, 8) : intBetween(rng, 2, 4),
    windowStyle: building ? pick(rng, ['ribbon', 'picture'] as const) : pick(rng, ['sash', 'casement', 'picture'] as const),
    frameColor: pick(rng, PALETTE.frame),
    door: pick(rng, ['panel', 'glazed', 'flush'] as const),
    doorColor: pick(rng, PALETTE.door),
    balconies: building ? intBetween(rng, 0, Math.max(0, floors - 1)) : detached && floors > 1 ? intBetween(rng, 0, 1) : 0,
    garage: detached ? pick(rng, ['none', 'single', 'double', 'carport'] as const) : 'none',
    driveway: detached ? pick(rng, ['gravel', 'paved', 'none'] as const) : 'none',
    landscaping: building ? 'none' : plotAreaM2 && plotAreaM2 > 300 ? pick(rng, ['lawn', 'garden', 'trees'] as const) : 'lawn',
    // A private pool only where the summers are hot and the winters mild: never a pool for a house in Anchorage.
    outdoor: detached && warm && plotAreaM2 && plotAreaM2 > 700 && r() < 0.2 ? ['pool', 'terrace'] : detached && r() < 0.4 ? ['porch'] : [],
  };
}
function conditionFor(r: Rng): Condition {
  const g = () => (r() < 0.6 ? 'good' : r() < 0.85 ? 'fair' : 'poor') as Condition['roof'];
  return { roof: g(), structure: r() < 0.9 ? 'good' : 'fair', plumbing: g(), electrical: g(), heating: g(), finishes: g() };
}
const LAYOUT: Record<number, [RoomKind, number][]> = {
  0: [['living', 22], ['kitchen', 6], ['bathroom', 4]],
  1: [['living', 18], ['kitchen', 8], ['bedroom', 12], ['bathroom', 5]],
  2: [['living', 20], ['kitchen', 10], ['bedroom', 13], ['bedroom', 10], ['bathroom', 6], ['laundry', 4]],
  3: [['living', 24], ['kitchen', 12], ['dining', 10], ['bedroom', 14], ['bedroom', 11], ['bedroom', 10], ['bathroom', 6], ['half-bath', 3], ['laundry', 5]],
  4: [['living', 28], ['kitchen', 14], ['dining', 12], ['bedroom', 15], ['bedroom', 12], ['bedroom', 11], ['bedroom', 10], ['bathroom', 7], ['bathroom', 5], ['laundry', 6], ['office', 9]],
};
const fmt = (n: number) => n.toLocaleString('en-US');

/** The month's offers in a place: rentals, homes for sale and building plots, every one simulated, each with its basis. */
/**
 * Each place's own housing market (from November 17, 2026: the owner's brief, sections 2, 4 and 9): fifty homes and
 * plots kept for good, each with its own identity, kind, size, condition and design. Each comes onto the market in its
 * own three-month windows and leaves again, so the market changes a little each month and a home seen once is the same
 * home when it returns. Until then twelve unrelated offers were drawn afresh each month.
 * They are all the game's: none is a verified home or a real listing (docs/homes/places has each place's shortfall).
 * Asking prices are the evidence's, varied a little from listing to listing; no trend is modeled, as no source gives one.
 */
export const MARKET_SIZE = 50;
const monthIndex = (day: string) => Number(day.slice(0, 4)) * 12 + Number(day.slice(5, 7)) - 1;
const monthStart = (m: number) => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, '0')}-01`;
/** The mix of homes a place of this size has: a city's flats, a village's houses (the game's model, by population). */
export function localMix(place: Place): { rent: number; sale: number; land: number; forms: Form[]; warm: boolean; label: string } {
  const pop = place.population ?? 1_000_000; // the catalog's own cities carry no population: all are large cities
  const warm = place.climate.warmHigh >= 28 && place.climate.coldHigh >= 8;
  if (pop >= 500_000) return { rent: 26, sale: 21, land: 3, warm, label: 'a large city', forms: ['apartment', 'apartment', 'apartment', 'apartment', 'condo', 'condo', 'townhouse', 'townhouse', 'detached', 'detached'] };
  if (pop >= 100_000) return { rent: 25, sale: 22, land: 3, warm, label: 'a city', forms: ['apartment', 'apartment', 'apartment', 'condo', 'townhouse', 'townhouse', 'detached', 'detached', 'detached', 'detached'] };
  if (pop >= 10_000) return { rent: 22, sale: 23, land: 5, warm, label: 'a town', forms: ['apartment', 'townhouse', 'detached', 'detached', 'detached', 'detached', 'detached', 'detached'] };
  return { rent: 18, sale: 26, land: 6, warm, label: 'a village or small town', forms: ['apartment', 'townhouse', 'detached', 'detached', 'detached', 'detached', 'detached', 'detached', 'detached', 'detached'] };
}
/** Every home of the place's market, listed or not this month: the same homes every month, by their own ids. */
export function marketPool(seed: number, ev: MarketEvidence, day: string): (Home & { listed: boolean })[] {
  const place = getPlace(ev.placeId);
  const mix = localMix(place);
  const m = monthIndex(day);
  const out: (Home & { listed: boolean })[] = [];
  const usd = (cents: number) => exchange(cents, 'USD', ev.currency, day) ?? cents;
  const placeholder = (what: string): Evidence => ({ basis: 'model', sourceId: 'SLATE-MODEL', says: `No ${what} for ${place.name} has been researched. This price is the game's placeholder, not local evidence.` });
  for (let i = 0; i < MARKET_SIZE; i++) {
    const id = `hm:${ev.placeId}:${i}`;
    const r = stream(seed, 'market-home', ev.placeId, i);
    const next = r;
    const kind: 'rent' | 'sale' | 'land' = i < mix.rent ? 'rent' : i < mix.rent + mix.sale ? 'sale' : 'land';
    // Its listing windows: three months each, staggered by home, so no two months' markets are wholly different.
    const offset = Math.floor(unit(seed, 'market-offset', ev.placeId, i) * 3);
    const block = Math.floor((m + offset) / 3);
    const listed = unit(seed, 'market-listed', ev.placeId, i, block) < (kind === 'land' ? 0.8 : 0.35);
    const listingFactor = 0.97 + unit(seed, 'market-price', ev.placeId, i, block) * 0.06;
    const from = monthStart(block * 3 - offset);
    const until = addDaysToKey(monthStart(block * 3 - offset + 3), -1);
    const listing = { availableFrom: from > day ? from : day, validUntil: until, listed };
    if (kind === 'land') {
      const plot = intBetween(r, 6, 20) * 50;
      const perM2 = ev.land?.perM2 ?? usd(PLACEHOLDER.landPerM2Usd * 100);
      out.push({ ...baseHome(place, ev, id, 'land', 'freehold', 'sale', `Building Plot, ${fmt(plot)} m²`, Math.round((perM2 * plot * (0.8 + next() * 0.5) * listingFactor) / 100) * 100, [ev.land?.evidence ?? placeholder('land prices')], null, null, 0, plot, [], day, next, mix.warm, {
        land: { access: next() < 0.8 ? 'road' : 'track', services: next() < 0.5 ? 'connected' : next() < 0.8 ? 'nearby' : 'unknown', buildableM2: null, investigated: [] },
      }), ...listing });
      continue;
    }
    if (ev.hdb && kind === 'sale') {
      const types = Object.keys(ev.hdb.byType).filter((t) => ev.hdb!.byType[t].length >= 3);
      if (types.length) {
        const type = pick(r, types);
        const xs = ev.hdb.byType[type];
        const ex = xs[intBetween(r, 0, xs.length - 1)];
        const sorted = xs.map((x) => x.price).sort((a, b) => a - b);
        const med = sorted[sorted.length >> 1];
        const beds = Math.max(1, Math.min(4, Number(/^(\d)/.exec(type)?.[1] ?? 3) - 1));
        out.push({ ...baseHome(place, ev, id, 'hdb-flat', 'hdb-lease', 'sale', `${type} HDB Flat, ${ev.hdb.town}`, Math.round(med * (0.92 + next() * 0.16) * listingFactor / 100) * 100, [ev.hdb.evidence], beds, 1, ex.area, null, LAYOUT[beds], day, next, mix.warm, {
          sourceLabel: `${type} (HDB's flat type, not a bedroom count)`, storeyBand: ex.storey, leaseYearsLeft: ex.remainingMonths ? Math.floor(ex.remainingMonths / 12) : undefined, sharedAmenities: ['Shared Playground', 'Void Deck'],
        }), ...listing });
        continue;
      }
    }
    const beds = kind === 'rent' ? intBetween(r, mix.label === 'a village or small town' ? 1 : 0, 3) : intBetween(r, 1, 4);
    const layout = LAYOUT[beds];
    const roomsM2 = layout.reduce((x, [, a2]) => x + a2, 0);
    const area = Math.round(roomsM2 * (1.15 + next() * 0.25));
    const form: Form = beds === 0 ? 'studio' : pick(r, mix.forms);
    const plot = form === 'detached' ? Math.round(area * (2.5 + next() * 4)) : form === 'townhouse' ? Math.round(area * 0.9) : null;
    // A building's shared pool where it's warm or it's a big city's block; most buildings have only a bicycle store.
    const shared = inBuilding(form) && (mix.warm || mix.label === 'a large city') && next() < 0.35 ? ['Shared Building Pool', 'Shared Gym'] : inBuilding(form) ? ['Shared Bicycle Store'] : [];
    if (kind === 'rent') {
      const bench = ev.rent?.byBedrooms[beds];
      const included = bench && next() < 0.5 ? (['water', 'heating'] as const) : ([] as const);
      // A gross-rent benchmark includes utilities; without them the rent is the benchmark less the game's utilities allowance.
      const price = bench ? Math.round((bench * (0.85 + next() * 0.45) * (included.length ? 1 : 0.88) * listingFactor) / 100) * 100 : Math.round((usd(PLACEHOLDER.rentPerM2Usd * 100) * area * (0.8 + next() * 0.5) * listingFactor) / 100) * 100;
      out.push({ ...baseHome(place, ev, id, form, 'rent', 'rent', `${beds === 0 ? 'Studio' : `${beds}-Bedroom ${form === 'detached' ? 'House' : form === 'townhouse' ? 'Townhouse' : 'Apartment'}`} To Rent`, price, [ev.rent?.evidence ?? placeholder('rents')], beds, beds >= 3 ? 2 : 1, area, plot, layout, day, next, mix.warm, {
        included: [...included], furnished: next() < 0.3, sharedAmenities: shared,
      }), ...listing });
    } else {
      const perM2 = ev.sale ? (inBuilding(form) ? ev.sale.apartmentM2 : ev.sale.houseM2) : undefined;
      const price = Math.round(((perM2 ?? usd(PLACEHOLDER.salePerM2Usd * 100)) * area * (0.82 + next() * 0.4) * listingFactor) / 100 / 1000) * 100000;
      const tenure = form === 'condo' || form === 'apartment' ? 'strata' : place.country === 'KE' ? 'leasehold' : 'freehold';
      out.push({ ...baseHome(place, ev, id, form, tenure, 'sale', `${beds}-Bedroom ${form === 'detached' ? 'House' : form === 'townhouse' ? 'Townhouse' : form === 'condo' ? 'Condominium' : 'Apartment'} For Sale`, price, [ev.sale?.evidence ?? placeholder('purchase prices')], beds, beds >= 3 ? 2 : 1, area, plot, layout, day, next, mix.warm, {
        sharedAmenities: shared,
        buildingChargeMinor: inBuilding(form) ? Math.round((usd(250 * 100) * (0.6 + next())) / 100) * 100 : undefined,
      }), ...listing });
    }
  }
  return out;
}
/** What's on the market in a place this month: the homes of its market that are listed now. */
export function offersIn(seed: number, ev: MarketEvidence, day: string): Home[] {
  return marketPool(seed, ev, day).filter((h) => h.listed).map(({ listed: _l, ...h }) => h);
}

function baseHome(place: Place, ev: MarketEvidence, id: string, form: Form, tenure: Home['tenure'], market: Home['market'], title: string, priceMinor: number, evidence: Evidence[], bedrooms: number | null, bathrooms: number | null, floorAreaM2: number, plotAreaM2: number | null, layout: [RoomKind, number][], day: string, next: Rng, warm: boolean, extra: Partial<Home> = {}): Home {
  const design = designFor(next, form, Math.max(40, floorAreaM2), plotAreaM2, warm);
  const rooms: Room[] = form === 'land' ? [] : roomsFrom(layout, `${id}:`);
  const privateAmenities = [
    ...(design.outdoor.includes('pool') ? ['Private Pool'] : []),
    ...(!inBuilding(form) && form !== 'land' && plotAreaM2 ? ['Garden'] : []),
    ...(design.garage !== 'none' ? [design.garage === 'carport' ? 'Carport' : `${design.garage === 'double' ? 'Double' : 'Single'} Garage`] : []),
    ...(design.balconies > 0 && !inBuilding(form) ? ['Balcony'] : inBuilding(form) && next() < 0.5 ? ['Balcony'] : []),
  ];
  return {
    id, placeId: place.id, country: place.country, scopes: scopesOf(place, form), form, tenure, market, title: `${title}, ${place.name}`, currency: ev.currency, priceMinor, evidence,
    bedrooms, bathrooms, floorAreaM2, plotAreaM2, rooms, privateAmenities, sharedAmenities: [], included: [], condition: conditionFor(next), design, furnished: false,
    landlordItems: market === 'rent' ? ['Refrigerator', 'Cooker'] : [], availableFrom: addDaysToKey(day, Math.round(unit(id, 'from') * 20)), validUntil: addDaysToKey(day, 30),
    coastal: place.coastal,
    electricity: ev.electricity && ev.currency === 'USD' ? { minorPerKwh: ev.electricity.centsPerKwh, says: ev.electricity.evidence.says } : { minorPerKwh: Math.round(exchange(Math.round(RUNNING_USD.placeholderKwhPrice * 10000), 'USD', ev.currency, day) ?? 2200) / 100, says: "The game's placeholder electricity price: no tariff or average price for this place has been researched." },
    ...extra,
  };
}

// ---------------- Appliances ----------------

const APPLIANCES = import.meta.glob<string>('../../data/homes/appliances/*.json', { query: '?url', import: 'default', eager: true });
type ApplianceCategory = 'refrigerators' | 'washers' | 'dryers' | 'dishwashers' | 'room_ac';
/**
 * One category of EPA's ENERGY STAR records, loaded when the player opens it, filtered by brand or model and capped.
 * The records carry sizes and certified test energy; never a price, a stock level or a clearance.
 */
export async function applianceCatalog(category: ApplianceCategory, query = '', limit = 40): Promise<{ total: number; items: import('./living').CatalogItem[] }> {
  const pack = await fetchJson<{ source: string; columns: string[]; rows: (string | number | null)[][] }>(APPLIANCES[`../../data/homes/appliances/${category}.json`]);
  if (!pack) return { total: 0, items: [] };
  const c = Object.fromEntries(pack.columns.map((k, i) => [k, i]));
  const q = fold(query);
  const rows = q ? pack.rows.filter((r) => fold(`${r[c.brand]} ${r[c.model]}`).includes(q)) : pack.rows;
  const num = (v: unknown) => (typeof v === 'number' ? v : null);
  return {
    total: rows.length,
    items: rows.slice(0, limit).map((r) => ({
      category, name: `${r[c.brand]} ${r[c.model]}`, sourceId: pack.source, recordId: String(r[c.id]), brand: String(r[c.brand]), model: String(r[c.model]),
      markets: (r[c.markets] as string | null) ?? null, onMarketFrom: (r[c.onMarketFrom] as string | null) ?? null,
      widthIn: num(r[c.widthIn]), depthIn: num(r[c.depthIn]), heightIn: num(r[c.heightIn]), annualKwh: num(r[c.annualTestKwh]),
      fuel: (r[c.fuel] as string | null) ?? null, venting: (r[c.venting] as string | null) ?? null,
    })),
  };
}

// ---------------- Coverage, place by place ----------------

/** The owner's target: fifty distinct homes at real, verified addresses in every place's own market. */
export const VERIFIED_TARGET = 50;
/**
 * Homes at real, verified addresses, by place: none. No permitted source the game holds gives a home's verified
 * specification, price and availability at a real address: HM Land Registry's and Overture's addresses were not
 * imported (their terms don't permit it), DVF's sales can't be republished row by row, and HDB records a block, never
 * a unit. docs/homes/places/ lists every place's shortfall. A source that permits it adds its count here, by place.
 */
export const VERIFIED_HOMES: Readonly<Record<string, number>> = {};
export interface Coverage {
  placeId: string; market: string;
  verifiedHomes: number; datedListings: number; shortfall: number;
  recordedSales: { source: string; count: number } | null;
  rentEvidence: string; saleEvidence: string;
  simulatedHomes: number; types: string[];
}
/** What the game holds for one place's housing market, kept apart by kind: verified, listed, recorded, statistics, simulated. */
export function coverageOf(place: Place, ev: MarketEvidence): Coverage {
  const verified = VERIFIED_HOMES[place.id] ?? 0;
  const mix = localMix(place);
  const hdbSales = ev.hdb ? Object.values(ev.hdb.byType).reduce((a, xs) => a + xs.length, 0) : 0;
  const tier = (e: Evidence | undefined, what: string) => !e ? `none: ${what} are the game's estimate` : e.sourceId === 'US-HUD' ? 'HUD Fair Market Rent for its county' : e.sourceId.startsWith('US-ACS') ? (what === 'prices' && ev.sale?.scope === 'county' ? "Census median for its county (not the place's own)" : 'Census median for the place itself') : e.sourceId === 'GB-ONS' ? "ONS average rent for its nation (not the city's own)" : e.sourceId === 'US-NAHB' ? "NAHB's national average (not the city's own)" : e.sourceId === 'FR-DVF-2025' ? 'DVF 2025 recorded sales in its own commune' : e.sourceId === 'SG-HDB' ? 'HDB resales in its own town' : e.sourceId;
  return {
    placeId: place.id, market: mix.label,
    verifiedHomes: verified, datedListings: 0, shortfall: Math.max(0, VERIFIED_TARGET - verified),
    recordedSales: ev.hdb ? { source: 'SG-HDB', count: hdbSales } : ev.sale?.evidence.sourceId === 'FR-DVF-2025' ? { source: 'FR-DVF-2025', count: ev.sale.records ?? 0 } : null,
    rentEvidence: tier(ev.rent?.evidence, 'rents'),
    saleEvidence: ev.hdb ? tier(ev.hdb.evidence, 'prices') : tier(ev.sale?.evidence, 'prices'),
    simulatedHomes: MARKET_SIZE,
    types: [...new Set([...(place.country === 'SG' && ev.hdb ? ['hdb-flat'] : []), ...mix.forms, 'studio', 'land'])].map((f) => FORM_WORDS[f as Form]),
  };
}
