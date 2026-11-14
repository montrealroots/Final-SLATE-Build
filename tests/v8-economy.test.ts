// A seeded economy run of the start (the owner's v8 package, 07 "Stress, depth and honesty"; A22). Three worlds, each a
// 19-year-old with the inheritance and a banner, left to run eighteen months. From November 14, 2026 the money is in the
// bank (1221's ledger, engine/bank.ts) and no company is formed: until then this run opened a v8 bank account and a
// company and read the v8 journal, both retired that day. No money appears from nowhere, the inheritance never comes
// again, no fee is charged twice, every transaction balances, and the event queue and the save stay bounded. A fixture
// run, not a played career: production and awards are covered by the journeys.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { setBanner } from '../src/engine/company';
import { serialize } from '../src/engine/save';
import { startLife } from './helpers';

describe('A22: eighteen months of the start, in three worlds', () => {
  for (const seed of ['econ-1', 'econ-2', 'econ-3']) {
    it(`${seed}: nothing is created, nothing is charged twice, and the queue stays bounded`, () => {
      const s = startLife(seed, 'us-los-angeles', { startDate: '2026-02-02' });
      setBanner(s, 'Derrick Lane');
      const sizes: number[] = [];
      const queue: number[] = [];
      for (let m = 0; m < 18; m++) {
        processUntil(s, s.now + 30 * DAY, 'tick', 5_000_000);
        sizes.push(serialize(s).length);
        queue.push(s.events.length);
      }
      const u = s.bank!;
      expect(u.now).toBe(s.now); // the bank kept the game's clock
      // Every transaction balances; so the whole ledger sums to nothing.
      for (const t of u.transactions) expect(t.postings.reduce((a, p) => a + p.amount, 0), t.memo).toBe(0);
      // The inheritance came once, and every other cent the player holds came through a posting with a counter-account.
      expect(u.transactions.filter((t) => t.memo === 'Your Inheritance').length).toBe(1);
      const mine = Object.values(u.accounts).filter((a) => a.ownerId === u.playerId && !a.nominal);
      const sumOfPostings = (id: string) => u.transactions.flatMap((t) => t.postings).filter((p) => p.accountId === id).reduce((a, p) => a + p.amount, 0);
      for (const a of mine) expect(a.balance, a.name).toBe(sumOfPostings(a.id));
      const held = mine.reduce((x, a) => x + a.balance, 0);
      const interest = -Object.values(u.accounts).filter((a) => a.nominal && a.kind === 'income' && /interest/i.test(a.name)).reduce((x, a) => x + a.balance, 0);
      // What the player holds is the inheritance, plus interest the bank paid, less fees: nothing else came in.
      expect(held).toBeLessThanOrEqual(2_500_000_000 + interest);
      // One fee per period: no fee transaction for the same account and month twice.
      const fees = u.transactions.filter((t) => /fee/i.test(t.category)).map((t) => `${t.memo}|${new Date(t.at).toISOString().slice(0, 7)}|${t.postings[0]?.accountId}`);
      expect(new Set(fees).size).toBe(fees.length);
      // The queue rises and falls with the year's award editions, so each month is compared with the same month a year
      // before: nothing is left behind to pile up.
      for (let i = 0; i < 6; i++) expect(queue[i + 12], `month ${i + 13}`).toBeLessThanOrEqual(queue[i] + 20);
      const growth = sizes.slice(1).map((x, i) => x - sizes[i]);
      expect(Math.max(...growth)).toBeLessThan(200_000);
    }, 240_000);
  }
});
