// Homes And Property (the owner's Homes & Property package of November 17, 2026, section 7 "Validate"): the four cycles
// through the screens, on desktop and phone. Only the start (a quick character, its date and place) is prepared; every
// step after it is a click, and time passes by the game's own Advance. Money is read from Your Bank and the home's own
// payments; ownership, residence and schedules from the page; the saved game from the save itself.
import { expect, test, type Page } from './test';
import { advance, nav, quickLife, readSavedState } from './helpers';

const card = (page: Page, title: string | RegExp) => page.locator('section.card', { has: page.getByRole('heading', { name: title, level: 2 }) }).first();
const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true }).click();
async function openHomes(page: Page): Promise<void> {
  await nav(page, 'Home');
  await page.getByRole('button', { name: 'Open Homes And Property' }).click();
  await expect(page.getByRole('heading', { name: 'Homes And Property', level: 1 })).toBeVisible();
}
/** Your Bank's available balance on Home, in whole units of its one currency. */
async function available(page: Page, symbol: string): Promise<number> {
  await nav(page, 'Home');
  const text = await card(page, 'Your Bank').innerText();
  const m = text.match(new RegExp(`Available\\s*${symbol.replace('$', '\\$')}([\\d,]+)`));
  expect(m, text).not.toBeNull();
  return Number(m![1].replace(/,/g, ''));
}
const pounds = (s: string) => Number(s.replace(/[^\d.]/g, ''));
/** Advance a step at a time until the condition holds, at most `max` steps. */
async function until(page: Page, step: 'next-day' | 'week' | 'month', max: number, ok: () => Promise<boolean>): Promise<void> {
  for (let i = 0; i < max; i++) {
    if (await ok()) return;
    await advance(page, step);
  }
  expect(await ok()).toBe(true);
}

