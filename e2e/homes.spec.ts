// Homes And Property (the owner's Homes & Property package of November 17, 2026, section 7 "Validate"): the four cycles
// through the screens, on desktop and phone. Only the start (a quick character, its date and place) is prepared; every
// step after it is a click, and time passes by the game's own Advance. Money is read from Your Bank and the home's own
// payments; ownership, residence and schedules from the page; the saved game from the save itself.
import { expect, test, type Page } from './test';
import { advance, editSave, nav, openStart, quickDraft, quickLife, readSavedState, setInheritance } from './helpers';

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
  test.setTimeout(600_000); // a year's tenancy, advanced a month at a time
  await quickLife(page, 'gb-london', '2026-03-02');
  // Home has Homes And Property beside Your Bank and Your Papers, and the rail has it under You.
  await expect(card(page, 'Homes And Property')).toContainText('Where you liveNot chosen yet');
  const start = await available(page, '£');

  await openHomes(page);
  await tab(page, 'Find A Home');
  await expect(card(page, /To Rent$/)).toBeVisible();
  // England's rent is ONS's, said as a benchmark, and the homes say they aren't real listings.
  await expect(page.getByRole('note', { name: 'Housing Records For London' })).toContainText("Verified homes at real addresses: 0 of the 50 the game aims for (50 short). Real listings: 0.");
  await expect(page.getByRole('note', { name: 'Housing Records For London' })).toContainText("none is a real listing or at a real address");
  const offer = card(page, /To Rent$/).getByRole('listitem').first();
  const offerTitle = (await offer.locator('strong').first().innerText()).trim();
  await offer.getByRole('button', { name: /^Details: / }).click();
  const detail = page.locator('#home-detail');
  await expect(detail).toContainText('Where The Price Comes From');
  await expect(detail).toContainText("ONS's average private rent in England");
  // No picture (the owner had them removed, November 17, 2026): the outside is said in words.
  await expect(detail.locator('figure')).toHaveCount(0);
  await expect(detail).toContainText(/Outside.*front door/);
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
  await expect(card(page, 'Where You Live')).toContainText(/Outside.*front door/);

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
  // The deposit, to the penny: what came back and what was kept. Kept is only ever damage the inspection named (the
  // game's 2% chance a month of an accident); a year's wear is never charged.
  const back = pounds(settled.match(/Returned to you: (£[\d,]+(?:\.\d\d)?)/)![1]);
  const kept = pounds(settled.match(/Kept: (£[\d,]+(?:\.\d\d)?)/)![1]);
  expect(back + kept).toBeCloseTo(deposit, 2);
  if (kept > 0) expect(settled).toContain('Floors And Walls: damage beyond wear');
  else expect(back).toBeCloseTo(deposit, 2);
  expect(settled).not.toMatch(/ordinary wear: £[1-9]/);
  await expect(card(page, 'Where You Live')).toContainText("You haven't made a home your residence");
  // Twelve rents and no more; nothing housing-related counted as earnings.
  const saved = await readSavedState(page);
  const t = saved.homes.tenancies[0];
  expect(t.rentsPaid).toBe(12);
  expect(t.payments.filter((p: { kind: string; label: string }) => p.kind === 'paid' && /^Rent from/.test(p.label)).length).toBe(12);
  expect(saved.homes.items.find((i: { name: string }) => i.name === 'Desk').stage).toBe('stored');
});

async function onTab(page: Page, name: string): Promise<void> { await openHomes(page); await tab(page, name); }
const dollars = (s: string) => Number(s.replace(/[^\d.]/g, ''));
/** Find A Home, looking to buy (or land), and the first offer's details. */
async function firstOffer(page: Page, want: 'Buy A Home' | 'Buy Land To Build On', kind?: RegExp): Promise<string> {
  await onTab(page, 'Find A Home');
  await page.getByLabel('Looking To').selectOption({ label: want });
  const list = card(page, want === 'Buy A Home' ? /For Sale$/ : /Plots For Sale$/);
  await expect(list.getByRole('listitem').first()).toBeVisible();
  const matching = () => (kind ? list.getByRole('listitem').filter({ has: page.locator('strong', { hasText: kind }) }) : list.getByRole('listitem'));
  // Offers are drawn afresh each month: if none of this kind is on offer, the player waits for next month's.
  for (let i = 0; i < 4 && !(await matching().count()); i++) {
    await advance(page, 'month');
    await onTab(page, 'Find A Home');
    await page.getByLabel('Looking To').selectOption({ label: want });
    await expect(list.getByRole('listitem').first()).toBeVisible();
  }
  const first = matching().first();
  const title = (await first.locator('strong').first().innerText()).trim();
  await first.getByRole('button', { name: /^Details: / }).click();
  await expect(page.locator('#home-detail')).toContainText(title);
  return title;
}

