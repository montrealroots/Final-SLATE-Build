// More of the script's fields, each changed on the default short (script.ts short): what a scene asks for (dance, an
// intimate scene, water work, a crowd's makeup and whether it is extended in post), what a character is (a child, the
// narrator, a French speaker, a puppet, a look that changes), the year the story is set, and the content declared. Each
// is read where the code says (docs/input-audit/CONTROLS.csv), and measured where it reaches the shoot, the post and
// the money.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { short } from './script';
import { SERIES } from './scheduled';

const F = (label: string) => `field:ScriptViews.tsx#"${label}"#1`;
const COST = { bites: ['spent'], downstream: ['money', 'daysToDeliver'] };
// What a requirement brings beyond its cost: the specialist it calls for (an intimacy coordinator, a marine coordinator,
// a dialect coach, a puppeteer) and the money the player has to put in for it. The career's final balance, two years of
// income, hides a few thousand dollars (November 15, 2026: these measured only it, and showed nothing at 40 careers).
const CREW = { bites: ['spent'], downstream: ['hired', 'ownIn'] };
const watched = (_s: GameState, projects: Project[]) => ({
  lateSlots: projects.reduce((a, p) => a + p.offers.filter((o) => o.status === 'accepted' && o.slot === 'late').length, 0),
  viewers: projects.reduce((a, p) => a + p.offers.flatMap((o) => o.audience ?? []).reduce((b, x) => b + (x.metric === 'viewers' ? x.value : 0), 0), 0),
});
/** The commissioned series (scheduled.ts SERIES), its content declared as strong violence. */
const violent = (s: GameState, year: number): Project => { const p = SERIES.project(s, year); p.axes.content = { violence: 'strong' }; return p; };

export const PROBES: Probe[] = [
  { id: 'scene-dance', features: [F('Dance')], decision: 'Make every scene a dance number', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { dance: true } }) }, ...COST },
  { id: 'scene-intimacy', features: [F('Intimate Scene')], decision: 'Make every scene an intimate one', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { intimacy: true } }) }, ...CREW },
  { id: 'scene-water', features: [F('Water Work')], decision: 'Put every scene in or on the water', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { water: true } }) }, ...CREW },
  { id: 'crowd-makeup', features: [F('Crowd Makeup')], decision: 'Give a crowd of twenty period hair in every scene', reads: ['src/engine/looks.ts#makeupDayCost'],
    base: { project: short({ scene: { crowd: 20 } }) }, variant: { project: short({ scene: { crowd: 20, crowdLook: 'period-hair' } }) }, bites: ['spent'], downstream: ['ownIn', 'overall'] },
  { id: 'crowd-digital', features: [F('Extend The Crowd In Post')], decision: 'Extend a crowd of forty in post rather than hire them all', reads: ['src/engine/looks.ts#digitalCrowd', 'src/engine/looks.ts#physicalCrowd'],
    base: { project: short({ scene: { crowd: 40 } }) }, variant: { project: short({ scene: { crowd: 40, crowdMethod: 'digital' } }) }, ...COST },
  { id: 'lead-child', features: [F('Age In Story')], decision: 'Write the lead as a ten-year-old', reads: ['src/engine/minors.ts#minorFor'],
    variant: { project: short({ lead: { ageInStory: '10' } }) }, ...COST },
  { id: 'lead-narrator', features: ['field:ScriptViews.tsx#{title(f)}#1'], decision: 'Make the lead the narrator', reads: ['src/engine/hiring.ts#estimateDays'],
    variant: { project: short({ lead: { functions: ['narrator'] } }) }, bites: ['spent'], downstream: ['daysToDeliver', 'ownIn'] },
  { id: 'lead-speaks', features: [F('Speaks')], decision: 'Have the lead speak French', reads: ['src/engine/production/language.ts#personLanguagesFit'],
    variant: { project: short({ lead: { languages: ['fr'] } }) }, ...CREW },
  // A realization is read for a character that isn't human (projects.ts deriveRequirements): a creature played by a
  // performer, or built as a puppet.
  { id: 'lead-puppet', seeds: 120, // at 40 careers, delivery time went inside the noise with the realistic prices (November 15, 2026)
    features: [F('Realized As')], decision: 'Build the creature the lead is as a puppet, rather than have a performer play it', reads: ['src/engine/projects.ts#deriveRequirements'],
    base: { project: short({ lead: { entity: 'monster', realization: 'performer' } }) }, variant: { project: short({ lead: { entity: 'monster', realization: 'puppet', methods: ['puppetry'] } }) }, ...COST },
  { id: 'lead-entity', features: [F('Entity')], decision: 'Make the lead, built as a puppet, a monster rather than a person', reads: ['src/engine/projects.ts#deriveRequirements'],
    base: { project: short({ lead: { entity: 'human', realization: 'puppet' } }) }, variant: { project: short({ lead: { entity: 'monster', realization: 'puppet' } }) }, ...CREW },
  // States are made as copies of a costume or makeup the character has (looks.ts costumeCopies): with a built costume.
  { id: 'lead-states', features: [F('Appearance States')], decision: 'Give the lead, in a built costume, four looks over the film', reads: ['src/engine/looks.ts#costumeCopies'],
    base: { project: short({ lead: { look: { wardrobe: 'build' } } }) }, variant: { project: short({ lead: { look: { wardrobe: 'build', states: 4 } } }) }, ...COST },
  { id: 'story-year', features: [F('Year It Is Set In')], decision: 'Set the story in 1950', reads: ['src/engine/looks.ts#periodBand', 'src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ axes: { storyYear: 1950 } }) }, ...COST },
  // Strong content is broadcast in a late slot, to about three fifths of the audience (script-effects.ts
  // broadcastSlotFor, audiences.ts LATE_SLOT_AUDIENCE): the commissioned series, sold to air.
  { id: 'content-strong', features: ['field:ScriptViews.tsx#{i.label}#1'], decision: 'Declare strong violence in the series', reads: ['src/engine/script-effects.ts#contentLevel', 'src/engine/script-effects.ts#broadcastSlotFor'],
    base: SERIES, variant: { ...SERIES, project: violent }, measure: watched, bites: ['lateSlots'], downstream: ['viewers', 'revenue'] },
];
