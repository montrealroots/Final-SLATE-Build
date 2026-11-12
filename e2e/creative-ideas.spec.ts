// Journey J01 of the Creative Depth package (06-TESTING-AND-DELIVERY.md): from a chosen idea to a delivered film,
// through the real interface. The package's worked example, Last Shift In Briar Hollow: a premise from the picker made
// the player's own, scenes ticked, a blend of genres, the year 1986, creature makeup and a built costume, then
// approval, backing, cast, crew, the schedule with makeup on the call sheet, the shoot, the edit and delivery.
// Nothing is injected: the money comes from a backer, and the film is delivered by playing it. The only fixture is the
// pinned world seed (helpers.ts pinSeed). Desktop and phone run in Chromium, iphone-15-pro-max in WebKit: emulation,
// not devices. Every name is made up.
import { expect, test, type Page } from './test';
import { advance, castRoles, createCharacter, freshStart, nav, pinSeed, pressSaveAndExit, produceToDelivery, readSavedState, runToDelivery, saveAndApprove, section, secureStartingBacking, seededLife, staffEveryDepartment } from './helpers';

const shot = (page: Page, project: string, name: string) => page.screenshot({ path: `test-results/creative-ideas-${project}-${name}.png`, fullPage: true });
const noSidewaysScroll = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
const project = async (page: Page) => (await readSavedState(page))?.projects?.[0];
/** The saved project once the game has written what the test just did: saving follows a change by a second or so. */
async function savedWhen(page: Page, ready: (p: any) => boolean): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  await expect.poll(async () => { const p = await project(page); return !!p && ready(p); }, { timeout: 30_000 }).toBe(true);
  return project(page);
}

