/**
 * SLATE — keeping more than one bank, and moving between them, as the separate acts they are (from 2026-10-10).
 *
 * Until then "Switch Bank" in a country with no switching service opened the new bank's accounts, moved every penny
 * into them, closed the old ones and moved the primary account, all in one click and on the same day, and could be
 * clicked again at once (docs/verification/BANKING-SWITCH.md). No US bank works like that, and no US service does it for
 * a customer: the CFPB tells a customer to do each step themselves. Now each step is its own:
 *
 * - **Opening** (`bank.open_current`): an application for one bank's current account. It opens at once, or after the
 *   bank's review where it says it reviews (Bank of America, one to two business days), at nothing: never with another
 *   account's money or history. Its opening deposit, where it asks for one, is sent from another of the holder's
 *   accounts and arrives in the sending bank's days. Its debit card follows in the bank's days, or, where the bank gives a
 *   digital card at once (Bank of America), works from the day it opens and no plastic follows. An account the bank
 *   says it closes unfunded, or idle at zero, it closes (Capital One, Citi).
 * - **Moving money between banks** (`bank.transfer` across two banks): out of the one account now, into the other in
 *   the sending bank's business days, with nothing in either in between; back where it came from if the other closed.
 *   Citi's published limits apply.
 * - **The primary account** (`bank.set_primary`): the debit card's purchases, cash from a machine and bills paid by hand.
 *   Choosing it moves no instruction already set up.
 * - **The instructions**: wages and other payments (`bank.redirect_deposits`, from `DEPOSIT_LEAD` on), each standing
 *   order's account and each card's autopay account, moved by the player.
 * - **Closing** (`bank.close_current`): refused while anything still uses the account, while it's overdrawn or has
 *   items pending (Citi alone keeps it open, restricted, up to 21 days for them), or while savings sits beside it. What
 *   it holds goes to the account the holder names, by transfer. Its history stays.
 *
 * Where a country has a switching service (`SWITCHING`), `bank.switch` still runs it, as the service does.
 */

import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import type { Person } from '../domain/model';
import { addDays, formatDate, instantFromZoned, zonedParts, MS_DAY, type Instant } from '../core/time';
import { bankById, type Bank } from '../content/banks';
import { afterBusinessDays, businessDay, daysOfAccount } from '../content/bankdays';
import { ESTIMATE_CARD_DAYS, ESTIMATE_SEND_DAYS, OPENING, TRANSFERS, type Opening } from '../content/bankopening';
import { SECURITY } from '../content/security';
import { bankAccountsOf, banksFor, closingFeesOf, dropPaymentsFor, endedWords, endOrdersOf, inSaveMoney, interestTaxFor, openOne, owingWords, settleFees, settleInterest } from './banking';
import { checkingAt, checkingsOf, collectionsOf, declines, overdraftInterestOf, settleOverdraftInterest, CHEX } from './lending';
import { changeDeposits, closeHold, depositAccount, linkedTo, orderSource, redirectAway } from './routing';
import { autopaySource, cardsOf } from './credit';
import { paymentsOf } from './payments';
import { pendingOn } from './pending';
import { photoIdOf } from './documents';
import { ageOn } from './mortality';
import { homeOf } from './earnings';
import { citizenOf } from './documents';
import { residenceIn } from './residence';
import { hasSsn } from './taxid';
import { startRefusal } from './life';
import { last4For, REPLACED_KIND } from './security';
import { arriveFromAbroad, cardAbroadRefusal, heldFromAbroad, sendAbroad } from './abroad';
import { exchange } from '../content/currency';

export const APPLICATION_KIND = 'bank.application';
export const ARRIVES_KIND = 'bank.transfer_arrives';
export const CLOSES_KIND = 'bank.current_closes';

/** What a bank's account opening takes, or nothing where it publishes nothing. */
export function openingOf(bank: Bank | undefined): Opening | undefined {
  return bank ? OPENING[bank.id] : undefined;
}

const dayKey = (at: Instant, zone: string) => {
  const p = zonedParts(at, zone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
};

/** The holder's money in transit between their banks: theirs, held, in no bank account (a person-owned `escrow`). */
export function inTransitOf(sim: Simulation, person: Person): Account {
  const found = Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && a.kind === 'escrow' && a.category === 'in_transit' && !a.closedAt);
  return found ?? sim.openAccount({ id: sim.nextId('account'), kind: 'escrow', category: 'in_transit', name: 'Money In Transit', ownerId: person.id, openedAt: sim.now });
}

/** A person's applications under review, oldest first. */
export function applicationsOf(sim: Simulation, person: Person): { bankId: string; at: Instant; id: string }[] {
  return sim.universe.scheduled
    .filter((i) => i.kind === APPLICATION_KIND && i.status === 'pending' && i.payload.personId === person.id)
    .map((i) => ({ bankId: String(i.payload.bankId), at: i.at, id: i.id }));
}

