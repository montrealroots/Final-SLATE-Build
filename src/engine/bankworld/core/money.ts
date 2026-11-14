/**
 * SLATE — Money.
 *
 * LAW: money is always integer minor units (cents). Floats never touch a
 * balance. Every rounding decision is explicit and happens exactly once, at
 * the point a rate is applied, so ledgers reconcile to the cent forever.
 */

import { currencyInfo } from '../content/currency';

/** Integer cents. Positive is a credit to the holder, negative a debit. */
export type Money = number;

/**
 * Whole units of the ledger's currency to minor units, and back.
 *
 * Named `dollars` when this file was cut from another codebase and kept that
 * name through everything above. The names are the unit the game does not use,
 * so they are the unit somebody reaches for by mistake.
 */
export function units(amount: number): Money {
  return Math.round(amount * 100);
}

/** Applies a rate and rounds half away from zero, once. */
export function applyRate(base: Money, rate: number): Money {
  const raw = base * rate;
  return raw >= 0 ? Math.round(raw) : -Math.round(-raw);
}

/**
 * Splits an amount into n parts that sum exactly to the original.
 * Remainder cents are distributed to the earliest parts.
 */
export function splitEvenly(amount: Money, parts: number): Money[] {
  if (parts <= 0) return [];
  const base = Math.trunc(amount / parts);
  let remainder = amount - base * parts;
  const out: Money[] = [];
  const step = remainder >= 0 ? 1 : -1;
  for (let i = 0; i < parts; i++) {
    let value = base;
    if (remainder !== 0) {
      value += step;
      remainder -= step;
    }
    out.push(value);
  }
  return out;
}

/** Splits by weights, preserving the exact total (largest-remainder method). */
export function splitByWeights(amount: Money, weights: readonly number[]): Money[] {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return splitEvenly(amount, weights.length);
  const exact = weights.map((w) => (amount * Math.max(0, w)) / total);
  const floored = exact.map((v) => Math.trunc(v));
  let remaining = amount - floored.reduce((s, v) => s + v, 0);
  const order = exact
    .map((v, i) => ({ i, frac: Math.abs(v - Math.trunc(v)) }))
    .sort((a, b) => b.frac - a.frac);
  const step = remaining >= 0 ? 1 : -1;
  let k = 0;
  while (remaining !== 0 && order.length > 0) {
    const idx = (order[k % order.length] as { i: number }).i;
    floored[idx] = (floored[idx] as number) + step;
    remaining -= step;
    k++;
  }
  return floored;
}

/**
 * The unit a save's ledger is kept in, and how it is written.
 *
 * Each save keeps its money in the currency of the country the character
 * started in, the way a real bank account is held in one currency whoever
 * holds it and wherever they later go: somebody starting out in Mosfellsbær is
 * paid and billed in krónur. `SaveMeta.currency` records it, and every
 * figure is written with the currency passed in by the caller, never a
 * module-wide one: a save's currency is the save's, and there is no shared
 * mutable state between saves (`SaveUniverse`).
 *
 * It was the euro for every save until schema 89, and before that the dollar
 * by accident: this formatter was written against USD while everything that
 * reasoned about money came out in euros, and on one boot fourteen of
 * fourteen money-bearing notifications said € while the panel beside them
 * said $ for the same number. A save from before 89 keeps the euros it was
 * written in (`DEFAULT_LEDGER_CURRENCY`).
 *
 * Minor units are always hundredths of the unit, even for currencies written
 * without decimals, so the ledger's arithmetic never changes with the money;
 * only the writing does. How each currency is written is `content/currency.ts`.
 *
 * NOT to be confused with the gazetteer's own unit. `content/currency.ts`
 * carries `unitsPerUsd` for the currencies it has rates for, and the atlas's
 * rents and cost-of-living figures are quoted in US dollars. They become a
 * save's currency only through `exchange` there.
 */
export const DEFAULT_LEDGER_CURRENCY = 'EUR';

/**
 * An amount as a person types it, in cents: "12.50", "12,50", "1,000.50",
 * "1.000,50", "1 000", "1'000". Where both a comma and a point appear, the
 * later is the decimal mark; where one appears once with one or two digits
 * after it, it's the decimal mark, and otherwise it groups thousands. Until
 * 2026-09-27 every field dropped the comma, and "12,50", as a euro or a króna
 * is typed, was read as 1,250.
 */
export function centsFromTyped(typed: string): Money {
  const text = typed.replace(/[^\d.,]/g, '');
  const comma = text.lastIndexOf(',');
  const point = text.lastIndexOf('.');
  let mark: ',' | '.' | undefined;
  if (comma >= 0 && point >= 0) mark = comma > point ? ',' : '.';
  else {
    const one = comma >= 0 ? ',' : point >= 0 ? '.' : undefined;
    if (one && text.split(one).length === 2 && /^\d{1,2}$/.test(text.slice(text.lastIndexOf(one) + 1))) mark = one;
  }
  const [whole, fraction = ''] = mark ? [text.slice(0, text.lastIndexOf(mark)), text.slice(text.lastIndexOf(mark) + 1)] : [text, ''];
  const value = Number(`${whole.replace(/[.,]/g, '') || '0'}.${fraction.replace(/[.,]/g, '') || '0'}`);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

export function formatMoney(cents: Money, currency: string, opts: { cents?: boolean } = {}): string {
  const info = currencyInfo(currency);
  const showCents = opts.cents ?? Math.abs(cents) < 100_000_00;
  const digits = showCents ? info.decimals : 0;
  const number = (Math.abs(cents) / 100).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const sign = cents < 0 ? '-' : '';
  return info.symbolAfter ? `${sign}${number} ${info.symbol}` : `${sign}${info.symbol}${number}`;
}

/** Compact display for large sums: €1.2M, €340K, 4.8B kr. */
export function formatMoneyCompact(cents: Money, currency: string): string {
  const info = currencyInfo(currency);
  const v = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  const put = (n: string) => (info.symbolAfter ? `${sign}${n} ${info.symbol}` : `${sign}${info.symbol}${n}`);
  if (v >= 1_000_000_000) return put(`${(v / 1_000_000_000).toFixed(v >= 10_000_000_000 ? 0 : 1)}B`);
  if (v >= 1_000_000) return put(`${(v / 1_000_000).toFixed(v >= 10_000_000 ? 0 : 1)}M`);
  if (v >= 10_000) return put(`${Math.round(v / 1000)}K`);
  return formatMoney(cents, currency, { cents: v < 100 });
}

/** The symbol a currency is written with, on its own. */
export function currencySymbol(currency: string): string {
  return currencyInfo(currency).symbol;
}

/** The currency a save's money is kept in, euros for one from before 89. */
export function saveCurrency(universe: { meta: { currency?: string } }): string {
  return universe.meta.currency ?? DEFAULT_LEDGER_CURRENCY;
}
