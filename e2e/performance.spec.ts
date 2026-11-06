import { expect, test } from '@playwright/test';
import { nav, quickLife } from './helpers';

// Interaction budgets, measured on the dev server (uncompressed, unminified): an upper bound, not production numbers.
// Results are printed so QA-REPORT.md can record them.
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'Measured once, at desktop width.'));

test('startup, the largest country shard and place search stay within their budgets', async ({ page }) => {
  let t = Date.now();
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New Game' })).toBeVisible();
  const startupMs = Date.now() - t;

  await quickLife(page, 'us-new-york', '2026-03-02');
  await nav(page, 'World');
  t = Date.now();
  await page.getByLabel('Country Or Territory').selectOption({ label: 'United States' });
  await expect(page.getByRole('list', { name: 'Places' }).getByRole('button').first()).toBeVisible();
  const usShardMs = Date.now() - t;

  t = Date.now();
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('springfield');
  await expect(page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Springfield', exact: true }).first()).toBeVisible();
  const searchMs = Date.now() - t;
  const rendered = await page.getByRole('list', { name: 'Places' }).getByRole('listitem').count();

  console.log(JSON.stringify({ startupMs, usShardMs, searchMs, rendered }));
  expect(startupMs).toBeLessThan(5000);
  expect(usShardMs).toBeLessThan(4000);
  expect(searchMs).toBeLessThan(1500);
  expect(rendered).toBeLessThanOrEqual(20); // results are bounded, never a whole country in the page
});
