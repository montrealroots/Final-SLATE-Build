/**
 * SLATE — The world timeline.
 *
 * Every future commitment in the universe lives here: the midnight rollover,
 * the world's own tick and the plans the player makes. It was written for
 * bills, shifts, flights, shoot days, inspections, birthdays, contract
 * deadlines and scheduled posts, which went with the systems that booked them.
 *
 * LAW: there is exactly one time-advancement code path. Real-time ticking,
 * sleeping and Skip to Event all call `advanceTo`. Nothing anywhere is
 * permitted to assign the world clock directly, because that would let the
 * universe skip work that was due.
 */

import type { Instant } from './time';
import { MS_DAY } from './time';

export type ScheduleStatus = 'pending' | 'done' | 'cancelled' | 'missed';

export interface ScheduledItem {
  id: string;
  saveId: string;
  /** When this becomes due, as a canonical instant. */
  at: Instant;
  kind: string;
  payload: Record<string, unknown>;
  status: ScheduleStatus;
  /** Ties within the same instant break by priority, then id. Lower runs first. */
  priority: number;
  /** Player-facing label, used by Calendar and Skip to Event. */
  label: string;
  /** Calendar grouping, e.g. 'work' | 'health' | 'production'. */
  category: string;
  /** Optional link back to the entity that owns the commitment. */
  refType?: string;
  refId?: string;
  /** True when the player must act rather than the world resolving it alone. */
  requiresPlayer?: boolean;
  /** Stops a clock run to stop for the player, without being a commitment that takes their time: a routine's moment (`systems/routines.ts`, from 2026-10-02). */
  stopsClock?: boolean;
  /** Where the player needs to be. Travel checks use this. */
  locationId?: string;
  /** Minutes the commitment occupies, for conflict detection. */
  durationMinutes?: number;
  /**
   * Minutes it takes to get there before `at`, where that's more than a trip across town (from 2026-10-20, the owner's
   * brief 19, D3): an audition in another city. The Sleep dialog's suggestion keeps it back before the commitment
   * (`travelMinutesOf`, `world/calendar.ts`); left out, it's half an hour, as it was for everything until then.
   */
  travelMinutes?: number;
  createdAt: Instant;
  resolvedAt?: Instant;
}

export interface TimelineHost {
  scheduled: ScheduledItem[];
}

/** Deterministic ordering: time, then priority, then id. */
export function compareScheduled(a: ScheduledItem, b: ScheduledItem): number {
  if (a.at !== b.at) return a.at - b.at;
  if (a.priority !== b.priority) return a.priority - b.priority;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/** Index of the first element not ordered before `item`. */
function lowerBound(list: readonly ScheduledItem[], item: ScheduledItem): number {
  let lo = 0;
  let hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (compareScheduled(list[mid] as ScheduledItem, item) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

export class Timeline {
  /**
   * Forward-only cursor used by time advancement. Kept on the Timeline rather
   * than the caller so that an insertion behind the cursor can rewind it, which
   * is what makes "schedule something in the past" safe.
   */
  private scanIndex = 0;

  constructor(private host: TimelineHost) {}

  /**
   * Inserts in sorted position via binary search. A full re-sort on every add
   * would make a ten-year simulation quadratic.
   */
  add(item: ScheduledItem): ScheduledItem {
    const at = lowerBound(this.host.scheduled, item);
    this.host.scheduled.splice(at, 0, item);
    if (at <= this.scanIndex) this.scanIndex = at;
    return item;
  }

  resetScan(): void {
    this.scanIndex = 0;
  }

  /**
   * The next pending item due at or before `target`, advancing the internal
   * cursor past everything already resolved. O(1) amortised.
   */
  nextDue(target: Instant): ScheduledItem | undefined {
    const list = this.host.scheduled;
    while (this.scanIndex < list.length) {
      const item = list[this.scanIndex] as ScheduledItem;
      if (item.at > target) return undefined;
      if (item.status === 'pending') return item;
      this.scanIndex++;
    }
    return undefined;
  }

  get(id: string): ScheduledItem | undefined {
    return this.host.scheduled.find((s) => s.id === id);
  }

  cancel(id: string, at: Instant): boolean {
    const item = this.get(id);
    if (!item || item.status !== 'pending') return false;
    item.status = 'cancelled';
    item.resolvedAt = at;
    return true;
  }

  /** Cancels every pending item pointing at a given entity. */
  cancelFor(refType: string, refId: string, at: Instant): number {
    let n = 0;
    for (const item of this.host.scheduled) {
      if (item.status === 'pending' && item.refType === refType && item.refId === refId) {
        item.status = 'cancelled';
        item.resolvedAt = at;
        n++;
      }
    }
    return n;
  }

  reschedule(id: string, newAt: Instant): boolean {
    const idx = this.host.scheduled.findIndex((s) => s.id === id);
    if (idx < 0) return false;
    const item = this.host.scheduled[idx] as ScheduledItem;
    if (item.status !== 'pending') return false;
    this.host.scheduled.splice(idx, 1);
    if (idx <= this.scanIndex) this.scanIndex = Math.max(0, this.scanIndex - 1);
    item.at = newAt;
    this.add(item);
    return true;
  }

  pending(): ScheduledItem[] {
    return this.host.scheduled.filter((s) => s.status === 'pending');
  }

  /** The earliest pending item strictly after `after`, optionally filtered. */
  next(after: Instant, filter?: (item: ScheduledItem) => boolean): ScheduledItem | undefined {
    for (const item of this.host.scheduled) {
      if (item.status !== 'pending') continue;
      if (item.at <= after) continue;
      if (filter && !filter(item)) continue;
      return item;
    }
    return undefined;
  }

  /** Pending items due in [from, to], in order. */
  between(from: Instant, to: Instant, filter?: (item: ScheduledItem) => boolean): ScheduledItem[] {
    const out: ScheduledItem[] = [];
    for (const item of this.host.scheduled) {
      if (item.at > to) break;
      if (item.at < from) continue;
      if (item.status !== 'pending') continue;
      if (filter && !filter(item)) continue;
      out.push(item);
    }
    return out;
  }

  /** Everything, resolved or not, overlapping a window — used by Calendar. */
  overlapping(from: Instant, to: Instant): ScheduledItem[] {
    return this.host.scheduled.filter((item) => {
      const end = item.at + (item.durationMinutes ?? 0) * 60_000;
      return end >= from && item.at <= to;
    });
  }

  /**
   * Items whose occupied window overlaps a proposed commitment.
   * This is how Calendar acts as the collision detector of the universe.
   */
  conflicts(at: Instant, durationMinutes: number, ignoreId?: string): ScheduledItem[] {
    const end = at + durationMinutes * 60_000;
    return this.host.scheduled.filter((item) => {
      if (item.status !== 'pending' || item.id === ignoreId) return false;
      if (!item.requiresPlayer) return false;
      const itemEnd = item.at + (item.durationMinutes ?? 0) * 60_000;
      return item.at < end && itemEnd > at;
    });
  }

  /** Drops resolved items older than the retention window to bound save size. */
  prune(before: Instant, keepDays = 400): number {
    const cutoff = before - keepDays * MS_DAY;
    const previous = this.host.scheduled.length;
    this.host.scheduled = this.host.scheduled.filter(
      (s) => s.status === 'pending' || s.at >= cutoff,
    );
    this.resetScan();
    return previous - this.host.scheduled.length;
  }
}

