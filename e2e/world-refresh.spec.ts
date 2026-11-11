// A refreshed catalog and an existing save (November 11, 2026; the Creative Depth package, milestone A, journey J10;
// docs/WORLD.md, "What A Save Keeps" and "Taking Newer Records"). Fixture data: the made-up catalog of
// catalog-fixture.ts, then a "refreshed" copy of its world file in which the simulated series has moved network, has
// a longer recorded season on other dates and another cast, and a new series has appeared. Nothing here is TMDB's.
import { expect, test, type Page } from './test';
import { CATALOG_FIXTURE, serveCatalog } from './catalog-fixture';
import { advance, nav, quickLife, readSavedState } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const REFRESHED_AT = '2027-01-20T09:00:00.000Z';

type World = { series: Record<string, unknown>[] } & Record<string, unknown>;
/** The fixture's world file as a later gathering would have it. */
function refreshedWorld(): Record<string, unknown> {
  const w = CATALOG_FIXTURE['world.json'] as World;
  const coastline = w.series[0];
  return {
    'world.json': {
      ...w, builtAt: REFRESHED_AT,
      series: [
        { ...coastline, net: ['ABC'],
          seasons: [{ n: 1, eps: 10, dated: 10, d0: '2026-03-02', d1: '2026-05-04', gap: 7, drop: 0 }],
          regulars: [{ p: 800001, name: 'Ada Quill', ch: 'Juno Marsh', born: '1980-04-02' }, { p: 800009, name: 'Someone New (Fixture)', ch: 'The Newcomer' }] },
        { r: 'tv:900301', t: 'Northern Line (Fixture)', status: 'Returning Series', type: 'Scripted', net: ['FX'], ci: [], genres: ['Drama'], daily: 0, aired: 1,
          seasons: [{ n: 1, eps: 6, dated: 6, d0: '2026-08-03', d1: '2026-09-07', gap: 7, drop: 0 }], regulars: [] },
      ],
    },
    'index.json': { ...(CATALOG_FIXTURE['index.json'] as object), builtAt: REFRESHED_AT },
  };
}

test.beforeEach(({}, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
});

test('a refreshed catalog changes nothing an existing save decides: same network timing, same season, same cast', async ({ page }) => {
  const swap: Record<string, unknown> = {};
  await serveCatalog(page, {}, swap);
  await quickLife(page, 'gb-london', '2026-11-01'); // the save's world begins from the fixture's records
  await expect.poll(async () => (await readSavedState(page)).industry?.series['tv:900201']?.p?.o, { timeout: 15_000 }).toBe('streaming');
  const frozen = (await readSavedState(page)).industry.series['tv:900201'].p;
  expect(frozen).toMatchObject({ v: 1, o: 'streaming', mini: false, pilot: false, aired: 1, m: 1, reg: [800001, 800002] });
  expect(frozen.model).toMatchObject({ eps: 8, d0: '2026-04-01' });

  // The catalog is refreshed, and the game opened again.
  Object.assign(swap, refreshedWorld());
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Settings');
  const world = page.getByRole('group', { name: "Your Story's World" });
  await expect(world).toContainText('The installed films and series were gathered later, on January 20, 2027.');
  await expect(world).toContainText("You can take them for 1 series your story hasn't decided anything for yet, and add 1 series it doesn't follow yet.");
  await world.getByRole('button', { name: 'See What Would Change' }).click();
  const list = world.getByRole('list', { name: 'What Would Change' });
  await expect(list.locator('li', { hasText: 'Coastline (Fixture)' })).toContainText('It is now counted as on a broadcast network, not a streaming service, which changes when its future is decided.');
  await expect(list.locator('li', { hasText: 'Coastline (Fixture)' })).toContainText('A new season would have 10 episodes, not 8.');
  await expect(list.locator('li', { hasText: 'Coastline (Fixture)' })).toContainText('Its returning cast is different.');
  await expect(list.locator('li', { hasText: 'Northern Line (Fixture)' })).toContainText('New to your story');
  // Looking changed nothing; neither does declining.
  await world.getByRole('button', { name: 'Keep My World As It Is' }).click();
  expect((await readSavedState(page)).industry.series['tv:900201'].p).toEqual(frozen);

  // The save's world goes on from what it began with.
  await nav(page, 'Home');
  await advance(page, 'month');
  await advance(page, 'week');
  await advance(page, 'week');
  const saved = await readSavedState(page);
  expect(saved.industry.series['tv:900201'].outcomes).toEqual([expect.objectContaining({ kind: 'dated', n: 2 })]);
  expect(saved.industry.series['tv:900201'].seasons[0]).toMatchObject({ n: 2, eps: 8, offs: [0, 7, 14, 28, 35, 42, 49, 49] });
  expect(saved.industry.series['tv:900301']).toBeUndefined();
  // Having made its own season, the save no longer keeps its copy of the recorded ones.
  expect(saved.industry.series['tv:900201'].p.model).toBeUndefined();
  await nav(page, 'Companies');
  await page.getByLabel('Title Or Person').fill('Coastline');
  await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).click();
  const story = card(page, 'In Your Story');
  await expect(story.locator('li').first()).toContainText('Given A Date: Season 2');
  await expect(story).toContainText('8 episodes, weekly with breaks, from');
  // The cast is the one the save froze: Ada Quill returns; the refreshed record's newcomer isn't cast.
  await expect(story).toContainText('Returning: Ada Quill (Juno Marsh).');
  await expect(story).not.toContainText('Someone New');
});

