// Homes And Property is set aside (the owner, November 17, 2026: "remove it for now", to pick up later): no way in is
// left on the rail, on Home or in the credits. Its engine and screens are kept (routes.ts HOMES_SHOWN); this file goes
// when it comes back, and e2e/homes.spec.ts runs again.
import { expect, test } from './test';
import { nav, onlyOn, openMenuIfNeeded, quickLife } from './helpers';
import { HOMES_SHOWN } from '../src/ui/routes';

test.skip(HOMES_SHOWN, 'Homes And Property is in the game');

test('Homes And Property is set aside: no rail entry, no panel on Home, and no housing credits', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop', 'phone']), 'Desktop and phone.');
  await quickLife(page, 'gb-london', '2026-03-02');
  // Home keeps Your Bank and Your Papers, and has no Homes And Property beside them.
  await expect(page.getByRole('button', { name: 'Open Your Bank' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Your Papers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Open Homes And Property' })).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText('Homes And Property');
  // The rail lists You's pages without it.
  await openMenuIfNeeded(page);
  const rail = page.getByRole('navigation').first();
  await expect(rail).toContainText('Your Papers');
  await expect(rail).not.toContainText('Homes');
  // The housing data's credits go with it; the rest stay.
  await nav(page, 'Settings');
  const credits = page.getByRole('list', { name: "Where The Game's Facts Come From" });
  await expect(credits).toContainText('GeoNames');
  for (const gone of ['HDB resales', 'Rents in the United Kingdom', 'Home values and rents in the United States', 'Housing rules']) await expect(credits).not.toContainText(gone);
});
