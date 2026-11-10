// The input audit's control table (docs/input-audit/CONTROLS.csv) against the UI as it stands. Every labelled control a
// player meets is in the table once, with a class; a decision names the code that reads it and a test that compares
// it; and every cited test is a test that exists. Written November 10, 2026, for the gameplay-connectivity pass. The
// table is written by tools/input-audit/controls.py, which holds the classification and why.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const CLASSES = ['decision', 'identity', 'record', 'view', 'component'];

/** RFC 4180 rows: quoted fields may hold commas, quotes (doubled) and newlines. */
function csv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (ch === '"') quoted = false; else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

/** Each labelled control in src/ui, as file, label as written, and which occurrence of that label in the file. */
function controls(): string[] {
  const rx = /<(TextField|SelectField|NumberField|Check|PlacePicker|LanguagePicker|GenrePicker|WorldPlacePicker)\b([^>]*?)(\/>|>)/gs;
  const out: string[] = [];
  for (const f of readdirSync(join(root, 'src/ui')).filter((x) => x.endsWith('.tsx')).sort()) {
    const seen = new Map<string, number>();
    for (const m of readFileSync(join(root, 'src/ui', f), 'utf8').matchAll(rx)) {
      const label = /label=(\{`[^`]*`\}|"[^"]*"|\{[^}]*\})/.exec(m[2])?.[1] ?? '?';
      const n = (seen.get(label) ?? 0) + 1;
      seen.set(label, n);
      out.push(`${f} | ${label} | ${n}`);
    }
  }
  return out;
}

describe('the input audit', () => {
  const [head, ...rows] = csv(readFileSync(join(root, 'docs/input-audit/CONTROLS.csv'), 'utf8'));
  const col = (r: string[], name: string) => r[head.indexOf(name)];

  it('lists every labelled control once, and nothing that is gone', () => {
    expect(rows.map((r) => `${col(r, 'screen')} | ${col(r, 'label')} | ${col(r, 'occurrence')}`)).toEqual(controls());
  });

  it('classes every control; a decision names what reads it and a test that shows the difference', () => {
    for (const r of rows) {
      expect(CLASSES, col(r, 'label')).toContain(col(r, 'class'));
      if (col(r, 'class') !== 'decision') continue;
      expect(col(r, 'consumer'), col(r, 'label')).not.toBe('');
      expect(col(r, 'effect'), col(r, 'label')).not.toBe('');
      expect(col(r, 'unit_test'), col(r, 'label')).not.toBe('');
    }
  });

  it('cites only tests that exist, by words in their names', () => {
    const titles = new Map<string, string[]>();
    const names = (file: string) => {
      if (!titles.has(file)) {
        const src = readFileSync(join(root, file), 'utf8');
        titles.set(file, [...src.matchAll(/\b(?:it|test|describe)\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g)].map((m) => m[2].replace(/\\(.)/g, '$1')));
      }
      return titles.get(file)!;
    };
    for (const r of rows) {
      for (const ref of [col(r, 'unit_test'), col(r, 'journey')].filter(Boolean)) {
        const [file, words] = ref.split('::');
        expect(names(file).some((t) => t.includes(words)), `${col(r, 'label')}: ${ref}`).toBe(true);
      }
    }
  });
});
