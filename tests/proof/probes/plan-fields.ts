// The plan's own fields: how each scene is shot (its camera, what it is shot for), and for animation the render farm,
// the stop-motion stages and the puppets' copies, the finish, and whether work stops for public holidays. Each varied on
// the film it applies to: the default short for the shoot, a five-minute 3D CG or stop-motion short for animation.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { approvedScenes } from '../../../src/engine/projects';
import { setShotPlan } from '../../../src/engine/takes-actions';
import { buildProject } from '../../helpers';
import { unfunded } from '../career';
import { makeOffer, roleCandidates } from '../../../src/engine/hiring';
import { fund } from './casting';
import { feature } from './script';

const P = (label: string) => `field:PlanViews.tsx#${label}#1`;
const COST = { bites: ['spent'], downstream: ['money', 'daysToDeliver'] };
const TIME = { bites: ['daysToDeliver'], downstream: ['spent', 'money'] };
/** Before the money is raised: each scene's plan set (takes-actions.ts setShotPlan). */
const everyScene = (patch: Parameters<typeof setShotPlan>[2]) => (s: GameState, p: Project) => { if (!p.takesModel) return; for (const sc of approvedScenes(p)) setShotPlan(p, sc.id, patch, s); };
/** An animated short of two scenes, its lead and friend: five minutes, or two for stop-motion, which at five isn't delivered in its year. */
const animated = (technique: '3d-cg' | 'stop-motion', quality: 'tv' | 'feature' = 'tv', minutes: [number, number] = [2, 3]) => (s: GameState, year: number): Project => unfunded(buildProject(s,
  { title: `Year ${year + 1}`, format: 'short', medium: 'animation', technique, quality, scenario: 'micro', genres: ['drama'], runtime: minutes[0] + minutes[1] },
  [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
  [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: minutes[0] }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: minutes[1] }]));
const CG = animated('3d-cg');
const SM = animated('stop-motion', 'tv', [1, 1]);
const lead = (p: Project) => p.characters.find((c) => c.name === 'Lead')!.id;
/**
 * Two animators at once, as a stop-motion production that wants speed hires: funded, two animators offered their rates,
 * and two copies of each puppet. A shot takes a stage and a free copy of every puppet in it (workday.ts), so with
 * one animator a second stage sat idle.
 */
const twoAnimators = (s: GameState, p: Project) => {
  fund(s, p);
  // The two cheapest: the career's staffing sees the job filled once anyone holds it, so both are offered here.
  for (const x of roleCandidates(s, p, 'animator').sort((a, b) => a.dayRate - b.dayRate).slice(0, 2)) try { makeOffer(s, p, { personId: x.id, roleId: 'animator', dayRate: x.dayRate }); } catch { /* not free */ }
  for (const c of p.characters) p.schedule.puppetCopies[c.id] = 2;
};

export const PROBES: Probe[] = [
  { id: 'camera-moving', features: [P('{`Camera For ${sceneLabel(p, s)}`}')], decision: 'Shoot every scene on a moving camera', reads: ['src/engine/craft.ts#rigDayCost', 'src/engine/craft.ts#craftTime'],
    variant: { decide: everyScene({ rig: 'moving' }) }, ...COST },
  // A scene with no dialogue is shot as a master by default (takes.ts requiredSetups), so playing it in one shot asks for
  // nothing different; the emphasis on the performances adds a single on each part.
  { id: 'emphasis-performances', features: [P('{`Emphasis For ${sceneLabel(p, s)}`}')], decision: 'Put every scene\'s emphasis on the performances', reads: ['src/engine/takes.ts#requiredSetups'],
    // On the feature, whose days are full: a single on each part is more set-ups in the same days.
    base: { project: feature() }, variant: { project: feature(), decide: everyScene({ emphasis: 'performances' }) }, bites: ['spent', 'shootDays'], downstream: ['quality.direction', 'money'] },
  // A project starts with twenty nodes (projects.ts createProject).
  { id: 'render-nodes', features: [P('"Render Nodes"')], decision: 'Render the 3D short on two nodes rather than twenty', reads: ['src/engine/production/workday.ts#runWorkDay'],
    base: { project: CG }, variant: { project: CG, decide: (_s, p) => { p.schedule.renderNodes = 2; } }, ...TIME },
  { id: 'stopmotion-stages', features: [P('"Stop-Motion Stages"')], decision: 'With two animators, animate on one stage rather than two', reads: ['src/engine/production/workday.ts#runWorkDay'],
    base: { project: SM, decide: twoAnimators }, variant: { project: SM, decide: (s, p) => { twoAnimators(s, p); p.schedule.stages = 1; } }, ...TIME },
  { id: 'puppet-copies', features: [P('{`${c.name} Puppet Copies`}')], decision: 'Build three copies of the lead\'s puppet', reads: ['src/engine/production/workday.ts#runWorkDay'],
    base: { project: SM }, variant: { project: SM, decide: (_s, p) => { p.schedule.puppetCopies[lead(p)] = 3; } }, ...COST },
  { id: 'work-holidays', features: [P('"Work On Public Holidays"')], decision: 'Keep the 3D short working through public holidays', reads: ['src/engine/production/schedule.ts#isWorkingDay'],
    base: { project: CG }, variant: { project: CG, decide: (_s, p) => { p.schedule.workHolidays = true; } }, ...TIME },
  { id: 'animation-finish', features: ['field:Projects.tsx#"Animation Finish"#1'], decision: 'Finish the 3D short to feature quality rather than television\'s', reads: ['src/engine/production/workday.ts#runWorkDay'],
    base: { project: CG }, variant: { project: animated('3d-cg', 'feature') }, bites: ['spent', 'daysToDeliver'], downstream: ['quality.craft', 'money'] },
];
