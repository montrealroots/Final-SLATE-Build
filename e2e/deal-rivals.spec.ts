// Two studios bidding at once (from November 18, 2026; first-look.ts offerFirstLook, askToMatch), through the screens: both
// offers on the Profile, one studio asked to match the other's higher figure, its answer a week later, and signing it
// turning the other down. Labelled fixture: the two offers are written into the save, as a record past its start draws
// them (a career that gets there takes years to play); the bidding itself is the engine's (tests/first-look.test.ts).
import { expect, test, type Page } from './test';
import { advance, editSave, nav, quickLife } from './helpers';

const CLOSE = 'Long Light Pictures (Fixture)';
const RIVAL = 'Meridian (Fixture)';
const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });

test('two studios bid at once: one asked to match the other, it matches, signing it turns the other down', async ({ page }, info) => {
  test.skip(!['desktop', 'phone'].includes(info.project.name), 'Desktop and phone.');
  test.setTimeout(300_000);
  await quickLife(page, 'us-los-angeles', '2026-11-12');
  await editSave(page, (s) => {
    const terms = (annual: number) => ({ months: 24, considerDays: 90, overhead: 0, fund: 100_000, animatedOnly: false, tier: 'proven', overall: { annual } });
    const offer = (id: string, company: string, name: string, annual: number, other: string) => ({
      id, company, name, status: 'offered', offeredAt: s.now, answerBy: s.now + 30 * 86_400_000, terms: terms(annual),
      why: `${name} wants your films.`, submissions: [], drawn: [], competing: other,
    });
    // Eleven films a year and twelve (deal-model.json, proven overall deals): $1,548,000 and $1,728,000 a year.
    s.firstLooks = [offer('fl-close', 'company:fixture-drama', CLOSE, 1_548_000, 'fl-rival'), offer('fl-rival', 'company:fixture-broad', RIVAL, 1_728_000, 'fl-close')];
  });
  await nav(page, 'Profile');
  const deal = card(page, 'Overall Deal');
  await expect(deal).toContainText('Two studios want your work.');
  const close = deal.getByRole('region', { name: `Overall Deal Offer From ${CLOSE}` });
  const rival = deal.getByRole('region', { name: `Overall Deal Offer From ${RIVAL}` });
  await expect(close).toContainText('$1,548,000 a year');
  await expect(rival).toContainText('$1,728,000 a year');
  // The higher offer can't be asked to match the lower, and says why.
  await expect(rival.getByRole('button', { name: `Ask ${RIVAL} To Match ${CLOSE}` })).toBeDisabled();
  await expect(rival).toContainText(`${RIVAL} already offers as much as ${CLOSE}.`);
  // The closer fit is told of the rival's offer: it answers in a week, and can't be signed meanwhile.
  await close.getByRole('button', { name: `Ask ${CLOSE} To Match ${RIVAL}` }).click();
  await expect(close).toContainText('You asked it to match. It answers by');
  await expect(close.getByRole('button', { name: `Accept The Overall Deal From ${CLOSE}` })).toBeDisabled();
  await advance(page, 'week');
  await advance(page, 'next-day');
  await nav(page, 'Profile');
  await expect(close).toContainText('It matched $1,728,000 a year.');
  // Signed: the deal runs at the matched figure, and the rival's offer is turned down.
  await close.getByRole('button', { name: `Accept The Overall Deal From ${CLOSE}` }).click();
  const running = deal.getByRole('region', { name: 'Your Overall Deal' });
  await expect(running).toContainText(`${CLOSE}: $1,728,000 a year for your services`);
  await expect(deal.getByRole('list', { name: 'Earlier Deals' })).toContainText(`${RIVAL}, overall deal: declined`);
});
