// Playthroughs of the script rules as revised on November 7, 2026 (docs/SCREENWRITING-AUDIT.md), through visible controls
// only. Each checks that the player can see why something is available or blocked, where a requirement or cost comes
// from, which choice changes it, and what happens next. The world seed is pinned through the labelled fixture in
// helpers.ts; nothing else is injected.
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, newProject, pinSeed, quickLife, runToDelivery, section, secureStartingBacking, staffEveryDepartment, writePitch } from './helpers';

// Seed 7 was chosen because its offers include a broadcaster, so the late-slot choice is played; the seed is the only fixture.
const SEED = Number(process.env.RULES_SEED) || 7;
// A control that never appears fails within seconds, naming it, instead of waiting out the whole journey.
test.use({ actionTimeout: 20_000 });

async function addCharacters(page: Page, names: string[]): Promise<void> {
  await section(page, 'Characters');
  for (const n of names) {
    await page.getByLabel('Character Name').fill(n);
    await page.getByRole('button', { name: 'Add Character' }).click();
  }
}

async function approveDraft(page: Page): Promise<void> {
  await section(page, 'Script');
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
}

const raise = (page: Page) => page.locator('section.card', { has: page.getByRole('heading', { name: 'Raise Money' }) });
const grantRow = (page: Page) => raise(page).locator('li', { hasText: 'Screen Arts Fund Grant' });

test('a supporting antagonist, an incomplete pitch and a revised treatment: what the grant needs, and sending it', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  await quickLife(page, 'gb-london', '2026-01-05');
  await newProject(page, { title: 'Night Line', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await addCharacters(page, ['Ines', 'Marcus']);

  // The antagonist's story function doesn't move the part into the leading categories; the placement says why.
  const marcus = page.getByRole('article', { name: 'Marcus' });
  await marcus.getByRole('button', { name: 'Edit Character' }).click();
  await marcus.getByRole('checkbox', { name: 'Antagonist' }).check();
  await expect(marcus.getByText("Marcus is entered in the supporting categories, from the part's size (Supporting). Change Awards Placement on the character to enter it elsewhere.")).toBeVisible();
  await expect(marcus.getByText('a supporting antagonist stays supporting', { exact: false })).toBeVisible();
  await marcus.getByLabel('Awards Placement').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/rules-${info.project.name}-supporting-antagonist.png`, fullPage: true });
  // Placing it is the producer's choice, and is said back; By Role Size returns it.
  await marcus.getByLabel('Awards Placement').selectOption({ label: 'Leading' });
  await expect(marcus.getByText('Marcus is entered in the leading categories, as you placed the part.')).toBeVisible();
  await marcus.getByLabel('Awards Placement').selectOption({ label: 'By Role Size' });
  await expect(marcus.getByText(/Marcus is entered in the supporting categories, from the part's size/)).toBeVisible();

  // A script with only a logline written.
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Depot', chars: ['Ines', 'Marcus'], minutes: '3' });
  await page.getByLabel('Logline', { exact: true }).fill('The last tram, the last driver, one more night.');
  await approveDraft(page);

  // Before the agreed starting backing (which would cover the whole target), the grant names its documents and the fields still empty; nothing about their content is judged.
  await section(page, 'Budget');
  await expect(grantRow(page)).toContainText('A grant application includes a Pitch, a Treatment and a Statement Of Intent.');
  await expect(grantRow(page)).toContainText('Still to write in the Story panel: Premise, Central Conflict, Point Of View, Intended Ending, Theme and Stakes.');
  await expect(page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' })).toBeDisabled();
  await grantRow(page).scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/rules-${info.project.name}-incomplete-pitch.png`, fullPage: true });

  // The pitch and statement written; the treatment is what's left.
  await section(page, 'Script');
  await page.getByLabel('Premise', { exact: true }).fill('A driver and a stranger keep the night service running.');
  await page.getByLabel('Theme', { exact: true }).fill('Care as work.');
  await page.getByLabel('Stakes', { exact: true }).fill('The night workers get home, or they don\'t.');
  await section(page, 'Budget');
  await expect(grantRow(page)).toContainText('Still to write in the Story panel: Central Conflict, Point Of View and Intended Ending.');

  // The revised treatment: now the application can be sent, and the record says what went with it.
  await section(page, 'Script');
  await page.getByLabel('Central Conflict', { exact: true }).fill('The depot wants the line closed.');
  await page.getByLabel('Point Of View', { exact: true }).fill('The driver.');
  await page.getByLabel('Intended Ending', { exact: true }).fill('The first morning tram runs.');
  await section(page, 'Budget');
  await expect(page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' })).toBeEnabled();
  await page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' }).click();
  const backers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Backers' }) });
  const grant = backers.locator('li', { hasText: 'Screen Arts Fund Grant' });
  await expect(grant).toContainText('Considering');
  await expect(grant).toContainText("Sent with the approved script (draft 1): Pitch, Treatment, Statement Of Intent. They read it; SLATE doesn't judge it.");
  await expect(grant).toContainText('Their answer is due');
  await grant.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `test-results/rules-${info.project.name}-treatment-sent.png`, fullPage: true });
});

