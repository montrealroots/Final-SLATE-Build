import { expect, expectErrors, test } from './test';
import { readFileSync } from 'node:fs';
import { hashString } from '../src/engine/rng';
import { advance, nav, openStart, pressSaveAndExit, quickLife, saveAndExit } from './helpers';
import { firstSaveId, listRecords, readRecord, refuseSaveWrites, writeRecords } from './vault';

// Failure paths through the real UI (Gap Completion Package, M7). Desktop and phone.
test.beforeEach(({}, info) => test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.'));

test('a failed save says so, keeps you in the game, and Try Again saves once storage works', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  // Failure injection: storage starts refusing writes.
  await refuseSaveWrites(page, true);
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
  // Save & Exit refuses to leave while the save fails.
  await pressSaveAndExit(page);
  await expect(page.getByText("Your game couldn't be saved. Keep this window open and try again.")).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await refuseSaveWrites(page, false);
  await page.getByRole('button', { name: 'Try Again' }).first().click();
  await expect(page.locator('.save-state')).toHaveText('Saved');
  await expect(page.getByText(/Your game couldn't be saved/)).toHaveCount(0);
});

test('a version-1 save opens after a backup copy is kept', async ({ page }) => {
  await quickLife(page, 'fr-paris', '2026-04-06');
  await pressSaveAndExit(page);
  // Turn the save into a version-1 save, as the base build wrote them (no place registry).
  const id = await firstSaveId(page);
  const text = (await readRecord(page, `slate.v1.save.${id}`))!;
  const env = JSON.parse(text);
  const state = JSON.parse(env.data);
  state.version = 1;
  delete state.places;
  const data = JSON.stringify(state);
  const v1 = JSON.stringify({ format: 'slate-save', version: 1, checksum: hashString(data), data });
  await writeRecords(page, { [`slate.v1.save.${id}`]: v1 });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await expect(page.getByText(/\d [AP]M in Paris, /)).toBeVisible();
  expect(await readRecord(page, `slate.v1.save.${id}.backup-v1`)).toBe(v1);
});

test('holiday dates and the map that fail to load are explained, and Try Again recovers', async ({ page }) => {
  expectErrors('Aborts the holiday and map data requests.');
  let fail = true;
  // Only the data fetches (no query string; the dev server also serves the files' URLs as modules). The production
  // build names each file with a content hash (countries-<hash>.json).
  await page.route((url) => /\/(countries|calendars|world-map)(-[\w-]+)?\.json$/.test(url.pathname) && !url.search, (route) => (fail ? route.abort() : route.continue()));
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
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  state.locationId = 'gn:999999999';
  const data = JSON.stringify(state);
  const damaged = JSON.stringify({ ...env, checksum: hashString(data), data });
  await writeRecords(page, { [`slate.v1.save.${id}`]: damaged });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Choose Missing Places' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Where you are' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Repair And Continue' })).toBeDisabled();
  await page.getByRole('searchbox', { name: 'Replacement Place 1' }).fill('Edinburgh');
  await page.getByRole('group', { name: 'Replacement Place 1 Results' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Repair And Continue' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await expect(page.getByText(/\d [AP]M in Edinburgh, /)).toBeVisible();
  expect(await readRecord(page, `slate.v1.save.${id}.backup-repair`)).toBe(damaged);
});

test('a damaged save opens the last good copy, says so, and keeps the damaged one', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await advance(page, 'next-day');
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const damaged = (await readRecord(page, `slate.v1.save.${id}`))!.slice(0, 300);
  await writeRecords(page, { [`slate.v1.save.${id}`]: damaged });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/so the previous save, from .+, was opened\. The damaged save is kept, not deleted\./)).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await expect.poll(async () => (await listRecords(page)).some((k) => k.startsWith(`slate.v1.save.${id}.damaged-`))).toBe(true);
  const kept = await Promise.all((await listRecords(page)).filter((k) => k.startsWith(`slate.v1.save.${id}.damaged-`)).map((k) => readRecord(page, k)));
  expect(kept).toContain(damaged);
});

test('a save from a newer version is refused and left unchanged', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = { ...JSON.parse(env.data), version: 99 };
  const data = JSON.stringify(state);
  const newer = JSON.stringify({ ...env, version: 99, checksum: hashString(data), data });
  await writeRecords(page, { [`slate.v1.save.${id}`]: newer });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/made by a newer version of SLATE/)).toBeVisible();
  expect(await readRecord(page, `slate.v1.save.${id}`)).toBe(newer);
});

