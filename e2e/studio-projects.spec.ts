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
