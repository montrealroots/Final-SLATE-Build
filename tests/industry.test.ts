// The living world's engine (src/engine/industry.ts): series continue past the records' end, decided by the save's seed and
// stored in the save. Made-up series of each kind; no TMDB data is in the repository.
import { afterAll, describe, expect, it } from 'vitest';
import { DAY, processUntil } from '../src/engine';
import { applyWorldRefresh, ensureIndustry, episodeDates, expireIndustrySources, freezeSeries, outletOf, sourcesExpire, worldRefreshPreview, profileFor, recordedUpTo, renewalOdds, setIndustryWorld, type IndustryWorld, type SeriesProfile } from '../src/engine/industry';
import { worldEventsBetween, type WorldSeed } from '../src/catalog/world';
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
const addDays = (key: string, n: number) => new Date(Date.parse(`${key}T12:00:00Z`) + n * DAY).toISOString().slice(0, 10);
/** A series as the odds read it: its frozen profile. */
const odds = (p: SeriesProfile) => freezeSeries(p, WORLD.horizon);
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
    // A network Wikidata records as a cable channel (HBO, Showtime, USA Network) makes a series cable, which until
    // November 11, 2026 counted as streaming; one it records as streaming, or doesn't record, stays streaming.
    const other = { ...WORLD.series[2], net: ['HBO'] };
    expect(outletOf({ ...other, nk: ['cable'] })).toBe('cable');
    expect(outletOf({ ...other, nk: ['streaming'] })).toBe('streaming');
    expect(outletOf({ ...other, nk: ['cable', 'streaming'] })).toBe('cable');
    expect(outletOf(other)).toBe('streaming');
    expect(outletOf({ ...other, net: ['Univision'] })).toBe('broadcast');
    // Cable timing: decided months after the finale, not at the May upfronts.
    expect(renewalOdds(odds({ ...other, nk: ['cable'] }), 1)).not.toBe(renewalOdds(odds(other), 1));
    expect(renewalOdds(odds(p), 1)).toBeLessThan(renewalOdds(odds(p), 3));
    expect(renewalOdds(odds({ ...p, genres: ['Animation', 'Comedy'] }), 30)).toBe(0.93);
    expect(Object.keys(p)).not.toContain('rating');
  });
});

