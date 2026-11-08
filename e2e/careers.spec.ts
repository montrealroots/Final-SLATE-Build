// Three careers that complement e2e/connected.spec.ts (November 7, 2026), each through the real interface with a failure
// it must recover from: a TV season whose approved script changes after filming; a stop-motion short refused an offer for
// lack of money, then short of crew money when backed for less than its estimate, and reopened while its data fails to load; and a live-action short the player writes, produces and directs
// without acting, with an offer to a performer booked elsewhere. Each asserts what the game did (runtimes, credits, task
// progress, release history), not only that buttons could be pressed.
//
// Fixtures, labelled: each world seed is pinned (helpers.ts pinSeed) so the run is the same every time; the seeds below
// were chosen once, not adjusted to pass. Network failures are injected with page.route and declared with expectErrors.
// Desktop runs in Chromium; the phone run is Chromium at 390×844. Emulation, not devices.
import { expect, expectErrors, test, type Page } from './test';
import {
  addScene, advance, castRoles, creditsTable, nav, newProject, pinSeed, pressSaveAndExit, quickLife, runToDelivery, saveAndApprove, section,
  secureStartingBacking, staffEveryDepartment, writePitch,
} from './helpers';

const SEEDS = { tv: 11, stopMotion: 23, behindTheCamera: 31 };
test.use({ actionTimeout: 20_000 });
const shot = (page: Page, project: string, name: string) => page.screenshot({ path: `test-results/careers-${project}-${name}.png`, fullPage: true });

async function addCharacters(page: Page, names: string[]): Promise<void> {
  await section(page, 'Characters');
  for (const n of names) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
}

async function editCharacter(page: Page, name: string, fn: (card: ReturnType<Page['getByRole']>) => Promise<void>): Promise<void> {
  await section(page, 'Characters');
  const card = page.getByRole('article', { name });
  await card.getByRole('button', { name: 'Edit Character' }).click();
  await fn(card);
  await card.getByRole('button', { name: 'Close' }).click();
}

/** Save & Exit, then Continue, back to the project. */
async function saveAndReload(page: Page, title: string): Promise<void> {
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: title }).click();
}

async function selfRelease(page: Page, territory: string): Promise<void> {
  await section(page, 'Release');
  await page.getByLabel('Route').selectOption({ label: 'Digital Self-Release' });
  await page.getByLabel('Territory Code').fill(territory);
  await page.getByRole('button', { name: 'Plan Release' }).click();
  const history = page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) });
  await expect(history).toContainText(`Digital Self-Release in ${territory}`);
  for (let i = 0; i < 3 && !(await history.getByText('Released', { exact: true }).count()); i++) {
    await advance(page, 'month');
    await section(page, 'Release');
  }
  await expect(history.getByText('Released', { exact: true })).toBeVisible();
}

