// Your own money through the interface (the owner's v8 package, decisions 2 and 3; A01, A05; until November 14, 2026 the v4
// package's savings and family gift): the inheritance read on Review, its amount changed and checked as typed, your
// account on Profile with where it came from, and money put into a project only by your choice, still there after a
// reload. The rules are the engine's (tests/v8-inheritance.test.ts, tests/v8-money.test.ts).
import { expect, test } from './test';
import { addScene, nav, openStart, pressSaveAndExit, quickDraft, personalPostingsOf, readSavedState, saveAndApprove, section, newProject } from './helpers';

test('an inheritance read on Review, changed and checked as typed, kept on Profile, and put into a project by choice', async ({ page }) => {
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-02-02');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  // Review first: the default inheritance, no company, nothing after it.
  const review = page.locator('section', { has: page.getByRole('heading', { name: 'Money', exact: true }) }).first();
  await expect(review).toContainText('$25,000,000');
  await expect(review).toContainText('None: you start on your own');
  await expect(review).toContainText('No allowance, and nobody to bail you out');
  await page.getByRole('button', { name: 'Edit Your Inheritance' }).click();
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'Your Inheritance' }) });
  await expect(card).toContainText("Your family's wealth comes from oil.");
  const amount = card.getByLabel('Amount (US Dollars)');
  // What is typed is checked as typed: too many decimals, a European format, a sign, are each refused, and say why.
  await amount.fill('9,500.505');
  await expect(card).toContainText('US Dollar has 2 decimal places at most.');
  await amount.fill('2.000.000,50');
  await expect(card).toContainText('Use a point for decimals and commas for thousands');
  await amount.fill('-5');
  await expect(card).toContainText("An amount can't be negative.");
  await amount.fill('9,500');
  await expect(card).toContainText('You Start With: $9,500 in your own account, and no company.');
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(review).toContainText('$9,500');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();

  // Profile: the account, by what each part is.
  await nav(page, 'Profile');
  const mine = page.locator('section', { has: page.getByRole('heading', { name: 'Your Money' }) });
  await expect(mine).toContainText('$9,500 in your own account.');
  await expect(mine.getByRole('list', { name: 'Your Account, By What It Is' })).toContainText('Your Inheritance');
  await expect(mine).toContainText('Where It Came From: Your inheritance of $9,500, released on your nineteenth birthday, May 20, 2025.');

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
  expect(personalPostingsOf(saved).map((x: { kind: string; amount: number }) => [x.kind, x.amount])).toEqual([['inheritance', 9500], ['to-project', -4000]]);
  expect(saved.projects[0].finance.deals.find((d: { kind: string }) => d.kind === 'savings')).toMatchObject({ amount: 4000, received: 4000, status: 'accepted' });
});
