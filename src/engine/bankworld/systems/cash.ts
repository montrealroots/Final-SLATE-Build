/**
 * SLATE — cash in hand (module 3 of `docs/BANKING-FUNCTIONS.md`).
 *
 * Until 2026-09-26 money lived only in the bank and on the card. Now a person
 * can hold cash, in a wallet the ledger keeps like any account:
 *
 * - **Taking it out** (A52, A54, A55, A114, A138): at the bank's own ATM, at
 *   another bank's, at the counter, or in Britain at the Post Office where
 *   the bank lets its customers (A33), each for the bank's own fee
 *   (`content/cash.ts`), and the ATMs no more in a day than the bank allows.
 *   Another machine's owner may add a fee of its own: in the US the average,
 *   $3.22 (Bankrate's 2025 survey), and in Australia A$2.63 (the RBA's last
 *   average, 2017), charged since 2026-09-28; elsewhere no average is
 *   published (Canada's regulator gives only $1.50 to $5.00, and LINK only
 *   that a fifth of Britain's machines charge), and SLATE says it may come
 *   on top without knowing what it is.
 * - **On the credit card** (C29, C49, C56, C82): a cash advance, for the
 *   card's fee, at its cash rate from the day it's taken, with no grace
 *   period, within any cash limit it has.
 * - **Paying it in** (A28, A29, A33, A48, B10): at the counter or an ATM,
 *   into the current account or savings, counted and credited as counted.
 * - **Spending it**: the day's groceries paid in cash first, where that's how
 *   they pay (`systems/payments.ts`).
 * - **Germany's savings** (B21): a savings account lets out €2,000 a calendar
 *   month without notice, where the bank confirms it; more needs three
 *   months' notice, which SLATE refuses.
 * - **A payment to the card** (C21) goes to the dearer balance first: a US
 *   card's minimum to the cheaper one and the rest to the dearest (Reg Z
 *   §1026.53), everywhere else all of it to the dearest.
 */

import { depositAccount } from './routing';
import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { instantFromZoned, zonedParts } from '../core/time';
import { exchange } from '../content/currency';
import { bankById } from '../content/banks';
import { CASH } from '../content/cash';
import { CITIES, COUNTRIES } from '../content/geography';
import { cardFor, cardRoom, cardTerms, stateOf } from './credit';
import { planLeftOf, transferRate } from './cardoffers';
import { atmAbroad, balanceText, heldFromAbroad } from './abroad';

export type CashFrom = 'atm' | 'other_atm' | 'counter' | 'post_office' | 'card';
export type CashTo = 'counter' | 'atm' | 'post_office';

/** Their cash in hand: a wallet the ledger keeps, opened the first time it's needed. */
export function walletOf(sim: Simulation, person: Person, open = false): Account | undefined {
  const found = Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && a.kind === 'cash' && !a.closedAt);
  if (found || !open) return found;
  return sim.openAccount({ id: sim.nextId('account'), kind: 'cash', name: 'Cash In Hand', ownerId: person.id, openedAt: sim.now });
}

/**
 * Where money paid to somebody lands: their open current account, or with
 * none open, the payer's check, cashed into their wallet. Until 2026-09-27
 * pay, residuals, a stipend, work-study, unemployment and a tax refund with
 * no open current account to go to were dropped, and what was owed with them.
 */
/**
 * Where a payment to them is paid: the deposit instruction (`depositAccount`, from 2026-10-10: until then whichever
 * account was primary on the day), else the primary account, else cash in hand.
 */
export function payeeAccount(sim: Simulation, person: Person, payer?: string): Account {
  const deposits = depositAccount(sim, person, sim.now, payer);
  if (deposits) return deposits;
  const current = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
  return current && !current.closedAt ? current : walletOf(sim, person, true)!;
}

function inSave(sim: Simulation, amount: Money, currency: string): Money {
  const into = saveCurrency(sim.universe);
  return into === currency ? amount : exchange(amount, currency, into) ?? amount;
}

/** The country they live in, for the machine they'd use. */
function isoHere(person: Person): string | undefined {
  const city = CITIES.get(person.currentLocationId);
  return city ? COUNTRIES.get(city.countryId)?.iso2?.toUpperCase() : undefined;
}

