// Climate normals for any place, adapted from SLATE-REBUILD's weather module (WMO climatological normals, register
// R-0037/R-0038). For each normal the nearest station is used: the place's own country's 1991-2020 stations if any,
// else its own of any period, else the nearest anywhere (marked borrowed). Temperatures are corrected to the place's
// height at the standard atmosphere's 6.5 °C per km (R-0039). A station further than FAR_KM away is not used as local
// evidence: that normal falls back to the game's modeled climate, and the provenance says so.
// Pure functions: the stations are passed in, so the engine stays synchronous and tests run in Node.

export type Param = 'tmax' | 'tmin' | 'prcp' | 'wet' | 'sun';
export const PARAMS: readonly Param[] = ['tmax', 'tmin', 'prcp', 'wet', 'sun'];

export interface Station {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  elevation: number | null;
  period: string | null;
  normals: Partial<Record<Param, readonly number[]>>;
}

export interface ParamSource {
  station: string;
  stationName: string;
  country: string;
  km: number;
  period: string | null;
  borrowed: boolean;
}

export interface MonthlyNormals {
  tmax: number[];
  tmin: number[];
  wet: number[]; // days with at least 1 mm
  prcp: number[]; // mm
  sun?: number[]; // hours
}

export interface ClimateSource {
  kind: 'stations' | 'partly-modeled' | 'modeled';
  /** Which station supplied each value. Left out of the 66 catalog places at runtime; kept in docs/world/legacy-place-climate.json. */
  params?: Partial<Record<Param, ParamSource | { modeled: true; reason: string }>>;
}

/** Stations further than this are not treated as evidence for a place (simulation assumption, docs/ASSUMPTIONS.md). */
export const FAR_KM = 400;
export const LAPSE_PER_M = 6.5 / 1000;

type Row = [string, string, string | null, string, number, number, number | null, string | null, ...(number[] | null)[]];

export function readStations(data: { params: readonly string[]; stations: readonly unknown[] }): Station[] {
  return (data.stations as Row[]).map(([id, name, , country, latitude, longitude, elevation, period, ...values]) => ({
    id, name, country, latitude, longitude, elevation, period,
    normals: Object.fromEntries(PARAMS.flatMap((p, i) => (values[i] === null || values[i] === undefined ? [] : [[p, values[i]]]))),
  }));
}

const RADIUS_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const h = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface StationIndex {
  stations: readonly Station[];
  pools: Map<string, Station[]>;
}
export const indexStations = (stations: readonly Station[]): StationIndex => ({ stations, pools: new Map() });

type Tier = 'recent-own' | 'own' | 'any';
function poolFor(index: StationIndex, country: string, p: Param, tier: Tier): Station[] {
  const key = `${country}|${p}|${tier}`;
  let pool = index.pools.get(key);
  if (!pool) {
    const having = index.stations.filter((s) => s.normals[p] !== undefined);
    const own = having.filter((s) => s.country === country);
    pool = [...(tier === 'recent-own' ? own.filter((s) => s.period === '1991-2020') : tier === 'own' ? own : having)].sort((a, b) => a.latitude - b.latitude);
    index.pools.set(key, pool);
  }
  return pool;
}

/** Nearest usable station: the country's own 1991-2020 stations first, then its own of any period, then anywhere. */
function nearestUsable(index: StationIndex, country: string, p: Param, lat: number, lon: number): { station: Station; km: number } | null {
  let fallback: { station: Station; km: number } | null = null;
  for (const tier of ['recent-own', 'own', 'any'] as const) {
    const near = nearestIn(poolFor(index, country, p, tier), lat, lon);
    if (near && near.km <= FAR_KM) return near;
    if (near && (!fallback || near.km < fallback.km)) fallback = near;
  }
  return fallback;
}

function nearestIn(pool: readonly Station[], lat: number, lon: number): { station: Station; km: number } | null {
  if (!pool.length) return null;
  let lo = 0;
  let hi = pool.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pool[mid].latitude < lat) lo = mid + 1;
    else hi = mid;
  }
  let best = { station: pool[Math.min(lo, pool.length - 1)], km: Infinity };
  const perDegree = (Math.PI / 180) * RADIUS_KM;
  const consider = (i: number) => {
    const s = pool[i];
    const km = distanceKm(lat, lon, s.latitude, s.longitude);
    if (km < best.km) best = { station: s, km };
    return Math.abs(s.latitude - lat) * perDegree <= best.km;
  };
  for (let i = lo; i < pool.length && consider(i); i += 1);
  for (let i = lo - 1; i >= 0 && consider(i); i -= 1);
  return best;
}

