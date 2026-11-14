// 1221's systems/residence.ts gives banking one thing, `residenceIn`, ported word for word (1221 at d6eba5d; ported
// November 14, 2026): the residence permission a person holds for a country on a day. Applying for residence routes
// (1221's green card and talent visas) isn't ported; a residence document reaches a person only through the papers.
import type { Person } from '../domain/model';
import type { Instant } from '../core/time';
import { documentsOf, inForce, type PersonDocument } from './documents';

/** The residence routes 1221 granted; a 1221 document may carry one. */
export type Route = 'global-talent' | 'uk-settled' | 'mx-temporary' | 'mx-permanent' | 'us-green-card';

export function residenceIn(person: Person, iso: string, at: Instant): PersonDocument | undefined {
  return documentsOf(person).find((d) => d.route !== undefined && d.destination === iso && inForce(d, at));
}
