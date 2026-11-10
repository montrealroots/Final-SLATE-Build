// A made-up screen catalog in the built format (tools/screen-catalog/build.mjs), for browser tests that must not depend on
// TMDB or on catalog data, which TMDB's terms keep out of this repository. Every title, person and figure here is
// invented and labelled as a fixture; the companies are the registry's real ones, because their pages are what's tested.
import type { Page, Route } from '@playwright/test';

const cast = (person: number, name: string, character: string, order: number) => ({ person, name, character, order });
const crew = (person: number, name: string, department: string, job: string) => ({ person, name, department, job });
const RETRIEVED = '2026-11-10T12:00:00.000Z';
const base = { originalLanguage: 'en', languages: ['English'], countries: ['United States of America'], tagline: null, externalIds: { imdb: null, wikidata: null }, collection: null, classifications: [], retrievedAt: RETRIEVED };

const lantern = {
  ...base, ref: 'movie:900001', type: 'movie', title: 'The Lantern Keeper (Fixture)', originalTitle: 'The Lantern Keeper (Fixture)', status: 'Released', date: '2019-06-14', genres: ['Drama'], runtime: 104,
  overview: 'A made-up film for the browser tests.', companies: [{ tmdbId: 2, name: 'Walt Disney Pictures', country: 'US' }, { tmdbId: 777001, name: 'Harbourside Films (Fixture)', country: 'GB' }],
  budget: null, revenue: 41_000_000, rating: { average: 6.8, count: 1234 }, discoveredVia: [2],
  cast: [cast(800001, 'Ada Quill', 'Mara Venn', 0), cast(800005, 'Ezra Holt', 'The Keeper', 1)], crew: [crew(800002, 'Ben Rook', 'Directing', 'Director'), crew(800006, 'Fen Ward', 'Writing', 'Screenplay')],
};
const harbour = {
  ...base, ref: 'movie:900002', type: 'movie', title: 'Harbour Lights (Fixture)', originalTitle: 'Harbour Lights (Fixture)', status: 'Released', date: '2023-03-03', genres: ['Comedy'], runtime: 98,
  overview: 'Another made-up film.', companies: [{ tmdbId: 2, name: 'Walt Disney Pictures', country: 'US' }], budget: 30_000_000, revenue: null, rating: null, discoveredVia: [2],
  cast: [cast(800001, 'Ada Quill', 'Juno', 0)], crew: [crew(800002, 'Ben Rook', 'Production', 'Producer')],
};
const later = {
  ...base, ref: 'movie:900003', type: 'movie', title: 'Night Ferry (Fixture)', originalTitle: 'Night Ferry (Fixture)', status: 'Post Production', date: '2030-07-01', genres: ['Thriller'], runtime: null,
  overview: 'A made-up film due after the test save\'s date.', companies: [{ tmdbId: 2, name: 'Walt Disney Pictures', country: 'US' }], budget: 90_000_000, revenue: null, rating: { average: 9.9, count: 3 }, discoveredVia: [2], cast: [], crew: [],
};
const tidewater = {
  ...base, ref: 'tv:900101', type: 'tv', title: 'Tidewater Station (Fixture)', originalTitle: 'Tidewater Station (Fixture)', status: 'Ended', date: '2021-09-01', lastAirDate: '2021-09-08', genres: ['Drama'], runtime: null, episodeRuntimes: [44],
  overview: 'A made-up series.', companies: [{ tmdbId: 2, name: 'Walt Disney Pictures', country: 'US' }], networks: ['ABC'], createdBy: [{ person: 800003, name: 'Cy Vale' }], budget: null, revenue: null, rating: { average: 7.1, count: 88 }, discoveredVia: [2],
  cast: [], crew: [],
  seriesCast: [{ person: 800001, name: 'Ada Quill', roles: [{ character: 'Ida Marsh', episodes: 2 }], episodes: 2 }],
  seriesCrew: [{ person: 800002, name: 'Ben Rook', department: 'Directing', jobs: [{ job: 'Director', episodes: 1 }], episodes: 1 }],
  seasons: [{ ref: 'tv:900101:s:1', number: 1, name: 'Season 1', date: '2021-09-01', episodes: 2, available: true }],
};
const season = {
  ref: 'tv:900101:s:1', series: 'tv:900101', seriesTitle: 'Tidewater Station (Fixture)', number: 1, name: 'Season 1', date: '2021-09-01', overview: null, retrievedAt: RETRIEVED,
  cast: [cast(800001, 'Ada Quill', 'Ida Marsh', 0)],
  episodes: [
    { number: 1, name: 'Pilot', date: '2021-09-01', runtime: 44, overview: 'The first made-up episode.', rating: null, crew: [crew(800002, 'Ben Rook', 'Directing', 'Director')], guests: [cast(800004, 'Dee Guest', 'The Visitor', 0)] },
    { number: 2, name: 'Low Tide', date: '2021-09-08', runtime: 44, overview: null, rating: null, crew: [crew(800006, 'Fen Ward', 'Writing', 'Writer')], guests: [] },
  ],
};
const entry = (t: { ref: string; title: string; date: string | null; genres: string[]; status: string | null }) => ({ ref: t.ref, title: t.title, date: t.date, credited: 'Walt Disney Pictures', genres: t.genres, status: t.status });
const person = (id: number, name: string, credits: unknown[], details: unknown = null) => ({ [id]: { id, name, details, credits } });

