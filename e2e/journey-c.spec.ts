// Journey C of the gameplay-connectivity pass (November 10, 2026), extended after #59 through the whole Original Song
// loop, through visible controls only:
//
// - songs made in the Production tab, each put in a scene:
//   - one commissioned from a songwriter and a lyricist, performed on screen;
//   - one licensed, in the background;
//   - three you write: over the end credits and in the background;
// - the film produced, so each song's writing, recording and clearance is done as production work;
// - after picture lock, a Distribution Cut that plays another song in place of the licensed one;
// - delivered; a distributor's theatrical offer accepted, and the film released in cinemas on the contract's day;
// - the Oscars' Original Song:
//   - each song written for the film entered on its own, to its own writers, never the score's composer;
//   - the licensed song refused; a fourth song refused by the Academy's limit of three from one film;
//   - judged: at most two songs from one film nominated;
// - Save And Exit and Continue: the entries, their results and what each was entered with, as they were.
//
// Nothing is written into the save. The world seed is pinned (helpers.ts pinSeed), chosen once so that a distributor
// offers a theatrical release; a different seed can bring no theatrical offer, and the journey says so if it does.
import type { Locator } from '@playwright/test';
import { expect, test, type Page } from './test';
import {
  addScene, advance, approveDesigns, askLicence, castRoles, licenseSong, nav, newProject, pinSeed, pressSaveAndExit, quickLife, readSavedState, saveAndApprove, section, staffEveryDepartment,
} from './helpers';

test.use({ actionTimeout: 20_000 });
const shot = (page: Page, name: string) => page.screenshot({ path: `test-results/journey-c-${name}.png`, fullPage: true });

