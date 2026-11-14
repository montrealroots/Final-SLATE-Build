/**
 * SLATE — what the bank lends, holds for a term, and does when you leave it.
 *
 * The bank screen named each bank's overdraft terms and nothing charged
 * them: no account ever went below zero. Now an account can, the way the
 * bank runs it (`content/banks-lending.ts`):
 *
 * - **An arranged overdraft** (Britain, Ireland, Iceland, Germany, Canada,
 *   Korea, New Zealand and the rest that run one) is set up to a limit,
 *   charges interest on what's used at the bank's rate, or at the place in
 *   its range the record earns, past any buffer it gives free, and charges
 *   the monthly or yearly fee it charges for having one.
 * - **An overdraft by the item** (Chase, Wells Fargo, Bank of America) needs
 *   no arrangement: the bank pays what the account can't and charges a fee
 *   for each item that does it, at most so many a day and none while the
 *   account is overdrawn by less than the bank's grace amount. Chase and
 *   Wells Fargo hold the fees to the end of the next business day and let
 *   them go for an account put right by then. A US bank pays an everyday
 *   debit card purchase into an overdraft only for someone who opted in
 *   (Regulation E; Bank of America never does), and a purchase the card
 *   took is charged nothing. CommBank and Westpac charge theirs once, for a
 *   day a payment overdrew the account and that ended overdrawn, and
 *   interest on it. BNP Paribas charges interest as well as its commission.
 * - **MUFG's general account** lends against time deposits: nine tenths of
 *   them up to ¥2 million, at their rate and half a point more.
 * - **Past the limit, or with none** (`Unarranged`), some banks still pay:
 *   France's for its commission on each operation, Germany's at a higher
 *   rate on the part beyond the Dispo (the geduldete Überziehung), and New
 *   Zealand's for a fee in a month the account sat more than a margin past
 *   its limit. ANZ runs one past its arranged overdraft; BNZ's is the only
 *   one it runs on the account SLATE opens.
 * - **Spain's descubierto** costs its interest and a commission on the
 *   month's deepest point, and the two together may not cost more than the
 *   law's cap (two and a half times the legal rate of interest) on what was
 *   overdrawn day by day. What's over the cap isn't charged.
 *
 * - **An account left overdrawn** past any arranged limit for sixty days is
 *   closed by the bank. What's in the person's other accounts there goes
 *   against it, the rest is charged off to collections (a debt, paid with
 *   `bank.pay_collections`), the record takes it, and the money moves to
 *   another bank in the country. Two years of play found an account at
 *   Wells Fargo overdrawn for 348 days and $12,250 in fees; no real bank
 *   lets one run that long. Sixty days is SLATE's estimate: the figure Chase
 *   is reported to allow, which no bank publishes.
 *
 * The banks' sentences about their overdrafts were only shown, and some of
 * what they said was charged by nothing: the rate past a German Dispo,
 * La Banque Postale's unauthorized rate, ANZ's and BNZ's unarranged fees,
 * PTSB's set-up fee and Spain's cap. Each was made a term here on
 * 2026-09-25 and the sentences were deleted; Citi's and Capital One's,
 * which say they run no overdraft, stay, and the screen shows them.
 *
 * Money leaves in the household's order, with the overdraft after savings
 * and before the card (`systems/household.ts`).
 *
 * A personal loan is lent at the bank's rate, or where in its range the
 * record puts it, and repaid in equal monthly payments from the current
 * account; a payment the account can't make goes on the record, as a
 * late card payment does. It can be paid off early. A term deposit is
 * locked at the bank's rate for its term and paid out, interest and all,
 * at the end. And a person can move to another bank in their country:
 * in Britain through the Current Account Switch Service, which takes seven
 * working days, and elsewhere by opening the new accounts and moving the
 * money the same day, as a person does there.
 *
 * What no bank publishes, and so is SLATE's estimate, stands in `ESTIMATE`
 * and the screen says so: how far a bank pays items without an
 * arrangement, how big an overdraft it would arrange, what share of a
 * month's pay a loan payment may take, and the record a bank lends to.
 */

import type { Simulation } from '../core/simulation';
import { photoIdOf } from './documents';
import { drawFromBank } from './spending';
import { CommandError } from '../core/simulation';
import { isWages, type Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { exchange } from '../content/currency';
import type { Person } from '../domain/model';
import { addDays, addMonths, dateKey, formatDate, instantFromZoned, zonedParts, MS_DAY, type Instant } from '../core/time';
import { clamp } from '../core/rng';
import { bankById, bankingIn, type Bank } from '../content/banks';
import { ageOn } from './mortality';
import { redirectAway } from './routing';
import { LENDING, SWITCHING, type Lending, type Loan, type Overdraft, type Unarranged } from '../content/banks-lending';
import { accountNumber } from './banknumber';
import { endTerm, idleAccounts } from './accountlife';
import { bankOf, banksFor, cardFeeFor, cardYearOf, cardYearOver, endedWords, endOrdersOf, inSaveMoney, interestTaxFor, isoOf, monthStartOf, savingsNotice, settleFees, settleInterest, SAVINGS_NOTICE_KIND } from './banking';
import type { StandingOrder } from './payments';
import { savingsLeftThisMonth } from './cash';
import { homeOf, recordInterest } from './earnings';
import { businessDay, businessDaysBetween as bankDaysBetween, daysOfAccount } from '../content/bankdays';
import { markRecord } from './credit';
import { openingOf, usPerson } from './bankmoves';
import { hasSsn } from './taxid';
import { pendingOn } from './pending';
import { abroadRefusal, balanceText, cardFeeAbroad, heldOf, nonResidentTaxOn } from './abroad';

export const LOAN_DUE_KIND = 'bank.loan_due';
export const SWITCH_KIND = 'bank.switch_complete';
/** The new bank's first look at a switch's application, the next working day (from 2026-10-10). */
export const SWITCH_REVIEW_KIND = 'bank.switch_review';
/** An old account left open, blocked, with what a switch couldn't take: looked at weekly, closed once it's clear. */
export const SWITCH_DEBT_KIND = 'bank.switch_debt';

/**
 * CASS's own steps and limits (research-switch-loans-plans.json): a switch takes seven working days, its last the
 * switch date; called off up to seven working days before it, and after that only the balance's transfer can be
 * stopped, up to the working day before; card payments still pending on the day are held back and the rest follows
 * once they post; an old account still in debt is blocked to all but repayment and closes once it's repaid; a partial
 * switch moves the payments and keeps the old account, up to twenty working days, with no Guarantee. Recurring card
 * payments don't move under CASS: SLATE has none, so that step can't fail here, and says so.
 */
export const CASS = { partialDays: 20, debtCheckDays: 7 } as const;

/** A switch's last record, added. */
function noteSwitch(person: Person, r: NonNullable<NonNullable<Person['payments']>['switches']>[number]): void {
  const pay = (person.payments ??= {} as NonNullable<Person['payments']>);
  (pay.switches ??= []).push(r);
  if (pay.switches.length > 20) pay.switches.splice(0, pay.switches.length - 20);
}

/**
 * Why the new bank would decline a switch's application, by its own opening rules (`openRefusal`'s): a debt it charged
 * off, a ChexSystems report it reads, no photo ID in force, under its age, or a US-persons-only account. A switch is
 * applied for online, so a branch's hour isn't asked.
 */
export function switchApplicationRefusal(sim: Simulation, person: Person, to: Bank): string | undefined {
  if (collectionsOf(sim, person, to.name)) return `${to.name} won’t open an account for you while you owe it a debt it has charged off.`;
  if (declines(sim, person, to)) return `${to.name} won’t open an account for you because of the ChexSystems report ${person.chex!.bank} filed, which stays on your record until ${formatDate(person.chex!.at + CHEX.years * 365 * MS_DAY, sim.zone)}.`;
  if (!photoIdOf(person, sim.now)) return `${to.name} needs a valid photo ID from a new customer: a passport, a driver’s license or an ID card. You can apply for a passport or an ID card on Papers, under Passport And ID.`;
  const rules = openingOf(to);
  if (rules?.minimumAge !== undefined && ageOn(sim, person, sim.now) < rules.minimumAge) return `${to.name} only opens an account in your own name from age ${rules.minimumAge}.`;
  if (rules?.usPersonsOnly && !usPerson(person, sim.now)) return `${to.name} only opens this account for US citizens and permanent residents.`;
  return undefined;
}

/**
 * SLATE's estimates, where banks publish nothing.
 *
 * - `perItemCover`: how far past zero a bank that charges by the item pays
 *   before it declines, in the bank's currency. US banks cover at their
 *   discretion and publish no figure.
 * - `overdraftOfPay`: an arranged overdraft up to a month's wages paid in,
 *   within any range the bank publishes.
 * - `loanShareOfPay`: a loan payment may take up to 35% of a month's wages
 *   paid in, a common lender's line on debt to income.
 * - `scoreFloor`, `scoreBest`, `scoreGood`: a bank lends to a record of 580
 *   and up, at the bottom of its range at 780, and, where it publishes only
 *   its lowest rate, only to a record of 670 and up.
 * - `loanMonths`: 12 to 60 months, where the bank doesn't say.
 * - `closeAfterDays`: how long an account may stay below zero past any
 *   arranged limit before the bank closes it and charges it off, sixty days
 *   as Chase is reported to allow; no bank publishes one.
 * - `chargeOffHit`: what a charge-off costs the record, 100 points, about
 *   what the credit bureaus' examples show for an account sent to collections.
 */
export const ESTIMATE = {
  perItemCover: 500_00,
  overdraftOfPay: 1,
  loanShareOfPay: 0.35,
  scoreFloor: 580,
  scoreBest: 780,
  scoreGood: 670,
  loanMonths: [12, 60] as const,
  closeAfterDays: 60,
  chargeOffHit: 100,
};

export const COLLECTIONS = 'collections';

/**
 * ChexSystems. A US bank that closes an account for what's owed reports it,
 * and the report stands five years from the day, paid or not. The
 * consumer-reporting agency decides nothing; each bank does, and about four
 * in five screen with it. How often one turns a report away isn't
 * published: SLATE's estimate is 85% while the debt is unpaid and half once
 * it's paid. Turned away everywhere, a person is left the second-chance
 * account a bank offers instead, SLATE's $10 a month and no overdraft.
 * Until 2026-09-27 the next bank opened one as if nothing had happened.
 */
export const CHEX = {
  years: 5,
  declines: { unpaid: 0.85, paid: 0.5 },
  secondChanceFee: 10_00,
  source: 'https://www.chexsystems.com (consumer disclosure, 5 years); https://www.consumerfinance.gov/ask-cfpb/what-is-a-checking-account-screening-company-en-1983/; https://joinbankon.org (Bank On standards)',
} as const;

/**
 * France's rules on an overrun past the arranged overdraft (Code de la
 * consommation L312-92 and L312-93): a month of it and the bank must write
 * with its amount, rate and charges; three months and it must offer another
 * kind of credit at once. And a bank closing a current account gives two
 * months' notice (Code monétaire et financier L312-1-1), so a French account
 * closes two months after SLATE's sixty days, and the three months come
 * before it. The credit offered is the bank's personal loan over twelve
 * months at the top of its rates, SLATE's estimate of the offer; from
 * 20 November 2026 the bank must check the borrower can repay it first,
 * which SLATE doesn't. Until 2026-09-27 a French account closed at sixty
 * days like any other, and none of this was reached.
 */
export const FRANCE = {
  informAfterDays: 30,
  offerAfterDays: 90,
  closingNoticeDays: 60,
  offerMonths: 12,
  source: 'https://www.legifrance.gouv.fr (Code de la consommation, articles L312-92 and L312-93; Code monétaire et financier, article L312-1-1)',
} as const;

const isFrench = (bank: Bank | undefined) => bank?.id.startsWith('fr-') === true;

/**
 * A French debit card's payment ceiling (plafond de paiement): its standard
 * card authorizes a purchase against the ceiling, not the balance, which is
 * no hard gate (none of the five banks' standard cards is systematic-
 * authorization). BNP Paribas's Visa Classic €2,500 over 30 days; Crédit
 * Agricole's €2,600 a calendar month; La Banque Postale's €3,500 over 30
 * days at most; LCL's Visa Cléo "from €1,000" a month and Société
 * Générale's CB Visa €1,600 to €15,300, where the contract sets it: SLATE
 * takes each one's floor, its estimate. Until 2026-09-27 a French card was
 * held to the balance, as an American one is.
 */
export const FRENCH_CARDS: Readonly<Record<string, { ceiling: Money; window: 'rolling30' | 'month' }>> = {
  'fr-bnp-paribas': { ceiling: 2_500_00, window: 'rolling30' },
  'fr-credit-agricole': { ceiling: 2_600_00, window: 'month' },
  'fr-la-banque-postale': { ceiling: 3_500_00, window: 'rolling30' },
  'fr-lcl': { ceiling: 1_000_00, window: 'month' },
  'fr-societe-generale': { ceiling: 1_600_00, window: 'month' },
};
export const FRENCH_CARDS_SOURCE = 'https://mabanque.bnpparibas (Visa Classic); https://www.credit-agricole.fr (Mastercard Standard); https://www.labanquepostale.fr (Visa Classic); LCL Dispositions Générales carte Cléo 2026; https://static.sg.fr (CB Visa notice)';

/** What a French debit card may still pay in its window, in the save's money; undefined for a card with no ceiling here. */
export function cardCeilingRoom(sim: Simulation, person: Person): Money | undefined {
  const current = currentOf(sim, person);
  const rule = current?.bankId ? FRENCH_CARDS[current.bankId] : undefined;
  if (!current || !rule) return undefined;
  const bank = bankById(current.bankId!)!;
  const p = zonedParts(sim.now, sim.homeZone);
  const from = rule.window === 'month' ? instantFromZoned({ year: p.year, month: p.month, day: 1, hour: 0 }, sim.homeZone) : sim.now - 30 * MS_DAY;
  let spent = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0 && list[i]!.at >= from; i -= 1) {
    const t = list[i]!;
    if (t.category !== 'food') continue;
    for (const one of t.postings) if (one.accountId === current.id && one.amount < 0) spent -= one.amount;
  }
  return Math.max(0, inSaveMoney(sim, rule.ceiling, bank.currency) - spent);
}

/**
 * France's month and three months past the limit (`FRANCE`): the letter,
 * and the credit offered for what's past the limit.
 */
