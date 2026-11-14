/**
 * SLATE — an account kept at home, operated from America, and money moved between countries (modules 4 and 5 of the
 * design of 2026-10-16, the owner's decision of that day: an eligible student keeps an account they held in the country
 * they lived in before Yale, beside the American one; nobody travels or moves).
 *
 * A bank decides by where its customer lives (`homeOf`), and a home account's bank is in another country. So, by the
 * bank's own words in the research (`content/homeaccounts.ts`):
 *
 * - **Nothing new from abroad** (`abroadRefusal`): savings, a term deposit, an overdraft, a loan, a debit card's
 *   overdraft or a credit card at a bank in another country are refused, in its words where the research quotes them.
 *   Wages can't be paid there either ("Yale pays into an account in America."), nor cash paid in, since its counters and
 *   machines are in its country.
 * - **Its charges, as it charges them**: a fee for a customer abroad on the bank's schedule (`nonResidentFeeDue`), its
 *   card's fee on a purchase in dollars (`cardFeeAbroad`) and at a machine here (`atmAbroad`), each in its own money
 *   exactly, and the country's tax at source on a non-resident's interest (`nonResidentTaxOn`).
 * - **Its closing** (`armHomeAccounts`, `HOME_CLOSES_KIND`): a bank that closes the account of a customer abroad, or of a
 *   US person where it says so, gives its notice on the first morning, with its date, and on that date settles the
 *   interest and fees, sends what's left to the American account by its own payment abroad and closes.
 * - **Payments abroad** (`abroadQuote`, `sendAbroad`): between banks in two countries, every move goes this way and none
 *   takes a domestic same-day path (`sendBetweenBanks` routes here first). Out now with the sending bank's fee; in on
 *   the day that's so many business days later in both countries, less the bank's margin on the exchange and the
 *   receiving bank's fee. A margin or a time the bank doesn't publish is SLATE's stated assumption
 *   (`ASSUMED_MARGIN`, `ASSUMED_DAYS`); a fee it doesn't publish refuses the payment.
 */

import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import type { Person } from '../domain/model';
import type { ScheduledItem } from '../core/scheduler';
import { addDays, dateKey, formatDate, formatWeekdayDate, instantFromZoned, zonedParts, type Instant } from '../core/time';
import { exchange, exchangeHeld, referenceRate, type ReferenceRate } from '../content/currency';
import { bankById, type Bank } from '../content/banks';
import { afterBusinessDaysIn, daysOfAccount } from '../content/bankdays';
import { ASSUMED_DAYS, ASSUMED_WORDS, abroadTermsOf, chargeOf, homeTerms, marginOf, noticeFor, NON_RESIDENT_TAX, US_REPORTS, type AbroadTerms, type Charge } from '../content/homeaccounts';
import { homeOf } from './earnings';
import { isoOf, dropPaymentsFor, endedWords, endOrdersOf, settleFees, settleInterest } from './banking';
import { ARRIVES_KIND, inTransitOf, usPerson } from './bankmoves';
import { checkingsOf, settleOverdraftInterest } from './lending';
import { depositAccount, redirectAway } from './routing';
import { ageOn } from './mortality';

export const HOME_CLOSES_KIND = 'bank.home_closes';

const swap = (cents: Money, from: string, to: string): Money | undefined => exchange(cents, from, to);

/** The country a person lives in, ISO alpha-2. */
export function livesIn(person: Person): string | undefined {
  return isoOf(homeOf(person));
}

/** An account's own money: its `currency`, or the save's. */
export function moneyOf(sim: Simulation, account: Account): string {
  return account.currency ?? saveCurrency(sim.universe);
}

/** An amount in an account's own money, written. */
export function heldText(sim: Simulation, account: Account, amount: Money = heldOf(account)): string {
  return formatMoney(amount, moneyOf(sim, account));
}

/** What an account holds in its own money: `held` on an account in another currency, the balance otherwise. */
export const heldOf = (account: Account): Money => (account.currency ? account.held ?? 0 : account.balance);

/**
 * An account's money written for a screen or a notice (from 2026-10-16, module 7): on an account in another currency,
 * its own money first, as its bank shows it, and the save's beside it; on any other, the save's alone, as before. A sum
 * that isn't the balance is given with its own figure (`native`) where it has one. Until then every line but Move
 * Money's wrote a home account in dollars only.
 */
export function balanceText(sim: Simulation, account: Account, amount: Money = account.balance, native: Money | undefined = account.currency ? heldOf(account) : undefined, opts: { cents?: boolean } = {}): string {
  const save = formatMoney(amount, saveCurrency(sim.universe), opts);
  return account.currency && native !== undefined ? `${formatMoney(native, account.currency, opts)} (${save})` : save;
}

const share = (rate: number) => `${Number((rate * 100).toFixed(3))}%`;

