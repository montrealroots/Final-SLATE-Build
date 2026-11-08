// One connected career through the real interface (November 7, 2026): creation with Review edits, naming characters,
// script choices, financing with explicit documents, casting, production with a scene cut and picked up, the edit,
// distribution with a late broadcast slot, and saving and reloading along the way. Desktop and phone run in Chromium;
// iphone-15-pro-max runs in WebKit with the iPhone's viewport and user agent. All are browser emulation, not devices.
// The only fixture is the pinned world seed (helpers.ts pinSeed), chosen so a broadcaster makes an offer.
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, createCharacter, freshStart, nav, pinSeed, pressSaveAndExit, runToDelivery, section, secureStartingBacking, staffEveryDepartment, writePitch } from './helpers';

const SEED = 7;
const shot = (page: Page, project: string, name: string) => page.screenshot({ path: `test-results/connected-${project}-${name}.png`, fullPage: true });

/** Save & Exit, then Continue: the game must come back exactly as it was. */
async function saveAndReload(page: Page): Promise<void> {
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Hard Water' }).click();
}

test('a connected career, from creation to a broadcast deal, saved and reloaded on the way', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and one WebKit iPhone emulation.');
  test.setTimeout(1_500_000);
  const p = info.project.name;
  await freshStart(page);

  // Creation, with two edits from Review: a corrected name, and a different starting time.
  await createCharacter(page, {
    name: 'Nia Halvorsen', pronouns: 'She/Her', birthDate: '1990-05-20', birthplace: 'Nairobi', heritages: ['Kikuyu', 'Norwegian'], nationalities: ['Kenya', 'Norway'],
    mainLanguage: 'English', extraLanguages: ['Swahili'], start: 'London', startDate: '2026-01-05', startTime: '08:00',
  }, async (page) => {
    await page.getByRole('button', { name: 'Edit Identity' }).click();
    await page.getByRole('textbox', { name: 'Last Name', exact: true }).fill('Halvorsen-Mbeki');
    await page.getByRole('button', { name: 'Save And Return To Review' }).click();
    await expect(page.locator('#creation-h')).toHaveText('Nia Halvorsen-Mbeki');
    await page.getByRole('button', { name: 'Edit Starting Point' }).click();
    await page.getByLabel('Starting Time').fill('08:30');
    await page.getByRole('button', { name: 'Save And Return To Review' }).click();
    await expect(page.getByText('Ready To Begin')).toBeVisible();
    await shot(page, p, '01-review-after-edits');
  });
  await pinSeed(page, SEED);

  // A project, its characters named, a supporting antagonist among them.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Hard Water');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByLabel(/Target (Runtime In Minutes|Minutes Per Episode)/).fill('6');
  await page.getByRole('radio', { name: /^Micro Budget:/ }).check();
  await page.getByLabel('Intended Audience').selectOption({ label: 'Adult' });
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Hard Water', level: 1 })).toBeVisible();
  await section(page, 'Characters');
  for (const n of ['Ada', 'Ben']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  const ada = page.getByRole('article', { name: 'Ada' });
  await ada.getByRole('button', { name: 'Edit Character' }).click();
  await ada.getByLabel('Role Size').selectOption({ label: 'Lead' });
  // Written with an ethnicity and a nationality, as you are (November 8, 2026); casting says which you share.
  await ada.getByRole('searchbox', { name: 'Add Ethnicity For Ada' }).fill('Kikuyu');
  await ada.getByRole('group', { name: 'Character Ethnicity Results' }).getByRole('button', { name: 'Kikuyu', exact: true }).click();
  await ada.getByRole('searchbox', { name: 'Add Nationality For Ada' }).fill('Kenya');
  await ada.getByRole('group', { name: 'Character Nationality Results' }).getByRole('button', { name: 'Kenya', exact: true }).click();
  await expect(ada.getByRole('button', { name: 'Remove Nationality: Kenya' })).toBeVisible();
  await ada.getByRole('button', { name: 'Close' }).click();
  const ben = page.getByRole('article', { name: 'Ben' });
  await ben.getByRole('button', { name: 'Edit Character' }).click();
  await ben.getByRole('checkbox', { name: 'Antagonist' }).check();
  await expect(ben.getByText("Ben is entered in the supporting categories, from the part's size (Supporting).", { exact: false })).toBeVisible();
  await shot(page, p, '02-supporting-antagonist');
  await ben.getByRole('button', { name: 'Close' }).click();

  // The script: three scenes, the second essential, a clue planted in the first and paid off in the third; content declared.
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
  const content = page.locator('section.card', { has: page.getByRole('heading', { name: 'Content' }) });
  await content.getByLabel('Violence', { exact: true }).selectOption({ label: 'Strong' });
  await content.getByLabel('Language', { exact: true }).selectOption({ label: 'Moderate' });
  await expect(content).toContainText('Declared: Strong violence, moderate language.');
  await page.getByLabel('Logline', { exact: true }).fill('A pump-station keeper finds the log that sank a town.');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();

  // Financing: the grant names what's missing; once written, the documents are sent explicitly.
  await section(page, 'Budget');
  const raise = page.locator('section.card', { has: page.getByRole('heading', { name: 'Raise Money' }) });
  const grant = raise.locator('li', { hasText: 'Screen Arts Fund Grant' });
  await expect(grant).toContainText('Still to write in the Story panel: Premise, Central Conflict, Point Of View, Intended Ending, Theme and Stakes.');
  await expect(page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' })).toBeDisabled();
  await shot(page, p, '03-grant-needs-documents');
  await section(page, 'Script');
  await writePitch(page);
  await section(page, 'Budget');
  await page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' }).click();
  const backers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Backers' }) });
  await expect(backers.locator('li', { hasText: 'Screen Arts Fund Grant' })).toContainText('Sent with the approved script: Pitch, Treatment, Statement Of Intent.');
  await secureStartingBacking(page);

  // Casting, crew, the schedule.
  await section(page, 'Cast');
  await expect(page.getByText('Written as Kikuyu, Kenya. You share a background with this part.')).toBeVisible();
  await castRoles(page, []);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // Scene dependencies: cutting the essential scene says what it costs; restored, it gets a pickup day after the shoot.
  await section(page, 'Edit');
  const coverage = page.locator('section.card', { has: page.getByRole('heading', { name: 'Coverage' }) });
  await coverage.getByRole('button', { name: /^Cut Scene 2 .*From The Edit$/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Cut This Scene From The Edit?' });
  await expect(dialog).toContainText('is marked essential to the story');
  await shot(page, p, '04-cut-dialog');
  await dialog.getByRole('button', { name: 'Cut It' }).click();
  await coverage.getByRole('button', { name: /^Restore Scene 2/ }).click();
  await coverage.getByRole('checkbox', { name: /^Scene 2 .*Nothing has been shot for it yet\.$/ }).check();
  await coverage.getByRole('button', { name: 'Request Pickups' }).click();
  await expect(coverage).toContainText('Not shot yet: scheduled for');

  // Saved and reloaded mid-production: every choice is still there.
  await saveAndReload(page);
  await section(page, 'Characters');
  await page.getByRole('article', { name: 'Ben' }).getByRole('button', { name: 'Edit Character' }).click();
  await expect(page.getByRole('article', { name: 'Ben' }).getByText("Ben is entered in the supporting categories", { exact: false })).toBeVisible();
  await section(page, 'Script');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Content' }) })).toContainText('Declared: Strong violence, moderate language.');
  await section(page, 'Budget');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Backers' }) })).toContainText('Sent with the approved script: Pitch, Treatment, Statement Of Intent.');
  await section(page, 'Edit');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Coverage' }) })).toContainText('Not shot yet: scheduled for');

  // Production, the edit, delivery.
  await runToDelivery(page);
  await shot(page, p, '05-delivered');

  // Distribution: strong content, a late broadcast slot or a broadcast edit; the edit is taken.
  await section(page, 'Release');
  const offers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Distribution Offers' }) });
  for (let i = 0; i < 6 && !(await offers.getByRole('button', { name: 'Accept With A Broadcast Edit' }).count()); i++) {
    await advance(page, 'week');
    await section(page, 'Release');
  }
  const late = offers.locator('li', { has: page.getByRole('button', { name: 'Accept With A Broadcast Edit' }) }).first();
  await expect(late).toContainText('in a late-evening slot');
  await expect(late).toContainText("Ofcom's Broadcasting Code");
  await late.scrollIntoViewIfNeeded();
  await shot(page, p, '06-late-slot');
  await late.getByRole('button', { name: 'Accept With A Broadcast Edit' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  await expect(history).toContainText('Broadcast in GB');

  // Saved and reloaded at the end: the deal and the delivered project are kept.
  await saveAndReload(page);
  await section(page, 'Release');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) })).toContainText('Broadcast in GB');
  await section(page, 'Edit');
  await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();
  await shot(page, p, '07-after-reload');
});
