// A simulated season's page (src/catalog/simseason.ts): its nights, its breaks, who returns and how old they are, and the
// decisions around it at the save's date. Made-up series; no TMDB data is in the repository.
import { describe, expect, it } from 'vitest';
import { ageOn, announcedSeason, breakLength, breaksOf, castFor, decisionsFor, nightsOf, usualDecision } from '../src/catalog/simseason';
import { simRoute } from '../src/catalog/world';
import type { SeriesProfile, SimSeries } from '../src/engine/industry';

const p: SeriesProfile = {
  r: 'tv:1', t: 'Harbour Lane', status: 'Returning Series', type: 'Scripted', net: ['ABC'], ci: [], genres: ['Comedy'], daily: 0, aired: 2,
  seasons: [{ n: 2, eps: 4, dated: 4, d0: '2025-10-01', d1: '2025-11-05', gap: 7, drop: 0 }],
  regulars: [
    { p: 1, name: 'Ada Quill', ch: 'Juno', born: '1980-04-02' },
    { p: 2, name: 'Wren Calder', ch: 'Old Tom', born: '1931-02-02', died: '2026-06-01' },
    { p: 3, name: 'Ivo Brandt', ch: null },
  ],
};
const sim: SimSeries = {
  closed: false,
  seasons: [{ n: 3, eps: 4, premiere: '2027-09-29', gap: 7, drop: false, final: false }, { n: 4, eps: 4, premiere: '2028-09-27', gap: 7, drop: false, final: true }],
  outcomes: [{ at: '2027-05-12', kind: 'renewed', n: 3 }, { at: '2028-05-17', kind: 'renewed', n: 4, final: true }, { at: '2028-10-18', kind: 'concluded', n: 4 }],
};

describe('a simulated season\'s page', () => {
  it('names the nights a season airs', () => {
    expect(nightsOf(['2028-09-27', '2028-10-04'])).toBe('Wednesdays');
    expect(nightsOf(['2028-09-25', '2028-09-26', '2028-09-27', '2028-09-28', '2028-09-29'])).toBe('Mondays to Fridays');
    expect(nightsOf(['2028-09-26', '2028-09-28'])).toBe('Tuesdays and Thursdays');
  });

  it('finds the breaks: a gap over half again the usual one, told in weeks or days', () => {
    const dates = ['2026-04-01', '2026-04-08', '2026-04-15', '2026-04-29', '2026-05-06', '2026-05-06'];
    expect(breaksOf(dates, 7)).toEqual([{ after: 3, from: '2026-04-15', to: '2026-04-29', days: 14 }]);
    expect(breaksOf(['2026-04-01', '2026-04-11'], 7)).toEqual([]); // ten days isn't over half again a week
    expect(breaksOf(['2026-04-01', '2026-04-12'], 7)).toEqual([{ after: 1, from: '2026-04-01', to: '2026-04-12', days: 11 }]);
    expect(breaksOf(['2026-04-01', '2026-04-01'], 0)).toEqual([]); // a season released at once has none
    expect([breakLength(14), breakLength(11)]).toEqual(['2 weeks', '11 days']);
  });

  it('gives an age at the premiere, turning on the birthday', () => {
    expect(ageOn('1980-04-02', '2027-04-01')).toBe(46);
    expect(ageOn('1980-04-02', '2027-04-02')).toBe(47);
    // A February 29 birthday is observed on February 28 in other years, as the player's own age is.
    expect(ageOn('1988-02-29', '2027-02-27')).toBe(38);
    expect(ageOn('1988-02-29', '2027-02-28')).toBe(39);
    expect(ageOn('1988-02-29', '2028-02-28')).toBe(39);
    expect(ageOn('1988-02-29', '2028-02-29')).toBe(40);
  });

  it('brings back the regulars, less anyone the records say died before the premiere', () => {
    const before = castFor(p, '2026-05-01');
    expect(before.back.map((c) => c.name)).toEqual(['Ada Quill', 'Wren Calder', 'Ivo Brandt']);
    const after = castFor(p, '2027-09-29');
    expect(after.back.map((c) => c.name)).toEqual(['Ada Quill', 'Ivo Brandt']);
    expect(after.gone.map((c) => c.name)).toEqual(['Wren Calder']);
  });

  it('knows a season and what followed it only once the save has reached each decision', () => {
    expect(announcedSeason(sim, 3, '2027-05-11')).toBeUndefined();
    expect(announcedSeason(sim, 3, '2027-05-12')?.premiere).toBe('2027-09-29');
    expect(decisionsFor(sim, 3, '2028-01-01')).toEqual({ announced: sim.outcomes[0], after: undefined });
    expect(decisionsFor(sim, 3, '2028-05-17').after).toEqual(sim.outcomes[1]);
    expect(decisionsFor(sim, 4, '2028-10-17').after).toBeUndefined();
    expect(decisionsFor(sim, 4, '2028-10-18').after).toEqual(sim.outcomes[2]);
  });

  it('says when the outlet usually decides, never the date the save has scheduled', () => {
    expect(usualDecision(p)).toBe('ABC usually decides at the May upfronts, after a season that runs September to May, or within weeks of a summer finale.');
    expect(usualDecision({ ...p, net: ['Hulu'] })).toBe('Hulu usually decides one to four months after the finale.');
  });

  it('opens a simulated premiere, episode or renewal on its season\'s page, and an ending on the series', () => {
    const base = { r: 'tv:1', t: 'Harbour Lane', sim: 1 as const, s: 3 };
    expect(simRoute({ ...base, d: '2027-09-29', k: 'episode', e: 2 })).toEqual({ view: 'season', ref: 'tv:1:s:3' });
    expect(simRoute({ ...base, d: '2027-05-12', k: 'decision', outcome: 'renewed' })).toEqual({ view: 'season', ref: 'tv:1:s:3' });
    expect(simRoute({ ...base, d: '2028-05-12', k: 'decision', outcome: 'cancelled' })).toEqual({ view: 'title', ref: 'tv:1' });
  });
});
