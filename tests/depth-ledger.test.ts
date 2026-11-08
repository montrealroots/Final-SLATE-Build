// The gameplay-depth coverage ledger (docs/depth, from the owner's package of November 8, 2026) is held to its evidence:
// every one of the 100 groups is present, each has child requirements, a parent's status is what its children make it,
// and every piece of evidence cited is a file that exists and contains the words cited. A status can't be typed in.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const STATUSES = ['NOT YET RECONCILED', 'VERIFIED EXISTING', 'NEEDS REPAIR', 'MISSING', 'IMPLEMENTED UNVERIFIED', 'VERIFIED', 'EXTERNAL BLOCKER'];

/** RFC 4180 CSV, as Python's csv module writes it. */
function readCsv(path: string): Record<string, string>[] {
  const text = readFileSync(join(ROOT, path), 'utf8');
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') quoted = false; else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const parents = readCsv('docs/depth/COVERAGE-LEDGER.csv');
const children = readCsv('docs/depth/CHILDREN.csv');
const pkg = readCsv('docs/depth/package/02-COVERAGE-LEDGER.csv');

function derived(kids: Record<string, string>[]): string {
  const st = kids.map((k) => k.status);
  if (st.every((s) => s === 'VERIFIED')) return 'VERIFIED';
  if (st.every((s) => s === 'VERIFIED' || s === 'VERIFIED EXISTING')) return 'VERIFIED EXISTING';
  if (st.every((s) => s === 'MISSING')) return 'MISSING';
  if (st.some((s) => s === 'MISSING' || s === 'NEEDS REPAIR')) return 'NEEDS REPAIR';
  if (st.some((s) => s === 'EXTERNAL BLOCKER')) return 'EXTERNAL BLOCKER';
  return 'IMPLEMENTED UNVERIFIED';
}

describe('the gameplay-depth coverage ledger', () => {
  it('every group of the package is here once, with its words unchanged', () => {
    expect(parents.map((p) => p.id)).toEqual(pkg.map((p) => p.id));
    for (const [i, p] of parents.entries()) {
      for (const k of ['area', 'feature', 'inner_loop', 'downstream_effects', 'failure_recovery']) expect(p[k], `${p.id} ${k}`).toBe(pkg[i][k]);
    }
  });

  it("every group has child requirements, and its status is what its children's statuses make it", () => {
    for (const p of parents) {
      const kids = children.filter((c) => c.parent_id === p.id);
      expect(kids.length, p.id).toBeGreaterThan(0);
      expect(p.child_ids.split(' '), p.id).toEqual(kids.map((k) => k.child_id));
      expect(STATUSES, p.id).toContain(p.status);
      expect(p.status, p.id).toBe(derived(kids));
    }
    expect(new Set(children.map((c) => c.child_id)).size).toBe(children.length);
  });

  it('a child with a detail record fills every part of it', () => {
    const parts = ['player_control', 'prerequisites', 'engine_rule', 'resource_time_cost', 'downstream_effects', 'failure_recovery', 'save_behaviour', 'research_classification'];
    const detailed = children.filter((c) => parts.some((k) => c[k]));
    expect(detailed.length).toBeGreaterThan(0);
    for (const c of detailed) for (const k of parts) expect(c[k], `${c.child_id} ${k}`).not.toBe('');
  });

  it('a verified child cites evidence that exists; anything short of verified names its gap', () => {
    for (const c of children) {
      expect(STATUSES, c.child_id).toContain(c.status);
      const evidence = c.evidence ? c.evidence.split(' | ') : [];
      if (c.status === 'VERIFIED' || c.status === 'VERIFIED EXISTING') expect(evidence.length, c.child_id).toBeGreaterThan(0);
      else expect(c.remaining_gap, c.child_id).not.toBe('');
      for (const e of evidence) {
        const [file, words] = e.split('::');
        expect(existsSync(join(ROOT, file)), `${c.child_id}: ${file}`).toBe(true);
        expect(words, `${c.child_id}: ${e}`).toBeTruthy();
        expect(readFileSync(join(ROOT, file), 'utf8').includes(words), `${c.child_id}: "${words}" in ${file}`).toBe(true);
      }
    }
  });
});
