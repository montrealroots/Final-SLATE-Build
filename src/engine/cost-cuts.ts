// Ways to make the approved script cost less, what any change of scope would do, and how spending compares with the
// estimate (estimate.ts says how the estimate is made). Loaded with the Budget and Script pages, not at startup (the
// startup JavaScript budget).
import { money } from './budget';
import { copyPlain } from './copy';
import { AREA_OF_CATEGORY, costBreakdown, scriptEstimate, type CostArea } from './estimate';
import { neededRoles } from './hiring';
import { roleLabel } from './people';
import { approvalImpact } from './production';
import { approveDraft, approvedCharacters, approvedScenes, deriveRequirements, fundingScenario } from './projects';
import type { GameState, Project } from './types';

/**
 * What a change of scope does before it is made (November 8, 2026): the estimate and the shoot days before and after,
 * worked out by making the change on a copy of the game and letting the production's own rules (approval, the plan, the
 * estimate) run on it; footage and finished work kept or lost; and commitments that outlast the change, since cutting a
 * scene doesn't end anyone's contract. Until then a scope change showed only the footage it would lose.
 */
export interface ScopeChange {
  before: { total: number; estimate: number; shootDays: number };
  after: { total: number; estimate: number; shootDays: number };
  /** Footage or work the change starts over. */
  loses: string[];
  /** Agreements that stay after the change, with what is still owed and how they end. */
  commitments: string[];
}

export function scopeChange(state: GameState, p: Project, change: (s: GameState, q: Project) => void): ScopeChange {
  const s2 = copyPlain(state);
  const q = s2.projects.find((x) => x.id === p.id)!;
  change(s2, q);
  // A planned production is replanned around the change: its held shoot days and builds are released and the work
  // still to do is estimated afresh; what is paid stays paid, and finished work is kept (estimate.ts).
  for (const o of q.obligations) if ((o.ref === 'plan:shoot' || o.ref === 'plan:materials') && o.state === 'reserved') { o.amount = o.settled; o.state = o.settled > 0 ? 'settled' : 'cancelled'; }
  q.schedule.startDate = null;
  const b0 = costBreakdown(state, p);
  const b1 = costBreakdown(s2, q);
  const commitments: string[] = [];
  const parts = new Set(approvedCharacters(q).filter((c) => approvedScenes(q).some((s) => s.participants.includes(c.id))).map((c) => c.id));
  const roles = new Set(neededRoles(q, s2).map((r) => r.roleId));
  for (const h of p.hires.filter((x) => x.status === 'accepted')) {
    const o = p.obligations.find((x) => x.id === h.obligationId);
    const owed = o ? Math.max(0, o.amount - o.settled) : 0;
    const gone = h.characterId ? !parts.has(h.characterId) : !roles.has(h.roleId);
    if (gone && owed > 0) commitments.push(`${h.characterId ? approvedCharacters(p).find((c) => c.id === h.characterId)?.name ?? 'A part' : roleLabel(h.roleId)}: ${money(owed)} still agreed. The work goes, the contract stays until you release them, which cancels what isn't paid.`);
  }
  for (const [cid, r] of Object.entries(p.mocap ?? {})) {
    if (r.status === 'booked' && !parts.has(cid)) commitments.push(`The capture stage booked for ${approvedCharacters(p).find((c) => c.id === cid)?.name ?? 'a part'} stays booked until you cancel it, at the booking's cancellation terms.`);
  }
  return {
    before: { total: b0.total, estimate: scriptEstimate(state, p), shootDays: b0.shootDays },
    after: { total: b1.total, estimate: scriptEstimate(s2, q), shootDays: b1.shootDays },
    loses: [], commitments,
  };
}

/** What approving a draft would do to the estimate and the schedule, with the footage it starts over. */
export function approvalScope(state: GameState, p: Project, number: number): ScopeChange {
  const c = scopeChange(state, p, (s2, q) => { approveDraft(s2, q, number); });
  return { ...c, loses: approvalImpact(p, number) };
}

/**
 * Ways to make the approved script cost less (SLATE-03-03.02 and 08-05.03, November 8, 2026), each with what the estimate
 * would save and the shoot days it changes. Each is the same projection made without that thing, so the saving is the
 * engine's own figure, not a guess. They are choices, not advice: cutting a scene changes the film, and only the player
 * decides that. Essential scenes aren't offered, since the story doesn't work without them.
 */
export interface CostCut { label: string; saving: number; days: number; how: string }

