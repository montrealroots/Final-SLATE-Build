// The project's own choices on the Projects page: what it is, how it's made, where it's based and what it raises.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';
import { financeSummary, setFinanceTarget } from '../../../src/engine/finance';

type Opts = Omit<Parameters<typeof buildProject>[1], 'title'>;
const make = (opts: Opts, after?: (p: Project) => void) => (s: GameState, year: number): Project => {
  const p = unfunded(buildProject(s, { ...opts, title: `Year ${year + 1}` },
    [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
    [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }, { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: 3 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 4 }]));
  after?.(p);
  return p;
};
const SHORT: Opts = { format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 10 };
const field = (label: string, n = 1) => `field:Projects.tsx#"${label}"#${n}`;

export const PROBES: Probe[] = [
  { id: 'format-feature', features: [field('Format')], decision: 'Make a feature rather than a short', reads: ['src/engine/production/tasks.ts#buildTasks'],
    variant: { project: make({ ...SHORT, format: 'feature', runtime: 80 }) }, bites: ['spent', 'shootDays'], downstream: ['revenue', 'money', 'daysToDeliver'] },
  { id: 'medium-animation', features: [field('Medium')], decision: 'Make it drawn animation rather than live action', reads: ['src/engine/production/tasks.ts#buildTasks'],
    variant: { project: make({ ...SHORT, medium: 'animation', technique: '2d-drawn', quality: 'tv', runtime: 5 }) }, bites: ['shootDays', 'daysToDeliver'], downstream: ['spent', 'money', 'revenue'] },
  { id: 'runtime-longer', features: ["field:Projects.tsx#{episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'}#1"], decision: 'Aim for a 25-minute short rather than 10', reads: ['src/engine/estimate.ts#costBreakdown'],
    variant: { project: make({ ...SHORT, runtime: 25 }) }, bites: ['spent'], downstream: ['revenue', 'money'] },
  { id: 'base-los-angeles', features: [field('Production Base')], decision: 'Base the production in Los Angeles rather than London', reads: ['src/engine/production/schedule.ts#isWorkingDay'],
    variant: { project: make(SHORT, (p) => { p.axes.basePlaceId = 'us-los-angeles'; }) }, bites: ['spent', 'lostDays'], downstream: ['money', 'daysToDeliver'] },
  { id: 'finance-target', features: ['field:PlanViews.tsx#"Change Financing Target"#1', 'action:finance.setFinanceTarget'], decision: 'Raise half as much again as the estimate', reads: ['src/engine/finance.ts#setFinanceTarget', 'src/engine/finance.ts#financeSummary'],
    variant: { decide: (_s, p) => setFinanceTarget(p, Math.round((p.finance?.estimate ?? financeSummary(p).target) * 1.5)) }, bites: ['ownIn'], downstream: ['money', 'leftInProjects', 'spent'] },
  { id: 'genre-comedy', features: ['field:Projects.tsx#?#1'], decision: 'Make it a comedy rather than a drama', reads: ['src/engine/script-effects.ts#competesAs'],
    variant: { project: make({ ...SHORT, genres: ['comedy'] }) }, bites: ['reception', 'overall'], downstream: ['revenue', 'money'] },
];
