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
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
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
export function offeredMods(packsDir, now = Date.now(), films = true) {
  if (!packsDir || !existsSync(packsDir)) return [];
  return readdirSync(packsDir).filter((f) => f.endsWith('.slatepack')).sort().flatMap((file) => {
    const h = readPackHeader(join(packsDir, file));
    if (!h || h.format !== 1 || (h.kind !== 'catalog' && h.kind !== 'cinemas' && h.kind !== 'images')) return [];
    // The pictures are TMDB's too: offered to the owner alone, and never past the same six months.
    const tmdb = h.kind === 'catalog' || h.kind === 'images';
    if (tmdb && !films) return [];
    if (tmdb && !(Date.parse(h.retrieved?.from) + MAX_AGE_DAYS * DAY > now)) return [];
    return [{ file, kind: h.kind, name: h.name, source: h.source, builtAt: h.builtAt, ...(h.retrieved ? { retrieved: h.retrieved } : {}), files: h.files, bytes: statSync(join(packsDir, file)).size }];
  });
}
const MODS = /^\/mods\/(index\.json|[\w.-]+\.slatepack)$/;

/**
 * The whole catalog's pictures (November 12, 2026, docs/DATA-PACKS.md): `packsDir/pictures/index.json`, written by
 * `tools/screen-catalog/pictures.mjs pack`, lists a pack for each shard with its size and SHA-256. They are TMDB's:
 * offered to the owner alone, and not at all once six months have passed since the earliest picture was fetched.
 * Null when there is nothing to offer this request, whatever the reason, so a stranger learns nothing from the answer.
 */
export function offeredPictures(packsDir, now = Date.now(), films = true) {
  const f = packsDir ? join(packsDir, 'pictures', 'index.json') : null;
  if (!films || !f || !existsSync(f)) return null;
  let index;
  try { index = JSON.parse(readFileSync(f, 'utf8')); } catch { return null; }
  if (index?.version !== 1 || !index.kinds || !(Date.parse(index.retrieved?.from) + MAX_AGE_DAYS * DAY > now)) return null;
  return index;
}
const PICTURES = /^\/mods\/pictures\/(index\.json|[\w-]+\.slatepack)$/;

// ---------- who may have the owner's data (November 11, 2026, docs/DEPLOYMENT.md, "Who Gets The Owner's Data") ----------
//
// Until now `films` alone decided: a server started with --owner answered anyone who could reach its port. A flag isn't
// a check on who is asking. Now each request is checked:
// - a request made on this machine (a loopback connection, a loopback Host, nothing forwarded) is the owner's;
// - any other request is the owner's only with a session, given after the owner's passphrase is presented;
// - a server with no passphrase configured gives nobody but this machine the owner's data.
// The passphrase is the owner's own, read from a file they name when starting the server. None is built in.

const LOOPBACK_HOST = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?$/i;
const FORWARDED = ['forwarded', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'x-real-ip', 'via'];
/** Whether an address is this machine's own. */
export const isLoopback = (address) => !!address && (address === '::1' || /^127\./.test(address) || /^::ffff:127\./i.test(address));
/**
 * Whether a request was made on this machine: a loopback connection, asked of a loopback name (so a page elsewhere
 * can't reach it by pointing its own name here), and not passed on by a proxy (which connects from this machine on
 * someone else's behalf).
 */
export function isLocalRequest(req) {
  return isLoopback(req.socket?.remoteAddress) && LOOPBACK_HOST.test(req.headers.host ?? '') && !FORWARDED.some((h) => req.headers[h] !== undefined);
}

/** Whether a request came over HTTPS: to this server directly, or to a proxy in front of it that says so. */
export const isHttps = (req) => !!req?.socket?.encrypted || String(req?.headers?.['x-forwarded-proto'] ?? '').split(',')[0].trim() === 'https';

