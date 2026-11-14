/**
 * SLATE — the bank.
 *
 * Every save opened its accounts at "Northbank", a bank that doesn't exist,
 * whatever the country, and an account there did nothing but hold a number:
 * savings earned nothing, the account cost nothing, and money couldn't be
 * moved from one account to another. Now a person banks with a real bank in
 * the country they live in (`content/banks.ts`), under that bank's own
 * account names, with a number in the country's own format and real check
 * digits (`systems/banknumber.ts`), and the bank does what that bank does:
 *
 * - **Interest.** A savings account earns the bank's published rate where it
 *   publishes one, and the table's estimate where it doesn't; the screen says
 *   which. It builds day by day on what the account holds at the end of each
 *   day and is paid on the last day of the month, less any tax the country
 *   has the bank take first.
 * - **The monthly fee.** A current account that charges one charges it on the
 *   last day of the month, unless the month met the bank's own waiver: wages
 *   paid in by direct deposit, or a balance kept above a line all month.
 * - **Moving money.** Between one's own accounts at a bank, at once, as a
 *   bank's app does it (`bank.transfer`); to one's own account at another
 *   bank, in that bank's days (`systems/bankmoves.ts`, from 2026-10-10); and
 *   a savings account opened or closed (`bank.open_savings`,
 *   `bank.close_savings`).
 *
 * Money still leaves in the order `systems/household.ts` takes it: the
 * current account, then savings, then the card.
 */

import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import type { Person } from '../domain/model';
import { CITIES, COUNTRIES } from '../content/geography';
import { currencyInfo, exchange } from '../content/currency';
import { addMonths, dateKey, daysInMonth, formatDate, instantFromZoned, zonedParts, MONTH_NAMES, MS_DAY, type Instant } from '../core/time';
import { spokenList } from '../core/text';
import { bankById, bankingIn, banksIn, type Bank, type CardYear, type Product } from '../content/banks';
import { OPENING } from '../content/bankopening';
import { ageOn } from './mortality';
import { accountNumber } from './banknumber';
import { ACCOUNT_LIFE } from '../content/accountlife';
import { statementReady } from './statements';
import { savingsLeftThisMonth } from './cash';
import type { ScheduledItem } from '../core/scheduler';
import { savingsDebit } from './accountlife';
import { recordInterest } from './earnings';
import { marksFallOff } from './credit';
import { checkingAt } from './lending';
import { sendBetweenBanks, usPerson } from './bankmoves';
import { abroadRefusal, balanceText, chargeAbroadFee, heldOf, nonResidentFeeDue, nonResidentTaxOn } from './abroad';
import type { StandingOrder } from './payments';

export const MONTH_END_KIND = 'bank.month_end';

/** A current account or an easy-access savings account: not a term deposit, not a loan. */
export function isEveryday(account: Account): boolean {
  return (account.kind === 'checking' || account.kind === 'savings') && account.category !== 'term';
}

/** A person's open current and savings accounts. */
export function bankAccountsOf(sim: Simulation, person: Person): Account[] {
  return Object.values(sim.universe.accounts).filter(
    (a) => a.ownerId === person.id && !a.nominal && !a.closedAt && isEveryday(a),
  );
}

/** The bank a person keeps their current account with. */
export function bankOf(sim: Simulation, person: Person): Bank | undefined {
  const current = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
  return current?.bankId ? bankById(current.bankId) : undefined;
}

/** A town's country as ISO 3166 alpha-2. */
export function isoOf(cityId: string): string | undefined {
  const city = CITIES.get(cityId);
  return city ? COUNTRIES.get(city.countryId)?.iso2?.toUpperCase() : undefined;
}

/** The banks a new life in a town can choose from. */
export function banksFor(cityId: string): readonly Bank[] {
  const iso = isoOf(cityId);
  return iso ? banksIn(iso) : [];
}

/**
 * The bank a new life starts with: the one chosen, or the country's first; and for somebody who isn't a US citizen, one
 * that opens for them (from 2026-10-10: Capital One and Citi online are for US persons, `OPENING`).
 */
export function startingBank(cityId: string, chosen?: string, usPerson = true): Bank | undefined {
  // At creation nobody holds a green card yet, so a US person here is a citizen.
  const banks = banksFor(cityId).filter((b) => usPerson || !OPENING[b.id]?.usPersonsOnly);
  return banks.find((b) => b.id === chosen) ?? banks[0];
}

/** An amount in a bank's currency, in the save's money. */
export function inSaveMoney(sim: Simulation, amount: Money, currency: string): Money {
  const into = saveCurrency(sim.universe);
  if (currency === into) return amount;
  return exchange(amount, currency, into) ?? amount;
}

/**
 * Opens a current account, and savings when there's money to put in it, at a
 * bank: the first thing a new life does with money.
 */
export function openAt(sim: Simulation, person: Person, bank: Bank, balances: { checking: Money; savings: Money }): void {
  const current = openOne(sim, person, bank, 'checking', balances.checking);
  person.primaryAccountId = current.id;
  if (balances.savings > 0) openOne(sim, person, bank, 'savings', balances.savings);
}

export function openOne(sim: Simulation, person: Person, bank: Bank, kind: 'checking' | 'savings', balance: Money): Account {
  const product = kind === 'checking' ? bank.current : bank.savings;
  const number = accountNumber(sim, person, bank, kind);
  return sim.openAccount({
    id: sim.nextId('account'),
    kind,
    name: product.name,
    ownerId: person.id,
    institution: bank.name,
    bankId: bank.id,
    number,
    last4: number.replace(/\D/g, '').slice(-4),
    openedAt: sim.now,
    balance,
    monthOpen: balance,
  });
}

/** The product an account is at its bank. */
export function productOf(account: Account): Product | undefined {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  if (!bank) return undefined;
  return account.kind === 'savings' ? bank.savings : bank.current;
}

/** What an account's product pays a year on a day, with any change the bank announced for it. */
export function rateOn(product: Product | undefined, at: Instant, zone = 'UTC'): number {
  if (!product) return 0;
  let rate = product.rate ?? 0;
  const day = dateKey(at, zone);
  for (const change of product.changes ?? []) if (day >= change.from) rate = change.rate;
  return rate;
}

/**
 * What an account pays a year now: its introductory step while one runs,
 * counted in whole months from the day it opened, and the product's own
 * rate, with any change announced, after.
 */
export function rateOf(sim: Simulation, account: Account): number {
  const product = productOf(account);
  const step = introStep(sim, product, account.openedAt, sim.now);
  return step ?? rateOn(product, sim.now, sim.homeZone);
}

/**
 * How many times a year an account's interest is credited: once every `creditsEvery` months from its opening, in the
 * bank's months (`pays`), at Germany's quarterly closing, or each month's end.
 */
export function creditsPerYear(product: Product | undefined, account: Account): number {
  if (product?.creditsEvery) return 12 / product.creditsEvery;
  if (product?.pays) return product.pays.length;
  return closesQuarterly(account) ? 4 : 12;
}

/**
 * The nominal yearly rate a day's interest is worked from (from 2026-10-22, the owner's brief 21). A rate quoted as a
 * yield (`Product.quoted`: an APY, AER, TAE or GAT) is what a year earns with the interest left in, so it's the nominal
 * rate r that earns it as the account credits it, m times a year: r = m × ((1 + y)^(1/m) − 1); compounded daily, m is
 * 365. A nominal rate is itself. Until then every rate ran as nominal, so Capital One's 3.00% APY, credited monthly,
 * paid (1 + 0.03/12)^12 − 1 = 3.0416% a year, and Nationwide's 2.30% AER, credited monthly where the bank credits it
 * yearly, 2.3233%.
 */
export function nominalRate(product: Product | undefined, account: Account, quoted: number): number {
  return nominalOf(product, quoted, creditsPerYear(product, account));
}

/** The same, for a product credited so many times a year (`nominalRate`). */
export function nominalOf(product: Product | undefined, quoted: number, perYear: number): number {
  if (!product?.quoted || quoted <= 0) return quoted;
  const m = product.compounds === 'daily' ? 365 : perYear;
  return m * ((1 + quoted) ** (1 / m) - 1);
}

