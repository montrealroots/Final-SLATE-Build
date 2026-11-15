// A sequel (sequel.ts continueProject): the second year's short continues the first, rather than starting afresh with
// the same characters. A continuation keeps the character builds already finished at the design they were built to
// (models and rigs here), so its animation waits on less. On a five-minute 3D CG short, two years.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { unfunded } from '../career';
import { agreedFunding, buildProject, writePitch } from '../../helpers';
import { addScene, updateScene } from '../../engine-api';
import { continueProject } from '../../../src/engine/sequel';

const AXES = { format: 'short' as const, medium: 'animation' as const, technique: '3d-cg' as const, quality: 'tv' as const, scenario: 'micro', genres: ['drama'], runtime: 5 };
const CHARS = [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }];
const SCENES = [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 2 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 3 }];
const fresh = (s: GameState, year: number): Project => unfunded(buildProject(s, { title: `Year ${year + 1}`, ...AXES }, CHARS, SCENES));

/** The first year's short continued: its characters carried over, the same two scenes written for it. */
const sequel = (s: GameState, year: number): Project => {
  const prev = s.projects.find((x) => x.delivered && !x.continuedBy);
  if (year === 0 || !prev) return fresh(s, year);
  const p = continueProject(s, prev, `Year ${year + 1}`);
  agreedFunding(p);
  writePitch(p);
  const id = (name: string) => p.characters.find((c) => c.name === name)!.id;
  for (const sc of SCENES) {
    const x = addScene(s, p, 1);
    updateScene(p, x.id, { heading: { intExt: 'INT', place: sc.place, time: 'DAY' }, storyLocation: sc.place, participants: sc.chars.map(id), objective: 'Move the story forward.', action: 'Action.', estMinutes: sc.minutes } as never);
  }
  return unfunded(p);
};

const BUILDS = ['anim:model', 'anim:rig'];
const measure = (_s: GameState, projects: Project[]) => ({
  continued: projects.filter((p) => p.continues).length,
  buildDays: projects.reduce((a, p) => a + p.tasks.filter((t) => BUILDS.includes(t.kind)).reduce((b, t) => b + t.workedDays, 0), 0),
});

export const PROBES: Probe[] = [
  {
    id: 'continue-project', features: ['action:sequel.continueProject'], decision: "Make the second year's short a sequel to the first, not a new film with the same characters",
    reads: ['src/engine/sequel.ts#continueProject'],
    base: { project: fresh }, variant: { project: sequel }, measure,
    bites: ['continued', 'buildDays'], downstream: ['spent', 'daysToDeliver'],
  },
];
