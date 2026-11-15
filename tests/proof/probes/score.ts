// The score (cues.ts): a music brief taken from what the project proposes, the composer's themes approved or given notes,
// and a cue under dialogue turned down. The score's assessment reads each (cues.ts `judgeScore`): its fit to the brief,
// its cues under talk; and the composer's work is the minutes the cue plan scores.
import type { Probe } from '../probe';
import { applyBrief, approveThemes, editCue, giveThemeNotes, proposeBrief } from '../../../src/engine/cues';
import { syncMusicTasks } from '../../../src/engine/song-actions';
import type { GameState, Project } from '../../../src/engine/types';

/** Take the brief the project proposes, as the Music page does, before the money is raised. */
export const takeBrief = (s: GameState, p: Project) => { if (p.music && !p.music.brief) { applyBrief(s, p, proposeBrief(p, s.now)); syncMusicTasks(p); } };
/** Each day: themes awaiting you are approved, after `rounds` rounds of notes. */
export const reviewThemes = (rounds: number) => (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.delivered && x.music?.themes?.status === 'awaiting')) {
    if (p.music!.themes!.rounds < rounds) giveThemeNotes(p, 'Warmer, and less of the strings under the talk.', s.now, () => syncMusicTasks(p));
    else approveThemes(p, s.now);
  }
};
/** Every score cue taken out, before the score is written: the short's plan places two, the opening and the ending.
 *  (Turning a cue under talk down changes nothing: the plan never places one loud or in front under dialogue.) */
const fewerCues = (s: GameState, p: Project) => { takeBrief(s, p); for (const c of (p.music?.cues ?? []).filter((x) => x.source === 'score')) editCue(p, c.id, { remove: true }); };

/** The player's words for what the project wants, written before the brief is taken (the Story panel). */
const words = (tone: string, experience: string) => (s: GameState, p: Project) => { p.axes.tone = tone; p.story.intendedExperience = experience; takeBrief(s, p); };

export const measure = (_s: GameState, projects: Project[]) => ({
  chamber: projects.filter((p) => p.axes.score === 'chamber').length,
  silent: projects.filter((p) => p.music?.brief?.approach === 'silence').length,
  cues: projects.reduce((a, p) => a + (p.music?.cues ?? []).filter((c) => c.source === 'score').length, 0),
  themeRounds: projects.reduce((a, p) => a + (p.music?.themes?.rounds ?? 0), 0),
  themesApproved: projects.filter((p) => p.music?.themes?.status === 'approved').length,
  loudUnderTalk: projects.reduce((a, p) => a + (p.music?.cues ?? []).filter((c) => c.source === 'score' && c.underDialogue && c.intensity > 1).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'music-brief',
    features: ['action:cues.applyBrief'],
    decision: 'Take the music brief the project proposes (its cue plan scored), or leave the composer to score the running time',
    reads: ['src/engine/cues.ts#applyBrief', 'src/engine/cues.ts#judgeScore', 'src/engine/cues.ts#scoreMinutes'],
    base: { daily: reviewThemes(0) },
    variant: { decide: takeBrief, daily: reviewThemes(0) },
    measure,
    bites: ['cues'],
    downstream: ['quality.music', 'spent', 'daysToDeliver', 'overall'],
  },
  {
    id: 'approve-themes',
    features: ['action:cues.approveThemes'],
    decision: 'Approve the composer\'s themes when they are ready, or leave them waiting',
    reads: ['src/engine/cues.ts#approveThemes', 'src/engine/cues.ts#themesGate'],
    base: { decide: takeBrief },
    variant: { decide: takeBrief, daily: reviewThemes(0) },
    measure,
    bites: ['themesApproved'],
    downstream: ['delivered', 'released', 'quality.music'],
  },
  {
    id: 'theme-notes',
    features: ['action:cues.giveThemeNotes'],
    decision: 'Give the composer two rounds of notes on the themes before approving them',
    reads: ['src/engine/cues.ts#giveThemeNotes', 'src/engine/cues.ts#judgeScore'],
    base: { decide: takeBrief, daily: reviewThemes(0) },
    variant: { decide: takeBrief, daily: reviewThemes(2) },
    measure,
    bites: ['themeRounds'],
    downstream: ['quality.music', 'spent', 'daysToDeliver'],
  },
  {
    id: 'edit-cue',
    features: ['action:cues.editCue'],
    decision: 'Take every score cue out of the plan',
    reads: ['src/engine/cues.ts#editCue', 'src/engine/cues.ts#scoreMinutes'],
    base: { decide: takeBrief, daily: reviewThemes(0) },
    variant: { decide: fewerCues, daily: reviewThemes(0) },
    measure,
    bites: ['cues'],
    downstream: ['spent', 'daysToDeliver', 'quality.music'],
  },
  {
    id: 'tone',
    features: ['field:Projects.tsx#"Tone"#1', 'field:ScriptViews.tsx#"Tone"#1'],
    decision: 'Call the project\'s tone "quiet and tender" rather than "cold and clinical", then take the brief it proposes',
    reads: ['src/engine/cues.ts#proposeBrief', 'src/engine/craft.ts#scoreSessions'],
    base: { decide: words('cold and clinical', ''), daily: reviewThemes(0) },
    variant: { decide: words('quiet and tender', ''), daily: reviewThemes(0) },
    measure,
    bites: ['chamber'],
    downstream: ['spent', 'cues', 'daysToDeliver'],
  },
  {
    id: 'intended-experience',
    features: ['field:ScriptViews.tsx#"Intended Experience"#1'],
    decision: 'Say the intended experience is "observational, without music", then take the brief it proposes',
    reads: ['src/engine/cues.ts#proposeBrief', 'src/engine/finish.ts#assessQuality'],
    base: { decide: words('', 'A test experience.'), daily: reviewThemes(0) },
    variant: { decide: words('', 'Observational, without music.'), daily: reviewThemes(0) },
    measure,
    bites: ['silent', 'cues'],
    downstream: ['spent', 'daysToDeliver', 'quality.music'],
  },
];