test('Buying in Los Angeles: a mortgage, an inspection, completion, a new exterior, a sale and its settlement', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(600_000);
  await quickLife(page, 'us-los-angeles', '2026-03-02');
  const start = await available(page, '$');
  // A house: a flat's outside is its building's, and the association decides it (the failure journey shows a refusal).
  const title = await firstOffer(page, 'Buy A Home', /House|Townhouse/);
  const detail = page.locator('#home-detail');
  // US sale prices are the city's own Census median value, moved by FHFA's index (NAHB's national average until
  // November 17, 2026), said as such; the costs before buying are listed.
  await expect(detail).toContainText("The Census Bureau's median value of owner-occupied homes in Los Angeles city, California");
  await expect(detail).toContainText("FHFA's house price index");
  await expect(detail.getByLabel('Paying With')).toHaveValue('mortgage');
  await expect(detail.getByLabel('Have It Inspected')).toBeChecked();
  const costs = detail.getByRole('list', { name: 'Costs To Buy' });
  await expect(costs).toContainText('Then Each Month');
  await detail.getByRole('button', { name: `Make The Offer: ${title}` }).dblclick();
  await expect(detail).toContainText(/already|offer/i);
  await tab(page, 'Your Home');
  await expect(page.getByRole('heading', { name: `Buying: ${title}` })).toHaveCount(1);
  // Accepted, inspected, the lender decides, completion: about five weeks.
  const owns = async () => { await onTab(page, 'Your Properties'); return (await page.locator('main').innerText()).includes('Worth Now'); };
  await until(page, 'week', 8, owns);
  const prop = card(page, title);
  await expect(prop).toContainText(/Mortgage\s*\$[\d,]+(\.\d\d)? a month; \d+ of 300 paid; about \$[\d,]+ owed/);
  const afterBuy = await available(page, '$');
  expect(start - afterBuy).toBeGreaterThan(0); // the deposit, the inspection and closing, never the whole price
  await onTab(page, 'Your Home');
  await expect(page.locator('main')).toContainText('Inspection Report');
  // A new exterior: sage walls, paid as the work goes, and the outside is revision 2 of the design.
  await onTab(page, 'Improvements And Furnishings');
  await page.getByLabel('Work', { exact: true }).selectOption({ label: 'Repaint The Exterior' });
  await page.getByLabel('New Colour').selectOption({ label: 'Sage' });
  await expect(card(page, 'Work On The Home').getByRole('list', { name: 'Permission Steps' })).toBeVisible();
  await card(page, 'Work On The Home').getByRole('button', { name: 'Start The Work' }).click();
  await expect(card(page, 'Work On The Home').getByRole('list', { name: 'Work' })).toContainText('Repaint The Exterior');
  await until(page, 'week', 6, async () => { await onTab(page, 'Improvements And Furnishings'); return (await card(page, 'Work On The Home').getByRole('list', { name: 'Work' }).innerText()).includes('Repaint The Exterior: done'); });
  await onTab(page, 'Your Properties');
  await expect(card(page, title)).toContainText(/walls in sage, .*\(design revision 2\)/);
  await expect(card(page, title).locator('figure')).toHaveCount(0); // no picture: the owner had them removed
  // Sold at what it's worth; the offer comes, is accepted, and completes: the mortgage repaid first, the rest yours.
  await card(page, title).getByRole('button', { name: 'Put It Up For Sale' }).click();
  await expect(card(page, title)).toContainText('Waiting for a buyer.');
  await until(page, 'week', 8, async () => { await onTab(page, 'Your Properties'); return (await card(page, title).innerText()).includes('A buyer offers'); });
  const beforeSale = await available(page, '$');
  await onTab(page, 'Your Properties');
  await card(page, title).getByRole('button', { name: 'Accept The Offer' }).dblclick();
  await expect(card(page, title)).toContainText('Sold subject to completion');
  await until(page, 'week', 6, async () => { await onTab(page, 'Your Properties'); return (await page.locator('main').innerText()).includes('Sold for'); });
  await expect(page.locator('main')).toContainText(/Sold for \$[\d,.]+; \$[\d,.]+ came to you after the fee and \$[\d,.]+ to repay the mortgage\./);
  const proceeds = dollars((await page.locator('main').innerText()).match(/; (\$[\d,]+(?:\.\d\d)?) came to you/)![1]);
  const afterSale = await available(page, '$');
  expect(afterSale - beforeSale).toBeGreaterThanOrEqual(proceeds - 1 - 5000); // less a month's payments and bills between
  const saved = await readSavedState(page);
  expect(saved.homes.owned[0].soldAt).toBeGreaterThan(0);
  expect(saved.homes.sales[0].stage).toBe('completed');
});

