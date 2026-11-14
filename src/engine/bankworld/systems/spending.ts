// 1221's systems/spending.ts, the part a bank needs (1221 at d6eba5d; ported November 14, 2026): paying for something
// by card, by debit card or in cash, with its round-ups and its hold; drawing a payment from the current account, linked
// savings and the overdraft; paying from the bank; owing what went unpaid; what is wrong with the money (`troubles`); and
// the expense line a category posts to. Each function is 1221's, word for word, except where a comment marked
// "SLATE:" says otherwise. What stayed in 1221: the day's food and meals and their prices (SLATE's productions,
// equipment and travel are what a SLATE life buys), the worry an unpaid day brings (1221's wellbeing), and the tax owed
// and its penalties in `troubles` (taxes are excluded by the owner).
import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account } from '../core/ledger';
import type { Money } from '../core/money';
import { cardCeilingRoom, chargeForItem, chargeForPurchase, chargeReturned, overdraftHeadroom, purchaseMayOverdraw } from './lending';
import { paymentsOf } from './payments';
import { cardRoom, cardsOf, cardOf as everydayCard, stateOf } from './credit';
import { savingsDebit } from './accountlife';
import { countRoundUp, roundUpFor, roundUpsOn, roundsUpCard, wholePurchase } from './roundups';
import { hold } from './pending';

const CARD_FULL = 0.9;

const accountsOf = (sim: Simulation, person: Person) =>
  Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && !a.nominal && !a.closedAt);

function checkingOf(sim: Simulation, person: Person): Account | undefined {
  return person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
}

/** The everyday card, where the day's spending goes. */
function cardOf(sim: Simulation, person: Person): Account | undefined {
  return everydayCard(sim, person);
}

/** What went unpaid and is owed, as a positive amount. */
export function arrearsOf(sim: Simulation, person: Person): Money {
  const owed = accountsOf(sim, person).find((a) => a.kind === 'loan' && a.category === 'arrears');
  return owed ? Math.max(0, -owed.balance) : 0;
}

/** Where what went unpaid is kept: the account a save's unpaid rent was kept in until 2026-10-09, or a new one. */
export function arrearsAccount(sim: Simulation, person: Person): Account {
  const found = accountsOf(sim, person).find((a) => a.kind === 'loan' && a.category === 'arrears');
  if (found) return found;
  return sim.openAccount({
    id: sim.nextId('account'), kind: 'loan', name: 'Bills Owed', ownerId: person.id,
    institution: 'Unpaid', openedAt: sim.now, category: 'arrears', apr: 0,
  });
}

/**
 * Easy-access savings at the same bank as a current account (the primary one where none is named): a term deposit is
 * locked until its end, and a link to savings is a link at one bank (from 2026-10-10, when a second bank's could be
 * kept; until then the first savings account found anywhere).
 */
function savingsOf(sim: Simulation, person: Person, checking = checkingOf(sim, person)): Account | undefined {
  return accountsOf(sim, person).find((a) => a.kind === 'savings' && a.category !== 'term' && (!checking?.bankId || a.bankId === checking.bankId));
}

/** What can come out of savings now, its fee and any monthly allowance allowed for. */
function savingsRoom(sim: Simulation, person: Person, checking = checkingOf(sim, person)): Money {
  const savings = savingsOf(sim, person, checking);
  return savings ? savingsDebit(sim, savings).room : 0;
}

/**
 * What a current account and the easy-access savings at its bank can pay between them, now: the primary's, or the
 * account a payment comes from (from 2026-10-12, for a card's autopay from another account than the primary).
 */
export function inTheBank(sim: Simulation, person: Person, from?: Account): Money {
  const checking = from && !from.closedAt ? from : checkingOf(sim, person);
  return Math.max(0, checking?.balance ?? 0) + savingsRoom(sim, person, checking);
}

