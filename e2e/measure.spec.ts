// A measurement, not a test (November 11, 2026, docs/PERFORMANCE.md): startup and first-use costs on the production build
// through the production server (port 4176, the made-up catalog), with Chromium throttled the same way every time: 150 ms
// latency, 1.6 Mbps down, 750 kbps up, CPU slowed 4 times, cache off. It runs only when asked for, and writes JSON to
// MEASURE_OUT:
//   SLATE_E2E_PROD=1 SLATE_MEASURE=1 MEASURE_OUT=after.json npx playwright test e2e/measure.spec.ts --project=desktop
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from './test';
import { nav, quickLife } from './helpers';

test.use({ baseURL: 'http://localhost:4176' });
const OUT = process.env.MEASURE_OUT ?? 'test-results/measure.json';

async function throttle(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let bytes = 0;
  let js = 0;
  const types = new Map<string, string>();
  cdp.on('Network.responseReceived', (e) => types.set(e.requestId, e.type));
  cdp.on('Network.loadingFinished', (e) => { bytes += e.encodedDataLength; if (types.get(e.requestId) === 'Script') js += e.encodedDataLength; });
  return { take: () => { const r = { bytes, js }; bytes = 0; js = 0; return r; } };
}

test('measure', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop' || process.env.SLATE_MEASURE !== '1' || process.env.SLATE_E2E_PROD !== '1', 'A measurement: run with SLATE_MEASURE=1 and SLATE_E2E_PROD=1.');
  test.setTimeout(600_000);
  const results: Record<string, { ms: number; kb: number; jsKb: number }> = {};
  const step = async (name: string, net: { take: () => { bytes: number; js: number } }, fn: () => Promise<void>) => {
    net.take();
    const t = Date.now();
    await fn();
    const { bytes, js } = net.take();
    results[name] = { ms: Date.now() - t, kb: Math.round(bytes / 102.4) / 10, jsKb: Math.round(js / 102.4) / 10 };
  };
  // Cold start: a new browser, nothing cached, to the start screen ready to use.
  const cold = await page.context().browser()!.newContext({ baseURL: 'http://localhost:4176' });
  const p1 = await cold.newPage();
  const n1 = await throttle(p1);
  await step('cold start', n1, async () => { await p1.goto('/'); await expect(p1.getByRole('button', { name: 'New Game' })).toBeVisible({ timeout: 120_000 }); });
  await step('new game', n1, async () => { await p1.getByRole('button', { name: 'New Game' }).click(); await expect(p1.locator('#creation-h')).toBeVisible({ timeout: 120_000 }); });
  await cold.close();
  // The same, as one step: the page opened and New Game pressed the moment it shows, to the creation screen, so nothing
  // loaded in the background between the two steps above goes uncounted.
  const cold2 = await page.context().browser()!.newContext({ baseURL: 'http://localhost:4176' });
  const p2 = await cold2.newPage();
  const n3 = await throttle(p2);
  await step('cold start to creation', n3, async () => {
    await p2.goto('/');
    await p2.getByRole('button', { name: 'New Game' }).click({ timeout: 120_000 });
    await expect(p2.locator('#creation-h')).toBeVisible({ timeout: 120_000 });
  });
  await cold2.close();

  // A player with a save: made unthrottled, then the page reloaded (a returning player, cache warm) and each screen opened.
  await quickLife(page, 'gb-london', '2026-01-05');
  await page.getByRole('button', { name: 'Save & Exit' }).click();
  await page.reload();
  const n2 = await throttle(page);
  await step('continue', n2, async () => { await page.getByRole('button', { name: 'Continue', exact: true }).click(); await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible({ timeout: 120_000 }); });
  await step('companies', n2, async () => { await nav(page, 'Companies'); await expect(page.getByRole('heading', { name: 'The Catalog', exact: true })).toBeVisible({ timeout: 120_000 }); });
  await step('title page', n2, async () => {
    await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
    await page.getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
    await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible({ timeout: 120_000 });
  });
  await step('person page', n2, async () => { await page.getByRole('button', { name: 'Ada Quill' }).first().click(); await expect(page.getByRole('heading', { name: 'Ada Quill', level: 1 })).toBeVisible({ timeout: 120_000 }); });
  await step('world', n2, async () => { await nav(page, 'World'); await expect(page.getByRole('searchbox', { name: 'Search Places' })).toBeVisible({ timeout: 120_000 }); });
  await step('calendar', n2, async () => { await nav(page, 'Calendar'); await expect(page.getByRole('heading', { name: 'Calendar', level: 1 })).toBeVisible({ timeout: 120_000 }); });
  writeFileSync(OUT, JSON.stringify(results, null, 1));
  console.log(JSON.stringify(results));
});
