// The script's own checks (projects.ts scriptIssues): a line given to someone not in the scene blocks approval unless
// the scene is marked an intentional discontinuity; a setup planted and paid off counts toward the script's assessment
// (finish.ts assessQuality: the share of setups whose plant and payoff are both in the cut). On the default short.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { short } from './script';

const S = (label: string) => `field:ScriptViews.tsx#"${label}"#1`;
const id = (p: Project, name: string) => p.characters.find((c) => c.name === name)!.id;
/**
 * The short with the friend speaking a line over the Street scene. A line for someone not in the scene blocks approval
 * unless the scene is marked deliberate, so the player either marks it (a voice heard, not seen) or puts the friend in
 * the scene, who is then on the street shoot. Unmarked and unchanged, the script can't be approved at all.
 */
const voiceOver = (deliberate: boolean) => (s: GameState, year: number): Project => {
  const p = short()(s, year);
  const street = p.scenes.find((x) => x.heading.place === 'Street')!;
  street.dialogue = [{ id: `${street.id}-1`, characterId: id(p, 'Friend'), text: 'You never looked back.', language: 'en' }];
  if (deliberate) street.intentionalDiscontinuity = true;
  else street.participants = [...street.participants, id(p, 'Friend')];
  return p;
};
/** The days the friend was contracted for, across the films made. */
const friendDays = (_s: GameState, projects: Project[]) => ({ friendDays: projects.reduce((a, p) => { const f = p.characters.find((c) => c.name === 'Friend'); return a + p.hires.filter((h) => h.characterId === f?.id && h.status === 'accepted').reduce((b, h) => b + h.estDays, 0); }, 0) });
/** The short with a setup ("The key under the mat") planted in the flat and paid off where `paid` says, or nowhere. */
const keyUnderMat = (paid: 'Cafe' | null) => (s: GameState, year: number): Project => {
  const p = short()(s, year);
  const at = (place: string) => p.scenes.find((x) => x.heading.place === place)!.id;
  p.setups.push({ id: 'su-key', kind: 'setup', label: 'The key under the mat', plantedIn: at('Flat'), paidIn: paid ? at(paid) : null });
  return p;
};

export const PROBES: Probe[] = [
  { id: 'intentional-discontinuity', features: [S('Intentional Discontinuity')], decision: 'Mark the Street scene an intentional discontinuity, the friend heard but not seen, rather than put the friend in it', reads: ['src/engine/projects.ts#scriptIssues', 'src/engine/hiring.ts#estimateDays'],
    base: { project: voiceOver(false) }, variant: { project: voiceOver(true) }, measure: friendDays, bites: ['friendDays'], downstream: ['spent', 'ownIn'] },
  // Unpaid, the setup is a note on the script (projects.ts scriptIssues) and counts for none of the setups' share.
  { id: 'setup-paid-off', features: [S('Pays Off In')], decision: 'Pay off the key under the mat in the café rather than nowhere', reads: ['src/engine/finish.ts#assessQuality', 'src/engine/projects.ts#scriptIssues'],
    base: { project: keyUnderMat(null) }, variant: { project: keyUnderMat('Cafe') }, bites: ['quality.script'], downstream: ['overall', 'reception'] },
];
