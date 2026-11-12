// A whole brief proposed from a real work (engine/proposal.ts; the v4 package, 01; ledger V4-004 and V4-002).
import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../src/data/genre-registry.json';
import { applyBlueprint, blueprintProblems, briefFields } from '../src/engine/blueprints';
import { SALES_CLAIM, createFromSource, fieldOrigin, proposeFromSource } from '../src/engine/proposal';
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
    expect(p.source).toMatchObject({ kind: 'adapted', ref: { id: 'wd:Q1', title: 'The Glass Harbour' }, changes: [] });
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

  it('declares what a free adaptation changes, which the rights holder reads against the agreement', () => {
    expect(make(start(), 'free').p.source!.changes).toEqual(['period', 'ending']);
  });

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
