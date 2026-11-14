// J02 as one run (the v4 package, 05: "Family loan/investment -> feature -> rented kit -> changed location ->
// schedule/travel/child-policy checks -> budget overrun approval -> release -> repayments/participation. No nonexistent
// automatic profit."; ledger V4-038.02). One game, through the interface: a loan from the family chosen on Review; a
// feature with a child's part; a kit rented for it; its harbour filmed in Bergen, with the unit's travel and the child
// rules read where the game says them; Guide Me's ceiling met, returned to the player and approved higher; delivered,
// released, the loan repaid month by month from the player's own account, and nothing from the project reaching that
// account unless the player takes it home. The world seed is pinned (a labelled fixture).
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, nav, newProject, openStart, pickPlace, pinSeed, quickDraft, personalPostingsOf, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });

const TITLE = 'Low Tide';
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const project = async (page: Page): Promise<any> => (await readSavedState(page))?.projects?.find((p: { title: string }) => p.title === TITLE);
const open = async (page: Page, tab: string) => { await nav(page, 'Projects'); await page.getByRole('button', { name: TITLE }).first().click(); await section(page, tab); };
const RENT = [
  ['Cameras', 'Blackmagic Pocket Cinema Camera 4K'], ['Lenses', 'Lumix G 12-35mm f/2.8 Leica DG Vario-Elmarit (Micro Four Thirds)'], ['Recording Media', 'SanDisk 256GB Extreme PRO UHS-II SDXC'],
  ['Tripods', 'Manfrotto Befree Live Video Tripod Kit'], ['Lights', 'Amaran Halo 100x Bi-Color Light (100W)'], ['Light Stands', 'Godox 300F Light Stand'],
] as const;

