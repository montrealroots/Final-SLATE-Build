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

export const MATERIAL_COST: Record<string, number> = {
  'prep:design': 900, 'prep:costume': 600, 'prep:creature': 4000, 'sm:armature': 900, 'sm:puppet': 1500, 'sm:costume': 300, 'sm:sets': 2500,
  'doc:archive': 2500, 'post:clearance': 8000, 'anim:modeling': 0, 'prep:locations': 500,
};
export const LOCATION_FEE_PER_DAY = 1200;
export const EQUIPMENT_PER_DAY = 1500;
/** Location and equipment costs scale with the production's scale (simulation assumption): micro shoots use borrowed gear and free locations. */
export const DAY_COST_SCALE: Record<string, number> = { micro: 0.3, low: 1, mid: 2, commissioned: 3 };
export function dayFees(p: Project): { location: number; equipment: number } {
  const k = DAY_COST_SCALE[p.funding.scenarioId] ?? 1;
  return { location: Math.round(LOCATION_FEE_PER_DAY * k), equipment: Math.round(EQUIPMENT_PER_DAY * k) };
}
export const VOICE_SESSION_STUDIO = 400;
/** Capture stage, suits and solving per session (simulation assumption). */
/** Share of keyframe work left when a shot uses captured performance (simulation assumption). */
export const MOCAP_ANIMATION_FACTOR = 0.6;