function currentOf(sim: Simulation, person: Person): Account | undefined {
  return person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
}

function dayStart(sim: Simulation): number {
  const p = zonedParts(sim.now, sim.zone);
  return instantFromZoned({ year: p.year, month: p.month, day: p.day, hour: 0 }, sim.zone);
}

/** What's come out of ATMs today, the Post Office's included. */
function atmToday(sim: Simulation, person: Person): Money {
  const since = dayStart(sim);
  const wallet = walletOf(sim, person);
  if (!wallet) return 0;
  return sim.universe.transactions
    .filter((t) => t.at >= since && t.category === 'cash' && /ATM|Post Office/.test(t.memo))
    .reduce((sum, t) => sum + t.postings.filter((p) => p.accountId === wallet.id && p.amount > 0).reduce((a, p) => a + p.amount, 0), 0);
}

/** What a withdrawal of an amount would cost, and whether it may be made, before it's made. */
/** The machine owner's fee where its average is published, by the bank's country, in that country's money. */
export const OWNER_SURCHARGE: Readonly<Record<string, { fee: Money; currency: string; source: string }>> = {
  US: { fee: 3_22, currency: 'USD', source: 'https://www.bankrate.com/banking/checking/checking-account-survey/ (2025: an ATM owner’s surcharge averages $3.22)' },
  AU: { fee: 2_63, currency: 'AUD', source: 'https://www.rba.gov.au/publications/bulletin/2017/dec/6.html (independent ATMs, June 2017, the latest average published)' },
};

export function withdrawalQuote(sim: Simulation, person: Person, amount: Money, from: CashFrom, accountId?: string): { fee: Money; refused?: string; ownerFee?: boolean; ownerCharge?: Money; feeNative?: Money } {
  const cur = saveCurrency(sim.universe);
  if (from === 'card') {
    const card = cardFor(sim, person, accountId);
    if (!card || !person.credit) return { fee: 0, refused: 'You don’t have a card.' };
    const terms = cardTerms(sim, card, person.credit.score);
    const fee = Math.max(terms.cashFeeMin, Math.round(amount * terms.cashFeeShare));
    const room = cardRoom(person, card);
    if (room < amount + fee) return { fee, refused: `The card has ${formatMoney(room, cur)} of its limit left, and this needs ${formatMoney(amount + fee, cur)} with its fee.` };
    const cashOwed = stateOf(person, card).cashOwed ?? 0;
    if (terms.cashLimit !== undefined && cashOwed + amount > terms.cashLimit) return { fee, refused: `The card lets you take ${formatMoney(terms.cashLimit, cur)} out as cash, and ${formatMoney(cashOwed, cur)} is out already.` };
    return { fee };
  }
  const current = currentOf(sim, person);
  const bank = current?.bankId ? bankById(current.bankId) : undefined;
  const rules = bank ? CASH[bank.id] : undefined;
  if (!current || !bank) return { fee: 0, refused: 'You need a checking account to take cash out of.' };
  if (current.dormant) return { fee: 0, refused: `${current.name} is dormant. Reactivate it under Your Accounts Over Time to take cash out of it.` };
  // A machine needs the debit card; the counter doesn't.
  if (from !== 'counter' && current.plastic && (current.plastic.locked || current.plastic.stopped)) return { fee: 0, refused: current.plastic.stopped === 'new' ? 'Your debit card hasn’t arrived yet. You can still take cash out at the counter.' : current.plastic.stopped ? 'Your debit card is stopped. You can still take cash out at the counter.' : 'Your debit card is locked. Unlock it under Your Cards, or take cash out at the counter.' };
  // A card from a bank kept at home (from 2026-10-16): another bank's machine here, for its fee abroad in its own money,
  // and the machine's owner's fee where it's published for the country the machine is in.
  const abroad = atmAbroad(sim, current, amount, from);
  if (abroad && 'refused' in abroad) return { fee: 0, refused: abroad.refused };
  if (abroad) {
    const here = OWNER_SURCHARGE[isoHere(person) ?? ''];
    const owner = here ? inSave(sim, here.fee, here.currency) : 0;
    // In its own money, the dollars beside (from 2026-10-16: until then in dollars alone).
    if (current.balance < amount + abroad.fee + owner) return { fee: abroad.fee, refused: shortWords(sim, current, balanceText(sim, current, Math.max(0, current.balance), Math.max(0, current.held ?? 0)), amount, abroad.fee + owner) };
    return { fee: abroad.fee, feeNative: abroad.native, ...(owner ? { ownerCharge: owner } : { ownerFee: true }) };
  }
  if (from === 'post_office' && !rules?.postOffice) return { fee: 0, refused: `${bank.name}’s customers can’t use the Post Office for cash.` };
  const fee = inSave(sim, from === 'atm' ? rules?.own ?? 0 : from === 'other_atm' ? rules?.other ?? 0 : from === 'counter' ? rules?.teller ?? 0 : 0, bank.currency);
  if (from !== 'counter' && rules?.daily !== undefined) {
    const daily = inSave(sim, rules.daily, bank.currency);
    const used = atmToday(sim, person);
    if (used + amount > daily) return { fee, refused: `${bank.name} lets you take ${formatMoney(daily, cur)} a day out of machines, and you’ve taken ${formatMoney(used, cur)} today.` };
  }
  const owner = from === 'other_atm' && rules?.surcharge ? OWNER_SURCHARGE[bank.iso] : undefined;
  const ownerCharge = owner ? inSave(sim, owner.fee, owner.currency) : 0;
  if (current.balance < amount + fee + ownerCharge) return { fee, refused: shortWords(sim, current, formatMoney(Math.max(0, current.balance), cur), amount, fee + ownerCharge) };
  if (ownerCharge) return { fee, ownerCharge };
  return { fee, ...(from === 'other_atm' && rules?.surcharge ? { ownerFee: true } : {}) };
}

