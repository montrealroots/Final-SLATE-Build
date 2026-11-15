// How the industry has judged real people (recognition.ts), and what SAG-AFTRA says a performer is paid at least (union.ts).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyRecognition, capabilityFrom, describeStanding, filmFeeFrom, recognisedIn, standingOf, FEE_CEILING } from '../src/engine/recognition';
import { crewAskFrom, scoreFeeFrom, songFeeFrom, SCORE_DAYS, SONG_DAYS } from '../src/engine/recognition-pay';
import { agreementFor, performerMinimum } from '../src/engine/union';
import { gradeFrom, gradeScore } from '../src/engine/grades';

applyRecognition(JSON.parse(readFileSync('src/data/recognition.json', 'utf8')));

describe("the industry's record of a person's work", () => {
  it('reads wins and nominations by job, a win and its nomination once', () => {
    // Leonardo DiCaprio (TMDB 6193): his Academy Award win (2016) is one win, not a win and a nomination.
    const s = standingOf(6193, 'actor', 2026)!;
    expect(s.wins.oscar).toBe(1);
    expect(s.nominations.oscar).toBeGreaterThanOrEqual(4);
    expect(describeStanding(s)).toMatch(/^An Academy Award win, .*Academy Award nominations/);
    expect(standingOf(6193, 'hair-makeup', 2026)).toBeNull(); // recognised as a performer, not for makeup
  });

  it('knows nothing the story has not reached', () => {
    const now = standingOf(6193, 'actor', 2026)!;
    const before = standingOf(6193, 'actor', 2016)!; // his win was recorded for 2016
    expect(before.wins.oscar).toBeUndefined();
    expect(before.points).toBeLessThan(now.points);
    expect(standingOf(6193, 'actor', 1990)).toBeNull();
  });

  it('grades the most recognised A and the unrecognised by experience alone', () => {
    const streep = standingOf(5064, 'actor', 2026)!; // Meryl Streep
    expect(gradeFrom(gradeScore(5, capabilityFrom(5, streep.points)))).toBe('A');
    expect(gradeFrom(gradeScore(5, capabilityFrom(5, 0)))).toBe('B'); // forty credits, no recognition
    expect(gradeFrom(gradeScore(3, capabilityFrom(3, 0)))).toBe('D');
    expect(gradeFrom(gradeScore(1, capabilityFrom(1, 0)))).toBe('E');
    // One Academy Award nomination lifts a seasoned performer from C to B.
    expect(gradeFrom(gradeScore(4, capabilityFrom(4, 0)))).toBe('C');
    expect(gradeFrom(gradeScore(4, capabilityFrom(4, 4)))).toBe('B');
  });

  it('prices a film by recognition, up to the highest reported fees', () => {
    expect(filmFeeFrom(0)).toBe(250_000);
    expect(filmFeeFrom(standingOf(5064, 'actor', 2026)!.points)).toBe(FEE_CEILING); // Meryl Streep
    expect(filmFeeFrom(standingOf(6193, 'actor', 2026)!.points)).toBeGreaterThan(20_000_000); // DiCaprio: $30 million reported
    const robbie = filmFeeFrom(standingOf(234352, 'actor', 2026)!.points);
    expect(robbie).toBeGreaterThan(2_000_000);
    expect(robbie).toBeLessThan(12_500_000); // her reported Barbie fee: recognition is not the whole of a star's price
  });

  it('lists makeup artists and costume designers the industry has recognised, the most first', () => {
    const makeup = recognisedIn('hair-makeup', 2026);
    const costume = recognisedIn('costume-designer', 2026);
    expect(makeup.length).toBeGreaterThan(100);
    expect(costume.length).toBeGreaterThan(100);
    expect(makeup[0].standing.points).toBeGreaterThanOrEqual(makeup[50].standing.points);
    expect(costume.some((x) => x.name === 'Colleen Atwood')).toBe(true);
  });
});

describe("SAG-AFTRA's minimums", () => {
  it('follow the budget: Ultra Low to $300,000, Moderate Low to $700,000, Low under $2 million', () => {
    expect(agreementFor(250_000)).toBe('ultra-low');
    expect(agreementFor(300_000)).toBe('ultra-low');
    expect(agreementFor(500_000)).toBe('moderate-low');
    expect(agreementFor(1_500_000)).toBe('low');
    expect(agreementFor(2_000_000)).toBe('theatrical');
  });

  it('are the wage table’s, raised each July 1', () => {
    expect(performerMinimum('actor', 10_000_000, '2026-01-05')).toEqual({ amount: 1246, agreement: 'theatrical' });
    expect(performerMinimum('actor', 10_000_000, '2026-07-01')).toEqual({ amount: 1283, agreement: 'theatrical' });
    expect(performerMinimum('actor', 1_000_000, '2027-08-01')).toEqual({ amount: 859, agreement: 'low' });
    expect(performerMinimum('actor', 100_000, '2026-07-01')).toEqual({ amount: 257, agreement: 'ultra-low' });
    expect(performerMinimum('background', 10_000_000, '2026-01-05')).toEqual({ amount: 224, agreement: 'theatrical' });
    expect(performerMinimum('background', 100_000, '2026-01-05')).toBeNull();
    expect(performerMinimum('gaffer', 10_000_000, '2026-01-05')).toBeNull();
  });
});

describe('a composer\'s fee', () => {
  // Until November 15, 2026 a composer asked a crew rate, so Hans Zimmer's whole score came to about $100,000.
  it('a recognised composer asks their score\'s fee over a feature\'s score days; one with no recognition, a crew rate', () => {
    const zimmer = standingOf(947, 'composer', 2026)!.points;
    expect(scoreFeeFrom(zimmer)).toBeGreaterThan(1_500_000); // "in excess of $1,000,000" for a well-known composer
    expect(scoreFeeFrom(zimmer)).toBeLessThanOrEqual(3_000_000);
    expect(crewAskFrom('composer', 5, zimmer) * SCORE_DAYS).toBeGreaterThan(1_500_000);
    expect(crewAskFrom('composer', 5, 0)).toBe(crewAskFrom('editor', 5, 0)); // both jobs are $600 a day before experience
    // Recognition raises other crew no further than five times their rate.
    expect(crewAskFrom('editor', 5, zimmer)).toBe(crewAskFrom('editor', 5, 1000));
  });
});

describe('a songwriter\'s fee', () => {
  // Until November 15, 2026 Elton John wrote a film's song for about $12,600.
  it('a recognised songwriter asks their song\'s fee over a song\'s days', () => {
    const elton = standingOf(11370, 'songwriter', 2026)!.points;
    expect(songFeeFrom(elton) ).toBeGreaterThan(100_000); // "$100,000-plus for established writers"
    expect(crewAskFrom('songwriter', 5, elton) * SONG_DAYS).toBeGreaterThan(100_000);
    expect(crewAskFrom('songwriter', 5, 0)).toBe(810); // $500 a day at the most experience, with nothing recognised
  });
});
