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
  middleName?: string;
  preferredName?: string;
  /** A photo to upload as the headshot (makePhoto). */
  portrait?: { name: string; mimeType: string; buffer: Buffer };
  pronouns: 'He/Him' | 'She/Her' | 'They/Them';
  /** With They/Them the player picks the billing (Actor unless given); He/Him and She/Her settle it. */
  billedAs?: 'Actor' | 'Actress';
  birthDate: string;
  birthplace: string;
  /** Ethnicities, from the list. */
  heritages: string[];
  customHeritage?: string;
  /** Nationalities, by country name (at least one; November 8, 2026). */
  nationalities: string[];
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

/** Creation as 1221 lays it out: Identity, Background & Languages, Starting Point, Review. */
export async function createCharacter(page: Page, o: CharacterOpts, atReview?: (page: Page) => Promise<void>): Promise<void> {
  await page.getByRole('button', { name: 'New Game' }).first().click();
  await expect(page.getByRole('heading', { name: 'Identity', level: 1 })).toBeVisible();
  await fillName(page, o.name);
  if (o.middleName) await page.getByRole('textbox', { name: 'Middle Name (Optional)' }).fill(o.middleName);
  if (o.preferredName) await page.getByRole('textbox', { name: 'Preferred Name' }).fill(o.preferredName);
  if (o.portrait) {
    await page.locator('#portrait-file').setInputFiles(o.portrait);
    await expect(page.getByRole('slider', { name: 'Zoom' })).toBeVisible();
  }
  await page.getByLabel('Pronouns').selectOption({ label: o.pronouns });
  if (o.pronouns === 'They/Them') await page.getByRole('group', { name: 'Billed As' }).getByRole('button', { name: o.billedAs ?? 'Actor', exact: true }).click();
  await fillBirthDate(page, o.birthDate);
  await pickPlace(page, 'Place Of Birth', o.birthplace, o.birthCountry);
  await nextStep(page, 'Background & Languages');
  for (const h of o.heritages) {
    await page.getByRole('searchbox', { name: 'Search Ethnicities' }).fill(h);
    await page.getByRole('button', { name: `Add Ethnicity: ${h}` }).click();
  }
  if (o.customHeritage) {
    await page.getByRole('textbox', { name: 'Describe Your Ethnicity' }).fill(o.customHeritage);
    await page.getByRole('button', { name: 'Add Your Ethnicity' }).click();
  }
  for (const n of o.nationalities) {
    await page.getByRole('searchbox', { name: 'Search Nationalities' }).fill(n);
    await page.getByRole('button', { name: `Add Nationality: ${n}`, exact: true }).click();
  }
  await page.getByRole('searchbox', { name: 'Which language do you use most?' }).fill(o.mainLanguage);
  await page.getByRole('group', { name: 'Language You Use Most Results' }).getByRole('button', { name: new RegExp(`^${o.mainLanguage}( From your backgrounds)?$`) }).click(); // suggested ones are marked
  for (const l of o.extraLanguages) {
    await page.getByRole('searchbox', { name: 'Add Language' }).fill(l);
    await page.getByRole('button', { name: `Add Language: ${l}` }).click();
  }
  await nextStep(page, 'Starting Point');
  await pickPlace(page, 'Where You Live', o.start, o.startCountry);
  await page.getByLabel('Starting Date').fill(o.startDate);
  await page.getByLabel('Starting Time').fill(o.startTime);
  await nextStep(page, 'Review');
  await expect(page.getByText('Ready To Begin')).toBeVisible();
  if (atReview) await atReview(page);
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

/** The date of birth in 1221's three fields: year, month, day. */
/**
 * Labelled fixture: a photo, drawn in the page and returned as a PNG (a 3:2 landscape, so the picker has to crop it).
 * Only what a player's upload would be; nothing about it is read by the game.
 */
export async function makePhoto(page: Page): Promise<{ name: string; mimeType: string; buffer: Buffer }> {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas');
    c.width = 900; c.height = 600;
    const x = c.getContext('2d')!;
    x.fillStyle = '#3a6ea5'; x.fillRect(0, 0, 900, 600);
    x.fillStyle = '#f2c38f'; x.beginPath(); x.arc(450, 260, 140, 0, Math.PI * 2); x.fill();
    return c.toDataURL('image/png');
  });
  return { name: 'headshot.png', mimeType: 'image/png', buffer: Buffer.from(dataUrl.split(',')[1], 'base64') };
}

