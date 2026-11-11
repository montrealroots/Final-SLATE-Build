// Cinemas near a place (src/ui/Cinemas.tsx, docs/CINEMAS.md), from a made-up Wikidata list at the save's date: never
// called open, a closure with or without its date, nothing before it opens, and the country's total.
import { expect, test } from './test';
import { serveCatalog } from './catalog-fixture';
import { nav, quickLife } from './helpers';

test('a place lists the cinemas recorded near it at the save\'s date', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'World');
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('london');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'London', exact: true }).first().click();
  const card = page.getByRole('region', { name: 'Cinemas Nearby' });
  await expect(card).toContainText('Wikidata records 3 cinemas within 25 km of London, 1 with no closure recorded, and 5 cinemas in United Kingdom.');
  const list = card.getByRole('list', { name: 'Cinemas near London' });
  await expect(list.locator('li', { hasText: 'Riverside Picturehouse (Fixture)' })).toContainText('Fixture Borough · Opened in 1932 · No closure recorded · 400 seats · Run by Fixture Cinemas');
  await expect(list.locator('li', { hasText: 'Old Odeon (Fixture)' })).toContainText('Opened on May 7, 1937 · Closed on June 30, 1999');
  await expect(list.locator('li', { hasText: 'Gaiety (Fixture)' })).toContainText("Recorded as closed; when isn't recorded");
  await expect(card).not.toContainText('New Screen (Fixture)'); // it opens in 2030
  await expect(card).not.toContainText('Northern Lights (Fixture)'); // Manchester, beyond 25 km
  await expect(card).toContainText('one with no closure recorded may be something else now');
  await page.screenshot({ path: `test-results/cinemas-${info.project.name}.png`, fullPage: true });
});
