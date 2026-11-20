// J19, a long career through the screens (docs/v6/JOURNEYS.md: "that career through the screens"; from November 17,
// 2026). Two years of one game: a short made and released in the first, another in the second, each through the
// interface. Each counts once in the player's standing, the same after a reload, and the event queue stays bounded as
// the years pass (engine: tests/long-run.test.ts measures ten years). The company left play on November 14, 2026, so
// there is no company capacity to read across it. The world seed is pinned (helpers.ts pinSeed, 1994, the seed
// e2e/live-action.spec.ts reaches delivery with), a labelled fixture. Desktop, in Chromium.
import { expect, test, type Page } from './test';
import { addScene, advance, nav, newProject, onlyOn, pinSeed, pressSaveAndExit, produceToDelivery, quickLife, readSavedState, saveAndApprove, section, writePitch } from './helpers';

test.use({ actionTimeout: 20_000 });

async function makeAndRelease(page: Page, title: string, character: string, first: boolean): Promise<void> {
  await newProject(page, { title, format: 'Short Film', runtime: '8', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill(character);
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Harbour', chars: [character], minutes: '3' });
  if (first) await saveAndApprove(page); // the agreed starting backing is a first project's alone
  else {
    // A later project is paid for from the player's own money: the whole target, put in by their choice.
    await section(page, 'Script');
    await writePitch(page);
    await page.getByRole('button', { name: 'Save Draft' }).click();
    await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
    await expect(page.getByText('Approved', { exact: true })).toBeVisible();
    await section(page, 'Budget');
    const target = await page.getByLabel('Change Financing Target').inputValue();
    const own = page.locator('section', { has: page.getByRole('heading', { name: 'Your Own Account' }) });
    await own.getByLabel('Put In From Your Own Money').fill(target);
    await own.getByRole('button', { name: 'Put It In' }).click();
    await expect(page.getByRole('region', { name: 'Backers' })).toContainText('Your Own Money');
  }
  await produceToDelivery(page, { yourself: [character] });
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
  await page.getByLabel('Territory Code').fill('US');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  for (let i = 0; i < 3 && !(await history.getByText('Released', { exact: true }).count()); i++) {
    await advance(page, 'month');
    await nav(page, 'Projects');
    await page.getByRole('button', { name: title }).first().click();
    await section(page, 'Release');
  }
  await expect(history.getByText('Released', { exact: true })).toBeVisible();
}

test('J19: two years, two shorts made and released through the screens, each counted once, the queue bounded', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop']), 'One long career, at desktop width.');
  test.setTimeout(1_500_000);
  await quickLife(page, 'us-los-angeles', '2026-03-02');
  await pinSeed(page, 1994);

  await makeAndRelease(page, 'First Tide', 'Wren', true);
  await nav(page, 'Profile');
  await expect(page.getByLabel('Standing By Role')).toContainText('from 1 completed work');
  const queueAfterOne = (await readSavedState(page)).events.length;

  // A year on, the second.
  for (let i = 0; i < 6; i++) await advance(page, 'month');
  await nav(page, 'Home');
  await makeAndRelease(page, 'Second Tide', 'Odile', false);
  const s = await readSavedState(page);
  expect(new Date(s.now).getUTCFullYear()).toBeGreaterThanOrEqual(2027);
  await nav(page, 'Profile');
  await expect(page.getByLabel('Standing By Role')).toContainText('from 2 completed works');
  // The queue rises and falls with what's running; two careers' worth of years don't pile it up.
  expect(s.events.length, `events after one: ${queueAfterOne}`).toBeLessThan(queueAfterOne * 3);

  // Saved and continued: each work still counted once.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Profile');
  await expect(page.getByLabel('Standing By Role')).toContainText('from 2 completed works');
  await expect(page.getByLabel('Standing By Role')).not.toContainText('from 3');
});
