// Competition and careers (docs/WORLD.md): a followed studio's films after the records end enter awards and festivals in
// their release window, take screens in cinemas, and the studios make offers through the game's existing systems.
import { afterAll, describe, expect, it } from 'vitest';
import { categoriesFor, ensureEditions, institution } from '../src/engine/awards';
import { rivalWords, rivalsFor } from '../src/engine/awards-results';
import { setIndustryWorld } from '../src/engine/industry';
import { careerStudio, studioFilms, type StudioProfile } from '../src/engine/studios';
import { fitWeight } from '../src/engine/strategy';
import { inCinemas, simulatedOpenings } from '../src/world/programme';
import type { GameState } from '../src/engine/types';
import { startLife } from './helpers';

const HORIZON = '2026-11-10';
const PIXAR: StudioProfile = { c: 'company:pixar', name: 'Pixar', n: 8, g: [['Animation', 5], ['Family', 4], ['Comedy', 3], ['Drama', 2]], m: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], ann: {} };
const SMALL: StudioProfile = { c: 'company:tiny', name: 'Tiny Pictures', n: 0.5, g: [['Drama', 1]], m: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], ann: {} };
afterAll(() => setIndustryWorld(null));

function withStudios(tag: string, studios: StudioProfile[]): GameState {
  const s = startLife(tag);
  s.industry = { horizon: HORIZON, builtAt: '2026-11-10T00:00:00Z', series: {}, studios };
  return s;
}

describe('a studio\'s films compete', () => {
  it('enter an award in their release window, named with their studio, and only where the category takes them', () => {
    const s = withStudios('comp-a', [PIXAR]);
    ensureEditions(s, 2027);
    ensureEditions(s, 2028);
    const ed = s.editions.find((e) => e.id === 'oscars-2028')!;
    const cats = categoriesFor(institution(ed.institutionId), ed.year);
    const picture = rivalsFor(s, ed, cats.find((c) => c.id === 'picture')!);
    const films = studioFilms(s, ed.eligibility.from, ed.eligibility.to);
    expect(films.length).toBeGreaterThan(3);
    const fromPixar = picture.filter((c) => c.film.studio === 'company:pixar');
    // Every film the studio released in 2027, and none from outside the window.
    expect(fromPixar.map((c) => c.filmKey).sort()).toEqual(films.filter((f) => !f.genres.includes('Documentary')).map((f) => f.id).sort());
    expect(fromPixar.every((c) => c.filmKey.startsWith('sim-film:company:pixar:'))).toBe(true);
    expect(rivalWords(fromPixar[0].film)).toMatch(/ from .+ \(simulated\)/);
    // A category for another format takes none of them.
    const doc = cats.find((c) => c.formats.every((f) => f !== 'feature'));
    if (doc) expect(rivalsFor(s, ed, doc).some((c) => c.film.studio)).toBe(false);
    // Without the studios' pace, the field is the season's as before (the outcome changes, not only the words).
    const bare = withStudios('comp-a', []);
    ensureEditions(bare, 2027);
    ensureEditions(bare, 2028);
    const before = rivalsFor(bare, bare.editions.find((e) => e.id === 'oscars-2028')!, cats.find((c) => c.id === 'picture')!);
    expect(before.some((c) => c.film.studio)).toBe(false);
  });

  it('are the same field on every call for a seed', () => {
    const s = withStudios('comp-b', [PIXAR]);
    ensureEditions(s, 2028);
    const ed = s.editions.find((e) => e.id === 'oscars-2028')!;
    const cat = categoriesFor(institution(ed.institutionId), ed.year).find((c) => c.id === 'picture')!;
    expect(rivalsFor(s, ed, cat)).toEqual(rivalsFor(s, ed, cat));
  });

  it('play in cinemas from their date, wide, labelled by their ID', () => {
    const s = withStudios('comp-c', [PIXAR]);
    const f = studioFilms(s, '2027-03-01', '2027-12-31')[0];
    const openings = simulatedOpenings([f], 'GB');
    expect(openings).toEqual([[f.id, f.title, 'GB', f.date, 0]]);
    expect(inCinemas(openings, s, 'GB', f.date).map((x) => x.ref)).toEqual([f.id]);
    const day = (n: number) => new Date(Date.parse(`${f.date}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
    expect(inCinemas(openings, s, 'GB', day(-1))).toEqual([]);
    expect(inCinemas(openings, s, 'GB', day(60))).toEqual([]);
  });
});

describe('a studio offers work', () => {
  it('makes about half the offers once the save\'s world has studios, by how near its record is to the work and never by its size, and none without', () => {
    const s = withStudios('comp-d', [PIXAR, SMALL]);
    // An animated family film: the animation studio's record fits it. A live-action drama: only the small drama label's does.
    const cartoon = (x: StudioProfile) => fitWeight(x, ['family', 'animation'], 'animation');
    const drama = (x: StudioProfile) => fitWeight(x, ['drama'], 'live-action');
    const picks = Array.from({ length: 400 }, (_, i) => careerStudio(s, `k${i}`, cartoon));
    const named = picks.filter(Boolean);
    expect(named.length).toBeGreaterThan(160);
    expect(named.length).toBeLessThan(240);
    expect(new Set(named)).toEqual(new Set(['Pixar', 'Tiny Pictures'])); // a thin record counts a little for anything
    expect(named.filter((x) => x === 'Pixar').length).toBeGreaterThan(named.length * 0.6);
    // The busiest studio makes none of the offers for a film it wouldn't make: sixteen times the pace counts for nothing.
    const forDrama = Array.from({ length: 400 }, (_, i) => careerStudio(s, `k${i}`, drama)).filter(Boolean);
    expect(forDrama.length).toBeGreaterThan(160);
    expect(forDrama.every((x) => x === 'Tiny Pictures')).toBe(true);
    expect(careerStudio(s, 'k1', drama)).toBe(careerStudio(s, 'k1', drama));
    expect(careerStudio(withStudios('comp-e', []), 'k1', drama)).toBeUndefined();
    expect(careerStudio(withStudios('comp-f', [PIXAR]), 'k1', () => 0)).toBeUndefined(); // no studio whose record fits: none is named
  });
});