/** A bank's charge in words, in its money: "¥110 and 3.05% of the cash", a share's bounds beside it. */
export function chargeWords(charge: Charge, currency: string, of: string): string {
  const parts: string[] = [];
  let shared = false;
  for (let c: Charge | undefined = charge; c; c = c.plus) {
    const money = c.currency ?? currency;
    if (c.fixed) parts.push(formatMoney(c.fixed, money));
    if (c.share) {
      shared = true;
      const bounds = [c.min !== undefined ? `at least ${formatMoney(c.min, money)}` : '', c.max !== undefined ? `at most ${formatMoney(c.max, money)}` : ''].filter(Boolean).join(', ');
      parts.push(`${share(c.share)}${bounds ? ` (${bounds})` : ''}`);
    }
  }
  return `${parts.join(' and ') || 'nothing'}${shared ? ` of ${of}` : ''}${charge.upTo?.length ? ', less on smaller sums' : ''}`;
}

/**
 * What an account kept at home costs and comes to, for its panel on the bank screen (from 2026-10-16, module 7), from
 * the terms the engine charges by: the bank's fee for a customer abroad, its debit card's on a purchase in dollars and at
 * a machine here, and its closing, with the date, where it closes. Nothing for an account at a bank where they live.
 */
export function homeAccountLines(sim: Simulation, account: Account): string[] {
  if (!heldFromAbroad(sim, account)) return [];
  const bank = bankById(account.bankId!)!;
  const terms = homeTerms(bank.id);
  const owner = sim.universe.people[account.ownerId];
  const lines: string[] = [];
  const fee = terms?.nonResidentFee;
  if (account.kind === 'checking' && fee) {
    const every = fee.months === 1 ? 'a month' : fee.months === 3 ? 'a quarter' : fee.months === 24 ? 'every two years' : `every ${fee.months} months`;
    const spared = fee.ageBelow !== undefined && owner && ageOn(sim, owner, sim.now) < fee.ageBelow ? `, not yet: it doesn’t charge one under ${fee.ageBelow}` : '';
    lines.push(`For a customer abroad ${bank.name} charges ${formatMoney(fee.amount, bank.currency)} ${every}${spared}.`);
    // The savings named only where there are some (from 2026-10-16: until then said to a life that kept none there).
    const saved = Object.values(sim.universe.accounts).some((a) => a.ownerId === account.ownerId && !a.closedAt && a.bankId === bank.id && a.kind === 'savings');
    if (fee.unpaid) lines.push(saved ? `It takes it from this account, or from your savings at ${bank.name} when this one doesn’t hold it.` : 'It takes it from this account.');
    if (account.feeOwedHeld) lines.push(`${formatMoney(account.feeOwedHeld, bank.currency)} of it is owed, taken the first night either account holds it. ${fee.unpaid}`);
  }
  const abroad = terms?.abroad;
  if (account.kind === 'checking') {
    const refused = cardAbroadRefusal(bank);
    if (refused) lines.push(refused);
    else if (abroad?.card) lines.push(`Its debit card costs ${chargeWords(abroad.card, bank.currency, 'each purchase in dollars')}${abroad.cardFreeMonthly ? `, past the first ${formatMoney(abroad.cardFreeMonthly, bank.currency)} a month` : ''}${abroad.atm ? `, and ${chargeWords(abroad.atm, bank.currency, 'the cash')} at another bank’s machine here, with the machine’s own fee` : abroad.atmRefused ? `. ${abroad.atmRefused}` : ''}.`);
  }
  const closing = sim.universe.scheduled.find((i) => i.kind === HOME_CLOSES_KIND && i.status === 'pending' && i.payload.personId === account.ownerId && i.payload.bankId === bank.id);
  if (closing) {
    const into = owner ? checkingsOf(sim, owner).find((a) => !heldFromAbroad(sim, a)) : undefined;
    lines.push(`${bank.name} closes it on ${formatDate(closing.at, sim.zone)}, and sends what it holds then to ${into ? into.name : 'your account here'} by its own payment abroad.`);
  }
  return lines;
}

/** Whether an account's bank is in another country than the one its owner lives in. */
export function heldFromAbroad(sim: Simulation, account: Account): boolean {
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  const owner = sim.universe.people[account.ownerId];
  if (!bank || !owner) return false;
  const here = livesIn(owner);
  return here !== undefined && bank.iso !== here;
}

/** An amount in the save's money from an account's own, and back. */
function toSave(sim: Simulation, amount: Money, currency: string): Money {
  const save = saveCurrency(sim.universe);
  return currency === save ? amount : swap(amount, currency, save) ?? amount;
}
function fromSave(sim: Simulation, amount: Money, currency: string): Money {
  const save = saveCurrency(sim.universe);
  return currency === save ? amount : exchangeHeld(amount, save, currency) ?? amount;
}

/**
 * Why a bank in another country opens nothing new for this person, or nothing where it's a bank where they live: in
 * its words where the research quotes them, and where it doesn't, that the research found no way to. Only a bank the
 * research reads as one a student keeps from home (`homeTerms`) is held to it: a Toronto life borrowing from Citi, which
 * no home account reaches, is lent to as it was before 2026-10-16.
 */
export function abroadRefusal(person: Person, bank: Bank | undefined): string | undefined {
  const here = livesIn(person);
  const terms = bank ? homeTerms(bank.id) : undefined;
  if (!bank || !terms || here === undefined || bank.iso === here) return undefined;
  return terms.abroad.opening ?? `There’s no known way to open anything new at ${bank.name} from America, so the game assumes there’s none.`;
}

