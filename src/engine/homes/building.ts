// Land and building a home (from November 17, 2026; the package's 04-LAND-DESIGN-CONSTRUCTION and 02-RESEARCH-TO-
// ENGINE "Land and building: no instant home").
// Buy a plot → investigate it (survey, ground, services) → design: floors, rooms with their sizes, the outside →
// the design checked against the plot and its own floor area → the authority's approval → a contract → stages on the
// game's clock, each paid as it starts, the outside stages slowed by the weather, some inspected (a failure means
// rework and another inspection, not another bill) → completion: a home built as finally designed, a defects period.
//
// Costs are the game's model. In the United States they are calibrated by NAHB's 2024 survey (average construction cost
// per square foot, and its split by stage): a national survey, not a builder's quote here. Elsewhere the game's
// placeholder rate, said as one. Owning land doesn't approve building on it; the authority's decision is modeled where
// the research has no rule, and said so.
import { getPlace } from '../../data/places';
import { newId } from '../state';
import { unit } from '../rng';
import { weatherOn } from '../weather';
import type { GameState } from '../types';
import { HOME_RULES } from './market';
import { startBills } from './living';
import { badDesignValue, designHash, gardenOf, roomCheck, roomsFrom, rulesFor, scopesOf, type Design, type Home, type RoomKind } from './model';
import {
  BOOK, addDaysToKey, book, canPay, document, dollarsOf, formatDateKey, homeOf, homesOf, instantOn, money, note, payOut, record, scheduleHome, todayAt, type Build, type BuildStage, type Owned,
} from './core';

/** NAHB 2024: construction cost per finished square foot, and its stage split; the game spreads a build by it. */
export const NAHB = { costPerSqftUsd: 428215 / 2647, shares: { site_work: 32719, foundations: 44748, framing: 70982, exterior_finishes: 57510, major_systems_rough_in: 82319, interior_finishes: 103391, final_steps: 27710, other: 8835 } } as const;
export const PLACEHOLDER_BUILD_PER_M2_USD = 1900;
const SQFT_PER_M2 = 10.7639;
export const EXTRAS_USD = { garage: { single: 25000, double: 42000, carport: 9000, none: 0 }, pool: 58000, porch: 16000, terrace: 9000, fence: 4000, balcony: 6000, driveway: { paved: 9000, gravel: 3500, none: 0 }, landscaping: { none: 0, lawn: 2500, garden: 7500, trees: 6000 } } as const;
export const INVESTIGATIONS = { survey: { label: 'Boundary And Site Survey', usd: 1800, days: 7 }, soil: { label: 'Ground Investigation', usd: 2500, days: 10 }, services: { label: 'Utility Connections Check', usd: 900, days: 5 } } as const;
export type Investigation = keyof typeof INVESTIGATIONS;

const local = (state: GameState, cur: string, usd: number) => Math.round(usd * 100 / (dollarsOf(state, cur, 10000) / 100) / 100) * 100;
const ownsLand = (state: GameState, landId: string) => homesOf(state).owned.some((o) => o.homeId === landId && !o.soldAt) && homesOf(state).homes[landId]?.form === 'land';

