// The whole catalog's pictures in Settings (November 12, 2026; docs/DATA-PACKS.md; the v3 package, 03, T10): downloaded
// a kind at a time or all at once, with the size and the room said first; paused and gone on with; a damaged part
// refused and tried again; removed, with the save as it was. The pictures here are made up: a few bytes each, packed as
// tools/screen-catalog/pictures.mjs packs real ones, and served in place of the owner's server. The full download is
// measured in docs/PICTURE-COVERAGE.md, not here.
import { createHash } from 'node:crypto';
import { expect, expectErrors, test, type Page } from './test';
import { writePack } from '../tools/pack-format.mjs';
import { bucketOf } from '../tools/screen-catalog/pictures.mjs';
import { serveCatalog } from './catalog-fixture';
import { audit } from './ui-audit';
import { nav, quickLife, readSavedState } from './helpers';

const AT = new Date().toISOString();
const DAY = AT.slice(0, 10);
// The smallest PNG there is: one transparent pixel.
const PIXEL = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const NAMES: Record<string, string> = { profile: "People's Portraits", poster: 'Film And Series Posters', backdrop: 'Film And Series Backdrops', 'season-poster': 'Season Posters', still: 'Episode Stills', logo: 'Company And Network Logos' };
const WANTED: [kind: string, entity: string][] = [
  ['profile', 'person:800001'], ['profile', 'person:800002'], ['profile', 'person:800005'],
  ['poster', 'movie:900001'], ['poster', 'tv:900101'], ['backdrop', 'movie:900001'],
  ['season-poster', 'season:900101:1'], ['still', 'episode:900101:1:1'],
  ['logo', 'company:walt-disney-pictures'], ['logo', 'network:2'],
];

