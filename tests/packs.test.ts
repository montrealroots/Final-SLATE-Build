// Data packs (src/catalog/packs.ts, tools/pack-format.mjs, docs/DATA-PACKS.md): the file a player installs to add the film
// catalog or the cinemas. Made-up records only.
import { describe, expect, it } from 'vitest';
import { decodeRecord, packExpires, parsePack } from '../src/catalog/packs';
import { writePack } from '../tools/pack-format.mjs';

const RETRIEVED = { from: '2026-11-10T19:51:31.678Z', to: '2026-11-11T01:09:44.327Z', maxAgeDays: 180 };
const catalog = (files: [string, string][], over: Record<string, unknown> = {}) =>
  new Blob([new Uint8Array(writePack({ kind: 'catalog', name: 'Films And Series', source: 'TMDB', builtAt: '2026-11-11T02:06:53Z', retrieved: RETRIEVED, ...over } as Parameters<typeof writePack>[0], files))]);
const FILES: [string, string][] = [['index.json', JSON.stringify({ version: 1, retrieved: RETRIEVED })], ['titles/movie-1.json', JSON.stringify({ ref: 'movie:1', title: 'Fixture' })]];

describe('a data pack', () => {
  it('lists its records and gives each back as it was, without unpacking the rest', async () => {
    const { meta, records } = await parsePack(catalog(FILES));
    expect(meta).toEqual({ kind: 'catalog', name: 'Films And Series', source: 'TMDB', builtAt: '2026-11-11T02:06:53Z', retrieved: RETRIEVED });
    expect(records.map(([p]) => p)).toEqual(['index.json', 'titles/movie-1.json']);
    expect(await decodeRecord(records[1][1])).toEqual({ ref: 'movie:1', title: 'Fixture' });
    // Each record stays compressed until it is read.
    expect(records[1][1].size).toBeLessThan(FILES[1][1].length + 30);
  });

  it('is withdrawn six months after its oldest response, as TMDB requires; the cinemas (CC0) are not', () => {
    expect(new Date(packExpires({ kind: 'catalog', name: '', source: 'TMDB', builtAt: '', retrieved: RETRIEVED })!).toISOString()).toBe('2027-05-09T19:51:31.678Z');
    // A pack can't ask for longer than TMDB allows.
    expect(packExpires({ kind: 'catalog', name: '', source: 'TMDB', builtAt: '', retrieved: { ...RETRIEVED, maxAgeDays: 9999 } })).toBe(Date.parse('2027-05-09T19:51:31.678Z'));
    expect(packExpires({ kind: 'cinemas', name: '', source: 'Wikidata (CC0)', builtAt: '' })).toBeNull();
  });

  it('refuses a file that isn\'t one, one cut short, one with another kind\'s files, and a film pack with no gathering date', async () => {
    await expect(parsePack(new Blob(['{"not":"a pack"}']))).rejects.toThrow("This file isn't a SLATE data pack.");
    const whole = await catalog(FILES).arrayBuffer();
    await expect(parsePack(new Blob([whole.slice(0, whole.byteLength - 5)]))).rejects.toThrow('the file was cut short');
    await expect(parsePack(catalog([...FILES, ['cinemas/GB.json', '[]']]))).rejects.toThrow('it holds files of another kind');
    await expect(parsePack(catalog(FILES, { retrieved: undefined }))).rejects.toThrow("doesn't say when its data was gathered");
    // The same record listed twice, with different contents: refused, not installed with whichever came last.
    await expect(parsePack(catalog([...FILES, ['titles/movie-1.json', JSON.stringify({ ref: 'movie:1', title: 'Another' })]]))).rejects.toThrow('it lists the same record twice');
    const newer = new Uint8Array(whole.slice(0));
    const text = new TextDecoder().decode(newer).replace('"format":1', '"format":2');
    await expect(parsePack(new Blob([new TextEncoder().encode(text)]))).rejects.toThrow('made for a newer version');
  });

  it('holds pictures too: an index and each picture\'s bytes, under the same six months, and never mixed with another kind', async () => {
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xe7, 0x00, 0x9a, 1, 2, 3]);
    const index = { version: 1, provider: 'TMDB', sizes: { profile: 'w185', poster: 'w154' }, rights: 'Fixture.', entries: { 'person:800001': { p: '/fixture.jpg', w: 154, h: 231, at: '2026-11-11', loc: null } } };
    const pack = (over: Record<string, unknown> = {}, extra: [string, string | Buffer][] = []) => new Blob([new Uint8Array(writePack(
      { kind: 'images', name: 'Pictures', source: 'TMDB', builtAt: '2026-11-11T02:06:53Z', retrieved: RETRIEVED, ...over } as Parameters<typeof writePack>[0],
      [['images/index.json', JSON.stringify(index)], ['images/person/800001', jpeg], ...extra]))]);
    const { meta, records } = await parsePack(pack());
    expect([meta.kind, records.map(([p]) => p)]).toEqual(['images', ['images/index.json', 'images/person/800001']]);
    expect(await decodeRecord(records[0][1])).toEqual(index);
    // A picture comes back byte for byte.
    const raw = new Uint8Array(await new Response(records[1][1].stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
    expect(Buffer.from(raw).equals(jpeg)).toBe(true);
    expect(new Date(packExpires(meta)!).toISOString()).toBe('2027-05-09T19:51:31.678Z');
    await expect(parsePack(pack({ retrieved: undefined }))).rejects.toThrow("This picture pack doesn't say when its pictures were gathered");
    await expect(parsePack(pack({}, [['titles/movie-1.json', '{}']]))).rejects.toThrow('it holds files of another kind');
    await expect(parsePack(catalog([...FILES, ['images/person/1', 'x']]))).rejects.toThrow('it holds files of another kind');
  });
});

