// The owner's v5 brief, 11, the first journey, as one run (from November 13, 2026): a real work chosen, its brief
// proposed from its story and taken, the writing handed to Guide Me within a ceiling and worked by the writers it hires,
// the film cast, shot and delivered, and released through the player's own storefront on a Release Plan. The world seed
// is pinned (a labelled fixture); the work's story is its Wikipedia article's, credited.
import { expect, test, type Page } from './test';
import { adaptWork, advance, castRoles, nav, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const day = (t: number, n: number) => new Date(t + n * 86_400_000).toISOString().slice(0, 10);

test('from a real work to release: the brief from its story, the writing by Guide Me, made, delivered and released yourself', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'A whole career step, once, at desktop width.');
  test.setTimeout(1_200_000);
  await quickLife(page, 'gb-london', '2026-02-02');
  await pinSeed(page, 7);
  // The work, and its brief proposed from its story.
  await adaptWork(page, { query: 'Don Quixote', work: /^Don Quixote/, title: 'The Knight', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await expect.poll(async () => (await readSavedState(page))?.projects?.[0]?.proposal?.story?.article ?? null, { timeout: 30_000 }).toBe('Don Quixote');
  const made = (await readSavedState(page)).projects[0];
  expect(made.proposal.story).toMatchObject({ article: 'Don Quixote', licence: 'CC BY-SA 4.0' });
  expect(made.scenes.length).toBeGreaterThan(1);
  await saveAndApprove(page);
  // The writing handed over: the plan read, approved within a ceiling, and worked by the writers it hires.
  await section(page, 'Crew');
  await page.getByRole('button', { name: 'Guide Me For Writing' }).click();
  const dialog = page.getByRole('dialog', { name: 'Guide Me For Writing' });
  const cost = Number((await dialog.getByText('The Plan Costs:').locator('..').innerText()).match(/The Plan Costs: \$([\d,]+)/)![1].replace(/,/g, ''));
  await dialog.getByLabel('Spending Ceiling').fill(String(cost * 2));
  await dialog.getByRole('button', { name: 'Approve Guide Me' }).click();
  const box = page.getByRole('region', { name: 'Guide Me, Writing' });
  for (let i = 0; i < 40 && !/^Guide Me finished the writing/.test(await box.innerText()); i++) { await advance(page, 'next-day'); await section(page, 'Crew'); }
  await expect(box).toContainText(/^Guide Me finished the writing it was given/);
  await expect.poll(async () => ((await readSavedState(page))?.projects?.[0]?.writing ?? []).length, { timeout: 30_000 }).toBeGreaterThan(0);
  // A pass that came back to the player is theirs to settle; one accepted is in the script. Either way it was worked.
  const writing = (await readSavedState(page)).projects[0].writing as { status: string; passes: { done: number }[] }[];
  expect(writing.every((j) => j.passes.reduce((a, x) => a + x.done, 0) > 0)).toBe(true);
  // Cast, staffed, shot and delivered.
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 40 });
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);
  // Released through the player's own storefront, on a plan: the credits name the work; the release goes out on its date.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'The Knight' }).first().click();
  await section(page, 'Release');
  await expect(card(page, 'Credits')).toContainText('Based on Don Quixote');
  const plan = card(page, 'Release Plan');
  const now = (await readSavedState(page)).now as number;
  await plan.getByLabel('Direct To Audience').check();
  await plan.getByLabel('Plan Territories').fill('GB');
  await plan.getByLabel('First Public Date').fill(day(now, 10));
  await plan.getByRole('button', { name: 'Save The Plan' }).click();
  await plan.getByRole('region', { name: 'Direct To Audience' }).getByRole('button', { name: 'Open Your Storefront' }).click();
  await expect.poll(async () => (await readSavedState(page)).projects[0].releases.some((r: { distributor: string }) => r.distributor === 'Your Own Storefront'), { timeout: 30_000 }).toBe(true);
  for (let i = 0; i < 3; i++) await advance(page, 'week');
  await expect.poll(async () => (await readSavedState(page)).projects[0].releases.find((r: { distributor: string }) => r.distributor === 'Your Own Storefront').status, { timeout: 30_000 }).toBe('released');
});
