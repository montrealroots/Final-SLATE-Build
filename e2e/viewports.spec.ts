import { expect, test, type Page } from './test';
import { advance, nav, openStart, pressSaveAndExit, section, secureStartingBacking } from './helpers';

// The package's required widths (360, 390, 393, 414, 430, 768, 1024, 1440, 1920), plus 440, 1280 and a phone landscape.
const VIEWPORTS: [number, number][] = [[360, 800], [390, 844], [393, 852], [414, 896], [430, 932], [440, 956], [768, 1024], [1024, 768], [1280, 720], [1440, 900], [1920, 1080], [844, 390]];

async function seedGame(page: Page): Promise<void> {
  // No film catalog: a machine with the owner's catalog installed (the dev server serves it) would add the industry's
  // releases to the calendar, and the layouts checked here must be the same on every machine.
  // Answered as the server answers when none is installed (server/catalog-handler.mjs).
  await page.route('**/screen-catalog/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ installed: false, reason: 'missing' }) }));
  await openStart(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
      step: 7, name: 'Wilhelmina Oyelaran-Castellanos Bjørnstad', pronouns: 'they', actingTitle: 'Actor', birthDate: '1988-02-29', birthplaceId: 'no-tromso',
      heritages: [{ id: 'Yoruba', label: 'Yoruba', custom: false }, { id: 'Sámi', label: 'Sámi', custom: false }, { id: 'c1', label: 'Norwegian-Nigerian from Tromsø', custom: true }],
      heritageCustomText: '', mainLanguage: 'no', languages: [{ code: 'en', proficiency: 'Fluent' }, { code: 'yo', proficiency: 'Conversational' }, { code: 'se', proficiency: 'Basic' }],
      startPlaceId: 'no-tromso', startDate: '2026-12-15', startTime: '11:30', updatedAt: 1,
    }));
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

async function checkLayout(page: Page, label: string): Promise<string[]> {
  return page.evaluate((where) => {
    const problems: string[] = [];
    const vw = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth > vw + 1) problems.push(`${where}: page scrolls sideways (${document.documentElement.scrollWidth} > ${vw})`);
    for (const el of document.querySelectorAll<HTMLElement>('button, a, input, select, textarea, h1, h2, p, label')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      // A closed drawer is hidden off the edge, and the tab bar scrolls sideways with a fade, both as in 1221.
      if (getComputedStyle(el).visibility === 'hidden' || el.closest('#rail[data-open="false"]')) continue;
      if (el.closest('.table-wrap, .picklist, .cal-grid, .modal-body, .tabs')) continue;
      if (r.right > vw + 1 || r.left < -1) problems.push(`${where}: ${el.tagName.toLowerCase()} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}" is outside the viewport`);
    }
    return problems.slice(0, 5);
  }, label);
}

