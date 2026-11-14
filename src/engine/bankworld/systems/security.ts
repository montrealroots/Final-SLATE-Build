/**
 * SLATE — the card in the hand: locked, lost, stolen, expiring, and used by
 * somebody else (module 6 of `docs/BANKING-FUNCTIONS.md`), from each bank's
 * own terms and each country's law (`content/security.ts`).
 *
 * - **Lock and unlock** (A142, C84): nothing new goes on a locked card; the
 *   bills already on it still go through, as Chase, Citi, Wells Fargo and
 *   Scotiabank say theirs do.
 * - **Report it lost, stolen or damaged** (A143, C85, A115, C66): stopped at
 *   once, and a new card with a new number follows in the bank's days, for
 *   its fee where it lists one, faster where the bank lists a rush fee or
 *   rush days. A bank that lists no fee is taken to charge none, and the
 *   screen says so. Until 2026-10-13 a rush came only where the bank listed a
 *   rush fee, so Wells Fargo’s day and Capital One’s three, listed with no
 *   fee, were refused; found by that day’s second round of evidence. Capital
 *   One’s is sent free: its page names none, and its 360 Checking fee schedule,
 *   which lists cashier’s checks, wires and checkbooks, has no fee for a card
 *   (capitalone.com, read 2026-10-13). Wells Fargo’s was sent free too, until
 *   later that day: its rush is a credit card’s, for a fee it doesn’t publish,
 *   and none is sent (`rushUnpublished`).
 * - **The bills on a replaced card** (A85): where the bank passes the new
 *   number on, they go on; where it doesn't, or doesn't say, they're
 *   declined until the holder gives it to them.
 * - **Expiry** (A144, C88): a new card with the same number a month before,
 *   at the bank's years where it says, SLATE's estimate of four where not.
 * - **A new account number** (A25), where the bank moves a compromised
 *   account itself (Bank of America, Citi, Capital One, ANZ).
 * - **Somebody else's use** (A120, A121, A122, A148, C69, C72, C96): on a
 *   day chosen by the country's official yearly rate (`bank.fraud`), the
 *   size of the country's average case; the bank stops the share its
 *   country's banks stop, blocks the card and asks, and a new one follows
 *   free. The rest goes through, and is found by an alert or on the
 *   statement. Reported, the law sets what the holder carries (the US's
 *   $50, $500 or everything by how fast; Europe's €50; Britain's £35;
 *   Australia's $150) and how fast the rest comes back. Unreported past the
 *   law's days, it's the holder's. Japan and Korea have no official rate,
 *   so nobody there meets it.
 *
 * The draw is in this file and is `bank.fraud`'s (`src/engine/decided.ts`).
 */

import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account, Plastic } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { dateKey, formatDate, instantFromZoned, zonedParts, MS_DAY, type Instant } from '../core/time';
import { exchange } from '../content/currency';
import { bankById } from '../content/banks';
import { afterBusinessDays, businessDaysBetween, daysOfAccount } from '../content/bankdays';
import { FRAUD_LAW, SECURITY, type DebitTier } from '../content/security';
import { cardFor, cardOf } from './credit';
import { accountNumber } from './banknumber';
import { alertsOf } from './statements';

export type Which = 'debit' | 'credit';

/** Years a card is valid where the bank doesn't say: SLATE's estimate, the middle of the three to five Visa's and Mastercard's issuers use. */
export const ESTIMATE_YEARS = 4;
/** Business days a replacement takes where the bank doesn't say, and a rush one: SLATE's estimate. */
export const ESTIMATE_DAYS = 7;
export const ESTIMATE_RUSH_DAYS = 3;
/** Business days a refund takes where the law names none: SLATE's estimate, the US's ten. */
export const ESTIMATE_REFUND_DAYS = 10;
export const REPLACED_KIND = 'card.replaced';

