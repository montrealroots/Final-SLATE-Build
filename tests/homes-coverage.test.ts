// Every place in the world catalog has its own housing coverage entry (the owner's city-by-city requirement of November
// 17, 2026): docs/homes/places/<country>.csv, one row a place, from the engine's own coverageOf, so the record can't
// drift from what the game does. Each row keeps apart verified homes, dated listings, recorded sales, the statistics
// its prices come from and the simulated homes, and says the shortfall against fifty verified homes. Written with
// SLATE_WRITE_AUDIT=1 and held to the code otherwise; docs/homes/places/SUMMARY.md is the totals.
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getPlace, findPlace, placeIdForGeoname, registerPlace } from '../src/data/places';
import { readShard } from '../src/world/gazetteer/search';
import { coverageOf, marketEvidence, VERIFIED_TARGET, VERIFIED_HOMES, type Coverage } from '../src/engine/homes/market';
import index from '../src/world/gazetteer/index.json';

const DAY = '2026-11-17'; // the day the record describes
const OUT = 'docs/homes/places';
const regions = JSON.parse(readFileSync('src/world/gazetteer/regions.json', 'utf8')) as Record<string, { name: string }>;
const csvCell = (v: unknown) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const HEAD = ['place_id', 'name', 'region', 'population', 'market', 'verified_homes', 'dated_listings', 'shortfall_to_50', 'recorded_sales', 'rent_source', 'price_source'];
/** Short codes for the record's repeated phrases, each explained once in SUMMARY.md. */
const SOURCE: Record<string, string> = {
  'HUD Fair Market Rent for its county': 'hud-county',
  "ONS average rent for its nation (not the city's own)": 'ons-nation',
  "NAHB's national average (not the city's own)": 'nahb-national',
  'DVF 2025 recorded sales in its own commune': 'dvf-commune',
  'HDB resales in its own town': 'hdb-town',
  'Census median for the place itself': 'acs-place',
  "Census median for its county (not the place's own)": 'acs-county',
};
const short = (s: string) => SOURCE[s] ?? (s.startsWith('none') ? 'none' : s);
const MARKET: Record<string, string> = { 'a large city': 'large-city', 'a city': 'city', 'a town': 'town', 'a village or small town': 'village' };

async function countryRows(code: string): Promise<{ rows: string[][]; covs: Coverage[] }> {
  const file = `src/world/gazetteer/places/${code}.tsv`;
  const rows: string[][] = [];
  const covs: Coverage[] = [];
  for (const w of readShard(code, readFileSync(file, 'utf8'))) {
    const id = placeIdForGeoname(w.id);
    // What the housing record needs of a place: its name, country and region; climate is the catalog's own where it has one.
    const place = findPlace(id) ?? { ...getPlace('gb-london'), id, name: w.name, country: code, countryName: (index as Record<string, { name: string }>)[code]?.name ?? code, region: regions[w.region]?.name ?? '', regionKey: w.region, lat: w.lat, lon: w.lon, zone: w.zone, geonameId: w.id, population: w.population };
    if (!findPlace(id)) registerPlace(place);
    const cov = coverageOf(place, await marketEvidence(id, DAY));
    covs.push(cov);
    rows.push([id, w.name, place.region, String(w.population), MARKET[cov.market] ?? cov.market, String(cov.verifiedHomes), String(cov.datedListings), String(cov.shortfall), String(cov.recordedSales?.count ?? 0), short(cov.rentEvidence), short(cov.saleEvidence)]);
  }
  return { rows, covs };
}