export const CATALOG_FIXTURE: Record<string, unknown> = {
  'index.json': {
    version: 1, builtAt: RETRIEVED, registryChecked: '2026-11-10', retrieved: { from: RETRIEVED, to: RETRIEVED, maxAgeDays: 180 },
    counts: { movies: 3, series: 1, seasons: 1, episodes: 2, people: 6, peopleWithDetails: 1 }, peopleRule: { cast: 10, jobs: ['Director'] }, discovery: [], failures: 0, stale: 0,
    companies: [{ tmdbId: 2, titles: 4, movies: 3, series: 1 }],
  },
  'companies/2.json': { tmdbId: 2, entries: [entry(lantern), entry(harbour), entry(later), entry(tidewater)] },
  'titles/movie-900001.json': lantern,
  'titles/movie-900002.json': harbour,
  'titles/movie-900003.json': later,
  'titles/tv-900101.json': tidewater,
  'seasons/900101-1.json': season,
  'titles/tv-900201.json': { ...tidewater, ref: 'tv:900201', title: 'Coastline (Fixture)', originalTitle: 'Coastline (Fixture)', status: 'Returning Series', date: '2026-04-01', lastAirDate: '2026-05-20', networks: ['Disney+'],
    seasons: [{ ref: 'tv:900201:s:1', number: 1, name: 'Season 1', date: '2026-04-01', episodes: 8, available: false }] },
  'titles/movie-900004.json': { ...harbour, ref: 'movie:900004', title: 'Paper Lanterns (Fixture)', originalTitle: 'Paper Lanterns (Fixture)', date: '2025-12-30', overview: 'A made-up film released just before the test save begins.', rating: null, budget: null },
  // The industry's dated records around the test save (January 5, 2026), as tools/screen-catalog/build.mjs writes them.
  'world.json': {
    version: 1, builtAt: RETRIEVED, horizon: '2026-11-10', from: '2025-10-01',
    events: [
      { d: '2025-12-30', k: 'film', r: 'movie:900004', t: 'Paper Lanterns (Fixture)', ci: ['company:walt-disney-pictures'] },
      { d: '2026-01-05', k: 'episode', r: 'tv:900101:s:1:e:1', t: 'Tidewater Station (Fixture)', s: 1, e: 1, n: 'Pilot', net: ['ABC'] },
      { d: '2026-01-12', k: 'episode', r: 'tv:900101:s:1:e:2', t: 'Tidewater Station (Fixture)', s: 1, e: 2, n: 'Low Tide', f: 1, net: ['ABC'] },
      { d: '2026-01-14', k: 'film', r: 'movie:900002', t: 'Harbour Lights (Fixture)', ci: ['company:walt-disney-pictures'] },
      { d: '2026-11-10', k: 'end', r: 'tv:900101', t: 'Tidewater Station (Fixture)', st: 'Canceled', la: '2026-01-12', net: ['ABC'] },
    ],
    // A series still running when the records end, which the living world's engine continues (src/engine/industry.ts).
    series: [{ r: 'tv:900201', t: 'Coastline (Fixture)', status: 'Returning Series', type: 'Scripted', net: ['Disney+'], ci: ['company:walt-disney-pictures'], genres: ['Drama'], daily: 0, aired: 1,
      // Its recorded season took two weeks off after its third episode and ended with two episodes on one night.
      seasons: [{ n: 1, eps: 8, dated: 8, d0: '2026-04-01', d1: '2026-05-20', gap: 7, drop: 0, offs: [0, 7, 14, 28, 35, 42, 49, 49] }],
      // One regular the records say died before the simulated season, who doesn't return.
      regulars: [{ p: 800001, name: 'Ada Quill', ch: 'Juno Marsh', born: '1980-04-02' }, { p: 800002, name: 'Wren Calder', ch: 'Old Tom', born: '1931-02-02', died: '2026-06-01' }] }],
  },
  'search/titles.json': [['movie:900001', 'The Lantern Keeper (Fixture)', '2019'], ['movie:900002', 'Harbour Lights (Fixture)', '2023'], ['movie:900003', 'Night Ferry (Fixture)', '2030'], ['tv:900101', 'Tidewater Station (Fixture)', '2021'], ['tv:900201', 'Coastline (Fixture)', '2026']],
  'search/people-A.json': [[800001, 'Ada Quill', 4]],
  'people/1.json': person(800001, 'Ada Quill', [
    { ref: 'movie:900002', title: 'Harbour Lights (Fixture)', date: '2023-03-03', kind: 'cast', role: 'Juno' },
    { ref: 'tv:900101', title: 'Tidewater Station (Fixture)', date: '2021-09-01', kind: 'series-cast', role: 'Ida Marsh', episodes: 2 },
    { ref: 'movie:900001', title: 'The Lantern Keeper (Fixture)', date: '2019-06-14', kind: 'cast', role: 'Mara Venn' },
  ], { birthday: '1980-04-02', deathday: '2031-01-01', placeOfBirth: 'Bristol, England (Fixture)', knownFor: 'Acting', biography: 'A made-up performer.', alsoKnownAs: [], imdb: null, retrievedAt: RETRIEVED }),
  'people/2.json': person(800002, 'Ben Rook', [
    { ref: 'movie:900001', title: 'The Lantern Keeper (Fixture)', date: '2019-06-14', kind: 'crew', role: 'Director', department: 'Directing' },
    { ref: 'tv:900101:s:1:e:1', title: 'Tidewater Station (Fixture): Pilot', date: '2021-09-01', kind: 'episode-crew', role: 'Director', department: 'Directing' },
  ]),
  'people/3.json': person(800003, 'Cy Vale', [{ ref: 'tv:900101', title: 'Tidewater Station (Fixture)', date: '2021-09-01', kind: 'creator', role: 'Creator' }]),
  'people/5.json': person(800005, 'Ezra Holt', [{ ref: 'movie:900001', title: 'The Lantern Keeper (Fixture)', date: '2019-06-14', kind: 'cast', role: 'The Keeper' }]),
  'people/6.json': person(800006, 'Fen Ward', [
    { ref: 'movie:900001', title: 'The Lantern Keeper (Fixture)', date: '2019-06-14', kind: 'crew', role: 'Screenplay', department: 'Writing' },
    { ref: 'tv:900101:s:1:e:2', title: 'Tidewater Station (Fixture): Low Tide', date: '2021-09-08', kind: 'episode-crew', role: 'Writer', department: 'Writing' },
  ]),
  'people/4.json': person(800004, 'Dee Guest', [{ ref: 'tv:900101:s:1:e:1', title: 'Tidewater Station (Fixture): Pilot', date: '2021-09-01', kind: 'episode-guest', role: 'The Visitor' }]),
};

/**
 * Serve the fixture for every catalog request, and fail any request to TMDB itself: the game must never call it. `override`
 * answers chosen paths differently (a server error, a missing file).
 */
export async function serveCatalog(page: Page, override: Record<string, number> = {}): Promise<{ tmdbRequests: string[] }> {
  const tmdbRequests: string[] = [];
  await page.route(/themoviedb\.org|tmdb\.org/, (r: Route) => { tmdbRequests.push(r.request().url()); return r.abort(); });
  await page.route('**/screen-catalog/**', (r: Route) => {
    const path = new URL(r.request().url()).pathname.replace(/^.*\/screen-catalog\//, '');
    const status = override[path];
    if (status) return r.fulfill({ status, contentType: 'application/json', body: '{}' });
    // Every company the registry follows has a filmography in a real build, and every letter a people index; the fixture's others are empty.
    const body = CATALOG_FIXTURE[path] ?? (/^companies\/\d+\.json$/.test(path) ? { tmdbId: Number(path.match(/\d+/)![0]), entries: [] } : /^search\/people-.\.json$/.test(path) ? [] : undefined);
    return body === undefined ? r.fulfill({ status: 404, body: '' }) : r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  });
  return { tmdbRequests };
}