/**
 * An account number known to whoever used the debit card drawn on it (from 2026-10-10): at a bank that moves a
 * compromised account to a new number (`newNumberOnFraud`), a debit card used by somebody else leaves the account's
 * number exposed for a year (SLATE's estimate of how long it's tried). Each day, an attempt on it at the yearly rate
 * of a victim's further incidents, 21% (BJS, Victims of Identity Theft 2014, NCJ 248991: victims with more than one
 * incident in the year, of any kind; no figure for a bank account alone was found, and this is the only one). Tried
 * on the number still in use, it goes through as an electronic debit, disputable under the country's law (Regulation
 * E's $0 within 60 days of the statement for a transfer made without a card, 12 CFR 1005.6(b)(3)); tried on a number
 * the account has moved from, it's declined. A card's own fraud is the separate draw it always was.
 */
export const EXPOSURE = { yearlyAttempt: 0.21, days: 365 } as const;
export const REFUND_KIND = 'bank.fraud_refund';


function currentOf(sim: Simulation, person: Person): Account | undefined {
  const account = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
  return account && !account.closedAt ? account : undefined;
}

/**
 * The account a card draws on: for a debit card the current account named, any of theirs at any bank (from 2026-10-10:
 * until then the primary one only, and a second bank's card couldn't be locked or reported), or the primary one; the
 * card's own for a credit card, the everyday one where none is named.
 */
export function cardAccount(sim: Simulation, person: Person, which: Which, accountId?: string): Account | undefined {
  if (which !== 'debit') return cardFor(sim, person, accountId);
  const named = accountId ? sim.universe.accounts[accountId] : undefined;
  if (named && named.ownerId === person.id && named.kind === 'checking' && !named.closedAt) return named;
  return currentOf(sim, person);
}

function yearsFor(account: Account, which: Which): number {
  const rules = account.bankId ? SECURITY[account.bankId] : undefined;
  return (which === 'credit' ? rules?.cardYearsCredit ?? rules?.cardYears : rules?.cardYears) ?? ESTIMATE_YEARS;
}

/** The card itself, made the first time it's asked for: its last four, and an expiry its years from opening, the next still to come. */
export function plasticOf(sim: Simulation, account: Account, which: Which): Plastic {
  account.plastic ??= plasticView(sim, account, which);
  return account.plastic;
}

/** The card as it stands, or as it would be made, without making it: for the screen. */
export function plasticView(sim: Simulation, account: Account, which: Which): Plastic {
  if (account.plastic) return account.plastic;
  const years = yearsFor(account, which) * 365.25 * MS_DAY;
  let expiresAt = account.openedAt + years;
  while (expiresAt <= sim.now) expiresAt += years;
  return { last4: account.last4 ?? last4For(account.id), expiresAt, issued: 1 };
}

/** Whether a card can be used for something new: unlocked and not stopped. A bill already on it was asked about too, until 2026-10-09. */
export function cardWorks(account: Account | undefined): boolean {
  const p = account?.plastic;
  if (!account || p?.stopped) return false;
  return !p?.locked;
}

/**
 * The last four a card is printed with, spread from its account's id, not
 * drawn. Until 2026-09-26 they were the id's own digits, and an id with too
 * few printed a new card as ···0000.
 */
export function last4For(id: string): string {
  let h = 7;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 1_000_003;
  return String(h % 10_000).padStart(4, '0');
}

/** A new number for a replacement card: the next along from the last, not drawn. */
function nextLast4(p: Plastic): string {
  return String((Number(p.last4) + 3571 * (p.issued ?? 1)) % 10_000).padStart(4, '0');
}

function inSave(sim: Simulation, amount: Money, currency: string): Money {
  const into = saveCurrency(sim.universe);
  return into === currency ? amount : exchange(amount, currency, into) ?? amount;
}

/** Stops a card and sends a replacement: in the bank's days, or its rush days. */
function replace(sim: Simulation, account: Account, which: Which, why: NonNullable<Plastic['stopped']>, rush: boolean): Instant {
  const p = plasticOf(sim, account, which);
  const rules = account.bankId ? SECURITY[account.bankId] : undefined;
  p.stopped = why;
  const days = rush ? rules?.rushDays ?? ESTIMATE_RUSH_DAYS : rules?.standardDays ?? ESTIMATE_DAYS;
  const kept = daysOfAccount(account, sim.universe.people[account.ownerId ?? '']);
  p.replacementAt = afterBusinessDays(sim.now, Math.max(1, days), kept.countryId, sim.homeZone, kept.regionId);
  sim.schedule({ at: p.replacementAt, kind: REPLACED_KIND, label: 'Your New Card Arrives', category: 'home', priority: 38, payload: { accountId: account.id, which } });
  return p.replacementAt;
}

