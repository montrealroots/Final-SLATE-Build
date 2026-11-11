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
// A date to the precision Wikidata recorded it at: a day, a month (1932-05) or a year (1932). Wikidata writes a year as
// January 1 of it; read as a day, that would claim what isn't known (the first build did, until November 11, 2026).
const day = (t, precision) => {
  if (!t) return null;
  const d = t.replace(/^\+/, '').slice(0, 10);
  const p = Number(precision ?? 11);
  return p >= 11 ? d : p === 10 ? d.slice(0, 7) : d.slice(0, 4);
};

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
      // Named "dated" since the precision was added: the first build's cached answers had none.
      const rows = (await query(`dated-${c.code}-${i / 200}`, `SELECT ?c ?cLabel ?coord ?opened ?openedP ?inception ?inceptionP ?closed ?closedP ?dissolved ?dissolvedP ?stateLabel ?seats ?opLabel ?inLabel WHERE {
        VALUES ?c { ${batch.map((x) => `wd:${x}`).join(' ')} }
        ?c wdt:P625 ?coord.
        OPTIONAL { ?c p:P1619/psv:P1619 [ wikibase:timeValue ?opened; wikibase:timePrecision ?openedP ] }
        OPTIONAL { ?c p:P571/psv:P571 [ wikibase:timeValue ?inception; wikibase:timePrecision ?inceptionP ] }
        OPTIONAL { ?c p:P3999/psv:P3999 [ wikibase:timeValue ?closed; wikibase:timePrecision ?closedP ] }
        OPTIONAL { ?c p:P576/psv:P576 [ wikibase:timeValue ?dissolved; wikibase:timePrecision ?dissolvedP ] }
        OPTIONAL { ?c wdt:P5817 ?state } OPTIONAL { ?c wdt:P1083 ?seats } OPTIONAL { ?c wdt:P137 ?op } OPTIONAL { ?c wdt:P131 ?in }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
      }`)).rows;
      // A cinema with several values for a field comes back as several rows: the first of each is kept.
      for (const r of rows) {
        const id = qid(v(r, 'c'));
        const m = /Point\(([-\d.]+) ([-\d.]+)\)/.exec(v(r, 'coord') ?? '');
        const x = byId.get(id) ?? { id, name: v(r, 'cLabel'), lat: m ? Number(m[2]) : null, lon: m ? Number(m[1]) : null };
        x.opened ??= day(v(r, 'opened'), v(r, 'openedP')) ?? day(v(r, 'inception'), v(r, 'inceptionP'));
        x.closed ??= day(v(r, 'closed'), v(r, 'closedP')) ?? day(v(r, 'dissolved'), v(r, 'dissolvedP'));
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
