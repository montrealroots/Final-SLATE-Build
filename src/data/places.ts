// Place catalog. Coordinates are rounded to two decimals; zones are IANA identifiers and
// local time always comes from the runtime's zone rules. Climate fields are MODELED
// parameters for the weather simulation (approximate typical values), not station records.
// Developer provenance: docs/DATA-PROVENANCE.md. Coverage is this curated list, not every settlement.

import legacy from './legacy-places.json' with { type: 'json' };
import type { ClimateSource, MonthlyNormals } from '../world/climate';

export type WetSeason = 'even' | 'winter' | 'summer' | 'arid';

export interface Climate {
  warmHigh: number; // typical daily high in the warmest month, °C
  coldHigh: number; // typical daily high in the coldest month, °C
  diurnal: number; // typical high-to-low range, °C
  wetFrac: number; // typical share of days with measurable precipitation
  wetSeason: WetSeason;
  /** Monthly climate normals from WMO stations (or the modeled fallback); the weather model prefers these. */
  monthly?: MonthlyNormals;
  source?: ClimateSource;
}

export interface Place {
  id: string;
  name: string;
  region: string; // human-readable state/province/region
  regionCode?: string; // used for regional holiday rules, e.g. GB-SCT
  regionKey?: string; // the gazetteer's first-level region key ("GB.SCT"), used by the worldwide holiday rules
  country: string; // ISO 3166-1 alpha-2
  countryName: string;
  lat: number;
  lon: number;
  zone: string;
  elevation: number; // metres
  coastal?: boolean; // catalog places only; world places have no coastline record
  climate: Climate;
  /** The GeoNames record this place is (catalog places are aliased to one; see docs/world/legacy-place-migration.json). */
  geonameId?: string;
  population?: number;
}

function p(
  id: string, name: string, region: string, country: string, countryName: string,
  lat: number, lon: number, zone: string, elevation: number, coastal: boolean,
  warmHigh: number, coldHigh: number, diurnal: number, wetFrac: number, wetSeason: WetSeason, regionCode?: string,
): Place {
  return { id, name, region, regionCode, country, countryName, lat, lon, zone, elevation, coastal, climate: { warmHigh, coldHigh, diurnal, wetFrac, wetSeason } };
}

