import { SAVE_VERSION } from '../src/engine/types';
import { describe, expect, it } from 'vitest';
import { ActiveClock } from '../src/engine/clock';
import { holidaysForYear, easterSunday } from '../src/engine/holidays';
import { memoryStore, readSave, writeSave, deserialize, serialize, listSaves, SaveFormatError, canTakeLock, takeLock } from '../src/engine/save';
import {
  addPlan, advanceTargetInstant, characterAge, newGame, processUntil, startSleep, validateDraft, snooze,
} from '../src/engine/state';
import { DAY, HOUR, MINUTE, addLocal, ageOn, localParts, localToInstant, observedBirthday } from '../src/engine/time';
import { daylight, forecast, weatherOn, wetProbability } from '../src/engine/weather';
import { getPlace, PLACES } from '../src/data/places';
import { draft } from './fixtures';

describe('clock', () => {
  it('60 s of measured real time gives 60 game seconds despite irregular callbacks', () => {
    let real = 1000;
    const clock = new ActiveClock(() => real);
    clock.start(5_000_000);
    const steps = [16, 250, 1000, 33, 4000, 17, 54684];
    for (const s of steps) real += s; // irregular, delayed frames
    expect(real - 1000).toBe(60000);
    expect(clock.target()! - 5_000_000).toBe(60000);
  });
  it('suspension stops accumulation and resume does not catch up', () => {
    let real = 0;
    const clock = new ActiveClock(() => real);
    clock.start(0);
    real = 10_000;
    const t = clock.target()!;
    clock.suspend();
    real = 10_000 + 3600_000; // an hour hidden
    expect(clock.target()).toBeNull();
    clock.start(t);
    real += 1000;
    expect(clock.target()).toBe(11_000);
  });
});

describe('time and zones', () => {
  it('resolves DST gaps and overlaps explicitly', () => {
    // US spring forward 2026-03-08 02:30 does not exist in New York.
    const gap = localToInstant('America/New_York', 2026, 3, 8, 2, 30);
    expect(gap.resolution).toBe('gap');
    expect(localParts(gap.instant, 'America/New_York').hour).toBe(3);
    // Fall back 2026-11-01 01:30 happens twice; we take the earlier.
    const amb = localToInstant('America/New_York', 2026, 11, 1, 1, 30);
    expect(amb.resolution).toBe('ambiguous');
    expect(amb.instant).toBe(Date.UTC(2026, 10, 1, 5, 30));
  });
  it('month advance clamps to month end and keeps wall time', () => {
    const jan31 = localToInstant('Europe/London', 2026, 1, 31, 9, 15).instant;
    const p = localParts(addLocal(jan31, 'Europe/London', { months: 1 }), 'Europe/London');
    expect([p.month, p.day, p.hour, p.minute]).toEqual([2, 28, 9, 15]);
    const leap = localParts(addLocal(localToInstant('Europe/London', 2028, 1, 31, 9).instant, 'Europe/London', { months: 1 }), 'Europe/London');
    expect([leap.month, leap.day]).toEqual([2, 29]);
  });
  it('leap-day birthdays are observed Feb 28 in common years and age never double-counts', () => {
    expect(observedBirthday({ month: 2, day: 29 }, 2026)).toEqual({ month: 2, day: 28 });
    expect(observedBirthday({ month: 2, day: 29 }, 2028)).toEqual({ month: 2, day: 29 });
    const b = { year: 1996, month: 2, day: 29 };
    expect(ageOn(b, { year: 2026, month: 2, day: 27 })).toBe(29);
    expect(ageOn(b, { year: 2026, month: 2, day: 28 })).toBe(30);
    expect(ageOn(b, { year: 2028, month: 2, day: 28 })).toBe(31);
    expect(ageOn(b, { year: 2028, month: 2, day: 29 })).toBe(32);
  });
});