test('a TV season: a regular and a guest, an approved scene changed after filming, a pickup, per-episode credits', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'The season runs once, at desktop width.');
  test.setTimeout(1_200_000);
  await quickLife(page, 'us-atlanta', '2026-02-02');
  await pinSeed(page, SEEDS.tv);
  await newProject(page, { title: 'Night Ward', format: 'Series', episodes: '3', runtime: '10' });
  await addCharacters(page, ['Dr. Ines Park', 'Marcus']);
  await editCharacter(page, 'Dr. Ines Park', async (c) => {
    await c.getByLabel('Role Size').selectOption({ label: 'Lead' });
    await c.getByLabel('Series Involvement').selectOption({ label: 'Regular' });
  });
  await editCharacter(page, 'Marcus', async (c) => { await c.getByLabel('Series Involvement').selectOption({ label: 'Guest' }); });
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Emergency Room', chars: ['Dr. Ines Park', 'Marcus'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 1, place: 'Emergency Room', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 1' });
  await addScene(page, { index: 2, place: 'Rooftop', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  await addScene(page, { index: 3, place: 'Car Park', chars: ['Dr. Ines Park'], minutes: '2', episodeButton: 'Add Scene To Episode 3' });
  await saveAndApprove(page);
  await section(page, 'Crew');
  await expect(page.getByRole('heading', { name: 'Episode Writers And Directors' })).toBeVisible();
  await castRoles(page, ['Dr. Ines Park']);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();

  // Film until the first scene is in, then change it in the script: the approved script changes after filming.
  const days = page.locator('section.card', { has: page.getByRole('heading', { name: 'Shoot Days' }) });
  const firstDay = days.locator('li', { hasText: 'Episode 1, Scene 1 (Emergency Room)' }).first();
  for (let i = 0; i < 40 && !(await firstDay.filter({ hasText: /Shot \d+ of \d+ scenes?\./ }).count()); i++) {
    await advance(page, 'next-day');
    await section(page, 'Schedule');
  }
  // Two scenes were planned for the day; the first was shot and the second ran over to another day.
  await expect(firstDay).toContainText('Shot 1 of 2 scenes. Episode 1, Scene 2 (Emergency Room) ran out of time and needs another day.');
  await section(page, 'Script');
  const first = page.locator('article.scene-card').first();
  await first.getByRole('button', { name: 'Edit Scene' }).click();
  await first.getByLabel('Estimated Minutes').fill('3');
  await first.getByRole('button', { name: 'Close Scene' }).click();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  const approve = page.getByRole('dialog', { name: 'Approve This Draft?' });
  await expect(approve).toContainText('Some scenes changed since the approved draft. Work on unchanged scenes is kept.');
  await expect(approve).toContainText('Episode 1, Scene 1 (Emergency Room) was filmed; it will need filming again.');
  await shot(page, 'tv', '01-approve-changed-script');
  await approve.getByRole('button', { name: 'Approve And Redo This Work' }).click();

  // The edit shows the changed scene as shot from an older draft; a pickup refilms it.
  await section(page, 'Edit');
  const coverage = page.locator('section.card', { has: page.getByRole('heading', { name: 'Coverage' }) });
  await expect(coverage).toContainText('Episode 1, Scene 1 (Emergency Room): It was shot from an older draft.');
  await coverage.getByRole('checkbox', { name: 'Episode 1, Scene 1 (Emergency Room): It was shot from an older draft.' }).check();
  await coverage.getByRole('button', { name: 'Request Pickups' }).click();
  await expect(coverage).not.toContainText('It was shot from an older draft.');
  await saveAndReload(page, 'Night Ward');
  await runToDelivery(page);

  // Downstream: the delivered runtime has the longer scene (3 + 2 + 2 + 2), the regular is credited in every episode and the
  // guest in the one they appear in.
  await expect(page.getByText('Delivered at 9 minutes.', { exact: false })).toBeVisible();
  const credits = await creditsTable(page);
  expect(credits).toMatch(/as Dr\. Ines Park(?!, Episodes)/);
  expect(credits).toMatch(/as Marcus, Episodes 1\b/);
  expect(credits).toContain('Executive Producer And Showrunner');
  await selfRelease(page, 'US');
  await saveAndReload(page, 'Night Ward');
  await section(page, 'Release');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) }).getByText('Released', { exact: true })).toBeVisible();
  await shot(page, 'tv', '02-released');
});

