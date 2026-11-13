// J05 as one run (the v4 package, 05: "Stop-motion production with puppet face choice, fabrication, stage/camera
// reservation, capture and repair; compare distinct choices"; ledger V4-038.05). The world seed is pinned (a labelled
// fixture) so a puppet is damaged during the stage weeks; the damage and the repair are the engine's.
import { expect, test } from './test';
import { addScene, nav, newProject, produceToDelivery, readSavedState, saveAndApprove, section, seededLife } from './helpers';

test('J05: a puppet\'s face chosen two ways and compared on the estimate, then made, staged, shot, damaged, repaired and delivered', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(600_000);
  await seededLife(page, 'gb-london', '2026-01-05', 2);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Button Moon', format: 'Short Film', medium: 'Animation', technique: 'Stop Motion', finish: 'Limited Animation', runtime: '3' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Pip');
  await page.getByRole('button', { name: 'Add Character' }).click();
  const face = async (label: string) => {
    await section(page, 'Characters');
    const pip = page.getByRole('article', { name: 'Pip' });
    await pip.getByRole('button', { name: 'Edit Character' }).click();
    await pip.getByLabel('Puppet Face').selectOption({ label });
    await pip.getByRole('button', { name: 'Close' }).click();
  };
  const estimate = async () => {
    await section(page, 'Budget');
    const row = page.locator('dt', { hasText: /^Still To Come, Estimated$/ }).locator('xpath=following-sibling::dd[1]');
    return Number((await row.innerText()).replace(/[^\d]/g, ''));
  };
  await face('Mechanical Head');
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Drawer', chars: ['Pip'], minutes: '3' });
  await saveAndApprove(page);
  const mechanical = await estimate();

  // The other choice, compared: replacement faces are a set made after the puppet, and are quicker on the stage.
  await face('Replacement Faces');
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).last().click();
  const confirm = page.getByRole('button', { name: /^Approve (And Redo This Work|The Change)$/ });
  if (await confirm.isVisible().catch(() => false)) await confirm.click();
  await expect.poll(async () => (await readSavedState(page))?.projects?.[0]?.approvedDraft).toBe(2);
  const replacement = await estimate();
  expect(replacement).not.toBe(mechanical);

  // Made, staged and shot: the puppet's armature, fabrication and faces, the sets, the stage camera; damaged on set,
  // repaired, and delivered after it.
  await section(page, 'Schedule');
  await expect(page.getByLabel('Pip Puppet Copies')).toBeVisible();
  await expect(page.getByLabel('Stop-Motion Stages')).toBeVisible();
  await produceToDelivery(page, { yourself: ['Pip'], step: 'month', weeks: 40 });
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);
  await section(page, 'Production');
  for (const t of ['Armature: Pip', 'Puppet Fabrication: Pip', 'Replacement Faces: Pip', 'Miniature Sets', 'Stage Camera And Lighting Setup']) await expect(page.getByText(t, { exact: true }).first()).toBeVisible();
  const logs: string[] = (await readSavedState(page)).log.map((l: { text: string }) => l.text);
  expect(logs).toContain("Pip's puppet was damaged on set. Shots with Pip wait for a repair unless a duplicate is available.");
  await expect(page.locator('li', { hasText: 'Repair Puppet: Pip' }).first()).toContainText('Done');
});