/** Transfers of theirs between banks still on their way. */
export function transfersOf(sim: Simulation, person: Person): { fromId: string; toId?: string; toBankId: string; amount: Money; at: Instant; id: string }[] {
  return sim.universe.scheduled
    .filter((i) => i.kind === ARRIVES_KIND && i.status === 'pending' && i.payload.personId === person.id)
    .map((i) => ({ fromId: String(i.payload.fromId), ...(i.payload.toId ? { toId: String(i.payload.toId) } : {}), toBankId: String(i.payload.toBankId), amount: Number(i.payload.amount), at: i.at, id: i.id }));
}

/**
 * Whether a bank would take this person's application now, and why not: a bank where they live, one they don't already
 * keep a current account at, one they don't owe a charged-off debt, one the screening report doesn't turn them away
 * from, with a photo ID in force (31 CFR 1020.220 and its like), at the bank's age, and, at Citi online, a US person.
 */
export function openRefusal(sim: Simulation, person: Person, bankId: string, at: Instant = sim.now): string | undefined {
  const bank = banksFor(homeOf(person)).find((b) => b.id === bankId);
  if (!bank) return 'You can only open an account at a bank in the country you live in.';
  if (checkingAt(sim, person, bank.id)) return `You already have a checking account at ${bank.name}.`;
  if (applicationsOf(sim, person).some((a) => a.bankId === bank.id)) return `${bank.name} is still reviewing your application.`;
  if (collectionsOf(sim, person, bank.name)) return `${bank.name} won’t open an account for you while you owe it a debt it has charged off.`;
  if (declines(sim, person, bank)) return `${bank.name} won’t open an account for you because of the ChexSystems report ${person.chex!.bank} filed, which stays on your record until ${formatDate(person.chex!.at + CHEX.years * 365 * MS_DAY, sim.zone)}.`;
  if (!photoIdOf(person, at)) return `${bank.name} needs a valid photo ID from a new customer: a passport, a driver’s license or an ID card. You can apply for a passport or an ID card on Papers, under Passport And ID.`;
  const rules = openingOf(bank);
  if (rules?.minimumAge !== undefined && ageOn(sim, person, at) < rules.minimumAge) return `${bank.name} only opens an account in your own name from age ${rules.minimumAge}.`;
  // US persons only: a citizen, or a green-card holder (`usPerson`); Capital One's disclosure says so, and Citi's
  // branch route for a nonresident isn't published.
  if (rules?.usPersonsOnly && !usPerson(person, at)) return `${bank.name} only opens this account for US citizens and permanent residents, and you’re neither.` // SLATE: 1221 said “on an F-1 visa”;
  // Without a Social Security number, a bank that opens for international students does it in a branch: out of
  // hospital, and an hour there (SLATE’s estimate). Until 2026-10-13 it also asked to be in town, “in a branch where you
  // live”, which travel could leave until it went in the scope reset of 2026-10-09; since then nothing moves a person
  // from where they live (`homeOf` is where they are), so nothing reached it, and it went; found by that day’s second
  // round of evidence.
  if (channelFor(person, bank) === 'branch') {
    const busy = startRefusal(sim, person, BRANCH_MINUTES, true);
    if (busy) return busy;
  }
  return undefined;
}

/**
 * A US person for a bank's purposes: a citizen, or a permanent resident holding a green card in force (from 2026-10-10:
 * until then citizenship alone, and the sources say "or lawful permanent residents" / "or resident alien").
 */
export function usPerson(person: Person, at: Instant): boolean {
  return citizenOf(person, 'US') || residenceIn(person, 'US', at)?.route === 'us-green-card';
}

/** An hour at the branch, SLATE's estimate, where an account is opened in person. */
export const BRANCH_MINUTES = 60;

/** How they'd open an account at a bank: online, or in a branch for want of a Social Security number. */
export function channelFor(person: Person, bank: Bank): 'online' | 'branch' {
  return !hasSsn(person) && openingOf(bank)?.withoutSsn === 'branch' ? 'branch' : 'online';
}

/** The opening deposit a bank asks for, in the save's money. */
export function openingDeposit(sim: Simulation, bank: Bank): Money {
  const min = openingOf(bank)?.minimumDeposit ?? 0;
  return min > 0 ? inSaveMoney(sim, min, bank.currency) : 0;
}

/** When the bank's card for a new account arrives: its days, or SLATE's estimate where it publishes none. */
function cardArrival(sim: Simulation, account: Account, bank: Bank, person: Person): { at: Instant; digital: boolean } {
  const card = openingOf(bank)?.card;
  const kept = daysOfAccount(account, person);
  const days = card?.days ?? SECURITY[bank.id]?.standardDays ?? ESTIMATE_CARD_DAYS;
  const at = card && !card.business ? addDays(sim.now, days, sim.homeZone) : afterBusinessDays(sim.now, days, kept.countryId, sim.homeZone, kept.regionId);
  return { at, digital: card?.digital === true };
}

