// More of the plan's fields: a stage's age, and a season shot in blocks. On the default short with its Street scene
// played years later (stages.ts), and on the commissioned season (scheduled.ts SERIES), whose two episodes share their
// places and their director (you).
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { approvedCharacters, approvedScenes } from '../../engine-api';
import { addStage } from '../../../src/engine/parts';
import { SERIES } from './scheduled';

const P = (label: string) => `field:PlanViews.tsx#${label}#1`;
/** Once the script is approved: the lead's Street scene given to a stage of its own, at `age` when given. */
const later = (age?: number) => (s: GameState, p: Project) => {
  const street = approvedScenes(p).find((x) => x.heading.place === 'Street');
  const lead = approvedCharacters(p).find((c) => c.name === 'Lead');
  if (street && lead) addStage(s, p, { characterId: lead.id, label: 'Years Earlier', sceneIds: [street.id], episodes: [], ...(age !== undefined ? { age } : {}) });
};
/** Once the script is approved: Mara years later in the second episode, as a stage given the episode or its pier scene. */
const olderIn = (episode: boolean) => (s: GameState, p: Project) => {
  const mara = approvedCharacters(p).find((c) => c.name === 'Mara');
  const pier = approvedScenes(p).find((x) => x.episode === 2 && x.heading.place === 'Pier');
  if (mara && pier) addStage(s, p, { characterId: mara.id, label: 'Years Later', sceneIds: episode ? [] : [pier.id], episodes: episode ? [2] : [] });
};
/** The days booked for the stage's performer, and for the main one. */
const stageDays = (_s: GameState, projects: Project[]) => {
  const hired = projects.flatMap((p) => p.hires.filter((h) => h.status === 'accepted' && h.characterId && h.roleId === 'actor'));
  return { stageDays: hired.filter((h) => h.stage).reduce((a, h) => a + h.estDays, 0), mainDays: hired.filter((h) => !h.stage).reduce((a, h) => a + h.estDays, 0) };
};
/** Before the money is raised: the season shot in blocks. */
const blocks = (_s: GameState, p: Project) => { p.schedule.blockEpisodes = true; };

export const PROBES: Probe[] = [
  // A stage's own age is read for the child rules (minors.ts minorFor): the lead as a ten-year-old in that scene.
  { id: 'stage-age-child', features: [P('"Age In These Scenes (Optional)"')], decision: "Have a ten-year-old play the lead's Street scene, years earlier, rather than a stage with no age", reads: ['src/engine/minors.ts#minorFor', 'src/engine/parts.ts#addStage'],
    base: { decide: later() }, variant: { decide: later(10) }, bites: ['hired'], downstream: ['spent', 'daysToDeliver'] },
  // Scenes at the same place in episodes with the same director share days (production/schedule.ts).
  { id: 'shoot-in-blocks', features: [P('"Shoot Episodes In Blocks"')], decision: 'Shoot the season\'s two episodes in a block, sharing days at the pier and the quay', reads: ['src/engine/production/schedule.ts#generatePlan'],
    base: SERIES, variant: { ...SERIES, decide: blocks }, bites: ['shootDays'], downstream: ['spent', 'daysToDeliver'] },
  // A stage given an episode takes every scene of it (parts.ts stageIn): its performer is booked for them, the main
  // performer for fewer (hiring.ts estimateDays). Mara years later in the season's second episode: all of it, or its pier
  // scene alone.
  { id: 'stage-episode', features: [P('{`Episode ${e}`}')], decision: 'Give the older Mara all of the second episode rather than its pier scene alone', reads: ['src/engine/parts.ts#stageIn', 'src/engine/hiring.ts#estimateDays'],
    base: { ...SERIES, decide: olderIn(false) }, variant: { ...SERIES, decide: olderIn(true) }, measure: stageDays, bites: ['stageDays'], downstream: ['mainDays', 'spent'] },
];