const SESSION_HOURS = 12;
const COOKIE = 'slate_owner';
const digest = (s) => createHash('sha256').update(s).digest();
/** The shortest passphrase the server accepts: shorter ones are guessed too easily to guard anything. */
export const MIN_SECRET = 16;

/**
 * The gate every owner route asks. `secret` is the owner's passphrase, or null when none is configured. Sessions are
 * kept in memory, so they end when the server stops. Wrong passphrases are slowed: after five, sign-in is refused for
 * a minute, doubling to fifteen.
 */
export function createOwnerGate({ films = false, secret = null, now = () => Date.now() } = {}) {
  const sessions = new Map();
  const want = secret ? digest(secret) : null;
  let failures = 0;
  let lockedUntil = 0;
  const cookieOf = (req) => new RegExp(`(?:^|;\\s*)${COOKIE}=([0-9a-f]{64})(?:;|$)`).exec(req.headers.cookie ?? '')?.[1];
  const signedIn = (req) => {
    const id = cookieOf(req);
    const ends = id ? sessions.get(id) : undefined;
    if (ends === undefined) return false;
    if (now() >= ends) { sessions.delete(id); return false; }
    return true;
  };
  return {
    /** Whether this request may have the owner's data. */
    allows: (req) => films && (isLocalRequest(req) || signedIn(req)),
    /**
     * For the game's Settings: whether sign-in is offered here, whether this request is already the owner's, and whether
     * it is the owner's own server reached from another device with no passphrase configured, so nothing could sign in
     * (`elsewhere`: until November 13, 2026 that device was told nothing, and the owner's phone showed no pictures).
     */
    status: (req) => ({ owner: films && (isLocalRequest(req) || signedIn(req)), signIn: films && !!want && !isLocalRequest(req), elsewhere: films && !want && !isLocalRequest(req) }),
    /** Present the passphrase. Returns a session ID on success, or why not: 'unavailable', 'locked', 'wrong'. */
    signIn(presented) {
      if (!films || !want) return { ok: false, reason: 'unavailable' };
      if (now() < lockedUntil) return { ok: false, reason: 'locked', retryAfter: Math.ceil((lockedUntil - now()) / 1000) };
      if (typeof presented !== 'string' || !timingSafeEqual(digest(presented), want)) {
        failures += 1;
        if (failures >= 5) lockedUntil = now() + Math.min(15, 2 ** (failures - 5)) * 60_000;
        return { ok: false, reason: 'wrong' };
      }
      failures = 0;
      for (const [id, ends] of sessions) if (now() >= ends) sessions.delete(id);
      const id = randomBytes(32).toString('hex');
      sessions.set(id, now() + SESSION_HOURS * 3_600_000);
      return { ok: true, id };
    },
    signOut(req) { const id = cookieOf(req); if (id) sessions.delete(id); },
    // Secure only where the page came over HTTPS: a browser keeps no Secure cookie from a plain-http address, so until
    // November 13, 2026 the owner's phone on their own network signed in and was forgotten at once.
    cookie: (id, req) => `${COOKIE}=${id}; HttpOnly;${isHttps(req) ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`,
    expiredCookie: (req) => `${COOKIE}=; HttpOnly;${isHttps(req) ? ' Secure;' : ''} SameSite=Strict; Path=/; Max-Age=0`,
  };
}

