/**
 * SLATE — the card, and the record a lender reads.
 *
 * The card used to be a balance and a rate written on it that nothing
 * charged, and the credit score was shown at creation and thrown away. Now
 * the card runs as a card does: a statement on the 20th, and a payment due on
 * the 15th of the next month, at least the 21 days after the statement a US
 * card must allow. Autopay pays the whole statement, as much of it as checking
 * holds, or only the minimum if the player says so, and anything more can be
 * paid whenever they like. It paid the minimum first, and a café worker in
 * Mosfellsbær ended the year with 931,000 krónur in checking and 126,000
 * still on the card at 28%, the record sliding for how much of it was used. A
 * statement paid in full keeps its grace period, and one that wasn't is
 * charged the month's interest at the card's rate. A payment short of the
 * minimum is late: a fee, and the record takes it.
 *
 * The record is kept as a score on the US scale, 300 to 850, which is how
 * American lenders read somebody and near enough how Canadian ones do. Most
 * of the world keeps no single number; the screen shows the score only in
 * those two countries and a plain word elsewhere. What moves it each month is
 * what moves a real one most: paying on time (it rises), how much of the card
 * is used (over thirty percent costs), a late payment, rent owed, and an
 * eviction. A month is reported whether the card owes anything or not: a
 * card kept at zero is an account paid as agreed. Until 2026-09-25 the
 * record moved only on a statement that owed something, and two years of
 * played careers that cleared the card ended at 693, where they began,
 * with rent owed in those months never counted either. What it decides: the card's rate, set by the record when the card opens and held there (it was repriced on each statement until 2026-09-26, which a US card may not be, Reg Z §1026.55); the
 * card's limit, raised a fifth at a six-monthly review for a record of 700
 * with nothing late in a year and cut to 70% by a late payment; and the
 * deposit a landlord asks (`depositFor` in `systems/household.ts`). It
 * decided only the rate at first.
 *
 * The card is the bank's (`content/cards.ts`): its name, whether a balance
 * can be carried or the whole statement is taken each month, its rate or the
 * range it prices a record within, its yearly fee, minimum payment, late fee
 * and the days to the due date, held to the country's caps. Until 2026-09-26
 * every card in the world ran on one set of American terms under the bank's
 * name, and the bank's own screen didn't show it. Where a bank's card isn't
 * on record, each term missing is SLATE's estimate of typical American card
 * terms (`cardTerms` says which), and the score's monthly moves are a
 * simplification of a model no lender publishes.
 */

import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account } from '../core/ledger';
import { CITIES, COUNTRIES } from '../content/geography';
import { exchange } from '../content/currency';
import { bankById } from '../content/banks';
import { CARDS, CARD_LAW, type CardProduct } from '../content/cards';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { addMonths, formatDate, instantFromZoned, normalDate, zonedParts, MS_DAY, type Instant } from '../core/time';
import { CommandError } from '../core/simulation';
import { drawFromBank, inTheBank } from './spending';
import { earningsOf } from './earnings';
import { statementReady } from './statements';
import { paymentsOf } from './payments';
import { allocatePayment, cashOwedOn } from './cash';
import { planLeftOf, statementOffers, transferRate, transfersOwedOn } from './cardoffers';
import { PENDING } from '../content/pending';
import { FIRST_LATE_FEE, LATE_FEE_RULES, US_SAFE_HARBOR, lateFeeByRule, type LateFeeRule } from '../content/latefees';
import { REVOLVING_COURSE, coursePayment, type RevolvingCourse } from '../content/revolving';

/**
 * Cards whose terms end a promotional rate at one missed minimum: Barclaycard
 * ("if you ... don't make your minimum payment in time – your interest rate
 * goes up to the purchase rate", barclaycard.co.uk, promotional rates). Bank
 * of Ireland's terms have no such clause and it keeps its rate (Personal
 * Credit Card terms, 06-26, condition 8(e)); the other British and Irish
 * cards' terms weren't read for it, and keep theirs. Until 2026-09-28 no card
 * outside the US ended an offer for a missed payment.
 */
export const INTRO_ENDS_ON_MISS: ReadonlySet<string> = new Set(['gb-barclays']);

export const STATEMENT_KIND = 'card.statement';
export const DUE_KIND = 'card.due';

/** One card's own state: its statement, its interest, its plans and transfers, its standing with its bank. */
export interface CardState {
  autopay: 'minimum' | 'full';
  /** What the last statement said was owed, and whether it has been paid in full. */
  statementBalance: Money;
  paidSinceStatement: Money;
  /** Whether the last statement was left partly unpaid, so this month's balance draws interest. */
  carrying: boolean;
  /** When the card's limit was last reviewed. */
  reviewedAt?: Instant;
  /**
   * When the bank last raised the limit, at a review or an ask, and when the holder last asked (from 2026-10-21, brief
   * 20's D2): an ask is looked at six months after the last of them (`askRefusal`, `systems/cardlife.ts`).
   */
  raisedAt?: Instant;
  askedAt?: Instant;
  /** The interest the last statement charged, which a minimum can add. */
  statementInterest?: Money;
  /** The day of the month the statement comes, which moves the due date with it (C25). Absent, the 20th. */
  statementDay?: number;
  /** When the last statement came (from 2026-10-10), which a moved statement day can't bring the next one sooner than `MIN_CYCLE_DAYS` after. */
  statementAt?: Instant;
  /** When the statement day was last moved (from 2026-10-13): once a statement cycle (`statementDayRefusal`). */
  dayMovedAt?: Instant;
  /** The account its autopay pays from (from 2026-10-10, `autopaySource`): the one it was set up on, not whichever is primary. */
  autopayFrom?: string;
  /**
   * When each statement was cut, oldest first, the last sixty (from 2026-10-10): the past statements' periods, which
   * until then were redrawn on today's statement day, so a moved day moved every statement before it too.
   */
  cuts?: Instant[];
  /**
   * What each statement said when it was cut (from 2026-10-10): its minimum and its terms, the last sixty. Until then a
   * past statement was redrawn from today's terms, score and intro months, so a cleared intro rate rewrote old ones.
   * On a hardship plan its minimum is the plan’s payment, the least the due date judges (`autopayAsk`), and `plan` says
   * so; a plan begun before a statement’s due date sets it in that statement’s place too (`card.request_hardship`).
   * Until 2026-10-13 a plan’s statement kept the card’s own minimum; `plan` is absent on one kept before then.
   */
  issued?: { at: Instant; minimum: Money; terms: CardTerms; plan?: boolean; pastDue?: Money }[];
  /** When the yearly fee was last charged (from 2026-10-10), so a month with two statements charges it once. */
  feeAt?: Instant;
  /** Due dates in a row with less than the minimum paid. */
  missed?: number;
  /** Why the card can't be used: payments missed, a hardship plan, persistent debt (A149, C11, C86). */
  suspended?: 'late' | 'hardship' | 'persistent';
  /** The holder closed the card: nothing new on it, and what's owed is paid down (C10). */
  closing?: Instant;
  /**
   * US: the holder opted in to transactions over the limit (C60). Until 2026-10-13 a count of the cycles in a row charged
   * for it was kept beside it, for a fee no card here publishes; it went with the fee.
   */
  overLimitOptIn?: boolean;
  /** The holder asked the bank never to raise the limit unasked (C79). */
  noAutoRaise?: boolean;
  /** A hardship plan: the interest frozen and a fixed payment (C75, C76). */
  hardship?: { payment: Money; since: Instant };
  /** When Britain's persistent-debt notice went (C75). */
  persistentNoticeAt?: Instant;
  /** When a late fee was last charged, for a bank whose first costs less (`FIRST_LATE_FEE`). */
  lateFeeAt?: Instant;
  /** Credit a payment from another bank freed, held back until a day (`PENDING.paymentHoldDays`). */
  paymentHolds?: { amount: Money; until: Instant }[];
  /** Interest built up day by day, compounded daily (C43, C50): charged at the statement once the grace period is lost, dropped at the due date where it holds. */
  accrued?: number;
  /** Interest from a carried balance up to the day it was paid in full, charged on the next statement (C48). */
  trailing?: number;
  /** The US penalty rate: noticed, and in force from 45 days on (C52, C53, C90); payments on time since it began. */
  penalty?: { noticeAt: Instant; from: Instant; onTime: number };
  /** Britain: default fees charged in the last 28 days, which bear no interest yet (C64). */
  recentFees?: { at: Instant; amount: Money }[];
  /** Since when the card has held a credit balance, for the US six-month refund (C23). */
  creditSince?: Instant;
  /** The part of what's owed that's cash advances, and the interest built on it, which has no grace period (C29, C49). */
  cashOwed?: Money;
  cashAccrued?: number;
  /** Balances moved onto the card, a balance transfer or a money transfer, each at its own rate (C31, C32). */
  transfers?: CardTransfer[];
  /** Purchases being paid off in equal months for a fixed fee, not interest (C34, C62), and what the last statement asked of them. */
  plans?: CardPlan[];
  statementPlanDue?: Money;
  /** Rewards earned and not yet redeemed, and since when purchases count toward the next (C39). */
  rewards?: Money;
  rewardsFrom?: Instant;
  /** What a card's bonus caps have taken this period, by category and period. */
  bonusUsed?: Record<string, Money>;
  /** A card's introductory rates, lost: on a US card 45 days after a payment more than 60 days late (Reg Z §1026.55(b)(4)). */
  introLost?: boolean;
  /**
   * A US card's minimums short at their due dates, oldest first, with what's still short of each (from 2026-10-22, the
   * owner's brief 21): a payment clears the oldest first, and a due date paid in full clears them all. The first is how
   * many days past due the card is, which its penalty rate, the end of its introductory rate and its charge-off are
   * counted from in days (`delinquency`). Until then they were counted in due dates missed in a row: the second, about
   * 30 days late, where Reg Z §1026.55(b)(4) says more than 60; the sixth, about 150, where the FFIEC says 180.
   */
  pastDue?: { at: Instant; short: Money }[];
  /**
   * What's been paid since the statement toward the minimums past due (`pastDue`), which the minimum payment due takes
   * in beside the statement's own (`autopayAsk`), so a payment clears one minimum, not two. As first written the same
   * day, a payment that cleared the oldest still counted toward the next due date's minimum too, and $40 paid on the
   * 60th day settled two $40 minimums and wiped the card's lateness (found by tests/b21-banking-proof.test.ts).
   */
  towardPastDue?: Money;
  /** The due date whose lateness the 61st day's notice was sent for, so it's sent once (§1026.9(g)). */
  noticedFor?: Instant;
  /** The day a US card's introductory rates end, 45 days after that notice. */
  introEndsAt?: Instant;
  /** The due date whose lateness the 150th day's notice before a charge-off was sent for. */
  defaultNoticedFor?: Instant;
  /**
   * A statement cut before the next one whose due date comes after it (from 2026-10-13): what it said was owed, the
   * least its due date judges, what autopay asks for it, and what has been paid since it, so its due date judges it and
   * not the newer statement. Until then a card whose grace runs past the next statement (Nordea’s and OTP Moldova’s 30
   * days, monobank’s 30, Postbank’s and Banco General’s 28, Banrural’s 55) had each due date judge the newer statement,
   * against what was paid since that one: a statement paid in full was taken for one left unpaid (found by that day’s
   * final defect pass).
   */
  waiting?: { at: Instant; statement: Money; due: Money; want: Money; paid: Money }[];
}

/**
 * The record a lender reads, the person's: the score, the late payments, a
 * card on its way; and beside them the everyday card's own state, the card
 * the day's spending goes on (`primaryId`). Every other card's state is its
 * own, by its account (`cards`). Until 2026-09-28 a person held one card,
 * and this was all of it.
 */
export interface CreditState extends CardState {
  /** 300 to 850, the US scale. */
  score: number;
  /** Late payments, by when. */
  late: Instant[];
  /** What's on the record against them, from 2026-09-30: when, what it took, and the country whose rule says how long it stays (`markRecord`). */
  marks?: { at: Instant; points: number; country: string; /** In Mexico, the debt's size in UDIs, which decides how long it stays (from 2026-10-01). */ udis?: number }[];
  /** A card applied for and on its way (C1, C5): from which bank, and, moving a balance onto it, from which card. */
  applied?: { bankId: string; arrivesAt: Instant; limit: Money; transfer?: boolean; fromId?: string };
  /** The everyday card, whose state is the record's own fields. */
  primaryId?: string;
  /** Every other open card's state, by its account. */
  cards?: Record<string, CardState>;
}