test('a mature project: declared content, an essential scene cut then picked up, and what the broadcaster offers', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The full journey runs once, at desktop width.');
  test.setTimeout(900_000);
  await quickLife(page, 'gb-london', '2026-01-05');
  await pinSeed(page, SEED);
  await newProject(page, { title: 'Hard Water', format: 'Short Film', runtime: '6', budget: 'Micro Budget', audience: 'Adult' });
  await addCharacters(page, ['Ada', 'Ben']);
  const ada = page.getByRole('article', { name: 'Ada' });
  await ada.getByRole('button', { name: 'Edit Character' }).click();
  await ada.getByLabel('Role Size').selectOption({ label: 'Lead' });

  // Three scenes: the first plants a clue the third pays off; the second is declared essential.
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Quay', chars: ['Ada'], minutes: '2' });
  await addScene(page, { index: 1, place: 'Boathouse', chars: ['Ada', 'Ben'], minutes: '2' });
  await addScene(page, { index: 2, place: 'Pumping Station', chars: ['Ben'], minutes: '2' });
  const second = page.locator('article.scene-card').nth(1);
  await second.getByRole('button', { name: 'Edit Scene' }).click();
  await second.getByRole('checkbox', { name: 'Essential To The Story' }).check();
  await second.getByRole('button', { name: 'Close Scene' }).click();
  await page.getByLabel('What Is Set Up').fill('The pump log');
  await page.getByLabel('Kind', { exact: true }).selectOption({ label: 'Clue' });
  await page.getByRole('button', { name: 'Add Setup' }).click();
  await page.getByLabel('Planted In').selectOption({ index: 1 });
  await page.getByLabel('Pays Off In').selectOption({ index: 3 });
  await writePitch(page);

  // Content is the producer's declaration, by issue and level: no rating is inferred.
  const content = page.locator('section.card', { has: page.getByRole('heading', { name: 'Content' }) });
  await content.getByLabel('Violence', { exact: true }).selectOption({ label: 'Strong' });
  await content.getByLabel('Language', { exact: true }).selectOption({ label: 'Moderate' });
  await expect(content).toContainText('Declared: Strong violence, moderate language.');
  await expect(content).toContainText('Only a classification body gives a rating');
  await content.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/rules-desktop-content-declared.png', fullPage: true });
  await approveDraft(page);
  await secureStartingBacking(page);

  // Production: crew, cast, schedule.
  await castRoles(page, []);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // The essential scene isn't shot yet. Cutting it is offered with what it would do, from what was declared.
  await section(page, 'Edit');
  const coverage = page.locator('section.card', { has: page.getByRole('heading', { name: 'Coverage' }) });
  await expect(coverage).toContainText('Not shot yet: scheduled for');
  await coverage.getByRole('button', { name: /^Cut Scene 2 .*From The Edit$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Cut This Scene From The Edit?' });
  await expect(dialog).toContainText('is marked essential to the story: without it the edit has a gap the audience notices (editing 8 points lower in this game\'s model).');
  await expect(dialog).toContainText('The cut runs about 2 minutes shorter.');
  await expect(dialog).toContainText('It comes off its scheduled shoot day; a day left with nothing to shoot is cancelled.');
  await page.screenshot({ path: 'test-results/rules-desktop-cut-dialog.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Cut It' }).click();
  await expect(coverage.getByRole('heading', { name: 'Cut From The Edit' })).toBeVisible();
  await expect(coverage).toContainText('marked essential: the edit carries the gap');
  await section(page, 'Schedule');
  await expect(page.getByText('Cancelled', { exact: true }).first()).toBeVisible();

  // Changing course: restore it, and the gap is there to fill with a pickup day.
  await section(page, 'Edit');
  await coverage.getByRole('button', { name: /^Restore Scene 2/ }).click();
  await expect(coverage).toContainText('Nothing has been shot for it yet.');
  await coverage.getByRole('checkbox', { name: /^Scene 2 .*Nothing has been shot for it yet\.$/ }).check();
  await coverage.getByRole('button', { name: 'Request Pickups' }).click();
  await expect(coverage).toContainText('Not shot yet: scheduled for');
  await coverage.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/rules-desktop-pickup.png', fullPage: true });

  await runToDelivery(page);

  // Distribution: the declaration is shown as such; strong content keeps a broadcast to a late slot, or a broadcast edit.
  await section(page, 'Release');
  const offers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Distribution Offers' }) });
  await expect(offers).toContainText('Declared content: Strong violence, moderate language. This is your declaration, not a rating');
  for (let i = 0; i < 6 && !(await offers.getByRole('button', { name: 'Accept The Late Slot' }).count()); i++) {
    await advance(page, 'week');
    await section(page, 'Release');
  }
  const late = offers.locator('li', { has: page.getByRole('button', { name: 'Accept The Late Slot' }) }).first();
  await expect(late).toContainText('in a late-evening slot');
  await expect(late).toContainText("Ofcom's Broadcasting Code keeps material unsuitable for children until after the 9pm watershed on free-to-air television.");
  await expect(late).toContainText('A broadcast edit, cut for an earlier slot, costs about $2,500 more in delivery materials');
  await late.scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'test-results/rules-desktop-late-slot.png', fullPage: true });
  await late.getByRole('button', { name: 'Accept With A Broadcast Edit' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  await expect(history).toContainText('Broadcast in GB');
});
