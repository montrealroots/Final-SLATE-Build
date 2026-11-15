// Who is in a scene and how a part is entered for awards: a character ticked into a scene is booked for its days
// (hiring.ts estimateDays), a contributor ticked into an interview needs that interview (projects.ts deriveRequirements)
// and, appearing only with their face hidden, blurring after lock (production/tasks.ts),
// and a lead entered as supporting competes in the supporting categories (script-effects.ts castPlacement).
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { actingMeasure, enterActing, feature, short } from './script';
import { askAll, checkClaims, doc } from './documentary';

const S = (label: string, n = 1) => `field:ScriptViews.tsx#${label}#${n}`;
/** The default short, its friend also in the street scene. */
const friendInStreet = (s: GameState, year: number): Project => {
  const p = short()(s, year);
  const friend = p.characters.find((c) => c.name === 'Friend')!.id;
  p.scenes.find((x) => x.heading.place === 'Street')!.participants.push(friend);
  return p;
};
const friendDays = (_s: GameState, projects: Project[]) => ({ friendDays: projects.reduce((a, p) => { const f = p.characters.find((c) => c.name === 'Friend'); return a + p.hires.filter((h) => h.characterId === f?.id && h.status === 'accepted').reduce((b, h) => b + h.estDays, 0); }, 0) });
/** The documentary with a third contributor, a swimmer who appears only with their face hidden, interviewed in the lifeguard's scene or in none. */
const withSwimmer = (inScene: boolean) => (s: GameState, year: number): Project => {
  const p = doc(s, year);
  p.contributors.push({ id: 'ct3', name: 'A Swimmer (Fixture)', role: 'Swimmer', consent: 'not-asked', restrictions: ['face'] } as never);
  if (inScene) p.scenes[0].contributorIds.push('ct3');
  return p;
};
const interviews = (_s: GameState, projects: Project[]) => ({
  interviews: projects.reduce((a, p) => a + p.requirements.filter((r) => r.kind === 'interview').length, 0),
  blurDays: projects.reduce((a, p) => a + p.tasks.filter((t) => t.kind === 'post:blur').reduce((b, t) => b + t.units, 0), 0),
});
const DOC = { decide: askAll, beforeManage: checkClaims };

export const PROBES: Probe[] = [
  { id: 'scene-character', features: [S('{c.name}')], decision: 'Put the friend in the street scene too', reads: ['src/engine/hiring.ts#estimateDays'],
    base: { project: short() }, variant: { project: friendInStreet }, measure: friendDays, bites: ['friendDays'], downstream: ['spent', 'ownIn'] },
  { id: 'scene-contributor', features: [S('{c.name}', 2)], decision: 'Interview the swimmer in the lifeguard\'s scene rather than leave them out', reads: ['src/engine/projects.ts#deriveRequirements', 'src/engine/production/tasks.ts#buildTasks'],
    base: { project: withSwimmer(false), ...DOC }, variant: { project: withSwimmer(true), ...DOC }, measure: interviews, bites: ['interviews'], downstream: ['blurDays', 'spent', 'daysToDeliver'] },
  // As lead-role-size (script.ts), with the part still written as the lead and only its awards placement changed.
  { id: 'award-placement', features: [S('"Awards Placement"')], decision: 'Enter the lead in the supporting categories', reads: ['src/engine/script-effects.ts#castPlacement', 'src/engine/awards.ts#creditedRecipients'],
    seeds: 30, base: { years: 3, daily: enterActing, project: feature() }, variant: { years: 3, daily: enterActing, project: feature({ awardPlacement: 'supporting' }) },
    measure: actingMeasure, bites: ['leadEntries'], downstream: ['actingDecided', 'actingHonours', 'supportingEntries'] },
];
