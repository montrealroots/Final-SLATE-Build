// Real films' box office as Wikidata recorded it (src/engine/box-office-recorded.ts, from November 22, 2026): on a film's
// page in Companies, shown only from the day each figure was recorded, and in Box Office Records with your films placed
// among the real ones. The catalog is the made-up fixture; one of its films is given Cars' TMDB ID (920), a labelled
// fixture, so the page reads the real figures recorded for Cars. Those figures are real and shipped with the game.
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { nav, onlyOn, quickLife } from './helpers';
import { CATALOG_FIXTURE, serveCatalog } from './catalog-fixture';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const asCars = { 'titles/movie-900001.json': { ...(CATALOG_FIXTURE['titles/movie-900001.json'] as object), ref: 'movie:920' } };

async function openFilm(page: Page) {
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
}

test('a film\'s page shows its takings as Wikidata recorded them, only from the day each was recorded', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop', 'phone', 'iphone-18-pro-max']), 'Desktop, phone width and the iPhone.');
  await serveCatalog(page, {}, asCars);
  await quickLife(page, 'gb-london', '2026-01-05');
  await openFilm(page);
  const panel = card(page, 'Box Office As Recorded');
  await expect(panel).toContainText('Worldwide');
  await expect(panel).toContainText('$461,991,867 (as Box Office Mojo reported it, recorded on March 7, 2019)');
  await expect(panel).toContainText('United States');
  await expect(panel).toContainText('never converted');
  await page.screenshot({ path: `test-results/recorded-film-${info.project.name}.png`, fullPage: true });
});

test('a figure recorded after the save\'s date isn\'t shown yet', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop']), 'Once, at desktop width.');
  // The same fixture film, given The Man in the Iron Mask's TMDB ID (9313): both of its figures were first recorded on
  // May 21, 2026, after a story that starts on January 5, 2026.
  await serveCatalog(page, {}, { 'titles/movie-900001.json': { ...(CATALOG_FIXTURE['titles/movie-900001.json'] as object), ref: 'movie:9313' } });
  await quickLife(page, 'gb-london', '2026-01-05');
  await openFilm(page);
  const panel = card(page, 'Box Office As Recorded');
  await expect(panel).toContainText('Nothing had been recorded by this point in your story.');
  await expect(panel).toContainText("2 more figures were recorded later than your story's date, so they aren't shown yet.");
  await expect(panel).not.toContainText('$182,968,902');
});

test('Box Office Records lists real films\' worldwide takings as recorded by the save\'s date', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop', 'phone', 'iphone-18-pro-max']), 'Desktop, phone width and the iPhone.');
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Profile');
  const book = card(page, 'Box Office Records');
  await expect(book.getByRole('heading', { name: 'Among Real Films' })).toBeVisible();
  const real = book.getByRole('list', { name: 'Real Films By Worldwide Takings' });
  await expect(real.locator('li')).toHaveCount(10);
  await expect(real.locator('li').first()).toContainText('1st. Avatar (2009)');
  await expect(real.locator('li').first()).toContainText('$2,847,379,794');
  await expect(book).toContainText("These are real; yours above are the game's simulation");
  await page.screenshot({ path: `test-results/recorded-book-${info.project.name}.png`, fullPage: true });
});
