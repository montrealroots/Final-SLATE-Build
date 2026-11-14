// The production task graph (src/engine/production/tasks.ts; the owner's v7 package, reference validate_graph and
// affected_tasks): every method's built graph has no missing dependency and no cycle, rework reaches everything built
// on a change and nothing else, and changing an approved take resets all the work downstream that had begun.
import { describe, expect, it } from 'vitest';
import { buildTasks, dependents, graphFaults } from '../src/engine/production/tasks';
import { approveTake, mocapRecord, takeChangeImpact } from '../src/engine/mocap';
import { approve, buildProject, startLife } from './helpers';
import type { Project } from '../src/engine/types';

const METHODS: Record<string, Parameters<typeof buildProject>[1]> = {
  'live action': { title: 'A', format: 'short', medium: 'live-action', runtime: 8 },
  '2D': { title: 'B', format: 'short', medium: 'animation', technique: '2d-drawn', runtime: 4 },
  '3D': { title: 'C', format: 'short', medium: 'animation', technique: '3d-cg', runtime: 3 },
  'stop motion': { title: 'D', format: 'short', medium: 'animation', technique: 'stop-motion', runtime: 3 },
  'hybrid': { title: 'E', format: 'short', medium: 'hybrid', runtime: 6 },
  'documentary': { title: 'F', format: 'documentary-short', medium: 'live-action', runtime: 10 },
  'series': { title: 'G', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 10 },
};

describe('the production task graph', () => {
  it('has no missing dependency and no cycle, for every method', () => {
    for (const [name, axes] of Object.entries(METHODS)) {
      const s = startLife(`graph-${name}`);
      const p = buildProject(s, axes, [{ name: 'Lead', patch: { roleSize: 'lead', ...(name === '3D' ? { methods: ['voice', 'motion-capture'] } : {}) } }], [{ place: 'Room', chars: ['Lead'], minutes: 2, extra: { episode: 1 } }, ...(name === 'series' ? [{ place: 'Alley', chars: ['Lead'], minutes: 2, extra: { episode: 2 } }] : [])]);
      if (name === 'documentary') { p.contributors.push({ id: 'ct1', name: 'Rosa Delgado', role: 'Salt Farmer', consent: 'not-asked' } as never); p.scenes[0].contributorIds = ['ct1']; } // labelled fixture: an interview's contributor
      approve(s, p);
      const tasks = buildTasks(p);
      expect(tasks.length, name).toBeGreaterThan(3);
      expect(graphFaults(tasks), name).toEqual([]);
    }
    expect(graphFaults([{ id: 'a', dependsOn: ['b'] }, { id: 'b', dependsOn: ['a'] }])[0]).toMatch(/^A cycle/); // reference test_cycle_rejected
    expect(graphFaults([{ id: 'a', dependsOn: ['nowhere'] }])).toEqual(["a depends on nowhere, which isn't a task."]);
  });

  it('reworks what is built on a change, however far down, and nothing beside it', () => {
    const tasks = [{ id: 'script', dependsOn: [] }, { id: 'shoot', dependsOn: ['script'] }, { id: 'edit', dependsOn: ['shoot'] }, { id: 'other', dependsOn: [] }];
    expect(dependents(tasks, 'script')).toEqual(new Set(['script', 'shoot', 'edit'])); // reference test_rework_is_transitive_and_scoped
    expect(() => dependents(tasks, 'nowhere')).toThrow('No task nowhere.');
  });

  it('changing an approved take after cleanup resets everything built on it that had begun', () => {
    const s = startLife('graph-take');
    const p: Project = buildProject(s, METHODS['3D'], [{ name: 'Golem', patch: { roleSize: 'lead', entity: 'monster', methods: ['voice', 'motion-capture'] } }], [{ place: 'Quarry', chars: ['Golem'], minutes: 1 }]);
    approve(s, p);
    p.tasks = buildTasks(p);
    const cid = p.characters[0].id;
    // Labelled fixture: two takes, the first approved, and work begun on everything after the cleanup.
    Object.assign(mocapRecord(p, cid), { takes: [{ id: 't1', date: '2026-02-01', quality: 60, retake: false }, { id: 't2', date: '2026-02-08', quality: 75, retake: true }], approvedTakeId: 't1' });
    const cleanup = p.tasks.find((t) => t.id === `anim:mocap-cleanup:${cid}`)!;
    const downstream = [...dependents(p.tasks, cleanup.id)].filter((id) => id !== cleanup.id);
    expect(downstream.length).toBeGreaterThan(1); // more than the animation straight after it
    for (const t of p.tasks) if (t === cleanup || downstream.includes(t.id)) t.done = 0.5;
    const unrelated = p.tasks.find((t) => !downstream.includes(t.id) && t !== cleanup && t.dependsOn.length === 0)!;
    unrelated.done = 0.5;
    expect(takeChangeImpact(p, cid).map((t) => t.id).sort()).toEqual([cleanup.id, ...downstream].sort());
    approveTake(p, cid, 't2');
    expect(p.tasks.filter((t) => t === cleanup || downstream.includes(t.id)).every((t) => t.done === 0)).toBe(true);
    expect(unrelated.done).toBe(0.5); // work not built on the take stays
  });
});
