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
  page.getByLabel('Mod File').setInputFiles({ name, mimeType: 'application/octet-stream', buffer });

test.beforeEach(({}, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
});

test('install the film and cinema packs from files in Settings, and the catalog and cinemas show; remove one, and its data goes', async ({ page }) => {
  test.setTimeout(180_000);
  const p = packs();
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  await install(page, 'slate-catalog.slatepack', p.catalog);
  await expect(page.getByRole('status').filter({ hasText: 'Installed Films And Series.' })).toBeVisible();
  await install(page, 'slate-cinemas.slatepack', p.cinemas);
  await expect(page.getByRole('status').filter({ hasText: 'Installed Cinemas.' })).toBeVisible();
  const list = page.getByRole('list', { name: 'Mods' });
  await expect(list.locator('li', { hasText: 'Films And Series' })).toContainText('Installed');
  await expect(list.locator('li', { hasText: 'Cinemas' })).toContainText('Installed');
  await expect(list.locator('li', { hasText: 'Films And Series' })).toContainText(/From TMDB, gathered .*\. [\d.]+ MB\. Withdrawn on .*: TMDB allows its data to be kept six months\./);
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
  await expect(list.getByRole('button', { name: 'Remove Films And Series' })).toHaveCount(0);
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
  await expect(page.getByRole('list', { name: 'Mods' }).getByText('Installed', { exact: true })).toHaveCount(0);
});

// The game's own mods (the owner: "put that package in game under 'Mods' and once installed boom"), offered by the
// production server on port 4178 (e2e/serve-prod.ts): no catalog on the server, the fixture packs in its mods folder.
test.describe('mods the game offers', () => {
  test.use({ baseURL: 'http://localhost:4178' });
  test.beforeEach(() => { test.skip(process.env.SLATE_E2E_PROD !== '1', 'Needs the production servers (SLATE_E2E_PROD=1).'); });

  test('one press installs each, and the films and the cinemas show', async ({ page }) => {
    test.setTimeout(180_000);
    await quickLife(page, 'gb-london', '2026-01-05');
    await nav(page, 'Companies');
    await expect(page.getByText('To add them, install the Films And Series mod in Settings, under Mods.')).toBeVisible();
    await nav(page, 'Settings');
    const list = page.getByRole('list', { name: 'Mods' });
    await expect(list.locator('li', { hasText: 'Films And Series' })).toContainText('Every film, series, season, episode and person the catalog covers');
    await list.getByRole('button', { name: 'Install Films And Series' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Installed Films And Series. Open Companies to see the films and series.' })).toBeVisible();
    await list.getByRole('button', { name: 'Install Cinemas' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Installed Cinemas.' })).toBeVisible();
    await expect(list.getByText('Installed', { exact: true })).toHaveCount(2);
    await expect(list.getByRole('button', { name: /^Install / })).toHaveCount(0);
    await nav(page, 'Companies');
    await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series with 1 season and 2 episodes, and 6 people');
    await nav(page, 'World');
    await page.getByRole('searchbox', { name: 'Search Places' }).fill('london');
    await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'London', exact: true }).first().click();
    await expect(page.getByRole('region', { name: 'Cinemas Nearby' })).toContainText('Riverside Picturehouse (Fixture)');
  });
});

// A server that isn't the owner's own (port 4179, e2e/serve-prod.ts: the fixture catalog and both packs in its folders,
// but no --owner) gives no player TMDB's data and never tells them to install a film mod (docs/DEPLOYMENT.md).
test.describe('a copy that offers no film pack', () => {
  test.use({ baseURL: 'http://localhost:4179' });
  test.beforeEach(() => { test.skip(process.env.SLATE_E2E_PROD !== '1', 'Needs the production servers (SLATE_E2E_PROD=1).'); });

  test('says the films aren\'t installed, and doesn\'t point to a mod it can\'t give', async ({ page }) => {
    await quickLife(page, 'gb-london', '2026-01-05');
    await nav(page, 'Companies');
    await expect(page.getByRole('heading', { name: "The Film Catalog Isn't Installed" })).toBeVisible();
    await expect(page.getByText('install the Films And Series mod')).toHaveCount(0);
    // Its Mods list holds the cinemas alone, and they install and show.
    await nav(page, 'Settings');
    const list = page.getByRole('list', { name: 'Mods' });
    await expect(list.getByRole('button', { name: 'Install Cinemas' })).toBeVisible();
    await expect(list.getByText('Films And Series')).toHaveCount(0);
    await list.getByRole('button', { name: 'Install Cinemas' }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Installed Cinemas.' })).toBeVisible();
  });
});
