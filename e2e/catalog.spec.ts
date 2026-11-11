// The screen catalog in the browser, on a made-up catalog (catalog-fixture.ts) so the run never depends on TMDB: company to
// film to a cast member to another credit; company to series, season, episode and its credits; leadership at the save's
// date; loading failures; the catalog missing; and the save untouched. The save starts January 5, 2026.
import { expect, expectErrors, test, type Page } from './test';
import { serveCatalog } from './catalog-fixture';
import { nav, pressSaveAndExit, quickLife, readSavedState } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const crumb = (page: Page, label: string) => page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: label, exact: true });
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const shot = (page: Page, project: string, name: string) => page.screenshot({ path: `test-results/catalog-${project}-${name}.png`, fullPage: true });

test.beforeEach(async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  // Served before the game starts: the app loads the world file as soon as a game is open.
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-01-05');
});

test('company to film to cast member to another credit, and back', async ({ page }, info) => {
  const { tmdbRequests } = await serveCatalog(page);
  await nav(page, 'Companies');
  await expect(page.getByRole('heading', { name: 'Companies', level: 1 })).toBeVisible();
  await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series with 1 season and 2 episodes, and 6 people');
  await expect(page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.')).toBeVisible();
  await expect(page.getByRole('img', { name: 'TMDB' })).toBeVisible();

  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  const titles = card(page, 'Films And Series');
  await expect(titles).toContainText('3 titles of 4.'); // Night Ferry, due 2030, isn't released at the save's date
  await expect(titles).not.toContainText('Night Ferry');
  await titles.getByRole('checkbox', { name: /^Include titles not released by January 5, 2026/ }).check();
  await expect(titles.locator('li', { hasText: 'Night Ferry (Fixture)' })).toContainText('due July 1, 2030');
  await titles.getByLabel('Show', { exact: true }).selectOption({ label: 'Films' });
  await expect(titles).toContainText('3 titles of 4.');
  await titles.getByLabel('Search Titles').fill('lantern');
  await expect(titles).toContainText('1 title of 4.');
  await shot(page, info.project.name, '01-company');
  await titles.getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();

  await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible();
  await expect(page.getByText('Released June 14, 2019')).toBeVisible();
  const figures = card(page, 'Figures');
  await expect(figures).toContainText('Budget');
  await expect(figures).toContainText('Not recorded'); // unknown, never $0
  await expect(figures).toContainText('$41,000,000');
  await expect(figures).toContainText('6.8 out of 10, from 1,234 votes');
  await expect(figures).toContainText("They aren't IMDb ratings, and nothing in your game is based on them.");
  const companies = card(page, 'Credited Companies');
  await expect(companies.getByRole('button', { name: 'Walt Disney Pictures' })).toBeVisible();
  await companies.getByRole('button', { name: 'Harbourside Films (Fixture)' }).click();
  await expect(page.getByRole('heading', { name: "This Company Isn't One The Catalog Follows" })).toBeVisible();
  await page.getByRole('button', { name: 'Go Back' }).click();
  await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible();
  const castCard = card(page, 'Cast');
  await expect(castCard.locator('li').first()).toContainText('Ada Quill');
  await expect(castCard.locator('li').first()).toContainText('Mara Venn');
  await expect(card(page, 'Crew')).toContainText('Directing');
  await shot(page, info.project.name, '02-film');
  await castCard.getByRole('button', { name: 'Ada Quill' }).click();

  await expect(page.getByRole('heading', { name: 'Ada Quill', level: 1 })).toBeVisible();
  const about = card(page, 'About');
  await expect(about).toContainText('April 2, 1980, Bristol, England (Fixture)');
  await expect(about).not.toContainText('Died'); // a death after the save's date hasn't happened
  await expect(about).toContainText('45 (on January 5, 2026, your story\'s date)'); // born April 2, 1980: 46 only from April 2
  const credits = card(page, 'Credits In The Catalog');
  await expect(credits).toContainText('A credit is a record of past work, not who they work for or whether they could work for you.');
  await expect(credits.locator('li', { hasText: 'Tidewater Station (Fixture)' })).toContainText('(2 episodes)');
  await shot(page, info.project.name, '03-person');
  await credits.getByRole('button', { name: 'Harbour Lights (Fixture)' }).click();
  await expect(page.getByRole('heading', { name: 'Harbour Lights (Fixture)', level: 1 })).toBeVisible();
  await expect(card(page, 'Figures')).toContainText('No votes recorded');

  await crumb(page, 'Walt Disney Pictures').click();
  await expect(page.getByRole('heading', { name: 'Walt Disney Pictures', level: 1 })).toBeVisible();
  await crumb(page, 'Companies').click();
  await expect(page.getByRole('heading', { name: 'Companies', level: 1 })).toBeVisible();
  expect(await noSidewaysScroll(page)).toBe(true);
  expect(tmdbRequests).toEqual([]);
});

test('company to series, season, episode and its credits; an announced film says it is not out yet', async ({ page }, info) => {
  await serveCatalog(page);
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  const titles = card(page, 'Films And Series');
  await titles.getByLabel('Show', { exact: true }).selectOption({ label: 'Series' });
  await titles.getByRole('button', { name: 'Tidewater Station (Fixture)' }).click();
  await expect(page.getByRole('heading', { name: 'Tidewater Station (Fixture)', level: 1 })).toBeVisible();
  await expect(page.getByText('First aired September 1, 2021')).toBeVisible();
  await expect(card(page, 'About')).toContainText("ABC (where it aired, which isn't who made it)");
  await expect(card(page, 'Series Cast')).toContainText("That isn't a claim they were in every episode");
  await expect(card(page, 'Series Cast').locator('li', { hasText: 'Ada Quill' })).toContainText('2 episodes');
  await card(page, 'Seasons').getByRole('button', { name: 'Season 1' }).click();

  await expect(page.getByRole('heading', { name: 'Season 1', level: 1 })).toBeVisible();
  await expect(card(page, 'Episodes').locator('li').first()).toContainText('September 1, 2021');
  await card(page, 'Episodes').getByRole('button', { name: 'Pilot' }).click();

  await expect(page.getByRole('heading', { name: 'Pilot', level: 1 })).toBeVisible();
  await expect(page.getByText('Aired September 1, 2021')).toBeVisible();
  await expect(card(page, 'Episode Crew').locator('li', { hasText: 'Ben Rook' })).toContainText('Director');
  await expect(card(page, 'Guest Cast').locator('li', { hasText: 'Dee Guest' })).toContainText('The Visitor');
  await shot(page, info.project.name, '04-episode');
  await card(page, 'Guest Cast').getByRole('button', { name: 'Dee Guest' }).click();
  await expect(page.getByRole('heading', { name: 'Dee Guest', level: 1 })).toBeVisible();
  await expect(card(page, 'About')).toContainText("Only this person's credits were gathered");
  await expect(card(page, 'Credits In The Catalog').getByRole('heading', { name: 'Episodes' })).toBeVisible();
  await card(page, 'Credits In The Catalog').getByRole('button', { name: 'Tidewater Station (Fixture): Pilot' }).click();
  await expect(page.getByRole('heading', { name: 'Pilot', level: 1 })).toBeVisible();
  await crumb(page, 'Season 1').click();
  await crumb(page, 'Tidewater Station (Fixture)').click();
  await expect(page.getByRole('heading', { name: 'Tidewater Station (Fixture)', level: 1 })).toBeVisible();

  // An announced film, at a save dated before it: labelled as announced, its figures not shown.
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: 'Walt Disney Pictures' }).click();
  await card(page, 'Films And Series').getByRole('checkbox', { name: /^Include titles not released/ }).check();
  await card(page, 'Films And Series').getByRole('button', { name: 'Night Ferry (Fixture)' }).click();
  await expect(page.getByText('Not released by January 5, 2026: due July 1, 2030, as announced')).toBeVisible();
  await expect(card(page, 'Figures')).toContainText("Not shown: at this point in your story the title hasn't come out");
  await expect(card(page, 'Figures')).not.toContainText('9.9');
  expect(await noSidewaysScroll(page)).toBe(true);
});

