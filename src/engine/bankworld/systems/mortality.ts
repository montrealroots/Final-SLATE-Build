// 1221's systems/mortality.ts gives banking one thing, `ageOn`, ported word for word (1221 at d6eba5d; ported November
// 14, 2026). The rest of that file, the end of a life and the body's limits, belongs to a life simulation SLATE doesn't
// run.
import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import { zonedParts, type Instant } from '../core/time';

/** Whole years between their birth and an instant, as a birthday counts them. */
export function ageOn(sim: Simulation, person: Person, at: Instant): number {
  const born = zonedParts(person.birthInstant, sim.homeZone);
  const then = zonedParts(at, sim.homeZone);
  // Born on 29 February, the birthday is the 28th in a year without one, as the birthday itself is kept.
  const leap = (then.year % 4 === 0 && then.year % 100 !== 0) || then.year % 400 === 0;
  const day = born.month === 2 && born.day === 29 && !leap ? 28 : born.day;
  const had = then.month > born.month || (then.month === born.month && then.day >= day);
  return then.year - born.year - (had ? 0 : 1);
}
