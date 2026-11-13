#!/usr/bin/env node
// What a source page shows beyond its title and maker (the v4 package, 01 "Create project before creating an empty
// script"): the characters, places and period a work is recorded with, its installments, the works adapted from it,
// and a short description from a named source. Run after import.mjs; it reads src/data/sources.json and writes it back.
//
//   node tools/sources/enrich.mjs
//
// Everything added is recorded somewhere and says where:
// - From Wikidata (CC0): characters (P674, with their recorded sex or gender, P21), narrative locations (P840), the
//   period it is set in (P2408), main subjects (P921), what it follows and is followed by (P155, P156), its form
//   (novel, novella, short story, collection: P7937), and the works recorded as based on it (P144 on the other work).
// - From the English Wikipedia (CC BY-SA 4.0): the article's own lead summary, kept whole with the article's title,
//   link, licence and date, so it is always shown as that article's words and never as the game's.
// Nothing is worked out. A work with no character recorded has none here, and the game says so rather than invent one.
//
// It also adds Brandon Sanderson's works as Wikidata records them (the v4 package names his bibliography as a research
// target), and writes docs/v4/SOURCE-COVERAGE.md: what each field covers, by medium, and his works by form.
import { tidy } from './tidy.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
import { GENRE_MAP } from './genre-map.mjs';
import { toRecord } from './import.mjs';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = 'slate-source-catalog/1.0 (a game\'s catalog build; Wikidata CC0, Wikipedia CC BY-SA)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, accept, tries = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA, accept } });
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) throw new Error(`${url.slice(0, 60)} answered ${r.status}`);
      if (!r.ok) throw new Error(`${url.slice(0, 60)} refused (${r.status})`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw e;
      await sleep(2000 * 2 ** i);
    }
  }
}
const sparql = async (query) => (await get(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, 'application/sparql-results+json')).results.bindings;
const q = (b, k) => b[k]?.value;
const qid = (uri) => uri?.split('/').pop();
const named = (s) => !!s && !/^Q\d+$/.test(s);
const values = (ids) => `VALUES ?w { ${ids.map((x) => `wd:${x}`).join(' ')} }`;
const chunk = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

export const SANDERSON = 'Q457608';
/** The forms a written work is recorded as (P7937), in the game's words. Anything else is left as recorded. */
export const FORMS = { Q8261: 'novel', Q149537: 'novella', Q1477089: 'novelette', Q49084: 'short story', Q1279564: 'collection', Q7725634: 'anthology', Q105420: 'anthology', Q1667921: 'novel series', Q25379: 'play', Q5185279: 'poem', Q37484: 'epic poem' };
/** Wikidata items that are not works to adapt: editions, translations, audiobooks, series, universes, bibliographies. */
const NOT_WORKS = ['Q3331189', 'Q7553', 'Q196600', 'Q277759', 'Q1667921', 'Q17489659', 'Q24856', 'Q13593966', 'Q15116915', 'Q106833', 'Q122731938', 'Q559618', 'Q1371849', 'Q7058673', 'Q21481766'];

