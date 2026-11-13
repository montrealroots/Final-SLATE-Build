// The v6 journey matrix (docs/v6/JOURNEYS.md, the owner's v6 package's J01 to J22): every journey is a row, in order, with
// one of the matrix's three statuses; every file a row cites exists; a row called Covered has a browser journey and says
// nothing is missing; and the counts under the table are the table's.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const STATUSES = ['Covered', 'Partly Covered', 'Not Covered'];
const text = readFileSync('docs/v6/JOURNEYS.md', 'utf8');
const rows = text.split('\n').filter((l) => /^\| J\d\d /.test(l)).map((l) => {
  const [journey, status, e2e, tests, , missing] = l.slice(1, -1).split('|').map((x) => x.trim());
  return { id: journey.slice(0, 3), status, e2e, tests, missing };
});
const cited = (cell: string) => [...cell.matchAll(/`([^`]+)`/g)].map((m) => m[1]);

describe('the v6 journey matrix', () => {
  it('has J01 to J22 in order, each with a status of its own three', () => {
    expect(rows.map((r) => r.id)).toEqual(Array.from({ length: 22 }, (_, i) => `J${String(i + 1).padStart(2, '0')}`));
    expect(rows.filter((r) => !STATUSES.includes(r.status)).map((r) => `${r.id}: ${r.status}`)).toEqual([]);
  });
  it('cites files that exist, and calls a journey Covered only with a browser journey and nothing missing', () => {
    expect(rows.flatMap((r) => [...cited(r.e2e), ...cited(r.tests)].filter((x) => !existsSync(x)).map((x) => `${r.id}: ${x}`))).toEqual([]);
    expect(rows.filter((r) => r.status === 'Covered' && (!cited(r.e2e).some((x) => x.startsWith('e2e/')) || r.missing)).map((r) => r.id)).toEqual([]);
    expect(rows.filter((r) => r.status !== 'Covered' && !r.missing).map((r) => r.id)).toEqual([]);
  });
  it('counts what the table says', () => {
    const n = (st: string) => rows.filter((r) => r.status === st).length;
    expect(text).toContain(`Covered: ${n('Covered')} (${rows.filter((r) => r.status === 'Covered').map((r) => r.id).join(', ')}). Partly Covered: ${n('Partly Covered')}. Not Covered: ${n('Not Covered')}.`);
  });
});
