// The owner's sweep of adapted works (November 13, 2026): every work in the catalog proposed as a film and as a series,
// and the brief's own words checked. Each person is spoken of in their own pronouns, nothing is left as a template's
// placeholder, and the central question is a question. The work's words (premise, synopsis, scenes) are the article's
// and aren't checked for grammar; their placeholders are.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { proposeFromSource } from '../src/engine/proposal';
import type { SourceWork } from '../src/engine/sources';

const catalog = JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as { records: SourceWork[] };
const stories = JSON.parse(readFileSync('src/data/plots.json', 'utf8')) as { plots: Record<string, SourceWork['plot']> };
const GENRES = new Set((JSON.parse(readFileSync('src/data/genre-registry.json', 'utf8')) as { records: { id: string }[] }).records.map((r) => r.id));
const THEY = /\b(they|them|their|theirs|themselves)\b/;

describe('the words of every proposed brief', () => {
  it('speak of each person in their own pronouns, leave no placeholder, and ask a question', () => {
    const wrong: string[] = [];
    for (const w of catalog.records) for (const format of ['feature', 'series'] as const) {
      const b = proposeFromSource({ work: { ...w, plot: stories.plots[w.id] }, format, approach: 'faithful', gameYear: 2027, genres: GENRES }).blueprint;
      const show = (t: string) => t.replace(/\{(\w+)\}/g, (_, k: string) => b.characters.find((c) => c.key === k)?.name ?? `{${k}}`);
      const [lead, ...rest] = b.characters;
      if (lead.pronouns !== 'they/them') for (const t of [b.question, b.stakes, b.conflict, lead.wants, lead.motivation, lead.obstacle, lead.contradiction, lead.arc].map(show)) if (THEY.test(t)) wrong.push(`${w.title}: ${t}`);
      for (const c of rest) if (c.pronouns !== 'they/them') for (const t of [c.wants, c.motivation, c.obstacle, c.arc].map(show)) if (THEY.test(t)) wrong.push(`${w.title}, ${c.name}: ${t}`);
      for (const t of [b.logline, b.premise, b.synopsis, b.question, b.stakes, b.conflict, b.ending, ...b.themes, ...b.scenes.flatMap((x) => [x.action, x.turn, x.objective])].map(show)) if (/[{}]/.test(t)) wrong.push(`${w.title}: ${t.slice(0, 80)}`);
      if (!/^Can .+\?$/.test(show(b.question))) wrong.push(`${w.title}: ${b.question}`);
    }
    expect(wrong).toEqual([]);
  });
});
