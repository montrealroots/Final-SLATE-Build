// The owner's v5 brief, 5, through the screens (from November 13, 2026): a horror short is made and delivered; some weeks
// later the horror studio the world follows offers a first-look deal, every term read on the Profile before anything binds;
// the player asks for more overhead, then accepts; the overhead arrives; the next film goes to that studio first, another
// studio can't be pitched it until then, and development money goes in. Both studios are made-up fixtures and the world
// seed is pinned (labelled fixtures); nothing is written into the save.
import { expect, test, type Page } from './test';
import { CATALOG_FIXTURE, serveCatalog } from './catalog-fixture';
import { addScene, advance, castRoles, nav, pinSeed, quickLife, personalPostingsOf, readSavedState, runToDelivery, saveAndApprove, section, staffEveryDepartment, writePitch } from './helpers';

test.use({ actionTimeout: 20_000 });

const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const NIGHT = 'Night Shift Pictures (Fixture)';
const MATINEE = 'Sunday Matinee (Fixture)';
const STUDIOS = [
  { c: 'company:fixture-horror', name: NIGHT, n: 5, g: [['Horror', 10], ['Thriller', 6], ['Drama', 2]], m: EVEN, ann: {} },
  { c: 'company:fixture-family', name: MATINEE, n: 4, g: [['Family', 8], ['Comedy', 8], ['Romance', 4]], m: EVEN, ann: {} },
];
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });

async function horror(page: Page, title: string, format: string, runtime: string, first = true, genre = 'Horror'): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill(title);
  await page.getByLabel('Format').selectOption({ label: format });
  await page.getByLabel(/Target Runtime In Minutes/).fill(runtime);
  await page.getByRole('radio', { name: /^Low Budget:/ }).check();
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill(genre.toLowerCase());
  await page.getByRole('button', { name: `Add ${genre}`, exact: true }).click();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Depot', chars: ['Ines'], minutes: '4' });
  if (first) return saveAndApprove(page); // which raises the starting backing, only a first project's
  await writePitch(page);
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
}

