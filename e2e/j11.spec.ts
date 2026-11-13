// J11 as one run (the v4 package, 05: "Historical observations -> future simulation boundary -> weekly cinema/audience
// reports -> holdovers/renewal/cancellation -> record-book update without double-counting. Recorded historical values
// are immutable within the snapshot; simulation is labeled."; ledger V4-038.11). One game, begun nine days before the
// records end (a made-up catalog, catalog-fixture.ts, whose records end November 10, 2026), through the interface. The
// studio is a made-up fixture and the world seed is pinned (a labelled fixture), so the run is the same each time.
import { expect, test, type Page } from './test';
import { CATALOG_FIXTURE, serveCatalog } from './catalog-fixture';
import { addScene, advance, castRoles, nav, pinSeed, pressSaveAndExit, quickLife, readSavedState, runToDelivery, section, staffEveryDepartment, writePitch } from './helpers';

test.use({ actionTimeout: 20_000 });

const NIGHT = 'Night Shift Pictures (Fixture)';
const STUDIOS = [{ c: 'company:fixture-horror', name: NIGHT, n: 5, g: [['Horror', 10], ['Thriller', 6], ['Drama', 2]], m: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], ann: {} }];
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;
type Week = { week: number; rental: number; status: string; screens?: number; next?: string };

