import { expect, type Page } from '@playwright/test';

export async function freshStart(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

export interface CharacterOpts {
  name: string;
  pronouns: 'He/Him' | 'She/Her' | 'They/Them';
  birthDate: string;
  birthplace: string;
  heritages: string[];
  customHeritage?: string;
  mainLanguage: string;
  extraLanguages: string[];
  start: string;
  startDate: string;
  startTime: string;
}

export async function createCharacter(page: Page, o: CharacterOpts): Promise<void> {
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await page.getByRole('textbox', { name: 'Name' }).fill(o.name);
  await page.getByLabel('Pronouns').selectOption({ label: o.pronouns });
  await page.getByRole('button', { name: 'Next: Birth Date And Birthplace' }).click();
  await expect(page.getByRole('heading', { name: 'Birth Date And Birthplace' })).toBeVisible();
  await page.getByLabel('Birth Date').fill(o.birthDate);
  await page.getByRole('searchbox', { name: 'Birthplace' }).fill(o.birthplace);
  await page.getByRole('group', { name: 'Birthplace Results' }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Next: Ethnicity And Heritage' }).click();
  for (const h of o.heritages) {
    await page.getByRole('searchbox', { name: 'Search Backgrounds' }).fill(h);
    await page.getByRole('button', { name: `Add A Background: ${h}` }).click();
  }
  if (o.customHeritage) {
    await page.getByRole('textbox', { name: 'Describe Your Background' }).fill(o.customHeritage);
    await page.getByRole('button', { name: 'Add A Background', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Next: Languages' }).click();
  await page.getByRole('searchbox', { name: 'Main Language' }).fill(o.mainLanguage);
  await page.getByRole('group', { name: 'Main Language Results' }).getByRole('button', { name: o.mainLanguage, exact: true }).click();
  for (const l of o.extraLanguages) {
    await page.getByRole('searchbox', { name: 'Add Language' }).fill(l);
    await page.getByRole('button', { name: `Add Language: ${l}` }).click();
  }
  await page.getByRole('button', { name: 'Next: Starting Location And Date' }).click();
  await page.getByRole('searchbox', { name: 'Starting Location' }).fill(o.start);
  await page.getByRole('group', { name: 'Starting Location Results' }).getByRole('button').first().click();
  await page.getByLabel('Starting Date').fill(o.startDate);
  await page.getByLabel('Starting Time').fill(o.startTime);
  await page.getByRole('button', { name: 'Review Character' }).click();
  await expect(page.getByRole('heading', { name: 'Review Character' })).toBeVisible();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
}

export async function openMenuIfNeeded(page: Page): Promise<void> {
  await expect(page.getByRole('banner')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menu' });
  if (await menu.isVisible()) await menu.click();
}

export async function nav(page: Page, label: 'Home' | 'Calendar' | 'Projects' | 'Profile'): Promise<void> {
  await openMenuIfNeeded(page);
  await page.getByRole('navigation', { name: 'Main' }).filter({ visible: true }).getByRole('link', { name: label }).click();
}

export async function section(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('tab', { name: label, exact: true });
  if (await tab.isVisible()) await tab.click();
  else await page.getByRole('combobox', { name: 'Project Sections' }).selectOption({ label });
}

export async function advance(page: Page, value: 'next-event' | 'next-day' | 'week' | 'month'): Promise<void> {
  await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Advance' });
  await dialog.getByLabel('Advance To').selectOption(value);
  await dialog.getByRole('button', { name: 'Advance' }).click();
  await expect(page.locator('.save-state')).not.toHaveText(/Advancing/, { timeout: 60_000 });
  const dismiss = page.getByRole('button', { name: 'Dismiss' });
  if (await dismiss.isVisible()) await dismiss.click();
}

export async function staffEveryDepartment(page: Page): Promise<number> {
  await section(page, 'Crew');
  let sent = 0;
  const buttons = page.getByRole('button', { name: 'Staff This Department' });
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    await buttons.nth(i).click();
    const send = page.getByRole('dialog').getByRole('button', { name: 'Send Offers' });
    if (await send.isEnabled()) {
      await send.click();
      sent += 1;
    } else await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  }
  for (const b of await page.getByRole('button', { name: 'Accept Counteroffer' }).all()) await b.click();
  return sent;
}

/** The saved game as stored on disk; assertions run in the test, not in the page. */
export async function readSavedState(page: Page): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  return page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) => /^slate\.v1\.save\.[^.]+$/.test(k));
    if (!key) return null;
    return JSON.parse(JSON.parse(localStorage.getItem(key)!).data);
  });
}
