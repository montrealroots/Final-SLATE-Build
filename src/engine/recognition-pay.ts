// What a real person asks a day, from their recognition (recognition.ts) and the minimums performers are owed (union.ts).
// A performer asks their fee for a film over a lead's days, and never less than the SAG-AFTRA minimum of the agreement
// the production works under; a crew member asks the job's rate for their experience, raised by their recognition, up to
// five times it. The curve and the raise are the game's (Modeled assumption, docs/people/PAY.md).
import { role } from './people';
import { filmFeeFrom, LEAD_DAYS } from './recognition';
import { performerMinimum } from './union';

/** The most recognition raises a crew member's rate: five times what their experience alone would ask. */
export const CREW_RAISE_CEILING = 4;

/** A crew member's day rate from the job, their experience (1 to 5) and the weight of their recognition. */
export function crewAskFrom(job: string, experience: number, points: number): number {
  return Math.round((role(job).rate * (0.62 + experience * 0.2) * (1 + Math.min(CREW_RAISE_CEILING, points / 10))) / 10) * 10;
}

/** A performer's day rate from their recognition, at least the SAG-AFTRA minimum for this budget on this date. */
export function performerAskFrom(roleId: string, points: number, budget: number, date: string): number {
  const fee = Math.round(filmFeeFrom(points) / LEAD_DAYS / 10) * 10;
  return Math.max(fee, performerMinimum(roleId, budget, date)?.amount ?? 0);
}