/** The fields that are a card's own, which move when another card becomes the everyday one. */
const CARD_KEYS: readonly (keyof CardState)[] = [
  'autopay', 'statementBalance', 'paidSinceStatement', 'carrying', 'reviewedAt', 'raisedAt', 'askedAt', 'statementInterest', 'statementDay', 'statementAt', 'dayMovedAt', 'cuts', 'issued', 'feeAt', 'autopayFrom', 'missed', 'suspended', 'closing',
  'overLimitOptIn', 'noAutoRaise', 'hardship', 'persistentNoticeAt', 'lateFeeAt', 'paymentHolds', 'accrued', 'trailing', 'penalty',
  'recentFees', 'creditSince', 'cashOwed', 'cashAccrued', 'transfers', 'plans', 'statementPlanDue', 'rewards', 'rewardsFrom', 'bonusUsed', 'introLost', 'waiting',
  'pastDue', 'towardPastDue', 'noticedFor', 'introEndsAt', 'defaultNoticedFor',
];

/** A new card's state: nothing owed, nothing carried, paid by autopay as the holder pays their others. */
export function freshCardState(autopay: CardState['autopay'], at: Instant): CardState {
  return { autopay, statementBalance: 0, paidSinceStatement: 0, carrying: false, reviewedAt: at, missed: 0, transfers: [], plans: [], statementPlanDue: 0, rewards: 0 };
}

/** Every open card a person holds, the everyday one first. */
export function cardsOf(sim: Simulation, person: Person): Account[] {
  const open = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && a.kind === 'credit_card' && !a.closedAt);
  const primary = person.credit?.primaryId;
  return primary ? [...open.filter((a) => a.id === primary), ...open.filter((a) => a.id !== primary)] : open;
}

/** A card's own state: the everyday card's is the record's; another's is kept by its account. */
export function stateOf(person: Person, card: Account): CardState {
  const credit = person.credit!;
  if (!credit.primaryId || credit.primaryId === card.id) return credit;
  credit.cards ??= {};
  return (credit.cards[card.id] ??= freshCardState(credit.autopay, card.openedAt));
}

/**
 * The everyday card closed while another stays open: the next becomes the
 * everyday one, its state moved into the record's fields. Or none open, and
 * the record keeps the last one's till another comes.
 */
export function ensurePrimary(sim: Simulation, person: Person): void {
  const credit = person.credit;
  if (!credit) return;
  const open = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && a.kind === 'credit_card' && !a.closedAt);
  if (credit.primaryId && open.some((a) => a.id === credit.primaryId)) return;
  const next = open.find((a) => credit.cards?.[a.id]) ?? open[0];
  if (!next) return;
  if (!credit.primaryId || !credit.cards?.[next.id]) { credit.primaryId = next.id; return; }
  // The closed card owed nothing, or its debt went to collections: its state is finished.
  makeEveryday(person, next, false);
}

/** Swaps a card in as the everyday one: its state into the record's fields, the old everyday card's into its own where it's kept. */
export function makeEveryday(person: Person, card: Account, keepOld = true): void {
  const credit = person.credit!;
  if (credit.primaryId === card.id) return;
  credit.cards ??= {};
  const incoming = credit.cards[card.id] ?? freshCardState(credit.autopay, card.openedAt);
  if (credit.primaryId && keepOld) {
    const outgoing: Partial<CardState> = {};
    for (const key of CARD_KEYS) if (credit[key] !== undefined) (outgoing as Record<string, unknown>)[key] = credit[key];
    credit.cards[credit.primaryId] = outgoing as CardState;
  }
  adoptEveryday(person, card, incoming);
}

/** A card's state written into the record's fields, the card the everyday one. */
export function adoptEveryday(person: Person, card: Account, state: CardState): void {
  const credit = person.credit!;
  for (const key of CARD_KEYS) {
    if (state[key] !== undefined) (credit as unknown as Record<string, unknown>)[key] = state[key];
    else delete (credit as unknown as Record<string, unknown>)[key];
  }
  delete credit.cards?.[card.id];
  credit.primaryId = card.id;
}

/** The card a command or a scheduled item names, open and theirs, or the everyday card where it names none. */
export function cardFor(sim: Simulation, person: Person, accountId: unknown): Account | undefined {
  if (accountId === undefined || accountId === null || accountId === '') return cardOf(sim, person);
  const card = sim.universe.accounts[String(accountId)];
  return card && card.ownerId === person.id && card.kind === 'credit_card' && !card.closedAt ? card : undefined;
}

export interface CardTransfer {
  kind: 'balance' | 'money';
  owed: Money;
  accrued: number;
  /** The rate once any introductory rate ends, and that rate and its end. */
  apr: number;
  introApr?: number;
  introUntil?: Instant;
}

export interface CardPlan {
  /** What's left of the purchase to pay, the part due each month, the month's fee, and months to go. */
  left: Money;
  monthly: Money;
  fee: Money;
  monthsLeft: number;
  /** A plan charged as interest (`content/plans.ts`): its yearly rate on what's left, the equal month then paying it and the principal. */
  apr?: number;
}

const SCORE_MIN = 300;
const SCORE_MAX = 850;
/** The rate a score buys where the bank's card isn't on record. SLATE's estimate of typical US card pricing. */
const RATE_BANDS: readonly { from: number; apr: number }[] = [
  { from: 800, apr: 0.1999 }, { from: 740, apr: 0.2199 }, { from: 670, apr: 0.2499 },
  { from: 580, apr: 0.2799 }, { from: 0, apr: 0.2999 },
];
const MINIMUM_USD = 25;
const MINIMUM_SHARE = 0.02;
const LATE_FEE_USD = 32;
/** What a card charges for a payment that bounces, where its own fee wasn't found: SLATE's estimate, Chase's $40. */
const RETURNED_PAYMENT_USD = 40;
/** A cash advance's fee where the card's own wasn't found: SLATE's estimate, Chase's 5% or $10. */
const CASH_FEE_SHARE = 0.05;
const CASH_FEE_USD = 10;
/** Where a card may go over its limit for someone who opted in: SLATE's estimate, a tenth over. */
const OVER_LIMIT_SHARE = 0.1;
/**
 * Due dates missed in a row before the bank suspends the card: SLATE's estimate, written here as "sixty days late". The
 * second due date missed is thirty days past the first, as the late notice says of a US card's report, so the player's
 * words count the payments missed instead (from 2026-10-20, brief 17): until then the penalty notice said "A payment is
 * sixty days late" on the day the late notice said thirty, and the default notice "150 days behind" at 120. Until brief
 * 21 (2026-10-22) a US card's penalty rate and the end of its introductory rate came at the second missed due date, and
 * its charge-off at the sixth; from then they're counted in days (`US_LATE`).
 */
export const SUSPEND_AFTER = 2;
/**
 * And before it charges the card off to collections, outside the US: the sixth due date missed in a row, about 150 days
 * past the first, SLATE's assumption, no country's own rule having been read. This said "180 days, the FFIEC's rule …
 * used everywhere" until brief 21, while it charged off at 150.
 */
export const CHARGE_OFF_AFTER = 6;
/**
 * A US card's days past due, counted from the due date of the oldest minimum still short (from 2026-10-22, the owner's
 * brief 21; docs/verification/genre-banking-2026-10-22/banking-sources.md):
 * - `notice`: the first day a minimum isn't received "within 60 days after the due date" (Reg Z §1026.55(b)(4); comment
 *   55(b)(4)-1: due March 15, the exception applies from May 15), when the §1026.9(g) notice may go;
 * - `noticeDays`: 45 days after it the penalty rate (on a card whose terms have one) and the end of an introductory rate
 *   take effect (§1026.9(g));
 * - `warn`: the day the last notice before a charge-off goes, 30 days ahead of it, SLATE's;
 * - `chargeOff`: open-end credit "charged off when 180 days past due" (FFIEC Uniform Retail Credit Classification and
 *   Account Management Policy, 65 FR 36903; OCC Bulletin 2000-20, June 20, 2000).
 */
export const US_LATE = { notice: 61, noticeDays: 45, warn: 150, chargeOff: 180 } as const;
/** Whether a card is a US bank's, held to Reg Z. */
export const usCard = (card: Account | undefined): boolean => bankById(card?.bankId ?? '')?.iso === 'US';
/** Whole days from one instant's date to another's, in a zone. */
const daysBetween = (from: Instant, to: Instant, zone: string): number => {
  const a = zonedParts(from, zone);
  const b = zonedParts(to, zone);
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / MS_DAY);
};
/** How often the limit is reviewed. */
const REVIEW_EVERY = 182 * 86_400_000;
/**
 * The record that earns a raise: at the six-monthly review, and for a raise the holder asks for (`card.request_limit` in
 * `systems/cardlife.ts`), whose notice says it, as the guide's card entry does (`content/guide/money.ts`). Until
 * 2026-10-17 the ask, its notice and the guide each typed 700 beside this (brief 14's cross-area pass).
 */
export const RAISE_FROM = 700;

/**
 * The most of a holder's monthly income the minimum payments may take for a bank to raise a limit (from 2026-10-21,
 * brief 20's D2). Until then a review raised a limit a fifth every six months for a good record and nothing else, so it
 * grew without end: every life brief 19 played reached six figures, life A's Chase card $194,736 by October 2029 on a
 * student's income of about $3,100 a year. Regulation Z §1026.51(a) has a bank raise a limit, at its own review or at the
 * holder's ask, only once it has considered the holder's ability to make the minimum payments "based on the consumer's
 * income or assets and the consumer's current obligations", the payments on the new limit worked out as if all of it
 * were used (§1026.51(a)(2)(ii)); the rule names the ratios a bank may use and no figure. A quarter is the stricter of the
 * two shares of income Fulford and Stavins (Federal Reserve Bank of Boston Working Paper 24-3, 2024, Table 3) took as what
 * a holder has to spare, the one they called conservative. SLATE's estimate on that reading, held to every bank: a raise
 * outside the US is a significant increase that Britain's CONC 5.2A and the EU's Consumer Credit Directive (Article 8(2))
 * also ask a creditworthiness assessment for.
 */
export const PAYMENTS_SHARE = 0.25;

/** A month of the holder's income, from the twelve months before this one in the earnings record (`systems/earnings.ts`). */
export function monthlyIncome(sim: Simulation, person: Person): Money {
  const now = zonedParts(sim.now, zoneOf(sim, person));
  const months = earningsOf(person).months;
  let sum = 0;
  for (let back = 1; back <= 12; back += 1) {
    const m = new Date(Date.UTC(now.year, now.month - 1 - back, 1));
    sum += months[`${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`] ?? 0;
  }
  return Math.round(sum / 12);
}

/**
 * The highest limit, up to `want`, the bank will give the card on the holder's income or assets (`PAYMENTS_SHARE`), in
 * whole units of the money, as the review's fifth is rounded; the limit it has where no higher one passes. The interest in
 * the minimum is a month's at the rate the card charges for purchases now (§1026.51(a)(2)(ii)(B)(1), for an existing
 * account), an introductory rate while it lasts. The income's test: the minimum on the whole limit, at the
 * card's rate and its own minimum, with what the holder already owes each month (the minimums on their other cards'
 * statements and their loans' payments: §1026.51's commentary lets a bank leave the other lines as they're used), within
 * a quarter of a month's income. The assets' test, the debt-to-assets ratio the rule names: the whole limit and everything
 * else owed on cards and loans covered by what they hold in the bank. Either passes.
 */
export function limitCarried(sim: Simulation, person: Person, card: Account, want: Money): Money {
  const now = card.creditLimit ?? 0;
  if (want <= now) return want;
  const terms = cardTerms(sim, card, person.credit?.score ?? 650);
  const others = cardsOf(sim, person).filter((c) => c.id !== card.id);
  const loans = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && a.kind === 'loan' && a.category === 'personal');
  const obligations = others.reduce((sum, c) => sum + minimumDue(sim, stateOf(person, c).statementBalance, cardTerms(sim, c, person.credit?.score ?? 650), 0, 0), 0)
    + loans.reduce((sum, l) => sum + (l.loanPayment ?? 0), 0);
  const owedElsewhere = others.reduce((sum, c) => sum + Math.max(0, -c.balance), 0) + loans.reduce((sum, l) => sum + Math.max(0, -l.balance), 0);
  const held = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.nominal && !a.closedAt && (a.kind === 'checking' || a.kind === 'savings')).reduce((sum, a) => sum + Math.max(0, a.balance), 0);
  const spare = monthlyIncome(sim, person) * PAYMENTS_SHARE;
  const carried = (limit: Money): boolean => minimumDue(sim, limit, terms, terms.minimumPlusInterest ? Math.round((limit * terms.apr) / 12) : 0, 0) + obligations <= spare
    || limit + owedElsewhere <= held;
  if (carried(want)) return want;
  // The highest whole unit between the limit now and the one asked that passes: the tests only grow harder as it rises.
  let lo = Math.ceil(now / 100);
  let hi = Math.floor(want / 100) - 1;
  let best = now;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (carried(mid * 100)) { best = Math.max(best, mid * 100); lo = mid + 1; } else hi = mid - 1;
  }
  return best;
}