test('journey C: songs written, recorded and cleared in production, placed in scenes and a version, released in cinemas, entered, judged and kept after a reload', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One full production, at desktop width.');
  test.setTimeout(1_200_000);
  await quickLife(page, 'us-los-angeles', '2026-01-05');
  await pinSeed(page, Number(process.env.SONG_SEED ?? 8)); // seeds 5 to 7 brought no theatrical offer for this film
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
  await make('Ember', 'Write It Yourself');
  await make('Tidewater', 'Write It Yourself');
  const use = async (t: string, scene: RegExp, how: string) => {
    await song(t).getByLabel(`Scene For ${t}`).selectOption({ label: (await song(t).getByLabel(`Scene For ${t}`).locator('option').allInnerTexts()).find((o) => scene.test(o))! });
    await song(t).getByLabel('How It Plays').selectOption({ label: how });
    await song(t).getByRole('button', { name: `Use ${t} In This Scene` }).click();
  };
  await use('Salt Water', /Ferry/, 'Performed On Screen');
  await use('Harbour Lights', /Pier/, 'In The Background');
  await use('Lantern', /Pier/, 'Over The End Credits');
  await use('Ember', /Ferry/, 'In The Background');
  await use('Tidewater', /Pier/, 'In The Background');
  await song('Salt Water').getByRole('checkbox', { name: 'Lena Performs Salt Water' }).check();
  await saveAndApprove(page);
  // The licensed song is asked of both its holders now, for what this film will need (the v4 package, 03); the answer
  // comes while the film is made, and is agreed before delivery.
  // Labelled fixture: the pinned seed's theatrical offer goes to the US, Great Britain, France and Canada.
  const licensed = ['Festivals', 'Cinemas', 'Digital Sale And Rental'];
  await askLicence(page, 'Harbour Lights', licensed, 'US, GB, FR, CA');

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
  // Its holders answered while the film was made: the licence is agreed, or asked again until it can be.
  await licenseSong(page, 'Night Ferry', 'Harbour Lights', licensed, 'US, GB, FR, CA');
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

  const composer = (await credits.locator('tr', { hasText: /^Composer/ }).first().locator('td').nth(1).innerText()).trim();

  // A distributor's theatrical offer, accepted; the film opens in cinemas on the contract's day.
  for (let i = 0; i < 3 && !(await page.getByRole('button', { name: 'Accept Offer' }).count()); i++) { await advance(page, 'week'); await nav(page, 'Projects'); await page.getByRole('button', { name: 'Night Ferry' }).click(); await section(page, 'Release'); }
  const offers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Distribution Offers' }) }).locator('li');
  const theatrical = offers.filter({ hasText: /Theatrical release in .*United States/ });
  expect(await theatrical.count(), `offers for this seed: ${(await offers.allInnerTexts()).join(' | ')}`).toBeGreaterThan(0);
  await theatrical.first().getByRole('button', { name: 'Accept Offer' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  await expect(history).toContainText('Theatrical in US');
  for (let i = 0; i < 8 && !(await history.getByText('Released', { exact: true }).count()); i++) { await advance(page, 'month'); await nav(page, 'Projects'); await page.getByRole('button', { name: 'Night Ferry' }).click(); await section(page, 'Release'); }
  await expect(history.getByText('Released', { exact: true })).toBeVisible();

  // The Oscars' Original Song: one entry per song written for the film, each to its own writers; never the licensed one.
  const s0 = await readSavedState(page);
  const oscars = s0.editions.find((e: { id: string }) => e.id === 'oscars-2027');
  for (let i = 0; i < 12 && (await readSavedState(page)).now < oscars.submissionOpens; i++) await advance(page, 'month');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Ferry' }).click();
  await section(page, 'Festivals And Awards');
  await page.getByRole('button', { name: oscars.label, exact: true }).first().click();
  const categories = page.getByRole('region', { name: /^(Categories|Sections)$/ });
  await categories.getByLabel('Project').selectOption({ label: 'Night Ferry' });
  await categories.getByLabel('Show').selectOption({ label: 'Every Category' });
  const row = categories.locator('li').filter({ has: page.locator('strong', { hasText: /^Music \(Original Song\)$/ }) });
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  const enter = async (title: string, credited: string) => {
    await row.getByRole('button', { name: 'Prepare Submission' }).click();
    await dialog.getByLabel('Song To Enter').selectOption({ label: `"${title}"` });
    await expect(dialog.getByText(`Credited for this entry: ${credited}.`)).toBeVisible();
    await expect(dialog).not.toContainText(composer); // the score's composer is never credited for a song
    await dialog.getByRole('button', { name: 'Submit Entry' }).click();
    await expect(dialog).toBeHidden();
  };
  // The licensed song is refused before anything is entered.
  await row.getByRole('button', { name: 'Prepare Submission' }).click();
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Harbour Lights"' });
  await expect(dialog.getByText('"Harbour Lights" is licensed; an original song award takes a song written for the work.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Submit Entry' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await enter('Salt Water', `${writers.trim()}, ${lyricist.trim()}`);
  await enter('Lantern', 'Nia Halvorsen-Mbeki');
  await enter('Ember', 'Nia Halvorsen-Mbeki');
  // A fourth song from the same film: refused by the Academy's limit of three.
  await row.getByRole('button', { name: 'Prepare Submission' }).click();
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Tidewater"' });
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(page.getByRole('alert').filter({ hasText: /takes at most 3 songs from one work in this category/ }).first()).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  const yours = () => page.locator('section', { hasText: 'Your Entries' }).last().locator('li', { hasText: 'Music (Original Song)' });
  await expect(yours()).toHaveCount(3);
  await shot(page, '02-song-entries');

  // Judged: each song's own result; at most two from one film nominated.
  const statuses = async () => (await yours().locator('.chip').allInnerTexts()).map((t) => t.trim());
  for (let i = 0; i < 6 && (await statuses()).some((t) => ['Submitted', 'Accepted For Consideration'].includes(t)); i++) {
    await advance(page, 'month');
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Night Ferry' }).click();
    await section(page, 'Festivals And Awards');
    await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: oscars.label }).first().click();
  }
  const nominations = await statuses();
  expect(nominations.every((t) => ['Nominated', 'Not Nominated'].includes(t)), nominations.join(', ')).toBe(true);
  expect(nominations.filter((t) => t === 'Nominated').length).toBeLessThanOrEqual(2);
  // A nominated song waits for the ceremony; each then has its own result.
  for (let i = 0; i < 3 && (await statuses()).includes('Nominated'); i++) {
    await advance(page, 'month');
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Night Ferry' }).click();
    await section(page, 'Festivals And Awards');
    await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: oscars.label }).first().click();
  }
  const judged = await statuses();
  expect(judged.every((t) => ['Not Nominated', 'Winner', 'Did Not Win'].includes(t)), judged.join(', ')).toBe(true);
  expect(judged.filter((t) => t !== 'Not Nominated').length).toBe(nominations.filter((t) => t === 'Nominated').length);
  expect(judged.filter((t) => t === 'Winner').length).toBeLessThanOrEqual(1);
  const entered = (await readSavedState(page)).editions.find((e: { id: string }) => e.id === 'oscars-2027').entries.filter((e: { categoryId: string }) => e.categoryId === 'song');
  expect(entered.map((e: { snapshot: { song: { title: string; writers: string[] } } }) => `${e.snapshot.song.title}:${e.snapshot.song.writers.join('+')}`).sort()).toEqual([
    'Ember:Nia Halvorsen-Mbeki', 'Lantern:Nia Halvorsen-Mbeki', `Salt Water:${writers.trim()}+${lyricist.trim()}`,
  ]);
  await shot(page, '03-song-results');

  // Saved, left and continued: the results and what each was entered with are kept.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Ferry' }).click();
  await section(page, 'Festivals And Awards');
  await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: oscars.label }).first().click();
  expect(await statuses()).toEqual(judged);
  const after = (await readSavedState(page)).editions.find((e: { id: string }) => e.id === 'oscars-2027').entries.filter((e: { categoryId: string }) => e.categoryId === 'song');
  expect(after.map((e: { snapshot: unknown }) => e.snapshot)).toEqual(entered.map((e: { snapshot: unknown }) => e.snapshot));
});