/** The made-up pictures as the listing and its packs, one pack for each shard a record falls in. */
function library(builtAt = AT) {
  const parts = new Map<string, { kind: string; entities: string[] }>();
  for (const [kind, entity] of WANTED) { const part = `${kind}-${bucketOf(entity)}`; (parts.get(part) ?? parts.set(part, { kind, entities: [] }).get(part)!).entities.push(entity); }
  const files = new Map<string, Buffer>();
  const kinds: Record<string, { name: string; size: string; pictures: number; bytes: number; shards: { part: string; file: string; pictures: number; bytes: number; sha256: string }[] }> = {};
  for (const [part, { kind, entities }] of [...parts].sort(([a], [b]) => a.localeCompare(b))) {
    const index = { version: 1, provider: 'TMDB', kind, size: 'w185', rights: 'A made-up statement about rights, for the tests.', entries: Object.fromEntries(entities.map((e) => [e, { p: `/${e.replace(/:/g, '-')}.jpg`, w: 1, h: 1, at: DAY }])) };
    const buf = writePack({ kind: 'pictures', part, name: `${NAMES[kind]}, Part ${part.slice(-2)}`, source: 'TMDB', builtAt, retrieved: { from: DAY, to: DAY, maxAgeDays: 180 } }, [[`pictures/${part}/index.json`, JSON.stringify(index)], ...entities.map((e) => [`pictures/${part}/${e}`, PIXEL] as [string, Buffer])]);
    files.set(`${part}.slatepack`, buf);
    const k = (kinds[kind] ??= { name: NAMES[kind], size: 'w185', pictures: 0, bytes: 0, shards: [] });
    k.pictures += entities.length; k.bytes += buf.length;
    k.shards.push({ part, file: `${part}.slatepack`, pictures: entities.length, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') });
  }
  return { listing: { version: 1, provider: 'TMDB', builtAt, retrieved: { from: DAY, to: DAY, maxAgeDays: 180 }, rights: 'A made-up statement about rights, for the tests.', kinds }, files };
}

interface Served { asked: string[]; ranges: string[] }
/** Answers the picture routes from a made-up library. `each` can delay or spoil one answer. */
async function serve(page: Page, lib: ReturnType<typeof library>, each?: (file: string, nth: number) => Promise<Buffer | void> | Buffer | void): Promise<Served> {
  const served: Served = { asked: [], ranges: [] };
  await page.route('**/mods/pictures/index.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(lib.listing) }));
  await page.route('**/mods/pictures/*.slatepack', async (r) => {
    const file = new URL(r.request().url()).pathname.split('/').pop()!;
    served.asked.push(file);
    const range = r.request().headers().range; if (range) served.ranges.push(`${file} ${range}`);
    const whole = lib.files.get(file);
    if (!whole) return r.fulfill({ status: 404, body: '' });
    const other = await each?.(file, served.asked.filter((f) => f === file).length);
    return r.fulfill({ status: 200, contentType: 'application/octet-stream', body: other ?? whole }).catch(() => undefined);
  });
  return served;
}
/** A picture is read from storage only when its box is near the screen, so bring the box into view before expecting it. */
async function shown(page: Page, kind: string, name: string): Promise<void> {
  await page.locator(`.picture[data-kind="${kind}"]`).first().scrollIntoViewIfNeeded();
  await expect(page.getByRole('img', { name })).toBeVisible();
}
const section = (page: Page) => page.getByRole('region', { name: 'Pictures For The Whole Catalog' });
const kindRow = (page: Page, name: string) => section(page).getByRole('list', { name: 'Kinds Of Picture' }).locator('li', { hasText: name });

test.beforeEach(({}, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
});

test('pictures a kind at a time, then all: the size and the room said first, shown on every page they belong to, removed with the save as it was', async ({ page }, info) => {
  test.setTimeout(240_000);
  const lib = library();
  const served = await serve(page, lib);
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  const s = section(page);
  await expect(s).toContainText('10 pictures for the films, series, seasons, episodes, people and companies the catalog covers');
  await expect(s).toContainText('This product uses the TMDB API but is not endorsed or certified by TMDB.');
  await expect(kindRow(page, "People's Portraits")).toContainText('3 pictures');
  // Nothing is fetched until the player has seen what it is and chosen.
  await kindRow(page, "People's Portraits").getByRole('button', { name: "Download People's Portraits" }).click();
  const before = s.getByRole('group', { name: 'Before You Download' });
  await expect(before).toContainText(/People's Portraits: 3 pictures in \d parts?, [\d.]+ MB to download\. It needs about [\d.]+ MB free in this browser\./);
  expect(served.asked).toEqual([]);
  if (info.project.name !== 'desktop') expect((await audit(page)).defects, 'the pictures section with its question open, on a phone').toEqual([]);
  await before.getByRole('button', { name: 'Not Now' }).click();
  await expect(before).toHaveCount(0);
  expect(served.asked).toEqual([]);
  await kindRow(page, "People's Portraits").getByRole('button', { name: "Download People's Portraits" }).click();
  await s.getByRole('group', { name: 'Before You Download' }).getByRole('button', { name: 'Download 3 Pictures' }).click();
  await expect(s.getByRole('status')).toContainText('Downloaded and installed.');
  await expect(kindRow(page, "People's Portraits")).toContainText('Installed');
  expect(served.asked.every((f) => f.startsWith('profile-'))).toBe(true);
  const saved = JSON.stringify((await readSavedState(page)).player);

  // A person's photo is there; the film's poster, not downloaded, is still a plain box.
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await page.locator('section.card', { has: page.getByRole('heading', { name: 'Films And Series', exact: true }) }).getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await shown(page, 'poster', 'No poster of The Lantern Keeper (Fixture) is shown');
  await page.locator('section.card', { has: page.getByRole('heading', { name: 'Cast', exact: true }) }).getByRole('button', { name: 'Ada Quill' }).click();
  await shown(page, 'profile', 'Ada Quill, a photo from TMDB');
  await page.getByText('About This Picture').click();
  await expect(page.locator('details', { hasText: 'About This Picture' })).toContainText('A made-up statement about rights, for the tests.');
  await expect(page.locator('details', { hasText: 'About This Picture' })).toContainText('TMDB allows its data to be kept six months');

  // All of it.
  await nav(page, 'Settings');
  await section(page).getByRole('button', { name: 'Download All Available' }).click();
  await expect(section(page).getByRole('group', { name: 'Before You Download' })).toContainText('Every picture: 7 pictures in');
  await section(page).getByRole('group', { name: 'Before You Download' }).getByRole('button', { name: 'Download 7 Pictures' }).click();
  await expect(section(page).getByRole('status')).toContainText('Downloaded and installed.');
  for (const name of Object.values(NAMES)) await expect(kindRow(page, name)).toContainText('Installed');
  await expect(section(page).getByRole('button', { name: 'Download All Available' })).toHaveCount(0);
  // A part already installed is not asked for again.
  expect(served.asked.filter((f) => f.startsWith('profile-')).length).toBe(lib.listing.kinds.profile.shards.length);

  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await shown(page, 'logo', 'The logo of Walt Disney Pictures, from TMDB');
  const titles = page.locator('section.card', { has: page.getByRole('heading', { name: 'Films And Series', exact: true }) });
  await titles.getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await shown(page, 'poster', 'The poster of The Lantern Keeper (Fixture), from TMDB');
  await shown(page, 'backdrop', 'A still from The Lantern Keeper (Fixture), from TMDB');
  if (info.project.name !== 'desktop') expect((await audit(page)).defects, 'a film with its poster and backdrop, on a phone').toEqual([]);
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await titles.getByRole('button', { name: 'Tidewater Station (Fixture)' }).click();
  await page.locator('section.card', { has: page.getByRole('heading', { name: 'Seasons', exact: true }) }).getByRole('button', { name: 'Season 1' }).click();
  await shown(page, 'season-poster', 'The poster of Tidewater Station (Fixture), Season 1, from TMDB');
  await page.locator('section.card', { has: page.getByRole('heading', { name: 'Episodes', exact: true }) }).getByRole('button', { name: 'Pilot' }).click();
  await shown(page, 'still', 'A still from Tidewater Station (Fixture): Pilot, from TMDB');

  // Reloaded, they are still there: they are in the browser, not in the page.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Settings');
  await expect(kindRow(page, 'Episode Stills')).toContainText('Installed');

  // Removed: the pictures go, the plain boxes come back, and the save is what it was.
  await kindRow(page, "People's Portraits").getByRole('button', { name: "Remove People's Portraits" }).click();
  await expect(section(page).getByRole('status')).toContainText("Removed People's Portraits");
  await expect(kindRow(page, "People's Portraits")).not.toContainText('Installed');
  await expect(kindRow(page, 'Episode Stills')).toContainText('Installed');
  await section(page).getByRole('button', { name: 'Remove All Pictures' }).click();
  await expect(section(page).getByRole('status')).toContainText('Your saved games, and everyone in them, are as they were.');
  for (const name of Object.values(NAMES)) await expect(kindRow(page, name)).not.toContainText('Installed');
  expect(JSON.stringify((await readSavedState(page)).player)).toBe(saved);
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await shown(page, 'logo', 'No logo of Walt Disney Pictures is shown');
});

test('paused part way and gone on with; a damaged part refused and tried again; no room said before anything is fetched', async ({ page }) => {
  test.setTimeout(240_000);
  expectErrors('A damaged pack is served on purpose.');
  const lib = library();
  const total = [...lib.files.keys()].length;
  let slow = true;
  const spoil = [...lib.files.keys()].find((f) => f.startsWith('still-'))!;
  const served = await serve(page, lib, async (file, nth) => {
    if (slow) await new Promise((r) => setTimeout(r, 700));
    // The first answer for one part is not the file the listing promised.
    if (file === spoil && nth === 1) { const b = Buffer.from(lib.files.get(file)!); b[b.length - 1] ^= 0xff; return b; }
  });
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  const s = section(page);
  await s.getByRole('button', { name: 'Download All Available' }).click();
  await s.getByRole('group', { name: 'Before You Download' }).getByRole('button', { name: 'Download 10 Pictures' }).click();
  // Part way: one part is in, and the download is stopped.
  await expect(s.getByRole('status')).toContainText(/[1-9] of \d+ parts installed/);
  await s.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(s.getByRole('status')).toContainText('Paused.');
  await expect(s.getByRole('status')).toContainText('What is installed is in use. Going on asks only for what is left.');
  const done = Number((await s.getByRole('status').innerText()).match(/(\d+) of \d+ parts installed/)![1]);
  expect(done).toBeGreaterThan(0);
  expect(done).toBeLessThan(total);
  const askedBefore = [...served.asked];
  slow = false;
  await s.getByRole('button', { name: 'Go On Downloading' }).click();
  // It finishes all but the damaged part, and says which could not be installed and why.
  await expect(s.getByRole('alert')).toContainText("1 part couldn't be installed");
  await expect(s.getByRole('alert')).toContainText("arrived damaged: it isn't the file the game's server listed. Nothing was changed.");
  // Nothing that was installed before the pause was asked for again.
  const installedBefore = askedBefore.slice(0, done);
  for (const f of installedBefore) expect(served.asked.filter((x) => x === f).length, f).toBe(1);
  await expect(kindRow(page, 'Episode Stills')).not.toContainText('Installed');
  await s.getByRole('button', { name: 'Try The 1 Failed Part Again' }).click();
  await expect(kindRow(page, 'Episode Stills')).toContainText('Installed');
  await expect(s.getByRole('alert')).toHaveCount(0);
  expect(served.asked.filter((x) => x === spoil).length).toBe(2);

  // No room: said before anything is fetched, and nothing is.
  await s.getByRole('button', { name: 'Remove All Pictures' }).click();
  await expect(s.getByRole('status')).toContainText('Removed every picture');
  await page.evaluate(() => { Object.defineProperty(navigator.storage, 'estimate', { configurable: true, value: async () => ({ quota: 5000, usage: 4990 }) }); });
  const count = served.asked.length;
  await s.getByRole('button', { name: 'Download All Available' }).click();
  const before = s.getByRole('group', { name: 'Before You Download' });
  await expect(before.getByRole('alert')).toContainText("There isn't room for it. Nothing was downloaded.");
  await expect(before.getByRole('button', { name: /^Download \d+ Pictures$/ })).toHaveCount(0);
  expect(served.asked.length).toBe(count);
});

test('a copy of the game that offers no pictures says nothing about them', async ({ page }) => {
  await page.route('**/mods/pictures/index.json', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: 1, kinds: {} }) }));
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  await expect(page.getByRole('list', { name: 'Mods' }).or(page.getByText('This copy of the game offers no mods'))).toBeVisible();
  await expect(section(page)).toHaveCount(0);
});

