// The owner's v6 package, J01 (from November 13, 2026): a January 1, 2026 start shows only what was known then. The
// Golden Globes' and Oscars' recorded results appear on their pages only once announced, the nominees before the
// winners, and a reload shows each result once. The results are the organizers' own, read for this game
// (src/data/history/awards-2026.json); nothing of them is written into the save.
import { expect, test, type Page } from './test';
import { advance, nav, onlyOn, quickLife, readSavedState } from './helpers';

test.use({ actionTimeout: 20_000 });
/** An edition still to come is in the Calendar's list; one that has happened is on its day. */
async function open(page: Page, label: string, day?: string): Promise<void> {
  await nav(page, 'Calendar');
  if (day) {
    await page.getByRole('button', { name: new RegExp(`^\\w+day, ${day}, \\d+ entr`) }).click();
    await page.getByRole('listitem').filter({ hasText: `${label} Ceremony` }).getByRole('button', { name: 'View Details' }).click();
  } else {
    const events = page.getByRole('region', { name: 'Festivals And Awards' });
    await events.getByLabel('Search Events').fill(label.split(' ').slice(1, 3).join(' '));
    await events.getByRole('button', { name: label }).click();
  }
  await expect(page.getByRole('heading', { name: label, level: 1 })).toBeVisible();
}
// From November 14, 2026 (the owner's v8 decision 7) the recorded results are this save's history, each under its
// category; the card that listed them apart now says where they come from.
const recorded = (page: Page) => page.getByRole('region', { name: 'Where The Record Comes From' });
const cats = (page: Page) => page.locator('section', { has: page.locator('#categories-h') });
async function weeksTo(page: Page, day: string): Promise<void> {
  for (let i = 0; i < 12; i++) {
    const s = await readSavedState(page);
    if (new Date(s.now).toISOString().slice(0, 10) >= day) return;
    await advance(page, 'week');
  }
}

test('J01: recorded award results appear only once announced, the nominees before the winners, and once each after a reload', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop', 'phone', 'iphone-18-pro-max']), 'Desktop, phone and the iPhone 18 Pro Max (WebKit).');
  test.setTimeout(600_000);
  await quickLife(page, 'us-los-angeles', '2026-01-01');

  // January 1: neither ceremony has happened. The Golden Globes' nominees were announced on December 8, 2025, and are
  // shown (from November 19, 2026); no winner is, and nothing of the Oscars.
  await open(page, '83rd Golden Globe Awards');
  await expect(cats(page)).toContainText('Hamnet, Frankenstein, It Was Just an Accident, Sentimental Value, Sinners, The Secret Agent');
  await expect(cats(page)).not.toContainText('Winner: Hamnet');
  await open(page, '98th Academy Awards');
  await expect(recorded(page)).toContainText('No results for the 98th Academy Awards have been announced yet.');

  // After January 11: the Golden Globes' winners, under their categories, from the record, with where it comes from.
  await weeksTo(page, '2026-01-13');
  await open(page, '83rd Golden Globe Awards', 'January 11, 2026');
  await expect(cats(page)).toContainText('Winner: Hamnet.');
  await expect(cats(page)).toContainText('Winner: Paul Thomas Anderson, for One Battle After Another.');
  await expect(cats(page)).toContainText('From the record.');
  await expect(recorded(page).getByRole('link', { name: "'One Battle After Another' and 'Hamnet' Take Best Picture Prizes at Golden Globes" })).toBeVisible();

  // After January 22, before March 15: the Oscars' Best Picture nominees, and no winner.
  await weeksTo(page, '2026-01-23');
  await open(page, '98th Academy Awards');
  await expect(cats(page)).toContainText('Nominees: One Battle after Another, Bugonia, F1, Frankenstein, Hamnet');
  await expect(cats(page)).not.toContainText('Winner: One Battle');
  await page.screenshot({ path: `test-results/v6-history-oscars-nominees-${info.project.name}.png`, fullPage: true });

  // Saved and opened again: each result once, and none of it in the save.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await open(page, '98th Academy Awards');
  // Best Picture's field, whole: from November 19, 2026 the crafts' fields list One Battle after Another first too.
  expect(((await cats(page).textContent()) ?? '').split('Nominees: One Battle after Another, Bugonia, F1, Frankenstein, Hamnet').length - 1).toBe(1);
  expect(JSON.stringify(await readSavedState(page))).not.toContain('Train Dreams');
});
