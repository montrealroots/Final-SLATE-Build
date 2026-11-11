// Data packs installed in Settings (November 11, 2026, docs/DATA-PACKS.md), with the player's own controls. Fixture data:
// the made-up catalog and cinemas in catalog-fixture.ts, written into pack files here, as tools/pack.mjs writes real ones.
// No request is intercepted: the game reads the installed packs instead of the server.
import { expect, test, type Page } from './test';
import { writePack } from '../tools/pack-format.mjs';
import { CATALOG_FIXTURE } from './catalog-fixture';
import { nav, quickLife } from './helpers';

const DAY = 86_400_000;
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });

/** The fixture as two packs: the films and series gathered `ageDays` ago, and the cinemas. */
function packs(ageDays = 1): { catalog: Buffer; cinemas: Buffer } {
  const at = new Date(Date.now() - ageDays * DAY).toISOString();
  const entries = Object.entries(CATALOG_FIXTURE).map(([p, body]) => [p, JSON.stringify(p === 'index.json' ? { ...(body as object), retrieved: { from: at, to: at, maxAgeDays: 180 } } : body)] as [string, string]);
  return {
    catalog: writePack({ kind: 'catalog', name: 'Films And Series', source: 'TMDB', builtAt: at, retrieved: { from: at, to: at, maxAgeDays: 180 } }, entries.filter(([p]) => !p.startsWith('cinemas/'))),
    cinemas: writePack({ kind: 'cinemas', name: 'Cinemas', source: 'Wikidata (CC0)', builtAt: at }, entries.filter(([p]) => p.startsWith('cinemas/'))),
  };
}
const install = (page: Page, name: string, buffer: Buffer) =>
  page.getByLabel('Data Pack File').setInputFiles({ name, mimeType: 'application/octet-stream', buffer });

test.beforeEach(({}, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
});

test('install the film and cinema packs in Settings, and the catalog and cinemas show; remove one, and its data goes', async ({ page }) => {
  test.setTimeout(180_000);
  const p = packs();
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  await expect(page.getByText('No data packs are installed.')).toBeVisible();
  await install(page, 'slate-catalog.slatepack', p.catalog);
  await expect(page.getByRole('status').filter({ hasText: 'Installed Films And Series.' })).toBeVisible();
  await install(page, 'slate-cinemas.slatepack', p.cinemas);
  await expect(page.getByRole('status').filter({ hasText: 'Installed Cinemas.' })).toBeVisible();
  const list = page.getByRole('list', { name: 'Installed Data Packs' });
  await expect(list.locator('li')).toHaveCount(2);
  await expect(list.locator('li', { hasText: 'Films And Series' })).toContainText(/From TMDB, gathered .*\. \d+ files, [\d.]+ MB\. Withdrawn on .*: TMDB allows its data to be kept six months\./);
  await expect(list.locator('li', { hasText: 'Films And Series' })).toContainText('This product uses the TMDB API but is not endorsed or certified by TMDB.');

  // The catalog, from the pack: a company, a film, a cast member.
  await nav(page, 'Companies');
  await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series with 1 season and 2 episodes, and 6 people');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await card(page, 'Cast').getByRole('button', { name: 'Ada Quill' }).click();
  await expect(page.getByRole('heading', { name: 'Ada Quill', level: 1 })).toBeVisible();
  // The cinemas, from theirs.
  await nav(page, 'World');
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('london');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'London', exact: true }).first().click();
  await expect(page.getByRole('region', { name: 'Cinemas Nearby' })).toContainText('Riverside Picturehouse (Fixture)');

  // Kept across a reload, as it is stored in this browser.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Companies');
  await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series');

  // Removed: every record goes, and the pages say the catalog isn't installed (unless a server has one).
  await nav(page, 'Settings');
  await list.getByRole('button', { name: 'Remove Films And Series' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Removed Films And Series. Every record it held was deleted from this browser.' })).toBeVisible();
  await expect(list.locator('li')).toHaveCount(1);
  const left = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok) => { const r = indexedDB.open('slate-packs'); r.onsuccess = () => ok(r.result); });
    return new Promise<string[]>((ok) => { const r = db.transaction('files').objectStore('files').getAllKeys(); r.onsuccess = () => ok(r.result.map(String)); });
  });
  expect(left.length).toBeGreaterThan(0);
  expect(left.every((k) => k.startsWith('cinemas:'))).toBe(true);
  await nav(page, 'Companies');
  await expect(page.getByText('3 films, 1 series with 1 season and 2 episodes, and 6 people')).toHaveCount(0);
});

test('a film pack older than TMDB\'s six months is refused, and a file that isn\'t a pack is too, with the game unchanged', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  await install(page, 'old.slatepack', packs(181).catalog);
  await expect(page.getByRole('alert')).toContainText('was gathered more than six months ago');
  await expect(page.getByRole('alert')).toContainText("the longest TMDB allows its data to be kept, so it can't be installed");
  await install(page, 'notes.slatepack', Buffer.from('not a pack'));
  await expect(page.getByRole('alert')).toContainText("This file isn't a SLATE data pack.");
  await expect(page.getByText('No data packs are installed.')).toBeVisible();
});