test('stop motion: refused for lack of money, backed for less than its estimate, then funded; reopened while its data fails to load; delivered and released', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Runs once, at desktop width.');
  test.setTimeout(1_500_000);
  expectErrors('Refuses the genre catalog and holiday rules on one reload to test recovery.');
  await quickLife(page, 'gb-london', '2026-01-05');
  await pinSeed(page, SEEDS.stopMotion);
  await newProject(page, { title: 'Pip And The Crow', format: 'Short Film', medium: 'Animation', technique: 'Stop Motion', finish: 'Limited Animation', runtime: '2', budget: 'Micro Budget' });
  await addCharacters(page, ['Pip', 'The Crow']);
  await editCharacter(page, 'Pip', async (c) => { await c.getByLabel('Role Size').selectOption({ label: 'Lead' }); });
  await editCharacter(page, 'The Crow', async (c) => { await c.getByRole('checkbox', { name: 'Antagonist' }).check(); });
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Drawer', chars: ['Pip'], minutes: '0.5' });
  await addScene(page, { index: 1, place: 'Windowsill', chars: ['Pip', 'The Crow'], minutes: '0.5' });
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();

  // No money yet: an offer is refused with the reason, and nothing is booked.
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'The Crow' }).getByRole('button', { name: 'Find Performers' }).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
  await expect(page.getByRole('dialog').getByRole('alert').first()).toContainText('but only $0 is uncommitted');
  await shot(page, 'stop-motion', '01-refused-no-money');
  await page.keyboard.press('Escape');
  // Once the script is approved, its estimate is what it needs at micro size: more than the size's $40,000. The player
  // asks the starting backing for only $40,000; staffing then names the shortfall and hires no one, rather than the
  // puppet makers without the animator. Raising the target back to the estimate, an investor makes up the difference.
  await section(page, 'Budget');
  const fin = page.locator('section.card', { has: page.getByRole('heading', { name: 'Financing' }) });
  const amount = (label: string) => fin.locator('dt', { hasText: new RegExp(`^${label}$`) }).locator('xpath=following-sibling::dd[1]');
  await expect(fin).toContainText('The estimate is what the approved script needs at micro budget size');
  const estimate = Number((await amount('Budget Estimate').innerText()).replace(/\D/g, ''));
  const dollars = (n: number) => `$${n.toLocaleString('en-US')}`;
  expect(estimate).toBeGreaterThan(40_000);
  await expect(amount('Financing Target')).toHaveText(dollars(estimate));
  await fin.scrollIntoViewIfNeeded();
  await shot(page, 'stop-motion', '02-estimate');
  await page.getByLabel('Change Financing Target').fill('40000');
  await page.getByRole('button', { name: 'Set Target' }).click();
  await secureStartingBacking(page);
  await castRoles(page, []);
  await section(page, 'Crew');
  await page.locator('section.card', { has: page.getByRole('heading', { name: 'Stop Motion' }) }).getByRole('button', { name: 'Staff This Department' }).click();
  const staff = page.getByRole('dialog');
  await expect(staff).toContainText(/The required crew still to hire costs about \$[\d,]+ at the lowest rates, and \$[\d,]+ is uncommitted\. Raise the rest before staffing, or cut scope\./);
  await expect(staff.getByRole('button', { name: 'Send Offers' })).toBeDisabled();
  await expect(staff).not.toContainText('Every role here already has someone');
  await shot(page, 'stop-motion', '03-crew-short');
  await staff.getByRole('button', { name: 'Cancel' }).click();
  await section(page, 'Budget');
  await page.getByLabel('Change Financing Target').fill(String(estimate));
  await page.getByRole('button', { name: 'Set Target' }).click();
  await page.getByRole('button', { name: 'Approach Private Investor' }).click();
  const backers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Backers' }) });
  const investor = backers.locator('li', { hasText: /^Private Investor/ }); // the outer item; its terms are a nested list
  await expect(investor).toContainText('Their answer is due');
  for (let i = 0; i < 6 && (await investor.getByText('Considering', { exact: true }).count()); i++) {
    await advance(page, 'week');
    await section(page, 'Budget');
  }
  await expect(investor).toContainText(`${dollars(estimate - 40_000)} when you sign.`);
  await investor.getByRole('button', { name: 'Accept Offer' }).click();
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  await expect(amount('Promised By Backers')).toHaveText(dollars(estimate));
  await staffEveryDepartment(page);
  await castRoles(page, []);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await expect(page.getByText('Build a schedule to see shoot days.')).toHaveCount(0);
  await advance(page, 'week');
  await advance(page, 'week');
  await section(page, 'Production');
  const progress = (await page.locator('section.card', { has: page.getByRole('heading', { name: 'Progress' }) }).locator('p').first().innerText()).trim();
  expect(progress).toMatch(/^\d+ of \d+ tasks finished\.$/);

  // Interrupted data: the page reloads while the genre catalog and the holiday rules can't be fetched.
  await pressSaveAndExit(page);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  let refuse = true;
  await page.route((url) => /\/(genre-catalog|countries|calendars)(-[\w-]+)?\.json$/.test(url.pathname) && !url.search, (route) => (refuse ? route.abort() : route.continue()));
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText("The game's genre catalog couldn't be loaded. Check your connection and try again.")).toBeVisible();
  await shot(page, 'stop-motion', '04-data-failed');
  refuse = false;
  await page.getByRole('button', { name: 'Try Again' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Pip And The Crow' }).click();
  await section(page, 'Production');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Progress' }) }).locator('p').first()).toHaveText(progress);

  await runToDelivery(page, { step: 'month', weeks: 30 });
  await section(page, 'Production');
  for (const t of ['Armature: Pip', 'Puppet Fabrication: Pip', 'Armature: The Crow', 'Miniature Sets']) await expect(page.getByText(t, { exact: true })).toBeVisible();
  const credits = await creditsTable(page);
  expect(credits).toMatch(/as Pip/);
  expect(credits).toMatch(/as The Crow/);
  await selfRelease(page, 'GB');
  await saveAndReload(page, 'Pip And The Crow');
  await section(page, 'Release');
  await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Release History' }) }).getByText('Released', { exact: true })).toBeVisible();
});

