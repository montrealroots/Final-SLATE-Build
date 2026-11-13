// A project's music brief and cue plan (the v4 package, 03 "Project-specific music brief"; ledger V4-023). Built November
// 12, 2026. Until then the composer scored the whole running time, a quarter-day a minute, whatever the film was.
//
// The brief is proposed from the project itself (since November 13, 2026: its tone and intent, period, pace, action, cast,
// songs and budget; until then its genre chose the style), and says why for each. Silence is a brief too. The plan places cues on scenes: the
// first and the last, then the ones that most want music (no dialogue, a turn, action, the climb to the end; until November
// 13, 2026 night and exteriors counted), as many as the brief's density asks; each song the cut uses is a cue of its own. A cue is a share of its scene, so its length follows the cut. What
// the plan changes: the composer's work is the minutes of scored cues, not the running time; a silent brief has no score
// work and needs no composer; cues played under dialogue add to the mix. Once a score is written, a scene whose length
// changes needs its cues conformed: a task for those cues alone, not the whole score again.
import { approvedScenes } from './projects';
import { SCORES, type Score } from './craft';
import { newId } from './state';
import { songsOf } from './songs';
import type { GameState, Project, Scene } from './types';

export type MusicApproach = 'score' | 'songs' | 'mixed' | 'silence';
export type CuePurpose = 'opening' | 'tension' | 'emotion' | 'transition' | 'climax' | 'ending' | 'source';
export interface MusicBrief { approach: MusicApproach; style: Score; density: number; why: string[]; at: number; /** The composer's themes stand as written, without waiting for you. */ delegateReview?: boolean }
export interface Cue {
  id: string;
  code: string;
  sceneId: string;
  episode: number;
  /** Where in its scene it starts and ends, as shares of the scene: its seconds follow the cut. */
  from: number;
  to: number;
  purpose: CuePurpose;
  source: 'score' | 'song';
  songId?: string;
  layer: 'foreground' | 'background' | 'source';
  intensity: 1 | 2 | 3;
  underDialogue: boolean;
  motif: string | null;
  /** The scene's minutes when its score was written; set when the composer finishes, and when cues are conformed. */
  timedTo?: number;
  /** Changed by the player: a new proposal leaves it alone. */
  edited?: boolean;
}

export const APPROACH_LABELS: Record<MusicApproach, string> = { score: 'A Score', songs: 'Songs Only', mixed: 'Score And Songs', silence: 'Silence' };
export const PURPOSE_LABELS: Record<CuePurpose, string> = { opening: 'Opening', tension: 'Tension', emotion: 'Feeling', transition: 'Transition', climax: 'Climax', ending: 'Ending', source: 'Heard In The Scene' };
/** Game calibration: the share of scenes a brief scores, and how dialogue and pace move it. */
export const BASE_DENSITY = 0.5;
export const CONFORM_DAYS_PER_CUE = 0.25;
export const MIX_DAYS_UNDER_DIALOGUE = 0.1;

const linesPerMinute = (ss: Scene[]): number => ss.reduce((a, s) => a + s.dialogue.length, 0) / Math.max(1, ss.reduce((a, s) => a + s.estMinutes, 0));

