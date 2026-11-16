// What a real person asks a day, from their recognition (recognition.ts) and the minimums performers are owed (union.ts).
// A performer asks their fee for a film over a lead's days, and never less than the SAG-AFTRA minimum of the agreement
// the production works under; a crew member asks the job's rate for their experience, raised by their recognition, up to
// five times it. The curve and the raise are the game's (Modeled assumption, docs/people/PAY.md).
import { role } from './people';
import { performerFee, LEAD_DAYS } from './recognition';
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
 * A recognised director's fee for a feature: $500,000 × (1 + weight ÷ 4)^1.4, at most $20 million. Until November 15,
 * 2026 a director asked a crew member's rate, so Steven Spielberg directed a feature for about $250,000. Reported: "the
 * average director salary for a studio film is in the $750,000 to $1.5 million range, depending on the number of past
 * credits" (The Hollywood Reporter, Hollywood Salaries 2016), and Ridley Scott "got $10 million to $12 million upfront
 * for Alien: Covenant" (The Hollywood Reporter, 2017). The curve is the game's: Modeled assumption.
 */
export const directFeeFrom = (points: number): number => Math.min(20_000_000, Math.round(500_000 * (1 + points / 4) ** 1.4 / 1000) * 1000);
/** The shoot days a director's fee is asked over: a feature's (hiring.ts estimateDays pays a director for each shoot day). */
export const DIRECT_DAYS = 40;
/**
 * A recognised screenwriter's fee for a feature's script: $150,000 × (1 + weight ÷ 4)^1.2, at most $5 million. Until
 * November 15, 2026 Aaron Sorkin wrote a feature's draft for about $70,000. The WGA's minimum for an original screenplay
 * with treatment on a film of $5 million or more is $173,215 (2026 Schedule of Minimums, May 2, 2026 to May 1, 2027);
 * "established movie scribes can make $1 million a script" (The Hollywood Reporter); the highest reported, "$3 million
 * against $5 million" for Déjà Vu. The curve is the game's: Modeled assumption.
 */
export const scriptFeeFrom = (points: number): number => Math.min(5_000_000, Math.round(150_000 * (1 + points / 4) ** 1.2 / 1000) * 1000);
/** The days a feature's draft takes (writing-jobs.ts: four minutes of script a day, a 100-minute feature). */
export const SCRIPT_DAYS = 25;
/** The jobs a recognised person asks a fee for the work in, and the fee and days it is asked over. */
const FEE_JOBS: Record<string, [(points: number) => number, number]> = {
  composer: [(x) => scoreFeeFrom(x), SCORE_DAYS], songwriter: [(x) => songFeeFrom(x), SONG_DAYS], 'episode-director': [(x) => directFeeFrom(x), DIRECT_DAYS],
  'co-writer': [(x) => scriptFeeFrom(x), SCRIPT_DAYS], 'episode-writer': [(x) => scriptFeeFrom(x), SCRIPT_DAYS],
};

/**
 * A crew member's day rate from the job, their experience (1 to 5) and the weight of their recognition. A recognised
 * composer, songwriter, director or writer asks the fee for the work over the days it takes (FEE_JOBS), if that is more.
 */
export function crewAskFrom(job: string, experience: number, points: number): number {
  const crew = Math.round((role(job).rate * (0.62 + experience * 0.2) * (1 + Math.min(CREW_RAISE_CEILING, points / 10))) / 10) * 10;
  const asks = FEE_JOBS[job];
  return points > 0 && asks ? Math.max(crew, Math.round(asks[0](points) / asks[1] / 10) * 10) : crew;
}

/** A performer's day rate from their recognition and fame, at least the SAG-AFTRA minimum for this budget on this date. */
export function performerAskFrom(roleId: string, points: number, budget: number, date: string, editions = 0): number {
  const fee = Math.round(performerFee(points, editions) / LEAD_DAYS / 10) * 10;
  return Math.max(fee, performerMinimum(roleId, budget, date)?.amount ?? 0);
}
