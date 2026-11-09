// What the player does with songs (songs.ts): make one (write it, commission it, or use an existing song, licensed or in
// the public domain), credit its performers, put it in scenes and take it out, and change it in one version without
// touching another. Loaded with the pages that use it, not at startup.
import { buildTasks } from './production/tasks';
import { approvedScenes, assertEditable } from './projects';
import { addLog, newId } from './state';
import { songsOf } from './songs';
import type { GameState, Project, Song, SongCredit, SongUse } from './types';

export type SongSource = 'write' | 'commission' | 'public-domain' | 'licensed';

export const PLACEMENT_LABELS: Record<SongUse['placement'], string> = {
  performed: 'Performed On Screen', background: 'In The Background', 'opening-titles': 'Over The Opening Titles', 'end-credits': 'Over The End Credits',
};

function notDelivered(p: Project): void {
  if (p.delivered) throw new Error('This project is delivered; its songs are final.');
  assertEditable(p);
}

const songTask = (id: string) => id.startsWith('song:') || id === 'post:clearance:all';

/**
 * Bring the song work in the task list in line with the songs: add what a new song or use needs, drop work not started
 * that is no longer needed, and let the mixes and animation wait for the recordings they use. Before production has a
 * task list, scheduling builds it all.
 */
export function syncSongTasks(p: Project): void {
  if (!p.tasks.length) return;
  const fresh = buildTasks(p);
  const wanted = new Map(fresh.filter((x) => songTask(x.id)).map((x) => [x.id, x]));
  p.tasks = p.tasks.filter((x) => !songTask(x.id) || wanted.has(x.id) || x.done > 0);
  for (const w of wanted.values()) {
    const have = p.tasks.find((x) => x.id === w.id);
    if (!have) p.tasks.push(w);
    else if (have.status !== 'done') Object.assign(have, { kind: w.kind, units: Math.max(w.units, have.done), dependsOn: w.dependsOn, sceneIds: w.sceneIds, label: w.label });
  }
  for (const f of fresh.filter((x) => ['post:mix', 'anim:animation', 'sm:animation'].includes(x.kind))) {
    const have = p.tasks.find((x) => x.id === f.id);
    if (have && have.status !== 'done') have.dependsOn = f.dependsOn;
  }
}

function song(p: Project, id: string): Song {
  const s = songsOf(p).find((x) => x.id === id);
  if (!s) throw new Error('That song is no longer part of the project.');
  return s;
}

/**
 * A new song. Written by you, or commissioned: who writes the lyrics (with the music, you, a lyricist commissioned for
 * them, or none), and the writing becomes work for you or for a songwriter and lyricist you hire. An existing song names
 * its writers; a licensed one its rights holder, and the music supervisor clears it.
 */
