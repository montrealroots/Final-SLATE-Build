import { expect, test } from './test';
import { nav, section } from './helpers';

// Runs on the WebKit iPhone emulation projects: layout, touch navigation and focused-field visibility.
test('phone device: screens fit, drawer works, focused fields stay visible', async ({ page }, info) => {
  test.skip(!info.project.name.startsWith('iphone'), 'Device emulation projects only.');
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Zoë Nakamura-Fitzgerald Ó Briain', pronouns: 'she', actingTitle: 'Actress', birthDate: '1999-11-02', birthplaceId: 'ie-dublin',
      heritages: [{ id: 'Irish', label: 'Irish', custom: false }, { id: 'Japanese', label: 'Japanese', custom: false }], heritageCustomText: '', mainLanguage: 'en',
      languages: [{ code: 'ga', proficiency: 'Conversational' }, { code: 'ja', proficiency: 'Basic' }], startPlaceId: 'au-melbourne', startDate: '2026-07-01', startTime: '19:45', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).tap();
  await page.getByRole('button', { name: 'Start My Story' }).tap();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  for (const v of ['Home', 'Calendar', 'Projects', 'Profile'] as const) {
    await nav(page, v);
    expect(await overflow(), v).toBeLessThanOrEqual(1);
  }
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().tap();
  // A field low on the form stays visible once focused (the keyboard itself can't be emulated here).
  const runtime = page.getByLabel('Target Runtime In Minutes');
  await runtime.focus();
  await expect(runtime).toBeInViewport();
  await page.getByLabel('Working Title').fill('Winter Tram');
  await page.getByRole('button', { name: 'Create Project' }).tap();
  for (const t of ['Overview', 'Script', 'Characters', 'Cast', 'Crew', 'Schedule', 'Budget', 'Production', 'Edit', 'Release', 'Festivals And Awards']) {
    await section(page, t);
    expect(await overflow(), t).toBeLessThanOrEqual(1);
  }
  await page.screenshot({ path: `test-results/${info.project.name}-project.png`, fullPage: false });
});
