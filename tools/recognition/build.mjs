// How the industry has judged people, from Wikidata (CC0): every win and nomination of the awards whose voters are the
// people who make films and television (the Academy, BAFTA, the Screen Actors Guild, the Television Academy), the
// critics and press who judge them (the Golden Globes, the Critics' Choice), and the juries of the three oldest festivals
// (Cannes, Venice, Berlin), with the Independent Spirit and César awards. Each is kept by the job it recognises, for
// people Wikidata links to a TMDB person ID (P4985), so the film catalog's people and these records meet on one ID.
//
// Run: node tools/recognition/build.mjs (needs query.wikidata.org). Writes src/data/recognition.json. What is kept is
// what Wikidata states: a person's award (P166) and nomination (P1411) statements, each with its year where the
// statement has one. Nothing is scored here; src/engine/recognition.ts reads it and says how.
import { writeFileSync } from 'node:fs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'slate-build/1.0 (game data tool)';

/** The bodies, by the start of their categories' English names on Wikidata. */
export const BODIES = [
  ['oscar', /^Academy Award for /],
  ['bafta', /^(BAFTA Award for |British Academy Film Award)/],
  ['bafta-tv', /^British Academy Television (Craft )?Award/],
  ['globe', /^Golden Globe Award for /],
  ['sag', /^Screen Actors Guild Award for /],
  ['emmy', /^Primetime (Creative Arts )?Emmy Award for /],
  ['cannes', /^Cannes Film Festival Award for Best (Actor|Actress|Director|Screenplay)/],
  ['venice', /^(Volpi Cup|Silver Lion)/],
  ['berlin', /^Silver Bear for Best (Actor|Actress|Leading|Supporting|Director|Screenplay)/],
  ['critics', /^Critics' Choice (Movie |Television )?Award for /],
  ['spirit', /^Independent Spirit Award for /],
  ['cesar', /^César Award for /],
];
/** Honours for a whole career, or for a film rather than someone's work on it, which say nothing about the job. */
const NOT_A_JOB = /Honorary|Lifetime|Cecil B|Carol Burnett|Jean Hersholt|Thalberg|Special|Humanitarian|Best (Motion )?Picture|Best Film|Best (Drama|Comedy|Limited|Animated|Documentary|Foreign|International|Short)|Outstanding (Drama|Comedy|Limited|Variety|Television Movie|Animated|Children)|Best (Television )?Series|Program/i;
/** The game's jobs a category recognises, by what its name says. */
const JOBS = [
  ['voice-actor', /Voice/i],
  ['casting-director', /Casting/i],
  ['stunt-coordinator', /Stunt/i],
  ['choreographer', /Choreograph/i],
  ['hair-makeup', /Make-?up|Hair/i],
  ['costume-designer', /Costume/i],
  ['production-designer', /Production Design|Art Direction|Set Decoration/i],
  ['dop', /Cinematograph/i],
  ['vfx-artist', /Visual Effects|Special (Visual )?Effects/i],
  ['sound-mixer', /Sound (Mixing|Recording)|Best Sound$|Sound$/i],
  ['re-recording-mixer', /Sound (Mixing|Recording)|Best Sound$|Sound$/i],
  ['sound-designer', /Sound (Editing|Effects)|Best Sound$|Sound$/i],
  ['editor', /(Film|Picture) Editing|Best Editing|Editor/i],
  ['songwriter', /Original Song/i],
  ['composer', /Score|Original Music|Music Composition|Best Music/i],
  ['co-writer', /Screenplay|Writing|Writer/i],
  ['episode-writer', /Screenplay|Writing|Writer/i],
  ['episode-director', /Direct(or|ing)\b(?!.*(Art|Photography))/i],
  ['actor', /Act(or|ress)|Performance by|Lead(ing)? Role|Supporting Role|Ensemble|Cast in/i],
];

async function sparql(query) {
  for (let i = 0; i < 4; i++) {
    const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ query, format: 'json' })}`, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } });
    if (res.ok) return (await res.json()).results.bindings;
    console.error(`\nWikidata answered ${res.status}: ${(await res.text()).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw new Error(`Wikidata refused a query: ${query.slice(0, 120)}`);
}
const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1);

