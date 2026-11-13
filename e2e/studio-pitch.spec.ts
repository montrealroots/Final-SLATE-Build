// Milestone F of the Creative Depth package (docs/creative-depth), J08, through visible controls only: one horror film
// is put to two studios with different records, which answer differently and say why; the one that wants it options it
// with its terms and its territories shown; the film is made and delivered; the studio opens it at home and then abroad
// two weeks later; the player pays for a dubbed version abroad; and the studio is repaid from what it reports.
// Both studios are made-up fixtures, and the world seed is fixed (labelled fixture).
import { expect, test, type Page } from './test';
import { CATALOG_FIXTURE, serveCatalog } from './catalog-fixture';
import { addScene, advance, castRoles, nav, pinSeed, quickLife, readSavedState, runToDelivery, saveAndExit, section, staffEveryDepartment, writePitch } from './helpers';
import { audit } from './ui-audit';

test.use({ actionTimeout: 20_000 });

const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const NIGHT = 'Night Shift Pictures (Fixture)';
const LANTERN = 'Lantern Animation (Fixture)';
const STUDIOS = [
  { c: 'company:fixture-horror', name: NIGHT, n: 5, g: [['Horror', 10], ['Thriller', 6], ['Drama', 2]], m: EVEN, ann: {} },
  { c: 'company:fixture-animation', name: LANTERN, n: 9, g: [['Animation', 9], ['Family', 9], ['Comedy', 6]], m: EVEN, ann: {} },
];
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
type Release = { id: string; date: string; territories: string[]; status: string; offerId?: string; version?: string; note: string };

