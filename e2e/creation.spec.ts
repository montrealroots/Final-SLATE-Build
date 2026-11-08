import { expect, test, type Page } from './test';
import { fillBirthDate, fillName, pickPlace } from './helpers';

// Character creation, laid out as 1221's (Identity, Background & Languages, Starting Point, Review), on desktop, phone
// and the WebKit iPhone projects (playwright.config.ts).

/** A finished draft as an earlier version stored it (numeric step 7 = the old Review), so reopening it is tested too. */
async function draftAtReview(page: Page, patch: Record<string, unknown> = {}): Promise<void> {
  await page.goto('/');
  await page.evaluate((p) => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Itzel Ramírez-Okafor', pronouns: 'they', actingTitle: 'Actor', birthDate: '1992-09-14', birthplaceId: 'mx-mexico-city',
      heritages: [{ id: 'Mexican', label: 'Mexican', custom: false }], heritageCustomText: '', mainLanguage: 'es',
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
  const cases: [string, string][] = [
    ['Edit Identity', 'Identity'],
    ['Edit Background And Languages', 'Background'],
    ['Edit Starting Point', 'Where You Live'],
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
  await expect(card(page, 'Starting Point')).toContainText('April 6, 2026 at 14:15');
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
  await page.goto('/');
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
  await fillBirthDate(page, '2015-01-01');
  await expect(page.getByText('Your character must be at least 16 on the starting date.')).toBeVisible();
});

test('typing straight after Next is kept, even when the field is chosen within a frame of the new step appearing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Ama Boateng', 'She/Her');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await page.getByRole('searchbox', { name: 'Search Backgrounds' }).fill('Ghanaian');
  await expect(page.getByRole('button', { name: 'Add A Background: Ghanaian' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'Add A Background: Akan' })).toBeVisible();
});

test('keyboard only: Next moves focus to the new heading, Tab reaches its field, and rapid Back and Next lose nothing', async ({ page }) => {
  await page.goto('/');
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
  await expect(page.getByRole('searchbox', { name: 'Search Backgrounds' })).toBeFocused();
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
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Leilani Kahale', 'They/Them');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await page.getByRole('textbox', { name: 'Describe Your Background' }).fill('Native Hawaiian, raised on O');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await expect(heading(page)).toHaveText('Background');
  await expect(page.getByRole('textbox', { name: 'Describe Your Background' })).toHaveValue('Native Hawaiian, raised on O');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.creationDraft')!).step)).toBe('background');
  await page.getByRole('button', { name: 'Back To Identity' }).click();
  await expect(page.getByLabel('Pronouns')).toHaveValue('they');
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
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await fillIdentity(page, 'Min-jun Park', 'He/Him');
  await page.getByRole('button', { name: 'Next: Background & Languages' }).click();
  await expect(page.getByText('Add your backgrounds above and the holidays they keep come first here.')).toBeVisible();
  await page.getByRole('searchbox', { name: 'Search Backgrounds' }).fill('Korean');
  await page.getByRole('button', { name: 'Add A Background: Korean' }).click();
  const suggested = page.getByRole('group', { name: 'From Your Backgrounds' });
  await expect(suggested.getByRole('checkbox')).toHaveCount(2); // Seollal and Chuseok
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
  await page.goto('/');
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
