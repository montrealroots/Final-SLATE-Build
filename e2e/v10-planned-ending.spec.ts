// J10, the planned ending set against renewal (docs/v6/JOURNEYS.md: "a planned ending set against renewal"; from
// November 17, 2026). A two-episode series is planned as its last season, the plan dropped and made again through the
// overview, and then, once delivered, the season ends as planned: nobody decides on another, and the next season can't
// be started. Labelled fixture: the delivery, the commissioner's agreement and the decision it asks for are written into
// the save as the game writes them (e2e/renewal.spec.ts makes and delivers a season by play). Desktop, in Chromium.
import { expect, test } from './test';
import { advance, editSave, nav, newProject, onlyOn, quickLife, section } from './helpers';

const DAY = 86_400_000;

test('J10: a season planned as the last ends as planned, and the next season is refused', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop']), 'One run, at desktop width.');
  test.setTimeout(240_000);
  await quickLife(page, 'gb-london', '2026-02-02');
  await newProject(page, { title: 'Harbour Lights', format: 'Limited Series', episodes: '2', runtime: '10' });
  await section(page, 'Overview');
  const last = page.locator('section.card', { has: page.getByRole('heading', { name: 'The Last Season?' }) });
  const plan = last.getByLabel('Plan This Season As The Last');
  await expect(last).toContainText('a commissioner who paid for this season decides on another');

  // Planned, dropped, planned again: the page says what each means.
  await plan.check();
  await expect(last).toContainText('Harbour Lights ends with this season. Nobody will decide on another, and none can be made.');
  await plan.uncheck();
  await expect(last).not.toContainText('ends with this season');
  await plan.check();
  await expect(plan).toBeChecked();

  // Labelled fixture: delivered, a commissioner paid for it, and their decision is due tomorrow.
  await nav(page, 'Home');
  await editSave(page, (state) => {
    const p = state.projects.find((x: { title: string }) => x.title === 'Harbour Lights');
    p.delivered = { at: state.now, runtimeMin: 20 };
    (p.finance ??= { estimate: 60_000, target: 60_000, deals: [] }).deals.push({ id: 'fd-fixture', kind: 'commissioner', backer: 'Northgate Broadcasting', amount: 60_000, status: 'accepted', askedAt: state.now, reason: '', received: 60_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null } });
    state.events.push({ id: 'e-fixture-decision', at: state.now + DAY, kind: 'season-decision', priority: 45, attention: 'notify', payload: { projectId: p.id } });
    state.events.sort((a: { at: number }, b: { at: number }) => a.at - b.at);
  });
  await advance(page, 'next-day');
  await advance(page, 'next-day');
  await nav(page, 'Projects');
  await page.getByRole('button', { name: /Harbour Lights/ }).first().click();
  await section(page, 'Overview');
  const season = page.locator('section.card', { has: page.getByRole('heading', { name: 'Another Season' }) });
  await expect(season).toContainText('Harbour Lights ended as you planned: this season was its last.');
  await expect(season).toContainText('You planned this season as the last.');
  await expect(season.getByRole('button', { name: 'Start The Next Season' })).toBeDisabled();
  // Decided: the plan can't be changed any more, so its card is gone.
  await expect(last).toHaveCount(0);
});

// J10's territory step: one series sold apart in two territories reads apart, each deal with its own territory and its
// own weeks (from November 17, 2026). Labelled fixture: the season delivered, and two accepted releases with a week each
// reported, as distribution.ts and audiences.ts write them. Desktop, in Chromium.
test('J10: one series sold in two territories reports territory by territory', async ({ page }, info) => {
  test.skip(!onlyOn(info, ['desktop']), 'One run, at desktop width.');
  test.setTimeout(240_000);
  await quickLife(page, 'gb-london', '2026-02-02');
  await newProject(page, { title: 'Harbour Lights', format: 'Limited Series', episodes: '2', runtime: '10' });
  await nav(page, 'Home');
  await editSave(page, (state) => {
    const p = state.projects.find((x: { title: string }) => x.title === 'Harbour Lights');
    p.delivered = { at: state.now, runtimeMin: 20 };
    const day = (d: number) => new Date(state.now - d * DAY).toISOString().slice(0, 10);
    const week = (metric: string, value: number) => ({ week: 1, from: day(8), to: day(2), metric, value, scope: metric === 'viewers' ? 'episode' : 'title', ...(metric === 'viewers' ? { episode: 1 } : {}), territories: 1 });
    p.offers = [
      { id: 'of-gb', distributor: 'Northgate Broadcasting (Fixture)', route: 'broadcast', minimumGuarantee: 40_000, territories: ['GB'], releaseWindowDays: 20, expiresAt: state.now, status: 'accepted', audience: [week('viewers', 180_000)] },
      { id: 'of-us', distributor: 'Peacock', route: 'streaming', minimumGuarantee: 90_000, territories: ['US'], releaseWindowDays: 20, expiresAt: state.now, status: 'accepted', audience: [week('hours', 2_400_000)] },
    ];
  });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: /Harbour Lights/ }).first().click();
  await section(page, 'Release');
  const earnings = page.locator('section.card', { has: page.getByRole('heading', { name: 'Earnings' }) });
  const gb = earnings.locator('li', { hasText: 'Northgate Broadcasting (Fixture)' }).first();
  const us = earnings.locator('li', { hasText: 'Peacock' }).first();
  await expect(gb).toContainText('Broadcast · United Kingdom');
  await expect(us).toContainText('Streaming · United States');
  await gb.getByText(/^Weekly Audience/).click();
  await us.getByText(/^Weekly Audience/).click();
  await expect(gb.getByRole('table', { name: 'Weekly Audience, Northgate Broadcasting (Fixture)' })).toContainText('180,000');
  await expect(us.getByRole('table', { name: 'Weekly Audience, Peacock' })).toContainText('2,400,000');
  await expect(gb).not.toContainText('2,400,000');
});