export function investigate(state: GameState, landId: string, kind: Investigation): void {
  const land = homeOf(state, landId);
  if (land.form !== 'land' || !land.land) throw new Error('Only a building plot is investigated this way.');
  if (land.land.investigated.includes(kind)) throw new Error('That has already been done.');
  const inv = INVESTIGATIONS[kind];
  const fee = local(state, land.currency, inv.usd);
  if (!canPay(state, land.currency, fee)) throw new Error(`You need ${money(land.currency, fee)} available.`);
  payOut2(state, land, `inv:${landId}:${kind}`, fee, `${inv.label}: ${land.title}`);
  scheduleHome(state, instantOn(land, addDaysToKey(todayAt(state, land), inv.days)), 'investigation', { landId, kind });
  note(state, landId, `${inv.label} ordered for ${land.title}: ${money(land.currency, fee)}. The report comes on ${formatDateKey(addDaysToKey(todayAt(state, land), inv.days))}.`, 'money');
}
const payOut2 = (state: GameState, h: Home, key: string, minor: number, label: string) => payOut(state, h, key, minor, label, 'Land And Building');
/** A report, kept once: the survey fixes the buildable area (the game's model: setbacks leave 45% of the plot to build on). */
export function investigationReport(state: GameState, landId: string, kind: Investigation): void {
  const land = homeOf(state, landId);
  if (!land.land || land.land.investigated.includes(kind)) return;
  land.land.investigated.push(kind);
  let says = '';
  if (kind === 'survey') { land.land.buildableM2 = Math.round((land.plotAreaM2 ?? 0) * 0.45); says = `Boundaries confirmed. After setbacks, ${land.land.buildableM2} m² of the ${land.plotAreaM2} m² plot can be built on (the game's model of setbacks).`; }
  if (kind === 'soil') says = unit(landId, 'soil') < 0.25 ? 'The ground is soft in places: foundations need to go deeper, about 8% more on that stage.' : 'The ground is firm: ordinary foundations will do.';
  if (kind === 'services') { if (land.land.services === 'unknown') land.land.services = unit(landId, 'services') < 0.6 ? 'nearby' : 'connected'; says = land.land.services === 'connected' ? 'Water, power and drainage are at the boundary.' : 'Water, power and drainage are nearby: connecting them is part of the build.'; }
  document(state, landId, INVESTIGATIONS[kind].label, [says]);
  note(state, landId, `${INVESTIGATIONS[kind].label} for ${land.title}: ${says}`);
}

/** A design to start from, editable: a two-storey, three-bedroom house sized to the plot. */
export function startDesign(state: GameState, landId: string): Build {
  if (!ownsLand(state, landId)) throw new Error("You don't own this plot.");
  if (homesOf(state).builds.some((b) => b.landId === landId && b.stage !== 'complete' && b.stage !== 'refused')) throw new Error('A design for this plot is already under way.');
  const rooms: [RoomKind, number][] = [['living', 26], ['kitchen', 14], ['dining', 12], ['bedroom', 15], ['bedroom', 12], ['bedroom', 11], ['bathroom', 7], ['half-bath', 3], ['laundry', 5]];
  const floorAreaM2 = 140;
  const design: Design = { revision: 1, style: 'contemporary', floors: 2, widthM: 10, depthM: 7, roof: 'gable', roofMaterial: 'tile', roofColor: 'charcoal', walls: 'render', wallColor: 'white', windowsPerFloor: 3, windowStyle: 'casement', frameColor: 'black', door: 'panel', doorColor: 'navy', balconies: 0, garage: 'single', driveway: 'gravel', landscaping: 'lawn', outdoor: [] };
  const b: Build = { id: newId(state, 'build'), landId, stage: 'designing', design, floorAreaM2, rooms: rooms.map(([kind, areaM2]) => ({ kind, areaM2 })), revisions: [], quoteMinor: 0, stages: [], current: 0, defects: [], payments: [] };
  b.quoteMinor = buildQuote(state, b).total;
  b.revisions.push({ revision: 1, at: state.now, changed: ['the starting design'], costMinor: b.quoteMinor });
  homesOf(state).builds.push(b);
  note(state, landId, `You started designing a house for ${homeOf(state, landId).title}.`);
  return b;
}

