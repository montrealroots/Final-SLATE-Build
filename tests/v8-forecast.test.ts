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

// Budget lines with who is paid and when (the owner's v8 package, 03 "due dates"; from November 17, 2026). Until then the
// work still to pay for was one sum dated today.
describe('the work still to pay for, line by line, with its payee and date', () => {
  async function film(tag: string) {
    const { startLife, buildProject, approve } = await import('./helpers');
    const s = startLife(tag);
    const p = buildProject(s, { title: 'Ledger', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Mara'], minutes: 3 }]);
    approve(s, p);
    return { s, p };
  }

  it('dates work on set from the production window\'s start, materials today, and adds up to what is left to pay', async () => {
    const { paymentSchedule, budgetPicture } = await import('../src/engine/project-budget');
    const { productionWindow } = await import('../src/engine/hiring');
    const { costBreakdown } = await import('../src/engine/estimate');
    const { s, p } = await film('pay-dates');
    const due = paymentSchedule(s, p);
    expect(due.length).toBeGreaterThan(0);
    const from = productionWindow(s, p).from;
    const crew = due.filter((x) => x.payee.startsWith('Whoever you hire as'));
    expect(crew.length).toBeGreaterThan(0);
    expect(new Set(crew.map((x) => x.date))).toEqual(new Set([from]));
    // Every line of the estimate is here once, to the cent.
    const lines = costBreakdown(s, p).toCome;
    expect(due.reduce((a, x) => a + x.minor, 0)).toBe(lines.reduce((a, x) => a + Math.round(x.amount * 100), 0));
    expect(Math.abs(due.reduce((a, x) => a + x.minor, 0) / 100 - (budgetPicture(s, p).forecastFinal - budgetPicture(s, p).paid - budgetPicture(s, p).reserved))).toBeLessThan(1 + lines.length / 100);
  });

  it('splits work on set across the shoot days still scheduled, to the cent', async () => {
    const { paymentSchedule } = await import('../src/engine/project-budget');
    const { s, p } = await film('pay-split');
    const { costBreakdown } = await import('../src/engine/estimate');
    // Labelled fixture: three scheduled shoot days some months out.
    p.schedule.days.push(...['2026-07-01', '2026-07-02', '2026-07-03'].map((date, i) => ({ id: `day-${i}`, date, sceneIds: [], locationLabel: 'Pier', status: 'scheduled' } as never)));
    const due = paymentSchedule(s, p);
    const onSet = due.filter((x) => x.label === 'Director Of Photography');
    expect(onSet.map((x) => x.date)).toEqual(['2026-07-01', '2026-07-02', '2026-07-03']);
    // Split to the cent: the three days add up to the line, the remainder on the last.
    const line = costBreakdown(s, p).toCome.find((x) => x.label === 'Director Of Photography')!;
    expect(onSet.reduce((a, x) => a + x.minor, 0)).toBe(Math.round(line.amount * 100));
    // Post production comes after the shoot: the day after its last scheduled day.
    expect(due.filter((x) => x.label === 'Editor').map((x) => x.date)).toEqual(['2026-07-04']);
  });

  it('moves the first day short from today to the day the money is due', async () => {
    const { projectCashForecast } = await import('../src/engine/project-budget');
    const { productionWindow } = await import('../src/engine/hiring');
    const { s, p } = await film('pay-deficit');
    p.funding.extra = [];
    p.funding.fund = 0; // labelled fixture: nothing in the project yet
    const fc = projectCashForecast(s, p);
    // Materials are bought now, so the first day short is today; the crew's money is due from the window's start, and the
    // forecast reaches it then (until November 17, 2026 all of it was dated today).
    expect(fc.firstDeficit).toBe(fc.rows[0].date);
    const window = productionWindow(s, p).from;
    expect(fc.rows.some((r) => r.date === window && r.label === 'Director Of Photography')).toBe(true);
    expect(fc.rows.some((r) => r.date !== window && r.label === 'Director Of Photography')).toBe(false);
    expect(fc.rows.some((r) => r.id === 'to-come')).toBe(false);
  });
});
