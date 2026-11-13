// Guide Me through the interface (the v4 package, 01; ledger V4-006): the plan read before anything is sent, a ceiling
// approved, offers that take days to be answered, each marked Guide Me on the ledger, the department staffed within the
// ceiling, and Back To Manual leaving what was sent as it is. The rules are the engine's (tests/guide-me.test.ts).
import { expect, test } from './test';
import { addScene, advance, nav, newProject, quickLife, readSavedState, saveAndApprove, section } from './helpers';

test('a department staffed by Guide Me within a ceiling, by offers that take days, and another taken back to manual', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '4' });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Mara'], minutes: '4' });
  await saveAndApprove(page);
  await section(page, 'Crew');

  // The plan, read first: who, at what rate, for how long, what it costs, and the ceiling.
  const post = page.locator('section.card', { has: page.getByRole('heading', { name: 'Post Production', level: 2 }) });
  await post.getByRole('button', { name: 'Guide Me' }).click();
  const dialog = page.getByRole('dialog', { name: 'Guide Me For Post Production' });
  await expect(dialog.getByRole('list', { name: 'The Plan' }).getByRole('listitem').first()).toContainText(/a day for \d+ days/);
  await expect(dialog).toContainText('The Plan Costs:');
  // A ceiling above the money there is cannot be approved, and says why.
  await dialog.getByLabel('Spending Ceiling').fill('99999999');
  await expect(dialog).toContainText(/is more than the \$[\d,]+ uncommitted/);
  await expect(dialog.getByRole('button', { name: 'Approve Guide Me' })).toBeDisabled();
  const planCost = Number((await dialog.getByText('The Plan Costs:').locator('..').innerText()).match(/The Plan Costs: \$([\d,]+)/)![1].replace(/,/g, ''));
  await dialog.getByLabel('Spending Ceiling').fill(String(planCost));
  await dialog.getByRole('button', { name: 'Approve Guide Me' }).click();

  // Offers out, nothing hired yet; the money is held on the ledger under lines that say Guide Me.
  const box = page.getByRole('region', { name: 'Guide Me, Post Production' });
  await expect(box).toContainText(/Guide Me is staffing this department: \$[\d,]+ of the \$[\d,]+ ceiling committed, \d+ offers? out\./);
  await expect.poll(async () => {
    const p = (await readSavedState(page))?.projects?.[0];
    return p ? p.obligations.filter((o: { label: string }) => o.label.endsWith('(Guide Me)')).length : 0;
  }).toBeGreaterThan(0);
  // Another department is handed over and taken straight back: what it sent stays.
  const camera = page.locator('section.card', { has: page.getByRole('heading', { name: 'Camera', level: 2 }) });
  await camera.getByRole('button', { name: 'Guide Me' }).click();
  await page.getByRole('dialog', { name: 'Guide Me For Camera' }).getByRole('button', { name: 'Approve Guide Me' }).click();
  await page.getByRole('region', { name: 'Guide Me, Camera' }).getByRole('button', { name: 'Back To Manual' }).click();
  await expect(page.getByRole('region', { name: 'Guide Me, Camera' })).toContainText('Guide Me stopped');

  // Answers take days. Guide Me follows up within the ceiling until the department is staffed.
  for (let i = 0; i < 12 && !(await box.innerText()).startsWith('Guide Me staffed'); i++) { await advance(page, 'next-day'); await section(page, 'Crew'); }
  await expect(box).toContainText(/^Guide Me staffed Post Production: \$[\d,]+ of the \$[\d,]+ ceiling committed\./);
  const saved = (await readSavedState(page)).projects[0];
  const m = saved.mandates.find((x: { dept: string }) => x.dept === 'Post Production');
  const committed = saved.hires.filter((h: { guided?: string; status: string }) => h.guided === m.id && ['offered', 'accepted', 'countered'].includes(h.status))
    .reduce((a: number, h: { obligationId: string }) => a + saved.obligations.find((o: { id: string }) => o.id === h.obligationId).amount, 0);
  expect(committed).toBeLessThanOrEqual(m.ceiling);
  expect(m.ended).toBe('done');
});