/**
 * A withdrawal the account can't cover, said before it's tried: what the account has, and, where the fees push it over,
 * what the cash and its fees come to (from 2026-10-17, brief 14's editorial review). Until then it said only “… only has
 * $101.00 in it.” of a $100.00 withdrawal refused for its $3.00 fee.
 */
function shortWords(sim: Simulation, current: Account, has: string, amount: Money, fees: Money): string {
  const cur = saveCurrency(sim.universe);
  const holds = current.balance > 0 ? `has only ${has} available` : 'has nothing available';
  return fees > 0 && current.balance > 0
    ? `${current.name} ${holds}, and ${formatMoney(amount, cur)} in cash with its fees comes to ${formatMoney(amount + fees, cur)}.`
    : `${current.name} ${holds}.`;
}

/** The part of what's owed on the card that's cash, cut down to what's owed at all. */
export function cashOwedOn(person: Person, card: Account): Money {
  return Math.max(0, Math.min(person.credit ? stateOf(person, card).cashOwed ?? 0 : 0, -card.balance));
}

/**
 * A payment to the card, split between its balances (C21): cash advances,
 * each transfer, purchases, and plans. A US card's minimum goes to the
 * cheapest first and the rest to the dearest (Reg Z §1026.53); everywhere
 * else all of it to the dearest first. A plan's balance, which asks its
 * months on their own, is paid last. Until 2026-09-26 there were only cash
 * and purchases to split between.
 */
