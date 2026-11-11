// The owner's foundation journeys (November 11, 2026, brief item 5) that no other spec already made. Fixture data
// throughout: the made-up catalog and cinemas in catalog-fixture.ts, every name marked (Fixture). Each journey is played
// with the controls a player uses, except where a step is labelled a fixture below: a film made and delivered takes
// hours of play, so the cinema journey starts from a save edited to hold one, and says so.
import { expect, test, type Page } from './test';
import { hashString } from '../src/engine/rng';
import { serveCatalog } from './catalog-fixture';
import { advance, anotherLife, nav, newProject, pressSaveAndExit, quickLife, readSavedState, saveAndExit, section } from './helpers';
import { firstSaveId, listRecords, readRecord, writeRecords } from './vault';

type State = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const long = (key: string) => new Date(`${key}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const SERIES = 'tv:900201';

test.beforeEach(({}, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
});

/** A save begun before the records end (November 10), played on until its world has decided Coastline's future. */
async function pastTheRecords(page: Page, place = 'gb-london'): Promise<State> {
  await quickLife(page, place, '2026-11-01');
  await advance(page, 'month');
  await advance(page, 'week');
  await advance(page, 'week');
  return readSavedState(page);
}

const readSave = async (page: Page, id: string): Promise<State> => JSON.parse(JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!).data);

async function openCoastline(page: Page): Promise<void> {
  await nav(page, 'Companies');
  await page.getByLabel('Title Or Person').fill('Coastline');
  await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Coastline (Fixture)', level: 1 })).toBeVisible();
}

test('from the calendar to a simulated season, and the same season after the save is closed and opened again', async ({ page }) => {
  test.setTimeout(240_000);
  await serveCatalog(page);
  const saved = await pastTheRecords(page);
  const season = saved.industry.series[SERIES].seasons[0];
  expect(season).toMatchObject({ n: 2 });
  // The calendar, from this month to the premiere's, with the player's own controls.
  await nav(page, 'Calendar');
  const now = new Date(saved.now);
  const months = (Number(season.premiere.slice(0, 4)) - now.getUTCFullYear()) * 12 + Number(season.premiere.slice(5, 7)) - 1 - now.getUTCMonth();
  for (let i = 0; i < months; i++) await page.getByRole('button', { name: 'Next Month' }).click();
  await page.getByRole('grid').getByRole('button', { name: new RegExp(long(season.premiere)) }).click();
  const day = page.locator('section.card', { has: page.locator('#day-h') });
  const entry = day.locator('li', { hasText: 'Coastline (Fixture): Season 2 Begins (Simulated)' });
  await expect(entry).toBeVisible();
  await entry.getByRole('button', { name: 'View Details' }).click();
  await expect(page.getByRole('heading', { name: 'Season 2', level: 1 })).toBeVisible();
  await expect(page.locator('.callout')).toContainText("This season was made by this save's world after the records end on November 10, 2026.");
  await expect(card(page, 'About This Season')).toContainText(long(season.premiere));

  // Closed and opened again: the same decision, on the same day, and the same season.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  const again = await readSavedState(page);
  expect(again.industry.series[SERIES]).toEqual(saved.industry.series[SERIES]);
  await openCoastline(page);
  await expect(card(page, 'In Your Story').locator('li').first()).toContainText(`Given A Date: Season 2`);
});

test('two saves keep their own worlds: what one decided never shows in the other, and switching back finds it unchanged', async ({ page }) => {
  test.setTimeout(300_000);
  await serveCatalog(page);
  const first = await pastTheRecords(page);
  const decided = first.industry.series[SERIES];
  expect(decided.outcomes.length).toBeGreaterThan(0);
  // Named so the two can be told apart in Saved Games.
  await nav(page, 'Saved Games');
  await page.getByRole('button', { name: /^Rename Save / }).first().click();
  await page.getByLabel('Save Name').fill('London Story');
  await page.getByRole('dialog').getByRole('button', { name: 'Rename Save' }).click();
  await expect(page.getByText('London Story').first()).toBeVisible();
  await saveAndExit(page);

  // A second life, begun on the same day elsewhere, not yet past the records' end.
  await anotherLife(page, 'us-los-angeles', '2026-11-01');
  const ids = (await listRecords(page)).filter((k) => /^slate\.v1\.save\.[^.]+$/.test(k)).map((k) => k.slice('slate.v1.save.'.length));
  expect(ids).toHaveLength(2);
  const secondId = ids.find((id) => id !== first.saveId)!;
  await openCoastline(page);
  await expect(card(page, 'In Your Story')).toContainText('Nothing has been decided yet.');
  await expect(page.getByText('Given A Date')).toHaveCount(0);
  await nav(page, 'Home');
  await expect(page.getByText('(Simulated)')).toHaveCount(0);

  // Back to the first from Saved Games: its world is as it left it.
  await nav(page, 'Saved Games');
  await page.getByRole('button', { name: 'Continue London Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await saveAndExit(page);
  const back = await readSave(page, first.saveId);
  expect(back.industry.series[SERIES]).toEqual(decided);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openCoastline(page);
  await expect(card(page, 'In Your Story').locator('li').first()).toContainText('Given A Date: Season 2');
  // And the second save, read from storage, holds nothing the first decided.
  const other = await readSave(page, secondId);
  expect(other.locationId).toBe('us-los-angeles');
  expect(other.industry?.series[SERIES]?.outcomes ?? []).toEqual([]);
});

/** Fixture: edit the saved game in place (with its checksum) and open it again, as cinemas.spec.ts does. */
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

async function londonFilms(page: Page) {
  await nav(page, 'World');
  await page.getByRole('searchbox', { name: 'Search Places' }).fill('london');
  await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'London', exact: true }).first().click();
  return page.getByRole('region', { name: 'Cinemas Nearby' });
}

test('your film in cinemas: a planned release says where it will open, cancelling it takes it away, and a run that ends leaves', async ({ page }) => {
  test.setTimeout(300_000);
  await serveCatalog(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await newProject(page, { title: 'Kite Season', format: 'Feature Film', runtime: '95' });
  // Fixture: the film is marked delivered, released in British cinemas on January 3, and with a second British run planned
  // for March 20 (the release system's records, as delivery and a distributor's deal would leave them).
  await editSave(page, (s) => {
    const p = s.projects.find((x: State) => x.title === 'Kite Season');
    Object.assign(p, { phase: 'released', delivered: { at: Date.parse('2026-01-01T12:00:00Z'), runtimeMin: 95 }, quality: { overall: 90, reception: 95 } });
    p.releases = [
      { id: 'r1', route: 'theatrical', date: '2026-01-03', territories: ['GB'], distributor: 'Coast Pictures', note: '', status: 'released' },
      { id: 'r2', route: 'theatrical', date: '2026-03-20', territories: ['GB'], distributor: 'Coast Pictures', note: '', status: 'planned' },
    ];
  });
  // In its run, in the place's listing.
  let near = await londonFilms(page);
  await expect(near.getByRole('list', { name: 'Films in cinemas in United Kingdom' })).toContainText('Kite Season');

  // The release page: the run under way, and the planned one saying where it will open.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Kite Season' }).first().click();
  await section(page, 'Release');
  const planned = page.locator('li', { hasText: 'on March 20, 2026' }).filter({ hasText: 'Planned' });
  await expect(planned).toContainText(/Opens on March 20, 2026 at \d+ cinemas? of the 2 there the game takes to show films/);
  // Cancelled with the player's control: the listing for it goes.
  await planned.getByRole('button', { name: 'Cancel Release' }).click();
  await page.getByRole('dialog', { name: 'Cancel This Release?' }).getByRole('button', { name: 'Cancel Release' }).click();
  const cancelled = page.locator('li', { hasText: 'on March 20, 2026' });
  await expect(cancelled).toContainText('Cancelled');
  await expect(cancelled).not.toContainText('Opens on');

  // Eight weeks after January 3 the run is over: the release says so, and the place's cinemas no longer show it.
  for (let i = 0; i < 2; i++) await advance(page, 'month');
  await section(page, 'Release');
  await expect(page.locator('li', { hasText: 'on January 3, 2026' })).toContainText('Its run ended on February 28, 2026.');
  near = await londonFilms(page);
  await expect(near).not.toContainText('Kite Season');
  const saved = await readSavedState(page);
  expect(saved.projects.find((x: State) => x.title === 'Kite Season').releases.map((r: State) => r.status)).toEqual(['released', 'cancelled']);
});