/** What a payment from the current account can reach: the account, and savings where it's linked to it. */
function reachable(sim: Simulation, person: Person): Money {
  return Math.max(0, checkingOf(sim, person)?.balance ?? 0) + (paymentsOf(person).linkSavings ? savingsRoom(sim, person) : 0);
}

/**
 * The postings that take an amount out of checking, then savings, as far as
 * they go, then, where asked, the current account's overdraft
 * (`systems/lending.ts`), and what's left.
 */
export function drawFromBank(sim: Simulation, person: Person, amount: Money, withOverdraft = false, fromSavings = paymentsOf(person).linkSavings, from?: Account): { postings: { accountId: string; amount: Money }[]; short: Money } {
  const postings: { accountId: string; amount: Money }[] = [];
  let left = amount;
  // From the account an instruction names (from 2026-10-10: a loan's bank's, a card's autopay account), else the primary.
  const checking = from && !from.closedAt ? from : checkingOf(sim, person);
  if (checking && left > 0) {
    const take = Math.min(left, Math.max(0, checking.balance));
    if (take > 0) {
      postings.push({ accountId: checking.id, amount: -take });
      left -= take;
    }
  }
  // From savings, what it lets out, and the bank's fee for the withdrawal beside it.
  const savings = fromSavings ? savingsOf(sim, person, checking) : undefined;
  if (savings && left > 0) {
    const { room, fee } = savingsDebit(sim, savings);
    const take = Math.min(left, room);
    if (take > 0) {
      postings.push({ accountId: savings.id, amount: -take });
      if (fee > 0) postings.push({ accountId: savings.id, amount: -fee }, { accountId: sim.nominalAccount('expense', 'Bank Fees').id, amount: fee });
      left -= take;
    }
  }
  // The account drawn on runs into its own overdraft: the primary's in the bank's way, another bank's to its arranged
  // limit (from 2026-10-10: until then the primary's alone, and a loan or autopay from a second bank couldn't use one).
  if (withOverdraft && checking && left > 0) {
    const take = Math.min(left, overdraftHeadroom(sim, person, checking));
    if (take > 0) {
      postings.push({ accountId: checking.id, amount: -take });
      left -= take;
    }
  }
  return { postings, short: left };
}

/**
 * What the current account (with linked savings), its overdraft where it may be used, and the card can pay between
 * them, now. Cash in hand isn't counted (from 2026-10-12): `spendRefusal` adds it where `spend` spends it. Until then
 * it was counted here for every payer and every payment, though `spend` spends it only on food, for somebody paying
 * the day in cash or behind a locked debit card. So with a cent in the account, $3 left on the credit card and $100
 * in cash, a meal paid by debit card was bought by owing it in Bills Owed with nothing owed allowed, and one paid by
 * credit card didn't balance.
 */
export function canPay(sim: Simulation, person: Person, overdraft = true): Money {
  const free = cardRoom(person, cardOf(sim, person));
  return reachable(sim, person) + (overdraft ? overdraftHeadroom(sim, person) : 0) + free;
}

/** Cash in hand, as far as there is any. */
function cashInHand(sim: Simulation, person: Person): Money {
  return Math.max(0, accountsOf(sim, person).find((a) => a.kind === 'cash')?.balance ?? 0);
}

/**
 * A payment the person makes themselves and points at their money, as a tax
 * bill is paid from any account named: checking, then savings, whether or not
 * savings is linked. Until 2026-09-28 a tax bill reached only what
 * checking and linked savings held, and was refused as more than the bank
 * could cover with millions in savings.
 */
export function payFromBank(sim: Simulation, person: Person, amount: Money, memo: string, category: string): boolean {
  if (amount <= 0) return true;
  if (inTheBank(sim, person) < amount) return false;
  const bank = drawFromBank(sim, person, amount, false, true);
  if (bank.short > 0) return false;
  sim.post({ memo, category, postings: [{ accountId: sim.nominalAccount('expense', expenseFor(category)).id, amount }, ...bank.postings] });
  return true;
}

