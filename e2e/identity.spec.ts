// Identity from 1221 (November 8, 2026), through the interface: a legal name in parts and a preferred name, a headshot,
// and citizenship from the place of birth, with what each one changes. The credits side (your legal name, your headshot
// beside your own lines) is checked on a delivered project in e2e/careers.spec.ts. Fixture: makePhoto, a drawn photo.
import { expect, test, type Page } from './test';
import { addScene, createCharacter, freshStart, makePhoto, nav, newProject, openMenuIfNeeded, section, writePitch } from './helpers';

async function approveWithoutBacking(page: Page): Promise<void> {
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Wanjiku');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Market', chars: ['Wanjiku'], minutes: '3' });
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await section(page, 'Budget');
}

test('a preferred name, a headshot and a citizenship, and what each one changes', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  await freshStart(page);
  const photo = await makePhoto(page);
  await createCharacter(page, {
    name: 'Nia Halvorsen', middleName: 'Wanjiru', preferredName: 'Wanjiru', portrait: photo, pronouns: 'She/Her', birthDate: '1990-05-20',
    birthplace: 'Nairobi', heritages: ['Kikuyu'], nationalities: ['Kenya'], mainLanguage: 'English', extraLanguages: [], start: 'London', startDate: '2026-01-05', startTime: '08:00',
  }, async (page) => {
    // Review says who you'll be: the legal name as the heading, the headshot, the preferred name and citizenship.
    await expect(page.locator('#creation-h')).toHaveText('Nia Wanjiru Halvorsen');
    await expect(page.getByRole('img', { name: 'Headshot for Nia Wanjiru Halvorsen' })).toBeVisible();
    const identity = page.locator('section.card', { has: page.getByRole('heading', { name: 'Identity', exact: true }) });
    await expect(identity).toContainText('Preferred Name');
    await expect(identity).toContainText('Wanjiru');
    await expect(identity).toContainText('Citizenship');
    await expect(identity).toContainText('Kenya');
    await page.screenshot({ path: `test-results/identity-${info.project.name}-review.png`, fullPage: true });
  });

  // People call you by your preferred name: Home's greeting and the rail.
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), Wanjiru\.$/, level: 1 })).toBeVisible();
  await openMenuIfNeeded(page); // on a phone the rail is a drawer
  await expect(page.getByRole('button', { name: 'Wanjiru, Open Your Player Profile' })).toBeVisible();

  // Profile: the headshot, the name you go by, the legal name your credits carry, citizenship and home countries.
  await nav(page, 'Profile');
  await expect(page.getByRole('heading', { name: 'Wanjiru', level: 1 })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Headshot for Wanjiru' })).toBeVisible();
  const about = page.locator('section.card', { has: page.getByRole('heading', { name: 'About' }) });
  await expect(about).toContainText('Nia Wanjiru Halvorsen · on your credits');
  await expect(about).toContainText('Citizenship');
  await expect(about).toContainText('Kenya (citizen), United Kingdom (you live there)');
  await page.screenshot({ path: `test-results/identity-${info.project.name}-profile.png`, fullPage: true });

  // A country's public fund supports its citizens and residents: closed for a project based in France, open in London.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Market Day', format: 'Short Film', runtime: '6', budget: 'Micro Budget', base: { place: 'Paris', country: 'France' } });
  await approveWithoutBacking(page);
  const raise = page.locator('section.card', { has: page.getByRole('heading', { name: 'Raise Money' }) });
  await expect(raise.locator('li', { hasText: 'Screen Arts Fund Grant' })).toContainText("This project is based in France, and its public fund supports its citizens and the people who live there. You're a citizen of Kenya and live in the United Kingdom.");
  await expect(page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' })).toBeDisabled();
  await nav(page, 'Projects');
  await newProject(page, { title: 'Night Bus', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await approveWithoutBacking(page);
  await expect(page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' })).toBeEnabled();
});
