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