/**
 * Whether a product credited from its opening day (`creditsEvery`) credits on a day: a whole number of its periods on,
 * on the opening's day of the month, or the month's last day where that day doesn't exist (from 2026-10-22).
 */
export function creditsOn(product: Product | undefined, openedAt: Instant, at: Instant, zone: string): boolean {
  if (!product?.creditsEvery) return false;
  const a = zonedParts(openedAt, zone);
  const b = zonedParts(at, zone);
  const months = (b.year - a.year) * 12 + (b.month - a.month);
  if (months <= 0 || months % product.creditsEvery !== 0) return false;
  return b.day === Math.min(a.day, new Date(Date.UTC(b.year, b.month, 0)).getUTCDate());
}

/** The rate a tiered account pays on a balance, where the balance reaches a tier. */
export function tierRate(product: Product | undefined, account: Account, balance: Money, inSave: (bankMoney: Money) => Money = (x) => x): number | undefined {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  if (!product?.tiers || !bank) return undefined;
  let rate: number | undefined;
  for (const tier of product.tiers) if (balance >= inSave(tier.from)) rate = tier.rate;
  return rate;
}

/** The introductory rate running at a moment, for an account opened at another. */
export function introStep(sim: Simulation, product: Product | undefined, openedAt: Instant, at: Instant): number | undefined {
  if (!product?.intro) return undefined;
  const a = zonedParts(openedAt, sim.homeZone);
  const b = zonedParts(at, sim.homeZone);
  const months = (b.year - a.year) * 12 + (b.month - a.month) - (b.day < a.day ? 1 : 0);
  let through = 0;
  for (const step of product.intro) {
    through += step.months;
    if (months < through) return step.rate;
  }
  return undefined;
}

/**
 * The part of a balance a rate is paid on: none below the product's floor,
 * and no more than its cap.
 */
export function earningBalance(product: Product | undefined, balance: Money, inSave: (bankMoney: Money) => Money = (x) => x): Money {
  if (!product || balance <= 0) return 0;
  if (product.rateFrom !== undefined && balance < inSave(product.rateFrom)) return 0;
  return product.rateUpTo !== undefined ? Math.min(balance, inSave(product.rateUpTo)) : balance;
}

/** The first moment of the month an instant is in, where the save keeps time. */
export function monthStartOf(sim: Simulation, at: Instant): Instant {
  const p = zonedParts(at, sim.homeZone);
  return instantFromZoned({ year: p.year, month: p.month, day: 1, hour: 0 }, sim.homeZone);
}

/** Eleven at night on the last day of the month, the first one after an instant. */
export function monthEndAfter(sim: Simulation, after: Instant): Instant {
  const p = zonedParts(after, sim.homeZone);
  let year = p.year;
  let month = p.month;
  for (;;) {
    const at = instantFromZoned({ year, month, day: daysInMonth(year, month), hour: 23 }, sim.homeZone);
    if (at > after) return at;
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
}

/** What a bank counts as a deposit, by what the product asks (`Product.deposits`). */
const ELECTRONIC = new Set(['salary', 'benefit', 'tax']);

/** Deposits into an account since a moment that a bank counts: wages, or any electronic deposit from outside. */
export function directDeposits(sim: Simulation, account: Account, since: Instant, counts: 'wages' | 'electronic' = 'wages'): Money {
  let total = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < since) break;
    if (counts === 'electronic' ? !ELECTRONIC.has(t.category) : t.category !== 'salary') continue;
    for (const p of t.postings) if (p.accountId === account.id && p.amount > 0) total += p.amount;
  }
  return total;
}

/**
 * The month's fee on an account, in the save's money: none when the account
 * has none or the month met its waiver, and what met it.
 */
export type WaivedBy = 'deposits' | 'balance' | 'age' | 'purchases' | 'new';

/**
 * The fee in the bank's own figure as well (`native`), on an account in another currency (from 2026-10-16): the bank
 * charges €6.90, and a figure converted back from the save's money can be a unit off where its money is finer than a
 * cent, the won's and the yen's.
 */
export function feeFor(sim: Simulation, account: Account, monthStart: Instant): { fee: Money; waivedBy?: WaivedBy; native?: Money } {
  const product = productOf(account);
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  // A second-chance account is its own product, and its own fee is charged on the first (`systems/lending.ts`); until 2026-09-27 it paid the ordinary account's beside it.
  if (!product?.monthlyFee || !bank || account.secondChance) return { fee: 0 };
  const waiver = product.waiver;
  const met = (by: WaivedBy) => ({ fee: 0, waivedBy: by });
  const owner = sim.universe.people[account.ownerId];
  const age = owner ? ageOn(sim, owner, sim.now) : undefined;
  if (waiver?.ageBelow !== undefined && age !== undefined && age < waiver.ageBelow) return met('age');
  if (waiver?.ageAtLeast !== undefined && age !== undefined && age >= waiver.ageAtLeast) return met('age');
  if (waiver?.firstMonths !== undefined && monthStart < addMonths(account.openedAt, waiver.firstMonths, sim.homeZone)) return met('new');
  // The calendar month it opened in (from 2026-10-16, Deutsche Bank's price list): until then charged whole.
  if (waiver?.openingMonth && monthStartOf(sim, account.openedAt) === monthStart) return met('new');
  if (waiver?.purchasesAtLeast !== undefined && purchasesSince(sim, account, monthStart) >= waiver.purchasesAtLeast) return met('purchases');
  if (waiver?.depositsAtLeast !== undefined
    && directDeposits(sim, account, monthStart, product.deposits) >= inSaveMoney(sim, waiver.depositsAtLeast, bank.currency)
    && (!waiver.depositsAlso || alsoMet(sim, account, waiver.depositsAlso))) {
    return met('deposits');
  }
  if (waiver?.balanceAtLeast !== undefined
    && Math.min(account.lowest ?? account.balance, account.balance) >= inSaveMoney(sim, waiver.balanceAtLeast, bank.currency)) {
    return met('balance');
  }
  if (waiver?.averageAtLeast !== undefined && averageBalance(account) >= inSaveMoney(sim, waiver.averageAtLeast, bank.currency)) {
    return met('balance');
  }
  if (waiver?.linkedAverageAtLeast !== undefined) {
    const linked = Object.values(sim.universe.accounts)
      .filter((a) => a.ownerId === account.ownerId && !a.closedAt && a.bankId === bank.id && isEveryday(a))
      .reduce((sum, a) => sum + averageBalance(a), 0);
    if (linked >= inSaveMoney(sim, waiver.linkedAverageAtLeast, bank.currency)) return met('balance');
  }
  // Short of a waiver, a lesser condition may lower the fee.
  const cut = product.reduced;
  if (cut) {
    const lower = (by: WaivedBy) => ({ fee: inSaveMoney(sim, cut.to, bank.currency), waivedBy: by, ...(account.currency ? { native: cut.to } : {}) });
    if (cut.ageBelow !== undefined && age !== undefined && age < cut.ageBelow) return lower('age');
    if (cut.depositsAtLeast !== undefined && directDeposits(sim, account, monthStart, product.deposits) >= inSaveMoney(sim, cut.depositsAtLeast, bank.currency)) return lower('deposits');
    if (cut.averageAtLeast !== undefined && averageBalance(account) >= inSaveMoney(sim, cut.averageAtLeast, bank.currency)) return lower('balance');
  }
  return { fee: inSaveMoney(sim, product.monthlyFee, bank.currency), ...(account.currency ? { native: product.monthlyFee } : {}) };
}

/** Debit card purchases from an account since a moment. */
export function purchasesSince(sim: Simulation, account: Account, since: Instant): number {
  let count = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < since) break;
    if (t.category === 'food' && t.postings.some((p) => p.accountId === account.id && p.amount < 0)) count += 1;
  }
  return count;
}

/** The month's average daily balance so far: today's, before a day has been counted. */
export function averageBalance(account: Account): Money {
  return account.monthDays ? Math.round((account.monthSum ?? 0) / account.monthDays) : account.balance;
}

/**
 * Whether the last so many months had the bills paid from an account, or the
 * card purchases on it, that a waiver asks for alongside wages.
 */