/** Opens the account the bank approved: at nothing, its card on the way, waiting for its funding where the bank says it does. */
function openApproved(sim: Simulation, person: Person, bank: Bank): Account {
  const account = openOne(sim, person, bank, 'checking', 0);
  const rules = openingOf(bank);
  const min = openingDeposit(sim, bank);
  if (rules?.openedWhenFunded || min > 0) account.awaitingFunds = Math.max(1, min);
  if (rules?.fundWithinDays !== undefined) account.fundBy = sim.now + rules.fundWithinDays * MS_DAY;
  const card = cardArrival(sim, account, bank, person);
  const years = (SECURITY[bank.id]?.cardYears ?? 4) * 365.25 * MS_DAY;
  account.plastic = { last4: account.last4 ?? last4For(account.id), expiresAt: sim.now + years, issued: 1 };
  if (!card.digital) {
    account.plastic.stopped = 'new';
    account.plastic.replacementAt = card.at;
    sim.schedule({ at: card.at, kind: REPLACED_KIND, label: 'Your New Card Arrives', category: 'home', priority: 38, payload: { accountId: account.id, which: 'debit' } });
  }
  return account;
}

/** The days a transfer from an account to another bank takes, sent now. */
export function arrivalOf(sim: Simulation, from: Account, person: Person): Instant {
  const bank = from.bankId ? bankById(from.bankId) : undefined;
  const rules = openingOf(bank);
  const kept = daysOfAccount(from, person);
  const zone = sim.homeZone;
  const country = bank ? TRANSFERS[bank.iso] : undefined;
  if (country?.instant && rules?.sameDayBefore === undefined && rules?.sendDays === undefined) return sim.now;
  const before = rules?.sameDayBefore ?? (rules?.sendDays === undefined ? country?.sameDayBefore : undefined);
  if (before !== undefined) {
    const p = zonedParts(sim.now, zone);
    const hour = p.hour + p.minute / 60;
    if (businessDay(kept.countryId, dayKey(sim.now, zone), kept.regionId) && hour < before) {
      return instantFromZoned({ year: p.year, month: p.month, day: p.day, hour: 17 }, zone);
    }
    return afterBusinessDays(sim.now, 1, kept.countryId, zone, kept.regionId);
  }
  return afterBusinessDays(sim.now, rules?.sendDays ?? country?.days ?? ESTIMATE_SEND_DAYS, kept.countryId, zone, kept.regionId);
}

/** What has gone out of a bank's accounts of the holder's to other banks since a moment. */
function sentSince(sim: Simulation, person: Person, bankId: string, since: Instant): Money {
  const transit = inTransitOf(sim, person).id;
  const atBank = new Set(Object.values(sim.universe.accounts).filter((a) => a.ownerId === person.id && a.bankId === bankId).map((a) => a.id));
  let total = 0;
  for (let k = sim.universe.transactions.length - 1; k >= 0; k -= 1) {
    const t = sim.universe.transactions[k]!;
    if (t.at < since) break;
    if (t.category !== 'transfer' || !t.postings.some((p) => p.accountId === transit)) continue;
    for (const p of t.postings) if (atBank.has(p.accountId) && p.amount < 0) total -= p.amount;
  }
  return total;
}

/** Why the sending bank's limits refuse a transfer, where it publishes limits. */
function limitRefusal(sim: Simulation, person: Person, bank: Bank | undefined, amount: Money): string | undefined {
  const limits = openingOf(bank)?.limits;
  if (!bank || !limits) return undefined;
  const p = zonedParts(sim.now, sim.homeZone);
  const dayStart = instantFromZoned({ year: p.year, month: p.month, day: p.day, hour: 0 }, sim.homeZone);
  const monthStart = instantFromZoned({ year: p.year, month: p.month, day: 1, hour: 0 }, sim.homeZone);
  const day = inSaveMoney(sim, limits.outDay, bank.currency);
  const month = inSaveMoney(sim, limits.outMonth, bank.currency);
  const cur = saveCurrency(sim.universe);
  const today = sentSince(sim, person, bank.id, dayStart);
  const thisMonth = sentSince(sim, person, bank.id, monthStart);
  if (today + amount > day) return `${bank.name} lets you send ${formatMoney(day, cur, { cents: false })} a day to other banks, and you’ve sent ${formatMoney(today, cur, { cents: false })} today.`;
  if (thisMonth + amount > month) return `${bank.name} lets you send ${formatMoney(month, cur, { cents: false })} a month to other banks, and you’ve sent ${formatMoney(thisMonth, cur, { cents: false })} this month.`;
  return undefined;
}

