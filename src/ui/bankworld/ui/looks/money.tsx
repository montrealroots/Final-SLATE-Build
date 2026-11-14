/**
 * SLATE — the money, and what it comes to.
 *
 * Home prints four money facts and every one of them is a dead end: the name
 * of the account you spend from, the balance in it, a net worth, and what is
 * owed. None of them is a made-up figure. A balance is the sum of its postings
 * (`core/ledger.ts`), net worth is recomputed from the ledger every time it
 * is asked for (`systems/finance.ts`), and neither is stored
 * anywhere a screen could get them wrong.
 *
 * Three kinds live here. An `account` is a thing — a real account at a real
 * institution, with a balance, a last four and, where it is a card, a limit
 * and a rate. That is a floor a chain is allowed to end on. `networth` is a
 * figure rather than a thing, and it is treated the way readiness is: it opens
 * into a sentence about what makes it up and ways into the accounts actually
 * making it, because an account is a thing and a subtraction is not. `debt` is
 * the same again for the other side of the sheet.
 *
 * That the ledger is double-entry and audits clean is worth one line at the
 * foot of net worth. It is not worth a lecture, and it is never a level.
 */

import { formatMoney, saveCurrency, type Money } from '../../../../engine/bankworld/core/money';
import { Ledger, isLiability, type Account, type AccountKind } from '../../../../engine/bankworld/core/ledger';
import { MS_DAY, formatDate } from '../../../../engine/bankworld/core/time';
import { titleCaseLabel } from '../../../../engine/bankworld/core/text';
import { netWorth, type Worth } from '../../../../engine/bankworld/systems/finance';
import type { Person } from '../../../../engine/bankworld/domain/model';
import type { Simulation } from '../../../../engine/bankworld/index';
import { Stat } from '../components/primitives';
import { defineLook, type Way } from './registry';
import { at } from './subject';
import { isAre, spokenList } from './words';
import { cardTerms, stateOf } from '../../../../engine/bankworld/systems/credit';
import { lendingOf } from '../../../../engine/bankworld/systems/lending';
import { cashOwedOn } from '../../../../engine/bankworld/systems/cash';
import { planLeftOf, transferRate } from '../../../../engine/bankworld/systems/cardoffers';
import { bankById } from '../../../../engine/bankworld/content/banks';
import { balanceText } from '../../../../engine/bankworld/systems/abroad';

/** The window every "lately" sentence in this file means, and its word. */
const RECENT_DAYS = 30;
const RECENT_WORDS = 'thirty days';

/** What the world calls each sort of account, in its plain name (from 2026-10-17: until then “What You Spend From”, “A Line Of Credit” and the like). Never the engine’s word for it. */
const ACCOUNT_KIND: Readonly<Record<AccountKind, string>> = {
  checking: 'Checking Account',
  savings: 'Savings Account',
  cash: 'Cash In Hand',
  credit_card: 'Credit Card',
  loan: 'Loan',
  mortgage: 'Mortgage',
  auto_loan: 'Car Loan',
  brokerage: 'Investments',
  company_cash: 'Company Account',
  company_credit: 'Company Card',
  escrow: 'Money Held For Later',
  production_account: 'Production Account',
  // Nominal accounts never resolve, so these are here for completeness only.
  income: 'Where Money Comes From',
  expense: 'Where Money Goes',
  equity: 'What Was There To Start',
  asset_value: 'What A Thing Is Worth',
  liability_other: 'Something Owed',
};

/** How a spend category is written where a person reads it. */
const CATEGORY_WORDS: Readonly<Record<string, string>> = {
  opening: 'Carried From Before',
  groceries: 'Food',
};

const categoryWords = (key: string): string =>
  CATEGORY_WORDS[key] ?? titleCaseLabel(key.replace(/_/g, ' '));

const personIn = (sim: Simulation, id: string): Person | undefined =>
  sim.universe.people[id || sim.universe.playerId];

/** What a liability account actually has against it. Never negative. */
const owedOn = (a: Account): number => Math.max(0, -a.balance);

/** "22.49%", from a rate stored as a decimal. */
const ratePercent = (apr: number): string => `${(apr * 100).toFixed(2)}%`;