test('from a chosen idea to a delivered film: the picker, the 1986 zombie brief, makeup and costume, the shoot and delivery', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and one WebKit iPhone emulation.');
  test.setTimeout(1_500_000);
  const n = info.project.name;
  await freshStart(page);
  await createCharacter(page, { name: 'Rin Okafor', pronouns: 'They/Them', birthDate: '1990-06-15', birthplace: 'Lagos', heritages: ['Yoruba'], nationalities: ['Nigeria'], mainLanguage: 'English', extraLanguages: [], start: 'London', startDate: '2026-01-05', startTime: '08:00' });
  await pinSeed(page, 7);
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Last Shift In Briar Hollow');
  await page.getByLabel('Format').selectOption({ label: 'Feature Film' });
  await page.getByRole('radio', { name: /^Low Budget:/ }).check();
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Last Shift In Briar Hollow', level: 1 })).toBeVisible();
  await section(page, 'Script');

  // Write My Own first: a theme typed by hand, which choosing an idea must leave alone.
  await page.getByLabel('Theme', { exact: true }).fill('Who answers when nobody has to.');

  // Choose A Starting Idea: opened, searched, cancelled (nothing changes), then opened again and applied.
  const start = page.getByRole('button', { name: 'Choose A Starting Idea' });
  await start.click();
  let picker = page.getByRole('dialog', { name: 'Choose A Starting Idea' });
  await expect(picker.getByRole('tab', { name: 'Browse All' })).toBeVisible();
  await picker.getByRole('tab', { name: 'Browse All' }).click();
  await expect(picker.getByRole('status')).toHaveText('12 ideas');
  await picker.getByLabel('Search Ideas').fill('dispatcher');
  await expect(picker.getByRole('status')).toHaveText('1 of 12 ideas');
  await expect(picker.getByRole('list', { name: 'Ideas' }).getByRole('button')).toHaveCount(1);
  await noSidewaysScroll(page);
  await shot(page, n, '01-picker');
  await picker.getByRole('button', { name: 'Keep My Current Choices' }).click();
  await expect(picker).toBeHidden();
  // Closing gives the keyboard back to the button that opened it, and nothing was written.
  await expect(start).toBeFocused();
  await expect(page.getByLabel('Premise', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('Who answers when nobody has to.');

  await start.click();
  picker = page.getByRole('dialog', { name: 'Choose A Starting Idea' });
  await picker.getByRole('tab', { name: 'Browse All' }).click();
  await picker.getByRole('button', { name: /^A Town That Cannot Sleep/ }).click();
  const idea = page.getByRole('dialog', { name: 'A Town That Cannot Sleep' });
  // Make It Your Own: the town's name is the player's.
  await idea.getByLabel("The Town's Name").fill('Saltmarsh');
  await expect(idea.getByRole('region', { name: 'What It Sets' })).toContainText('In Saltmarsh, the night-shift dispatcher June Okafor');
  await expect(idea.getByRole('region', { name: 'What It Sets' })).toContainText('5 scenes are offered. None is added unless you tick it.');
  for (const box of await idea.getByRole('group', { name: 'Scenes It Offers' }).getByRole('checkbox').all()) await box.check();
  await expect(idea.getByRole('region', { name: 'What It Sets' })).toContainText('New scene: EXT. Main Street, night.');
  await expect(idea.getByRole('region', { name: 'This Changes The Shoot' })).toContainText('A night exterior shoots after dark where the production is based');
  await noSidewaysScroll(page);
  await shot(page, n, '02-idea-open');
  await idea.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Applied: A Town That Cannot Sleep.' })).toBeVisible();
  await expect(page.getByLabel('Logline', { exact: true })).toHaveValue(/^When the dead return during Saltmarsh's overnight shift, the dispatcher June Okafor/);
  await expect(page.getByLabel('Theme', { exact: true })).toHaveValue('Who answers when nobody has to.');
  await expect(page.locator('article.scene-card')).toHaveCount(5);

  // The logline is the player's to rewrite, and a second idea asks before replacing what they wrote.
  await page.getByLabel('Logline', { exact: true }).fill('My own logline: the night Saltmarsh answered.');
  await page.getByRole('button', { name: 'Choose A Starting Idea' }).click();
  picker = page.getByRole('dialog', { name: 'Choose A Starting Idea' });
  await picker.getByRole('tab', { name: 'Browse All' }).click();
  await picker.getByRole('button', { name: /^The Last Night Train/ }).click();
  const second = page.getByRole('dialog', { name: 'The Last Night Train' });
  await expect(second.getByRole('group', { name: 'You Have Already Written' })).toContainText('My own logline: the night Saltmarsh answered.');
  await second.getByRole('button', { name: 'Back To Ideas' }).click();
  await page.getByRole('dialog', { name: 'Choose A Starting Idea' }).getByRole('button', { name: 'Keep My Current Choices' }).click();
  await expect(page.getByLabel('Logline', { exact: true })).toHaveValue('My own logline: the night Saltmarsh answered.');

  // One field's ideas, a blend of genres, and the year.
  await page.getByLabel('Central Conflict', { exact: true }).locator('xpath=ancestor::div[contains(@class,"idea-field")][1]').getByRole('button', { name: 'Choose Ideas' }).click();
  await page.getByRole('dialog', { name: 'Choose A Central Conflict' }).getByRole('button', { name: /^Scarce Resource/ }).click();
  await page.getByRole('dialog', { name: 'Scarce Resource' }).getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByLabel('Central Conflict', { exact: true })).toHaveValue('Scarce Resource: different groups need the same limited resource.');
  await page.getByRole('button', { name: 'Blend Genres' }).click();
  await page.getByRole('dialog', { name: 'Choose A Blend Of Genres' }).getByRole('button', { name: /^Horror With A Comic Streak/ }).click();
  await page.getByRole('dialog', { name: 'Horror With A Comic Streak' }).getByRole('button', { name: 'Apply', exact: true }).click();
  await page.getByLabel('Year It Is Set In').fill('1986');
  await expect(page.getByText('1986 is a period within living memory for a project made in 2026', { exact: false })).toBeVisible();
  await page.getByLabel('The Look It Borrows').fill('The 1980s');
  const brief = page.getByRole('region', { name: 'Creative Brief' });
  await expect(brief).toContainText('The Look It Borrows: The 1980s.');
  for (const name of ['A Town That Cannot Sleep', 'Scarce Resource', 'Horror With A Comic Streak']) await expect(brief).toContainText(name);
  let saved = await savedWhen(page, (q) => q.axes.styleEra === 'The 1980s' && q.brief?.picks?.length === 3);
  expect(saved.axes.genres).toEqual([{ id: 'horror', emphasis: 'primary' }, { id: 'comedy', emphasis: 'secondary' }]);
  expect([saved.axes.storyYear, saved.axes.styleEra]).toEqual([1986, 'The 1980s']);
  // The save keeps which ideas were chosen, never their words.
  expect(saved.brief.picks.map((k: { id: string }) => k.id)).toEqual(['premise.001', 'conflict.004', 'blend.horror-comedy']);

  // The creature's makeup, from the picker on its card: it says what the work will be before it is chosen.
  await section(page, 'Characters');
  const returned = page.getByRole('article', { name: 'The Returned' });
  await returned.getByRole('button', { name: 'Edit Character' }).click();
  await returned.getByRole('group', { name: 'How They Look' }).getByRole('button', { name: 'Choose Ideas' }).click();
  await page.getByRole('dialog', { name: 'How The Returned Looks' }).getByRole('tab', { name: 'Browse All' }).click();
  await page.getByRole('dialog', { name: 'How The Returned Looks' }).getByRole('button', { name: /^Full Creature Appliances/ }).click();
  const makeup = page.getByRole('dialog', { name: 'Full Creature Appliances' });
  await expect(makeup.getByRole('group', { name: 'Who Is This For' }).getByRole('checkbox', { name: 'The Returned' })).toBeChecked();
  const work = makeup.getByRole('region', { name: 'This Changes The Shoot' });
  await expect(work).toContainText('The Returned: 3 hours 30 minutes in the chair before shooting and 45 minutes to take off, each day they work.');
  await expect(work).toContainText('8 build days and $7,200 in materials, by the prosthetics designer.');
  await expect(work).toContainText("it replaces the creature build the script would otherwise ask for");
  await noSidewaysScroll(page);
  await shot(page, n, '03-makeup-idea');
  await makeup.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(returned.getByLabel('Makeup', { exact: true })).toHaveValue('creature');
  await returned.getByRole('button', { name: 'Close' }).click();
  // A costume chosen on the card's own control, not from an idea: the same thing afterwards.
  const june = page.getByRole('article', { name: 'June Okafor' });
  await june.getByRole('button', { name: 'Edit Character' }).click();
  await june.getByLabel('Costume From').selectOption({ label: 'Made For The Part' });
  await expect(june.getByRole('group', { name: 'How They Look' })).toContainText('1 copy, 3 fittings.');
  await june.getByRole('button', { name: 'Close' }).click();

  // The rest of the pitch, typed; then the draft is approved and the film backed.
  await section(page, 'Script');
  await page.getByLabel('Point Of View', { exact: true }).fill("June's.");
  await page.getByLabel('Intended Ending', { exact: true }).fill('Everyone who answered is still there at dawn.');
  await page.getByLabel('Intended Experience', { exact: true }).fill('Dread, then relief.');
  await page.getByLabel('Story Setting', { exact: true }).fill('A small town on one night in 1986.');
  await page.getByRole('button', { name: 'Declare None Of These' }).click();
  await expect(page.getByText('Nothing blocks approval.')).toBeVisible();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  const approve = page.getByRole('dialog');
  if (await approve.isVisible().catch(() => false)) await approve.getByRole('button', { name: /^Approve/ }).click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await secureStartingBacking(page);

  // What the choices made: the breakdown names the makeup and the costume, and the crew page asks for who applies it.
  saved = await savedWhen(page, (q) => q.approvedDraft !== null && q.funding.fund > 0);
  const reqs = saved.requirements.map((r: { kind: string; label: string; qty: number }) => `${r.kind}:${r.label}:${r.qty}`);
  expect(reqs).toEqual(expect.arrayContaining(['makeup:The Returned:1', 'makeup:Background: Main Street:12', 'costume:June Okafor:1', 'crowd:Main Street:12', 'period-research:1986:1']));
  expect(reqs.some((r: string) => r.startsWith('creature:'))).toBe(false);

  // Cast, crew, and the schedule: the night on Main Street says when makeup starts, and for whom.
  await castRoles(page);
  await staffEveryDepartment(page);
  await advance(page, 'next-day');
  await section(page, 'Schedule');
  await page.getByRole('button', { name: /Build Schedule|Rebuild Schedule/ }).click();
  const street = page.locator('li', { hasText: 'Main Street' }).filter({ hasText: /night/i }).first();
  await street.locator('summary', { hasText: 'Call Sheet' }).click();
  await expect(street).toContainText(/Makeup (starts at|needs)/);
  await expect(street).toContainText('the background performers');
  await expect(street).toContainText('12 background performers.');
  await noSidewaysScroll(page);
  await shot(page, n, '04-call-sheet');

  // Save, leave, come back: the choices and the plan are as they were.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Last Shift In Briar Hollow' }).click();
  saved = await project(page);
  expect(saved.characters.find((c: { name: string }) => c.name === 'The Returned').look).toEqual({ makeup: 'creature' });
  expect(saved.characters.find((c: { name: string }) => c.name === 'June Okafor').look).toEqual({ wardrobe: 'build' });
  expect(saved.brief.picks.map((k: { id: string }) => k.id)).toEqual(['premise.001', 'conflict.004', 'blend.horror-comedy', 'makeup_method.003']);

  // The shoot, the edit and delivery, played.
  await runToDelivery(page, { weeks: 80 });
  saved = await savedWhen(page, (q) => !!q.delivered);
  expect(saved.delivered).toBeTruthy();
  const keys: string[] = saved.obligations.flatMap((o: { postings: { key: string }[] }) => o.postings.map((x) => x.key)).filter(Boolean);
  // Every cost was paid once; the makeup's daily materials and the built costume's are among them.
  expect(new Set(keys).size).toBe(keys.length);
  expect(keys.some((k) => k.startsWith('makeup:'))).toBe(true);
  const done = (kind: string) => saved.tasks.filter((t: { kind: string; status: string }) => t.kind === kind).map((t: { status: string }) => t.status);
  for (const kind of ['prep:appliances', 'prep:makeup-test', 'prep:wardrobe', 'prep:fitting']) expect(done(kind), kind).toEqual(expect.arrayContaining(['done']));
  await shot(page, n, '05-delivered');
});

test('a logline built from four parts, and a crowd extended in post from a scene\'s own ideas', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  await freshStart(page);
  await createCharacter(page, { name: 'Rin Okafor', pronouns: 'They/Them', birthDate: '1990-06-15', birthplace: 'Lagos', heritages: ['Yoruba'], nationalities: ['Nigeria'], mainLanguage: 'English', extraLanguages: [], start: 'London', startDate: '2026-01-05', startTime: '08:00' });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Built From Parts');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await section(page, 'Script');
  await page.getByLabel('Logline', { exact: true }).locator('xpath=ancestor::div[contains(@class,"idea-field")][1]').getByRole('button', { name: 'Choose Ideas' }).click();
  const build = page.getByRole('dialog', { name: 'Build A Logline' });
  await build.getByLabel('When It Starts').selectOption({ label: 'After the river takes the bridge' });
  await build.getByLabel('Who It Happens To').selectOption({ label: 'A school bus driver' });
  await build.getByLabel('What They Must Do').selectOption({ label: 'Must bring a stranger safely across hostile ground' });
  await build.getByLabel('What It Costs').selectOption({ label: 'Before morning makes the choice for them' });
  await expect(build.getByRole('region', { name: 'Your Logline' })).toContainText('After the river takes the bridge, a school bus driver must bring a stranger safely across hostile ground, before morning makes the choice for them.');
  // Parts that don't go together say so, and can't be applied.
  await build.getByLabel('What They Must Do').selectOption({ label: 'Must keep a failing place open for one more night' });
  await expect(build.getByRole('region', { name: 'Your Logline' })).toContainText("Those parts don't go together. Change one of them.");
  await expect(build.getByRole('button', { name: 'Apply To My Logline' })).toBeDisabled();
  await build.getByLabel('What They Must Do').selectOption({ label: 'Must get one message to the right person' });
  await build.getByRole('button', { name: 'Apply To My Logline' }).click();
  await expect(build.getByRole('status')).toContainText('Applied. It is in your Logline now.');
  await build.getByRole('button', { name: 'Keep My Current Choices' }).click();
  await expect(page.getByLabel('Logline', { exact: true })).toHaveValue('After the river takes the bridge, a school bus driver must get one message to the right person, before morning makes the choice for them.');

  // A scene from an idea, given a crowd, then the crowd extended in post from the scene's own ideas.
  await page.getByRole('button', { name: 'Add A Scene From An Idea' }).click();
  await page.getByRole('dialog', { name: 'Add A Scene At A Kind Of Place' }).getByRole('button', { name: /^Market District/ }).click();
  const market = page.getByRole('dialog', { name: 'Market District' });
  await market.getByLabel("The Place's Name In Your Story").fill('Fish Market');
  await expect(market.getByRole('group', { name: 'The Scene It Adds' }).getByRole('checkbox')).toBeChecked();
  await market.getByRole('button', { name: 'Apply', exact: true }).click();
  const scene = page.locator('article.scene-card').first();
  await expect(scene).toContainText('EXT. Fish Market');
  await scene.getByRole('button', { name: 'Edit Scene' }).click();
  await expect(scene.getByLabel('Crowd Size')).toHaveValue('30');
  await expect(scene.getByText('All 30 are on set and paid for the day.')).toBeVisible();
  await scene.getByRole('button', { name: 'Ideas For This Scene' }).click();
  const forScene = page.getByRole('dialog', { name: /^Ideas For / });
  await forScene.getByRole('tab', { name: 'Browse All' }).click();
  await forScene.getByRole('button', { name: /^Extend The Crowd In Post/ }).click();
  const extend = page.getByRole('dialog', { name: 'Extend The Crowd In Post' });
  await expect(extend.getByRole('region', { name: 'What It Sets' })).toContainText('Fish Market, Crowd: 8 of 30 on set, the rest added in post.');
  await extend.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(scene.getByRole('checkbox', { name: 'Extend The Crowd In Post' })).toBeChecked();
  await expect(scene.getByText('8 of 30 are on set; the rest are added after the picture is locked', { exact: false })).toBeVisible();
  // Undo Last Change takes the idea back, like any other edit.
  await page.getByRole('button', { name: 'Undo Last Change' }).click();
  await expect(scene.getByRole('checkbox', { name: 'Extend The Crowd In Post' })).not.toBeChecked();
});

