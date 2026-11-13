// The owner's v5 brief, 3, through the screens (from November 13, 2026): a real recording is found and licensed into a
// project, with its record shown; a real film composer is found and considered for the composer's job, and is then on
// the Crew page under the one identity the save keeps for them. The catalog is Wikidata's (CC0); nothing is written into
// the save.
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, creditsTable, nav, newProject, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

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

test('a real composer: considered from the music catalog, offered the job, hired, scores the film, and is credited', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'A whole production, once, at desktop width.');
  test.setTimeout(900_000);
  await quickLife(page, 'gb-london', '2026-03-02');
  await pinSeed(page, 7);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);
  // A score: the brief proposed from the project and taken.
  await section(page, 'Music');
  const brief = card(page, 'Music Brief');
  await brief.getByRole('button', { name: 'Propose A Brief' }).click();
  // The player's choice, on the brief: his themes stand as he writes them, so the score needn't wait on a review.
  await brief.getByLabel("Let The Composer's Themes Stand Without My Review").check();
  await brief.getByRole('button', { name: 'Take This Brief' }).click();
  // The composer: found in the music catalog and offered the job like anyone else, at the rate the game asks for them.
  const real = card(page, 'Real Music');
  await real.getByLabel('Find A Composer, Artist Or Recording').fill('hans zimmer');
  await real.getByLabel('Their Role').selectOption({ label: 'Composer' });
  await real.getByRole('list', { name: 'People And Groups' }).getByRole('listitem', { name: 'Hans Zimmer' }).getByRole('button', { name: 'Consider For Composer' }).click();
  await section(page, 'Crew');
  await page.getByRole('listitem').filter({ has: page.getByText('Composer', { exact: true }) }).first().getByRole('button', { name: 'Find Candidates' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('listitem').filter({ hasText: 'Hans Zimmer' }).getByRole('button', { name: 'Make Offer' }).click();
  // The answer is the game's (simulated): wait for it, and the rest of the crew.
  for (let i = 0; i < 6 && !((await readSavedState(page))?.projects?.[0]?.hires ?? []).some((h: { personId: string; status: string }) => h.personId === 'tp_947' && h.status === 'accepted'); i++) {
    await advance(page, 'next-day');
    for (const b of await page.getByRole('button', { name: 'Accept Counteroffer' }).all()) await b.click();
  }
  const hired = ((await readSavedState(page)).projects[0].hires as { personId: string; status: string }[]).find((h) => h.personId === 'tp_947');
  test.skip(hired?.status !== 'accepted', `In the pinned world he answered ${hired?.status ?? 'nothing'}; the engine tests cover a hire.`);
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 30 });
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);
  // His score is the film's: the score's work was his, and the credits name him as its composer.
  const p = (await readSavedState(page)).projects[0];
  expect(p.tasks.filter((t: { kind: string }) => t.kind === 'post:music').every((t: { status: string }) => t.status === 'done')).toBe(true);
  expect(await creditsTable(page)).toMatch(/Composer[\s\S]*Hans Zimmer|Hans Zimmer[\s\S]*Composer/);
});