/** When the holder learned of a use and when the statement that showed it went out: where the law's clocks start. */
export type FraudClocks = Pick<NonNullable<Person['fraud']>[number], 'learnedAt' | 'statedAt'>;

/**
 * Days late on a debit tier's own clock (`DebitTier`), reported now: business days in the account's country where it
 * counts them, from the statement where it runs from there, calendar days from learning of it otherwise. Until
 * 2026-10-12 a bare number of days was taken too and stood for every clock, so it counted each tier from the one day;
 * only tests passed one, and it went, since no one number is late on clocks that start on different days.
 */
function daysLateOn(sim: Simulation, account: Account, tier: DebitTier, late: FraudClocks): number {
  const from = tier.from === 'statement' ? late.statedAt : late.learnedAt;
  if (!tier.business) return Math.floor((sim.now - from) / MS_DAY);
  const kept = daysOfAccount(account, sim.universe.people[account.ownerId ?? '']);
  return businessDaysBetween(from, sim.now, kept.countryId, sim.homeZone, kept.regionId);
}

/**
 * What the law leaves the holder to carry of an amount used without them, reported now: each tier on its own clock,
 * the US's $50 two business days from learning of it, its $500 sixty days from the statement. Until 2026-10-12 every
 * tier counted calendar days from learning of it, so a charge learned of on a Friday and reported on Monday left
 * $500, and one an alert caught weeks before its statement left all of it, reported inside the 60 days from the
 * statement that `disputeRefusal` accepted. It reads the use's own record (`FraudClocks`), and took a bare number of
 * days for every tier too until the same day.
 */
export function liabilityFor(sim: Simulation, account: Account, which: Which, amount: Money, late: FraudClocks, via?: 'number'): Money {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const law = bank ? FRAUD_LAW[bank.iso] : undefined;
  if (!bank || !law) return amount;
  // A transfer made without a card in the US: nothing, reported within the 60 days (12 CFR 1005.6(b)(3)); the
  // dispute's own window refuses it after. Elsewhere the country's rule for a payment instrument, as a card's.
  if (via === 'number' && bank.iso === 'US') return 0;
  const money = law.inEuros ? 'EUR' : bank.currency;
  if (which === 'credit' && law.creditMax !== undefined) return Math.min(amount, inSave(sim, law.creditMax, money));
  const tier = law.debitTiers.find((t) => t.withinDays === undefined || daysLateOn(sim, account, t, late) <= t.withinDays);
  if (!tier || tier.max === undefined) return amount;
  return Math.min(amount, inSave(sim, tier.max, money));
}

/** The next statement after a moment, by which the holder is taken to have seen a charge: the card's next, or the account's month's end. */
function statementAfter(sim: Simulation, account: Account, which: Which, at: Instant): Instant {
  if (which === 'credit') {
    // This card's own (from 2026-10-10: until then the first pending statement of anyone's card, in a world of several).
    const next = sim.universe.scheduled
      .filter((one) => one.kind === 'card.statement' && one.status === 'pending' && (one.payload.personId ?? sim.universe.playerId) === account.ownerId
        && (one.payload.accountId === account.id || one.payload.accountId === undefined))
      .sort((a, b) => a.at - b.at)[0];
    if (next && next.at > at) return next.at;
  }
  // The bank's month, where the save keeps time; until 2026-09-27 a UTC month.
  const p = zonedParts(at, sim.homeZone);
  return instantFromZoned({ year: p.month === 12 ? p.year + 1 : p.year, month: p.month === 12 ? 1 : p.month + 1, day: 1, hour: 0 }, sim.homeZone);
}

/**
 * Why a payment can't be reported as not theirs, or nothing where it can:
 * the command refuses on it, and the Bank screen offers the report only where
 * it's empty. Until 2026-09-27 the screen offered it past the law's window.
 */
