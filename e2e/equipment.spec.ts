// Equipment through the interface (the v4 package, 02; ledger V4-016.02, V4-018, V4-019; part of J01): a family lends a
// camera and a card, the rest is bought in the shop from your own account, the kit is checked against the script and
// filled until it covers it, a rental comes and goes, and the short is shot on the kit to delivery: no equipment day
// fee, and the camera wears. The rules are the engine's (tests/equipment.test.ts).
import { expect, test } from './test';
import { addScene, nav, newProject, openStart, produceToDelivery, quickDraft, readSavedState, saveAndApprove, section } from './helpers';

test('a lent camera, a kit bought to fit, checked against the script, and a short shot on it without the rental package', async ({ page }) => {
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-02-02');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Edit Money And Family' }).click();
  const card = page.locator('section', { has: page.getByRole('heading', { name: 'Money And Family' }) });
  await card.getByLabel('Your Savings').fill('3000');
  await card.getByLabel("Your Family's Circumstances").selectOption({ label: 'Comfortable' });
  await card.getByLabel('What Your Family Offers').selectOption({ label: 'Equipment To Use' });
  const lend = card.getByRole('group', { name: 'What Your Family Lends' });
  await lend.getByLabel(/^Blackmagic Pocket Cinema Camera 4K, /).check();
  await lend.getByLabel(/^SanDisk 256GB Extreme PRO UHS-II SDXC, /).check();
  await expect(lend).toContainText('Worth $1,499 at listed prices');
  await expect(card).toContainText('Your family lends you equipment worth $1,499 at listed prices');
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(page.locator('section', { has: page.getByRole('heading', { name: 'Money', exact: true }) })).toContainText('Blackmagic Pocket Cinema Camera 4K, SanDisk 256GB Extreme PRO UHS-II SDXC');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();

  // Profile: what is lent, and the shop.
  await nav(page, 'Profile');
  const gear = page.locator('section', { has: page.getByRole('heading', { name: 'Your Equipment' }) });
  await expect(gear.getByRole('list', { name: 'What You Have' })).toContainText('Lent by your family');
  await expect(gear.getByRole('button', { name: /^Sell / })).toHaveCount(0); // lent, not yours to sell
  await gear.getByRole('button', { name: 'Open The Shop' }).click();
  const shop = page.getByRole('dialog', { name: 'The Shop' });
  await expect(shop).toContainText('$3,000 in your own account.');
  // Too dear for the account says so, under the item.
  await expect(shop.getByRole('button', { name: 'Buy Blackmagic PYXIS 12K (L-Mount)' })).toBeDisabled();
  await expect(shop).toContainText('It costs $5,829 and you have $3,000 in your own account.');
  for (const [kind, name] of [['Lenses', 'Lumix G 12-35mm f/2.8 Leica DG Vario-Elmarit (Micro Four Thirds)'], ['Lights', 'Amaran Halo 100x Bi-Color Light (100W)'], ['Light Stands', 'Godox 300F Light Stand'], ['Tripods', 'Manfrotto Befree Live Video Tripod Kit']]) {
    await shop.getByLabel('Show').selectOption({ label: kind });
    await shop.getByRole('button', { name: `Buy ${name}` }).click();
  }
  await expect(shop).toContainText('$1,488 in your own account.');
  await shop.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(gear.getByRole('list', { name: 'What You Have' }).getByRole('listitem')).toHaveCount(6);

  // A short with an interior, and its kit on the Budget page.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Mara'], minutes: '4' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  const kit = page.locator('section', { has: page.getByRole('heading', { name: 'Equipment', exact: true }) });
  await expect(kit).toContainText("Each shoot day hires the rental house's package");
  const add = (name: string) => kit.getByRole('button', { name: `Add ${name} To Kit` }).click();
  await add('Blackmagic Pocket Cinema Camera 4K');
  const cant = kit.getByRole('region', { name: "What The Kit Can't Do Yet" });
  await expect(cant).toContainText('No lens in the kit fits the Blackmagic Pocket Cinema Camera 4K. In the shop: Lumix G 12-35mm');
  for (const n of ['Lumix G 12-35mm f/2.8 Leica DG Vario-Elmarit (Micro Four Thirds)', 'SanDisk 256GB Extreme PRO UHS-II SDXC', 'Manfrotto Befree Live Video Tripod Kit', 'Amaran Halo 100x Bi-Color Light (100W)']) await add(n);
  await expect(cant).toContainText('The kit has 1 light and fewer stands.');
  await add('Godox 300F Light Stand');
  await expect(kit).toContainText('The kit covers every approved scene.');
  await expect(kit).toContainText('This project shoots on its own kit: nothing a day, all of it yours.');
  // A rental shows its day rate, and goes back when taken out.
  await kit.getByLabel('Show').selectOption({ label: 'Stabilizers' });
  await expect(kit.getByRole('list', { name: 'Stabilizers To Rent' })).toContainText('DJI RS 4 Pro Gimbal Stabilizer $35 a shoot day');
  await kit.getByRole('button', { name: 'Rent DJI RS 4 Pro Gimbal Stabilizer' }).click();
  await expect(kit.getByRole('list', { name: 'The Kit' })).toContainText('Rented, $35 a shoot day');
  await kit.getByRole('button', { name: 'Take Out DJI RS 4 Pro Gimbal Stabilizer' }).click();
  await expect(kit).toContainText('nothing a day, all of it yours');

  // Shot on the kit to delivery: no equipment day fee, and the camera wears.
  await produceToDelivery(page, {});
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered).toBe(true);
  const saved = await readSavedState(page);
  const p = saved.projects[0];
  const shotDays = p.schedule.days.filter((d: { status: string }) => d.status === 'shot' || d.status === 'partial').length;
  expect(shotDays).toBeGreaterThan(0);
  expect(p.obligations.flatMap((o: { postings: { key: string }[] }) => o.postings).filter((x: { key: string }) => x.key.startsWith('eq:'))).toEqual([]);
  const camera = saved.gear.items.find((x: { gearId: string }) => x.gearId === 'bmpcc-4k');
  expect(camera).toMatchObject({ owner: 'family', condition: 100 - shotDays });
});
