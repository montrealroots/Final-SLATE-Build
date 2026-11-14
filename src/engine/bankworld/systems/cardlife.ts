/**
 * SLATE — what the holder does with the card over its life (module 4 of
 * `docs/BANKING-FUNCTIONS.md`).
 *
 * - **Apply** for a bank's card (C1, C2, C4, C5): the bank reads the record
 *   and what the applicant has to repay from, sets a limit, and the card
 *   arrives in a week. Any bank in the country that issues one, not only the
 *   one the current account is with, as a card is applied for in life; one
 *   card from each, since SLATE has each bank's one card. A card held already
 *   stays: until 2026-09-28 a person held one card, and a second was refused.
 *   The everyday card is the one the day's spending goes on; any card can be
 *   made it. A US applicant under 21 needs means of their own,
 *   which money in the bank is. The score a bank approves at and the limits
 *   it sets are SLATE's estimates; no bank publishes them.
 * - **Apply with a balance transfer** (C31) from a card at another bank, the
 *   old card taking nothing new until the new one arrives and the balance
 *   moves (`systems/cardoffers.ts`).
 * - **Close** it (C10): nothing new goes on it, and what's owed is paid down
 *   and then it's closed.
 * - **Move the statement day** (C25), which moves the due date with it.
 * - **Ask for a higher limit or a lower one** (C79, C80), and ask the bank
 *   never to raise it unasked (C79).
 * - **Opt in to going over the limit** (US, C60), and out again.
 * - **Ask for help** (C76): a hardship plan that freezes the interest and sets
 *   a payment that clears the card in four years, with the card suspended
 *   until it's paid (SLATE's estimate of such a plan's shape).
 *
 * The bank's side of it, the suspension, the default and the charge-off,
 * persistent debt and the fee caps, is in `systems/credit.ts`.
 */

import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account } from '../core/ledger';
import { CommandError } from '../core/simulation';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { MS_DAY, formatDate } from '../core/time';
import { exchange } from '../content/currency';
import { bankById } from '../content/banks';
import { CARDS } from '../content/cards';
import { ageOn } from './mortality';
import { adoptEveryday, cardFor, cardOf, cardsOf, cardTerms, closeCard, DUE_KIND, ensurePrimary, freshCardState, limitCarried, MIN_CYCLE_DAYS, RAISE_FROM, scheduleStatement, stateOf, statementDayRefusal, STATEMENT_KIND, type CardState } from './credit';
import { transferOnArrival, transferRefusal } from './cardoffers';
import { last4For } from './security';
import { abroadRefusal } from './abroad';
import { bankAccountsOf, bankOf } from './banking';

export const ARRIVES_KIND = 'card.arrives';

/** The least record a bank approves a card at: SLATE's estimate. */
export const APPROVE_FROM = 620;
/** The limit a record opens with, in US dollars: SLATE's estimate. */
const OPENING_LIMITS: readonly { from: number; usd: number }[] = [{ from: 740, usd: 5_000 }, { from: 670, usd: 2_500 }, { from: 0, usd: 1_000 }];
/** What an application costs the record, a hard inquiry: SLATE's estimate, FICO's "fewer than five points" for most. */
export const INQUIRY = 5;
/** How long a new card takes to arrive: SLATE's estimate. */
const ARRIVES_IN = 7 * MS_DAY;
/** A requested raise the bank grants at most, as a share of the limit: the six-monthly review's fifth. */
const RAISE_SHARE = 1.2;
/**
 * How long a holder waits to ask for a higher limit (from 2026-10-21, brief 20's D2): six months from the card's opening,
 * and from the last ask or raise. Experian's guidance, "you should be a cardholder for at least six months and should not
 * have requested an increase in the past six months" (How to Increase Your Credit Limit), the six months a review waits.
 */
export const ASK_EVERY = 182 * MS_DAY;