export function allocatePayment(sim: Simulation, person: Person, card: Account, paid: Money, minimum: Money, rates: { cash: number; purchases: number }): void {
  const credit = person.credit ? stateOf(person, card) : undefined;
  if (!credit || (!credit.cashOwed && !credit.transfers?.length && !credit.plans?.length)) return;
  const us = bankById(card.bankId ?? '')?.iso === 'US';
  const owedBefore = -card.balance + paid;
  const transfers = credit.transfers ?? [];
  const cash = credit.cashOwed ?? 0;
  const planLeft = planLeftOf(credit);
  const buckets: { apr: number; owed: Money; take: (amount: Money) => void }[] = [
    { apr: rates.cash, owed: cash, take: (amount) => { credit.cashOwed = Math.max(0, (credit.cashOwed ?? 0) - amount); } },
    ...transfers.map((one) => ({ apr: transferRate(sim, credit, one), owed: one.owed, take: (amount: Money) => { one.owed = Math.max(0, one.owed - amount); } })),
    { apr: rates.purchases, owed: Math.max(0, owedBefore - cash - transfers.reduce((sum, one) => sum + one.owed, 0) - planLeft), take: () => {} },
  ];
  let left = paid;
  const pay = (order: typeof buckets, most: Money) => {
    let room = most;
    for (const bucket of order) {
      const amount = Math.min(bucket.owed, room);
      if (amount <= 0) continue;
      bucket.take(amount);
      bucket.owed -= amount;
      room -= amount;
      left -= amount;
    }
  };
  // The US minimum to the cheapest balance first.
  if (us) pay([...buckets].sort((a, b) => a.apr - b.apr), Math.min(paid, minimum));
  pay([...buckets].sort((a, b) => b.apr - a.apr), left);
  // Then the plans, newest first.
  for (const plan of [...(credit.plans ?? [])].reverse()) {
    const amount = Math.min(plan.left, left);
    plan.left -= amount;
    left -= amount;
  }
  credit.plans = (credit.plans ?? []).filter((plan) => plan.left > 0);
  credit.transfers = transfers.filter((one) => one.owed > 0);
}

