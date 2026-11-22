// 2026's real US weekends (src/engine/box-office-weekends.ts, from Wikipedia, CC BY-SA 4.0; docs/BOX-OFFICE-WEEKENDS.md):
// the shipped weekends, the competition read from them, and a run's weeks meeting them up to the last recorded weekend
// and the game's own after it.
import { describe, expect, it } from 'vitest';
import { COMPETITION_MAX, recordWeek } from '../src/engine/box-office';
import { LAST_REAL_WEEKEND, WEEKENDS, competitionOf, realWeekendIn, weekendsBy } from '../src/engine/box-office-weekends';
import { parseWeekends } from '../tools/box-office/weekends.mjs';
import type { DistributionOffer } from '../src/engine/types';

const deal = (): DistributionOffer => ({ id: 'o1', distributor: 'Fixture Films', route: 'theatrical', minimumGuarantee: 40_000, territories: ['US'], releaseWindowDays: 20, expiresAt: 0, status: 'accepted' });
const DAY = 86_400_000;

describe('the shipped weekends', () => {
  it('are Wikipedia\'s 2026 US list, every Sunday from January 4 to November 22, each with its number one and gross', () => {
    expect([WEEKENDS.source, WEEKENDS.licence, WEEKENDS.territory]).toEqual(['Wikipedia', 'CC BY-SA 4.0', 'US']);
    const w = WEEKENDS.weekends;
    expect(w).toHaveLength(47);
    expect([w[0].end, LAST_REAL_WEEKEND]).toEqual(['2026-01-04', '2026-11-22']);
    w.forEach((x, i) => {
      expect(x.week).toBe(i + 1);
      expect(new Date(`${x.end}T12:00:00Z`).getUTCDay()).toBe(0); // a Sunday
      if (i) expect(Date.parse(x.end) - Date.parse(w[i - 1].end)).toBe(7 * DAY);
      expect(x.gross).toBeGreaterThan(0);
      expect(x.film.length).toBeGreaterThan(0);
    });
    // A labelled fixture of the real data: April 5, The Super Mario Galaxy Movie, $131,703,340, from Box Office Mojo.
    expect(w.find((x) => x.end === '2026-04-05')).toEqual({ week: 14, end: '2026-04-05', film: 'The Super Mario Galaxy Movie', gross: 131_703_340, source: 'Box Office Mojo' });
  });

  it('are read from the page with a film spanning weekends carried to each', () => {
    const page = `{| class="wikitable sortable"\n! #\n|-\n| 1 || {{dts|2026|January|4|format=mdy}} || rowspan="2" | ''[[Film A (2026 film)|Film A]]'' || $10,000 || || <ref>{{Cite web|website=Box Office Mojo}}</ref>\n|-\n| 2 || {{dts|2026|January|11|format=mdy}} || $8,000 || || <ref>{{Cite web|website=The Numbers}}</ref>\n|-\n| 3 || {{dts|2026|January|18|format=mdy}} || ''[[Film B]]'' || $9,500 || || \n|}`;
    expect(parseWeekends(page)).toEqual([
      { week: 1, end: '2026-01-04', film: 'Film A', gross: 10_000, source: 'Box Office Mojo' },
      { week: 2, end: '2026-01-11', film: 'Film A', gross: 8_000, source: 'The Numbers' },
      { week: 3, end: '2026-01-18', film: 'Film B', gross: 9_500, source: null },
    ]);
  });
});

describe('competition from a real weekend', () => {
  it('is the weekend\'s place among the year\'s: the biggest the busiest, the smallest the quietest, never falling as it grows', () => {
    const grosses = WEEKENDS.weekends.map((w) => w.gross).sort((a, b) => a - b);
    expect(competitionOf(grosses[0], COMPETITION_MAX)).toBe(0);
    expect(competitionOf(grosses.at(-1)!, COMPETITION_MAX)).toBe(COMPETITION_MAX);
    const levels = grosses.map((g) => competitionOf(g, COMPETITION_MAX));
    expect(levels.every((l, i) => !i || l >= levels[i - 1])).toBe(true);
    // Every level is used.
    expect(new Set(levels).size).toBe(COMPETITION_MAX + 1);
  });

  it('is what a week whose weekend was recorded meets, with the weekend kept; a week after the last meets the game\'s own', () => {
    // Opened Wednesday April 1, 2026: week 1 holds Sunday April 5, Mario's $131.7 million weekend, the year's busiest band.
    const o = deal();
    const w1 = recordWeek(o, 1, '2026-04-01', 1, 45_700, 7)!;
    expect(w1.weekend).toEqual({ end: '2026-04-05', film: 'The Super Mario Galaxy Movie', gross: 131_703_340 });
    expect(w1.competitors).toBe(competitionOf(131_703_340, COMPETITION_MAX));
    expect(w1.competitors).toBe(COMPETITION_MAX);
    // The same week with another seed meets the same weekend: it isn't drawn.
    expect(recordWeek(deal(), 1, '2026-04-01', 1, 45_700, 99)!.competitors).toBe(w1.competitors);
    // Opened after the last recorded weekend: no real weekend, and the competition is drawn from the seed as before.
    expect(realWeekendIn('2026-11-25', '2026-12-01')).toBeUndefined();
    const later = [7, 8, 9, 10, 11, 12].map((seed) => recordWeek(deal(), 1, '2026-11-25', 1, 45_700, seed)!);
    expect(later.every((w) => w.weekend === undefined)).toBe(true);
    expect(new Set(later.map((w) => w.competitors)).size).toBeGreaterThan(1);
  });

  it('lists the weekends ended by a day, the latest first', () => {
    expect(weekendsBy('2026-01-03')).toEqual([]);
    expect(weekendsBy('2026-01-11').map((w) => w.end)).toEqual(['2026-01-11', '2026-01-04']);
    expect(weekendsBy('2027-06-01')).toHaveLength(47);
  });
});
