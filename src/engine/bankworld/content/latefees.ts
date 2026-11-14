/**
 * SLATE — late fees set as a share, bank by bank.
 *
 * Most cards charge a flat late fee (`CardProduct.lateFee`). These banks set
 * theirs as a share of something: the minimum due, the balance, or the part
 * of the minimum left unpaid, often with a floor, a cap or both. Each is from
 * the bank's own terms as the card research read them on 2026-09-26
 * (`probe/cards/out-*.jsonl`); until 2026-09-27 only the floor or the cap had
 * been kept, as a flat fee, and some cards had no late fee at all.
 *
 * Amounts are in the card's currency, in hundredths. A rule whose base the
 * terms don't name ("late fee 6%") isn't here; those cards keep the flat fee
 * or SLATE's estimate.
 */

import type { Money } from '../core/money';

export interface LateFeeRule {
  /** The share, and what it's a share of: the minimum due, the statement's balance, or what of the minimum went unpaid. */
  share: number;
  of: 'minimum' | 'balance' | 'unpaid';
  /** A fixed sum on top (Sohar's 3 rials). */
  fixed?: Money;
  min?: Money;
  max?: Money;
  /** Never more than the minimum it was late on. */
  notOverMinimum?: boolean;
}

/** By bank id. */
export const LATE_FEE_RULES: Readonly<Record<string, LateFeeRule>> = {
  'hk-bank-of-china': { share: 0.05, of: 'minimum', min: 230_00, max: 280_00, notOverMinimum: true },
  'hk-standard-chartered': { share: 0.05, of: 'balance', min: 220_00, max: 350_00, notOverMinimum: true },
  // Bank Indonesia's rule for every issuer: 1% of the bill, at most Rp100,000.
  'id-bank-rakyat-indonesia': { share: 0.01, of: 'balance', max: 100_000_00 },
  'id-bank-mandiri': { share: 0.01, of: 'balance', max: 100_000_00 },
  'id-bank-central-asia': { share: 0.01, of: 'balance', max: 100_000_00 },
  'id-bank-negara-indonesia': { share: 0.01, of: 'balance', max: 100_000_00 },
  'ke-kcb-bank': { share: 0.05, of: 'balance' },
  'ke-co-operative-bank-of-kenya': { share: 0.05, of: 'minimum' },
  'mo-bank-of-china': { share: 0.05, of: 'unpaid', min: 10_00, max: 80_00 },
  'mo-banco-nacional-ultramarino': { share: 0.05, of: 'minimum', min: 10_00, max: 100_00 },
  'mo-icbc': { share: 0.05, of: 'minimum', min: 120_00, max: 200_00 },
  'my-cimb-bank': { share: 0.01, of: 'balance', min: 10_00, max: 100_00 },
  'my-public-bank': { share: 0.01, of: 'balance', min: 10_00, max: 100_00 },
  'my-rhb-bank': { share: 0.01, of: 'balance', min: 10_00, max: 100_00 },
  'my-maybank': { share: 0.01, of: 'balance', min: 10_00, max: 100_00 },
  'mu-absa-bank-mauritius': { share: 0.01, of: 'minimum', min: 250_00 },
  'mm-yoma-bank': { share: 0.02, of: 'balance', min: 10_000_00 },
  'nl-rabobank': { share: 0.02, of: 'unpaid' },
  'np-global-ime-bank': { share: 0.01, of: 'balance', min: 300_00, max: 500_00 },
  'ni-bac-nicaragua': { share: 0.01, of: 'unpaid', min: 5_00, max: 10_00 },
  'om-sohar-international': { share: 0.03, of: 'minimum', fixed: 3_00 },
  'pa-banistmo': { share: 0.8, of: 'unpaid', min: 20_00, max: 130_00 },
  'lk-commercial-bank-of-ceylon': { share: 0.025, of: 'minimum', min: 1_000_00 },
  'lk-sampath-bank': { share: 0.05, of: 'minimum', min: 1_200_00 },
  'lk-people-s-bank': { share: 0.05, of: 'minimum', min: 900_00 },
  'vn-agribank': { share: 0.03, of: 'unpaid', min: 50_000_00 },
  'vn-techcombank': { share: 0.06, of: 'unpaid', min: 150_000_00 },
  'tt-republic-bank': { share: 0.032, of: 'minimum', min: 10_00 },
  'bn-standard-chartered': { share: 0.05, of: 'minimum', min: 25_00 },
  'kh-canadia-bank': { share: 0.05, of: 'minimum' },
  'zm-absa-bank-zambia': { share: 0.1, of: 'minimum' },
};

/**
 * A lower late fee the first time, and the card's own `lateFee` for another
 * within six billing periods, as the US safe harbor lets an issuer set them
 * (Reg Z §1026.52(b)(1)(ii)). Citi's agreement: $29, then $40.
 */
export const FIRST_LATE_FEE: Readonly<Record<string, { first: Money; withinPeriods: number }>> = {
  'us-citi': { first: 29_00, withinPeriods: 6 },
};

/**
 * The US safe harbor itself, which binds every US card: a late fee no more
 * than $30, or $41 for another within the next six billing cycles. The
 * CFPB's $8 rule of 2024, which carried a $32 and $43 update with it, was
 * vacated on 15 April 2025, and the annual threshold rules for 2025 and 2026
 * didn't move the penalty fees, so the figures before it stand (Reg Z
 * §1026.52(b)(1)(ii); Consumer Finance Monitor, 8 July 2026). Until
 * 2026-09-28 a US card's own late fee was charged whole the first time.
 */
export const US_SAFE_HARBOR = { first: 30_00, repeat: 41_00, withinPeriods: 6 } as const;

/** A rule's fee, in the card's currency, for a minimum of `due` with `paid` of it paid, on a statement of `balance`. */
export function lateFeeByRule(rule: LateFeeRule, due: Money, paid: Money, balance: Money): Money {
  const base = rule.of === 'minimum' ? due : rule.of === 'unpaid' ? Math.max(0, due - paid) : balance;
  let fee = (rule.fixed ?? 0) + Math.round(base * rule.share);
  if (rule.min !== undefined) fee = Math.max(fee, rule.min);
  if (rule.max !== undefined) fee = Math.min(fee, rule.max);
  if (rule.notOverMinimum) fee = Math.min(fee, due);
  return fee;
}
