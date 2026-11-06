import { expect, test, type Page } from './test';
import { advance, section, staffEveryDepartment, secureStartingBacking } from './helpers';

async function quickStart(page: Page, place: string): Promise<void> {
  await page.goto('/');
  await page.evaluate((pl) => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Kwame Asante-Lindgren', pronouns: 'he', actingTitle: 'Actor', birthDate: '1985-07-04', birthplaceId: 'za-johannesburg',
      heritages: [{ id: 'Akan', label: 'Akan', custom: false }, { id: 'Swedish', label: 'Swedish', custom: false }], heritageCustomText: '', mainLanguage: 'en',
      languages: [{ code: 'tw', proficiency: 'Fluent' }], startPlaceId: pl, startDate: '2026-04-06', startTime: '09:00', updatedAt: 1,
    }));
  }, place);
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
}

test('3D animation through the UI: voice cast, modeling and rigging before animation, render capacity', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Media journeys run once at desktop width; layout is covered by the viewport test.');
  await quickStart(page, 'ca-vancouver');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Gearheart');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByLabel('Medium').selectOption({ label: 'Animation' });
  await page.getByLabel('Animation Technique', { exact: true }).selectOption({ label: '3D CG' });
  await page.getByLabel('Animation Finish').selectOption({ label: 'Limited Animation' });
  await page.getByRole('button', { name: 'Create Project' }).click();
  await section(page, 'Characters');
  for (const n of ['Tilly', 'Cog']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Add Scene' }).click();
  const c = page.locator('article.scene-card').first();
  await c.getByRole('button', { name: 'Edit Scene' }).click();
  await c.getByLabel('Place', { exact: true }).fill('Workshop');
  await c.getByRole('checkbox', { name: 'Tilly' }).check();
  await c.getByRole('checkbox', { name: 'Cog' }).check();
  await c.getByLabel('Estimated Minutes').fill('1');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).click();
  await secureStartingBacking(page);
  await section(page, 'Cast');
  // Animation roles are voice roles; no on-camera casting is offered.
  await expect(page.getByText('Voice: ').first()).toBeVisible();
  await expect(page.getByText('On Camera:')).toHaveCount(0);
  await page.locator('li', { hasText: 'Tilly' }).getByRole('button', { name: 'Cast Yourself' }).click();
  await page.locator('li', { hasText: 'Cog' }).getByRole('button', { name: 'Find Performers' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await expect(page.getByLabel('Render Nodes')).toBeVisible();
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await expect(page.getByText('This project has no live-action shoot days.')).toBeVisible();
  await section(page, 'Production');
  for (const t of ['Model And Surfacing: Tilly', 'Rigging: Cog', 'Layout: Scene 1 (Workshop)', 'Animate Scene 1 (Workshop)', 'Render: Scene 1 (Workshop)']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await advance(page, 'week');
  await section(page, 'Production');
  await expect(page.getByText(/Production starts on/).first()).toBeVisible();
  for (let i = 0; i < 3; i++) await advance(page, 'week');
  await section(page, 'Production');
  // Animation can't start until layout and the character rigs are done; the reason is stated.
  const animate = page.locator('li', { hasText: 'Animate Scene 1 (Workshop)' }).first();
  await expect(animate).toContainText(/Waiting for (Layout|Rigging)/);
  await expect(page.locator('li', { hasText: 'Render: Scene 1 (Workshop)' }).first()).toContainText('Waiting for Lighting');
  await page.screenshot({ path: 'test-results/desktop-3d-production.png', fullPage: true });
});

test('documentary through the UI: contributors, consent, facts, no scripted dialogue', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Media journeys run once at desktop width.');
  await quickStart(page, 'nl-amsterdam');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Canal Keepers');
  await page.getByLabel('Format').selectOption({ label: 'Documentary Short' });
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Subject And Approach' })).toBeVisible();
  await page.getByLabel('Contributor Name').fill('Joost de Vries');
  await page.getByLabel('Who They Are').fill('Lock keeper');
  await page.getByRole('button', { name: 'Add Contributor' }).click();
  await page.getByLabel('Claim').fill('The lock has operated since 1673.');
  await page.getByRole('button', { name: 'Add Fact' }).click();
  await page.getByRole('button', { name: 'Request Consent' }).click();
  await expect(page.getByText('Consent Requested')).toBeVisible();
  await page.getByRole('button', { name: 'Add Sequence' }).click();
  const c = page.locator('article.scene-card').first();
  await c.getByRole('button', { name: 'Edit Scene' }).click();
  await c.getByLabel('Place', { exact: true }).fill('Lock House');
  await c.getByRole('checkbox', { name: 'Joost de Vries' }).check();
  await expect(c.getByText('Dialogue')).toHaveCount(0);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).click();
  await secureStartingBacking(page);
  for (let i = 0; i < 2; i++) await advance(page, 'week');
  await section(page, 'Script');
  await expect(page.getByText(/Consent Given|Consent Declined/)).toBeVisible();
  await section(page, 'Crew');
  await expect(page.getByText('Researcher', { exact: true })).toBeVisible();
  await expect(page.getByText('Fact Checker', { exact: true })).toBeVisible();
});