const SESSION = /^\/owner\/session$/;
/** The sign-in route: GET says what is offered, POST {passphrase} signs in, DELETE signs out. Never cached. */
function serveSession(req, res, gate) {
  res.setHeader('cache-control', 'no-store');
  res.setHeader('x-content-type-options', 'nosniff');
  const json = (status, body) => { res.statusCode = status; res.setHeader('content-type', 'application/json'); res.end(req.method === 'HEAD' ? undefined : JSON.stringify(body)); };
  if (req.method === 'GET' || req.method === 'HEAD') return json(200, gate.status(req));
  if (req.method === 'DELETE') { gate.signOut(req); res.setHeader('set-cookie', gate.expiredCookie(req)); return json(200, gate.status(req)); }
  if (req.method !== 'POST') { res.setHeader('allow', 'GET, HEAD, POST, DELETE'); return json(405, {}); }
  // Only the game's own page signs in: a form on another site can't send JSON without asking first.
  if (!/^application\/json\b/.test(req.headers['content-type'] ?? '')) return json(415, {});
  const parts = [];
  let size = 0;
  req.on('data', (c) => { size += c.length; if (size > 4096) req.destroy(); else parts.push(c); });
  req.on('end', () => {
    let passphrase;
    try { passphrase = JSON.parse(Buffer.concat(parts).toString('utf8')).passphrase; } catch { return json(400, {}); }
    const r = gate.signIn(passphrase);
    if (r.ok) { res.setHeader('set-cookie', gate.cookie(r.id, req)); return json(200, { owner: true, signIn: true, elsewhere: false }); }
    if (r.reason === 'locked') res.setHeader('retry-after', String(r.retryAfter));
    return json(r.reason === 'locked' ? 429 : r.reason === 'unavailable' ? 404 : 401, { owner: false, reason: r.reason });
  });
}


/**
 * A request handler (Node's req/res, with next() for anything that isn't a data file). Options: the catalog's and the
 * cinemas' directories, the directory of mods it offers (optional), whether it is the owner's own server, the owner's
 * passphrase (optional), and a clock for tests.
 *
 * `films`: the owner decided on November 11, 2026 that TMDB's data goes to no player but the owner ("I will NOT").
 * A server serves the film catalog and offers the film pack only when it is the owner's own (`--owner` in serve.mjs),
 * and then only to a request the gate above allows. Any other request is answered as if no catalog were there, and is
 * offered the cinemas alone.
 */
export function createCatalogHandler({ catalogDir, cinemasDir, packsDir = null, films = false, ownerSecret = null, now = () => Date.now() }) {
  const cache = {};
  const gate = createOwnerGate({ films, secret: ownerSecret, now });
  return function handle(req, res, next) {
    const url = (req.url ?? '').split('?')[0];
    if (SESSION.test(url)) return serveSession(req, res, gate);
    const pic = PICTURES.exec(url);
    if (pic) return servePictures(req, res, pic[1], packsDir, now(), gate.allows(req));
    const mod = MODS.exec(url);
    if (mod) return serveMod(req, res, mod[1], packsDir, now(), gate.allows(req));
    const m = PATH.exec(url);
    if (!m) return next();
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('allow', 'GET, HEAD'); res.end(); return; }
    const cinema = /^cinemas\/(.+)$/.exec(m[1]);
    const root = normalize(cinema ? cinemasDir : catalogDir);
    const json = (status, body, cacheControl) => {
      res.statusCode = status;
      res.setHeader('content-type', 'application/json');
      res.setHeader('x-content-type-options', 'nosniff');
      res.setHeader('cache-control', cacheControl);
      // What a film route answers depends on who asks, so nothing between here and the browser may share it.
      if (!cinema) res.setHeader('vary', 'cookie');
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    // TMDB's content may be served only while it is within six months of being fetched; Wikidata's (CC0) has no limit.
    let expires = Infinity;
    if (!cinema) {
      const s = gate.allows(req) ? catalogState(root, now(), cache) : { state: 'missing' };
      if (s.state !== 'ready') return ENTRY.has(m[1]) ? json(200, JSON.stringify({ installed: false, reason: s.state }), 'no-cache') : json(404, '', 'no-cache');
      expires = s.expires;
    }
    const file = normalize(join(root, cinema ? cinema[1] : m[1]));
    const present = file.startsWith(root + sep) && existsSync(file) && statSync(file).isFile();
    if (!present) return ENTRY.has(m[1]) ? json(200, JSON.stringify({ installed: false, reason: 'missing' }), 'no-cache') : json(404, '', 'no-cache');
    // The entry files change with every build; a record may be kept an hour, and never past the catalog's expiry. The
    // owner's records are kept by the owner's browser alone ("private"), never by a cache in between.
    const seconds = Math.max(0, Math.min(3600, Math.floor((expires - now()) / 1000)));
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('cache-control', ENTRY.has(m[1]) ? 'no-cache' : `${cinema ? 'public' : 'private'}, max-age=${seconds}`);
    if (!cinema) res.setHeader('vary', 'cookie');
    if (req.method === 'HEAD') { res.end(); return; }
    createReadStream(file).on('error', () => { if (!res.headersSent) res.statusCode = 500; res.end(); }).pipe(res);
  };
}

