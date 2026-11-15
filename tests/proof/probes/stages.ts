// A part played by more than one performer (parts.ts): a stage takes some of the part's scenes, and the career casts it
// as it casts every part (career.ts castEveryone, each stage by its own age where it has one). On the default short,
// the lead's Street scene played by someone else "Years Later".
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { approvedCharacters, approvedScenes } from '../../engine-api';
import { addStage, removeStage } from '../../../src/engine/parts';

const lead = (p: Project) => approvedCharacters(p).find((c) => c.name === 'Lead')!;
/** Once the script is approved: the lead's Street scene given to a stage of its own. */
const later = (s: GameState, p: Project) => {
  const street = approvedScenes(p).find((x) => x.heading.place === 'Street');
  if (street) addStage(s, p, { characterId: lead(p).id, label: 'Years Later', sceneIds: [street.id], episodes: [] });
};
/** The stage added, then taken away again before anyone is cast in it. */
const laterThenBack = (s: GameState, p: Project) => { later(s, p); for (const st of p.stages ?? []) removeStage(p, st.id); };

const measure = (_s: GameState, projects: Project[]) => ({
  stages: projects.reduce((a, p) => a + (p.stages ?? []).length, 0),
  performersCast: projects.reduce((a, p) => a + p.cast.filter((x) => x.performer !== 'player').length, 0),
  stageCast: projects.reduce((a, p) => a + p.cast.filter((x) => x.stage).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'add-stage', features: ['action:parts.addStage'], decision: "Have someone else play the lead's Street scene, years later",
    reads: ['src/engine/parts.ts#addStage', 'src/engine/parts.ts#castIn'],
    base: {}, variant: { decide: later }, measure,
    bites: ['stages', 'stageCast'], downstream: ['performersCast', 'castRates', 'spent'],
  },
  {
    id: 'remove-stage', features: ['action:parts.removeStage'], decision: 'Take the Years Later stage away again before it is cast',
    reads: ['src/engine/parts.ts#removeStage', 'src/engine/parts.ts#castIn'],
    base: { decide: later }, variant: { decide: laterThenBack }, measure,
    bites: ['stages', 'stageCast'], downstream: ['performersCast', 'castRates', 'spent'],
  },
];
