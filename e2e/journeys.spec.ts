import { expect, test, type Page } from '@playwright/test';
import { addScene, advance, creditsTable, nav, produceToDelivery, quickLife, saveAndApprove, section } from './helpers';

test.describe.configure({ timeout: 900_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'Full media journeys run once, at desktop width.'));

async function newProject(page: Page, o: { title: string; format: string; medium?: string; technique?: string; finish?: string; episodes?: string; runtime?: string }): Promise<void> {
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill(o.title);
  await page.getByLabel('Format').selectOption({ label: o.format });
  if (o.medium) await page.getByLabel('Medium').selectOption({ label: o.medium });
  if (o.technique) await page.getByLabel(/^Animation Technique/).selectOption({ label: o.technique });
  if (o.finish) await page.getByLabel('Animation Finish').selectOption({ label: o.finish });
  if (o.episodes) await page.getByLabel('Episodes').fill(o.episodes);
  if (o.runtime) await page.getByLabel(/Target (Runtime In Minutes|Minutes Per Episode)/).fill(o.runtime);
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: o.title, level: 1 })).toBeVisible();
}

async function addCharacters(page: Page, names: string[]): Promise<void> {
  await section(page, 'Characters');
  for (const n of names) {
    await page.getByLabel('Character Name').fill(n);
    await page.getByRole('button', { name: 'Add Character' }).click();
  }
  await section(page, 'Script');
}

async function entryStatus(page: Page): Promise<string> {
  return (await page.locator('section', { hasText: 'Your Entries' }).first().locator('.chip').first().innerText()).trim();
}

test('2D animation: deliver, release digitally, enter the Annie Awards and reach the ceremony', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-01-05');
  await newProject(page, { title: 'Paper Kite', format: 'Short Film', medium: 'Animation', technique: 'Drawn 2D', finish: 'Limited Animation', runtime: '2' });
  await addCharacters(page, ['Juno', 'Kite']);
  await addScene(page, { index: 0, place: 'Rooftop', chars: ['Juno', 'Kite'], minutes: '0.5' });
  await saveAndApprove(page);
  await produceToDelivery(page, { yourself: ['Juno'] });
  const credits = await creditsTable(page);
  expect(credits).toContain('Voice Cast');
  expect(credits).toContain('as Juno');
  expect(credits).toContain('as Kite');
  // Distribution if anyone offers; otherwise a digital self-release.
  const accept = page.getByRole('button', { name: 'Accept Offer' }).first();
  if (await accept.isVisible()) await accept.click();
  await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
  await page.getByLabel('Territory Code').fill('US');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  await advance(page, 'month');
  await advance(page, 'month');
  await section(page, 'Release');
  await expect(page.locator('section', { hasText: 'Release History' }).getByText('Released', { exact: true }).first()).toBeVisible();
  // Award entry once the Annie Awards 2027 open.
  await section(page, 'Festivals And Awards');
  for (let i = 0; i < 10 && !(await page.locator('li', { hasText: 'Annie Awards 2027' }).filter({ hasText: 'Open To You' }).isVisible()); i++) {
    await advance(page, 'month');
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Paper Kite' }).click();
    await section(page, 'Festivals And Awards');
  }
  await page.locator('li', { hasText: 'Annie Awards 2027' }).getByRole('button', { name: 'Annie Awards 2027' }).click();
  await page.locator('li', { hasText: 'Best Short Subject' }).getByRole('button', { name: 'Prepare Submission' }).click();
  await expect(page.getByText("This entry meets the game's rules for this category.")).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit Entry' }).click();
  await expect(page.locator('section', { hasText: 'Your Entries' }).getByText('Submitted')).toBeVisible();
  // Through nominations and the ceremony.
  for (let i = 0; i < 12; i++) {
    await advance(page, 'month');
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Paper Kite' }).click();
    await section(page, 'Festivals And Awards');
    if (['Won', 'Did Not Win', 'Not Accepted'].includes(await entryStatus(page))) break;
    // A non-nominated entry is final, but the winner is only public after the ceremony.
    if ((await entryStatus(page)) === 'Not Nominated') {
      await advance(page, 'month');
      await advance(page, 'month');
      break;
    }
  }
  expect(['Won', 'Did Not Win', 'Not Nominated', 'Not Accepted']).toContain(await entryStatus(page));
  await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: 'Annie Awards 2027' }).click();
  await expect(page.locator('li', { hasText: 'Best Short Subject' }).getByText(/Winner: /)).toBeVisible();
  await page.screenshot({ path: 'test-results/journey-2d-awards.png', fullPage: true });
});

