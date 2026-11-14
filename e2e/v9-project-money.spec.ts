// Your own money into your own work (the owner's command of November 14, 2026, 8 "Validate", the third journey): Home →
// a project → its own planned budget, which moves no money → your own money put into it → an expense of your own (from
// the shop) → your bank's statement, which says both, and Home, which reads the same journal. No company: it left play
// that day.
import { expect, test, type Page } from './test';
import { addScene, nav, newProject, quickLife, saveAndApprove, section } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const homeBank = (page: Page) => page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Your Bank', exact: true }) }).first();
const available = async (page: Page) => Number((await homeBank(page).innerText()).match(/Available\s*\$([\d,]+)/)![1].replace(/,/g, ''));

test('a custom budget moves nothing; your money into the project and a purchase come off your bank, line by line', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
  test.setTimeout(240_000);
  await quickLife(page, 'us-los-angeles', '2028-01-26');
  await expect(homeBank(page)).toContainText('Available$25,000,000');
  const start = await available(page);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  // A planned budget of your own: typed, kept with its reason, and no money moves.
  await page.getByLabel('New Planned Budget (US Dollars)').fill('20,000');
  await page.getByLabel('Why').fill('A short with one location');
  await page.getByRole('button', { name: 'Change The Plan' }).click();
  await expect(page.getByRole('list', { name: 'Plan Revisions' })).toContainText('A short with one location');
  // Your own money in: it leaves your bank as one posting, and arrives as a backer line nobody is repaid from.
  const target = Number(await page.getByLabel('Change Financing Target').inputValue());
  await page.getByLabel('Change Financing Target').fill(String(target + 5_000));
  await page.getByRole('button', { name: 'Set Target' }).click();
  const own = card(page, 'Your Own Account');
  await own.getByLabel('Put In From Your Own Money').fill('2000');
  await own.getByRole('button', { name: 'Put It In' }).click();
  await expect(page.getByRole('region', { name: 'Backers' })).toContainText('Your Own Money');
  // An expense of your own: the first thing the shop sells.
  await nav(page, 'Profile');
  await page.getByRole('button', { name: 'Open The Shop' }).click();
  const buy = page.getByRole('button', { name: /^Buy / }).first();
  const item = (await buy.getAttribute('aria-label'))!.replace(/^Buy /, '');
  await buy.click();
  await page.keyboard.press('Escape');
  // Home: less by $2,000 and the price, read from the same journal.
  await nav(page, 'Home');
  const after = await available(page);
  expect(start - after).toBeGreaterThan(2_000);
  // The statement: the inheritance, the money put into the project, the purchase, and the balance after them.
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await page.getByRole('tab', { name: 'Statements' }).click();
  const statements = page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Statements' }) }).first();
  await expect(statements).toContainText('Your Inheritance');
  await expect(statements).toContainText('Put Into Harbour Lights');
  await expect(statements).toContainText(`Bought: ${item}`);
  await expect(statements).toContainText('2,000.00');
  await expect(statements).toContainText(`$${after.toLocaleString('en-US')}`);
  await page.getByRole('button', { name: 'Back To Home' }).click();
  expect(await available(page)).toBe(after);
});
