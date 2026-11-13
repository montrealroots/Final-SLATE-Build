// The real music catalog in a save (the owner's v5 brief, 3; built November 13, 2026). The data is
// tools/music/catalog.mjs's: what Wikidata (CC0) records about film composers, songwriters and recording artists and
// their recordings, in src/data/music.json, with each record's QID.
//
// What a save does with it:
// - a recording can be licensed into a project: it becomes a licensed song carrying its performers, writers, release
//   date and duration as recorded, and its licence is asked of its rights holders by the music page's usual request
//   (music.ts), whose fee and answer are the game's, simulated and labelled;
// - a composer whose film scores are recorded can be considered for the composer's job. They join the real people of the
//   save under the one identity the film catalog gives them (guests.ts, their TMDB ID), so one person has one profile and
//   one diary whatever they are approached for. What the game makes up about them (capability, asking rate, other work)
//   is labelled as simulation everywhere it shows, as for anyone from the film catalog.
// Roles stay distinct: composer, songwriter, lyricist, recording artist, performer, music producer, arranger, conductor.
// Nobody is contacted and nothing is bought: these are records, not outreach. No audio and no lyrics are held.
import { considerPerson, type RecordedPerson, type RealPerson } from './guests';
import { createSong } from './song-actions';
import type { GameState, Project, Song } from './types';
import musicUrl from '../data/music.json?url';

export type MusicRole = 'composer' | 'songwriter' | 'lyricist' | 'recording-artist' | 'performer' | 'music-producer' | 'conductor' | 'arranger' | 'music-director';
export interface MusicPerson {
  id: string;
  name: string;
  kind: 'person' | 'group';
  roles?: MusicRole[];
  occupations?: string[];
  born?: string; died?: string; formed?: string; ended?: string;
  country?: string;
  mbid?: string;
  tmdb?: number;
  scores?: { films: number; first?: number; last?: number; known: { id: string; title: string; year?: number }[] };
}
export interface Recording {
  id: string;
  title: string;
  performers: string[];
  composers?: { id: string; name: string }[];
  lyricists?: { id: string; name: string }[];
  producers?: { id: string; name: string }[];
  date?: string;
  seconds?: number;
  versionOf?: { id: string; title: string };
  mbRecording?: string;
  mbWork?: string;
}
export interface MusicCatalog { version: 1; source: string; licence: string; link: string; retrieved: string; people: MusicPerson[]; recordings: Recording[] }

export const MUSIC_ROLE_LABELS: Record<MusicRole, string> = {
  composer: 'Composer', songwriter: 'Songwriter', lyricist: 'Lyricist', 'recording-artist': 'Recording Artist', performer: 'Performer',
  'music-producer': 'Music Producer', conductor: 'Conductor', arranger: 'Arranger', 'music-director': 'Music Director',
};
export const wikidataLink = (id: string): string => `https://www.wikidata.org/wiki/${id}`;

let loaded: MusicCatalog | null = null;
let loading: Promise<MusicCatalog> | null = null;
/** Publish a catalog (the loader, and tests). */
export function applyMusicCatalog(data: unknown): MusicCatalog {
  const c = data as MusicCatalog;
  if (c?.version !== 1 || !Array.isArray(c.people) || !Array.isArray(c.recordings)) throw new Error("The music catalog couldn't be read.");
  loaded = c;
  return c;
}
export const musicCatalog = (): MusicCatalog | null => loaded;
/** Fetched when the Music page opens, not at startup: it is most of a megabyte. A failed load can be tried again. */
export function loadMusicCatalog(): Promise<MusicCatalog> {
  if (loaded) return Promise.resolve(loaded);
  loading ??= fetch(musicUrl).then((r) => r.json()).then(applyMusicCatalog).catch((e) => { loading = null; throw e; });
  return loading;
}

const fold = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** People and recordings whose name or title has the words searched for, people with the role first. */
export function searchMusic(c: MusicCatalog, query: string, role: MusicRole | 'any' = 'any', limit = 20): { people: MusicPerson[]; recordings: Recording[] } {
  const words = fold(query).split(/\s+/).filter(Boolean);
  const has = (t: string) => words.every((w) => fold(t).includes(w));
  const people = c.people.filter((p) => (role === 'any' || p.roles?.includes(role)) && (!words.length || has(p.name))).slice(0, limit);
  const named = new Set(c.people.filter((p) => words.length && has(p.name)).map((p) => p.id));
  const recordings = role !== 'any' && role !== 'recording-artist' ? [] : c.recordings.filter((r) => words.length && (has(r.title) || r.performers.some((x) => named.has(x)))).slice(0, limit);
  return { people, recordings };
}
export const performerNames = (c: MusicCatalog, r: Recording): string[] => r.performers.map((id) => c.people.find((p) => p.id === id)?.name ?? id);

// ---------------- A recording, licensed into a project ----------------

/**
 * Add a real recording to a project as a licensed song: its writers as recorded (music from its composers, words from
 * its lyricists; where Wikidata records neither, its performers are named as its writers, and the song says so), its
 * performers, and the record it came from. Its licence is then asked for on the Music page like any licensed song.
 */
export function licenseRecording(state: GameState, p: Project, c: MusicCatalog, r: Recording): Song {
  const performers = performerNames(c, r);
  const writers = new Map<string, { name: string; music: boolean; lyrics: boolean }>();
  for (const x of r.composers ?? []) writers.set(x.id, { name: x.name, music: true, lyrics: writers.get(x.id)?.lyrics ?? false });
  for (const x of r.lyricists ?? []) writers.set(x.id, { name: x.name, music: writers.get(x.id)?.music ?? false, lyrics: true });
  const recorded = writers.size > 0;
  if (!recorded) for (const name of performers) writers.set(name, { name, music: true, lyrics: true });
  const song = createSong(state, p, { title: r.title, source: 'licensed', holder: `The rights holders of ${performers.join(' and ')}'s recording`, writers: [...writers.values()] });
  song.performers = performers.map((name) => ({ who: null, name }));
  song.recording = { id: r.id, performers, ...(r.date ? { date: r.date } : {}), ...(r.seconds ? { seconds: r.seconds } : {}), writersRecorded: recorded, retrieved: c.retrieved };
  return song;
}

// ---------------- A composer, considered under the shared identity ----------------

/**
 * A composer's record as the film catalog's would read (guests.ts RecordedPerson), from the scores Wikidata credits them
 * with: one credit a film, the first and last dated. Null for someone with no recorded TMDB ID, who has no shared
 * identity to join, or no recorded score.
 */
export function composerRecord(m: MusicPerson): RecordedPerson | null {
  if (!m.tmdb || !m.scores?.films || m.kind !== 'person') return null;
  const credits = Array.from({ length: m.scores.films }, (_, i) => ({
    kind: 'crew', role: 'Original Music Composer', department: 'Sound',
    date: i === 0 && m.scores!.first ? `${m.scores!.first}-01-01` : i === 1 && m.scores!.last ? `${m.scores!.last}-01-01` : null,
  }));
  return { id: m.tmdb, name: m.name, details: { birthday: m.born ?? null, deathday: m.died ?? null }, credits };
}

/** Bring a composer into the save: the film catalog's identity if they are already here, the music catalog's record if not. */
export function considerComposer(state: GameState, c: MusicCatalog, m: MusicPerson): RealPerson {
  const record = composerRecord(m);
  if (!record) throw new Error(`${m.name} has no recorded film score with a TMDB ID to join, so can't be approached here.`);
  return considerPerson(state, record, c.retrieved, { cc0: true });
}