test('hybrid: a live-action scene and a 3D scene share one production', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-04-06');
  await newProject(page, { title: 'Bramblewood', format: 'Short Film', medium: 'Hybrid', technique: '3D CG', finish: 'Limited Animation', runtime: '4' });
  await addCharacters(page, ['Mara', 'Sprite']);
  await section(page, 'Characters');
  const sprite = page.getByRole('article', { name: 'Sprite' });
  await sprite.getByRole('button', { name: 'Edit Character' }).click();
  await sprite.getByLabel('Entity').selectOption({ label: 'Supernatural' });
  await sprite.getByLabel('Realized As').selectOption({ label: 'Computer Generated' });
  await sprite.getByRole('checkbox', { name: 'On Camera' }).uncheck();
  await sprite.getByRole('checkbox', { name: 'Voice' }).check();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Mara'], minutes: '1' });
  await addScene(page, { index: 1, place: 'Burrow', chars: ['Sprite'], minutes: '0.5', technique: '3D CG' });
  await saveAndApprove(page);
  await produceToDelivery(page, { yourself: ['Mara'] });
  await section(page, 'Production');
  for (const t of ['Plate Integration: Scene 2 (Burrow)', 'Animate Scene 2 (Burrow)']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await section(page, 'Schedule');
  await expect(page.locator('li', { hasText: 'Kitchen' }).first()).toBeVisible();
  await expect(page.locator('li', { hasText: 'Burrow' })).toHaveCount(0); // the animated scene is never "shot"
  const credits = await creditsTable(page);
  expect(credits).toContain('as Mara');
  expect(credits).toMatch(/Voice Cast[\s\S]*as Sprite/);
});

test('documentary: consent and fact checks gate delivery', async ({ page }) => {
  await quickLife(page, 'nl-amsterdam', '2026-03-02');
  await newProject(page, { title: 'Lock Keepers', format: 'Documentary Short', runtime: '6' });
  for (const [n, r] of [['Joost de Vries', 'Lock keeper'], ['Fenna Bakker', 'Historian'], ['Ruud Smit', 'Boat owner']]) {
    await page.getByLabel('Contributor Name').fill(n);
    await page.getByLabel('Who They Are').fill(r);
    await page.getByRole('button', { name: 'Add Contributor' }).click();
  }
  await page.getByLabel('Claim').fill('The lock has operated since 1673.');
  await page.getByLabel('Status', { exact: true }).selectOption({ label: 'Established' });
  await page.getByRole('button', { name: 'Add Fact' }).click();
  for (let k = 0; k < 3; k++) await page.getByRole('button', { name: 'Request Consent' }).first().click();
  await expect(page.getByRole('button', { name: 'Request Consent' })).toHaveCount(0);
  await advance(page, 'week');
  await advance(page, 'week');
  await section(page, 'Script');
  const given = [];
  for (const n of ['Joost de Vries', 'Fenna Bakker', 'Ruud Smit']) {
    if (await page.locator('li', { hasText: n }).getByText('Consent Given').isVisible()) given.push(n);
  }
  test.skip(given.length === 0, 'All three contributors declined in this seeded world (about 1 in 100).');
  await addScene(page, { index: 0, place: 'Lock House', contributors: [given[0]], minutes: '2', episodeButton: 'Add Sequence' });
  await saveAndApprove(page);
  await produceToDelivery(page, {});
  const credits = await creditsTable(page);
  expect(credits).toContain('Researcher');
  expect(credits).not.toContain('Cast');
});

