import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, normalize } from 'node:path';
import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

// The screen catalog (docs/CATALOG.md) is built from TMDB into .screen-catalog/, which git ignores. It is served to the
// dev and preview servers on this machine only and never copied into a build: TMDB's terms allow caching for six months
// and not redistribution, and whether it may be deployed hasn't been settled.
const CATALOG = join(process.cwd(), '.screen-catalog');
function serveCatalog(): Plugin {
  const handler: Connect.NextHandleFunction = (req, res, next) => {
    const m = /^\/screen-catalog\/([\w./-]+\.json)$/.exec((req.url ?? '').split('?')[0]);
    if (!m) return next();
    const file = normalize(join(CATALOG, m[1]));
    // No catalog installed: say so in the index, a normal answer, rather than as a failed request.
    if (m[1] === 'index.json' && !existsSync(file)) { res.setHeader('content-type', 'application/json'); res.end('{"installed":false}'); return; }
    if (!file.startsWith(CATALOG + '/') || !existsSync(file) || !statSync(file).isFile()) { res.statusCode = 404; res.end(); return; }
    res.setHeader('content-type', 'application/json');
    createReadStream(file).pipe(res);
  };
  return { name: 'slate-screen-catalog', configureServer: (s) => { s.middlewares.use(handler); }, configurePreviewServer: (s) => { s.middlewares.use(handler); } };
}

export default defineConfig({
  plugins: [react(), serveCatalog()],
  server: { port: 5173, strictPort: true },
  build: {
    // World data is fetched when needed; never inline it into the startup bundle.
    assetsInlineLimit: (file: string) => (/\.(tsv|json)$/.test(file) ? false : undefined),
    rolldownOptions: {
      output: { advancedChunks: { groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }] } },
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', setupFiles: ['tests/setup.ts'] },
});