export function alsoMet(sim: Simulation, account: Account, rule: { bills?: number; purchases?: number; either?: number; months: number }): boolean {
  const since = sim.now - rule.months * 30 * 86_400_000;
  let bills = 0;
  let purchases = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < since) break;
    if (!t.postings.some((p) => p.accountId === account.id && p.amount < 0)) continue;
    if (t.category === 'rent' || t.category === 'bills') bills += 1;
    else if (t.category === 'food') purchases += 1;
  }
  if (rule.either !== undefined && bills + purchases >= rule.either) return true;
  if (rule.bills !== undefined && bills >= rule.bills) return true;
  return rule.purchases !== undefined && purchases >= rule.purchases;
}

/** Whether money left an account since a moment, other than the bank's own fee. */
export function withdrawnSince(sim: Simulation, account: Account, since: Instant): boolean {
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < since) break;
    if (t.category === 'bank_fee' || t.category === 'interest') continue;
    if (t.postings.some((p) => p.accountId === account.id && p.amount < 0)) return true;
  }
  return false;
}

/** Whether a month earned an account its bonus rate. */
export function bonusEarned(sim: Simulation, account: Account, monthStart: Instant): boolean {
  const bonus = productOf(account)?.bonus;
  if (!bonus) return false;
  if (bonus.when === 'no_withdrawals') return !withdrawnSince(sim, account, monthStart);
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const need = bonus.growBy !== undefined && bank ? inSaveMoney(sim, bonus.growBy, bank.currency) : 1;
  return account.balance - (account.monthOpen ?? account.balance) >= need;
}

/** Interest of a person's paid so far in a calendar year, before tax. */
function interestThisYear(sim: Simulation, owner: string, yearStart: Instant): Money {
  const mine = new Set(Object.values(sim.universe.accounts).filter((a) => a.ownerId === owner).map((a) => a.id));
  let total = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < yearStart) break;
    if (t.category !== 'interest' || !t.postings.some((p) => mine.has(p.accountId))) continue;
    for (const p of t.postings) if (p.amount < 0 && !mine.has(p.accountId) && sim.universe.accounts[p.accountId]?.kind === 'income') total += -p.amount;
  }
  return total;
}

/**
 * A person's wages over the last year, as paid into their accounts, for a
 * tax set by income. Until 2026-09-26 it was the day job's rate times its
 * week, a year ahead; the job engine went, and with it any pay to project.
 */
function yearlyPay(sim: Simulation, owner: string): Money {
  const mine = new Set(Object.values(sim.universe.accounts).filter((a) => a.ownerId === owner).map((a) => a.id));
  const since = sim.now - 365 * MS_DAY;
  let total = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < since) break;
    if (t.category !== 'salary') continue;
    for (const p of t.postings) if (p.amount > 0 && mine.has(p.accountId)) total += p.amount;
  }
  return total;
}

/**
 * The share of interest the country has a bank take before paying it: none
 * on a tax-free account, the rate that matches the saver's income where the
 * rate goes by income, and the flat rate otherwise.
 */
export function interestTaxOn(sim: Simulation, account: Account): number {
  // Kept at a bank in another country than the one its owner lives in (from 2026-10-16), the country's rate for a
  // customer abroad, not its resident's: Germany's bank takes nothing once it has proof of the move, Japan's 15.315%.
  const abroad = nonResidentTaxOn(sim, account);
  if (abroad !== undefined) return productOf(account)?.taxFree ? 0 : abroad;
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const rule = bank ? bankingIn(bank.iso)?.interestTax : undefined;
  if (!rule || productOf(account)?.taxFree) return 0;
  if (rule.brackets) {
    const pay = inSaveMoneyBack(sim, yearlyPay(sim, account.ownerId), bank!.currency);
    return rule.brackets.find((b) => b.upTo === undefined || pay <= b.upTo)?.rate ?? 0;
  }
  return rule.rate ?? 0;
}

/**
 * Whether the account is closed each calendar quarter rather than each month:
 * Germany's, whose banks settle interest and fees in one closing at the end
 * of March, June, September and December (AGB-Banken no. 7). Until
 * 2026-09-26 SLATE settled them monthly everywhere.
 */
export function closesQuarterly(account: Account): boolean {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  return bank?.iso === 'DE' && (account.kind === 'checking' || account.kind === 'savings');
}

/**
 * When the month's fee comes off: at the month's end (`'month'`), as everywhere but Germany; in the month after
 * (`'next'`), posted at the first minute of it, as ING takes it; or at the quarter's closing (`'quarter'`), as Deutsche
 * Bank, Postbank and Berliner Sparkasse do (`Product.feePosts`, from 2026-10-16; until then every German bank's at the
 * quarter's closing).
 */
export function feesPostAt(account: Account): 'month' | 'next' | 'quarter' {
  if (!closesQuarterly(account)) return 'month';
  return productOf(account)?.feePosts ?? 'quarter';
}

/** An amount in the save's money, in a bank's currency. */
function inSaveMoneyBack(sim: Simulation, amount: Money, currency: string): Money {
  const from = saveCurrency(sim.universe);
  return from === currency ? amount : exchange(amount, from, currency) ?? amount;
}

/** What's left this year of the country's untaxed interest, in the save's money, or undefined where there's no allowance. */
export function interestAllowanceLeft(sim: Simulation, account: Account): Money | undefined {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const allowance = bank ? bankingIn(bank.iso)?.interestTax?.allowance : undefined;
  // A resident's allowance, which a customer abroad doesn't have (from 2026-10-16).
  if (!bank || allowance === undefined || nonResidentTaxOn(sim, account) !== undefined) return undefined;
  const p = zonedParts(sim.now, sim.homeZone);
  const before = interestThisYear(sim, account.ownerId, instantFromZoned({ year: p.year, month: 1, day: 1, hour: 0 }, sim.homeZone));
  return Math.max(0, inSaveMoney(sim, allowance, bank.currency) - before);
}

/** What the bank takes off a payment of interest, with any yearly allowance left untaxed. */
export function interestTaxFor(sim: Simulation, account: Account, earned: Money): Money {
  const rate = interestTaxOn(sim, account);
  if (rate <= 0) return 0;
  const free = interestAllowanceLeft(sim, account);
  if (free === undefined) return Math.round(earned * rate);
  return Math.round(Math.max(0, earned - free) * rate);
}

export const SAVINGS_NOTICE_KIND = 'bank.savings_notice';

/** The notice given on a savings account, where it's closing on it. */
export function savingsNotice(sim: Simulation, account: Account): ScheduledItem | undefined {
  return sim.universe.scheduled.find((i) => i.kind === SAVINGS_NOTICE_KIND && i.status === 'pending' && i.payload.accountId === account.id);
}

/**
 * Closes a savings account into the current account: its interest paid, its
 * fees charged, what it holds moved across, and the holder's standing orders
 * and payments ahead that touch it called off. Until 2026-09-27 the orders
 * stayed pointed at it and said every month that the money wasn't there.
 */
function closeSavings(sim: Simulation, person: Person, account: Account, primary: Account): { to: Account; arrives?: Instant } {
  // What it has earned this month is paid before it closes, as a bank does.
  payInterest(sim, account, `Interest: ${account.name}, on closing`);
  settleFees(sim, account);
  // Into the current account at its own bank; with none there, sent to the primary one in the bank's days (from
  // 2026-10-10: until then into the primary account at once, wherever it was).
  const current = checkingAt(sim, person, account.bankId) ?? primary;
  let arrives: Instant | undefined;
  if (account.balance > 0 && current.bankId !== account.bankId) {
    const at = sendBetweenBanks(sim, person, account, current, account.balance);
    if (at > sim.now) arrives = at;
  } else if (account.balance !== 0) {
    // At one bank in its own money, its figure on both sides (from 2026-10-16: until then the receiving side was
    // worked from the dollars, and after four of SMBC's fees ¥2 went missing in the move).
    const own = account.currency !== undefined && account.currency === current.currency ? account.held ?? 0 : undefined;
    sim.post({
      memo: `Closed ${account.name}`, category: 'transfer',
      postings: [
        { accountId: account.id, amount: -account.balance, ...(own !== undefined ? { native: -own } : {}) },
        { accountId: current.id, amount: account.balance, ...(own !== undefined ? { native: own } : {}) },
      ],
    });
  }
  account.accrued = 0;
  account.closedAt = sim.now;
  dropPaymentsFor(sim, person, account);
  return { to: current, ...(arrives !== undefined ? { arrives } : {}) };
}

