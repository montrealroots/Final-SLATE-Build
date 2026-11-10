// Delivering a series an episode at a time (November 10, 2026, after #59). Until then a season was delivered whole:
// one picture lock and every task done, so a finished episode couldn't come out while later ones were still being made.
// Now an episode can be cut, locked and delivered on its own, once the work it depends on is done: its scenes, its post
// work, and the shared work those need (a season's design or a song's clearance blocks only the episodes that use it).
// A release day that comes before an episode is delivered holds that episode back, says so, and waits for a new date.
// The whole season is still delivered with Deliver Project, which credits and assesses it as before.
import { approvalRights, approvedScenes, isEpisodic, isNonfiction } from './projects';
import { assemblyComplete, cutScenes } from './finish';
import { coverageGaps } from './edit-actions';
import { ensureWorkEvent } from './production';
import { addLog } from './state';
import type { GameState, Project, Task } from './types';

export const episodeLocked = (p: Project, n: number): boolean => p.edit.pictureLocked || !!p.edit.lockedEpisodes?.includes(n);
export const episodeDelivered = (p: Project, n: number): boolean => !!p.delivered || !!p.episodeDeliveries?.[n];
export const deliveredEpisodes = (p: Project): number[] => Object.keys(p.episodeDeliveries ?? {}).map(Number).sort((a, b) => a - b);
const scenesOf = (p: Project, n: number) => approvedScenes(p).filter((s) => s.episode === n && !cutScenes(p).has(s.id));
const cutPassesFor = (p: Project, n: number) => p.edit.cutPasses + (p.edit.episodeCutPasses?.[n] ?? 0);

/** The work an episode can't be delivered without: its post work and everything that work waits on, shared or not. */
export function episodeWork(p: Project, n: number): Task[] {
  const byId = new Map(p.tasks.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const stack = p.tasks.filter((t) => t.episode === n && t.kind.startsWith('post:') && !t.kind.startsWith('post:cutpass') && t.kind !== 'post:version').map((t) => t.id);
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const d of byId.get(id)?.dependsOn ?? []) if (byId.has(d)) stack.push(d);
  }
  return [...seen].map((id) => byId.get(id)!);
}

/** Why an episode's picture can't be locked yet, in the player's words. */
export function episodeLockBlockers(p: Project, n: number): string[] {
  const out: string[] = [];
  if (episodeLocked(p, n)) return out;
  if (p.tasks.find((t) => t.id === `post:assembly:${n}`)?.status !== 'done') out.push(`Finish the assembly edit of episode ${n}.`);
  const needed = approvalRights(p).includes('Picture Approval') ? 2 : 1;
  if (cutPassesFor(p, n) < needed) out.push(needed === 2 ? `The commissioner approves episode ${n} after at least two cut passes.` : `Complete a cut pass on episode ${n}.`);
  if (p.tasks.some((t) => t.kind.startsWith('post:cutpass') && t.status !== 'done' && (t.kind === 'post:cutpass' || t.episode === n))) out.push('Wait for the current cut pass to finish.');
  const mine = new Set(scenesOf(p, n).map((s) => s.id));
  if (p.schedule.days.some((d) => d.status === 'scheduled' && d.sceneIds.some((id) => mine.has(id)))) out.push(`Some of episode ${n}'s shoot days are still scheduled.`);
  const gap = coverageGaps(p).find((g) => mine.has(g.sceneId) && !g.scheduled && (g.reason === 'Not enough material was captured.' || g.reason === 'Nothing has been shot for it yet.'));
  if (gap) out.push(`${gap.label} is missing coverage. Schedule a pickup, or cut it from the edit.`);
  return out;
}

