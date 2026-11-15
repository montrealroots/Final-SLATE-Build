// The player's own words that decide nothing (docs/input-audit/CONTROLS.csv: identity and record fields shown where
// they are written): each is kept through a save exactly as written. These are the rows of the feature matrix that are
// carried rather than proven (tests/v10-features.test.ts CARRIED), from November 15, 2026.
import { describe, expect, it } from 'vitest';
import type { GameState, Project, StoryCharacter } from '../src/engine/types';
import { memoryStore } from '../src/engine/save-store';
import { readSave, writeSave } from '../src/engine/save';
import { createSong } from '../src/engine/song-actions';
import { buildProject, startLife } from './helpers';

/** Saved and read back: what a later session opens. */
const roundTrip = (s: GameState): GameState => {
  const store = memoryStore();
  const res = writeSave(store, s, 1);
  expect(res.ok).toBe(true);
  return readSave(store, s.saveId);
};

describe('the words a player writes are kept through a save', () => {
  it('kept through a save exactly as written', () => {
    const s = startLife('carried');
    s.saveName = 'Harbour Years';
    const p = buildProject(s, { title: 'The Pier', format: 'short', medium: 'live-action', genres: ['drama'], runtime: 10 },
      [{ name: 'Mara', patch: { roleSize: 'lead' } }, { name: 'Ivo', patch: { roleSize: 'supporting' } }],
      [{ place: 'Pier', chars: ['Mara', 'Ivo'], minutes: 5 }]);
    const doc = buildProject(s, { title: 'Lock Keepers', format: 'documentary-short', medium: 'live-action', genres: ['documentary'], runtime: 10 }, [], []);
    Object.assign(p.story, { question: 'Who keeps the light?', synopsis: 'A keeper and her brother, one winter.', audience: 'Adults who grew up by the sea.', structure: 'Three winters, told backwards.' });
    p.source = { kind: 'adapted', work: 'The Lighthouse Diaries' };
    p.genreNotes = { drama: 'Quiet, and close to them.' };
    p.drafts.push({ number: 9, savedAt: 0, label: 'The Winter Draft', summary: '', scenes: [], characters: [], approved: false });
    Object.assign(p.scenes[0], { action: 'She climbs the stair in the dark.', turningPoint: 'The lamp fails.' });
    p.setups.push({ id: 'su1', kind: 'setup', label: 'The cracked lens', plantedIn: p.scenes[0].id, paidIn: null });
    const [mara, ivo] = p.characters as [StoryCharacter, StoryCharacter];
    p.relationships.push({ id: 'r1', a: mara.id, b: ivo.id, kind: 'Siblings', start: 'Estranged', end: 'Reconciled' } as never);
    Object.assign(mara, { aliases: ['The Keeper'], entityNote: 'A woman of the coast.', motivation: 'To keep the light lit.', obstacle: 'The council wants it automated.', contradiction: 'She longs to leave.', arc: 'From holding on to letting go.', voice: 'Short, dry sentences.' });
    doc.contributors.push({ id: 'ct1', name: 'Fenna Bakker', role: 'Lock keeper since 1990', consent: 'not-asked' });
    doc.evidence.push({ id: 'ev1', claim: 'The lock opened in 1882.', status: 'established', sourceNote: 'Harbour board minutes, 1882', verified: false } as never);
    createSong(s, p, { title: 'Harbour Lights', source: 'write' });

    const back = roundTrip(s);
    const bp = back.projects.find((x) => x.id === p.id)!;
    const bd = back.projects.find((x) => x.id === doc.id)!;
    const char = (q: Project, id: string) => q.characters.find((c) => c.id === id)!;
    expect(back.saveName).toBe('Harbour Years');
    expect(bp.story).toMatchObject({ question: 'Who keeps the light?', synopsis: 'A keeper and her brother, one winter.', audience: 'Adults who grew up by the sea.', structure: 'Three winters, told backwards.' });
    expect(bp.source?.work).toBe('The Lighthouse Diaries');
    expect(bp.genreNotes.drama).toBe('Quiet, and close to them.');
    expect(bp.drafts.find((d) => d.number === 9)?.label).toBe('The Winter Draft');
    expect(bp.scenes[0]).toMatchObject({ action: 'She climbs the stair in the dark.', turningPoint: 'The lamp fails.' });
    expect(bp.setups[0].label).toBe('The cracked lens');
    expect(bp.relationships[0]).toMatchObject({ kind: 'Siblings', start: 'Estranged', end: 'Reconciled' });
    expect(char(bp, mara.id)).toMatchObject({ aliases: ['The Keeper'], entityNote: 'A woman of the coast.', motivation: 'To keep the light lit.', obstacle: 'The council wants it automated.', contradiction: 'She longs to leave.', arc: 'From holding on to letting go.', voice: 'Short, dry sentences.' });
    expect(bd.contributors[0]).toMatchObject({ name: 'Fenna Bakker', role: 'Lock keeper since 1990' });
    expect(bd.evidence[0].sourceNote).toBe('Harbour board minutes, 1882');
    expect((bp.songs ?? []).map((x) => x.title)).toContain('Harbour Lights');
  });
});

describe('your name and birth date', () => {
  it('are your legal name and age, seed the world with the start date, and date the inheritance', async () => {
    const { newGame } = await import('../src/engine/state');
    const { inheritanceDay } = await import('../src/engine/personal');
    const { draft } = await import('./fixtures');
    const a = newGame(draft({ firstName: 'Ada', middleName: 'Rose', lastName: 'Okafor' }), 0, 'save1');
    expect(a.character.name).toBe('Ada Rose Okafor');
    // Another name or birth date is another world: the seed is drawn from them (state.ts newGame).
    expect(newGame(draft({ firstName: 'Ada', middleName: 'Rose', lastName: 'Okafor-Lind' }), 0, 'save1').seed).not.toBe(a.seed);
    expect(newGame(draft({ firstName: 'Ada', middleName: 'Rose', lastName: 'Okafor', birthDate: '2007-01-02' }), 0, 'save1').seed).not.toBe(a.seed);
    // The inheritance was released on your nineteenth birthday, or the day the story starts if that is sooner.
    expect(inheritanceDay('2007-01-02', '2026-03-27')).toBe('2026-01-02');
    expect(inheritanceDay('2007-06-02', '2026-03-27')).toBe('2026-03-27');
  });
});