/**
 * Sends money from one of the holder's accounts to their account at another bank: out now, into the money in transit,
 * and in on the day it arrives (`ARRIVES_KIND`). `toBankId` alone names an account still being opened there.
 *
 * Between banks in two countries it's a payment abroad (`systems/abroad.ts`, from 2026-10-16), whatever asked for it: a
 * transfer, savings closing, a current account closing, an opening deposit, a bank closing a home account. That's decided
 * first, before the sending country's same-day path: until then a pound payment from Barclays to Chase would have taken
 * Britain's Faster Payments and landed at once, free. `sent` is the amount in the sending account's own money, where the
 * caller knows it (a figure typed in pounds); otherwise it's worked from `amount`, the whole of what the account holds
 * where that's what goes.
 */
export function sendBetweenBanks(sim: Simulation, person: Person, from: Account, to: Account | undefined, amount: Money, toBankId = to?.bankId, byTheBank = false, sent?: Money): Instant {
  const toBank = toBankId ? bankById(toBankId) : undefined;
  const fromBank = from.bankId ? bankById(from.bankId) : undefined;
  if (fromBank && toBank && fromBank.iso !== toBank.iso) {
    const own = sent ?? (from.currency === undefined ? amount : amount === from.balance ? from.held ?? 0 : exchange(amount, saveCurrency(sim.universe), from.currency) ?? amount);
    return sendAbroad(sim, person, from, to, own, toBankId, byTheBank);
  }
  // What a closing bank remits is its own payment, not the customer's transfer, and isn't held to its limits (from
  // 2026-10-10: until then a Citi close past $10,000 failed halfway, its interest settled and the account left open).
  const no = byTheBank ? undefined : limitRefusal(sim, person, from.bankId ? bankById(from.bankId) : undefined, amount);
  if (no) throw new CommandError(no);
  const at = arrivalOf(sim, from, person);
  // At once where the country's banks pay instantly: straight across, nothing in transit.
  if (at <= sim.now && to) {
    sim.post({ memo: `To ${to.name} at ${toBank?.name ?? 'another bank'}`, category: 'transfer', postings: [{ accountId: from.id, amount: -amount }, { accountId: to.id, amount }] });
    checkFunded(to);
    return sim.now;
  }
  const transit = inTransitOf(sim, person);
  sim.post({ memo: `To ${toBank?.name ?? 'another bank'}${to ? `: ${to.name}` : ''}`, category: 'transfer', postings: [{ accountId: from.id, amount: -amount }, { accountId: transit.id, amount }] });
  sim.schedule({ at, kind: ARRIVES_KIND, label: 'Money Arrives From Your Other Bank', category: 'home', priority: 37, payload: { personId: person.id, fromId: from.id, ...(to ? { toId: to.id } : {}), toBankId: toBankId ?? '', amount } });
  return at;
}

/** Whether an account the bank waits on has had its funding: the minimum in it once is enough. */
function checkFunded(account: Account): void {
  if (account.awaitingFunds !== undefined && account.balance >= account.awaitingFunds) {
    delete account.awaitingFunds;
    delete account.fundBy;
  }
}

/**
 * Pins every instruction that would otherwise follow the primary account to the account it follows now, so choosing
 * another primary moves none of them: incoming payments, each standing order, each card's autopay.
 */
export function pinInstructions(sim: Simulation, person: Person): void {
  depositAccount(sim, person);
  for (const order of paymentsOf(person).standingOrders) orderSource(sim, person, order);
  if (person.credit) for (const card of cardsOf(sim, person)) autopaySource(sim, person, card);
}

/** What the primary account is for, said where it's chosen: what money comes from it for, as a sentence lists them. */
export const PRIMARY_DOES = [
  'your debit card’s everyday purchases',
  'cash from a machine',
  'bills you pay by hand',
  'any new standing order or autopay',
] as const;

