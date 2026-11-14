/**
 * SLATE — round-ups into savings, as each bank runs them (`content/roundups.ts`, from 2026-10-13).
 *
 * A debit card purchase counts what its bank's way says (the change to the next unit the player chose, times a
 * multiplier, a flat amount, or the change and the rest of a chosen amount; KakaoBank sweeps a balance's remainder
 * instead), and the counted amount moves from the primary current account to easy-access savings at the same bank when
 * the bank moves it: each day, at a business day's end, at the next business day's start, on weekdays, overnight into
 * Saturday, twice a month, or as often as the player chose. A day the account can't cover it, nothing moves and what was
 * counted is dropped, all or nothing, except at Citi, whose minimum balance waits two more days and then turns it off.
 *
 * Until 2026-10-13 every bank's round-up was the change to the next whole unit, moved every night (`ROUND_UP_AMOUNT`
 * kept Wells Fargo's flat $1), and where the bank leaves the amount to the customer SLATE moved the change as its own
 * estimate. A choice the bank leaves to the customer is the player's now, and nothing counts until it's made.
 */

import type { Simulation } from '../core/simulation';
import { CommandError } from '../core/simulation';
import type { Person, RoundUpChoice } from '../domain/model';
import type { Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { MS_DAY, MS_HOUR, zonedParts, type Instant } from '../core/time';
import { bankById } from '../content/banks';
import { businessDay, daysOfAccount } from '../content/bankdays';
import { ROUND_UPS, type RoundUpEvery, type RoundUpRule, type RoundUpWay } from '../content/roundups';
import { inSaveMoney } from './banking';

/** The change to the next multiple of a unit (in hundredths, a whole unit by default); a whole amount moves nothing, or a whole unit where the bank says so. */
export function roundUpOf(amount: Money, unit: Money = 100, fullOnWhole = false): Money {
  if (unit <= 0) return 0;
  const rest = amount % unit;
  return rest === 0 ? (fullOnWhole ? unit : 0) : unit - rest;
}

function currentOf(sim: Simulation, person: Person): Account | undefined {
  return person.primaryAccountId ? sim.universe.accounts[person.primaryAccountId] : undefined;
}

/** The round-up rule at the bank of the person's primary current account, where it has one. */
export function roundUpRuleAt(sim: Simulation, person: Person): { bankId: string; rule: RoundUpRule } | undefined {
  const bankId = currentOf(sim, person)?.bankId;
  const rule = bankId ? ROUND_UPS[bankId] : undefined;
  return bankId && rule ? { bankId, rule } : undefined;
}

/** Whole units of a bank's currency, in the save's money. */
function whole(sim: Simulation, bankId: string, n: number): Money {
  const bank = bankById(bankId);
  return inSaveMoney(sim, Math.round(n * 100), bank?.currency ?? saveCurrency(sim.universe));
}

/** A bank's amount in its own currency, for words. */
export function roundUpMoney(bankId: string, n: number): string {
  return formatMoney(Math.round(n * 100), bankById(bankId)?.currency ?? 'USD');
}

const EVERY_WORDS: Record<RoundUpEvery, string> = { day: 'daily', week: 'weekly', fortnight: 'every two weeks' };

/**
 * The choices a refusal names, the last after “or” (from 2026-10-20, brief 17): until then three of the refusals listed
 * them with commas alone, “Choose how often it moves: daily, weekly, every two weeks.”
 */
const orList = (items: readonly string[]): string => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`);
export const roundUpEveryWords = (e: RoundUpEvery): string => EVERY_WORDS[e];

/** The way the choice counts by, or the only one. */
export const wayOf = (rule: RoundUpRule, choice: RoundUpChoice | undefined): RoundUpWay | undefined =>
  rule.ways.length === 1 ? rule.ways[0] : choice?.way !== undefined ? rule.ways[choice.way] : undefined;

/**
 * What's wrong with a choice at a bank, or still to make, in words; undefined when it's whole. A choice the bank leaves to
 * the customer and gives no default for has to be made: nothing is filled in for the player.
 */
export function roundUpChoiceRefusal(bankId: string, rule: RoundUpRule, choice: RoundUpChoice): string | undefined {
  const money = (n: number) => roundUpMoney(bankId, n);
  if (rule.ways.length > 1 && (choice.way === undefined || !rule.ways[choice.way])) return 'Choose how it counts: rounded up, or a set amount.';
  const way = wayOf(rule, choice)!;
  if (way.kind === 'change') {
    if (way.units.length > 1 && !way.units.includes(choice.unit ?? NaN)) return `Choose what to round up to: ${orList(way.units.map(money))}.`;
    if (way.multipliers && choice.multiplier !== undefined && !way.multipliers.includes(choice.multiplier)) return `Choose a multiplier from ${way.multipliers[0]} to ${way.multipliers.at(-1)}.`;
    if (way.multipliers && choice.multiplier === undefined && rule.defaultMultiplier === undefined) return 'Choose a multiplier.';
  }
  if (way.kind === 'flat') {
    if (way.amounts && way.amounts.length > 1 && !way.amounts.includes(choice.amount ?? NaN)) return `Choose the amount each purchase: ${orList(way.amounts.map(money))}.`;
    if (way.range) {
      const a = choice.amount;
      if (a === undefined || !(a >= way.range.min && a <= way.range.max) || Math.abs(Math.round(a * 100) - a * 100) > 1e-6) return `Choose the amount each purchase, ${money(way.range.min)} to ${money(way.range.max)}.`;
    }
  }
  if (way.kind === 'changePlus' && !way.amounts.includes(choice.amount ?? NaN)) return `Choose the amount: ${orList(way.amounts.map(money))}.`;
  if (rule.every && !rule.every.includes(choice.every as RoundUpEvery)) return `Choose how often it moves: ${orList(rule.every.map((e) => EVERY_WORDS[e]))}.`;
  if (rule.minimumAtLeast !== undefined && !((choice.minimum ?? NaN) >= rule.minimumAtLeast)) return `Set the minimum balance it keeps, at least ${money(rule.minimumAtLeast)}.`;
  return undefined;
}

/** Easy-access savings at a bank, where the round-ups go. */
export function roundUpSavings(sim: Simulation, person: Person, bankId: string): Account | undefined {
  return Object.values(sim.universe.accounts).find((a) => a.ownerId === person.id && a.kind === 'savings' && a.category !== 'term' && !a.closedAt && a.bankId === bankId);
}

/** Why round-ups can't be turned on with a choice now, in words; undefined when they can. */
export function roundUpRefusal(sim: Simulation, person: Person, choice: RoundUpChoice): string | undefined {
  const current = currentOf(sim, person);
  const at = roundUpRuleAt(sim, person);
  if (!at) return `${current?.institution ?? 'Your bank'} doesn’t round purchases up into savings.`;
  if (!roundUpSavings(sim, person, at.bankId)) return `Round-ups go into savings at ${current?.institution ?? 'your bank'}. Open easy-access savings there first.`;
  return roundUpChoiceRefusal(at.bankId, at.rule, choice);
}

/** Whether round-ups are on, at the bank they were set up at, with every choice made. A save from before 2026-10-13 kept no bank or choice: on where its bank needs no choice. */
export function roundUpsOn(sim: Simulation, person: Person): boolean {
  const r = person.roundUps;
  const at = roundUpRuleAt(sim, person);
  if (!r?.on || !at || (r.bankId !== undefined && r.bankId !== at.bankId)) return false;
  return roundUpChoiceRefusal(at.bankId, at.rule, r) === undefined;
}

/**
 * What a purchase the debit card (or, where the bank counts it, its own credit card) paid counts toward savings, by the
 * bank's way and the player's choice. Nothing while ING's balance is under its floor, and nothing for KakaoBank, whose
 * sweep is of the balance.
 */
export function roundUpFor(sim: Simulation, person: Person, amount: Money): Money {
  const at = roundUpRuleAt(sim, person);
  const r = person.roundUps;
  if (!at || !r || amount <= 0) return 0;
  const { bankId, rule } = at;
  if (rule.pausedUnder !== undefined && (currentOf(sim, person)?.balance ?? 0) < whole(sim, bankId, rule.pausedUnder)) return 0;
  const way = wayOf(rule, r);
  if (!way) return 0;
  if (way.kind === 'change') {
    const unit = whole(sim, bankId, way.units.length === 1 ? way.units[0]! : r.unit ?? 0);
    return roundUpOf(amount, unit, way.fullOnWhole) * (r.multiplier ?? rule.defaultMultiplier ?? 1);
  }
  if (way.kind === 'flat') return whole(sim, bankId, way.amounts?.length === 1 ? way.amounts[0]! : r.amount ?? 0);
  if (way.kind === 'changePlus') return roundUpOf(amount, whole(sim, bankId, 1)) + whole(sim, bankId, (r.amount ?? 1) - 1);
  return 0;
}

/**
 * Whether a purchase rounds up to nothing because it's already a whole unit (from 2026-10-13): the round-ups journey
 * found a New Haven student's every purchase whole dollars, the day's groceries $10 and a meal $5, and the panel silent
 * through a week of nothing moved. It says how many now.
 */
export function wholePurchase(sim: Simulation, person: Person, amount: Money): boolean {
  const at = roundUpRuleAt(sim, person);
  const way = at ? wayOf(at.rule, person.roundUps) : undefined;
  if (!at || way?.kind !== 'change' || way.fullOnWhole) return false;
  return roundUpOf(amount, whole(sim, at.bankId, way.units.length === 1 ? way.units[0]! : person.roundUps?.unit ?? 0)) === 0;
}

/** Whether the bank's own credit card's purchases count too, and this is its card. */
export function roundsUpCard(sim: Simulation, person: Person, card: Account | undefined): boolean {
  const at = roundUpRuleAt(sim, person);
  return Boolean(at?.rule.credit && card?.bankId === at.bankId);
}

const dateKey = (at: Instant, zone: string) => {
  const p = zonedParts(at, zone);
  return { key: `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`, weekday: p.weekday, day: p.day, epochDay: Math.floor(Date.UTC(p.year, p.month - 1, p.day) / MS_DAY) };
};

/**
 * A purchase's round-up counted: toward what's waiting, and toward the day it was made, so a purchase at a day's first
 * moment (the groceries bought at midnight, before the day's round-ups move) waits for its own day's transfer.
 */
export function countRoundUp(sim: Simulation, person: Person, amount: Money, whole = false): void {
  const r = person.roundUps;
  if (r && whole) r.whole = (r.whole ?? 0) + 1;
  if (!r || amount <= 0) return;
  const key = dateKey(sim.now, sim.homeZone).key;
  if (r.todayKey !== key) { r.today = 0; r.todayKey = key; }
  r.pending += amount;
  r.today = (r.today ?? 0) + amount;
}

/** An account's balance just before a moment: what the day before closed on, before the night's purchases at midnight. */
function balanceBefore(s: Simulation, account: Account, at: Instant): Money {
  let balance = account.balance;
  const txns = s.universe.transactions;
  for (let i = txns.length - 1; i >= 0 && txns[i]!.at >= at; i -= 1) for (const p of txns[i]!.postings) if (p.accountId === account.id) balance -= p.amount;
  return balance;
}

function dropRoundUps(person: Person, at: Instant, why: string): void {
  const r = person.roundUps!;
  const counted = (r.pending ?? 0) + (r.due ?? 0);
  if (counted > 0) r.last = { at, notMoved: counted, why };
  r.pending = 0;
  r.due = 0;
  r.today = 0;
  r.whole = 0;
}

/**
 * The day's round-ups at its start (the rollover): counted, moved or dropped by the bank's rule. Called once a day from
 * the account's life (`systems/accountlife.ts`), after the night's groceries, so a reload or a long skip moves each
 * day's once, as the days pass; what was counted at this day's first moment waits for its own day.
 */
export function moveRoundUps(s: Simulation, person: Person): void {
  const r = person.roundUps;
  if (!r) return;
  const current = currentOf(s, person);
  const at = roundUpRuleAt(s, person);
  // Off, or the primary account moved to a bank that isn't the one it was set up at: nothing waits.
  if (!r.on || !at || !current || (r.bankId !== undefined && r.bankId !== at.bankId)) {
    if (r.on && r.bankId !== undefined && at?.bankId !== r.bankId) { r.on = false; dropRoundUps(person, s.now, 'your primary account moved to another bank'); }
    else if (!r.on) { r.pending = 0; r.due = 0; r.today = 0; }
    return;
  }
  const { bankId, rule } = at;
  // A save from before 2026-10-13 at a bank whose choice is the customer's: nothing counts until it's made, and what
  // the old way counted doesn't move.
  // Said as a reason after “because” (from 2026-10-20, brief 17): until then the refusal itself, a sentence, so the panel's
  // last line read “…, because Choose the amount each purchase, C$0.50 to C$5.00..”. The choice still to make is the
  // refusal the panel gives beside it.
  const missing = roundUpChoiceRefusal(bankId, rule, r);
  if (missing) { dropRoundUps(person, s.now, 'a choice the bank needs from you wasn’t made'); return; }
  r.bankId ??= bankId;
  const savings = roundUpSavings(s, person, bankId);
  if (!savings) { r.on = false; dropRoundUps(person, s.now, `there’s no easy-access savings at ${current.institution ?? 'the bank'}`); return; }
  // The day that ended and the one that starts, in the home's time: two hours back is the day before, whichever hour of
  // a day whose clocks moved its rollover came at.
  const zone = s.homeZone;
  const ended = dateKey(s.now - 2 * MS_HOUR, zone);
  const started = dateKey(s.now, zone);
  const { countryId, regionId } = daysOfAccount(current, person);
  const way = wayOf(rule, r)!;
  // What the day before closed on, and what can move without taking the account below zero now.
  const closing = balanceBefore(s, current, s.now);
  const covers = (amount: Money) => Math.min(closing, current.balance) >= amount;

  if (way.kind === 'remainder') {
    // KakaoBank: Monday to Friday, holidays or not, the remainder of the day before's closing balance.
    if (started.weekday < 1 || started.weekday > 5) return;
    const rest = closing % whole(s, bankId, way.unit);
    if (closing <= whole(s, bankId, way.above) || rest <= 0) return;
    // The 저금통 holds what the sweeps put in, never more than the savings that stand in for it hold now.
    const held = Math.min(r.held ?? 0, savings.balance);
    if (held + rest > whole(s, bankId, way.cap)) { r.held = held; r.last = { at: s.now, notMoved: rest, why: 'it would take the 저금통 past its cap' }; return; }
    if (!covers(rest)) return;
    move(s, person, current, savings, rest);
    r.held = held + rest;
    return;
  }

  // What was counted before this day began: a purchase at its first moment belongs to it.
  if (r.todayKey !== started.key) r.today = 0;
  const before = Math.max(0, r.pending - (r.today ?? 0));
  // When the counted amount moves: what's moving now.
  let moving = 0;
  let from: 'pending' | 'due' = 'pending';
  const every = rule.every ? r.every : undefined;
  if (every) {
    const since = dateKey(r.since ?? s.now, zone);
    const days = started.epochDay - since.epochDay;
    // A day Citi's minimum wasn't met is tried again the next two days, scheduled or not.
    if (every === 'day' || (r.below ?? 0) > 0 || (days > 0 && days % (every === 'week' ? 7 : 14) === 0)) moving = before;
  } else if (rule.when === 'day') moving = before;
  else if (rule.when === 'business') { if (businessDay(countryId, ended.key, regionId)) moving = before; }
  else if (rule.when === 'next-business') {
    if (businessDay(countryId, ended.key, regionId)) { r.due = (r.due ?? 0) + before; r.pending -= before; }
    if (businessDay(countryId, started.key, regionId)) { moving = r.due ?? 0; from = 'due'; }
  } else if (rule.when === 'weekdays') { if (started.weekday >= 1 && started.weekday <= 5) moving = before; }
  else if (rule.when === 'friday-night') { if (ended.weekday === 5) moving = before; }
  else if (rule.when === 'half-month') { if (started.day === 1 || started.day === 16) moving = before; }
  if (moving <= 0) return;

  // Citi: its minimum balance first, waiting two more days, then off; at most its cap a transfer, the rest carried.
  if (rule.minimumAtLeast !== undefined) {
    if (closing < whole(s, bankId, r.minimum ?? rule.minimumAtLeast)) {
      r.below = (r.below ?? 0) + 1;
      if (r.below >= 3) {
        r.on = false;
        dropRoundUps(person, s.now, 'the balance was under your minimum three days running, and Citi turned Spend & Save off');
        if (person.id === s.universe.playerId) s.notify({ category: 'bank', title: 'Spend & Save Turned Off', body: 'Your checking account was under the minimum balance you set three days running, so Citi turned Spend & Save off. What it had counted but not yet moved stays in your checking account. Turn it on again under Your Accounts Over Time.', importance: 45, route: '/workspace/bank' });
      }
      return;
    }
    r.below = 0;
    const now = Math.min(moving, rule.perTransfer !== undefined ? whole(s, bankId, rule.perTransfer) : moving);
    if (!covers(now)) return;
    move(s, person, current, savings, now);
    r.pending -= now;
    return;
  }
  // Every other bank: all or nothing, and never into an overdraft; what couldn't move is dropped.
  if (!covers(moving)) {
    r.last = { at: s.now, notMoved: moving, why: 'the account couldn’t cover it' };
    if (from === 'due') r.due = 0;
    else r.pending -= moving;
    return;
  }
  move(s, person, current, savings, moving);
  if (from === 'due') r.due = 0;
  else r.pending -= moving;
}

function move(s: Simulation, person: Person, current: Account, savings: Account, amount: Money): void {
  s.post({ memo: 'Round-ups', category: 'transfer', postings: [{ accountId: current.id, amount: -amount }, { accountId: savings.id, amount }] });
  person.roundUps!.last = { at: s.now, moved: amount };
  person.roundUps!.whole = 0;
}

/** `bank.set_round_ups`: on with the choices the bank leaves to the customer, or off, dropping what was counted. */
export function setRoundUps(s: Simulation, p: { on: boolean } & RoundUpChoice): { on: boolean } {
  const person = s.player;
  const at = roundUpRuleAt(s, person);
  const prev = person.roundUps;
  if (!p.on) {
    if (!at && !prev?.on) throw new CommandError(roundUpRefusal(s, person, {})!);
    person.roundUps = { ...(prev ?? { pending: 0 }), on: false };
    dropRoundUps(person, s.now, 'round-ups were turned off');
    return { on: false };
  }
  const sameBank = prev?.bankId === at?.bankId;
  const choice: RoundUpChoice = { way: p.way ?? (sameBank ? prev?.way : undefined), unit: p.unit ?? (sameBank ? prev?.unit : undefined), amount: p.amount ?? (sameBank ? prev?.amount : undefined), multiplier: p.multiplier ?? (sameBank ? prev?.multiplier : undefined), every: p.every ?? (sameBank ? prev?.every : undefined), minimum: p.minimum ?? (sameBank ? prev?.minimum : undefined) };
  const why = roundUpRefusal(s, person, choice);
  if (why) throw new CommandError(why);
  const keep = sameBank && prev?.on;
  person.roundUps = {
    on: true, pending: keep ? prev!.pending : 0, due: keep ? prev!.due : 0, bankId: at!.bankId,
    ...Object.fromEntries(Object.entries(choice).filter(([, v]) => v !== undefined)),
    since: keep ? prev!.since ?? s.now : s.now, below: 0,
    ...(prev?.last ? { last: prev.last } : {}),
  };
  return { on: true };
}
