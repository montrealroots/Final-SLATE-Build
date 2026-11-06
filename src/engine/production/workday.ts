// Daily work: who works on which task, readiness, payments and finished-task effects.
// Part of the production engine; src/engine/production.ts is its public interface.

import type { GameState, Obligation, Project, Task } from '../types';
import { getPlace } from '../../data/places';
import { ledgerTotals, money, settle, spend, FundsError } from '../budget';
import { placeHolidaysOn } from '../holidays';
import { covers, roleLabel } from '../people';
import { approvedCharacters, approvedScenes, sceneTechnique } from '../projects';
import { approvedTake, payStageSession, recordTake, stageBlock } from '../mocap';
import { stream } from '../rng';
import { decideCompetition } from '../unscripted';
import { addLog, registerHandler, schedule } from '../state';
import { addDaysToKey, localToInstant, parseYmd } from '../time';
import { HOLIDAY_PREMIUM, MATERIAL_COST, RENDER_HOURS_PER_FRAME, RENDER_NODE_DAY_COST, VOICE_SESSION_STUDIO } from './rates';
import { SHOOT_CREW, markCaptured } from './shoot';
import { t } from './tasks';
import { isWorkingDay, nextWorkingDay } from './schedule';

// ---------------- Staffing helpers ----------------

export function teamFor(p: Project, roleId: string, episode: number): string[] {
  return p.hires
    .filter((h) => covers(h.roleId, roleId) && h.status === 'accepted' && (h.episodes === 'all' || h.episodes.includes(episode)))
    // Specialists first, then people covering the role as a second job.
    .sort((a, b) => Number(a.roleId !== roleId) - Number(b.roleId !== roleId))
    .map((h) => h.personId);
}

export function playerDoes(roleId: string): boolean {
  return roleId === 'director' || roleId === 'producer' || roleId === 'writer';
}

export function milestoneDone(p: Project, dep: string): boolean {
  const m = /^milestone:lock:(\d+)$/.exec(dep);
  if (m) return p.edit.pictureLocked;
  if (dep === 'capture:all') return p.schedule.days.every((d) => d.status !== 'scheduled');
  const c = /^capture:(\d+)$/.exec(dep);
  if (c) {
    const ep = Number(c[1]);
    const live = approvedScenes(p).filter((s) => s.episode === ep && sceneTechnique(p, s) === 'live' && s.kind !== 'archival' && s.kind !== 'narration');
    return live.every((s) => (p.captures.find((x) => x.sceneId === s.id)?.captured ?? 0) >= 0.8);
  }
  return false;
}

export function depsMet(p: Project, task: Task): { ok: boolean; reason?: string } {
  for (const dep of task.dependsOn) {
    if (dep.startsWith('milestone:') || dep.startsWith('capture:')) {
      if (!milestoneDone(p, dep)) {
        return { ok: false, reason: dep.startsWith('milestone:lock') ? 'Waiting for picture lock.' : 'Waiting for the shoot to finish.' };
      }
      continue;
    }
    const d = p.tasks.find((x) => x.id === dep);
    if (d && d.status !== 'done') return { ok: false, reason: `Waiting for ${d.label}.` };
  }
  if (task.kind === 'anim:voice' && task.assetRef) {
    const cast = p.cast.find((c) => c.characterId === task.assetRef && c.method === 'voice');
    if (!cast) return { ok: false, reason: 'This character has no voice performer yet.' };
    if (cast.performer !== 'player' && !p.hires.some((h) => h.id === cast.hireId && h.status === 'accepted')) return { ok: false, reason: 'The voice performer hasn\'t accepted yet.' };
  }
  if (task.kind === 'anim:mocap-cleanup' && task.assetRef && !approvedTake(p, task.assetRef)) return { ok: false, reason: 'Choose the approved take first.' };
  if ((task.kind === 'anim:mocap' || task.kind === 'anim:mocap-calib') && task.assetRef) {
    const cast = p.cast.find((c) => c.characterId === task.assetRef && c.method === 'motion-capture');
    if (!cast) return { ok: false, reason: 'This character has no performance-capture performer yet.' };
    if (cast.performer !== 'player' && !p.hires.some((h) => h.id === cast.hireId && h.status === 'accepted')) return { ok: false, reason: "The capture performer hasn't accepted yet." };
    const block = stageBlock(p, task.assetRef);
    if (block) return { ok: false, reason: block };
  }
  if (task.kind === 'prep:rehearsal' && !p.cast.length) return { ok: false, reason: 'Cast the roles before rehearsing.' };
  return { ok: true };
}

