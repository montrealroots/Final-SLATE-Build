// Task generation: the dependency graph of production work, built from the approved draft by medium and technique.
// Part of the production engine; src/engine/production.ts is its public interface.

import type { Project, Scene, Task } from '../types';
import { findPlace } from '../../data/places';
import { approvedCharacters, approvedScenes, isEpisodic, isNonfiction, projectModules, sceneLabel, sceneTechnique } from '../projects';
import { MOCAP_CLEANUP_PER_SESSION } from '../mocap';
import { ANIM_RATE, MOCAP_ANIMATION_FACTOR, OUTPUT_FPS } from './rates';

// ---------------- Task generation ----------------

export function t(kind: string, ref: string, label: string, dept: string, roleId: string, units: number, unitLabel: string, dependsOn: string[] = [], extra: Partial<Task> = {}): Task {
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
    // Shooting away from where the story is set: a scouting trip there first, longer abroad (simulation assumption).
    const setting = p.axes.settingPlaceId && p.axes.settingPlaceId !== p.axes.basePlaceId ? findPlace(p.axes.settingPlaceId) : undefined;
    if (setting) {
      const abroad = setting.country !== findPlace(p.axes.basePlaceId)?.country;
      tasks.push(t('prep:scout', 'setting', `Scouting Trip To ${setting.name}`, 'Locations', 'location-manager', abroad ? 4 : 2, 'days'));
      prepIds.push('prep:scout:setting');
    }
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
  // A narrator records their narration once the picture is locked; every mix waits for it.
  for (const c of chars.filter((x) => x.functions.includes('narrator') && x.roleSize !== 'background')) {
    const id = `post:narration:${c.id}`;
    tasks.push(t('post:narration', c.id, `Record ${c.name}'s Narration`, 'Post Production', 'sound-designer', 1, 'sessions', ['milestone:lock:1']));
    for (const mix of tasks.filter((x) => x.kind === 'post:mix')) mix.dependsOn.push(id);
  }
  // Prep must finish before live capture.
  for (const task of tasks) if (task.kind === 'prep:rehearsal') task.dependsOn.push(...prepIds.filter((x) => x !== 'prep:rehearsal:all' && x !== 'doc:research:all'));
  return tasks;
}

export function epSuffix(p: Project, e: number): string {
  return isEpisodic(p.axes.format) ? `, Episode ${e}` : '';
}

