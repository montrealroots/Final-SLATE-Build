// The cinemas ship in every build (public/screen-catalog/cinemas/, from November 21, 2026), so a copy built from the
// repository alone, as Base44's is, has them. Each country the index counts has its file, and nothing in it is TMDB's.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'public/screen-catalog/cinemas');

describe('the cinemas shipped with the game', () => {
  const index = JSON.parse(readFileSync(join(DIR, 'index.json'), 'utf8')) as { source: string; countries: { code: string; cinemas: number }[] };
  it('come from Wikidata (CC0) alone', () => {
    expect(index.source).toBe('Wikidata (CC0)');
    expect(readdirSync(DIR).every((f) => f === 'index.json' || /^[A-Z]{2}\.json$/.test(f))).toBe(true);
  });
  it('hold every country the index counts, with as many cinemas as it says', () => {
    expect(index.countries.length).toBeGreaterThan(100);
    for (const { code, cinemas } of index.countries) {
      const file = join(DIR, `${code}.json`);
      expect(existsSync(file), code).toBe(true);
      expect((JSON.parse(readFileSync(file, 'utf8')) as unknown[]).length, code).toBe(cinemas);
    }
  });
});