// November 11, 2026 (the owner's foundation brief, item 3): the save's world holds whatever happens to the catalog around it.
describe('the living world, held steady by the save', () => {
  const until = (s: GameState, key: string) => processUntil(s, Date.parse(`${key}T00:00:00Z`), 'advance', 1_000_000);

  it('a catalog that loads late, or goes away and comes back, decides exactly what one there all along would have', () => {
    const steady = run('ind-late', '2031-12-31');
    setIndustryWorld(WORLD);
    const late = startLife('ind-late');
    ensureIndustry(late);
    setIndustryWorld(null);
    until(late, '2028-06-01');
    setIndustryWorld(WORLD);
    until(late, '2031-12-31');
    expect(late.industry).toEqual(steady.industry);
    // Something was due while it was away, or this would prove nothing.
    expect(steady.industry!.series['tv:1'].outcomes.some((o) => o.at < '2028-06-01')).toBe(true);
  });

  it('a save reloaded partway, or played between turns of another save, ends where one played straight through does', () => {
    const straight = run('ind-split', '2031-12-31');
    const first = run('ind-split', '2028-03-01');
    const reloaded = deserialize(serialize(first));
    const other = run('ind-other', '2029-01-01');
    until(reloaded, '2031-12-31');
    until(other, '2031-12-31');
    expect(reloaded.industry).toEqual(straight.industry);
    expect(other.industry).toEqual(run('ind-other', '2031-12-31').industry);
    expect(other.industry).not.toEqual(straight.industry);
  });

  it('a later catalog corrects the records but never rewrites what the save decided, or adds seasons the save has made', () => {
    const before = run('ind-refresh', '2029-01-01');
    const decided = structuredClone(before.industry!);
    // A year later TMDB records the real Season 4 of Fall Drama, and a later end to the records.
    const refreshed: IndustryWorld = {
      horizon: '2027-11-10', builtAt: '2027-11-10T20:00:00Z',
      series: WORLD.series.map((p) => p.r !== 'tv:1' ? p : { ...p, aired: 4, seasons: [...p.seasons, { n: 4, eps: 22, dated: 22, d0: '2027-09-23', d1: '2028-05-18', gap: 7, drop: 0 }] }),
    };
    setIndustryWorld(refreshed);
    expect(profileFor(before, 'tv:1')!.seasons.map((f) => f.n)).toEqual([3]);
    expect(recordedUpTo(before, 'tv:1')).toBe(3);
    until(before, '2032-12-31');
    // The save's own source version and start stay its own.
    expect([before.industry!.builtAt, before.industry!.horizon]).toEqual([decided.builtAt, decided.horizon]);
    for (const [r, sim] of Object.entries(decided.series)) {
      const now = before.industry!.series[r];
      expect(now.outcomes.slice(0, sim.outcomes.length)).toEqual(sim.outcomes);
      expect(now.seasons.slice(0, sim.seasons.length)).toEqual(sim.seasons);
    }
    // The recorded Season 4 isn't told beside the save's own: no season number twice.
    const seed: WorldSeed = { version: 1, builtAt: refreshed.builtAt, horizon: refreshed.horizon, from: '2025-10-01', events: [
      { d: '2027-09-23', k: 'season', r: 'tv:1:s:4', t: 'Fall Drama', s: 4, eps: 22 },
      { d: '2027-09-23', k: 'episode', r: 'tv:1:s:4:e:1', t: 'Fall Drama', s: 4, e: 1, n: 'Pilot Light' },
      { d: '2027-10-01', k: 'end', r: 'tv:1', t: 'Fall Drama', st: 'Ended', la: '2027-09-30' },
      { d: '2027-10-01', k: 'film', r: 'movie:9', t: 'Unrelated Film' },
    ] };
    const told = worldEventsBetween(seed, before, '2027-01-01', '2028-12-31');
    expect(told.filter((e) => !e.sim).map((e) => e.r)).toEqual(['movie:9']);
    const seasons = told.filter((e) => e.k === 'season' && e.r.startsWith('tv:1')).map((e) => e.s);
    expect(new Set(seasons).size).toBe(seasons.length);
    // A save whose world began before the refresh, with nothing decided yet, still began from Season 3.
    setIndustryWorld(WORLD);
    const young = startLife('ind-young');
    ensureIndustry(young);
    setIndustryWorld(refreshed);
    until(young, '2026-11-11');
    expect(young.industry!.series['tv:1'].outcomes).toEqual([]);
    expect(recordedUpTo(young, 'tv:1')).toBe(3);
  });

  it('a save begun before the recorded seasons were kept takes them from the first catalog that decides for it, and keeps them', () => {
    const s = run('ind-legacy', '2026-11-11');
    for (const sim of Object.values(s.industry!.series)) delete sim.rec;
    until(s, '2032-12-31');
    expect(s.industry!.series['tv:1'].rec).toBe(3);
    expect(s.industry!.series['tv:2'].rec).toBe(4);
  });

  // November 11, 2026 (the Creative Depth package, milestone A): every input a decision reads is kept in the save.
  it('decides from what the save froze, whatever a later catalog says about the series', () => {
    const steady = run('ind-frozen', '2036-12-31');
    const s = run('ind-frozen', '2026-11-11');
    // The same seasons, but everything else a decision used to read has changed: the network (so the kind of outlet),
    // the kind of series, its genres, how many seasons it has had, its pattern, its dates and its cast.
    const changed: IndustryWorld = {
      ...WORLD, builtAt: '2027-02-01T00:00:00Z',
      series: WORLD.series.map((p) => ({
        ...p, net: ['Disney+'], nk: ['streaming' as const], type: p.type === 'Miniseries' ? 'Scripted' : 'Miniseries', status: p.status === 'Pilot' ? 'Returning Series' : p.status,
        genres: ['Animation', 'Kids'], daily: (p.daily ? 0 : 1) as 0 | 1, aired: p.aired + 7,
        seasons: p.seasons.map((f) => ({ ...f, eps: f.eps + 5, dated: f.dated + 5, gap: 3, d0: addDays(f.d0, 40), d1: f.d1 && addDays(f.d1, 40), offs: undefined })),
        regulars: [{ p: 99, name: 'Someone Else', ch: null }],
      })),
    };
    setIndustryWorld(changed);
    until(s, '2036-12-31');
    expect(s.industry).toEqual(steady.industry);
    // And the same after a save and reload under the changed catalog.
    const reloaded = deserialize(serialize(run('ind-frozen', '2028-06-01')));
    setIndustryWorld(changed);
    until(reloaded, '2036-12-31');
    expect(reloaded.industry).toEqual(steady.industry);
  });

  it('keeps the game\'s own classes and person IDs, no names, and drops the copied seasons once it has made one of its own', () => {
    const young = run('ind-kept', '2026-11-11');
    for (const [r, sim] of Object.entries(young.industry!.series)) {
      const p = sim.p!;
      expect(Object.keys(p).sort(), r).toEqual(expect.arrayContaining(['aired', 'anim', 'mini', 'o', 'pilot', 'reg', 'v']));
      expect(Object.keys(p).filter((k) => !['v', 'o', 'mini', 'pilot', 'anim', 'aired', 'm', 'anchor', 'reg', 'last', 'model'].includes(k)), r).toEqual([]);
      expect(p.v).toBe(1);
      expect(p.aired).toBeLessThanOrEqual(6);
      expect(p.reg).toEqual([1]);
      // Nothing in a save names a series, a network or a person from the catalog.
      expect(JSON.stringify(sim)).not.toMatch(/Ada Quill|Fall Drama|Mara|ABC|Disney/);
    }
    expect(young.industry!.series['tv:6'].p!.aired).toBe(6); // thirty seasons, counted as far as the rules read
    expect(young.industry!.series['tv:5'].p!.last).toBeUndefined(); // a pilot has no season to copy
    const old = run('ind-kept', '2036-12-31');
    for (const [r, sim] of Object.entries(old.industry!.series)) {
      if (sim.seasons.length) expect([sim.p!.last, sim.p!.model], r).toEqual([undefined, undefined]);
    }
    expect(Object.values(old.industry!.series).some((x) => x.seasons.length)).toBe(true);
  });

  it('a save begun before the profiles were kept freezes them from the first catalog that loads, up to the seasons it began with', () => {
    const steady = run('ind-legacy-p', '2034-12-31');
    const s = run('ind-legacy-p', '2026-11-11');
    for (const sim of Object.values(s.industry!.series)) delete sim.p;
    expect(ensureIndustry(s)).toBe(true);
    expect(ensureIndustry(s)).toBe(false);
    until(s, '2034-12-31');
    expect(s.industry).toEqual(steady.industry);
  });

  it('deletes its copies of recorded seasons after TMDB\'s six months, and nothing the save decided', () => {
    const s = run('ind-expire', '2027-03-01');
    const ends = sourcesExpire(s.industry!);
    expect(new Date(ends).toISOString().slice(0, 10)).toBe('2027-05-09'); // 180 days after the records were gathered
    const before = structuredClone(s.industry!);
    expect(expireIndustrySources(s, ends - 1)).toBe(false);
    expect(s.industry).toEqual(before);
    expect(Object.values(before.series).some((x) => x.p!.last || x.p!.model)).toBe(true);
    expect(expireIndustrySources(s, ends)).toBe(true);
    expect(expireIndustrySources(s, ends + DAY)).toBe(false);
    for (const [r, sim] of Object.entries(s.industry!.series)) {
      expect([sim.p!.last, sim.p!.model], r).toEqual([undefined, undefined]);
      expect([sim.outcomes, sim.seasons, sim.closed, sim.rec], r).toEqual([before.series[r].outcomes, before.series[r].seasons, before.series[r].closed, before.series[r].rec]);
    }
    // A series decided before the copies went carries on from its own season, with no catalog needed for its pattern.
    const decided = Object.entries(s.industry!.series).filter(([, x]) => x.seasons.length && !x.closed).map(([r]) => r);
    expect(decided.length).toBeGreaterThan(0);
    // One nothing was decided for is marked, waits while no catalog is loaded, and takes its pattern from the next one.
    const waiting = Object.entries(s.industry!.series).filter(([, x]) => x.p!.expired).map(([r]) => r);
    expect(waiting).toContain('tv:1'); // due at the May 2027 upfronts, which this save hasn't reached
    setIndustryWorld(null);
    until(s, '2027-12-31');
    for (const r of waiting) expect(s.industry!.series[r].outcomes, r).toEqual([]);
    setIndustryWorld(WORLD);
    until(s, '2028-12-31');
    for (const r of waiting) {
      expect(s.industry!.series[r].outcomes.length, r).toBeGreaterThan(0);
      expect(s.industry!.series[r].p!.expired, r).toBeUndefined();
    }
  });

  it('takes newer records only when asked, only for series nothing was decided for, and says first what would change', () => {
    const s = run('ind-opt-in', '2026-11-12');
    expect(worldRefreshPreview(s)).toBeNull(); // the installed catalog is the save's own
    const decided = 'tv:2'; // dated within a month of the records' end
    until(s, '2027-01-15');
    expect(s.industry!.series[decided].outcomes.length).toBe(1);
    const newer: IndustryWorld = {
      horizon: '2027-01-10', builtAt: '2027-01-10T20:00:00Z',
      series: [
        ...WORLD.series.map((p) => p.r === 'tv:1' ? { ...p, net: ['Disney+'], aired: 3, seasons: [{ n: 3, eps: 18, dated: 18, d0: '2026-09-24', d1: '2027-01-07', gap: 7, drop: 0 as const }] }
          : p.r === decided ? { ...p, net: ['Hulu'], regulars: [] } : p),
        prof('tv:9', { t: 'Brand New Show', net: ['FX'], aired: 1, seasons: [{ n: 1, eps: 8, dated: 8, d0: '2026-12-01', d1: '2027-01-05', gap: 5, drop: 0 }] }),
      ],
    };
    setIndustryWorld(newer);
    const preview = worldRefreshPreview(s)!;
    expect(preview.changes.map((c) => c.r)).toEqual(['tv:1']);
    expect(preview.changes[0].what).toEqual([
      'It is now counted as on a streaming service, not a broadcast network, which changes when its future is decided.',
      'A new season would have 18 episodes, not 22.',
      'Its last recorded season ends on a different day, which moves its decision.',
    ]);
    expect(preview.added).toEqual([{ r: 'tv:9', title: 'Brand New Show' }]);
    expect(preview.kept).toBeGreaterThanOrEqual(1);
    // Looking changes nothing.
    const untouched = structuredClone(s.industry!);
    worldRefreshPreview(s);
    expect(s.industry).toEqual(untouched);
    // Without asking, the save goes on from what it froze.
    const declined = structuredClone(s);
    until(declined, '2030-12-31');
    expect(declined.industry!.series['tv:1'].p?.o ?? 'broadcast').toBe('broadcast');
    expect(declined.industry!.series['tv:9']).toBeUndefined();
    // Asked: the undecided series takes the newer records, the new one joins, and the decided one is left alone.
    const taken = applyWorldRefresh(s, '2027-01-15')!;
    expect(taken).toEqual({ at: '2027-01-15', builtAt: newer.builtAt, series: 1, added: 1 });
    expect(s.industry!.series['tv:1'].p!.o).toBe('streaming');
    expect(s.industry!.series['tv:1'].p!.model!.eps).toBe(18);
    expect(s.industry!.series[decided]).toEqual(untouched.series[decided]);
    expect([s.industry!.horizon, s.industry!.builtAt, s.industry!.studios]).toEqual([untouched.horizon, untouched.builtAt, untouched.studios]);
    expect(s.events.filter((e) => e.kind === 'industry-decision' && e.payload.r === 'tv:1')).toHaveLength(1);
    expect(worldRefreshPreview(s)).toBeNull();
    expect(applyWorldRefresh(s, '2027-01-16')).toBeNull();
    until(s, '2032-12-31');
    for (const r of ['tv:1', 'tv:9']) {
      const sim = s.industry!.series[r];
      expect(sim.outcomes.length, r).toBeGreaterThan(0);
      expect(sim.outcomes.every((o) => o.at > '2027-01-15'), r).toBe(true);
    }
    expect(s.industry!.series[decided].outcomes[0]).toEqual(untouched.series[decided].outcomes[0]);
  });
});