export const PLACES: Place[] = [
  p('us-los-angeles', 'Los Angeles', 'California', 'US', 'United States', 34.05, -118.24, 'America/Los_Angeles', 89, true, 29, 20, 10, 0.1, 'winter'),
  p('us-new-york', 'New York', 'New York', 'US', 'United States', 40.71, -74.01, 'America/New_York', 10, true, 29.5, 4, 8, 0.33, 'even'),
  p('us-atlanta', 'Atlanta', 'Georgia', 'US', 'United States', 33.75, -84.39, 'America/New_York', 320, false, 32, 11, 10, 0.3, 'even'),
  p('us-austin', 'Austin', 'Texas', 'US', 'United States', 30.27, -97.74, 'America/Chicago', 149, false, 36, 17, 11, 0.22, 'even'),
  p('us-chicago', 'Chicago', 'Illinois', 'US', 'United States', 41.88, -87.63, 'America/Chicago', 181, false, 29, 0, 8, 0.33, 'even'),
  p('us-boulder', 'Boulder', 'Colorado', 'US', 'United States', 40.01, -105.27, 'America/Denver', 1655, false, 30, 7, 15, 0.22, 'even'),
  p('us-albuquerque', 'Albuquerque', 'New Mexico', 'US', 'United States', 35.08, -106.65, 'America/Denver', 1619, false, 33, 10, 15, 0.13, 'summer'),
  p('us-anchorage', 'Anchorage', 'Alaska', 'US', 'United States', 61.22, -149.9, 'America/Anchorage', 31, true, 18, -5, 7, 0.35, 'even'),
  p('us-honolulu', 'Honolulu', 'Hawaii', 'US', 'United States', 21.31, -157.86, 'Pacific/Honolulu', 5, true, 32, 27, 7, 0.25, 'winter'),
  p('ca-toronto', 'Toronto', 'Ontario', 'CA', 'Canada', 43.65, -79.38, 'America/Toronto', 76, false, 27, -1, 9, 0.38, 'even', 'CA-ON'),
  p('ca-vancouver', 'Vancouver', 'British Columbia', 'CA', 'Canada', 49.28, -123.12, 'America/Vancouver', 70, true, 22, 7, 7, 0.45, 'winter', 'CA-BC'),
  p('ca-montreal', 'Montréal', 'Quebec', 'CA', 'Canada', 45.5, -73.57, 'America/Toronto', 36, false, 26.5, -5, 9, 0.4, 'even', 'CA-QC'),
  p('mx-mexico-city', 'Mexico City', 'Mexico City', 'MX', 'Mexico', 19.43, -99.13, 'America/Mexico_City', 2240, false, 27, 22, 14, 0.36, 'summer'),
  p('mx-guadalajara', 'Guadalajara', 'Jalisco', 'MX', 'Mexico', 20.67, -103.35, 'America/Mexico_City', 1566, false, 32, 24, 16, 0.25, 'summer'),
  p('br-sao-paulo', 'São Paulo', 'São Paulo', 'BR', 'Brazil', -23.55, -46.63, 'America/Sao_Paulo', 760, false, 28, 22, 9, 0.4, 'summer'),
  p('br-rio-de-janeiro', 'Rio de Janeiro', 'Rio de Janeiro', 'BR', 'Brazil', -22.91, -43.17, 'America/Sao_Paulo', 5, true, 30, 25, 7, 0.33, 'summer'),
  p('ar-buenos-aires', 'Buenos Aires', 'Buenos Aires', 'AR', 'Argentina', -34.6, -58.38, 'America/Argentina/Buenos_Aires', 25, true, 30, 15, 9, 0.25, 'even'),
  p('ar-mar-del-plata', 'Mar del Plata', 'Buenos Aires Province', 'AR', 'Argentina', -38.0, -57.56, 'America/Argentina/Buenos_Aires', 20, true, 26, 13, 9, 0.25, 'even'),
  p('ar-ushuaia', 'Ushuaia', 'Tierra del Fuego', 'AR', 'Argentina', -54.8, -68.3, 'America/Argentina/Ushuaia', 20, true, 14, 4, 6, 0.4, 'even'),
  p('gb-london', 'London', 'England', 'GB', 'United Kingdom', 51.51, -0.13, 'Europe/London', 11, false, 23.5, 8, 8, 0.35, 'even', 'GB-ENG'),
  p('gb-sheffield', 'Sheffield', 'England', 'GB', 'United Kingdom', 53.38, -1.47, 'Europe/London', 75, false, 21, 7, 7, 0.4, 'even', 'GB-ENG'),
  p('gb-edinburgh', 'Edinburgh', 'Scotland', 'GB', 'United Kingdom', 55.95, -3.19, 'Europe/London', 47, true, 19.5, 7, 7, 0.42, 'even', 'GB-SCT'),
  p('ie-dublin', 'Dublin', 'Leinster', 'IE', 'Ireland', 53.35, -6.26, 'Europe/Dublin', 20, true, 19.5, 8, 7, 0.45, 'even'),
  p('fr-paris', 'Paris', 'Île-de-France', 'FR', 'France', 48.86, 2.35, 'Europe/Paris', 35, false, 25.5, 7.5, 8, 0.32, 'even'),
  p('fr-cannes', 'Cannes', "Provence-Alpes-Côte d'Azur", 'FR', 'France', 43.55, 7.01, 'Europe/Paris', 5, true, 28, 13, 8, 0.17, 'winter'),
  p('fr-annecy', 'Annecy', 'Auvergne-Rhône-Alpes', 'FR', 'France', 45.9, 6.13, 'Europe/Paris', 448, false, 27, 5, 10, 0.35, 'even'),
  p('fr-clermont-ferrand', 'Clermont-Ferrand', 'Auvergne-Rhône-Alpes', 'FR', 'France', 45.78, 3.08, 'Europe/Paris', 358, false, 26.5, 8, 11, 0.3, 'even'),
  p('fr-lille', 'Lille', 'Hauts-de-France', 'FR', 'France', 50.63, 3.06, 'Europe/Paris', 20, false, 23, 6.5, 8, 0.33, 'even'),
  p('mc-monaco', 'Monaco', 'Monaco', 'MC', 'Monaco', 43.74, 7.42, 'Europe/Monaco', 50, true, 27, 13, 7, 0.17, 'winter'),
  p('de-berlin', 'Berlin', 'Berlin', 'DE', 'Germany', 52.52, 13.4, 'Europe/Berlin', 34, false, 24.5, 3, 8, 0.3, 'even', 'DE-BE'),
  p('de-oberhausen', 'Oberhausen', 'North Rhine-Westphalia', 'DE', 'Germany', 51.47, 6.85, 'Europe/Berlin', 40, false, 23.5, 5, 8, 0.35, 'even', 'DE-NW'),
  p('es-madrid', 'Madrid', 'Community of Madrid', 'ES', 'Spain', 40.42, -3.7, 'Europe/Madrid', 657, false, 32.5, 10, 12, 0.17, 'winter'),
  p('es-barcelona', 'Barcelona', 'Catalonia', 'ES', 'Spain', 41.39, 2.17, 'Europe/Madrid', 12, true, 28.5, 14, 7, 0.17, 'winter'),
  p('es-sitges', 'Sitges', 'Catalonia', 'ES', 'Spain', 41.24, 1.81, 'Europe/Madrid', 10, true, 28.5, 14, 8, 0.17, 'winter'),
  p('es-san-sebastian', 'San Sebastián', 'Basque Country', 'ES', 'Spain', 43.32, -1.98, 'Europe/Madrid', 5, true, 22.5, 12, 7, 0.45, 'even'),
  p('it-rome', 'Rome', 'Lazio', 'IT', 'Italy', 41.9, 12.5, 'Europe/Rome', 21, false, 31.5, 12.5, 11, 0.22, 'winter'),
  p('it-venice', 'Venice', 'Veneto', 'IT', 'Italy', 45.44, 12.32, 'Europe/Rome', 1, true, 28, 7, 8, 0.25, 'even'),
  p('nl-amsterdam', 'Amsterdam', 'North Holland', 'NL', 'Netherlands', 52.37, 4.9, 'Europe/Amsterdam', 0, true, 22.5, 6, 7, 0.38, 'even'),
  p('nl-rotterdam', 'Rotterdam', 'South Holland', 'NL', 'Netherlands', 51.92, 4.48, 'Europe/Amsterdam', 0, true, 22.5, 6.5, 7, 0.38, 'even'),
  p('ch-locarno', 'Locarno', 'Ticino', 'CH', 'Switzerland', 46.17, 8.8, 'Europe/Zurich', 200, false, 27, 8, 9, 0.3, 'summer', 'CH-TI'),
  p('cz-prague', 'Prague', 'Prague', 'CZ', 'Czechia', 50.08, 14.44, 'Europe/Prague', 235, false, 25, 2, 9, 0.3, 'even'),
  p('cz-karlovy-vary', 'Karlovy Vary', 'Karlovy Vary Region', 'CZ', 'Czechia', 50.23, 12.87, 'Europe/Prague', 447, false, 22.5, 1, 9, 0.35, 'even'),
  p('se-stockholm', 'Stockholm', 'Stockholm County', 'SE', 'Sweden', 59.33, 18.07, 'Europe/Stockholm', 28, true, 23, 0, 8, 0.33, 'even'),
  p('no-tromso', 'Tromsø', 'Troms', 'NO', 'Norway', 69.65, 18.96, 'Europe/Oslo', 10, true, 15, -2, 5, 0.5, 'even'),
  p('dk-copenhagen', 'Copenhagen', 'Capital Region', 'DK', 'Denmark', 55.68, 12.57, 'Europe/Copenhagen', 10, true, 21.5, 3, 7, 0.36, 'even'),
  p('tr-istanbul', 'Istanbul', 'Istanbul', 'TR', 'Türkiye', 41.01, 28.98, 'Europe/Istanbul', 40, true, 28.5, 9, 7, 0.3, 'winter'),
  p('eg-cairo', 'Cairo', 'Cairo', 'EG', 'Egypt', 30.04, 31.24, 'Africa/Cairo', 23, false, 35, 19, 13, 0.02, 'arid'),
  p('ma-marrakech', 'Marrakech', 'Marrakesh-Safi', 'MA', 'Morocco', 31.63, -8.01, 'Africa/Casablanca', 466, false, 37, 18, 14, 0.1, 'winter'),
  p('ng-lagos', 'Lagos', 'Lagos', 'NG', 'Nigeria', 6.52, 3.38, 'Africa/Lagos', 40, true, 32, 28, 7, 0.4, 'summer'),
  p('bf-ouagadougou', 'Ouagadougou', 'Centre', 'BF', 'Burkina Faso', 12.37, -1.52, 'Africa/Ouagadougou', 305, false, 40, 32, 14, 0.15, 'summer'),
  p('ke-nairobi', 'Nairobi', 'Nairobi', 'KE', 'Kenya', -1.29, 36.82, 'Africa/Nairobi', 1795, false, 28, 21, 12, 0.3, 'even'),
  p('za-johannesburg', 'Johannesburg', 'Gauteng', 'ZA', 'South Africa', -26.2, 28.05, 'Africa/Johannesburg', 1753, false, 26.5, 17, 13, 0.25, 'summer'),
  p('za-durban', 'Durban', 'KwaZulu-Natal', 'ZA', 'South Africa', -29.86, 31.02, 'Africa/Johannesburg', 10, true, 28, 23, 8, 0.3, 'summer'),
  p('za-cape-town', 'Cape Town', 'Western Cape', 'ZA', 'South Africa', -33.92, 18.42, 'Africa/Johannesburg', 10, true, 27, 18, 9, 0.25, 'winter'),
  p('ae-dubai', 'Dubai', 'Dubai', 'AE', 'United Arab Emirates', 25.2, 55.27, 'Asia/Dubai', 5, true, 41, 24, 9, 0.02, 'arid'),
  p('sa-jeddah', 'Jeddah', 'Makkah Province', 'SA', 'Saudi Arabia', 21.49, 39.19, 'Asia/Riyadh', 12, true, 39, 29, 9, 0.02, 'arid'),
  p('in-mumbai', 'Mumbai', 'Maharashtra', 'IN', 'India', 19.08, 72.88, 'Asia/Kolkata', 14, true, 33, 30, 7, 0.3, 'summer'),
  p('in-panaji', 'Panaji', 'Goa', 'IN', 'India', 15.49, 73.83, 'Asia/Kolkata', 7, true, 33, 31, 8, 0.3, 'summer'),
  p('jp-tokyo', 'Tokyo', 'Tokyo', 'JP', 'Japan', 35.68, 139.69, 'Asia/Tokyo', 40, true, 31, 10, 8, 0.3, 'summer'),
  p('kr-seoul', 'Seoul', 'Seoul', 'KR', 'South Korea', 37.57, 126.98, 'Asia/Seoul', 38, false, 29.5, 2, 9, 0.28, 'summer'),
  p('kr-busan', 'Busan', 'Busan', 'KR', 'South Korea', 35.18, 129.08, 'Asia/Seoul', 10, true, 29.5, 8.5, 7, 0.27, 'summer'),
  p('cn-shanghai', 'Shanghai', 'Shanghai', 'CN', 'China', 31.23, 121.47, 'Asia/Shanghai', 4, true, 32, 8.5, 7, 0.35, 'summer'),
  p('au-sydney', 'Sydney', 'New South Wales', 'AU', 'Australia', -33.87, 151.21, 'Australia/Sydney', 3, true, 26, 17, 8, 0.38, 'even', 'AU-NSW'),
  p('au-melbourne', 'Melbourne', 'Victoria', 'AU', 'Australia', -37.81, 144.96, 'Australia/Melbourne', 31, true, 26, 14, 9, 0.35, 'even', 'AU-VIC'),
  p('nz-auckland', 'Auckland', 'Auckland', 'NZ', 'New Zealand', -36.85, 174.76, 'Pacific/Auckland', 20, true, 24, 15, 7, 0.42, 'winter'),
  p('nz-wellington', 'Wellington', 'Wellington', 'NZ', 'New Zealand', -41.29, 174.78, 'Pacific/Auckland', 10, true, 20.5, 11.5, 6, 0.4, 'winter'),
];

