import { describe, expect, it } from 'vitest';
import { loadWorldHolidays, worldHolidayCoverage, worldHolidaysForYear, worldHolidaysLoaded } from '../src/world/holidays/holidays';

describe('worldwide holiday rules', () => {
  it('reports holidays as not loaded, never as ordinary days, before the rules arrive', () => {
    if (worldHolidaysLoaded()) return; // another test file in this worker loaded them first
    expect(worldHolidayCoverage('FR', 2026)).toEqual({ kind: 'not-loaded' });
  });

  it('computes fixed, Easter, nth-weekday and substitute days', async () => {
    await loadWorldHolidays();
    const us = worldHolidaysForYear('US', 2026);
    // 4 July 2026 is a Saturday: the Friday before is the day off.
    expect(us.find((h) => h.date === '2026-07-03')?.name).toMatch(/Independence Day \(Observed\)/);
    expect(us.some((h) => h.date === '2026-11-26')).toBe(true); // Thanksgiving, 4th Thursday
    const fr = worldHolidaysForYear('FR', 2026).map((h) => h.date);
    expect(fr).toContain('2026-04-06'); // Easter Monday
    expect(fr).toContain('2026-07-14');
  });

  it('computes equinox and lunar holidays from the calendars', async () => {
    await loadWorldHolidays();
    const jp = worldHolidaysForYear('JP', 2026).map((h) => h.date);
    expect(jp).toContain('2026-03-20'); // Vernal Equinox Day
    expect(jp).toContain('2026-09-23'); // Autumnal Equinox Day
    const sa = worldHolidaysForYear('SA', 2027);
    const eid = sa.filter((h) => h.lunar);
    expect(eid.length).toBeGreaterThan(0);
    expect(eid.every((h) => h.estimated)).toBe(true);
  });

  it('labels years past the last announcement as projected, and limits the supported years', async () => {
    await loadWorldHolidays();
    expect(worldHolidayCoverage('CN', 2026).kind).toBe('kept');
    expect(worldHolidayCoverage('CN', 2027)).toEqual({ kind: 'projected', announcedTo: 2026 });
    expect(worldHolidaysForYear('CN', 2027).every((h) => h.projected)).toBe(true);
    expect(worldHolidaysForYear('CN', 2027).length).toBeGreaterThan(5); // future years stay playable
    expect(worldHolidayCoverage('FR', 2101).kind).toBe('outside-years');
    expect(worldHolidayCoverage('AQ', 2026).kind).toBe('not-kept');
  });

  it('keeps regional holidays to their region', async () => {
    await loadWorldHolidays();
    const scot = worldHolidaysForYear('GB', 2026, 'GB.SCT').map((h) => h.name);
    const eng = worldHolidaysForYear('GB', 2026, 'GB.ENG').map((h) => h.name);
    expect(scot).toContain('2nd January');
    expect(eng).not.toContain('2nd January');
  });
});

describe('holidays at a place', () => {
  it('keeps curated countries curated, and fills years past their tables from the worldwide rules', async () => {
    await loadWorldHolidays();
    const { placeHolidays, placeHolidayCoverage } = await import('../src/engine/holidays');
    const { getPlace } = await import('../src/data/places');
    const shanghai = getPlace('cn-shanghai');
    expect(placeHolidays(shanghai, 2026).some((h) => h.projected)).toBe(false); // official 2026 notice
    const cn2027 = placeHolidays(shanghai, 2027);
    expect(cn2027.length).toBeGreaterThan(5);
    expect(cn2027.every((h) => h.projected)).toBe(true);
    expect(placeHolidayCoverage(shanghai, 2027)).toEqual({ kind: 'projected', announcedTo: 2026 });
    const riyadh = getPlace('sa-jeddah');
    const sa2027 = placeHolidays(riyadh, 2027);
    expect(sa2027.some((h) => h.name === 'Founding Day')).toBe(true);
    expect(sa2027.some((h) => h.estimated)).toBe(true);
    expect(placeHolidayCoverage(getPlace('gb-london'), 2026)).toEqual({ kind: 'kept' });
  });

  it('gives a world place its own country and region holidays', async () => {
    await loadWorldHolidays();
    const { placeHolidays } = await import('../src/engine/holidays');
    const pl = placeHolidays({ country: 'PL', regionKey: 'PL.77' }, 2026).map((h) => h.date);
    expect(pl).toContain('2026-11-11'); // Independence Day
    expect(pl).toContain('2026-05-03'); // Constitution Day
  });
});
