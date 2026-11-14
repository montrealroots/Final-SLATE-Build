/**
 * SLATE — The world event bus.
 *
 * This is the mechanism that makes SLATE one universe rather than a pile of
 * screens. Systems never reach into each other; they emit domain events and
 * other systems react. Buying a mansion emits `property.purchased`, and
 * finance, tax, insurance, household, calendar, utilities, lifestyle and
 * publicity each decide for themselves what that means.
 *
 * Reactions run synchronously inside the emitting transaction, so a purchase
 * and everything it causes commit or fail together.
 */

import type { Instant } from './time';

export interface WorldEvent<K extends string = string, P = unknown> {
  /** Dotted namespace, e.g. 'property.purchased'. */
  kind: K;
  /** World instant at which the event is considered to have happened. */
  at: Instant;
  payload: P;
  /** Entity the event is primarily about, for history indexing. */
  subjectId?: string;
  /** Free-form tags used by history filters. */
  tags?: string[];
}

export type Reactor<Ctx> = (event: WorldEvent, ctx: Ctx) => void;

interface Registration<Ctx> {
  kind: string;
  /** Lower runs first. Bookkeeping (finance, ownership) uses low numbers. */
  priority: number;
  reactor: Reactor<Ctx>;
  name: string;
}

const MAX_CASCADE_DEPTH = 12;
const MAX_EVENTS_PER_TRANSACTION = 5000;

export class EventBus<Ctx> {
  private registrations: Registration<Ctx>[] = [];
  private byKind = new Map<string, Registration<Ctx>[]>();
  private dirty = true;

  /**
   * Subscribes to an event kind. `kind` may end in '*' to match a namespace,
   * e.g. 'property.*'; '*' alone matches everything (used by the historian).
   */
  on(kind: string, name: string, reactor: Reactor<Ctx>, priority = 100): this {
    this.registrations.push({ kind, name, reactor, priority });
    this.dirty = true;
    return this;
  }

  private resolve(kind: string): Registration<Ctx>[] {
    if (this.dirty) {
      this.byKind.clear();
      this.dirty = false;
    }
    const cached = this.byKind.get(kind);
    if (cached) return cached;
    const matches = this.registrations
      .filter((r) => matchesKind(r.kind, kind))
      .sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
    this.byKind.set(kind, matches);
    return matches;
  }

  /**
   * Dispatches an event and everything it cascades into, breadth-first, in
   * deterministic order. Returns the full ordered list of events that fired.
   */
  dispatch(root: WorldEvent, ctx: Ctx, enqueue: (e: WorldEvent) => void): WorldEvent[] {
    const fired: WorldEvent[] = [];
    let frontier: WorldEvent[] = [root];
    let depth = 0;

    while (frontier.length > 0) {
      if (depth++ > MAX_CASCADE_DEPTH) {
        throw new Error(
          `Event cascade exceeded depth ${MAX_CASCADE_DEPTH} starting from '${root.kind}'. ` +
          'A reactor is very likely emitting an event that re-triggers itself.',
        );
      }
      const next: WorldEvent[] = [];
      const collect = (e: WorldEvent) => {
        next.push(e);
        enqueue(e);
      };
      for (const event of frontier) {
        fired.push(event);
        if (fired.length > MAX_EVENTS_PER_TRANSACTION) {
          throw new Error(`Event storm: more than ${MAX_EVENTS_PER_TRANSACTION} events in one transaction.`);
        }
        const scoped = withEmitter(ctx, collect);
        for (const reg of this.resolve(event.kind)) {
          try {
            reg.reactor(event, scoped);
          } catch (err) {
            throw new Error(
              `Reactor '${reg.name}' failed handling '${event.kind}': ${(err as Error).message}`,
              { cause: err },
            );
          }
        }
      }
      frontier = next;
    }
    return fired;
  }

  /** Registered reactor names for a kind — used by the "what reacts to this?" help panel. */
  reactorsFor(kind: string): string[] {
    return this.resolve(kind).map((r) => r.name);
  }

  /** Every event kind any reactor listens for. Powers architecture validation. */
  knownKinds(): string[] {
    return [...new Set(this.registrations.map((r) => r.kind))].sort();
  }
}

function matchesKind(pattern: string, kind: string): boolean {
  if (pattern === '*') return true;
  if (pattern === kind) return true;
  if (pattern.endsWith('.*')) return kind.startsWith(pattern.slice(0, -1));
  return false;
}

/**
 * Reactors receive a context carrying an `emit` bound to the current cascade.
 * The context type is supplied by the simulation; this helper injects emit
 * without the bus needing to know the context's shape.
 */
export interface Emitting {
  emit: (event: WorldEvent) => void;
}

function withEmitter<Ctx>(ctx: Ctx, emit: (e: WorldEvent) => void): Ctx {
  return Object.assign(Object.create(Object.getPrototypeOf(ctx) as object) as object, ctx, { emit }) as Ctx;
}

export function worldEvent<P>(kind: string, at: Instant, payload: P, opts: { subjectId?: string; tags?: string[] } = {}): WorldEvent<string, P> {
  return { kind, at, payload, subjectId: opts.subjectId, tags: opts.tags };
}
