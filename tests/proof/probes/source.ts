// A project made from a work (proposal.ts createFromSource): the year's feature adapted from "The Picture of Dorian
// Gray" (public domain, from the sources catalog), its whole brief, people and outline proposed from the work, against
// the original feature the script proofs make (script.ts feature). Both are ninety-minute live-action features on the
// low budget, so what differs is what the work brings: its people, its outline and that it is adapted.
import { readFileSync } from 'node:fs';
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import type { SourceWork } from '../../../src/engine/sources';
import { createFromSource } from '../../../src/engine/proposal';
import registry from '../../../src/data/genre-registry.json';
import { unfunded } from '../career';
import { feature } from './script';
import { SERIES } from './scheduled';
import { commission } from './project-fields';

const GENRES = new Set((registry as { records: { id: string }[] }).records.map((r) => r.id));
const WORK = (JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as { records: SourceWork[] }).records.find((w) => w.title === 'The Picture of Dorian Gray')!;
/** "The Picture of Dorian Gray" adapted as a ninety-minute live-action feature, its axes changed by `axes`. */
const adaptedAs = (axes: Record<string, unknown> = {}) => (s: GameState, year: number): Project => unfunded(createFromSource(s, {
  work: WORK, title: `Year ${year + 1}`, axes: { format: 'feature', medium: 'live-action', targetRuntimeMin: 90, ...axes } as never, scenarioId: 'low', approach: 'faithful', genres: GENRES,
}));
const adapted = adaptedAs();
const A = (label: string) => `field:AdaptWork.tsx#${label}#1`;

const measure = (_s: GameState, projects: Project[]) => ({
  adapted: projects.filter((p) => p.source?.kind === 'adapted').length,
  scenes: projects.reduce((a, p) => a + p.scenes.length, 0),
  parts: projects.reduce((a, p) => a + p.characters.length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'create-from-source', features: ['action:proposal.createFromSource'], decision: 'Make the year\'s feature from "The Picture of Dorian Gray" rather than an original story',
    reads: ['src/engine/proposal.ts#createFromSource', 'src/engine/proposal.ts#proposeFromSource'],
    base: { project: feature() }, variant: { project: adapted }, measure,
    bites: ['adapted', 'parts'], downstream: ['castRates', 'spent', 'overall'],
  },
  // The adaptation screen's own fields: each is read as the work is proposed and the project created
  // (proposal.ts proposeFromSource, createFromSource), so each is varied on the adapted feature above.
  { id: 'adapt-short', features: [A('"Format"')], decision: 'Adapt "The Picture of Dorian Gray" as a fifteen-minute short rather than a feature', reads: ['src/engine/proposal.ts#proposeFromSource'],
    base: { project: adapted }, variant: { project: adaptedAs({ format: 'short', targetRuntimeMin: 15 }) }, measure, bites: ['scenes'], downstream: ['spent', 'daysToDeliver'] },
  { id: 'adapt-animated', features: [A('"Medium"'), A("{medium === 'hybrid' ? 'Animation Technique For Animated Scenes' : 'Animation Technique'}")], decision: 'Adapt it as a 3D CG animated feature rather than live action', reads: ['src/engine/production/tasks.ts#buildTasks'],
    base: { project: adapted }, // Animated, it isn't delivered within its year (4 careers): no shoot, eight more hired for the studio work.
    variant: { project: adaptedAs({ medium: 'animation', technique: '3d-cg', animationQuality: 'tv' }) }, measure, bites: ['shootDays', 'hired'], downstream: ['spent', 'delivered'] },
  { id: 'adapt-longer', features: [A("{episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'}")], decision: 'Adapt it as a two-hour feature rather than ninety minutes', reads: ['src/engine/proposal.ts#proposeFromSource'],
    base: { project: adapted }, // The work's outline is the same scenes, each longer (4 careers: nineteen more shoot days).
    variant: { project: adaptedAs({ targetRuntimeMin: 120 }) }, measure, bites: ['shootDays'], downstream: ['spent', 'daysToDeliver'] },
  // A season adapted from it, commissioned as the scheduled proofs' season is (project-fields.ts commission).
  { id: 'adapt-episodes', features: [A('"Episodes"')], decision: 'Adapt it as a four-episode season rather than two', reads: ['src/engine/proposal.ts#proposeFromSource'],
    base: { ...SERIES, project: (s, y) => commission(s, adaptedAs({ format: 'limited-series', episodeCount: 2, targetRuntimeMin: 30 })(s, y)) },
    variant: { ...SERIES, project: (s, y) => commission(s, adaptedAs({ format: 'limited-series', episodeCount: 4, targetRuntimeMin: 30 })(s, y)) }, measure, bites: ['scenes'], downstream: ['spent', 'shootDays'] },
];