test('J02: a family loan, a feature on a rented kit, a harbour filmed abroad with a child in the cast, an overrun approved, released, and the loan repaid', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(1_500_000);

  // A loan from the family, its terms read on Review before the story starts.
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-05-04');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Edit Money And Family' }).click();
  const family = page.locator('section', { has: page.getByRole('heading', { name: 'Money And Family' }) });
  await family.getByLabel('Your Savings').fill('1500');
  await family.getByLabel("Your Family's Circumstances").selectOption({ label: 'Comfortable' });
  await family.getByLabel('What Your Family Offers').selectOption({ label: 'A Loan' });
  await family.getByLabel('How Much').fill('6000');
  await expect(family).toContainText(/You repay your family \$[\d,]+ a month for \d+ months, \$6,000 in all, from your own account\./);
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await pinSeed(page, 7);
  const start = await readSavedState(page);
  const { monthly, months } = start.money.family;
  expect(start.money.family).toMatchObject({ support: 'loan', amount: 6000 });
  await nav(page, 'Profile');
  const mine = card(page, 'Your Money');
  await expect(mine.getByRole('list', { name: 'Your Account, By What It Is' })).toContainText('Loan From Your Family');
  await expect(mine).toContainText(`$0 repaid, $6,000 still owed at $${monthly.toLocaleString('en-US')} a month.`);

  // A feature with a child's part: Mia is ten.
  await nav(page, 'Projects');
  await newProject(page, { title: TITLE, format: 'Feature Film', runtime: '60', budget: 'Low Budget' });
  await section(page, 'Characters');
  for (const n of ['Ada', 'Mia']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  const mia = page.getByRole('article', { name: 'Mia' });
  await mia.getByRole('button', { name: 'Edit Character' }).click();
  await mia.getByLabel('Age In Story').fill('10');
  await mia.getByRole('button', { name: 'Close' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Harbour', chars: ['Ada', 'Mia'], minutes: '20', exterior: true });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Ada', 'Mia'], minutes: '20' });
  await addScene(page, { index: 2, place: 'Harbour', chars: ['Ada'], minutes: '20', exterior: true });
  await saveAndApprove(page);

  // Part of the loan goes in, by the player's choice: the target raised, and the money moved from their own account.
  await section(page, 'Budget');
  const target = Number(await page.getByLabel('Change Financing Target').inputValue());
  await page.getByLabel('Change Financing Target').fill(String(target + 5_000));
  await page.getByRole('button', { name: 'Set Target' }).click();
  const own = card(page, 'Your Own Account');
  await own.getByLabel('Put In From Your Own Money').fill('5000');
  await own.getByRole('button', { name: 'Put It In' }).click();
  await expect(page.getByRole('region', { name: 'Backers' })).toContainText('Your Own Money');

  // A kit rented for the shoot: every item by the shoot day, nothing owned.
  const kit = page.locator('section', { has: page.getByRole('heading', { name: 'Equipment', exact: true }) });
  for (const [kind, name] of RENT) {
    await kit.getByLabel('Show').selectOption({ label: kind });
    await kit.getByRole('button', { name: `Rent ${name}` }).click();
  }
  await expect(kit.getByRole('list', { name: 'The Kit' }).getByText(/Rented, \$[\d,]+ a shoot day/)).toHaveCount(RENT.length);
  await expect(kit).toContainText('The kit covers every approved scene.');

  // The harbour, changed from London to Bergen: what that asks, said before it is chosen.
  await section(page, 'Schedule');
  const filmed = card(page, 'Where Each Place Is Filmed');
  await filmed.getByRole('button', { name: 'Choose Where Harbour Is Filmed' }).click();
  const chooser = page.getByRole('dialog', { name: 'Where Harbour Is Filmed' });
  await pickPlace(page, 'Film It In', 'Bergen', 'Norway');
  await chooser.getByLabel('Kind Of Site').selectOption({ label: 'A Coastline' });
  await expect(chooser.getByLabel('What Filming There Asks')).toContainText(/Away from base: the unit is moved there and back once \(\$[\d,]+\) and housed each shooting day \(\$[\d,]+ a day\)\. You have to be there for the call\./);
  await chooser.getByRole('button', { name: 'Film It There' }).click();
  await expect(filmed.getByRole('status')).toHaveText('Harbour is filmed in Bergen.');

  // The child rules, where the game says them: England's hours for Mia, and who must be with her.
  await section(page, 'Cast');
  const kids = card(page, 'Children In The Cast');
  await expect(kids).toContainText("Under England's child performance regulations, a child's hours are limited");
  await expect(kids).toContainText('Licensed Chaperone: 1');

  // Guide Me for the camera department, within a ceiling too low for its plan: what doesn't fit comes back to the player,
  // who approves a higher ceiling.
  await section(page, 'Crew');
  const camera = card(page, 'Camera');
  const guide = async (ceiling: (plan: number) => number) => {
    await camera.getByRole('button', { name: 'Guide Me' }).click();
    const dialog = page.getByRole('dialog', { name: 'Guide Me For Camera' });
    const plan = Number((await dialog.getByText('The Plan Costs:').locator('..').innerText()).match(/The Plan Costs: \$([\d,]+)/)![1].replace(/,/g, ''));
    await dialog.getByLabel('Spending Ceiling').fill(String(ceiling(plan)));
    await dialog.getByRole('button', { name: 'Approve Guide Me' }).click();
    return plan;
  };
  await guide(() => 100);
  const box = page.getByRole('region', { name: 'Guide Me, Camera' });
  await expect(box).toContainText('nobody free fits within what remains of the $100 ceiling');
  await box.getByRole('button', { name: 'Back To Manual' }).click();
  const plan = await guide((p) => p);
  for (let i = 0; i < 12 && !(await box.innerText()).startsWith('Guide Me staffed'); i++) { await advance(page, 'next-day'); await open(page, 'Crew'); }
  await expect(box).toContainText(/^Guide Me staffed Camera: \$[\d,]+ of the \$[\d,]+ ceiling committed\./);
  // The screen can say it before the save does (CI on 1dae13a, November 13, 2026): read the save until it has it.
  const cameraMandates = async () => (await project(page)).mandates.filter((m: { dept: string }) => m.dept === 'Camera').map((m: { ceiling: number; ended?: string }) => [m.ceiling, m.ended]);
  await expect.poll(cameraMandates, { timeout: 30_000 }).toEqual([[100, expect.any(String)], [plan, 'done']]);

  // Cast and crewed; the schedule built once they have said yes. The unit travels to Bergen the working day before.
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Crew');
  await expect(page.getByText('Licensed Chaperone', { exact: true }).first()).toBeVisible();
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  const harbour = card(page, 'Shoot Days').locator('li', { hasText: 'Harbour (Exterior)' }).first();
  await expect(harbour).toContainText('Filmed in Bergen, Norway.');
  await expect(harbour).toContainText('The unit travels from London the working day before.');

  // The player goes to Bergen for the harbour days, and the film is made and delivered.
  await nav(page, 'World');
  await page.getByLabel('Country Or Territory').selectOption({ label: 'Norway' });
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('bergen');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'Bergen', exact: true }).click();
  await page.getByRole('button', { name: 'Travel Here' }).click();
  await expect(page.getByText("You've arrived in Bergen.").first()).toBeVisible({ timeout: 30_000 });
  await open(page, 'Schedule');
  await runToDelivery(page, { weeks: 90 });
  await expect.poll(async () => !!(await project(page))?.delivered, { timeout: 30_000 }).toBe(true);

  // What the shoot cost, from the save: the rented kit once for each day the unit was called (a day rain stopped
  // included: the unit was there), at the kit's day rate; the unit moved to Bergen once; and the child's chaperone hired.
  const made = await project(page);
  const postings = made.obligations.flatMap((o: { postings: { key: string; kind: string; amount: number }[] }) => o.postings).filter((x: { kind: string }) => x.kind === 'settle');
  const called = made.schedule.days.filter((d: { status: string }) => ['shot', 'partial', 'lost'].includes(d.status));
  expect(called.some((d: { status: string }) => d.status === 'shot')).toBe(true);
  const dayRate = made.kit.items.reduce((a: number, k: { dayRate: number }) => a + k.dayRate, 0);
  const kitDays = postings.filter((x: { key: string }) => x.key.startsWith('eq:'));
  expect(kitDays.map((x: { key: string }) => x.key).sort()).toEqual(called.map((d: { id: string }) => `eq:${d.id}`).sort());
  expect(kitDays.every((x: { amount: number }) => x.amount === dayRate)).toBe(true);
  expect(postings.filter((x: { key: string }) => x.key.startsWith('move:')).length).toBe(1);
  expect(made.hires.some((h: { roleId: string; status: string }) => h.roleId === 'chaperone' && h.status === 'accepted')).toBe(true);

  // Released: a distributor's offer accepted.
  await open(page, 'Release');
  const accept = page.getByRole('button', { name: /^Accept (Offer|The Late Slot)$/ }).first();
  for (let i = 0; i < 10 && !(await accept.isVisible()); i++) { await advance(page, 'week'); await open(page, 'Release'); }
  await accept.click();
  await expect.poll(async () => (await project(page)).offers.some((o: { status: string }) => o.status === 'accepted')).toBe(true);

  // Months on: the loan is repaid from the player's own account, never more than the month asks, and what isn't paid
  // is still owed. Nothing from the project reaches that account unless the player takes it home.
  for (let i = 0; i < 6; i++) await advance(page, 'month');
  const end = await readSavedState(page);
  const repaid = personalPostingsOf(end).filter((x: { kind: string }) => x.kind === 'repayment');
  expect(repaid.length).toBeGreaterThan(0);
  // By the end of month k, never more than k months' repayments (personal.ts family-repayment): what is short one
  // month is due with the next, and is said.
  let paid = 0;
  for (const x of repaid) {
    const k = Number(x.key.split(':')[1]);
    paid -= x.amount;
    expect(paid).toBeLessThanOrEqual(Math.min(6000, monthly * k));
  }
  const lastMonth = Math.max(...repaid.map((x: { key: string }) => Number(x.key.split(':')[1])));
  if (paid < Math.min(6000, monthly * lastMonth)) expect(end.log.some((l: { text: string }) => l.text.startsWith("You couldn't repay your family all that was due this month"))).toBe(true);
  expect(months * monthly).toBeGreaterThanOrEqual(6000);
  expect(personalPostingsOf(end).filter((x: { kind: string }) => x.kind === 'from-project')).toEqual([]);
  await nav(page, 'Profile');
  await expect(mine).toContainText(`$${paid.toLocaleString('en-US')} repaid, $${(6000 - paid).toLocaleString('en-US')} still owed at $${monthly.toLocaleString('en-US')} a month.`);
});