/**
 * A closed account's standing orders into it and its scheduled payments to or from it, taken off. Closing savings
 * did it; from 2026-10-10 an account canceled in its cooling-off and one handed to the state as unclaimed do too,
 * which until then left them to run against a closed account.
 */
export function dropPaymentsFor(sim: Simulation, person: Person, account: Account): void {
  const pay = person.payments;
  if (pay) {
    const gone = new Set(pay.standingOrders.filter((o) => o.toId === account.id).map((o) => o.id));
    pay.standingOrders = pay.standingOrders.filter((o) => !gone.has(o.id));
    for (const one of sim.universe.scheduled) {
      if (one.status !== 'pending' || one.payload.personId !== person.id) continue;
      if ((one.kind === 'bank.standing_order' && gone.has(String(one.payload.orderId))) || (one.kind === 'bank.scheduled_payment' && (one.payload.fromId === account.id || one.payload.toId === account.id))) sim.timeline.cancel(one.id, sim.now);
    }
  }
}

/**
 * The standing orders paying from an account its bank closed of its own accord, or into it, ended with it, the bank having
 * held them, and returned for the closing notice to name (from 2026-10-16). Until then they stayed, and each month said “A
 * Standing Order Didn’t Go … is closed” for good (docs/verification/remaining/banking-checklist.json,
 * banking.1.standing-orders). Close It and Cancel It refuse while one pays from the account (`linkedTo`), and take those
 * into it (`dropPaymentsFor`), so only a bank's own close meets one. An order that never named its account follows the
 * primary account (`orderSource`), and keeps following it.
 */
export function endOrdersOf(sim: Simulation, person: Person, account: Account): StandingOrder[] {
  const pay = person.payments;
  if (!pay) return [];
  const ended = pay.standingOrders.filter((o) => o.fromId === account.id || o.toId === account.id);
  if (ended.length === 0) return [];
  const gone = new Set(ended.map((o) => o.id));
  pay.standingOrders = pay.standingOrders.filter((o) => !gone.has(o.id));
  for (const one of sim.universe.scheduled) {
    if (one.status === 'pending' && one.kind === 'bank.standing_order' && gone.has(String(one.payload.orderId))) sim.timeline.cancel(one.id, sim.now);
  }
  return ended;
}

/** The closing notice's sentence on the standing orders that ended with the account, or nothing. */
export function endedWords(sim: Simulation, ended: readonly StandingOrder[]): string {
  if (ended.length === 0) return '';
  const nth = (n: number) => { const t = n % 100; return `${n}${t >= 11 && t <= 13 ? 'th' : (['th', 'st', 'nd', 'rd'][n % 10] ?? 'th')}`; };
  const each = ended.map((o) => `${formatMoney(o.amount, saveCurrency(sim.universe))} into ${sim.universe.accounts[o.toId]?.name ?? 'your savings'} on the ${nth(o.day)}`);
  return ` ${ended.length === 1 ? 'Its standing order' : 'Its standing orders'} of ${spokenList(each)} stopped when it closed. You can set up ${ended.length === 1 ? 'a new one' : 'new ones'} from another account under How You Pay, on the Payments And Cash tab.`;
}

/**
 * What closing an account now charges of its fees, and what makes it up (from 2026-10-16). At Germany's quarterly closing:
 * the quarter's months kept (`feesDue`), whole, each a month the account was served; and this month's fee only for the
 * days of it the account was open, through the closing day, as BGB § 675h(3) owes a regular fee “nur anteilig bis zum
 * Zeitpunkt der Beendigung des Vertrags” (https://www.gesetze-im-internet.de/bgb/__675h.html, read 2026-10-16), and a
 * cancellation in the cooling-off period Wertersatz “für die vom Unternehmer bis zum Widerruf erbrachte Dienstleistung”
 * (§ 357b(2)). None of the five German price lists read that day says how the share is counted: SLATE's reading is the
 * days, from the day it opened where it opened that month, over the month's days, rounded half up to the cent, in the
 * bank's own money first. Nothing is paid ahead at a German bank in SLATE, each month's fee accruing at its end and posting
 * at the quarter's closing, so nothing is refunded. Until 2026-10-16 the whole month was charged on any day of it, and
 * twice after 11 PM on its last day, when the month's end had put it with the quarter's already
 * (docs/verification/remaining-09/banking-checklist.json, banking.1.pro-rata).
 */
export interface ClosingFees {
  /** The quarter's months kept for its closing, in the save's money, and the bank's own where the account is kept in another. */
  kept: Money;
  keptHeld?: Money;
  /** This month's fee as `feeFor` gives it, and the share of it charged, the same two ways. */
  month: Money;
  monthHeld?: Money;
  share: Money;
  shareHeld?: Money;
  /** The month's days counted, of all its days. */
  days: number;
  of: number;
  /** Why this month adds nothing: its end has put it with the quarter's, a closing ended the fees, or the bank's waiver. */
  none?: 'accrued' | 'ended' | WaivedBy;
  total: Money;
  totalHeld?: Money;
}

/** `ClosingFees` now, or nothing where the account isn't closed each quarter (`closesQuarterly`). */
export function closingFeesDue(sim: Simulation, account: Account): ClosingFees | undefined {
  if (!closesQuarterly(account)) return undefined;
  const kept = account.feesDue ?? 0;
  const keptHeld = account.currency ? account.feesDueHeld ?? 0 : undefined;
  const monthStart = monthStartOf(sim, sim.now);
  const now = zonedParts(sim.now, sim.homeZone);
  const of = daysInMonth(now.year, now.month);
  const days = now.day - (account.openedAt >= monthStart ? zonedParts(account.openedAt, sim.homeZone).day : 1) + 1;
  const held = (n: Money) => (keptHeld !== undefined ? n : undefined);
  const made = (month: Money, monthHeld: Money | undefined, share: Money, shareHeld: Money | undefined, none?: ClosingFees['none']): ClosingFees => ({
    kept, ...(keptHeld !== undefined ? { keptHeld, monthHeld: monthHeld ?? 0, shareHeld: shareHeld ?? 0, totalHeld: keptHeld + (shareHeld ?? 0) } : {}),
    month, share, days, of, ...(none !== undefined ? { none } : {}), total: kept + share,
  });
  if (account.feesEndedAt !== undefined) return made(0, held(0), 0, held(0), 'ended');
  // At or after 11 PM on its last day the month's end has put the whole month with the quarter's.
  if (sim.now >= monthEndAfter(sim, monthStart)) return made(0, held(0), 0, held(0), 'accrued');
  const fee = feeFor(sim, account, monthStart);
  if (fee.fee <= 0) return made(0, held(0), 0, held(0), fee.waivedBy);
  const part = (x: Money) => Math.floor((2 * x * days + of) / (2 * of));
  const bank = bankById(account.bankId!)!;
  const shareHeld = fee.native !== undefined ? part(fee.native) : undefined;
  return made(fee.fee, fee.native, shareHeld !== undefined ? inSaveMoney(sim, shareHeld, bank.currency) : part(fee.fee), shareHeld);
}

/**
 * Settles a closing account's fees (`closingFeesDue`), and ends them there (`feesEndedAt`, from 2026-10-16): the month's
 * end charges it none after, and a second settling none, as BGB § 675h(3) owes none past the contract's end. Until then
 * a home bank's close tried again each day on an account left overdrawn (`homeCloses`, systems/abroad.ts) charged the
 * month's fee again each morning, and the month's end went on adding to it (docs/verification/remaining-09, banking.3).
 * Until 2026-09-27 an account closed mid-quarter took its quarter's fees with it.
 */
