// Your Papers from Home (the owner's command of November 14, 2026, 8 "Validate", the second journey): Home → Your Papers
// → a visitor visa checked, applied for and its fee paid from the bank → time passes → the decision, on its recorded day →
// the visa in use: entry allowed, work still not → Home. A Brazilian living in Mexico City, visiting the United States:
// 1221's B-1/B-2 record, $185 and 157 days. Desktop and phone in Chromium, and the iPhone 15 Pro Max in WebKit:
// emulation, not a physical device.
import { expect, test, type Page } from './test';
import { advance, nav, openStart } from './helpers';

const papersPanel = (page: Page) => page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Your Papers', exact: true }) }).first();

test('Home to Your Papers: a visa applied for and paid, decided on its day, in use, and Home again', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
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
  // Home: the passport in force, and work where you live is the game's assumption, said as one.
  await expect(papersPanel(page)).toContainText('In force to');
  await expect(papersPanel(page)).toContainText('Allowed by the game\'s assumption');
  const before = Number((await page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Your Bank', exact: true }) }).first().innerText()).match(/Available\s*\$([\d,]+)/)![1].replace(/,/g, ''));

  await page.getByRole('button', { name: 'Open Your Papers' }).click();
  await expect(page.getByRole('heading', { name: 'Your Papers', level: 1 })).toBeVisible();
  await page.getByLabel('Country', { exact: true }).selectOption('US');
  await expect(page.getByRole('status', { name: 'Entering' })).toContainText('you need a visa');
  await expect(page.locator('main')).toContainText('B-1/B-2 Visitor Visa: 185 USD, decided in 157 days.');
  // Acting there isn't allowed by a visitor visa, before or after.
  await expect(page.locator('main')).toContainText('Not allowed yet.');
  await page.getByRole('button', { name: 'Apply And Pay The Fee' }).click();
  await expect(page.getByRole('list', { name: 'Your Applications' })).toContainText('Being decided');
  // Paid from the bank, once.
  await nav(page, 'Home');
  const after = Number((await page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Your Bank', exact: true }) }).first().innerText()).match(/Available\s*\$([\d,]+)/)![1].replace(/,/g, ''));
  expect(before - after).toBe(185);
  await expect(papersPanel(page)).toContainText('One application is being decided.');
  // Five months on, the decision on its recorded day.
  for (let i = 0; i < 6; i++) await advance(page, 'month');
  await nav(page, 'Home');
  await page.getByRole('button', { name: 'Open Your Papers' }).click();
  await expect(page.getByRole('list', { name: 'Your Applications' })).toContainText('Issued, until');
  await page.getByLabel('Country', { exact: true }).selectOption('US');
  await expect(page.getByRole('status', { name: 'Entering' })).toContainText('Your B-1/B-2 Visitor Visa lets you in');
  await expect(page.locator('main')).toContainText('Not allowed yet.'); // still not leave to work
  await page.getByRole('button', { name: 'Back To Home' }).click();
  await expect(papersPanel(page)).not.toContainText('being decided');
});
