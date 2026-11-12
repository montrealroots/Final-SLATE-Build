// The casting director's mandate through the screens (the v3 package, 02; requirement V3-L01): hired, asked to run a
// search for a part with its cost said first, the search reported, its advice taken, and the part still offered by the
// player and nobody else.
import { expect, test } from './test';
import { audit } from './ui-audit';
import { addScene, advance, nav, newProject, quickLife, readSavedState, saveAndApprove, section } from './helpers';

test('a casting director runs a search for a part: asked with its cost, reported, advice taken, and the offer still the player\'s', async ({ page }, info) => {
  test.skip(!['desktop', 'phone', 'iphone-15-pro-max'].includes(info.project.name), 'Runs on desktop, phone and WebKit (iPhone 15 Pro Max).');
  test.setTimeout(420_000);
  const phone = info.project.name !== 'desktop';
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Projects');
  await newProject(page, { title: 'The Search', format: 'Short Film', runtime: '8', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ada');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Kitchen', chars: ['Ada'], minutes: '3' });
  await addScene(page, { index: 1, place: 'Harbour', chars: ['Ada'], minutes: '3' });
  await saveAndApprove(page);

  // With no casting director, the part has only the player's own ways of casting it.
  await section(page, 'Cast');
  await expect(page.getByRole('group', { name: 'Casting Search For Ada' })).toHaveCount(0);
  // Hire one through the Crew page's own offers: the next candidate is asked until one accepts.
  const hired = async () => ((await readSavedState(page))?.projects?.[0]?.hires ?? []).some((h: { roleId: string; status: string }) => h.roleId === 'casting-director' && h.status === 'accepted');
  for (let i = 0; i < 6 && !(await hired()); i++) {
    await section(page, 'Crew');
    const counter = page.getByRole('button', { name: 'Accept Counteroffer' });
    if (await counter.count()) { await counter.first().click(); continue; }
    const row = page.getByRole('listitem').filter({ has: page.getByText('Casting Director', { exact: true }) });
    await expect(row).toContainText('Optional');
    if ((await row.getByText('Not Hired').count()) > 0) {
      await row.getByRole('button', { name: 'Find Candidates' }).click();
      const dialog = page.getByRole('dialog', { name: 'Hire A Casting Director' });
      await dialog.getByRole('button', { name: 'Make Offer' }).nth(i % 3).click();
      if (await dialog.isVisible()) await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    }
    await advance(page, 'next-day');
  }
  await expect.poll(hired, { timeout: 30_000 }).toBe(true);

  // Asked: the line says who, how many, when and what it costs before the button.
  await section(page, 'Cast');
  const search = page.getByRole('group', { name: 'Casting Search For Ada' });
  await expect(search).toContainText(/, your casting director, can run the search: they would bring up to \d performers to read on .+, for \$[\d,]+ \(two of their days\)\. Who is shortlisted, called back and offered the part stays yours\./);
  if (phone) expect((await audit(page)).defects, 'the cast page with a search on offer, on a phone').toEqual([]);
  // Their line of the budget holds one search from the day they were hired, with nothing paid on it yet.
  const line = async () => { const pr = (await readSavedState(page)).projects[0]; const h = pr.hires.find((x: { roleId: string; status: string }) => x.roleId === 'casting-director' && x.status === 'accepted'); const o = pr.obligations.find((x: { id: string }) => x.id === h.obligationId); return { amount: o.amount, settled: o.settled, rate: h.dayRate, days: h.daysWorked }; };
  const held = await line();
  expect(held).toMatchObject({ amount: held.rate * 2, settled: 0, days: 0 });
  await search.getByRole('button', { name: /^Ask .+ To Run A Search For Ada$/ }).click();
  await expect(search).toContainText(/ ran a search on .+ for \$[\d,]+: \d asked, 0 read, .*still to read\./);
  await expect(search).toContainText('Their advice comes once everyone has read.');
  await expect(page.getByRole('table', { name: 'Auditions For Ada' })).toBeVisible();
  // A second search waits for the first.
  await expect(search.getByRole('button', { name: /To Run A Search For Ada$/ })).toHaveCount(0);
  await expect(search).toContainText("A search for Ada is under way: its readings haven't all happened yet.");
  await expect.poll(line).toMatchObject({ amount: held.rate * 2, settled: held.rate * 2, days: 2 });

  // The readings happen; the search reports, and advises.
  await advance(page, 'week');
  await section(page, 'Cast');
  await expect(search).toContainText(/: \d asked, [1-9] read/);
  await expect(search).toContainText(/ advises seeing again: .+\. It is advice from the same readings you see below\./);
  const before = (await readSavedState(page)).projects[0];
  expect((before.auditions ?? []).some((a: { shortlisted?: boolean }) => a.shortlisted)).toBe(false);
  if (phone) expect((await audit(page)).defects, 'a reported search, on a phone').toEqual([]);
  await search.getByRole('button', { name: /^Shortlist .+'s Advice For Ada$/ }).click();
  await expect(search).toContainText('All of them are on your shortlist.');
  await expect(page.getByRole('table', { name: 'Auditions For Ada' }).getByText('Shortlisted').first()).toBeVisible();
  // Nobody has been offered the part: that is still the player's to do, from the same table.
  await expect.poll(async () => (await readSavedState(page)).projects[0].hires.filter((h: { kind: string }) => h.kind === 'cast').length).toBe(0);
  await expect(page.getByRole('table', { name: 'Auditions For Ada' }).getByRole('button', { name: /^Offer Ada To / }).first()).toBeVisible();
});
