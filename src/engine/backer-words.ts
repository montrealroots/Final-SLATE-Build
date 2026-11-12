// How a backer is named in a sentence. A kind of backer ("Private Investor") reads "the private investor"; a company with
// a name of its own, such as a followed studio, keeps its name and takes no article. Until November 11, 2026 every
// backer was lowercased after "the", so a commission from a named studio read "the walt disney pictures".
import type { FinanceDeal } from './types';

/** The backers that are kinds, not names (finance.ts BACKERS, and the names older saves recorded). */
export const GENERIC_BACKERS: ReadonlySet<string> = new Set(['Starting Backing', 'Screen Arts Fund Grant', 'Private Investor', 'Co-Production Partner', 'Your Earnings', 'Your Unspent Money', 'Commissioner']);

export function theBacker(d: Pick<FinanceDeal, 'backer'>, capital = false): string {
  return GENERIC_BACKERS.has(d.backer) ? `${capital ? 'The' : 'the'} ${d.backer.toLowerCase()}` : d.backer;
}
