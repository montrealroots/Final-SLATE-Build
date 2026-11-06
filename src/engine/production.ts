// Medium-specific production. Tasks form a dependency graph generated from the approved
// draft's breakdown; live-action and documentary capture happen on scheduled shoot days.
// Throughput rates and material costs are SIMULATION ASSUMPTIONS (docs/ASSUMPTIONS.md).

import { getPlace } from '../data/places';
import { cancel, commit, ledgerTotals, money, reserve, settle, spend, FundsError } from './budget';
import { isMakeUpWorkday, placeHolidaysOn } from './holidays';
import { covers, isAvailable, personById, roleLabel } from './people';
import {
  approvedCharacters, approvedScenes, approvalRights, changedSince, isEpisodic, isNonfiction, onDraftApproved, projectModules, sceneLabel, sceneTechnique,
} from './projects';
import { MOCAP_CLEANUP_PER_SESSION, approvedTake, payStageSession, recordTake, stageBlock } from './mocap';
import { stream } from './rng';
import { decideCompetition } from './unscripted';
import { addLog, cancelEvents, newId, registerCommitmentSource, registerHandler, schedule } from './state';
import { HOUR, addDaysToKey, dateKey, dayNumber, formatDateKey, isDateKey, localParts, localToInstant, parseYmd, weekdayOfKey } from './time';
import type { Asset, GameState, Obligation, Project, Scene, SceneCapture, ShootDay, Task } from './types';
import { forecast, precipitationDuring, weatherOn, daylightWindowLocal } from './weather';

// ---------------- Rates (simulation assumptions) ----------------

const ANIM_RATE: Record<string, Record<'limited' | 'tv' | 'feature', number>> = {
  // finished seconds of screen time per artist per working day
  '2d-drawn': { limited: 6, tv: 2.5, feature: 1 },
  '2d-rigged': { limited: 15, tv: 8, feature: 4 },
  '3d-cg': { limited: 6, tv: 3, feature: 0.8 },
  'stop-motion': { limited: 3, tv: 1.5, feature: 0.8 },
  rotoscope: { limited: 4, tv: 2, feature: 1 },
  mixed: { limited: 4, tv: 2, feature: 0.9 },
};
/** Render node-hours per frame by quality tier; one node gives 24 node-hours a day. */
const RENDER_HOURS_PER_FRAME = { limited: 0.25, tv: 0.5, feature: 1.5 };
export const OUTPUT_FPS = 24;
export const RENDER_NODE_DAY_COST = 35;
/** Live-action screen minutes captured per shoot day before complexity adjustments. */
export const BASE_MINUTES_PER_SHOOT_DAY = 4;
export const HOLIDAY_PREMIUM = 1.5;

const MATERIAL_COST: Record<string, number> = {
  'prep:design': 900, 'prep:costume': 600, 'prep:creature': 4000, 'sm:armature': 900, 'sm:puppet': 1500, 'sm:costume': 300, 'sm:sets': 2500,
  'doc:archive': 2500, 'post:clearance': 8000, 'anim:modeling': 0, 'prep:locations': 500,
};
export const LOCATION_FEE_PER_DAY = 1200;
export const EQUIPMENT_PER_DAY = 1500;
/** Location and equipment costs scale with the production's scale (simulation assumption): micro shoots use borrowed gear and free locations. */
export const DAY_COST_SCALE: Record<string, number> = { micro: 0.3, low: 1, mid: 2, commissioned: 3 };
export function dayFees(p: Project): { location: number; equipment: number } {
  const k = DAY_COST_SCALE[p.funding.scenarioId] ?? 1;
  return { location: Math.round(LOCATION_FEE_PER_DAY * k), equipment: Math.round(EQUIPMENT_PER_DAY * k) };
}
export const VOICE_SESSION_STUDIO = 400;
/** Capture stage, suits and solving per session (simulation assumption). */
/** Share of keyframe work left when a shot uses captured performance (simulation assumption). */
export const MOCAP_ANIMATION_FACTOR = 0.6;

// ---------------- Task generation ----------------

function t(kind: string, ref: string, label: string, dept: string, roleId: string, units: number, unitLabel: string, dependsOn: string[] = [], extra: Partial<Task> = {}): Task {
  return {
    id: `${kind}:${ref}`, kind, label, dept, roleId, units: Math.max(0.5, Math.round(units * 10) / 10), unitLabel, done: 0, dependsOn, status: 'waiting',
    episode: 1, sceneIds: [], workedDays: 0, ...extra,
  };
}

