import { expect, test, type Page } from './test';
import { addScene, advance, creditsTable, nav, newProject, openStart, pinSeed, produceToDelivery, readSavedState, section, writePitch } from './helpers';

// The first-project journey, through visible controls only, from character creation to a second project.
// Labelled fixture: the world seed is fixed after creation (pinSeed), so backers' answers are the same every run.
const SEED = 3;

test.describe.configure({ timeout: 900_000 });

async function addCharacters(page: Page, names: string[]) {
  await section(page, 'Characters');
  for (const n of names) {
    await page.getByLabel('Character Name').fill(n);
    await page.getByRole('button', { name: 'Add Character' }).click();
  }
  await section(page, 'Script');
}

/** Creation as a player finishes it: a draft at Review, the starting time changed from Review, then Start My Story. */
async function createFromReview(page: Page) {
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 'review', name: 'Tomasz Wierzbicki-Adeyemi', pronouns: 'he', actingTitle: 'Actor', birthDate: '1991-03-12', birthplaceId: 'ng-lagos',
      heritages: [{ id: 'Polish', label: 'Polish', custom: false }, { id: 'Yoruba', label: 'Yoruba', custom: false }], heritageCustomText: '', mainLanguage: 'en',
      languages: [{ code: 'pl', proficiency: 'Fluent' }], startPlaceId: 'gb-london', startDate: '2026-03-02', startTime: '08:00', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Edit Starting Point' }).click();
  await page.getByLabel('Starting Time').fill('09:15');
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(page.locator('section.card', { hasText: 'Starts On' })).toContainText('Monday, March 2, 2026, at 9:15 AM');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

const amount = (page: Page, label: string) => page.locator('section.card', { has: page.getByRole('heading', { name: 'Financing' }) })
  .locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd[1]');

test('first project: write, approve, a refusal, the agreed backing, production, release, and a second project with its history intact', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The full journey runs once, at desktop width; the phone checks the financing screens below.');
  await createFromReview(page);
  await pinSeed(page, SEED);
  const before = await readSavedState(page);
  expect(before.projects).toEqual([]);

  // A project: the budget size is an estimate, not money.
  await newProject(page, { title: 'The Last Tram', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await section(page, 'Overview');
  await expect(page.getByText('Write your first scene.')).toBeVisible();
  await addCharacters(page, ['Marta', 'The Conductor']);
  await addScene(page, { index: 0, place: 'Tram Depot', chars: ['Marta', 'The Conductor'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Tram', chars: ['Marta'], minutes: '3' });
  await writePitch(page);
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();

  // Nothing to spend yet: the overview says so, and hiring is refused with the reason.
  await section(page, 'Overview');
  await expect(page.getByText(/Raise money: no backer has paid in yet, and hiring needs money\. Your target is \$40,000\./)).toBeVisible();
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'The Conductor' }).getByRole('button', { name: 'Find Performers' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
  await expect(page.getByRole('dialog').getByRole('alert').first()).toContainText('but only $0 is uncommitted');
  await page.keyboard.press('Escape');

  // A grant: asked, considered for three weeks, refused with its reason. Nothing arrives.
  await section(page, 'Budget');
  await expect(amount(page, 'Budget Estimate')).toHaveText('$40,000');
  await expect(amount(page, 'Received')).toHaveText('$0');
  await page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' }).click();
  const backers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Backers' }) });
  await expect(backers).toContainText('Considering');
  await expect(backers).toContainText('Their answer is due');
  for (let i = 0; i < 4; i++) await advance(page, 'week');
  await section(page, 'Budget');
  await expect(backers.locator('li', { hasText: 'Screen Arts Fund Grant' })).toContainText('Said No');
  await expect(backers.locator('li', { hasText: 'Screen Arts Fund Grant' })).toContainText("The fund's panel chose other projects this round");
  await expect(page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' })).toBeDisabled();
  await expect(amount(page, 'Received')).toHaveText('$0');

  // The agreed starting backing: terms read before accepting; the money arrives only then.
  await page.getByRole('button', { name: 'Approach Starting Backing' }).click();
  await page.getByRole('button', { name: 'Accept Offer' }).click();
  const terms = page.getByRole('dialog', { name: 'Accept These Terms?' });
  await expect(terms).toContainText('$40,000 when you sign.');
  await expect(terms).toContainText("They are repaid $40,000 from the project's income before the project keeps any.");
  await page.screenshot({ path: `test-results/${info.project.name}-funding-terms.png`, fullPage: true });
  await terms.getByRole('button', { name: 'Accept $40,000' }).click();
  await expect(amount(page, 'Received')).toHaveText('$40,000');
  await expect(amount(page, 'Still To Raise')).toHaveText('$0');
  await section(page, 'Overview');
  await expect(page.getByText(/still needs? casting|Hire your crew/)).toBeVisible();

  // Make it: cast (playing Marta yourself), crew, schedule, production, edit, delivery.
  await section(page, 'Script');
  await produceToDelivery(page, { yourself: ['Marta'] });
  const credits = await creditsTable(page);
  expect(credits).toContain('as Marta');
  expect(credits).toMatch(/With Thanks To\tStarting Backing/);
  // The stored game, once the save after delivery has landed.
  await expect.poll(async () => (await readSavedState(page)).projects[0].delivered, { timeout: 20_000 }).not.toBeNull();
  const delivered = (await readSavedState(page)).projects[0];
  expect(delivered.finance.deals.map((d: { kind: string; status: string }) => `${d.kind}:${d.status}`)).toEqual(['grant:declined', 'starting:accepted']);

  // Release it: a digital self-release, planned through the Release controls.
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
  await page.getByLabel('Territory Code').fill('GB');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await expect(page.locator('section', { hasText: 'Release History' }).locator('li', { hasText: 'in GB' })).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-first-release.png`, fullPage: true });

  // The next project: the first one's history stays, the starting backing is spent, and a commissioner now listens.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Night Shift At The Depot');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Night Shift At The Depot', level: 1 })).toBeVisible();
  await section(page, 'Budget');
  await expect(page.getByRole('button', { name: 'Approach Starting Backing' })).toHaveCount(0);
  const raise = page.locator('section.card', { has: page.getByRole('heading', { name: 'Raise Money' }) });
  await expect(raise.locator('li', { hasText: 'Commissioner' })).toContainText('Approve a script first.');
  await expect(raise.locator('li', { hasText: 'Commissioner' })).not.toContainText('Deliver a project first.');
  await expect.poll(async () => (await readSavedState(page)).projects.map((p: { title: string }) => p.title), { timeout: 20_000 }).toEqual(['The Last Tram', 'Night Shift At The Depot']);
  const after = await readSavedState(page);
  expect(after.projects[0].credits).toEqual(delivered.credits);
  expect(after.projects[0].releases.length).toBe(1);
  await nav(page, 'Profile');
  await expect(page.getByText('The Last Tram').first()).toBeVisible();
});

test('the financing screens on a phone: estimate, the agreed backing and its terms, the money arriving', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  await createFromReview(page);
  await newProject(page, { title: 'Small Hours', format: 'Short Film', runtime: '5', budget: 'Micro Budget' });
  await addCharacters(page, ['Ada']);
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Ada'], minutes: '3' });
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await section(page, 'Budget');
  await expect(amount(page, 'Received')).toHaveText('$0');
  await page.getByRole('button', { name: 'Approach Starting Backing' }).click();
  await page.getByRole('button', { name: 'Accept Offer' }).click();
  await page.screenshot({ path: `test-results/${info.project.name}-terms-dialog.png` });
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: 'Accept $40,000' }).click();
  await expect(amount(page, 'Received')).toHaveText('$40,000');
  await page.screenshot({ path: `test-results/${info.project.name}-financing.png`, fullPage: true });
});
