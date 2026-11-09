// Songs as works (November 9, 2026). Until then a song was a title and a "licensed" flag on a scene, and the original
// song award went to the score composer of any project with an unlicensed one: nothing showed who wrote a song, or that
// it was written for the project. Now each song has a stable id, its writers (music and lyrics apart), its performers, its
// origin and rights, and where the cut uses it. Writing and recording one is production work: tasks for a songwriter,
// lyricist and music producer (or for you), and a performed song is recorded before its scene is shot. Its writing
// credits follow whoever did that work. The score stays the composer's, a separate credit.
// This module holds what delivery, credits and the task graph read (startup code); song-actions.ts holds the player's
// controls, loaded with the pages that use them.
import type { Credit, Project, ProjectVersion, Scene, Song, SongCredit, SongUse, Task } from './types';
import { t } from './production/tasks';

export const songsOf = (p: Project): Song[] => p.songs ?? [];

/** The songs heard in these scenes: the main cut's, or a version's after its removals and replacements. */
export function songUses(p: Project, scenes: Scene[], v?: ProjectVersion): { song: Song; use: SongUse }[] {
  const ids = new Set(scenes.map((s) => s.id));
  const out: { song: Song; use: SongUse }[] = [];
  for (const song of songsOf(p)) {
    for (const use of song.uses) {
      if (!ids.has(use.sceneId)) continue;
      const change = v?.songChanges?.find((c) => c.sceneId === use.sceneId && c.songId === song.id);
      if (!change) { out.push({ song, use }); continue; }
      const other = change.replaceWith ? songsOf(p).find((x) => x.id === change.replaceWith) : undefined;
      if (other) out.push({ song: other, use: { ...use } });
    }
  }
  return out;
}

/** Whether the song is a recording the production makes (anything not licensed with its recording). */
const recorded = (song: Song) => song.rights !== 'licensed';
const performedIn = (song: Song) => song.uses.filter((u) => u.placement === 'performed').map((u) => u.sceneId);

/** A song's recording task keeps one id; it is prep work (before the shoot) while the song is performed on screen. */
export function recordTaskId(song: Song): string {
  return `song:record:${song.id}`;
}

/**
 * A song's work: writing its music and lyrics (yours or the commissioned writers'), then recording it with a music
 * producer. A song performed on screen is recorded before the shoot (playback); otherwise before the mix.
 */
export function songTasks(song: Song, used = true): Task[] {
  const out: Task[] = [];
  const plan = song.plan;
  const deps: string[] = [];
  if (plan && (song.origin === 'written' || song.origin === 'commissioned')) {
    const both = plan.lyrics === 'with-music';
    out.push(t('song:music', song.id, both ? `Write The Song: ${song.title}` : `Write The Music: ${song.title}`, 'Music', plan.music === 'you' ? 'writer' : 'songwriter', 4, 'days'));
    deps.push(`song:music:${song.id}`);
    if (plan.lyrics === 'you' || plan.lyrics === 'commission') {
      out.push(t('song:lyrics', song.id, `Write The Lyrics: ${song.title}`, 'Music', plan.lyrics === 'you' ? 'writer' : 'lyricist', 2, 'days'));
      deps.push(`song:lyrics:${song.id}`);
    }
  }
  if (used && recorded(song)) {
    out.push({ ...t(performedIn(song).length ? 'prep:song' : 'post:song', song.id, `Record The Song: ${song.title}`, 'Music', 'music-producer', 1, 'days', deps, { sceneIds: performedIn(song) }), id: recordTaskId(song) });
  }
  return out;
}

/** When a song's writing or recording is done: its writers are whoever did the work. */
export function onSongTaskDone(p: Project, task: Task, name: (who: string) => string): void {
  const m = /^song:(music|lyrics):(.+)$/.exec(task.id);
  if (!m) return;
  const song = songsOf(p).find((s) => s.id === m[2]);
  if (!song) return;
  const part = m[1] as 'music' | 'lyrics';
  const both = part === 'music' && song.plan?.lyrics === 'with-music';
  for (const who of task.workers ?? []) {
    let c = song.writers.find((x) => x.who === who);
    if (!c) { c = { who, name: name(who) }; song.writers.push(c); }
    c.days = (c.days ?? 0) + (task.workerDays?.[who] ?? 0);
    if (part === 'music' || both) c.music = true;
    if (part === 'lyrics' || both) c.lyrics = true;
  }
  // Credits read music first, then lyrics, whichever was finished first.
  song.writers.sort((a, b) => Number(!!b.music) - Number(!!a.music));
}

/**
 * Written for this project, and shown to be: you wrote it or writers were commissioned for it, the production holds its
 * rights, and its writing is done. A song that is merely not licensed proves none of that (an existing song, or one from a
 * save made before songs were works, whose origin wasn't kept).
 */
