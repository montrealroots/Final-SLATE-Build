// 1221's systems/taxid.ts gives banking one thing, `hasSsn`, ported word for word (1221 at d6eba5d; ported November 14,
// 2026). Applying for a Social Security number went with 1221's student visa and its school, which SLATE doesn't have:
// a person holds one as a US citizen, or where a save records it issued.
import type { Person } from '../domain/model';
import { citizenOf } from './documents';

export function hasSsn(person: Person): boolean {
  return citizenOf(person, 'US') || person.ssn?.status === 'issued';
}
