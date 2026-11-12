#!/usr/bin/env node
// The source-material catalog (the v3 package, 02: "Source-material catalog: 500+ records"): real novels, short stories,
// plays, comics, video games, online fiction and poems a script could be adapted from, read from Wikidata, which is CC0,
// so unlike TMDB's records these are in the repository (src/data/sources.json).
//
//   node tools/sources/import.mjs            reads Wikidata and writes src/data/sources.json
//
// What it records is what Wikidata records, with where it came from. It writes no synopsis (Wikidata has none), no
// rights status it was not given (a work's copyright status is recorded only where Wikidata states one, with the place
// it applies to; everything else is "not recorded"), and no genre of its own: a work's genres are Wikidata's, and the
// game's own genre is attached only through the reviewed table in genre-map.mjs. An edition, a translation, a
// franchise or a series of separate books is not a work and is left out.
import { mkdirSync, writeFileSync } from 'node:fs';
import { GENRE_MAP } from './genre-map.mjs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'slate-source-catalog/1.0 (a game\'s catalog build; Wikidata CC0)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function sparql(query, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, { headers: { 'user-agent': UA, accept: 'application/sparql-results+json' } });
      if (r.status === 429 || r.status >= 500) throw new Error(`Wikidata answered ${r.status}`);
      if (!r.ok) throw new Error(`Wikidata refused the query (${r.status}): ${(await r.text()).slice(0, 200)}`);
      return (await r.json()).results.bindings;
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(2000 * 2 ** i);
    }
  }
}
const q = (b, k) => b[k]?.value;
const qid = (uri) => uri?.split('/').pop();

/**
 * Each medium the catalog covers: how Wikidata marks it, how many language editions of Wikipedia must have an article
 * on it (a plain measure of being widely written about, not of quality), and how many to take, most written-about
 * first. A work found under two is filed under the first.
 */
export const CLASSES = [
  { medium: 'novel', label: 'Novels', where: '?w wdt:P7937 wd:Q8261 .', min: 40, take: 190 },
  { medium: 'short-story', label: 'Short Stories', where: '?w wdt:P7937 wd:Q49084 .', min: 20, take: 60 },
  { medium: 'play', label: 'Plays', where: '?w wdt:P7937 wd:Q25379 .', min: 25, take: 60 },
  { medium: 'poem', label: 'Poems And Epics', where: 'VALUES ?f { wd:Q5185279 wd:Q37484 } ?w wdt:P7937 ?f .', min: 35, take: 25 },
  { medium: 'comic', label: 'Comics, Graphic Novels And Manga', where: 'VALUES ?c { wd:Q1004 wd:Q725377 wd:Q21198342 wd:Q14406742 } ?w wdt:P31 ?c .', min: 25, take: 70 },
  { medium: 'video-game', label: 'Video Games', where: '?w wdt:P31 wd:Q7889 .', min: 45, take: 120 },
  { medium: 'online', label: 'Online Fiction, Webcomics And Webtoons', where: 'VALUES ?c { wd:Q213369 wd:Q7978994 wd:Q2552040 } ?w wdt:P31 ?c .', min: 3, take: 70 },
  { medium: 'light-novel', label: 'Light Novels', where: '?w wdt:P31 wd:Q104213567 .', min: 18, take: 30 },
];
/** What a work is not: an edition or a translation of one, a franchise, or a series of separate works. */
const NOT_WORKS = ['Q3331189', 'Q7553', 'Q196600', 'Q277759', 'Q7058673', 'Q1667921', 'Q17489659', 'Q24856', 'Q13593966', 'Q15116915'];

async function pick(c) {
  const rows = await sparql(`SELECT ?w ?sl WHERE { ${c.where} ?w wikibase:sitelinks ?sl . FILTER(?sl >= ${c.min}) FILTER NOT EXISTS { VALUES ?no { ${NOT_WORKS.map((x) => `wd:${x}`).join(' ')} } ?w wdt:P31 ?no . } } ORDER BY DESC(?sl) LIMIT ${Math.ceil(c.take * 1.4)}`);
  return [...new Map(rows.map((b) => [qid(q(b, 'w')), Number(q(b, 'sl'))]))];
}
const values = (ids) => `VALUES ?w { ${ids.map((x) => `wd:${x}`).join(' ')} }`;
const chunk = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