/**
 * The rate an account is charged at now: a card’s by its terms (an
 * introductory rate, a penalty rate, the legal cap, `cardTerms`), anything
 * else’s as written. Until 2026-09-27 a card’s look read the rate written on
 * it, 24.99% through a 0% introduction that Home showed as 0%.
 */
function rateOf(sim: Simulation, a: Account): number | undefined {
  // A current account overdrawn, or with one arranged, is charged its overdraft’s rate day by day (`systems/lending.ts`):
  // until 2026-09-27 it read as charging nothing. Bills Owed, what went unpaid, carries none, and read as 0%; until
  // 2026-10-12 this called it what’s owed the landlord, which it was until the home went on 2026-10-09.
  if (a.kind === 'checking') {
    const od = a.bankId ? lendingOf(bankById(a.bankId)).overdraft : undefined;
    const rate = a.overdraftRate ?? (od && 'rate' in od ? od.rate : undefined);
    return a.balance < 0 || (a.overdraftLimit ?? 0) > 0 ? rate : undefined;
  }
  if (a.category === 'arrears' || a.apr === 0) return undefined;
  if (a.kind !== 'credit_card' || a.apr === undefined) return a.apr;
  const owner = a.ownerId ? sim.universe.people[a.ownerId] : undefined;
  return cardTerms(sim, a, owner?.credit?.score ?? 650).apr;
}

/**
 * A year of interest on what an account owes, as the engine charges it: a
 * card’s cash and transfers at their own rates, a plan charged as interest at
 * its own and a plan with a fee at none (its fee is in place of interest), and
 * the rest at the purchase rate. Until 2026-09-27 the whole card was taken at
 * the purchase rate; until 2026-10-12 a plan’s balance was too, as the engine
 * never charges it (`planLeftOf`), so a plan charged as interest during a 0%
 * introduction read as "charged no interest today" while its interest posted.
 */
function yearOfInterest(sim: Simulation, a: Account): Money {
  const owed = owedOn(a);
  const owner = a.ownerId ? sim.universe.people[a.ownerId] : undefined;
  if (a.kind !== 'credit_card' || !owner?.credit) return Math.round(owed * (rateOf(sim, a) ?? 0));
  const terms = cardTerms(sim, a, owner.credit.score);
  const cash = cashOwedOn(owner, a);
  let transfers = 0;
  let transferInterest = 0;
  const state = stateOf(owner, a);
  for (const one of state.transfers ?? []) { transfers += one.owed; transferInterest += one.owed * transferRate(sim, state, one); }
  const planInterest = (state.plans ?? []).reduce((s, plan) => s + plan.left * (plan.apr ?? 0), 0);
  const rest = Math.max(0, owed - cash - transfers - planLeftOf(state));
  return Math.round(rest * terms.apr + cash * (terms.cashApr ?? terms.apr) + transferInterest + planInterest);
}

/** How long it has been there, in the words a person uses for it. */
function heldFor(sim: Simulation, openedAt: number): string {
  const days = Math.max(0, Math.round((sim.now - openedAt) / MS_DAY));
  if (days < 30) return 'this month';
  if (days < 60) return 'last month';
  const months = Math.round(days / 30);
  if (months < 24) return `${months} months ago`;
  return `${Math.round(days / 365)} years ago`;
}

/** What has crossed an account lately, as money in and money out. */
function movement(sim: Simulation, accountId: string): { inward: number; outward: number } {
  const since = sim.now - RECENT_DAYS * MS_DAY;
  let inward = 0;
  let outward = 0;
  for (const txn of sim.ledger.history(accountId, 400)) {
    if (txn.at < since) continue;
    const delta = Ledger.effectOn(txn, accountId);
    if (delta > 0) inward += delta;
    else outward += -delta;
  }
  return { inward, outward };
}

/** The accounts with something standing against them, worst first. */
function debtsOf(sim: Simulation, ownerId: string): Account[] {
  return sim.ledger.accountsOf(ownerId)
    .filter((a) => isLiability(a.kind) && owedOn(a) > 0)
    .sort((a, b) => owedOn(b) - owedOn(a));
}

