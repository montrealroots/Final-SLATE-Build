// Milestone D of the Creative Depth package (docs/creative-depth), through visible controls only, on the made-up catalog
// (catalog-fixture.ts): every person here is invented and labelled a fixture, and no request goes to TMDB. J04: a
// performer from the film catalog is considered, reads for a part, counters a low offer, is contracted, is found booked
// by a second project, works, is paid and credited, and their work in the story survives a reload apart from their
// recorded credits. J05: a director with no recorded date of birth and a writer are hired for a single film by job,
// direct and write it, and are credited and paid. The world seed is fixed (labelled fixture).
import { expect, test, type Page } from './test';
import { serveCatalog } from './catalog-fixture';
import { addScene, advance, creditsTable, nav, newProject, produceToDelivery, readSavedState, saveAndApprove, saveAndExit, section, seededLife, writePitch } from './helpers';

test.use({ actionTimeout: 20_000 });

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const role = (page: Page, name: string) => page.locator('section.card li', { has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) }).first();
const noSidewaysScroll = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

/** Companies, the studio, the film, then the person: the way a player finds someone. */
async function openPerson(page: Page, name: string): Promise<void> {
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await page.getByRole('button', { name, exact: true }).first().click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
}

async function openProject(page: Page, title: string): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: title }).first().click();
  await expect(page.getByRole('heading', { name: title, level: 1 })).toBeVisible();
}

test.beforeEach(async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  await serveCatalog(page);
});

