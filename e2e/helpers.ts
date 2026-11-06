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

export async function quickLife(page: Page, startPlaceId: string, startDate: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ pl, sd }) => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 5, name: 'Nia Halvorsen-Mbeki', pronouns: 'she', actingTitle: 'Actress', birthDate: '1990-05-20', birthplaceId: 'ke-nairobi',
      heritages: [{ id: 'Kikuyu', label: 'Kikuyu', custom: false }, { id: 'Norwegian', label: 'Norwegian', custom: false }], heritageCustomText: '', mainLanguage: 'en',
      languages: [{ code: 'sw', proficiency: 'Fluent' }, { code: 'no', proficiency: 'Conversational' }], startPlaceId: pl, startDate: sd, startTime: '08:00', updatedAt: 1,
    }));
  }, { pl: startPlaceId, sd: startDate });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
}

export async function addScene(page: Page, opts: { index: number; place: string; chars?: string[]; contributors?: string[]; minutes?: string; exterior?: boolean; episodeButton?: string; kind?: string; technique?: string }): Promise<void> {
  await page.getByRole('button', { name: opts.episodeButton ?? 'Add Scene' }).first().click();
  const c = page.locator('article.scene-card').nth(opts.index);
  await c.getByRole('button', { name: 'Edit Scene' }).click();
  if (opts.exterior) await c.getByLabel('Interior Or Exterior').selectOption({ label: 'Exterior' });
  await c.getByLabel('Place', { exact: true }).fill(opts.place);
  if (opts.kind) await c.getByLabel('Kind', { exact: true }).selectOption({ label: opts.kind });
  if (opts.technique) await c.getByLabel('Technique For This Scene').selectOption({ label: opts.technique });
  for (const w of opts.chars ?? []) await c.getByRole('checkbox', { name: w, exact: true }).check();
  for (const w of opts.contributors ?? []) await c.getByRole('checkbox', { name: w, exact: true }).check();
  if (opts.minutes) await c.getByLabel('Estimated Minutes').fill(opts.minutes);
  await c.getByLabel('Objective').fill('Move the story forward.');
  await c.getByRole('button', { name: 'Close Scene' }).click();
}

export async function saveAndApprove(page: Page): Promise<void> {
  await section(page, 'Script');
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
}

/** Cast every uncast role through Find Performers (or yourself for named roles). */
export async function castRoles(page: Page, yourself: string[] = []): Promise<void> {
  await section(page, 'Cast');
  const roles = page.locator('section.panel', { hasText: 'Roles' }).first();
  for (const name of yourself) {
    const btn = roles.locator('li', { hasText: name }).getByRole('button', { name: 'Cast Yourself' }).first();
    if (await btn.isVisible()) await btn.click();
  }
  // Re-query after every offer: the list re-renders once a role has an offer out.
  const tried = new Set<string>();
  for (let guard = 0; guard < 12; guard++) {
    const items = roles.locator('li').filter({ has: page.getByRole('button', { name: 'Find Performers' }) });
    let target = null;
    for (const li of await items.all()) {
      const key = (await li.locator('strong').first().innerText()).trim();
      if (!tried.has(key)) { target = li; tried.add(key); break; }
    }
    if (!target) break;
    await target.getByRole('button', { name: 'Find Performers' }).first().click();
    const dialog = page.getByRole('dialog');
    const offers = dialog.getByRole('button', { name: 'Make Offer' });
    const n = await offers.count();
    // An offer can be refused (for example, one performer can't play two characters in a scene): try the next person.
    for (let i = 0; i < n && (await dialog.isVisible()); i++) await offers.nth(i).click();
    if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Close' }).click();
  }
  for (const b of await page.getByRole('button', { name: 'Accept Counteroffer' }).all()) await b.click();
}

/** Play a project from an approved draft to delivery through the interface. */
export async function produceToDelivery(page: Page, opts: { yourself?: string[]; weeks?: number; step?: 'week' | 'month' } = {}): Promise<void> {
  await castRoles(page, opts.yourself ?? []);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  for (let i = 0; i < (opts.weeks ?? 60); i++) {
    await advance(page, opts.step ?? 'week');
    await staffEveryDepartment(page);
    await castRoles(page);
    // Documentary facts can be checked once research is done.
    await section(page, 'Script');
    for (let k = 0; k < 10; k++) {
      const b = page.getByRole('button', { name: 'Mark As Checked' }).first();
      if (!(await b.isVisible()) || !(await b.isEnabled())) break;
      await b.click();
    }
    await section(page, 'Edit');
    const deliver = page.getByRole('button', { name: 'Deliver Project' });
    if (await deliver.isVisible() && await deliver.isEnabled()) {
      await deliver.click();
      await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();
      return;
    }
    const lock = page.getByRole('button', { name: 'Lock Picture' });
    if (await lock.isVisible() && await lock.isEnabled()) { await lock.click(); continue; }
    const cut = page.getByRole('button', { name: 'Start Cut Pass' });
    if (await cut.isEnabled()) await cut.click();
  }
  throw new Error('The project was not delivered in time.');
}

export async function creditsTable(page: Page): Promise<string> {
  await section(page, 'Release');
  return page.locator('section.panel', { hasText: 'Credits' }).first().innerText();
}