export function createSong(state: GameState, p: Project, input: { title: string; source: SongSource; lyrics?: 'with-music' | 'you' | 'commission' | 'none'; holder?: string; writers?: { name: string; music: boolean; lyrics: boolean }[] }): Song {
  notDelivered(p);
  const title = input.title.trim();
  if (!title) throw new Error('Give the song a title.');
  if (songsOf(p).some((x) => x.title.toLowerCase() === title.toLowerCase())) throw new Error(`There is already a song called "${title}".`);
  const made = input.source === 'write' || input.source === 'commission';
  let writers: SongCredit[] = [];
  if (!made) {
    writers = (input.writers ?? []).map((w) => ({ who: null, name: w.name.trim(), music: w.music, lyrics: w.lyrics })).filter((w) => w.name && (w.music || w.lyrics));
    if (!writers.length) throw new Error('Name who wrote it, and whether they wrote the music, the lyrics or both.');
  }
  if (input.source === 'licensed' && !input.holder?.trim()) throw new Error('Name who holds the rights you are licensing it from.');
  const lyrics = input.lyrics ?? 'with-music';
  const commissioned = input.source === 'commission' || (input.source === 'write' && lyrics === 'commission');
  const s: Song = {
    id: newId(state, 'song'), title,
    origin: made ? (commissioned ? 'commissioned' : 'written') : 'existing',
    rights: input.source === 'licensed' ? 'licensed' : input.source === 'public-domain' ? 'public-domain' : 'production',
    writers, performers: [], uses: [], createdAt: state.now,
    ...(made ? { plan: { music: input.source === 'write' ? 'you' as const : 'commission' as const, lyrics } } : {}),
    ...(input.source === 'licensed' ? { license: { holder: input.holder!.trim() } } : {}),
  };
  (p.songs ??= []).push(s);
  syncSongTasks(p);
  addLog(state, `${p.title}: "${title}" added to the songs.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'production' } });
  return s;
}

/** The scene's length, from the script the production follows. */
function sceneOf(p: Project, sceneId: string) {
  const s = (p.approvedDraft !== null ? approvedScenes(p) : []).find((x) => x.id === sceneId) ?? p.scenes.find((x) => x.id === sceneId);
  if (!s) throw new Error('That scene isn\'t in the script.');
  return s;
}

/** Use a song in a scene: performed on screen, in the background, over the opening titles or the end credits. */
export function attachSong(p: Project, songId: string, sceneId: string, placement: SongUse['placement'], minutes: number | null = null): void {
  notDelivered(p);
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to change the songs in the cut, or change them in a version.');
  const s = song(p, songId);
  const scene = sceneOf(p, sceneId);
  if (s.uses.some((u) => u.sceneId === sceneId)) throw new Error(`"${s.title}" is already in that scene.`);
  if (placement === 'performed' && (p.captures.find((c) => c.sceneId === sceneId)?.captured ?? 0) > 0) throw new Error('That scene was shot without the song being performed. Use it in the background, or reshoot the scene.');
  checkMinutes(minutes, scene.estMinutes);
  // Over the end credits, it plays after those already there in that episode.
  const cue = placement === 'end-credits' ? 1 + Math.max(0, ...endCreditUses(p, scene.episode).map((u) => u.cue ?? 1)) : undefined;
  s.uses.push({ sceneId, placement, minutes, ...(cue ? { cue } : {}) });
  syncSongTasks(p);
}

/** The end-credit songs of an episode of the script, in the order they play. */
export function endCreditUses(p: Project, episode: number) {
  const scenes = new Set([...(p.approvedDraft !== null ? approvedScenes(p) : []), ...p.scenes].filter((x) => x.episode === episode).map((x) => x.id));
  return songsOf(p).flatMap((x) => x.uses.filter((u) => u.placement === 'end-credits' && scenes.has(u.sceneId)).map((u) => ({ ...u, song: x }))).sort((a, b) => (a.cue ?? 1) - (b.cue ?? 1));
}

/** Play this song first once the end credits begin; the others follow in their order. */
export function playFirstOverEndCredits(p: Project, songId: string, sceneId: string): void {
  notDelivered(p);
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to change the songs in the cut.');
  const s = song(p, songId);
  const u = s.uses.find((x) => x.sceneId === sceneId && x.placement === 'end-credits');
  if (!u) throw new Error(`"${s.title}" doesn't play over the end credits there.`);
  const order = endCreditUses(p, sceneOf(p, sceneId).episode).filter((x) => !(x.song === s && x.sceneId === sceneId));
  u.cue = 1;
  order.forEach((x, i) => { const real = x.song.uses.find((y) => y.sceneId === x.sceneId && y.placement === 'end-credits'); if (real) real.cue = i + 2; });
}

function checkMinutes(minutes: number | null, sceneMinutes: number): void {
  if (minutes === null) return;
  if (!Number.isFinite(minutes) || minutes < 0) throw new Error('How long it plays has to be zero or more minutes.');
  if (minutes > sceneMinutes + 1e-9) throw new Error(`The scene runs ${sceneMinutes} minutes; the song can't play longer than that in it.`);
}

/** How long the song plays in a scene; null when not recorded. */
export function setSongMinutes(p: Project, songId: string, sceneId: string, minutes: number | null): void {
  notDelivered(p);
  const u = song(p, songId).uses.find((x) => x.sceneId === sceneId);
  if (!u) throw new Error('The song isn\'t in that scene.');
  checkMinutes(minutes, sceneOf(p, sceneId).estMinutes);
  u.minutes = minutes;
}

/** Take a song out of a scene of the main cut. A version that replaces it there keeps its own song. */
export function detachSong(p: Project, songId: string, sceneId: string): void {
  notDelivered(p);
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to change the songs in the cut, or change them in a version.');
  const s = song(p, songId);
  const u = s.uses.find((x) => x.sceneId === sceneId);
  if (!u) throw new Error('The song isn\'t in that scene.');
  if (u.placement === 'performed' && (p.captures.find((c) => c.sceneId === sceneId)?.captured ?? 0) > 0) throw new Error('The song is performed in the footage of that scene. Replace it in a version, or cut the scene.');
  s.uses = s.uses.filter((x) => x !== u);
  for (const v of p.versions ?? []) v.songChanges = (v.songChanges ?? []).filter((c) => !(c.sceneId === sceneId && c.songId === songId));
  syncSongTasks(p);
}

/** Remove a song from the project: it can't be in any scene or version, and its credits go with it. */
export function removeSong(p: Project, songId: string): void {
  notDelivered(p);
  const s = song(p, songId);
  if (s.uses.length) throw new Error(`Take "${s.title}" out of its scenes first.`);
  if ((p.versions ?? []).some((v) => (v.songChanges ?? []).some((c) => c.replaceWith === songId))) throw new Error(`A version uses "${s.title}". Change that version first.`);
  p.songs = songsOf(p).filter((x) => x !== s);
  p.tasks = p.tasks.filter((x) => !(x.id.endsWith(`:${songId}`) && x.id.startsWith('song:') && x.done === 0));
  syncSongTasks(p);
}

/** Who performs it: parts in the cast (their performer is credited) or named artists, apart from who wrote it. */
export function setSongPerformers(p: Project, songId: string, performers: { characterId?: string; name?: string }[]): void {
  notDelivered(p);
  const s = song(p, songId);
  const chars = p.drafts.find((d) => d.number === p.approvedDraft)?.characters ?? p.characters;
  s.performers = performers.map((x) => {
    if (x.characterId) {
      const c = chars.find((y) => y.id === x.characterId);
      if (!c) throw new Error('That part isn\'t in the script.');
      return { who: null, name: c.name, characterId: c.id };
    }
    const name = x.name?.trim();
    if (!name) throw new Error('Name the performer.');
    return { who: null, name };
  });
}

/** An existing song's writers, as its credits read. A song written for the project is credited to whoever did the work. */
export function setSongWriters(p: Project, songId: string, writers: { name: string; music: boolean; lyrics: boolean }[]): void {
  notDelivered(p);
  const s = song(p, songId);
  if (s.origin === 'written' || s.origin === 'commissioned') throw new Error('A song written for the project is credited to whoever writes it.');
  const list = writers.map((w) => ({ who: null, name: w.name.trim(), music: w.music, lyrics: w.lyrics })).filter((w) => w.name && (w.music || w.lyrics));
  if (!list.length) throw new Error('Name who wrote it, and whether they wrote the music, the lyrics or both.');
  s.writers = list;
}

/**
 * In one version, take a song out of a scene or play another in its place. The main cut and other versions keep theirs.
 * A finished version would have to be conformed again, so it can't be changed.
 */
export function changeVersionSong(p: Project, versionId: string, sceneId: string, songId: string, replaceWith: string | null): void {
  notDelivered(p);
  const v = p.versions?.find((x) => x.id === versionId);
  if (!v) throw new Error('That version no longer exists.');
  if (p.tasks.some((x) => x.id === `post:version:${v.id}` && x.status === 'done')) throw new Error(`The ${v.label} is finished; it is delivered as conformed.`);
  const s = song(p, songId);
  if (!s.uses.some((u) => u.sceneId === sceneId)) throw new Error(`"${s.title}" isn't in that scene of the cut.`);
  if (v.leaveOut.includes(sceneId)) throw new Error(`The ${v.label} leaves that scene out.`);
  if (replaceWith !== null) {
    const other = song(p, replaceWith);
    if (other === s) throw new Error('Choose a different song to play instead.');
  }
  v.songChanges = [...(v.songChanges ?? []).filter((c) => !(c.sceneId === sceneId && c.songId === songId)), { sceneId, songId, replaceWith }];
  syncSongTasks(p);
}

/** Undo a version's change: it plays the cut's song in that scene again. */
export function restoreVersionSong(p: Project, versionId: string, sceneId: string, songId: string): void {
  notDelivered(p);
  const v = p.versions?.find((x) => x.id === versionId);
  if (!v) throw new Error('That version no longer exists.');
  if (p.tasks.some((x) => x.id === `post:version:${v.id}` && x.status === 'done')) throw new Error(`The ${v.label} is finished; it is delivered as conformed.`);
  v.songChanges = (v.songChanges ?? []).filter((c) => !(c.sceneId === sceneId && c.songId === songId));
  syncSongTasks(p);
}
