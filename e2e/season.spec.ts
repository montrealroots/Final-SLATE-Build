// Stage 4 of the gameplay-depth package (docs/depth), through visible controls only: a season's arc, an episode renamed
// and moved earlier with its scenes, a world rule and a relationship whose change or removal lists the episodes and
// scenes it touches first (SLATE-07-01.02, 07-02.02); all of it surviving Save And Exit.
import { expect, test } from './test';
import { addScene, nav, pressSaveAndExit, quickLife, section } from './helpers';

test.use({ actionTimeout: 20_000 });

test('a season planned and reordered; changing a shared fact says which episodes it touches first', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-plus'].includes(info.project.name), 'Runs at desktop, phone and WebKit iPhone width.');
  await quickLife(page, 'gb-london', '2026-01-05');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Tidewater');
  await page.getByLabel('Format').selectOption({ label: 'Limited Series' });
  await page.getByLabel('Episodes').fill('2');
  for (const g of ['Fantasy', 'Drama']) {
    await page.getByRole('searchbox', { name: 'Search Genres' }).fill(g.toLowerCase());
    await page.getByRole('button', { name: `Add ${g}`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Tidewater', level: 1 })).toBeVisible();
  await section(page, 'Characters');
  for (const n of ['Mara', 'Tom']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara', 'Tom'], episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Mara'], episodeButton: 'Add Scene To Episode 2' });
  await addScene(page, { index: 2, place: 'Boat', chars: ['Mara', 'Tom'], episodeButton: 'Add Scene To Episode 2' });

  // The season: an arc, a title, and the second episode moved first with its scenes.
  const season = page.locator('section.card', { has: page.getByRole('heading', { name: 'Season', exact: true }) });
  await season.getByLabel('Season Arc').fill('Mara gives up the sea, then takes it back.');
  await season.getByLabel('Title Of Episode 2').fill('The Storm');
  await season.getByRole('button', { name: 'Rename' }).nth(1).click();
  await expect(season.getByText('Episode 2: The Storm')).toBeVisible();
  await season.getByRole('button', { name: 'Move The Storm Earlier' }).click();
  await expect(season.locator('li strong')).toHaveText(['Episode 1: The Storm', 'Episode 2: Episode 2']);
  await expect(page.locator('article.scene-card h3')).toHaveText(['Episode 1, Scene 1 (Kitchen)', 'Episode 1, Scene 2 (Boat)', 'Episode 2, Scene 1 (Pier)']);
  await season.getByLabel('What Episode 1 Moves').fill('She sells the boat.');

  // A rule the Kitchen relies on: changing it lists that scene, under its episode, before anything changes.
  const rules = page.locator('section.card', { has: page.getByRole('heading', { name: 'Story World Rules' }) });
  await rules.getByLabel('Rule', { exact: true }).fill('The tide never lies');
  await rules.getByRole('button', { name: 'Add Rule' }).click();
  await rules.getByRole('checkbox', { name: 'Episode 1, Scene 1 (Kitchen)' }).check();
  await rules.getByRole('button', { name: 'Change The Rule The tide never lies' }).click();
  const change = page.getByRole('dialog', { name: 'Change The Rule' });
  await expect(change).toContainText('The Storm: Scene 1 (Kitchen).');
  await change.getByLabel('Rule', { exact: true }).fill('The tide lies once a year');
  await change.getByRole('button', { name: 'Save The Change' }).click();
  await expect(rules.getByText('The tide lies once a year')).toBeVisible();

  // A relationship touches every scene its two characters share; removing it says so, and Keep It keeps it.
  const rels = page.locator('section.card', { has: page.getByRole('heading', { name: 'Relationships' }) });
  await rels.getByLabel('First Character').selectOption({ label: 'Mara' });
  await rels.getByLabel('Second Character').selectOption({ label: 'Tom' });
  await rels.getByLabel('Relationship', { exact: true }).fill('Old friends');
  await rels.getByRole('button', { name: 'Add Relationship' }).click();
  await rels.getByRole('button', { name: 'Remove The Relationship Of Mara and Tom' }).click();
  const remove = page.getByRole('dialog', { name: 'Remove The Relationship' });
  await expect(remove).toContainText('The Storm: Scene 2 (Boat).');
  await expect(remove).toContainText('Episode 2: Scene 1 (Pier).');
  await remove.getByRole('button', { name: 'Keep It' }).click();
  await expect(rels.getByText('Mara and Tom: Old friends.')).toBeVisible();

  // All of it survives Save And Exit.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Tidewater' }).click();
  await section(page, 'Script');
  await expect(season.getByLabel('Season Arc')).toHaveValue('Mara gives up the sea, then takes it back.');
  await expect(season.locator('li strong')).toHaveText(['Episode 1: The Storm', 'Episode 2: Episode 2']);
  await expect(rules.getByText('The tide lies once a year')).toBeVisible();
  await page.screenshot({ path: `test-results/season-${info.project.name}.png`, fullPage: true });
});
