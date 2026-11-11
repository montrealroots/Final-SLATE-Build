// The production servers for SLATE_E2E_PROD=1 (playwright.config.ts): the built game served by server/serve.mjs, with no
// Vite in the path (November 11, 2026, docs/DEPLOYMENT.md).
// - Port 4175: the real data directories, which CI doesn't have, so the game runs there with no catalog, as a player's
//   would before one is installed.
// - Port 4176: the labelled made-up catalog (catalog-fixture.ts), written to disk and read through the server as a real
//   one would be: no request is intercepted (e2e/production-data.spec.ts).
// - Port 4177: the same catalog, gathered more than six months ago: withdrawn, as TMDB's terms require.
// - Port 4178: no data at all, and the fixture as the two mods it offers in Settings (e2e/data-packs.spec.ts).
// - Port 4179: the fixture catalog and mods, on a server that isn't the owner's own (no --owner): it serves no TMDB
//   data and offers the cinemas alone (the owner's decision, docs/DEPLOYMENT.md). Every other port is the owner's own.
// - Port 4180: the owner's own server with a passphrase, the fixture catalog and mods (e2e/owner-access.spec.ts). The
//   journey reaches it as a visitor from elsewhere would, and signs in. The passphrase is this fixture's, used nowhere else.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createSlateServer } from '../server/serve.mjs';
import { CATALOG_FIXTURE } from './catalog-fixture.ts';
import { writePack } from '../tools/pack-format.mjs';

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

/** The fixture as the two mods a server offers, in their own folder. */
function fixtureMods(): string {
  const dir = mkdtempSync(join(tmpdir(), 'slate-mods-'));
  const at = new Date(Date.now() - 86_400_000).toISOString();
  const entries = Object.entries(CATALOG_FIXTURE).map(([p, body]) => [p, JSON.stringify(p === 'index.json' ? { ...(body as object), retrieved: { from: at, to: at, maxAgeDays: 180 } } : body)] as [string, string]);
  writeFileSync(join(dir, 'slate-catalog.slatepack'), writePack({ kind: 'catalog', name: 'Films And Series', source: 'TMDB', builtAt: at, retrieved: { from: at, to: at, maxAgeDays: 180 } }, entries.filter(([p]) => !p.startsWith('cinemas/'))));
  writeFileSync(join(dir, 'slate-cinemas.slatepack'), writePack({ kind: 'cinemas', name: 'Cinemas', source: 'Wikidata (CC0)', builtAt: at }, entries.filter(([p]) => p.startsWith('cinemas/'))));
  return dir;
}

const listen = (port: number, o: { catalogDir: string; cinemasDir: string; packsDir?: string; films?: boolean; ownerSecret?: string }) => createSlateServer({ dist: 'dist', films: true, ...o }).listen(port);
listen(4175, { catalogDir: '.screen-catalog', cinemasDir: '.cinemas' });
listen(4176, fixtureDirs(new Date(Date.now() - 86_400_000).toISOString()));
listen(4177, fixtureDirs('2024-01-01T00:00:00.000Z'));
const nothing = mkdtempSync(join(tmpdir(), 'slate-none-'));
listen(4178, { catalogDir: nothing, cinemasDir: nothing, packsDir: fixtureMods() });
listen(4179, { ...fixtureDirs(new Date(Date.now() - 86_400_000).toISOString()), packsDir: fixtureMods(), films: false });
listen(4180, { ...fixtureDirs(new Date(Date.now() - 86_400_000).toISOString()), packsDir: fixtureMods(), ownerSecret: 'fixture passphrase for the journey' });
console.log('SLATE production servers on 4175 (real data), 4176 (fixture), 4177 (expired fixture), 4178 (no data, fixture mods), 4179 (not the owner\'s: no TMDB data), 4180 (the owner\'s, with a passphrase)');
