import { describe, expect, it } from 'vitest';
import { cancel, closeSettled, commit, ledgerTotals, reserve, settle, spend } from './engine-api';
import { buildProject, startLife } from './helpers';

function setup() {
  const s = startLife('ledger');
  const p = buildProject(s, { title: 'L', format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'A' }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
  return { s, p };
}

describe('ledger inputs are checked as strictly as reservations', () => {
  it('commit rejects NaN, Infinity and negative amounts and leaves the line untouched', () => {
    const { s, p } = setup();
    const o = reserve(s, p, 'Camera', 'equipment', 1000);
    for (const bad of [Number.NaN, Infinity, -5]) {
      expect(() => commit(s, p, o.id, bad), String(bad)).toThrow('Invalid amount.');
      expect(o.state).toBe('reserved');
      expect(o.amount).toBe(1000);
    }
    commit(s, p, o.id, 1200.4);
    expect(o.amount).toBe(1200); // rounded like reservations
  });

  it('settle rejects malformed amounts, pays once per key, and never pays a closed line', () => {
    const { s, p } = setup();
    const o = reserve(s, p, 'Crew', 'crew', 500);
    for (const bad of [Number.NaN, Infinity, -1]) expect(() => settle(s, p, o.id, bad, `k-${bad}`), String(bad)).toThrow('Invalid amount.');
    expect(o.settled).toBe(0);
    expect(settle(s, p, o.id, 200, 'day1')).toBe(true);
    expect(settle(s, p, o.id, 200, 'day1')).toBe(false); // idempotent
    expect(settle(s, p, o.id, 400.6, 'day2')).toBe(true); // a supported overrun is recorded, not hidden
    expect(o.amount).toBe(601);
    closeSettled(p, o.id);
    expect(settle(s, p, o.id, 50, 'day3')).toBe(false);
    expect(o.settled).toBe(601);
    const c = reserve(s, p, 'Hall', 'locations', 100);
    cancel(s, p, c.id);
    expect(settle(s, p, c.id, 10, 'late')).toBe(false);
    expect(Number.isFinite(ledgerTotals(p).available)).toBe(true);
  });

  it('spend rejects malformed amounts before touching the ledger', () => {
    const { s, p } = setup();
    const before = p.obligations.length;
    for (const bad of [Number.NaN, Infinity, -10]) expect(() => spend(s, p, 'Taxi', 'travel', bad, `t-${bad}`)).toThrow('Invalid amount.');
    expect(p.obligations.length).toBe(before);
  });
});
