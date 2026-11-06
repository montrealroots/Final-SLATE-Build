// Validates the imported world data (GeoNames gazetteer, regions, Natural Earth outlines, WMO stations, holiday
// rules) and writes:
//   src/world/gazetteer/index.json  a small country index the app loads at startup (no place rows)
//   docs/world/world-coverage.json  counts, checks and every exclusion with its reason
//   docs/world/COUNTRY-COVERAGE.csv the package's ledger with this build's implementation status
// Every source row is accounted for; the script exits non-zero if any check fails.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const countries = JSON.parse(read('src/world/gazetteer/countries.json'));
const regions = JSON.parse(read('src/world/gazetteer/regions.json'));
const map = JSON.parse(read('src/world/map/world-map.json'));
const holidays = JSON.parse(read('src/world/holidays/countries.json'));
const stations = JSON.parse(read('src/world/weather/stations.json'));

// Entries that can't be a 2026 starting place, with the reason. Everything else is a selectable country or territory;
// the label is neutral and is not a statement about sovereignty.
const NOT_PLAYABLE = {
  AN: 'Historical entry: the Netherlands Antilles were dissolved in 2010. Its former islands are listed under CW, SX and BQ.',
  CS: 'Historical entry: Serbia and Montenegro split in 2006. Use RS or ME.',
  AQ: 'No populated place in the source (Antarctica).',
  BV: 'No populated place in the source (Bouvet Island).',
  HM: 'No populated place in the source (Heard Island and McDonald Islands).',
  UM: 'No populated place in the source (United States Minor Outlying Islands).',
};
const NOTES = { XK: 'Kosovo uses the user-assigned code XK, as GeoNames does; the label is neutral.' };

const zones = new Set(Intl.supportedValuesOf('timeZone'));
const zoneOk = (z) => {
  if (zones.has(z)) return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: z });
    return true;
  } catch {
    return false;
  }
};

const shardFiles = readdirSync(new URL('src/world/gazetteer/places/', root)).filter((f) => f.endsWith('.tsv'));
const problems = [];
const ids = new Set();
let rows = 0;
const stationCountries = new Set(stations.stations.map((s) => s[3]));
const index = {};
const ledger = [];
for (const code of Object.keys(countries).sort()) {
  const file = `${code}.tsv`;
  const has = shardFiles.includes(file);
  let n = 0;
  if (has) {
    for (const line of read(`src/world/gazetteer/places/${file}`).split('\n')) {
      if (line === '') continue;
      const [id, name, , region, lat, lon, zone, population, elevation] = line.split('\t');
      n += 1;
      rows += 1;
      if (ids.has(id)) problems.push(`${code}: duplicate place id ${id}`);
      ids.add(id);
      if (!name?.trim()) problems.push(`${code}:${id} has no name`);
      const la = Number(lat);
      const lo = Number(lon);
      if (!(la >= -90 && la <= 90) || !(lo >= -180 && lo <= 180)) problems.push(`${code}:${id} has coordinates out of range`);
      if (!zoneOk(zone)) problems.push(`${code}:${id} has an unknown time zone ${zone}`);
      if (region && !Object.hasOwn(regions, region)) problems.push(`${code}:${id} references a missing region ${region}`);
      if (Number.isNaN(Number(population))) problems.push(`${code}:${id} has a bad population`);
      if (elevation !== '' && Number.isNaN(Number(elevation))) problems.push(`${code}:${id} has a bad elevation`);
    }
  }
  const playable = has && !NOT_PLAYABLE[code];
  const regionCount = Object.keys(regions).filter((k) => k.startsWith(`${code}.`)).length;
  index[code] = {
    name: countries[code].name, playable, places: n, regions: regionCount, outline: Object.hasOwn(map.countries, code),
    holidays: Object.hasOwn(holidays, code), stations: stationCountries.has(code),
  };
  ledger.push({ code, playable, places: n, reason: NOT_PLAYABLE[code] ?? NOTES[code] ?? '' });
}
const extraShards = shardFiles.filter((f) => !Object.hasOwn(countries, f.replace('.tsv', '')));
for (const f of extraShards) problems.push(`Shard ${f} has no country entry`);

const summary = {
  generatedBy: 'npm run world:check',
  timeZoneData: process.versions.tz ?? 'unknown',
  entries: Object.keys(countries).length,
  playable: ledger.filter((l) => l.playable).length,
  notPlayable: ledger.filter((l) => !l.playable).map((l) => ({ code: l.code, reason: l.reason })),
  regions: Object.keys(regions).length,
  shards: shardFiles.length,
  placeRows: rows,
  uniquePlaceIds: ids.size,
  outlines: Object.keys(map.countries).length,
  entriesWithoutOutline: Object.keys(countries).filter((c) => !Object.hasOwn(map.countries, c)).length,
  holidayRuleEntries: Object.keys(holidays).length,
  entriesWithoutHolidayRules: Object.keys(countries).filter((c) => !Object.hasOwn(holidays, c)),
  stationRecords: stations.stations.length,
  entriesWithoutOwnStation: Object.keys(countries).filter((c) => !stationCountries.has(c)),
  problems,
};
writeFileSync(new URL('src/world/gazetteer/index.json', root), `${JSON.stringify(index)}\n`);
writeFileSync(new URL('docs/world/world-coverage.json', root), `${JSON.stringify(summary, null, 2)}\n`);

// Update the package ledger with what this build does with each entry.
const csv = read('docs/world/COUNTRY-COVERAGE.csv').trim().split('\n');
const header = csv[0];
const out = [header];
for (const line of csv.slice(1)) {
  const code = line.slice(0, 2);
  const e = index[code];
  const status = !e ? 'missing-from-import' : e.playable ? `imported-playable;holidays:${e.holidays ? 'rules' : 'none-kept'};weather:${e.stations ? 'own-stations' : 'borrowed-or-modeled'}` : `imported-not-playable:${NOT_PLAYABLE[code] ? 'see world-coverage.json' : ''}`;
  out.push(line.replace(/,[^,]*$/, `,${status}`));
}
writeFileSync(new URL('docs/world/COUNTRY-COVERAGE.csv', root), `${out.join('\n')}\n`);

console.log(`${summary.entries} entries (${summary.playable} playable), ${summary.regions} regions, ${summary.shards} shards, ${summary.placeRows} rows, ${summary.uniquePlaceIds} unique ids, ${summary.outlines} outlines, ${summary.holidayRuleEntries} holiday entries, ${summary.stationRecords} stations; ${problems.length} problems`);
if (problems.length) {
  console.error(problems.slice(0, 20).join('\n'));
  process.exit(1);
}
