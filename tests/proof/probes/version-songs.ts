// A song changed in one version of the cut (song-actions.ts changeVersionSong): a version can play another song in a
// scene, and the song it puts in is written, recorded and cleared like the cut's own (production/tasks.ts buildTasks).
// On the default short: "First Light", written for it, plays in the background of its last scene; "Second Light" is
// written but not in the cut. Once picture is locked, a Festival Cut leaving out the first scene.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { approvedScenes } from '../../../src/engine/projects';
import { editScenes } from '../../../src/engine/finish';
import { addVersion } from '../../../src/engine/versions';
import { attachSong, changeVersionSong, createSong, restoreVersionSong } from '../../../src/engine/song-actions';

/** After the script is approved: the two songs, the first in the last scene. */
const songs = (s: GameState, p: Project) => {
  const first = createSong(s, p, { title: 'First Light', source: 'write' });
  createSong(s, p, { title: 'Second Light', source: 'write' });
  attachSong(p, first.id, approvedScenes(p).at(-1)!.id, 'background');
};
const byTitle = (p: Project, t: string) => (p.songs ?? []).find((x) => x.title === t)!;
/** Once picture is locked: the Festival Cut, and then `change` (or nothing) done to it. */
const festival = (change?: (p: Project, versionId: string, sceneId: string) => void) => { const tried = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => x.edit.pictureLocked && !x.delivered && !tried.has(x) && byTitle(x, 'First Light'))) {
    const scenes = editScenes(p);
    if (scenes.length < 2) continue;
    tried.add(p);
    const v = addVersion(s, p, 'Festival Cut', [scenes[0].id]);
    change?.(p, v.id, scenes.at(-1)!.id);
  }
}; };
const swap = (p: Project, v: string, sc: string) => changeVersionSong(p, v, sc, byTitle(p, 'First Light').id, byTitle(p, 'Second Light').id);
const swapBack = (p: Project, v: string, sc: string) => { swap(p, v, sc); restoreVersionSong(p, v, sc, byTitle(p, 'First Light').id); };

const measure = (_s: GameState, projects: Project[]) => ({
  songChanges: projects.reduce((a, p) => a + (p.versions ?? []).reduce((b, v) => b + (v.songChanges ?? []).length, 0), 0),
  songTasks: projects.reduce((a, p) => a + p.tasks.filter((t) => t.id.startsWith('song:')).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'version-song', features: ['action:song-actions.changeVersionSong'], decision: 'Play "Second Light" instead of "First Light" in the Festival Cut',
    reads: ['src/engine/song-actions.ts#changeVersionSong', 'src/engine/songs.ts#songUses', 'src/engine/production/tasks.ts#buildTasks'],
    base: { decide: songs, daily: festival() }, variant: { decide: songs, daily: festival(swap) }, measure,
    bites: ['songChanges', 'songTasks'], downstream: ['spent', 'daysToDeliver'],
  },
  {
    id: 'restore-version-song', features: ['action:song-actions.restoreVersionSong'], decision: 'Put "First Light" back in the Festival Cut after swapping it',
    reads: ['src/engine/song-actions.ts#restoreVersionSong', 'src/engine/production/tasks.ts#buildTasks'],
    base: { decide: songs, daily: festival(swap) }, variant: { decide: songs, daily: festival(swapBack) }, measure,
    bites: ['songChanges', 'songTasks'], downstream: ['spent', 'daysToDeliver'],
  },
];
