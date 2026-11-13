// The owner's v5 brief, 3, through the screens (from November 13, 2026): a real recording is found and licensed into a
// project, with its record shown; a real film composer is found and considered for the composer's job, and is then on
// the Crew page under the one identity the save keeps for them. The catalog is Wikidata's (CC0); nothing is written into
// the save.
import { expect, test, type Page } from './test';
import { addScene, nav, newProject, quickLife, readSavedState, saveAndApprove, section } from './helpers';

test.use({ actionTimeout: 20_000 });
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });

test('real music: a recording licensed with its record, a composer considered under one identity', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
  await quickLife(page, 'gb-london', '2026-03-02');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Music');
  const real = card(page, 'Real Music');
  await expect(real).toContainText('as Wikidata records them (CC0');
  await expect(real).toContainText('Nobody is contacted and nothing is bought.');

  // A recording, with its record, licensed into the project.
  await real.getByLabel('Find A Composer, Artist Or Recording').fill('queen');
  const row = real.getByRole('list', { name: 'Recordings' }).getByRole('listitem', { name: 'The Show Must Go On' });
  await expect(row).toContainText('by Queen');
  await expect(row).toContainText('written by');
  await row.getByRole('button', { name: 'License This Recording' }).click();
  await expect(row.getByRole('button', { name: 'In This Project' })).toBeDisabled();
  const licence = page.getByRole('article', { name: 'Licence For The Show Must Go On' });
  await expect(licence).toContainText('A real recording by Queen');
  await expect(licence).toContainText('as Wikidata recorded it on');
  await expect.poll(async () => (await readSavedState(page))?.projects?.[0]?.songs?.[0]?.recording?.performers ?? null, { timeout: 30_000 }).toEqual(['Queen']);

  // A film composer, considered for the job: their recorded scores shown, and the save's one identity for them.
  await real.getByLabel('Find A Composer, Artist Or Recording').fill('hans zimmer');
  await real.getByLabel('Their Role').selectOption({ label: 'Composer' });
  const zimmer = real.getByRole('list', { name: 'People And Groups' }).getByRole('listitem', { name: 'Hans Zimmer' });
  await expect(zimmer).toContainText(/\d+ film scores recorded/);
  await zimmer.getByRole('button', { name: 'Consider For Composer' }).click();
  await expect(zimmer.getByRole('button', { name: 'Considered For Composer' })).toBeDisabled();
  await expect.poll(async () => (await readSavedState(page))?.real?.tp_947?.rec?.name ?? null, { timeout: 30_000 }).toBe('Hans Zimmer');
  await section(page, 'Crew');
  const composer = page.getByRole('listitem').filter({ has: page.getByText('Composer', { exact: true }) }).first();
  await composer.getByRole('button', { name: 'Find Candidates' }).click();
  await expect(page.getByText('Hans Zimmer').first()).toBeVisible();
  await expect(page.getByText(/\d+ recorded credits in the music catalog \(Wikidata\)\./).first()).toBeVisible();
  await expect(page.getByText('From The Music Catalog').first()).toBeVisible();
  await page.screenshot({ path: `test-results/music-catalog-${info.project.name}.png`, fullPage: true });
});
