// The Music tab's brief, each field changed from what the project proposes (cues.ts proposeBrief) before it is taken:
// what music the film has, the score's sound, how much of it is scored, and whether the composer's themes stand without
// the player's review. The default short is proposed a synth score (a micro budget), its themes reviewed each day.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import type { MusicBrief } from '../../../src/engine/cues';
import { applyBrief, editCue, proposeBrief } from '../../../src/engine/cues';
import { syncMusicTasks } from '../../../src/engine/song-actions';
import { measure, reviewThemes, takeBrief } from './score';
import { feature } from './script';

const M = (label: string, n = 1) => `field:MusicTab.tsx#"${label}"#${n}`;
/** The proposed brief with `patch`, taken before the money is raised. */
const brief = (patch: Partial<MusicBrief>) => (s: GameState, p: Project) => { if (p.music && !p.music.brief) { applyBrief(s, p, { ...proposeBrief(p, s.now), ...patch }); syncMusicTasks(p); } };
const minutes = (_s: GameState, projects: Project[]) => ({
  ...measure(_s, projects),
  highUnderTalk: projects.reduce((a, p) => a + (p.music?.cues ?? []).filter((c) => c.source === 'score' && c.underDialogue && c.intensity === 3).length, 0),
  scoredSeconds: projects.reduce((a, p) => a + (p.music?.cues ?? []).filter((c) => c.source === 'score').reduce((b, c) => b + (c.to - c.from) * (p.scenes.find((x) => x.id === c.sceneId)?.estMinutes ?? 0) * 60, 0), 0),
});
const REVIEWED = { daily: reviewThemes(0) };
/** The feature (script.ts feature) with an exchange in every scene, so its cues play under dialogue. */
const talking = (s: GameState, year: number): Project => {
  const p = feature()(s, year);
  const [a, b] = p.characters;
  for (const sc of p.scenes) sc.dialogue = [{ id: `${sc.id}-1`, characterId: a.id, text: 'You came.', language: 'en' }, ...(sc.participants.includes(b.id) ? [{ id: `${sc.id}-2`, characterId: b.id, text: 'I said I would.', language: 'en' }] : [])];
  return p;
};
/** The proposed brief taken, then every score cue under dialogue set to `level`. */
const underTalk = (level: 1 | 2 | 3) => (s: GameState, p: Project) => { takeBrief(s, p); for (const c of (p.music?.cues ?? []).filter((x) => x.source === 'score' && x.underDialogue)) editCue(p, c.id, { intensity: level }); };

export const PROBES: Probe[] = [
  { id: 'music-silence', features: [M('What Music It Has')], decision: 'Give the short no score, only what is heard in its scenes', reads: ['src/engine/cues.ts#applyBrief', 'src/engine/cues.ts#proposeCues'],
    base: { decide: takeBrief, ...REVIEWED }, variant: { decide: brief({ approach: 'silence' }), ...REVIEWED }, measure: minutes, bites: ['cues'], downstream: ['spent', 'daysToDeliver', 'quality.music'] },
  { id: 'score-sound-chamber', features: [M('The Score\'s Sound')], decision: 'Have the short scored for a chamber ensemble rather than the synth score proposed', reads: ['src/engine/cues.ts#applyBrief', 'src/engine/craft.ts#scoreSessions'],
    base: { decide: takeBrief, ...REVIEWED }, variant: { decide: brief({ style: 'chamber' }), ...REVIEWED }, measure: minutes, bites: ['chamber'], downstream: ['spent', 'daysToDeliver'] },
  // On the short, more scored minutes are a composer's day or so (4 careers: nothing measurable after). On the feature
  // scored by an ensemble they are also the players' sessions, one for every twenty minutes (craft.ts SCORES).
  { id: 'score-density', features: [M('How Much Of It Is Scored')], decision: 'Score nine tenths of the feature for a chamber ensemble rather than the share proposed', reads: ['src/engine/cues.ts#proposeCues', 'src/engine/cues.ts#scoreMinutes', 'src/engine/craft.ts#scoreSessions'],
    base: { project: feature(), decide: brief({ style: 'chamber' }), ...REVIEWED }, variant: { project: feature(), decide: brief({ style: 'chamber', density: 0.9 }), ...REVIEWED }, measure: minutes, bites: ['scoredSeconds'], downstream: ['spent', 'daysToDeliver', 'quality.music'] },
  // Without a review each day, themes wait for the player (approve-themes): standing as written, composition goes on.
  { id: 'themes-stand', features: [M('Let The Composer\'s Themes Stand Without My Review', 2)], decision: 'Let the composer\'s themes stand without reviewing them, rather than leave them waiting', reads: ['src/engine/cues.ts#onThemesDone', 'src/engine/cues.ts#themesGate'],
    base: { decide: takeBrief }, variant: { decide: brief({ delegateReview: true }) }, measure: minutes, bites: ['themesApproved'], downstream: ['delivered', 'released'] },
  // A loud cue under dialogue fights it (cues.ts judgeScore: a penalty for each, up to a limit).
  { id: 'cue-loud', features: ['field:MusicTab.tsx#{`Intensity Of ${c.code}`}#1'], decision: 'Turn every score cue under dialogue up to high', reads: ['src/engine/cues.ts#editCue', 'src/engine/cues.ts#judgeScore'],
    base: { project: talking, decide: underTalk(2), ...REVIEWED }, variant: { project: talking, decide: underTalk(3), ...REVIEWED }, measure: minutes, bites: ['highUnderTalk'], downstream: ['quality.music', 'reception'] },
];
