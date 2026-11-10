// Journey B of the gameplay-connectivity pass (November 10, 2026): a series made in the browser, an episode given its own
// director, the season delivered, then released on dates of the player's own across the International Emmys' year end.
// Which episodes count, and why, is read on the event page; a date change is previewed before it is made; the entry and
// the schedule survive a reload; episodes come out on their own days. Nothing is written into the save: the series is
// made, staffed, shot and released through the screens. The world seed is pinned (helpers.ts pinSeed), chosen once.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import {
  addScene, advance, castRoles, nav, newProject, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment,
} from './helpers';

test.use({ actionTimeout: 20_000 });
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/release-schedule-${name}.png`, fullPage: true });
const history = (page: Page) => page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
const categories = (page: Page) => page.getByRole('region', { name: /^(Categories|Sections)$/ });
const row = (page: Page, name: string): Locator => categories(page).locator('li').filter({ has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) });

async function openIemmys(page: Page): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Low Water' }).click();
  await section(page, 'Festivals And Awards');
  const label = (await readSavedState(page)).editions.find((e: { id: string }) => e.id === 'international-emmys-2027').label as string;
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'When And Where' })).toBeVisible();
  await categories(page).getByLabel('Project').selectOption({ label: 'Low Water' });
  await categories(page).getByLabel('Show').selectOption({ label: 'Every Category' });
}

test('a series released across the year end: its own episode director, a split schedule, which episodes count and why, a previewed change, entered and kept after a reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The season is made once, at desktop width.');
  test.setTimeout(1_200_000);
  await quickLife(page, 'gb-london', '2026-07-01');
  await pinSeed(page, 41);
  await newProject(page, { title: 'Low Water', format: 'Series', episodes: '3', runtime: '60' }); // the International Emmys' drama needs a half-hour slot's 20 minutes
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada Quinn');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  for (const [i, ep] of [[0, 1], [1, 2], [2, 3]] as const) await addScene(page, { index: i, place: 'Estuary', chars: ['Ada Quinn'], minutes: '20', episodeButton: `Add Scene To Episode ${ep}` });
  await saveAndApprove(page);

  // Episode 2 goes to a hired episode director; the others stay yours.
  await section(page, 'Crew');
  await page.getByRole('button', { name: 'Hire An Episode Director' }).click();
  const hire = page.getByRole('dialog', { name: 'Hire An Episode Director' });
  await hire.getByRole('button', { name: 'Make Offer' }).first().click();
  await expect(hire).toBeHidden(); // an offer closes the list
  await castRoles(page, ['Ada Quinn']);
  await staffEveryDepartment(page);
  await advance(page, 'week'); // offers say they are answered in two or three days
  await section(page, 'Crew');
  const director = page.getByLabel('Director For Episode 2');
  await expect(director.locator('option')).toHaveCount(2);
  const name = (await director.locator('option').nth(1).innerText()).trim();
  await director.selectOption({ index: 1 });
  await expect(director).not.toHaveValue('player');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page);
  // The hired director is credited on episode 2 alone; you on the others.
  await section(page, 'Release');
  const credits = page.locator('section.card', { has: page.getByRole('heading', { name: 'Credits' }) });
  await expect(credits.locator('tr', { hasText: name })).toContainText('Episodes 2');
  const today = (await readSavedState(page)).now as number;
  expect(new Date(today).toISOString().slice(0, 10) < '2026-12-01').toBe(true); // delivered in time to release in December

  // Weekly from December 20, with a break: episode 2 on January 3 and episode 3 on January 10. One of three in 2026.
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Streaming' });
  await page.getByLabel('Release Date').fill('2026-12-20');
  await page.getByLabel('Territory Code').fill('GB');
  await page.getByLabel('Episode Schedule').selectOption({ label: 'Weekly' });
  await expect(page.getByLabel('Episode 2', { exact: true })).toHaveValue('2026-12-27');
  await page.getByLabel('Episode 2', { exact: true }).fill('2027-01-03');
  await page.getByLabel('Episode 3', { exact: true }).fill('2027-01-10');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await history(page).getByText(/^Episode Dates: /).click();
  await expect(history(page)).toContainText('Episode Dates: Dates Of My Own');
  await expect(history(page)).toContainText('Episode 2: January 3, 2027, to come');
  await shot(page, '01-planned');

  // Entries open on December 8. The event page says which episodes count, and why it doesn't qualify.
  while (new Date((await readSavedState(page)).now).toISOString().slice(0, 10) < '2026-12-09') await advance(page, 'week');
  await openIemmys(page);
  await expect(row(page, 'Drama Series')).toContainText('1 of its 3 episodes air between January 1, 2026 and December 31, 2026; a season counts in the year most of its episodes aired.');

  // Bring episode 2 back to December 27: the change is shown first, then made.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Low Water' }).click();
  await section(page, 'Release');
  await history(page).getByText(/^Episode Dates: /).click();
  await history(page).getByRole('button', { name: 'Change Episode Dates' }).click();
  await page.getByLabel('New Date For Episode 2').fill('2026-12-27');
  await page.getByRole('button', { name: 'Review The Change' }).click();
  const confirm = page.getByRole('dialog', { name: 'Change These Episode Dates?' });
  await expect(confirm).toContainText('Episode 2 moves from January 3, 2027 to December 27, 2026.');
  await expect(confirm).toContainText('Your calendar shows the new days');
  await shot(page, '02-preview');
  await confirm.getByRole('button', { name: 'Confirm The New Dates' }).click();
  await expect(confirm).toBeHidden();
  await expect(history(page)).toContainText('Episode 2: December 27, 2026, to come');

  // Two of three in 2026 now: open to it, and entered provisionally while they are still to come.
  await openIemmys(page);
  await expect(row(page, 'Drama Series')).not.toContainText('a season counts in the year most of its episodes aired');
  await row(page, 'Drama Series').getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  const yours = page.locator('section', { hasText: 'Your Entries' }).last();
  await expect(yours.locator('li', { hasText: 'Drama Series' })).toContainText('Entered provisionally: 2 of the 2 episodes it counts between January 1, 2026 and December 31, 2026 are still to come out.');

  // Reloaded: the entry, what it was entered with, and the schedule are as they were.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openIemmys(page);
  await expect(page.locator('section', { hasText: 'Your Entries' }).last().locator('li', { hasText: 'Drama Series' }).locator('.chip').first()).toHaveText('Submitted');
  const s = await readSavedState(page);
  const p = s.projects.find((x: { title: string }) => x.title === 'Low Water');
  expect(p.releases[0].episodes.map((e: { date: string; status: string }) => `${e.date}:${e.status}`)).toEqual(['2026-12-20:planned', '2026-12-27:planned', '2027-01-10:planned']);
  const e = s.editions.find((x: { id: string }) => x.id === 'international-emmys-2027').entries[0];
  expect(e.snapshot.airing.map((a: { date: string }) => a.date)).toEqual(['2026-12-20', '2026-12-27', '2027-01-10']);

  // Episodes come out on their own days; the release history says which.
  while (new Date((await readSavedState(page)).now).toISOString().slice(0, 10) < '2026-12-28') await advance(page, 'week');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Low Water' }).click();
  await section(page, 'Release');
  await history(page).getByText(/^Episode Dates: /).click();
  await expect(history(page)).toContainText('Episode 1: December 20, 2026, out');
  await expect(history(page)).toContainText('Episode 2: December 27, 2026, out');
  await expect(history(page)).toContainText('Episode 3: January 10, 2027, to come');
  await shot(page, '03-two-out');
});