export function buildTasks(p: Project): Task[] {
  const scenes = approvedScenes(p);
  const chars = approvedCharacters(p);
  const reqs = p.requirements.filter((r) => r.status === 'needed');
  const mods = projectModules(p);
  const q = p.axes.animationQuality;
  const tasks: Task[] = [];
  const count = (k: string) => reqs.filter((r) => r.kind === k).length;
  const liveScenes = scenes.filter((s) => sceneTechnique(p, s) === 'live');
  const animScenes = scenes.filter((s) => sceneTechnique(p, s) !== 'live');
  const nonfiction = isNonfiction(p.axes.format);
  const unscripted = p.axes.format === 'unscripted-series';
  const periodFactor = mods.has('period') && !/contemporary|present/i.test(p.axes.storyEra) ? 1.5 : 1;
  const prepIds: string[] = [];

  if (count('period-research')) {
    tasks.push(t('prep:research', 'period', 'Period Research', 'Documentary', 'researcher', 5, 'days'));
    prepIds.push('prep:research:period');
  }
  if (liveScenes.length && !nonfiction) {
    const locs = count('location');
    tasks.push(t('prep:locations', 'all', 'Location Scouting And Permits', 'Locations', 'location-manager', Math.max(1, locs), 'locations'));
    tasks.push(t('prep:design', 'all', 'Production Design And Props', 'Art', 'production-designer', Math.max(1, count('prop') + count('clue-prop') + Math.ceil(locs / 2)), 'items',
      count('period-research') ? ['prep:research:period'] : []));
    tasks.push(t('prep:costume', 'all', 'Costumes', 'Costume And Makeup', 'costume-designer', Math.max(1, chars.filter((c) => c.roleSize !== 'background').length * periodFactor), 'costumes',
      count('period-research') ? ['prep:research:period'] : []));
    prepIds.push('prep:locations:all', 'prep:design:all', 'prep:costume:all');
    if (count('creature')) {
      tasks.push(t('prep:creature', 'all', 'Creature And Prosthetic Builds', 'Creature And Effects', 'prosthetics', count('creature') * 3, 'build days'));
      prepIds.push('prep:creature:all');
    }
    if (count('stunt')) {
      tasks.push(t('prep:stunts', 'all', 'Stunt Rehearsal', 'Safety And Specialists', 'stunt-coordinator', count('stunt') * (mods.has('action') ? 2 : 1), 'rehearsal days'));
      prepIds.push('prep:stunts:all');
    }
    if (count('choreography')) {
      tasks.push(t('prep:choreo', 'all', 'Choreography Rehearsal', 'Casting And Performance', 'choreographer', count('choreography') * 2, 'rehearsal days'));
      prepIds.push('prep:choreo:all');
    }
    if (p.schedule.rehearsalDays > 0 && p.cast.length) {
      tasks.push(t('prep:rehearsal', 'all', 'Cast Rehearsals', 'Direction', 'director', p.schedule.rehearsalDays, 'days'));
      prepIds.push('prep:rehearsal:all');
    }
  }
  if (nonfiction && !unscripted) {
    tasks.push(t('doc:research', 'all', 'Research And Access Planning', 'Documentary', 'researcher', 3 + p.evidence.length, 'items'));
    prepIds.push('doc:research:all');
    if (p.evidence.some((e) => e.status !== 'dramatized')) {
      tasks.push(t('doc:factcheck', 'all', 'Fact Checking', 'Documentary', 'fact-checker', p.evidence.filter((e) => e.status !== 'dramatized').length, 'claims', ['doc:research:all']));
    }
    for (const s of scenes.filter((x) => x.kind === 'archival')) {
      tasks.push(t('doc:archive', s.id, `Archive Licensing: ${sceneLabel(p, s)}`, 'Documentary', 'archive-producer', 2, 'days', ['doc:research:all'], { sceneIds: [s.id], episode: s.episode }));
    }
  }

  // Animation design work is shared across episodes (assets are reused).
  if (animScenes.length) {
    const techs = new Set(animScenes.map((s) => sceneTechnique(p, s)));
    const animChars = chars.filter((c) => animScenes.some((s) => s.participants.includes(c.id)));
    const animPlaces = new Set(animScenes.map((s) => s.storyLocation || s.heading.place));
    tasks.push(t('anim:visdev', 'all', 'Visual Development And Designs', 'Animation', 'visdev-artist', animChars.length + animPlaces.size, 'designs'));
    const animMinutes = animScenes.reduce((a, s) => a + s.estMinutes, 0);
    tasks.push(t('anim:boards', 'all', 'Storyboards', 'Animation', 'storyboard-artist', Math.max(1, animMinutes * 2.5), 'board days', ['anim:visdev:all']));
    tasks.push(t('anim:animatic', 'all', 'Animatic', 'Post Production', 'editor', Math.max(1, animMinutes / 4), 'days', ['anim:boards:all']));
    const voiced = animChars.filter((c) => c.methods.includes('voice') && c.roleSize !== 'background');
    for (const c of voiced) {
      tasks.push(t('anim:voice', c.id, `Voice Recording: ${c.name}`, 'Casting And Performance', 'director', 1, 'sessions', ['anim:boards:all'], { assetRef: c.id }));
    }
    const voiceDeps = (s: Scene) => voiced.filter((c) => s.participants.includes(c.id)).map((c) => `anim:voice:${c.id}`);
    for (const tech of techs) {
      const tScenes = animScenes.filter((s) => sceneTechnique(p, s) === tech);
      const rate = ANIM_RATE[tech as string] ?? ANIM_RATE.mixed;
      if (tech === 'stop-motion') {
        for (const c of animChars.filter((c) => tScenes.some((s) => s.participants.includes(c.id)))) {
          const copies = p.schedule.puppetCopies[c.id] ?? 1;
          tasks.push(t('sm:armature', c.id, `Armature: ${c.name}`, 'Stop Motion', 'armature-fabricator', 4 * copies, 'build days', ['anim:visdev:all'], { assetRef: c.id, needsVersion: c.designVersion }));
          tasks.push(t('sm:puppet', c.id, `Puppet Fabrication: ${c.name}`, 'Stop Motion', 'puppet-fabricator', 5 * copies, 'build days', [`sm:armature:${c.id}`], { assetRef: c.id, needsVersion: c.designVersion }));
          tasks.push(t('sm:costume', c.id, `Puppet Costume Fitting: ${c.name}`, 'Costume And Makeup', 'costume-designer', 1 * copies, 'fittings', [`sm:puppet:${c.id}`], { assetRef: c.id, needsVersion: c.designVersion }));
        }
        const sets = new Set(tScenes.map((s) => s.storyLocation || s.heading.place));
        tasks.push(t('sm:sets', 'all', 'Miniature Sets', 'Stop Motion', 'miniature-builder', sets.size * 8, 'build days', ['anim:visdev:all']));
        tasks.push(t('sm:stages', 'all', 'Stage Camera And Lighting Setup', 'Stop Motion', 'stage-dp', p.schedule.stages * 2, 'stage days', ['sm:sets:all']));
        for (const s of tScenes) {
          const deps = ['anim:animatic:all', 'sm:stages:all', ...s.participants.filter((c) => animChars.some((x) => x.id === c)).map((c) => `sm:costume:${c}`), ...voiceDeps(s)];
          tasks.push(t('sm:animation', s.id, `Animate ${sceneLabel(p, s)}`, 'Stop Motion', 'stopmo-animator', (s.estMinutes * 60) / rate[q], 'animator days', deps, { sceneIds: [s.id], episode: s.episode }));
          tasks.push(t('anim:composite', s.id, `Rig Removal And Compositing: ${sceneLabel(p, s)}`, 'Animation', 'compositor', Math.max(0.5, s.estMinutes * 0.6), 'days', [`sm:animation:${s.id}`], { sceneIds: [s.id], episode: s.episode }));
        }
      } else if (tech === '3d-cg') {
        for (const c of animChars.filter((c) => tScenes.some((s) => s.participants.includes(c.id)))) {
          tasks.push(t('anim:model', c.id, `Model And Surfacing: ${c.name}`, 'Animation', 'modeler', 6, 'days', ['anim:visdev:all'], { assetRef: c.id, needsVersion: c.designVersion }));
          tasks.push(t('anim:rig', c.id, `Rigging: ${c.name}`, 'Animation', 'rigger', 5, 'days', [`anim:model:${c.id}`], { assetRef: c.id, needsVersion: c.designVersion }));
        }
        const envs = new Set(tScenes.map((s) => s.storyLocation || s.heading.place));
        tasks.push(t('anim:envs', 'all', 'Environment Models', 'Animation', 'modeler', envs.size * 5, 'days', ['anim:visdev:all']));
        // Motion capture: one session per scene for each captured character, feeding animation.
        const capChars = animChars.filter((c) => c.methods.includes('motion-capture') && tScenes.some((s) => s.participants.includes(c.id)));
        for (const c of capChars) {
          const sessions = tScenes.filter((s) => s.participants.includes(c.id)).length + (p.mocap?.[c.id]?.retakes ?? 0);
          tasks.push(t('anim:mocap-calib', c.id, `Capture Rehearsal And Calibration: ${c.name}`, 'Casting And Performance', 'director', 1, 'sessions', ['anim:animatic:all'], { assetRef: c.id }));
          tasks.push(t('anim:mocap', c.id, `Motion Capture: ${c.name}`, 'Casting And Performance', 'director', sessions, 'sessions', [`anim:mocap-calib:${c.id}`], { assetRef: c.id }));
          tasks.push(t('anim:mocap-cleanup', c.id, `Capture Cleanup And Retargeting: ${c.name}`, 'Animation', 'animator', Math.max(1, sessions * MOCAP_CLEANUP_PER_SESSION), 'days', [`anim:mocap:${c.id}`, `anim:rig:${c.id}`], { assetRef: c.id }));
        }
        for (const s of tScenes) {
          const rigDeps = s.participants.filter((c) => animChars.some((x) => x.id === c)).map((c) => `anim:rig:${c}`);
          const capDeps = capChars.filter((c) => s.participants.includes(c.id)).map((c) => `anim:mocap-cleanup:${c.id}`);
          const fxNeeded = s.vfx.length > 0 || s.crowd > 0;
          tasks.push(t('anim:layout', s.id, `Layout: ${sceneLabel(p, s)}`, 'Animation', 'layout-artist', Math.max(0.5, s.estMinutes * 1.5), 'days', ['anim:animatic:all', 'anim:envs:all'], { sceneIds: [s.id], episode: s.episode }));
          const actionFactor = s.stunts.trim() ? 1.3 : 1;
          const capFactor = capDeps.length ? MOCAP_ANIMATION_FACTOR : 1;
          tasks.push(t('anim:animation', s.id, `Animate ${sceneLabel(p, s)}`, 'Animation', 'animator', ((s.estMinutes * 60) / rate[q]) * actionFactor * capFactor, 'animator days',
            [`anim:layout:${s.id}`, ...rigDeps, ...capDeps, ...voiceDeps(s)], { sceneIds: [s.id], episode: s.episode }));
          if (fxNeeded) tasks.push(t('anim:fx', s.id, `Effects And Simulation: ${sceneLabel(p, s)}`, 'Animation', 'fx-artist', 2 + s.vfx.length * 2 + (s.crowd > 0 ? 3 : 0), 'days', [`anim:animation:${s.id}`], { sceneIds: [s.id], episode: s.episode }));
          tasks.push(t('anim:lighting', s.id, `Lighting: ${sceneLabel(p, s)}`, 'Animation', 'lighting-artist', Math.max(0.5, s.estMinutes * 1.2), 'days', [fxNeeded ? `anim:fx:${s.id}` : `anim:animation:${s.id}`], { sceneIds: [s.id], episode: s.episode }));
          tasks.push(t('anim:render', s.id, `Render: ${sceneLabel(p, s)}`, 'Animation', 'render', s.estMinutes * 60 * OUTPUT_FPS, 'frames', [`anim:lighting:${s.id}`], { sceneIds: [s.id], episode: s.episode }));
          tasks.push(t('anim:composite', s.id, `Compositing: ${sceneLabel(p, s)}`, 'Animation', 'compositor', Math.max(0.5, s.estMinutes * 0.5), 'days', [`anim:render:${s.id}`], { sceneIds: [s.id], episode: s.episode }));
        }
      } else {
        // Drawn / rigged 2D, rotoscope and mixed technique.
        const rigged = tech === '2d-rigged';
        if (rigged) {
          for (const c of animChars.filter((c) => tScenes.some((s) => s.participants.includes(c.id)))) {
            tasks.push(t('anim:rig', c.id, `Character Rig: ${c.name}`, 'Animation', 'rigger', 3, 'days', ['anim:visdev:all'], { assetRef: c.id, needsVersion: c.designVersion }));
          }
        }
        const places = new Set(tScenes.map((s) => s.storyLocation || s.heading.place));
        tasks.push(t('anim:backgrounds', 'all', 'Layouts And Backgrounds', 'Animation', 'background-artist', places.size * 3, 'days', ['anim:animatic:all']));
        for (const s of tScenes) {
          const deps = ['anim:backgrounds:all', ...voiceDeps(s), ...(rigged ? s.participants.filter((c) => animChars.some((x) => x.id === c)).map((c) => `anim:rig:${c}`) : ['anim:visdev:all'])];
          tasks.push(t('anim:animation', s.id, `${rigged ? 'Animate' : 'Key Animation'}: ${sceneLabel(p, s)}`, 'Animation', 'animator', (s.estMinutes * 60) / rate[q], 'animator days', deps, { sceneIds: [s.id], episode: s.episode }));
          if (!rigged) {
            tasks.push(t('anim:inbetween', s.id, `In-Betweens, Cleanup And Color: ${sceneLabel(p, s)}`, 'Animation', 'assistant-animator', (s.estMinutes * 60) / (rate[q] * 1.5), 'artist days', [`anim:animation:${s.id}`], { sceneIds: [s.id], episode: s.episode }));
          }
          tasks.push(t('anim:composite', s.id, `Compositing: ${sceneLabel(p, s)}`, 'Animation', 'compositor', Math.max(0.5, s.estMinutes * 0.4), 'days', [rigged ? `anim:animation:${s.id}` : `anim:inbetween:${s.id}`], { sceneIds: [s.id], episode: s.episode }));
        }
      }
    }
    if (p.axes.medium === 'hybrid') {
      for (const s of animScenes) {
        tasks.push(t('hy:integrate', s.id, `Plate Integration: ${sceneLabel(p, s)}`, 'Post Production', 'compositor', Math.max(1, s.estMinutes), 'days', [`anim:composite:${s.id}`, 'capture:all'], { sceneIds: [s.id], episode: s.episode }));
      }
    }
  }

  // Post production, per episode. Milestones gate stages that need a locked picture.
  const licensed = scenes.some((s) => s.songs.some((x) => x.licensed)) || scenes.some((s) => s.kind === 'archival');
  if (licensed) {
    const items = scenes.reduce((a, s) => a + s.songs.filter((x) => x.licensed).length, 0);
    if (items) tasks.push(t('post:clearance', 'all', 'Music Clearances', 'Music', 'music-supervisor', items * 2, 'days'));
  }
  for (let e = 1; e <= p.axes.episodeCount; e++) {
    const eScenes = scenes.filter((s) => s.episode === e);
    const minutes = Math.max(1, eScenes.reduce((a, s) => a + s.estMinutes, 0));
    const capDeps = eScenes.flatMap((s) => {
      const tech = sceneTechnique(p, s);
      if (tech === 'live') return [] as string[];
      return [p.axes.medium === 'hybrid' ? `hy:integrate:${s.id}` : `anim:composite:${s.id}`];
    });
    if (eScenes.some((s) => sceneTechnique(p, s) === 'live')) capDeps.push(`capture:${e}`);
    if (nonfiction) capDeps.push(...eScenes.filter((s) => s.kind === 'archival').map((s) => `doc:archive:${s.id}`));
    if (unscripted) {
      // Unscripted shows find their story in the footage: log it, then shape each episode before assembly.
      const segs = eScenes.filter((s) => s.kind === 'segment').length || 1;
      tasks.push(t('unscripted:logging', String(e), `Footage Logging${epSuffix(p, e)}`, 'Post Production', 'assistant-editor', segs * 1.5, 'days', [`capture:${e}`], { episode: e }));
      tasks.push(t('unscripted:story', String(e), `Story Producing${epSuffix(p, e)}`, 'Producing', 'story-producer', segs, 'days', [`unscripted:logging:${e}`], { episode: e }));
      capDeps.push(`unscripted:story:${e}`);
    }
    tasks.push(t('post:assembly', String(e), `Assembly Edit${isEpisodic(p.axes.format) ? `, Episode ${e}` : ''}`, 'Post Production', 'editor', Math.max(1, minutes / 6), 'days', capDeps, { episode: e }));
    const lock = `milestone:lock:${e}`;
    const hasVfx = eScenes.some((s) => s.vfx.length && sceneTechnique(p, s) === 'live');
    tasks.push(t('post:sound', String(e), `Sound Editing${epSuffix(p, e)}`, 'Post Production', 'sound-designer', Math.max(1, minutes / 5), 'days', [lock], { episode: e }));
    tasks.push(t('post:music', String(e), `Score${epSuffix(p, e)}`, 'Music', 'composer', Math.max(1, minutes / 4), 'days', [lock], { episode: e }));
    if (hasVfx) tasks.push(t('post:vfx', String(e), `Visual Effects${epSuffix(p, e)}`, 'Post Production', 'vfx-artist', eScenes.reduce((a, s) => a + s.vfx.length * 4, 0), 'days', [lock], { episode: e }));
    tasks.push(t('post:color', String(e), `Color Grade${epSuffix(p, e)}`, 'Post Production', 'colorist', Math.max(1, minutes / 20), 'days', [lock, ...(hasVfx ? [`post:vfx:${e}`] : [])], { episode: e }));
    tasks.push(t('post:mix', String(e), `Final Mix${epSuffix(p, e)}`, 'Post Production', 're-recording-mixer', Math.max(1, minutes / 30), 'days', [`post:sound:${e}`, `post:music:${e}`, ...(licensed && tasks.some((x) => x.id === 'post:clearance:all') ? ['post:clearance:all'] : [])], { episode: e }));
    tasks.push(t('post:captions', String(e), `Captions And Subtitles${epSuffix(p, e)}`, 'Post Production', 'subtitler', Math.max(1, (minutes / 30) * p.axes.dialogueLanguages.length), 'days', [`post:mix:${e}`], { episode: e }));
    tasks.push(t('post:qc', String(e), `Delivery Quality Control${epSuffix(p, e)}`, 'Post Production', 'qc-technician', 1, 'days', [`post:color:${e}`, `post:mix:${e}`, `post:captions:${e}`], { episode: e }));
  }
  // Prep must finish before live capture.
  for (const task of tasks) if (task.kind === 'prep:rehearsal') task.dependsOn.push(...prepIds.filter((x) => x !== 'prep:rehearsal:all' && x !== 'doc:research:all'));
  return tasks;
}

