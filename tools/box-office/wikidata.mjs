// Real films' recorded box office, from Wikidata (November 22, 2026, docs/BOX-OFFICE-RECORDED.md). Wikidata's data is
// CC0, public domain, so unlike TMDB's it may ship in the build: src/data/box-office/wikidata.json, which every copy of
// the game carries (Base44's included). The owner chose it on November 22 while a licensed dated feed (OpusData) is
// sought; that one would come in through src/engine/box-office-feed.ts.
//   node tools/box-office/wikidata.mjs
// Three queries, each cached in .box-office-cache/: every box-office statement (P2142) on a film with its amount,
// currency, rank, point in time (P585) and territory (P3005); their references (stated in, URL, retrieved P813,
// published P577); and the films' titles (English, else multilingual), release dates and TMDB IDs (P4947).
//
// When a figure counts as known. A save never sees a figure before it was recorded:
// - Its "through" date is its point in time, to the precision recorded (a month or a year is read as its last day).
// - It was known from the earliest date one of its references was published or retrieved on or after "through"; with no
//   such reference, from "through" itself; with no point in time, from its earliest reference date, which is then also
//   its "through".
// - A figure with no date of any kind is left out, and counted. So is a deprecated one (Wikidata's mark for a value
//   known to be wrong) and one whose currency Wikidata doesn't give.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ENDPOINT = 'https://query.wikidata.org/sparql';
const AGENT = 'SLATE-box-office-import/1.0 (a personal film-industry game)';
const CACHE = process.env.BOX_OFFICE_CACHE ?? join(process.cwd(), '.box-office-cache');
const OUT = process.env.BOX_OFFICE_OUT ?? join(process.cwd(), 'src/data/box-office/wikidata.json');
mkdirSync(CACHE, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
const FILMS = '?film wdt:P31/wdt:P279* wd:Q11424; p:P2142 ?st.';

/** The last day a date stands for, at its precision: a day itself, a month's last day, a year's December 31. */
export function lastDay(time, precision) {
  if (!time) return null;
  const d = time.replace(/^\+/, '').slice(0, 10);
  const p = Number(precision ?? 11);
  if (p >= 11) return d;
  if (p === 10) { const [y, m] = d.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10); }
  if (p === 9) return `${d.slice(0, 4)}-12-31`;
  return null; // a decade or coarser says nothing usable
}
/** A release date to the precision recorded: 2006-06-09, 2006-06 or 2006. */
const released = (time, precision) => {
  if (!time) return null;
  const d = time.replace(/^\+/, '').slice(0, 10);
  const p = Number(precision ?? 11);
  return p >= 11 ? d : p === 10 ? d.slice(0, 7) : d.slice(0, 4);
};

/** Where a figure is for: the world, North America (the trade's "domestic", the US and Canada), a country, or not recorded. */
export function territoryOf(whereQ, iso) {
  if (!whereQ) return 'UNSPECIFIED';
  if (whereQ === 'Q13780930') return 'WORLD';
  if (whereQ === 'Q49') return 'NA';
  return iso ?? null; // a region with no country code isn't kept
}

/** When a figure was known and what it runs through, by the rule above; null when it carries no date at all. */
export function knownDates(through, refDates) {
  const refs = refDates.filter(Boolean).sort();
  if (through) return { through, known: refs.find((d) => d >= through) ?? through };
  if (refs.length) return { through: refs[0], known: refs[0] };
  return null;
}

