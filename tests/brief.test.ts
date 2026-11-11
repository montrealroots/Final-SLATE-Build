// Choosing an idea and applying it (src/engine/brief.ts; the Creative Depth package, milestone B). One command path for
// every idea; a preview that changes nothing; the player's own words kept; and each mechanical idea reaching the engine
// that reads it. Made-up projects and names throughout.
import { describe, expect, it } from 'vitest';
import { approvedScenes, buildTasks, deserialize, groupShootDays, neededRoles, serialize } from './engine-api';
import { applyIdea, fill, pickFor, previewIdea, saveIdea, setLook, type Idea, type Target } from '../src/engine/brief';
import { competesAs } from '../src/engine/script-effects';
import { sceneLoad } from '../src/engine/production/schedule';
import { stream } from '../src/engine/rng';
import { IDEAS, ideaById, recommended, whyItFits, wrongMedium } from '../src/ideas';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function fresh(seed = 'brief', medium: 'live-action' | 'animation' = 'live-action'): { s: GameState; p: Project } {
  const s = startLife(seed);
  const p = buildProject(s, { title: 'Brief Fixture', format: 'feature', medium, ...(medium === 'animation' ? { technique: 'stop-motion' as const } : {}), genres: ['horror', 'comedy'] },
    [{ name: 'June' }, { name: 'Dale' }],
    [{ place: 'Office', chars: ['June'] }, { place: 'Street', intExt: 'EXT', time: 'NIGHT', chars: ['June', 'Dale'], extra: { crowd: 40 } }]);
  return { s, p };
}
const idea = (id: string): Idea => { const x = ideaById(id); if (!x) throw new Error(`no idea ${id}`); return x; };
/** A target that gives an idea something to apply to, whatever its scope. */
const anyTarget = (p: Project, x: Idea): Target => ({
  ...(x.scope === 'character' ? { characterIds: [p.characters[0].id] } : {}), ...(x.scope === 'scene' ? { sceneIds: p.scenes.filter((s) => s.crowd > 0).map((s) => s.id) } : {}),
  beats: x.patch.flatMap((c) => (c.op === 'beats' ? c.beats.map((_, i) => i) : [])),
});
const snapshot = (p: Project) => JSON.stringify(p);

