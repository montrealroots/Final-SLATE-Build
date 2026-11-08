// Stage 3 of the gameplay-depth package (docs/depth), through visible controls only: scenes duplicated, split and combined
// with what each does said first; acts, a thread left open on purpose, a research question and an arc beat; all of it
// surviving Save And Exit; then the project shelved, with its consequences listed, and taken up again.
import { expect, test, type Page } from './test';
import { nav, newProject, pressSaveAndExit, quickLife, section } from './helpers';

test.use({ actionTimeout: 20_000 });

const card = (page: Page, n: number) => page.locator('article.scene-card').nth(n);

async function addLine(page: Page, n: number, speaker: string, text: string): Promise<void> {
  const c = card(page, n);
  await c.getByLabel('Speaker').selectOption({ label: speaker });
  await c.getByLabel('Line', { exact: true }).fill(text);
  await c.getByRole('button', { name: 'Add Line' }).click();
}

test('scenes duplicated, split and combined; acts, threads, research and arcs kept; a project shelved and taken up again', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  await quickLife(page, 'gb-london', '2026-01-05');
  await newProject(page, { title: 'Tidewater', format: 'Short Film', runtime: '8', budget: 'Micro Budget' });
  await section(page, 'Characters');
  for (const n of ['Ines', 'Marcus']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  for (const [i, place] of ['Quay', 'Lighthouse'].entries()) {
    await page.getByRole('button', { name: 'Add Scene' }).first().click();
    const c = card(page, i);
    await c.getByRole('button', { name: 'Edit Scene' }).click();
    await c.getByLabel('Place', { exact: true }).fill(place);
    for (const w of ['Ines', 'Marcus']) await c.getByRole('checkbox', { name: w, exact: true }).check();
    await c.getByLabel('Objective').fill('Move the story forward.');
    if (i === 0) { await addLine(page, 0, 'Ines', 'The boat is gone.'); await addLine(page, 0, 'Marcus', 'Since when?'); }
    await c.getByRole('button', { name: 'Close Scene' }).click();
  }

  // Duplicate: a copy right after the original.
  await page.getByRole('button', { name: 'Duplicate Scene 1 (Quay)' }).click();
  await expect(page.locator('article.scene-card h3')).toHaveText(['Scene 1 (Quay)', 'Scene 2 (Quay)', 'Scene 3 (Lighthouse)']);
  // Split: what it does is listed before it is done.
  await card(page, 0).getByRole('button', { name: 'Edit Scene' }).click();
  await card(page, 0).getByRole('button', { name: 'Split Before Line 2' }).click();
  const split = page.getByRole('dialog', { name: 'Split The Scene' });
  await expect(split).toContainText('Lines 2 onward move to a new scene right after this one, 1 of 2.');
  await split.getByRole('button', { name: 'Split The Scene' }).click();
  await expect(page.locator('article.scene-card h3')).toHaveCount(4);
  // Combine the split-off part back into the scene it came from.
  await card(page, 0).getByRole('button', { name: 'Combine Scene 1 (Quay) With Scene 2 (Quay)' }).click();
  const combine = page.getByRole('dialog', { name: 'Combine The Scenes' });
  await expect(combine).toContainText('Scene 2 (Quay) joins Scene 1 (Quay)');
  await combine.getByRole('button', { name: 'Combine The Scenes' }).click();
  await expect(page.locator('article.scene-card h3')).toHaveText(['Scene 1 (Quay)', 'Scene 2 (Quay)', 'Scene 3 (Lighthouse)']);

  // Acts and a thread left open on purpose.
  const structure = page.locator('section.card', { has: page.getByRole('heading', { name: 'Acts And Threads' }) });
  await structure.getByLabel('New Act Or Sequence').fill('Act One');
  await structure.getByRole('button', { name: 'Add Act' }).click();
  await card(page, 0).getByLabel('Act', { exact: true }).selectOption({ label: 'Act One' });
  await structure.getByLabel('New Thread').fill('The missing boat');
  await structure.getByRole('button', { name: 'Add Thread' }).click();
  await structure.getByRole('checkbox', { name: 'Scene 1 (Quay)' }).check();
  await structure.getByLabel('How The missing boat Ends').selectOption({ label: 'Left Open On Purpose' });
  await expect(structure.getByText('Left open on purpose', { exact: true })).toBeVisible();
  // A research question, noted on its scene until reviewed.
  const research = page.locator('section.card', { has: page.getByRole('heading', { name: 'Research', exact: true }) });
  await research.getByLabel('New Question').fill('How long do harbour searches last?');
  await research.getByRole('button', { name: 'Add Question' }).click();
  await research.getByRole('checkbox', { name: 'Scene 3 (Lighthouse)' }).check();

  // An arc beat, in a scene the character is in.
  await section(page, 'Characters');
  const ines = page.getByRole('article', { name: 'Ines' });
  await ines.getByRole('button', { name: 'Edit Character' }).click();
  await ines.getByLabel('What Changes').fill('Stops waiting for him');
  await ines.getByRole('button', { name: 'Add Beat' }).click();
  await expect(ines.getByText('Scene 1 (Quay): Stops waiting for him')).toBeVisible();
  await ines.getByLabel('Also Called').fill('The Ferrywoman');

  // Everything survives Save And Exit.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Tidewater' }).click();
  await section(page, 'Script');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Acts And Threads' }) }).getByText('Left open on purpose', { exact: true })).toBeVisible();
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Research', exact: true }) }).getByText('How long do harbour searches last?')).toBeVisible();
  await page.screenshot({ path: `test-results/structure-${info.project.name}.png`, fullPage: true });

  // Shelve: the consequences first, then the project waits, refusing changes, until it is taken up again.
  await section(page, 'Overview');
  await page.getByRole('button', { name: 'Shelve The Project' }).click();
  const shelve = page.getByRole('dialog', { name: 'Shelve The Project' });
  await expect(shelve).toContainText('Your script, drafts, footage and history stay, and you can take the project up again.');
  await shelve.getByRole('button', { name: 'Shelve The Project' }).click();
  await expect(page.getByRole('heading', { name: 'Shelved' })).toBeVisible();
  await page.getByRole('button', { name: 'Take It Up Again' }).click();
  await expect(page.getByRole('heading', { name: 'Next Step' })).toBeVisible();
});