test('a failure while time passes pauses time, keeps the game as it was, and never skips the event', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  // An arrival at a place the game can't find: its handler throws when it runs.
  state.events.push({ id: 'bad-arrive', at: state.now + 3600_000, kind: 'arrive', priority: 6, attention: 'interrupt', payload: { to: 'gn:404' } });
  state.events.sort((a: { at: number; priority: number; id: string }, b: { at: number; priority: number; id: string }) => a.at - b.at || a.priority - b.priority || a.id.localeCompare(b.id));
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  const clock = await page.getByRole('banner').innerText();
  await advance(page, 'next-day');
  await expect(page.getByText(/Time is paused\. Something went wrong while time passed \(arrive\)/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advance', exact: true }).first()).toBeDisabled();
  // Still at the moment before the failure; the event wasn't skipped.
  expect((await page.getByRole('banner').innerText()).split('\n').filter((l) => /AM|PM/.test(l))).toEqual(clock.split('\n').filter((l) => /AM|PM/.test(l)));
  await expect(page.locator('.save-state')).toHaveText(/Saved/);
  const queued = JSON.parse(JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!).data).events.some((e: { id: string }) => e.id === 'bad-arrive');
  expect(queued).toBe(true);
  // Try Again resumes time; advancing meets the same problem and pauses again rather than skipping it.
  await page.getByRole('button', { name: 'Try Again' }).first().click();
  await expect(page.getByRole('button', { name: 'Advance', exact: true }).first()).toBeEnabled();
  await advance(page, 'next-day');
  await expect(page.getByText(/Time is paused\. Something went wrong while time passed \(arrive\)/)).toBeVisible();
});

test('a genre catalog that fails to load stops the game from opening with the reason, and Try Again opens it', async ({ page }) => {
  expectErrors('Aborts the genre catalog request.');
  let fail = true;
  // The catalog is fetched on its own since November 7, 2026 (genre-catalog-<hash>.json in the production build). Only
  // the data fetch is refused: the dev server also serves the file's URL as a module, with a query string.
  await page.route((url) => /genre-catalog/.test(url.pathname) && !url.search, (route) => (fail ? route.abort() : route.continue()));
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 'review', name: 'Nia Halvorsen-Mbeki', pronouns: 'she', actingTitle: 'Actress', birthDate: '1990-05-20', birthplaceId: 'ke-nairobi',
      heritages: [{ id: 'Kikuyu', label: 'Kikuyu', custom: false }], heritageCustomText: '', mainLanguage: 'en', languages: [],
      startPlaceId: 'gb-london', startDate: '2026-05-04', startTime: '08:00', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByText("The game's genre catalog couldn't be loaded. Check your connection and try again.")).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  // The whole catalog arrived: New Script offers all 149 entries.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await expect(page.getByText('All 149 catalog entries are searchable.')).toBeVisible();
});

test('a festival and awards calendar that fails to load stops the game from opening with the reason, and Try Again opens it', async ({ page }) => {
  expectErrors('Aborts the festival and awards calendar request.');
  let fail = true;
  // The calendar is data fetched on its own since November 8, 2026 (institutions-<hash>.json in the production build).
  await page.route((url) => /institutions/.test(url.pathname) && !url.search, (route) => (fail ? route.abort() : route.continue()));
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 'review', name: 'Nia Halvorsen-Mbeki', pronouns: 'she', actingTitle: 'Actress', birthDate: '1990-05-20', birthplaceId: 'ke-nairobi',
      heritages: [{ id: 'Kikuyu', label: 'Kikuyu', custom: false }], heritageCustomText: '', mainLanguage: 'en', languages: [],
      startPlaceId: 'gb-london', startDate: '2026-05-04', startTime: '08:00', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByText("The festival and awards calendar couldn't be loaded. Check your connection and try again.")).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
});

test('a damaged genre catalog publishes nothing; Try Again with a good one opens the game with the whole catalog', async ({ page }) => {
  expectErrors('Serves a damaged genre catalog first.');
  let damaged = true;
  // Half the records, then one with no mechanic mapping: until November 7, 2026 the first half was kept and counted as loaded.
  await page.route((url) => /genre-catalog/.test(url.pathname) && !url.search, async (route) => {
    if (!damaged) return route.continue();
    const good = await (await route.fetch()).json() as { records: { id: string }[] };
    const half = good.records.slice(0, 70);
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ records: [...half, { ...good.records[70], id: 'not-a-genre' }] }) });
  });
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 'review', name: 'Nia Halvorsen-Mbeki', pronouns: 'she', actingTitle: 'Actress', birthDate: '1990-05-20', birthplaceId: 'ke-nairobi',
      heritages: [{ id: 'Kikuyu', label: 'Kikuyu', custom: false }], heritageCustomText: '', mainLanguage: 'en', languages: [],
      startPlaceId: 'gb-london', startDate: '2026-05-04', startTime: '08:00', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByText("The game's genre catalog couldn't be loaded. Check your connection and try again.")).toBeVisible();
  damaged = false;
  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await expect(page.getByText('All 149 catalog entries are searchable.')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('zombie');
  await expect(page.getByRole('button', { name: 'Add Zombie' })).toBeVisible();
});
