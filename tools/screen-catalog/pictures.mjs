// The whole imported catalog's pictures (the v3 package, 03-COMPLETE-PICTURE-PACK.md; docs/DATA-PACKS.md): an inventory
// of every imported person, film, series, season, episode, company and network; a manifest that says, for each, what
// was found and what happened; and a fetch that can stop at any point and go on from there.
//   node tools/screen-catalog/pictures.mjs inventory            every eligible entity and its primary picture path
//   NODE_USE_ENV_PROXY=1 node tools/screen-catalog/pictures.mjs fetch [--kinds=profile,poster] [--limit=N] [--minutes=N]
//   node tools/screen-catalog/pictures.mjs report               docs/PICTURE-COVERAGE.md and .json from the manifest
// Scope is the catalog the game imported, never TMDB as a whole. Each picture path is read from the catalog's own
// cache (a person's profile_path, a title's poster_path and backdrop_path, a season's poster_path, an episode's
// still_path, a company's or network's logo_path: each a documented field of TMDB's details endpoints). The picture is
// fetched from TMDB's image host, which needs no credential: none is read, held or sent here.
//
// A row's status is one of STATUSES. A placeholder is never a retrieved picture: a record TMDB publishes no picture
// for is `no-image-published`, and one whose fetch failed stays `temporarily-failed` until a later run gets it.
// Pictures are in .screen-images/store/ (git-ignored), named by TMDB's size and path, so one picture that several
// records share is fetched and kept once. A picture older than TMDB's six months is `stale` and is fetched again.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dimensions } from './images.mjs';
import { writePack } from '../pack-format.mjs';

export const IMAGE_BASE = 'https://image.tmdb.org/t/p/';
export const STATUSES = ['ready', 'no-image-published', 'temporarily-failed', 'permission-limited', 'stale', 'intentionally-excluded', 'not-attempted'];
/** One primary rendition for each kind: TMDB's own size names (its /configuration, read November 12, 2026). Small on purpose: they are shown in lists and on a phone. Larger and alternate pictures would be another tier, not built. */
export const RENDITION = { profile: 'w185', poster: 'w185', backdrop: 'w300', 'season-poster': 'w185', still: 'w185', logo: 'w154' };
export const KINDS = Object.keys(RENDITION);
export const MAX_AGE_DAYS = 180;
const DAY = 86_400_000;
const BUCKETS = 64;

