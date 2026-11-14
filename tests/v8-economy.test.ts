// A seeded economy run of the v8 start (the owner's v8 package, 07 "Stress, depth and honesty"; A22). Three worlds, each
// a 19-year-old with the inheritance, a bank account with a monthly fee, a company and a banner, left to run eighteen
// months: no money appears from nowhere, the inheritance never comes again, no fee period is charged twice, every
// transaction balances, and the event queue and the save stay bounded. A fixture run, not a played career: production
// and awards are covered by the journeys.
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { applyForAccount, transferBetween } from '../src/engine/banking';
import { applyForCompany, setBanner } from '../src/engine/company';
import { PERSONAL_CASH } from '../src/engine/personal';
import { serialize } from '../src/engine/save';
import { startLife } from './helpers';

describe('A22: eighteen months of the v8 start, in three worlds', () => {
  for (const seed of ['econ-1', 'econ-2', 'econ-3']) {
    it(`${seed}: nothing is created, nothing is charged twice, and the queue stays bounded`, () => {
      const s = startLife(seed, 'us-los-angeles', { startDate: '2026-02-02' });
      setBanner(s, 'Derrick Lane');
      const acct = applyForAccount(s, 'us-0');
      applyForCompany(s, 'Derrick Lane Pictures', 100_000);
      processUntil(s, s.now + 10 * DAY, 'tick', 1_000_000);
      transferBetween(s, 'econ', PERSONAL_CASH, acct.id, 100_000); // $1,000: past the first month, under every Chase waiver, so each fee is charged and paid
      const sizes: number[] = [];
      const queue: number[] = [];
      for (let m = 0; m < 18; m++) {
        processUntil(s, s.now + 30 * DAY, 'tick', 5_000_000);
        sizes.push(serialize(s).length);
        queue.push(s.events.length);
      }
      const j = s.journal!;
      // Every transaction balances in each currency; so the whole journal sums to nothing.
      for (const t of j.txs) expect(t.lines.reduce((a, l) => a + l.minor, 0), t.key).toBe(0);
      // Only the outside world's accounts supply money: the inheritance once, and nothing else came from nowhere.
      const inherit = j.txs.filter((t) => t.kind === 'inheritance');
      expect(inherit.map((t) => t.key)).toEqual(['opening:inheritance']);
      const intoPlayerAndCompany = j.txs.filter((t) => t.status === 'settled').flatMap((t) => t.lines).filter((l) => j.accounts[l.account].owner !== 'outside').reduce((a, l) => a + l.minor, 0);
      const fromOutside = -j.txs.filter((t) => t.status === 'settled').flatMap((t) => t.lines).filter((l) => j.accounts[l.account].owner === 'outside').reduce((a, l) => a + l.minor, 0);
      expect(intoPlayerAndCompany).toBe(fromOutside);
      expect(intoPlayerAndCompany).toBeLessThanOrEqual(2_500_000_000); // fees and the registry took; nothing added
      // One fee per period, every period from the anchor charged.
      const feeKeys = j.txs.filter((t) => t.kind === 'bank-fee').map((t) => t.key);
      expect(new Set(feeKeys).size).toBe(feeKeys.length);
      expect(feeKeys.length).toBeGreaterThanOrEqual(16);
      // The queue rises and falls with the year's award editions, so each month is compared with the same month a year
      // before: nothing is left behind to pile up (at month 5 and 17 the queue holds the same kinds in the same numbers).
      for (let i = 0; i < 6; i++) expect(queue[i + 12], `month ${i + 13}`).toBeLessThanOrEqual(queue[i] + 20);
      const growth = sizes.slice(1).map((x, i) => x - sizes[i]);
      expect(Math.max(...growth)).toBeLessThan(200_000);
    }, 240_000);
  }
});
