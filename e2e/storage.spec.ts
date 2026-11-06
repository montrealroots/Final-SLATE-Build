import { expect, test, type Page } from '@playwright/test';
import { advance, nav, quickLife, saveAndExit } from './helpers';
import { clearStorage, firstSaveId, listRecords, readRecord, refuseSaveWrites, writeRecords } from './vault';

// Saves live in IndexedDB (src/ui/idb.ts); these journeys cover full storage, recovery copies, and moving saves out of
// localStorage, where earlier versions kept them. Desktop and phone.
test.beforeEach(({}, info) => test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.'));

async function continueGame(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
}

test('full storage: saving says why, the last save stays, recovery copies can be exported and deleted, and saving resumes', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await saveAndExit(page);
  const id = await firstSaveId(page);
  // A damaged copy from earlier, as the game keeps them.
  await writeRecords(page, { [`slate.v1.save.${id}.damaged-1700000000000`]: 'x'.repeat(5000) });
  await continueGame(page);
  const saved = await readRecord(page, `slate.v1.save.${id}`);
  // Failure injection: the browser refuses writes as a full IndexedDB would.
  await refuseSaveWrites(page, true);

  await advance(page, 'next-day');
  const alert = page.getByRole('alert').filter({ hasText: 'storage for SLATE is full' });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText('Your last save is still there.');
  expect(await readRecord(page, `slate.v1.save.${id}`)).toBe(saved);

  await alert.getByRole('button', { name: 'Free Up Space' }).click();
  await expect(page.getByRole('heading', { name: 'Saved Games', level: 1 })).toBeVisible();
  const copies = page.getByRole('list', { name: 'Recovery Copies' });
  await expect(copies.getByText(/^Damaged save of /)).toBeVisible();
  const download = page.waitForEvent('download');
  await copies.getByRole('button', { name: /^Export Damaged save of / }).click();
  expect((await download).suggestedFilename()).toMatch(/damaged copy\)\.slate-save\.json$/);
  await refuseSaveWrites(page, false);
  await copies.getByRole('button', { name: /^Delete Damaged save of / }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete This Copy?' });
  await expect(confirm).toContainText("Your saved game and its backup won't change.");
  await confirm.getByRole('button', { name: 'Delete Copy' }).click();
  await expect(page.getByText('None. Each game also keeps its previous save as a backup')).toBeVisible();
  expect((await listRecords(page)).some((k) => k.includes('.damaged-'))).toBe(false);

  await alert.getByRole('button', { name: 'Try Again' }).click();
  await expect(alert).toBeHidden();
  await expect(page.locator('.save-state')).toHaveText(/Saved/);
  expect(await readRecord(page, `slate.v1.save.${id}`)).not.toBe(saved);
  expect(await readRecord(page, `slate.v1.save.${id}.bak`)).toBe(saved);
});

test('a save whose only good copy is a backup taken before an update is still listed and opens', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const main = (await readRecord(page, `slate.v1.save.${id}`))!;
  await writeRecords(page, { [`slate.v1.save.${id}`]: null, [`slate.v1.save.${id}.bak`]: null, 'slate.v1.index': null, [`slate.v1.save.${id}.backup-v3`]: main });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/^Your latest save couldn't be found, so the copy kept before this save was updated, from .+, was opened\.$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await nav(page, 'Saved Games');
  await expect(page.getByRole('list', { name: 'Recovery Copies' }).getByText(/^Copy from before an update of /)).toBeVisible();
});

/** A game saved by this build, then put back into localStorage as an earlier version would have left it. */
async function legacySaves(page: Page): Promise<{ id: string; records: Record<string, string> }> {
  await quickLife(page, 'gb-london', '2026-03-02');
  await advance(page, 'next-day');
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const records: Record<string, string> = {};
  for (const k of await listRecords(page)) records[k] = (await readRecord(page, k))!;
  records[`slate.v1.save.${id}.damaged-1600000000000`] = 'an old damaged copy';
  await clearStorage(page);
  await page.evaluate((recs) => { for (const [k, v] of Object.entries(recs)) localStorage.setItem(k, v); }, records);
  return { id, records };
}

test('saves an earlier version left in localStorage move to IndexedDB once, verified, and keep every copy', async ({ page }) => {
  const { id, records } = await legacySaves(page);
  await continueGame(page);
  for (const [k, v] of Object.entries(records)) if (k.startsWith('slate.v1.save.')) expect(await readRecord(page, k), k).toBe(v);
  const leftInLocal = await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('slate.v1.save.') || k === 'slate.v1.index'));
  expect(leftInLocal).toEqual([]);
  await nav(page, 'Saved Games');
  await expect(page.getByRole('list', { name: 'Recovery Copies' }).getByText(/^Damaged save of /)).toBeVisible();
  expect((await listRecords(page)).filter((k) => k.includes('.conflict-'))).toEqual([]);
  void id;
});

test('two tabs opening at once move the saves once, without conflict copies', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'Two tabs are checked once.');
  const { records } = await legacySaves(page);
  const second = await context.newPage();
  await Promise.all([page.reload(), second.goto('/')]);
  await Promise.all([page, second].map((p) => expect(p.getByRole('button', { name: 'Continue', exact: true })).toBeVisible()));
  const keys = await listRecords(page);
  for (const k of Object.keys(records)) if (k.startsWith('slate.v1.save.')) expect(keys).toContain(k);
  expect(keys.filter((k) => k.includes('.conflict-'))).toEqual([]);
});

test('an interrupted move finishes without duplicates; a save changed in both places keeps both versions', async ({ page }) => {
  const { id, records } = await legacySaves(page);
  const key = `slate.v1.save.${id}`;
  // Interrupted after storing: IndexedDB already holds the same records, localStorage wasn't cleared yet.
  await writeRecords(page, Object.fromEntries(Object.entries(records).filter(([k]) => k.startsWith('slate.v1.save.'))));
  // Meanwhile an older tab saved the game again in localStorage.
  const env = JSON.parse(records[key]);
  const state = JSON.parse(env.data);
  state.saveName = 'Saved By Another Tab';
  state.updatedAtReal += 60_000;
  const { hashString } = await import('../src/engine/rng');
  const data = JSON.stringify(state);
  const newer = JSON.stringify({ ...env, checksum: hashString(data), data });
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [key, newer]);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  expect(await readRecord(page, key)).toBe(newer);
  const conflicts = (await listRecords(page)).filter((k) => k.startsWith(`${key}.conflict-`));
  expect(conflicts).toHaveLength(1);
  expect(await readRecord(page, conflicts[0])).toBe(records[key]);
  await page.getByRole('button', { name: 'Saved Games' }).click();
  await expect(page.getByRole('list', { name: 'Recovery Copies' }).getByText(/^Copy saved by another tab of /)).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('slate.v1.save.')))).toEqual([]);
});
