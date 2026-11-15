// Who is in a scene and how a part is entered for awards: a character ticked into a scene is booked for its days
// (hiring.ts estimateDays), a contributor ticked into an interview needs that interview (projects.ts deriveRequirements)
// and, appearing only with their face hidden, blurring after lock (production/tasks.ts),
// and a lead entered as supporting competes in the supporting categories (script-effects.ts castPlacement).
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { actingMeasure, enterActing, feature, short } from './script';
import { archiveCharacter, splitCharacter } from '../../../src/engine/projects';
import { cutScenes, screenTotal } from '../../../src/engine/screen-time';
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

// Setting a character aside gives their scenes, lines and relationships to whoever is chosen (projects.ts
// archiveCharacter); splitting one gives the scenes chosen to a new character (projects.ts splitCharacter). Each is
// done to the short before it is approved, and what follows is who is booked for which days.
const daysOf = (name: string) => (_s: GameState, projects: Project[]) => ({ [`${name}Days`]: projects.reduce((a, p) => { const c = p.characters.find((x) => x.name === name); return a + p.hires.filter((h) => h.characterId === c?.id && h.status === 'accepted').reduce((b, h) => b + h.estDays, 0); }, 0) });
/** The default short with a neighbour in the street scene, the friend set aside and their scenes given to `to`, or to nobody. */
const friendAside = (to: 'Neighbour' | null) => (s: GameState, year: number): Project => {
  const p = short()(s, year);
  const neighbour = { ...structuredClone(p.characters.find((c) => c.name === 'Friend')!), id: `${p.id}-nb`, name: 'Neighbour' };
  p.characters.push(neighbour);
  p.scenes.find((x) => x.heading.place === 'Street')!.participants.push(neighbour.id);
  archiveCharacter(s, p, p.characters.find((c) => c.name === 'Friend')!.id, to ? neighbour.id : undefined);
  return p;
};
/** The default short with the lead split: the scenes at `places` played by their older self. */
const leadSplit = (places: string[]) => (s: GameState, year: number): Project => {
  const p = short()(s, year);
  splitCharacter(s, p, p.characters.find((c) => c.name === 'Lead')!.id, p.scenes.filter((x) => places.includes(x.heading.place)).map((x) => x.id), 'Older');
  return p;
};
/** The older self's booked days, the lead's, and the scenes of the delivered cut the older self is in (screen-time.ts). */
const splitMeasure = (s: GameState, projects: Project[]) => ({
  ...daysOf('Older')(s, projects), ...daysOf('Lead')(s, projects),
  olderInCut: projects.filter((p) => p.delivered).reduce((a, p) => { const c = p.characters.find((x) => x.name === 'Older'); return a + (c ? screenTotal(p, c.id, cutScenes(p)).scenes : 0); }, 0),
});
PROBES.push(
  { id: 'archive-reassign', features: [S('"Give Their Scenes, Lines And Relationships To"')], decision: 'Set the friend aside and give their scenes to the neighbour rather than to nobody', reads: ['src/engine/projects.ts#archiveCharacter', 'src/engine/hiring.ts#estimateDays'],
    base: { project: friendAside(null) }, variant: { project: friendAside('Neighbour') }, measure: daysOf('Neighbour'), bites: ['NeighbourDays'], downstream: ['spent', 'ownIn'] },
  { id: 'split-scenes', features: [S('{sceneLabel(p, s)}', 2)], decision: 'Split the lead, the older self taking the street and the café rather than only the café', reads: ['src/engine/projects.ts#splitCharacter', 'src/engine/hiring.ts#estimateDays', 'src/engine/screen-time.ts#screenTotal'],
    base: { project: leadSplit(['Cafe']) }, variant: { project: leadSplit(['Street', 'Cafe']) }, measure: splitMeasure, bites: ['OlderDays'], downstream: ['olderInCut', 'LeadDays'] },
);