export function settleFees(sim: Simulation, account: Account): void {
  const due = closingFeesDue(sim, account);
  const card = cardYearDue(sim, account);
  account.feesEndedAt ??= sim.now;
  // The debit card's year running, settled by the rule it was opened under (`cardYearDue`, from brief 10, 2026-10-16):
  // a year paid ahead gives its days left back first, as it did from 2026-10-16 (`cardRefundDue`, Berliner Sparkasse's
  // alone); one charged behind is charged its days used. The year ends with the fees (`feesEndedAt`): nothing of it is
  // settled again or charged after.
  if (card) {
    const signed = card.kind === 'refund' ? 1 : -1;
    sim.post({
      memo: card.kind === 'refund' ? `Debit card yearly fee refunded: ${account.name}` : `Debit card yearly fee to the closing day: ${account.name}`,
      category: 'bank_fee',
      postings: [
        { accountId: account.id, amount: signed * card.save, ...(account.currency ? { native: signed * card.held } : {}) },
        { accountId: sim.nominalAccount('expense', 'Bank Fees').id, amount: -signed * card.save },
      ],
    });
  }
  // What was paid ahead is given back, so none is left paid (and a card year charged behind had none).
  if (account.cardYearRule !== undefined) account.cardFeePaid = 0;
  if (!due) return;
  account.feesDue = 0;
  if (account.currency) account.feesDueHeld = 0;
  if (due.total <= 0) return;
  sim.post({ memo: `Closing fees: ${account.name}`, category: 'bank_fee', postings: [{ accountId: account.id, amount: -due.total, ...(due.totalHeld !== undefined ? { native: -due.totalHeld } : {}) }, { accountId: sim.nominalAccount('expense', 'Bank Fees').id, amount: due.total }] });
}

/** A bank's debit card year, where it charges a yearly fee for the card (`Bank.card.year`, from brief 10, 2026-10-16). */
export function cardYearOf(bank: Bank | undefined): CardYear | undefined {
  return bank?.card?.yearly !== undefined ? bank.card.year : undefined;
}

/** A moment's date in a zone, as a count of days, so two dates subtract to the days between them. */
function dayIn(at: Instant, zone: string): number {
  const p = zonedParts(at, zone);
  return Date.UTC(p.year, p.month - 1, p.day) / MS_DAY;
}

/**
 * The card year running on an account (`CardYear`): its first day and the day the next begins, as `dayIn` counts them in
 * the year's calendar, and its days. `'anniversary'`: the same date a year on, or that month's last day where the date
 * doesn't exist, so a year from 25 August 2027 is 366 days and one from 29 February 2028 ends on 28 February 2029; 365:
 * 365 days on.
 */
export function cardYearSpan(sim: Simulation, account: Account, year: CardYear): { from: number; next: number; days: number } | undefined {
  if (account.cardFeeAt === undefined) return undefined;
  const zone = year.zone ?? sim.homeZone;
  const from = dayIn(account.cardFeeAt, zone);
  const p = zonedParts(account.cardFeeAt, zone);
  const next = year.length === 365 ? from + 365 : Date.UTC(p.year + 1, p.month - 1, Math.min(p.day, daysInMonth(p.year + 1, p.month))) / MS_DAY;
  return { from, next, days: next - from };
}

/**
 * Whether the card year running has ended by now, so tonight opens the next: its next first day reached in its calendar;
 * or, for a year of 365 days, 365 days since it began, to the moment, as the day's loop has charged it since 2026-10-16.
 */
export function cardYearOver(sim: Simulation, account: Account, year: CardYear): boolean {
  if (account.cardFeeAt === undefined) return true;
  if (year.length === 365) return sim.now - account.cardFeeAt >= 365 * MS_DAY;
  return dayIn(sim.now, year.zone ?? sim.homeZone) >= cardYearSpan(sim, account, year)!.next;
}

/** The card's yearly fee for a person today, in the bank's money: none under the age the bank spares. */
export function cardFeeFor(sim: Simulation, person: Person | undefined, bank: Bank): Money {
  const card = bank.card;
  if (!card?.yearly) return 0;
  return card.freeUnder !== undefined && person && ageOn(sim, person, sim.now) < card.freeUnder ? 0 : card.yearly;
}

/** What a close settles of the debit card's year running (`cardYearDue`). */
export interface CardYearDue {
  /** Given back, of a year paid ahead, or charged, of one charged behind. */
  kind: 'refund' | 'charge';
  /** In the bank's own money, and in the save's. */
  held: Money;
  save: Money;
  /** The year's fee it's a share of, in the bank's money. */
  fee: Money;
  /** The days it's for, left of the year after the closing day (a refund) or used of it, the closing day among them (a charge), of the year's days. */
  days: number;
  of: number;
}

/**
 * What closing now settles of the debit card's year running (from brief 10, 2026-10-16), by the rule the year was opened
 * under (`Account.cardYearRule`): of a year paid ahead, the fee paid × the days left after the closing day ÷ the year's
 * days comes back; of one charged behind, the year's fee × the days used, the closing day among them, ÷ the year's days is
 * charged, at the age the price list reads on the closing day. The days are dates in the year's calendar (`CardYear.zone`,
 * Reykjavík's for Arion), and the share is rounded half up once to the currency's smallest written unit, the cent or the
 * whole króna. Nothing once the account's fees have ended (`feesEndedAt`), where nothing was paid ahead, or once the year
 * is used up. Until then `cardRefundDue` gave back Berliner Sparkasse's year alone, its year 365 days in New Haven's
 * calendar, to the cent: the same figures for it.
 */
export function cardYearDue(sim: Simulation, account: Account): CardYearDue | undefined {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const year = cardYearOf(bank);
  if (!bank || !year || account.kind !== 'checking' || account.feesEndedAt !== undefined || account.cardYearRule === undefined) return undefined;
  const span = cardYearSpan(sim, account, year);
  if (!span) return undefined;
  const used = Math.min(span.days, dayIn(sim.now, year.zone ?? sim.homeZone) - span.from + 1);
  const unit = 10 ** (2 - currencyInfo(bank.currency).decimals);
  const share = (fee: Money, days: number) => Math.floor((2 * fee * days + span.days * unit) / (2 * span.days * unit)) * unit;
  if (account.cardYearRule === 'ahead') {
    const paid = account.cardFeePaid ?? 0;
    const left = span.days - used;
    if (paid <= 0 || left <= 0) return undefined;
    const held = share(paid, left);
    return { kind: 'refund', held, save: inSaveMoney(sim, held, bank.currency), fee: paid, days: left, of: span.days };
  }
  const fee = cardFeeFor(sim, sim.universe.people[account.ownerId], bank);
  if (fee <= 0 || used <= 0) return undefined;
  const held = share(fee, used);
  return { kind: 'charge', held, save: inSaveMoney(sim, held, bank.currency), fee, days: used, of: span.days };
}

/** A day count in a zone's calendar, written as the date it is. */
function dayWords(day: number): string {
  return formatDate(day * MS_DAY + 12 * 3_600_000, 'UTC');
}

/**
 * The debit card's year, said on its account's panel (from brief 10, 2026-10-16): its fee and the age the bank spares,
 * the card year running and when the next is charged, what a close does, what an account that can't cover the fee comes
 * to, and, where the timing is SLATE's, that it's simulated and unverified. Until then nothing on an account's panel said
 * the card's year, and Other Charges only for the primary account's bank.
 */
export function cardYearWords(sim: Simulation, account: Account): string | undefined {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const year = cardYearOf(bank);
  if (!bank || !year || account.kind !== 'checking' || account.closedAt !== undefined || account.feesEndedAt !== undefined) return undefined;
  const own = (x: Money) => formatMoney(x, bank.currency);
  const fee = bank.card!.yearly!;
  const said = [`Its debit card costs ${own(fee)} a year${bank.card!.freeUnder !== undefined ? ` from age ${bank.card!.freeUnder}, and nothing at ${bank.card!.freeUnder - 1} and under` : ''}.`];
  const span = cardYearSpan(sim, account, year);
  if (span && account.cardYearRule) {
    const paid = account.cardFeePaid ?? 0;
    said.push(account.cardYearRule === 'ahead'
      ? ` The current card year runs from ${dayWords(span.from)} to ${dayWords(span.next - 1)}${paid > 0 ? `, and you paid ${own(paid)} for it in advance` : ', and nothing was charged for it'}. The next year’s fee is charged on ${dayWords(span.next)}.`
      : ` The current card year runs from ${dayWords(span.from)} to ${dayWords(span.next - 1)}, and its fee is charged at the end, on ${dayWords(span.next)}.`);
  } else said.push(year.paid === 'ahead' ? ' The first year’s fee is charged in advance, tonight.' : ' The first card year begins tonight, and its fee is charged when the year ends.');
  said.push((account.cardYearRule ?? year.paid) === 'ahead' ? ' Closing the account refunds the days left in the year.' : ' Closing the account charges only for the days of the year you’ve used.');
  if (year.place) said.push(` The bank counts the card year’s days by the date in ${year.place}.`);
  said.push(' If the account can’t cover the fee, the bank charges it anyway and the account goes overdrawn by the difference.');
  if (year.simulated) said.push(` The timing is estimated: ${year.simulated}.`);
  return said.join('');
}

