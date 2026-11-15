// What a real person asks a day, from their recognition (recognition.ts) and the minimums performers are owed (union.ts).
// A performer asks their fee for a film over a lead's days, and never less than the SAG-AFTRA minimum of the agreement
// the production works under; a crew member asks the job's rate for their experience, raised by their recognition, up to
// five times it. The curve and the raise are the game's (Modeled assumption, docs/people/PAY.md).
import { role } from './people';
import { filmFeeFrom, LEAD_DAYS } from './recognition';
import { performerMinimum } from './union';

/** The most recognition raises a crew member's rate: five times what their experience alone would ask. */
export const CREW_RAISE_CEILING = 4;

/**
 * A recognised composer's fee for a feature's score: $40,000 × (1 + weight ÷ 4)^1.4, at most $3 million. Until November
 * 15, 2026 a composer asked a crew member's rate, at most five times the job's, so Hans Zimmer's whole score came to
 * about $100,000. Reported fees run "from $20,000 for a lower-budget film to in excess of $1,000,000 for a big budget
 * studio release using the services of a well known composer" (Jeffrey and Todd Brabec, "Film Composing Fees",
 * taxi.com/music-business-faq/ftv/film-composing-fees); at Zimmer's weight (65, two Academy Award wins and ten
 * nominations) the curve asks about $2.2 million. The curve is the game's: Modeled assumption.
 */
export const scoreFeeFrom = (points: number): number => Math.min(3_000_000, Math.round(40_000 * (1 + points / 4) ** 1.4 / 1000) * 1000);
/** The composer days a fully scored feature's score takes (production/tasks.ts: a day for four minutes, with themes, spotting and stems). */
export const SCORE_DAYS = 30;
/**
 * A recognised songwriter's fee for writing a song for a film: $12,000 × (1 + weight ÷ 4)^1.3, at most $400,000. Until
 * November 15, 2026 Elton John wrote a film's song for about $12,600. Film songwriting fees run "from zero to $100,000-plus
 * for established writers, with occasional deals even higher" (Donald Passman, All You Need to Know About the Music
 * Business, 11th edition); at Elton John's weight (29) the curve asks about $190,000, at Adele's (17) about $100,000.
 * The curve is the game's: Modeled assumption.
 */
export const songFeeFrom = (points: number): number => Math.min(400_000, Math.round(12_000 * (1 + points / 4) ** 1.3 / 1000) * 1000);
/** The songwriter days a song takes (songs.ts: Write The Song). */
export const SONG_DAYS = 4;

/**
 * A crew member's day rate from the job, their experience (1 to 5) and the weight of their recognition. A recognised
 * composer asks their score's fee over a feature's score days, and a recognised songwriter their song's fee over a song's
 * days, if that is more.
 */
export function crewAskFrom(job: string, experience: number, points: number): number {
  const crew = Math.round((role(job).rate * (0.62 + experience * 0.2) * (1 + Math.min(CREW_RAISE_CEILING, points / 10))) / 10) * 10;
  const fee = !points ? 0 : job === 'composer' ? scoreFeeFrom(points) / SCORE_DAYS : job === 'songwriter' ? songFeeFrom(points) / SONG_DAYS : 0;
  return Math.max(crew, Math.round(fee / 10) * 10);
}

/** A performer's day rate from their recognition, at least the SAG-AFTRA minimum for this budget on this date. */
export function performerAskFrom(roleId: string, points: number, budget: number, date: string): number {
  const fee = Math.round(filmFeeFrom(points) / LEAD_DAYS / 10) * 10;
  return Math.max(fee, performerMinimum(roleId, budget, date)?.amount ?? 0);
}