/** Sanderson's works as Wikidata records them, as catalog records (import.mjs toRecord), each with its form. */
async function sandersonWorks(retrieved, have) {
  const rows = await sparql(`SELECT DISTINCT ?w ?sl WHERE { ?w wdt:P50 wd:${SANDERSON} . ?w wikibase:sitelinks ?sl . FILTER NOT EXISTS { VALUES ?no { ${NOT_WORKS.map((x) => `wd:${x}`).join(' ')} } ?w wdt:P31 ?no . } }`);
  const ids = rows.map((b) => qid(q(b, 'w'))).filter((id) => !have.has(`wd:${id}`));
  const sl = new Map(rows.map((b) => [qid(q(b, 'w')), Number(q(b, 'sl'))]));
  const raw = new Map(ids.map((id) => [id, { id, creators: new Map(), genres: new Map(), languages: new Map(), countries: new Map(), dates: [], series: null, copyright: [], kinds: new Map() }]));
  const each = async (query, on) => { for (const part of chunk(ids, 90)) { for (const b of await sparql(query(values(part)))) on(raw.get(qid(q(b, 'w'))), b); await sleep(300); } };
  await each((v) => `SELECT ?w ?wLabel ?wDescription ?article WHERE { ${v} OPTIONAL { ?article schema:about ?w ; schema:isPartOf <https://en.wikipedia.org/> . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => { r.title = q(b, 'wLabel'); r.description = q(b, 'wDescription') ?? null; r.article = q(b, 'article') ?? null; });
  await each((v) => `SELECT ?w ?k ?kLabel WHERE { ${v} ?w wdt:P31 ?k . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, (r, b) => r.kinds.set(qid(q(b, 'k')), q(b, 'kLabel')));
  await each((v) => `SELECT ?w ?p ?c ?cLabel ?died WHERE { ${v} VALUES ?p { wdt:P50 wdt:P170 } ?w ?p ?c . OPTIONAL { ?c wdt:P570 ?died . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => { const id = qid(q(b, 'c')); if (/^Q\d+$/.test(id)) r.creators.set(id, { id: `wd:${id}`, name: q(b, 'cLabel'), role: q(b, 'p').endsWith('P170') ? 'creator' : 'author', ...(q(b, 'died') ? { died: Number(q(b, 'died').slice(0, 4)) } : {}) }); });
  await each((v) => `SELECT ?w ?date WHERE { ${v} VALUES ?p { wdt:P577 wdt:P571 } ?w ?p ?date . }`, (r, b) => { const d = q(b, 'date'); if (/^-?\d{4}-/.test(d)) r.dates.push(d); });
  await each((v) => `SELECT ?w ?l ?lLabel WHERE { ${v} ?w wdt:P407 ?l . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, (r, b) => r.languages.set(qid(q(b, 'l')), q(b, 'lLabel')));
  await each((v) => `SELECT ?w ?g ?gLabel WHERE { ${v} ?w wdt:P136 ?g . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, (r, b) => r.genres.set(qid(q(b, 'g')), q(b, 'gLabel')));
  await each((v) => `SELECT ?w ?s ?sLabel ?n WHERE { ${v} ?w p:P179 ?st . ?st ps:P179 ?s . OPTIONAL { ?st pq:P1545 ?n . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (r, b) => { r.series ??= { id: `wd:${qid(q(b, 's'))}`, name: q(b, 'sLabel'), ...(q(b, 'n') ? { number: q(b, 'n') } : {}) }; });
  const out = [];
  for (const id of ids) {
    const r = toRecord(raw.get(id), 'novel', retrieved);
    if (r.skip) continue;
    // Not works to adapt: a bibliography, a series or universe, an edition or audiobook, an essay collection's part.
    if ([...raw.get(id).kinds.values()].some((k) => /bibliograph|series|universe|edition|audiobook/i.test(k ?? '')) || /\(part \w+\)$/i.test(r.title)) continue;
    out.push({ ...r, wikipedias: sl.get(id) ?? 0 });
  }
  return out;
}

/** The recorded facts beyond import.mjs's, for every record. */
async function details(records) {
  const ids = records.map((r) => r.id.slice(3));
  const by = new Map(records.map((r) => [r.id.slice(3), { characters: new Map(), places: new Map(), periods: new Map(), subjects: new Map(), follows: null, followedBy: null, forms: [], adaptations: new Map() }]));
  const each = async (query, on) => { for (const part of chunk(ids, 80)) { for (const b of await sparql(query(values(part)))) { const x = by.get(qid(q(b, 'w'))); if (x) on(x, b); } await sleep(300); } };
  // A character's recorded kind (P31: "fictional human", "fictional horse") and how many Wikipedias write about them,
  // which is the only recorded sign of who matters most in a work, and is used as that and nothing more.
  await each((v) => `SELECT ?w ?c ?cLabel ?g ?gLabel ?k ?kLabel ?sl WHERE { ${v} ?w wdt:P674 ?c . OPTIONAL { ?c wdt:P21 ?g . } OPTIONAL { ?c wdt:P31 ?k . } OPTIONAL { ?c wikibase:sitelinks ?sl . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (x, b) => {
      const id = qid(q(b, 'c'));
      if (!named(q(b, 'cLabel'))) return;
      const c = x.characters.get(id) ?? { id: `wd:${id}`, name: q(b, 'cLabel'), sitelinks: Number(q(b, 'sl') ?? 0) };
      if (!c.gender && named(q(b, 'gLabel'))) c.gender = q(b, 'gLabel');
      if (!c.kind && named(q(b, 'kLabel'))) c.kind = q(b, 'kLabel');
      x.characters.set(id, c);
    });
  await each((v) => `SELECT ?w ?p ?pLabel WHERE { ${v} ?w wdt:P840 ?p . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (x, b) => { if (named(q(b, 'pLabel'))) x.places.set(qid(q(b, 'p')), { id: `wd:${qid(q(b, 'p'))}`, name: q(b, 'pLabel') }); });
  await each((v) => `SELECT ?w ?p ?pLabel WHERE { ${v} ?w wdt:P2408 ?p . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (x, b) => { if (named(q(b, 'pLabel'))) x.periods.set(qid(q(b, 'p')), q(b, 'pLabel')); });
  await each((v) => `SELECT ?w ?s ?sLabel WHERE { ${v} ?w wdt:P921 ?s . SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (x, b) => { if (named(q(b, 'sLabel'))) x.subjects.set(qid(q(b, 's')), q(b, 'sLabel')); });
  await each((v) => `SELECT ?w ?a ?aLabel ?b ?bLabel WHERE { ${v} OPTIONAL { ?w wdt:P155 ?a . } OPTIONAL { ?w wdt:P156 ?b . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (x, b) => { if (named(q(b, 'aLabel'))) x.follows ??= { id: `wd:${qid(q(b, 'a'))}`, title: q(b, 'aLabel') }; if (named(q(b, 'bLabel'))) x.followedBy ??= { id: `wd:${qid(q(b, 'b'))}`, title: q(b, 'bLabel') }; });
  await each((v) => `SELECT ?w ?f WHERE { ${v} ?w wdt:P7937 ?f . }`, (x, b) => { const f = FORMS[qid(q(b, 'f'))]; if (f && !x.forms.includes(f)) x.forms.push(f); });
  // Works recorded as based on this one: a film, a series, an opera, a game. Their kind and year, as recorded.
  await each((v) => `SELECT ?w ?a ?aLabel ?kLabel ?date WHERE { ${v} ?a wdt:P144 ?w . OPTIONAL { ?a wdt:P31 ?k . } OPTIONAL { ?a wdt:P577 ?date . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`,
    (x, b) => {
      const id = qid(q(b, 'a'));
      if (!named(q(b, 'aLabel'))) return;
      const had = x.adaptations.get(id) ?? { id: `wd:${id}`, title: q(b, 'aLabel'), kind: null, year: null };
      if (!had.kind && named(q(b, 'kLabel'))) had.kind = q(b, 'kLabel');
      const y = /^(-?\d{4})/.exec(q(b, 'date') ?? '')?.[1];
      if (y && (had.year === null || Number(y) < had.year)) had.year = Number(y);
      x.adaptations.set(id, had);
    });
  return by;
}

/** The English Wikipedia article's lead summary, kept as that article's words with its licence. */
async function summary(article, retrieved) {
  const title = decodeURIComponent(article.split('/wiki/')[1] ?? '');
  if (!title) return null;
  const s = await get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`, 'application/json');
  if (!s?.extract || s.type === 'disambiguation') return null;
  return { text: tidy(s.extract), from: 'English Wikipedia', article: s.titles?.normalized ?? title.replace(/_/g, ' '), link: s.content_urls?.desktop?.page ?? article, licence: 'CC BY-SA 4.0', retrieved };
}

const pct = (n, d) => (d ? `${Math.round((n / d) * 100)}%` : '0%');
function coverage(records) {
  const media = [...new Set(records.map((r) => r.medium))];
  const has = (r, k) => (Array.isArray(r[k]) ? r[k].length > 0 : !!r[k]);
  const fields = [['characters', 'Characters'], ['places', 'Places'], ['periods', 'Period'], ['follows', 'Follows'], ['followedBy', 'Followed By'], ['adaptations', 'Adaptations'], ['summary', 'Summary'], ['forms', 'Form']];
  const s = records.filter((r) => r.creators.some((c) => c.id === `wd:${SANDERSON}`));
  const byForm = new Map();
  for (const r of s) for (const f of r.forms.length ? r.forms : ['form not recorded']) byForm.set(f, [...(byForm.get(f) ?? []), r]);
  const lines = [
    '# Source Coverage', '',
    'Written by `node tools/sources/enrich.mjs`. What each recorded field covers across the source catalog. A field a work',
    'does not have is not recorded for it; the game says so and invents nothing in its place.', '',
    `${records.length} works. Retrieved ${records[0]?.enriched?.retrieved ?? ''}.`, '',
    `| Medium | Works | ${fields.map((f) => f[1]).join(' | ')} |`, `| --- | --- | ${fields.map(() => '---').join(' | ')} |`,
    ...media.map((m) => { const rs = records.filter((r) => r.medium === m); return `| ${m} | ${rs.length} | ${fields.map(([k]) => pct(rs.filter((r) => has(r, k)).length, rs.length)).join(' | ')} |`; }),
    `| All | ${records.length} | ${fields.map(([k]) => pct(records.filter((r) => has(r, k)).length, records.length)).join(' | ')} |`, '',
    '## Brandon Sanderson', '',
    `${s.length} works credited to him as Wikidata records them (editions, translations, audiobooks, series and universes left out).`,
    'Wikidata is the source here. His official site (brandonsanderson.com, "Books") lists his work by series and kind,',
    'not title by title on one page, and a title-by-title comparison with it has not been made; so this is what Wikidata',
    'records, not a verified complete bibliography.', '',
    ...[...byForm].sort((a, b) => b[1].length - a[1].length).flatMap(([f, rs]) => [`- **${f}** (${rs.length}): ${rs.map((r) => `${r.title}${r.year ? ` (${r.year})` : ''}${r.creators.length > 1 ? ', with ' + r.creators.filter((c) => c.id !== `wd:${SANDERSON}`).map((c) => c.name).join(' and ') : ''}`).join('; ')}`]),
    '',
    'Kinds of his work the official site lists that have no record here: Magic: The Gathering stories and children\'s',
    'books were not found in Wikidata under his name when this was written. Graphic novels (White Sand) are recorded',
    'as a comic book series, which the catalog leaves out as a series.', '',
  ];
  return lines.join('\n');
}

async function main() {
  const retrieved = new Date().toISOString().slice(0, 10);
  const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
  const cat = JSON.parse(readFileSync('src/data/sources.json', 'utf8'));
  const have = new Set(cat.records.map((r) => r.id));
  const added = await sandersonWorks(retrieved, have);
  log(`Sanderson: ${added.length} works added`);
  const records = [...cat.records, ...added];
  const by = await details(records);
  let n = 0;
  for (const r of records) {
    const x = by.get(r.id.slice(3));
    r.characters = [...x.characters.values()].sort((a, b) => b.sitelinks - a.sitelinks || a.name.localeCompare(b.name));
    r.places = [...x.places.values()].sort((a, b) => a.name.localeCompare(b.name));
    r.periods = [...x.periods.values()].sort();
    r.subjects = [...x.subjects.values()].sort();
    r.follows = x.follows; r.followedBy = x.followedBy;
    r.forms = x.forms.sort();
    // An added work is filed by its recorded form: a short story or novelette with the short stories, the rest as novels.
    if (!have.has(r.id) && r.forms.some((f) => f === 'short story' || f === 'novelette')) r.medium = 'short-story';
    const ad = [...x.adaptations.values()].sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999) || a.title.localeCompare(b.title));
    r.adaptationCount = ad.length;
    r.adaptations = ad.slice(0, 12);
    r.summary = r.article ? await summary(r.article, retrieved).catch(() => null) : null;
    r.enriched = { source: 'Wikidata (CC0); English Wikipedia summaries (CC BY-SA 4.0)', retrieved };
    if (++n % 50 === 0) log(`${n} of ${records.length}`);
    await sleep(120);
  }
  records.sort((a, b) => Number(a.id.slice(4)) - Number(b.id.slice(4)));
  const summaries = "Each record's summary is the English Wikipedia article's own lead, under CC BY-SA 4.0, attributed in the record (summary.article, summary.link). Everything else is Wikidata's, under CC0.";
  writeFileSync('src/data/sources.json', `${JSON.stringify({ version: cat.version, source: cat.source, licence: cat.licence, summaries, retrieved: cat.retrieved, records }, null, 1)}\n`);
  writeFileSync('docs/v4/SOURCE-COVERAGE.md', coverage(records));
  log(`${records.length} works written`);
}
// GENRE_MAP is read by import.mjs's toRecord for the added works.
void GENRE_MAP;
if (import.meta.url === `file://${process.argv[1]}`) await main();
