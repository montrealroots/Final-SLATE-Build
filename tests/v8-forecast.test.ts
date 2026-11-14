// The dated cash forecast (src/engine/cash/forecast.ts; the owner's v8 package, 03 "Liquidity and readiness"; A06, A07),
// with the package's own example: $20,000 in hand, a $30,000 deposit tomorrow, $100,000 on delivery.
import { describe, expect, it } from 'vitest';
import { cashForecast, type CashEvent } from '../src/engine/cash/forecast';

const D = (n: number) => n * 100; // dollars to cents
const example = (extra: CashEvent[] = []): CashEvent[] => [
  { id: 'deposit', date: '2026-03-02', kind: 'out', minor: D(30_000), label: 'Deposit' },
  { id: 'delivery', date: '2026-09-01', kind: 'in', minor: D(100_000), secured: true, label: 'On delivery' },
  ...extra,
];

describe('A06: money that arrives on delivery can\'t pay tomorrow\'s deposit', () => {
  it('is funded overall and still $10,000 short tomorrow', () => {
    const f = cashForecast(D(20_000), example());
    expect([f.fundedOverall, f.firstDeficit, f.additionalRequired]).toEqual([true, '2026-03-02', D(10_000)]);
  });
  it('a settled $10,000 from the owner resolves it; raising the planned budget doesn\'t, because it is no money', () => {
    expect(cashForecast(D(30_000), example())).toMatchObject({ firstDeficit: null, additionalRequired: 0 });
    // A planned budget of $2,000,000 is a plan: it adds no event, so the forecast is the same.
    expect(cashForecast(D(20_000), example())).toEqual(cashForecast(D(20_000), example()));
  });
  it('an expected receipt that isn\'t secured never counts, and money out goes first on a shared day', () => {
    const hope = cashForecast(D(20_000), example([{ id: 'grant', date: '2026-03-01', kind: 'in', minor: D(50_000), secured: false }]));
    expect(hope.firstDeficit).toBe('2026-03-02');
    const sameDay = cashForecast(D(20_000), example([{ id: 'fee', date: '2026-03-02', kind: 'in', minor: D(10_000), secured: true }]));
    expect([sameDay.firstDeficit, sameDay.additionalRequired]).toEqual(['2026-03-02', D(10_000)]);
  });
});

describe('A07: a held obligation isn\'t subtracted twice', () => {
  it('skips an outflow whose money is already held, because the opening figure has it off', () => {
    // $50,000 settled, $30,000 of it held for the deposit: $20,000 available, and the deposit's own event is skipped.
    const f = cashForecast(D(20_000), example().map((e) => (e.id === 'deposit' ? { ...e, alreadyHeld: true } : e)));
    expect([f.firstDeficit, f.endingBalance]).toEqual([null, D(120_000)]);
  });
  it('refuses an event listed twice, an undated one, and a fraction of a cent', () => {
    expect(() => cashForecast(0, [...example(), example()[0]])).toThrow(/listed twice/);
    expect(() => cashForecast(0, [{ id: 'x', date: 'soon', kind: 'out', minor: 1 }])).toThrow(/needs a date/);
    expect(() => cashForecast(0, [{ id: 'x', date: '2026-01-01', kind: 'out', minor: 0.5 }])).toThrow(/whole/);
  });
});
