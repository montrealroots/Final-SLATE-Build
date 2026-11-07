import { expect, test, type Page } from './test';

// Character creation on desktop, phone and the WebKit iPhone projects (playwright.config.ts).

/** A finished draft as an earlier version stored it (numeric step 7 = Review), so reopening it is tested too. */
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
  await expect(page.getByRole('heading', { name: 'Review', level: 1 })).toBeVisible();
}

const heading = (page: Page) => page.locator('#creation-h');
const row = (page: Page, label: string) => page.locator('.review-row', { has: page.locator('dt', { hasText: new RegExp(`^${label}$`) }) });

test('each Review edit goes to the screen it names, and Save And Return To Review comes back with everything kept', async ({ page }) => {
  await draftAtReview(page);
  const cases: [string, string, string][] = [
    ['Name', 'Edit Name', 'Your Name'],
    ['Pronouns', 'Edit Pronouns And Acting Title', 'Pronouns'],
    ['Backgrounds', 'Edit Backgrounds', 'Background'],
    ['Languages', 'Edit Languages', 'Languages'],
    ['Born', 'Edit Birth Date And Birthplace', 'Birthday'],
    ['Starts On', 'Edit Starting Date And Time', 'Starting Date'],
    ['Starts In', 'Edit Starting Location', 'Starting Location'],
  ];
  const before = await page.locator('.review-list').innerText();
  for (const [label, edit, screen] of cases) {
    await row(page, label).getByRole('button', { name: edit }).click();
    await expect(heading(page)).toHaveText(screen);
    await expect(heading(page)).toBeFocused();
    await page.getByRole('button', { name: 'Save And Return To Review' }).click();
    await expect(heading(page)).toHaveText('Review');
  }
  expect(await page.locator('.review-list').innerText()).toBe(before);
  // The pronouns row and the birth row really are two separate screens.
  await row(page, 'Born').getByRole('button', { name: 'Edit Birth Date And Birthplace' }).click();
  await expect(page.getByLabel('Birth Date')).toHaveValue('1992-09-14');
  await expect(page.getByLabel('Pronouns')).toHaveCount(0);
});

test('editing from Review: a change is kept, an invalid change stops you on that screen with its message', async ({ page }) => {
  await draftAtReview(page);
  await row(page, 'Name').getByRole('button', { name: 'Edit Name' }).click();
  const name = page.getByRole('textbox', { name: 'Name' });
  await name.fill('');
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(heading(page)).toHaveText('Your Name');
  await expect(page.getByText('Enter a name.')).toBeVisible();
  await name.fill('Itzel Ramírez');
  await expect(page.getByText('Enter a name.')).toHaveCount(0); // clears once valid
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(row(page, 'Name')).toContainText('Itzel Ramírez');
  // Going forward with Next instead also keeps the change; Review is reached through the remaining screens.
  await row(page, 'Starts On').getByRole('button', { name: 'Edit Starting Date And Time' }).click();
  await page.getByLabel('Starting Time').fill('14:15');
  await page.getByRole('button', { name: 'Next: Starting Location' }).click();
  await page.getByRole('button', { name: 'Next: Review' }).click();
  await expect(row(page, 'Starts On')).toContainText('2026-04-06 at 14:15');
});

test('Start My Story with something missing goes to that screen, and back to Review once it is fixed', async ({ page }) => {
  await draftAtReview(page, { birthplaceId: '' });
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(heading(page)).toHaveText('Birthday');
  await expect(page.getByText('Choose a birthplace.')).toBeVisible();
  await expect(page.getByLabel('Birth Date')).toHaveValue('1992-09-14'); // nothing else was lost
  await page.getByRole('searchbox', { name: 'Birthplace' }).fill('mexico city');
  await page.getByRole('group', { name: 'Birthplace Results' }).getByRole('button', { name: /Mexico City/ }).first().click();
  await page.getByRole('button', { name: 'Save And Return To Review' }).click();
  await expect(row(page, 'Born')).toContainText('Mexico City');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
});

test('typing straight after Next is kept, even when the field is chosen within a frame of the new screen appearing', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  // Immediate typing with ordinary controls, no waiting, on every screen with a text field.
  await page.getByRole('textbox', { name: 'Name' }).fill('Ama Boateng');
  await page.getByRole('button', { name: 'Next: Pronouns' }).click();
  await page.getByLabel('Pronouns').selectOption({ label: 'She/Her' });
  await page.getByRole('button', { name: 'Next: Background' }).click();
  await page.getByRole('searchbox', { name: 'Search Backgrounds' }).fill('Ghanaian');
  await expect(page.getByRole('button', { name: 'Add A Background: Ghanaian' })).toBeVisible();
  // The exact timing that lost text before (WebKit): the field is focused, one animation frame passes, then the
  // text arrives. Focus used to move to the heading in that frame, and the text went nowhere.
  await page.getByRole('button', { name: 'Back To Pronouns' }).click();
  const kept = await page.evaluate(async () => {
    [...document.querySelectorAll('button')].find((b) => b.textContent === 'Next: Background')!.click();
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
  await page.getByRole('textbox', { name: 'Name' }).focus();
  await page.keyboard.type('Kofi Mensah');
  await page.getByRole('button', { name: 'Next: Pronouns' }).focus();
  await page.keyboard.press('Enter');
  await expect(heading(page)).toHaveText('Pronouns');
  await expect(heading(page)).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Pronouns')).toBeFocused();
  await page.getByLabel('Pronouns').selectOption({ label: 'He/Him' });
  // Rapid navigation: several Back and Next presses in a row.
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: 'Back To Your Name' }).click();
    await page.getByRole('button', { name: 'Next: Pronouns' }).click();
  }
  await expect(page.getByLabel('Pronouns')).toHaveValue('he');
  await expect(page.getByLabel('Acting Title')).toHaveValue('Actor');
  await page.getByRole('button', { name: 'Back To Your Name' }).click();
  await expect(page.getByRole('textbox', { name: 'Name' })).toHaveValue('Kofi Mensah');
});

test('a reload in the middle of creation reopens the same screen with everything entered', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Leilani Kahale');
  await page.getByRole('button', { name: 'Next: Pronouns' }).click();
  await page.getByLabel('Pronouns').selectOption({ label: 'They/Them' });
  await page.getByRole('button', { name: 'Next: Background' }).click();
  await page.getByRole('textbox', { name: 'Describe Your Background' }).fill('Native Hawaiian, raised on O');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await expect(heading(page)).toHaveText('Background');
  await expect(page.getByRole('textbox', { name: 'Describe Your Background' })).toHaveValue('Native Hawaiian, raised on O');
  await page.getByRole('button', { name: 'Back To Pronouns' }).click();
  await expect(page.getByLabel('Pronouns')).toHaveValue('they');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.creationDraft')!).step);
  expect(stored).toBe('pronouns'); // drafts now name their screen
});
