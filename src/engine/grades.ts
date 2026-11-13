// A grade for everyone the player can hire (the owner's goal: "engines and systems behind all people creating grades for
// them that will determine their skill level and price to cast them"; November 13, 2026).
//
// A grade is a reading of what already decides how good someone is and what they ask: their experience in the job (1 to
// 5) and their capability (0 to 100), which their day rate was made from (people.ts, guests.ts). It is shown with what
// it is made of, so it is never a number the game typed:
// - for someone from the film or music catalog, experience is their recorded credits in the job (a count and the years),
//   a fact about their record, not a judgement of them; their capability is the game's, drawn around that, and said so;
// - for the game's own people, both are modeled, and said so;
// - for anyone, how their work with you went (relationships.ts) is listed beside it, and doesn't move the grade.
// Calibration: a score of capability, plus six points a level of experience, read A from 80, B from 68, C from 56, D from 44.
import { isReal, realPerson } from './guests';
import { historyWith } from './relationships';
import type { Person } from './people';
import type { GameState } from './types';

export type Grade = 'A' | 'B' | 'C' | 'D' | 'E';
export const GRADE_BANDS: [Grade, number][] = [['A', 80], ['B', 68], ['C', 56], ['D', 44], ['E', -Infinity]];
export const gradeScore = (experience: number, capability: number): number => Math.round(capability * 0.7 + experience * 6);
export const gradeFrom = (score: number): Grade => GRADE_BANDS.find(([, min]) => score >= min)![0];

export interface GradeReading { grade: Grade; score: number; madeOf: string[]; rate: string }

/** A person's grade for a job, and what it is made of, in words. */
export function gradeOf(state: GameState, c: Person, job: string): GradeReading {
  const score = gradeScore(c.experience, c.capability);
  const madeOf: string[] = [];
  const ev = isReal(c.id) ? realPerson(state, c.id)?.rec?.ev[job] : undefined;
  if (isReal(c.id)) {
    madeOf.push(ev ? `Experience ${c.experience} of 5, from their record: ${ev.n} recorded ${ev.n === 1 ? 'credit' : 'credits'} in the job${ev.first ? `, ${ev.first}${ev.last && ev.last !== ev.first ? ` to ${ev.last}` : ''}` : ''}.` : `Experience ${c.experience} of 5: nothing recorded in this job, so counted as new to it.`);
    madeOf.push(`Capability ${c.capability} of 100, drawn by the game around that record for this story: simulated, not a measure of them.`);
  } else {
    madeOf.push(`Experience ${c.experience} of 5 and capability ${c.capability} of 100, both modeled by the game.`);
  }
  const worked = historyWith(state, c.id);
  if (worked.length) madeOf.push(`With you: ${worked.map((h) => `${h.role} on ${h.title} (${h.kind === 'completed' ? 'saw it through' : h.kind === 'let-go' ? 'let go' : 'turned down after asking for more'})`).join('; ')}. It doesn't move the grade.`);
  return { grade: gradeFrom(score), score, madeOf, rate: `Their asking rate was set from the same experience and capability.` };
}
