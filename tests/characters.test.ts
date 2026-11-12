// A character's whole life in a script (projects.ts; the v3 package, 01 section 4, suite T04): made by hand with no
// story chosen, renamed, tied to scenes and to each other, cast, set aside with their scenes given to someone else,
// restored, copied and reordered. What was contracted and paid is never touched by any of it.
import { describe, expect, it } from 'vitest';
import {
  archiveCharacter, characterName, characterReferences, duplicateCharacter, moveCharacter, removeCharacter, removeCharacterImpact, removeCharacterRefusal,
  restoreCharacter, saveDraft, approveDraft, splitCharacter, updateCharacter, updateScene,
} from '../src/engine/projects';
import { deserialize, serialize } from '../src/engine/save';
import { releaseHire } from '../src/engine/hiring';
import { ledgerTotals } from './engine-api';
import { approve, buildProject, castAll, runDays, startLife } from './helpers';
import type { GameState, Project } from '../src/engine/types';

function film(tag: string): { s: GameState; p: Project; id: (name: string) => string } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Two Rooms', format: 'short', medium: 'live-action', runtime: 12 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }, { name: 'Ilse', patch: { roleSize: 'supporting' } }, { name: 'Tov', patch: { roleSize: 'supporting' } }], [
    { place: 'Kitchen', chars: ['Mara', 'Ilse'] }, { place: 'Stairwell', chars: ['Ilse', 'Tov'] }, { place: 'Roof', chars: ['Mara', 'Tov'] },
  ]);
  return { s, p, id: (name) => p.characters.find((c) => c.name === name)!.id };
}

describe('characters made by hand, with no story chosen', () => {
  it('a rename is one change: every scene, line and relationship still points at the same character', () => {
    const { s, p, id } = film('ch-rename');
    const ilse = id('Ilse');
    p.relationships.push({ id: 'r1', a: id('Mara'), b: ilse, kind: 'sisters', start: 'not speaking', end: 'speaking' });
    p.scenes[0].dialogue.push({ id: 'd1', characterId: ilse, text: 'You kept the kettle.', language: 'en' });
    updateScene(p, p.scenes[1].id, { states: { [ilse]: 1 } });
    updateCharacter(p, ilse, { name: 'Ilse Brandt', look: { named: ['Day clothes', 'Soaked'] } });
    expect(p.characters.find((c) => c.id === ilse)!.name).toBe('Ilse Brandt');
    expect(characterName(p, ilse)).toBe('Ilse Brandt');
    const r = characterReferences(p, ilse);
    expect([r.scenes.length, r.lines, r.relationships.length, r.states]).toEqual([2, 1, 1, 1]);
    const back = deserialize(serialize(s)).projects[0];
    expect(back.characters.find((c) => c.id === ilse)!.name).toBe('Ilse Brandt');
    expect(back.scenes[0].participants).toContain(ilse);
  });

  it('a copy is a new character: its own ID and name, in no scene, tied to nobody', () => {
    const { s, p, id } = film('ch-copy');
    updateCharacter(p, id('Mara'), { wants: 'The flat', arc: 'Lets go of it', beats: [{ id: 'b1', sceneId: p.scenes[0].id, change: 'Decides' }] });
    const copy = duplicateCharacter(s, p, id('Mara'));
    expect(copy).toMatchObject({ name: 'Mara (Copy)', wants: 'The flat', arc: 'Lets go of it', roleSize: 'lead' });
    expect(copy.id).not.toBe(id('Mara'));
    expect(copy.beats).toBeUndefined();
    expect(p.characters.map((c) => c.name)).toEqual(['Mara', 'Mara (Copy)', 'Ilse', 'Tov']);
    expect(characterReferences(p, copy.id).scenes).toEqual([]);
    expect(duplicateCharacter(s, p, id('Mara')).name).toBe('Mara (Copy 2)');
    // Changing the copy leaves the original alone.
    updateCharacter(p, copy.id, { wants: 'To leave' });
    expect(p.characters[0].wants).toBe('The flat');
  });

  it('the order is the writer\'s to set, and the ends stay the ends', () => {
    const { p, id } = film('ch-order');
    moveCharacter(p, id('Tov'), -1);
    expect(p.characters.map((c) => c.name)).toEqual(['Mara', 'Tov', 'Ilse']);
    moveCharacter(p, id('Mara'), -1); moveCharacter(p, id('Ilse'), 1);
    expect(p.characters.map((c) => c.name)).toEqual(['Mara', 'Tov', 'Ilse']);
  });

  it('removing one with nothing behind it takes it out of every scene and bond, and says what first', () => {
    const { p, id } = film('ch-remove');
    const tov = id('Tov');
    p.relationships.push({ id: 'r1', a: tov, b: id('Mara'), kind: 'neighbours', start: 'strangers', end: 'allies' });
    expect(removeCharacterRefusal(p, tov)).toBeNull();
    expect(removeCharacterImpact(p, tov)).toEqual(['They are in 2 scenes: Scene 2 (Stairwell), Scene 3 (Roof).', '1 relationship names them.']);
    removeCharacter(p, tov);
    expect(p.characters.map((c) => c.name)).toEqual(['Mara', 'Ilse']);
    expect(p.scenes.flatMap((sc) => sc.participants)).not.toContain(tov);
    expect(p.relationships).toEqual([]);
  });
});