function epSuffix(p: Project, e: number): string {
  return isEpisodic(p.axes.format) ? `, Episode ${e}` : '';
}

// ---------------- Shoot day planning ----------------

export function sceneComplexity(s: Scene, mods: Set<string>): number {
  let f = 1;
  if (s.stunts.trim()) f *= mods.has('action') ? 0.55 : 0.6;
  if (s.crowd > 20) f *= 0.7;
  if (s.animals.length) f *= 0.75;
  if (s.water) f *= 0.7;
  if (s.heading.time === 'NIGHT') f *= 0.85;
  if (s.songs.length || s.dance) f *= 0.75;
  if (s.kind === 'interview') f *= 1.5;
  return f;
}

export function isWorkingDay(p: Project, key: string): boolean {
  const base = getPlace(p.axes.basePlaceId);
  if (isMakeUpWorkday(base.country, key)) return true;
  const wd = weekdayOfKey(key);
  if (wd === 0) return false;
  if (wd === 6 && !p.schedule.sixDayWeeks) return false;
  if (!p.schedule.workHolidays) {
    const place = getPlace(p.axes.basePlaceId);
    if (placeHolidaysOn(place, key).length) return false;
  }
  return true;
}

export function nextWorkingDay(p: Project, key: string): string {
  let k = key;
  for (let i = 0; i < 30 && !isWorkingDay(p, k); i++) k = addDaysToKey(k, 1);
  return k;
}