describe('applying an idea', () => {
  it('every idea applies through the one command path and says first what it will do', () => {
    for (const x of IDEAS) {
      const { s, p } = fresh(`brief-${x.id}`);
      const t = anyTarget(p, x);
      const before = snapshot(p);
      const pre = previewIdea(p, x, t);
      // Looking changes nothing, and says the same thing twice.
      expect(snapshot(p), x.id).toBe(before);
      expect(previewIdea(p, x, t), x.id).toEqual(pre);
      expect(pre.refusal, x.id).toBeNull();
      const done = applyIdea(s, p, x, t);
      expect(done, x.id).toEqual(pre.changes);
      // What it wrote has no placeholder left in it, anywhere in the project.
      expect(snapshot(p), x.id).not.toMatch(/\{(lead|second|town|place|era)\}/);
      expect(pickFor(p, x.field), x.id).toMatchObject({ id: x.id, v: x.v });
      // The project still saves and loads as itself.
      const back = deserialize(serialize(s));
      expect(back.projects.find((q) => q.id === p.id)!.brief, x.id).toEqual(p.brief);
      // A words or mechanical idea changed the project; a note with no patch changed nothing but the record of it.
      if (x.patch.length) expect(snapshot(p), x.id).not.toBe(before);
    }
  }, 120_000);

  it('keeps only the idea\'s ID and version in the save, never its words', () => {
    const { s, p } = fresh();
    applyIdea(s, p, idea('premise.003'));
    expect(p.brief).toEqual({ picks: [{ id: 'premise.003', v: 1, field: 'premise', at: s.now }] });
    expect(JSON.stringify(p.brief)).not.toMatch(/theater|visitor/i);
  });

  it('asks before replacing the player\'s own words, and leaves them alone when told to keep them', () => {
    const { s, p } = fresh();
    p.story.premise = 'My own premise, typed by hand.';
    p.story.stakes = '';
    const x = idea('premise.002');
    const pre = previewIdea(p, x);
    expect(pre.overwrites.map((o) => o.key)).toEqual(expect.arrayContaining(['story.premise', 'story.logline']));
    expect(pre.overwrites.find((o) => o.key === 'story.premise')!.current).toBe('My own premise, typed by hand.');
    // An empty field is simply filled: nothing to ask.
    expect(pre.overwrites.some((o) => o.key === 'story.stakes')).toBe(false);
    applyIdea(s, p, x, { keep: ['story.premise'] });
    expect(p.story.premise).toBe('My own premise, typed by hand.');
    expect(p.story.logline).toContain('Tavi Reyes');
    expect(p.story.stakes).toContain('curfew');
    // Typing over a picked field afterwards is just typing: the pick stays a record, and nothing else moves.
    const kept = snapshot({ ...p, story: { ...p.story, logline: '' } } as Project);
    p.story.logline = 'Rewritten by me.';
    expect(snapshot({ ...p, story: { ...p.story, logline: '' } } as Project)).toBe(kept);
  });

  it('writes the player\'s names where the idea has slots, and its suggestions where they left them blank', () => {
    const { s, p } = fresh();
    const x = idea('premise.001');
    applyIdea(s, p, x, { slots: { town: 'Saltmarsh', lead: '  ', second: 'Ines Okoro' }, beats: [0, 3] });
    expect(p.story.premise).toBe('In Saltmarsh, the night-shift dispatcher June Okafor must keep a divided town connected when the dead return before dawn.');
    expect(p.characters.map((c) => c.name)).toEqual(expect.arrayContaining(['June Okafor', 'Ines Okoro', 'The Returned']));
    expect(fill('{lead} of {town}', x, { lead: 'Ada' })).toBe('Ada of Briar Hollow');
    expect(fill('{nobody} waits', x)).toBe('waits');
  });

  it('offered scenes are added only when ticked, and then make the work scenes make', () => {
    const none = fresh('beats');
    applyIdea(none.s, none.p, idea('premise.001'));
    expect(none.p.scenes).toHaveLength(2);
    expect(previewIdea(fresh('beats').p, idea('premise.001')).changes).toContain('5 scenes are offered. None is added unless you tick it.');
    const some = fresh('beats');
    applyIdea(some.s, some.p, idea('premise.001'), { beats: [2, 3] });
    expect(some.p.scenes.map((x) => x.heading.place)).toEqual(['Office', 'Street', 'Main Street', 'Transmitter Shed']);
    const street = some.p.scenes[2];
    expect(street).toMatchObject({ crowd: 12, crowdLook: 'wounds', heading: { intExt: 'EXT', time: 'NIGHT' } });
    // The people the idea brought are in the scenes it wrote them into.
    const name = (id: string) => some.p.characters.find((c) => c.id === id)!.name;
    expect(street.participants.map(name)).toEqual(['June Okafor', 'The Returned']);
    approve(some.s, some.p);
    expect(some.p.requirements.filter((r) => r.kind === 'location').map((r) => r.label)).toEqual(expect.arrayContaining(['Main Street', 'Transmitter Shed']));
    expect(some.p.requirements.find((r) => r.kind === 'makeup' && r.label === 'Background: Main Street')).toMatchObject({ qty: 12 });
    expect(groupShootDays(some.p, some.s).length).toBeGreaterThan((() => { const b = fresh('beats'); approve(b.s, b.p); return groupShootDays(b.p, b.s).length; })());
  });

  it('refuses what it can\'t do and says why: a locked script, nobody to apply it to, a way of making it that is settled', () => {
    const { s, p } = fresh();
    expect(previewIdea(p, idea('makeup_method.003')).refusal).toBe('Choose who this is for.');
    expect(() => applyIdea(s, p, idea('makeup_method.003'))).toThrow('Choose who this is for.');
    expect(previewIdea(p, idea('crowd.digital')).refusal).toBe('Choose the scenes this is for.');
    const empty = startLife('brief-empty');
    const q = buildProject(empty, { title: 'Empty', format: 'feature', medium: 'live-action' }, [], []);
    expect(previewIdea(q, idea('makeup_method.003')).refusal).toBe('Add a character first: this applies to a character.');
    approve(s, p);
    expect(previewIdea(p, idea('production_medium.005')).refusal).toMatch(/settled once a draft is approved/);
    expect(p.axes.medium).toBe('live-action');
    p.delivered = { at: s.now, runtimeMin: 90 };
    expect(previewIdea(p, idea('conflict.001')).refusal).toBe('This project has been delivered. Its script is locked.');
    expect(() => applyIdea(s, p, idea('conflict.001'))).toThrow('locked');
  });

  it('one choice of a kind for a target: a second makeup method replaces the first, for that character only', () => {
    const { s, p } = fresh();
    const [june, dale] = p.characters.map((c) => c.id);
    applyIdea(s, p, idea('makeup_method.003'), { characterIds: [june, dale] });
    applyIdea(s, p, idea('makeup_method.002'), { characterIds: [june] });
    expect(p.characters.map((c) => c.look?.makeup)).toEqual(['aging', 'creature']);
    expect(pickFor(p, 'makeup', { characterId: june })!.id).toBe('makeup_method.002');
    expect(pickFor(p, 'makeup', { characterId: dale })!.id).toBe('makeup_method.003');
    expect(p.brief!.picks).toHaveLength(2);
    // Applying the same idea again leaves one record, not two.
    applyIdea(s, p, idea('makeup_method.002'), { characterIds: [june] });
    expect(p.brief!.picks.filter((k) => k.id === 'makeup_method.002')).toHaveLength(1);
    // The control on the character's card and the idea are the same thing afterwards.
    setLook(p, june, { makeup: 'mask' });
    expect(p.characters[0].look).toEqual({ makeup: 'mask' });
    setLook(p, june, {});
    expect(p.characters[0].look).toBeUndefined();
  });

  it('says what the work will be before it is chosen, in the engine\'s own figures', () => {
    const { p } = fresh();
    const pre = previewIdea(p, idea('makeup_method.003'), { characterIds: [p.characters[0].id] });
    expect(pre.changes).toEqual(['June, Makeup: Full Creature Appliances.']);
    expect(pre.work).toEqual([
      'June: 3 hours 30 minutes in the chair before shooting and 45 minutes to take off, each day they work. More than the pre-call holds: their days shoot less, unless more people apply it.',
      'June: 8 build days and $7,200 in materials, by the prosthetics designer.',
      'June: 3 days of camera tests before the shoot.',
      'June: $380 in materials each day it is worn.',
    ]);
    const crowd = previewIdea(p, idea('crowd.digital'), { sceneIds: [p.scenes[1].id] });
    expect(crowd.changes).toEqual(['Street, Crowd: 10 of 40 on set, the rest added in post.']);
    expect(crowd.work[0]).toMatch(/clean plates and tracking passes .* 15% longer to shoot, and 3 days of effects work/);
    // A scene with nobody in the background says so instead of pretending.
    expect(previewIdea(p, idea('crowd.digital'), { sceneIds: [p.scenes[0].id] }).warnings).toEqual(['Office has no crowd yet. Give it one on its scene card, and this applies to them.']);
    // The same idea on an animated project: it says the chair isn't there.
    const anim = fresh('brief-anim', 'animation');
    expect(previewIdea(anim.p, idea('makeup_method.003'), { characterIds: [anim.p.characters[0].id] }).warnings[0]).toMatch(/is animated: June is drawn or built/);
  });
});

