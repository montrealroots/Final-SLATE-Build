// The production server (November 11, 2026, docs/DEPLOYMENT.md): the built game (dist/) and its data files, with no
// Vite in the path. Node 22, no dependencies.
//   npm run build && npm run serve
//   node server/serve.mjs [--port 8080] [--dist dist] [--catalog .screen-catalog] [--cinemas .cinemas] [--packs packs] [--owner]
// Environment variables SLATE_PORT, SLATE_DIST, SLATE_CATALOG_DIR, SLATE_CINEMAS_DIR, SLATE_PACKS_DIR and SLATE_OWNER=1
// do the same. --owner says this server is the owner's own: only then does it serve TMDB's film data, the catalog and
// the film pack. The owner decided on November 11, 2026 that it goes to no other player (docs/DEPLOYMENT.md).
// The packs directory holds the mods the game offers in Settings (docs/DATA-PACKS.md). It reads no
// credential and calls no outside service: the catalog is gathered and built separately (docs/CATALOG.md).
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createCatalogHandler } from './catalog-handler.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.tsv': 'text/tab-separated-values; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.tsv', '.txt']);

/** A server for the built game at `dist` and its data. Returned unstarted, for tests and for the command line. */
export function createSlateServer({ dist, catalogDir, cinemasDir, packsDir = null, films = false, now }) {
  const root = resolve(dist);
  const data = createCatalogHandler({ catalogDir: resolve(catalogDir), cinemasDir: resolve(cinemasDir), packsDir: packsDir && resolve(packsDir), films, now });
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

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name, env, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : process.env[env] ?? fallback; };
  const dist = arg('dist', 'SLATE_DIST', 'dist');
  if (!existsSync(join(dist, 'index.html'))) { console.error(`No built game at ${dist}: run npm run build first.`); process.exit(1); }
  const port = Number(arg('port', 'SLATE_PORT', '8080'));
  const films = process.argv.includes('--owner') || process.env.SLATE_OWNER === '1';
  const server = createSlateServer({ dist, catalogDir: arg('catalog', 'SLATE_CATALOG_DIR', '.screen-catalog'), cinemasDir: arg('cinemas', 'SLATE_CINEMAS_DIR', '.cinemas'), packsDir: arg('packs', 'SLATE_PACKS_DIR', 'packs'), films });
  server.listen(port, () => console.log(`SLATE on http://localhost:${port}${films ? ', the owner\'s own: TMDB\'s film data is served' : ', without TMDB\'s film data (--owner serves it)'}`));
}