test('every main screen fits each viewport without sideways scrolling', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Viewports are set explicitly in this test.');
  await seedGame(page);
  // A project with long names, several genres and an approved draft.
  await page.getByRole('button', { name: 'New Project' }).first().click();
  await page.getByRole('button', { name: 'Write An Original' }).click();
  await page.getByLabel('Working Title').fill('The Extraordinarily Long Working Title Of A Midwinter Polar-Night Anthology');
  await page.getByLabel('Format').selectOption({ label: 'Anthology Series' });
  await page.getByLabel('Episodes').fill('2');
  for (const g of ['Anthology', 'Folk Horror', 'Magical Realism', 'Coming Of Age', 'Nordic Noir']) {
    await page.getByRole('searchbox', { name: 'Search Genres' }).fill(g);
    await page.getByRole('button', { name: `Add ${g}`, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Create Project' }).click();
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Ingrid Akinyemi-Rasmussen The Lighthouse Keeper');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Add Scene To Episode 1' }).click();
  const card = page.locator('article.scene-card').first();
  await card.getByRole('button', { name: 'Edit Scene' }).click();
  await card.getByLabel('Place', { exact: true }).fill('Lighthouse Lantern Room Above The Frozen Fjord');
  await card.getByRole('checkbox', { name: 'Ingrid Akinyemi-Rasmussen The Lighthouse Keeper' }).check();
  await page.getByRole('button', { name: 'Add Scene To Episode 2' }).click();
  const card2 = page.locator('article.scene-card').nth(1);
  await card2.getByRole('button', { name: 'Edit Scene' }).click();
  await card2.getByLabel('Place', { exact: true }).fill('Harbor');
  await card2.getByRole('checkbox', { name: 'Ingrid Akinyemi-Rasmussen The Lighthouse Keeper' }).check();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await secureStartingBacking(page);
  await advance(page, 'next-day');

  const problems: string[] = [];
  const screens: [string, () => Promise<void>][] = [
    ['Home', () => nav(page, 'Home')],
    ['Calendar', async () => { await nav(page, 'Calendar'); await expect(page.getByRole('button', { name: /December 25, 2026, 1 entry/ })).toBeVisible(); }],
    ['Profile', () => nav(page, 'Profile')],
    ['Projects', () => nav(page, 'Projects')],
    ['Place', async () => { await nav(page, 'Home'); await page.getByRole('button', { name: 'Weather And Place Details' }).click(); }],
    ['World', async () => { await nav(page, 'World'); await expect(page.getByRole('group', { name: /Map of/ })).toBeVisible(); }],
    ['Saved Games', () => nav(page, 'Saved Games')],
    ['Settings', () => nav(page, 'Settings')],
  ];
  const tabs = ['Overview', 'Script', 'Characters', 'Cast', 'Crew', 'Schedule', 'Budget', 'Production', 'Music', 'Edit', 'Release', 'Festivals And Awards'];
  for (const [w, h] of VIEWPORTS) {
    await page.setViewportSize({ width: w, height: h });
    for (const [name, go] of screens) {
      await go();
      problems.push(...(await checkLayout(page, `${w}x${h} ${name}`)));
      if (w === 390 || w === 1280) await page.screenshot({ path: `test-results/vp-${w}x${h}-${name}.png`, fullPage: true });
    }
    await nav(page, 'Projects');
    await page.getByRole('button', { name: /The Extraordinarily Long/ }).click();
    for (const t of tabs) {
      await section(page, t);
      problems.push(...(await checkLayout(page, `${w}x${h} Project ${t}`)));
      if ((w === 390 || w === 844) && ['Script', 'Crew', 'Budget'].includes(t)) await page.screenshot({ path: `test-results/vp-${w}x${h}-project-${t}.png`, fullPage: true });
    }
    // Dialogs keep their actions on screen.
    await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
    const footer = page.getByRole('dialog', { name: 'Advance' }).getByRole('button', { name: 'Cancel' });
    await expect(footer).toBeInViewport();
    await footer.click();
  }
  expect(problems).toEqual([]);
});

test('keyboard: skip link, focus order, Escape closes dialogs and returns focus', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Desktop keyboard check.');
  await seedGame(page);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip To Content' })).toBeFocused();
  await page.keyboard.press('Enter');
  const advanceBtn = page.getByRole('button', { name: 'Advance', exact: true }).first();
  await advanceBtn.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Advance' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Advance' }).getByLabel('Advance To')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Advance' })).toBeHidden();
  await expect(advanceBtn).toBeFocused();
  // Light theme and larger text both work.
  await nav(page, 'Settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Larger Text' }).check();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  await page.screenshot({ path: 'test-results/light-large-text.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('no tutorial, no excluded systems, no raw IDs or source text on screen', async ({ page }) => {
  await seedGame(page);
  const text = (await page.locator('body').innerText()).toLowerCase();
  for (const banned of ['tutorial', 'tax', 'rent', 'bank', 'visa', 'https://', 'np_', 'pr1', 'undefined', 'nan']) expect(text, banned).not.toContain(banned);
  // Polar night is reported truthfully in Tromsø in mid-December.
  await expect(page.getByText("the sun won't rise today")).toBeVisible();
});

async function clockSeconds(page: Page): Promise<number> {
  const t = (await page.locator('.clockface').innerText()).trim(); // e.g. 11:30:05 AM
  const m = /(\d+):(\d+):(\d+) (AM|PM)/.exec(t)!;
  const h = (Number(m[1]) % 12) + (m[4] === 'PM' ? 12 : 0);
  return h * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

test('the clock runs 1:1 while visible and stops while hidden, with no catch-up', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Lifecycle check runs once.');
  await seedGame(page);
  const a = await clockSeconds(page);
  await page.waitForTimeout(5000);
  const b = await clockSeconds(page);
  expect(b - a).toBeGreaterThanOrEqual(4);
  expect(b - a).toBeLessThanOrEqual(6);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(600);
  const c = await clockSeconds(page);
  expect(c - b).toBeLessThanOrEqual(2); // hidden time did not accumulate
});