function frenchOverrun(sim: Simulation, person: Person, current: Account, bank: Bank): void {
  if (!isFrench(bank) || current.negativeSince === undefined) { current.overrunInformed = undefined; current.creditOffered = undefined; current.closingNoticed = undefined; return; }
  const days = (sim.now - current.negativeSince) / MS_DAY;
  const past = Math.max(0, -current.balance - (current.overdraftLimit ?? 0));
  const cur = saveCurrency(sim.universe);
  // An account kept in another currency is written in it, the dollars beside (from 2026-10-16: until then a Parisian's
  // account at BNP Paribas, kept from home, was written to in dollars alone). With no limit, which no account abroad
  // can arrange, what's past it is the bank's own figure exactly.
  const money = (m: Money) => {
    if (!current.currency) return formatMoney(m, cur);
    const own = m === -current.balance ? -heldOf(current) : exchange(m, cur, current.currency);
    return balanceText(sim, current, m, own);
  };
  const player = person.id === sim.universe.playerId;
  if (days >= FRANCE.informAfterDays && !current.overrunInformed) {
    current.overrunInformed = true;
    const terms = lendingOf(bank).overdraft;
    // The rate as what it's charged on (from brief 15, 2026-10-19): until then “by €120.00 at 7.00% a year, with the
    // charges each month brings”, which read as if the rate were the overrun's.
    const rate = terms && 'rate' in terms && terms.rate !== undefined ? ` The bank charges ${(terms.rate * 100).toFixed(2)}% a year on what’s overdrawn, as well as its monthly charges.` : '';
    if (player) sim.notify({ category: 'bank', title: `${bank.name} Wrote About Your Overrun`, body: `Your account has been past its overdraft limit for a month, by ${money(past)}.${rate} French law has the bank tell you after a month.`, importance: 70 });
  }
  const loan = lendingOf(bank).loan;
  // Not where a loan is held at this bank (from 2026-10-12: until then a loan at any bank stopped the offer, though a
  // person may hold one at each bank since 2026-10-10).
  // Not offered by a bank abroad, which opens nothing new for a customer abroad (`abroadRefusal`, from 2026-10-16).
  if (days >= FRANCE.offerAfterDays && !current.creditOffered && loan && past > 0 && !loanOf(sim, person, bank.id) && !abroadRefusal(person, bank)) {
    const apr = loan.to ?? loan.from;
    current.creditOffered = { amount: past, apr, months: FRANCE.offerMonths };
    if (player) sim.notify({ category: 'bank', title: `${bank.name} Offered A Loan For The Overrun`, body: `Your account has been past its overdraft limit for three months, so French law has the bank offer you a loan: ${money(past)} over ${FRANCE.offerMonths} months at ${(apr * 100).toFixed(2)}%, ${money(monthlyPayment(past, apr, FRANCE.offerMonths))} a month. You can take it on Money, under Borrowing.`, importance: 75 });
  }
  if (days >= ESTIMATE.closeAfterDays && !current.closingNoticed) {
    current.closingNoticed = true;
    if (player) sim.notify({ category: 'bank', title: `${bank.name} Gave Notice To Close`, body: `Your account has been past its overdraft limit for ${ESTIMATE.closeAfterDays} days, so it closes in two months, on ${formatDate(sim.now + FRANCE.closingNoticeDays * MS_DAY, sim.zone)}, unless it’s back within the limit by then.`, importance: 85 });
  }
}

/** A US bank's answer to somebody with a standing ChexSystems report (`bank.chex`): true where it turns them away. */
export function declines(sim: Simulation, person: Person, bank: Bank): boolean {
  const report = person.chex;
  if (!report || !bank.id.startsWith('us-') || sim.now - report.at >= CHEX.years * 365 * MS_DAY) return false;
  const unpaid = (collectionsOf(sim, person)?.balance ?? 0) < 0;
  return sim.rng('bank.chex', person.id, bank.id, String(report.at)).next() < (unpaid ? CHEX.declines.unpaid : CHEX.declines.paid);
}

/** A person's debt in collections, where a bank charged one off. */
/**
 * The bank's own debt in collections, named for it. A mortgage's shortfall in
 * collections is a collection agency's (`systems/homes.ts`): until
 * 2026-09-28 this found either, and a bank's charge-off could post into it.
 */
export function collectionsOf(sim: Simulation, person: Person, owedTo?: string): Account | undefined {
  return Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && !a.closedAt && a.kind === 'loan' && a.category === COLLECTIONS && a.name.endsWith(', In Collections') && (owedTo === undefined || a.institution === owedTo));
}

/**
 * Where a debt in collections came from, read from what was charged off into it: an account overdrawn too long
 * (`closeForOverdraft`), a card six statements behind (`chargeOff` in `systems/credit.ts`), or both at one bank. From
 * 2026-10-13: until then the panel called every debt an overdrawn account (found by the review of that day).
 */
export function collectionsSource(sim: Simulation, debt: Account): { overdraft: boolean; card: boolean } {
  const into = sim.universe.transactions.filter((t) => t.postings.some((p) => p.accountId === debt.id && p.amount < 0));
  return { overdraft: into.some((t) => t.memo.startsWith('Charged off by ')), card: into.some((t) => t.memo.startsWith('Charged off: ')) };
}

export function lendingOf(bank: Bank | undefined): Lending {
  return (bank && LENDING[bank.id]) ?? {};
}

/**
 * Whether the bank may pay an everyday debit card purchase into an overdraft:
 * everywhere it pays items at all, except a US bank the person hasn't opted
 * in with (Regulation E). Until 2026-09-25 every purchase could, and two
 * years of play at Wells Fargo ran up $9,975 in fees, most of them on
 * groceries a real bank would have declined.
 */
export function purchaseMayOverdraw(sim: Simulation, person: Person): boolean {
  const current = currentOf(sim, person);
  const bank = current?.bankId ? bankById(current.bankId) : undefined;
  const terms = lendingOf(bank).overdraft;
  if (terms?.kind !== 'per_item' || !terms.debitCard) return true;
  return terms.debitCard === 'opt_in' && current?.debitOverdraft === true;
}

/** What the bank does past the arranged limit, or with none arranged. */
export function unarrangedOf(terms: Overdraft | undefined): Unarranged | undefined {
  if (terms?.kind === 'arranged') return terms.beyond;
  return terms?.kind === 'unarranged' ? terms : undefined;
}

function currentOf(sim: Simulation, person: Person): Account | undefined {
  const account = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
  return account && !account.closedAt ? account : undefined;
}

/** Every open current account a person holds, the primary first (from 2026-10-10, when a second bank's could be kept). */
export function checkingsOf(sim: Simulation, person: Person): Account[] {
  const open = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && !a.nominal && a.kind === 'checking');
  return [...open.filter((a) => a.id === person.primaryAccountId), ...open.filter((a) => a.id !== person.primaryAccountId)];
}

/** A person's open current account at a bank, if they keep one there. */
export function checkingAt(sim: Simulation, person: Person, bankId: string | undefined): Account | undefined {
  return bankId ? checkingsOf(sim, person).find((a) => a.bankId === bankId) : undefined;
}

/** A person's open term deposits. */
export function termsOf(sim: Simulation, person: Person): Account[] {
  return Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && a.category === 'term');
}

/**
 * A person's open personal loan: at a bank where named, else any (from 2026-10-10 a person may hold one at each bank
 * they bank with; until then one in all, at the primary account's bank).
 */
export function loanOf(sim: Simulation, person: Person, bankId?: string): Account | undefined {
  return loansOf(sim, person).find((a) => bankId === undefined || a.bankId === bankId);
}

/** Every open personal loan they hold. */
export function loansOf(sim: Simulation, person: Person): Account[] {
  return Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && a.kind === 'loan' && a.category === 'personal');
}

/** The account a loan's payments come from: the one agreed, else the current account at the lender, else the primary. */
export function repaymentAccount(sim: Simulation, person: Person, loan: Account): Account | undefined {
  const agreed = loan.repayFromId ? sim.universe.accounts[loan.repayFromId] : undefined;
  return agreed && !agreed.closedAt ? agreed : checkingAt(sim, person, loan.bankId) ?? currentOf(sim, person);
}

/** How far below zero a current account may go now, in the save's money: the primary unless one is named. */
export function overdraftRoom(sim: Simulation, person: Person, account?: Account): Money {
  const named = account && !account.closedAt ? account : undefined;
  // Another bank's account than the primary draws on its arranged limit alone (from 2026-10-10): its per-item and
  // unarranged ways are the primary account's, where the everyday card pays.
  if (named && named.id !== person.primaryAccountId) return named.overdraftLimit ?? 0;
  const current = named ?? currentOf(sim, person);
  const bank = current?.bankId ? bankById(current.bankId) : undefined;
  const terms = lendingOf(bank).overdraft;
  if (!current || !bank || !terms || current.secondChance) return 0;
  const cover = inSaveMoney(sim, ESTIMATE.perItemCover, bank.currency);
  // Past an arranged limit, a French, German or New Zealand bank still pays.
  if (terms.kind === 'arranged') return (current.overdraftLimit ?? 0) + (terms.beyond ? cover : 0);
  if (terms.kind === 'per_item' || terms.kind === 'tacit' || terms.kind === 'unarranged') return cover;
  const held = termsOf(sim, person).filter((a) => a.bankId === bank.id).reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  return Math.min(inSaveMoney(sim, terms.max, bank.currency), Math.floor(held * terms.share));
}

/** What's left of it: the room less what the account is already overdrawn by. */
export function overdraftHeadroom(sim: Simulation, person: Person, account?: Account): Money {
  const current = account && !account.closedAt ? account : currentOf(sim, person);
  if (!current) return 0;
  return Math.max(0, overdraftRoom(sim, person, current) - Math.max(0, -current.balance));
}

/** Wages paid into a person's accounts over the last thirty days. */
export function wagesLastMonth(sim: Simulation, person: Person): Money {
  const mine = new Set(Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id).map((a) => a.id));
  const since = sim.now - 30 * MS_DAY;
  let total = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < since) break;
    if (!isWages(t.category)) continue;
    for (const p of t.postings) if (mine.has(p.accountId) && p.amount > 0) total += p.amount;
  }
  return total;
}

/** Where in a range the record puts a rate: the bottom at 780, the top at 580. */
export function rateForRecord(from: number, to: number | undefined, score: number): number {
  if (to === undefined) return from;
  const share = clamp((ESTIMATE.scoreBest - score) / (ESTIMATE.scoreBest - ESTIMATE.scoreFloor), 0, 1);
  return Math.round((from + (to - from) * share) * 10_000) / 10_000;
}

/** An equal monthly payment that clears a loan in its months. */
export function monthlyPayment(amount: Money, apr: number, months: number): Money {
  const r = apr / 12;
  if (r === 0) return Math.ceil(amount / months);
  return Math.ceil((amount * r) / (1 - (1 + r) ** -months));
}

/**
 * What a bank would arrange on a current account of theirs there (the primary unless one is named), or why not. Wages
 * are counted once across their banks: what another bank has already arranged comes off what this one would (from
 * 2026-10-10, when an overdraft could be arranged at a second bank).
 */
export function overdraftOffer(sim: Simulation, person: Person, account?: Account): { min: Money; max: Money; rate: number } | { refused: string } {
  const current = account && !account.closedAt && account.ownerId === person.id && account.kind === 'checking' ? account : currentOf(sim, person);
  const bank = current?.bankId ? bankById(current.bankId) : undefined;
  // Nothing new at a bank in another country, in its words (`abroadRefusal`): first, as the command asked it first. From
  // later on 2026-10-16 here, which the panel reads; until then the command alone asked it, and Borrowing at a home bank
  // kept from London drew "It would arrange up to $414 at 39.9%" and Arrange It, which the command then refused
  // (tests/integration-home-lending.test.ts).
  const away = abroadRefusal(person, bank);
  if (away) return { refused: away };
  const terms = lendingOf(bank).overdraft;
  if (!bank || !terms) return { refused: `No overdraft terms were found for ${bank?.name ?? 'your bank'}.` };
  if (terms.kind !== 'arranged') return { refused: `${bank.name} doesn’t arrange overdrafts. It handles them its own way, as the Overdraft panel says.` };
  const score = person.credit?.score ?? 0;
  if (score < ESTIMATE.scoreFloor) return { refused: `Your credit score is below ${ESTIMATE.scoreFloor}, and in the game a bank doesn’t arrange an overdraft below that.` };
  const pay = wagesLastMonth(sim, person);
  const elsewhere = checkingsOf(sim, person).filter((a) => a.id !== current!.id).reduce((sum, a) => sum + (a.overdraftLimit ?? 0), 0);
  const max = Math.min(Math.round(pay * ESTIMATE.overdraftOfPay) - elsewhere, terms.maxLimit !== undefined ? inSaveMoney(sim, terms.maxLimit, bank.currency) : Number.POSITIVE_INFINITY);
  const min = terms.minLimit !== undefined ? inSaveMoney(sim, terms.minLimit, bank.currency) : 1_00;
  if (max < min) return { refused: 'The bank arranges an overdraft against wages paid in over the last 30 days, and not enough has been paid in.' };
  return { min, max, rate: rateForRecord(terms.rate, terms.rateTo, score) };
}

/**
 * What a bank they keep a current account at would lend (the primary account's bank unless one is named), at what rate
 * and payment, or why not. Every loan they already hold, at any bank, counts against the wages it reads, so the same
 * pay isn't lent against twice (from 2026-10-10: until then one loan in all, at the primary's bank).
 */