/** Group live scenes into shoot days by episode block, location and interior/exterior, not script order. */
export function planShootDays(state: GameState, p: Project, firstDay: string): ShootDay[] {
  const mods = projectModules(p);
  const scenes = approvedScenes(p).filter((s) => sceneTechnique(p, s) === 'live' && s.kind !== 'archival' && s.kind !== 'narration');
  const groups = new Map<string, Scene[]>();
  for (const s of scenes) {
    const key = `${s.episode}|${s.storyLocation || s.heading.place}|${s.heading.intExt === 'EXT' ? 'EXT' : 'INT'}|${s.heading.time === 'NIGHT' ? 'N' : 'D'}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(s);
  }
  const days: ShootDay[] = [];
  let cursor = nextWorkingDay(p, firstDay);
  const playerChars = new Set(p.cast.filter((c) => c.performer === 'player').map((c) => c.characterId));
  const sortedGroups = [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }));
  for (const [key, list] of sortedGroups) {
    const [ep, place, ie, dn] = key.split('|');
    let bucket: Scene[] = [];
    let load = 0;
    const flush = () => {
      if (!bucket.length) return;
      days.push({
        id: newId(state, 'd'), date: cursor, episode: Number(ep), sceneIds: bucket.map((s) => s.id), locationLabel: place, interior: ie === 'INT', night: dn === 'N',
        status: 'scheduled', playerActing: bucket.some((s) => s.participants.some((c) => playerChars.has(c))), conflicts: [],
      });
      cursor = nextWorkingDay(p, addDaysToKey(cursor, 1));
      bucket = [];
      load = 0;
    };
    for (const s of list) {
      const need = s.estMinutes / sceneComplexity(s, mods);
      if (load + need <= BASE_MINUTES_PER_SHOOT_DAY) {
        bucket.push(s);
        load += need;
        continue;
      }
      flush();
      // A scene longer than one day's capacity spans several consecutive days.
      let remaining = need;
      while (remaining > BASE_MINUTES_PER_SHOOT_DAY) {
        bucket = [s];
        flush();
        remaining -= BASE_MINUTES_PER_SHOOT_DAY;
      }
      bucket = [s];
      load = remaining;
    }
    flush();
  }
  // Note conflicts with the player's own appointments.
  for (const d of days) {
    const zone = getPlace(p.axes.basePlaceId).zone;
    const { year, month, day } = parseYmd(d.date);
    const from = localToInstant(zone, year, month, day, 7).instant;
    const to = localToInstant(zone, year, month, day, 19).instant;
    for (const plan of state.plans) {
      if (plan.status === 'upcoming' && plan.start < to && plan.start + plan.durationMin * 60000 > from) d.conflicts.push(`Your plan "${plan.title}" overlaps this shoot day.`);
    }
    for (const other of state.projects) {
      if (other.id === p.id) continue;
      if (other.schedule.days.some((x) => x.date === d.date && x.status === 'scheduled')) d.conflicts.push(`${other.title} also shoots on this day. You can't direct both.`);
    }
  }
  return days;
}

// ---------------- Plan generation (keeps finished work) ----------------

export interface PlanResult {
  tasks: number;
  shootDays: number;
  firstDay: string;
  lastShootDay: string | null;
}