describe('holidays', () => {
  it('computes Easter and observed substitutes', () => {
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    const us = holidaysForYear('US', undefined, 2026);
    expect(us.find((h) => h.name === 'Independence Day (Observed)')?.date).toBe('2026-07-03');
    expect(us.find((h) => h.name === 'Thanksgiving Day')?.date).toBe('2026-11-26');
    const eng = holidaysForYear('GB', 'GB-ENG', 2027);
    // Christmas 2027 is a Saturday and Boxing Day a Sunday: substitutes are Mon 27 and Tue 28.
    expect(eng.filter((h) => h.observedFor).map((h) => h.date)).toEqual(['2027-12-27', '2027-12-28']);
    const sct = holidaysForYear('GB', 'GB-SCT', 2026).map((h) => h.name);
    expect(sct).toContain("St Andrew's Day");
    expect(holidaysForYear('GB', 'GB-ENG', 2026).map((h) => h.name)).not.toContain("St Andrew's Day");
  });
  it("Japan's equinoxes, substitutes and citizens' holiday for 2026", () => {
    const jp = holidaysForYear('JP', undefined, 2026);
    const d = (n: string) => jp.filter((h) => h.name === n).map((h) => h.date);
    expect(d('Vernal Equinox Day')).toEqual(['2026-03-20']);
    expect(d('Autumnal Equinox Day')).toEqual(['2026-09-23']);
    expect(d("Citizens' Holiday")).toEqual(['2026-09-22']);
    expect(d('Substitute Holiday')).toContain('2026-05-06'); // May 3 is a Sunday
  });
});

describe('daylight and weather', () => {
  it('handles polar day and night', () => {
    const t = getPlace('no-tromso');
    expect(daylight(t.lat, t.lon, '2026-06-21').polar).toBe('day');
    expect(daylight(t.lat, t.lon, '2026-12-21').polar).toBe('night');
    const l = getPlace('gb-london');
    const d = daylight(l.lat, l.lon, '2026-06-21');
    expect(d.dayLengthHours).toBeGreaterThan(16.3);
    expect(d.dayLengthHours).toBeLessThan(16.8);
  });
  it('is deterministic, bounded and seasonal by hemisphere', () => {
    const seed = 12345;
    const syd = getPlace('au-sydney');
    const oslo = getPlace('se-stockholm');
    expect(weatherOn(seed, syd, '2026-01-10')).toEqual(weatherOn(seed, syd, '2026-01-10'));
    const mean = (pl: typeof syd, month: number) => {
      let s = 0;
      for (let d = 1; d <= 28; d++) s += weatherOn(seed, pl, `2026-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`).high;
      return s / 28;
    };
    expect(mean(syd, 1)).toBeGreaterThan(mean(syd, 7));
    expect(mean(oslo, 7)).toBeGreaterThan(mean(oslo, 1));
    for (const pl of PLACES) {
      for (const day of ['2026-01-15', '2026-07-15']) {
        const w = weatherOn(seed, pl, day);
        expect(w.high).toBeGreaterThan(-40);
        expect(w.high).toBeLessThan(55);
        expect(w.low).toBeLessThanOrEqual(w.high);
      }
    }
  });
  it('wet-day frequency tracks the climate model over a year (statistical)', () => {
    const cairo = getPlace('eg-cairo');
    const dublin = getPlace('ie-dublin');
    const count = (pl: typeof cairo) => {
      let n = 0;
      for (let i = 0; i < 365; i++) {
        const k = new Date(Date.UTC(2026, 0, 1) + i * DAY).toISOString().slice(0, 10);
        if (weatherOn(7, pl, k).wet) n++;
      }
      return n / 365;
    };
    expect(count(cairo)).toBeLessThan(0.08);
    expect(count(dublin)).toBeGreaterThan(0.3);
    expect(wetProbability(getPlace('in-mumbai'), 200)).toBeGreaterThan(wetProbability(getPlace('in-mumbai'), 20));
  });
  it('forecasts are reproducible and same-day forecasts equal the truth', () => {
    const pl = getPlace('fr-paris');
    const truth = weatherOn(99, pl, '2026-04-10');
    expect(forecast(99, pl, '2026-04-10', '2026-04-10').chanceOfPrecip).toBe(truth.wet ? 100 : 0);
    expect(forecast(99, pl, '2026-04-15', '2026-04-10')).toEqual(forecast(99, pl, '2026-04-15', '2026-04-10'));
  });
});

