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
  await expect(story).toContainText('8 episodes, weekly with breaks, from');
  await expect(story).toContainText('Returning: Ada Quill (Juno Marsh).');
  await expect(story).toContainText('Not returning: Wren Calder, who died June 1, 2026.');
  await shot(page, info.project.name, '07-in-your-story');
  // The simulated season has its own page: its dates, nights and breaks, who returns, and the seasons around it.
  await story.getByRole('button', { name: 'Season 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Season 2', level: 1 })).toBeVisible();
  await expect(page.locator('.callout')).toContainText("This season was made by this save's world after the records end on November 10, 2026.");
  const about = card(page, 'About This Season');
  await expect(about).toContainText('Given A Date');
  await expect(about).toContainText('Weekly, on Wednesdays, with 1 break');
  await expect(about).toContainText('Season 1 as TMDB recorded it: 8 episodes, April 1, 2026 to May 20, 2026.');
  await expect(about).toContainText('Disney+ usually decides one to four months after the finale.');
  const episodes = card(page, 'Episodes');
  await expect(episodes.locator('li')).toHaveCount(8);
  await expect(episodes.locator('li').nth(0)).toContainText('Season premiere');
  await expect(episodes.locator('li').nth(3)).toContainText('Back after 2 weeks');
  await expect(episodes.locator('li').nth(7)).toContainText('Same night as Episode 7; Season finale');
  await expect(card(page, 'Breaks')).toContainText('After Episode 3, no new episode until Episode 4');
  const cast = card(page, 'Returning Cast');
  await expect(cast.locator('li').first()).toContainText(/Ada Quill\s*Juno Marsh\s*\d\d at the premiere/);
  await expect(cast).toContainText('Died June 1, 2026, before the premiere');
  await expect(card(page, 'Other Seasons')).toContainText('As TMDB recorded it');
  await shot(page, info.project.name, '08-simulated-season');
  // The series' own list of seasons carries it, marked as simulated, after the recorded one.
  await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).first().click();
  await expect(card(page, 'Seasons').locator('li').nth(1)).toContainText(/Season 2\s*Simulated\s*8 episodes/);
  // Reloaded, the decision is still there: it is kept in the save.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Companies');
  await page.getByLabel('Title Or Person').fill('Coastline');
  await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).click();
  await expect(card(page, 'In Your Story').locator('li').first()).toContainText('Given A Date: Season 2');
});

test('after the records end, a studio goes on releasing films at its recorded pace: invented, simulated, each with its own page', async ({ page }, info) => {
  await advance(page, 'month');
  await advance(page, 'month');
  const saved = await readSavedState(page);
  expect(saved.industry.studios).toEqual([expect.objectContaining({ c: 'company:walt-disney-pictures', n: 8 })]);
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  const after = card(page, 'After The Records');
  await expect(after).toContainText('Simulated: the titles and people are invented; the pace, genres and months are the studio\'s recorded ones.');
  const first = after.locator('li').first();
  await expect(first).toContainText(/Simulated\s*(Released|Due) /);
  const title = (await first.getByRole('button').innerText()).trim();
  await first.getByRole('button').click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  const about = card(page, 'About');
  await expect(about).toContainText('Made by your story\'s world after the records end.');
  await expect(about).toContainText('Walt Disney Pictures');
  await expect(about).toContainText(/Genres(Family|Comedy|Fantasy)/);
  await shot(page, info.project.name, '09-simulated-film');
  // The same film after a reload: it follows from the save, not from chance.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await expect(card(page, 'After The Records').locator('li').first()).toContainText(title);
});