// ---------------------------------------------------------------------------
// One account
// ---------------------------------------------------------------------------

defineLook<Account>('account', {
  gone: 'That account is closed. What was in it went elsewhere when it closed.',
  resolve: (sim, id) => {
    const account = sim.ledger.tryAccount(id);
    if (!account || account.nominal || account.closedAt) return undefined;
    return account;
  },
  seeds: (sim) => sim.ledger.accountsOf(sim.universe.playerId).map((a) => a.id),
  look: (account, { sim }) => {
    // Company and production accounts are owned by a company, not a person, so
    // neither the trail up nor the way across to Owed is theirs to offer.
    const owner = sim.universe.people[account.ownerId];
    const ways: Way[] = [];
    if (owner && isLiability(account.kind) && owedOn(account) > 0) {
      ways.push({
        to: at('debt', account.ownerId),
        label: 'Owed',
        detail: 'Everything you owe, and what a year of interest on it would cost at today’s rates',
      });
    }
    return {
      name: account.name,
      kind: ACCOUNT_KIND[account.kind],
      parent: owner ? at('person', owner.id) : undefined,
      summary: accountSentence(account, sim),
      body: accountBody(account, sim),
      ways,
      // Without the ledger’s own rule in it (from brief 15, 2026-10-19): until then “…, not a figure anybody typed in.”
      provenance: account.apr === undefined
        ? 'The balance is the sum of every payment into and out of the account.'
        : 'The balance is the sum of every payment into and out of the account. The rate is what the terms charge today, and it’s charged at each statement on any balance the last statement didn’t clear.',
    };
  },
});

/** What the account is doing right now, in one sentence. */
function accountSentence(a: Account, sim: Simulation): string {
  const cur = saveCurrency(sim.universe);
  const where = a.institution ? ` at ${a.institution}` : '';
  const spendsFromIt = sim.universe.people[a.ownerId]?.primaryAccountId === a.id;

  if (isLiability(a.kind)) {
    const owed = owedOn(a);
    const limit = a.creditLimit ?? 0;
    // A card paid past what it owed holds the rest (from 2026-10-17, brief 14's dynamic cases: until then it read as
    // owing nothing with the whole limit free, beside a Left To Spend over the limit).
    if (owed === 0 && a.balance > 0) {
      return limit > 0
        ? `You owe nothing on it${where}, and it holds ${formatMoney(a.balance, cur)} of your money on top of the whole ${formatMoney(limit, cur)} limit.`
        : `You owe nothing on it${where}, and it holds ${formatMoney(a.balance, cur)} of your money.`;
    }
    if (owed === 0) {
      return limit > 0
        ? `You owe nothing on it${where}, and the whole ${formatMoney(limit, cur)} limit is free to use.`
        : `You owe nothing on it${where}.`;
    }
    const free = Math.max(0, limit + a.balance);
    return limit > 0
      ? `You owe ${formatMoney(owed, cur)} on it${where}, which leaves ${formatMoney(free, cur)} of its ${formatMoney(limit, cur)} limit free to use.`
      : a.category === 'arrears'
        // Settled each night from the current account and then its savings (`settleArrears`, `systems/spending.ts`).
        // Until 2026-10-12 this ended "unless you pay rent by hand": the rent went with the home on 2026-10-09.
        ? `You owe ${formatMoney(owed, cur)} on it${where}. Each night it’s paid from the first money in your primary account, then from your savings at the same bank.`
        : `You owe ${formatMoney(owed, cur)} on it${where}, and it only goes down as you pay it.`;
  }

  if (a.balance < 0) {
    return `It’s ${a.currency ? balanceText(sim, a, -a.balance, -(a.held ?? 0)) : formatMoney(-a.balance, cur)} overdrawn${where}, and every day it stays overdrawn can cost you.`;
  }
  if (a.balance === 0) {
    return `There’s nothing in it${where}. ${tailFor(a.kind, spendsFromIt)}`;
  }
  // An account kept at home in its own money, the dollars beside (`balanceText`, from 2026-10-16).
  return `You have ${balanceText(sim, a)} in it${where}. ${tailFor(a.kind, spendsFromIt)}`;
}