export function loanOffer(sim: Simulation, person: Person, amount: Money, months: number, bankId?: string, purpose: 'education' | 'other' = 'other'): { apr: number; payment: Money; terms: Loan } | { refused: string } {
  const bank = bankId ? bankById(bankId) : bankOf(sim, person);
  // Nothing new at a bank in another country, first, as the overdraft's offer (from later on 2026-10-16; until then the
  // command alone asked it, and the Personal Loan panel quoted a loan the command refused).
  const away = abroadRefusal(person, bank);
  if (away) return { refused: away };
  const terms = lendingOf(bank).loan;
  if (!bank || !terms) return { refused: `No personal loan rate was found for ${bank?.name ?? 'your bank'}.` };
  // The lender's own conditions (from 2026-10-10): a purpose it won't lend for, a Social Security number, an income.
  const lender = terms.lender ?? bank.name;
  if (purpose !== 'other' && terms.notFor?.includes(purpose)) return { refused: `${lender} doesn’t lend for a post-secondary education expense.` };
  if (terms.ssn && !hasSsn(person)) return { refused: `${lender} asks for a Social Security number.` };
  if (terms.minIncome !== undefined && wagesLastMonth(sim, person) * 12 < inSaveMoney(sim, terms.minIncome, bank.currency)) return { refused: `${lender} lends on ${formatMoney(inSaveMoney(sim, terms.minIncome, bank.currency), saveCurrency(sim.universe), { cents: false })} a year of income or more, and the last 30 days’ wages come to less than that over a year.` };
  // Its customers, as the bank says: a current account there (for so many months where it says), unless it lends to
  // new customers too, to a lower ceiling (Citi). SLATE's reading where a bank says nothing: its customers.
  const there = checkingAt(sim, person, bank.id);
  if (!there && terms.newCustomerMax === undefined) return { refused: `${bank.name} only lends to its customers. Open a checking account there first.` };
  if (there && terms.customerMonths !== undefined && sim.now - there.openedAt < terms.customerMonths * 30.44 * MS_DAY) return { refused: `${bank.name} lends to customers of ${terms.customerMonths} months or more, and your account there opened ${formatDate(there.openedAt, sim.zone)}.` };
  if (!there && terms.newCustomerMax !== undefined && amount > inSaveMoney(sim, terms.newCustomerMax, bank.currency)) return { refused: `${bank.name} lends a new customer up to ${formatMoney(inSaveMoney(sim, terms.newCustomerMax, bank.currency), saveCurrency(sim.universe), { cents: false })}.` };
  if (loanOf(sim, person, bank.id)) return { refused: `You already have a loan with ${bank.name}.` };
  const score = person.credit?.score ?? 0;
  if (score < ESTIMATE.scoreFloor) return { refused: `Your credit score is below ${ESTIMATE.scoreFloor}, and in the game a bank doesn’t lend below that.` };
  if (terms.to === undefined && !terms.market && score < ESTIMATE.scoreGood) {
    return { refused: `${bank.name} publishes only its lowest rate, so in the game it lends only with a credit score of ${ESTIMATE.scoreGood} or more.` };
  }
  const [least, most] = [terms.minMonths ?? ESTIMATE.loanMonths[0], terms.maxMonths ?? ESTIMATE.loanMonths[1]];
  if (months < least || months > most) return { refused: `The bank lends for ${least} to ${most} months.` };
  const cur = saveCurrency(sim.universe);
  if (terms.minAmount !== undefined && amount < inSaveMoney(sim, terms.minAmount, bank.currency)) {
    return { refused: `The bank lends at least ${formatMoney(inSaveMoney(sim, terms.minAmount, bank.currency), cur, { cents: false })}.` };
  }
  if (terms.maxAmount !== undefined && amount > inSaveMoney(sim, terms.maxAmount, bank.currency)) {
    return { refused: `The bank lends up to ${formatMoney(inSaveMoney(sim, terms.maxAmount, bank.currency), cur, { cents: false })}.` };
  }
  if (!(amount > 0)) return { refused: 'Enter how much to borrow.' };
  const apr = terms.market ? terms.from : rateForRecord(terms.from, terms.to, score);
  const payment = monthlyPayment(amount, apr, months);
  const pay = wagesLastMonth(sim, person);
  if (pay <= 0) return { refused: 'The bank lends against wages paid in over the last 30 days, and none has been paid in.' };
  const existing = loansOf(sim, person).reduce((sum, l) => sum + (l.loanPayment ?? 0), 0);
  if (payment + existing > pay * ESTIMATE.loanShareOfPay) {
    // The share and its figure, which the sentence turns on (from brief 15, 2026-10-19): until then “is more than the bank
    // lets a loan take of $2,000 of wages”, with no share and no figure to compare.
    const most = formatMoney(Math.floor(pay * ESTIMATE.loanShareOfPay), cur, { cents: false });
    const share = `${Math.round(ESTIMATE.loanShareOfPay * 100)}%`;
    return { refused: existing > 0
      ? `A payment of ${formatMoney(payment, cur, { cents: false })} a month, with the ${formatMoney(existing, cur, { cents: false })} you already pay on loans, is more than the ${share} of your wages loans can take: ${most} of the ${formatMoney(pay, cur, { cents: false })} paid in over the last 30 days.`
      : `A payment of ${formatMoney(payment, cur, { cents: false })} a month is more than the ${share} of your wages a loan can take: ${most} of the ${formatMoney(pay, cur, { cents: false })} paid in over the last 30 days.` };
  }
  return { apr, payment, terms };
}

function post(sim: Simulation, memo: string, category: string, postings: { accountId: string; amount: Money; native?: Money }[]): void {
  sim.post({ memo, category, postings });
}

/** Whether the bank posts items at the same moment lowest first (`ties`). */
export function lowestFirst(sim: Simulation, person: Person): boolean {
  const current = currentOf(sim, person);
  const terms = lendingOf(current?.bankId ? bankById(current.bankId) : undefined).overdraft;
  return terms?.kind === 'per_item' && terms.ties === 'low';
}

/** The order the month's rent and bills post in at the same moment: the smaller first at a bank that takes the lowest first, the larger first otherwise. */
export function monthOrder(sim: Simulation, person: Person, rent: Money, bills: Money): ['rent', 'bills'] | ['bills', 'rent'] {
  const low = lowestFirst(sim, person);
  return (low ? bills < rent : bills > rent) ? ['bills', 'rent'] : ['rent', 'bills'];
}

/** A fee or interest out of the current account, to the bank; with the bank's own figure where it's kept in another currency. */
function charge(sim: Simulation, account: Account, amount: Money, memo: string, category: string, expense: string, native?: Money): void {
  if (amount <= 0) return;
  post(sim, memo, category, [
    { accountId: account.id, amount: -amount, ...(native !== undefined && account.currency ? { native: -native } : {}) },
    { accountId: sim.nominalAccount('expense', expense).id, amount },
  ]);
}

/**
 * The debit card's year at the night's turn (from brief 10, 2026-10-16): on an account's first night in the life its first
 * card year opens, and on the night its year ends (`cardYearOver`) the year just ended is settled by the rule it was
 * opened under and the next opens under the bank's rule now (`CardYear.paid`). Paid ahead, opening a year charges it, at
 * the age the price list reads that day, and keeps what it took for a close's refund (`cardFeePaid`, `cardYearDue`);
 * charged behind, opening one charges nothing and its end charges it. Nothing once the account's fees have ended
 * (`feesEndedAt`): a close tried again on an account left overdrawn charged the year again on its anniversary until then.
 * Until then each anniversary of the account's opening or its last charge, 365 days apart, charged the fee, and, where
 * the bank charged it ahead (`Bank.card.ahead`, Berliner Sparkasse's, from earlier on 2026-10-16), the account's first
 * night: Arion's account opened in the life waited a year for its first, and its renewal fell on 24 August 2028, a day
 * early across 29 February (docs/verification/remaining-10/arion-result.json).
 */
function cardYearNight(sim: Simulation, person: Person, account: Account, bank: Bank): void {
  const card = bank.card;
  const year = cardYearOf(bank);
  if (!card?.yearly || !year || account.feesEndedAt !== undefined || !cardYearOver(sim, account, year)) return;
  const fee = cardFeeFor(sim, person, bank);
  if (account.cardFeeAt !== undefined && account.cardYearRule === 'behind' && fee > 0) {
    charge(sim, account, inSaveMoney(sim, fee, bank.currency), 'Debit card yearly fee', 'bank_fee', 'Bank Fees', fee);
  }
  account.cardFeeAt = sim.now;
  account.cardYearRule = year.paid;
  account.cardFeePaid = year.paid === 'ahead' ? fee : 0;
  if (year.paid === 'ahead' && fee > 0) charge(sim, account, inSaveMoney(sim, fee, bank.currency), 'Debit card yearly fee', 'bank_fee', 'Bank Fees', fee);
}

/** The overdraft interest an account has built since the 1st and not yet been charged, in whole cents. */
export function overdraftInterestOf(account: Account): Money {
  return Math.max(0, Math.floor(account.odAccrued ?? 0));
}

/**
 * Charges the overdraft interest an account has built since the 1st, as the 1st charges it, where the account closes
 * before then, or the bank sets off what it's owed (from 2026-10-16). The fraction of a cent stays behind, as it does on
 * the 1st. Until then every close dropped it: Close It, Cancel It, a bank's own close, a switch and the overdraft's
 * set-off closed the account with it unsettled, nothing charges a closed account, and a home account abroad overdrawn,
 * paid back and closed before the 1st kept the interest it owed (docs/verification/remaining/banking-checklist.json,
 * banking.1.overdraft-interest).
 */
export function settleOverdraftInterest(sim: Simulation, account: Account, memo = 'Overdraft interest, on closing'): void {
  const interest = overdraftInterestOf(account);
  if (interest <= 0) return;
  account.odAccrued = (account.odAccrued ?? 0) - interest;
  charge(sim, account, interest, memo, 'bank_fee', 'Overdraft Interest');
}

/**
 * The fee for an item that took the current account below zero, where the
 * bank charges by the item: after the payment's posted, if the account is
 * overdrawn by more than the grace, once per item up to the day's cap.
 */
export function chargeForItem(sim: Simulation, person: Person, item?: Money): void {
  const current = currentOf(sim, person);
  const bank = current?.bankId ? bankById(current.bankId) : undefined;
  const terms = lendingOf(bank).overdraft;
  if (!current || !bank || !terms) return;
  // No fee on a small item, where the bank waives one.
  if (terms.kind === 'per_item' && terms.smallItemsFree !== undefined && item !== undefined && item <= inSaveMoney(sim, terms.smallItemsFree, bank.currency)) return;
  // The month's deepest point, for a commission charged on it.
  if (current.balance < 0) current.odPeak = Math.max(current.odPeak ?? 0, -current.balance);
  let fee: { fee: Money; maxPerDay?: number; maxPerMonth?: number } | undefined;
  if (terms.kind === 'per_item' && terms.atMidnight) {
    // Charged at midnight, if the day still ends overdrawn. The household
    // asks only for an item that took the account below zero.
    current.overdrewDay = dateKey(sim.now, sim.homeZone);
    return;
  }
  if (terms.kind === 'per_item') {
    if (current.balance >= -(terms.graceUpTo !== undefined ? inSaveMoney(sim, terms.graceUpTo, bank.currency) : 0)) return;
    if (terms.nextDay) {
      // Held until the end of the next business day, at most the day's cap. An item on a weekend or a bank holiday is
      // the next business day’s, as the bank posts it in that day’s nightly processing (Chase’s Deposit Account
      // Agreement, effective 6/14/2026: transactions are posted “when we transition from one business day to the next”;
      // Wells Fargo’s, effective 2026-07-28: “We process transactions each business day (not Saturdays, Sundays, or
      // federal holidays)”), so it has until the end of the business day after that. Until 2026-10-13 it was its
      // calendar day’s, a business day short: Thanksgiving’s groceries were charged at the end of the Friday where Chase
      // waits for the end of the Monday (found by that day’s third round of defects).
      const kept = daysOfAccount(current, person);
      let day = dateKey(sim.now, sim.homeZone);
      if (!businessDay(kept.countryId, day, kept.regionId)) day = nextBusinessDay(day, kept.countryId, kept.regionId);
      const list = current.pendingItems ?? [];
      const today = list.find((one) => one.day === day);
      if (today) today.count = Math.min(today.count + 1, terms.maxPerDay ?? Number.POSITIVE_INFINITY);
      else list.push({ day, count: 1 });
      current.pendingItems = list;
      return;
    }
    fee = terms;
  } else if (terms.kind === 'arranged' && terms.perUse && current.overdraftPerUse && (current.overdraftLimit ?? 0) > 0) {
    // Canada's pay-per-use: a fee each time the overdraft is created or grows, once a day at most where the bank says.
    fee = { fee: terms.perUse.fee, ...(terms.perUse.oncePerDay ? { maxPerDay: 1 } : {}) };
  } else if (unarrangedOf(terms)?.fee !== undefined) {
    const past = unarrangedOf(terms)!;
    if (current.balance >= -(current.overdraftLimit ?? 0)) return;
    fee = { fee: past.fee!, maxPerMonth: past.maxPerMonth };
  }
  if (!fee) return;
  const today = dateKey(sim.now, sim.homeZone);
  const month = today.slice(0, 7);
  if (current.itemsDay !== today) { current.itemsDay = today; current.itemsCount = 0; }
  if (current.itemsMonth !== month) { current.itemsMonth = month; current.itemsMonthCount = 0; }
  if (fee.maxPerDay !== undefined && (current.itemsCount ?? 0) >= fee.maxPerDay) return;
  if (fee.maxPerMonth !== undefined && (current.itemsMonthCount ?? 0) >= fee.maxPerMonth) return;
  current.itemsCount = (current.itemsCount ?? 0) + 1;
  current.itemsMonthCount = (current.itemsMonthCount ?? 0) + 1;
  charge(sim, current, inSaveMoney(sim, fee.fee, bank.currency), 'Overdraft fee', 'bank_fee', 'Bank Fees');
}

/**
 * The fee for a payment the bank returned unpaid, where it charges one:
 * no more than once every so many business days, and none on a small one.
 * The bank and account are those the payment was drawn on (`from`), the
 * primary where none is named. Until 2026-10-13 they were always the
 * primary’s, so a loan repaid from another bank’s account had the primary
 * bank’s fee, or none, taken from the primary (found by that day’s third
 * round of defects).
 */
export function chargeReturned(sim: Simulation, person: Person, short: Money, from?: Account): Money {
  const current = from ?? currentOf(sim, person);
  const bank = current?.bankId ? bankById(current.bankId) : undefined;
  const rule = bank?.returned;
  if (!current || !bank || !rule || short <= 0) return 0;
  if (rule.ifShortAtLeast !== undefined && short < inSaveMoney(sim, rule.ifShortAtLeast, bank.currency)) return 0;
  const kept = daysOfAccount(current, person);
  if (current.returnedAt !== undefined && bankDaysBetween(current.returnedAt, sim.now, kept.countryId, sim.homeZone, kept.regionId) < rule.gapDays) return 0;
  current.returnedAt = sim.now;
  // What it charged, for the notice that says why (from 2026-10-20, brief 17): until then a missed loan payment's notice
  // left the fee unsaid, and the statement was the first place it showed.
  const fee = inSaveMoney(sim, rule.fee, bank.currency);
  charge(sim, current, fee, 'Returned payment fee', 'bank_fee', 'Bank Fees');
  return fee;
}