export const bucketOf = (entity) => { let h = 0; for (const c of entity) h = (h * 31 + c.charCodeAt(0)) >>> 0; return String(h % BUCKETS).padStart(2, '0'); };
export const storePath = (size, path) => { const f = path.replace(/^\//, ''); return join(size, f.slice(0, 2), f); };

/**
 * Every eligible entity of the imported catalog with its primary picture path, or null where TMDB publishes none.
 * `read(path)` returns a cached TMDB response body or null. A record TMDB marks adult is listed and excluded, with the
 * reason. A title or season whose details aren't in the cache is listed as not found there, never guessed.
 */
export function* inventory({ manifest, read, companies = [], networks = [] }) {
  const row = (entity, kind, path, extra = {}) => ({ entity, kind, path: path || null, ...extra });
  for (const t of manifest.titles) {
    const [type, id] = t.key.split(':');
    const d = read(type === 'movie' ? `movie/${id}?append_to_response=credits,external_ids,release_dates` : `tv/${id}?append_to_response=aggregate_credits,credits,external_ids,content_ratings`);
    if (!d) { yield row(t.key, 'poster', null, { uncached: true }); yield row(t.key, 'backdrop', null, { uncached: true }); continue; }
    const adult = d.adult ? { excluded: 'TMDB marks this title adult' } : {};
    yield row(t.key, 'poster', d.poster_path, adult);
    yield row(t.key, 'backdrop', d.backdrop_path, adult);
  }
  for (const path of manifest.seasons) {
    const m = /^tv\/(\d+)\/season\/(\d+)/.exec(path);
    const d = read(path);
    if (!m) continue;
    if (!d) { yield row(`season:${m[1]}:${m[2]}`, 'season-poster', null, { uncached: true }); continue; }
    yield row(`season:${m[1]}:${m[2]}`, 'season-poster', d.poster_path);
    for (const e of d.episodes ?? []) yield row(`episode:${m[1]}:${m[2]}:${e.episode_number}`, 'still', e.still_path);
  }
  for (const id of manifest.people) {
    const d = read(`person/${id}`);
    if (!d) { yield row(`person:${id}`, 'profile', null, { uncached: true }); continue; }
    yield row(`person:${id}`, 'profile', d.profile_path, d.adult ? { excluded: 'TMDB marks this person adult' } : {});
  }
  for (const c of companies) { const d = read(`company/${c.tmdb}`); yield row(c.id, 'logo', d?.logo_path, d ? {} : { uncached: true }); }
  for (const id of networks) { const d = read(`network/${id}`); yield row(`network:${id}`, 'logo', d?.logo_path, d ? {} : { uncached: true }); }
}

/** The manifest on disk: rows by entity and kind, in shards, each written whole and swapped in. */
export class Manifest {
  constructor(dir) { this.dir = dir; this.shards = new Map(); this.dirty = new Set(); }
  key(r) { return `${r.kind}/${bucketOf(r.entity)}`; }
  shard(k) {
    if (!this.shards.has(k)) {
      const f = join(this.dir, `${k}.json`);
      this.shards.set(k, existsSync(f) ? new Map(JSON.parse(readFileSync(f, 'utf8')).map((r) => [r.entity, r])) : new Map());
    }
    return this.shards.get(k);
  }
  get(entity, kind) { return this.shard(this.key({ entity, kind })).get(entity); }
  set(r) { const k = this.key(r); this.shard(k).set(r.entity, r); this.dirty.add(k); }
  flush() {
    for (const k of this.dirty) {
      const f = join(this.dir, `${k}.json`);
      mkdirSync(join(f, '..'), { recursive: true });
      writeFileSync(`${f}.tmp`, JSON.stringify([...this.shards.get(k).values()]));
      renameSync(`${f}.tmp`, f);
    }
    this.dirty.clear();
  }
  *rows() {
    // Shards on disk and shards only in memory yet (a manifest being built): both.
    for (const kind of KINDS) {
      const d = join(this.dir, kind);
      const keys = new Set(existsSync(d) ? readdirSync(d).filter((x) => x.endsWith('.json')).map((f) => `${kind}/${f.slice(0, -5)}`) : []);
      for (const k of this.shards.keys()) if (k.startsWith(`${kind}/`)) keys.add(k);
      for (const k of [...keys].sort()) yield* this.shard(k).values();
    }
  }
}

/**
 * Bring the manifest up to the inventory: a new entity is `not-attempted`; one with no path is `no-image-published`;
 * an excluded one says why; a `ready` row whose path changed, whose file is gone or is older than six months goes
 * back to be fetched (`stale`). Rows for entities no longer in the catalog are dropped. Returns the counts.
 */
export function reconcile(man, rows, { store, now = Date.now(), exists = existsSync } = {}) {
  const seen = new Set();
  const n = { added: 0, kept: 0, stale: 0, dropped: 0 };
  for (const r of rows) {
    seen.add(`${r.kind}|${r.entity}`);
    const size = RENDITION[r.kind];
    const old = man.get(r.entity, r.kind);
    const base = { provider: 'TMDB', entity: r.entity, kind: r.kind, path: r.path, size };
    if (r.excluded) { man.set({ ...base, status: 'intentionally-excluded', note: r.excluded }); continue; }
    if (!r.path) { man.set({ ...base, status: r.uncached ? 'not-attempted' : 'no-image-published', ...(r.uncached ? { note: "its details aren't in the catalog's cache" } : {}) }); continue; }
    if (old && old.path === r.path && old.status === 'ready') {
      const here = exists(join(store, storePath(size, r.path)));
      if (here && now - Date.parse(old.at) < MAX_AGE_DAYS * DAY) { n.kept++; continue; }
      man.set({ ...old, status: 'stale', note: here ? 'older than six months' : 'its file is gone' }); n.stale++; continue;
    }
    if (old && old.path === r.path && old.status !== 'no-image-published') { n.kept++; continue; }
    man.set({ ...base, status: 'not-attempted' }); n.added++;
  }
  for (const r of [...man.rows()]) if (!seen.has(`${r.kind}|${r.entity}`)) { man.shard(man.key(r)).delete(r.entity); man.dirty.add(man.key(r)); n.dropped++; }
  return n;
}

const TO_FETCH = new Set(['not-attempted', 'temporarily-failed', 'stale']);

/**
 * Fetch what the manifest still needs. Each picture is written beside its place and swapped in, hashed and measured;
 * only then is its row `ready`. Two rows with one path fetch once (`reused` on the second). 429 waits as long as the
 * host says; other failures back off and retry, then the row stays `temporarily-failed` for the next run. Stops when
 * `stop()` says so, with everything fetched so far recorded.
 */
export async function fetchPictures(man, { store, kinds = KINDS, limit = Infinity, rate = 20, workers = 8, transport = (url) => fetch(url), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), now = () => Date.now(), stop = () => false, log = () => {}, flushEvery = 2000 } = {}) {
  const todo = [];
  for (const r of man.rows()) if (kinds.includes(r.kind) && r.path && TO_FETCH.has(r.status)) todo.push(r);
  const out = { wanted: todo.length, fetched: 0, reused: 0, failed: 0, bytes: 0, stopped: false };
  const done = new Map(); // size|path -> { hash, bytes, w, h, at } for this run
  let next = 0, i = 0, since = 0;
  const one = async (r) => {
    const rel = storePath(r.size, r.path);
    const full = join(store, rel);
    const k = `${r.size}|${r.path}`;
    const finish = (m, reused) => { man.set({ provider: 'TMDB', entity: r.entity, kind: r.kind, path: r.path, size: r.size, status: 'ready', file: rel, ...m, ...(reused ? { reused: true } : {}) }); if (reused) out.reused++; };
    if (done.has(k)) { const m = await done.get(k); if (m) finish(m, true); else { man.set({ ...r, status: 'temporarily-failed', note: 'the same picture failed for another record in this run' }); out.failed++; } return; }
    let settle;
    done.set(k, new Promise((res) => { settle = res; }));
    // Already in the store from an earlier run (another record's, or this one's before its row was written): verified, not fetched again.
    if (existsSync(full) && r.status !== 'stale') {
      const buf = readFileSync(full); const dim = dimensions(buf);
      if (dim) { const m = { hash: createHash('sha256').update(buf).digest('hex'), bytes: buf.length, w: dim.w, h: dim.h, at: new Date(statSync(full).mtimeMs).toISOString().slice(0, 10) }; settle(m); finish(m, true); return; }
    }
    let note = '';
    for (let attempt = 0; attempt < 5; attempt++) {
      const at = Math.max(now(), next); next = at + 1000 / rate; if (at > now()) await sleep(at - now());
      let res;
      try { res = await transport(`${IMAGE_BASE}${r.size}${r.path}`); } catch (e) { note = `network: ${e.message}`; await sleep(500 * 2 ** attempt); continue; }
      if (res.status === 429) { note = 'rate limited (429)'; await sleep(1000 * (Number(res.headers?.get?.('retry-after')) || 5)); continue; }
      if (res.status === 404) { man.set({ ...r, status: 'no-image-published', note: 'TMDB lists this path and does not serve it (404)' }); settle(null); return; }
      if (res.status === 401 || res.status === 403) { man.set({ ...r, status: 'permission-limited', note: `the image host refused it (${res.status})` }); settle(null); return; }
      if (!res.ok) { note = `the image host answered ${res.status}`; await sleep(500 * 2 ** attempt); continue; }
      // The connection can drop after the answer has begun (seen November 12, 2026, at picture 40,000 of a run: the
      // read rejected outside any catch and ended the run). It is tried again like any other network failure.
      let buf;
      try { buf = Buffer.from(await res.arrayBuffer()); } catch (e) { note = `network, part way through the picture: ${e.message}`; await sleep(500 * 2 ** attempt); continue; }
      const dim = dimensions(buf);
      if (!dim) { note = 'what came back is not a picture'; await sleep(500 * 2 ** attempt); continue; }
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(`${full}.part`, buf); renameSync(`${full}.part`, full);
      const m = { hash: createHash('sha256').update(buf).digest('hex'), bytes: buf.length, w: dim.w, h: dim.h, at: new Date(now()).toISOString().slice(0, 10) };
      out.fetched++; out.bytes += buf.length;
      settle(m); finish(m, false);
      return;
    }
    man.set({ ...r, status: 'temporarily-failed', note }); out.failed++; settle(null);
  };
  const worker = async () => {
    while (i < todo.length && i < limit) {
      if (stop()) { out.stopped = true; return; }
      const r = todo[i++];
      await one(r);
      if (++since >= flushEvery) { since = 0; man.flush(); log(`${i} of ${Math.min(todo.length, limit)}: ${out.fetched} fetched, ${out.reused} reused, ${out.failed} failed, ${(out.bytes / 1048576).toFixed(0)} MB`); }
    }
  };
  await Promise.all(Array.from({ length: workers }, worker));
  man.flush();
  return out;
}

/** The reconciliation the package asks for, by kind: nothing unexplained. */
export function coverage(man) {
  const by = Object.fromEntries(KINDS.map((k) => [k, { eligible: 0, checked: 0, available: 0, downloaded: 0, reused: 0, unavailable: 0, failed: 0, permissionLimited: 0, excluded: 0, remaining: 0, bytes: 0 }]));
  const files = new Set();
  for (const r of man.rows()) {
    const c = by[r.kind];
    c.eligible++;
    if (r.path && r.status !== 'intentionally-excluded') c.available++;
    if (r.status !== 'not-attempted' && r.status !== 'stale') c.checked++;
    if (r.status === 'ready') { c.downloaded++; if (files.has(r.file)) c.reused++; else { files.add(r.file); c.bytes += r.bytes; } }
    else if (r.status === 'no-image-published') c.unavailable++;
    else if (r.status === 'temporarily-failed') c.failed++;
    else if (r.status === 'permission-limited') c.permissionLimited++;
    else if (r.status === 'intentionally-excluded') c.excluded++;
    else c.remaining++;
  }
  return by;
}

const WORDS = { profile: "People's portraits", poster: 'Film and series posters', backdrop: 'Film and series backdrops', 'season-poster': 'Season posters', still: 'Episode stills', logo: 'Company and network logos' };
export function coverageMarkdown(by, { at, catalog }) {
  const n = (x) => x.toLocaleString('en-US');
  const rows = KINDS.map((k) => { const c = by[k]; return `| ${WORDS[k]} | ${n(c.eligible)} | ${n(c.checked)} | ${n(c.available)} | ${n(c.downloaded)} | ${n(c.reused)} | ${n(c.unavailable)} | ${n(c.failed)} | ${n(c.permissionLimited)} | ${n(c.excluded)} | ${n(c.remaining)} | ${(c.bytes / 1048576).toFixed(1)} |`; });
  const t = KINDS.reduce((a, k) => { for (const f in by[k]) a[f] = (a[f] ?? 0) + by[k][f]; return a; }, {});
  return `# Picture Coverage

Generated by \`node tools/screen-catalog/pictures.mjs report\` on ${at} from the picture manifest. The pictures themselves
are not in the repository. The rules are in \`docs/DATA-PACKS.md\`, "Pictures For The Whole Catalog".

Scope: the catalog the game imported (${catalog}), not TMDB as a whole. One primary picture for each record, at a small
size (${KINDS.map((k) => `${k} ${RENDITION[k]}`).join(', ')}).

| Kind | Eligible | Checked | A picture is published | Downloaded | Of those, shared with another record | None published | Failed, to retry | Refused | Excluded | Not attempted yet | MB kept |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join('\n')}
| **All** | ${n(t.eligible)} | ${n(t.checked)} | ${n(t.available)} | ${n(t.downloaded)} | ${n(t.reused)} | ${n(t.unavailable)} | ${n(t.failed)} | ${n(t.permissionLimited)} | ${n(t.excluded)} | ${n(t.remaining)} | ${(t.bytes / 1048576).toFixed(1)} |

- **Eligible:** every imported record of that kind. **Checked:** its picture was fetched, or found not to exist, or it
  was excluded. **None published:** TMDB has no picture for it; the game shows its placeholder.
- **Excluded:** records TMDB marks adult. Nothing is fetched for them.
- **Failed, to retry** and **Not attempted yet** are what a later run of the fetch still owes. A complete download has
  neither.
- "MB kept" counts each stored file once.
`;
}

/** What the game calls each kind of picture, and what its shards are named for. */
export const KIND_NAMES = { profile: "People's Portraits", poster: 'Film And Series Posters', backdrop: 'Film And Series Backdrops', 'season-poster': 'Season Posters', still: 'Episode Stills', logo: 'Company And Network Logos' };
const RIGHTS = "These pictures are TMDB's, gathered for the owner's own copy of the game. The rights to each belong to its owner. Nothing here clears a picture for any other use, and the game does not claim a licence.";

/**
 * The downloaded store as packs the game can install (docs/DATA-PACKS.md, "Pictures For The Whole Catalog"): one pack
 * for each of the manifest's shards, so one kind of picture is at most 64 downloads of a size a phone can take, and
 * an index of them with each pack's size and SHA-256. A record is in exactly one shard, by its own identity, so a
 * person credited at five studios is downloaded once. Only rows that are ready and whose file is there go in; nothing
 * stands in for a picture that isn't.
 */
export function packShards(man, { store, out, now = () => Date.now(), log = () => {} }) {
  const shards = new Map();
  for (const r of man.rows()) {
    if (r.status !== 'ready') continue;
    const part = `${r.kind}-${bucketOf(r.entity)}`;
    (shards.get(part) ?? shards.set(part, []).get(part)).push(r);
  }
  mkdirSync(out, { recursive: true });
  const builtAt = new Date(now()).toISOString();
  const kinds = {};
  let from = '9999', to = '0000', missing = 0;
  for (const [part, rows] of [...shards].sort(([a], [b]) => a.localeCompare(b))) {
    const kind = rows[0].kind;
    const entries = {}; const files = [];
    for (const r of rows.sort((a, b) => a.entity.localeCompare(b.entity))) {
      const full = join(store, r.file);
      if (!existsSync(full)) { missing++; continue; }
      entries[r.entity] = { p: r.path, w: r.w, h: r.h, at: r.at };
      files.push([`pictures/${part}/${r.entity}`, readFileSync(full)]);
      if (r.at < from) from = r.at; if (r.at > to) to = r.at;
    }
    if (!files.length) continue;
    const retrieved = { from: rows.reduce((m, r) => (r.at < m ? r.at : m), '9999'), to: rows.reduce((m, r) => (r.at > m ? r.at : m), '0000'), maxAgeDays: MAX_AGE_DAYS };
    const index = { version: 1, provider: 'TMDB', kind, size: RENDITION[kind], rights: RIGHTS, entries };
    const buf = writePack({ kind: 'pictures', part, name: `${KIND_NAMES[kind]}, Part ${part.slice(-2)}`, source: 'TMDB', builtAt, retrieved }, [[`pictures/${part}/index.json`, JSON.stringify(index)], ...files]);
    const file = `${part}.slatepack`;
    writeFileSync(join(out, `${file}.tmp`), buf); renameSync(join(out, `${file}.tmp`), join(out, file));
    const k = (kinds[kind] ??= { name: KIND_NAMES[kind], size: RENDITION[kind], pictures: 0, bytes: 0, shards: [] });
    k.pictures += files.length; k.bytes += buf.length;
    k.shards.push({ part, file, pictures: files.length, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
    log(`${file}: ${files.length} pictures, ${(buf.length / 1048576).toFixed(1)} MB`);
  }
  const index = { version: 1, provider: 'TMDB', builtAt, retrieved: { from, to, maxAgeDays: MAX_AGE_DAYS }, rights: RIGHTS, kinds };
  writeFileSync(join(out, 'index.json.tmp'), JSON.stringify(index)); renameSync(join(out, 'index.json.tmp'), join(out, 'index.json'));
  return { index, missing };
}

async function main() {
  const [cmd] = process.argv.slice(2);
  const arg = (k, d) => process.argv.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3) ?? d;
  const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
  const { CACHE, cached } = await import('./tmdb.mjs');
  const { COMPANIES } = await import('../../src/catalog/registry.ts');
  const OUT = process.env.SCREEN_IMAGES ?? join(process.cwd(), '.screen-images');
  const store = join(OUT, 'store');
  const man = new Manifest(join(OUT, 'manifest'));
  if (cmd === 'inventory') {
    const manifest = JSON.parse(readFileSync(join(CACHE, 'manifest.json'), 'utf8'));
    const networks = existsSync(join(CACHE, 'networks.json')) ? JSON.parse(readFileSync(join(CACHE, 'networks.json'), 'utf8')) : null;
    const read = (p) => { const r = cached(p); return r && r.status === 200 ? r.body : null; };
    const companies = COMPANIES.filter((c) => c.tmdb?.id).map((c) => ({ id: c.id, tmdb: c.tmdb.id }));
    // A company's logo path is in its details, which the catalog import doesn't otherwise need: fetched here once, through
    // the session's proxy, and cached with everything else.
    const { get } = await import('./tmdb.mjs');
    for (const c of companies) if (!cached(`company/${c.tmdb}`)) await get(`company/${c.tmdb}`);
    const n = reconcile(man, inventory({ manifest, read, companies, networks: manifest.networks ?? Object.keys(networks?.networks ?? {}) }), { store });
    man.flush();
    log(`Inventory: ${n.added} to fetch, ${n.kept} unchanged, ${n.stale} to fetch again, ${n.dropped} no longer in the catalog.`);
  } else if (cmd === 'fetch') {
    const until = Date.now() + Number(arg('minutes', '100000')) * 60_000;
    const r = await fetchPictures(man, { store, kinds: arg('kinds', KINDS.join(',')).split(','), limit: Number(arg('limit', 'Infinity')), rate: Number(arg('rate', '20')), stop: () => Date.now() > until, log });
    log(`${r.stopped ? 'Stopped' : 'Done'}: wanted ${r.wanted}; ${r.fetched} fetched (${(r.bytes / 1048576).toFixed(1)} MB), ${r.reused} reused, ${r.failed} failed.`);
  } else if (cmd === 'pack') {
    const r = packShards(man, { store, out: arg('out', 'packs/pictures'), log });
    const all = Object.values(r.index.kinds);
    log(`Packed ${all.reduce((n, k) => n + k.pictures, 0).toLocaleString('en-US')} pictures in ${all.reduce((n, k) => n + k.shards.length, 0)} packs, ${(all.reduce((n, k) => n + k.bytes, 0) / 1048576).toFixed(0)} MB${r.missing ? `; ${r.missing} listed as ready had no file and were left out` : ''}.`);
  } else if (cmd !== 'report') { console.error('Usage: pictures.mjs inventory | fetch [--kinds=] [--limit=] [--minutes=] [--rate=] | report | pack [--out=]'); process.exit(2); }
  const by = coverage(man);
  if (cmd === 'report') {
    const manifest = JSON.parse(readFileSync(join(CACHE, 'manifest.json'), 'utf8'));
    writeFileSync('docs/PICTURE-COVERAGE.md', coverageMarkdown(by, { at: new Date().toISOString().slice(0, 10), catalog: `${manifest.titles.length.toLocaleString('en-US')} titles and ${manifest.people.length.toLocaleString('en-US')} people` }));
    writeFileSync('docs/PICTURE-COVERAGE.json', `${JSON.stringify({ at: new Date().toISOString(), renditions: RENDITION, coverage: by }, null, 1)}\n`);
    log('docs/PICTURE-COVERAGE.md written.');
  }
  for (const k of KINDS) log(k, JSON.stringify(by[k]));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
