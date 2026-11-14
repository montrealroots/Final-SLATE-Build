// The shot plan, the takes, the edit and the release: what is shot and how, which take is used, what the edit keeps, a
// locked picture opened again, and a release called off.
import type { Probe } from '../probe';
import { setShotPlan, chooseTake } from '../../../src/engine/takes-actions';
import { requestPickups, restoreToEdit, unlockImpact, unlockPicture } from '../../../src/engine/edit-actions';
import { cancelRelease, cutFromEdit, editScenes } from '../../../src/engine/finish';
import { approvedScenes } from '../../../src/engine/projects';
import type { GameState, Project } from '../../../src/engine/types';

/** Every scene shot with full coverage and many takes, before the shoot. */
const fullCoverage = (s: GameState, p: Project) => { if (!p.takesModel) return; for (const sc of approvedScenes(p)) setShotPlan(p, sc.id, { coverage: 'full', takes: 'many' }, s); };
/** Once per project, before the picture is locked: each scene's weakest take used instead of the one the editor chose. */
const weakestTakes = () => { const done = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && !x.edit.pictureLocked && !done.has(x) && x.captures.length && x.captures.every((c) => (c.takes?.length ?? 0) > 0) && !x.schedule.days.some((d) => d.status === 'scheduled'))) {
    for (const c of p.captures) { const takes = c.takes!; const worst = takes.reduce((w, t, i) => ((t.perf + t.tech) < (takes[w].perf + takes[w].tech) ? i : w), 0); chooseTake(p, c.sceneId, worst); }
    done.add(p);
  }
}; };
/** Once per project, after the shoot and before the lock: the edit's last scene cut, and (if asked) put back the next day. */
const cutLast = (restore: boolean) => { const cut = new WeakMap<Project, string>(); const back = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && !x.edit.pictureLocked && x.schedule.days.length && !x.schedule.days.some((d) => d.status === 'scheduled'))) {
    if (!cut.has(p)) { const sc = editScenes(p); if (sc.length > 1) { cutFromEdit(s, p, sc[sc.length - 1].id); cut.set(p, sc[sc.length - 1].id); } }
    else if (restore && !back.has(p)) { restoreToEdit(s, p, cut.get(p)!); back.add(p); }
  }
}; };
/** Once per project, after the shoot: pickups asked for the first scene. */
const pickups = () => { const done = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && !x.edit.pictureLocked && !done.has(x) && x.schedule.days.length && !x.schedule.days.some((d) => d.status === 'scheduled'))) { try { requestPickups(s, p, [editScenes(p)[0].id]); } catch { /* none needed */ } done.add(p); }
}; };
/** Once per project: the picture opened again the day it is locked, before delivery. */
/** Once per film, once finishing work after the lock is under way (until November 14, 2026 this unlocked on the day of
 *  the lock, when nothing after it had started, so there was nothing to redo): the picture opened again. */
const reopen = () => { const done = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => x.edit.pictureLocked && !x.delivered && !done.has(x) && unlockImpact(x).length > 0)) { unlockPicture(s, p); done.add(p); }
}; };
/** The first planned release of each film called off. */
const callOff = (s: GameState) => { for (const p of s.projects) for (const r of p.releases.filter((x) => x.status === 'planned')) { try { cancelRelease(s, p, r.id); } catch { /* a studio's term */ } } };

const measure = (_s: GameState, projects: Project[]) => ({
  setups: projects.reduce((a, p) => a + Object.values(p.shotPlans ?? {}).filter((x) => x.coverage === 'full').length, 0),
  weakTakes: projects.reduce((a, p) => a + p.captures.filter((c) => c.chosenTake !== undefined && c.takes && c.chosenTake !== c.takes.reduce((b, t, i) => ((t.perf + t.tech) > (c.takes![b].perf + c.takes![b].tech) ? i : b), 0)).length, 0),
  cutFromEdit: projects.reduce((a, p) => a + (p.edit.cutSceneIds ?? []).length, 0),
  pickupDays: projects.reduce((a, p) => a + p.schedule.days.filter((d) => Object.keys(d.pickups ?? {}).length > 0).length, 0),
  unlocked: projects.reduce((a, p) => a + p.history.filter((h) => /unlocked/i.test(h.text)).length, 0),
  cancelledReleases: projects.reduce((a, p) => a + p.releases.filter((r) => r.status === 'cancelled').length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'full-coverage',
    features: ['action:takes-actions.setShotPlan'],
    decision: 'Shoot every scene with full coverage and many takes',
    reads: ['src/engine/takes-actions.ts#setShotPlan', 'src/engine/production/shoot.ts#runShootDay'],
    variant: { decide: fullCoverage },
    measure,
    bites: ['setups'],
    downstream: ['shootDays', 'spent', 'quality.direction', 'overall'],
  },
  {
    id: 'weakest-takes',
    features: ['action:takes-actions.chooseTake'],
    decision: 'Use each scene\'s weakest take in the edit',
    reads: ['src/engine/takes-actions.ts#chooseTake', 'src/engine/finish.ts#editScenes'],
    variant: { daily: weakestTakes() },
    measure,
    bites: ['weakTakes'],
    downstream: ['quality.direction', 'overall', 'reception'],
  },
  {
    id: 'cut-from-edit',
    features: ['action:finish.cutFromEdit'],
    decision: 'Cut the last scene from the edit after the shoot',
    reads: ['src/engine/finish.ts#cutFromEdit', 'src/engine/finish.ts#editScenes'],
    variant: { daily: cutLast(false) },
    measure,
    bites: ['cutFromEdit'],
    downstream: ['overall', 'reception', 'revenue'],
  },
  {
    id: 'restore-to-edit',
    features: ['action:edit-actions.restoreToEdit'],
    decision: 'Put the scene cut from the edit back the next day',
    reads: ['src/engine/edit-actions.ts#restoreToEdit', 'src/engine/finish.ts#editScenes'],
    base: { daily: cutLast(false) },
    variant: { daily: cutLast(true) },
    measure,
    bites: ['cutFromEdit'],
    downstream: ['overall', 'reception', 'revenue'],
  },
  {
    id: 'request-pickups',
    features: ['action:edit-actions.requestPickups'],
    decision: 'Ask for pickups of the first scene after the shoot',
    reads: ['src/engine/edit-actions.ts#requestPickups'],
    variant: { daily: pickups() },
    measure,
    bites: ['shootDays'],
    downstream: ['spent', 'daysToDeliver', 'quality.direction'],
  },
  {
    id: 'unlock-picture',
    features: ['action:edit-actions.unlockPicture'],
    decision: 'Open the locked picture again before delivery',
    reads: ['src/engine/edit-actions.ts#unlockPicture'],
    variant: { daily: reopen() },
    measure,
    bites: ['daysToDeliver'],
    downstream: ['spent', 'releaseDelay', 'revenue'],
  },
  {
    id: 'cancel-release',
    features: ['action:finish.cancelRelease'],
    decision: 'Call off each planned release before it happens',
    reads: ['src/engine/finish.ts#cancelRelease'],
    variant: { daily: callOff },
    measure,
    bites: ['cancelledReleases'],
    downstream: ['released', 'revenue', 'money'],
  },
];
