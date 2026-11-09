// What the input audit of November 9, 2026 made the game read, seen where a player sees it (docs/INPUT-AUDIT.md): a
// setting abroad asks for research, a note can be about a scene, and a project keeps its dates and its own updates.
import { expect, test } from './test';
import { addScene, nav, quickLife, saveAndApprove, section } from './helpers';

test('a story set abroad is researched; drafts, notes and updates keep their dates and scenes', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-09-01');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Far Shore');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByText('Where The Story Is Set (Optional)').click();
  await expect(page.getByText(/A setting in another country than your base is researched by your designers/)).toBeVisible();
  const setting = page.locator('details', { hasText: 'Where The Story Is Set (Optional)' });
  await setting.getByRole('combobox', { name: 'Story Setting Place, Country Or Territory' }).selectOption({ label: 'France' });
  await setting.getByRole('searchbox', { name: 'Story Setting Place' }).fill('Paris');
  await setting.getByRole('group', { name: 'Story Setting Place Results' }).getByRole('button').first().click();
  await expect(setting.getByText(/^Chosen: Paris/)).toBeVisible();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Far Shore', level: 1 })).toBeVisible();

  // The Overview: when it started, where it's based and where it's set.
  await section(page, 'Overview');
  const project = page.locator('section.card', { has: page.getByRole('heading', { name: 'Project', exact: true }) });
  await expect(project).toContainText(/Started\s*September 1, 2026/);
  await expect(project).toContainText(/Set In\s*Paris/);

  // The Story panel says what the setting asks of the designers.
  await section(page, 'Script');
  await expect(page.getByText(/^Set in Paris, France\. Your designers research it before design and costumes start/)).toBeVisible();

  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Quay', chars: ['Ines'], minutes: '3' });

  // A revision note about one scene names it.
  await page.getByLabel('Note', { exact: true }).fill('Tighten the arrival.');
  await page.getByLabel('About').selectOption({ label: 'Scene 1 (Quay)' });
  await page.getByRole('button', { name: 'Add Note' }).click();
  await expect(page.getByText('Tighten the arrival. (Scene 1 (Quay))')).toBeVisible();

  await saveAndApprove(page);
  await section(page, 'Script');
  await expect(page.getByText(/Saved September 1, 2026\./).first()).toBeVisible();

  // The approved draft brings the research into the estimate: a researcher is among the crew still to come.
  await section(page, 'Budget');
  // Read inside Everything Still To Come: the researcher can also rank among What Makes It Expensive, by the world's rates.
  const toCome = page.locator('details', { has: page.locator('summary', { hasText: /^Everything Still To Come/ }) });
  await toCome.locator('summary').click();
  await expect(toCome.getByText(/^Researcher: \$/)).toBeVisible();

  // The project's own updates, newest first, on its Overview.
  await section(page, 'Overview');
  const updates = page.locator('section.card', { has: page.getByRole('heading', { name: 'Recent Updates' }) });
  await expect(updates).toContainText('You approved the first draft of Far Shore.');
});