export function costCuts(state: GameState, p: Project, limit = 5): CostCut[] {
  if (p.approvedDraft === null) return [];
  const draftIndex = p.drafts.findIndex((d) => d.number === p.approvedDraft);
  const variant = (change: (q: Project) => void): { saving: number; days: number } => {
    const c = scopeChange(state, p, (_s, q) => {
      change(q);
      // As approval would leave it: the breakdown derived from the changed draft.
      q.requirements = deriveRequirements(q, q.drafts[draftIndex].scenes, q.drafts[draftIndex].characters);
    });
    return { saving: c.before.total - c.after.total, days: c.after.shootDays - c.before.shootDays };
  };
  const out: CostCut[] = [];
  const scenes = approvedScenes(p);
  for (const s of scenes.slice(0, 40)) {
    if (s.essential || scenes.filter((x) => x.episode === s.episode).length < 2) continue;
    // The working copy too: day estimates read it, so the option is the script as it would be once the cut is made.
    out.push({ label: `Cut ${s.heading.place || 'an untitled scene'} (${s.estMinutes} min)`, ...variant((q) => { q.drafts[draftIndex].scenes = q.drafts[draftIndex].scenes.filter((x) => x.id !== s.id); q.scenes = q.scenes.filter((x) => x.id !== s.id); }), how: 'Remove the scene in the Script and approve a new draft.' });
    if (s.crowd >= 10) out.push({ label: `Halve the crowd in ${s.heading.place || 'that scene'} (${s.crowd} to ${Math.floor(s.crowd / 2)})`, ...variant((q) => { for (const x of [...q.drafts[draftIndex].scenes, ...q.scenes]) if (x.id === s.id) x.crowd = Math.floor(s.crowd / 2); }), how: 'Lower the crowd size in the scene and approve a new draft.' });
    if (s.heading.time === 'NIGHT') out.push({ label: `Shoot ${s.heading.place || 'that scene'} by day`, ...variant((q) => { for (const x of [...q.drafts[draftIndex].scenes, ...q.scenes]) if (x.id === s.id) x.heading = { ...x.heading, time: 'DAY' }; }), how: 'Night work is slower, and a night scene can need a day of its own. Change the heading to day and approve a new draft.' });
  }
  const sizes = ['micro', 'low', 'mid', 'commissioned'];
  const smaller = sizes[sizes.indexOf(p.funding.scenarioId) - 1];
  if (smaller) out.push({ label: `Make it at the ${fundingScenario(smaller).label.toLowerCase()} size`, ...variant((q) => { q.funding.scenarioId = smaller; }), how: 'A smaller size pays less a day for locations and gear, with people covering more than one job.' });
  const quality = ['limited', 'tv', 'feature'] as const;
  const simpler = quality[quality.indexOf(p.axes.animationQuality) - 1];
  if (p.axes.medium !== 'live-action' && simpler) out.push({ label: `Animate to a ${simpler === 'limited' ? 'limited' : 'television'} standard`, ...variant((q) => { q.axes.animationQuality = simpler; }), how: 'Fewer drawings or frames to render for each second.' });
  return out.filter((c) => c.saving >= 1000).map((c) => ({ ...c, saving: Math.round(c.saving / 1000) * 1000 })).sort((a, b) => b.saving - a.saving).slice(0, limit);
}

/**
 * Spending against the estimate made when the draft was approved (November 8, 2026), by area, with the reasons the
 * production itself recorded for any difference: extra or lost shoot days, pickups, additional work, repairs, missed
 * capture sessions. Estimates aren't quotes; this shows where they parted. Null for an estimate from before then.
 */
export interface EstimateComparison { area: CostArea; label: string; estimated: number; actual: number }
const AREA_LABEL: Record<CostArea, string> = { crew: 'Crew', cast: 'Cast', shoot: 'Shoot Days', builds: 'Builds And Materials', facilities: 'Studio, Render And Capture' };

export function estimateAgainstSpending(p: Project): { rows: EstimateComparison[]; reasons: string[]; at: number; total: number } | null {
  const snap = p.finance?.estimateAtApproval;
  if (!snap || snap.draft !== p.approvedDraft) return null;
  const actual: Record<string, number> = {};
  for (const o of p.obligations) {
    const area = AREA_OF_CATEGORY[o.category];
    if (!area || o.ref?.startsWith('release-offer:')) continue; // delivery materials belong to a distribution deal, not the production estimate
    actual[area] = (actual[area] ?? 0) + (o.state === 'cancelled' ? o.settled : o.amount);
  }
  const rows = (Object.keys(AREA_LABEL) as CostArea[]).map((area) => ({ area, label: AREA_LABEL[area], estimated: Math.round(snap.byArea[area] ?? 0), actual: Math.round(actual[area] ?? 0) }))
    .filter((r) => r.estimated || r.actual);
  const reasons: string[] = [];
  const days = p.schedule.days;
  const lost = days.filter((d) => d.status === 'lost').length;
  const shot = days.filter((d) => d.status !== 'lost' && d.status !== 'moved').length;
  if (shot !== snap.shootDays) reasons.push(`${shot} shoot ${shot === 1 ? 'day' : 'days'} planned or shot against ${snap.shootDays} estimated.`);
  if (lost) reasons.push(`${lost} shoot ${lost === 1 ? 'day was' : 'days were'} lost and paid again.`);
  const extra = p.tasks.filter((t) => ['post:vfx-rev', 'post:revoice', 'sm:repair', 'post:adr'].includes(t.kind));
  if (extra.length) reasons.push(`Work the estimate didn't include: ${extra.map((t) => t.label).slice(0, 4).join(', ')}${extra.length > 4 ? ', and more' : ''}.`);
  const missed = Object.values(p.mocap ?? {}).flatMap((r) => r.sessions ?? []).filter((x) => x.status === 'missed').length;
  if (missed) reasons.push(`${missed} capture ${missed === 1 ? 'session was' : 'sessions were'} missed and rebooked.`);
  const above = p.hires.filter((h) => h.status === 'accepted' && h.counterRate && h.dayRate >= h.counterRate).length;
  if (above) reasons.push(`${above} ${above === 1 ? 'person was' : 'people were'} hired at a counteroffer above the rate the estimate assumed.`);
  return { rows, reasons, at: snap.at, total: Math.round(snap.total) };
}
