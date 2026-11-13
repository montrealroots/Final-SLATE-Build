// A phone shows the desktop's layout, 1280 wide and shrunk to fit its screen (src/ui/layout-mode.ts; the owner, November 13, 2026), and
// Settings brings back the phone's own layout, kept on that device. Only on phone-sized projects: a desktop browser
// ignores the viewport tag.
import { expect, test } from './test';
import { seededLife } from './helpers';

const viewport = (page: import('@playwright/test').Page) => page.evaluate(() => ({ tag: document.querySelector('meta[name="viewport"]')!.getAttribute('content'), width: innerWidth, scroll: document.documentElement.scrollWidth, scale: visualViewport?.scale ?? 1 }));

test('a phone shows the desktop layout shrunk to fit, and Settings brings back the phone layout', async ({ page }, info) => {
  test.skip(info.project.name === 'desktop', 'A desktop browser ignores the viewport tag.');
  await seededLife(page, 'gb-london', '2026-01-05', 3);
  const rail = page.getByRole('navigation', { name: 'Main Navigation' });
  const menu = page.getByRole('button', { name: 'Menu', exact: true });

  // The desktop's layout, a carbon copy: 1280 wide as a desktop is, shrunk to the screen, nothing past its edge; the rail
  // beside the page; the touch screen's larger controls off, so a button is the desktop's size.
  const v = await viewport(page);
  expect(v.tag).toBe('width=1280, viewport-fit=cover');
  expect(v.width).toBe(1280);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--control').trim())).not.toBe('44px');
  expect(v.scroll).toBeLessThanOrEqual(v.width);
  expect(v.scale).toBeLessThan(1);
  await expect(rail).toBeVisible();
  await expect(menu).toBeHidden();
  await rail.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();

  // The phone's own layout, chosen in Settings: the device's width, the rail a drawer behind Menu; kept after a reload.
  await rail.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Phone Layout' }).check();
  await expect.poll(async () => (await viewport(page)).tag).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  await expect(menu).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click().catch(() => {});
  expect((await viewport(page)).tag).toBe('width=device-width, initial-scale=1, viewport-fit=cover');
  await expect(menu).toBeVisible();

  // And back.
  await menu.click();
  await rail.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Phone Layout' }).uncheck();
  await expect.poll(async () => (await viewport(page)).width).toBe(1280);
  await expect(menu).toBeHidden();
});
