// Milestone E of the Creative Depth package (docs/creative-depth), J07, through visible controls only: a place in the
// script is filmed in a real place somewhere else, at a kind of site; the page says what that asks before it is chosen;
// the permits, the scouted sites, the forecast, the call sheet and the costs all follow the filmed place; rain there is
// answered with the interior day; the player travels there; the choice survives a reload; and the film is delivered with
// the unit's move paid once and its housing paid for each day away. The world seed is fixed (labelled fixture).
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, nav, newProject, pickPlace, readSavedState, runToDelivery, saveAndApprove, saveAndExit, section, seededLife, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
type Day = { id: string; date: string; locationLabel: string; status: string; interior: boolean; result?: string };
const days = async (page: Page): Promise<Day[]> => (await readSavedState(page)).projects[0].schedule.days;

test('a harbour filmed in Bergen from a London base: asked, scouted, rained on, travelled to, reloaded and delivered', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(1_200_000);
  await seededLife(page, 'gb-london', '2026-10-05', 2);
  await newProject(page, { title: 'North Water', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada'); await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Harbour', chars: ['Ada'], minutes: '2', exterior: true });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Ada'], minutes: '2' });
  await addScene(page, { index: 2, place: 'Harbour', chars: ['Ada'], minutes: '2', exterior: true });
  await saveAndApprove(page);

  // Where the Harbour is filmed: a real place, a kind of site, and what it asks, before anything is chosen.
  await section(page, 'Schedule');
  const filmed = card(page, 'Where Each Place Is Filmed');
  await expect(filmed.locator('li', { hasText: 'Harbour' })).toContainText('Filmed in London, as everything is until you choose.');
  await filmed.getByRole('button', { name: 'Choose Where Harbour Is Filmed' }).click();
  const chooser = page.getByRole('dialog', { name: 'Where Harbour Is Filmed' });
  await pickPlace(page, 'Film It In', 'Bergen', 'Norway');
  await chooser.getByLabel('Kind Of Site').selectOption({ label: 'A Coastline' });
  const asks = chooser.getByLabel('What Filming There Asks');
  await expect(asks).toContainText('Bergen, Norway');
  await expect(asks).toContainText(/km from London\. Each day there has Bergen's weather, daylight and public holidays, and is called on Bergen's clock\./);
  await expect(asks).toContainText('A day at a stretch of coast costs 70% of the usual location fee.');
  await expect(asks).toContainText('2 working days of permits and arrangements before the first day there.');
  await expect(asks).toContainText(/Away from base: the unit is moved there and back once \(\$[\d,]+\) and housed each shooting day \(\$[\d,]+ a day\)\. You have to be there for the call\./);
  await expect(asks).toContainText("the game's figures, not quotes, rates or legal guidance");
  await page.screenshot({ path: `test-results/destinations-${info.project.name}-01-asks.png`, fullPage: true });
  await chooser.getByRole('button', { name: 'Film It There' }).click();
  await expect(chooser).toBeHidden();
  await expect(filmed.getByRole('status')).toHaveText('Harbour is filmed in Bergen.');
  const row = filmed.locator('li', { hasText: 'Harbour' });
  await expect(row).toContainText(/Bergen, [\d,]+ km Away/);
  await expect(row).toContainText('A stretch of coast in Bergen, Norway. Bergen is a real place; the site is a candidate the game made up, not a real venue');
  await expect(filmed.locator('li', { hasText: 'Kitchen' })).toContainText('At The Base');
  expect(await noSidewaysScroll(page)).toBe(true);

  // The estimate has the unit's move and housing, before any schedule sets the money aside.
  await section(page, 'Budget');
  await expect(card(page, 'What It Costs')).toContainText(/Filming in Bergen: Harbour: \$[\d,]+ · The unit moved there and back \(\$[\d,]+\) and housed for \d shoot days?/);

  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // The schedule, the forecast and the call sheet are the filmed place's.
  const shootDays = card(page, 'Shoot Days');
  const harbour = shootDays.locator('li', { hasText: 'Harbour (Exterior)' }).first();
  await expect(harbour).toContainText('Filmed in Bergen, Norway.');
  await expect(shootDays.locator('li', { hasText: 'Kitchen (Interior)' }).first()).not.toContainText('Filmed in');
  await expect.poll(async () => (await days(page)).map((d) => `${d.date} ${d.locationLabel}`), { timeout: 30_000 }).toEqual(['2026-10-28 Harbour', '2026-10-30 Kitchen']);
  // Getting to Bergen takes a working day, and so does coming back (November 12, 2026).
  await expect(harbour).toContainText('The unit travels from London the working day before.');
  // Rain is likely in Bergen that day. The answer is the interior day: the two swap dates.
  await harbour.getByRole('button', { name: 'Film an Interior Scene' }).click();
  await expect.poll(async () => (await days(page)).filter((d) => d.status === 'scheduled').map((d) => `${d.date} ${d.locationLabel}`).sort()).toEqual(['2026-10-28 Kitchen', '2026-10-30 Harbour']);
  await harbour.getByText('Call Sheet', { exact: true }).click();
  await expect(harbour).toContainText("Harbour, exterior. Filmed in Bergen, Norway, on Bergen's clock: be there for the call");
  await page.screenshot({ path: `test-results/destinations-${info.project.name}-02-days.png`, fullPage: true });
  expect(await noSidewaysScroll(page)).toBe(true);

  // The work it made: permits and arrangements before the first day there.
  await section(page, 'Production');
  await expect(page.getByText('Permits And Arrangements: Harbour, In Bergen').first()).toBeVisible();

  // Prep begins on the schedule's start date. Scouting finds three sites there. The first is the candidate the game made up, never called a real place.
  const scouted = async () => (await readSavedState(page)).projects[0].tasks.some((t: { kind: string; status: string }) => t.kind === 'prep:locations' && t.status === 'done');
  for (let i = 0; i < 25 && !(await scouted()); i++) { await advance(page, 'next-day'); await staffEveryDepartment(page); }
  expect(await scouted()).toBe(true);
  await section(page, 'Schedule');
  const sites = card(page, 'Locations').locator('li', { hasText: 'Harbour' });
  await expect(sites).toContainText('sites in Bergen');
  await expect(sites.getByLabel('Site For Harbour').locator('option').nth(1)).toHaveText(/^The Candidate Site: \$[\d,]+ a day$/);
  await sites.getByLabel('Site For Harbour').selectOption({ index: 1 });
  await sites.getByLabel('Backup For Harbour').selectOption({ label: /^A Stage Set Built To Match/ } as never).catch(async () => { await sites.getByLabel('Backup For Harbour').selectOption({ index: 1 }); });
  await expect(sites).toContainText('The site the game made up there; arrangements can still fall through.');
  await expect(card(page, 'Locations').getByLabel('Site For Kitchen').locator('option').first()).toHaveText('The Real Place (Not Chosen Yet)');

  // Saved, closed and opened again: the place, the kind and the sites are there.
  const check = async () => {
    const c = (await readSavedState(page)).projects[0].locationChoices.Harbour;
    expect(c.at).toEqual({ placeId: 'gn:3161732', kind: 'coast' }); // Bergen, Norway, in the world registry (GeoNames 3161732)
    expect([c.main, c.backup]).toEqual(['real', 'stage']);
  };
  await expect.poll(async () => (await readSavedState(page)).projects[0].locationChoices?.Harbour?.backup, { timeout: 30_000 }).toBe('stage');
  await check();
  await saveAndExit(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await check();

  // The player goes to Bergen and stays. The Kitchen day, at the base, starts without them; the Harbour days don't.
  await nav(page, 'World');
  await page.getByLabel('Country Or Territory').selectOption({ label: 'Norway' });
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('bergen');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Bergen', exact: true }).click();
  await page.getByRole('button', { name: 'Travel Here' }).click();
  await expect(page.getByText("You've arrived in Bergen.").first()).toBeVisible({ timeout: 30_000 });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'North Water' }).first().click();
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page)).projects[0]?.delivered, { timeout: 30_000 }).toBe(true);

  // What happened, from the save. The Kitchen was shot at the base without the player. In Bergen, rain stopped the first
  // Harbour day, and the next day both scenes were shot at the candidate site. The unit's move was paid once, and its
  // housing for each day it was called there. Until November 12, 2026, when moving between London and Bergen took no
  // time, the Harbour days fell two days earlier and the site fell through on the second (that is tests/locations.test.ts's
  // to cover now).
  const s = await readSavedState(page);
  const done = s.projects[0];
  expect(done.schedule.days.map((d: Day) => [d.date, d.locationLabel, d.status, d.result])).toEqual([
    ['2026-10-30', 'Harbour', 'lost', 'Rain stopped Scene 1 (Harbour).'],
    ['2026-10-28', 'Kitchen', 'shot', 'Shot 1 of 1 scene.'],
    ['2026-11-02', 'Harbour', 'shot', 'Shot 2 of 2 scenes.'],
  ]);
  const paid = (key: RegExp): number[] => done.obligations.flatMap((o: { postings: { key: string; kind: string; amount: number }[] }) => o.postings).filter((x: { key: string; kind: string }) => x.kind === 'settle' && key.test(x.key)).map((x: { amount: number }) => x.amount);
  expect(paid(/^move:/)).toHaveLength(1);
  expect(paid(/^move:/)[0]).toBeGreaterThan(0);
  expect(paid(/^away:/)).toHaveLength(2);
  expect(new Set(paid(/^away:/)).size).toBe(1);
  const logs: string[] = s.log.map((l: { text: string }) => l.text);
  expect(logs).toContain("You weren't in London for the call on North Water. The day started late without you.");
  expect(logs.some((t) => t.includes("You weren't in Bergen for the call"))).toBe(false);
  expect(logs).toContain('North Water, October 30, 2026: Rain stopped Scene 1 (Harbour). The remaining work moved to a new day.');
  expect(logs.some((t) => t.includes('fell through'))).toBe(false);
  expect(done.tasks.find((t: { kind: string }) => t.kind === 'prep:permit')).toMatchObject({ status: 'done', units: 2 });
  expect(done.locationChoices.Harbour).toMatchObject({ at: { placeId: 'gn:3161732', kind: 'coast' }, main: 'real', backup: 'stage' });
  expect(done.schedule.days.find((d: Day) => d.date === '2026-10-30').travelFrom).toBe('London');
  await section(page, 'Schedule');
  await expect(page.getByText('Rain stopped Scene 1 (Harbour).').first()).toBeVisible();
  await page.screenshot({ path: `test-results/destinations-${info.project.name}-03-made.png`, fullPage: true });
});