test('a series\' network: its owners at the save\'s date, earlier ones, undated ones, and its series aired and announced', async ({ page }, info) => {
  await serveCatalog(page);
  await nav(page, 'Companies');
  await card(page, 'Where The Series Aired').getByRole('button', { name: 'Networks And Streaming Services' }).click();
  await expect(page.getByRole('heading', { name: 'Networks And Streaming Services', level: 1 })).toBeVisible();
  await expect(page.locator('li', { hasText: 'ABC' })).toContainText('2 series');
  await page.getByRole('button', { name: 'ABC', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'ABC', level: 1 })).toBeVisible();
  await expect(card(page, 'About')).toContainText('United States');
  await expect(card(page, 'About')).toContainText('October 12, 1943');
  // The save is dated January 5, 2026: the second owner owns it; the first is earlier; a later owner isn't known yet.
  const owners = card(page, 'Who Owns It');
  await expect(owners.locator('li').first()).toContainText('Second Owner (Fixture)');
  await expect(owners.locator('li').first()).toContainText('since December 31, 2025');
  await expect(owners).not.toContainText('2027'); // when the second owner's time ends is the story's future
  await expect(owners.getByRole('heading', { name: 'Earlier Owners' })).toBeVisible();
  await expect(owners).toContainText('First Owner (Fixture)');
  await expect(owners).not.toContainText('Later Owner (Fixture)');
  await expect(owners).toContainText('Wikidata also lists Undated Owner (Fixture) as an owner, with no dates, so when isn\'t known.');
  await expect(owners).toContainText("Wikidata's entry has the same website as TMDB gives");
  const series = card(page, 'Series In The Catalog');
  await expect(series.locator('li').first()).toContainText('Tidewater Station (Fixture)');
  await expect(series.getByRole('heading', { name: 'Announced' })).toBeVisible();
  await expect(series).toContainText('Far Shore (Fixture)');
  await shot(page, info.project.name, '06-network');
  await series.getByRole('button', { name: 'Tidewater Station (Fixture)' }).click();
  await expect(page.getByRole('heading', { name: 'Tidewater Station (Fixture)', level: 1 })).toBeVisible();
  // And back to the network from the series' About.
  await card(page, 'About').getByRole('button', { name: 'ABC' }).click();
  await expect(page.getByRole('heading', { name: 'ABC', level: 1 })).toBeVisible();
  expect(await noSidewaysScroll(page)).toBe(true);
});