test('J08: a horror film pitched to two studios, optioned by one for its reasons, made, opened at home and then abroad, dubbed, and the studio repaid', async ({ page }, info) => {
  test.skip(!['desktop', 'iphone-15-pro-max'].includes(info.project.name), 'One full production, on desktop and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(1_500_000);
  await serveCatalog(page, {}, { 'world.json': { ...(CATALOG_FIXTURE['world.json'] as object), studios: STUDIOS } });
  await quickLife(page, 'us-los-angeles', '2026-11-12');
  await expect.poll(async () => (await readSavedState(page)).industry?.studios?.length, { timeout: 20_000 }).toBe(2);
  await pinSeed(page, Number(process.env.PITCH_SEED ?? 3));

  await page.getByRole('button', { name: 'New Project' }).first().click();

  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('The Long Night');
  await page.getByLabel('Format').selectOption({ label: 'Feature Film' });
  await page.getByLabel(/Target Runtime In Minutes/).fill('90');
  await page.getByRole('radio', { name: /^Low Budget:/ }).check();
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('horror');
  await page.getByRole('button', { name: 'Add Horror', exact: true }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'The Long Night', level: 1 })).toBeVisible();
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines'); await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Depot', chars: ['Ines'], minutes: '45' });
  await addScene(page, { index: 1, place: 'Tram', chars: ['Ines'], minutes: '45' });
  await writePitch(page);
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();

  // Two studios, two reads, each with its reasons, before anything is sent.
  await section(page, 'Budget');
  const pitch = card(page, 'Pitch To A Studio');
  const night = pitch.getByRole('listitem', { name: NIGHT });
  const lantern = pitch.getByRole('listitem', { name: LANTERN });
  await expect(night.locator('.chip')).toHaveText('Would Option It');
  await expect(night).toContainText('It makes this kind of film: Horror is 56% of its genre credits.');
  await expect(night).toContainText("You haven't delivered a film yet.");
  await expect(night).toContainText('A first film gets development money and a release, not the whole budget: raise the rest elsewhere.');
  await expect(lantern.locator('.chip')).toHaveText('Would Pass');
  await expect(lantern).toContainText("Lantern Animation (Fixture) is an animation studio: Animation is the largest part of its record, 38% of its genre credits. A live-action film isn't what it makes.");
  await expect(lantern).toContainText("Night Shift Pictures (Fixture)'s record is the nearer fit for it.");
  await night.getByText(`What ${NIGHT} Makes`).click();
  await expect(night).toContainText('About 5 films a year, as recorded when your story\'s world began; it can carry about 8.');
  await expect(night).toContainText('Modeled, not recorded: it releases a film in your home country and four large markets.');
  await page.screenshot({ path: `test-results/studio-pitch-${info.project.name}-01-reads.png`, fullPage: true });
  expect(await noSidewaysScroll(page)).toBe(true);
  await page.getByRole('button', { name: `Pitch To ${NIGHT}` }).click();
  await page.getByRole('button', { name: `Pitch To ${LANTERN}` }).click();
  await expect(night).toContainText('It has this project in front of it now.');
  for (let i = 0; i < 3; i++) await advance(page, 'week');

  // One optioned it, one passed, each for the reasons it gave; the option's terms are read before accepting.
  await section(page, 'Budget');
  const backers = card(page, 'Backers');
  const optioned = backers.locator('li', { hasText: NIGHT }).first();
  await expect(optioned).toContainText('$60,000');
  await expect(optioned.locator('.chip').first()).toHaveText('Offer Made');
  await expect(optioned).toContainText('They release it in cinemas in your home country and 4 other territories, each territory on its own date, and hold those rights for a year. They pay for the delivery materials and the subtitles.');
  const passed = backers.locator('li', { hasText: LANTERN }).first();
  await expect(passed.locator('.chip').first()).toHaveText('Said No');
  await expect(passed).toContainText('It passed. Lantern Animation (Fixture) is an animation studio');
  await optioned.getByRole('button', { name: 'Accept Offer' }).click();
  const terms = page.getByRole('dialog', { name: 'Accept These Terms?' });
  await expect(terms).toContainText(`${NIGHT} backs The Long Night with $60,000 on these terms:`);
  await expect(terms).toContainText('They approve the final cut before you can lock picture.');
  await terms.getByRole('button', { name: /^Accept \$/ }).click();
  await expect(optioned.locator('.chip').first()).toHaveText('Backing');
  // The rest of the budget is the player's to raise: the agreed starting backing.
  await page.getByRole('button', { name: 'Approach Starting Backing' }).click();
  await backers.locator('li', { hasText: 'Starting Backing' }).getByRole('button', { name: 'Accept Offer' }).click();
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  await expect(card(page, 'Financing').locator('dt', { hasText: /^Still To Raise$/ }).locator('xpath=following-sibling::dd[1]')).toHaveText('$0');

  // Made and delivered.
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 90 });
  await expect.poll(async () => !!(await readSavedState(page)).projects[0]?.delivered, { timeout: 30_000 }).toBe(true);

  // The studio sets the release: home first, then four territories two weeks later, each a release of its own.
  const mine = async (): Promise<Release[]> => ((await readSavedState(page)).projects[0].releases as Release[]).filter((r) => r.offerId);
  await expect.poll(async () => (await mine()).length, { timeout: 30_000 }).toBe(2);
  const [home, abroad] = await mine();
  expect([home.territories, abroad.territories]).toEqual([['US'], ['GB', 'FR', 'DE', 'ES']]);
  expect(Date.parse(abroad.date) - Date.parse(home.date)).toBe(14 * 86_400_000);
  await section(page, 'Release');
  const history = card(page, 'Release History');
  await expect(history).toContainText(`Released by ${NIGHT}, which backed the film.`);
  await expect(history.getByRole('button', { name: 'Cancel Release' })).toHaveCount(0); // its openings aren't the player's to cancel
  // Abroad it is subtitled unless the player pays for a dub, whose cost and effect are stated first.
  const version = history.getByLabel('Version In United Kingdom, France, Germany, Spain');
  await expect(version).toHaveValue('subtitled');
  await expect(history).toContainText(`A dubbed version is yours to pay for: $37,800, set aside now and paid on release. Where it is dubbed, a territory counts for 1.5 in ${NIGHT}'s reports, against 1 subtitled.`);
  await version.selectOption('dubbed');
  await expect.poll(async () => (await mine())[1].version, { timeout: 30_000 }).toBe('dubbed');
  await page.screenshot({ path: `test-results/studio-pitch-${info.project.name}-02-release.png`, fullPage: true });
  expect(await noSidewaysScroll(page)).toBe(true);

  // Saved, closed and opened again: the deal, its read and the release plan are there.
  const check = async () => {
    const p = (await readSavedState(page)).projects[0];
    const deal = p.finance.deals.find((d: { kind: string }) => d.kind === 'studio' && (d as { status?: string }).status === 'accepted');
    expect(deal.studio).toMatchObject({ company: 'company:fixture-horror', verdict: 'option', territories: ['US', 'GB', 'FR', 'DE', 'ES'], window: null, v: 1 });
    expect(p.releases.filter((r: Release) => r.offerId).map((r: Release) => r.version ?? 'none')).toEqual(['none', 'dubbed']);
  };
  await check();
  await saveAndExit(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await check();

  // It opens at home, then abroad; the dub is paid on that day; and the studio is repaid from what it reports.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'The Long Night' }).first().click();
  for (let i = 0; i < 8; i++) await advance(page, 'month');
  const s = await readSavedState(page);
  const p = s.projects[0];
  expect(p.releases.filter((r: Release) => r.offerId).map((r: Release) => r.status)).toEqual(['released', 'released']);
  const offer = p.offers.find((o: { studioDeal?: string }) => o.studioDeal);
  expect(offer.minimumGuarantee).toBe(0);
  expect(offer.reported.gross).toBeGreaterThan(0);
  const deal = p.finance.deals.find((d: { kind: string; status: string }) => d.kind === 'studio' && d.status === 'accepted');
  expect(deal.repaid).toBeGreaterThan(0);
  const dub = p.obligations.find((o: { ref?: string }) => o.ref?.startsWith('dub:'));
  expect([dub.amount, dub.settled]).toEqual([37_800, 37_800]);
  const logs: string[] = s.log.map((l: { text: string }) => l.text);
  expect(logs.some((t) => t.includes(`repaid to ${NIGHT}`))).toBe(true);
  expect(logs.some((t) => /the night shift pictures/i.test(t))).toBe(false); // named as a company, never "the ..." in lowercase
  await section(page, 'Budget');
  await expect(card(page, 'Backers').locator('li', { hasText: NIGHT }).first()).toContainText(/Repaid so far: \$[\d,]+ of \$60,000\./);

  // Its weeks in cinemas (box-office.ts): twenty-four, all settled, adding up to what the studio reported; and the weeks
  // before it opened abroad were corrected when the first month's report came, which the table says.
  type Week = { week: number; rental: number; status: string; territories: number; first?: number; screens?: number; next?: string };
  const weeks: Week[] = offer.weeks;
  expect(weeks.map((w) => w.week)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
  expect(weeks.every((w) => w.status === 'final' && w.rental % 100 === 0)).toBe(true);
  expect(weeks.reduce((n, w) => n + w.rental, 0)).toBe(offer.reported.gross);
  expect([weeks[0].territories, weeks[1].territories, weeks[2].territories]).toEqual([1, 5, 5]); // it opens abroad the day its second week ends
  expect(weeks.slice(0, 4).some((w) => w.first !== undefined)).toBe(true);
  await section(page, 'Release');
  const earnings = card(page, 'Earnings');
  const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;
  await earnings.getByText('Weeks In Cinemas (24)').click();
  await expect(earnings).toContainText('Simulated by the game: no real box office is shown here. Ticket sales are not what you earn. Cinemas keep 50% of them');
  const table = earnings.getByRole('table', { name: `Weeks In Cinemas, ${NIGHT}` });
  await expect(table.locator('tbody tr')).toHaveCount(24);
  await expect(table.locator('tbody tr').first()).toContainText(dollars(weeks[0].rental * 2)); // ticket sales: the rental is half of them
  // The screens it played on each week and what the cinemas decided (box-office.ts holdover), as the save has them.
  await expect(table.locator('tbody tr').first().locator('td[data-label="Screens"]')).toHaveText(String(weeks[0].screens));
  await expect(table.locator('tbody tr').first().locator('td[data-label="Next Week"]')).toHaveText(({ expanded: 'Expanded', held: 'Held', cut: 'Screens Cut', withdrawn: 'Withdrawn' } as Record<string, string>)[weeks[0].next!]);
  await expect(table.locator('tfoot')).toContainText(dollars(offer.reported.gross * 2));
  await expect(table.locator('tfoot')).toContainText(dollars(offer.reported.gross));
  await expect(table.locator('tfoot')).toContainText(dollars(offer.reported.net));
  const corrected = weeks.find((w) => w.first !== undefined)!;
  await expect(table.locator('tbody tr').nth(corrected.week - 1)).toContainText(`first reported as ${dollars(corrected.first!)} in rental`);
  await page.screenshot({ path: `test-results/studio-pitch-${info.project.name}-03-weeks.png`, fullPage: true });
  if (info.project.name !== 'desktop') expect((await audit(page)).defects, 'the weeks in cinemas, on a phone').toEqual([]);
  expect(await noSidewaysScroll(page)).toBe(true);
  // And the record book on the profile is those weeks: its only film, first in both lists.
  await nav(page, 'Profile');
  const book = card(page, 'Box Office Records');
  await expect(book).toContainText('Simulated by the game, and only what happened in this story: no real box office is in these records.');
  await expect(book.getByRole('listitem').filter({ hasText: 'The Long Night' })).toContainText(`Opening week ${dollars(weeks[0].rental * 2)} (1st). Lifetime ${dollars(offer.reported.gross * 2)} (1st) from ${((offer.reported.gross * 2) / 10).toLocaleString('en-US')} admissions over`);
  await page.screenshot({ path: `test-results/studio-pitch-${info.project.name}-04-record-book.png`, fullPage: true });
  if (info.project.name !== 'desktop') expect((await audit(page)).defects, 'the record book, on a phone').toEqual([]);
});
