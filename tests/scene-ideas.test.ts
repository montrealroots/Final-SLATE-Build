// What a scene needs on the day, chosen from ideas (src/ideas/scenes.ts; the Creative Depth package, milestone C). Each
// test applies one idea to one scene of the same film and compares what the breakdown, the crew list and the task list
// make of it with the film as it was.
import { describe, expect, it } from 'vitest';
import { applyIdea, previewIdea } from '../src/engine/brief';
import { ideaById, ideasFor } from '../src/ideas';
import { approvedScenes, buildTasks, deserialize, neededRoles, serialize } from './engine-api';
import { requiredSetups } from '../src/engine/takes';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function film(): { s: GameState; p: Project } {
  const s = startLife('scene-ideas');
  const p = buildProject(s, { title: 'Scene Ideas Fixture', format: 'feature', medium: 'live-action' }, [{ name: 'Wren' }, { name: 'Dale' }],
    [{ place: 'Office', chars: ['Wren', 'Dale'] }, { place: 'Quay', intExt: 'EXT', chars: ['Dale'] }]);
  return { s, p };
}
/** The film with one idea applied to its first scene, approved; and the same film without it. */
function pair(id: string) {
  const plain = film();
  const chosen = film();
  const changes = applyIdea(chosen.s, chosen.p, ideaById(id)!, { sceneIds: [chosen.p.scenes[0].id] });
  approve(plain.s, plain.p); approve(chosen.s, chosen.p);
  return { plain: plain.p, chosen: chosen.p, state: chosen.s, changes };
}
const required = (p: Project) => neededRoles(p).filter((r) => r.required).map((r) => r.roleId);
const units = (p: Project, kind: string) => buildTasks(p).filter((t) => t.kind === kind).reduce((a, t) => a + t.units, 0);

describe('what a scene needs, chosen from an idea', () => {
  it('props chosen from an idea are added to what the scene lists, and the art department\'s work grows with them', () => {
    const { plain, chosen, state } = pair('props.a-dispatcher-s-desk');
    expect(approvedScenes(chosen)[0].props).toEqual(['Radio handset', 'Call log', 'Wall map with pins']);
    expect(approvedScenes(chosen)[1].props).toEqual([]); // the scene that wasn't chosen
    expect(units(chosen, 'prep:design') - units(plain, 'prep:design')).toBe(3);
    // Added to what is there, never replacing it, and never twice.
    const { s, p } = film();
    p.scenes[0].props = ['Kettle', 'call log'];
    applyIdea(s, p, ideaById('props.a-dispatcher-s-desk')!, { sceneIds: [p.scenes[0].id] });
    applyIdea(s, p, ideaById('props.a-dispatcher-s-desk')!, { sceneIds: [p.scenes[0].id] });
    expect(p.scenes[0].props).toEqual(['Kettle', 'call log', 'Radio handset', 'Wall map with pins']);
    expect(deserialize(serialize(state)).projects[0].scenes[0].props).toEqual(chosen.scenes[0].props);
  });

  it('an animal chosen from an idea requires a wrangler; without one the film needs none', () => {
    const { plain, chosen } = pair('animals.a-dog-that-knows-the-way');
    expect(approvedScenes(chosen)[0].animals).toEqual(['Dog']);
    expect(required(plain)).not.toContain('animal-wrangler');
    expect(required(chosen)).toContain('animal-wrangler');
  });

  it('a vehicle chosen from an idea requires a coordinator; without one the film needs none', () => {
    const { plain, chosen } = pair('vehicles.a-delivery-van');
    expect(approvedScenes(chosen)[0].vehicles).toEqual(['Delivery van']);
    expect(required(plain)).not.toContain('vehicle-coordinator');
    expect(required(chosen)).toContain('vehicle-coordinator');
  });

  it('an effect chosen from an idea is visual effects work after the lock, which the grade waits for', () => {
    const { plain, chosen } = pair('effects.a-sky-replaced');
    expect(approvedScenes(chosen)[0].vfx).toEqual(['Sky replacement']);
    expect([units(plain, 'post:vfx'), units(chosen, 'post:vfx')]).toEqual([0, 4]);
    expect(buildTasks(chosen).find((t) => t.kind === 'post:color')!.dependsOn).toContain('post:vfx:1');
    expect(buildTasks(plain).find((t) => t.kind === 'post:color')!.dependsOn).not.toContain('post:vfx:1');
    // The scene needs inserts for the effect's plates; the other scene doesn't.
    chosen.takesModel = true; chosen.directing = 2;
    expect(requiredSetups(chosen, approvedScenes(chosen)[0]).map((x) => x.setup)).toContain('inserts');
    expect(requiredSetups(chosen, approvedScenes(chosen)[1]).map((x) => x.setup)).not.toContain('inserts');
  });

  it('every such idea says first what it adds and what work that is, and none changes a scene it wasn\'t given', () => {
    for (const idea of ideasFor(['props', 'animals', 'vehicles', 'effects'])) {
      const { s, p } = film();
      const pre = previewIdea(p, idea, { sceneIds: [p.scenes[0].id] });
      expect(pre.changes.join(' '), idea.id).toMatch(/adds /);
      expect(pre.work.length, idea.id).toBeGreaterThan(0);
      const other = JSON.stringify(p.scenes[1]);
      applyIdea(s, p, idea, { sceneIds: [p.scenes[0].id] });
      expect(JSON.stringify(p.scenes[1]), idea.id).toBe(other);
    }
  });
});

describe('a scene\'s own words, chosen from an idea', () => {
  it('writes the field it names on the scene chosen, asks before replacing what is written, and changes no work', () => {
    const { s, p } = film();
    const before = buildTasks({ ...p, approvedDraft: null } as Project).length;
    applyIdea(s, p, ideaById('scene-objective.buy-an-hour')!, { sceneIds: [p.scenes[0].id] });
    expect(p.scenes[0].objective).toBe('Keep them talking long enough for the others to finish.');
    const again = previewIdea(p, ideaById('scene-objective.make-the-offer')!, { sceneIds: [p.scenes[0].id] });
    expect(again.overwrites.map((o) => o.current)).toEqual(['Keep them talking long enough for the others to finish.']);
    applyIdea(s, p, ideaById('scene-objective.make-the-offer')!, { sceneIds: [p.scenes[0].id], keep: again.overwrites.map((o) => o.key) });
    expect(p.scenes[0].objective).toBe('Keep them talking long enough for the others to finish.');
    applyIdea(s, p, ideaById('scene-turn.they-already-knew')!, { sceneIds: [p.scenes[0].id] });
    expect(p.scenes[0].turningPoint).toMatch(/known for years/);
    expect(buildTasks({ ...p, approvedDraft: null } as Project).length).toBe(before);
  });
});