export function disputeRefusal(sim: Simulation, person: Person, index: number): string | undefined {
  const one = person.fraud?.[index];
  const account = one ? sim.universe.accounts[one.accountId] : undefined;
  if (!one || !account) return 'That isn’t a payment on your accounts.';
  if (one.reportedAt !== undefined) return 'You’ve reported it already.';
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const claimDays = bank ? FRAUD_LAW[bank.iso]?.claimDays : undefined;
  if (claimDays !== undefined && sim.now - one.statedAt > claimDays * MS_DAY) return `The law gives ${claimDays} days from the statement to report it, and they’ve passed.`;
  return undefined;
}

export function registerSecurity(sim: Simulation): void {
  sim.onSchedule(REPLACED_KIND, (item, s) => {
    const account = s.universe.accounts[String(item.payload.accountId)];
    const which = item.payload.which as Which;
    if (!account || account.closedAt || !account.plastic) return;
    const p = account.plastic;
    // Only the card it's waiting for arrives: a second sent while one was on its way (a new number asked for after the
    // card was reported) moved the date, and the first's arrival is stale (from 2026-10-13: until then both arrived,
    // each a new card; found by the review of that day).
    if (p.replacementAt === undefined || item.at !== p.replacementAt) return;
    // A new account's first card keeps the number it was opened with (from 2026-10-10).
    const first = p.stopped === 'new';
    if (!first) {
      p.last4 = nextLast4(p);
      p.issued = (p.issued ?? 1) + 1;
    }
    delete p.stopped;
    delete p.replacementAt;
    delete p.locked;
    p.expiresAt = s.now + yearsFor(account, which) * 365.25 * MS_DAY;
    // A new number reached the bills on the card only where the bank passed it on, and the rest were declined until
    // they had it (`card.update_billers`), until 2026-10-09: nothing has charged a card as a bill since the home and
    // its bills went, so the connected world that day let the stale billers and their command go (schema 91 sheds them).
    if (account.ownerId === s.universe.playerId) {
      s.notify({ category: 'bank', title: 'Your New Card Arrived', body: first ? `The debit card for ${account.name} ends in ${p.last4}, and you can use it now.` : `The new card ends in ${p.last4}, and you can use it now.`, importance: 50, route: '/workspace/bank' });
    }
  });

  sim.onSchedule(REFUND_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const one = person?.fraud?.[Number(item.payload.index)];
    const account = one ? s.universe.accounts[one.accountId] : undefined;
    if (!person || !one || !account || one.refunded !== undefined) return;
    const back = one.amount - (one.carried ?? 0);
    one.refunded = back;
    // An account closed since goes to the current account at its bank, or the primary one, and the notice says where
    // (from 2026-10-13: until then the refund was posted to the closed account, a card's credit no one could ask back;
    // found by the review of that day).
    const open = (a: Account | undefined) => (a && !a.closedAt ? a : undefined);
    const into = open(account)
      ?? Object.values(s.universe.accounts).find((a) => a.ownerId === person.id && a.kind === 'checking' && !a.closedAt && a.bankId === account.bankId)
      ?? open(person.primaryAccountId ? s.universe.accounts[person.primaryAccountId] : undefined)
      ?? account;
    if (back > 0) s.post({ memo: 'Refund: a payment you didn’t make', category: 'refund', postings: [{ accountId: into.id, amount: back }, { accountId: s.nominalAccount('expense', 'Unauthorized Use').id, amount: -back }] });
    if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'Refunded', body: `${formatMoney(back, saveCurrency(s.universe))} back for the payment you didn’t make${into.id !== account.id ? `, into your ${into.name}, since the ${account.name} is closed` : ''}.${one.carried ? ` The law leaves you to pay ${formatMoney(one.carried, saveCurrency(s.universe))} of it.` : ''}`, importance: 50, route: '/workspace/bank' });
  });

  sim.onEvent('world.day_rollover', 'bank.security', (_event, { sim: s }) => {
    const person = s.player;
    // Every debit card at every bank, and the everyday credit card (from 2026-10-10: the primary account's debit card only until then).
    const held: [Which, Account][] = [
      ...Object.values(s.universe.accounts).filter((a) => a.ownerId === person.id && a.kind === 'checking' && !a.closedAt && !a.nominal).map((a): [Which, Account] => ['debit', a]),
      ...[cardAccount(s, person, 'credit')].filter((a): a is Account => a !== undefined).map((a): [Which, Account] => ['credit', a]),
    ];
    for (const [which, account] of held) {
      const p = plasticOf(s, account, which);
      // A month before it expires, a new card with the same number (A144, C88).
      if (!p.stopped && p.expiresAt - s.now <= 30 * MS_DAY) {
        p.expiresAt += yearsFor(account, which) * 365.25 * MS_DAY;
        s.notify({ category: 'bank', title: 'A New Card Is On Its Way', body: `Your ${which} card ending ${p.last4} expires soon. The new one has the same number and expires ${formatDate(p.expiresAt, s.zone)}.`, importance: 35 });
      }
    }
    somebodyElse(s, person);
    attemptOnNumber(s, person);
  });

  sim.onCommand<{ which: Which; locked: boolean; accountId?: string }, { locked: boolean }>('card.lock', (p, { sim: s }) => {
    const account = cardAccount(s, s.player, p.which, p.accountId);
    if (!account) throw new CommandError(p.which === 'debit' ? 'You don’t have a checking account.' : 'You don’t have a card.');
    // Until 2026-10-13 a bank whose terms locked a card only by phone was refused here; no researched bank is one, and the
    // refusal and the field it read went that day (`BankSecurity`, `content/security.ts`).
    const plastic = plasticOf(s, account, p.which);
    if (plastic.stopped) throw new CommandError('That card is stopped, and a new one is on its way.');
    plastic.locked = Boolean(p.locked);
    return { locked: plastic.locked };
  });

  sim.onCommand<{ which: Which; why: 'lost' | 'stolen' | 'damaged'; rush?: boolean; accountId?: string }, { arrivesAt: Instant; fee: Money }>('card.report', (p, { sim: s }) => {
    const person = s.player;
    const account = cardAccount(s, person, p.which, p.accountId);
    if (!account) throw new CommandError(p.which === 'debit' ? 'You don’t have a checking account.' : 'You don’t have a card.');
    if (!['lost', 'stolen', 'damaged'].includes(p.why)) throw new CommandError('Choose why: lost, stolen or damaged.');
    const plastic = plasticOf(s, account, p.which);
    if (plastic.stopped) throw new CommandError('That card is already stopped, and a new one is on its way.');
    const rules = account.bankId ? SECURITY[account.bankId] : undefined;
    const bank = account.bankId ? bankById(account.bankId) : undefined;
    // A rush where the bank lists its fee or its days; one that lists days and no fee is taken to charge none for it, as
    // one that lists no replacement fee is. One the bank charges for without publishing what isn’t sent (`rushUnpublished`).
    if (p.rush && rules?.rushUnpublished) throw new CommandError(`${account.institution ?? 'The bank'} doesn’t publish what it charges to rush a card, so the game can’t send a rushed one.`);
    if (p.rush && rules?.rushFee === undefined && rules?.rushDays === undefined) throw new CommandError(`No rushed replacement was found for ${account.institution ?? 'the bank'}.`);
    // The bank's fee, where it lists one, unless it replaces a card free for this reason.
    const listed = p.which === 'debit' ? rules?.replaceFeeDebit : rules?.replaceFeeCredit;
    const free = rules?.freeFor?.includes(p.why) ?? false;
    const fee = inSave(s, (free ? 0 : listed ?? 0) + (p.rush ? rules?.rushFee ?? 0 : 0), bank?.currency ?? saveCurrency(s.universe));
    const arrivesAt = replace(s, account, p.which, p.why, Boolean(p.rush));
    if (fee > 0) {
      const label = p.rush ? 'Rush replacement card fee' : 'Replacement card fee';
      s.post({ memo: label, category: p.which === 'debit' ? 'bank_fee' : 'fees', postings: [{ accountId: account.id, amount: -fee }, { accountId: s.nominalAccount('expense', p.which === 'debit' ? 'Bank Fees' : 'Card Fees').id, amount: fee }] });
    }
    return { arrivesAt, fee };
  });

  sim.onCommand<Record<string, never>, { number: string }>('bank.new_number', (_p, { sim: s }) => {
    const person = s.player;
    const current = currentOf(s, person);
    const bank = current?.bankId ? bankById(current.bankId) : undefined;
    if (!current || !bank) throw new CommandError('You don’t have a checking account.');
    if (!SECURITY[bank.id]?.newNumberOnFraud) throw new CommandError(`${bank.name} doesn’t offer to move an account to a new number. Closing it and opening another account does the same.`);
    // The number moves at once; the exposure stays on the old one, whose attempts are declined from now on.
    current.number = accountNumber(s, person, bank, 'checking', (current.plastic?.issued ?? 1) + 1);
    current.last4 = current.number.replace(/\D/g, '').slice(-4);
    replace(s, current, 'debit', 'fraud', false);
    return { number: current.number };
  });

  sim.onCommand<{ index: number }, { carried: Money; refundAt: Instant }>('card.dispute', (p, { sim: s }) => {
    const person = s.player;
    const no = disputeRefusal(s, person, Number(p.index));
    if (no) throw new CommandError(no);
    const one = person.fraud![Number(p.index)]!;
    const account = s.universe.accounts[one.accountId]!;
    const bank = account.bankId ? bankById(account.bankId) : undefined;
    const law = bank ? FRAUD_LAW[bank.iso] : undefined;
    one.reportedAt = s.now;
    one.carried = liabilityFor(s, account, one.which, one.amount, one, one.via);
    const kept = daysOfAccount(account, person);
    const refundAt = afterBusinessDays(s.now, law?.refundDays ?? ESTIMATE_REFUND_DAYS, kept.countryId, s.homeZone, kept.regionId);
    s.schedule({ at: refundAt, kind: REFUND_KIND, label: 'A Refund From The Bank', category: 'home', priority: 38, payload: { personId: person.id, index: Number(p.index) } });
    // The card it was used on is stopped and replaced, free; a debit taken with the number alone stops no card.
    if (!account.plastic?.stopped && one.via !== 'number') replace(s, account, one.which, 'fraud', false);
    return { carried: one.carried, refundAt };
  });
}

