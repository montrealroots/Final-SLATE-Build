// Who owns the networks and streaming services the catalog's series are on, and what kind of outlet each is (November 11,
// 2026, the owner's request). TMDB records a network's name, country, headquarters and homepage, not its owners, so
// those come from Wikidata, whose data is CC0. Run after the importer:
//   node tools/screen-catalog/networks.mjs
// A network is matched to a Wikidata item in one of three ways, and the way is recorded:
// - "tmdb": the item names the network's TMDB id (P13128);
// - "website": the item's official website (P856) has the same address as the network's TMDB homepage;
// - "name": the item is the only broadcaster or streaming service with that name, as its label or an alias, in the
//   network's country.
// Anything else stays unmatched, and the game says its owners aren't recorded rather than guessing.
// Responses are cached in .screen-catalog-cache/wikidata/; the result is .screen-catalog-cache/networks.json, which the
// catalog build reads.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CACHE, cached } from './tmdb.mjs';

const AGENT = 'SLATE-catalog-import/1.0 (a personal film-industry game)';
const WD = join(CACHE, 'wikidata');
mkdirSync(WD, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

/** A Wikidata request, cached by its URL, a second apart and retried as the services ask. */
async function wd(url) {
  const f = join(WD, `${createHash('sha1').update(url).digest('hex')}.json`);
  if (existsSync(f)) return JSON.parse(readFileSync(f, 'utf8'));
  let last = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(attempt ? 2000 * 2 ** attempt : 1000);
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json, application/sparql-results+json', 'User-Agent': AGENT } });
      if (res.status === 429) { await sleep(1000 * (Number(res.headers.get('retry-after')) || 30)); last = '429'; continue; }
      if (!res.ok) { last = `HTTP ${res.status}`; continue; }
      const body = await res.json();
      writeFileSync(f, JSON.stringify(body));
      return body;
    } catch (e) { last = e.message; }
  }
  throw new Error(`${url}: ${last}`);
}
const sparql = (q) => wd(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`).then((b) => b.results.bindings);
const v = (b, k) => b[k]?.value ?? null;
const qid = (uri) => uri?.split('/').pop() ?? null;
/**
 * A Wikidata date to the precision it was recorded at: a day (precision 11) as 2025-08-07, a month (10) as 2025-08, a
 * year or coarser as 2025. Wikidata writes a year as January 1 of it, which read as a day would claim what isn't known.
 */
export const dated = (t, precision) => {
  if (!t) return null;
  const d = t.replace(/^\+/, '').slice(0, 10);
  const p = Number(precision ?? 11);
  return p >= 11 ? d : p === 10 ? d.slice(0, 7) : d.slice(0, 4);
};

// The kinds of outlet the engine takes from Wikidata, by the classes an item is a direct instance of (looked up on
// Wikidata, November 11, 2026). Broadcast isn't among them: Wikidata gives NBC, CBS and FOX only "television network",
// which it also gives premium cable channels, and files MGM+ and the UK's Nick Jr. as television stations. Broadcast
// networks are named in src/engine/industry.ts instead.
export const KINDS = {
  streaming: ['Q59152282', 'Q829548', 'Q723685'], // video streaming service, over-the-top media service, video on demand
  cable: ['Q5009242', 'Q561068', 'Q721830', 'Q1762059'], // cable, specialty, subscription and premium television channels
};
// Classes of broadcast outlets, which count as outlets when matching but give no kind.
const BROADCAST = ['Q141683', 'Q1254874', 'Q1616075', 'Q1126006', 'Q848981'];
// What counts as an outlet when matching by name: any of the above, a television channel or a broadcaster, or a subclass.
const OUTLETS = [...Object.values(KINDS).flat(), ...BROADCAST, 'Q2001305', 'Q15265344', 'Q11499011', 'Q135301631'];

/** The kind of outlet from an item's direct classes: streaming first, then cable; none if it has neither. */
export function kindOf(classes) {
  for (const [k, ids] of Object.entries(KINDS)) if (ids.some((c) => classes.includes(c))) return k;
  return null;
}

/** A web address reduced to compare: no scheme, no "www.", no trailing slash, lower case. */
export const site = (u) => (u ? u.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '') : null);

/** The facts the game uses about Wikidata items: classes, country codes, websites, owners with dates, parent, dates. */
async function facts(qids) {
  const out = new Map();
  for (let i = 0; i < qids.length; i += 100) {
    const rows = await sparql(`SELECT ?i ?iLabel ?class ?cc ?site ?inception ?inceptionP ?dissolved ?dissolvedP ?owner ?ownerLabel ?from ?fromP ?to ?toP ?parent ?parentLabel WHERE {
      VALUES ?i { ${qids.slice(i, i + 100).map((q) => `wd:${q}`).join(' ')} }
      OPTIONAL { ?i wdt:P31 ?class } OPTIONAL { ?i wdt:P17/wdt:P297 ?cc } OPTIONAL { ?i wdt:P856 ?site }
      OPTIONAL { ?i p:P571/psv:P571 [ wikibase:timeValue ?inception; wikibase:timePrecision ?inceptionP ] }
      OPTIONAL { ?i p:P576/psv:P576 [ wikibase:timeValue ?dissolved; wikibase:timePrecision ?dissolvedP ] }
      OPTIONAL { ?i p:P127 ?os. ?os ps:P127 ?owner.
        OPTIONAL { ?os pqv:P580 [ wikibase:timeValue ?from; wikibase:timePrecision ?fromP ] }
        OPTIONAL { ?os pqv:P582 [ wikibase:timeValue ?to; wikibase:timePrecision ?toP ] } }
      OPTIONAL { ?i wdt:P749 ?parent }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,mul". }
    }`);
    for (const r of rows) {
      const id = qid(v(r, 'i'));
      const x = out.get(id) ?? { qid: id, label: v(r, 'iLabel'), classes: new Set(), countries: new Set(), sites: new Set(), inception: null, dissolved: null, owners: new Map(), parents: new Map() };
      if (v(r, 'class')) x.classes.add(qid(v(r, 'class')));
      if (v(r, 'cc')) x.countries.add(v(r, 'cc'));
      if (v(r, 'site')) x.sites.add(site(v(r, 'site')));
      x.inception ??= dated(v(r, 'inception'), v(r, 'inceptionP'));
      x.dissolved ??= dated(v(r, 'dissolved'), v(r, 'dissolvedP'));
      if (v(r, 'owner')) {
        const from = dated(v(r, 'from'), v(r, 'fromP'));
        const to = dated(v(r, 'to'), v(r, 'toP'));
        x.owners.set(`${qid(v(r, 'owner'))}|${from ?? ''}|${to ?? ''}`, { qid: qid(v(r, 'owner')), name: v(r, 'ownerLabel'), from, to });
      }
      if (v(r, 'parent')) x.parents.set(qid(v(r, 'parent')), v(r, 'parentLabel'));
      out.set(id, x);
    }
  }
  return out;
}

/** Which items are outlets: instances of an outlet class or of one of its subclasses. */
async function outlets(qids) {
  const ok = new Set();
  for (let i = 0; i < qids.length; i += 100) {
    const rows = await sparql(`SELECT DISTINCT ?i WHERE { VALUES ?i { ${qids.slice(i, i + 100).map((q) => `wd:${q}`).join(' ')} }
      VALUES ?o { ${OUTLETS.map((q) => `wd:${q}`).join(' ')} } ?i wdt:P31/wdt:P279* ?o. }`);
    for (const r of rows) ok.add(qid(v(r, 'i')));
  }
  return ok;
}

async function main() {
  const manifest = JSON.parse(readFileSync(join(CACHE, 'manifest.json'), 'utf8'));
  const nets = (manifest.networks ?? []).map((id) => { const d = cached(`network/${id}`)?.body; return d ? { id, name: d.name, country: d.origin_country || null, headquarters: d.headquarters || null, homepage: d.homepage || null } : null; }).filter(Boolean);
  log(`${nets.length} networks.`);

  // By TMDB id first.
  const byTmdb = new Map((await sparql(`SELECT ?t ?i WHERE { VALUES ?t { ${nets.map((n) => `"${n.id}"`).join(' ')} } ?i wdt:P13128 ?t. }`)).map((r) => [Number(v(r, 't')), qid(v(r, 'i'))]));
  // Then candidates by name: items whose English label or alias is the network's name. (Wikidata's search API refused
  // this machine with 429s on November 11, 2026; the query service didn't.)
  const candidates = new Map(nets.map((n) => [n.id, []]));
  for (let i = 0; i < nets.length; i += 50) {
    const batch = nets.slice(i, i + 50);
    const rows = await sparql(`SELECT DISTINCT ?name ?i WHERE { VALUES ?name { ${batch.map((n) => JSON.stringify(n.name) + '@en').join(' ')} } { ?i rdfs:label ?name } UNION { ?i skos:altLabel ?name } }`);
    for (const r of rows) for (const n of batch.filter((x) => x.name === v(r, 'name'))) candidates.get(n.id).push(qid(v(r, 'i')));
  }
  const all = [...new Set([...byTmdb.values(), ...[...candidates.values()].flat()])];
  const info = await facts(all);
  const isOutlet = await outlets(all);

  const out = [];
  for (const n of nets) {
    let match = null;
    let how = null;
    if (byTmdb.has(n.id)) { match = byTmdb.get(n.id); how = 'tmdb'; }
    const cands = (candidates.get(n.id) ?? []).filter((q) => info.has(q) && isOutlet.has(q));
    if (!match && n.homepage) {
      const hit = cands.filter((q) => info.get(q).sites.has(site(n.homepage)));
      if (hit.length === 1) { match = hit[0]; how = 'website'; }
    }
    if (!match) {
      const hit = cands.filter((q) => !n.country || info.get(q).countries.has(n.country));
      if (hit.length === 1) { match = hit[0]; how = 'name'; }
    }
    const x = match ? info.get(match) : null;
    out.push({
      ...n,
      wikidata: x ? { qid: x.qid, label: x.label, matchedBy: how, classes: [...x.classes], kind: kindOf([...x.classes]), inception: x.inception, dissolved: x.dissolved,
        owners: [...x.owners.values()].sort((a, b) => (a.from ?? '').localeCompare(b.from ?? '')), parents: [...x.parents].map(([q, name]) => ({ qid: q, name })) } : null,
    });
  }
  writeFileSync(join(CACHE, 'networks.json'), JSON.stringify({ builtAt: new Date().toISOString(), source: 'TMDB (details) and Wikidata (CC0: owners, kind, dates)', networks: out }));
  const matched = out.filter((n) => n.wikidata);
  log(`Matched ${matched.length} of ${out.length}: ${['tmdb', 'website', 'name'].map((h) => `${matched.filter((n) => n.wikidata.matchedBy === h).length} by ${h}`).join(', ')}. With owners: ${matched.filter((n) => n.wikidata.owners.length || n.wikidata.parents.length).length}. With a kind: ${matched.filter((n) => n.wikidata.kind).length}.`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
