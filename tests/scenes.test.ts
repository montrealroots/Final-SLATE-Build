// SLATE-06-04.02: duplicating, splitting and combining scenes keep IDs and links straight, and say what moved.
import { describe, expect, it } from 'vitest';
import { approvalImpact, approveDraft, combineScenes, makeOffer, removeCharacterImpact, requirementRemovalImpact, roleCandidates, saveDraft, updateCharacter, combineScenesImpact, duplicateScene, splitScene, splitSceneImpact } from './engine-api';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function script(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 12 },
    [{ name: 'Ines' }, { name: 'Tomas' }],
    [
      { place: 'Quay', chars: ['Ines', 'Tomas'], minutes: 4, extra: { props: ['lantern'], essential: true } },
      { place: 'Boathouse', chars: ['Tomas'], minutes: 2, extra: { props: ['rope'], crowd: 12 } },
    ]);
  const [a, b] = p.scenes;
  a.dialogue = ['One.', 'Two.', 'Three.', 'Four.'].map((text, i) => ({ id: `l${i}`, characterId: p.characters[i % 2].id, text, language: 'en' }));
  b.dialogue = [{ id: 'm0', characterId: p.characters[1].id, text: 'Five.', language: 'en' }];
  p.setups.push({ id: 'sp1', kind: 'clue', label: 'The lantern', plantedIn: a.id, paidIn: b.id });
  return { s, p };
}

describe('duplicate', () => {
  it('makes a new scene with its own ID and line IDs right after the original, which keeps its links', () => {
    const { s, p } = script('dup');
    const [a] = p.scenes;
    const copy = duplicateScene(s, p, a.id);
    expect(p.scenes.map((x) => x.id)).toEqual([a.id, copy.id, p.scenes[2].id]);
    expect(copy.id).not.toBe(a.id);
    expect(copy.dialogue.map((l) => l.text)).toEqual(a.dialogue.map((l) => l.text));
    expect(copy.dialogue.some((l) => a.dialogue.some((m) => m.id === l.id))).toBe(false);
    expect(copy.essential).toBeUndefined();
    expect(p.setups[0].plantedIn).toBe(a.id);
    // Editing the copy leaves the original alone.
    copy.props.push('net');
    expect(a.props).toEqual(['lantern']);
  });
});

describe('split', () => {
  it('splits before a line: the scene keeps its ID and earlier lines, the new one takes the rest and its share of the time', () => {
    const { s, p } = script('split');
    const [a] = p.scenes;
    expect(splitSceneImpact(p, a.id, 2)).toEqual([
      'Lines 3 onward move to a new scene right after this one, 2 of 4.',
      'Both scenes keep everyone in this scene; take out whoever is not in each part.',
      'The production needs (props, stunts, crowd and the rest) stay with the first part. Move any the second part needs.',
      'The lantern stays linked to the first part. Relink any that happen in the second.',
      'The first part stays essential; mark the second part too if the story needs it.',
    ]);
    const second = splitScene(s, p, a.id, 2);
    expect(p.scenes[1]).toBe(second);
    expect([a.dialogue.map((l) => l.text), second.dialogue.map((l) => l.text)]).toEqual([['One.', 'Two.'], ['Three.', 'Four.']]);
    expect([a.estMinutes, second.estMinutes]).toEqual([2, 2]);
    expect(second.participants).toEqual(a.participants);
    expect(second.props).toEqual([]);
    expect(p.setups[0].plantedIn).toBe(a.id);
  });

  it('refuses a split that would leave a part with no lines', () => {
    const { s, p } = script('split-edge');
    const [a, b] = p.scenes;
    for (const at of [0, 4, 1.5]) expect(() => splitScene(s, p, a.id, at)).toThrow('Split between two lines of dialogue.');
    expect(() => splitScene(s, p, b.id, 1)).toThrow('Split between two lines of dialogue.');
    expect(p.scenes).toHaveLength(2);
  });
});