/**
 * Pays from the current account, its overdraft and any savings linked to it,
 * all of it or none, as a direct debit, standing order or cashed check is
 * paid. True if it went.
 */
export function payFromCurrent(sim: Simulation, person: Person, amount: Money, memo: string, category: string): boolean {
  if (amount <= 0) return true;
  if (reachable(sim, person) + overdraftHeadroom(sim, person) < amount) return false;
  const current = checkingOf(sim, person);
  const before = current?.balance ?? 0;
  const bank = drawFromBank(sim, person, amount, true);
  sim.post({ memo, category, postings: [{ accountId: sim.nominalAccount('expense', expenseFor(category)).id, amount }, ...bank.postings] });
  if (current && current.balance < 0 && current.balance < before) chargeForItem(sim, person, before - current.balance);
  return true;
}

/** Owes an amount for what went unpaid. Until 2026-10-09 it was owed to the landlord. */
export function owe(sim: Simulation, person: Person, amount: Money, memo: string, category: string): void {
  if (amount <= 0) return;
  sim.post({ memo: `${memo}, unpaid`, category, postings: [{ accountId: sim.nominalAccount('expense', expenseFor(category)).id, amount }, { accountId: arrearsAccount(sim, person).id, amount: -amount }] });
}

/**
 * The ledger's expense line for a payment's category. Until 2026-09-27
 * anything not rent or bills went to Food, so union dues, health premiums,
 * tax paid and the work's costs all read as food. Rent, bills, travel,
 * vehicles, land and building a house went from it with their systems on
 * 2026-10-09; the lines a save posted to then are still in its ledger.
 */
const EXPENSE_LINE: Record<string, string> = { food: 'Food', dues: 'Union Dues', health: 'Medical Care', tax: 'Tax Paid', career: 'Work Costs', school: 'School', documents: 'Documents And Their Fees' };
export const expenseFor = (category: string) => EXPENSE_LINE[category] ?? 'Other';



const CANT_AFFORD = 'You can’t afford it.';
// What would spend the cash, and where (from brief 15, 2026-10-19): until then “The bank and the card can’t pay it. Cash
// in hand pays for the day where The Day’s Spending is In Cash, Then The Debit Card.” A locked or stopped debit card
// spends it too, but never reaches these words (`spendRefusal`).
const CASH_UNSPENT = 'Your bank and card can’t cover it. Your cash in hand would, but it isn’t spent while The Day’s Spending is on a card. Set it to In Cash, Then The Debit Card, under How You Pay.';

/**
 * Why `spend` would refuse an amount now, with nothing owed allowed, in the world's words, or nothing if it would go
 * through (from 2026-10-12). It is `spend`'s own precondition, and `spend` asks it first, so a purchase offered on
 * it isn't then refused by `spend`. Until then Look After Yourself asked `canPay` with the overdraft counted whatever
 * the bank: at Chase with no debit card opt-in, a cent in the account and $500 of overdraft headroom, the menu
 * offered a meal and the command, after the hour, said the payment didn't go through.
 *
 * Cash in hand counts where `spend` spends it, for food alone: first for somebody paying the day in cash, and behind
 * a locked or stopped debit card for anybody (from 2026-10-12, later the same day). Until then it counted for every
 * payer and every payment through `canPay`, so somebody paying by card with a cent in the account, $3 left on the
 * credit card and $100 in cash was offered a $7 meal: by debit card it was owed in Bills Owed, by credit card the
 * command failed on a transaction that didn't balance. A payment that isn't food was owed the same way.
 */
