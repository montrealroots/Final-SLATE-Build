import { expect, test, type Page } from './test';
import { fillBirthDate, fillName, openStart, pickPlace, quickDraft } from './helpers';
import { listRecords } from './vault';

// Character creation, laid out as 1221's (Identity, Background & Languages, Starting Point, Review), on desktop, phone
// and the WebKit iPhone projects (playwright.config.ts).

/** A finished draft as an earlier version stored it (numeric step 7 = the old Review), so reopening it is tested too. */
async function draftAtReview(page: Page, patch: Record<string, unknown> = {}): Promise<void> {
  await openStart(page);
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Itzel Ramírez-Okafor', pronouns: 'they', actingTitle: 'Actor', birthDate: '2006-09-14', birthplaceId: 'mx-mexico-city',
      heritages: [{ id: 'Mestizo', label: 'Mestizo', custom: false }, { id: 'Mexican', label: 'Mexican', custom: false }], heritageCustomText: '', mainLanguage: 'es',
      languages: [{ code: 'en', proficiency: 'Fluent' }], startPlaceId: 'gb-london', startDate: '2026-04-06', startTime: '09:30', updatedAt: 1, ...p,
    }));
  }, patch);
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await expect(page.getByText('Ready To Begin')).toBeVisible();
}

const heading = (page: Page) => page.locator('#creation-h');
const card = (page: Page, title: string) => page.locator('section.card', { has: page.getByRole('heading', { name: title, exact: true }) });
const NAME = 'Itzel Ramírez-Okafor';

/** Identity filled in through its controls, ready for Next. */
async function fillIdentity(page: Page, name: string, pronouns: string): Promise<void> {
  await fillName(page, name);
  await page.getByLabel('Pronouns').selectOption({ label: pronouns });
  if (pronouns === 'They/Them') await page.getByRole('group', { name: 'Billed As' }).getByRole('button', { name: 'Actor', exact: true }).click();
  await fillBirthDate(page, '1994-05-20');
  await pickPlace(page, 'Place Of Birth', 'Lagos');
}

