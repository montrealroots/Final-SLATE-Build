// Cinemas worldwide, from Wikidata (November 11, 2026, docs/CINEMAS.md). Wikidata's data is CC0, public domain: it may be
// used without permission or attribution, though the game names its source. Like the screen catalog, the gathered
// cinemas stay out of the repository (.cinemas-cache, .cinemas) and are built here. They have directories of their own
// because the screen catalog's build clears .screen-catalog, which took the first run's output with it.
//   node tools/cinemas/import.mjs
// Two passes, to stay inside the query service's 60-second limit: the cinemas of each country (anything that is an
// instance of a movie theater, Q41253, or a kind of one, with coordinates), then their details in batches of 200. Each
// response is cached; a rerun asks only for what is missing. Requests are spaced a second apart, as the service asks.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENDPOINT = 'https://query.wikidata.org/sparql';
// The service asks clients to say who they are; a plain project name, no personal details.
const AGENT = 'SLATE-cinema-import/1.0 (a personal film-industry game)';
const CACHE = process.env.CINEMAS_CACHE ?? join(process.cwd(), '.cinemas-cache');
const OUT = process.env.CINEMAS_OUT ?? join(process.cwd(), '.cinemas');
mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** One SPARQL query, cached by name, retried with backoff on a failure or the service's rate limit. */
async function query(name, sparql) {
  const f = join(CACHE, `${name}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  let last = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    if (attempt) await sleep(Math.min(60_000, 2000 * 2 ** attempt));
    await sleep(1000);
    try {
      const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(sparql)}`, { headers: { Accept: 'application/sparql-results+json', 'User-Agent': AGENT } });
      if (res.status === 429) { await sleep(1000 * (Number(res.headers.get('retry-after')) || 30)); last = '429'; continue; }
      if (!res.ok) { last = `HTTP ${res.status}`; continue; }
      const body = await res.json();
      const out = { retrievedAt: new Date().toISOString(), rows: body.results.bindings };
      writeFileSync(f, JSON.stringify(out));
      return out;
    } catch (e) { last = e.message; }
  }
  throw new Error(`${name}: ${last}`);
}

const v = (b, k) => b[k]?.value ?? null;
const qid = (uri) => uri?.replace('http://www.wikidata.org/entity/', '') ?? null;
const day = (t) => (t ? t.slice(0, 10).replace(/^\+/, '') : null);

async function main() {
  // The countries with cinemas, by their ISO code.
  const countries = (await query('countries', `SELECT ?country ?code (COUNT(DISTINCT ?c) AS ?n) WHERE { ?c wdt:P31/wdt:P279* wd:Q41253; wdt:P625 ?coord; wdt:P17 ?country. ?country wdt:P297 ?code. } GROUP BY ?country ?code`)).rows
    .map((r) => ({ q: qid(v(r, 'country')), code: v(r, 'code'), n: Number(v(r, 'n')) }));
  log(`${countries.length} countries, ${countries.reduce((a, c) => a + c.n, 0)} cinemas.`);
  const index = [];
  for (const c of countries) {
    const ids = [...new Set((await query(`ids-${c.code}`, `SELECT DISTINCT ?c WHERE { ?c wdt:P31/wdt:P279* wd:Q41253; wdt:P625 ?coord; wdt:P17 wd:${c.q}. }`)).rows.map((r) => qid(v(r, 'c'))))].sort();
    const byId = new Map();
    for (let i = 0; i < ids.length; i += 200) {
      const batch = ids.slice(i, i + 200);
      const rows = (await query(`details-${c.code}-${i / 200}`, `SELECT ?c ?cLabel ?coord ?opened ?inception ?closed ?dissolved ?stateLabel ?seats ?opLabel ?inLabel WHERE {
        VALUES ?c { ${batch.map((x) => `wd:${x}`).join(' ')} }
        ?c wdt:P625 ?coord.
        OPTIONAL { ?c wdt:P1619 ?opened } OPTIONAL { ?c wdt:P571 ?inception } OPTIONAL { ?c wdt:P3999 ?closed } OPTIONAL { ?c wdt:P576 ?dissolved }
        OPTIONAL { ?c wdt:P5817 ?state } OPTIONAL { ?c wdt:P1083 ?seats } OPTIONAL { ?c wdt:P137 ?op } OPTIONAL { ?c wdt:P131 ?in }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
      }`)).rows;
      // A cinema with several values for a field comes back as several rows: the first of each is kept.
      for (const r of rows) {
        const id = qid(v(r, 'c'));
        const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(v(r, 'coord') ?? '');
        const x = byId.get(id) ?? { id, name: v(r, 'cLabel'), lat: m ? Number(m[2]) : null, lon: m ? Number(m[1]) : null };
        x.opened ??= day(v(r, 'opened')) ?? day(v(r, 'inception'));
        x.closed ??= day(v(r, 'closed')) ?? day(v(r, 'dissolved'));
        x.state ??= v(r, 'stateLabel');
        x.seats ??= v(r, 'seats') ? Math.round(Number(v(r, 'seats'))) : null;
        x.operator ??= v(r, 'opLabel');
        x.in ??= v(r, 'inLabel');
        byId.set(id, x);
      }
    }
    // A label that is just the item's id means Wikidata has no name in English or multilingual for it.
    const list = [...byId.values()].map((x) => ({ ...x, name: x.name && x.name !== x.id ? x.name : null }));
    writeFileSync(join(OUT, `${c.code}.json`), JSON.stringify(list));
    index.push({ code: c.code, cinemas: list.length });
    log(`${c.code}: ${list.length} cinemas.`);
  }
  writeFileSync(join(OUT, 'index.json'), JSON.stringify({ source: 'Wikidata (CC0)', builtAt: new Date().toISOString(), countries: index.sort((a, b) => b.cinemas - a.cinemas) }));
  log('Done.');
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
