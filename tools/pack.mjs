// Builds the data packs a player installs in Settings (docs/DATA-PACKS.md): the film catalog from .screen-catalog/ and
// the cinemas from .cinemas/. They are written to packs/, which is kept out of the repository: the catalog is TMDB's
// content, and who may be given a copy is the owner's decision (docs/DEPLOYMENT.md).
//   node tools/pack.mjs [catalog|cinemas ...]
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { writePack } from './pack-format.mjs';

/** Every JSON file under `base`, as [the path the game asks for, its text]. */
function* jsonFiles(base, prefix, dir = base) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) yield* jsonFiles(base, prefix, p);
    else if (e.name.endsWith('.json')) yield [prefix + relative(base, p).split('\\').join('/'), readFileSync(p, 'utf8')];
  }
}
const DIRS = { catalog: '.screen-catalog', cinemas: '.cinemas' };
const day = (iso) => iso.slice(0, 10);
const kinds = process.argv.slice(2).length ? process.argv.slice(2) : ['catalog', 'cinemas'];
mkdirSync('packs', { recursive: true });
for (const kind of kinds) {
  const dir = DIRS[kind];
  if (!dir) throw new Error(`Unknown pack "${kind}": catalog or cinemas.`);
  if (!existsSync(join(dir, 'index.json'))) { console.log(`${kind}: nothing gathered in ${dir}, skipped`); continue; }
  const index = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8'));
  const meta = kind === 'catalog'
    ? { kind, name: 'Films And Series', source: 'TMDB', builtAt: index.builtAt, retrieved: index.retrieved }
    : { kind, name: 'Cinemas', source: 'Wikidata (CC0)', builtAt: index.builtAt };
  if (kind === 'catalog' && !index.retrieved?.from) throw new Error('The catalog index records no retrieval date, so its six months can\'t be kept.');
  const files = [...jsonFiles(dir, kind === 'cinemas' ? 'cinemas/' : '')];
  const out = join('packs', `slate-${kind}-${day(index.builtAt)}.slatepack`);
  const buf = writePack(meta, files);
  writeFileSync(out, buf);
  console.log(`${out}: ${files.length} files, ${(buf.length / 1048576).toFixed(1)} MB`);
}
