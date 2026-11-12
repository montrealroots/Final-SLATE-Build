// What the story library holds, counted from the files (the v3 package, suites T01 and T02; docs/v3/LEDGER.md).
// Regenerate after writing stories: V3_WRITE=1 npx vitest run tests/v3-content.test.ts
// It writes src/blueprints/counts.json (what the picker shows), docs/v3/CONTENT-COUNTS.md and .json (every genre against
// its quota) and docs/v3/SIMILAR-STORIES.md (pairs of stories whose words overlap, for a person to read: an overlap
// score finds candidates, and proves nothing about originality either way).
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../src/data/genre-registry.json';
import { blueprintProblems, formatClass, parseBlueprints, type Blueprint } from '../src/engine/blueprints';

const RECORDS = (registry as { records: { id: string; name: string; legacy_parent_label: string }[] }).records;
const GENRES = new Set(RECORDS.map((r) => r.id));
const DIR = 'src/blueprints';
const QUOTA = { film: 50, tv: 50 };
const PAIR_STORIES = 10, PAIRS_EACH = 3;

const files = readdirSync(DIR).filter((f) => f.endsWith('.bp')).sort();
const all: Blueprint[] = files.flatMap((f) => parseBlueprints(readFileSync(`${DIR}/${f}`, 'utf8')).blueprints);
const sound = all.filter((b) => blueprintProblems(b, GENRES).length === 0);
const single = sound.filter((b) => !b.id.includes('+'));
const mixed = sound.filter((b) => b.id.includes('+'));

type Row = { film: number; tv: number; filmReviewed: number; tvReviewed: number };
const by = new Map<string, Row>(RECORDS.map((r) => [r.id, { film: 0, tv: 0, filmReviewed: 0, tvReviewed: 0 }]));
for (const b of single) {
  const row = by.get(b.genre)!; const c = formatClass(b.format)!;
  row[c]++; if (b.review.status === 'reviewed') row[`${c}Reviewed`]++;
}
const pairs = new Map<string, number>();
for (const b of mixed) pairs.set(b.id.split('.')[0], (pairs.get(b.id.split('.')[0]) ?? 0) + 1);
const fullPairs = [...pairs].filter(([, n]) => n >= PAIR_STORIES).map(([k]) => k);
const pairsOf = (g: string) => fullPairs.filter((k) => k.split('+').includes(g)).length;

// Words a story shares with another, as a share of the smaller one's: candidates for a person to compare.
const STOP = new Set('a an the and or but of to in on at for with from by as is are was were be been it its his her their they she he who whom that this these those into over under after before when while than then not no nor so if out up down off one two three has have had will would can could must may might do does did'.split(' '));
const words = (b: Blueprint) => new Set(`${b.logline} ${b.premise} ${b.synopsis}`.toLowerCase().replace(/\{\w+\}/g, ' ').replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)));
function similar(): { a: string; b: string; share: number }[] {
  const out: { a: string; b: string; share: number }[] = [];
  const byFile = new Map<string, Blueprint[]>();
  for (const b of sound) byFile.set(b.genre, [...(byFile.get(b.genre) ?? []), b]);
  for (const group of byFile.values()) {
    const sets = group.map(words);
    for (let i = 0; i < group.length; i++) for (let j = i + 1; j < group.length; j++) {
      let n = 0; for (const w of sets[i]) if (sets[j].has(w)) n++;
      const share = n / Math.max(1, Math.min(sets[i].size, sets[j].size));
      if (share >= 0.45) out.push({ a: group[i].id, b: group[j].id, share: Math.round(share * 100) / 100 });
    }
  }
  return out.sort((x, y) => y.share - x.share);
}

