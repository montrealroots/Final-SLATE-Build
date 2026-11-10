// Stage 11 of the gameplay-depth package through the real interface: a proposal on Home, accepted or declined
// (SLATE-18-03). Whether a delivery brings a proposal is the engine's (tests/opportunities.test.ts); here the one
// fixture is two proposals written into the save, as that handler writes them, so the screen can be driven directly.
import { expect, test } from './test';
import { nav, pressSaveAndExit, quickLife, section } from './helpers';
import { hashString } from '../src/engine/rng';
import { firstSaveId, readRecord, writeRecords } from './vault';

test('a proposal is accepted into a funded project, another is declined, and both choices survive a reload', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-05-04');
  await pressSaveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  const proposal = (n: number, commissioner: string, amount: number) => ({
    id: `op-fixture-${n}`, fromProjectId: 'p-earlier', commissioner, amount, format: 'short', medium: 'live-action', technique: 'none',
    expiresAt: state.now + 30 * 86_400_000, status: 'open',
    reason: `${commissioner} saw Night Ferry and liked how it was received. They propose to fund your next project of the same kind.`,
  });
  state.opportunities = [proposal(1, 'Northgate Broadcasting', 70_000), proposal(2, 'Kingfisher Films', 52_000)]; // labelled fixture
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();

  const panel = page.locator('section.card', { has: page.getByRole('heading', { name: 'Proposals' }) });
  await expect(panel).toContainText('Northgate Broadcasting saw Night Ferry');
  await expect(panel).toContainText('$70,000 for a new short film, delivered within 18 months of accepting.');
  await expect(panel.getByRole('button', { name: 'Accept Proposal' }).first()).toBeDisabled(); // a title comes first
  // Decline the second.
  await panel.getByRole('button', { name: 'Decline' }).nth(1).click();
  await expect(panel).not.toContainText('Kingfisher Films');
  // Accept the first, naming the new project.
  await panel.getByLabel('Title For The New Project').fill('Second Crossing');
  await panel.getByRole('button', { name: 'Accept Proposal' }).click();
  await expect(page.getByRole('heading', { name: 'Second Crossing', level: 1 })).toBeVisible();
  // The project says whose proposal it came from, and after which work (November 9, 2026). The fixture's earlier work
  // ('p-earlier') isn't a project in this save, so the game says so in general words.
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Project', exact: true }) })).toContainText(/Proposed By\s*Northgate Broadcasting, after your earlier work/);
  await section(page, 'Budget');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Backers' }) })).toContainText('Northgate Broadcasting');

  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proposals' })).toHaveCount(0);
  await nav(page, 'Projects');
  await expect(page.getByRole('button', { name: 'Second Crossing' })).toBeVisible();
});

test('New Script says what the project goes through, and two projects with one title are told apart', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-05-04');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  // SLATE-03-05: the stages follow the medium and technique chosen.
  const stages = page.locator('section.card', { has: page.getByRole('heading', { name: 'What This Project Goes Through' }) });
  await expect(stages).toContainText('Production: Shoot days on location');
  await page.getByLabel('Medium').selectOption({ label: 'Animation' });
  await expect(stages).toContainText('motion capture sessions for any captured part');
  await page.getByLabel(/^Animation Technique/).selectOption({ label: 'Stop Motion' });
  await expect(stages).toContainText('build armatures, puppets and sets');
  await expect(stages).not.toContainText('Shoot days on location');
  await page.getByLabel('Medium').selectOption({ label: 'Live Action' });
  await page.getByLabel('Working Title').fill('Twin');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Twin', level: 1 })).toBeVisible();
  // SLATE-03-04: a second project with the same title.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Twin');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Twin', level: 1 })).toBeVisible();
  await nav(page, 'Projects');
  await expect(page.getByRole('button', { name: /^Twin, started May 4, 2026, first of that title$/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Twin, started May 4, 2026, second of that title$/ })).toBeVisible();
  await expect(page.getByText(/Short Film · Live Action · started May 4, 2026, second of that title/)).toBeVisible();
  await nav(page, 'Home');
  await expect(page.getByText(', started May 4, 2026, first of that title')).toBeVisible();
});