/**
 * How long a mark stays on the record, by the country it was reported in
 * (`docs/research/world/research-credit-damage-movers.json`): seven years in
 * America under the FCRA, six in Britain, as Experian UK keeps a default or
 * a judgment, and five in Ireland, as the Central Credit Register keeps a
 * loan after it's settled (taken here from the mark). Canada's six, from
 * 2026-10-01, is how long Equifax Canada and TransUnion keep a late payment
 * or a collection (`docs/research/world/research-aviation-boats-credit-mot.json`). In Mexico no period was
 * researched and a mark stayed until later on 2026-10-01; now it goes by the
 * debt's size in UDIs (`docs/research/world/research-open-final.json`):
 * seventy-two months under article 23 of the law on credit bureaus, which
 * leaves the smaller debts to Banxico, whose Circular 27/2008 deletes one of
 * 25 UDIs or less after a year, to 500 after two and to 1,000 after four.
 * A UDI is the 8.834094 pesos the DOF published for 30 September 2026. A
 * mark whose debt SLATE doesn't know, a late payment's, stays the law's six
 * years. Its weight fades before it goes, as myFICO
 * says, which the months paid on time already carry; when it goes, the one
 * measured figure is the CFPB's, 25 points on average when the last medical
 * collection came off (2023), taken for every kind. From 2026-09-30; until
 * then a mark never left the record.
 */
export const MARK_YEARS: Readonly<Record<string, number>> = { us: 7, uk: 6, ie: 5, ca: 6, mx: 6 };
/** Mexico's tiers: a debt to so many UDIs leaves the record after so many years. */
export const MX_TIERS: readonly (readonly [number, number])[] = [[25, 1], [500, 2], [1_000, 4]];
export const UDI_MXN = 8.834094;
/** An amount in the save's money, in pesos: a Mexican debt's size. */
const pesos = (sim: Simulation, cents: Money): number => { const cur = saveCurrency(sim.universe); return (cur === 'MXN' ? cents : exchange(cents, cur, 'MXN') ?? cents) / 100; };
const markYears = (m: { country: string; udis?: number }): number | undefined => (m.country === 'mx' && m.udis !== undefined ? MX_TIERS.find(([upTo]) => m.udis! <= upTo)?.[1] ?? MARK_YEARS.mx : MARK_YEARS[m.country]);
export const MARK_GONE_GIVES = 25;

/** A mark on the record: the score falls by it, and it's kept until its country's years are up; in Mexico, by the debt charged off, in pesos. */
export function markRecord(person: Person, points: number, at: Instant, where: string, owedMxn?: number): void {
  const record = person.credit;
  if (!record) return;
  record.score = Math.max(SCORE_MIN, record.score - points);
  const country = CITIES.get(where)?.countryId ?? '';
  (record.marks ??= []).push({ at, points, country, ...(country === 'mx' && owedMxn !== undefined ? { udis: owedMxn / UDI_MXN } : {}) });
}

/** Marks past their country's years leave the record, and give back what the CFPB measured. */
export function marksFallOff(person: Person, at: Instant): number {
  const record = person.credit;
  if (!record?.marks?.length) return 0;
  const year = 365.2425 * 86_400_000;
  const gone = record.marks.filter((m) => { const years = markYears(m); return years !== undefined && at - m.at >= years * year; });
  if (!gone.length) return 0;
  record.marks = record.marks.filter((m) => !gone.includes(m));
  record.score = Math.min(SCORE_MAX, record.score + gone.length * MARK_GONE_GIVES);
  return gone.length;
}

export function aprFor(score: number): number {
  return RATE_BANDS.find((band) => score >= band.from)!.apr;
}

/** Where a bank prices a record within a range: the best record at the bottom, the worst at the top. */
const BEST = 800;
const WORST = 580;
export function priceWithin(from: number, to: number, score: number): number {
  const t = Math.min(1, Math.max(0, (BEST - score) / (BEST - WORST)));
  return Math.round((from + (to - from) * t) * 10_000) / 10_000;
}

/** A term of the card: the bank's, or SLATE's estimate. */
export type CardTerm = 'card' | 'rate' | 'minimum' | 'lateFee' | 'annualFee' | 'returnedPaymentFee' | 'cashAdvance';

/** What a card charges and asks, for a record, in the save's money. */
export interface CardTerms {
  name: string;
  /** The bank that issued it, which switching banks doesn't change. */
  bankId?: string;
  issuer?: string;
  kind: 'revolving' | 'charge';
  /** The rate on the account now: set by the record when it opened, the penalty rate where one is in force. */
  apr: number;
  /** What the bank would price a card at for this record, today. */
  priced: number;
  /** The US penalty rate, where the card has one, and whether it's in force. */
  penaltyApr?: number;
  penaltyInForce?: boolean;
  aprFrom?: number;
  aprTo?: number;
  annualFee: Money;
  minimumShare: number;
  minimumFloor: Money;
  minimumPlusInterest: boolean;
  /** Mexico's: never under a share of the limit (`MEXICO_MINIMUM`). */
  minimumOfLimit?: Money;
  /** A revolving course that sets the minimum by a table (`content/revolving.ts`), and the record it reads. */
  course?: RevolvingCourse;
  score?: number;
  lateFee: Money;
  /** What a bounced payment costs. */
  returnedPaymentFee: Money;
  /** A cash advance's fee (a share, never under a minimum), its rate, and the most of the limit it may use. */
  cashFeeShare: number;
  cashFeeMin: Money;
  cashApr: number;
  cashLimit?: Money;
  /** Days from the statement to the due date; absent, the 15th of the next month. */
  graceDays?: number;
  /** An introductory purchase rate, and when it ends; in force while the rate is below the card's own. */
  introApr?: number;
  introUntil?: Instant;
  /** While an introductory rate is in force, the card's own rate after it. */
  standardApr?: number;
  /** A balance transfer's terms, where the card's were found: its fee, its rate, and its introductory rate for so many months from opening. */
  transfer?: { feeShare: number; feeMin: Money; apr: number; introApr?: number; introMonths?: number };
  /** A money transfer's fee as a share, where the card offers one. */
  moneyTransferFee?: number;
  /** A plan's monthly fee as a share, the most the bank says it charges, and the bank's words. */
  planFeeShare?: number;
  planWords?: string;
  /** Rewards at the card's base rate, and the bank's words for them. */
  rewardsRate?: number;
  rewardsWords?: string;
  /** The country's cap on a card's rate, where it has one. */
  aprCap?: number;
  /** A late fee set as a share (`LATE_FEE_RULES`), its sums in the save's money; `lateFee` is then its least. */
  lateRule?: LateFeeRule;
  /** The country's law, where it capped a term. */
  capped?: { apr?: number; lateFee?: Money; law: string; source: string };
  /** The terms that are SLATE's estimate, not the bank's. */
  estimated: CardTerm[];
  source?: string;
  asOf?: string;
}

function inSave(sim: Simulation, amount: Money, currency: string): Money {
  const into = saveCurrency(sim.universe);
  return into === currency ? amount : exchange(amount, currency, into) ?? amount;
}

/** The card's terms: the bank's where on record, each one missing SLATE's estimate, held to the country's caps. */
export function cardTerms(sim: Simulation, card: Account, score: number): CardTerms {
  const bank = card.bankId ? bankById(card.bankId) : undefined;
  const found = bank ? CARDS[bank.id] : undefined;
  const product: CardProduct | undefined = found && !('none' in found) ? found : undefined;
  const law = bank ? CARD_LAW[bank.iso] : undefined;
  const money = product?.currency ?? bank?.currency ?? saveCurrency(sim.universe);
  const estimated: CardTerm[] = [];
  if (!product) estimated.push('card');
  const range = product?.aprFrom !== undefined && product.aprTo !== undefined;
  let priced = range ? priceWithin(product!.aprFrom!, product!.aprTo!, score) : product?.apr;
  if (priced === undefined) { priced = aprFor(score); estimated.push('rate'); }
  // The account's own rate, set when it opened; the penalty rate over it once in force.
  const owner = sim.universe.people[card.ownerId];
  const canada = bank ? CANADA_PENALTY[bank.id] : undefined;
  const penaltyApr = product?.penaltyApr ?? canada?.apr;
  const own = owner?.credit ? stateOf(owner, card) : undefined;
  const penaltyInForce = Boolean(penaltyApr && own?.penalty && sim.now >= own.penalty.from);
  let apr = card.apr ?? priced;
  if (penaltyInForce) apr = Math.max(apr, penaltyApr!);
  // An introductory rate from opening, lost for a US payment sixty days late,
  // which a penalty rate needs first.
  const introUntil = product?.introMonths ? addMonths(card.openedAt, product.introMonths, sim.homeZone) : undefined;
  const standardApr = apr;
  if (introUntil !== undefined && sim.now < introUntil && !own?.introLost) apr = Math.min(apr, product!.introApr!);
  const course = bank ? REVOLVING_COURSE[bank.id] : undefined;
  const minimumKnown = product?.minimumShare !== undefined || product?.minimumFloor !== undefined || course !== undefined;
  if (!minimumKnown && product?.kind !== 'charge') estimated.push('minimum');
  const rule = bank ? LATE_FEE_RULES[bank.id] : undefined;
  const lateRule: LateFeeRule | undefined = rule ? {
    ...rule,
    ...(rule.fixed !== undefined ? { fixed: inSave(sim, rule.fixed, money) } : {}),
    ...(rule.min !== undefined ? { min: inSave(sim, rule.min, money) } : {}),
    ...(rule.max !== undefined ? { max: inSave(sim, rule.max, money) } : {}),
  } : undefined;
  let lateFee = lateRule ? (lateRule.fixed ?? 0) + (lateRule.min ?? 0) : product?.lateFee !== undefined ? inSave(sim, product.lateFee, money) : undefined;
  if (lateFee === undefined) { lateFee = usdIn(sim, LATE_FEE_USD); estimated.push('lateFee'); }
  if (product && product.annualFee === undefined) estimated.push('annualFee');
  // A cash advance: the card's own terms, or SLATE's estimate of a US card's, 5% or $10 at the purchase rate.
  const cashKnown = product?.cashFeeShare !== undefined || product?.cashApr !== undefined;
  if (!cashKnown) estimated.push('cashAdvance');
  const cashFeeShare = product?.cashFeeShare ?? CASH_FEE_SHARE;
  const cashFeeMin = product?.cashFeeMin !== undefined ? inSave(sim, product.cashFeeMin, money) : product?.cashFeeShare !== undefined ? 0 : usdIn(sim, CASH_FEE_USD);
  const cashLimit = product?.cashLimit !== undefined ? inSave(sim, product.cashLimit, money) : product?.cashLimitShare !== undefined ? Math.round((card.creditLimit ?? 0) * product.cashLimitShare) : undefined;
  let returnedPaymentFee = product?.returnedPaymentFee !== undefined ? inSave(sim, product.returnedPaymentFee, money) : undefined;
  if (returnedPaymentFee === undefined) { returnedPaymentFee = usdIn(sim, RETURNED_PAYMENT_USD); estimated.push('returnedPaymentFee'); }
  let capped: CardTerms['capped'];
  if (law?.aprCap !== undefined && apr > law.aprCap) { apr = law.aprCap; capped = { apr: law.aprCap, law: law.law, source: law.source }; }
  if (law?.aprCap !== undefined && priced > law.aprCap) priced = law.aprCap;
  if (law?.lateFeeCap !== undefined) {
    const cap = inSave(sim, law.lateFeeCap, bank!.currency);
    if (lateFee > cap) { lateFee = cap; capped = { ...(capped ?? { law: law.law, source: law.source }), lateFee: cap }; }
  }
  return {
    name: product?.name ?? card.name,
    ...(bank ? { bankId: bank.id, issuer: bank.name } : {}),
    kind: product?.kind ?? 'revolving',
    apr,
    priced,
    ...(penaltyApr ? { penaltyApr, penaltyInForce } : {}),
    ...(range ? { aprFrom: product!.aprFrom, aprTo: product!.aprTo } : {}),
    annualFee: product?.annualFee ? inSave(sim, product.annualFee, money) : 0,
    minimumShare: minimumKnown ? product!.minimumShare ?? 0 : MINIMUM_SHARE,
    minimumFloor: minimumKnown ? (product!.minimumFloor !== undefined ? inSave(sim, product!.minimumFloor, money) : 0) : usdIn(sim, MINIMUM_USD),
    minimumPlusInterest: course ? course.plusInterest === true : product?.minimumPlusInterest ?? false,
    ...(course ? { course, score } : {}),
    ...(bank?.iso === 'MX' ? { minimumOfLimit: Math.round((card.creditLimit ?? 0) * MEXICO_MINIMUM.ofLimit) } : {}),
    lateFee,
    returnedPaymentFee,
    cashFeeShare,
    cashFeeMin,
    cashApr: Math.min(Math.max(product?.cashApr ?? apr, penaltyInForce && canada?.cashApr ? canada.cashApr : 0), law?.aprCap ?? Number.POSITIVE_INFINITY),
    ...(cashLimit !== undefined ? { cashLimit } : {}),
    ...(product?.graceDays !== undefined ? { graceDays: product.graceDays } : {}),
    ...(introUntil !== undefined ? { introApr: product!.introApr, introUntil } : {}),
    ...(apr < standardApr ? { standardApr: Math.min(standardApr, law?.aprCap ?? Number.POSITIVE_INFINITY) } : {}),
    ...(product?.transfer ? {
      transfer: {
        feeShare: product.transfer.feeShare ?? 0,
        feeMin: product.transfer.feeMin !== undefined ? inSave(sim, product.transfer.feeMin, money) : 0,
        apr: Math.min(product.transfer.apr ?? card.apr ?? priced, law?.aprCap ?? Number.POSITIVE_INFINITY),
        ...(product.transfer.introMonths !== undefined ? { introApr: product.transfer.introApr, introMonths: product.transfer.introMonths } : {}),
      },
    } : {}),
    ...(product?.moneyTransferFee ? { moneyTransferFee: product.moneyTransferFee } : {}),
    ...(product?.planFeeShare ? { planFeeShare: product.planFeeShare } : {}),
    ...(product?.planWords ? { planWords: product.planWords } : {}),
    ...(product?.rewardsRate ? { rewardsRate: product.rewardsRate } : {}),
    ...(product?.rewardsWords ? { rewardsWords: product.rewardsWords } : {}),
    ...(law?.aprCap !== undefined ? { aprCap: law.aprCap } : {}),
    ...(capped ? { capped } : {}),
    ...(lateRule ? { lateRule } : {}),
    estimated,
    ...(product ? { source: product.source, asOf: product.asOf } : {}),
  };
}

