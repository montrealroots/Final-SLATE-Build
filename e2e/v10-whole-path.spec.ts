// The whole v8 path in one game (the owner's v8 package, 11: "one journey through the whole v8 path, from inheritance and
// bank through company, budget and permit to an award"; from November 17, 2026). The company left play on November 14,
// 2026, so the path is: a life abroad on a work permit paid from the inheritance; the inheritance and the permit's fee in
// Your Bank and the permit in Your Papers; a short film whose planned budget is changed with a reason and whose payments
// are dated (When It's Paid); the work cast, crewed, shot and delivered; a release; a festival entry carried to its
// result; and all of it kept through Save & Exit and Continue. Every step is through the interface.
//
// Fixtures, labelled: the world seed is pinned (helpers.ts pinSeed, 1994, as e2e/live-action.spec.ts, the seed it reaches
// delivery with), so the run is the same every time. Nothing else is written into the save. Desktop, in Chromium.
import { expect, test, type Page } from './test';
import { addScene, advance, createCharacter, freshStart, nav, pinSeed, pressSaveAndExit, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

test.use({ actionTimeout: 20_000 });

const TITLE = 'The Last Ferry';
async function openProject(page: Page): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: TITLE }).click();
}
/** The bank's statement for March 2026: the inheritance in, and the permit's fee out of it. */
async function statement(page: Page): Promise<void> {
  await page.getByRole('tab', { name: 'Statements' }).click();
  const statements = page.locator('.panel, section', { has: page.getByRole('heading', { name: 'Statements' }) }).first();
  // "March 2026, So Far" while the month runs, "March 2026" once it's over.
  const period = statements.getByLabel('Period');
  await period.selectOption({ label: (await period.locator('option').allInnerTexts()).find((x) => x.startsWith('March 2026'))! });
  await expect(statements).toContainText('Your Inheritance');
  await expect(statements).toContainText('Work permit: The Fee, Before You Arrived');
}
const panel = (page: Page, heading: string) => page.locator('.panel, section', { has: page.getByRole('heading', { name: heading, exact: true }) }).first();

test('the whole v8 path: a permit paid from the inheritance, the bank, a dated budget, delivery, a release and a festival result, kept after a reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One full career run, at desktop width.');
  test.setTimeout(1_500_000);
  await freshStart(page);
  await createCharacter(page, {
    name: 'Amaranta Okonkwo', pronouns: 'She/Her', birthDate: '2007-02-28', birthplace: 'Lagos', heritages: ['Igbo'], nationalities: ['Nigeria'],
    mainLanguage: 'English', extraLanguages: [], start: 'Toronto', startDate: '2026-03-02', startTime: '08:00',
  });
  // Living abroad takes real papers: she arrives on Canada's work permit, its fee paid from the inheritance.
  await expect(page.getByText(/^You live in Canada on your Work permit, issued before you arrived; its fee, .+, came from your inheritance\./)).toBeVisible();
  await pinSeed(page, 1994);

  // The bank: the inheritance, and the permit's fee taken from it, each a line of its own.
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await expect(page.getByRole('heading', { name: 'Your Bank', level: 1 })).toBeVisible();
  await statement(page);
  await nav(page, 'Home');
  // The papers: the permit in force, and work where she lives allowed by it.
  await expect(panel(page, 'Your Papers')).toContainText('Work in CanadaAllowed');

  // A short film, written and approved, with its starting backing.
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill(TITLE);
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('drama');
  await page.getByRole('button', { name: 'Add Drama' }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await section(page, 'Characters');
  for (const n of ['Odile', 'The Ferryman']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Ferry Dock', chars: ['Odile', 'The Ferryman'], minutes: '3' });
  await saveAndApprove(page);

  // The budget: a plan changed with its reason moves no money; the payments still to make are dated, each with its payee.
  await section(page, 'Budget');
  const plan = page.locator('section.card', { has: page.getByRole('heading', { name: 'Plan And Money' }) });
  const cash = async () => (await plan.locator('dt', { hasText: /^Cash Available$/ }).locator('xpath=following-sibling::dd[1]').innerText()).trim();
  const before = await cash();
  await plan.getByLabel('New Planned Budget (US Dollars)').fill('60000');
  await plan.getByLabel('Why').fill('Two days on the water, not one');
  await plan.getByRole('button', { name: 'Change The Plan' }).click();
  await expect(plan.getByRole('list', { name: 'Plan Revisions' })).toContainText('Two days on the water, not one');
  expect(await cash()).toBe(before);
  const due = plan.getByRole('list', { name: "When It's Paid" });
  await expect(due.getByRole('listitem').first()).toContainText(/^[A-Z][a-z]+ \d+, 2026: .+, to .+\$[\d,]+/);
  await expect(due).toContainText('to whoever you hire as');
  await expect(plan.getByRole('list', { name: 'Can It Pay?' })).toContainText(/Funded overall|Not funded overall/);

  // Cast, crew, schedule, and the shoot through to delivery.
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'Odile' }).getByRole('button', { name: 'Cast Yourself' }).click();
  await roles.locator('li', { hasText: 'The Ferryman' }).getByRole('button', { name: 'Find Performers' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
  expect(await staffEveryDepartment(page)).toBeGreaterThan(2);
  await advance(page, 'next-event');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page);
  await section(page, 'Edit');
  await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();

  // A digital release in Canada, out on its day.
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
  await page.getByLabel('Territory Code').fill('CA');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  for (let i = 0; i < 3 && !(await history.getByText('Released', { exact: true }).count()); i++) { await advance(page, 'month'); await openProject(page); await section(page, 'Release'); }
  await expect(history.getByText('Released', { exact: true })).toBeVisible();

  // An entry at Clermont-Ferrand's International Competition, carried to its result: an award's decision.
  const edition = async () => (await readSavedState(page)).editions.find((e: { institutionId: string; year: number; submissionOpens: number }) => e.institutionId === 'clermont' && e.submissionOpens > (0 as number) && e.year === 2027) as { label: string; submissionOpens: number };
  const { label, submissionOpens } = await edition();
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
  const status = async () => (await yours().locator('.chip').first().innerText()).trim();
  await expect(yours().locator('.chip').first()).toHaveText('Submitted');
  // Reviewed after the deadline, decided, and, if selected, judged when the festival is held: time passes until it is.
  for (let i = 0; i < 20 && ['Submitted', 'Accepted For Consideration', 'In Competition'].includes(await status()); i++) {
    await advance(page, 'month');
    await openProject(page);
    await section(page, 'Festivals And Awards');
    await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: label }).first().click();
  }
  const result = await status();
  expect(['Not Selected', 'Selected', 'Won', 'Nominated'], result).toContain(result);

  // Saved, left and continued: the plan, the release, the result and the bank are as they were.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openProject(page);
  await section(page, 'Festivals And Awards');
  await expect(page.locator('section', { hasText: 'Your Entries' }).first().locator('li', { hasText: 'International Competition' }).locator('.chip').first()).toHaveText(result);
  await section(page, 'Release');
  await expect(history.getByText('Released', { exact: true })).toBeVisible();
  await section(page, 'Budget');
  await expect(plan.getByRole('list', { name: 'Plan Revisions' })).toContainText('Two days on the water, not one');
  await nav(page, 'Home');
  await page.getByRole('button', { name: 'Open Your Bank' }).click();
  await statement(page);
});
