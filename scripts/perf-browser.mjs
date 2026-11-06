// Browser timings on production builds (`vite build`), for before/after comparisons on one machine.
// Usage: node scripts/perf-browser.mjs <label> <distDir> <saveDir> [runs]
//   saveDir holds fresh.save, medium.save and long.save written by `PERF_SAVE_DIR=... npm run perf:engine`.
// Measures: time from navigation to an interactive start screen (median of runs, with and without 4x CPU slowdown),
// JavaScript transferred before the start screen, and one Advance (One Week, One Month) on each save, median of 5, until it finishes or stops
// for the player (the same point in both builds). Prints JSON.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
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

async function advanceBy(name, span) {
  const text = readFileSync(join(saves, `${name}.save`), 'utf8');
  const id = JSON.parse(JSON.parse(text).data).saveId;
  const times = [];
  for (let i = 0; i < 5; i++) {
    const page = await browser.newPage();
    await page.goto(url);
    await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, v); }, [`slate.v1.save.${id}`, text]);
    await page.reload();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('heading', { name: 'Home', level: 1 }).waitFor();
    await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Advance' });
    await dialog.getByLabel('Advance To').selectOption(span);
    const t = await page.evaluate(() => performance.now());
    await dialog.getByRole('button', { name: 'Advance' }).click();
    await page.waitForFunction(() => !/Advancing/.test(document.querySelector('.save-state')?.textContent ?? ''), null, { timeout: 120_000 });
    times.push((await page.evaluate(() => performance.now())) - t);
    await page.close();
  }
  return Math.round(median(times));
}

const out = { label, date: new Date().toISOString().slice(0, 10), startup: await startup(false), startupCpu4x: await startup(true), advanceWeekMs: {}, advanceMonthMs: {} };
for (const n of ['fresh', 'medium', 'long']) {
  if (!existsSync(join(saves, `${n}.save`))) continue;
  out.advanceWeekMs[n] = await advanceBy(n, 'week');
  out.advanceMonthMs[n] = await advanceBy(n, 'month');
}
console.log(JSON.stringify(out));
await browser.close();
server.close();