export function generatePlan(state: GameState, p: Project, startDate: string): PlanResult {
  if (p.approvedDraft === null) throw new Error('Approve a draft before planning production.');
  if (p.delivered) throw new Error('This project has already been delivered.');
  if (!isDateKey(startDate)) throw new Error('Choose a start date.');
  const today = dateKey(state.now, getPlace(p.axes.basePlaceId).zone);
  if (startDate < today) throw new Error('Choose a start date from today onward.');
  const backup = { tasks: p.tasks, assets: p.assets, startDate: p.schedule.startDate };
  const fresh = buildTasks(p);
  const old = new Map(p.tasks.map((x) => [x.id, x]));
  p.tasks = fresh.map((nt) => {
    const prev = old.get(nt.id);
    if (!prev) return nt;
    // Finished work stays finished unless the design it depended on changed.
    const stale = nt.needsVersion !== undefined && prev.needsVersion !== undefined && prev.needsVersion < nt.needsVersion;
    return stale ? { ...nt } : { ...nt, done: Math.min(prev.done, nt.units), workedDays: prev.workedDays, status: prev.status === 'done' && prev.done >= nt.units ? 'done' : 'waiting', doneAt: prev.doneAt };
  });
  ensureAssets(p);
  p.schedule.startDate = startDate;
  // Shoot days start after the prep period: one week per five prep units, at least five working days.
  const prepUnits = p.tasks.filter((x) => x.kind.startsWith('prep:') && x.status !== 'done').reduce((a, x) => a + (x.units - x.done), 0);
  let shootStart = startDate;
  const prepDays = Math.max(5, Math.ceil(prepUnits / 3));
  for (let i = 0; i < prepDays; i++) shootStart = nextWorkingDay(p, addDaysToKey(shootStart, 1));
  const kept = p.schedule.days.filter((d) => d.status !== 'scheduled');
  const capturedIds = new Set(p.captures.filter((c) => c.captured >= 0.999 && c.version === p.approvedDraft).map((c) => c.sceneId));
  const planned = planShootDays(state, p, shootStart).map((d) => ({ ...d, sceneIds: d.sceneIds.filter((s) => !capturedIds.has(s)) })).filter((d) => d.sceneIds.length);
  // Budget the schedule: shoot-day costs and materials are reserved now, so they can't be spent twice.
  const shootCost = planned.length * (dayFees(p).location + dayFees(p).equipment) +
    planned.reduce((a, d) => a + approvedScenes(p).filter((sc) => d.sceneIds.includes(sc.id)).reduce((b, sc) => b + sc.crowd * 180, 0), 0);
  const matCost = p.tasks.filter((x) => x.status !== 'done').reduce((a, x) => a + materialCost(x), 0);
  const previous = p.obligations.filter((o) => (o.ref === 'plan:shoot' || o.ref === 'plan:materials') && (o.state === 'reserved' || o.state === 'committed'));
  const freed = previous.reduce((a, o) => a + Math.max(0, o.amount - o.settled), 0);
  if (shootCost + matCost > ledgerTotals(p).available + freed) {
    p.tasks = backup.tasks;
    p.assets = backup.assets;
    p.schedule.startDate = backup.startDate;
    throw new FundsError(
      `This schedule needs ${money(shootCost + matCost)} for locations, equipment and materials, but only ${money(ledgerTotals(p).available + freed)} is uncommitted. Release someone, cut scenes, or bring in more funding.`,
      shootCost + matCost - ledgerTotals(p).available - freed,
    );
  }
  for (const o of previous) cancel(state, p, o.id);
  if (shootCost > 0) reserve(state, p, 'Shoot Days: Locations, Equipment And Crowds', 'locations', shootCost, 'plan:shoot');
  if (matCost > 0) reserve(state, p, 'Materials, Builds And Licensing', 'materials', matCost, 'plan:materials');
  cancelEvents(state, (e) => e.payload.projectId === p.id && (e.kind === 'shoot-call' || e.kind === 'shoot-wrap' || e.kind === 'weather-check'));
  p.schedule.days = [...kept, ...planned];
  for (const d of planned) scheduleShootDay(state, p, d);
  if (planned.length || p.tasks.length) {
    if (p.phase === 'pre-production' || p.phase === 'development') p.phase = 'production';
  }
  ensureWorkEvent(state, p);
  addLog(state, `${p.title} is scheduled to start on ${formatDateKey(startDate, true)}${planned.length ? ` with ${planned.length} shoot ${planned.length === 1 ? 'day' : 'days'}` : ''}.`, 'project', {
    projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' },
  });
  p.history.push({ at: state.now, text: `Production scheduled from ${startDate}.` });
  return { tasks: p.tasks.length, shootDays: planned.length, firstDay: startDate, lastShootDay: planned[planned.length - 1]?.date ?? null };
}

function ensureAssets(p: Project): void {
  const chars = approvedCharacters(p);
  const keep = new Map(p.assets.map((a) => [a.id, a]));
  const next: Asset[] = [];
  for (const task of p.tasks) {
    if (!task.assetRef || !/^(sm:(armature|puppet|costume)|anim:(model|rig))$/.test(task.kind)) continue;
    const c = chars.find((x) => x.id === task.assetRef);
    if (!c) continue;
    const kind: Asset['kind'] = task.kind.startsWith('sm:') ? 'puppet' : task.kind === 'anim:rig' ? 'rig' : task.kind === 'anim:model' ? 'model' : 'design';
    const id = `${kind}:${c.id}`;
    if (next.some((a) => a.id === id)) continue;
    const prev = keep.get(id);
    next.push({
      id, kind, label: `${c.name} ${kind === 'puppet' ? 'Puppet' : kind === 'rig' ? 'Rig' : kind === 'model' ? 'Model' : 'Design'}`, characterId: c.id,
      copies: kind === 'puppet' ? p.schedule.puppetCopies[c.id] ?? 1 : 1, version: c.designVersion, ready: prev?.version === c.designVersion ? prev.ready : false,
      stage: prev?.stage ?? 'Not Started', costumeFitted: prev?.costumeFitted,
    });
  }
  p.assets = next;
}

function scheduleShootDay(state: GameState, p: Project, d: ShootDay): void {
  const zone = getPlace(p.axes.basePlaceId).zone;
  const { year, month, day } = parseYmd(d.date);
  const prev = parseYmd(addDaysToKey(d.date, -1));
  const callHour = d.night ? 17 : 7;
  schedule(state, localToInstant(zone, prev.year, prev.month, prev.day, 18).instant, 'weather-check', { projectId: p.id, dayId: d.id }, { attention: d.interior ? 'silent' : 'notify', priority: 40 });
  schedule(state, localToInstant(zone, year, month, day, callHour).instant, 'shoot-call', { projectId: p.id, dayId: d.id }, { attention: 'interrupt', priority: 15 });
  schedule(state, localToInstant(zone, year, month, day, d.night ? 23 : 19).instant, 'shoot-wrap', { projectId: p.id, dayId: d.id }, { attention: 'notify', priority: 45 });
}

export function ensureWorkEvent(state: GameState, p: Project): void {
  if (p.delivered) return;
  if (state.events.some((e) => e.kind === 'work-day' && e.payload.projectId === p.id)) return;
  const zone = getPlace(p.axes.basePlaceId).zone;
  let key = dateKey(state.now, zone);
  const lp = localParts(state.now, zone);
  if (lp.hour >= 18) key = addDaysToKey(key, 1);
  if (p.schedule.startDate && key < p.schedule.startDate) key = p.schedule.startDate;
  key = nextWorkingDay(p, key);
  const { year, month, day } = parseYmd(key);
  schedule(state, localToInstant(zone, year, month, day, 18).instant, 'work-day', { projectId: p.id, date: key }, { priority: 60 });
}

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

