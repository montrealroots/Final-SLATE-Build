// J03 as one run (the v4 package, 05: "Game adaptation -> 2D series -> platform -> weekly audience ->
// renewal/cancellation -> season two"; ledger V4-038.03). One game, through the interface: a video game from the works
// catalog adapted as a drawn 2D series, commissioned through an agent, made, sold to a broadcaster or streaming service,
// its audience reported week by week, the commissioner's decision made on that audience, and the second season begun.
// Nothing is written into the save. The world seed is pinned (a labelled fixture), chosen so the commissioner says yes
// and a broadcaster or streamer makes an offer.
import { expect, test, type Page } from './test';
import { adaptWork, addScene, advance, castRoles, nav, pinSeed, quickLife, readSavedState, runToDelivery, section, staffEveryDepartment, writePitch } from './helpers';

test.use({ actionTimeout: 20_000 });

const SEED = Number(process.env.J03_SEED ?? 1);
const TITLE = 'Test Chamber';
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const project = async (page: Page, title = TITLE): Promise<any> => (await readSavedState(page))?.projects?.find((p: { title: string }) => p.title === title);
const open = async (page: Page, tab: string) => { await nav(page, 'Projects'); await page.getByRole('button', { name: TITLE }).first().click(); await section(page, tab); };

test('J03: a video game adapted as a 2D series, commissioned, sold to a platform, watched week by week, decided on its audience, and its second season begun', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(1_200_000);
  await quickLife(page, 'gb-london', '2026-01-05');
  await pinSeed(page, SEED);

  // A video game from the works catalog, as a drawn 2D series of two episodes; the brief proposed from its record.
  await adaptWork(page, { query: 'portal', work: /^Portal\b/, title: TITLE, format: 'Series', medium: 'Animation', technique: 'Drawn 2D', episodes: '2', runtime: '2', budget: 'Low Budget' });
  await expect.poll(async () => (await project(page))?.source?.kind ?? null).toBe('adapted');
  const made = await project(page);
  expect(made.axes).toMatchObject({ medium: 'animation', technique: '2d-drawn' });
  expect(made.episodes).toHaveLength(2);
  expect(made.proposal.workId).toBeTruthy();
  const lead: string = made.characters[0].name;
  await section(page, 'Script');
  // The proposal's scenes are kept; an episode it left without one is given one (its card follows the episodes before it).
  const scenesIn = (ep: number) => made.scenes.filter((x: { episode?: number }) => (x.episode ?? 1) === ep).length;
  let before = 0;
  for (const ep of [1, 2]) {
    if (!scenesIn(ep)) { await addScene(page, { index: before, place: 'Chamber', chars: [lead], minutes: '1', episodeButton: `Add Scene To Episode ${ep}` }); before += 1; }
    before += scenesIn(ep);
  }
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();

  // A commissioner listens only to delivered work, or to an agent: one is signed, and submits the series.
  await nav(page, 'Profile');
  const rep = card(page, 'Representation');
  await rep.getByRole('button', { name: 'Find An Agent' }).click();
  await page.getByRole('dialog', { name: 'Find An Agent' }).getByRole('button', { name: 'Approach Imogen Vale' }).click();
  await advance(page, 'week');
  await nav(page, 'Profile');
  await rep.getByRole('button', { name: 'Sign With Imogen Vale' }).click();
  await open(page, 'Budget');
  await expect(page.getByRole('button', { name: 'Approach Commissioner' })).toBeDisabled();
  await page.getByRole('group', { name: 'Imogen Vale And The Commissioner' }).getByRole('button', { name: 'Ask Imogen Vale To Submit To The Commissioner' }).click();
  const commissioner = card(page, 'Backers').locator('li', { hasText: /^Commissioner/ });
  for (let i = 0; i < 6 && (await commissioner.getByText('Considering', { exact: true }).count()); i++) { await advance(page, 'week'); await open(page, 'Budget'); }
  await commissioner.getByRole('button', { name: 'Accept Offer' }).click();
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  await expect(commissioner.getByText('Backing', { exact: true })).toBeVisible();

  // Portal is recorded as copyrighted: the story's own option on it, taken for a free adaptation, the rights bought,
  // and the approved draft read and approved by the rights holder, before production can be planned.
  await open(page, 'Budget');
  const rights = card(page, 'Adaptation Rights');
  await rights.getByLabel('How Closely It Follows The Work').selectOption('free');
  await rights.getByRole('button', { name: /^Take The Option For \$/ }).click();
  await rights.getByRole('button', { name: /^Buy The Rights For \$/ }).click();
  await expect(rights).toContainText('Rights Bought');
  await rights.getByRole('group', { name: "The Rights Holder's Approval" }).getByRole('button', { name: /^Send Draft \d+ To The Rights Holder$/ }).click();
  await advance(page, 'week');
  await advance(page, 'next-day');
  await open(page, 'Budget');
  await expect(rights.getByRole('group', { name: "The Rights Holder's Approval" })).toContainText(/They approved draft \d+\./);

  // Made and delivered: the commissioner's decision is now due.
  // Offers are answered in two or three days: the schedule is built once the cast and crew have said yes.
  await castRoles(page, [lead]);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page, [lead]);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await expect.poll(async () => (await project(page)).tasks.length).toBeGreaterThan(0);
  await runToDelivery(page, { weeks: 80 });
  await expect.poll(async () => !!(await project(page))?.delivered, { timeout: 30_000 }).toBe(true);

  // A platform: the broadcaster's or streaming service's offer, accepted.
  const platform = async () => (await project(page)).offers.find((o: { route: string; status: string }) => (o.route === 'broadcast' || o.route === 'streaming') && o.status === 'open');
  for (let i = 0; i < 3 && !(await platform()); i++) await advance(page, 'week');
  const offer = await platform();
  expect(offer, `seed ${SEED}: offers ${JSON.stringify((await project(page)).offers.map((o: { route: string }) => o.route))}`).toBeTruthy();
  await open(page, 'Release');
  const row = card(page, 'Distribution Offers').getByRole('listitem').filter({ hasText: `${offer.distributor}` }).filter({ hasText: offer.route === 'broadcast' ? 'Broadcast release' : 'Streaming release' }).first();
  await row.getByRole('button', { name: /^Accept (Offer|The Late Slot)$/ }).click();
  await expect.poll(async () => (await project(page)).offers.find((o: { id: string }) => o.id === offer.id).status).toBe('accepted');

  // While it airs, the commissioner waits, and says for what.
  await open(page, 'Overview');
  const season = card(page, 'Another Season');
  await expect(season).toContainText(`The commissioner will decide on another season once this one has been shown on ${offer.distributor}.`);

  // Week by week, the audience is reported; once the season has been shown, the commissioner decides on it.
  for (let i = 0; i < 12 && !(await project(page)).renewal; i++) await advance(page, 'month');
  const decided = await project(page);
  const taken = decided.offers.find((o: { id: string }) => o.id === offer.id);
  expect(taken.audience.length).toBeGreaterThan(1);
  expect(new Set(taken.audience.map((a: { episode?: number }) => a.episode)).size).toBeGreaterThanOrEqual(2);
  expect(decided.renewal.reason).toContain('Audience figures are simulated.');
  // Seed 1, as played here: a broadcaster, and a cancellation. Recorded so a change in either is seen, not absorbed.
  expect([offer.route, decided.renewal.outcome]).toEqual(['broadcast', 'cancelled']);
  // The decision is the audience the broadcaster reported (audiences.ts seasonAudience): its first showing against the
  // bar, and the share it kept from one episode to the next against 88%. A season that met both would be renewed.
  const shown = taken.audience.filter((a: { metric: string; episode?: number }) => a.metric === 'viewers' && a.episode !== undefined).sort((a: { episode: number }, b: { episode: number }) => a.episode - b.episode);
  const kept = Math.round((shown.at(-1).value / shown[0].value) * 100);
  expect(decided.renewal.reason).toContain(`drew an average audience of ${shown[0].value.toLocaleString('en-US')}`);
  expect(decided.renewal.reason).toContain(`it kept ${kept}% of its audience from one episode to the next, against 88%`);
  expect(kept).toBeLessThan(88);
  await open(page, 'Release');
  const earned = card(page, 'Earnings');
  const weeks = new Set(taken.audience.map((x: { week: number }) => x.week)).size;
  await earned.getByText(`Weekly Audience (${weeks})`).click();
  await expect(earned).toContainText('Simulated by the game: no real audience figure is shown here.');
  await expect(earned.getByRole('table', { name: `Weekly Audience, ${offer.distributor}` }).locator('tbody tr')).toHaveCount(taken.audience.length);
  await open(page, 'Overview');
  await expect(season).toContainText(decided.renewal.outcome === 'renewed' ? `The commissioner renewed ${TITLE}` : `The commissioner won't make another season of ${TITLE}`);
  await expect(season).not.toContainText('will decide');

  // Season two, from the decision: a renewal brings the commissioner's offer for it; a cancellation shuts their door.
  await season.getByRole('button', { name: 'Start The Next Season' }).click();
  await expect(page.getByRole('heading', { name: `${TITLE}: Season 2`, level: 1 })).toBeVisible();
  await expect.poll(async () => (await project(page, `${TITLE}: Season 2`))?.continues?.from ?? null).toBe(decided.id);
  const next = await project(page, `${TITLE}: Season 2`);
  if (decided.renewal.outcome === 'renewed') {
    expect(next.finance.deals.map((d: { kind: string; status: string }) => [d.kind, d.status])).toEqual([['commissioner', 'offered']]);
  } else {
    await section(page, 'Budget');
    await expect(card(page, 'Raise Money')).toContainText("The commissioner didn't renew the series.");
  }
});
