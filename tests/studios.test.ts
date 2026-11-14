// Studios keep releasing (src/engine/studios.ts, docs/WORLD.md): after the records end, each followed studio releases
// invented films at its recorded pace, in its recorded genres and months, kept from the save's own snapshot.
import { afterAll, describe, expect, it } from 'vitest';
import { ensureIndustry, setIndustryWorld, type IndustryWorld } from '../src/engine/industry';
import { asTelevision, snapshotStudios, studioFilm, studioFilms, studioYear, withSeriesRecord, type StudioProfile } from '../src/engine/studios';
import { simulatedEvents } from '../src/catalog/world';
import { deserialize, serialize } from '../src/engine/save';
import { startLife } from './helpers';

const HORIZON = '2026-11-10';
const PIXARISH: StudioProfile = { c: 'company:pixar', n: 3.8, g: [['Animation', 14], ['Family', 10], ['Comedy', 9]], m: [0, 0, 4, 0, 1, 7, 0, 1, 3, 1, 2, 0], ann: { '2028': 2 } };
const world = (studios: StudioProfile[]): IndustryWorld => ({ horizon: HORIZON, builtAt: '2026-11-10T00:00:00Z', series: [], studios });
afterAll(() => setIndustryWorld(null));

describe('a studio after the records end', () => {
  it('releases at its recorded pace, in its recorded genres and months, never on or before the records\' end', () => {
    const all = Array.from({ length: 40 }, (_, i) => studioYear(7, HORIZON, PIXARISH, 2027 + i)).flat();
    // 40 years at 3.8 a year, less the 2 already dated in 2028.
    expect(all.length / 40).toBeGreaterThan(3.0);
    expect(all.length / 40).toBeLessThan(4.6);
    for (const f of all) {
      expect(f.date > HORIZON).toBe(true);
      expect([3, 5, 6, 8, 9, 10, 11]).toContain(Number(f.date.slice(5, 7))); // months it has released in
      expect(f.genres.every((g) => ['Animation', 'Family', 'Comedy'].includes(g))).toBe(true);
      expect(f.id).toMatch(/^sim-film:company:pixar:\d{4}:\d+$/);
    }
    // In the records' last year, only the weeks after they end; none on the day itself.
    expect(studioYear(7, HORIZON, PIXARISH, 2026).every((f) => f.date > HORIZON)).toBe(true);
    expect(studioYear(7, HORIZON, PIXARISH, 2025)).toEqual([]);
  });

  it('counts the films the records already date toward their year', () => {
    const none = { ...PIXARISH, ann: {} };
    const sum = (p: StudioProfile) => Array.from({ length: 30 }, (_, i) => studioYear(i + 1, HORIZON, p, 2028).length).reduce((a, b) => a + b, 0);
    expect(sum(none) - sum(PIXARISH)).toBeGreaterThan(30); // about 2 fewer a year, over 30 seeds
  });

  it('follows the pace: a busier studio releases more, an idle one none (the outcome changes, not only the words)', () => {
    const years = (p: StudioProfile) => Array.from({ length: 30 }, (_, i) => studioYear(3, HORIZON, p, 2027 + i).length).reduce((a, b) => a + b, 0);
    expect(years({ ...PIXARISH, ann: {}, n: 8 })).toBeGreaterThan(years({ ...PIXARISH, ann: {}, n: 2 }) * 2.5);
    expect(years({ ...PIXARISH, n: 0 })).toBe(0);
  });

  it('is the same for a seed, and differs between seeds', () => {
    expect(studioYear(11, HORIZON, PIXARISH, 2029)).toEqual(studioYear(11, HORIZON, { ...PIXARISH }, 2029));
    const a = Array.from({ length: 5 }, (_, i) => studioYear(11, HORIZON, PIXARISH, 2030 + i)).flat().map((f) => f.title);
    const b = Array.from({ length: 5 }, (_, i) => studioYear(12, HORIZON, PIXARISH, 2030 + i)).flat().map((f) => f.title);
    expect(a).not.toEqual(b);
  });
});

