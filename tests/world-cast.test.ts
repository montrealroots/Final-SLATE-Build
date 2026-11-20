// The simulated world's titles and people (src/engine/world-cast.ts; the owner, November 20, 2026: "no repetitiveness
// ... freshness and realism year by year"). Until then, measured over 2027-2036 for three seeds, about 60% of a
// season's titles by 2036 had been used before, and from 2029 nearly every credit named a stranger who shared a name.
import { describe, expect, it } from 'vitest';
import { seasonSlate } from '../src/engine/awards';
import { COHORT, NAME_YEARS, TITLE_YEARS, cohort, worldTitle, working } from '../src/engine/world-cast';

describe('the world\'s titles and people', () => {
  it('never gives a season a title another season used, over a hundred seasons, for any seed', () => {
    for (const seed of [1, 42, 9001]) {
      const seen = new Map<string, number>();
      for (let y = 2026; y < 2126; y++) for (const f of seasonSlate(seed, y)) {
        expect(seen.get(f.title) ?? y).toBe(y);
        seen.set(f.title, y);
      }
      expect(seen.size).toBe(100 * 120);
    }
    expect(TITLE_YEARS).toBeGreaterThanOrEqual(160); // 2020 to 2180 at least, before the space wraps
  }, 120_000);

  it('gives every title slot of a century its own title, and different saves different worlds', () => {
    const all = new Set<string>();
    for (let y = 2026; y < 2126; y++) for (let slot = 0; slot < 1024; slot += 7) all.add(worldTitle(5, y, slot));
    expect(all.size).toBe(100 * Math.ceil(1024 / 7));
    expect(seasonSlate(1, 2030).map((f) => f.title)).not.toEqual(seasonSlate(2, 2030).map((f) => f.title));
    expect(seasonSlate(1, 2030)).toEqual(seasonSlate(1, 2030)); // the same seed, the same world
  });

  it('names each person once, for good, and no name belongs to two people', () => {
    const byName = new Map<string, string>();
    for (let y = 1986; y < 2126; y++) for (const p of cohort(7, y)) {
      expect(byName.get(p.name) ?? p.id).toBe(p.id);
      byName.set(p.name, p.id);
    }
    expect(byName.size).toBe(140 * COHORT);
    expect(NAME_YEARS).toBeGreaterThan(400);
  });

  it('brings the same people back as their careers go on: a director films again, better or worse with the years', () => {
    const seasons = new Map<string, number[]>();
    for (let y = 2027; y <= 2046; y++) for (const f of seasonSlate(11, y)) seasons.set(f.people.director, [...(seasons.get(f.people.director) ?? []), y]);
    const returning = [...seasons.values()].filter((ys) => ys.length >= 3);
    expect(returning.length).toBeGreaterThan(100); // most directors work more than one season
    // No director makes two films in one season.
    for (let y = 2027; y <= 2046; y++) { const ds = seasonSlate(11, y).map((f) => f.people.director); expect(new Set(ds).size).toBe(ds.length); }
    // A career has a shape: someone's skill in their peak years beats their first and their last.
    const d = working(11, 2040, 'director').find((p) => p.last - p.debut >= 20)!;
    const at = (y: number) => d.skillIn(y);
    const peak = Math.max(...Array.from({ length: d.last - d.debut }, (_, i) => at(d.debut + i)));
    expect(peak).toBeGreaterThan(at(d.last));
    // People retire and new ones debut: the directors at work in 2026 and in 2066 are mostly different people.
    const then = new Set(working(11, 2026, 'director').map((p) => p.id));
    const later = working(11, 2066, 'director');
    expect(later.filter((p) => then.has(p.id)).length / later.length).toBeLessThan(0.15);
  });

  it('makes a stronger director\'s year a stronger film: the slate follows the people', () => {
    // Falsifiability: the film's director score is the director's skill that year, give or take.
    const slate = seasonSlate(3, 2035);
    const pool = new Map(working(3, 2035, 'director').map((p) => [p.name, p]));
    const gaps = slate.map((f) => Math.abs(f.scores.director - pool.get(f.people.director)!.skillIn(2035)));
    expect(Math.max(...gaps)).toBeLessThan(20);
    expect(gaps.reduce((a, b) => a + b, 0) / gaps.length).toBeLessThan(5);
  });
});
