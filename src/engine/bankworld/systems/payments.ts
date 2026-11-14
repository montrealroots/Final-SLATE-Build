/**
 * SLATE — how each thing is paid.
 *
 * Until 2026-09-26 every payment fell through the same chute: the current
 * account, then savings, then the overdraft, then the card, then owed to the
 * landlord. No real account works like that, and nobody chose any of it.
 * Now each is paid the way the character pays it (module 2 of
 * `docs/BANKING-FUNCTIONS.md`):
 *
 * - **Everyday spending**, the day's groceries and a meal, on the debit card,
 *   the credit card or in cash (C27), through `spend` in
 *   `systems/spending.ts`.
 * - Savings pays nothing directly: it backs a current account only where
 *   the holder links it as overdraft protection (A108, B13, B19). The link
 *   covers each current account a payment comes from with easy-access
 *   savings at the same bank: the primary, and a loan's repayment account at
 *   another bank (`linkCovers`). The money was drawn that way from
 *   2026-10-10; How You Pay said so from 2026-10-12, group r3b, and until
 *   then counted the primary account's bank alone.
 * - **Standing orders** of the holder's own, into savings on a day each
 *   month (A67, B8), and **one-off payments** scheduled for a date (A70).
 *   Between two of the holder's banks each goes as Move Money goes, out on
 *   its day and in on the sending bank's, held to its limits, and neither
 *   touches a term deposit or an account the bank has blocked (from
 *   2026-10-12: until then each went straight across on its day).
 *
 * Until the connected world of 2026-10-09 the rent and the bills were paid
 * here too, each the country's usual way (`content/payments.ts`): a
 * standing order, a direct debit, a check posted and cashed days later, or
 * by hand. A check could be stopped for the bank's fee, and a SEPA direct
 * debit taken back within eight weeks. The home and its rent and bills went
 * in the scope reset of 2026-10-09, nothing else in the game was paid by
 * check or by direct debit, and those went with them: `bank.stop_check`,
 * `bank.reclaim_debit`, the settings for the rent and the bills, and the
 * countries' norms that set them.
 */

import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { dateKey, instantFromZoned, zonedParts, type Instant } from '../core/time';
import { bankById } from '../content/banks';
import { businessDay, daysOfAccount } from '../content/bankdays';
import { savingsDebit } from './accountlife';
import { orderSource } from './routing';
import { sendBetweenBanks } from './bankmoves';
import { loansOf, repaymentAccount } from './lending';
import { autopaySource, cardsOf } from './credit';

export interface StandingOrder { id: string; toId: string; amount: Money; day: number; /** The account it pays from (from 2026-10-10, `orderSource`). */ fromId?: string }

export interface PaymentSettings {
  everyday: 'debit' | 'credit' | 'cash';
  /** Savings backs the current account (overdraft protection). */
  linkSavings: boolean;
  standingOrders: StandingOrder[];
  /** Where incoming payments go, and a change to it with its day (`systems/routing.ts`, from 2026-10-10). */
  depositTo?: string;
  /**
   * Every switch asked for and how it ended (from 2026-10-10, `systems/lending.ts`): declined by the new bank at its
   * first look, called off, completed, completed with the old account held open on pending payments or a debt, with
   * its balance left where it was, or a partial switch.
   */
  switches?: { at: Instant; fromBank?: string; toBank: string; outcome: 'declined' | 'canceled' | 'complete' | 'held' | 'debt' | 'balance-kept' | 'partial'; why?: string; on?: Instant }[];
  /** `from`: the day each payer with a lead of its own (`PAYER_LEAD`) pays to the new account, from 2026-10-10. */
  depositChange?: { to: string; at: number; from?: Record<string, number> };
}

export const STANDING_ORDER_KIND = 'bank.standing_order';
export const SCHEDULED_KIND = 'bank.scheduled_payment';

/** A new life's settings: the debit card, and savings unlinked, as a bank opens it. */
export function freshPayments(): PaymentSettings {
  return { everyday: 'debit', linkSavings: false, standingOrders: [] };
}

/**
 * A person's settings. A save from before 2026-09-26 has none, and keeps the
 * way it ran: everything from the bank on the day, savings swept.
 */
export function paymentsOf(person: Person): PaymentSettings {
  return person.payments ?? { everyday: 'debit', linkSavings: true, standingOrders: [] };
}