async function main() {
  const st = await query('statements', `SELECT ?film ?st ?amount ?unitCode ?rank ?when ?whenPrec ?where ?whereCode WHERE { ${FILMS} ?st psv:P2142 ?v; wikibase:rank ?rank. ?v wikibase:quantityAmount ?amount; wikibase:quantityUnit ?unit. OPTIONAL { ?unit wdt:P498 ?unitCode } OPTIONAL { ?st pqv:P585 ?wv. ?wv wikibase:timeValue ?when; wikibase:timePrecision ?whenPrec } OPTIONAL { ?st pq:P3005 ?where. OPTIONAL { ?where wdt:P297 ?whereCode } } }`);
  const refs = await query('references', `SELECT ?st ?url ?statedInLabel ?retrieved ?published WHERE { ${FILMS} ?st prov:wasDerivedFrom ?ref. OPTIONAL { ?ref pr:P854 ?url } OPTIONAL { ?ref pr:P248 ?statedIn. ?statedIn rdfs:label ?statedInLabel FILTER(LANG(?statedInLabel) = "en") } OPTIONAL { ?ref pr:P813 ?retrieved } OPTIONAL { ?ref pr:P577 ?published } }`);
  // A title in English, else the multilingual label Wikidata now keeps many films' names under ("mul"); asking for English
  // alone left 582 films titled by their Wikidata ID in the first build of November 22, Avatar among them.
  const films = await query('films-titles', `SELECT ?film ?label ?mul ?tmdb ?date ?datePrec WHERE { { SELECT DISTINCT ?film WHERE { ${FILMS} } } OPTIONAL { ?film rdfs:label ?label FILTER(LANG(?label) = "en") } OPTIONAL { ?film rdfs:label ?mul FILTER(LANG(?mul) = "mul") } OPTIONAL { ?film wdt:P4947 ?tmdb } OPTIONAL { ?film p:P577/psv:P577 ?dv. ?dv wikibase:timeValue ?date; wikibase:timePrecision ?datePrec } }`);

  const refsOf = new Map();
  for (const r of refs.rows) {
    const k = v(r, 'st');
    const list = refsOf.get(k) ?? refsOf.set(k, []).get(k);
    list.push({ src: v(r, 'statedInLabel'), url: v(r, 'url'), dates: [v(r, 'retrieved'), v(r, 'published')].map((t) => t && t.slice(0, 10)) });
  }
  const filmInfo = new Map();
  for (const r of films.rows) {
    const q = qid(v(r, 'film'));
    const had = filmInfo.get(q) ?? { t: null, tmdb: null, y: null };
    had.t ??= v(r, 'label') ?? v(r, 'mul');
    if (v(r, 'tmdb') && !had.tmdb) had.tmdb = Number(v(r, 'tmdb'));
    const rel = released(v(r, 'date'), v(r, 'datePrec'));
    if (rel && (!had.y || rel < had.y)) had.y = rel; // the earliest release recorded
    filmInfo.set(q, had);
  }

  // A film with neither takes its title in whatever language Wikidata has one (five on November 22, 2026).
  const untitled = [...filmInfo.entries()].filter(([, f]) => !f.t).map(([q]) => q);
  if (untitled.length) {
    const any = await query(`titles-any-${untitled.length}`, `SELECT ?film ?l WHERE { VALUES ?film { ${untitled.map((q) => `wd:${q}`).join(' ')} } ?film rdfs:label ?l }`);
    for (const r of any.rows) { const f = filmInfo.get(qid(v(r, 'film'))); if (f && !f.t) f.t = v(r, 'l'); }
  }

  const counts = { statements: 0, kept: 0, deprecated: 0, undated: 0, noCurrency: 0, region: 0 };
  const sources = [];
  const srcIndex = (s) => { const i = sources.indexOf(s); return i >= 0 ? i : sources.push(s) - 1; };
  const out = {};
  const seen = new Set();
  // A statement repeats when its currency or territory has more than one code. The currency kept is the three-letter
  // ISO code (Wikidata lists a few currencies' numeric code too, which the first build of November 22 took for one).
  const codes = new Map();
  for (const r of st.rows) {
    const c = v(r, 'unitCode');
    if (c && /^[A-Z]{3}$/.test(c)) codes.set(v(r, 'st'), c);
  }
  for (const r of st.rows) {
    const key = v(r, 'st');
    if (seen.has(key)) continue;
    seen.add(key);
    counts.statements++;
    if (v(r, 'rank')?.endsWith('DeprecatedRank')) { counts.deprecated++; continue; }
    const cur = codes.get(key);
    if (!cur) { counts.noCurrency++; continue; }
    const where = territoryOf(qid(v(r, 'where')), v(r, 'whereCode'));
    if (!where) { counts.region++; continue; }
    const myRefs = refsOf.get(key) ?? [];
    const dates = knownDates(lastDay(v(r, 'when'), v(r, 'whenPrec')), myRefs.flatMap((x) => x.dates));
    if (!dates) { counts.undated++; continue; }
    const amount = Math.round(Number(v(r, 'amount')));
    if (!Number.isFinite(amount) || amount <= 0) { counts.noCurrency++; continue; }
    const ref = myRefs.find((x) => x.src || x.url) ?? {};
    const host = ref.url ? new URL(ref.url).hostname.replace(/^www\./, '') : null;
    const src = ref.src ?? (host === 'boxofficemojo.com' ? 'Box Office Mojo' : host === 'the-numbers.com' ? 'The Numbers' : host);
    const q = qid(v(r, 'film'));
    const info = filmInfo.get(q) ?? {};
    const film = out[q] ??= { t: info.t ?? q, ...(info.y ? { y: info.y } : {}), ...(info.tmdb ? { tmdb: info.tmdb } : {}), f: [] };
    film.f.push([amount, cur, where, dates.through, dates.known, src ? srcIndex(src) : -1, ...(ref.url ? [ref.url] : [])]);
    counts.kept++;
  }
  const body = { source: 'Wikidata', licence: 'CC0 1.0', retrieved: st.retrievedAt.slice(0, 10), counts, sources, films: out };
  mkdirSync(join(OUT, '..'), { recursive: true });
  writeFileSync(OUT, JSON.stringify(body));
  console.log(`${Object.keys(out).length} films, ${counts.kept} of ${counts.statements} figures kept (deprecated ${counts.deprecated}, undated ${counts.undated}, no currency ${counts.noCurrency}, a region without a country ${counts.region}); ${(JSON.stringify(body).length / 1048576).toFixed(2)} MB.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
