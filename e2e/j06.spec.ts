// J06 as one run (the v4 package, 05: "Hybrid production with shared people/assets and no duplicate work billing or
// simultaneous equipment booking"; ledger V4-038.06). The world seed is pinned (a labelled fixture).
import { expect, test } from './test';
import { addScene, advance, castRoles, creditsTable, nav, newProject, openStart, pinSeed, quickDraft, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment, writePitch } from './helpers';

test('J06: a hybrid of a live scene and a 3D one, you in both, one crew and a lent camera; a second shoot can\'t take the camera on the same days; nobody is paid twice for a day', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(600_000);
  // A family that lends a camera and a card.
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-04-06');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Edit Money And Family' }).click();
  const fam = page.locator('section', { has: page.getByRole('heading', { name: 'Money And Family' }) });
  await fam.getByLabel("Your Family's Circumstances").selectOption({ label: 'Comfortable' });
  await fam.getByLabel('What Your Family Offers').selectOption({ label: 'Equipment To Use' });
  const lend = fam.getByRole('group', { name: 'What Your Family Lends' });
  await lend.getByLabel(/^Blackmagic Pocket Cinema Camera 4K, /).check();
  await lend.getByLabel(/^SanDisk 256GB Extreme PRO UHS-II SDXC, /).check();
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await pinSeed(page, 6);

  // The hybrid: Mara on camera in the kitchen, Sprite a 3D character in the burrow; you play Mara and voice Sprite.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Bramblewood', format: 'Short Film', medium: 'Hybrid', technique: '3D CG', finish: 'Limited Animation', runtime: '4' });
  await section(page, 'Characters');
  for (const n of ['Mara', 'Sprite']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  const sprite = page.getByRole('article', { name: 'Sprite' });
  await sprite.getByRole('button', { name: 'Edit Character' }).click();
  await sprite.getByLabel('Entity').selectOption({ label: 'Supernatural' });
  await sprite.getByLabel('Realized As').selectOption({ label: 'Computer Generated' });
  await sprite.getByRole('checkbox', { name: 'On Camera' }).uncheck();
  await sprite.getByRole('checkbox', { name: 'Voice' }).check();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Mara'], minutes: '1' });
  await addScene(page, { index: 1, place: 'Burrow', chars: ['Sprite'], minutes: '0.5', technique: '3D CG' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  const kit = page.locator('section', { has: page.getByRole('heading', { name: 'Equipment', exact: true }) });
  for (const n of ['Blackmagic Pocket Cinema Camera 4K', 'SanDisk 256GB Extreme PRO UHS-II SDXC']) await kit.getByRole('button', { name: `Add ${n} To Kit` }).click();
  await castRoles(page, ['Mara', 'Sprite']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await expect.poll(async () => (await readSavedState(page))?.projects?.[0]?.schedule.days.length ?? 0).toBeGreaterThan(0);
  const start = (await readSavedState(page)).projects[0].schedule.startDate;

  // A second, live-action shoot on the same days, with the same camera in its kit: refused, with the reason.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Second Unit', format: 'Short Film', runtime: '4', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ben');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Ben'], minutes: '1' });
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await section(page, 'Budget');
  await kit.getByRole('button', { name: 'Add Blackmagic Pocket Cinema Camera 4K To Kit' }).click();
  await section(page, 'Schedule');
  await page.getByLabel('Production Start').fill(start);
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await expect(page.getByRole('alert')).toContainText("One item can't be on two shoots at once: take it out of one kit, or rent another.");

  // The hybrid made and delivered.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Bramblewood' }).first().click();
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.find((p: { title: string }) => p.title === 'Bramblewood')?.delivered, { timeout: 30_000 }).toBe(true);
  const p = (await readSavedState(page)).projects.find((x: { title: string }) => x.title === 'Bramblewood');
  for (const t of ['Plate Integration: Scene 2 (Burrow)', 'Animate Scene 2 (Burrow)']) expect(p.tasks.find((x: { label: string }) => x.label === t)?.status).toBe('done');
  // Nobody paid twice for a day: each person's day keys are unique across every line they are paid from.
  const byPerson = new Map<string, string[]>();
  for (const h of p.hires.filter((x: { obligationId?: string }) => x.obligationId)) {
    const days = p.obligations.find((o: { id: string }) => o.id === h.obligationId).postings.map((x: { key: string }) => x.key.split(':')[1]).filter((k: string) => /^\d{4}-\d\d-\d\d$/.test(k ?? ''));
    byPerson.set(h.personId, [...(byPerson.get(h.personId) ?? []), ...days]);
  }
  for (const [who, days] of byPerson) expect(new Set(days).size, who).toBe(days.length);
  // You, in both: on camera as Mara, the voice of Sprite; the camera wore on the live day only.
  const credits = await creditsTable(page);
  expect(credits).toContain('as Mara');
  expect(credits).toMatch(/Voice Cast[\s\S]*as Sprite/);
});
