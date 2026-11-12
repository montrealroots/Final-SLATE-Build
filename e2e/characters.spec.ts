// A character's whole life through the interface (the v3 package, suite T04): made by hand with no story chosen,
// renamed, tied to a scene, a look and another character, cast with one performer for the body and another for the
// voice, recast, set aside with their scenes given to someone else, reloaded, and restored. The contract and what it
// has cost are read from the save before and after and must be the same.
import { expect, test, type Page } from './test';
import { addScene, advance, freshStart, nav, newProject, pinSeed, quickLife, readSavedState, saveAndApprove, saveAndExit, section } from './helpers';
import { layoutFindings } from './layout';

const noSidewaysScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
const project = async (page: Page) => (await readSavedState(page))?.projects?.[0];
const shot = (page: Page, n: string, name: string) => page.screenshot({ path: `test-results/characters-${n}-${name}.png`, fullPage: true });

async function addCharacter(page: Page, name: string) {
  await page.getByLabel('Character Name').fill(name);
  await page.getByRole('button', { name: 'Add Character' }).click();
  await expect(page.getByRole('article', { name })).toBeVisible();
}

/** Offer a part's row to the nth person the search lists; returns once the dialog has closed on an offer made. */
async function offer(page: Page, part: string, method: 'On Camera' | 'Voice', skip = 0) {
  const row = page.locator('li', { has: page.getByText(part, { exact: true }) }).locator('.row-wrap', { hasText: `${method}:` });
  await row.getByRole('button', { name: 'Find Performers' }).click();
  const dialog = page.getByRole('dialog');
  const offers = dialog.getByRole('button', { name: 'Make Offer' });
  const n = await offers.count();
  for (let i = skip; i < n && (await dialog.isVisible()); i++) await offers.nth(i).click();
  await expect(dialog).toBeHidden();
}