test('each Review edit goes to the step it names, and Save And Return To Review comes back with everything kept', async ({ page }) => {
  await draftAtReview(page);
  await expect(heading(page)).toHaveText(NAME);
  // The cards follow the steps' order, and the start reads as Starting Point says it (November 8, 2026). Money, asked on
  // Starting Point, has its own card from November 12, 2026.
  await expect(page.locator('section.card h2.eyebrow')).toHaveText(['Identity', 'Background & Languages', 'Starting Point', 'Money']);
  await expect(card(page, 'Starting Point')).toContainText('Monday, April 6, 2026, at 9:30 AM GMT+1');
  const cases: [string, string][] = [
    ['Edit Identity', 'Identity'],
    ['Edit Background & Languages', 'Background'],
    ['Edit Starting Point', 'Where You Live'],
    ['Edit Money And Family', 'Where You Live'],
  ];
  const before = await page.locator('.creation').innerText();
  for (const [edit, screen] of cases) {
    await page.getByRole('button', { name: edit }).click();
    await expect(heading(page)).toHaveText(screen);
    await expect(heading(page)).toBeFocused();
    await page.getByRole('button', { name: 'Save And Return To Review' }).click();
    await expect(heading(page)).toHaveText(NAME);
  }
  expect(await page.locator('.creation').innerText()).toBe(before);
  // Identity holds the date of birth in its three fields, and nothing from Starting Point.
  await page.getByRole('button', { name: 'Edit Identity' }).click();
  await expect(page.getByLabel('Year Of Birth')).toHaveValue('1992');
  await expect(page.getByLabel('Month', { exact: true })).toHaveValue('09');
  await expect(page.getByLabel('Day', { exact: true })).toHaveValue('14');
  await expect(page.getByRole('group', { name: 'Billed As' }).getByRole('button', { name: 'Actor', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Starting Date')).toHaveCount(0);
});

test('editing from Review: a change is kept, an invalid change stops you on that step with its message', async ({ page }) => {
  await draftAtReview(page);
  await page.getByRole('button', { name: 'Edit Identity' }).click();
  const last = page.getByRole('textbox', { name: 'Last Name', exact: true });
  await last.fill('');
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(heading(page)).toHaveText('Identity');
  await expect(page.getByText('Enter a last name.')).toBeVisible();
  await last.fill('Ramírez');
  await expect(page.getByText('Enter a last name.')).toHaveCount(0); // clears once valid
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(card(page, 'Identity')).toContainText('Itzel Ramírez');
  // Going forward with Next instead also keeps the change.
  await page.getByRole('button', { name: 'Edit Starting Point' }).click();
  await page.getByLabel('Starting Time').fill('14:15');
  await page.getByRole('button', { name: 'Next: Review' }).click();
  await expect(card(page, 'Starting Point')).toContainText('Monday, April 6, 2026, at 2:15 PM');
});

test('Start My Story with something missing goes to that step, and back to Review once it is fixed', async ({ page }) => {
  await draftAtReview(page, { birthplaceId: '' });
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(heading(page)).toHaveText('Identity');
  await expect(page.getByText('Choose a birthplace.')).toBeVisible();
  await expect(page.getByLabel('Year Of Birth')).toHaveValue('1992'); // nothing else was lost
  await page.getByRole('searchbox', { name: 'Place Of Birth' }).fill('mexico city');
  await page.getByRole('group', { name: 'Place Of Birth Results' }).getByRole('button', { name: /Mexico City/ }).first().click();
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(card(page, 'Identity')).toContainText('Mexico City');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
});

test('a step with something missing says what; He/Him and She/Her settle the billing, They/Them chooses', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await expect(heading(page)).toHaveText('Identity');
  for (const m of ['Enter a first name.', 'Enter a last name.', 'Choose pronouns.', 'Choose how you are billed.', 'Enter your birth date.', 'Choose a birthplace.']) await expect(page.getByText(m)).toBeVisible();
  const billedAs = page.locator('.field', { has: page.locator('#billed-as') });
  // She/Her: Actress, nothing to pick.
  await page.getByLabel('Pronouns').selectOption({ label: 'She/Her' });
  await expect(billedAs.locator('output')).toHaveText('Actress');
  await expect(billedAs.getByRole('button')).toHaveCount(0);
  await expect(page.getByText('Choose how you are billed.')).toHaveCount(0);
  // He/Him: Actor.
  await page.getByLabel('Pronouns').selectOption({ label: 'He/Him' });
  await expect(billedAs.locator('output')).toHaveText('Actor');
  // They/Them: no title until one is picked, and the pick is kept.
  await page.getByLabel('Pronouns').selectOption({ label: 'They/Them' });
  const tiles = page.getByRole('group', { name: 'Billed As' });
  await expect(tiles.getByRole('button', { name: 'Actor', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(tiles.getByRole('button', { name: 'Actress', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Choose how you are billed.')).toBeVisible();
  await tiles.getByRole('button', { name: 'Actress', exact: true }).click();
  await expect(tiles.getByRole('button', { name: 'Actress', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Choose how you are billed.')).toHaveCount(0);
  // Back to He/Him and then They/Them: the pick made under They/Them doesn't survive behind He/Him.
  await page.getByLabel('Pronouns').selectOption({ label: 'He/Him' });
  await expect(billedAs.locator('output')).toHaveText('Actor');
  await page.getByLabel('Pronouns').selectOption({ label: 'They/Them' });
  await expect(tiles.getByRole('button', { name: 'Actress', exact: true })).toHaveAttribute('aria-pressed', 'false');
  // At least 19 on the starting date (January 5, 2026 by default): the screen says the latest birth date that allows.
  await fillBirthDate(page, '1990-01-01');
  await expect(page.getByText('You must be at least 19 on your starting date, January 5, 2026: born on or before January 5, 2007.', { exact: false })).toBeVisible();
  await fillBirthDate(page, '2007-06-01');
  await expect(page.getByText('Your character must be at least 19 on the starting date.')).toBeVisible();
});

test('typing straight after Next is kept, even when the field is chosen within a frame of the new step appearing', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Ama Boateng', 'She/Her');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await page.getByRole('searchbox', { name: 'Search Ethnicities' }).fill('Yoruba');
  await expect(page.getByRole('button', { name: 'Add Ethnicity: Yoruba' })).toBeVisible();
  // The exact timing that lost text before (WebKit): the field is focused, one animation frame passes, then the
  // text arrives. Focus used to move to the heading in that frame, and the text went nowhere.
  await page.getByRole('button', { name: 'Back To Identity' }).click();
  const kept = await page.evaluate(async () => {
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Next: Background & Languages')!.click();
    await Promise.resolve();
    const input = document.querySelector('input[type=search]') as HTMLInputElement;
    input.focus();
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    document.execCommand('insertText', false, 'Akan');
    await new Promise((r) => setTimeout(r, 50));
    return { value: input.value, focused: document.activeElement === input };
  });
  expect(kept).toEqual({ value: 'Akan', focused: true });
  await expect(page.getByRole('button', { name: 'Add Ethnicity: Akan' })).toBeVisible();
});

test('keyboard only: Next moves focus to the new heading, Tab reaches its field, and rapid Back and Next lose nothing', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await page.getByRole('textbox', { name: 'First Name', exact: true }).focus();
  await page.keyboard.type('Kofi');
  await page.getByRole('textbox', { name: 'Last Name', exact: true }).fill('Mensah');
  await page.getByLabel('Pronouns').selectOption({ label: 'He/Him' });
  await fillBirthDate(page, '1990-11-03');
  await pickPlace(page, 'Place Of Birth', 'Lagos');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).focus();
  await page.keyboard.press('Enter');
  await expect(heading(page)).toHaveText('Background');
  await expect(heading(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('searchbox', { name: 'Search Ethnicities' })).toBeFocused();
  // Rapid navigation: several Back and Next presses in a row.
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Back To Identity' }).click();
    await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  }
  await page.getByRole('button', { name: 'Back To Identity' }).click();
  await expect(page.getByRole('textbox', { name: 'First Name', exact: true })).toHaveValue('Kofi');
  await expect(page.getByRole('textbox', { name: 'Last Name', exact: true })).toHaveValue('Mensah');
  await expect(page.getByLabel('Pronouns')).toHaveValue('he');
  await expect(page.locator('.field', { has: page.locator('#billed-as') }).locator('output')).toHaveText('Actor'); // settled by He/Him
  await expect(page.getByLabel('Year Of Birth')).toHaveValue('1990');
});

test('a reload in the middle of creation reopens the same step with everything entered', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Leilani Kahale', 'They/Them');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await page.getByRole('textbox', { name: 'Describe Your Ethnicity' }).fill('Native Hawaiian, raised on O');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await expect(heading(page)).toHaveText('Background');
  await expect(page.getByRole('textbox', { name: 'Describe Your Ethnicity' })).toHaveValue('Native Hawaiian, raised on O');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.creationDraft')!).step)).toBe('background');
  await page.getByRole('button', { name: 'Back To Identity' }).click();
  await expect(page.getByLabel('Pronouns')).toHaveValue('they');
});

test('ethnicity and nationality are both asked, A to Z: Next says which is missing, and your citizenship is marked', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Chidi Okeke', 'He/Him'); // born in Lagos
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  // A word that's only a nationality isn't an ethnicity.
  await page.getByRole('searchbox', { name: 'Search Ethnicities' }).fill('Nigerian');
  await expect(page.getByText('Nothing matches. You can describe your ethnicity below.')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search Ethnicities' }).fill('Igbo');
  await page.getByRole('button', { name: 'Add Ethnicity: Igbo' }).click();
  await page.getByRole('searchbox', { name: 'Which language do you use most?' }).fill('English');
  await page.getByRole('group', { name: 'Language You Use Most Results' }).getByRole('button', { name: 'English', exact: true }).click();
  await page.getByRole('button', { name: 'Next: Starting Point' }).click();
  await expect(page.getByText('Add at least one nationality.')).toBeVisible();
  await expect(heading(page)).toHaveText('Background');
  // A to Z (the owner asked): Afghanistan first, and your citizenship marked where it falls.
  await expect(page.getByRole('group', { name: 'Nationality Results' }).getByRole('button').first()).toHaveAccessibleName('Add Nationality: Afghanistan');
  await page.getByRole('searchbox', { name: 'Search Nationalities' }).fill('Nigeria');
  const mine = page.getByRole('button', { name: 'Add Nationality: Nigeria', exact: true });
  await expect(mine).toContainText('Your citizenship');
  await mine.click();
  // Nigeria suggests its languages, Hausa among them.
  await expect(page.getByRole('button', { name: 'Add Language: Hausa' })).toContainText('From your backgrounds');
  await expect(page.getByText('Add at least one nationality.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove Igbo' }).click();
  await page.getByRole('button', { name: 'Next: Starting Point' }).click();
  await expect(page.getByText('Add at least one ethnicity, or describe your own.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Describe Your Ethnicity' }).fill('Igbo and Scottish');
  await page.getByRole('button', { name: 'Add Your Ethnicity' }).click();
  await page.getByRole('button', { name: 'Next: Starting Point' }).click();
  await pickPlace(page, 'Where You Live', 'Toronto');
  await page.getByRole('button', { name: 'Next: Review' }).click();
  await expect(card(page, 'Background & Languages')).toContainText('Igbo and Scottish');
  await expect(card(page, 'Background & Languages')).toContainText('Nigeria');
});

test('a Jewish background keeps every day of no work, in the order they fall, and Home says so on the second day', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Tsega Mekonnen', 'She/Her');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await page.getByRole('searchbox', { name: 'Search Ethnicities' }).fill('Beta Israel');
  await page.getByRole('button', { name: 'Add Ethnicity: Beta Israel' }).click();
  // Adding a background empties its search (November 8, 2026: the chosen name stayed, over "Nothing matches").
  await expect(page.getByRole('searchbox', { name: 'Search Ethnicities' })).toHaveValue('');
  const suggested = page.getByRole('group', { name: 'From Your Backgrounds' });
  const order = ['Pesach (Passover)', 'Shavuot', 'Rosh Hashanah', 'Yom Kippur', 'Sukkot'];
  await expect(suggested.getByRole('checkbox')).toHaveCount(order.length);
  for (const [i, name] of order.entries()) await expect(suggested.getByRole('checkbox').nth(i)).toHaveAccessibleName(name);
  await expect(suggested.getByText('In 2026: April 2 and 3, April 8 and 9.')).toBeVisible();
  await expect(suggested.getByText('In 2026: September 12 and 13.')).toBeVisible();
  await suggested.getByRole('checkbox', { name: 'Rosh Hashanah' }).check();
  await page.getByRole('searchbox', { name: 'Search Nationalities' }).fill('Israel');
  await page.getByRole('button', { name: 'Add Nationality: Israel', exact: true }).click();
  await expect(suggested.getByRole('checkbox')).toHaveCount(order.length); // Israel suggests the same five
  await page.getByRole('searchbox', { name: 'Which language do you use most?' }).fill('Hebrew');
  await page.getByRole('group', { name: 'Language You Use Most Results' }).getByRole('button', { name: /^Hebrew/ }).click(); // marked as from your backgrounds
  await page.getByRole('button', { name: 'Next: Starting Point' }).click();
  await pickPlace(page, 'Where You Live', 'Toronto');
  await page.getByLabel('Starting Date').fill('2026-09-13');
  await page.getByRole('button', { name: 'Next: Review' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByText('Today is Rosh Hashanah, which you keep.')).toBeVisible();
});

test('Starting Point: featured cities A to Z, a choice settles the list, and the start is said in words', async ({ page }) => {
  await draftAtReview(page);
  await page.getByRole('button', { name: 'Edit Starting Point' }).click();
  // The field under the Where You Live heading is the town or city (the words were said twice until November 8, 2026).
  await expect(page.getByRole('searchbox', { name: 'Where You Live, Town Or City' })).toBeVisible();
  await page.getByRole('combobox', { name: 'Where You Live, Country Or Territory' }).selectOption({ label: 'Featured Cities' });
  const names = await page.getByRole('group', { name: 'Where You Live Results' }).getByRole('button').locator('span:first-child').allInnerTexts();
  expect(names.length).toBeGreaterThan(20);
  expect(names).toEqual([...names].sort((a, b) => a.normalize('NFD').replace(/[\u0300-\u036f]/g, '').localeCompare(b.normalize('NFD').replace(/[\u0300-\u036f]/g, ''), 'en')));
  await page.getByRole('searchbox', { name: 'Where You Live, Town Or City' }).fill('Toronto');
  await page.getByRole('group', { name: 'Where You Live Results' }).getByRole('button').first().click();
  await expect(page.getByRole('searchbox', { name: 'Where You Live, Town Or City' })).toHaveValue('');
  await expect(page.getByText("Type to search Canada's places, or choose another country.")).toBeVisible();
  await page.getByLabel('Starting Date').fill('2027-03-15');
  await page.getByLabel('Starting Time').fill('19:45');
  await expect(page.getByText('Your story starts on Monday, March 15, 2027, at 7:45 PM EDT in Toronto.')).toBeVisible();
  // The chosen place is marked on the map, and the date and time boxes sit level (their notes are one line each).
  await expect(page.getByRole('img', { name: 'Toronto, your choice' })).toBeVisible();
  const [date, time] = [await page.getByLabel('Starting Date').boundingBox(), await page.getByLabel('Starting Time').boundingBox()];
  if (date!.x !== time!.x) expect(Math.abs(date!.y - time!.y)).toBeLessThan(2); // side by side; a phone stacks them
  await expect(page.getByText('Any date in 2026.')).toHaveCount(0);
});

test('Starting Point: where you were born, or somewhere else', async ({ page }) => {
  await draftAtReview(page);
  await page.getByRole('button', { name: 'Edit Starting Point' }).click();
  const born = page.getByLabel('I Still Live Where I Was Born');
  await expect(born).not.toBeChecked(); // the draft starts in London, not Mexico City
  await born.check();
  await expect(page.getByRole('searchbox', { name: 'Where You Live' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(card(page, 'Starting Point')).toContainText('Mexico City');
});

test('backgrounds drive the game: their holidays are offered first and kept, their languages suggested first', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Min-jun Park', 'He/Him');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await expect(page.getByText('Add your ethnicity and nationality above and the holidays they keep come first here.')).toBeVisible();
  // A nationality alone brings its holidays (November 8, 2026: ethnicity and nationality are asked apart).
  await page.getByRole('searchbox', { name: 'Search Nationalities' }).fill('South Korea');
  await page.getByRole('button', { name: 'Add Nationality: South Korea', exact: true }).click();
  const suggested = page.getByRole('group', { name: 'From Your Backgrounds' });
  await expect(suggested.getByRole('checkbox')).toHaveCount(2); // Seollal and Chuseok
  await page.getByRole('searchbox', { name: 'Search Ethnicities' }).fill('Korean');
  await page.getByRole('button', { name: 'Add Ethnicity: Korean' }).click();
  await expect(suggested.getByRole('checkbox')).toHaveCount(2);
  await suggested.getByRole('checkbox', { name: 'Seollal' }).check();
  await expect(suggested.getByText('In 2026: February 17.')).toBeVisible();
  // Every other holiday stays open to anyone.
  await page.getByText('Other Holidays').click();
  await page.getByRole('checkbox', { name: 'Diwali' }).check();
  // Korean comes first among the languages, marked as from your backgrounds.
  const main = page.getByRole('group', { name: 'Language You Use Most Results' }).getByRole('button').first();
  await expect(main).toContainText('Korean');
  await expect(main).toContainText('From your backgrounds');
  await main.click();
  // Choosing empties its search too, as every picker here does (November 8, 2026): the list returns, Korean shown chosen.
  await expect(page.getByRole('searchbox', { name: 'Which language do you use most?' })).toHaveValue('');
  await expect(page.getByRole('group', { name: 'Language You Use Most Results' }).getByRole('button', { name: /^Korean/ })).toHaveAttribute('aria-pressed', 'true');
  // Adding a language empties its search, so the next suggestions show (November 8, 2026: the typed word stayed).
  await page.getByRole('searchbox', { name: 'Add Language' }).fill('English');
  await page.getByRole('button', { name: 'Add Language: English' }).click();
  await expect(page.getByRole('searchbox', { name: 'Add Language' })).toHaveValue('');
  await page.getByRole('button', { name: 'Next: Starting Point' }).click();
  await pickPlace(page, 'Where You Live', 'Seoul');
  await page.getByRole('button', { name: 'Next: Review' }).click();
  await expect(card(page, 'Background & Languages')).toContainText('Seollal, Diwali');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.creationDraft') ?? 'null'));
  expect(saved).toBeNull(); // the draft became the game
});

// Found in the screen-by-screen review on November 8, 2026: after Nairobi was chosen, the country list still said
// Featured Cities and the map still showed the whole world.
test('the country list and the map follow the place chosen; another country is still a search away', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  const country = page.getByLabel('Country Or Territory');
  await expect(country.locator('option:checked')).toHaveText('Featured Cities');
  await pickPlace(page, 'Place Of Birth', 'Nairobi');
  await expect(country.locator('option:checked')).toHaveText('Kenya');
  await expect(page.getByRole('group', { name: 'Map of Kenya. Each listed place is a marker you can choose.' })).toBeVisible();
  // Under the heading, the field is Town Or City, as 1221's; its name for screen readers keeps the purpose.
  await expect(page.getByRole('searchbox', { name: 'Place Of Birth' })).toBeVisible();
  await expect(page.getByText('Town Or City', { exact: true })).toBeVisible();
  await expect(page.getByText('Place Of Birth', { exact: true })).toHaveCount(1); // the heading, once
  // Changing your mind: nothing in Kenya is called Toronto; the featured cities in other countries that are come up.
  await page.getByRole('searchbox', { name: 'Place Of Birth' }).fill('Toronto');
  const results = page.getByRole('group', { name: 'Place Of Birth Results' });
  await expect(results).toContainText("Nothing in Kenya matches 'Toronto'.");
  await expect(results).toContainText('Featured cities in other countries:');
  await results.getByRole('button', { name: /Toronto/ }).first().click();
  await expect(page.getByText('Chosen: Toronto', { exact: false })).toBeVisible();
  await expect(country.locator('option:checked')).toHaveText('Canada');
});

// SLATE-01-05.04: Start My Story pressed twice in a row makes one life, not two.
test('pressing Start My Story twice starts one life', async ({ page }) => {
  await draftAtReview(page);
  await page.getByRole('button', { name: 'Start My Story' }).dblclick();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await expect.poll(async () => (await listRecords(page)).filter((k) => /^slate\.v1\.save\.[^.]+$/.test(k)).length).toBe(1);
});

// The second press of a double press, landing after Home is up, must not press whatever Home has at that spot. On an
// iPhone-sized screen that spot is Up Next's Open Calendar (found in CI on November 12, 2026, when a card's heading
// and its button came to share a line there: the journey above ended on the Calendar).
test('a second press that lands after the game opens presses nothing on Home', async ({ page }) => {
  await draftAtReview(page);
  const start = page.getByRole('button', { name: 'Start My Story' });
  await start.scrollIntoViewIfNeeded();
  const box = (await start.boundingBox())!;
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.click(x, y);
  await page.locator('main[data-view="home"]').waitFor();
  await page.mouse.click(x, y);
  await page.waitForTimeout(700);
  await expect(page.locator('main')).toHaveAttribute('data-view', 'home');
  // And Home answers a press once it has settled.
  await page.getByRole('button', { name: 'Open Calendar' }).click();
  await expect(page.locator('main')).toHaveAttribute('data-view', 'calendar');
});

// SLATE-01-02.03: your own words are refused when blank or already there, and nothing else is lost.
test('an ethnicity in your own words: blank or repeated is refused with the reason', async ({ page }) => {
  await openStart(page);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Ana Folau', 'She/Her');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await page.getByRole('button', { name: 'Add Your Ethnicity' }).click();
  await expect(page.getByText('Write a description first.')).toBeVisible();
  await page.getByRole('textbox', { name: 'Describe Your Ethnicity' }).fill('Tongan and Welsh');
  await page.getByRole('button', { name: 'Add Your Ethnicity' }).click();
  await page.getByRole('textbox', { name: 'Describe Your Ethnicity' }).fill('tongan and welsh');
  await page.getByRole('button', { name: 'Add Your Ethnicity' }).click();
  await expect(page.getByText("You've already added that.")).toBeVisible();
  await expect(page.getByRole('list').filter({ hasText: 'Tongan and Welsh' }).getByRole('listitem')).toHaveCount(1);
});

// Continue Creation must be where it was first drawn. Until November 12, 2026 its card was drawn before saved games had
// been read, and when they had, the start screen's row of buttons appeared above it and pushed it down: a press aimed at
// it could land on New Game instead, and creation never opened. (Seen three times in a WebKit sweep on a busy machine
// and once more in a local run, each recorded as the engine neither loading nor failing.) Saved games are made slow
// here so the order is the same every run.
test('Continue Creation does not move once saved games have been read', async ({ page }) => {
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-01-05');
  await page.addInitScript(() => {
    const open = indexedDB.open.bind(indexedDB);
    // The request is handed back at once and its success held for a second.
    indexedDB.open = ((...args: Parameters<IDBFactory['open']>) => {
      const req = open(...args);
      const add = req.addEventListener.bind(req);
      const hold = (fn: (e: Event) => void) => (e: Event) => setTimeout(() => fn(e), 1000);
      req.addEventListener = ((type: string, fn: (e: Event) => void, o?: boolean) => add(type, type === 'success' ? hold(fn) : fn, o)) as typeof req.addEventListener;
      let handler: ((e: Event) => void) | null = null;
      Object.defineProperty(req, 'onsuccess', { get: () => handler, set: (fn: ((e: Event) => void) | null) => { handler = fn; if (fn) add('success', hold(fn)); } });
      return req;
    }) as IDBFactory['open'];
  });
  await page.reload();
  const button = page.getByRole('button', { name: 'Continue Creation' });
  await button.waitFor();
  const first = (await button.boundingBox())!;
  // Whenever it is first there, the start screen's own buttons are there with it.
  await expect(page.getByRole('group', { name: 'Start' })).toBeVisible();
  await expect(page.getByText('Looking for your saved games…')).toHaveCount(0);
  await page.waitForTimeout(1500);
  const later = (await button.boundingBox())!;
  expect({ x: Math.round(later.x), y: Math.round(later.y) }).toEqual({ x: Math.round(first.x), y: Math.round(first.y) });
  await button.click();
  await expect(page.getByRole('button', { name: 'Start My Story' })).toBeVisible();
});