/**
 * The share the bank's country takes from a non-resident's interest, where the account's owner lives outside that
 * country; nothing where they live in it. The rate is the country's for a customer abroad (`NON_RESIDENT_TAX`): a bank in
 * Britain takes nothing, one in Japan 15.315%.
 */
export function nonResidentTaxOn(sim: Simulation, account: Account): number | undefined {
  if (!heldFromAbroad(sim, account)) return undefined;
  const bank = bankById(account.bankId!)!;
  return NON_RESIDENT_TAX[bank.iso]?.rate ?? 0;
}

/**
 * The bank's fee for a customer abroad, due at a month's end on the current account at the bank, in its own money and
 * the save's: monthly every month, quarterly at the calendar quarter's end, and every two years from the first month
 * after they left (the certificate Sabadell asks for on leaving, then again), not under the age it's spared at.
 */
export function nonResidentFeeDue(sim: Simulation, account: Account, at: Instant): { fee: Money; native: Money } | undefined {
  if (account.kind !== 'checking' || !heldFromAbroad(sim, account)) return undefined;
  const fee = homeTerms(account.bankId!)?.nonResidentFee;
  const owner = sim.universe.people[account.ownerId];
  if (!fee || !owner) return undefined;
  if (fee.ageBelow !== undefined && ageOn(sim, owner, at) < fee.ageBelow) return undefined;
  const p = zonedParts(at, sim.homeZone);
  if (fee.months === 3 && p.month % 3 !== 0) return undefined;
  if (fee.months > 3) {
    const left = zonedParts(account.lastUsedBefore ?? account.openedAt, sim.homeZone);
    const months = (p.year - left.year) * 12 + (p.month - left.month);
    if (months % fee.months !== 0) return undefined;
  }
  const currency = bankById(account.bankId!)!.currency;
  return { native: fee.amount, fee: toSave(sim, fee.amount, currency) };
}

/**
 * Takes a fee for a customer abroad, with whatever of it is owed (from 2026-10-16: until then the month's end posted it
 * on the current account whatever it held). At a bank whose account can't go below zero (`NonResidentFee.unpaid`), from
 * the current account where it holds the whole, else from the holder's other account at the bank that does: in SLATE
 * both are the same ordinary deposit, where the bank's own books debit one representative account, SLATE's reading. Where
 * neither holds it, nothing is charged and the whole is owed on the current account (`feeOwedHeld`). The month's end
 * calls it with the month's fee, and each night with none, which takes what's owed once it's held.
 */
export function chargeAbroadFee(sim: Simulation, account: Account, native: Money): void {
  const due = native + (account.feeOwedHeld ?? 0);
  if (due <= 0) return;
  let from: Account | undefined = account;
  if (homeTerms(account.bankId!)?.nonResidentFee?.unpaid && heldOf(account) < due) {
    from = Object.values(sim.universe.accounts).find((a) => a.id !== account.id && !a.closedAt && a.ownerId === account.ownerId && a.bankId === account.bankId && a.kind === 'savings' && heldOf(a) >= due);
    if (!from) {
      account.feeOwedHeld = due;
      return;
    }
  }
  // Where the fee is the last of what it held, the last of its balance too, so it's empty in both figures.
  const save = from.currency && from.held === due ? from.balance : toSave(sim, due, bankById(from.bankId!)!.currency);
  sim.post({
    memo: `Fee for a customer abroad: ${from.name}`, category: 'bank_fee',
    postings: [
      { accountId: from.id, amount: -save, ...(from.currency ? { native: -due } : {}) },
      { accountId: sim.nominalAccount('expense', 'Bank Fees').id, amount: save },
    ],
  });
  delete account.feeOwedHeld;
}

/** Why a bank's card can't be the one used here, or nothing. */
export function cardAbroadRefusal(bank: Bank): string | undefined {
  const terms = abroadTermsOf(bank.id);
  if (terms?.cardRefused) return terms.cardRefused;
  if (!terms?.card) return `What ${bank.name} charges for a purchase in dollars on its card isn’t known to the game, so it can’t be your everyday card here.`;
  return undefined;
}

/** What a debit card purchase here, of an amount in the save's money, costs on a card from a bank abroad: its fee, both ways. */
export function cardFeeAbroad(sim: Simulation, account: Account, paid: Money): { fee: Money; native: Money } | undefined {
  if (paid <= 0 || !heldFromAbroad(sim, account)) return undefined;
  const bank = bankById(account.bankId!)!;
  const terms = abroadTermsOf(bank.id);
  if (!terms?.card) return undefined;
  const currency = moneyOf(sim, account);
  let native = fromSave(sim, paid, currency);
  // BBVA lets the month's first €300 of purchases abroad through free.
  if (terms.cardFreeMonthly !== undefined) {
    const before = spentAbroadThisMonth(sim, account) - native;
    native = Math.max(0, native - Math.max(0, terms.cardFreeMonthly - before));
  }
  if (native <= 0) return undefined;
  const fee = chargeOf(terms.card, native, currency, swap);
  return fee > 0 ? { native: fee, fee: toSave(sim, fee, currency) } : undefined;
}

