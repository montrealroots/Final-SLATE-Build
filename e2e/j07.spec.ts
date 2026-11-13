// J07 as one run (the v4 package, 05: "Original project remains fully playable; era/year and genres editable, no
// dependency on retired generated stories. An old preset-derived save continues unchanged"; ledger V4-038.07).
import { expect, test } from './test';
import { addScene, nav, pressSaveAndExit, produceToDelivery, quickLife, readSavedState, saveAndApprove, section } from './helpers';
import { hashString } from '../src/engine/rng';
import { firstSaveId, readRecord, writeRecords } from './vault';

test('J07: a project from the retired story library opens and goes on as it was; an original with its era, year and genres is made to delivery', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(600_000);
  await quickLife(page, 'gb-london', '2026-02-02');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('The Quiet Floor');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await pressSaveAndExit(page);
  // Labelled fixture: what applying a story from the retired library wrote into a save; the library's files are gone.
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  state.projects[0].story.logline = 'A night cleaner learns the bank she cleans is being emptied from inside.';
  state.projects[0].blueprint = { id: 'heist.f01', v: 1, title: 'The Quiet Floor', at: state.now, names: {} };
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: /^The Quiet Floor/ }).click();
  await section(page, 'Script');
  await expect(page.getByRole('region', { name: 'Creative Brief' })).toContainText('Which Story It Is From: The Quiet Floor, an original story written for this game.');
  await expect(page.getByLabel('Logline')).toHaveValue('A night cleaner learns the bank she cleans is being emptied from inside.');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await expect(page.getByText(/Draft 1/).first()).toBeVisible();

  // An original of the player's own: genres chosen, its era and year set, made to delivery with the period's research.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('Ember Year');
  await page.getByLabel('Search Genres').fill('comedy');
  await page.getByRole('group', { name: 'Genre Results' }).getByRole('button', { name: 'Add Comedy', exact: true }).click();
  await page.getByLabel('Search Genres').fill('drama');
  await page.getByRole('group', { name: 'Genre Results' }).getByRole('button', { name: 'Add Drama', exact: true }).click();
  await page.getByLabel('Story Era').fill('The early 1960s');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('June');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await page.getByLabel('Year It Is Set In').fill('1962');
  await expect(page.getByText(/^1962 is .* for a project made in 2026: the period is researched before costumes and design start/)).toBeVisible();
  await addScene(page, { index: 0, place: 'Dance Hall', chars: ['June'], minutes: '3' });
  await saveAndApprove(page);
  await expect.poll(async () => {
    const p0 = (await readSavedState(page))?.projects?.find((x: { title: string }) => x.title === 'Ember Year');
    return p0 ? [p0.axes.storyYear, p0.axes.genres.map((g: { id: string; emphasis: string }) => `${g.id}:${g.emphasis}`), p0.blueprint ?? null] : null;
  }).toEqual([1962, ['comedy:primary', 'drama:secondary'], null]);
  await produceToDelivery(page, { yourself: ['June'] });
  await expect.poll(async () => !!(await readSavedState(page))?.projects?.find((x: { title: string }) => x.title === 'Ember Year')?.delivered, { timeout: 30_000 }).toBe(true);
  const done = (await readSavedState(page)).projects.find((x: { title: string }) => x.title === 'Ember Year');
  expect(done.tasks.some((t: { label: string; status: string }) => /Period Research/.test(t.label) && t.status === 'done')).toBe(true);
  // The retired-library project is still there as it was.
  const old = (await readSavedState(page)).projects.find((x: { title: string }) => x.title === 'The Quiet Floor');
  expect([old.blueprint.id, old.story.logline]).toEqual(['heist.f01', 'A night cleaner learns the bank she cleans is being emptied from inside.']);
});
