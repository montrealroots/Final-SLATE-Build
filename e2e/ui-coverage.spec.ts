// The screen-by-screen UI audit (the owner's brief of November 12, 2026, docs/v3/UI-BRIEF.md, parts 1 and 5). One
// career is played through the interface, and at each screen, tab and dialog it reaches the page is measured
// (e2e/ui-audit.ts) at several sizes: what is past an edge, wider than its box, cut off, too small to tap, overlapping
// or out of line. On the phone profile each screen is also read at a desktop size, and what it offers compared: the
// same headings in the same order, the same things to press, the same fields.
//
// What it found is written to test-results/ui-coverage-<profile>.json, and to docs/v3/ui-coverage/ when
// UI_COVERAGE_WRITE=1, from which tools/v3/ui-coverage.mjs writes docs/v3/UI-COVERAGE.md. A screen no step here
// reaches is listed there as not visited; nothing is called checked that wasn't.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test, type Page } from './test';
import { addScene, advance, freshStart, nav, newProject, openStart, pinSeed, quickLife, saveAndApprove, saveAndExit, section } from './helpers';
import { audit, coveredWhenFocused, shiftSince, watchShifts, type Defect } from './ui-audit';
import { serveCatalog } from './catalog-fixture';

type Size = [number, number, string];
const SIZES: Record<string, Size[]> = {
  desktop: [[1280, 720, 'desktop'], [1024, 768, 'small laptop'], [768, 1024, 'tablet upright'], [600, 960, 'small tablet upright'], [320, 568, 'desktop zoomed to 400 percent (320 wide)']],
  phone: [[390, 844, 'phone'], [360, 740, 'narrow phone'], [430, 932, 'large phone'], [844, 390, 'phone on its side'], [667, 375, 'small phone on its side']],
  'iphone-15-plus': [[430, 932, 'iPhone 15 Plus (WebKit)'], [932, 430, 'iPhone 15 Plus on its side (WebKit)']],
  'iphone-15-pro-max': [[430, 932, 'iPhone 15 Pro Max (WebKit)']],
};
// What a phone's navigation is instead of the rail: the same destinations, behind Menu.
const NAV = new Set(['Menu', 'Close Menu', 'Close Navigation', 'SLATE, Go To Home', 'Home', 'Player Profile', 'World', 'Projects', 'Companies', 'Saved Games', 'Settings', 'Save & Exit', 'Skip To Content']);

