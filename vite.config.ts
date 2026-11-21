import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { createCatalogHandler } from './server/catalog-handler.mjs';
import { ownerPlan } from './server/serve.mjs';

// The game's data files (the screen catalog from TMDB, the cinemas from Wikidata) are answered by the same handler the
// production server uses (server/serve.mjs, docs/DEPLOYMENT.md), so the dev and preview servers can't drift from it.
// The catalog is never copied into a build: it stays on the machine that gathered it (TMDB's terms, docs/CATALOG.md).
// Until November 21, 2026 the cinemas weren't either. They (CC0) now ship in public/, so a copy built from the repository
// alone, as Base44's is, has them; a fresher .cinemas/ built here answers instead.
//
// The dev server is the owner's own, and answers this machine. To use it from a phone on the same network (npm run dev
// -- --host), name the owner's passphrase file in SLATE_OWNER_SECRET_FILE, as for the production server: the phone then
// signs in under Settings, Mods. Until November 13, 2026 the dev server read no passphrase, so a phone could never sign
// in and was shown no pictures to install.
function serveCatalog(): Plugin {
  const plan = ownerPlan({ films: true, secretFile: process.env.SLATE_OWNER_SECRET_FILE ?? null });
  if (plan.error) throw new Error(plan.error);
  const handler = createCatalogHandler({ catalogDir: join(process.cwd(), '.screen-catalog'), cinemasDir: join(process.cwd(), existsSync('.cinemas') ? '.cinemas' : 'public/screen-catalog/cinemas'), packsDir: join(process.cwd(), 'packs'), films: true, ownerSecret: plan.secret });
  return { name: 'slate-screen-catalog', configureServer: (s) => { s.middlewares.use(handler); }, configurePreviewServer: (s) => { s.middlewares.use(handler); } };
}

export default defineConfig({
  plugins: [react(), serveCatalog()],
  // The catalog's cache and build hold hundreds of thousands of files read on request, not source: watching them ran the
  // machine out of file watchers (November 11, 2026), which stalled the dev server's first load of lazy pages.
  server: { port: 5173, strictPort: true, watch: { ignored: ['**/.screen-catalog-cache/**', '**/.screen-catalog/**', '**/.screen-catalog.building/**', '**/.screen-catalog.old/**', '**/.cinemas-cache/**', '**/.cinemas/**', '**/.screen-images/**', '**/packs/**'] } },
  build: {
    // World data is fetched when needed; never inline it into the startup bundle.
    assetsInlineLimit: (file: string) => (/\.(tsv|json)$/.test(file) ? false : undefined),
    // A lazy page's code is fetched by its import, not preloaded by a link (its CSS still is). Until November 21, 2026
    // Vite preloaded it with <link rel=modulepreload>; WebKit kept a preload that failed offline in its memory cache, so
    // in CI (twice on run 44858536421) Reload The Game, back online, was handed the failed copy without asking the
    // network, and the page still couldn't load. The startup page's own preloads, which load online, stay.
    modulePreload: { resolveDependencies: (_file: string, deps: string[], { hostType }: { hostType: 'html' | 'js' }) => (hostType === 'html' ? deps : []) },
    rolldownOptions: {
      output: { advancedChunks: { groups: [{ name: 'react', test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/ }] } },
    },
  },
  test: { include: ['tests/**/*.test.ts'], environment: 'node', setupFiles: ['tests/setup.ts'] },
});