/**
 * The day's chance of somebody else using the card, at the country's
 * official yearly rate spread over its days; the size of the country's
 * average case, from a quarter of it to seven quarters (SLATE's estimate of
 * the spread); stopped by the bank at its country's share.
 */
export function fraudOn(sim: Simulation, person: Person, at: Instant): { which: Which; account: Account; amount: Money; stopped: boolean } | undefined {
  const rng = sim.rng('bank.fraud', person.id, dateKey(at, sim.zone));
  const credit = cardOf(sim, person);
  // The country’s rate is a cardholder’s, not a card’s (`FraudLaw.fraudRate`): it falls on the cards that work, half
  // each when both do. Until 2026-10-13 the credit card was drawn on half the days and the debit card on the rest, so
  // with the debit card locked half the days met nothing, though with the credit card locked every day fell on the
  // debit card (found by that day’s third round of defects).
  const creditWorks = Boolean(credit && cardWorks(credit));
  const debitWorks = cardWorks(currentOf(sim, person));
  const which: Which | undefined = creditWorks && (!debitWorks || rng.next() < 0.5) ? 'credit' : debitWorks ? 'debit' : undefined;
  if (!which) return undefined;
  const account = cardAccount(sim, person, which)!;
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const law = bank ? FRAUD_LAW[bank.iso] : undefined;
  if (!bank || !law?.fraudRate || !law.avgLoss) return undefined;
  const daily = 1 - (1 - law.fraudRate) ** (1 / 365);
  if (rng.next() >= daily) return undefined;
  const amount = Math.max(100, Math.round(inSave(sim, law.avgLoss, law.avgLossCurrency ?? bank.currency) * (0.25 + 1.5 * rng.next())));
  return { which, account, amount, stopped: rng.next() < (law.preventedShare ?? 0) };
}