/** A full name into Identity's parts, as 1221's asks for them: the first word is the first name, the rest the last. */
export async function fillName(page: Page, full: string): Promise<void> {
  const [first, ...rest] = full.trim().split(/\s+/);
  await page.getByRole('textbox', { name: 'First Name', exact: true }).fill(first ?? '');
  await page.getByRole('textbox', { name: 'Last Name', exact: true }).fill(rest.join(' '));
}

export async function fillBirthDate(page: Page, ymd: string): Promise<void> {
  const [y, m, d] = ymd.split('-');
  await page.getByLabel('Year Of Birth').fill(y);
  await page.getByLabel('Month', { exact: true }).selectOption(m);
  await page.getByLabel('Day', { exact: true }).fill(String(Number(d)));
}

export async function pickPlace(page: Page, label: string, query: string, country?: string): Promise<void> {
  if (country) await page.getByRole('combobox', { name: `${label}, Country Or Territory` }).selectOption({ label: country });
  await page.getByRole('searchbox', { name: label }).fill(query);
  const first = page.getByRole('group', { name: `${label} Results` }).getByRole('button').first();
  await expect(first).toContainText(new RegExp(query.slice(0, 3), 'i'));
  await first.click();
  await expect(page.getByText(/^Chosen: /)).toBeVisible();
}

/** Below a laptop the rail is a drawer, as in 1221: open it with Menu unless it's open already. */
export async function openMenuIfNeeded(page: Page): Promise<void> {
  await expect(page.getByRole('banner')).toBeVisible();
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if ((await menu.isVisible()) && (await menu.getAttribute('aria-expanded')) !== 'true') await menu.click();
}

/** Through the rail. The calendar is Home's, as 1221's is: its way in is Up Next's Open Calendar. */
export async function nav(page: Page, label: 'Home' | 'Calendar' | 'World' | 'Projects' | 'Profile' | 'Saved Games' | 'Settings'): Promise<void> {
  if (label === 'Calendar') {
    await nav(page, 'Home');
    await page.getByRole('button', { name: 'Open Calendar' }).click();
    return;
  }
  await openMenuIfNeeded(page);
  const name = label === 'Profile' ? 'Player Profile' : label;
  await page.getByRole('navigation', { name: 'Main Navigation' }).getByRole('button', { name, exact: true }).click();
}

/** Save & Exit: in the bar, or in the drawer's foot where the rail is a drawer. */
export async function pressSaveAndExit(page: Page): Promise<void> {
  await openMenuIfNeeded(page);
  await page.getByRole('button', { name: 'Save & Exit' }).click();
}

export async function section(page: Page, label: string): Promise<void> {
  const tab = page.getByRole('tab', { name: label, exact: true });
  await tab.click();
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

/** Save & Exit, waiting until the save is stored and the start screen is back. */
export async function saveAndExit(page: Page): Promise<void> {
  await pressSaveAndExit(page);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
}

export async function quickLife(page: Page, startPlaceId: string, startDate: string, opts: { portrait?: boolean } = {}): Promise<void> {
  await page.goto('/');
  await page.evaluate(({ pl, sd, withPortrait }) => {
    localStorage.clear();
    const c = document.createElement('canvas');
    c.width = 512; c.height = 640;
    const x = c.getContext('2d')!;
    x.fillStyle = '#7a4b8c'; x.fillRect(0, 0, 512, 640);
    const portrait = withPortrait ? c.toDataURL('image/jpeg', 0.86) : undefined;
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Nia Halvorsen-Mbeki', pronouns: 'she', actingTitle: 'Actress', birthDate: '1990-05-20', birthplaceId: 'ke-nairobi',
      heritages: [{ id: 'Kikuyu', label: 'Kikuyu', custom: false }, { id: 'Norwegian', label: 'Norwegian', custom: false }], heritageCustomText: '', mainLanguage: 'en',
      languages: [{ code: 'sw', proficiency: 'Fluent' }, { code: 'no', proficiency: 'Conversational' }], startPlaceId: pl, startDate: sd, startTime: '08:00', updatedAt: 1,
      ...(portrait ? { portrait } : {}),
    }));
  }, { pl: startPlaceId, sd: startDate, withPortrait: !!opts.portrait });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
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