/** Readiness message for a stop-motion puppet, e.g. armature ready but costume not fitted. */
export function puppetStatus(p: Project, characterId: string): string {
  const arm = p.tasks.find((x) => x.id === `sm:armature:${characterId}`);
  const pup = p.tasks.find((x) => x.id === `sm:puppet:${characterId}`);
  const cos = p.tasks.find((x) => x.id === `sm:costume:${characterId}`);
  if (!arm) return '';
  if (cos?.status === 'done') return 'Ready for the stage.';
  if (pup?.status === 'done') return "The puppet's armature is ready, but its costume still needs fitting.";
  if (arm.status === 'done') return 'The armature is ready. Fabrication is next.';
  return 'Not started.';
}

// ---------------- Daily work ----------------

registerHandler('work-day', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  if (!p || p.delivered) return { suppressInterrupt: true };
  const date = ev.payload.date as string;
  runWorkDay(state, p, date);
  // Chain the next working day while unfinished work remains.
  if (p.tasks.some((x) => x.status !== 'done') || p.schedule.days.some((d) => d.status === 'scheduled')) {
    const next = nextWorkingDay(p, addDaysToKey(date, 1));
    const zone = getPlace(p.axes.basePlaceId).zone;
    const { year, month, day } = parseYmd(next);
    schedule(state, localToInstant(zone, year, month, day, 18).instant, 'work-day', { projectId: p.id, date: next }, { priority: 60 });
  }
  return { suppressInterrupt: true };
});

