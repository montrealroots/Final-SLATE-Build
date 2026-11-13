#!/usr/bin/env node
// The real music catalog (the owner's v5 brief, 3): film and television composers, songwriters and recording artists,
// and the recordings they are credited on, read from Wikidata. Wikidata's structured data is CC0
// (https://www.wikidata.org/wiki/Wikidata:Licensing), so, unlike TMDB's records, this is committed
// (src/data/music.json). Its query service asks for an identifying User-Agent, 60 seconds of query time a minute, and a
// stop on 429 (https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual). Queries go one at a time, a second
// apart, and back off on 429 and 5xx. Answers are cached in .sources-cache/music/, so a rerun asks only for what it lacks.
//
//   node tools/music/catalog.mjs     reads Wikidata and writes src/data/music.json
//
// What it keeps is what Wikidata records, each with its QID, and nothing it doesn't:
// - a person's or group's name, dates, country, occupations (as Wikidata names them, and the game's music roles they are
//   evidence for), MusicBrainz ID, and TMDB person ID, which ties a composer to the film catalog's identity
//   (engine/guests.ts) so there is one profile for them, not one per role;
// - for a composer, the films Wikidata credits them as composer of: a count, the first and last years, and the most
//   written-about titles;
// - recordings: title, performers, release date, duration where recorded, composers, lyricists, producers, what a
//   version is a version of, and MusicBrainz IDs.
// No audio, no lyrics, no fee, no availability: those are the game's, made up and labelled where they show.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const UA = "slate-music-catalog/1.0 (a game's catalog build; Wikidata CC0)";
const CACHE = '.sources-cache/music';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function sparql(query) {
  mkdirSync(CACHE, { recursive: true });
  const file = `${CACHE}/${createHash('sha1').update(query).digest('hex')}.json`;
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  for (let i = 0; ; i++) {
    const wait = 1000 - (Date.now() - last);
    if (wait > 0) await sleep(wait);
    last = Date.now();
    const r = await fetch(`${ENDPOINT}?format=json&query=${encodeURIComponent(query)}`, { headers: { 'user-agent': UA, accept: 'application/sparql-results+json' } }).catch(() => null);
    if (r?.ok) {
      const rows = (await r.json()).results.bindings;
      writeFileSync(file, JSON.stringify(rows));
      return rows;
    }
    if (i >= 5) throw new Error(`Wikidata answered ${r?.status ?? 'nothing'}`);
    const after = Number(r?.headers.get('retry-after')) || 0;
    await sleep(Math.max(after * 1000, 3000 * 2 ** i));
  }
}
const v = (b, k) => b[k]?.value;
const qid = (uri) => uri?.split('/').pop();
const day = (x) => (x && /^\d{4}/.test(x) ? x.slice(0, 10) : undefined);
const chunk = (xs, n) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const values = (name, ids) => `VALUES ?${name} { ${ids.map((x) => `wd:${x}`).join(' ')} }`;

/** Who is gathered: by occupation or kind, how many Wikipedia editions write about them at least, and how many. */
const GROUPS = [
  { why: 'film-composer', where: '?p wdt:P106 wd:Q1415090 .', min: 15, take: 450 },
  { why: 'songwriter', where: '?p wdt:P106 wd:Q753110 .', min: 45, take: 220 },
  { why: 'singer', where: '?p wdt:P106 wd:Q177220 .', min: 75, take: 260 },
  { why: 'band', where: '?p wdt:P31 wd:Q215380 .', min: 60, take: 200 },
];
/** Wikidata occupations, and the game's music role each is evidence for. Roles stay distinct; one person may have several. */
export const ROLE_OF = {
  Q1415090: 'composer', Q36834: 'composer', Q753110: 'songwriter', Q488205: 'songwriter', Q822146: 'lyricist', Q177220: 'recording-artist',
  Q2252262: 'recording-artist', Q639669: 'performer', Q855091: 'performer', Q486748: 'performer', Q1259917: 'performer', Q130857: 'performer',
  Q183945: 'music-producer', Q158852: 'conductor', Q12800682: 'arranger', Q1198887: 'music-director',
};

async function pick() {
  const order = [];
  const seen = new Set();
  for (const g of GROUPS) {
    const rows = await sparql(`SELECT ?p ?sl WHERE { ${g.where} ?p wikibase:sitelinks ?sl . FILTER(?sl >= ${g.min}) } ORDER BY DESC(?sl) LIMIT ${g.take}`);
    for (const b of rows) { const id = qid(v(b, 'p')); if (!seen.has(id)) { seen.add(id); order.push({ id, sl: Number(v(b, 'sl')), why: g.why }); } }
    console.log(`${g.why}: ${rows.length}`);
  }
  return order;
}

