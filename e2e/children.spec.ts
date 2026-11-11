// Child performers in the browser (src/engine/minors.ts, November 11, 2026): a part's age written in numbers, the rules
// of the place the production is based shown on the Cast page, the people a child needs with them asked for in Crew, and
// performers who play the part's age listed first, each child with what casting them brings.
import { expect, test, type Page } from './test';
import { addScene, advance, castRoles, newProject, pinSeed, quickLife, runToDelivery, saveAndApprove, section, staffEveryDepartment } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const shot = (page: Page, project: string, name: string) => page.screenshot({ path: `test-results/children-${project}-${name}.png`, fullPage: true });

async function addCharacters(page: Page, names: string[]): Promise<void> {
  await section(page, 'Characters');
  for (const n of names) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
}

async function editCharacter(page: Page, name: string, fn: (c: ReturnType<Page['getByRole']>) => Promise<void>): Promise<void> {
  await section(page, 'Characters');
  const c = page.getByRole('article', { name });
  await c.getByRole('button', { name: 'Edit Character' }).click();
  await fn(c);
  await c.getByRole('button', { name: 'Close' }).click();
}

test('a child\'s part: the age in numbers, England\'s rules on the Cast page, a chaperone and a tutor in Crew, and children who play the age', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(300_000);
  await quickLife(page, 'gb-london', '2026-03-02');
  await pinSeed(page, 41);
  await newProject(page, { title: 'Kite Season', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await addCharacters(page, ['Mia', 'Tom']);
  await editCharacter(page, 'Mia', async (c) => {
    await c.getByLabel('Role Size').selectOption({ label: 'Lead' });
    await c.getByLabel('Age In Story').fill('10');
    await c.getByLabel('Up To').fill('11');
    await expect(c.getByLabel('Up To')).toHaveValue('11');
  });
  await editCharacter(page, 'Tom', async (c) => { await c.getByLabel('Age In Story').fill('40'); });
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Mia', 'Tom'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Garden', chars: ['Mia', 'Tom'], minutes: '3' });
  await saveAndApprove(page);

  // The Cast page: Mia's part is reckoned as a ten-year-old's until it's cast, under England's rules.
  await section(page, 'Cast');
  const kids = card(page, 'Children In The Cast');
  await expect(kids).toContainText("Under England's child performance regulations, a child's hours are limited");
  await expect(kids).toContainText('Mia: not cast yet; reckoned as 10 from the part\'s age. They may work 5 hours a day, and be at work 9.5 hours');
  await expect(kids).toContainText('Licensed Chaperone: 1');
  await expect(kids).toContainText('Tutor: 1');
  await shot(page, info.project.name, '01-children-card');

  // Finding performers for her: those who play ten or eleven first, each child with what casting them brings.
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'Mia' }).getByRole('button', { name: 'Find Performers' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Only Show People Who Are Free' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'List Performers Who Play This Age First' }).check();
  const first = dialog.locator('li').first();
  await expect(first).toContainText(/ Age (8|9|10|11|12|13)\. Plays ages \d+ to \d+\./);
  await expect(first).toContainText(", a child: they may work 5 hours a day, and be at work 9.5 hours, under England's child performance regulations.");
  await expect(first).toContainText('They need licensed chaperone and tutor with them, and a child performance licence from the local authority before their first day (21 days to arrange).');
  await shot(page, info.project.name, '02-child-candidates');
  await page.keyboard.press('Escape');

  // Crew: the chaperone and the tutor are required.
  await section(page, 'Crew');
  await expect(page.getByText('Licensed Chaperone', { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Required with children: England's rules require one with children under 16\./).first()).toBeVisible();
});

// A shoot with a child in the cast, played through to delivery (the gap RESUME-HERE.md listed until November 11, 2026):
// in Los Angeles, so the child needs a permit, a studio teacher on set, and 15% of their pay in a Coogan trust.
test('a shoot with a child in the cast: cast a ten-year-old, the permit before their days, a studio teacher hired, the shoot run to delivery, and their trust paid into', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'A full shoot runs once, at desktop width.');
  test.setTimeout(900_000);
  await quickLife(page, 'us-los-angeles', '2026-03-02');
  await pinSeed(page, 41);
  await newProject(page, { title: 'Kite Season', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await addCharacters(page, ['Mia', 'Tom']);
  await editCharacter(page, 'Mia', async (c) => {
    await c.getByLabel('Role Size').selectOption({ label: 'Lead' });
    await c.getByLabel('Age In Story').fill('10');
  });
  await editCharacter(page, 'Tom', async (c) => { await c.getByLabel('Age In Story').fill('40'); });
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Mia', 'Tom'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Garden', chars: ['Mia', 'Tom'], minutes: '3' });
  await saveAndApprove(page);

  // Cast Mia with a child who plays ten, offering to the children listed by age; offers are answered over the days that
  // follow, as a player sees.
  const kids = card(page, 'Children In The Cast');
  const castMia = /Mia: [^,]+, (9|10|11|12)\. They may work/;
  for (let week = 0; week < 4; week++) {
    await section(page, 'Cast');
    if (castMia.test(await kids.innerText())) break;
    const roles = page.locator('section.card', { hasText: 'Roles' }).first();
    const find = roles.locator('li', { hasText: 'Mia' }).getByRole('button', { name: 'Find Performers' }).first();
    if (await find.isVisible()) {
      await find.click();
      const dialog = page.getByRole('dialog');
      await dialog.getByRole('checkbox', { name: 'Only Show People Who Are Free' }).uncheck();
      await dialog.getByRole('checkbox', { name: 'List Performers Who Play This Age First' }).check();
      const offers = dialog.locator('li').filter({ hasText: ', a child: ' }).getByRole('button', { name: 'Make Offer' });
      for (let i = 0; i < Math.min(3, await offers.count()) && (await dialog.isVisible()); i++) await offers.nth(i).click();
      if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await castRoles(page); // Tom
    await advance(page, 'week');
    await section(page, 'Cast');
    for (const b of await page.getByRole('button', { name: 'Accept Counteroffer' }).all()) await b.click();
  }
  await section(page, 'Cast');
  await expect(kids).toContainText(castMia);
  await expect(kids).toContainText('No licence yet: it is applied for when the shoot is scheduled, a day ahead.');
  await expect(kids).toContainText("Under California's rules for minors in entertainment");

  // Crew: the studio teacher California requires is hired with the rest.
  // Crew offers are answered over the days that follow, too.
  const teacher = kids.locator('li', { hasText: 'Studio Teacher' });
  for (let week = 0; week < 4; week++) {
    await staffEveryDepartment(page);
    await section(page, 'Cast');
    if ((await teacher.innerText()).includes('Hired')) break;
    await advance(page, 'week');
  }
  await expect(teacher).toContainText('Hired');

  // The schedule asks for the permit; none of Mia's days comes before it is granted.
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await section(page, 'Cast');
  await expect(kids).toContainText(/Licence (applied for .+; granted|granted) /);

  // Shoot and finish it; her pay goes partly into her trust.
  await runToDelivery(page);
  await section(page, 'Cast');
  await expect(kids).toContainText(/15% of their pay goes to a Coogan trust account \(California Family Code §6752\): \$[1-9][\d,]* so far\./);
  await shot(page, info.project.name, '03-child-shoot-delivered');
});
