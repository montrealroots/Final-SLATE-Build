// A commissioner's decision on another season, through the real interface (the v3 package, 02 and T09; requirement
// V3-T01). The rule itself is the engine's (tests/audiences.test.ts). Here a two-episode series is written, made and
// delivered by play. Then three things are written into the save, as the game writes them, so the screen can be driven
// without a year of releases: the commissioner's agreement for the season, an accepted broadcast with its first
// episode's audience reported, and the decision the delivery would have asked for. They are labelled where they are set.
import { expect, test, type Page } from './test';
import { addScene, advance, nav, pressSaveAndExit, produceToDelivery, quickLife, readSavedState, saveAndApprove, section, newProject } from './helpers';
import { hashString } from '../src/engine/rng';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.describe.configure({ timeout: Number(process.env.SLATE_JOURNEY_TIMEOUT) || 900_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'Full media journeys run once, at desktop width.'));

const DAY = 86_400_000;
const dateKey = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Change the saved game as stored, then open it again. */
async function rewrite(page: Page, change: (state: any) => void): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  await pressSaveAndExit(page);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  change(state);
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
}

async function openOverview(page: Page): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('link', { name: /Harbour Lights/ }).or(page.getByRole('button', { name: /Harbour Lights/ })).first().click();
  await section(page, 'Overview');
}

test('a commissioned season going out on television is decided on its audience once it has been shown, and the next season starts from the offer', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  await newProject(page, { title: 'Harbour Lights', format: 'Limited Series', episodes: '2', runtime: '10' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Pier', chars: ['Mara'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  await saveAndApprove(page);
  await produceToDelivery(page, { yourself: ['Mara'] });

  // Delivered with no commissioner: nobody is deciding anything, and the page says nothing about one.
  await section(page, 'Overview');
  const season = page.locator('section.card', { has: page.getByRole('heading', { name: 'Another Season' }) });
  await expect(season).toBeVisible();
  await expect(season).not.toContainText('commissioner');

  // Labelled fixture: a commissioner paid for this season; it is going out on a broadcaster, whose first episode was
  // shown last week to an audience above what a commissioner looks for; and the decision is due tomorrow.
  const first = { week: 1, metric: 'viewers', value: 180_000, scope: 'episode', episode: 1, territories: 1 };
  await rewrite(page, (state) => {
    const p = state.projects.find((x: { title: string }) => x.title === 'Harbour Lights');
    const opened = dateKey(state.now - 8 * DAY);
    p.finance.deals.push({ id: 'fd-fixture', kind: 'commissioner', backer: 'Northgate Broadcasting', amount: 60_000, status: 'accepted', askedAt: state.now, reason: '', received: 60_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null } });
    p.offers = [{ id: 'of-fixture', distributor: 'Northgate Broadcasting', route: 'broadcast', minimumGuarantee: 0, territories: ['GB'], releaseWindowDays: 20, expiresAt: state.now, status: 'accepted', audience: [{ ...first, from: opened, to: dateKey(state.now - 2 * DAY) }] }];
    state.events.push({ id: 'e-fixture-decision', at: state.now + DAY, kind: 'season-decision', priority: 45, attention: 'notify', payload: { projectId: p.id } });
    state.events.sort((a: { at: number }, b: { at: number }) => a.at - b.at);
  });

  // They look, find one episode of two shown, and wait: the page says for what, and what has been reported so far.
  await advance(page, 'next-day');
  await advance(page, 'next-day');
  await openOverview(page);
  await expect(season).toContainText('The commissioner will decide on another season once this one has been shown on Northgate Broadcasting. So far: its first showing on Northgate Broadcasting drew an average audience of 180,000, against the 100,000 a commissioner looks for in one territory. Audience figures are simulated.');
  await expect.poll(async () => (await readSavedState(page)).projects.find((x: { title: string }) => x.title === 'Harbour Lights').renewal ?? null).toBeNull();

  // Labelled fixture: the second and last episode is shown, and keeps nine tenths of the first's audience.
  await rewrite(page, (state) => {
    const p = state.projects.find((x: { title: string }) => x.title === 'Harbour Lights');
    p.offers[0].audience.push({ ...first, week: 2, episode: 2, value: 162_000, from: dateKey(state.now - 7 * DAY), to: dateKey(state.now - DAY) });
  });
  await advance(page, 'week');
  await advance(page, 'next-day');
  await openOverview(page);
  await expect(season).toContainText('The commissioner renewed Harbour Lights: they will offer to fund another season. Its first showing on Northgate Broadcasting drew an average audience of 180,000, against the 100,000 a commissioner looks for in one territory, and it kept 90% of its audience from one episode to the next, against 88%. Audience figures are simulated.');
  await expect(season).not.toContainText('will decide');
  await expect(season).toContainText("starting with the commissioner's offer");

  // The second season, in the same career: it opens with the commissioner's offer for it, which is an offer and not money.
  await season.getByRole('button', { name: 'Start The Next Season' }).click();
  await expect(page.getByRole('heading', { name: 'Harbour Lights: Season 2', level: 1 })).toBeVisible();
  await expect.poll(async () => {
    const next = (await readSavedState(page)).projects.find((x: { title: string }) => x.title === 'Harbour Lights: Season 2');
    return next ? next.finance.deals.map((d: { kind: string; status: string; amount: number }) => [d.kind, d.status, d.amount]) : null;
  }).toEqual([['commissioner', 'offered', 60_000]]);
});
