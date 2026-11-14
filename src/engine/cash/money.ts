// Canonical money (the owner's v8 package, 03 "Canonical money"; acceptance A05, A08, A09; from November 14, 2026).
// An amount is a currency and a whole number of that currency's minor units: cents for dollars, yen for yen, fils for
// dinars. Nothing here is binary floating point: an amount parsed from what the player typed is built digit by digit, and
// one past JavaScript's safe integers is refused rather than rounded. An exchange rate is a dated fraction, kept on the
// transaction it converted, so a later rate never rewrites a past receipt.
//
// The rest of the engine still counts the game's dollars in whole units (budget.ts money()). toMinor and fromMinor are
// the adapter between the two, and both refuse what would not survive the trip.

export interface CurrencyInfo { code: string; exponent: 0 | 2 | 3; name: string }
/** The currencies the game knows, with ISO 4217's minor-unit exponents. Zero-decimal and three-decimal ones on purpose. */
export const CURRENCIES: Record<string, CurrencyInfo> = Object.fromEntries(([
  ['USD', 2, 'US Dollar'], ['CAD', 2, 'Canadian Dollar'], ['GBP', 2, 'Pound Sterling'], ['EUR', 2, 'Euro'], ['AUD', 2, 'Australian Dollar'],
  ['NZD', 2, 'New Zealand Dollar'], ['CHF', 2, 'Swiss Franc'], ['MXN', 2, 'Mexican Peso'], ['BRL', 2, 'Brazilian Real'], ['INR', 2, 'Indian Rupee'],
  ['ZAR', 2, 'South African Rand'], ['NGN', 2, 'Nigerian Naira'], ['SEK', 2, 'Swedish Krona'], ['NOK', 2, 'Norwegian Krone'], ['DKK', 2, 'Danish Krone'],
  ['JPY', 0, 'Japanese Yen'], ['KRW', 0, 'South Korean Won'], ['ISK', 0, 'Icelandic Krona'],
  ['KWD', 3, 'Kuwaiti Dinar'], ['BHD', 3, 'Bahraini Dinar'], ['JOD', 3, 'Jordanian Dinar'],
] as const).map(([code, exponent, name]) => [code, { code, exponent, name }]));

export const MAX_MINOR = Number.MAX_SAFE_INTEGER;
export interface Money { currency: string; minor: number }

export function currencyInfo(code: string): CurrencyInfo {
  const c = CURRENCIES[code];
  if (!c) throw new Error(`Unknown currency: ${code}.`);
  return c;
}

/** A safe whole number of minor units, or an error. Every amount that enters a transaction passes this. */
export function checkMinor(minor: number): void {
  if (!Number.isSafeInteger(minor)) throw new Error(Number.isInteger(minor) ? 'That amount is too large to hold exactly.' : 'An amount must be a whole number of the smallest unit.');
}

// The input contract: en-US digits, optional thousands commas in groups of three, an optional decimal point. No sign, no
// exponent, no spaces inside, no European "1.000,50" (the ambiguous mixed case refuses rather than guesses).
const AMOUNT = /^(?:0|[1-9]\d*|[1-9]\d{0,2}(?:,\d{3})+)(?:\.(\d+))?$/;

export type Parsed = { ok: true; minor: number } | { ok: false; reason: string };
/** What the player typed, as minor units of `currency`, or why it can't be. "20000", "20,000" and "2,000,000.00" all parse. */
export function parseAmount(text: string, currency: string): Parsed {
  const { exponent, name } = currencyInfo(currency);
  const t = typeof text === 'string' ? text.trim().replace(/^\$/, '') : '';
  if (t === '') return { ok: false, reason: 'Enter an amount.' };
  if (/^-/.test(t)) return { ok: false, reason: 'An amount can\'t be negative.' };
  if (/[eE]/.test(t) || /infinity|nan/i.test(t)) return { ok: false, reason: 'Write the amount out in digits.' };
  const m = AMOUNT.exec(t);
  if (!m) return { ok: false, reason: /\d\.\d{3},/.test(t) || /,\d{1,2}$/.test(t) ? 'Use a point for decimals and commas for thousands, like 2,000,000.50.' : 'Write the amount in digits, with commas only between thousands, like 2,000,000.' };
  const frac = m[1] ?? '';
  if (frac.length > exponent) return { ok: false, reason: exponent === 0 ? `${name} has no smaller unit: enter a whole amount.` : `${name} has ${exponent} decimal places at most.` };
  const whole = t.split('.')[0].replace(/,/g, '');
  // Built as a BigInt so an amount past the safe range is caught, never rounded on the way in.
  const big = BigInt(whole) * 10n ** BigInt(exponent) + BigInt((frac.padEnd(exponent, '0')) || '0');
  if (big > BigInt(MAX_MINOR)) return { ok: false, reason: 'That amount is too large.' };
  return { ok: true, minor: Number(big) };
}