function milestoneDone(p: Project, dep: string): boolean {
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

function addLogOnce(state: GameState, p: Project, key: string, text: string): void {
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
function payPlanned(state: GameState, p: Project, ref: 'plan:shoot' | 'plan:materials', label: string, category: Obligation['category'], amount: number, key: string): void {
  if (amount <= 0) return;
  if (p.obligations.some((o) => o.postings.some((x) => x.key === key))) return;
  const o = p.obligations.find((x) => x.ref === ref && (x.state === 'reserved' || x.state === 'committed') && x.amount - x.settled >= amount);
  if (o) settle(state, p, o.id, amount, key);
  else spend(state, p, label, category, amount, key);
}

/** Cost still planned on the schedule's reserved lines. */
function plannedRemaining(p: Project, ref: string): number {
  return p.obligations.filter((o) => o.ref === ref && (o.state === 'reserved' || o.state === 'committed')).reduce((a, o) => a + Math.max(0, o.amount - o.settled), 0);
}

function onTaskDone(state: GameState, p: Project, task: Task, date: string): void {
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

function maybePuppetDamage(state: GameState, p: Project, date: string): void {
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

// ---------------- Shoot days ----------------

const SHOOT_CREW = new Set(['dop', 'camera-operator', 'camera-assistant', 'gaffer', 'key-grip', 'sound-mixer', 'boom-operator', 'first-ad', 'script-supervisor', 'hair-makeup', 'video-assist',
  'stunt-coordinator', 'fight-choreographer', 'intimacy-coordinator', 'animal-wrangler', 'vehicle-coordinator', 'marine-coordinator', 'extras-casting', 'choreographer', 'dialect-coach', 'prop-master', 'costume-designer', 'location-manager']);


registerHandler('weather-check', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p?.schedule.days.find((x) => x.id === ev.payload.dayId);
  if (!p || !d || d.status !== 'scheduled' || d.interior) return { suppressInterrupt: true };
  const place = getPlace(p.axes.basePlaceId);
  const issued = dateKey(state.now, place.zone);
  const f = forecast(state.seed, place, d.date, issued);
  if (f.chanceOfPrecip >= 40) {
    // Package copy: "Rain is expected during your exterior shoot." Offer an interior scene only when one is scheduled.
    const lead = f.summary === 'Rain Likely' || f.summary === 'Snow Likely' ? `${f.summary.startsWith('Snow') ? 'Snow' : 'Rain'} is expected during your exterior shoot.` : `There's a chance of ${f.summary.includes('Snow') ? 'snow' : 'rain'} during your exterior shoot.`;
    const interior = p.schedule.days.some((o) => o.interior && o.status === 'scheduled' && o.date > d.date);
    const text = `${lead} ${p.title} films outside tomorrow. ${interior ? 'You can move the shoot, film an interior scene instead, or keep the plan.' : 'You can move the shoot or keep the plan.'}`;
    addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
    return { message: text };
  }
  return { suppressInterrupt: true };
});

registerHandler('shoot-call', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p?.schedule.days.find((x) => x.id === ev.payload.dayId);
  if (!p || !d || d.status !== 'scheduled') return { suppressInterrupt: true };
  const directorHired = p.episodes.find((e) => e.number === d.episode)?.director !== 'player';
  const playerNeeded = !directorHired || d.playerActing;
  if (!playerNeeded) return { suppressInterrupt: true };
  const away = state.locationId !== p.axes.basePlaceId || !!state.travel;
  if (state.sleep.asleep || away) {
    d.late = true;
    const text = away
      ? `You weren't in ${getPlace(p.axes.basePlaceId).name} for the call on ${p.title}. The day started late without you.`
      : `You weren't on set for the call on ${p.title}. The day started late.`;
    addLog(state, text, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
    return { message: text };
  }
  const text = `Call time on ${p.title}: ${d.locationLabel}, ${d.sceneIds.length} ${d.sceneIds.length === 1 ? 'scene' : 'scenes'} today.`;
  addLog(state, text, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return { message: text };
});

registerHandler('shoot-wrap', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const d = p?.schedule.days.find((x) => x.id === ev.payload.dayId);
  if (!p || !d || d.status !== 'scheduled') return { suppressInterrupt: true };
  const text = runShootDay(state, p, d);
  return { message: text };
});

export function keepWeatherPlan(state: GameState, p: Project, dayId: string): void {
  const d = p.schedule.days.find((x) => x.id === dayId);
  if (!d) throw new Error('That shoot day no longer exists.');
  d.weatherAnyway = true;
  void state;
}

/** Swap an exterior day with the next scheduled interior day (dates exchange; scenes stay together). */
export function swapWithInteriorDay(state: GameState, p: Project, dayId: string): string {
  const d = p.schedule.days.find((x) => x.id === dayId && x.status === 'scheduled');
  if (!d) throw new Error('That shoot day can no longer be changed.');
  const other = p.schedule.days.find((x) => x.status === 'scheduled' && x.interior && x.date > d.date);
  if (!other) throw new Error('There is no later interior day to swap with. You can keep the plan or wait for the weather.');
  [d.date, other.date] = [other.date, d.date];
  cancelEvents(state, (e) => (e.payload.dayId === d.id || e.payload.dayId === other.id) && ['shoot-call', 'shoot-wrap', 'weather-check'].includes(e.kind));
  scheduleShootDay(state, p, d);
  scheduleShootDay(state, p, other);
  addLog(state, `You swapped the ${d.locationLabel} exterior with the ${other.locationLabel} interior day.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return other.date;
}

/**
 * Move the Shoot: put a scheduled day on the first free working day after the last scheduled shoot day. Everyone
 * needed on set must be free that day; their bookings are extended to cover it. Costs are unchanged (the same day
 * is shot, later), and the day's call, wrap and weather check move with it.
 */
export function moveShootDay(state: GameState, p: Project, dayId: string): string {
  const d = p.schedule.days.find((x) => x.id === dayId && x.status === 'scheduled');
  if (!d) throw new Error('That shoot day can no longer be changed.');
  const taken = new Set(p.schedule.days.filter((x) => x.status === 'scheduled').map((x) => x.date));
  let k = addDaysToKey(p.schedule.days.filter((x) => x.status === 'scheduled').reduce((m, x) => (x.date > m ? x.date : m), d.date), 1);
  for (let i = 0; i < 60 && (!isWorkingDay(p, k) || taken.has(k)); i++) k = addDaysToKey(k, 1);
  if (!isWorkingDay(p, k) || taken.has(k)) throw new Error('There is no free working day to move the shoot to.');
  const onSet = p.hires.filter((h) => h.status === 'accepted' && (SHOOT_CREW.has(h.roleId) || h.kind === 'cast'));
  for (const h of onSet) {
    const person = personById(state, h.personId);
    if (!person) continue;
    const free = isAvailable(state, person, k, k, p.id);
    if (!free.ok) throw new Error(`${free.reason} The shoot can't move to ${formatDateKey(k, true)}.`);
  }
  for (const h of onSet) {
    const b = state.people[h.personId]?.bookings.find((x) => x.projectId === p.id);
    if (b && b.to < k) b.to = k;
  }
  const from = d.date;
  d.date = k;
  d.weatherAnyway = undefined;
  cancelEvents(state, (e) => e.payload.dayId === d.id && ['shoot-call', 'shoot-wrap', 'weather-check'].includes(e.kind));
  scheduleShootDay(state, p, d);
  addLog(state, `You moved the ${d.locationLabel} ${d.interior ? 'interior' : 'exterior'} from ${formatDateKey(from, true)} to ${formatDateKey(k, true)}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return k;
}

function hasCrew(p: Project, roleId: string): boolean {
  return p.hires.some((h) => covers(h.roleId, roleId) && h.status === 'accepted');
}

export function runShootDay(state: GameState, p: Project, d: ShootDay): string {
  const place = getPlace(p.axes.basePlaceId);
  const mods = projectModules(p);
  const scenes = approvedScenes(p).filter((s) => d.sceneIds.includes(s.id));
  const w = weatherOn(state.seed, place, d.date);
  const f = { late: !!d.late, weatherAnyway: !!d.weatherAnyway };
  const reasons: string[] = [];
  const shot: string[] = [];
  const nonfiction = isNonfiction(p.axes.format);
  // A day cannot run without someone to shoot it.
  const camera = hasCrew(p, 'dop') || hasCrew(p, 'camera-operator');
  if (!camera) {
    d.status = 'lost';
    d.result = 'No camera crew was hired, so nothing could be shot.';
    rescheduleScenes(state, p, d.sceneIds, d);
    addLog(state, `${p.title}: ${d.result}`, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
    return d.result;
  }
  // Money first: a day whose cost exceeds agreed amounts and uncommitted funds doesn't run.
  const holidayToday = placeHolidaysOn(place, d.date).length > 0;
  const onSetHires = p.hires.filter((h) => h.status === 'accepted' && h.obligationId &&
    (SHOOT_CREW.has(h.roleId) || (h.kind === 'cast' && h.method !== 'voice' && scenes.some((s) => s.participants.includes(h.characterId ?? '')))));
  const overrun = onSetHires.reduce((a, h) => {
    const o = p.obligations.find((x) => x.id === h.obligationId)!;
    const pay = h.dayRate * (holidayToday ? HOLIDAY_PREMIUM : 1);
    return a + Math.max(0, o.settled + pay - Math.max(o.amount, o.settled));
  }, 0) + Math.max(0, dayFees(p).location + dayFees(p).equipment + scenes.reduce((a, s) => a + s.crowd, 0) * 180 - plannedRemaining(p, 'plan:shoot'));
  if (overrun > ledgerTotals(p).available) {
    d.status = 'lost';
    d.result = `There wasn't enough money for this shoot day (${money(overrun)} needed beyond what's already agreed). Add funding or cut scope, then rebuild the schedule.`;
    addLogOnce(state, p, `funds:${d.id}`, `${p.title}: ${d.result}`);
    return d.result;
  }
  let capacity = BASE_MINUTES_PER_SHOOT_DAY;
  if (f.late) capacity *= 0.7;
  if (!hasCrew(p, 'first-ad') && scenes.length > 1) capacity *= 0.85;
  const directorHired = p.episodes.find((e) => e.number === d.episode)?.director !== 'player';
  if (d.playerActing && !directorHired && !hasCrew(p, 'video-assist')) capacity *= 0.85; // acting and directing without playback support
  const pending: string[] = [];
  for (const s of scenes) {
    const label = sceneLabel(p, s);
    // Prep readiness.
    const prepMissing = p.tasks.filter((x) => x.kind.startsWith('prep:') && x.kind !== 'prep:rehearsal' && x.status !== 'done' &&
      (x.kind !== 'prep:stunts' || s.stunts.trim()) && (x.kind !== 'prep:choreo' || s.dance) && (x.kind !== 'prep:creature' || s.participants.some((c) => approvedCharacters(p).find((ch) => ch.id === c && ch.entity !== 'human' && ch.realization !== 'performer'))));
    if (prepMissing.length) {
      reasons.push(`${label} couldn't be shot: ${prepMissing[0].label.toLowerCase()} isn't finished.`);
      pending.push(s.id);
      continue;
    }
    // Specialists required for safety-related or regulated work.
    const need: [boolean, string][] = [
      [!!s.stunts.trim(), 'stunt-coordinator'], [s.animals.length > 0, 'animal-wrangler'], [s.water, 'marine-coordinator'], [s.intimacy, 'intimacy-coordinator'],
      [s.crowd > 20, 'extras-casting'], [s.heading.time === 'NIGHT' || s.heading.intExt !== 'EXT', 'gaffer'], [s.vehicles.length > 0, 'vehicle-coordinator'],
    ];
    if (s.kind === 'segment' && !p.hires.some((h) => h.roleId === 'camera-operator' && h.status === 'accepted')) {
      reasons.push(`${label} needs a second camera: hire a camera operator for multi-camera coverage.`);
      pending.push(s.id);
      continue;
    }
    const missing = need.find(([cond, r]) => cond && !hasCrew(p, r));
    if (missing) {
      reasons.push(`${label} needs a ${roleLabel(missing[1]).toLowerCase()}, so it wasn't shot.`);
      pending.push(s.id);
      continue;
    }
    // Cast availability.
    const absent = s.participants.find((cid) => {
      const ch = approvedCharacters(p).find((c) => c.id === cid);
      if (!ch || ch.roleSize === 'background') return false;
      const assignment = p.cast.find((c) => c.characterId === cid && c.method !== 'voice');
      if (!assignment) return true;
      if (assignment.performer === 'player') return state.sleep.asleep && f.late;
      const h = p.hires.find((x) => x.id === assignment.hireId);
      if (!h || h.status !== 'accepted') return true;
      return !isAvailable(state, personById(state, h.personId), d.date, d.date, p.id).ok;
    });
    if (absent && !nonfiction) {
      const name = approvedCharacters(p).find((c) => c.id === absent)?.name ?? 'A character';
      reasons.push(`${label} was skipped because ${name} isn't cast or isn't available.`);
      pending.push(s.id);
      continue;
    }
    if (nonfiction && s.kind === 'interview') {
      const noConsent = s.contributorIds.find((cid) => p.contributors.find((c) => c.id === cid)?.consent !== 'given');
      if (noConsent) {
        reasons.push(`${label} was skipped: ${p.contributors.find((c) => c.id === noConsent)?.name ?? 'the contributor'} hasn't given consent.`);
        pending.push(s.id);
        continue;
      }
    }
    // Weather and daylight for exteriors.
    let compromised = false;
    if (s.heading.intExt === 'EXT') {
      const window: [number, number] = d.night ? [17, 23] : [7, 19];
      if (precipitationDuring(w, window[0], window[1])) {
        if (!f.weatherAnyway) {
          reasons.push(`${w.snow ? 'Snow' : 'Rain'} stopped ${label}.`);
          pending.push(s.id);
          continue;
        }
        compromised = true;
      }
      const dl = daylightWindowLocal(place, d.date);
      const light = Math.max(0, Math.min(dl.to, 19) - Math.max(dl.from, 7));
      if (s.heading.time !== 'NIGHT' && light < 3) {
        reasons.push(`There wasn't enough daylight for ${label}.`);
        pending.push(s.id);
        continue;
      }
    }
    const need2 = s.estMinutes / sceneComplexity(s, mods);
    const cap = p.captures.find((c) => c.sceneId === s.id);
    const already = cap && cap.version === p.approvedDraft ? cap.captured : 0;
    const remainingNeed = need2 * (1 - already);
    const fraction = Math.min(1, capacity / Math.max(0.01, remainingNeed));
    capacity -= Math.min(capacity, remainingNeed);
    const quality = captureQuality(state, p, s, compromised, f.late);
    markCaptured(p, s.id, already + (1 - already) * fraction, quality, compromised);
    if (!hasCrew(p, 'sound-mixer') && s.dialogue.length) {
      const id = `post:adr:${s.id}`;
      if (!p.tasks.some((x) => x.id === id)) p.tasks.push(t('post:adr', s.id, `Dialogue Replacement: ${label}`, 'Post Production', 'sound-designer', 1, 'days', [`milestone:lock:${s.episode}`], { sceneIds: [s.id], episode: s.episode }));
    }
    if (already + (1 - already) * fraction < 0.999) {
      pending.push(s.id);
      reasons.push(`${label} ran out of time and needs another day.`);
    } else shot.push(label);
    if (capacity <= 0.01) {
      for (const rest of scenes.slice(scenes.indexOf(s) + 1)) pending.push(rest.id);
      if (scenes.indexOf(s) < scenes.length - 1) reasons.push('The day ran out before every scene was shot.');
      break;
    }
  }
  // Costs: everyone on the shoot crew and the cast in today's scenes is paid once for the day.
  for (const h of onSetHires) {
    if (settle(state, p, h.obligationId!, h.dayRate * (holidayToday ? HOLIDAY_PREMIUM : 1), `${h.id}:${d.date}`)) h.daysWorked += 1;
  }
  try {
    payPlanned(state, p, 'plan:shoot', `Location Fee (${d.date})`, 'locations', dayFees(p).location, `loc:${d.id}`);
    payPlanned(state, p, 'plan:shoot', `Equipment Package (${d.date})`, 'equipment', dayFees(p).equipment, `eq:${d.id}`);
    const crowd = scenes.reduce((a, s) => a + s.crowd, 0);
    if (crowd) payPlanned(state, p, 'plan:shoot', `Background Performers (${d.date})`, 'cast', crowd * 180, `crowd:${d.id}`);
  } catch (e) {
    if (e instanceof FundsError) addLogOnce(state, p, `day:${d.id}`, `${p.title} couldn't pay for today's location and equipment. Add funding before the next shoot day.`);
  }
  const progressed = scenes.some((s) => !pending.includes(s.id) || (p.captures.find((c) => c.sceneId === s.id)?.captured ?? 0) > 0 && reasons.some((r) => r.includes('ran out of time') && r.includes(sceneLabel(p, s))));
  d.status = pending.length === 0 ? 'shot' : shot.length || progressed ? 'partial' : 'lost';
  const unique = [...new Set(pending)];
  if (unique.length) rescheduleScenes(state, p, unique, d);
  d.result = shot.length
    ? `Shot ${shot.length} of ${scenes.length} ${scenes.length === 1 ? 'scene' : 'scenes'}.${reasons.length ? ` ${reasons[0]}` : ''}`
    : reasons[0] ?? 'Nothing was shot.';
  addLog(state, `${p.title}, ${formatDateKey(d.date)}: ${d.result}${unique.length ? ' The remaining work moved to a new day.' : ''}`, d.status === 'shot' ? 'project' : 'warning', {
    projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' },
  });
  return d.result;
}

function rescheduleScenes(state: GameState, p: Project, sceneIds: string[], after: ShootDay): void {
  const last = p.schedule.days.reduce((m, x) => (x.date > m ? x.date : m), after.date);
  const date = nextWorkingDay(p, addDaysToKey(last, 1));
  const nd: ShootDay = {
    id: newId(state, 'd'), date, episode: after.episode, sceneIds: [...sceneIds], locationLabel: after.locationLabel, interior: after.interior, night: after.night,
    status: 'scheduled', playerActing: after.playerActing, conflicts: [],
  };
  p.schedule.days.push(nd);
  scheduleShootDay(state, p, nd);
  ensureWorkEvent(state, p);
}

/** Pickup days for scenes that need more coverage; grouped by location like the main schedule. */
export function schedulePickups(state: GameState, p: Project, sceneIds: string[]): number {
  const scenes = approvedScenes(p).filter((s) => sceneIds.includes(s.id));
  const groups = new Map<string, Scene[]>();
  for (const s of scenes) {
    const k = `${s.episode}|${s.storyLocation || s.heading.place}|${s.heading.intExt === 'EXT' ? 'E' : 'I'}|${s.heading.time === 'NIGHT' ? 'N' : 'D'}`;
    (groups.get(k) ?? groups.set(k, []).get(k)!).push(s);
  }
  const zone = getPlace(p.axes.basePlaceId).zone;
  let date = nextWorkingDay(p, addDaysToKey(dateKey(state.now, zone), 3));
  let n = 0;
  for (const [k, list] of groups) {
    const [ep, place, ie, dn] = k.split('|');
    const d: ShootDay = {
      id: newId(state, 'd'), date, episode: Number(ep), sceneIds: list.map((s) => s.id), locationLabel: place, interior: ie === 'I', night: dn === 'N', status: 'scheduled',
      playerActing: list.some((s) => s.participants.some((c) => p.cast.some((a) => a.characterId === c && a.performer === 'player'))), conflicts: [],
    };
    p.schedule.days.push(d);
    scheduleShootDay(state, p, d);
    date = nextWorkingDay(p, addDaysToKey(date, 1));
    n += 1;
  }
  ensureWorkEvent(state, p);
  addLog(state, `${n} pickup ${n === 1 ? 'day is' : 'days are'} scheduled for ${p.title}.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'schedule' } });
  return n;
}

function markCaptured(p: Project, sceneId: string, captured: number, quality: number, weatherCompromised: boolean): void {
  const existing = p.captures.find((c) => c.sceneId === sceneId);
  const rec: SceneCapture = { sceneId, captured: Math.min(1, captured), quality, version: p.approvedDraft ?? 0, weatherCompromised };
  if (existing) Object.assign(existing, rec);
  else p.captures.push(rec);
}

/** Modeled capture quality: rehearsal, key crew capability and conditions. A game model, not a measure of art. */
function captureQuality(state: GameState, p: Project, s: Scene, compromised: boolean, late: boolean): number {
  const crewCap = ['dop', 'sound-mixer', 'gaffer', 'first-ad'].map((r) => {
    const h = p.hires.find((x) => x.roleId === r && x.status === 'accepted');
    return h ? personById(state, h.personId).capability : 45;
  });
  const castCap = s.participants.map((cid) => {
    const a = p.cast.find((c) => c.characterId === cid);
    if (!a) return 50;
    // Dialogue in a language the performer doesn't speak, with no coach hired, costs quality.
    const coachPenalty = !personLanguagesFit(state, p, a) && !hasCrew(p, 'dialect-coach') ? 12 : 0;
    if (a.performer === 'player') return 55 + Math.min(20, p.schedule.rehearsalDays * 3) - coachPenalty;
    const h = p.hires.find((x) => x.id === a.hireId);
    return (h ? personById(state, h.personId).capability : 50) - coachPenalty;
  });
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 50);
  const rehearsal = p.tasks.find((x) => x.kind === 'prep:rehearsal')?.status === 'done' ? 6 : 0;
  let q = 0.5 * avg(crewCap) + 0.5 * avg(castCap) + rehearsal;
  if (compromised) q -= 15;
  if (late) q -= 5;
  return Math.round(Math.max(5, Math.min(100, q)));
}

// ---------------- Language fit (consumer of character-creation languages) ----------------

export function personLanguagesFit(state: GameState, p: Project, a: { characterId: string; performer: string }): boolean {
  const c = approvedCharacters(p).find((x) => x.id === a.characterId);
  if (!c) return true;
  const langs = c.languages.length ? c.languages : [p.axes.dialogueLanguages[0]];
  if (a.performer === 'player') {
    const known = [state.character.mainLanguage, ...state.character.languages.filter((l) => l.proficiency !== 'Basic').map((l) => l.code)];
    return langs.every((l) => known.includes(l));
  }
  const person = personById(state, a.performer);
  return langs.every((l) => person.languages.includes(l));
}

/** Names of cast characters whose performer needs coaching in a dialogue language. */
export function coachingNeeded(state: GameState, p: Project): string[] {
  return p.cast.filter((a) => !personLanguagesFit(state, p, a)).map((a) => approvedCharacters(p).find((c) => c.id === a.characterId)?.name ?? '');
}

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
  for (const task of p.tasks) {
    if (task.assetRef === characterId && task.needsVersion !== undefined && task.needsVersion < c.designVersion) {
      task.needsVersion = c.designVersion;
      task.done = 0;
      task.status = 'waiting';
      task.doneAt = undefined;
    }
    const scene = approvedScenes(p).find((s) => s.id === task.sceneIds[0]);
    if (scene?.participants.includes(characterId) && ['anim:animation', 'sm:animation'].includes(task.kind)) {
      if (task.status !== 'done' || redoFinished) {
        task.done = 0;
        task.status = 'waiting';
        // Downstream per-scene tasks restart too.
        for (const down of p.tasks.filter((x) => x.sceneIds[0] === scene.id && x.id !== task.id && /^(anim|sm|hy):/.test(x.kind))) {
          down.done = 0;
          down.status = 'waiting';
        }
      }
    }
  }
  for (const a of p.assets.filter((x) => x.characterId === characterId)) {
    a.version = c.designVersion;
    a.ready = false;
    a.stage = 'Needs Rebuild';
  }
  p.changeOrders.push({ id: newId(state, 'co'), at: state.now, summary: `${c.name}'s design changed.${redoFinished ? ' Finished shots will be redone.' : ' Finished shots keep the old design.'}`, costDelta: 0, affectedTasks: [], decision: redoFinished ? 'accepted' : 'kept-old' });
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

export function estimatedShootDays(p: Project): number {
  const mods = projectModules(p);
  const live = approvedScenes(p).filter((s) => sceneTechnique(p, s) === 'live' && s.kind !== 'archival' && s.kind !== 'narration');
  return Math.max(0, Math.ceil(live.reduce((a, s) => a + s.estMinutes / sceneComplexity(s, mods), 0) / BASE_MINUTES_PER_SHOOT_DAY));
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
});
