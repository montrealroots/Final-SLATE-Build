// Milestone C of the Creative Depth package (docs/creative-depth), through visible controls only: a route through the
// genre sets the light, the sound and the score; a character's looks are named and a scene says which it is in; a scene's
// camera goes on a dolly; and each of those shows up as work, crew or cost, survives a reload, and the film is delivered.
// The world seed is fixed (labelled fixture).
import { expect, test, type Page } from './test';
import { addScene, advance, newProject, produceToDelivery, readSavedState, saveAndApprove, saveAndExit, section, seededLife } from './helpers';

test.use({ actionTimeout: 20_000 });

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

test('a route through the genre, named looks and a dolly: chosen, shown as work, kept across a reload, and delivered', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(1_200_000);
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  await newProject(page, { title: 'Till Morning', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  for (const n of ['Ines', 'Marco']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Front Room', chars: ['Ines', 'Marco'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Front Room', chars: ['Ines'], minutes: '2' });

  // A route through the genre: read before it is applied, with one of its scenes ticked.
  await page.getByRole('button', { name: 'Routes Through Its Genre' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose A Route Through Its Genre' });
  await picker.getByRole('tab', { name: 'Browse All' }).click();
  await expect(picker.getByRole('status')).toHaveText('68 ideas');
  await picker.getByLabel('Search Ideas').fill('siege till morning');
  await picker.getByRole('list', { name: 'Ideas' }).getByRole('button').first().click();
  await expect(picker).toContainText('The Light It Is Shot In: High Contrast.');
  await expect(picker).toContainText('Sound: adds Heightened Creature Foley. Your other sound choices stay.');
  await expect(picker).toContainText('The Score: Electronic.');
  await page.screenshot({ path: `test-results/craft-${info.project.name}-01-route.png`, fullPage: true });
  await picker.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(picker).toBeHidden();

  // The choices are on the page as controls, each saying what it asks, and can be changed there.
  const craft = page.getByRole('group', { name: 'Light, Sound And Score' });
  await expect(craft.getByLabel('The Light It Is Shot In')).toHaveValue('contrast');
  await expect(craft.getByLabel('The Score')).toHaveValue('synth');
  await expect(craft.getByRole('checkbox', { name: 'Dialogue Clarity' })).toBeChecked();
  await expect(craft.getByRole('checkbox', { name: 'Heightened Creature Foley' })).toBeChecked();
  await craft.getByRole('checkbox', { name: 'Heightened Creature Foley' }).uncheck(); // no creature in this script
  await craft.getByLabel('The Score').selectOption({ label: 'A Small Ensemble' });
  await expect(craft).toContainText('Players are recorded: a session for every twenty minutes of the film.');
  expect(await noSidewaysScroll(page)).toBe(true);

  // Looks with names, and which one a scene is in.
  await section(page, 'Characters');
  const ines = page.locator('article, section, li').filter({ has: page.getByRole('heading', { name: 'Ines' }) }).first();
  await page.getByRole('button', { name: /Ines/ }).first().click().catch(() => undefined);
  await page.getByLabel('Appearance States').first().fill('2');
  await page.getByLabel("Names Of Ines's Looks").fill('Clean, Bloodied');
  await expect(page.getByLabel("Names Of Ines's Looks")).toHaveValue('Clean, Bloodied');
  void ines;
  await section(page, 'Script');
  const second = page.locator('article.scene-card').nth(1);
  await second.getByRole('button', { name: 'Edit Scene' }).click();
  await second.getByLabel("Ines's Look In This Scene").selectOption({ label: 'Bloodied' });
  await saveAndApprove(page);

  // The work it made: tests before the shoot, a boom operator required, and a session for the score.
  await section(page, 'Crew');
  await expect(card(page, 'Sound').locator('li', { hasText: /^Boom Operator/ })).toContainText('Required for this plan.');
  await section(page, 'Production');
  await expect(page.getByText('Camera And Lighting Tests').first()).toBeVisible();
  await expect(page.getByText('Score Recording').first()).toBeVisible();

  // The first scene goes on a dolly: a key grip is now required, and the rig is rented by the day.
  await section(page, 'Schedule');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await page.getByLabel(/^Camera For Scene 1/).selectOption({ label: 'On A Dolly' });
  await expect(page.getByLabel(/^Camera For Scene 1/)).toHaveValue('dolly');
  await section(page, 'Crew');
  await expect(page.locator('li', { hasText: /^Key Grip/ }).first()).toContainText('Lays the track and moves the dolly');
  await section(page, 'Budget');
  await page.getByRole('button', { name: /Everything Still To Come/ }).click().catch(() => undefined);
  await expect(page.getByText('Camera rig rental').first()).toBeVisible();
  await page.screenshot({ path: `test-results/craft-${info.project.name}-02-budget.png`, fullPage: true });

  // Saved, closed and opened again: every choice is there.
  const check = async () => {
    const p = (await readSavedState(page)).projects[0];
    expect([p.axes.light, p.axes.score, p.axes.sound]).toEqual(['contrast', 'chamber', ['clarity']]);
    expect(p.characters.find((c: { name: string }) => c.name === 'Ines').look).toEqual({ states: 2, named: ['Clean', 'Bloodied'] });
    const ids = p.scenes.map((s: { id: string }) => s.id);
    expect(Object.values(p.scenes[1].states)).toEqual([1]);
    expect(p.shotPlans[ids[0]].rig).toBe('dolly');
    expect(p.brief.picks.some((k: { id: string }) => k.id === 'route.horror-siege-till-morning')).toBe(true);
  };
  await expect.poll(async () => (await readSavedState(page)).projects[0]?.shotPlans?.[(await readSavedState(page)).projects[0].scenes[0].id]?.rig, { timeout: 30_000 }).toBe('dolly');
  await check();
  await saveAndExit(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await check();

  // And the film is made with them: the tests are done before the shoot, the rig and the session are paid for.
  await page.getByRole('button', { name: 'Projects' }).first().click();
  await page.getByRole('button', { name: 'Till Morning' }).first().click();
  await produceToDelivery(page, { yourself: ['Marco'] });
  await expect.poll(async () => !!(await readSavedState(page)).projects[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const done = (await readSavedState(page)).projects[0];
  const task = (kind: string) => done.tasks.find((t: { kind: string }) => t.kind === kind);
  expect(task('prep:camera-test')).toMatchObject({ status: 'done', units: 2 });
  expect(task('post:score-session')).toMatchObject({ status: 'done' });
  const paid = (key: RegExp) => done.obligations.flatMap((o: { postings: { key: string; kind: string; amount: number }[] }) => o.postings).filter((x: { key: string; kind: string }) => x.kind === 'settle' && key.test(x.key));
  expect(paid(/^rig:/).length).toBeGreaterThan(0);
  expect(paid(/^rig:/).every((x: { amount: number }) => x.amount === 600)).toBe(true);
  expect(done.hires.some((h: { roleId: string; status: string; daysWorked: number }) => h.roleId === 'key-grip' && h.status === 'accepted' && h.daysWorked > 0)).toBe(true);
  await advance(page, 'next-day');
});
