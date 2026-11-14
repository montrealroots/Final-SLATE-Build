// The edit room's actions: cut passes, restoring a cut scene, coverage gaps and pickups, locking and unlocking picture
// (finish.ts keeps what the rest of the game reads: assembly, the scenes in the edit, delivery). Moved out of finish.ts
// on November 8, 2026 so they load with the Edit page, not at startup (the startup JavaScript budget).
import { addLog } from './state';
import { approvalRights, approvedScenes, sceneLabel, sceneTechnique } from './projects';
import { ensureWorkEvent, schedulePickups } from './production';
import { formatDateKey } from './time';
import { assemblyComplete, cutScenes, editScenes } from './finish';
import type { GameState, Project, Task } from './types';
import { dependents } from './production/tasks';

/** Editor days a cut pass takes: a day for every 12 minutes of approved scenes, at least two. */
export const cutPassDays = (p: Project): number => Math.max(2, Math.round(approvedScenes(p).reduce((a, s) => a + s.estMinutes, 0) / 12));

export function startCutPass(state: GameState, p: Project): Task {
  if (!assemblyComplete(p)) throw new Error('The assembly edit isn\'t finished yet.');
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it before cutting again.');
  if (p.tasks.some((t) => t.kind === 'post:cutpass' && t.status !== 'done')) throw new Error('A cut pass is already in progress.');
  const n = p.edit.cutPasses + 1;
  const task: Task = {
    id: `post:cutpass:${n}`, kind: 'post:cutpass', label: `Cut Pass ${n}`, dept: 'Post Production', roleId: 'editor', units: cutPassDays(p),
    unitLabel: 'days', done: 0, dependsOn: [], status: 'waiting', episode: 1, sceneIds: [], workedDays: 0,
  };
  p.tasks.push(task);
  ensureWorkEvent(state, p);
  addLog(state, `Cut pass ${n} on ${p.title} has started.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  return task;
}

/** Scenes the producer cut from the edit (the revised edit plan). */
/** Put a cut scene back in the edit plan. Without enough material it shows as a coverage gap again, to shoot or pick up. */
export function restoreToEdit(state: GameState, p: Project, sceneId: string): void {
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to change the edit plan.');
  if (!cutScenes(p).has(sceneId)) throw new Error('That scene isn\'t cut.');
  p.edit.cutSceneIds = (p.edit.cutSceneIds ?? []).filter((x) => x !== sceneId);
  const s = p.scenes.find((x) => x.id === sceneId);
  addLog(state, `You restored ${s ? sceneLabel(p, s) : 'a scene'} to the edit of ${p.title}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
}

export function coverageGaps(p: Project): { sceneId: string; label: string; reason: string; scheduled?: string }[] {
  const out: { sceneId: string; label: string; reason: string; scheduled?: string }[] = [];
  for (const s of editScenes(p)) {
    const c = p.captures.find((x) => x.sceneId === s.id);
    const tech = sceneTechnique(p, s);
    if (tech !== 'live' && !c) continue; // animated scenes are tracked through their tasks
    if (s.kind === 'archival' || s.kind === 'narration') continue;
    const day = p.schedule.days.filter((d) => d.status === 'scheduled' && d.sceneIds.includes(s.id)).map((d) => d.date).sort()[0];
    if (!c || c.captured < 0.8) out.push({ sceneId: s.id, label: sceneLabel(p, s), reason: day ? `Not shot yet: scheduled for ${formatDateKey(day)}.` : c && c.captured > 0 ? 'Not enough material was captured.' : 'Nothing has been shot for it yet.', ...(day ? { scheduled: day } : {}) });
    else if (c.version !== p.approvedDraft) out.push({ sceneId: s.id, label: sceneLabel(p, s), reason: 'It was shot from an older draft.' });
    else if (c.weatherCompromised) out.push({ sceneId: s.id, label: sceneLabel(p, s), reason: 'It was shot in bad weather.' });
  }
  return out;
}

/**
 * In a hybrid project, the plate integration already started in the episodes of these scenes, which a reshot plate
 * restarts (SLATE-13-05, November 8, 2026). Until then a pickup left finished integration standing on the old plate.
 */
export function pickupIntegration(p: Project, sceneIds: string[]): Task[] {
  if (p.axes.medium !== 'hybrid') return [];
  const eps = new Set(editScenes(p).filter((s) => sceneIds.includes(s.id) && sceneTechnique(p, s) === 'live').map((s) => s.episode));
  return p.tasks.filter((t) => t.kind === 'hy:integrate' && t.done > 0 && eps.has(t.episode ?? 1));
}

export function requestPickups(state: GameState, p: Project, sceneIds: string[]): number {
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to add pickups.');
  const live = sceneIds.filter((id) => {
    const s = editScenes(p).find((x) => x.id === id);
    return s && sceneTechnique(p, s) === 'live';
  });
  if (!live.length) throw new Error('Choose live-action scenes to reshoot.');
  for (const id of live) {
    const c = p.captures.find((x) => x.sceneId === id);
    if (c) {
      c.captured = Math.min(c.captured, 0.5);
      c.weatherCompromised = false;
    }
  }
  p.edit.pickupsNeeded = [...new Set([...p.edit.pickupsNeeded, ...live])];
  const redo = pickupIntegration(p, live);
  for (const t of redo) { t.done = 0; t.status = 'waiting'; }
  if (redo.length) addLog(state, `New plates for ${p.title} restart ${redo.length === 1 ? redo[0].label : `${redo.length} plate integrations`}: the compositor's days are worked again.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'production' } });
  return schedulePickups(state, p, live);
}

export function lockBlockers(p: Project): string[] {
  const out: string[] = [];
  if (!assemblyComplete(p)) out.push('Finish the assembly edit.');
  const needed = approvalRights(p).includes('Picture Approval') ? 2 : 1;
  if (p.edit.cutPasses < needed) {
    out.push(needed === 2 ? 'The commissioner approves the cut after at least two cut passes.' : 'Complete at least one cut pass.');
  }
  if (p.tasks.some((t) => t.kind === 'post:cutpass' && t.status !== 'done')) out.push('Wait for the current cut pass to finish.');
  if (p.schedule.days.some((d) => d.status === 'scheduled')) out.push('Some shoot days are still scheduled.');
  const gaps = coverageGaps(p).filter((g) => !g.scheduled && (g.reason === 'Not enough material was captured.' || g.reason === 'Nothing has been shot for it yet.'));
  if (gaps.length) out.push(`${gaps[0].label} is missing coverage. Schedule a pickup, or cut it from the edit.`);
  return out;
}

export function lockPicture(state: GameState, p: Project): void {
  const b = lockBlockers(p);
  if (b.length) throw new Error(b[0]);
  p.edit.pictureLocked = true;
  p.edit.lockedAt = state.now;
  ensureWorkEvent(state, p);
  addLog(state, `You locked picture on ${p.title}. Sound, music, color and captions can now finish.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'edit' } });
  p.history.push({ at: state.now, text: 'Picture locked.' });
}

