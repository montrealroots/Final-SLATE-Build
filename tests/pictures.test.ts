// The whole catalog's pictures (tools/screen-catalog/pictures.mjs; the v3 package, 03-COMPLETE-PICTURE-PACK.md). Every
// record here is made up, and the image host is a stand-in: no picture is fetched from anywhere. What the real
// catalog's fetch found is in docs/PICTURE-COVERAGE.md, and is not evidence these tests give.
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Manifest, coverage, fetchPictures, inventory, reconcile, storePath } from '../tools/screen-catalog/pictures.mjs';

// The smallest PNG header the tool can measure: 8 signature bytes, an IHDR of width 2 and height 3.
const png = (tag: number) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0, 2, 0, 0, 0, 3]), Buffer.from([tag, tag, tag, tag])]);
const ok = (tag = 1) => ({ status: 200, ok: true, arrayBuffer: async () => { const b = png(tag); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); } });
const answer = (status: number, headers: Record<string, string> = {}) => ({ status, ok: false, headers: { get: (k: string) => headers[k] ?? null }, arrayBuffer: async () => new ArrayBuffer(0) });

const CATALOG = {
  manifest: { titles: [{ key: 'movie:1' }, { key: 'tv:2' }, { key: 'movie:3' }], seasons: ['tv/2/season/1?append_to_response=credits'], people: [10, 11, 12, 13] },
  bodies: {
    'movie/1?append_to_response=credits,external_ids,release_dates': { poster_path: '/p1.jpg', backdrop_path: '/b1.jpg' },
    'tv/2?append_to_response=aggregate_credits,credits,external_ids,content_ratings': { poster_path: '/p2.jpg', backdrop_path: null },
    // movie:3 is not in the cache
    'tv/2/season/1?append_to_response=credits': { poster_path: '/p2.jpg', episodes: [{ episode_number: 1, still_path: '/s1.jpg' }, { episode_number: 2, still_path: null }] },
    'person/10': { profile_path: '/a.jpg' }, 'person/11': { profile_path: null }, 'person/12': { profile_path: '/x.jpg', adult: true }, 'person/13': { profile_path: '/a.jpg' },
    'company/3': { logo_path: '/l.png' }, 'network/7': { logo_path: null },
  } as Record<string, unknown>,
};
const rows = () => inventory({ manifest: CATALOG.manifest, read: (p) => CATALOG.bodies[p] ?? null, companies: [{ id: 'company:lantern', tmdb: 3 }], networks: [7] });