test('J11: the records to their end, the world after them simulated and labelled, weeks in cinemas with holdovers, a renewal or cancellation, and the record book counted once', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(1_500_000);
  await serveCatalog(page, {}, { 'world.json': { ...(CATALOG_FIXTURE['world.json'] as object), studios: STUDIOS } });
  await quickLife(page, 'us-los-angeles', '2026-11-01');
  await pinSeed(page, 3);

  // Before the boundary: the records, as recorded. Home says where they stop; Coastline's recorded season is listed
  // without a Simulated mark, and nothing has been decided for it yet.
  await nav(page, 'Home');
  const industry = card(page, 'In The Industry');
  await expect(industry).toContainText("Until November 10, 2026 they are TMDB's records; after that, this save's world decides, and those are marked Simulated.");
  const coastline = async () => {
    await nav(page, 'Companies');
    await page.getByLabel('Title Or Person').fill('Coastline');
    await page.getByRole('button', { name: 'Coastline (Fixture)', exact: true }).click();
    return card(page, 'Seasons').getByRole('listitem');
  };
  let seasons = await coastline();
  await expect(seasons).toHaveCount(1);
  await expect(seasons.first()).toContainText(/Season 1.*8 episodes, 2026/);
  await expect(seasons.first().locator('.chip')).toHaveCount(0);
  await expect(card(page, 'In Your Story')).toContainText('Nothing has been decided yet.');
  const start = await readSavedState(page);
  expect(start.industry.horizon).toBe('2026-11-10');
  expect(start.industry.series['tv:900201']).toMatchObject({ outcomes: [], seasons: [], rec: 1 });

  // A horror feature, pitched to the studio, optioned, and made.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('The Long Night');
  await page.getByLabel('Format').selectOption({ label: 'Feature Film' });
  await page.getByLabel(/Target Runtime In Minutes/).fill('90');
  await page.getByRole('radio', { name: /^Low Budget:/ }).check();
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('horror');
  await page.getByRole('button', { name: 'Add Horror', exact: true }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines'); await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Depot', chars: ['Ines'], minutes: '45' });
  await addScene(page, { index: 1, place: 'Tram', chars: ['Ines'], minutes: '45' });
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await section(page, 'Budget');
  await page.getByRole('button', { name: `Pitch To ${NIGHT}` }).click();
  // The studio answers in about two weeks; its option is accepted as soon as it is made (offers lapse after three).
  const backers = card(page, 'Backers');
  const option = backers.locator('li', { hasText: NIGHT }).first().getByRole('button', { name: 'Accept Offer' });
  for (let i = 0; i < 4 && !(await option.isVisible()); i++) { await advance(page, 'week'); await nav(page, 'Projects'); await page.getByRole('button', { name: 'The Long Night' }).first().click(); await section(page, 'Budget'); }
  await option.click();
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  await page.getByRole('button', { name: 'Approach Starting Backing' }).click();
  await backers.locator('li', { hasText: 'Starting Backing' }).getByRole('button', { name: 'Accept Offer' }).click();
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  // Across the boundary: what the world decides after it is marked Simulated.
  // Its first decision falls within a month of the records' end (industry.ts plan); Home tells it for two weeks.
  for (let i = 0; i < 4 && !(await readSavedState(page)).industry.series['tv:900201'].outcomes.length; i++) await advance(page, 'week');
  await nav(page, 'Home');
  await expect(industry.getByRole('listitem').filter({ hasText: 'Season 2 of Coastline (Fixture) was given a date' }).locator('.chip')).toHaveText('Simulated');

  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'The Long Night' }).first().click();
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 90 });
  await expect.poll(async () => !!(await readSavedState(page))?.projects[0]?.delivered, { timeout: 30_000 }).toBe(true);

  // Weekly reports from the cinemas: each week's screens and what the cinemas decided for the next, until it is withdrawn.
  for (let i = 0; i < 8; i++) await advance(page, 'month');
  const offerOf = async () => (await readSavedState(page)).projects[0].offers.find((o: { studioDeal?: string }) => o.studioDeal);
  const offer = await offerOf();
  const weeks: Week[] = offer.weeks;
  expect(weeks.length).toBeGreaterThan(4);
  expect(weeks.every((w) => w.status === 'final' && typeof w.screens === 'number' && !!w.next)).toBe(true);
  expect(weeks.map((w) => w.week)).toEqual(weeks.map((_, i) => i + 1));
  // A holdover is a decision that changes the next week's screens: held keeps them, expanded adds, cut takes some away.
  for (let i = 0; i + 1 < weeks.length; i++) {
    const [w, n] = [weeks[i], weeks[i + 1]];
    if (w.next === 'held') expect(n.screens).toBe(w.screens);
    if (w.next === 'expanded') expect(n.screens!).toBeGreaterThanOrEqual(w.screens!);
    if (w.next === 'cut') expect(n.screens!).toBeLessThan(w.screens!);
    if (w.next === 'withdrawn') expect(n.screens).toBe(0);
  }
  expect(weeks.reduce((n, w) => n + w.rental, 0)).toBe(offer.reported.gross);
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'The Long Night' }).first().click();
  await section(page, 'Release');
  const earnings = card(page, 'Earnings');
  await earnings.getByText(`Weeks In Cinemas (${weeks.length})`).click();
  await expect(earnings).toContainText('Simulated by the game: no real box office is shown here.');
  const rows = earnings.getByRole('table', { name: `Weeks In Cinemas, ${NIGHT}` }).locator('tbody tr');
  await expect(rows).toHaveCount(weeks.length);
  const NEXT: Record<string, string> = { expanded: 'Expanded', held: 'Held', cut: 'Screens Cut', withdrawn: 'Withdrawn' };
  for (const i of [0, weeks.length - 1]) {
    await expect(rows.nth(i).locator('td[data-label="Screens"]')).toHaveText(String(weeks[i].screens));
    await expect(rows.nth(i).locator('td[data-label="Next Week"]')).toHaveText(NEXT[weeks[i].next!]);
  }

  // The record book: the film once, its lifetime the weeks' sum.
  const lifetime = `Lifetime ${dollars(offer.reported.gross * 2)} (1st)`;
  const book = async () => { await nav(page, 'Profile'); return card(page, 'Record Book'); };
  let rb = await book();
  await expect(rb).toContainText('Simulated by the game, and only what happened in this story: no real box office is in this book.');
  await expect(rb.getByRole('listitem').filter({ hasText: 'The Long Night' })).toHaveCount(1);
  await expect(rb.getByRole('listitem').filter({ hasText: 'The Long Night' })).toContainText(`Opening week ${dollars(weeks[0].rental * 2)} (1st). ${lifetime}`);

  // The world goes on until its network decides on the simulated season: renewed or cancelled, and labelled Simulated.
  const decided = async () => (await readSavedState(page)).industry.series['tv:900201'].outcomes.filter((o: { kind: string }) => o.kind === 'renewed' || o.kind === 'cancelled');
  for (let i = 0; i < 30 && !(await decided()).length; i++) await advance(page, 'month');
  const [verdict] = await decided();
  expect(verdict).toBeTruthy();
  seasons = await coastline();
  const story = card(page, 'In Your Story');
  const said = verdict.kind === 'renewed' ? `Renewed: Season ${verdict.n}` : `Cancelled after Season ${verdict.n}`;
  await expect(story.getByRole('listitem').filter({ hasText: said }).locator('.chip')).toHaveText('Simulated');
  // The recorded season is as recorded: listed without the mark, with its recorded count and year.
  await expect(seasons.first()).toContainText(/Season 1.*8 episodes, 2026/);
  await expect(seasons.first().locator('.chip')).toHaveCount(0);
  await expect(seasons.nth(1)).toContainText(/Season 2\s*Simulated/);
  await story.getByRole('button', { name: 'Season 2', exact: true }).click();
  await expect(card(page, 'About This Season')).toContainText('Season 1 as TMDB recorded it: 8 episodes, April 1, 2026 to May 20, 2026.');

  // Not counted twice: months later and after a reload, the reports, the weeks and the record book are what they were.
  for (let i = 0; i < 2; i++) await advance(page, 'month');
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const again = await offerOf();
  expect([again.weeks.length, again.reported.gross]).toEqual([weeks.length, offer.reported.gross]);
  const end = await readSavedState(page);
  expect([end.industry.horizon, end.industry.series['tv:900201'].rec]).toEqual(['2026-11-10', 1]);
  rb = await book();
  await expect(rb.getByRole('listitem').filter({ hasText: 'The Long Night' })).toHaveCount(1);
  await expect(rb.getByRole('listitem').filter({ hasText: 'The Long Night' })).toContainText(lifetime);
});
