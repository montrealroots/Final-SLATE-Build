// Daylight uses the standard sunrise equation (solar declination and hour angle), accurate to
// a few minutes, including polar day/night. Weather is MODELED: a deterministic simulation from
// each place's climate parameters and the world seed. It is never presented as an observation.

import type { Place } from '../data/places';
import { DAY, HOUR, dayNumber, dayOfYear, daysInMonth, localToInstant, parseYmd } from './time';
import { gaussian, stream, unit } from './rng';

const RAD = Math.PI / 180;

export interface Daylight {
  sunrise: number | null; // UTC instant
  sunset: number | null;
  polar: 'day' | 'night' | null;
  dayLengthHours: number;
}

export function daylight(lat: number, lon: number, dateKey: string): Daylight {
  const { year, month, day } = parseYmd(dateKey);
  // Julian day at noon UTC adjusted toward local solar noon.
  const jd = Date.UTC(year, month - 1, day, 12) / DAY + 2440587.5;
  const n = Math.round(jd - 2451545.0 + 0.0008);
  const jStar = n - lon / 360;
  const M = (357.5291 + 0.98560028 * jStar) % 360;
  const C = 1.9148 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 0.0003 * Math.sin(3 * M * RAD);
  const lambda = (M + C + 180 + 102.9372) % 360;
  const jTransit = 2451545.0 + jStar + 0.0053 * Math.sin(M * RAD) - 0.0069 * Math.sin(2 * lambda * RAD);
  const sinDec = Math.sin(lambda * RAD) * Math.sin(23.4397 * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosW = (Math.sin(-0.833 * RAD) - Math.sin(lat * RAD) * sinDec) / (Math.cos(lat * RAD) * cosDec);
  if (cosW < -1) return { sunrise: null, sunset: null, polar: 'day', dayLengthHours: 24 };
  if (cosW > 1) return { sunrise: null, sunset: null, polar: 'night', dayLengthHours: 0 };
  const w = Math.acos(cosW) / RAD;
  const toMs = (j: number) => Math.round((j - 2440587.5) * DAY);
  return { sunrise: toMs(jTransit - w / 360), sunset: toMs(jTransit + w / 360), polar: null, dayLengthHours: (2 * w) / 15 };
}

export type Condition =
  | 'Clear' | 'Partly Cloudy' | 'Cloudy' | 'Light Rain' | 'Rain' | 'Heavy Rain' | 'Thunderstorms' | 'Light Snow' | 'Snow';

export interface DayWeather {
  date: string;
  high: number;
  low: number;
  condition: Condition;
  precipMm: number;
  wet: boolean;
  /** Local hours [start, end) during which precipitation falls, if any. */
  precipHours: [number, number] | null;
  snow: boolean;
}

function seasonalPeakDoy(place: Place): number {
  return place.lat >= 0 ? 200 : 17;
}

/**
 * A monthly normal on a given day: each month's value stands at its middle and a day between two middles blends them
 * (December and January meet across the new year). Adapted from SLATE-REBUILD's weather module.
 */
export function onDay(months: readonly number[], year: number, month: number, day: number): number {
  const x = month - 1 + (day - 0.5) / daysInMonth(year, month) - 0.5;
  const i = Math.floor(x);
  const a = months[(i + 12) % 12];
  const b = months[(i + 13) % 12];
  return a + (b - a) * (x - i);
}

function civil(year: number, doy: number): { month: number; day: number } {
  const d = new Date(Date.UTC(year, 0, doy));
  return { month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function climateHigh(place: Place, doy: number, year = 2026): number {
  const m = place.climate.monthly;
  if (m) {
    const c = civil(year, doy);
    return onDay(m.tmax, year, c.month, c.day);
  }
  const { warmHigh, coldHigh } = place.climate;
  const mid = (warmHigh + coldHigh) / 2;
  const amp = (warmHigh - coldHigh) / 2;
  return mid + amp * Math.cos((2 * Math.PI * (doy - seasonalPeakDoy(place))) / 365.25);
}

export function wetProbability(place: Place, doy: number, year = 2026): number {
  const m = place.climate.monthly;
  if (m) {
    const c = civil(year, doy);
    return Math.min(0.95, Math.max(0.005, onDay(m.wet, year, c.month, c.day) / daysInMonth(year, c.month)));
  }
  const { wetFrac, wetSeason } = place.climate;
  const s = Math.cos((2 * Math.PI * (doy - seasonalPeakDoy(place))) / 365.25); // +1 warm season, -1 cold season
  let f = 1;
  if (wetSeason === 'winter') f = 1 - 0.8 * s;
  else if (wetSeason === 'summer') f = 1 + 0.9 * s;
  return Math.min(0.9, Math.max(0.005, wetFrac * f));
}

/** Smoothed anomaly with knots every few days, giving correlated warm/cold spells. */
function smoothNoise(seed: number, domain: string, n: number, spacing: number): number {
  const k0 = Math.floor(n / spacing);
  const t = (n - k0 * spacing) / spacing;
  const a = gaussian(stream(seed, domain, k0));
  const b = gaussian(stream(seed, domain, k0 + 1));
  const u = (1 - Math.cos(Math.PI * t)) / 2;
  return a * (1 - u) + b * u;
}

const PERSISTENCE = 0.45; // simulation assumption: wet/dry spells persist day to day
const yearCache = new Map<string, boolean[]>();

function wetSeries(seed: number, place: Place, year: number): boolean[] {
  const key = `${seed}|${place.id}|${year}`;
  const hit = yearCache.get(key);
  if (hit) return hit;
  const days = (Date.UTC(year + 1, 0, 1) - Date.UTC(year, 0, 1)) / DAY;
  const rng = stream(seed, 'wet', place.id, year);
  const out: boolean[] = [];
  let prev = rng() < wetProbability(place, 1, year);
  for (let d = 1; d <= days; d++) {
    const p = wetProbability(place, d, year);
    const pw = prev ? p + PERSISTENCE * (1 - p) : p * (1 - PERSISTENCE);
    prev = rng() < pw;
    out.push(prev);
  }
  if (yearCache.size > 400) yearCache.clear();
  yearCache.set(key, out);
  return out;
}

export function weatherOn(seed: number, place: Place, dateKey: string): DayWeather {
  const { year, month, day } = parseYmd(dateKey);
  const doy = dayOfYear(year, month, day);
  const n = dayNumber(dateKey);
  const m = place.climate.monthly;
  const wet = wetSeries(seed, place, year)[doy - 1];
  const r = stream(seed, 'wx', place.id, dateKey);
  let high: number;
  let low: number;
  if (m) {
    // Station normals: the day's departure is spread by the normal range (donor model, R-0041).
    const hiN = onDay(m.tmax, year, month, day);
    const loN = onDay(m.tmin, year, month, day);
    const sd = Math.min(4, Math.max(1, 0.3 * (hiN - loN)));
    const anomaly = smoothNoise(seed, `temp|${place.id}`, n, 4) * sd;
    high = hiN + anomaly + gaussian(r, 0, 0.6);
    low = loN + anomaly * 0.8 + gaussian(r, 0, 0.5);
    if (wet) {
      high -= 2;
      low += 1;
    }
    low = Math.min(low, high - 0.5);
  } else {
    const amp = Math.abs(place.climate.warmHigh - place.climate.coldHigh) / 2;
    const anomalySd = 1.2 + Math.min(2.2, amp / 6) + (Math.abs(place.lat) > 55 ? 0.8 : 0);
    const anomaly = smoothNoise(seed, `temp|${place.id}`, n, 4) * anomalySd;
    high = climateHigh(place, doy, year) + anomaly + gaussian(r, 0, 0.8);
    let diurnal = place.climate.diurnal * (0.85 + r() * 0.3);
    if (wet) {
      high -= 1.5;
      diurnal *= 0.7;
    }
    low = high - diurnal;
  }
  let condition: Condition;
  let precipMm = 0;
  let precipHours: [number, number] | null = null;
  const snow = wet && (high + low) / 2 < 1;
  if (wet) {
    const meanMm = m
      ? Math.max(0.5, onDay(m.prcp, year, month, day) / Math.max(1, onDay(m.wet, year, month, day)))
      : 3 + 9 * place.climate.wetFrac + (place.climate.wetSeason === 'summer' ? 4 : 0);
    precipMm = Math.max(0.3, -Math.log(1 - r() * 0.999) * meanMm);
    const duration = Math.min(20, Math.max(2, Math.round(2 + precipMm / 2 + r() * 4)));
    const start = Math.floor(r() * (24 - duration + 1));
    precipHours = [start, start + duration];
    const arid = m ? m.wet.reduce((a, b) => a + b, 0) < 20 : place.climate.wetSeason === 'arid';
    const convective = !snow && high > 24 && !arid && r() < 0.35;
    if (snow) condition = precipMm > 5 ? 'Snow' : 'Light Snow';
    else if (convective) condition = 'Thunderstorms';
    else condition = precipMm > 15 ? 'Heavy Rain' : precipMm > 4 ? 'Rain' : 'Light Rain';
  } else {
    const cloud = r();
    // With a sunshine normal, sunnier months give more clear days.
    let clear = 0.45;
    if (m?.sun) {
      const hours = daylight(place.lat, place.lon, dateKey).dayLengthHours;
      const frac = hours > 0 ? onDay(m.sun, year, month, day) / daysInMonth(year, month) / hours : 0.5;
      clear = Math.min(0.75, Math.max(0.15, frac * 0.75));
    }
    condition = cloud < clear ? 'Clear' : cloud < Math.min(0.92, clear + 0.35) ? 'Partly Cloudy' : 'Cloudy';
  }
  return { date: dateKey, high: round1(high), low: round1(low), condition, precipMm: round1(precipMm), wet, precipHours, snow };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Temperature at a local hour: minimum near sunrise, maximum mid-afternoon. */
export function temperatureAt(w: DayWeather, hour: number): number {
  const phase = Math.cos(((hour - 15) / 24) * 2 * Math.PI);
  return round1(w.low + ((w.high - w.low) * (phase + 1)) / 2);
}

export function precipitationDuring(w: DayWeather, fromHour: number, toHour: number): boolean {
  if (!w.precipHours) return false;
  return w.precipHours[0] < toHour && w.precipHours[1] > fromHour;
}

export interface Forecast {
  date: string;
  leadDays: number;
  high: number;
  low: number;
  chanceOfPrecip: number; // percent, rounded to 10
  summary: string;
}

export const FORECAST_HORIZON_DAYS = 10;

/**
 * Forecast certainty model: the truth weight falls with lead time and a climatological prior
 * fills the rest, so near-term forecasts are reliable and distant ones are not.
 */
export function forecast(seed: number, place: Place, dateKey: string, issuedKey: string): Forecast {
  const truth = weatherOn(seed, place, dateKey);
  const lead = dayNumber(dateKey) - dayNumber(issuedKey);
  if (lead <= 0) {
    return { date: dateKey, leadDays: 0, high: truth.high, low: truth.low, chanceOfPrecip: truth.wet ? 100 : 0, summary: truth.condition };
  }
  const { year, month, day } = parseYmd(dateKey);
  const pClim = wetProbability(place, dayOfYear(year, month, day), year);
  const w = Math.max(0.2, 1 - 0.13 * lead);
  const noise = (unit(seed, 'fc', place.id, dateKey, issuedKey) - 0.5) * 0.3;
  const chance = Math.round(Math.min(1, Math.max(0, w * (truth.wet ? 1 : 0) + (1 - w) * pClim + noise)) * 10) * 10;
  const r = stream(seed, 'fct', place.id, dateKey, issuedKey);
  const err = gaussian(r, 0, 0.5 + 0.45 * lead);
  const high = round1(truth.high + err);
  const low = round1(truth.low + err * 0.8);
  const snowy = (high + low) / 2 < 1;
  let summary: string;
  if (chance >= 70) summary = snowy ? 'Snow Likely' : 'Rain Likely';
  else if (chance >= 40) summary = snowy ? 'Chance Of Snow' : 'Chance Of Rain';
  else summary = truth.wet ? 'Partly Cloudy' : truth.condition;
  return { date: dateKey, leadDays: lead, high, low, chanceOfPrecip: chance, summary };
}

/** Is the sun up at a given instant at this place? */
export function isDaylight(place: Place, dateKey: string, instant: number): boolean {
  const d = daylight(place.lat, place.lon, dateKey);
  if (d.polar === 'day') return true;
  if (d.polar === 'night') return false;
  return instant >= (d.sunrise ?? 0) && instant < (d.sunset ?? 0);
}

/** Local hours of usable daylight for a date (sunrise to sunset, clipped to the local day). */
export function daylightWindowLocal(place: Place, dateKey: string): { from: number; to: number } {
  const d = daylight(place.lat, place.lon, dateKey);
  if (d.polar === 'day') return { from: 0, to: 24 };
  if (d.polar === 'night') return { from: 12, to: 12 };
  const { year, month, day } = parseYmd(dateKey);
  const midnight = localToInstant(place.zone, year, month, day).instant;
  return { from: ((d.sunrise ?? midnight) - midnight) / HOUR, to: ((d.sunset ?? midnight) - midnight) / HOUR };
}