/** What has crossed it lately, without saying "and nothing" twice. */
function movementSentence(inward: number, outward: number, cur: string): string {
  if (inward === 0 && outward === 0) return `No money has gone in or out in the last ${RECENT_WORDS}.`;
  if (outward === 0) return `${formatMoney(inward, cur)} has come in over the last ${RECENT_WORDS}, and none has gone out.`;
  if (inward === 0) return `${formatMoney(outward, cur)} has gone out over the last ${RECENT_WORDS}, and none has come in.`;
  return `Over the last ${RECENT_WORDS}, ${formatMoney(inward, cur)} came in and ${formatMoney(outward, cur)} went out.`;
}

/** What the money in this sort of account is for. */
function tailFor(kind: AccountKind, spendsFromIt: boolean): string {
  switch (kind) {
    // Until 2026-10-12 the last of it was "for what’s owed the landlord": what went unpaid has been Bills Owed since
    // the home went on 2026-10-09, and savings is drawn on for it each night (`settleArrears`, `systems/spending.ts`).
    case 'savings':
      return 'It’s money set aside. Where you’ve linked it, it pays what the checking account can’t, and it pays off anything left unpaid.';
    case 'brokerage':
      return 'What it’s worth moves with the market.';
    case 'escrow':
      return 'It’s held for one purpose, and you can use it only when that happens.';
    case 'cash':
      return 'It’s yours to spend, with no bank involved.';
    default:
      return spendsFromIt ? 'It’s your primary account, so the day’s spending comes out of it.' : 'It stays there until you move it.';
  }
}

function accountBody(a: Account, sim: Simulation) {
  const cur = saveCurrency(sim.universe);
  const { inward, outward } = movement(sim, a.id);
  const owed = owedOn(a);
  const limit = a.creditLimit ?? 0;
  const liability = isLiability(a.kind);

  const stats = [
    <Stat
      key="balance"
      label={liability ? 'Owed' : 'Balance'}
      // Overdrawn, with a minus sign, as Money writes it (from 2026-10-17, brief 14's dynamic cases: until then "-$41.10").
      value={<span className="mono">{liability ? formatMoney(owed, cur) : a.balance < 0 ? `−${balanceText(sim, a, -a.balance, a.currency ? -(a.held ?? 0) : undefined)}` : balanceText(sim, a)}</span>}
      tone={liability ? (owed > 0 ? 'negative' : undefined) : (a.balance < 0 ? 'negative' : undefined)}
      note={liability ? 'What you owe on it' : 'What’s in it now'}
    />,
  ];
  if (limit > 0) {
    stats.push(
      <Stat
        key="free"
        label="Left To Spend"
        value={<span className="mono">{formatMoney(Math.max(0, limit + a.balance), cur)}</span>}
        note={`Of a ${formatMoney(limit, cur)} limit`}
      />,
    );
  }
  const rate = rateOf(sim, a);
  if (rate !== undefined) {
    stats.push(
      <Stat key="rate" label="Rate" value={ratePercent(rate)} note={a.kind === 'credit_card' ? 'A year, as the card charges it now' : 'A year, as the account states it'} />,
    );
  }
  if (a.last4) {
    stats.push(<Stat key="last4" label="Ends In" value={<span className="mono">{a.last4}</span>} note="The last four digits of its number" />);
  }

  return (
    <>
      <p className="small">
        {a.institution ?? 'The bank'} opened it {heldFor(sim, a.openedAt)}
        {a.last4 ? `, and it ends ${a.last4}` : ''}.{' '}
        {rate !== undefined && a.kind === 'checking'
          ? `When it’s overdrawn, it’s charged ${ratePercent(rate)} a year on the overdrawn amount, day by day, and the interest is taken on the 1st. Any fees are shown on Money.`
          : rate !== undefined
          ? `What’s still owed on it is charged ${ratePercent(rate)} a year: interest is on what’s left, not on what it started at.`
          : a.kind === 'checking' || a.kind === 'savings' ? 'It charges no interest. Any fee for keeping it is shown on Money.' : 'It charges no interest.'}
      </p>
      <p className="small">{movementSentence(inward, outward, cur)}</p>
      <div className="grid grid-3">{stats}</div>
    </>
  );
}

