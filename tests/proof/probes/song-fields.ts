// A song's own fields (WorkViews.tsx): where a song made for the default short comes from and who writes its lyrics;
// how a licensed track plays in the feature and for how long, licensed for every medium worldwide for ten years. On the
// micro-budget short a licence is a few hundred dollars, lost among the rest (November 15, 2026, at four careers).
import type { Probe } from '../probe';
import type { GameState, Project, SongUse } from '../../../src/engine/types';
import { attachSong, createSong } from '../../../src/engine/song-actions';
import { approvedScenes } from '../../../src/engine/projects';
import { agreeLicence, requestLicence } from '../../../src/engine/music';
import { feature } from './script';

const W = (label: string) => `field:WorkViews.tsx#"${label}"#1`;
/** After the script is approved: a song made for the short, `source` and `lyrics` as given, playing over its last scene. */
const song = (source: 'write' | 'commission', lyrics: 'with-music' | 'commission' = 'with-music') => (s: GameState, p: Project) => {
  if (!p.music) return;
  const x = createSong(s, p, { title: 'Harbour Song', source, lyrics });
  attachSong(p, x.id, approvedScenes(p).at(-1)!.id, 'background', 2);
};
/** Before the shoot: the licensed track (music.ts useTrack) in the feature's first scene, as `placement`, for `minutes`. */
const track = (placement: SongUse['placement'], minutes: number) => (s: GameState, p: Project) => {
  if (!p.music) return;
  const x = createSong(s, p, { title: 'Harbour Lights', source: 'licensed', holder: 'A Record Label', writers: [{ name: 'A Songwriter', music: true, lyrics: true }] });
  attachSong(p, x.id, approvedScenes(p)[0].id, placement, minutes);
};
type Scope = Parameters<typeof requestLicence>[3];
const EVERYWHERE: Scope = { territories: 'worldwide', media: ['theatrical', 'streaming', 'broadcast', 'digital', 'festival'], years: 10 };
/** Each day: its holders asked once for `scope` (every medium, worldwide, for ten years unless said), and the quote agreed. */
const licensedFor = (scope: Scope = EVERYWHERE) => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.music)) {
    const song = (p.songs ?? []).find((x) => x.title === 'Harbour Lights');
    if (!song) continue;
    const ls = p.music!.licences.filter((l) => l.songId === song.id);
    if (!ls.length) { try { requestLicence(s, p, song.id, scope); } catch { /* not now */ } continue; }
    for (const l of ls.filter((x) => x.status === 'quoted' || x.status === 'countered')) try { agreeLicence(s, p, l.id); } catch { /* not now */ }
  }
};
const licensedEverywhere = licensedFor();
/** The feature with the licensed track as `placement` for `minutes`, licensed everywhere. */
const FEATURE = (placement: SongUse['placement'], minutes: number) => ({ project: feature(), decide: track(placement, minutes), daily: licensedEverywhere });
/** What the holders of each song quoted, composition and recording together. */
const fees = (_s: GameState, projects: Project[]) => ({ licenceFees: projects.reduce((a, p) => a + (p.music?.licences ?? []).reduce((b, l) => b + (l.composition.fee ?? 0) + (l.recording.fee ?? 0), 0), 0) });
const CREW = { bites: ['hired'], downstream: ['spent', 'ownIn'] };

export const PROBES: Probe[] = [
  // Commissioned, a songwriter is hired to write it (songs.ts songTasks); written by you, you do.
  { id: 'song-commissioned', features: [W('Where It Comes From')], decision: 'Commission a songwriter for the short\'s song rather than write it yourself', reads: ['src/engine/songs.ts#songTasks'],
    base: { decide: song('write') }, variant: { decide: song('commission') }, ...CREW },
  { id: 'song-lyricist', features: [W('Lyrics')], decision: 'Commission a lyricist for the song you write the music for, rather than write both', reads: ['src/engine/songs.ts#songTasks'],
    base: { decide: song('write') }, variant: { decide: song('write', 'commission') }, bites: ['hired'], downstream: ['spent', 'daysToDeliver'] },
  // A licensed track's holders price it by how prominently and how long it plays (music.ts holderFee): over the opening
  // titles it is half as much again as in the background, and each minute it plays adds a quarter of the base fee, up to three times it. (Placement and
  // minutes also decide the Canadian Screen Awards' and the Emmys' song rules, which these careers don't reach.)
  { id: 'song-opening-titles', features: [W('How It Plays')], decision: 'Play the licensed track over the feature\'s opening titles rather than in the background', reads: ['src/engine/music.ts#holderFee'],
    base: FEATURE('background', 2), variant: FEATURE('opening-titles', 2), measure: fees, bites: ['licenceFees'], downstream: ['spent', 'money'] },
  { id: 'song-minutes', features: [W('Minutes It Plays')], decision: 'Play the licensed track for ten minutes of the feature\'s first scene rather than one', reads: ['src/engine/music.ts#holderFee'],
    base: FEATURE('background', 1), variant: FEATURE('background', 10), measure: fees, bites: ['licenceFees'], downstream: ['spent', 'ownIn'] },
  // The licence's scope prices it (music.ts holderFee): the whole world three times one country, each medium more.
  { id: 'licence-world', features: ['field:MusicTab.tsx#"The Whole World"#1'], decision: 'License the track for the whole world rather than Britain alone', reads: ['src/engine/music.ts#holderFee'],
    base: { project: feature(), decide: track('background', 2), daily: licensedFor({ ...EVERYWHERE, territories: ['GB'] }) }, variant: { project: feature(), decide: track('background', 2), daily: licensedFor() }, measure: fees, bites: ['licenceFees'], downstream: ['spent', 'money'] },
  { id: 'licence-countries', features: ['field:MusicTab.tsx#"Countries, By Two-Letter Code"#1'], decision: 'License the track for Britain, the United States, France and Germany rather than Britain alone', reads: ['src/engine/music.ts#holderFee'],
    base: { project: feature(), decide: track('background', 2), daily: licensedFor({ ...EVERYWHERE, territories: ['GB'] }) }, variant: { project: feature(), decide: track('background', 2), daily: licensedFor({ ...EVERYWHERE, territories: ['GB', 'US', 'FR', 'DE'] }) }, measure: fees, bites: ['licenceFees'], downstream: ['spent', 'money'] },
  { id: 'licence-media', features: ['field:MusicTab.tsx#{LICENCE_MEDIUM_LABELS[m]}#1'], decision: 'License the track for every medium rather than digital sale alone', reads: ['src/engine/music.ts#holderFee'],
    base: { project: feature(), decide: track('background', 2), daily: licensedFor({ ...EVERYWHERE, media: ['digital'] }) }, variant: { project: feature(), decide: track('background', 2), daily: licensedFor() }, measure: fees, bites: ['licenceFees'], downstream: ['spent', 'money'] },
];