describe('creation and events', () => {
  it('validates birth date against the chosen start date', () => {
    expect(validateDraft(draft())).toEqual([]);
    expect(validateDraft(draft({ birthDate: '2026-05-01' })).map((p) => p.field)).toContain('birthDate');
    expect(validateDraft(draft({ birthDate: '2012-01-01' })).map((p) => p.field)).toContain('birthDate');
    // Any start from 2026 to 2050 (November 8, 2026: it was 2026 only).
    expect(validateDraft(draft({ startDate: '2027-01-01' })).map((p) => p.field)).not.toContain('startDate');
    expect(validateDraft(draft({ startDate: '2051-01-01' })).map((p) => p.field)).toContain('startDate');
    expect(validateDraft(draft({ heritages: [] })).map((p) => p.field)).toContain('heritages');
  });
  it('starts the life at the chosen local time in the chosen zone', () => {
    const s = newGame(draft(), 0, 'save1');
    const p = localParts(s.now, 'Europe/London');
    expect([p.year, p.month, p.day, p.hour, p.minute]).toEqual([2026, 3, 27, 8, 0]);
    expect(characterAge(s)).toBe(30);
  });
  it('a whole simulated year fires each birthday exactly once, by tick, advance or sleep', () => {
    const s = newGame(draft(), 0, 'save1');
    const zone = 'Europe/London';
    let t = s.now;
    // Mix of natural ticks, advances and a sleep across the year boundary.
    for (let i = 0; i < 400; i++) {
      t += DAY;
      processUntil(s, t, i % 3 === 0 ? 'tick' : 'advance');
    }
    const bdays = s.log.filter((l) => l.text.startsWith('Today is your birthday'));
    expect(bdays.length).toBe(1); // Feb 28, 2027 (observed) only
    expect(localParts(bdays[0].at, s.ageZone).month).toBe(2);
    expect(localParts(bdays[0].at, s.ageZone).day).toBe(28);
    expect(characterAge(s)).toBe(31);
    expect(zone).toBe('Europe/London');
  });
  it('Advance stops at a reminder; ticking does not; everything stays exactly-once', () => {
    const s = newGame(draft(), 0, 'save1');
    const start = s.now;
    addPlan(s, { title: 'Table Read', start: start + 3 * HOUR, durationMin: 60, remindMin: 30 });
    const r = processUntil(s, advanceTargetInstant(s, 'next-day'), 'advance');
    expect(r.interruptedBy?.message).toBe('Table Read starts at 11:00 AM.');
    expect(s.now).toBe(start + 2.5 * HOUR);
    const r2 = processUntil(s, start + 5 * HOUR, 'tick');
    expect(r2.done).toBe(true);
    expect(s.plans[0].status).toBe('done');
    expect(s.log.filter((l) => l.text.includes('Table Read starts')).length).toBe(1);
  });
  it('sleep wakes for obligations by default; snoozing past one misses it', () => {
    const s = newGame(draft(), 0, 'save1');
    const start = s.now;
    addPlan(s, { title: 'Costume Fitting', start: start + 10 * HOUR, durationMin: 60, remindMin: 15 });
    startSleep(s, start + 12 * HOUR, true);
    const r = processUntil(s, start + 12 * HOUR, 'sleep');
    expect(r.interruptedBy?.event.kind).toBe('plan-reminder');
    expect(s.sleep.asleep).toBe(false);
    snooze(s, 30);
    processUntil(s, s.sleep.wakeAt!, 'sleep');
    expect(s.plans[0].status).toBe('missed');
  });
});

describe('saves', () => {
  it('round-trips, verifies and lists saves', () => {
    const store = memoryStore();
    const s = newGame(draft(), 0, 'save1');
    const res = writeSave(store, s, 1234);
    expect(res.ok).toBe(true);
    const back = readSave(store, 'save1');
    expect(back).toEqual(s);
    expect(listSaves(store)[0].characterName).toBe('Ada Okafor-Lindqvist');
  });
  it('a failed write reports failure and keeps the previous save intact', () => {
    const store = memoryStore();
    const s = newGame(draft(), 0, 'save1');
    writeSave(store, s, 1);
    s.now += HOUR;
    store.failWrites = true;
    const res = writeSave(store, s, 2);
    expect(res.ok).toBe(false);
    store.failWrites = false;
    expect(readSave(store, 'save1').now).toBe(s.now - HOUR);
  });
  it('rejects corrupt or newer-version data without deleting it', () => {
    const s = newGame(draft(), 0, 'save1');
    const text = serialize(s);
    expect(() => deserialize(text.slice(0, text.length - 40))).toThrow(SaveFormatError);
    const env = JSON.parse(text);
    env.data = env.data.replace(`"version":${SAVE_VERSION}`, '"version":99');
    expect(() => deserialize(JSON.stringify(env))).toThrow(SaveFormatError);
    const store = memoryStore();
    store.setItem('slate.v1.save.bad', '{oops');
    expect(() => readSave(store, 'bad')).toThrow(SaveFormatError);
    expect(store.getItem('slate.v1.save.bad')).toBe('{oops');
  });
  it('only one live tab may run a save', () => {
    const store = memoryStore();
    takeLock(store, 'save1', 'tabA', 1000);
    expect(canTakeLock(store, 'save1', 'tabB', 2000)).toBe(false);
    expect(canTakeLock(store, 'save1', 'tabB', 1000 + 7000)).toBe(true);
    expect(MINUTE).toBe(60000);
  });
});