test('casting and music by Guide Me: the cast plan read and approved, offers out to those named; the music brief and its staff in one approval', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Low Tide', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  for (const name of ['Mara', 'Ben']) { await page.getByLabel('Character Name').fill(name); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara', 'Ben'], minutes: '4' });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Mara'], minutes: '4' });
  await saveAndApprove(page);

  // Casting: who for each part, read first; approved, those named are offered and nobody else.
  await section(page, 'Cast');
  const roles = page.locator('section.card', { hasText: 'Roles' }).first();
  await roles.getByRole('button', { name: 'Guide Me' }).click();
  const dialog = page.getByRole('dialog', { name: 'Guide Me For Cast' });
  const plan = dialog.getByRole('list', { name: 'The Plan' }).getByRole('listitem');
  await expect(plan).toHaveCount(2);
  await expect(dialog).toContainText('anyone who says no is not replaced, and the part comes back to you');
  const named = (await plan.allInnerTexts()).map((t) => t.match(/^(Mara|Ben): (.+?), \$/)!.slice(1, 3));
  await dialog.getByRole('button', { name: 'Approve Guide Me' }).click();
  await expect(page.getByRole('region', { name: 'Guide Me, Cast' })).toContainText(/Guide Me is casting: \$[\d,]+ of the \$[\d,]+ ceiling committed, 2 offers out\./);
  for (const [, who] of named) await expect(roles).toContainText(`On Camera: Offer out to ${who}`);
  expect(named.map((x) => x[0]).sort()).toEqual(['Ben', 'Mara']);

  // Music: the proposed brief and its cue plan, and a composer within a ceiling, in one approval.
  await section(page, 'Music');
  const card = page.locator('section.card', { has: page.getByRole('heading', { name: 'Guide Me For Music' }) });
  await card.getByRole('button', { name: 'Guide Me' }).click();
  await expect(card).toContainText('The Brief: A Score');
  await expect(card.getByRole('list', { name: 'Who Guide Me Would Offer' })).toContainText('Composer');
  await card.getByRole('checkbox', { name: "Let The Composer's Themes Stand Without My Review" }).check();
  await card.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('list', { name: 'Cues' }).getByRole('listitem').first()).toBeVisible();
  await expect(page.getByRole('region', { name: 'Guide Me, Music' })).toContainText(/Guide Me is staffing this department: \$[\d,]+ of the \$[\d,]+ ceiling committed/);
  await expect.poll(async () => {
    const p = (await readSavedState(page))?.projects?.[0];
    return p ? [p.music?.brief?.delegateReview, p.hires.some((h: { roleId: string; guided?: string }) => h.roleId === 'composer' && !!h.guided)] : null;
  }).toEqual([true, true]);
});

// Guide Me for writing (from November 13, 2026, the owner's v5 brief, 1): the plan read first, approved within a
// ceiling, the writers hired, their passes worked day by day, reviewed against the standard and accepted, on screen.
test('writing by Guide Me: a co-writer\'s rewrite and a script editor\'s polish, commissioned, worked, reviewed and accepted', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-02-02');
  await nav(page, 'Projects');
  await newProject(page, { title: 'Harbour Lights', format: 'Short Film', runtime: '12', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Pier', chars: ['Mara'], minutes: '4' });
  await addScene(page, { index: 1, place: 'Kitchen', chars: ['Mara'], minutes: '4' });
  await saveAndApprove(page);
  await section(page, 'Crew');
  await page.getByRole('button', { name: 'Guide Me For Writing' }).click();
  const dialog = page.getByRole('dialog', { name: 'Guide Me For Writing' });
  const plan = dialog.getByRole('list', { name: 'The Plan' });
  await expect(plan.getByRole('listitem')).toHaveCount(2);
  await expect(plan.getByRole('listitem').nth(0)).toContainText('Co-Writer: A Rewrite');
  await expect(plan.getByRole('listitem').nth(1)).toContainText('Script Editor: A Polish');
  await expect(dialog).toContainText('accepts a delivered pass that reads 55 or more');
  const cost = Number((await dialog.getByText('The Plan Costs:').locator('..').innerText()).match(/The Plan Costs: \$([\d,]+)/)![1].replace(/,/g, ''));
  await dialog.getByLabel('Spending Ceiling').fill(String(cost * 2));
  await dialog.getByRole('button', { name: 'Approve Guide Me' }).click();
  const box = page.getByRole('region', { name: 'Guide Me, Writing' });
  await expect(box).toContainText(/^Guide Me is writing: \$[\d,]+ of the \$[\d,]+ ceiling committed, 2 offers out\./);
  // Days pass: offers answered, the rewrite worked and reviewed, then the polish; each day of it paid.
  for (let i = 0; i < 40 && !/^Guide Me finished the writing/.test(await box.innerText()); i++) { await advance(page, 'next-day'); await section(page, 'Crew'); }
  await expect(box).toContainText(/^Guide Me finished the writing it was given: \$[\d,]+ of the \$[\d,]+ ceiling committed\./);
  // The save is written a moment after the screen updates: read it once it holds the finished writing (no pass still being
  // worked or waiting for an answer). Read at once, the production build's save could still be a day behind.
  type Job = { scope: string; status: string; passes: { read?: number; done: number }[] };
  const settled = (js: Job[] | undefined) => !!js?.length && js.every((j) => j.status !== 'offered' && j.status !== 'working' && j.status !== 'delivered');
  await expect.poll(async () => settled((await readSavedState(page))?.projects?.[0]?.writing), { timeout: 30_000 }).toBe(true);
  const jobs = (await readSavedState(page)).projects[0].writing as Job[];
  // Either both passes were accepted at the standard, or the rewrite came back to the player and the polish with it.
  const rewrite = jobs.find((j) => j.scope === 'rewrite')!;
  if (rewrite.status === 'accepted') expect(jobs.map((j) => j.scope).sort()).toEqual(['polish', 'rewrite']);
  else await expect(box).toContainText('Script Editor: the polish waits on the rewrite that came back to you.');
  for (const j of jobs.filter((x) => x.status === 'accepted')) expect(j.passes.at(-1)!.read!).toBeGreaterThanOrEqual(55);
  for (const j of jobs) expect(j.passes.reduce((a, x) => a + x.done, 0)).toBeGreaterThan(0);
});