/**
 * Write the pitch in the Story panel (on the Script page): backers, festival entries and distributors ask for a logline
 * and premise, and a grant application for the stakes and theme too.
 */
export async function writePitch(page: Page): Promise<void> {
  await page.getByLabel('Logline', { exact: true }).fill('A night shift that will not end.');
  await page.getByLabel('Premise', { exact: true }).fill('Two strangers keep the last service running until dawn.');
  await page.getByLabel('Stakes', { exact: true }).fill('If the service stops, the city strands its night workers.');
  await page.getByLabel('Theme', { exact: true }).fill('Care as work.');
  // The Treatment and Statement Of Intent a grant application includes; the tone and setting are the writer's record.
  await page.getByLabel('Central Conflict', { exact: true }).fill('The depot wants the line closed.');
  await page.getByLabel('Point Of View', { exact: true }).fill('The driver.');
  await page.getByLabel('Intended Ending', { exact: true }).fill('The first morning tram runs.');
  await page.getByLabel('Intended Experience', { exact: true }).fill('Quiet, then hopeful.');
  await page.getByLabel('Story Setting', { exact: true }).fill('A city at night.');
  const question = page.getByLabel('Central Question', { exact: true });
  if (await question.count()) await question.fill('Who keeps a city running at night?');
  // The content declaration a streaming contract asks for: these journeys' films contain none of the listed issues.
  const none = page.getByRole('button', { name: 'Declare None Of These' });
  if (await none.count()) await none.click();
}

export async function saveAndApprove(page: Page): Promise<void> {
  await section(page, 'Script');
  await writePitch(page);
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await secureStartingBacking(page);
}

/**
 * Fund a first project the way a player does: Budget, ask for the agreed starting backing, read its terms, accept.
 * Asserts the money really arrives (nothing is in the budget before).
 */
export async function secureStartingBacking(page: Page): Promise<void> {
  await section(page, 'Budget');
  const fin = page.locator('section.card', { has: page.getByRole('heading', { name: 'Financing' }) });
  await expect(fin.locator('dt', { hasText: /^Received$/ }).locator('xpath=following-sibling::dd[1]')).toHaveText('$0');
  await page.getByRole('button', { name: 'Approach Starting Backing' }).click();
  await page.getByRole('button', { name: 'Accept Offer' }).click();
  const terms = page.getByRole('dialog', { name: 'Accept These Terms?' });
  await expect(terms).toContainText("from the project's income before the project keeps any");
  await terms.getByRole('button', { name: /^Accept \$/ }).click();
  await expect(fin.locator('dt', { hasText: /^Received$/ }).locator('xpath=following-sibling::dd[1]')).not.toHaveText('$0');
  await section(page, 'Script'); // back where approval left the player
}

/** Cast every uncast role through Find Performers (or yourself for named roles). */
export async function castRoles(page: Page, yourself: string[] = []): Promise<void> {
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
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
      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
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
  await runToDelivery(page, opts);
}

/**
 * Contributors who approve how they appear (documentary.ts): show them the locked cut; if one refuses, unlock picture and
 * cut their scenes, as a producer would. Call it on the Edit page.
 */
