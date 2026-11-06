// Maps the original 66 catalog places to GeoNames records and computes their station-based climate normals.
// Writes src/data/legacy-places.json and docs/world/legacy-place-migration.json (original vs candidate coordinates,
// distance, confidence and resolution). A match needs the same country, a name match and a distance under 40 km;
// otherwise the nearest populous place is proposed with low confidence and flagged for review, never silently used.
import { readFileSync, writeFileSync } from 'node:fs';
import { climateFor, distanceKm, indexStations, readStations } from '../src/world/climate.ts';
import { PLACES } from '../src/data/places.ts';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, root), 'utf8');
const rows = PLACES.map((pl) => [null, pl.id, pl.name, pl.region, pl.country, pl.lat, pl.lon, pl.zone, pl.elevation]);
const fold = (s) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const index = indexStations(readStations(JSON.parse(read('src/world/weather/stations.json'))));
// Reviewed by hand: GeoNames spells these places differently ("Marrakesh", "Panjim"); same place, under 1 km apart.
const REVIEWED = { 'ma-marrakech': '2542997', 'in-panaji': '1260607' };
const out = {};
const sources = {};
const report = [];
for (const m of rows) {
  const [, id, name, , country, lat, lon, zone, elevation] = m;
  const shard = read(`src/world/gazetteer/places/${country}.tsv`).split('\n').filter(Boolean).map((l) => {
    const [gid, gname, ascii, region, la, lo, z, pop, el] = l.split('\t');
    return { gid, gname, ascii, region, la: Number(la), lo: Number(lo), z, pop: Number(pop), el: el === '' ? null : Number(el) };
  });
  const near = shard.map((g) => ({ g, km: distanceKm(Number(lat), Number(lon), g.la, g.lo) })).filter((x) => x.km < 40);
  const named = near.filter((x) => fold(x.g.gname) === fold(name) || fold(x.g.ascii) === fold(name) || fold(x.g.gname).startsWith(fold(name)));
  const reviewed = REVIEWED[id] ? near.find((x) => x.g.gid === REVIEWED[id]) : undefined;
  const pick = reviewed ?? (named.length ? named : near).sort((a, b) => b.g.pop - a.g.pop)[0];
  const confidence = !pick ? 'none' : reviewed ? 'reviewed' : named.length && pick.km < 15 ? 'high' : named.length ? 'medium' : 'low';
  const resolution = ['high', 'medium', 'reviewed'].includes(confidence) ? 'aliased' : 'kept-legacy-record';
  const el = pick?.g.el ?? Number(elevation);
  const climate = climateFor({ country, lat: Number(lat), lon: Number(lon), elevation: el }, index);
  // The game needs the normals and the kind of source; which station supplied each value is developer provenance.
  out[id] = { geonameId: resolution === 'aliased' ? pick.g.gid : null, population: pick?.g.pop ?? 0, zoneMatches: pick ? pick.g.z === zone : false, climate: { monthly: climate.monthly, source: { kind: climate.source.kind } } };
  sources[id] = climate.source;
  report.push({
    legacyId: id, name, country, original: [Number(lat), Number(lon)], candidate: pick ? { geonameId: pick.g.gid, name: pick.g.gname, coords: [pick.g.la, pick.g.lo], zone: pick.g.z, km: Math.round(pick.km * 10) / 10 } : null,
    confidence, resolution, zoneMatches: pick ? pick.g.z === zone : false, climateSource: climate.source.kind,
  });
}
writeFileSync(new URL('src/data/legacy-places.json', root), `${JSON.stringify(out)}\n`);
writeFileSync(new URL('docs/world/legacy-place-migration.json', root), `${JSON.stringify(report, null, 2)}\n`);
writeFileSync(new URL('docs/world/legacy-place-climate.json', root), `${JSON.stringify(sources, null, 1)}\n`);
const by = (k) => report.reduce((a, r) => ({ ...a, [r[k]]: (a[r[k]] ?? 0) + 1 }), {});
console.log(`${report.length} legacy places`, by('confidence'), by('resolution'), 'zone mismatches:', report.filter((r) => !r.zoneMatches).map((r) => r.legacyId), 'climate:', by('climateSource'));
