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

export const RATES_NOTE = 'Exchange rates are estimated, not live market rates.';

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

/** Units per US dollar. Calibrated estimates, see RATES_NOTE. */
const RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, JPY: 150, CNY: 7.2, INR: 84, KRW: 1350, RUB: 90, TRY: 33, ILS: 3.7,
  PHP: 57, VND: 25_000, THB: 36, BRL: 5.5, ZAR: 18, NGN: 1550, EGP: 48, AED: 3.67, SAR: 3.75, QAR: 3.64,
  KWD: 0.31, BHD: 0.38, OMR: 0.38, JOD: 0.71, PLN: 4.0, CZK: 23, HUF: 365, SEK: 10.6, NOK: 10.8,
  DKK: 6.9, ISK: 138, CHF: 0.88, RON: 4.6, BGN: 1.8, UAH: 41, KZT: 470, GEL: 2.7,
  SGD: 1.35, HKD: 7.8, TWD: 32, MYR: 4.6, IDR: 15_800, PKR: 278, BDT: 118, LKR: 300, NPR: 134,
  CAD: 1.37, AUD: 1.53, NZD: 1.66, MXN: 18, ARS: 950, CLP: 930, COP: 4100, PEN: 3.75, UYU: 40,
  DOP: 59, JMD: 156, CRC: 520, GTQ: 7.7,
  KES: 129, TZS: 2650, UGX: 3700, ETB: 57, GHS: 15, XOF: 605, XAF: 605, MAD: 10, TND: 3.1, DZD: 134,
  MUR: 46, FJD: 2.25,
};

export function currencyInfo(code: string): CurrencyInfo {
  const upper = code.toUpperCase();
  const [symbol, after, decimals] = SYMBOLS[upper] ?? [upper, true, 2];
  const info: CurrencyInfo = { code: upper, symbol, symbolAfter: after ?? false, decimals: decimals ?? 2 };
  const rate = RATES[upper];
  if (rate !== undefined) info.unitsPerUsd = rate;
  return info;
}

/**
 * An amount in one currency, in another, at SLATE's rates (see RATES_NOTE).
 *
 * Minor units in, minor units out, rounded once. Nothing when either side has
 * no rate: a conversion nobody can stand behind is not made at all.
 */
export function exchange(cents: number, from: string, to: string): number | undefined {
  const a = RATES[from.toUpperCase()];
  const b = RATES[to.toUpperCase()];
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
export function hasRate(code: string): boolean {
  return RATES[code.toUpperCase()] !== undefined;
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
