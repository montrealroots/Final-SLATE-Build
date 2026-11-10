// Builds the on-demand screen catalog the game reads, from the importer's cache (docs/CATALOG.md):
//   node tools/screen-catalog/build.mjs [--out .screen-catalog]
// Output is git-ignored. It keeps TMDB's values as given, except that a budget, revenue or rating TMDB reports as 0 (or
// with no votes) is written as unknown: TMDB uses 0 for "not entered", and a missing figure is never a confirmed $0.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { DISCOVERED, REGISTRY_CHECKED } from '../../src/catalog/registry.ts';
import { CACHE, MAX_AGE_DAYS, cached } from './tmdb.mjs';

const arg = process.argv.indexOf('--out');
const OUT = resolve(arg > 0 ? process.argv[arg + 1] : '.screen-catalog');
export const BUCKETS = 500;

const manifest = JSON.parse(readFileSync(join(CACHE, 'manifest.json'), 'utf8'));
const stale = [];
const body = (path) => {
  const r = cached(path);
  if (!r) { stale.push(path); return null; }
  return r.status === 200 ? r : null;
};
const times = [];
const known = (n) => (typeof n === 'number' && n > 0 ? n : null);
const date = (d) => (d ? d : null);

rmSync(OUT, { recursive: true, force: true });
for (const d of ['companies', 'titles', 'seasons', 'people', 'search']) mkdirSync(join(OUT, d), { recursive: true });
const write = (p, v) => writeFileSync(join(OUT, p), JSON.stringify(v));

const people = new Map(); // id -> { id, name, credits: [] }
const person = (id, name) => { if (!people.has(id)) people.set(id, { id, name, credits: [] }); return people.get(id); };
const companies = new Map(DISCOVERED.map((c) => [c.tmdb.id, []]));
const search = [];
// The world file (src/catalog/world.ts): every dated event from WORLD_FROM on, which the game plays on its real date.
const WORLD_FROM = '2025-10-01';
const world = [];
// Series still running when the records end: what the living world's engine continues (src/engine/industry.ts).
const profiles = [];
const byTmdb = new Map(DISCOVERED.map((c) => [c.tmdb.id, c]));
const studiosOf = (rec) => rec.companies.map((c) => byTmdb.get(c.tmdbId)).filter(Boolean).map((c) => c.id);
const counts = { movies: 0, series: 0, seasons: 0, episodes: 0, castCredits: 0, crewCredits: 0, episodeCredits: 0, missingTitles: 0, missingSeasons: 0 };

