// A whole brief proposed from a real work (engine/proposal.ts; the v4 package, 01; ledger V4-004 and V4-002).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../src/data/genre-registry.json';
import { applyBlueprint, blueprintProblems, briefFields } from '../src/engine/blueprints';
import { SALES_CLAIM, createFromSource, fieldOrigin, proposeFromSource } from '../src/engine/proposal';
import { creditLine } from '../src/engine/adaptation';
import { deserialize, serialize } from '../src/engine/save';
import type { SourceWork } from '../src/engine/sources';
import { newGame } from '../src/engine/state';
import type { Format } from '../src/engine/types';
import { draft } from './fixtures';

const GENRES = new Set((registry as { records: { id: string }[] }).records.map((r) => r.id));
const catalog = JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as { records: SourceWork[] };

/** A labelled fixture work with everything recorded, and one with nothing beyond its title. */
const full: SourceWork = {
  id: 'wd:Q1', title: 'The Glass Harbour', medium: 'novel', kind: 'literary work', description: 'novel by A. Writer', creators: [{ id: 'wd:Q2', name: 'A. Writer', role: 'author' }],
  year: 1931, languages: ['English'], countries: [], recordedGenres: [], genres: [{ genre: 'mystery', because: 'fixture' }], series: { id: 'wd:Q12', name: 'The Harbour Books' }, copyright: [], link: '', article: null,
  provenance: { source: 'fixture', licence: 'none', retrieved: '2026-11-12' }, wikipedias: 1,
  characters: [{ id: 'wd:Q3', name: 'Ines Carvalho', gender: 'female' }, { id: 'wd:Q4', name: 'Tomas Reyes', gender: 'male' }, { id: 'wd:Q5', name: 'Old Pell' }, { id: 'wd:Q6', name: 'The Harbourmaster' }, { id: 'wd:Q7', name: 'Mara Quill', gender: 'female' }],
  places: [{ id: 'wd:Q8', name: 'Lisbon' }], periods: ['interwar period'], subjects: ['grief', 'smuggling'], follows: null, followedBy: { id: 'wd:Q9', title: 'The Iron Tide' },
  adaptations: [{ id: 'wd:Q10', title: 'The Glass Harbour', kind: 'film', year: 1950 }], adaptationCount: 1,
  summary: { text: 'Tomas Reyes, a customs clerk, finds Ines Carvalho hiding a ledger.', from: 'English Wikipedia', article: 'The Glass Harbour', link: '', licence: 'CC BY-SA 4.0', retrieved: '2026-11-12' },
};
const bare: SourceWork = { ...full, id: 'wd:Q11', title: 'Untold', genres: [], characters: [], places: [], periods: [], subjects: [], followedBy: null, adaptations: [], adaptationCount: 0, summary: null, year: null };
const propose = (work: SourceWork, format: Format = 'feature', approach: 'faithful' | 'updated' | 'free' = 'faithful', minutes?: number) => proposeFromSource({ work, format, approach, gameYear: 2027, minutes, genres: GENRES });

