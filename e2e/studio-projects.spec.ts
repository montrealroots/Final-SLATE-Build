// A studio asks you onto its own picture (from November 18, 2026; studio-projects.ts), through the screens: the offer on
// the Profile in the studio's own words, then taken, its days on your work. Labelled fixture: the offer is written into
// the save as studioProjectOffer makes it (tests/studio-projects.test.ts makes it from a record), from a made-up studio.
import { expect, test, type Page } from './test';
import { editSave, nav, quickLife } from './helpers';

const STUDIO = 'Overdrive Pictures (Fixture)';
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const weekdays = (from: string, n: number): string[] => {
  const out: string[] = [];
  for (let d = new Date(`${from}T12:00:00Z`); out.length < n; d.setUTCDate(d.getUTCDate() + 1)) if (d.getUTCDay() % 6 !== 0) out.push(d.toISOString().slice(0, 10));
  return out;
};

test('a studio asks you to direct the next film in its franchise: said in its words, taken, its days on your work', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(300_000);
  await quickLife(page, 'us-los-angeles', '2026-11-12');
  await editSave(page, (s) => {
    const days = weekdays('2027-01-11', 40);
    (s.jobs ??= []).push({
      id: 'studio-fixture', role: 'directing', production: 'Untitled Long Road Film', company: STUDIO,
      part: 'Directing the picture', material: "The Long Road films so far, and the studio's notes for the next one.", requirement: 'On set in Los Angeles each shooting day.',
      dayRate: 15_125, days, placeId: s.locationId, zone: 'America/Los_Angeles', status: 'offered', offeredAt: s.now, answerBy: s.now + 7 * 86_400_000,
      attended: [], missed: [], studio: { fee: 605_000, franchise: 'Long Road', genre: 'Action' },
    });
  });
  await nav(page, 'Profile');
  // A record just starting is told what brings studio offers (studio-projects.ts STUDIO_REACH).
  await expect(page.getByLabel('Studio Pictures')).toContainText("No studio offers yet: they come once you're Established in this role.");
  await expect(card(page, 'Your Reputation')).toContainText('A win can bring a studio calling within weeks.');
  const work = card(page, 'Work For Others');
  const offers = work.getByRole('list', { name: 'Offers Of Work' });
  await expect(offers).toContainText(`${STUDIO} wants you to direct the next Long Road film: $605,000 for 8 weeks of shooting, from January 11, 2027.`);
  await expect(offers).toContainText("Untitled Long Road Film, the studio's own picture, invented by the game.");
  await expect(offers).toContainText('Directing the picture.');
  await offers.getByRole('button', { name: 'Accept Untitled Long Road Film' }).click();
  await expect(work.getByRole('list', { name: 'Work You Have Taken' })).toContainText('Directing: Untitled Long Road Film');
});

// A multi-picture deal (from November 18, 2026): the studio whose picture you made offers its next two, said in its words
// with each picture's fee, and taken like any offer. Labelled fixture, as above: the offer is written as studioProjectOffer
// makes it (tests/studio-projects.test.ts "multi-picture deals").
test('a studio you made a picture for offers a two-picture deal, said with both fees, and taken', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(300_000);
  await quickLife(page, 'us-los-angeles', '2026-11-12');
  await editSave(page, (s) => {
    const days = weekdays('2027-01-11', 40);
    (s.jobs ??= []).push({
      id: 'studio-deal-fixture', role: 'directing', production: 'Untitled Long Road Film', company: STUDIO,
      part: 'Directing the picture', material: "The Long Road films so far, and the studio's notes for the next one.", requirement: 'On set in Los Angeles each shooting day.',
      dayRate: 17_400, days, placeId: s.locationId, zone: 'America/Los_Angeles', status: 'offered', offeredAt: s.now, answerBy: s.now + 7 * 86_400_000,
      attended: [], missed: [],
      studio: { fee: 696_000, franchise: 'Long Road', genre: 'Action', why: 'You directed its last Long Road film, and it wants you back.', deal: { picture: 1, of: 2, fees: [696_000, 800_000] } },
    });
  });
  await nav(page, 'Profile');
  await expect(page.getByLabel('Studio Pictures').locator('..')).toContainText('comes back with a deal for its next two');
  const offers = card(page, 'Work For Others').getByRole('list', { name: 'Offers Of Work' });
  await expect(offers).toContainText(`${STUDIO} offers you a two-picture deal to direct: the next Long Road film for $696,000, 8 weeks of shooting from January 11, 2027, then its next picture for $800,000. Each picture comes a month after the one before is done; declining one ends the deal. You directed its last Long Road film, and it wants you back.`);
  await offers.getByRole('button', { name: 'Accept Untitled Long Road Film' }).click();
  await expect(card(page, 'Work For Others').getByRole('list', { name: 'Work You Have Taken' })).toContainText('Directing: Untitled Long Road Film');
});

