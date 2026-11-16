#!/usr/bin/env node
// How widely each person with a TMDB ID is written about: the number of Wikipedia editions with an article on them
// (Wikidata's sitelinks, P4985 for the TMDB person ID), for everyone with ten or more. Recognition (build.mjs) prices
// prestige, what juries and academies gave a person; it doesn't price what drawing an audience is paid, so a star with
// few awards was under-priced (Daniel Craig at about 2% of his reported fee), and a star with none (Dwayne Johnson) asked
// a working actor's rate. This is the measure of fame the engine adds beside it (recognition.ts fameOf). Wikidata is CC0.
// One query; the result goes into src/data/recognition.json as `fame`, TMDB ID to editions.
//
//   node tools/recognition/fame.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'slate-build/1.0 (game data tool)';
const FILE = 'src/data/recognition.json';
/** The fewest editions kept: below it, fame asks less than recognition's own floor (recognition.ts). */
export const FAME_MIN = 10;

export async function fameMap() {
  const query = `SELECT ?tmdb ?sl WHERE { ?p wdt:P4985 ?tmdb ; wikibase:sitelinks ?sl . FILTER(?sl >= ${FAME_MIN}) }`;
  for (let i = 0; i < 6; i++) {
    const res = await fetch(`${ENDPOINT}?${new URLSearchParams({ query, format: 'json' })}`, { headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json' } }).catch(() => null);
    const got = res?.ok ? await res.json().catch(() => null) : null;
    if (got) {
      const out = {};
      // A TMDB ID on two Wikidata items keeps the larger count.
      for (const r of got.results.bindings) if (/^\d+$/.test(r.tmdb.value)) out[r.tmdb.value] = Math.max(out[r.tmdb.value] ?? 0, Number(r.sl.value));
      return out;
    }
    await new Promise((r) => setTimeout(r, 5000 * (i + 1)));
  }
  throw new Error('Wikidata refused the query');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const data = JSON.parse(readFileSync(FILE, 'utf8'));
  for (const p of Object.values(data.people)) p.length = Math.min(p.length, 4); // an earlier per-person field
  data.fame = await fameMap();
  data.about = `${data.about.replace(/ Each person's fifth field.*$/, '').replace(/ `fame` is .*$/, '')} \`fame\` is how many Wikipedia editions have an article on each person with a TMDB ID and at least ${FAME_MIN} (Wikidata sitelinks), read by tools/recognition/fame.mjs.`;
  writeFileSync(FILE, JSON.stringify(data));
  console.log(`${Object.keys(data.fame).length} people with ${FAME_MIN} or more editions`);
}