describe('ideas that reach an engine', () => {
  it('a physical gag on a chosen scene makes a stunt of it, with its rehearsal, coordinator and doubled costume', () => {
    const plain = fresh('gag');
    const gag = fresh('gag');
    for (const x of [plain, gag]) setLook(x.p, x.p.characters[0].id, { wardrobe: 'bought' });
    applyIdea(gag.s, gag.p, idea('comedy_treatment.004'), { sceneIds: [gag.p.scenes[0].id] });
    approve(plain.s, plain.p); approve(gag.s, gag.p);
    expect(gag.p.requirements.filter((r) => r.kind === 'stunt').map((r) => r.label)).toEqual(['A rehearsed physical gag']);
    expect(plain.p.requirements.some((r) => r.kind === 'stunt')).toBe(false);
    expect(buildTasks(gag.p).some((t) => t.kind === 'prep:stunts')).toBe(true);
    expect(neededRoles(gag.p, gag.s).find((r) => r.roleId === 'stunt-coordinator')).toMatchObject({ required: true });
    expect(sceneLoad(gag.p, approvedScenes(gag.p)[0])).toBeGreaterThan(sceneLoad(plain.p, approvedScenes(plain.p)[0]));
    const costume = (x: { p: Project }) => buildTasks(x.p).find((t) => t.kind === 'prep:wardrobe')!.units;
    expect(costume(gag)).toBe(costume(plain) * 2);
    // The other scene is untouched.
    expect(sceneLoad(gag.p, approvedScenes(gag.p)[1])).toBe(sceneLoad(plain.p, approvedScenes(plain.p)[1]));
  });

  it('a camera idea sets the scene\'s shot plan, which the schedule already reads', () => {
    const plain = fresh('cam');
    const long = fresh('cam');
    applyIdea(long.s, long.p, idea('camera_treatment.005'), { sceneIds: [long.p.scenes[0].id] });
    expect(long.p.shotPlans![long.p.scenes[0].id]).toEqual({ coverage: 'full', emphasis: 'performances' });
    approve(plain.s, plain.p); approve(long.s, long.p);
    expect(sceneLoad(long.p, approvedScenes(long.p)[0])).toBeGreaterThan(sceneLoad(plain.p, approvedScenes(plain.p)[0]));
    expect(sceneLoad(long.p, approvedScenes(long.p)[1])).toBe(sceneLoad(plain.p, approvedScenes(plain.p)[1]));
    // A camera idea the engine has nothing for is a note: it changes no scene.
    const note = fresh('cam');
    applyIdea(note.s, note.p, idea('camera_treatment.008'));
    expect(note.p.shotPlans ?? {}).toEqual(plain.p.shotPlans ?? {});
    expect(idea('camera_treatment.008').kind).toBe('reference');
  });

  it('a narrator chosen from an idea is recorded after the lock, and the mix waits', () => {
    const { s, p } = fresh('narr');
    applyIdea(s, p, idea('sound_treatment.009'), { characterIds: [p.characters[1].id] });
    expect(p.characters[1].functions).toContain('narrator');
    approve(s, p);
    const tasks = buildTasks(p);
    const rec = tasks.find((t) => t.kind === 'post:narration')!;
    expect(rec.dependsOn).toEqual(['milestone:lock:1']);
    expect(tasks.find((t) => t.kind === 'post:mix')!.dependsOn).toContain(rec.id);
  });

  it('a blend sets a primary and a secondary genre, and only the primary decides where it competes', () => {
    const a = fresh('blend');
    a.p.axes.genres = [];
    applyIdea(a.s, a.p, idea('blend.horror-comedy'));
    expect(a.p.axes.genres).toEqual([{ id: 'horror', emphasis: 'primary' }, { id: 'comedy', emphasis: 'secondary' }]);
    expect(competesAs(a.p)).toBe('drama');
    const b = fresh('blend');
    b.p.axes.genres = [];
    applyIdea(b.s, b.p, idea('blend.comedy-horror'));
    expect(competesAs(b.p)).toBe('comedy');
  });

  it('a way of making it changes the pipeline before a draft is approved, and nothing about the words', () => {
    const { s, p } = fresh('medium');
    const story = JSON.stringify(p.story);
    applyIdea(s, p, idea('production_medium.005'));
    expect([p.axes.medium, p.axes.technique]).toEqual(['animation', 'stop-motion']);
    expect(JSON.stringify(p.story)).toBe(story);
    approve(s, p);
    expect(buildTasks(p).some((t) => t.kind === 'sm:puppet')).toBe(true);
  });
});

