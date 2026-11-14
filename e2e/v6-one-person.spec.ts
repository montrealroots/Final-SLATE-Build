// The owner's v6 package, J03 (from November 13, 2026): a work whose story identifies one person, adapted through the
// screens. The brief proposes that one person and says no other is identified; nobody is set against them and nobody is
// invented. The project is approved, made with the player in the part, delivered and released, and its credits name
// that one part only. Its one acting work then stands on the Profile (J22's reading). The engine's rule, and the work that identifies nobody, is tests/work-cast.test.ts.
import { expect, test } from './test';
import { adaptWork, advance, creditsTable, nav, produceToDelivery, quickLife, readSavedState, saveAndApprove, section } from './helpers';

test.describe.configure({ timeout: Number(process.env.SLATE_JOURNEY_TIMEOUT) || 900_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'Full media journeys run once, at desktop width.'));

const DUPIN = 'C. Auguste Dupin';

test('J03: a story with one person is adapted with that one and nobody invented, made, delivered and released', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-01-05');
  await adaptWork(page, {
    query: 'marie rog', work: /^The Mystery of Marie Rog/, title: 'The Seine', format: 'Short Film', budget: 'Low Budget',
    onStep: async (step) => {
      if (step !== 'preview') return;
      await expect(page.getByText("This story doesn't identify another character. You can add one or continue.")).toBeVisible();
    },
  });

  // One character, no relationships, and every scene holds only them.
  await expect.poll(async () => (await readSavedState(page)).projects?.length, { timeout: 30_000 }).toBe(1);
  const p = (await readSavedState(page)).projects[0];
  expect(p.characters.map((c: { name: string }) => c.name)).toEqual([DUPIN]);
  expect(p.relationships).toEqual([]);
  expect(p.scenes.length).toBeGreaterThan(0);
  expect(p.scenes.every((x: { participants: string[] }) => x.participants.every((id) => id === p.characters[0].id))).toBe(true);
  await section(page, 'Characters');
  await expect(page.getByRole('article', { name: DUPIN })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(1);

  // Whether it can go ahead names what holds it: first the script, then, approved, the lead nobody plays yet (V6-023).
  const goAhead = page.locator('section.card', { has: page.getByRole('heading', { name: 'Can It Go Ahead?' }) });
  await section(page, 'Overview');
  await expect(goAhead).toContainText('Not yet: script.');
  // Approved as it is, made with the player as Dupin, delivered.
  await saveAndApprove(page);
  await section(page, 'Overview');
  await expect(goAhead).toContainText(`Not yet: cast. One part is not cast: ${DUPIN} (a lead).`);
  await expect(goAhead.getByRole('list', { name: 'Ways Round It' })).toContainText('Play the part yourself');
  await produceToDelivery(page, { yourself: [DUPIN] });
  await expect.poll(async () => !!(await readSavedState(page)).projects[0].delivered, { timeout: 30_000 }).toBe(true);
  const credits = await creditsTable(page);
  expect(credits).toContain(`as ${DUPIN}`);
  expect(credits.match(/\bas [A-Z]/g) ?? []).toHaveLength(1); // one part credited, and no invented one

  // Released by the player, digitally, in the United States.
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
  await page.getByLabel('Territory Code').fill('US');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await advance(page, 'month');
  await advance(page, 'month');
  await section(page, 'Release');
  await expect(page.locator('section', { hasText: 'Release History' }).getByText('Released', { exact: true }).first()).toBeVisible();
  expect((await readSavedState(page)).projects[0].characters).toHaveLength(1);

  // J22's reading through the screens: one work in the part is one acting work, a grade needs more, and a reload counts
  // nothing twice.
  await nav(page, 'Profile');
  const list = page.locator('dl[aria-label="Standing By Role"]');
  await expect(list).toBeVisible();
  const before = await list.textContent();
  expect(before).toMatch(/Actor\s*Emerging, from 1 completed work \(standing \d+\)\. Established needs 2 completed works in this role; you have 1\./);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Profile');
  await expect(list).toHaveText(before!);
});
