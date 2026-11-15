// The bank in the money of the country a life starts in (the owner, November 14, 2026: "make it show euros. And for any
// other country with a different currency"). Until then every SLATE bank was kept in dollars, so a life in Paris banked
// at BNP Paribas in dollars. SLATE still reasons in dollars; they meet the bank at the day's rate.
import { describe, expect, it } from 'vitest';
import { bankCurrencyFor, bankHeld, bankSpendable } from '../src/engine/bank';
import { exchangeHeld } from '../src/engine/bankworld/content/currency';
import { saveCurrency } from '../src/engine/bankworld/core/money';
import { personalBalance, personalPostings, postPersonal } from '../src/engine/personal';
import { newGame } from '../src/engine/state';
import { draft } from './fixtures';
import { startLife } from './helpers';
import { DAY, processUntil } from './engine-api';
import { buyGear } from '../src/engine/equipment';
import { advanceBankWorld, bankSim } from '../src/engine/bankworld';

// Each life a citizen where it lives, so no work visa's fee is in its money (tests/v10-living-abroad.test.ts has those).
const life = (startPlaceId: string, tag: string) => newGame(draft({ startPlaceId, nationalities: [startPlaceId.slice(0, 2).toUpperCase()] }), 0, `save-${tag}`);

describe('the bank keeps a life\'s money in its own country\'s currency', () => {
  it('a life in Paris banks in euros: the $25,000,000 arrives as euros at the day\'s rate, and the statement keeps the dollars', () => {
    const s = life('fr-paris', 'cur-paris');
    expect(saveCurrency(s.bank!)).toBe('EUR');
    expect(bankHeld(s)).toBe(exchangeHeld(2_500_000_000, 'USD', 'EUR', '2026-03-27'));
    expect(bankHeld(s)).not.toBe(2_500_000_000); // falsifiable: in dollars it would be this
    expect(personalPostings(s).map((p) => [p.kind, p.amount])).toEqual([['inheritance', 25_000_000]]);
    // A payment in dollars posts its euros, and its statement line says the dollars.
    const held = bankHeld(s);
    postPersonal(s, 'paid-work', 1_400, 'Paid Work', 'cur-test:pay');
    expect(bankHeld(s) - held).toBe(exchangeHeld(140_000, 'USD', 'EUR'));
    expect(personalPostings(s).at(-1)!.amount).toBe(1_400);
  });

  it('everything it holds can be spent, though dollars read back from euros round', () => {
    const s = life('fr-paris', 'cur-all');
    postPersonal(s, 'to-project', -bankSpendable(s), 'All Of It', 'cur-test:all');
    expect(bankHeld(s)).toBe(0);
  });

  it('a life in Los Angeles banks in dollars, as before', () => {
    const s = life('us-los-angeles', 'cur-la');
    expect(saveCurrency(s.bank!)).toBe('USD');
    expect(bankHeld(s)).toBe(2_500_000_000);
    expect(personalBalance(s)).toBe(25_000_000);
  });

  it('a country\'s own currency where a rate is recorded, and the dollar where none is', () => {
    expect(['FR', 'GB', 'JP', 'US'].map((c) => bankCurrencyFor(c, '2026-04-06'))).toEqual(['EUR', 'GBP', 'JPY', 'USD']);
    expect(bankCurrencyFor('ZZ', '2026-04-06')).toBe('USD');
  });
});

describe('how you pay, for what a SLATE life buys', () => {
  // From November 14, 2026 equipment and papers' fees are paid as How You Pay says (bankworld/systems/spending.ts
  // `isEveryday`); until then they came out of the current account whatever it said.
  const run = (how: 'debit' | 'credit' | 'cash') => {
    const s = startLife('pay-how', 'gb-london');
    const sim = () => bankSim(s.bank!);
    const exec = (kind: string, payload: Record<string, unknown> = {}) => { advanceBankWorld(s.bank!, s.now); const r = sim().execute({ kind, payload }); if (!r.ok) throw new Error(`${kind}: ${r.error}`); };
    if (how === 'credit') { exec('card.apply'); processUntil(s, s.now + 20 * DAY, 'tick', 1_000_000); }
    if (how === 'cash') exec('cash.withdraw', { amount: 25_000, from: 'atm' });
    exec('bank.set_payments', { everyday: how });
    const mine = () => sim().ledger.accountsOf(sim().universe.playerId).filter((a) => !a.nominal && !a.closedAt);
    const bal = (kind: string) => mine().filter((a) => a.kind === kind).reduce((x, a) => x + a.balance, 0);
    const before = { checking: bal('checking'), card: bal('credit_card'), cash: bal('cash') };
    buyGear(s, 'stand-300f');
    return { checking: bal('checking') - before.checking, card: bal('credit_card') - before.card, cash: bal('cash') - before.cash };
  };
  it('by debit card from the current account, on the credit card where that is how you pay, and from cash in hand first', () => {
    const debit = run('debit');
    expect(debit.checking).toBeLessThan(0);
    expect([debit.card, debit.cash]).toEqual([0, 0]);
    const credit = run('credit');
    expect(credit.card).toBeLessThan(0); // owed on the card
    expect(credit.checking).toBe(0);
    const cash = run('cash');
    expect(cash.cash).toBeLessThan(0);
    expect(cash.checking).toBe(0);
    // The same purchase, the same amount, whichever way it is paid.
    expect(-credit.card).toBe(-debit.checking);
    expect(-cash.cash).toBe(-debit.checking);
  });
});