/** The player's card's terms, where they have one. */
export function playerCardTerms(sim: Simulation): CardTerms | undefined {
  const card = cardOf(sim, sim.player);
  return card ? cardTerms(sim, card, sim.player.credit?.score ?? 650) : undefined;
}

/** Where the score is shown as a number: the United States and Canada. */
export function scoreIsANumberIn(cityId: string): boolean {
  const code = COUNTRIES.get(CITIES.get(cityId)?.countryId ?? '')?.jurisdictionCode;
  return code === 'US' || code === 'CA';
}

/** A score said in a word, for everywhere that doesn't keep one number. */
export function scoreWord(score: number): string {
  return score >= 800 ? 'Exceptional' : score >= 740 ? 'Very Good' : score >= 670 ? 'Good' : score >= 580 ? 'Fair' : 'Poor';
}

/**
 * What can go on the card now: nothing while it's suspended, closing or not
 * yet arrived; its free limit otherwise, and a tenth more for somebody in the
 * US who opted in to going over it (C38, C60).
 */
export function cardRoom(person: Person, card: Account | undefined): Money {
  const credit = person.credit && card ? stateOf(person, card) : undefined;
  if (!card || card.closedAt || credit?.suspended || credit?.closing !== undefined) return 0;
  // Locked, lost or stolen: nothing new on it (`systems/security.ts`). A bill already on it went on while it was locked
  // until 2026-10-09, when nothing charged a card as a bill any more.
  const p = card.plastic;
  if (p?.stopped || p?.locked) return 0;
  // Only a US holder can opt in (`card.set_over_limit`).
  const over = credit?.overLimitOptIn ? Math.round((card.creditLimit ?? 0) * OVER_LIMIT_SHARE) : 0;
  const held = (credit?.paymentHolds ?? []).reduce((sum, one) => sum + one.amount, 0);
  return Math.max(0, (card.creditLimit ?? 0) + card.balance + over - held);
}

/** The everyday card: the one the day's spending goes on, where they hold one. */
export function cardOf(sim: Simulation, person: Person): Account | undefined {
  const primary = person.credit?.primaryId;
  const own = primary ? sim.universe.accounts[primary] : undefined;
  if (own && !own.closedAt) return own;
  return Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && a.kind === 'credit_card' && !a.closedAt);
}

function usdIn(sim: Simulation, usd: number): Money {
  const cents = exchange(usd * 100, 'USD', saveCurrency(sim.universe)) ?? usd * 100;
  return Math.round(cents / 100) * 100;
}

/**
 * The least that must be paid on a statement: the card's share of it, plus
 * the month's interest where the bank adds it, never under its floor, and
 * never more than the statement. A charge card asks for all of it.
 */
export function minimumDue(sim: Simulation, statement: Money, terms = playerCardTerms(sim), interest = sim.player.credit?.statementInterest ?? 0, planDue = sim.player.credit?.statementPlanDue ?? 0): Money {
  if (!terms) return Math.min(statement, Math.max(usdIn(sim, MINIMUM_USD), Math.round(statement * MINIMUM_SHARE)));
  if (terms.kind === 'charge') return statement;
  // A plan's month is asked in full, on top of the rest's share (C34); a revolving course asks its table's payment instead of the share.
  const money = terms.bankId ? bankById(terms.bankId)?.currency : undefined;
  const share = terms.course
    ? coursePayment(terms.course, statement - planDue, terms.score ?? 650, (m) => (money ? inSave(sim, m, money) : m)) + (terms.minimumPlusInterest ? interest : 0)
    : Math.round((statement - planDue) * terms.minimumShare) + (terms.minimumPlusInterest ? interest : 0);
  return Math.min(statement, Math.max(terms.minimumFloor, share, terms.minimumOfLimit ?? 0) + planDue);
}

/** Pays the card from the bank, as much of an amount as checking and savings hold. Returns what was paid. */
function payCard(sim: Simulation, person: Person, amount: Money, byHand = false, card = cardOf(sim, person)): Money {
  if (!card) return 0;
  // Autopay from the account it was set up on (`autopaySource`) and savings linked to it; by hand, from the primary
  // account and its savings.
  const from = byHand ? undefined : autopaySource(sim, person, card);
  if (!byHand && (!from || from.closedAt)) return 0;
  const inCurrent = Math.max(0, (from ?? sim.universe.accounts[person.primaryAccountId ?? ''])?.balance ?? 0);
  // Linked savings is the easy-access savings at the bank of the account it's paid from, as every payment draws it
  // (`drawFromBank`). From 2026-10-12: until then autopay from another account than the primary drew none, while a loan
  // repaid from that account did, and How You Pay said the link covered both; a card's autopay bounced, savings full.
  const linked = byHand || paymentsOf(person).linkSavings;
  const reach = linked ? inTheBank(sim, person, from) : inCurrent;
  // By hand the holder may pay more than is owed, and the card holds the credit (C23).
  const paid = Math.max(0, Math.min(amount, reach, byHand ? amount : -card.balance));
  if (paid <= 0) return 0;
  sim.post({
    memo: `Paid ${card.name}`, category: 'card-payment',
    postings: [{ accountId: card.id, amount: paid }, ...drawFromBank(sim, person, paid, false, linked, from).postings],
  });
  if (person.credit) {
    const state = stateOf(person, card);
    state.paidSinceStatement += paid;
    // Toward a statement still waiting for its due date too (`waiting`): what’s owed on it is in the newer one as well.
    for (const w of state.waiting ?? []) w.paid += paid;
    // And toward a US card's minimums past due, the oldest first (`pastDue`, from 2026-10-22).
    let toward = paid;
    while (toward > 0 && state.pastDue?.length) {
      const oldest = state.pastDue[0]!;
      const take = Math.min(toward, oldest.short);
      oldest.short -= take;
      toward -= take;
      state.towardPastDue = (state.towardPastDue ?? 0) + take;
      if (oldest.short <= 0) state.pastDue.shift();
    }
    if (state.pastDue?.length === 0) delete state.pastDue;
    // Paid from another bank, the card's bank may hold back the credit it frees
    // for its days while the payment clears; paid from its own, it doesn't. The bank is the drawn account's: autopay's
    // own account, or the primary by hand. Until 2026-10-12 it was always the primary's, so autopay from the card's
    // bank with the primary elsewhere was held, and autopay from elsewhere with the primary at the card's bank wasn't.
    const days = card.bankId ? PENDING[card.bankId]?.paymentHoldDays : undefined;
    const drawnAt = (from ?? sim.universe.accounts[person.primaryAccountId ?? ''])?.bankId;
    if (days && drawnAt !== card.bankId) (state.paymentHolds ??= []).push({ amount: paid, until: sim.now + days * MS_DAY });
    const terms = cardTerms(sim, card, person.credit.score);
    allocatePayment(sim, person, card, paid, minimumDue(sim, state.statementBalance, terms, state.statementInterest ?? 0, state.statementPlanDue ?? 0), { cash: terms.cashApr, purchases: terms.apr });
  }
  return paid;
}

function zoneOf(sim: Simulation, person: Person): string {
  return CITIES.get(person.currentLocationId)?.timeZone ?? sim.homeZone;
}

/**
 * Canada's penalty rates, from each bank's cost-of-borrowing disclosure (read
 * 2026-09-26 into `probe/cards/out-1.jsonl`): two missed minimums in twelve
 * months, and the rate rises, RBC's purchases to 24.99%, BMO's to 25.99%,
 * CIBC's to 25.99% and its cash to 27.99%, "for at least 12 months". It comes
 * off after twelve payments on time in a row; RBC's box doesn't say how long,
 * and twelve is SLATE's estimate for it. Researched and run by nothing until
 * 2026-09-27, when only the US penalty rate ran.
 */
/**
 * Mexico's minimum payment, Banco de México Circular 13/2011, for every
 * issuer: the greater of 1.5% of the balance plus the period's interest, as
 * the banks' own terms have it, and 1.25% of the credit limit, never more than
 * what's owed. Researched on 2026-09-26 and not run until 2026-09-27, when the
 * minimum was the share of the balance alone.
 */
export const MEXICO_MINIMUM = {
  ofLimit: 0.0125,
  source: 'https://www.banxico.org.mx/marco-normativo/normativa-emitida-por-el-banco-de-mexico/circular-13-2011/%7BBA4CBC28-A468-16C9-6F17-9EA9D7B03318%7D.pdf',
} as const;

export const CANADA_PENALTY: Readonly<Record<string, { apr: number; cashApr?: number }>> = {
  'ca-rbc': { apr: 0.2499 },
  'ca-bmo': { apr: 0.2599 },
  'ca-cibc': { apr: 0.2599, cashApr: 0.2799 },
};
const CANADA_PENALTY_ON_TIME = 12;

/** The day a card states: the 20th, or the day they moved it to; the everyday card's where none is named. */
export function statementDayOf(person: Person | undefined, card?: Account): number {
  if (person?.credit && card) return stateOf(person, card).statementDay ?? 20;
  return person?.credit?.statementDay ?? 20;
}

/** A card's next statement: its day at nine. */
/**
 * The shortest billing cycle a moved statement day makes: a month less the four days Reg Z lets a cycle vary
 * (§1026.2(a)(4), "approximately equal intervals"), so the change makes one longer cycle, never a short one. Until
 * 2026-10-10 the next statement came at the new day's next date however soon, and moving the day each day cut a
 * statement each day: a month paid as agreed on the record each time, and the yearly fee twice in its month.
 */
export const MIN_CYCLE_DAYS = 27;

/**
 * Why a card's statement day can't move now: once a statement cycle, SLATE's reading of an issuer's limit, which the
 * banks' terms read don't give. From 2026-10-13: until then it moved as often as asked, and a statement moved a day on
 * each morning never came, nor its due date, its interest or its report (found by the review of that day). Read that
 * day: Chase lets a holder not in default change the due date as often as they like, and some issuers once in 90 days
 * (NerdWallet, Quicken Loans; Doctor of Credit on statement dates), so once a cycle sits between them. A day moved
 * later each cycle still stretches each cycle it's moved in, as an issuer's own first cycle on a new date does.
 */
export function statementDayRefusal(person: Person, card: Account): string | undefined {
  const state = person.credit ? stateOf(person, card) : undefined;
  if (state?.dayMovedAt !== undefined && state.dayMovedAt > (state.statementAt ?? card.openedAt)) return 'You’ve moved the statement day since the last statement. You can move it again once the next statement comes.';
  return undefined;
}

