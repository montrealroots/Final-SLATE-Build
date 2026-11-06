import { expect, test, type Page } from '@playwright/test';
import { hashString } from '../src/engine/rng';
import { advance, nav, quickLife, saveAndExit } from './helpers';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.beforeEach(({}, info) => test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.'));

/** Edit the saved game in place (as the save format stores it, with its checksum), then reopen it. */
async function editSave(page: Page, fn: (state: Record<string, any>) => void): Promise<void> {
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  fn(state);
  // The engine keeps its queue in time order (then priority, then id); keep seeded events in it the same way.
  state.events.sort((a: { at: number; priority: number; id: string }, b: { at: number; priority: number; id: string }) => a.at - b.at || a.priority - b.priority || a.id.localeCompare(b.id));
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
}

test('a screening invitation: accept, travel to the venue, the 30-minute reminder, attendance', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-08-03');
  let at = 0;
  await editSave(page, (s) => {
    // Your film was selected for Venice; its first screening is two days into the festival.
    const ed = s.editions.find((e: { id: string }) => e.id === 'venice-2026');
    at = ed.start + 2 * 86_400_000;
    ed.screenings = [{ projectId: 'none', at, done: false, rsvpBy: at - 86_400_000, rsvp: 'pending' }];
    s.events.push(
      { id: 'scr-r', at: at - 30 * 60_000, kind: 'screening-reminder', priority: 30, attention: 'interrupt', payload: { editionId: ed.id, projectId: 'none', at } },
      { id: 'scr-s', at, kind: 'screening', priority: 31, attention: 'notify', payload: { editionId: ed.id, projectId: 'none', at } },
    );
  });
  await nav(page, 'Calendar');
  await page.getByRole('button', { name: /Venice/ }).first().click();
  const panel = page.getByRole('region', { name: 'Screenings' });
  await expect(panel.getByText(/^Reply by/)).toBeVisible();
  await panel.getByRole('button', { name: 'Accept Invitation' }).click();
  await expect(panel.getByText(/You're attending\. The trip takes about \d+ hours\./)).toBeVisible();
  await panel.getByRole('button', { name: 'Travel to the Venue' }).click();
  // Travel, then let time run until the screening has happened.
  for (let i = 0; i < 40 && !(await panel.getByText('You attended.').isVisible()); i++) await advance(page, 'next-event');
  await expect(panel.getByText('You attended.')).toBeVisible();
  await nav(page, 'Home');
  await expect(page.getByText('Your screening starts in 30 minutes.').first()).toBeVisible();
  await expect(page.getByText(/screened at the .*You were there/).first()).toBeVisible();
});

test("declining keeps the selection; a trip that can't arrive in time isn't offered", async ({ page }) => {
  await quickLife(page, 'au-sydney', '2026-08-03');
  await editSave(page, (s) => {
    const ed = s.editions.find((e: { id: string }) => e.id === 'venice-2026');
    const at = s.now + 10 * 3600_000; // ten hours away; Sydney to Venice takes longer
    ed.screenings = [{ projectId: 'none', at, done: false, rsvpBy: at, rsvp: 'pending' }];
  });
  await nav(page, 'Calendar');
  await page.getByRole('button', { name: /Venice/ }).first().click();
  const panel = page.getByRole('region', { name: 'Screenings' });
  await expect(panel.getByText(/You couldn't arrive in time from where you are: the trip takes about \d+ hours\./)).toBeVisible();
  await expect(panel.getByRole('button', { name: 'Accept Invitation' })).toHaveCount(0);
  await panel.getByRole('button', { name: 'Decline Invitation' }).click();
  await expect(panel.getByText('You declined. It still screens.')).toBeVisible();
});
