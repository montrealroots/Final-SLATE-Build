import { describe, expect, it } from 'vitest';
import { COUNTRIES, PLAYABLE_COUNTRIES, cached, fold, hasPlaces, placesOf, regionsOf, search, summaryClimate, toGamePlace } from '../src/world/gazetteer/gazetteer';
import { createProject, deserialize, newGame, serialize, travelTo } from '../src/engine';
import { findPlace } from '../src/data/places';
import { draft } from './fixtures';

describe('world gazetteer', () => {
  it('lists every entry and keeps non-playable ones out of the pickers', () => {
    expect(COUNTRIES).toHaveLength(252);
    expect(PLAYABLE_COUNTRIES).toHaveLength(246);
    for (const code of ['AN', 'CS', 'AQ', 'BV', 'HM', 'UM']) expect(PLAYABLE_COUNTRIES.some((c) => c.code === code)).toBe(false);
    expect(hasPlaces('AQ')).toBe(false);
    expect(hasPlaces('MC')).toBe(true);
  });

  it('searches without accents, keeps original names and ranks deterministically', async () => {
    const ca = await placesOf('CA');
    expect(search(ca, 'montreal')[0].name).toBe('Montréal');
    const br = await placesOf('BR');
    expect(search(br, 'sao paulo')[0].name).toBe('São Paulo');
    expect(fold("Côte-d'Ivoire")).toBe('cote d ivoire');
    expect(search(br, 'rio').map((p) => p.id)).toEqual(search(br, 'rio').map((p) => p.id));
  });

  it('filters by region and names regions', async () => {
    const us = await placesOf('US');
    const regions = await regionsOf('US');
    const ca = regions.find((r) => r.name === 'California')!;
    const inCa = search(us, 'springfield', ca.key);
    expect(inCa.every((p) => p.region === ca.key)).toBe(true);
    expect(search(us, 'springfield').length).toBeGreaterThan(inCa.length);
  });

  it('retries a failed load instead of caching the failure', async () => {
    let calls = 0;
    const load = cached(async (k: string) => {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return k;
    });
    await expect(load('a')).rejects.toThrow('offline');
    await expect(load('a')).resolves.toBe('a');
    expect(calls).toBe(2);
  });

  it('turns a world record into a game place with station climate, or returns the aliased catalog place', async () => {
    const london = search(await placesOf('GB'), 'London')[0];
    expect((await toGamePlace(london)).id).toBe('gb-london');
    const krakow = search(await placesOf('PL'), 'krakow')[0];
    const pl = await toGamePlace(krakow);
    expect(pl.id).toBe(`gn:${krakow.id}`);
    expect(pl.name).toBe('Kraków');
    expect(pl.region).not.toBe('');
    expect(pl.climate.source?.kind).toBe('stations');
    expect(pl.climate.warmHigh).toBeGreaterThan(pl.climate.coldHigh);
  });

  it('derives the summary climate from monthly normals', () => {
    const s = summaryClimate({ tmax: [5, 6, 10, 14, 19, 23, 25, 25, 20, 14, 9, 6], tmin: [0, 0, 2, 5, 9, 13, 15, 15, 11, 7, 3, 1], wet: [2, 2, 2, 3, 5, 9, 11, 10, 6, 3, 2, 2], prcp: Array(12).fill(40) });
    expect(s.warmHigh).toBe(25);
    expect(s.coldHigh).toBe(5);
    expect(s.wetSeason).toBe('summer');
    expect(summaryClimate({ tmax: Array(12).fill(30), tmin: Array(12).fill(20), wet: Array(12).fill(1), prcp: Array(12).fill(2) }).wetSeason).toBe('arid');
  });

  it('keeps world places used for birth, start, travel and a production base in the save', async () => {
    const bergen = await toGamePlace(search(await placesOf('NO'), 'Bergen')[0]);
    const tromso = await toGamePlace(search(await placesOf('NO'), 'stavanger')[0]);
    const turku = await toGamePlace(search(await placesOf('FI'), 'turku')[0]);
    const d = { ...draft(), birthplaceId: bergen.id, startPlaceId: tromso.id, places: { [bergen.id]: bergen, [tromso.id]: tromso } };
    const s = newGame(d, 1, 'world-save');
    expect(Object.keys(s.places).sort()).toEqual([bergen.id, tromso.id].sort());
    travelTo(s, turku.id);
    expect(s.places[turku.id]).toBeDefined();
    const p = createProject(s, { title: 'North', scenarioId: 'micro', axes: { format: 'short', medium: 'live-action', basePlaceId: tromso.id } } as never);
    expect(p.axes.basePlaceId).toBe(tromso.id);
    const back = deserialize(serialize(s));
    expect(back.places[turku.id].name).toBe('Turku');
    expect(findPlace(tromso.id)?.zone).toBe('Europe/Oslo');
  });
});
