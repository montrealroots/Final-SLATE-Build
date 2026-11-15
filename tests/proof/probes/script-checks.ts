// The script's own checks (projects.ts scriptIssues): a line given to someone not in the scene blocks approval unless
// the scene is marked an intentional discontinuity; a setup planted and paid off counts toward the script's assessment
// (finish.ts assessQuality: the share of setups whose plant and payoff are both in the cut). On the default short.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { short } from './script';
import { askAll, checkClaims, doc } from './documentary';

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
const keyUnderMat = (paid: 'Cafe' | null, planted: 'Flat' | null = 'Flat') => (s: GameState, year: number): Project => {
  const p = short()(s, year);
  const at = (place: string) => p.scenes.find((x) => x.heading.place === place)!.id;
  p.setups.push({ id: 'su-key', kind: 'setup', label: 'The key under the mat', plantedIn: planted ? at(planted) : null, paidIn: paid ? at(paid) : null });
  return p;
};
/** The short, its lead in a built costume, with as many looks as `names`, each scene in the next look. */
const namedLooks = (names: string[]) => (s: GameState, year: number): Project => {
  const p = short({ lead: { look: { wardrobe: 'build', ...(names.length ? { named: names } : {}) } } })(s, year);
  const lead = id(p, 'Lead');
  p.scenes.forEach((sc, i) => { sc.states = { [lead]: names.length ? i % names.length : 0 }; });
  return p;
};
/** The documentary (documentary.ts doc) changed by `fn`: its contributors asked, its claims checked once researched. */
const docWith = (fn: (p: Project) => void) => (s: GameState, year: number): Project => { const p = doc(s, year); fn(p); return p; };
const DOC = { decide: askAll, beforeManage: checkClaims };
const research = (_s: GameState, projects: Project[]) => ({
  researchItems: projects.reduce((a, p) => a + (p.tasks.find((t) => t.kind === 'doc:research')?.units ?? 0), 0),
  claimsChecked: projects.reduce((a, p) => a + (p.tasks.find((t) => t.kind === 'doc:factcheck')?.units ?? 0), 0),
});

export const PROBES: Probe[] = [
  { id: 'intentional-discontinuity', features: [S('Intentional Discontinuity')], decision: 'Mark the Street scene an intentional discontinuity, the friend heard but not seen, rather than put the friend in it', reads: ['src/engine/projects.ts#scriptIssues', 'src/engine/hiring.ts#estimateDays'],
    base: { project: voiceOver(false) }, variant: { project: voiceOver(true) }, measure: friendDays, bites: ['friendDays'], downstream: ['spent', 'ownIn'] },
  // Unpaid, the setup is a note on the script (projects.ts scriptIssues) and counts for none of the setups' share.
  { id: 'setup-paid-off', features: [S('Pays Off In')], decision: 'Pay off the key under the mat in the café rather than nowhere', reads: ['src/engine/finish.ts#assessQuality', 'src/engine/projects.ts#scriptIssues'],
    base: { project: keyUnderMat(null) }, variant: { project: keyUnderMat('Cafe') }, bites: ['quality.script'], downstream: ['overall', 'reception'] },
  { id: 'setup-planted', features: [S('Planted In')], decision: 'Plant the key under the mat in the flat rather than nowhere, its payoff in the café', reads: ['src/engine/finish.ts#assessQuality', 'src/engine/projects.ts#scriptIssues'],
    base: { project: keyUnderMat('Cafe', null) }, variant: { project: keyUnderMat('Cafe', 'Flat') }, bites: ['quality.script'], downstream: ['overall', 'reception'] },
  // As many looks as names (looks.ts statesOf), each a costume copy (looks.ts costumeCopies) and a change between them.
  { id: 'looks-named', features: ["field:ScriptViews.tsx#{`Names Of ${c.name}'s Looks`}#1"], decision: 'Name three looks for the lead (Day, Night, Storm), one to a scene, rather than none', reads: ['src/engine/looks.ts#statesOf', 'src/engine/looks.ts#costumeCopies'],
    base: { project: namedLooks([]) }, variant: { project: namedLooks(['Day', 'Night', 'Storm']) }, bites: ['spent'], downstream: ['ownIn', 'daysToDeliver'] },
  // A claim not dramatized is fact-checked (projects.ts deriveRequirements; production/tasks.ts doc:factcheck).
  { id: 'claim-dramatized', features: ['field:ScriptViews.tsx#"Status"#2'], decision: 'Mark the documentary\'s claim dramatized rather than established', reads: ['src/engine/projects.ts#deriveRequirements', 'src/engine/production/tasks.ts#buildTasks'],
    base: { project: doc, ...DOC }, variant: { project: docWith((p) => { p.evidence[0].status = 'dramatized'; }), ...DOC }, measure: research, bites: ['claimsChecked'], downstream: ['spent', 'hired'] },
  { id: 'claim-added', features: [S('Claim')], decision: 'Add a second claim to the documentary, "The lifeguards saved forty people in 1987."', reads: ['src/engine/projects.ts#deriveRequirements', 'src/engine/production/tasks.ts#buildTasks'],
    base: { project: doc, ...DOC }, variant: { project: docWith((p) => { p.evidence.push({ id: 'ev2', claim: 'The lifeguards saved forty people in 1987.', status: 'established', sourceNote: '', verified: false } as never); }), ...DOC }, measure: research, bites: ['claimsChecked', 'researchItems'], downstream: ['spent', 'daysToDeliver'] },
  // A scene presented as sourced fact with a fact linked needs no sourcing of its own (production/tasks.ts doc:research).
  { id: 'claim-linked', features: ['field:ScriptViews.tsx#{e.claim.slice(0, 50)}#1'], decision: 'Link the documentary\'s third scene to its checked claim rather than to none', reads: ['src/engine/production/tasks.ts#buildTasks'],
    base: { project: docWith((p) => { p.scenes[2].evidenceIds = []; }), ...DOC }, variant: { project: doc, ...DOC }, measure: research, bites: ['researchItems'], downstream: ['spent', 'daysToDeliver'] },
  // An age range reaching sixteen or over isn't a child's part (minors.ts minorFor): no tutor or chaperone, no child's hours.
  { id: 'age-range', features: [S('Up To')], decision: 'Write the lead as ten to thirty rather than ten', reads: ['src/engine/story-age.ts#storyAge', 'src/engine/minors.ts#minorFor'],
    base: { project: short({ lead: { ageInStory: '10' } }) }, variant: { project: short({ lead: { ageInStory: '10 to 30' } }) }, bites: ['hired'], downstream: ['daysToDeliver', 'spent'] },
];