export function scheduleStatement(sim: Simulation, person: Person, after: Instant, card = cardOf(sim, person)): void {
  const zone = zoneOf(sim, person);
  const p = zonedParts(after, zone);
  const day = statementDayOf(person, card);
  let at = instantFromZoned({ year: p.year, month: p.month, day, hour: 9 }, zone);
  if (at <= after) at = instantFromZoned({ year: p.month === 12 ? p.year + 1 : p.year, month: p.month === 12 ? 1 : p.month + 1, day, hour: 9 }, zone);
  sim.schedule({ at, kind: STATEMENT_KIND, label: 'Card Statement', category: 'home', priority: 36, payload: { personId: person.id, ...(card ? { accountId: card.id } : {}) } });
}

/**
 * The payment due, at noon: so many days after the statement where the bank
 * says, else the 15th of the month after it. The day past the month’s end is
 * put on its real date first (`normalDate`): until 2026-10-13 it went to
 * `instantFromZoned` as the 41st, which takes such a reading a minute late, so
 * every due date that crossed a month (Chase’s 21 days from the 20th) came at
 * 12:01 PM, and a payment made in the minute after noon counted on time; found
 * by that day’s third round of defects.
 */
/**
 * A US card's due day for a statement on a day of the month, and whether it falls in the next month: one day each month
 * (Reg Z §1026.7(b)(11)(i)(A)), at least 21 days after the statement (§1026.5(b)(2)(ii)), from 2026-10-22 (brief 21).
 * A bank's days kept after a statement on that day in every month, February the shortest: Chase's 21 after the 20th
 * the 13th. A card whose days weren't found keeps the 15th of the next month, later where that's under the law's 21
 * days in February (a statement after the 22nd): Citi's and Capital One's. Until then theirs was the 15th whatever the
 * statement's day, 18 days after a statement on 28 January.
 */
export function usDueDay(statementDay: number, graceDays?: number): { day: number; next: boolean } {
  if (graceDays === undefined) return { day: Math.max(15, statementDay + 21 - 28), next: true };
  return statementDay + graceDays <= 28 ? { day: statementDay + graceDays, next: false } : { day: statementDay + graceDays - 28, next: true };
}

export function dueAt(zone: string, statementAt: Instant, graceDays?: number, sameDay = false): Instant {
  const p = zonedParts(statementAt, zone);
  const next = { year: p.month === 12 ? p.year + 1 : p.year, month: p.month === 12 ? 1 : p.month + 1 };
  // A US card's due date is one day each month (`usDueDay`), from 2026-10-22 (brief 21). Until then the statement plus
  // the bank's days, so Chase's fell on the 10th, 11th or 13th by the month.
  if (sameDay) {
    const due = usDueDay(p.day, graceDays);
    return instantFromZoned({ ...(due.next ? next : { year: p.year, month: p.month }), day: due.day, hour: 12 }, zone);
  }
  return graceDays !== undefined
    ? instantFromZoned({ ...normalDate(p.year, p.month, p.day + graceDays), hour: 12 }, zone)
    : instantFromZoned({ ...next, day: 15, hour: 12 }, zone);
}

function scheduleDue(sim: Simulation, person: Person, statementAt: Instant, graceDays: number | undefined, card: Account): void {
  const at = dueAt(zoneOf(sim, person), statementAt, graceDays, usCard(card));
  // The statement it’s for (from 2026-10-13), which a due date after the next statement judges from `waiting`.
  sim.schedule({ at, kind: DUE_KIND, label: 'Card Payment Due', category: 'home', priority: 36, payload: { personId: person.id, accountId: card.id, statementAt } });
}

