// Who gets the owner's data (November 11, 2026, docs/DEPLOYMENT.md; the Creative Depth package, milestone A and journey
// J09). The owner's own server, with a passphrase, on port 4180 (e2e/serve-prod.ts), holding the labelled made-up catalog
// and mods of catalog-fixture.ts. Every request here carries a forwarding header, as one passed on by a proxy from
// somewhere else would: the server treats it as a visitor's, not as this machine's. No request is intercepted.
// It runs only with SLATE_E2E_PROD=1, on Chromium: a browser keeps the session cookie (marked Secure) on plain-HTTP
// localhost only there. The same rules are tested request by request in tests/catalog-server.test.ts.
import { expect, expectErrors, test, type Page } from './test';
import { nav, quickLife } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const prod = process.env.SLATE_E2E_PROD === '1';
const ELSEWHERE = { 'x-forwarded-for': '203.0.113.9' };
const FILM_ROUTES = ['/screen-catalog/titles/movie-900001.json', '/screen-catalog/people/1.json', '/mods/slate-catalog.slatepack'];

test.describe('the owner\'s server, reached from elsewhere', () => {
  test.use({ baseURL: 'http://localhost:4180', extraHTTPHeaders: ELSEWHERE });
  test.beforeEach(({}, info) => {
    test.skip(!prod, 'Needs the production servers (SLATE_E2E_PROD=1).');
    test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone (Chromium).');
  });

  test('a visitor gets no film data by any route; the owner signs in from elsewhere, sees it, and signs out', async ({ page, playwright }) => {
    test.setTimeout(180_000);
    expectErrors('A wrong passphrase is presented on purpose, and the server answers 401.');
    // A visitor asking the server directly, with no game in front: nothing of the owner's.
    const visitor = await playwright.request.newContext({ baseURL: 'http://localhost:4180', extraHTTPHeaders: ELSEWHERE });
    expect(await (await visitor.get('/screen-catalog/index.json')).json()).toEqual({ installed: false, reason: 'missing' });
    for (const path of FILM_ROUTES) expect((await visitor.get(path)).status(), path).toBe(404);
    expect(((await (await visitor.get('/mods/index.json')).json()) as { mods: { kind: string }[] }).mods.map((m) => m.kind)).toEqual(['cinemas']);

    // The same visitor in the game: no catalog, the cinemas alone on offer, and a place to sign in.
    await quickLife(page, 'gb-london', '2026-01-05');
    await nav(page, 'Companies');
    await expect(page.getByRole('heading', { name: "The Film Catalog Isn't Installed" })).toBeVisible();
    await nav(page, 'Settings');
    const mods = page.getByRole('list', { name: 'Mods' });
    await expect(mods.locator('li')).toHaveCount(1);
    await expect(mods).toContainText('Cinemas');
    await expect(page.getByText("The films and series are this game's owner's alone. If that's you, sign in to see them here.")).toBeVisible();

    // A wrong passphrase is refused, and says so beside the field.
    await page.getByLabel('Owner Passphrase').fill('not the passphrase');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: "That isn't the owner's passphrase." })).toBeVisible();
    await expect(mods.locator('li')).toHaveCount(1);

    // The owner's passphrase: the film pack is offered, and the catalog shows.
    await page.getByLabel('Owner Passphrase').fill('fixture passphrase for the journey');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByText("You're signed in as this game's owner on this browser.")).toBeVisible();
    await expect(mods.locator('li', { hasText: 'Films And Series' })).toBeVisible();
    await nav(page, 'Companies');
    await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series with 1 season and 2 episodes, and 6 people');
    await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
    await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
    await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible();
    // The session is a cookie the page's scripts can't read, and the passphrase is kept nowhere in the browser.
    const cookie = (await page.context().cookies()).find((c) => c.name === 'slate_owner')!;
    expect([cookie.httpOnly, cookie.secure, cookie.sameSite]).toEqual([true, true, 'Strict']);
    expect(await page.evaluate(() => JSON.stringify({ ...localStorage }) + document.cookie)).not.toContain('fixture passphrase');
    // Signed in or not, another visitor still gets nothing.
    for (const path of FILM_ROUTES) expect((await visitor.get(path)).status(), path).toBe(404);

    // The owner's sign-in survives a reload, and ends at Sign Out.
    await page.reload();
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await nav(page, 'Companies');
    await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series');
    await nav(page, 'Settings');
    await page.getByRole('button', { name: 'Sign Out', exact: true }).click();
    await expect(page.getByLabel('Owner Passphrase')).toBeVisible();
    await expect(mods.locator('li')).toHaveCount(1);
    await nav(page, 'Companies');
    await expect(page.getByRole('heading', { name: "The Film Catalog Isn't Installed" })).toBeVisible();
    await visitor.dispose();
  });

  test('the owner signs in from elsewhere: the game goes on with no catalog until then, and loses nothing', async ({ page }) => {
    await quickLife(page, 'gb-london', '2026-01-05');
    await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
    await nav(page, 'Settings');
    // Pressing Sign In with nothing typed asks for the passphrase rather than doing nothing.
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: "Enter the owner's passphrase." })).toBeVisible();
    await nav(page, 'Home');
    await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  });
});
