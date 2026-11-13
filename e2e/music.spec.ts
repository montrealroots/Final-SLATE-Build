// Licensing an existing song through the Music page (the v4 package, 03; ledger V4-024, V4-026; part of J08): a broad
// request refused, with who said no and the routes left; asked again for less, quoted by both holders and agreed; then
// renewed. Paid once each time, kept after a reload. The world seed is pinned (a labelled fixture) so the holders answer
// the same way every run. The rules are the engine's (tests/music.test.ts).
import { expect, test } from './test';
import { addScene, advance, castRoles, nav, newProject, readSavedState, runToDelivery, saveAndApprove, section, seededLife, staffEveryDepartment } from './helpers';

const SEED = Number(process.env.MUSIC_SEED ?? 3);

test('a song licence refused for the world, asked again for less, agreed, renewed, and paid once each time', async ({ page }) => {
  test.setTimeout(300_000);
  await seededLife(page, 'gb-london', '2026-01-05', SEED);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '4' });
  await section(page, 'Production');
  const songs = page.getByRole('region', { name: 'Songs' });
  await songs.getByLabel('Song Title').fill('Tidewater');
  await songs.getByLabel('Where It Comes From').selectOption({ label: 'An Existing Song, Licensed' });
  await songs.getByLabel('Music By').fill('Ada Brook');
  await songs.getByLabel('Lyrics By').fill('Ada Brook');
  await songs.getByLabel('Rights Holder').fill('Saltmarsh Records');
  await songs.getByRole('button', { name: 'Add Song' }).click();
  const song = songs.getByRole('listitem', { name: 'Song: Tidewater' });
  await song.getByRole('button', { name: 'Use Tidewater In This Scene' }).click();
  await saveAndApprove(page);

  // Asked of both holders for everything, everywhere, for ten years.
  await section(page, 'Music');
  const card = page.getByRole('article', { name: 'Licence For Tidewater' });
  await expect(card).toContainText('No licence stands: delivery waits for one.');
  await card.getByRole('button', { name: 'Ask To License Tidewater' }).click();
  for (const m of ['Cinemas', 'Streaming', 'Television']) await card.getByRole('checkbox', { name: m, exact: true }).check();
  await card.getByRole('checkbox', { name: 'The Whole World' }).check();
  await card.getByLabel('For How Long').selectOption({ label: '10 Years' });
  await expect(card).toContainText(/If both say yes, likely about \$[\d,]+ in all/);
  await card.getByRole('button', { name: 'Ask Both Holders' }).click();
  await expect(card).toContainText('Asked:');
  await advance(page, 'week');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbour Lights' }).first().click();
  await section(page, 'Music');
  await expect(card).toContainText(/Refused: .* said no to festivals, cinemas, streaming, television, digital sale and rental in the whole world for 10 years\./);
  await expect(page.getByRole('region', { name: 'Other Routes For Tidewater' })).toContainText('ask again for less below; replace it with another song or an original on the Production page; put a library track in its place; or leave its scenes without it.');

  // Asked again for less: festivals and digital, here, three years.
  await card.getByRole('button', { name: 'Ask To License Tidewater' }).click();
  await card.getByRole('button', { name: 'Ask Both Holders' }).click();
  await advance(page, 'week');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbour Lights' }).first().click();
  await section(page, 'Music');
  const agree = card.getByRole('button', { name: /^Agree Tidewater For \$[\d,]+$/ });
  await expect(agree).toBeVisible();
  await agree.click();
  await expect(card).toContainText(/Licensed for festivals, digital sale and rental in GB for 3 years, until [A-Z][a-z]+ \d{1,2}, 2029\./);

  // Renewed: three more years from when it runs out, paid once.
  await card.getByRole('button', { name: /^Renew Tidewater For \$[\d,]+$/ }).click();
  await expect(card).toContainText(/until [A-Z][a-z]+ \d{1,2}, 2032\./);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click().catch(() => {});
  await expect.poll(async () => {
    const p = (await readSavedState(page))?.projects?.[0];
    if (!p) return null;
    const keys = p.obligations.flatMap((o: { postings: { key: string }[] }) => o.postings.map((x) => x.key)).filter((k: string) => k.startsWith('licence'));
    return [keys.filter((k: string) => k.startsWith('licence:')).length, keys.filter((k: string) => k.startsWith('licence-renewal:')).length];
  }).toEqual([1, 1]);
});