/** Why a higher limit can't be asked for yet, if it can't: six months from the card's opening and from the last ask or raise. */
export function askRefusal(sim: Simulation, card: Account, state: CardState): string | undefined {
  const from = Math.max(card.openedAt, state.askedAt ?? -Infinity, state.raisedAt ?? -Infinity);
  if (sim.now - from >= ASK_EVERY) return undefined;
  const why = from === card.openedAt ? 'the card opened' : from === state.raisedAt ? 'it last raised your limit' : 'you last asked';
  return `The bank looks at a higher limit six months after ${why}, so you can ask from ${formatDate(from + ASK_EVERY, sim.zone)}.`;
}

/** The limit a record opens a card with. */
export function limitFor(sim: Simulation, score: number): Money {
  const band = OPENING_LIMITS.find((one) => score >= one.from)!;
  return Math.round(usd(sim, band.usd) / 100) * 100;
}

function usd(sim: Simulation, dollars: number): Money {
  return exchange(dollars * 100, 'USD', saveCurrency(sim.universe)) ?? dollars * 100;
}

/**
 * What a bank's card would come with if it approved an application today, worked as `card.apply` and the card's arrival
 * work it: the score after the application's points, the limit that score opens with, and the bank's terms priced at
 * that score (from 2026-10-20, brief 17, section 8). Until then Another Card said nothing of the card before Apply For This
 * Card, though 366 of the 522 cards charge a yearly fee; the panel the card gets once it arrives was the first to say so.
 * The rate is priced again when the card arrives, a week on, from the record then.
 */
export function cardOffer(sim: Simulation, person: Person, bankId: string): { terms: ReturnType<typeof cardTerms>; limit: Money; score: number } | undefined {
  const bank = bankById(bankId);
  const product = CARDS[bankId];
  if (!bank || !product || 'none' in product || !person.credit) return undefined;
  const score = Math.max(300, person.credit.score - INQUIRY);
  const limit = limitFor(sim, score);
  const offered: Account = { id: '', saveId: sim.universe.meta.id, kind: 'credit_card', name: product.name, ownerId: '', institution: bank.name, bankId, balance: 0, creditLimit: limit, openedAt: sim.now, nominal: false };
  return { terms: cardTerms(sim, offered, score), limit, score };
}