export function runWorkDay(state: GameState, p: Project, date: string): void {
  if (!isWorkingDay(p, date) && !p.schedule.days.some((d) => d.date === date)) return;
  const holiday = (() => {
    const place = getPlace(p.axes.basePlaceId);
    return placeHolidaysOn(place, date).length > 0;
  })();
  const used = new Set<string>(); // people busy today
  // Shoot-day crews are busy on set.
  const shootToday = p.schedule.days.find((d) => d.date === date && d.status !== 'scheduled');
  if (shootToday) for (const h of p.hires) if (SHOOT_CREW.has(h.roleId) && h.status === 'accepted') used.add(h.personId);
  const completed: string[] = [];
  let renderNodeDays = 0;
  const puppetInUse = new Map<string, number>();
  let stagesInUse = 0;

  for (const task of p.tasks) {
    if (task.status === 'done') continue;
    const dep = depsMet(p, task);
    if (!dep.ok) {
      task.status = 'waiting';
      task.blockedReason = dep.reason;
      continue;
    }
    if (task.kind === 'anim:mocap' || task.kind === 'anim:mocap-calib') {
      // A stage session: paid from the booking once per day; the performer is paid once per day even when they also voice the role.
      const charId = task.assetRef!;
      if (!payStageSession(state, p, charId, `mocap:${task.id}:${date}`)) {
        task.status = 'blocked';
        task.blockedReason = 'The capture booking has no sessions left. Ask for a retake or book the stage again.';
        continue;
      }
      const cast = p.cast.find((c) => c.characterId === charId && c.method === 'motion-capture');
      const h = cast?.hireId ? p.hires.find((x) => x.id === cast.hireId) : undefined;
      if (h && h.status === 'accepted' && h.obligationId && settle(state, p, h.obligationId, h.dayRate, `${h.id}:${date}`)) h.daysWorked += 1;
      if (task.kind === 'anim:mocap') recordTake(state, p, charId, date);
      task.done += 1;
      task.status = 'active';
      task.workedDays += 1;
    } else if (task.roleId === 'render') {
      const nodesLeft = p.schedule.renderNodes - renderNodeDays;
      if (nodesLeft <= 0) {
        task.status = 'blocked';
        task.blockedReason = 'All render nodes are busy today.';
        continue;
      }
      const hoursPerFrame = RENDER_HOURS_PER_FRAME[p.axes.animationQuality];
      const framesPossible = (nodesLeft * 24) / hoursPerFrame;
      const frames = Math.min(task.units - task.done, framesPossible);
      const nodesUsed = Math.ceil((frames * hoursPerFrame) / 24);
      const cost = nodesUsed * RENDER_NODE_DAY_COST;
      if (ledgerTotals(p).available < cost) {
        task.status = 'blocked';
        task.blockedReason = 'There isn\'t enough money left for render time.';
        continue;
      }
      spend(state, p, `Render Time (${date})`, 'post', cost, `render:${task.id}:${date}`);
      renderNodeDays += nodesUsed;
      task.done += frames;
      task.status = 'active';
      task.workedDays += 1;
    } else if (playerDoes(task.roleId)) {
      if (state.sleep.asleep && task.kind !== 'anim:voice') {
        task.status = 'ready';
        continue;
      }
      if (task.kind === 'anim:voice') {
        const cast = p.cast.find((c) => c.characterId === task.assetRef && c.method !== 'motion-capture');
        if (cast?.hireId) {
          const h = p.hires.find((x) => x.id === cast.hireId);
          if (h && h.status === 'accepted' && h.obligationId) {
            if (settle(state, p, h.obligationId, h.dayRate, `${h.id}:${date}`)) h.daysWorked += 1;
          }
        }
        spend(state, p, `Recording Studio (${date})`, 'post', VOICE_SESSION_STUDIO, `studio:${task.id}:${date}`);
      }
      task.done += 1;
      task.status = 'active';
      task.workedDays += 1;
    } else {
      const team = teamFor(p, task.roleId, task.episode).filter((id) => !used.has(id));
      if (!team.length) {
        const anyone = p.hires.some((h) => covers(h.roleId, task.roleId) && h.status === 'accepted');
        task.status = 'blocked';
        task.blockedReason = anyone ? `Your ${roleLabel(task.roleId).toLowerCase()} is busy on other work today.` : `No one is hired as ${roleLabel(task.roleId).toLowerCase()}.`;
        continue;
      }
      let workers = team.length;
      if (task.kind === 'sm:animation') {
        // Each animator needs a stage and a free copy of every puppet in the shot.
        const scene = approvedScenes(p).find((s) => s.id === task.sceneIds[0]);
        const chars = (scene?.participants ?? []).filter((c) => p.tasks.some((x) => x.id === `sm:costume:${c}`));
        const stageFree = p.schedule.stages - stagesInUse;
        const puppetFree = Math.min(...chars.map((c) => (p.schedule.puppetCopies[c] ?? 1) - (puppetInUse.get(c) ?? 0)), 99);
        // One shot occupies one stage and one animator; extra animators work other shots.
        workers = Math.min(workers, stageFree, puppetFree, 1);
        if (workers <= 0) {
          task.status = 'blocked';
          task.blockedReason = stageFree <= 0 ? 'Every stage is in use today.' : 'The puppets it needs are on another stage. A duplicate puppet would let both shots continue.';
          continue;
        }
        stagesInUse += workers;
        for (const c of chars) puppetInUse.set(c, (puppetInUse.get(c) ?? 0) + workers);
      }
      const assigned = team.slice(0, workers);
      assigned.forEach((id) => used.add(id));
      let wagesOk = true;
      for (const pid of assigned) {
        const h = p.hires.find((x) => x.personId === pid && x.status === 'accepted' && covers(x.roleId, task.roleId));
        if (!h || !h.obligationId) continue;
        const pay = h.dayRate * (holiday ? HOLIDAY_PREMIUM : 1);
        const o = p.obligations.find((x) => x.id === h.obligationId)!;
        if (o.settled + pay > o.amount && ledgerTotals(p).available < o.settled + pay - Math.max(o.amount, o.settled)) {
          wagesOk = false;
          continue;
        }
        if (settle(state, p, h.obligationId, pay, `${h.id}:${date}`)) h.daysWorked += 1;
      }
      if (!wagesOk) {
        task.status = 'blocked';
        task.blockedReason = 'There isn\'t enough money to pay for more work. Add funding or reduce scope.';
        addLogOnce(state, p, `payroll:${date}`, `${p.title} can't cover today's wages. Work has paused until you add funding or cut scope.`);
        continue;
      }
      task.done += assigned.length;
      task.status = 'active';
      task.workedDays += 1;
    }
    if (task.done >= task.units - 1e-9) {
      task.done = task.units;
      task.status = 'done';
      task.doneAt = state.now;
      task.blockedReason = undefined;
      completed.push(task.label);
      onTaskDone(state, p, task, date);
    }
  }
  if (completed.length) {
    const msg = completed.length === 1 ? `${completed[0]} is finished on ${p.title}.` : `${completed.length} tasks finished on ${p.title}, including ${completed[0]}.`;
    addLog(state, msg, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'production' } });
  }
  maybePuppetDamage(state, p, date);
  if (p.axes.format === 'unscripted-series') decideCompetition(state, p, (e) => milestoneDone(p, `capture:${e}`));
}

