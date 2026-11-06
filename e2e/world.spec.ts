import { expect, test } from '@playwright/test';
import { createCharacter, freshStart, nav, quickLife } from './helpers';

test('a life can start anywhere in the world, and world places travel and persist', async ({ page }) => {
  await freshStart(page);
  await createCharacter(page, {
    name: 'Ola Nordmann', pronouns: 'They/Them', birthDate: '1995-02-14',
    birthplace: 'Krakow', birthCountry: 'Poland', heritages: ['Polish'], mainLanguage: 'English', extraLanguages: [],
    start: 'Stavanger', startCountry: 'Norway', startDate: '2026-06-01', startTime: '09:00',
  });
  await nav(page, 'Profile');
  await expect(page.getByText(/Kraków, .*Poland/)).toBeVisible();

  await nav(page, 'World');
  await expect(page.getByRole('heading', { name: 'World', level: 1 })).toBeVisible();
  await expect(page.getByText(/You're in Stavanger, .*Norway/)).toBeVisible();
  // The country starts on where you are; switch to Finland and filter.
  await page.getByLabel('Country Or Territory').selectOption({ label: 'Finland' });
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('zzzzqx');
  await expect(page.getByText("No places match 'zzzzqx'. Try a city, region, or country.")).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('turku');
  await expect(page.getByRole('img', { name: /Map of Finland/ })).toBeVisible();
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Turku', exact: true }).click();
  await expect(page.getByRole('heading', { name: /Turku/, level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Travel Here' }).click();
  await expect(page.getByText("You've arrived in Turku.").first()).toBeVisible({ timeout: 30_000 });

  // The world place survives a reload from the saved game.
  await page.reload();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await nav(page, 'World');
  await expect(page.getByText(/You're in Turku, .*Finland/)).toBeVisible();
});

test('a failed place load offers Try Again and recovers', async ({ page }) => {
  await freshStart(page);
  let fail = true;
  await page.route(/places\/IS\.tsv/, (route) => (fail ? route.abort() : route.continue()));
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Test');
  await page.getByLabel('Pronouns').selectOption({ label: 'She/Her' });
  await page.getByRole('button', { name: 'Next: Birth Date And Birthplace' }).click();
  await page.getByLabel('Country Or Territory').selectOption({ label: 'Iceland' });
  await expect(page.getByText("Places couldn't be loaded.")).toBeVisible();
  fail = false;
  await page.getByRole('button', { name: 'Try Again' }).click();
  await page.getByRole('searchbox', { name: 'Birthplace' }).fill('reykjav');
  await expect(page.getByRole('group', { name: 'Birthplace Results' }).getByRole('button').first()).toContainText('Reykjavík');
});

test('holidays past the last official announcement are shown as projected', async ({ page }) => {
  await quickLife(page, 'cn-shanghai', '2026-12-20');
  await nav(page, 'World');
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('shanghai');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Shanghai', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Upcoming Public Holidays' });
  await expect(panel.getByText(/2027.*\(projected\)/).first()).toBeVisible();
  await expect(panel.getByText('Dates after 2026 are projected from the law until the government announces them.')).toBeVisible();
});