/** What's wrong with a design for its plot, each in words; empty when it fits. */
export function designProblems(state: GameState, b: Pick<Build, 'design' | 'floorAreaM2' | 'rooms' | 'landId'>): string[] {
  const land = homeOf(state, b.landId);
  const out: string[] = [];
  const d = b.design;
  const rc = roomCheck(b.rooms, b.floorAreaM2);
  if (d.floors < 1 || d.floors > 4) out.push('A house here can have one to four floors.');
  if (d.balconies > 0 && d.floors < 2) out.push('A balcony needs a floor above the ground: add a floor or take the balcony away.');
  if (rc.bedrooms < 1) out.push('Add at least one bedroom.');
  if (rc.fullBaths < 1) out.push('Add at least one full bathroom.');
  if (!b.rooms.some((r) => r.kind === 'kitchen')) out.push('Add a kitchen.');
  if (!rc.fits) out.push(`The rooms come to ${rc.roomsM2} m², ${rc.withCirculation} m² with halls, stairs and walls: more than the ${b.floorAreaM2} m² floor area. Make the rooms smaller or the floor area larger.`);
  if (b.rooms.some((r) => r.areaM2 < 2.5)) out.push('Every room needs at least 2.5 m².');
  const footprint = Math.round(b.floorAreaM2 / d.floors);
  if (Math.abs(d.widthM * d.depthM - footprint) > footprint * 0.25) out.push(`The footprint drawn, ${d.widthM} × ${d.depthM} m, doesn't match ${footprint} m² a floor: change the width and depth, or the floors.`);
  const buildable = land.land?.buildableM2;
  if (buildable !== null && buildable !== undefined && footprint > buildable) out.push(`The footprint, ${footprint} m² a floor, is more than the ${buildable} m² the survey allows to be built on.`);
  const garden = gardenOf({ plotAreaM2: land.plotAreaM2, design: d, form: 'detached' });
  if (garden !== null && garden < 20) out.push(`The house, garage, drive and outside features leave only ${garden} m² of garden: the plot isn't big enough for all of them.`);
  if (d.outdoor.includes('pool') && garden !== null && garden < 60) out.push("There isn't enough usable garden space for this pool.");
  return out;
}

/** The cost plan: floor area at the rate, the extras, design, approvals, contingency; and how it's spread by stage. */
export function buildQuote(state: GameState, b: Pick<Build, 'design' | 'floorAreaM2' | 'landId'>): { total: number; lines: { what: string; minor: number }[]; basis: string; stages: BuildStage[] } {
  const land = homeOf(state, b.landId);
  const cur = land.currency;
  const us = land.country === 'US';
  const perM2Usd = us ? NAHB.costPerSqftUsd * SQFT_PER_M2 : PLACEHOLDER_BUILD_PER_M2_USD;
  const d = b.design;
  const soft = land.land?.investigated.includes('soil') && unit(b.landId, 'soil') < 0.25;
  const main = local(state, cur, perM2Usd * b.floorAreaM2);
  const extrasUsd = EXTRAS_USD.garage[d.garage] + EXTRAS_USD.driveway[d.driveway] + EXTRAS_USD.landscaping[d.landscaping] + d.balconies * EXTRAS_USD.balcony + d.outdoor.reduce((a, o) => a + EXTRAS_USD[o], 0);
  const extras = local(state, cur, extrasUsd);
  const connect = land.land?.services === 'connected' ? 0 : local(state, cur, land.land?.services === 'nearby' ? 15000 : 25000);
  const design = Math.round(main * 0.08 / 100) * 100;
  const permits = Math.round(main * 0.015 / 100) * 100;
  const contingency = Math.round((main + extras) * 0.1 / 100) * 100;
  const lines = [
    { what: `Building ${b.floorAreaM2} m²`, minor: main }, { what: 'Garage, drive, garden and outside features', minor: extras }, { what: 'Connecting water, power and drainage', minor: connect },
    { what: 'Design and engineering (8%)', minor: design }, { what: 'Approvals and inspections (1.5%)', minor: permits }, { what: 'Contingency (10%)', minor: contingency },
  ];
  const total = lines.reduce((a, l) => a + l.minor, 0);
  const S = NAHB.shares; const all = Object.values(S).reduce((a, x) => a + x, 0);
  const share = (x: number) => Math.round((main * x) / all / 100) * 100;
  const stages: BuildStage[] = [
    { name: 'Site Work', days: 6, costMinor: share(S.site_work) + connect + design + permits, exterior: true, inspection: false, failedInspections: 0 },
    { name: 'Foundations', days: 10, costMinor: Math.round(share(S.foundations) * (soft ? 1.08 : 1)), exterior: true, inspection: true, failedInspections: 0 },
    { name: 'Structure', days: 21, costMinor: share(S.framing), exterior: true, inspection: true, failedInspections: 0 },
    { name: 'Weatherproof Shell', days: 14, costMinor: share(S.exterior_finishes), exterior: true, inspection: false, failedInspections: 0 },
    { name: 'Rough Services', days: 12, costMinor: share(S.major_systems_rough_in), exterior: false, inspection: true, failedInspections: 0 },
    { name: 'Insulation And Finishes', days: 24, costMinor: share(S.interior_finishes), exterior: false, inspection: false, failedInspections: 0 },
    { name: 'Fixtures, Garage And Garden', days: 12, costMinor: share(S.final_steps + S.other) + extras, exterior: true, inspection: false, failedInspections: 0 },
    { name: 'Commissioning And Final Inspection', days: 4, costMinor: contingency, exterior: false, inspection: true, failedInspections: 0 },
  ];
  return { total, lines, stages, basis: us ? "NAHB's 2024 national survey: average construction cost per square foot and its split by stage. A national calibration, not a builder's quote here." : `The game's placeholder rate (US$${PLACEHOLDER_BUILD_PER_M2_USD.toLocaleString('en-US')}/m²): no construction costs for ${getPlace(land.placeId).countryName} have been researched.` };
}