for (const t of manifest.titles) {
  const seasonFacts = [];
  const [type, id] = t.key.split(':');
  const r = body(type === 'movie' ? `movie/${id}?append_to_response=credits,external_ids,release_dates` : `tv/${id}?append_to_response=aggregate_credits,credits,external_ids,content_ratings`);
  if (!r) { counts.missingTitles++; continue; }
  times.push(r.retrievedAt);
  const d = r.body;
  const ref = `${type}:${d.id}`;
  const title = type === 'movie' ? d.title : d.name;
  const when = date(type === 'movie' ? d.release_date : d.first_air_date);
  const rec = {
    ref, type, title, originalTitle: type === 'movie' ? d.original_title : d.original_name, status: d.status ?? null, date: when,
    lastAirDate: type === 'tv' ? date(d.last_air_date) : undefined,
    originalLanguage: d.original_language ?? null, languages: (d.spoken_languages ?? []).map((l) => l.english_name || l.name),
    countries: (d.production_countries ?? []).map((c) => c.name), genres: (d.genres ?? []).map((g) => g.name),
    runtime: type === 'movie' ? known(d.runtime) : null, episodeRuntimes: type === 'tv' ? (d.episode_run_time ?? []) : undefined,
    overview: d.overview || null, tagline: d.tagline || null,
    companies: (d.production_companies ?? []).map((c) => ({ tmdbId: c.id, name: c.name, country: c.origin_country || null })),
    networks: type === 'tv' ? (d.networks ?? []).map((n) => n.name) : undefined,
    createdBy: type === 'tv' ? (d.created_by ?? []).map((c) => ({ person: c.id, name: c.name })) : undefined,
    externalIds: { imdb: d.external_ids?.imdb_id || null, wikidata: d.external_ids?.wikidata_id || null },
    collection: d.belongs_to_collection ? { id: d.belongs_to_collection.id, name: d.belongs_to_collection.name } : null,
    classifications: type === 'movie'
      ? (d.release_dates?.results ?? []).flatMap((c) => c.release_dates.filter((x) => x.certification).slice(0, 1).map((x) => ({ country: c.iso_3166_1, rating: x.certification })))
      : (d.content_ratings?.results ?? []).filter((c) => c.rating).map((c) => ({ country: c.iso_3166_1, rating: c.rating })),
    budget: type === 'movie' ? known(d.budget) : null, revenue: type === 'movie' ? known(d.revenue) : null,
    rating: d.vote_count > 0 ? { average: d.vote_average, count: d.vote_count } : null,
    retrievedAt: r.retrievedAt,
    discoveredVia: t.companies,
    cast: (d.credits?.cast ?? []).map((c) => ({ person: c.id, name: c.name, character: c.character || null, order: c.order })),
    crew: (d.credits?.crew ?? []).map((c) => ({ person: c.id, name: c.name, department: c.department, job: c.job })),
  };
  if (type === 'tv') {
    // Series-level credits as TMDB aggregates them across episodes: how many episodes, never proof of every episode.
    rec.seriesCast = (d.aggregate_credits?.cast ?? []).map((c) => ({ person: c.id, name: c.name, roles: c.roles.map((x) => ({ character: x.character || null, episodes: x.episode_count })), episodes: c.total_episode_count }));
    rec.seriesCrew = (d.aggregate_credits?.crew ?? []).map((c) => ({ person: c.id, name: c.name, department: c.department, jobs: c.jobs.map((x) => ({ job: x.job, episodes: x.episode_count })), episodes: c.total_episode_count }));
    rec.seasons = [];
    for (const s of d.seasons ?? []) {
      const sr = body(`tv/${d.id}/season/${s.season_number}?append_to_response=credits`);
      const sref = `${ref}:s:${s.season_number}`;
      rec.seasons.push({ ref: sref, number: s.season_number, name: s.name, date: date(s.air_date), episodes: s.episode_count, available: !!sr });
      if (!sr) { counts.missingSeasons++; continue; }
      counts.seasons++;
      times.push(sr.retrievedAt);
      const sb = sr.body;
      const eps = (sb.episodes ?? []).map((e) => ({
        number: e.episode_number, name: e.name, date: date(e.air_date), runtime: known(e.runtime), overview: e.overview || null,
        rating: e.vote_count > 0 ? { average: e.vote_average, count: e.vote_count } : null,
        crew: (e.crew ?? []).map((c) => ({ person: c.id, name: c.name, department: c.department, job: c.job })),
        guests: (e.guest_stars ?? []).map((c) => ({ person: c.id, name: c.name, character: c.character || null, order: c.order })),
      }));
      counts.episodes += eps.length;
      if (s.season_number > 0) {
        // Talk shows, soaps, news and other daily programmes run continuously: TMDB's seasons there are years, not seasons anyone
        // premieres or ends. A season of 100 or more episodes is a daily schedule too (syndicated game and court shows aren't tagged Talk).
        const daily = rec.genres.some((g) => g === 'Talk' || g === 'Soap' || g === 'News') || (d.seasons ?? []).some((x) => x.episode_count >= 100);
        const dated = eps.filter((e) => e.date).sort((a, b) => a.date.localeCompare(b.date) || a.number - b.number);
        const opens = dated[0]?.date ?? date(sb.air_date);
        const last = dated.at(-1);
        // A season released all at once (every episode on one day) is one event, not a premiere and a finale.
        const drop = dated.length > 1 && dated.length === eps.length && dated[0].date === last.date;
        // A running season lists only the episodes known so far, so its last one listed isn't a finale. A season is known to
        // be finished once a later one exists or the series has ended.
        const complete = !daily && !drop && (rec.status === 'Ended' || rec.status === 'Canceled' || (d.seasons ?? []).some((x) => x.season_number > s.season_number));
        const gaps = dated.slice(1).map((e, i) => (Date.parse(e.date) - Date.parse(dated[i].date)) / 86_400_000).sort((a, b) => a - b);
        seasonFacts.push({ n: s.season_number, eps: eps.length, dated: dated.length, d0: opens, d1: last?.date ?? null, gap: gaps.length ? gaps[gaps.length >> 1] : 7, drop: drop ? 1 : 0,
          // Each episode's day in its season, breaks included, for a season fully dated: a new season keeps the series' own rhythm
          // (a daily programme's weekdays and its summer weeks off among them).
          offs: !drop && dated.length === eps.length && dated.length > 1 ? dated.map((e) => Math.round((Date.parse(e.date) - Date.parse(opens)) / 86_400_000)) : undefined,
          cast: (sb.credits?.cast ?? []).filter((c) => c.order < 8).map((c) => ({ p: c.id, name: c.name, ch: c.character || null })) });
        if (opens && opens >= WORLD_FROM) world.push({ d: opens, k: 'season', r: sref, t: title, s: s.season_number, eps: eps.length, net: rec.networks, ci: studiosOf(rec), first: s.season_number === 1, daily: daily ? 1 : undefined, drop: drop ? 1 : undefined });
        for (const e of dated) if (e.date >= WORLD_FROM) world.push({ d: e.date, k: 'episode', r: `${sref}:e:${e.number}`, t: title, s: s.season_number, e: e.number, n: e.name, net: rec.networks, daily: daily ? 1 : undefined, f: e === last && complete && dated.length === eps.length && dated.length > 1 ? 1 : undefined });
      }
      for (const e of eps) {
        for (const c of e.crew) { person(c.person, c.name).credits.push({ ref: `${sref}:e:${e.number}`, title: `${title}: ${e.name}`, date: e.date, kind: 'episode-crew', role: c.job, department: c.department }); counts.episodeCredits++; }
        for (const c of e.guests) { person(c.person, c.name).credits.push({ ref: `${sref}:e:${e.number}`, title: `${title}: ${e.name}`, date: e.date, kind: 'episode-guest', role: c.character }); counts.episodeCredits++; }
      }
      write(`seasons/${d.id}-${s.season_number}.json`, { ref: sref, series: ref, seriesTitle: title, number: sb.season_number, name: sb.name, date: date(sb.air_date), overview: sb.overview || null, retrievedAt: sr.retrievedAt,
        cast: (sb.credits?.cast ?? []).map((c) => ({ person: c.id, name: c.name, character: c.character || null, order: c.order })), episodes: eps });
    }
  }
  counts[type === 'movie' ? 'movies' : 'series']++;
  if (type === 'tv' && ['Returning Series', 'In Production', 'Planned', 'Pilot'].includes(rec.status)) {
    const seasons = seasonFacts.filter((x) => x.n > 0 && x.d0);
    const lastCast = seasons.at(-1)?.cast ?? [];
    profiles.push({ r: ref, t: title, status: rec.status, type: d.type ?? null, net: rec.networks, ci: studiosOf(rec), genres: rec.genres,
      daily: rec.genres.some((g) => g === 'Talk' || g === 'Soap' || g === 'News') || (d.seasons ?? []).some((x) => x.episode_count >= 100) ? 1 : 0,
      // The last three seasons are what the engine reads (its record of release pattern and run); `aired` counts them all.
      aired: seasons.length, seasons: seasons.slice(-3).map(({ cast, ...x }) => x),
      // The recorded regulars who return in a simulated season (the owner's rule): the last season's top-billed cast.
      regulars: lastCast.length ? lastCast : (rec.seriesCast ?? []).slice(0, 8).map((c) => ({ p: c.person, name: c.name, ch: c.roles[0]?.character ?? null })) });
  }
  if (type === 'movie' && when && when >= WORLD_FROM) world.push({ d: when, k: 'film', r: ref, t: title, ci: studiosOf(rec) });
  // How a series stood when the records were taken. When it was announced isn't recorded, so it is told at the records' end.
  if (type === 'tv' && (rec.status === 'Ended' || rec.status === 'Canceled') && rec.lastAirDate && rec.lastAirDate >= WORLD_FROM) world.push({ d: null, k: 'end', r: ref, t: title, st: rec.status, la: rec.lastAirDate, net: rec.networks, ci: studiosOf(rec) });
  const castList = type === 'tv' ? rec.seriesCast : rec.cast;
  for (const c of castList) { person(c.person, c.name).credits.push({ ref, title, date: when, kind: type === 'tv' ? 'series-cast' : 'cast', role: type === 'tv' ? c.roles.map((x) => x.character).filter(Boolean).join(', ') || null : c.character, episodes: c.episodes }); counts.castCredits++; }
  for (const c of type === 'tv' ? rec.seriesCrew : rec.crew) { person(c.person, c.name).credits.push({ ref, title, date: when, kind: type === 'tv' ? 'series-crew' : 'crew', role: type === 'tv' ? c.jobs.map((x) => x.job).join(', ') : c.job, department: c.department, episodes: c.episodes }); counts.crewCredits++; }
  for (const c of rec.createdBy ?? []) person(c.person, c.name).credits.push({ ref, title, date: when, kind: 'creator', role: 'Creator' });
  write(`titles/${type}-${d.id}.json`, rec);
  search.push([ref, title, when ? when.slice(0, 4) : null]);
  for (const c of rec.companies) if (companies.has(c.tmdbId)) companies.get(c.tmdbId).push({ ref, title, date: when, credited: c.name, genres: rec.genres, status: rec.status });
  // A title discovered for a company whose credit TMDB's details no longer list is kept with the discovery as its source.
  for (const cid of t.companies) if (!rec.companies.some((c) => c.tmdbId === cid)) companies.get(cid)?.push({ ref, title, date: when, credited: null, genres: rec.genres, status: rec.status });
}

