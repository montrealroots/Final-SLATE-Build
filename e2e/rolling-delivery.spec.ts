// A series delivered an episode at a time, through the screens (November 10, 2026, after #59):
// - episode 1 is cut, locked and delivered on its own while episode 2 is still being shot;
// - a streaming release puts episode 1 out on its day;
// - episode 2's day comes before it is delivered, so it is held back, and the game says so;
// - episode 2 is delivered, given a new day and comes out;
// - the whole season is delivered, as before.
// Nothing is written into the save. The world seed is pinned (helpers.ts pinSeed), chosen once.
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { addScene, advance, approveDesigns, castRoles, nav, newProject, pinSeed, quickLife, readSavedState, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/rolling-${test.info().project.name}-${name}.png`, fullPage: true });
const open = async (page: Page, tab: string) => { await nav(page, 'Projects'); await page.getByRole('button', { name: 'Grey Water' }).click(); await section(page, tab); };
const row = (page: Page, n: number) => page.getByRole('region', { name: 'Delivering Episode By Episode' }).getByRole('listitem', { name: `Episode ${n}` });
const day = async (page: Page) => new Date((await readSavedState(page)).now).toISOString().slice(0, 10);
const plus = (k: string, n: number) => { const d = new Date(`${k}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

/** Days pass with the routine of a producer (staff, cast, approve designs) until an episode's button is enabled. */
async function workUntil(page: Page, n: number, button: string, weeks = 30): Promise<void> {
  for (let i = 0; i < weeks; i++) {
    await open(page, 'Edit');
    const b = row(page, n).getByRole('button', { name: `${button} ${n}` });
    if (await b.isVisible() && await b.isEnabled()) return;
    // A cut pass on the episode, as soon as its assembly is done.
    const cut = row(page, n).getByRole('button', { name: `Cut Pass On Episode ${n}` });
    if (await cut.isVisible() && await cut.isEnabled()) await cut.click();
    await advance(page, 'next-day');
    await staffEveryDepartment(page);
    await castRoles(page);
    await approveDesigns(page);
  }
  throw new Error(`${button} ${n} never became possible: ${await row(page, n).innerText()}`);
}

test('a series delivered an episode at a time: one out while the next is still being made, one held back and rescheduled, then the season', async ({ page }) => {
  test.setTimeout(1_200_000);
  await quickLife(page, 'gb-london', '2026-03-02');
  await pinSeed(page, 17);
  await newProject(page, { title: 'Grey Water', format: 'Series', episodes: '2', runtime: '40' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Maya');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Harbour', chars: ['Maya'], minutes: '6', episodeButton: 'Add Scene To Episode 1' });
  for (const [i, place] of [[1, 'Lighthouse'], [2, 'Quarry'], [3, 'Chapel']] as const) await addScene(page, { index: i, place, chars: ['Maya'], minutes: '10', episodeButton: 'Add Scene To Episode 2' });
  await saveAndApprove(page);
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // Episode 1 alone: cut, locked, delivered, while episode 2 is still in production.
  await workUntil(page, 1, 'Lock Episode');
  await row(page, 1).getByRole('button', { name: 'Lock Episode 1' }).click();
  await expect(row(page, 1)).toContainText('Picture Locked');
  await workUntil(page, 1, 'Deliver Episode');
  await expect(row(page, 2)).not.toContainText('Ready To Deliver');
  await row(page, 1).getByRole('button', { name: 'Deliver Episode 1' }).click();
  await expect(row(page, 1)).toContainText('Delivered');
  await expect(row(page, 1)).toContainText('Its script and picture are final.');
  await expect(row(page, 2)).toContainText(/Held back by: |Before it can be locked: /);
  await shot(page, '01-episode-one-delivered');
  // At phone width the card has no sideways scroll and each episode fits.
  const vw = page.viewportSize()!.width;
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  for (const n of [1, 2]) { const box = (await row(page, n).boundingBox())!; expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(vw); }

  // A streaming release, planned before the season is finished: episode 1 tomorrow, episode 2 the day after.
  await open(page, 'Release');
  await expect(page.getByText('Credits are settled when the whole season is delivered, on the Edit tab.')).toBeVisible();
  const today = await day(page);
  await page.getByLabel('Route').selectOption({ label: 'Streaming' });
  await page.getByLabel('Release Date').fill(plus(today, 1));
  await page.getByLabel('Territory Code').fill('GB');
  await page.getByLabel('Episode Schedule').selectOption({ label: 'Weekly' });
  await page.getByLabel('Episode 2', { exact: true }).fill(plus(today, 2));
  await expect(page.getByText(/Episodes not delivered by their day are held back/)).toBeVisible();
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await advance(page, 'next-day');
  await advance(page, 'next-day');
  await advance(page, 'next-day');
  await open(page, 'Release');
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  await history.getByText(/^Episode Dates: /).click();
  await expect(history).toContainText(/Episode 1: .*, out/);
  await expect(history).toContainText("Episode 2: ");
  await expect(history).toContainText("held back: it wasn't delivered in time. Choose a new day for it");
  const s1 = await readSavedState(page);
  expect(s1.log.some((l: { text: string }) => l.text === "Episode 2 of Grey Water isn't delivered, so it didn't come out today on streaming. Choose a new day on the Release tab.")).toBe(true);
  await shot(page, '02-episode-two-held');

  // Episode 2 finished and delivered; a new day; out on it.
  await workUntil(page, 2, 'Lock Episode', 40);
  await row(page, 2).getByRole('button', { name: 'Lock Episode 2' }).click();
  await workUntil(page, 2, 'Deliver Episode', 30);
  await row(page, 2).getByRole('button', { name: 'Deliver Episode 2' }).click();
  await open(page, 'Release');
  await history.getByText(/^Episode Dates: /).click();
  await history.getByRole('button', { name: 'Change Episode Dates' }).click();
  const newDay = plus(await day(page), 2);
  await page.getByLabel('New Date For Episode 2').fill(newDay);
  await page.getByRole('button', { name: 'Review The Change' }).click();
  const confirm = page.getByRole('dialog', { name: 'Change These Episode Dates?' });
  await expect(confirm).toContainText(/Episode 2 moves from .* to /);
  await confirm.getByRole('button', { name: 'Confirm The New Dates' }).click();
  for (let i = 0; i < 3; i++) await advance(page, 'next-day');
  await open(page, 'Release');
  await history.getByText(/^Episode Dates: /).click();
  await expect(history).toContainText(/Episode 2: .*, out/);

  // The whole season, delivered as before: credits are settled.
  for (let i = 0; i < 20; i++) {
    await open(page, 'Edit');
    const deliver = page.getByRole('button', { name: 'Deliver Project' });
    if (await deliver.isEnabled()) { await deliver.click(); break; }
    await advance(page, 'next-day');
    await staffEveryDepartment(page);
  }
  await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();
  await open(page, 'Release');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Credits' }) })).toContainText('Directed By');
  const s2 = await readSavedState(page);
  const p = s2.projects.find((x: { title: string }) => x.title === 'Grey Water');
  expect(Object.keys(p.episodeDeliveries)).toEqual(['1', '2']);
  expect(p.episodeDeliveries[1].at).toBeLessThan(p.episodeDeliveries[2].at);
});
