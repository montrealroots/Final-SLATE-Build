// Imports the SLATE Homes & Property research package (v2, prepared November 16, 2026) into the game's lazily loaded
// housing packs (src/data/homes). Run: node tools/homes/import.mjs <path to SLATE-Homes-Property-Research-v2>.
// The package itself isn't in this repository (136 MB, and row-level French records can't be published, below); this
// tool and its report (docs/homes/IMPORT-REPORT.json) are how the packs were made. Written November 17, 2026.
//
// What is imported, and what isn't (the package's 03-DATA-IMPORT-CONTRACT.md):
// - HUD FY2026 Fair Market Rents (public domain, US government): every area row, original and revised kept as two
//   versions of one benchmark, and every ZIP/area row (a ZIP in two areas stays in both). By state.
// - Singapore HDB resale transactions (Singapore Open Data Licence: attribution kept in sources): every row, by town.
//   Block and street only; storey a band, flat type a label (not a bedroom count). Historical sales, not listings.
// - France DVF 2025 strictly single-row residential sales: aggregated by commune, no addresses or rows. DVF's reuse
//   conditions forbid re-identification and indexing by search engines, and this repository is public; the 157,091
//   address examples are counted in the coverage report, not copied.
// - EPA ENERGY STAR model records (7,430): technical facts only, by category. No prices, stock, photos or clearances.
// - The 19 scoped rules, 46 sources, ONS rent aggregates, the NAHB construction benchmark, EIA average prices by state
//   and the worked examples, as given.
// - Coverage: the 252-entry roster as is, and the 171,750 archived places counted by country (every one with zero
//   verified listings, so the rows themselves add nothing a count doesn't say).
// Every table is checked before anything is written: required columns, finite numbers, positive prices, unique keys.
// Unknown stays null; an empty field is never 0.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const PKG = process.argv[2];
if (!PKG) throw new Error('Usage: node tools/homes/import.mjs <package directory>');
const OUT = 'src/data/homes';
const data = (f) => join(PKG, 'data', f);
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. */
function csv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter((r) => r.length > 1 || r[0]).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}
const read = (f) => readFileSync(f, 'utf8');
/** A number from a source field, or null when it's empty. Never 0 for a missing value. */
const num = (s) => (s === '' || s === undefined || s === null ? null : Number(s));
const median = (xs) => { const s = xs.filter((x) => x !== null && Number.isFinite(x)).sort((a, b) => a - b); if (!s.length) return null; const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); };
const write = (rel, obj) => { const p = join(OUT, rel); mkdirSync(join(p, '..'), { recursive: true }); writeFileSync(p, JSON.stringify(obj)); return p; };
const report = { importedAt: '2026-11-17', package: 'SLATE-Homes-Property-Research-v2 (prepared 2026-11-16)', tables: {} };

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ---------------- HUD ----------------
{
  const orig = csv(read(data('hud2026_original.csv')));
  const rev = csv(read(data('hud2026_revised.csv')));
  const zips = csv(read(data('hud2026_zip_revised.csv')));
  for (const [name, t] of [['original', orig], ['revised', rev]]) {
    check(t.length === 4764, `HUD ${name}: ${t.length} rows, expected 4,764`);
    for (const r of t) for (let b = 0; b <= 4; b++) check(Number.isFinite(num(r[`fmr_${b}`])) && num(r[`fmr_${b}`]) > 0, `HUD ${name} ${r.fips} fmr_${b} isn't a positive number`);
  }
  check(zips.length === 51895, `HUD ZIP: ${zips.length} rows, expected 51,895`);
  const keyOf = (r) => `${r.fips}`;
  const origBy = new Map(orig.map((r) => [keyOf(r), r]));
  check(origBy.size === orig.length, 'HUD original: duplicate FIPS rows');
  const zipKeys = new Set();
  for (const z of zips) { const k = `${z['ZIP Code']}|${z['HUD Area Code']}`; check(!zipKeys.has(k), `HUD ZIP duplicate ${k}`); zipKeys.add(k); }
  const byState = {};
  const areaState = new Map();
  for (const r of rev) {
    const o = origBy.get(keyOf(r));
    const st = (byState[r.stusps] ??= { areas: [], zips: [] });
    st.areas.push({
      fips: r.fips, area: r.hud_area_code, areaName: r.hud_area_name, county: r.countyname, town: r.county_town_name || null, metro: r.metro === '1', pop2023: num(r.pop2023),
      revised: [0, 1, 2, 3, 4].map((b) => num(r[`fmr_${b}`])),
      original: o ? [0, 1, 2, 3, 4].map((b) => num(o[`fmr_${b}`])) : null,
    });
    areaState.set(r.hud_area_code, r.stusps);
  }
  let unplaced = 0;
  for (const z of zips) {
    const st = areaState.get(z['HUD Area Code']);
    if (!st) { unplaced++; continue; }
    byState[st].zips.push({ zip: z['ZIP Code'], area: z['HUD Area Code'], safmr: [0, 1, 2, 3, 4].map((b) => num(z[`SAFMR ${b}BR`])) });
  }
  for (const [st, v] of Object.entries(byState)) write(`hud/${st}.json`, { source: 'US-HUD', version: 'FY2026 (revised; original kept beside)', basis: 'gross rent benchmark (40th percentile, rent plus utilities); not an asking or base rent', ...v });
  report.tables.hud = { areaRowsPerVersion: rev.length, zipAreaRows: zips.length - unplaced, zipRowsWithoutAreaState: unplaced, states: Object.keys(byState).length };
}

