// Source-first creation through the interface (the v4 package, 01; ledger V4-002, V4-004, V4-005 and J07's preset half).
// A project is made from a real work in one flow, with every field of its brief saying whether it is the work's, the
// game's proposal, or not recorded; editing a field makes it the player's; a revision keeps what the player keeps and
// is undone in one step; a series arrives with its season; cancelling makes nothing; and a project made from a retired
// story written for the game still opens as it was.
import { expect, test } from './test';
import { adaptWork, nav, pressSaveAndExit, quickLife, readSavedState, section } from './helpers';
import { hashString } from '../src/engine/rng';
import { firstSaveId, readRecord, writeRecords } from './vault';

test('a film made from a work: the whole brief with where each field came from, renamed, edited, revised and undone, and kept after a reload', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  // Cancelling part-way makes nothing.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await expect(page.getByRole('list', { name: 'Ways To Start' }).getByRole('button')).toHaveText([/^Adapt A Work/, /^Write An Original/, /^Develop A Documentary/]);
  await page.getByRole('button', { name: 'Adapt A Work' }).click();
  await expect(page.getByRole('status').filter({ hasText: /works? published by 2026/ })).toBeVisible();
  await page.getByLabel('Search Works').fill('quixote');
  await page.getByRole('list', { name: 'Works' }).getByRole('button', { name: /^Don Quixote/ }).click();
  // What is recorded, each part with where it comes from: the article's own summary, the recorded people and places.
  await expect(page.getByRole('region', { name: 'What It Is About' })).toContainText('From the English Wikipedia article');
  const facts = page.getByRole('region', { name: 'What Is Recorded' });
  await expect(facts).toContainText('Sancho Panza');
  await expect(facts).toContainText('La Mancha');
  await expect(facts).toContainText(/Adapted Before\s*\d+ recorded/);
  await page.getByRole('button', { name: 'Adapt This Work' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await nav(page, 'Projects');
  await expect(page.getByText("You haven't started a project yet.")).toBeVisible();
  await expect.poll(async () => (await readSavedState(page))?.projects.length ?? 0).toBe(0);

  // Made: a short, freely adapted, the lead renamed.
  await adaptWork(page, {
    query: 'quixote', work: /^Don Quixote/, title: 'The Knight Of La Mancha', format: 'Short Film', runtime: '12', approach: 'Freely Adapted',
    onStep: async (step) => {
      if (step !== 'preview') return;
      await expect(page.getByRole('region', { name: /^Fitting It To/ }).or(page.locator('section', { has: page.getByRole('heading', { name: /^Fitting It To/ }) }))).toContainText('A short can hold one strand of a novel');
      const brief = page.getByRole('list', { name: 'Brief Fields' });
      await expect(brief.getByRole('listitem').filter({ hasText: /^Premise/ })).toContainText('From The Work');
      await expect(brief.getByRole('listitem').filter({ hasText: /^Synopsis/ })).toContainText('Proposed');
      await expect(brief.getByRole('listitem').filter({ hasText: /^Synopsis/ })).toContainText("not Don Quixote's plot");
      await expect(brief.getByRole('listitem').filter({ hasText: /^Intended Ending/ })).toContainText('Proposed'); // free: its own ending
      await page.getByLabel(/^Name For /).first().fill('Alonso The Knight');
    },
  });
  await section(page, 'Characters');
  await expect(page.getByRole('article', { name: 'Alonso The Knight' })).toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3); // a short carries three of the recorded people
  await section(page, 'Script');
  const brief = page.getByRole('region', { name: 'Creative Brief' });
  await expect(brief).toContainText('Adapted From: Don Quixote');
  await expect(brief).toContainText('freely adapted');
  // The working title typed before creating is already the player's own words.
  await expect(brief).toContainText('and 1 now your own words');
  // The player rewrites the logline: from then on it reads as theirs too.
  await page.getByLabel('Logline').fill('A man reads too many books and rides out to fix the world.');
  await expect(brief).toContainText('and 2 now your own words');
  await brief.getByText('Where Each Field Came From').click();
  await expect(brief.getByRole('list', { name: 'Where Each Field Came From' }).getByRole('listitem').filter({ hasText: /^Logline/ })).toContainText('Your Words');

  // Revise From The Work: the logline is kept (it is theirs), the people are kept; the rest is written again.
  await page.getByRole('button', { name: 'Revise From The Work' }).click();
  const revise = page.getByRole('dialog', { name: 'Revise From The Work' });
  await expect(revise.getByLabel('Keep My Logline')).toBeChecked();
  await expect(revise.getByLabel('Keep My Working Title')).toBeChecked(); // until November 12, 2026 a revision replaced it unasked
  await expect(revise.getByLabel('Keep My Characters And Add None')).toBeChecked();
  await revise.getByRole('button', { name: 'Apply The Fields Left Open' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Revised from Don Quixote' })).toBeVisible();
  await expect(page.getByLabel('Logline')).toHaveValue('A man reads too many books and rides out to fix the world.');
  await section(page, 'Characters');
  await expect(page.getByRole('article')).toHaveCount(3);
  await section(page, 'Script');
  // Unticked this time: the logline is written again; Undo takes the whole revision back.
  await page.getByRole('button', { name: 'Revise From The Work' }).click();
  await revise.getByLabel('Keep My Logline').uncheck();
  await revise.getByRole('button', { name: 'Apply The Fields Left Open' }).click();
  await expect(page.getByLabel('Logline')).not.toHaveValue('A man reads too many books and rides out to fix the world.');
  await page.getByRole('button', { name: 'Undo Last Change' }).click();
  await expect(page.getByLabel('Logline')).toHaveValue('A man reads too many books and rides out to fix the world.');

  // Kept after Save And Exit and Continue, with the work it was made from.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: /^The Knight Of La Mancha/ }).click();
  await section(page, 'Script');
  await expect(page.getByRole('region', { name: 'Creative Brief' })).toContainText('Adapted From: Don Quixote');
  const saved = await readSavedState(page);
  expect(saved.projects[0].proposal).toMatchObject({ workId: 'wd:Q480', approach: 'free' });
  expect(saved.projects[0].source).toMatchObject({ kind: 'adapted', ref: { id: 'wd:Q480' } });
  expect(saved.projects[0].source.changes).toBeUndefined(); // declared for a rights holder until November 13, 2026; nothing reads it now
});

test('a series made from a work arrives with its season, and the installment that follows it is named as recorded', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  await adaptWork(page, {
    query: 'musketeers', work: /^The Three Musketeers/, format: 'Series', episodes: '4',
    onStep: async (step) => {
      if (step !== 'preview') return;
      const season = page.locator('section', { has: page.getByRole('heading', { name: 'The Season' }) });
      await expect(season.getByRole('listitem')).toHaveCount(4);
      await expect(season).toContainText('(recorded)');
    },
  });
  await expect(page.getByRole('heading', { name: 'The Three Musketeers', level: 1 })).toBeVisible();
  await expect.poll(async () => (await readSavedState(page))?.projects?.[0]?.proposal?.workId ?? null).toBe('wd:Q140527');
  const p = (await readSavedState(page)).projects[0];
  expect(p.episodes.map((e: { title: string }) => e.title).filter(Boolean)).toHaveLength(4);
  expect(p.series.continuation).toContain("followed by Twenty Years After in D'Artagnan Romances (recorded)");
  expect(p.proposal.origin['series.continuation']).toBe('sourced');
});

test('a project made from a retired story written for the game still opens as it was, and says where it came from', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('The Quiet Floor');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await pressSaveAndExit(page);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  // Labelled fixture: what applying a story from the retired library wrote into a save (its words are in the project,
  // and only its id, version, title and names are kept about it). The library's files are gone.
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
  await expect(page.getByRole('button', { name: 'Revise From The Work' })).toHaveCount(0); // it was not made from a work
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await expect(page.getByText(/Draft 1/).first()).toBeVisible();
});
