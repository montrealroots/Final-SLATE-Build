// A part played by more than one performer (engine/parts.ts; the v4 package, 01; ledger V4-007.03): on the Cast page,
// Mara as a child in two of her scenes is a stage of her part, cast on its own while you play her grown up; its offer
// is for its scenes alone, the estimate prices it apart, and both are kept after a reload. The rules are the engine's
// (tests/parts.test.ts).
import { expect, test } from './test';
import { addScene, nav, newProject, readSavedState, saveAndApprove, section, seededLife } from './helpers';

test('a part split in two: the child in two scenes cast on its own, you as the grown woman, kept after a reload', async ({ page }) => {
  test.setTimeout(240_000);
  await seededLife(page, 'gb-london', '2026-01-05', 3);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Two Tides', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  for (const [i, place] of ['Pier', 'Kitchen', 'School', 'Yard'].entries()) await addScene(page, { index: i, place, chars: ['Mara'], minutes: '3' });
  await saveAndApprove(page);

  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.getByRole('button', { name: "Another Performer For Some Of Mara's Scenes" }).click();
  const form = roles.getByRole('group', { name: 'A Stage Of Mara' });
  await expect(form.getByRole('button', { name: 'Add This Stage' })).toBeDisabled();
  await form.getByLabel('What To Call It').fill('Age 10');
  await form.getByLabel('Age In These Scenes (Optional)').fill('10');
  const scenes = form.getByRole('group', { name: 'Scenes' });
  await scenes.getByRole('checkbox', { name: /School/ }).check();
  await scenes.getByRole('checkbox', { name: /Yard/ }).check();
  await form.getByRole('button', { name: 'Add This Stage' }).click();
  await expect(roles).toContainText('Age 10, On Camera: Not cast');
  await expect(roles).toContainText('2 scenes, age 10.');
  await expect(roles).toContainText('2 scenes, every scene no stage takes.');

  // You play her grown up; the child is offered to a performer for her two scenes.
  await roles.getByRole('button', { name: 'Cast Yourself As Mara, On Camera' }).click();
  await roles.getByRole('button', { name: 'Find Performers For Mara (Age 10), On Camera' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cast Mara (Age 10)' });
  await expect(dialog).toBeVisible();
  const offers = dialog.getByRole('button', { name: 'Make Offer' });
  for (let i = 0; i < (await offers.count()) && (await dialog.isVisible()); i++) await offers.nth(i).click();
  await expect(dialog).toBeHidden();
  await expect(roles).toContainText(/Age 10, On Camera: Offer out to /);
  await expect(page.getByRole('table')).toContainText('Mara (Age 10) (On Camera)');

  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click().catch(() => {});
  await expect.poll(async () => {
    const p = (await readSavedState(page))?.projects?.[0];
    if (!p?.stages?.length) return null;
    const st = p.stages[0];
    const hire = p.hires.find((h: { stage?: string }) => h.stage === st.id);
    return [st.label, st.age, st.sceneIds.length, p.cast.some((a: { performer: string; stage?: string }) => a.performer === 'player' && !a.stage), !!hire];
  }).toEqual(['Age 10', 10, 2, true, true]);
});
