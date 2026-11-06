import { expect, type Page } from '@playwright/test';
import { hashString } from '../src/engine/rng';
import { firstSaveId, readRecord, writeRecords } from './vault';

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
  /** Pick from a country's full place list instead of the featured cities. */
  birthCountry?: string;
  startCountry?: string;
  startDate: string;
  startTime: string;
}

/** Go to the next creation step. No waiting: typing straight away must work (e2e/creation.spec.ts). */
async function nextStep(page: Page, name: string): Promise<void> {
  await page.getByRole('button', { name: `Next: ${name}` }).click();
}

export async function createCharacter(page: Page, o: CharacterOpts): Promise<void> {
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await expect(page.getByRole('heading', { name: 'Your Name' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Name' }).fill(o.name);
  await nextStep(page, 'Pronouns');
  await page.getByLabel('Pronouns').selectOption({ label: o.pronouns });
  await nextStep(page, 'Background');
  for (const h of o.heritages) {
    await page.getByRole('searchbox', { name: 'Search Backgrounds' }).fill(h);
    await page.getByRole('button', { name: `Add A Background: ${h}` }).click();
  }
  if (o.customHeritage) {
    await page.getByRole('textbox', { name: 'Describe Your Background' }).fill(o.customHeritage);
    await page.getByRole('button', { name: 'Add A Background', exact: true }).click();
  }
  await nextStep(page, 'Languages');
  await page.getByRole('searchbox', { name: 'Which language do you use most?' }).fill(o.mainLanguage);
  await page.getByRole('group', { name: 'Language You Use Most Results' }).getByRole('button', { name: o.mainLanguage, exact: true }).click();
  for (const l of o.extraLanguages) {
    await page.getByRole('searchbox', { name: 'Add Language' }).fill(l);
    await page.getByRole('button', { name: `Add Language: ${l}` }).click();
  }
  await nextStep(page, 'Birthday');
  await page.getByLabel('Birth Date').fill(o.birthDate);
  await pickPlace(page, 'Birthplace', o.birthplace, o.birthCountry);
  await nextStep(page, 'Starting Date');
  await page.getByLabel('Starting Date').fill(o.startDate);
  await page.getByLabel('Starting Time').fill(o.startTime);
  await nextStep(page, 'Starting Location');
  await pickPlace(page, 'Starting Location', o.start, o.startCountry);
  await nextStep(page, 'Review');
  await expect(page.getByRole('heading', { name: 'Review', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
}

export async function pickPlace(page: Page, label: string, query: string, country?: string): Promise<void> {
  if (country) await page.getByLabel('Country Or Territory').selectOption({ label: country });
  await page.getByRole('searchbox', { name: label }).fill(query);
  const first = page.getByRole('group', { name: `${label} Results` }).getByRole('button').first();
  await expect(first).toContainText(new RegExp(query.slice(0, 3), 'i'));
  await first.click();
  await expect(page.getByText(/^Chosen: /)).toBeVisible();
}

export async function openMenuIfNeeded(page: Page): Promise<void> {
  await expect(page.getByRole('banner')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menu' });
  if (await menu.isVisible()) await menu.click();
}

export async function nav(page: Page, label: 'Home' | 'Calendar' | 'World' | 'Projects' | 'Profile' | 'Saved Games' | 'Settings'): Promise<void> {
  await openMenuIfNeeded(page);
  await page.getByRole('navigation', { name: 'Main' }).filter({ visible: true }).getByRole('link', { name: label }).click();
}

export async function section(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('tab', { name: label, exact: true });
  // Project screens load on first use; wait for the tabs (desktop) or the section selector (phone).
  await expect(tab.or(page.getByRole('combobox', { name: 'Project Sections' }))).toBeVisible();
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
  const id = await firstSaveId(page).catch(() => null);
  if (!id) return null;
  return JSON.parse(JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!).data);
}

/** Save And Exit, waiting until the save is stored and the start screen is back. */
export async function saveAndExit(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
}

export async function quickLife(page: Page, startPlaceId: string, startDate: string): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ pl, sd }) => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Nia Halvorsen-Mbeki', pronouns: 'she', actingTitle: 'Actress', birthDate: '1990-05-20', birthplaceId: 'ke-nairobi',
      heritages: [{ id: 'Kikuyu', label: 'Kikuyu', custom: false }, { id: 'Norwegian', label: 'Norwegian', custom: false }], heritageCustomText: '', mainLanguage: 'en',
      languages: [{ code: 'sw', proficiency: 'Fluent' }, { code: 'no', proficiency: 'Conversational' }], startPlaceId: pl, startDate: sd, startTime: '08:00', updatedAt: 1,
    }));
  }, { pl: startPlaceId, sd: startDate });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
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
  // Re-query after every offer: a successful offer removes that role's button, so the same index
  // then points at the next role. Roles nobody can take are skipped past.
  const buttons = roles.getByRole('button', { name: 'Find Performers' });
  let skipped = 0;
  for (let guard = 0; guard < 16; guard++) {
    if ((await buttons.count()) <= skipped) break;
    await buttons.nth(skipped).click();
    const dialog = page.getByRole('dialog');
    const offers = dialog.getByRole('button', { name: 'Make Offer' });
    const n = await offers.count();
    // An offer can be refused (for example, one performer can't play two characters in a scene): try the next person.
    for (let i = 0; i < n && (await dialog.isVisible()); i++) await offers.nth(i).click();
    if (await dialog.isVisible()) {
      await dialog.getByRole('button', { name: 'Close' }).click();
      skipped += 1;
    }
  }
  for (const b of await page.getByRole('button', { name: 'Accept Counteroffer' }).all()) await b.click();
}

