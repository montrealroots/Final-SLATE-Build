// The production server (server/serve.mjs, server/catalog-handler.mjs, docs/DEPLOYMENT.md): the built game and its data
// files with no Vite in the path. Run against made-up files in temporary directories; no real catalog is used.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { request } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSlateServer, ownerPlan } from '../server/serve.mjs';
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
async function get(port: number, path: string, o: { method?: string; gzip?: boolean; headers?: Record<string, string>; body?: string } = {}): Promise<Reply> {
  return new Promise((done, fail) => {
    const req = request({ host: '127.0.0.1', port, path, method: o.method ?? 'GET', headers: { ...(o.gzip ? { 'accept-encoding': 'gzip' } : {}), ...o.headers } }, (res) => {
      const parts: Buffer[] = [];
      res.on('data', (c) => parts.push(c)).on('end', () => done({ status: res.statusCode!, headers: res.headers, body: Buffer.concat(parts) }));
    });
    req.on('error', fail).end(o.body);
  });
}
// The owner's own server (--owner) unless `films` is false.
async function start(catalogDir: string, now = () => Date.parse('2026-11-11T12:00:00Z'), packsDir: string | null = null, films = true, ownerSecret: string | null = null): Promise<{ port: number; close: () => void }> {
  const server = createSlateServer({ dist, catalogDir, cinemasDir: join(root, 'cinemas'), packsDir, films, ownerSecret, now });
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
      expect([title.status, title.headers['content-type'], title.headers['cache-control'], json(title).title]).toEqual([200, 'application/json', 'private, max-age=3600', 'Fixture']);
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
    try { expect((await get(before.port, '/screen-catalog/titles/movie-1.json')).headers['cache-control']).toBe('private, max-age=1800'); } finally { before.close(); }
    const after = await start(catalog('expired', good), () => expires);
    try {
      expect(json(await get(after.port, '/screen-catalog/index.json'))).toEqual({ installed: false, reason: 'expired' });
      expect((await get(after.port, '/screen-catalog/titles/movie-1.json')).status).toBe(404);
      expect((await get(after.port, '/screen-catalog/cinemas/GB.json')).status).toBe(200); // Wikidata's has no such limit
    } finally { after.close(); }
  });

  it('holds no TMDB credential and calls no outside service', () => {
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
      expect([file.status, file.headers['content-type'], file.headers['cache-control']]).toEqual([200, 'application/octet-stream', 'private, max-age=3600']);
      expect(file.body.equals(readFileSync(join(packs, 'films.slatepack')))).toBe(true);
      for (const path of ['/mods/old-films.slatepack', '/mods/notes.slatepack', '/mods/secret.txt', '/mods/../packs/films.slatepack']) expect((await get(s.port, path)).status, path).not.toBe(200);
      expect((await get(s.port, '/mods/films.slatepack', { method: 'POST' })).status).toBe(405);
    } finally { s.close(); }
    // A server with no packs offers none.
    const bare = await start(catalog('bare', null));
    try { expect(json(await get(bare.port, '/mods/index.json'))).toEqual({ version: 1, mods: [] }); } finally { bare.close(); }
    // A server that isn't the owner's own (no --owner) gives no player TMDB's data: no film pack, and no catalog, even
    // with both in its folders (the owner's decision, November 11, 2026). The cinemas (CC0) are still offered.
    const other = await start(catalog('not-owner', good), undefined, packs, false);
    try {
      expect(json(await get(other.port, '/mods/index.json')).mods.map((m: { file: string }) => m.file)).toEqual(['cinemas.slatepack']);
      expect((await get(other.port, '/mods/films.slatepack')).status).toBe(404);
      expect(json(await get(other.port, '/screen-catalog/index.json'))).toEqual({ installed: false, reason: 'missing' });
      expect((await get(other.port, '/screen-catalog/titles/movie-1.json')).status).toBe(404);
      expect((await get(other.port, '/screen-catalog/cinemas/GB.json')).status).toBe(200);
    } finally { other.close(); }
  });

  it('offers the picture pack to the owner alone, never past six months, and sends the rest of a download that was cut off', async () => {
    const packs = join(root, 'picture-packs');
    write(join(packs, 'x'), '');
    const pictures = (from: string) => writePack({ kind: 'images', name: 'Pictures', source: 'TMDB', builtAt: from, retrieved: { from, to: from, maxAgeDays: 180 } }, [['images/index.json', '{}'], ['images/person/1', Buffer.from('a picture, as bytes')]]);
    writeFileSync(join(packs, 'pictures.slatepack'), pictures(RETRIEVED));
    writeFileSync(join(packs, 'old-pictures.slatepack'), pictures('2026-01-01T00:00:00.000Z'));
    const whole = readFileSync(join(packs, 'pictures.slatepack'));
    const owner = await start(catalog('picture-mods', null), undefined, packs);
    try {
      expect(json(await get(owner.port, '/mods/index.json')).mods.map((m: { file: string; kind: string }) => [m.file, m.kind])).toEqual([['pictures.slatepack', 'images']]);
      const all = await get(owner.port, '/mods/pictures.slatepack');
      expect([all.status, all.headers['accept-ranges'], String(all.headers['cache-control']).startsWith('private')]).toEqual([200, 'bytes', true]);
      // The rest of a download, from where it stopped.
      const rest = await get(owner.port, '/mods/pictures.slatepack', { headers: { range: 'bytes=20-' } });
      expect([rest.status, rest.headers['content-range'], rest.body.equals(whole.subarray(20))]).toEqual([206, `bytes 20-${whole.length - 1}/${whole.length}`, true]);
      expect((await get(owner.port, '/mods/pictures.slatepack', { headers: { range: `bytes=${whole.length}-` } })).status).toBe(416);
      // Any other kind of range is answered with the whole file, never a wrong part.
      expect((await get(owner.port, '/mods/pictures.slatepack', { headers: { range: 'bytes=0-5,9-12' } })).body.equals(whole)).toBe(true);
      expect((await get(owner.port, '/mods/old-pictures.slatepack')).status).toBe(404);
    } finally { owner.close(); }
    // A server that isn't the owner's offers no pictures and serves none.
    const other = await start(catalog('picture-mods-other', null), undefined, packs, false);
    try {
      expect(json(await get(other.port, '/mods/index.json')).mods).toEqual([]);
      expect((await get(other.port, '/mods/pictures.slatepack')).status).toBe(404);
    } finally { other.close(); }
  });

  it('serves TMDB\'s data only when started as the owner\'s own (--owner or SLATE_OWNER=1), off by default', () => {
    const src = readFileSync('server/serve.mjs', 'utf8');
    expect(src).toMatch(/const films = process\.argv\.includes\('--owner'\) \|\| process\.env\.SLATE_OWNER === '1';/);
    expect(src).toMatch(/films = false, ownerSecret = null, now \}\) \{/);
  });
});

