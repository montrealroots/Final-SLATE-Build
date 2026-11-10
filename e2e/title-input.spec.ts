// A working title typed into New Script while the game runs (November 10, 2026). Twice in CI a title filled right after
// a new game opened was gone when Create Project was pressed (QA-REPORT.md, Open: runs 117 and 138, both WebKit). This is
// that moment: the game has just opened, its first save is being written and the clock is ticking while the title is
// typed, edited, cleared, inserted at once and submitted. Each step reads the field back before the next, and the
// project is checked under the name typed. It runs on desktop and both WebKit iPhone profiles (playwright.config.ts).
//
// Paste is inserted text: Playwright can't reach the clipboard in WebKit, so the text arrives at once, through the same
// editing path a paste uses (an insertText input event), not character by character.
import { expect, test } from './test';
import { nav, quickLife } from './helpers';

test('a title typed, edited, cleared, pasted and submitted while the game runs keeps every character', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-03-02');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  const title = page.getByLabel('Working Title');

  // At once, as the CI journeys did, while the first save and the clock run.
  await title.fill('Night Ferry');
  await expect(title).toHaveValue('Night Ferry');
  // Typed one key at a time across many clock ticks, at the end of what is there.
  await title.press('End');
  await title.pressSequentially(' To Wolfe Island', { delay: 120 });
  await expect(title).toHaveValue('Night Ferry To Wolfe Island');
  // Edited in the middle: a word removed by deleting backwards.
  for (let i = 0; i < ' To Wolfe Island'.length; i++) await title.press('Backspace');
  await expect(title).toHaveValue('Night Ferry');
  // Cleared, then pasted.
  await title.press('ControlOrMeta+A');
  await title.press('Backspace');
  await expect(title).toHaveValue('');
  await page.keyboard.insertText('The Last Ferry');
  await expect(title).toHaveValue('The Last Ferry');
  await expect(title).toBeFocused();
  // The time passed while typing: the clock ran, so the game was updating throughout.
  await expect(page.locator('.save-state')).toHaveText(/Saved/);
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'The Last Ferry', level: 1 })).toBeVisible();
});