/** What the card at a bank abroad has paid for purchases this month, in its money, the purchase just made among them. */
function spentAbroadThisMonth(sim: Simulation, account: Account): Money {
  const p = zonedParts(sim.now, sim.homeZone);
  const since = instantFromZoned({ year: p.year, month: p.month, day: 1, hour: 0 }, sim.homeZone);
  let total = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0 && list[i]!.at >= since; i -= 1) {
    const t = list[i]!;
    if (t.category !== 'food') continue;
    for (const q of t.postings) if (q.accountId === account.id && q.amount < 0) total -= q.native ?? q.amount;
  }
  return total;
}

/**
 * Cash from a machine here on a card from a bank abroad: refused at its own machines and counters, which are in its
 * country, and where it publishes nothing or says its card doesn't work abroad; otherwise its fee, both ways.
 */
export function atmAbroad(sim: Simulation, account: Account, amount: Money, from: string): { fee: Money; native: Money } | { refused: string } | undefined {
  if (!heldFromAbroad(sim, account)) return undefined;
  const bank = bankById(account.bankId!)!;
  if (from !== 'other_atm') return { refused: `${bank.name}’s own machines and counters are in its country. Here, its card works only at another bank’s machine.` };
  const terms = abroadTermsOf(bank.id);
  if (terms?.atmRefused) return { refused: terms.atmRefused };
  if (!terms?.atm) return { refused: `What ${bank.name} charges for cash from a machine abroad isn’t known to the game.` };
  const currency = moneyOf(sim, account);
  const native = chargeOf(terms.atm, fromSave(sim, amount, currency), currency, swap);
  return { native, fee: toSave(sim, native, currency) };
}

/** A payment between countries, worked out before it's made: what goes, what it costs, what arrives and when. */
export interface AbroadQuote {
  from: Bank;
  to: Bank;
  /** What leaves, in the sending account's money, and in the save's. */
  sent: Money;
  sentIn: string;
  worth: Money;
  /** The sending bank's fee, in its money and the save's. */
  fee: Money;
  feeSave: Money;
  /** The margin on the exchange: its rate, whether it's SLATE's assumption, and what it takes in the save's money. */
  margin: number;
  marginAssumed: boolean;
  marginSave: Money;
  /** The receiving bank's fee, in its money and the save's. */
  incoming: Money;
  incomingSave: Money;
  /** What arrives, in the receiving account's money, and in the save's. */
  received: Money;
  receivedIn: string;
  receivedSave: Money;
  arrives: Instant;
  days: number;
  daysAssumed: boolean;
  /**
   * SLATE: the reference rates the quote was made at, each with its effective day and whether it was stale (from November
   * 14, 2026; content/currency.ts `referenceRate`). Kept with the payment, so its arrival settles what was quoted.
   */
  rates: { sent: ReferenceRate; received: ReferenceRate };
}

/** What the holder's accounts at a bank have sent abroad since a moment, in its money. */
function sentAbroadSince(sim: Simulation, person: Person, bankId: string, since: Instant): Money {
  // Found, not opened: a quote is read on the screen, and opens nothing.
  const transit = Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && a.kind === 'escrow' && a.category === 'in_transit' && !a.closedAt)?.id;
  if (!transit) return 0;
  const atBank = new Set(Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && a.bankId === bankId).map((a) => a.id));
  let total = 0;
  const list = sim.universe.transactions;
  for (let k = list.length - 1; k >= 0 && list[k]!.at >= since; k -= 1) {
    const t = list[k]!;
    if (t.category !== 'transfer' || !t.postings.some((p) => p.accountId === transit)) continue;
    for (const p of t.postings) if (atBank.has(p.accountId) && p.amount < 0) total -= p.native ?? p.amount;
  }
  return total;
}

/**
 * A payment from one of the holder's accounts to their account at a bank in another country, quoted: the sending bank's
 * fee and margin (or SLATE's stated margin where it publishes none), the receiving bank's fee, what arrives and the day
 * it does, or why it can't be made, in words. `sent` is in the sending account's money. A payment the bank makes itself
 * (`byTheBank`, a closing) isn't held to the holder's limits, and its fee comes out of what it sends.
 */