// The owner's data is the owner's alone (November 11, 2026, the Creative Depth package, milestone A): --owner used to
// answer anyone who reached the port. Each request below is made directly, with no game in front of it.
describe('who gets the owner\'s data', () => {
  const PASS = 'a passphrase the owner chose';
  const packsDir = join(root, 'owner-packs');
  const FILM_ROUTES = ['/screen-catalog/titles/movie-1.json', '/mods/films.slatepack'];
  // A request from elsewhere, three ways: by another name, passed on by a proxy, and both.
  const ELSEWHERE: Record<string, string>[] = [{ host: 'slate.example.com' }, { 'x-forwarded-for': '203.0.113.9' }, { host: 'slate.example.com', 'x-forwarded-proto': 'https', via: '1.1 proxy' }];
  beforeAll(() => {
    mkdirSync(packsDir, { recursive: true });
    writeFileSync(join(packsDir, 'films.slatepack'), writePack({ kind: 'catalog', name: 'Films And Series', source: 'TMDB', builtAt: RETRIEVED, retrieved: { from: RETRIEVED, to: RETRIEVED, maxAgeDays: 180 } }, [['index.json', '{"version":1}']]));
    writeFileSync(join(packsDir, 'cinemas.slatepack'), writePack({ kind: 'cinemas', name: 'Cinemas', source: 'Wikidata (CC0)', builtAt: RETRIEVED }, [['cinemas/index.json', '{}']]));
  });
  const nothingOwned = async (port: number, headers: Record<string, string>) => {
    expect(json(await get(port, '/screen-catalog/index.json', { headers })), JSON.stringify(headers)).toEqual({ installed: false, reason: 'missing' });
    expect(json(await get(port, '/screen-catalog/world.json', { headers }))).toEqual({ installed: false, reason: 'missing' });
    for (const path of FILM_ROUTES) expect((await get(port, path, { headers })).status, path).toBe(404);
    expect(json(await get(port, '/mods/index.json', { headers })).mods.map((m: { file: string }) => m.file)).toEqual(['cinemas.slatepack']);
    // The cinemas (Wikidata, CC0) are everyone's.
    expect((await get(port, '/screen-catalog/cinemas/GB.json', { headers })).status).toBe(200);
  };

  it('answers this machine, and nobody else, when no passphrase is configured', async () => {
    const s = await start(catalog('owner-local', good), undefined, packsDir);
    try {
      expect(json(await get(s.port, '/screen-catalog/index.json')).version).toBe(1);
      for (const path of FILM_ROUTES) expect((await get(s.port, path)).status, path).toBe(200);
      expect(json(await get(s.port, '/owner/session'))).toEqual({ owner: true, signIn: false });
      for (const headers of ELSEWHERE) {
        await nothingOwned(s.port, headers);
        expect(json(await get(s.port, '/owner/session', { headers }))).toEqual({ owner: false, signIn: false });
        // With no passphrase configured there is nothing to sign in with.
        expect((await get(s.port, '/owner/session', { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: JSON.stringify({ passphrase: PASS }) })).status).toBe(404);
      }
    } finally { s.close(); }
  });

  it('answers a request from elsewhere only after the owner signs in, on every film route, until sign-out or twelve hours', async () => {
    let clock = Date.parse('2026-11-11T12:00:00Z');
    const s = await start(catalog('owner-remote', good), () => clock, packsDir, true, PASS);
    const far = { host: 'slate.example.com', 'x-forwarded-for': '203.0.113.9' };
    const signIn = (passphrase: unknown, type = 'application/json') => get(s.port, '/owner/session', { method: 'POST', headers: { ...far, 'content-type': type }, body: JSON.stringify({ passphrase }) });
    try {
      await nothingOwned(s.port, far);
      expect(json(await get(s.port, '/owner/session', { headers: far }))).toEqual({ owner: false, signIn: true });
      // A made-up or malformed cookie is no session.
      for (const cookie of ['slate_owner=' + 'a'.repeat(64), 'slate_owner=1', 'other=1']) await nothingOwned(s.port, { ...far, cookie });
      expect((await signIn('not it')).status).toBe(401);
      expect((await signIn(PASS, 'text/plain')).status).toBe(415);
      expect((await signIn({ $ne: '' })).status).toBe(401);
      const ok = await signIn(PASS);
      expect(ok.status).toBe(200);
      const set = String(ok.headers['set-cookie']);
      expect(set).toMatch(/^slate_owner=[0-9a-f]{64}; HttpOnly; Secure; SameSite=Strict; Path=\/; Max-Age=43200$/);
      const cookie = set.split(';')[0];
      // The passphrase is never sent back, and nothing about a session is kept by a cache.
      expect(ok.body.toString()).not.toContain(PASS);
      expect(ok.headers['cache-control']).toBe('no-store');
      const mine = { ...far, cookie };
      expect(json(await get(s.port, '/screen-catalog/index.json', { headers: mine })).version).toBe(1);
      const record = await get(s.port, FILM_ROUTES[0], { headers: mine });
      expect([record.status, record.headers['cache-control'], record.headers.vary]).toEqual([200, 'private, max-age=3600', 'cookie']);
      const pack = await get(s.port, FILM_ROUTES[1], { headers: mine });
      expect([pack.status, pack.headers['cache-control'], pack.headers.vary]).toEqual([200, 'private, max-age=3600', 'cookie']);
      expect(json(await get(s.port, '/mods/index.json', { headers: mine })).mods.map((m: { file: string }) => m.file)).toEqual(['cinemas.slatepack', 'films.slatepack']);
      expect(json(await get(s.port, '/owner/session', { headers: mine }))).toEqual({ owner: true, signIn: true });
      // Another visitor, without the cookie, still gets nothing while the owner is signed in.
      await nothingOwned(s.port, far);
      // Twelve hours on, the session has ended.
      clock += 12 * 3_600_000;
      await nothingOwned(s.port, mine);
      // Signing out ends a session at once.
      const again = String((await signIn(PASS)).headers['set-cookie']).split(';')[0];
      expect((await get(s.port, FILM_ROUTES[0], { headers: { ...far, cookie: again } })).status).toBe(200);
      expect((await get(s.port, '/owner/session', { method: 'DELETE', headers: { ...far, cookie: again } })).status).toBe(200);
      await nothingOwned(s.port, { ...far, cookie: again });
    } finally { s.close(); }
  });

  it('slows guessing: five wrong passphrases lock sign-in, even for the right one, for a minute', async () => {
    let clock = Date.parse('2026-11-11T12:00:00Z');
    const s = await start(catalog('owner-lock', good), () => clock, packsDir, true, PASS);
    const signIn = (passphrase: string) => get(s.port, '/owner/session', { method: 'POST', headers: { host: 'slate.example.com', 'content-type': 'application/json' }, body: JSON.stringify({ passphrase }) });
    try {
      for (let i = 0; i < 5; i++) expect((await signIn(`guess ${i}`)).status).toBe(401);
      const locked = await signIn(PASS);
      expect([locked.status, locked.headers['retry-after']]).toEqual([429, '60']);
      clock += 61_000;
      expect((await signIn(PASS)).status).toBe(200);
    } finally { s.close(); }
  });

  it('a server that isn\'t the owner\'s offers no sign-in and no film data, whatever is presented', async () => {
    const s = await start(catalog('public', good), undefined, packsDir, false, PASS);
    try {
      await nothingOwned(s.port, {});
      expect(json(await get(s.port, '/owner/session'))).toEqual({ owner: false, signIn: false });
      expect((await get(s.port, '/owner/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ passphrase: PASS }) })).status).toBe(404);
    } finally { s.close(); }
  });

  it('starts on this machine alone as the owner\'s, and refuses another address without a passphrase of some length', () => {
    const read = (file: string) => { if (file === 'pass') return `${PASS}\n`; if (file === 'short') return 'hunter2'; throw new Error('no file'); };
    expect(ownerPlan({ films: true }, read)).toEqual({ host: '127.0.0.1', secret: null });
    expect(ownerPlan({ films: true, secretFile: 'pass' }, read)).toEqual({ host: '127.0.0.1', secret: PASS });
    expect(ownerPlan({ films: true, host: '0.0.0.0', secretFile: 'pass' }, read)).toEqual({ host: '0.0.0.0', secret: PASS });
    expect(ownerPlan({ films: true, host: '0.0.0.0' }, read).error).toMatch(/won't listen on 0\.0\.0\.0 without the owner's passphrase/);
    expect(ownerPlan({ films: true, host: '192.168.1.20' }, read).error).toBeTruthy();
    expect(ownerPlan({ films: true, host: '0.0.0.0', secretFile: 'short' }, read).error).toMatch(/at least 16 characters/);
    expect(ownerPlan({ films: true, host: '0.0.0.0', secretFile: 'gone' }, read).error).toMatch(/can't be read/);
    // Other players' server has no owner data to guard, and listens as before.
    expect(ownerPlan({ films: false }, read)).toEqual({ host: undefined, secret: null });
    expect(ownerPlan({ films: false, host: '0.0.0.0' }, read)).toEqual({ host: '0.0.0.0', secret: null });
    // No passphrase is built in.
    for (const f of ['server/serve.mjs', 'server/catalog-handler.mjs']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/secret\s*[:=]\s*['"`][^'"`]+['"`]/i);
  });
});
