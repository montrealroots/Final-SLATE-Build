// What a scene is made with and what a setup is: a mystery's clue, which needs a hero prop and answers the genre's
// call for clues (projects.ts deriveRequirements, scriptIssues), and the technique one scene of an animated short is made
// in, which sets the pipeline that makes it (projects.ts sceneTechnique; production/tasks.ts).
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';
import { short } from './script';

const S = (label: string, n = 1) => `field:ScriptViews.tsx#${label}#${n}`;
/** The default short as a detective story, the key under the mat planted in the flat and found in the café, as `kind`. */
const detective = (kind: 'setup' | 'clue') => (s: GameState, year: number): Project => {
  const p = short({ axes: { genres: [{ id: 'detective', emphasis: 'primary' }] } })(s, year);
  const at = (place: string) => p.scenes.find((x) => x.heading.place === place)!.id;
  p.setups.push({ id: 'su-key', kind, label: 'The key under the mat', plantedIn: at('Flat'), paidIn: at('Cafe') });
  return p;
};
/** A five-minute 3D CG short of two scenes, its second made in `second` (or the film's own technique). */
const cgWith = (second: 'none' | '2d-drawn') => (s: GameState, year: number): Project => unfunded(buildProject(s,
  { title: `Year ${year + 1}`, format: 'short', medium: 'animation', technique: '3d-cg', quality: 'tv', scenario: 'micro', genres: ['drama'], runtime: 5 },
  [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
  [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 2 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 3, extra: { technique: second } }]));
const tasks = (_s: GameState, projects: Project[]) => ({ taskKinds: projects.reduce((a, p) => a + new Set(p.tasks.map((t) => t.kind)).size, 0) });

export const PROBES: Probe[] = [
  { id: 'setup-clue', features: [S('"Kind"', 2)], decision: 'In a detective story, mark the key under the mat a clue rather than a setup', reads: ['src/engine/projects.ts#deriveRequirements', 'src/engine/projects.ts#scriptIssues'],
    base: { project: detective('setup') }, variant: { project: detective('clue') }, bites: ['quality.script', 'spent'], downstream: ['overall', 'reception', 'money'] },
  { id: 'scene-technique', features: [S('"Technique For This Scene"')], decision: 'Make the 3D CG short\'s second scene in drawn 2D rather than 3D CG', reads: ['src/engine/projects.ts#sceneTechnique', 'src/engine/production/tasks.ts#buildTasks'],
    base: { project: cgWith('none') }, variant: { project: cgWith('2d-drawn') }, measure: tasks, bites: ['taskKinds'], downstream: ['spent', 'daysToDeliver', 'hired'] },
];
