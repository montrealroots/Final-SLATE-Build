// What an approved script costs to make at its budget size (November 7, 2026). Until then a project's Budget Estimate
// was its budget size's fixed amount whatever the script: a two-minute micro-budget stop-motion short was "estimated" at
// $40,000 and needed about $75,000, so the agreed starting backing was asked for too little and the animators were
// never affordable. Now, once a draft is approved, the estimate is what that script needs: the required crew and the
// cast at the lowest experienced rates (combining roles on a micro budget, as staffing does), materials, shoot days,
// studio and render time, money already spent or held, and a contingency. It is never below the budget size's amount,
// so a script that fits its size keeps the same estimate. Amounts are game calibration, not industry prices.
//
// The breakdown (November 8, 2026). The estimate used to be one total. It is now built from lines, each from the same
// rule the production uses when it does the work: shoot days are the schedule's own grouping of scenes by place, inside
// or out and day or night, with each scene's shot plan (production/schedule.ts groupShootDays); crowds are paid per day
// the scene is shot; builds are the tasks' materials; studio, render and capture-stage time are the sessions and frames
// the tasks will use. Money is kept apart by how sure it is: spent, committed to someone who accepted, reserved by a
// plan or an offer, and still to come (estimated, nobody has agreed to it). A role or part no one free can take is
// priced at the nearest comparable rate and listed as uncertain with how to resolve it; until November 8 a crew role
// was counted at nothing, and a part offered and awaiting an answer was counted twice (its reservation and its price).
// Identifiable risks (a day lost to rain, a damaged puppet, a missed capture session) are named with what one costs,
// against the contingency. Until November 8 the capture stage wasn't in the estimate until it was booked.

import { partMethods, partName, partScenes, samePart, stagesOf } from './parts';
import { ledgerTotals, money } from './budget';
import { castRoleFor, estimateDays, requiredCrewPlan, roleCandidates } from './hiring';
import { roleLabel } from './people';
import { buildTasks, dayFees, groupShootDays, materialCost, VOICE_SESSION_STUDIO, RENDER_NODE_DAY_COST, type ShootDayGroup } from './production';
import { CROWD_DAY_RATE, RENDER_HOURS_PER_FRAME } from './production/rates';
import { rigDayCost } from './craft';
import { awayCosts } from './destinations';
import { makeupDayCost, physicalCrowd } from './looks';
import { sessionCost } from './mocap';
import { approvedCharacters, approvedScenes, fundingScenario, onDraftApproved } from './projects';
import type { GameState, Project, Task } from './types';

/** A tenth on top, the usual allowance for what goes wrong (lost days, counteroffers, reshoots). */
export const CONTINGENCY = 0.1;

export type CostArea = 'crew' | 'cast' | 'shoot' | 'builds' | 'facilities';
/** Which area each ledger category's money belongs to, for comparing spending with the estimate (cost-cuts.ts). */
export const AREA_OF_CATEGORY: Record<string, CostArea> = { cast: 'cast', crew: 'crew', locations: 'shoot', equipment: 'shoot', materials: 'builds', licensing: 'builds', post: 'facilities' };
/** Work still to come and its estimated price: nobody has agreed to it and no money is held for it. */
export interface CostLine { area: CostArea; label: string; amount: number; driver: string }
export interface CostBreakdown {
  /** Paid already. */
  spent: number;
  /** Agreed with someone who accepted, not yet paid. */
  committed: number;
  /** Held for a plan (the schedule's shoot days and builds), an offer awaiting an answer, or a booking. */
  reserved: number;
  /** Estimated work still to come, line by line. */
  toCome: CostLine[];
  /** Roles and parts no one free can take: priced at the nearest comparable rate, and how to resolve each. */
  uncertain: { item: string; resolve: string }[];
  /** Things that can go wrong, with what one occurrence costs, to judge the contingency against. */
  risks: { item: string; cost: number }[];
  shootDays: number;
  total: number;
}