export function spendRefusal(sim: Simulation, person: Person, amount: Money, category: string): string | undefined {
  if (amount <= 0) return undefined;
  const food = category === 'food';
  // A debit card purchase goes into an overdraft only where the bank may pay it there.
  const overdraft = !food || purchaseMayOverdraw(sim, person);
  const cash = food ? cashInHand(sim, person) : 0;
  const cardFree = cardRoom(person, cardOf(sim, person));
  const reach = canPay(sim, person, overdraft);
  const everyday = paymentsOf(person).everyday;
  // A debit card locked or stopped: the credit card and the cash in hand, whichever way the day is paid.
  const plastic = food ? checkingOf(sim, person)?.plastic : undefined;
  if (plastic && (plastic.locked || plastic.stopped)) {
    if (cardFree + cash >= amount) return undefined;
    return reach + cash < amount ? CANT_AFFORD : `Your debit card is ${plastic.stopped ? 'stopped' : 'locked'}, and there isn’t enough on the credit card or in cash.`;
  }
  // The rest after the cash somebody paying the day in cash spends first; paid by card, the cash isn't spent, and the
  // words say what would spend it.
  const left = everyday === 'cash' ? amount - Math.min(amount, cash) : amount;
  if (reach < left) return everyday !== 'cash' && reach + cash >= amount ? CASH_UNSPENT : CANT_AFFORD;
  if (!food) return undefined;
  // A French debit card past its ceiling: what's left after what a credit card payer's card takes first goes on the
  // credit card, or isn't bought.
  const room = cardCeilingRoom(sim, person);
  if (room === undefined) return undefined;
  const creditFirst = everyday === 'credit' ? Math.min(left, cardFree) : 0;
  return left - creditFirst > room && cardFree < left ? 'Your debit card is past its payment ceiling, and there isn’t enough on the credit card.' : undefined;
}

/** Whether `spend` would pay an amount now with nothing owed allowed (`spendRefusal`). */
export function canSpend(sim: Simulation, person: Person, amount: Money, category: string): boolean {
  return spendRefusal(sim, person, amount, category) === undefined;
}

/**
 * Pays an amount out of checking, then the card; what's left is owed where
 * `owe` allows it. Returns whether all of it was paid or owed. With nothing
 * owed allowed and not enough to pay (`canSpend`), nothing is spent at all.
 * Until 2026-10-12 that was false for somebody paying the day in cash: the
 * cash in hand was taken first, and a locked debit card or a French card's
 * ceiling then refused the rest, so a meal not bought still cost the cash.
 * Until later that day it was false for somebody paying by card with cash
 * in hand, which `canSpend` counted and this spends only behind a locked
 * debit card: what the bank and the card couldn't pay was owed in Bills
 * Owed, with nothing owed allowed.
 */
/**
 * A purchase's round-ups (B9), counted toward savings by the bank's own way (`systems/roundups.ts`): on what the debit
 * card paid, and on what the credit card paid where it's the bank's own and the bank counts it (Citi, BBVA and Santander
 * in Mexico; from 2026-10-13). Until 2026-10-13 it was the change to the next whole unit at every bank, Wells Fargo's
 * flat $1 aside, and a credit card's purchases never counted.
 */
function countRoundUps(sim: Simulation, person: Person, onDebit: Money, onCard: Money, card: Account | undefined): void {
  if (!roundUpsOn(sim, person)) return;
  if (onDebit > 0) countRoundUp(sim, person, roundUpFor(sim, person, onDebit), wholePurchase(sim, person, onDebit));
  if (onCard > 0 && roundsUpCard(sim, person, card)) countRoundUp(sim, person, roundUpFor(sim, person, onCard), wholePurchase(sim, person, onCard));
}

