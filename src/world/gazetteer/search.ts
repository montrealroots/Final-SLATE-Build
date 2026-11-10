// Looking for a place in the world gazetteer (GeoNames, CC BY 4.0; see docs/DATA-PROVENANCE.md): a country's places, the
// region names and the climate stations are fetched when someone looks at them; a failed fetch is tried again next time.
// Search never renders a whole country: callers take a bounded slice of the ranked results. Split from gazetteer.ts on
// November 10, 2026, so that only the screens that search for a place load it.

import regionsUrl from './regions.json?url';
import stationsUrl from '../weather/stations.json?url';
import { climateFor, indexStations, readStations, type MonthlyNormals, type StationIndex } from '../climate';
import { findPlace, placeIdForGeoname, registerPlace, type Climate, type Place, type WetSeason } from '../../data/places';
import { countryName, type WorldPlace } from './gazetteer';

export function readShard(country: string, text: string): WorldPlace[] {
  return text.split('\n').filter((l) => l !== '').map((line) => {
    const [id, name, ascii, region, lat, lon, zone, pop, el] = line.split('\t');
    return { id, country, name, ascii, region, lat: Number(lat), lon: Number(lon), zone, population: Number(pop), elevation: el === '' ? null : Number(el) };
  });
}

/** Fetch-once loaders that forget a failed fetch, so the next call tries again. */
export function cached<K, V>(load: (key: K) => Promise<V>): (key: K) => Promise<V> {
  const m = new Map<K, Promise<V>>();
  return (key) => {
    let p = m.get(key);
    if (!p) {
      p = load(key);
      p.catch(() => m.delete(key));
      m.set(key, p);
    }
    return p;
  };
}

// Lazily loaded data is fetched by URL, not import(): browsers keep a failed import() failed, so Try Again could never work.
const SHARD_URLS = import.meta.glob<string>('./places/*.tsv', { query: '?url', import: 'default', eager: true });
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load ${url} (${res.status}).`);
  return res.text();
}
export const hasPlaces = (code: string): boolean => `./places/${code}.tsv` in SHARD_URLS;
export const placesOf = cached(async (code: string): Promise<WorldPlace[]> => {
  const url = SHARD_URLS[`./places/${code}.tsv`];
  return url ? readShard(code, await fetchText(url)) : [];
});

type RegionTable = Record<string, { name: string }>;
const regionTable = cached(async (_: 'all') => JSON.parse(await fetchText(regionsUrl)) as RegionTable);
export async function regionsOf(code: string): Promise<{ key: string; name: string }[]> {
  const t = await regionTable('all');
  return Object.entries(t).filter(([k]) => k.startsWith(`${code}.`)).map(([key, r]) => ({ key, name: r.name })).sort((a, b) => a.name.localeCompare(b.name, 'en'));
}
export async function regionName(key: string): Promise<string> {
  return key ? (await regionTable('all'))[key]?.name ?? '' : '';
}

const stationIndex = cached(async (_: 'all'): Promise<StationIndex> => {
  const data = JSON.parse(await fetchText(stationsUrl)) as { params: string[]; stations: unknown[] };
  return indexStations(readStations(data));
});

/** Text as search compares it: no accents, no case; hyphens, apostrophes and the like read as spaces. */
export function fold(text: string): string {
  return text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Places a search finds, best first: the exact name, then names starting with it, then a word starting with it, then
 * names containing it; within each, larger places first, then by name and ID (deterministic). Original names are kept.
 */
export function search(places: readonly WorldPlace[], query: string, region?: string): WorldPlace[] {
  const q = fold(query);
  const rank = (p: WorldPlace): number => {
    if (!q) return 0;
    const names = [p.name, p.ascii].filter(Boolean).map(fold);
    if (names.includes(q)) return 0;
    if (names.some((n) => n.startsWith(q))) return 1;
    if (names.some((n) => n.split(' ').some((w) => w.startsWith(q)))) return 2;
    return names.some((n) => n.includes(q)) ? 3 : 4;
  };
  return places
    .filter((p) => !region || p.region === region)
    .map((p) => ({ p, r: rank(p) }))
    .filter((x) => x.r < 4)
    .sort((a, b) => a.r - b.r || b.p.population - a.p.population || a.p.name.localeCompare(b.p.name, 'en') || Number(a.p.id) - Number(b.p.id))
    .map((x) => x.p);
}

/** The older summary fields the weather fallback reads, derived from monthly normals. */
export function summaryClimate(m: MonthlyNormals): Omit<Climate, 'monthly' | 'source'> {
  const warmHigh = Math.max(...m.tmax);
  const coldHigh = Math.min(...m.tmax);
  const diurnal = m.tmax.reduce((s, v, i) => s + v - m.tmin[i], 0) / 12;
  const wetDays = m.wet.reduce((a, b) => a + b, 0);
  // Months of the warm half of the year (by the warmest month), to tell a summer-wet from a winter-wet climate.
  const peak = m.tmax.indexOf(warmHigh);
  const warmHalf = (i: number) => { const off = ((i - peak + 18) % 12) - 6; return off >= -3 && off <= 2; };
  const summer = m.wet.filter((_, i) => warmHalf(i)).reduce((a, b) => a + b, 0);
  const share = wetDays ? summer / wetDays : 0.5;
  const wetSeason: WetSeason = wetDays < 20 ? 'arid' : share > 0.62 ? 'summer' : share < 0.38 ? 'winter' : 'even';
  return { warmHigh, coldHigh, diurnal: Math.round(diurnal * 10) / 10, wetFrac: Math.round((wetDays / 365) * 1000) / 1000, wetSeason };
}

/** The game's place for a world record: the catalog place where one is aliased to it, else a new record with station climate. */
export async function toGamePlace(w: WorldPlace): Promise<Place> {
  const existing = findPlace(placeIdForGeoname(w.id));
  if (existing) return existing;
  const [region, stations] = await Promise.all([regionName(w.region), stationIndex('all')]);
  const climate = climateFor({ country: w.country, lat: w.lat, lon: w.lon, elevation: w.elevation }, stations);
  const place: Place = {
    id: placeIdForGeoname(w.id),
    name: w.name,
    region,
    regionKey: w.region || undefined,
    country: w.country,
    countryName: countryName(w.country),
    lat: w.lat,
    lon: w.lon,
    zone: w.zone,
    // shortcut: GeoNames lists no height for some places; sea level is assumed (weather uses station normals instead).
    elevation: w.elevation ?? 0,
    climate: { ...summaryClimate(climate.monthly), monthly: climate.monthly, source: climate.source },
    geonameId: w.id,
    population: w.population,
  };
  registerPlace(place); // resolvable by ID this session; adoptPlace keeps it in the save once it is used
  return place;
}