// What the player said they want, in their words: the tone and the intended experience (the Story panel).
const INTIMATE = /\b(quiet|intimate|tender|warm|melanchol\w*|gentle|spare|restrained|small|delicate|wistful|sad|grief|lonely|bittersweet)\b/i;
const DRIVING = /\b(tense|taut|relentless|propulsive|frantic|kinetic|pulse|pulsing|driving|thrilling|breathless|urgent|brutal|explosive)\b/i;
const COLD = /\b(cold|clinical|dreamy|dreamlike|eerie|uncanny|alien|neon|hypnotic|electronic|synthetic|detached|futuristic)\b/i;
const SILENT = /\b(silence|silent|no music|unscored|without music|austere|observational)\b/i;
const DANGER = /\b(chase|chases|fight|fights|attack|attacks|escape|escapes|threat|hunt|hunts|danger|kill|kills|flee|flees|storm|battle)\b/i;
const intentOf = (p: Project) => `${p.axes.tone ?? ''} ${p.story?.intendedExperience ?? ''}`.trim();
const quoted = (t: string) => `"${t.length > 60 ? `${t.slice(0, 57)}...` : t}"`;
/** Which of the player's own words asked for it, quoted: "Its tone, ..." or "Its intended experience, ...". */
const said = (p: Project, re: RegExp): string => (re.test(p.axes.tone ?? '') ? `Its tone, ${quoted(p.axes.tone)}` : `Its intended experience, ${quoted(p.story?.intendedExperience ?? '')}`);
const action = (s: Scene) => !!s.stunts || s.vehicles.length > 0 || s.crowd >= 20 || DANGER.test(`${s.objective} ${s.action}`);

/**
 * The brief the project suggests, and why: the player can take it, change it or choose silence. From November 13, 2026
 * (the owner's v5 brief, 4) it reads the project, not its genre: the tone and intended experience in the player's words,
 * the period it is set in, how much its scenes talk and how fast they go, how much of it is action, the size of its cast,
 * its songs and its budget. Until then the genre chose the style (horror was percussion, fantasy electronic) and every
 * night scene was tension music. A style nothing points to is left to the composer; silence is proposed when the intent
 * asks for it, and stays a choice whatever is proposed.
 */
export function proposeBrief(p: Project, now: number): MusicBrief {
  const ss = approvedScenes(p).length ? approvedScenes(p) : p.scenes;
  const why: string[] = [];
  const intent = intentOf(p);
  const songs = songsOf(p).filter((s) => s.uses.length).length;
  let approach: MusicApproach = 'score';
  if (SILENT.test(intent)) { approach = 'silence'; why.push(`${said(p, SILENT)}, asks for no score: silence, with only what is heard in the scenes.`); }
  else if (p.axes.genres.some((g) => /musical/.test(g.id))) { approach = 'mixed'; why.push('A musical: its songs carry it, with a score between them.'); }
  else if (songs) { approach = 'mixed'; why.push(`It uses ${songs} ${songs === 1 ? 'song' : 'songs'} already, so a score sits beside ${songs === 1 ? 'it' : 'them'}.`); }
  else why.push('A score, written for this project.');
  // Each style gathers the evidence for it; the most wins, and none at all leaves it to the composer.
  const lpm = linesPerMinute(ss);
  const avg = ss.length ? ss.reduce((a, s) => a + s.estMinutes, 0) / ss.length : 0;
  const busy = ss.filter(action).length;
  const principals = p.characters.filter((c) => c.roleSize === 'lead' || c.roleSize === 'supporting').length;
  const evidence: Record<Exclude<Score, 'unset'>, { n: number; why: string[] }> = { chamber: { n: 0, why: [] }, percussive: { n: 0, why: [] }, synth: { n: 0, why: [] } };
  const add = (k: keyof typeof evidence, n: number, w: string) => { evidence[k].n += n; evidence[k].why.push(w); };
  if (INTIMATE.test(intent)) add('chamber', 2, `${said(p, INTIMATE)}, wants a few players close to the characters.`);
  if (DRIVING.test(intent)) add('percussive', 2, `${said(p, DRIVING)}, wants drive: percussion timed to the cut.`);
  if (COLD.test(intent)) add('synth', 2, `${said(p, COLD)}, suits an electronic score.`);
  if (p.axes.storyYear !== undefined && p.axes.storyYear < 1960) add('chamber', 2, `Set in ${p.axes.storyYear}: players rather than machines suit the period, though an anachronism is yours to choose.`);
  if (p.axes.storyYear !== undefined && p.axes.storyYear > new Date(now || Date.now()).getUTCFullYear() + 5) add('synth', 1, `Set in ${p.axes.storyYear}, ahead of now: an electronic score can sound like its time.`);
  if (lpm > 2) add('chamber', 1, `Its scenes talk a lot (${lpm.toFixed(1)} lines a minute): a small ensemble sits under dialogue without crowding it.`);
  if (avg && avg < 2.5) add('percussive', 1, 'Its scenes are short and quick: rhythm carries the cuts.');
  if (ss.length && busy / ss.length >= 0.25) add('percussive', 1, `${busy} of its ${ss.length} scenes are action: chases, fights, stunts or crowds.`);
  if (principals > 0 && principals <= 3) add('chamber', 1, `A small cast of ${principals}: a theme for each of them, for a few players.`);
  if (p.funding.scenarioId === 'micro') add('synth', 2, 'A micro budget: an electronic score needs no players or sessions.');
  const best = (Object.keys(evidence) as (keyof typeof evidence)[]).sort((a, b) => evidence[b].n - evidence[a].n)[0];
  let style: Score = 'unset';
  if (evidence[best].n > 0) { style = best; why.push(...evidence[best].why); }
  else if (approach !== 'silence') why.push('Nothing in its tone, period, pace or budget points one way: the style is left to the composer, whose themes you hear before anything is recorded.');
  let density = BASE_DENSITY;
  if (lpm > 2) { density -= 0.15; why.push('Music stays out from under most of its talk.'); }
  if (avg && avg < 2.5) { density += 0.15; why.push('More of its short scenes carry music, as transitions.'); }
  if (INTIMATE.test(intent)) { density -= 0.1; why.push('A quiet project: music where it matters, and silence as much as music elsewhere.'); }
  return { approach, style, density: Math.round(Math.max(0.2, Math.min(0.9, density)) * 100) / 100, why, at: now };
}

