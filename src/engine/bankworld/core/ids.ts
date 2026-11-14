/**
 * SLATE — Deterministic identifier generation.
 *
 * Ids must be deterministic so that replaying the same command sequence against
 * the same seed reproduces a byte-identical universe. We therefore never use
 * crypto.randomUUID() for world entities; ids are derived from monotonic
 * counters that live inside the save itself — one for each namespace, which
 * `createIdFactory` says the reason for at length.
 */

export type Id = string;

/**
 * Collections are namespaced so an id is self-describing in a log.
 *
 * A list rather than a bare union, because the list has two readers that need
 * the names at runtime: the pick-up for a save written before every namespace
 * had its own counter, below, and `tools/wired.mjs`, which fails the gate on a
 * namespace nothing ever asks for.
 *
 * Seven once, and a hundred and twenty-five before that. A namespace nothing
 * issues is a table the game never fills, so the list holds only the nouns
 * something in this build actually creates: the player, money, the clock, the logs (two since the history went,
 * 2026-10-02), documents, and from 2026-10-07 a course's assignments and the rehearsals agreed for them
 * (`systems/coursework.ts`), and from 2026-10-20 (brief 19) the professional record's credits, materials, history
 * events, agreements, opportunities, engagements and payments, all under `pro` (`systems/pro.ts`). Journeys, vehicles,
 * land, possessions and their orders, clothes and outfits, routines, the people a life knew, pawn pledges, pets and
 * packing lists had theirs until those went in the scope reset of 2026-10-09; a save's counters for them are kept and
 * read by nothing.
 */
export const ID_NAMESPACES = [
  'person', 'account', 'txn', 'sched', 'notice', 'decision', 'document', 'assignment', 'rehearsal', 'pro',
] as const;

export type IdNamespace = typeof ID_NAMESPACES[number];

const COUNTER_KEY = '__idCounter';
const COUNTERS_KEY = '__idCounters';

export interface IdCounterHost {
  [COUNTER_KEY]: number;
  [COUNTERS_KEY]?: Partial<Record<IdNamespace, number>>;
}

/**
 * Every namespace's counter, made on the first ask if the save has none.
 *
 * Where a save written before the namespaces were told apart is picked up.
 */
function countersOn(host: IdCounterHost): Partial<Record<IdNamespace, number>> {
  const already = host[COUNTERS_KEY];
  if (already) return already;
  const counters: Partial<Record<IdNamespace, number>> = {};
  // A save written before the namespaces were told apart carries one number
  // that is at or above every id in it, so starting every namespace there is
  // the only pick-up that cannot hand out an id twice. A world that has never
  // issued one has nothing to collide with and starts each namespace at one —
  // and the counter being nought is the fact that says so, rather than a flag
  // somebody has to remember to set.
  if (host[COUNTER_KEY] > 0) for (const ns of ID_NAMESPACES) counters[ns] = host[COUNTER_KEY];
  host[COUNTERS_KEY] = counters;
  return counters;
}

/**
 * Creates an id factory bound to a mutable counter host (the save universe).
 * Ids look like `veh_0042` — sortable, readable, and reproducible.
 *
 * ## One counter per namespace, and the reason it is worth the field
 *
 * There was one counter for the whole save, so every namespace drew from it in
 * the order the world happened to touch them. That made an id in one namespace
 * a function of how much work every other namespace had done, and several of
 * the engine's seeded streams are keyed on an id — `sim.rng('casting', 'offer',
 * project.id, role.id, person.id)` is the plainest of them. So posting one
 * extra transaction anywhere in the save changed which performer walked into
 * the audition room, what the office believed about them, and whether they took
 * the part.
 *
 * That is not a theoretical hazard. Building the VAT return, which posts
 * transactions and nothing else, moved outcomes in six tests across three files
 * that had nothing to do with tax. Funding a company by one line in a test
 * changed which of four people was cast in an unrelated part. Every one of
 * those looked like a bug in the thing being built, and every one of them cost
 * an hour before it turned out to be this.
 *
 * Now a namespace only moves when something in that namespace is made. It does
 * not make ids stable against every change — adding a person still moves every
 * person after them, and that is unavoidable and correct — but it stops a
 * change in one part of the world from silently reshuffling every other part.
 *
 * `__idCounter` is kept and still counts every id ever issued, which is what
 * makes the upgrade safe: a save written before this carries one number that is
 * at or above every id in it, so starting each namespace from there cannot
 * collide with anything already handed out.
 */
export function createIdFactory(host: IdCounterHost) {
  return function nextId(ns: IdNamespace): Id {
    const counters = countersOn(host);
    const at = (counters[ns] ?? 0) + 1;
    counters[ns] = at;
    host[COUNTER_KEY] += 1;
    return `${ns}_${at.toString(36).padStart(6, '0')}`;
  };
}

/**
 * Says an id at this number in this namespace has already been handed out.
 *
 * For the one id the game writes by hand rather than asking for: the player is
 * `person_000001` before there is a simulation to ask, and the counter has to
 * be told so the next person is not the player again.
 */
export function idAlreadyIssued(host: IdCounterHost, ns: IdNamespace, at: number): void {
  const counters = countersOn(host);
  if ((counters[ns] ?? 0) < at) counters[ns] = at;
  if (host[COUNTER_KEY] < at) host[COUNTER_KEY] = at;
}

/** Stable, non-cryptographic 32-bit string hash (FNV-1a). Used for seeding. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
