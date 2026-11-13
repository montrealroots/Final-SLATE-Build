// A grade for everyone the player can hire (src/engine/grades.ts; the owner's goals). A grade is a reading of the
// experience and capability that already set what someone asks, shown with what it is made of.
import { describe, expect, it } from 'vitest';
import { GRADE_BANDS, gradeFrom, gradeOf, gradeScore } from '../src/engine/grades';
import { asPerson, considerPerson } from '../src/engine/guests';
import { roleCandidates } from '../src/engine/hiring';
import { buildProject, startLife } from './helpers';

describe('a grade', () => {
  it('reads experience and capability into a letter, by fixed bands', () => {
    expect(GRADE_BANDS.map(([g]) => g)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect([gradeFrom(gradeScore(5, 90)), gradeFrom(gradeScore(3, 70)), gradeFrom(gradeScore(1, 40))]).toEqual(['A', 'C', 'E']);
    // More of either, never a lower grade.
    expect(gradeScore(4, 70)).toBeGreaterThan(gradeScore(3, 70));
    expect(gradeScore(3, 75)).toBeGreaterThan(gradeScore(3, 70));
  });

  it('follows what someone asks: across the game\'s own candidates, a higher grade asks more on average', () => {
    const s = startLife('grades-rate');
    const p = buildProject(s, { title: 'Grades', format: 'feature', medium: 'live-action', runtime: 90 }, [{ name: 'Ada' }], [{ place: 'Pier', chars: ['Ada'] }]);
    const people = roleCandidates(s, p, 'editor');
    const by = (g: string) => people.filter((c) => gradeOf(s, c, 'editor').grade === g).map((c) => c.dayRate);
    const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    const graded = ['A', 'B', 'C', 'D', 'E'].map(by).filter((xs) => xs.length);
    expect(graded.length).toBeGreaterThan(1);
    for (let i = 1; i < graded.length; i++) expect(avg(graded[i - 1])).toBeGreaterThan(avg(graded[i]));
    expect(gradeOf(s, people[0], 'editor').madeOf[0]).toMatch(/both modeled by the game\.$/);
  });

  it('for a real person, says their experience is their record and their capability the game\'s', () => {
    const s = startLife('grades-real');
    const real = considerPerson(s, { id: 947, name: 'A Composer (Fixture)', details: { birthday: '1957-09-12', deathday: null, retrievedAt: '2026-11-01' }, credits: Array.from({ length: 25 }, (_, i) => ({ kind: 'crew', role: 'Original Music Composer', date: i === 0 ? '1985-01-01' : i === 1 ? '2024-01-01' : null })) }, '2026-11-01');
    const r = gradeOf(s, asPerson(s, real.id, 'composer'), 'composer');
    expect(r.madeOf[0]).toBe('Experience 4 of 5, from their record: 25 recorded credits in the job, 1985 to 2024.');
    expect(r.madeOf[1]).toMatch(/drawn by the game around that record for this story: simulated, not a measure of them\.$/);
  });
});
