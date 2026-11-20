// A part played by more than one performer (engine/parts.ts; the v4 package, 01; ledger V4-007.03): on the Cast page,
// Mara as a child in two of her scenes is a stage of her part, cast on its own while you play her grown up; its offer
// is for its scenes alone, the estimate prices it apart, and both are kept after a reload. The rules are the engine's
// (tests/parts.test.ts).
import { expect, test } from './test';
import { addScene, advance, castRoles, nav, newProject, onlyOn, readSavedState, runToDelivery, saveAndApprove, section, seededLife, staffEveryDepartment } from './helpers';

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

// J04, Ensemble adaptation, the step it didn't run through the screens (docs/v6/JOURNEYS.md; from November 17, 2026): a part
// recast from episode 2 of a series, through the Cast page's stage form, changes that part's credits and no one else's.
// You play Mara in episode 1; another performer plays her from episode 2; Ben is played by one performer throughout.
test('J04: Mara recast from episode 2 through the Cast page: her credits change from that episode, and no one else\'s', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop']), 'The season runs once, at desktop width.');
  test.setTimeout(1_200_000);
  await seededLife(page, 'gb-london', '2026-01-05', 3);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Tide Line', format: 'Series', episodes: '2', runtime: '10' });
  await section(page, 'Characters');
  for (const n of ['Mara', 'Ben']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara', 'Ben'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Mara', 'Ben'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  await saveAndApprove(page);

  // From episode 2, Mara is another performer's: the whole episode, through the stage form.
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.getByRole('button', { name: "Another Performer For Some Of Mara's Scenes" }).click();
  const form = roles.getByRole('group', { name: 'A Stage Of Mara' });
  await form.getByLabel('What To Call It').fill('From Episode 2');
  await form.getByRole('group', { name: 'Whole Episodes' }).getByRole('checkbox', { name: 'Episode 2' }).check();
  await form.getByRole('button', { name: 'Add This Stage' }).click();
  await expect(roles).toContainText('From Episode 2, On Camera: Not cast');
  await roles.getByRole('button', { name: 'Cast Yourself As Mara, On Camera' }).click();
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page);

  // The credits: you as Mara in episode 1, another performer as Mara from episode 2, Ben's the same in both.
  await section(page, 'Release');
  const credits = page.locator('section.card', { has: page.getByRole('heading', { name: 'Credits' }) });
  const mara = credits.locator('tr', { hasText: 'as Mara' });
  await expect(mara).toHaveCount(2);
  await expect(credits.locator('tr', { hasText: 'as Mara (From Episode 2)' })).toContainText('Episodes 2');
  await expect(credits.locator('tr', { hasText: 'as Mara' }).filter({ hasNotText: 'From Episode 2' })).toContainText('Episodes 1');
  const ben = credits.locator('tr', { hasText: 'as Ben' });
  await expect(ben).toHaveCount(1);
  await expect(ben).toContainText('Episodes 1, 2');
});