/** A current account a payment comes from, what it pays, and the savings the link draws on for it (`linkCovers`). */
export interface LinkCover {
  /** The account, or nothing where there's no primary account. */
  from: Account | undefined;
  /** The primary, which pays the day's spending. */
  primary: boolean;
  /** The cards whose autopay comes from it (from 2026-10-12). */
  cards: Account[];
  /** The open loans repaid from it. */
  loans: Account[];
  /** Easy-access savings at its bank, which the link draws on for it, or nothing. */
  savings: Account | undefined;
}

/**
 * Each current account a payment comes from, with the savings the link draws on for it, as `drawFromBank` in
 * `systems/spending.ts` draws: easy-access savings at that account's own bank, or at any bank for an account at none.
 * The primary account comes first. Each open loan is repaid from its repayment account (`payFromBank` and
 * `repaymentAccount` in `systems/lending.ts`), which a change of primary doesn't move, so a loan repaid from another
 * bank's current account draws on linked savings at that bank. A card's autopay comes from the account it's set on
 * (`autopaySource` in `systems/credit.ts`), which a change of primary pins where it was, and draws on linked savings at
 * that account's bank (`payCard`); until later on 2026-10-12 it drew none from another account than the primary, and
 * wasn't counted here, so a card's autopay from Chase bounced with Chase savings full while the screen said the link
 * covered Chase's current account.
 *
 * From 2026-10-12, group r3b. Until then How You Pay and `bank.set_payments` read the primary account's bank alone
 * (`linkableSavings`, removed later on 2026-10-12 when nothing but two tests read it), and said the link reached nothing more, while the money code drew it at a loan's repayment
 * account's bank: with Chase savings, a Citi loan repaid from Chase and Citi made primary, the screen said On covered
 * nothing and the bank refused to turn it On, though On paid that loan from Chase savings.
 */
export function linkCovers(sim: Simulation, person: Person): LinkCover[] {
  const primary = person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
  const covers: LinkCover[] = [{ from: primary, primary: true, cards: [], loans: [], savings: undefined }];
  const coverOf = (from: Account | undefined): LinkCover => {
    const had = covers.find((one) => one.from?.id === from?.id);
    if (had) return had;
    const made: LinkCover = { from, primary: false, cards: [], loans: [], savings: undefined };
    covers.push(made);
    return made;
  };
  // A card with autopay (`autopaySource`; a card at no account pays nothing by itself), and each loan (where there's no
  // repayment account, `drawFromBank` draws on the primary).
  for (const card of person.credit ? cardsOf(sim, person) : []) {
    const from = autopaySource(sim, person, card);
    if (from && !from.closedAt) coverOf(from).cards.push(card);
  }
  for (const loan of loansOf(sim, person)) coverOf(repaymentAccount(sim, person, loan) ?? primary).loans.push(loan);
  const savings = Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.nominal && !a.closedAt && a.kind === 'savings' && a.category !== 'term');
  for (const cover of covers) cover.savings = savings.find((a) => !cover.from?.bankId || a.bankId === cover.from.bankId);
  return covers;
}

/**
 * The banks of the current accounts payments come from, as a sentence names them: “Citi”, or “Citi or Chase”. Each
 * is at a bank of its own, as a bank opens one current account to a holder.
 */
