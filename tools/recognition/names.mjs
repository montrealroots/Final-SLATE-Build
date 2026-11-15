// Names for the people the recognition record holds without one (tools/recognition/build.mjs). The build asked Wikidata
// for each person's English label, and Wikidata now keeps many names once, under "mul" (the label for every language
// written the same way), with no English label beside it: until November 15, 2026, 75 of 6,202 people came back
// nameless, Denzel Washington among them, and the game can't offer someone it can't name (recognition.ts recognisedIn).
// Each is asked for by TMDB person ID (P4985): English, then "mul", then British or American English, in that order.
//
// Run alone: node tools/recognition/names.mjs (needs query.wikidata.org). Fills the blank names in
// src/data/recognition.json and changes nothing else. The build runs the same pass before it writes.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'slate-build/1.0 (game data tool)';
export const LANGS = ['en', 'mul', 'en-gb', 'en-us'];

/** The name for each TMDB person ID Wikidata gives one in LANGS, the first language in that order. */
export async function namesFor(tmdbIds) {
  const out = {};
  for (let i = 0; i < tmdbIds.length; i += 50) {
    const values = tmdbIds.slice(i, i + 50).map((t) => `"${t}"`).join(' ');
    const query = `SELECT ?tmdb ?name (LANG(?name) AS ?lang) WHERE { VALUES ?tmdb { ${values} } ?p wdt:P4985 ?tmdb . ?p rdfs:label ?name . FILTER(LANG(?name) IN (${LANGS.map((l) => `"${l}"`).join(', ')})) }`;
    const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}`, { headers: { Accept: 'application/sparql-results+json', 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Wikidata answered ${res.status}`);
    const best = {};
    for (const b of (await res.json()).results.bindings) {
      const rank = LANGS.indexOf(b.lang.value);
      if (best[b.tmdb.value] === undefined || rank < best[b.tmdb.value].rank) best[b.tmdb.value] = { rank, name: b.name.value };
    }
    for (const [t, { name }] of Object.entries(best)) out[t] = name;
  }
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = 'src/data/recognition.json';
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const blank = Object.entries(data.people).filter(([, r]) => !r[0]).map(([t]) => t);
  const got = await namesFor(blank);
  for (const [t, name] of Object.entries(got)) data.people[t][0] = name;
  writeFileSync(path, `${JSON.stringify(data)}\n`);
  const still = blank.filter((t) => !got[t]);
  console.log(`${Object.keys(got).length} of ${blank.length} blank names filled${still.length ? `; still none for TMDB ${still.join(', ')}` : ''}.`);
}