/** A cut pass on one episode, once its assembly is done: its own editor days, while the rest of the season goes on. */
export function startEpisodeCutPass(state: GameState, p: Project, n: number): Task {
  if (!isEpisodic(p.axes.format)) throw new Error('Only a series cuts an episode at a time.');
  if (p.tasks.find((t) => t.id === `post:assembly:${n}`)?.status !== 'done') throw new Error(`The assembly edit of episode ${n} isn't finished yet.`);
  if (episodeLocked(p, n)) throw new Error(`Episode ${n}'s picture is locked.`);
  if (p.tasks.some((t) => t.kind.startsWith('post:cutpass') && t.status !== 'done' && (t.kind === 'post:cutpass' || t.episode === n))) throw new Error('A cut pass is already in progress.');
  const k = (p.edit.episodeCutPasses?.[n] ?? 0) + 1;
  const minutes = scenesOf(p, n).reduce((a, s) => a + s.estMinutes, 0);
  const task: Task = {
    id: `post:cutpass-ep:${n}:${k}`, kind: 'post:cutpass-ep', label: `Cut Pass On Episode ${n}`, dept: 'Post Production', roleId: 'editor', units: Math.max(1, Math.ceil(minutes / 10)),
    unitLabel: 'days', done: 0, dependsOn: [], status: 'waiting', episode: n, sceneIds: [], workedDays: 0,
  };
  p.tasks.push(task);
  ensureWorkEvent(state, p);
  addLog(state, `A cut pass on episode ${n} of ${p.title} has started.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  return task;
}

export function lockEpisode(state: GameState, p: Project, n: number): void {
  const b = episodeLockBlockers(p, n);
  if (b.length) throw new Error(b[0]);
  if (episodeLocked(p, n)) return;
  p.edit.lockedEpisodes = [...(p.edit.lockedEpisodes ?? []), n].sort((a, b2) => a - b2);
  ensureWorkEvent(state, p);
  addLog(state, `You locked picture on episode ${n} of ${p.title}. Its sound, music and color can now finish.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  p.history.push({ at: state.now, text: `Episode ${n}: picture locked.` });
}

/** Why an episode can't be delivered yet, in the player's words: what is holding it back. */
export function episodeDeliveryBlockers(p: Project, n: number): string[] {
  if (episodeDelivered(p, n)) return [];
  const out: string[] = [];
  if (!episodeLocked(p, n)) out.push(`Lock episode ${n}'s picture first.`);
  const open = episodeWork(p, n).filter((t) => t.status !== 'done');
  if (open.length) out.push(`${open.length} ${open.length === 1 ? 'piece of work it needs is' : 'pieces of work it needs are'} unfinished, including ${open[0].label}.`);
  const scenes = scenesOf(p, n);
  const used = new Set(scenes.flatMap((s) => s.contributorIds));
  const waiting = p.contributors.find((c) => used.has(c.id) && c.consent !== 'given' && c.consent !== 'withdrawn');
  if (waiting) out.push(`${waiting.name} hasn't given consent to appear.`);
  if (isNonfiction(p.axes.format)) {
    const claims = new Set(scenes.flatMap((s) => s.evidenceIds));
    if (p.evidence.some((e) => claims.has(e.id) && e.status !== 'dramatized' && !e.verified)) out.push('Some of its claims haven\'t been verified.');
  }
  return out;
}

/** Deliver one episode of a series: it can come out on its day while later episodes are still being made. */
export function deliverEpisode(state: GameState, p: Project, n: number): void {
  if (!isEpisodic(p.axes.format)) throw new Error('Only a series is delivered an episode at a time.');
  if (p.delivered) throw new Error('The whole season is delivered.');
  if (!Number.isInteger(n) || n < 1 || n > p.axes.episodeCount) throw new Error(`${p.title} has ${p.axes.episodeCount} episodes.`);
  if (episodeDelivered(p, n)) throw new Error(`Episode ${n} is already delivered.`);
  const b = episodeDeliveryBlockers(p, n);
  if (b.length) throw new Error(b[0]);
  const runtimeMin = Math.round(scenesOf(p, n).reduce((a, s) => a + s.estMinutes, 0));
  p.episodeDeliveries = { ...(p.episodeDeliveries ?? {}), [n]: { at: state.now, runtimeMin } };
  addLog(state, `Episode ${n} of ${p.title} is delivered. It runs ${runtimeMin} ${runtimeMin === 1 ? 'minute' : 'minutes'}${assemblyComplete(p) ? '' : '; later episodes are still being made'}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'release' } });
  p.history.push({ at: state.now, text: `Episode ${n} delivered at ${runtimeMin} minutes.` });
}
