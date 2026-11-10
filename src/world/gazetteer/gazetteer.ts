// The world gazetteer, adapted from SLATE-REBUILD (GeoNames, CC BY 4.0; see docs/DATA-PROVENANCE.md).
// Only the small country index ships with the app: the engine names countries from it. A country's places, the region
// names, the climate stations and search are in search.ts, loaded with the screens that look for a place. Until
// November 10, 2026 they were here, so the start screen carried the URL of every country's places file and the search code.

import index from './index.json' with { type: 'json' };

export interface CountryEntry {
  code: string;
  name: string;
  playable: boolean;
  places: number;
  regions: number;
  outline: boolean;
}

/** Every entry in the gazetteer, by name. Not all are playable (historical entries, places without settlements). */
export const COUNTRIES: readonly CountryEntry[] = Object.entries(index as Record<string, Omit<CountryEntry, 'code'>>)
  .map(([code, c]) => ({ code, name: c.name, playable: c.playable, places: c.places, regions: c.regions, outline: c.outline }))
  .sort((a, b) => a.name.localeCompare(b.name, 'en'));
export const PLAYABLE_COUNTRIES = COUNTRIES.filter((c) => c.playable);
export const countryName = (code: string): string => (index as Record<string, { name: string }>)[code]?.name ?? code;

export interface WorldPlace {
  id: string; // GeoNames ID
  country: string;
  name: string;
  ascii: string;
  region: string; // region key, e.g. "US.CA", or ''
  lat: number;
  lon: number;
  zone: string;
  population: number;
  elevation: number | null;
}