test('newer records are taken only when asked: a copy of the game is kept first, and only the undecided series changes', async ({ page }) => {
  const swap: Record<string, unknown> = {};
  await serveCatalog(page, {}, swap);
  await quickLife(page, 'gb-london', '2026-11-01');
  await expect.poll(async () => (await readSavedState(page)).industry?.series['tv:900201']?.p?.o, { timeout: 15_000 }).toBe('streaming');
  const before = (await readSavedState(page)).industry;
  Object.assign(swap, refreshedWorld());
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Settings');
  const world = page.getByRole('group', { name: "Your Story's World" });
  await world.getByRole('button', { name: 'See What Would Change' }).click();
  await expect(world).toContainText('Your game is saved and a copy kept first. Nothing already decided, no film already released and no date before today changes.');
  await world.getByRole('button', { name: 'Take The Newer Records' }).click();
  await expect(world.getByRole('status')).toContainText('Done. A copy of your game from before the change is in Saved Games, under Recovery Copies.');
  await expect(world.getByRole('button', { name: 'See What Would Change' })).toHaveCount(0);

  const after = (await readSavedState(page)).industry;
  expect(after.series['tv:900201'].p).toMatchObject({ o: 'broadcast', reg: [800001, 800009] });
  expect(after.series['tv:900201'].p.model).toMatchObject({ eps: 10 });
  expect(after.series['tv:900301'].p).toMatchObject({ o: 'cable' });
  // The world's start, the records' end and the studios' pace are the save's own, unchanged.
  expect([after.horizon, after.builtAt, after.studios]).toEqual([before.horizon, before.builtAt, before.studios]);
  expect(after.refreshes).toEqual([expect.objectContaining({ builtAt: REFRESHED_AT, series: 1, added: 1 })]);
  // The copy from before is kept where the player can export it.
  await nav(page, 'Saved Games');
  await expect(page.getByText('Copy from before newer records were taken')).toBeVisible();

  // And the series goes on from the newer records: ten episodes, with the newcomer in its cast.
  await nav(page, 'Home');
  await advance(page, 'month');
  await advance(page, 'week');
  await advance(page, 'week');
  const later = (await readSavedState(page)).industry;
  expect(later.series['tv:900201'].seasons[0]).toMatchObject({ n: 2, eps: 10 });
  await nav(page, 'Companies');
  await page.getByLabel('Title Or Person').fill('Coastline');
  await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).click();
  await expect(card(page, 'In Your Story')).toContainText('Someone New (Fixture)');
});
