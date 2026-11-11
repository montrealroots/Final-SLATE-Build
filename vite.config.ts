import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createCatalogHandler } from './server/catalog-handler.mjs';

// The game's data files (the screen catalog from TMDB, the cinemas from Wikidata) are answered by the same handler the
// production server uses (server/serve.mjs, docs/DEPLOYMENT.md), so the dev and preview servers can't drift from it.
// Neither is ever copied into a build: the catalog stays on the machine that gathered it (TMDB's terms, docs/CATALOG.md).
function serveCatalog(): Plugin {
  const handler = createCatalogHandler({ catalogDir: join(process.cwd(), '.screen-catalog'), cinemasDir: join(process.cwd(), '.cinemas'), packsDir: join(process.cwd(), 'packs'), films: true }); // the dev server is the owner's own
  return { name: 'slate-screen-catalog', configureServer: (s) => { s.middlewares.use(handler); }, configurePreviewServer: (s) => { s.middlewares.use(handler); } };
}

export default defineConfig({
  plugins: [react(), serveCatalog()],
  // The catalog's cache and build hold hundreds of thousands of files read on request, not source: watching them ran the
  // machine out of file watchers (November 11, 2026), which stalled the dev server's first load of lazy pages.
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/.screen-catalog-cache/**', '**/.screen-catalog/**', '**/.screen-catalog.building/**', '**/.screen-catalog.old/**', '**/.cinemas-cache/**', '**/.cinemas/**'] } },
  build: {
    // World data is fetched when needed; never inline it into the startup bundle.
    assetsInlineLimit: (file: string) => (/\.(tsv|json)$/.test(file) ? false : undefined),
    rolldownOptions: {
      output: { advancedChunks: { groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }] } },
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', setupFiles: ['tests/setup.ts'] },
});