export function addLogOnce(state: GameState, p: Project, key: string, text: string): void {
  if (p.noticeKeys.includes(key)) return;
  p.noticeKeys.push(key);
  if (p.noticeKeys.length > 200) p.noticeKeys.splice(0, p.noticeKeys.length - 200);
  addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}

export function materialCost(task: Task): number {
  const base = MATERIAL_COST[task.kind];
  if (!base) return 0;
  let qty = task.units;
  if (task.kind === 'prep:creature') qty = task.units / 3;
  if (task.kind === 'sm:armature') qty = task.units / 4;
  if (task.kind === 'sm:puppet') qty = task.units / 5;
  if (task.kind === 'sm:sets') qty = task.units / 8;
  if (task.kind === 'post:clearance') qty = task.units / 2;
  if (task.kind === 'doc:archive') qty = 1;
  return Math.round(base * qty);
}

/** Pay from the schedule's reserved plan line when it has room; otherwise it is a new cost that needs uncommitted funds. */
export function payPlanned(state: GameState, p: Project, ref: 'plan:shoot' | 'plan:materials', label: string, category: Obligation['category'], amount: number, key: string): void {
  if (amount <= 0) return;
  if (p.obligations.some((o) => o.postings.some((x) => x.key === key))) return;
  const o = p.obligations.find((x) => x.ref === ref && (x.state === 'reserved' || x.state === 'committed') && x.amount - x.settled >= amount);
  if (o) settle(state, p, o.id, amount, key);
  else spend(state, p, label, category, amount, key);
}

/** Cost still planned on the schedule's reserved lines. */
export function plannedRemaining(p: Project, ref: string): number {
  return p.obligations.filter((o) => o.ref === ref && (o.state === 'reserved' || o.state === 'committed')).reduce((a, o) => a + Math.max(0, o.amount - o.settled), 0);
}

