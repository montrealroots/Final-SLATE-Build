/**
 * SLATE — the fees outside the thirteen that a bank waives on a condition.
 *
 * The research (`banks-world-sheets.ts`) gave 22 monthly fees with their
 * waivers in words, and until 2026-09-25 each was shown and not charged,
 * since words weren't a rule the game could check. Each is a rule here,
 * read from the bank's terms as the research quoted them, and from the
 * bank's own schedule of charges where the research's words left a figure
 * out (Butterfield's in Bermuda and the Cayman Islands, Swedbank
 * Lithuania's Youth Programme, and since 2026-09-28 Swedbank Latvia's
 * packages). A fee whose waiver is for someone SLATE doesn't have (a
 * student, a state employee) is charged in full, as it would be to anyone
 * else, and its source says so.
 *
 * By `ISO|bank name`, in the bank's currency's hundredths. `WaivedBy`
 * conditions are any-one-of; `reduced` lowers the fee rather than waiving it.
 */

import type { Money } from '../core/money';
import type { Product } from './banks';

export const WORLD_FEES: Readonly<Record<string, { monthlyFee: Money; waiver?: Product['waiver']; reduced?: Product['reduced']; deposits?: Product['deposits']; source: string }>> = {
  'BM|Butterfield': {
    monthlyFee: 13_00, waiver: { ageAtLeast: 60 },
    source: 'Butterfield Bermuda Retail Schedule of Charges, January 2026: $10 monthly maintenance and $3 monthly compliance, both waived for seniors, 60 and over',
  },
  'BM|Clarien Bank': {
    monthlyFee: 15_00, waiver: { ageAtLeast: 65 },
    source: 'clarienbank.com bank account fees: $12 monthly maintenance and $3 monthly compliance, seniors exempt; Clarien doesn’t publish the age, so the game estimates 65, Bermuda’s pension age',
  },
  'BQ|Maduro & Curiel\'s Bank (MCB) Bonaire': {
    monthlyFee: 1_50, waiver: { ageAtLeast: 65 },
    source: 'Resident Pension accounts (65 and over) are exempt; student accounts are too, but the game doesn’t open student accounts there',
  },
  'CW|Maduro & Curiel\'s Bank (MCB)': {
    monthlyFee: 5_30, waiver: { ageAtLeast: 65 },
    source: '65-and-over pension accounts are exempt; student accounts are too, but the game doesn’t open student accounts there',
  },
  'BA|UniCredit Bank': {
    monthlyFee: 5_99,
    source: 'waived for students, but the game doesn’t open student accounts there, so it is charged in full',
  },
  'BG|UniCredit Bulbank': {
    monthlyFee: 2_84, waiver: { depositsAtLeast: 1 },
    source: 'free with regular income into the account: any wages paid in during the month',
  },
  'BF|Coris Bank International': {
    monthlyFee: 1_500_00,
    source: 'XOF 500 for state employees; work in the game isn’t for the state, so the game charges the full fee',
  },
  'KY|Butterfield': {
    monthlyFee: 8_00, reduced: { to: 2_00, averageAtLeast: 5_000_00 },
    source: 'Butterfield Cayman Retail Schedule of Charges, updated December 1, 2025: CI$6 monthly maintenance, waived with an average daily balance of CI$5,000, and CI$2 monthly compliance, always',
  },
  'CZ|Česká spořitelna': {
    monthlyFee: 100_00, waiver: { purchasesAtLeast: 4 },
    source: 'waived with at least four card payments in the month',
  },
  'GU|Bank of Guam': {
    deposits: 'electronic', monthlyFee: 5_00, waiver: { depositsAtLeast: 1, ageAtLeast: 55 },
    source: 'waived with e-Statements and an electronic deposit in the month, or at 55 and over; the game’s accounts are online, so the game takes e-Statements as chosen',
  },
  'MH|Bank of Guam': {
    deposits: 'electronic', monthlyFee: 5_00, waiver: { depositsAtLeast: 1 },
    source: 'waived with e-Statements and an electronic deposit in the month; the game takes e-Statements as chosen',
  },
  'FM|Bank of Guam': {
    deposits: 'electronic', monthlyFee: 5_00, waiver: { depositsAtLeast: 1 },
    source: 'waived with e-Statements and an electronic deposit in the month; the game takes e-Statements as chosen',
  },
  'MP|Bank of Guam': {
    deposits: 'electronic', monthlyFee: 5_00, waiver: { depositsAtLeast: 1 },
    source: 'waived with e-Statements and an electronic deposit in the month; the game takes e-Statements as chosen',
  },
  'PW|Bank of Guam': {
    deposits: 'electronic', monthlyFee: 5_00, waiver: { depositsAtLeast: 1 },
    source: 'waived with e-Statements and an electronic deposit in the month; the game takes e-Statements as chosen',
  },
  'HU|OTP Bank': {
    deposits: 'electronic', monthlyFee: 1_082_00, waiver: { depositsAtLeast: 214_662_00 },
    source: 'free in a month when at least the net minimum wage, HUF 214,662 in 2026, is paid in',
  },
  'LV|Swedbank': {
    monthlyFee: 1_70, waiver: { ageBelow: 26 },
    source: 'the Pamata package, EUR 1.70 a month, free from 6 to 25 (swedbank.lv price list, in force from June 1, 2026); the Seniors program’s half off is only for those who joined before September 2022',
  },
  'LT|Swedbank': {
    monthlyFee: 1_70, waiver: { ageBelow: 26 }, reduced: { to: 1_10, depositsAtLeast: 1 },
    source: 'EUR 1.10 a month with a salary paid in; free in the Youth Programme, until the 26th birthday (swedbank.lt)',
  },
  'MA|Attijariwafa bank': {
    monthlyFee: 5_00, waiver: { firstMonths: 6 },
    source: 'the first six months free for a new customer',
  },
  'NF|Commonwealth Bank': {
    deposits: 'electronic', monthlyFee: 4_00, waiver: { depositsAtLeast: 2_000_00, ageBelow: 30 },
    source: 'waived with AUD 2,000 deposited in the month, or under 30',
  },
  'PR|Banco Popular': {
    deposits: 'electronic', monthlyFee: 2_50, waiver: { depositsAtLeast: 1, linkedAverageAtLeast: 500_00, ageBelow: 26 },
    source: 'waived with a direct deposit, a US$500 combined average balance, or at 25 and under',
  },
  'SI|NLB': {
    monthlyFee: 6_99, reduced: { to: 3_50, ageBelow: 30 },
    source: 'half price under 30: €3.495, which the game rounds to €3.50',
  },
  'TG|Orabank Togo': {
    monthlyFee: 1_100_00,
    source: 'XOF 1,000 and 10% TAF, 1,100 in all, charged to everyone',
  },
};