/** Change the design: every field the picture and the plan read. A new revision, its changes and its new cost kept. */
export function saveDesign(state: GameState, buildId: string, patch: { design?: Partial<Design>; floorAreaM2?: number; rooms?: { kind: RoomKind; areaM2: number }[] }): Build {
  const b = homesOf(state).builds.find((x) => x.id === buildId);
  if (!b) throw new Error('That design is no longer on record.');
  if (b.stage === 'complete') throw new Error('The house is built: changes to it are renovation work.');
  const late = b.stage === 'building' || b.stage === 'paused';
  const fixturesAt = b.stages.findIndex((s) => s.name.startsWith('Fixtures'));
  if (late && b.current >= fixturesAt) throw new Error('Too late for a change: the fixtures are going in.');
  if (late && (patch.floorAreaM2 !== undefined || patch.design?.floors !== undefined || patch.design?.widthM !== undefined || patch.design?.depthM !== undefined) && b.current >= 2) throw new Error("The structure is up: its size and floors can't change now.");
  const bad = patch.design ? badDesignValue(patch.design) : null;
  if (bad) throw new Error(bad);
  if (patch.floorAreaM2 !== undefined && !(Number.isFinite(patch.floorAreaM2) && patch.floorAreaM2 > 0)) throw new Error('The floor area must be a number of square metres.');
  const before = JSON.stringify({ d: b.design, f: b.floorAreaM2, r: b.rooms });
  const next = { design: { ...b.design, ...(patch.design ?? {}) }, floorAreaM2: patch.floorAreaM2 ?? b.floorAreaM2, rooms: patch.rooms ?? b.rooms, landId: b.landId };
  const problems = designProblems(state, next);
  if (problems.length) throw new Error(problems[0]);
  if (JSON.stringify({ d: next.design, f: next.floorAreaM2, r: next.rooms }) === before) return b;
  const changed = [...Object.keys(patch.design ?? {}).filter((k) => JSON.stringify((patch.design as Record<string, unknown>)[k]) !== JSON.stringify((b.design as unknown as Record<string, unknown>)[k])), ...(patch.floorAreaM2 !== undefined && patch.floorAreaM2 !== b.floorAreaM2 ? ['floor area'] : []), ...(patch.rooms ? ['rooms'] : [])];
  const revision = b.design.revision + 1;
  const q = buildQuote(state, { ...next, design: { ...next.design, revision } });
  const land = homeOf(state, b.landId);
  // A change order (from November 17, 2026): a stage already paid for is paid the difference now, once; a stage still
  // to come is paid at its new cost when it starts. Until then the whole difference was charged now and again in the
  // re-costed stages, and a refused payment left the design already changed.
  const paidStages = late ? b.stages.map((st, i) => (st.paidKey ? i : -1)).filter((i) => i >= 0) : [];
  const owedNow = paidStages.reduce((a, i) => a + Math.max(0, q.stages[i].costMinor - b.stages[i].costMinor), 0);
  if (owedNow > 0 && !canPay(state, land.currency, owedNow)) throw new Error(`This change adds ${money(land.currency, owedNow)} to work already paid for, which you don't have available.`);
  const oldQuote = b.quoteMinor;
  b.design = { ...next.design, revision };
  b.floorAreaM2 = next.floorAreaM2; b.rooms = next.rooms;
  b.quoteMinor = q.total;
  b.revisions.push({ revision, at: state.now, changed, costMinor: q.total });
  if (late) {
    const key = `build:${b.id}:change:${revision}`;
    if (owedNow > 0) {
      book(state, land, key, -owedNow, `Change order, revision ${revision}: ${land.title}`, BOOK.homesOwned);
      record(b.payments, { key, label: `Change order (revision ${revision})`, minor: owedNow, kind: 'paid' }, state);
    }
    // What's been paid for keeps what it cost (plus what it added); the rest is costed anew.
    b.stages.forEach((st, i) => { st.costMinor = st.paidKey ? Math.max(st.costMinor, q.stages[i].costMinor) : q.stages[i].costMinor; });
    b.quoteMinor = b.stages.reduce((a, st) => a + st.costMinor, 0);
    const diff = b.quoteMinor - oldQuote;
    note(state, b.landId, `Revision ${revision}: ${changed.join(', ')}. ${owedNow > 0 ? `${money(land.currency, owedNow)} of it is for work already paid for, paid now; ` : ''}${diff > owedNow ? `${money(land.currency, diff - owedNow)} more is paid with the stages still to come.` : diff < 0 ? `It saves ${money(land.currency, -diff)} on the stages still to come.` : 'Nothing more is owed.'}`);
  } else note(state, b.landId, `Design revision ${revision}: ${changed.join(', ') || 'no change'}. The cost plan is now ${money(land.currency, q.total)}.`);
  if (b.stage === 'awaiting-permission') {
    // The application was for the earlier design: it's withdrawn, its fee spent, and the new design is applied for anew
    // (from November 17, 2026: until then the decision for the old revision never landed and the project waited for ever).
    b.stage = 'designing'; b.permitAskedAt = undefined; b.permitDecideAt = undefined;
    b.permitSays = `The application for revision ${revision - 1} was withdrawn when the design changed. Apply again for revision ${revision}.`;
    note(state, b.landId, b.permitSays, 'warning');
  }
  if (b.stage === 'permitted' || b.stage === 'refused') { b.stage = 'designing'; note(state, b.landId, 'The design changed after the decision: it needs approving again.', 'warning'); }
  return b;
}

