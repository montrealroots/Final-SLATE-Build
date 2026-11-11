// The production servers for SLATE_E2E_PROD=1 (playwright.config.ts): the built game served by server/serve.mjs, with no
// Vite in the path (November 11, 2026, docs/DEPLOYMENT.md).
// - Port 4175: the real data directories, which CI doesn't have, so the game runs there with no catalog, as a player's
//   would before one is installed.
// - Port 4176: the labelled made-up catalog (catalog-fixture.ts), written to disk and read through the server as a real
//   one would be: no request is intercepted (e2e/production-data.spec.ts).
// - Port 4177: the same catalog, gathered more than six months ago: withdrawn, as TMDB's terms require.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createSlateServer } from '../server/serve.mjs';
import { CATALOG_FIXTURE } from './catalog-fixture.ts';

function fixtureDirs(retrieved: string): { catalogDir: string; cinemasDir: string } {
  const root = mkdtempSync(join(tmpdir(), 'slate-fixture-'));
  const catalogDir = join(root, 'catalog');
  const cinemasDir = join(root, 'cinemas');
  for (const [path, body] of Object.entries(CATALOG_FIXTURE)) {
    const cinema = /^cinemas\/(.+)$/.exec(path);
    const file = cinema ? join(cinemasDir, cinema[1]) : join(catalogDir, path);
    const value = path === 'index.json' ? { ...(body as object), retrieved: { from: retrieved, to: retrieved, maxAgeDays: 180 } } : body;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(value));
  }
  return { catalogDir, cinemasDir };
}

const listen = (port: number, o: { catalogDir: string; cinemasDir: string }) => createSlateServer({ dist: 'dist', ...o }).listen(port);
listen(4175, { catalogDir: '.screen-catalog', cinemasDir: '.cinemas' });
listen(4176, fixtureDirs(new Date(Date.now() - 86_400_000).toISOString()));
listen(4177, fixtureDirs('2024-01-01T00:00:00.000Z'));
console.log('SLATE production servers on 4175 (real data), 4176 (fixture), 4177 (expired fixture)');