/** Take a brief: its style becomes the score's, and the cue plan is proposed from it, keeping the cues the player changed. */
export function applyBrief(state: GameState, p: Project, brief: MusicBrief): void {
  if (p.delivered) throw new Error('This project has been delivered.');
  if (!p.music) throw new Error('This project was made before music plans.');
  p.music.brief = { ...brief, why: [...brief.why] };
  if (brief.approach === 'score' || brief.approach === 'mixed') p.axes.score = brief.style;
  p.music.cues = proposeCues(state, p);
}

/**
 * What a cue does in its scene, from where the scene falls in the story and what happens in it: the first opens, the last
 * ends, the last quarter climbs, action is tension, a scene where the act turns is a transition, and talk between people
 * is feeling. A night scene is not tension for being at night (until November 13, 2026 it was).
 */
function purposeOf(i: number, n: number, s: Scene, turns: boolean): CuePurpose {
  if (i === 0) return 'opening';
  if (i === n - 1) return 'ending';
  if (i >= Math.floor(n * 0.75)) return 'climax';
  if (action(s)) return 'tension';
  if (turns) return 'transition';
  return s.dialogue.length ? 'emotion' : 'transition';
}

/** The scene's motif: the theme of the pair a relationship ties, or of the principal who speaks most. */
function motifOf(p: Project, s: Scene, purpose: CuePurpose): string | null {
  if (purpose === 'opening' || purpose === 'ending') return 'Main Theme';
  const here = new Set(s.participants);
  const name = (id: string) => (p.characters.find((c) => c.id === id)?.name ?? '').split(' ')[0];
  const pair = (p.relationships ?? []).find((r) => here.has(r.a) && here.has(r.b));
  if (pair && name(pair.a) && name(pair.b)) return `${name(pair.a)} And ${name(pair.b)}`;
  const principal = p.characters.filter((c) => here.has(c.id) && (c.roleSize === 'lead' || c.roleSize === 'supporting'))
    .sort((a, b) => s.dialogue.filter((l) => l.characterId === b.id).length - s.dialogue.filter((l) => l.characterId === a.id).length)[0];
  return principal ? `${name(principal.id)}'s Theme` : null;
}

/**
 * The cues the brief places, scene by scene; the player's own changes kept. A scene wants music for what it does: the
 * first and the last, a scene with no words, one where the act turns, action, the climb to the end. One that talks a
 * lot, or where a song is performed, wants less. Intensity follows the story's progress, and stays down under dialogue.
 */