test('leadership is shown at the save\'s date, kept apart from screen credits, with sources', async ({ page }) => {
  await serveCatalog(page);
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'The Walt Disney Company', exact: true }).click();
  const leaders = card(page, 'Leadership');
  await expect(leaders).toContainText('Positions, not screen credits.');
  await expect(leaders.locator('li', { hasText: 'Robert A. Iger' })).toContainText('Chief Executive Officer');
  await expect(leaders.locator('li', { hasText: 'Robert A. Iger' })).toContainText('Current');
  await expect(leaders.locator('li', { hasText: "Josh D'Amaro" })).toContainText('Chairman, Disney Experiences');
  await expect(leaders).not.toContainText('Senior Advisor'); // announced February 3, 2026, after the save's date
  await expect(leaders).not.toContainText('Debra OConnell');
  await leaders.getByRole('button', { name: 'Robert A. Iger' }).click();
  await expect(page.getByRole('heading', { name: 'Robert A. Iger', level: 1 })).toBeVisible();
  const positions = card(page, 'Positions');
  await expect(positions).toContainText('These are executive positions, kept apart from screen credits.');
  await expect(positions.getByRole('link', { name: "Josh D'Amaro Named Next Chief Executive Officer of The Walt Disney Company" })).toHaveAttribute('href', 'https://thewaltdisneycompany.com/press-releases/josh-damaro-named-next-chief-executive-officer-of-the-walt-disney-company/');
  await expect(positions).toContainText('A position here says nothing about whether they would work with you');
  // Lucasfilm on January 5, 2026: Kennedy still president, the transition not yet announced.
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Lucasfilm', exact: true }).click();
  await expect(card(page, 'Leadership').locator('li')).toHaveCount(1);
  await expect(card(page, 'Leadership')).toContainText('Kathleen Kennedy: President');
  // A company whose leadership couldn't be confirmed says so.
  await nav(page, 'Companies');
  await page.getByRole('button', { name: '20th Century Studios', exact: true }).click();
  await expect(card(page, 'Leadership')).toContainText('no leadership is listed');
  await expect(card(page, 'About')).toContainText('Part Of');
});

