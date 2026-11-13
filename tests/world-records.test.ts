// The world's records as historical records (catalog/world.ts historicalRecord; the v4 package, 04; ledger V4-027.01):
// what they carry, recorded, announced and simulated kept apart, and nothing told as having happened before its day.
import { describe, expect, it } from 'vitest';
import { eventsBetween, historicalRecord, type WorldEvent } from '../src/catalog/world';

const w = { horizon: '2026-11-11', builtAt: '2026-11-11T09:00:00Z' };
const ev = (d: string, extra: Partial<WorldEvent> = {}): WorldEvent => ({ d, k: 'film', r: 'm:1', t: 'A Film', ...extra });

describe('a world record', () => {
  it('carries what it is of, what it measures, when, as of when, from where, which revision and how it is known', () => {
    expect(historicalRecord(w, ev('2026-03-01'))).toEqual({ entity: 'm:1', metric: 'film-release', unit: 'day', territory: null, period: '2026-03-01', asOf: '2026-11-11', source: 'TMDB', revision: '2026-11-11T09:00:00Z', availability: 'recorded' });
    expect(historicalRecord(w, ev('2026-12-25', { k: 'season', s: 2 })).metric).toBe('season-premiere');
  });

  it('keeps recorded, announced and simulated apart, and where it happened unknown rather than guessed', () => {
    expect(historicalRecord(w, ev('2026-11-11')).availability).toBe('recorded');
    expect(historicalRecord(w, ev('2026-11-12')).availability).toBe('announced'); // scheduled after the records were taken
    expect(historicalRecord(w, ev('2027-02-01', { sim: 1 }))).toMatchObject({ availability: 'simulated', source: "This save's world" });
    expect(historicalRecord(w, ev('2026-03-01')).territory).toBeNull();
  });

  it('is read only up to the day asked for: a later one is not among what has happened', () => {
    const seed = { version: 1 as const, builtAt: w.builtAt, horizon: w.horizon, from: '2020-01-01', events: [ev('2026-03-01'), ev('2026-03-02', { r: 'm:2' })] };
    expect(eventsBetween(seed, '2026-02-01', '2026-03-01').map((e) => e.r)).toEqual(['m:1']);
  });
});