export function spend(sim: Simulation, person: Person, amount: Money, memo: string, category: string, owe = false): boolean {
  if (amount <= 0) return true;
  const card = cardOf(sim, person);
  // A debit card purchase goes into an overdraft only where the bank may pay it there.
  const overdraft = category !== 'food' || purchaseMayOverdraw(sim, person);
  if (!owe && !canSpend(sim, person, amount, category)) return false;
  // In cash first, where that's how they pay for the day.
  if (category === 'food' && paymentsOf(person).everyday === 'cash') {
    const wallet = accountsOf(sim, person).find((a) => a.kind === 'cash');
    const inHand = Math.min(amount, Math.max(0, wallet?.balance ?? 0));
    if (wallet && inHand > 0) {
      sim.post({ memo, category, postings: [{ accountId: sim.nominalAccount('expense', 'Food').id, amount: inHand }, { accountId: wallet.id, amount: -inHand }] });
      if (inHand === amount) return true;
      return spend(sim, person, amount - inHand, memo, category, owe);
    }
  }
  const current = checkingOf(sim, person);
  const before = current?.balance ?? 0;
  const cardFree = cardRoom(person, card);
  // A debit card locked, lost or stolen buys nothing: the day's shopping goes
  // on the credit card or in cash, or isn't bought (`systems/security.ts`).
  if (category === 'food' && current?.plastic && (current.plastic.locked || current.plastic.stopped)) {
    const wallet = accountsOf(sim, person).find((a) => a.kind === 'cash');
    const inHand = Math.max(0, wallet?.balance ?? 0);
    if (cardFree + inHand < amount) return false;
    const onCredit = Math.min(amount, cardFree);
    const postings = [{ accountId: sim.nominalAccount('expense', 'Food').id, amount }];
    if (onCredit > 0 && card) postings.push({ accountId: card.id, amount: -onCredit });
    if (amount > onCredit && wallet) postings.push({ accountId: wallet.id, amount: -(amount - onCredit) });
    const txn = sim.post({ memo, category, postings });
    if (onCredit > 0 && card) hold(sim, txn, card);
    countRoundUps(sim, person, 0, onCredit, card);
    return true;
  }
  // On the credit card first where that's how they pay for the day, then the debit card.
  let creditFirst = category === 'food' && paymentsOf(person).everyday === 'credit' ? Math.min(amount, cardFree) : 0;
  // A French debit card past its payment ceiling declines: the credit card takes the day, or it isn't bought.
  const room = category === 'food' ? cardCeilingRoom(sim, person) : undefined;
  if (room !== undefined && amount - creditFirst > room) {
    if (cardFree < amount) return false;
    creditFirst = amount;
  }
  const bank = drawFromBank(sim, person, amount - creditFirst, overdraft);
  // The card takes what the bank came up short on, as far as the room it has after what it took first, and the rest
  // is owed. Until 2026-10-12 what was owed took what the card took first off a second time, so a day paid by credit
  // card that the bank came up short on didn't balance, and the purchase threw.
  const shortOnCard = Math.min(bank.short, cardFree - creditFirst);
  const fromCard = creditFirst + shortOnCard;
  const owed = bank.short - shortOnCard;
  const postings = [{ accountId: sim.nominalAccount('expense', expenseFor(category)).id, amount }, ...bank.postings];
  if (fromCard > 0 && card) postings.push({ accountId: card.id, amount: -fromCard });
  if (owed > 0) postings.push({ accountId: arrearsAccount(sim, person).id, amount: -owed });
  const txn = sim.post({ memo, category, postings });
  // A card purchase is authorized now and posts in the bank's days (A95).
  if (category === 'food') hold(sim, txn, bank.postings.length > 0 && current ? current : card ?? current!);
  // An item's fee is for one the bank paid below zero, not one the card took.
  // Until 2026-09-25 a purchase the card paid was charged one if the account
  // happened to be overdrawn already.
  if (current && current.balance < 0 && current.balance < before) chargeForItem(sim, person, before - current.balance);
  // A debit the bank couldn't pay went back unpaid first, where it charges
  // for that; a card purchase it can't pay is only declined.
  if (bank.short > 0 && category !== 'food') chargeReturned(sim, person, bank.short);
  // What the debit card took from the account, for a card from a bank abroad's fee on it (from 2026-10-16).
  const byCard = current ? -bank.postings.filter((q) => q.accountId === current.id).reduce((n, q) => n + q.amount, 0) : 0;
  if (category === 'food' && bank.postings.length > 0 && creditFirst < amount) chargeForPurchase(sim, person, byCard);
  // On what the debit card paid, which until 2026-10-10 counted the part the credit card took when the account ran short.
  if (category === 'food') countRoundUps(sim, person, amount - creditFirst - bank.short, fromCard, card);
  return true;
}



