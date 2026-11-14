// Input that must not be lost when a screen changes (November 7, 2026). Both failures were found intermittently on the
// WebKit iPhone projects under load, then reproduced on every browser by making the timing explicit:
// - New Script: focus moved to the screen a frame after it was shown. When that frame came late (a busy device), it
//   arrived while the player was typing the title, and the rest of the title went nowhere ("The Last Ferry" became "Th").
// - Character creation: the world map drew a one-line placeholder, then grew 200-360 px a moment later, pushing Save
//   And Return To Review down after it was drawn; a click aimed at it landed elsewhere and the screen stayed on Identity.
import { expect, test } from './test';
import { nav, openStart, quickLife } from './helpers';

test('typing straight into Write An Original keeps every character, even when the next frame comes late', async ({ page }) => {
  await quickLife(page, 'ca-toronto', '2026-03-02');
  await nav(page, 'Projects');
  // Timing only: every animation frame arrives 1.5 seconds late, as on a very busy device, and the title takes longer than
  // that to type, so typing always spans the moment the frame arrives. The app's code is unchanged.
  await page.evaluate(() => { const raf = window.requestAnimationFrame.bind(window); window.requestAnimationFrame = (cb) => window.setTimeout(() => raf(cb), 1500); });
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').pressSequentially('The Last Ferry To Wolfe Island', { delay: 90 });
  await expect(page.getByLabel('Working Title')).toHaveValue('The Last Ferry To Wolfe Island');
  await expect(page.getByLabel('Working Title')).toBeFocused();
});

test('Save And Return To Review stays where it was drawn while the map arrives, and goes back to Review', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 'review', name: 'Itzel Ramírez-Okafor', pronouns: 'they', actingTitle: 'Actor', birthDate: '2006-09-14', birthplaceId: 'mx-mexico-city',
      heritages: [{ id: 'Mestizo', label: 'Mestizo', custom: false }, { id: 'Mexican', label: 'Mexican', custom: false }], heritageCustomText: '', mainLanguage: 'es',
      languages: [{ code: 'en', proficiency: 'Fluent' }], startPlaceId: 'gb-london', startDate: '2026-04-06', startTime: '09:30', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  // The first visit to Identity is the one that loads the map.
  await page.getByRole('button', { name: 'Edit Identity' }).click();
  const back = page.getByRole('button', { name: 'Save And Return To Review' });
  const drawnAt = (await back.boundingBox())!.y;
  await expect(page.getByRole('group', { name: /^Map of / }).first()).toBeVisible();
  expect((await back.boundingBox())!.y).toBe(drawnAt);
  await back.click();
  await expect(page.getByText('Ready To Begin')).toBeVisible();
});