export function registerCredit(sim: Simulation): void {
  sim.onSchedule(STATEMENT_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId ?? s.universe.playerId)];
    const record = person?.credit;
    const card = person ? cardFor(s, person, item.payload.accountId) : undefined;
    if (!person || !record || !card) return;
    const credit = stateOf(person, card);
    // A statement whose due date hasn’t come yet is kept as it stood, for its due date to judge (`waiting`).
    for (const ahead of s.universe.scheduled) {
      if (ahead.kind !== DUE_KIND || ahead.status !== 'pending' || ahead.payload.personId !== person.id || ahead.payload.accountId !== card.id || typeof ahead.payload.statementAt !== 'number') continue;
      const { due, minimum } = autopayAsk(s, person, card);
      const want = credit.hardship ? due : credit.autopay === 'full' ? credit.statementBalance : minimum;
      credit.waiting = [...(credit.waiting ?? []).filter((w) => w.at !== ahead.payload.statementAt), { at: ahead.payload.statementAt, statement: credit.statementBalance, due, want, paid: credit.paidSinceStatement }];
    }
    credit.statementAt = s.now;
    (credit.cuts ??= []).push(s.now);
    if (credit.cuts.length > 60) credit.cuts.splice(0, credit.cuts.length - 60);
    // Repriced from the record by the bank's own terms, then the month's
    // interest if last month's statement was carried.
    const terms = cardTerms(s, card, record.score);
    // The interest built up day by day: charged where the grace period is lost
    // (the last statement wasn't paid in full), with any trailing interest
    // from a carried balance paid off; where it holds, it waits for the due date.
    const cashInterest = Math.round(credit.cashAccrued ?? 0);
    credit.cashAccrued = 0;
    if (cashInterest > 0) {
      s.post({ memo: 'Cash advance interest', category: 'interest', postings: [{ accountId: s.nominalAccount('expense', 'Card Interest').id, amount: cashInterest }, { accountId: card.id, amount: -cashInterest }] });
      credit.cashOwed = (credit.cashOwed ?? 0) + cashInterest;
    }
    // Each transfer's interest, a plan's month and fee, and the cycle's rewards (module 8).
    statementOffers(s, card, credit, terms);
    const interest = Math.round((credit.carrying ? credit.accrued ?? 0 : 0) + (credit.trailing ?? 0));
    if (credit.carrying) credit.accrued = 0;
    credit.trailing = 0;
    credit.statementInterest = 0;
    if (interest > 0) {
      credit.statementInterest = interest;
      s.post({
        memo: 'Interest', category: 'interest',
        postings: [{ accountId: s.nominalAccount('expense', 'Card Interest').id, amount: interest }, { accountId: card.id, amount: -interest }],
      });
    }
    // A credit balance left six months is sent back to a US holder (Reg Z §1026.11).
    if (card.balance > 0 && credit.creditSince !== undefined && s.now - credit.creditSince >= 182 * 86_400_000 && bankById(card.bankId ?? '')?.iso === 'US') refundCredit(s, person, card);
    // The yearly fee, on the statement in the month the card was opened.
    // Once in that month: a moved statement day can give the month two statements, and until 2026-10-10 both charged it.
    // In its first year a US card's fees, penalties aside, may not pass a
    // quarter of the limit it opened with (Reg Z §1026.52(a)).
    const firstYearUs = bankById(card.bankId ?? '')?.iso === 'US' && s.now - card.openedAt < 365 * 86_400_000;
    const annualFee = firstYearUs ? Math.min(terms.annualFee, Math.round((card.creditLimit ?? 0) * 0.25)) : terms.annualFee;
    if (annualFee > 0 && credit.closing === undefined && zonedParts(s.now, zoneOf(s, person)).month === zonedParts(card.openedAt, zoneOf(s, person)).month
      && (credit.feeAt === undefined || s.now - credit.feeAt > 60 * 86_400_000)) {
      credit.feeAt = s.now;
      s.post({
        memo: `Yearly fee: ${card.name}`, category: 'fees',
        postings: [{ accountId: s.nominalAccount('expense', 'Card Fees').id, amount: annualFee }, { accountId: card.id, amount: -annualFee }],
      });
    }
    // Over the limit for somebody who opted in: no fee. Until 2026-10-13 a card's over-limit fee was charged here, once a
    // cycle and three cycles in a row at most (Reg Z §1026.56(j)), but no card here publishes one, so only a test's card
    // ever charged it; found by that day's evidence check, and taken out.
    persistentDebt(s, person, card, credit);
    credit.statementBalance = Math.max(0, -card.balance);
    credit.paidSinceStatement = 0;
    delete credit.towardPastDue;
    // Every six months, a good record raises the limit, unless the holder asked it never to be raised unasked, by a fifth
    // or as far toward it as their income or savings carry (`limitCarried`, from 2026-10-21; until then a fifth whatever
    // they earned or held, so the limit grew without end).
    if (!credit.noAutoRaise && !credit.suspended && credit.closing === undefined && (credit.reviewedAt === undefined || s.now - credit.reviewedAt >= REVIEW_EVERY)) {
      credit.reviewedAt = s.now;
      const clean = !record.late.some((when) => s.now - when < 365 * 86_400_000);
      const was = card.creditLimit ?? 0;
      const raised = record.score >= RAISE_FROM && clean && was > 0 ? limitCarried(s, person, card, Math.round(was * 1.2 / 100) * 100) : was;
      if (raised > was) {
        card.creditLimit = raised;
        credit.raisedAt = s.now;
        if (person.id === s.universe.playerId) {
          // Its card and why, the review's own terms (from 2026-10-17, brief 14's editorial review): until then “It’s … now,
          // because your record has been clean.”, of no card named. From 2026-10-21 it says the income or savings too.
          s.notify({ category: 'bank', title: 'Your Card Limit Went Up', body: `The ${card.name}’s limit is ${formatMoney(card.creditLimit, saveCurrency(s.universe))} now, because your credit score is ${RAISE_FROM} or more, you haven’t paid late in the past year, and your income or savings cover the payments on it.`, importance: 40 });
        }
      }
    }
    // What this statement says, kept as it said it: on a hardship plan, the plan’s payment (`autopayAsk`), as the due date
    // judges it (from 2026-10-13: until then the card’s own minimum, about $48 on a plan whose due date judged $101; found
    // by that day’s guide audit).
    // With what of it is past due, which the statement says (from 2026-10-22, brief 21).
    const asks = credit.statementBalance > 0 ? autopayAsk(s, person, card) : undefined;
    (credit.issued ??= []).push({ at: s.now, minimum: asks?.due ?? 0, terms, plan: credit.hardship !== undefined, ...(asks?.pastDue ? { pastDue: asks.pastDue } : {}) });
    if (credit.issued.length > 60) credit.issued.splice(0, credit.issued.length - 60);
    if (credit.statementBalance > 0) scheduleDue(s, person, item.at, terms.graceDays, card);
    // Nothing owed: the month is reported now, paid as agreed, and a hardship plan paid off ends, as a due date met would
    // end it (from 2026-10-13: until then only a due date ended one, and a plan paid off before its statement left the
    // card suspended with nothing owed for good; found by the review of that day). The payments missed are behind it
    // too, and a suspension for them lifts, as a due date met puts them back to none: until later on 2026-10-13 only a
    // due date did, so a card paid off two payments behind stayed two behind for good, Home said so over $0 owed, and
    // the money worry was felt every day (found by that day’s third round of defects).
    else {
      reportMonth(s, person, ON_TIME);
      credit.missed = 0;
      if (credit.suspended === 'late') {
        delete credit.suspended;
        if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'Your Card Works Again', body: `The ${card.name} is paid off, and ${terms.issuer ?? 'the bank'} has lifted the suspension.`, importance: 50 });
      }
      if (credit.hardship && card.balance >= 0) { delete credit.hardship; if (credit.suspended === 'hardship' || credit.suspended === 'persistent') delete credit.suspended; }
    }
    // A card the holder closed is finished once nothing is owed on it, a credit on it sent back first (`closeCard`).
    if (credit.closing !== undefined && card.balance >= 0) {
      closeCard(s, person, card, 'statement');
      return;
    }
    statementReady(s, person, card, credit.statementBalance > 0
      // At least what the due date will judge: on a hardship plan its payment, not the card's minimum (from 2026-10-13).
      // With its due date (from 2026-10-17, brief 14's editorial review): until then “$270.00 to pay, at least $40.00.”, and
      // by when only on the card's panel.
      ? statementWords(s, person, card, item.at, terms.graceDays)
      : 'The card owes nothing this month.', credit.statementBalance > 0);
    scheduleStatement(s, person, item.at, card);
  });

  sim.onSchedule(DUE_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId ?? s.universe.playerId)];
    const record = person?.credit;
    const card = person ? cardFor(s, person, item.payload.accountId) : undefined;
    if (!person || !record || !card) return;
    const credit = stateOf(person, card);
    const currency = saveCurrency(s.universe);
    const terms = cardTerms(s, card, record.score);
    // Judged on its own statement: a newer one cut since leaves this one in `waiting` (from 2026-10-13).
    const waited = credit.waiting?.find((w) => w.at === item.payload.statementAt);
    if (waited) credit.waiting = credit.waiting!.filter((w) => w !== waited);
    if (credit.waiting?.length === 0) delete credit.waiting;
    const paidNow = () => waited?.paid ?? credit.paidSinceStatement;
    const statement = waited?.statement ?? credit.statementBalance;
    const { asked, due, minimum, pastDue } = waited ? { asked: Math.max(0, waited.want - waited.paid), due: waited.due, minimum: waited.due, pastDue: 0 } : autopayAsk(s, person, card);
    // Autopay asks the bank for the whole amount; a current account that
    // can't cover it sends it back, and the card charges for that (C59).
    if (asked > 0) {
      if (autopayReach(s, person, card) >= asked) {
        const got = payCard(s, person, asked, false, card);
        if (waited) waited.paid += got;
      }
      else {
        // One penalty fee for one event on a US card (Reg Z §1026.52(b)(2)(ii)): a bounce that leaves the minimum
        // unpaid is charged the late fee below, and not the returned payment's as well, as until 2026-10-10 it was.
        const lateToo = bankById(card.bankId ?? '')?.iso === 'US' && paidNow() < due;
        const returned = lateToo ? 0 : terms.returnedPaymentFee;
        if (returned > 0) s.post({ memo: 'Returned payment fee', category: 'fees', postings: [{ accountId: s.nominalAccount('expense', 'Card Fees').id, amount: returned }, { accountId: card.id, amount: -returned }] });
        // The card and the account it asked, and the next step where the payment is short (from brief 15, 2026-10-19:
        // until then "the current account"). No returned payment fee means a US card's late fee stands in for it
        // (`lateToo`): every card has one, its bank's or the estimate.
        if (person.id === s.universe.playerId) {
          const from = sourceOf(s, person, card);
          const short = paidNow() < due;
          // No step to the card where this miss is the one that charges it off (`afterMissed`): from 2026-10-20 (brief 17),
          // when the sixth miss's notices were first read in order, this one sent the player to pay a card that was closed
          // and its debt in collections by the time they read it.
          // A US card's charge-off comes by its days past due, not at the sixth (`delinquency`, from 2026-10-22).
          const last = short && !usCard(card) && (credit.missed ?? 0) + 1 >= CHARGE_OFF_AFTER;
          const after = returned > 0 ? `The card charged a ${formatMoney(returned, currency)} returned payment fee for it.` : 'The payment is late now, and its late fee is the only fee you’re charged for it.';
          s.notify({ category: 'bank', title: 'A Card Payment Bounced', body: `The ${card.name}’s autopay of ${formatMoney(asked, currency)} didn’t go through, because ${from?.name ?? 'your checking account'} couldn’t cover it. ${after}${short && !last ? ` Move money into ${from?.name ?? 'your checking account'}, then pay the card on Money, under Cards.` : ''}`, importance: 75 });
        }
      }
    }
    const paid = paidNow();
    // Paid in full: a card that wasn't carrying keeps its grace period and the
    // cycle's interest is dropped; one that was carrying regains it, and what
    // built up to today is charged on the next statement, as trailing interest.
    // Not paid in full: the grace period is lost, and it all stands (C48).
    const wasCarrying = credit.carrying;
    credit.carrying = paid < statement;
    if (!credit.carrying) {
      if (wasCarrying) credit.trailing = (credit.trailing ?? 0) + (credit.accrued ?? 0);
      credit.accrued = 0;
    }

    let move = 0;
    if (paid < due) {
      // A US late fee may not be more than the minimum it was late on (Reg Z §1026.52(b)(2)(i)(B)).
      // Or the bank's share of the minimum, the balance or what went unpaid, held to any cap the law sets.
      const byRule = terms.lateRule ? Math.min(lateFeeByRule(terms.lateRule, due, paid, statement), terms.capped?.lateFee ?? Number.POSITIVE_INFINITY) : undefined;
      // A first late fee lower than a repeat one, where the bank sets it so: until 2026-09-27 Citi's $29 was researched and never charged.
      const tiered = card.bankId ? FIRST_LATE_FEE[card.bankId] : undefined;
      const us = bankById(card.bankId ?? '')?.iso === 'US';
      const within = (tiered?.withinPeriods ?? (us ? US_SAFE_HARBOR.withinPeriods : 0)) * 31 * 86_400_000;
      const repeat = credit.lateFeeAt !== undefined && s.now - credit.lateFeeAt < within;
      let flat = tiered && !repeat ? Math.min(terms.lateFee, inSave(s, tiered.first, bankById(card.bankId!)!.currency)) : terms.lateFee;
      // Every US card held to the safe harbor: $30, or $41 for a repeat within six cycles.
      if (us) flat = Math.min(flat, inSave(s, repeat ? US_SAFE_HARBOR.repeat : US_SAFE_HARBOR.first, 'USD'));
      const fee = byRule ?? (us ? Math.min(flat, due) : flat);
      credit.lateFeeAt = s.now;
      s.post({
        memo: 'Late fee', category: 'fees',
        postings: [{ accountId: s.nominalAccount('expense', 'Card Fees').id, amount: fee }, { accountId: card.id, amount: -fee }],
      });
      credit.missed = (credit.missed ?? 0) + 1;
      // A US card's minimum short is kept by its due date, for its days past due (`US_LATE`, from 2026-10-22).
      // What's short of this statement's own minimum, past what went to the older ones (`towardPastDue`).
      const ownShort = (credit.hardship || waited ? due : minimum) - (paid - (credit.towardPastDue ?? 0));
      if (usCard(card) && ownShort > 0) credit.pastDue = [...(credit.pastDue ?? []), { at: item.at, short: ownShort }];
      // A US lender reports a payment late to the bureaus once it's thirty
      // days past due, at the next due date still short; elsewhere the month's
      // report carries it. Until 2026-09-27 a US payment a day short was on
      // the record at once. On the record, the lender cuts the line too,
      // never under what's owed on it.
      const reported = bankById(card.bankId ?? '')?.iso !== 'US' || credit.missed >= 2;
      if (reported) {
        record.late = [...record.late.filter((when) => s.now - when < 365 * 86_400_000), s.now];
        move -= 50;
        (record.marks ??= []).push({ at: s.now, points: 50, country: CITIES.get(person.currentLocationId)?.countryId ?? '' });
        const cut = Math.max(Math.max(0, -card.balance), Math.round((card.creditLimit ?? 0) * 0.7 / 100) * 100);
        if (cut < (card.creditLimit ?? 0)) card.creditLimit = cut;
      }
      // Which due date it was, and what the next miss does (from 2026-10-20, brief 17, section 8). Until then the notice
      // named no date, so a second month's late fee said word for word what the first had said, and an unread first was
      // brought up to the day in its place (`Simulation.notify`): a player who hadn't read it saw one late fee for two. And
      // the suspension the next miss brings (`afterMissed`, `SUSPEND_AFTER`) was said only once it had come. At the miss that
      // charges the card off it sends nobody to the card, which is closed by then; the charge-off's notice says where to pay.
      const suspends = !credit.suspended && credit.missed === SUSPEND_AFTER - 1 ? `${bankById(card.bankId ?? '')?.name ?? 'the bank'} suspends the card` : '';
      s.notify({
        category: 'bank',
        title: 'A Late Card Payment',
        body: `${credit.hardship ? 'The plan’s payment' : 'The minimum payment'} on the ${card.name}, ${formatMoney(due, currency)},${pastDue > 0 ? ` ${formatMoney(pastDue, currency)} of it past due,` : ''} was due ${formatDate(item.at, zoneOf(s, person))}, and ${paid > 0 ? `only ${formatMoney(paid, currency)} was paid` : 'nothing was paid'}. That costs a ${formatMoney(fee, currency)} late fee${reported
          ? `, and it’s on your credit record now.${suspends ? ` If the next payment is short too, ${suspends}.` : ''}`
          : `. If the payment is still short at the next due date, thirty days late, it goes on your credit record${suspends ? ` and ${suspends}` : ''}.`}${credit.missed >= CHARGE_OFF_AFTER && !usCard(card) ? '' : ' Pay the card on Money, under Cards.'}`,
        importance: 80,
      });
      if (credit.penalty) credit.penalty.onTime = 0;
      if (bankById(card.bankId ?? '')?.iso === 'GB') credit.recentFees = [...(credit.recentFees ?? []).filter((one) => s.now - one.at < 28 * 86_400_000), { at: s.now, amount: fee }];
      afterMissed(s, person, card, credit, due - paid);
      // A card whose terms end its offer at one missed minimum, at once. A US card's penalty rate and the end of its
      // introductory rate come by its days past due (`delinquency`, from 2026-10-22): until then at the second missed due
      // date, about 30 days late, where Reg Z §1026.55(b)(4) says more than 60.
      if (card.bankId && INTRO_ENDS_ON_MISS.has(card.bankId)) credit.introLost = true;
      // Two missed minimums in twelve months on a Canadian card with a penalty rate: it rises at once (`CANADA_PENALTY`).
      const recentMisses = record.late.filter((when) => s.now - when < 365 * 86_400_000).length;
      if (recentMisses >= 2 && !credit.penalty && card.bankId && CANADA_PENALTY[card.bankId] && !card.closedAt) {
        credit.penalty = { noticeAt: s.now, from: s.now, onTime: 0 };
        if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'A Penalty Rate', body: `You’ve missed two minimum payments in twelve months. From today, the ${card.name} charges ${(CANADA_PENALTY[card.bankId]!.apr * 100).toFixed(2)}% on purchases, until you make twelve payments on time in a row.`, importance: 85 });
      }
    } else {
      move += ON_TIME;
      credit.missed = 0;
      // Current again: nothing is past due (`pastDue`).
      delete credit.pastDue;
      delete credit.towardPastDue;
      // Six on time in a row after the penalty began, and it comes off (Reg Z §1026.55(b)(4)(ii)).
      if (credit.penalty && s.now >= credit.penalty.from) {
        credit.penalty.onTime += 1;
        const needed = card.bankId && CANADA_PENALTY[card.bankId] ? CANADA_PENALTY_ON_TIME : 6;
        if (credit.penalty.onTime >= needed) {
          delete credit.penalty;
          if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'The Penalty Rate Is Off', body: `${needed === 6 ? 'Six' : 'Twelve'} payments on time. The ${card.name} is back to ${((card.apr ?? terms.priced) * 100).toFixed(2)}%.`, importance: 50 });
        }
      }
      if (credit.suspended === 'late') {
        delete credit.suspended;
        if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'Your Card Works Again', body: `Your payments on the ${card.name} are back on time, and ${terms.issuer ?? 'the bank'} has lifted the suspension.`, importance: 50 });
      }
      if (credit.hardship && card.balance >= 0) {
        delete credit.hardship;
        if (credit.suspended === 'hardship' || credit.suspended === 'persistent') delete credit.suspended;
      }
    }
    reportMonth(s, person, move);
  });

  // Each day: interest builds on what the card owes that day, the interest
  // before it included (daily compounding, C50), apart from a British card's
  // default fees in their first 28 days (C64). Whether it's charged is
  // settled at the statement and the due date (C48). Until 2026-09-26 a
  // month's interest was charged in one sum at the statement, on that day's
  // balance, and only after a statement had gone unpaid.
  sim.onEvent('world.day_rollover', 'credit.no_card', (_event, { sim: s }) => {
    if (zonedParts(s.now, s.homeZone).day !== 1) return;
    for (const person of Object.values(s.universe.people)) reportWithoutCard(s, person);
  });

  // A US card's days past due, each day (from 2026-10-22, the owner's brief 21): counted from the due date of the oldest
  // minimum still short, so a time jump, a save and a load, or a payment between due dates is read as the calendar has
  // it, not by due dates (`US_LATE`).
  sim.onEvent('world.day_rollover', 'credit.delinquency', (_event, { sim: s }) => {
    for (const person of Object.values(s.universe.people)) if (person.credit) for (const card of cardsOf(s, person)) delinquency(s, person, card);
  });

  sim.onEvent('world.day_rollover', 'card.interest', (_event, { sim: s }) => {
    for (const person of Object.values(s.universe.people)) {
      if (!person.credit) continue;
      ensurePrimary(s, person);
      for (const card of cardsOf(s, person)) {
      const credit = stateOf(person, card);
      // The credit balance's age, for the US refund.
      if (card.balance > 0) credit.creditSince ??= s.now; else delete credit.creditSince;
      // Held credit comes back on its day.
      if (credit.paymentHolds) { credit.paymentHolds = credit.paymentHolds.filter((one) => one.until > s.now); if (!credit.paymentHolds.length) delete credit.paymentHolds; }
      if (credit.hardship || card.balance >= 0) continue;
      const terms = cardTerms(s, card, person.credit.score);
      const freeFees = bankById(card.bankId ?? '')?.iso === 'GB'
        ? (credit.recentFees ?? []).filter((one) => s.now - one.at < 28 * 86_400_000).reduce((a, one) => a + one.amount, 0)
        : 0;
      // Cash advances draw their own rate from the day they're taken, grace period or none (C49).
      const cash = cashOwedOn(person, card);
      if (cash > 0) credit.cashAccrued = (credit.cashAccrued ?? 0) + (cash + (credit.cashAccrued ?? 0)) * terms.cashApr / 365;
      // Transfers draw their own rates from the day they're made; a plan draws a fee, not interest.
      for (const one of credit.transfers ?? []) {
        if (one.owed > 0) one.accrued += (one.owed + one.accrued) * transferRate(s, credit, one) / 365;
      }
      const bearing = Math.max(0, -card.balance - cash - transfersOwedOn(person, card) - planLeftOf(credit) - freeFees) + (credit.accrued ?? 0);
      credit.accrued = (credit.accrued ?? 0) + bearing * terms.apr / 365;
      }
    }
  });

  sim.onCommand<{ accountId?: string }, { refunded: Money }>('card.refund_credit', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p?.accountId);
    if (!card || card.balance <= 0) throw new CommandError('The card holds no credit to send back.');
    return { refunded: refundCredit(s, person, card) };
  });

  sim.onCommand<{ amount: 'full' | 'minimum' | number; accountId?: string }, { paid: Money }>('finance.pay_card', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p.accountId);
    if (!card || !person.credit) throw new CommandError('You don’t have a card.');
    const owed = Math.max(0, -card.balance);
    if (owed === 0 && typeof p.amount !== 'number') throw new CommandError('You don’t owe anything on it.');
    const state = stateOf(person, card);
    // The minimum is what the due date judges: on a hardship plan, the plan’s payment, never more than the statement (from
    // 2026-10-13: until then the card’s own, about $48 on a $101 plan, which left the plan’s payment short at its due date;
    // found by that day’s guide audit).
    const want = p.amount === 'full' ? owed
      : p.amount === 'minimum' ? state.hardship ? Math.min(state.statementBalance ?? owed, state.hardship.payment) : minimumDue(s, state.statementBalance ?? owed, cardTerms(s, card, person.credit.score), state.statementInterest ?? 0, state.statementPlanDue ?? 0)
        : Math.round(Number(p.amount));
    if (!(want > 0)) throw new CommandError('Enter an amount to pay.');
    const paid = payCard(s, person, want, true, card);
    if (paid === 0) throw new CommandError('Your bank accounts have nothing available to pay it with, so nothing was paid.');
    return { paid };
  });

  sim.onCommand<{ mode: 'minimum' | 'full'; accountId?: string }, { mode: string }>('finance.set_autopay', (p, { sim: s }) => {
    if (p.mode !== 'minimum' && p.mode !== 'full') throw new CommandError('Autopay pays the minimum or the whole statement.');
    if (!s.player.credit) throw new CommandError('You don’t have a card.');
    const card = cardFor(s, s.player, p.accountId);
    const terms = card ? cardTerms(s, card, s.player.credit.score) : undefined;
    if (terms?.kind === 'charge' && p.mode === 'minimum') {
      throw new CommandError(`${terms.issuer ?? 'The bank'} takes the whole statement from your account each month. The ${terms.name} can’t carry a balance.`);
    }
    (card ? stateOf(s.player, card) : s.player.credit).autopay = p.mode;
    return { mode: p.mode };
  });

  sim.onCommand<{ accountId: string }, { everyday: string }>('card.set_everyday', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p.accountId);
    if (!card || !person.credit || !p.accountId) throw new CommandError('You don’t hold that card.');
    // A card being closed takes nothing new (from 2026-10-13: until then only the screen hid it).
    if (stateOf(person, card).closing !== undefined) throw new CommandError('That card is being closed, so nothing new can go on it.');
    makeEveryday(person, card);
    return { everyday: card.id };
  });
}

