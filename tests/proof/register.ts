// The feature register (the owner's command of November 14, 2026: "a full coverage matrix of my entire game from
// beginning to end covering all features"). It is read from the code, not typed, so a feature can't be left out:
// - action: an engine function a screen calls inside a change to the game (store.act, act, run), found by the
//   TypeScript compiler following each call to its declaration under src/engine;
// - bank: a command of the bank world a screen runs (run('kind')), and every command the bank world registers;
// - scheduled: a kind of event the engine handles as time passes (registerHandler);
// - field: a labelled control, from docs/input-audit/CONTROLS.csv, which tests/input-audit.test.ts holds to the UI.
import ts from 'typescript';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

export type FeatureKind = 'action' | 'bank' | 'scheduled' | 'field';
export interface Feature { id: string; kind: FeatureKind; name: string; module: string; usedAt: string[] }

const ROOT = process.cwd();
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const rel = (p: string) => relative(ROOT, p).replace(/\\/g, '/');

/** Engine functions the screens call while changing the game, each with where. */
export function actions(): Feature[] {
  const files = walk(join(ROOT, 'src/ui')).filter((f) => /\.tsx?$/.test(f));
  const program = ts.createProgram(files, { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, allowJs: false, skipLibCheck: true, noEmit: true, resolveJsonModule: true });
  const checker = program.getTypeChecker();
  const out = new Map<string, Feature>();
  const isChange = (n: ts.Node): boolean => {
    for (let a: ts.Node | undefined = n.parent; a; a = a.parent) {
      if (ts.isCallExpression(a)) {
        const c = a.expression;
        const name = ts.isIdentifier(c) ? c.text : ts.isPropertyAccessExpression(c) ? c.name.text : '';
        if (name === 'act') return true;
      }
    }
    return false;
  };
  for (const sf of program.getSourceFiles()) {
    if (!sf.fileName.includes('/src/ui/')) continue;
    const visit = (n: ts.Node) => {
      if (ts.isCallExpression(n) && isChange(n)) {
        let sym = checker.getSymbolAtLocation(ts.isPropertyAccessExpression(n.expression) ? n.expression.name : n.expression);
        if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
        const decl = sym?.declarations?.[0];
        const file = decl?.getSourceFile().fileName;
        if (decl && file && file.includes('/src/engine/') && (ts.isFunctionDeclaration(decl) || ts.isMethodDeclaration(decl) || ts.isVariableDeclaration(decl))) {
          const module = rel(file);
          const name = sym!.getName();
          const id = `action:${module.replace(/^src\/engine\//, '').replace(/\.ts$/, '')}.${name}`;
          const f = out.get(id) ?? { id, kind: 'action' as const, name, module, usedAt: [] };
          const { line } = sf.getLineAndCharacterOfPosition(n.getStart());
          f.usedAt.push(`${rel(sf.fileName)}:${line + 1}`);
          out.set(id, f);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Bank world commands the screens run, by kind. */
export function bankCommands(): Feature[] {
  const out = new Map<string, Feature>();
  for (const f of walk(join(ROOT, 'src/ui')).filter((x) => /\.tsx?$/.test(x))) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/\brun(?:<[^>]*>)?\('([a-z_]+\.[a-z_.]+)'/g)) {
      const line = text.slice(0, m.index).split('\n').length;
      const id = `bank:${m[1]}`;
      const x = out.get(id) ?? { id, kind: 'bank' as const, name: m[1], module: 'src/engine/bankworld', usedAt: [] };
      x.usedAt.push(`${rel(f)}:${line}`);
      out.set(id, x);
    }
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

/** Kinds of event the engine handles as time passes. */
export function scheduled(): Feature[] {
  const out: Feature[] = [];
  for (const f of walk(join(ROOT, 'src/engine')).filter((x) => x.endsWith('.ts') && !x.includes('/bankworld/'))) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/registerHandler\('([^']+)'/g)) {
      const line = text.slice(0, m.index).split('\n').length;
      out.push({ id: `scheduled:${m[1]}`, kind: 'scheduled', name: m[1], module: rel(f), usedAt: [`${rel(f)}:${line}`] });
    }
  }
  // state.ts holds a placeholder for a kind another module handles (industry-decision until industry.ts loads, which
  // replaces it): one feature, the module's.
  const kept = out.filter((f) => !(f.module === 'src/engine/state.ts' && out.some((g) => g.id === f.id && g !== f)));
  return kept.sort((a, b) => a.id.localeCompare(b.id));
}

const parseCsv = (s: string): string[][] => {
  const rows: string[][] = []; let row: string[] = []; let cell = ''; let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === '"' && s[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; } else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
};

/** Labelled controls that hold a decision, an identity or a record (views and components change no outcome by design). */
export function fields(): (Feature & { class: string; consumer: string; effect: string; test: string })[] {
  const [head, ...rows] = parseCsv(readFileSync(join(ROOT, 'docs/input-audit/CONTROLS.csv'), 'utf8'));
  const col = (r: string[], k: string) => r[head.indexOf(k)] ?? '';
  return rows.filter((r) => r.length > 3).map((r) => ({
    id: `field:${col(r, 'screen')}#${col(r, 'label')}#${col(r, 'occurrence')}`, kind: 'field' as const, name: col(r, 'label'), module: col(r, 'consumer'), usedAt: [`src/ui/${col(r, 'screen')}`],
    class: col(r, 'class'), consumer: col(r, 'consumer'), effect: col(r, 'effect'), test: col(r, 'unit_test'),
  }));
}
