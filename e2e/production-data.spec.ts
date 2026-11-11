// The catalog through the production server (server/serve.mjs), on the production build, with no Vite and no request
// intercepted (November 11, 2026, docs/DEPLOYMENT.md). Fixture data: the made-up catalog in catalog-fixture.ts, written
// to disk by e2e/serve-prod.ts and served on port 4176; an expired copy of it on 4177. It runs only with SLATE_E2E_PROD=1,
// which CI's production step sets; the dev server has no such servers.
import { expect, test, type Page } from './test';
import { nav, quickLife } from './helpers';

const card = (page: Page, heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
const prod = process.env.SLATE_E2E_PROD === '1';

/** Every catalog response, and any request toward TMDB, while the page runs. */
function watch(page: Page): { data: { path: string; status: number }[]; tmdb: string[] } {
  const seen = { data: [] as { path: string; status: number }[], tmdb: [] as string[] };
  page.on('request', (r) => { if (/themoviedb\.org|tmdb\.org/.test(r.url())) seen.tmdb.push(r.url()); });
  page.on('response', (r) => { const u = new URL(r.url()); if (u.pathname.startsWith('/screen-catalog/')) seen.data.push({ path: u.pathname, status: r.status() }); });
  return seen;
}

test.describe('the catalog through the production server', () => {
  test.use({ baseURL: 'http://localhost:4176' });
  test.beforeEach(({}, info) => {
    test.skip(!prod, 'Needs the production servers (SLATE_E2E_PROD=1).');
    test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  });

  test('company to film to cast member to another credit, a network, and a place\'s cinemas, each record fetched on request', async ({ page }) => {
    const seen = watch(page);
    await quickLife(page, 'gb-london', '2026-01-05');
    await nav(page, 'Companies');
    await expect(card(page, 'The Catalog')).toContainText('3 films, 1 series with 1 season and 2 episodes, and 6 people');
    await expect(page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB.')).toBeVisible();
    await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
    await card(page, 'Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
    await expect(page.getByRole('heading', { name: 'The Lantern Keeper (Fixture)', level: 1 })).toBeVisible();
    await card(page, 'Cast').getByRole('button', { name: 'Ada Quill' }).click();
    await expect(page.getByRole('heading', { name: 'Ada Quill', level: 1 })).toBeVisible();
    await card(page, 'Credits In The Catalog').getByRole('button', { name: 'Tidewater Station (Fixture)' }).click();
    await expect(page.getByRole('heading', { name: 'Tidewater Station (Fixture)', level: 1 })).toBeVisible();
    await card(page, 'About').getByRole('button', { name: 'ABC' }).click();
    await expect(page.getByRole('heading', { name: 'ABC', level: 1 })).toBeVisible();
    await expect(card(page, 'Who Owns It')).toContainText('Second Owner (Fixture)');

    await nav(page, 'World');
    await page.getByRole('searchbox', { name: 'Search Places' }).fill('london');
    await page.getByRole('list', { name: 'Places' }).getByRole('button', { name: 'London', exact: true }).first().click();
    await expect(page.getByRole('region', { name: 'Cinemas Nearby' })).toContainText('Riverside Picturehouse (Fixture)');

    // Each record came from the server as it was asked for, and nothing went to TMDB.
    const paths = seen.data.map((d) => d.path);
    for (const p of ['/screen-catalog/index.json', '/screen-catalog/titles/movie-900001.json', '/screen-catalog/people/1.json', '/screen-catalog/networks/2.json', '/screen-catalog/cinemas/GB.json']) expect(paths).toContain(p);
    expect(seen.data.filter((d) => d.status >= 500)).toEqual([]);
    expect(seen.tmdb).toEqual([]);
  });
});

test.describe('a catalog past TMDB\'s six months, through the production server', () => {
  test.use({ baseURL: 'http://localhost:4177' });
  test.beforeEach(({}, info) => {
    test.skip(!prod, 'Needs the production servers (SLATE_E2E_PROD=1).');
    test.skip(!['desktop', 'phone'].includes(info.project.name), 'Runs on desktop and phone.');
  });

  test('is withdrawn, the game says why, and the rest of the game goes on', async ({ page }) => {
    const seen = watch(page);
    await quickLife(page, 'gb-london', '2026-01-05');
    await nav(page, 'Companies');
    await expect(page.getByRole('heading', { name: "The Film Catalog Isn't Installed" })).toBeVisible();
    await expect(page.getByText(/more than six months old, the longest TMDB allows it to be kept, so it has been withdrawn/)).toBeVisible();
    // The company registry is the game's own research, not TMDB's: still there.
    await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Walt Disney Pictures', level: 1 })).toBeVisible();
    // No record was served from the expired catalog.
    expect(seen.data.filter((d) => d.status === 200 && !/index\.json|world\.json|theatrical\.json|cinemas\//.test(d.path))).toEqual([]);
    await nav(page, 'Home');
    await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
  });
});