/** Why a current account can't close now, or nothing. */
export function closeRefusal(sim: Simulation, person: Person, account: Account): string | undefined {
  if (account.ownerId !== person.id || account.closedAt || account.kind !== 'checking') return 'Only one of your own checking accounts can be closed here.';
  if (checkingsOf(sim, person).length < 2) return 'It’s your only checking account, and you always need one for your wages to be paid into. Open another one first.';
  if (account.id === person.primaryAccountId) return 'It’s your primary account. Make another account primary first.';
  if (account.balance < 0) return `It’s overdrawn by ${formatMoney(-account.balance, saveCurrency(sim.universe))}, and the bank only closes it once that’s paid off. Move money into it first.`;
  // A fee for a customer abroad owed where the account can't go below zero is the same debt (from 2026-10-16).
  if (account.feeOwedHeld) return `You owe its ${formatMoney(account.feeOwedHeld, bankById(account.bankId!)!.currency)} fee for customers living abroad, and the bank only closes it once that’s paid. Move money into it: once it holds enough, the bank takes the fee that night.`;
  if (transfersOf(sim, person).some((t) => t.fromId === account.id || t.toId === account.id)) return 'Money is on its way into or out of it. Wait until it arrives.';
  const held = closeHold(sim, person, account.id);
  if (held) return held;
  const savings = bankAccountsOf(sim, person).find((a) => a.kind === 'savings' && a.bankId === account.bankId);
  if (savings) return `${savings.name} is still open at the same bank. Close that first.`;
  const bank = account.bankId ? bankById(account.bankId) : undefined;
  // A pending card payment is a debit, negative in the ledger's sense (`pendingOn`): until 2026-10-10 this asked for
  // more than nothing, and neither this refusal nor Citi's restricted close ever happened.
  if (pendingOn(sim, account) !== 0 && openingOf(bank)?.closeWithPendingDays === undefined) return 'Card payments are still pending on it. You can close it once they’ve posted.';
  // The fees closing charges (`settleFees`, Germany's quarter so far and, from later on 2026-10-16, this month's only to
  // the day, `closingFeesDue`, where until then the whole month) past what it holds with its interest would leave it
  // overdrawn, and the bank closes an overdrawn account only once that's paid, as above. Until 2026-10-15 Close It closed a
  // German account with €3 in it and €4.90 owed at -€1.90, its debt closed with it, where Cancel It refused the same
  // account from that morning (found by that day's skeptic). The overdraft interest built since the 1st counts with them
  // from 2026-10-16, when closing began to charge it (`settleOverdraftInterest`).
  const fees = closingFeesOf(sim, account);
  const od = overdraftInterestOf(account);
  const earned = Math.floor(account.accrued ?? 0);
  const short = fees + od - account.balance - (earned > 0 ? earned - interestTaxFor(sim, account, earned) : 0);
  const m = (n: Money) => formatMoney(n, saveCurrency(sim.universe));
  if (fees + od > 0 && short > 0) return `${owingWords([...(od > 0 ? [['its overdraft interest', m(od)] as const] : []), ...(fees > 0 ? [['its fees', m(fees)] as const] : [])])} more than it holds. Move ${m(short)} into it first.`;
  return undefined;
}

/**
 * Closes a current account now: interest, overdraft interest and fees settled, what it holds sent on, its history kept.
 * The overdraft interest built since the 1st from 2026-10-16 (`settleOverdraftInterest`): until then it was dropped.
 */
function closeNow(sim: Simulation, person: Person, account: Account, remainderTo: Account | undefined): Instant | undefined {
  settleInterest(sim, account, `Interest: ${account.name}, on closing`);
  settleOverdraftInterest(sim, account);
  settleFees(sim, account);
  let arrives: Instant | undefined;
  if (account.balance > 0 && remainderTo) {
    if (remainderTo.bankId === account.bankId) {
      sim.post({ memo: `Closed ${account.name}`, category: 'transfer', postings: [{ accountId: account.id, amount: -account.balance }, { accountId: remainderTo.id, amount: account.balance }] });
    } else arrives = sendBetweenBanks(sim, person, account, remainderTo, account.balance, remainderTo.bankId, true);
  }
  account.accrued = 0;
  account.closedAt = sim.now;
  account.overdraftLimit = undefined;
  delete account.awaitingFunds;
  delete account.fundBy;
  dropPaymentsFor(sim, person, account);
  return arrives;
}

/**
 * The bank closes an account it opened that was never funded, or one idle at zero past its days. Payments into it go to
 * the account kept elsewhere, as a payer re-sends a returned one (`redirectAway`); autopay from it fails until moved, and
 * says so; a standing order from it ends with it (`endOrdersOf`, from 2026-10-16: until then it failed and said so every
 * month for good).
 *
 * What closing settles is worked out first (from 2026-10-16): the interest built, less its tax, against the fees closing
 * charges and the overdraft interest built (`closingFeesOf`, `overdraftInterestOf`). Where those are more, the bank doesn't
 * close it: they're charged when they fall due, at the quarter's closing or on the 1st, and an account they take below
 * zero is pursued as any overdrawn one (sixty days, `closeForOverdraft`), as Close It won't close an account they'd
 * overdraw, and as BGB § 675h(3) leaves fees owed to the end of the contract (dejure.org, read 2026-10-16). What closing
 * leaves in it, its interest, goes to the primary account by the bank's own payment. Until then it closed at zero and
 * settled after: a German account's fees would have closed it below zero with nothing pursuing the debt, and interest
 * settled would have stayed in a closed account. Neither was reached in play: only Citi and Capital One close an account
 * at zero or unfunded (`OPENING`), and neither builds interest on one or charges fees at closing
 * (docs/verification/remaining/banking-checklist.json, banking.1).
 */
