/**
 * SLATE — what each account has to pay, coming up, and the alerts that read it (from 2026-10-10).
 *
 * Until then the one low-balance alert watched only the primary account, and a student who had moved a card's autopay
 * to a second bank heard nothing as it ran dry before the due date. Now each payment set up ahead is listed against
 * the account it comes from (`obligationsAhead`), and:
 *
 * - **Low balance** (`AlertSettings.lowBalance`): every open current account ending a day under the line, each told
 *   once until it's back above it.
 * - **Short for a payment** (`AlertSettings.upcoming`, on unless turned off): an account that can't cover a payment
 *   due from it within `LOOKAHEAD_DAYS`, with the savings linked to it where the payment draws them (`inReach`, from
 *   2026-10-21), told once for that payment on that day: which account, how much it holds, the payment and its date,
 *   and what can be done. A bank's own upcoming-payment alert works this way; the three days
 *   are SLATE's design, not a bank's published figure.
 */
import type { Simulation } from '../core/simulation';
import type { Person } from '../domain/model';
import type { Account } from '../core/ledger';
import { formatMoney, saveCurrency, type Money } from '../core/money';
import { formatDate, MS_DAY, type Instant } from '../core/time';
import { paymentsOf, SCHEDULED_KIND, STANDING_ORDER_KIND } from './payments';
import { orderSource } from './routing';
import { autopayAsk, autopaySource, cardsOf, DUE_KIND } from './credit';
import { checkingsOf, LOAN_DUE_KIND, repaymentAccount } from './lending';
import { alertsOf } from './statements';
import { balanceText, heldOf } from './abroad';
import { inTheBank } from './spending';

export const LOOKAHEAD_DAYS = 3;

export interface Obligation {
  /** Once per payment and date: what the alert remembers it has said. */
  key: string;
  accountId: string;
  what: string;
  amount: Money;
  at: Instant;
  /** What can be done about it, said with the alert. */
  remedy: string;
  /**
   * Whether the payment draws the easy-access savings linked at its account's bank too, where the link is on: a card's
   * autopay (`payCard`, `autopayReach`) and a loan's payment (`drawFromBank`); a standing order and a payment set for a
   * date don't.
   */
  linked?: boolean;
}

