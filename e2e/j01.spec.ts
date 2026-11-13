// J01 as one run (the v4 package, 05: "New game with family gift -> select book -> choose live-action short -> complete
// editable brief -> add/rename character -> buy compatible affordable kit -> cast -> write/delegate -> shoot/post ->
// distribution -> settled receipts -> reinvest. Include birthday and save/reload"; ledger V4-038.01). Each step is
// the player's, through the interface; nothing is put into the save. The world seed is pinned (a labelled fixture) so
// the run is the same each time.
import { expect, test } from './test';
import { adaptWork, addScene, advance, nav, openStart, pinSeed, produceToDelivery, quickDraft, readSavedState, saveAndApprove, section, writePitch } from './helpers';

test('J01: a family gift, a book, a live-action short on a kit bought for it, released, its receipts settled, and the next one funded', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(600_000);

  // A new game with a family gift, read on Review before the story starts.
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-02-02');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Edit Money And Family' }).click();
  const family = page.locator('section', { has: page.getByRole('heading', { name: 'Money And Family' }) });
  await family.getByLabel('Your Savings').fill('1500');
  await family.getByLabel("Your Family's Circumstances").selectOption({ label: 'Comfortable' });
  await family.getByLabel('What Your Family Offers').selectOption({ label: 'A Gift' });
  await family.getByLabel('How Much').fill('8000');
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await pinSeed(page, 5);

  // A book, as a live-action short; the brief completed from it, and a character of the player's own added.
  await adaptWork(page, { query: 'quixote', work: /^Don Quixote/, title: 'Windmills', format: 'Short Film', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Teresa');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await expect(page.getByText('Teresa').first()).toBeVisible();
  await saveAndApprove(page);

  // A camera, lens, card and tripod the gift can pay for, from the shop, into the project's kit.
  await nav(page, 'Profile');
  const gear = page.locator('section', { has: page.getByRole('heading', { name: 'Your Equipment' }) });
  await gear.getByRole('button', { name: 'Open The Shop' }).click();
  const shop = page.getByRole('dialog', { name: 'The Shop' });
  for (const [kind, name] of [['Cameras', 'Blackmagic Pocket Cinema Camera 4K'], ['Lenses', 'Lumix G 12-35mm f/2.8 Leica DG Vario-Elmarit (Micro Four Thirds)'], ['Recording Media', 'SanDisk 256GB Extreme PRO UHS-II SDXC'], ['Tripods', 'Manfrotto Befree Live Video Tripod Kit']]) {
    await shop.getByLabel('Show').selectOption({ label: kind });
    await shop.getByRole('button', { name: `Buy ${name}` }).click();
  }
  await shop.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(gear.getByRole('list', { name: 'What You Have' }).getByRole('listitem')).toHaveCount(4);
  const openProject = async (title: string, tab: string) => { await nav(page, 'Projects'); await page.getByRole('button', { name: title }).first().click(); await section(page, tab); };
  await openProject('Windmills', 'Budget');
  const kit = page.locator('section', { has: page.getByRole('heading', { name: 'Equipment', exact: true }) });
  for (const n of ['Blackmagic Pocket Cinema Camera 4K', 'Lumix G 12-35mm f/2.8 Leica DG Vario-Elmarit (Micro Four Thirds)', 'SanDisk 256GB Extreme PRO UHS-II SDXC', 'Manfrotto Befree Live Video Tripod Kit']) {
    await kit.getByRole('button', { name: `Add ${n} To Kit` }).click();
  }
  await expect(kit.getByRole('list', { name: 'The Kit' })).toContainText('Blackmagic Pocket Cinema Camera 4K');
  // The kit has no lights for the story's interiors and nights. From November 13, 2026 a day it can't serve waits for
  // the player (the owner's v5 brief, 9): the package for such days is the player's approval to give, and is given here.
  await kit.getByRole('checkbox', { name: /^Hire The Rental House's Package On A Day The Kit Can't Serve/ }).check();

  // Cast (the player plays Teresa), staffed, shot, cut and delivered.
  await produceToDelivery(page, { yourself: ['Teresa'] });
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);

  // Distribution: an offer that comes once the film is seen, accepted. (A self-release with no distributor earns
  // nothing in this game: there is nobody to report sales.)
  await openProject('Windmills', 'Release');
  const accept = page.getByRole('button', { name: /^Accept (Offer|The Late Slot)$/ }).first();
  for (let i = 0; i < 10 && !(await accept.isVisible()); i++) { await advance(page, 'week'); await openProject('Windmills', 'Release'); }
  await accept.click();
  await expect(page.getByRole('heading', { name: 'Earnings' })).toBeVisible();
  // Receipts settle: the guarantee and reports repay the backers first (finance.ts receiveIncome), then reach the project.
  const settled = async () => { const p = (await readSavedState(page)).projects[0]; return p.revenue + p.finance.deals.reduce((a: number, d: { repaid: number }) => a + d.repaid, 0); };
  for (let i = 0; i < 4 && !((await settled()) > 0); i++) await advance(page, 'month');
  await expect.poll(settled, { timeout: 20_000 }).toBeGreaterThan(0);

  // Reinvest: income the project keeps, if any, taken home; then the player's own money put into the next by choice.
  await openProject('Windmills', 'Budget');
  const takeHome = page.locator('section', { has: page.getByRole('heading', { name: 'Your Own Account' }) }).getByRole('button', { name: /^Take Home \$[\d,]+ Of Income$/ });
  if (await takeHome.isEnabled()) await takeHome.click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('Second Wind');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Ada'], minutes: '3' });
  // The starting backing went to the first project; this one's money is the player's to raise.
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await section(page, 'Budget');
  const target = Number(await page.getByLabel('Change Financing Target').inputValue());
  await page.getByLabel('Change Financing Target').fill(String(target + 5_000));
  await page.getByRole('button', { name: 'Set Target' }).click();
  const own = page.locator('section', { has: page.getByRole('heading', { name: 'Your Own Account' }) });
  await own.getByLabel('Put In From Your Own Money').fill('1000');
  await own.getByRole('button', { name: 'Put It In' }).click();
  await expect(page.getByRole('region', { name: 'Backers' })).toContainText('Your Own Money');

  // The player's birthday (born May 20, 1990 in quickDraft; the story started February 2, 2026): lived to, a month at a
  // time, said on the day, and the next one scheduled.
  const nextAge = async () => (await readSavedState(page)).events.find((e: { kind: string }) => e.kind === 'birthday')?.payload.age;
  for (let i = 0; i < 12 && (await nextAge()) === 36; i++) await advance(page, 'month');
  await expect.poll(nextAge).toBe(37);
  expect((await readSavedState(page)).log.some((l: { text: string }) => l.text === "Today is your birthday. You're 36.")).toBe(true);

  // Everything kept after a reload.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click().catch(() => {});
  await expect.poll(async () => {
    const st = await readSavedState(page);
    return st ? [st.projects.map((p: { title: string }) => p.title), !!st.projects[0].delivered, st.projects[0].offers.some((o: { status: string }) => o.status === 'accepted'), st.gear.items.length] : null;
  }).toEqual([['Windmills', 'Second Wind'], true, true, 4]);
});