/**
 * What closing now would charge of the fees, and give back or charge of a debit card's year, in words, said under Close
 * It and Cancel It before either is pressed, from `closingFeesDue`'s and `cardYearDue`'s figures (from 2026-10-16:
 * until then neither said a figure unless it refused; until brief 10 the card's refund alone, `cardRefundDue`'s, and
 * nothing of the law or of a timing SLATE simulates). Nothing where the account's bank charges none at closing.
 */
export function closingFeesWords(sim: Simulation, account: Account, doing: 'Closing' | 'Canceling' = 'Closing'): string | undefined {
  const due = closingFeesDue(sim, account);
  const card = cardYearDue(sim, account);
  const cur = account.currency ?? saveCurrency(sim.universe);
  const own = (save: Money, held: Money | undefined) => formatMoney(held ?? save, cur);
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const year = cardYearOf(bank);
  // The card year's share in its words, and, where it's SLATE's, the law that sizes it and the label (from brief 10).
  const fee = card && bank ? own(inSaveMoney(sim, card.fee, bank.currency), card.fee) : '';
  const share = card && bank ? `${card.kind === 'refund' ? 'refunds' : 'charges'} ${balanceText(sim, account, card.save, account.currency ? card.held : undefined)} ${card.kind === 'refund' ? `of the ${fee} you paid in advance for its debit card’s year: the ${card.days} days of its ${card.of} still to run` : `of its debit card’s ${fee} yearly fee, which is charged at the end of the year: the ${card.days} days of its ${card.of} used so far`}` : undefined;
  const after = card && bank && year ? `${year.law ? ` Under ${year.law}, ${card.kind === 'refund' ? 'a fee paid in advance is refunded in proportion when the account closes' : 'a regular fee is owed only in proportion to the time before the account closes'}.` : ''}${year.simulated ? ` The timing is estimated: ${year.simulated}.` : ''}` : '';
  const fees = feesWords(sim, account, due, doing, own);
  if (!fees) return share ? `${doing} it now ${share}.${after}` : undefined;
  return share ? `${fees} It ${share}.${after}` : fees;
}

/** `closingFeesWords`'s sentence on the fees, or nothing. */
function feesWords(sim: Simulation, account: Account, due: ClosingFees | undefined, doing: string, own: (save: Money, held: Money | undefined) => string): string | undefined {
  if (!due || due.none === 'ended' || (due.total === 0 && (due.none === undefined || !productOf(account)?.monthlyFee))) return undefined;
  const posts = feesPostAt(account);
  const name = MONTH_NAMES[zonedParts(sim.now, sim.homeZone).month - 1]!;
  // Kept for the quarter's closing, or, at ING after the month's end and before the 1st, the month's fee still to come off.
  const kept = due.kept > 0 ? `${own(due.kept, due.keptHeld)} ${posts === 'next' ? `for ${name}, which would come off on the 1st` : 'held over for the quarter’s closing'}` : '';
  const total = balanceText(sim, account, due.total, due.totalHeld);
  if (due.none === 'accrued') return kept ? `${doing} it now charges ${total}: the ${kept}. ${name}’s fee was already counted at the month’s end.` : `${doing} it now charges no fees. ${name}’s fee was already counted at the month’s end.`;
  if (due.none !== undefined) {
    const why = due.none === 'new' ? `${name} is free, because the account opened this month` : `${name}’s fee is waived so far`;
    return kept ? `${doing} it now charges ${total}: the ${kept}. ${why[0]!.toUpperCase()}${why.slice(1)}.` : `${doing} it now charges no fees: ${why}.`;
  }
  const share = `${own(due.share, due.shareHeld)} of ${name}’s ${own(due.month, due.monthHeld)} fee, for ${due.days === 1 ? 'the one day' : `the ${due.days} days`} of its ${due.of} the account has been open`;
  return `${doing} it now charges ${total} in fees: ${kept ? `${kept}, and ` : ''}${share}. Under German law, a month’s fee is charged only up to the day an account closes.`;
}

/**
 * What closing would charge past what an account holds, in a refusal's words, each named with its sum: “Its fees, €4.90,
 * are”, “Its overdraft interest, €0.53, and its fees, €6.90, are” (from 2026-10-16, when the overdraft interest built
 * since the 1st was first charged on closing, `settleOverdraftInterest`).
 */
export function owingWords(items: readonly (readonly [string, string])[]): string {
  const said = items.map(([what, sum], i) => `${i > 0 && i === items.length - 1 ? 'and ' : ''}${what}, ${sum},`).join(' ');
  const plural = items.length > 1 || items[0]?.[0].endsWith('fees') === true;
  return `${said.charAt(0).toUpperCase()}${said.slice(1)} ${plural ? 'are' : 'is'}`;
}

/**
 * What `settleFees` would charge now, read before it's charged (a cancellation's refusal, from 2026-10-15), in the save's
 * money: `closingFeesDue`'s total, this month's fee to the day (from 2026-10-16: until then the whole month).
 */
export function closingFeesOf(sim: Simulation, account: Account): Money {
  // Less a debit card's year paid ahead given back, or with one charged behind's days used (`cardYearDue`, from brief 10,
  // 2026-10-16; from earlier that day the refund alone, `cardRefundDue`), so a refusal reads what's owed net.
  const card = cardYearDue(sim, account);
  return (closingFeesDue(sim, account)?.total ?? 0) + (card ? (card.kind === 'charge' ? card.save : -card.save) : 0);
}

/** Pays what an account has built up, now, as a bank does when it closes one. */
export function settleInterest(sim: Simulation, account: Account, memo: string): void {
  payInterest(sim, account, memo);
}

function payInterest(sim: Simulation, account: Account, memo: string): void {
  const earned = Math.floor(account.accrued ?? 0);
  if (earned <= 0) return;
  const tax = interestTaxFor(sim, account, earned);
  const postings = [
    { accountId: account.id, amount: earned - tax },
    { accountId: sim.nominalAccount('income', 'Interest').id, amount: -earned },
  ];
  if (tax > 0) postings.push({ accountId: sim.nominalAccount('expense', 'Tax On Interest').id, amount: tax });
  sim.post({ memo, category: 'interest', postings });
  account.accrued = (account.accrued ?? 0) - earned;
  const owner = account.ownerId ? sim.universe.people[account.ownerId] : undefined;
  // A bank outside America's interest is recorded with its country and the tax this transaction took at source, for the
  // US return's foreign interest and its credit (from 2026-10-16: until then as any bank's, the tax lost to the return).
  const iso = account.bankId ? bankById(account.bankId)?.iso : undefined;
  if (owner) recordInterest(owner, sim.now, sim.homeZone, earned, iso && iso !== 'US' ? { iso, withheld: tax } : undefined);
}

function scheduleMonthEnd(sim: Simulation, after: Instant): void {
  sim.schedule({
    at: monthEndAfter(sim, after), kind: MONTH_END_KIND, label: 'World Simulation', category: 'system', priority: 90,
  });
}