// People: details where fetched (manifest.peopleRule), credits within this catalog for everyone, in buckets by id.
const buckets = Array.from({ length: BUCKETS }, () => ({}));
let withDetails = 0;
for (const p of people.values()) {
  const r = manifest.people.includes(p.id) ? body(`person/${p.id}`) : null;
  if (r) { withDetails++; times.push(r.retrievedAt); }
  const d = r?.body;
  buckets[p.id % BUCKETS][p.id] = {
    id: p.id, name: p.name,
    details: d ? { birthday: date(d.birthday), deathday: date(d.deathday), placeOfBirth: d.place_of_birth || null, knownFor: d.known_for_department || null, biography: d.biography || null, alsoKnownAs: (d.also_known_as ?? []).slice(0, 8), imdb: d.imdb_id || null, retrievedAt: r.retrievedAt } : null,
    credits: p.credits,
  };
}
buckets.forEach((b, i) => write(`people/${i}.json`, b));
// People search, by the first letter of the name (A to Z, then everything else).
const letters = {};
for (const p of people.values()) { const k = /^[a-z]/i.test(p.name) ? p.name[0].toUpperCase() : '_'; (letters[k] ??= []).push([p.id, p.name, p.credits.length]); }
for (const [k, v] of Object.entries(letters)) write(`search/people-${k}.json`, v.sort((a, b) => b[2] - a[2]));
write('search/titles.json', search);
for (const [id, entries] of companies) write(`companies/${id}.json`, { tmdbId: id, entries });