describe('a save\'s studios', () => {
  it('take the pace once when the world starts, keep it across a reload, and a later catalog doesn\'t change it', () => {
    setIndustryWorld(world([PIXARISH]));
    const s = startLife('studios-a');
    ensureIndustry(s);
    expect(s.industry!.studios).toEqual(snapshotStudios([PIXARISH]).map((p) => ({ ...p, tv: { n: 0, g: [] } }))); // no series in this world credits it
    const before = studioFilms(s, '2027-01-01', '2030-12-31');
    expect(before.length).toBeGreaterThan(4);
    // A newer catalog with a different pace: the save keeps its own.
    setIndustryWorld(world([{ ...PIXARISH, n: 9 }]));
    ensureIndustry(s);
    const back = deserialize(serialize(s));
    expect(studioFilms(back, '2027-01-01', '2030-12-31')).toEqual(before);
    // Each film is found by its ID, and told as a simulated release by its studio.
    expect(studioFilm(back, before[0].id)).toEqual(before[0]);
    const ev = simulatedEvents(back, '2027-01-01', '2030-12-31').filter((e) => e.k === 'film');
    expect(ev.map((e) => e.r)).toEqual(before.map((f) => f.id));
    expect(ev.every((e) => e.sim === 1 && e.ci?.[0] === 'company:pixar')).toBe(true);
  });

  it('gives a save whose world began before studios kept releasing their pace, once', () => {
    setIndustryWorld(world([PIXARISH]));
    const s = startLife('studios-b');
    s.industry = { horizon: HORIZON, builtAt: '2026-11-10T00:00:00Z', series: {} };
    expect(studioFilms(s, '2027-01-01', '2027-12-31')).toEqual([]);
    expect(ensureIndustry(s)).toBe(true);
    expect(s.industry.studios).toHaveLength(1);
    expect(ensureIndustry(s)).toBe(false);
  });

  it('releases nothing without a catalog', () => {
    setIndustryWorld(null);
    const s = startLife('studios-c');
    expect(ensureIndustry(s)).toBe(false);
    expect(studioFilms(s, '2027-01-01', '2040-12-31')).toEqual([]);
  });
});

describe('a studio\'s television record (November 14, 2026)', () => {
  // Labelled fixture: three followed series, two crediting the studio. Only the fields the record reads are filled.
  const SERIES = [
    { ci: [PIXARISH.c], genres: ['Animation', 'Comedy'] },
    { ci: [PIXARISH.c, 'company:other'], genres: ['Animation', 'Kids'] },
    { ci: ['company:other'], genres: ['Drama'] },
  ];
  const later = { horizon: HORIZON, builtAt: '2027-01-01T00:00:00Z', series: [{ ...SERIES[2], ci: [PIXARISH.c] }] } as unknown as IndustryWorld;

  it('counts the series that credit it and their genres, and is a maker of series only where some do', () => {
    const [p] = withSeriesRecord([PIXARISH], SERIES);
    expect(p.tv).toEqual({ n: 2, g: [['Animation', 2], ['Comedy', 1], ['Kids', 1]] });
    expect(asTelevision(p)).toMatchObject({ n: 2, g: p.tv!.g });
    expect(asTelevision(withSeriesRecord([PIXARISH], [])[0])).toBeNull();
    expect(asTelevision(PIXARISH)).toBeNull(); // a save that kept no record offers no television deal
  });

  it('is added once to a save whose studios were kept before it, and a later catalog doesn\'t change it', () => {
    const s = startLife('studios-tv');
    s.industry = { horizon: HORIZON, builtAt: '2026-11-10T00:00:00Z', series: {}, studios: snapshotStudios([PIXARISH]) };
    setIndustryWorld({ ...world([PIXARISH]), series: SERIES } as unknown as IndustryWorld);
    expect(ensureIndustry(s)).toBe(true);
    expect(s.industry.studios![0].tv!.n).toBe(2);
    setIndustryWorld(later);
    expect(ensureIndustry(s)).toBe(false);
    expect(s.industry.studios![0].tv!.n).toBe(2);
    expect(deserialize(serialize(s)).industry!.studios![0].tv).toEqual(s.industry.studios![0].tv);
  });
});
