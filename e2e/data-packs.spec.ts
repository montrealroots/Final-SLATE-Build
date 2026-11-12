// Data packs installed in Settings (November 11, 2026, docs/DATA-PACKS.md), with the player's own controls. Fixture data:
// the made-up catalog and cinemas in catalog-fixture.ts, written into pack files here, as tools/pack.mjs writes real ones.
// The game reads the installed packs instead of the server; the only requests answered here are the two listings of
// what the server offers, as a server that offers nothing.
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

test.beforeEach(async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  // Answered as a server that offers no mods and no pictures: a machine with the owner's own packs beside the game (the
  // dev server offers them) would add rows to the lists read here, and these journeys must be the same on every machine.
  await page.route('**/mods/index.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, mods: [] }) }));
  await page.route('**/mods/pictures/index.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, kinds: {} }) }));
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
  expect(left.every((k) => /^cinemas@\d+:/.test(k))).toBe(true); // each install keeps its records under a number of its own
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

// A real, one-pixel JPEG, standing in for a profile photo and a poster (labelled fixture).
const PIXEL = Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/yQALCAABAAEBAREA/8wABgAQEAX/2gAIAQEAAD8A0s8g/9k=', 'base64');
/** A picture pack for the fixture's Ada Quill and The Lantern Keeper, gathered so that its six months end `endsInMs` from now. */
function pictures(endsInMs = 170 * DAY): Buffer {
  const at = new Date(Date.now() - 180 * DAY + endsInMs).toISOString();
  const rec = { p: '/fixture.jpg', w: 1, h: 1, at: at.slice(0, 10), loc: null };
  const index = { version: 1, provider: 'TMDB', sizes: { profile: 'w185', poster: 'w154' }, rights: 'Fixture: the rights to each picture belong to its owner.', entries: { 'person:800001': rec, 'movie:900001': rec } };
  return writePack({ kind: 'images', name: 'Pictures', source: 'TMDB', builtAt: at, retrieved: { from: at, to: at, maxAgeDays: 180 } },
    [['images/index.json', JSON.stringify(index)], ['images/person/800001', PIXEL], ['images/movie/900001', PIXEL]]);
}
const recordKeys = (page: Page) => page.evaluate(async () => {
  const db = await new Promise<IDBDatabase>((ok) => { const r = indexedDB.open('slate-packs'); r.onsuccess = () => ok(r.result); });
  return new Promise<string[]>((ok) => { const r = db.transaction('files').objectStore('files').getAllKeys(); r.onsuccess = () => ok(r.result.map(String)); });
});
const openLantern = async (page: Page) => {
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible();
  // A picture is read only when its box is near the screen, and a page can open scrolled past it: bring it into view.
  await page.locator('.picture').first().scrollIntoViewIfNeeded();
};

test('J09: films and optional pictures installed and shown; pictures switched off; an update cancelled and one refused for room, the installed pack kept; the pictures withdrawn at six months while the game stays open; removed; the saved game opens', async ({ page }) => {
  test.setTimeout(300_000);
  // The page's clock is under the test's hand from the start, so an hour can pass at once later. Until then it runs as usual.
  await page.clock.install();
  const p = packs();
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  await install(page, 'slate-catalog.slatepack', p.catalog);
  await expect(page.getByRole('status').filter({ hasText: 'Installed Films And Series.' })).toBeVisible();
  const list = page.getByRole('list', { name: 'Mods' });
  // Without the picture pack every picture is a placeholder of the same shape, and nothing says a photo exists.
  await openLantern(page);
  const poster = page.locator('.picture').first();
  await expect(poster).toHaveAttribute('data-picture', 'placeholder');
  const shape = await poster.boundingBox();
  await expect(page.getByText('About This Picture')).toHaveCount(0);

  // The picture pack: optional, sized before it is installed, under the same six months.
  await nav(page, 'Settings');
  await install(page, 'slate-images.slatepack', pictures(30 * 60_000)); // its six months end in half an hour
  await expect(page.getByRole('status').filter({ hasText: 'Installed Pictures. Open a film, a series or a person in Companies to see its picture.' })).toBeVisible();
  await expect(list.locator('li', { hasText: 'Pictures' })).toContainText('Optional: posters and profile photos for some of the films, series and people. The game works the same without it, and a picture changes nothing in your story.');
  await expect(list.locator('li', { hasText: 'Pictures' })).toContainText(/Withdrawn on .*: TMDB allows its data to be kept six months\./);
  await expect(page.getByLabel('Storage In This Browser')).toContainText('An update is stored beside the mod it replaces and takes its place only once it is whole');
  await expect(page.getByLabel('Storage In This Browser')).toContainText('removing a mod never touches them');

  // A title's poster and a person's photo, each in a box of the shape the placeholder had; the cast row has a thumbnail.
  await openLantern(page);
  await expect(poster).toHaveAttribute('data-picture', 'shown');
  const img = poster.getByRole('img', { name: 'The poster of The Lantern Keeper (Fixture), from TMDB' });
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBe(1); // a real picture, decoded
  expect(await poster.boundingBox()).toEqual(shape); // nothing moved when it arrived
  await page.getByText('About This Picture').click();
  await expect(page.getByText('From TMDB, where it is the picture at /fixture.jpg')).toBeVisible();
  await expect(page.getByText('Fixture: the rights to each picture belong to its owner.')).toBeVisible();
  await expect(page.getByText('A picture is something to look at. Nothing in the game reads it, and it changes no outcome.')).toBeVisible();
  const row = card(page, 'Cast').locator('li', { hasText: 'Ada Quill' });
  // A picture is read only when its box comes near the screen, so the row is brought into view first.
  await row.scrollIntoViewIfNeeded();
  await expect(row.locator('.picture')).toHaveAttribute('data-picture', 'shown');
  await row.getByRole('button', { name: 'Ada Quill' }).click();
  await expect(page.getByRole('heading', { name: 'Ada Quill', level: 1 })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Ada Quill, a photo from TMDB' })).toBeVisible();

  // Switched off on this device: placeholders again, and back on.
  await nav(page, 'Settings');
  await page.getByRole('checkbox', { name: 'Show Pictures From The Picture Pack' }).uncheck();
  await openLantern(page);
  await expect(poster).toHaveAttribute('data-picture', 'placeholder');
  // The switch stays where it is first drawn. Here the browser takes 0.7 seconds to say how much room it has, as a slow
  // device does; before November 12, 2026 that line was above the switch and its arrival moved the switch 19 pixels.
  await page.evaluate(() => {
    const proto = Object.getPrototypeOf(navigator.storage); const real = proto.estimate;
    proto.estimate = function () { return new Promise((r) => setTimeout(() => r(real.call(this)), 700)); };
  });
  await nav(page, 'Settings');
  const tops = await page.evaluate(() => new Promise<number[]>((done) => {
    const seen: number[] = []; const t0 = performance.now();
    const tick = () => {
      const el = [...document.querySelectorAll('label.check')].find((l) => l.textContent?.includes('Show Pictures From The Picture Pack'));
      if (el) { const y = Math.round(el.getBoundingClientRect().top + window.scrollY + (document.getElementById('main')?.scrollTop ?? 0)); if (seen.at(-1) !== y) seen.push(y); }
      if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else done(seen);
    };
    tick();
  }));
  expect(tops, 'the picture switch moved after it was drawn').toHaveLength(1);
  await page.getByRole('checkbox', { name: 'Show Pictures From The Picture Pack' }).check();

  // An update cancelled part-way: the films that were installed are still there, whole, and nothing is left behind.
  const before = (await recordKeys(page)).filter((k) => k.startsWith('catalog')).sort();
  const at = new Date().toISOString();
  const filler = Array.from({ length: 30_000 }, (_, i) => [`filler/${i}.json`, '{}'] as [string, string]);
  const bigger = writePack({ kind: 'catalog', name: 'Films And Series', source: 'TMDB', builtAt: at, retrieved: { from: at, to: at, maxAgeDays: 180 } },
    [...Object.entries(CATALOG_FIXTURE).filter(([k]) => !k.startsWith('cinemas/')).map(([k, body]) => [k, JSON.stringify(k === 'index.json' ? { ...(body as object), retrieved: { from: at, to: at, maxAgeDays: 180 } } : body)] as [string, string]), ...filler]);
  await install(page, 'slate-catalog-newer.slatepack', bigger);
  await expect(page.getByRole('status').filter({ hasText: /Installing: [\d,]+ of 30,/ })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveText('Installing Films And Series was cancelled. Nothing was changed. Films And Series is still installed, as it was.');
  expect((await recordKeys(page)).filter((k) => k.startsWith('catalog')).sort()).toEqual(before);
  await nav(page, 'Companies');
  await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series with 1 season and 2 episodes, and 6 people');

  // An update there isn't room for is refused before anything is written, and says how much it needs.
  await nav(page, 'Settings');
  // Labelled fixture: the browser is made to report almost no room (on the prototype, so every engine takes it).
  await page.evaluate(() => {
    const w = window as unknown as { realStorage?: PropertyDescriptor };
    w.realStorage = Object.getOwnPropertyDescriptor(Navigator.prototype, 'storage');
    Object.defineProperty(Navigator.prototype, 'storage', { configurable: true, get: () => ({ estimate: async () => ({ quota: 50_000_000, usage: 49_999_000 }) }) });
  });
  await install(page, 'slate-catalog-newer.slatepack', bigger);
  await expect(page.getByRole('alert')).toContainText(/There isn't room in this browser's storage for Films And Series: it needs about [\d.]+ MB and 0\.0 MB is free\. Nothing was changed, and Films And Series is still installed\. Removing it first would free about [\d.]+ MB\./);
  expect((await recordKeys(page)).filter((k) => k.startsWith('catalog')).sort()).toEqual(before);
  await page.evaluate(() => { const w = window as unknown as { realStorage?: PropertyDescriptor }; if (w.realStorage) Object.defineProperty(Navigator.prototype, 'storage', w.realStorage); });

  // The game stays open past the pictures' six months: within the hour they are deleted and the pages show placeholders.
  await openLantern(page);
  await expect(poster).toHaveAttribute('data-picture', 'shown');
  await page.clock.fastForward('01:01:00');
  await expect(poster).toHaveAttribute('data-picture', 'placeholder', { timeout: 20_000 });
  expect((await recordKeys(page)).some((k) => k.startsWith('images'))).toBe(false);
  await nav(page, 'Settings');
  await expect(list.locator('li', { hasText: 'Pictures' })).toHaveCount(0);

  // Removed, the films go too; the game that was open is untouched and opens again after a reload.
  const saved = async () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok) => { const r = indexedDB.open('slate'); r.onsuccess = () => ok(r.result); });
    return db.objectStoreNames.length;
  }).catch(() => -1);
  const stores = await saved();
  await list.getByRole('button', { name: 'Remove Films And Series' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Removed Films And Series. Every record it held was deleted from this browser.' })).toBeVisible();
  expect((await recordKeys(page)).filter((k) => k.startsWith('catalog'))).toEqual([]);
  expect(await saved()).toBe(stores);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
});

// The game's own mods (the owner: "put that package in game under 'Mods' and once installed boom"), offered by the
// production server on port 4178 (e2e/serve-prod.ts): no catalog on the server, the fixture packs in its mods folder.
test.describe('mods the game offers', () => {
  test.use({ baseURL: 'http://localhost:4178' });
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.SLATE_E2E_PROD !== '1', 'Needs the production servers (SLATE_E2E_PROD=1).');
    // These journeys are about what this server offers, so its own listing is read, not the empty one above.
    await page.unroute('**/mods/index.json');
  });

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
  test.beforeEach(async ({ page }) => {
    test.skip(process.env.SLATE_E2E_PROD !== '1', 'Needs the production servers (SLATE_E2E_PROD=1).');
    // These journeys are about what this server offers, so its own listing is read, not the empty one above.
    await page.unroute('**/mods/index.json');
  });

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
