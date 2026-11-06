import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { hashString } from '../src/engine/rng';
import { advance, nav, quickLife } from './helpers';

// Failure paths through the real UI (Gap Completion Package, M7). Desktop and phone.
test.beforeEach(({}, info) => test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.'));

test('a failed save says so, keeps you in the game, and Try Again saves once storage works', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  // Storage starts refusing writes for this save.
  await page.evaluate(() => {
    const real = Storage.prototype.setItem;
    (window as unknown as { __failSaves: boolean }).__failSaves = true;
    Storage.prototype.setItem = function (k: string, v: string) {
      if ((window as unknown as { __failSaves: boolean }).__failSaves && k.startsWith('slate.v1.save.')) throw new DOMException('Quota exceeded', 'QuotaExceededError');
      return real.call(this, k, v);
    };
  });
  await advance(page, 'next-day');
  await expect(page.getByText("Your game couldn't be saved because this browser's storage for SLATE is full. Your last save is still there.", { exact: false }).first()).toBeVisible();
  // Export Save still works with storage full: the file is a complete, checksummed save.
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Save' }).first().click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/\.slate-save\.json$/);
  const env = JSON.parse(readFileSync((await file.path())!, 'utf8'));
  expect(env.format).toBe('slate-save');
  expect(hashString(env.data)).toBe(env.checksum);
  // Save And Exit refuses to leave while the save fails.
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await page.evaluate(() => { (window as unknown as { __failSaves: boolean }).__failSaves = false; });
  await page.getByRole('button', { name: 'Try Again' }).first().click();
  await expect(page.getByRole('banner').getByText('Saved', { exact: true })).toBeVisible();
  await expect(page.getByText(/Your game couldn't be saved/)).toHaveCount(0);
});

test('a version-1 save opens after a backup copy is kept', async ({ page }) => {
  await quickLife(page, 'fr-paris', '2026-04-06');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  // Turn the save into a version-1 save, as the base build wrote them (no place registry).
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  const text = await page.evaluate((k) => localStorage.getItem(k)!, `slate.v1.save.${id}`);
  const env = JSON.parse(text);
  const state = JSON.parse(env.data);
  state.version = 1;
  delete state.places;
  const data = JSON.stringify(state);
  const v1 = JSON.stringify({ format: 'slate-save', version: 1, checksum: hashString(data), data });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`slate.v1.save.${id}`, v1]);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await expect(page.getByText(/You're in Paris/)).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), `slate.v1.save.${id}.backup-v1`)).toBe(v1);
});

test('holiday dates and the map that fail to load are explained, and Try Again recovers', async ({ page }) => {
  let fail = true;
  // Only the data fetches (no query string); the dev server also serves the files' URLs as modules.
  await page.route((url) => /\/(countries|calendars|world-map)\.json$/.test(url.pathname) && !url.search, (route) => (fail ? route.abort() : route.continue()));
  await quickLife(page, 'gb-london', '2026-05-04');
  await nav(page, 'World');
  await expect(page.getByText("The map couldn't be loaded. The list of places still works.")).toBeVisible();
  // A place in a country without curated rules depends on the worldwide holiday rules.
  await page.getByLabel('Country Or Territory').selectOption({ label: 'Poland' });
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('krakow');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Kraków', exact: true }).click();
  const holidays = page.getByRole('region', { name: 'Upcoming Public Holidays' });
  await expect(holidays.getByText("Holiday dates couldn't be loaded. Until they are, no day here is treated as a holiday.")).toBeVisible();
  fail = false;
  await holidays.getByRole('button', { name: 'Try Again' }).click();
  await expect(holidays.getByRole('listitem').first()).toBeVisible();
  // Coming back to World loads the map again on its own now that it can.
  await nav(page, 'World');
  await expect(page.getByRole('group', { name: /Map of/ })).toBeVisible();
});

test("a save that mentions a place the game can't find asks for a replacement, keeping a backup", async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  const env = JSON.parse(await page.evaluate((k) => localStorage.getItem(k)!, `slate.v1.save.${id}`));
  const state = JSON.parse(env.data);
  state.locationId = 'gn:999999999';
  const data = JSON.stringify(state);
  const damaged = JSON.stringify({ ...env, checksum: hashString(data), data });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`slate.v1.save.${id}`, damaged]);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose Missing Places' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where you are' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Repair And Continue' })).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Replacement Place 1' }).fill('Edinburgh');
  await page.getByRole('group', { name: 'Replacement Place 1 Results' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Repair And Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await expect(page.getByText(/You're in Edinburgh/)).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), `slate.v1.save.${id}.backup-repair`)).toBe(damaged);
});

test('a damaged save opens the last good copy, says so, and keeps the damaged one', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await advance(page, 'next-day');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  const damaged = await page.evaluate((k) => { const t = localStorage.getItem(k)!.slice(0, 300); localStorage.setItem(k, t); return t; }, `slate.v1.save.${id}`);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/so the previous save, from .+, was opened\. The damaged save is kept, not deleted\./)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  const kept = await page.evaluate((prefix) => Object.keys(localStorage).filter((k) => k.startsWith(prefix)).map((k) => localStorage.getItem(k)), `slate.v1.save.${id}.damaged-`);
  expect(kept).toContain(damaged);
});

