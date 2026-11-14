// The adapter for 1221's systems/health.ts `present` (ported November 14, 2026): whether a person can be at an
// appointment. 1221 asked that they be awake, out of hospital, not laid up and in the city. SLATE models no hospital or
// injury, so present means awake and in the city, the two 1221 checks the game can answer.
import type { Person } from '../domain/model';
import type { Instant } from '../core/time';

/** 1221's health record. SLATE keeps none; the type stays so a 1221 person reads unchanged. */
export type HealthRecord = Record<string, unknown>;

export function present(person: Person, when: Instant, cityId?: string): boolean {
  const asleep = person.awakeSince !== undefined && person.awakeSince > when;
  return !asleep && (cityId === undefined || person.currentLocationId === cityId);
}
