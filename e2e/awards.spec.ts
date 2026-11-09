// The expanded festival and award catalog in the browser (docs/awards/DESIGN.md, November 9, 2026). Each journey plays
// the awards side through the UI: finding categories in a large roster, who receives each award, entering, correcting,
// withdrawing, selection, nominations, results, prizes, honorary awards and reloads. Projects are made through the UI and
// then marked delivered in the save (a labelled fixture): delivering through production is covered in journeys.spec.ts.
import { expect, test, type Page } from './test';
import type { Locator } from '@playwright/test';
import { hashString } from '../src/engine/rng';
import { addScene, nav, newProject, pressSaveAndExit, quickLife, readSavedState, saveAndApprove, saveAndExit, section, seededLife } from './helpers';
import { firstSaveId, readRecord, writeRecords } from './vault';

test.describe.configure({ timeout: 600_000 });

type State = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Edit the saved game in place (as the save format stores it, with its checksum), then reopen it. */
async function editSave(page: Page, fn: (state: State) => void): Promise<void> {
  await saveAndExit(page);
  const id = await firstSaveId(page);
  const env = JSON.parse((await readRecord(page, `slate.v1.save.${id}`))!);
  const state = JSON.parse(env.data);
  fn(state);
  state.events.sort((a: { at: number; priority: number; id: string }, b: { at: number; priority: number; id: string }) => a.at - b.at || a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const data = JSON.stringify(state);
  await writeRecords(page, { [`slate.v1.save.${id}`]: JSON.stringify({ ...env, checksum: hashString(data), data }) });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Good (Morning|Afternoon|Evening), /, level: 1 })).toBeVisible();
}

const credit = (id: string, person: string, personName: string, contribution: string, roleId: string, extra: State = {}) => ({ id, person, personName, contribution, roleId, episodes: 'all', billing: Number(id.replace(/\D/g, '')) || 0, ...extra });

/** Labelled fixture: the project made through the UI is marked delivered, credited and released as the journey needs. */
function deliver(s: State, title: string, o: { format: string; runtime: number; at: string; releases?: State[]; credits?: State[]; quality?: Record<string, number>; base?: string; lang?: string }): State {
  const p = s.projects.find((x: State) => x.title === title);
  p.axes.format = o.format;
  if (o.base) p.axes.basePlaceId = o.base;
  if (o.lang) p.axes.dialogueLanguages = [o.lang];
  p.delivered = { at: Date.parse(o.at), runtimeMin: o.runtime };
  p.phase = 'delivered';
  Object.assign(p.story, { logline: 'A keeper finds a stranger on the rocks.', premise: 'Two strangers wait out a storm.' });
  const me = s.character.name;
  p.credits = [credit('cr1', 'player', me, 'Directed By', 'director'), credit('cr2', 'player', me, 'Written By', 'writer'), credit('cr3', 'player', me, 'Produced By', 'producer'), ...(o.credits ?? [])];
  p.releases = o.releases ?? [];
  p.quality = { overall: 95, script: 95, direction: 95, craft: 90, editing: 90, music: 90, reception: 95, ...o.quality };
  p.funding.fund = Math.max(p.funding.fund ?? 0, 20_000);
  return p;
}

async function gameDate(page: Page): Promise<string> {
  const text = await page.getByRole('banner').getByText(/^[A-Z][a-z]+day, [A-Z][a-z]+ \d{1,2}, \d{4}$/).first().textContent();
  return new Date(`${text!.replace(/^[A-Za-z]+, /, '')} 12:00 UTC`).toISOString().slice(0, 10);
}