describe('a proposal from a work', () => {
  it('is a structurally complete brief for every work in the catalog, as a film and as a series', () => {
    expect(catalog.records.length).toBeGreaterThanOrEqual(500);
    for (const w of catalog.records) for (const f of ['feature', 'series'] as const) {
      const { blueprint } = proposeFromSource({ work: w, format: f, approach: 'faithful', gameYear: 2027, genres: GENRES });
      expect(blueprintProblems(blueprint, GENRES), `${w.id} ${f}`).toEqual([]);
    }
  });

  it('says which fields are the work\'s and which are the game\'s, and invents nothing it presents as the work\'s', () => {
    const { blueprint: b, origin, why } = propose(full);
    expect(b.title).toBe('The Glass Harbour');
    expect(origin.title).toBe('sourced');
    expect(origin.genres).toBe('sourced');
    expect(b.genre).toBe('mystery');
    // The premise is the article's own words, and says so; the synopsis is a proposal and says it is not the plot.
    expect(b.premise).toBe(full.summary!.text);
    expect(origin['story.premise']).toBe('sourced');
    expect(why['story.premise']).toContain('The English Wikipedia article "The Glass Harbour"');
    expect(origin['story.synopsis']).toBe('proposed');
    expect(why['story.synopsis']).toContain("not The Glass Harbour's plot");
    // The recorded people, the one the summary names first leading; their roles proposed.
    expect(origin.characters).toBe('sourced');
    expect(b.characters[0]).toMatchObject({ name: 'Tomas Reyes', functions: ['protagonist'], pronouns: 'he/him', age: '-' });
    expect(b.characters[1].name).toBe('Ines Carvalho');
    expect(b.characters.find((c) => c.name === 'Old Pell')!.pronouns).toBe('they/them'); // none recorded: not guessed
    expect(origin.setting).toBe('sourced');
    expect(b.setting.name).toBe('Lisbon');
    expect(origin.year).toBe('sourced');
    expect(why.year).toContain('interwar period');
    expect(b.themes).toEqual(['grief', 'smuggling']);
    expect(origin['story.theme']).toBe('sourced');
    // A faithful adaptation's ending is the work's, which is not recorded: said, not invented.
    expect(origin['story.ending']).toBe('unknown');
    expect(b.ending).toContain('does not record how The Glass Harbour ends');
  });

  it('leads with the characters most written about, and makes each what its record says it is', () => {
    const horse: SourceWork = { ...full, characters: [{ id: 'wd:Q20', name: 'Rocinante', kind: 'fictional horse', sitelinks: 30 }, { id: 'wd:Q21', name: 'Alonso', gender: 'male', kind: 'fictional human', sitelinks: 90 }, { id: 'wd:Q22', name: 'Tomas Reyes', sitelinks: 2 }] };
    const b = propose(horse).blueprint;
    expect(b.characters.map((c) => c.name)).toEqual(['Alonso', 'Rocinante', 'Tomas Reyes']); // not the one the summary names first
    expect(b.characters.map((c) => c.entity)).toEqual(['human', 'animal', 'human']);
  });

  it('with nothing recorded, says so field by field and names the parts for what they do', () => {
    const { blueprint: b, origin, why } = propose(bare);
    expect(blueprintProblems(b, GENRES)).toEqual([]);
    expect(origin.characters).toBe('unknown');
    expect(b.characters.map((c) => c.name)).toEqual(['The Lead', 'The Rival', 'The Ally']);
    expect(why.characters).toContain('No characters are recorded for Untold');
    expect(origin.setting).toBe('unknown');
    expect(origin['story.premise']).toBe('proposed');
    expect(why['story.premise']).toContain('the game\'s proposal, not the work\'s story');
    expect(origin.genres).toBe('proposed');
    expect(origin.year).toBe('unknown');
  });

  it('the approach changes when it is set and how it ends, and nothing else', () => {
    const faithful = propose(full, 'feature', 'faithful');
    const updated = propose(full, 'feature', 'updated');
    const free = propose(full, 'feature', 'free');
    expect([faithful.blueprint.year, faithful.blueprint.time]).toEqual([null, 'period']);
    expect([updated.blueprint.year, updated.blueprint.time]).toEqual([2027, 'contemporary']);
    expect(updated.origin.year).toBe('proposed');
    expect(updated.origin['story.ending']).toBe('unknown'); // moved in time, its ending still the work's
    expect(free.origin['story.ending']).toBe('proposed');
    // The people, the outline's shape and the premise are the same whichever approach.
    for (const x of [updated, free]) {
      expect(x.blueprint.characters).toEqual(faithful.blueprint.characters);
      expect(x.blueprint.scenes.length).toBe(faithful.blueprint.scenes.length);
      expect(x.blueprint.premise).toBe(faithful.blueprint.premise);
    }
  });

  it('fits the work to the format: a short follows one strand, a feature compresses, a series has its season', () => {
    const short = propose(full, 'short', 'faithful', 12);
    const feature = propose(full, 'feature', 'faithful', 95);
    const series = propose(full, 'series');
    expect(short.blueprint.characters.length).toBe(3);
    expect(feature.blueprint.characters.length).toBe(5);
    expect(short.blueprint.scenes.length).toBe(5);
    expect(feature.blueprint.scenes.length).toBe(8);
    expect(short.notes.join(' ')).toContain('A short can hold one strand of a novel');
    expect(short.notes.join(' ')).toContain('The Glass Harbour records 5 characters');
    expect(feature.notes.join(' ')).toContain('A 95-minute film compresses The Glass Harbour');
    expect(series.blueprint.tv!.episodes).toBe(6);
    expect(series.blueprint.tv!.eps.map((e) => e.title)).toHaveLength(6);
    expect(new Set(series.blueprint.tv!.eps.map((e) => e.title)).size).toBe(6);
    expect(series.blueprint.tv!.continuation).toContain('followed by The Iron Tide in The Harbour Books (recorded)');
    // Followed by something but in no recorded series: the maker's next work, not a next season.
    const standalone = propose({ ...full, series: null }, 'series');
    expect(standalone.blueprint.tv!.continuation).not.toContain('The Iron Tide');
    expect(standalone.origin['series.continuation']).toBe('proposed');
    expect(series.origin['series.continuation']).toBe('sourced');
    expect(series.notes.join(' ')).toContain('followed by The Iron Tide');
    // An earlier adaptation is named, and does not stop this one.
    expect(feature.notes.join(' ')).toContain('has been adapted before (1 recorded, among them The Glass Harbour, 1950)');
  });
});

