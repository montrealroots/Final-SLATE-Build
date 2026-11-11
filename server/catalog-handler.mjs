// How the game's data files are answered (November 11, 2026, docs/DEPLOYMENT.md): the screen catalog built from TMDB
// (.screen-catalog/) and the cinemas built from Wikidata (.cinemas/). One handler, used by the production server
// (server/serve.mjs) and by Vite's dev and preview servers (vite.config.ts), so what the tests exercise is what ships.
//
// It holds no credential and makes no request of its own: the game reads files the importers built.
// - Files are answered one at a time, on request: there is no listing and no bulk download.
// - TMDB's terms forbid caching its content for more than six months (API Terms 1.C). A catalog whose oldest response is
//   older than that is withdrawn: the game is told it isn't installed until it is gathered and built again.
// - A catalog with no index, or an index that isn't readable JSON, is treated the same way: not installed. The build
//   writes the index last and swaps the whole directory in at once (tools/screen-catalog/build.mjs), so a build cut
//   short is never served half-written.
// - The few files the game reads to learn whether a catalog is there at all are answered {"installed":false} when it
//   isn't, a normal answer rather than a failed request; any other missing file is a 404.
import { closeSync, createReadStream, existsSync, openSync, readFileSync, readSync, readdirSync, statSync } from 'node:fs';
import { join, normalize, sep } from 'node:path';

export const MAX_AGE_DAYS = 180;
const DAY = 86_400_000;
/** Files the game asks for to learn whether there is a catalog (or cinema list) at all. */
const ENTRY = new Set(['index.json', 'world.json', 'theatrical.json', 'cinemas/index.json']);
const PATH = /^\/screen-catalog\/([\w./-]+\.json)$/;

/**
 * Whether a built catalog may be served now, read from its index (cached until the index changes on disk).
 * 'ready', or why not: 'missing' (no index), 'malformed' (an index that isn't the build's JSON), 'expired' (its oldest
 * response is past TMDB's six months).
 */
export function catalogState(dir, now = Date.now(), cache = {}) {
  const file = join(dir, 'index.json');
  if (!existsSync(file)) return { state: 'missing' };
  const mtime = statSync(file).mtimeMs;
  if (cache.mtime !== mtime) {
    let index = null;
    try { index = JSON.parse(readFileSync(file, 'utf8')); } catch { index = null; }
    Object.assign(cache, { mtime, index });
  }
  const from = cache.index?.retrieved?.from;
  if (!cache.index || cache.index.version !== 1 || typeof from !== 'string' || Number.isNaN(Date.parse(from))) return { state: 'malformed' };
  const expires = Date.parse(from) + MAX_AGE_DAYS * DAY;
  return now >= expires ? { state: 'expired', expires } : { state: 'ready', expires };
}

const MAGIC = 'SLATEPACK1\n';
/** A data pack's header (tools/pack-format.mjs), without its list of records; null for a file that isn't one. */
export function readPackHeader(file) {
  const fd = openSync(file, 'r');
  try {
    const head = Buffer.alloc(MAGIC.length + 4);
    readSync(fd, head, 0, head.length, 0);
    if (head.subarray(0, MAGIC.length).toString('utf8') !== MAGIC) return null;
    const json = Buffer.alloc(head.readUInt32LE(MAGIC.length));
    readSync(fd, json, 0, json.length, head.length);
    const { entries, ...meta } = JSON.parse(json.toString('utf8'));
    return { ...meta, files: entries.length };
  } catch { return null; } finally { closeSync(fd); }
}

/**
 * The mods this copy of the game offers (November 11, 2026, docs/DATA-PACKS.md): every data pack in `packsDir`, read
 * from its header. A film pack past TMDB's six months is neither listed nor served.
 */
