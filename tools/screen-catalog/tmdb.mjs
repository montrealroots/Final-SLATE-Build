// TMDB requests for the screen catalog importer (docs/CATALOG.md). Requests go through the cloud session's proxy, which adds
// the TMDB credential; this code never reads, holds or sends one, so nothing it writes can contain one. Every response is cached with its retrieval time; TMDB's terms (last updated
// October 20, 2023) allow caching for at most six months, so older entries are refetched and the build refuses them.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const API = 'https://api.themoviedb.org/3/';
export const CACHE = process.env.SCREEN_CATALOG_CACHE ?? join(process.cwd(), '.screen-catalog-cache');
export const MAX_AGE_DAYS = 180;
const HTTP = join(CACHE, 'http');
const FAILED = join(CACHE, 'failed.json');

mkdirSync(HTTP, { recursive: true });

const key = (path) => createHash('sha1').update(path).digest('hex');
const file = (path) => join(HTTP, key(path).slice(0, 2), `${key(path)}.json`);
export const fresh = (at, now = Date.now()) => now - Date.parse(at) < MAX_AGE_DAYS * 86_400_000;

/** A cached response: { path, status, retrievedAt, body }, or null if none or too old. */
export function cached(path) {
  const f = file(path);
  if (!existsSync(f)) return null;
  const r = JSON.parse(readFileSync(f, 'utf8'));
  return fresh(r.retrievedAt) ? r : null;
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
    const f = file(path);
    mkdirSync(join(f, '..'), { recursive: true });
    writeFileSync(f, JSON.stringify({ path, status: res.status, retrievedAt: new Date().toISOString(), body }));
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
