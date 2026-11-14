/**
 * SLATE — Seeded deterministic randomness.
 *
 * LAW: no truth-critical system may call Math.random(). Every roll is drawn
 * from a named stream derived from (saveSeed, streamName, ...keys) so that:
 *   - the same situation always produces the same roll;
 *   - a roll can be re-derived later for the "Why did this happen?" audit;
 *   - two unrelated systems never disturb each other's sequences.
 */

import { hash32 } from './ids';

export interface Rng {
  /** Uniform float in [0, 1). */
  next(): number;
  /** Uniform integer in [minInclusive, maxInclusive]. */
  int(minInclusive: number, maxInclusive: number): number;
  /** Uniform float in [min, max). */
  float(min: number, max: number): number;
  /** True with the given probability (0..1). */
  chance(probability: number): boolean;
  /** Uniformly picks one element. Throws on an empty list. */
  pick<T>(items: readonly T[]): T;
  /** Picks by weight. Weights must be non-negative and not all zero. */
  weighted<T>(items: readonly T[], weight: (item: T) => number): T;
  /** Returns a shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** Approximately normal via sum of 3 uniforms, clamped to +/- 3 sigma. */
  normal(mean: number, stdDev: number): number;
  /** Number of draws taken so far, which is what makes a stream replayable. */
  readonly draws: number;
}

/** mulberry32: small, fast, statistically fine for gameplay. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seedInput: string | number): Rng {
  const seed = typeof seedInput === 'number' ? seedInput >>> 0 : hash32(seedInput);
  const raw = mulberry32(seed === 0 ? 0x9e3779b9 : seed);
  let draws = 0;

  const rng: Rng = {
    next() {
      draws++;
      return raw();
    },
    int(minInclusive, maxInclusive) {
      if (maxInclusive < minInclusive) return minInclusive;
      return minInclusive + Math.floor(rng.next() * (maxInclusive - minInclusive + 1));
    },
    float(min, max) {
      return min + rng.next() * (max - min);
    },
    chance(probability) {
      if (probability <= 0) return false;
      if (probability >= 1) return true;
      return rng.next() < probability;
    },
    pick<T>(items: readonly T[]): T {
      if (items.length === 0) throw new Error('rng.pick called with an empty list');
      return items[rng.int(0, items.length - 1)] as T;
    },
    weighted<T>(items: readonly T[], weight: (item: T) => number): T {
      if (items.length === 0) throw new Error('rng.weighted called with an empty list');
      let total = 0;
      const weights: number[] = [];
      for (const it of items) {
        const w = Math.max(0, weight(it));
        weights.push(w);
        total += w;
      }
      if (total <= 0) return rng.pick(items);
      let roll = rng.next() * total;
      for (let i = 0; i < items.length; i++) {
        roll -= weights[i] as number;
        if (roll <= 0) return items[i] as T;
      }
      return items[items.length - 1] as T;
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = items.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        const a = copy[i] as T;
        copy[i] = copy[j] as T;
        copy[j] = a;
      }
      return copy;
    },
    normal(mean, stdDev) {
      const u = rng.next() + rng.next() + rng.next();
      const z = (u - 1.5) * 2; // roughly unit-ish; clamp below keeps tails sane
      return mean + Math.max(-3, Math.min(3, z)) * stdDev;
    },
    get draws() {
      return draws;
    },
  };
  return rng;
}

/**
 * Derives a named stream. Keys are joined so that, for example, a classmate's
 * reliability for a given person and place in the class is always the same draw.
 */
export function rngFor(saveSeed: string, stream: string, ...keys: (string | number)[]): Rng {
  // A key holding the separator is escaped (from 2026-10-12), so ['a|b'] and ['a', 'b'] can't draw the same: no key holds
  // one today, and every draw keyed without one is as it was.
  return makeRng(`${saveSeed}|${stream}|${keys.map((k) => String(k).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')).join('|')}`);
}

/** Clamp helper used pervasively by scoring systems. */
export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

/** Linear interpolation. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/** Maps a value from one range onto another, clamped. */
export function remap(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (inMax === inMin) return outMin;
  return lerp(outMin, outMax, (value - inMin) / (inMax - inMin));
}
