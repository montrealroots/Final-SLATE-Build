// Your Papers from Home (the owner's command of November 14, 2026, 8 "Validate", the second journey): Home → Your Papers
// → a visitor visa checked, applied for and its fee paid from the bank → time passes → the decision, on its recorded day →
// the visa in use: entry allowed, work still not → Home. A Brazilian living in Mexico City, visiting the United States:
// 1221's B-1/B-2 record, $185 and 157 days. Desktop and phone in Chromium, and the iPhone 18 Pro Max in WebKit:
// emulation, not a physical device.
import { expect, test, type Page } from './test';
import { advance, nav, onlyOn, openStart, pinSeed } from './helpers';

const papersPanel = (page: Page) => page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Your Papers', exact: true }) }).first();

test('Home to Your Papers: a visa applied for and paid, decided on its day, in use, and Home again', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop', 'phone', 'iphone-18-pro-max']), 'Desktop, phone and the iPhone 18 Pro Max (WebKit).');
  test.setTimeout(300_000);
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Lia Moraes', pronouns: 'she', actingTitle: 'Actress', birthDate: '2007-03-02', birthplaceId: 'br-sao-paulo',
      heritages: [{ id: 'Brazilian', label: 'Brazilian', custom: false }], heritageCustomText: '', nationalities: ['BR'], mainLanguage: 'pt', languages: [],
      startPlaceId: 'mx-mexico-city', startDate: '2026-04-06', startTime: '08:00', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  // Labelled fixture: the world seed is pinned, as visas can be refused (from November 14, 2026, at the published rate:
  // 15.48% for a Brazilian applying to the United States), and this journey follows one that is granted.
  await pinSeed(page, 20261114);
  // Home: the passport in force, and work where you live allowed by the work visa she arrived on (from November 14, 2026;
  // until then the game assumed it).
  await expect(papersPanel(page)).toContainText('In force to');
  await expect(papersPanel(page)).toContainText('Work in MexicoAllowed');
  await expect(papersPanel(page)).not.toContainText('assumption');
  // The bank in Mexico City keeps pesos (from November 14, 2026; until then dollars).
  const pesos = async () => Number((await page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Your Bank', exact: true }) }).first().innerText()).match(/Available\s*MX\$([\d,]+)/)![1].replace(/,/g, ''));
  const before = await pesos();

  await page.getByRole('button', { name: 'Open Your Papers' }).click();
  await expect(page.getByRole('heading', { name: 'Your Papers', level: 1 })).toBeVisible();
  // The rail marks Your Papers, not Home (the owner, November 14, 2026).
  const rail = page.locator('nav.rail');
  await expect(rail.getByRole('button', { name: 'Your Papers', includeHidden: true })).toHaveAttribute('aria-current', 'page');
  await expect(rail.getByRole('button', { name: 'Home', exact: true, includeHidden: true })).not.toHaveAttribute('aria-current', /.+/);
  // Where you are, and for how long you may stay (from November 16, 2026): where you live, as long as you like.
  await expect(page.getByRole('status', { name: 'Your Stay' })).toHaveText("You're in Mexico, where you have the right to stay.");
  await page.getByLabel('Country', { exact: true }).selectOption('US');
  await expect(page.getByRole('status', { name: 'Entering' })).toContainText('you need a visa');
  await expect(page.locator('main')).toContainText('B-1/B-2 Visitor Visa: 185 USD, decided in 157 days, good for 10 years.');
  // All four kinds of work are listed at once; none is allowed by a visitor visa, before or after.
  const working = page.getByRole('list', { name: 'Working' });
  await expect(working.getByRole('listitem')).toHaveText([/^Acting: Not allowed yet\./, /^Directing: Not allowed yet\./, /^Producing: Not allowed yet\./, /^Writing: Not allowed yet\./]);
  await page.getByRole('button', { name: 'Apply And Pay The Fee' }).click();
  await expect(page.getByRole('list', { name: 'Your Applications' })).toContainText('Being decided');
  // Paid from the bank, once.
  await nav(page, 'Home');
  // $185 in pesos at the day's rate: between 15 and 25 to the dollar, rounded to the peso on Home.
  const after = await pesos();
  expect(before - after).toBeGreaterThan(185 * 15);
  expect(before - after).toBeLessThan(185 * 25);
  await expect(papersPanel(page)).toContainText('One application is being decided.');
  // Five months on, the decision on its recorded day.
  for (let i = 0; i < 6; i++) await advance(page, 'month');
  await nav(page, 'Home');
  await page.getByRole('button', { name: 'Open Your Papers' }).click();
  await expect(page.getByRole('list', { name: 'Your Applications' })).toContainText('Issued, until');
  await page.getByLabel('Country', { exact: true }).selectOption('US');
  await expect(page.getByRole('status', { name: 'Entering' })).toContainText('Your B-1/B-2 Visitor Visa lets you in');
  await expect(page.getByRole('list', { name: 'Working' })).toContainText('Acting: Not allowed yet.'); // still not leave to work
  await page.getByRole('button', { name: 'Back To Home' }).click();
  await expect(papersPanel(page)).not.toContainText('being decided');
});

// A visit's days counted (from November 16, 2026): a Japanese actor living in Toronto travels to Paris, and Your Papers
// counts the Schengen area's 90 days in any 180 from the day they arrive.
test('A visit to Paris counted against the Schengen area\'s 90 days, on Your Papers', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop', 'phone']), 'Desktop and phone.');
  test.setTimeout(180_000);
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Ren Aoki', pronouns: 'they', actingTitle: 'Actor', birthDate: '2007-03-02', birthplaceId: 'jp-tokyo',
      heritages: [{ id: 'Japanese', label: 'Japanese', custom: false }], heritageCustomText: '', nationalities: ['JP'], mainLanguage: 'ja', languages: [],
      startPlaceId: 'ca-toronto', startDate: '2026-04-06', startTime: '08:00', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Open Your Papers' }).click();
  await expect(page.getByRole('status', { name: 'Your Stay' })).toHaveText("You're in Canada, where you have the right to stay.");
  await page.getByLabel('Country', { exact: true }).selectOption('FR');
  await expect(page.locator('main')).toContainText('A visit may last 90 days in any 180, by the Schengen Borders Code');
  // The United States asks this passport for an ESTA, charged its own fee and time (from November 16, 2026).
  await page.getByLabel('Country', { exact: true }).selectOption('US');
  await expect(page.locator('main')).toContainText('ESTA (Electronic System for Travel Authorization): 40.62 USD, decided in 3 days');

  await nav(page, 'World');
  await page.getByLabel('Country Or Territory').selectOption({ label: 'France' });
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('paris');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Paris', exact: true }).click();
  await page.getByRole('button', { name: 'Travel Here' }).click();
  await expect(page.getByText("You've arrived in Paris.").first()).toBeVisible({ timeout: 30_000 });

  await nav(page, 'Home');
  await page.getByRole('button', { name: 'Open Your Papers' }).click();
  await expect(page.getByRole('status', { name: 'Your Stay' })).toHaveText(/^You're in France as a visitor: 1 of the 90 days in any 180 that the Schengen area allows are used\. You may stay until \d{4}-\d\d-\d\d\.$/);
});