/** Ask the authority to approve the design. Unknown local rules aren't approval: the game models the decision and says so. */
export function applyForApproval(state: GameState, buildId: string): void {
  const b = homesOf(state).builds.find((x) => x.id === buildId);
  if (!b || b.stage !== 'designing') throw new Error('There is no design waiting to be submitted.');
  const land = homeOf(state, b.landId);
  if (!land.land?.investigated.includes('survey')) throw new Error('The authority needs a site survey first: order one under the plot.');
  const problems = designProblems(state, b);
  if (problems.length) throw new Error(problems[0]);
  const fee = local(state, land.currency, 400);
  if (!canPay(state, land.currency, fee)) throw new Error(`You need ${money(land.currency, fee)} available for the application.`);
  payOut2(state, land, `permit:${b.id}:${b.design.revision}`, fee, `Building approval application: ${land.title}`);
  b.stage = 'awaiting-permission';
  b.permitAskedAt = state.now;
  b.permitDecideAt = instantOn(land, addDaysToKey(todayAt(state, land), 30));
  scheduleHome(state, b.permitDecideAt, 'build-permission', { id: b.id, revision: b.design.revision });
  note(state, b.landId, `You applied for approval to build at ${land.title}. The decision is due on ${formatDateKey(addDaysToKey(todayAt(state, land), 30))}.`, 'money');
}
export function decideApproval(state: GameState, b: Build, revision: number): void {
  if (b.stage !== 'awaiting-permission' || b.design.revision !== revision) return;
  const land = homeOf(state, b.landId);
  const problems = designProblems(state, b);
  const cape = rulesFor(HOME_RULES, land.scopes).find((r) => r.id === 'cape.pool');
  if (problems.length) { b.stage = 'refused'; b.permitSays = `Refused: ${problems[0]}`; }
  else { b.stage = 'permitted'; b.permitSays = `Approved.${b.design.outdoor.includes('pool') && cape ? " The pool's building plans are approved with the house, as the City of Cape Town requires." : ''}${cape ? '' : " Local building rules for this place haven't been researched: the decision is the game's model."}`; }
  note(state, b.landId, `${land.title}: building approval ${b.permitSays}`, b.stage === 'refused' ? 'warning' : 'personal');
}