/**
 * The finishing work an unlock starts over: everything that waits for the picture lock and has begun, and everything
 * built on that, however far down (the owner's v6 package, V6-035; from November 14, 2026). Until then only the work
 * waiting for the lock itself restarted, so a final mix finished on the old cut stood after the cut changed.
 */
export function unlockImpact(p: Project): Task[] {
  const after = new Set<string>();
  for (const t of p.tasks) if (t.dependsOn.some((d) => d.startsWith('milestone:lock'))) for (const id of dependents(p.tasks, t.id)) after.add(id);
  // The score's composition isn't written again for a changed cut: its changed cues are conformed (cues.ts), so the
  // themes the player approved, the score, its sessions and stems stand. The spotting session is held again, as before.
  return p.tasks.filter((t) => after.has(t.id) && t.done > 0 && !COMPOSITION.has(t.kind));
}
const COMPOSITION = new Set(['post:themes', 'post:themes-revision', 'post:music', 'post:orchestration', 'post:score-session', 'post:conform', 'post:stems']);

export function unlockPicture(state: GameState, p: Project): string[] {
  if (!p.edit.pictureLocked) throw new Error('The picture isn\'t locked.');
  if (p.delivered) throw new Error('A delivered project can\'t be unlocked.');
  const out = Object.keys(p.episodeDeliveries ?? {});
  if (out.length) throw new Error(`Episode ${out[0]} is delivered, so the picture can't be unlocked.`);
  const reset = unlockImpact(p).map((t) => t.label);
  for (const t of unlockImpact(p)) Object.assign(t, { done: 0, workedDays: 0, status: 'waiting', doneAt: undefined });
  p.edit.pictureLocked = false;
  delete p.edit.lockedEpisodes;
  // A contributor's approval was of the locked cut; a changed cut needs showing again (documentary.ts). A refusal stays:
  // unlocking is how their scenes get cut.
  for (const c of p.contributors) if (c.cutApproval && c.cutApproval.status !== 'refused') delete c.cutApproval;
  addLog(state, `You unlocked picture on ${p.title}.${reset.length ? ` ${reset.length} finishing ${reset.length === 1 ? 'task restarts' : 'tasks restart'}.` : ''}`, 'project', { projectId: p.id });
  return reset;
}
