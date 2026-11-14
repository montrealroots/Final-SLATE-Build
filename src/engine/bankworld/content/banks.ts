/**
 * SLATE — the banks, country by country.
 *
 * Real banks under their own names, with their own account names, fees and
 * savings rates where they publish them, for the thirteen countries SLATE
 * pays and taxes a life in (`BANKING`). Every other country has its biggest
 * banks by name (`WORLD_BANKS` in `banks-world.ts`), and accounts there have
 * no fee and pay the rate the table says, which is none where nothing was
 * found. Each country's deposit guarantee and its central bank's rate were
 * kept here, read by nothing, until 2026-09-27.
 *
 * Every figure says where it came from and when. A figure marked `estimate`
 * is SLATE's own, set from the figures around it, and the screen says so.
 * Rates and fees move; each is as the source had it on the date given.
 */

import type { Money } from '../core/money';
import { COUNTRIES } from './geography';
import { worldBanking } from './banks-world';
import { THIRTEEN } from './banks-thirteen';
import { SHEETS, type SheetProduct } from './banks-world-sheets';
import { IBAN_CODES, IBAN_FORMATS } from './banks-world-iban';
import { WORLD_FEES } from './banks-world-fees';

export type NumberFormat =
  | 'us' | 'ca' | 'mx' | 'gb' | 'ie' | 'is' | 'de' | 'fr' | 'es' | 'jp' | 'kr' | 'au' | 'nz' | 'iban' | 'plain';

export interface Product {
  /** The account's name at the bank, as the bank sells it. */
  name: string;
  /** A month's fee, in the bank's currency's hundredths. Absent: none. */
  monthlyFee?: Money;
  /**
   * Where a bank closes the account each quarter (`closesQuarterly`), when it takes the month's fee from it, by its own
   * terms: at the month's end (`'month'`), or in the month after (`'next'`), posted at the first minute of it. Absent, at
   * the quarter's closing beside the interest. From 2026-10-16 (brief 09's follow-up): until then every German bank's
   * month's fee was taken at the quarter's closing, ING's and Commerzbank's among them.
   */
  feePosts?: 'month' | 'next';
  /**
   * What waives the fee, any one of them: wages paid in during the month, a
   * balance kept all month, an age under or over a line, so many card
   * purchases in the month, or the first months after opening, in the
   * bank's currency's hundredths.
   */
  waiver?: {
    depositsAtLeast?: Money;
    /**
     * What wages paid in also need, over the last so many months: so many
     * bills paid from the account, so many card purchases, or so many of
     * either together.
     */
    depositsAlso?: { bills?: number; purchases?: number; either?: number; months: number };
    balanceAtLeast?: Money;
    /** The month's average daily balance. */
    averageAtLeast?: Money;
    /** The month's average across every current and savings account the person keeps at the bank. */
    linkedAverageAtLeast?: Money;
    ageBelow?: number;
    /** Seniors: an age at or over a line. */
    ageAtLeast?: number;
    /** So many debit card purchases in the month. */
    purchasesAtLeast?: number;
    /** Free for the first so many months after the account opens. */
    firstMonths?: number;
    /**
     * Free in the calendar month the account opens, whatever day (from 2026-10-16: Deutsche Bank's price list, “Die
     * Kontoführung im Eröffnungsmonat ist kostenfrei”, which until then SLATE charged whole).
     */
    openingMonth?: boolean;
  };
  /**
   * A lower fee, not none, for a condition that isn't a full waiver: wages
   * paid in, an age under a line, or an average balance. Until 2026-09-25 a
   * `reducedTo` on the waiver lowered the fee for every way of meeting it,
   * which couldn't say "free under 26, cheaper with wages".
   */
  reduced?: { to: Money; depositsAtLeast?: Money; ageBelow?: number; averageAtLeast?: Money };
  /**
   * What the deposits a waiver or a lower fee asks for can be: wages alone,
   * where the bank asks for a salary or a nómina, or any electronic deposit
   * from outside, where it asks for electronic or direct deposits or money
   * paid in: wages, unemployment benefit, a tax refund. Absent, wages. Until
   * 2026-09-25 only wages counted anywhere, and a laid-off worker claiming
   * paid Chase's fee on benefit Chase itself counts.
   */
  deposits?: 'wages' | 'electronic';
  /** What it pays a year, as a fraction, as its source quotes it (`quoted`). Absent: nothing. */
  rate?: number;
  /**
   * The effective yearly yield its rates are quoted as, where its source names one (from 2026-10-22, the owner's brief 21):
   * an APY (the US), an AER (Britain, Ireland), a TAE (Spain) or a GAT (Mexico), each what a year earns with the interest
   * left in. A day's interest is then worked from the nominal rate that earns it as the account credits it
   * (`nominalRate` in `systems/banking.ts`). Absent, the rate is nominal (Canada's "regular rate", Spain's TIN, the rest's
   * "p.a.", or a figure whose basis its source doesn't name, SLATE's assumption), a day's interest the rate ÷ 365, as
   * every rate ran until then (docs/verification/genre-banking-2026-10-22/banking-sources.md).
   */
  quoted?: 'APY' | 'AER' | 'TAE' | 'GAT';
  /** Compounded daily where its terms say so (Wells Fargo's), a day's interest earning from the next day; else at each crediting. */
  compounds?: 'daily';
  /**
   * Credited once every so many months counted from the day it opened, where its terms say so (Nationwide's and Lloyds'
   * yearly, Bankinter's half-yearly), not at month ends or in set months. From 2026-10-22: until then, monthly.
   */
  creditsEvery?: 6 | 12;
  /** The rate is paid only on a balance of at least this. */
  rateFrom?: Money;
  /** A higher rate for a larger balance, paid on the whole of it, from each tier's floor up. */
  tiers?: readonly { from: Money; rate: number }[];
  /** The rate is paid on the balance up to this, and nothing above it. */
  rateUpTo?: Money;
  /**
   * An introductory rate, in steps counted from the day the account opens:
   * each step's rate for its months, then the product's own rate.
   */
  intro?: readonly { months: number; rate: number }[];
  /** Changes to the rate the bank has announced, from a date (YYYY-MM-DD) on. */
  changes?: readonly { from: string; rate: number }[];
  /** The months interest is paid in, where not every month: [2, 8] for February and August. */
  pays?: readonly number[];
  /**
   * A bonus rate on top, for a month that meets its condition: the balance
   * grew (by `growBy` at least, where given), or nothing was taken out.
   */
  bonus?: { rate: number; when: 'grows' | 'no_withdrawals'; growBy?: Money };
  /** Interest on it isn't taxed: France's Livret A. */
  taxFree?: boolean;
  /** The rate is SLATE's estimate, not the bank's published figure. */
  estimate?: boolean;
  source: string;
  asOf: string;
}