test('TV limited series: episodes, a guest role and episode-level credits', async ({ page }) => {
  await quickLife(page, 'us-atlanta', '2026-02-02');
  await newProject(page, { title: 'Night Ward', format: 'Limited Series', episodes: '2', runtime: '10' });
  await addCharacters(page, ['Dr. Ines Park', 'Marcus']);
  await addScene(page, { index: 0, place: 'Emergency Room', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Emergency Room', chars: ['Dr. Ines Park', 'Marcus'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 2, place: 'Rooftop', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  await saveAndApprove(page);
  await section(page, 'Crew');
  await expect(page.getByRole('heading', { name: 'Episode Writers And Directors' })).toBeVisible();
  await produceToDelivery(page, { yourself: ['Dr. Ines Park'] });
  const credits = await creditsTable(page);
  expect(credits).toContain('Executive Producer And Showrunner');
  expect(credits).toMatch(/as Marcus, Episodes 1\b/);
  expect(credits).toMatch(/as Dr\. Ines Park, Episodes 1, 2/);
});

test('web series: short-form episodes deliver with per-episode work', async ({ page }) => {
  await quickLife(page, 'au-sydney', '2026-05-04');
  await newProject(page, { title: 'Tiny Flat', format: 'Web Series', episodes: '2', runtime: '5' });
  await addCharacters(page, ['Bea', 'Lou']);
  await addScene(page, { index: 0, place: 'Flat', chars: ['Bea', 'Lou'], minutes: '1.5', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Flat', chars: ['Bea'], minutes: '1.5', episodeButton: 'Add Scene To Episode 2' });
  await saveAndApprove(page);
  await produceToDelivery(page, {});
  await section(page, 'Production');
  for (const t of ['Assembly Edit, Episode 1', 'Assembly Edit, Episode 2']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  const credits = await creditsTable(page);
  expect(credits).not.toMatch(/Cast\s+Nia Halvorsen-Mbeki/); // stayed behind the camera
});

test('3D animation to delivery, with a motion-capture performance', async ({ page }) => {
  await quickLife(page, 'ca-vancouver', '2026-01-05');
  await newProject(page, { title: 'Iron Orchard', format: 'Short Film', medium: 'Animation', technique: '3D CG', finish: 'Limited Animation', runtime: '2' });
  await addCharacters(page, ['Wren', 'The Golem']);
  await section(page, 'Characters');
  const golem = page.getByRole('article', { name: 'The Golem' });
  await golem.getByRole('button', { name: 'Edit Character' }).click();
  await golem.getByLabel('Entity').selectOption({ label: 'Monster' });
  await golem.getByRole('checkbox', { name: 'Motion Capture' }).check();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Orchard', chars: ['Wren', 'The Golem'], minutes: '0.5' });
  await saveAndApprove(page);
  await section(page, 'Cast');
  await expect(page.getByText('Performance Capture:')).toBeVisible();
  await produceToDelivery(page, { yourself: ['Wren'], step: 'month', weeks: 30 });
  await section(page, 'Production');
  await expect(page.getByText('Motion Capture: The Golem', { exact: true })).toBeVisible();
  await expect(page.getByText('Render: Scene 1 (Orchard)', { exact: true })).toBeVisible();
  const credits = await creditsTable(page);
  expect(credits).toMatch(/Performance Capture[\s\S]*as The Golem/);
  expect(credits).toMatch(/Voice Cast[\s\S]*as Wren/);
});

test('stop motion to delivery: puppets, sets and stages', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-01-05');
  await newProject(page, { title: 'Button Moon', format: 'Short Film', medium: 'Animation', technique: 'Stop Motion', finish: 'Limited Animation', runtime: '2' });
  await addCharacters(page, ['Pip']);
  await addScene(page, { index: 0, place: 'Drawer', chars: ['Pip'], minutes: '0.5' });
  await saveAndApprove(page);
  await section(page, 'Schedule');
  await expect(page.getByLabel('Pip Puppet Copies')).toBeVisible();
  await produceToDelivery(page, { yourself: ['Pip'], step: 'month', weeks: 30 });
  await section(page, 'Production');
  for (const t of ['Armature: Pip', 'Puppet Fabrication: Pip', 'Puppet Costume Fitting: Pip', 'Miniature Sets', 'Stage Camera And Lighting Setup']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByText('Ready for the stage.')).toBeVisible();
});

test('unscripted series: format rules, hosts and participants, story producing per episode', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await newProject(page, { title: 'Bake Or Break', format: 'Unscripted Series', episodes: '2', runtime: '20' });
  await expect(page.getByRole('heading', { name: 'Format Rules' })).toBeVisible();
  await expect(page.getByText('Write the format rules for your show.')).toBeVisible();
  await page.getByLabel('Rule', { exact: true }).fill('Three bakers compete; one leaves each episode.');
  await page.getByRole('button', { name: 'Add Rule' }).click();
  for (const [n, r] of [['Priya Shah', 'Host'], ['Tom Ellery', 'Participant'], ['Ana Ruiz', 'Participant'], ['Ken Mori', 'Participant']]) {
    await page.getByLabel('Contributor Name').fill(n);
    await page.getByLabel('Who They Are').fill(r);
    await page.getByRole('button', { name: 'Add Contributor' }).click();
  }
  for (let k = 0; k < 4; k++) await page.getByRole('button', { name: 'Request Consent' }).first().click();
  await advance(page, 'week');
  await advance(page, 'week');
  await section(page, 'Script');
  const given: string[] = [];
  for (const n of ['Priya Shah', 'Tom Ellery', 'Ana Ruiz', 'Ken Mori']) if (await page.locator('li', { hasText: n }).getByText('Consent Given').isVisible()) given.push(n);
  test.skip(given.length < 2, 'Fewer than two contributors agreed in this seeded world.');
  await addScene(page, { index: 0, place: 'Tent', contributors: given.slice(0, 2), minutes: '8', episodeButton: 'Add Sequence To Episode 1' });
  await addScene(page, { index: 1, place: 'Tent', contributors: given.slice(0, 2), minutes: '8', episodeButton: 'Add Sequence To Episode 2' });
  await saveAndApprove(page);
  await section(page, 'Crew');
  await expect(page.getByText('Story Producer', { exact: true })).toBeVisible();
  await expect(page.getByText('Camera Operator', { exact: true })).toBeVisible();
  await produceToDelivery(page, {});
  await section(page, 'Production');
  for (const t of ['Footage Logging, Episode 1', 'Story Producing, Episode 2']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  expect(await creditsTable(page)).toContain('Story Producer');
});
