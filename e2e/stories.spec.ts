// Full stories through the interface (the v3 package, suite T03): a film and a series each chosen, read, changed and
// applied; a field of the player's kept; the whole thing undone and applied again; reloaded; and carried on from.
// Nothing here is prepared outside the interface except the quick character (helpers.ts quickLife).
import { expect, test, type Page } from './test';
import { freshStart, nav, newProject, quickLife, readSavedState, saveAndExit, section } from './helpers';
import { layoutFindings } from './layout';

const noSidewaysScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
const project = async (page: Page) => (await readSavedState(page))?.projects?.[0];
const shot = (page: Page, n: string, name: string) => page.screenshot({ path: `test-results/stories-${n}-${name}.png`, fullPage: true });

async function openStory(page: Page, genre: RegExp, title: string) {
  await page.getByRole('button', { name: 'Choose A Full Story' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose A Full Story' });
  const label = (await picker.getByLabel('Genre').locator('option').allInnerTexts()).find((t) => genre.test(t))!;
  await picker.getByLabel('Genre').selectOption({ label });
  await picker.getByRole('button', { name: new RegExp(`^${title}`) }).click();
  return page.getByRole('dialog', { name: title });
}

test('a full film story: read, renamed, a field kept, applied, undone, applied again, and still there after a reload', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and one WebKit iPhone emulation.');
  const n = info.project.name;
  await freshStart(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Untitled Film', format: 'Feature Film', budget: 'Low Budget' });
  await section(page, 'Script');
  // The player's own words, written first.
  await page.getByLabel('Theme', { exact: true }).fill('Mine, and staying.');

  // The list says, for each story, what it is before it is chosen.
  await page.getByRole('button', { name: 'Choose A Full Story' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose A Full Story' });
  const heist = (await picker.getByLabel('Genre').locator('option').allInnerTexts()).find((t) => /^Heist \(/.test(t))!;
  await picker.getByLabel('Genre').selectOption({ label: heist });
  const card = picker.getByRole('button', { name: /^The Quiet Floor/ });
  await expect(card).toContainText('Heist, Drama · Feature Film · The Present Day · Lisbon');
  await expect(card).toContainText('Original Story');
  await noSidewaysScroll(page);
  await shot(page, n, '01-list');
  // Closing changes nothing.
  await picker.getByRole('button', { name: 'Keep My Script As It Is' }).click();
  await expect(page.getByLabel('Logline', { exact: true })).toHaveValue('');

  const story = await openStory(page, /^Heist \(/, 'The Quiet Floor');
  await expect(story.getByText('An original story written for this game: The Quiet Floor (heist.f01).')).toBeHidden(); // inside Where It Is From
  await story.getByText('Where It Is From').click();
  await expect(story.getByText(/^An original story written for this game: The Quiet Floor \(heist\.f01\)\. It is not taken from a real film/)).toBeVisible();
  // Its people can be renamed before anything is written, and the story's words follow.
  await story.getByLabel('Name For Inês Marçal').fill('Marta Queirós');
  await expect(story.locator('.idea-sentence')).toHaveText(/^A night cleaner who has memorised/);
  await expect(story.getByRole('region', { name: 'The Outline' })).toContainText('Marta Queirós cleans the floor to the second');
  // Everything it would write is listed, and the field with the player's words is kept unless they say otherwise.
  const writes = story.getByRole('region', { name: 'What It Would Write' });
  for (const f of ['Working Title', 'Genres', 'Logline', 'Synopsis', 'Characters', 'Relationships', 'Scene Outline', 'Look And Sound Suggestions']) await expect(writes.getByText(f, { exact: true })).toBeVisible();
  await expect(writes.getByRole('checkbox', { name: 'Keep My Theme' })).toBeChecked();
  await expect(writes).toContainText('Yours: Mine, and staying.');
  await expect(writes).toContainText('This is an outline to develop, not a screenplay');
  expect(await layoutFindings(page), 'the story, open').toEqual([]);
  await noSidewaysScroll(page);
  await shot(page, n, '02-story-open');
  await story.getByRole('button', { name: 'Apply This Story' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Applied: The Quiet Floor.' })).toBeVisible();

  // The whole brief, the people, what is between them and the outline arrived together.
  await expect(page.getByRole('heading', { name: 'The Quiet Floor', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Logline', { exact: true })).toHaveValue(/^A night cleaner who has memorised/);
  await expect(page.getByLabel('Synopsis', { exact: true })).toHaveValue(/^Marta Queirós knows the bank by sound/);
  await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('Mine, and staying.');
  await expect(page.getByLabel('How It Is Built', { exact: true })).toHaveValue('Three Acts');
  await expect(page.locator('article.scene-card')).toHaveCount(9);
  const brief = page.getByRole('region', { name: 'Creative Brief' });
  await expect(brief).toContainText('Which Story It Is From: The Quiet Floor, an original story written for this game.');
  await expect(brief).toContainText('Look: Sodium light on wet tram tracks');
  await expect.poll(async () => (await project(page))?.blueprint?.id).toBe('heist.f01');
  let p = await project(page);
  expect(p.characters.map((c: { name: string }) => c.name)).toEqual(['Marta Queirós', 'Rui Marçal', 'Tomás Vidal', 'Caetano Reis', 'Dona Amélia Brandão']);
  expect(p.relationships).toHaveLength(4);
  expect(p.axes.genres).toEqual([{ id: 'heist', emphasis: 'primary' }, { id: 'drama', emphasis: 'secondary' }]);
  expect(JSON.stringify(p)).not.toMatch(/\{[a-z]+\}/);
  expect(await layoutFindings(page), 'Script, with the story applied').toEqual([]);

  // Undo takes the whole story back in one step.
  await page.getByRole('button', { name: 'Undo Last Change' }).click();
  await expect(page.getByRole('heading', { name: 'Untitled Film', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Logline', { exact: true })).toHaveValue('');
  await expect(page.locator('article.scene-card')).toHaveCount(0);
  await expect.poll(async () => (await project(page))?.characters.length).toBe(0);
  expect((await project(page)).blueprint).toBeUndefined();

  // Applied again, with the theme replaced this time; then closed, and opened again.
  const again = await openStory(page, /^Heist \(/, 'The Quiet Floor');
  await again.getByRole('checkbox', { name: 'Keep My Theme' }).uncheck();
  await again.getByRole('button', { name: 'Apply This Story' }).click();
  await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('who is trusted and why; work nobody sees; what the dying are owed');
  await saveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: /The Quiet Floor/ }).first().click();
  await section(page, 'Characters');
  await expect(page.getByRole('article', { name: 'Inês Marçal' })).toBeVisible();
  const ines = page.getByRole('article', { name: 'Inês Marçal' });
  await ines.getByRole('button', { name: 'Edit Character' }).click();
  await expect(ines.getByLabel('How They Change')).toHaveValue('From keeping every rule to choosing which ones matter');
  await expect(ines.getByLabel('What In Them Pulls Against It')).toHaveValue('Scrupulously honest and the best thief in the building');
  await noSidewaysScroll(page);
  await shot(page, n, '03-character');
  // Carried on from: the outline is a script the game can check, save and approve like any other.
  await section(page, 'Script');
  await expect(page.locator('article.scene-card')).toHaveCount(9);
  await page.getByRole('button', { name: 'Declare None Of These' }).click();
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  p = await project(page);
  await expect.poll(async () => (await project(page))?.approvedDraft).not.toBeNull();
  // After approval a full story is for a script still being written: the picker says so, and applies nothing.
  const late = await openStory(page, /^Heist \(/, 'The Quiet Floor');
  await expect(late.getByRole('alert')).toContainText('A draft of this script has been approved and work has begun on it.');
  await expect(late.getByRole('button', { name: 'Apply This Story' })).toBeDisabled();
});

test('a full series story: the season arrives with it, a locked field is left alone, and it is there after a reload', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and one WebKit iPhone emulation.');
  const n = info.project.name;
  await freshStart(page);
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Untitled Series', format: 'Limited Series', episodes: '6', budget: 'Low Budget' });
  await section(page, 'Script');
  await page.getByLabel('Tone', { exact: true }).fill('My tone');
  const story = await openStory(page, /^Nordic Noir \(/, 'Meltwater');
  await expect(story.getByRole('region', { name: 'The Season' })).toContainText('Grid Seven.');
  // Lock the tone from here: it is then left alone, and listed as locked.
  const writes = story.getByRole('region', { name: 'What It Would Write' });
  await writes.getByRole('button', { name: 'Lock Tone' }).click();
  await expect(writes.getByText('Locked and left alone: Tone.')).toBeVisible();
  await noSidewaysScroll(page);
  await shot(page, n, '04-series-open');
  await story.getByRole('button', { name: 'Apply This Story' }).click();
  await expect(page.getByRole('heading', { name: 'Meltwater', level: 1 })).toBeVisible();
  await expect(page.getByLabel('Tone', { exact: true })).toHaveValue('My tone');
  // The season: its arc, what an episode does, each episode's title and what it moves, the places it returns to, and that it ends.
  await expect(page.getByLabel('Season Arc')).toHaveValue(/^From a body that proves Ane Lunde never left/);
  await expect(page.getByLabel('What An Episode Does')).toHaveValue(/^Each chapter takes one searcher's memory of 1987/);
  await expect(page.getByLabel('Places It Returns To')).toHaveValue('Skardvik Police Station; Sandnes House; Ferry Kiosk; Glacier Tongue; Town Hall');
  await expect(page.getByLabel('How It Goes On Or Ends')).toHaveValue(/^It ends\./);
  await expect(page.getByLabel('Title Of Episode 2')).toHaveValue('Grid Seven');
  await expect(page.getByLabel('What Episode 5 Moves')).toHaveValue('Arne Sandnes tells Liv Sandnes what he found on the ice and what he chose');
  await expect(page.locator('article.scene-card')).toHaveCount(8);
  const brief = page.getByRole('region', { name: 'Creative Brief' });
  await expect(brief.getByRole('list', { name: 'Locked Fields' })).toContainText('Tone');
  expect(await layoutFindings(page), 'Script, with the series applied').toEqual([]);
  await noSidewaysScroll(page);
  await shot(page, n, '05-series-applied');
  await brief.getByRole('button', { name: 'Unlock Tone' }).click();
  await expect(brief.getByRole('list', { name: 'Locked Fields' })).toHaveCount(0);
  await saveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const p = await project(page);
  expect(p.series.recurring).toHaveLength(5);
  expect(p.episodes.map((e: { title: string }) => e.title)).toEqual(['The Red Anorak', 'Grid Seven', 'The Boy Who Was Ill', 'What The Teacher Did', 'Thirteen', 'Meltwater']);
  expect(p.characters.find((c: { name: string }) => c.name === 'Liv Sandnes').seriesInvolvement).toBe('regular');
  expect(p.locks).toBeUndefined();
});
