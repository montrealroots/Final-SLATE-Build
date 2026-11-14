// The owner's v6 package, J13 (from November 13, 2026): a first-look deal for television. Its scope is series, not films.
// A covered series goes to the company first, and no commissioner can be approached for it until the company answers. A
// film made while the deal runs is outside it. The company's answer is its read of the series, not chance. One thing is
// written into the save, labelled where it is set: the offer, as the game makes it some weeks after a delivered series
// (tests/first-look.test.ts, "comes after delivered series"). A year of making series isn't needed to read it. Everything
// after it is through the screens. Both studios are made-up fixtures; nothing of them is written into the save.
import { expect, test, type Page } from './test';
import { CATALOG_FIXTURE, serveCatalog } from './catalog-fixture';
import { addScene, advance, nav, pinSeed, pressSaveAndExit, quickLife, readSavedState, section, writePitch } from './helpers';
import { hashString } from '../src/engine/rng';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.use({ actionTimeout: 20_000 });

const DAY = 86_400_000;
const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const NIGHT = 'Night Shift Pictures (Fixture)';
const STUDIOS = [
  { c: 'company:fixture-horror', name: NIGHT, n: 5, g: [['Horror', 10], ['Thriller', 6], ['Drama', 2]], m: EVEN, ann: {} },
  { c: 'company:fixture-family', name: 'Sunday Matinee (Fixture)', n: 4, g: [['Family', 8], ['Comedy', 8], ['Romance', 4]], m: EVEN, ann: {} },
];
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const commissioner = (page: Page) => card(page, 'Raise Money').getByRole('listitem').filter({ has: page.getByText('Commissioner', { exact: true }) });

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

async function horror(page: Page, title: string, format: string, opts: { episodes?: string; approve: boolean; genre?: string }): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill(title);
  await page.getByLabel('Format').selectOption({ label: format });
  if (opts.episodes) await page.getByLabel('Episodes').fill(opts.episodes);
  await page.getByLabel(/Target (Runtime In Minutes|Minutes Per Episode)/).fill('10');
  await page.getByRole('radio', { name: /^Low Budget:/ }).check();
  const genre = opts.genre ?? 'Horror';
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill(genre.toLowerCase());
  await page.getByRole('button', { name: `Add ${genre}`, exact: true }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  if (!opts.approve) return;
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Depot', chars: ['Ines'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Depot', chars: ['Ines'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  await writePitch(page);
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
}

async function open(page: Page, title: string): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: title }).first().click();
  await section(page, 'Budget');
}

