// Your own film and series as the catalog shows a recorded one (Catalog.tsx ProjectTitlePage and ProjectSeasonPage; the
// owner, November 19, 2026: "these should be accurate to the real tmdb film and series pages but obviously as if it was
// my movie and show"), and a part's gender written at creation (the owner: "in the creation set their gender").
import { expect, test, type Page } from './test';
import { nav, newProject, quickLife, section } from './helpers';

const panel = (page: Page, title: string) => page.locator('section.card', { has: page.getByRole('heading', { name: title, exact: true }) });

test.beforeEach(({}, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
});

test("a film of yours has a recorded film's page: you direct, write and produce it, and a part's gender is kept", async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-01-05');
  await newProject(page, { title: 'The Night Planes Of Uli', format: 'Feature Film' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Adaeze Okonkwo');
  await page.getByRole('button', { name: 'Add Character' }).click();
  const card = page.getByRole('article', { name: 'Adaeze Okonkwo' });
  await card.getByRole('button', { name: 'Edit Character' }).click();
  await card.getByLabel('Gender').selectOption({ label: 'Woman' });
  // A gender chosen with no pronouns set gives the part hers.
  await expect(card.getByLabel('Pronouns')).toHaveValue('she');
  await card.getByRole('button', { name: 'Close' }).click();
  await card.getByRole('button', { name: 'Edit Character' }).click();
  await expect(card.getByLabel('Gender')).toHaveValue('woman');
  await card.getByRole('button', { name: 'Close' }).click();

  await page.getByRole('button', { name: 'Its Film Page' }).click();
  await expect(page.getByRole('heading', { name: 'The Night Planes Of Uli', level: 1 })).toBeVisible();
  await expect(page.getByText('FILM', { exact: true }).or(page.getByText('Film', { exact: true })).first()).toBeVisible();
  for (const t of ['About', 'Figures', 'Credited Companies', 'Cast', 'Crew']) await expect(panel(page, t)).toBeVisible();
  await expect(panel(page, 'About')).toContainText('In Development');
  await expect(panel(page, 'Cast')).toContainText('No one is cast yet.');
  const crew = panel(page, 'Crew');
  for (const [dept, job] of [['Directing', 'Director'], ['Writing', 'Screenplay'], ['Production', 'Producer']]) {
    await expect(crew.locator('section', { has: page.getByRole('heading', { name: dept }) })).toContainText(job);
  }
  await expect(crew.getByText('You').first()).toBeVisible();
});

test("a series of yours has a series page and a season page, with every episode", async ({ page }) => {
  await quickLife(page, 'ie-dublin', '2026-01-05');
  await newProject(page, { title: 'The Liffey', format: 'Series', episodes: '3', runtime: '55' });
  await page.getByRole('button', { name: 'Its Series Page' }).click();
  await expect(page.getByRole('heading', { name: 'The Liffey', level: 1 })).toBeVisible();
  await expect(panel(page, 'About')).toContainText('Episode Length');
  await expect(panel(page, 'Series Crew')).toContainText('Executive Producer');
  await panel(page, 'Seasons').getByRole('button', { name: 'Season 1' }).click();
  await expect(page.getByRole('heading', { name: 'Season 1', level: 1 })).toBeVisible();
  const eps = panel(page, 'Episodes');
  for (const n of [1, 2, 3]) await expect(eps).toContainText(`${n}. Episode ${n}`);
  await expect(eps).toContainText('no air date');
  await nav(page, 'Projects');
});