export function abroadQuote(sim: Simulation, person: Person, from: Account, to: Account | undefined, sent: Money, toBankId = to?.bankId, byTheBank = false): AbroadQuote | { refused: string } {
  const fromBank = from.bankId ? bankById(from.bankId) : undefined;
  const toBank = toBankId ? bankById(toBankId) : undefined;
  if (!fromBank || !toBank) return { refused: 'Money moves abroad only between your own accounts at banks the game has.' };
  const out = abroadTermsOf(fromBank.id);
  const into = abroadTermsOf(toBank.id);
  if (out?.outRefused) return { refused: out.outRefused };
  // Its fee for a customer abroad unpaid, at a bank that then stops its payments abroad.
  const owing = checkingsOf(sim, person).find((a) => a.bankId === fromBank.id && (a.feeOwedHeld ?? 0) > 0);
  if (owing) return { refused: `${homeTerms(fromBank.id)!.nonResidentFee!.unpaid!} ${formatMoney(owing.feeOwedHeld!, fromBank.currency)} of it is owed, taken the first night an account there holds it.` };
  if (!out?.out) return { refused: `What ${fromBank.name} charges to send a payment abroad isn’t known to the game.` };
  if (!into?.incoming) return { refused: `What ${toBank.name} charges for a payment received from abroad isn’t known to the game.` };
  if (!(sent > 0)) return { refused: 'Enter how much to send.' };
  const save = saveCurrency(sim.universe);
  const sentIn = moneyOf(sim, from);
  // SLATE: no rate in force for either money, no payment: until November 14, 2026 a missing rate was taken as one to one.
  const receivedFor = to ? moneyOf(sim, to) : toBank.currency;
  const sentRate = referenceRate(sentIn);
  const receivedRate = referenceRate(receivedFor);
  for (const [cur, r] of [[sentIn, sentRate], [receivedFor, receivedRate], [save, referenceRate(save)]] as const) {
    if (!r) return { refused: `No exchange rate for ${cur} is recorded by this date, so the game can't quote this payment.` };
  }
  const has = heldOf(from);
  let fee = chargeOf(out.out, sent, sentIn, swap);
  if (sent + fee > has) {
    if (!byTheBank) return { refused: `${from.name} holds ${formatMoney(Math.max(0, has), sentIn)}, and this takes ${formatMoney(sent + fee, sentIn)} with the bank’s fee.` };
    // The bank's own payment of what's left: its fee comes out of it.
    sent = has - fee;
    if (sent <= 0) { fee = has; sent = 0; }
  }
  if (!byTheBank) {
    const limits = limitRefusal(sim, person, fromBank, out, sent, sentIn);
    if (limits) return { refused: limits };
  }
  const worth = sent === has && from.currency ? from.balance : toSave(sim, sent, sentIn);
  const feeSave = toSave(sim, fee, sentIn);
  const { rate, assumed } = marginOf(out, sent);
  const marginSave = Math.round(worth * rate);
  const receivedIn = to ? moneyOf(sim, to) : toBank.currency === save ? save : toBank.currency;
  const arriving = fromSave(sim, worth - marginSave, receivedIn);
  const incoming = chargeOf(into.incoming, arriving, receivedIn, swap);
  const incomingSave = toSave(sim, incoming, receivedIn);
  const receivedSave = worth - marginSave - incomingSave;
  const received = receivedIn === save ? receivedSave : arriving - incoming;
  if (receivedSave <= 0 && !byTheBank) return { refused: 'That amount wouldn’t even cover the exchange margin and the fee for receiving it.' };
  const days = out.days ?? ASSUMED_DAYS;
  const places = [daysOfAccount(from, person), daysOfAccount(to ?? { bankId: toBank.id }, person)];
  const arrives = afterBusinessDaysIn(sim.now, days, places, sim.homeZone);
  return {
    from: fromBank, to: toBank, sent, sentIn, worth, fee, feeSave, margin: rate, marginAssumed: assumed, marginSave,
    incoming, incomingSave, received, receivedIn, receivedSave, arrives, days, daysAssumed: out.days === undefined,
    rates: { sent: sentRate!, received: receivedRate! },
  };
}

/** Why the sending bank's own limits on payments abroad refuse one, in its money. */
function limitRefusal(sim: Simulation, person: Person, bank: Bank, terms: AbroadTerms, sent: Money, currency: string): string | undefined {
  if (terms.limitDay === undefined && terms.limitMonth === undefined) return undefined;
  const p = zonedParts(sim.now, sim.homeZone);
  const today = sentAbroadSince(sim, person, bank.id, instantFromZoned({ year: p.year, month: p.month, day: p.day, hour: 0 }, sim.homeZone));
  const month = sentAbroadSince(sim, person, bank.id, instantFromZoned({ year: p.year, month: p.month, day: 1, hour: 0 }, sim.homeZone));
  if (terms.limitDay !== undefined && today + sent > terms.limitDay) return `${bank.name} lets ${formatMoney(terms.limitDay, currency, { cents: false })} a day go abroad, and ${formatMoney(today, currency, { cents: false })} has gone today.`;
  if (terms.limitMonth !== undefined && month + sent > terms.limitMonth) return `${bank.name} lets ${formatMoney(terms.limitMonth, currency, { cents: false })} a month go abroad, and ${formatMoney(month, currency, { cents: false })} has gone this month.`;
  return undefined;
}

const percent = (rate: number) => `${Number((rate * 100).toFixed(2))}%`;

/** SLATE: the reference rates a quote reads, by their dates: not a bank's price, and said to be old where they are. */
export function rateWords(q: AbroadQuote): string {
  const shown = [q.rates.sent, q.rates.received].filter((r) => r.currency !== 'USD');
  if (!shown.length) return '';
  const said = shown.map((r) => `${r.perUSD} ${r.currency} to the dollar from ${r.effective}`).join(' and ');
  const old = shown.some((r) => r.stale) ? ' These are the newest recorded, and more than a quarter old.' : '';
  return `The estimated rate is the reference rate in force: ${said}.${old}`;
}

