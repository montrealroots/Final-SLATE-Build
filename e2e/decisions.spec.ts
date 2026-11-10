// Short journeys for decisions that had only engine evidence until November 10, 2026 (docs/input-audit/CONTROLS.csv):
// each control is used in the browser, its consequence is read on the screen, a refusal or a limit is met and recovered
// from, and the choice is read back after the game is saved and opened again. These are targeted interaction journeys,
// not full playthroughs: a journey stops once the decision has done what it does. Run at desktop and phone width.
import type { Locator, Page } from '@playwright/test';
import { expect, test } from './test';
import { hashString } from '../src/engine/rng';
import { addScene, advance, nav, newProject, pinSeed, quickLife, readSavedState, saveAndApprove, saveAndExit, section, writePitch } from './helpers';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.use({ actionTimeout: 20_000 });
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/decisions-${test.info().project.name}-${name}.png`, fullPage: true });
const card = (page: Page, heading: string): Locator => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const project = (s: { projects: { title: string }[] }, title: string) => s.projects.find((x) => x.title === title) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
/** Edit the saved game in place, with its checksum, then reopen it (as journey-e.spec.ts does): for labelled fixtures only. */
async function editSave(page: Page, fn: (state: any) => void): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  fn(state);
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}
async function reopen(page: Page, title: string, tab: string): Promise<void> {
  await saveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: title }).click();
  await section(page, tab);
}
/** The paid days the casting window quotes for a part ("About N paid days."). */
async function paidDays(page: Page, part: string): Promise<number> {
  await section(page, 'Cast');
  await page.locator('li', { hasText: part }).getByRole('button', { name: 'Find Performers' }).first().click();
  const d = page.getByRole('dialog');
  const n = Number((await d.getByText(/About \d+ paid days?\./).first().textContent())!.match(/About (\d+) paid/)![1]);
  await d.getByRole('button', { name: 'Close', exact: true }).click();
  return n;
}

test('work schedule and staffing rates: Saturdays, a bank holiday, rehearsal, and what an offer below the asking rate gets', async ({ page }) => {
  test.setTimeout(300_000);
  await quickLife(page, 'gb-london', '2026-04-27');
  await pinSeed(page, 17);
  await newProject(page, { title: 'Long Weekend', format: 'Short Film', runtime: '10' });
  await section(page, 'Characters');
  for (const n of ['Ada', 'Ben', 'Cy']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  const places = ['Bakery', 'Canal', 'Market', 'Church Hall', 'Allotment', 'Bus Depot', 'Library', 'Lido'];
  for (const [i, place] of places.entries()) await addScene(page, { index: i, place, chars: ['Ada', 'Ben', 'Cy'], minutes: '1' });
  await saveAndApprove(page);

  // Rehearsal books performers longer: the casting window says so before an offer is made. The field stops at 20.
  await section(page, 'Schedule');
  const plan = card(page, 'Plan');
  await expect(plan.getByLabel('Rehearsal Days')).toHaveValue('3');
  const before = await paidDays(page, 'Ada');
  await section(page, 'Schedule');
  await plan.getByLabel('Rehearsal Days').fill('25');
  await plan.getByLabel('Rehearsal Days').blur();
  await expect(plan.getByLabel('Rehearsal Days')).toHaveValue('20');
  await plan.getByLabel('Rehearsal Days').fill('11');
  await plan.getByLabel('Rehearsal Days').blur();
  expect(await paidDays(page, 'Ada')).toBe(before + 4); // half the rehearsal days, rounded up: 6 instead of 2

  // Day rates. Ada is offered half what the first free performer asks; Ben 80%; Cy four times, which is refused at once.
  const offer = async (part: string, ratio: number, nth: number): Promise<{ name: string; ask: number }> => {
    await page.locator('li', { hasText: part }).getByRole('button', { name: 'Find Performers' }).first().click();
    const d = page.getByRole('dialog');
    const first = d.getByRole('listitem').nth(nth); // a different performer each time: one can't play two parts in a scene
    const name = (await first.locator('strong').first().textContent())!;
    const ask = Number((await first.getByText(/Asks \$[\d,]+ a day\./).textContent())!.match(/Asks \$([\d,]+)/)![1].replace(/,/g, ''));
    await first.getByLabel(`Day Rate For ${name}`).fill(String(Math.round(ask * ratio)));
    await first.getByRole('button', { name: 'Make Offer' }).click();
    return { name, ask };
  };
  const ada = await offer('Ada', 0.5, 0);
  const ben = await offer('Ben', 0.8, 1);
  const cy = await offer('Cy', 4, 2);
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('alert')).toHaveText('That offer is far above any reasonable rate for this role.');
  await dialog.getByRole('listitem').nth(2).getByLabel(`Day Rate For ${cy.name}`).fill(String(cy.ask));
  await dialog.getByRole('listitem').nth(2).getByRole('button', { name: 'Make Offer' }).click();
  await expect(dialog).toHaveCount(0);
  const hires = card(page, 'Offers And Contracts');
  for (const x of [ada, ben, cy]) await expect(hires.getByRole('row', { name: new RegExp(x.name) })).toContainText('Offer Sent');
  for (let i = 0; i < 4 && await hires.getByText('Offer Sent').count(); i++) { await advance(page, 'next-day'); await section(page, 'Cast'); }
  await expect(hires.getByRole('row', { name: new RegExp(ada.name) })).toContainText('Declined');
  await expect(hires.getByRole('row', { name: new RegExp(ben.name) })).toContainText(`Asks $${ben.ask.toLocaleString('en-US')} a day`);
  await expect(hires.getByRole('row', { name: new RegExp(cy.name) })).toContainText('Accepted');
  // The counteroffer, accepted: Ben is hired at what was asked.
  await hires.getByRole('row', { name: new RegExp(ben.name) }).getByRole('button', { name: 'Accept Counteroffer' }).click();
  await expect(hires.getByRole('row', { name: new RegExp(ben.name) })).toContainText('Accepted');
  await expect(hires.getByRole('row', { name: new RegExp(ben.name) })).toContainText(`$${ben.ask.toLocaleString('en-US')} a day`);
  await shot(page, '01-offers');

  // Six-day weeks and holiday work, each read in the shoot days it builds. August 31, 2026 is the Summer Bank Holiday;
  // the shoot follows about two weeks of preparation, so a start on August 17 puts the bank holiday inside the shoot.
  await section(page, 'Schedule');
  await plan.getByLabel('Production Start').fill('2026-08-17');
  const days = card(page, 'Shoot Days');
  const dates = async () => (await days.locator('li strong').allTextContents());
  const build = () => plan.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await build();
  await expect(days.locator('li strong').first()).toContainText('2026');
  expect((await dates()).filter((d) => d.startsWith('Saturday'))).toEqual([]);
  expect(await dates()).not.toContain('Monday, August 31, 2026');
  await plan.getByRole('checkbox', { name: 'Six-Day Weeks' }).check();
  await build();
  await expect(days.getByText(/^Saturday, /).first()).toBeVisible();
  const six = await dates();
  expect(six).not.toContain('Monday, August 31, 2026');
  const keys = six.map((d) => new Date(`${d.replace(/^\w+, /, '')} 12:00 UTC`).toISOString().slice(0, 10));
  expect(keys[0] < '2026-08-31' && keys[keys.length - 1] > '2026-08-31').toBe(true); // the shoot runs either side of it
  await plan.getByRole('checkbox', { name: 'Work On Public Holidays' }).check();
  await build();
  await expect(days.getByText('Monday, August 31, 2026', { exact: true })).toBeVisible();
  await shot(page, '02-schedule');

  // Saved and opened again: every choice is as it was left.
  await reopen(page, 'Long Weekend', 'Schedule');
  await expect(plan.getByLabel('Rehearsal Days')).toHaveValue('11');
  await expect(plan.getByRole('checkbox', { name: 'Six-Day Weeks' })).toBeChecked();
  await expect(plan.getByRole('checkbox', { name: 'Work On Public Holidays' })).toBeChecked();
  await expect(card(page, 'Shoot Days').getByText('Monday, August 31, 2026', { exact: true })).toBeVisible();
  const s = project(await readSavedState(page), 'Long Weekend');
  expect([s.schedule.rehearsalDays, s.schedule.sixDayWeeks, s.schedule.workHolidays]).toEqual([11, true, true]);
  expect((await readSavedState(page)).log.map((l: { text: string }) => l.text)).toContain(`${ada.name} turned down the role of Ada. The rate was too low.`);
});

test('release settings: several episodes on the premiere, one country and then another, a code that is no country', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-09-01');
  await newProject(page, { title: 'Grey Water', format: 'Series', episodes: '4', runtime: '30' });
  // Labelled fixture: the series is delivered in the save (making one is rolling-delivery.spec.ts's and journey B's work).
  // Every release choice below is made in the browser.
  await editSave(page, (s) => { const p = project(s, 'Grey Water'); p.delivered = { at: s.now - 86_400_000, runtimeMin: 120 }; p.phase = 'delivered'; });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Grey Water' }).click();
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Streaming' });
  await page.getByLabel('Release Date').fill('2026-10-01');
  await page.getByLabel('Episode Schedule').selectOption({ label: 'Several On The Premiere, Then Weekly' });
  await page.getByLabel('Episodes On The Premiere').fill('3');
  for (const n of [2, 3]) await expect(page.getByLabel(`Episode ${n}`, { exact: true })).toHaveValue('2026-10-01');
  await expect(page.getByLabel('Episode 4', { exact: true })).toHaveValue('2026-10-08');
  // A code that is no country is refused, and nothing is planned; a real one is.
  await page.getByLabel('Territory Code').fill('XX');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await expect(page.getByRole('alert').first()).toHaveText("Choose a country by its two-letter code, such as GB or US. XX isn't one.");
  await page.getByLabel('Territory Code').fill('gb'); // typed lower case, kept as the code
  await page.getByRole('button', { name: 'Plan Release' }).click();
  const history = card(page, 'Release History');
  await expect(history).toContainText('Streaming in GB on October 1, 2026');
  // The same season in Ireland, weekly from the same day: a second release of its own.
  await page.getByLabel('Territory Code').fill('IE');
  await page.getByLabel('Episode Schedule').selectOption({ label: 'Weekly' });
  await expect(page.getByLabel('Episode 4', { exact: true })).toHaveValue('2026-10-22');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await expect(history).toContainText('Streaming in IE on October 1, 2026');
  await shot(page, '03-releases');

  await reopen(page, 'Grey Water', 'Release');
  await expect(history).toContainText('Streaming in GB on October 1, 2026');
  await expect(history).toContainText('Streaming in IE on October 1, 2026');
  const r = project(await readSavedState(page), 'Grey Water').releases.map((x: { territories: string[]; episodes: { date: string }[] }) => [x.territories.join(), x.episodes.map((e) => e.date).join()]);
  expect(r).toEqual([['GB', '2026-10-01,2026-10-01,2026-10-01,2026-10-08'], ['IE', '2026-10-01,2026-10-08,2026-10-15,2026-10-22']]);
});

/** Start a feature through the New Script form, with genres in the order given (the first added is primary). */
async function feature(page: Page, title: string, genres: string[], primary?: string, language?: string): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill(title);
  await page.getByLabel('Format').selectOption({ label: 'Feature Film' });
  await page.getByLabel(/Target (Runtime In Minutes|Minutes Per Episode)/).fill('90');
  for (const g of genres) {
    await page.getByRole('searchbox', { name: 'Search Genres' }).fill(g.toLowerCase());
    await page.getByRole('button', { name: `Add ${g}`, exact: true }).click();
  }
  if (primary) await page.locator('li', { hasText: primary }).getByRole('button', { name: 'Make Primary' }).click();
  if (language) {
    await page.getByLabel('Add A Dialogue Language').selectOption({ label: language });
    await page.getByRole('button', { name: 'Add Language' }).click();
  }
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}
const globes = (page: Page) => page.locator('li', { has: page.getByRole('button', { name: '84th Golden Globe Awards', exact: true }) });
const COMEDY = 'Comedy and musical work competes in a separate category.';

test('genre emphasis and dialogue languages: which Golden Globe a feature enters, and who needs coaching for a part', async ({ page }) => {
  test.setTimeout(240_000);
  await quickLife(page, 'gb-london', '2026-09-01');
  // The same two genres, the emphasis the other way round. A primary comedy competes as comedy, so the drama picture
  // category, the first the Golden Globes list, turns it away with the reason; a primary drama isn't turned away for it.
  await feature(page, 'Laughing Gas', ['Comedy', 'Drama']);
  await section(page, 'Festivals And Awards');
  await expect(globes(page)).toContainText(COMEDY);
  await feature(page, 'Cold Ward', ['Comedy', 'Drama'], 'Drama', 'French');
  await section(page, 'Festivals And Awards');
  await expect(globes(page)).toBeVisible();
  await expect(globes(page)).not.toContainText(COMEDY);
  // Declared otherwise in the Story panel, it competes as comedy whatever its genres.
  await section(page, 'Script');
  await page.getByLabel('Competes As').selectOption({ label: 'Comedy Or Musical' });
  await section(page, 'Festivals And Awards');
  await expect(globes(page)).toContainText(COMEDY);
  await shot(page, '04-genres');

  // Dialogue in English and French. Maya speaks French, Ben English; you play both and speak English, Swahili and some
  // Norwegian, so Maya's part needs coaching and Ben's doesn't.
  await section(page, 'Characters');
  for (const n of ['Maya', 'Ben']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  const maya = page.getByRole('article', { name: 'Maya' });
  await maya.getByRole('button', { name: 'Edit Character' }).click();
  await expect(maya.getByLabel('Speaks').locator('option')).toHaveText(['English', 'French']);
  await maya.getByLabel('Speaks').selectOption({ label: 'French' });
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Ward', chars: ['Maya'], minutes: '45' });
  await addScene(page, { index: 1, place: 'Car Park', chars: ['Ben'], minutes: '45' });
  await saveAndApprove(page);
  await section(page, 'Cast');
  for (const n of ['Maya', 'Ben']) await page.locator('li', { hasText: n }).getByRole('button', { name: 'Cast Yourself' }).first().click();
  const coaching = page.locator('.callout-warning', { hasText: 'coaching in a dialogue language' });
  await expect(coaching).toHaveText('Maya needs coaching in a dialogue language. Hire a dialect and language coach in Crew.');
  await shot(page, '05-coaching');

  await reopen(page, 'Cold Ward', 'Cast');
  await expect(coaching).toHaveText('Maya needs coaching in a dialogue language. Hire a dialect and language coach in Crew.');
  const s = await readSavedState(page);
  const cold = project(s, 'Cold Ward'), gas = project(s, 'Laughing Gas');
  expect([cold.axes.genres.find((g: { emphasis: string }) => g.emphasis === 'primary').id, gas.axes.genres.find((g: { emphasis: string }) => g.emphasis === 'primary').id]).toEqual(['drama', 'comedy']);
  expect([cold.axes.dialogueLanguages, cold.axes.register]).toEqual([['en', 'fr'], 'comedy']);
});

test('what a finished film kept goes into the next: Your Earnings, refused with nothing kept, accepted and moved between budgets', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-09-01');
  // Two projects: the first will be the finished one. A new one written and approved through the screens.
  await newProject(page, { title: 'Old Reel', format: 'Short Film', runtime: '5' });
  await nav(page, 'Projects');
  await newProject(page, { title: 'New Reel', format: 'Short Film', runtime: '5' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Ada'], minutes: '5' });
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  // Nothing finished yet: Your Earnings says why it can't be used.
  await section(page, 'Budget');
  const raise = card(page, 'Raise Money');
  const earnings = raise.getByRole('listitem').filter({ hasText: 'Your Earnings' });
  await expect(earnings.getByRole('button', { name: 'Put In Your Earnings' })).toBeDisabled();
  await expect(earnings).toContainText('Your delivered projects have kept no money yet.');
  // Labelled fixture: Old Reel is finished and kept $50,000 (making a film to delivery is the journeys' work).
  await editSave(page, (s) => { const p = project(s, 'Old Reel'); p.delivered = { at: s.now - 86_400_000, runtimeMin: 5 }; p.phase = 'delivered'; p.quality = { overall: 70, reception: 70, script: 70, direction: 70, craft: 70 }; p.funding.fund = 50_000; });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Reel' }).click();
  await section(page, 'Budget');
  await expect(earnings).toContainText('Your delivered projects keep $50,000.');
  await earnings.getByRole('button', { name: 'Put In Your Earnings' }).click();
  await page.getByRole('button', { name: 'Accept Offer' }).first().click();
  const terms = page.getByRole('dialog', { name: 'Accept These Terms?' });
  await expect(terms).toContainText('Your Earnings'.toLowerCase());
  await terms.getByRole('button', { name: 'Accept $50,000' }).click();
  await expect(card(page, 'Financing').locator('dt', { hasText: /^Received$/ }).locator('xpath=following-sibling::dd[1]')).toHaveText('$50,000');
  await shot(page, '06-earnings');
  // Saved and opened again: the money left Old Reel's budget as a payment into New Reel.
  await reopen(page, 'New Reel', 'Budget');
  await expect(card(page, 'Financing').locator('dt', { hasText: /^Received$/ }).locator('xpath=following-sibling::dd[1]')).toHaveText('$50,000');
  const old = project(await readSavedState(page), 'Old Reel');
  expect(old.obligations.filter((o: { label: string }) => o.label === 'Put Into New Reel').map((o: { settled: number }) => o.settled)).toEqual([50_000]);
});