export function offeredMods(packsDir, now = Date.now()) {
  if (!packsDir || !existsSync(packsDir)) return [];
  return readdirSync(packsDir).filter((f) => f.endsWith('.slatepack')).sort().flatMap((file) => {
    const h = readPackHeader(join(packsDir, file));
    if (!h || h.format !== 1 || (h.kind !== 'catalog' && h.kind !== 'cinemas')) return [];
    if (h.kind === 'catalog' && !(Date.parse(h.retrieved?.from) + MAX_AGE_DAYS * DAY > now)) return [];
    return [{ file, kind: h.kind, name: h.name, source: h.source, builtAt: h.builtAt, ...(h.retrieved ? { retrieved: h.retrieved } : {}), files: h.files, bytes: statSync(join(packsDir, file)).size }];
  });
}
const MODS = /^\/mods\/(index\.json|[\w.-]+\.slatepack)$/;

/**
 * A request handler (Node's req/res, with next() for anything that isn't a data file). Options: the catalog's and the
 * cinemas' directories, the directory of mods it offers (optional), and a clock for tests.
 */
export function createCatalogHandler({ catalogDir, cinemasDir, packsDir = null, now = () => Date.now() }) {
  const cache = {};
  return function handle(req, res, next) {
    const mod = MODS.exec((req.url ?? '').split('?')[0]);
    if (mod) return serveMod(req, res, mod[1], packsDir, now());
    const m = PATH.exec((req.url ?? '').split('?')[0]);
    if (!m) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('allow', 'GET, HEAD'); res.end(); return; }
    const cinema = /^cinemas\/(.+)$/.exec(m[1]);
    const root = normalize(cinema ? cinemasDir : catalogDir);
    const json = (status, body, cacheControl) => {
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('cache-control', cacheControl);
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    // TMDB's content may be served only while it is within six months of being fetched; Wikidata's (CC0) has no limit.
    let expires = Infinity;
    if (!cinema) {
      const s = catalogState(root, now(), cache);
      if (s.state !== 'ready') return ENTRY.has(m[1]) ? json(200, JSON.stringify({ installed: false, reason: s.state }), 'no-cache') : json(404, '', 'no-cache');
      expires = s.expires;
    }
    const file = normalize(join(root, cinema ? cinema[1] : m[1]));
    const present = file.startsWith(root + sep) && existsSync(file) && statSync(file).isFile();
    if (!present) return ENTRY.has(m[1]) ? json(200, JSON.stringify({ installed: false, reason: 'missing' }), 'no-cache') : json(404, '', 'no-cache');
    // The entry files change with every build; a record may be kept an hour, and never past the catalog's expiry.
    const seconds = Math.max(0, Math.min(3600, Math.floor((expires - now()) / 1000)));
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', ENTRY.has(m[1]) ? 'no-cache' : `public, max-age=${seconds}`);
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).on('error', () => { if (!res.headersSent) res.statusCode = 500; res.end(); }).pipe(res);
  };
}

/** The mods listing, or one mod's file: only a file the listing offers, so nothing else in the directory is reachable. */
function serveMod(req, res, name, packsDir, now) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('allow', 'GET, HEAD'); res.end(); return; }
  const mods = offeredMods(packsDir, now);
  res.setHeader('x-content-type-options', 'nosniff');
  if (name === 'index.json') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-cache');
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ version: 1, mods }));
    return;
  }
  const mod = mods.find((m) => m.file === name);
  if (!mod) { res.statusCode = 404; res.setHeader('cache-control', 'no-cache'); res.end(); return; }
  res.statusCode = 200;
  res.setHeader('content-type', 'application/octet-stream');
  res.setHeader('content-length', String(mod.bytes));
  // Kept an hour at most, and never past a film pack's six months.
  const ends = mod.retrieved ? Date.parse(mod.retrieved.from) + MAX_AGE_DAYS * DAY : Infinity;
  res.setHeader('cache-control', `public, max-age=${Math.max(0, Math.min(3600, Math.floor((ends - now) / 1000)))}`);
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(join(packsDir, mod.file)).on('error', () => { if (!res.headersSent) res.statusCode = 500; res.end(); }).pipe(res);
}