describe('the picture gatherer', () => {
  it('reads a picture\'s size from its own header, and plans from the catalog\'s cache without fetching anything', async () => {
    const { dimensions, plan, TIERS, ABOUT_BYTES } = await import('../tools/screen-catalog/images.mjs');
    expect(dimensions(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0xe7, 0x00, 0x9a, 1, 2, 3]))).toEqual({ w: 154, h: 231 });
    expect(dimensions(Buffer.from('not a picture'))).toBeNull();
    // A WebP, as the image host sends for a few .jpg paths: the lossy kind's size is in its frame header.
    const webp = Buffer.alloc(40); webp.write('RIFF', 0, 'latin1'); webp.write('WEBP', 8, 'latin1'); webp.write('VP8 ', 12, 'latin1');
    webp[23] = 0x9d; webp[24] = 0x01; webp[25] = 0x2a; webp.writeUInt16LE(185, 26); webp.writeUInt16LE(278, 28);
    expect(dimensions(webp)).toEqual({ w: 185, h: 278 });
    webp[23] = 0; expect(dimensions(webp)).toBeNull();
    // Made-up cache: one film credited to a followed company with a poster and three people, one with no photo.
    const cache: Record<string, unknown> = {
      'movie/1?append_to_response=credits,external_ids,release_dates': { poster_path: '/poster.jpg', credits: { cast: [{ id: 10, order: 0 }, { id: 11, order: 1 }, { id: 12, order: 9 }], crew: [{ id: 13, job: 'Director' }, { id: 14, job: 'Gaffer' }] } },
      'person/10': { profile_path: '/ten.jpg' }, 'person/11': { profile_path: null }, 'person/13': { profile_path: '/thirteen.jpg' },
    };
    let asked = 0;
    const p = plan({ companies: ['company:pixar'], people: 2, manifest: { titles: [{ key: 'movie:1', companies: [3] }, { key: 'movie:2', companies: [99999] }] }, read: (path: string) => { asked++; return cache[path] ? { body: cache[path] } : null; } });
    expect([p.titles, [...p.posters.keys()], [...p.profiles.keys()], p.withoutPicture]).toEqual([1, ['movie:1'], ['person:10', 'person:13'], { titles: 0, people: 1 }]);
    expect(asked).toBeGreaterThan(0);
    // Never the original size, and an estimate for every size it can ask for.
    for (const t of Object.values(TIERS) as { profile: string; poster: string }[]) for (const size of [t.profile, t.poster]) { expect(size).not.toBe('original'); expect(ABOUT_BYTES[size]).toBeGreaterThan(0); }
  });
});
