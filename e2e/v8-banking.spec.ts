// The v8 package's bank lifecycle through the screens (03 "Bank lifecycle"; A09, A10; from November 14, 2026): a
// 19-year-old in Los Angeles opens Chase Total Checking from Profile, the bank decides three business days on, money
// moves in and is on its way until the next business day, and the month's fee is charged once on the anchored day.
// The engine's rules are tests/v8-banking.test.ts.
import { expect, test, type Page } from './test';
import { advance, nav, quickLife, readSavedState } from './helpers';

const card = (page: Page) => page.locator('section', { has: page.getByRole('heading', { name: 'Your Bank Accounts' }) });

test('an account applied for, opened, funded on its way, and charged its fee once', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
  await quickLife(page, 'us-los-angeles', '2028-01-26');
  await nav(page, 'Profile');
  const bank = card(page);
  await expect(bank.getByRole('list', { name: 'Your Accounts' })).toContainText('$25,000,000');
  await expect(bank).toContainText("The game's own choice"); // the estate's account is the scenario's, and says so
  // What is offered is where you live: a personal Chase account, its fee and how sure the record is.
  await bank.getByLabel('Account To Apply For').selectOption({ label: 'Chase, Chase Total Checking (personal, USD)' });
  await expect(bank).toContainText('$15 a month, waived on conditions. A transfer to another bank costs $25. From research with its sources');
  await bank.getByRole('button', { name: 'Apply' }).click();
  await expect(bank.getByRole('list', { name: 'Your Accounts' })).toContainText('Applied for: the bank is deciding');
  await expect(bank.getByRole('button', { name: 'Apply' })).toBeDisabled();
  // Three business days on, it is open.
  for (let i = 0; i < 6 && !(await bank.getByText('Charges fall on day 31').count()); i++) { await advance(page, 'next-day'); await nav(page, 'Profile'); }
  await expect(bank).toContainText('Charges fall on day 31 of the month, or the month\'s last day.');
  // $100 moved in from your own account (the first, so the one chosen): held at once, on its way, not yet available.
  await expect(bank.getByLabel('From')).toHaveValue('player:cash:USD');
  await bank.getByLabel('Amount (USD)').fill('100');
  await bank.getByRole('button', { name: 'Move It' }).click();
  const chase = bank.getByRole('definition').filter({ hasText: '$100' });
  await expect(bank.locator('dl[aria-label="Chase, Chase Total Checking Balances"]')).toContainText('On Its Way In$100');
  await expect(chase.first()).toBeVisible();
  // It settles at ten the next business day.
  const chaseDl = bank.locator('dl[aria-label="Chase, Chase Total Checking Balances"]');
  for (let i = 0; i < 3 && !(await chaseDl.textContent())!.includes('Available$100'); i++) { await advance(page, 'next-day'); await nav(page, 'Profile'); }
  await expect(chaseDl).toContainText('Available$100');
  // A month on (the leap February's last day), the fee is charged once.
  await advance(page, 'month');
  await nav(page, 'Profile');
  await expect(bank.locator('dl[aria-label="Chase, Chase Total Checking Balances"]')).toContainText('Available$85');
  await bank.getByRole('button', { name: 'Statement' }).nth(1).click();
  await expect(bank.getByRole('list', { name: 'Chase, Chase Total Checking Statement' })).toContainText('Account Fee To 2028-02-29');
  const saved = await readSavedState(page);
  expect(saved.journal.txs.filter((t: { key: string }) => t.key.startsWith('bankfee:')).map((t: { key: string }) => t.key)).toEqual(['bankfee:bank:1:2028-02']);
  await page.screenshot({ path: `test-results/v8-banking-${info.project.name}.png`, fullPage: true });
});
