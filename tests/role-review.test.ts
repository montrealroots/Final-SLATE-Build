// The reviewed roles (src/data/role-review.json; the owner, November 13, 2026: "Fix it all."): every reviewed work is in
// the catalog, and its brief comes out as reviewed. The lead leads, the one against them is the antagonist, the one
// beside them the ally, a part reviewed as absent is absent, and a name dropped as no person is not in the cast.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ROLE_REVIEW, proposeFromSource } from '../src/engine/proposal';
import type { SourceWork } from '../src/engine/sources';

const catalog = JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as { records: SourceWork[] };
const stories = JSON.parse(readFileSync('src/data/plots.json', 'utf8')) as { plots: Record<string, SourceWork['plot']> };
const GENRES = new Set((JSON.parse(readFileSync('src/data/genre-registry.json', 'utf8')) as { records: { id: string }[] }).records.map((r) => r.id));

describe('reviewed roles', () => {
  it('name works in the catalog, and every reviewed brief comes out as reviewed', () => {
    const wrong: string[] = [];
    for (const [title, r] of Object.entries(ROLE_REVIEW)) {
      const w = catalog.records.find((x) => x.title === title);
      if (!w) { wrong.push(`${title}: not in the catalog`); continue; }
      for (const format of ['feature', 'series'] as const) {
        const b = proposeFromSource({ work: { ...w, plot: stories.plots[w.id] }, format, approach: 'faithful', gameYear: 2027, genres: GENRES }).blueprint;
        const by = (f: string) => b.characters.filter((c) => c.functions.includes(f as never)).map((c) => c.name);
        if (r.lead && b.characters[0]?.name !== r.lead) wrong.push(`${title} (${format}): leads ${b.characters[0]?.name}, reviewed ${r.lead}`);
        if (r.against !== undefined && JSON.stringify(by('antagonist')) !== JSON.stringify(r.against ? [r.against] : [])) wrong.push(`${title} (${format}): against ${by('antagonist')}, reviewed ${r.against}`);
        if (r.ally !== undefined && JSON.stringify(by('ally')) !== JSON.stringify(r.ally ? [r.ally] : [])) wrong.push(`${title} (${format}): ally ${by('ally')}, reviewed ${r.ally}`);
        for (const d of r.drop ?? []) if (b.characters.some((c) => c.name === d)) wrong.push(`${title} (${format}): ${d} is still in the cast`);
      }
    }
    expect(wrong).toEqual([]);
  }, 30_000);
});