// ---------------- Singapore HDB ----------------
{
  const rows = csv(read(data('singapore_hdb_sales.csv')));
  check(rows.length === 244773, `Singapore: ${rows.length} rows, expected 244,773`);
  const ids = new Set();
  const byTown = {};
  for (const r of rows) {
    check(!ids.has(r._id), `Singapore duplicate _id ${r._id}`); ids.add(r._id);
    const price = num(r.resale_price);
    check(Number.isFinite(price) && price > 0, `Singapore ${r._id}: price isn't positive`);
    // Remaining lease as months ("61 years 04 months" -> 736); null where the source has none (early rows).
    const rl = /(\d+) years?(?: (\d+) months?)?/.exec(r.remaining_lease || '');
    (byTown[r.town] ??= []).push({ id: Number(r._id), month: r.month, flatType: r.flat_type, block: r.block, street: r.street_name, storey: r.storey_range, area: num(r.floor_area_sqm), model: r.flat_model, leaseFrom: num(r.lease_commence_date), remainingMonths: rl ? Number(rl[1]) * 12 + Number(rl[2] ?? 0) : null, price });
  }
  const towns = [];
  for (const [town, list] of Object.entries(byTown)) {
    const file = town.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    // Repeated words kept once each (dict), rows refer to them by index: the pack is a quarter of the rows as written.
    const dict = { month: [], flatType: [], street: [], storey: [], model: [] };
    const ix = (k, v) => { let i = dict[k].indexOf(v); if (i < 0) { i = dict[k].length; dict[k].push(v); } return i; };
    const rowsOut = list.map((r) => [r.id, ix('month', r.month), ix('flatType', r.flatType), r.block, ix('street', r.street), ix('storey', r.storey), r.area, ix('model', r.model), r.leaseFrom, r.remainingMonths, r.price]);
    write(`sg/${file}.json`, { source: 'SG-HDB', town, columns: ['id', 'month#', 'flatType#', 'block', 'street#', 'storeyBand#', 'floorAreaM2', 'flatModel#', 'leaseFrom', 'remainingLeaseMonths', 'priceSgd'], dict, rows: rowsOut });
    const recent = list.filter((r) => r.month >= '2025-11');
    towns.push({ town, file, transactions: list.length, blocks: new Set(list.map((r) => `${r.block} ${r.street}`)).size, lastMonth: list.reduce((a, r) => (r.month > a ? r.month : a), ''), medianPriceLast12: median(recent.map((r) => r.price)), medianAreaLast12: median(recent.map((r) => r.area)) });
  }
  write('sg/towns.json', { source: 'SG-HDB', towns: towns.sort((a, b) => a.town.localeCompare(b.town)) });
  report.tables.singapore = { transactions: rows.length, towns: towns.length };
}

