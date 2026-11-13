// A project's music brief and cue plan (the v4 package, 03 "Project-specific music brief"; ledger V4-023). Built November
// 12, 2026. Until then the composer scored the whole running time, a quarter-day a minute, whatever the film was.
//
// The brief is proposed from the project's genres, the year its story is set, how much its scenes talk, how long they
// run, its songs and its budget, and says why for each. Silence is a brief too. The plan places cues on scenes: the
// first and the last, then the ones that most want music (no dialogue, night, outside), as many as the brief's density
// asks; each song the cut uses is a cue of its own. A cue is a share of its scene, so its length follows the cut. What
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

const genreIds = (p: Project): string[] => p.axes.genres.map((g) => g.id);
const linesPerMinute = (ss: Scene[]): number => ss.reduce((a, s) => a + s.dialogue.length, 0) / Math.max(1, ss.reduce((a, s) => a + s.estMinutes, 0));

/** The brief the project suggests, and why: the player can take it, change it or choose silence. */
export function proposeBrief(p: Project, now: number): MusicBrief {
  const g = genreIds(p);
  const ss = approvedScenes(p).length ? approvedScenes(p) : p.scenes;
  const why: string[] = [];
  const songs = songsOf(p).filter((s) => s.uses.length).length;
  let approach: MusicApproach = 'score';
  if (g.some((x) => /musical/.test(x))) { approach = 'mixed'; why.push('A musical: its songs carry it, with a score between them.'); }
  else if (songs) { approach = 'mixed'; why.push(`It uses ${songs} ${songs === 1 ? 'song' : 'songs'} already, so a score sits beside ${songs === 1 ? 'it' : 'them'}.`); }
  else why.push('A score, written for the film.');
  let style: Score = 'unset';
  if (g.some((x) => /horror|thriller|mystery|crime|action/.test(x))) { style = 'percussive'; why.push('Its genre wants tension timed to the cut: percussion to picture.'); }
  else if (g.some((x) => /romance|drama|family|period|historical/.test(x))) { style = 'chamber'; why.push('Its genre wants feeling: a small ensemble.'); }
  else if (g.some((x) => /science|sci-fi|fantasy|animation/.test(x))) { style = 'synth'; why.push('Its genre suits an electronic score.'); }
  if (p.axes.storyYear !== undefined && p.axes.storyYear < 1960 && style !== 'chamber') { style = 'chamber'; why.push(`Set in ${p.axes.storyYear}: players rather than machines suit the period, though an anachronism is yours to choose.`); }
  if (p.funding.scenarioId === 'micro' && style !== 'synth') { style = 'synth'; why.push('A micro budget: an electronic score needs no players or sessions.'); }
  let density = BASE_DENSITY;
  const lpm = linesPerMinute(ss);
  if (lpm > 2) { density -= 0.15; why.push(`Its scenes talk a lot (${lpm.toFixed(1)} lines a minute): music stays out from under most of them.`); }
  const avg = ss.length ? ss.reduce((a, s) => a + s.estMinutes, 0) / ss.length : 0;
  if (avg && avg < 2.5) { density += 0.15; why.push('Its scenes are short and quick: more of them carry music, as transitions.'); }
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

function purposeOf(i: number, n: number, s: Scene): CuePurpose {
  if (i === 0) return 'opening';
  if (i === n - 1) return 'ending';
  if (i >= Math.floor(n * 0.75) && i < n - 1) return 'climax';
  if (s.heading.time === 'NIGHT') return 'tension';
  return s.dialogue.length ? 'emotion' : 'transition';
}

/** The cues the brief places, scene by scene; the player's own changes kept. */
export function proposeCues(state: GameState, p: Project): Cue[] {
  const brief = p.music?.brief;
  const scenes = approvedScenes(p).length ? approvedScenes(p) : p.scenes;
  const kept = (p.music?.cues ?? []).filter((c) => c.edited && scenes.some((s) => s.id === c.sceneId));
  const out: Cue[] = [...kept];
  if (!brief || brief.approach === 'silence') return out.filter((c) => c.source === 'song');
  const scored = brief.approach !== 'songs';
  const n = scenes.length;
  const want = (s: Scene, i: number) => (i === 0 || i === n - 1 ? 10 : 0) + (s.dialogue.length ? 0 : 3) + (s.heading.time === 'NIGHT' ? 2 : 0) + (s.heading.intExt === 'EXT' ? 1 : 0) + (i >= n * 0.75 ? 2 : 0);
  const chosen = new Set(scored ? scenes.map((s, i) => ({ s, i, w: want(s, i) })).sort((a, b) => b.w - a.w || a.i - b.i).slice(0, Math.max(1, Math.round(n * brief.density))).map((x) => x.s.id) : []);
  const perEpisode = new Map<number, number>();
  const code = (e: number) => { const k = (perEpisode.get(e) ?? 0) + 1; perEpisode.set(e, k); return `${e}M${k}`; };
  scenes.forEach((s, i) => {
    if (kept.some((c) => c.sceneId === s.id && c.source === 'score')) return;
    if (chosen.has(s.id)) {
      const purpose = purposeOf(i, n, s);
      out.push({ id: newId(state, 'cue'), code: code(s.episode), sceneId: s.id, episode: s.episode, from: purpose === 'opening' ? 0 : 0.2, to: purpose === 'ending' ? 1 : 0.85, purpose, source: 'score', layer: s.dialogue.length ? 'background' : 'foreground', intensity: purpose === 'climax' ? 3 : purpose === 'tension' ? 2 : 1, underDialogue: s.dialogue.length > 0, motif: purpose === 'opening' || purpose === 'climax' || purpose === 'ending' ? 'Main Theme' : null });
    }
    for (const song of songsOf(p)) for (const u of song.uses.filter((x) => x.sceneId === s.id)) {
      out.push({ id: newId(state, 'cue'), code: code(s.episode), sceneId: s.id, episode: s.episode, from: 0, to: u.minutes !== null && s.estMinutes ? Math.min(1, u.minutes / s.estMinutes) : 1, purpose: u.placement === 'performed' ? 'source' : purposeOf(i, n, s), source: 'song', songId: song.id, layer: u.placement === 'performed' ? 'source' : u.placement === 'background' ? 'background' : 'foreground', intensity: 2, underDialogue: s.dialogue.length > 0 && u.placement !== 'end-credits', motif: null });
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