/** Somebody else's use of a card on the day, as drawn (`fraudOn`), or as given (a test's setup). */
export function somebodyElse(sim: Simulation, person: Person, given?: ReturnType<typeof fraudOn>): void {
  const hit = given ?? fraudOn(sim, person, sim.now);
  if (!hit) return;
  const { which, account, amount } = hit;
  const bank = bankById(account.bankId!)!;
  const cur = saveCurrency(sim.universe);
  plasticOf(sim, account, which);
  if (hit.stopped) {
    // Stopped: the bank declines it, asks, and on the answer that it wasn't them, blocks the card and sends another free (A148, C96).
    replace(sim, account, which, 'fraud', false);
    if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: 'Your Bank Stopped A Payment', body: `Somebody tried to spend ${formatMoney(amount, cur)} on your ${which} card ending ${account.plastic!.last4}. ${bank.name} declined it and asked you about it. It wasn’t you, so the card is blocked, and a free replacement is on its way.`, importance: 70, route: '/workspace/bank' });
    return;
  }
  sim.post({ memo: 'Card purchase', category: 'card-fraud', postings: [{ accountId: account.id, amount: -amount }, { accountId: sim.nominalAccount('expense', 'Unauthorized Use').id, amount }] });
  // Learned of at once where an alert catches it, otherwise at the statement.
  const alert = alertsOf(person).largePayment;
  const statedAt = statementAfter(sim, account, which, sim.now);
  const learnedAt = alert !== undefined && amount >= alert ? sim.now : statedAt;
  person.fraud = [...(person.fraud ?? []), { accountId: account.id, which, amount, at: sim.now, learnedAt, statedAt }];
  if (alert !== undefined && amount >= alert && person.id === sim.universe.playerId) {
    sim.notify({ category: 'bank', title: 'A Large Payment', body: `${formatMoney(amount, cur)} on your ${which} card ending ${account.plastic!.last4}. If it wasn’t you, report it on Money, under Cards.`, importance: 70, route: '/workspace/bank' });
  }
  // A debit card used: the account it draws on is known with it, where the bank treats that as compromised (`EXPOSURE`).
  if (which === 'debit' && SECURITY[bank.id]?.newNumberOnFraud && account.number) account.exposed = { number: account.number, at: sim.now, until: sim.now + EXPOSURE.days * MS_DAY };
}

