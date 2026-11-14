// A slate of projects (projects.ts): a second short started and approved alongside the year's, made by the same career.
import type { Probe } from '../probe';
import { approve, castAll, manage, staffAll, startProduction } from '../../helpers';
import { financeSummary } from '../../../src/engine/finance';
import { putInOwnMoney } from '../../../src/engine/personal';
import { short } from './script';
import type { GameState, Project } from '../../../src/engine/types';

/**
 * Once a year: a second short created (projects.ts createProject, through the test builder), its draft approved, its
 * money put in, cast, staffed and started, as the career does its first (career.ts); each day after, managed as the
 * test helpers manage a project (tests/helpers.ts manage).
 */
const seconds = new WeakMap<GameState, Project[]>();
const secondShort = () => { const made = new WeakMap<GameState, number>(); return (s: GameState, _p: Project, year: number) => {
  if ((made.get(s) ?? -1) >= year) return;
  made.set(s, year);
  const q = short()(s, year + 10);
  q.title = `Second ${year + 1}`;
  approve(s, q);
  const need = financeSummary(q).stillToRaise;
  if (need > 0) putInOwnMoney(s, q, need);
  castAll(s, q);
  staffAll(s, q);
  try { startProduction(s, q, 9); } catch { /* not ready: managed until it is */ }
  seconds.set(s, [...(seconds.get(s) ?? []), q]);
}; };
const manageSeconds = (s: GameState) => { for (const q of seconds.get(s) ?? []) if (!q.delivered) manage(s, q); };

const measure = (s: GameState) => ({ projects: s.projects.length, approvedProjects: s.projects.filter((p) => p.approvedDraft !== null).length, deliveredAll: s.projects.filter((p) => p.delivered).length });

export const PROBES: Probe[] = [
  {
    id: 'second-project',
    features: ['action:projects.createProject', 'action:projects.approveDraft'],
    decision: 'Start and approve a second short each year alongside the first',
    reads: ['src/engine/projects.ts#createProject', 'src/engine/projects.ts#approveDraft'],
    variant: { decide: secondShort(), daily: manageSeconds },
    measure,
    bites: ['projects', 'approvedProjects'],
    downstream: ['deliveredAll', 'money', 'standing.producing', 'jobsDone'],
  },
];