export async function contributorApprovals(page: Page): Promise<void> {
  const card = page.locator('section.card', { has: page.getByRole('heading', { name: "Contributors' Approval" }) });
  if (!(await card.count())) return;
  for (const b of await card.getByRole('button', { name: /^Show .+ The Cut$/ }).all()) await b.click();
  if (await card.getByText(/Didn't approve the cut/).count()) {
    const unlock = page.getByRole('button', { name: 'Unlock Picture' });
    if (await unlock.isVisible()) await unlock.click();
    for (let i = 0; i < 10; i++) {
      const cut = card.getByRole('button', { name: /^Cut .+ From The Edit$/ }).first();
      if (!(await cut.count())) break;
      await cut.click();
      await page.getByRole('dialog', { name: 'Cut This Scene From The Edit?' }).getByRole('button', { name: 'Cut It' }).click();
    }
  }
}

/** Approve every finished design waiting on the Production page (designs.ts): nothing is built until it is approved. */
export async function approveDesigns(page: Page): Promise<number> {
  await section(page, 'Production');
  const buttons = page.getByRole('button', { name: /^Approve .+'s Design$/ });
  let n = 0;
  for (; n < 20 && (await buttons.count()); n++) await buttons.first().click();
  return n;
}

/** From a built schedule, keep the production moving (staff, cast, cut passes, lock) until it is delivered. */
export async function runToDelivery(page: Page, opts: { weeks?: number; step?: 'week' | 'month'; mocap?: boolean } = {}): Promise<void> {
  for (let i = 0; i < (opts.weeks ?? 60); i++) {
    await advance(page, opts.step ?? 'week');
    await staffEveryDepartment(page);
    await castRoles(page);
    await approveDesigns(page);
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
    await contributorApprovals(page);
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
  return page.locator('section.card', { hasText: 'Credits' }).first().innerText();
}

/**
 * A new life whose world seed is fixed, so everything the game decides by chance (consent, hiring, weather) comes out
 * the same on every run. Labelled fixture: the game is created through the UI, then its stored seed is replaced while
 * no game is open (so no closing-page copy can bring the old one back), and it is opened again with Continue.
 */
export async function seededLife(page: Page, startPlaceId: string, startDate: string, seed: number): Promise<void> {
  await quickLife(page, startPlaceId, startDate);
  await pinSeed(page, seed);
}

/**
 * Labelled fixture: fix the world seed of the game being played (made through the UI), so what the game decides by
 * chance comes out the same on every run. The game is saved and left, its stored seed replaced while no game is open,
 * and it is opened again with Continue.
 */
export async function pinSeed(page: Page, seed: number): Promise<void> {
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
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  expect((await readSavedState(page)).seed).toBe(seed);
}

/** Start a project from the Projects screen through its form. */
export async function newProject(page: Page, o: { title: string; format: string; medium?: string; technique?: string; finish?: string; episodes?: string; runtime?: string; budget?: string; audience?: string; base?: { place: string; country?: string } }): Promise<void> {
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill(o.title);
  await page.getByLabel('Format').selectOption({ label: o.format });
  if (o.medium) await page.getByLabel('Medium').selectOption({ label: o.medium });
  if (o.technique) await page.getByLabel(/^Animation Technique/).selectOption({ label: o.technique });
  if (o.finish) await page.getByLabel('Animation Finish').selectOption({ label: o.finish });
  if (o.episodes) await page.getByLabel('Episodes').fill(o.episodes);
  if (o.runtime) await page.getByLabel(/Target (Runtime In Minutes|Minutes Per Episode)/).fill(o.runtime);
  if (o.budget) await page.getByRole('radio', { name: new RegExp(`^${o.budget}:`) }).check();
  if (o.audience) await page.getByLabel('Intended Audience').selectOption({ label: o.audience });
  if (o.base) await pickPlace(page, 'Production Base', o.base.place, o.base.country);
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: o.title, level: 1 })).toBeVisible();
}