test('a failed load says so and can be retried; a missing catalog leaves companies and leadership', async ({ page }) => {
  expectErrors('A server error and a missing catalog are served on purpose.');
  await serveCatalog(page, { 'titles/movie-900001.json': 500 });
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await expect(page.getByRole('heading', { name: "This title couldn't be loaded" })).toBeVisible();
  await expect(page.getByText('The catalog answered 500. Your game is unaffected.')).toBeVisible();
  await page.unroute('**/screen-catalog/**');
  await serveCatalog(page);
  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible();

  await page.unroute('**/screen-catalog/**');
  await page.route('**/screen-catalog/**', (r) => r.fulfill({ status: 404, body: '' }));
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Companies');
  await expect(page.getByRole('heading', { name: "The Film Catalog Isn't Installed" })).toBeVisible();
  await page.getByRole('button', { name: 'Pixar', exact: true }).click();
  await expect(card(page, 'Leadership')).toContainText('Jim Morris');
  await expect(page.getByRole('heading', { name: "This company's titles isn't in this copy of the catalog" })).toBeVisible();
});

test('browsing the catalog leaves the save as it was, and it reloads on the same screen', async ({ page }) => {
  await serveCatalog(page);
  const before = await readSavedState(page);
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible();
  await pressSaveAndExit(page);
  const after = await readSavedState(page);
  expect(JSON.stringify(after)).not.toContain('Lantern');
  expect(after.projects).toEqual(before.projects);
  expect(after.seed).toBe(before.seed);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
});

test('the industry on Home and the calendar: recorded releases, premieres and episodes at the save\'s date', async ({ page }, info) => {
  const { tmdbRequests } = await serveCatalog(page);
  await nav(page, 'Home');
  const industry = card(page, 'In The Industry');
  // December 30 is in the last two weeks; the January 5 episode is the calendar's, not news; the ending is told in November.
  await expect(industry.getByRole('button', { name: 'Paper Lanterns (Fixture), from Walt Disney Pictures, came out.' })).toBeVisible();
  await expect(industry.getByRole('heading', { name: 'Coming Up' })).toBeVisible();
  await expect(industry).toContainText('The Season 1 finale of Tidewater Station (Fixture), "Low Tide", is due to air on ABC.');
  await expect(industry).toContainText('Harbour Lights (Fixture), from Walt Disney Pictures, is due to come out.');
  await expect(industry).not.toContainText('Pilot');
  await expect(industry).not.toContainText('cancelled');
  await expect(industry).toContainText('Dates still to come were the schedule when the records were taken, on November 10, 2026, and may change.');
  await shot(page, info.project.name, '05-home-industry');
  await industry.getByRole('button', { name: 'Paper Lanterns (Fixture), from Walt Disney Pictures, came out.' }).click();
  await expect(page.getByRole('heading', { name: 'Paper Lanterns (Fixture)', level: 1 })).toBeVisible();

  await nav(page, 'Calendar');
  await expect(page.getByRole('checkbox', { name: 'Film And Television' })).toBeChecked();
  await page.getByRole('button', { name: /^Monday, January 12, 2026/ }).click();
  const day = page.locator('.card', { hasText: 'S1 E2 (Finale)' }).last();
  await expect(day).toContainText('Tidewater Station (Fixture): S1 E2 (Finale)');
  await shot(page, info.project.name, '06-calendar-industry');
  await page.getByRole('checkbox', { name: 'Film And Television' }).uncheck();
  await expect(page.getByText('Tidewater Station (Fixture): S1 E2 (Finale)')).toHaveCount(0);
  await page.getByRole('checkbox', { name: 'Film And Television' }).check();
  await day.getByRole('button', { name: 'View Details' }).first().click();
  await expect(page.getByRole('heading', { name: 'Low Tide', level: 1 })).toBeVisible();
  expect(await noSidewaysScroll(page)).toBe(true);
  expect(tmdbRequests).toEqual([]);
});

