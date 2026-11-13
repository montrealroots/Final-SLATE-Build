// J09 as one run (the v4 package, 05: "Commissioned score -> delegated cue plan with spending ceiling -> sketches/revision
// -> recording/electronic delivery -> changed picture cut -> stems/credits -> payment/future collaboration"; ledger
// V4-038.09). The world seed is pinned (a labelled fixture).
import { expect, test } from './test';
import { addScene, advance, castRoles, creditsTable, nav, newProject, readSavedState, runToDelivery, saveAndApprove, section, seededLife, staffEveryDepartment } from './helpers';

test('J09: a score commissioned through Guide Me within a ceiling, its themes revised and approved, a cut changed after it was written and conformed, delivered with stems, the composer paid, credited and on record', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(600_000);
  await seededLife(page, 'gb-london', '2026-01-05', 3);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Lighthouse', chars: ['Mara'], minutes: '3' });
  await saveAndApprove(page);
  const open = async (tab: string) => { await nav(page, 'Projects'); await page.getByRole('button', { name: 'Night Ferry' }).first().click(); await section(page, tab); };

  // The brief and cue plan, and a composer within a ceiling, by Guide Me in one approval; the themes still come to you.
  await section(page, 'Music');
  const guide = page.locator('section.card', { has: page.getByRole('heading', { name: 'Guide Me For Music' }) });
  await guide.getByRole('button', { name: 'Guide Me' }).click();
  await expect(guide.getByRole('list', { name: 'Who Guide Me Would Offer' })).toContainText('Composer');
  await guide.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('region', { name: 'Guide Me, Music' })).toContainText(/ceiling committed/);
  await expect.poll(async () => (await readSavedState(page))?.projects?.[0]?.music?.cues?.length ?? 0).toBeGreaterThan(0);

  await castRoles(page, ['Mara']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // Sketches and themes: noted, revised, approved.
  const themes = page.getByRole('region', { name: "The Composer's Themes" });
  const waitFor = async (done: () => Promise<boolean>) => {
    for (let i = 0; i < 40 && !(await done()); i++) {
      await advance(page, 'week'); await staffEveryDepartment(page); await castRoles(page);
      await open('Edit');
      const lock = page.getByRole('button', { name: 'Lock Picture', exact: true });
      if (await lock.isVisible() && await lock.isEnabled()) await lock.click();
      const cut = page.getByRole('button', { name: 'Start Cut Pass' });
      if (await cut.isVisible() && await cut.isEnabled()) await cut.click();
      await section(page, 'Music');
    }
  };
  const awaiting = async () => (await themes.filter({ hasText: 'written, and waiting for you' }).count()) > 0;
  await waitFor(awaiting);
  await themes.getByLabel('Your Notes On The Themes').fill('Quieter; the harbour at night.');
  await themes.getByRole('button', { name: 'Give Notes' }).click();
  await waitFor(awaiting);
  await themes.getByRole('button', { name: 'Approve The Themes' }).click();
  await expect(themes).toContainText('approved after 1 round of notes');

  // The score written; then the cut changes: the pier scene runs a minute longer in a new draft. Its cue is conformed alone.
  const task = async (id: string) => (await readSavedState(page))?.projects?.[0]?.tasks.find((t: { id: string }) => t.id === id)?.status;
  await waitFor(async () => (await task('post:music:1')) === 'done');
  await open('Script');
  const pier = page.locator('article.scene-card').first();
  await pier.getByRole('button', { name: 'Edit Scene' }).click();
  await pier.getByLabel('Estimated Minutes').fill('4');
  await pier.getByRole('button', { name: 'Close Scene' }).click();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  // The change is said first: the pier was filmed and needs filming again, and its work starts over.
  const confirm = page.getByRole('button', { name: /^Approve (And Redo This Work|The Change)$/ });
  await expect(confirm).toBeVisible();
  await confirm.click();
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.tasks.some((t: { kind: string }) => t.kind === 'post:conform')).toBe(true);
  const conform = (await readSavedState(page)).projects[0].tasks.find((t: { kind: string }) => t.kind === 'post:conform');
  expect(conform.sceneIds).toHaveLength(1);

  // The pier is filmed again: picture unlocked, the pickup requested from Coverage.
  await open('Edit');
  await page.getByRole('button', { name: 'Unlock Picture' }).click();
  const coverage = page.locator('section.card', { has: page.getByRole('heading', { name: 'Coverage' }) });
  await coverage.getByRole('checkbox', { name: /Pier/ }).first().check();
  await coverage.getByRole('button', { name: 'Request Pickups' }).click();

  // Delivered: conform and stems done; the composer paid by the day, credited, and on record with you.
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const done = (await readSavedState(page));
  const p = done.projects[0];
  expect(['post:conform:1', 'post:stems:1', 'post:themes-revision:1'].map((id) => p.tasks.find((t: { id: string }) => t.id === id)?.status)).toEqual(['done', 'done', 'done']);
  const composer = p.hires.find((h: { roleId: string; status: string }) => h.roleId === 'composer');
  expect(composer.guided).toBeTruthy();
  expect(composer.daysWorked).toBeGreaterThan(0);
  expect(p.obligations.find((o: { id: string }) => o.id === composer.obligationId).settled).toBeGreaterThan(0);
  expect(done.people[composer.personId].history.some((x: { kind: string }) => x.kind === 'completed')).toBe(true);
  expect(await creditsTable(page)).toMatch(/Music By|Composer/);
});
