// J17, Worldwide schedule, the steps it didn't run through the screens (docs/v6/JOURNEYS.md: "A deadline at a time-zone
// boundary, and two bookings at once refused"; from November 17, 2026). A player in Tokyo reads a French festival's
// entry deadline in both zones, and the two fall on different days; then two offers of work on the same days, the
// second refused once the first is taken, with the reason under it. Desktop, in Chromium.
import { expect, test } from './test';
import { editSave, nav, newProject, quickLife, section } from './helpers';

test('J17: a deadline read across a day boundary, and two bookings on the same days refused', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One run, at desktop width.');
  test.setTimeout(240_000);
  await quickLife(page, 'jp-tokyo', '2026-03-02');

  // A French festival's deadline, read from Tokyo: its local date and the player's are different days.
  await newProject(page, { title: 'Across The Line', format: 'Short Film', runtime: '8', budget: 'Low Budget' });
  await section(page, 'Festivals And Awards');
  await page.getByRole('button', { name: /Clermont-Ferrand/ }).first().click();
  const close = page.locator('dt', { hasText: /^Entries Close$/ }).locator('xpath=following-sibling::dd[1]');
  const text = (await close.innerText()).trim();
  const m = /^(?<date>.+), (?<time>\d{1,2}:\d\d [AP]M) local time \((?<weekday>\w+) (?<mine>\d{1,2}:\d\d [AP]M) your time\)$/.exec(text);
  expect(m, text).not.toBeNull();
  // Tokyo is eight hours ahead of France in winter, seven in summer, so a deadline late in the French evening is the next
  // morning in Tokyo: the organizer's date falls on another weekday than the player's.
  const theirs = new Date(`${m!.groups!.date} 12:00 UTC`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
  expect(theirs, text).not.toBe(m!.groups!.weekday);
  expect(m!.groups!.mine, text).toMatch(/AM$/);

  // Two offers of work on the same days (labelled fixture: the world rarely draws two at once).
  await nav(page, 'Home');
  const offer = (id: string, production: string) => ({ id, role: 'acting', production, company: `${production} Productions (Fixture)`, dayRate: 400, days: ['2026-04-06', '2026-04-07'], placeId: 'jp-tokyo', zone: 'Asia/Tokyo', status: 'offered', offeredAt: Date.parse('2026-03-02T00:00:00Z'), answerBy: Date.parse('2026-03-20T00:00:00Z'), attended: [], missed: [] });
  await editSave(page, (state) => { state.jobs = [...(state.jobs ?? []), offer('job-fx-a', 'First Light'), offer('job-fx-b', 'Second Wind')]; });
  await nav(page, 'Profile');
  const offers = page.getByRole('list', { name: 'Offers Of Work' });
  await expect(page.getByRole('button', { name: 'Accept Second Wind' })).toBeEnabled();
  await page.getByRole('button', { name: 'Accept First Light' }).click();
  await expect(page.getByRole('list', { name: 'Work You Have Taken' })).toContainText('First Light');
  // The second is on the same days: refused, and says why.
  await expect(page.getByRole('button', { name: 'Accept Second Wind' })).toBeDisabled();
  await expect(offers.locator('li', { hasText: 'Second Wind' })).toContainText("You're working on First Light on April 6, 2026.");
});
