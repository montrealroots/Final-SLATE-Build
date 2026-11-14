// The owner's v6 package, J06 (from November 14, 2026): a 3D short whose render farm is cut and restored, and whose
// finish date says so; a rig fault found in animation, the fix and the shots that wait for it, the finish moved; then
// delivered. The engine's rules are tests/rig-fault.test.ts. The world seed is pinned so the fault falls on the same day
// each run (a labelled fixture; the fault is the world's, about 3% of animation days).
import { expect, test, type Page } from './test';
import { addScene, advance, approveDesigns, castRoles, nav, newProject, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.describe.configure({ timeout: Number(process.env.SLATE_JOURNEY_TIMEOUT) || 900_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'Full media journeys run once, at desktop width.'));

const progress = (page: Page) => page.locator('section.card', { has: page.getByRole('heading', { name: 'Progress', exact: true }) });
const FORECAST = /At today's pace, the work left finishes around \w+day, (\w+ \d+, \d{4}), (\d+) working days? away\./;
async function forecast(page: Page): Promise<{ date: string; days: number }> {
  await section(page, 'Production');
  const m = (await progress(page).textContent())!.match(FORECAST);
  expect(m, 'the Progress card gives a forecast').toBeTruthy();
  return { date: m![1], days: Number(m![2]) };
}
async function renderNodes(page: Page, n: number): Promise<void> {
  await section(page, 'Schedule');
  await page.getByLabel('Render Nodes').fill(String(n));
  await page.getByLabel('Render Nodes').blur();
}

test('J06: a 3D short whose render farm and a rig fault move its finish, said each time, then delivered', async ({ page }) => {
  await quickLife(page, 'ca-vancouver', '2026-01-05');
  await pinSeed(page, 5); // pinned November 14, 2026: Cog's rig faults on this world, seeds 3, 7, 11 and 13 had none
  await newProject(page, { title: 'Gearheart', format: 'Short Film', medium: 'Animation', technique: '3D CG', finish: 'Limited Animation', runtime: '2' });
  await section(page, 'Characters');
  for (const n of ['Tilly', 'Cog']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Workshop', chars: ['Tilly', 'Cog'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Rooftop', chars: ['Cog'], minutes: '3' });
  await saveAndApprove(page);
  await castRoles(page, ['Tilly']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // The render farm: one node renders slower than twenty, and the finish says so.
  const full = await forecast(page);
  await renderNodes(page, 1);
  const one = await forecast(page);
  expect(one.days).toBeGreaterThan(full.days);
  await renderNodes(page, 20);
  expect((await forecast(page)).days).toBe(full.days);

  // Made, a day at a time, until a rig shows a fault in animation.
  type T = { id: string; kind: string; label: string; status: string };
  const tasks = async (): Promise<T[]> => (await readSavedState(page)).projects[0].tasks;
  let before = full;
  let animDays = 0;
  for (let i = 0; i < 260 && !(await tasks()).some((t) => t.kind === 'anim:rig-fix'); i++) {
    const animating = (await tasks()).some((t) => t.kind === 'anim:animation' && t.status === 'active');
    if (animating) { animDays += 1; before = await forecast(page); }
    const shots = (await tasks()).filter((t) => t.kind === 'anim:animation');
    if (shots.length && shots.every((t) => t.status === 'done')) break;
    await advance(page, 'next-day');
    await staffEveryDepartment(page);
    await castRoles(page);
    await approveDesigns(page);
  }
  const fix = (await tasks()).find((t) => t.kind === 'anim:rig-fix');
  expect(animDays).toBeGreaterThan(0);
  expect(fix, 'a rig fault falls on this pinned world').toBeTruthy();
  const who = fix!.label.replace(/^Fix Rig: /, '');
  const said = (await readSavedState(page)).log.find((l: { text: string }) => l.text.startsWith(`${who}'s rig showed a fault`));
  expect(said.text).toMatch(new RegExp(`^${who}'s rig showed a fault in animation\\. A rigger fixes it; shots with ${who} wait until then\\.`));
  await section(page, 'Production');
  await expect(page.getByText(fix!.label, { exact: true }).first()).toBeVisible();
  const after = await forecast(page);
  expect(after.days).toBeGreaterThanOrEqual(before.days - 1); // a day has passed; the fix holds the finish where it was or later
  await page.screenshot({ path: 'test-results/v6-rig-fault-desktop.png', fullPage: true });

  // Fixed, rendered and delivered.
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page)).projects[0].delivered, { timeout: 30_000 }).toBe(true);
  expect((await tasks()).find((t) => t.kind === 'anim:rig-fix')!.status).toBe('done');
  await nav(page, 'Home');
});
