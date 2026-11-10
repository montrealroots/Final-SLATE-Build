// Episode release edge cases (November 10, 2026, after #59). Each case that found a defect says so; the others hold
// behaviour that was right and must stay so. Fixtures are labelled: series are built directly as delivered, and
// releases are planned through planRelease unless a case needs a record the game can't make in one step.
import { describe, expect, it } from 'vitest';
import { DAY, announceEdition, checkEligibility, institution, planRelease, processUntil, upcomingCommitments } from '../src/engine';
import { airings, episodesFor, setEpisodeDates } from '../src/engine/episode-releases';
import { submitEntry } from '../src/engine/awards-actions';
import { cancelRelease } from '../src/engine/finish';
import { deserialize, migrate, serialize } from '../src/engine/save';
import { localToInstant } from '../src/engine/time';
import type { Edition, GameState, Project, ReleaseRecord } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

const at = (date: string, hh = 9, mm = 0, zone = 'Europe/London') => { const [y, m, d] = date.split('-').map(Number); return localToInstant(zone, y, m, d, hh, mm).instant; };
const ed = (s: GameState, id: string): Edition => s.editions.find((e) => e.id === id)!;
const cat = (e: Edition, id: string) => institution(e.institutionId).categories.find((c) => c.id === id)!;

/** A delivered drama series based in London (labelled fixture: delivery and credits set directly). */
function series(s: GameState, episodes = 6): Project {
  const p = buildProject(s, { title: 'Tidal Ward', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Ward', chars: ['A'], minutes: 2 }]);
  approve(s, p);
  p.axes.format = 'series';
  p.axes.episodeCount = episodes;
  p.axes.basePlaceId = 'gb-london';
  p.delivered = { at: s.now - DAY, runtimeMin: 50 * episodes };
  p.credits = [{ id: 'd1', person: 'p-d1', personName: 'Person d1', contribution: 'Directed By', roleId: 'director', episodes: 'all', billing: 1 }, { id: 'pr', person: 'p-pr', personName: 'Person pr', contribution: 'Produced By', roleId: 'producer', episodes: 'all', billing: 2 }];
  return p;
}
/** A release record as the save stores it (labelled fixture), for states the game reaches over several days. */
function record(id: string, route: ReleaseRecord['route'], territories: string[], dates: string[], released: number): ReleaseRecord {
  const episodes = episodesFor(id, dates).map((e, i) => (i < released ? { ...e, status: 'released' as const } : e));
  return { id, route, date: dates[0], territories, distributor: 'D', note: '', status: released ? 'released' : 'planned', episodes, pattern: 'custom' };
}

describe('the same episode on the same day in more than one release', () => {
  it('reads every release that day, whatever their order: its countries together, and out once any of them is out', () => {
    // Before November 10, 2026 the first record on the day won: its countries alone, and its status. A planned record
    // listed first made an aired episode read as still to come, and the entry provisional.
    const s = startLife('edge-order');
    s.now = at('2026-12-09');
    const p = series(s);
    const days = ['2026-12-01', '2026-12-01', '2026-12-08', '2026-12-08', '2026-12-15', '2026-12-15'];
    const out = record('r-gb', 'broadcast', ['GB'], days, 4);
    const toCome = record('r-ie', 'streaming', ['IE'], days, 0);
    p.releases = [toCome, out];
    const a = airings(p);
    p.releases = [out, toCome];
    const b = airings(p);
    expect(a).toEqual(b);
    expect(a.map((x) => `${x.number}:${x.date}:${x.planned ? 'planned' : 'out'}:${x.countries.join('+')}`)).toEqual([
      '1:2026-12-01:out:GB+IE', '2:2026-12-01:out:GB+IE', '3:2026-12-08:out:GB+IE', '4:2026-12-08:out:GB+IE', '5:2026-12-15:planned:GB+IE', '6:2026-12-15:planned:GB+IE',
    ]);
    const e27 = ed(s, 'international-emmys-2027');
    const read = () => { const el = checkEligibility(s, p, e27, cat(e27, 'drama')); return [el.eligible, el.provisional, el.provisionalNote]; };
    const first = read();
    p.releases = [toCome, out];
    expect(read()).toEqual(first);
    expect(first).toEqual([true, false, undefined]); // four of six aired in 2026: established, not provisional
  });

  it('different first days by territory and platform: each episode is read from the release that has it first', () => {
    const s = startLife('edge-first');
    s.now = at('2026-11-20');
    const p = series(s, 4);
    planRelease(s, p, { route: 'streaming', date: '2026-12-20', territories: ['US'], pattern: 'all' });
    planRelease(s, p, { route: 'broadcast', date: '2026-12-01', territories: ['GB'], distributor: 'Channel', pattern: 'weekly' });
    expect(airings(p).map((x) => `${x.date}:${x.countries.join('+')}`)).toEqual(['2026-12-01:GB', '2026-12-08:GB', '2026-12-15:GB', '2026-12-20:US']);
    p.releases.reverse();
    expect(airings(p).map((x) => `${x.date}:${x.countries.join('+')}`)).toEqual(['2026-12-01:GB', '2026-12-08:GB', '2026-12-15:GB', '2026-12-20:US']);
  });
});

describe('scheduling on the day itself', () => {
  it("a release goes out at 9 in the morning: today is refused once that hour has passed, and taken before it", () => {
    // Before November 10, 2026 today was taken at any hour, and after 9 its event was scheduled in the past.
    const late = startLife('edge-today-late');
    late.now = at('2026-12-01', 14);
    expect(() => planRelease(late, series(late), { route: 'streaming', date: '2026-12-01', territories: ['GB'], pattern: 'all' }))
      .toThrow("Releases go out at 9 in the morning, and that has passed today. Choose tomorrow or later.");
    const early = startLife('edge-today-early');
    early.now = at('2026-12-01', 7);
    const p = series(early);
    const r = planRelease(early, p, { route: 'streaming', date: '2026-12-01', territories: ['GB'], pattern: 'weekly' });
    expect(early.events.filter((e) => e.payload.releaseId === r.id).every((e) => e.at > early.now)).toBe(true);
  });

  it('moving an episode to today follows the same hour, and no event is ever placed before now', () => {
    const s = startLife('edge-move-today');
    s.now = at('2026-11-30', 8);
    const p = series(s, 3);
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-01', territories: ['GB'], pattern: 'weekly' });
    processUntil(s, at('2026-12-01', 10), 'tick', 100_000); // episode 1 is out
    expect(() => setEpisodeDates(s, p, r.id, ['2026-12-01', '2026-12-01', '2026-12-15'])).toThrow("Episode 2 can't come out today: releases go out at 9 in the morning, and that has passed. Choose tomorrow or later.");
    setEpisodeDates(s, p, r.id, ['2026-12-01', '2026-12-02', '2026-12-15']);
    expect(s.events.filter((e) => e.payload.releaseId === r.id).every((e) => e.at > s.now)).toBe(true);
  });
});

describe('the calendar', () => {
  it('two releases whose entries read the same are still two entries, each with its own id', () => {
    const s = startLife('edge-ids');
    s.now = at('2026-11-20');
    const p = series(s, 1);
    p.axes.format = 'feature';
    planRelease(s, p, { route: 'streaming', date: '2026-12-02', territories: ['GB'] });
    planRelease(s, p, { route: 'streaming', date: '2026-12-02', territories: ['GB'] }); // a second platform, the same country and day
    const mine = upcomingCommitments(s, at('2026-12-01'), at('2026-12-03')).filter((c) => c.label.startsWith('Tidal Ward'));
    expect(mine.map((c) => c.label)).toEqual(['Tidal Ward: Release on streaming in GB', 'Tidal Ward: Release on streaming in GB']);
    expect(new Set(mine.map((c) => c.id)).size).toBe(2);
  });
});

describe('editing, cancelling, saving and time passing', () => {
  it('repeated edits and a reload leave one event per day; each episode comes out once; a cancelled release leaves nothing', () => {
    const s = startLife('edge-repeat');
    s.now = at('2026-11-20');
    const p = series(s, 4);
    const r = planRelease(s, p, { route: 'streaming', date: '2026-12-01', territories: ['GB'], pattern: 'weekly' });
    setEpisodeDates(s, p, r.id, ['2026-12-01', '2026-12-10', '2026-12-17', '2026-12-24']);
    setEpisodeDates(s, p, r.id, ['2026-12-01', '2026-12-03', '2026-12-17', '2026-12-31']);
    setEpisodeDates(s, p, r.id, ['2026-12-01', '2026-12-03', '2026-12-17', '2026-12-31']);
    const back = deserialize(serialize(s));
    const q = back.projects.find((x) => x.id === p.id)!;
    const days = back.events.filter((e) => e.payload.releaseId === r.id).map((e) => `${e.kind}:${String(e.payload.date ?? '')}`).sort();
    expect(days).toEqual(['episode-release:2026-12-03', 'episode-release:2026-12-17', 'episode-release:2026-12-31', 'release:']);
    processUntil(back, at('2027-01-02'), 'tick', 1_000_000);
    expect(q.releases[0].episodes!.map((e) => e.status)).toEqual(['released', 'released', 'released', 'released']);
    expect(back.log.filter((l) => /^Episode \d of Tidal Ward is out today/.test(l.text)).length).toBe(3);
    expect(back.events.some((e) => e.payload.releaseId === r.id)).toBe(false);

    const other = planRelease(back, q, { route: 'streaming', date: '2027-02-01', territories: ['US'], pattern: 'weekly' });
    cancelRelease(back, q, other.id);
    expect(back.events.some((e) => e.payload.releaseId === other.id)).toBe(false);
    expect(airings(q).every((a) => a.countries.join() === 'GB')).toBe(true); // the cancelled release counts for nothing
    expect(() => cancelRelease(back, q, r.id)).toThrow('This release has already happened.');
  });
});

describe('an entry made before anything airs', () => {
  it('is provisional, becomes established as the episodes come out, is accepted at review and judged', () => {
    const s = startLife('edge-entry');
    s.now = at('2026-12-09', 9, 0, 'America/New_York');
    const e27 = ed(s, 'international-emmys-2027');
    const p = series(s);
    planRelease(s, p, { route: 'streaming', date: '2026-12-10', territories: ['GB'], pattern: 'premiere-weekly', onPremiere: 3 }); // three on the 10th, then 17, 24, 31
    const entry = submitEntry(s, p, e27.id, 'drama');
    expect(entry.reason).toBe('Entered provisionally: 6 of the 6 episodes it counts between January 1, 2026 and December 31, 2026 are still to come out.');
    processUntil(s, at('2026-12-18'), 'tick', 1_000_000);
    const now = checkEligibility(s, p, e27, cat(e27, 'drama'));
    expect([now.eligible, now.provisional]).toEqual([true, false]); // four of six have aired: no longer resting on plans
    processUntil(s, e27.deadline + 1, 'tick', 1_000_000);
    expect(entry.status).toBe('accepted');
    announceEdition(s, e27);
    expect(['nominated', 'not-nominated']).toContain(entry.status);
  });
});

describe('a version 8 save', () => {
  it('keeps its entries, their snapshots and its results exactly as they were', () => {
    const s = startLife('edge-v8');
    s.now = at('2026-12-16');
    const p = series(s);
    p.releases.push({ id: 'r-old', route: 'broadcast', date: '2026-12-01', territories: ['GB'], distributor: 'Channel', note: '', status: 'released' });
    const e26 = ed(s, 'international-emmys-2026');
    e26.entries.push({ id: 'old', projectId: p.id, categoryId: 'drama', submittedAt: s.now, status: 'won', recipients: ['pr'], fee: 0, snapshot: { runtimeMin: 300, score: 88, assessed: 'Judged on the season.', recipients: [{ id: 'pr', name: 'Person pr', contribution: 'Produced By' }] } });
    e26.results = { ...e26.results, drama: { revealed: true, winner: `p:${p.id}` } as unknown as Edition['results'][string] };
    const v8 = JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
    v8.version = 8;
    const m = migrate(v8);
    const after = m.editions.find((x) => x.id === e26.id)!;
    expect(after.entries).toEqual(e26.entries);
    expect(after.results).toEqual(e26.results);
  });
});

describe('a release names the countries it comes out in', () => {
  it('refuses a code that is no country, and plans one that is', () => {
    // Before November 10, 2026 the Territory Code field took anything two letters long or shorter: a blank, "G" or "XX"
    // was planned and saved as a territory, and award territory rules read it as one.
    const s = startLife('edge-territory');
    s.now = at('2026-12-09', 8);
    const p = series(s, 2);
    for (const t of ['', 'G', 'XX', 'gb']) expect(() => planRelease(s, p, { route: 'streaming', date: '2026-12-10', territories: [t] })).toThrow(/^Choose a country by its two-letter code, such as GB or US\./);
    expect(p.releases).toEqual([]);
    expect(planRelease(s, p, { route: 'streaming', date: '2026-12-10', territories: ['IE'] }).territories).toEqual(['IE']);
  });
});
