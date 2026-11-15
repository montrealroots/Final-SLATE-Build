// The Music tab's brief, each field changed from what the project proposes (cues.ts proposeBrief) before it is taken:
// what music the film has, the score's sound, how much of it is scored, and whether the composer's themes stand without
// the player's review. The default short is proposed a synth score (a micro budget), its themes reviewed each day.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import type { MusicBrief } from '../../../src/engine/cues';
import { applyBrief, proposeBrief } from '../../../src/engine/cues';
import { syncMusicTasks } from '../../../src/engine/song-actions';
import { measure, reviewThemes, takeBrief } from './score';

const M = (label: string, n = 1) => `field:MusicTab.tsx#"${label}"#${n}`;
/** The proposed brief with `patch`, taken before the money is raised. */
const brief = (patch: Partial<MusicBrief>) => (s: GameState, p: Project) => { if (p.music && !p.music.brief) { applyBrief(s, p, { ...proposeBrief(p, s.now), ...patch }); syncMusicTasks(p); } };
const minutes = (_s: GameState, projects: Project[]) => ({
  ...measure(_s, projects),
  scoredSeconds: projects.reduce((a, p) => a + (p.music?.cues ?? []).filter((c) => c.source === 'score').reduce((b, c) => b + (c.to - c.from) * (p.scenes.find((x) => x.id === c.sceneId)?.estMinutes ?? 0) * 60, 0), 0),
});
const REVIEWED = { daily: reviewThemes(0) };

export const PROBES: Probe[] = [
  { id: 'music-silence', features: [M('What Music It Has')], decision: 'Give the short no score, only what is heard in its scenes', reads: ['src/engine/cues.ts#applyBrief', 'src/engine/cues.ts#proposeCues'],
    base: { decide: takeBrief, ...REVIEWED }, variant: { decide: brief({ approach: 'silence' }), ...REVIEWED }, measure: minutes, bites: ['cues'], downstream: ['spent', 'daysToDeliver', 'quality.music'] },
  { id: 'score-sound-chamber', features: [M('The Score\'s Sound')], decision: 'Have the short scored for a chamber ensemble rather than the synth score proposed', reads: ['src/engine/cues.ts#applyBrief', 'src/engine/craft.ts#scoreSessions'],
    base: { decide: takeBrief, ...REVIEWED }, variant: { decide: brief({ style: 'chamber' }), ...REVIEWED }, measure: minutes, bites: ['chamber'], downstream: ['spent', 'daysToDeliver'] },
  { id: 'score-density', features: [M('How Much Of It Is Scored')], decision: 'Score nine tenths of the short rather than the share proposed', reads: ['src/engine/cues.ts#proposeCues', 'src/engine/cues.ts#scoreMinutes'],
    base: { decide: takeBrief, ...REVIEWED }, variant: { decide: brief({ density: 0.9 }), ...REVIEWED }, measure: minutes, bites: ['scoredSeconds'], downstream: ['spent', 'daysToDeliver', 'quality.music'] },
  // Without a review each day, themes wait for the player (approve-themes): standing as written, composition goes on.
  { id: 'themes-stand', features: [M('Let The Composer\'s Themes Stand Without My Review', 2)], decision: 'Let the composer\'s themes stand without reviewing them, rather than leave them waiting', reads: ['src/engine/cues.ts#onThemesDone', 'src/engine/cues.ts#themesGate'],
    base: { decide: takeBrief }, variant: { decide: brief({ delegateReview: true }) }, measure: minutes, bites: ['themesApproved'], downstream: ['delivered', 'released'] },
];
