// Versions of the cut (versions.ts): a Festival Cut conformed from the locked picture, leaving the last scene out. Each
// is a day of the editor's that delivery waits for, with its own runtime and credits.
import type { Probe } from '../probe';
import { addVersion, removeVersion } from '../../../src/engine/versions';
import { editScenes } from '../../../src/engine/finish';
import type { GameState, Project } from '../../../src/engine/types';

/** Once the picture is locked and before delivery: a Festival Cut without the cut's last scene. */
const festivalCut = (thenRemove: boolean) => { const tried = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => x.edit.pictureLocked && !x.delivered && !tried.has(x))) {
    const scenes = editScenes(p);
    if (scenes.length < 2) continue;
    const v = addVersion(s, p, 'Festival Cut', [scenes[scenes.length - 1].id]);
    if (thenRemove) removeVersion(p, v.id);
    tried.add(p);
  }
}; };
const measure = (_s: GameState, projects: Project[]) => ({
  versions: projects.reduce((a, p) => a + (p.versions ?? []).length, 0),
  versionDays: projects.reduce((a, p) => a + p.tasks.filter((t) => t.kind === 'post:version').length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'add-version',
    features: ['action:versions.addVersion'],
    decision: 'Conform a Festival Cut without the last scene once the picture is locked',
    reads: ['src/engine/versions.ts#addVersion', 'src/engine/finish.ts#deliveryBlockers'],
    variant: { daily: festivalCut(false) },
    measure,
    bites: ['versions', 'versionDays'],
    downstream: ['daysToDeliver', 'spent', 'releaseDelay'],
  },
  {
    id: 'remove-version',
    features: ['action:versions.removeVersion'],
    decision: 'Take the Festival Cut back out before the editor conforms it',
    reads: ['src/engine/versions.ts#removeVersion', 'src/engine/finish.ts#deliveryBlockers'],
    base: { daily: festivalCut(false) },
    variant: { daily: festivalCut(true) },
    measure,
    bites: ['versions', 'versionDays'],
    downstream: ['daysToDeliver', 'spent', 'releaseDelay'],
  },
];
