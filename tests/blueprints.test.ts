// Full stories (engine/blueprints.ts; the v3 package, 01-STORIES-AND-CHARACTERS.md, suites T01 and T03).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import registry from '../src/data/genre-registry.json';
import { applyBlueprint, blueprintProblems, formatClass, parseBlueprints, previewBlueprint, setLock, type Blueprint } from '../src/engine/blueprints';
import { createProject } from '../src/engine/projects';
import { deserialize, serialize } from '../src/engine/save';
import { draft } from './fixtures';
import { newGame } from '../src/engine/state';
import type { Format, GameState, Project } from '../src/engine/types';

const GENRES = new Set((registry as { records: { id: string }[] }).records.map((r) => r.id));
// The two stories these tests apply, kept as a fixture when the story library was retired (November 12, 2026).
const FIXTURE = readFileSync('tests/fixtures/stories.bp', 'utf8');
const all: Blueprint[] = parseBlueprints(FIXTURE).blueprints;
const byId = (id: string) => all.find((b) => b.id === id)!;

function game(format: Format, episodes = 1): { s: GameState; p: Project } {
  const s = newGame(draft(), 0, 'save-bp');
  const p = createProject(s, { title: 'Untitled', axes: { format, medium: 'live-action', episodeCount: episodes }, scenarioId: 'low' });
  return { s, p };
}

