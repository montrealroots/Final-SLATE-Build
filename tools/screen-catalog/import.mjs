// Gathers the Disney screen catalog from TMDB into .screen-catalog-cache/ (git-ignored; docs/CATALOG.md). Resumable: a
// rerun takes fresh responses from the cache and asks only for what is missing or failed.
//   NODE_USE_ENV_PROXY=1 node tools/screen-catalog/import.mjs
// Steps: discover each registry company's movies and series (every page; queries over TMDB's 500-page cap are split by
// year), fetch each title with its credits, each season with its episodes' crew and guest stars, the networks the series
// are on, and the details of the people credited in the catalog. Nothing is fetched recursively beyond that.
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DISCOVERED } from '../../src/catalog/registry.ts';
import { CACHE, failures, get, pool, saveFailures, stats } from './tmdb.mjs';

const PAGE_CAP = 500;
/**
 * People whose details were fetched until November 10, 2026: the top-billed ten of each title's cast, and the crew in
 * these jobs. They are still fetched first. From then on, at the owner's request, everyone credited on a title, a season
 * or an episode in the catalog is fetched too, so that every person who has a recorded birth date shows an age.
 */
export const PEOPLE_CAST = 10;
export const PEOPLE_JOBS = new Set(['Director', 'Screenplay', 'Writer', 'Story', 'Producer', 'Executive Producer', 'Original Music Composer', 'Director of Photography', 'Editor', 'Creator']);

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** Every page of one discover query, split by year if it would pass the page cap. Returns ids and what the query covered. */
export async function discover(type, companyId) {
  const base = `discover/${type}?with_companies=${companyId}&include_adult=false&sort_by=popularity.desc`;
  const first = await get(`${base}&page=1`);
  if (!first) return { type, companyId, total: null, pages: 0, ids: [], split: false, failedPages: [1] };
  const ranges = first.total_pages > PAGE_CAP ? yearRanges(type) : [''];
  const ids = new Set();
  const failedPages = [];
  let total = 0;
  for (const r of ranges) {
    const q = `${base}${r}`;
    const p1 = r ? await get(`${q}&page=1`) : first;
    if (!p1) { failedPages.push(`${r}:1`); continue; }
    total += p1.total_results;
    const pages = Math.min(PAGE_CAP, p1.total_pages);
    const rest = await pool(Array.from({ length: pages - 1 }, (_, i) => i + 2), 8, (n) => get(`${q}&page=${n}`));
    for (const [i, page] of [p1, ...rest].entries()) {
      if (!page) { failedPages.push(`${r}:${i + 1}`); continue; }
      for (const x of page.results) ids.add(x.id);
    }
  }
  // Popularity can reorder results between pages; a second pass in date order catches any title that moved past a page.
  if (ids.size < total) {
    const dateSort = base.replace('popularity.desc', type === 'movie' ? 'primary_release_date.asc' : 'first_air_date.asc');
    const p1 = await get(`${dateSort}&page=1`);
    if (p1) for (const page of [p1, ...(await pool(Array.from({ length: Math.min(PAGE_CAP, p1.total_pages) - 1 }, (_, i) => i + 2), 8, (n) => get(`${dateSort}&page=${n}`)))]) {
      for (const x of page?.results ?? []) ids.add(x.id);
    }
  }
  return { type, companyId, total, pages: first.total_pages, ids: [...ids], split: ranges.length > 1, failedPages };
}
/**
 * TMDB's most-watched titles beyond the followed companies (the owner, November 18, 2026: "Import all of TMDB like the
 * first haul"): every film and series with at least WATCHED_VOTES votes, a year at a time so no query passes the page cap.
 * All of TMDB (1,276,903 films and 236,944 series in its November 17 lists) needs some 150 to 250 GB to gather and wouldn't
 * fit in the session's disk, so the owner chose the titles most people have seen: 67,498 films and 12,931 series.
 */
export const WATCHED_VOTES = 20;
export async function discoverWatched(type, minVotes = WATCHED_VOTES, years = [1874, new Date().getUTCFullYear() + 2]) {
  const f = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  const ids = new Set();
  const failedPages = [];
  let total = 0;
  for (let y = years[0]; y <= years[1]; y++) {
    const q = `discover/${type}?include_adult=false&sort_by=vote_count.desc&vote_count.gte=${minVotes}&${f}.gte=${y}-01-01&${f}.lte=${y}-12-31`;
    const p1 = await get(`${q}&page=1`);
    if (!p1) { failedPages.push(`${y}:1`); continue; }
    total += p1.total_results;
    const rest = await pool(Array.from({ length: Math.min(PAGE_CAP, p1.total_pages) - 1 }, (_, i) => i + 2), 8, (n) => get(`${q}&page=${n}`));
    for (const [i, page] of [p1, ...rest].entries()) {
      if (!page) { failedPages.push(`${y}:${i + 1}`); continue; }
      for (const x of page.results) ids.add(x.id);
    }
  }
  return { type, companyId: null, watched: minVotes, total, pages: null, ids: [...ids], split: true, failedPages };
}
function yearRanges(type) {
  const f = type === 'movie' ? 'primary_release_date' : 'first_air_date';
  const out = [];
  for (let y = 1900; y <= 2035; y += 5) out.push(`&${f}.gte=${y}-01-01&${f}.lte=${y + 4}-12-31`);
  return out;
}

