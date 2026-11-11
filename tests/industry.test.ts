// The living world's engine (src/engine/industry.ts): series continue past the records' end, decided by the save's seed and
// stored in the save. Made-up series of each kind; no TMDB data is in the repository.
import { afterAll, describe, expect, it } from 'vitest';
import { DAY, processUntil } from '../src/engine';
import { ensureIndustry, episodeDates, outletOf, renewalOdds, setIndustryWorld, type IndustryWorld, type SeriesProfile } from '../src/engine/industry';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState } from '../src/engine/types';
import { startLife } from './helpers';

const prof = (r: string, over: Partial<SeriesProfile>): SeriesProfile => ({
  r, t: r, status: 'Returning Series', type: 'Scripted', net: ['ABC'], ci: [], genres: ['Drama'], daily: 0, aired: 1,
  seasons: [{ n: 1, eps: 10, dated: 10, d0: '2026-09-22', d1: '2026-11-24', gap: 7, drop: 0 }], regulars: [{ p: 1, name: 'Ada Quill', ch: 'Mara' }], ...over,
});
const WORLD: IndustryWorld = {
  horizon: '2026-11-10', builtAt: '2026-11-10T20:00:00Z',
  series: [
    // Still airing at the records' end: decided at the May upfronts after its finale.
    prof('tv:1', { t: 'Fall Drama', aired: 3, seasons: [{ n: 3, eps: 22, dated: 8, d0: '2026-09-24', d1: '2026-11-12', gap: 7, drop: 0 }] }),
    // Ended its season before the records' end and still listed as running: already renewed, so its next season is dated.
    prof('tv:2', { t: 'Spring Comedy', net: ['FOX'], aired: 4, seasons: [{ n: 4, eps: 13, dated: 13, d0: '2026-01-05', d1: '2026-03-30', gap: 7, drop: 0 }] }),
    prof('tv:3', { t: 'Streaming Drop', net: ['Disney+'], seasons: [{ n: 1, eps: 8, dated: 8, d0: '2026-12-01', d1: '2026-12-01', gap: 0, drop: 1 }] }),
    prof('tv:4', { t: 'Limited Story', net: ['Hulu'], type: 'Miniseries', seasons: [{ n: 1, eps: 6, dated: 6, d0: '2026-11-20', d1: '2026-12-25', gap: 7, drop: 0 }] }),
    prof('tv:5', { t: 'New Pilot', status: 'Pilot', aired: 0, seasons: [] }),
    prof('tv:6', { t: 'Morning Desk', net: ['Syndication'], daily: 1, genres: ['Talk'], aired: 30, seasons: [{ n: 30, eps: 180, dated: 60, d0: '2026-09-08', d1: '2026-11-13', gap: 1, drop: 0 }] }),
    prof('tv:7', { t: 'Little Explorers', net: ['Disney Junior'], genres: ['Animation', 'Kids'], aired: 2, seasons: [{ n: 2, eps: 20, dated: 20, d0: '2026-10-01', d1: '2026-12-10', gap: 3, drop: 0 }] }),
    // A Wednesday comedy whose recorded season took a three-week break after its third episode.
    prof('tv:8', { t: 'Wednesday Comedy', aired: 5, seasons: [{ n: 5, eps: 6, dated: 6, d0: '2025-10-01', d1: '2025-11-19', gap: 7, drop: 0, offs: [0, 7, 14, 35, 42, 49] }] }),
  ],
};
afterAll(() => setIndustryWorld(null));
const run = (seedTag: string, until: string): GameState => {
  setIndustryWorld(WORLD);
  const s = startLife(seedTag);
  ensureIndustry(s);
  processUntil(s, Date.parse(`${until}T00:00:00Z`), 'advance', 1_000_000);
  return s;
};

