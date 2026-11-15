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

const GENRES = new Set((registry as { records: { id: string }[] }).records.map((r) => r.id));
const WORK = (JSON.parse(readFileSync('src/data/sources.json', 'utf8')) as { records: SourceWork[] }).records.find((w) => w.title === 'The Picture of Dorian Gray')!;
const adapted = (s: GameState, year: number): Project => unfunded(createFromSource(s, {
  work: WORK, title: `Year ${year + 1}`, axes: { format: 'feature', medium: 'live-action', targetRuntimeMin: 90 }, scenarioId: 'low', approach: 'faithful', genres: GENRES,
}));

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
];