test('Land in Austin: a plot, its survey, a design revised, approval, building stage by stage, inspection and moving in', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(600_000);
  await quickLife(page, 'us-austin', '2026-03-02');
  const title = await firstOffer(page, 'Buy Land To Build On');
  const detail = page.locator('#home-detail');
  await expect(detail).toContainText('Known Of The Land');
  // A plot offers no mortgage: the choice isn't shown, and the screen says why.
  await expect(detail.getByLabel('Paying With')).toHaveCount(0);
  await expect(detail).toContainText('the game offers no mortgage on land');
  await detail.getByRole('button', { name: `Make The Offer: ${title}` }).click();
  await until(page, 'week', 8, async () => { await onTab(page, 'Land And Building'); return (await page.locator('main').innerText()).includes('Your plot of'); });
  const plot = card(page, title);
  // A design applied for before the survey is refused, in words.
  await plot.getByRole('button', { name: 'Start Designing A House' }).click();
  const design = card(page, `House Design For ${title}`);
  await expect(design).toContainText('Designing. Design revision 1');
  await design.getByRole('button', { name: 'Apply For Building Approval' }).click();
  await expect(design.getByRole('alert')).toContainText(/survey/i);
  await plot.getByRole('listitem').filter({ hasText: 'Boundary And Site Survey' }).getByRole('button', { name: 'Order It' }).click();
  await until(page, 'next-day', 10, async () => { await onTab(page, 'Land And Building'); return (await card(page, title).getByRole('list', { name: 'Investigations' }).innerText()).includes('Boundary And Site Survey: done'); });
  // Revised: sage walls and a double garage; the cost plan rises and the preview is redrawn.
  const before = dollars((await design.getByRole('list', { name: 'Cost Plan' }).getByRole('listitem').last().innerText()).match(/\$[\d,]+/)![0]);
  await design.getByLabel('Wall Colour').selectOption({ label: 'Sage' });
  await design.getByLabel('Garage').selectOption({ label: 'Double' });
  await design.getByRole('button', { name: 'Save This Revision' }).click();
  await expect(design).toContainText('Design revision 2');
  const after = dollars((await design.getByRole('list', { name: 'Cost Plan' }).getByRole('listitem').last().innerText()).match(/\$[\d,]+/)![0]);
  expect(after).toBeGreaterThan(before);
  await design.getByRole('button', { name: 'Apply For Building Approval' }).click();
  await expect(design).toContainText('Waiting for the building approval');
  await until(page, 'week', 6, async () => { await onTab(page, 'Land And Building'); return (await card(page, `House Design For ${title}`).innerText()).includes('Approved: sign the contract'); });
  const bank = await available(page, '$');
  await onTab(page, 'Land And Building');
  await card(page, `House Design For ${title}`).getByRole('button', { name: 'Sign The Building Contract' }).click();
  await expect(card(page, `House Design For ${title}`).getByRole('list', { name: 'Building Stages' })).toContainText('under way since');
  // Each stage paid as it starts: the first now, not the whole price.
  expect(bank - await available(page, '$')).toBeLessThan(after / 4);
  await until(page, 'month', 10, async () => { await onTab(page, 'Land And Building'); return (await page.locator('main').innerText()).includes('. Built.') || (await page.locator('main').innerText()).includes('Built. Design revision'); });
  const house = page.locator('section.card').filter({ has: page.getByRole('list', { name: 'Building Stages' }) }).first();
  await expect(house.getByRole('list', { name: 'Building Stages' }).getByRole('listitem')).toHaveCount(8);
  await expect(house.getByRole('list', { name: 'Building Stages' })).not.toContainText('to come');
  await house.getByRole('button', { name: /^Move In: / }).click();
  await onTab(page, 'Your Home');
  // The house as built from revision 2: sage walls and the double garage the design added.
  await expect(card(page, 'Where You Live')).toContainText('walls in sage');
  await expect(card(page, 'Where You Live')).toContainText('Double Garage');
  const saved = await readSavedState(page);
  expect(saved.homes.builds[0].payments.filter((p: { key: string }) => p.key.includes(':stage:')).length).toBe(8);
});