describe('the living world\'s engine', () => {
  it('starts once, only with the catalog, and decides nothing before the records end', () => {
    setIndustryWorld(null);
    const none = startLife('ind-none');
    expect(ensureIndustry(none)).toBe(false);
    expect(none.industry).toBeUndefined();
    setIndustryWorld(WORLD);
    const s = startLife('ind-start');
    expect(ensureIndustry(s)).toBe(true);
    expect(ensureIndustry(s)).toBe(false);
    const decisions = s.events.filter((e) => e.kind === 'industry-decision');
    expect(decisions).toHaveLength(WORLD.series.length);
    for (const e of decisions) expect(new Date(e.at).toISOString().slice(0, 10) > '2026-11-10').toBe(true);
  });

  it('times each outlet as networks do: the May upfronts for broadcast, months after the finale elsewhere', () => {
    const s = run('ind-time', '2028-12-31');
    const first = (r: string) => s.industry!.series[r].outcomes[0];
    expect(first('tv:1').at.slice(5, 7)).toBe('05'); // a September to May season, decided at the upfronts
    expect(first('tv:1').at.slice(0, 4)).toBe('2027');
    expect(first('tv:2')).toMatchObject({ kind: 'dated', n: 5 }); // already renewed: dated, not decided again
    expect(first('tv:2').at < '2026-12-11').toBe(true);
    expect(first('tv:4')).toMatchObject({ kind: 'concluded', n: 1 }); // a limited series ends as planned
    expect(s.industry!.series['tv:4'].closed).toBe(true);
    expect(['ordered', 'passed']).toContain(first('tv:5').kind);
    const drop = first('tv:3');
    expect(drop.at > '2026-12-31' && drop.at < '2027-04-01').toBe(true); // one to four months after its December drop
  });

  it('gives a renewed series a dated season on its outlet\'s schedule, released the way the last one was', () => {
    for (let i = 0; i < 12; i++) {
      const s = run(`ind-season-${i}`, '2030-12-31');
      const drama = s.industry!.series['tv:1'];
      if (drama.outcomes[0].kind !== 'renewed') continue;
      const next = drama.seasons[0];
      expect(next).toMatchObject({ n: 4, eps: 22, gap: 7, drop: false });
      expect(next.premiere > drama.outcomes[0].at).toBe(true);
      expect(['09', '10']).toContain(next.premiere.slice(5, 7)); // a fall show returns in the fall
      expect(episodeDates(next)).toHaveLength(22);
      expect(episodeDates(next)[1]).toBe(new Date(Date.parse(next.premiere) + 7 * DAY).toISOString().slice(0, 10));
      return;
    }
    throw new Error('No seed of twelve renewed the drama; the odds are wrong.');
  });

  it('keeps a series going until it ends: every renewal is followed by a later decision, and an ending stops it', () => {
    const s = run('ind-chain', '2040-12-31');
    for (const [r, sim] of Object.entries(s.industry!.series)) {
      const dates = sim.outcomes.map((o) => o.at);
      expect([...dates].sort(), r).toEqual(dates);
      const last = sim.outcomes.at(-1);
      if (sim.closed) expect(['cancelled', 'concluded', 'passed']).toContain(last?.kind);
      else expect(s.events.some((e) => e.kind === 'industry-decision' && e.payload.r === r), r).toBe(true);
      for (const [i, season] of sim.seasons.entries()) if (i) expect(season.premiere > sim.seasons[i - 1].premiere).toBe(true);
    }
    // The daily programme rolls into a new year each September, on the Tuesday nearest its recorded date (September 8):
    // the weekday holds and the date doesn't drift.
    const daily = s.industry!.series['tv:6'];
    expect(daily.seasons.length).toBeGreaterThan(3);
    for (const season of daily.seasons) {
      expect(new Date(`${season.premiere}T12:00:00Z`).getUTCDay()).toBe(2);
      expect(season.premiere.slice(5) >= '09-05' && season.premiere.slice(5) <= '09-11').toBe(true);
    }
  });

  it('keeps a series\' own rhythm: its usual night, its recorded breaks, and an ending dated at its finale', () => {
    const s = run('ind-rhythm', '2027-06-30');
    const next = s.industry!.series['tv:8'].seasons[0];
    expect(next.n).toBe(6);
    expect(new Date(`${next.premiere}T12:00:00Z`).getUTCDay()).toBe(3); // a Wednesday, like its recorded premiere
    const days = episodeDates(next).map((d) => Date.parse(d) / DAY);
    expect(days.slice(1).map((d, i) => d - days[i])).toEqual([7, 7, 21, 7, 7]); // the three-week break comes with it
    // A final season ends with its finale, not at the next upfronts.
    let finals = 0;
    // Seeds until three endings have been checked (up to thirty): each save runs eight years, so all thirty took over
    // five seconds on CI, past the test timeout.
    for (let i = 0; i < 30 && finals < 3; i++) {
      const t = run(`ind-final-${i}`, '2034-12-31');
      for (const sim of Object.values(t.industry!.series)) for (const o of sim.outcomes) {
        const season = sim.seasons.find((x) => x.n === o.n);
        if (o.kind !== 'concluded' || !season) continue;
        finals++;
        expect(o.at).toBe(episodeDates(season).at(-1));
      }
    }
    expect(finals).toBeGreaterThan(0);
  });

  it('is the same for a seed and different across seeds, and survives a reload', () => {
    const a = run('ind-same', '2032-12-31');
    const b = run('ind-same', '2032-12-31');
    expect(b.industry).toEqual(a.industry);
    const outcomes = new Set(Array.from({ length: 10 }, (_, i) => JSON.stringify(run(`ind-vary-${i}`, '2032-12-31').industry!.series['tv:1'].outcomes.map((o) => o.kind))));
    expect(outcomes.size).toBeGreaterThan(1);
    const back = deserialize(serialize(a));
    expect(back.industry).toEqual(a.industry);
  });

  it('waits, changing nothing, when the catalog is gone', () => {
    setIndustryWorld(WORLD);
    const s = startLife('ind-gone');
    ensureIndustry(s);
    setIndustryWorld(null);
    processUntil(s, Date.parse('2029-01-01T00:00:00Z'), 'advance', 1_000_000);
    for (const sim of Object.values(s.industry!.series)) expect(sim.outcomes).toEqual([]);
  });

  it('reads the outlet and the run, never TMDB ratings: new series are riskiest, long-running animation safest', () => {
    const p = WORLD.series[0];
    expect(outletOf(p)).toBe('broadcast');
    expect(outletOf(WORLD.series[2])).toBe('streaming');
    expect(outletOf(WORLD.series[5])).toBe('daily');
    expect(outletOf(WORLD.series[6])).toBe('kids');
    expect(renewalOdds(p, 1)).toBeLessThan(renewalOdds(p, 3));
    expect(renewalOdds({ ...p, genres: ['Animation', 'Comedy'] }, 30)).toBe(0.93);
    expect(Object.keys(p)).not.toContain('rating');
  });
});
