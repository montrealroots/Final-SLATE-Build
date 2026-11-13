// The owner's v5 brief, 6, through the screens (from November 13, 2026): a delivered short gets a Release Plan (festivals
// first, a broadcast licence, the digital stores); a proposal asking too much is turned down with what remains, a second
// one is answered with an offer the player signs, and the stores release is booked with every cost named first. The
// world seed is pinned (a labelled fixture); buyers and services are fictional; nothing is written into the save.
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, nav, newProject, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const project = async (page: Page): Promise<any> => (await readSavedState(page))?.projects?.[0];
const day = (t: number, n: number) => new Date(t + n * 86_400_000).toISOString().slice(0, 10);

test('a Release Plan: festivals first, a licence turned down and then signed, and the stores release booked', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(900_000);
  await quickLife(page, 'gb-london', '2026-03-02');
  await pinSeed(page, 7);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 30 });
  await expect.poll(async () => !!(await project(page))?.delivered, { timeout: 30_000 }).toBe(true);
  const reception: number = (await project(page)).quality.reception;
  test.skip(reception < 55, `The pinned world received the short at ${reception}, under a broadcaster's bar; the engine tests cover that case.`);

  // The plan: festivals first, then a broadcaster and the stores.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbour Lights' }).first().click();
  await section(page, 'Release');
  const plan = card(page, 'Release Plan');
  const now = (await readSavedState(page)).now as number;
  await plan.getByLabel('Festival-First').check();
  await plan.getByLabel('Broadcast Licence').check();
  await plan.getByLabel('Transactional Digital').check();
  await plan.getByLabel('Plan Territories').fill('GB');
  await plan.getByLabel('First Public Date').fill(day(now, 70));
  await plan.getByLabel('Held For Festivals Until').fill(day(now, 40));
  await plan.getByRole('button', { name: 'Save The Plan' }).click();
  await expect(plan.getByRole('list', { name: 'The Plan' })).toContainText('Held for festivals until');

  // Asking far too much: turned down for the price, with what remains.
  const broadcast = plan.getByRole('region', { name: 'Broadcast Licence Proposals' });
  const fair = Number((await broadcast.innerText()).match(/sell for about \$([\d,]+)/)![1].replace(/,/g, ''));
  await broadcast.getByLabel('Broadcast Licence: Buyer').selectOption('Channel Meridian');
  await broadcast.getByLabel('Broadcast Licence: Your Ask').fill(String(Math.max(10_000, fair * 3)));
  await broadcast.getByRole('button', { name: 'Send The Proposal' }).click();
  await expect(broadcast.getByRole('list', { name: 'Broadcast Licence: Sent' })).toContainText('Waiting For An Answer');
  for (let i = 0; i < 4; i++) await advance(page, 'week');
  await section(page, 'Release');
  const sent = broadcast.getByRole('list', { name: 'Broadcast Licence: Sent' });
  await expect(sent).toContainText('Turned Down');
  await expect(sent.getByRole('list', { name: 'What Remains' })).toContainText('Ask Channel Meridian again for less');
  await expect(sent.getByRole('list', { name: 'What Remains' })).toContainText('Release it yourself: Transactional Digital');

  // At what rights like these sell for: an offer, signed by the player on the Release page.
  await broadcast.getByLabel('Broadcast Licence: Your Ask').fill(String(Math.max(1_000, fair)));
  await broadcast.getByRole('button', { name: 'Send The Proposal' }).click();
  for (let i = 0; i < 4; i++) await advance(page, 'week');
  await section(page, 'Release');
  await expect(sent).toContainText(/Accepted|Countered/);
  const offers = card(page, 'Distribution Offers');
  const row = offers.getByRole('listitem').filter({ hasText: 'From your Release Plan' }).first();
  await expect(row).toContainText('Channel Meridian');
  await row.getByRole('button', { name: /^Accept (Offer|The Late Slot)$/ }).click();
  await expect.poll(async () => (await project(page)).offers.find((o: { proposalId?: string; status: string }) => o.proposalId && o.status === 'accepted')?.distributor ?? null, { timeout: 30_000 }).toBe('Channel Meridian');

  // The stores: every cost named, then booked on the plan's date, with nobody to accept it.
  const stores = plan.getByRole('region', { name: 'Transactional Digital' });
  await expect(stores.getByRole('list', { name: 'Transactional Digital: Costs' })).toContainText("The Aggregator's Fee, Encoding And Quality Check");
  const book = stores.getByRole('button', { name: 'Release Through The Aggregator' });
  if (await book.isDisabled()) {
    await expect(stores).toContainText(/free\. Put money into the project from its Budget page/);
  } else {
    await book.click();
    await expect.poll(async () => (await project(page)).offers.some((o: { self?: string }) => o.self === 'transactional'), { timeout: 30_000 }).toBe(true);
    const saved = await project(page);
    const r = saved.releases.find((x: { distributor: string }) => x.distributor === 'The Digital Stores, Through Your Aggregator');
    expect(r.date).toBe(day(now, 70));
  }
  await page.screenshot({ path: `test-results/release-plan-${info.project.name}.png`, fullPage: true });
});