/**
 * A debit card purchase's fee, where the bank charges one and the age isn't spared; and on a card from a bank in another
 * country (from 2026-10-16), its fee on a purchase in another currency, worked on `paid`, what the card took from the
 * account, in the bank's own money (`cardFeeAbroad`).
 */
export function chargeForPurchase(sim: Simulation, person: Person, paid = 0): void {
  const current = currentOf(sim, person);
  const bank = current?.bankId ? bankById(current.bankId) : undefined;
  if (!current || !bank) return;
  const abroad = cardFeeAbroad(sim, current, paid);
  if (abroad) charge(sim, current, abroad.fee, 'Foreign transaction fee', 'bank_fee', 'Bank Fees', abroad.native);
  const card = bank.card;
  if (!card?.perPurchase) return;
  if (card.freeUnder !== undefined && ageOn(sim, person, sim.now) < card.freeUnder) return;
  charge(sim, current, inSaveMoney(sim, card.perPurchase, bank.currency), 'Debit card purchase fee', 'bank_fee', 'Bank Fees', card.perPurchase);
}

/**
 * When an account last had money moved in or out by its owner or their employer, not the bank; for an account brought
 * into the save, no earlier than its last use before it (`lastUsedBefore`, from 2026-10-16).
 */
function lastUsed(sim: Simulation, account: Account): Instant {
  const before = account.lastUsedBefore ?? account.openedAt;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < account.openedAt) break;
    if (t.category === 'interest' || t.category === 'bank_fee' || t.category === 'tax_refund') continue;
    if (t.postings.some((p) => p.accountId === account.id)) return Math.max(t.at, before);
  }
  return before;
}

/** Transactions on an account between two moments, other than the bank's own. */
function transactionsBetween(sim: Simulation, account: Account, from: Instant, to: Instant): { count: number; wages: boolean } {
  let count = 0;
  let wages = false;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const t = list[i]!;
    if (t.at < from) break;
    if (t.at >= to || t.category === 'interest' || t.category === 'bank_fee') continue;
    if (!t.postings.some((p) => p.accountId === account.id)) continue;
    count += 1;
    if (isWages(t.category)) wages = true;
  }
  return { count, wages };
}

/**
 * A loan's next payment after a moment: on the day of the month it was taken, or the month's last day where the month is
 * shorter, as the payment schedule a lender discloses when the loan is made (Reg Z §1026.18(g)) is a day of each month.
 * From 2026-10-21 (brief 20's money audit): until then each payment was set a calendar month after the one before, so a
 * loan taken on 31 October was paid on 30 November, 30 December, 30 January, 28 February and on the 28th from then on.
 */
function scheduleLoan(sim: Simulation, loan: Account, after: Instant): void {
  let months = 1;
  while (addMonths(loan.openedAt, months, sim.homeZone) <= after) months += 1;
  sim.schedule({
    at: addMonths(loan.openedAt, months, sim.homeZone), kind: LOAN_DUE_KIND, label: 'World Simulation', category: 'system', priority: 85,
    refType: 'account', refId: loan.id, payload: { accountId: loan.id },
  });
}

/** Pays an amount from the bank, overdraft and all, and says what it couldn't. */
function payFromBank(sim: Simulation, person: Person, amount: Money, from?: Account): { postings: { accountId: string; amount: Money }[]; short: Money } {
  // As every other payment is taken (`drawFromBank`): savings only where it's linked, and with its fee. Until
  // 2026-09-28 a loan's took from savings whatever the setting, and skipped the fee and a German allowance. The savings
  // is at the bank of the account it's drawn from, the loan's repayment account, whichever bank that is. How You Pay and
  // `bank.set_payments` count it (`linkCovers` in `systems/payments.ts`) from 2026-10-12, group r3b. Until then they read
  // the primary account's bank alone, and said On covered nothing while this drew on linked savings at another bank.
  return drawFromBank(sim, person, amount, true, undefined, from);
}


/** Moves one person's bank to another of their country's, now. */
function completeSwitch(sim: Simulation, person: Person, to: Bank, quietly = false, secondChance = false, fromId?: string, how: { keepBalance?: boolean; partial?: boolean } = {}): void {
  // The account the switch was asked for (from 2026-10-10: until then whichever was primary on the day it completed).
  const named = fromId ? sim.universe.accounts[fromId] : undefined;
  const old = named && !named.closedAt ? named : currentOf(sim, person);
  if (!old) return;
  // A partial switch, or one whose balance transfer was stopped: the payments move, and the old account stays open
  // with what it holds (from 2026-10-10).
  if ((how.keepBalance || how.partial) && !quietly) {
    const fresh = openBeside(sim, person, to, old, secondChance);
    noteSwitch(person, { at: sim.now, fromBank: old.institution, toBank: to.name, outcome: how.partial ? 'partial' : 'balance-kept', on: sim.now });
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: how.partial ? `A Partial Switch To ${to.name}` : `Switched To ${to.name}, The Balance Left`, body: `Your ${fresh.name} is open and your wages, standing orders and autopay move to it. ${old.name} stays open with ${formatMoney(old.balance, saveCurrency(sim.universe))}${how.partial ? ': a partial switch keeps the old account' : ', as you asked'}. Move it and close the account on Money, under Your Banks, whenever you want.`, importance: 70, route: '/workspace/bank' });
    return;
  }
  // Card payments still pending on the day: the old bank holds back what covers them and sends the rest once they post
  // (from 2026-10-10: until then they were settled into the new account as if posted). Everything else moves as on a
  // switch that completes: the savings, the orders, the wages, the autopay, the loan repayments (from 2026-10-12).
  const pending = -pendingOn(sim, old);
  const held = pending > 0 && old.balance >= 0 && !quietly ? pending : 0;
  let across = 0;
  // Overdrawn on the day, the old bank can't close it (PAD Art. 10(4)(e); CASS asks the overdraft settled first): the new
  // account opens and the payments move, and the old one stays open with what it owes, said, for the player to clear and
  // close (from 2026-10-10: until then the debt moved across with the balance).
  if (old.balance < 0 && !quietly) {
    openBeside(sim, person, to, old, secondChance);
    // Blocked to all but repayment, and closed once it's repaid (CASS's Account Closure Instruction, from 2026-10-10).
    old.switchDebt = true;
    sim.schedule({ at: sim.now + CASS.debtCheckDays * MS_DAY, kind: SWITCH_DEBT_KIND, label: `${old.name}: Owed`, category: 'home', priority: 36, payload: { personId: person.id, accountId: old.id } });
    noteSwitch(person, { at: sim.now, fromBank: old.institution, toBank: to.name, outcome: 'debt', why: `overdrawn by ${formatMoney(-old.balance, saveCurrency(sim.universe))}`, on: sim.now });
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: `The Switch To ${to.name} Is Only Part Done`, body: `Your ${to.current.name} is open and your wages, standing orders and autopay move to it. ${old.name} was overdrawn by ${formatMoney(-old.balance, saveCurrency(sim.universe))}, so ${old.institution} keeps it open, blocked to everything but paying it off, on its overdraft’s terms. It closes once it’s repaid. Move money into it on Money, under Move Money.`, importance: 85, route: '/workspace/bank' });
    return;
  }
  const oldSavings = Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && !a.closedAt && a.kind === 'savings' && a.category !== 'term' && a.bankId === old.bankId);
  const open = (kind: 'checking' | 'savings', from: Account) => {
    const number = accountNumber(sim, person, to, kind);
    const account = sim.openAccount({
      id: sim.nextId('account'), kind, name: kind === 'checking' ? to.current.name : to.savings.name, ownerId: person.id,
      institution: to.name, bankId: to.id, number, last4: number.replace(/\D/g, '').slice(-4), openedAt: sim.now, monthOpen: 0,
    });
    if (from === old && held > 0) {
      across = Math.max(0, from.balance - held);
      if (across > 0) post(sim, `Moved to ${to.name}`, 'transfer', [{ accountId: from.id, amount: -across }, { accountId: account.id, amount: across }]);
      const latest = Math.max(sim.now, ...sim.universe.transactions.filter((t) => t.postsAt !== undefined && t.postsAt > sim.now && t.postings.some((q) => q.accountId === from.id)).map((t) => t.postsAt!));
      from.closingAt = latest + MS_DAY;
      sim.schedule({ at: from.closingAt, kind: 'bank.current_closes', label: `${from.name} Closes`, category: 'home', priority: 36, payload: { personId: person.id, accountId: from.id, remainderTo: account.id } });
      return account;
    }
    // The balance goes across, and anything built up on it is paid first, and any fees it owes, and any overdraft interest
    // built since the 1st (from 2026-10-16, `settleOverdraftInterest`). Re-banked after a charge-off (`quietly`), the
    // overdraft's set-off has settled the fees already (`closeForOverdraft`), and until later on 2026-10-16 a second
    // settling charged the month's fee again and carried it to the new bank as an overdraft; it charges nothing since, the
    // first having ended them (`feesEndedAt`), and `quietly` still passes it by.
    settleInterest(sim, from, `Interest: ${from.name}, on closing`);
    settleOverdraftInterest(sim, from);
    if (!quietly) settleFees(sim, from);
    if (from.balance !== 0) {
      post(sim, `Moved to ${to.name}`, 'transfer', [{ accountId: from.id, amount: -from.balance }, { accountId: account.id, amount: from.balance }]);
    }
    from.closedAt = sim.now;
    from.overdraftLimit = undefined;
    return account;
  };
  const current = open('checking', old);
  if (secondChance) current.secondChance = true;
  person.primaryAccountId = current.id;
  const moved = new Map([[old.id, current.id]]);
  // German savings past the month's allowance isn't a payment account the
  // switch moves: notice is given on it, and it closes into the new account
  // in three months (`bank.savings_notice`).
  const allowance = oldSavings ? savingsLeftThisMonth(sim, oldSavings) : undefined;
  if (oldSavings && allowance !== undefined && oldSavings.balance + Math.floor(oldSavings.accrued ?? 0) > allowance) {
    if (!savingsNotice(sim, oldSavings)) sim.schedule({ at: addMonths(sim.now, 3, sim.homeZone), kind: SAVINGS_NOTICE_KIND, label: `${oldSavings.name} Closes`, category: 'home', priority: 36, payload: { personId: person.id, accountId: oldSavings.id } });
  } else if (oldSavings) moved.set(oldSavings.id, open('savings', oldSavings).id);
  // Standing orders and payments set up ahead move with the accounts, as a
  // switching service moves them. Until 2026-09-27 they stayed pointed at the
  // closed accounts: an order failed every month, and a payment was dropped.
  for (const order of person.payments?.standingOrders ?? []) {
    order.toId = moved.get(order.toId) ?? order.toId;
    if (order.fromId) order.fromId = moved.get(order.fromId) ?? order.fromId;
  }
  // So do wages and other payments, each card's autopay, and each loan's repayment, where they were set to the old
  // accounts (from 2026-10-10, when each became an instruction of its own: `systems/routing.ts`). One never set follows
  // the primary account here. Until 2026-10-12 a loan's repayment stayed set to the closed account, and fell to the
  // current account at the lender's bank where one was kept, not to the account that took over.
  const pay = person.payments;
  if (pay?.depositTo) pay.depositTo = moved.get(pay.depositTo) ?? pay.depositTo;
  if (pay?.depositChange) pay.depositChange.to = moved.get(pay.depositChange.to) ?? pay.depositChange.to;
  if (person.credit) {
    for (const state of [person.credit, ...Object.values(person.credit.cards ?? {})]) {
      if (state.autopayFrom) state.autopayFrom = moved.get(state.autopayFrom) ?? state.autopayFrom;
    }
  }
  for (const loan of loansOf(sim, person)) if (loan.repayFromId) loan.repayFromId = moved.get(loan.repayFromId) ?? loan.repayFromId;
  for (const one of sim.universe.scheduled) {
    if (one.status !== 'pending' || one.kind !== 'bank.scheduled_payment' || one.payload.personId !== person.id) continue;
    one.payload = { ...one.payload, fromId: moved.get(String(one.payload.fromId)) ?? one.payload.fromId, toId: moved.get(String(one.payload.toId)) ?? one.payload.toId };
  }
  if (held > 0) {
    noteSwitch(person, { at: sim.now, fromBank: old.institution, toBank: to.name, outcome: 'held', why: `${formatMoney(held, saveCurrency(sim.universe))} of card payments still pending`, on: sim.now });
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: `Switched To ${to.name}, Some Held Back`, body: `Your payments are at ${to.name} now, with ${formatMoney(across, saveCurrency(sim.universe))}. ${old.institution} holds back ${formatMoney(held, saveCurrency(sim.universe))} for card payments still pending, and closes ${old.name} once they post, about ${formatDate(old.closingAt!, sim.zone)}, sending what’s left across.`, importance: 70, route: '/workspace/bank' });
    return;
  }
  if (!quietly) noteSwitch(person, { at: sim.now, fromBank: old.institution, toBank: to.name, outcome: 'complete', on: sim.now });
  if (person.id === sim.universe.playerId && !quietly) {
    sim.notify({ category: 'bank', title: `Switched To ${to.name}`, body: `Your money is at ${to.name} now, in a ${to.current.name}. Your wages and payments go through it from today.`, importance: 60 });
  }
}

/**
 * The new bank's current account opened beside an old one that stays open, and every payment instruction on the old
 * one moved to it: wages, standing orders, scheduled payments, card autopay and loan repayments.
 */
