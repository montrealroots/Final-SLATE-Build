// The owner's v5 brief, 9, through the screens (from November 13, 2026): an equipment shortage that waits for the player
// and is approved by renting what's missing. Nothing is written into the save; the world seed is pinned (a labelled fixture).
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, nav, newProject, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const project = async (page: Page): Promise<any> => (await readSavedState(page))?.projects?.[0];

test('a kit that can\'t light an interior: the day waits for the player, who rents what\'s missing, and the film is made', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'A shoot, once, at desktop width.');
  test.setTimeout(600_000);
  await quickLife(page, 'gb-london', '2026-03-02');
  await pinSeed(page, 7);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Kitchen Light', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);
  // A rented kit with no lights.
  await section(page, 'Budget');
  const kit = page.locator('section', { has: page.getByRole('heading', { name: 'Equipment', exact: true }) });
  for (const [kind, name] of [['Cameras', 'Blackmagic Pocket Cinema Camera 4K'], ['Lenses', 'Lumix G 12-35mm f/2.8 Leica DG Vario-Elmarit (Micro Four Thirds)'], ['Recording Media', 'SanDisk 256GB Extreme PRO UHS-II SDXC'], ['Tripods', 'Manfrotto Befree Live Video Tripod Kit']] as const) {
    await kit.getByLabel('Show').selectOption({ label: kind });
    await kit.getByRole('button', { name: `Rent ${name}` }).click();
  }
  await expect(kit).toContainText("A day the kit can't serve is postponed until you choose what to do. Nothing is hired without your approval.");
  await expect(kit.getByRole('region', { name: "What The Kit Can't Do Yet" })).toContainText('Interiors and night scenes are lit as usual, and the kit has no lights.');
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  // The shoot day comes: postponed, nothing paid, the shortage waiting on the Budget page with its fixes.
  const shortage = kit.getByRole('region', { name: 'Kit Shortage' });
  for (let i = 0; i < 30 && !(await project(page))?.kit?.shortage; i++) await advance(page, 'next-day');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Kitchen Light' }).first().click();
  await section(page, 'Budget');
  await expect(shortage).toContainText(/was postponed\. Interiors and night scenes are lit as usual, and the kit has no lights\. Its scenes have moved to a later day\./);
  const p1 = await project(page);
  const held = p1.schedule.days.find((d: { result?: string }) => d.result?.startsWith('Postponed:'));
  expect(p1.obligations.flatMap((o: { postings: { key: string }[] }) => o.postings).some((x: { key: string }) => x.key === `eq:${held.id}`)).toBe(false);
  // Approved by renting a light (and the stand a light needs), each at its day rate.
  await shortage.getByRole('button', { name: /^Rent .+ For The Shortage$/ }).first().click();
  await kit.getByLabel('Show').selectOption({ label: 'Light Stands' });
  await kit.getByRole('button', { name: 'Rent Godox 300F Light Stand' }).click();
  await expect(kit).toContainText('The kit covers every approved scene.');
  await runToDelivery(page, { weeks: 30 });
  await expect.poll(async () => !!(await project(page))?.delivered, { timeout: 30_000 }).toBe(true);
  const done = await project(page);
  expect(done.kit.shortage).toBeUndefined();
  // No day was ever shot on the rental house's package.
  expect(done.obligations.some((o: { label: string }) => /Equipment Package, Hired For The Day/.test(o.label))).toBe(false);
});

// A company formed, funded and drawn on was the second journey here until November 14, 2026, when the company left play
// (the owner's command). e2e/v9-project-money.spec.ts follows your own money into a project instead.
