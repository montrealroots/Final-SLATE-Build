// Auditable production ledger. Obligations move reserved -> committed -> settled, or cancelled.
// Each settlement carries a unique key so the same day or item can never be charged twice.
// Unaccepted offers only reserve funds; they never consume cash.

import { addLog, newId } from './state';
import type { GameState, Obligation, Project } from './types';

export function totalFund(p: Project): number {
  return p.funding.fund + p.funding.extra.reduce((s, e) => s + e.amount, 0) + p.revenue;
}

export function ledgerTotals(p: Project) {
  let reserved = 0;
  let committedOutstanding = 0;
  let settled = 0;
  for (const o of p.obligations) {
    settled += o.settled;
    if (o.state === 'reserved') reserved += o.amount - o.settled;
    if (o.state === 'committed') committedOutstanding += Math.max(0, o.amount - o.settled);
  }
  const fund = totalFund(p);
  return { fund, reserved, committedOutstanding, settled, available: fund - settled - committedOutstanding - reserved, cash: fund - settled };
}

export class FundsError extends Error {
  constructor(message: string, readonly shortfall: number) {
    super(message);
  }
}

export function money(n: number): string {
  const sign = n < 0 ? '-' : '';
  return `${sign}$${Math.abs(Math.round(n)).toLocaleString('en-US')}`;
}

export function reserve(state: GameState, p: Project, label: string, category: Obligation['category'], amount: number, ref?: string): Obligation {
  if (!(amount >= 0) || !Number.isFinite(amount)) throw new Error('Invalid amount.');
  const { available } = ledgerTotals(p);
  if (amount > available) {
    throw new FundsError(
      `This needs ${money(amount)}, but only ${money(available)} is uncommitted. Lower the amount, release someone, cut scope, or bring in more funding.`,
      amount - available,
    );
  }
  const o: Obligation = { id: newId(state, 'o'), label, category, amount: Math.round(amount), state: 'reserved', settled: 0, ref, postings: [] };
  o.postings.push({ at: state.now, kind: 'reserve', amount: o.amount, key: `${o.id}:reserve` });
  p.obligations.push(o);
  return o;
}

export function commit(state: GameState, p: Project, id: string, amount?: number): Obligation {
  const o = obligation(p, id);
  if (o.state !== 'reserved') throw new Error('Only reserved funds can be committed.');
  if (amount !== undefined) {
    const delta = amount - o.amount;
    if (delta > ledgerTotals(p).available) throw new FundsError(`The agreed amount is ${money(delta)} more than you have uncommitted.`, delta);
    o.amount = Math.round(amount);
  }
  o.state = 'committed';
  o.postings.push({ at: state.now, kind: 'commit', amount: o.amount, key: `${o.id}:commit` });
  return o;
}

/** Pay part of an obligation once per key. Returns false if this key was already paid. */
export function settle(state: GameState, p: Project, id: string, amount: number, key: string): boolean {
  const o = obligation(p, id);
  if (o.state === 'cancelled') return false;
  if (o.postings.some((x) => x.key === key)) return false;
  const pay = Math.round(amount);
  if (pay <= 0) return false;
  o.settled += pay;
  if (o.settled > o.amount) o.amount = o.settled; // overruns are recorded, never hidden
  o.postings.push({ at: state.now, kind: 'settle', amount: pay, key });
  if (o.state === 'reserved') o.state = 'committed';
  return true;
}

export function closeSettled(p: Project, id: string): void {
  const o = obligation(p, id);
  if (o.state !== 'cancelled') {
    o.amount = o.settled;
    o.state = 'settled';
  }
}

export function cancel(state: GameState, p: Project, id: string): void {
  const o = obligation(p, id);
  if (o.state === 'settled' || o.state === 'cancelled') return;
  o.postings.push({ at: state.now, kind: 'cancel', amount: o.amount - o.settled, key: `${o.id}:cancel` });
  o.amount = o.settled;
  o.state = o.settled > 0 ? 'settled' : 'cancelled';
}

export function obligation(p: Project, id: string): Obligation {
  const o = p.obligations.find((x) => x.id === id);
  if (!o) throw new Error('Unknown budget line.');
  return o;
}

/** Pay a one-off cost immediately (reserve + settle), refusing if funds are short. */
export function spend(state: GameState, p: Project, label: string, category: Obligation['category'], amount: number, key: string): Obligation | null {
  const existing = p.obligations.find((o) => o.postings.some((x) => x.key === key));
  if (existing) return null;
  const o = reserve(state, p, label, category, amount);
  settle(state, p, o.id, amount, key);
  closeSettled(p, o.id);
  return o;
}

export function categoryTotals(p: Project): Record<string, { planned: number; settled: number }> {
  const out: Record<string, { planned: number; settled: number }> = {};
  for (const o of p.obligations) {
    if (o.state === 'cancelled') continue;
    const c = (out[o.category] ??= { planned: 0, settled: 0 });
    c.planned += o.amount;
    c.settled += o.settled;
  }
  return out;
}

/** Co-production finance: adds funds once, with the partner's approval right surfaced before signing. */
export const CO_PRODUCTION_TERMS = { share: 0.5, approvalRights: ['Casting Approval'] };

export function bringInCoProducer(state: GameState, p: Project): number {
  if (p.funding.extra.some((e) => e.label === 'Co-Production Partner')) throw new Error('This project already has a co-production partner.');
  if (p.delivered) throw new Error('This project has already been delivered.');
  const amount = Math.round(p.funding.fund * CO_PRODUCTION_TERMS.share);
  p.funding.extra.push({ label: 'Co-Production Partner', amount, approvalRights: [...CO_PRODUCTION_TERMS.approvalRights] });
  addLog(state, `A co-production partner joined ${p.title} with ${money(amount)}. They now approve lead casting.`, 'money', {
    projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' },
  });
  p.history.push({ at: state.now, text: `Co-production partner added ${money(amount)}.` });
  return amount;
}
