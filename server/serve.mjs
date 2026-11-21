// The production server (November 11, 2026, docs/DEPLOYMENT.md): the built game (dist/) and its data files, with no
// Vite in the path. Node 22, no dependencies.
//   npm run build && npm run serve
//   node server/serve.mjs [--port 8080] [--dist dist] [--catalog .screen-catalog] [--cinemas .cinemas] [--packs packs]
//                         [--owner] [--host 127.0.0.1] [--owner-secret-file <file>]
// Environment variables SLATE_PORT, SLATE_DIST, SLATE_CATALOG_DIR, SLATE_CINEMAS_DIR, SLATE_PACKS_DIR, SLATE_OWNER=1,
// SLATE_HOST and SLATE_OWNER_SECRET_FILE do the same. --owner says this server is the owner's own: only then does it
// serve TMDB's film data, the catalog and the film pack. The owner decided on November 11, 2026 that it goes to no other
// player (docs/DEPLOYMENT.md).
//
// The owner's server listens on this machine alone unless told otherwise, and answers the owner's data only to a
// request made on this machine. To use it from elsewhere, name a file holding the owner's passphrase
// (--owner-secret-file): the game then asks for it in Settings, and a request without a session gets no owner data.
// It won't start as the owner's own on another address without one.
// The packs directory holds the mods the game offers in Settings (docs/DATA-PACKS.md). It reads no
// credential and calls no outside service: the catalog is gathered and built separately (docs/CATALOG.md).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { MIN_SECRET, createCatalogHandler, isLoopback } from './catalog-handler.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.tsv', '.txt']);

/** A server for the built game at `dist` and its data. Returned unstarted, for tests and for the command line. */
export function createSlateServer({ dist, catalogDir, cinemasDir, packsDir = null, films = false, ownerSecret = null, now }) {
  const root = resolve(dist);
  const data = createCatalogHandler({ catalogDir: resolve(catalogDir), cinemasDir: resolve(cinemasDir), packsDir: packsDir && resolve(packsDir), films, ownerSecret, now });
  // A built file's gzip, kept with the bytes it was made from. Until November 11, 2026 it was kept by name alone, so a
  // build replaced under a running server went on sending the old page, pointing at code that was gone.
  const gz = new Map();
  const send = (req, res, file, cacheControl) => {
    const ext = extname(file);
    let body = readFileSync(file);
    res.setHeader('content-type', TYPES[ext] ?? 'application/octet-stream');
    res.setHeader('cache-control', cacheControl);
    res.setHeader('x-content-type-options', 'nosniff');
    if (COMPRESSIBLE.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '') && body.length > 1024) {
      const kept = gz.get(file);
      if (!kept || !kept.from.equals(body)) gz.set(file, { from: body, gz: gzipSync(body) });
      body = gz.get(file).gz;
      res.setHeader('content-encoding', 'gzip');
      res.setHeader('vary', 'accept-encoding');
    }
    res.setHeader('content-length', body.length);
    res.end(req.method === 'HEAD' ? undefined : body);
  };
  return createServer((req, res) => {
    data(req, res, () => {
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.statusCode = 405; res.end(); return; }
      let path;
      try { path = decodeURIComponent((req.url ?? '/').split('?')[0]); } catch { res.statusCode = 400; res.end(); return; }
      const file = normalize(join(root, path));
      if (file.startsWith(root + sep) && existsSync(file) && statSync(file).isFile()) {
        // Vite names built assets by their content, so they never change under the same name.
        return send(req, res, file, path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache');
      }
      // A missing asset is a 404; any other path is the game's page (it routes in the browser).
      if (path.startsWith('/assets/') || path.startsWith('/screen-catalog/') || extname(path)) { res.statusCode = 404; res.end(); return; }
      send(req, res, join(root, 'index.html'), 'no-cache');
    });
  });
}

/**
 * Where a server listens and what guards the owner's data, from how it was started. The owner's server listens on this
 * machine alone by default; on any other address it needs the owner's passphrase, or it doesn't start. A passphrase
 * shorter than MIN_SECRET is refused rather than trusted.
 */
export function ownerPlan({ films, host = null, secretFile = null }, read = (file) => readFileSync(file, 'utf8')) {
  let secret = null;
  if (films && secretFile) {
    try { secret = read(secretFile).trim(); } catch { return { host: undefined, secret: null, error: `The owner's passphrase file can't be read: ${secretFile}` }; }
    if (secret.length < MIN_SECRET) return { host: undefined, secret: null, error: `The owner's passphrase must be at least ${MIN_SECRET} characters. Nothing was started.` };
  }
  const local = !host || host === 'localhost' || isLoopback(host);
  if (films && !local && !secret) {
    return { host: undefined, secret: null, error: `The owner's server won't listen on ${host} without the owner's passphrase: anyone who reached it would get TMDB's data. Name a passphrase file with --owner-secret-file, or leave --host off to use it on this machine only.` };
  }
  // Other players' server listens everywhere, as before; the owner's on this machine unless told otherwise.
  return { host: host ?? (films ? '127.0.0.1' : undefined), secret };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, env, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : process.env[env] ?? fallback; };
  const dist = arg('dist', 'SLATE_DIST', 'dist');
  if (!existsSync(join(dist, 'index.html'))) { console.error(`No built game at ${dist}: run npm run build first.`); process.exit(1); }
  const port = Number(arg('port', 'SLATE_PORT', '8080'));
  const films = process.argv.includes('--owner') || process.env.SLATE_OWNER === '1';
  const plan = ownerPlan({ films, host: arg('host', 'SLATE_HOST', null), secretFile: arg('owner-secret-file', 'SLATE_OWNER_SECRET_FILE', null) });
  if (plan.error) { console.error(plan.error); process.exit(1); }
  const server = createSlateServer({ dist, catalogDir: arg('catalog', 'SLATE_CATALOG_DIR', '.screen-catalog'), cinemasDir: arg('cinemas', 'SLATE_CINEMAS_DIR', '.cinemas'), packsDir: arg('packs', 'SLATE_PACKS_DIR', 'packs'), films, ownerSecret: plan.secret });
  const who = !films ? ', without TMDB\'s film data (--owner serves it)'
    : `, the owner's own: TMDB's film data is served to this machine${plan.secret ? ', and elsewhere after the owner signs in' : ' only'}`;
  server.listen(port, plan.host, () => console.log(`SLATE on http://${plan.host ?? 'localhost'}:${port}${who}`));
}