async function people(picked) {
  const out = new Map();
  for (const ids of chunk(picked.map((x) => x.id), 120)) {
    const rows = await sparql(`SELECT ?p ?pLabel ?born ?died ?formed ?ended ?countryLabel ?occ ?occLabel ?mb ?tmdb ?human WHERE {
      ${values('p', ids)}
      OPTIONAL { ?p wdt:P569 ?born . } OPTIONAL { ?p wdt:P570 ?died . } OPTIONAL { ?p wdt:P571 ?formed . } OPTIONAL { ?p wdt:P576 ?ended . }
      OPTIONAL { ?p wdt:P27 ?country . } OPTIONAL { ?p wdt:P495 ?country . } OPTIONAL { ?p wdt:P106 ?occ . }
      OPTIONAL { ?p wdt:P434 ?mb . } OPTIONAL { ?p wdt:P4985 ?tmdb . } BIND(EXISTS { ?p wdt:P31 wd:Q5 } AS ?human)
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
    for (const b of rows) {
      const id = qid(v(b, 'p'));
      const name = v(b, 'pLabel');
      if (!name || name === id) continue;
      const x = out.get(id) ?? { id, name, kind: v(b, 'human') === 'true' ? 'person' : 'group', occupations: [], roles: [] };
      x.born ??= day(v(b, 'born')); x.died ??= day(v(b, 'died')); x.formed ??= day(v(b, 'formed')); x.ended ??= day(v(b, 'ended'));
      x.country ??= v(b, 'countryLabel');
      x.mbid ??= v(b, 'mb'); x.tmdb ??= v(b, 'tmdb') ? Number(v(b, 'tmdb')) : undefined;
      const o = qid(v(b, 'occ'));
      const label = v(b, 'occLabel');
      if (o && label && label !== o && !x.occupations.includes(label)) x.occupations.push(label);
      if (o && ROLE_OF[o] && !x.roles.includes(ROLE_OF[o])) x.roles.push(ROLE_OF[o]);
      out.set(id, x);
    }
  }
  for (const x of out.values()) if (x.kind === 'group' && !x.roles.includes('recording-artist')) x.roles.push('recording-artist');
  return out;
}

async function scores(composers) {
  const out = new Map();
  for (const ids of chunk(composers, 60)) {
    const rows = await sparql(`SELECT ?c ?f ?fLabel ?date ?sl WHERE { ${values('c', ids)} ?f wdt:P86 ?c . ?f wdt:P31 wd:Q11424 . ?f wikibase:sitelinks ?sl .
      OPTIONAL { ?f wdt:P577 ?date . } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
    for (const b of rows) {
      const c = qid(v(b, 'c'));
      const f = qid(v(b, 'f'));
      const m = out.get(c) ?? new Map();
      const year = Number((v(b, 'date') ?? '').slice(0, 4)) || undefined;
      const had = m.get(f);
      if (!had) m.set(f, { id: f, title: v(b, 'fLabel'), year, sl: Number(v(b, 'sl')) });
      else if (year && (!had.year || year < had.year)) had.year = year;
      out.set(c, m);
    }
  }
  const done = new Map();
  for (const [c, m] of out) {
    const films = [...m.values()].filter((x) => x.title && x.title !== x.id);
    const years = films.map((x) => x.year).filter(Boolean);
    done.set(c, { films: films.length, first: years.length ? Math.min(...years) : undefined, last: years.length ? Math.max(...years) : undefined, known: films.sort((a, b) => b.sl - a.sl).slice(0, 5).map((x) => ({ id: x.id, title: x.title, ...(x.year ? { year: x.year } : {}) })) });
  }
  return done;
}

async function recordings(artists) {
  const out = new Map();
  for (const ids of chunk(artists, 40)) {
    const rows = await sparql(`SELECT ?s ?sLabel ?a ?date ?dur ?comp ?compLabel ?lyr ?lyrLabel ?prod ?prodLabel ?of ?ofLabel ?mbr ?mbw ?sl WHERE {
      ${values('a', ids)} ?s wdt:P175 ?a . VALUES ?k { wd:Q7366 wd:Q134556 } ?s wdt:P31 ?k . ?s wikibase:sitelinks ?sl . FILTER(?sl >= 4)
      OPTIONAL { ?s wdt:P577 ?date . } OPTIONAL { ?s wdt:P2047 ?dur . } OPTIONAL { ?s wdt:P86 ?comp . } OPTIONAL { ?s wdt:P676 ?lyr . }
      OPTIONAL { ?s wdt:P162 ?prod . } OPTIONAL { ?s wdt:P144 ?of . } OPTIONAL { ?s wdt:P4404 ?mbr . } OPTIONAL { ?s wdt:P435 ?mbw . }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`);
    for (const b of rows) {
      const id = qid(v(b, 's'));
      const title = v(b, 'sLabel');
      if (!title || title === id) continue;
      const x = out.get(id) ?? { id, title, performers: [], composers: [], lyricists: [], producers: [], sl: Number(v(b, 'sl')) };
      const add = (list, k) => { const q = qid(v(b, k)); const n = v(b, `${k}Label`); if (q && n && n !== q && !list.some((y) => y.id === q)) list.push({ id: q, name: n }); };
      const a = qid(v(b, 'a'));
      if (!x.performers.includes(a)) x.performers.push(a);
      const d = day(v(b, 'date'));
      if (d && (!x.date || d < x.date)) x.date = d;
      // Durations are recorded in seconds, sometimes in another unit with no unit read here: only a plausible song length is kept.
      const s = Number(v(b, 'dur'));
      if (s > 30 && s < 1800) x.seconds ??= Math.round(s);
      add(x.composers, 'comp'); add(x.lyricists, 'lyr'); add(x.producers, 'prod');
      const of = qid(v(b, 'of')); const ofn = v(b, 'ofLabel');
      if (of && ofn && ofn !== of) x.versionOf ??= { id: of, title: ofn };
      x.mbRecording ??= v(b, 'mbr'); x.mbWork ??= v(b, 'mbw');
      out.set(id, x);
    }
  }
  return out;
}

async function main() {
  const retrieved = new Date().toISOString().slice(0, 10);
  const picked = await pick();
  const ppl = await people(picked);
  const composers = [...ppl.values()].filter((x) => x.roles.includes('composer')).map((x) => x.id);
  const sc = await scores(composers);
  const artists = [...ppl.values()].filter((x) => x.roles.some((r) => r === 'recording-artist' || r === 'performer' || r === 'songwriter')).map((x) => x.id);
  const recs = await recordings(artists);
  // At most eight recordings an artist, the most written-about first: enough to choose from without one artist filling it.
  const per = new Map();
  const kept = [...recs.values()].sort((a, b) => b.sl - a.sl).filter((r) => {
    const a = r.performers.find((x) => ppl.has(x));
    const n = per.get(a) ?? 0;
    if (n >= 8) return false;
    per.set(a, n + 1);
    return true;
  });
  const rank = new Map(picked.map((x, i) => [x.id, i]));
  const peopleOut = [...ppl.values()].sort((a, b) => rank.get(a.id) - rank.get(b.id)).map((x) => {
    const s = sc.get(x.id);
    const y = { ...x, ...(s && s.films ? { scores: s } : {}) };
    for (const k of Object.keys(y)) if (y[k] === undefined || (Array.isArray(y[k]) && !y[k].length)) delete y[k];
    return y;
  });
  const recordingsOut = kept.map(({ sl, ...r }) => { void sl; for (const k of Object.keys(r)) if (r[k] === undefined || (Array.isArray(r[k]) && !r[k].length)) delete r[k]; return r; });
  const out = { version: 1, source: 'Wikidata', licence: 'CC0 1.0', link: 'https://www.wikidata.org/wiki/Wikidata:Licensing', retrieved, people: peopleOut, recordings: recordingsOut };
  writeFileSync('src/data/music.json', JSON.stringify(out));
  const count = (r) => peopleOut.filter((x) => x.roles?.includes(r)).length;
  console.log(`${peopleOut.length} people and groups (composers ${count('composer')}, songwriters ${count('songwriter')}, lyricists ${count('lyricist')}, recording artists ${count('recording-artist')}, performers ${count('performer')}, producers ${count('music-producer')}, conductors ${count('conductor')}); ${peopleOut.filter((x) => x.tmdb).length} with a TMDB ID; ${recordingsOut.length} recordings (${recordingsOut.filter((x) => x.seconds).length} with a duration, ${recordingsOut.filter((x) => x.versionOf).length} versions of another)`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