// A real sample, where the owner's own packs are on this machine (never in CI, and never in the repository): every
// company and network logo, about 2.6 MB in 63 parts, from the dev server that is the owner's own. It shows the path
// from the downloaded store to a page with nothing made up in between.
test('the owner\'s real logos install from the owner\'s own server and show on a real company\'s page', async ({ page }, info) => {
  const { existsSync, readFileSync } = await import('node:fs');
  test.skip(info.project.name !== 'desktop', 'Once is enough.');
  test.skip(process.env.SLATE_E2E_PROD === '1' || !existsSync('packs/pictures/index.json') || !existsSync('.screen-catalog/index.json'), "Needs the owner's own catalog and pictures, served by the dev server.");
  test.setTimeout(240_000);
  const listing = JSON.parse(readFileSync('packs/pictures/index.json', 'utf8'));
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Settings');
  const s = section(page);
  await expect(s).toContainText('From TMDB, gathered');
  await kindRow(page, 'Company And Network Logos').getByRole('button', { name: 'Download Company And Network Logos' }).click();
  const before = s.getByRole('group', { name: 'Before You Download' });
  await expect(before).toContainText(`${listing.kinds.logo.pictures} pictures in ${listing.kinds.logo.shards.length} parts`);
  await before.getByRole('button', { name: `Download ${listing.kinds.logo.pictures} Pictures` }).click();
  await expect(s.getByRole('status')).toContainText('Downloaded and installed.', { timeout: 120_000 });
  await expect(kindRow(page, 'Company And Network Logos')).toContainText('Installed');
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Pixar', exact: true }).click();
  await shown(page, 'logo', 'The logo of Pixar, from TMDB');
  // What came back is a picture with a size of its own, not a blank.
  const size = await page.getByRole('img', { name: 'The logo of Pixar, from TMDB' }).evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight]);
  expect(size[0]).toBeGreaterThan(20);
  expect(size[1]).toBeGreaterThan(5);
  await page.screenshot({ path: `${process.env.UI_SHOTS ?? 'test-results'}/real-logo-pixar.png` });
});