/** The game's modeled climate when no usable station exists: latitude and height only (simulation assumption). */
export function modeledMonthly(lat: number, elevation: number | null): MonthlyNormals {
  const a = Math.abs(lat);
  const elev = elevation ?? 0;
  const annual = 29 - 0.45 * a - LAPSE_PER_M * elev; // mean daily high
  const swing = Math.min(16, 0.32 * a); // half the seasonal range of highs
  const peak = lat >= 0 ? 6.5 : 0.5; // month index (0 = January) of the warmest month
  const tmax: number[] = [];
  const tmin: number[] = [];
  const wet: number[] = [];
  const prcp: number[] = [];
  for (let m = 0; m < 12; m++) {
    const s = Math.cos((2 * Math.PI * (m - peak)) / 12);
    const hi = annual + swing * s;
    tmax.push(round1(hi));
    tmin.push(round1(hi - (9 - Math.min(4, a / 15))));
    const w = a < 15 ? 12 + 8 * s : 9;
    wet.push(round1(Math.max(1, w)));
    prcp.push(round1(Math.max(5, w * 7)));
  }
  return { tmax, tmin, wet, prcp };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

export interface ClimateResult {
  monthly: MonthlyNormals;
  source: ClimateSource;
}

export function climateFor(place: { country: string; lat: number; lon: number; elevation: number | null }, index: StationIndex): ClimateResult {
  const modeled = modeledMonthly(place.lat, place.elevation);
  const params: ClimateSource['params'] = {};
  const monthly: MonthlyNormals = { tmax: modeled.tmax, tmin: modeled.tmin, wet: modeled.wet, prcp: modeled.prcp };
  for (const p of PARAMS) {
    const near = nearestUsable(index, place.country, p, place.lat, place.lon);
    if (!near || near.km > FAR_KM) {
      params[p] = { modeled: true, reason: near ? `Nearest station with this normal is ${Math.round(near.km)} km away.` : 'No station has this normal.' };
      continue;
    }
    const values = near.station.normals[p] as readonly number[];
    if (values.length !== 12 || values.some((v) => !Number.isFinite(v))) {
      params[p] = { modeled: true, reason: 'The station record is incomplete.' };
      continue;
    }
    const shift = (p === 'tmax' || p === 'tmin') && near.station.elevation !== null && place.elevation !== null
      ? (near.station.elevation - place.elevation) * LAPSE_PER_M : 0;
    const vals = values.map((v) => round1(v + shift));
    if (p === 'sun') monthly.sun = vals;
    else monthly[p] = vals;
    params[p] = {
      station: near.station.id, stationName: near.station.name, country: near.station.country, km: Math.round(near.km),
      period: near.station.period, borrowed: near.station.country !== place.country,
    };
  }
  // Keep the pair consistent: a low can't exceed its high when they come from different stations.
  monthly.tmin = monthly.tmin.map((v, i) => Math.min(v, monthly.tmax[i] - 0.5));
  // Sunshine is optional; the four core normals decide how the climate is described.
  const core = (['tmax', 'tmin', 'wet', 'prcp'] as const).filter((p) => params[p] && 'station' in (params[p] as object)).length;
  const kind = core === 4 ? 'stations' : core === 0 ? 'modeled' : 'partly-modeled';
  return { monthly, source: { kind, params } };
}

const regionNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'region' }) : null;
const countryWord = (code: string) => regionNames?.of(code) ?? code;
const PARAM_WORDS: Record<string, string> = { tmax: 'highs', tmin: 'lows', wet: 'wet days', prcp: 'rainfall', sun: 'sunshine' };

/** Where a place's typical climate comes from, in one sentence for the player (null for places without a record). */
export function climateNote(source: ClimateSource | undefined): string | null {
  const params = source?.params;
  if (!source || !params) return null;
  const core = (['tmax', 'tmin', 'wet', 'prcp'] as const).map((p) => [p, params[p]] as const);
  const measured = core.filter(([, v]) => v && 'station' in v).map(([p, v]) => [p, v as ParamSource] as const);
  const modeled = core.filter(([, v]) => !v || 'modeled' in v).map(([p]) => PARAM_WORDS[p]);
  if (!measured.length) return `No weather station within ${FAR_KM} km has records for this place, so its typical climate is modeled from latitude and height.`;
  const main = measured[0][1];
  const where = main.borrowed ? ` (${countryWord(main.country)})` : '';
  const from = `Typical climate from weather station records ${main.km} km away${where}`;
  if (!modeled.length) return `${from}.`;
  return `${from}; ${modeled.join(' and ')} ${modeled.length === 1 && !modeled[0].endsWith('s') ? 'is' : 'are'} modeled, with no station within ${FAR_KM} km.`;
}
