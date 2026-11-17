// J15, Finance stress, the steps it didn't run (docs/v6/JOURNEYS.md: "A failed payment and a cancelled reservation in one
// journey"; from November 17, 2026). A standing order the account can't cover is refused by the bank on its day: the
// player is told why, nothing moves, and the order stays for next month. Then an offer to a performer holds the
// project's money, and withdrawing it gives the money back. One game, through the interface. Desktop, in Chromium.
import { expect, test, type Page } from './test';
import { addScene, advance, nav, newProject, quickLife, saveAndApprove, section } from './helpers';

const homeBank = (page: Page) => page.locator('section, .panel', { has: page.getByRole('heading', { name: 'Your Bank', exact: true }) }).first();

test('J15: a standing order refused for want of money, and a reservation released when its offer is withdrawn', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One run, at desktop width.');
  test.setTimeout(300_000);
  await quickLife(page, 'us-los-angeles', '2028-01-26');
  await expect(homeBank(page)).toContainText('Available$25,000,000');

  // A savings account, and a standing order into it on the 1st of each month for more than the account holds.
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await page.getByRole('button', { name: 'Open A Chase Savings' }).click();
  await expect(page.getByText('2 accounts')).toBeVisible();
  await page.getByRole('tab', { name: 'Payments And Cash' }).click();
  await page.getByLabel('Each Month (USD)').fill('30000000');
  await page.getByLabel('Day Of The Month').fill('1');
  await page.getByRole('button', { name: 'Set Up A Standing Order Into Savings' }).click();
  await expect(page.getByText('$30,000,000 to Chase Savings on the 1st of each month')).toBeVisible();

  // February 1: the bank refuses it, says why, and moves nothing.
  await advance(page, 'week');
  await nav(page, 'Home');
  const updates = page.locator('section.card', { has: page.getByRole('heading', { name: 'Recent Updates' }) });
  await expect(updates).toContainText('A Standing Order Didn’t Go');
  await expect(updates).toContainText('There wasn’t enough available in Chase Total Checking that day');
  await expect(homeBank(page)).toContainText('Available$25,000,000');
  // The order is still there, for March.
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await page.getByRole('tab', { name: 'Payments And Cash' }).click();
  await expect(page.getByText('$30,000,000 to Chase Savings on the 1st of each month')).toBeVisible();

  // A reservation: an offer to a performer holds the project's money until it is answered or withdrawn.
  await nav(page, 'Home');
  await newProject(page, { title: 'Held Money', format: 'Short Film', runtime: '8', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Wren');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Wren'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  const plan = page.locator('section.card', { has: page.getByRole('heading', { name: 'Plan And Money' }) });
  const held = async () => Number((await plan.locator('dt', { hasText: /^Reserved And Committed$/ }).locator('xpath=following-sibling::dd[1]').innerText()).replace(/[$,]/g, ''));
  const before = await held();
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'Wren' }).getByRole('button', { name: 'Find Performers' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
  await page.keyboard.press('Escape');
  await section(page, 'Budget');
  expect(await held()).toBeGreaterThan(before);
  // Withdrawn before it is answered: the money it held is the project's again.
  await section(page, 'Cast');
  await page.getByRole('button', { name: 'Withdraw Offer' }).first().click();
  await expect(page.getByRole('button', { name: 'Withdraw Offer' })).toHaveCount(0);
  await section(page, 'Budget');
  expect(await held()).toBe(before);
});