/** A quote in a sentence, for Move Money and the guide. */
export function quoteWords(sim: Simulation, q: AbroadQuote): string {
  const fee = q.fee > 0 ? `for a ${formatMoney(q.fee, q.sentIn)} fee` : 'for no fee';
  const margin = q.marginAssumed
    ? `At ${percent(q.margin)} under the estimated exchange rate (${ASSUMED_WORDS.margin})`
    : `At its rate, ${percent(q.margin)} under the estimated exchange rate`;
  const incoming = q.incoming > 0 ? ` after its ${formatMoney(q.incoming, q.receivedIn)} fee for a payment from abroad` : '';
  const days = q.daysAssumed ? ` (${ASSUMED_WORDS.days})` : '';
  return `${q.from.name} sends ${formatMoney(q.sent, q.sentIn)} ${fee}. ${margin}, ${q.to.name} receives ${formatMoney(q.received, q.receivedIn)}${incoming}, on ${formatWeekdayDate(q.arrives, sim.zone)}${days}. ${rateWords(q)}`;
}

/**
 * Sends a payment abroad now: out of the account, its fee beside it, into the money in transit; in on the day the quote
 * gave, less the margin and the receiving bank's fee (`arriveFromAbroad`). Throws the quote's refusal.
 */
export function sendAbroad(sim: Simulation, person: Person, from: Account, to: Account | undefined, sent: Money, toBankId = to?.bankId, byTheBank = false): Instant {
  const q = abroadQuote(sim, person, from, to, sent, toBankId, byTheBank);
  if ('refused' in q) throw new CommandError(q.refused);
  const transit = inTransitOf(sim, person);
  const foreign = from.currency !== undefined;
  if (q.sent > 0) {
    sim.post({
      memo: `To ${q.to.name}${to ? `: ${to.name}` : ''}, abroad`, category: 'transfer',
      postings: [{ accountId: from.id, amount: -q.worth, ...(foreign ? { native: -q.sent } : {}) }, { accountId: transit.id, amount: q.worth }],
    });
  }
  if (q.fee > 0) {
    // Where the fee is the last of what it held, the last of its balance too, so it's empty in both figures.
    const feeSave = foreign && from.held === q.fee ? from.balance : q.feeSave;
    sim.post({
      memo: 'International payment fee', category: 'bank_fee',
      postings: [{ accountId: from.id, amount: -feeSave, ...(foreign ? { native: -q.fee } : {}) }, { accountId: sim.nominalAccount('expense', 'Bank Fees').id, amount: feeSave }],
    });
  }
  if (q.sent <= 0) return sim.now;
  sim.schedule({
    at: q.arrives, kind: ARRIVES_KIND, label: 'Money Arrives From Abroad', category: 'home', priority: 37,
    payload: {
      personId: person.id, fromId: from.id, ...(to ? { toId: to.id } : {}), toBankId: q.to.id, amount: q.worth,
      abroad: true, margin: q.marginSave, incoming: q.incomingSave, received: q.received, receivedIn: q.receivedIn,
      // SLATE: the quote's rates, kept with it: its arrival posts what was quoted, whatever the rate is by then.
      rates: { sent: { ...q.rates.sent }, received: { ...q.rates.received } },
    },
  });
  return q.arrives;
}

/**
 * A payment abroad arriving: into the account it was sent to, less the margin on the exchange and the receiving bank's
 * fee, with its own figure exact; or, where that account has closed, back to the one it left, less the same.
 */
export function arriveFromAbroad(sim: Simulation, item: ScheduledItem, person: Person, to: Account | undefined): void {
  const amount = Number(item.payload.amount);
  const margin = Number(item.payload.margin ?? 0);
  const incoming = Number(item.payload.incoming ?? 0);
  const transit = inTransitOf(sim, person);
  const source = sim.universe.accounts[String(item.payload.fromId)];
  const lands = to ?? (source && !source.closedAt ? source : depositAccount(sim, person) ?? checkingsOf(sim, person)[0]);
  if (!lands) return;
  const net = amount - margin - incoming;
  const exact = to && to.currency !== undefined && item.payload.receivedIn === to.currency ? { native: Number(item.payload.received) } : {};
  const postings: { accountId: string; amount: Money; native?: Money }[] = [{ accountId: transit.id, amount: -amount }, { accountId: lands.id, amount: net, ...exact }];
  if (margin > 0) postings.push({ accountId: sim.nominalAccount('expense', 'Exchange Margin').id, amount: margin });
  if (incoming > 0) postings.push({ accountId: sim.nominalAccount('expense', 'Bank Fees').id, amount: incoming });
  const fromName = source ? `${source.name} at ${source.institution ?? 'your other bank'}` : 'your bank abroad';
  sim.post({ memo: to ? `From ${fromName}, abroad` : 'Returned from abroad, less the exchange and the fee: the account it was sent to isn’t open', category: 'transfer', postings });
  if (person.id !== sim.universe.playerId) return;
  sim.notify(to
    ? { category: 'bank', title: 'Money Arrived From Abroad', body: `${heldText(sim, lands, exact.native ?? net)} reached ${lands.name} from ${fromName}.`, importance: 45, route: '/workspace/bank' }
    : { category: 'bank', title: 'A Payment Abroad Came Back', body: `The account it was sent to isn’t open, so ${formatMoney(net, saveCurrency(sim.universe))} came back to ${lands.name}, less the exchange and the fee.`, importance: 50, route: '/workspace/bank' });
}

