// A work's story read as developments (src/engine/story-structure.ts; the owner's v5 brief, 1). Labelled fixture stories,
// written for these tests, and The Hobbit's own story from src/data/plots.json.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { episodeBreaks, episodePurpose, hasWord, readStory, selectDevelopments, sentencesOf, type Cast } from '../src/engine/story-structure';

const cast: Cast[] = [{ key: 'ana', first: 'Ana' }, { key: 'rook', first: 'Rook' }, { key: 'pell', first: 'Pell' }];

describe('reading a story', () => {
  it('splits sentences on their ends, keeping names written {key} and quotes', () => {
    // A title isn't a sentence's end: until November 13, 2026 this gave 'Mr.' and 'Pell waits.' apart. An initial isn't
    // either; a Roman numeral is.
    expect(sentencesOf('{ana} runs. "Stop!" she says. Mr. Pell waits. 3 men come.')).toEqual(['{ana} runs.', '"Stop!" she says.', 'Mr. Pell waits.', '3 men come.']);
    expect(sentencesOf('J. R. Hartley walks. It was World War I. Then peace.')).toEqual(['J. R. Hartley walks.', 'It was World War I.', 'Then peace.']);
    expect(hasWord('Anastasia came', 'Ana')).toBe(false);
    expect(hasWord('Then Ana came', 'Ana')).toBe(true);
  });

  it('makes each paragraph a development, and splits one where the story moves on in time or to another recorded place', () => {
    const r = readStory([
      'Ana lives in Brindle with her father. She mends nets.',
      'Ana finds a map in the nets. Rook steals it. Years later Ana sails to Corrow. She hunts for Rook there.',
    ], cast, 'ana', ['Brindle', 'Corrow']);
    expect(r.developments.map((d) => d.sentences.length)).toEqual([2, 2, 2]);
    expect(r.developments.map((d) => d.place)).toEqual(['Brindle', null, 'Corrow']);
    expect(r.developments[1].introduces).toEqual(['rook']);
  });

  it('leaves out passages about the work rather than its events', () => {
    const r = readStory([
      'The novel features two main characters, Ana and Rook. The plot involves a long search.',
      'Ana finds the map. Rook steals it and flees.',
      'Ana follows him north. She learns he is her brother.',
      'Ana confronts Rook at the cliffs. He dies in the fall.',
      'Ana returns home. She mends nets again.',
    ], cast, 'ana', []);
    expect(r.developments.map((d) => d.background)).toEqual([true, false, false, false, false]);
    // Roles are counted among the story's own developments: the first of them sets it up.
    expect(r.developments.filter((d) => !d.background).map((d) => d.role)).toEqual(['setup', 'inciting', 'climax', 'resolution']);
  });

  it('gives roles in story order: setup, an early inciting event, a reversal before the climax, the resolution last', () => {
    const paragraphs = [
      'Ana mends nets in Brindle.', 'Ana finds a map and decides to sail.', 'Ana sails north with Pell.', 'Pell helps Ana mend the sail.',
      'Ana learns the map is false.', 'Ana sails on anyway.', 'Rook attacks the boat.', 'Ana defeats Rook at the cliffs.', 'Ana goes home.',
    ];
    const r = readStory(paragraphs, cast, 'ana', ['Brindle']);
    const roles = r.developments.map((d) => d.role);
    expect(roles[0]).toBe('setup');
    expect(roles[1]).toBe('inciting');
    expect(roles.at(-1)).toBe('resolution');
    expect(roles.indexOf('reversal')).toBeLessThan(roles.indexOf('climax'));
    expect(roles.indexOf('climax')).toBeGreaterThan(roles.indexOf('inciting'));
  });

  it('names a rival or an ally only on clear evidence: two sentences of it, twice as many as of the other kind', () => {
    const clear = readStory(['Rook attacks Ana. Ana fights Rook. Pell helps Ana. Pell and Ana travel together.'], cast, 'ana', []);
    expect([clear.rival, clear.ally]).toEqual(['rook', 'pell']);
    // One sentence of each kind, or as many of one as of the other, isn't evidence enough.
    const unclear = readStory(['Rook attacks Ana. Rook helps Ana. Pell helps Ana.'], cast, 'ana', []);
    expect([unclear.rival, unclear.ally]).toEqual([null, null]);
  });

  it('keeps the developments with roles when a format has less room, then the heaviest, in story order', () => {
    const r = readStory(Array.from({ length: 10 }, (_, i) => (i % 3 === 0 ? `Ana finds clue ${i}.` : `Ana walks on ${i}.`)), cast, 'ana', []);
    const { kept, left } = selectDevelopments(r.developments, 5);
    expect(kept).toHaveLength(5);
    expect(left).toBe(5);
    expect(kept.map((d) => d.at)).toEqual([...kept.map((d) => d.at)].sort((a, b) => a - b));
    expect(kept[0].role).toBe('setup');
    expect(kept.at(-1)!.role).toBe('resolution');
  });

  it('breaks a season where the story turns once an episode has its share, and gives each episode a purpose', () => {
    const r = readStory(['Ana mends nets.', 'Ana finds a map.', 'Ana walks.', 'Ana walks on.', 'Ana learns the truth.', 'Ana walks home.', 'Ana defeats Rook.', 'Ana rests.'], cast, 'ana', []);
    const starts = episodeBreaks(r.developments, 3);
    expect(starts[0]).toBe(0);
    expect(starts).toHaveLength(3);
    // Each break after the first follows a development that turns the story, where one was near.
    for (const at of starts.slice(1)) expect(r.developments[at - 1].turns || r.developments[at - 1].weight > 0).toBe(true);
    expect(episodePurpose(0, 3, r.developments.slice(0, starts[1]))).toMatch(/^Sets up the world/);
    expect(episodePurpose(2, 3, r.developments.slice(starts[2]))).toMatch(/^Brings it to its climax/);
  });
});

describe('a real work\'s story', () => {
  const sources = JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as { records: { id: string; title: string }[] };
  const plots = JSON.parse(readFileSync('src/data/plots.json', 'utf8')) as { plots: Record<string, { paragraphs: string[] }> };
  // Until the re-fetch of November 13, 2026 its story opened with a paragraph about Bilbo's life before, and the party was
  // the inciting event; the Plot subsection kept now opens with the party, so the story is set up by it.
  it('The Hobbit: Bilbo leads, the story is set up by Gandalf drawing him into Thorin\'s company, and its parts run in order', () => {
    const w = sources.records.find((x) => x.title === 'The Hobbit')!;
    const r = readStory(plots.plots[w.id].paragraphs, [{ key: 'bilbo', first: 'Bilbo' }, { key: 'gandalf', first: 'Gandalf' }, { key: 'thorin', first: 'Thorin' }], 'bilbo', ['Middle-earth']);
    const story = r.developments.filter((d) => !d.background);
    expect(story[0].role).toBe('setup');
    expect(story[0].sentences.join(' ')).toMatch(/Gandalf tricks Bilbo/);
    expect(story.findIndex((d) => d.role === 'inciting')).toBeGreaterThan(0);
    expect(story.at(-1)!.role).toBe('resolution');
    expect(story.map((d) => d.at)).toEqual([...story.map((d) => d.at)].sort((a, b) => a - b));
  });
});
