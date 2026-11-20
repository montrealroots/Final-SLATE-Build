// J02 in one save (the owner's research recovery package of November 19, 2026, docs/04-JOURNEYS-AND-SAFARI.md, "One
// continuous source-to-award save"). Until November 20, 2026 a real work as the source and real catalog people hired
// ran in journeys of their own (e2e/v5-source-to-release.spec.ts, e2e/real-people.spec.ts, e2e/catalog-live.spec.ts), and
// e2e/j02.spec.ts's one game used invented ones. Here one save, through the interface: a real work adapted (Don Quixote,
// its story from its Wikipedia article, credited); its parts cast from the real film catalog (TMDB's people, installed
// on this machine); made, delivered and released through the player's own storefront; entered for Sundance 2027's short
// film program under its official rules; selected or not, judged, and the result kept once across a reload.
//
// What is a fixture: the world seed (pinned), and the film's quality set high before it is entered, through the save,
// so that selection is likely (the judging is simulated, and a short made in a few weeks rarely is). Contracts and the
// rights to the work are the game's own; nothing here is a real agreement.
//
// It runs only where the real catalog is installed (.screen-catalog/, git-ignored, never in CI), as catalog-live does.
import { existsSync } from 'node:fs';
import { expect, test, type Page } from './test';
import { adaptWork, advance, castRoles, nav, onlyOn, pinSeed, quickLife, readSavedState, runToDelivery, saveAndApprove, saveAndExit, section, staffEveryDepartment } from './helpers';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.use({ actionTimeout: 20_000 });
const TITLE = 'The Knight';
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const day = (t: number, n: number) => new Date(t + n * 86_400_000).toISOString().slice(0, 10);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mine = (s: any) => s.projects.find((p: { title: string }) => p.title === TITLE);

/** The in-game date shown in the header. */
async function gameDate(page: Page): Promise<string> {
  const text = await page.getByRole('banner').getByText(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}$/).innerText();
  return new Date(`${text.replace(/^[A-Za-z]+, /, '')} 12:00 UTC`).toISOString().slice(0, 10);
}