test('J04: a performer from the film catalog is considered, reads, counters, is contracted, found booked elsewhere, works and is credited', async ({ page }, info) => {
  test.setTimeout(900_000);
  const tmdb = await serveCatalog(page);
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  for (const n of ['Ines', 'Marco']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines', 'Marco'], minutes: '3' });
  await saveAndApprove(page);
  // The shoot is planned for March before anyone is contracted, so the contract books those weeks.
  await section(page, 'Schedule');
  await page.getByLabel('Production Start').fill('2026-03-02');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await expect(card(page, 'Shoot Days')).toContainText(/March \d+, 2026/);

  // One profile, whichever company credited them: recorded credits below, the story's part above.
  await openPerson(page, 'Ada Quill');
  const story = card(page, 'In Your Story');
  await expect(story).toContainText("Ada Quill isn't in your story yet.");
  await expect(card(page, 'Credits In The Catalog')).toContainText("what they do in your story is kept apart, above");
  await story.getByRole('button', { name: 'Consider Ada Quill For Your Projects' }).click();
  const jobs = story.getByRole('list', { name: 'What They Can Be Asked To Do' });
  await expect(jobs.locator('li', { hasText: /^Performer/ })).toContainText('3 recorded credits in this catalog, 2019 to 2023.');
  await expect(story).toContainText("Their languages, background and nationality aren't recorded, and none is assumed.");
  await story.getByLabel('Consider Them For').selectOption({ label: 'Ines (on camera)' });
  await story.getByRole('button', { name: 'Consider For This' }).click();
  await expect(story.getByRole('status')).toContainText("Ada Quill is on Night Ferry's list for Ines (on camera).");
  expect(await noSidewaysScroll(page)).toBe(true);
  await page.screenshot({ path: `test-results/real-people-${info.project.name}-01-person.png`, fullPage: true });
  await story.getByRole('button', { name: 'Open Night Ferry' }).click();

  // The part's list: they come first, marked as from the catalog, with what isn't recorded said and nothing guessed.
  await expect(page.getByRole('heading', { name: 'Night Ferry', level: 1 })).toBeVisible();
  await role(page, 'Marco').getByRole('button', { name: 'Cast Yourself' }).click();
  await role(page, 'Ines').getByRole('button', { name: 'Find Performers' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cast Ines' });
  const ada = dialog.locator('li', { hasText: 'Ada Quill' });
  await expect(dialog.locator('ul.list > li').first()).toContainText('Ada Quill');
  await expect(ada.getByText('From The Film Catalog', { exact: true })).toBeVisible();
  await expect(ada).toContainText("3 recorded credits in the film catalog. Age 45. In this story they play ages");
  await expect(ada).toContainText("Languages, background and nationality aren't recorded, and none is assumed. In this story they ask $660 a day.");
  await expect(ada.getByText('Pronouns Match', { exact: true })).toHaveCount(0);
  await ada.getByRole('button', { name: 'Invite Ada Quill To Read' }).click();
  await expect(ada.getByText('Asked To Read', { exact: true })).toBeVisible();
  await page.screenshot({ path: `test-results/real-people-${info.project.name}-02-list.png`, fullPage: true });
  await dialog.getByRole('button', { name: 'Close' }).first().click();
  const table = page.getByRole('table', { name: 'Auditions For Ines' });
  await advance(page, 'week');
  await section(page, 'Cast');
  const read = table.locator('tr', { hasText: 'Ada Quill' });
  await expect(read).toContainText('Read on January 8, 2026');
  await expect(read).toContainText("The languages they work in aren't recorded. A dialect coach is yours to hire if you want one.");
  await read.getByRole('button', { name: 'Shortlist' }).click();
  await expect(read).toContainText('Shortlisted');

  // A low offer: they counter at their rate, and the counter is accepted. That is a contract.
  await role(page, 'Ines').getByRole('button', { name: 'Find Performers' }).click();
  await ada.getByLabel('Day Rate For Ada Quill').fill('530');
  await ada.getByRole('button', { name: 'Make Offer' }).click();
  await expect(role(page, 'Ines')).toContainText('Offer out to Ada Quill');
  await advance(page, 'week');
  await section(page, 'Cast');
  const contracts = card(page, 'Offers And Contracts');
  const deal = contracts.locator('tr', { hasText: 'Ada Quill' });
  await expect(deal).toContainText('Asks $660 a day');
  await deal.getByRole('button', { name: 'Accept Counteroffer' }).click();
  await expect(deal).toContainText('$660 a day');
  await expect(deal).toContainText('Accepted');
  await expect(role(page, 'Ines')).toContainText('On Camera: Ada Quill');

  // A second project, paid for by an investor, lands on the same weeks and finds them booked, by the one diary.
  await newProject2(page);
  await section(page, 'Budget');
  await page.getByRole('button', { name: 'Approach Private Investor' }).click();
  const investor = card(page, 'Backers').locator('li', { hasText: /^Private Investor/ });
  for (let i = 0; i < 4 && (await investor.getByText('Considering', { exact: true }).count()); i++) {
    await advance(page, 'week');
    await section(page, 'Budget');
  }
  await investor.getByRole('button', { name: 'Accept Offer' }).click();
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  await openPerson(page, 'Ada Quill');
  await expect(story.getByRole('list', { name: 'Their Work In Your Story' }).locator('li', { hasText: 'Night Ferry' })).toContainText('Working on it');
  await story.getByLabel('Project').selectOption({ label: 'Harbour Song' });
  await story.getByLabel('Consider Them For').selectOption({ label: 'Juno (on camera)' });
  await expect(story).toContainText('Ada Quill is already working on another of your projects then. Harbour Song is planned for');
  await story.getByRole('button', { name: 'Consider For This' }).click();
  await story.getByRole('button', { name: 'Open Harbour Song' }).click();
  await role(page, 'Juno').getByRole('button', { name: 'Find Performers' }).click();
  const dialog2 = page.getByRole('dialog', { name: 'Cast Juno' });
  const ada2 = dialog2.locator('li', { hasText: 'Ada Quill' });
  await expect(ada2).toContainText('Ada Quill is already working on another of your projects then.');
  // The offer can still be made; they turn it down for the clash.
  await ada2.getByRole('button', { name: 'Make Offer' }).click();
  await advance(page, 'week');
  await section(page, 'Cast');
  const offers2 = card(page, 'Offers And Contracts');
  await expect(offers2.locator('tr', { hasText: 'Ada Quill' })).toContainText('Declined');
  await expect.poll(async () => (await readSavedState(page)).log.some((e: { text: string }) => e.text === "Ada Quill turned down the role of Juno. They aren't free during your production."), { timeout: 30_000 }).toBe(true);
  // Moved past the first film's work by the player, the same person is free, and accepts at their rate.
  await section(page, 'Schedule');
  await page.getByLabel('Production Start').fill('2026-05-04');
  await page.getByRole('button', { name: 'Build Schedule' }).click();
  await section(page, 'Cast');
  await role(page, 'Juno').getByRole('button', { name: 'Find Performers' }).click();
  await expect(ada2).toContainText('In this story they ask $660 a day.');
  await expect(ada2).not.toContainText('already working on another of your projects');
  await ada2.getByRole('button', { name: 'Make Offer' }).click();
  await advance(page, 'week');
  await section(page, 'Cast');
  await expect(offers2.locator('tr', { hasText: 'Accepted' })).toContainText('Ada Quill');
  await expect(role(page, 'Juno')).toContainText('On Camera: Ada Quill');

  // The first film is made: they work their days, are paid for each once, and are credited in the part by name.
  await openProject(page, 'Night Ferry');
  await produceToDelivery(page, { yourself: ['Marco'] });
  expect(await creditsTable(page)).toContain('Ada Quill');
  await expect.poll(async () => !!(await readSavedState(page)).projects.find((x: { title: string }) => x.title === 'Night Ferry')?.delivered, { timeout: 30_000 }).toBe(true);
  const check = async () => {
    const saved = await readSavedState(page);
    const film = saved.projects.find((x: { title: string }) => x.title === 'Night Ferry');
    const hire = film.hires.find((h: { personId: string; status: string }) => h.personId === 'tp_800001' && h.status === 'accepted');
    expect(hire.daysWorked).toBeGreaterThan(0);
    expect(hire.dayRate).toBe(660);
    const line = film.obligations.find((o: { ref: string }) => o.ref === hire.id);
    expect(line.settled).toBe(hire.dayRate * hire.daysWorked);
    expect(film.credits.find((c: { person: string }) => c.person === 'tp_800001')).toMatchObject({ personName: 'Ada Quill' });
    // What the save keeps of them: the recorded name and dates with the day gathered, and the story's own figures.
    const real = saved.real.tp_800001;
    expect(real.rec).toMatchObject({ name: 'Ada Quill', born: '1980-04-02', from: '2026-11-10' });
    expect(Object.keys(real.rec).sort()).toEqual(['born', 'died', 'ev', 'from', 'name']);
    expect(JSON.stringify(real)).not.toMatch(/Bristol|biography|made-up performer|knownFor/);
    // One person in the save's diary, whichever project booked them.
    expect(Object.keys(saved.real)).toEqual(['tp_800001']);
  };
  await check();
  await openPerson(page, 'Ada Quill');
  const work = story.getByRole('list', { name: 'Their Work In Your Story' });
  await expect(work.locator('li', { hasText: 'Night Ferry' })).toContainText('Credited');
  // Both of the second film's offers are theirs: the one the clash ended, and the contract.
  await expect(work.locator('li', { hasText: 'Harbour Song' })).toHaveText([/The offer came to nothing/, /Working on it/]);
  // Their recorded credits are untouched: the story's film is not among them.
  await expect(card(page, 'Credits In The Catalog')).not.toContainText('Night Ferry');
  expect(await noSidewaysScroll(page)).toBe(true);
  await page.screenshot({ path: `test-results/real-people-${info.project.name}-03-work.png`, fullPage: true });

  // Saved, closed and opened again: the same.
  await saveAndExit(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await check();
  await openPerson(page, 'Ada Quill');
  await expect(work.locator('li', { hasText: 'Night Ferry' })).toContainText('Credited');
  await expect(story.getByRole('list', { name: 'What They Can Be Asked To Do' }).locator('li', { hasText: /^Performer/ })).toContainText('In this story they ask about $660 a day.');
  expect(tmdb.tmdbRequests).toEqual([]);
});

test('J05: a director with no recorded date of birth and a writer are hired for a film by job, do the work, and are paid and credited', async ({ page }, info) => {
  test.setTimeout(900_000);
  const tmdb = await serveCatalog(page);
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  await newProject(page, { title: 'Low Water', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines'], minutes: '3' });
  await saveAndApprove(page);

  // The director: two recorded directing credits and one as a producer, and no date of birth.
  await openPerson(page, 'Ben Rook');
  const story = card(page, 'In Your Story');
  await story.getByRole('button', { name: 'Consider Ben Rook For Your Projects' }).click();
  const jobs = story.getByRole('list', { name: 'What They Can Be Asked To Do' });
  await expect(jobs.locator('li', { hasText: /^Episode Director/ })).toContainText('2 recorded credits in this catalog, 2019 to 2021.');
  await expect(jobs.locator('li', { hasText: /^Line Producer/ })).toContainText('1 recorded credit in this catalog, in 2023.');
  await expect(jobs.locator('li', { hasText: /^Performer/ })).toHaveCount(0); // no acting credit, so no part is offered
  // With no date of birth nothing can be offered until the player says, and saying so is the story's, not a fact.
  await story.getByLabel('Consider Them For').selectOption({ label: 'Director (a job)' });
  await expect(story).toContainText("Ben Rook's date of birth isn't recorded, so the game can't tell whether the rules for children apply. Mark them as an adult in this story on their page, or choose someone else.");
  await story.getByRole('button', { name: 'Consider For This' }).click();
  await expect(story.getByRole('alert')).toContainText("Ben Rook's date of birth isn't recorded");
  await story.getByRole('checkbox', { name: 'Treat As An Adult In This Story' }).check();
  await expect(story).toContainText("Ben Rook's age isn't recorded. You marked them as an adult in this story.");
  await story.getByRole('button', { name: 'Consider For This' }).click();
  await expect(story.getByRole('status')).toContainText("Ben Rook is on Low Water's list for Director.");
  await story.getByLabel('Consider Them For').selectOption({ label: 'Line Producer (a job)' });
  await story.getByRole('button', { name: 'Consider For This' }).click();
  await expect(story.getByRole('status')).toContainText("Ben Rook is on Low Water's list for Line Producer.");
  expect(await noSidewaysScroll(page)).toBe(true);
  await page.screenshot({ path: `test-results/real-people-${info.project.name}-04-director.png`, fullPage: true });

  // The writer: a screenplay and an episode, so the writer's job and the co-writer's.
  await openPerson(page, 'Fen Ward');
  await story.getByRole('button', { name: 'Consider Fen Ward For Your Projects' }).click();
  await story.getByRole('checkbox', { name: 'Treat As An Adult In This Story' }).check();
  await story.getByLabel('Consider Them For').selectOption({ label: 'Writer (a job)' });
  await story.getByRole('button', { name: 'Consider For This' }).click();
  await story.getByRole('button', { name: 'Open Low Water' }).click();

  // The Crew page: a single film has a writer and a director too, hired by job.
  const wd = card(page, 'Writer And Director');
  await expect(wd).toContainText('You write and direct this yourself unless you hire someone to.');
  await wd.getByRole('button', { name: 'Hire A Director' }).click();
  const dDialog = page.getByRole('dialog', { name: 'Hire A Director' });
  const ben = dDialog.locator('li', { hasText: 'Ben Rook' });
  await expect(dDialog.locator('ul.list > li').first()).toContainText('Ben Rook');
  await expect(ben).toContainText('2 recorded credits in the film catalog. Date of birth not recorded.');
  await ben.getByRole('button', { name: 'Make Offer' }).click();
  await wd.getByRole('button', { name: 'Hire A Writer' }).click();
  const wDialog = page.getByRole('dialog', { name: 'Hire A Writer' });
  await wDialog.locator('li', { hasText: 'Fen Ward' }).getByRole('button', { name: 'Make Offer' }).click();
  // The second job for the same person is its own offer, with its own days and pay.
  // This short's script doesn't call for a line producer, so the job is listed apart, as the player's choice.
  await card(page, 'Jobs You Are Considering Someone For').getByRole('button', { name: 'Find Candidates For Line Producer' }).click();
  const pDialog = page.getByRole('dialog', { name: 'Hire A Line Producer' });
  await expect(pDialog.locator('li', { hasText: 'Ben Rook' })).toContainText('1 recorded credit in the film catalog.');
  await pDialog.locator('li', { hasText: 'Ben Rook' }).getByRole('button', { name: 'Make Offer' }).click();
  await advance(page, 'week');
  await section(page, 'Crew');
  const offers = card(page, 'Crew Offers And Contracts');
  await expect(offers.locator('tr', { hasText: 'Ben Rook' })).toHaveText([/Director\s*\$740 a day.*Accepted/s, /Line Producer\s*\$430 a day.*Accepted/s]);
  await expect(offers.locator('tr', { hasText: 'Fen Ward' })).toContainText('Writer');
  await expect(offers.locator('tr', { hasText: 'Fen Ward' })).toContainText('Accepted');
  // Hired isn't assigned: the film is theirs to write and direct once the player says so.
  await wd.getByLabel('Writer', { exact: true }).selectOption({ label: 'Fen Ward' });
  await wd.getByLabel('Director', { exact: true }).selectOption({ label: 'Ben Rook' });

  await produceToDelivery(page);
  const credits = await creditsTable(page);
  expect(credits).toMatch(/Directed By\s+Ben Rook/);
  expect(credits).toMatch(/Written By\s+Fen Ward/);
  await expect.poll(async () => !!(await readSavedState(page)).projects[0]?.delivered, { timeout: 30_000 }).toBe(true);
  const saved = await readSavedState(page);
  const film = saved.projects[0];
  expect(film.episodes[0]).toMatchObject({ writer: 'tp_800006', director: 'tp_800002' });
  // Each job is its own contract, paid for its own days; nobody is paid twice for a day in one job.
  for (const [personId, roleId] of [['tp_800002', 'episode-director'], ['tp_800002', 'line-producer'], ['tp_800006', 'episode-writer']]) {
    const hire = film.hires.find((h: { personId: string; roleId: string; status: string }) => h.personId === personId && h.roleId === roleId && h.status === 'accepted');
    const line = film.obligations.find((o: { ref: string }) => o.ref === hire.id);
    console.log(roleId, hire.daysWorked, line.settled);
    expect(line.settled).toBe(hire.dayRate * hire.daysWorked);
    expect(new Set(line.postings.map((x: { key: string }) => x.key)).size).toBe(line.postings.length);
  }
  // The player is credited for what they did: producing, not the writing or the directing.
  expect(film.credits.filter((c: { person: string }) => c.person === 'player').map((c: { contribution: string }) => c.contribution)).toEqual(['Produced By']);
  // Unknown age stays unknown in the save: the player's mark is the story's, and no date was made up.
  expect(saved.real.tp_800002.rec.born).toBeUndefined();
  expect(saved.real.tp_800002.sim.adult).toBe(true);

  await openPerson(page, 'Ben Rook');
  const work = story.getByRole('list', { name: 'Their Work In Your Story' });
  console.log(await work.innerText());
  expect(tmdb.tmdbRequests).toEqual([]);
});

async function newProject2(page: Page): Promise<void> {
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Song', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Juno');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Quay', chars: ['Juno'], minutes: '3' });
  // Approved by hand: starting backing is a first project's. This one is paid for by a private investor, further down.
  await writePitch(page);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
}