export function proposeCues(state: GameState, p: Project): Cue[] {
  const brief = p.music?.brief;
  const scenes = approvedScenes(p).length ? approvedScenes(p) : p.scenes;
  const kept = (p.music?.cues ?? []).filter((c) => c.edited && scenes.some((s) => s.id === c.sceneId));
  const out: Cue[] = [...kept];
  if (!brief || brief.approach === 'silence') return out.filter((c) => c.source === 'song');
  const scored = brief.approach !== 'songs';
  const n = scenes.length;
  const turns = (i: number) => i > 0 && !!scenes[i].act && scenes[i].act !== scenes[i - 1].act;
  const performed = new Set(songsOf(p).flatMap((x) => x.uses.filter((u) => u.placement === 'performed').map((u) => u.sceneId)));
  const want = (s: Scene, i: number) => (i === 0 || i === n - 1 ? 10 : 0) + (s.dialogue.length ? 0 : 3) + (turns(i) ? 2 : 0) + (action(s) ? 2 : 0) + (i >= n * 0.75 ? 2 : 0)
    - (s.dialogue.length / Math.max(0.5, s.estMinutes) > 4 ? 2 : 0) - (performed.has(s.id) ? 5 : 0);
  const chosen = new Set(scored ? scenes.map((s, i) => ({ s, i, w: want(s, i) })).sort((a, b) => b.w - a.w || a.i - b.i).slice(0, Math.max(1, Math.round(n * brief.density))).map((x) => x.s.id) : []);
  const perEpisode = new Map<number, number>();
  const code = (e: number) => { const k = (perEpisode.get(e) ?? 0) + 1; perEpisode.set(e, k); return `${e}M${k}`; };
  scenes.forEach((s, i) => {
    if (kept.some((c) => c.sceneId === s.id && c.source === 'score')) return;
    if (chosen.has(s.id)) {
      const purpose = purposeOf(i, n, s, turns(i));
      const progress = n > 1 ? i / (n - 1) : 0;
      const climb = (purpose === 'climax' ? 3 : progress < 1 / 3 ? 1 : 2) + (purpose === 'tension' ? 1 : 0);
      const intensity = Math.max(1, Math.min(s.dialogue.length ? 2 : 3, climb)) as 1 | 2 | 3;
      out.push({ id: newId(state, 'cue'), code: code(s.episode), sceneId: s.id, episode: s.episode, from: purpose === 'opening' ? 0 : 0.2, to: purpose === 'ending' ? 1 : 0.85, purpose, source: 'score', layer: s.dialogue.length ? 'background' : 'foreground', intensity, underDialogue: s.dialogue.length > 0, motif: motifOf(p, s, purpose) });
    }
    for (const song of songsOf(p)) for (const u of song.uses.filter((x) => x.sceneId === s.id)) {
      out.push({ id: newId(state, 'cue'), code: code(s.episode), sceneId: s.id, episode: s.episode, from: 0, to: u.minutes !== null && s.estMinutes ? Math.min(1, u.minutes / s.estMinutes) : 1, purpose: u.placement === 'performed' ? 'source' : purposeOf(i, n, s, turns(i)), source: 'song', songId: song.id, layer: u.placement === 'performed' ? 'source' : u.placement === 'background' ? 'background' : 'foreground', intensity: 2, underDialogue: s.dialogue.length > 0 && u.placement !== 'end-credits', motif: null });
    }
  });
  return out;
}

/** Change one cue: its source (score, or taken out), its intensity. The player's change is kept through a new proposal. */
export function editCue(p: Project, cueId: string, patch: { intensity?: 1 | 2 | 3; remove?: boolean }): void {
  if (p.delivered) throw new Error('This project has been delivered.');
  const cues = p.music?.cues;
  const c = cues?.find((x) => x.id === cueId);
  if (!c) throw new Error('That cue is no longer in the plan.');
  if (patch.remove) { p.music!.cues = cues!.filter((x) => x.id !== cueId); return; }
  if (patch.intensity) c.intensity = patch.intensity;
  c.edited = true;
}

