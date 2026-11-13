// Each scheduled event kind has one handler (state.ts registerHandler keeps the last one registered). On November 13,
// 2026 the Release Plan's 'licence-answer' replaced music.ts's handler of the same name, and every song licence request
// stayed open for ever; nothing said so until the music tests failed. This fails a second registration of a kind.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Replaced on purpose: state.ts holds industry decisions until industry.ts loads with the catalog and takes them. */
const PLACEHOLDERS = new Set(['industry-decision']);
const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? files(join(dir, d.name)) : d.name.endsWith('.ts') ? [join(dir, d.name)] : []));

describe('event handlers', () => {
  it('each event kind is registered once, in one place', () => {
    const seen = new Map<string, string[]>();
    for (const f of files('src')) for (const m of readFileSync(f, 'utf8').matchAll(/registerHandler\('([^']+)'/g)) seen.set(m[1], [...(seen.get(m[1]) ?? []), f]);
    expect([...seen].filter(([k, at]) => at.length > 1 && !PLACEHOLDERS.has(k))).toEqual([]);
    expect(seen.size).toBeGreaterThan(20);
  });
});
