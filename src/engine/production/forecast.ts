// When the remaining production work finishes, at today's pace (the owner's v6 package, J06, "delivery date propagation";
// from November 14, 2026). The longest chain of unfinished work through the task graph, each task taking the working days
// its remaining work needs: person-days over the people hired for its role, frames over the render nodes' capacity, one
// session a day. Mapped onto the project's own working days (its weekends, holidays and observances). A rig fault, a
// smaller render farm or a new task on the chain moves the date; more people or nodes bring it in. Derived, never stored.
//
// shortcut: two tasks needing the same people are counted as if each had them all, so the date is the earliest the
// graph allows, not a resource-levelled schedule; a shoot still to come counts as its remaining shoot days in a row, and
// a picture lock as soon as its episode's work before the lock is done (no cut passes are assumed).
// Upgrade to levelling if a player is misled by a date that can't be met.
import { addDaysToKey } from '../time';
import type { Project, Task } from '../types';
import { RENDER_HOURS_PER_FRAME } from './rates';
import { isWorkingDay } from './schedule';
import { milestoneDone, playerDoes, teamFor } from './workday';

/** The working days one unfinished task still needs, at today's pace. */
export function workDaysLeft(p: Project, task: Task): number {
  const left = Math.max(0, task.units - task.done);
  if (left <= 1e-9 || task.status === 'done') return 0;
  if (task.roleId === 'render') return Math.ceil((left * RENDER_HOURS_PER_FRAME[p.axes.animationQuality]) / (Math.max(1, p.schedule.renderNodes) * 24));
  if (task.unitLabel.endsWith('days')) return Math.ceil(left / Math.max(1, playerDoes(task.roleId) ? 1 : teamFor(p, task.roleId, task.episode).length));
  return Math.ceil(left); // sessions, takes and the like: one a working day
}

export interface Forecast {
  /** Working days until the last of the remaining work is done. */
  workingDays: number;
  /** The date it finishes, a key in the project's base. */
  finish: string;
  /** The chain that sets it, first to last. */
  chain: string[];
}

/** The forecast from `today` (a date key), or null when nothing is left to do. */
export function forecastFinish(p: Project, today: string): Forecast | null {
  const open = new Map(p.tasks.filter((t) => t.status !== 'done').map((t) => [t.id, t]));
  if (!open.size) return null;
  // Work that waits for a picture lock, directly or through another task: the lock itself waits for the rest.
  const afterLock = new Set<string>();
  for (let grew = true; grew;) {
    grew = false;
    for (const t of open.values()) {
      if (afterLock.has(t.id)) continue;
      if (t.dependsOn.some((d) => d.startsWith('milestone:lock') || afterLock.has(d))) { afterLock.add(t.id); grew = true; }
    }
  }
  const shootDaysLeft = p.schedule.days.filter((d) => d.status === 'scheduled').length;
  const memo = new Map<string, { days: number; chain: string[] }>();
  const visiting = new Set<string>();
  const longest = (t: Task): { days: number; chain: string[] } => {
    const hit = memo.get(t.id);
    if (hit) return hit;
    if (visiting.has(t.id)) return { days: 0, chain: [] }; // a cycle is graphFaults' to report, not the forecast's
    visiting.add(t.id);
    let before = { days: 0, chain: [] as string[] };
    for (const d of t.dependsOn) {
      let r: { days: number; chain: string[] } | null = null;
      const lock = /^milestone:lock:(\d+)$/.exec(d);
      if (lock && !milestoneDone(p, d)) {
        // The lock of an episode comes once its own work before the lock is done (the cut is the player's to lock).
        for (const x of open.values()) if (!afterLock.has(x.id) && (x.episode === Number(lock[1]) || x.episode === 0)) { const y = longest(x); if (!r || y.days > r.days) r = y; }
      } else if (d.startsWith('capture:') && !milestoneDone(p, d)) r = { days: shootDaysLeft, chain: shootDaysLeft ? ['The Shoot'] : [] };
      else { const dep = open.get(d); if (dep) r = longest(dep); }
      if (r && r.days > before.days) before = r;
    }
    visiting.delete(t.id);
    const out = { days: before.days + workDaysLeft(p, t), chain: [...before.chain, t.label] };
    memo.set(t.id, out);
    return out;
  };
  let best = { days: 0, chain: [] as string[] };
  for (const t of open.values()) { const r = longest(t); if (r.days > best.days) best = r; }
  // Count forward over the project's working days; today counts if it is one.
  let key = today;
  let n = best.days;
  for (let guard = 0; guard < 20_000; guard++) {
    if (isWorkingDay(p, key)) { n -= 1; if (n <= 0) break; }
    key = addDaysToKey(key, 1);
  }
  return { workingDays: best.days, finish: key, chain: best.chain };
}