// J02 of the Creative Depth package: the same zombie premise made as stop motion. The idea is chosen from the same
// picker; what it asks for is puppets, miniature sets, animators and voices, and none of the live shoot's makeup chair,
// costume fittings or locations. (A puppet damaged on its stage and repaired is its own journey: journeys.spec.ts,
// "stop motion: a puppet damaged on set holds its shots until it is repaired".)
test('J02: the zombie premise as stop motion: puppets, sets and voices are made, and no live-action makeup or location work', async ({ page }, info) => {
  test.skip(!['desktop', 'iphone-15-pro-max'].includes(info.project.name), 'One full production, on desktop and one WebKit iPhone emulation.');
  test.setTimeout(1_500_000);
  await seededLife(page, 'gb-london', '2026-01-05', 7);
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await page.getByLabel('Working Title').fill('Briar Hollow In Clay');
  await page.getByLabel('Format').selectOption({ label: 'Short Film' });
  await page.getByLabel('Medium').selectOption({ label: 'Animation' });
  await page.getByLabel(/^Animation Technique/).selectOption({ label: 'Stop Motion' });
  await page.getByLabel('Animation Finish').selectOption({ label: 'Limited Animation' });
  await page.getByLabel(/Target Runtime In Minutes/).fill('2');
  await page.getByRole('button', { name: 'Create Project' }).click();
  await expect(page.getByRole('heading', { name: 'Briar Hollow In Clay', level: 1 })).toBeVisible();
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Choose A Starting Idea' }).click();
  const picker = page.getByRole('dialog', { name: 'Choose A Starting Idea' });
  await picker.getByRole('tab', { name: 'Browse All' }).click();
  await picker.getByRole('button', { name: /^A Town That Cannot Sleep/ }).click();
  const idea = page.getByRole('dialog', { name: 'A Town That Cannot Sleep' });
  // One of its scenes, which a two-minute puppet film can hold.
  await idea.getByRole('group', { name: 'Scenes It Offers' }).getByRole('checkbox').first().check();
  await idea.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Applied: A Town That Cannot Sleep.' })).toBeVisible();
  await expect(page.locator('article.scene-card')).toHaveCount(1);
  const scene = page.locator('article.scene-card').first();
  if (!(await scene.getByLabel('Estimated Minutes').count())) await scene.getByRole('button', { name: 'Edit Scene' }).click();
  await scene.getByLabel('Estimated Minutes').fill('0.5');
  await saveAndApprove(page);

  // What it asks for is the puppet film's work: every character in the scene is a puppet with its copies to choose.
  const names: string[] = (await savedWhen(page, (q) => q.approvedDraft !== null && q.characters.length > 0)).characters.map((c: { name: string }) => c.name);
  expect(names.length).toBeGreaterThan(0);
  await section(page, 'Schedule');
  await expect(page.getByLabel(/ Puppet Copies$/).first()).toBeVisible();
  await section(page, 'Crew');
  await expect(page.getByText(/^Hair And Makeup/)).toHaveCount(0);
  await expect(page.getByText(/^Prosthetics Designer/)).toHaveCount(0);
  await produceToDelivery(page, { yourself: [names[0]], step: 'month', weeks: 40 });
  await expect.poll(async () => !!(await readSavedState(page)).projects[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const done = (await readSavedState(page)).projects[0];
  const kinds = new Set<string>(done.tasks.map((t: { kind: string }) => t.kind));
  for (const k of ['sm:armature', 'sm:puppet', 'sm:sets', 'sm:animation', 'anim:voice']) expect([...kinds], k).toContain(k);
  // Nothing of a live shoot: no makeup or costume requirement, no location, no shoot day, no makeup or prosthetics hire.
  expect(done.requirements.filter((r: { kind: string }) => ['makeup', 'costume', 'location'].includes(r.kind))).toEqual([]);
  expect(done.schedule.days).toEqual([]);
  expect(done.hires.filter((h: { roleId: string }) => ['hair-makeup', 'prosthetics'].includes(h.roleId))).toEqual([]);
  expect(done.brief.picks.map((k: { id: string }) => k.id)).toEqual(['premise.001']);
  await section(page, 'Production');
  await expect(page.getByText(/^Puppet Fabrication: /).first()).toBeVisible();
  await expect(page.getByText('Ready for the stage.').first()).toBeVisible();
});

