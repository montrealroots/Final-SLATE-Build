// Stage 5 of the gameplay-depth package (docs/depth), through visible controls only: performers invited to read for a
// part, their reads compared side by side, one shortlisted and called back to read with the player, who is cast in the
// other part, and an offer made from the comparison (SLATE-09-02). The world seed is fixed (labelled fixture).
import { expect, test } from './test';
import { addScene, advance, newProject, saveAndApprove, section, seededLife } from './helpers';

test.use({ actionTimeout: 20_000 });

test('auditions: invited, read, compared, shortlisted, called back with a chemistry read, then offered the part', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  for (const n of ['Ines', 'Marco']) { await page.getByLabel('Character Name').fill(n); await page.getByRole('button', { name: 'Add Character' }).click(); }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines', 'Marco'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Cast');
  const role = (name: string) => page.locator('section.card li', { has: page.locator('strong', { hasText: new RegExp(`^${name}$`) }) }).first();
  await role('Marco').getByRole('button', { name: 'Cast Yourself' }).click();
  await role('Ines').getByRole('button', { name: 'Find Performers' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cast Ines' });
  await expect(dialog).toContainText('Invite people to read before you choose');
  const invites = dialog.getByRole('button', { name: /^Invite .+ To Read$/ });
  for (let i = 0; i < 3; i++) await invites.first().click();
  await expect(dialog.getByText('Asked To Read', { exact: true })).toHaveCount(3);
  await dialog.getByRole('button', { name: 'Close' }).first().click();
  const table = page.getByRole('table', { name: 'Auditions For Ines' });
  await expect(table.getByText(/^Reads on /)).toHaveCount(3);
  await advance(page, 'week');
  await section(page, 'Cast');
  // Seed 11: all three read on January 8; each read is a range in words beside the rate and the fit notes.
  await expect(table.getByText(/^Read on January 8, 2026$/)).toHaveCount(3);
  const tariq = table.locator('tr', { hasText: 'Tariq Varga' });
  await expect(tariq).toContainText('Strong to Exceptional');
  await tariq.getByRole('button', { name: 'Shortlist' }).click();
  await expect(table.locator('tbody tr').first()).toContainText('Shortlisted'); // the shortlist comes first
  await tariq.getByLabel('Read Tariq Varga With').selectOption({ label: 'You (cast as Marco)' });
  await tariq.getByRole('button', { name: 'Call Back Tariq Varga' }).click();
  await expect(tariq).toContainText(/Called back for /);
  await advance(page, 'week');
  await section(page, 'Cast');
  await expect(tariq).toContainText('Called back on January 15, 2026');
  await expect(tariq).toContainText('Nothing in particular between them, reading with you.');
  // The offer is made from the comparison, at their asking rate; the part then waits on their answer.
  await tariq.getByRole('button', { name: 'Offer Ines To Tariq Varga' }).click();
  await expect(role('Ines')).toContainText('Offer out to Tariq Varga');
  await expect(table.getByRole('button')).toHaveCount(0);
});
