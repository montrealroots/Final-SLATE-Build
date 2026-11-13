import { expect, sweepSees, test, type Page } from './test';
import { addScene, advance, approveDesigns, castRoles, creditsTable, nav, produceToDelivery, quickLife, readSavedState, runToDelivery, saveAndApprove, section, saveAndExit, seededLife, newProject, staffEveryDepartment } from './helpers';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.describe.configure({ timeout: Number(process.env.SLATE_JOURNEY_TIMEOUT) || 900_000 });
test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'Full media journeys run once, at desktop width.'));

async function addCharacters(page: Page, names: string[]): Promise<void> {
  await section(page, 'Characters');
  for (const n of names) {
    await page.getByLabel('Character Name').fill(n);
    await page.getByRole('button', { name: 'Add Character' }).click();
  }
  await section(page, 'Script');
}

/** The live entry: an entry withdrawn and replaced stays listed as Withdrawn. */
const liveEntry = (page: Page) => page.locator('section', { hasText: 'Your Entries' }).first().locator('li').filter({ hasNot: page.locator('.chip', { hasText: /^Withdrawn$/ }) }).first();
async function entryStatus(page: Page): Promise<string> {
  return (await liveEntry(page).locator('.chip').innerText()).trim();
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
  // A second plan, then cancelled: the confirmation states the terms, and the history keeps it as cancelled.
  await page.getByLabel('Territory Code').fill('CA');
  await page.getByRole('button', { name: 'Plan Release' }).click();
  const history = page.locator('section', { hasText: 'Release History' });
  await history.locator('li', { hasText: 'in CA' }).getByRole('button', { name: 'Cancel Release' }).click();
  await expect(page.getByRole('dialog', { name: 'Cancel This Release?' })).toBeVisible();
  await sweepSees(page);
  await page.getByRole('dialog', { name: 'Cancel This Release?' }).getByRole('button', { name: 'Cancel Release' }).click();
  await expect(history.locator('li', { hasText: 'in CA' }).getByText('Cancelled', { exact: true })).toBeVisible();
  await advance(page, 'month');
  await advance(page, 'month');
  await section(page, 'Release');
  await expect(page.locator('section', { hasText: 'Release History' }).getByText('Released', { exact: true }).first()).toBeVisible();
  // Award entry once the 54th Annie Awards (2027, organizer-announced date) open.
  await section(page, 'Festivals And Awards');
  for (let i = 0; i < 10 && !(await page.locator('li', { hasText: '54th Annie Awards' }).filter({ hasText: 'Open To You' }).isVisible()); i++) {
    await advance(page, 'month');
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Paper Kite' }).click();
    await section(page, 'Festivals And Awards');
  }
  await page.locator('li', { hasText: '54th Annie Awards' }).getByRole('button', { name: '54th Annie Awards' }).click();
  await page.locator('li', { hasText: 'Best Short Subject' }).getByRole('button', { name: 'Prepare Submission' }).click();
  // The 54th Annie Awards use the organizer's published rules (rulebooks.ts).
  await expect(page.locator('li', { hasText: 'Best Short Subject' }).getByText('Official Rules')).toBeVisible();
  await expect(page.getByText("This entry meets the organizer's published rules for this category.")).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit Entry' }).click();
  await expect(page.locator('section', { hasText: 'Your Entries' }).getByText('Submitted')).toBeVisible();
  // Through nominations and the ceremony.
  for (let i = 0; i < 12; i++) {
    await advance(page, 'month');
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Paper Kite' }).click();
    await section(page, 'Festivals And Awards');
    if (['Winner', 'Did Not Win', 'Not Accepted'].includes(await entryStatus(page))) break;
    // A non-nominated entry is final, but the winner is only public after the ceremony.
    if ((await entryStatus(page)) === 'Not Nominated') {
      await advance(page, 'month');
      await advance(page, 'month');
      break;
    }
  }
  expect(['Winner', 'Did Not Win', 'Not Nominated', 'Not Accepted']).toContain(await entryStatus(page));
  await page.locator('section', { hasText: 'Your Entries' }).getByRole('button', { name: '54th Annie Awards' }).click();
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

test('hybrid: a live scene changed after its plate was integrated is picked up, and the integration starts again', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-04-06');
  await newProject(page, { title: 'Hedgerow', format: 'Short Film', medium: 'Hybrid', technique: '3D CG', finish: 'Limited Animation', runtime: '4' });
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
  await castRoles(page, ['Mara']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  // Run until the picture could be locked: the kitchen plate is shot and the burrow's integration is done.
  const lock = page.getByRole('button', { name: 'Lock Picture', exact: true });
  for (let i = 0; i < 40; i++) {
    await advance(page, 'week');
    await staffEveryDepartment(page);
    await castRoles(page);
    await approveDesigns(page);
    await section(page, 'Edit');
    if (await lock.isVisible() && await lock.isEnabled()) break;
    const cut = page.getByRole('button', { name: 'Start Cut Pass' });
    if (await cut.isEnabled()) await cut.click();
  }
  await expect(lock).toBeEnabled();
  // The kitchen scene changes in the script after filming (SLATE-13-05).
  await section(page, 'Script');
  const kitchen = page.locator('article.scene-card').first();
  await kitchen.getByRole('button', { name: 'Edit Scene' }).click();
  await kitchen.getByLabel('Estimated Minutes').fill('1.5');
  await kitchen.getByRole('button', { name: 'Close Scene' }).click();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  const approve = page.getByRole('dialog', { name: 'Approve This Draft?' });
  await approve.getByRole('button', { name: /^Approve/ }).click();
  await expect(approve).toHaveCount(0);
  // The pickup of the new kitchen plate says, before it is requested, that the burrow's integration is worked again.
  await section(page, 'Edit');
  const coverage = page.locator('section.card', { has: page.getByRole('heading', { name: 'Coverage' }) });
  await coverage.getByRole('checkbox', { name: /^Scene 1 \(Kitchen\): / }).check();
  await expect(coverage).toContainText(/New plates restart Plate Integration: Scene 2 \(Burrow\): about \d+ compositor days? worked again\./);
  await coverage.getByRole('button', { name: 'Request Pickups' }).click();
  await nav(page, 'Home');
  await expect(page.getByText("New plates for Hedgerow restart Plate Integration: Scene 2 (Burrow): the compositor's days are worked again.")).toBeVisible();
  // And it is done again before delivery.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Hedgerow' }).click();
  await runToDelivery(page);
  await section(page, 'Production');
  await expect(page.getByText('Plate Integration: Scene 2 (Burrow)', { exact: true })).toBeVisible();
});

// World seeds for the consent journeys (labelled fixtures, see seededLife): with seed 2 everyone asked agrees; with
// seed 3 the documentary's third contributor declines. Each answer is drawn from the seed, the project and the person.
const ALL_AGREE = 2;
const RAIN_SEED = 2;
const PUPPET_SEED = 2;
const ONE_DECLINES = 3;

async function lockKeepers(page: Page, seed: number): Promise<void> {
  await seededLife(page, 'nl-amsterdam', '2026-03-02', seed);
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
}

const consentOf = (page: Page, name: string) => page.locator('li', { hasText: name }).locator('.chip');

test('live action in a wet October: rain stops an exterior day, and the schedule and log say so', async ({ page }) => {
  // Labelled fixture: the pinned world seed, chosen so it rains on a shoot day (the weather is the seed's, not set).
  await seededLife(page, 'gb-london', '2026-10-05', RAIN_SEED);
  await newProject(page, { title: 'Wet Streets', format: 'Short Film', runtime: '4' });
  await addCharacters(page, ['Ada']);
  for (let i = 0; i < 3; i++) await addScene(page, { index: i, place: `Street ${i + 1}`, chars: ['Ada'], minutes: '1', exterior: true });
  await saveAndApprove(page);
  await produceToDelivery(page, {});
  // SLATE-12-04: a day rain stopped is lost, says why, and its scenes moved to a new day that was then shot.
  const s = await readSavedState(page);
  const wet = s.projects[0].schedule.days.filter((d: { status: string; result?: string }) => d.status === 'lost' && /^Rain stopped /.test(d.result ?? ''));
  expect(wet.length).toBeGreaterThan(0);
  const logs = s.log.map((l: { text: string }) => l.text);
  for (const d of wet) expect(logs.some((t: string) => t.startsWith('Wet Streets, ') && t.includes(d.result) && t.endsWith('The remaining work moved to a new day.'))).toBe(true);
  await section(page, 'Schedule');
  await expect(page.getByText(/Rain stopped Scene \d \(Street \d\)\./).first()).toBeVisible();
});

test('documentary: consent and fact checks gate delivery', async ({ page }) => {
  await lockKeepers(page, ALL_AGREE);
  for (const n of ['Joost de Vries', 'Fenna Bakker', 'Ruud Smit']) await expect(consentOf(page, n)).toHaveText('Consent Given');
  // Seed 2: Joost agrees on condition his face isn't shown (SLATE-14-02.02); the edit hides it before delivery.
  await expect(page.locator('li', { hasText: 'Joost de Vries' }).first()).toContainText('On condition: their face is not shown.');
  await addScene(page, { index: 0, place: 'Lock House', contributors: ['Joost de Vries'], minutes: '2', episodeButton: 'Add Sequence' });
  await saveAndApprove(page);
  await produceToDelivery(page, {});
  await section(page, 'Production');
  await expect(page.locator('li', { hasText: "Hide Joost de Vries's Face" }).first()).toContainText('Done');
  const credits = await creditsTable(page);
  expect(credits).toContain('Researcher');
  expect(credits).toMatch(/Featuring\s+Joost de Vries/);
  expect(credits).not.toMatch(/^(Cast|Voice Cast|Performance Capture)\t/m); // a documentary has no cast credits (a name may contain "Cast")
});

test('documentary: a contributor who withdraws after filming is redacted before delivery', async ({ page }) => {
  await lockKeepers(page, ALL_AGREE);
  await addScene(page, { index: 0, place: 'Archive Room', contributors: ['Fenna Bakker'], minutes: '2', episodeButton: 'Add Sequence' });
  await saveAndApprove(page);
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  // Until her scene has been filmed (the save says so; the player sees it on the Edit page's coverage).
  const filmed = async () => ((await readSavedState(page)).projects[0].captures as { captured: number }[]).some((c) => c.captured > 0);
  for (let i = 0; i < 20 && !(await filmed()); i++) { await advance(page, 'week'); await staffEveryDepartment(page); }
  expect(await filmed()).toBe(true);
  // SLATE-14-02: she withdraws. Her footage is redacted by the editor, and delivery waits for it.
  await section(page, 'Script');
  await page.locator('li', { hasText: 'Fenna Bakker' }).getByRole('button', { name: 'Record Withdrawal' }).click();
  const dialog = page.getByRole('dialog', { name: 'Fenna Bakker Withdraws?' });
  await expect(dialog).toContainText('Footage already recorded with them will be redacted by your editor before the film can be delivered.');
  await sweepSees(page);
  await dialog.getByRole('button', { name: 'Record Withdrawal' }).click();
  await expect(consentOf(page, 'Fenna Bakker')).toHaveText('Withdrew');
  await expect.poll(async () => (await readSavedState(page)).log.map((l: { text: string }) => l.text)).toContain('Fenna Bakker withdrew from Lock Keepers. Their footage is being redacted from the film.');
  await section(page, 'Production');
  await expect(page.locator('li', { hasText: 'Redact Fenna Bakker' }).first()).toBeVisible();
  await runToDelivery(page);
  await section(page, 'Production');
  await expect(page.locator('li', { hasText: 'Redact Fenna Bakker' }).first()).toContainText('Done');
});

test('documentary: a contributor who declines is told apart, and the player is told why their scenes cannot be filmed', async ({ page }) => {
  await lockKeepers(page, ONE_DECLINES);
  await expect(consentOf(page, 'Joost de Vries')).toHaveText('Consent Given');
  await expect(consentOf(page, 'Fenna Bakker')).toHaveText('Consent Given');
  await expect(consentOf(page, 'Ruud Smit')).toHaveText('Consent Declined');
  const log = (await readSavedState(page)).log.map((l: { text: string }) => l.text);
  expect(log).toContain("Ruud Smit declined to take part in Lock Keepers. Scenes with Ruud Smit can't be filmed; you can remove them or find another contributor.");
  // Nobody can be asked twice.
  await expect(page.getByRole('button', { name: 'Request Consent' })).toHaveCount(0);
});

test('TV limited series: episodes, a guest role and episode-level credits', async ({ page }) => {
  await quickLife(page, 'us-atlanta', '2026-02-02');
  await newProject(page, { title: 'Night Ward', format: 'Limited Series', episodes: '2', runtime: '10' });
  await addCharacters(page, ['Dr. Ines Park', 'Marcus']);
  await addScene(page, { index: 0, place: 'Emergency Room', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Emergency Room', chars: ['Dr. Ines Park', 'Marcus'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 2, place: 'Rooftop', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  const season = page.locator('section.card', { has: page.getByRole('heading', { name: 'Season', exact: true }) });
  await season.getByLabel('Season Arc').fill('One winter on the night ward.');
  await season.getByLabel('Title Of Episode 2').fill('The Rooftop');
  await season.getByRole('button', { name: 'Rename' }).nth(1).click();
  await saveAndApprove(page);
  await section(page, 'Crew');
  await expect(page.getByRole('heading', { name: 'Episode Writers And Directors' })).toBeVisible();
  // Episode assignments (November 10, 2026): an episode writer is hired and given episode 2; you keep episode 1. The
  // first free writer who takes the offer at their asking rate is the one assigned.
  let writer = '';
  for (let i = 0; i < 4 && !writer; i++) {
    await page.getByRole('button', { name: 'Hire An Episode Writer' }).click();
    const d = page.getByRole('dialog');
    const who = d.getByRole('listitem').nth(i);
    const name = (await who.locator('strong').first().textContent())!;
    await who.getByRole('button', { name: 'Make Offer' }).click();
    const row = page.getByRole('row', { name: new RegExp(name) });
    for (let k = 0; k < 4 && await row.getByText('Offer Sent').count(); k++) { await advance(page, 'next-day'); await section(page, 'Crew'); }
    if (await row.getByText('Accepted').count()) writer = name;
  }
  expect(writer).not.toBe('');
  await expect(page.getByLabel('Writer For Episode 2').locator('option')).toHaveText(['You', writer]);
  // From November 11, 2026 a writer is given an episode for a draft or rewrite of it you accepted (writing-jobs.ts):
  // hired alone, they can't be chosen, and the page says what to do.
  await page.getByLabel('Writer For Episode 2').selectOption({ label: writer });
  await expect(page.getByText("They haven't delivered a draft or a rewrite of it that you accepted. Commission one from them under Writing Work.")).toBeVisible();
  const work = page.getByRole('region', { name: `Writing Work For ${writer}` });
  await work.getByLabel(`Ask ${writer} For`).selectOption({ label: 'A Rewrite' });
  await work.getByLabel(`Episode For ${writer}`).selectOption({ label: '2. The Rooftop' });
  await work.getByRole('button', { name: 'Commission This Pass' }).click();
  for (let k = 0; k < 4 && !(await work.getByRole('button', { name: 'Accept This Pass' }).count()); k++) { await advance(page, 'week'); await section(page, 'Crew'); }
  await work.getByRole('button', { name: 'Accept This Pass' }).click();
  await expect(page.getByLabel('Writer For Episode 2')).toHaveValue(/.+/);
  await expect(page.getByLabel('Writer For Episode 2').locator('option:checked')).toHaveText(writer);
  // Block scheduling is a choice made before the schedule is built (SLATE-07-04.02).
  await section(page, 'Schedule');
  await page.getByRole('checkbox', { name: 'Shoot Episodes In Blocks' }).check();
  await produceToDelivery(page, { yourself: ['Dr. Ines Park'] });
  const credits = await creditsTable(page);
  // The writer is credited for episode 2. Episode 2's scenes were approved before the change, so you, who wrote them,
  // keep that credit as well (projects.ts assignEpisodeRole, former writers).
  // Phones label each cell (Credit, Name, Details), so the row is matched either way.
  const cell = (label: string, text: string) => `(${label} )?${text.replace(/[.()]/g, '\\$&')}`;
  await expect(page.getByRole('row', { name: new RegExp(`^${cell('Credit', 'Written By')} ${cell('Name', writer)} ${cell('Details', 'Episodes 2')}$`) })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(`^${cell('Credit', 'Written By')} ${cell('Name', 'Nia Halvorsen-Mbeki')} ${cell('Details', 'Episodes 1, 2')}$`) })).toBeVisible();
  expect(credits).toContain('Executive Producer And Showrunner');
  expect(credits).toMatch(/as Marcus, Episodes 1\b/);
  expect(credits).toMatch(/as Dr\. Ines Park, Episodes 1, 2/);

  // The next season (SLATE-07-05.02, 18-04): the characters carry over, the last arc is there to build on, and whoever
  // played Marcus is asked back at their last rate, an offer like any other.
  await section(page, 'Overview');
  await page.getByRole('button', { name: 'Start The Next Season' }).click();
  await expect(page.getByRole('heading', { name: 'Night Ward: Season 2', level: 1 })).toBeVisible();
  await section(page, 'Script');
  await expect(page.getByText('Last season: One winter on the night ward.')).toBeVisible();
  await addScene(page, { index: 0, place: 'Emergency Room', chars: ['Marcus'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Rooftop', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  // The story carried over, so the pitch is written; the starting backing was for a first project only.
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await section(page, 'Cast');
  const back = page.locator('section.card', { has: page.getByRole('heading', { name: 'Ask Them Back' }) });
  await expect(back).toContainText('as Marcus');
  // No money carried over: the offer, at their last rate, waits on this season's own backing.
  await back.getByRole('button', { name: /^Ask .+ Back$/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: /^This needs \$[\d,]+, but only \$0 is uncommitted\./ })).toBeVisible();
  await expect(back.getByRole('button', { name: /^Ask .+ Back$/ })).toBeVisible();
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
  await produceToDelivery(page, { yourself: ['Wren'], step: 'month', weeks: 30, mocap: true });
  await section(page, 'Production');
  await expect(page.getByText('Motion Capture: The Golem', { exact: true })).toBeVisible();
  // The full capture flow ran: calibration, captured takes, an approved take, then cleanup before animation.
  const golemCap = page.getByRole('article', { name: 'Motion Capture For The Golem' });
  await expect(golemCap.getByText('Approved', { exact: true })).toBeVisible();
  await expect(golemCap.getByText(/^Take 1: quality \d+/)).toBeVisible();
  for (const t of ['Capture Rehearsal And Calibration: The Golem', 'Capture Cleanup And Retargeting: The Golem']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByText('Render: Scene 1 (Orchard)', { exact: true })).toBeVisible();
  await section(page, 'Budget');
  await page.getByText(/^\d+ lines$/).click(); // open the budget lines
  await expect(page.getByText('Capture Stage Booking').first()).toBeVisible();
  const credits = await creditsTable(page);
  expect(credits).toMatch(/Performance Capture[\s\S]*as The Golem/);
  expect(credits).toMatch(/Voice Cast[\s\S]*as Wren/);
});

test('motion capture: a session the performer can\'t attend is missed and rebooked', async ({ page }) => {
  // Labelled fixture: a fixed world seed, so the journey plays the same way on every run. The fixed seed isn't the fix:
  // main's CI after #47 failed because this journey required calibration to be seen "waiting for its session", a state
  // some worlds never show (the calibration runs the day its animatic is done); tests/mocap-progress.test.ts.
  await seededLife(page, 'ca-vancouver', '2026-01-05', 3630);
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
  await castRoles(page, ['Wren']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  // Book the capture stage once a capture performer has accepted.
  const booked = async () => Object.values((await readSavedState(page)).projects[0].mocap ?? {}).some((r: any) => r.status === 'booked'); // eslint-disable-line @typescript-eslint/no-explicit-any
  for (let i = 0; i < 12 && !(await booked()); i++) {
    await advance(page, 'week');
    await castRoles(page);
    await staffEveryDepartment(page);
    await approveDesigns(page);
    const book = page.getByRole('button', { name: /^Book Capture Stage/ });
    if (await book.first().isVisible()) await book.first().click();
  }
  await expect.poll(booked).toBe(true);
  // Day by day until the capture work is ready and waits only for a session date: calibration's, or the capture's when
  // calibration ran the day its animatic was done. Weekly, the player deals with what can hold the work up (casting,
  // crew, counteroffers, designs). The bound is a deadlock guard, not a promise about how long the work takes.
  type Task = { kind: string; status: string; blockedReason?: string };
  const readyKind = async () => {
    const t = ((await readSavedState(page)).projects[0].tasks as Task[]).find((x) => (x.kind === 'anim:mocap-calib' || x.kind === 'anim:mocap') && x.status !== 'done' && /^Next (calibration|capture) session: /.test(x.blockedReason ?? ''));
    return t ? (t.kind === 'anim:mocap-calib' ? 'calibration' : 'capture') : null;
  };
  let kind: string | null = null;
  for (let i = 0; i < 60 && !(kind = await readyKind()); i++) {
    if (i % 7 === 6) { await castRoles(page); await staffEveryDepartment(page); await approveDesigns(page); }
    await advance(page, 'next-day');
  }
  expect(kind, 'the capture work never became ready for a session').not.toBeNull();
  // Labelled fixture: the capture performer is also cast in another production, shooting on that session's date.
  let first = '';
  let performer = '';
  await editSaveAndReopen(page, (st) => {
    const p = st.projects[0];
    const [cid, rec] = Object.entries(p.mocap).find(([, r]: any) => r.status === 'booked') as [string, any]; // eslint-disable-line @typescript-eslint/no-explicit-any
    first = rec.sessions.filter((x: { status: string; kind: string }) => x.status === 'booked' && x.kind === kind).map((x: { date: string }) => x.date).sort()[0]; // the session the work waits for
    performer = p.cast.find((c: { characterId: string; method: string }) => c.characterId === cid && c.method === 'motion-capture').performer;
    const other = JSON.parse(JSON.stringify(p));
    Object.assign(other, { id: 'p-fixture-other', title: 'Other Picture', mocap: {}, tasks: [], obligations: [], hires: [], delivered: null, cast: [{ characterId: cid, performer, method: 'on-camera', note: '' }] });
    other.schedule.days = [{ id: 'd-fixture-other', date: first, episode: 1, sceneIds: [p.scenes[0].id], locationLabel: 'Orchard', interior: false, night: false, status: 'scheduled', playerActing: false, conflicts: [] }];
    st.projects.push(other);
  });
  // SLATE-13-04: on the day, the session can't run; it is marked missed with the reason and rebooked on a free date.
  const missed = () => readSavedState(page).then((st) => st.log.map((l: { text: string }) => l.text).find((t: string) => t.startsWith('The capture session for The Golem on ')));
  for (let i = 0; i < 12 && !(await missed()); i++) await advance(page, 'week');
  expect(await missed()).toMatch(/^The capture session for The Golem on .+ couldn't run \(.+ was shooting Other Picture\)\. It is rebooked for .+\.$/);
  const rec = Object.values((await readSavedState(page)).projects[0].mocap).find((r: any) => r.sessions?.some((x: { status: string }) => x.status === 'missed')) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const miss = rec.sessions.find((x: { status: string }) => x.status === 'missed');
  expect(miss.date).toBe(first);
  expect(miss.kind).toBe(kind);
  expect(rec.sessions.some((x: { status: string; date: string; kind: string }) => x.date > first && x.kind === miss.kind && (x.status === 'booked' || x.status === 'done'))).toBe(true); // rebooked, and maybe run since
});

test('stop motion to delivery: puppets, sets and stages', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-01-05');
  await newProject(page, { title: 'Button Moon', format: 'Short Film', medium: 'Animation', technique: 'Stop Motion', finish: 'Limited Animation', runtime: '2' });
  await addCharacters(page, ['Pip']);
  // J05: the puppet's face is a choice of work (the v4 package, 02): replacement faces are a set made after the puppet.
  await section(page, 'Characters');
  const pip = page.getByRole('article', { name: 'Pip' });
  await pip.getByRole('button', { name: 'Edit Character' }).click();
  await pip.getByLabel('Puppet Face').selectOption({ label: 'Replacement Faces' });
  await pip.getByRole('button', { name: 'Close' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Drawer', chars: ['Pip'], minutes: '0.5' });
  await saveAndApprove(page);
  await section(page, 'Schedule');
  await expect(page.getByLabel('Pip Puppet Copies')).toBeVisible();
  await produceToDelivery(page, { yourself: ['Pip'], step: 'month', weeks: 30 });
  await section(page, 'Production');
  for (const t of ['Armature: Pip', 'Puppet Fabrication: Pip', 'Replacement Faces: Pip', 'Puppet Costume Fitting: Pip', 'Miniature Sets', 'Stage Camera And Lighting Setup']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  await expect(page.getByText('Ready for the stage.')).toBeVisible();
});

test('stop motion: a puppet damaged on set holds its shots until it is repaired', async ({ page }) => {
  // Labelled fixture: the pinned world seed, chosen so a puppet is damaged during the stage weeks (about one chance in
  // twenty-five each stage day); the damage and the repair are the engine's.
  await seededLife(page, 'gb-london', '2026-01-05', PUPPET_SEED);
  await newProject(page, { title: 'Button Moon', format: 'Short Film', medium: 'Animation', technique: 'Stop Motion', finish: 'Limited Animation', runtime: '3' });
  await addCharacters(page, ['Pip']);
  await addScene(page, { index: 0, place: 'Drawer', chars: ['Pip'], minutes: '3' });
  await saveAndApprove(page);
  await produceToDelivery(page, { yourself: ['Pip'], step: 'month', weeks: 40 });
  // SLATE-11-03, 13-03: the damage is logged, the maker's repair was worked, and the film was delivered after it.
  const logs = (await readSavedState(page)).log.map((l: { text: string }) => l.text);
  expect(logs).toContain("Pip's puppet was damaged on set. Shots with Pip wait for a repair unless a duplicate is available.");
  await section(page, 'Production');
  await expect(page.locator('li', { hasText: 'Repair Puppet: Pip' }).first()).toContainText('Done');
});

async function bakeOrBreak(page: Page): Promise<void> {
  await seededLife(page, 'gb-london', '2026-03-02', ALL_AGREE);
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
  // The format family exposes only its own rules: a competition asks for contestants and how many leave.
  await expect(page.getByLabel('Format Family')).toHaveValue('observational');
  await page.getByLabel('Format Family').selectOption({ label: 'Competition' });
  await expect(page.getByRole('group', { name: 'Contestants' })).toBeVisible();
  await expect(page.getByText(/A 2-episode competition with 1 leaving each episode needs at least 3 contestants\./)).toBeVisible();
  await page.getByLabel('Format Family').selectOption({ label: 'Observational Or Docuseries' });
  await expect(page.getByRole('group', { name: 'Contestants' })).toHaveCount(0);
  for (let k = 0; k < 4; k++) await page.getByRole('button', { name: 'Request Consent' }).first().click();
  await advance(page, 'week');
  await advance(page, 'week');
  await section(page, 'Script');
  for (const n of ['Priya Shah', 'Tom Ellery', 'Ana Ruiz', 'Ken Mori']) await expect(consentOf(page, n)).toHaveText('Consent Given');
  await addScene(page, { index: 0, place: 'Tent', contributors: ['Priya Shah', 'Tom Ellery'], minutes: '8', episodeButton: 'Add Sequence To Episode 1' });
  await addScene(page, { index: 1, place: 'Tent', contributors: ['Priya Shah', 'Tom Ellery'], minutes: '8', episodeButton: 'Add Sequence To Episode 2' });
  await saveAndApprove(page);
}

test('unscripted series: format rules, hosts and participants, story producing per episode', async ({ page }) => {
  await bakeOrBreak(page);
  // Withdrawal is offered with its consequence, and can be backed out of.
  await page.getByRole('button', { name: 'Record Withdrawal' }).first().click();
  await expect(page.getByText(/Nothing has been filmed with them yet. Scenes with them can't be filmed now/)).toBeVisible();
  await page.getByRole('button', { name: 'Keep Them In The Show' }).click();
  await section(page, 'Crew');
  await expect(page.getByText('Story Producer', { exact: true })).toBeVisible();
  await expect(page.getByText('Camera Operator', { exact: true })).toBeVisible();
  await produceToDelivery(page, {});
  await section(page, 'Production');
  for (const t of ['Footage Logging, Episode 1', 'Story Producing, Episode 2']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  expect(await creditsTable(page)).toContain('Story Producer');
});

test('unscripted series: a participant who withdraws before the shoot is recorded as withdrawn, and the game keeps saving', async ({ page }) => {
  await bakeOrBreak(page);
  const tom = page.locator('li', { hasText: 'Tom Ellery' });
  await tom.getByRole('button', { name: 'Record Withdrawal' }).click();
  const dialog = page.getByRole('dialog', { name: 'Tom Ellery Withdraws?' });
  await expect(dialog).toContainText("Nothing has been filmed with them yet. Scenes with them can't be filmed now, so take them out of those scenes or find someone else.");
  await dialog.getByRole('button', { name: 'Record Withdrawal' }).click();
  await expect(consentOf(page, 'Tom Ellery')).toHaveText('Withdrew');
  await expect(tom.getByRole('button', { name: 'Record Withdrawal' })).toHaveCount(0);
  await expect(consentOf(page, 'Priya Shah')).toHaveText('Consent Given'); // nobody else is affected
  // The save after the withdrawal lands (this failed before November 6, 2026: a redaction of footage not yet shot).
  await expect.poll(async () => (await readSavedState(page)).projects[0].contributors.find((c: { name: string }) => c.name === 'Tom Ellery').consent, { timeout: 15_000 }).toBe('withdrawn');
  await expect(page.locator('.save-state')).toHaveText(/Saved/);
  const p = (await readSavedState(page)).projects[0];
  expect(p.tasks.filter((t: { kind: string }) => t.kind === 'unscripted:redact')).toEqual([]);
  expect((await readSavedState(page)).log.map((l: { text: string }) => l.text)).toContain('Tom Ellery withdrew from Bake Or Break. They were not recorded.');
});

/** The in-game date shown in the header. */
async function gameDate(page: Page): Promise<string> {
  const text = await page.getByRole('banner').getByText(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}$/).innerText();
  const d = new Date(`${text.replace(/^[A-Za-z]+, /, '')} 12:00 UTC`);
  return d.toISOString().slice(0, 10);
}

/** Advance to a chosen date (9 AM), pressing Advance again whenever something stops it, as a player would. */
async function advanceUntil(page: Page, date: string): Promise<void> {
  for (let i = 0; i < 80 && (await gameDate(page)) < date; i++) {
    await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Advance' });
    await dialog.getByLabel('Advance To').selectOption('time');
    await dialog.getByLabel('Date').fill(date);
    await dialog.getByLabel('Time').fill('09:00');
    await dialog.getByRole('button', { name: 'Advance' }).click();
    await expect(page.locator('.save-state')).not.toHaveText(/Advancing/, { timeout: 60_000 });
    const dismiss = page.getByRole('button', { name: 'Dismiss' });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  expect(await gameDate(page)).toBe(date);
}

/** Edit the saved game in place (keeping its checksum and event order), then reopen it: a save-and-reload in the middle. */
async function editSaveAndReopen(page: Page, fn: (state: Record<string, any>) => void): Promise<void> { // eslint-disable-line @typescript-eslint/no-explicit-any
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  fn(state);
  const data = JSON.stringify(state);
  const { hashString } = await import('../src/engine/rng');
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

test('festival under official rules: submit, selection, screening attended, results, save and reload, once each', async ({ page }) => {
  test.setTimeout(Number(process.env.SLATE_JOURNEY_TIMEOUT) || 1_500_000);
  const started = Date.now();
  const marks: Record<string, number> = {};
  const mark = (k: string) => { marks[k] = Math.round((Date.now() - started) / 1000); };
  await quickLife(page, 'us-los-angeles', '2026-01-05');
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '3' });
  await addCharacters(page, ['Odile', 'Ferryman']);
  await addScene(page, { index: 0, place: 'Ferry Dock', chars: ['Odile', 'Ferryman'], minutes: '1.5' });
  await saveAndApprove(page);
  await produceToDelivery(page, { yourself: ['Odile'] });
  mark('delivered');
  // Make the film strong enough to be selected (the judging is simulated), and reopen the save mid-journey. Before it is
  // entered: an entry is judged on what it was entered with (its snapshot), so a later change wouldn't count (November 9).
  await editSaveAndReopen(page, (s) => { s.projects[0].quality = { ...s.projects[0].quality, overall: 99, reception: 99, direction: 99, script: 99 }; });
  const open = async () => {
    await nav(page, 'Projects');
    await page.getByRole('button', { name: 'Night Ferry' }).click();
    await section(page, 'Festivals And Awards');
  };
  // Sundance 2027 short films: the organizer's 2027 rules, deadline August 31, 2026 (end of day in Boulder).
  await open();
  if (!(await page.locator('li', { hasText: 'Sundance Film Festival 2027' }).filter({ hasText: 'Open To You' }).isVisible())) {
    await advanceUntil(page, '2026-06-01'); // entries open in May
    await open();
  }
  await page.locator('li', { hasText: 'Sundance Film Festival 2027' }).getByRole('button', { name: 'Sundance Film Festival 2027' }).click();
  const shorts = page.locator('li', { hasText: 'Short Film Program' });
  await expect(shorts.getByText('Official Rules')).toBeVisible();
  await expect(shorts.getByText(/Entries close August 31, 2026, 11:59 PM local time\./)).toBeVisible();
  await shorts.getByRole('button', { name: 'Prepare Submission' }).click();
  await expect(page.getByText("This entry meets the organizer's published rules for this category.")).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit Entry' }).click();
  await expect(page.locator('section', { hasText: 'Your Entries' }).getByText('Submitted')).toBeVisible();
  // Withdrawn and entered again before the deadline (SLATE-17-03): the fee is paid once, checked after the results.
  const entries = page.locator('section', { hasText: 'Your Entries' });
  await entries.getByRole('button', { name: 'Withdraw Entry' }).click();
  await expect(entries.locator('.chip', { hasText: /^Withdrawn$/ })).toBeVisible();
  await shorts.getByRole('button', { name: 'Prepare Submission' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit Entry' }).click();
  await expect(entries.locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();
  await expect(entries.locator('.chip', { hasText: /^Withdrawn$/ })).toBeVisible();
  mark('submitted');

  const feePostings = (s: any) => s.projects[0].obligations.flatMap((o: any) => o.postings).filter((x: any) => x.kind === 'settle' && x.key === 'fee:sundance-2027:shorts').length; // eslint-disable-line @typescript-eslint/no-explicit-any

  // Selection is announced about three weeks before the festival (January 21 to 31, 2027).
  await advanceUntil(page, '2027-01-02');
  await open();
  // Its section has a prize still to be decided among the selected shorts (from November 9, 2026).
  expect(await entryStatus(page)).toBe('In Competition');

  mark('selected');
  // Screening invitations arrive when the festival opens on January 21: accept one, travel to Boulder in time, attend.
  await advanceUntil(page, '2027-01-21');
  await open();
  await liveEntry(page).getByRole('button', { name: 'Sundance Film Festival 2027' }).click();
  const panel = page.getByRole('region', { name: 'Screenings' });
  await panel.getByRole('button', { name: 'Accept Invitation' }).first().click();
  await panel.getByRole('button', { name: 'Travel to the Venue' }).first().click();
  for (let i = 0; i < 60 && !(await panel.getByText('You attended.').first().isVisible()); i++) await advance(page, 'next-event');
  await expect(panel.getByText('You attended.').first()).toBeVisible();
  mark('attended');

  // Results after the festival ends on January 31.
  await advanceUntil(page, '2027-02-03');
  await open();
  // Selection is not a win: the program entry stays Selected, and its prize is recorded from the selection.
  expect(await entryStatus(page)).toBe('Selected');
  const prize = page.locator('section', { hasText: 'Your Entries' }).first().locator('li', { hasText: 'Short Film Grand Jury Prize' });
  const result = (await prize.locator('.chip').innerText()).trim();
  expect(['Winner', 'Special Mention', 'Did Not Win']).toContain(result);
  await expect(prize.getByText('Considered from its selection; no entry or fee.')).toBeVisible();
  await liveEntry(page).getByRole('button', { name: 'Sundance Film Festival 2027' }).click();
  await expect(page.locator('li', { hasText: 'Short Film Grand Jury Prize' }).getByText(/Winner: /)).toBeVisible();

  // Save, reload, and keep playing: one result message, one fee payment, the same winner.
  await saveAndExit(page);
  const before = await readSavedState(page);
  const resultLogs = (s: any) => s.log.filter((l: any) => /(won|didn't win|special mention for) Short Film Grand Jury Prize at the Sundance Film Festival 2027/.test(l.text)).length; // eslint-disable-line @typescript-eslint/no-explicit-any
  expect(resultLogs(before)).toBe(1);
  expect(feePostings(before)).toBe(1);
  const winner = before.editions.find((e: { id: string }) => e.id === 'sundance-2027').results['shorts-grand-jury'].winner;
  expect(before.editions.find((e: { id: string }) => e.id === 'sundance-2027').rulesId).toBe('sundance-2027@1');
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await advance(page, 'month');
  await saveAndExit(page);
  const after = await readSavedState(page);
  expect(resultLogs(after)).toBe(1);
  expect(feePostings(after)).toBe(1);
  expect(after.editions.find((e: { id: string }) => e.id === 'sundance-2027').results['shorts-grand-jury'].winner).toBe(winner);
  expect(after.projects[0].history.filter((h: { text: string }) => /Sundance Film Festival 2027/.test(h.text)).length).toBe(before.projects[0].history.filter((h: { text: string }) => /Sundance Film Festival 2027/.test(h.text)).length);
  mark('done');
  console.log(JSON.stringify({ journeySeconds: marks, result }));
});
