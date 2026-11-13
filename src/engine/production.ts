// Medium-specific production. Tasks form a dependency graph generated from the approved
// draft's breakdown; live-action and documentary capture happen on scheduled shoot days.
// Throughput rates and material costs are SIMULATION ASSUMPTIONS (docs/ASSUMPTIONS.md).

import { getPlace } from '../data/places';
import { cancel, commit, reserve } from './budget';
import { approvedScenes, approvalRights, changedSince, onDraftApproved, sceneLabel } from './projects';
import { newId, registerCommitmentSource } from './state';
import { HOUR, dayNumber, localToInstant, parseYmd } from './time';
import type { GameState, Project, ShootDay } from './types';
import { ensureWorkEvent, groupShootDays } from './production/schedule';
import { syncMusicTasks } from './song-actions';

export { BASE_MINUTES_PER_SHOOT_DAY, CROWD_DAY_RATE, DAY_COST_SCALE, EQUIPMENT_PER_DAY, HOLIDAY_PREMIUM, LOCATION_FEE_PER_DAY, MOCAP_ANIMATION_FACTOR, OUTPUT_FPS, RENDER_NODE_DAY_COST, VOICE_SESSION_STUDIO, dayFees, housePackageFee } from './production/rates';
export { buildTasks } from './production/tasks';
export { ensureWorkEvent, generatePlan, previewPlan, groupShootDays, isWorkingDay, nextWorkingDay, planShootDays, sceneComplexity, sceneLoad, type ShootDayGroup, type PlanPreview } from './production/schedule';
export { depsMet, materialCost, playerDoes, puppetStatus, runWorkDay, teamFor } from './production/workday';
export { addDialogueReplacement, keepWeatherPlan, moveShootDay, runShootDay, schedulePickups, swapWithInteriorDay } from './production/shoot';
export type { PlanResult } from './production/schedule';
export { coachingNeeded, personLanguagesFit } from './production/language';

// ---------------- Change impact (design changes) ----------------

export interface DesignImpact {
  characterName: string;
  unstartedShots: number;
  finishedShots: number;
  assetTasks: string[];
}

export function designChangeImpact(p: Project, characterId: string): DesignImpact {
  const c = p.characters.find((x) => x.id === characterId);
  const scenes = approvedScenes(p).filter((s) => s.participants.includes(characterId));
  const animKinds = ['anim:animation', 'sm:animation'];
  const animTasks = p.tasks.filter((x) => animKinds.includes(x.kind) && x.sceneIds.some((sid) => scenes.some((s) => s.id === sid)));
  return {
    characterName: c?.name ?? 'This character',
    unstartedShots: animTasks.filter((x) => x.status !== 'done').length,
    finishedShots: animTasks.filter((x) => x.status === 'done').length,
    assetTasks: p.tasks.filter((x) => x.assetRef === characterId && x.status === 'done').map((x) => x.label),
  };
}

export function describeImpact(i: DesignImpact): string {
  if (!i.assetTasks.length && !i.unstartedShots && !i.finishedShots) return `Changing ${i.characterName}'s design doesn't affect any production work yet.`;
  const parts: string[] = [];
  if (i.unstartedShots) parts.push(`Changing this character's design affects ${i.unstartedShots} ${i.unstartedShots === 1 ? 'shot' : 'shots'} that haven't been animated.`);
  if (i.assetTasks.length) parts.push(`${i.assetTasks.length} finished ${i.assetTasks.length === 1 ? 'asset needs' : 'assets need'} rebuilding.`);
  if (i.finishedShots) parts.push(`${i.finishedShots} animated ${i.finishedShots === 1 ? 'shot keeps' : 'shots keep'} the old design unless you redo ${i.finishedShots === 1 ? 'it' : 'them'}.`);
  return parts.join(' ');
}

