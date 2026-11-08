import { expect, test } from './test';
import { addScene, advance, createCharacter, freshStart, nav, readSavedState, section, staffEveryDepartment, secureStartingBacking, pressSaveAndExit, writePitch } from './helpers';

test('live-action short: create, write, cast yourself, staff, shoot, cut, deliver, credits', async ({ page }, info) => {
  await freshStart(page);
  await expect(page.getByText('Your next story starts here.')).toBeVisible();
  // A fresh start has no Continue; New Game, Saved Games and Settings are there.
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toHaveCount(0);
  for (const a of ['New Game', 'Saved Games', 'Settings']) await expect(page.getByRole('button', { name: a, exact: true })).toBeVisible();
  await createCharacter(page, {
    name: 'Amaranta Okonkwo-Villaseñor de la Cruz', pronouns: 'She/Her', birthDate: '1994-02-28', birthplace: 'Lagos', heritages: ['Igbo', 'Hispanic Or Latino'], nationalities: ['Nigeria', 'Mexico'],
    customHeritage: 'Afro-Mexican from Costa Chica', mainLanguage: 'English', extraLanguages: ['Spanish', 'Igbo'], start: 'Toronto', startDate: '2026-03-02', startTime: '08:00',
  });
  // Home truthfulness and empty states.
  await expect(page.getByText(/^Monday, March 2, 2026 · /)).toBeVisible();
  await expect(page.getByText(/^8:0\d AM in Toronto, /)).toBeVisible();
  await expect(page.getByText("You haven't started a project yet.")).toBeVisible();
  await expect(page.getByText("You're up to date.")).toBeVisible();
  await expect(page.getByText('You have nothing scheduled today.')).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-home.png`, fullPage: true });

  // New Script.
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('The Last Ferry To Wolfe Island');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('drama');
  await page.getByRole('button', { name: 'Add Drama' }).click();
  await page.getByRole('searchbox', { name: 'Search Genres' }).fill('mystery');
  await page.getByRole('button', { name: 'Add Mystery' }).click();
  await expect(page.getByText('Clues And Evidence Trail')).toBeVisible();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'The Last Ferry To Wolfe Island' })).toBeVisible();

  // Characters.
  await section(page, 'Characters');
  for (const n of ['Odile', 'The Ferryman']) {
    await page.getByLabel('Character Name').fill(n);
    await page.getByRole('button', { name: 'Add Character' }).click();
  }
  const odile = page.getByRole('article', { name: 'Odile' });
  await odile.getByRole('button', { name: 'Edit Character' }).click();
  await odile.getByLabel('Role Size').selectOption({ label: 'Lead' });
  await odile.getByRole('checkbox', { name: 'Protagonist' }).check();

  // Script: two scenes and a clue.
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Add Scene' }).click();
  await page.getByRole('button', { name: 'Add Scene' }).click();
  const cards = page.locator('article.scene-card');
  const fillScene = async (i: number, place: string, ext: boolean, who: string[]) => {
    const c = cards.nth(i);
    await c.getByRole('button', { name: 'Edit Scene' }).click();
    if (ext) await c.getByLabel('Interior Or Exterior').selectOption({ label: 'Exterior' });
    await c.getByLabel('Place', { exact: true }).fill(place);
    for (const w of who) await c.getByRole('checkbox', { name: w }).check();
    await c.getByLabel('Objective').fill('Find out who sent the letter.');
    await c.getByLabel('Props').fill('Unsigned letter');
    if (i === 0) {
      await c.getByLabel('Speaker').selectOption({ label: 'Odile' });
      await c.getByLabel('Line', { exact: true }).fill('Who sent this?');
      await c.getByRole('button', { name: 'Add Line' }).click();
    }
    await c.getByRole('button', { name: 'Close Scene' }).click();
  };
  await fillScene(0, 'Ferry Dock', true, ['Odile', 'The Ferryman']);
  await fillScene(1, 'Wheelhouse', false, ['Odile', 'The Ferryman']);
  await page.getByLabel('What Is Set Up').fill('The ferryman knows the handwriting');
  await page.getByLabel('Kind', { exact: true }).selectOption({ label: 'Clue' });
  await page.getByRole('button', { name: 'Add Setup' }).click();
  await page.getByLabel('Planted In').selectOption({ index: 1 });
  await page.getByLabel('Pays Off In').selectOption({ index: 2 });
  await writePitch(page);
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await expect(page.getByText('Draft 1', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Approve This Draft' }).click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await secureStartingBacking(page);

  // The estimate (SLATE-08-01): built from the work the approved script needs, split by how certain each part is, with
  // what makes it expensive. Nothing is hired yet, so it is all still to come.
  await section(page, 'Budget');
  const estimate = page.locator('section.card', { has: page.getByRole('heading', { name: 'What It Costs' }) });
  for (const t of ['Spent', 'Agreed, Not Yet Paid', 'Held For Plans And Offers', 'Still To Come, Estimated']) await expect(estimate.locator('dt', { hasText: new RegExp(`^${t}$`) })).toBeVisible();
  await expect(estimate.getByRole('heading', { name: 'What Makes It Expensive' })).toBeVisible();
  await expect(estimate.locator('dt', { hasText: /^Still To Come, Estimated$/ }).locator('xpath=following-sibling::dd[1]')).not.toHaveText('$0');
  await estimate.getByText(/^Everything Still To Come \(\d+ lines\)$/).click();
  await expect(estimate.getByRole('heading', { name: /^Crew: \$[\d,]+$/ })).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-what-it-costs.png`, fullPage: true });
  // The alternatives: what the estimate would save without each choice, and the shoot days it changes.
  const cuts = page.locator('section.card', { has: page.getByRole('heading', { name: 'Ways To Cost Less' }) });
  await cuts.getByRole('button', { name: 'Work Out Savings' }).click();
  await expect(cuts.getByRole('listitem').first()).toContainText(/: saves about \$[\d,]+/);

  // Cast: Odile is the player; the Ferryman goes to a performer.
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.locator('li', { hasText: 'Odile' }).getByRole('button', { name: 'Cast Yourself' }).click();
  await roles.locator('li', { hasText: 'The Ferryman' }).getByRole('button', { name: 'Find Performers' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();

  // Crew through department proposals.
  const sent = await staffEveryDepartment(page);
  expect(sent).toBeGreaterThan(2);

  // Schedule.
  await advance(page, 'next-event');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await expect(page.getByRole('heading', { name: 'Shoot Days' })).toBeVisible();
  await expect(page.locator('li', { hasText: 'Ferry Dock' }).first()).toBeVisible();
  // Each day's call sheet (SLATE-11-05.03): the call, where, who is called for which scenes, daylight for an exterior.
  const dock = page.locator('section.card', { has: page.getByRole('heading', { name: 'Shoot Days' }) }).locator('li', { hasText: 'Ferry Dock' }).first();
  await dock.getByText('Call Sheet', { exact: true }).click();
  await expect(dock).toContainText('7:00 AM');
  await expect(dock).toContainText('Ferry Dock, exterior');
  await expect(dock).toContainText('You as Odile');
  await expect(dock).toContainText(/Sunrise \d+:\d\d AM, sunset \d+:\d\d PM\./);
  // The shot plan (SLATE-12-02.02): what the scene needs comes from its facts (the letter is planted here, so inserts).
  // More takes take more of the day; a lighter plan than the scene needs is allowed and says what the edit will lack.
  await expect(dock).toContainText('Needs inserts');
  const share = async () => Number((await dock.getByText(/^About \d+% of the standard plan's time/).first().textContent())!.match(/About (\d+)%/)![1]);
  const before = await share();
  await dock.getByLabel('Takes For Scene 1 (Ferry Dock)').selectOption({ label: 'Keep Going For The Best (Five)' });
  await expect(dock).toContainText('planning 5 takes a setup');
  expect(await share()).toBeGreaterThan(before);
  await dock.getByLabel('Coverage For Scene 1 (Ferry Dock)').selectOption({ label: 'A Master Only' });
  await expect(dock).toContainText('This plan has no inserts: the edit will lack them unless a pickup shoots them.');
  // The wheelhouse's emphasis is a detail (the handwriting), which needs inserts; this plan keeps it to the master too.
  const wheelhouse = page.locator('section.card', { has: page.getByRole('heading', { name: 'Shoot Days' }) }).locator('li', { hasText: 'Wheelhouse' }).first();
  await wheelhouse.getByText('Call Sheet', { exact: true }).click();
  await wheelhouse.getByLabel('Emphasis For Scene 2 (Wheelhouse)').selectOption({ label: 'A Detail (Inserts)' });
  await expect(wheelhouse).toContainText('Needs inserts');
  await wheelhouse.getByLabel('Coverage For Scene 2 (Wheelhouse)').selectOption({ label: 'A Master Only' });
  await expect(wheelhouse).toContainText('This plan has no inserts');
  // Once everything is hired and the days are booked, nothing is left only estimated: the money is agreed or held, and
  // the estimate made at approval is set against it.
  await section(page, 'Budget');
  const costs = page.locator('section.card', { has: page.getByRole('heading', { name: 'What It Costs' }) });
  await expect(costs.getByRole('heading', { name: 'Estimate Against Spending' })).toBeVisible();
  // Phones label each cell (Area Crew, Estimated At Approval $…), so the row is matched either way.
  await expect(costs.getByRole('row', { name: /^(Area )?Crew (Estimated At Approval )?\$[\d,]+ (Spent Or Agreed )?\$[\d,]+$/ })).toBeVisible();
  const daysNow = Number(await costs.locator('dt', { hasText: 'Shoot Days Still To Come' }).locator('xpath=following-sibling::dd[1]').textContent());
  expect(daysNow).toBeGreaterThan(0);
  // A bigger script, shown before it is approved (SLATE-08-05): a third scene at a new place adds a shoot day. The player
  // keeps the current draft and goes back to it.
  await section(page, 'Script');
  await addScene(page, { index: 2, place: 'Lighthouse', chars: ['Odile'], minutes: '3', exterior: true });
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  const approve = page.getByRole('dialog', { name: 'Approve This Draft?' });
  const change = approve.getByLabel('What The Change Does');
  await expect(change).toContainText(/Budget estimate: \$[\d,]+ now, \$[\d,]+ after/);
  await expect(change).toContainText(`Shoot days still to come: ${daysNow} now, ${daysNow + 1} after (1 more).`);
  await page.screenshot({ path: `test-results/${info.project.name}-scope-change.png`, fullPage: true });
  await approve.getByRole('button', { name: 'Keep The Current Draft' }).click();
  await expect(approve).toHaveCount(0);
  await page.getByRole('button', { name: 'Restore This Draft' }).last().click();
  await expect(page.locator('article.scene-card')).toHaveCount(2);
  await section(page, 'Schedule');

  // Once scouting is done, each place offers three sites; a cheaper stand-in with the real place as the backup
  // (SLATE-11-02.02). If the stand-in falls through on the day, the shoot goes to the backup.
  const sites = page.locator('section.card', { has: page.getByRole('heading', { name: 'Locations' }) });
  for (let i = 0; i < 6 && !(await sites.count()); i++) { await advance(page, 'week'); await section(page, 'Schedule'); }
  await expect(sites).toContainText('Scouting found three sites for each place.');
  await expect(sites.getByLabel('Site For Wheelhouse').locator('option')).toContainText([/^The Real Place \(Not Chosen Yet\)$/, /^The Real Place: \$[\d,]+ a day$/, /^A Stage Set Built To Match: \$[\d,]+ a day$/, /^A Cheaper Stand-In: \$[\d,]+ a day$/]);
  await sites.getByLabel('Site For Wheelhouse').selectOption('standin');
  await sites.getByLabel('Backup For Wheelhouse').selectOption('real');
  await expect(sites).toContainText('Costs less; arrangements like this fall through more often.');

  // Let production run; keep staffing and move the edit along.
  let rerecorded = false;
  let pickedUp = false;
  let n = '';
  for (let i = 0; i < 24; i++) {
    await advance(page, 'week');
    await staffEveryDepartment(page);
    // A performer might decline: offer the role to the next person.
    await section(page, 'Cast');
    const find = page.locator('li', { hasText: 'The Ferryman' }).getByRole('button', { name: 'Find Performers' });
    if (await find.isVisible()) {
      await find.click();
      await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
    }
    await section(page, 'Edit');
    const deliver = page.getByRole('button', { name: 'Deliver Project' });
    if (await deliver.isVisible() && await deliver.isEnabled()) {
      await deliver.click();
      break;
    }
    const lock = page.getByRole('button', { name: 'Lock Picture', exact: true });
    // Additional work before lock (SLATE-15-03.02): re-record Odile's line, once; the sound waits for the session.
    const rerecord = page.getByRole('button', { name: "Re-Record Odile's Lines" });
    if (!rerecorded && await rerecord.count()) {
      await rerecord.click();
      await expect(page.locator('section.card', { has: page.getByRole('heading', { name: 'Additional Work' }) })).toContainText('Odile · you, re-recording booked');
      rerecorded = true;
      continue;
    }
    if (await lock.isEnabled()) {
      // Before locking, the dailies (SLATE-12-03): what each scene needed, what was filmed, its takes and the gap the lighter
      // plan left. The dock gets another take and a pickup day for its inserts; the wheelhouse is cut without them.
      const dailies = page.getByRole('listitem', { name: 'Dailies For Scene 1 (Ferry Dock)' });
      const wheelDailies = page.getByRole('listitem', { name: 'Dailies For Scene 2 (Wheelhouse)' });
      if (!pickedUp) {
        await expect(dailies).toContainText('Filmed master.');
        await expect(dailies).toContainText('In the cut');
        await expect(dailies).toContainText(/No inserts: /);
        await expect(dailies).toContainText(/About \$[\d,]+: the location, gear, crew and cast for a day\./);
        const use = dailies.getByRole('button', { name: /^Use Take \d Of Scene 1 \(Ferry Dock\)$/ }).first();
        n = (await use.getAttribute('aria-label'))!.match(/Take (\d)/)![1];
        await use.click();
        await expect(dailies.locator('li', { hasText: new RegExp(`^Take ${n}: .* · In the cut`) })).toHaveCount(1);
        await expect(dailies.locator('li', { hasText: / · In the cut/ })).toHaveCount(1);
        await page.screenshot({ path: `test-results/${info.project.name}-dailies.png`, fullPage: true });
        // A pickup of just the inserts (SLATE-12-05): booked after the last day; the edit can't lock until it is shot.
        await dailies.getByRole('button', { name: 'Shoot Inserts On A Pickup Day' }).click();
        await expect(dailies.getByRole('button', { name: 'Shoot Inserts On A Pickup Day' })).toHaveCount(0);
        await expect(lock).toBeDisabled();
        pickedUp = true;
        continue;
      }
      // The pickup day shot the inserts: the dock needs nothing more, and the take chosen is still the one in the cut.
      await expect(dailies).toContainText('Filmed master, inserts.');
      await expect(dailies).not.toContainText('No inserts: ');
      await expect(dailies.locator('li', { hasText: new RegExp(`^Take ${n}: .* · In the cut`) })).toHaveCount(1);
      await expect(wheelDailies).toContainText(/No inserts: /);
      await wheelDailies.getByRole('button', { name: 'Cut It Without Inserts' }).click();
      await expect(wheelDailies).not.toContainText('No inserts: ');
      // Save, close and reopen: the chosen take, the pickup's inserts and the accepted gap are still there.
      await pressSaveAndExit(page);
      await page.getByRole('button', { name: 'Continue', exact: true }).click();
      await nav(page, 'Projects');
      await page.getByRole('button', { name: 'The Last Ferry To Wolfe Island' }).click();
      await section(page, 'Edit');
      await expect(dailies.locator('li', { hasText: new RegExp(`^Take ${n}: .* · In the cut`) })).toHaveCount(1);
      await expect(dailies).toContainText('Filmed master, inserts.');
      await expect(wheelDailies).not.toContainText('No inserts: ');
      await lock.click();
      // A Festival Cut without the wheelhouse scene (SLATE-15-05.03): its own runtime, a day of editing before delivery.
      const versions = page.locator('section.card', { has: page.getByRole('heading', { name: 'Versions', exact: true }) });
      await versions.getByRole('checkbox', { name: 'Scene 2 (Wheelhouse)' }).check();
      await versions.getByRole('button', { name: 'Add Version' }).click();
      await expect(versions).toContainText(/Festival Cut · \d+ minutes · \d+ credits/);
      continue;
    }
    const cut = page.getByRole('button', { name: 'Start Cut Pass' });
    if (await cut.isEnabled()) await cut.click();
  }
  await expect(page.getByText(/Delivered at \d+ minutes/)).toBeVisible();
  expect(rerecorded).toBe(true);

  // Credits: all four professions earned on this project.
  await section(page, 'Release');
  const credits = page.locator('section.card', { hasText: 'Credits' }).first();
  for (const c of ['Written By', 'Directed By', 'Produced By']) await expect(credits.getByText(c, { exact: true })).toBeVisible();
  await expect(credits.getByText('as Odile')).toBeVisible();
  await page.screenshot({ path: `test-results/${info.project.name}-release.png`, fullPage: true });

  // Festival submission through the UI, then let the edition run.
  await section(page, 'Festivals And Awards');
  const openRow = page.locator('li', { hasText: /Open To You/ }).first();
  await expect(openRow).toBeVisible();
  await openRow.getByRole('button').first().click();
  // The event page loads on first use; wait for it before counting its actions.
  await expect(page.getByRole('heading', { name: 'When And Where' })).toBeVisible();
  const prepare = page.getByRole('button', { name: 'Prepare Submission' });
  let submitted = false;
  for (let i = 0; i < await prepare.count() && !submitted; i++) {
    await prepare.nth(i).click();
    await expect(page.getByRole('dialog').getByLabel('Version To Enter').locator('option')).toContainText([/^The Main Cut \(\d+ Minutes\)$/, /^Festival Cut \(\d+ Minutes\)$/]);
    // Enter the Festival Cut (SLATE-15-05.03): eligibility is checked on its own runtime.
    await page.getByRole('dialog').getByLabel('Version To Enter').selectOption({ label: (await page.getByRole('dialog').getByLabel('Version To Enter').locator('option', { hasText: /^Festival Cut/ }).textContent())! });
    const submit = page.getByRole('dialog').getByRole('button', { name: 'Submit Entry' });
    if (await submit.isEnabled()) {
      await submit.click();
      submitted = true;
    } else await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
  }
  expect(submitted).toBe(true);
  await expect(page.locator('section', { hasText: 'Your Entries' }).getByText('Submitted')).toBeVisible();
  await expect(page.locator('section', { hasText: 'Your Entries' }).locator('li', { hasText: 'Submitted' })).toContainText(', Festival Cut');
  for (let i = 0; i < 8; i++) await advance(page, 'month');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'The Last Ferry To Wolfe Island' }).click();
  await section(page, 'Festivals And Awards');
  const status = await page.locator('section', { hasText: 'Your Entries' }).locator('.chip').first().innerText();
  expect(['Selected', 'Not Selected', 'Won', 'Did Not Win', 'Accepted For Consideration', 'Not Accepted']).toContain(status);
  await page.screenshot({ path: `test-results/${info.project.name}-festival.png`, fullPage: true });

  // Saved state matches and survives reload.
  await pressSaveAndExit(page);
  await expect(page.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  const saved = await readSavedState(page);
  expect(saved.projects[0].delivered).not.toBeNull();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Profile');
  await expect(page.getByText('The Last Ferry To Wolfe Island').first()).toBeVisible();
});