function closedByBank(sim: Simulation, person: Person, account: Account, why: string): void {
  const other = checkingsOf(sim, person).find((a) => a.id !== account.id);
  if (!other || account.balance !== 0) return;
  const earned = Math.floor(account.accrued ?? 0);
  const left = (earned > 0 ? earned - interestTaxFor(sim, account, earned) : 0) - closingFeesOf(sim, account) - overdraftInterestOf(account);
  if (left < 0) return;
  if (person.primaryAccountId === account.id) person.primaryAccountId = other.id;
  redirectAway(sim, person, account.id, other.id);
  const ended = endOrdersOf(sim, person, account);
  const into = sim.universe.accounts[person.primaryAccountId ?? other.id] ?? other;
  const arrives = closeNow(sim, person, account, into);
  const sent = left > 0 ? ` Its ${formatMoney(left, saveCurrency(sim.universe))} of interest ${arrives !== undefined && arrives > sim.now ? `is on its way to ${into.name} and arrives ${formatDate(arrives, sim.zone)}` : `went to ${into.name}`}.` : '';
  if (person.id === sim.universe.playerId) sim.notify({ category: 'bank', title: `${account.institution ?? 'The Bank'} Closed ${account.name}`, body: `${why}${sent}${endedWords(sim, ended)}`, importance: 60, route: '/workspace/bank' });
}

