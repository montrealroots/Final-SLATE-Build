// The plan (project-budget.ts, production/schedule.ts): a planned budget the financing target follows, and the shoot
// planned again to start two months later.
import type { Probe } from '../probe';
import { setPlannedBudget } from '../../../src/engine/project-budget';
import { generatePlan } from '../../../src/engine/production/schedule';
import { addDaysToKey } from '../../../src/engine/time';
import type { GameState, Project } from '../../../src/engine/types';

/** Plan twice the estimate, before the money is raised: the target follows a plan, so twice as much is raised. */
const planDouble = (s: GameState, p: Project) => { setPlannedBudget(s, p, (p.finance?.estimate ?? p.funding.fund) * 2 * 100, 'Room for a longer shoot.'); };
/** Once per project, once a shoot is planned and before a day is shot: planned again from two months after its first day. */
const later = () => { const done = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && !done.has(x) && x.schedule.days.length && x.schedule.days.every((d) => d.status === 'scheduled'))) {
    const first = [...p.schedule.days].sort((a, b) => a.date.localeCompare(b.date))[0].date;
    generatePlan(s, p, addDaysToKey(first, 60));
    done.add(p);
  }
}; };
const measure = (_s: GameState, projects: Project[]) => ({
  investorShare: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'investor' && d.status === 'accepted').reduce((b, d) => b + d.terms.incomeShare, 0), 0),
  target: projects.reduce((a, p) => a + (p.finance?.target ?? 0), 0),
  firstShootDay: projects.length ? projects.reduce((a, p) => a + (p.schedule.days.length ? Date.parse(`${[...p.schedule.days].sort((x, y) => x.date.localeCompare(y.date))[0].date}T00:00:00Z`) / 86_400_000 : 0), 0) / projects.length : 0,
});

export const PROBES: Probe[] = [
  {
    id: 'plan-budget',
    features: ['action:project-budget.setPlannedBudget'],
    // Half of what's left to raise is asked of backers, as most players do: put up from savings alone, the extra comes
    // home unspent at the year's end and nothing later shows it (measured November 14, 2026).
    decision: 'Plan twice the estimate before raising the money, half of it asked of backers',
    reads: ['src/engine/project-budget.ts#setPlannedBudget', 'src/engine/finance.ts#financeSummary'],
    base: { ownShare: 0.5 },
    variant: { ownShare: 0.5, decide: planDouble },
    measure,
    bites: ['target', 'ownIn', 'backerIn'],
    downstream: ['investorShare', 'revenue', 'money'],
  },
  {
    id: 'plan-later',
    features: ['action:production/schedule.generatePlan'],
    decision: 'Plan the shoot again to start two months later than first planned',
    reads: ['src/engine/production/schedule.ts#generatePlan'],
    variant: { daily: later() },
    measure,
    bites: ['firstShootDay'],
    downstream: ['daysToDeliver', 'releaseDelay', 'revenue', 'spent'],
  },
];