/** Advance to a chosen date (9 AM), pressing Advance again whenever something stops it, as a player would. */
async function advanceUntil(page: Page, date: string): Promise<void> {
  for (let i = 0; i < 80 && (await gameDate(page)) < date; i++) {
    await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Advance' });
    await dialog.getByLabel('Advance To').selectOption('time');
    await dialog.getByLabel('Date').fill(date);
    await dialog.getByLabel('Time').fill('09:00');
    await dialog.getByRole('button', { name: 'Advance' }).click();
    await expect(page.locator('.save-state')).not.toHaveText(/Advancing/, { timeout: 60_000 });
    const dismiss = page.getByRole('button', { name: 'Dismiss' });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  expect(await gameDate(page)).toBe(date);
}

/** The harness: edit the saved game in place (its checksum kept), then reopen it, as e2e/journeys.spec.ts does. */
async function editSaveAndReopen(page: Page, fn: (state: Record<string, any>) => void): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  fn(state);
  const data = JSON.stringify(state);
  const { hashString } = await import('../src/engine/rng');
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

test('J02 in one save: a real work, real catalog performers, made, released, entered for Sundance and judged, kept across a reload', async ({ page }, info) => {
  test.skip(!existsSync('.screen-catalog/index.json'), 'The real catalog is installed only where it was gathered from TMDB.');
  test.skip(!onlyOn(info, ['desktop']), 'One whole career step, at desktop width and on WebKit when every journey runs there.');
  test.setTimeout(2_400_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/themoviedb\.org|tmdb\.org/, (r) => r.abort());

  await quickLife(page, 'us-los-angeles', '2026-02-02');
  await pinSeed(page, 7);
  expect((await readSavedState(page)).bank, 'the story starts with its bank and inheritance').toBeTruthy();

  // The work, its brief from its story, and the credit it carries.
  await adaptWork(page, { query: 'Don Quixote', work: /^Don Quixote/, title: TITLE, format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await expect.poll(async () => mine(await readSavedState(page))?.proposal?.story?.article ?? null, { timeout: 30_000 }).toBe('Don Quixote');
  await saveAndApprove(page);

  // A real performer considered for a part, the way a player finds one: a studio, one of its films, its cast, a person's
  // page. Nobody real is put on a list for the player; once considered, they come first on the part's list, marked so.
  const toyStory = async () => {
    await nav(page, 'Companies');
    await page.getByRole('button', { name: 'Pixar', exact: true }).click();
    await card(page, 'Films And Series').getByLabel('Search Titles').fill('Toy Story');
    await card(page, 'Films And Series').getByRole('button', { name: 'Toy Story', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Toy Story', level: 1 })).toBeVisible();
  };
  await toyStory();
  const names = (await card(page, 'Cast').getByRole('button').allInnerTexts()).map((x) => x.trim()).filter(Boolean);
  let considered = '';
  for (const name of names.slice(0, 12)) {
    await card(page, 'Cast').getByRole('button', { name, exact: true }).first().click();
    await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
    const story = card(page, 'In Your Story');
    await expect(story).toBeVisible();
    // First into the story (offers and costs nothing), then onto a part's list.
    const into = story.getByRole('button', { name: `Consider ${name} For Your Projects` });
    if (await into.isVisible()) await into.click();
    const add = story.getByRole('button', { name: 'Consider For This' });
    if (await add.waitFor({ timeout: 8_000 }).then(() => true, () => false)) {
      await add.click();
      await expect(story.getByRole('status')).toContainText(`${name} is on ${TITLE}'s list for`);
      considered = name;
      break;
    }
    await toyStory();
  }
  expect(considered, 'a Toy Story cast member could be considered for a part').not.toBe('');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: TITLE }).first().click();

  // Cast: the considered performer is first on their part's list, from the film catalog, and is offered the part.
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  const cast = JSON.stringify(mine(await readSavedState(page)));
  const real = [...new Set(cast.match(/"tp_\d+"/g) ?? [])];
  expect(real.length, 'a performer or crew member from the real film catalog is contracted').toBeGreaterThan(0);

  // Scheduled, shot and delivered.
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 40 });
  await expect.poll(async () => !!mine(await readSavedState(page))?.delivered, { timeout: 30_000 }).toBe(true);

  // Released through the player's own storefront on a plan, and out on its date. The credits name the work.
  const openFilm = async (tab: string) => { await nav(page, 'Projects'); await page.getByRole('button', { name: TITLE }).first().click(); await section(page, tab); };
  await openFilm('Release');
  await expect(card(page, 'Credits')).toContainText('Based on Don Quixote');
  const plan = card(page, 'Release Plan');
  const now = (await readSavedState(page)).now as number;
  await plan.getByLabel('Direct To Audience').check();
  await plan.getByLabel('Plan Territories').fill('US');
  await plan.getByLabel('First Public Date').fill(day(now, 10));
  await plan.getByRole('button', { name: 'Save The Plan' }).click();
  await plan.getByRole('region', { name: 'Direct To Audience' }).getByRole('button', { name: 'Open Your Storefront' }).click();
  for (let i = 0; i < 3; i++) await advance(page, 'week');
  await expect.poll(async () => mine(await readSavedState(page)).releases.find((r: { distributor: string }) => r.distributor === 'Your Own Storefront')?.status, { timeout: 30_000 }).toBe('released');

  // The harness: the film made strong before it is entered (an entry is judged on what it was entered with).
  await editSaveAndReopen(page, (st) => { const p = mine(st); p.quality = { ...p.quality, overall: 99, reception: 99, direction: 99, script: 99 }; });

  // Sundance 2027's short film program: the organizer's rules, entered and paid once.
  await openFilm('Festivals And Awards');
  if (!(await page.locator('li', { hasText: 'Sundance Film Festival 2027' }).filter({ hasText: 'Open To You' }).isVisible())) {
    await advanceUntil(page, '2026-06-01');
    await openFilm('Festivals And Awards');
  }
  await page.locator('li', { hasText: 'Sundance Film Festival 2027' }).getByRole('button', { name: 'Sundance Film Festival 2027' }).click();
  const shorts = page.locator('li', { hasText: 'Short Film Program' });
  await expect(shorts.getByText('Official Rules')).toBeVisible();
  await shorts.getByRole('button', { name: 'Prepare Submission' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit Entry' }).click();
  await expect(page.locator('section', { hasText: 'Your Entries' }).getByText('Submitted')).toBeVisible();

  // Results after the festival (January 21 to 31, 2027): selected or not, and a prize decided among the selected.
  await advanceUntil(page, '2027-02-03');
  await openFilm('Festivals And Awards');
  const entry = page.locator('section', { hasText: 'Your Entries' }).first();
  await expect(entry.locator('.chip').first()).toHaveText(/^(Selected|Not Selected|In Competition|Winner|Did Not Win|Special Mention)$/);

  // Saved, reloaded and played on: one result, one fee, the same record.
  await saveAndExit(page);
  const done = await readSavedState(page);
  const results = (s: { log: { text: string }[] }) => s.log.filter((l) => /Sundance Film Festival 2027/.test(l.text)).length;
  const fees = (s: unknown) => JSON.stringify(s).split('fee:sundance-2027:shorts').length - 1;
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await advance(page, 'month');
  await saveAndExit(page);
  const after = await readSavedState(page);
  expect(results(after)).toBe(results(done));
  expect(fees(after)).toBe(fees(done));
  expect(mine(after).history.length).toBeGreaterThanOrEqual(mine(done).history.length);
  expect(JSON.stringify(mine(after)).match(/"tp_\d+"/g)?.length ?? 0).toBeGreaterThan(0);
  expect(errors).toEqual([]);
});