// UI_SHOTS=<folder>: a picture of each screen at the phone and desktop sizes, for a person to look at side by side.
const SHOTS = process.env.UI_SHOTS;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// UI_STYLES=<file>: what the stylesheet gives every element on every screen, to prove a stylesheet clean-up changed
// nothing. Only what the stylesheet sets and the content doesn't: no widths or heights the words decide.
const STYLES = process.env.UI_STYLES;
const styles: Record<string, Record<string, string>> = {};
function styleSheetOf(): Record<string, string> {
  const PROPS = ['display', 'position', 'float', 'font-size', 'font-weight', 'font-family', 'font-style', 'line-height', 'letter-spacing', 'text-transform', 'text-align', 'text-decoration-line', 'text-decoration-style', 'white-space', 'overflow-wrap', 'word-break', 'text-overflow', 'color', 'background-color', 'background-image', 'opacity', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left', 'margin-top', 'margin-bottom', 'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width', 'border-top-style', 'border-top-color', 'border-bottom-color', 'border-top-left-radius', 'border-bottom-right-radius', 'box-shadow', 'outline-style', 'row-gap', 'column-gap', 'flex-direction', 'flex-wrap', 'flex-grow', 'flex-shrink', 'flex-basis', 'align-items', 'align-self', 'justify-content', 'justify-self', 'grid-auto-flow', 'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end', 'min-width', 'max-width', 'min-height', 'max-height', 'overflow-x', 'overflow-y', 'z-index', 'cursor', 'box-sizing', 'vertical-align', 'visibility', 'pointer-events', 'object-fit', 'aspect-ratio', 'list-style-type', 'border-collapse', 'table-layout', 'user-select', 'touch-action', 'animation-name', 'transition-property', 'content', 'top', 'bottom'];
  const out: Record<string, string> = {};
  const path = (e: Element): string => { const parts: string[] = []; for (let x: Element | null = e; x && x !== document.documentElement; x = x.parentElement) { const i = x.parentElement ? [...x.parentElement.children].indexOf(x) : 0; parts.unshift(`${x.tagName.toLowerCase()}${typeof x.className === 'string' && x.className ? '.' + x.className.trim().split(/\s+/).join('.') : ''}[${i}]`); } return parts.join('>'); };
  for (const e of document.body.querySelectorAll('*')) {
    const one = (pseudo?: string): string => { const c = getComputedStyle(e, pseudo); return PROPS.map((p) => c.getPropertyValue(p)).join('|'); };
    out[path(e)] = `${one()}#${one('::before')}#${one('::after')}`;
  }
  return out;
}

interface Row { id: string; area: string; name: string; kind: string; sizes: Record<string, { defects: Defect[] }>; scrollers: string[]; accepted: string[]; parity?: { onlyDesktop: string[]; onlyPhone: string[]; sameOrder: boolean } }
const rows: Row[] = [];

/** Wait until what the screen offers has stopped changing: a part still loading is not a part that is missing. */
async function settled(page: Page): Promise<void> {
  let last = '';
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(150);
    const now = JSON.stringify((await audit(page)).signature);
    if (now === last) return;
    last = now;
  }
}