export function onTaskDone(state: GameState, p: Project, task: Task, date: string): void {
  const base = MATERIAL_COST[task.kind];
  if (base) {
    try {
      payPlanned(state, p, 'plan:materials', `${task.label} Materials`, task.kind.startsWith('post:clearance') || task.kind === 'doc:archive' ? 'licensing' : 'materials', materialCost(task), `mat:${task.id}`);
    } catch (e) {
      if (e instanceof FundsError) addLogOnce(state, p, `mat:${task.id}`, `${task.label} is done, but its materials (${money(materialCost(task))}) are unpaid. Add funding to settle it.`);
    }
  }
  const asset = task.assetRef ? p.assets.find((a) => a.characterId === task.assetRef && (task.kind.startsWith('sm:') ? a.kind === 'puppet' : task.kind === 'anim:rig' ? a.kind === 'rig' : task.kind === 'anim:model' ? a.kind === 'model' : a.kind === 'design')) : undefined;
  if (asset) {
    if (task.kind === 'sm:armature') asset.stage = 'Armature Ready';
    if (task.kind === 'sm:puppet') asset.stage = 'Fabricated, Needs Costume';
    if (task.kind === 'sm:costume') {
      asset.stage = 'Ready';
      asset.ready = true;
      asset.costumeFitted = true;
    }
    if (task.kind === 'anim:model' || task.kind === 'anim:rig') {
      asset.stage = 'Ready';
      asset.ready = true;
    }
  }
  if (task.kind === 'sm:puppet' && task.assetRef) {
    addLog(state, `${puppetStatus(p, task.assetRef)}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'production' } });
  }
  if (['anim:composite', 'hy:integrate', 'sm:animation', 'anim:animation'].includes(task.kind)) {
    for (const sid of task.sceneIds) {
      if (task.kind === 'anim:composite' || task.kind === 'hy:integrate') markCaptured(p, sid, 1, 70, false);
    }
  }
  if (task.kind === 'post:assembly') {
    p.edit.assembly = true;
    p.edit.versions.push({ number: p.edit.versions.length + 1, at: state.now, runtimeMin: Math.round(approvedScenes(p).filter((s) => s.episode === task.episode).reduce((a, s) => a + s.estMinutes, 0)), note: 'Assembly' });
    if (p.phase === 'production') p.phase = 'post-production';
  }
  if (task.kind.startsWith('post:cutpass')) {
    p.edit.cutPasses += 1;
    p.edit.versions.push({ number: p.edit.versions.length + 1, at: state.now, runtimeMin: p.edit.versions[p.edit.versions.length - 1]?.runtimeMin ?? 0, note: `Cut Pass ${p.edit.cutPasses}` });
  }
  if (task.kind === 'doc:research') {
    // Discovery: research can surface a new lead that changes the story rather than failing the outline.
    const r = stream(state.seed, 'discovery', p.id)();
    if (r < 0.5) addLog(state, `Research on ${p.title} turned up a new lead. You can add a scene for it in the script.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'script' } });
  }
  void date;
}

export function maybePuppetDamage(state: GameState, p: Project, date: string): void {
  const active = p.tasks.filter((x) => x.kind === 'sm:animation' && x.status === 'active');
  if (!active.length) return;
  const r = stream(state.seed, 'puppet-damage', p.id, date)();
  if (r > 0.04) return; // simulation assumption: ~4% chance per active stage day
  const scene = approvedScenes(p).find((s) => s.id === active[0].sceneIds[0]);
  const cid = scene?.participants.find((c) => p.tasks.some((x) => x.id === `sm:costume:${c}`));
  if (!cid) return;
  const id = `sm:repair:${cid}:${date}`;
  if (p.tasks.some((x) => x.id === id)) return;
  const name = approvedCharacters(p).find((c) => c.id === cid)?.name ?? 'A puppet';
  p.tasks.push(t('sm:repair', `${cid}:${date}`, `Repair Puppet: ${name}`, 'Stop Motion', 'puppet-fabricator', 1, 'days', [], { assetRef: cid }));
  for (const task of p.tasks.filter((x) => x.kind === 'sm:animation' && x.status !== 'done')) {
    const s = approvedScenes(p).find((sc) => sc.id === task.sceneIds[0]);
    if (s?.participants.includes(cid) && (p.schedule.puppetCopies[cid] ?? 1) <= 1) task.dependsOn.push(id);
  }
  addLog(state, `${name}'s puppet was damaged on set. Shots with ${name} wait for a repair unless a duplicate is available.`, 'warning', {
    projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'production' },
  });
}