describe('creating a project from a work', () => {
  const start = () => newGame(draft(), 0, 'save-proposal');
  const make = (s = start(), approach: 'faithful' | 'free' = 'faithful') => ({ s, p: createFromSource(s, { work: full, axes: { format: 'feature', medium: 'live-action' }, scenarioId: 'low', approach, genres: GENRES, names: { tomas_reyes: 'Tomás Reyes' } }) });

  it('makes one project, adapted from the work, with the whole brief, the people, the outline and each field\'s origin', () => {
    const { s, p } = make();
    expect(s.projects).toEqual([p]);
    expect(p.source).toMatchObject({ kind: 'adapted', ref: { id: 'wd:Q1', title: 'The Glass Harbour' } });
    expect(p.characters.map((c) => c.name)).toContain('Tomás Reyes');
    expect(p.scenes.length).toBe(8);
    expect(p.relationships.length).toBe(2);
    expect(p.story.premise).toBe(full.summary!.text);
    expect(p.blueprint).toBeUndefined(); // not "an original story written for this game"
    expect(p.proposal).toMatchObject({ workId: 'wd:Q1', title: 'The Glass Harbour', approach: 'faithful' });
    expect(fieldOrigin(p, 'story.premise')).toBe('sourced');
    expect(fieldOrigin(p, 'story.logline')).toBe('proposed');
    expect(fieldOrigin(p, 'story.ending')).toBe('unknown');
    // A field the player rewrites is theirs from then on; the others are as they were.
    p.story.logline = 'My own logline.';
    expect(fieldOrigin(p, 'story.logline')).toBe('edited');
    expect(fieldOrigin(p, 'story.premise')).toBe('sourced');
    expect(briefFields(p)['story.logline']).toBe('My own logline.');
  });

  // Until November 13, 2026 a project declared what a free adaptation changes, for the rights holder to read against an
  // agreement (adaptation.ts, "Copyright"). Nothing read it after that, and the field went.

  it('revising from the work keeps the player\'s words and people unless they choose, and writes only the fields left open', () => {
    const { s, p } = make();
    p.story.logline = 'My own logline.';
    const people = p.characters.length; const scenes = p.scenes.length;
    const again = proposeFromSource({ work: full, format: 'feature', approach: 'faithful', gameYear: 2027, minutes: p.axes.targetRuntimeMin, genres: GENRES });
    // Kept: the logline (theirs), the people and the outline; the synopsis is written again.
    p.story.synopsis = 'Old synopsis.';
    p.proposal!.applied['story.synopsis'] = 'Old synopsis.';
    applyBlueprint(s, p, again.blueprint, { keep: ['story.logline', 'characters', 'relationships', 'scenes'] }, again);
    expect(p.story.logline).toBe('My own logline.');
    expect(fieldOrigin(p, 'story.logline')).toBe('edited');
    expect(p.story.synopsis).toBe(again.blueprint.synopsis.replace(/\{(\w+)\}/g, (_m, k: string) => again.blueprint.characters.find((c) => c.key === k)!.name));
    expect(fieldOrigin(p, 'story.synopsis')).toBe('proposed');
    expect([p.characters.length, p.scenes.length]).toEqual([people, scenes]);
    // Unticked, the proposal's people are added beside the project's; nobody is removed.
    applyBlueprint(s, p, again.blueprint, { keep: ['story.logline'] }, again);
    expect(p.characters.length).toBe(people * 2);
  });

  it('survives saving and loading whole', () => {
    const { s, p } = make();
    const back = deserialize(serialize(s)).projects[0];
    expect(back.proposal).toEqual(p.proposal);
    expect(back.scenes.length).toBe(p.scenes.length);
  });

  it('leaves nothing when it is refused', () => {
    const s = start();
    expect(() => createFromSource(s, { work: full, axes: { format: 'documentary-feature', medium: 'live-action' }, scenarioId: 'low', approach: 'faithful', genres: GENRES })).toThrow("A documentary isn't adapted from a work of fiction");
    expect(s.projects).toEqual([]);
  });
});