async function visit(page: Page, project: string, id: string, area: string, name: string, kind = 'screen'): Promise<void> {
  const row: Row = { id, area, name, kind, sizes: {}, scrollers: [], accepted: [] };
  const sizes = SIZES[project];
  let phoneSig: Awaited<ReturnType<typeof audit>>['signature'] | null = null;
  if (kind === 'dialog') await page.getByRole('dialog').last().waitFor();
  for (const [w, h, label] of sizes) {
    await page.setViewportSize({ width: w, height: h });
    await settled(page);
    const a = await audit(page);
    // At the profile's own size: what moved by itself since the last screen, and what focus leaves under a bar.
    if (sizes[0][0] === w && sizes[0][1] === h) a.defects.push(...await shiftSince(page), ...await page.evaluate(coveredWhenFocused));
    row.sizes[`${label} (${w} by ${h})`] = { defects: a.defects };
    if (SHOTS && (label === 'phone' || label === 'desktop' || label.includes('WebKit'))) await page.screenshot({ path: `${SHOTS}/${String(rows.length + 1).padStart(2, '0')}-${id}-${project}-${w}.png` });
    if (STYLES && (label === 'phone' || label === 'desktop')) styles[`${id} ${w}`] = await page.evaluate(styleSheetOf);
    for (const s of a.scrollers) if (!row.scrollers.includes(s)) row.scrollers.push(s);
    for (const s of a.accepted) if (!row.accepted.includes(s)) row.accepted.push(s);
    if (label === 'phone') phoneSig = a.signature;
  }
  // The drawer is the phone's own navigation: a desktop has the rail, and the page behind an open drawer is out of reach on purpose.
  if (project === 'phone' && phoneSig && kind !== 'drawer') {
    // The same screen at a desktop size, in the same state: what does each offer that the other doesn't?
    await page.setViewportSize({ width: 1280, height: 720 });
    await settled(page);
    const d = (await audit(page)).signature;
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/${String(rows.length + 1).padStart(2, '0')}-${id}-phone-as-desktop-1280.png` });
    if (STYLES) styles[`${id} 1280`] = await page.evaluate(styleSheetOf);
    const all = (s: typeof d) => [...s.headings.map((x) => `heading: ${x}`), ...s.actions.filter((x) => !NAV.has(x) && !/, Open Your Player Profile$/.test(x)).map((x) => `press: ${x.slice(0, 60)}`), ...s.fields.map((x) => `field: ${x}`)];
    const D = all(d), P = all(phoneSig);
    row.parity = { onlyDesktop: D.filter((x) => !P.includes(x)), onlyPhone: P.filter((x) => !D.includes(x)), sameOrder: JSON.stringify(d.headings.filter((x) => phoneSig!.headings.includes(x))) === JSON.stringify(phoneSig.headings.filter((x) => d.headings.includes(x))) };
  }
  await page.setViewportSize({ width: sizes[0][0], height: sizes[0][1] });
  rows.push(row);
}

/** Writes what the walk has measured so far, and holds it to nothing found: no defect at any size, and a phone offering what a desktop does. */
function finish(project: string): void {
  const out = JSON.stringify({ project, at: new Date().toISOString(), rows }, null, 1);
  mkdirSync('test-results', { recursive: true });
  writeFileSync(`test-results/ui-coverage-${project}.json`, out);
  if (STYLES) writeFileSync(STYLES, JSON.stringify(styles));
  if (process.env.UI_COVERAGE_WRITE) {
    // A run of one walk keeps the other walks' rows as they were last measured, so the file is always all of them.
    const path = `docs/v3/ui-coverage/walk-${project}.json`;
    mkdirSync('docs/v3/ui-coverage', { recursive: true });
    const mine = new Set(rows.map((r) => r.id));
    const kept: Row[] = existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')).rows as Row[]).filter((r) => !mine.has(r.id)) : [];
    writeFileSync(path, `${JSON.stringify({ project, at: new Date().toISOString(), rows: [...kept, ...rows] }, null, 1)}\n`);
  }
  expect(rows.flatMap((r) => Object.entries(r.sizes).flatMap(([size, v]) => v.defects.map((d) => `${r.id} at ${size}: ${d.kind}, ${d.what}, ${Math.round(d.by)} px`)))).toEqual([]);
  expect(rows.filter((r) => r.parity && (r.parity.onlyDesktop.length || r.parity.onlyPhone.length || !r.parity.sameOrder)).map((r) => `${r.id}: desktop only ${JSON.stringify(r.parity!.onlyDesktop)}, phone only ${JSON.stringify(r.parity!.onlyPhone)}`)).toEqual([]);
}

test('the UI audit: one career, every screen it reaches, measured at each size', async ({ page }, info) => {
  const project = info.project.name;
  test.skip(!SIZES[project], 'Runs on desktop, phone and the two WebKit iPhone emulations.');
  test.setTimeout(1_800_000);
  const v = (id: string, area: string, name: string, kind?: string) => visit(page, project, id, area, name, kind);

  // ---------- Before a game ----------
  page.setDefaultTimeout(20_000); // a step that can't be taken fails here, not at the end of half an hour
  await watchShifts(page);
  await freshStart(page);
  await v('start', 'Startup', 'Start Screen, No Saves');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await v('start-settings', 'Startup', 'Settings From The Start Screen', 'dialog');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('heading', { name: 'Identity' }).waitFor();
  await v('creation-identity', 'Startup', 'Creation: Identity');
  await quickLife(page, 'gb-london', '2026-01-05');
  await pinSeed(page, 7);

  // ---------- The game's own screens, with nothing in them yet ----------
  await v('home-empty', 'Home', 'Home, Nothing Started');
  await page.getByRole('button', { name: 'Sleep', exact: true }).first().click();
  await v('sleep', 'Shell', 'Sleep', 'dialog');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
  await v('advance', 'Shell', 'Advance', 'dialog');
  await page.keyboard.press('Escape');
  await nav(page, 'Profile'); await v('profile', 'You', 'Player Profile');
  await page.getByRole('button', { name: 'Find An Agent' }).click();
  await v('agent-list', 'You', 'Find An Agent', 'dialog');
  await page.keyboard.press('Escape');
  await nav(page, 'Calendar'); await v('calendar', 'Your Day', 'Calendar');
  const add = page.getByRole('button', { name: 'Add Plan' });
  if (await add.count()) { await add.first().click(); await v('add-plan', 'Your Day', 'Add Plan', 'dialog'); await page.keyboard.press('Escape'); }
  await nav(page, 'World'); await v('world', 'Your Day', 'World');
  await nav(page, 'Companies'); await v('companies-none', 'Industry', 'Companies, No Catalog Installed', 'state');
  await nav(page, 'Saved Games'); await v('saves', 'Your Game', 'Saved Games');
  await nav(page, 'Settings'); await v('settings', 'Your Game', 'Settings');
  await nav(page, 'Projects'); await v('projects-empty', 'Your Work', 'Projects, None Yet', 'state');
  await page.getByRole('button', { name: 'New Script' }).first().click();
  await v('new-script', 'Your Work', 'New Script');
  await nav(page, 'Projects');

  // ---------- A project in development ----------
  await newProject(page, { title: 'A Title Long Enough To Wrap On A Narrow Phone, And Then Some More Of It', format: 'Feature Film', budget: 'Low Budget' });
  await v('overview-new', 'Project', 'Overview, Just Created', 'tab');
  await section(page, 'Script');
  await v('script-empty', 'Project', 'Script, Nothing Written', 'tab');
  await page.getByRole('button', { name: 'Choose A Full Story' }).click();
  await v('story-list', 'Project', 'Choose A Full Story', 'dialog');
  const picker = page.getByRole('dialog', { name: 'Choose A Full Story' });
  await picker.getByLabel('Genre').locator('option').filter({ hasText: /^Heist \(/ }).waitFor({ state: 'attached' });
  const heist = (await picker.getByLabel('Genre').locator('option').allInnerTexts()).find((t) => /^Heist \(/.test(t))!;
  await picker.getByLabel('Genre').selectOption({ label: heist });
  await picker.getByRole('button', { name: /^The Quiet Floor/ }).click();
  await v('story-open', 'Project', 'A Full Story, Open', 'dialog');
  await page.getByRole('dialog', { name: 'The Quiet Floor' }).getByRole('button', { name: 'Apply This Story' }).click();
  await v('script-story', 'Project', 'Script, With A Story Applied', 'tab');
  await page.getByRole('button', { name: 'Choose A Starting Idea' }).click();
  await v('idea-list', 'Project', 'Choose A Starting Idea', 'dialog');
  await page.keyboard.press('Escape');
  // A real work to adapt: the list, then one work open (the catalog is the repository's own).
  await page.getByRole('button', { name: 'Choose A Work To Adapt' }).click();
  await page.getByRole('dialog', { name: 'Choose A Work To Adapt' }).getByRole('list', { name: 'Works' }).waitFor();
  await v('source-list', 'Project', 'Choose A Work To Adapt', 'dialog');
  await page.getByRole('dialog', { name: 'Choose A Work To Adapt' }).getByLabel('Search Works').fill('quixote');
  await page.getByRole('dialog', { name: 'Choose A Work To Adapt' }).getByRole('button', { name: /^Don Quixote/ }).click();
  await page.getByRole('dialog', { name: 'Don Quixote' }).getByRole('button', { name: 'Adapt This Work' }).waitFor();
  await v('source-open', 'Project', 'A Work To Adapt, Open', 'dialog');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Edit Scene' }).first().click();
  await v('scene-open', 'Project', 'A Scene, Open For Editing', 'panel');
  await page.getByRole('button', { name: 'Close Scene' }).first().click();
  await section(page, 'Characters');
  await v('characters', 'Project', 'Characters', 'tab');
  await page.getByRole('article', { name: 'Inês Marçal' }).getByRole('button', { name: 'Edit Character' }).click();
  await v('character-open', 'Project', 'A Character, Open For Editing', 'panel');
  await page.getByRole('button', { name: 'Set Aside Or Remove Inês Marçal' }).click();
  await v('set-aside', 'Project', 'Take A Character Out Of The Script', 'dialog');
  await page.keyboard.press('Escape');
  for (const [tab, id] of [['Cast', 'cast-before'], ['Crew', 'crew-before'], ['Schedule', 'schedule-before'], ['Budget', 'budget-before'], ['Production', 'production-before'], ['Edit', 'edit-before'], ['Release', 'release-before'], ['Festivals And Awards', 'awards-before']] as const) {
    await section(page, tab);
    await v(id, 'Project', `${tab}, Before A Draft Is Approved`, 'state');
  }

  // ---------- Approved, funded, casting ----------
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Declare None Of These' }).click();
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await expect(page.getByText('Approved', { exact: true })).toBeVisible();
  await v('script-approved', 'Project', 'Script, A Draft Approved', 'tab');
  await section(page, 'Budget');
  await v('budget', 'Project', 'Budget', 'tab');
  await page.getByRole('button', { name: 'Approach Starting Backing' }).click();
  await page.getByRole('button', { name: 'Accept Offer' }).click();
  await v('accept-terms', 'Project', 'Accept These Terms?', 'dialog');
  await page.getByRole('dialog', { name: 'Accept These Terms?' }).getByRole('button', { name: /^Accept \$/ }).click();
  await v('budget-funded', 'Project', 'Budget, Funded', 'tab');
  await section(page, 'Cast');
  await v('cast', 'Project', 'Cast', 'tab');
  await page.getByRole('button', { name: 'Find Performers' }).first().click();
  await v('find-performers', 'Project', 'Find Performers', 'dialog');
  await page.getByRole('dialog').getByRole('button', { name: 'Make Offer' }).first().click();
  if (await page.getByRole('dialog').isVisible().catch(() => false)) await page.keyboard.press('Escape');
  await v('cast-offer', 'Project', 'Cast, An Offer Out', 'tab');
  await section(page, 'Crew');
  await v('crew', 'Project', 'Crew', 'tab');
  await section(page, 'Schedule');
  await v('schedule', 'Project', 'Schedule', 'tab');
  await section(page, 'Overview');
  await v('overview', 'Project', 'Overview', 'tab');
  await advance(page, 'next-day');
  await nav(page, 'Home'); await v('home', 'Home', 'Home, A Project Under Way');
  await nav(page, 'Projects'); await v('projects', 'Your Work', 'Projects');
  // An agent, now that there is an approved script to show: asked, answered within the week, signed with, and the
  // notice dialog opened and left.
  await nav(page, 'Profile');
  await page.getByRole('button', { name: 'Find An Agent' }).click();
  await page.getByRole('dialog', { name: 'Find An Agent' }).getByRole('button', { name: 'Approach Imogen Vale' }).click();
  await advance(page, 'week');
  await nav(page, 'Profile');
  await page.getByRole('button', { name: 'Sign With Imogen Vale' }).click();
  await v('profile-represented', 'You', 'Player Profile, Represented');
  await page.getByRole('button', { name: 'Give Notice' }).click();
  await v('agent-notice', 'You', 'Give Notice?', 'dialog');
  await page.keyboard.press('Escape');
  // The phone's own navigation.
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menu.isVisible()) { await menu.click(); await v('menu', 'Shell', 'Menu Drawer', 'drawer'); await page.keyboard.press('Escape'); }

  void addScene; void saveAndApprove;
  finish(project);
});

test('the UI audit: the catalog, from a company to a film, a person, a series, its season and episode, a network and an executive', async ({ page }, info) => {
  const project = info.project.name;
  test.skip(!SIZES[project], 'Runs on desktop, phone and the two WebKit iPhone emulations.');
  test.setTimeout(900_000);
  page.setDefaultTimeout(20_000);
  const v = (id: string, area: string, name: string, kind?: string) => visit(page, project, id, area, name, kind);
  const card = (heading: string) => page.locator('section.card', { has: page.getByRole('heading', { name: heading, exact: true }) });
  const crumb = (label: string) => page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('button', { name: label, exact: true });
  await watchShifts(page);
  await serveCatalog(page); // a made-up catalog (catalog-fixture.ts): no TMDB record is in the repository
  await quickLife(page, 'gb-london', '2026-01-05');
  await nav(page, 'Home'); await v('home-industry', 'Home', 'Home, With The Industry\'s News');
  await nav(page, 'Companies'); await v('companies', 'Industry', 'Companies, With The Catalog');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card('Films And Series').waitFor(); await v('company', 'Industry', 'A Company');
  await card('Films And Series').getByRole('button', { name: 'The Lantern Keeper (Fixture)' }).click();
  await card('Cast').waitFor(); await v('title-film', 'Industry', 'A Film');
  await card('Cast').getByRole('button', { name: 'Ada Quill' }).click();
  await card('Credits In The Catalog').waitFor(); await v('person', 'Industry', 'A Person');
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'Walt Disney Pictures', exact: true }).click();
  await card('Films And Series').getByRole('button', { name: 'Tidewater Station (Fixture)' }).click();
  await card('Seasons').waitFor(); await v('title-series', 'Industry', 'A Series');
  await card('Seasons').getByRole('button', { name: 'Season 1' }).click();
  await card('Episodes').waitFor(); await v('season', 'Industry', 'A Season');
  await card('Episodes').getByRole('button', { name: 'Pilot' }).click();
  await card('Guest Cast').waitFor(); await v('episode', 'Industry', 'An Episode');
  await nav(page, 'Companies');
  await card('Where The Series Aired').getByRole('button', { name: 'Networks And Streaming Services' }).click();
  await page.getByRole('button', { name: 'ABC', exact: true }).waitFor(); await v('networks', 'Industry', 'Networks And Streaming Services');
  await page.getByRole('button', { name: 'ABC', exact: true }).click();
  await crumb('Networks And Streaming Services').waitFor(); await v('network', 'Industry', 'A Network');
  await nav(page, 'Companies');
  await page.getByRole('button', { name: 'The Walt Disney Company', exact: true }).click();
  await page.getByRole('button', { name: 'Robert A. Iger' }).first().waitFor(); await v('company-group', 'Industry', 'A Company With Leadership');
  await page.getByRole('button', { name: 'Robert A. Iger' }).first().click();
  await page.getByRole('heading', { name: 'Robert A. Iger', level: 1 }).waitFor(); await v('executive', 'Industry', 'An Executive');
  await nav(page, 'Calendar'); await v('calendar-industry', 'Your Day', 'Calendar, With The Industry\'s Dates');
  finish(project);
});

test('the UI audit: the rest of creation, and the dialogs the first walk does not open', async ({ page }, info) => {
  const project = info.project.name;
  test.skip(!SIZES[project], 'Runs on desktop, phone and the two WebKit iPhone emulations.');
  test.setTimeout(900_000);
  page.setDefaultTimeout(20_000);
  const v = (id: string, area: string, name: string, kind?: string) => visit(page, project, id, area, name, kind);
  /** Opens a dialog if its button is there, measures it, and closes it. A button that isn't there leaves its row unvisited. */
  const dialog = async (press: ReturnType<Page['getByRole']>, id: string, area: string, name: string) => {
    if (!(await press.first().isVisible().catch(() => false)) || !(await press.first().isEnabled())) return;
    await press.first().click();
    if (!(await page.getByRole('dialog').last().waitFor({ timeout: 3_000 }).then(() => true, () => false))) return; // it acted without asking
    await v(id, area, name, 'dialog');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
  };
  await watchShifts(page);

  // ---------- A character part made: the start screen offers to go on or start over; the other steps of creation ----------
  await quickLife(page, 'gb-london', '2026-01-05');
  await saveAndExit(page);
  await v('start-saved', 'Startup', 'Start Screen, With A Saved Game');
  await page.getByRole('button', { name: 'Saved Games', exact: true }).click();
  await page.getByRole('heading', { name: 'Saved Games', level: 1 }).waitFor();
  await v('start-saves', 'Startup', 'Saved Games From The Start Screen');
  await dialog(page.getByRole('button', { name: /^Rename Save / }), 'rename-save', 'Your Game', 'Rename Save');
  await dialog(page.getByRole('button', { name: /^Delete Save / }), 'delete-save', 'Your Game', 'Delete This Save?');
  await page.getByRole('button', { name: /^Back/ }).first().click();
  // A finished draft beside the save, as helpers.ts quickDraft leaves one: New Game then offers to go on with it.
  await page.evaluate(() => localStorage.setItem('slate.v1.creationDraft', JSON.stringify({
    step: 7, name: 'Odalys Brannigan-Vasquez', pronouns: 'she', actingTitle: 'Actress', birthDate: '1990-05-20', birthplaceId: 'ke-nairobi',
    heritages: [{ id: 'Kikuyu', label: 'Kikuyu', custom: false }, { id: 'Norwegian', label: 'Norwegian', custom: false }], heritageCustomText: '', mainLanguage: 'en',
    languages: [{ code: 'sw', proficiency: 'Fluent' }, { code: 'no', proficiency: 'Conversational' }], startPlaceId: 'gb-london', startDate: '2026-01-05', startTime: '08:00', updatedAt: 1,
  })));
  await page.reload();
  await page.locator('html[data-engine="ready"]').waitFor({ state: 'attached' });
  await page.getByRole('button', { name: 'New Game' }).click();
  await page.getByRole('button', { name: 'Continue Creation' }).waitFor();
  await v('start-draft', 'Startup', 'Start Screen, With An Unfinished Character');
  await dialog(page.getByRole('button', { name: 'Start Over', exact: true }), 'start-over', 'Startup', 'Start Over?');
  await page.getByRole('button', { name: 'Continue Creation' }).click();
  await page.getByRole('button', { name: 'Start My Story' }).waitFor();
  await v('creation-review', 'Startup', 'Creation: Review');
  for (const [re, id, name] of [[/Background/, 'creation-background', 'Creation: Background And Languages'], [/Starting Point/, 'creation-starting-point', 'Creation: Starting Point']] as const) {
    await page.getByRole('button', { name: re }).filter({ hasText: 'Edit' }).first().click();
    await page.getByRole('button', { name: 'Save And Return To Review' }).waitFor();
    await v(id, 'Startup', name);
    await page.getByRole('button', { name: 'Save And Return To Review' }).click();
    await page.getByRole('button', { name: 'Start My Story' }).waitFor();
  }

  // ---------- A script with a story in it: its dialogs ----------
  await openStart(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await nav(page, 'Projects');
  await newProject(page, { title: 'Dialogs', format: 'Feature Film', budget: 'Low Budget' });
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Choose A Full Story' }).click();
  // The genre is chosen, not assumed: the list opens on the first genre that has a story, which was Heist only until
  // another genre before it in the alphabet had one (November 12, 2026, when this walk stopped here).
  const stories = page.getByRole('dialog', { name: 'Choose A Full Story' });
  await stories.getByLabel('Genre').locator('option').filter({ hasText: /^Heist \(/ }).waitFor({ state: 'attached' });
  await stories.getByLabel('Genre').selectOption({ label: (await stories.getByLabel('Genre').locator('option').allInnerTexts()).find((t) => /^Heist \(/.test(t))! });
  await stories.getByRole('button', { name: /^The Quiet Floor/ }).click();
  await page.getByRole('dialog').last().getByRole('button', { name: 'Apply This Story' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await dialog(page.getByRole('button', { name: /^Change The Relationship Of / }), 'change-relationship', 'Script', 'Change The Relationship');
  // A rule of the story's world, added here and relied on by a scene: changing it has a dialog, and removing it, or a
  // relationship between two people who share a scene, asks first and is left alone.
  if (await page.getByRole('button', { name: 'Add Rule' }).isVisible().catch(() => false)) {
    await page.getByLabel('Rule', { exact: true }).fill('The vault opens once a day');
    await page.getByLabel('Limit Or Cost', { exact: true }).fill('At noon, for four minutes');
    await page.getByRole('button', { name: 'Add Rule' }).click();
    await dialog(page.getByRole('button', { name: /^Change The Rule / }), 'change-rule', 'Script', 'Change The Rule');
    const relies = page.getByRole('group', { name: 'Scenes That Rely On It' }).getByRole('checkbox').first();
    if (await relies.isVisible().catch(() => false)) {
      await relies.check();
      await dialog(page.getByRole('button', { name: /^Remove The Rule / }), 'remove-rule', 'Script', 'Remove The Rule');
    }
  }
  await dialog(page.getByRole('button', { name: /^Remove The Relationship Of / }), 'remove-relationship', 'Script', 'Remove The Relationship');
  await page.getByRole('button', { name: 'Declare None Of These' }).click().catch(() => undefined);
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await dialog(page.getByRole('button', { name: 'Rename Draft' }), 'rename-draft', 'Script', 'Rename Draft');
  await dialog(page.getByRole('button', { name: 'Compare With Working Copy' }), 'compare-draft', 'Script', 'Compare Draft');
  const scene = page.locator('article.scene-card').first();
  await scene.getByRole('button', { name: 'Edit Scene' }).click();
  await dialog(scene.getByRole('button', { name: /^Combine / }), 'script-confirm', 'Script', 'Combine The Scenes');
  await section(page, 'Overview');
  await dialog(page.getByRole('button', { name: 'Shelve The Project' }), 'shelve', 'Project', 'Shelve The Project');

  // ---------- Approved and backed: hiring ----------
  await section(page, 'Script');
  await page.getByRole('button', { name: 'Approve This Draft' }).first().click();
  await page.getByText('Approved', { exact: true }).waitFor();
  await section(page, 'Budget');
  await page.getByRole('button', { name: 'Approach Starting Backing' }).click().catch(() => undefined);
  await section(page, 'Crew');
  await dialog(page.getByRole('button', { name: 'Hire A Writer', exact: true }), 'hire-writer', 'Crew', 'Hire A Writer');
  await dialog(page.getByRole('button', { name: /^Find Candidates/ }), 'hire-crew', 'Crew', 'Hire A Crew Member');
  await dialog(page.getByRole('button', { name: /^Staff /, exact: false }), 'staff', 'Crew', 'Staff A Department');
  // Once work has begun on an approved script, taking a scene out or approving a changed draft says what it touches first.
  await section(page, 'Script');
  const later = page.locator('article.scene-card').nth(1);
  await later.getByRole('button', { name: 'Edit Scene' }).click();
  await dialog(later.getByRole('button', { name: /^Delete Scene/ }), 'delete-scene', 'Script', 'Delete This Scene?');
  if (!(await later.getByLabel('Place', { exact: true }).isVisible())) await later.getByRole('button', { name: 'Edit Scene' }).click();
  await later.getByLabel('Place', { exact: true }).fill('Loading Dock Behind The Bank');
  await page.getByRole('button', { name: 'Save Draft' }).click();
  await dialog(page.getByRole('button', { name: 'Approve This Draft' }), 'approve-draft', 'Script', 'Approve This Draft?');
  await nav(page, 'Saved Games');
  await page.getByRole('heading', { name: 'Saved Games', level: 1 }).waitFor();
  await dialog(page.getByRole('button', { name: /^Rename Save/ }), 'rename-save-in-game', 'Your Game', 'Rename Save, In The Game');
  finish(project);
});
