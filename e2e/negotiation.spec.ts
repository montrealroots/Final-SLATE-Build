// Stage 5 of the gameplay-depth package (docs/depth), through visible controls only: an investor's offer shows when it
// lapses; asking for better terms holds it while they consider, and their answer, decided by leverage, is shown and
// applied (SLATE-08-03.02, .03). The world seed is fixed (labelled fixture), so the answer is the same every run.
import { expect, test } from './test';
import { addScene, advance, newProject, saveAndApprove, section, seededLife } from './helpers';

test.use({ actionTimeout: 20_000 });

test('an investor offer: when it lapses, asking for better terms, and their answer', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs at desktop and phone width.');
  await seededLife(page, 'gb-london', '2026-01-05', 11);
  await newProject(page, { title: 'Night Ferry', format: 'Short Film', runtime: '10', budget: 'Low Budget' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ines');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Dock', chars: ['Ines'], minutes: '3' });
  await saveAndApprove(page);
  await section(page, 'Budget');
  await page.getByLabel('Change Financing Target').fill('600000');
  await page.getByRole('button', { name: 'Set Target' }).click();
  await page.getByRole('button', { name: 'Approach Private Investor' }).click();
  const backers = page.locator('section.card', { has: page.getByRole('heading', { name: 'Backers' }) });
  const investor = backers.locator('li', { hasText: /^Private Investor/ });
  for (let i = 0; i < 4 && (await investor.getByText('Considering', { exact: true }).count()); i++) {
    await advance(page, 'week');
    await section(page, 'Budget');
  }
  await expect(investor.getByText('Offer Made', { exact: true })).toBeVisible();
  await expect(investor).toContainText(/Open until .+\. After that it lapses, and they aren't asked again for this project\./);
  await investor.getByLabel('Ask The Private Investor For').selectOption({ label: 'Less To Repay First' });
  await expect(investor).toContainText(/They are repaid \$[\d,]+, what they put in, instead of \$[\d,]+\./);
  await investor.getByRole('button', { name: 'Ask For Better Terms' }).click();
  await expect(investor).toContainText(/On .+ you asked for less to repay first\. Their answer is due .+; until then the offer can't be accepted\./);
  await expect(investor.getByRole('button', { name: 'Accept Offer' })).toBeDisabled();
  await advance(page, 'week');
  await section(page, 'Budget');
  // Seed 11: the investor keeps their terms; the offer is open again as it was.
  await expect(investor).toContainText(/On .+ you asked for less to repay first\. They kept their terms; the offer is open as it was\./);
  await expect(investor).toContainText("They are repaid $180,000 from the project's income before the project keeps any.");
  await expect(investor.getByRole('button', { name: 'Accept Offer' })).toBeEnabled();
  await expect(investor.getByRole('button', { name: 'Ask For Better Terms' })).toHaveCount(0);
  // Left unanswered past February 9, it lapses: it can't be accepted, and the investor isn't asked again.
  await advance(page, 'week');
  await advance(page, 'week');
  await section(page, 'Budget');
  await expect(investor.getByText('Lapsed', { exact: true })).toBeVisible();
  await expect(investor).toContainText('The offer lapsed before you answered it.');
  await expect(investor.getByRole('button', { name: 'Accept Offer' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Approach Private Investor' })).toBeDisabled();
});