// The comparison to the wet-October journey in journeys.spec.ts: the same base, month, seed and three exterior streets,
// which there lose a day to rain. Here the streets are filmed on a soundstage in the same city, and no day is lost.
test('the same wet October on a soundstage: no day is lost to rain, and nobody is moved or housed', async ({ page }, info) => {
  test.skip(!['desktop', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(1_200_000);
  await seededLife(page, 'gb-london', '2026-10-05', 2);
  await newProject(page, { title: 'Dry Streets', format: 'Short Film', runtime: '4' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada'); await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  for (let i = 0; i < 3; i++) await addScene(page, { index: i, place: `Street ${i + 1}`, chars: ['Ada'], minutes: '1', exterior: true });
  await saveAndApprove(page);
  await section(page, 'Schedule');
  const filmed = card(page, 'Where Each Place Is Filmed');
  for (let i = 1; i <= 3; i++) {
    await filmed.getByRole('button', { name: `Choose Where Street ${i} Is Filmed` }).click();
    const chooser = page.getByRole('dialog', { name: `Where Street ${i} Is Filmed` });
    await pickPlace(page, 'Film It In', 'London', 'United Kingdom');
    await chooser.getByLabel('Kind Of Site').selectOption({ label: 'A Soundstage' });
    const asks = chooser.getByLabel('What Filming There Asks');
    await expect(asks).toContainText('Under a roof: rain and snow do not stop the day.');
    await expect(asks).toContainText('Near enough to the base that nobody is moved or housed.');
    await chooser.getByRole('button', { name: 'Film It There' }).click();
    await expect(chooser).toBeHidden();
  }
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  const street = card(page, 'Shoot Days').locator('li', { hasText: 'Street 1 (Exterior)' }).first();
  await expect(street).toContainText('Filmed in London, United Kingdom.');
  await expect(street.getByRole('button', { name: 'Keep The Plan' })).toHaveCount(0); // no rain warning under a roof
  await street.getByText('Call Sheet', { exact: true }).click();
  await expect(street).toContainText('Filmed under a roof: the weather and the daylight do not matter today.');
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page)).projects[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const s = await readSavedState(page);
  const all: Day[] = s.projects[0].schedule.days;
  expect(all.filter((d) => /(Rain|Snow) stopped|enough daylight/.test(d.result ?? '')).map((d) => d.result)).toEqual([]); // a day can still be lost for other reasons
  expect(all.filter((d) => d.status === 'shot').length).toBeGreaterThan(0);
  expect(s.log.some((l: { text: string }) => /Rain stopped|is expected during your exterior shoot/.test(l.text))).toBe(false);
  const keys: string[] = s.projects[0].obligations.flatMap((o: { postings: { key: string }[] }) => o.postings.map((x) => x.key));
  expect(keys.some((k) => /^(move|away):/.test(k))).toBe(false);
});
