// SLATE-04-02.02 and .03: acts and threads are the writer's structure; links stay true when scenes change, and nothing scores.
import { describe, expect, it } from 'vitest';
import {
  addAct, addBeat, addResearch, addThread, assessQuality, combineScenes, deleteScene, removeResearch, updateResearch, removeAct, resolutionLabel, scriptIssues, setSceneAct, splitScene, updateThread,
} from './engine-api';
import { cutConsequences } from '../src/engine/script-explain';
import { approve, buildProject, startLife } from './helpers';

function script(tag: string) {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 12 },
    [{ name: 'Ines' }, { name: 'Tomas' }],
    [{ place: 'Quay', chars: ['Ines', 'Tomas'], minutes: 3 }, { place: 'Boathouse', chars: ['Tomas'], minutes: 3 }, { place: 'Lighthouse', chars: ['Ines'], minutes: 3 }]);
  return { s, p };
}
const notes = (p: Parameters<typeof scriptIssues>[0]) => scriptIssues(p).filter((i) => /thread|act|Act/.test(i.text)).map((i) => [i.severity, i.text]);

describe('acts', () => {
  it('group scenes; an empty act is noted; removing one leaves its scenes where they were', () => {
    const { s, p } = script('acts');
    const one = addAct(s, p, 'Act One');
    expect(() => addAct(s, p, '  ')).toThrow('Give the act a name.');
    expect(notes(p)).toEqual([['note', 'Act One has no scenes yet.']]);
    setSceneAct(p, p.scenes[0].id, one.id);
    expect(notes(p)).toEqual([]);
    const order = p.scenes.map((x) => x.id);
    removeAct(p, one.id);
    expect(p.scenes.map((x) => x.id)).toEqual(order);
    expect(p.scenes[0].act).toBeUndefined();
    expect(() => setSceneAct(p, p.scenes[0].id, one.id)).toThrow('That act no longer exists.');
  });
});

describe('threads', () => {
  it('a thread resolves in a named scene or is left open on purpose; either way is valid and only an unchosen one is noted', () => {
    const { s, p } = script('threads');
    const t = addThread(s, p, 'The missing boat');
    expect(notes(p)).toEqual([
      ['note', 'The thread "The missing boat" isn\'t in any scene yet.'],
      ['note', 'The thread "The missing boat" has no resolving scene yet. Choose one, or mark it left open on purpose.'],
    ]);
    updateThread(p, t.id, { sceneIds: [p.scenes[0].id], resolvedIn: p.scenes[2].id, characterIds: [p.characters[0].id] });
    expect(t.sceneIds).toEqual([p.scenes[0].id, p.scenes[2].id]); // the resolving scene is part of the thread
    expect(resolutionLabel(p, t)).toBe('Resolves in Scene 3 (Lighthouse)');
    expect(notes(p)).toEqual([]);
    updateThread(p, t.id, { resolution: 'open' });
    expect([t.resolvedIn, resolutionLabel(p, t)]).toEqual([null, 'Left open on purpose']);
    expect(notes(p)).toEqual([]);
  });

  it('deleting the resolving scene names what broke; combining moves the thread; splitting keeps it with the first part', () => {
    const { s, p } = script('threads-links');
    const t = addThread(s, p, 'The missing boat');
    const [quay, boathouse, lighthouse] = p.scenes;
    updateThread(p, t.id, { sceneIds: [quay.id, boathouse.id], resolvedIn: lighthouse.id });
    combineScenes(p, quay.id, boathouse.id);
    expect(t.sceneIds).toEqual([quay.id, lighthouse.id]);
    quay.dialogue = [{ id: 'a', characterId: p.characters[0].id, text: 'One.', language: 'en' }, { id: 'b', characterId: p.characters[1].id, text: 'Two.', language: 'en' }];
    splitScene(s, p, quay.id, 1);
    expect(t.sceneIds).toEqual([quay.id, lighthouse.id]);
    deleteScene(p, lighthouse.id);
    expect(t.resolvedIn).toBeNull();
    expect(notes(p)).toEqual([['note', 'The thread "The missing boat" has no resolving scene yet. Choose one, or mark it left open on purpose.']]);
  });

  it('cutting the resolving scene from the edit warns by name; threads change no assessed quality', () => {
    const { s, p } = script('threads-cut');
    approve(s, p);
    const t = addThread(s, p, 'The missing boat');
    updateThread(p, t.id, { sceneIds: [p.scenes[0].id], resolvedIn: p.scenes[2].id });
    expect(cutConsequences(p, p.scenes[2].id)).toContain('It resolves the thread "The missing boat": cut, that thread is left without its resolution.');
    const withThread = JSON.stringify(assessQuality(s, p));
    p.threads = [];
    expect(JSON.stringify(assessQuality(s, p))).toBe(withThread);
  });
});

// SLATE-04-04.02: research questions are the writer's record; an open or uncertain one is noted on its scenes, never scored.
describe('research notes', () => {
  it('note open and uncertain questions on their scenes until reviewed against a reference; nothing scores', () => {
    const { s, p } = script('research');
    const n = addResearch(s, p, 'How did lighthouse keepers signal in 1952?');
    expect(() => addResearch(s, p, ' ')).toThrow('Write the question first.');
    updateResearch(p, n.id, { sceneIds: [p.scenes[2].id] });
    const research = () => scriptIssues(p).filter((i) => i.text.includes('rests on')).map((i) => [i.severity, i.sceneId, i.text]);
    expect(research()).toEqual([['note', p.scenes[2].id, 'Scene 3 (Lighthouse) rests on a question still open: How did lighthouse keepers signal in 1952?']]);
    updateResearch(p, n.id, { status: 'uncertain' });
    expect(research()[0][2]).toContain('still uncertain');
    expect(() => updateResearch(p, n.id, { status: 'reviewed' })).toThrow('Note the reference you checked before marking it reviewed.');
    expect(n.status).toBe('uncertain');
    updateResearch(p, n.id, { status: 'reviewed', reference: 'Northern Lighthouse Board records' });
    expect(research()).toEqual([]);
    approve(s, p);
    const quality = JSON.stringify(assessQuality(s, p));
    removeResearch(p, n.id);
    expect(JSON.stringify(assessQuality(s, p))).toBe(quality);
  });
});

// SLATE-05-04.02: arc beats sit in scenes the character is in; cuts and scene changes keep them true.
describe('arc beats', () => {
  it('a beat goes only in a scene the character is in, in script order; cutting it warns; combining moves it; deleting drops it', () => {
    const { s, p } = script('beats');
    const [ines, tomas] = p.characters;
    const [quay, boathouse, lighthouse] = p.scenes;
    expect(() => addBeat(s, p, ines.id, boathouse.id, 'Doubts him')).toThrow("Ines isn't in Scene 2 (Boathouse). Add them to the scene first.");
    addBeat(s, p, ines.id, lighthouse.id, 'Decides to leave');
    addBeat(s, p, ines.id, quay.id, 'Trusts him');
    expect(ines.beats!.map((b) => b.change)).toEqual(['Trusts him', 'Decides to leave']);
    approve(s, p);
    expect(cutConsequences(p, lighthouse.id)).toContain("Ines changes here (Decides to leave): cut, the audience doesn't see it.");
    addBeat(s, p, tomas.id, boathouse.id, 'Lies');
    combineScenes(p, quay.id, boathouse.id);
    expect(tomas.beats!.map((b) => b.sceneId)).toEqual([quay.id]);
    deleteScene(p, lighthouse.id);
    expect(ines.beats!.map((b) => b.change)).toEqual(['Trusts him']);
  });
});
