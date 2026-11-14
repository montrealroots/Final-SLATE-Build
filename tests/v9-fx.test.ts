// Dated exchange (the owner's command of November 14, 2026, 3 "Restore exchange"; docs/v9/FX.md). The rates are
// SLATE-REBUILD's dated records; a payment abroad is quoted at the reference rate in force on the game's day, with the
// sending bank's fee, its margin and the receiving bank's fee, and settles what was quoted. Each case changes the day
// and reads the outcome.
import { describe, expect, it } from 'vitest';
import RATES from '../src/engine/bankworld/data/rates/rates.json';
import { loadSave, quickSave } from '../src/engine/bankworld';
import type { Simulation } from '../src/engine/bankworld/core/simulation';
import type { Account } from '../src/engine/bankworld/core/ledger';
import { instantFromZoned } from '../src/engine/bankworld/core/time';
import { bankById } from '../src/engine/bankworld/content/banks';
import { LAST_OBSERVATION, exchange, referenceRate } from '../src/engine/bankworld/content/currency';
import { abroadQuote, quoteWords, sendAbroad } from '../src/engine/bankworld/systems/abroad';
import { deserialise, serialise } from '../src/engine/bankworld/persistence/adapter';

const SERIES = (RATES as { currencies: Record<string, { rates: { from: string; perUSD: string }[] }> }).currencies;
const NY = 'America/New_York';
const at = (y: number, m: number, d: number, h = 12) => instantFromZoned({ year: y, month: m, day: d, hour: h, minute: 0 }, NY);

/** Labelled fixture: a New York life at Chase with a Barclays sterling account holding £5,000. */
function withSterling(seed: string, y = 2026, m = 3, d = 23): { sim: Simulation; gbp: Account; chase: Account } {
  const sim = quickSave({ startLocationId: 'us-ny-newyork', homeRegionId: 'us-ny-newyork', wealth: 'comfortable', startYear: y, startMonth: m, startDay: d }, seed);
  const bank = bankById('gb-barclays')!;
  const gbp = sim.openAccount({ id: sim.nextId('account'), kind: 'checking', name: bank.current.name, ownerId: sim.player.id, institution: bank.name, bankId: bank.id, openedAt: sim.now, currency: 'GBP' });
  const worth = exchange(500_000, 'GBP', 'USD')!;
  sim.post({ memo: 'Labelled fixture', category: 'fixture', postings: [{ accountId: gbp.id, amount: worth, native: 500_000 }, { accountId: sim.nominalAccount('equity', 'Fixture').id, amount: -worth }] });
  return { sim, gbp, chase: sim.universe.accounts[sim.player.primaryAccountId!]! };
}

describe('the records', () => {
  it('are SLATE-REBUILD\'s: 152 currency series and 622 dated observations', () => {
    expect(Object.keys(SERIES)).toHaveLength(152);
    expect(Object.values(SERIES).reduce((n, s) => n + s.rates.length, 0)).toBe(622);
    expect(LAST_OBSERVATION).toBe('2026-10-30');
  });

  it('give the rate in force on a day, never one that takes effect later, and none before the first', () => {
    expect(referenceRate('GBP', '2026-03-30')).toMatchObject({ perUSD: '0.743', effective: '2025-12-31', stale: false });
    expect(referenceRate('GBP', '2026-03-31')).toMatchObject({ perUSD: '0.756', effective: '2026-03-31' });
    expect(referenceRate('GBP', '2025-12-30')).toBeUndefined();
    // For every series and every day of its records and the day before each: nothing from the future.
    for (const [cur, s] of Object.entries(SERIES)) for (const step of s.rates) {
      const r = referenceRate(cur, step.from)!;
      expect(r.effective <= step.from, cur).toBe(true);
      expect(r.effective, cur).toBe(step.from);
    }
  });

  it('hold the last rate past the records, said to be stale, and never move it', () => {
    const last = SERIES.GBP.rates.at(-1)!;
    expect(referenceRate('GBP', '2026-12-31')).toMatchObject({ perUSD: last.perUSD, effective: last.from, stale: false });
    expect(referenceRate('GBP', '2027-03-01')).toMatchObject({ perUSD: last.perUSD, effective: last.from, stale: true });
    expect(referenceRate('GBP', '2040-01-01')!.perUSD).toBe(last.perUSD);
  });

  it('convert once, rounded once, and not at all where a rate is missing', () => {
    expect(exchange(10_000, 'USD', 'GBP', '2026-04-01')).toBe(7_560);
    expect(exchange(10_000, 'USD', 'GBP', '2026-03-30')).toBe(7_430);
    expect(exchange(10_000, 'USD', 'ZZZ', '2026-04-01')).toBeUndefined();
    expect(exchange(10_000, 'USD', 'GBP', '2025-06-01')).toBeUndefined();
  });
});

