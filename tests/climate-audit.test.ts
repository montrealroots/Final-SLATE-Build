import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { climateFor, climateNote, indexStations, readStations } from '../src/world/climate';

// Audit of the playable entries with no weather station of their own (docs/world/world-coverage.json,
// entriesWithoutOwnStation), November 6, 2026: each one's most populous place, and what the player is told.
const index = indexStations(readStations(JSON.parse(readFileSync('src/world/weather/stations.json', 'utf8'))));
function largest(country: string) {
  const rows = readFileSync(`src/world/gazetteer/places/${country}.tsv`, 'utf8').trim().split('\n').map((l) => l.split('\t'));
  const top = rows.sort((a, b) => Number(b[7]) - Number(a[7]))[0];
  const r = climateFor({ country, lat: Number(top[4]), lon: Number(top[5]), elevation: top[8] === '' ? null : Number(top[8]) }, index);
  return { name: top[1], kind: r.source.kind, note: climateNote(r.source) };
}

describe('borrowed and modeled climate is said so', () => {
  it.each([
    ['HT', 'Port-au-Prince', 'stations', 'Typical climate from weather station records 52 km away (Dominican Republic).'],
    ['PS', 'East Jerusalem', 'stations', 'Typical climate from weather station records 1 km away (Israel).'],
    ['SM', 'Serravalle', 'stations', 'Typical climate from weather station records 12 km away (Italy).'],
    ['VA', 'Vatican City', 'stations', 'Typical climate from weather station records 6 km away (Italy).'],
    ['VG', 'Road Town', 'stations', 'Typical climate from weather station records 38 km away (U.S. Virgin Islands).'],
    ['TC', 'Providenciales', 'partly-modeled', 'Typical climate from weather station records 224 km away (Dominican Republic); wet days are modeled, with no station within 400 km.'],
    ['NR', 'Arijejen', 'modeled', 'No weather station within 400 km has records for this place, so its typical climate is modeled from latitude and height.'],
    ['NU', 'Alofi', 'modeled', 'No weather station within 400 km has records for this place, so its typical climate is modeled from latitude and height.'],
    ['TK', 'Nukunonu', 'modeled', 'No weather station within 400 km has records for this place, so its typical climate is modeled from latitude and height.'],
  ])('%s (%s): %s', (country, name, kind, note) => {
    const got = largest(country);
    expect(got.name).toBe(name);
    expect(got.kind).toBe(kind);
    expect(got.note).toBe(note);
  });

  it('a place with its own station names no other country', () => {
    expect(largest('FR').note).toBe('Typical climate from weather station records 4 km away.');
  });
});