test('a second tab opens the same save read-only until it takes over', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop', 'Lifecycle check runs once.');
  await seedGame(page);
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  const second = await context.newPage();
  await second.goto('/');
  await second.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(second.getByText('This game is open in another tab')).toBeVisible();
  await expect(second.getByRole('button', { name: 'Advance', exact: true })).toBeDisabled();
  await second.getByRole('button', { name: 'Take Over Here' }).click();
  await expect(second.getByRole('button', { name: 'Advance', exact: true })).toBeEnabled();
  await expect(page.getByText('This game is open in another tab')).toBeVisible({ timeout: 8000 });
});

// Found by e2e/careers.spec.ts on November 7, 2026: a page reloaded mid-game left its tab's lock fresh for up to six
// seconds, so Continue straight after opened the game read-only, as if another tab had it.
test('reloading the page and continuing at once opens the game in this tab, not read-only', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'Lifecycle check runs once.');
  await seedGame(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  await expect(page.getByText('This game is open in another tab')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Advance', exact: true })).toBeEnabled();
});

test('in-game Saved Games and Settings come from the same navigation', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop' && info.project.name !== 'phone', 'Runs on desktop and phone.');
  await seedGame(page);
  await nav(page, 'Saved Games');
  await expect(page.getByRole('heading', { name: 'Saved Games', level: 1 })).toBeVisible();
  await expect(page.getByText('Playing Now')).toBeVisible();
  // The game being played can't be deleted from here.
  await expect(page.getByRole('button', { name: /^Delete Save/ })).toHaveCount(0);
  await nav(page, 'Settings');
  await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
  await page.getByRole('button', { name: 'Light', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('light');
  // Credits And Data Sources (the v4 package, 04): each source with its terms, in one place.
  const credits = page.getByRole('list', { name: "Where The Game's Facts Come From" });
  await expect(credits).toContainText('Data from GeoNames, CC BY 4.0.');
  await expect(credits).toContainText('This product uses the TMDB API but is not endorsed or certified by TMDB.');
  await expect(credits).toContainText(/Prices are from Glazer's Camera, a US retailer's public product listings, read on [A-Z][a-z]+ \d{1,2}, \d{4}/);
  // Phones never get entry fields under 16px (they would zoom the page).
  if (info.project.name === 'phone') {
    await nav(page, 'World');
    const size = await page.getByRole('searchbox', { name: 'Search Places' }).evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(16);
  }
});

// SLATE-19-02.03: the bar at the top sits outside the scrolling area, so nothing scrolled to or focused lands under it.
test('a destination scrolled to or focused is never hidden under the top bar', async ({ page }) => {
  await seedGame(page);
  await nav(page, 'Calendar');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const covered = await page.evaluate(() => {
    const bar = document.querySelector('.topbar')!.getBoundingClientRect();
    const scroller = document.getElementById('main')!;
    const targets = [...scroller.querySelectorAll<HTMLElement>('h2, h3, button, a, input, select')].filter((el) => el.getBoundingClientRect().height > 0);
    const out: string[] = targets.length < 4 ? [`only ${targets.length} things to scroll to`] : [];
    for (const el of [targets[targets.length - 1], targets[Math.floor(targets.length / 2)]]) {
      el.scrollIntoView({ block: 'start' });
      el.focus?.();
      const r = el.getBoundingClientRect();
      if (r.top < bar.bottom - 0.5) out.push(`${el.tagName} "${(el.textContent || '').trim().slice(0, 30)}" top ${r.top} under bar ${bar.bottom}`);
    }
    const style = getComputedStyle(document.querySelector('.topbar')!);
    if (style.position === 'sticky' || style.position === 'fixed') out.push(`the bar is ${style.position} inside the page`);
    return out;
  });
  expect(covered).toEqual([]);
});

// SLATE-02-02.04 and .05: Advance says what it will pass before you commit to it; there is no pause control.
test('Advance lists the plans it will pass, and there is nothing to pause the clock with', async ({ page }) => {
  await seedGame(page);
  await nav(page, 'Calendar');
  await page.getByRole('button', { name: 'Add Plan' }).click();
  await page.getByRole('textbox', { name: 'Title' }).fill('Coffee With Liv');
  await page.getByLabel('Start Time').fill('18:00');
  await page.getByRole('dialog').getByRole('button', { name: 'Add Plan' }).click();
  await page.getByRole('button', { name: 'Advance', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Advance' });
  await dialog.getByLabel('Advance To').selectOption('next-day');
  await expect(dialog.getByRole('list', { name: 'Along The Way' })).toContainText('Coffee With Liv');
  await dialog.getByLabel('Advance To').selectOption('time');
  await dialog.getByLabel('Time').fill('12:00');
  await expect(dialog.getByText('Nothing on your calendar along the way.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('button', { name: /pause/i })).toHaveCount(0);
});