test('a first-look deal: offered after delivered work, read in full, bargained, accepted; the next film goes to the studio first', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Desktop, phone and the iPhone 15 Pro Max (WebKit).');
  test.setTimeout(1_200_000);
  await serveCatalog(page, {}, { 'world.json': { ...(CATALOG_FIXTURE['world.json'] as object), studios: STUDIOS } });
  await quickLife(page, 'us-los-angeles', '2026-11-12');
  await expect.poll(async () => (await readSavedState(page)).industry?.studios?.length, { timeout: 20_000 }).toBe(2);
  await pinSeed(page, 3);

  // A horror short, made and delivered.
  await horror(page, 'Last Tram', 'Short Film', '6');
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'week');
  await castRoles(page);
  await staffEveryDepartment(page);
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await runToDelivery(page, { weeks: 30 });
  await expect.poll(async () => !!(await readSavedState(page)).projects[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const reception = (await readSavedState(page)).projects[0].quality.reception;
  test.skip(reception < 60, `The pinned world received the short at ${reception}, under the bar a studio wants; the engine test covers that case.`);

  // Some weeks later, the offer: every term on the Profile, nothing binding yet.
  for (let i = 0; i < 8 && !(await readSavedState(page)).firstLooks?.length; i++) await advance(page, 'week');
  await nav(page, 'Profile');
  const fl = card(page, 'First-Look Deal');
  const offer = fl.getByRole('region', { name: 'First-Look Offer' });
  await expect(offer).toContainText(`${NIGHT} offers you a first-look deal.`);
  const terms = offer.getByRole('list', { name: 'Its Terms' });
  await expect(terms).toContainText('It runs 12 months from the day you accept.');
  await expect(terms).toContainText(new RegExp(`${NIGHT.replace(/[()]/g, "\\$&")} pays \\$[\\d,]+ a month toward your overhead, into your company's account if you have one, or your own\\. That is \\$[\\d,]+ a year, set for a record that is just starting`));
  await expect(terms).toContainText(`${NIGHT} has 60 days to answer each one.`);
  await expect(offer).toContainText('Nothing binds you until you accept.');
  const before = personalPostingsOf(await readSavedState(page)).length;
  await offer.getByRole('button', { name: /^Ask For \$[\d,]+ A Month$/ }).click(); // half again the offer, whatever the record set it at
  await expect(offer).toContainText('You asked for more overhead. It answers by');
  await expect(offer.getByRole('button', { name: 'Accept The First-Look Deal' })).toBeDisabled();
  await advance(page, 'week');
  await advance(page, 'next-day');
  await nav(page, 'Profile');
  await expect(offer).toContainText(/It (agreed to|kept its offer of) \$[\d,]+ a month\./);
  await offer.getByRole('button', { name: 'Accept The First-Look Deal' }).click();
  const running = fl.getByRole('region', { name: 'Your First-Look Deal' });
  await expect(running).toContainText(`${NIGHT}: $`);
  await expect(running).toContainText('$50,000 of development money left.');
  await expect.poll(async () => personalPostingsOf(await readSavedState(page)).slice(before).filter((x: { kind: string }) => x.kind === 'overhead').length, { timeout: 30_000 }).toBe(1);
  await expect(card(page, 'Your Money')).toContainText('Overhead From A First-Look Deal');

  // The next film, a family one: the studio first. Another studio waits; development money goes in.
  await horror(page, 'Night Bus', 'Short Film', '6', false, 'Family');
  await section(page, 'Budget');
  const look = card(page, `First Look: ${NIGHT}`);
  await expect(look).toContainText(`Your first-look deal gives ${NIGHT} the first chance at Night Bus.`);
  await look.getByLabel('Development Money From The Deal').fill('5000');
  await look.getByRole('button', { name: 'Put It In' }).click();
  await expect(look).toContainText(`$5,000 of development money from ${NIGHT} is in it.`);
  const pitch = card(page, 'Pitch To A Studio');
  await expect(pitch.getByRole('listitem', { name: MATINEE })).toContainText(`Your first-look deal gives ${NIGHT} the first chance at Night Bus: submit it to them first.`);
  await expect(page.getByRole('button', { name: `Pitch To ${MATINEE}` })).toBeDisabled();
  await page.getByRole('button', { name: `Pitch To ${NIGHT}` }).click();
  await expect(look).toContainText(new RegExp(`${NIGHT.replace(/[()]/g, '\\$&')} is considering it until [A-Z][a-z]+ \\d{1,2}, \\d{4}\\.`));
  await expect.poll(async () => (await readSavedState(page)).firstLooks[0].submissions.length, { timeout: 30_000 }).toBe(1);
  const saved = await readSavedState(page);
  const sub = saved.projects[1].finance.deals.find((d: { kind: string }) => d.kind === 'studio');
  expect(Math.round((sub.decideAt - sub.askedAt) / 86_400_000)).toBe(60);
  await page.screenshot({ path: `test-results/first-look-${info.project.name}.png`, fullPage: true });

  // A family film isn't what a horror studio makes: it passes, and the film is free to go elsewhere.
  for (let i = 0; i < 12 && (await readSavedState(page)).projects[1].finance.deals.find((d: { kind: string }) => d.kind === 'studio').status === 'considering'; i++) await advance(page, 'week');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Bus' }).first().click();
  await section(page, 'Budget');
  await expect(look).toContainText(`${NIGHT} passed. You may take it to another studio; if one takes it, the $5,000 of development money is repaid from its money.`);
  // Taken elsewhere: the family studio can now be pitched, and is.
  await expect(page.getByRole('button', { name: `Pitch To ${MATINEE}` })).toBeEnabled();
  await page.getByRole('button', { name: `Pitch To ${MATINEE}` }).click();
  await expect(pitch.getByRole('listitem', { name: MATINEE })).toContainText('It has this project in front of it now.');
  await expect.poll(async () => (await readSavedState(page)).projects[1].finance.deals.filter((d: { kind: string }) => d.kind === 'studio').at(-1).backer, { timeout: 30_000 }).toBe(MATINEE);
  for (let i = 0; i < 4 && (await readSavedState(page)).projects[1].finance.deals.filter((d: { kind: string }) => d.kind === 'studio').at(-1).status === 'considering'; i++) await advance(page, 'week');
  const outside = (await readSavedState(page)).projects[1].finance.deals.filter((d: { kind: string }) => d.kind === 'studio').at(-1);
  expect(outside.backer).toBe(MATINEE);
  // Pinned (from November 13, 2026; until then the journey took either answer): in this world the family studio passes,
  // for a reason that is a fact of its record, not a draw. A short isn't what it makes. Made a feature, Night Bus meets
  // its full 2028 slate instead. Repayment from another studio's money, when one takes the film, is tests/first-look.test.ts
  // ("repaid once from another studio's money").
  expect([outside.status, outside.studio.verdict, outside.studio.against]).toEqual(['declined', 'pass', [`${MATINEE}'s record here is feature films. A short film isn't something it takes on.`]]);
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Bus' }).first().click();
  await section(page, 'Budget');
  await expect(pitch.getByRole('listitem', { name: MATINEE })).toContainText("A short film isn't something it takes on.");
});
