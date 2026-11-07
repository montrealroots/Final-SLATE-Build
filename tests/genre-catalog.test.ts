// The genre catalog loads whole or not at all, and a failed load can be tried again (src/engine/genres.ts). Each test takes
// a fresh copy of the module, so the catalog tests/setup.ts preloads doesn't hide the cold start.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Genres = typeof import('../src/engine/genres');
const real = JSON.parse(readFileSync(new URL('../src/data/genre-catalog.json', import.meta.url), 'utf8')) as { records: { id: string }[] };
const fresh = async (): Promise<Genres> => {
  vi.resetModules();
  return import('../src/engine/genres');
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.restoreAllMocks());

describe('the genre catalog is published whole or not at all', () => {
  it('a malformed file publishes nothing and the catalog stays not loaded', async () => {
    const g = await fresh();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply({ records: [real.records[0], { id: 'drama', name: 7 }] }));
    await expect(g.loadGenreCatalog()).rejects.toThrow('Genre record 2 is malformed.');
    expect(g.genreCatalogLoaded()).toBe(false);
    expect(g.GENRES).toEqual([]);
    expect(() => g.genre(real.records[0].id)).toThrow('Unknown genre');
    for (const bad of [null, {}, { records: [] }, { records: 'x' }]) expect(() => g.buildGenreCatalog(bad)).toThrow('The genre catalog has no records.');
  });

  it('an unknown mechanic mapping halfway through publishes none of the records before it', async () => {
    const g = await fresh();
    const half = Math.floor(real.records.length / 2);
    const broken = { records: [...real.records.slice(0, half), { ...real.records[half], id: 'not-a-genre' }, ...real.records.slice(half + 1)] };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(broken));
    await expect(g.loadGenreCatalog()).rejects.toThrow('Genre not-a-genre has no mechanic mapping');
    expect(g.GENRES.length).toBe(0);
    expect(g.genreCatalogLoaded()).toBe(false);
    expect(() => g.genre(real.records[0].id)).toThrow('Unknown genre');
  });

  it('an HTTP failure, then a genuine retry that loads the catalog once, with no duplicates', async () => {
    const g = await fresh();
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('Not found', { status: 503 })).mockResolvedValueOnce(reply(real));
    await expect(g.loadGenreCatalog()).rejects.toThrow("Couldn't load the genre catalog (503).");
    expect(g.genreCatalogLoaded()).toBe(false);
    await g.loadGenreCatalog();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(g.GENRES.length).toBe(real.records.length);
    expect(new Set(g.GENRES.map((x) => x.id)).size).toBe(real.records.length);
    // Loaded: further calls don't fetch again or add records.
    await g.loadGenreCatalog();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(g.GENRES.length).toBe(real.records.length);
  });

  it('callers at the same time share one load', async () => {
    const g = await fresh();
    let release!: (r: Response) => void;
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise<Response>((r) => { release = r; }));
    const calls = [g.loadGenreCatalog(), g.loadGenreCatalog(), g.loadGenreCatalog()];
    expect(calls[1]).toBe(calls[0]);
    release(reply(real));
    await Promise.all(calls);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(g.GENRES.length).toBe(real.records.length);
  });

  it('callers sharing a failed load all see the failure, and the next call starts a new load', async () => {
    const g = await fresh();
    const fetch = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(reply(real));
    const [a, b] = [g.loadGenreCatalog(), g.loadGenreCatalog()];
    await expect(a).rejects.toThrow('Failed to fetch');
    await expect(b).rejects.toThrow('Failed to fetch');
    await g.loadGenreCatalog();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(g.genreCatalogLoaded()).toBe(true);
  });

  it('a valid catalog already published survives a bad one', async () => {
    const g = await fresh();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(reply(real));
    await g.loadGenreCatalog();
    const before = [...g.GENRES];
    expect(() => g.applyGenreCatalog({ records: [{ ...real.records[0], id: 'not-a-genre' }] })).toThrow('no mechanic mapping');
    expect(() => g.applyGenreCatalog({ records: [real.records[0], real.records[0]] })).toThrow('appears twice');
    expect(g.GENRES).toEqual(before);
    expect(g.genre(real.records[0].id).id).toBe(real.records[0].id);
  });
});
