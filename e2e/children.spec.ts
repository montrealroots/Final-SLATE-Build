// Child performers in the browser (src/engine/minors.ts, November 11, 2026): a part's age written in numbers, the rules
// of the place the production is based shown on the Cast page, the people a child needs with them asked for in Crew, and
// performers who play the part's age listed first, each child with what casting them brings.
import { expect, test, type Page } from './test';
import { addScene, newProject, pinSeed, quickLife, saveAndApprove, section } from './helpers';

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
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
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