export function registerCardLife(sim: Simulation): void {
  sim.onSchedule(ARRIVES_KIND, (item, s) => {
    const person = s.universe.people[String(item.payload.personId)];
    const applied = person?.credit?.applied;
    if (!person || !applied) return;
    const bank = bankById(applied.bankId);
    const product = bank ? CARDS[bank.id] : undefined;
    const name = product && !('none' in product) ? product.name : (bank?.name ?? 'Bank') + ' Credit Card';
    const old = applied.transfer ? cardFor(s, person, applied.fromId) : undefined;
    // Another card held beside it keeps the everyday place; with none, this card takes it.
    const others = cardsOf(s, person).filter((a) => a.id !== old?.id);
    const card = s.openAccount({ id: s.nextId('account'), kind: 'credit_card', name, ownerId: person.id, institution: bank?.name, bankId: bank?.id, openedAt: s.now, creditLimit: applied.limit });
    // The last four the bank prints on it, from the account's own number in the books.
    card.last4 = last4For(card.id);
    delete person.credit!.applied;
    const terms = cardTerms(s, card, person.credit!.score);
    // The rate the record buys today, held from here on.
    card.apr = terms.priced;
    // A new card starts clean: the old one's closing, suspension, plan, missed payments and penalty were its own.
    const fresh = freshCardState(terms.kind === 'charge' ? 'full' : person.credit!.autopay, s.now);
    if (others.length) (person.credit!.cards ??= {})[card.id] = fresh;
    else adoptEveryday(person, card, fresh);
    if (old) { transferOnArrival(s, person, card, old); ensurePrimary(s, person); }
    // Its own statement, unless one from before cards were named still stands for the everyday card.
    const armed = s.universe.scheduled.some((one) => one.kind === STATEMENT_KIND && one.status === 'pending' && one.payload.personId === person.id
      && (one.payload.accountId === card.id || (one.payload.accountId === undefined && cardOf(s, person)?.id === card.id)));
    if (!armed) scheduleStatement(s, person, s.now, card);
    if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'Your New Card Arrived', body: `Your ${name} has arrived, with a ${formatMoney(applied.limit, saveCurrency(s.universe))} limit.`, importance: 50, route: '/workspace/bank' });
  });

  sim.onCommand<{ transfer?: boolean; bankId?: string; fromId?: string }, { approved: boolean; limit?: Money }>('card.apply', (p, { sim: s }) => {
    const person = s.player;
    const credit = person.credit;
    if (!credit) throw new CommandError('You have no credit record to apply with.');
    if (credit.applied) throw new CommandError('A card is already on its way.');
    const home = bankOf(s, person);
    if (!home) throw new CommandError('You need a bank to apply to.');
    const bank = p?.bankId ? bankById(p.bankId) : home;
    if (!bank) throw new CommandError('That bank isn’t in the game.');
    if (bank.iso !== home.iso) throw new CommandError(`You can only apply for a card in the country you bank in, and ${bank.name} is elsewhere.`);
    // A bank in another country than the one they live in, where their primary account is kept at home (from 2026-10-16).
    const away = abroadRefusal(person, bank);
    if (away) throw new CommandError(away);
    const product = CARDS[bank.id];
    if (product && 'none' in product) throw new CommandError(`${bank.name} doesn’t issue a credit card.`);
    // A balance moving onto the new card, from the card named or the everyday one (C31).
    const transfer = Boolean(p?.transfer);
    const from = transfer ? cardFor(s, person, p?.fromId) : undefined;
    if (transfer) {
      const refused = transferRefusal(s, person, bank.id, limitFor(s, Math.max(300, credit.score - INQUIRY)), p?.fromId);
      if (refused) throw new CommandError(refused);
    }
    if (cardsOf(s, person).some((a) => a.bankId === bank.id)) throw new CommandError(`You already have ${bank.name}’s card.`);
    // A hard inquiry, approved or not.
    credit.score = Math.max(300, credit.score - INQUIRY);
    const cur = saveCurrency(s.universe);
    const means = heldInBanks(s, person);
    const collections = Object.values(s.universe.accounts).some((a) => a.ownerId === person.id && !a.closedAt && a.category === 'collections' && a.balance < 0);
    const age = ageOn(s, person, s.now);
    // Why, in the bank's terms, and what the application cost (from brief 15, 2026-10-19): until then “your credit record
    // isn’t strong enough”, with no figure, and nothing of the points the inquiry took.
    let reason = '';
    if (credit.score < APPROVE_FROM) reason = `your credit score is below ${APPROVE_FROM}, the lowest it approves`;
    else if (collections) reason = 'you have a debt in collections. You can pay it on Money, under Borrowing';
    else if (means <= 0) reason = bank.iso === 'US' && age < 21 ? 'applicants under 21 need income or money of their own, and you have none in the bank' : 'you have no money in the bank to repay it from';
    if (reason) {
      s.notify({ category: 'bank', title: 'Card Application Declined', body: `${bank.name} turned down your application because ${reason}. Applying still took a few points off your credit score.`, importance: 50 });
      return { approved: false };
    }
    const limit = limitFor(s, credit.score);
    credit.applied = { bankId: bank.id, arrivesAt: s.now + ARRIVES_IN, limit, ...(transfer && from ? { transfer: true, fromId: from.id } : {}) };
    // The old card takes nothing new while the balance waits to move.
    if (from) stateOf(person, from).closing = s.now;
    s.schedule({ at: credit.applied.arrivesAt, kind: ARRIVES_KIND, label: 'Your New Card Arrives', category: 'home', priority: 38, payload: { personId: person.id } });
    s.notify({ category: 'bank', title: 'Card Approved', body: `${bank.name} approved a card with a ${formatMoney(limit, cur)} limit. It arrives in a week.`, importance: 50 });
    return { approved: true, limit };
  });

  sim.onCommand<{ accountId?: string }, { closing: boolean }>('card.close', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p?.accountId);
    if (!card || !person.credit) throw new CommandError('You don’t have a card.');
    const state = stateOf(person, card);
    if (state.closing !== undefined) throw new CommandError('It’s already being closed.');
    state.closing = s.now;
    // Owing nothing, closed now, a credit on it sent back first (`closeCard`, from 2026-10-24).
    if (card.balance >= 0) closeCard(s, person, card, 'now');
    return { closing: true };
  });

  sim.onCommand<{ day: number; accountId?: string }, { day: number }>('card.set_statement_day', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p.accountId);
    if (!card || !person.credit) throw new CommandError('You don’t have a card.');
    const day = Math.round(Number(p.day));
    if (!(day >= 1 && day <= 28)) throw new CommandError('Pick a day from the 1st to the 28th.');
    const moved = statementDayRefusal(person, card);
    if (moved) throw new CommandError(moved);
    const state = stateOf(person, card);
    state.statementDay = day;
    state.dayMovedAt = s.now;
    const everyday = cardOf(s, person)?.id === card.id;
    for (const item of s.universe.scheduled) {
      if (item.kind === STATEMENT_KIND && item.status === 'pending' && item.payload.personId === person.id
        && (item.payload.accountId === card.id || (item.payload.accountId === undefined && everyday))) s.timeline.cancel(item.id, s.now);
    }
    // The new day's first date a full cycle on from the last statement (`MIN_CYCLE_DAYS`).
    scheduleStatement(s, person, Math.max(s.now, (state.statementAt ?? card.openedAt) + MIN_CYCLE_DAYS * 86_400_000), card);
    return { day };
  });

  sim.onCommand<{ limit: Money; accountId?: string }, { limit: Money; granted: boolean }>('card.request_limit', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p.accountId);
    const credit = person.credit;
    if (!card || !credit) throw new CommandError('You don’t have a card.');
    const want = Math.round(Number(p.limit));
    const now = card.creditLimit ?? 0;
    if (!(want > 0) || want === now) throw new CommandError('Enter the limit you want.');
    const cur = saveCurrency(s.universe);
    if (want < now) {
      // A lower limit is always granted, never under what's owed.
      const owed = Math.max(0, -card.balance);
      card.creditLimit = Math.max(want, owed);
      return { limit: card.creditLimit, granted: true };
    }
    const state = stateOf(person, card);
    const early = askRefusal(s, card, state);
    if (early) throw new CommandError(early);
    state.askedAt = s.now;
    const clean = !credit.late.some((when) => s.now - when < 365 * 86_400_000);
    // As far toward what's asked, at most a fifth more, as the holder's income or savings carry (`limitCarried`, from
    // 2026-10-21, brief 20's D2: Regulation Z §1026.51(a) holds an ask to the test a review is held to). Until then any
    // money in the bank at all passed, and an ask could be made again at once, so ten asks in a row raised a limit sixfold.
    const granted = credit.score >= RAISE_FROM && clean && !state.suspended ? limitCarried(s, person, card, Math.min(want, Math.round(now * RAISE_SHARE / 100) * 100)) : now;
    if (granted <= now) {
      s.notify({ category: 'bank', title: 'Limit Increase Declined', body: `The bank kept your limit at ${formatMoney(now, cur)}. It raises a limit only with a credit score of ${RAISE_FROM} or more, no late payment in the last year, and income or savings that cover the payments on a higher one.`, importance: 40 });
      return { limit: now, granted: false };
    }
    card.creditLimit = granted;
    state.raisedAt = s.now;
    return { limit: card.creditLimit, granted: true };
  });

  sim.onCommand<{ on: boolean; accountId?: string }, { on: boolean }>('card.set_auto_raise', (p, { sim: s }) => {
    if (!s.player.credit) throw new CommandError('You don’t have a card.');
    const card = cardFor(s, s.player, p.accountId);
    (card ? stateOf(s.player, card) : s.player.credit).noAutoRaise = !p.on;
    return { on: Boolean(p.on) };
  });

  sim.onCommand<{ on: boolean; accountId?: string }, { on: boolean }>('card.set_over_limit', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p.accountId);
    if (!card || !person.credit) throw new CommandError('You don’t have a card.');
    if (bankById(card.bankId ?? '')?.iso !== 'US') throw new CommandError('Only a US card lets you opt in to going over the limit.');
    const state = stateOf(person, card);
    state.overLimitOptIn = Boolean(p.on);
    return { on: Boolean(p.on) };
  });

  sim.onCommand<{ accountId?: string }, { payment: Money }>('card.request_hardship', (p, { sim: s }) => {
    const person = s.player;
    const card = cardFor(s, person, p?.accountId);
    if (!card || !person.credit) throw new CommandError('You don’t have a card.');
    const credit = stateOf(person, card);
    if (credit.hardship) throw new CommandError('You’re already on a payment plan.');
    const owed = Math.max(0, -card.balance);
    if (owed === 0) throw new CommandError('You don’t owe anything on the card.');
    // For a holder who can't pay (from 2026-10-10): a bank's hardship plan asks after the hardship, and one whose
    // checking and savings could clear the card today isn't in it, SLATE's reading. Until then anyone with a balance
    // was given interest frozen for four years for the asking.
    if (heldInBanks(s, person) >= owed) throw new CommandError('You could pay it off today. A hardship plan is for when you can’t.');
    credit.hardship = { payment: Math.ceil(owed / 48 / 100) * 100, since: s.now };
    credit.suspended = 'hardship';
    // A statement whose due date is still to come is judged by the plan’s payment there (`autopayAsk`), so its record asks
    // that from now (from 2026-10-13: until then it kept the card’s own minimum, and the Statements tab showed a least
    // the due date didn’t judge; found by that day’s guide audit).
    const last = credit.issued?.at(-1);
    const dueAhead = s.universe.scheduled.some((i) => i.kind === DUE_KIND && i.status === 'pending' && i.payload.personId === person.id && cardFor(s, person, i.payload.accountId)?.id === card.id);
    if (last && last.at === credit.statementAt && last.minimum > 0 && dueAhead) {
      last.minimum = Math.min(credit.statementBalance, credit.hardship.payment);
      last.plan = true;
    }
    return { payment: credit.hardship.payment };
  });
}

/** A card on its way's arrival, for a save opened again. */
export function armCardLife(sim: Simulation): void {
  const person = sim.universe.people[sim.universe.playerId];
  const applied = person?.credit?.applied;
  if (!person || !applied) return;
  const armed = sim.universe.scheduled.some((one) => one.kind === ARRIVES_KIND && one.status === 'pending' && one.payload.personId === person.id);
  if (!armed) sim.schedule({ at: Math.max(applied.arrivesAt, sim.now + 60_000), kind: ARRIVES_KIND, label: 'Your New Card Arrives', category: 'home', priority: 38, payload: { personId: person.id } });
}

/**
 * What a card issuer counts as somebody's means: everything in their current and savings accounts at every bank (from
 * 2026-10-10, when a second bank could be kept; until then the primary account and its savings, which read a student
 * banking at Chase and just opened at Citi as having nothing).
 */
function heldInBanks(sim: Simulation, person: Person): Money {
  return bankAccountsOf(sim, person).reduce((sum, a) => sum + Math.max(0, a.balance), 0);
}
