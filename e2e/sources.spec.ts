// Adapting a real work (the v3 package, 02; acceptance T05, its first steps): found in the source-material catalog,
// read with what is and isn't recorded about its rights, chosen, undone, chosen again, let go, and kept through a
// reload. The catalog is the repository's own (src/data/sources.json, from Wikidata, CC0), so nothing is intercepted.
import { expect, test, type Page } from './test';
import { audit } from './ui-audit';
import { nav, newProject, quickLife, readSavedState, saveAndExit, section } from './helpers';

const picker = (page: Page) => page.getByRole('dialog', { name: 'Choose A Work To Adapt' });
async function openPicker(page: Page) {
  await page.getByRole('button', { name: 'Choose A Work To Adapt' }).click();
  await picker(page).getByLabel('Search Works').waitFor();
  return picker(page);
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const project = async (page: Page): Promise<any> => (await readSavedState(page))?.projects?.[0] ?? {};

test.beforeEach(({}, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
});

test('a real work found, read with its recorded rights, chosen, undone, chosen again, let go, and still there after a reload', async ({ page }, info) => {
  const phone = info.project.name !== 'desktop';
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Untitled Film', format: 'Feature Film', budget: 'Low Budget' });
  await section(page, 'Script');
  await page.getByLabel('Logline', { exact: true }).fill('Mine, and staying.');
  await expect(page.getByLabel('Source Material')).toHaveValue('original');

  // The list: every work, the most written about first, forty drawn at a time.
  const list = await openPicker(page);
  await expect(list.getByRole('status')).toContainText(/^\d+ works, the most written about first\. The first 40 are shown/);
  expect(await list.getByRole('list', { name: 'Works' }).locator('li').count()).toBe(40);
  await expect(list).toContainText('It is not permission to use the work, and nothing agreed in the game is.');
  if (phone) expect((await audit(page)).defects, 'the list of works, on a phone').toEqual([]);
  // Narrowed by what is recorded, not by anything worked out.
  await list.getByLabel('Medium').selectOption({ label: 'Video Game' });
  await list.getByLabel('What Is Recorded About Its Rights').selectOption({ label: 'Recorded As Public Domain' });
  await expect(list).toContainText('No work matches that.');
  await list.getByLabel('What Is Recorded About Its Rights').selectOption({ label: 'Anything' });
  await list.getByLabel('Medium').selectOption({ label: 'Every Medium' });
  await list.getByLabel('Search Works').fill('quixote');
  await expect(list.getByRole('status')).toContainText(/^1 of \d+ works\./);
  await list.getByRole('button', { name: /^Don Quixote/ }).click();

  // One work, as recorded.
  const work = page.getByRole('dialog', { name: 'Don Quixote' });
  await expect(work.getByRole('region', { name: 'What Is Recorded' })).toContainText('Miguel de Cervantes (author, died 1616)');
  await expect(work.getByRole('region', { name: 'What Is Recorded' })).toContainText('1605');
  await expect(work.getByRole('region', { name: 'Its Rights' })).toContainText('The game works nothing out from a date or a death, gives no advice about the law, and grants no right to a real work.');
  await expect(work.getByRole('region', { name: 'Where This Comes From' })).toContainText('No synopsis is recorded there and none is written here.');
  await expect(work.getByRole('link', { name: 'Its Wikidata Record' })).toHaveAttribute('href', 'https://www.wikidata.org/wiki/Q480');
  const changes = work.getByRole('region', { name: 'What Choosing It Changes' });
  await expect(changes).toContainText('Source Material becomes Adapted From Another Work.');
  await expect(changes).toContainText('Adapted From becomes "Don Quixote by Miguel de Cervantes".');
  if (phone) expect((await audit(page)).defects, 'one work open, on a phone').toEqual([]);
  // Going back chooses nothing.
  await work.getByRole('button', { name: 'Back To Works' }).click();
  await picker(page).getByRole('button', { name: 'Keep My Script As It Is' }).click();
  await expect(page.getByLabel('Source Material')).toHaveValue('original');

  // Chosen.
  await (await openPicker(page)).getByLabel('Search Works').fill('cervantes');
  await picker(page).getByRole('button', { name: /^Don Quixote/ }).click();
  await page.getByRole('dialog', { name: 'Don Quixote' }).getByRole('button', { name: 'Adapt This Work' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Adapted from: Don Quixote.' })).toBeVisible();
  await expect(page.getByLabel('Source Material')).toHaveValue('adapted');
  await expect(page.getByLabel('Adapted From')).toHaveValue('Don Quixote by Miguel de Cervantes');
  const adapts = page.getByRole('region', { name: 'The Work It Adapts' });
  await expect(adapts).toContainText('Don Quixote, by Miguel de Cervantes');
  await expect(adapts).toContainText('Novel, 1605');
  await expect(adapts).toContainText('it is not permission to use a real work, and nothing agreed in the game is one.');
  await expect(page.getByLabel('Logline', { exact: true })).toHaveValue('Mine, and staying.');
  // The save is written a moment after the change.
  await expect.poll(async () => (await project(page)).source?.ref).toMatchObject({ id: 'wd:Q480', title: 'Don Quixote', medium: 'novel', year: 1605, creators: ['Miguel de Cervantes'] });
  expect((await project(page)).story.logline).toBe('Mine, and staying.');
  if (phone) expect((await audit(page)).defects, 'the script page with the work it adapts, on a phone').toEqual([]);

  // Undone in one step, then chosen again.
  await page.getByRole('button', { name: 'Undo Last Change' }).click();
  await expect(page.getByLabel('Source Material')).toHaveValue('original');
  await expect(adapts).toHaveCount(0);
  await (await openPicker(page)).getByLabel('Search Works').fill('quixote');
  await picker(page).getByRole('button', { name: /^Don Quixote/ }).click();
  await page.getByRole('dialog', { name: 'Don Quixote' }).getByRole('button', { name: 'Adapt This Work' }).click();
  await expect(adapts).toBeVisible();

  // The writer's own words for it are theirs, and the record stays under them.
  await page.getByLabel('Adapted From').fill('Don Quixote, moved to a motorway service station');
  await expect(adapts).toContainText('Don Quixote, by Miguel de Cervantes');

  // Saved, closed and opened: the record is in the save as it stood.
  await saveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: /Untitled Film/ }).first().click();
  await section(page, 'Script');
  await expect(page.getByLabel('Adapted From')).toHaveValue('Don Quixote, moved to a motorway service station');
  await expect(page.getByRole('region', { name: 'The Work It Adapts' })).toContainText('Novel, 1605');

  // Let go: the catalog work goes, the script stays adapted in the writer's words.
  await page.getByRole('region', { name: 'The Work It Adapts' }).getByRole('button', { name: 'Let This Work Go' }).click();
  await expect(page.getByRole('region', { name: 'The Work It Adapts' })).toHaveCount(0);
  await expect(page.getByLabel('Source Material')).toHaveValue('adapted');
  await expect(page.getByLabel('Adapted From')).toHaveValue('Don Quixote, moved to a motorway service station');
  await expect.poll(async () => (await project(page)).source).toEqual({ kind: 'adapted', work: 'Don Quixote, moved to a motorway service station' });
});

test('a work recorded as copyrighted says so and is still only a declaration; a documentary is offered no work to adapt', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Untitled Film', format: 'Feature Film', budget: 'Low Budget' });
  await section(page, 'Script');
  const list = await openPicker(page);
  await list.getByLabel('What Is Recorded About Its Rights').selectOption({ label: 'Recorded As Copyrighted' });
  await expect(list.getByRole('status')).toContainText(/^\d+ of \d+ works\./);
  const first = list.getByRole('list', { name: 'Works' }).locator('li').first();
  await expect(first).toContainText('Recorded As Copyrighted');
  const title = (await first.locator('.idea-label').innerText()).trim();
  await first.getByRole('button').click();
  const work = page.getByRole('dialog', { name: title });
  await expect(work.getByRole('region', { name: 'Its Rights' })).toContainText('Recorded as copyrighted. Adapting it for real would need its rights holder; the game can only note that.');
  await work.getByRole('button', { name: 'Adapt This Work' }).click();
  await expect(page.getByRole('region', { name: 'The Work It Adapts' })).toContainText('Recorded as copyrighted.');
  await expect.poll(async () => (await project(page)).source?.ref?.standing).toBe('copyrighted-recorded');

  await nav(page, 'Projects');
  await newProject(page, { title: 'A Documentary', format: 'Documentary Feature', budget: 'Low Budget' });
  await section(page, 'Script');
  await expect(page.getByRole('button', { name: 'Choose A Full Story' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose A Work To Adapt' })).toHaveCount(0);
});

// V3-A05: the option. A work recorded as copyrighted needs its rights bought, in this story, before production is
// planned: refused with the reason, optioned, renewed, bought, and then planned.
test('an adaptation of a protected work is optioned, renewed and bought before its production can be planned', async ({ page }, info) => {
  test.setTimeout(300_000);
  const { addScene, saveAndApprove } = await import('./helpers');
  const phone = info.project.name !== 'desktop';
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await newProject(page, { title: 'The Adaptation', format: 'Feature Film', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  const list = await openPicker(page);
  await list.getByLabel('What Is Recorded About Its Rights').selectOption({ label: 'Recorded As Copyrighted' });
  const first = list.getByRole('list', { name: 'Works' }).locator('li').first();
  const title = (await first.locator('.idea-label').innerText()).trim();
  await first.getByRole('button').click();
  await page.getByRole('dialog', { name: title }).getByRole('button', { name: 'Adapt This Work' }).click();
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Ada'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Harbour', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page); // approves the draft and takes the starting backing, so the project has money

  // Before the rights: the card says where it stands and what it would cost, and planning is refused with the reason.
  await section(page, 'Budget');
  const rights = page.locator('section.card', { has: page.getByRole('heading', { name: 'Adaptation Rights', exact: true }) });
  await expect(rights).toContainText('No Option Yet');
  await expect(rights).toContainText("This is your story's own agreement with the work's rights holder, who is nobody real");
  await expect(rights.getByRole('list', { name: 'Chain Of Title' }).locator('li')).toHaveCount(1);
  await expect(rights).toContainText('Price Of The Rights');
  await expect(rights).toContainText('Worldwide, film only, this project only');
  if (phone) expect((await audit(page)).defects, 'the rights card, on a phone').toEqual([]);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await expect(page.getByRole('alert')).toContainText(`This script is adapted from ${title}, which is recorded as copyrighted. Take an option on it and exercise the option before planning production (Budget, Adaptation Rights).`);

  // Optioned: the fee leaves the project, the chain grows, and planning is still refused, for the next reason.
  await section(page, 'Budget');
  const spent = async () => Number((await page.locator('section.card', { has: page.getByRole('heading', { name: 'Summary', exact: true }) }).locator('dt', { hasText: /^Spent$/ }).locator('xpath=following-sibling::dd[1]').innerText()).replace(/[^\d.-]/g, ''));
  const before = await spent();
  const fee = Number((await rights.getByRole('button', { name: /^Take The Option For \$/ }).innerText()).replace(/[^\d]/g, ''));
  await rights.getByRole('button', { name: /^Take The Option For \$/ }).click();
  await expect(rights).toContainText('Option Held');
  expect(await spent()).toBe(before + fee);
  await expect(rights.getByRole('list', { name: 'Chain Of Title' })).toContainText(/Option taken .* for \$[\d,]+: 18 months, worldwide, film only, this project only\./);
  await expect(rights.getByRole('list', { name: 'Chain Of Title' })).toContainText(/Runs out /);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await expect(page.getByRole('alert')).toContainText('Exercise the option before planning production');

  // Renewed once, then bought: the rest of the price is paid, and the credit is agreed.
  await section(page, 'Budget');
  await rights.getByRole('button', { name: /^Renew For \$/ }).click();
  await expect(rights.getByRole('list', { name: 'Chain Of Title' })).toContainText(/Renewed .*: 12 months more\./);
  await expect(rights.getByRole('button', { name: /^Renew For \$/ })).toHaveCount(0);
  const rest = Number((await rights.getByRole('button', { name: /^Buy The Rights For \$/ }).innerText()).replace(/[^\d]/g, ''));
  expect(rest).toBe(fee * 9);
  await rights.getByRole('button', { name: /^Buy The Rights For \$/ }).click();
  await expect(rights).toContainText('Rights Bought');
  expect(await spent()).toBe(before + fee + fee + rest);
  await expect(rights.getByRole('list', { name: 'Chain Of Title' })).toContainText(`The credit agreed: Based On ${title}`);
  await expect.poll(async () => (await project(page)).source?.option?.exercisedAt ?? 0).toBeGreaterThan(0);

  // Now production can be planned.
  await section(page, 'Schedule');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await expect(page.getByRole('button', { name: 'Rebuild Schedule' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
