// Your own money through the interface (the v4 package, 02; ledger V4-016 and V4-017; part of J01): savings and a family
// gift chosen at creation and read on Review before the story starts, your account on Profile kept apart by what each
// part is, and money put into a project only by your choice, still there after a reload. The rules are the engine's
// (tests/personal.test.ts).
import { expect, test } from './test';
import { addScene, nav, openStart, pressSaveAndExit, quickDraft, personalPostingsOf, readSavedState, saveAndApprove, section, newProject } from './helpers';

test('savings and a family gift chosen at creation, read on Review, kept apart on Profile, and put into a project by choice', async ({ page }) => {
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-02-02');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  // Review first: nothing chosen yet means nothing owed and an empty account.
  const review = page.getByRole('region', { name: 'Money' }).or(page.locator('section', { has: page.getByRole('heading', { name: 'Money', exact: true }) })).first();
  await expect(review).toContainText('Nothing');
  await page.getByRole('button', { name: 'Edit Money And Family' }).click();
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'Money And Family' }) });
  await card.getByLabel('Your Savings').fill('1500');
  await card.getByLabel("Your Family's Circumstances").selectOption({ label: 'Comfortable' });
  await card.getByLabel('What Your Family Offers').selectOption({ label: 'A Gift' });
  await card.getByLabel('How Much').fill('25000');
  await expect(card).toContainText('At most $20,000.');
  await card.getByLabel('How Much').fill('8000');
  await expect(card).toContainText('You Start With: $9,500 in your own account. A gift: nothing is owed.');
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(review).toContainText('$9,500');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();

  // Profile: the account, by what each part is.
  await nav(page, 'Profile');
  const mine = page.locator('section', { has: page.getByRole('heading', { name: 'Your Money' }) });
  await expect(mine).toContainText('$9,500 in your own account.');
  await expect(mine.getByRole('list', { name: 'Your Account, By What It Is' })).toContainText('Gift From Your Family');

  // A project: money goes in only when the player puts it in, and only what the account holds.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '4' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  const own = page.locator('section', { has: page.getByRole('heading', { name: 'Your Own Account' }) });
  await own.getByLabel('Put In From Your Own Money').fill('12000');
  await expect(own).toContainText('You have $9,500 in your own account.');
  await expect(own.getByRole('button', { name: 'Put It In' })).toBeDisabled();
  // The starting backing already covers this project's target: there is nothing left to raise, and it says so.
  await own.getByLabel('Put In From Your Own Money').fill('4000');
  await expect(own).toContainText('This project has nothing left to raise.');
  // Aim higher, as a player does, and the money can go in.
  const target = Number(await page.getByLabel('Change Financing Target').inputValue());
  await page.getByLabel('Change Financing Target').fill(String(target + 10_000));
  await page.getByRole('button', { name: 'Set Target' }).click();
  await own.getByRole('button', { name: 'Put It In' }).click();
  await expect(own).toContainText('$5,500 in your own account.');
  await expect(page.getByRole('region', { name: 'Backers' })).toContainText('Your Own Money');

  // Kept after Save And Exit and Continue.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Profile');
  await expect(mine).toContainText('$5,500 in your own account.');
  const saved = await readSavedState(page);
  expect(personalPostingsOf(saved).map((x: { kind: string; amount: number }) => [x.kind, x.amount])).toEqual([['savings', 1500], ['gift', 8000], ['to-project', -4000]]);
  expect(saved.projects[0].finance.deals.find((d: { kind: string }) => d.kind === 'savings')).toMatchObject({ amount: 4000, received: 4000, status: 'accepted' });
});