describe('a claim of sales or standing', () => {
  // The v4 package (ledger V4-003.05): best-selling is claimed only with a named list, metric, year and territory. The game
  // names none, so it makes no such claim, and a work's premise leaves out the article's sentences that do.
  it('is left out of a proposed premise, and the field says what was left out', () => {
    const w = catalog.records.find((x) => x.title === 'And Then There Were None')!;
    expect(w.summary!.text).toMatch(/best-selling/);
    const pr = propose(w);
    expect(pr.blueprint.premise).not.toMatch(SALES_CLAIM);
    expect(pr.blueprint.premise).toContain('Agatha Christie');
    expect(pr.why['story.premise']).toMatch(/less (a sentence|\d+ sentences) about its sales or standing, which the game can't vouch for\.$/);
    // Every work's proposed premise is free of them.
    for (const x of catalog.records) expect(propose(x).blueprint.premise).not.toMatch(SALES_CLAIM);
  });

  it('is never made in the game\'s own words', () => {
    const files = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []));
    const said = ['src/engine', 'src/ui'].flatMap(files).filter((f) => !f.endsWith('proposal.ts')).filter((f) => /best[- ]?sell/i.test(readFileSync(f, 'utf8')));
    expect(said).toEqual([]);
  });
});

// The work's story (November 13, 2026, the owner: "All adapted material should have a story behind it, even the
// copyrighted one"): the article's plot section, credited, tells the premise, the synopsis, a kept ending and every
// scene, across every episode of a series. A labelled fixture story for The Glass Harbour, four paragraphs.
describe('the work\'s story', () => {
  const STORY = [
    'Tomas Reyes, a customs clerk in Lisbon, finds Ines Carvalho hiding a ledger in the harbour office. He keeps her secret.',
    'Ines tells Tomas the ledger records the smuggling run by The Harbourmaster. Old Pell warns them both to leave it alone. Tomas copies the pages at night.',
    'The Harbourmaster discovers the copy and has Old Pell arrested. Ines and Tomas flee across the river. Mara Quill hides them in her loft.',
    'Tomas takes the ledger to the harbour court. The Harbourmaster is tried and convicted. Ines leaves Lisbon, and Tomas stays.',
  ];
  const plot = { from: 'English Wikipedia', article: 'The Glass Harbour', link: 'https://en.wikipedia.org/wiki/The_Glass_Harbour', licence: 'CC BY-SA 4.0', section: 'Plot', whole: true, retrieved: '2026-11-13', paragraphs: STORY };
  const told: SourceWork = { ...full, plot };
  const names = (t: string, b: { characters: { key: string; name: string }[] }) => b.characters.reduce((a, c) => a.split(`{${c.key}}`).join(c.name), t);
  const sentences = STORY.join(' ').split(/(?<=\.)\s+/);

  it('tells the premise, the logline, a concise synopsis and a kept ending from the story, each saying where it is from', () => {
    const { blueprint: b, origin, why } = propose(told);
    // The setup: how the story begins.
    expect(names(b.premise, b)).toBe(STORY[0]);
    expect(origin['story.premise']).toBe('sourced');
    expect(why['story.premise']).toBe('How the story begins: its setup, as the English Wikipedia article "The Glass Harbour", its Plot section, in its own words (CC BY-SA 4.0) tells it.');
    // The logline is the event that sets it going: the development after the setup, where none turns earlier.
    expect(names(b.logline, b)).toBe(sentences[2]);
    expect(origin['story.logline']).toBe('sourced');
    // The synopsis is concise: the sentence that says most in each development, not the article's paragraphs whole.
    expect(names(b.synopsis, b)).toBe([sentences[0], sentences[2], sentences[5], sentences[8]].join(' '));
    expect(why['story.synopsis']).toContain('the sentence that says most in each of its 4 developments');
    expect(names(b.ending, b)).toBe(STORY[3]);
    expect(origin['story.ending']).toBe('sourced');
    // A story whose end wasn't kept leaves the ending unrecorded; a free adaptation writes its own.
    expect(propose({ ...told, plot: { ...plot, whole: false } }).origin['story.ending']).toBe('unknown');
    expect(propose(told, 'feature', 'free').origin['story.ending']).toBe('proposed');
  });

  it('tells the scenes from the story\'s developments, in order, each with its purpose, not cut into equal runs', () => {
    const { blueprint: b, origin, why } = propose(told);
    expect(origin.scenes).toBe('sourced');
    expect(why.scenes).toContain('The story read as 4 developments (setup, inciting event, climax, resolution)');
    // Every scene is told in the story's own sentences, in the story's order.
    const at = b.scenes.map((x) => sentences.indexOf(names(x.action, b)));
    expect(at.every((x) => x >= 0)).toBe(true);
    expect(at).toEqual([...at].sort((x, y) => x - y));
    // Their purposes follow the developments' roles: the setup first, the resolution last, the climax before it.
    expect(b.scenes[0].objective).toBe('Establish the world and the people in it');
    expect(b.scenes.at(-1)!.objective).toBe('Show what has changed');
    expect(b.scenes.some((x) => x.objective === 'Settle the conflict')).toBe(true);
    // The parts follow the story's order.
    expect(b.scenes.map((x) => x.act)).toEqual([...b.scenes.map((x) => x.act)].sort((x, y) => ['Beginning', 'Middle', 'End'].indexOf(x) - ['Beginning', 'Middle', 'End'].indexOf(y)));
    expect(b.scenes[0].place).toBe('Lisbon'); // the story names it there
    expect(blueprintProblems(b, GENRES)).toEqual([]);
  });

  it('a series breaks its episodes at the story\'s developments, each with a purpose, and the project has scenes in each', () => {
    const { blueprint: b } = proposeFromSource({ work: told, format: 'series', approach: 'faithful', gameYear: 2027, episodes: 4, minutes: 25, genres: GENRES });
    expect([...new Set(b.scenes.map((x) => x.episode))]).toEqual([1, 2, 3, 4]);
    expect(b.scenes.map((x) => names(x.action, b)).join(' ')).toBe(sentences.join(' '));
    expect(names(b.tv!.eps[0].moves, b)).toMatch(/^Sets up the world and its people, and ends on what starts the story: /);
    expect(names(b.tv!.eps[3].moves, b)).toMatch(/^Brings it to its climax and shows what has changed: /);
    expect(blueprintProblems(b, GENRES)).toEqual([]);
    const s = newGame(draft(), 0, 'save-story');
    const p = createFromSource(s, { work: told, axes: { format: 'series', medium: 'live-action', episodeCount: 4, targetRuntimeMin: 25 }, scenarioId: 'low', approach: 'faithful', genres: GENRES });
    expect([1, 2, 3, 4].map((n) => p.scenes.filter((x) => x.episode === n).length).every((n) => n > 0)).toBe(true);
  });

  it('a work with no story told gets the game\'s own outline in every episode, and says it is the game\'s', () => {
    const { blueprint: b, origin, why } = proposeFromSource({ work: full, format: 'series', approach: 'faithful', gameYear: 2027, episodes: 5, genres: GENRES });
    expect([...new Set(b.scenes.map((x) => x.episode))]).toEqual([1, 2, 3, 4, 5]);
    expect(origin.scenes).toBe('proposed');
    expect(why.scenes).toBe('No story is recorded for The Glass Harbour. The outline is the game\'s own, a stretch of it in each of the 5 episodes; write the work\'s story into it.');
    expect(blueprintProblems(b, GENRES)).toEqual([]);
  });

  it('renames a character everywhere the story says them, and credits the article with the project', () => {
    const s = newGame(draft(), 0, 'save-story');
    const p = createFromSource(s, { work: told, axes: { format: 'feature', medium: 'live-action' }, scenarioId: 'low', approach: 'faithful', genres: GENRES, names: { tomas_reyes: 'Tomás Reyes' } });
    expect(p.story.premise).toBe(STORY[0].replace('Tomas Reyes', 'Tomás Reyes'));
    expect(p.scenes.map((x) => x.action).join(' ')).not.toContain('Tomas Reyes');
    expect(p.proposal!.story).toEqual({ article: 'The Glass Harbour', link: plot.link, section: 'Plot', licence: 'CC BY-SA 4.0' });
    expect(creditLine(p)).toBe('Based on The Glass Harbour, by A. Writer. No copyright status is recorded for The Glass Harbour. Its story outline is from the Plot section of the English Wikipedia article "The Glass Harbour" (CC BY-SA 4.0).');
    expect(deserialize(serialize(s)).projects[0].proposal).toEqual(p.proposal);
  });

  it('every work whose article tells a story proposes a complete brief from it, as a film and as a series', () => {
    const stories = JSON.parse(readFileSync('src/data/plots.json', 'utf8')) as { version: 1; plots: Record<string, SourceWork['plot']> };
    const with_ = catalog.records.filter((w) => stories.plots[w.id]).map((w) => ({ ...w, plot: stories.plots[w.id] }));
    expect(with_.length).toBeGreaterThan(0);
    for (const w of with_) for (const f of ['feature', 'series'] as const) {
      const { blueprint, origin } = proposeFromSource({ work: w, format: f, approach: 'faithful', gameYear: 2027, genres: GENRES });
      expect(blueprintProblems(blueprint, GENRES), `${w.id} ${f}`).toEqual([]);
      if (origin.scenes === 'sourced' && f === 'series') expect(new Set(blueprint.scenes.map((x) => x.episode)).size, `${w.id}`).toBe(6);
    }
  });
});

