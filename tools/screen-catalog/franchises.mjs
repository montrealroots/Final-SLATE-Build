// Each studio's live franchises, from the films of a built screen catalog (the owner, November 18, 2026: studios offer
// "the next Batman", invented entries in their own franchises, the rights said in the credits). A franchise is a TMDB
// collection one of the studio's films belongs to; it is live when it has two films or more, or one in the fifteen years
// before the catalog's horizon. The five most recent are kept on the studio's profile in world.json as `fr`.
//   node tools/screen-catalog/franchises.mjs [catalog dir, default .screen-catalog]
// build.mjs runs it on each new build; it also brings an older build up to date without the importer's cache.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export function addFranchises(dir) {
  const worldPath = join(dir, 'world.json');
  const world = JSON.parse(readFileSync(worldPath, 'utf8'));
  const names = new Map(world.studios.map((s) => [s.name, s]));
  const from = `${Number(String(world.horizon).slice(0, 4)) - 15}${String(world.horizon).slice(4)}`;
  const byStudio = new Map();
  for (const f of readdirSync(join(dir, 'titles')).filter((x) => x.startsWith('movie-') && x.endsWith('.json'))) {
    const r = JSON.parse(readFileSync(join(dir, 'titles', f), 'utf8'));
    if (!r.collection || !r.date) continue;
    for (const c of r.companies ?? []) {
      if (!names.has(c.name)) continue;
      const m = byStudio.get(c.name) ?? new Map();
      const e = m.get(r.collection.name) ?? { entries: 0, last: '' };
      e.entries += 1;
      if (r.date > e.last) e.last = r.date;
      m.set(r.collection.name, e);
      byStudio.set(c.name, m);
    }
  }
  let studios = 0;
  for (const s of world.studios) {
    const live = [...(byStudio.get(s.name) ?? new Map())].filter(([, e]) => e.entries >= 2 || e.last >= from).sort((a, b) => b[1].last.localeCompare(a[1].last) || a[0].localeCompare(b[0])).slice(0, 5);
    if (live.length) { s.fr = live.map(([name, e]) => ({ name, entries: e.entries, last: e.last })); studios++; }
    else delete s.fr;
  }
  writeFileSync(worldPath, JSON.stringify(world));
  return { studios, of: world.studios.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(addFranchises(process.argv[2] ?? '.screen-catalog')));
