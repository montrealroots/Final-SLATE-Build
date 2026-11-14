// Work for others through the interface (the v4 package, 01; ledger V4-010; part of J10): an agent signed on an approved
// script looks for work, an offer arrives with its days, pay and the agent's share, it is taken, its days go on the
// calendar and are worked, the pay arrives in the player's account less commission, and the credit is listed. The world
// seed is fixed (a labelled fixture), so the agent's searches come out the same every run. The rules are the engine's
// (tests/jobs.test.ts).
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { addScene, advance, nav, newProject, personalPostingsOf, readSavedState, saveAndApprove, section, seededLife } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });

test('an agent finds paid work: offered with its days and their share, taken, worked on the calendar, paid and credited', async ({ page }) => {
  test.setTimeout(480_000);
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  // An approved script, so an agent for newcomers will read it.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines'], minutes: '3' });
  await saveAndApprove(page);
  await nav(page, 'Profile');
  // How the industry reads the record (reputation.ts): nothing delivered, nothing against them.
  const reputation = page.getByRole('definition').filter({ hasText: /./ });
  await expect(card(page, 'Your Reputation')).toContainText('DirectingNo delivered work in this role yet.');
  await expect(card(page, 'Your Reputation')).toContainText('Nothing against you: no work withdrawn from, no day missed.');
  expect(await reputation.count()).toBeGreaterThan(0);
  const work = card(page, 'Work For Others');
  await expect(work).toContainText('None yet.');
  const rep = card(page, 'Representation');
  await rep.getByRole('button', { name: 'Find An Agent' }).click();
  await page.getByRole('dialog', { name: 'Find An Agent' }).getByRole('button', { name: 'Approach Imogen Vale' }).click();
  await advance(page, 'week');
  await nav(page, 'Profile');
  await rep.getByRole('button', { name: 'Sign With Imogen Vale' }).click();

  // The agent looks every few weeks; an offer names its days, its pay and their share.
  const offers = work.getByRole('list', { name: 'Offers Of Work' });
  for (let i = 0; i < 16 && !(await offers.count()); i++) { await advance(page, 'week'); await nav(page, 'Profile'); }
  await expect(offers).toContainText('an invented production');
  await expect(offers).toContainText(/\d+ days, .+ to .+, \$[\d,]+ a day: \$[\d,]+ if every day is worked, less 15% to Imogen Vale, who found it\./);
  const production = (await offers.getByRole('button', { name: /^Accept / }).first().getAttribute('aria-label'))!.replace(/^Accept /, '');
  await offers.getByRole('button', { name: `Accept ${production}` }).click();
  await expect(work.getByRole('list', { name: 'Work You Have Taken' })).toContainText(production);
  // Its days are on the calendar, one plan each morning (the phone's calendar shows a day at a time, so the save is read).
  await expect.poll(async () => {
    const st = await readSavedState(page);
    // The job taken, not an earlier offer on the same production that lapsed unanswered (CI on d55fc45, production phone:
    // a slow run let the first offer on Late Weather lapse, and a second, of 7 days, was the one taken).
    const j = st?.jobs?.find((x: { production: string; status: string }) => x.production === production && x.status === 'accepted');
    return !!j && st.plans.filter((x: { title: string; status: string }) => x.title.endsWith(`On ${production}`) && x.status === 'upcoming').length === j?.days.length;
  }).toBe(true);

  // Worked to the end: the pay comes in, less commission, and the credit is listed.
  const credits = work.getByRole('list', { name: 'Your Credits For Others' });
  // The work is on a production's shooting days, which can be some months out (productions.ts, from November 13, 2026).
  for (let i = 0; i < 20 && !(await credits.count()); i++) { await advance(page, 'week'); await nav(page, 'Profile'); }
  await expect(credits).toContainText(production);
  const mine = card(page, 'Your Money');
  await expect(mine.getByRole('list', { name: 'Your Account, By What It Is' })).toContainText("Paid For Work On Others' Productions");
  await expect(mine.getByRole('list', { name: 'Your Account, By What It Is' })).toContainText('Commission To Your Agent');
  const saved = await readSavedState(page);
  // The job taken, as above: a slow run can let an earlier offer on the same production lapse (CI on 55da9cc, production
  // phone: the first job named for it read "lapsed" while the one taken was done).
  const job = saved.jobs.find((j: { production: string; status: string }) => j.production === production && j.status !== 'lapsed');
  expect(job.status).toBe('done');
  const paid = personalPostingsOf(saved).filter((x: { key: string }) => x.key === `job:${job.id}`).map((x: { amount: number }) => x.amount);
  expect(paid).toEqual([job.dayRate * job.attended.length]);
  const commission = personalPostingsOf(saved).filter((x: { key: string }) => x.key === `job-commission:${job.id}`).map((x: { amount: number }) => x.amount);
  expect(commission).toEqual([-Math.round(paid[0] * 0.15)]);
});