test('a music brief proposed with its reasons, a cue plan the composer works from, and silence that needs no composer', async ({ page }) => {
  await seededLife(page, 'gb-london', '2026-01-05', SEED);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Low Tide', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Mara'], minutes: '3' });
  await addScene(page, { index: 2, place: 'Harbour', chars: ['Mara'], minutes: '3' });
  await addScene(page, { index: 3, place: 'Lighthouse', chars: ['Mara'], minutes: '3' });
  await saveAndApprove(page);

  await section(page, 'Music');
  const brief = page.locator('section.card', { has: page.getByRole('heading', { name: 'Music Brief' }) });
  await brief.getByRole('button', { name: 'Propose A Brief' }).click();
  // From the project's own words (since November 13, 2026; until then its genre chose the style): the intended experience
  // the journey wrote, "Quiet, then hopeful.", asks for a few players.
  const why = brief.getByRole('list', { name: 'Why This Brief' });
  await expect(why).toContainText('A score, written for this project.');
  await expect(why).toContainText('Its intended experience, "Quiet, then hopeful.", wants a few players close to the characters.');
  await brief.getByLabel('How Much Of It Is Scored').selectOption({ label: 'Moderate: Half Of The Scenes' });
  await brief.getByRole('button', { name: 'Take This Brief' }).click();
  const cues = page.locator('section.card', { has: page.getByRole('heading', { name: 'Cue Plan' }) });
  await expect(cues.getByRole('list', { name: 'Cues' }).getByRole('listitem')).toHaveCount(2); // half of four: the first and the last
  await expect(cues).toContainText(/^Cue Plan[\s\S]*\d+(\.\d)? minutes of score for the composer/);
  await expect(cues.getByRole('list', { name: 'Cues' })).toContainText('1M1');
  // The composer is needed for a score.
  await section(page, 'Crew');
  await expect(page.getByRole('heading', { name: 'Music', level: 2 })).toBeVisible();

  // Silence: no cues, no score, no composer.
  await section(page, 'Music');
  await brief.getByRole('button', { name: 'Change The Brief' }).click();
  await brief.getByLabel('What Music It Has').selectOption({ label: 'Silence' });
  await brief.getByRole('button', { name: 'Take This Brief' }).click();
  await expect(brief).toContainText('Silence.');
  await expect(cues).toContainText('No cues: nothing is scored.');
  await section(page, 'Crew');
  await expect(page.getByRole('heading', { name: 'Music', level: 2 })).toHaveCount(0);
  await expect.poll(async () => (await readSavedState(page))?.projects?.[0]?.music?.brief?.approach).toBe('silence');
});

test('the composer\'s themes wait for you: notes send them back for a round, approval lets the score be written, and the film is delivered', async ({ page }) => {
  test.setTimeout(600_000);
  await seededLife(page, 'gb-london', '2026-01-05', SEED);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '6', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Lighthouse', chars: ['Mara'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Music');
  const brief = page.locator('section.card', { has: page.getByRole('heading', { name: 'Music Brief' }) });
  await brief.getByRole('button', { name: 'Propose A Brief' }).click();
  await expect(brief.getByLabel("Let The Composer's Themes Stand Without My Review")).not.toBeChecked();
  await brief.getByRole('button', { name: 'Take This Brief' }).click();

  await castRoles(page, ['Mara']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  const themes = page.getByRole('region', { name: "The Composer's Themes" });
  const waitFor = async (text: string) => {
    for (let i = 0; i < 40 && !(await themes.filter({ hasText: text }).count()); i++) {
      await advance(page, 'week'); await staffEveryDepartment(page); await castRoles(page);
      await nav(page, 'Projects'); await page.getByRole('button', { name: 'Night Ferry' }).first().click();
      await section(page, 'Edit'); // the score is written to a locked picture
      const lock = page.getByRole('button', { name: 'Lock Picture', exact: true });
      if (await lock.isVisible() && await lock.isEnabled()) await lock.click();
      const cut = page.getByRole('button', { name: 'Start Cut Pass' });
      if (await cut.isVisible() && await cut.isEnabled()) await cut.click();
      await section(page, 'Music');
    }
    await expect(themes).toContainText(text);
  };
  await waitFor('written, and waiting for you');
  // Nothing is composed while they wait.
  await section(page, 'Production');
  await expect(page.getByText('Waiting for you to approve the themes, or give notes, on the Music page.').first()).toBeVisible();
  await section(page, 'Music');
  await themes.getByLabel('Your Notes On The Themes').fill('Less brass; the harbour is quieter than this.');
  await themes.getByRole('button', { name: 'Give Notes' }).click();
  await expect(themes).toContainText('being revised after your notes.');
  await waitFor('written, and waiting for you');
  await expect(themes).toContainText('Round 1: Less brass; the harbour is quieter than this.');
  await themes.getByRole('button', { name: 'Approve The Themes' }).click();
  await expect(themes).toContainText('approved after 1 round of notes; composition goes on.');
  await runToDelivery(page);
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const done = (await readSavedState(page)).projects[0];
  expect(['post:spotting:1', 'post:themes:all', 'post:themes-revision:1', 'post:music:1', 'post:stems:1'].map((id) => done.tasks.find((t: { id: string }) => t.id === id)?.status)).toEqual(['done', 'done', 'done', 'done', 'done']);
});

