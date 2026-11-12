import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The stylesheet's foundation (the owner's UI brief of November 12, 2026, part 2): one set of widths, and no rule
 * for a class nothing wears. On November 12, 2026 the sheet had twelve widths and 305 rules for 165 classes no
 * source file used, some of which still reached live elements by a shared name (`.cal-day` was styled twice).
 */
const css = readFileSync('src/ui/app.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : /\.tsx?$/.test(p) ? [p] : []; });

describe('the stylesheet', () => {
  it('turns only at the widths its head lists', () => {
    const allowed = new Set(['(max-width: 620px)', '(min-width: 621px)', '(max-width: 56.25em)', '(max-width: 56.25em), (max-height: 500px)', '(min-width: 56.3125em) and (min-height: 501px)', '(max-height: 500px)', '(max-height: 500px) and (max-width: 760px)', '(max-width: 64em)', '(pointer: coarse)', '(prefers-reduced-motion: reduce)', 'print']);
    const used = [...css.matchAll(/@media([^{]+)\{/g)].map((m) => m[1].trim());
    expect(used.length).toBeGreaterThan(10);
    expect([...new Set(used.filter((q) => !allowed.has(q)))]).toEqual([]);
  });

  it('has no rule for a class no source file names', () => {
    // A class counts as named when it is a word inside a string in the source; that lets through a class that
    // shares a name with some other string, which is the cheap side to be wrong on.
    const words = new Set<string>();
    for (const p of [...walk('src'), 'index.html']) for (const m of readFileSync(p, 'utf8').matchAll(/'([^'\n]*)'|"([^"\n]*)"|`([^`]*)`/g)) for (const w of (m[1] ?? m[2] ?? m[3] ?? '').match(/[\w-]+/g) ?? []) words.add(w);
    const classes = new Set([...css.replace(/\{[^{}]*\}/g, '{}').matchAll(/\.(-?[a-zA-Z_][\w-]*)/g)].map((m) => m[1]));
    expect(classes.size).toBeGreaterThan(150);
    expect([...classes].filter((c) => !words.has(c)).sort()).toEqual([]);
  });

  it('never stops a person from zooming', () => {
    const viewport = /<meta name="viewport" content="([^"]*)"/.exec(readFileSync('index.html', 'utf8'))?.[1] ?? '';
    expect(viewport).toContain('width=device-width');
    expect(viewport).not.toMatch(/user-scalable\s*=\s*(no|0)|maximum-scale/);
  });
});