test('Letting in Los Angeles: a home put right, advertised, a tenant chosen, rent collected, notice, the deposit settled', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(600_000);
  await quickLife(page, 'us-los-angeles', '2026-03-02');
  const title = await firstOffer(page, 'Buy A Home');
  const detail = page.locator('#home-detail');
  await detail.getByLabel('Paying With').selectOption({ label: 'Cash' });
  await detail.getByLabel('Have It Inspected').uncheck();
  await detail.getByRole('button', { name: `Make The Offer: ${title}` }).click();
  await until(page, 'week', 8, async () => { await onTab(page, 'Your Properties'); return (await page.locator('main').innerText()).includes('Worth Now'); });
  const prop = card(page, title);
  // Whatever is poor is put right first: a home isn't let until it's fit.
  for (let i = 0; i < 6; i++) {
    const cond = (await prop.innerText()).match(/Condition\s*(.+)/)![1];
    if (cond.startsWith('Everything good')) break;
    const part = cond.split(',').map((x) => x.trim()).find((x) => / poor$/.test(x));
    if (!part) break;
    const name = part.replace(/ poor$/, '');
    await expect(prop.getByRole('button', { name: 'Advertise To Let' })).toBeDisabled();
    await prop.getByLabel('Something Broken').selectOption(name);
    await prop.getByRole('button', { name: 'Get A Quote' }).click();
    await prop.getByRole('button', { name: `Approve The Repair: ${name}` }).click();
    await until(page, 'next-day', 5, async () => { await onTab(page, 'Your Properties'); return (await card(page, title).getByRole('list', { name: 'Repairs' }).innerText()).includes(`${name}: repaired`); });
  }
  await expect(prop.getByRole('button', { name: 'Advertise To Let' })).toBeEnabled();
  await prop.getByRole('button', { name: 'Advertise To Let' }).click();
  await expect(prop).toContainText('applicants are coming');
  await until(page, 'next-day', 14, async () => { await onTab(page, 'Your Properties'); return (await card(page, title).innerText()).includes('Applicants have come forward'); });
  const before = await available(page, '$');
  await onTab(page, 'Your Properties');
  await card(page, title).getByRole('button', { name: 'Choose' }).first().click();
  await expect(card(page, title)).toContainText(/Let to .+ at \$[\d,]+ a month since/);
  const rent = dollars((await card(page, title).innerText()).match(/at (\$[\d,]+) a month since/)![1]);
  // The tenant's deposit and first rent arrive: the deposit is theirs, owed back.
  expect(await available(page, '$')).toBeGreaterThan(before);
  for (let i = 0; i < 3; i++) await advance(page, 'month');
  await onTab(page, 'Your Properties');
  expect(Number((await card(page, title).innerText()).match(/; (\d+) rents received/)![1])).toBeGreaterThanOrEqual(3);
  // Any repair the tenant asks for is approved.
  for (const b of await card(page, title).getByRole('button', { name: 'Approve The Repair' }).all()) await b.click();
  await card(page, title).getByRole('button', { name: 'Give The Tenant Notice' }).click();
  await expect(card(page, title)).toContainText('; ends ');
  await until(page, 'week', 12, async () => { await onTab(page, 'Your Properties'); return (await card(page, title).getByRole('button', { name: 'Advertise To Let' }).count()) === 1; });
  const saved = await readSavedState(page);
  const l = saved.homes.lettings[0];
  expect(l.stage).toBe('ended');
  expect(l.payments.some((p: { label: string }) => p.label === 'Deposit returned to the tenant' || p.label === 'Kept from the deposit for rent owed')).toBe(true);
  expect(l.rentsReceived).toBeGreaterThanOrEqual(4);
  void rent;
});

