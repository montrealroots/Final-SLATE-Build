import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';

/**
 * The UI inventory (docs/v3/ui-inventory.json) is what the coverage matrix is a matrix of. A dialog, a screen or a
 * project tab added to the game without a row there would be a screen nobody is asked to measure, so this fails it
 * (the owner's UI brief of November 12, 2026: "Audit the v3 features as they are added, too").
 */
const rows = JSON.parse(readFileSync('docs/v3/ui-inventory.json', 'utf8')) as { id: string; kind: string; screen?: string; dialog?: string; source?: string }[];
const files = readdirSync('src/ui').filter((f) => f.endsWith('.tsx'));
const text = (f: string) => readFileSync(`src/ui/${f}`, 'utf8');

describe('the UI inventory', () => {
  it('has a row for every dialog the source opens', () => {
    const inSource = files.flatMap((f) => [...text(f).matchAll(/<Modal title=(\{`[^`$]*|\{[\w.]+\}|"[^"]*")/g)].map((m) => `${f.replace('.tsx', '')} | ${m[1]}`));
    expect(inSource.length).toBeGreaterThan(30);
    const listed = rows.filter((r) => r.kind === 'dialog').map((r) => r.source ?? '');
    expect(inSource.filter((s) => !listed.some((l) => l.startsWith(s) || s.startsWith(l))).sort()).toEqual([]);
  });

  it('has a row for every screen the game can go to and every tab of a project', () => {
    const views = new Set(files.flatMap((f) => [...text(f).matchAll(/view: '([a-z-]+)'/g)].map((m) => m[1])));
    views.delete('project');
    const tabs = [...text('Projects.tsx').matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1]);
    expect(tabs.length).toBeGreaterThan(8);
    const screens = new Set(rows.map((r) => r.screen));
    expect([...views].filter((v) => !screens.has(v)).sort()).toEqual([]);
    expect(tabs.filter((t) => !screens.has(`project:${t}`))).toEqual([]);
  });

  it('gives each row an id of its own, and each dialog a way to be recognised', () => {
    expect(rows.map((r) => r.id).filter((id, i, all) => all.indexOf(id) !== i)).toEqual([]);
    expect(rows.filter((r) => r.kind === 'dialog' && !r.dialog).map((r) => r.id)).toEqual([]);
  });
});
