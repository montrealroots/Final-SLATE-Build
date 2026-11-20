// J18, Catalog and offline, the step it didn't run (docs/v6/JOURNEYS.md: "opening a save with the network off"; from
// November 17, 2026). A save opens with the network off, and Home, already loaded, works. A page whose code hasn't been
// loaded yet can't arrive offline: until November 17, 2026 that blanked the whole screen; it says so now, the frame and
// its navigation stay, and Home still works. Desktop, in Chromium.
import { expect, expectErrors, test } from './test';
import { nav, onlyOn, pressSaveAndExit, quickLife } from './helpers';

test('J18: a save opened with the network off, and a page that can\'t load said so without losing the game', async ({ page, context }, info) => {
  test.skip(!onlyOn(info, ['desktop']), 'One run, at desktop width.');
  // Labelled fixture: the network is switched off; the page's fetch failing is what this journey is about.
  expectErrors('The network is switched off, so the bank page\'s code fails to load: that failure is what this journey shows.');
  await quickLife(page, 'gb-london', '2026-03-02');
  await pressSaveAndExit(page);
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible({ timeout: 30_000 });
  // Your Bank's page hasn't been loaded in this session, so it can't arrive offline.
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  const alert = page.getByRole('alert').filter({ hasText: "This Page Couldn't Be Loaded" });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText('Check your connection, then reload the game: it saves first.');
  // The game is still there: back to Home, which works.
  await nav(page, 'Home');
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  // Online again, Reload The Game saves and reloads, and the bank opens.
  await context.setOffline(false);
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await page.getByRole('button', { name: 'Reload The Game' }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await expect(page.getByRole('heading', { name: 'Your Bank', level: 1 })).toBeVisible();
});
