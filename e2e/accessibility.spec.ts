import { expect, test } from '@playwright/test';
import { audit } from './a11y';
import { nav, quickLife } from './helpers';

// Automated accessibility checks on every main screen. They don't replace a screen-reader pass by a person.
test.beforeEach(({}, info) => test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.'));

const SCREENS = ['Home', 'Calendar', 'World', 'Projects', 'Profile', 'Saved Games', 'Settings'] as const;

test('main screens: names, ids, headings; reduced motion; 200% text without sideways scrolling', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await quickLife(page, 'gb-london', '2026-03-02');
  const problems: string[] = [];
  for (const s of SCREENS) {
    await nav(page, s);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    problems.push(...(await audit(page, s)));
  }
  // Reduced motion: no transitions run.
  const moving = await page.evaluate(() => [...document.querySelectorAll('button')].some((b) => parseFloat(getComputedStyle(b).transitionDuration) > 0));
  expect(moving).toBe(false);
  // 200% text: the root size doubles; nothing scrolls sideways on any main screen.
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  for (const s of SCREENS) {
    await nav(page, s);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (over > 1) problems.push(`${s} at 200% text scrolls sideways by ${over}px`);
  }
  expect(problems).toEqual([]);
});
