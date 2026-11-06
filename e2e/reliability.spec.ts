import { expect, test, type Page } from '@playwright/test';
import { hashString } from '../src/engine/rng';
import { advance, nav, quickLife } from './helpers';

// Reliability across saves, reloads and repeated failures. Desktop and phone.
test.beforeEach(({}, info) => test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.'));

async function stored(page: Page, key: string) {
  return page.evaluate((k) => localStorage.getItem(k), key);
}

/** Copy the current save under a new ID with an edit, keeping its checksum valid. */
async function cloneSave(page: Page, fromId: string, toId: string, edit: (s: Record<string, any>) => void): Promise<void> {
  const env = JSON.parse((await stored(page, `slate.v1.save.${fromId}`))!);
  const state = JSON.parse(env.data);
  state.saveId = toId;
  edit(state);
  state.events.sort((a: { at: number; priority: number; id: string }, b: { at: number; priority: number; id: string }) => a.at - b.at || a.priority - b.priority || a.id.localeCompare(b.id));
  const data = JSON.stringify(state);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [`slate.v1.save.${toId}`, JSON.stringify({ ...env, checksum: hashString(data), data })]);
}

const clockText = async (page: Page) => (await page.getByRole('banner').innerText()).match(/\d{1,2}:\d{2}:\d{2} [AP]M/)?.[0];

test("a processing failure in one save doesn't leave another save's clock stopped", async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const good = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  await cloneSave(page, good, 'broken1', (s) => {
    s.saveName = 'Broken Save';
    s.events.push({ id: 'bad-arrive', at: s.now + 3600_000, kind: 'arrive', priority: 6, attention: 'interrupt', payload: { to: 'gn:404' } });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Saved Games' }).click();
  await page.getByRole('button', { name: 'Continue Broken Save' }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await advance(page, 'next-day');
  await expect(page.getByText(/Time is paused\./).first()).toBeVisible();
  // Switch to the other save from inside the game.
  await nav(page, 'Saved Games');
  await page.getByRole('button', { name: /^Continue (?!Broken)/ }).first().click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await expect(page.getByText(/Time is paused\./)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Advance', exact: true }).first()).toBeEnabled();
  const t1 = await clockText(page);
  await expect.poll(async () => clockText(page), { timeout: 5000 }).not.toBe(t1); // the clock runs
});

test('a recovery message survives slow loading and names the copy that was opened', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await advance(page, 'next-day');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  const bak = JSON.parse(JSON.parse((await stored(page, `slate.v1.save.${id}.bak`))!).data);
  await page.evaluate((k) => localStorage.setItem(k, localStorage.getItem(k)!.slice(0, 200)), `slate.v1.save.${id}`);
  // Holiday rules arrive slowly, so opening waits for them after the save is read.
  await page.route((url) => /\/countries\.json$/.test(url.pathname) && !url.search, async (route) => {
    await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  const notice = page.getByText(/so the previous save, from .+, was opened\. The damaged save is kept, not deleted\./);
  await expect(notice).toBeVisible();
  const when = new Date(bak.updatedAtReal);
  await expect(notice).toContainText(String(when.getFullYear()));
});
