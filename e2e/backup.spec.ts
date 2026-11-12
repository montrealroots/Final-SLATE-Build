import { readFileSync } from 'fs';
import { expect, expectErrors, test, type Page } from './test';
import { hashString } from '../src/engine/rng';
import { advance, newProject, quickLife, readSavedState, saveAndExit } from './helpers';
import { listRecords, readRecord, refuseSaveWrites } from './vault';

// Export Save and Import Save: backup and restoration, on desktop and phone.
test.beforeEach(({}, info) => test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.'));

/** What a player would mind losing, as stored. */
function essentials(s: Record<string, any>) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return JSON.stringify({
    character: s.character, now: s.now, location: s.locationId, places: s.places, log: s.log, events: s.events, editions: s.editions,
    projects: s.projects, ledger: s.projects.map((p: { obligations: unknown }) => p.obligations),
  });
}

async function openSavedGames(page: Page) {
  await page.getByRole('button', { name: 'Saved Games', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saved Games', level: 1 })).toBeVisible();
}

/** A game with a project and some days played, exported from the start screen; returns the file's text. */
async function playedAndExported(page: Page): Promise<{ file: string; name: string; state: Record<string, unknown> }> {
  await quickLife(page, 'gb-london', '2026-03-02');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '6' });
  await advance(page, 'next-day');
  await saveAndExit(page);
  const state = await readSavedState(page);
  await openSavedGames(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Export Save / }).first().click();
  const path = await (await download).path();
  return { file: readFileSync(path!, 'utf8'), name: state.saveName as string, state };
}

async function importFile(page: Page, text: string, name = 'save.slate-save.json') {
  await page.getByLabel('Save File To Import').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}

test('export, then import into a fresh browser: it opens, plays on, saves and reloads with its history intact', async ({ page, browser }) => {
  const { file, name, state } = await playedAndExported(page);
  expect(JSON.parse(file).format).toBe('slate-save');

  // A different browser profile: no saves, no localStorage, its own IndexedDB.
  const fresh = await browser.newContext();
  const other = await fresh.newPage();
  await other.goto('/');
  await openSavedGames(other);
  await expect(other.getByText('No saved games yet.', { exact: false })).toBeVisible();
  await importFile(other, file);
  await expect(other.getByRole('status')).toContainText(`Imported ${name}. It's in your saved games.`);
  // Read as stored, before it is opened. An open game's clock runs and its first save comes a quarter of a second in,
  // so reading after opening raced that save: CI lost the race once (November 12, 2026), with every field the same but
  // the time, 250 milliseconds on.
  const imported = await readSavedState(other);
  expect(essentials(imported)).toBe(essentials(state));
  expect(imported.projects[0].title).toBe('Harbour Lights');
  await other.getByRole('button', { name: 'Open Imported Save' }).click();
  await expect(other.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  // Play on, save, reload: still there, a day later.
  await advance(other, 'next-day');
  await expect(other.locator('.save-state')).toHaveText(/Saved/);
  await other.reload();
  await other.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(other.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  const after = await readSavedState(other);
  expect(after.now).toBeGreaterThan(state.now as number);
  expect(after.projects.map((p: { title: string }) => p.title)).toEqual(['Harbour Lights']);
  await fresh.close();
});

test('importing a save that is already here: a separate copy, or a replacement only after confirming it', async ({ page }) => {
  const { file, name } = await playedAndExported(page);
  const id = JSON.parse(JSON.parse(file).data).saveId as string;
  const here = await readRecord(page, `slate.v1.save.${id}`);
  await importFile(page, file);
  const conflict = page.getByRole('dialog', { name: 'This Save Is Already Here' });
  await expect(conflict).toContainText(name);
  await conflict.getByRole('button', { name: 'Import As A Separate Copy' }).click();
  await expect(page.getByRole('status')).toContainText(`Imported ${name} (Imported Copy).`);
  expect(await readRecord(page, `slate.v1.save.${id}`)).toBe(here); // untouched
  await expect(page.getByText(`${name} (Imported Copy)`, { exact: false }).first()).toBeVisible();

  // Replacement asks twice, and the first answer can back out.
  await importFile(page, file);
  await page.getByRole('dialog', { name: 'This Save Is Already Here' }).getByRole('button', { name: 'Replace The Save Here' }).click();
  const confirm = page.getByRole('dialog', { name: 'Replace This Save?' });
  await expect(confirm).toContainText('kept as this save\'s backup');
  await confirm.getByRole('button', { name: 'Keep The Save Here' }).click();
  await expect(page.getByRole('dialog', { name: 'This Save Is Already Here' })).toBeVisible();
  expect(await readRecord(page, `slate.v1.save.${id}`)).toBe(here);
  await page.getByRole('dialog', { name: 'This Save Is Already Here' }).getByRole('button', { name: 'Replace The Save Here' }).click();
  await page.getByRole('dialog', { name: 'Replace This Save?' }).getByRole('button', { name: 'Replace Save' }).click();
  await expect(page.getByRole('status')).toContainText(`Imported ${name}.`);
  expect(await readRecord(page, `slate.v1.save.${id}.bak`)).toBe(here);
});

test('files that cannot be imported say why, and change nothing: newer version, not a save, damaged, storage full', async ({ page }) => {
  expectErrors('Refuses IndexedDB writes to simulate full storage.');
  const { file } = await playedAndExported(page);
  const before = (await listRecords(page)).sort();
  const env = JSON.parse(file);
  const raw = JSON.parse(env.data);
  raw.version = 99;
  const data = JSON.stringify(raw);
  await importFile(page, JSON.stringify({ format: 'slate-save', version: 99, checksum: hashString(data), data }));
  await expect(page.getByRole('alert')).toContainText('newer version of SLATE');
  await importFile(page, 'hello, this is a text file', 'notes.txt');
  await expect(page.getByRole('alert')).toContainText('not readable');
  await importFile(page, file.replace('"checksum":', '"checksum":1'));
  await expect(page.getByRole('alert')).toContainText('incomplete or damaged');
  await refuseSaveWrites(page, true);
  await importFile(page, file);
  await page.getByRole('dialog', { name: 'This Save Is Already Here' }).getByRole('button', { name: 'Import As A Separate Copy' }).click();
  await expect(page.getByRole('alert')).toContainText("There isn't room in this browser's storage to import it. Nothing was changed.");
  await refuseSaveWrites(page, false);
  expect((await listRecords(page)).sort()).toEqual(before);
});

test('a save open in another tab is not replaced by an import there; a separate copy still works', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'Two tabs are checked once.');
  const { file, name } = await playedAndExported(page);
  // This tab plays the save; a second tab imports the same file.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  const second = await context.newPage();
  await second.goto('/');
  await openSavedGames(second);
  await importFile(second, file);
  await second.getByRole('dialog', { name: 'This Save Is Already Here' }).getByRole('button', { name: 'Replace The Save Here' }).click();
  await second.getByRole('dialog', { name: 'Replace This Save?' }).getByRole('button', { name: 'Replace Save' }).click();
  await expect(second.getByRole('alert')).toContainText('That save is open in another tab. Close it there, then import it.');
  await importFile(second, file);
  await second.getByRole('dialog', { name: 'This Save Is Already Here' }).getByRole('button', { name: 'Import As A Separate Copy' }).click();
  await expect(second.getByRole('status')).toContainText(`Imported ${name} (Imported Copy).`);
  await second.close();
});