const sceneOf = (p: Project, id: string) => approvedScenes(p).find((s) => s.id === id);
export const cueSeconds = (p: Project, c: Cue): number => Math.round(((sceneOf(p, c.sceneId)?.estMinutes ?? 0) * 60 * (c.to - c.from)));

/** Minutes of score the episode's cues call for; null for a project with no cue plan (it scores the running time). */
export function scoreMinutes(p: Project, episode: number): number | null {
  const cues = p.music?.cues;
  if (!p.music?.brief || !cues) return null;
  return Math.round(cues.filter((c) => c.source === 'score' && c.episode === episode && sceneOf(p, c.sceneId)).reduce((a, c) => a + cueSeconds(p, c), 0) / 6) / 10;
}

/** Score cues in the episode whose scene has changed length since the score was written: conform work. */
export const cuesToConform = (p: Project, episode: number): Cue[] => (p.music?.cues ?? []).filter((c) => c.source === 'score' && c.episode === episode && c.timedTo !== undefined && sceneOf(p, c.sceneId) && sceneOf(p, c.sceneId)!.estMinutes !== c.timedTo);

/** The score is written (or its cues conformed): each scored cue is now timed to its scene as it is. */
export function timeCues(p: Project, episode: number): void {
  for (const c of p.music?.cues ?? []) if (c.source === 'score' && c.episode === episode) { const s = sceneOf(p, c.sceneId); if (s) c.timedTo = s.estMinutes; }
}

export const scoreStyleLabel = (s: Score): string => SCORES[s].label;

// ---------------- The score's own steps (the v4 package, 03 "Original-score lifecycle"; ledger V4-025.01) ----------------
// With a brief, the composer's work is no longer one task. After the lock they spot the film with you (a day an
// episode), write themes and sketches for the whole score, and wait: you approve them, or give notes and they revise,
// each round days of their work. Composition waits for the approval; a brief can hand the review to the composer, and
// then their themes stand as written. After composition (and any recording sessions) they mix the score and deliver its
// stems; the final mix waits for those. Shares are game calibration.
export const THEMES_SHARE = 0.15;
export const REVISION_SHARE = 0.5;
export const STEMS_DAYS = 0.5;
export interface ThemesState { status: 'awaiting' | 'approved' | 'notes'; rounds: number; notes: string[]; at: number }

/** Whether this project's score goes through its steps: one with a brief that scores something. */
export const scoreSteps = (p: Project): boolean => !!p.music?.brief && (p.music.brief.approach === 'score' || p.music.brief.approach === 'mixed');

/** The themes task and any revision rounds, for the whole score, from the composition days they lead to. */
export function themeTasks(p: Project, compositionDays: number, mk: (kind: string, ref: string, label: string, units: number, deps: string[]) => import('./types').Task): import('./types').Task[] {
  const themes = Math.max(1, compositionDays * THEMES_SHARE);
  const out = [mk('post:themes', 'all', 'Themes And Sketches', themes, ['post:spotting:1'])];
  for (let r = 1; r <= (p.music?.themes?.rounds ?? 0); r++) out.push(mk('post:themes-revision', String(r), `Themes Revised After Your Notes (Round ${r})`, Math.max(0.5, themes * REVISION_SHARE), [r === 1 ? 'post:themes:all' : `post:themes-revision:${r - 1}`]));
  return out;
}

/** The last themes task: the one composition waits for. */
export const lastThemesTask = (p: Project): string => ((p.music?.themes?.rounds ?? 0) > 0 ? `post:themes-revision:${p.music!.themes!.rounds}` : 'post:themes:all');