// ---------------------------------------------------------------------------
// What it all comes to
// ---------------------------------------------------------------------------

interface Holdings {
  person: Person;
  worth: Worth;
  accounts: Account[];
}

defineLook<Holdings>('networth', {
  gone: 'There’s nobody here for the money to belong to.',
  resolve: (sim, id) => {
    const person = personIn(sim, id);
    if (!person) return undefined;
    return {
      person,
      worth: netWorth(sim, person.id),
      accounts: sim.ledger.accountsOf(person.id),
    };
  },
  seeds: (sim) => [sim.universe.playerId],
  look: (held, { sim }) => {
    const cur = saveCurrency(sim.universe);
    const { person, worth, accounts } = held;

    const ways: Way[] = accounts.map((a) => ({
      to: at('account', a.id),
      label: a.name,
      detail: isLiability(a.kind)
        ? `${a.institution ?? 'A lender'}, and ${formatMoney(owedOn(a), cur)} owed on it`
        : `${a.institution ?? 'A bank'}, and ${balanceText(sim, a)} in it`,
    }));
    if (worth.liabilities > 0) {
      ways.push({
        to: at('debt', person.id),
        label: 'Owed',
        detail: `${formatMoney(worth.liabilities, cur)} owed, and what a year of interest on it would cost at today’s rates`,
      });
    }

    return {
      name: 'Net Worth',
      kind: 'What It All Comes To',
      parent: at('person', person.id),
      summary: worthSentence(worth, cur, inHand(accounts)),
      body: worthBody(held, cur),
      facets: [
        {
          id: 'went',
          label: 'Where It Went',
          body: spendBody(sim, person.id),
        },
      ],
      ways,
      // Without the bookkeeping (from brief 15, 2026-10-19): until then “Added up from your accounts each time you look,
      // and stored nowhere. Every payment behind it has a matching entry on the other side, and the books balance to the
      // cent.”
      provenance: 'It’s added up from all your accounts each time you look, so it’s right to the cent.',
    };
  },
});

/**
 * Whether any of `Worth.cash` is cash in hand (`systems/cash.ts`), which it counts with the bank. Until 2026-10-12
 * net worth called all of it "in the bank".
 */
const inHand = (accounts: readonly Account[]): boolean => accounts.some((a) => a.kind === 'cash' && !a.closedAt && a.balance > 0);

/**
 * What the money an escrow account holds is doing, by the account’s category, in the net-worth sentence: money sent
 * between the holder’s banks (`systems/bankmoves.ts`), SNAP on the EBT card (`systems/assistance.ts`) and pay held in an
 * agency’s trust account (`systems/propay.ts`). Any other is held for later, as the account’s own kind is called.
 */
const HELD_AS: Readonly<Record<string, string>> = {
  in_transit: 'on its way between your banks',
  ebt: 'in SNAP on your EBT card',
  // Pay a production paid into an agency’s client trust account, passed on less commission (from 2026-10-21, brief 19,
  // `systems/propay.ts`).
  trust: 'held for you in your agency’s client trust account',
};

/** Both sides of it, spoken. */
function worthSentence(w: Worth, cur: string, withCash: boolean): string {
  // One precision through the sentence: whole units where any figure is past where formatMoney drops cents.
  const whole = [w.cash, w.held, w.pension, w.liabilities, w.total].some((x) => Math.abs(x) >= 100_000_00);
  const say = (c: number) => formatMoney(c, cur, { cents: !whole });
  const parts: string[] = [];
  if (w.cash > 0) parts.push(`${say(w.cash)} ${withCash ? 'in the bank or in hand' : 'in the bank'}`);
  if (w.cash < 0) parts.push(`${say(-w.cash)} overdrawn`);
  // Held is what an escrow account holds, each part named from the account that holds it (`Worth.heldAs`). It was a
  // landlord’s deposit until the home went on 2026-10-09, and this said "held as a deposit" until 2026-10-12. For part
  // of 2026-10-12 it said of all of it "held apart, on its way between your banks or as SNAP on an EBT card", which
  // told a Torontonian moving money between banks that it might be a US benefit.
  for (const [as, amount] of Object.entries(w.heldAs)) if (amount > 0) parts.push(`${say(amount)} ${HELD_AS[as] ?? 'held for later'}`);
  if (w.pension > 0) parts.push(`${say(w.pension)} in a pension, locked until you retire`);
  // A home, cars and land were said here too until they went in the scope reset of 2026-10-09.
  if (w.liabilities > 0) parts.push(`${say(w.liabilities)} owed against it`);
  if (parts.length === 0) {
    return 'You’re worth nothing today: no money anywhere, and nothing owed.';
  }
  return `You’re worth ${say(w.total)}: ${spokenList(parts)}.`;
}

