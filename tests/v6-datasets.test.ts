// The v6 and v7 datasets' access-and-terms ledger (docs/v6/DATASETS.md; V6-045): every dataset file is listed, every
// listed file exists, and every source a file cites is listed under it. A source added to a file without the ledger
// fails here.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const ledger = readFileSync('docs/v6/DATASETS.md', 'utf8');
const sections = Object.fromEntries(ledger.split(/^## /m).slice(1).map((s) => [s.slice(s.indexOf('`') + 1, s.indexOf('`', 1)), s]));
// The v6 and v7 datasets: the history store, and the files the v7 package added.
const DATASETS = [
  ...readdirSync('src/data/history').filter((f) => f.endsWith('.json')).map((f) => `src/data/history/${f}`),
  'src/data/platform-routes.json', 'src/data/eligibility-extracts.json', 'src/data/source-corrections.json',
  'src/data/camera-reference.json', 'src/data/composer-credits.json', 'src/data/reputation-design.json',
];
const urls = (x: unknown): string[] => (Array.isArray(x) ? x.flatMap(urls) : x && typeof x === 'object'
  ? [...(typeof (x as { url?: unknown }).url === 'string' ? [(x as { url: string }).url] : []), ...Object.values(x).flatMap(urls)] : []);

describe('the v6 dataset ledger', () => {
  it('lists every dataset, and nothing that is gone', () => {
    expect(DATASETS.filter((f) => !sections[f])).toEqual([]);
    expect(Object.keys(sections).filter((f) => !existsSync(f))).toEqual([]);
  });
  it('lists every source each dataset cites, under it, with what kind of thing it is and its terms', () => {
    for (const f of DATASETS) {
      const s = sections[f];
      expect(s, f).toMatch(/\*\*Kind:\*\* .+\./);
      expect(s, f).toMatch(/\*\*Terms:\*\* .+/);
      expect([...new Set(urls(JSON.parse(readFileSync(f, 'utf8'))))].filter((u) => !s.includes(`<${u}>`)), f).toEqual([]);
    }
  });
});
