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
    const newer = new Uint8Array(whole.slice(0));
    const text = new TextDecoder().decode(newer).replace('"format":1', '"format":2');
    await expect(parsePack(new Blob([new TextEncoder().encode(text)]))).rejects.toThrow('made for a newer version');
  });
});