function openBeside(sim: Simulation, person: Person, to: Bank, old: Account, secondChance = false): Account {
  const number = accountNumber(sim, person, to, 'checking');
  const fresh = sim.openAccount({ id: sim.nextId('account'), kind: 'checking', name: to.current.name, ownerId: person.id, institution: to.name, bankId: to.id, number, last4: number.replace(/\D/g, '').slice(-4), openedAt: sim.now, monthOpen: 0, ...(secondChance ? { secondChance: true } : {}) });
  if (person.primaryAccountId === old.id) person.primaryAccountId = fresh.id;
  const pay = person.payments;
  if (pay?.depositTo === old.id) pay.depositTo = fresh.id;
  // A standing order pays from a current account and into savings (`bank.add_standing_order`), so only where it pays
  // from moves. Until 2026-10-13 one paying into the old current account was moved too, which no order could be.
  for (const order of pay?.standingOrders ?? []) if (order.fromId === old.id) order.fromId = fresh.id;
  if (person.credit) for (const st of [person.credit, ...Object.values(person.credit.cards ?? {})]) if (st.autopayFrom === old.id) st.autopayFrom = fresh.id;
  for (const loan of Object.values(sim.universe.accounts)) if (loan.kind === 'loan' && loan.repayFromId === old.id) loan.repayFromId = fresh.id;
  for (const one of sim.universe.scheduled) {
    if (one.status !== 'pending' || one.kind !== 'bank.scheduled_payment' || one.payload.personId !== person.id) continue;
    if (one.payload.fromId === old.id) one.payload = { ...one.payload, fromId: fresh.id };
  }
  return fresh;
}

/**
 * On the first of the month: a dormant account's yearly fee, and the fee for
 * a month with too few transactions, where the bank charges them.
 */
function monthlyCharges(sim: Simulation, person: Person, current: Account, bank: Bank): void {
  idleAccounts(sim, person, (account) => lastUsed(sim, account));
  const monthStart = monthStartOf(sim, sim.now - MS_DAY);
  for (const account of Object.values(sim.universe.accounts)) {
    if (account.ownerId !== person.id || account.closedAt || account.bankId !== bank.id) continue;
    if (account.kind !== 'checking' && account.kind !== 'savings') continue;
    const dormant = bank.dormant;
    if (dormant && sim.now - lastUsed(sim, account) >= dormant.afterYears * 365 * MS_DAY
      && (dormant.belowBalance === undefined || account.balance < inSaveMoney(sim, dormant.belowBalance, bank.currency))
      && (account.dormantFeeAt === undefined || sim.now - account.dormantFeeAt >= 365 * MS_DAY)) {
      account.dormantFeeAt = sim.now;
      // A Japanese ordinary deposit has no overdraft (SMBC's rule in the research, `NonResidentFee.unpaid`): the fee takes
      // no more than the account holds, SLATE's reading (from 2026-10-16: until then it took an empty account below zero,
      // and the overdraft's set-off closed it).
      // In the bank's own figure where the account is kept in its money, from 2026-10-16.
      const yearly = inSaveMoney(sim, dormant.yearly, bank.currency);
      const capped = bank.iso === 'JP' && yearly > account.balance;
      const fee = capped ? Math.max(0, account.balance) : yearly;
      if (fee > 0) charge(sim, account, fee, 'Dormant account fee', 'bank_fee', 'Bank Fees', capped ? undefined : dormant.yearly);
    }
  }
  if (current.secondChance) charge(sim, current, inSaveMoney(sim, CHEX.secondChanceFee, 'USD'), 'Second chance account fee', 'bank_fee', 'Bank Fees');
  const quiet = bank.quietMonth;
  if (quiet && current.openedAt < monthStart) {
    const month = transactionsBetween(sim, current, monthStart, sim.now);
    if (month.count < quiet.minTransactions && !(quiet.unlessWages && month.wages)) {
      // In the bank's own figure where the account is kept in its money (from 2026-10-16: until then worked back from the
      // dollars, and thirty-four of Santander México's drifted 68 centavos past what they come to).
      charge(sim, current, inSaveMoney(sim, quiet.fee, bank.currency), 'Quiet month fee', 'bank_fee', 'Bank Fees', quiet.fee);
    }
  }
}

/**
 * Iceland: on the assessment's day, the tax taken on the first 300,000 kr of
 * last year's interest comes back into the current account. The allowance is a
 * resident's, as `interestAllowanceLeft` in `systems/banking.ts` reads it: a
 * customer abroad has 12% taken at source (`NON_RESIDENT_TAX`) and nothing back.
 * From 2026-10-21 (brief 20's money audit): until then a Reykjavík-raised student
 * keeping her account at Arion from New Haven was given back 22% of the first
 * 300,000 kr on 1 June, more than the 12% taken.
 */
function refundInterestTax(sim: Simulation, person: Person, current: Account, bank: Bank): void {
  const rule = bankingIn(bank.iso)?.interestTax;
  const refund = rule?.refund;
  if (!rule || !refund || !rule.rate || nonResidentTaxOn(sim, current) !== undefined) return;
  const today = zonedParts(sim.now, sim.homeZone);
  if (today.month !== refund.month || today.day !== refund.day) return;
  const from = instantFromZoned({ year: today.year - 1, month: 1, day: 1, hour: 0 }, sim.homeZone);
  const to = instantFromZoned({ year: today.year, month: 1, day: 1, hour: 0 }, sim.homeZone);
  const mine = new Set(Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && a.bankId !== undefined && bankById(a.bankId)?.iso === bank.iso).map((a) => a.id));
  let gross = 0;
  for (const t of sim.universe.transactions) {
    if (t.at < from || t.at >= to || t.category !== 'interest' || !t.postings.some((p) => mine.has(p.accountId))) continue;
    for (const p of t.postings) if (p.amount < 0 && sim.universe.accounts[p.accountId]?.kind === 'income') gross += -p.amount;
  }
  const back = Math.round(Math.min(gross, inSaveMoney(sim, refund.allowance, bank.currency)) * rule.rate);
  if (back <= 0) return;
  post(sim, 'Tax on interest refunded at assessment', 'tax_refund', [
    { accountId: current.id, amount: back },
    { accountId: sim.nominalAccount('expense', 'Tax On Interest').id, amount: -back },
  ]);
  if (person.id === sim.universe.playerId) {
    sim.notify({ category: 'bank', title: 'Tax On Interest Refunded', body: `The assessment gave back ${formatMoney(back, saveCurrency(sim.universe), { cents: false })} of the tax taken on last year’s interest.`, importance: 50 });
  }
}

/**
 * Fees held for the next business day: charged for each day whose next
 * business day has ended with the account still past the grace, and let go
 * for one brought back, or one whose own business day ended within it.
 */
function settlePendingItems(sim: Simulation, current: Account, bank: Bank, terms: Extract<Overdraft, { kind: 'per_item' }>): void {
  const list = current.pendingItems;
  if (!list?.length) return;
  const today = dateKey(sim.now, sim.homeZone);
  const grace = terms.graceUpTo !== undefined ? inSaveMoney(sim, terms.graceUpTo, bank.currency) : 0;
  const keep: { day: string; count: number }[] = [];
  const kept = daysOfAccount(current, sim.universe.people[current.ownerId ?? '']);
  for (const one of list) {
    // Let go at the end of its own business day, the midnight after it, where the account ends that day within the grace:
    // Chase charges no fee “if your account is overdrawn by $50 or less at the end of the business day” (chase.com,
    // Overdraft Services, read 2026-10-13), and Wells Fargo none “if both your ending daily account balance and available
    // balance are overdrawn by $10 or less after we have processed all of your transactions” (wellsfargo.com, Overdraft
    // Services, read 2026-10-13). From 2026-10-13: until then only the end of the next business day was read, so a day
    // ended within the grace and a next day ended past it was charged that first day’s items too (found by that day’s
    // third round of defects).
    if (dayAfter(one.day) === today && current.balance >= -grace) continue;
    if (!nextBusinessDayOver(one.day, today, kept)) { keep.push(one); continue; }
    if (current.balance >= -grace) continue;
    const month = today.slice(0, 7);
    if (current.itemsMonth !== month) { current.itemsMonth = month; current.itemsMonthCount = 0; }
    for (let i = 0; i < one.count; i += 1) {
      if (terms.maxPerMonth !== undefined && (current.itemsMonthCount ?? 0) >= terms.maxPerMonth) break;
      current.itemsMonthCount = (current.itemsMonthCount ?? 0) + 1;
      charge(sim, current, inSaveMoney(sim, terms.fee, bank.currency), 'Overdraft fee', 'bank_fee', 'Bank Fees');
    }
  }
  current.pendingItems = keep.length ? keep : undefined;
}

/**
 * Whether a business day has begun and ended between a day and today. At a
 * US bank a Federal Reserve holiday isn't one: the fees held over Thanksgiving
 * wait for the Friday. Until 2026-09-27 they came on the Thursday.
 */
function nextBusinessDayOver(day: string, today: string, kept: { countryId: string; regionId?: string }): boolean {
  return nextBusinessDay(day, kept.countryId, kept.regionId) < today;
}

/** The calendar day after a day, as its date key. */
const dayAfter = (day: string): string => {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
};

/** The business day after a day, as its date key: a weekday the bank's country keeps no holiday on (`content/bankdays.ts`). */
export function nextBusinessDay(day: string, countryId: string, regionId?: string): string {
  const [y, m, d] = day.split('-').map(Number) as [number, number, number];
  for (let i = 1; i < 15; i += 1) {
    const key = new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10);
    if (businessDay(countryId, key, regionId)) return key;
  }
  return day;
}

/**
 * Whether any of a person's everyday accounts at the bank has been below zero
 * past its arranged limit for longer than a bank lets one run. Keeps each
 * account's `negativeSince` as it goes.
 */
function leftOverdrawn(sim: Simulation, person: Person, bank: Bank): boolean {
  let over = false;
  for (const account of Object.values(sim.universe.accounts)) {
    if (account.ownerId !== person.id || account.closedAt || account.bankId !== bank.id) continue;
    if (account.kind !== 'checking' && account.kind !== 'savings') continue;
    if (account.balance >= -(account.overdraftLimit ?? 0)) { account.negativeSince = undefined; continue; }
    account.negativeSince ??= sim.now;
    if (sim.now >= overdrawnDeadline(bank, account)!) over = true;
  }
  return over;
}

/**
 * The midnight the bank acts on an account below zero past its limit since `negativeSince`, as `leftOverdrawn` reads it:
 * the bank's days, and in France the notice the law adds. From 2026-10-20 (brief 17) the Overdraft panel names the day
 * before it, while there's time to act; until then the sum was worked only here.
 */
export function overdrawnDeadline(bank: Bank, account: Account): Instant | undefined {
  if (account.negativeSince === undefined) return undefined;
  return account.negativeSince + (ESTIMATE.closeAfterDays + (isFrench(bank) ? FRANCE.closingNoticeDays : 0)) * MS_DAY;
}

/**
 * The bank closes the relationship: what the person's other accounts there
 * hold goes against what's owed, the rest is charged off to collections, the
 * record takes it, and their money moves to another bank in the country.
 */