test('characters made by hand: renamed, tied together, cast body and voice apart, recast, set aside with their scenes given away, reloaded and restored', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and one WebKit iPhone emulation.');
  test.setTimeout(600_000);
  const n = info.project.name;
  await freshStart(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await pinSeed(page, 11);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Two Rooms', format: 'Short Film', budget: 'Low Budget' });

  // Three characters, with no story chosen and no idea applied.
  await section(page, 'Characters');
  await expect(page.getByText('No characters yet. Add one above, or choose a full story on the Script page')).toBeVisible();
  for (const name of ['Mara', 'Ilse', 'The House']) await addCharacter(page, name);
  // Rename one; give one a voice of its own beside its body; say more about one.
  const ilse = page.getByRole('article', { name: 'Ilse' });
  await ilse.getByRole('button', { name: 'Edit Character' }).click();
  await ilse.getByLabel('Name', { exact: true }).fill('Ilse Brandt');
  const brandt = page.getByRole('article', { name: 'Ilse Brandt' });
  await brandt.getByLabel('How They Change').fill('From collecting the rent to forgiving it');
  await brandt.getByLabel('How They Speak').fill('Short sentences. Never asks twice.');
  await brandt.getByLabel('Appearance States').fill('2');
  expect(await layoutFindings(page), 'a character, open').toEqual([]);
  await noSidewaysScroll(page);
  await shot(page, n, '01-character-open');
  await brandt.getByRole('button', { name: 'Close' }).click();
  const house = page.getByRole('article', { name: 'The House' });
  await house.getByRole('button', { name: 'Edit Character' }).click();
  await house.getByRole('checkbox', { name: 'Voice', exact: true }).check();
  await house.getByRole('button', { name: 'Close' }).click();
  // The order is the writer's: The House moves up one, and a copy of Mara is made and then removed for good, with nothing behind it.
  await page.getByRole('button', { name: 'Move The House Up' }).click();
  await expect(page.locator('article.card h2')).toHaveText(['Mara', 'The House', 'Ilse Brandt']);
  await page.getByRole('button', { name: 'Duplicate Mara' }).click();
  await expect(page.locator('article.card h2')).toHaveText(['Mara', 'Mara (Copy)', 'The House', 'Ilse Brandt']);
  await page.getByRole('button', { name: 'Set Aside Or Remove Mara (Copy)' }).click();
  const gone = page.getByRole('dialog', { name: 'Take Mara (Copy) Out Of The Script?' });
  await expect(gone).toContainText('Nothing else in the script refers to them.');
  await gone.getByRole('button', { name: 'Remove For Good' }).click();
  await expect(page.locator('article.card h2')).toHaveText(['Mara', 'The House', 'Ilse Brandt']);

  // Scenes with them in, and something between two of them. A second bond for the same pair is refused in words.
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Mara', 'Ilse Brandt', 'The House'] });
  await addScene(page, { index: 1, place: 'Stairwell', chars: ['Ilse Brandt', 'The House'] });
  const rel = page.locator('section.card', { has: page.getByRole('heading', { name: 'Relationships' }) });
  await rel.getByLabel('First Character').selectOption({ label: 'Mara' });
  await rel.getByLabel('Second Character').selectOption({ label: 'Ilse Brandt' });
  await rel.getByLabel('Relationship', { exact: true }).fill('Tenant and landlady');
  await rel.getByLabel('Where It Starts').fill('Owing three months');
  await rel.getByLabel('Where It Ends').fill('Even');
  await rel.getByRole('button', { name: 'Add Relationship' }).click();
  await expect(rel).toContainText('Tenant and landlady');
  await rel.getByLabel('First Character').selectOption({ label: 'Ilse Brandt' });
  await rel.getByLabel('Second Character').selectOption({ label: 'Mara' });
  await rel.getByLabel('Relationship', { exact: true }).fill('Rivals');
  await rel.getByRole('button', { name: 'Add Relationship' }).click();
  await expect(page.getByRole('alert')).toContainText('Ilse Brandt and Mara already have a relationship. Change that one instead of adding a second.');
  await rel.getByLabel('Relationship', { exact: true }).fill('');

  // Approved and funded; then cast: The House's body by one performer and its voice by another.
  await saveAndApprove(page);
  await section(page, 'Cast');
  await offer(page, 'Mara', 'On Camera');
  await offer(page, 'Ilse Brandt', 'On Camera');
  await offer(page, 'The House', 'On Camera');
  await offer(page, 'The House', 'Voice', 1);
  for (let i = 0; i < 3; i++) { await advance(page, 'next-day'); for (const b of await page.getByRole('button', { name: 'Accept Counteroffer' }).all()) await b.click(); }
  await section(page, 'Cast');
  let p = await project(page);
  const idOf = (name: string) => p.drafts.at(-1).characters.find((c: { name: string }) => c.name === name).id;
  const accepted = (name: string, method = 'on-camera') => p.hires.find((h: { characterId: string; method: string; status: string }) => h.characterId === idOf(name) && h.method === method && h.status === 'accepted');
  await expect.poll(async () => { p = await project(page); return !!(accepted('Ilse Brandt') && accepted('The House') && accepted('The House', 'voice')); }, { timeout: 30_000 }).toBe(true);
  expect(accepted('The House').personId, 'two people play The House: one seen, one heard').not.toBe(accepted('The House', 'voice').personId);
  await noSidewaysScroll(page);
  await shot(page, n, '02-cast');

  // Recast: the body performer is released by the player, and the part offered to someone else. The first contract stays on the record as released.
  const first = accepted('The House');
  const contracts = page.locator('section.card', { has: page.getByRole('heading', { name: 'Offers And Contracts' }) });
  await contracts.locator('tr', { hasText: 'The House (On Camera)' }).getByRole('button', { name: 'Release' }).click();
  const sure = page.getByRole('dialog');
  if (await sure.isVisible().catch(() => false)) await sure.getByRole('button', { name: /^Release/ }).click();
  await expect.poll(async () => (await project(page)).hires.find((h: { id: string }) => h.id === first.id).status).toBe('released');
  // An offer can be declined or countered: keep offering down the list, a day at a time, until someone new has the part.
  for (let skip = 2, day = 0; day < 12; day++) {
    p = await project(page);
    const now = accepted('The House');
    if (now && now.id !== first.id) break;
    const open = p.hires.some((h: { characterId: string; method: string; status: string }) => h.characterId === idOf('The House') && h.method === 'on-camera' && (h.status === 'offered' || h.status === 'countered'));
    if (!open) { await section(page, 'Cast'); await offer(page, 'The House', 'On Camera', skip); skip += 1; }
    await advance(page, 'next-day');
    await section(page, 'Cast');
    for (const b of await page.getByRole('button', { name: 'Accept Counteroffer' }).all()) await b.click();
    await page.waitForTimeout(700); // the save follows the page
  }
  await expect.poll(async () => { p = await project(page); const h = accepted('The House'); return !!h && h.id !== first.id; }, { timeout: 30_000 }).toBe(true);

  // What Ilse Brandt's contract is and has cost, before she is set aside.
  p = await project(page);
  const ilseId = idOf('Ilse Brandt');
  const money = (q: typeof p) => JSON.stringify({ hires: q.hires.filter((h: { characterId: string }) => h.characterId === ilseId), cast: q.cast.filter((c: { characterId: string }) => c.characterId === ilseId), obligations: q.obligations });
  const before = money(p);

  // Set aside, with her scenes, lines and bond given to Mara. The dialog says what it touches, and that the contract stays.
  await section(page, 'Characters');
  await page.getByRole('button', { name: 'Set Aside Or Remove Ilse Brandt' }).click();
  const aside = page.getByRole('dialog', { name: 'Take Ilse Brandt Out Of The Script?' });
  await expect(aside).toContainText('They are in 2 scenes: Scene 1 (Kitchen), Scene 2 (Stairwell).');
  await expect(aside).toContainText('1 relationship names them.');
  await expect(aside).toContainText('1 performer is contracted for the part. The contract stays as agreed until you release it in Cast; what was paid stays paid.');
  await expect(aside.getByRole('button', { name: 'Remove For Good' })).toBeDisabled();
  await expect(aside).toContainText('Someone is contracted or has an offer for this part. Set the character aside instead');
  await aside.getByLabel('Give Their Scenes, Lines And Relationships To').selectOption({ label: 'Mara' });
  expect(await layoutFindings(page), 'the set-aside dialog').toEqual([]);
  await noSidewaysScroll(page);
  await shot(page, n, '03-set-aside');
  await aside.getByRole('button', { name: 'Set Aside', exact: true }).click();
  await expect(page.locator('article.card h2')).toHaveText(['Mara', 'The House']);
  const set = page.getByRole('region', { name: 'Set Aside' });
  await expect(set).toContainText('Ilse Brandt');
  await expect(set).toContainText('their scenes went to Mara');
  await expect.poll(async () => (await project(page)).archived?.length).toBe(1);
  p = await project(page);
  expect(money(p), 'setting a character aside changes no contract and no payment').toBe(before);
  const maraId = p.characters.find((c: { name: string }) => c.name === 'Mara').id;
  expect(p.scenes.map((s: { participants: string[] }) => s.participants.includes(maraId))).toEqual([true, true]);
  expect(p.scenes.flatMap((s: { participants: string[] }) => s.participants)).not.toContain(ilseId);
  // Mara-with-herself is not a bond: the one she had with Ilse Brandt is gone, and none is doubled.
  expect(p.relationships).toEqual([]);

  // Across Save And Exit and Continue: the contract, its booking and every payment are as they were, and Cast still names the part.
  await saveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  p = await project(page);
  expect(money(p)).toBe(before);
  expect(p.archived[0].c.name).toBe('Ilse Brandt');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: /Two Rooms/ }).first().click();
  await section(page, 'Cast');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Offers And Contracts' }) }).locator('tr', { hasText: 'Ilse Brandt (On Camera)' })).toContainText('Accepted');
  // Restored: she is a character again, as she was written, in no scene (they are Mara's now).
  await section(page, 'Characters');
  await page.getByRole('button', { name: 'Restore Ilse Brandt' }).click();
  await expect(page.locator('article.card h2')).toHaveText(['Mara', 'The House', 'Ilse Brandt']);
  const back = page.getByRole('article', { name: 'Ilse Brandt' });
  await expect(back).toContainText('0 scenes');
  await back.getByRole('button', { name: 'Edit Character' }).click();
  await expect(back.getByLabel('How They Speak')).toHaveValue('Short sentences. Never asks twice.');
  await expect(page.getByRole('region', { name: 'Set Aside' })).toHaveCount(0);
  await expect.poll(async () => (await project(page)).archived).toBeUndefined();
  expect(money(await project(page))).toBe(before);
});

