// A payment abroad, quoted on screen before it's sent (RESUME-HERE's open item since November 14, 2026: the engine kept a
// payment abroad's quote and settled what was quoted, tests/v9-fx.test.ts, but no journey showed the quote, as a new life
// has no account at a bank abroad). A British and American citizen starts in London, makes New York home, keeps the
// British account (now held from abroad) beside the one the move opens in New York, and the money form says what the payment costs
// and when it lands before Move It. Desktop and phone in Chromium.
import { expect, test, type Page } from './test';
import { nav, onlyOn, openStart } from './helpers';

/** Chooses the option whose words include `words`: an account's name, with its number and balance after it. */
const pick = async (select: ReturnType<Page['locator']>, words: string | RegExp) => {
  const label = (await select.locator('option').allInnerTexts()).find((x) => (typeof words === 'string' ? x.includes(words) : words.test(x)));
  expect(label, String(words)).toBeDefined();
  await select.selectOption({ label: label! });
};
const openBank = async (page: Page) => {
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await expect(page.getByRole('heading', { name: 'Your Bank', level: 1 })).toBeVisible();
};

test('A payment abroad, between a London account and a New York one, is quoted before it is sent', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop', 'phone']), 'Desktop and phone.');
  test.setTimeout(300_000);
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Nell Ashby', pronouns: 'she', actingTitle: 'Actress', birthDate: '2007-03-02', birthplaceId: 'gb-london',
      heritages: [{ id: 'English', label: 'English', custom: false }], heritageCustomText: '', nationalities: ['GB', 'US'], mainLanguage: 'en', languages: [],
      startPlaceId: 'gb-london', startDate: '2026-04-06', startTime: '08:00', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();

  // New York becomes home: a US citizen needs no papers to live there.
  await nav(page, 'World');
  await page.getByLabel('Country Or Territory').selectOption({ label: 'United States' });
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('new york');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: /^New York/ }).first().click();
  await page.getByRole('button', { name: 'Make This Your Home' }).click();
  await expect(page.getByText('You live here.').first()).toBeVisible({ timeout: 30_000 });

  // Making New York home opened a Chase account there, and Barclays now keeps the London one for a customer abroad.
  await nav(page, 'Home');
  await openBank(page);
  await expect(page.getByRole('heading', { name: 'Chase Total Checking' })).toBeVisible();

  // The money form, from the London account to the New York one: the quote is said before Move It.
  const move = page.locator('.panel, section', { has: page.getByRole('button', { name: 'Move It' }) }).first();
  await pick(move.getByLabel('From'), 'Barclays');
  await pick(move.getByLabel('To'), 'Chase Total Checking');
  await move.getByLabel(/^Amount \(GBP\)$/).fill('1000');
  await expect(move).toContainText(/sends £1,000\.00 for (a £[\d,.]+ fee|no fee)\./);
  await expect(move).toContainText(/under the estimated exchange rate/);
  await expect(move).toContainText(/receives \$[\d,.]+/);
  await expect(move).toContainText(/ GBP to the dollar from \d{4}-\d\d-\d\d/);
});