/** The day's attempt on an exposed account number (`EXPOSURE`): declined where the account has moved, taken where it hasn't. */
export function attemptOnNumber(sim: Simulation, person: Person, given?: { size: number }): void {
  const account = currentOf(sim, person);
  const exposed = account?.exposed;
  if (!account || !exposed || account.closedAt) return;
  if (sim.now >= exposed.until) { delete account.exposed; return; }
  const rng = sim.rng('bank.fraud.number', person.id, dateKey(sim.now, sim.zone));
  // The day's draw, or an attempt given (a test's setup, at the size given, 0 to 1).
  if (!given && rng.next() >= 1 - (1 - EXPOSURE.yearlyAttempt) ** (1 / 365)) return;
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const law = bank ? FRAUD_LAW[bank.iso] : undefined;
  if (!bank || !law?.avgLoss) return;
  const cur = saveCurrency(sim.universe);
  const amount = Math.max(100, Math.round(inSave(sim, law.avgLoss, law.avgLossCurrency ?? bank.currency) * (0.25 + 1.5 * (given?.size ?? rng.next()))));
  const mine = person.id === sim.universe.playerId;
  if (account.number !== exposed.number) {
    if (mine) sim.notify({ category: 'bank', title: 'A Debit On Your Old Number Declined', body: `Somebody tried to take ${formatMoney(amount, cur)} with your old account number. It’s closed to them, so ${bank.name} declined it.`, importance: 45, route: '/workspace/bank' });
    return;
  }
  sim.post({ memo: 'Electronic debit', category: 'account-fraud', postings: [{ accountId: account.id, amount: -amount }, { accountId: sim.nominalAccount('expense', 'Unauthorized Use').id, amount }] });
  const statedAt = statementAfter(sim, account, 'debit', sim.now);
  const alert = alertsOf(person).largePayment;
  const learnedAt = alert !== undefined && amount >= alert ? sim.now : statedAt;
  person.fraud = [...(person.fraud ?? []), { accountId: account.id, which: 'debit', via: 'number', amount, at: sim.now, learnedAt, statedAt }];
  if (mine && learnedAt === sim.now) sim.notify({ category: 'bank', title: 'An Electronic Debit You Didn’t Make', body: `${formatMoney(amount, cur)} was taken from ${account.name} with its account number. If it wasn’t you, report it on Money, under Cards. ${bank.name} can also move the account to a new number.`, importance: 70, route: '/workspace/bank' });
}
