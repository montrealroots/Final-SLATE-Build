// The owner's v5 brief, 9, through the screens (from November 13, 2026): an equipment shortage that waits for the player
// and is approved by renting what's missing; and a company of your own that funds a project and produces it, every move
// posted on both sides. Nothing is written into the save; the world seed is pinned (a labelled fixture).
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, nav, newProject, openStart, pinSeed, quickDraft, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment, setInheritance } from './helpers';

test.use({ actionTimeout: 20_000 });
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
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

test('a company of your own: formed from your account, money moved both ways, put into a project it then produces', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
  // A story with a $5,000 inheritance, set on Review (savings until November 14, 2026).
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-03-02');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await setInheritance(page, '5,000');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await nav(page, 'Profile');
  const mine = card(page, 'Your Money');
  const start = Number((await mine.locator('strong').first().innerText()).replace(/[^\d]/g, ''));
  const co = card(page, 'Your Company');
  await co.getByLabel('Company Name').fill('Tidewater Pictures');
  await co.getByLabel('Put In When It Is Formed').fill('1000');
  await co.getByRole('button', { name: 'Form The Company' }).click();
  await expect(co).toContainText('Tidewater Pictures: $1,000 in its account.');
  await expect(mine).toContainText(`$${(start - 1000 - 300).toLocaleString('en-US')} in your own account.`);
  await co.getByLabel('Move Between You And The Company').fill('200');
  await co.getByRole('button', { name: 'Draw It Out' }).click();
  await expect(co).toContainText('Tidewater Pictures: $800 in its account.');
  await expect(co.getByRole('list', { name: 'Its Account, By What It Is' })).toContainText('Drawn By You');
  // A project: the company's money goes in, and the company produces it.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  const target = Number(await page.getByLabel('Change Financing Target').inputValue());
  await page.getByLabel('Change Financing Target').fill(String(target + 5_000));
  await page.getByRole('button', { name: 'Set Target' }).click();
  const theirs = card(page, 'Tidewater Pictures');
  await theirs.getByLabel('Put In From The Company').fill('500');
  await theirs.getByRole('button', { name: 'Put It In' }).click();
  await expect(theirs).toContainText('It produces Harbour Lights, and its credits say so.');
  await expect(page.getByRole('region', { name: 'Backers' })).toContainText('Tidewater Pictures');
  await expect.poll(async () => (await project(page))?.producedBy).toBe('Tidewater Pictures');
  const saved = await readSavedState(page);
  // The company's account is the journal's company cash account from November 14, 2026 (its postings were a list before).
  expect(saved.journal.txs.filter((t: { status: string }) => t.status === 'settled').flatMap((t: { lines: { account: string; minor: number }[] }) => t.lines).filter((l: { account: string }) => l.account === 'company:cash:USD').reduce((a: number, l: { minor: number }) => a + l.minor, 0)).toBe(30_000);
});
