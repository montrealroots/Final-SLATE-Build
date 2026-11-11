// The production server (server/serve.mjs, server/catalog-handler.mjs, docs/DEPLOYMENT.md): the built game and its data
// files with no Vite in the path. Run against made-up files in temporary directories; no real catalog is used.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSlateServer } from '../server/serve.mjs';
import { MAX_AGE_DAYS } from '../server/catalog-handler.mjs';
import { writePack } from '../tools/pack-format.mjs';

const DAY = 86_400_000;
const RETRIEVED = '2026-11-10T12:00:00.000Z';
const root = mkdtempSync(join(tmpdir(), 'slate-server-'));
const dist = join(root, 'dist');
const write = (file: string, body: string) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, body); };

function catalog(name: string, index: string | null): string {
  const dir = join(root, name);
  mkdirSync(join(dir, 'titles'), { recursive: true });
  if (index !== null) write(join(dir, 'index.json'), index);
  write(join(dir, 'titles/movie-1.json'), JSON.stringify({ ref: 'movie:1', title: 'Fixture' }));
  write(join(dir, 'world.json'), JSON.stringify({ version: 1, events: [] }));
  return dir;
}
const good = JSON.stringify({ version: 1, retrieved: { from: RETRIEVED, to: RETRIEVED, maxAgeDays: 180 } });

type Reply = { status: number; headers: Record<string, string | string[] | undefined>; body: Buffer };
async function get(port: number, path: string, o: { method?: string; gzip?: boolean } = {}): Promise<Reply> {
  return new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, method: o.method ?? 'GET', headers: o.gzip ? { 'accept-encoding': 'gzip' } : {} }, (res) => {
      const parts: Buffer[] = [];
      res.on('data', (c) => parts.push(c)).on('end', () => done({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(parts) }));
    });
    req.on('error', fail).end();
  });
}
async function start(catalogDir: string, now = () => Date.parse('2026-11-11T12:00:00Z'), packsDir: string | null = null): Promise<{ port: number; close: () => void }> {
  const server = createSlateServer({ dist, catalogDir, cinemasDir: join(root, 'cinemas'), packsDir, now });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  return { port: (server.address() as AddressInfo).port, close: () => server.close() };
}
const json = (r: Reply) => JSON.parse(r.body.toString());

