// TMDB requests for the screen catalog importer (docs/CATALOG.md). Requests go through the cloud session's proxy, which adds
// the TMDB credential; this code never reads, holds or sends one, so nothing it writes can contain one. Every response is cached with its retrieval time; TMDB's terms (last updated
// October 20, 2023) allow caching for at most six months, so older entries are refetched and the build refuses them.
import { createHash } from 'node:crypto';
import { appendFileSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, rmSync, truncateSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateRawSync, inflateRawSync } from 'node:zlib';

export const API = 'https://api.themoviedb.org/3/';
export const CACHE = process.env.SCREEN_CATALOG_CACHE ?? join(process.cwd(), '.screen-catalog-cache');
export const MAX_AGE_DAYS = 180;
const HTTP = join(CACHE, 'http');
const FAILED = join(CACHE, 'failed.json');

mkdirSync(HTTP, { recursive: true });

const key = (path) => createHash('sha1').update(path).digest('hex');
const file = (path) => join(HTTP, key(path).slice(0, 2), `${key(path)}.json`);
export const fresh = (at, now = Date.now()) => now - Date.parse(at) < MAX_AGE_DAYS * 86_400_000;

// Responses are kept compressed, appended to one file per bucket (`http/<2 hex>.log`): a 20-byte key, a 4-byte length,
// then the response deflated. Until November 18, 2026 each response was its own JSON file: 800,000 files averaging
// 2.2 KB, each taking at least a 4 KB disk block, so the cache held 4.5 GB on disk for 1.7 GB of answers, and gathering
// TMDB's most-watched titles wouldn't have fitted in the session's disk. A later record for a key replaces an earlier one.
// The old files are still read until `node tools/screen-catalog/tmdb.mjs --compact` moves them in.
const logFile = (bucket) => join(HTTP, `${bucket}.log`);
const indexes = new Map(); // bucket -> Map(key -> [offset, length])
const ends = new Map(); // bucket -> the log's length
function index(bucket) {
  let ix = indexes.get(bucket);
  if (ix) return ix;
  ix = new Map();
  const f = logFile(bucket);
  let at = 0;
  if (existsSync(f)) {
    const buf = readFileSync(f);
    while (at + 24 <= buf.length) {
      const len = buf.readUInt32LE(at + 20);
      if (at + 24 + len > buf.length) break;
      ix.set(buf.toString('hex', at, at + 20), [at + 24, len]);
      at += 24 + len;
    }
    // A record cut short by a crash is dropped, so what is appended after it can be read; it is asked for again.
    if (at < buf.length) truncateSync(f, at);
  }
  indexes.set(bucket, ix);
  ends.set(bucket, at);
  return ix;
}
function readRecord(k) {
  const hit = index(k.slice(0, 2)).get(k);
  if (!hit) return null;
  const fd = openSync(logFile(k.slice(0, 2)), 'r');
  try { const b = Buffer.alloc(hit[1]); readSync(fd, b, 0, hit[1], hit[0]); return JSON.parse(inflateRawSync(b).toString('utf8')); } finally { closeSync(fd); }
}
function writeRecord(k, record) {
  const data = deflateRawSync(Buffer.from(JSON.stringify(record)));
  const head = Buffer.alloc(24);
  Buffer.from(k, 'hex').copy(head);
  head.writeUInt32LE(data.length, 20);
  const bucket = k.slice(0, 2);
  const ix = index(bucket);
  const at = ends.get(bucket);
  appendFileSync(logFile(bucket), Buffer.concat([head, data]));
  ix.set(k, [at + 24, data.length]);
  ends.set(bucket, at + 24 + data.length);
}

/** A cached response: { path, status, retrievedAt, body }, or null if none or too old. */
export function cached(path) {
  const k = key(path);
  let r = readRecord(k);
  if (!r) { const f = file(path); if (existsSync(f)) r = JSON.parse(readFileSync(f, 'utf8')); }
  return r && fresh(r.retrievedAt) ? r : null;
}

/** Moves the one-file-per-response cache into the bucket logs, deleting each old file once its record is written. */
export function compactLegacy(say = () => {}) {
  let moved = 0;
  for (const bucket of readdirSync(HTTP).filter((d) => /^[0-9a-f]{2}$/.test(d))) {
    const dir = join(HTTP, bucket);
    for (const name of readdirSync(dir)) {
      const k = name.replace(/\.json$/, '');
      if (!index(bucket).has(k)) writeRecord(k, JSON.parse(readFileSync(join(dir, name), 'utf8')));
      rmSync(join(dir, name));
      moved++;
    }
    rmSync(dir, { recursive: true, force: true });
    say(`${bucket}: ${moved} moved so far`);
  }
  return moved;
}

const failed = new Map(existsSync(FAILED) ? JSON.parse(readFileSync(FAILED, 'utf8')).map((x) => [x.path, x]) : []);
export const failures = () => [...failed.values()];
export function saveFailures() { writeFileSync(FAILED, JSON.stringify(failures(), null, 1)); }

// About 40 requests a second is TMDB's stated range (developer.themoviedb.org/docs/rate-limiting); stay under it.
const RATE = 30;
let next = 0;
async function slot() {
  const now = Date.now();
  const at = Math.max(now, next);
  next = at + 1000 / RATE;
  if (at > now) await new Promise((r) => setTimeout(r, at - now));
}
export const stats = { network: 0, cache: 0, retries: 0, rateLimited: 0, missing: 0 };

/**
 * GET a TMDB path, from the cache when fresh. 404 is an answer (the record isn't there) and is cached; 429 waits for
 * Retry-After; other failures retry with backoff up to five times, then go to the failed queue and return null.
 */
let fetchImpl = (url) => fetch(url);
let sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** For tests: a stand-in for the network and the clock's waits. */
export function useTransport(f, s = sleep) { fetchImpl = f; sleep = s; }

export async function get(path) {
  const hit = cached(path);
  if (hit) { stats.cache++; return hit.status === 200 ? hit.body : null; }
  let last = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) { stats.retries++; await sleep(Math.min(30_000, 500 * 2 ** attempt)); }
    await slot();
    let res;
    try { res = await fetchImpl(API + path); } catch (e) { last = `network: ${e.message}`; continue; }
    stats.network++;
    if (res.status === 429) { stats.rateLimited++; await sleep(1000 * (Number(res.headers.get('retry-after')) || 2)); last = '429'; continue; }
    if (res.status === 401 || res.status === 403) throw new Error(`TMDB refused the request (${res.status}). The session's network secret for api.themoviedb.org is missing or not accepted.`);
    if (res.status >= 500) { last = String(res.status); continue; }
    const body = res.status === 200 ? await res.json() : null;
    if (res.status !== 200 && res.status !== 404) { last = String(res.status); continue; }
    if (res.status === 404) stats.missing++;
    writeRecord(key(path), { path, status: res.status, retrievedAt: new Date().toISOString(), body });
    failed.delete(path);
    return body;
  }
  failed.set(path, { path, error: last, at: new Date().toISOString() });
  return null;
}

/** Run fn over items with at most `n` in flight. */
export async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}

if (import.meta.url === `file://${process.argv[1]}` && process.argv.includes('--compact')) {
  const n = compactLegacy((m) => console.log(m));
  console.log(`Moved ${n} cached responses into the bucket logs.`);
}