/** A month paid as agreed. */
const ON_TIME = 3;

/**
 * A month on the record with no card open: SLATE's estimate. The bureaus
 * score every month from the whole file, and a closed card, a charge-off
 * or collections stay on it; with no card reporting there is no payment
 * history to build on, but negatives age. So the score climbs `aging` a
 * month while nothing is owed in collections and no payment has been late
 * in a year, and a thin file stops at `ceiling`.
 * Until 2026-09-27 the score moved only at a card's statement, and after a
 * charge-off, or a card closed, it never moved again.
 */
export const NO_CARD = { aging: 2, ceiling: 680 } as const;

/** The 1st of the month's report for somebody with no card open. */
export function reportWithoutCard(sim: Simulation, person: Person): void {
  const credit = person.credit;
  if (!credit || cardOf(sim, person)) return;
  const inCollections = Object.values(sim.universe.accounts).some((a) => a.ownerId === person.id && !a.closedAt && a.category === 'collections' && a.balance < 0);
  const lateThisYear = credit.late.some((at) => sim.now - at < 365 * 86_400_000);
  if (inCollections || lateThisYear || credit.score >= NO_CARD.ceiling) return;
  credit.score = Math.min(NO_CARD.ceiling, credit.score + NO_CARD.aging);
}

/** A card's credit balance sent back to the current account (C23). */
function refundCredit(sim: Simulation, person: Person, card: Account): Money {
  const credit = Math.max(0, card.balance);
  const current = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
  if (credit <= 0 || !current) return 0;
  sim.post({ memo: `Credit refunded from ${card.name}`, category: 'transfer', postings: [{ accountId: card.id, amount: -credit }, { accountId: current.id, amount: credit }] });
  if (person.credit) delete stateOf(person, card).creditSince;
  return credit;
}

/**
 * Closes a card now, a credit balance it holds sent back to the current account first (`refundCredit`), as a bank refunds
 * one when it closes a card. Close The Card with nothing owed and a cancellation in its cooling-off period close through
 * here at once (`'now'`), and the statement once a card being closed is paid off (`'statement'`, which says so as it
 * always has). From 2026-10-24 (brief 26's money trace): until then each set `closedAt` itself, and a credit on the card
 * stayed in the closed account, which `cardsOf` and `cardFor` no longer read, so Send The Credit To My Account refused
 * it, Money's cash and net worth were down by it, and nothing could reach it again. Measured before the fix on a Chase
 * card: $500.00 paid over what was owed, Close The Card pressed, the card closed with the $500.00 still on it.
 */
export function closeCard(sim: Simulation, person: Person, card: Account, how: 'now' | 'statement'): void {
  const credit = card.balance > 0 ? refundCredit(sim, person, card) : 0;
  card.closedAt = sim.now;
  ensurePrimary(sim, person);
  if (person.id !== sim.universe.playerId || (how === 'now' && credit <= 0)) return;
  const into = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
  const back = credit > 0 && into ? `, and the ${formatMoney(credit, saveCurrency(sim.universe))} it held as a credit went back to your ${into.name}` : '';
  sim.notify({ category: 'bank', title: 'Card Closed', body: `The ${card.name} is ${how === 'statement' ? 'paid off and ' : ''}closed${back}.`, importance: 40 });
}

/**
 * The account a card's autopay pays from: the one it was set up on (from 2026-10-10; a card from before is pinned to
 * the primary account the first time it's asked). Until then it was whichever account was primary on the due date.
 */
export function autopaySource(sim: Simulation, person: Person, card: Account): Account | undefined {
  const state = stateOf(person, card);
  if (state.autopayFrom === undefined && person.primaryAccountId) state.autopayFrom = person.primaryAccountId;
  return state.autopayFrom ? sim.universe.accounts[state.autopayFrom] : undefined;
}

/**
 * The account a card's autopay pays from, read without pinning it there (`autopaySource` pins an unpinned autopay to the
 * primary account, which a notice mustn't do: autopay follows the primary until something pins it).
 */
function sourceOf(sim: Simulation, person: Person, card: Account): Account | undefined {
  const id = stateOf(person, card).autopayFrom ?? person.primaryAccountId;
  return id ? sim.universe.accounts[id] : undefined;
}

/** A count under ten in words, as prose writes it, and a figure from ten. */
const countWord = (n: number): string => ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'][n] ?? String(n);

/**
 * The statement notice when something is owed (from brief 15, 2026-10-19): the statement, its due date, the least it asks
 * and what autopay will take, from which account, that day. Until then "At least … has to be paid by then.", and nothing
 * of autopay, which always pays something (the minimum or the whole statement) where the account can cover it.
 */
function statementWords(sim: Simulation, person: Person, card: Account, statementAt: Instant, graceDays: number | undefined): string {
  const cur = saveCurrency(sim.universe);
  const zone = zoneOf(sim, person);
  const credit = stateOf(person, card);
  const owed = credit.statementBalance;
  const { asked, due, pastDue } = autopayAsk(sim, person, card);
  const from = sourceOf(sim, person, card);
  const least = due >= owed ? `The whole ${formatMoney(owed, cur)} is due` : `${credit.hardship ? 'The plan’s payment' : 'The minimum payment'} is ${formatMoney(due, cur)}${pastDue > 0 ? `, ${formatMoney(pastDue, cur)} of it past due` : ''}`;
  const autopay = asked > 0 && from && !from.closedAt ? ` Autopay pays ${asked >= owed && asked > due ? `the whole ${formatMoney(owed, cur)}` : formatMoney(asked, cur)} from ${from.name} that day, if there’s enough in it.` : '';
  // What this due date decides, where the last was missed (from 2026-10-20, brief 17, section 8): the second miss in a row
  // suspends the card and goes on the record (`SUSPEND_AFTER`, the due date's `reported`), and a suspended card works again
  // once a due date's minimum is paid. Until then the statement between a late payment and the next said neither.
  const us = bankById(card.bankId ?? '')?.iso === 'US';
  const stake = credit.suspended === 'late'
    ? ` The card works again if at least ${formatMoney(due, cur)} is paid by then.`
    : !credit.suspended && credit.missed === SUSPEND_AFTER - 1
      ? ` The last payment was missed. If this one is short too, ${bankById(card.bankId ?? '')?.name ?? 'the bank'} suspends the card, and it goes on your credit record${us ? '' : ' again'}.`
      : '';
  return `The statement comes to ${formatMoney(owed, cur)}, due ${formatDate(dueAt(zone, statementAt, graceDays, us), zone)}. ${least}.${autopay}${stake}`;
}

/**
 * What a card's autopay will ask its account for on the due date, and the minimum due: a charge card's minimum is the
 * whole statement, and a hardship plan's payment stands in for both (from 2026-10-10 a function of its own, which the
 * account alerts read ahead of the day, `systems/statements.ts`).
 */
export function autopayAsk(sim: Simulation, person: Person, card: Account): { asked: Money; due: Money; minimum: Money; pastDue: Money } {
  const credit = stateOf(person, card);
  const terms = cardTerms(sim, card, person.credit!.score);
  const statement = credit.statementBalance;
  const minimum = minimumDue(sim, statement, terms, credit.statementInterest ?? 0, credit.statementPlanDue ?? 0);
  const plan = credit.hardship ? Math.min(statement, credit.hardship.payment) : undefined;
  // A US card's minimum payment due takes in what's past due, as its statement says it (from 2026-10-22, brief 21): what
  // was short at the statement, paid toward since or not (`towardPastDue`, `pastDue`). A plan's payment stands in for it,
  // and met, brings the card current, as SLATE's plans did before (an assumption: the FFIEC's re-aging asks three
  // payments in a row, which SLATE doesn't count).
  const pastDue = plan === undefined && usCard(card) ? (credit.towardPastDue ?? 0) + (credit.pastDue ?? []).reduce((n, p) => n + p.short, 0) : 0;
  const owedNow = Math.min(statement, minimum + pastDue);
  const want = plan ?? (credit.autopay === 'full' ? statement : owedNow);
  return { asked: Math.max(0, want - credit.paidSinceStatement), due: plan ?? owedNow, minimum, pastDue };
}

function autopayReach(sim: Simulation, person: Person, card: Account): Money {
  const from = autopaySource(sim, person, card);
  if (!from || from.closedAt) return 0;
  // The link reaches savings at the autopay account's own bank, as `payCard` draws it (from 2026-10-12: until then only
  // where that account was the primary).
  return paymentsOf(person).linkSavings ? inTheBank(sim, person, from) : Math.max(0, from.balance);
}

/**
 * After a due date with less than the minimum paid: a British bank takes
 * what was missed from the holder's other accounts with it (C26); two in a
 * row and the card is suspended (C86); five and a default notice goes, as
 * the Consumer Credit Act's section 87 asks before a default; six, 180 days,
 * and the card is closed and what's owed is charged off to collections
 * (C12, C15).
 */