export function registerCash(sim: Simulation): void {
  sim.onCommand<{ amount: Money; from: CashFrom; accountId?: string }, { fee: Money; ownerFee?: boolean; ownerCharge?: Money }>('cash.withdraw', (p, { sim: s }) => {
    const person = s.player;
    const amount = Math.round(Number(p.amount));
    if (!(amount > 0)) throw new CommandError('Enter an amount.');
    const from = p.from;
    if (!['atm', 'other_atm', 'counter', 'post_office', 'card'].includes(from)) throw new CommandError('Choose where to take it from: your bank’s ATM, another bank’s, the counter, the Post Office or the card.');
    const quote = withdrawalQuote(s, person, amount, from, p.accountId);
    if (quote.refused) throw new CommandError(quote.refused);
    const wallet = walletOf(s, person, true)!;
    if (from === 'card') {
      const card = cardFor(s, person, p.accountId)!;
      s.post({ memo: 'Cash advance', category: 'cash', postings: [{ accountId: card.id, amount: -amount }, { accountId: wallet.id, amount }] });
      if (quote.fee > 0) s.post({ memo: 'Cash advance fee', category: 'fees', postings: [{ accountId: card.id, amount: -quote.fee }, { accountId: s.nominalAccount('expense', 'Card Fees').id, amount: quote.fee }] });
      const state = stateOf(person, card);
      state.cashOwed = (state.cashOwed ?? 0) + amount;
      return { fee: quote.fee };
    }
    const current = currentOf(s, person)!;
    const where = from === 'atm' ? 'ATM' : from === 'other_atm' ? 'Another bank’s ATM' : from === 'counter' ? 'Counter' : 'Post Office';
    s.post({ memo: `Cash out: ${where}`, category: 'cash', postings: [{ accountId: current.id, amount: -amount }, { accountId: wallet.id, amount }] });
    if (quote.fee > 0) s.post({ memo: `Cash withdrawal fee: ${where}`, category: 'bank_fee', postings: [{ accountId: current.id, amount: -quote.fee, ...(quote.feeNative !== undefined && current.currency ? { native: -quote.feeNative } : {}) }, { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: quote.fee }] });
    if (quote.ownerCharge) s.post({ memo: 'The machine owner’s fee', category: 'bank_fee', postings: [{ accountId: current.id, amount: -quote.ownerCharge }, { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: quote.ownerCharge }] });
    return { fee: quote.fee, ...(quote.ownerFee ? { ownerFee: true } : {}), ...(quote.ownerCharge ? { ownerCharge: quote.ownerCharge } : {}) };
  });

  sim.onCommand<{ amount: Money; toId: string; at: CashTo }, { paid: Money }>('cash.deposit', (p, { sim: s }) => {
    const person = s.player;
    const amount = Math.round(Number(p.amount));
    const wallet = walletOf(s, person);
    if (!(amount > 0)) throw new CommandError('Enter how much cash to pay in.');
    if (!wallet || wallet.balance < amount) throw new CommandError(`You have only ${formatMoney(Math.max(0, wallet?.balance ?? 0), saveCurrency(s.universe))} in cash, so nothing was paid in.`);
    const to = s.universe.accounts[p.toId];
    if (!to || to.ownerId !== person.id || to.closedAt || (to.kind !== 'checking' && to.kind !== 'savings') || to.category === 'term') throw new CommandError('Cash goes into your checking account or savings.');
    const bank = to.bankId ? bankById(to.bankId) : undefined;
    if (p.at === 'post_office' && (!bank || CASH[bank.id]?.postOffice !== 'both')) throw new CommandError(`${bank?.name ?? 'Your bank'}’s customers can’t pay cash in at the Post Office.`);
    // A dormant account takes nothing until it's reactivated, as Move Money into it is refused; and a machine needs the
    // debit card, as one paying out does (from 2026-10-13: until then cash went into a dormant account and it stayed
    // dormant, and an ATM took a deposit with the card locked; found by the review of that day).
    if (to.dormant) throw new CommandError(`${to.name} is dormant, so nothing was paid in. Reactivate it under Your Accounts Over Time, then try again.`);
    // A bank kept at home takes cash only at its own counters and machines, in its country.(from 2026-10-16).
    if (heldFromAbroad(s, to)) throw new CommandError(`${bank?.name ?? 'That bank'} takes cash only at its own counters and machines, in its country.`);
    // The card is the one the bank taking the money issued: the current account’s own, or for savings the current
    // account’s beside it at that bank; the primary’s only where none is open there. Until later on 2026-10-13 it was
    // the primary’s wherever the money went, so Citi’s machine took cash with Citi’s card locked and refused it for
    // Chase’s (found by that day’s third round of defects).
    const atBank = to.kind === 'checking' ? to : Object.values(s.universe.accounts).find((a) => a.ownerId === person.id && !a.closedAt && a.kind === 'checking' && a.bankId === to.bankId);
    const card = (atBank ?? (person.primaryAccountId ? s.universe.accounts[person.primaryAccountId] : undefined))?.plastic;
    if (p.at === 'atm' && card && (card.locked || card.stopped)) throw new CommandError(card.stopped === 'new' ? 'Your debit card hasn’t arrived yet. You can still pay cash in at the counter.' : card.stopped ? 'Your debit card is stopped. You can still pay cash in at the counter.' : 'Your debit card is locked. You can still pay cash in at the counter.');
    const where = p.at === 'atm' ? 'ATM' : p.at === 'post_office' ? 'Post Office' : 'Counter';
    s.post({ memo: `Cash in: ${where}`, category: 'cash', postings: [{ accountId: wallet.id, amount: -amount }, { accountId: to.id, amount }] });
    return { paid: amount };
  });
}

/** Germany's €2,000 a month from savings without notice, where the bank confirms it: what's left this month, or undefined where there's no such limit. */
export function savingsLeftThisMonth(sim: Simulation, account: Account): Money | undefined {
  if (account.kind !== 'savings' || !account.bankId) return undefined;
  const monthly = CASH[account.bankId]?.savingsMonthly;
  if (monthly === undefined) return undefined;
  const bank = bankById(account.bankId)!;
  // The bank's month, as every other bank month is kept; until 2026-09-27 the clock's zone's.
  const p = zonedParts(sim.now, sim.homeZone);
  const since = instantFromZoned({ year: p.year, month: p.month, day: 1, hour: 0 }, sim.homeZone);
  let out = 0;
  const list = sim.universe.transactions;
  for (let i = list.length - 1; i >= 0 && list[i]!.at >= since; i -= 1) {
    const t = list[i]!;
    if (t.category === 'interest' || t.category === 'bank_fee') continue;
    for (const q of t.postings) if (q.accountId === account.id && q.amount < 0) out -= q.amount;
  }
  return Math.max(0, inSave(sim, monthly, bank.currency) - out);
}