/** Apply a design change to production: rebuild assets and unstarted shots; optionally redo finished ones. */
export function applyDesignChange(state: GameState, p: Project, characterId: string, redoFinished: boolean): void {
  const c = p.characters.find((x) => x.id === characterId);
  if (!c) throw new Error('That character no longer exists.');
  const approved = p.drafts.find((d) => d.number === p.approvedDraft);
  const ac = approved?.characters.find((x) => x.id === characterId);
  if (ac) Object.assign(ac, { ...c });
  const redone: string[] = [];
  for (const task of p.tasks) {
    if (task.assetRef === characterId && task.needsVersion !== undefined && task.needsVersion < c.designVersion) {
      task.needsVersion = c.designVersion;
      task.done = 0;
      task.status = 'waiting';
      task.doneAt = undefined;
      redone.push(task.id);
    }
    const scene = approvedScenes(p).find((s) => s.id === task.sceneIds[0]);
    if (scene?.participants.includes(characterId) && ['anim:animation', 'sm:animation'].includes(task.kind)) {
      if (task.status !== 'done' || redoFinished) {
        task.done = 0;
        task.status = 'waiting';
        redone.push(task.id);
        // Downstream per-scene tasks restart too.
        for (const down of p.tasks.filter((x) => x.sceneIds[0] === scene.id && x.id !== task.id && /^(anim|sm|hy):/.test(x.kind))) {
          down.done = 0;
          down.status = 'waiting';
          redone.push(down.id);
        }
      }
    }
  }
  for (const a of p.assets.filter((x) => x.characterId === characterId)) {
    a.version = c.designVersion;
    a.ready = false;
    a.stage = 'Needs Rebuild';
  }
  p.changeOrders.push({ id: newId(state, 'co'), at: state.now, summary: `${c.name}'s design changed.${redoFinished ? ' Finished shots will be redone.' : ' Finished shots keep the old design.'}`, affectedTasks: [...new Set(redone)], decision: redoFinished ? 'accepted' : 'kept-old' });
  ensureWorkEvent(state, p);
}

// ---------------- Commitments (Home / Up Next / wake messages) ----------------

registerCommitmentSource((state, from, to) => {
  const out: { at: number; label: string; route: { view: string; projectId: string; tab: string }; kind: 'project' }[] = [];
  for (const p of state.projects) {
    const zone = getPlace(p.axes.basePlaceId).zone;
    for (const d of p.schedule.days) {
      if (d.status !== 'scheduled') continue;
      const { year, month, day } = parseYmd(d.date);
      const at = localToInstant(zone, year, month, day, d.night ? 17 : 7).instant;
      if (at >= from && at <= to) out.push({ at, label: `${p.title} shoot at ${d.locationLabel}`, route: { view: 'project', projectId: p.id, tab: 'schedule' }, kind: 'project' });
    }
  }
  return out;
});

export function shootDayStart(p: Project, d: ShootDay): number {
  const zone = getPlace(p.axes.basePlaceId).zone;
  const { year, month, day } = parseYmd(d.date);
  return localToInstant(zone, year, month, day, d.night ? 17 : 7).instant;
}

/** The shoot days the approved script needs: the schedule's own grouping (production/schedule.ts groupShootDays), counted. */
export function estimatedShootDays(p: Project, state?: GameState): number {
  return groupShootDays(p, state).length;
}

export { dayNumber, HOUR, reserve, commit, cancel, approvalRights };

// ---------------- Re-approving a script ----------------

/** What approving a draft would undo: footage of changed scenes and progress on work built on them. Unchanged scenes keep theirs. */
export function approvalImpact(p: Project, number: number): string[] {
  const d = p.drafts.find((x) => x.number === number);
  const prev = p.drafts.find((x) => x.number === p.approvedDraft) ?? null;
  if (!d || !prev || prev.number === number) return [];
  const changed = changedSince(prev, d);
  const out: string[] = [];
  for (const c of p.captures.filter((x) => x.version === prev.number && x.captured > 0 && changed.has(x.sceneId))) {
    const sc = prev.scenes.find((x) => x.id === c.sceneId);
    out.push(`${sc ? sceneLabel(p, sc) : 'A scene'} was filmed; it will need filming again.`);
  }
  for (const t of p.tasks.filter((x) => x.done > 0 && x.sceneIds.some((id) => changed.has(id)))) out.push(`${t.label} starts over.`);
  return out;
}

onDraftApproved((_state, p, d, prev) => {
  if (!prev || prev.number === d.number) return;
  const changed = changedSince(prev, d);
  // Unchanged scenes keep their footage; changed ones keep the old record, which no longer counts.
  for (const c of p.captures) if (c.version === prev.number && !changed.has(c.sceneId)) c.version = d.number;
  for (const t of p.tasks) {
    if (t.done > 0 && t.sceneIds.some((id) => changed.has(id))) {
      t.done = 0;
      t.workedDays = 0;
      t.status = 'waiting';
      t.doneAt = undefined;
    }
  }
  // A scene whose length changed after its score was written needs its cues conformed (cues.ts cuesToConform): the
  // score's tasks follow the new draft. Until November 13, 2026 they waited for a schedule rebuild, so a recut approved
  // in post was delivered with its cue out of time.
  if (p.tasks.length && p.music?.brief) syncMusicTasks(p);
});

