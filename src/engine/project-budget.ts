// A project's own budget (the owner's v8 package, 03 "Budget creation" and "Liquidity and readiness"; A04, A06; from
// November 14, 2026). Until then a project's budget was a size picked from four (projects.ts FUNDING_SCENARIOS), and its
// target was set from that size. The size now names only the way of working (crew scale). What you plan to spend is an
// amount you type, kept exactly in cents with every revision and its reason. A plan isn't money: setting it, raising it
// or lowering it puts nothing in any account and cancels nothing signed.
//
// The Budget page reads ten figures, each from its own source and never added into another: planned, estimate, approved
// ceiling, committed, received, cash available, reserved, paid, forecast final cost and funding gap. Two questions are
// answered apart: is it funded overall, and can it pay what comes before the money arrives (cash/forecast.ts)?
import { ledgerTotals, money } from './budget';
import { deals, financeSummary } from './finance';
import { projectedCost } from './estimate';
import { cashForecast, type CashEvent, type Forecast } from './cash/forecast';
import { checkMinor, formatMoney } from './cash/money';
import { forecastFinish } from './production/forecast';
import { dateKey } from './time';
import { getPlace } from '../data/places';
import type { GameState, Project } from './types';

export interface PlannedBudget { currency: 'USD'; minor: number }
export interface BudgetRevision { at: number; from: number | null; to: number | null; reason: string }

/** The planned budget, in cents, or null when it isn't set (unknown, not zero). */
export const plannedOf = (p: Project): PlannedBudget | null => p.finance?.planned ?? null;

/**
 * Set (or clear) what you plan to spend. Recorded with its reason. The financing target follows a plan of $1,000 or more,
 * so backers are approached for what you plan; nothing else moves: no cash, no commitment, no cancellation.
 */
export function setPlannedBudget(state: GameState, p: Project, minor: number | null, reason: string): void {
  if (minor !== null) {
    checkMinor(minor);
    if (minor < 0) throw new Error('A planned budget can\'t be negative.');
  }
  if (p.delivered) throw new Error('This project is delivered: its budget is what it spent.');
  p.finance ??= { estimate: p.funding.fund, target: p.funding.fund, deals: [] };
  const from = p.finance.planned?.minor ?? null;
  if (from === minor) return;
  (p.finance.revisions ??= []).push({ at: state.now, from, to: minor, reason: reason.trim() || 'No reason given.' });
  if (minor === null) delete p.finance.planned;
  else {
    p.finance.planned = { currency: 'USD', minor };
    if (minor >= 100_000) p.finance.target = Math.round(minor / 100);
  }
}

/** A planned budget as the screen says it: "$2,000,000 planned", "Not set", or "$0: an unfunded draft". */
export function plannedText(p: Project): string {
  const pl = plannedOf(p);
  if (!pl) return 'Not set';
  return pl.minor === 0 ? `${formatMoney({ currency: pl.currency, minor: 0 })}: an unfunded draft` : `${formatMoney({ currency: pl.currency, minor: pl.minor })} planned`;
}

/** The ten figures the Budget page reads, in whole dollars except the plan (cents). Derived, never stored. */
export function budgetPicture(state: GameState, p: Project) {
  const f = financeSummary(p);
  const l = ledgerTotals(p);
  const forecastFinal = p.delivered ? l.settled : Math.max(projectedCost(state, p).total, l.settled + l.reserved + l.committedOutstanding);
  return {
    planned: plannedOf(p),
    estimate: f.estimate,
    ceiling: f.target,
    committed: f.promised,
    received: f.received,
    cashAvailable: l.available,
    reserved: l.reserved + l.committedOutstanding,
    paid: l.settled,
    forecastFinal,
    gap: Math.max(0, forecastFinal - f.promised),
  };
}

/**
 * The project's money over time: from what it can spend now, the work still to pay for (assumed due now, before delivery,
 * which is the safe assumption while no day-by-day plan of payments exists), and what backers still owe on delivery,
 * dated at the forecast finish. What is reserved or committed is already off the opening figure and isn't counted again.
 */
export function projectCashForecast(state: GameState, p: Project): Forecast & { dueOnDelivery: number; deliveryDate: string | null } {
  const zone = getPlace(p.axes.basePlaceId).zone;
  const today = dateKey(state.now, zone);
  const b = budgetPicture(state, p);
  const l = ledgerTotals(p);
  const toCome = Math.max(0, b.forecastFinal - l.settled - l.reserved - l.committedOutstanding);
  const fin = p.tasks.length ? forecastFinish(p, today) : null;
  const deliveryDate = fin?.finish ?? null;
  const events: CashEvent[] = [];
  if (toCome > 0) events.push({ id: 'to-come', date: today, kind: 'out', minor: Math.round(toCome * 100), label: 'Work still to pay for' });
  let dueOnDelivery = 0;
  for (const d of deals(p).filter((x) => x.status === 'accepted')) {
    const owed = d.amount - d.received;
    if (owed <= 0) continue;
    dueOnDelivery += owed;
    // On delivery, which can't be before the work it pays for is done: dated at the forecast finish, or a year out with no plan.
    events.push({ id: `deal:${d.id}`, date: deliveryDate ?? `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`, kind: 'in', minor: Math.round(owed * 100), secured: true, label: `${d.backer}, on delivery` });
  }
  return { ...cashForecast(Math.round(l.available * 100), events), dueOnDelivery, deliveryDate };
}

/** The two answers, in words: funded overall, and payable on time. */
export function readiness(state: GameState, p: Project): { overall: string; onTime: string; short: number } {
  const fc = projectCashForecast(state, p);
  const short = Math.round(fc.additionalRequired / 100);
  return {
    overall: fc.fundedOverall ? 'Funded overall: what is promised covers what is left to pay.' : `Not funded overall: ${money(short)} more is needed in all.`,
    onTime: fc.firstDeficit === null ? 'Every payment can be made on time.'
      : fc.fundedOverall && fc.dueOnDelivery > 0 ? `Not on time: ${money(short)} is needed before delivery, and the ${money(fc.dueOnDelivery)} paid on delivery can't pay for work before it.`
      : `Not on time: ${money(short)} short from ${fc.firstDeficit === 'now' ? 'now' : fc.firstDeficit}.`,
    short,
  };
}