describe('a payment abroad', () => {
  it('is quoted at the rate in force that day, with both fees and the margin, and says the rate and its date', () => {
    const { sim, gbp, chase } = withSterling('fx-quote');
    sim.advanceTo(at(2026, 3, 30));
    const before = abroadQuote(sim, sim.player, gbp, chase, 100_000);
    sim.advanceTo(at(2026, 3, 31));
    const after = abroadQuote(sim, sim.player, gbp, chase, 100_000);
    if ('refused' in before || 'refused' in after) throw new Error('refused');
    // £1,000 is worth more dollars at 0.743 to the dollar than at 0.756.
    expect(before.worth).toBe(Math.round(100_000 / 0.743));
    expect(after.worth).toBe(Math.round(100_000 / 0.756));
    expect(before.rates.sent).toMatchObject({ currency: 'GBP', perUSD: '0.743', effective: '2025-12-31' });
    expect(after.rates.sent).toMatchObject({ perUSD: '0.756', effective: '2026-03-31' });
    for (const q of [before, after]) expect(q.receivedSave).toBe(q.worth - q.marginSave - q.incomingSave);
    expect(quoteWords(sim, after)).toContain('0.756 GBP to the dollar from 2026-03-31');
  });

  it('settles what was quoted, once, though the rate changes on its way and the save is reloaded', () => {
    const { sim, gbp, chase } = withSterling('fx-settle');
    sim.advanceTo(at(2026, 3, 30, 9));
    const q = abroadQuote(sim, sim.player, gbp, chase, 100_000);
    if ('refused' in q) throw new Error(q.refused);
    const chaseBefore = chase.balance;
    const arrives = sendAbroad(sim, sim.player, gbp, chase, 100_000);
    expect(arrives).toBeGreaterThan(at(2026, 3, 31, 0)); // after the rate changed
    const stored = sim.universe.scheduled.find((i) => i.kind === 'bank.arrives' || (i.payload as { abroad?: boolean }).abroad);
    expect((stored!.payload as { rates: { sent: { perUSD: string } } }).rates.sent.perUSD).toBe('0.743');
    const back = loadSave(deserialise(serialise(sim.universe)) as never);
    back.advanceTo(arrives + 86_400_000);
    const landed = back.universe.transactions.filter((t) => t.memo.startsWith('From') && t.memo.endsWith('abroad'));
    expect(landed).toHaveLength(1);
    expect(back.universe.accounts[chase.id]!.balance - chaseBefore).toBe(q.receivedSave);
    // Every transaction still balances.
    for (const t of back.universe.transactions) expect(t.postings.reduce((n, p) => n + p.amount, 0), t.memo).toBe(0);
  });

  it('is refused, not made one to one, where a money has no rate', () => {
    const { sim, gbp, chase } = withSterling('fx-none');
    gbp.currency = 'ZZZ'; // labelled fixture: a money no record has
    const q = abroadQuote(sim, sim.player, gbp, chase, 100_000);
    expect(q).toEqual({ refused: 'No exchange rate for ZZZ is recorded by this date, so the game can\'t quote this payment.' });
  });

  it('says the rate is old when the newest record is more than a quarter behind the day', () => {
    const { sim, gbp, chase } = withSterling('fx-stale', 2027, 3, 1);
    const q = abroadQuote(sim, sim.player, gbp, chase, 100_000);
    if ('refused' in q) throw new Error(q.refused);
    expect(q.rates.sent.stale).toBe(true);
    expect(quoteWords(sim, q)).toContain('These are the newest recorded, and more than a quarter old.');
  });
});
