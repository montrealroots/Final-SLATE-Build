// The script and the plan: what a scene asks for, how a character looks, how the film is lit and recorded, and how the
// shoot is scheduled. Each probe writes the same short with one thing changed before the script is approved (or, for the
// schedule, before the shoot is planned), and plays the career on.
import type { Probe } from '../probe';
import type { Policy } from '../career';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';
import { approvedScenes } from '../../engine-api';
import { cutFromEdit } from '../../../src/engine/finish';
import type { GameState, Project } from '../../../src/engine/types';

interface Build { axes?: Record<string, unknown>; scene?: Record<string, unknown>; lead?: Record<string, unknown>; minutes?: number; intExt?: 'INT' | 'EXT'; time?: 'DAY' | 'NIGHT'; story?: Record<string, string> }
/** The default short (career.ts defaultProject), written with `b`'s changes. */
export function short(b: Build = {}): Policy['project'] {
  return (s: GameState, year: number): Project => {
    const p = unfunded(buildProject(s, { title: `Year ${year + 1}`, format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 10 },
      [{ name: 'Lead', patch: { roleSize: 'lead', ...(b.lead ?? {}) } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
      [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: b.minutes ?? 3, ...(b.intExt ? { intExt: b.intExt } : {}), ...(b.time ? { time: b.time } : {}), extra: b.scene },
        { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: b.minutes ?? 3, ...(b.time ? { time: b.time } : {}), extra: b.scene },
        { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: b.minutes ?? 4, ...(b.intExt ? { intExt: b.intExt } : {}), ...(b.time ? { time: b.time } : {}), extra: b.scene }]));
    Object.assign(p.axes, b.axes ?? {});
    Object.assign(p.story, b.story ?? {});
    return p;
  };
}

/** Cuts the script's last approved scene from the edit, before it's shot. */
const cutLast = (s: GameState, p: Project) => { const last = approvedScenes(p).at(-1); if (last) cutFromEdit(s, p, last.id); };
const field = (screen: string, label: string) => `field:${screen}#"${label}"#1`;
const COST = ['spent', 'money'];

export const PROBES: Probe[] = [
  { id: 'scene-exterior', features: [field('ScriptViews.tsx', 'Interior Or Exterior')], decision: 'Write the interiors as exteriors', reads: ['src/engine/production/shoot.ts#runShootDay'],
    variant: { project: short({ intExt: 'EXT' }) }, bites: ['lostDays', 'shootDays'], downstream: ['daysToDeliver', ...COST] },
  { id: 'scene-night', features: [field('ScriptViews.tsx', 'Time Of Day')], decision: 'Set every scene at night', reads: ['src/engine/production/rates.ts#dayFees'],
    variant: { project: short({ time: 'NIGHT' }) }, bites: ['spent'], downstream: ['money', 'overall'] },
  { id: 'scene-minutes', features: [field('ScriptViews.tsx', 'Estimated Minutes')], decision: 'Make each scene twice as long', reads: ['src/engine/production/schedule.ts#generatePlan'],
    // A short's scenes fit a day's capacity either way (schedule.ts groupShootDays), so the length shows in what the shoot and post cost and take.
    variant: { project: short({ minutes: 7 }) }, bites: ['spent', 'daysToDeliver'], downstream: ['money', 'revenue'] },
  { id: 'scene-crowd', seeds: 60, features: [field('ScriptViews.tsx', 'Crowd Size')], decision: 'Put a crowd of 40 in each scene', reads: ['src/engine/production/rates.ts#dayFees'],
    variant: { project: short({ scene: { crowd: 40 } }) }, bites: ['spent'], downstream: ['money', 'overall'] },
  { id: 'scene-stunts', features: [field('ScriptViews.tsx', 'Stunts')], decision: 'Give each scene a stunt', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { stunts: 'A fall down the stairs.' } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  { id: 'scene-animals', features: [field('ScriptViews.tsx', 'Animals')], decision: 'Put a dog in each scene', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { animals: ['dog'] } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  { id: 'scene-vehicles', features: [field('ScriptViews.tsx', 'Vehicles')], decision: 'Put a car in each scene', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { vehicles: ['car'] } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  { id: 'scene-props', features: [field('ScriptViews.tsx', 'Props')], decision: 'Give each scene three props', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { props: ['letter', 'lamp', 'suitcase'] } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  { id: 'scene-vfx', features: [field('ScriptViews.tsx', 'Visual Effects')], decision: 'Give each scene a visual effect', reads: ['src/engine/projects.ts#deriveRequirements'],
    variant: { project: short({ scene: { vfx: ['sky replacement'] } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  { id: 'cut-scene', features: ['action:finish.cutFromEdit'], decision: 'Cut the last scene from the edit before it is shot', reads: ['src/engine/finish.ts#cutFromEdit'],
    variant: { decide: cutLast }, bites: ['spent', 'shootDays'], downstream: ['overall', 'revenue', 'money'] },
  { id: 'scene-essential', features: [field('ScriptViews.tsx', 'Essential To The Story')], decision: 'Mark the scenes essential, then cut the last one', reads: ['src/engine/finish.ts#cutFromEdit'],
    base: { decide: cutLast }, variant: { decide: cutLast, project: short({ scene: { essential: true } }) }, bites: ['quality.editing', 'overall'], downstream: ['reception', 'revenue'] },
  { id: 'lead-makeup', features: [field('ScriptViews.tsx', 'Makeup')], decision: 'Give the lead aging appliances', reads: ['src/engine/looks.ts#makeupDayCost'],
    variant: { project: short({ lead: { look: { makeup: 'aging' } } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  { id: 'lead-costume', features: [field('ScriptViews.tsx', 'Costume From')], decision: 'Build the lead\'s costume', reads: ['src/engine/looks.ts#costumeCopies'],
    variant: { project: short({ lead: { look: { wardrobe: 'build' } } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver'] },
  { id: 'lead-role-size', features: [field('ScriptViews.tsx', 'Role Size')], decision: 'Write the lead as a supporting part', reads: ['src/engine/script-effects.ts#castPlacement'],
    variant: { project: short({ lead: { roleSize: 'supporting' } }) }, bites: ['castRates'], downstream: ['spent', 'money', 'overall'] },
  { id: 'light-contrast', features: [field('ScriptViews.tsx', 'The Light It Is Shot In')], decision: 'Shoot it in high-contrast light', reads: ['src/engine/craft.ts#craftTime'],
    variant: { project: short({ axes: { light: 'contrast' } }) }, bites: ['spent'], downstream: ['money', 'daysToDeliver', 'quality.craft'] },
  { id: 'logline-missing', features: [field('ScriptViews.tsx', 'Logline')], decision: 'Leave the logline unwritten (backers read the pitch)', reads: ['src/engine/script-effects.ts#documentsNeeded'],
    base: { ownShare: 0 }, variant: { ownShare: 0, project: short({ story: { logline: '' } }) }, bites: ['backerDeals'], downstream: ['ownIn', 'money'] },
  { id: 'rehearsal-days', features: [field('PlanViews.tsx', 'Rehearsal Days')], decision: 'Rehearse for eight days rather than none', reads: ['src/engine/production/shoot.ts#runShootDay'],
    base: { decide: (_s, p) => { p.schedule.rehearsalDays = 0; } }, variant: { decide: (_s, p) => { p.schedule.rehearsalDays = 8; } },
    bites: ['quality.direction', 'overall'], downstream: ['reception', 'spent', 'revenue'] },
  { id: 'six-day-weeks', seeds: 60, features: [field('PlanViews.tsx', 'Six-Day Weeks')], decision: 'Shoot six days a week', reads: ['src/engine/production/schedule.ts#isWorkingDay'],
    variant: { decide: (_s, p) => { p.schedule.sixDayWeeks = true; } }, bites: ['daysToDeliver'], downstream: ['spent', 'money', 'releaseDelay', 'revenue'] },
];