/** Every payment set up to leave one of their accounts between now and a moment, the account it comes from named. */
export function obligationsAhead(sim: Simulation, person: Person, until: Instant): Obligation[] {
  const out: Obligation[] = [];
  const pay = paymentsOf(person);
  for (const item of sim.universe.scheduled) {
    if (item.status !== 'pending' || item.at > until || item.at < sim.now) continue;
    if (item.kind === STANDING_ORDER_KIND && item.payload.personId === person.id) {
      const order = pay.standingOrders.find((o) => o.id === item.payload.orderId);
      const from = order ? orderSource(sim, person, order) : undefined;
      if (order && from) out.push({ key: `order:${order.id}:${item.at}`, accountId: from.id, what: `Your standing order to ${sim.universe.accounts[order.toId]?.name ?? 'savings'}`, amount: order.amount, at: item.at, remedy: 'Move money into it, or have the order pay from another account.' });
    } else if (item.kind === SCHEDULED_KIND && item.payload.personId === person.id) {
      out.push({ key: `scheduled:${item.id}`, accountId: String(item.payload.fromId), what: item.label, amount: Number(item.payload.amount), at: item.at, remedy: 'Move money into it, or cancel the payment.' });
    } else if (item.kind === DUE_KIND && person.credit && (item.payload.personId ?? sim.universe.playerId) === person.id) {
      const card = cardsOf(sim, person).find((c) => c.id === item.payload.accountId);
      const from = card ? autopaySource(sim, person, card) : undefined;
      const asked = card ? autopayAsk(sim, person, card).asked : 0;
      if (card && from && asked > 0) out.push({ key: `card:${card.id}:${item.at}`, accountId: from.id, what: `The ${card.name}’s autopay`, amount: asked, at: item.at, remedy: 'Move money into it, pay the card by hand, or have autopay pay from another account.', linked: true });
    } else if (item.kind === LOAN_DUE_KIND) {
      const loan = sim.universe.accounts[String(item.payload.accountId)];
      if (!loan || loan.ownerId !== person.id || loan.closedAt) continue;
      const from = repaymentAccount(sim, person, loan);
      const owed = Math.min(loan.loanPayment ?? 0, Math.max(0, -loan.balance));
      if (from && owed > 0) out.push({ key: `loan:${loan.id}:${item.at}`, accountId: from.id, what: `The ${loan.name} payment`, amount: owed, at: item.at, remedy: 'Move money into it before the day.', linked: true });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * How far below zero an account is, as the month's statement notice says it (from 2026-10-20, brief 17): until then both
 * alerts printed the balance as it stood, so an overdrawn account “has -$12.00 available”, with a hyphen for its sign, and
 * an empty one “has $0.00 available”, where the glossary says “has nothing available”.
 */
const overdrawnBy = (sim: Simulation, account: Account): string => balanceText(sim, account, -account.balance, account.currency ? -heldOf(account) : undefined);

/**
 * What a payment has in reach on the day: the account's balance, never below nothing, and the easy-access savings linked at
 * its bank where the payment draws them (`Obligation.linked`) and the link is on (`inTheBank`), as the payment itself
 * draws. From 2026-10-21 (brief 20's money audit): until then the balance alone, so with savings linked the alert said an
 * account was short for a card's autopay or a loan's payment, and to move money in, where the savings then paid it.
 */
const inReach = (sim: Simulation, person: Person, account: Account, o: Obligation): Money =>
  o.linked && paymentsOf(person).linkSavings ? inTheBank(sim, person, account) : Math.max(0, account.balance);

/** The day's account alerts: each current account under the low line, and each one short for a payment coming. */
export function accountAlerts(sim: Simulation, person: Person): void {
  const alerts = person.alerts;
  const cur = saveCurrency(sim.universe);
  const settings = alertsOf(person);
  if (alerts && settings.lowBalance !== undefined) {
    const sent = new Set(alerts.lowSentFor ?? (alerts.lowSent && person.primaryAccountId ? [person.primaryAccountId] : []));
    for (const account of checkingsOf(sim, person)) {
      if (account.balance < settings.lowBalance && !sent.has(account.id)) {
        sent.add(account.id);
        sim.notify({ category: 'bank', title: `Low Balance: ${account.name}`, body: `${account.name} at ${account.institution ?? 'your bank'} is ${account.balance < 0 ? `overdrawn by ${overdrawnBy(sim, account)}` : `down to ${balanceText(sim, account)}`}, under the ${formatMoney(settings.lowBalance, cur)} you set.`, importance: 55, route: '/workspace/bank' });
      } else if (account.balance >= settings.lowBalance) sent.delete(account.id);
    }
    alerts.lowSentFor = [...sent].filter((id) => checkingsOf(sim, person).some((a) => a.id === id));
    delete alerts.lowSent;
  }
  if (settings.upcoming === false) return;
  const ahead = obligationsAhead(sim, person, sim.now + LOOKAHEAD_DAYS * MS_DAY);
  // What each account owes in the window, in date order: the second payment from an account is short if the two together are.
  const owing = new Map<string, Money>();
  const said = new Set(person.alerts?.warned ?? []);
  for (const o of ahead) {
    const account = sim.universe.accounts[o.accountId];
    const total = (owing.get(o.accountId) ?? 0) + o.amount;
    owing.set(o.accountId, total);
    if (!account || account.closedAt || inReach(sim, person, account, o) >= total || said.has(o.key)) continue;
    said.add(o.key);
    sim.notify({ category: 'bank', title: `Short For A Payment: ${account.name}`, body: `${o.what}, ${formatMoney(o.amount, cur)}, comes from ${account.name} at ${account.institution ?? 'your bank'} on ${formatDate(o.at, sim.zone)}, and ${account.balance > 0 ? `it has ${balanceText(sim, account)} available` : account.balance < 0 ? `it’s overdrawn by ${overdrawnBy(sim, account)}` : 'it has nothing available'}. ${o.remedy}`, importance: 65, route: '/workspace/bank' });
  }
  // Kept only for payments still ahead, so the list doesn't grow with the years.
  const live = new Set(ahead.map((o) => o.key));
  (person.alerts ??= { statements: false }).warned = [...said].filter((k) => live.has(k));
}
