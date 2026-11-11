// Cinemas near a place (src/ui/Cinemas.tsx, docs/CINEMAS.md), from a made-up Wikidata list at the save's date: never
// called open, a closure with or without its date, nothing before it opens, and the country's total.
import { expect, test, type Page } from './test';
import { hashString } from '../src/engine/rng';
import { serveCatalog } from './catalog-fixture';
import { nav, newProject, quickLife, saveAndExit, section } from './helpers';
import { firstSaveId, readRecord, writeRecords } from './vault';

type State = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Edit the saved game in place (with its checksum), then reopen it: as awards.spec.ts does. */
async function editSave(page: Page, fn: (state: State) => void): Promise<void> {
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  fn(state);
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

async function openLondon(page: Page): Promise<void> {
  await nav(page, 'World');
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('london');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'London', exact: true }).first().click();
}

test('a place lists the cinemas recorded near it at the save\'s date', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'World');
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('london');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'London', exact: true }).first().click();
  const card = page.getByRole('region', { name: 'Cinemas Nearby' });
  await expect(card).toContainText('Wikidata records 4 cinemas within 25 km of London, 2 with no closure recorded, of which the game takes 1 to show films, as Wikidata gives its website or operator. It records 6 cinemas in United Kingdom.');
  const list = card.getByRole('list', { name: 'Cinemas near London' });
  await expect(list.locator('li', { hasText: 'Riverside Picturehouse (Fixture)' })).toContainText('Fixture Borough · Opened in 1932 · No closure recorded · 400 seats · Run by Fixture Cinemas');
  await expect(list.locator('li', { hasText: 'Old Odeon (Fixture)' })).toContainText('Opened on May 7, 1937 · Closed on June 30, 1999');
  await expect(list.locator('li', { hasText: 'Gaiety (Fixture)' })).toContainText("Recorded as closed; when isn't recorded");
  await expect(list.locator('li', { hasText: 'Old Electric (Fixture)' })).toContainText('No closure recorded, and no sign it still shows films');
  await expect(card).not.toContainText('New Screen (Fixture)'); // it opens in 2030
  await expect(card).not.toContainText('Northern Lights (Fixture)'); // Manchester, beyond 25 km
  await expect(card).toContainText('one with no closure recorded may be something else now');
  await page.screenshot({ path: `test-results/cinemas-${info.project.name}.png`, fullPage: true });
});

test('cinemas show the films in their run: the catalog\'s where they opened, and yours in its territories', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  test.setTimeout(180_000);
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await newProject(page, { title: 'Kite Season', format: 'Feature Film', runtime: '95' });
  // A labelled fixture: the film made through the UI is marked delivered and opened in British cinemas on January 3.
  await editSave(page, (s) => {
    const p = s.projects.find((x: State) => x.title === 'Kite Season');
    Object.assign(p, { phase: 'released', delivered: { at: Date.parse('2026-01-01T12:00:00Z'), runtimeMin: 95 }, quality: { overall: 90, reception: 95 } });
    p.releases = [{ id: 'r1', route: 'theatrical', date: '2026-01-03', territories: ['GB'], distributor: 'Coast Pictures', note: '', status: 'released' }];
  });
  await openLondon(page);
  const card = page.getByRole('region', { name: 'Cinemas Nearby' });
  const films = card.getByRole('list', { name: 'Films in cinemas in United Kingdom' });
  // In their run on January 5: yours (from January 3) and Paper Lanterns (December 30); not Harbour Lights, whose eight
  // weeks from October 1 are over, nor The Lantern Keeper, which opened in France.
  await expect(films.locator('li')).toHaveCount(2);
  await expect(films.locator('li').first()).toContainText('Kite Season');
  await expect(films.locator('li').first()).toContainText('Your Film');
  await expect(films.locator('li').nth(1)).toContainText('Paper Lanterns (Fixture)');
  await expect(films.locator('li').nth(1)).toContainText(/Opened December 30, 2025 · showing at \d cinemas? near London/);
  await expect(card).not.toContainText('Harbour Lights (Fixture)');
  await expect(card).toContainText('Opening soon: Night Ferry (Fixture) (January 9, 2026).');
  await expect(card).toContainText('What the cinemas show is simulated');
  // A closed cinema shows nothing.
  await expect(card.getByRole('list', { name: 'Cinemas near London' }).locator('li', { hasText: 'Old Odeon (Fixture)' })).not.toContainText('Showing:');
  await page.screenshot({ path: `test-results/cinemas-programme-${info.project.name}.png`, fullPage: true });

  // The film's page: where it plays, from the release page.
  await films.getByRole('button', { name: 'Kite Season' }).click();
  await section(page, 'Release');
  await expect(page.getByText(/United Kingdom: Showing at \d cinemas? of the 2 there the game takes to show films/)).toBeVisible();
});
