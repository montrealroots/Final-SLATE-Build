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
  const work = card(page, 'Work For Others');
  const offers = work.getByRole('list', { name: 'Offers Of Work' });
  await expect(offers).toContainText(`${STUDIO} wants you to direct the next Long Road film: $605,000 for 8 weeks of shooting, from January 11, 2027.`);
  await expect(offers).toContainText("Untitled Long Road Film, the studio's own picture, invented by the game.");
  await expect(offers).toContainText('Directing the picture.');
  await offers.getByRole('button', { name: 'Accept Untitled Long Road Film' }).click();
  await expect(work.getByRole('list', { name: 'Work You Have Taken' })).toContainText('Directing: Untitled Long Road Film');
});
