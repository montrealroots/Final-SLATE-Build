// A smoke test of the real catalog, built from TMDB on this machine (docs/CATALOG.md). It runs only where that catalog is
// installed (.screen-catalog/, git-ignored), never in CI, and checks the journeys through real records: Pixar to Toy
// Story to one of its cast to another of their credits; Lucasfilm Animation to a series, a season, an episode and its
// credits. The save is dated January 5, 2026.
import { existsSync } from 'node:fs';
import { expect, test, type Page } from './test';
import { nav, quickLife } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });

test.beforeEach(async ({ page }, info) => {
  test.skip(!existsSync('.screen-catalog/index.json'), 'The real catalog is installed only where it was gathered from TMDB.');
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  const tmdb: string[] = [];
  await page.route(/themoviedb\.org|tmdb\.org/, (r) => { tmdb.push(r.request().url()); return r.abort(); });
  await quickLife(page, 'gb-london', '2026-01-05');
  test.info().annotations.push({ type: 'tmdb-requests', description: String(tmdb.length) });
});

test('live: Pixar, Toy Story, a cast member, another of their credits', async ({ page }, info) => {
  test.setTimeout(120_000);
  await nav(page, 'Companies');
  await expect(card(page, 'The Catalog')).toContainText(/\d[\d,]* films/);
  await page.getByRole('button', { name: 'Pixar', exact: true }).click();
  const titles = card(page, 'Films And Series');
  await titles.getByLabel('Search Titles').fill('Toy Story');
  await titles.getByRole('button', { name: 'Toy Story', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Toy Story', level: 1 })).toBeVisible();
  await expect(page.getByText('Released November 22, 1995')).toBeVisible();
  await expect(card(page, 'Credited Companies').locator('li', { hasText: 'Pixar' })).toContainText('Released before the acquisition (May 5, 2006)');
  await expect(card(page, 'Figures')).toContainText(/TMDB Rating\s*\d\.\d out of 10, from [\d,]+ votes/);
  await card(page, 'Cast').getByRole('button', { name: 'Tom Hanks' }).click();
  await expect(page.getByRole('heading', { name: 'Tom Hanks', level: 1 })).toBeVisible();
  const credits = card(page, 'Credits In The Catalog');
  await credits.getByRole('button', { name: 'Toy Story 2', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Toy Story 2', level: 1 })).toBeVisible();
  await page.screenshot({ path: `test-results/catalog-live-${info.project.name}-film.png`, fullPage: true });
});

test('live: Lucasfilm Animation, a series, a season, an episode and its credits', async ({ page }, info) => {
  test.setTimeout(120_000);
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Lucasfilm Animation', exact: true }).click();
  const titles = card(page, 'Films And Series');
  await titles.getByLabel('Show', { exact: true }).selectOption({ label: 'Series' });
  await titles.getByLabel('Search Titles').fill('Clone Wars');
  await titles.getByRole('button', { name: 'Star Wars: The Clone Wars', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Star Wars: The Clone Wars', level: 1 })).toBeVisible();
  await card(page, 'Seasons').getByRole('button', { name: 'Season 1', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Season 1', level: 1 })).toBeVisible();
  await card(page, 'Episodes').getByRole('button').first().click();
  await expect(card(page, 'Episode Crew')).toBeVisible();
  await expect(card(page, 'Episode Crew').locator('li').first()).toBeVisible();
  await page.screenshot({ path: `test-results/catalog-live-${info.project.name}-episode.png`, fullPage: true });
});