describe('splitting a character', () => {
  it('a new character takes the chosen scenes, their lines and the beats set there; the original keeps the rest, and its contracts', () => {
    const { s, p, id } = film('ch-split');
    const [mara, ilse] = [id('Mara'), id('Ilse')];
    p.scenes[0].dialogue.push({ id: 'd1', characterId: mara, text: 'You kept the key.', language: 'en' });
    p.scenes[2].dialogue.push({ id: 'd2', characterId: mara, text: 'Look down.', language: 'en' });
    p.characters.find((c) => c.id === mara)!.beats = [{ id: 'b1', sceneId: p.scenes[0].id, change: 'Trusts Ilse' }, { id: 'b2', sceneId: p.scenes[2].id, change: 'Stops running' }];
    const hire = { id: 'h-fixture', personId: 'x', roleId: 'actor', kind: 'cast', characterId: mara, status: 'accepted' } as Project['hires'][number];
    p.hires.push(hire); // labelled fixture: someone contracted for Mara
    const young = splitCharacter(s, p, mara, [p.scenes[2].id], 'Young Mara');
    expect(p.scenes[2].participants).toEqual(expect.arrayContaining([young.id]));
    expect(p.scenes[2].participants).not.toContain(mara);
    expect(p.scenes[2].dialogue.map((d) => d.characterId)).toEqual([young.id]);
    expect(p.scenes[0].participants).toContain(mara);
    expect(p.scenes[0].dialogue.map((d) => d.characterId)).toEqual([mara]);
    expect(p.characters.find((c) => c.id === mara)!.beats!.map((b) => b.id)).toEqual(['b1']);
    expect(young.beats!.map((b) => b.id)).toEqual(['b2']);
    expect(p.hires.find((h) => h.id === 'h-fixture')!.characterId).toBe(mara); // the contract stays with the original
    expect(p.characters.map((c) => c.name)).toEqual(['Mara', 'Young Mara', 'Ilse', 'Tov']);
    expect(() => splitCharacter(s, p, ilse, [], 'X')).toThrow('Choose the scenes the new character takes.');
    expect(() => splitCharacter(s, p, ilse, p.scenes.filter((sc) => sc.participants.includes(ilse)).map((sc) => sc.id), 'X')).toThrow(/^Leave Ilse at least one scene/);
    expect(() => splitCharacter(s, p, ilse, [p.scenes[0].id], 'Tov')).toThrow('There is already a character called Tov.');
    p.hires = p.hires.filter((h) => h.id !== 'h-fixture'); // the fixture is not a whole hire
    expect(deserialize(serialize(s)).projects[0].characters.map((c) => c.name)).toContain('Young Mara');
  });
});