/** Play a project from an approved draft to delivery through the interface. */
export async function produceToDelivery(page: Page, opts: { yourself?: string[]; weeks?: number; step?: 'week' | 'month'; mocap?: boolean } = {}): Promise<void> {
  await castRoles(page, opts.yourself ?? []);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  for (let i = 0; i < (opts.weeks ?? 60); i++) {
    await advance(page, opts.step ?? 'week');
    await staffEveryDepartment(page);
    await castRoles(page);
    // Motion capture: book the stage, then approve a take once one exists.
    if (opts.mocap) {
      await section(page, 'Production');
      const book = page.getByRole('button', { name: /^Book Capture Stage/ });
      if (await book.first().isVisible()) await book.first().click();
      for (const art of await page.getByRole('article', { name: /^Motion Capture For/ }).all()) {
        if (await art.getByText('Approved', { exact: true }).count()) continue;
        const approve = art.getByRole('button', { name: /^Approve Take 1 For/ });
        if (await approve.isVisible()) await approve.click();
      }
    }
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

/**
 * A new life whose world seed is fixed, so everything the game decides by chance (consent, hiring, weather) comes out
 * the same on every run. Labelled fixture: the game is created through the UI, then its stored seed is replaced while
 * no game is open (so no closing-page copy can bring the old one back), and it is opened again with Continue.
 */
export async function seededLife(page: Page, startPlaceId: string, startDate: string, seed: number): Promise<void> {
  await quickLife(page, startPlaceId, startDate);
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const key = `slate.v1.save.${id}`;
  const env = JSON.parse((await readRecord(page, key))!);
  const state = JSON.parse(env.data);
  state.seed = seed;
  const data = JSON.stringify(state);
  await writeRecords(page, { [key]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  expect((await readSavedState(page)).seed).toBe(seed);
}

/** Start a project from the Projects screen through its form. */
export async function newProject(page: Page, o: { title: string; format: string; medium?: string; technique?: string; finish?: string; episodes?: string; runtime?: string }): Promise<void> {
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill(o.title);
  await page.getByLabel('Format').selectOption({ label: o.format });
  if (o.medium) await page.getByLabel('Medium').selectOption({ label: o.medium });
  if (o.technique) await page.getByLabel(/^Animation Technique/).selectOption({ label: o.technique });
  if (o.finish) await page.getByLabel('Animation Finish').selectOption({ label: o.finish });
  if (o.episodes) await page.getByLabel('Episodes').fill(o.episodes);
  if (o.runtime) await page.getByLabel(/Target (Runtime In Minutes|Minutes Per Episode)/).fill(o.runtime);
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: o.title, level: 1 })).toBeVisible();
}
