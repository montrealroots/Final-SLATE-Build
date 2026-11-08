import { expect, test } from './test';
import { advance, createCharacter, freshStart, nav, readSavedState, section, staffEveryDepartment, secureStartingBacking, pressSaveAndExit, writePitch } from './helpers';

test('live-action short: create, write, cast yourself, staff, shoot, cut, deliver, credits', async ({ page }, info) => {
  await freshStart(page);
  await expect(page.getByText('Your next story starts here.')).toBeVisible();
  // A fresh start has no Continue; New Game, Saved Games and Settings are there.
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0);
  for (const a of ['New Game', 'Saved Games', 'Settings']) await expect(page.getByRole('button', { name: a, exact: true })).toBeVisible();
  await createCharacter(page, {
    name: 'Amaranta Okonkwo-Villaseñor de la Cruz', pronouns: 'She/Her', birthDate: '1994-02-28', birthplace: 'Lagos', heritages: ['Igbo', 'Hispanic Or Latino'], nationalities: ['Nigeria', 'Mexico'],
    customHeritage: 'Afro-Mexican from Costa Chica', mainLanguage: 'English', extraLanguages: ['Spanish', 'Igbo'], start: 'Toronto', startDate: '2026-03-02', startTime: '08:00',
  });
  // Home truthfulness and empty states.
  await expect(page.getByText(/^Monday, March 2, 2026 · /)).toBeVisible();
  await expect(page.getByText(/^8:0\d AM in Toronto, /)).toBeVisible();
  await expect(page.getByText("You haven't started a project yet.")).toBeVisible();
  await expect(page.getByText("You're up to date.")).toBeVisible();
  await expect(page.getByText('You have nothing scheduled today.')).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-home.png`, fullPage: true });

  // New Script.
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('The Last Ferry To Wolfe Island');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('drama');
  await page.getByRole('button', { name: 'Add Drama' }).click();
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('mystery');
  await page.getByRole('button', { name: 'Add Mystery' }).click();
  await expect(page.getByText('Clues And Evidence Trail')).toBeVisible();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'The Last Ferry To Wolfe Island' })).toBeVisible();

  // Characters.
  await section(page, 'Characters');
  for (const n of ['Odile', 'The Ferryman']) {
    await page.getByLabel('Character Name').fill(n);
    await page.getByRole('button', { name: 'Add Character' }).click();
  }
  const odile = page.getByRole('article', { name: 'Odile' });
  await odile.getByRole('button', { name: 'Edit Character' }).click();
  await odile.getByLabel('Role Size').selectOption({ label: 'Lead' });
  await odile.getByRole('checkbox', { name: 'Protagonist' }).check();

  // Script: two scenes and a clue.
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Add Scene' }).click();
  await page.getByRole('button', { name: 'Add Scene' }).click();
  const cards = page.locator('article.scene-card');
  const fillScene = async (i: number, place: string, ext: boolean, who: string[]) => {
    const c = cards.nth(i);
    await c.getByRole('button', { name: 'Edit Scene' }).click();
    if (ext) await c.getByLabel('Interior Or Exterior').selectOption({ label: 'Exterior' });
    await c.getByLabel('Place', { exact: true }).fill(place);
    for (const w of who) await c.getByRole('checkbox', { name: w }).check();
    await c.getByLabel('Objective').fill('Find out who sent the letter.');
    await c.getByLabel('Props').fill('Unsigned letter');
    await c.getByRole('button', { name: 'Close Scene' }).click();
  };
  await fillScene(0, 'Ferry Dock', true, ['Odile', 'The Ferryman']);
  await fillScene(1, 'Wheelhouse', false, ['Odile', 'The Ferryman']);
  await page.getByLabel('What Is Set Up').fill('The ferryman knows the handwriting');
  await page.getByLabel('Kind', { exact: true }).selectOption({ label: 'Clue' });
  await page.getByRole('button', { name: 'Add Setup' }).click();
  await page.getByLabel('Planted In').selectOption({ index: 1 });
  await page.getByLabel('Pays Off In').selectOption({ index: 2 });
  await writePitch(page);
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await expect(page.getByText('Draft 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Approve This Draft' }).click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await secureStartingBacking(page);

  // Cast: Odile is the player; the Ferryman goes to a performer.
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'Odile' }).getByRole('button', { name: 'Cast Yourself' }).click();
  await roles.locator('li', { hasText: 'The Ferryman' }).getByRole('button', { name: 'Find Performers' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();

  // Crew through department proposals.
  const sent = await staffEveryDepartment(page);
  expect(sent).toBeGreaterThan(2);

  // Schedule.
  await advance(page, 'next-event');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await expect(page.getByRole('heading', { name: 'Shoot Days' })).toBeVisible();
  await expect(page.locator('li', { hasText: 'Ferry Dock' }).first()).toBeVisible();
  // Each day's call sheet (SLATE-11-05.03): the call, where, who is called for which scenes, daylight for an exterior.
  const dock = page.locator('section.card', { has: page.getByRole('heading', { name: 'Shoot Days' }) }).locator('li', { hasText: 'Ferry Dock' }).first();
  await dock.getByText('Call Sheet', { exact: true }).click();
  await expect(dock).toContainText('7:00 AM');
  await expect(dock).toContainText('Ferry Dock, exterior');
  await expect(dock).toContainText('You as Odile');
  await expect(dock).toContainText(/Sunrise \d+:\d\d AM, sunset \d+:\d\d PM\./);

  // Let production run; keep staffing and move the edit along.
  for (let i = 0; i < 24; i++) {
    await advance(page, 'week');
    await staffEveryDepartment(page);
    // A performer might decline: offer the role to the next person.
    await section(page, 'Cast');
    const find = page.locator('li', { hasText: 'The Ferryman' }).getByRole('button', { name: 'Find Performers' });
    if (await find.isVisible()) {
      await find.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
    }
    await section(page, 'Edit');
    const deliver = page.getByRole('button', { name: 'Deliver Project' });
    if (await deliver.isVisible() && await deliver.isEnabled()) {
      await deliver.click();
      break;
    }
    const lock = page.getByRole('button', { name: 'Lock Picture' });
    if (await lock.isEnabled()) {
      await lock.click();
      continue;
    }
    const cut = page.getByRole('button', { name: 'Start Cut Pass' });
    if (await cut.isEnabled()) await cut.click();
  }
  await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();

  // Credits: all four professions earned on this project.
  await section(page, 'Release');
  const credits = page.locator('section.card', { hasText: 'Credits' }).first();
  for (const c of ['Written By', 'Directed By', 'Produced By']) await expect(credits.getByText(c, { exact: true })).toBeVisible();
  await expect(credits.getByText('as Odile')).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-release.png`, fullPage: true });

  // Festival submission through the UI, then let the edition run.
  await section(page, 'Festivals And Awards');
  const openRow = page.locator('li', { hasText: /Open To You/ }).first();
  await expect(openRow).toBeVisible();
  await openRow.getByRole('button').first().click();
  // The event page loads on first use; wait for it before counting its actions.
  await expect(page.getByRole('heading', { name: 'When And Where' })).toBeVisible();
  const prepare = page.getByRole('button', { name: 'Prepare Submission' });
  let submitted = false;
  for (let i = 0; i < await prepare.count() && !submitted; i++) {
    await prepare.nth(i).click();
    const submit = page.getByRole('dialog').getByRole('button', { name: 'Submit Entry' });
    if (await submit.isEnabled()) {
      await submit.click();
      submitted = true;
    } else await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  }
  expect(submitted).toBe(true);
  await expect(page.locator('section', { hasText: 'Your Entries' }).getByText('Submitted')).toBeVisible();
  for (let i = 0; i < 8; i++) await advance(page, 'month');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'The Last Ferry To Wolfe Island' }).click();
  await section(page, 'Festivals And Awards');
  const status = await page.locator('section', { hasText: 'Your Entries' }).locator('.chip').first().innerText();
  expect(['Selected', 'Not Selected', 'Won', 'Did Not Win', 'Accepted For Consideration', 'Not Accepted']).toContain(status);
  await page.screenshot({ path: `test-results/${info.project.name}-festival.png`, fullPage: true });

  // Saved state matches and survives reload.
  await pressSaveAndExit(page);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  const saved = await readSavedState(page);
  expect(saved.projects[0].delivered).not.toBeNull();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Profile');
  await expect(page.getByText('The Last Ferry To Wolfe Island').first()).toBeVisible();
});
