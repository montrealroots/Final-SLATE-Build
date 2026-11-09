// The rule-by-rule research record (docs/awards/RULES.csv): for each edition's current rulebook, every rule it applies,
// with the organizer, edition, categories, status, the rule in brief, its source and when it was read, where it is in the
// code and which tests name it; then what was read but not applied (rulebooks' `unresolved`) and the organizers whose rules
// couldn't be read (GAPS). Written from the data and checked against the committed file, so it can't drift from the game.
// A source being readable isn't proof a rule is applied: only rows with a rule column are applied.
// Regenerate after an intended change: LEDGER_WRITE=1 npx vitest run tests/rule-records.test.ts
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RULEBOOKS, institution } from './engine-api';
import { GAPS } from '../src/engine/rulebook-data';
import type { RuleBook } from '../src/engine/rulebooks';

const FILE = 'docs/awards/RULES.csv';
const DATA = readFileSync('src/engine/rulebook-data.ts', 'utf8').split('\n');
const TESTS = readdirSync('tests').filter((f) => f.endsWith('.test.ts') && f !== 'rule-records.test.ts').map((f) => ({ f, text: readFileSync(`tests/${f}`, 'utf8') }));
/** The rulebooks the owner's recovered sources gave on November 9, 2026: each must have a test that names it. */
const RECOVERED = ['international-emmys-2026@2', 'international-emmys-2027@2', 'european-film-awards-2026@1', 'bafta-film-2027@1', 'tiff-2026@1', 'sxsw-2027@2', 'busan-2026@1', 'dga-2027@5', 'fespaco-2027@1', 'amaa-2026@1'];

const csv = (cells: string[]) => cells.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',');
const lineOf = (b: RuleBook) => DATA.findIndex((l) => l.includes(`'${b.id}'`) || (l.includes('`') && l.includes(`${b.institutionId}-\${year}@${b.version}`))) + 1;
const testsOf = (b: RuleBook) => TESTS.filter((t) => t.text.includes(`'${b.id}'`)).map((t) => `tests/${t.f}`).join('; ');

/** The newest rulebook of each edition: what an untouched edition is judged by. */
function current(): RuleBook[] {
  const by = new Map<string, RuleBook>();
  for (const b of RULEBOOKS) { const k = `${b.institutionId}-${b.year}`; if (!by.has(k) || by.get(k)!.version < b.version) by.set(k, b); }
  return [...by.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
}

function rows(): string[] {
  const out = [csv(['organizer', 'edition', 'categories', 'rule', 'status', 'in brief', 'source', 'source url', 'read', 'code', 'tests'])];
  for (const b of current()) {
    const inst = institution(b.institutionId).name;
    const code = `src/engine/rulebook-data.ts:${lineOf(b)}`;
    const tests = testsOf(b);
    const groups = new Map<string, { cats: string[]; cells: string[] }>();
    const add = (catId: string, field: string, r: { status: string; source: string; note?: string; value: unknown }) => {
      const src = b.sources.find((s) => s.id === r.source);
      const cells = [inst, b.id, '', field, r.status, r.note ?? '', src?.title ?? r.source, src?.url ?? '', src?.retrieved ?? '', code, tests];
      const key = JSON.stringify([field, r.value, r.status, r.note, r.source]);
      const g = groups.get(key) ?? { cats: [], cells };
      g.cats.push(catId);
      groups.set(key, g);
    };
    if (b.opens) add('(edition)', 'opens', b.opens);
    if (b.held) add('(edition)', 'held', b.held);
    for (const [catId, rules] of Object.entries(b.categories)) {
      for (const [field, r] of Object.entries(rules)) {
        if (field === 'byFormat') {
          for (const f of r as { formats: string[]; rules: Record<string, { status: string; source: string; note?: string; value: unknown }> }[]) for (const [ff, rr] of Object.entries(f.rules)) add(catId, `${ff} (${f.formats.join('/')})`, rr);
        } else add(catId, field, r as { status: string; source: string; note?: string; value: unknown });
      }
    }
    for (const g of groups.values()) { g.cells[2] = g.cats.join(' '); out.push(csv(g.cells)); }
    for (const u of b.unresolved ?? []) out.push(csv([inst, b.id, u.subject, '', u.status, u.note, u.sources.join('; '), '', b.checked, code, tests]));
  }
  for (const g of GAPS) for (const u of g.unresolved) out.push(csv([institution(g.institutionId).name, `${g.institutionId}-${g.year}`, u.subject, '', u.status, u.note, u.sources.join('; '), '', '2026-11-09', 'src/engine/rulebook-data.ts (GAPS)', '']));
  return out;
}

describe('the rule-by-rule research record', () => {
  it('is the rulebooks as they stand', () => {
    const text = rows().join('\n') + '\n';
    if (process.env.LEDGER_WRITE) writeFileSync(FILE, text);
    expect(readFileSync(FILE, 'utf8')).toBe(text);
  });

  it('every recovered rulebook is the edition\'s current one, has a code location and a test that names it', () => {
    const now = current().map((b) => b.id);
    for (const id of RECOVERED) {
      const b = RULEBOOKS.find((x) => x.id === id)!;
      expect(now, id).toContain(id);
      expect(lineOf(b), id).toBeGreaterThan(0);
      expect(testsOf(b), id).not.toBe('');
    }
  });

  it('what couldn\'t be read or settled is recorded, never applied', () => {
    const text = rows().join('\n');
    expect(text).toMatch(/fespaco-2027@1,dates,,source conflict/);
    expect(text).toMatch(/fespaco-2027@1,deadline,,source conflict/);
    expect(text).toMatch(/amaa-2026@1,eligibility,,ambiguous/);
    expect(text).toMatch(/blue-dragon-2026,eligibility,,unavailable/);
    expect(text).toMatch(/locarno-2027,eligibility,,unavailable/);
  });
});