test('Renting in London: costs, apply, sign, move in, furnish, rent, a repair, notice, move out and the deposit back', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(1_500_000); // a year's tenancy, advanced a month at a time
  await quickLife(page, 'gb-london', '2026-03-02');
  // Home has Homes And Property beside Your Bank and Your Papers, and the rail has it under You.
  await expect(card(page, 'Homes And Property')).toContainText('Where you liveNot chosen yet');
  const start = await available(page, '£');

  await openHomes(page);
  await tab(page, 'Find A Home');
  await expect(card(page, /To Rent$/)).toBeVisible();
  // England's rent is ONS's, said as a benchmark, and the homes say they aren't real listings.
  await expect(page.locator('main')).toContainText("These are the game's homes, not real listings, and none is at a real address.");
  const offer = card(page, /To Rent$/).getByRole('listitem').first();
  const offerTitle = (await offer.locator('strong').first().innerText()).trim();
  await offer.getByRole('button', { name: /^Details: / }).click();
  const detail = page.locator('#home-detail');
  await expect(detail).toContainText('Where The Price Comes From');
  await expect(detail).toContainText("ONS's average private rent in England");
  await expect(detail.locator('figcaption')).toContainText('Not a photograph, not an AI image, and not a depiction of any real address.');
  const costs = detail.getByRole('list', { name: 'Costs To Move In' });
  const rent = pounds(await costs.getByRole('listitem').filter({ hasText: "First month's rent" }).locator('span').last().innerText());
  const deposit = pounds(await costs.getByRole('listitem').filter({ hasText: /^Deposit/ }).locator('span').last().innerText());
  const moveIn = pounds(await costs.getByRole('listitem').filter({ hasText: 'Before You Move In' }).locator('strong').last().innerText());
  // England's cap: five weeks' rent (rent under £50,000 a year), the annual rent over 52, rounded down to the penny.
  expect(deposit).toBe(Math.floor((rent * 12 / 52) * 5 * 100) / 100);
  expect(moveIn).toBeCloseTo(rent + deposit, 2);

  // A double click applies once: the second press finds the button refusing.
  await detail.getByRole('button', { name: `Apply To Rent: ${offerTitle}` }).dblclick();
  await expect(detail).toContainText("You've already applied for this home.");
  await tab(page, 'Your Home');
  await expect(page.getByRole('heading', { name: `Renting: ${offerTitle}` })).toHaveCount(1);
  await expect(card(page, `Renting: ${offerTitle}`)).toContainText('Application being decided');
  // Nothing is paid to apply.
  expect(await available(page, '£')).toBeGreaterThanOrEqual(start - 1);

  // The landlord decides in three days; the lease is read, then signed and paid once.
  await openHomes(page);
  const tenancy = () => card(page, `Renting: ${offerTitle}`);
  await until(page, 'next-day', 5, async () => (await tenancy().innerText()).includes('Approved: sign to secure it'));
  await expect(tenancy()).toContainText('The Lease');
  const before = await available(page, '£');
  await openHomes(page);
  await tenancy().getByRole('button', { name: 'Sign The Lease And Pay' }).dblclick();
  await expect(tenancy()).toContainText('Lease signed');
  const afterSign = await available(page, '£');
  expect(before - afterSign).toBeGreaterThanOrEqual(Math.floor(moveIn) - 1);
  expect(before - afterSign).toBeLessThanOrEqual(Math.ceil(moveIn) + 1);

  // The save carries it through a reload.
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openHomes(page);
  await expect(tenancy()).toContainText('Lease signed');

  // Move in on the start date.
  await until(page, 'next-day', 20, async () => {
    await openHomes(page);
    return tenancy().getByRole('button', { name: `Move In: ${offerTitle}` }).isEnabled();
  });
  await tenancy().getByRole('button', { name: `Move In: ${offerTitle}` }).click();
  await expect(tenancy()).toContainText('You live here');
  await expect(card(page, 'Where You Live')).toContainText(offerTitle);
  await expect(card(page, 'Where You Live').locator('figcaption')).toContainText('Checked against the design: every feature matches.');

  // A desk: bought, paid for, delivered and put in the room chosen (furniture needs no fitter).
  await tab(page, 'Improvements And Furnishings');
  const things = card(page, 'Furniture And Appliances');
  await things.getByRole('button', { name: 'Buy: Desk' }).click();
  await expect(things.getByRole('list', { name: 'Your Things' })).toContainText('Desk: ordered');
  await until(page, 'next-day', 10, async () => {
    await openHomes(page); await tab(page, 'Improvements And Furnishings');
    return (await card(page, 'Furniture And Appliances').getByRole('list', { name: 'Your Things' }).innerText()).includes('Desk: installed');
  });

  // A month on, the rent is paid from the bank on its day; a broken boiler is the landlord's to fix.
  await advance(page, 'month');
  await openHomes(page);
  await expect(tenancy()).toContainText(/Rents Paid\s*2/); // the first was paid on signing
  await tenancy().getByLabel('Something Broken').selectOption('Heating');
  await tenancy().getByRole('button', { name: 'Report It' }).click();
  await expect(tenancy().getByRole('list', { name: 'Repairs And Permissions' })).toContainText('Heating');
  await expect(tenancy().getByRole('list', { name: 'Repairs And Permissions' })).toContainText('costs you nothing');
  await until(page, 'next-day', 7, async () => { await openHomes(page); return (await tenancy().getByRole('list', { name: 'Repairs And Permissions' }).innerText()).includes('Heating: repaired'); });

  // Notice: the tenancy runs to the end of its year; then the move-out and the deposit back within ten days.
  await tenancy().getByRole('button', { name: 'Give Notice' }).click();
  await expect(tenancy()).toContainText('Notice given');
  const endsOn = (await tenancy().innerText()).match(/Ends\s*(.+)/)![1];
  expect(endsOn).toMatch(/2027/);
  for (let i = 0; i < 12; i++) await advance(page, 'month');
  await openHomes(page);
  await until(page, 'next-day', 15, async () => { await openHomes(page); return (await tenancy().innerText()).includes('Returned to you'); });
  const settled = await tenancy().innerText();
  expect(pounds(settled.match(/Returned to you: (£[\d,.]+)/)![1])).toBeCloseTo(deposit, 2);
  expect(settled).toMatch(/Kept: £0(\.00)?\./);
  await expect(card(page, 'Where You Live')).toContainText("You haven't made a home your residence");
  // Twelve rents and no more; nothing housing-related counted as earnings.
  const saved = await readSavedState(page);
  const t = saved.homes.tenancies[0];
  expect(t.rentsPaid).toBe(12);
  expect(t.payments.filter((p: { kind: string; label: string }) => p.kind === 'paid' && /^Rent from/.test(p.label)).length).toBe(12);
  expect(saved.homes.items.find((i: { name: string }) => i.name === 'Desk').stage).toBe('stored');
});
