// Browser timings on production builds (`vite build`), for before/after comparisons on one machine.
// Usage: node scripts/perf-browser.mjs <label> <distDir> <saveDir> [runs]
//   saveDir holds .save files (written by `PERF_SAVE_DIR=... npm run perf:engine` or the career harness, tests/perf/career.perf.ts).
// Measures: time from navigation to an interactive start screen (median of runs, with and without 4x CPU slowdown),
// JavaScript transferred before the start screen, and for every <name>.save in saveDir: opening it (Continue), one
// Advance (One Week, One Month; until it finishes or stops for the player) and Save And Exit, median of 3. Prints JSON.
import { createServer } from 'node:http';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';
import { chromium } from 'playwright';

const [label, dist, saves, runsArg] = process.argv.slice(2);
const runs = Number(runsArg ?? 7);
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

async function startup(slow) {
  const times = [];
  let js = 0;
  for (let i = 0; i < runs; i++) {
    const page = await browser.newPage();
    const cdp = await page.context().newCDPSession(page);
    if (slow) await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const bodies = [];
    page.on('response', (r) => { if (r.url().endsWith('.js')) bodies.push(r.body().then((b) => b.length, () => 0)); });
    const t = Date.now();
    await page.goto(url);
    await page.getByRole('button', { name: 'New Game' }).waitFor();
    times.push(Date.now() - t);
    js = (await Promise.all(bodies)).reduce((a, b) => a + b, 0);
    await page.close();
  }
  return { ms: median(times), runs, jsKB: Math.round(js / 1024) };
}

/** Put a save where the game keeps it: IndexedDB 'slate-saves', gzip-compressed, with its metadata (src/ui/idb.ts). */
async function seed(page, id, text) {
  await page.evaluate(async ([k, t]) => {
    localStorage.clear();
    const db = await new Promise((res, rej) => { const r = indexedDB.open('slate-saves', 1); r.onupgradeneeded = () => { r.result.createObjectStore('data'); r.result.createObjectStore('meta'); }; r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const bytes = await new Response(new Blob([t]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    const v = /^\{"format":"slate-save","version":(\d+)/.exec(t);
    const u = /\\"updatedAtReal\\":(\d+)/.exec(t);
    const tx = db.transaction(['data', 'meta'], 'readwrite');
    tx.objectStore('data').put({ data: bytes, gz: true }, k);
    tx.objectStore('meta').put({ chars: t.length, bytes: k.length + bytes.byteLength, version: v ? Number(v[1]) : null, savedAtReal: u ? Number(u[1]) : null }, k);
    await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }, [`slate.v1.save.${id}`, text]);
}

/** Open a stored game, Advance once (span), then Save And Exit; times for each, median of 3. */
async function play(name, span) {
  const text = readFileSync(join(saves, `${name}.save`), 'utf8');
  const id = JSON.parse(JSON.parse(text).data).saveId;
  const open = [];
  const adv = [];
  const exit = [];
  for (let i = 0; i < 3; i++) {
    const page = await browser.newPage();
    await page.goto(url);
    await seed(page, id, text);
    await page.reload();
    await page.getByRole('button', { name: 'Continue', exact: true }).waitFor();
    let t = Date.now();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('heading', { name: 'Home', level: 1 }).waitFor();
    open.push(Date.now() - t);
    await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Advance' });
    await dialog.getByLabel('Advance To').selectOption(span);
    t = Date.now();
    await dialog.getByRole('button', { name: 'Advance' }).click();
    await page.waitForFunction(() => !/Advancing/.test(document.querySelector('.save-state')?.textContent ?? ''), null, { timeout: 120_000 });
    adv.push(Date.now() - t);
    t = Date.now();
    await page.getByRole('button', { name: 'Save And Exit' }).click();
    await page.getByRole('button', { name: 'Continue', exact: true }).waitFor({ timeout: 120_000 });
    exit.push(Date.now() - t);
    await page.close();
  }
  return { openMs: median(open), advanceMs: median(adv), saveAndExitMs: median(exit) };
}

const out = { label, date: new Date().toISOString().slice(0, 10), startup: await startup(false), startupCpu4x: await startup(true), saves: {} };
for (const f of readdirSync(saves).filter((x) => x.endsWith('.save')).sort()) {
  const name = f.replace(/\.save$/, '');
  out.saves[name] = { week: await play(name, 'week'), month: await play(name, 'month') };
}
console.log(JSON.stringify(out));
await browser.close();
server.close();