describe('setting a character aside', () => {
  it('takes them out of the script whole, and Restore puts every scene, line and bond back', () => {
    const { s, p, id } = film('ch-archive');
    const ilse = id('Ilse');
    p.relationships.push({ id: 'r1', a: id('Mara'), b: ilse, kind: 'sisters', start: 'apart', end: 'together' });
    p.scenes[0].dialogue.push({ id: 'd0', characterId: id('Mara'), text: 'Tea?', language: 'en' }, { id: 'd1', characterId: ilse, text: 'You kept the kettle.', language: 'en' }, { id: 'd2', characterId: id('Mara'), text: 'It was hers.', language: 'en' });
    (p.threads ??= []).push({ id: 't1', name: 'The flat', characterIds: [ilse, id('Mara')], sceneIds: [], resolution: 'open', resolvedIn: null });
    const before = JSON.stringify({ c: p.characters, sc: p.scenes, r: p.relationships, t: p.threads });
    archiveCharacter(s, p, ilse);
    expect(p.characters.map((c) => c.name)).toEqual(['Mara', 'Tov']);
    expect(p.scenes[0].participants).toEqual([id('Mara')]);
    expect(p.scenes[0].dialogue.map((d) => d.id)).toEqual(['d0', 'd2']);
    expect(p.relationships).toEqual([]);
    expect(p.threads![0].characterIds).toEqual([id('Mara')]);
    expect(p.archived).toHaveLength(1);
    expect(characterName(p, ilse)).toBe('Ilse');
    // It survives a save, and comes back exactly.
    const reloaded = deserialize(serialize(s));
    const q = reloaded.projects[0];
    restoreCharacter(q, ilse);
    expect(q.archived).toBeUndefined();
    const sort = (x: { characters: { id: string }[] }) => [...x.characters].sort((a, b) => a.id.localeCompare(b.id));
    expect(sort(q)).toEqual(sort(JSON.parse(`{"characters":${JSON.stringify(JSON.parse(before).c)}}`)));
    expect(q.scenes[0].dialogue.map((d) => d.id)).toEqual(['d0', 'd1', 'd2']);
    expect(q.scenes.map((sc) => [...sc.participants].sort())).toEqual(JSON.parse(before).sc.map((sc: { participants: string[] }) => [...sc.participants].sort()));
    expect(q.relationships).toEqual(JSON.parse(before).r);
    expect([...q.threads![0].characterIds].sort()).toEqual([ilse, id('Mara')].sort());
  });

  it('can give their scenes, lines and bonds to someone else, with no bond to oneself and none twice', () => {
    const { s, p, id } = film('ch-reassign');
    const [mara, ilse, tov] = [id('Mara'), id('Ilse'), id('Tov')];
    p.relationships.push({ id: 'r1', a: mara, b: ilse, kind: 'sisters', start: 'apart', end: 'together' }, { id: 'r2', a: ilse, b: tov, kind: 'landlord and tenant', start: 'owing', end: 'even' }, { id: 'r3', a: mara, b: tov, kind: 'neighbours', start: 'wary', end: 'friends' });
    p.scenes[1].dialogue.push({ id: 'd1', characterId: ilse, text: 'Rent is due.', language: 'en' });
    archiveCharacter(s, p, ilse, mara);
    // Mara is now in every scene Ilse was in, once each, and says her line.
    expect(p.scenes.map((sc) => sc.participants.filter((x) => x === mara).length)).toEqual([1, 1, 1]);
    expect(p.scenes[1].dialogue).toMatchObject([{ characterId: mara, text: 'Rent is due.' }]);
    // Mara-Ilse would be Mara with herself: dropped. Ilse-Tov would be a second Mara-Tov: dropped. One bond is left, the one they had.
    expect(p.relationships.map((r) => r.id)).toEqual(['r3']);
    expect(p.archived![0].reassignedTo).toBe(mara);
    // Restored after that, she comes back to no scenes: they are Mara's now, and the page said so.
    restoreCharacter(p, ilse);
    expect(characterReferences(p, ilse).scenes).toEqual([]);
    expect(() => archiveCharacter(s, p, tov, tov)).toThrow('Choose another character');
  });

  it('with a performer contracted and paid: the contract, the booking and every payment stay exactly as they were', () => {
    const { s, p, id } = film('ch-contract');
    approve(s, p);
    castAll(s, p);
    runDays(s, p, 6);
    const ilse = id('Ilse');
    const hire = p.hires.find((h) => h.characterId === ilse && h.status === 'accepted');
    expect(hire, 'the fixture casts Ilse').toBeTruthy();
    const money = () => JSON.stringify({ totals: ledgerTotals(p), obligations: p.obligations, hires: p.hires, cast: p.cast });
    const before = money();
    // Removal is refused in words, and offers the way that keeps the history.
    expect(removeCharacterRefusal(p, ilse)).toMatch(/^Someone is contracted or has an offer for this part\. Set the character aside instead/);
    expect(() => removeCharacter(p, ilse)).toThrow('Set the character aside instead');
    expect(removeCharacterImpact(p, ilse).join(' ')).toMatch(/1 performer is contracted for the part\. The contract stays as agreed until you release it in Cast; what was paid stays paid\./);
    archiveCharacter(s, p, ilse, id('Tov'));
    expect(money()).toBe(before);
    expect(characterName(p, ilse)).toBe('Ilse');
    // Across a save and a reload too.
    const q = deserialize(serialize(s)).projects[0];
    expect(JSON.stringify({ totals: ledgerTotals(q), obligations: q.obligations, hires: q.hires, cast: q.cast })).toBe(before);
    expect(q.archived![0].c.name).toBe('Ilse');
    // The new draft, without her, is the player's to approve; the performer is released by the player, by name, not by the edit.
    saveDraft(s, p); approveDraft(s, p, p.drafts.at(-1)!.number);
    expect(p.hires.find((h) => h.id === hire!.id)!.status).toBe('accepted');
    releaseHire(s, p, hire!.id);
    expect(p.hires.find((h) => h.id === hire!.id)!.status).toBe('released');
    expect(characterName(p, ilse)).toBe('Ilse');
  });
});

describe('what is between two characters', () => {
  it('is held once for a pair, whichever way round they are named', async () => {
    const { addRelationship } = await import('../src/engine/season');
    const { s, p, id } = film('ch-bond');
    addRelationship(s, p, id('Mara'), id('Ilse'), 'sisters', 'apart', 'together');
    expect(() => addRelationship(s, p, id('Ilse'), id('Mara'), 'rivals')).toThrow('Mara and Ilse already have a relationship. Change that one instead of adding a second.'.replace('Mara and Ilse', 'Ilse and Mara'));
    expect(() => addRelationship(s, p, id('Mara'), id('Mara'), 'herself')).toThrow('Choose two different characters.');
    expect(p.relationships).toHaveLength(1);
    addRelationship(s, p, id('Mara'), id('Tov'), 'neighbours');
    expect(p.relationships).toHaveLength(2);
  });
});
