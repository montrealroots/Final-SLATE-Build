// The bank screens' controls (src/ui/bankworld, ported from 1221), as the input audit and the field inventory name them:
// plain <input>, <select> and <textarea>, each by its id, or its aria-label where it has none, and its occurrence in its
// file. The tag is read to its own end, as an attribute can hold `=>` and a template its own braces.
// tools/input-audit/controls.py reads them the same way. From November 16, 2026.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface RawControl { file: string; label: string; n: number; tag: string; element: 'input' | 'select' | 'textarea' }

const attr = (tag: string, name: string): string | undefined => {
  const m = new RegExp(`\\b${name}=`).exec(tag);
  if (!m) return undefined;
  const i = m.index + m[0].length;
  if (tag[i] === '"') return tag.slice(i, tag.indexOf('"', i + 1) + 1);
  let depth = 0, j = i;
  do { depth += tag[j] === '{' ? 1 : tag[j] === '}' ? -1 : 0; j++; } while (depth !== 0);
  return tag.slice(i, j);
};

/** Every plain control in the bank screens, file by file in order, named as src/ui names its files. */
export function bankControls(root = process.cwd()): RawControl[] {
  const files = (readdirSync(join(root, 'src/ui/bankworld'), { recursive: true }) as string[]).filter((x) => x.endsWith('.tsx')).map((x) => `bankworld/${x.replaceAll('\\', '/')}`).sort();
  const out: RawControl[] = [];
  for (const file of files) {
    const s = readFileSync(join(root, 'src/ui', file), 'utf8');
    const seen = new Map<string, number>();
    for (const m of s.matchAll(/<(input|select|textarea)\b/g)) {
      let depth = 0, j = m.index! + m[0].length;
      while (!(s[j] === '>' && depth === 0)) { depth += s[j] === '{' ? 1 : s[j] === '}' ? -1 : 0; j++; }
      const tag = s.slice(m.index! + m[0].length, j);
      const id = attr(tag, 'id'), aria = attr(tag, 'aria-label');
      const label = id ? `id=${id}` : aria ? `aria-label=${aria}` : '?';
      const n = (seen.get(label) ?? 0) + 1;
      seen.set(label, n);
      out.push({ file, label, n, tag, element: m[1] as RawControl['element'] });
    }
  }
  return out;
}

/** What kind of control it is, in the field inventory's words: a list, a date, a yes or no, a number or text. */
export function rawWidget(c: RawControl): string {
  if (c.element === 'select') return 'select';
  if (c.element === 'textarea') return 'textarea (long text)';
  const type = /\btype="(\w+)"/.exec(c.tag)?.[1];
  if (type === 'checkbox') return 'input (checkbox)';
  if (type === 'date') return 'input (date)';
  if (type === 'number' || /inputMode="(decimal|numeric)"/.test(c.tag)) return 'input (number)';
  return 'input (text)';
}
