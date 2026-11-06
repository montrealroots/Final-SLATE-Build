import { describe, expect, it } from 'vitest';
import { DAY, ProcessingError, processUntil, registerHandler, schedule } from './engine-api';
import { startLife } from './helpers';

let explode = true;
let runs = 0;
registerHandler('test-fragile', (state) => {
  runs += 1;
  state.saveName = `changed ${runs}`; // a change made before the failure
  if (explode) throw new Error('boom');
  return {};
});

describe('processing failures leave a consistent, recoverable state', () => {
  it('rolls the batch back, keeps the event queued, and processes it exactly once after the fault is fixed', () => {
    const s = startLife('fragile');
    const t0 = s.now;
    schedule(s, t0 + 3600_000, 'test-fragile', {}, { id: 'frag-1' });
    const before = JSON.stringify(s);
    let caught: unknown;
    try {
      processUntil(s, t0 + DAY, 'advance', 500);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ProcessingError);
    expect((caught as Error).message).toMatch(/Your game was returned to how it was before/);
    expect(JSON.stringify(s)).toBe(before); // clock, queue, log, money: all as before
    explode = false;
    const before2 = runs;
    processUntil(s, t0 + DAY, 'advance', 500);
    expect(runs - before2).toBe(1);
    expect(s.processedEventIds).toContain('frag-1');
    expect(s.events.some((e) => e.id === 'frag-1')).toBe(false);
    processUntil(s, t0 + 2 * DAY, 'advance', 500);
    expect(runs - before2).toBe(1); // never twice
  });
});