export function closeForOverdraft(sim: Simulation, person: Person, bank: Bank): void {
  const mine = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && a.bankId === bank.id
    && (a.kind === 'checking' || a.kind === 'savings') && a.category !== 'term');
  // The current account at the bank closing it (from 2026-10-10: until then the primary one, wherever it was).
  const current = checkingAt(sim, person, bank.id);
  if (!current) return;
  // Where what they hold there covers it and they bank elsewhere in the country they live in too, the current account
  // closes, as the charged-off branch below closes it (from 2026-10-16: until then it stayed open, though France's notice
  // had said it closes). Not for one kept at home abroad, which can't take their wages.
  const elsewhereAtAll = checkingsOf(sim, person).find((a) => a.bankId !== bank.id && bankById(a.bankId ?? '')?.iso === isoOf(homeOf(person)));
  const closes = (account: Account) => account.negativeSince !== undefined && (account.id !== current.id || elsewhereAtAll !== undefined);
  // The interest is settled before the set-off, so it's set off too; on an account staying open it says so.
  for (const account of mine) settleInterest(sim, account, `Interest: ${account.name}, ${closes(account) ? 'on closing' : 'before the set-off'}`);
  // What's owed the bank to the day goes against it too (from 2026-10-16): the overdraft interest built since the 1st,
  // and on each account that closes, Germany's quarter of fees so far (`settleFees`), the rest of them once a charge-off
  // ends the relationship (below). Until then the bank closed the accounts with both unsettled, and nothing charges a
  // closed account: Deutsche Bank's own close of an AktivKonto overdrawn from 5 January 2026 charged off €101.97 on 7
  // March and dropped January's and February's €6.90, March's, and the interest built since 1 March
  // (docs/verification/remaining/banking-checklist.json, banking.1). A fee is settled once (`feesSettled`), as a second
  // settling in the month charged the month again until later on 2026-10-16, when the first began to end the fees
  // (`feesEndedAt`, `settleFees`) and a second to charge nothing; the set still decides which accounts the charge-off's
  // loop below passes over.
  for (const account of mine) settleOverdraftInterest(sim, account, `Overdraft interest, ${closes(account) ? 'on closing' : 'before the set-off'}`);
  const feesSettled = new Set<string>();
  const settleFeesOf = (account: Account) => { if (!feesSettled.has(account.id)) { feesSettled.add(account.id); settleFees(sim, account); } };
  for (const account of mine) if (closes(account)) settleFeesOf(account);
  // Set-off: what's owed on any account there is gathered on the current
  // account, and what's held there goes against it, as much as it takes.
  // Between two accounts in the bank's own money where it isn't the save's, that figure goes on both sides, so each
  // clears exactly in both (from 2026-10-16: until then each side worked out its own, and ¥441 left SMBC's savings to
  // cover ¥440).
  const setOff = (from: Account, amount: Money, held?: Money) => {
    const own = (n: Money) => (held !== undefined ? { native: n } : {});
    if (amount !== 0) post(sim, 'Set off against the overdraft', 'transfer', [{ accountId: from.id, amount: -amount, ...own(-held!) }, { accountId: current.id, amount, ...own(held!) }]);
  };
  const shared = (account: Account) => account.currency !== undefined && account.currency === current.currency;
  for (const account of mine) if (account.id !== current.id && account.balance < 0) setOff(account, account.balance, shared(account) ? account.held ?? 0 : undefined);
  for (const account of mine) {
    if (account.id === current.id || account.balance <= 0 || current.balance >= 0) continue;
    if (!shared(account)) { setOff(account, Math.min(account.balance, -current.balance)); continue; }
    // The whole debt where the account holds it, else the whole account.
    const covers = (account.held ?? 0) >= -(current.held ?? 0);
    setOff(account, covers ? -current.balance : account.balance, covers ? -(current.held ?? 0) : account.held ?? 0);
  }
  const cur = saveCurrency(sim.universe);
  // The standing orders paying from an account it closes, or into it, end with it, said once in the notice (`endOrdersOf`,
  // from 2026-10-16: until then each said “A Standing Order Didn’t Go” every month for good). A payment set for a date
  // to or from it still fails on its day, and says so then.
  const ended: StandingOrder[] = [];
  const letGo = (account: Account) => { ended.push(...endOrdersOf(sim, person, account)); };
  if (current.balance >= 0) {
    // What the person holds there covered it: the bank takes it, closes
    // the accounts that ran below zero, and nothing is charged off. The
    // current account closes only where they keep one at another bank, and
    // its payments go there. Until 2026-10-16 the current account never
    // closed here, and the notice said the bank had closed it either way.
    const closed: Account[] = [];
    for (const account of mine) {
      if (closes(account)) { account.closedAt = sim.now; account.overdraftLimit = undefined; closed.push(account); }
      account.negativeSince = undefined;
    }
    // Only where the current account closed: one that never ran below zero, beside a savings account that did, stays
    // open, a guard no played life reaches since a savings account can't be taken below zero (2026-09-27).
    if (current.closedAt !== undefined && elsewhereAtAll) {
      if (person.primaryAccountId === current.id) person.primaryAccountId = elsewhereAtAll.id;
      redirectAway(sim, person, current.id, elsewhereAtAll.id);
    }
    for (const account of closed) letGo(account);
    if (person.id === sim.universe.playerId) {
      const kept = mine.filter((a) => a.closedAt === undefined);
      const which = `${closed.length > 0 ? ` It closed ${closed.map((a) => a.name).join(' and ')}.` : ''}${kept.length > 0 ? ` ${kept.map((a) => a.name).join(' and ')} ${kept.length > 1 ? 'stay' : 'stays'} open.` : ''}`;
      // What happened first (from 2026-10-17, brief 14's editorial review): until then the reason opened it, “It had been
      // below zero …”, and the account closed came after.
      const why = `had been below zero for ${ESTIMATE.closeAfterDays} days, so the bank took what it was owed from your other money there.`;
      // The account named where nothing closed (from brief 15, 2026-10-19): until then “It had been below zero …” with no
      // account before it.
      sim.notify({ category: 'bank', title: closed.length > 0 ? `${bank.name} Closed An Account` : `${bank.name} Took What It Was Owed`, body: closed.length > 0 ? `${bank.name} closed ${closed.map((a) => a.name).join(' and ')}. ${closed.length > 1 ? 'They' : 'It'} ${why}${kept.length > 0 ? ` ${kept.map((a) => a.name).join(' and ')} ${kept.length > 1 ? 'stay' : 'stays'} open.` : ''}${endedWords(sim, ended)}` : `${current.name} ${why}${which}${endedWords(sim, ended)}`, importance: 60 });
    }
    return;
  }
  // Charged off, the relationship ends: the fees of the accounts that weren't settled above come into the debt, any one
  // they leave below zero gathered on the current account as the set-off gathers it (from 2026-10-16, as above).
  for (const account of mine) {
    if (feesSettled.has(account.id)) continue;
    settleFeesOf(account);
    if (account.id !== current.id && account.balance < 0) setOff(account, account.balance, shared(account) ? account.held ?? 0 : undefined);
  }
  const owed = Math.max(0, -current.balance);
  // The debt owed to this bank, its own (from 2026-10-13: until then a second bank's charge-off went into whichever debt
  // was open, named for the first bank, and the refusals that read who's owed read the wrong one).
  const debt = collectionsOf(sim, person, bank.name) ?? sim.openAccount({
    id: sim.nextId('account'), kind: 'loan', category: COLLECTIONS, name: `Owed To ${bank.name}, In Collections`, ownerId: person.id,
    institution: bank.name, openedAt: sim.now,
  });
  post(sim, `Charged off by ${bank.name}`, 'transfer', [{ accountId: current.id, amount: owed }, { accountId: debt.id, amount: -owed }]);
  for (const account of mine) { account.negativeSince = undefined; account.pendingItems = undefined; }
  // On the record only for a bank in the country they live in, whose bureaus keep it (from 2026-10-16: until then a
  // bank kept at home abroad marked the American record for 13¢ it charged off).
  const onRecord = bank.iso === isoOf(homeOf(person));
  if (person.credit && onRecord) {
    markRecord(person, ESTIMATE.chargeOffHit, sim.now, person.currentLocationId, (saveCurrency(sim.universe) === 'MXN' ? owed : exchange(owed, saveCurrency(sim.universe), 'MXN') ?? owed) / 100);
    person.credit.late = [...person.credit.late, sim.now];
  }
  // A US bank reports it, and the next bank reads the report.
  if (bank.id.startsWith('us-')) person.chex = { at: sim.now, bank: bank.name };
  // Holding a current account at another bank, the charged-off one closes and that one carries on, primary if this
  // was (from 2026-10-10). With none elsewhere, SLATE re-banks them where they live, as it always has: a simplification,
  // since a closed customer opens their own account, kept so a life always has somewhere to be paid.
  // At a bank where they live (from 2026-10-16): an account kept at home, at a bank abroad, can't take their wages or be
  // where they're re-banked, and is left as it is.
  const here = isoOf(homeOf(person));
  const elsewhere = checkingsOf(sim, person).find((a) => a.bankId !== bank.id && bankById(a.bankId ?? '')?.iso === here);
  // Every bank owed a charged-off debt is left out, as each refuses to open an account (from 2026-10-13: each bank's debt
  // its own since then, the bank closing now alone was left out, and a broke life went back to one it owed).
  const others = banksFor(homeOf(person)).filter((b) => b.id !== bank.id && !collectionsOf(sim, person, b.name));
  const willing = others.find((b) => !declines(sim, person, b));
  const to = elsewhere?.bankId ? bankById(elsewhere.bankId)! : willing ?? others[0] ?? bank;
  const secondChance = !elsewhere && willing === undefined && person.chex !== undefined;
  if (elsewhere) {
    for (const account of mine) { if (account.balance === 0) account.closedAt = sim.now; account.overdraftLimit = undefined; }
    if (person.primaryAccountId === current.id) person.primaryAccountId = elsewhere.id;
    redirectAway(sim, person, current.id, elsewhere.id);
    for (const account of mine) if (account.closedAt !== undefined) letGo(account);
  } else completeSwitch(sim, person, to, true, secondChance);
  if (person.id === sim.universe.playerId) {
    sim.notify({
      category: 'bank', title: `${bank.name} Closed Your Account`,
      body: `It was overdrawn for ${ESTIMATE.closeAfterDays} days. ${formatMoney(owed, cur)} it couldn’t recover went to collections${onRecord ? ' and onto your credit record' : ''}. You can pay it on Money, under Borrowing. Your money is at ${to.name} now${secondChance ? ', in a second-chance account: every other bank here turned you away on the ChexSystems report' : ''}.${endedWords(sim, ended)}`,
      importance: 90,
    });
  }
}

