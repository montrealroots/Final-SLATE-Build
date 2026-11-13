// The owner's v5 brief, 6 and 11, a series on its own route (from November 13, 2026): a drawn 2D series of two episodes,
// adapted from a work, made and delivered, then released through the digital stores on a Release Plan, episode by
// episode, a different route from the film's (v5-release-plan.spec). The world seed is pinned (a labelled fixture).
import { expect, test, type Page } from './test';
import { adaptWork, addScene, advance, castRoles, nav, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const project = async (page: Page): Promise<any> => (await readSavedState(page))?.projects?.[0];
const day = (t: number, n: number) => new Date(t + n * 86_400_000).toISOString().slice(0, 10);

test('a series released through the stores on its plan, an episode a week: a route of its own', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'A whole series, once, at desktop width.');
  test.setTimeout(1_200_000);
  await quickLife(page, 'gb-london', '2026-01-05');
  await pinSeed(page, 2);
  await adaptWork(page, { query: 'portal', work: /^Portal\b/, title: 'Test Chambers', format: 'Series', medium: 'Animation', technique: 'Drawn 2D', episodes: '2', runtime: '2', budget: 'Low Budget' });
  await expect.poll(async () => (await project(page))?.source?.kind ?? null, { timeout: 30_000 }).toBe('adapted');
  const made = await project(page);
  const lead: string = made.characters[0].name;
  const scenesIn = (ep: number) => made.scenes.filter((x: { episode?: number }) => (x.episode ?? 1) === ep).length;
  let before = 0;
  for (const ep of [1, 2]) {
    if (!scenesIn(ep)) { await addScene(page, { index: before, place: 'Chamber', chars: [lead], minutes: '1', episodeButton: `Add Scene To Episode ${ep}` }); before += 1; }
    before += scenesIn(ep);
  }
  await saveAndApprove(page);
  await castRoles(page, [lead]);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page, [lead]);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 80 });
  await expect.poll(async () => !!(await project(page))?.delivered, { timeout: 30_000 }).toBe(true);

  // The plan: the stores, the routes a film has in cinemas not offered to a series.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Test Chambers' }).first().click();
  await section(page, 'Release');
  const plan = card(page, 'Release Plan');
  await expect(plan.getByLabel('Distributor Sales')).toHaveCount(0);
  await expect(plan.getByLabel('Partner-Assisted Theatrical')).toHaveCount(0);
  const now = (await readSavedState(page)).now as number;
  await plan.getByLabel('Transactional Digital').check();
  await plan.getByLabel('Plan Territories').fill('GB');
  await plan.getByLabel('First Public Date').fill(day(now, 10));
  await plan.getByRole('button', { name: 'Save The Plan' }).click();
  const stores = plan.getByRole('region', { name: 'Transactional Digital' });
  await expect(stores.getByRole('list', { name: 'Transactional Digital: Costs' })).toContainText("The Aggregator's Fee, Encoding And Quality Check");
  await stores.getByRole('button', { name: 'Release Through The Aggregator' }).click();
  // Booked with an episode a week, the first on the plan's date; out on its days.
  await expect.poll(async () => (await project(page)).releases.find((r: { distributor: string }) => r.distributor === 'The Digital Stores, Through Your Aggregator')?.episodes?.length ?? 0, { timeout: 30_000 }).toBe(2);
  const r = (await project(page)).releases.find((x: { distributor: string }) => x.distributor === 'The Digital Stores, Through Your Aggregator');
  expect(r.episodes.map((e: { date: string }) => e.date)).toEqual([day(now, 10), day(now, 17)]);
  for (let i = 0; i < 4; i++) await advance(page, 'week');
  await expect.poll(async () => (await project(page)).releases.find((x: { distributor: string }) => x.distributor === 'The Digital Stores, Through Your Aggregator').episodes.map((e: { status: string }) => e.status), { timeout: 30_000 }).toEqual(['released', 'released']);
});
