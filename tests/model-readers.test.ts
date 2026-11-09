// Every field of the saved game (src/engine/types.ts) is read by the game: by a rule that decides something, or by a
// screen that shows it. A field only written, validated or migrated is a word with nothing that reads it. Found with
// the TypeScript language service, so a name shared by several types (title, status) counts only for its own field.
// Written November 9, 2026, after the input audit found 61 fields nothing read and 4 inputs that changed nothing.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const TYPES = join(root, 'src/engine/types.ts');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    return e.isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(e.name) && !e.name.endsWith('.d.ts') ? [p] : [];
  });
}

/** Whether this reference to a property is a write: an assignment, a value in an object literal, or an array change. */
function isWrite(node: ts.Node): boolean {
  const p = node.parent;
  if (!p) return false;
  if ((ts.isPropertyAssignment(p) && p.name === node) || ts.isShorthandPropertyAssignment(p)) return true;
  if (ts.isPropertyAccessExpression(p) && p.name === node) {
    let e: ts.Node = p;
    while (e.parent && (ts.isNonNullExpression(e.parent) || ts.isParenthesizedExpression(e.parent))) e = e.parent;
    const q = e.parent;
    if (q && ts.isBinaryExpression(q) && q.left === e && q.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && q.operatorToken.kind <= ts.SyntaxKind.LastAssignment) return true;
    if (q && (ts.isPrefixUnaryExpression(q) || ts.isPostfixUnaryExpression(q)) && (q.operator === ts.SyntaxKind.PlusPlusToken || q.operator === ts.SyntaxKind.MinusMinusToken)) return true;
    if (q && ts.isDeleteExpression(q)) return true;
    if (q && ts.isPropertyAccessExpression(q) && ['push', 'splice', 'unshift'].includes(q.name.text) && q.parent && ts.isCallExpression(q.parent)) return true;
  }
  return false;
}

/** The function a node is in, by name ('' at the top of a file). */
function enclosing(node: ts.Node): string {
  for (let n: ts.Node | undefined = node; n; n = n.parent) {
    if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name) return n.name.getText();
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer))) return n.name.text;
  }
  return '';
}

function unreadFields(): string[] {
  const files = sourceFiles(join(root, 'src'));
  const host: ts.LanguageServiceHost = {
    getScriptFileNames: () => files,
    getScriptVersion: () => '1',
    getScriptSnapshot: (f) => (existsSync(f) ? ts.ScriptSnapshot.fromString(readFileSync(f, 'utf8')) : undefined),
    getCurrentDirectory: () => root,
    getCompilationSettings: () => ({ target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, jsx: ts.JsxEmit.ReactJSX, strict: true, noEmit: true, skipLibCheck: true, resolveJsonModule: true }),
    getDefaultLibFileName: (o) => ts.getDefaultLibFilePath(o),
    fileExists: ts.sys.fileExists,
    readFile: ts.sys.readFile,
    readDirectory: ts.sys.readDirectory,
    directoryExists: ts.sys.directoryExists,
    getDirectories: ts.sys.getDirectories,
  };
  const ls = ts.createLanguageService(host, ts.createDocumentRegistry());
  const program = ls.getProgram()!;
  const sf = program.getSourceFile(TYPES)!;
  const nodeAt = (file: string, pos: number): ts.Node | undefined => {
    const s = program.getSourceFile(file);
    if (!s) return undefined;
    let found: ts.Node | undefined;
    const visit = (n: ts.Node) => { if (pos >= n.getStart(s) && pos < n.getEnd()) { found = n; ts.forEachChild(n, visit); } };
    visit(s);
    return found;
  };
  // Validation checks a field's shape and a migration carries it forward: neither is the game using it.
  const counts = (file: string, node: ts.Node) => !/src\/engine\/(types|validate)\.ts$/.test(file) && !/^migrate/.test(enclosing(node));
  const out: string[] = [];
  const collect = (owner: string, members: ts.NodeArray<ts.TypeElement>, prefix: string) => {
    for (const m of members) {
      if (!ts.isPropertySignature(m)) continue;
      const name = `${prefix}${m.name.getText(sf)}`;
      const refs = ls.findReferences(TYPES, m.name.getStart(sf)) ?? [];
      const read = refs.some((r) => r.references.some((e) => {
        if (e.isDefinition) return false;
        const node = nodeAt(e.fileName, e.textSpan.start);
        return !!node && !isWrite(node) && counts(e.fileName, node);
      }));
      if (!read) out.push(`${owner}.${name}`);
      const t = m.type;
      if (t && ts.isTypeLiteralNode(t)) collect(owner, t.members, `${name}.`);
      if (t && ts.isArrayTypeNode(t) && ts.isTypeLiteralNode(t.elementType)) collect(owner, t.elementType.members, `${name}[].`);
    }
  };
  ts.forEachChild(sf, (n) => {
    if (ts.isInterfaceDeclaration(n)) collect(n.name.text, n.members, '');
    else if (ts.isTypeAliasDeclaration(n) && ts.isTypeLiteralNode(n.type)) collect(n.name.text, n.type.members, '');
  });
  void relative;
  return out;
}

describe('the saved game', () => {
  it('has no field the game never reads', () => {
    expect(unreadFields()).toEqual([]);
  }, 180_000);
});
