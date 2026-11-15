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
  { id: 'format-feature', seeds: 120, features: [field('Format')], decision: 'Make a feature rather than a short', reads: ['src/engine/production/tasks.ts#buildTasks'],
    // With the same scenes a film costs what its scenes cost (production follows the script, not its label); what the
    // format changes is how buyers and audiences take it.
    variant: { project: make({ ...SHORT, format: 'feature', runtime: 80 }) }, bites: ['revenue'], downstream: ['money'] },
  { id: 'medium-animation', features: [field('Medium')], decision: 'Make it drawn animation rather than live action', reads: ['src/engine/production/tasks.ts#buildTasks'],
    variant: { project: make({ ...SHORT, medium: 'animation', technique: '2d-drawn', quality: 'tv', runtime: 5 }) }, bites: ['shootDays', 'daysToDeliver'], downstream: ['spent', 'money', 'revenue'] },
  { id: 'runtime-longer', features: ["field:Projects.tsx#{episodic ? 'Target Minutes Per Episode' : 'Target Runtime In Minutes'}#1"], decision: 'Aim for a 25-minute short rather than 10 (its scenes still run 10)', reads: ['src/engine/projects.ts#scriptIssues', 'src/engine/finish.ts#assessQuality'],
    // From November 14, 2026 scenes a quarter off the aim are a readiness note, which costs the script (projects.ts RUNTIME_SLACK).
    variant: { project: make({ ...SHORT, runtime: 25 }) }, bites: ['quality.script'], downstream: ['overall', 'reception', 'revenue'] },
  { id: 'base-los-angeles', features: [field('Production Base')], decision: 'Base the production in Los Angeles rather than London', reads: ['src/engine/production/schedule.ts#isWorkingDay'],
    // Its weather and its working calendar; prices don't yet depend on the place (docs/v10/README.md, open).
    variant: { project: make(SHORT, (p) => { p.axes.basePlaceId = 'us-los-angeles'; }) }, bites: ['lostDays'], downstream: ['daysToDeliver', 'money'] },
  { id: 'finance-target', features: ['field:PlanViews.tsx#"Change Financing Target"#1', 'action:finance.setFinanceTarget'], decision: 'Raise half as much again as the estimate', reads: ['src/engine/finance.ts#setFinanceTarget', 'src/engine/finance.ts#financeSummary'],
    // Backers asked first, as a target above the estimate matters where others' money is raised and repaid.
    base: { ownShare: 0 },
    variant: { ownShare: 0, decide: (_s, p) => setFinanceTarget(p, Math.round((p.finance?.estimate ?? financeSummary(p).target) * 1.5)) },
    // Everything is asked of backers here, so your own money never moved (until November 14, 2026 it was looked for as a
    // bite); what a larger raise changes is what the backers hold and take a share for.
    measure: (_s, projects) => ({ investorShare: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.status === 'accepted' && d.kind !== 'savings').reduce((b, d) => b + d.terms.incomeShare, 0), 0) }),
    bites: ['backerIn'], downstream: ['investorShare', 'leftInProjects', 'money', 'revenue'] },
  { id: 'genre-comedy', features: ['field:Projects.tsx#?#1'], decision: 'Make it a comedy rather than a drama', reads: ['src/engine/script-effects.ts#competesAs'],
    // At 40 seeds revenue grew too noisy to show it (November 15, 2026): what reception reaches first is the box office's
    // gross and the writer's standing, measured on 120.
    seeds: 120, variant: { project: make({ ...SHORT, genres: ['comedy'] }) }, bites: ['reception', 'overall'], downstream: ['gross', 'standing.writing', 'revenue', 'money'] },
];
