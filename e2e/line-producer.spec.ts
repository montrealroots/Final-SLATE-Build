// The line producer's mandate through the screens (the v3 package, 02; requirement V3-L02): hired, asked to negotiate
// a counteroffer with its cost said first, what they brought back shown, and the answer still the player's.
import type { Page } from '@playwright/test';
import { expect, test } from './test';
import { audit } from './ui-audit';
import { addScene, advance, nav, newProject, quickLife, readSavedState, saveAndApprove, section } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;

test('a line producer negotiates a counteroffer: asked with its cost, the answer brought back, and accepting still the player\'s', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(420_000);
  const phone = info.project.name !== 'desktop';
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await newProject(page, { title: 'The Rate', format: 'Short Film', runtime: '8', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Ada'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Harbour', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);

  // The save is written a moment after the screen changes, so what is read from it is waited for.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saved = async (read: (pr: any) => any, timeout = 15_000): Promise<any> => { let got: any; await expect.poll(async () => { const pr = (await readSavedState(page))?.projects?.[0]; got = pr ? read(pr) : undefined; return !!got; }, { timeout }).toBe(true); return got; };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = async (): Promise<any> => saved((pr) => pr);
  const row = (role: string) => page.getByRole('listitem').filter({ has: page.getByText(role, { exact: true }) });
  const hires = card(page, 'Crew Offers And Contracts');

  // The job is on the Crew page, optional, and its department has nothing for Staff This Department to hire.
  await section(page, 'Crew');
  await expect(row('Line Producer')).toContainText('Optional');
  await expect(row('Line Producer')).toContainText('Negotiates a counteroffer when you ask, for one of their days');
  await expect(card(page, 'Producing').getByRole('button', { name: 'Staff This Department' })).toHaveCount(0);
  await expect(card(page, 'Camera').getByRole('button', { name: 'Staff This Department' })).toBeVisible();

  // Hire one at what they ask: the next candidate is asked until one accepts.
  const hired = async () => (await project()).hires.find((h: { roleId: string; status: string }) => h.roleId === 'line-producer' && h.status === 'accepted');
  const lineProducer = (pr: { hires: { roleId: string; status: string }[] }) => pr.hires.find((h) => h.roleId === 'line-producer' && h.status === 'accepted');
  for (let i = 0; i < 6 && !(await hired()); i++) {
    await section(page, 'Crew');
    const counter = hires.getByRole('button', { name: 'Accept Counteroffer' });
    if (await counter.count()) { await counter.first().click(); continue; }
    if ((await row('Line Producer').getByText('Not Hired').count()) > 0) {
      await row('Line Producer').getByRole('button', { name: 'Find Candidates' }).click();
      const dialog = page.getByRole('dialog', { name: 'Hire A Line Producer' });
      await dialog.getByRole('button', { name: 'Make Offer' }).nth(i % 3).click();
      if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await advance(page, 'next-day');
  }
  const lp = await saved(lineProducer, 30_000);

  // A director of photography is offered four fifths of what they ask, and answers with a counteroffer.
  await section(page, 'Crew');
  await row('Director Of Photography').getByRole('button', { name: 'Find Candidates' }).click();
  const dialog = page.getByRole('dialog', { name: 'Hire A Director Of Photography' });
  const first = dialog.getByRole('listitem').first();
  const name = (await first.locator('strong').first().textContent())!;
  const ask = Number((await first.getByText(/Asks \$[\d,]+ a day\./).textContent())!.match(/Asks \$([\d,]+)/)![1].replace(/,/g, ''));
  const offered = Math.round(ask * 0.8);
  await first.getByLabel(`Day Rate For ${name}`).fill(String(offered));
  await first.getByRole('button', { name: 'Make Offer' }).click();
  await expect(dialog).toHaveCount(0);
  const theirs = hires.getByRole('row', { name: new RegExp(name) });
  for (let i = 0; i < 4 && await theirs.getByText('Offer Sent').count(); i++) { await advance(page, 'next-day'); await section(page, 'Crew'); }
  await expect(theirs).toContainText(`Asks ${dollars(ask)} a day`);

  // Asked: the row says who, what it costs and how much is in question, before the button.
  const dop = await saved((pr) => pr.hires.find((h: { roleId: string; status: string }) => h.roleId === 'dop' && h.status === 'countered'));
  const lpName = (await theirs.getByRole('button', { name: /^Ask .+ To Negotiate With / }).getAttribute('aria-label'))!.match(/^Ask (.+) To Negotiate With /)![1];
  await expect(theirs).toContainText(`${lpName}, your line producer, can negotiate this for ${dollars(lp.dayRate)} (one of their days). ${name} asks ${dollars((ask - offered) * dop.estDays)} more than you offered over about ${dop.estDays} ${dop.estDays === 1 ? 'day' : 'days'}, and may come down part of the way or not at all. Accepting stays yours.`);
  if (phone) expect((await audit(page)).defects, 'the crew page with a negotiation on offer, on a phone').toEqual([]);
  const line = async () => { const pr = await project(); const h = pr.hires.find((x: { id: string }) => x.id === lp.id); const o = pr.obligations.find((x: { id: string }) => x.id === h.obligationId); return { amount: o.amount, settled: o.settled, days: h.daysWorked }; };
  expect(await line()).toEqual({ amount: lp.dayRate, settled: 0, days: 0 });
  await theirs.getByRole('button', { name: `Ask ${lpName} To Negotiate With ${name}` }).click();

  // Brought back: a lower rate or the same one, said either way; the day is paid; it can't be asked twice.
  await expect(theirs).toContainText(new RegExp(`${lpName} negotiated this on .+ for \\$[\\d,]+: (down from \\$[\\d,]+ to \\$[\\d,]+ a day|they held at \\$[\\d,]+ a day)\\.`));
  await expect(theirs.getByRole('button', { name: /To Negotiate With/ })).toHaveCount(0);
  await expect.poll(line).toEqual({ amount: lp.dayRate, settled: lp.dayRate, days: 1 });
  const after = await saved((pr) => pr.hires.find((h: { id: string; negotiated?: unknown }) => h.id === dop.id && h.negotiated));
  expect(after.status).toBe('countered');
  expect(after.negotiated).toMatchObject({ from: ask, to: after.counterRate, fee: lp.dayRate });
  expect(after.counterRate).toBeLessThanOrEqual(ask);
  expect(after.counterRate).toBeGreaterThanOrEqual(offered);
  await expect(theirs).toContainText(`Asks ${dollars(after.counterRate)} a day`);
  if (phone) expect((await audit(page)).defects, 'a negotiated counteroffer, on a phone').toEqual([]);

  // Accepting is still the player's, and it is at the rate brought back. The line producer's own row gives the account.
  await theirs.getByRole('button', { name: 'Accept Counteroffer' }).click();
  await expect(theirs).toContainText('Accepted');
  await expect(theirs).toContainText(`${dollars(after.counterRate)} a day`);
  const mine = hires.getByRole('row', { name: new RegExp(lpName) }).filter({ hasText: 'Line Producer' });
  const saving = (ask - after.counterRate) * dop.estDays;
  await expect(mine).toContainText(`Negotiated 1 counteroffer for ${dollars(lp.dayRate)}: ${saving ? `1 came down, and those you accepted save ${dollars(saving)} over their days` : '0 came down'}.`);
  await expect(mine).toContainText('1 day worked');
});