/**
 * A debit card's year (from brief 10, 2026-10-16): when its yearly fee is charged and what a close does with the card year
 * running. Both values settle a close the way Iceland's Act on Payment Services no. 114/2021 art. 57(4) and BGB § 675h(3)
 * do, each carrying Directive (EU) 2015/2366 art. 55(4): a fee paid ahead comes back in proportion, and a regular fee
 * owed after is owed only in proportion to the close.
 *
 * - `paid: 'ahead'`: each charge pays for the card year it opens, the first on the account's first night in the life; on
 *   a close the days of that year left after the closing day come back.
 * - `paid: 'behind'`: each charge pays for the card year it ends, the first year running from the account's first night
 *   in the life; on a close the days of that year used, the closing day among them, are charged.
 * - `length`: 365 days from the year's start (Berliner Sparkasse's, as brief 09 set it), or `'anniversary'`, to the same
 *   date a year on in `zone`'s calendar, the month's last day where that date doesn't exist (a year from 29 February
 *   renews on 28 February), so a year that holds 29 February is 366 days.
 * - `zone`: the calendar the year and a close's days are counted in, the bank's own, and `place`, the town the screen
 *   names it by; the save's home zone where absent.
 * - `simulated`: where the bank's documents don't say when the year is charged, why, in the words the screen and the
 *   guide say after "Estimated:" (until 2026-10-17 "Its timing is SLATE’s simulation, unverified:"); absent where a source settles it.
 * - `law`: the statute the screen names for a close's share, where one was read.
 *
 * A share is the fee × the days ÷ the card year's days, rounded half up once, to the bank's currency's smallest written
 * unit (the cent; the whole króna). Each card year is settled by the value it was opened under (`Account.cardYearRule`),
 * so changing a bank's `paid` never charges or refunds a year twice.
 */
export interface CardYear {
  paid: 'ahead' | 'behind';
  length: 365 | 'anniversary';
  zone?: string;
  place?: string;
  simulated?: string;
  law?: string;
}