describe('a real work as the owner saw it (Grand Theft Auto III, November 13, 2026)', () => {
  it('counts its outline truly, sets the recorded year, keeps cast notes out of the story, and asks a question that fits its lead', () => {
    const stories = JSON.parse(readFileSync('src/data/plots.json', 'utf8')) as { plots: Record<string, SourceWork['plot']> };
    const rec = catalog.records.find((w) => w.title === 'Grand Theft Auto III')!;
    const { blueprint: b, notes } = proposeFromSource({ work: { ...rec, plot: stories.plots[rec.id] }, format: 'feature', approach: 'faithful', gameYear: 2027, minutes: 100, genres: GENRES });
    // A three-development story told a sentence at a time: the note counts sentences, never a negative number.
    expect(notes.join(' ')).not.toMatch(/keeps -\d/);
    expect(notes.join(' ')).toMatch(/told a sentence at a time/);
    // 'October 2001' names one year: it is the year the brief sets.
    expect(b.year).toBe(2001);
    // Who voiced whom is the game's making, not its story.
    const told = [b.synopsis, b.premise, b.logline, ...b.scenes.map((x) => x.action)].join(' ');
    expect(told).not.toMatch(/voiced by|\(Debi Mazar\)|\(Cynthia Farrell\)/);
    expect(b.question).not.toContain('themselves');
  });
});

describe('how long each proposed scene is', () => {
  it('shares the running time to the quarter minute, so short episodes are not made longer by being told in scenes', () => {
    // Five-minute episodes, each told in six scenes: a whole minute a scene made each six minutes long.
    const { blueprint: b } = proposeFromSource({ work: full, format: 'series', approach: 'faithful', gameYear: 2027, episodes: 2, minutes: 5, genres: GENRES });
    for (const e of [1, 2]) {
      const total = b.scenes.filter((x) => x.episode === e).reduce((a, x) => a + x.minutes, 0);
      expect(total, `episode ${e}`).toBeGreaterThan(3);
      expect(total, `episode ${e}`).toBeLessThanOrEqual(5.5);
    }
    expect(blueprintProblems(b, GENRES)).toEqual([]);
  });
});