export function registerBanking(sim: Simulation): void {
  // Every day: interest builds on what each account holds at the day's end,
  // and the lowest it stood at this month is kept for the fee's waiver.
  sim.onEvent('world.day_rollover', 'bank.day', (_event, { sim: s }) => {
    // The day just ended's year (the rollover runs at the next day's midnight): a US person's account at a bank outside
    // America keeps the year's most and its last day's figure for America's reports (from 2026-10-16).
    const year = String(zonedParts(s.now - 1, s.homeZone).year);
    for (const account of Object.values(s.universe.accounts)) {
      if (account.closedAt || !isEveryday(account) || !account.bankId || bankById(account.bankId)?.iso === 'US') continue;
      const owner = s.universe.people[account.ownerId];
      if (!owner || !usPerson(owner, s.now)) continue;
      const held = heldOf(account);
      const was = (account.peak ??= {})[year];
      account.peak[year] = { max: Math.max(was?.max ?? held, held), last: held };
    }
    // A fee for a customer abroad that was owed, taken once the account holds it (from 2026-10-16).
    for (const account of Object.values(s.universe.accounts)) if (account.feeOwedHeld) chargeAbroadFee(s, account, 0);
    // Last month's fee where the bank takes it in the month after (ING, `feesPostAt`, from 2026-10-16), at the first
    // minute of it; the day isn't published, so the first is SLATE's.
    if (zonedParts(s.now, s.homeZone).day === 1) {
      for (const account of Object.values(s.universe.accounts)) {
        if (account.closedAt || (account.feesDue ?? 0) <= 0 || feesPostAt(account) !== 'next') continue;
        s.post({
          memo: `Monthly fee: ${account.name}`, category: 'bank_fee',
          postings: [
            { accountId: account.id, amount: -account.feesDue!, ...(account.currency ? { native: -(account.feesDueHeld ?? 0) } : {}) },
            { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: account.feesDue! },
          ],
        });
        account.feesDue = 0;
        if (account.currency) account.feesDueHeld = 0;
      }
    }
    for (const account of Object.values(s.universe.accounts)) {
      if (!account.bankId || account.closedAt || !isEveryday(account)) continue;
      if (account.dormant && ACCOUNT_LIFE[account.bankId]?.stopsInterest) continue;
      const product = productOf(account);
      // The floor, the cap and the tiers are the bank's own money; until 2026-09-27 they were read as the save's.
      const bankMoney = (x: Money) => inSaveMoney(s, x, bankById(account.bankId!)!.currency);
      const earning = earningBalance(product, account.balance, bankMoney);
      // The rate as quoted, turned into the nominal rate its crediting earns it at (`nominalRate`, from 2026-10-22), and a
      // day's interest kept whole, to be posted in whole cents when it's credited. Compounded daily, the interest built
      // up earns from the next day.
      const rate = nominalRate(product, account, tierRate(product, account, earning, bankMoney) ?? rateOf(s, account));
      const daily = product?.compounds === 'daily' ? earning + Math.max(0, account.accrued ?? 0) : earning;
      if (rate > 0 && earning > 0) account.accrued = (account.accrued ?? 0) + (daily * rate) / 365;
      // The bonus builds too, and is kept only if the month earns it.
      if (product?.bonus && earning > 0) account.bonusAccrued = (account.bonusAccrued ?? 0) + (earning * product.bonus.rate) / 365;
      account.lowest = Math.min(account.lowest ?? account.balance, account.balance);
      account.monthSum = (account.monthSum ?? 0) + account.balance;
      account.monthDays = (account.monthDays ?? 0) + 1;
      // Credited from its opening day where its terms say so (`creditsEvery`, from 2026-10-22): Nationwide's and Lloyds'
      // once a year, Bankinter's every six months. The month's end leaves it be.
      if (creditsOn(product, account.openedAt, s.now, s.homeZone)) payInterest(s, account, `Interest: ${account.name}`);
    }
  });

  sim.onSchedule(MONTH_END_KIND, (item, s) => {
    // Marks past their years leave the record, whoever's it is (`systems/credit.ts`), card or none.
    for (const person of Object.values(s.universe.people)) marksFallOff(person, s.now);
    const monthStart = monthStartOf(s, item.at);
    const month = zonedParts(item.at, s.homeZone).month;
    for (const account of Object.values(s.universe.accounts)) {
      if (!account.bankId || account.closedAt || !isEveryday(account)) continue;
      const product = productOf(account);
      // A month that earned the bonus adds it to what's owed; one that didn't loses it.
      if (product?.bonus && bonusEarned(s, account, monthStart)) account.accrued = (account.accrued ?? 0) + (account.bonusAccrued ?? 0);
      account.bonusAccrued = 0;
      // Paid in the bank's months, where it doesn't pay every month, and in
      // Germany at the quarterly closing (AGB-Banken no. 7), with the
      // quarter's fees beside it where the bank takes them then (`feesPostAt`:
      // from 2026-10-16 not ING's or Commerzbank's).
      const quarterly = closesQuarterly(account);
      if (!product?.creditsEvery && (!product?.pays || product.pays.includes(month)) && (!quarterly || month % 3 === 0)) payInterest(s, account, `Interest: ${account.name}`);
      // None once a closing has settled them (`feesEndedAt`, from 2026-10-16): they end with the contract.
      const { fee, native } = account.feesEndedAt !== undefined ? { fee: 0, native: undefined } : feeFor(s, account, monthStart);
      // On an account in another currency the bank's own figure goes with it, kept beside the quarter's fees too.
      const own = (n: Money | undefined) => (n !== undefined ? { native: -n } : {});
      // Kept for the quarter's closing, or for the 1st where the bank takes it in the month after (ING, from 2026-10-16;
      // until then every German bank's went to the quarter's closing), or taken now.
      const posts = feesPostAt(account);
      if (posts !== 'month') {
        account.feesDue = (account.feesDue ?? 0) + fee;
        if (account.currency) account.feesDueHeld = (account.feesDueHeld ?? 0) + (native ?? 0);
        if (posts === 'quarter' && month % 3 === 0 && account.feesDue > 0) {
          s.post({
            memo: `Quarterly closing, fees: ${account.name}`, category: 'bank_fee',
            postings: [
              { accountId: account.id, amount: -account.feesDue, ...own(account.currency ? account.feesDueHeld : undefined) },
              { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: account.feesDue },
            ],
          });
          account.feesDue = 0;
          if (account.currency) account.feesDueHeld = 0;
        }
      } else if (fee > 0) {
        s.post({
          memo: `Monthly fee: ${account.name}`, category: 'bank_fee',
          postings: [
            { accountId: account.id, amount: -fee, ...own(native) },
            { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: fee },
          ],
        });
      }
      // A bank's fee for a customer who lives abroad, on its schedule (from 2026-10-16: until then creation said it and
      // nothing charged it), in its own figure; owed, not overdrawn, where the account can't go below zero.
      const abroadFee = nonResidentFeeDue(s, account, item.at);
      if (abroadFee) chargeAbroadFee(s, account, abroadFee.native);
      // The current account's statement, monthly, or at Germany's quarterly closing.
      if (account.kind === 'checking' && (!quarterly || month % 3 === 0)) {
        const owner = s.universe.people[account.ownerId];
        // An account kept at home in its own money, the dollars beside (from 2026-10-16). Said as how the period ended
        // and where the statement is from brief 15 (2026-10-19): until then the body was "$3,025.00 at the close.".
        const end = quarterly ? 'the quarter' : 'the month';
        const ended = account.balance < 0
          ? `It ended ${end} overdrawn by ${balanceText(s, account, -account.balance, account.currency ? -heldOf(account) : undefined)}.`
          : `It ended ${end} with ${balanceText(s, account)} in it.`;
        if (owner) statementReady(s, owner, account, `${ended} The statement is on Money, under Statements.`);
      }
      account.lowest = account.balance;
      account.monthOpen = account.balance;
      account.monthSum = 0;
      account.monthDays = 0;
    }
    scheduleMonthEnd(s, item.at);
  });

  sim.onCommand<{ fromId: string; toId: string; amount: Money; in?: string }, { moved: Money; arrivesAt?: Instant; sent?: Money; sentIn?: string }>('bank.transfer', (p, { sim: s }) => {
    const person = s.player;
    const mine = bankAccountsOf(s, person);
    const from = mine.find((a) => a.id === p.fromId);
    const to = mine.find((a) => a.id === p.toId);
    if (!from || !to) throw new CommandError('Move Money only moves money between your own checking and savings accounts.');
    if (from.id === to.id) throw new CommandError('From and To are the same account. Choose another account to move it to.');
    const typed = Math.round(Number(p.amount));
    if (!(typed > 0)) throw new CommandError('Enter how much to move.');
    // In the sending account's own money where it's kept in another (from 2026-10-16): pounds typed are the pounds sent,
    // and the dollars they're worth move in the save's books.
    const save = saveCurrency(s.universe);
    if (p.in !== undefined && p.in !== (from.currency ?? save)) throw new CommandError(`${from.name} holds ${from.currency ?? save}, so nothing was moved. Enter the amount in ${from.currency ?? save}.`);
    const own = from.currency !== undefined && p.in === from.currency;
    if (own && typed > (from.held ?? 0)) throw new CommandError(`${from.name} has ${(from.held ?? 0) > 0 ? `only ${formatMoney(from.held!, from.currency!)}` : 'nothing'} available, so nothing was moved.`);
    const amount = own ? (typed === from.held ? from.balance : exchange(typed, from.currency!, save) ?? typed) : typed;
    // Left open by a switch while in debt: blocked to all but repayment (from 2026-10-10).
    if (from.switchDebt) throw new CommandError(`${from.name} is blocked, so nothing was moved. It was overdrawn when you switched banks, and it stays blocked until the overdraft is paid off. Move money into it to clear what it owes, and it closes once it’s repaid.`);
    if (amount > from.balance) {
      throw new CommandError(`${from.name} has ${from.balance > 0 ? `only ${formatMoney(from.balance, saveCurrency(s.universe))}` : 'nothing'} available, so nothing was moved.`);
    }
    if (from.dormant || to.dormant) throw new CommandError(`${(from.dormant ? from : to).name} is dormant, so nothing was moved. Reactivate it under Your Accounts Over Time, then try again.`);
    const { room, fee: withdrawalFee } = from.kind === 'savings' ? savingsDebit(s, from) : { room: from.balance, fee: 0 };
    const left = savingsLeftThisMonth(s, from);
    if (left !== undefined && amount > left) {
      throw new CommandError(`You can take only ${formatMoney(left, saveCurrency(s.universe))} more out of ${from.name} this month without notice, so nothing was moved. To take out more, you’d have to close the account, which takes three months’ notice.`);
    }
    // The fee comes out beside it: until 2026-09-27 a move of the whole balance left the account overdrawn by the fee.
    if (amount > room) throw new CommandError(`With the ${formatMoney(withdrawalFee, saveCurrency(s.universe))} withdrawal fee, you can move at most ${formatMoney(room, saveCurrency(s.universe))} out of ${from.name}, so nothing was moved.`);
    if (from.closingAt !== undefined || to.closingAt !== undefined) throw new CommandError(`${(from.closingAt !== undefined ? from : to).name} is closing, so money can’t move into or out of it.`);
    // Between two banks, it goes out now and arrives in the sending bank's days (`systems/bankmoves.ts`, from
    // 2026-10-10); until then it couldn't, and a bank switch moved everything at once.
    const sent = own ? { sent: typed, sentIn: from.currency! } : {};
    if (from.bankId !== to.bankId) {
      const arrivesAt = sendBetweenBanks(s, person, from, to, amount, to.bankId, false, own ? typed : undefined);
      if (withdrawalFee > 0) s.post({ memo: `Savings withdrawal fee: ${from.name}`, category: 'bank_fee', postings: [{ accountId: from.id, amount: -withdrawalFee }, { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: withdrawalFee }] });
      return { moved: amount, arrivesAt, ...sent };
    }
    // At one bank in another currency, the typed figure on both sides, so neither drifts from it.
    s.post({
      memo: `Moved to ${to.name}`, category: 'transfer',
      postings: [{ accountId: from.id, amount: -amount, ...(own ? { native: -typed } : {}) }, { accountId: to.id, amount, ...(own && to.currency === from.currency ? { native: typed } : {}) }],
    });
    if (withdrawalFee > 0) s.post({ memo: `Savings withdrawal fee: ${from.name}`, category: 'bank_fee', postings: [{ accountId: from.id, amount: -withdrawalFee }, { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: withdrawalFee }] });
    return { moved: amount, ...sent };
  });

  sim.onCommand<{ bankId?: string }, { accountId: string }>('bank.open_savings', (p, { sim: s }) => {
    const person = s.player;
    // At any bank they keep a current account with, one each (from 2026-10-10: until then one savings account in all,
    // at the primary account's bank).
    const bank = p?.bankId ? bankById(String(p.bankId)) : bankOf(s, person);
    if (!bank || !checkingAt(s, person, bank.id)) throw new CommandError('You can only open savings at a bank where you have a checking account.');
    // Nothing new at a bank in another country (from 2026-10-16), in its words.
    const abroad = abroadRefusal(person, bank);
    if (abroad) throw new CommandError(abroad);
    if (bankAccountsOf(s, person).some((a) => a.kind === 'savings' && a.bankId === bank.id)) throw new CommandError(`You already have a savings account at ${bank.name}.`);
    return { accountId: openOne(s, person, bank, 'savings', 0).id };
  });

  sim.onCommand<{ accountId: string }, { closed: string; on?: Instant }>('bank.close_savings', (p, { sim: s }) => {
    const person = s.player;
    const account = bankAccountsOf(s, person).find((a) => a.id === p.accountId && a.kind === 'savings');
    if (!account) throw new CommandError('Only a savings account of yours can be closed here.');
    const current = person.primaryAccountId ? s.universe.accounts[person.primaryAccountId] : undefined;
    if (!current || current.closedAt) throw new CommandError('You don’t have a checking account to move the money into.');
    const notice = savingsNotice(s, account);
    if (notice) throw new CommandError(`You’ve already given notice: ${account.name} closes on ${formatDate(notice.at, s.homeZone)}.`);
    // More than Germany's monthly allowance takes the law's three months' notice, and it closes then.
    const left = savingsLeftThisMonth(s, account);
    if (left !== undefined && account.balance + Math.floor(account.accrued ?? 0) > left) {
      const on = addMonths(s.now, 3, s.homeZone);
      s.schedule({ at: on, kind: SAVINGS_NOTICE_KIND, label: `${account.name} Closes`, category: 'home', priority: 36, payload: { personId: person.id, accountId: account.id } });
      return { closed: account.id, on };
    }
    closeSavings(s, person, account, current);
    return { closed: account.id };
  });

  sim.onSchedule(SAVINGS_NOTICE_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const account = s.universe.accounts[String(item.payload.accountId)];
    const current = person?.primaryAccountId ? s.universe.accounts[person.primaryAccountId] : undefined;
    if (!person || !account || account.closedAt || !current || current.closedAt) return;
    // The account it went to, at its bank, and when it lands where it's sent to another bank (from 2026-10-15: until
    // then the primary account was named wherever the money went, since 2026-10-10 the current account at the savings'
    // own bank where there is one; found by that day's scope pass).
    const went = closeSavings(s, person, account, current);
    const where = `your ${went.to.name} at ${went.to.institution ?? 'your bank'}`;
    if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `${account.name} Closed`, body: went.arrives !== undefined ? `Its notice period ended, and what it held is on its way to ${where}. It arrives ${formatDate(went.arrives, s.zone)}.` : `Its notice period ended, and what it held is now in ${where}.`, importance: 50, route: '/workspace/bank' });
  });
}

