// A field locked against a story (blueprints.ts setLock): applying a full story leaves a locked field as it is. A feature
// set in 1950, then given "The Quiet Floor" (the tests' fixture story, contemporary Lisbon): with its year locked it
// stays a period film, whose looks and builds are the period's (looks.ts projectBand); unlocked, the story makes it today.
import { readFileSync } from 'node:fs';
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { applyBlueprint, parseBlueprints, setLock } from '../../../src/engine/blueprints';
import { feature } from './script';

const HEIST = parseBlueprints(readFileSync('tests/fixtures/stories.bp', 'utf8')).blueprints.find((b) => b.id === 'heist.f01')!;
const storied = (lock: boolean) => (s: GameState, year: number): Project => {
  const p = feature()(s, year);
  p.axes.storyYear = 1950;
  if (lock) setLock(p, 'year', true);
  applyBlueprint(s, p, HEIST);
  return p;
};

const measure = (_s: GameState, projects: Project[]) => ({
  periodFilms: projects.filter((p) => p.axes.storyYear === 1950).length,
});

export const PROBES: Probe[] = [
  {
    id: 'lock-field', features: ['action:blueprints.setLock'], decision: "Lock the film's 1950 setting before applying a contemporary story to it",
    reads: ['src/engine/blueprints.ts#setLock', 'src/engine/blueprints.ts#applyBlueprint', 'src/engine/looks.ts#periodBand'],
    base: { project: storied(false) }, variant: { project: storied(true) }, measure,
    bites: ['periodFilms'], downstream: ['spent', 'daysToDeliver'],
  },
];