beforeAll(() => {
  write(join(dist, 'index.html'), `<!doctype html><title>SLATE</title>${'<!-- padding -->'.repeat(100)}`);
  write(join(dist, 'assets/app-abc123.js'), `console.log(${JSON.stringify('x'.repeat(4000))});`);
  write(join(root, 'cinemas/index.json'), JSON.stringify({ countries: [{ code: 'GB', cinemas: 1 }] }));
  write(join(root, 'cinemas/GB.json'), JSON.stringify([{ id: 'Q1' }]));
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

describe('the built game', () => {
  it('serves the page for any route, built assets as immutable and compressed, and a missing asset as 404', async () => {
    const s = await start(catalog('ok-game', good));
    try {
      const page = await get(s.port, '/companies');
      expect([page.status, page.headers['content-type'], page.headers['cache-control']]).toEqual([200, 'text/html; charset=utf-8', 'no-cache']);
      const asset = await get(s.port, '/assets/app-abc123.js', { gzip: true });
      expect([asset.status, asset.headers['content-encoding'], asset.headers['cache-control']]).toEqual([200, 'gzip', 'public, max-age=31536000, immutable']);
      expect(gunzipSync(asset.body).toString()).toContain('console.log');
      expect((await get(s.port, '/assets/gone-1.js')).status).toBe(404);
      expect((await get(s.port, '/companies', { method: 'POST' })).status).toBe(405);
      expect((await get(s.port, '/../package.json')).status).not.toBe(200);
      // A build replaced while the server runs is served as it is now, compressed or not.
      expect(gunzipSync((await get(s.port, '/', { gzip: true })).body).toString()).not.toContain('SLATE rebuilt');
      write(join(dist, 'index.html'), `<!doctype html><title>SLATE rebuilt</title>${'<!-- padding -->'.repeat(100)}`);
      expect(gunzipSync((await get(s.port, '/', { gzip: true })).body).toString()).toContain('SLATE rebuilt');
    } finally { s.close(); }
  });
});

describe('the catalog, served by the production server', () => {
  it('answers each record on request, kept at most an hour, and a record that isn\'t there as 404', async () => {
    const s = await start(catalog('ok', good));
    try {
      const index = await get(s.port, '/screen-catalog/index.json');
      expect([index.status, index.headers['cache-control'], json(index).version]).toEqual([200, 'no-cache', 1]);
      const title = await get(s.port, '/screen-catalog/titles/movie-1.json');
      expect([title.status, title.headers['content-type'], title.headers['cache-control'], json(title).title]).toEqual([200, 'application/json', 'public, max-age=3600', 'Fixture']);
      expect((await get(s.port, '/screen-catalog/titles/movie-2.json')).status).toBe(404);
      expect(json(await get(s.port, '/screen-catalog/theatrical.json'))).toEqual({ installed: false, reason: 'missing' });
      // Outside the catalog's directory is never reached.
      expect((await get(s.port, '/screen-catalog/../ok-game/index.json')).status).toBe(404);
      expect((await get(s.port, '/screen-catalog/titles/movie-1.json', { method: 'DELETE' })).status).toBe(405);
      // The cinemas (Wikidata) are answered beside it.
      expect(json(await get(s.port, '/screen-catalog/cinemas/GB.json'))).toEqual([{ id: 'Q1' }]);
    } finally { s.close(); }
  });

  it('says the catalog isn\'t installed, and why, when there is none, when its index is unreadable, or when it is past six months', async () => {
    const cases: [string, string | null, string][] = [['none', null, 'missing'], ['bad-json', '{"version":1,', 'malformed'], ['bad-shape', '{"version":1}', 'malformed']];
    for (const [name, index, reason] of cases) {
      const s = await start(catalog(name, index));
      try {
        expect(json(await get(s.port, '/screen-catalog/index.json'))).toEqual({ installed: false, reason });
        expect(json(await get(s.port, '/screen-catalog/world.json'))).toEqual({ installed: false, reason });
        expect((await get(s.port, '/screen-catalog/titles/movie-1.json')).status).toBe(404); // nothing is served from it
      } finally { s.close(); }
    }
    // TMDB's six months, from the oldest response in the build: the day before, served with what is left of it; then withdrawn.
    const expires = Date.parse(RETRIEVED) + MAX_AGE_DAYS * DAY;
    const before = await start(catalog('ageing', good), () => expires - 1800_000);
    try { expect((await get(before.port, '/screen-catalog/titles/movie-1.json')).headers['cache-control']).toBe('public, max-age=1800'); } finally { before.close(); }
    const after = await start(catalog('expired', good), () => expires);
    try {
      expect(json(await get(after.port, '/screen-catalog/index.json'))).toEqual({ installed: false, reason: 'expired' });
      expect((await get(after.port, '/screen-catalog/titles/movie-1.json')).status).toBe(404);
      expect((await get(after.port, '/screen-catalog/cinemas/GB.json')).status).toBe(200); // Wikidata's has no such limit
    } finally { after.close(); }
  });

  it('holds no credential and calls no outside service', () => {
    for (const f of ['server/serve.mjs', 'server/catalog-handler.mjs']) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/api_key|Bearer\s|TMDB_|themoviedb\.org|fetch\(|https?\.request|process\.env\.[A-Z_]*(KEY|TOKEN|SECRET)/);
    }
  });
});

describe('the mods the game offers', () => {
  it('lists each pack from its header, serves only what it lists, and never a film pack past six months', async () => {
    const packs = join(root, 'packs');
    const film = (from: string) => writePack({ kind: 'catalog', name: 'Films And Series', source: 'TMDB', builtAt: from, retrieved: { from, to: from, maxAgeDays: 180 } }, [['index.json', '{"version":1}'], ['titles/movie-1.json', '{"title":"Fixture"}']]);
    write(join(packs, 'films.slatepack'), '');
    writeFileSync(join(packs, 'films.slatepack'), film(RETRIEVED));
    writeFileSync(join(packs, 'old-films.slatepack'), film('2026-01-01T00:00:00.000Z'));
    writeFileSync(join(packs, 'cinemas.slatepack'), writePack({ kind: 'cinemas', name: 'Cinemas', source: 'Wikidata (CC0)', builtAt: RETRIEVED }, [['cinemas/index.json', '{}']]));
    writeFileSync(join(packs, 'notes.slatepack'), 'not a pack');
    writeFileSync(join(packs, 'secret.txt'), 'kept here');
    const s = await start(catalog('mods', null), undefined, packs);
    try {
      const list = json(await get(s.port, '/mods/index.json'));
      expect(list.mods.map((m: { file: string; kind: string; files: number }) => [m.file, m.kind, m.files])).toEqual([['cinemas.slatepack', 'cinemas', 1], ['films.slatepack', 'catalog', 2]]);
      const file = await get(s.port, '/mods/films.slatepack');
      expect([file.status, file.headers['content-type'], file.headers['cache-control']]).toEqual([200, 'application/octet-stream', 'public, max-age=3600']);
      expect(file.body.equals(readFileSync(join(packs, 'films.slatepack')))).toBe(true);
      for (const path of ['/mods/old-films.slatepack', '/mods/notes.slatepack', '/mods/secret.txt', '/mods/../packs/films.slatepack']) expect((await get(s.port, path)).status, path).not.toBe(200);
      expect((await get(s.port, '/mods/films.slatepack', { method: 'POST' })).status).toBe(405);
    } finally { s.close(); }
    // A server with no packs offers none.
    const bare = await start(catalog('bare', null));
    try { expect(json(await get(bare.port, '/mods/index.json'))).toEqual({ version: 1, mods: [] }); } finally { bare.close(); }
  });
});