function afterMissed(sim: Simulation, person: Person, card: Account, credit: CardState, short: Money): void {
  const currency = saveCurrency(sim.universe);
  const bank = card.bankId ? bankById(card.bankId) : undefined;
  if (bank?.iso === 'GB' && short > 0) {
    const theirs = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && a.bankId === bank.id && (a.kind === 'checking' || a.kind === 'savings') && a.balance > 0);
    let left = short;
    const postings: { accountId: string; amount: Money }[] = [];
    for (const account of theirs) {
      const take = Math.min(left, account.balance);
      if (take <= 0) continue;
      postings.push({ accountId: account.id, amount: -take });
      left -= take;
    }
    const taken = short - left;
    if (taken > 0) {
      sim.post({ memo: `Set off against ${card.name}`, category: 'card-payment', postings: [...postings, { accountId: card.id, amount: taken }] });
      credit.paidSinceStatement += taken;
    }
  }
  const missed = credit.missed ?? 0;
  if (missed >= SUSPEND_AFTER && !credit.suspended) {
    credit.suspended = 'late';
    // What lifts it, as the due date and the statement lift it (from 2026-10-20, brief 17): until then “once you make a
    // payment on time”, which a payment of any size today could seem to be.
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: 'Your Card Is Suspended', body: `You’ve missed ${countWord(missed)} payments in a row, so ${bank?.name ?? 'the bank'} has suspended the ${card.name}. It works again once you pay at least the minimum by a due date, or pay the card off.`, importance: 85 });
  }
  // A US card's notice before a charge-off, and the charge-off, come by its days past due (`delinquency`, from
  // 2026-10-22): until then at the fifth and sixth due dates missed, as everywhere.
  if (usCard(card)) return;
  // The payments missed, where until 2026-10-20 (brief 17) it said “150 days behind” at the fifth, 120 days after the first.
  if (missed === CHARGE_OFF_AFTER - 1 && person.id === sim.universe.playerId) {
    sim.notify({ category: 'bank', title: 'A Default Notice', body: `You’ve missed ${countWord(missed)} payments in a row on the ${card.name}. Pay at least ${formatMoney(minimumDue(sim, Math.max(0, -card.balance), cardTerms(sim, card, person.credit!.score), credit.statementInterest ?? 0, credit.statementPlanDue ?? 0), currency)} before the next due date, or the whole balance falls due and goes to collections.`, importance: 95 });
  }
  if (missed >= CHARGE_OFF_AFTER) chargeOff(sim, person, card, credit);
}

/**
 * A US card's day past due (`US_LATE`, from 2026-10-22, the owner's brief 21): on the 61st day after the due date of
 * the oldest minimum still short, the notice (§1026.9(g)), and 45 days on the penalty rate, where the card's terms have
 * one, and the end of any introductory rate still running (§1026.55(b)(4)); on the 150th, the last notice; on the
 * 180th, the charge-off (FFIEC). A minimum paid by the 60th day, or a due date paid in full, ends it before any of
 * them; once the notice has gone it stands, as the regulation allows, and six minimums on time take the penalty rate
 * off (§1026.55(b)(4)(ii)). Each notice once for each due date it's about, so a save and a load or a long jump sends it
 * once.
 */
function delinquency(sim: Simulation, person: Person, card: Account): void {
  const credit = stateOf(person, card);
  // The introductory rate's end, on its day.
  if (credit.introEndsAt !== undefined && sim.now >= credit.introEndsAt) { credit.introLost = true; delete credit.introEndsAt; }
  const oldest = credit.pastDue?.[0];
  if (!oldest || card.closedAt || !usCard(card)) return;
  const zone = zoneOf(sim, person);
  const late = daysBetween(oldest.at, sim.now, zone);
  const terms = cardTerms(sim, card, person.credit!.score);
  const currency = saveCurrency(sim.universe);
  const due = formatDate(oldest.at, zone);
  if (late >= US_LATE.notice && credit.noticedFor !== oldest.at) {
    credit.noticedFor = oldest.at;
    const from = sim.now + US_LATE.noticeDays * MS_DAY;
    const penalty = terms.penaltyApr !== undefined && !credit.penalty;
    const intro = terms.introUntil !== undefined && sim.now < terms.introUntil && !credit.introLost && credit.introEndsAt === undefined;
    if (penalty) credit.penalty = { noticeAt: sim.now, from, onTime: 0 };
    if (intro) credit.introEndsAt = from;
    const what = [penalty ? `charges ${(terms.penaltyApr! * 100).toFixed(2)}% on what’s owed` : '', intro ? 'its introductory rate ends' : ''].filter(Boolean).join(', and ');
    if (what && person.id === sim.universe.playerId) {
      sim.notify({ category: 'bank', title: penalty ? 'A Penalty Rate Is Coming' : 'Your Introductory Rate Is Ending', body: `The ${card.name}’s minimum payment, due ${due}, is more than 60 days late. From ${formatDate(from, zone)}, the card ${what}.${penalty ? ' Six minimum payments on time in a row take the penalty rate off.' : ''}`, importance: 85 });
    }
  }
  if (late >= US_LATE.warn && credit.defaultNoticedFor !== oldest.at) {
    credit.defaultNoticedFor = oldest.at;
    const off = formatDate(oldest.at + US_LATE.chargeOff * MS_DAY, zone);
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: 'A Default Notice', body: `The ${card.name}’s minimum payment, due ${due}, is ${late} days late. Pay at least the ${formatMoney(oldest.short, currency)} of it still unpaid before ${off}, or the card is closed and what’s owed goes to collections.`, importance: 95 });
  }
  if (late >= US_LATE.chargeOff) chargeOff(sim, person, card, credit);
}

/** The card closed, and what's owed on it charged off to collections, owed to the bank. */
function chargeOff(sim: Simulation, person: Person, card: Account, credit: CardState): void {
  const owed = Math.max(0, -card.balance);
  const bank = card.bankId ? bankById(card.bankId) : undefined;
  const name = `Owed To ${bank?.name ?? card.institution ?? 'The Bank'}, In Collections`;
  const debt = Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && !a.closedAt && a.kind === 'loan' && a.category === 'collections' && a.institution === (bank?.name ?? card.institution))
    ?? sim.openAccount({ id: sim.nextId('account'), kind: 'loan', category: 'collections', name, ownerId: person.id, institution: bank?.name ?? card.institution, openedAt: sim.now });
  if (owed > 0) sim.post({ memo: `Charged off: ${card.name}`, category: 'transfer', postings: [{ accountId: card.id, amount: owed }, { accountId: debt.id, amount: -owed }] });
  card.closedAt = sim.now;
  credit.cashOwed = 0;
  credit.cashAccrued = 0;
  credit.transfers = [];
  credit.plans = [];
  markRecord(person, CHARGED_OFF, sim.now, person.currentLocationId, pesos(sim, owed));
  delete credit.suspended;
  delete credit.hardship;
  credit.missed = 0;
  delete credit.pastDue;
  delete credit.towardPastDue;
  ensurePrimary(sim, person);
  // How long the mark stays, paid or not, and what the unpaid debt blocks (from brief 15, 2026-10-19): until then “It’s on
  // your record.”, which the In Collections panel said lasted until the debt was paid, though nothing paying it touches
  // the record (`markRecord`, `marksFallOff`).
  const mark = person.credit?.marks?.at(-1);
  const years = mark ? markYears(mark) : undefined;
  if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: 'Your Card Was Charged Off', body: `The ${formatMoney(owed, saveCurrency(sim.universe))} you owed on the ${card.name} went to collections, and the card is closed. The charge-off stays on your credit record${years !== undefined ? ` for ${countWord(years)} ${years === 1 ? 'year' : 'years'}` : ''}, paid or not, and no bank approves a card while the debt is unpaid. You can pay it on Money, under Borrowing.`, importance: 95 });
}

/** What a charge-off costs the record: SLATE's estimate, heavier than an eviction's sixty. */
const CHARGED_OFF = 100;

/**
 * Britain's persistent debt (FCA CONC 6.7.27–6.7.40): eighteen months in
 * which more went to interest and fees than to paying the card down, and the
 * bank must write; thirty-six, and it must offer a way to pay it off in a
 * reasonable time and may suspend the card. SLATE's plan freezes the
 * interest and asks a forty-eighth of the balance a month, four years, the
 * longest the rules' examples run.
 */
function persistentDebt(sim: Simulation, person: Person, card: Account, credit: CardState): void {
  if (bankById(card.bankId ?? '')?.iso !== 'GB' || credit.hardship) return;
  const month = 30 * 86_400_000;
  const over = (months: number) => {
    const since = sim.now - months * month;
    if (card.openedAt > since) return false;
    let charges = 0;
    let paid = 0;
    for (const txn of sim.universe.transactions) {
      if (txn.at < since) continue;
      const on = txn.postings.filter((p) => p.accountId === card.id).reduce((a, p) => a + p.amount, 0);
      if (on === 0) continue;
      if (txn.category === 'interest' || txn.category === 'fees') charges += -on;
      else if (on > 0) paid += on;
    }
    return charges > 0 && charges > paid - charges;
  };
  if (over(36)) {
    const owed = Math.max(0, -card.balance);
    credit.hardship = { payment: Math.ceil(owed / 48 / 100) * 100, since: sim.now };
    credit.suspended = 'persistent';
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: 'A Plan To Clear The Card', body: `For three years, more of what you paid went to interest and fees than to the balance. The bank has frozen the interest, set a payment of ${formatMoney(credit.hardship.payment, saveCurrency(sim.universe))} a month to clear it in four years, and suspended the card.`, importance: 80 });
  } else if (over(18) && (credit.persistentNoticeAt === undefined || sim.now - credit.persistentNoticeAt > 365 * 86_400_000)) {
    credit.persistentNoticeAt = sim.now;
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: 'Persistent Debt', body: `Over eighteen months, more of what you paid the ${card.name} went to interest and fees than to the balance. Paying more than the minimum would clear it sooner. If you can’t, press Ask For Help With Payments on the card.`, importance: 60 });
  }
}

/**
 * A card's month on the record: how it was paid, and how much of all the
 * cards is used, as a bureau reads utilization across every revolving
 * account. Each card reports its own month: a late payment on any of them
 * is the whole mark, and a month paid as agreed, and what's used, count once
 * however many cards report them, each card a share (the record holds the
 * share's fraction, and a screen shows the score whole);
 * until 2026-09-28 one card was all there was. Rent owed to a
 * private landlord isn't reported to the bureaus; an eviction or a debt sent
 * to collections is. Until 2026-09-27 rent owed cost ten points every month
 * it stood.
 */
function reportMonth(sim: Simulation, person: Person, paid: number): void {
  const record = person.credit;
  if (!record) return;
  const cards = cardsOf(sim, person);
  const limit = cards.reduce((sum, c) => sum + (c.creditLimit ?? 0), 0);
  const owed = cards.reduce((sum, c) => sum + Math.max(0, -c.balance), 0);
  const used = limit > 0 ? owed / limit : 0;
  const share = Math.max(1, cards.length);
  let move = paid < 0 ? paid : paid / share;
  if (used > 0.3) move -= Math.round((used - 0.3) * 20) / share;
  record.score = Math.max(SCORE_MIN, Math.min(SCORE_MAX, record.score + move));
}

/**
 * Somebody this comfortable with risk carries a card balance rather than clear
 * it: their autopay starts on the minimum. Risk tolerance is, in the first
 * place, willingness to carry financial risk; the slider was read by nothing
 * until the card, and the player can change the autopay whenever they like.
 * Exported from 2026-10-13, for the Profile’s line on what it did; until then the Profile kept a 65 of its own.
 */
export const CARRIES_A_BALANCE = 65;

/** Opens their record at a score, with the first statement on the calendar. */
export function openCredit(sim: Simulation, person: Person, score: number): void {
  const autopay = (person.personality?.riskTolerance ?? 50) > CARRIES_A_BALANCE ? 'minimum' : 'full';
  person.credit = {
    score, late: [], autopay, statementBalance: 0, paidSinceStatement: 0, reviewedAt: sim.now,
    // A balance brought in from before is one the last statement didn't clear.
    carrying: (cardOf(sim, person)?.balance ?? 0) < 0,
  };
  const card = cardOf(sim, person);
  if (card) {
    person.credit.primaryId = card.id;
    const terms = cardTerms(sim, { ...card, apr: undefined }, score);
    // The rate the record bought, held from here on.
    card.apr = terms.priced;
    // A charge card is paid in full; nobody's autopay can say otherwise.
    if (terms.kind === 'charge') person.credit.autopay = 'full';
  }
  scheduleStatement(sim, person, sim.now);
}

/** A statement ahead for each card of everybody with a record, where none is: one naming the card, or, the everyday card, one from before cards were named. */
export function armCredit(sim: Simulation): void {
  for (const person of Object.values(sim.universe.people)) {
    if (!person.credit) continue;
    ensurePrimary(sim, person);
    const primary = cardOf(sim, person);
    for (const card of cardsOf(sim, person)) {
      const due = sim.universe.scheduled.some((one) => one.kind === STATEMENT_KIND && one.status === 'pending'
        && one.payload.personId === person.id && (one.payload.accountId === card.id || (one.payload.accountId === undefined && card.id === primary?.id)));
      if (!due) scheduleStatement(sim, person, sim.now, card);
    }
  }
}