describe('ideas in any order', () => {
  it('forty random ideas applied to one project, twelve times over, never break it: it still approves, saves and loads', () => {
    for (let run = 0; run < 12; run++) {
      const { s, p } = fresh(`fuzz-${run}`);
      const r = stream(run + 1, 'idea-fuzz');
      const applied: string[] = [];
      for (let i = 0; i < 40; i++) {
        const x = IDEAS[Math.floor(r() * IDEAS.length)];
        // Opposing choices, repeats and changes of mind are all in here: whatever was picked before, try this one.
        const t: Target = {
          ...(x.scope === 'character' ? { characterIds: p.characters.filter(() => r() < 0.6).map((c) => c.id) } : {}),
          ...(x.scope === 'scene' ? { sceneIds: p.scenes.filter(() => r() < 0.6).map((sc) => sc.id) } : {}),
          beats: x.patch.flatMap((c) => (c.op === 'beats' ? c.beats.map((_, k) => k).filter(() => r() < 0.3) : [])),
        };
        const pre = previewIdea(p, x, t);
        if (pre.refusal) { expect(() => applyIdea(s, p, x, t), `${run}: ${x.id}`).toThrow(pre.refusal); continue; }
        applyIdea(s, p, x, t);
        applied.push(x.id);
      }
      expect(applied.length, `run ${run}`).toBeGreaterThan(15);
      expect(JSON.stringify(p), `run ${run}`).not.toMatch(/\{\w+\}/);
      for (const c of p.characters) expect(c.look?.states === undefined || (c.look.states >= 2 && c.look.states <= 6), `run ${run}: ${c.name}`).toBe(true);
      // No two picks of one kind for one target.
      const keys = p.brief!.picks.filter((k) => !['world-rule', 'location'].includes(k.field)).flatMap((k) => (k.characterIds ?? k.sceneIds ?? ['project']).map((id) => `${k.field}|${id}`));
      expect(new Set(keys).size, `run ${run}`).toBe(keys.length);
      // A scene offered at a kind of place arrives empty, and the game won't approve an empty scene: the player puts
      // someone in it. Here the first character is.
      for (const sc of p.scenes) if (!sc.participants.length) sc.participants = [p.characters[0].id];
      approve(s, p);
      const tasks = buildTasks(p);
      expect(new Set(tasks.map((t) => t.id)).size, `run ${run}: a task made twice`).toBe(tasks.length);
      const ids = new Set(tasks.map((t) => t.id));
      for (const t of tasks) for (const d of t.dependsOn) expect(ids.has(d) || d.startsWith('milestone:') || d.startsWith('capture:'), `run ${run}: ${t.id} waits on ${d}`).toBe(true);
      expect(deserialize(serialize(s)).projects.find((q) => q.id === p.id)!.brief).toEqual(p.brief);
    }
  }, 120_000);
});

describe('what the picker recommends, and saved ideas', () => {
  it('says why an idea suits the project, hides nothing, and marks what is for another way of making things', () => {
    const { p } = fresh();
    expect(whyItFits(p, idea('premise.001'))).toBe('suits horror, written for this format');
    expect(whyItFits(p, idea('premise.008'))).toBeNull();
    expect(recommended(p, 'premise').map((x) => x.id)).toEqual(expect.arrayContaining(['premise.001', 'premise.003', 'premise.011']));
    expect(wrongMedium(p, idea('makeup_method.010'))).toBe(true);
    expect(wrongMedium(p, idea('makeup_method.003'))).toBe(false);
    saveIdea(p, 'premise.008', true);
    saveIdea(p, 'conflict.004', true);
    saveIdea(p, 'premise.008', false);
    expect(p.brief!.saved).toEqual(['conflict.004']);
    saveIdea(p, 'conflict.004', false);
    expect(p.brief!.saved).toBeUndefined();
  });
});
