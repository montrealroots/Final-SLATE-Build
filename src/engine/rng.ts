// Reproducible, domain-separated random streams. The simulation seed and any
// presentation (wording) variation use different domains so one never shifts the other.

export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A stream keyed by the world seed plus a domain path, e.g. stream(seed, 'weather', placeId, 2026). */
export function stream(seed: number | string, ...keys: (string | number)[]): Rng {
  return mulberry32(hashString(`${seed}|${keys.join('|')}`));
}

/** One deterministic value in [0,1) for a key, without keeping a stream. */
export function unit(seed: number | string, ...keys: (string | number)[]): number {
  return stream(seed, ...keys)();
}

export function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length) % list.length];
}

export function intBetween(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/** Approximately normal value using the sum of uniforms (Irwin–Hall, n=6). */
export function gaussian(rng: Rng, mean = 0, sd = 1): number {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rng();
  return mean + (s - 3) * sd * Math.SQRT2;
}

let idCounter = 0;
/** Stable, readable IDs: prefix plus a monotonic counter persisted in state by callers. */
export function makeId(prefix: string, n: number): string {
  return `${prefix}_${n.toString(36)}`;
}
export function nextLocalId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}${idCounter.toString(36)}`;
}