/** The work still to come: the plan's tasks once there is a plan, else the work the script needs less what is finished. */
function toComeTasks(p: Project): Task[] {
  const finished = new Map(p.tasks.filter((x) => x.status === 'done').map((x) => [x.id, x]));
  return (p.schedule.startDate ? p.tasks : buildTasks(p).filter((x) => !(finished.has(x.id) && (finished.get(x.id)!.needsVersion ?? 0) >= (x.needsVersion ?? 0))))
    .filter((x) => x.status !== 'done');
}

const groupLabel = (g: ShootDayGroup) => `${g.place}, ${g.interior ? 'interior' : 'exterior'}${g.night ? ', night' : ''}`;

export function costBreakdown(state: GameState, p: Project): CostBreakdown {
  const t = ledgerTotals(p);
  const lines: CostLine[] = [];
  const uncertain: CostBreakdown['uncertain'] = [];
  const crewPlan = requiredCrewPlan(state, p);
  for (const x of crewPlan) {
    if (x.cost > 0) lines.push({ area: 'crew', label: roleLabel(x.nr.roleId), amount: x.cost, driver: `About ${x.days} ${x.days === 1 ? 'day' : 'days'} at ${money(x.rate)}` });
    if (x.noCandidate) uncertain.push({ item: `${roleLabel(x.nr.roleId)}: no one is free for your production window${x.cost ? `; priced at ${money(x.rate)} a day, the lowest rate for that job` : ', and no one does that job here'}.`, resolve: 'Move the start date, or change the script so the role is no longer needed.' });
  }
  // Every part still to cast, by the methods the Cast page offers for it.
  for (const c of approvedCharacters(p)) {
    if (c.roleSize === 'background' || !approvedScenes(p).some((s) => s.participants.includes(c.id))) continue;
    const methods = partMethods(p, c);
    // The part, and each stage of it (parts.ts): every one is cast and paid on its own.
    for (const [m, stage] of methods.flatMap((m) => [[m, undefined] as const, ...stagesOf(p, c.id).map((st) => [m, st.id] as const)])) {
      if (p.cast.some((a) => samePart(a, c.id, m, stage))) continue;
      // An offer out holds its own money (reserved), so it isn't priced again.
      if (p.hires.some((h) => samePart(h, c.id, m, stage) && ['offered', 'accepted', 'countered'].includes(h.status))) continue;
      if (!partScenes(p, c.id, stage).length) continue;
      const pool = roleCandidates(state, p, castRoleFor(m)).sort((a, b) => a.dayRate - b.dayRate);
      const cheapest = pool.find((x) => x.experience >= 2);
      const days = estimateDays(p, castRoleFor(m), c.id, m, state, stage);
      const rate = (cheapest ?? pool[0])?.dayRate ?? 0;
      const how = m.replace('-', ' ');
      if (rate) lines.push({ area: 'cast', label: `${partName(p, c.id, stage)} (${how})`, amount: rate * days, driver: `About ${days} ${days === 1 ? 'day' : 'days'} at ${money(rate)}` });
      if (!cheapest) uncertain.push({ item: `${c.name} (${how}): no experienced performer is available${rate ? `; priced at ${money(rate)} a day, the lowest rate anyone asks` : ''}.`, resolve: 'Cast yourself, consider less experienced performers, or invite people to read.' });
    }
  }
  const tasks = toComeTasks(p);
  const planned = p.obligations.some((o) => o.ref === 'plan:shoot' || o.ref === 'plan:materials');
  const groups = groupShootDays(p, state);
  if (!planned) {
    const fees = dayFees(p);
    const byPlace = new Map<string, number>();
    for (const g of groups) byPlace.set(groupLabel(g), (byPlace.get(groupLabel(g)) ?? 0) + 1);
    for (const [label, n] of byPlace) lines.push({ area: 'shoot', label, amount: n * (fees.location + fees.equipment), driver: `${n} shoot ${n === 1 ? 'day' : 'days'} at ${money(fees.location + fees.equipment)} for the location and equipment` });
    // Background performers are paid for each day their scene is shot, as the schedule reserves them.
    const scenes = approvedScenes(p);
    const crowds = new Map<string, { people: number; days: number }>();
    // Makeup materials used up on each day made-up people work (looks.ts), as the schedule reserves them.
    let makeupDays = 0;
    let makeupCost = 0;
    let rigDays = 0;
    let rigCost = 0;
    for (const g of groups) {
      const its = scenes.filter((s) => g.sceneIds.includes(s.id));
      const m = makeupDayCost(its, approvedCharacters(p));
      if (m) { makeupDays += 1; makeupCost += m; }
      const rig = rigDayCost(p, its);
      if (rig) { rigDays += 1; rigCost += rig; }
      const crowd = its.reduce((a, s) => a + physicalCrowd(s), 0);
      if (!crowd) continue;
      const c = crowds.get(groupLabel(g)) ?? { people: 0, days: 0 };
      crowds.set(groupLabel(g), { people: c.people + crowd, days: c.days + 1 });
    }
    for (const [label, c] of crowds) lines.push({ area: 'shoot', label: `Background performers: ${label}`, amount: c.people * CROWD_DAY_RATE, driver: `${c.people} performer-days at ${money(CROWD_DAY_RATE)}, over ${c.days} ${c.days === 1 ? 'day' : 'days'}` });
    if (makeupCost) lines.push({ area: 'shoot', label: 'Makeup materials', amount: makeupCost, driver: `Applied fresh on ${makeupDays} shoot ${makeupDays === 1 ? 'day' : 'days'}` });
    if (rigCost) lines.push({ area: 'shoot', label: 'Camera rig rental', amount: rigCost, driver: `A dolly and track or a stabiliser on ${rigDays} shoot ${rigDays === 1 ? 'day' : 'days'}` });
    // Filming away from the base (destinations.ts): the unit's move and its housing, place by place.
    for (const x of awayCosts(p, groups.map((g) => ({ locationLabel: g.place })))) {
      lines.push({ area: 'shoot', label: `Filming in ${x.place}: ${x.label}`, amount: x.move + x.housing, driver: `The unit moved there and back (${money(x.move)}) and housed for ${x.days} shoot ${x.days === 1 ? 'day' : 'days'}` });
    }
    for (const x of tasks) { const m = materialCost(x); if (m) lines.push({ area: 'builds', label: x.label, amount: m, driver: 'Materials and licences' }); }
  }
  const voice = tasks.filter((x) => x.kind === 'anim:voice').reduce((a, x) => a + (x.units - x.done), 0);
  if (voice) lines.push({ area: 'facilities', label: 'Recording studio', amount: voice * VOICE_SESSION_STUDIO, driver: `${voice} voice ${voice === 1 ? 'session' : 'sessions'} at ${money(VOICE_SESSION_STUDIO)}` });
  const frames = tasks.filter((x) => x.kind === 'anim:render').reduce((a, x) => a + (x.units - x.done), 0);
  const nodeDays = Math.ceil((frames * RENDER_HOURS_PER_FRAME[p.axes.animationQuality]) / 24);
  if (nodeDays) lines.push({ area: 'facilities', label: 'Render time', amount: nodeDays * RENDER_NODE_DAY_COST, driver: `${Math.round(frames).toLocaleString('en-US')} frames, about ${nodeDays} render node-days` });
  // The capture stage, for each captured part not yet booked (a booking holds its own money once made).
  for (const c of approvedCharacters(p)) {
    if (p.mocap?.[c.id]?.status === 'booked') continue;
    const sessions = tasks.filter((x) => (x.kind === 'anim:mocap' || x.kind === 'anim:mocap-calib') && x.assetRef === c.id).reduce((a, x) => a + Math.max(0, Math.ceil(x.units - x.done)), 0);
    if (sessions) lines.push({ area: 'facilities', label: `Capture stage: ${c.name}`, amount: sessions * sessionCost(p, c.id, ['body', 'face']), driver: `${sessions} ${sessions === 1 ? 'session' : 'sessions'}, body and face` });
  }
  // Identifiable risks, each priced as one occurrence: the contingency is judged against them.
  const risks: CostBreakdown['risks'] = [];
  const crewDay = crewPlan.reduce((a, x) => a + x.rate, 0) + p.hires.filter((h) => h.status === 'accepted').reduce((a, h) => a + h.dayRate, 0);
  const exteriors = groups.filter((g) => !g.interior).length;
  if (exteriors) risks.push({ item: `${exteriors} exterior shoot ${exteriors === 1 ? 'day' : 'days'} can be lost to rain or short daylight; a lost day is paid again.`, cost: dayFees(p).location + dayFees(p).equipment + crewDay });
  if (tasks.some((x) => x.kind === 'sm:animation')) risks.push({ item: 'A puppet can be damaged on the stage; a fabricator repairs it, unless a duplicate is ready.', cost: crewPlan.find((x) => x.nr.roleId === 'puppet-fabricator')?.rate ?? 0 });
  if (tasks.some((x) => x.kind === 'anim:mocap')) risks.push({ item: 'A capture session is missed if its performer is shooting elsewhere that day; it is rebooked.', cost: 0 });
  const toCome = lines.reduce((a, x) => a + x.amount, 0);
  return { spent: t.settled, committed: t.committedOutstanding, reserved: t.reserved, toCome: lines, uncertain, risks, shootDays: groups.length, total: t.settled + t.committedOutstanding + t.reserved + toCome };
}

