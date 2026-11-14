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

const life = (startPlaceId: string, tag: string) => newGame(draft({ startPlaceId }), 0, `save-${tag}`);

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
