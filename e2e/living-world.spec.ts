// The living world after the records end (docs/WORLD.md, Phase 2), on a made-up catalog (catalog-fixture.ts): the save's
// world decides a series' future, kept in the save, shown as simulated with its returning regulars.
import { expect, test, type Page } from './test';
import { serveCatalog } from './catalog-fixture';
import { advance, nav, pressSaveAndExit, quickLife, readSavedState } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const shot = (page: Page, project: string, name: string) => page.screenshot({ path: `test-results/living-world-${project}-${name}.png`, fullPage: true });

test.beforeEach(async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-11-01'); // a save that starts before the records end on November 10
});

test('after the records end, the save\'s world decides: a series is given its next season, simulated, with its regulars returning', async ({ page }, info) => {
  await advance(page, 'month');
  await advance(page, 'week');
  await advance(page, 'week');
  const saved = await readSavedState(page);
  expect(saved.industry.horizon).toBe('2026-11-10');
  expect(saved.industry.series['tv:900201'].outcomes).toEqual([expect.objectContaining({ kind: 'dated', n: 2 })]);
  await nav(page, 'Companies');
  await page.getByLabel('Title Or Person').fill('Coastline');
  await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).click();
  const story = card(page, 'In Your Story');
  await expect(story).toContainText('Simulated for this save after the records end on November 10, 2026.');
  await expect(story.locator('li').first()).toContainText('Given A Date: Season 2');
  await expect(story.locator('li').first()).toContainText('Simulated');
  await expect(story).toContainText('8 episodes, weekly, from');
  await expect(story).toContainText('Returning: Ada Quill (Juno Marsh).');
  await shot(page, info.project.name, '07-in-your-story');
  // Reloaded, the decision is still there: it is kept in the save.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Companies');
  await page.getByLabel('Title Or Person').fill('Coastline');
  await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).click();
  await expect(card(page, 'In Your Story').locator('li').first()).toContainText('Given A Date: Season 2');
});
