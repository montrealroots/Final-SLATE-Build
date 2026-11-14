// Throughput rates, fees and premiums for production (simulation assumptions, docs/ASSUMPTIONS.md).
// Part of the production engine; src/engine/production.ts is its public interface.

import type { Project } from '../types';

// ---------------- Rates (simulation assumptions) ----------------

export const ANIM_RATE: Record<string, Record<'limited' | 'tv' | 'feature', number>> = {
  // finished seconds of screen time per artist per working day
  '2d-drawn': { limited: 6, tv: 2.5, feature: 1 },
  '2d-rigged': { limited: 15, tv: 8, feature: 4 },
  '3d-cg': { limited: 6, tv: 3, feature: 0.8 },
  'stop-motion': { limited: 3, tv: 1.5, feature: 0.8 },
  rotoscope: { limited: 4, tv: 2, feature: 1 },
  mixed: { limited: 4, tv: 2, feature: 0.9 },
};
/** Render node-hours per frame by quality tier; one node gives 24 node-hours a day. */
export const RENDER_HOURS_PER_FRAME = { limited: 0.25, tv: 0.5, feature: 1.5 };
export const OUTPUT_FPS = 24;
export const RENDER_NODE_DAY_COST = 35;
/** Live-action screen minutes captured per shoot day before complexity adjustments. */
export const BASE_MINUTES_PER_SHOOT_DAY = 4;
export const HOLIDAY_PREMIUM = 1.5;
/**
 * The sixth day of a six-day week, on a production above the low-budget line: time and a half. From November 14, 2026:
 * until then a sixth day cost what any day did, so six-day weeks only brought delivery forward and nothing later showed
 * it (docs/v10/proof/six-day-weeks.json). After (read through search summaries, not the documents): Pact's recommended low-budget feature terms (June 2026) pay a sixth
 * consecutive shooting day at the normal rate up to a £5m budget and at 1.5 times above it; the Pact/Bectu scripted TV
 * agreement (from 2023) and the Major Motion Pictures agreement pay 1.5 times. US crew agreements pay a sixth day at time
 * and a half too, but their low-budget tiers vary, so the British line stands for all. The line in dollars is £5m at about
 * 1.26 dollars to the pound (game calibration). It doesn't stack with the holiday premium.
 */
export const SIXTH_DAY_PREMIUM = 1.5;
export const SIXTH_DAY_BUDGET_FLOOR = 6_300_000;
/** A day's pay against the usual, for a holiday and a sixth day. */
export const dayPremium = (holiday: boolean, sixth: boolean): number => Math.max(holiday ? HOLIDAY_PREMIUM : 1, sixth ? SIXTH_DAY_PREMIUM : 1);
/**
 * A night shoot day's pay for everyone on set: a quarter more (game calibration, from November 14, 2026). Until then a
 * night day cost what a day did, though the Time Of Day control was said to set its fees; the feature proofs found it
 * didn't (docs/v10/proof/scene-night.json). It stacks with the holiday premium.
 */
export const NIGHT_PREMIUM = 1.25;
/** A background performer for a day (game calibration). */
export const CROWD_DAY_RATE = 180;

export const MATERIAL_COST: Record<string, number> = {
  'prep:design': 900, 'prep:costume': 600, 'prep:creature': 4000, 'sm:armature': 900, 'sm:puppet': 1500, 'sm:faces': 1200, 'sm:costume': 300, 'sm:sets': 2500,
  'doc:archive': 2500, 'post:clearance': 8000, 'anim:modeling': 0, 'prep:locations': 500,
};
/** A stop-motion puppet's face (the v4 package, 02; ledger V4-014.02). Replacement faces are sculpted or printed as a
 *  set and swapped between frames: build days for the set, its materials, and quicker animating. A mechanical head moves
 *  by a mechanism inside: more armature days and slower animating. Game calibration, not studio data. */
export const FACE_METHODS = {
  replacement: { label: 'Replacement Faces', faceDays: 4, perScene: 0.5, armatureDays: 0, pace: 0.9 },
  mechanical: { label: 'Mechanical Head', faceDays: 0, perScene: 0, armatureDays: 3, pace: 1.15 },
} as const;
export const LOCATION_FEE_PER_DAY = 1200;
export const EQUIPMENT_PER_DAY = 1500;
/** Location and equipment costs scale with the production's scale (simulation assumption): micro shoots use borrowed gear and free locations. */
export const DAY_COST_SCALE: Record<string, number> = { micro: 0.3, low: 1, mid: 2, commissioned: 3 };
/** The rental house's equipment package for a day, by budget size. */
export const housePackageFee = (p: Project): number => Math.round(EQUIPMENT_PER_DAY * (DAY_COST_SCALE[p.funding.scenarioId] ?? 1));
/** A day's location fee, and its equipment: the house package, or, with a kit of your own (equipment.ts), only what it
 *  rents. Owned and lent items cost nothing to use. */
export function dayFees(p: Project): { location: number; equipment: number } {
  const k = DAY_COST_SCALE[p.funding.scenarioId] ?? 1;
  return { location: Math.round(LOCATION_FEE_PER_DAY * k), equipment: p.kit ? p.kit.items.reduce((a, x) => a + x.dayRate, 0) : housePackageFee(p) };
}
export const VOICE_SESSION_STUDIO = 400;
/** Capture stage, suits and solving per session (simulation assumption). */
/** Share of keyframe work left when a shot uses captured performance (simulation assumption). */
export const MOCAP_ANIMATION_FACTOR = 0.6;

