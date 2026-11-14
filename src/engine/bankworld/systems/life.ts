// The adapter for 1221's systems/life.ts `startRefusal` (ported November 14, 2026). In 1221 it refused an errand in
// person from a hospital bed, while a booked hour ran, or with a commitment starting inside the errand's time. SLATE's
// day is its own (busy blocks, journeys, a shoot), so the game installs the check (`setStartRefusal`) and banking asks
// it: a branch visit is refused for the reason the game gives. With none installed nothing is refused.
import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';

type Refusal = (sim: Simulation, person: Person, minutes: number, inPerson: boolean) => string | undefined;
let check: Refusal | undefined;

export function setStartRefusal(fn: Refusal | undefined): void {
  check = fn;
}

export function startRefusal(sim: Simulation, person: Person, minutes: number, inPerson = false): string | undefined {
  return check?.(sim, person, minutes, inPerson);
}