test('Not enough money: an application refused before it is made, in words, and nothing paid', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(300_000);
  // Labelled fixture: the inheritance is set to $1,000 on Review, as a player can.
  await openStart(page);
  await quickDraft(page, 'gb-london', '2026-03-02');
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await setInheritance(page, '1000');
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  const start = await available(page, '£');
  await onTab(page, 'Find A Home');
  await card(page, /To Rent$/).getByRole('button', { name: /^Details: / }).first().click();
  const detail = page.locator('#home-detail');
  const apply = detail.getByRole('button', { name: /^Apply To Rent: / });
  await expect(apply).toBeDisabled();
  await expect(detail).toContainText(/You need £[\d,.]+ available to move in: the deposit and the first month's rent\./);
  await tab(page, 'Your Home');
  await expect(page.getByRole('heading', { name: /^Renting: / })).toHaveCount(0);
  expect(await available(page, '£')).toBe(start);
});

test('A lapsed approval, a refused permission, a stale favourite, a withdrawn purchase, and a save from before housing', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(600_000);
  await quickLife(page, 'gb-london', '2026-03-02');
  // A save made before Homes And Property: it opens with nothing to migrate, and the page starts empty.
  await editSave(page, (state) => { delete state.homes; });
  await openHomes(page);
  await expect(card(page, 'Where You Live')).toContainText("You haven't made a home your residence");
  // Two homes to rent: the first approved and left unsigned until the approval lapses; the second rented.
  await tab(page, 'Find A Home');
  const items = card(page, /To Rent$/).getByRole('listitem');
  const a = (await items.nth(0).locator('strong').first().innerText()).trim();
  const b = (await items.nth(1).locator('strong').first().innerText()).trim();
  await items.nth(0).getByRole('button', { name: /^Details: / }).click();
  await page.locator('#home-detail').getByRole('button', { name: `Apply To Rent: ${a}` }).click();
  // Two homes side by side: price, kind, area and what's shared, in one table.
  await items.nth(0).getByLabel('Compare').check();
  await items.nth(1).getByLabel('Compare').check();
  const compare = page.getByRole('table', { name: 'Compare Homes' });
  await expect(compare.getByRole('columnheader')).toHaveText(['What', a, b]);
  await expect(compare.getByRole('row', { name: /^Up Front/ })).toContainText('£');
  await items.nth(1).getByRole('button', { name: `Favourite: ${b}` }).click();
  await expect(items.nth(1).getByRole('button', { name: `Favourite: ${b}` })).toHaveAttribute('aria-pressed', 'true');
  await until(page, 'next-day', 5, async () => { await onTab(page, 'Your Home'); return (await card(page, `Renting: ${a}`).innerText()).includes('Approved'); });
  await until(page, 'week', 4, async () => { await onTab(page, 'Your Home'); return (await card(page, `Renting: ${a}`).innerText()).includes('Approval lapsed'); });
  await expect(card(page, `Renting: ${a}`).getByRole('button', { name: 'Sign The Lease And Pay' })).toHaveCount(0);
  // The favourite stays listed after its listing ends. Then either its offer has lapsed and it can't be applied for, or
  // the same home came back on the market in its next window (market.ts marketPool) and the favourite shows the new
  // listing, which can be. Until November 17, 2026 this waited for a lapse only, and failed when the home came back.
  const favourite = (await readSavedState(page)).homes as { favorites: string[]; homes: Record<string, { validUntil: string }> };
  const favId = favourite.favorites[0];
  const firstUntil = favourite.homes[favId].validUntil;
  let relisted = false;
  await until(page, 'week', 16, async () => { // a listing runs to the end of its three-month window
    await onTab(page, 'Find A Home');
    await page.getByLabel('Favourites Only').check();
    const it = card(page, /To Rent$/).getByRole('listitem').filter({ hasText: b });
    if (!(await it.count())) return false;
    await it.getByRole('button', { name: /^Details: / }).click();
    if ((await page.locator('#home-detail').innerText()).includes('This offer has lapsed')) return true;
    relisted = (await readSavedState(page)).homes.homes[favId].validUntil > firstUntil;
    return relisted;
  });
  const applyB = page.locator('#home-detail').getByRole('button', { name: `Apply To Rent: ${b}` });
  if (relisted) {
    await expect(page.locator('#home-detail')).not.toContainText('This offer has lapsed');
    await expect(applyB).toBeEnabled();
  } else await expect(applyB).toBeDisabled();
  // A fresh home, rented; a wall the landlord won't let a tenant take out.
  await page.getByLabel('Favourites Only').uncheck();
  const c = card(page, /To Rent$/).getByRole('listitem').filter({ hasNotText: a }).filter({ hasNotText: b }).first();
  const cTitle = (await c.locator('strong').first().innerText()).trim();
  await c.getByRole('button', { name: /^Details: / }).click();
  await page.locator('#home-detail').getByRole('button', { name: `Apply To Rent: ${cTitle}` }).click();
  const tenancy = () => card(page, `Renting: ${cTitle}`);
  await until(page, 'next-day', 5, async () => { await onTab(page, 'Your Home'); return (await tenancy().innerText()).includes('Approved: sign'); });
  await tenancy().getByRole('button', { name: 'Sign The Lease And Pay' }).click();
  await until(page, 'next-day', 20, async () => { await onTab(page, 'Your Home'); const m = tenancy().getByRole('button', { name: `Move In: ${cTitle}` }); return (await m.count()) > 0 && m.isEnabled(); });
  await tenancy().getByRole('button', { name: `Move In: ${cTitle}` }).click();
  await tenancy().getByLabel('Ask Permission For').selectOption({ label: 'Remove An Interior Wall' });
  await tenancy().getByRole('button', { name: 'Ask The Landlord' }).click();
  await until(page, 'next-day', 25, async () => { await onTab(page, 'Your Home'); return (await tenancy().getByRole('list', { name: 'Repairs And Permissions' }).innerText()).includes('refused'); });
  await expect(tenancy().getByRole('list', { name: 'Repairs And Permissions' })).toContainText("won't allow structural or outside work by a tenant");
  await onTab(page, 'Improvements And Furnishings');
  await page.getByLabel('Work', { exact: true }).selectOption({ label: 'Remove An Interior Wall' });
  await expect(card(page, 'Work On The Home').getByRole('button', { name: 'Start The Work' })).toBeDisabled();
  // A purchase withdrawn while its conditions stand: the deposit comes back.
  const before = await available(page, '£');
  const title = await firstOffer(page, 'Buy A Home');
  await page.locator('#home-detail').getByLabel('Paying With').selectOption({ label: 'Cash' });
  await page.locator('#home-detail').getByRole('button', { name: `Make The Offer: ${title}` }).click();
  await until(page, 'next-day', 5, async () => { await onTab(page, 'Your Home'); return (await card(page, `Buying: ${title}`).innerText()).includes('Being inspected'); });
  const held = await available(page, '£');
  expect(held).toBeLessThan(before);
  await onTab(page, 'Your Home');
  await card(page, `Buying: ${title}`).getByRole('button', { name: 'Withdraw' }).click();
  await expect(page.getByRole('heading', { name: `Buying: ${title}` })).toHaveCount(0);
  await expect(card(page, 'Documents And History')).toContainText(`You withdrew from buying ${title}. Your deposit is back.`);
  // Only the inspection is gone: the deposit is back in full.
  expect(before - await available(page, '£')).toBeLessThan(before - held);
});
