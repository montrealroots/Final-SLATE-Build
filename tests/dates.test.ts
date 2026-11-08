import { describe, expect, it } from 'vitest';
import { isDateKey, validateDraft } from './engine-api';
import { draft } from './fixtures';

describe('impossible dates are rejected, not normalised', () => {
  it('checks month lengths and leap years', () => {
    expect(isDateKey('2026-02-28')).toBe(true);
    expect(isDateKey('2026-02-29')).toBe(false); // 2026 is not a leap year
    expect(isDateKey('2028-02-29')).toBe(true);
    expect(isDateKey('2100-02-29')).toBe(false); // century rule
    expect(isDateKey('2000-02-29')).toBe(true);
    expect(isDateKey('2026-04-31')).toBe(false);
    expect(isDateKey('2026-13-01')).toBe(false);
    expect(isDateKey('2026-00-10')).toBe(false);
    expect(isDateKey('2026-1-1')).toBe(false);
    expect(isDateKey('')).toBe(false);
  });

  it('creation refuses impossible birth and start dates and times', () => {
    const msgs = (patch: Record<string, string>) => validateDraft({ ...draft(), ...patch }).map((p) => `${p.field}: ${p.message}`);
    expect(msgs({ startDate: '2026-02-31' })).toContain('startDate: Choose a date from 2026 to 2050.');
    expect(msgs({ birthDate: '1999-02-30' })).toContain('birthDate: Enter your birth date.');
    expect(msgs({ birthDate: '2000-02-29' }).some((m) => m.startsWith('birthDate'))).toBe(false); // a real leap day is fine
    expect(msgs({ startTime: '24:00' })).toContain('startTime: Enter a time such as 08:00.');
    // 2026 by default, and any later year up to 2050 (the owner's rule, November 8, 2026).
    expect(msgs({ startDate: '2027-01-05' }).some((m) => m.startsWith('startDate'))).toBe(false);
    expect(msgs({ startDate: '2050-12-31' }).some((m) => m.startsWith('startDate'))).toBe(false);
    expect(msgs({ startDate: '2025-12-31' })).toContain('startDate: Choose a date from 2026 to 2050.');
    expect(msgs({ startDate: '2051-01-01' })).toContain('startDate: Choose a date from 2026 to 2050.');
  });

  it('you must be at least 19 on the starting date, whichever year it is', async () => {
    const { latestBirthDate } = await import('./engine-api');
    const msgs = (patch: Record<string, string>) => validateDraft({ ...draft(), ...patch }).map((p) => `${p.field}: ${p.message}`);
    const young = 'birthDate: Your character must be at least 19 on the starting date.';
    expect(latestBirthDate('2026-01-05')).toBe('2007-01-05');
    expect(msgs({ startDate: '2026-01-05', birthDate: '2007-01-05' })).not.toContain(young); // 19 that day
    expect(msgs({ startDate: '2026-01-05', birthDate: '2007-01-06' })).toContain(young); // 19 the day after
    // A later start lets a later birth year through: 2008 is too late for 2026 and fine for 2027.
    expect(msgs({ startDate: '2026-06-01', birthDate: '2008-03-01' })).toContain(young);
    expect(msgs({ startDate: '2027-06-01', birthDate: '2008-03-01' })).not.toContain(young);
    expect(latestBirthDate('2028-02-29')).toBe('2009-02-28'); // no 29 February in 2009
  });
});

describe('other date inputs', () => {
  it('a production start date and a release date must be real dates', async () => {
    const { generatePlan, planRelease } = await import('./engine-api');
    const { approve, buildProject, startLife } = await import('./helpers');
    const s = startLife('dates');
    const p = buildProject(s, { title: 'D', format: 'short', medium: 'live-action' }, [{ name: 'A' }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
    approve(s, p);
    expect(() => generatePlan(s, p, '2026-02-30')).toThrow('Choose a start date.');
    p.delivered = { at: s.now, runtimeMin: 2 };
    expect(() => planRelease(s, p, { route: 'digital', date: '2026-06-31', territories: ['GB'] })).toThrow('Choose a real release date.');
  });
});

describe('a story that begins in a later year', () => {
  it("other productions' bookings fall around your start, not around 2026", async () => {
    const { candidates } = await import('./engine-api');
    const { startLife } = await import('./helpers');
    const years = (startDate: string) => {
      const s = startLife(`later-${startDate}`, 'gb-london', { startDate });
      return candidates(s, 'actor', 'GB').flatMap((p) => p.busy.map((b) => Number(b.from.slice(0, 4))));
    };
    const later = years('2029-03-02');
    expect(later.length).toBeGreaterThan(0);
    expect(Math.min(...later)).toBeGreaterThanOrEqual(2029);
    expect(Math.max(...years('2026-03-02'))).toBeLessThan(2029); // a 2026 start reads as it always did
  });
});