export function writtenForProject(p: Project, song: Song): boolean {
  if (song.origin !== 'written' && song.origin !== 'commissioned') return false;
  if (song.rights !== 'production' || !song.writers.length) return false;
  return p.tasks.filter((x) => x.id === `song:music:${song.id}` || x.id === `song:lyrics:${song.id}`).every((x) => x.status === 'done');
}

export function songStatus(song: Song): string {
  if (song.rights === 'licensed') return 'Licensed';
  if (song.origin === 'written' || song.origin === 'commissioned') return 'Original';
  if (song.origin === 'unrecorded') return 'Origin not recorded';
  return song.rights === 'public-domain' ? 'Pre-existing, public domain' : 'Pre-existing';
}

const writerWords = (c: SongCredit) => (c.music && c.lyrics ? 'Song Written By' : c.lyrics ? 'Song Lyrics By' : 'Song Music By');

/** Songwriting and performance credits for the songs heard in these scenes (and the versions'), separate from the score. */
export function songCredits(p: Project, scenes: Scene[], versions: { v: ProjectVersion; scenes: Scene[] }[], add: (c: Omit<Credit, 'id' | 'billing'>) => void, player: string, performerOf: (characterId: string) => { person: string; name: string } | null): void {
  const used = new Map<string, Set<number>>();
  const note = (scs: Scene[], v?: ProjectVersion) => {
    for (const { song, use } of songUses(p, scs, v)) {
      const ep = scs.find((s) => s.id === use.sceneId)?.episode ?? 1;
      (used.get(song.id) ?? used.set(song.id, new Set()).get(song.id)!).add(ep);
    }
  };
  note(scenes);
  for (const x of versions) note(x.scenes, x.v);
  const episodic = new Set(scenes.map((s) => s.episode)).size > 1 || scenes.some((s) => s.episode > 1);
  for (const song of songsOf(p)) {
    const eps = used.get(song.id);
    if (!eps) continue;
    const episodes = episodic ? [...eps].sort((a, b) => a - b) : 'all' as const;
    song.writers.filter((c) => c.music || c.lyrics).forEach((c, i) => add({
      person: c.who ?? `songwriter:${song.id}:${i}`, personName: c.who === 'player' ? player : c.name, contribution: `${writerWords(c)} ("${song.title}")`,
      roleId: c.music ? 'songwriter' : 'lyricist', songId: song.id, episodes,
    }));
    song.performers.forEach((c, i) => {
      const cast = c.characterId ? performerOf(c.characterId) : null;
      add({ person: cast?.person ?? c.who ?? `song-performer:${song.id}:${i}`, personName: cast?.name ?? (c.who === 'player' ? player : c.name), contribution: `Song Performed By ("${song.title}")`, roleId: 'song-performer', songId: song.id, episodes });
    });
  }
}

/**
 * v7 -> v8: songs become works. Each title a project's scenes listed becomes a song used in the scenes that list it. Its
 * writers and its origin weren't kept, so they stay unknown: a licensed one stays licensed, any other has its origin
 * marked not recorded. Neither can be entered for an original song award, because the save can't show it was written for
 * the project. The scenes keep their old song lists, untouched; nothing reads them now. From November 9, 2026 a scene has
 * no song list in the model and new scenes are made without one: only this migration knows the old shape (LegacyScene).
 */
type LegacyScene = Scene & { songs?: { title: string; licensed: boolean }[] };
export function migrateV7toV8(raw: Record<string, unknown>): Record<string, unknown> {
  const projects = Array.isArray(raw.projects) ? (raw.projects as Record<string, unknown>[]).map((p) => {
    if (Array.isArray(p.songs)) return p;
    const drafts = Array.isArray(p.drafts) ? (p.drafts as { number: number; scenes?: Scene[] }[]) : [];
    const approved = drafts.find((d) => d.number === p.approvedDraft)?.scenes;
    const scenes: LegacyScene[] = (approved ?? (Array.isArray(p.scenes) ? p.scenes as Scene[] : [])) ?? [];
    const songs: Song[] = [];
    for (const sc of scenes) {
      for (const x of Array.isArray(sc.songs) ? sc.songs : []) {
        if (!x || typeof x.title !== 'string') continue;
        let song = songs.find((y) => y.title === x.title);
        if (!song) {
          song = { id: `song-${songs.length + 1}`, title: x.title, origin: x.licensed ? 'existing' : 'unrecorded', rights: x.licensed ? 'licensed' : 'production', writers: [], performers: [], uses: [], createdAt: Number(p.createdAt) || 0, ...(x.licensed ? { license: { holder: 'Not recorded' } } : {}) };
          songs.push(song);
        }
        if (!song.uses.some((u) => u.sceneId === sc.id)) song.uses.push({ sceneId: sc.id, placement: 'background', minutes: null });
      }
    }
    return { ...p, songs };
  }) : raw.projects;
  return { ...raw, projects };
}