function worthBody(held: Holdings, cur: string) {
  const { worth, accounts } = held;
  const names = accounts.map((a) => a.name);
  const spending = accounts.find((a) => a.id === held.person.primaryAccountId);

  return (
    <>
      <p className="small">
        {names.length === 0
          ? 'You have no accounts open anywhere, so any money you have is cash in hand.'
          : `${spokenList(names)} ${isAre(names.length)} open in your name`}
        {names.length > 0 && spending ? `, and ${spending.name} is your primary account, where the day’s spending comes from.` : names.length > 0 ? '.' : ''}
      </p>
      <div className="grid grid-3">
        {/* Cash in hand is counted here with the bank; until 2026-10-12 the label said "In The Bank" over it all. */}
        {inHand(accounts)
          ? <Stat label="In The Bank And In Hand" value={<span className="mono">{formatMoney(worth.cash, cur)}</span>} note="Every account, and the cash on you" />
          : <Stat label="In The Bank" value={<span className="mono">{formatMoney(worth.cash, cur)}</span>} note="Across every account" />}
        <Stat
          label="Owed"
          value={<span className="mono">{formatMoney(worth.liabilities, cur)}</span>}
          tone={worth.liabilities > 0 ? 'negative' : undefined}
          note="Taken off the total"
        />
        <Stat
          label="Net"
          value={<span className="mono">{formatMoney(worth.total, cur)}</span>}
          tone={worth.total < 0 ? 'negative' : 'positive'}
          note="What you’d have once everything owed is paid"
        />
      </div>
    </>
  );
}