/** The home banks that close this person's account, by bank: Barclays for anybody abroad, or a bank that closes a US person's. */
function closingBanks(sim: Simulation, person: Person): { bank: Bank; accounts: Account[]; why: string }[] {
  const out: { bank: Bank; accounts: Account[]; why: string }[] = [];
  const mine = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && !a.nominal && (a.kind === 'checking' || a.kind === 'savings') && heldFromAbroad(sim, a));
  for (const bankId of new Set(mine.map((a) => a.bankId!))) {
    const terms = homeTerms(bankId);
    const bank = bankById(bankId);
    if (!terms || !bank) continue;
    if (terms.nonResident === 'closes') out.push({ bank, accounts: mine.filter((a) => a.bankId === bankId), why: 'whose holder lives outside its country' });
    else if (terms.usPersons === 'closes' && usPerson(person, sim.now)) out.push({ bank, accounts: mine.filter((a) => a.bankId === bankId), why: 'held by a US citizen' });
  }
  return out;
}

/**
 * Gives a closing bank's notice, once: on the first morning (and on loading a save made before this), it schedules the
 * closing on the day its notice runs out, counted from the morning they arrived, and says so. A save that already has
 * the closing scheduled, done or not, is left alone, so a reload never says it twice.
 */
export function armHomeAccounts(sim: Simulation): void {
  const person = sim.universe.people[sim.universe.playerId];
  if (!person) return;
  for (const { bank, accounts, why } of closingBanks(sim, person)) {
    if (sim.universe.scheduled.some((i) => i.kind === HOME_CLOSES_KIND && i.payload.personId === person.id && i.payload.bankId === bank.id)) continue;
    const opened = Math.min(...accounts.map((a) => a.openedAt));
    const days = noticeFor(homeTerms(bank.id)!, dateKey(opened, sim.homeZone));
    if (days === undefined) continue;
    const arrived = accounts[0]!.lastUsedBefore ?? sim.now;
    const at = addDays(arrived, days, sim.homeZone);
    sim.schedule({ at, kind: HOME_CLOSES_KIND, label: `${bank.name} Closes Your Account`, category: 'home', priority: 36, payload: { personId: person.id, bankId: bank.id } });
    const into = checkingsOf(sim, person).find((a) => !heldFromAbroad(sim, a));
    sim.notify({
      category: 'bank', title: `${bank.name} Is Closing Your Account`,
      body: `${bank.name} closes an account ${why}. It gives ${days} days’ notice, so your accounts there close on ${formatDate(at, sim.zone)}, and what they hold then is sent to ${into ? `${into.name} at ${into.institution}` : 'your account here'} by the bank’s own payment abroad.`,
      importance: 70, route: '/workspace/bank',
    });
  }
}

/** The closing on its day: interest and fees settled, everything gathered on the current account and sent here, closed. */
function homeCloses(sim: Simulation, item: ScheduledItem): void {
  const person = sim.universe.people[String(item.payload.personId)];
  const bank = bankById(String(item.payload.bankId));
  if (!person || !bank) return;
  const mine = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.closedAt && a.bankId === bank.id && (a.kind === 'checking' || a.kind === 'savings'));
  if (mine.length === 0) return;
  // The overdraft interest built since the 1st with them, from 2026-10-16 (`settleOverdraftInterest`): until then it was
  // dropped when the account closed. Each try settles them, and a try again the next day settles only what's built
  // since, the fees none: the first try ended them (`feesEndedAt`, later on 2026-10-16), where until then each morning's
  // try charged a German account's month's fee again (docs/verification/remaining-09/banking-checklist.json, banking.3;
  // no German bank closes a home account, so only a fixture reaches it).
  for (const account of mine) { settleInterest(sim, account, `Interest: ${account.name}, on closing`); settleOverdraftInterest(sim, account); settleFees(sim, account); }
  const current = mine.find((a) => a.kind === 'checking') ?? mine[0]!;
  for (const account of mine) {
    if (account.id === current.id || account.balance === 0) continue;
    sim.post({ memo: `Closed ${account.name}`, category: 'transfer', postings: [{ accountId: account.id, amount: -account.balance, ...(account.currency ? { native: -(account.held ?? 0) } : {}) }, { accountId: current.id, amount: account.balance, ...(current.currency ? { native: account.held ?? 0 } : {}) }] });
  }
  const mineNow = person.id === sim.universe.playerId;
  if (current.balance < 0) {
    // Tried again each day until it's paid, said once (from 2026-10-16: until then never again, so a Barclays account
    // paid off stayed open for good, and once the done closing was pruned a reload announced its passed date again).
    if (mineNow && !item.payload.retrying) sim.notify({ category: 'bank', title: `${bank.name} Didn’t Close Your Account`, body: `It’s overdrawn by ${heldText(sim, current, -heldOf(current))}, and the bank closes it once that’s paid.`, importance: 60, route: '/workspace/bank' });
    sim.schedule({ at: addDays(sim.now, 1, sim.homeZone), kind: HOME_CLOSES_KIND, label: item.label, category: 'home', priority: 36, payload: { ...item.payload, retrying: true } });
    return;
  }
  const into = checkingsOf(sim, person).find((a) => !heldFromAbroad(sim, a));
  for (const account of mine) {
    if (!into) break;
    if (person.primaryAccountId === account.id) person.primaryAccountId = into.id;
    redirectAway(sim, person, account.id, into.id);
  }
  const held = heldOf(current);
  let arrives: Instant | undefined;
  if (held > 0 && into) arrives = sendAbroad(sim, person, current, into, held, into.bankId, true);
  // A standing order paying from one of them ends with it, said once below (`endOrdersOf`, from 2026-10-16).
  const ended = mine.flatMap((account) => endOrdersOf(sim, person, account));
  for (const account of mine) {
    account.accrued = 0;
    account.closedAt = sim.now;
    account.overdraftLimit = undefined;
    dropPaymentsFor(sim, person, account);
  }
  if (mineNow) {
    sim.notify({
      category: 'bank', title: `${bank.name} Closed Your Account`,
      body: `${arrives !== undefined && into ? `Its notice ran out. ${heldText(sim, current, held)} is on its way to ${into.name}, arriving ${formatDate(arrives, sim.zone)}, less the payment’s costs.` : 'Its notice ran out, and it held nothing to send.'}${endedWords(sim, ended)}`,
      importance: 70, route: '/workspace/bank',
    });
  }
}