// The studio's franchises on its page (from November 18, 2026): Toho's Godzilla films from the records, then the picture
// you made, under the title the studio releases it as; and the picture's own page. Labelled fixture: the studio's profile and the finished picture
// are written into the save as the build (tools/screen-catalog/franchises.mjs) and the engine (jobs.ts) write them.
test("a studio's franchise on its page: its recorded films, then the picture you made, titled and dated", async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(300_000);
  await quickLife(page, 'jp-tokyo', '2026-11-12');
  await editSave(page, (s) => {
    s.industry = { ...(s.industry ?? { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {} }), studios: [{
      c: 'company:toho', name: 'TOHO', n: 26.8, g: [['Drama', 10], ['Science Fiction', 6]], m: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], ann: {},
      fr: [{ name: 'Godzilla Minus Collection', entries: 2, last: '2026-11-03', budget: 15_000_000, budgetOf: 'Godzilla Minus Zero (2026)',
        films: [{ r: 'movie:940721', t: 'Godzilla Minus One', d: '2023-11-03' }, { r: 'movie:1381071', t: 'Godzilla Minus Zero', d: '2026-11-03' }] }],
    }] };
    (s.jobs ??= []).push({
      id: 'studio-made', role: 'directing', production: 'Untitled Godzilla Film', company: 'TOHO', part: 'Directing the picture', material: '', requirement: '',
      dayRate: 18_750, days: weekdays('2027-01-12', 40), placeId: s.locationId, zone: 'Asia/Tokyo', status: 'done', offeredAt: s.now, answerBy: s.now,
      attended: weekdays('2027-01-12', 40), missed: [], studio: { fee: 750_000, franchise: 'Godzilla', genre: 'Science Fiction', genres: ['Science Fiction', 'Action'], budget: 15_000_000, title: 'Godzilla: Burning Tide', released: '2026-09-01', quality: 76,
        honours: [{ status: 'nominated', category: 'Visual Effects', recipient: 'craft', event: 'An Awards Fixture 2026', at: s.now }] },
    });
  });
  await nav(page, 'Companies');
  await card(page, 'Independent Studios, Japan: Film').getByRole('button', { name: 'TOHO', exact: true }).click();
  const franchises = card(page, 'Franchises');
  const godzilla = franchises.getByRole('list', { name: 'Godzilla Films' });
  await expect(godzilla.getByRole('listitem')).toHaveText([/^Godzilla Minus One\s*2023$/, /^Godzilla Minus Zero\s*2026$/, /^Godzilla: Burning Tide Your Picture You directed it\.\s*Released September 1, 2026$/]);
  // Its page, like the catalog's films: what it is, its run in cinemas (ten of its 14 weeks ended by November 12),
  // its honours, and its people, you among them. Clicked from the foot of the studio's page, it opens at its top: until
  // November 18, 2026 a new page kept the scroll of the one before and opened at its crew.
  await page.evaluate(() => { window.scrollTo(0, document.documentElement.scrollHeight); const m = document.getElementById('main'); if (m) m.scrollTop = m.scrollHeight; });
  await godzilla.getByRole('button', { name: 'Godzilla: Burning Tide' }).click();
  await expect(page.getByRole('heading', { name: 'Godzilla: Burning Tide', level: 1 })).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY + (document.getElementById('main')?.scrollTop ?? 0))).toBe(0);
  await expect(card(page, 'About')).toContainText('You directed it for TOHO.');
  await expect(card(page, 'Box Office')).toContainText('So Far');
  await expect(card(page, 'Box Office')).toContainText('10, still showing');
  await expect(card(page, 'Box Office').getByRole('list', { name: 'Weeks' }).getByRole('listitem')).toHaveCount(10);
  await expect(card(page, 'Awards And Festivals')).toContainText('Visual Effects, An Awards Fixture 2026');
  await expect(page.getByRole('list', { name: 'Cast' }).getByRole('listitem')).toHaveCount(8);
  await expect(page.getByRole('list', { name: 'Crew' }).getByRole('listitem').filter({ hasText: 'Director' }).first()).toContainText('You');
});