// ---------------- France (aggregates only) ----------------
{
  const rows = csv(read(data('france_2025_single_row_residential_sales.csv')));
  check(rows.length === 242378, `France: ${rows.length} rows, expected 242,378`);
  const cov = new Map(csv(read(data('france_commune_coverage.csv'))).map((r) => [r.commune_code, r]));
  const ids = new Set();
  const by = new Map();
  for (const r of rows) {
    check(!ids.has(r.source_record_id), `France duplicate mutation ${r.source_record_id}`); ids.add(r.source_record_id);
    const price = num(r.price_eur), area = num(r.floor_area_m2);
    check(price > 0 && area > 0, `France ${r.source_record_id}: price or area isn't positive`);
    const lat = num(r.latitude), lon = num(r.longitude);
    const c = by.get(r.commune_code) ?? { code: r.commune_code, name: r.commune, dept: r.commune_code.slice(0, r.commune_code.startsWith('97') ? 3 : 2), house: [], apartment: [], lat: [], lon: [], first: r.observed_date, last: r.observed_date };
    (r.property_type === 'Maison' ? c.house : c.apartment).push({ price, area, rooms: num(r.principal_rooms), plot: num(r.plot_area_m2) });
    if (Number.isFinite(lat) && Number.isFinite(lon)) { c.lat.push(lat); c.lon.push(lon); }
    if (r.observed_date < c.first) c.first = r.observed_date;
    if (r.observed_date > c.last) c.last = r.observed_date;
    by.set(r.commune_code, c);
  }
  const stats = (xs) => (xs.length ? { sales: xs.length, medianPriceEur: median(xs.map((x) => x.price)), medianPricePerM2Eur: median(xs.map((x) => Math.round(x.price / x.area))), medianFloorAreaM2: median(xs.map((x) => x.area)), medianPrincipalRooms: median(xs.map((x) => x.rooms)), medianPlotM2: median(xs.map((x) => x.plot)) } : null);
  const byDept = {};
  for (const c of by.values()) {
    const k = cov.get(c.code);
    (byDept[c.dept] ??= []).push({
      code: c.code, name: c.name, lat: c.lat.length ? +(c.lat.reduce((a, b) => a + b, 0) / c.lat.length).toFixed(4) : null, lon: c.lon.length ? +(c.lon.reduce((a, b) => a + b, 0) / c.lon.length).toFixed(4) : null,
      house: stats(c.house), apartment: stats(c.apartment), firstObserved: c.first, lastObserved: c.last,
      distinctAddresses: k ? Number(k.distinct_addresses) : null, addressExamplesInPackage: k ? Number(k.selected_addresses) : null, gapTo50: k ? Number(k.gap_to_50) : null,
    });
  }
  for (const [d, list] of Object.entries(byDept)) write(`fr/${d}.json`, { source: 'FR-DVF-2025', basis: 'recorded 2025 sales, single-row residential mutations only; medians, not listings or asking prices', communes: list });
  write('fr/index.json', { source: 'FR-DVF-2025', departments: Object.fromEntries(Object.entries(byDept).map(([d, l]) => [d, l.map((c) => [c.code, c.name])])) });
  report.tables.france = { transactionsAggregated: rows.length, communes: by.size, departments: Object.keys(byDept).length, rowLevelRecordsPublished: 0, addressExamplesPublished: 0 };
  check(by.size === 19797, `France: ${by.size} communes, expected 19,797`);
}

