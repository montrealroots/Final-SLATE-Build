// The festival and awards calendar is data fetched at startup (data/institutions.json, src/engine/awards.ts), published
// whole or not at all, and a failed load can be tried again. Each test takes a fresh module, so the copy tests/setup.ts
// preloads doesn't hide the cold start.
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

type Awards = typeof import('../src/engine/awards');
const real = JSON.parse(readFileSync(new URL('../src/data/institutions.json', import.meta.url), 'utf8')) as { institutions: { id: string }[] };
const fresh = async (): Promise<Awards> => {
  vi.resetModules();
  return import('../src/engine/awards');
};
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => vi.restoreAllMocks());

describe('the festival and awards calendar', () => {
  it('is the 37 events and 142 categories the code held before it became data', () => {
    expect(real.institutions.length).toBe(37);
    expect(real.institutions.reduce((n, i) => n + (i as unknown as { categories: unknown[] }).categories.length, 0)).toBe(142);
  });

  it('a malformed or repeated entry publishes nothing; a failed fetch is tried again', async () => {
    const a = await fresh();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(reply({ institutions: [real.institutions[0], { id: 'x', name: 3 }] }));
    await expect(a.loadInstitutions()).rejects.toThrow('Festival or award 2 is malformed.');
    expect(a.institutionsLoaded()).toBe(false);
    expect(() => a.institution(real.institutions[0].id)).toThrow('Unknown event');
    expect(() => a.buildInstitutions({ institutions: [real.institutions[0], real.institutions[0]] })).toThrow(`${real.institutions[0].id} appears twice.`);
    for (const bad of [null, {}, { institutions: [] }]) expect(() => a.buildInstitutions(bad)).toThrow('The festival and awards calendar has no entries.');
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('nope', { status: 503 }));
    await expect(a.loadInstitutions()).rejects.toThrow("Couldn't load the festival and awards calendar (503).");
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(reply(real));
    await a.loadInstitutions();
    expect(a.INSTITUTIONS.length).toBe(37);
    expect(a.institution('sundance').name).toBe('Sundance Film Festival');
  });
});
