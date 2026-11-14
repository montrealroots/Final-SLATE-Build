// A phone shows its own responsive layout (src/ui/layout-mode.ts; the owner's v8 decision 9, November 14, 2026), and Settings
// can show the desktop's layout shrunk instead, kept on that device (the default from November 13 to 14, 2026). Only on phone-sized projects: a desktop browser
// ignores the viewport tag.
import { expect, test } from './test';
import { seededLife } from './helpers';

const viewport = (page: import('@playwright/test').Page) => page.evaluate(() => ({ tag: document.querySelector('meta[name="viewport"]')!.getAttribute('content'), width: innerWidth, scroll: document.documentElement.scrollWidth, scale: visualViewport?.scale ?? 1 }));

test('a phone shows its own readable layout, and Settings can shrink the desktop layout instead', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'A desktop browser ignores the viewport tag.');
  await seededLife(page, 'gb-london', '2026-01-05', 3);
  const rail = page.getByRole('navigation', { name: 'Main Navigation' });
  const menu = page.getByRole('button', { name: 'Menu', exact: true });

  // The phone's own layout by default (v8 decision 9): the device's width, nothing past its edge, the rail a drawer.
  const v = await viewport(page);
  expect(v.tag).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  expect(v.width).toBeLessThan(901);
  expect(v.scroll).toBeLessThanOrEqual(v.width);
  expect(v.scale).toBe(1);
  await expect(menu).toBeVisible();

  // The desktop's layout, shrunk, chosen in Settings: 1280 wide, the rail beside the page; kept after a reload.
  await menu.click();
  await rail.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Phone Layout' }).uncheck();
  await expect.poll(async () => (await viewport(page)).width).toBe(1280);
  await expect(menu).toBeHidden();
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click().catch(() => {});
  expect((await viewport(page)).tag).toBe('width=1280, viewport-fit=cover');

  // And back.
  await rail.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Phone Layout' }).check();
  await expect.poll(async () => (await viewport(page)).tag).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  await expect(menu).toBeVisible();
});
