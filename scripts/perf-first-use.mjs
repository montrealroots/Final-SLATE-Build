// What a browser downloads and how long it waits before each first use (November 10, 2026), on a production build.
// Usage: node scripts/perf-first-use.mjs <label> <distDir> <save file> [runs]
// Three paths, each from a fresh page with nothing cached: the start screen (New Game and Continue usable); Continue
// into a saved game until Home is shown and nothing more is being fetched; New Game into creation until its first field
// can be typed in. Bytes are every response's body as served (raw) and gzip -9 of it (an estimate of what a compressing
// server sends), JavaScript and data apart. Times are medians. Prints JSON.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium } from 'playwright';

const [label, dist, saveFile, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? 5);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.tsv': 'text/tab-separated-values', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!existsSync(p) || statSync(p).isDirectory()) p = join(dist, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(p)] ?? 'application/octet-stream' });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch();
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
const save = readFileSync(saveFile, 'utf8');
const saveId = JSON.parse(JSON.parse(save).data).saveId;

async function seed(page, id, text) {
  await page.evaluate(async ([k, t]) => {
    localStorage.clear();
    const db = await new Promise((res, rej) => { const r = indexedDB.open('slate-saves', 1); r.onupgradeneeded = () => { r.result.createObjectStore('data'); r.result.createObjectStore('meta'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const bytes = await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const v = /^\{"format":"slate-save","version":(\d+)/.exec(t);
    const tx = db.transaction(['data', 'meta'], 'readwrite');
    tx.objectStore('data').put({ data: bytes, gz: true }, k);
    tx.objectStore('meta').put({ chars: t.length, bytes: k.length + bytes.byteLength, version: v ? Number(v[1]) : null, savedAtReal: 1 }, k);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }, [`slate.v1.save.${id}`, text]);
}

/** One run of a path: a fresh context, every response counted until `ready` resolves and the network is idle. */
async function measure(path) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  if (path === 'continue') { await page.goto(url); await seed(page, saveId, save); await ctx.clearCookies(); }
  const page2 = path === 'continue' ? await ctx.newPage() : page;
  if (path === 'continue') await page.close();
  const bodies = [];
  page2.on('response', (r) => { const u = r.url(); if (/\.(js|json|tsv|css)(\?|$)/.test(u)) bodies.push(r.body().then((b) => ({ u, b }), () => null)); });
  const t = Date.now();
  await page2.goto(url, { waitUntil: 'commit' });
  if (path === 'start') await page2.getByRole('button', { name: 'New Game' }).waitFor();
  if (path === 'continue') {
    await page2.getByRole('button', { name: 'Continue', exact: true }).click();
    await page2.getByRole('button', { name: 'Advance', exact: true }).first().waitFor({ timeout: 60_000 }); // the game is open
  }
  if (path === 'new') {
    await page2.getByRole('button', { name: 'New Game' }).click();
    await page2.getByLabel(/First Name/).first().waitFor({ timeout: 60_000 });
  }
  const ms = Date.now() - t;
  await page2.waitForLoadState('networkidle');
  const got = (await Promise.all(bodies)).filter(Boolean);
  await ctx.close();
  const sum = (f) => got.filter((x) => f(x.u)).reduce((a, x) => ({ raw: a.raw + x.b.length, gz: a.gz + gzipSync(x.b, { level: 9 }).length }), { raw: 0, gz: 0 });
  const kb = (n) => Math.round(n / 1024);
  const js = sum((u) => /\.js(\?|$)/.test(u)), data = sum((u) => /\.(json|tsv)(\?|$)/.test(u));
  return { ms, jsKB: kb(js.raw), jsGzKB: kb(js.gz), dataKB: kb(data.raw), dataGzKB: kb(data.gz) };
}

const out = { label };
for (const path of ['start', 'continue', 'new']) {
  const rs = [];
  for (let i = 0; i < runs; i++) rs.push(await measure(path));
  out[path] = { ms: median(rs.map((r) => r.ms)), ...rs[rs.length - 1] };
  out[path].ms = median(rs.map((r) => r.ms));
}
console.log(JSON.stringify(out));
await browser.close();
server.close();