/** Minor units as the player reads them: "$2,000,000.00", "¥1,500", "KWD 1.250". */
export function formatMoney(m: Money, opts: { cents?: 'always' | 'when-any' } = {}): string {
  const { exponent } = currencyInfo(m.currency);
  checkMinor(m.minor);
  const neg = m.minor < 0;
  const abs = BigInt(Math.abs(m.minor));
  const scale = 10n ** BigInt(exponent);
  const whole = (abs / scale).toLocaleString('en-US');
  const fracN = abs % scale;
  const showFrac = exponent > 0 && (opts.cents === 'always' || fracN !== 0n);
  const body = showFrac ? `${whole}.${fracN.toString().padStart(exponent, '0')}` : whole;
  const sym = SYMBOLS[m.currency];
  return `${neg ? '-' : ''}${sym ?? `${m.currency} `}${body}`;
}
const SYMBOLS: Record<string, string> = { USD: '$', GBP: '£', EUR: '€', JPY: '¥' };

/** The adapter from the engine's whole units to minor units. Refuses a fraction rather than rounding it away. */
export function toMinor(units: number, currency = 'USD'): number {
  const { exponent } = currencyInfo(currency);
  if (!Number.isFinite(units)) throw new Error('An amount must be a number.');
  const minor = Math.round(units * 10 ** exponent);
  checkMinor(minor);
  return minor;
}
/** The adapter back to whole units, for the parts of the engine that still count them. Exact for whole-unit amounts. */
export function fromMinor(minor: number, currency = 'USD'): number {
  checkMinor(minor);
  return minor / 10 ** currencyInfo(currency).exponent;
}

export function addMinor(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`${a.currency} and ${b.currency} can't be added without an exchange.`);
  const minor = a.minor + b.minor;
  checkMinor(minor);
  return { currency: a.currency, minor };
}

/**
 * A dated exchange rate: `num / den` units of `to` for one unit of `from`, as integers, so the arithmetic is exact. It is
 * not purchasing-power parity and never stands in for one.
 */
export interface Rate { from: string; to: string; num: number; den: number; asOf: string; source: string }

/**
 * Convert an amount at a rate, rounding the result half away from zero to `to`'s minor unit once. Everything that
 * decided the result (the rate, its date, the rounding) is returned to be kept on the transaction.
 */
export function convert(amount: Money, rate: Rate): { target: Money; rate: Rate; rounding: 'half-away-from-zero' } {
  if (amount.currency !== rate.from) throw new Error(`This rate converts ${rate.from}, not ${amount.currency}.`);
  if (!(Number.isSafeInteger(rate.num) && Number.isSafeInteger(rate.den) && rate.num > 0 && rate.den > 0)) throw new Error('A rate is a positive fraction of whole numbers.');
  const ef = currencyInfo(rate.from).exponent;
  const et = currencyInfo(rate.to).exponent;
  // target minor = amount minor × num/den × 10^(et − ef), computed in BigInt and rounded once.
  const n = BigInt(amount.minor) * BigInt(rate.num) * 10n ** BigInt(Math.max(0, et - ef));
  const d = BigInt(rate.den) * 10n ** BigInt(Math.max(0, ef - et));
  const neg = n < 0n;
  const abs = neg ? -n : n;
  let q = abs / d;
  if ((abs % d) * 2n >= d) q += 1n;
  const minor = Number(neg ? -q : q);
  checkMinor(minor);
  return { target: { currency: rate.to, minor }, rate: { ...rate }, rounding: 'half-away-from-zero' };
}

/**
 * The date a monthly charge falls due in a given month, anchored on the day it began: Jan 31 → Feb 28 (or 29) → Mar 31.
 * `anchor` and the result are YYYY-MM-DD; `offset` counts months from the anchor's.
 */
export function monthlyDue(anchor: string, offset: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
  if (!m || !Number.isInteger(offset)) throw new Error('A monthly charge needs a YYYY-MM-DD anchor and a whole month offset.');
  const total = Number(m[1]) * 12 + Number(m[2]) - 1 + offset;
  const y = Math.floor(total / 12);
  const mo = total - y * 12 + 1;
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  const d = Math.min(Number(m[3]), last);
  return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
/** The period id a monthly obligation is paid for: one payment per id, ever. */
export const periodId = (due: string) => due.slice(0, 7);
