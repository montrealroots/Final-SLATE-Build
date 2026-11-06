import { expect, test } from '@playwright/test';
import { advance, nav, quickLife } from './helpers';

// Fills browser storage to its last character with one large "damaged" copy, so the next save cannot fit.
async function fillStorage(page: import('@playwright/test').Page, key: string): Promise<number> {
  return page.evaluate((k) => {
    let lo = 0;
    let hi = 6_000_000;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      try {
        localStorage.setItem(k, 'x'.repeat(mid));
        lo = mid;
      } catch {
        hi = mid - 1;
      }
    }
    localStorage.setItem(k, 'x'.repeat(lo));
    return lo;
  }, key);
}

test('full storage: saving says why, the last save stays, and deleting a recovery copy lets the game save again', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  const saved = await page.evaluate((k) => localStorage.getItem(k), `slate.v1.save.${id}`);
  const filler = `slate.v1.save.${id}.damaged-1700000000000`;
  expect(await fillStorage(page, filler)).toBeGreaterThan(1000);

  await advance(page, 'next-day');
  const alert = page.getByRole('alert').filter({ hasText: "storage for SLATE is full" });
  await expect(alert).toBeVisible({ timeout: 15_000 });
  await expect(alert).toContainText('Your last save is still there.');
  expect(await page.evaluate((k) => localStorage.getItem(k), `slate.v1.save.${id}`)).toBe(saved);

  await alert.getByRole('button', { name: 'Free Up Space' }).click();
  await expect(page.getByRole('heading', { name: 'Saved Games', level: 1 })).toBeVisible();
  const copies = page.getByRole('list', { name: 'Recovery Copies' });
  await expect(copies.getByText(/^Damaged save of /)).toBeVisible();
  const download = page.waitForEvent('download');
  await copies.getByRole('button', { name: /^Export Damaged save of / }).click();
  expect((await download).suggestedFilename()).toMatch(/damaged copy\)\.slate-save\.json$/);
  await copies.getByRole('button', { name: /^Delete Damaged save of / }).click();
  const confirm = page.getByRole('dialog', { name: 'Delete This Copy?' });
  await expect(confirm).toContainText("Your saved game and its backup won't change.");
  await confirm.getByRole('button', { name: 'Delete Copy' }).click();
  await expect(page.getByText('None. Each game also keeps its previous save as a backup')).toBeVisible();

  await alert.getByRole('button', { name: 'Try Again' }).click();
  await expect(alert).toBeHidden();
  await expect(page.locator('.save-state')).toHaveText(/Saved/);
  expect(await page.evaluate((k) => localStorage.getItem(k), `slate.v1.save.${id}`)).not.toBe(saved);
  expect(await page.evaluate((k) => localStorage.getItem(k), `slate.v1.save.${id}.bak`)).toBe(saved);
});

test('a save whose only good copy is a backup taken before an update is still listed and opens', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-03-02');
  await page.getByRole('button', { name: 'Save And Exit' }).click();
  const id = await page.evaluate(() => JSON.parse(localStorage.getItem('slate.v1.index')!)[0].saveId as string);
  await page.evaluate((i) => {
    const main = localStorage.getItem(`slate.v1.save.${i}`)!;
    localStorage.clear();
    localStorage.setItem(`slate.v1.save.${i}.backup-v2`, main);
  }, id);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByText(/^Your latest save couldn't be found, so the copy kept before this save was updated, from .+, was opened\.$/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Home', level: 1 })).toBeVisible();
  await nav(page, 'Saved Games');
  await expect(page.getByRole('list', { name: 'Recovery Copies' }).getByText(/^Copy from before an update of /)).toBeVisible();
});