/** Pays back what's owed out of the bank, as far as it goes. */
function settleArrears(sim: Simulation, person: Person): void {
  const owed = arrearsOf(sim, person);
  if (owed <= 0) return;
  const bank = drawFromBank(sim, person, owed, false, true);
  const paid = owed - bank.short;
  if (paid <= 0) return;
  sim.post({
    memo: 'Paid back what was owed', category: 'arrears',
    postings: [{ accountId: arrearsAccount(sim, person).id, amount: paid }, ...bank.postings],
  });
}

/** A money trouble, and how much it comes to. Until 2026-10-09 what was owed was owed to the landlord. */
export type Trouble = { kind: 'owed' | 'overdrawn' | 'card' | 'card_behind' | 'medical' | 'collections' | 'tax' | 'return_late'; amount: Money; accountId?: string };

/**
 * What money is weighing on somebody with today: owing, the doctors, a
 * collector or the tax office, overdrawn, or the card at its limit. The day's
 * worry reads it (`inTrouble`), and so does Home. Until 2026-09-27 a medical
 * debt, a debt in collections and a tax balance unpaid weighed nothing, and
 * Home's All Clear read only the rent.
 */
export function troubles(sim: Simulation, person: Person): Trouble[] {
  const out: Trouble[] = [];
  const owed = arrearsOf(sim, person);
  if (owed > 0) out.push({ kind: 'owed', amount: owed });
  const current = checkingOf(sim, person)?.balance ?? 0;
  if (current < 0) out.push({ kind: 'overdrawn', amount: -current });
  // Every card: until 2026-09-28 a person held one.
  for (const card of person.credit ? cardsOf(sim, person) : []) {
    if ((card.creditLimit ?? 0) > 0 && -card.balance >= CARD_FULL * (card.creditLimit ?? 0)) out.push({ kind: 'card', amount: -card.balance });
    // Behind on it, or stopped for it: until 2026-09-27 a card two payments
    // behind and suspended counted as in order unless it was nearly full.
    const state = stateOf(person, card);
    if ((state.missed ?? 0) > 0 || state.suspended) out.push({ kind: 'card_behind', amount: Math.max(0, -card.balance), accountId: card.id });
  }
  for (const kind of ['medical', 'collections'] as const) {
    const debt = accountsOf(sim, person).filter((a) => a.category === kind && a.balance < 0).reduce((sum, a) => sum - a.balance, 0);
    if (debt > 0) out.push({ kind, amount: debt });
  }
  // SLATE: the tax owed and a late return's penalty (`owedEverywhere`, `latePenaltyAll`) aren't counted, as taxes are
  // excluded by the owner; the kinds stay in `Trouble` so a 1221 reader of them reads unchanged.
  return out;
}

/** Whether money is weighing on somebody today (`troubles`). */
export function inTrouble(sim: Simulation, person: Person): boolean {
  return troubles(sim, person).length > 0;
}


/**
 * Every day with the rollover: what's owed paid back where there's money to do it (1221's `registerSpending`). SLATE:
 * the worry a day of owing put on 1221's wellbeing isn't ported; SLATE's own stress isn't the bank's to move.
 */
export function registerSpending(sim: Simulation): void {
  sim.onEvent('world.day_rollover', 'spending.day', (_event, { sim: s }) => {
    for (const person of Object.values(s.universe.people)) {
      if (!person.primaryAccountId) continue;
      settleArrears(s, person);
    }
  });
}
