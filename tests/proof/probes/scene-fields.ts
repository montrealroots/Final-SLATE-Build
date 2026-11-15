// A scene's own fields and a character's place in a series: which look a character is in for each scene, what kind of
// scene a documentary's is and what it rests on, and whether a series character is a regular. Each changed on the film
// it applies to, where CONTROLS.csv says it is read.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';
import { short } from './script';
import { askAll, checkClaims, doc } from './documentary';
import { commission } from './project-fields';
import { SERIES } from './scheduled';

const S = (label: string) => `field:ScriptViews.tsx#${label}#1`;
/** The default short, its lead in a built costume with three looks, each scene in the look `looks` gives it by index. */
const inLooks = (looks: number[]) => (s: GameState, year: number): Project => {
  const p = short({ lead: { look: { wardrobe: 'build', states: 3 } } })(s, year);
  const lead = p.characters.find((c) => c.name === 'Lead')!.id;
  p.scenes.forEach((sc, i) => { sc.states = { ...sc.states, [lead]: looks[i] ?? 0 }; });
  return p;
};
/** The documentary (documentary.ts doc) with its third scene changed. */
const docWith = (patch: Record<string, unknown>) => (s: GameState, year: number): Project => { const p = doc(s, year); Object.assign(p.scenes[2], patch); return p; };
const DOC = { decide: askAll, beforeManage: checkClaims };
/** The days the guide was contracted for, across the seasons made. */
const guideDays = (_s: GameState, projects: Project[]) => ({ guideDays: projects.reduce((a, p) => { const g = p.characters.find((c) => c.name === 'Guide'); return a + p.hires.filter((h) => h.characterId === g?.id && h.status === 'accepted').reduce((b, h) => b + h.estDays, 0); }, 0) });
const research = (_s: GameState, projects: Project[]) => ({ researchItems: projects.reduce((a, p) => a + (p.tasks.find((t) => t.kind === 'doc:research')?.units ?? 0), 0) });
/**
 * A commissioned season of eight episodes, two scenes each, with a guide in the first episode's pier scene who is
 * `involvement`. Any part is booked for at least a sixth or so of the shoot (hiring.ts estimateDays), so with two or four
 * episodes the guide's one scene already took as many days as a regular's least (November 15, 2026: 2 and 4 both ways).
 */
const withGuide = (involvement: 'regular' | 'single') => (s: GameState, year: number): Project => commission(s, unfunded(buildProject(s,
  { title: `Season ${year + 1}`, format: 'limited-series', medium: 'live-action', scenario: 'micro', genres: ['drama'], episodes: 8, runtime: 20 },
  [{ name: 'Mara', patch: { roleSize: 'lead' } }, { name: 'Guide', patch: { roleSize: 'supporting', seriesInvolvement: involvement } }],
  [1, 2, 3, 4, 5, 6, 7, 8].flatMap((e) => [{ place: 'Pier', chars: e === 1 ? ['Mara', 'Guide'] : ['Mara'], minutes: 3, extra: { episode: e } }, { place: 'Quay', intExt: 'EXT' as const, chars: ['Mara'], minutes: 3, extra: { episode: e } }]))));

export const PROBES: Probe[] = [
  // A copy of the costume is made for each look a scene shows (looks.ts costumeCopies), and a change between looks on a
  // day comes out of it (looks.ts changeMinutes).
  { id: 'scene-look', features: [S("{`${c.name}'s Look In This Scene`}")], decision: 'Put the lead in a different one of their three looks in each scene, rather than the same one throughout', reads: ['src/engine/looks.ts#costumeCopies', 'src/engine/looks.ts#changeMinutes'],
    base: { project: inLooks([0, 0, 0]) }, variant: { project: inLooks([0, 1, 2]) }, bites: ['spent'], downstream: ['ownIn', 'overall'] },
  // Archive material is licensed (projects.ts deriveRequirements): the third scene, actuality, made from the archive instead.
  { id: 'scene-archival', features: [S('"Kind"')], decision: 'Make the documentary\'s third scene from archive footage rather than film it', reads: ['src/engine/projects.ts#deriveRequirements'],
    base: { project: doc, ...DOC }, variant: { project: docWith({ kind: 'archival' }), ...DOC }, bites: ['shootDays'], downstream: ['hired', 'spent'] },
  // A scene presented as sourced fact with no fact linked is one more thing to research (production/tasks.ts doc:research);
  // marked dramatized, it asks nothing.
  { id: 'scene-dramatized', features: [S('"Basis"')], decision: 'Mark the documentary\'s third scene, with no fact linked, as dramatized rather than sourced fact', reads: ['src/engine/production/tasks.ts#buildTasks'],
    base: { project: docWith({ evidenceIds: [] }), ...DOC }, variant: { project: docWith({ basis: 'dramatized', evidenceIds: [] }), ...DOC }, measure: research, bites: ['researchItems'], downstream: ['spent', 'daysToDeliver'] },
  // A regular is booked at least a day in every episode and credited in all (hiring.ts estimateDays).
  { id: 'series-regular', features: [S('"Series Involvement"')], decision: 'Make the guide, in one scene of the first of eight episodes, a series regular rather than one episode\'s', reads: ['src/engine/hiring.ts#estimateDays'],
    base: { ...SERIES, project: withGuide('single') }, variant: { ...SERIES, project: withGuide('regular') }, measure: guideDays, bites: ['guideDays'], downstream: ['ownIn', 'spent'] },
];