/** The other face of the same figure: what has been leaving it. */
function spendBody(sim: Simulation, ownerId: string) {
  const cur = saveCurrency(sim.universe);
  const spend = sim.ledger.spendByCategory(ownerId, sim.now - RECENT_DAYS * MS_DAY, sim.now);
  const rows = Object.entries(spend).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) {
    return <p className="small">You have spent nothing at all in the last {RECENT_WORDS}.</p>;
  }
  const total = rows.reduce((s, [, amount]) => s + amount, 0);
  const top = rows.slice(0, 3).map(([key]) => categoryWords(key).toLowerCase());

  return (
    <>
      <p className="small">
        {formatMoney(total, cur)} has gone out in the last {RECENT_WORDS}, and {spokenList(top)}{' '}
        {isAre(top.length)} where most of it went.
      </p>
      <div className="col gap-2">
        {rows.slice(0, 6).map(([key, amount]) => (
          <div key={key} className="row-between small">
            <span>{categoryWords(key)}</span>
            <span className="mono dim">{formatMoney(amount, cur)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// What is owed
// ---------------------------------------------------------------------------

interface Owing { person: Person; debts: Account[]; total: number }

defineLook<Owing>('debt', {
  gone: 'You don’t owe anyone anything, so there’s nothing to show here.',
  resolve: (sim, id) => {
    const person = personIn(sim, id);
    if (!person) return undefined;
    const debts = debtsOf(sim, person.id);
    if (debts.length === 0) return undefined;
    return { person, debts, total: debts.reduce((s, a) => s + owedOn(a), 0) };
  },
  seeds: (sim) => (debtsOf(sim, sim.universe.playerId).length > 0 ? [sim.universe.playerId] : []),
  look: (owing, { sim }) => { const cur = saveCurrency(sim.universe); return ({
    name: 'Owed',
    kind: 'What You Owe',
    parent: at('networth', owing.person.id),
    summary: owing.debts.length === 1 && owing.debts[0]
      ? `You owe ${formatMoney(owing.total, cur)}, all of it on the ${owing.debts[0].name}.`
      : `You owe ${formatMoney(owing.total, cur)}, spread across ${spokenList(owing.debts.map((a) => a.name))}.`,
    body: debtBody(owing, cur, sim),
    ways: owing.debts.map((a) => ({
      to: at('account', a.id),
      label: a.name,
      detail: rateOf(sim, a) !== undefined
        ? `${formatMoney(owedOn(a), cur)} on it at ${ratePercent(rateOf(sim, a)!)}`
        : `${formatMoney(owedOn(a), cur)} on it, at no stated rate`,
    })),
    provenance: 'The rates are the accounts’ own, and a card’s is charged at each statement on a balance carried. These are the balances right now, not a projection.',
  }); },
});

function debtBody(owing: Owing, cur: string, sim: Simulation) {
  const yearly = owing.debts.reduce((s, a) => s + yearOfInterest(sim, a), 0);
  // Every line open to them, a card with nothing on it among them, as a bureau reads it.
  const lines = Object.values(sim.universe.accounts).filter((a) => a.ownerId === owing.person.id && !a.closedAt && a.kind === 'credit_card' && (a.creditLimit ?? 0) > 0);
  const limits = lines.reduce((s, a) => s + (a.creditLimit ?? 0), 0);
  const revolving = lines;
  const used = limits > 0
    ? Math.round((revolving.reduce((s, a) => s + owedOn(a), 0) / limits) * 100)
    : 0;
  // Only a rate above nothing is expensive. Until 2026-10-12 a card in a 0% introduction was "the expensive one, at
  // 0.00%", after "None of them carries a rate".
  const dearest = owing.debts
    .filter((a) => (rateOf(sim, a) ?? 0) > 0)
    .sort((a, b) => (rateOf(sim, b) ?? 0) - (rateOf(sim, a) ?? 0))[0];
  // A card in its introduction, and when its own rate comes: `cardTerms` gives a `standardApr` only while one is in
  // force. The year above stays at the rate charged now.
  const intros = owing.debts.flatMap((a) => {
    if (a.kind !== 'credit_card') return [];
    const owner = sim.universe.people[a.ownerId];
    const terms = cardTerms(sim, a, owner?.credit?.score ?? 650);
    return terms.standardApr !== undefined && terms.introUntil !== undefined
      ? [`The ${a.name} is at ${ratePercent(terms.apr)} until ${formatDate(terms.introUntil, sim.zone)}, then ${ratePercent(terms.standardApr)}.`]
      : [];
  });
  const said = [
    yearly > 0
      ? `At today’s rates, carrying it would cost about ${formatMoney(yearly, cur)} a year, or ${formatMoney(Math.round(yearly / 12), cur)} a month, if the balances stay as they are. A card paid in full each month is charged none of it.`
      : intros.length > 0
        ? 'They’re charged no interest today.'
        : 'None of them carries a rate, so the balance stays where it is until you pay it.',
    ...intros,
    ...(dearest ? [`The ${dearest.name} is the expensive one, at ${ratePercent(rateOf(sim, dearest) ?? 0)}.`] : []),
  ];

  return (
    <>
      <p className="small">{said.join(' ')}</p>
      <p className="small">
        {limits > 0
          ? `You’re using ${used}% of the ${formatMoney(limits, cur)} of credit open to you. Above 30%, each month’s credit report takes points off your credit score, and the more you use, the more it takes.`
          : 'None of it is on a card or a credit line, so there’s no limit to use up.'}
      </p>
      <div className="grid grid-3">
        <Stat label="Owed" value={<span className="mono">{formatMoney(owing.total, cur)}</span>} tone="negative" note="Across everything" />
        <Stat
          label="A Year Of Interest"
          value={<span className="mono">{formatMoney(yearly, cur)}</span>}
          note="What carrying it would cost"
        />
        <Stat
          label="Credit Used"
          value={limits > 0 ? `${used}%` : 'None open'}
          tone={used > 30 ? 'warning' : undefined}
          note={limits > 0 ? `Of ${formatMoney(limits, cur)}` : 'No card or credit line'}
        />
      </div>
    </>
  );
}
