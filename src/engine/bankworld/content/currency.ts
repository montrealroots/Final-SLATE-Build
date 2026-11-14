/**
 * SLATE — money as each country writes it.
 *
 * The ledger is kept in one unit so that money is conserved to the cent. But
 * a player standing in Tokyo is looking at prices in yen, and a place does
 * not feel like itself until its money looks like its money. This knows how
 * each currency is written — its symbol, where the symbol goes, how many
 * decimals — and carries SLATE's calibrated exchange rates for the currencies
 * anyone is likely to stand in front of.
 *
 * Honesty about the rates: they are estimates SLATE was calibrated with, not
 * a live market. They move in the real world every second and here they do
 * not, and the UI says so where they are shown. A currency with no rate on
 * file is shown by its name and code, never with a made-up number.
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  /** Whether the symbol goes after the number, as with "12 kr". */
  symbolAfter: boolean;
  /** Minor-unit decimals shown, 0 for yen-like currencies. */
  decimals: number;
  /** Units of this currency per one US dollar, or nothing if not on file. */
  unitsPerUsd?: number;
}

export const RATES_NOTE = 'Exchange rates are reference rates from dated records, not a bank\'s price or a live market.';

const SYMBOLS: Record<string, [symbol: string, after?: boolean, decimals?: number]> = {
  USD: ['$'], EUR: ['€'], GBP: ['£'], JPY: ['¥', false, 0], CNY: ['¥'], INR: ['₹'], KRW: ['₩', false, 0],
  RUB: ['₽'], TRY: ['₺'], ILS: ['₪'], PHP: ['₱'], VND: ['₫', true, 0], THB: ['฿'], BRL: ['R$'], ZAR: ['R'],
  NGN: ['₦'], EGP: ['E£'], AED: ['د.إ', true], SAR: ['﷼', true], QAR: ['QR', true], KWD: ['KD', true, 3],
  BHD: ['BD', true, 3], OMR: ['﷼', true, 3], JOD: ['JD', true, 3], IQD: ['ع.د', true, 0], IRR: ['﷼', true, 0],
  LBP: ['L£', false, 0], YER: ['﷼', true, 0], PLN: ['zł', true], CZK: ['Kč', true], HUF: ['Ft', true, 0],
  SEK: ['kr', true], NOK: ['kr', true], DKK: ['kr', true], ISK: ['kr', true, 0], CHF: ['CHF', true],
  RON: ['lei', true], BGN: ['лв', true], UAH: ['₴'], KZT: ['₸'], UZS: ["so'm", true, 0], GEL: ['₾'],
  AMD: ['֏', true, 0], AZN: ['₼'], MNT: ['₮', false, 0],
  SGD: ['S$'], HKD: ['HK$'], TWD: ['NT$', false, 0], MYR: ['RM'], IDR: ['Rp', false, 0], PKR: ['₨', false, 0],
  BDT: ['৳'], LKR: ['Rs', false, 0], NPR: ['₨', false, 0], MMK: ['K', false, 0], KHR: ['៛', true, 0],
  LAK: ['₭', false, 0], MVR: ['Rf'], BTN: ['Nu'],
  CAD: ['C$'], AUD: ['A$'], NZD: ['NZ$'], MXN: ['MX$'], ARS: ['$'], CLP: ['$', false, 0], COP: ['$', false, 0],
  PEN: ['S/'], UYU: ['$U'], PYG: ['₲', false, 0], BOB: ['Bs'], VES: ['Bs.'], DOP: ['RD$'], HTG: ['G'],
  JMD: ['J$'], TTD: ['TT$'], BSD: ['B$'], CRC: ['₡', false, 0], GTQ: ['Q'], HNL: ['L'], NIO: ['C$'],
  PAB: ['B/.'], CUP: ['$'],
  KES: ['KSh'], TZS: ['TSh', false, 0], UGX: ['USh', false, 0], ETB: ['Br'], GHS: ['₵'], XOF: ['CFA', true, 0],
  XAF: ['FCFA', true, 0], MAD: ['MAD', true], TND: ['DT', true, 3], DZD: ['DA', true], ZMW: ['ZK'],
  RWF: ['RF', true, 0], MWK: ['MK'], MZN: ['MT'], NAD: ['N$'], BWP: ['P'], LSL: ['L'], SZL: ['E'],
  AOA: ['Kz'], CDF: ['FC', true], SDG: ['ج.س.', true], LYD: ['LD', true, 3], MUR: ['₨'], SCR: ['SR'],
  XPF: ['₣', true, 0], FJD: ['FJ$'], PGK: ['K'], WST: ['WS$'], TOP: ['T$'], VUV: ['VT', true, 0],
};

// SLATE (from November 14, 2026; the owner's command, 3 "Restore exchange"): the rates are SLATE-REBUILD's dated records
// (data/rates/rates.json, from SLATE-REBUILD at 88256bf, its sources in data/rates/sources), each currency's units per
// US dollar from the day its source gives it, each holding until the next. Until then they were 1221's one fixed table,
// which no longer converts anything. A rate is used only from its effective date, so nothing is known before it is in
// force. The records are quarterly; they are reference rates, never a price a bank gives. See docs/v9/FX.md.
import RATE_DATA from '../data/rates/rates.json';

interface Step { from: string; perUSD: string }
const SERIES = (RATE_DATA as { currencies: Record<string, { fact: string; rates: Step[] }> }).currencies;

