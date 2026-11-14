// The owner's v6 package, J05 (from November 13, 2026): a 2D short's animatic revised twice, once before animation and
// once after, through the Production page. Each time the preview says what starts over and how many days already worked
// are lost, before anything is reset. Early, it is the animatic and the little begun on it; late, the animation and
// everything built on it.
// Then the short is finished and delivered. The engine's rule is tests/animatic-revision.test.ts.
import { expect, test, type Page } from './test';
import { addScene, advance, approveDesigns, castRoles, newProject, quickLife, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.describe.configure({ timeout: Number(process.env.SLATE_JOURNEY_TIMEOUT) || 900_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'Full media journeys run once, at desktop width.'));

type T = { id: string; kind: string; label: string; done: number; workedDays: number; status: string };
const tasks = async (page: Page): Promise<T[]> => (await readSavedState(page)).projects[0].tasks;
const animatic = (ts: T[]) => ts.find((t) => t.id === 'anim:animatic:all')!;
const animation = (ts: T[]) => ts.filter((t) => t.kind === 'anim:animation');

/** Keep the work moving a day at a time until `until` holds of the saved tasks. */
async function workUntil(page: Page, until: (ts: T[]) => boolean, days = 200): Promise<void> {
  for (let i = 0; i < days && !until(await tasks(page)); i++) {
    await advance(page, 'next-day');
    await staffEveryDepartment(page);
    await castRoles(page);
    await approveDesigns(page);
  }
  expect(until(await tasks(page))).toBe(true);
}

async function preview(page: Page): Promise<{ names: string[]; days: number }> {
  await section(page, 'Production');
  await page.getByRole('region', { name: 'Animatic' }).getByRole('button', { name: 'Revise The Animatic' }).click();
  const dialog = page.getByRole('dialog', { name: 'Revise The Animatic?' });
  const lead = await dialog.getByText(/^This work starts over, and the [\d.]+ days? already worked on it are lost:$/).textContent();
  const names = await dialog.getByRole('list', { name: 'Work That Starts Over' }).getByRole('listitem').allTextContents();
  return { names, days: Number(lead!.match(/([\d.]+) days?/)![1]) };
}

test('J05: a 2D animatic revised before animation costs its own days and little more; after animation, the animation built on it starts over, said first', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-01-05');
  await newProject(page, { title: 'Paper Kite', format: 'Short Film', medium: 'Animation', technique: 'Drawn 2D', finish: 'Limited Animation', runtime: '2' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Juno');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Rooftop', chars: ['Juno'], minutes: '0.5' });
  await saveAndApprove(page);
  await castRoles(page, ['Juno']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // Before animation: the animatic is cut and nothing is animated yet. Revising it costs only the animatic's days.
  await workUntil(page, (ts) => animatic(ts)?.status === 'done');
  const before = await tasks(page);
  test.skip(animation(before).some((t) => t.done > 0), 'Animation began the day the animatic was finished; the engine test covers the early case.');
  const early = await preview(page);
  // The animatic, and whatever begun on it (layouts and backgrounds can start as soon as it is cut); no animation.
  expect(early.names[0]).toBe('Animatic');
  expect(early.names.filter((n) => animation(before).some((t) => t.label === n))).toEqual([]);
  const sum = (names: string[], ts: T[]) => Math.round(ts.filter((t) => names.includes(t.label)).reduce((a, t) => a + t.workedDays, 0) * 10) / 10;
  expect(early.days).toBe(sum(early.names, before));
  // Asked, and not yet: nothing changes.
  await page.getByRole('dialog', { name: 'Revise The Animatic?' }).getByRole('button', { name: 'Keep The Animatic' }).click();
  expect(animatic(await tasks(page)).status).toBe('done');
  await preview(page);
  await page.getByRole('dialog', { name: 'Revise The Animatic?' }).getByRole('button', { name: 'Revise It' }).click();
  await expect.poll(async () => animatic(await tasks(page)).done).toBe(0);

  // Cut again, and the animation done on it. Revised now, the animation and what is built on it start over too.
  await workUntil(page, (ts) => animation(ts).length > 0 && animation(ts).every((t) => t.status === 'done'));
  const after = await tasks(page);
  const late = await preview(page);
  // And the finish it moves, said before anything resets (forecast.ts; from November 14, 2026).
  await expect(page.getByRole('dialog', { name: 'Revise The Animatic?' })).toContainText(/Doing it again costs about \$[\d,]+ at your team's rates\./);
  await expect(page.getByRole('dialog', { name: 'Revise The Animatic?' })).toContainText(/The work left then finishes around \w+day, \w+ \d+, \d{4}, not \w+day, \w+ \d+, \d{4}\./);
  expect(late.names).toEqual(expect.arrayContaining(['Animatic', ...animation(after).map((t) => t.label)]));
  expect(late.days).toBe(sum(late.names, after));
  expect(late.days).toBeGreaterThan(early.days);
  await page.screenshot({ path: 'test-results/v6-animatic-revision-desktop.png', fullPage: true });
  const kept = after.filter((t) => t.done > 0 && !late.names.includes(t.label)).map((t) => [t.id, t.workedDays]);
  expect(kept.length).toBeGreaterThan(0); // designs and boards aren't built on the animatic
  await page.getByRole('dialog', { name: 'Revise The Animatic?' }).getByRole('button', { name: 'Revise It' }).click();
  await expect.poll(async () => animation(await tasks(page)).every((t) => t.done === 0)).toBe(true);
  const reset = await tasks(page);
  for (const [id, days] of kept) expect(reset.find((t) => t.id === id)!.workedDays, id as string).toBeGreaterThanOrEqual(days as number);

  // The rework done, the short is finished and delivered.
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page)).projects[0].delivered, { timeout: 30_000 }).toBe(true);
});
