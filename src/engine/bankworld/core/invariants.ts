/**
 * SLATE — what must hold of a save at every moment (from 2026-10-06), checked
 * by the journeys, the long simulations and the played-life probe alike.
 *
 * Until then the checks lived only in the played-life probe, which isn't in
 * the repository, so no test could ask them and nothing checked a thing's
 * place or a reference's target. Each check here is a law of the world, not a
 * preference: a breach is a defect wherever it's found.
 *
 * - **Money**: every transaction balances to zero in whole cents and is dated
 *   no later than now, and every account's balance is the sum of what was
 *   posted to it (the ledger's law, `core/ledger.ts`); an account in another
 *   currency holds the sum of its postings' own figures, and only such an
 *   account's postings carry one (from 2026-10-16).
 * - **Things**: each item's id is its own, its quantity a finite number not
 *   below zero, its condition between worn out and new, and where it is
 *   names something that exists: a vehicle, an order or a container of
 *   theirs, a home of theirs (`systems/items.ts`).
 * - **Vehicles**: a tank between empty and full.
 * - **The clock's queue**: nothing pending left behind in the past, nothing
 *   resolved still pending.
 * - **People**: wellbeing on its scale.
 *
 * It reports; it never repairs, so a defect is fixed where it's made.
 */

import type { SaveUniverse } from '../domain/model';
import { MS_DAY, type Instant } from './time';

export interface Breach { law: string; detail: string }

/** Every law of the save that doesn't hold now, each with what broke it; none where all hold. */
export function breaches(u: SaveUniverse, now: Instant = u.now): Breach[] {
  const out: Breach[] = [];
  const add = (law: string, detail: string) => { if (out.length < 500) out.push({ law, detail }); };

  // Money.
  const posted = new Map<string, number>();
  for (const t of u.transactions) {
    let sum = 0;
    for (const p of t.postings) {
      if (!Number.isInteger(p.amount)) add('posting not whole cents', `${t.memo}: ${p.amount}`);
      sum += p.amount;
      posted.set(p.accountId, (posted.get(p.accountId) ?? 0) + p.amount);
      if (!u.accounts[p.accountId]) add('posting to an account that doesn’t exist', `${t.memo}: ${p.accountId}`);
    }
    if (sum !== 0) add('transaction doesn’t balance', `${t.memo}: ${sum}`);
    if (t.at > now + 1_000) add('transaction dated after now', t.memo);
  }
  for (const a of Object.values(u.accounts)) {
    if (!Number.isInteger(a.balance)) add('balance not whole cents', `${a.name}: ${a.balance}`);
    else if (a.balance !== (posted.get(a.id) ?? 0)) add('balance not the sum of its postings', `${a.name}: ${a.balance} against ${posted.get(a.id) ?? 0}`);
  }
  // An account in another currency's own figure (from 2026-10-16): what the bank shows is the sum of its postings'
  // native, every posting to it carries one, and a posting to an account kept in the save's money carries none.
  const native = new Map<string, number>();
  for (const t of u.transactions) {
    for (const p of t.postings) {
      const currency = u.accounts[p.accountId]?.currency;
      if (currency !== undefined && p.native === undefined) add('posting in another currency without its figure', `${t.memo}: ${p.accountId}`);
      if (currency === undefined && p.native !== undefined) add('figure in another currency on an account kept in the save’s', `${t.memo}: ${p.accountId}`);
      if (p.native !== undefined && !Number.isInteger(p.native)) add('posting not whole cents', `${t.memo}: native ${p.native}`);
      if (currency !== undefined && p.native !== undefined) native.set(p.accountId, (native.get(p.accountId) ?? 0) + p.native);
    }
  }
  for (const a of Object.values(u.accounts)) {
    if (a.currency !== undefined && (a.held ?? 0) !== (native.get(a.id) ?? 0)) add('held not the sum of its postings', `${a.name}: ${a.held ?? 0} ${a.currency} against ${native.get(a.id) ?? 0}`);
    if (a.currency === undefined && a.held !== undefined) add('figure in another currency on an account kept in the save’s', `${a.name}: held ${a.held}`);
  }

  // People and their things.
  for (const p of Object.values(u.people)) {
    // Their things, the cars' tanks and the homes' items were checked here until those went in the scope reset of 2026-10-09.
    for (const [k, v] of Object.entries(p.wellbeing ?? {})) {
      if (typeof v === 'number' && (!Number.isFinite(v) || v < -0.001 || v > 100.001)) add('wellbeing off its scale', `${p.id}: ${k} ${v}`);
    }
  }

  // The clock's queue.
  const ids = new Set<string>();
  for (const s of u.scheduled) {
    if (ids.has(s.id)) add('scheduled id held twice', `${s.kind} ${s.id}`);
    ids.add(s.id);
    if (s.status === 'pending' && s.at < now - MS_DAY) add('pending item left behind in the past', `${s.kind} at ${new Date(s.at).toISOString()}`);
    if (s.status === 'pending' && s.resolvedAt !== undefined) add('resolved item still pending', `${s.kind} ${s.id}`);
  }
  return out;
}

/** The breaches grouped by law, with how many and the first's detail: what a long run reports. */
export function breachSummary(list: readonly Breach[]): { law: string; count: number; first: string }[] {
  const by = new Map<string, { law: string; count: number; first: string }>();
  for (const b of list) {
    const one = by.get(b.law);
    if (one) one.count += 1; else by.set(b.law, { law: b.law, count: 1, first: b.detail });
  }
  return [...by.values()].sort((a, b) => b.count - a.count);
}
