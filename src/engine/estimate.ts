// What an approved script costs to make at its budget size (November 7, 2026). Until then a project's Budget Estimate
// was its budget size's fixed amount whatever the script: a two-minute micro-budget stop-motion short was "estimated" at
// $40,000 and needed about $75,000, so the agreed starting backing was asked for too little and the animators were
// never affordable. Now, once a draft is approved, the estimate is what that script needs: the required crew and the
// cast at the lowest experienced rates (combining roles on a micro budget, as staffing does), materials, shoot days,
// studio and render time, money already spent or held, and a contingency. It is never below the budget size's amount,
// so a script that fits its size keeps the same estimate. Amounts are game calibration, not industry prices.

import { ledgerTotals } from './budget';
import { castRoleFor, estimateDays, requiredCrewPlan, roleCandidates } from './hiring';
import { buildTasks, dayFees, estimatedShootDays, materialCost, VOICE_SESSION_STUDIO, RENDER_NODE_DAY_COST } from './production';
import { RENDER_HOURS_PER_FRAME } from './production/rates';
import { approvedCharacters, approvedScenes, deriveRequirements, fundingScenario, onDraftApproved } from './projects';
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
}

export function projectedCost(state: GameState, p: Project): CostProjection {
  const t = ledgerTotals(p);
  const used = t.fund - t.available;
  const crew = requiredCrewPlan(state, p).reduce((a, x) => a + x.cost, 0);
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
  return { used, crew, cast, production, facilities, total: used + crew + cast + production + facilities };
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

/**
 * Ways to make the approved script cost less (SLATE-03-03.02 and 08-05.03, November 8, 2026), each with what the estimate
 * would save. Each is the same projection made without that thing, so the saving is the engine's own figure, not a guess.
 * They are choices, not advice: cutting a scene changes the film, and only the player decides that. Essential scenes
 * aren't offered, since the story doesn't work without them.
 */
export interface CostCut { label: string; saving: number; how: string }

export function costCuts(state: GameState, p: Project, limit = 5): CostCut[] {
  if (p.approvedDraft === null) return [];
  const draftIndex = p.drafts.findIndex((d) => d.number === p.approvedDraft);
  const base = projectedCost(state, p).total;
  const variant = (change: (q: Project) => void): number => {
    const q: Project = JSON.parse(JSON.stringify(p));
    q.tasks = [];
    change(q);
    // As approval would leave it: the breakdown derived from the changed draft.
    q.requirements = deriveRequirements(q, q.drafts[draftIndex].scenes, q.drafts[draftIndex].characters);
    return base - projectedCost(state, q).total;
  };
  const out: CostCut[] = [];
  const scenes = approvedScenes(p);
  for (const s of scenes.slice(0, 40)) {
    if (s.essential || scenes.filter((x) => x.episode === s.episode).length < 2) continue;
    // The working copy too: day estimates read it, so the option is the script as it would be once the cut is made.
    const saving = variant((q) => { q.drafts[draftIndex].scenes = q.drafts[draftIndex].scenes.filter((x) => x.id !== s.id); q.scenes = q.scenes.filter((x) => x.id !== s.id); });
    out.push({ label: `Cut ${s.heading.place || 'an untitled scene'} (${s.estMinutes} min)`, saving, how: 'Remove the scene in the Script and approve a new draft.' });
    if (s.crowd >= 10) {
      const crowd = variant((q) => { for (const x of [...q.drafts[draftIndex].scenes, ...q.scenes]) if (x.id === s.id) x.crowd = Math.floor(s.crowd / 2); });
      out.push({ label: `Halve the crowd in ${s.heading.place || 'that scene'} (${s.crowd} to ${Math.floor(s.crowd / 2)})`, saving: crowd, how: 'Lower the crowd size in the scene and approve a new draft.' });
    }
  }
  const sizes = ['micro', 'low', 'mid', 'commissioned'];
  const smaller = sizes[sizes.indexOf(p.funding.scenarioId) - 1];
  if (smaller) out.push({ label: `Make it at the ${fundingScenario(smaller).label.toLowerCase()} size`, saving: variant((q) => { q.funding.scenarioId = smaller; }), how: 'A smaller size pays less a day for locations and gear, with people covering more than one job.' });
  const quality = ['limited', 'tv', 'feature'] as const;
  const simpler = quality[quality.indexOf(p.axes.animationQuality) - 1];
  if (p.axes.medium !== 'live-action' && simpler) out.push({ label: `Animate to a ${simpler === 'limited' ? 'limited' : 'television'} standard`, saving: variant((q) => { q.axes.animationQuality = simpler; }), how: 'Fewer drawings or frames to render for each second.' });
  return out.filter((c) => c.saving >= 1000).map((c) => ({ ...c, saving: Math.round(c.saving / 1000) * 1000 })).sort((a, b) => b.saving - a.saving).slice(0, limit);
}
