// The county of each US place in the world catalog (from November 17, 2026), so a town is priced from its own county's
// HUD Fair Market Rent and never matched by name alone. Until then Lancaster, Texas matched no HUD area and fell back
// to the game's placeholder, though it is in Dallas County. The county is GeoNames' admin2 code (the county FIPS code
// in the US), read from GeoNames' cities500 dump (CC BY 4.0), the same source as the gazetteer, by GeoNames id.
//   node tools/homes/counties.mjs <cities500.txt>
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';

const STATE_FIPS = {
  AL: '01', AK: '02', AZ: '04', AR: '05', CA: '06', CO: '08', CT: '09', DE: '10', DC: '11', FL: '12', GA: '13', HI: '15', ID: '16', IL: '17', IN: '18', IA: '19',
  KS: '20', KY: '21', LA: '22', ME: '23', MD: '24', MA: '25', MI: '26', MN: '27', MS: '28', MO: '29', MT: '30', NE: '31', NV: '32', NH: '33', NJ: '34', NM: '35',
  NY: '36', NC: '37', ND: '38', OH: '39', OK: '40', OR: '41', PA: '42', RI: '44', SC: '45', SD: '46', TN: '47', TX: '48', UT: '49', VT: '50', VA: '51', WA: '53',
  WV: '54', WI: '55', WY: '56', PR: '72',
};
const src = process.argv[2];
if (!src) { console.error('usage: node tools/homes/counties.mjs <cities500.txt>'); process.exit(1); }
const admin2 = new Map();
for (const line of readFileSync(src, 'utf8').split('\n')) {
  const c = line.split('\t');
  if (c[8] === 'US' && c[11]) admin2.set(c[0], [c[10], c[11]]);
}
const out = {};
let places = 0, missing = 0;
for (const f of readdirSync('src/world/gazetteer/places').filter((x) => x.endsWith('.tsv'))) {
  for (const line of readFileSync(`src/world/gazetteer/places/${f}`, 'utf8').split('\n')) {
    const c = line.split('\t');
    if (!c[3]?.startsWith('US.')) continue;
    places++;
    const a = admin2.get(c[0]);
    const st = STATE_FIPS[a?.[0]];
    if (!a || !st) { missing++; continue; }
    out[c[0]] = st + a[1].padStart(3, '0');
  }
}
// The catalog's own US cities, by their catalog id: the same mapping, for places that aren't GeoNames ids.
const CATALOG = { 'us-los-angeles': '06037', 'us-new-york': '36061', 'us-atlanta': '13121', 'us-austin': '48453', 'us-chicago': '17031', 'us-boulder': '08013', 'us-albuquerque': '35001', 'us-anchorage': '02020', 'us-honolulu': '15003' };
Object.assign(out, CATALOG);
writeFileSync('src/data/homes/hud/counties.json', JSON.stringify(out) + '\n');
console.log(`US places ${places}; with a county ${places - missing}; without ${missing}; catalog cities ${Object.keys(CATALOG).length}`);
