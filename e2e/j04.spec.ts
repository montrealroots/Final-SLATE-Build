// J04 as one run (the v4 package, 05: "3D production with asset/rig/render dependencies and one revision affecting only
// its dependents"; ledger V4-038.04). The world seed is pinned (a labelled fixture).
import { expect, test } from './test';
import { addScene, advance, castRoles, nav, readSavedState, runToDelivery, saveAndApprove, section, seededLife, staffEveryDepartment } from './helpers';

type Task = { id: string; label: string; status: string; done: number };

test('J04: a 3D short whose models and rigs come before animation and render, one character redesigned mid-way, only its work redone, delivered', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(600_000);
  await seededLife(page, 'ca-vancouver', '2026-01-05', 4);
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('Gearheart');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByLabel('Medium').selectOption({ label: 'Animation' });
  await page.getByLabel('Animation Technique', { exact: true }).selectOption({ label: '3D CG' });
  await page.getByLabel('Animation Finish').selectOption({ label: 'Limited Animation' });
  await page.getByRole('button', { name: 'Create Project' }).click();
  await section(page, 'Characters');
  for (const n of ['Tilly', 'Cog']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Workshop', chars: ['Tilly', 'Cog'], minutes: '1' });
  await addScene(page, { index: 1, place: 'Attic', chars: ['Tilly'], minutes: '1' });
  await saveAndApprove(page);
  await castRoles(page, ['Tilly']);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await expect(page.getByLabel('Render Nodes')).toBeVisible();
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await section(page, 'Production');
  for (const t of ['Model And Surfacing: Cog', 'Rigging: Cog', 'Animate Scene 1 (Workshop)', 'Render: Scene 1 (Workshop)']) await expect(page.getByText(t, { exact: true })).toBeVisible();

  // Worked until both characters are modeled and rigged.
  const tasks = async (): Promise<Task[]> => (await readSavedState(page))?.projects?.[0]?.tasks ?? [];
  const status = async (label: string) => (await tasks()).find((t) => t.label === label)?.status;
  for (let i = 0; i < 20 && !((await status('Rigging: Cog')) === 'done' && (await status('Rigging: Tilly')) === 'done'); i++) { await advance(page, 'week'); await staffEveryDepartment(page); }
  const before = await tasks();
  const tillyWork = before.filter((t) => / Tilly$|Attic/.test(t.label) && t.done > 0).map((t) => [t.id, t.done]);
  expect(tillyWork.length).toBeGreaterThan(0);

  // One revision: Cog redesigned. Only Cog's model and rig, and shots with Cog not yet animated, are done again.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Gearheart' }).first().click();
  await section(page, 'Characters');
  const cog = page.getByRole('article', { name: 'Cog' });
  await cog.getByRole('button', { name: 'Edit Character' }).click();
  await cog.getByLabel('Description').fill('A brass robot rebuilt with copper hands.');
  await cog.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByText(/finished assets? needs? rebuilding/)).toBeVisible();
  await page.getByRole('button', { name: 'Keep Finished Shots' }).click();
  await expect.poll(async () => (await status('Rigging: Cog')) !== 'done').toBe(true);
  const after = await tasks();
  for (const [id, done] of tillyWork) expect(after.find((t) => t.id === id)!.done, id as string).toBeGreaterThanOrEqual(done as number);

  // Rebuilt, animated, rendered and delivered.
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);
  expect((await tasks()).filter((t) => t.label.startsWith('Render:')).every((t) => t.status === 'done')).toBe(true);
});
