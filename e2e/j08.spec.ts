// J08 as one run (the v4 package, 05: "Licensed-song refusal -> substitute -> approved scope -> edit/conform -> cue sheet
// -> release gate. Test an uncovered territory/trailer, term expiry and payment once"; ledger V4-038.08). The world seed
// is pinned (a labelled fixture) so the holders answer the same way each run. The game has no trailers to license.
import { expect, test } from './test';
import { addScene, advance, nav, newProject, produceToDelivery, readSavedState, saveAndApprove, section, seededLife } from './helpers';

test('J08: a song refused and replaced with library music, another licensed for less, delivered with its cue sheet, a release refused where it is not licensed, run out, renewed, paid once each', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(600_000);
  await seededLife(page, 'gb-london', '2026-01-05', 3);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '4' });
  await addScene(page, { index: 1, place: 'Quay', chars: ['Mara'], minutes: '3' });
  await section(page, 'Production');
  const songs = page.getByRole('region', { name: 'Songs' });
  for (const [title, holder] of [['Tidewater', 'Saltmarsh Records'], ['Gull', 'Northwind Music']]) {
    await songs.getByLabel('Song Title').fill(title);
    await songs.getByLabel('Where It Comes From').selectOption({ label: 'An Existing Song, Licensed' });
    await songs.getByLabel('Music By').fill('Ada Brook');
    await songs.getByLabel('Lyrics By').fill('Ada Brook');
    await songs.getByLabel('Rights Holder').fill(holder);
    await songs.getByRole('button', { name: 'Add Song' }).click();
  }
  await songs.getByRole('listitem', { name: 'Song: Tidewater' }).getByRole('button', { name: 'Use Tidewater In This Scene' }).first().click();
  await songs.getByRole('listitem', { name: 'Song: Gull' }).getByRole('button', { name: 'Use Gull In This Scene' }).first().click();
  await saveAndApprove(page);
  const reopen = async (tab: string) => { await nav(page, 'Projects'); await page.getByRole('button', { name: 'Harbour Lights' }).first().click(); await section(page, tab); };

  // Tidewater: asked of both holders for everything, everywhere, for ten years; refused; a library track takes its place.
  await section(page, 'Music');
  const tide = page.getByRole('article', { name: 'Licence For Tidewater' });
  const askWorld = async () => {
    await tide.getByRole('button', { name: 'Ask To License Tidewater' }).click();
    for (const m of ['Cinemas', 'Streaming', 'Television']) await tide.getByRole('checkbox', { name: m, exact: true }).check();
    await tide.getByRole('checkbox', { name: 'The Whole World' }).check();
    await tide.getByLabel('For How Long').selectOption({ label: '10 Years' });
    await tide.getByRole('button', { name: 'Ask Both Holders' }).click();
  };
  await askWorld();
  // Gull: festivals and digital, in GB, for a year.
  const gull = page.getByRole('article', { name: 'Licence For Gull' });
  await gull.getByRole('button', { name: 'Ask To License Gull' }).click();
  await gull.getByLabel('For How Long').selectOption({ label: '1 Year' });
  await gull.getByRole('button', { name: 'Ask Both Holders' }).click();
  await advance(page, 'week');
  await reopen('Music');
  // Labelled fixture: a quote for the world is declined and asked again until the holders refuse (the seed's answers).
  for (let i = 0; i < 8 && !(await tide.getByRole('region', { name: 'Other Routes For Tidewater' }).count()); i++) {
    if (await tide.getByRole('button', { name: 'Decline The Quote For Tidewater' }).count()) await tide.getByRole('button', { name: 'Decline The Quote For Tidewater' }).click();
    if (await tide.getByRole('button', { name: 'Ask To License Tidewater' }).count()) await askWorld();
    await advance(page, 'week');
    await reopen('Music');
  }
  await expect(tide).toContainText('Refused:');
  await tide.getByRole('button', { name: /^Replace Tidewater With Library Music For \$[\d,]+$/ }).click();
  await expect(page.getByRole('article', { name: 'Licence For Library Track For "Tidewater"' })).toContainText('in the whole world for 10 years');
  // Gull: agreed if quoted; asked again for the same while the holders say no (their answers are the seed's).
  for (let i = 0; i < 6 && !(await gull.getByRole('button', { name: /^Agree Gull For / }).count()); i++) {
    if (await gull.getByRole('button', { name: 'Ask To License Gull' }).count()) {
      await gull.getByRole('button', { name: 'Ask To License Gull' }).click();
      await gull.getByLabel('For How Long').selectOption({ label: '1 Year' });
      await gull.getByRole('button', { name: 'Ask Both Holders' }).click();
    }
    await advance(page, 'week');
    await reopen('Music');
  }
  await gull.getByRole('button', { name: /^Agree Gull For / }).click();
  await expect(gull).toContainText(/Licensed for festivals, digital sale and rental in GB for 1 year, until /);

  // Made, cut, locked and delivered: the cue sheet is part of the music clearance work, done before delivery.
  await produceToDelivery(page, { yourself: ['Mara'] });
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const delivered = (await readSavedState(page)).projects[0];
  expect(delivered.tasks.find((t: { id: string }) => t.id === 'post:clearance:all')).toMatchObject({ label: 'Music Clearances And Cue Sheet', status: 'done' });

  // The release gate: in GB it goes; in the US, where Gull isn't licensed, it is refused and says why.
  await reopen('Release');
  const plan = async (territory: string) => {
    await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
    await page.getByLabel('Territory Code').fill(territory);
    await page.getByRole('button', { name: 'Plan Release' }).click();
  };
  await plan('US');
  await expect(page.getByRole('alert')).toContainText('"Gull" is licensed for GB, not US. Ask for more on the Music page, or replace the song on the Production page.');
  await plan('GB');
  await expect(page.locator('section', { hasText: 'Release History' }).locator('li', { hasText: 'in GB' })).toBeVisible();

  // A year on, Gull's licence runs out: a new release is refused until it is renewed; renewed, paid once.
  for (let i = 0; i < 13 && (await readSavedState(page)).projects[0].music.licences.find((l: { songId: string; status: string }) => l.status === 'expired') === undefined; i++) await advance(page, 'month');
  await reopen('Release');
  await plan('GB');
  await expect(page.getByRole('alert')).toContainText('"Gull" has no licence standing. Renew it, or replace it, on the Music page.');
  await section(page, 'Music');
  await gull.getByRole('button', { name: /^Renew Gull For \$[\d,]+$/ }).click();
  await section(page, 'Release');
  await plan('GB');
  await expect.poll(async () => (await readSavedState(page)).projects[0].releases.length).toBe(2);

  // Each fee posted once, after a reload too.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click().catch(() => {});
  await expect.poll(async () => {
    const p = (await readSavedState(page))?.projects?.[0];
    if (!p) return null;
    const keys: string[] = p.obligations.flatMap((o: { postings: { key: string }[] }) => o.postings.map((x) => x.key)).filter((k: string) => k.startsWith('licence'));
    return [keys.filter((k) => k.startsWith('licence:')).length, keys.filter((k) => k.startsWith('licence-renewal:')).length, new Set(keys).size === keys.length];
  }).toEqual([2, 1, true]);
});