// ---------------- Appliances ----------------
{
  const models = JSON.parse(read(data('appliances/models.json')));
  check(models.length === 7430, `Appliances: ${models.length}, expected 7,430`);
  const ids = new Set();
  const byCat = {};
  for (const m of models) {
    check(!ids.has(m.id), `Appliance duplicate ${m.id}`); ids.add(m.id);
    check(m.price === null, `Appliance ${m.id} carries a price the package says it has none of`);
    // [id, brand, model (wildcards kept), markets, on market from, height in, width in, depth in, annual test kWh,
    //  water gal/cycle, annual water gal, voltage, fuel, venting]
    (byCat[m.category] ??= []).push([m.source_record_id, m.brand, m.model, m.markets, m.available_on_market ? m.available_on_market.slice(0, 10) : null, num(m.height_in), num(m.width_in), num(m.depth_in), num(m.annual_test_energy_kwh), num(m.water_us_gallons_per_cycle), num(m.annual_test_water_us_gallons), m.voltage ?? null, m.fuel_type ?? null, m.venting ?? null]);
  }
  for (const [cat, list] of Object.entries(byCat)) write(`appliances/${cat}.json`, { source: `EPA-${cat}`, columns: ['id', 'brand', 'model', 'markets', 'onMarketFrom', 'heightIn', 'widthIn', 'depthIn', 'annualTestKwh', 'waterGalPerCycle', 'annualWaterGal', 'voltage', 'fuel', 'venting'], rows: list });
  report.tables.appliances = Object.fromEntries(Object.entries(byCat).map(([k, v]) => [k, v.length]));
}

// ---------------- Rules, sources, benchmarks ----------------
{
  const rules = JSON.parse(read(data('scoped_rules.json')));
  check(rules.length === 19, `Rules: ${rules.length}, expected 19`);
  const sources = JSON.parse(read(join(PKG, 'research/sources.json')));
  check(sources.length === 46, `Sources: ${sources.length}, expected 46`);
  const srcIds = new Set(sources.map((s) => s.id));
  for (const r of rules) check(srcIds.has(r.source_id), `Rule ${r.id} cites ${r.source_id}, not in sources`);
  write('rules.json', rules);
  write('sources.json', sources);
  write('benchmarks.json', {
    ons: JSON.parse(read(data('market_benchmarks.json'))),
    nahb: JSON.parse(read(data('construction_benchmark.json'))),
    eia: JSON.parse(read(data('us_electricity_averages.json'))),
    workedExamples: JSON.parse(read(data('worked_cost_examples.json'))),
  });
  report.tables.rules = rules.length;
  report.tables.sources = sources.length;
}

// ---------------- Coverage ----------------
{
  const juris = csv(read(data('world_jurisdiction_coverage.csv')));
  check(juris.length === 252, `Jurisdictions: ${juris.length}, expected 252`);
  const places = csv(read(data('world_location_coverage.csv')));
  check(places.length === 171750, `Archived places: ${places.length}, expected 171,750`);
  check(places.every((p) => p.verified_available_listings_in_package === '0'), 'An archived place claims verified listings');
  const perCountry = {};
  for (const p of places) perCountry[p.country_code] = (perCountry[p.country_code] ?? 0) + 1;
  write('coverage.json', {
    note: 'Coverage of researched housing evidence. Zero verified live listings anywhere: every count of homes in the game is simulated, from the evidence named.',
    jurisdictions: juris.map((j) => ({ code: j.code, name: j.legacy_name, currency: j.currency_from_legacy || null, archivedPlaces: perCountry[j.code] ?? 0, researchProfiles: j.research_profiles ? j.research_profiles.split(/[;|]/).map((x) => x.trim()).filter(Boolean) : [], housingData: j.housing_data_status, completeLocalLaw: j.complete_local_law === 'True', verifiedCurrentListings: Number(j.verified_current_listings) })),
    archivedPlaces: places.length, targetPerPlace: 50, verifiedLiveListings: 0,
  });
  report.tables.coverage = { jurisdictions: juris.length, archivedPlaces: places.length };
}

report.problems = problems;
mkdirSync('docs/homes', { recursive: true });
writeFileSync('docs/homes/IMPORT-REPORT.json', JSON.stringify(report, null, 1) + '\n');
if (problems.length) { console.error(problems.slice(0, 20).join('\n')); console.error(`${problems.length} problems`); process.exit(1); }
console.log(JSON.stringify(report.tables));
