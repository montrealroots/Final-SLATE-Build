// Songs and their licences (song-actions.ts, music.ts): a licensed track used in a scene can't be released until its
// holders have licensed it for that release (music.ts `releaseLicenceRefusal`), so each probe's later measure is
// whether, when and what the film earned on release.
import type { Probe } from '../probe';
import { attachSong, createSong, detachSong, removeSong } from '../../../src/engine/song-actions';
import { agreeLicence, declineQuote, replaceWithLibrary, requestLicence } from '../../../src/engine/music';
import { approvedScenes } from '../../../src/engine/projects';
import type { GameState, Project } from '../../../src/engine/types';

const TRACK = 'Harbour Lights';
/** A licensed recording in the first scene's background, before the shoot: the holders still to be asked. */
export const useTrack = (s: GameState, p: Project) => {
  if (!p.music) return;
  const song = createSong(s, p, { title: TRACK, source: 'licensed', holder: 'A Record Label', writers: [{ name: 'A Songwriter', music: true, lyrics: true }] });
  attachSong(p, song.id, approvedScenes(p)[0].id, 'background');
};
export const track = (p: Project) => (p.songs ?? []).find((x) => x.title === TRACK);
/** Each day: ask the holders once, for digital sale in Britain for 3 years (the career's release), then answer a quote. */
const licensing = (answer: 'agree' | 'decline') => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.music)) {
    const song = track(p);
    if (!song) continue;
    const ls = p.music!.licences.filter((l) => l.songId === song.id);
    if (!ls.length) { requestLicence(s, p, song.id, { territories: ['GB'], media: ['digital'], years: 3 }); continue; }
    for (const l of ls.filter((x) => x.status === 'quoted' || x.status === 'countered')) (answer === 'agree' ? agreeLicence(s, p, l.id) : declineQuote(p, l.id));
  }
};
/** Once the shoot is done, put a library track where the song plays. */
const toLibrary = (s: GameState) => { for (const p of s.projects.filter((x) => !x.delivered && x.music)) { const song = track(p); if (song && !song.library && p.schedule.days.length && !p.schedule.days.some((d) => d.status === 'scheduled')) { try { replaceWithLibrary(s, p, song.id); } catch { /* not yet */ } } } };

const measure = (_s: GameState, projects: Project[]) => ({
  licensed: projects.reduce((a, p) => a + (p.music?.licences ?? []).filter((l) => l.status === 'agreed').length, 0),
  songUses: projects.reduce((a, p) => a + (p.songs ?? []).reduce((b, x) => b + x.uses.length, 0), 0),
  songs: projects.reduce((a, p) => a + (p.songs ?? []).length, 0),
  libraryTracks: projects.reduce((a, p) => a + (p.songs ?? []).filter((x) => x.library).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'license-song',
    features: ['action:music.requestLicence', 'action:music.agreeLicence', 'scheduled:licence-answer'],
    decision: 'License the track used in the first scene, or release with it unlicensed',
    reads: ['src/engine/music.ts#requestLicence', 'src/engine/music.ts#agreeLicence', 'src/engine/music.ts#releaseLicenceRefusal'],
    base: { decide: useTrack },
    variant: { decide: useTrack, daily: licensing('agree') },
    measure,
    bites: ['licensed'],
    downstream: ['released', 'revenue', 'spent'],
  },
  {
    id: 'decline-quote',
    features: ['action:music.declineQuote'],
    decision: 'Decline the holders\' quote for the track',
    reads: ['src/engine/music.ts#declineQuote', 'src/engine/music.ts#releaseLicenceRefusal'],
    base: { decide: useTrack, daily: licensing('agree') },
    variant: { decide: useTrack, daily: licensing('decline') },
    measure,
    bites: ['licensed'],
    downstream: ['released', 'revenue', 'spent'],
  },
  {
    id: 'library-track',
    features: ['action:music.replaceWithLibrary'],
    decision: 'Replace the unlicensed track with library music once the shoot is done',
    reads: ['src/engine/music.ts#replaceWithLibrary', 'src/engine/music.ts#releaseLicenceRefusal'],
    base: { decide: useTrack },
    variant: { decide: useTrack, daily: toLibrary },
    measure,
    bites: ['libraryTracks'],
    downstream: ['released', 'revenue', 'spent'],
  },
  {
    id: 'add-song',
    features: ['action:song-actions.createSong', 'action:song-actions.attachSong'],
    decision: 'Use a licensed track in the first scene (unlicensed), or no track at all',
    reads: ['src/engine/song-actions.ts#createSong', 'src/engine/song-actions.ts#attachSong', 'src/engine/music.ts#releaseLicenceRefusal'],
    variant: { decide: useTrack },
    measure,
    bites: ['songs', 'songUses'],
    downstream: ['released', 'revenue'],
  },
  {
    id: 'detach-song',
    features: ['action:song-actions.detachSong'],
    decision: 'Take the unlicensed track out of its scene before the cut is locked',
    reads: ['src/engine/song-actions.ts#detachSong', 'src/engine/music.ts#releaseLicenceRefusal'],
    base: { decide: useTrack },
    variant: { decide: (s, p) => { useTrack(s, p); const song = track(p); if (song) detachSong(p, song.id, song.uses[0].sceneId); } },
    measure,
    bites: ['songUses'],
    downstream: ['released', 'revenue'],
  },
  {
    id: 'remove-song',
    features: ['action:song-actions.removeSong'],
    decision: 'Remove the unlicensed track from the project (taken out of its scene first, as the game asks)',
    reads: ['src/engine/song-actions.ts#removeSong', 'src/engine/music.ts#releaseLicenceRefusal'],
    base: { decide: (s, p) => { useTrack(s, p); const song = track(p); if (song) detachSong(p, song.id, song.uses[0].sceneId); } },
    variant: { decide: (s, p) => { useTrack(s, p); const song = track(p); if (song) { detachSong(p, song.id, song.uses[0].sceneId); removeSong(p, song.id); } } },
    measure,
    bites: ['songs'],
    downstream: ['spent', 'daysToDeliver', 'quality.music'],
  },
];