// Attach each catalog place's GeoNames alias and station-based climate (generated by scripts/legacy-places.mjs).
const LEGACY = legacy as unknown as Record<string, { geonameId: string | null; population: number; climate: { monthly: MonthlyNormals; source: ClimateSource } }>;
for (const pl of PLACES) {
  const l = LEGACY[pl.id];
  if (!l) continue;
  pl.geonameId = l.geonameId ?? undefined;
  pl.population = l.population;
  pl.climate = { ...pl.climate, monthly: l.climate.monthly, source: l.climate.source };
}

const byId = new Map(PLACES.map((pl) => [pl.id, pl]));
const byGeoname = new Map(PLACES.filter((pl) => pl.geonameId).map((pl) => [pl.geonameId!, pl.id]));
/** Places from the world catalog that a save uses, registered when the save is opened or a place is chosen. */
const registry = new Map<string, Place>();

export function getPlace(id: string): Place {
  const place = byId.get(id) ?? registry.get(id);
  if (!place) throw new Error(`Unknown place ${id}`);
  return place;
}

export function findPlace(id: string | undefined): Place | undefined {
  return id ? byId.get(id) ?? registry.get(id) : undefined;
}

/** The ID a GeoNames record is used under: the catalog ID where one is aliased to it, otherwise "gn:<id>". */
export function placeIdForGeoname(geonameId: string): string {
  return byGeoname.get(geonameId) ?? `gn:${geonameId}`;
}

export function isCatalogPlace(id: string): boolean {
  return byId.has(id);
}

export function registerPlace(place: Place): void {
  if (byId.has(place.id)) return;
  registry.set(place.id, place);
}

export function placeLabel(place: Place): string {
  return place.region && place.region !== place.name ? `${place.name}, ${place.region}, ${place.countryName}` : `${place.name}, ${place.countryName}`;
}

function fold(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function searchPlaces(query: string, limit = 12): Place[] {
  const q = fold(query.trim());
  if (!q) return PLACES.slice(0, limit);
  const scored = PLACES.map((pl) => {
    const name = fold(pl.name);
    const all = fold(`${pl.name} ${pl.region} ${pl.countryName} ${pl.country}`);
    const score = name.startsWith(q) ? 0 : name.includes(q) ? 1 : all.includes(q) ? 2 : 9;
    return { pl, score };
  }).filter((x) => x.score < 9);
  scored.sort((a, b) => a.score - b.score || a.pl.name.localeCompare(b.pl.name));
  return scored.slice(0, limit).map((x) => x.pl);
}
