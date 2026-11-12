// Your Earnings through the screens (November 10, 2026): a short film funded by a grant, made and delivered, a
// distributor's guarantee received, and that income put into the next project, while the grant money it didn't spend
// stays where it was raised. Every amount comes from the game's own flow: the only fixture is the pinned world seed
// (helpers.ts pinSeed), chosen so the fund's panel backs the script and a distributor makes an offer.
import type { Locator } from '@playwright/test';
import { expect, test, type Page } from './test';
import { addScene, advance, nav, newProject, pinSeed, pressSaveAndExit, produceToDelivery, quickLife, readSavedState, section, writePitch } from './helpers';
import { audit } from './ui-audit';

const SEED = 3;
/** The kind of release the distributor offers Tidewater in this world: what the game drew, read once and recorded. */
const ROUTE_PLAYED = 'theatrical';
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const value = (c: Locator, label: string) => c.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd[1]');
const dollars = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const shot = (c: Locator, project: string, name: string) => c.screenshot({ path: `test-results/earnings-${project}-${name}.png` });

/** What the saved game holds for a project: its uncommitted money, as the ledger sums it (budget.ts ledgerTotals). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const available = (p: any) => {
  let used = 0;
  for (const o of p.obligations) used += o.settled + (o.state === 'reserved' || o.state === 'committed' ? Math.max(0, o.amount - o.settled) : 0);
  return p.funding.fund + p.funding.extra.reduce((s: number, e: { amount: number }) => s + e.amount, 0) + p.revenue - used;
};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const byTitle = async (page: Page, title: string): Promise<any> => (await readSavedState(page)).projects.find((x: { title: string }) => x.title === title);

async function open(page: Page, title: string, tab: string) {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: title }).click();
  await section(page, tab);
}

async function writeAndApprove(page: Page, character: string, place: string) {
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill(character);
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place, chars: [character], minutes: '3' });
  await addScene(page, { index: 1, place: `${place} Roof`, chars: [character], minutes: '3' });
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
}

test('your earnings: grant money stays with the film it made; the income it kept funds the next one', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  test.setTimeout(1_500_000);
  const dev = info.project.name;
  await quickLife(page, 'gb-london', '2026-01-05');
  await pinSeed(page, SEED);

  // Funding: a grant, whose terms say what happens to what the film doesn't spend.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Tidewater', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await writeAndApprove(page, 'Ada', 'Harbour');
  await section(page, 'Budget');
  await page.getByRole('button', { name: 'Approach Screen Arts Fund Grant' }).click();
  for (let i = 0; i < 4; i++) await advance(page, 'week');
  await open(page, 'Tidewater', 'Budget');
  const backers = card(page, 'Backers');
  const grant = backers.locator('li', { hasText: 'Screen Arts Fund Grant' }).first();
  await expect(grant).toContainText('Offer Made');
  await grant.getByRole('button', { name: 'Accept Offer' }).click();
  const terms = page.getByRole('dialog', { name: 'Accept These Terms?' });
  await expect(terms).toContainText("What the project doesn't spend of it stays with the project.");
  await terms.getByRole('button', { name: /^Accept \$/ }).click();
  await expect(value(card(page, 'Financing'), 'Still To Raise')).toHaveText('$0');

  // Production and delivery.
  await section(page, 'Script');
  await produceToDelivery(page, { yourself: ['Ada'] });
  await expect.poll(async () => (await byTitle(page, 'Tidewater')).delivered, { timeout: 20_000 }).not.toBeNull();

  // The next project, written and approved. Tidewater has grant money left and no income: nothing can go in.
  await nav(page, 'Projects');
  await newProject(page, { title: 'Second Light', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await writeAndApprove(page, 'Ben', 'Lighthouse');
  await section(page, 'Budget');
  const raise = card(page, 'Raise Money');
  const earnings = raise.getByRole('listitem').filter({ hasText: 'Your Earnings' });
  const putIn = earnings.getByRole('button', { name: 'Put In Your Earnings' });
  let tide = await byTitle(page, 'Tidewater');
  const grantLeft = available(tide);
  expect(grantLeft).toBeGreaterThan(0);
  await expect(putIn).toBeDisabled();
  await expect(earnings).toContainText("Your delivered projects haven't kept any income yet: what they earn counts once their backers are repaid and paid their shares.");
  await expect(earnings).toContainText('Nothing can go in yet.');
  await expect(earnings).toContainText(`Production funding still in your delivered projects stays with them: it was raised to make them. Tidewater (${dollars(grantLeft)}).`);
  await shot(earnings, dev, '01-restricted-refused');
  await open(page, 'Tidewater', 'Budget');
  const left = card(page, 'What This Project Has Left');
  await expect(value(left, 'Production Funding Left')).toHaveText(dollars(grantLeft));
  await expect(value(left, 'Your Earnings')).toHaveText('$0');

  // Income: a distributor's guarantee, paid when the offer is accepted. The grant takes no share, so the film keeps it.
  await section(page, 'Release');
  const offers = card(page, 'Distribution Offers');
  const accept = offers.getByRole('button', { name: /^Accept (Offer|The Late Slot)$/ }).first();
  for (let i = 0; i < 12 && !(await accept.count()); i++) {
    await advance(page, 'week');
    await open(page, 'Tidewater', 'Release');
  }
  await accept.click();
  await expect(card(page, 'Release History')).toContainText(/in GB/);
  await expect.poll(async () => (await byTitle(page, 'Tidewater')).revenue, { timeout: 20_000 }).toBeGreaterThan(0);
  tide = await byTitle(page, 'Tidewater');
  // The delivery materials the deal reserved are held as a bill, paid out of the grant money first.
  const held = tide.obligations.filter((o: { state: string }) => o.state === 'reserved' || o.state === 'committed').reduce((s: number, o: { amount: number; settled: number }) => s + o.amount - o.settled, 0);
  expect(held).toBeGreaterThan(0);
  const income = tide.revenue - Math.max(0, held - grantLeft);
  const restricted = Math.max(0, grantLeft - held);
  expect(income).toBeGreaterThan(0);
  await section(page, 'Budget');
  await expect(value(left, 'Production Funding Left')).toHaveText(dollars(restricted));
  await expect(value(left, 'Held For Bills To Pay')).toHaveText(dollars(held));
  await expect(value(left, 'Your Earnings')).toHaveText(dollars(income));
  await shot(left, dev, '02-income-kept');

  // Next-project funding: the income goes in; the grant money stays.
  await open(page, 'Second Light', 'Budget');
  await expect(earnings).toContainText(`${dollars(income)} can go in: ${dollars(income)} from Tidewater.`);
  await putIn.click();
  const offer = backers.locator('li', { hasText: 'Your Earnings' }).first();
  await expect(offer).toContainText(`Income kept by Tidewater (${dollars(income)}). Nobody is repaid from it and nobody takes a share.`);
  await offer.getByRole('button', { name: 'Accept Offer' }).click();
  await expect(terms).toContainText("What the project doesn't spend of it is yours again once the project is delivered.");
  await terms.getByRole('button', { name: `Accept ${dollars(income)}` }).click();
  await expect(value(card(page, 'Financing'), 'Received')).toHaveText(dollars(income));
  await expect(offer).toContainText(`Moved from Tidewater (${dollars(income)}).`);
  await expect(putIn).toBeDisabled();
  await shot(backers, dev, '03-earnings-put-in');

  // Both budgets, on screen and in the saved game, after a save and reload.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await open(page, 'Tidewater', 'Budget');
  await expect(value(card(page, 'Summary'), 'Put Into Other Projects')).toHaveText(dollars(income));
  await expect(value(card(page, 'Summary'), 'Uncommitted')).toHaveText(dollars(restricted));
  await expect(value(left, 'Production Funding Left')).toHaveText(dollars(restricted));
  await expect(value(left, 'Your Earnings')).toHaveText('$0');
  await expect(value(left, 'Earnings Put Into Other Projects')).toHaveText(dollars(income));
  await shot(left, dev, '04-source-after');
  await open(page, 'Second Light', 'Budget');
  await expect(value(card(page, 'Summary'), 'Uncommitted')).toHaveText(dollars(income));
  const [t2, s2] = [await byTitle(page, 'Tidewater'), await byTitle(page, 'Second Light')];
  expect([available(t2), available(s2)]).toEqual([restricted, income]);
  const deal = s2.finance.deals.find((d: { kind: string }) => d.kind === 'earnings');
  expect(deal).toMatchObject({ status: 'accepted', received: income, transfer: { id: `tr-${deal.id}`, sources: [{ projectId: t2.id, amount: income }] } });
  expect(t2.obligations.filter((o: { ref?: string }) => o.ref === `transfer:tr-${deal.id}:earnings`).map((o: { settled: number }) => o.settled)).toEqual([income]);

  // The release's weekly report (audiences.ts, box-office.ts), whichever kind of release the distributor made: a
  // broadcast or a streaming release reports an audience in its own measures, a cinema run reports its weeks, a digital
  // release reports neither. Followed for some weeks past its opening.
  // A cinema release opens about four months after its offer is accepted.
  const isOut = async () => (await byTitle(page, 'Tidewater')).releases.some((r: { offerId?: string; status: string }) => r.offerId && r.status === 'released');
  for (let i = 0; i < 8 && !(await isOut()); i++) await advance(page, 'month');
  expect(await isOut()).toBe(true);
  for (let i = 0; i < 3; i++) await advance(page, 'week');
  await open(page, 'Tidewater', 'Release');
  const tw = await byTitle(page, 'Tidewater');
  const taken = tw.offers.find((o: { status: string }) => o.status === 'accepted');
  const earned = card(page, 'Earnings');
  const route: string = taken.route;
  // Seed 3, as played here: recorded so that a change in what was offered is seen, not absorbed.
  expect(route).toBe(ROUTE_PLAYED);
  if (route === 'broadcast' || route === 'streaming') {
    const weeks = new Set(taken.audience.map((x: { week: number }) => x.week)).size;
    expect(weeks).toBeGreaterThan(0);
    expect(taken.weeks).toBeUndefined();
    await earned.getByText(`Weekly Audience (${weeks})`).click();
    await expect(earned).toContainText('Simulated by the game: no real audience figure is shown here.');
    await expect(earned).toContainText('Nothing you are paid depends on these.');
    const table = earned.getByRole('table', { name: `Weekly Audience, ${taken.distributor}` });
    await expect(table.locator('tbody tr')).toHaveCount(taken.audience.length);
    const measures = [...new Set(taken.audience.map((x: { metric: string }) => x.metric))].sort();
    expect(measures).toEqual(route === 'broadcast' ? ['viewers'] : ['hours', 'views']);
    await expect(earned).toContainText(route === 'broadcast' ? 'Average Audience: People watching' : 'Views: Hours viewed over the running time of what is available');
    await expect(earned).not.toContainText(route === 'broadcast' ? 'Hours Viewed:' : 'Average Audience:');
    await expect(table.locator('tbody tr').first()).toContainText(taken.audience[0].value.toLocaleString('en-US'));
    await expect(earned.getByText(/^Weeks In Cinemas/)).toHaveCount(0);
    if (dev !== 'desktop') expect((await audit(page)).defects, 'the weekly audience, on a phone').toEqual([]);
    await page.screenshot({ path: `test-results/earnings-${dev}-05-weekly-audience.png`, fullPage: true });
  } else if (route === 'theatrical') {
    expect(taken.audience).toBeUndefined();
    await expect(earned.getByText(/^Weeks In Cinemas \(\d+\)$/)).toBeVisible();
    await expect(earned.getByText(/^Weekly Audience/)).toHaveCount(0);
  } else {
    expect(taken.audience).toBeUndefined();
    expect(taken.weeks).toBeUndefined();
    await expect(earned.getByText(/^Weekly Audience|^Weeks In Cinemas/)).toHaveCount(0);
  }
});
