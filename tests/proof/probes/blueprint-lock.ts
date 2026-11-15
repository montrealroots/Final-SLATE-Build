// A field locked against a story (blueprints.ts setLock): applying a full story leaves a locked field as it is. A feature
// set in 1950, then given "The Quiet Floor" (the tests' fixture story, contemporary Lisbon): with its year locked it
// stays a period film, whose looks and builds are the period's (looks.ts projectBand); unlocked, the story makes it today.
import { readFileSync } from 'node:fs';
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { applyBlueprint, parseBlueprints, setLock } from '../../../src/engine/blueprints';
import { feature } from './script';

const HEIST = parseBlueprints(readFileSync('tests/fixtures/stories.bp', 'utf8')).blueprints.find((b) => b.id === 'heist.f01')!;
const storied = (lock: boolean, keep: string[] = []) => (s: GameState, year: number): Project => {
  const p = feature()(s, year);
  p.axes.storyYear = 1950;
  if (lock) setLock(p, 'year', true);
  applyBlueprint(s, p, HEIST, { keep });
  return p;
};

const measure = (_s: GameState, projects: Project[]) => ({
  periodFilms: projects.filter((p) => p.axes.storyYear === 1950).length,
  parts: projects.reduce((a, p) => a + p.characters.length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'lock-field', features: ['action:blueprints.setLock'], decision: "Lock the film's 1950 setting before applying a contemporary story to it",
    reads: ['src/engine/blueprints.ts#setLock', 'src/engine/blueprints.ts#applyBlueprint', 'src/engine/looks.ts#periodBand'],
    base: { project: storied(false) }, variant: { project: storied(true) }, measure,
    bites: ['periodFilms'], downstream: ['spent', 'daysToDeliver'],
  },
  // Revising the brief from the story, the player keeps what they already wrote field by field (ReviseBrief.tsx; the
  // keep list of blueprints.ts applyBlueprint): the year, which keeps it a period film, as the lock does.
  {
    id: 'keep-year', features: ['field:ReviseBrief.tsx#{`Keep My ${c.label}`}#1'], decision: "Keep the film's 1950 setting when revising its brief from a contemporary story",
    reads: ['src/engine/blueprints.ts#applyBlueprint', 'src/engine/looks.ts#periodBand'],
    base: { project: storied(false) }, variant: { project: storied(false, ['year']) }, measure,
    bites: ['periodFilms'], downstream: ['spent', 'daysToDeliver'],
  },
  // A list field kept "and add none": the story's characters aren't added beside the film's own two.
  {
    id: 'keep-characters', features: ['field:ReviseBrief.tsx#{`Keep My ${c.label} And Add None`}#1'], decision: "Keep the film's own characters and add none of the story's",
    reads: ['src/engine/blueprints.ts#applyBlueprint', 'src/engine/hiring.ts#neededRoles'],
    base: { project: storied(false) }, variant: { project: storied(false, ['characters']) }, measure,
    bites: ['parts'], downstream: ['castRates', 'spent'],
  },
];
