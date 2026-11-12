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
