// Journey D of the gameplay-connectivity pass (November 10, 2026): one choice changed in an otherwise identical game,
// compared through the screens. The same life, the same pinned world seed and the same short film, made twice through
// the same controls. The only difference is where the story is set: at the production's base (London) or abroad
// (Paris). The estimate, read line by line on the Budget page, differs by a researcher alone. Every other line is
// identical: the designers research a setting abroad, and nothing else changes (tests/decision-effects.test.ts
// compares the same choice in the engine).
import { expect, test, type Page } from './test';
import { addScene, nav, pinSeed, quickLife, saveAndApprove, section } from './helpers';

test.use({ actionTimeout: 20_000 });

/** The film, made with the story set at home or in Paris; returns every line still to come in its estimate. */
async function makeAndRead(page: Page, abroad: boolean): Promise<string[]> {
  await quickLife(page, 'gb-london', '2026-09-01');
  await pinSeed(page, 3);
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('Far Shore');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByText('Where The Story Is Set (Optional)').click();
  const setting = page.locator('details', { hasText: 'Where The Story Is Set (Optional)' });
  const [country, city] = abroad ? ['France', 'Paris'] : ['United Kingdom', 'London'];
  await setting.getByRole('combobox', { name: 'Story Setting Place, Country Or Territory' }).selectOption({ label: country });
  await setting.getByRole('searchbox', { name: 'Story Setting Place' }).fill(city);
  await setting.getByRole('group', { name: 'Story Setting Place Results' }).getByRole('button').first().click();
  await expect(setting.getByText(new RegExp(`^Chosen: ${city}`))).toBeVisible();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Far Shore', level: 1 })).toBeVisible();
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Quay', chars: ['Ines'], minutes: '3' });
  await saveAndApprove(page); // the same pitch, approval and starting backing in both
  await section(page, 'Budget');
  const toCome = page.locator('details', { has: page.locator('summary', { hasText: /^Everything Still To Come/ }) });
  await toCome.locator('summary').click();
  await expect(toCome.locator('li').first()).toBeVisible();
  await page.screenshot({ path: `test-results/journey-d-${abroad ? 'abroad' : 'home'}.png`, fullPage: true });
  return (await toCome.locator('li').allInnerTexts()).map((t) => t.trim());
}

test('journey D: the same film set at home or abroad differs by its setting research, and by nothing else', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'A comparison of two games, at desktop width.');
  const home = await makeAndRead(page, false);
  // The second game in a browser of its own, so nothing of the first carries over.
  const other = await browser.newContext({ baseURL: info.project.use.baseURL, viewport: info.project.use.viewport });
  const abroad = await makeAndRead(await other.newPage(), true);
  await other.close();
  const research = (l: string) => /^Researcher: \$/.test(l);
  expect(home.some(research)).toBe(false);
  expect(abroad.filter(research)).toHaveLength(1);
  expect(abroad.filter((l) => !research(l))).toEqual(home);
  expect(home.length).toBeGreaterThan(3);
});
