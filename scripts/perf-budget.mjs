// Build-size budgets (Gap Completion Package, M7). Run after `vite build`. Startup JavaScript is what dist/index.html
// loads before anything else: its module script and module preloads. World data must stay out of it.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

// Set at the measured size on November 6, 2026 (675 kB raw), as a guard against growth; see QA-REPORT.md.
const BUDGET = { startupJsKb: 700, startupGzipKb: 220, largestLazyAssetKb: 3500 };
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="\/?(assets\/[^"]+\.js)"/g)].map((m) => m[1]);
const size = (f) => statSync(new URL(`../dist/${f}`, import.meta.url)).size;
const startup = refs.reduce((a, f) => a + size(f), 0) / 1024;
const gz = refs.reduce((a, f) => a + gzipSync(readFileSync(new URL(`../dist/${f}`, import.meta.url))).length, 0) / 1024;
const assets = readdirSync(new URL('../dist/assets/', import.meta.url)).filter((f) => !refs.includes(`assets/${f}`));
const largest = assets.map((f) => [f, size(`assets/${f}`) / 1024]).sort((a, b) => b[1] - a[1])[0];
const problems = [];
if (startup > BUDGET.startupJsKb) problems.push(`startup JavaScript ${startup.toFixed(0)} kB is over ${BUDGET.startupJsKb} kB`);
if (gz > BUDGET.startupGzipKb) problems.push(`startup JavaScript ${gz.toFixed(0)} kB gzipped is over ${BUDGET.startupGzipKb} kB`);
if (largest[1] > BUDGET.largestLazyAssetKb) problems.push(`${largest[0]} is ${largest[1].toFixed(0)} kB, over ${BUDGET.largestLazyAssetKb} kB`);
// The imported world (gazetteer shards, stations, regions, the map, countries, calendars) must not load at startup. The
// start screen does read the base registry of 66 places (src/data/places.ts), to say where and when a saved game is; it
// always has. Until November 11, 2026 the bundler happened to put that registry in a chunk named for another module, so
// this check never saw it; a new on-demand import made it a chunk named "places", and the check failed on the name with
// not a byte more at startup. The registry is now allowed by what it is, and held to its measured size (36 kB), so
// anything else called places, or the registry grown, still fails.
const BASE_PLACES_KB = 40;
const baseRegistry = (f) => /assets\/places-/.test(f) && readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8').includes('"us-los-angeles":{geonameId') && size(f) / 1024 <= BASE_PLACES_KB;
if (refs.some((f) => /places|stations|regions|world-map|countries|calendars/.test(f) && !baseRegistry(f))) problems.push('world data is loaded at startup');
console.log(`startup JavaScript ${startup.toFixed(0)} kB (${gz.toFixed(0)} kB gzipped) in ${refs.length} files (budgets ${BUDGET.startupJsKb} and ${BUDGET.startupGzipKb} kB); largest on-demand asset ${largest[0]} ${largest[1].toFixed(0)} kB (budget ${BUDGET.largestLazyAssetKb} kB); ${problems.length} problems`);
if (problems.length) {
  for (const p of problems) console.error(p);
  process.exit(1);
}