test('writing, producing and directing without acting: an offer to a performer booked elsewhere is turned down, then recast', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  test.setTimeout(1_200_000);
  const p = info.project.name;
  await quickLife(page, 'ca-toronto', '2026-03-02', { portrait: true });
  await pinSeed(page, SEEDS.behindTheCamera);
  await newProject(page, { title: 'The Ferryman', format: 'Short Film', runtime: '6', budget: 'Micro Budget' });
  await addCharacters(page, ['Odile', 'The Ferryman']);
  await editCharacter(page, 'Odile', async (c) => {
    await c.getByLabel('Role Size').selectOption({ label: 'Lead' });
    await c.getByRole('checkbox', { name: 'Protagonist' }).check();
  });
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Ferry Dock', chars: ['Odile', 'The Ferryman'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Wheelhouse', chars: ['Odile', 'The Ferryman'], minutes: '3' });
  await saveAndApprove(page);

  // Casting: with "Only Show People Who Are Free" off, a performer booked elsewhere is listed with the reason. An offer to
  // them is turned down for that reason; the part is then cast with someone free.
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'Odile' }).getByRole('button', { name: 'Find Performers' }).first().click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Only Show People Who Are Free' }).uncheck();
  const busy = dialog.locator('li', { hasText: 'is booked on another production from' }).first();
  await expect(busy).toBeVisible();
  const busyName = (await busy.locator('strong').first().innerText()).trim();
  await shot(page, p, '01-busy-performer');
  await busy.getByRole('button', { name: 'Make Offer' }).click();
  await page.keyboard.press('Escape');
  // They answer by the date the offer row gives; wait for it, a day at a time.
  await section(page, 'Cast');
  const offerRow = page.locator('tr', { hasText: busyName });
  await expect(offerRow).toContainText('Offer Sent');
  for (let i = 0; i < 10 && !(await offerRow.getByText('Declined', { exact: true }).count()); i++) {
    await advance(page, 'next-day');
    await section(page, 'Cast');
  }
  await expect(offerRow.getByText('Declined', { exact: true })).toBeVisible();
  await nav(page, 'Home');
  await expect(page.getByText(`${busyName} turned down the role of Odile.`, { exact: false })).toBeVisible();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'The Ferryman' }).click();
  await castRoles(page, []);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  await saveAndReload(page, 'The Ferryman');
  await runToDelivery(page);

  // Downstream: the player is credited behind the camera only; both parts went to performers, neither to the one who said no.
  const credits = await creditsTable(page);
  for (const c of ['Written By', 'Directed By', 'Produced By']) expect(credits).toMatch(new RegExp(`${c}\\s+Nia Halvorsen-Mbeki`));
  expect(credits).not.toMatch(/Cast\s+Nia Halvorsen-Mbeki/);
  expect(credits).toMatch(/as Odile/);
  expect(credits).toMatch(/as The Ferryman/);
  expect(credits).not.toContain(busyName);
  // Your headshot sits beside your own credit lines, and only theirs (November 8, 2026, from 1221's Identity).
  const creditRows = page.locator('section.card', { has: page.getByRole('heading', { name: 'Credits' }) }).locator('tbody tr');
  await expect(creditRows.filter({ hasText: 'Nia Halvorsen-Mbeki' }).first().locator('img.headshot-sm')).toBeVisible();
  await expect(creditRows.filter({ hasNotText: 'Nia Halvorsen-Mbeki' }).locator('img.headshot-sm')).toHaveCount(0);
  await selfRelease(page, 'CA');
  await saveAndReload(page, 'The Ferryman');
  expect(await creditsTable(page)).toBe(credits);
  await shot(page, p, '02-credits');
});