times.sort();
const horizon = (times.at(-1) ?? new Date().toISOString()).slice(0, 10);
for (const ev of world) if (ev.d === null) ev.d = horizon;
world.sort((a, b) => a.d.localeCompare(b.d) || a.t.localeCompare(b.t) || (a.s ?? 0) - (b.s ?? 0) || (a.e ?? 0) - (b.e ?? 0));
write('world.json', { version: 1, builtAt: new Date().toISOString(), horizon, from: WORLD_FROM, events: world, series: profiles });
const discovery = manifest.queries.map((q) => ({ company: q.companyId, type: q.type, reported: q.total, found: q.found, pages: q.pages, split: q.split, failedPages: q.failedPages }));
write('index.json', {
  version: 1, builtAt: new Date().toISOString(), registryChecked: REGISTRY_CHECKED,
  retrieved: { from: times[0] ?? null, to: times.at(-1) ?? null, maxAgeDays: MAX_AGE_DAYS },
  counts: { ...counts, people: people.size, peopleWithDetails: withDetails },
  peopleRule: manifest.peopleRule, discovery, failures: manifest.failures.length, stale: stale.length,
  companies: [...companies].map(([id, e]) => ({ tmdbId: id, titles: e.length, movies: e.filter((x) => x.ref.startsWith('movie')).length, series: e.filter((x) => x.ref.startsWith('tv')).length })),
});
console.log(JSON.stringify({ out: OUT, counts: { ...counts, people: people.size, peopleWithDetails: withDetails }, failures: manifest.failures.length, stale: stale.length }, null, 1));
if (stale.length) console.log(`${stale.length} cached responses were missing or older than ${MAX_AGE_DAYS} days and were left out; rerun the importer.`);
if (!existsSync(OUT)) process.exit(1);
