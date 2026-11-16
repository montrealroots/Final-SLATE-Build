// Throughput rates, fees and premiums for production (simulation assumptions, docs/ASSUMPTIONS.md).
// Part of the production engine; src/engine/production.ts is its public interface.

import type { Project } from '../types';
import { performerMinimum } from '../union';

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
/**
 * A render node for a day: within what GPU render nodes are reported to cost, $0.90 to $3.50 an hour (Super Renders
 * Farm, Cloud Render Farm Pricing Explained 2026), and an AWS g5.xlarge on demand, about $1.01 an hour ($24 a day).
 */
export const RENDER_NODE_DAY_COST = 35;
/** Live-action screen minutes captured per shoot day before complexity adjustments. */
export const BASE_MINUTES_PER_SHOOT_DAY = 4;
/**
 * A holiday worked: double time, as a studio holiday is paid for its first twelve hours under IATSE's West Coast
 * agreements (Wrapbook rate finder: "Holiday worked (studio) 0-12: 2X"). Time and a half until November 15, 2026.
 */
export const HOLIDAY_PREMIUM = 2;
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
 * A night shoot day's pay for everyone on set: a fifth more, as IATSE agreements pay a call between 8pm and 4am at 120%
 * (Wrapbook rate finder). From November 14, 2026 a quarter more; until then a night day cost what a day did, though the
 * Time Of Day control was said to set its fees; the feature proofs found it didn't (docs/v10/proof/scene-night.json).
 * It stacks with the holiday premium.
 */
export const NIGHT_PREMIUM = 1.2;
/**
 * A non-union background performer's day: eight hours at California's minimum wage, by the date it applies from ($16.90
 * from January 1, 2026; $17.40 from January 1, 2027; California Department of Industrial Relations). Until November 15,
 * 2026 every background performer cost $180 a day, below the $231 SAG-AFTRA background minimum the game itself holds.
 */
export const MINIMUM_WAGE: [string, number][] = [['2025-01-01', 16.5], ['2026-01-01', 16.9], ['2027-01-01', 17.4]];
export const BACKGROUND_HOURS = 8;
/**
 * A background performer's day on this project on this date: the SAG-AFTRA background minimum under the full theatrical
 * agreement (a budget of $2 million or more, union.ts), and below it, where the low-budget agreements leave background
 * work to the producer, a non-union day at minimum wage.
 */
export function crowdDayRate(p: Project, date: string): number {
  const union = performerMinimum('background', Math.max(p.finance?.target ?? 0, p.funding.fund), date);
  if (union) return union.amount;
  const wage = [...MINIMUM_WAGE].reverse().find(([from]) => from <= date)?.[1] ?? MINIMUM_WAGE[0][1];
  return Math.round(wage * BACKGROUND_HOURS);
}

export const MATERIAL_COST: Record<string, number> = {
  'prep:design': 900, 'prep:costume': 600, 'prep:creature': 4000, 'sm:armature': 900, 'sm:puppet': 1500, 'sm:faces': 1200, 'sm:costume': 300, 'sm:sets': 2500,
  'doc:archive': 2500, 'post:clearance': 8000, 'anim:modeling': 0,
};
/**
 * Location permits, at the City of Los Angeles' rates through FilmLA (Basic Fees List): a permit, $931, covers up to five
 * locations over seven days, with the fire department's spot check, $285, on each; and the neighbours of each location are
 * notified, $232 (charged a base radius, which the game takes as a location). Until November 16, 2026 $500 a location,
 * the game's own figure.
 */
export const LOCATION_PERMIT = { application: 931, spotCheck: 285, locationsPerPermit: 5, notification: 232 } as const;
export const locationPermitCost = (locations: number): number =>
  Math.ceil(locations / LOCATION_PERMIT.locationsPerPermit) * (LOCATION_PERMIT.application + LOCATION_PERMIT.spotCheck) + locations * LOCATION_PERMIT.notification;
/** A stop-motion puppet's face (the v4 package, 02; ledger V4-014.02). Replacement faces are sculpted or printed as a
 *  set and swapped between frames: build days for the set, its materials, and quicker animating. A mechanical head moves
 *  by a mechanism inside: more armature days and slower animating. Game calibration, not studio data. */
export const FACE_METHODS = {
  replacement: { label: 'Replacement Faces', faceDays: 4, perScene: 0.5, armatureDays: 0, pace: 0.9 },
  mechanical: { label: 'Mechanical Head', faceDays: 0, perScene: 0, armatureDays: 3, pace: 1.15 },
} as const;
/**
 * A location's fee for a shooting day, by the production's size. Until November 15, 2026 it was $1,200 scaled by the
 * size (0.3, 1, 2, 3 times). Reported: "Shoot Days: $500 - $5,000 per day (12-14-hours)" (Visit Tulsa, Filming On Your
 * Property), and in Los Angeles an average "minimum of $5,000 to $6,000 per day" (Giggster, Rent Your House For Filming):
 * a micro budget's lowest, a commissioned production's Los Angeles average. Before a kind of site's own share (destinations.ts).
 */
export const LOCATION_FEE: Record<string, number> = { micro: 500, low: 1_500, mid: 3_500, commissioned: 5_000 };
export const LOCATION_FEE_PER_DAY = LOCATION_FEE.low;
/**
 * The rental house's camera, grip and lighting package for a day, at the low budget: a 3-ton grip and electric truck
 * with lights at $1,095 a day (KitSplit, Van Nuys) and a cinema camera kit at about $435 a day on a weekly rental
 * (Lensrentals, ARRI ALEXA Mini LF Premium Kit, $3,037 for seven days).
 */
export const EQUIPMENT_PER_DAY = 1500;
/**
 * The equipment package by the production's size: a 1-ton truck is $400 a day (Cinevo, Phoenix), a 5-ton base package
 * $1,500 (Camera Ambassador, Chicago), each with a camera package beside it.
 */
export const DAY_COST_SCALE: Record<string, number> = { micro: 0.3, low: 1, mid: 2, commissioned: 3 };
/** The rental house's equipment package for a day, by budget size. */
export const housePackageFee = (p: Project): number => Math.round(EQUIPMENT_PER_DAY * (DAY_COST_SCALE[p.funding.scenarioId] ?? 1));
/** A day's location fee, and its equipment: the house package, or, with a kit of your own (equipment.ts), only what it
 *  rents. Owned and lent items cost nothing to use. */
export function dayFees(p: Project): { location: number; equipment: number } {
  return { location: LOCATION_FEE[p.funding.scenarioId] ?? LOCATION_FEE_PER_DAY, equipment: p.kit ? p.kit.items.reduce((a, x) => a + x.dayRate, 0) : housePackageFee(p) };
}
/**
 * A day in a recording studio for a voice session. Until November 15, 2026, $400. Los Angeles rooms are listed at about
 * $100 to $400 an hour, and C&I Studios' full day "starts at $1,200" (C&I Studios, Downtown Los Angeles).
 */
export const VOICE_SESSION_STUDIO = 1_200;
/** Capture stage, suits and solving per session (simulation assumption). */
/** Share of keyframe work left when a shot uses captured performance (simulation assumption). */
export const MOCAP_ANIMATION_FACTOR = 0.6;