/**
 * What America asks a US person to report of their accounts abroad for a year, said once at its return (from
 * 2026-10-16): FinCEN's FBAR where the accounts' highest figures together passed $10,000, and Form 8938 where they passed
 * $50,000 at the year's end or $75,000 at any time, with the return (`US_REPORTS`). Each account's figures are its own
 * money's, kept each night (`Account.peak`), converted at SLATE's rate, which doesn't move. Nothing for an F-1 student,
 * or anyone with no account abroad or under the line. What SLATE doesn't model is said: filing either form, the
 * penalties, and Treasury's rate for the year's end.
 */
export function foreignAccountsNotice(sim: Simulation, person: Person, year: number, returned: boolean): string | undefined {
  if (!usPerson(person, instantFromZoned({ year, month: 12, day: 31, hour: 12 }, sim.homeZone))) return undefined;
  let most = 0;
  let end = 0;
  for (const account of Object.values(sim.universe.accounts)) {
    const p = account.ownerId === person.id ? account.peak?.[String(year)] : undefined;
    if (!p) continue;
    // An overdrawn account counts as holding nothing: its value to report is never below zero.
    most += toSave(sim, Math.max(0, p.max), moneyOf(sim, account));
    // An account closed in the year held nothing at its end.
    if (!account.closedAt || zonedParts(account.closedAt, sim.homeZone).year > year) end += toSave(sim, Math.max(0, p.last), moneyOf(sim, account));
  }
  const usd = (cents: Money) => toSave(sim, cents, 'USD');
  if (most <= usd(US_REPORTS.fbar.over)) return undefined;
  const cur = saveCurrency(sim.universe);
  const money = (cents: Money) => formatMoney(cents, cur);
  const line = (cents: Money) => formatMoney(usd(cents), cur, { cents: false });
  const on = (d: { month: number; day: number }) => formatDate(instantFromZoned({ year: year + 1, ...d, hour: 12 }, sim.homeZone), sim.homeZone);
  const fbar = `Your accounts at banks outside America held ${money(most)} together at most in ${year} (the highest each held at a day’s end, at an estimated exchange rate), over ${line(US_REPORTS.fbar.over)}. So FinCEN Form 114, the FBAR, is due ${on(US_REPORTS.fbar.due)}, extended automatically to ${on(US_REPORTS.fbar.extended)}, and is filed online with FinCEN, not with your return.`;
  const t = US_REPORTS.form8938;
  const over = [
    ...(end > usd(t.yearEnd) ? [`${money(end)} on December 31, over Form 8938’s ${line(t.yearEnd)} at the year’s end`] : []),
    ...(most > usd(t.anyTime) ? [`${money(most)} at most, over Form 8938’s ${line(t.anyTime)} at any time`] : []),
  ];
  const form8938 = over.length === 0 ? ''
    : returned ? ` They held ${over.join(', and ')}, so Form 8938 goes with your ${year} return.`
    : ` They held ${over.join(', and ')}, but the form goes only with an income tax return, and you have none to file for ${year}.`;
  return `${fbar}${form8938} The game doesn’t file either form for you or charge the penalties for not filing one. It also converts at its own exchange rate, not the Treasury’s rate for the year’s end.`;
}

export function registerAbroad(sim: Simulation): void {
  sim.onSchedule(HOME_CLOSES_KIND, (item, s) => homeCloses(s, item));
}