describe('housing coverage, place by place', () => {
  const countries = readdirSync('src/world/gazetteer/places').filter((f) => f.endsWith('.tsv')).map((f) => f.slice(0, -4)).sort();

  it('has an entry for every place in the world catalog, with the verified shortfall against fifty, and nothing claimed that is not held', async () => {
    const write = !!process.env.SLATE_WRITE_AUDIT;
    if (write) mkdirSync(OUT, { recursive: true });
    const totals = { places: 0, verified: 0, shortfall: 0, listings: 0, recorded: 0, localRent: 0, localSale: 0, countyRent: 0, nationalOnly: 0, none: 0 };
    const byCountry: string[] = [];
    for (const code of countries) {
      const { rows, covs } = await countryRows(code);
      // Never a verified home that the record doesn't hold, and the shortfall is what's missing from fifty.
      for (const c of covs) {
        expect(c.verifiedHomes).toBe(VERIFIED_HOMES[c.placeId] ?? 0);
        expect(c.shortfall).toBe(Math.max(0, VERIFIED_TARGET - c.verifiedHomes));
        expect(c.datedListings).toBe(0);
      }
      const text = [HEAD, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
      const path = `${OUT}/${code}.csv`;
      if (write) writeFileSync(path, text);
      else expect(existsSync(path) && readFileSync(path, 'utf8') === text, `${path} is out of date: run with SLATE_WRITE_AUDIT=1`).toBe(true);
      const local = (s: string) => /own commune|own town|its county|place itself/.test(s);
      const n = { places: covs.length, shortfall: covs.reduce((a, c) => a + c.shortfall, 0), recorded: covs.filter((c) => c.recordedSales?.count).length, localRent: covs.filter((c) => local(c.rentEvidence)).length, localSale: covs.filter((c) => local(c.saleEvidence)).length };
      totals.places += n.places; totals.shortfall += n.shortfall; totals.recorded += n.recorded; totals.localRent += n.localRent; totals.localSale += n.localSale;
      totals.none += covs.filter((c) => c.rentEvidence.startsWith('none') && c.saleEvidence.startsWith('none')).length;
      byCountry.push(`| ${code} | ${(index as Record<string, { name: string }>)[code]?.name ?? code} | ${n.places} | 0 | 0 | ${n.shortfall} | ${n.recorded} | ${n.localRent} | ${n.localSale} |`);
    }
    const summary = [
      '# Housing Coverage, Place By Place',
      '',
      `Written by \`tests/homes-coverage.test.ts\` from the engine's \`coverageOf\` for ${DAY}; don't edit by hand. One CSV a`,
      'country in this folder has every place in the world catalog. The target is fifty distinct homes at real, verified',
      "addresses in each place's own market. **No place has any**: no permitted source the game holds gives a home's",
      'verified specification, price and availability at a real address (docs/homes/COVERAGE.md says which sources were',
      "considered and why each wasn't imported). Every place's market has fifty of the game's own simulated homes, which",
      'are never presented as real listings. Recorded sales are past transactions, not homes for sale now.',
      '',
      '## Columns',
      '',
      '- `market`: the size of place its fifty simulated homes are fitted to: large-city (500,000 people or more, or one of the',
      "  catalog's own cities), city (100,000), town (10,000), village.",
      '- `verified_homes`, `dated_listings`: homes at real, verified addresses, and dated real listings, the place holds.',
      '- `shortfall_to_50`: what is missing from fifty verified homes.',
      "- `recorded_sales`: past sales recorded in the place itself: DVF 2025 single-home sales in a French commune, or HDB",
      "  resales in a Singapore town in the year to the record's date. Not homes for sale now.",
      '- `rent_source`, `price_source`: where its rents and prices come from: `hud-county` (HUD FY2026 Fair Market Rent for',
      "  the place's own county), `ons-nation` (ONS's average rent for the UK nation, not the city's own), `nahb-national`",
      "  (NAHB's national average, not the city's own), `dvf-commune` (DVF 2025 recorded sales in the place's own commune),",
      "  `hdb-town` (HDB resales in its own town), `acs-place` (the Census Bureau's median rent or home value for the place",
      "  itself, American Community Survey 2020-2024; a home value moved by FHFA's price index), `acs-county` (the Census",
      "  median home value for its county, where the place has none good enough), `none` (the game's placeholder).",
      '- The kinds of home each market holds follow its size (market.ts localMix): a large city and a city have flats,',
      '  condominiums, townhouses and houses; a town and a village mostly houses, with some flats and townhouses; every',
      "  market has studios and building plots, and a Singapore HDB town has HDB flats.",
      '',
      `- Places: ${totals.places.toLocaleString('en-US')}`,
      `- Verified homes at real addresses: 0. Dated real listings: 0.`,
      `- Shortfall against fifty verified homes each: ${totals.shortfall.toLocaleString('en-US')}`,
      `- Places with recorded sales of their own (DVF communes, HDB towns): ${totals.recorded.toLocaleString('en-US')}`,
      `- Places whose rents are their own (Census) or their county's (HUD): ${totals.localRent.toLocaleString('en-US')}`,
      `- Places whose prices are their own (Census, DVF, HDB) or their county's (Census): ${totals.localSale.toLocaleString('en-US')}`,
      `- Places with no housing statistics at all (rents and prices both the game's placeholder): ${totals.none.toLocaleString('en-US')}`,
      '',
      '| Code | Country | Places | Verified | Listings | Shortfall | With recorded sales | Local rents | Local prices |',
      '|---|---|---|---|---|---|---|---|---|',
      ...byCountry,
      '',
    ].join('\n');
    if (write) writeFileSync(`${OUT}/SUMMARY.md`, summary);
    else expect(readFileSync(`${OUT}/SUMMARY.md`, 'utf8')).toBe(summary);
    expect(totals.places).toBe(171750);
    expect(totals.shortfall).toBe(171750 * VERIFIED_TARGET);
  }, 600_000);

  it("prices each place from its own records: Fort Worth from its own Census figures; Lancaster, Texas its own value and Dallas County's rents; Paris from its arrondissements", async () => {
    const { rows } = await countryRows('US');
    const lancaster = rows.find((r) => r[0] === 'gn:4705191')!;
    expect(lancaster[9]).toBe('hud-county');
    expect(lancaster[10]).toBe('acs-place');
    const fortWorth = rows.find((r) => r[0] === 'gn:4691930')!;
    expect([fortWorth[9], fortWorth[10]]).toEqual(['acs-place', 'acs-place']);
    const paris = coverageOf(getPlace('fr-paris'), await marketEvidence('fr-paris', DAY));
    expect(paris.recordedSales?.count).toBeGreaterThan(10000);
    expect(paris.saleEvidence).toContain('own commune');
  }, 600_000);
});
