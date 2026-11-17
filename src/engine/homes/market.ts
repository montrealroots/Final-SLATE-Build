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
import RULES from '../../data/homes/rules.json';
import {
  PLACEHOLDER, RUNNING_USD, inBuilding, roomsFrom, scopesOf,
  type Condition, type Design, type Evidence, type Form, type Home, type Room, type RoomKind, type ScopedRule,
} from './model';

export const HOME_RULES = RULES as unknown as ScopedRule[];

const HUD = import.meta.glob<string>('../../data/homes/hud/*.json', { query: '?url', import: 'default', eager: true });
const FR = import.meta.glob<string>('../../data/homes/fr/*.json', { query: '?url', import: 'default', eager: true });
const SG = import.meta.glob<string>('../../data/homes/sg/*.json', { query: '?url', import: 'default', eager: true });
const BENCH = import.meta.glob<string>('../../data/homes/benchmarks.json', { query: '?url', import: 'default', eager: true });
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
  sale?: { houseM2?: number; apartmentM2?: number; evidence: Evidence; medianAreaM2?: number };
  /** Singapore: the HDB town and its recent resales by flat type. */
  hdb?: { town: string; byType: Record<string, { price: number; area: number; storey: string; leaseFrom: number; remainingMonths: number | null }[]>; evidence: Evidence };
  /** Recorded sales nearby, for the player to read: never "available now". */
  nearby: { label: string; detail: string }[];
  /** Average delivered electricity price, US cents per kWh, where EIA gives the state's. Not a tariff. */
  electricity?: { centsPerKwh: number; evidence: Evidence };
  land?: { perM2: number; evidence: Evidence };
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
    const name = fold(place.name);
    const match = hud?.areas.filter((a) => fold(a.areaName).includes(name) || fold(a.town ?? '').includes(name) || fold(a.county).startsWith(name)).sort((a, b) => (b.pop2023 ?? 0) - (a.pop2023 ?? 0))[0];
    if (match) {
      ev.rent = { byBedrooms: match.revised.map((d) => toLocal(d * 100)), original: match.original?.map((d) => toLocal(d * 100)), evidence: { basis: 'benchmark', sourceId: 'US-HUD', says: `HUD's FY2026 Fair Market Rent for ${match.areaName}: a 40th-percentile gross rent (rent plus utilities), not an asking rent.` } };
      ev.nearby.push({ label: `HUD Fair Market Rent, ${match.areaName}`, detail: `FY2026, revised: ${match.revised.map((d, i) => `${i === 0 ? 'studio' : `${i} bed`} $${d.toLocaleString('en-US')}`).join(', ')} a month (gross rent).` });
    }
    const bench = await fetchJson<{ nahb: { sales_price: number; finished_area_sqft: number; finished_lot_cost: number }; eia: { geography: string; geography_type: string; residential_us_cents_per_kwh_2025: number }[] }>(BENCH['../../data/homes/benchmarks.json']);
    if (bench) {
      const perM2 = Math.round((bench.nahb.sales_price / (bench.nahb.finished_area_sqft * 0.092903)) * 100);
      ev.sale = { houseM2: toLocal(perM2), apartmentM2: toLocal(Math.round(perM2 * 0.85)), evidence: { basis: 'benchmark', sourceId: 'US-NAHB', says: "NAHB's 2024 national survey of new single-family homes: an average sales price per square foot, across the country, not this city's market. Apartments are priced at 85% of it, the game's assumption." } };
      ev.land = { perM2: toLocal(Math.round((bench.nahb.finished_lot_cost / 900) * 100)), evidence: { basis: 'benchmark', sourceId: 'US-NAHB', says: "NAHB's national average finished-lot cost, spread over a 900 m² lot (the game's assumption): not this town's land price." } };
      const e = bench.eia.find((x) => x.geography === place.region && x.geography_type === 'state_or_district');
      if (e) ev.electricity = { centsPerKwh: e.residential_us_cents_per_kwh_2025, evidence: { basis: 'benchmark', sourceId: 'US-EIA', says: `EIA's 2025 average residential price in ${place.region}: revenue per kWh delivered, not your tariff.` } };
    }
  } else if (place.country === 'GB') {
    const bench = await fetchJson<{ ons: { region: string; value: number; observation_period: string; provisional: boolean }[] }>(BENCH['../../data/homes/benchmarks.json']);
    const region = place.region === 'England' || place.region === 'Wales' || place.region === 'Scotland' ? place.region : 'UK';
    const ons = bench?.ons.find((o) => o.region === region);
    if (ons) {
      const avg = ons.value * 100;
      // A population average: the game spreads it by size, a studio at 70% and each bedroom more, as its own model.
      ev.rent = { byBedrooms: [0.7, 0.85, 1.05, 1.3, 1.6].map((f) => toLocal(Math.round(avg * f))), evidence: { basis: 'benchmark', sourceId: 'GB-ONS', says: `ONS's average private rent in ${region}, ${ons.observation_period} (provisional): £${ons.value.toLocaleString('en-GB')} a month across all homes. Spread by size by the game.` } };
      ev.nearby.push({ label: `ONS average private rent, ${region}`, detail: `£${ons.value.toLocaleString('en-GB')} a month, ${ons.observation_period}, provisional. An average across all rented homes, not a listing.` });
    }
  } else if (place.country === 'FR') {
    const index = await fetchJson<{ departments: Record<string, [string, string][]> }>(FR['../../data/homes/fr/index.json']);
    const name = fold(place.name);
    const depts = Object.entries(index?.departments ?? {}).filter(([, cs]) => cs.some(([, n]) => fold(n) === name || fold(n).startsWith(`${name} `)));
    const communes: { name: string; house: { sales: number; medianPricePerM2Eur: number; medianFloorAreaM2: number } | null; apartment: { sales: number; medianPricePerM2Eur: number; medianFloorAreaM2: number } | null; lastObserved: string }[] = [];
    for (const [d] of depts.slice(0, 2)) {
      const pack = await fetchJson<{ communes: typeof communes & { name: string }[] }>(FR[`../../data/homes/fr/${d}.json`]);
      for (const c of pack?.communes ?? []) if (fold(c.name) === name || fold(c.name).startsWith(`${name} `)) communes.push(c);
    }
    if (communes.length) {
      const wavg = (k: 'house' | 'apartment') => { const xs = communes.filter((c) => c[k]); const n = xs.reduce((a, c) => a + c[k]!.sales, 0); return n ? Math.round(xs.reduce((a, c) => a + c[k]!.medianPricePerM2Eur * c[k]!.sales, 0) / n) : undefined; };
      const h = wavg('house'), a = wavg('apartment');
      const sales = communes.reduce((s, c) => s + (c.house?.sales ?? 0) + (c.apartment?.sales ?? 0), 0);
      const eur = (v: number | undefined) => (v === undefined ? undefined : exchange(v * 100, 'EUR', currency, day) ?? v * 100);
      ev.sale = { houseM2: eur(h ?? a), apartmentM2: eur(a ?? h), evidence: { basis: 'historical-sales', sourceId: 'FR-DVF-2025', says: `Recorded 2025 sales in ${place.name} (DVF, ${sales.toLocaleString('en-US')} single-home sales): the median price per square metre. Past sales, not homes for sale now.` } };
      ev.nearby.push({ label: `Recorded 2025 sales, ${place.name}`, detail: `${sales.toLocaleString('en-US')} sales of a single house or flat (DVF). Median ${a ? `€${a.toLocaleString('en-US')}/m² for flats` : ''}${a && h ? ', ' : ''}${h ? `€${h.toLocaleString('en-US')}/m² for houses` : ''}. Historical, not available now.` });
    }
  } else if (place.country === 'SG') {
    const towns = await fetchJson<{ towns: { town: string; file: string; transactions: number; medianPriceLast12: number | null }[] }>(SG['../../data/homes/sg/towns.json']);
    const t = towns?.towns.find((x) => fold(x.town) === fold(place.name)) ?? pick(stream(placeId, 'sg-town'), (towns?.towns ?? []).filter((x) => x.medianPriceLast12));
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
function designFor(rng: Rng, form: Form, floorAreaM2: number, plotAreaM2: number | null): Design {
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
    balconies: building ? intBetween(rng, 0, floors) : detached && floors > 1 ? intBetween(rng, 0, 1) : 0,
    garage: detached ? pick(rng, ['none', 'single', 'double', 'carport'] as const) : 'none',
    driveway: detached ? pick(rng, ['gravel', 'paved', 'none'] as const) : 'none',
    landscaping: building ? 'none' : plotAreaM2 && plotAreaM2 > 300 ? pick(rng, ['lawn', 'garden', 'trees'] as const) : 'lawn',
    outdoor: detached && plotAreaM2 && plotAreaM2 > 700 && r() < 0.2 ? ['pool', 'terrace'] : detached && r() < 0.4 ? ['porch'] : [],
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
export function offersIn(seed: number, ev: MarketEvidence, day: string): Home[] {
  const place = getPlace(ev.placeId);
  const month = day.slice(0, 7);
  const out: Home[] = [];
  const usd = (cents: number) => exchange(cents, 'USD', ev.currency, day) ?? cents;
  const placeholder = (what: string): Evidence => ({ basis: 'model', sourceId: 'SLATE-MODEL', says: `No ${what} for ${place.countryName} has been researched. This price is the game's placeholder, not local evidence.` });
  for (let i = 0; i < 12; i++) {
    const r = stream(seed, 'home-offer', ev.placeId, month, i);
    const next = r;
    const kind: 'rent' | 'sale' | 'land' = i < 6 ? 'rent' : i < 11 ? 'sale' : 'land';
    if (kind === 'land') {
      const plot = intBetween(r, 6, 20) * 50;
      const perM2 = ev.land?.perM2 ?? usd(PLACEHOLDER.landPerM2Usd * 100);
      out.push(baseHome(place, ev, `ho:${ev.placeId}:${month}:${i}`, 'land', 'freehold', 'sale', `Building Plot, ${fmt(plot)} m²`, Math.round((perM2 * plot * (0.8 + next() * 0.5)) / 100) * 100, [ev.land?.evidence ?? placeholder('land prices')], null, null, 0, plot, [], day, next, {
        land: { access: next() < 0.8 ? 'road' : 'track', services: next() < 0.5 ? 'connected' : next() < 0.8 ? 'nearby' : 'unknown', buildableM2: null, investigated: [] },
      }));
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
        out.push(baseHome(place, ev, `ho:${ev.placeId}:${month}:${i}`, 'hdb-flat', 'hdb-lease', 'sale', `${type} HDB Flat, ${ev.hdb.town}`, Math.round(med * (0.92 + next() * 0.16) / 100) * 100, [ev.hdb.evidence], beds, 1, ex.area, null, LAYOUT[beds], day, next, {
          sourceLabel: `${type} (HDB's flat type, not a bedroom count)`, storeyBand: ex.storey, leaseYearsLeft: ex.remainingMonths ? Math.floor(ex.remainingMonths / 12) : undefined, sharedAmenities: ['Shared Playground', 'Void Deck'],
        }));
        continue;
      }
    }
    const beds = kind === 'rent' ? intBetween(r, 0, 3) : intBetween(r, 1, 4);
    const layout = LAYOUT[beds];
    const roomsM2 = layout.reduce((a, [, m]) => a + m, 0);
    const area = Math.round(roomsM2 * (1.15 + next() * 0.25));
    const form: Form = beds === 0 ? 'studio' : kind === 'rent' ? pick(r, ['apartment', 'apartment', 'condo', 'townhouse', 'detached'] as const) : pick(r, ['apartment', 'condo', 'townhouse', 'detached', 'detached'] as const);
    const plot = form === 'detached' ? Math.round(area * (2.5 + next() * 4)) : form === 'townhouse' ? Math.round(area * 0.9) : null;
    if (kind === 'rent') {
      const bench = ev.rent?.byBedrooms[beds];
      const included = bench && next() < 0.5 ? (['water', 'heating'] as const) : ([] as const);
      // A gross-rent benchmark includes utilities; without them the rent is the benchmark less the game's utilities allowance.
      const price = bench ? Math.round((bench * (0.85 + next() * 0.45) * (included.length ? 1 : 0.88)) / 100) * 100 : Math.round((usd(PLACEHOLDER.rentPerM2Usd * 100) * area * (0.8 + next() * 0.5)) / 100) * 100;
      out.push(baseHome(place, ev, `ho:${ev.placeId}:${month}:${i}`, form, 'rent', 'rent', `${beds === 0 ? 'Studio' : `${beds}-Bedroom ${form === 'detached' ? 'House' : form === 'townhouse' ? 'Townhouse' : 'Apartment'}`} To Rent`, price, [ev.rent?.evidence ?? placeholder('rents')], beds, beds >= 3 ? 2 : 1, area, plot, layout, day, next, {
        included: [...included], furnished: next() < 0.3, sharedAmenities: inBuilding(form) && next() < 0.35 ? ['Shared Building Pool', 'Shared Gym'] : inBuilding(form) ? ['Shared Bicycle Store'] : [],
      }));
    } else {
      const perM2 = ev.sale ? (inBuilding(form) ? ev.sale.apartmentM2 : ev.sale.houseM2) : undefined;
      const price = Math.round(((perM2 ?? usd(PLACEHOLDER.salePerM2Usd * 100)) * area * (0.82 + next() * 0.4)) / 100 / 1000) * 100000;
      const tenure = form === 'condo' || form === 'apartment' ? 'strata' : place.country === 'KE' ? 'leasehold' : 'freehold';
      out.push(baseHome(place, ev, `ho:${ev.placeId}:${month}:${i}`, form, tenure, 'sale', `${beds}-Bedroom ${form === 'detached' ? 'House' : form === 'townhouse' ? 'Townhouse' : form === 'condo' ? 'Condominium' : 'Apartment'} For Sale`, price, [ev.sale?.evidence ?? placeholder('purchase prices')], beds, beds >= 3 ? 2 : 1, area, plot, layout, day, next, {
        sharedAmenities: inBuilding(form) && next() < 0.35 ? ['Shared Building Pool', 'Shared Gym'] : inBuilding(form) ? ['Shared Bicycle Store'] : [],
        buildingChargeMinor: inBuilding(form) ? Math.round((usd(250 * 100) * (0.6 + next())) / 100) * 100 : undefined,
      }));
    }
  }
  return out;
}

function baseHome(place: Place, ev: MarketEvidence, id: string, form: Form, tenure: Home['tenure'], market: Home['market'], title: string, priceMinor: number, evidence: Evidence[], bedrooms: number | null, bathrooms: number | null, floorAreaM2: number, plotAreaM2: number | null, layout: [RoomKind, number][], day: string, next: Rng, extra: Partial<Home> = {}): Home {
  const design = designFor(next, form, Math.max(40, floorAreaM2), plotAreaM2);
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