/** Advance to a date (9 AM), pressing Advance again whenever something stops it, as a player would. */
async function advanceUntil(page: Page, date: string): Promise<void> {
  for (let i = 0; i < 80 && (await gameDate(page)) < date; i++) {
    await page.getByRole('button', { name: 'Advance', exact: true }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Advance' });
    await dialog.getByLabel('Advance To').selectOption('time');
    await dialog.getByLabel('Date').fill(date);
    await dialog.getByLabel('Time').fill('09:00');
    await dialog.getByRole('button', { name: 'Advance' }).click();
    await expect(page.locator('.save-state')).not.toHaveText(/Advancing/, { timeout: 60_000 });
    const dismiss = page.getByRole('button', { name: 'Dismiss' });
    if (await dismiss.isVisible()) await dismiss.click();
  }
  expect(await gameDate(page)).toBe(date);
  // The advance has finished and been saved before the journey reads anything.
  await expect(page.locator('.save-state')).toHaveText('Saved', { timeout: 60_000 });
}

/** The day after an edition's announcement or end, from the save: simulated dates come from the world seed. */
async function dayAfter(page: Page, editionId: string, when: 'announce' | 'end'): Promise<string> {
  const e = (await readSavedState(page)).editions.find((x: State) => x.id === editionId);
  return new Date(e[when] + 86_400_000).toISOString().slice(0, 10);
}

async function festivals(page: Page, title: string): Promise<void> {
  await nav(page, 'Projects');
  await page.getByRole('button', { name: title }).click();
  await section(page, 'Festivals And Awards');
}

/** The event page, from the project's Festivals And Awards tab (open editions) or its entries (entered ones). */
async function openEvent(page: Page, title: string, label: string): Promise<void> {
  await festivals(page, title);
  await page.getByRole('button', { name: label, exact: true }).first().click();
  await expect(page.getByRole('heading', { name: 'When And Where' })).toBeVisible();
}

const categories = (page: Page) => page.getByRole('region', { name: /^(Categories|Sections)$/ });
const row = (page: Page, name: string): Locator => categories(page).locator('li').filter({ has: page.locator('strong', { hasText: new RegExp(`^${name.replace(/[()]/g, '\\$&')}$`) }) });
const yours = (page: Page) => page.locator('section', { hasText: 'Your Entries' }).last();
const entry = (page: Page, name: string): Locator => yours(page).locator('li', { hasText: name }).filter({ hasNot: page.locator('.chip', { hasText: /^Withdrawn$/ }) });
/** An entry's status once it is one of those expected (the page catches up with an advance as it finishes). */
async function status(l: Locator, allowed: string[]): Promise<string> {
  await expect(l.locator('.chip').first()).toHaveText(new RegExp(`^(${allowed.join('|')})$`));
  return (await l.locator('.chip').first().innerText()).trim();
}

/** Prepare a submission from a category's row and submit it, checking who it goes to first. */
async function submit(page: Page, name: string, goesTo: RegExp, credited: string): Promise<void> {
  await row(page, name).getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await expect(dialog.getByText(goesTo)).toBeVisible();
  await expect(dialog.getByText(new RegExp(`Credited for this entry: ${credited}\\.`))).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  await expect(entry(page, name).locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();
}

async function filterTo(page: Page, project: string, show?: string): Promise<void> {
  await categories(page).getByLabel('Project').selectOption({ label: project });
  if (show) await categories(page).getByLabel('Show').selectOption({ label: show });
}

test('Oscars: one film in several categories, each to its own credited people; a wrong declaration corrected; withdrawn and entered again; nominations and results survive a reload', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-10-01');
  await newProject(page, { title: 'Harbor Lights', format: 'Feature Film', runtime: '100' });
  await editSave(page, (s) => deliver(s, 'Harbor Lights', {
    format: 'feature', runtime: 104, at: '2026-02-01T20:00:00Z',
    releases: [{ id: 'r1', route: 'theatrical', date: '2026-04-01', territories: ['US'], distributor: 'Coast Pictures', note: '', status: 'released' }],
    credits: [credit('cr9', 'x-dp', 'Ines Duarte', 'Director Of Photography', 'dop')], quality: { 'craft:dop': 96 },
  }));
  await openEvent(page, 'Harbor Lights', '99th Academy Awards');
  await expect(categories(page).getByText(/^28 categories this edition\./)).toBeVisible();
  await filterTo(page, 'Harbor Lights', 'Open To Harbor Lights');
  for (const name of ['Best Picture', 'Directing', 'Writing (Original Screenplay)', 'Cinematography']) await expect(row(page, name)).toBeVisible();
  // No credited lead performance and no original song: those categories aren't open, and say why.
  await expect(row(page, 'Actor In A Leading Role')).toHaveCount(0);
  await categories(page).getByLabel('Show').selectOption({ label: 'Every Category' });
  await expect(row(page, 'Actress In A Leading Role').getByText(/No credited lead performance/)).toBeVisible();
  await expect(row(page, 'Writing (Adapted Screenplay)').getByText('This category is for screenplays adapted from other work; this one is declared original.')).toBeVisible();
  // Honorary awards are on the page, chosen by the Academy, and can't be entered.
  await expect(row(page, 'Honorary Award').getByText(/Chosen by the organizer from a body of work/)).toBeVisible();
  await expect(row(page, 'Honorary Award').getByRole('button', { name: 'Prepare Submission' })).toHaveCount(0);

  await submit(page, 'Directing', /goes to the credited director\./, 'Nia Halvorsen-Mbeki');
  await submit(page, 'Cinematography', /goes to the credited director of photography\./, 'Ines Duarte');
  await submit(page, 'Best Picture', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');

  // The source was declared wrongly: correct it in the Story panel, before the deadline, and enter.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbor Lights' }).click();
  await section(page, 'Script');
  await page.getByLabel('Source Material').selectOption({ label: 'Adapted From Another Work' });
  await page.getByLabel('Adapted From').fill('The Salt Road, a novel');
  await openEvent(page, 'Harbor Lights', '99th Academy Awards');
  await filterTo(page, 'Harbor Lights');
  await expect(row(page, 'Writing (Adapted Screenplay)').locator('.chip', { hasText: 'Open To Harbor Lights' })).toBeVisible();
  await expect(row(page, 'Writing (Original Screenplay)').getByText(/declared adapted/)).toBeVisible();
  await submit(page, 'Writing (Adapted Screenplay)', /goes to the credited writers\./, 'Nia Halvorsen-Mbeki');

  // Withdrawn and entered again: both stay on record.
  await entry(page, 'Cinematography').getByRole('button', { name: 'Withdraw Entry' }).click();
  await expect(yours(page).locator('li', { hasText: 'Cinematography' }).locator('.chip', { hasText: /^Withdrawn$/ })).toBeVisible();
  await filterTo(page, 'Harbor Lights');
  await submit(page, 'Cinematography', /director of photography/, 'Ines Duarte');
  await expect(yours(page).locator('li', { hasText: 'Cinematography' })).toHaveCount(2);

  // Nominations (January 28, 2027); each entry is decided on its own.
  await advanceUntil(page, await dayAfter(page, 'oscars-2027', 'announce'));
  await openEvent(page, 'Harbor Lights', '99th Academy Awards');
  const names = ['Best Picture', 'Directing', 'Writing (Adapted Screenplay)', 'Cinematography'];
  const nominations: string[] = [];
  for (const n of names) nominations.push(await status(entry(page, n), ['Nominated', 'Not Nominated']));
  const before = (await readSavedState(page)).editions.find((e: State) => e.id === 'oscars-2027');
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Harbor Lights', '99th Academy Awards');
  for (const [i, n] of names.entries()) expect(await status(entry(page, n), [nominations[i]])).toBe(nominations[i]);
  expect((await readSavedState(page)).editions.find((e: State) => e.id === 'oscars-2027').results).toEqual(before.results);

  // The ceremony (March 14): nominated entries are decided; the categories you weren't in show their winners too.
  await advanceUntil(page, await dayAfter(page, 'oscars-2027', 'end'));
  await openEvent(page, 'Harbor Lights', '99th Academy Awards');
  const results: string[] = [];
  for (const [i, n] of names.entries()) {
    results.push(await status(entry(page, n), nominations[i] === 'Nominated' ? ['Winner', 'Did Not Win'] : ['Not Nominated']));
  }
  await categories(page).getByLabel('Find A Category').fill('Costume');
  await expect(row(page, 'Costume Design').getByText(/^Winner: .+\. Nominees: /)).toBeVisible();
  const shown = await row(page, 'Costume Design').innerText();
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Harbor Lights', '99th Academy Awards');
  for (const [i, n] of names.entries()) expect(await status(entry(page, n), [results[i]])).toBe(results[i]);
  await categories(page).getByLabel('Find A Category').fill('Costume');
  expect(await row(page, 'Costume Design').innerText()).toBe(shown);
  await page.screenshot({ path: `test-results/awards-oscars-${test.info().project.name}.png`, fullPage: true });
  await categories(page).getByLabel('Find A Category').fill('');
  await categories(page).screenshot({ path: `test-results/awards-oscars-categories-${test.info().project.name}.png` });
});

test('Emmys: a drama series entered as a program and for acting, writing, directing and casting, each to its own people', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2027-02-01');
  await newProject(page, { title: 'Night Ward', format: 'Series', episodes: '2', runtime: '50' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Mara');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Ward', chars: ['Mara'], minutes: '2' });
  await addScene(page, { index: 1, place: 'Corridor', chars: ['Mara'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  await saveAndApprove(page);
  await editSave(page, (s) => {
    const p = deliver(s, 'Night Ward', {
      format: 'series', runtime: 100, at: '2026-08-01T20:00:00Z',
      releases: [{ id: 'r1', route: 'broadcast', date: '2026-10-01', territories: ['US'], distributor: 'Channel Nine', note: '', status: 'released' }],
      credits: [credit('cr7', 'x-cd', 'Rosa Lind', 'Casting Director', 'casting-director')],
    });
    p.axes.register = 'drama';
    p.axes.episodeCount = 6; // the Emmys need six episodes; the script written above has two
    const draft = p.drafts.find((d: State) => d.number === p.approvedDraft);
    const mara = draft.characters.find((c: State) => c.name === 'Mara');
    mara.roleSize = 'lead';
    p.credits.push(credit('cr8', 'player', s.character.name, 'Cast', 'actor', { characterName: 'Mara' }));
  });
  await openEvent(page, 'Night Ward', 'Primetime Emmy Awards 2027');
  await filterTo(page, 'Night Ward', 'Open To Night Ward');
  for (const n of ['Outstanding Drama Series', 'Outstanding Lead Actress In A Drama Series', 'Outstanding Writing For A Drama Series', 'Outstanding Directing For A Drama Series', 'Outstanding Casting For A Drama Series']) await expect(row(page, n)).toBeVisible();
  // It competes as drama: the comedy categories say so; the actor categories are for performers billed as actors.
  await categories(page).getByLabel('Show').selectOption({ label: 'Every Category' });
  await expect(row(page, 'Outstanding Writing For A Comedy Series').getByText('This category is for comedy and musical work; this project competes as drama.')).toBeVisible();
  await expect(row(page, 'Outstanding Lead Actor In A Drama Series').getByText(/as actor in this category/)).toBeVisible();
  await categories(page).getByLabel('Show').selectOption({ label: 'Open To Night Ward' });
  await submit(page, 'Outstanding Drama Series', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');
  await submit(page, 'Outstanding Lead Actress In A Drama Series', /goes to a credited leading performance, billed as actress\./, 'Nia Halvorsen-Mbeki');
  await submit(page, 'Outstanding Writing For A Drama Series', /goes to the credited writers\./, 'Nia Halvorsen-Mbeki');
  await submit(page, 'Outstanding Directing For A Drama Series', /goes to the credited director\./, 'Nia Halvorsen-Mbeki');
  await submit(page, 'Outstanding Casting For A Drama Series', /goes to the credited casting director\./, 'Rosa Lind');
  await advanceUntil(page, await dayAfter(page, 'emmys-2027', 'announce'));
  await openEvent(page, 'Night Ward', 'Primetime Emmy Awards 2027');
  for (const n of ['Outstanding Drama Series', 'Outstanding Lead Actress In A Drama Series', 'Outstanding Writing For A Drama Series', 'Outstanding Directing For A Drama Series', 'Outstanding Casting For A Drama Series']) {
    await status(entry(page, n), ['Nominated', 'Not Nominated']);
  }
  await page.screenshot({ path: `test-results/awards-emmys-${test.info().project.name}.png`, fullPage: true });
});

test('a short qualifies for the Oscars through a festival prize; an animated short at the Annies and a documentary at the Oscars', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-09-01');
  await newProject(page, { title: 'Paper Lantern', format: 'Short Film', medium: 'Animation', technique: 'Drawn 2D', finish: 'Limited Animation', runtime: '8' });
  await nav(page, 'Projects');
  await newProject(page, { title: 'Salt Flats', format: 'Documentary Feature', runtime: '90' });
  await editSave(page, (s) => {
    deliver(s, 'Paper Lantern', { format: 'short', runtime: 9, at: '2026-02-01T20:00:00Z' });
    const doc = deliver(s, 'Salt Flats', { format: 'documentary-feature', runtime: 92, at: '2026-03-01T20:00:00Z', releases: [{ id: 'r1', route: 'theatrical', date: '2026-05-01', territories: ['US'], distributor: 'Dune Films', note: '', status: 'released' }] });
    doc.credits = doc.credits.filter((c: State) => c.contribution !== 'Written By');
  });
  await openEvent(page, 'Paper Lantern', '99th Academy Awards');
  await filterTo(page, 'Paper Lantern');
  await expect(row(page, 'Animated Short Film').getByText(/or a win of an award on the Oscars qualifying-festival list between October 1, 2025 and September 30, 2026/)).toBeVisible();

  // Labelled fixture: Paper Lantern was selected at Annecy in June 2026 and won its Audience Award, which the Academy's
  // list doesn't name: the selection and that award leave the short where it was.
  await editSave(page, (s) => {
    const p = s.projects.find((x: State) => x.title === 'Paper Lantern');
    const ed = s.editions.find((e: State) => e.id === 'annecy-2026');
    ed.entries.push({ id: 'an1', projectId: p.id, categoryId: 'shorts', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    ed.entries.push({ id: 'an0', projectId: p.id, categoryId: 'short-audience', submittedAt: 0, status: 'won', recipients: ['cr3'], fee: 0, via: 'selection' });
    ed.results['short-audience'] = { stage: 'winner', projectIds: [p.id], rivalIds: [], winner: p.id, revealed: true };
  });
  await openEvent(page, 'Paper Lantern', '99th Academy Awards');
  await filterTo(page, 'Paper Lantern');
  await expect(row(page, 'Animated Short Film').getByText(/or a win of an award on the Oscars qualifying-festival list/)).toBeVisible();

  // Labelled fixture: it also won the Cristal for a short film, the award the Academy lists for Annecy (the festival
  // itself is played in the Venice journey below).
  await editSave(page, (s) => {
    const p = s.projects.find((x: State) => x.title === 'Paper Lantern');
    const ed = s.editions.find((e: State) => e.id === 'annecy-2026');
    ed.entries.push({ id: 'an2', projectId: p.id, categoryId: 'short-cristal', submittedAt: 0, status: 'won', recipients: ['cr3'], fee: 0, via: 'selection' });
    ed.results['short-cristal'] = { stage: 'winner', projectIds: [p.id], rivalIds: [], winner: p.id, revealed: true };
  });
  await openEvent(page, 'Paper Lantern', '99th Academy Awards');
  await filterTo(page, 'Paper Lantern');
  await expect(row(page, 'Animated Short Film').locator('.chip', { hasText: 'Open To Paper Lantern' })).toBeVisible();
  await row(page, 'Animated Short Film').getByRole('button', { name: 'Prepare Submission' }).click();
  const list = page.getByRole('dialog', { name: 'Prepare Submission' }).locator('details', { hasText: 'Qualifying Festival Awards' });
  await list.locator('summary').click();
  await expect(list.getByText('Annecy: Cristal for a Short Film')).toBeVisible();
  await expect(list.getByText(/^Won from October 1, 2025 to September 30, 2026\. Only these awards count/)).toBeVisible();
  await page.getByRole('dialog', { name: 'Prepare Submission' }).getByRole('button', { name: 'Cancel' }).click();
  await submit(page, 'Animated Short Film', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');

  // Animation: the Annies' short subject.
  await openEvent(page, 'Paper Lantern', '54th Annie Awards');
  await filterTo(page, 'Paper Lantern');
  await submit(page, 'Best Short Subject', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');

  // Documentary: the Academy's Documentary Feature Film, closing October 15.
  await openEvent(page, 'Salt Flats', '99th Academy Awards');
  await filterTo(page, 'Salt Flats', 'Open To Salt Flats');
  await expect(row(page, 'Writing (Original Screenplay)')).toHaveCount(0); // no credited writer
  await submit(page, 'Documentary Feature Film', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');
  await page.screenshot({ path: `test-results/awards-shorts-docs-${test.info().project.name}.png`, fullPage: true });
});

test('International Feature Film: a prize the Academy doesn\'t list doesn\'t qualify, the Golden Lion does; a country puts forward one film', async ({ page }) => {
  await quickLife(page, 'fr-paris', '2026-09-01');
  for (const title of ['Le Phare', 'La Digue', 'Les Dunes']) {
    await nav(page, 'Projects');
    await newProject(page, { title, format: 'Feature Film', runtime: '100' });
  }
  // Labelled fixture: three French-language features made in Paris. Le Phare has no release and won the Berlinale's
  // Silver Bear Grand Jury Prize in February; La Digue and Les Dunes opened in French cinemas in May.
  const french = [{ id: 'r1', route: 'theatrical', date: '2026-05-06', territories: ['FR'], distributor: 'Rive Films', note: '', status: 'released' }];
  await editSave(page, (s) => {
    const phare = deliver(s, 'Le Phare', { format: 'feature', runtime: 101, at: '2026-01-10T20:00:00Z', base: 'fr-paris', lang: 'fr' });
    deliver(s, 'La Digue', { format: 'feature', runtime: 98, at: '2026-02-10T20:00:00Z', base: 'fr-paris', lang: 'fr', releases: french, quality: { overall: 99 } });
    deliver(s, 'Les Dunes', { format: 'feature', runtime: 96, at: '2026-02-12T20:00:00Z', base: 'fr-paris', lang: 'fr', releases: french, quality: { overall: 97 } });
    const b = s.editions.find((e: State) => e.id === 'berlinale-2026');
    b.entries.push({ id: 'bl1', projectId: phare.id, categoryId: 'competition', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    b.entries.push({ id: 'bl2', projectId: phare.id, categoryId: 'grand-jury', submittedAt: 0, status: 'won', recipients: ['cr3'], fee: 0, via: 'selection' });
    b.results['grand-jury'] = { stage: 'winner', projectIds: [phare.id], rivalIds: [], winner: phare.id, revealed: true };
  });
  await openEvent(page, 'Le Phare', '99th Academy Awards');
  await filterTo(page, 'Le Phare');
  await expect(row(page, 'International Feature Film').getByText(/It needs a theatrical release outside the United States between October 1, 2025 and September 30, 2026, or a win of an award on the Oscars qualifying-festival list/)).toBeVisible();

  // Labelled fixture: Le Phare won Venice's Golden Lion on September 12, 2026, one of the six awards the Academy lists.
  await editSave(page, (s) => {
    const phare = s.projects.find((x: State) => x.title === 'Le Phare');
    const v = s.editions.find((e: State) => e.id === 'venice-2026');
    v.entries.push({ id: 've1', projectId: phare.id, categoryId: 'competition', submittedAt: 0, status: 'selected', recipients: [], fee: 0 });
    v.entries.push({ id: 've2', projectId: phare.id, categoryId: 'golden-lion', submittedAt: 0, status: 'won', recipients: ['cr3'], fee: 0, via: 'selection' });
    v.results['golden-lion'] = { stage: 'winner', projectIds: [phare.id], rivalIds: [], winner: phare.id, revealed: true };
  });
  await openEvent(page, 'Le Phare', '99th Academy Awards');
  await filterTo(page, 'Le Phare');
  await expect(row(page, 'International Feature Film').locator('.chip', { hasText: 'Open To Le Phare' })).toBeVisible();
  await row(page, 'International Feature Film').getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await expect(dialog.getByText(/a country puts forward only one/)).toBeVisible();
  await dialog.locator('summary', { hasText: 'Qualifying Festival Awards' }).click();
  for (const a of ['Venice: Golden Lion', 'Berlin: Golden Bear for Best Film', 'Toronto: Platform Award']) await expect(dialog.getByText(a, { exact: true })).toBeVisible();
  await expect(dialog.getByText(/Silver Bear/)).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  // The edition's Your Entries lists every film's entries, each as "Title: Category".
  const mine = (title: string) => yours(page).locator('li', { hasText: `${title}: International Feature Film` });
  for (const title of ['Le Phare', 'Les Dunes', 'La Digue']) {
    await openEvent(page, title, '99th Academy Awards');
    await filterTo(page, title);
    await row(page, 'International Feature Film').getByRole('button', { name: 'Prepare Submission' }).click();
    await expect(dialog.getByText(/Credited for this entry: Nia Halvorsen-Mbeki\./)).toBeVisible();
    await dialog.getByRole('button', { name: 'Submit Entry' }).click();
    await expect(dialog).toBeHidden();
    await expect(mine(title).locator('.chip')).toHaveText('Submitted');
  }

  // The committees decide at the Academy's entry deadline (November 12, 5 p.m. in Los Angeles).
  await advanceUntil(page, '2026-11-14');
  await openEvent(page, 'Le Phare', '99th Academy Awards');
  await expect(mine('Le Phare').locator('.chip')).toHaveText('Accepted For Consideration');
  await expect(mine('Le Phare').getByText(/^Its Golden Lion at the .+ qualifies it without the national committee\.$/)).toBeVisible();
  await expect(mine('La Digue').locator('.chip')).toHaveText('Accepted For Consideration');
  await expect(mine('La Digue').getByText(/France's selection committee chose it over /)).toBeVisible();
  await expect(mine('Les Dunes').locator('.chip')).toHaveText('Not Selected');
  await expect(mine('Les Dunes').getByText("France's selection committee put forward La Digue; a country submits one film.")).toBeVisible();
  await yours(page).screenshot({ path: `test-results/awards-international-${test.info().project.name}.png` });
  // The decisions survive a reload.
  await pressSaveAndExit(page);
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Le Phare', '99th Academy Awards');
  await expect(mine('Les Dunes').locator('.chip')).toHaveText('Not Selected');
  await expect(mine('Le Phare').locator('.chip')).toHaveText('Accepted For Consideration');
});

test('Venice: selection for the Competition is not a win; its prizes are decided among the selected films; the fee is paid once', async ({ page }) => {
  await seededLife(page, 'gb-london', '2026-05-01', 8301);
  await newProject(page, { title: 'Glass Orchard', format: 'Feature Film', runtime: '100' });
  await editSave(page, (s) => { deliver(s, 'Glass Orchard', { format: 'feature', runtime: 101, at: '2026-01-10T12:00:00Z', base: 'gb-london', quality: { overall: 99, direction: 99, script: 99, reception: 99 } }); });
  await openEvent(page, 'Glass Orchard', 'Venice International Film Festival 2026');
  await expect(categories(page).getByText(/Sections select work; selection is not a win\./)).toBeVisible();
  await filterTo(page, 'Glass Orchard');
  await expect(row(page, 'Golden Lion For Best Film').getByText(/Decided among the work selected for Venezia 83 \(Competition\)\. It takes no entries and no fee\./)).toBeVisible();
  await expect(row(page, 'Golden Lion For Best Film').getByRole('button', { name: 'Prepare Submission' })).toHaveCount(0);
  await row(page, 'Venezia 83 (Competition)').getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await expect(dialog.getByText(/Selection is not a win\. If it's selected, its prizes are decided among the films selected for this section/)).toBeVisible();
  await expect(dialog.getByText(/Withdrawing doesn't refund it; entering again in this category doesn't charge it twice\./)).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await entry(page, 'Venezia 83 (Competition)').getByRole('button', { name: 'Withdraw Entry' }).click();
  await filterTo(page, 'Glass Orchard');
  await row(page, 'Venezia 83 (Competition)').getByRole('button', { name: 'Prepare Submission' }).click();
  await page.getByRole('dialog', { name: 'Prepare Submission' }).getByRole('button', { name: 'Submit Entry' }).click();
  await expect(entry(page, 'Venezia 83 (Competition)').locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();

  await advanceUntil(page, await dayAfter(page, 'venice-2026', 'announce'));
  await openEvent(page, 'Glass Orchard', 'Venice International Film Festival 2026');
  await status(entry(page, 'Venezia 83 (Competition)'), ['In Competition']);

  await advanceUntil(page, await dayAfter(page, 'venice-2026', 'end'));
  await openEvent(page, 'Glass Orchard', 'Venice International Film Festival 2026');
  await status(entry(page, 'Venezia 83 (Competition)'), ['Selected']);
  const lion = yours(page).locator('li', { hasText: 'Golden Lion For Best Film' });
  await status(lion, ['Winner', 'Special Mention', 'Did Not Win']);
  await expect(lion.getByText('Considered from its selection; no entry or fee.')).toBeVisible();
  await filterTo(page, 'Glass Orchard', 'Yours');
  await expect(row(page, 'Venezia 83 (Competition)').getByText(/^Selected: /)).toBeVisible();
  await expect(row(page, 'Venezia 83 (Competition)').getByText(/Winner: /)).toHaveCount(0);
  await expect(row(page, 'Golden Lion For Best Film').getByText(/^Winner: /)).toBeVisible();
  const s = await readSavedState(page);
  expect(s.projects[0].obligations.flatMap((o: State) => o.postings).filter((x: State) => x.kind === 'settle' && x.key === 'fee:venice-2026:competition')).toHaveLength(1);
  expect(s.editions.find((e: State) => e.id === 'venice-2026').entries.filter((x: State) => x.via === 'selection').every((x: State) => x.fee === 0)).toBe(true);
  await page.screenshot({ path: `test-results/awards-venice-${test.info().project.name}.png`, fullPage: true });
  await categories(page).screenshot({ path: `test-results/awards-venice-sections-${test.info().project.name}.png` });
});

test('the Annies held one TV category until 2026 and four from 2027: each edition shows its own', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-01-05');
  await nav(page, 'Calendar');
  const events = page.getByRole('region', { name: 'Festivals And Awards' });
  await events.getByLabel('Search Events').fill('Annie');
  await events.getByRole('button', { name: 'Annie Awards 2026' }).click();
  await categories(page).getByLabel('Find A Category').fill('TV');
  await expect(row(page, 'Best TV Or Media Production')).toBeVisible();
  await expect(row(page, 'Best TV/Media - Preschool')).toHaveCount(0);
  await nav(page, 'Calendar');
  await events.getByLabel('Search Events').fill('Annie');
  await events.getByRole('button', { name: '54th Annie Awards' }).click();
  await categories(page).getByLabel('Find A Category').fill('TV');
  await expect(row(page, 'Best TV Or Media Production')).toHaveCount(0);
  for (const n of ['Best TV/Media - Preschool', 'Best TV/Media - Children', 'Best TV/Media - Mature', 'Best TV/Media – Limited Series']) await expect(row(page, n)).toBeVisible();
});

test('an honorary award comes from a long career, at an announcement, with no entry and no fee', async ({ page }) => {
  await seededLife(page, 'gb-london', '2026-07-01', 2061);
  await newProject(page, { title: 'Lighthouse Keeper', format: 'Feature Film', runtime: '100' });
  await editSave(page, (s) => {
    const p = deliver(s, 'Lighthouse Keeper', { format: 'feature', runtime: 100, at: '2025-05-01T12:00:00Z', base: 'gb-london' });
    // Labelled fixture: a thirty-year career of six delivered films, two of them prize winners.
    s.startedAt = s.now - 32 * 365.25 * 86_400_000;
    for (let i = 1; i <= 5; i++) {
      const c = JSON.parse(JSON.stringify(p));
      c.id = `${p.id}-k${i}`;
      c.title = `Earlier Film ${i}`;
      c.delivered.at = s.startedAt + i * 5 * 365.25 * 86_400_000;
      s.projects.push(c);
    }
    const bl = s.editions.find((e: State) => e.id === 'berlinale-2026');
    bl.entries.push({ id: 'k1', projectId: `${p.id}-k1`, categoryId: 'golden-bear', submittedAt: 0, status: 'won', recipients: ['cr3'], fee: 0, via: 'selection' });
    bl.entries.push({ id: 'k2', projectId: `${p.id}-k2`, categoryId: 'grand-jury', submittedAt: 0, status: 'won', recipients: ['cr3'], fee: 0, via: 'selection' });
  });
  const feesBefore = (await readSavedState(page)).projects.flatMap((p: State) => p.obligations.flatMap((o: State) => o.postings)).filter((x: State) => x.key?.startsWith('fee:')).length;
  let honour: { edition: string; category: string } | undefined;
  for (const date of ['2026-08-01', '2026-09-01', '2026-10-01', '2026-11-01', '2026-12-01', '2027-01-01', '2027-02-01', '2027-03-01']) {
    await advanceUntil(page, date);
    const s = await readSavedState(page);
    for (const e of s.editions) for (const [id, r] of Object.entries(e.results) as [string, State][]) if (r.honoree === 'player') honour ??= { edition: e.label, category: id };
    if (honour) break;
  }
  expect(honour).toBeDefined();
  await nav(page, 'Profile');
  await expect(page.getByText(new RegExp(`^Honorary: .+, ${honour!.edition}, for your body of work$`)).first()).toBeVisible();
  const s = await readSavedState(page);
  const ed = s.editions.find((e: State) => e.label === honour!.edition);
  expect(ed.entries.filter((x: State) => x.categoryId === honour!.category)).toEqual([]);
  expect(s.projects.flatMap((p: State) => p.obligations.flatMap((o: State) => o.postings)).filter((x: State) => x.key?.startsWith('fee:')).length).toBe(feesBefore);
  await page.screenshot({ path: `test-results/awards-honorary-${test.info().project.name}.png`, fullPage: true });
});

test('Emmys: a documentary narrator enters Outstanding Narrator; a narrator and a guest in half the season are kept out of the performer categories, and told why', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2027-02-01');
  await newProject(page, { title: 'Salt Roads', format: 'Documentary Short', runtime: '15' });
  await nav(page, 'Projects');
  await newProject(page, { title: 'Night Ward', format: 'Series', episodes: '2', runtime: '50' });
  const air = [{ id: 'r1', route: 'broadcast', date: '2026-10-01', territories: ['US'], distributor: 'Channel Nine', note: '', status: 'released' }];
  // Labelled fixture: the parts, their story functions and the narration sequence are set in the save, as the other
  // journeys set delivery; the Characters and Script tabs that set them are covered in screenwriting.spec.ts.
  await editSave(page, (s) => {
    const part = (name: string, extra: State) => ({ id: `ch-${name}`, name, roleSize: 'supporting', functions: [], seriesInvolvement: 'regular', languages: ['en'], methods: ['on-camera'], ...extra });
    const doc = deliver(s, 'Salt Roads', { format: 'documentary-short', runtime: 15, at: '2026-08-01T20:00:00Z', releases: air,
      credits: [credit('cr8', 'x-narr', 'Odile Brandt', 'Cast', 'actor', { characterName: 'The Narrator' })] });
    doc.drafts = [{ number: 1, characters: [part('The Narrator', { functions: ['narrator'] })], scenes: [{ id: 'n1', kind: 'narration', dialogue: [], songs: [] }] }];
    doc.approvedDraft = 1;
    const series = deliver(s, 'Night Ward', { format: 'series', runtime: 300, at: '2026-08-01T20:00:00Z', releases: air });
    series.axes.register = 'drama';
    series.axes.episodeCount = 6;
    series.drafts = [{ number: 1, characters: [part('Mara', { roleSize: 'lead' }), part('Marcus', { seriesInvolvement: 'guest', awardPlacement: 'none' }), part('The Voice', { functions: ['narrator'] })], scenes: [] }];
    series.approvedDraft = 1;
    const me = s.character.name;
    series.credits[0].episodes = [1, 2, 3]; // the player directed the first half; Ada Ruiz the rest
    series.credits.push(credit('cr11', 'x-dir', 'Ada Ruiz', 'Directed By', 'episode-director', { episodes: [4, 5, 6] }));
    series.credits.push(credit('cr8', 'player', me, 'Cast', 'actor', { characterName: 'Mara' }), credit('cr9', 'player', me, 'Cast', 'actor', { characterName: 'Marcus', episodes: [1, 2, 3] }),
      credit('cr10', 'player', me, 'Cast', 'actor', { characterName: 'The Voice' }));
  });
  await openEvent(page, 'Salt Roads', 'Primetime Emmy Awards 2027');
  await filterTo(page, 'Salt Roads', 'Open To Salt Roads');
  await submit(page, 'Outstanding Narrator', /goes to the credited narrator\./, 'Odile Brandt');
  await openEvent(page, 'Night Ward', 'Primetime Emmy Awards 2027');
  await filterTo(page, 'Night Ward', 'Every Category');
  await expect(row(page, 'Outstanding Lead Actress In A Drama Series').locator('.chip', { hasText: 'Open To Night Ward' })).toBeVisible();
  await expect(row(page, 'Outstanding Supporting Actress In A Drama Series').getByText('A narrator can\'t be entered in this performer category; the narration can be entered for a narrator award.')).toBeVisible();
  await expect(row(page, 'Outstanding Guest Actress In A Drama Series').getByText('This category takes performers in fewer than half of the episodes; Marcus is in 3 of 6.')).toBeVisible();
  await expect(row(page, 'Outstanding Narrator').getByText(/doesn't accept series projects/)).toBeVisible();
  // Directing is entered for a single episode, and goes to whoever directed that one.
  await filterTo(page, 'Night Ward', 'Open To Night Ward');
  await row(page, 'Outstanding Directing For A Drama Series').getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await expect(dialog.getByText(/Credited for this entry: Nia Halvorsen-Mbeki\./)).toBeVisible();
  await dialog.getByLabel('Episode To Enter').selectOption({ label: 'Episode 4' });
  await expect(dialog.getByText(/Credited for this entry: Ada Ruiz\./)).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  await expect(entry(page, 'Outstanding Directing For A Drama Series, Episode 4').locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();
  await page.screenshot({ path: `test-results/awards-narrator-${test.info().project.name}.png`, fullPage: true });
});

test('SXSW: a music video enters the Music Video Competition; a short film can\'t', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-09-01');
  await newProject(page, { title: 'Night Bus', format: 'Music Video', runtime: '4' });
  await editSave(page, (s) => { deliver(s, 'Night Bus', { format: 'music-video', runtime: 4, at: '2026-08-01T20:00:00Z' }); });
  await openEvent(page, 'Night Bus', 'SXSW Film & TV Festival 2027');
  await filterTo(page, 'Night Bus', 'Every Section And Award');
  await expect(row(page, 'Short Film Competition').getByText(/doesn't accept music video projects/)).toBeVisible();
  await expect(row(page, 'Grand Jury Award: Music Video')).toBeVisible();
  await submit(page, 'Music Video Competition', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');
});

test('Golden Globes: Non-English Language counts the script\'s dialogue, not the declared language', async ({ page }) => {
  await quickLife(page, 'fr-paris', '2026-10-01');
  await newProject(page, { title: 'Le Quai', format: 'Feature Film', runtime: '100' });
  await nav(page, 'Projects');
  await newProject(page, { title: 'La Rive', format: 'Feature Film', runtime: '100' });
  // Labelled fixture: both declared French first; the approved scripts' lines are 60% and 10% French.
  await editSave(page, (s) => {
    const words = (n: number, w: string) => Array(n).fill(w).join(' ');
    for (const [title, fr] of [['Le Quai', 60], ['La Rive', 10]] as const) {
      const p = deliver(s, title, { format: 'feature', runtime: 100, at: '2026-02-01T12:00:00Z', base: 'fr-paris',
        releases: [{ id: 'r1', route: 'theatrical', date: '2026-04-01', territories: ['FR'], distributor: 'Rive Gauche', note: '', status: 'released' }] });
      p.axes.dialogueLanguages = ['fr', 'en'];
      p.drafts = [{ number: 1, characters: [], scenes: [{ id: 's1', kind: 'scripted', songs: [], dialogue: [
        { id: 'l1', characterId: 'c', text: words(fr, 'mot'), language: 'fr' }, { id: 'l2', characterId: 'c', text: words(100 - fr, 'word'), language: 'en' }] }] }];
      p.approvedDraft = 1;
    }
  });
  await openEvent(page, 'Le Quai', '84th Golden Globe Awards');
  await filterTo(page, 'Le Quai', 'Every Category');
  await expect(row(page, 'Best Motion Picture – Non-English Language').locator('.chip', { hasText: 'Open To Le Quai' })).toBeVisible();
  await filterTo(page, 'La Rive', 'Every Category');
  await expect(row(page, 'Best Motion Picture – Non-English Language').getByText('10% of its written dialogue is in a language other than English; this category needs more than 50%.')).toBeVisible();
});

// ---------------- Screen time, episodes and songs (November 9, 2026) ----------------

/** Labelled fixture: the shoot and the assembly are done (every scene but the ones named was shot), the parts cast. */
function shotAndAssembled(s: State, title: string, unshot: string[]): State {
  const p = s.projects.find((x: State) => x.title === title);
  const draft = p.drafts.find((d: State) => d.number === p.approvedDraft);
  p.cast = draft.characters.map((c: State) => ({ characterId: c.id, performer: 'player', method: 'on-camera', note: '' }));
  p.captures = draft.scenes.filter((sc: State) => !unshot.includes(sc.heading.place)).map((sc: State) => ({ sceneId: sc.id, captured: 1, quality: 70, version: p.approvedDraft, weatherCompromised: false }));
  p.tasks = [...new Set(draft.scenes.map((sc: State) => sc.episode))].map((e) => ({ id: `post:assembly:${e}`, kind: 'post:assembly', label: 'Assembly Edit', dept: 'Post Production', roleId: 'editor', units: 1, unitLabel: 'days', done: 1, dependsOn: [], status: 'done', episode: e, sceneIds: [], workedDays: 1 }));
  p.edit.assembly = true;
  return p;
}

const screenRow = (page: Page, scene: string, part: string) => page.getByRole('group', { name: new RegExp(`^${part} In (Episode \\d+, )?Scene \\d+ \\(${scene}\\)$`) });

async function recordTime(page: Page, scene: string, part: string, on: string, heard: string): Promise<void> {
  const r = screenRow(page, scene, part);
  await r.getByLabel(`${part} On Screen (Minutes)`).fill(on);
  await r.getByLabel(`${part} Heard Only (Minutes)`).fill(heard);
  await r.getByRole('button', { name: 'Record' }).click();
  await expect(r.getByText(new RegExp(`Recorded: ${on === '0' ? '0 minutes' : on} `))).toBeVisible();
}

test('Emmys guest: the 5% rule reads screen time recorded from the cut; two share the same minutes, heard-only doesn\'t count, a shorter version changes it, and the entry keeps what it was entered with', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2027-02-01');
  await newProject(page, { title: 'Harbor Lights', format: 'Series', episodes: '2', runtime: '50' });
  await section(page, 'Characters');
  for (const n of ['Ines', 'Marcus']) {
    await page.getByLabel('Character Name').fill(n);
    await page.getByRole('button', { name: 'Add Character' }).click();
  }
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Harbor', chars: ['Ines'], minutes: '46' });
  await addScene(page, { index: 1, place: 'Dock', chars: ['Ines', 'Marcus'], minutes: '4' });
  await addScene(page, { index: 2, place: 'Market', chars: ['Ines'], minutes: '15' });
  await addScene(page, { index: 3, place: 'Corridor', chars: ['Ines'], minutes: '2', episodeButton: 'Add Scene To Episode 2' });
  await saveAndApprove(page);
  await editSave(page, (s) => {
    const p = shotAndAssembled(s, 'Harbor Lights', []);
    p.edit.pictureLocked = true;
    p.axes.register = 'drama';
    p.axes.episodeCount = 6;
    Object.assign(p.drafts.find((d: State) => d.number === p.approvedDraft).characters.find((c: State) => c.name === 'Marcus'), { roleSize: 'small', seriesInvolvement: 'guest', awardPlacement: 'none' });
  });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbor Lights' }).click();
  await section(page, 'Edit');
  const card = page.getByRole('region', { name: 'Screen Time' });
  await card.getByText(/^Episode 1 \(/).click(); // each episode's scenes are folded until opened
  await expect(screenRow(page, 'Dock', 'Marcus').getByText('Not recorded: unknown')).toBeVisible();
  // Marcus is a voice on the phone for the whole scene; Ines is on screen for all of it.
  await recordTime(page, 'Dock', 'Ines', '4', '0');
  await recordTime(page, 'Dock', 'Marcus', '0', '4');
  await expect(card.getByText(/Marcus: 0 minutes on screen recorded, 0% of 65 minutes; 4 minutes heard only\./)).toBeVisible();
  await card.screenshot({ path: `test-results/screen-time-card-${test.info().project.name}.png` });
  // More than the scene runs is refused.
  await screenRow(page, 'Dock', 'Marcus').getByLabel('Marcus On Screen (Minutes)').fill('5');
  await screenRow(page, 'Dock', 'Marcus').getByRole('button', { name: 'Record' }).click();
  await expect(page.getByRole('alert').getByText('The scene runs 4 minutes; nobody is on screen longer than that.')).toBeVisible();
  // A Festival Cut without the market: the episode runs 50 minutes there.
  const versions = page.getByRole('region', { name: 'Versions' });
  await versions.getByRole('checkbox', { name: /Market/ }).check();
  await versions.getByRole('button', { name: 'Add Version' }).click();
  await expect(versions.getByText(/Festival Cut.*52 minutes/)).toBeVisible();
  await editSave(page, (s) => {
    const p = deliver(s, 'Harbor Lights', { format: 'series', runtime: 67, at: '2026-08-01T20:00:00Z', quality: { overall: 70 },
      releases: [{ id: 'r1', route: 'broadcast', date: '2026-10-01', territories: ['US'], distributor: 'Channel Nine', note: '', status: 'released' }],
      credits: [credit('cr9', 'player', s.character.name, 'Cast', 'actor', { characterName: 'Marcus', episodes: [1] })] });
    p.axes.episodeCount = 6;
  });
  await openEvent(page, 'Harbor Lights', 'Primetime Emmy Awards 2027');
  await filterTo(page, 'Harbor Lights', 'Every Category');
  const guest = row(page, 'Outstanding Guest Actress In A Drama Series');
  await expect(guest.getByText("Marcus is on screen 0 minutes of episode 1 (65 minutes), 0%, as recorded from the cut, besides 4 minutes heard but not seen, which doesn't count; this category needs 5% (3.3 minutes).")).toBeVisible();
  // Seen for 2.5 minutes: in the main cut's 65-minute episode, still short.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbor Lights' }).click();
  await section(page, 'Edit');
  await card.getByText(/^Episode 1 \(/).click();
  await recordTime(page, 'Dock', 'Marcus', '2.5', '0');
  await openEvent(page, 'Harbor Lights', 'Primetime Emmy Awards 2027');
  await filterTo(page, 'Harbor Lights', 'Every Category');
  await expect(guest.getByText(/Marcus is on screen 2\.5 minutes of episode 1 \(65 minutes\), 3\.8%, as recorded from the cut; this category needs 5%/)).toBeVisible();
  // Entered with the Festival Cut, where the episode runs 50 minutes, it qualifies.
  await guest.getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await expect(dialog.getByRole('button', { name: 'Submit Entry' })).toBeDisabled();
  await dialog.getByLabel('Version To Enter').selectOption({ label: 'Festival Cut (52 Minutes)' });
  await expect(dialog.getByLabel('Screen Time Calculation').getByText('Marcus is on screen 2.5 minutes of episode 1 (50 minutes), 5%, as recorded from the cut; this category needs 5% (2.5 minutes).')).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  const mine = entry(page, 'Outstanding Guest Actress In A Drama Series');
  await mine.getByText('As Entered').click();
  await expect(mine.getByText(/Marcus is on screen 2\.5 minutes of episode 1 \(50 minutes\), 5%/)).toBeVisible();
  // Recorded differently afterwards, the entry keeps what it was entered with, through a save and reload.
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Harbor Lights' }).click();
  await section(page, 'Edit');
  await card.getByText(/^Episode 1 \(/).click();
  await recordTime(page, 'Dock', 'Marcus', '1', '0');
  await saveAndExit(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Harbor Lights', 'Primetime Emmy Awards 2027');
  await entry(page, 'Outstanding Guest Actress In A Drama Series').getByText('As Entered').click();
  await expect(entry(page, 'Outstanding Guest Actress In A Drama Series').getByText(/Marcus is on screen 2\.5 minutes of episode 1 \(50 minutes\), 5%/)).toBeVisible();
  await page.screenshot({ path: `test-results/awards-screen-time-${test.info().project.name}.png`, fullPage: true });
});

test('Emmys directing: each episode is entered with its own director and judged on its own work; the series on the season; an older delivery says it was judged on the season', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2027-02-01');
  await newProject(page, { title: 'Night Ward', format: 'Series', episodes: '2', runtime: '50' });
  await nav(page, 'Projects');
  await newProject(page, { title: 'Day Ward', format: 'Series', episodes: '2', runtime: '50' });
  const air = [{ id: 'r1', route: 'broadcast', date: '2026-10-01', territories: ['US'], distributor: 'Channel Nine', note: '', status: 'released' }];
  // Labelled fixture: delivered, with each episode's assessment as delivery locks it (computed and tested in
  // tests/episode-assessment.test.ts): episode 1, which you directed, was the weaker; episode 2, Ada Ruiz's, the stronger.
  await editSave(page, (s) => {
    for (const title of ['Night Ward', 'Day Ward']) {
      const p = deliver(s, title, { format: 'series', runtime: 100, at: '2026-08-01T20:00:00Z', releases: air, quality: { direction: 70 } });
      p.axes.register = 'drama';
      p.axes.episodeCount = 6;
      p.credits[0].episodes = [1];
      p.credits.push(credit('cr11', 'x-dir', 'Ada Ruiz', 'Directed By', 'episode-director', { episodes: [2] }));
      if (title === 'Night Ward') p.episodeQuality = { 1: { overall: 62, direction: 58, script: 70, craft: 66, reception: 62 }, 2: { overall: 80, direction: 86, script: 70, craft: 66, reception: 80 } };
    }
  });
  await openEvent(page, 'Night Ward', 'Primetime Emmy Awards 2027');
  await filterTo(page, 'Night Ward', 'Open To Night Ward');
  await row(page, 'Outstanding Directing For A Drama Series').getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await expect(dialog.getByText("Judged on episode 1's own work: its scenes, takes, writer, director, cast and crew.")).toBeVisible();
  await expect(dialog.getByText(/Credited for this entry: Nia Halvorsen-Mbeki\./)).toBeVisible();
  await dialog.getByLabel('Episode To Enter').selectOption({ label: 'Episode 2' });
  await expect(dialog.getByText("Judged on episode 2's own work: its scenes, takes, writer, director, cast and crew.")).toBeVisible();
  await expect(dialog.getByText(/Credited for this entry: Ada Ruiz\./)).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  await row(page, 'Outstanding Drama Series').getByRole('button', { name: 'Prepare Submission' }).click();
  await expect(dialog.getByText('Judged on the whole season.')).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  const directing = entry(page, 'Outstanding Directing For A Drama Series, Episode 2');
  await directing.getByText('As Entered').click();
  await expect(directing.getByText(/Judged on episode 2's own work.*Credited: Ada Ruiz, [^;]+\./)).toBeVisible();
  // A project delivered before episodes were assessed on their own: judged on the season, and the dialog says so.
  await openEvent(page, 'Day Ward', 'Primetime Emmy Awards 2027');
  await filterTo(page, 'Day Ward', 'Open To Day Ward');
  await row(page, 'Outstanding Directing For A Drama Series').getByRole('button', { name: 'Prepare Submission' }).click();
  await dialog.getByLabel('Episode To Enter').selectOption({ label: 'Episode 2' });
  await expect(dialog.getByText("Judged on the whole season: Day Ward was delivered before episodes were assessed on their own, so episode 2's own work wasn't recorded.")).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  // After a reload, the entries are as they were entered.
  await saveAndExit(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Night Ward', 'Primetime Emmy Awards 2027');
  await entry(page, 'Outstanding Directing For A Drama Series, Episode 2').getByText('As Entered').click();
  await expect(entry(page, 'Outstanding Directing For A Drama Series, Episode 2').getByText(/Credited: Ada Ruiz, [^;]+\./)).toBeVisible();
});

test('Songs: made in the Production tab with separate writers, one licensed; a version swaps one; the Oscar for Original Song goes to one song\'s own writers, never the licensed song\'s', async ({ page }) => {
  await quickLife(page, 'us-los-angeles', '2026-09-01');
  await newProject(page, { title: 'Night Ferry', format: 'Feature Film', runtime: '100' });
  await section(page, 'Characters');
  await page.getByLabel('Character Name').fill('Lena');
  await page.getByRole('button', { name: 'Add Character' }).click();
  await section(page, 'Script');
  await addScene(page, { index: 0, place: 'Ferry', chars: ['Lena'], minutes: '50' });
  await addScene(page, { index: 1, place: 'Pier', chars: ['Lena'], minutes: '50' });
  // Three songs: one commissioned from a songwriter and a lyricist, one licensed, one written by you.
  await section(page, 'Production');
  const songs = page.getByRole('region', { name: 'Songs' });
  const make = async (title: string, source: string, extra: (s: Locator) => Promise<void> = async () => {}) => {
    await songs.getByLabel('Song Title').fill(title);
    await songs.getByLabel('Where It Comes From').selectOption({ label: source });
    await extra(songs);
    await songs.getByRole('button', { name: 'Add Song' }).click();
    await expect(songs.getByRole('listitem', { name: `Song: ${title}` })).toBeVisible();
  };
  await make('Salt Water', 'Commission It From A Songwriter', async (s) => { await s.getByLabel('Lyrics').selectOption({ label: 'Commissioned From A Lyricist' }); });
  await make('Harbour Lights', 'An Existing Song, Licensed', async (s) => { await s.getByLabel('Music By').fill('Ada Brook'); await s.getByLabel('Lyrics By').fill('Ada Brook'); await s.getByLabel('Rights Holder').fill('Tidewater Music'); });
  await make('Lantern', 'Write It Yourself');
  const song = (t: string) => songs.getByRole('listitem', { name: `Song: ${t}` });
  await expect(song('Salt Water').getByText('Original', { exact: true })).toBeVisible();
  await expect(song('Salt Water').getByText('Credited to whoever writes it, once the writing is done.')).toBeVisible();
  await expect(song('Harbour Lights').getByText('Licensed', { exact: true })).toBeVisible();
  await expect(song('Harbour Lights').getByText('Written by Ada Brook.')).toBeVisible();
  const use = async (t: string, scene: RegExp, how: string) => {
    await song(t).getByLabel(`Scene For ${t}`).selectOption({ label: (await song(t).getByLabel(`Scene For ${t}`).locator('option').allInnerTexts()).find((o) => scene.test(o))! });
    await song(t).getByLabel('How It Plays').selectOption({ label: how });
    await song(t).getByRole('button', { name: `Use ${t} In This Scene` }).click();
    await expect(song(t).locator('span.grow', { hasText: new RegExp(`${scene.source}.*${how}`) })).toBeVisible();
  };
  await use('Salt Water', /Ferry/, 'Performed On Screen');
  await use('Harbour Lights', /Pier/, 'In The Background');
  await use('Lantern', /Pier/, 'Over The End Credits');
  await expect(song('Lantern').getByText(/the only song over the end credits/)).toBeVisible();
  await song('Salt Water').getByRole('checkbox', { name: 'Lena Performs Salt Water' }).check();
  await expect(song('Salt Water').getByText(/Performed by Lena\./)).toBeVisible();
  await songs.screenshot({ path: `test-results/songs-card-${test.info().project.name}.png` });
  // The script shows each scene's songs.
  await section(page, 'Script');
  await page.locator('article.scene-card').nth(1).getByRole('button', { name: 'Edit Scene' }).click();
  await expect(page.locator('article.scene-card').nth(1).getByRole('checkbox', { name: '"Harbour Lights" In This Scene' })).toBeChecked();
  await expect(page.locator('article.scene-card').nth(1).getByRole('checkbox', { name: '"Salt Water" In This Scene' })).not.toBeChecked();
  await page.locator('article.scene-card').nth(1).getByRole('button', { name: 'Close Scene' }).click();
  await saveAndApprove(page);
  // Labelled fixture: produced and locked (the songs' writing, recording and credits are played through in
  // tests/songs.test.ts), with a Distribution Cut to conform.
  await editSave(page, (s) => {
    const p = shotAndAssembled(s, 'Night Ferry', []);
    p.edit.pictureLocked = true;
    p.versions = [{ id: 'ver-d', label: 'Distribution Cut', leaveOut: [] }];
  });
  await nav(page, 'Projects');
  await page.getByRole('button', { name: 'Night Ferry' }).click();
  await section(page, 'Edit');
  const versions = page.getByRole('region', { name: 'Versions' });
  await versions.getByLabel(/Distribution Cut: .*Pier.*, In Place Of "Harbour Lights"/).selectOption({ label: '"Lantern" Instead' });
  await expect(versions.getByLabel(/Distribution Cut: .*Pier.*, In Place Of "Harbour Lights"/)).toHaveValue(/.+/);
  await section(page, 'Production');
  await expect(song('Harbour Lights').locator('span.grow', { hasText: /Pier.*In The Background/ })).toBeVisible(); // the main cut keeps it
  await editSave(page, (s) => {
    const p = deliver(s, 'Night Ferry', { format: 'feature', runtime: 100, at: '2026-08-01T20:00:00Z',
      releases: [{ id: 'r1', route: 'theatrical', date: '2026-08-15', territories: ['US'], distributor: 'Harbor & Vine', note: '', status: 'released' }],
      credits: [credit('cr5', 'np_composer_US_1', 'Iris Varga', 'Composer', 'composer')] });
    const salt = p.songs.find((x: State) => x.title === 'Salt Water');
    salt.writers = [{ who: 'np_songwriter_US_1', name: 'Teo Holt', music: true }, { who: 'np_lyricist_US_1', name: 'Mina Okoro', lyrics: true }];
    const lantern = p.songs.find((x: State) => x.title === 'Lantern');
    lantern.writers = [{ who: 'player', name: s.character.name, music: true, lyrics: true }];
    // The song work the version change put on the task list, finished (played through in tests/songs.test.ts).
    for (const t of p.tasks.filter((x: State) => x.id.startsWith('song:'))) Object.assign(t, { status: 'done', done: t.units });
    p.credits.push(
      credit('cr20', 'np_songwriter_US_1', 'Teo Holt', 'Song Music By ("Salt Water")', 'songwriter', { songId: salt.id }),
      credit('cr21', 'np_lyricist_US_1', 'Mina Okoro', 'Song Lyrics By ("Salt Water")', 'lyricist', { songId: salt.id }),
      credit('cr22', 'player', s.character.name, 'Song Written By ("Lantern")', 'songwriter', { songId: lantern.id }),
      credit('cr23', 'songwriter:x', 'Ada Brook', 'Song Written By ("Harbour Lights")', 'songwriter', { songId: p.songs.find((x: State) => x.title === 'Harbour Lights').id }));
  });
  await openEvent(page, 'Night Ferry', '99th Academy Awards');
  await filterTo(page, 'Night Ferry', 'Open To Night Ferry');
  await row(page, 'Music (Original Song)').getByRole('button', { name: 'Prepare Submission' }).click();
  const dialog = page.getByRole('dialog', { name: 'Prepare Submission' });
  await expect(dialog.getByText(/Credited for this entry: Teo Holt, Mina Okoro\./)).toBeVisible(); // not the composer
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Harbour Lights"' });
  await expect(dialog.getByText('"Harbour Lights" is licensed; an original song award takes a song written for the work.')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Submit Entry' })).toBeDisabled();
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Lantern"' });
  await expect(dialog.getByText(/Credited for this entry: Nia Halvorsen-Mbeki\./)).toBeVisible();
  await dialog.getByLabel('Song To Enter').selectOption({ label: '"Salt Water"' });
  await expect(dialog.getByText('Judged on the writing of "Salt Water".')).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  await expect(entry(page, 'Music (Original Song), "Salt Water"').locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();
  // A film enters each of its songs on its own (up to three at the Oscars): Lantern, the only end-credits song, too.
  await row(page, 'Music (Original Song)').getByRole('button', { name: 'Prepare Submission' }).click();
  await expect(dialog.getByLabel('Song To Enter')).toHaveValue(/.+/);
  await expect(dialog.getByRole('option', { name: '"Salt Water" (Entered)' })).toHaveCount(1);
  await expect(dialog.getByText(/Credited for this entry: Nia Halvorsen-Mbeki\./)).toBeVisible();
  await dialog.getByRole('button', { name: 'Submit Entry' }).click();
  await expect(dialog).toBeHidden();
  await expect(entry(page, 'Music (Original Song), "Lantern"').locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();
  await saveAndExit(page);
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Night Ferry', '99th Academy Awards');
  await entry(page, 'Music (Original Song), "Salt Water"').getByText('As Entered').click();
  await expect(entry(page, 'Music (Original Song), "Salt Water"').getByText('Credited: Teo Holt, Song Music By ("Salt Water"); Mina Okoro, Song Lyrics By ("Salt Water"). Song: "Salt Water", by Teo Holt and Mina Okoro.', { exact: false })).toBeVisible();
  await page.screenshot({ path: `test-results/awards-songs-${test.info().project.name}.png`, fullPage: true });
});

// ---------------- The owner's recovered sources (November 9, 2026) ----------------

/** An edition's label as the game names it (some carry an ordinal), from the save. */
async function labelOf(page: Page, editionId: string): Promise<string> {
  return (await readSavedState(page)).editions.find((e: State) => e.id === editionId).label;
}
const rel = (date: string, route: string, territories: string[]) => ({ id: `r-${route}-${territories.join('')}-${date}`, route, date, territories, distributor: 'D', note: '', status: 'released' });

test('Busan 2026: the organizer\'s dates; an Asian feature selected and judged; a long short and a short documentary told why not', async ({ page }) => {
  await seededLife(page, 'kr-seoul', '2026-05-20', 3101); // before the shorts' June 2 deadline and the features' July 8
  for (const [title, format, runtime] of [['Harbour Lantern', 'Feature Film', '100'], ['Salt Fog', 'Short Film', '31'], ['Tide Notes', 'Documentary Short', '20']] as const) {
    await nav(page, 'Projects');
    await newProject(page, { title, format, runtime });
  }
  // Labelled fixture: finished in Seoul in February 2026.
  await editSave(page, (s) => {
    deliver(s, 'Harbour Lantern', { format: 'feature', runtime: 100, at: '2026-02-01T03:00:00Z', base: 'kr-seoul', quality: { overall: 99, direction: 99, script: 99, reception: 99 } });
    deliver(s, 'Salt Fog', { format: 'short', runtime: 31, at: '2026-02-01T03:00:00Z', base: 'kr-seoul' });
    deliver(s, 'Tide Notes', { format: 'documentary-short', runtime: 20, at: '2026-02-01T03:00:00Z', base: 'kr-seoul' });
  });
  const label = await labelOf(page, 'busan-2026');
  await openEvent(page, 'Harbour Lantern', label);
  await expect(page.getByText('October 6, 2026 to October 15, 2026')).toBeVisible();
  await expect(page.getByText(/These dates were announced by the organizer\./)).toBeVisible();
  await filterTo(page, 'Salt Fog', 'Every Section And Award');
  await expect(row(page, 'Short Films').getByText('It runs 31 minutes. This category takes 30 minutes or less, credits included.')).toBeVisible();
  await filterTo(page, 'Tide Notes', 'Every Section And Award');
  await expect(row(page, 'Short Films').getByText('This category doesn\'t accept documentary short projects.')).toBeVisible();
  await filterTo(page, 'Harbour Lantern');
  await submit(page, 'Competition', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');

  await advanceUntil(page, await dayAfter(page, 'busan-2026', 'announce'));
  await openEvent(page, 'Harbour Lantern', label);
  // Busan's Competition has no prizes of its own in the catalog, so the selection is the outcome, kept through the festival.
  const picked = await status(entry(page, 'Competition'), ['Selected', 'Not Selected']);
  await advanceUntil(page, await dayAfter(page, 'busan-2026', 'end'));
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Harbour Lantern', label);
  await status(entry(page, 'Competition'), [picked]);
  const s = await readSavedState(page);
  expect(s.editions.find((e: State) => e.id === 'busan-2026').rulesId).toBe('busan-2026@1');
});

test('European Film Awards: a European director, three countries and the first screening\'s submission period; entered, judged and kept after a reload', async ({ page }) => {
  await seededLife(page, 'fr-paris', '2026-05-20', 3102);
  for (const title of ['Quiet Harbour', 'Late Light', 'One Room']) {
    await nav(page, 'Projects');
    await newProject(page, { title, format: 'Feature Film', runtime: '100' });
  }
  // Labelled fixture: French features, you directing, writing, scoring and leading; first shown in March (three countries),
  // June (three countries) and March (France only).
  const extra = (s: State) => [credit('cr4', 'player', s.character.name, 'Music By', 'composer'), credit('cr5', 'player', s.character.name, 'Cast', 'actor', { characterName: 'Lea' })];
  await editSave(page, (s) => {
    deliver(s, 'Quiet Harbour', { format: 'feature', runtime: 100, at: '2026-01-10T12:00:00Z', base: 'fr-paris', credits: extra(s), releases: ['FR', 'DE', 'IT'].map((c) => rel('2026-03-01', 'theatrical', [c])), quality: { overall: 99, direction: 99, script: 99, reception: 99 } });
    deliver(s, 'Late Light', { format: 'feature', runtime: 100, at: '2026-01-10T12:00:00Z', base: 'fr-paris', credits: extra(s), releases: ['FR', 'DE', 'IT'].map((c) => rel('2026-06-10', 'theatrical', [c])) });
    deliver(s, 'One Room', { format: 'feature', runtime: 100, at: '2026-01-10T12:00:00Z', base: 'fr-paris', credits: extra(s), releases: [rel('2026-03-01', 'theatrical', ['FR'])] });
  });
  const label = await labelOf(page, 'european-film-awards-2026');
  // You were born in Nairobi: the director the award asks for is European.
  await openEvent(page, 'Quiet Harbour', label);
  await filterTo(page, 'Quiet Harbour', 'Every Category');
  await expect(row(page, 'European Film').getByText('This award is for films by directors from Europe; you are from Kenya.')).toBeVisible();
  // Labelled fixture: the same life, born in Paris.
  await editSave(page, (s) => { s.character.birthplaceId = 'fr-paris'; });
  await openEvent(page, 'Quiet Harbour', label);
  await filterTo(page, 'One Room', 'Every Category');
  await expect(row(page, 'European Film').getByText('It needs a festival selection, or a theatrical release in at least 3 countries; it has one.')).toBeVisible();
  await filterTo(page, 'Late Light', 'Every Category');
  await expect(row(page, 'European Film').getByText('Entries for this work open on June 15, 2026.')).toBeVisible();
  await filterTo(page, 'Quiet Harbour');
  await submit(page, 'European Film', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');

  // From June 15 the June film's period opens; the May one has closed.
  await advanceUntil(page, '2026-06-16');
  await openEvent(page, 'Late Light', label);
  await filterTo(page, 'Late Light');
  await row(page, 'European Film').getByRole('button', { name: 'Prepare Submission' }).click();
  await page.getByRole('dialog', { name: 'Prepare Submission' }).getByRole('button', { name: 'Submit Entry' }).click();
  await expect(entry(page, 'Late Light: European Film').locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();

  await advanceUntil(page, await dayAfter(page, 'european-film-awards-2026', 'announce'));
  await openEvent(page, 'Quiet Harbour', label);
  const nominated = await status(entry(page, 'Quiet Harbour: European Film'), ['Nominated', 'Not Nominated']);
  await advanceUntil(page, await dayAfter(page, 'european-film-awards-2026', 'end'));
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'Quiet Harbour', label);
  await status(entry(page, 'Quiet Harbour: European Film'), nominated === 'Nominated' ? ['Winner', 'Did Not Win'] : ['Not Nominated']);
  await status(entry(page, 'Late Light: European Film'), ['Nominated', 'Not Nominated', 'Winner', 'Did Not Win']);
});

test('International Emmys: hanging episodes and a first airing outside the US decide the year; entered and kept after a reload', async ({ page }) => {
  await quickLife(page, 'gb-london', '2026-12-10');
  for (const title of ['North Line', 'Late Tide', 'Same Day']) {
    await nav(page, 'Projects');
    await newProject(page, { title, format: 'Series', episodes: '6', runtime: '50' });
  }
  // Labelled fixture: British dramas of six 50-minute episodes, aired weekly on British television from June 1 and
  // December 24, 2026, and one streamed in the United States on the day it aired in Britain.
  await editSave(page, (s) => {
    const series = (title: string, releases: State[]) => { const p = deliver(s, title, { format: 'series', runtime: 300, at: '2026-04-01T12:00:00Z', base: 'gb-london', releases }); p.axes.episodeCount = 6; };
    series('North Line', [rel('2026-06-01', 'broadcast', ['GB'])]);
    series('Late Tide', [rel('2026-12-24', 'broadcast', ['GB'])]);
    series('Same Day', [rel('2026-05-01', 'broadcast', ['GB']), rel('2026-05-01', 'streaming', ['US'])]);
  });
  const label = await labelOf(page, 'international-emmys-2027');
  await openEvent(page, 'North Line', label);
  await expect(page.getByText('January 1, 2026 to December 31, 2026')).toBeVisible(); // the eligibility period shown is the rules'
  await filterTo(page, 'Late Tide', 'Every Category');
  await expect(row(page, 'Drama Series').getByText('2 of its 6 episodes air between January 1, 2026 and December 31, 2026; a season counts in the year most of its episodes aired.')).toBeVisible();
  await filterTo(page, 'Same Day', 'Every Category');
  await expect(row(page, 'Drama Series').getByText('It aired in the United States first (on the same day as elsewhere); this competition takes work first broadcast outside the United States.')).toBeVisible();
  await filterTo(page, 'North Line');
  await submit(page, 'Drama Series', /goes to the credited producers\./, 'Nia Halvorsen-Mbeki');
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openEvent(page, 'North Line', label);
  await expect(entry(page, 'Drama Series').locator('.chip', { hasText: /^Submitted$/ })).toBeVisible();
  const s = await readSavedState(page);
  const e = s.editions.find((x: State) => x.id === 'international-emmys-2027');
  expect(e.entries.map((x: State) => x.categoryId)).toEqual(['drama']);
  expect(e.entries[0].snapshot.score).toBeGreaterThan(0); // what it was entered with is kept
});