/** The last day the records hold a rate for. Past it, the last rate is held, not extended, and said to be stale. */
export const LAST_OBSERVATION = Object.values(SERIES).flatMap((s) => s.rates.map((r) => r.from)).sort().at(-1)!;
/** How many days a quarterly rate is current for before it reads as stale: one quarter and a week's grace. */
export const STALE_AFTER_DAYS = 99;

let rateDay = '2026-01-01';
/** The game's date the rates are read on (YYYY-MM-DD), set by the bank as its days pass (index.ts). */
export function setRateDay(day: string): void { rateDay = day; }
export const currentRateDay = (): string => rateDay;

export interface ReferenceRate {
  currency: string;
  /** Units per US dollar, as the record writes it. */
  perUSD: string;
  /** The day it took effect; the record gives no other observation or publication day (docs/v9/FX.md). */
  effective: string;
  source: string;
  /** Older than a quarter on the day read: the newest record there is, held. */
  stale: boolean;
}

const dayNumber = (d: string) => Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10))) / 86_400_000;

/** A currency's reference rate on a day: the last in force by then, or nothing before its first or for one not recorded. */
export function referenceRate(code: string, day: string = rateDay): ReferenceRate | undefined {
  const c = code.toUpperCase();
  if (c === 'USD') return { currency: 'USD', perUSD: '1', effective: day, source: 'the unit', stale: false };
  const s = SERIES[c];
  const step = s?.rates.filter((r) => r.from <= day).at(-1);
  if (!s || !step) return undefined;
  return { currency: c, perUSD: step.perUSD, effective: step.from, source: s.fact, stale: dayNumber(day) - dayNumber(step.from) > STALE_AFTER_DAYS };
}

const unitsOn = (code: string, day: string): number | undefined => {
  const r = referenceRate(code, day);
  return r ? Number(r.perUSD) : undefined;
};

export function currencyInfo(code: string): CurrencyInfo {
  const upper = code.toUpperCase();
  const [symbol, after, decimals] = SYMBOLS[upper] ?? [upper, true, 2];
  const info: CurrencyInfo = { code: upper, symbol, symbolAfter: after ?? false, decimals: decimals ?? 2 };
  const rate = unitsOn(upper, rateDay);
  if (rate !== undefined) info.unitsPerUsd = rate;
  return info;
}

/**
 * An amount in one currency, in another, at SLATE's rates (see RATES_NOTE).
 *
 * Minor units in, minor units out, rounded once. Nothing when either side has
 * no rate: a conversion nobody can stand behind is not made at all.
 */
export function exchange(cents: number, from: string, to: string, day: string = rateDay): number | undefined {
  if (from.toUpperCase() === to.toUpperCase()) return cents;
  const a = unitsOn(from, day);
  const b = unitsOn(to, day);
  if (a === undefined || b === undefined) return undefined;
  return Math.round((cents / a) * b);
}

/**
 * The same, into what a bank in that currency holds: whole units where it has no minor unit, the yen, the won, the
 * króna (from 2026-10-16: until then every conversion from cents into yen landed on ¥1.50 steps, and an account kept at
 * home at a Japanese bank held half-yen no bank has, its lines on screen, each rounded, not adding to its balance).
 */
export function exchangeHeld(cents: number, from: string, to: string): number | undefined {
  const out = exchange(cents, from, to);
  return out !== undefined && currencyInfo(to).decimals === 0 ? Math.round(out / 100) * 100 : out;
}

/** Whether SLATE can convert into this currency at all. */
export function hasRate(code: string, day: string = rateDay): boolean {
  return referenceRate(code, day) !== undefined;
}

/**
 * An amount held in the ledger's cents, written in a local currency.
 *
 * Returns nothing when there is no rate, so a caller can fall back to the
 * ledger's own unit rather than show a number nobody stands behind.
 */
export function formatLocal(cents: number, code: string): string | undefined {
  const info = currencyInfo(code);
  if (info.unitsPerUsd === undefined) return undefined;
  const amount = (cents / 100) * info.unitsPerUsd;
  const rounded = info.decimals === 0 ? Math.round(amount) : amount;
  const number = rounded.toLocaleString('en-US', {
    minimumFractionDigits: info.decimals === 0 ? 0 : 2,
    maximumFractionDigits: info.decimals === 0 ? 0 : 2,
  });
  return info.symbolAfter ? `${number} ${info.symbol}` : `${info.symbol}${number}`;
}

/** A compact local amount: "¥182,000", "€1.4K". */
export function formatLocalCompact(cents: number, code: string): string | undefined {
  const info = currencyInfo(code);
  if (info.unitsPerUsd === undefined) return undefined;
  const amount = (cents / 100) * info.unitsPerUsd;
  const abs = Math.abs(amount);
  const number = abs >= 1_000_000 ? `${(amount / 1_000_000).toFixed(1)}M`
    : abs >= 10_000 ? `${Math.round(amount / 1000)}K`
      : abs >= 1000 ? `${(amount / 1000).toFixed(1)}K`
        : info.decimals === 0 ? String(Math.round(amount)) : amount.toFixed(0);
  return info.symbolAfter ? `${number} ${info.symbol}` : `${info.symbol}${number}`;
}

/** A compact atlas amount in the unit the atlas is quoted in: "$1.4K". */
export function formatAtlasCompact(cents: number): string {
  const v = Math.abs(cents) / 100;
  const sign = cents < 0 ? '-' : '';
  if (v >= 1_000_000) return `${sign}$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${sign}$${Math.round(v / 1000)}K`;
  if (v >= 1000) return `${sign}$${(v / 1000).toFixed(1)}K`;
  return `${sign}$${Math.round(v)}`;
}