/** Sign with the builder: stages begin; each is paid as it starts (a home's cost, not an expense). */
export function signBuild(state: GameState, buildId: string): void {
  const b = homesOf(state).builds.find((x) => x.id === buildId);
  if (!b || b.stage !== 'permitted') throw new Error('The design needs approval before a builder can start.');
  const land = homeOf(state, b.landId);
  b.stages = buildQuote(state, b).stages;
  b.current = 0;
  b.stage = 'building';
  document(state, b.landId, 'Building Contract', [`Revision ${b.design.revision}, ${b.floorAreaM2} m², ${money(land.currency, b.quoteMinor)}.`, ...b.stages.map((s) => `${s.name}: ${money(land.currency, s.costMinor)}, about ${s.days} days${s.inspection ? ', inspected' : ''}.`), 'Each stage is paid as it starts. Missing money pauses the work until it\'s there.']);
  startStage(state, b);
}
function startStage(state: GameState, b: Build): void {
  const land = homeOf(state, b.landId);
  const s = b.stages[b.current];
  const key = `build:${b.id}:stage:${b.current}`;
  if (!s.paidKey) {
    if (!canPay(state, land.currency, s.costMinor)) {
      b.stage = 'paused'; b.pausedBecause = `The next stage, ${s.name}, costs ${money(land.currency, s.costMinor)} and you don't have it available. The builder has stopped until it's paid.`;
      note(state, b.landId, `${land.title}: ${b.pausedBecause}`, 'warning');
      return;
    }
    book(state, land, key, -s.costMinor, `${s.name}: building at ${land.title}`, BOOK.homesOwned);
    record(b.payments, { key, label: s.name, minor: s.costMinor, kind: 'paid' }, state);
    s.paidKey = key;
  }
  b.stage = 'building'; b.pausedBecause = undefined;
  s.started = todayAt(state, land);
  scheduleHome(state, instantOn(land, addDaysToKey(s.started, s.days), 17), 'build-stage-end', { id: b.id, stage: b.current, attempt: s.failedInspections });
  note(state, b.landId, `${s.name} has started at ${land.title}: ${money(land.currency, s.costMinor)}, paid. It should take about ${s.days} days.`, 'money');
}
export function resumeBuild(state: GameState, buildId: string): void {
  const b = homesOf(state).builds.find((x) => x.id === buildId);
  if (!b || b.stage !== 'paused') throw new Error('The build isn\'t paused.');
  startStage(state, b);
  if ((b.stage as Build['stage']) === 'paused') throw new Error(b.pausedBecause);
}
/** A stage's end: an outside stage waits out a wet day; an inspected stage is inspected (a failure is rework, not a bill). */
export function stageEnd(state: GameState, b: Build, index: number, attempt: number): void {
  if (b.stage !== 'building' || b.current !== index) return;
  const s = b.stages[index];
  if (s.failedInspections !== attempt) return;
  const land = homeOf(state, b.landId);
  const today = todayAt(state, land);
  if (s.exterior && !(s as BuildStage & { weatherDays?: number }).weatherDays) {
    const w = weatherOn(state.seed, getPlace(land.placeId), today);
    if (w.wet && w.precipMm >= 8) {
      (s as BuildStage & { weatherDays?: number }).weatherDays = 2;
      scheduleHome(state, instantOn(land, addDaysToKey(today, 2), 17), 'build-stage-end', { id: b.id, stage: index, attempt });
      note(state, b.landId, `${land.title}: heavy rain (${w.precipMm} mm) held up ${s.name.toLowerCase()} by two days.`);
      return;
    }
  }
  if (s.inspection) {
    const fail = unit(state.seed, 'build-inspection', b.id, index, attempt) < 0.15;
    if (fail) {
      s.failedInspections += 1;
      scheduleHome(state, instantOn(land, addDaysToKey(today, 4), 17), 'build-stage-end', { id: b.id, stage: index, attempt: s.failedInspections });
      note(state, b.landId, `${land.title}: ${s.name} failed its inspection. The builder puts it right at their own cost and it's inspected again in four days; the finish moves back.`, 'warning');
      return;
    }
  }
  s.done = today;
  if (index + 1 < b.stages.length) { b.current = index + 1; startStage(state, b); return; }
  completeBuild(state, b);
}
/** The house as built: a home you own on your land, from the final revision; a defects period with the builder. */
function completeBuild(state: GameState, b: Build): void {
  const hs = homesOf(state);
  const land = homeOf(state, b.landId);
  const id = `${b.landId}:house`;
  const today = todayAt(state, land);
  const rc = roomCheck(b.rooms, b.floorAreaM2);
  const house: Home = {
    ...structuredClone(land), id, form: 'detached', tenure: land.tenure === 'leasehold' ? 'leasehold' : 'freehold', market: 'sale', title: `Your New House, ${getPlace(land.placeId).name}`,
    priceMinor: hs.owned.find((o) => o.homeId === land.id)!.costMinor + b.quoteMinor, evidence: [{ basis: 'model', sourceId: 'SLATE-MODEL', says: 'Built by you: what it cost is its land and its build, not its market value.' }],
    bedrooms: rc.bedrooms, bathrooms: rc.fullBaths, floorAreaM2: b.floorAreaM2, rooms: roomsFrom(b.rooms.map((r) => [r.kind as RoomKind, r.areaM2]), `${id}:`),
    privateAmenities: ['Garden', ...(b.design.outdoor.includes('pool') ? ['Private Pool'] : []), ...(b.design.garage !== 'none' ? [b.design.garage === 'carport' ? 'Carport' : `${b.design.garage === 'double' ? 'Double' : 'Single'} Garage`] : [])],
    sharedAmenities: [], included: [], condition: { roof: 'good', structure: 'good', plumbing: 'good', electrical: 'good', heating: 'good', finishes: 'good' },
    design: { ...b.design }, land: undefined, landlordItems: [], scopes: scopesOf(getPlace(land.placeId), 'detached'),
  };
  hs.homes[id] = house;
  const landOwned = hs.owned.find((o) => o.homeId === land.id && !o.soldAt)!;
  const owned: Owned = { homeId: id, since: state.now, costMinor: landOwned.costMinor + b.quoteMinor, payments: [] };
  landOwned.soldAt = state.now; // the plot is now the house's land: one property, not two
  hs.owned.push(owned);
  b.stage = 'complete'; b.homeId = id;
  startBills(state, house);
  b.defectsUntil = addDaysToKey(today, 180);
  const snags = ['A sticking door', 'A dripping tap', 'Cracked grout in the bathroom', 'A loose stair rail'].filter((_, i) => unit(state.seed, 'snag', b.id, i) < 0.5);
  b.defects = snags;
  snags.forEach((d, i) => scheduleHome(state, instantOn(land, addDaysToKey(today, 14 + i * 7)), 'defect-fix', { id: b.id, defect: d }));
  document(state, id, 'Completion And Occupancy', [`Built to revision ${b.design.revision} (design ${designHash(b.design)}), ${b.floorAreaM2} m², ${rc.bedrooms} bedrooms, ${rc.fullBaths} bathrooms.`, `Cost ${money(land.currency, b.quoteMinor)} on land that cost ${money(land.currency, landOwned.costMinor)}.`, `The builder's defects period runs to ${formatDateKey(b.defectsUntil)}.`, ...(snags.length ? [`Snags to put right: ${snags.join('; ')}.`] : [])]);
  note(state, id, `Your house at ${getPlace(land.placeId).name} is finished and passed its final inspection. You can move in.${snags.length ? ` ${snags.length} small defect${snags.length > 1 ? 's' : ''} will be put right by the builder.` : ''}`);
}
export function fixDefect(state: GameState, b: Build, defect: string): void {
  if (!b.defects.includes(defect)) return;
  b.defects = b.defects.filter((d) => d !== defect);
  note(state, b.homeId ?? b.landId, `The builder put right: ${defect.toLowerCase()}.`);
}
export { dollarsOf };