export interface Bank {
  id: string;
  name: string;
  /** ISO 3166 alpha-2, upper case. */
  iso: string;
  currency: string;
  format: NumberFormat;
  /** The bank's own code in the country's numbering: routing number, sort code prefix, BLZ, BSB prefix. */
  code: string;
  /** Iceland: the ledger codes a current and a savings account take. */
  currentLedger?: string;
  savingsLedger?: string;
  /** Korea: the account number's groups of digits, which differ by bank. */
  groups?: readonly number[];
  /** An IBAN country's IBAN, where it is another country's (French overseas, the Channel Islands). */
  ibanCountry?: string;
  /** A generic IBAN country's IBAN length. */
  ibanLength?: number;
  /** Its BBAN's structure in the IBAN Registry's notation, and where the bank's code sits in it. */
  bban?: string;
  codeOffset?: number;
  /** How sure the research was of the bank, where it said: high, medium or low. */
  confidence?: 'H' | 'M' | 'L';
  current: Product;
  savings: Product;
  /** How an overdraft works there, in a sentence, where it was found. */
  overdraft?: string;
  /** A fee for a payment the bank returns unpaid, no more often than every so many business days, and none on a small one. */
  returned?: { fee: Money; gapDays: number; ifShortAtLeast?: Money; source: string };
  /**
   * The debit card's fees: a year's, and one a purchase; free under an age, read on the day a fee is charged. `year`:
   * when the year's fee is charged and what a close does with the card year running (`CardYear`), given wherever `yearly`
   * is. Until brief 10 (2026-10-16) it was `ahead`, Berliner Sparkasse's alone, and a card without it, Arion's, was
   * charged on each anniversary of the account's opening or its last charge, 365 days apart, and nothing came back or was
   * charged on a close (docs/verification/remaining-10/arion-result.json).
   */
  card?: { yearly?: Money; perPurchase?: Money; freeUnder?: number; year?: CardYear; source: string };
  /** A fee on an account nobody has used in years, below a balance where the bank says so. */
  dormant?: { yearly: Money; afterYears: number; belowBalance?: Money; source: string };
  /** A fee for a month with too few transactions, spared where wages are paid in. */
  quietMonth?: { fee: Money; minTransactions: number; unlessWages?: boolean; source: string };
}

export interface CountryBanking {
  iso: string;
  banks: readonly Bank[];
  /**
   * Tax a bank takes off interest before paying it: a flat rate, above a
   * yearly allowance where there is one, or a rate by the saver's income.
   */
  interestTax?: {
    rate?: number;
    allowance?: Money;
    brackets?: readonly { upTo?: Money; rate: number }[];
    /** Tax on the first so much of a year's interest, paid back at the assessment: the month and day it lands, and whether the day is SLATE's estimate, which the screen says. */
    refund?: { allowance: Money; month: number; day: number; estimateDate: boolean };
    note: string;
    source: string;
  };
}

export const BANKING: readonly CountryBanking[] = THIRTEEN;

const BY_ISO = new Map<string, CountryBanking>();
const BY_ID = new Map<string, Bank>();
export function addBanking(list: readonly CountryBanking[]): void {
  for (const country of list) {
    BY_ISO.set(country.iso, country);
    for (const bank of country.banks) BY_ID.set(bank.id, bank);
  }
}
addBanking(BANKING);
// Every other country, its banks by name, in its own money, with the
// product sheets the research found (`banks-world-sheets.ts`).
addBanking(withSheets(worldBanking((iso) => COUNTRIES.all().find((c) => c.iso2?.toUpperCase() === iso)?.currency ?? 'USD')));

/** A country's researched rate, tax and products, laid over its banks. */
function withSheets(list: readonly CountryBanking[]): CountryBanking[] {
  return list.map((country) => {
    const sheet = SHEETS[country.iso];
    return {
      ...country,
      interestTax: sheet?.interestTax ?? country.interestTax,
      banks: country.banks.map((one) => {
        // The IBAN's structure and the bank's code in it, where researched.
        const format = one.format === 'iban' ? IBAN_FORMATS[one.ibanCountry ?? one.iso] : undefined;
        const code = IBAN_CODES[`${country.iso}|${one.name}`];
        const bank = format ? { ...one, bban: format.bban, codeOffset: format.offset, code: code?.code ?? '' } : one;
        const found = sheet?.products?.[bank.name];
        if (!found) return bank;
        return {
          ...bank,
          current: found.current ? fromSheet(found.current, WORLD_FEES[`${country.iso}|${bank.name}`]) : bank.current,
          savings: found.savings ? fromSheet(found.savings) : bank.savings,
          confidence: found.confidence,
        };
      }),
    };
  });
}

/**
 * A sheet's product. A fee the research gave with its waiver in words
 * (`statedFee`) is charged with the waiver as a rule from `WORLD_FEES`;
 * `tests/bank-fees.test.ts` fails one that has no rule there.
 */
function fromSheet(sheet: SheetProduct, rule?: (typeof WORLD_FEES)[string]): Product {
  const source = sheet.note ? `${sheet.source}; ${sheet.note}` : sheet.source;
  return {
    name: sheet.name,
    source: rule ? `${source}; ${rule.source}` : source,
    asOf: '2026-09-25',
    ...(sheet.monthlyFee ? { monthlyFee: sheet.monthlyFee } : {}),
    ...(rule ? { monthlyFee: rule.monthlyFee } : {}),
    ...(rule?.waiver ? { waiver: rule.waiver } : {}),
    ...(rule?.reduced ? { reduced: rule.reduced } : {}),
    ...(rule?.deposits ? { deposits: rule.deposits } : {}),
    ...(sheet.rate !== undefined ? { rate: sheet.rate } : {}),
  };
}

export function bankingIn(iso: string): CountryBanking | undefined {
  return BY_ISO.get(iso.toUpperCase());
}

export function banksIn(iso: string): readonly Bank[] {
  return bankingIn(iso)?.banks ?? [];
}

export function bankById(id: string): Bank | undefined {
  return BY_ID.get(id);
}
