// Representation through the screens (the v3 package, 02; requirement V3-L03): an agent looked for and refused on the
// record, another signed with after reading the terms, a project submitted where the player couldn't go alone, an offer
// accepted with the commission on the project's ledger, the conflict the agent declared, and notice given and served.
// The world seed is fixed (a labelled fixture), so each backer's answer is the same every run.
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { audit } from './ui-audit';
import { addScene, advance, nav, newProject, readSavedState, saveAndApprove, section, seededLife, writePitch } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;

test('an agent: refused on the record, signed with, a submission, commission on the ledger, a declared conflict, and notice', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(480_000);
  const phone = info.project.name !== 'desktop';
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  const rep = card(page, 'Representation');

  // Nobody yet. With nothing written, each agent says what is missing; one is asked anyway, and says no for that reason.
  await nav(page, 'Profile');
  await expect(rep).toContainText('Nobody represents you.');
  await rep.getByRole('button', { name: 'Find An Agent' }).click();
  const find = page.getByRole('dialog', { name: 'Find An Agent' });
  const agent = (name: string) => find.getByRole('listitem').filter({ hasText: name });
  await expect(agent('Imogen Vale')).toContainText('15% Commission');
  await expect(agent('Imogen Vale')).toContainText('On your record today: they would say no. They want to read an approved script first, and you have none yet.');
  await expect(agent('Rafael Montoya')).toContainText('On your record today: they would say no. They take on filmmakers with a delivered project; you have none.');
  await expect(agent('Karl Brandt')).toContainText('Stands aside from commissioners.');
  await expect(agent('Folake Adeyemi')).toContainText('Declares no conflict.');
  if (phone) expect((await audit(page)).defects, 'Find An Agent, on a phone').toEqual([]);
  await find.getByRole('button', { name: 'Approach Rafael Montoya' }).click();
  await expect(find).toHaveCount(0);
  await expect(rep).toContainText(/You asked Rafael Montoya on .+\. Their answer is due .+\./);
  await advance(page, 'week');
  await nav(page, 'Profile');
  await expect(rep).toContainText('Rafael Montoya: They take on filmmakers with a delivered project; you have none.');

  // A project with an approved script and its pitch written. Alone, the commissioner's door is shut.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await writePitch(page);
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  await page.getByLabel('Change Financing Target').fill('600000');
  await page.getByRole('button', { name: 'Set Target' }).click();
  await expect(page.getByRole('button', { name: 'Approach Commissioner' })).toBeDisabled();
  await expect(card(page, 'Raise Money')).toContainText('Deliver a project first.');
  await expect(page.getByRole('group', { name: /And The Commissioner$/ })).toHaveCount(0);

  // Now there is a script to read: the agent for newcomers is asked, offers, and the terms are read before signing.
  await nav(page, 'Profile');
  await rep.getByRole('button', { name: 'Find An Agent' }).click();
  await expect(agent('Imogen Vale')).toContainText('On your record today: they would say yes. You have an approved script for them to read, which is what they look for.');
  // The agent who said no can be asked again, since the record has changed; on it today he would still say no.
  await expect(find.getByRole('button', { name: 'Approach Rafael Montoya' })).toBeEnabled();
  await find.getByRole('button', { name: 'Approach Imogen Vale' }).click();
  await advance(page, 'week');
  await nav(page, 'Profile');
  await expect(rep).toContainText('Imogen Vale of Vale Okafor Associates offers to represent you. You have an approved script for them to read, which is what they look for.');
  await expect(rep).toContainText('Commission: 15% of the money a backer pays into a project on a deal Imogen Vale submitted, taken as each payment arrives.');
  await expect(rep).toContainText('They stand aside from co-production partners.');
  await expect(rep).toContainText("Either of you can end it with 30 days' notice.");
  if (phone) expect((await audit(page)).defects, 'an offer of representation, on a phone').toEqual([]);
  await rep.getByRole('button', { name: 'Sign With Imogen Vale' }).click();
  await expect(rep).toContainText(/Imogen Vale, Vale Okafor Associates, represents you until .+\./);
  await expect(rep.getByRole('button', { name: 'Find An Agent' })).toHaveCount(0);
  await expect(rep).toContainText('Nothing yet. Ask them from a project\'s Budget page, under Raise Money');

  // On the Budget page the agent's line is under each backer they could go to: what it costs, said before the button;
  // where they stand aside, the reason instead.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Ferry' }).click();
  await section(page, 'Budget');
  const toCommissioner = page.getByRole('group', { name: 'Imogen Vale And The Commissioner' });
  await expect(toCommissioner).toContainText('Imogen Vale can submit this for you. If it is signed, 15% of the money as it arrives is their commission, and the offer is theirs to help negotiate.');
  await expect(page.getByRole('group', { name: 'Imogen Vale And The Co-Production Partner' })).toContainText("Imogen Vale stands aside from co-production partners. Her agency also represents co-production companies, so she doesn't bring her own clients' projects to them. You can approach one yourself, and no commission is due.");
  // The player's own way to the commissioner is still shut: the door is the agent's.
  await expect(page.getByRole('button', { name: 'Approach Commissioner' })).toBeDisabled();
  if (phone) expect((await audit(page)).defects, 'the budget page with an agent, on a phone').toEqual([]);
  await toCommissioner.getByRole('button', { name: 'Ask Imogen Vale To Submit To The Commissioner' }).click();
  await page.getByRole('group', { name: 'Imogen Vale And The Private Investor' }).getByRole('button', { name: 'Ask Imogen Vale To Submit To The Private Investor' }).click();
  const backers = card(page, 'Backers');
  const commissioner = backers.locator('li', { hasText: /^Commissioner/ });
  const investor = backers.locator('li', { hasText: /^Private Investor/ });
  await expect(commissioner).toContainText('Submitted by Imogen Vale. 15% of what it pays in is their commission, taken as each payment arrives.');
  await expect(investor).toContainText('Submitted by Imogen Vale.');
  await expect(toCommissioner).toContainText('Already approached for this project.');

  // The investor answers first (two weeks; the commissioner takes four). The offer is accepted when it is made, not
  // after the commissioner's answer: it is open three weeks, and waiting for both left a week's margin that a slower
  // run once used up.
  const considering = async (row: typeof investor) => { await expect(row).toBeVisible(); return (await row.getByText('Considering', { exact: true }).count()) > 0; };
  for (let i = 0; i < 4 && await considering(investor); i++) { await advance(page, 'week'); await section(page, 'Budget'); }
  // Seed 11, as played here: recorded so a change in the answer is seen, not absorbed.
  await expect(investor.getByText('Offer Made', { exact: true })).toBeVisible();
  const state = async () => (await readSavedState(page))?.projects?.find((p: { title: string }) => p.title === 'Night Ferry');
  // The save is written a moment after the screen changes, so the offer is waited for there too.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deal: any;
  await expect.poll(async () => { deal = (await state())?.finance?.deals.find((d: { kind: string }) => d.kind === 'investor'); return deal?.status; }).toBe('offered');
  expect(deal.via).toEqual({ agentId: 'vale', name: 'Imogen Vale', rate: 0.15 });
  await expect(investor).toContainText(`Submitted by Imogen Vale. 15% of what it pays in is their commission, taken as each payment arrives: ${dollars(Math.round(deal.amount * 0.15))} if all of it is paid.`);
  await investor.getByRole('button', { name: 'Accept Offer' }).click();
  const accept = page.getByRole('dialog', { name: 'Accept These Terms?' });
  await expect(accept).toContainText(`${dollars(Math.round(deal.amount * 0.15))} if all of it is paid.`);
  await accept.getByRole('button', { name: /^Accept \$/ }).click();
  await expect(investor.getByText('Backing', { exact: true })).toBeVisible();
  // The commissioner, who read it only because an agent sent it, says no (seed 11).
  for (let i = 0; i < 6 && await considering(commissioner); i++) { await advance(page, 'week'); await section(page, 'Budget'); }
  await expect(commissioner.getByText('Offer Made', { exact: true })).toHaveCount(0);
  await expect(commissioner).toContainText('They have no slot for this project.');

  // The commission is a line on the project's own ledger, and the statement on the profile is that line.
  const fee = Math.round((deal.amount - deal.terms.onDelivery) * 0.15);
  await expect.poll(async () => (await state()).obligations.filter((o: { ref?: string }) => o.ref === `commission:vale:${deal.id}`).map((o: { amount: number; settled: number; state: string; category: string }) => [o.amount, o.settled, o.state, o.category])).toEqual([[fee, fee, 'settled', 'finance']]);
  await nav(page, 'Profile');
  await expect(rep).toContainText(`${dollars(fee)} in all.`);
  await expect(rep).toContainText(new RegExp(`: \\${dollars(fee)} on Night Ferry, from the private investor\\.`));
  const submitted = rep.getByRole('listitem').filter({ hasText: 'Night Ferry' });
  await expect(submitted.filter({ hasText: 'to the private investor' })).toContainText('Signed');
  await expect(submitted.filter({ hasText: 'to the commissioner' })).toContainText('They Said No');
  if (phone) expect((await audit(page)).defects, 'the profile with an agent, submissions and commission, on a phone').toEqual([]);

  // Notice: what it means is said first; it stops new submissions at once and ends thirty days on.
  await rep.getByRole('button', { name: 'Give Notice' }).click();
  const notice = page.getByRole('dialog', { name: 'Give Notice?' });
  await expect(notice).toContainText('Imogen Vale represents you for 30 more days, or until the term ends if that is sooner, and makes no new submissions in that time.');
  if (phone) expect((await audit(page)).defects, 'Give Notice?, on a phone').toEqual([]);
  await notice.getByRole('button', { name: "Give 30 Days' Notice" }).click();
  await expect(rep).toContainText(/You gave notice: it ends on .+, and they make no new submissions\./);
  await expect(rep.getByRole('button', { name: 'Give Notice' })).toHaveCount(0);
  await advance(page, 'month');
  await advance(page, 'week');
  await nav(page, 'Profile');
  await expect(rep).toContainText('Nobody represents you.');
  await expect(rep).toContainText(/Before: Imogen Vale, .+ to .+ \(ended on notice\)\./);
  // What was paid stays on the statement, and another agent can be looked for.
  await expect(rep).toContainText(`${dollars(fee)} in all.`);
  await expect(rep.getByRole('button', { name: 'Find An Agent' })).toBeVisible();
});