describe('combine', () => {
  it('folds a scene into another: its lines, people and needs are added, its links move, and it is gone', () => {
    const { p } = script('combine');
    const [a, b] = p.scenes;
    expect(combineScenesImpact(p, a.id, b.id)).toEqual([
      'Scene 2 (Boathouse) joins Scene 1 (Quay): its action, lines, people and production needs are added, and it is removed from the script.',
      'The lantern moves to Scene 1 (Quay).',
      "The combined scene keeps Scene 1 (Quay)'s heading (INT. Quay – DAY).",
    ]);
    combineScenes(p, a.id, b.id);
    expect(p.scenes.map((x) => x.id)).toEqual([a.id]);
    expect(a.dialogue.map((l) => l.text)).toEqual(['One.', 'Two.', 'Three.', 'Four.', 'Five.']);
    expect(a.props).toEqual(['lantern', 'rope']);
    expect(a.crowd).toBe(12);
    expect(a.estMinutes).toBe(6);
    expect(p.setups[0]).toMatchObject({ plantedIn: a.id, paidIn: a.id });
  });

  it('only scenes of one episode combine, and approving afterwards says what the change does to filmed work', () => {
    const s = startLife('combine-eps');
    const p = buildProject(s, { title: 'Tidewater', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 20 },
      [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'], extra: { episode: 1 } }, { place: 'Lighthouse', chars: ['Mara'], extra: { episode: 2 } }]);
    expect(() => combineScenes(p, p.scenes[0].id, p.scenes[1].id)).toThrow('Only scenes of the same episode can be combined.');
    approve(s, p);
    const pier = p.scenes[0];
    p.captures.push({ sceneId: pier.id, captured: 1, quality: 70, version: p.approvedDraft!, weatherCompromised: false });
    const extra = duplicateScene(s, p, pier.id);
    extra.heading.place = 'Pier Steps';
    combineScenes(p, pier.id, extra.id);
    // The pier scene changed after it was filmed: approving the new draft names it.
    saveDraft(s, p);
    expect(approvalImpact(p, p.drafts[p.drafts.length - 1].number)).toEqual(['Episode 1, Scene 1 (Pier) was filmed; it will need filming again.']);
  });
});

// SLATE-05-01.02, .03 and 05-04.03: a character is one ID whatever it is called, and removing one says first what it touches.
describe('a character by its ID', () => {
  it('renaming changes the name everywhere it is shown, and every scene, line and setup still points at the same ID', () => {
    const { p } = script('rename');
    const ines = p.characters[0];
    const before = JSON.stringify(p.scenes);
    updateCharacter(p, ines.id, { name: 'Inês', aliases: ['The Ferrywoman'] });
    expect(JSON.stringify(p.scenes)).toBe(before); // scenes hold the ID, not the name
    expect(p.characters[0]).toMatchObject({ id: ines.id, name: 'Inês', aliases: ['The Ferrywoman'] });
    expect(() => updateCharacter(p, ines.id, { name: '  ' })).toThrow('A character needs a name.');
    expect(p.characters[0].name).toBe('Inês');
  });

  it('removing a character lists the scenes that use them before anything is removed', () => {
    const { p } = script('remove-char');
    const tomas = p.characters[1];
    expect(removeCharacterImpact(p, tomas.id)).toEqual(['They are in 2 scenes: Scene 1 (Quay), Scene 2 (Boathouse).', 'They have 3 lines of dialogue.']);
    expect(p.characters).toHaveLength(2); // asking changes nothing
  });
});

// SLATE-06-03.02: a draft that no longer needs something says what that strands before it is approved.
describe('removing a requirement', () => {
  it('names the requirement and whoever is booked only for it; approving releases no one by itself', () => {
    const s = startLife('req-removal');
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 10 },
      [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Quay', chars: ['Ines'], minutes: 4, extra: { stunts: 'A fall from the pier' } }, { place: 'Kitchen', chars: ['Ines'], minutes: 3 }]);
    approve(s, p);
    const coordinator = roleCandidates(s, p, 'stunt-coordinator')[0];
    makeOffer(s, p, { personId: coordinator.id, roleId: 'stunt-coordinator', dayRate: coordinator.dayRate }).status = 'accepted'; // labelled fixture: hired
    p.scenes[0].stunts = '';
    saveDraft(s, p);
    const number = p.drafts[p.drafts.length - 1].number;
    const impact = requirementRemovalImpact(s, p, number);
    expect(impact[0]).toMatch(/^No longer needs A fall from the pier \(/);
    expect(impact).toContain(`${coordinator.name} (Stunt Coordinator) is still booked with nothing of that kind left to do. Release them in Crew if you don't need them; work done stays paid.`);
    approveDraft(s, p, number);
    expect(p.hires.find((h) => h.personId === coordinator.id)!.status).toBe('accepted');
    // A draft that still has a stunt strands no one.
    p.scenes[1].stunts = 'A slip on the stairs';
    saveDraft(s, p);
    expect(requirementRemovalImpact(s, p, p.drafts[p.drafts.length - 1].number).some((x) => x.includes('still booked'))).toBe(false);
  });
});