test('J13: a first-look deal for television covers series, not films; a covered series goes to the company first, and its answer is its read', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
  test.setTimeout(900_000);
  await serveCatalog(page, {}, { 'world.json': { ...(CATALOG_FIXTURE['world.json'] as object), studios: STUDIOS } });
  await quickLife(page, 'us-los-angeles', '2026-11-12');
  await expect.poll(async () => (await readSavedState(page)).industry?.studios?.length, { timeout: 20_000 }).toBe(2);
  await pinSeed(page, 3);
  // The series are crime: TMDB's television genres have no Horror, so a company's series record can't match one.
  await horror(page, 'Night Watch', 'Limited Series', { episodes: '2', approve: true, genre: 'Crime' });
  await horror(page, 'Last Tram', 'Short Film', { approve: false });
  await horror(page, 'Harbour Lights', 'Limited Series', { episodes: '2', approve: false, genre: 'Crime' });

  // Before any deal, nothing on the series' page speaks of one.
  await open(page, 'Night Watch');
  await expect(card(page, `First Look: ${NIGHT}`)).toHaveCount(0);
  await expect(commissioner(page)).not.toContainText('first-look');

  // Labelled fixture: the series the offer follows, delivered two months ago and well received; the company's television
  // record, as the series the world follows would give it (studios.ts withSeriesRecord; the fixture catalog's series
  // credit no fixture studio); and the offer, as offerFirstLook makes it for a company of this scale after one.
  await rewrite(page, (state) => {
    state.industry.studios.find((x: { c: string }) => x.c === 'company:fixture-horror').tv = { n: 12, g: [['Crime', 6], ['Drama', 6], ['Mystery', 3]] };
    const before = state.projects.find((p: { title: string }) => p.title === 'Harbour Lights');
    before.delivered = { at: state.now - 60 * DAY, runtimeMin: 20 };
    before.quality = { ...before.quality, reception: 72 };
    state.firstLooks = [{
      id: 'fl-fixture', company: 'company:fixture-horror', name: NIGHT, status: 'offered', offeredAt: state.now, answerBy: state.now + 30 * DAY,
      terms: { months: 12, considerDays: 60, overhead: 3_500, fund: 50_000, animatedOnly: false, scope: 'television' },
      why: `${NIGHT} has watched your series and wants the next ones first.`, submissions: [], drawn: [],
    }];
  });

  // The offer on the Profile, every term read before anything binds: series, not films.
  await nav(page, 'Profile');
  const fl = card(page, 'First-Look Deal');
  const offer = fl.getByRole('region', { name: 'First-Look Offer' });
  const terms = offer.getByRole('list', { name: 'Its Terms' });
  await expect(terms).toContainText(`It covers the series you make while it runs, not films. You submit each one to ${NIGHT} before you take it to any commissioner.`);
  await expect(terms).toContainText(`${NIGHT} has 60 days to answer each one.`);
  await offer.getByRole('button', { name: 'Accept The First-Look Deal' }).click();
  const running = fl.getByRole('region', { name: 'Your First-Look Deal' });
  await expect(running).toContainText(`Nothing submitted yet. Submit a covered series to ${NIGHT} from its Budget page.`);

  // The film made while it runs is outside it: no first look on its page, and no hold on a studio.
  await open(page, 'Last Tram');
  await expect(card(page, `First Look: ${NIGHT}`)).toHaveCount(0);

  // The series is covered: the company first, and the commissioner waits.
  await open(page, 'Night Watch');
  const look = card(page, `First Look: ${NIGHT}`);
  await expect(look).toContainText(`Your first-look deal gives ${NIGHT} the first chance at Night Watch. Submit it to them before you take it to any commissioner; they have 60 days to answer.`);
  await expect(commissioner(page)).toContainText(`Your first-look deal gives ${NIGHT} the first chance at Night Watch: submit it to them first.`);
  await expect(commissioner(page).getByRole('button', { name: 'Approach Commissioner' })).toBeDisabled();
  await look.getByRole('button', { name: `Submit To ${NIGHT}` }).click();
  await expect(look).toContainText(new RegExp(`is considering it until .+\\. No commissioner can be approached for it until then\\.`));
  await expect(commissioner(page)).toContainText('Already approached for this project.');
  await expect.poll(async () => (await readSavedState(page)).firstLooks[0].submissions.length, { timeout: 30_000 }).toBe(1);
  const saved = await readSavedState(page);
  const sub = saved.projects.find((p: { title: string }) => p.title === 'Night Watch').finance.deals.find((d: { firstLook?: string }) => d.firstLook === 'fl-fixture');
  expect([sub.kind, sub.backer, sub.status, Math.round((sub.decideAt - sub.askedAt) / DAY)]).toEqual(['commissioner', NIGHT, 'considering', 60]);
  await page.screenshot({ path: `test-results/v6-first-look-tv-${info.project.name}.png`, fullPage: true });

  // Saved and opened again: still one submission, still held.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await open(page, 'Night Watch');
  await expect(commissioner(page)).toContainText('Already approached for this project.');

  // Sixty days on, it answers, by its read of the series and nothing drawn: crime is a large part of its series, and the
  // work it saw was well received, so it offers to commission it. From November 14, 2026 a series is read on the
  // company's series; until then it was read on its films and its film slate, and on an unpinned world desktop and phone
  // were seen to get different answers, by their slates. Two worlds with the same facts give the same answer, and a pass
  // frees the series for a commissioner: tests/first-look.test.ts ("its answer is its read, not chance").
  const nightWatch = async () => (await readSavedState(page)).projects.find((p: { title: string }) => p.title === 'Night Watch');
  for (let i = 0; i < 12 && (await nightWatch()).finance.deals.find((x: { firstLook?: string }) => x.firstLook === 'fl-fixture').status === 'considering'; i++) await advance(page, 'week');
  const answered = (await nightWatch()).finance.deals.find((x: { firstLook?: string }) => x.firstLook === 'fl-fixture');
  expect([answered.status, answered.reason]).toEqual(['offered', `It commissions the series under your first-look deal. Your first-look deal with it covers this limited series. It makes this kind of series: Crime is 40% of the genre credits on its series. Your delivered work was well received.`]);
  await open(page, 'Night Watch');
  await expect(look).toContainText(`${NIGHT} offered to commission it. Accept or refuse it below.`);
  await expect(commissioner(page)).toContainText('Already approached for this project.'); // its submission is the approach
  const commission = card(page, 'Backers').locator('li', { hasText: new RegExp(`^${NIGHT.replace(/[()]/g, '\\$&')}`) }).first();
  await commission.getByRole('button', { name: 'Accept Offer' }).click();
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  await expect(look).toContainText(`${NIGHT} commissioned it.`);
  await expect(commissioner(page).getByRole('button', { name: 'Approach Commissioner' })).toBeDisabled();
  await nav(page, 'Profile');
  await expect(running.getByRole('list', { name: 'Submitted To It' })).toContainText('Night Watch, submitted');
  await expect(running.getByRole('list', { name: 'Submitted To It' })).toContainText('Taken');
});
