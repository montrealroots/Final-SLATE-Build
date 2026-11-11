// The screen catalog (docs/CATALOG.md): the company and leadership registry, the importer's requests, discovery and cache,
// the build, and the rules for showing it at a save's date. The importer is tested against a stand-in for TMDB with
// made-up records; no real TMDB data is in this repository (TMDB's terms: cached at most six months, not redistributed).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { COMPANIES, DISCOVERED, LEADERSHIP, REGISTRY_CHECKED, company } from '../src/catalog/registry';
import { ageAt, fileFor, filmographyView, leadershipAt, lifeAt, madeUnderDisney, moneyOrUnknown, ownersAt, parseRef, standingAt, titleStanding, type FilmographyEntry } from '../src/catalog/model';

const CACHE = mkdtempSync(join(tmpdir(), 'slate-catalog-cache-'));
process.env.SCREEN_CATALOG_CACHE = CACHE;
type Tmdb = typeof import('../tools/screen-catalog/tmdb.mjs');
let tmdb: Tmdb;
let discover: typeof import('../tools/screen-catalog/import.mjs').discover;
beforeAll(async () => {
  tmdb = await import('../tools/screen-catalog/tmdb.mjs');
  ({ discover } = await import('../tools/screen-catalog/import.mjs'));
});
const json = (status: number, body: unknown, headers: Record<string, string> = {}) => new Response(status === 200 ? JSON.stringify(body) : '{}', { status, headers: { 'content-type': 'application/json', ...headers } });
const noWait = () => Promise.resolve();

