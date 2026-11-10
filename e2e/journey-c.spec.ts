// Journey C of the gameplay-connectivity pass (November 10, 2026), through visible controls only:
//
// - three songs made in the Production tab, each put in a scene:
//   - one commissioned from a songwriter and a lyricist, performed on screen;
//   - one licensed, in the background;
//   - one you write, over the end credits;
// - the film produced, so each song's writing, recording and clearance is done as production work;
// - after picture lock, a Distribution Cut that plays another song in place of the licensed one;
// - delivered, then read on the Oscars' page:
//   - which song an Original Song entry can be;
//   - who is credited for each song;
//   - why the licensed song can't be entered.
//
// The songs' writers are whoever the production hired and you. Nothing is written into the save. The world seed is
// pinned (helpers.ts pinSeed), chosen once.
import type { Locator } from '@playwright/test';
import { expect, test, type Page } from './test';
import {
  addScene, advance, approveDesigns, castRoles, nav, newProject, pinSeed, quickLife, readSavedState, saveAndApprove, section, staffEveryDepartment,
} from './helpers';

test.use({ actionTimeout: 20_000 });
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/journey-c-${name}.png`, fullPage: true });

test('journey C: songs written, recorded and cleared in production, placed in scenes and a version; their eligibility and credited writers', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One full production, at desktop width.');
  test.setTimeout(1_200_000);
  await quickLife(page, 'us-los-angeles', '2026-01-05');
  await pinSeed(page, 5);
  await newProject(page, { title: 'Night Ferry', format: 'Feature Film', runtime: '90' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Lena');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Ferry', chars: ['Lena'], minutes: '45' });
  await addScene(page, { index: 1, place: 'Pier', chars: ['Lena'], minutes: '45' });

  await section(page, 'Production');
  const songs = page.getByRole('region', { name: 'Songs' });
  const song = (t: string) => songs.getByRole('listitem', { name: `Song: ${t}` });
  const make = async (title: string, source: string, extra: (s: Locator) => Promise<void> = async () => {}) => {
    await songs.getByLabel('Song Title').fill(title);
    await songs.getByLabel('Where It Comes From').selectOption({ label: source });
    await extra(songs);
    await songs.getByRole('button', { name: 'Add Song' }).click();
    await expect(song(title)).toBeVisible();
  };
  await make('Salt Water', 'Commission It From A Songwriter', async (s) => { await s.getByLabel('Lyrics').selectOption({ label: 'Commissioned From A Lyricist' }); });
  await make('Harbour Lights', 'An Existing Song, Licensed', async (s) => { await s.getByLabel('Music By').fill('Ada Brook'); await s.getByLabel('Lyrics By').fill('Ada Brook'); await s.getByLabel('Rights Holder').fill('Tidewater Music'); });
  // The form keeps the last lyrics choice; the work it describes says who writes the words before the song is added.
  await make('Lantern', 'Write It Yourself', async (s) => { await s.getByLabel('Lyrics').selectOption({ label: 'With The Music, By The Same Writer' }); });
  const use = async (t: string, scene: RegExp, how: string) => {
    await song(t).getByLabel(`Scene For ${t}`).selectOption({ label: (await song(t).getByLabel(`Scene For ${t}`).locator('option').allInnerTexts()).find((o) => scene.test(o))! });
    await song(t).getByLabel('How It Plays').selectOption({ label: how });
    await song(t).getByRole('button', { name: `Use ${t} In This Scene` }).click();
  };
  await use('Salt Water', /Ferry/, 'Performed On Screen');
  await use('Harbour Lights', /Pier/, 'In The Background');
  await use('Lantern', /Pier/, 'Over The End Credits');
  await song('Salt Water').getByRole('checkbox', { name: 'Lena Performs Salt Water' }).check();
  await saveAndApprove(page);

  // Cast, crewed and scheduled; then production until picture lock: the songs are written, recorded and cleared as
  // work, by the people hired for it.
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  let locked = false;
  for (let i = 0; i < 70 && !locked; i++) {
    await advance(page, 'week');
    await staffEveryDepartment(page);
    await castRoles(page);
    await approveDesigns(page);
    await section(page, 'Edit');
    const lock = page.getByRole('button', { name: 'Lock Picture', exact: true });
    if (await lock.isVisible() && await lock.isEnabled()) { await lock.click(); locked = true; break; }
    const cut = page.getByRole('button', { name: 'Start Cut Pass' });
    if (await cut.isVisible() && await cut.isEnabled()) await cut.click();
  }
  expect(locked).toBe(true);
  const s = await readSavedState(page);
  const p = s.projects.find((x: { title: string }) => x.title === 'Night Ferry');
  const songTasks = p.tasks.filter((t: { id: string }) => t.id.startsWith('song:'));
  expect(songTasks.length).toBeGreaterThan(0);
  expect(songTasks.every((t: { status: string }) => t.status === 'done')).toBe(true); // written, recorded, cleared

  // A Distribution Cut that plays "Lantern" where the main cut plays the licensed "Harbour Lights".
  const versions = page.getByRole('region', { name: 'Versions' });
  await versions.getByLabel('Version').selectOption({ label: 'Distribution Cut' });
  await versions.getByRole('button', { name: 'Add Version' }).click();
  await versions.getByLabel(/Distribution Cut: .*Pier.*, In Place Of "Harbour Lights"/).selectOption({ label: '"Lantern" Instead' });
  await section(page, 'Production');
  await expect(song('Harbour Lights').locator('span.grow', { hasText: /Pier.*In The Background/ })).toBeVisible(); // the main cut keeps it
  // Delivery waits for the version's conform day and any song work the swap added.
  for (let i = 0; i < 12; i++) {
    await section(page, 'Edit');
    const deliver = page.getByRole('button', { name: 'Deliver Project' });
    if (await deliver.isVisible() && await deliver.isEnabled()) { await deliver.click(); break; }
    await advance(page, 'week');
  }
  await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();
  await section(page, 'Release');
  const credits = page.locator('section.card', { has: page.getByRole('heading', { name: 'Credits' }) });
  await expect(credits).toContainText('Song Music By ("Salt Water")');
  await expect(credits).toContainText('Song Lyrics By ("Salt Water")');
  await expect(credits).toContainText('Song Written By ("Lantern")');
  const writers = await credits.locator('tr', { hasText: 'Song Music By ("Salt Water")' }).locator('td').nth(1).innerText();
  const lyricist = await credits.locator('tr', { hasText: 'Song Lyrics By ("Salt Water")' }).locator('td').nth(1).innerText();
  await shot(page, '01-credits');

  // The Oscars' Original Song: one entry per song written for the film, each to its own writers; never the licensed one.
  const label = (await readSavedState(page)).editions.find((e: { id: string }) => e.id === 'oscars-2027').label as string;
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Ferry' }).click();
  await section(page, 'Festivals And Awards');
  await page.getByRole('button', { name: label, exact: true }).first().click();
  const categories = page.getByRole('region', { name: /^(Categories|Sections)$/ });
  await categories.getByLabel('Project').selectOption({ label: 'Night Ferry' });
  await categories.getByLabel('Show').selectOption({ label: 'Every Category' });
  const row = categories.locator('li').filter({ has: page.locator('strong', { hasText: /^Music \(Original Song\)$/ }) });
  await row.getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Salt Water"' });
  await expect(dialog.getByText(`Credited for this entry: ${writers.trim()}, ${lyricist.trim()}.`)).toBeVisible();
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Lantern"' });
  await expect(dialog.getByText(/Credited for this entry: Nia Halvorsen-Mbeki\./)).toBeVisible();
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Harbour Lights"' });
  await expect(dialog.getByText('"Harbour Lights" is licensed; an original song award takes a song written for the work.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Submit Entry' })).toBeDisabled();
  await shot(page, '02-song-entry');
});
