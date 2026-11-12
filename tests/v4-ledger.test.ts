// The v4 requirement ledger (docs/v4/requirements.csv; the v4 package, 05 "Traceability matrix"). Each of the package's
// 38 rows is expanded into child requirements. This holds the ledger to what it claims: a row is requested, implemented,
// verified or retired; a verified row names a unit test and a browser journey that exist and the commit they passed at;
// an implemented row names what reads it; and docs/v4/LEDGER-COUNTS.md is the ledger's own count, never typed
// (V4_WRITE=1 writes it).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function parse(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const rows = parse(readFileSync('docs/v4/requirements.csv', 'utf8'));
const parents = parse(readFileSync('docs/v4/parents.csv', 'utf8'));
const STATES = ['requested', 'implemented', 'verified', 'retired'];
/** "a.test.ts; b.test.ts (2D)" is two files. */
const files = (s: string) => s.split(';').map((x) => x.trim().replace(/\s*\(.*\)$/, '')).filter(Boolean);

function counts(): string {
  const by = (state: string, p?: string) => rows.filter((r) => r.state === state && (!p || r.parent === p)).length;
  const lines = [
    '# V4 Ledger Counts',
    '',
    'Written by `V4_WRITE=1 npx vitest run tests/v4-ledger.test.ts` from `docs/v4/requirements.csv`. Nothing here is typed.',
    'A child requirement is verified only when a named unit test and a named browser journey prove it at the commit given.',
    '',
    `| | Children | Requested | Implemented | Verified | Retired |`,
    '| --- | --- | --- | --- | --- | --- |',
    `| All | ${rows.length} | ${by('requested')} | ${by('implemented')} | ${by('verified')} | ${by('retired')} |`,
    ...parents.map((p) => `| ${p.id} ${p.requirement} | ${rows.filter((r) => r.parent === p.id).length} | ${by('requested', p.id)} | ${by('implemented', p.id)} | ${by('verified', p.id)} | ${by('retired', p.id)} |`),
    '',
  ];
  return lines.join('\n');
}

describe('the v4 ledger', () => {
  it('expands every package row, and each child has an id under its parent and a known state', () => {
    expect(parents.map((p) => p.id)).toEqual(Array.from({ length: 38 }, (_, i) => `V4-${String(i + 1).padStart(3, '0')}`));
    for (const p of parents) expect(rows.some((r) => r.parent === p.id), p.id).toBe(true);
    for (const r of rows) {
      expect(r.id.startsWith(`${r.parent}.`), r.id).toBe(true);
      expect(STATES, r.id).toContain(r.state);
      expect(r.requirement.length, r.id).toBeGreaterThan(10);
    }
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
  });

  it('a verified row names a unit test and a journey that exist, and the commit; an implemented row names its reader', () => {
    for (const r of rows.filter((x) => x.state === 'verified')) {
      expect(files(r.unit_test).length, `${r.id} has no unit test`).toBeGreaterThan(0);
      expect(files(r.browser_journey).length, `${r.id} has no journey`).toBeGreaterThan(0);
      for (const f of files(r.unit_test)) expect(existsSync(`tests/${f}`), `${r.id}: tests/${f}`).toBe(true);
      for (const f of files(r.browser_journey)) expect(existsSync(`e2e/${f}`), `${r.id}: e2e/${f}`).toBe(true);
      expect(r.evidence_sha, r.id).toMatch(/^[0-9a-f]{7,40}$/);
    }
    for (const r of rows.filter((x) => x.state === 'implemented')) expect(r.reader || r.unit_test, `${r.id} names nothing that reads it`).not.toBe('');
  });

  it('the counts document is the ledger as it stands', () => {
    if (process.env.V4_WRITE) writeFileSync('docs/v4/LEDGER-COUNTS.md', counts());
    expect(readFileSync('docs/v4/LEDGER-COUNTS.md', 'utf8')).toBe(counts());
  });
});
