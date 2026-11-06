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

describe('the rollback snapshot', () => {
  it('restores deep changes to projects, ledgers and lists when a later event fails', async () => {
    const { approve, buildProject, castAll, staffAll, startProduction } = await import('./helpers');
    const s = startLife('deep-rollback');
    const p = buildProject(s, { title: 'Deep', format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    startProduction(s, p, 10);
    registerHandler('test-deep', (state) => {
      const pr = state.projects[0];
      pr.obligations[0].postings.push({ ...pr.obligations[0].postings[0], key: 'x' });
      pr.tasks[0].done = pr.tasks[0].units;
      state.log.unshift({ ...state.log[0], id: 'fake' });
      state.events.splice(0, 3);
      throw new Error('deep boom');
    });
    schedule(s, s.now + 60_000, 'test-deep', {}, { id: 'deep-1' });
    const before = JSON.stringify(s);
    expect(() => processUntil(s, s.now + DAY, 'advance', 500)).toThrow(ProcessingError);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('copies plain data exactly, shares nothing with the original, and still copies non-plain values', async () => {
    const { copyPlain } = await import('../src/engine/copy');
    const s = startLife('copy-check');
    const c = copyPlain(s);
    expect(c).toEqual(structuredClone(s));
    expect(c.events).not.toBe(s.events);
    expect(c.events[0]).not.toBe(s.events[0]);
    expect(c.character.birth).not.toBe(s.character.birth);
    const odd = { d: new Date(5), m: new Map([[1, { a: 1 }]]), u: undefined, n: NaN, nested: [[1, { x: Infinity }]] };
    const oc = copyPlain(odd);
    expect(oc).toEqual(odd);
    expect(oc.d).not.toBe(odd.d);
    expect(oc.d).toBeInstanceOf(Date);
    expect(oc.m.get(1)).not.toBe(odd.m.get(1));
    expect('u' in oc).toBe(true);
  });
});