async function main() {
  log(`Discovering titles for ${DISCOVERED.length} companies.`);
  const queries = [];
  for (const c of DISCOVERED) for (const type of ['movie', 'tv']) queries.push(await discover(type, c.tmdb.id));
  for (const type of ['movie', 'tv']) queries.push(await discoverWatched(type));
  const titles = new Map(); // `${type}:${id}` -> company TMDB ids (none for a title found only among the most-watched)
  for (const q of queries) for (const id of q.ids) {
    const k = `${q.type}:${id}`;
    if (!titles.has(k)) titles.set(k, new Set());
    if (q.companyId !== null) titles.get(k).add(q.companyId);
  }
  log(`Discovered ${titles.size} titles (${[...titles.keys()].filter((k) => k.startsWith('movie')).length} movies).`);

  // What each answer is needed for is taken from it as it comes, and the answer let go: until November 18, 2026 every
  // title's and season's details were held to the end, and 110,990 titles ran the importer out of memory.
  const keys = [...titles.keys()];
  const seasons = [];
  const networkIds = new Set();
  const people = new Set(); // the people fetched first: top-billed cast, creators and the key crew
  const others = new Set(); // everyone else credited
  const add = (list) => { for (const c of list ?? []) others.add(c.id); };
  const fetched = await pool(keys, 12, async (k) => {
    const [type, id] = k.split(':');
    const d = await get(type === 'movie' ? `movie/${id}?append_to_response=credits,external_ids,release_dates` : `tv/${id}?append_to_response=aggregate_credits,credits,external_ids,content_ratings`);
    if (!d) return false;
    if (type === 'tv') for (const s of d.seasons ?? []) seasons.push(`tv/${d.id}/season/${s.season_number}?append_to_response=credits`);
    for (const n of d.networks ?? []) networkIds.add(n.id);
    for (const c of (d.credits?.cast ?? []).filter((x) => x.order < PEOPLE_CAST)) people.add(c.id);
    for (const c of d.aggregate_credits?.cast?.slice(0, PEOPLE_CAST) ?? []) people.add(c.id);
    for (const c of d.credits?.crew ?? []) if (PEOPLE_JOBS.has(c.job)) people.add(c.id);
    for (const c of d.created_by ?? []) people.add(c.id);
    add(d.credits?.cast); add(d.credits?.crew); add(d.aggregate_credits?.cast); add(d.aggregate_credits?.crew);
    return true;
  });
  log(`Fetched ${fetched.filter(Boolean).length} of ${keys.length} titles.`);

  const seasonsFetched = await pool(seasons, 12, async (p) => {
    const s = await get(p);
    if (!s) return false;
    add(s.credits?.cast); add(s.credits?.crew); for (const e of s.episodes ?? []) { add(e.crew); add(e.guest_stars); }
    return true;
  });
  log(`Fetched ${seasonsFetched.filter(Boolean).length} of ${seasons.length} seasons.`);

  // The networks and streaming services the series are on (November 11, 2026, the owner's request): each one's details.
  // Who owns them isn't in TMDB; tools/screen-catalog/networks.mjs takes that from Wikidata.
  const networks = [...networkIds].sort((a, b) => a - b);
  const networkBodies = await pool(networks, 12, async (id) => !!(await get(`network/${id}`)));
  log(`Fetched ${networkBodies.filter(Boolean).length} of ${networks.length} networks.`);

  // Everyone else credited, after the people above: every cast and crew credit on a title, a season or an episode.
  for (const id of others) people.add(id);
  const ids = [...people];
  const bodies = await pool(ids, 12, async (id) => !!(await get(`person/${id}`)));
  log(`Fetched ${bodies.filter(Boolean).length} of ${ids.length} people.`);

  saveFailures();
  const manifest = {
    finishedAt: new Date().toISOString(),
    queries: queries.map(({ ids: x, ...q }) => ({ ...q, found: x.length })),
    titles: keys.map((k) => ({ key: k, companies: [...titles.get(k)] })),
    seasons, networks, people: ids,
    peopleRule: { cast: PEOPLE_CAST, jobs: [...PEOPLE_JOBS], all: true },
    failures: failures(), stats,
  };
  writeFileSync(join(CACHE, 'manifest.json'), JSON.stringify(manifest));
  log(`Done. Network ${stats.network}, cache ${stats.cache}, retries ${stats.retries}, rate-limited ${stats.rateLimited}, not found ${stats.missing}, failed ${failures().length}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