test('a character split in two: the new one takes the scenes ticked and their lines, and the original keeps the rest', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Two Ages', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Mara'] });
  await addScene(page, { index: 1, place: 'Schoolyard', chars: ['Mara'] });
  await section(page, 'Characters');
  await page.getByRole('button', { name: 'Split Mara' }).click();
  const dialog = page.getByRole('dialog', { name: 'Split Mara' });
  await expect(dialog.getByRole('button', { name: 'Split', exact: true })).toBeDisabled();
  await expect(dialog).toContainText('Tick the scenes the new character takes.');
  await dialog.getByRole('checkbox', { name: /Schoolyard/ }).check();
  await dialog.getByLabel("New Character's Name").fill('Young Mara');
  await dialog.getByRole('button', { name: 'Split', exact: true }).click();
  await expect(page.locator('article.card h2')).toHaveText(['Mara', 'Young Mara']);
  await expect(page.getByRole('article', { name: 'Young Mara' })).toContainText('1 scene');
  await expect(page.getByRole('article', { name: 'Mara', exact: true })).toContainText('1 scene');
  await expect.poll(async () => {
    const p = (await readSavedState(page))?.projects?.[0];
    const young = p?.characters.find((c: { name: string }) => c.name === 'Young Mara');
    return young ? p.scenes.find((sc: { heading: { place: string } }) => sc.heading.place === 'Schoolyard').participants.includes(young.id) : false;
  }).toBe(true);
});
