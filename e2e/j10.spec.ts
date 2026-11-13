// J10 as one run (the v4 package, 05: "External acting/writing/directing offer -> agent negotiation -> scheduling -> paid
// work -> credit/reputation -> new relevant offer. Multi-role conflicts cannot be bypassed"; ledger V4-038.10). The world
// seed is pinned (a labelled fixture), so the agent's searches come out the same every run.
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { addScene, advance, nav, newProject, readSavedState, saveAndApprove, section, seededLife } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });

test('J10: an agent finds work, it is taken, worked, paid and credited; another comes; your own shoot is planned around it', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'One whole career run, at desktop width.');
  test.setTimeout(480_000);
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  await nav(page, 'Projects');
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines'], minutes: '3' });
  await saveAndApprove(page);

  // An agent, approached and signed.
  await nav(page, 'Profile');
  const rep = card(page, 'Representation');
  await rep.getByRole('button', { name: 'Find An Agent' }).click();
  await page.getByRole('dialog', { name: 'Find An Agent' }).getByRole('button', { name: 'Approach Imogen Vale' }).click();
  await advance(page, 'week');
  await nav(page, 'Profile');
  await rep.getByRole('button', { name: 'Sign With Imogen Vale' }).click();

  // The agent's offer, with their share; taken; its days on the calendar; worked, paid less commission, credited.
  const work = card(page, 'Work For Others');
  const offers = work.getByRole('list', { name: 'Offers Of Work' });
  for (let i = 0; i < 16 && !(await offers.count()); i++) { await advance(page, 'week'); await nav(page, 'Profile'); }
  await expect(offers).toContainText(/less 15% to Imogen Vale, who found it\./);
  const first = (await offers.getByRole('button', { name: /^Accept / }).first().getAttribute('aria-label'))!.replace(/^Accept /, '');
  await offers.getByRole('button', { name: `Accept ${first}` }).click();
  const credits = work.getByRole('list', { name: 'Your Credits For Others' });
  for (let i = 0; i < 8 && !(await credits.count()); i++) { await advance(page, 'week'); await nav(page, 'Profile'); }
  await expect(credits).toContainText(first);
  await expect(card(page, 'Your Reputation')).toContainText('Nothing against you: no work withdrawn from, no day missed.');

  // The agent keeps looking: another offer, for work the record supports.
  const isNew = async () => (await readSavedState(page)).jobs.some((j: { production: string; status: string }) => j.status === 'offered' && j.production !== first);
  for (let i = 0; i < 12 && !(await isNew()); i++) { await advance(page, 'week'); await nav(page, 'Profile'); }
  const second = (await readSavedState(page)).jobs.find((j: { production: string; status: string }) => j.status === 'offered' && j.production !== first);
  expect(second.role).toBe('acting'); // nothing delivered yet: acting is what the record supports
  await offers.getByRole('button', { name: `Accept ${second.production}` }).click();

  // Your own shoot aimed at the second job: built once to see where its first shoot day falls after prep, then started
  // again so that day would be the job's first. No shoot day falls on a day you are working; the shoot goes round it.
  const shift = (key: string, days: number) => new Date(Date.parse(`${key}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
  const build = async (start: string) => {
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Night Ferry' }).first().click();
    await section(page, 'Schedule');
    await page.getByLabel('Production Start').fill(start);
    await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
    await expect.poll(async () => (await readSavedState(page)).projects[0].schedule.startDate).toBe(start);
    return (await readSavedState(page)).projects[0].schedule.days.map((d: { date: string }) => d.date) as string[];
  };
  // Started on each of the fourteen days before the job, at least one would put a shoot day on it were the job not
  // in the way (the game's prep is a week or two); none does.
  for (let back = 14; back >= 1; back--) {
    const days = await build(shift(second.days[0], -back));
    expect(days.length).toBeGreaterThan(0);
    expect(days.filter((d) => second.days.includes(d)), `starting ${back} days before`).toEqual([]);
  }
});
