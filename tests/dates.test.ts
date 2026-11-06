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
    expect(msgs({ startDate: '2026-02-31' })).toContain('startDate: Choose a date in 2026.');
    expect(msgs({ birthDate: '1999-02-30' })).toContain('birthDate: Enter your birth date.');
    expect(msgs({ birthDate: '2000-02-29' }).some((m) => m.startsWith('birthDate'))).toBe(false); // a real leap day is fine
    expect(msgs({ startTime: '24:00' })).toContain('startTime: Enter a time such as 08:00.');
    expect(msgs({ startDate: '2027-01-05' })).toContain('startDate: Choose a date in 2026.');
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
