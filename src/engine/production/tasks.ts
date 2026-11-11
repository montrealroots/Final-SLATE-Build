// Task generation: the dependency graph of production work, built from the approved draft by medium and technique.
// Part of the production engine; src/engine/production.ts is its public interface.

import type { Project, Scene, Task } from '../types';
import { approvedCharacters, approvedScenes, isEpisodic, isNonfiction, projectModules, sceneLabel, sceneTechnique } from '../projects';
import { MOCAP_CLEANUP_PER_SESSION } from '../mocap';
import { ANIM_RATE, MOCAP_ANIMATION_FACTOR, OUTPUT_FPS } from './rates';
import { recordTaskId, songTasks, songUses } from '../songs';
import { CREATURE_FOLEY_DAYS, LIGHTS, LOOP_GROUP_PER_SCENES, LOOP_GROUP_SESSION, WILD_TRACK_PER_LOCATIONS, cameraTestDays, lightOf, postFactors, rigRehearsalDays, scoreSessions, soundsOf } from '../craft';
import { CROWD_POST_DAYS, PERIOD_WORK, costumeCopies, digitalCrowd, makeup, projectBand, statesOf, wardrobe } from '../looks';

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
  // A declared story year sets the period's extra work (looks.ts); without one, the older rule reads the genre and the era's words.
  const band = projectBand(p);
  const periodFactor = band ? PERIOD_WORK[band] : mods.has('period') && !/contemporary|present/i.test(p.axes.storyEra) ? 1.5 : 1;
  const prepIds: string[] = [];

  if (count('period-research')) {
    tasks.push(t('prep:research', 'period', 'Period Research', 'Documentary', 'researcher', 5, 'days'));
    prepIds.push('prep:research:period');
  }
  if (count('setting-research')) {
    tasks.push(t('prep:research', 'setting', 'Setting Research', 'Documentary', 'researcher', 3, 'days'));
    prepIds.push('prep:research:setting');
  }
  const research = [...(count('period-research') ? ['prep:research:period'] : []), ...(count('setting-research') ? ['prep:research:setting'] : [])];
  if (liveScenes.length && !nonfiction) {
    const locs = count('location');
    tasks.push(t('prep:locations', 'all', 'Location Scouting And Permits', 'Locations', 'location-manager', Math.max(1, locs), 'locations'));
    // The light chosen is tested before the shoot, and location sound is recorded place by place (craft.ts). Both are
    // prep: a scene isn't shot until they are done.
    const tests = cameraTestDays(p, true, false);
    if (tests) { tasks.push(t('prep:camera-test', 'all', 'Camera And Lighting Tests', 'Camera', 'dop', tests, 'test days')); prepIds.push('prep:camera-test:all'); }
    if (soundsOf(p).includes('texture')) { tasks.push(t('prep:wildtrack', 'all', 'Location Sound Recording', 'Sound', 'sound-mixer', Math.max(1, Math.ceil(locs / WILD_TRACK_PER_LOCATIONS)), 'days')); prepIds.push('prep:wildtrack:all'); }
    // A story set somewhere else added a scouting trip there until the review of November 7, 2026: where a story is set
    // isn't where it is shot, so the setting place is a creative and research reference. From November 9, 2026 a setting
    // in another country than the base is researched before design and costumes start, as a period is.
    tasks.push(t('prep:design', 'all', 'Production Design And Props', 'Art', 'production-designer', Math.max(1, count('prop') + count('clue-prop') + Math.ceil(locs / 2)), 'items', research));
    // A costume with a declared source is its own work (looks.ts): sourced or made, in as many copies as its states and
    // its rough scenes need, then fitted. The rest share the one costume task, as before.
    const onSet = (c: (typeof chars)[number]) => c.roleSize !== 'background' && liveScenes.some((s) => s.participants.includes(c.id));
    const sourced = chars.filter((c) => onSet(c) && wardrobe(c.look?.wardrobe));
    const shared = chars.filter((c) => c.roleSize !== 'background' && !sourced.includes(c));
    if (shared.length || !sourced.length) tasks.push(t('prep:costume', 'all', 'Costumes', 'Costume And Makeup', 'costume-designer', Math.max(1, shared.length * periodFactor), 'costumes', research));
    prepIds.push('prep:locations:all', 'prep:design:all');
    if (shared.length || !sourced.length) prepIds.push('prep:costume:all');
    for (const c of sourced) {
      const w = wardrobe(c.look!.wardrobe)!;
      const copies = costumeCopies(c, liveScenes);
      // Clothes not of the story's period are remade to pass: the period's extra work, on top of the source's own.
      const work = w.anyPeriod ? 1 : periodFactor;
      tasks.push(t('prep:wardrobe', c.id, `Costume: ${c.name}`, 'Costume And Makeup', 'costume-designer', w.days * copies * work, 'days', research, { assetRef: c.id, material: Math.round(w.cost * copies * work) }));
      tasks.push(t('prep:fitting', c.id, `Fittings: ${c.name}`, 'Costume And Makeup', 'costume-designer', w.fittings, 'fittings', [`prep:wardrobe:${c.id}`], { assetRef: c.id }));
      prepIds.push(`prep:wardrobe:${c.id}`, `prep:fitting:${c.id}`);
    }
    // Makeup with a declared method (looks.ts): camera tests, and for appliances a build for each appearance state.
    for (const c of chars.filter((x) => onSet(x) && makeup(x.look?.makeup))) {
      const m = makeup(c.look!.makeup)!;
      const dept = m.specialist === 'prosthetics' ? 'Creature And Effects' : 'Costume And Makeup';
      const built = m.buildDays > 0;
      // Hair of another time waits for the period's research, as costumes do; a creature or a wound doesn't.
      const after = m.id === 'period-hair' ? research : [];
      if (built) {
        tasks.push(t('prep:appliances', c.id, `${m.label}: ${c.name}`, dept, m.specialist, m.buildDays * statesOf(c), 'build days', after, { assetRef: c.id, material: m.buildCost * m.buildDays * statesOf(c) }));
        prepIds.push(`prep:appliances:${c.id}`);
      }
      if (m.testDays > 0) {
        tasks.push(t('prep:makeup-test', c.id, `Makeup Tests: ${c.name}`, dept, m.specialist, m.testDays, 'test days', built ? [`prep:appliances:${c.id}`] : after, { assetRef: c.id }));
        prepIds.push(`prep:makeup-test:${c.id}`);
      }
    }
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
    // Long moving takes and scenes seen through a character's eyes are rehearsed (craft.ts), beside the days the player set.
    const rigDays = rigRehearsalDays(p, liveScenes);
    if ((p.schedule.rehearsalDays > 0 || rigDays > 0) && p.cast.length) {
      tasks.push(t('prep:rehearsal', 'all', 'Cast Rehearsals', 'Direction', 'director', p.schedule.rehearsalDays + rigDays, 'days'));
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
        // Macro lenses on miniatures are tested with the stage setup (craft.ts): two more stage days before animation.
        tasks.push(t('sm:stages', 'all', 'Stage Camera And Lighting Setup', 'Stop Motion', 'stage-dp', p.schedule.stages * 2 + cameraTestDays(p, false, true), 'stage days', ['sm:sets:all']));
        for (const s of tScenes) {
          const deps = ['anim:animatic:all', 'sm:stages:all', ...s.participants.filter((c) => animChars.some((x) => x.id === c)).map((c) => `sm:costume:${c}`), ...voiceDeps(s)];
          tasks.push(t('sm:animation', s.id, `Animate ${sceneLabel(p, s)}`, 'Stop Motion', 'stopmo-animator', (s.estMinutes * 60) / (rate[q] * LIGHTS[lightOf(p)].frames), 'animator days', deps, { sceneIds: [s.id], episode: s.episode }));
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

  // Songs (songs.ts): writing and recording each, and clearing each licensed one the script uses. Until November 9, 2026
  // the script's song titles counted, one clearance per scene listing; now each licensed song is cleared once.
  const uses = songUses(p, scenes);
  // A song a version puts in place of another is written, recorded and cleared like the cut's own.
  const swapped = (p.versions ?? []).flatMap((v) => (v.songChanges ?? []).map((c) => c.replaceWith)).map((id) => (p.songs ?? []).find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x);
  const used = [...new Set([...uses.map((x) => x.song), ...swapped])];
  for (const song of p.songs ?? []) tasks.push(...songTasks(song, used.includes(song)));
  const licensedSongs = used.filter((x) => x.rights === 'licensed');
  const licensed = licensedSongs.length > 0 || scenes.some((s) => s.kind === 'archival');
  if (licensedSongs.length) tasks.push(t('post:clearance', 'all', 'Music Clearances', 'Music', 'music-supervisor', licensedSongs.length * 2, 'days'));
  // A song performed on screen is recorded before an animated scene is animated, as a voice is.
  for (const task of tasks.filter((x) => x.kind === 'anim:animation' || x.kind === 'sm:animation')) {
    for (const { song, use } of uses) if (use.placement === 'performed' && task.sceneIds.includes(use.sceneId) && song.rights !== 'licensed') task.dependsOn.push(recordTaskId(song));
  }
  // Post production, per episode. Milestones gate stages that need a locked picture.
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
    const craft = postFactors(p);
    const hasVfx = eScenes.some((s) => s.vfx.length && sceneTechnique(p, s) === 'live');
    // Work finished in post because of how it was shot (looks.ts): a crowd extended beyond the people on set, and a look
    // made digitally. Each scene's is counted once, here, and nowhere else.
    const liveHere = eScenes.filter((s) => sceneTechnique(p, s) === 'live');
    const crowdScenes = liveHere.filter(digitalCrowd);
    if (crowdScenes.length) tasks.push(t('post:crowd', String(e), `Crowd Extension${epSuffix(p, e)}`, 'Post Production', 'vfx-artist', crowdScenes.length * CROWD_POST_DAYS, 'days', [lock], { episode: e, sceneIds: crowdScenes.map((s) => s.id) }));
    const digitalLooks = chars.filter((c) => c.roleSize !== 'background' && (makeup(c.look?.makeup)?.vfxDays ?? 0) > 0);
    const lookDays = digitalLooks.reduce((a, c) => a + liveHere.filter((s) => s.participants.includes(c.id)).length * makeup(c.look!.makeup)!.vfxDays, 0);
    if (lookDays) tasks.push(t('post:looks', String(e), `Digital Makeup${epSuffix(p, e)}`, 'Post Production', 'vfx-artist', lookDays, 'days', [lock], { episode: e }));
    const postLooks = [...(crowdScenes.length ? [`post:crowd:${e}`] : []), ...(lookDays ? [`post:looks:${e}`] : [])];
    // Projects from November 8, 2026 edit dialogue, record Foley and cut effects as their own work (SLATE-15-04.02). The
    // units add up to the single sound pass they replace, but each is at least a day and one sound designer works one task
    // a day, so a short work's sound takes a day or two longer (the production golden moved by 1 to 3 days). The dialogue
    // edit waits for any dialogue replacement.
    if (p.takesModel) {
      tasks.push(t('post:dialogue', String(e), `Dialogue Edit${epSuffix(p, e)}`, 'Post Production', 'sound-designer', Math.max(1, minutes / 12), 'days', [lock, ...p.tasks.filter((x) => x.kind === 'post:adr' && x.episode === e).map((x) => x.id)], { episode: e }));
      // The sound plan and the score change how long each takes (craft.ts): creatures add Foley days of their own.
      const creatures = soundsOf(p).includes('creature') ? approvedCharacters(p).filter((c) => c.entity !== 'human' && eScenes.some((s) => s.participants.includes(c.id))).length : 0;
      tasks.push(t('post:foley', String(e), `Foley${epSuffix(p, e)}`, 'Post Production', 'sound-designer', Math.max(1, (minutes / 15) * craft.foley) + creatures * CREATURE_FOLEY_DAYS, 'days', [lock], { episode: e }));
      tasks.push(t('post:sound', String(e), `Sound Effects Editing${epSuffix(p, e)}`, 'Post Production', 'sound-designer', Math.max(1, (minutes / 20) * craft.effects), 'days', [lock], { episode: e }));
    } else tasks.push(t('post:sound', String(e), `Sound Editing${epSuffix(p, e)}`, 'Post Production', 'sound-designer', Math.max(1, minutes / 5), 'days', [lock], { episode: e }));
    tasks.push(t('post:music', String(e), `Score${epSuffix(p, e)}`, 'Music', 'composer', Math.max(1, (minutes / 4) * craft.score), 'days', [lock], { episode: e }));
    // A score with players is recorded in sessions, paid for as the task's materials; the mix waits for them.
    const sessions = scoreSessions(p, minutes);
    if (sessions.sessions) tasks.push(t('post:score-session', String(e), `Score Recording${epSuffix(p, e)}`, 'Music', 'composer', sessions.sessions, 'sessions', [`post:music:${e}`], { episode: e, material: sessions.sessions * sessions.each }));
    // A loop group records the crowd for the scenes that have one.
    const crowdScenes2 = soundsOf(p).includes('crowd') ? eScenes.filter((s) => s.crowd > 0) : [];
    if (crowdScenes2.length) { const n = Math.ceil(crowdScenes2.length / LOOP_GROUP_PER_SCENES); tasks.push(t('post:loop-group', String(e), `Loop Group${epSuffix(p, e)}`, 'Post Production', 'sound-designer', n, 'sessions', [lock], { episode: e, material: n * LOOP_GROUP_SESSION, sceneIds: crowdScenes2.map((s) => s.id) })); }
    if (hasVfx) tasks.push(t('post:vfx', String(e), `Visual Effects${epSuffix(p, e)}`, 'Post Production', 'vfx-artist', eScenes.reduce((a, s) => a + s.vfx.length * 4, 0), 'days', [lock], { episode: e }));
    tasks.push(t('post:color', String(e), `Color Grade${epSuffix(p, e)}`, 'Post Production', 'colorist', Math.max(1, (minutes / 20) * craft.grade), 'days', [lock, ...(hasVfx ? [`post:vfx:${e}`] : []), ...postLooks], { episode: e }));
    const songsHere = [...new Set(uses.filter((x) => eScenes.some((s) => s.id === x.use.sceneId) && x.song.rights !== 'licensed').map((x) => recordTaskId(x.song)))];
    tasks.push(t('post:mix', String(e), `Final Mix${epSuffix(p, e)}`, 'Post Production', 're-recording-mixer', Math.max(1, (minutes / 30) * craft.mix), 'days', [...(sessions.sessions ? [`post:score-session:${e}`] : []), ...(crowdScenes2.length ? [`post:loop-group:${e}`] : []), `post:sound:${e}`, ...(p.takesModel ? [`post:dialogue:${e}`, `post:foley:${e}`] : []), `post:music:${e}`, ...songsHere, ...(licensed && tasks.some((x) => x.id === 'post:clearance:all') ? ['post:clearance:all'] : [])], { episode: e }));
    tasks.push(t('post:captions', String(e), `Captions And Subtitles${epSuffix(p, e)}`, 'Post Production', 'subtitler', Math.max(1, (minutes / 30) * p.axes.dialogueLanguages.length), 'days', [`post:mix:${e}`], { episode: e }));
    tasks.push(t('post:qc', String(e), `Delivery Quality Control${epSuffix(p, e)}`, 'Post Production', 'qc-technician', 1, 'days', [`post:color:${e}`, `post:mix:${e}`, `post:captions:${e}`], { episode: e }));
  }
  // A narrator records their narration once the picture is locked; every mix waits for it.
  for (const c of chars.filter((x) => x.functions.includes('narrator') && x.roleSize !== 'background')) {
    const id = `post:narration:${c.id}`;
    tasks.push(t('post:narration', c.id, `Record ${c.name}'s Narration`, 'Post Production', 'sound-designer', 1, 'sessions', ['milestone:lock:1']));
    for (const mix of tasks.filter((x) => x.kind === 'post:mix')) mix.dependsOn.push(id);
  }
  // A contributor who agreed on condition their face is hidden: blurring work after lock (documentary.ts).
  for (const c of p.contributors.filter((x) => x.consent === 'given' && x.restrictions?.includes('face'))) {
    const with_ = scenes.filter((s) => s.contributorIds.includes(c.id));
    if (with_.length) tasks.push(t('post:blur', c.id, `Hide ${c.name}'s Face`, 'Post Production', 'editor', Math.max(1, with_.length * 0.5), 'days', ['milestone:lock:1'], { sceneIds: with_.map((s) => s.id) }));
  }
  // Prep must finish before live capture.
  for (const task of tasks) if (task.kind === 'prep:rehearsal') task.dependsOn.push(...prepIds.filter((x) => x !== 'prep:rehearsal:all' && x !== 'doc:research:all'));
  return tasks;
}

export function epSuffix(p: Project, e: number): string {
  return isEpisodic(p.axes.format) ? `, Episode ${e}` : '';
}

