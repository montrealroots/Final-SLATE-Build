// Journey E of the gameplay-connectivity pass (November 10, 2026): actions the game refuses, each with its reason, and
// the recovery after it. Several refusals already have journeys of their own:
// - too little money: careers.spec.ts, "stop motion: refused for lack of money";
// - a performer booked elsewhere: careers.spec.ts, "an offer to a performer booked elsewhere is turned down";
// - data or a save that fails to load: failures.spec.ts.
// This one adds what had none in a browser:
// - a licensed song without a rights holder;
// - delivery asked for before the work is done;
// - release dates the schedule can't have, then fixed and kept after a reload.
// Labelled fixture: the series released here is marked delivered in the save (as in awards.spec.ts), because making
// one is journey B's work (release-schedule.spec.ts). Everything refused or recovered is pressed in the browser.
// It runs at desktop width, at phone width (Chromium) and on the iPhone 15 Pro Max profile (WebKit): emulation, not devices.
import type { Locator } from '@playwright/test';
import { hashString } from '../src/engine/rng';
import { expect, test, type Page } from './test';
import { addScene, nav, newProject, quickLife, readSavedState, saveAndExit, section } from './helpers';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.use({ actionTimeout: 20_000 });
type State = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Edit the saved game in place (as the save format stores it, with its checksum), then reopen it. */
async function editSave(page: Page, fn: (state: State) => void): Promise<void> {
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  fn(state);
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

const alert = (page: Page): Locator => page.getByRole('alert').first();

test('journey E: refused with a reason, then recovered: a song without its rights, delivery before the work, impossible release dates', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and one WebKit iPhone.');
  await quickLife(page, 'gb-london', '2026-09-01');
  await newProject(page, { title: 'Grey Water', format: 'Series', episodes: '3', runtime: '60' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Maya');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Harbour', chars: ['Maya'], minutes: '20', episodeButton: 'Add Scene To Episode 1' });

  // A licensed song needs its rights holder: refused without one, added once it is named.
  await section(page, 'Production');
  const songs = page.getByRole('region', { name: 'Songs' });
  await songs.getByLabel('Song Title').fill('Low Tide');
  await songs.getByLabel('Where It Comes From').selectOption({ label: 'An Existing Song, Licensed' });
  await songs.getByLabel('Music By').fill('Ada Brook');
  await songs.getByLabel('Lyrics By').fill('Ada Brook');
  await songs.getByRole('button', { name: 'Add Song' }).click();
  await expect(alert(page)).toContainText('Name who holds the rights you are licensing it from.');
  await expect(songs.getByRole('listitem', { name: 'Song: Low Tide' })).toHaveCount(0);
  await songs.getByLabel('Rights Holder').fill('Tidewater Music');
  await songs.getByRole('button', { name: 'Add Song' }).click();
  await expect(songs.getByRole('listitem', { name: 'Song: Low Tide' })).toBeVisible();

  // Delivery before the work is done: Lock Picture is refused, and the page says what is missing.
  await section(page, 'Edit');
  await expect(page.getByRole('button', { name: 'Lock Picture', exact: true })).toBeDisabled();
  await expect(page.getByText(/^Before you lock: /)).toBeVisible();
  await expect(page.getByText('Lock picture first.')).toBeVisible();
  await page.screenshot({ path: `test-results/journey-e-${info.project.name}-01-not-ready.png`, fullPage: true });

  // Labelled fixture: the series is delivered (made in full by journey B), so its release can be planned.
  await editSave(page, (s) => {
    const p = s.projects.find((x: State) => x.title === 'Grey Water');
    p.delivered = { at: s.now - 86_400_000, runtimeMin: 60 };
    p.phase = 'delivered';
  });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Grey Water' }).click();
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Streaming' });
  await page.getByLabel('Territory Code').fill('GB');
  await page.getByLabel('Episode Schedule').selectOption({ label: 'Weekly' });

  // A release date in the past.
  await page.getByLabel('Release Date').fill('2026-08-01');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await expect(alert(page)).toContainText('Choose a release date from today onward.');
  // An episode before the one it follows is advice, not a refusal (November 10, 2026: broadcasters air out of story order).
  await page.getByLabel('Release Date').fill('2026-10-01');
  await page.getByLabel('Episode 3', { exact: true }).fill('2026-10-02');
  await expect(page.getByText(/Episode 3 would come out before episode 2: viewers meet them out of story order/)).toBeVisible();
  // An episode before the release date itself is refused: the release date is the first episode's day.
  await page.getByLabel('Episode 3', { exact: true }).fill('2026-09-30');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await expect(alert(page)).toContainText('The release date is the day its earliest episode comes out.');
  expect((await readSavedState(page)).projects.find((x: State) => x.title === 'Grey Water').releases).toEqual([]); // nothing was planned
  // Corrected: planned.
  await page.getByLabel('Episode 3', { exact: true }).fill('2026-10-22');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  await expect(history).toContainText('Streaming in GB on October 1, 2026');

  // A change that moves an episode before today is refused at review; nothing changes.
  await history.getByText(/^Episode Dates: /).click();
  await history.getByRole('button', { name: 'Change Episode Dates' }).click();
  await page.getByLabel('New Date For Episode 2').fill('2026-08-15');
  await page.getByRole('button', { name: 'Review The Change' }).click();
  await expect(alert(page)).toContainText('Episode 2 can\'t come out before today.');
  await expect(page.getByRole('dialog', { name: 'Change These Episode Dates?' })).toHaveCount(0);
  // Recovered: a later date, reviewed and confirmed.
  await page.getByLabel('New Date For Episode 2').fill('2026-10-15');
  await page.getByRole('button', { name: 'Review The Change' }).click();
  const confirm = page.getByRole('dialog', { name: 'Change These Episode Dates?' });
  await expect(confirm).toContainText('Episode 2 moves from October 8, 2026 to October 15, 2026.');
  await page.screenshot({ path: `test-results/journey-e-${info.project.name}-02-review.png`, fullPage: true });
  await confirm.getByRole('button', { name: 'Confirm The New Dates' }).click();
  await expect(history).toContainText('Episode 2: October 15, 2026, to come');

  // Kept after a reload.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Grey Water' }).click();
  await section(page, 'Release');
  await history.getByText(/^Episode Dates: /).click();
  await expect(history).toContainText('Episode 2: October 15, 2026, to come');
  await expect(history).toContainText('Episode 3: October 22, 2026, to come');
  await page.screenshot({ path: `test-results/journey-e-${info.project.name}-03-reloaded.png`, fullPage: true });
});