export function registerBankMoves(sim: Simulation): void {
  sim.onCommand<{ bankId: string; fundFrom?: string; amount?: Money }, { accountId?: string; decidedAt?: Instant; arrivesAt?: Instant; cardAt?: Instant }>('bank.open_current', (p, { sim: s }) => {
    const person = s.player;
    const no = openRefusal(s, person, String(p.bankId));
    if (no) throw new CommandError(no);
    const bank = bankById(String(p.bankId))!;
    const rules = openingOf(bank);
    // In a branch, the hour there (`channelFor`).
    if (channelFor(person, bank) === 'branch') s.advanceTo(s.now + BRANCH_MINUTES * 60_000);
    const min = openingDeposit(s, bank);
    const amount = Math.round(Number(p.amount ?? 0));
    const from = p.fundFrom ? bankAccountsOf(s, person).find((a) => a.id === p.fundFrom) : undefined;
    if (p.fundFrom && !from) throw new CommandError('Pay the opening deposit from one of your own checking or savings accounts.');
    if (from && from.bankId === bank.id) throw new CommandError(`That account is already at ${bank.name}. Pay the deposit from an account at another bank.`);
    if (min > 0 && (!from || amount < min)) throw new CommandError(`${bank.name} asks for an opening deposit of ${formatMoney(min, saveCurrency(s.universe), { cents: false })}, sent from another of your accounts.`);
    if (amount < 0 || (from && !(amount > 0))) throw new CommandError('Enter the amount of the opening deposit.');
    if (from && amount > from.balance) throw new CommandError(`${from.name} has ${from.balance > 0 ? `only ${formatMoney(from.balance, saveCurrency(s.universe))}` : 'nothing'} available, so the account wasn’t opened.`);
    // Under review, the deposit goes now and waits for the decision; decided at once, the account opens now.
    if (rules?.reviewDays) {
      const kept = daysOfAccount({ bankId: bank.id }, person);
      const decidedAt = afterBusinessDays(s.now, rules.reviewDays, kept.countryId, s.homeZone, kept.regionId);
      s.schedule({ at: decidedAt, kind: APPLICATION_KIND, label: `${bank.name} Decides Your Application`, category: 'home', priority: 36, payload: { personId: person.id, bankId: bank.id } });
      const arrivesAt = from && amount > 0 ? sendBetweenBanks(s, person, from, undefined, amount, bank.id) : undefined;
      return { decidedAt, ...(arrivesAt ? { arrivesAt: Math.max(arrivesAt, decidedAt) } : {}) };
    }
    const account = openApproved(s, person, bank);
    const arrivesAt = from && amount > 0 ? sendBetweenBanks(s, person, from, account, amount) : undefined;
    return { accountId: account.id, ...(arrivesAt ? { arrivesAt } : {}), ...(account.plastic?.replacementAt ? { cardAt: account.plastic.replacementAt } : {}) };
  });

  sim.onSchedule(APPLICATION_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const bank = bankById(String(item.payload.bankId));
    if (!person || !bank) return;
    // The checks again on the day: a report or a lapsed ID since applying turns it down.
    item.status = 'done';
    const no = openRefusal(s, person, bank.id);
    const mine = person.id === s.universe.playerId;
    if (no) {
      if (mine) s.notify({ category: 'bank', title: `${bank.name} Turned Down Your Application`, body: `${no} Any opening deposit you sent comes back to the account it left.`, importance: 60, route: '/workspace/bank' });
      return;
    }
    const account = openApproved(s, person, bank);
    if (mine) s.notify({ category: 'bank', title: `${bank.name} Opened Your Account`, body: `Your ${account.name} is open${account.awaitingFunds ? '. It’s waiting for its opening deposit' : ''}.${account.plastic?.replacementAt ? ` The debit card arrives ${formatDate(account.plastic.replacementAt, s.zone)}.` : ''}`, importance: 55, route: '/workspace/bank' });
  });

  sim.onSchedule(ARRIVES_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    if (!person) return;
    const amount = Number(item.payload.amount);
    const transit = inTransitOf(s, person);
    const toBankId = String(item.payload.toBankId);
    const named = item.payload.toId ? s.universe.accounts[String(item.payload.toId)] : checkingAt(s, person, toBankId);
    const to = named && !named.closedAt ? named : undefined;
    // An application still under review: it waits for the decision.
    const review = applicationsOf(s, person).find((a) => a.bankId === toBankId);
    if (!to && review) {
      s.schedule({ at: review.at + 60_000, kind: ARRIVES_KIND, label: item.label, category: 'home', priority: 37, payload: item.payload });
      return;
    }
    // A payment abroad lands less the margin and the receiving bank's fee, or comes back less them (from 2026-10-16).
    if (item.payload.abroad) {
      arriveFromAbroad(s, item, person, to);
      return;
    }
    if (to) {
      s.post({ memo: `From ${s.universe.accounts[String(item.payload.fromId)]?.name ?? 'your other bank'}`, category: 'transfer', postings: [{ accountId: transit.id, amount: -amount }, { accountId: to.id, amount }] });
      checkFunded(to);
      return;
    }
    // Nowhere to land: back where it came from, or where they're paid if that closed too.
    const source = s.universe.accounts[String(item.payload.fromId)];
    const back = source && !source.closedAt ? source : depositAccount(s, person) ?? checkingsOf(s, person)[0];
    if (!back) return;
    s.post({ memo: 'Returned: the account it was sent to isn’t open', category: 'transfer', postings: [{ accountId: transit.id, amount: -amount }, { accountId: back.id, amount }] });
    if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'A Transfer Came Back', body: `${formatMoney(amount, saveCurrency(s.universe))} came back to ${back.name} because the account it was sent to isn’t open.`, importance: 50, route: '/workspace/bank' });
  });

  // Each day: an account funded since, one the bank closes unfunded, and one idle at zero past the bank's days.
  sim.onEvent('world.day_rollover', 'bank.moves', (_event, { sim: s }) => {
    for (const person of [s.player]) {
      for (const account of checkingsOf(s, person)) {
        checkFunded(account);
        const bank = account.bankId ? bankById(account.bankId) : undefined;
        const rules = openingOf(bank);
        if (account.fundBy !== undefined && account.awaitingFunds !== undefined && s.now >= account.fundBy) {
          closedByBank(s, person, account, `The bank closed it because no money was paid into it within ${rules?.fundWithinDays ?? 60} days of opening.`);
          continue;
        }
        if (rules?.closesAtZeroAfterDays !== undefined) {
          if (account.balance !== 0) { delete account.zeroSince; continue; }
          account.zeroSince ??= s.now;
          if (s.now - account.zeroSince >= rules.closesAtZeroAfterDays * MS_DAY) closedByBank(s, person, account, `It sat at a zero balance for ${rules.closesAtZeroAfterDays} days, so the bank closed it.`);
        }
      }
    }
  });

  sim.onCommand<{ accountId: string }, { affects: readonly string[]; unchanged: string[] }>('bank.set_primary', (p, { sim: s }) => {
    const person = s.player;
    const account = checkingsOf(s, person).find((a) => a.id === p.accountId);
    if (!account) throw new CommandError('Only one of your open checking accounts can be your primary account.');
    if (account.id === person.primaryAccountId) throw new CommandError(`${account.name} is already your primary account.`);
    if (account.closingAt !== undefined) throw new CommandError(`${account.name} is closing, so it can’t be your primary account.`);
    // A home account's card pays here only where its bank says it works abroad and the research has its fee (from
    // 2026-10-16): SMBC's Global Service has the card canceled before leaving.
    const abroadBank = heldFromAbroad(s, account) ? bankById(account.bankId!) : undefined;
    const noCard = abroadBank ? cardAbroadRefusal(abroadBank) : undefined;
    if (noCard) throw new CommandError(noCard);
    // Every instruction that followed the primary account is pinned where it is first, so none of them moves.
    pinInstructions(s, person);
    const before = person.primaryAccountId;
    person.primaryAccountId = account.id;
    const unchanged = before ? linkedTo(s, person, before) : [];
    return { affects: PRIMARY_DOES, unchanged };
  });

  sim.onCommand<{ accountId: string }, { at: Instant }>('bank.redirect_deposits', (p, { sim: s }) => {
    const person = s.player;
    const account = bankAccountsOf(s, person).find((a) => a.id === p.accountId);
    if (!account) throw new CommandError('Choose one of your open checking or savings accounts for your wages.');
    if (account.closingAt !== undefined) throw new CommandError(`${account.name} is closing, so wages can’t be paid into it.`);
    // From 2026-10-16: an account kept at home, at a bank in another country, takes no wages from here.
    if (heldFromAbroad(s, account)) throw new CommandError('Pay for work here goes only into an account at a bank in this country.'); // SLATE: 1221 named Yale
    return { at: changeDeposits(s, person, account.id) };
  });

  sim.onCommand<{ orderId: string; accountId: string }, { fromId: string }>('bank.set_order_source', (p, { sim: s }) => {
    const person = s.player;
    const order = paymentsOf(person).standingOrders.find((o) => o.id === p.orderId);
    if (!order) throw new CommandError('That standing order no longer exists.');
    const account = checkingsOf(s, person).find((a) => a.id === p.accountId);
    if (!account) throw new CommandError('A standing order has to pay from one of your open checking accounts.');
    if (account.closingAt !== undefined) throw new CommandError(`${account.name} is closing, so a standing order can’t pay from it.`);
    // Until 2026-10-13 a current account the order paid into was refused here. A standing order goes only into savings
    // (`bank.add_standing_order`), and only a current account pays one, so nothing reached it, and it went.
    order.fromId = account.id;
    return { fromId: account.id };
  });

  sim.onCommand<{ cardId: string; accountId: string }, { fromId: string }>('card.set_autopay_from', (p, { sim: s }) => {
    const person = s.player;
    const card = person.credit ? cardsOf(s, person).find((c) => c.id === p.cardId) : undefined;
    if (!card) throw new CommandError('That isn’t one of your cards.');
    const account = checkingsOf(s, person).find((a) => a.id === p.accountId);
    if (!account) throw new CommandError('Autopay has to pay from one of your open checking accounts.');
    if (account.closingAt !== undefined) throw new CommandError(`${account.name} is closing, so autopay can’t pay from it.`);
    autopaySource(s, person, card);
    const credit = person.credit!;
    const state = !credit.primaryId || credit.primaryId === card.id ? credit : (credit.cards ??= {})[card.id];
    if (!state) throw new CommandError('That isn’t one of your cards.');
    state.autopayFrom = account.id;
    return { fromId: account.id };
  });

  sim.onCommand<{ accountId: string; remainderTo?: string }, { closedAt: Instant; arrivesAt?: Instant }>('bank.close_current', (p, { sim: s }) => {
    const person = s.player;
    const account = s.universe.accounts[String(p.accountId)];
    if (!account) throw new CommandError('Only one of your own checking accounts can be closed here.');
    if (account.closingAt !== undefined) throw new CommandError(`${account.name} is already closing on ${formatDate(account.closingAt, s.zone)}.`);
    const no = closeRefusal(s, person, account);
    if (no) throw new CommandError(no);
    const to = p.remainderTo ? bankAccountsOf(s, person).find((a) => a.id === p.remainderTo && a.id !== account.id) : undefined;
    if (account.balance + Math.floor(account.accrued ?? 0) > 0 && !to) throw new CommandError(`Choose which of your accounts the ${formatMoney(Math.max(0, account.balance), saveCurrency(s.universe))} goes to.`);
    // Citi keeps it open, restricted, while items are pending, up to its 21 days.
    const bank = account.bankId ? bankById(account.bankId) : undefined;
    const wait = openingOf(bank)?.closeWithPendingDays;
    if (pendingOn(s, account) !== 0 && wait !== undefined) {
      const latest = Math.max(...s.universe.transactions.filter((t) => t.postsAt !== undefined && t.postsAt > s.now && t.postings.some((q) => q.accountId === account.id)).map((t) => t.postsAt!));
      account.closingAt = Math.min(latest + 60_000, s.now + wait * MS_DAY);
      s.schedule({ at: account.closingAt, kind: CLOSES_KIND, label: `${account.name} Closes`, category: 'home', priority: 36, payload: { personId: person.id, accountId: account.id, ...(to ? { remainderTo: to.id } : {}) } });
      return { closedAt: account.closingAt };
    }
    const arrivesAt = closeNow(s, person, account, to);
    return { closedAt: s.now, ...(arrivesAt ? { arrivesAt } : {}) };
  });

  sim.onSchedule(CLOSES_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const account = s.universe.accounts[String(item.payload.accountId)];
    if (!person || !account || account.closedAt) return;
    delete account.closingAt;
    const to = item.payload.remainderTo ? s.universe.accounts[String(item.payload.remainderTo)] : undefined;
    const into = to && !to.closedAt ? to : depositAccount(s, person) ?? checkingsOf(s, person).find((a) => a.id !== account.id);
    // Overdrawn by what posted since, it stays open until that's paid, as the bank says it does.
    if (account.balance < 0) {
      if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `${account.name} Didn’t Close`, body: 'Payments that posted while it was closing left it overdrawn, so it’s still open. Move money into it to clear the overdraft, then press Close It again.', importance: 60, route: '/workspace/bank' });
      return;
    }
    // What it held, said as it went (from 2026-10-17): into the next account at once at its own bank, or on its way to
    // another bank, where until then both were said to be "on its way", and an empty account was said to send something.
    const held = account.balance > 0;
    const arrives = closeNow(s, person, account, into);
    if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: `${account.name} Closed`, body: into && held ? (arrives !== undefined && arrives > s.now ? `What it held is on its way to ${into.name} and arrives ${formatDate(arrives, s.zone)}.` : `What it held is now in ${into.name}.`) : 'It held nothing.', importance: 50, route: '/workspace/bank' });
  });
}

