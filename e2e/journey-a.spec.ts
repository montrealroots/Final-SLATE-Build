// Journey A of the gameplay-connectivity pass (November 10, 2026), through visible controls only, in one unbroken run:
//
// - a life; a script with its characters named, approved and financed by the agreed starting backing;
// - one part auditioned (three read, one shortlisted and called back with the player, then offered the part), the
//   other part the player's own;
// - production to delivery and the edit, and a digital release;
// - an entry at the Clermont-Ferrand International Short Film Festival, carried through to its result;
// - Save And Exit, Continue, and the result, the cast and the release checked again.
//
// The world seed is pinned (helpers.ts seededLife; seed 11, as auditions.spec.ts, so the same three performers read).
// It is a labelled fixture, chosen once, not adjusted to pass. Nothing else is written into the save.
import { expect, test, type Page } from './test';
import { addScene, advance, nav, newProject, pressSaveAndExit, readSavedState, runToDelivery, saveAndApprove, section, seededLife, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/journey-a-${name}.png`, fullPage: true });

async function openProject(page: Page): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Ferry' }).click();
}

test('journey A: script, characters, auditions and a callback, financing, production, the edit, delivery, release, an entry and its result, kept after a reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One full career run, at desktop width.');
  test.setTimeout(1_200_000);
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  for (const n of ['Ines', 'Marco']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines', 'Marco'], minutes: '3' });
  await saveAndApprove(page); // writes the pitch, approves, and accepts the starting backing with its terms

  // Casting: Marco is yours; Ines is auditioned, shortlisted, called back with you, and offered the part.
  await section(page, 'Cast');
  const role = (name: string) => page.locator('section.card li', { has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) }).first();
  await role('Marco').getByRole('button', { name: 'Cast Yourself' }).click();
  await role('Ines').getByRole('button', { name: 'Find Performers' }).click();
  const invite = page.getByRole('dialog', { name: 'Cast Ines' });
  for (let i = 0; i < 3; i++) await invite.getByRole('button', { name: /^Invite .+ To Read$/ }).first().click();
  await invite.getByRole('button', { name: 'Close' }).first().click();
  await advance(page, 'week');
  await section(page, 'Cast');
  const table = page.getByRole('table', { name: 'Auditions For Ines' });
  const tariq = table.locator('tr', { hasText: 'Tariq Varga' });
  await tariq.getByRole('button', { name: 'Shortlist' }).click();
  await tariq.getByLabel('Read Tariq Varga With').selectOption({ label: 'You (cast as Marco)' });
  await tariq.getByRole('button', { name: 'Call Back Tariq Varga' }).click();
  await advance(page, 'week');
  await section(page, 'Cast');
  await expect(tariq).toContainText('Called back on January 15, 2026');
  await tariq.getByRole('button', { name: 'Offer Ines To Tariq Varga' }).click();
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await section(page, 'Cast');
  // The cast list says how each part was cast: you, and after a callback.
  await expect(page.getByText(/Tariq Varga/).first()).toBeVisible();
  await shot(page, '01-cast');

  // Production, the edit and delivery.
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page);
  await section(page, 'Edit');
  await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();
  await section(page, 'Release');
  const credits = page.locator('section.card', { has: page.getByRole('heading', { name: 'Credits' }) });
  await expect(credits.locator('tr', { hasText: 'Tariq Varga' })).toContainText('as Ines');
  await expect(credits.locator('tr', { hasText: 'as Marco' })).toBeVisible();

  // A digital release in Britain, out on its day.
  await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
  await page.getByLabel('Territory Code').fill('GB');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  for (let i = 0; i < 3 && !(await history.getByText('Released', { exact: true }).count()); i++) { await advance(page, 'month'); await openProject(page); await section(page, 'Release'); }
  await expect(history.getByText('Released', { exact: true })).toBeVisible();

  // Clermont-Ferrand's International Competition: open to it, entered, and carried to its result.
  const edition = async () => (await readSavedState(page)).editions.find((e: { institutionId: string; year: number }) => e.institutionId === 'clermont' && e.year === 2027) as { label: string; submissionOpens: number };
  const { label, submissionOpens } = await edition();
  // Entries open on the organizer's date: time passes until then, as a player waits for it.
  for (let i = 0; i < 12 && (await readSavedState(page)).now < submissionOpens; i++) await advance(page, 'month');
  await openProject(page);
  await section(page, 'Festivals And Awards');
  await page.getByRole('button', { name: label, exact: true }).first().click();
  const comp = page.getByRole('region', { name: /^(Categories|Sections)$/ }).locator('li').filter({ has: page.locator('strong', { hasText: /^International Competition$/ }) });
  await comp.getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  const yours = () => page.locator('section', { hasText: 'Your Entries' }).last().locator('li', { hasText: 'International Competition' });
  await expect(yours().locator('.chip').first()).toHaveText('Submitted');
  const status = async () => (await yours().locator('.chip').first().innerText()).trim();
  // Reviewed after the deadline, then announced on the organizer's date: time passes until the result is out.
  for (let i = 0; i < 14 && ['Submitted', 'Accepted For Consideration'].includes(await status()); i++) {
    await advance(page, 'month');
    await openProject(page);
    await section(page, 'Festivals And Awards');
    await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: label }).first().click();
  }
  // Seed 11: selected for the competition. Its prizes are decided among the selection when the festival is held.
  expect(await status()).toBe('In Competition');
  for (let i = 0; i < 4 && (await status()) === 'In Competition'; i++) {
    await advance(page, 'month');
    await openProject(page);
    await section(page, 'Festivals And Awards');
    await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: label }).first().click();
  }
  const result = await status();
  expect(result).toBe('Selected');
  await shot(page, '02-result');

  // Saved, left and continued: the result, the cast and the release are as they were.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openProject(page);
  await section(page, 'Festivals And Awards');
  await expect(page.locator('section', { hasText: 'Your Entries' }).first().locator('li', { hasText: 'International Competition' }).locator('.chip').first()).toHaveText(result);
  await section(page, 'Release');
  await expect(credits.locator('tr', { hasText: 'Tariq Varga' })).toContainText('as Ines');
  await expect(history.getByText('Released', { exact: true })).toBeVisible();
});