let dir: string, store: string, man: Manifest;
const quiet = { sleep: async () => {}, rate: 1e9 };
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'pictures-')); store = join(dir, 'store'); man = new Manifest(join(dir, 'manifest')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const status = (entity: string, kind: string) => man.get(entity, kind)?.status;

describe('the inventory of the whole catalog', () => {
  it('lists every person, title, season, episode, company and network once, with what TMDB publishes for it', () => {
    const all = [...rows()];
    expect(all.map((r) => `${r.entity} ${r.kind} ${r.path ?? '-'}`)).toEqual([
      'movie:1 poster /p1.jpg', 'movie:1 backdrop /b1.jpg', 'tv:2 poster /p2.jpg', 'tv:2 backdrop -', 'movie:3 poster -', 'movie:3 backdrop -',
      'season:2:1 season-poster /p2.jpg', 'episode:2:1:1 still /s1.jpg', 'episode:2:1:2 still -',
      'person:10 profile /a.jpg', 'person:11 profile -', 'person:12 profile /x.jpg', 'person:13 profile /a.jpg',
      'company:lantern logo /l.png', 'network:7 logo -',
    ]);
  });

  it('says why a record has nothing to fetch: none published, excluded, or not in the cache yet', () => {
    reconcile(man, rows(), { store });
    expect(status('person:11', 'profile')).toBe('no-image-published');
    expect(man.get('person:12', 'profile')).toMatchObject({ status: 'intentionally-excluded', note: 'TMDB marks this person adult' });
    // A title whose details were never fetched is not called pictureless: it is still owed a look.
    expect(man.get('movie:3', 'poster')).toMatchObject({ status: 'not-attempted', note: "its details aren't in the catalog's cache" });
    expect(status('person:10', 'profile')).toBe('not-attempted');
  });
});

describe('fetching', () => {
  it('fetches each picture once, however many records share it, and records its hash, size and date', async () => {
    reconcile(man, rows(), { store });
    const asked: string[] = [];
    const r = await fetchPictures(man, { store, ...quiet, workers: 1, now: () => Date.parse('2026-11-12T00:00:00Z'), transport: async (url) => { asked.push(url.replace('https://image.tmdb.org/t/p/', '')); return ok(); } });
    // /a.jpg is two people's and /p2.jpg is a series' and its season's: each asked for once.
    expect(asked.sort()).toEqual(['w154/l.png', 'w185/a.jpg', 'w185/p1.jpg', 'w185/p2.jpg', 'w185/s1.jpg', 'w300/b1.jpg']);
    expect(r).toMatchObject({ fetched: 6, reused: 2, failed: 0 });
    expect(man.get('person:10', 'profile')).toMatchObject({ status: 'ready', provider: 'TMDB', path: '/a.jpg', size: 'w185', w: 2, h: 3, at: '2026-11-12', bytes: 28 });
    expect(man.get('person:10', 'profile')!.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(man.get('person:13', 'profile')).toMatchObject({ status: 'ready', reused: true, file: man.get('person:10', 'profile')!.file });
    expect(existsSync(join(store, storePath('w185', '/a.jpg')))).toBe(true);
    const c = coverage(man);
    expect(c.profile).toMatchObject({ eligible: 4, available: 2, downloaded: 2, reused: 1, unavailable: 1, excluded: 1, remaining: 0, bytes: 28 });
    expect(c.still).toMatchObject({ eligible: 2, downloaded: 1, unavailable: 1 });
  });

  it('a second run fetches nothing', async () => {
    reconcile(man, rows(), { store });
    await fetchPictures(man, { store, ...quiet, transport: async () => ok() });
    reconcile(man, rows(), { store });
    let n = 0;
    const r = await fetchPictures(man, { store, ...quiet, transport: async () => { n++; return ok(); } });
    expect(n).toBe(0);
    expect(r.wanted).toBe(0);
  });

  it('waits when the host says too many requests, then gets the picture', async () => {
    reconcile(man, rows(), { store });
    const waits: number[] = [];
    let first = true;
    await fetchPictures(man, { store, rate: 1e9, workers: 1, kinds: ['logo'], sleep: async (ms) => { waits.push(ms); }, transport: async () => { if (first) { first = false; return answer(429, { 'retry-after': '7' }); } return ok(); } });
    expect(waits).toContain(7000);
    expect(status('company:lantern', 'logo')).toBe('ready');
  });

  it('a picture that keeps failing stays owed, and the next run gets it', async () => {
    reconcile(man, rows(), { store });
    const r = await fetchPictures(man, { store, ...quiet, kinds: ['logo'], transport: async () => answer(503) });
    expect(r.failed).toBe(1);
    expect(man.get('company:lantern', 'logo')).toMatchObject({ status: 'temporarily-failed', note: 'the image host answered 503' });
    expect(coverage(man).logo).toMatchObject({ failed: 1, downloaded: 0 });
    await fetchPictures(man, { store, ...quiet, kinds: ['logo'], transport: async () => ok() });
    expect(status('company:lantern', 'logo')).toBe('ready');
  });

  it('refused, gone and not-a-picture are each said, and none is called ready', async () => {
    reconcile(man, rows(), { store });
    await fetchPictures(man, { store, ...quiet, workers: 1, transport: async (url) => (url.endsWith('/l.png') ? answer(403) : url.endsWith('/s1.jpg') ? answer(404) : url.endsWith('/b1.jpg') ? { status: 200, ok: true, arrayBuffer: async () => new TextEncoder().encode('<html>').buffer } : ok()) });
    expect(man.get('company:lantern', 'logo')).toMatchObject({ status: 'permission-limited' });
    expect(man.get('episode:2:1:1', 'still')).toMatchObject({ status: 'no-image-published', note: 'TMDB lists this path and does not serve it (404)' });
    expect(man.get('movie:1', 'backdrop')).toMatchObject({ status: 'temporarily-failed', note: 'what came back is not a picture' });
    expect(existsSync(join(store, storePath('w300', '/b1.jpg')))).toBe(false);
  });

  it('a connection dropped part way through a picture is tried again, and does not end the run', async () => {
    reconcile(man, rows(), { store });
    let dropped = 0;
    const out = await fetchPictures(man, { store, ...quiet, workers: 1, transport: async (url) => (url.endsWith('/b1.jpg') && dropped++ < 2 ? { status: 200, ok: true, arrayBuffer: async () => { throw new TypeError('terminated'); } } : ok()) });
    expect(dropped).toBe(3);
    expect(man.get('movie:1', 'backdrop')).toMatchObject({ status: 'ready' });
    expect(out.failed).toBe(0);
  });

  it('stopped part way, it keeps what it has, and goes on from there without fetching those again', async () => {
    reconcile(man, rows(), { store });
    let n = 0;
    const first = await fetchPictures(man, { store, ...quiet, workers: 1, stop: () => n >= 2, transport: async () => { n++; return ok(); } });
    expect(first).toMatchObject({ stopped: true, fetched: 2 });
    // A new process: the manifest is read from disk.
    man = new Manifest(join(dir, 'manifest'));
    const ready = [...man.rows()].filter((r) => r.status === 'ready').length;
    expect(ready).toBeGreaterThanOrEqual(2);
    let again = 0;
    const second = await fetchPictures(man, { store, ...quiet, transport: async () => { again++; return ok(); } });
    expect(again).toBe(6 - 2);
    expect(second.stopped).toBe(false);
    expect(coverage(man).profile.remaining + coverage(man).poster.remaining + coverage(man).still.remaining).toBe(1); // movie:3, whose details aren't cached
  });

  it('a stored picture that is damaged, missing or six months old is fetched again', async () => {
    reconcile(man, rows(), { store });
    await fetchPictures(man, { store, ...quiet, now: () => Date.parse('2026-01-01T00:00:00Z'), transport: async () => ok() });
    rmSync(join(store, storePath('w154', '/l.png')));
    const n = reconcile(man, rows(), { store, now: Date.parse('2026-02-01T00:00:00Z') });
    expect(n.stale).toBe(1);
    expect(man.get('company:lantern', 'logo')).toMatchObject({ status: 'stale', note: 'its file is gone' });
    const later = reconcile(man, rows(), { store, now: Date.parse('2026-08-01T00:00:00Z') });
    expect(later.stale).toBe(7); // every ready row but the logo, which is already stale
    expect(man.get('person:10', 'profile')).toMatchObject({ status: 'stale', note: 'older than six months' });
    let n2 = 0;
    await fetchPictures(man, { store, ...quiet, transport: async () => { n2++; return ok(2); } });
    expect(n2).toBe(6);
    expect(readFileSync(join(store, storePath('w185', '/a.jpg'))).at(-1)).toBe(2);
  });

  it('a record that leaves the catalog leaves the manifest, and a changed picture path is fetched', async () => {
    reconcile(man, rows(), { store });
    await fetchPictures(man, { store, ...quiet, transport: async () => ok() });
    const smaller = { ...CATALOG.manifest, people: [10] };
    const bodies = { ...CATALOG.bodies, 'person/10': { profile_path: '/new.jpg' } } as Record<string, unknown>;
    const n = reconcile(man, inventory({ manifest: smaller, read: (p) => bodies[p] ?? null }), { store });
    expect(n.dropped).toBe(3 + 2); // three people, the company and the network
    expect(man.get('person:13', 'profile')).toBeUndefined();
    expect(man.get('person:10', 'profile')).toMatchObject({ status: 'not-attempted', path: '/new.jpg' });
    writeFileSync(join(dir, 'x'), ''); // nothing else in the folder is touched
    expect(existsSync(join(dir, 'x'))).toBe(true);
  });
});