const counts: Record<string, { film: number; tv: number }> = {};
for (const f of files) {
  const key = f.slice(0, -3);
  const list = sound.filter((b) => b.id.split('.')[0] === key);
  counts[key] = { film: list.filter((b) => formatClass(b.format) === 'film').length, tv: list.filter((b) => formatClass(b.format) === 'tv').length };
}
const totals = {
  required: RECORDS.length * (QUOTA.film + QUOTA.tv),
  written: all.filter((b) => !b.id.includes('+')).length,
  complete: single.length,
  reviewed: single.filter((b) => b.review.status === 'reviewed').length,
  genresAtQuota: [...by.values()].filter((r) => r.filmReviewed >= QUOTA.film && r.tvReviewed >= QUOTA.tv).length,
  genresStarted: [...by.values()].filter((r) => r.film + r.tv > 0).length,
  mixedWritten: all.filter((b) => b.id.includes('+')).length, mixedComplete: mixed.length, pairsWithTen: fullPairs.length,
  genresInThreePairs: RECORDS.filter((r) => pairsOf(r.id) >= PAIRS_EACH).length,
};
const n = (x: number) => x.toLocaleString('en-US');
const md = `# Story Library Counts

Written by \`V3_WRITE=1 npx vitest run tests/v3-content.test.ts\` from the files in \`src/blueprints/\`. Nothing here is
typed by hand. A story counts only when it has no problem (\`blueprintProblems\`): every required field, every link, a
whole outline and, for a series, every episode of its first season.

- **Written:** a story is in a file. **Complete:** it has no problem. **Reviewed:** it is complete and its review line
  says a person or the author read it for coherence and against the stories beside it.
- Each story counts for one genre, its primary one. A mixed-genre story is in the second table and fills no
  single-genre quota.

| | Required | Written | Complete | Reviewed |
| --- | --- | --- | --- | --- |
| Stories with one primary genre | ${n(totals.required)} | ${n(totals.written)} | ${n(totals.complete)} | ${n(totals.reviewed)} |
| Genres with 50 reviewed films and 50 reviewed series | ${RECORDS.length} | | | ${totals.genresAtQuota} |
| Genres with at least one story | | | ${totals.genresStarted} | |
| Mixed-genre stories | | ${n(totals.mixedWritten)} | ${n(totals.mixedComplete)} | |
| Pairings with ${PAIR_STORIES} stories | | | ${totals.pairsWithTen} | |
| Genres in ${PAIRS_EACH} such pairings | ${RECORDS.length} | | ${totals.genresInThreePairs} | |

## By Genre

| Genre | Films | Films reviewed | Series | Series reviewed | Pairings with ${PAIR_STORIES} |
| --- | --- | --- | --- | --- | --- |
${RECORDS.map((r) => { const x = by.get(r.id)!; return `| ${r.name} (\`${r.id}\`) | ${x.film} | ${x.filmReviewed} | ${x.tv} | ${x.tvReviewed} | ${pairsOf(r.id)} |`; }).join('\n')}

## Pairings

${pairs.size ? [...pairs].sort().map(([k, c]) => `- \`${k}\`: ${c}`).join('\n') : 'None written yet.'}
`;
const sim = similar();
const simMd = `# Stories Whose Words Overlap

Written by \`V3_WRITE=1 npx vitest run tests/v3-content.test.ts\`. Pairs within one genre whose logline, premise and
synopsis share 45% or more of the smaller one's distinctive words. This finds candidates for a person to read side by
side. It does not show two stories are the same, and a pair missing from it is not shown to be different.

${sim.length ? `| Story | Story | Shared |\n| --- | --- | --- |\n${sim.map((s) => `| \`${s.a}\` | \`${s.b}\` | ${Math.round(s.share * 100)}% |`).join('\n')}` : 'No pair reaches 45%.'}
`;

if (process.env.V3_WRITE) {
  writeFileSync(`${DIR}/counts.json`, `${JSON.stringify(counts, null, 1)}\n`);
  writeFileSync('docs/v3/CONTENT-COUNTS.md', md);
  writeFileSync('docs/v3/CONTENT-COUNTS.json', `${JSON.stringify({ totals, byGenre: Object.fromEntries(by), pairs: Object.fromEntries(pairs) }, null, 1)}\n`);
  writeFileSync('docs/v3/SIMILAR-STORIES.md', simMd);
}

describe('the story library, counted', () => {
  it('the counts the game and the ledger show are the counts of the files', () => {
    expect(JSON.parse(readFileSync(`${DIR}/counts.json`, 'utf8'))).toEqual(counts);
    expect(existsSync('docs/v3/CONTENT-COUNTS.md') && readFileSync('docs/v3/CONTENT-COUNTS.md', 'utf8')).toBe(md);
    expect(readFileSync('docs/v3/SIMILAR-STORIES.md', 'utf8')).toBe(simMd);
  });

  it('every story written is complete: one that is not would be counted nowhere and shown to nobody', () => {
    expect(all.filter((b) => blueprintProblems(b, GENRES).length).map((b) => b.id)).toEqual([]);
  });

  it('a story fills one quota: its primary genre, in the file named for it', () => {
    for (const b of single) expect(GENRES.has(b.genre) && b.id.startsWith(`${b.genre}.`), b.id).toBe(true);
  });

  it('a mixed story is in a file for its pair, and its second genre is a different one', () => {
    for (const b of mixed) { const [x, y] = b.id.split('.')[0].split('+'); expect(x !== y && GENRES.has(x) && GENRES.has(y), b.id).toBe(true); }
  });
});