describe('the blueprint format', () => {
  it('the fixture reads cleanly, and each story in it is complete', () => {
    const { blueprints, problems } = parseBlueprints(FIXTURE);
    expect(problems).toEqual([]);
    expect(blueprints.map((b) => b.id)).toEqual(expect.arrayContaining(['heist.f01', 'nordic-noir.t01']));
    for (const b of blueprints) expect(blueprintProblems(b, GENRES), b.id).toEqual([]);
  });

  it('says what is wrong with an incomplete story, and never counts it', () => {
    const { blueprints } = parseBlueprints(FIXTURE);
    const good = blueprints[0];
    const broken: [string, (b: Blueprint) => void, RegExp][] = [
      ['a made-up genre', (b) => { b.genre = 'zombie-western-opera'; }, /not one of the game's genres/],
      ['no synopsis', (b) => { b.synopsis = ''; }, /has no synopsis/],
      ['a scene with someone who is not in it', (b) => { b.scenes[0].who = ['nobody']; }, /"nobody", who is not one of its characters/],
      ['a name in the words that is nobody', (b) => { b.logline = 'About {ghost}.'; }, /name \{ghost\}/],
      ['a relationship with one end', (b) => { b.relationships[0].b = b.relationships[0].a; }, /are not two of its characters/],
      ['a character with no arc', (b) => { b.characters[0].arc = ''; }, /has no arc/],
      ['a character in no scene', (b) => { for (const s of b.scenes) s.who = s.who.filter((k) => k !== 'dona'); }, /is in no scene/],
      ['four scenes', (b) => { b.scenes.length = 4; }, /fewer than five scenes/],
      ['a film with series lines', (b) => { b.tv = { episodes: 6, minutes: 50, engine: 'x', arc: 'x', eps: [], changes: 'x', recurring: ['x'], continuation: 'x' }; }, /a film has series lines/],
      ['a matrix word that is not one', (b) => { b.matrix.goal = 'vibes'; }, /matrix line/],
      ['no review', (b) => { b.review.at = ''; }, /no review line/],
    ];
    for (const [name, breakIt, says] of broken) {
      const b: Blueprint = JSON.parse(JSON.stringify(good));
      breakIt(b);
      expect(blueprintProblems(b, GENRES).join(' '), name).toMatch(says);
    }
    const series: Blueprint = JSON.parse(JSON.stringify(byId('nordic-noir.t01')));
    series.tv!.eps.pop();
    expect(blueprintProblems(series, GENRES).join(' ')).toMatch(/says 6 episodes and gives 5/);
  });
});

describe('applying a film', () => {
  it('fills the whole brief, the people, what is between them and the outline together', () => {
    const { s, p } = game('feature');
    const b = byId('heist.f01');
    const pre = previewBlueprint(p, b);
    expect(pre.refusal).toBeNull();
    // The working title is the player's from the moment a project exists, so it is offered to keep; nothing else is written yet.
    expect(pre.overwrites).toEqual([{ key: 'title', label: 'Working Title', current: 'Untitled' }]);
    expect(pre.changes.map((c) => c.key)).toEqual(expect.arrayContaining(['title', 'genres', 'story.logline', 'story.synopsis', 'characters', 'relationships', 'scenes', 'suggestions']));
    applyBlueprint(s, p, b);
    expect(p.title).toBe('The Quiet Floor');
    expect(p.axes.genres).toEqual([{ id: 'heist', emphasis: 'primary' }, { id: 'drama', emphasis: 'secondary' }]);
    expect(p.story.logline).toMatch(/^A night cleaner who has memorised/);
    // Names are written where the story's words name someone, and no brace is left anywhere.
    expect(p.story.premise).toMatch(/^Inês Marçal cleans the fourth floor/);
    expect(JSON.stringify(p)).not.toMatch(/\{[a-z]+\}/);
    expect(p.story.structure).toBe('Three Acts');
    expect(p.characters.map((c) => c.name)).toEqual(['Inês Marçal', 'Rui Marçal', 'Tomás Vidal', 'Caetano Reis', 'Dona Amélia Brandão']);
    const ines = p.characters[0];
    expect(ines).toMatchObject({ roleSize: 'lead', functions: ['protagonist'], pronouns: 'she/her', ageInStory: '52', arc: 'From keeping every rule to choosing which ones matter' });
    expect(ines.motivation && ines.obstacle && ines.contradiction && ines.voice && ines.description).toBeTruthy();
    // Every relationship joins two of the project's own characters.
    expect(p.relationships).toHaveLength(4);
    for (const r of p.relationships) { expect(p.characters.some((c) => c.id === r.a)).toBe(true); expect(p.characters.some((c) => c.id === r.b)).toBe(true); }
    // The outline: nine scenes in four parts, each with its people, and what a scene needs set as the typed fields the breakdown reads.
    expect(p.scenes).toHaveLength(9);
    expect(p.acts!.map((a) => a.name)).toEqual(['Opening', 'Development', 'Escalation', 'Climax', 'Resolution']);
    for (const sc of p.scenes) { expect(sc.participants.length).toBeGreaterThan(0); for (const id of sc.participants) expect(p.characters.some((c) => c.id === id)).toBe(true); expect(p.acts!.some((a) => a.id === sc.act)).toBe(true); }
    expect(p.scenes[5].props).toEqual(['deposit box', 'ledger', 'file']);
    expect(p.scenes[5].essential).toBe(true);
    expect(p.brief!.suggestions).toMatchObject({ look: expect.stringMatching(/^Sodium light/), sound: expect.stringMatching(/^The building as an instrument/) });
    // Where it is from: its own title and ID, never a real work's.
    expect(p.blueprint).toMatchObject({ id: 'heist.f01', title: 'The Quiet Floor', v: 1 });
    expect(Object.keys(p.blueprint!.names)).toEqual(['ines', 'rui', 'tomas', 'caetano', 'dona']);
  });

  it("uses the player's names everywhere the story names someone", () => {
    const { s, p } = game('feature');
    applyBlueprint(s, p, byId('heist.f01'), { names: { ines: 'Marta Queirós' } });
    expect(p.characters[0].name).toBe('Marta Queirós');
    expect(p.story.question).toMatch(/^Can Marta Queirós take back/);
    expect(p.scenes[0].action).toMatch(/^Marta Queirós cleans the floor/);
    expect(JSON.stringify(p)).not.toContain('Inês');
  });

  it("keeps the player's own words where they choose to, leaves a locked field alone, and says so first", () => {
    const { s, p } = game('feature');
    p.story.logline = 'My own logline.';
    p.axes.tone = 'Mine';
    setLock(p, 'tone', true);
    const pre = previewBlueprint(p, byId('heist.f01'));
    expect(pre.overwrites).toEqual([{ key: 'title', label: 'Working Title', current: 'Untitled' }, { key: 'story.logline', label: 'Logline', current: 'My own logline.' }]);
    expect(pre.locked).toEqual(['tone']);
    applyBlueprint(s, p, byId('heist.f01'), { keep: ['story.logline'] });
    expect(p.story.logline).toBe('My own logline.');
    expect(p.axes.tone).toBe('Mine');
    expect(p.story.premise).toMatch(/Inês/);
    setLock(p, 'tone', false);
    expect(p.locks).toBeUndefined();
  });

  it('changes nothing it does not say: the same project with and without it differs only in what the preview listed', () => {
    const a = game('feature'); const b = game('feature');
    applyBlueprint(b.s, b.p, byId('heist.f01'));
    for (const k of ['funding', 'cast', 'hires', 'obligations', 'schedule', 'requirements', 'drafts', 'approvedDraft', 'phase'] as const) expect(b.p[k], k).toEqual(a.p[k]);
    // And nothing outside the project: no money, no time, no person, no event. Only the counter that numbers new things moved.
    const rest = (g: GameState) => JSON.stringify({ ...g, projects: [], idCounter: 0 });
    expect(rest(b.s)).toBe(rest(a.s));
  });

  it('is refused where it does not fit, in words', () => {
    const film = game('feature'); const series = game('limited-series', 6); const doc = game('documentary-feature');
    expect(previewBlueprint(series.p, byId('heist.f01')).refusal).toBe('The Quiet Floor is written as a film, and this project is a series.');
    expect(previewBlueprint(film.p, byId('nordic-noir.t01')).refusal).toBe('Meltwater is written as a series, and this project is a film.');
    expect(previewBlueprint(doc.p, byId('heist.f01')).refusal).toBe('The Quiet Floor is a scripted story, and this project is a documentary.');
    expect(() => applyBlueprint(series.s, series.p, byId('heist.f01'))).toThrow('written as a film');
    expect(series.p.characters).toEqual([]);
  });
});

describe('applying a series', () => {
  it('writes the season: what an episode does, the arc, every episode, the places it returns to, and that it ends', () => {
    const { s, p } = game('limited-series', 6);
    const b = byId('nordic-noir.t01');
    expect(formatClass(b.format)).toBe('tv');
    applyBlueprint(s, p, b);
    expect(p.series).toMatchObject({ engine: expect.stringMatching(/^Each chapter takes one searcher's memory/), recurring: ['Skardvik Police Station', 'Sandnes House', 'Ferry Kiosk', 'Glacier Tongue', 'Town Hall'], continuation: expect.stringMatching(/^It ends\./) });
    expect(p.seasonArc).toMatch(/^From a body that proves Ane Lunde never left/);
    expect(p.episodes.map((e) => e.title)).toEqual(['The Red Anorak', 'Grid Seven', 'The Boy Who Was Ill', 'What The Teacher Did', 'Thirteen', 'Meltwater']);
    expect(p.episodes[1].arc).toBe('Jonas Eira learns the glacier was struck off the search by Arne Sandnes himself');
    expect(p.scenes.every((sc) => sc.episode === 1)).toBe(true);
    expect(p.scenes).toHaveLength(8);
    expect(p.scenes[0].stunts).toBe('an officer roped on a glacier slope');
    expect(p.scenes[5].crowd).toBe(30);
    expect(p.worldRules).toHaveLength(1);
    // Regulars and recurring people, by billing.
    expect(p.characters.find((c) => c.name === 'Liv Sandnes')!.seriesInvolvement).toBe('regular');
    expect(p.characters.find((c) => c.name === 'Marit Lunde')!.seriesInvolvement).toBe('recurring');
  });

  it('says so when the project has a different number of episodes, and fills what there is', () => {
    const { s, p } = game('limited-series', 4);
    expect(previewBlueprint(p, byId('nordic-noir.t01')).warnings[0]).toBe('Meltwater is written for 6 episodes and this project has 4. Only the first 4 get their titles and what they move.');
    applyBlueprint(s, p, byId('nordic-noir.t01'));
    expect(p.episodes.map((e) => e.title)).toEqual(['The Red Anorak', 'Grid Seven', 'The Boy Who Was Ill', 'What The Teacher Did']);
  });

  it('survives saving and loading whole', () => {
    const { s, p } = game('limited-series', 6);
    applyBlueprint(s, p, byId('nordic-noir.t01'));
    const back = deserialize(serialize(s)).projects[0];
    expect(back).toEqual(p);
    expect(back.series!.recurring).toHaveLength(5);
    expect(back.characters[0].contradiction).toBe('Trusts evidence and nobody, including herself');
  });
});

describe('what a story asks of the production', () => {
  it('reaches the breakdown through the typed fields, not through its words: a scene\'s props, crowd and stunts become requirements when the draft is approved', async () => {
    const { saveDraft, approveDraft } = await import('../src/engine/projects');
    const withNeeds = game('feature'); const without = game('feature');
    const b = byId('heist.f01');
    const bare: Blueprint = JSON.parse(JSON.stringify(b));
    for (const sc of bare.scenes) { delete sc.props; delete sc.crowd; delete sc.stunts; }
    for (const [g, bp] of [[withNeeds, b], [without, bare]] as const) {
      applyBlueprint(g.s, g.p, bp);
      g.p.axes.content = {};
      saveDraft(g.s, g.p); approveDraft(g.s, g.p, g.p.drafts.at(-1)!.number);
    }
    const labels = (p: Project) => p.requirements.map((r) => `${r.kind}: ${r.label}`).sort();
    const added = labels(withNeeds.p).filter((x) => !labels(without.p).includes(x));
    // Only the props differ, because only the props were taken out: the same words, the same people, the same scenes.
    expect(added.length).toBeGreaterThan(0);
    expect(added.every((x) => x.startsWith('prop'))).toBe(true);
    expect(added.join(' ')).toMatch(/deposit box/i);
    expect(labels(without.p).filter((x) => !labels(withNeeds.p).includes(x))).toEqual([]);
    expect(without.p.story).toEqual(withNeeds.p.story);
  });
});
