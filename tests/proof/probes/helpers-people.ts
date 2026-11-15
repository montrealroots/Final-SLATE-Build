// The people who act for the player (mandates.ts Guide Me, casting-director.ts, line-producer.ts, hiring.ts): Guide Me
// running the writing within a ceiling, and taken back to manual; a casting director's search and their advice taken; a
// line producer negotiating a counteroffer; and a department's staffing proposal sent as offers in one go.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { WRITING, approveGuideMe, endGuideMe, guideMePlan } from '../../../src/engine/mandates';
import { fund } from './casting';
import { makeOffer, roleCandidates } from '../../../src/engine/hiring';
import { negotiate, negotiationRefusal } from '../../../src/engine/line-producer';

/** Before the money is raised: funded first, then Guide Me given the writing, its ceiling what its plan costs. */
const guideWriting = (s: GameState, p: Project) => {
  fund(s, p);
  const plan = guideMePlan(s, p, WRITING);
  if (plan.total > 0) try { approveGuideMe(s, p, WRITING, plan.total); } catch { /* nothing to staff */ }
};
/** Once per project, two days after Guide Me took the writing: back to manual. */
const endWriting = () => { const at = new WeakMap<Project, number>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered)) {
    const m = (p.mandates ?? []).find((x) => x.dept === WRITING && !x.endedAt);
    if (!m) continue;
    if (!at.has(p)) at.set(p, s.now);
    else if (s.now - at.get(p)! >= 2 * 86_400_000) try { endGuideMe(s, p, WRITING); } catch { /* ended */ }
  }
}; };

/** Funded, then the most experienced line producer offered their rate (both careers). */
const withLineProducer = (s: GameState, p: Project) => {
  fund(s, p);
  const best = [...roleCandidates(s, p, 'line-producer')].sort((a, b) => b.experience - a.experience || a.dayRate - b.dayRate)[0];
  if (best) try { makeOffer(s, p, { personId: best.id, roleId: 'line-producer', dayRate: best.dayRate }); } catch { /* not this one */ }
};
/** Before each day's management accepts a counteroffer: the line producer negotiates it, once each. */
const negotiateCounters = () => { const done = new Set<string>(); return (s: GameState, p: Project) => {
  for (const h of p.hires.filter((x) => x.status === 'countered' && !done.has(x.id))) {
    if (!negotiationRefusal(p, h.id)) { try { negotiate(s, p, h.id); } catch { /* not now */ } done.add(h.id); }
  }
}; };

const measure = (_s: GameState, projects: Project[]) => ({
  writingPasses: projects.reduce((a, p) => a + (p.writing ?? []).filter((j) => j.status === 'accepted').length, 0),
  counterRates: projects.reduce((a, p) => a + p.hires.filter((h) => h.counterRate !== undefined && h.status === 'accepted').reduce((b, h) => b + h.dayRate, 0), 0),
  writersHired: projects.reduce((a, p) => a + p.hires.filter((h) => ['co-writer', 'script-editor', 'episode-writer'].includes(h.roleId) && (h.status === 'accepted' || h.status === 'released')).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'guide-me-writing', features: ['action:mandates.approveGuideMe'], decision: 'Let Guide Me run the writing within what its plan costs',
    reads: ['src/engine/mandates.ts#approveGuideMe', 'src/engine/finish.ts#assessQuality'],
    base: { decide: (s, p) => fund(s, p) }, variant: { decide: guideWriting }, measure,
    bites: ['writersHired'], downstream: ['quality.script', 'overall', 'spent'],
  },
  {
    id: 'end-guide-me', features: ['action:mandates.endGuideMe'], decision: 'Take the writing back to manual two days after giving it to Guide Me',
    reads: ['src/engine/mandates.ts#endGuideMe'],
    base: { decide: guideWriting }, variant: { decide: guideWriting, daily: endWriting() }, measure,
    bites: ['writingPasses'], downstream: ['quality.script', 'spent'],
  },
  {
    id: 'line-producer-negotiates', features: ['action:line-producer.negotiate'], decision: 'Have the line producer negotiate each counteroffer before accepting it',
    reads: ['src/engine/line-producer.ts#negotiate'],
    // Every performer offered four fifths of their ask (castRate 0.8), so they counter at it, and counters are accepted.
    // Its fees come near what it saves on a short this size, so 120 careers (November 15, 2026: at 40 the net cost's interval touched none).
    seeds: 120, base: { castRate: 0.8, decide: withLineProducer }, variant: { castRate: 0.8, decide: withLineProducer, beforeManage: negotiateCounters() }, measure,
    bites: ['counterRates'], downstream: ['spent', 'money'],
  },
];