export function coveredBanks(covers: LinkCover[]): string {
  const names = covers.map((one) => one.from?.institution ?? 'your bank');
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` : names[0] ?? 'your bank';
}

function settle(person: Person): PaymentSettings {
  if (!person.payments) person.payments = paymentsOf(person);
  return person.payments;
}

/**
 * Where a standing order dated on a day that isn't the paying bank's business day is made on the first business day
 * after (from 2026-10-22, the owner's brief 21): Britain, by the Payment Services Regulations 2017, reg. 81(5) and (6)
 * ("deemed to have been received on the first business day thereafter"), as Lloyds Bank and NatWest say of their own;
 * and the EU and the EEA, by Directive (EU) 2015/2366 (PSD2), art. 78(2), which Germany's BGB §675n(2) and Iceland's
 * Act no. 114/2021 carry. Elsewhere no bank's or payment system's rule was found for a transfer between the holder's own
 * accounts, and it's made on its date, SLATE's assumption, as every standing order was until then
 * (docs/verification/genre-banking-2026-10-22/banking-sources.md).
 */
export const NEXT_BUSINESS_DAY: ReadonlySet<string> = new Set([
  'GB', 'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE', 'IS', 'NO', 'LI',
]);

/** The first of a paying bank's business days on or after a moment's date, at nine, where its rules move an order; else none. */
export function orderDayOf(sim: Simulation, person: Person, from: Account, at: Instant): Instant | undefined {
  const iso = from.bankId ? bankById(from.bankId)?.iso : undefined;
  if (!iso || !NEXT_BUSINESS_DAY.has(iso)) return undefined;
  const kept = daysOfAccount(from, person);
  for (let k = 0; k < 15; k += 1) {
    const p = zonedParts(at, sim.zone);
    const day = instantFromZoned({ year: p.year, month: p.month, day: p.day + k, hour: 9 }, sim.zone);
    if (businessDay(kept.countryId, dateKey(day, sim.zone), kept.regionId)) return k === 0 ? undefined : day;
  }
  return undefined;
}

function nextOn(sim: Simulation, day: number, after: Instant): Instant {
  const zone = sim.zone;
  const p = zonedParts(after, zone);
  const clamp = (y: number, m: number) => Math.min(day, new Date(Date.UTC(y, m, 0)).getUTCDate());
  let at = instantFromZoned({ year: p.year, month: p.month, day: clamp(p.year, p.month), hour: 9 }, zone);
  if (at <= after) {
    const y = p.month === 12 ? p.year + 1 : p.year;
    const m = p.month === 12 ? 1 : p.month + 1;
    at = instantFromZoned({ year: y, month: m, day: clamp(y, m), hour: 9 }, zone);
  }
  return at;
}

/**
 * Why the bank won't make a payment between two of the holder's accounts on its day, as `bank.transfer` refuses one,
 * or nothing: a term deposit, locked until its end; an account dormant or closing; or one a switch left in debt,
 * blocked to all but repayment. Until 2026-10-12 a standing order and a payment set for a date read none of them, and
 * a payment a save set from a term deposit before then took money out of it with no penalty.
 */
function blockedBy(from: Account, to: Account): string | undefined {
  const term = [from, to].find((a) => a.category === 'term');
  if (term) return `${term.name} is a term deposit, locked until its end`;
  if (from.switchDebt) return `${from.name} is blocked: it was overdrawn when you switched banks, and it stays blocked until the overdraft is paid off. Move money into it to clear what it owes`;
  const dormant = [from, to].find((a) => a.dormant);
  if (dormant) return `${dormant.name} is dormant. Reactivate it under Your Accounts Over Time`;
  const closing = [from, to].find((a) => a.closingAt !== undefined);
  if (closing) return `${closing.name} is closing`;
  return undefined;
}

/**
 * Sends a payment between two of the holder's banks as Move Money sends it (`sendBetweenBanks`): out now, in on the
 * sending bank's day, held to Citi's limits. Until 2026-10-12 it went straight across on the day, whatever the two
 * banks were. Returns why the sending bank refused it, or nothing.
 */
function sendAcross(s: Simulation, person: Person, from: Account, to: Account, amount: Money): string | undefined {
  try {
    sendBetweenBanks(s, person, from, to, amount);
    return undefined;
  } catch (error) {
    if (error instanceof CommandError) return error.message.replace(/\.$/, '');
    throw error;
  }
}

export function registerPayments(sim: Simulation): void {
  // A standing order of the holder's own: made on its day if the current account can make it.
  sim.onSchedule(STANDING_ORDER_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const order = person ? paymentsOf(person).standingOrders.find((one) => one.id === item.payload.orderId) : undefined;
    if (!person || !order) return;
    // From the account it was set up on (`orderSource`, from 2026-10-10: until then whichever was primary on its day).
    const source = orderSource(s, person, order);
    const current = source && !source.closedAt ? source : undefined;
    // Not the paying bank's business day, where its rules say so: made on the next (`orderDayOf`, from 2026-10-22), the
    // month after's on its own date again.
    const moved = current ? orderDayOf(s, person, current, item.at) : undefined;
    if (moved !== undefined) {
      s.schedule({ at: moved, kind: STANDING_ORDER_KIND, label: 'Standing Order', category: 'home', priority: 37, payload: { personId: person.id, orderId: order.id } });
      return;
    }
    const to = s.universe.accounts[order.toId];
    const open = to && !to.closedAt ? to : undefined;
    let why: string | undefined;
    if (!open) why = `${to?.name ?? 'The account'} is closed`;
    else if (!current) why = `${source?.name ?? 'The account it pays from'} is closed`;
    else {
      why = blockedBy(current, open) ?? (current.balance >= order.amount ? undefined : `There wasn’t enough available in ${current.name} that day. Move money into it before the order’s next date`);
      if (!why && current.bankId !== open.bankId) why = sendAcross(s, person, current, open, order.amount);
      else if (!why) s.post({ memo: `Standing order to ${open.name}`, category: 'transfer', postings: [{ accountId: current.id, amount: -order.amount }, { accountId: open.id, amount: order.amount }] });
    }
    if (why && person.id === s.universe.playerId) {
      s.notify({ category: 'bank', title: 'A Standing Order Didn’t Go', body: `Your ${formatMoney(order.amount, saveCurrency(s.universe))} standing order to ${to?.name ?? 'your savings'} didn’t go through. ${why}.`, importance: 50, route: '/workspace/bank' });
    }
    s.schedule({ at: nextOn(s, order.day, item.at), kind: STANDING_ORDER_KIND, label: 'Standing Order', category: 'home', priority: 37, payload: { personId: person.id, orderId: order.id } });
  });

  // A one-off payment set for a date.
  sim.onSchedule(SCHEDULED_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    if (!person) return;
    const from = s.universe.accounts[String(item.payload.fromId)];
    const to = s.universe.accounts[String(item.payload.toId)];
    const amount = Number(item.payload.amount);
    if (!from || !to) return;
    // An account closed since it was set: said, not passed over in silence (from 2026-10-10), as a standing order says it.
    if (from.closedAt || to.closedAt) {
      if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'A Scheduled Payment Didn’t Go', body: `Your ${formatMoney(amount, saveCurrency(s.universe))} payment to ${to.name} didn’t go through, because ${from.closedAt ? from.name : to.name} is closed.`, importance: 50, route: '/workspace/bank' });
      return;
    }
    // From savings, what it lets out, and its withdrawal fee: until 2026-09-27 neither was read here.
    const { room, fee } = from.kind === 'savings' ? savingsDebit(s, from) : { room: from.balance, fee: 0 };
    const short = room < amount;
    const across = from.bankId !== to.bankId;
    const refused = blockedBy(from, to) ?? (!short && across ? sendAcross(s, person, from, to, amount) : undefined);
    if (!refused && !short) {
      if (!across) s.post({ memo: `Scheduled payment to ${to.name}`, category: 'transfer', postings: [{ accountId: from.id, amount: -amount }, { accountId: to.id, amount }] });
      if (fee > 0) s.post({ memo: `Savings withdrawal fee: ${from.name}`, category: 'bank_fee', postings: [{ accountId: from.id, amount: -fee }, { accountId: s.nominalAccount('expense', 'Bank Fees').id, amount: fee }] });
    } else if (person.id === s.universe.playerId) {
      s.notify({ category: 'bank', title: 'A Scheduled Payment Didn’t Go', body: refused ? `Your ${formatMoney(amount, saveCurrency(s.universe))} payment to ${to.name} didn’t go through. ${refused}.` : `Your ${formatMoney(amount, saveCurrency(s.universe))} payment to ${to.name} didn’t go through: there wasn’t enough available in ${from.name} that day. You can set it up again under How You Pay.`, importance: 50, route: '/workspace/bank' });
    }
  });

  sim.onCommand<{ everyday?: 'debit' | 'credit' | 'cash'; linkSavings?: boolean }, { payments: PaymentSettings }>('bank.set_payments', (p, { sim: s }) => {
    const person = s.player;
    const pay = settle(person);
    if (p.everyday !== undefined) {
      if (p.everyday !== 'debit' && p.everyday !== 'credit' && p.everyday !== 'cash') throw new CommandError('Everyday spending goes in cash, on the debit card or on the credit card.');
      pay.everyday = p.everyday;
    }
    // On only where it covers something: easy-access savings at the bank of a current account a payment comes from, the
    // primary or a loan's repayment account (`linkCovers`). Until 2026-10-12 savings at any bank let it be turned on,
    // and then it covered nothing. Later the same day, until group r3b, only the primary account's bank was read, so it
    // was refused with savings at the bank of a loan's repayment account, though On paid that loan from it.
    const covers = linkCovers(s, person);
    if (p.linkSavings === true && !covers.some((one) => one.savings)) throw new CommandError(`There’s no savings account at ${coveredBanks(covers)} to cover ${covers.length > 1 ? 'the checking accounts your payments come from' : 'your checking account'}.`);
    if (p.linkSavings !== undefined) pay.linkSavings = Boolean(p.linkSavings);
    return { payments: pay };
  });

  sim.onCommand<{ toId: string; amount: Money; day: number }, { id: string }>('bank.add_standing_order', (p, { sim: s }) => {
    const person = s.player;
    const to = s.universe.accounts[p.toId];
    if (!to || to.ownerId !== person.id || to.closedAt || to.kind !== 'savings') throw new CommandError('A standing order can only go into one of your savings accounts.');
    // Until 2026-10-12 a term deposit was taken here, and money went into it every month though the screen never offered it.
    if (to.category === 'term') throw new CommandError(`${to.name} is a term deposit, locked until its end. A standing order goes into easy-access savings.`);
    const amount = Math.round(Number(p.amount));
    if (!(amount > 0)) throw new CommandError('Enter how much to pay each month.');
    const day = Math.round(Number(p.day));
    if (!(day >= 1 && day <= 31)) throw new CommandError('Pick a day of the month, 1 to 31.');
    const order = { id: s.nextId('sched'), toId: to.id, amount, day };
    settle(person).standingOrders.push(order);
    s.schedule({ at: nextOn(s, day, s.now), kind: STANDING_ORDER_KIND, label: 'Standing Order', category: 'home', priority: 37, payload: { personId: person.id, orderId: order.id } });
    return { id: order.id };
  });

  sim.onCommand<{ id: string }, { id: string }>('bank.cancel_standing_order', (p, { sim: s }) => {
    const pay = settle(s.player);
    if (!pay.standingOrders.some((one) => one.id === p.id)) throw new CommandError('That standing order no longer exists.');
    pay.standingOrders = pay.standingOrders.filter((one) => one.id !== p.id);
    for (const item of s.universe.scheduled) {
      if (item.kind === STANDING_ORDER_KIND && item.status === 'pending' && item.payload.orderId === p.id) s.timeline.cancel(item.id, s.now);
    }
    return { id: p.id };
  });

  sim.onCommand<{ fromId: string; toId: string; amount: Money; at: Instant }, { id: string }>('bank.schedule_payment', (p, { sim: s }) => {
    const person = s.player;
    const from = s.universe.accounts[p.fromId];
    const to = s.universe.accounts[p.toId];
    const mine = (a?: Account) => a && a.ownerId === person.id && !a.closedAt && (a.kind === 'checking' || a.kind === 'savings');
    if (!mine(from) || !mine(to) || from!.id === to!.id) throw new CommandError('A payment set for a date goes between two of your own accounts.');
    // Until 2026-10-12 a term deposit was taken here too, so money went into one, or came out of it with no penalty.
    const term = [from!, to!].find((a) => a.category === 'term');
    if (term) throw new CommandError(`${term.name} is a term deposit, locked until its end. A payment set for a date goes between your checking and easy-access savings accounts.`);
    const amount = Math.round(Number(p.amount));
    if (!(amount > 0)) throw new CommandError('Enter an amount.');
    const at = Number(p.at);
    if (!(at > s.now)) throw new CommandError('Choose a date in the future.');
    const item = s.schedule({ at, kind: SCHEDULED_KIND, label: `Payment To ${to!.name}`, category: 'home', priority: 37, payload: { personId: person.id, fromId: from!.id, toId: to!.id, amount } });
    return { id: item.id };
  });

  sim.onCommand<{ id: string }, { id: string }>('bank.cancel_scheduled', (p, { sim: s }) => {
    const item = s.universe.scheduled.find((one) => one.id === p.id && one.kind === SCHEDULED_KIND && one.status === 'pending' && one.payload.personId === s.player.id);
    if (!item) throw new CommandError('That payment is no longer scheduled.');
    s.timeline.cancel(item.id, s.now);
    return { id: p.id };
  });
}

/** A standing order's calendar entries, for a save opened again. */
export function armPayments(sim: Simulation): void {
  for (const person of Object.values(sim.universe.people)) {
    if (!person.payments) continue;
    for (const order of person.payments.standingOrders) {
      const armed = sim.universe.scheduled.some((one) => one.kind === STANDING_ORDER_KIND && one.status === 'pending' && one.payload.orderId === order.id);
      if (!armed) sim.schedule({ at: nextOn(sim, order.day, sim.now), kind: STANDING_ORDER_KIND, label: 'Standing Order', category: 'home', priority: 37, payload: { personId: person.id, orderId: order.id } });
    }
  }
}
