// Festival and distribution versions (SLATE-15-05.03, November 8, 2026). A project was delivered as one cut, plus the
// broadcast edit a broadcaster asks for. Now, once picture is locked and before delivery, the editor can conform other
// versions: a Festival Cut or a Distribution Cut that leaves chosen scenes out. Each is a day of the editor's work that
// delivery waits for, has its own runtime (which is what a festival's runtime rules read when it is the version entered),
// and its own credits: a performer or contributor whose scenes it leaves out isn't credited on it.
import { computeCredits, editScenes } from './finish';
import { assertEditable } from './projects';
import { newId } from './state';
import { stageIn } from './parts';
import { t } from './production/tasks';
import type { Credit, GameState, Project, ProjectVersion } from './types';

export const VERSION_LABELS = ['Festival Cut', 'Distribution Cut'] as const;

/** The scenes a version keeps: the delivered cut less what it leaves out. */
export function versionScenes(p: Project, v: ProjectVersion) {
  return editScenes(p).filter((s) => !v.leaveOut.includes(s.id));
}

export function versionRuntime(p: Project, v: ProjectVersion): number {
  return Math.round(versionScenes(p, v).reduce((a, s) => a + s.estMinutes, 0));
}

export function addVersion(state: GameState, p: Project, label: string, leaveOut: string[]): ProjectVersion {
  assertEditable(p);
  if (!p.edit.pictureLocked) throw new Error('Lock picture first: versions are conformed from the locked cut.');
  const name = label.trim();
  if (!name) throw new Error('Name the version.');
  if ((p.versions ?? []).some((v) => v.label === name)) throw new Error(`There is already a ${name}.`);
  const inCut = new Set(editScenes(p).map((s) => s.id));
  if (leaveOut.some((id) => !inCut.has(id))) throw new Error('That scene isn\'t in the cut.');
  if (leaveOut.length >= inCut.size) throw new Error('A version has to keep at least one scene.');
  const v: ProjectVersion = { id: newId(state, 'ver'), label: name, leaveOut: [...new Set(leaveOut)] };
  (p.versions ??= []).push(v);
  p.tasks.push(t('post:version', v.id, `Conform The ${name}`, 'Post Production', 'editor', 1, 'days', ['milestone:lock:1']));
  return v;
}

export function removeVersion(p: Project, id: string): void {
  assertEditable(p);
  if (p.tasks.some((x) => x.id === `post:version:${id}` && x.status === 'done')) throw new Error('That version is finished; it is delivered with the project.');
  p.versions = (p.versions ?? []).filter((v) => v.id !== id);
  p.tasks = p.tasks.filter((x) => x.id !== `post:version:${id}`);
}

/** A version's credits: the project's, less performers and contributors whose scenes it leaves out. */
export function versionCredits(state: GameState, p: Project, v: ProjectVersion): Credit[] {
  const keep = versionScenes(p, v);
  const characters = new Set(keep.flatMap((s) => s.participants));
  const contributors = new Set(keep.flatMap((s) => s.contributorIds));
  const byName = new Map(p.characters.map((c) => [c.name, c.id]));
  return (p.credits?.length ? p.credits : computeCredits(state, p)).filter((c) => {
    if (c.characterName) {
      // By the scenes it keeps that this performer plays: the part's, or its stage's (parts.ts).
      const cid = byName.get(c.characterName) ?? '';
      const stage = c.stage ? (p.stages ?? []).find((x) => x.characterId === cid && x.label === c.stage)?.id : undefined;
      return characters.has(cid) && keep.some((s) => s.participants.includes(cid) && stageIn(p, cid, s) === stage);
    }
    if (c.roleId === 'contributor') return contributors.has(c.person.replace(/^contributor:/, ''));
    return true;
  });
}
