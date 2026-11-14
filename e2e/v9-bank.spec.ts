// Your Bank from Home (the owner's command of November 14, 2026, 8 "Validate", the first journey): Home → Your Bank →
// a savings account opened → money moved into it → an account applied for at a second bank, its opening deposit sent →
// the bank's decision days later, the deposit settled → the statement → Home, which reads the same journal. The bank is
// 1221's (src/engine/bankworld); its rules are tests/bankworld. Desktop and phone in Chromium, and the iPhone 15 Pro
// Max in WebKit: emulation, not a physical device.
import { expect, test, type Page } from './test';
import { advance, nav, quickLife } from './helpers';

const homeBank = (page: Page) => page.locator('section, .panel', { has: page.getByRole('heading', { name: 'Your Bank', exact: true }) }).first();
/** Chooses the option whose words include `words`: an account's name, with its number and balance after it. */
const pick = async (select: ReturnType<Page['locator']>, words: string) => {
  const label = (await select.locator('option').allInnerTexts()).find((x) => x.includes(words));
  expect(label, words).toBeDefined();
  await select.selectOption({ label: label! });
};
const openBank = async (page: Page) => {
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await expect(page.getByRole('heading', { name: 'Your Bank', level: 1 })).toBeVisible();
};

test('Home to Your Bank: savings opened, money moved, a second bank applied for and decided, the statement, and Home again', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
  test.setTimeout(240_000);
  await quickLife(page, 'us-los-angeles', '2028-01-26');
  // Home reads the journal: what is available, pending and owed, apart.
  await expect(homeBank(page)).toContainText('At Chase.');
  await expect(homeBank(page)).toContainText('Available$25,000,000');
  await expect(homeBank(page)).toContainText('PendingNothing');
  await expect(homeBank(page)).toContainText('OwedNothing');
  await openBank(page);
  await expect(page.getByRole('heading', { name: 'Chase Total Checking' })).toBeVisible();

  // A savings account at the same bank: opened at once, empty.
  await page.getByRole('button', { name: 'Open A Chase Savings' }).click();
  await expect(page.getByText('2 accounts')).toBeVisible();
  // $1,000 moved into it.
  const move = page.locator('.panel, section', { has: page.getByRole('button', { name: 'Move It' }) }).first();
  await pick(move.getByLabel('From'), 'Chase Total Checking');
  await pick(move.getByLabel('To'), 'Chase Savings');
  await move.getByLabel('Amount (USD)').fill('1000');
  await move.getByRole('button', { name: 'Move It' }).click();
  await expect(page.locator('.bank-toasts')).toContainText('Moved $1,000 to Chase Savings.');

  // A current account at a second bank: applied for with its opening deposit, decided days later.
  const other = page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Open An Account At Another Bank' }) }).first();
  await other.getByLabel('Bank').selectOption({ label: 'Bank of America' });
  await other.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.bank-toasts')).toContainText(/Bank of America/);
  await expect(page.getByText(/Bank of America decides by/).first()).toBeVisible();
  for (let i = 0; i < 8 && (await page.getByText(/Bank of America decides by/).count()); i++) await advance(page, 'next-day');
  await nav(page, 'Home');
  await openBank(page);
  await expect(page.getByText(/Bank of America decides by/)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Advantage Plus Banking' })).toBeVisible(); // Bank of America's, opened
  await expect(page.getByText('2 checking accounts')).toBeVisible();

  // The statement lists the move, and the balance after it.
  await page.getByRole('tab', { name: 'Statements' }).click();
  await expect(page.getByRole('heading', { name: 'Statements' })).toBeVisible();
  const statements = page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Statements' }) }).first();
  await statements.getByLabel('Period').selectOption({ label: 'January 2028' });
  await expect(statements).toContainText('Your Inheritance');
  await expect(statements).toContainText('1,000.00');
  await expect(statements).toContainText('100.00');

  // Back to Home: one journal, the same figures.
  await page.getByRole('button', { name: 'Back To Home' }).click();
  await expect(homeBank(page)).toContainText('Available');
  await expect(homeBank(page)).not.toContainText('Available$25,000,000'); // the opening deposit and the move are read
});