// November 11, 2026 (the owner's brief, item 4): forty seeds, ten years each. The odds and timing are game calibration, not
// measured statistics (docs/WORLD.md); what is checked is that every world they make is coherent.
describe('the living world over ten years, across seeds', () => {
  const worlds = Array.from({ length: 40 }, (_, i) => run(`ind-decade-${i}`, '2036-12-31'));

  it('never contradicts itself: dated after the records, numbered in order, announced before it airs, and closed for good', () => {
    for (const s of worlds) {
      for (const p of WORLD.series) {
        const sim = s.industry!.series[p.r];
        const last = p.seasons.at(-1)?.n ?? 0;
        expect(sim.outcomes.every((o) => o.at > WORLD.horizon), p.r).toBe(true);
        expect(sim.outcomes.map((o) => o.at), p.r).toEqual([...sim.outcomes.map((o) => o.at)].sort());
        expect(sim.seasons.map((x) => x.n), p.r).toEqual(sim.seasons.map((_, i) => last + 1 + i));
        for (const [i, x] of sim.seasons.entries()) {
          const announced = sim.outcomes.find((o) => o.n === x.n && ['renewed', 'dated', 'ordered'].includes(o.kind));
          expect(announced && announced.at < x.premiere, `${p.r} season ${x.n}`).toBe(true);
          const before = i ? episodeDates(sim.seasons[i - 1]).at(-1)! : p.seasons.at(-1)?.d1 ?? p.seasons.at(-1)?.d0 ?? '0000';
          expect(x.premiere > before, `${p.r} season ${x.n} starts after the one before ends`).toBe(true);
        }
        const end = sim.outcomes.findIndex((o) => ['cancelled', 'concluded', 'passed'].includes(o.kind));
        expect(sim.closed, p.r).toBe(end >= 0);
        if (end >= 0) expect(end, `${p.r}: nothing decided after it closed`).toBe(sim.outcomes.length - 1);
        const final = sim.seasons.find((x) => x.final);
        if (final && episodeDates(final).at(-1)! < '2036-06-30') expect(sim.outcomes.at(-1)!.kind, `${p.r} ends with its final season`).toBe('concluded');
      }
    }
  });

  it('gives each kind of outcome somewhere across seeds, and keeps the limited series and the pilot to theirs', () => {
    const kinds = (r: string) => new Set(worlds.flatMap((s) => s.industry!.series[r].outcomes.map((o) => o.kind)));
    expect([...kinds('tv:1')].sort()).toEqual(expect.arrayContaining(['cancelled', 'renewed']));
    expect([...kinds('tv:4')]).toEqual(['concluded']);
    expect([...kinds('tv:5')].every((k) => ['ordered', 'passed', 'renewed', 'cancelled', 'concluded'].includes(k))).toBe(true);
    expect(kinds('tv:5').has('ordered') && kinds('tv:5').has('passed')).toBe(true);
  });
});