test('a song refused is replaced with library music: licensed on the library\'s terms, paid once, and the song leaves the cut', async ({ page }) => {
  test.setTimeout(300_000);
  await seededLife(page, 'gb-london', '2026-01-05', SEED);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '4' });
  await section(page, 'Production');
  const songs = page.getByRole('region', { name: 'Songs' });
  await songs.getByLabel('Song Title').fill('Tidewater');
  await songs.getByLabel('Where It Comes From').selectOption({ label: 'An Existing Song, Licensed' });
  await songs.getByLabel('Music By').fill('Ada Brook');
  await songs.getByLabel('Lyrics By').fill('Ada Brook');
  await songs.getByLabel('Rights Holder').fill('Saltmarsh Records');
  await songs.getByRole('button', { name: 'Add Song' }).click();
  await songs.getByRole('listitem', { name: 'Song: Tidewater' }).getByRole('button', { name: 'Use Tidewater In This Scene' }).click();
  await saveAndApprove(page);

  // The same broad request as above, refused for this world seed.
  await section(page, 'Music');
  const card = page.getByRole('article', { name: 'Licence For Tidewater' });
  await card.getByRole('button', { name: 'Ask To License Tidewater' }).click();
  for (const m of ['Cinemas', 'Streaming', 'Television']) await card.getByRole('checkbox', { name: m, exact: true }).check();
  await card.getByRole('checkbox', { name: 'The Whole World' }).check();
  await card.getByLabel('For How Long').selectOption({ label: '10 Years' });
  await card.getByRole('button', { name: 'Ask Both Holders' }).click();
  await advance(page, 'week');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbour Lights' }).first().click();
  await section(page, 'Music');
  await expect(card).toContainText('Refused:');

  await card.getByRole('button', { name: /^Replace Tidewater With Library Music For \$[\d,]+$/ }).click();
  const track = page.getByRole('article', { name: 'Licence For Library Track For "Tidewater"' });
  await expect(track).toContainText(/Licensed for festivals, cinemas, streaming, television, digital sale and rental in the whole world for 10 years, until [A-Z][a-z]+ \d{1,2}, 2036\./);
  await expect(track).toContainText('in place of "Tidewater"');
  await expect(card).toContainText('Not in the cut; no licence is needed unless it goes back in.');
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click().catch(() => {});
  await expect.poll(async () => {
    const p = (await readSavedState(page))?.projects?.[0];
    if (!p) return null;
    const keys = p.obligations.flatMap((o: { postings: { key: string }[] }) => o.postings.map((x) => x.key)).filter((k: string) => k.startsWith('licence:'));
    return [keys.length, p.songs.find((s: { title: string }) => s.title === 'Tidewater').uses.length, p.songs.find((s: { library?: boolean }) => s.library).uses.length];
  }).toEqual([1, 0, 1]);
});
