// What an approved script costs to make at its budget size (November 7, 2026). Until then a project's Budget Estimate
// was its budget size's fixed amount whatever the script: a two-minute micro-budget stop-motion short was "estimated" at
// $40,000 and needed about $75,000, so the agreed starting backing was asked for too little and the animators were
// never affordable. Now, once a draft is approved, the estimate is what that script needs: the required crew and the
// cast at the lowest experienced rates (combining roles on a micro budget, as staffing does), materials, shoot days,
// studio and render time, money already spent or held, and a contingency. It is never below the budget size's amount,
// so a script that fits its size keeps the same estimate. Amounts are game calibration, not industry prices.

import { ledgerTotals } from './budget';
import { castRoleFor, estimateDays, requiredCrewPlan, roleCandidates } from './hiring';
import { roleLabel } from './people';
import { buildTasks, dayFees, estimatedShootDays, materialCost, VOICE_SESSION_STUDIO, RENDER_NODE_DAY_COST } from './production';
import { RENDER_HOURS_PER_FRAME } from './production/rates';
import { approvedCharacters, approvedScenes, fundingScenario, onDraftApproved } from './projects';
import type { GameState, PerformanceMethod, Project } from './types';

/** A tenth on top, the usual allowance for what goes wrong (lost days, counteroffers, reshoots). */
export const CONTINGENCY = 0.1;

export interface CostProjection {
  /** Spent, agreed or held already. */
  used: number;
  crew: number;
  cast: number;
  /** Locations, equipment, crowds and build materials not yet reserved by a schedule. */
  production: number;
  /** Recording studio and render time still to come. */
  facilities: number;
  total: number;
  /**
   * Roles and parts no one available can fill, so the total can't price them (SLATE-08-01, November 8, 2026). Until
   * then they were counted at nothing, and a script needing someone the pool lacks looked cheaper than one that didn't.
   */
  uncertain: string[];
}

export function projectedCost(state: GameState, p: Project): CostProjection {
  const t = ledgerTotals(p);
  const used = t.fund - t.available;
  const plan = requiredCrewPlan(state, p);
  const crew = plan.reduce((a, x) => a + x.cost, 0);
  const uncertain = plan.filter((x) => x.noCandidate).map((x) => roleLabel(x.nr.roleId));
  // Every part still to cast, by the methods the Cast page offers for it.
  let cast = 0;
  for (const c of approvedCharacters(p)) {
    if (c.roleSize === 'background' || !approvedScenes(p).some((s) => s.participants.includes(c.id))) continue;
    const methods: PerformanceMethod[] = p.axes.medium === 'animation'
      ? ['voice', ...(c.methods.includes('motion-capture') ? ['motion-capture' as const] : [])]
      : c.methods.filter((m) => m === 'on-camera' || m === 'voice' || m === 'motion-capture');
    for (const m of methods) {
      if (p.cast.some((a) => a.characterId === c.id && a.method === m)) continue;
      const cheapest = roleCandidates(state, p, castRoleFor(m)).filter((x) => x.experience >= 2).sort((a, b) => a.dayRate - b.dayRate)[0];
      if (cheapest) cast += cheapest.dayRate * estimateDays(p, castRoleFor(m), c.id, m);
      else uncertain.push(`${c.name} (${m.replace('-', ' ')})`);
    }
  }
  // Planned: the plan's tasks. Not yet planned: the work the script needs, less anything finished already (a sequel's
  // carried-over builds, at the design they were built to).
  const finished = new Map(p.tasks.filter((x) => x.status === 'done').map((x) => [x.id, x]));
  const tasks = (p.schedule.startDate ? p.tasks : buildTasks(p).filter((x) => !(finished.has(x.id) && (finished.get(x.id)!.needsVersion ?? 0) >= (x.needsVersion ?? 0))))
    .filter((x) => x.status !== 'done');
  const planned = p.obligations.some((o) => o.ref === 'plan:shoot' || o.ref === 'plan:materials');
  const fees = dayFees(p);
  const production = planned ? 0 : estimatedShootDays(p) * (fees.location + fees.equipment) +
    approvedScenes(p).reduce((a, s) => a + s.crowd * 180, 0) + tasks.reduce((a, x) => a + materialCost(x), 0);
  const facilities = tasks.reduce((a, x) => {
    if (x.kind === 'anim:voice') return a + (x.units - x.done) * VOICE_SESSION_STUDIO;
    if (x.kind === 'anim:render') return a + Math.ceil(((x.units - x.done) * RENDER_HOURS_PER_FRAME[p.axes.animationQuality]) / 24) * RENDER_NODE_DAY_COST;
    return a;
  }, 0);
  return { used, crew, cast, production, facilities, total: used + crew + cast + production + facilities, uncertain };
}

/** The Budget Estimate for an approved script: its projected cost with the contingency, in whole thousands. */
export function scriptEstimate(state: GameState, p: Project): number {
  const size = fundingScenario(p.funding.scenarioId).fund;
  return Math.max(size, Math.ceil((projectedCost(state, p).total * (1 + CONTINGENCY)) / 1000) * 1000);
}

// On approval the estimate follows the script; the financing target follows it too, unless the player set their own.
onDraftApproved((state, p) => {
  const f = (p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] });
  const follows = f.target === f.estimate;
  f.estimate = scriptEstimate(state, p);
  if (follows) f.target = f.estimate;
});