test('a save from a newer version is refused and left unchanged', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  const env = JSON.parse(await page.evaluate((k) => localStorage.getItem(k)!, `slate.v1.save.${id}`));
  const state = { ...JSON.parse(env.data), version: 99 };
  const data = JSON.stringify(state);
  const newer = JSON.stringify({ ...env, version: 99, checksum: hashString(data), data });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`slate.v1.save.${id}`, newer]);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/made by a newer version of SLATE/)).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), `slate.v1.save.${id}`)).toBe(newer);
});

test('a failure while time passes pauses time, keeps the game as it was, and never skips the event', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  const env = JSON.parse(await page.evaluate((k) => localStorage.getItem(k)!, `slate.v1.save.${id}`));
  const state = JSON.parse(env.data);
  // An arrival at a place the game can't find: its handler throws when it runs.
  state.events.push({ id: 'bad-arrive', at: state.now + 3600_000, kind: 'arrive', priority: 6, attention: 'interrupt', payload: { to: 'gn:404' } });
  state.events.sort((a: { at: number; priority: number; id: string }, b: { at: number; priority: number; id: string }) => a.at - b.at || a.priority - b.priority || a.id.localeCompare(b.id));
  const data = JSON.stringify(state);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`slate.v1.save.${id}`, JSON.stringify({ ...env, checksum: hashString(data), data })]);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  const clock = await page.getByRole('banner').innerText();
  await advance(page, 'next-day');
  await expect(page.getByText(/Time is paused\. Something went wrong while time passed \(arrive\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advance', exact: true }).first()).toBeDisabled();
  // Still at the moment before the failure; the event wasn't skipped.
  expect((await page.getByRole('banner').innerText()).split('\n').filter((l) => /AM|PM/.test(l))).toEqual(clock.split('\n').filter((l) => /AM|PM/.test(l)));
  const queued = await page.evaluate((k) => JSON.parse(JSON.parse(localStorage.getItem(k)!).data).events.some((e: { id: string }) => e.id === 'bad-arrive'), `slate.v1.save.${id}`);
  expect(queued).toBe(true);
  // Try Again resumes time; advancing meets the same problem and pauses again rather than skipping it.
  await page.getByRole('button', { name: 'Try Again' }).first().click();
  await expect(page.getByRole('button', { name: 'Advance', exact: true }).first()).toBeEnabled();
  await advance(page, 'next-day');
  await expect(page.getByText(/Time is paused\. Something went wrong while time passed \(arrive\)/)).toBeVisible();
});
