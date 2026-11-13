// The v6 requirement ledger (docs/v6/requirements.csv, the owner's Connected Realism package of November 13, 2026):
// every one of the package's 48 requirements is a row, each status is one of the package's own, and every path a row
// cites exists. A row can't be called verified on a test that isn't there.
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';

const STATUSES = ['specified', 'not started', 'implemented/unverified', 'verified in automated tests', 'verified in UI', 'data-limited', 'blocked', 'superseded by owner'];
function rows(file: string): Record<string, string>[] {
  const text = readFileSync(file, 'utf8').trim();
  const parse = (line: string) => { const out: string[] = []; let cur = ''; let q = false; for (let i = 0; i < line.length; i++) { const c = line[i]; if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; } else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
  const [head, ...lines] = text.split('\n');
  const keys = parse(head);
  return lines.map((l) => Object.fromEntries(parse(l).map((v, i) => [keys[i], v])));
}

describe('the v6 requirement ledger', () => {
  const ledger = rows('docs/v6/requirements.csv');
  it('has every requirement of the package, in its order, with a status of the package\'s own', () => {
    expect(ledger.map((r) => r.id)).toEqual(rows('docs/v6/package/08-REQUIREMENTS.csv').map((r) => r.id));
    expect(ledger.filter((r) => !STATUSES.includes(r.status)).map((r) => `${r.id}: ${r.status}`)).toEqual([]);
  });
  it('cites only files that exist, and calls nothing verified without a test', () => {
    const paths = (r: Record<string, string>) => `${r.implementation_paths}; ${r.test_paths}`.split(';').map((x) => x.trim()).filter(Boolean);
    expect(ledger.flatMap((r) => paths(r).filter((x) => !existsSync(x)).map((x) => `${r.id}: ${x}`))).toEqual([]);
    expect(ledger.filter((r) => r.status.startsWith('verified') && !r.test_paths.trim()).map((r) => r.id)).toEqual([]);
    expect(ledger.filter((r) => r.status === 'verified in UI' && !/e2e\//.test(r.test_paths)).map((r) => r.id)).toEqual([]);
  });
});