/** The mods listing, or one mod's file: only a file the listing offers, so nothing else in the directory is reachable. */
function serveMod(req, res, name, packsDir, now, films) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('allow', 'GET, HEAD'); res.end(); return; }
  const mods = offeredMods(packsDir, now, films);
  res.setHeader('x-content-type-options', 'nosniff');
  // The listing and a film pack depend on who asks.
  res.setHeader('vary', 'cookie');
  if (name === 'index.json') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-cache');
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify({ version: 1, mods }));
    return;
  }
  const mod = mods.find((m) => m.file === name);
  if (!mod) { res.statusCode = 404; res.setHeader('cache-control', 'no-cache'); res.end(); return; }
  sendPack(req, res, join(packsDir, mod.file), mod, now);
}

/** The pictures' listing, or one of its packs: only a file the listing names. With nothing to offer, an empty listing. */
function servePictures(req, res, name, packsDir, now, films) {
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.setHeader('allow', 'GET, HEAD'); res.end(); return; }
  const index = offeredPictures(packsDir, now, films);
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('vary', 'cookie');
  if (name === 'index.json') {
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.setHeader('cache-control', 'no-cache');
    res.end(req.method === 'HEAD' ? undefined : JSON.stringify(index ?? { version: 1, kinds: {} }));
    return;
  }
  const shard = index && Object.values(index.kinds).flatMap((k) => k.shards).find((x) => x.file === name);
  const path = shard ? join(packsDir, 'pictures', shard.file) : null;
  if (!path || !existsSync(path)) { res.statusCode = 404; res.setHeader('cache-control', 'no-cache'); res.end(); return; }
  sendPack(req, res, path, { kind: 'pictures', bytes: statSync(path).size, retrieved: index.retrieved }, now);
}

/** A pack's bytes, whole or from where a download stopped. */
function sendPack(req, res, path, mod, now) {
  // A download cut off part-way asks for the rest ("Range: bytes=N-"); nothing else about ranges is supported.
  res.setHeader('accept-ranges', 'bytes');
  const range = /^bytes=(\d+)-$/.exec(String(req.headers.range ?? ''));
  const from = range ? Number(range[1]) : 0;
  if (range && from >= mod.bytes) { res.statusCode = 416; res.setHeader('content-range', `bytes */${mod.bytes}`); res.setHeader('cache-control', 'no-cache'); res.end(); return; }
  res.statusCode = range ? 206 : 200;
  res.setHeader('content-type', 'application/octet-stream');
  res.setHeader('content-length', String(mod.bytes - from));
  if (range) res.setHeader('content-range', `bytes ${from}-${mod.bytes - 1}/${mod.bytes}`);
  // Kept an hour at most, and never past a film or picture pack's six months.
  const ends = mod.retrieved ? Date.parse(mod.retrieved.from) + MAX_AGE_DAYS * DAY : Infinity;
  res.setHeader('cache-control', `${mod.kind === 'cinemas' ? 'public' : 'private'}, max-age=${Math.max(0, Math.min(3600, Math.floor((ends - now) / 1000)))}`);
  if (req.method === 'HEAD') { res.end(); return; }
  createReadStream(path, { start: from }).on('error', () => { if (!res.headersSent) res.statusCode = 500; res.end(); }).pipe(res);
}