export function registerLending(sim: Simulation): void {
  // Every day: overdraft interest builds, a midnight fee where the bank
  // charges one, and a term deposit that has reached its end pays out.
  sim.onEvent('world.day_rollover', 'bank.lending_day', (_event, { sim: s }) => {
    const firstOfMonth = zonedParts(s.now, s.homeZone).day === 1;
    for (const person of Object.values(s.universe.people)) {
      // Each open current account, at its own bank (from 2026-10-10: until then only the primary one, so a second bank's
      // account ran below zero with no fee, interest or closing).
      for (const current of checkingsOf(s, person)) {
        const bank = current?.bankId ? bankById(current.bankId) : undefined;
        const terms = lendingOf(bank).overdraft;
        if (current && bank && terms) {
          const beyondTerms = unarrangedOf(terms);
          if (current.balance < 0) {
            const used = -current.balance;
            const limit = current.overdraftLimit ?? 0;
            current.odPeak = Math.max(current.odPeak ?? 0, used);
            current.odDaySum = (current.odDaySum ?? 0) + used;
            if (beyondTerms && used - limit > (beyondTerms.graceUpTo !== undefined ? inSaveMoney(s, beyondTerms.graceUpTo, bank.currency) : 0)) {
              current.odBeyondDays = (current.odBeyondDays ?? 0) + 1;
            }
            if (terms.kind === 'arranged') {
              // Past the buffer at the arranged rate; past the limit at the rate beyond it, where the bank has one.
              const buffer = terms.buffer !== undefined ? inSaveMoney(s, terms.buffer, bank.currency) : 0;
              const rate = current.overdraftRate ?? terms.rate;
              const beyond = Math.max(0, used - Math.max(limit, buffer));
              const within = Math.max(0, used - buffer) - beyond;
              current.odAccrued = (current.odAccrued ?? 0) + (within * rate + beyond * (terms.beyond?.rate ?? rate)) / 365;
            } else if (terms.kind === 'unarranged') {
              if (terms.rate !== undefined) current.odAccrued = (current.odAccrued ?? 0) + (used * terms.rate) / 365;
            } else if (terms.kind === 'per_item') {
              if (terms.rate !== undefined) current.odAccrued = (current.odAccrued ?? 0) + (used * terms.rate) / 365;
              // One fee for a day a payment overdrew it and that ended overdrawn;
              // a day it only stayed overdrawn builds interest. Until 2026-09-25
              // every overdrawn midnight was charged, and a life overdrawn for
              // 250 days paid CommBank $4,020.
              if (terms.atMidnight && current.overdrewDay === dateKey(s.now - 1, s.homeZone)) {
                charge(s, current, inSaveMoney(s, terms.fee, bank.currency), 'Overdrawn at midnight', 'bank_fee', 'Bank Fees');
              }
            } else if (terms.kind === 'tacit') {
              current.odAccrued = (current.odAccrued ?? 0) + (used * terms.rate) / 365;
            } else if (terms.kind === 'secured') {
              const held = termsOf(s, person).find((a) => a.bankId === bank.id);
              current.odAccrued = (current.odAccrued ?? 0) + (used * ((held?.fixedRate ?? 0) + terms.over)) / 365;
            }
          }
          if (firstOfMonth) {
            const interest = Math.floor(current.odAccrued ?? 0);
            current.odAccrued = (current.odAccrued ?? 0) - interest;
            let commission = terms.kind === 'tacit' && (current.odPeak ?? 0) > 0
              ? Math.max(Math.round((current.odPeak ?? 0) * terms.commission.share), inSaveMoney(s, terms.commission.min, bank.currency))
              : 0;
            if (terms.kind === 'tacit' && terms.cap) {
              // The law's cap on the month's cost, on what was overdrawn day by
              // day. Both banks' rates (7.83%, 7.25%) are under it, so the
              // interest alone never reaches it and the commission takes the cut;
              // a cap on the interest as well changed nothing and was taken out.
              const most = Math.floor(((current.odDaySum ?? 0) * terms.cap.rate) / 365);
              commission = Math.min(commission, most - interest);
            }
            charge(s, current, interest, 'Overdraft interest', 'bank_fee', 'Overdraft Interest');
            if (terms.kind === 'arranged' && (current.overdraftLimit ?? 0) > 0 && terms.monthlyFee !== undefined && !current.overdraftPerUse) {
              charge(s, current, inSaveMoney(s, terms.monthlyFee, bank.currency), 'Overdraft fee', 'bank_fee', 'Bank Fees');
            }
            charge(s, current, commission, 'Overdraft commission', 'bank_fee', 'Bank Fees');
            if (beyondTerms?.monthlyFee !== undefined && (current.odBeyondDays ?? 0) >= (beyondTerms.afterDays ?? 1)
              && (beyondTerms.freeUnder === undefined || ageOn(s, person, s.now) >= beyondTerms.freeUnder)) {
              charge(s, current, inSaveMoney(s, beyondTerms.monthlyFee, bank.currency), 'Unarranged overdraft fee', 'bank_fee', 'Bank Fees');
            }
            current.odPeak = current.balance < 0 ? -current.balance : 0;
            current.odDaySum = 0;
            current.odBeyondDays = 0;
          }
          if (terms.kind === 'arranged' && (current.overdraftLimit ?? 0) > 0 && terms.yearlyFee !== undefined
            && current.overdraftSince !== undefined && s.now - current.overdraftSince >= 365 * MS_DAY) {
            charge(s, current, inSaveMoney(s, terms.yearlyFee, bank.currency), 'Overdraft facility fee', 'bank_fee', 'Bank Fees');
            current.overdraftSince = s.now;
          }
        }
        if (current && bank && terms?.kind === 'per_item' && terms.nextDay) settlePendingItems(s, current, bank, terms);
        if (current && bank && firstOfMonth) monthlyCharges(s, person, current, bank);
        const over = current && bank ? leftOverdrawn(s, person, bank) : false;
        if (current && bank) frenchOverrun(s, person, current, bank);
        if (current && bank && over) {
          closeForOverdraft(s, person, bank);
          continue;
        }
        // The debit card's year (`Bank.card.year`, `cardYearNight`). In the bank's own figure from 2026-10-16: until then it
        // went in dollars, converted back, and Arion's 950 kr took 949 kr from an account kept in krónur
        // (docs/verification/remaining-09/banking-checklist.json, banking.5.arion-card).
        if (current && bank) cardYearNight(s, person, current, bank);
        if (current && bank) refundInterestTax(s, person, current, bank);
      }
      for (const term of termsOf(s, person)) {
        // The day just ended earns, and the deposit ends at the midnight that opens its maturity day, so the last day it
        // earns is the one before. Until 2026-10-13 it ended at the midnight after that day, and earned it too: 213 days for
        // a term of 212, found by that day's evidence pass. A guard on the day earned, added with the fix, went the same
        // day: its mutation survived, since the day just ended is never the maturity day's.
        term.accrued = (term.accrued ?? 0) + (Math.max(0, term.balance) * (term.fixedRate ?? 0)) / 365;
        if (term.maturesAt === undefined || dateKey(s.now, s.homeZone) < dateKey(term.maturesAt, s.homeZone)) continue;
        // Renewed, or moved into easy-access savings, where that's how it ends (B7).
        const ended = endTerm(s, person, term);
        if (ended === 'renews') {
          if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `Your ${term.name} Renewed`, body: `It renewed for the same term at ${((term.fixedRate ?? 0) * 100).toFixed(2)}%, with its interest added.${term.graceUntil ? ` Until ${formatDate(term.graceUntil, s.zone)} you can take it out without a penalty.` : ''}`, importance: 50 });
          continue;
        }
        if (ended === 'savings') {
          if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `Your ${term.name} Has Ended`, body: 'It moved, with its interest, into your easy-access savings at the same bank, where it can be taken any time.', importance: 50 });
          continue;
        }
        // Into the current account at the term's own bank where they keep one (from 2026-10-10: until then the primary).
        const into = checkingAt(s, person, term.bankId) ?? currentOf(s, person);
        if (!into) continue;
        const earned = Math.floor(term.accrued ?? 0);
        const tax = interestTaxFor(s, term, earned);
        const postings = [
          { accountId: into.id, amount: term.balance + earned - tax },
          { accountId: term.id, amount: -term.balance },
          { accountId: s.nominalAccount('income', 'Interest').id, amount: -earned },
        ];
        if (tax > 0) postings.push({ accountId: s.nominalAccount('expense', 'Tax On Interest').id, amount: tax });
        post(s, `${term.name} paid out`, 'interest', postings);
        // Income for the year’s return and the month’s (from 2026-10-14: until then posted and not recorded).
        if (earned > 0) recordInterest(person, s.now, s.homeZone, earned);
        term.accrued = 0;
        term.closedAt = s.now;
        if (person.id === s.universe.playerId) {
          s.notify({
            category: 'bank', title: `Your ${term.name} Has Matured`,
            body: `It paid ${formatMoney(earned - tax, saveCurrency(s.universe), { cents: false })} of interest after tax, and all of it is in your ${into.name}.`,
            importance: 55,
          });
        }
      }
    }
  });

  sim.onSchedule(LOAN_DUE_KIND, (item, s) => {
    const loan = s.universe.accounts[String(item.payload.accountId)];
    if (!loan || loan.closedAt) return;
    const person = s.universe.people[loan.ownerId];
    if (!person) return;
    const interest = Math.round(-loan.balance * (loan.apr ?? 0) / 12);
    if (interest > 0) {
      post(s, `Interest: ${loan.name}`, 'loan_interest', [
        { accountId: loan.id, amount: -interest },
        { accountId: s.nominalAccount('expense', 'Loan Interest').id, amount: interest },
      ]);
    }
    // The term's last payment is whatever is left, the pennies each month rounded included.
    const monthsIn = Math.round((item.at - loan.openedAt) / (30.4375 * MS_DAY));
    const last = loan.loanMonths !== undefined && monthsIn >= loan.loanMonths;
    const due = last ? -loan.balance : Math.min(loan.loanPayment ?? 0, -loan.balance);
    // From the current account at the lending bank where they keep one (from 2026-10-10: until then whichever was primary).
    // From the repayment account agreed (`repaymentAccount`, from 2026-10-10), which a change of primary doesn't move.
    const from = repaymentAccount(s, person, loan);
    const bank = payFromBank(s, person, due, from);
    const paid = due - bank.short;
    if (paid > 0) post(s, `Payment: ${loan.name}`, 'loan_payment', [{ accountId: loan.id, amount: paid }, ...bank.postings]);
    const returnedFee = bank.short > 0 ? chargeReturned(s, person, bank.short, from) : 0;
    if (bank.short > 0 && person.credit) {
      // A missed payment goes on the record, as a late card payment does.
      person.credit.late = [...person.credit.late.filter((when) => s.now - when < 365 * MS_DAY), s.now];
      markRecord(person, 50, s.now, person.currentLocationId);
      if (person.id === s.universe.playerId) {
        s.notify({
          category: 'bank', title: 'A Missed Loan Payment',
          // The loan and the account named, and nothing paid said as nothing (from brief 15, 2026-10-19): until then “$157.00
          // was due, and there was only $0.00 to pay it with.”
          // The fee the bank charged for it, where it charged one, and the day it was due (from 2026-10-20, brief 17): until
          // then the fee was unsaid, and with no day a second month's miss said the first's words, so an unread one was
          // brought up to the day in its place (`Simulation.notify`) and two misses read as one.
          body: `Your ${loan.name} payment of ${formatMoney(due, saveCurrency(s.universe))} was due ${formatDate(item.at, s.zone)}, and ${paid > 0 ? `only ${formatMoney(paid, saveCurrency(s.universe))} of it could be paid` : `${from?.name ?? 'your account'} had nothing available to pay it`}.${returnedFee > 0 ? ` ${from?.institution ?? 'The bank'} charged a ${formatMoney(returnedFee, saveCurrency(s.universe))} returned payment fee for it.` : ''} It’s on your credit record, and what’s left is still owed.`,
          importance: 80,
        });
      }
    }
    if (loan.balance >= 0) { loan.closedAt = s.now; return; }
    scheduleLoan(s, loan, item.at);
  });

  sim.onSchedule(SWITCH_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const to = bankById(String(item.payload.bankId));
    if (person && to) completeSwitch(s, person, to, false, false, item.payload.fromId ? String(item.payload.fromId) : undefined, { keepBalance: item.payload.keepBalance === true, partial: item.payload.partial === true });
  });

  // The new bank's first look: an application its opening rules now refuse ends the switch before anything moves.
  sim.onSchedule(SWITCH_REVIEW_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const to = bankById(String(item.payload.bankId));
    const pending = s.universe.scheduled.find((one) => one.kind === SWITCH_KIND && one.status === 'pending' && one.payload.personId === person?.id);
    if (!person || !to || !pending) return;
    const no = switchApplicationRefusal(s, person, to);
    if (!no) return;
    s.timeline.cancel(pending.id, s.now);
    noteSwitch(person, { at: s.now, toBank: to.name, outcome: 'declined', why: no });
    if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `${to.name} Declined The Switch`, body: `${no} Your accounts and payments haven’t changed.`, importance: 80, route: '/workspace/bank' });
  });

  // An old account a switch left in debt: closed, its remainder sent across, once it's repaid.
  sim.onSchedule(SWITCH_DEBT_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const account = s.universe.accounts[String(item.payload.accountId)];
    if (!person || !account || account.closedAt || !account.switchDebt) return;
    if (account.balance < 0) { s.schedule({ at: s.now + CASS.debtCheckDays * MS_DAY, kind: SWITCH_DEBT_KIND, label: item.label, category: 'home', priority: 36, payload: item.payload }); return; }
    delete account.switchDebt;
    account.closingAt = s.now + 60_000;
    s.schedule({ at: account.closingAt, kind: 'bank.current_closes', label: `${account.name} Closes`, category: 'home', priority: 36, payload: { personId: person.id, accountId: account.id, ...(person.primaryAccountId ? { remainderTo: person.primaryAccountId } : {}) } });
  });

  sim.onCommand<{ confirm?: boolean }, { kept: true }>('bank.stop_balance_transfer', (p, { sim: s }) => {
    const person = s.player;
    const item = s.universe.scheduled.find((one) => one.kind === SWITCH_KIND && one.status === 'pending' && one.payload.personId === person.id);
    if (!item) throw new CommandError('No switch is under way.');
    if (item.payload.cancellableUntil === undefined) throw new CommandError('This country’s switching service has no such step.');
    if (item.payload.keepBalance === true) throw new CommandError('Its balance transfer is already stopped.');
    // Up to close of business the working day before the switch date.
    let lastDay = addDays(item.at, -1, s.homeZone);
    for (let n = 0; n < 4; n += 1) { const q = zonedParts(lastDay, s.homeZone); const wd = new Date(Date.UTC(q.year, q.month - 1, q.day)).getUTCDay(); if (wd !== 0 && wd !== 6) break; lastDay = addDays(lastDay, -1, s.homeZone); }
    const q = zonedParts(lastDay, s.homeZone);
    const by = instantFromZoned({ year: q.year, month: q.month, day: q.day, hour: 17 }, s.homeZone);
    if (s.now > by) throw new CommandError(`The transfer could be stopped until close of business ${formatDate(by, s.zone)}.`);
    if (!p?.confirm) throw new CommandError('The switch goes ahead: your payments move, and the balance stays in the old account, which stays open. Confirm to go ahead.');
    item.payload = { ...item.payload, keepBalance: true };
    return { kept: true };
  });

  sim.onCommand<{ on: boolean }, { on: boolean }>('bank.debit_overdraft', (p, { sim: s }) => {
    const person = s.player;
    const current = currentOf(s, person);
    const bank = current?.bankId ? bankById(current.bankId) : undefined;
    const terms = lendingOf(bank).overdraft;
    if (!current || !bank || terms?.kind !== 'per_item' || !terms.debitCard) throw new CommandError('Your bank doesn’t offer this choice.');
    const away = abroadRefusal(person, bank);
    if (away) throw new CommandError(away);
    if (terms.debitCard === 'never') throw new CommandError(`${bank.name} never pays a debit card purchase into an overdraft.`);
    current.debitOverdraft = p.on === true;
    return { on: current.debitOverdraft };
  });

  sim.onCommand<{ amount: Money; debtId?: string }, { paid: Money; left: Money }>('bank.pay_collections', (p, { sim: s }) => {
    const person = s.player;
    // The debt the panel shows, where it names one (from 2026-10-13), else the first.
    const named = p.debtId ? s.universe.accounts[p.debtId] : undefined;
    const debt = named && named.ownerId === person.id && !named.closedAt && named.category === COLLECTIONS ? named : collectionsOf(s, person);
    if (!debt) throw new CommandError('You don’t owe anything in collections.');
    const current = currentOf(s, person);
    if (!current) throw new CommandError('You don’t have a checking account to pay it from.');
    const owed = -debt.balance;
    const paid = Math.min(Math.round(Number(p.amount)), owed, Math.max(0, current.balance));
    if (!(paid > 0)) throw new CommandError(`${current.name} has nothing available to pay it with, so nothing was paid.`);
    post(s, `Paid to collections: ${debt.institution}`, 'transfer', [{ accountId: current.id, amount: -paid }, { accountId: debt.id, amount: paid }]);
    if (debt.balance === 0) debt.closedAt = s.now;
    return { paid, left: -debt.balance };
  });

  sim.onCommand<{ limit: Money; perUse?: boolean; accountId?: string }, { limit: Money; rate?: number }>('bank.arrange_overdraft', (p, { sim: s }) => {
    const person = s.player;
    // On the current account named, at whichever bank (from 2026-10-10), else the primary.
    const named = p.accountId ? checkingsOf(s, person).find((a) => a.id === p.accountId) : undefined;
    if (p.accountId && !named) throw new CommandError('That isn’t one of your open checking accounts.');
    const current = named ?? currentOf(s, person);
    if (!current) throw new CommandError('You don’t have a checking account to arrange an overdraft on.');
    const limit = Math.round(Number(p.limit));
    if (limit === 0) {
      // Nothing arranged, nothing to close (from 2026-10-15: until then it answered as closed and changed nothing, at a
      // bank that arranges none too, every New Haven bank among them; found by that day's scope pass).
      if ((current.overdraftLimit ?? 0) <= 0) throw new CommandError('No overdraft is arranged on it.');
      if (current.balance < 0) throw new CommandError('Pay the overdraft back before closing it.');
      current.overdraftLimit = undefined;
      delete current.overdraftPerUse;
      return { limit: 0 };
    }
    // Nothing new at a bank in another country (from 2026-10-16), in its words: asked by `overdraftOffer` since later that
    // day, which the panel reads too; until then asked here first, and again nowhere the panel looked.
    const offer = overdraftOffer(s, person, current);
    if ('refused' in offer) throw new CommandError(offer.refused);
    if (limit < offer.min || limit > offer.max) {
      const cur = saveCurrency(s.universe);
      throw new CommandError(`The bank arranges an overdraft of ${formatMoney(offer.min, cur, { cents: false })} to ${formatMoney(offer.max, cur, { cents: false })}.`);
    }
    if (current.balance < -limit) throw new CommandError('You’re overdrawn by more than that already.');
    const first = current.overdraftLimit === undefined;
    current.overdraftLimit = limit;
    current.overdraftRate = offer.rate;
    const sold = lendingOf(bankById(current.bankId!)).overdraft;
    if (p.perUse === true && sold?.kind === 'arranged' && sold.perUse) current.overdraftPerUse = true;
    else delete current.overdraftPerUse;
    if (first) {
      current.overdraftSince = s.now;
      const bank = bankById(current.bankId!)!;
      const terms = lendingOf(bank).overdraft;
      // A set-up fee where the bank charges one, and the year's facility fee after a year; otherwise the facility fee now.
      if (terms?.kind === 'arranged' && terms.setupFee !== undefined) {
        charge(s, current, inSaveMoney(s, terms.setupFee, bank.currency), 'Overdraft set-up fee', 'bank_fee', 'Bank Fees');
      } else if (terms?.kind === 'arranged' && terms.yearlyFee !== undefined) {
        charge(s, current, inSaveMoney(s, terms.yearlyFee, bank.currency), 'Overdraft facility fee', 'bank_fee', 'Bank Fees');
      }
    }
    return { limit, rate: offer.rate };
  });

  sim.onCommand<{ amount: Money; months: number; bankId?: string; intoId?: string; repayFromId?: string; purpose?: 'education' | 'other' }, { apr: number; payment: Money; loanId: string }>('bank.borrow', (p, { sim: s }) => {
    const person = s.player;
    const amount = Math.round(Number(p.amount));
    const months = Math.round(Number(p.months));
    // At the bank named, any they keep a current account at (from 2026-10-10), else the primary's.
    const bank = p.bankId ? bankById(String(p.bankId)) : bankOf(s, person);
    if (!bank) throw new CommandError('That isn’t a bank you keep an account at.');
    // A bank in another country lends nothing new: asked by `loanOffer` since later on 2026-10-16, which the panel reads;
    // until then asked here, before it.
    const offer = loanOffer(s, person, amount, months, bank.id, p.purpose === 'education' ? 'education' : 'other');
    if ('refused' in offer) throw new CommandError(offer.refused);
    // Paid into the current account named, else the one at the lender (or the primary, for a lender they don't bank
    // with); repaid from the one named, else that one.
    const at = checkingAt(s, person, bank.id) ?? currentOf(s, person)!;
    const into = p.intoId ? checkingsOf(s, person).find((a) => a.id === p.intoId) : at;
    const repay = p.repayFromId ? checkingsOf(s, person).find((a) => a.id === p.repayFromId) : at;
    if (!into || !repay) throw new CommandError('The loan has to be paid into, and repaid from, one of your open checking accounts.');
    const loan = s.openAccount({
      id: s.nextId('account'), kind: 'loan', category: 'personal', name: `${bank.name} Personal Loan`, ownerId: person.id,
      institution: bank.name, bankId: bank.id, openedAt: s.now, apr: offer.apr, loanPayment: offer.payment, loanMonths: months, repayFromId: repay.id,
    });
    post(s, `Borrowed from ${bank.name}`, 'loan', [{ accountId: loan.id, amount: -amount }, { accountId: into.id, amount }]);
    scheduleLoan(s, loan, s.now);
    return { apr: offer.apr, payment: offer.payment, loanId: loan.id };
  });

  sim.onCommand<{ loanId: string; accountId: string }, { repayFromId: string }>('bank.set_loan_repayment', (p, { sim: s }) => {
    const person = s.player;
    const loan = loansOf(s, person).find((l) => l.id === p.loanId);
    if (!loan) throw new CommandError('That isn’t an open loan of yours.');
    const account = checkingsOf(s, person).find((a) => a.id === p.accountId);
    if (!account) throw new CommandError('A loan has to be repaid from one of your open checking accounts.');
    if (account.closingAt !== undefined) throw new CommandError(`${account.name} is closing, so the loan can’t be repaid from it.`);
    loan.repayFromId = account.id;
    return { repayFromId: account.id };
  });

  sim.onCommand<{ accountId?: string }, { apr: number; payment: Money }>('bank.take_overrun_loan', (p, { sim: s }) => {
    const person = s.player;
    // The offer on the current account named, at whichever bank made it, else the primary's (from 2026-10-12: until
    // then only the primary's was read, so a second bank's offer was refused as none made).
    const named = p?.accountId ? checkingsOf(s, person).find((a) => a.id === p.accountId) : undefined;
    if (p?.accountId && !named) throw new CommandError('That isn’t one of your open checking accounts.');
    const current = named ?? currentOf(s, person);
    const bank = current?.bankId ? bankById(current.bankId) : undefined;
    const offer = current?.creditOffered;
    if (!bank || !current || !offer) throw new CommandError('Your bank has offered no loan for an overrun.');
    // Not at a bank abroad, which opens nothing new for a customer abroad (from 2026-10-16: until then BNP Paribas lent
    // a student living in America euros kept as dollars, and a short payment went on the American record).
    const away = abroadRefusal(person, bank);
    if (away) throw new CommandError(away);
    // A loan at that bank (from 2026-10-12: until then at any bank).
    if (loanOf(s, person, bank.id)) throw new CommandError('You already have a loan with the bank.');
    const payment = monthlyPayment(offer.amount, offer.apr, offer.months);
    const loan = s.openAccount({
      id: s.nextId('account'), kind: 'loan', category: 'personal', name: `${bank.name} Personal Loan`, ownerId: person.id,
      institution: bank.name, bankId: bank.id, openedAt: s.now, apr: offer.apr, loanPayment: payment, loanMonths: offer.months,
    });
    post(s, `Loan for the overrun, from ${bank.name}`, 'loan', [{ accountId: loan.id, amount: -offer.amount }, { accountId: current.id, amount: offer.amount }]);
    scheduleLoan(s, loan, s.now);
    delete current.creditOffered;
    // Back within its limit, the account's days past it end, and with them the letter's and the closing notice's (from
    // 2026-10-15: until then they ran on from the overrun's first day unless a midnight found it within the limit, so a
    // life spending on into it was closed two months after the notice though its overrun was a loan; found by that
    // day's scope pass).
    if (current.balance >= -(current.overdraftLimit ?? 0)) {
      current.negativeSince = undefined;
      current.overrunInformed = undefined;
      current.closingNoticed = undefined;
    }
    return { apr: offer.apr, payment };
  });

  sim.onCommand<{ loanId?: string }, { paid: Money }>('bank.repay_loan', (p, { sim: s }) => {
    const person = s.player;
    const loan = p?.loanId ? loansOf(s, person).find((l) => l.id === p.loanId) : loanOf(s, person);
    if (!loan) throw new CommandError('You don’t have a loan to pay off.');
    // What's owed, with the month's interest so far.
    const since = s.universe.scheduled.find((one) => one.kind === LOAN_DUE_KIND && one.status === 'pending' && one.refId === loan.id);
    // The days since the last payment date, a month before the next, or since the loan opened where that's later (from
    // 2026-10-13: until then 30 less the days to the next, so 20 days into a 31-day month were charged 19, and into
    // February 22; found by the review of that day).
    const from = since ? Math.max(addMonths(since.at, -1, s.homeZone), loan.openedAt) : s.now;
    const days = Math.max(0, Math.floor((s.now - from) / MS_DAY));
    const interest = Math.round(-loan.balance * (loan.apr ?? 0) * days / 365);
    const owed = -loan.balance + interest;
    const bank = payFromBank(s, person, owed, repaymentAccount(s, person, loan));
    if (bank.short > 0) throw new CommandError(`${repaymentAccount(s, person, loan)?.name ?? 'The repayment account'} can’t cover the ${formatMoney(owed, saveCurrency(s.universe))} it takes to pay it off, so nothing was paid.`);
    if (interest > 0) {
      post(s, `Interest: ${loan.name}`, 'loan_interest', [
        { accountId: loan.id, amount: -interest }, { accountId: s.nominalAccount('expense', 'Loan Interest').id, amount: interest },
      ]);
    }
    post(s, `Paid off ${loan.name}`, 'loan_payment', [{ accountId: loan.id, amount: owed }, ...bank.postings]);
    loan.closedAt = s.now;
    s.timeline.cancelFor('account', loan.id, s.now);
    return { paid: owed };
  });

  sim.onCommand<{ amount: Money; bankId?: string }, { accountId: string; maturesAt: Instant }>('bank.open_term', (p, { sim: s }) => {
    const person = s.player;
    // At any bank they keep a current account at (from 2026-10-10), from that account, else the primary's.
    const bank = p.bankId ? bankById(String(p.bankId)) : bankOf(s, person);
    const term = lendingOf(bank).term;
    const away = abroadRefusal(person, bank);
    if (away) throw new CommandError(away);
    if (!bank || !term) throw new CommandError(`No term deposit rate was found for ${bank?.name ?? 'your bank'}.`);
    const current = checkingAt(s, person, bank.id);
    if (!current) throw new CommandError(`A term deposit at ${bank.name} is paid for from your checking account there. Open a checking account at ${bank.name} first.`);
    const amount = Math.round(Number(p.amount));
    if (!(amount > 0)) throw new CommandError('Enter how much to put away.');
    const cur = saveCurrency(s.universe);
    if (term.minAmount !== undefined && amount < inSaveMoney(s, term.minAmount, bank.currency)) {
      throw new CommandError(`A term deposit there needs at least ${formatMoney(inSaveMoney(s, term.minAmount, bank.currency), cur, { cents: false })}.`);
    }
    if (amount > current.balance) throw new CommandError(`${current.name} has ${current.balance > 0 ? `only ${formatMoney(current.balance, cur)}` : 'nothing'} available, so no term deposit was opened.`);
    const number = accountNumber(s, person, bank, 'savings');
    const maturesAt = addMonths(s.now, term.months, s.homeZone);
    const account = s.openAccount({
      id: s.nextId('account'), kind: 'savings', category: 'term', name: term.called, ownerId: person.id, institution: bank.name,
      bankId: bank.id, number, last4: number.replace(/\D/g, '').slice(-4), openedAt: s.now, fixedRate: term.rate, maturesAt,
    });
    post(s, `Into ${term.called}`, 'transfer', [{ accountId: current.id, amount: -amount }, { accountId: account.id, amount }]);
    return { accountId: account.id, maturesAt };
  });

  sim.onCommand<{ id?: string; confirm?: boolean }, { cancelled: true }>('bank.cancel_switch', (p, { sim: s }) => {
    const person = s.player;
    const item = s.universe.scheduled.find((one) => one.kind === SWITCH_KIND && one.status === 'pending' && one.payload.personId === person.id);
    if (!item) throw new CommandError('No switch is under way.');
    const until = item.payload.cancellableUntil as number | undefined;
    if (until === undefined) throw new CommandError('This country’s switching service doesn’t let you call a switch off. It goes ahead on its date.');
    if (s.now > until) throw new CommandError(`You could call it off until ${formatDate(until, s.zone)}, seven working days before its date, and it’s under way now. You can still stop its balance transfer until the working day before.`);
    if (!p?.confirm) throw new CommandError('Calling it off leaves your accounts and payments where they are. Confirm to go ahead.');
    s.timeline.cancel(item.id, s.now);
    for (const one of s.universe.scheduled) if (one.kind === SWITCH_REVIEW_KIND && one.status === 'pending' && one.payload.personId === person.id) s.timeline.cancel(one.id, s.now);
    const to = bankById(String(item.payload.bankId));
    noteSwitch(person, { at: s.now, toBank: to?.name ?? String(item.payload.bankId), outcome: 'canceled' });
    return { cancelled: true };
  });

  sim.onCommand<{ bankId: string; on?: string; partial?: boolean }, { at: Instant; cancellableUntil?: Instant }>('bank.switch', (p, { sim: s }) => {
    const person = s.player;
    const from = bankOf(s, person);
    const to = banksFor(homeOf(person)).find((b) => b.id === p.bankId);
    if (!to) throw new CommandError('You can only switch to a bank in the country you live in.');
    if (from?.id === to.id) throw new CommandError(`You already bank with ${to.name}.`);
    // Already keeping an account there, there's nothing to switch to (from 2026-10-10: until then a second one opened).
    if (checkingAt(s, person, to.id)) throw new CommandError(`You already have an account at ${to.name}. Make it your primary account, move the payments from the old one, and close it.`);
    if (collectionsOf(s, person, to.name)) throw new CommandError(`${to.name} won’t open an account for you while you owe it a debt it has charged off.`);
    if (declines(s, person, to)) throw new CommandError(`${to.name} won’t open an account for you because of the ChexSystems report ${person.chex!.bank} filed, which stays on your record until ${formatDate(person.chex!.at + CHEX.years * 365 * MS_DAY, s.zone)}.`);
    if (s.universe.scheduled.some((one) => one.kind === SWITCH_KIND && one.status === 'pending')) throw new CommandError('A switch is already under way.');
    // A new bank identifies a new customer (31 CFR 1020.220, and its like elsewhere), from 2026-10-09 (`photoIdOf`).
    if (!photoIdOf(person, s.now)) throw new CommandError(`${to.name} needs a valid photo ID from a new customer: a passport, a driver’s license or an ID card. You can apply for a passport or an ID card on Papers, under Passport And ID.`);
    const current = currentOf(s, person);
    if (current && current.balance < 0) throw new CommandError('Clear the overdraft before switching. The new bank won’t take it on.');
    // The new bank's own opening rules, as its application reads them (from 2026-10-10).
    const declined = switchApplicationRefusal(s, person, to);
    if (declined) throw new CommandError(declined);
    const iso = isoOf(homeOf(person)) ?? '';
    const rule = SWITCHING[iso];
    // A partial switch is the Current Account Switch Service's (Britain's); no other service here publishes one.
    if (p.partial && iso !== 'GB') throw new CommandError('A partial switch is only available through Britain’s Current Account Switch Service.');
    // With no switching service, there's nothing to run: until 2026-10-10 this opened the new bank's accounts, moved
    // everything into them and closed the old ones the same day, as no bank does (docs/verification/BANKING-SWITCH.md).
    if (!rule) {
      throw new CommandError(`There’s no switching service here: open an account at ${to.name}, have your wages paid into it, move your standing orders and autopay, move the money across, then close the old account. Each step is on this screen.`);
    }
    // Working days: Monday to Friday, from tomorrow.
    let at = s.now;
    let left = p.partial ? CASS.partialDays : rule.workingDays;
    while (left > 0) {
      at = addDays(at, 1, s.homeZone);
      const p2 = zonedParts(at, s.homeZone);
      const weekday = new Date(Date.UTC(p2.year, p2.month - 1, p2.day)).getUTCDay();
      if (weekday !== 0 && weekday !== 6) left -= 1;
    }
    // The switch date: the earliest the service allows, or a later working day the customer chooses (from 2026-10-10).
    if (p.on) {
      const [y, m, dd] = String(p.on).split('-').map(Number);
      const chosen = instantFromZoned({ year: y!, month: m!, day: dd!, hour: 9 }, s.homeZone);
      if (!(chosen >= at - 12 * 3_600_000)) throw new CommandError(`The earliest date it can be is ${formatDate(at, s.zone)}.`);
      const wd = new Date(Date.UTC(y!, m! - 1, dd!)).getUTCDay();
      if (wd === 0 || wd === 6) throw new CommandError('Choose a working day for the switch date.');
      at = chosen;
    }
    const d = zonedParts(at, s.homeZone);
    const due = instantFromZoned({ year: d.year, month: d.month, day: d.day, hour: 9 }, s.homeZone);
    // Its last day to be called off, where the service gives one: so many working days before.
    let until: Instant | undefined;
    if (rule.cancelBeforeDays !== undefined) {
      until = due;
      for (let left = rule.cancelBeforeDays; left > 0;) {
        until = addDays(until, -1, s.homeZone);
        const q = zonedParts(until, s.homeZone);
        const wd = new Date(Date.UTC(q.year, q.month - 1, q.day)).getUTCDay();
        if (wd !== 0 && wd !== 6) left -= 1;
      }
    }
    // A partial switch has no Guarantee and no published right to call it off.
    if (p.partial) until = undefined;
    s.schedule({ at: due, kind: SWITCH_KIND, label: 'World Simulation', category: 'system', priority: 80, payload: { personId: person.id, bankId: to.id, startedAt: s.now, ...(current ? { fromId: current.id } : {}), ...(until !== undefined ? { cancellableUntil: until } : {}), ...(p.partial ? { partial: true } : {}) } });
    // The new bank looks at the application the next working day.
    s.schedule({ at: addDays(s.now, 1, s.homeZone), kind: SWITCH_REVIEW_KIND, label: 'World Simulation', category: 'system', priority: 80, payload: { personId: person.id, bankId: to.id } });
    return { at: due, ...(until !== undefined ? { cancellableUntil: until } : {}) };
  });
}