async function details(ids) {
  const out = new Map(ids.map((id) => [id, { id, creators: new Map(), genres: new Map(), languages: new Map(), countries: new Map(), dates: [], series: null, copyright: [], kinds: new Map() }]));
  const each = async (query, on) => { for (const part of chunk(ids, 90)) { for (const b of await sparql(query(values(part)))) on(out.get(qid(q(b, 'w'))), b); await sleep(300); } };
  await each((v) => `SELECT ?w ?wLabel ?wDescription ?article WHERE { ${v} OPTIONAL { ?article schema:about ?w ; schema:isPartOf <https://en.wikipedia.org/> . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => { r.title = q(b, 'wLabel'); r.description = q(b, 'wDescription') ?? null; r.article = q(b, 'article') ?? null; });
  await each((v) => `SELECT ?w ?k ?kLabel WHERE { ${v} ?w wdt:P31 ?k . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => r.kinds.set(qid(q(b, 'k')), q(b, 'kLabel')));
  // Who made it: an author, a creator, or for a game its developer. A person's year of death is theirs, a recorded fact; nothing is worked out from it here.
  await each((v) => `SELECT ?w ?p ?c ?cLabel ?died WHERE { ${v} VALUES ?p { wdt:P50 wdt:P170 wdt:P178 } ?w ?p ?c . OPTIONAL { ?c wdt:P570 ?died . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => { const id = qid(q(b, 'c')); if (!/^Q\d+$/.test(id)) return; r.creators.set(id, { id: `wd:${id}`, name: q(b, 'cLabel'), role: q(b, 'p').endsWith('P178') ? 'developer' : q(b, 'p').endsWith('P170') ? 'creator' : 'author', ...(q(b, 'died') ? { died: Number(q(b, 'died').slice(0, 4)) } : {}) }); });
  await each((v) => `SELECT ?w ?date WHERE { ${v} VALUES ?p { wdt:P577 wdt:P571 wdt:P1191 } ?w ?p ?date . }`, (r, b) => { const d = q(b, 'date'); if (/^-?\d{4}-/.test(d)) r.dates.push(d); });
  await each((v) => `SELECT ?w ?l ?lLabel WHERE { ${v} ?w wdt:P407 ?l . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, (r, b) => r.languages.set(qid(q(b, 'l')), q(b, 'lLabel')));
  await each((v) => `SELECT ?w ?c ?cLabel WHERE { ${v} ?w wdt:P495 ?c . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, (r, b) => r.countries.set(qid(q(b, 'c')), q(b, 'cLabel')));
  await each((v) => `SELECT ?w ?g ?gLabel WHERE { ${v} ?w wdt:P136 ?g . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, (r, b) => r.genres.set(qid(q(b, 'g')), q(b, 'gLabel')));
  await each((v) => `SELECT ?w ?s ?sLabel ?n WHERE { ${v} ?w p:P179 ?st . ?st ps:P179 ?s . OPTIONAL { ?st pq:P1545 ?n . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => { r.series ??= { id: `wd:${qid(q(b, 's'))}`, name: q(b, 'sLabel'), ...(q(b, 'n') ? { number: q(b, 'n') } : {}) }; });
  await each((v) => `SELECT ?w ?s ?sLabel ?where ?whereLabel WHERE { ${v} ?w p:P6216 ?st . ?st ps:P6216 ?s . OPTIONAL { ?st pq:P1001 ?where . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => r.copyright.push({ status: q(b, 'sLabel'), ...(q(b, 'whereLabel') ? { where: q(b, 'whereLabel') } : {}) }));
  return out;
}

const year = (d) => Number(/^(-?\d{1,4})/.exec(d)[1]);
/** One catalog record from what was read, or null with the reason it is not one. */
export function toRecord(raw, medium, retrieved) {
  if (!raw.title || /^Q\d+$/.test(raw.title)) return { skip: 'no English title recorded' };
  if ([...raw.kinds.keys()].some((k) => NOT_WORKS.includes(k))) return { skip: 'an edition, a translation, a franchise or a series, not a work' };
  const first = raw.dates.sort((a, b) => year(a) - year(b) || a.localeCompare(b))[0] ?? null;
  const genres = [...raw.genres].map(([id, label]) => ({ id: `wd:${id}`, label })).filter((g) => g.label && !/^Q\d+$/.test(g.label)).sort((a, b) => a.label.localeCompare(b.label));
  // The game's own genres, only where the reviewed table says a Wikidata genre is one of them; the reason is the table's.
  const game = [...new Map(genres.flatMap((g) => (GENRE_MAP[g.id] ? [[GENRE_MAP[g.id][0], { genre: GENRE_MAP[g.id][0], because: `Wikidata records its genre as "${g.label}"` }]] : []))).values()].sort((a, b) => a.genre.localeCompare(b.genre));
  // Copyright status exactly as Wikidata states it, with the place each statement applies to. Nothing is inferred.
  const copyright = [...new Map(raw.copyright.map((c) => [`${c.status}|${c.where ?? ''}`, c])).values()].sort((a, b) => `${a.status}${a.where ?? ''}`.localeCompare(`${b.status}${b.where ?? ''}`));
  return {
    id: `wd:${raw.id}`,
    title: raw.title,
    medium,
    kind: [...raw.kinds.values()].filter((x) => x && !/^Q\d+$/.test(x)).sort()[0] ?? null,
    description: raw.description,
    creators: [...raw.creators.values()].filter((c) => c.name && !/^Q\d+$/.test(c.name)).sort((a, b) => a.name.localeCompare(b.name)),
    year: first ? year(first) : null,
    languages: [...raw.languages.values()].filter((x) => x && !/^Q\d+$/.test(x)).sort(),
    countries: [...raw.countries.values()].filter((x) => x && !/^Q\d+$/.test(x)).sort(),
    recordedGenres: genres,
    genres: game,
    series: raw.series && !/^Q\d+$/.test(raw.series.name ?? 'Q1') ? raw.series : null,
    copyright,
    link: `https://www.wikidata.org/wiki/${raw.id}`,
    article: raw.article,
    provenance: { source: 'Wikidata', licence: 'CC0', retrieved },
  };
}

async function main() {
  const retrieved = new Date().toISOString().slice(0, 10);
  const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
  const taken = new Map(); const skipped = [];
  for (const c of CLASSES) {
    const picked = (await pick(c)).filter(([id]) => !taken.has(id));
    const raw = await details(picked.map(([id]) => id));
    let n = 0;
    for (const [id, sitelinks] of picked) {
      if (n >= c.take) break;
      const r = toRecord(raw.get(id), c.medium, retrieved);
      if (r.skip) { skipped.push(`${id}: ${r.skip}`); continue; }
      taken.set(id, { ...r, wikipedias: sitelinks });
      n++;
    }
    log(`${c.label}: ${n} of ${picked.length} found at ${c.min} or more Wikipedias`);
    await sleep(1000);
  }
  const records = [...taken.values()].sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4)));
  mkdirSync('src/data', { recursive: true });
  writeFileSync('src/data/sources.json', `${JSON.stringify({ version: 1, source: 'Wikidata', licence: 'CC0', retrieved, records }, null, 1)}\n`);
  log(`${records.length} works written to src/data/sources.json; ${skipped.length} left out.`);
  // Every genre Wikidata records on these works, most used first, to keep the reviewed table (genre-map.mjs) honest.
  const seen = new Map();
  for (const r of records) for (const g of r.recordedGenres) seen.set(g.id, { label: g.label, n: (seen.get(g.id)?.n ?? 0) + 1 });
  writeFileSync('tools/sources/recorded-genres.tsv', [...seen].sort((a, b) => b[1].n - a[1].n).map(([id, g]) => `${id}\t${g.n}\t${g.label}\t${GENRE_MAP[id]?.[0] ?? ''}`).join('\n') + '\n');
}
if (import.meta.url === `file://${process.argv[1]}`) await main();