/** Why composition can't start yet, or null: the themes are waiting for you. */
export function themesGate(p: Project): string | null {
  if (!scoreSteps(p) || p.music?.brief?.delegateReview) return null;
  const th = p.music!.themes;
  if (!th || th.status === 'approved') return null;
  return th.status === 'awaiting' ? 'Waiting for you to approve the themes, or give notes, on the Music page.' : 'The composer is revising the themes after your notes.';
}

/** Themes or a revision finished: they wait for you, or stand if you handed the review to the composer. */
export function onThemesDone(p: Project, now: number): void {
  const prev = p.music!.themes;
  p.music!.themes = { status: p.music!.brief?.delegateReview ? 'approved' : 'awaiting', rounds: prev?.rounds ?? 0, notes: prev?.notes ?? [], at: now };
}

export function approveThemes(p: Project, now: number): void {
  const th = p.music?.themes;
  if (!th || th.status !== 'awaiting') throw new Error('There are no themes waiting for you.');
  p.music!.themes = { ...th, status: 'approved', at: now };
}

/** Notes on the themes: the composer revises them, a round of their days, and they come back to you. */
export function giveThemeNotes(p: Project, note: string, now: number, rebuild: () => void): void {
  const th = p.music?.themes;
  if (!th || th.status !== 'awaiting') throw new Error('There are no themes waiting for you.');
  const n = note.trim();
  if (!n) throw new Error('Write the note first.');
  p.music!.themes = { status: 'notes', rounds: th.rounds + 1, notes: [...th.notes, n.slice(0, 300)], at: now };
  rebuild();
}

// ---------------- How the score is judged (the v4 package, 03; ledger V4-025.02) ----------------
// Until November 13, 2026 the music score was the composer's capability alone (x 0.9 + 5), whatever was written. With a
// brief it also reads what the package names. Execution: the composer's capability, as before. Fit to the approved
// intent: themes you reviewed and gave notes on come closer to it, a round at a time; themes nobody reviewed stand as the
// composer read the brief. Synchronization: a scored cue whose scene changed length and was never conformed plays out
// of time. Dialogue: a loud or foreground cue under talk costs the lines it covers. A project with no brief is judged as
// before; a brief with no score (silence, or songs only) has no score to judge. Name and fame are never read: the
// composer counts by their capability. Weights are game calibration.
export const FIT_PER_ROUND = 2;
export const FIT_ROUNDS_COUNTED = 2;
export const UNREVIEWED_FIT = -3;
export const OUT_OF_SYNC = 3;
export const UNDER_DIALOGUE = { loud: 2, foreground: 1, most: 10 };

export interface ScoreJudgement { score: number; execution: number; fit: number; sync: number; dialogue: number }

/** The score's assessment for the project (or one episode), or null when nothing is scored. */
export function judgeScore(p: Project, composerCapability: number | null, episode?: number): ScoreJudgement | null {
  const execution = (composerCapability ?? 45) * 0.9 + 5;
  const brief = p.music?.brief;
  if (!brief) return { score: execution, execution, fit: 0, sync: 0, dialogue: 0 };
  if (!scoreSteps(p)) return null;
  const th = p.music!.themes;
  const fit = brief.delegateReview ? UNREVIEWED_FIT : th?.status === 'approved' ? FIT_PER_ROUND * Math.min(FIT_ROUNDS_COUNTED, th.rounds) : 0;
  const eps = [...new Set(approvedScenes(p).map((s) => s.episode))].filter((e) => episode === undefined || e === episode);
  const sync = -OUT_OF_SYNC * eps.reduce((a, e) => a + cuesToConform(p, e).length, 0) || 0;
  const talk = (p.music!.cues ?? []).filter((c) => c.source === 'score' && c.underDialogue && (episode === undefined || c.episode === episode) && sceneOf(p, c.sceneId));
  const dialogue = -Math.min(UNDER_DIALOGUE.most, talk.reduce((a, c) => a + (c.intensity === 3 ? UNDER_DIALOGUE.loud : c.layer === 'foreground' ? UNDER_DIALOGUE.foreground : 0), 0)) || 0;
  return { score: execution + fit + sync + dialogue, execution, fit, sync, dialogue };
}
