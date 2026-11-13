// A long run of the world (the owner's v6 package, J19, "no unbounded event growth"; from November 13, 2026). Ten years of
// days, the world left to itself: the queue of pending events rises and falls with the seasons and doesn't climb year on
// year, and the save grows by about the same each year rather than faster. Measured: 253 to 373 events across six years,
// and about 37 KB of save a year.
import { describe, expect, it } from 'vitest';
import { startLife } from './helpers';
import { processUntil } from './engine-api';
import { serialize } from '../src/engine/save';

const DAY = 86_400_000;

describe('ten years of the world', () => {
  it('keeps the event queue bounded and the save growing evenly', () => {
    const s = startLife('long-run');
    const events: number[] = [];
    const size: number[] = [];
    for (let y = 0; y < 10; y++) {
      for (let d = 0; d < 365; d++) processUntil(s, s.now + DAY, 'tick', 100_000);
      events.push(s.events.length);
      size.push(serialize(s).length);
    }
    // The same day each year: no more pending than in the second year, give or take a tenth.
    for (const n of events.slice(2)) expect(n).toBeLessThanOrEqual(Math.ceil(events[1] * 1.1));
    // Each later year adds no more to the save than the second did, give or take a quarter.
    const growth = size.slice(1).map((n, i) => n - size[i]);
    for (const g of growth.slice(2)) expect(g).toBeLessThanOrEqual(growth[1] * 1.25);
  }, 120_000);
});