describe('the company registry', () => {
  it('has one record per verified TMDB company, never one ID twice, and every acquisition dated with its source', () => {
    const ids = COMPANIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    const tmdbIds = COMPANIES.flatMap((c) => (c.tmdb ? [c.tmdb.id] : []));
    expect(new Set(tmdbIds).size).toBe(tmdbIds.length);
    for (const c of COMPANIES) {
      if (c.parent) expect(company(c.parent.id), `${c.id}'s parent`).toBeDefined();
      if (c.parent?.how === 'acquired') { expect(c.parent.from).toMatch(/^\d{4}-\d{2}-\d{2}$/); expect(c.parent.source?.url).toMatch(/^https:\/\//); }
      for (const r of c.related) expect(company(r.id), `${c.id} relates to ${r.id}`).toBeDefined();
    }
  });

  it('keeps a credited name apart from its later owner and name: 20th Century Fox and 20th Century Studios are two records', () => {
    expect(company('company:20th-century-fox')?.tmdb?.id).toBe(25);
    expect(company('company:20th-century-studios')?.tmdb?.id).toBe(127928);
    expect(company('company:20th-century-fox')?.parent).toMatchObject({ how: 'acquired', from: '2019-03-20' });
    expect(company('company:fox-searchlight-pictures')?.tmdb?.id).toBe(43);
    expect(company('company:searchlight-pictures')?.tmdb?.id).toBe(127929);
  });

  it('gathers titles for production companies only: networks and streaming services are where titles air, not who made them', () => {
    const networks = COMPANIES.filter((c) => c.kind === 'network');
    expect(networks.map((c) => c.name)).toEqual(['Disney+', 'Hulu', 'ABC', 'Disney Channel', 'FX']);
    for (const n of networks) { expect(n.tmdb).toBeNull(); expect(DISCOVERED).not.toContain(n); }
    expect(DISCOVERED).toHaveLength(32);
  });

  it('records leadership from official sources only, at companies it knows', () => {
    for (const r of LEADERSHIP) {
      expect(company(r.companyId), r.name).toBeDefined();
      expect(r.sources.length).toBeGreaterThan(0);
      for (const s of r.sources) expect(s.url).toMatch(/^https:\/\/(thewaltdisneycompany\.com|www\.lucasfilm\.com|www\.starwars\.com|www\.pixar\.com|www\.sec\.gov)\//);
    }
  });
});

describe('leadership at the save\'s date', () => {
  const at = (today: string, id = 'company:the-walt-disney-company') => leadershipAt(id, today, REGISTRY_CHECKED).map((x) => `${x.role.name}|${x.role.title.split(',')[0]}|${x.standing}`);

  it('before February 3, 2026, Iger is chief executive and the succession is unannounced', () => {
    const jan = at('2026-01-10');
    expect(jan).toContain('Robert A. Iger|Chief Executive Officer|current');
    expect(jan).toContain("Josh D'Amaro|Chairman|current");
    expect(jan.some((x) => x.includes('Senior Advisor') || x.includes("D'Amaro|Chief Executive"))).toBe(false);
    expect(jan.some((x) => x.startsWith('Debra OConnell'))).toBe(false); // announced March 16
  });

  it('once announced, the new chief executive is incoming; from March 18 current, and Iger former as chief executive', () => {
    expect(at('2026-02-10')).toContain("Josh D'Amaro|Chief Executive Officer|incoming");
    const april = at('2026-04-01');
    expect(april).toContain("Josh D'Amaro|Chief Executive Officer|current");
    expect(april).toContain('Robert A. Iger|Chief Executive Officer|former');
    expect(april).toContain('Robert A. Iger|Senior Advisor|current');
    expect(at('2027-01-02')).toContain('Robert A. Iger|Senior Advisor|former'); // retirement on December 31, 2026
  });

  it('Lucasfilm: Kennedy is president before January 15, 2026, and Filoni after; nobody is called current before the source could know', () => {
    expect(at('2026-01-05', 'company:lucasfilm')).toEqual(['Kathleen Kennedy|President|current']);
    expect(at('2026-02-01', 'company:lucasfilm')).toEqual(['Dave Filoni|President and Chief Creative Officer|current', 'Lynwen Brennan|Co-President|current', 'Kathleen Kennedy|President|former']);
    // Pixar's leaders are listed on a page read November 10, 2026, with no start dates: earlier, they are only "listed".
    expect(at('2026-01-05', 'company:pixar').every((x) => x.endsWith('|listed'))).toBe(true);
    expect(at('2026-11-10', 'company:pixar').every((x) => x.endsWith('|current'))).toBe(true);
  });

  it('a role with an announcement after the save\'s date is hidden entirely', () => {
    const r = LEADERSHIP.find((x) => x.name === 'Dave Filoni')!;
    expect(standingAt(r, '2026-01-14', REGISTRY_CHECKED)).toBeNull();
  });
});

describe('records at the save\'s date', () => {
  it('a release after the save\'s date is upcoming, an undated one is undated, and a death after it hasn\'t happened', () => {
    expect(titleStanding({ date: '2025-05-01', status: 'Released' }, '2026-01-05')).toBe('released');
    expect(titleStanding({ date: '2027-05-01', status: 'Released' }, '2026-01-05')).toBe('upcoming');
    expect(titleStanding({ date: null, status: 'Rumored' }, '2026-01-05')).toBe('undated');
    expect(lifeAt({ birthday: '1950-01-01', deathday: '2030-06-01' }, '2026-01-05')).toEqual({ born: '1950-01-01', died: null });
    // The age turns on the birthday; once a death has happened by the save's date, the page gives the age at death instead.
    expect(ageAt({ birthday: '1950-06-02', deathday: '2030-06-01' }, '2026-06-01')).toEqual({ years: 75, atDeath: false });
    expect(ageAt({ birthday: '1950-06-02', deathday: '2030-06-01' }, '2026-06-02')).toEqual({ years: 76, atDeath: false });
    expect(ageAt({ birthday: '1950-06-02', deathday: '2030-06-01' }, '2031-01-01')).toEqual({ years: 79, atDeath: true });
    expect(ageAt({ birthday: null, deathday: null }, '2026-01-05')).toBeNull();
    expect(ageAt({ birthday: '2027-03-03', deathday: null }, '2026-01-05')).toBeNull(); // not born yet at the save's date
  });

  it('a title credited to an acquired company was made under Disney only from the acquisition on', () => {
    expect(madeUnderDisney(25, '1997-12-19')).toBe(false);
    expect(madeUnderDisney(25, '2019-05-31')).toBe(true);
    expect(madeUnderDisney(3, null)).toBeNull();
    expect(madeUnderDisney(2, '1960-01-01')).toBe(true); // Walt Disney Pictures was never acquired
    expect(madeUnderDisney(999_999, '2000-01-01')).toBeNull(); // not a company the catalog follows
  });

  it('a filmography shows only what was released by the save\'s date unless later titles are asked for', () => {
    const e = (ref: string, title: string, date: string | null): FilmographyEntry => ({ ref, title, date, credited: null, genres: [], status: null });
    const all = [e('movie:1', 'Alpha', '2001-01-01'), e('tv:1', 'Beta', '2010-01-01'), e('movie:2', 'Gamma', '2030-01-01'), e('movie:3', 'Delta', null)];
    const v = (o: Partial<Parameters<typeof filmographyView>[1]>) => filmographyView(all, { query: '', type: 'all', sort: 'newest', today: '2026-01-05', later: false, ...o }).map((x) => x.title);
    expect(v({})).toEqual(['Beta', 'Alpha']);
    expect(v({ later: true, sort: 'oldest' })).toEqual(['Alpha', 'Beta', 'Gamma', 'Delta']);
    expect(v({ type: 'movie' })).toEqual(['Alpha']);
    expect(v({ query: 'bet' })).toEqual(['Beta']);
  });

  it('references keep films, series, seasons, episodes and people apart, even with the same TMDB number', () => {
    expect([fileFor('movie:900001'), fileFor('tv:900001'), fileFor('tv:900001:s:2'), fileFor('tv:900001:s:2:e:5'), fileFor('person:900001')])
      .toEqual(['titles/movie-900001.json', 'titles/tv-900001.json', 'seasons/900001-2.json', 'seasons/900001-2.json', 'people/1.json']);
    expect(parseRef('tv:5:s:1:e:3')).toEqual({ kind: 'episode', id: 5, season: 1, episode: 3 });
    expect([parseRef('movie:5:s:1'), parseRef('company:pixar'), parseRef('person:x')]).toEqual([null, null, null]);
  });

  it('a figure TMDB doesn\'t have is not recorded, never $0', () => {
    expect(moneyOrUnknown(null)).toBe('Not recorded');
    expect(moneyOrUnknown(1_500_000)).toBe('$1,500,000');
  });
});

describe('networks and their owners', () => {
  it('takes a kind of outlet only from cable and streaming classes, and compares websites without scheme, www or trailing slash', async () => {
    // Imported here, not at the top: it loads tmdb.mjs, which must see this file's cache directory first.
    const { dated, kindOf, site } = await import('../tools/screen-catalog/networks.mjs');
    expect([dated('+2025-01-01T00:00:00Z', 9), dated('+2025-08-01T00:00:00Z', 10), dated('+2025-08-07T00:00:00Z', 11), dated(null, 11)]).toEqual(['2025', '2025-08', '2025-08-07', null]);
    expect(kindOf(['Q59152282', 'Q5009242'])).toBe('streaming');
    expect(kindOf(['Q561068'])).toBe('cable');
    expect(kindOf(['Q1762059'])).toBe('cable'); // premium television: HBO, Showtime
    expect(kindOf(['Q1254874', 'Q1616075'])).toBeNull(); // "television network" and "station" don't say broadcast reliably
    expect(site('https://www.NBC.com/')).toBe(site('http://nbc.com'));
    expect(site('https://disneynow.com/all-shows/disney-xd')).not.toBe(site('https://disneynow.com'));
  });

  it('gives a network\'s owner on a date only from dated statements, and keeps undated owners apart', () => {
    const owners = [
      { qid: 'Q2', name: 'First Owner', from: '1990-01-01', to: '2010-06-30' },
      { qid: 'Q3', name: 'Second Owner', from: '2010-06-30', to: null },
      { qid: 'Q4', name: 'Undated Owner', from: null, to: null },
    ];
    expect(ownersAt(owners, '2000-01-01')).toMatchObject({ now: [{ name: 'First Owner' }], before: [], undated: [{ name: 'Undated Owner' }] });
    expect(ownersAt(owners, '2010-06-30')).toMatchObject({ now: [{ name: 'Second Owner' }], before: [{ name: 'First Owner' }] });
    expect(ownersAt(owners, '1980-01-01').now).toEqual([]); // before anyone's time, no owner is shown as known
    // Dates recorded to the year or month: a year's start counts from the year, its end once the year is over.
    const years = [{ qid: 'Q6', name: 'Old', from: '2025', to: '2026' }, { qid: 'Q7', name: 'New', from: '2026', to: null }];
    expect(ownersAt(years, '2025-12-31').now.map((o) => o.name)).toEqual(['Old']);
    expect(ownersAt(years, '2026-03-01').now.map((o) => o.name)).toEqual(['Old', 'New']); // the record doesn't say when in 2026
    expect(ownersAt(years, '2027-01-01')).toMatchObject({ now: [{ name: 'New' }], before: [{ name: 'Old' }] });
    expect(ownersAt([{ qid: 'Q8', name: 'Month', from: '2009-04', to: null }], '2009-03-31').now).toEqual([]);
    expect(ownersAt([{ qid: 'Q8', name: 'Month', from: '2009-04', to: null }], '2009-04-01').now).toHaveLength(1);
  });
});

describe('the importer', () => {
  it('waits out a rate limit, retries server errors with a limit, queues what still fails, and never retries a 404', async () => {
    const calls: string[] = [];
    let n = 0;
    tmdb.useTransport(async (url: string) => {
      calls.push(url);
      if (url.endsWith('limited')) return n++ === 0 ? json(429, null, { 'retry-after': '0' }) : json(200, { ok: 1 });
      if (url.endsWith('broken')) return json(503, null);
      if (url.endsWith('gone')) return json(404, null);
      return json(200, { ok: 2 });
    }, noWait);
    expect(await tmdb.get('t/limited')).toEqual({ ok: 1 });
    expect(tmdb.stats.rateLimited).toBe(1);
    expect(await tmdb.get('t/broken')).toBeNull();
    expect(calls.filter((c) => c.endsWith('broken'))).toHaveLength(6);
    expect(tmdb.failures().map((f) => f.path)).toContain('t/broken');
    expect(await tmdb.get('t/gone')).toBeNull();
    expect(await tmdb.get('t/gone')).toBeNull();
    expect(calls.filter((c) => c.endsWith('gone'))).toHaveLength(1); // the second answer came from the cache
    // Resumable: a fresh response is read from the cache, not asked for again.
    const before = calls.length;
    expect(await tmdb.get('t/limited')).toEqual({ ok: 1 });
    expect(calls.length).toBe(before);
    // A failed request is retried on the next run and leaves the queue once it succeeds.
    tmdb.useTransport(async () => json(200, { ok: 3 }), noWait);
    expect(await tmdb.get('t/broken')).toEqual({ ok: 3 });
    expect(tmdb.failures().map((f) => f.path)).not.toContain('t/broken');
  });

  it('stops, without caching, when TMDB refuses the credential', async () => {
    tmdb.useTransport(async () => json(401, null), noWait);
    await expect(tmdb.get('t/refused')).rejects.toThrow(/network secret for api\.themoviedb\.org is missing or not accepted/);
    expect(tmdb.cached('t/refused')).toBeNull();
  });

  it('treats a cached answer older than six months as gone (TMDB\'s caching limit)', () => {
    const now = Date.parse('2026-11-10T00:00:00Z');
    expect(tmdb.fresh('2026-06-01T00:00:00Z', now)).toBe(true);
    expect(tmdb.fresh('2026-05-01T00:00:00Z', now)).toBe(false);
  });

  it('reads every page of a discovery query, catches titles that moved between pages, and splits a query past the 500-page cap by year', async () => {
    tmdb.useTransport(async (url: string) => {
      const u = new URL(url);
      const page = Number(u.searchParams.get('page'));
      if (u.searchParams.get('with_companies') === '41') {
        // 45 titles over 3 pages; page 2 repeats a title from page 1 (popularity moved), which the date-order pass finds.
        if (u.searchParams.get('sort_by') === 'popularity.desc') {
          const ids = page === 2 ? [1, ...Array.from({ length: 14 }, (_, i) => 17 + i)] : Array.from({ length: 15 }, (_, i) => (page - 1) * 15 + i + 1);
          return json(200, { page, total_pages: 3, total_results: 45, results: ids.map((id) => ({ id })) });
        }
        return json(200, { page, total_pages: 3, total_results: 45, results: Array.from({ length: 15 }, (_, i) => ({ id: (page - 1) * 15 + i + 1 })) });
      }
      // Company 42: 600 pages unsplit; each five-year slice has one title.
      const gte = u.searchParams.get('primary_release_date.gte');
      if (!gte) return json(200, { page, total_pages: 600, total_results: 12_000, results: [{ id: 1 }] });
      return json(200, { page: 1, total_pages: 1, total_results: 1, results: [{ id: Number(gte.slice(0, 4)) }] });
    }, noWait);
    const a = await discover('movie', 41);
    expect([a.ids.length, a.total, a.split, a.failedPages]).toEqual([45, 45, false, []]);
    const b = await discover('movie', 42);
    expect(b.split).toBe(true);
    expect(b.ids).toHaveLength(28); // 1900 to 2035 in five-year slices
  });
});

describe('the build', () => {
  const OUT = mkdtempSync(join(tmpdir(), 'slate-catalog-out-'));
  const read = (p: string) => JSON.parse(readFileSync(join(OUT, p), 'utf8'));
  beforeAll(async () => {
    const movie = {
      id: 900001, title: 'The Lantern Keeper', original_title: 'The Lantern Keeper', release_date: '1997-06-01', status: 'Released', spoken_languages: [{ english_name: 'English' }], production_countries: [{ name: 'United States of America' }],
      genres: [{ name: 'Drama' }], runtime: 0, budget: 0, revenue: 0, vote_count: 0, vote_average: 0, overview: '', production_companies: [{ id: 25, name: '20th Century Fox', origin_country: 'US' }, { id: 2, name: 'Walt Disney Pictures', origin_country: 'US' }],
      credits: { cast: [{ id: 800001, name: 'Ada Quill', character: 'Mara', order: 0 }], crew: [{ id: 800002, name: 'Ben Rook', department: 'Directing', job: 'Director' }] },
      external_ids: { imdb_id: 'tt0000001' }, release_dates: { results: [{ iso_3166_1: 'US', release_dates: [{ certification: 'PG' }] }] },
    };
    const series = {
      id: 900001, name: 'Same Number Series', original_name: 'Same Number Series', first_air_date: '2020-01-01', status: 'Returning Series', seasons: [{ season_number: 1, name: 'Season 1', episode_count: 2, air_date: '2020-01-01' }],
      aggregate_credits: { cast: [{ id: 800001, name: 'Ada Quill', roles: [{ character: 'Ida', episode_count: 1 }], total_episode_count: 1 }], crew: [] }, credits: { cast: [], crew: [] },
      networks: [{ id: 2, name: 'ABC' }], created_by: [{ id: 800003, name: 'Cy Vale' }], production_companies: [{ id: 1556, name: '20th Century Fox Television' }], external_ids: {}, content_ratings: { results: [] }, vote_count: 3, vote_average: 7.5,
    };
    const season = { season_number: 1, name: 'Season 1', air_date: '2020-01-01', credits: { cast: [] }, episodes: [
      { episode_number: 1, name: 'Pilot', air_date: '2020-01-01', vote_count: 0, crew: [{ id: 800002, name: 'Ben Rook', department: 'Directing', job: 'Director' }], guest_stars: [{ id: 800004, name: 'Dee Guest', character: 'Visitor', order: 0 }] },
      { episode_number: 2, name: 'Second', air_date: '2020-01-08', vote_count: 0, crew: [], guest_stars: [] },
    ] };
    const responses: Record<string, unknown> = {
      'movie/900001?append_to_response=credits,external_ids,release_dates': movie,
      'tv/900001?append_to_response=aggregate_credits,credits,external_ids,content_ratings': series,
      'tv/900001/season/1?append_to_response=credits': season,
      'person/800001': { id: 800001, name: 'Ada Quill', birthday: '1960-02-02', deathday: '2030-01-01', also_known_as: [] },
      'person/800002': { id: 800002, name: 'Ben Rook', birthday: null, deathday: null, also_known_as: [] },
    };
    tmdb.useTransport(async (url: string) => { const p = url.replace(tmdb.API, ''); return p in responses ? json(200, responses[p]) : json(404, null); }, noWait);
    for (const p of Object.keys(responses)) await tmdb.get(p);
    writeFileSync(join(CACHE, 'manifest.json'), JSON.stringify({
      titles: [{ key: 'movie:900001', companies: [25, 2] }, { key: 'tv:900001', companies: [1556] }], seasons: ['tv/900001/season/1?append_to_response=credits'], people: [800001, 800002],
      peopleRule: { cast: 10, jobs: ['Director'] }, queries: [], failures: [], stats: {},
    }));
    // What tools/screen-catalog/networks.mjs writes, for a made-up network record: its owners and kind from Wikidata.
    writeFileSync(join(CACHE, 'networks.json'), JSON.stringify({ networks: [{ id: 2, name: 'ABC', country: 'US', headquarters: null, homepage: 'https://abc.example', wikidata: {
      qid: 'Q1', label: 'Example Network', matchedBy: 'website', classes: ['Q5009242'], kind: 'cable', inception: '1990-01-01', dissolved: null,
      owners: [{ qid: 'Q2', name: 'First Owner', from: '1990-01-01', to: '2010-06-30' }, { qid: 'Q3', name: 'Second Owner', from: '2010-06-30', to: null }], parents: [] } }] }));
    execFileSync(process.execPath, ['--no-warnings', 'tools/screen-catalog/build.mjs', '--out', OUT], { env: { ...process.env, SCREEN_CATALOG_CACHE: CACHE } });
  });

  it('keeps a film and a series with the same TMDB number apart, and lists a title once per company that is credited with it', () => {
    expect(read('titles/movie-900001.json').title).toBe('The Lantern Keeper');
    expect(read('titles/tv-900001.json').title).toBe('Same Number Series');
    expect(read('companies/25.json').entries).toEqual([{ ref: 'movie:900001', title: 'The Lantern Keeper', date: '1997-06-01', credited: '20th Century Fox', genres: ['Drama'], status: 'Released' }]);
    expect(read('companies/2.json').entries.map((e: FilmographyEntry) => e.ref)).toEqual(['movie:900001']);
    expect(read('index.json').counts).toMatchObject({ movies: 1, series: 1, seasons: 1, episodes: 2, people: 4, peopleWithDetails: 2 });
    // The world file holds dated events from 2025-10-01 on; these made-up titles are all older, so it has none.
    expect(read('world.json')).toMatchObject({ version: 1, from: '2025-10-01', events: [] });
    expect(read('world.json').horizon).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('writes a page for each network with its owners and series, and gives the engine the kind of outlet a series is on', () => {
    expect(read('titles/tv-900001.json')).toMatchObject({ networks: ['ABC'], networkIds: [2] });
    expect(read('networks/2.json')).toMatchObject({ id: 2, name: 'ABC', homepage: 'https://abc.example', wikidata: { qid: 'Q1', kind: 'cable', owners: [{ name: 'First Owner' }, { name: 'Second Owner' }] },
      series: [{ ref: 'tv:900001', title: 'Same Number Series', date: '2020-01-01', status: 'Returning Series' }] });
    expect(read('networks/index.json')).toEqual([[2, 'ABC', 'US', 1]]);
    expect(read('world.json').series[0]).toMatchObject({ r: 'tv:900001', net: ['ABC'], nk: ['cable'] });
    expect(read('index.json').counts).toMatchObject({ networks: 1, networksMatched: 1 });
  });

  it('writes figures TMDB has as 0 or without votes as unknown', () => {
    expect(read('titles/movie-900001.json')).toMatchObject({ budget: null, revenue: null, runtime: null, rating: null, overview: null, classifications: [{ country: 'US', rating: 'PG' }] });
    expect(read('titles/tv-900001.json').rating).toEqual({ average: 7.5, count: 3 });
  });

  it('keeps series credits, counted in episodes, apart from each episode\'s own crew and guest cast', () => {
    const people = read('people/1.json'); // 800001 % 500
    expect(people['800001'].credits.map((c: { kind: string; ref: string; episodes?: number }) => [c.kind, c.ref, c.episodes])).toEqual([['cast', 'movie:900001', undefined], ['series-cast', 'tv:900001', 1]]);
    expect(people['800001'].details).toMatchObject({ birthday: '1960-02-02', deathday: '2030-01-01' }); // the page hides a death after the save's date
    const guest = read('people/4.json')['800004'];
    expect(guest.credits).toEqual([{ ref: 'tv:900001:s:1:e:1', title: 'Same Number Series: Pilot', date: '2020-01-01', kind: 'episode-guest', role: 'Visitor' }]);
    expect(guest.details).toBeNull();
    const season = read('seasons/900001-1.json');
    expect(season.episodes[0]).toMatchObject({ crew: [{ person: 800002, job: 'Director' }], guests: [{ person: 800004, character: 'Visitor' }] });
    expect(season.episodes[1]).toMatchObject({ crew: [], guests: [] });
  });

  it('holds no credential anywhere in what it writes or in the code that writes it', () => {
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(join(dir, e.name)) : [join(dir, e.name)]));
    const secret = /api_key=|Bearer\s+[A-Za-z0-9._-]{20,}|eyJhbGciOi/;
    for (const f of [...files(OUT), ...files(join(process.cwd(), 'tools/screen-catalog')), ...files(join(process.cwd(), 'src/catalog'))]) expect(secret.test(readFileSync(f, 'utf8')), f).toBe(false);
    expect(existsSync(join(OUT, 'index.json'))).toBe(true);
  });
});
