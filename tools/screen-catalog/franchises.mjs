// Each studio's live franchises, from the films of a built screen catalog (the owner, November 18, 2026: studios offer
// "the next Batman", invented entries in their own franchises, the rights said in the credits). A franchise is a TMDB
// collection one of the studio's films belongs to; it is live when it has two films or more, or one in the fifteen years
// before the catalog's horizon. The five most recent are kept on the studio's profile in world.json as `fr`, each with
// its films in date order (`films`: ref, title, date, genres; from November 18, 2026, for the franchise on the studio's page) and
// the budget of its latest film whose budget TMDB records (`budget`, `budgetOf`); and the studio's median recorded budget
// over the ten years before the horizon (`mb`, from three films or more), for a picture of its own outside a franchise.
// Only feature films count (over 40 minutes, the Academy's line) and not documentaries: after the international studios
// joined on November 18, 2026, Toho's latest franchise read as the Godzilla Fest shorts (2 to 18 minutes, a $13,103
// budget), Ghibli's as the Ghiblies shorts and its making-of films, and CJ ENM's as a concert film. A collection whose
// TMDB name has no Latin letters (Shochiku's "あの花シリーズ") is called by its first film's English title,
// and left out when that has none either.
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
  const budgets = new Map();
  const tenYears = `${Number(String(world.horizon).slice(0, 4)) - 10}${String(world.horizon).slice(4)}`;
  for (const f of readdirSync(join(dir, 'titles')).filter((x) => x.startsWith('movie-') && x.endsWith('.json'))) {
    const r = JSON.parse(readFileSync(join(dir, 'titles', f), 'utf8'));
    if (!r.date) continue;
    const feature = !(r.runtime > 0 && r.runtime <= 40) && !(r.genres ?? []).includes('Documentary');
    for (const c of r.companies ?? []) {
      if (!names.has(c.name)) continue;
      if (feature && r.budget && r.date >= tenYears && r.date < world.horizon) budgets.set(c.name, [...(budgets.get(c.name) ?? []), r.budget]);
      if (!r.collection || !feature) continue;
      const m = byStudio.get(c.name) ?? new Map();
      const e = m.get(r.collection.name) ?? { entries: 0, last: '', first: null, films: [] };
      e.entries += 1;
      e.films.push({ r: r.ref, t: r.title, d: r.date, g: r.genres ?? [] });
      if (r.date > e.last) e.last = r.date;
      if (!e.first || r.date < e.first.date) e.first = { date: r.date, title: r.title };
      if (r.budget && (!e.budgetOf || r.date > e.budgetOf.date)) e.budgetOf = { date: r.date, title: r.title, budget: r.budget };
      m.set(r.collection.name, e);
      byStudio.set(c.name, m);
    }
  }
  let studios = 0;
  for (const s of world.studios) {
    const live = [...(byStudio.get(s.name) ?? new Map())].filter(([name, e]) => (e.entries >= 2 || e.last >= from) && /[A-Za-z]/.test(name + e.first.title)).sort((a, b) => b[1].last.localeCompare(a[1].last) || a[0].localeCompare(b[0])).slice(0, 5);
    if (live.length) { s.fr = live.map(([name, e]) => ({ name: /[A-Za-z]/.test(name) ? name : e.first.title, entries: e.entries, last: e.last, films: e.films.sort((a, b) => a.d.localeCompare(b.d)), ...(e.budgetOf ? { budget: e.budgetOf.budget, budgetOf: `${e.budgetOf.title} (${e.budgetOf.date.slice(0, 4)})` } : {}) })); studios++; }
    else delete s.fr;
    const b = (budgets.get(s.name) ?? []).sort((x, y) => x - y);
    if (b.length >= 3) s.mb = b[b.length >> 1]; else delete s.mb;
  }
  writeFileSync(worldPath, JSON.stringify(world));
  return { studios, of: world.studios.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(addFranchises(process.argv[2] ?? '.screen-catalog')));