/**
 * A save from before the banks kept its money at "Northbank", which never
 * existed. Its current account, savings and card move to the first bank of
 * the country the player lives in, under that bank's account names and a
 * number in the country's format, with every balance and posting as it was.
 * A save already at a real bank is left alone.
 */
export function rebank(sim: Simulation): void {
  const person = sim.universe.people[sim.universe.playerId];
  if (!person) return;
  const bank = startingBank(person.currentLocationId);
  if (!bank) return;
  for (const account of Object.values(sim.universe.accounts)) {
    if (account.ownerId !== person.id || account.institution !== 'Northbank') continue;
    account.institution = bank.name;
    if (account.kind === 'checking' || account.kind === 'savings') {
      account.bankId = bank.id;
      account.name = account.kind === 'savings' ? bank.savings.name : bank.current.name;
      account.number = accountNumber(sim, person, bank, account.kind);
      account.last4 = account.number.replace(/\D/g, '').slice(-4);
    } else if (account.kind === 'credit_card') {
      account.name = bank.name + ' Credit Card';
      account.bankId = bank.id;
    }
  }
}

/** The month's end on the calendar, where it isn't. */
export function armBanking(sim: Simulation): void {
  const armed = sim.universe.scheduled.some((one) => one.kind === MONTH_END_KIND && one.status === 'pending');
  if (!armed) scheduleMonthEnd(sim, sim.now);
}
