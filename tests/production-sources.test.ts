// SLATE-20-02: every production, money and career calibration the engine exports is in the source register, with its
// status, and the register names nothing that is gone.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = ['production/rates', 'locations', 'takes', 'auditions', 'negotiation', 'hiring', 'documentary', 'revisions', 'finish', 'distribution', 'opportunities', 'casting-director', 'line-producer'];
const TEXT_ONLY = new Set(['NOT_NEGOTIABLE', 'RESTRICTION_WORDS', 'ROUTE_LABELS', 'EMPHASIS', 'SETUPS_OF']); // words, or which setups a coverage level means // words shown to the player, not calibration

describe('the production source register', () => {
  it('names every exported calibration constant, each with a status and a source column, and nothing stale', () => {
    const register = readFileSync('docs/depth/PRODUCTION-SOURCES.md', 'utf8');
    const rows = register.split('\n').filter((l) => l.startsWith('| `'));
    const named = new Set(rows.flatMap((r) => [...r.split('|')[1].matchAll(/`([A-Z_]+)`/g)].map((m) => m[1])));
    const exported = FILES.flatMap((f) => [...readFileSync(`src/engine/${f}.ts`, 'utf8').matchAll(/^export const ([A-Z][A-Z_]+)\b/gm)].map((m) => m[1])).filter((c) => !TEXT_ONLY.has(c));
    expect(exported.filter((c) => !named.has(c))).toEqual([]);
    expect([...named].filter((c) => !exported.includes(c))).toEqual([]);
    for (const r of rows) {
      const cells = r.split('|').map((x) => x.trim());
      expect(cells[5]).toMatch(/^(Modeled assumption|Verified fact|Convention).*$/);
      expect(cells[6].length).toBeGreaterThan(0);
    }
  });
});