export interface CostProjection {
  /** Spent, agreed or held already. */
  used: number;
  crew: number;
  cast: number;
  /** Locations, equipment, crowds and build materials not yet reserved by a schedule. */
  production: number;
  /** Recording studio, render and capture-stage time still to come. */
  facilities: number;
  total: number;
  /** Roles and parts no one available can fill (SLATE-08-01): priced at the nearest comparable rate, never at nothing. */
  uncertain: string[];
}

/** The breakdown summed by area: what the Budget Estimate is made from. */
export function projectedCost(state: GameState, p: Project): CostProjection {
  const b = costBreakdown(state, p);
  const sum = (...areas: CostArea[]) => b.toCome.filter((x) => areas.includes(x.area)).reduce((a, x) => a + x.amount, 0);
  return {
    used: b.spent + b.committed + b.reserved, crew: sum('crew'), cast: sum('cast'), production: sum('shoot', 'builds'), facilities: sum('facilities'),
    total: b.total, uncertain: b.uncertain.map((u) => u.item.slice(0, u.item.indexOf(':'))),
  };
}

/** The Budget Estimate for an approved script: its projected cost with the contingency, in whole thousands. */
export function scriptEstimate(state: GameState, p: Project): number {
  const size = fundingScenario(p.funding.scenarioId).fund;
  return Math.max(size, Math.ceil((projectedCost(state, p).total * (1 + CONTINGENCY)) / 1000) * 1000);
}

// On approval the estimate follows the script; the financing target follows it too, unless the player set their own.
// What it was made of is kept, so spending can be compared with it later (cost-cuts.ts estimateAgainstSpending).
onDraftApproved((state, p) => {
  const f = (p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] });
  const follows = f.target === f.estimate;
  f.estimate = scriptEstimate(state, p);
  if (follows) f.target = f.estimate;
  const b = costBreakdown(state, p);
  // Money already spent or held when the draft was approved is part of what this draft costs, as is the work to come.
  const byArea: Record<string, number> = {};
  for (const o of p.obligations) {
    const area = AREA_OF_CATEGORY[o.category];
    if (area && !o.ref?.startsWith('release-offer:')) byArea[area] = (byArea[area] ?? 0) + (o.state === 'cancelled' ? o.settled : o.amount);
  }
  for (const x of b.toCome) byArea[x.area] = (byArea[x.area] ?? 0) + x.amount;
  f.estimateAtApproval = { draft: p.approvedDraft ?? 0, at: state.now, total: b.total, byArea, shootDays: b.shootDays };
});