const CLASSES = 'wd:Q19020 wd:Q732997 wd:Q1044427 wd:Q28444913 wd:Q56116950 wd:Q107549740 wd:Q38033430 wd:Q96474676 wd:Q96474589 wd:Q708135 wd:Q174389 wd:Q223740';
const rows = await sparql(`SELECT DISTINCT ?award ?label WHERE { VALUES ?cls { ${CLASSES} } ?award wdt:P31 ?cls . ?award rdfs:label ?label . FILTER(LANG(?label) = "en") }`);
const categories = {};
for (const r of rows) {
  const label = r.label.value;
  const body = BODIES.find(([, re]) => re.test(label))?.[0];
  if (!body || NOT_A_JOB.test(label)) continue;
  const jobs = JOBS.filter(([, re]) => re.test(label)).map(([j]) => j);
  // A category for performers names only them; one that also matched a crew job by a word in passing keeps the crew job.
  const kept = jobs.includes('actor') && jobs.length > 1 ? jobs.filter((j) => j !== 'actor') : jobs;
  if (kept.length) categories[qid(r.award.value)] = { label, body, jobs: kept };
}
const ids = Object.keys(categories);
console.log(`${ids.length} categories`);

const people = {};
// Statement first and one property at a time: asked the other way round, Wikidata's query service runs out of time.
const STEP = 10;
for (let i = 0; i < ids.length; i += STEP) {
  const chunk = ids.slice(i, i + STEP).map((x) => `wd:${x}`).join(' ');
  for (const [prop, won] of [['P166', 1], ['P1411', 0]]) {
    const got = await sparql(`SELECT ?st ?award ?tmdb ?name ?born ?died ?time WHERE {
      VALUES ?award { ${chunk} }
      ?st ps:${prop} ?award .
      ?p p:${prop} ?st .
      ?p wdt:P4985 ?tmdb .
      OPTIONAL { ?st pq:P585 ?time }
      OPTIONAL { ?p wdt:P569 ?born } OPTIONAL { ?p wdt:P570 ?died }
      OPTIONAL { ?p rdfs:label ?name . FILTER(LANG(?name) = "en") }
    }`);
    const seen = new Set();
    for (const r of got) {
      const st = r.st.value;
      if (seen.has(st)) continue; // a person with two recorded birth dates comes back twice
      seen.add(st);
      const tmdb = r.tmdb.value;
      if (!/^\d+$/.test(tmdb)) continue;
      const p = (people[tmdb] ??= { name: null, born: r.born?.value.slice(0, 10) ?? null, died: r.died?.value.slice(0, 10) ?? null, marks: [] });
      p.name ??= r.name?.value ?? null; // a row without the English name may come first
      p.marks.push([qid(r.award.value), won, r.time ? Number(r.time.value.slice(0, 4)) : null]);
    }
  }
  process.stdout.write(`\r${Math.min(i + STEP, ids.length)} of ${ids.length} categories read, ${Object.keys(people).length} people`);
}
console.log();

// Compact: categories once; each person's marks as [category index, won, year].
const index = Object.fromEntries(ids.map((x, n) => [x, n]));
const out = {
  dataset: 'recognition',
  version: 1,
  about: 'Award wins (P166) and nominations (P1411) recorded on Wikidata for people with a TMDB person ID (P4985), in the categories listed, read by tools/recognition/build.mjs. Only what Wikidata states is here; a category or a year it does not state is absent, not guessed.',
  source: { provider: 'Wikidata', url: 'https://query.wikidata.org/', licence: 'CC0 1.0', retrieved: new Date().toISOString().slice(0, 10) },
  categories: ids.map((x) => ({ id: x, ...categories[x] })),
  people: Object.fromEntries(Object.entries(people).sort(([a], [b]) => Number(a) - Number(b)).map(([t, p]) => [t, [p.name, p.born, p.died, p.marks.map(([c, w, y]) => [index[c], w, y])]])),
};
writeFileSync('src/data/recognition.json', `${JSON.stringify(out)}\n`);
console.log(`src/data/recognition.json: ${Object.keys(out.people).length} people, ${out.categories.length} categories`);
