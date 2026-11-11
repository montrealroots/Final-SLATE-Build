// Camera, lighting and sound choices that reach the work (the Creative Depth package, milestone C,
// 02-CREATIVE-LIBRARIES.md "Camera and lighting", "Sound/music"). Until November 11, 2026 a camera treatment was a note
// beyond its coverage and takes, and a sound treatment was a note outright. Each is now a choice with requirements:
// time on the day, crew, a test before the shoot, rented kit, or work in post. None is a quality bonus. A handheld
// camera is not better or worse than a dolly; it resets faster and its takes vary more. The figures are game
// calibration (docs/ASSUMPTIONS.md, "Camera, Light And Sound"), not rental prices or union terms.
import type { Project, Scene } from './types';

// ---------------- How the camera moves, scene by scene ----------------

export type Rig = 'sticks' | 'handheld' | 'dolly' | 'moving' | 'pov';

export interface RigDef {
  label: string;
  hint: string;
  /** A setup's reset time against a tripod's. */
  reset: number;
  /** A take's running time against a tripod's: a long take that fails starts again from the top. */
  run: number;
  /** How widely a take's technical side varies against a tripod's. Wider means more takes with a camera problem, and a better best take when there are many. */
  spread: number;
  /** Crew the rig needs on the day, and why. */
  role?: string;
  why?: string;
  /** Rented kit, for each shoot day with a scene on this rig. */
  dayCost: number;
  /** Rehearsal days for each scene on this rig. */
  rehearsal: number;
}

export const RIGS: Record<Rig, RigDef> = {
  sticks: { label: 'On A Tripod', hint: 'Locked off or panning from one place. The baseline.', reset: 1, run: 1, spread: 1, dayCost: 0, rehearsal: 0 },
  handheld: { label: 'Handheld', hint: 'Resets quickly, and its takes vary more: more of them have a camera problem.', reset: 0.75, run: 1, spread: 1.4, dayCost: 0, rehearsal: 0 },
  dolly: { label: 'On A Dolly', hint: 'Track is laid for each setup, by a key grip. Its takes are steadier.', reset: 1.4, run: 1, spread: 0.85, role: 'key-grip', why: 'Lays the track and moves the dolly for scenes shot on one.', dayCost: 600, rehearsal: 0 },
  moving: { label: 'Long Moving Takes', hint: 'Rehearsed with the cast, on a rented stabiliser. A take that fails starts again from the top.', reset: 1.2, run: 1.5, spread: 1.5, dayCost: 450, rehearsal: 1 / 3 },
  pov: { label: "Through A Character's Eyes", hint: 'Eyelines to the lens are rehearsed and checked on playback.', reset: 1.1, run: 1, spread: 1.2, role: 'video-assist', why: 'Plays takes back to check eyelines for scenes seen through a character\'s eyes.', dayCost: 0, rehearsal: 1 / 4 },
};

/** Time lost on each setup when the crew a rig needs isn't there. */
export const UNCREWED_RESET = 1.3;

/** The rig a scene is shot on. A project from before rigs, or a scene with none chosen, is on a tripod. */
export const rigOf = (p: Project, sceneId: string): Rig => p.shotPlans?.[sceneId]?.rig ?? 'sticks';

const crewed = (p: Project, roleId: string | undefined): boolean => !roleId || p.hires.some((h) => h.status === 'accepted' && h.roleId === roleId);

// ---------------- Light, for the whole project ----------------

export type Light = 'standard' | 'available' | 'contrast' | 'macro';

export interface LightDef {
  label: string;
  hint: string;
  /** A setup's reset time, on interiors and night scenes, where the lighting is. */
  reset: number;
  /** Takes the schedule plans for beyond the rule's own: focus is harder in low light. */
  extraTakes: number;
  /** Whether interiors can be shot without a gaffer. Night exteriors always need one. */
  gafferForInteriors: boolean;
  /** Days of camera tests before the shoot. */
  testDays: number;
  /** The colour grade's days against the usual. */
  grade: number;
  /** Stop-motion frames shot in a day against the usual. */
  frames: number;
}

export const LIGHTS: Record<Light, LightDef> = {
  standard: { label: 'Lit As Usual', hint: 'A lighting package and a gaffer for interiors and nights.', reset: 1, extraTakes: 0, gafferForInteriors: true, testDays: 0, grade: 1, frames: 1 },
  available: { label: 'Practical And Available Light', hint: 'Lamps in the room and what the day gives. Interiors need no gaffer and reset sooner; focus is harder, so a take more is planned for each setup, after a day of camera tests.', reset: 0.8, extraTakes: 1, gafferForInteriors: false, testDays: 1, grade: 1, frames: 1 },
  contrast: { label: 'High Contrast', hint: 'Hard light and deep shadow, shaped setup by setup and matched in the grade. Slower on the day, longer in the grade, after two days of tests.', reset: 1.25, extraTakes: 0, gafferForInteriors: true, testDays: 2, grade: 1.5, frames: 1 },
  macro: { label: 'Macro On Miniatures', hint: 'Close lenses on small sets: two days of lens and depth tests, and fewer frames in a day.', reset: 1, extraTakes: 0, gafferForInteriors: true, testDays: 2, grade: 1, frames: 0.9 },
};

export const lightOf = (p: Project): Light => p.axes.light ?? 'standard';
const lit = (s: Scene): boolean => s.heading.intExt !== 'EXT' || s.heading.time === 'NIGHT';

// ---------------- Sound, for the whole project ----------------

export type SoundChoice = 'texture' | 'clarity' | 'sparse' | 'creature' | 'crowd';

export interface SoundDef {
  label: string;
  hint: string;
  /** Crew it needs on set, and why. */
  role?: string;
  why?: string;
  /** A setup's reset time on dialogue scenes. */
  reset: number;
  /** Post tasks' days against the usual: Foley, effects editing, the score, the mix. */
  foley: number;
  effects: number;
  score: number;
  mix: number;
}

export const SOUNDS: Record<SoundChoice, SoundDef> = {
  texture: { label: 'Natural Location Texture', hint: 'The recordist stays to record each place by itself: a wild-track day for every three locations, and less effects editing after.', reset: 1, foley: 1, effects: 0.7, score: 1, mix: 1 },
  clarity: { label: 'Dialogue Clarity', hint: 'A boom operator on every dialogue scene and a moment to quiet the set before each setup. Dialogue recorded this way holds on a day spoiled by weather or noise, where it would otherwise be replaced in post.', role: 'boom-operator', why: 'Booms every dialogue scene, for dialogue recorded clean on set.', reset: 1.05, foley: 1, effects: 1, score: 1, mix: 1 },
  sparse: { label: 'Sparse Soundscape', hint: 'Quiet, with few sounds, each exposed: more Foley and a longer mix, less score.', reset: 1, foley: 1.5, effects: 1, score: 0.6, mix: 1.2 },
  creature: { label: 'Heightened Creature Foley', hint: 'Movement and material recorded for each creature: two Foley days for every one in the script.', reset: 1, foley: 1, effects: 1, score: 1, mix: 1 },
  crowd: { label: 'Layered Crowd Sound', hint: 'A loop group records the crowd after the lock: a session for every two crowd scenes.', reset: 1, foley: 1, effects: 1, score: 1, mix: 1.1 },
};

export const CREATURE_FOLEY_DAYS = 2;
export const WILD_TRACK_PER_LOCATIONS = 3;
/** A loop group for a session (performers and a stage). */
export const LOOP_GROUP_SESSION = 1800;
export const LOOP_GROUP_PER_SCENES = 2;

export const soundsOf = (p: Project): SoundChoice[] => (p.axes.sound ?? []).filter((x): x is SoundChoice => x in SOUNDS);
const product = (p: Project, key: 'foley' | 'effects' | 'score' | 'mix'): number => soundsOf(p).reduce((a, x) => a * SOUNDS[x][key], 1);

// ---------------- The score ----------------

export type Score = 'unset' | 'synth' | 'chamber' | 'percussive';

export interface ScoreDef {
  label: string;
  hint: string;
  /** The composer's days against the usual. */
  days: number;
  /** Minutes of running time to a recording session; 0 for none. */
  minutesPerSession: number;
  /** Players and a room for a session. */
  session: number;
}

export const SCORES: Record<Score, ScoreDef> = {
  unset: { label: 'Left To The Composer', hint: 'The composer decides. No sessions are booked.', days: 1, minutesPerSession: 0, session: 0 },
  synth: { label: 'Electronic', hint: 'Made by the composer alone: no players and no sessions.', days: 1, minutesPerSession: 0, session: 0 },
  chamber: { label: 'A Small Ensemble', hint: 'Players are recorded: a session for every twenty minutes of the film.', days: 1, minutesPerSession: 20, session: 4000 },
  percussive: { label: 'Percussion To Picture', hint: 'Written tightly to the cut, so longer to compose, with a session for every forty minutes.', days: 1.2, minutesPerSession: 40, session: 2500 },
};

export const scoreOf = (p: Project): Score => p.axes.score ?? 'unset';

// ---------------- What the choices ask of the work ----------------

/** A scene's setup reset and take running time against the usual, from its rig, the light and the sound plan. */
export function craftTime(p: Project, s: Scene): { reset: number; run: number; extraTakes: number } {
  const rig = RIGS[rigOf(p, s.id)];
  const light = LIGHTS[lightOf(p)];
  let reset = crewed(p, rig.role) ? rig.reset : Math.max(1, rig.reset) * UNCREWED_RESET;
  if (lit(s)) reset *= light.reset;
  if (s.dialogue.length) for (const x of soundsOf(p)) reset *= SOUNDS[x].reset;
  return { reset, run: rig.run, extraTakes: lit(s) ? light.extraTakes : 0 };
}

/** How widely a scene's takes vary on the technical side, from its rig. */
export const takeSpread = (p: Project, s: Scene): number => RIGS[rigOf(p, s.id)].spread;

/** Crew the choices need beyond the script's own, each with the reason. */
export function craftRoles(p: Project, live: Scene[]): { roleId: string; reason: string }[] {
  const out: { roleId: string; reason: string }[] = [];
  for (const rig of new Set(live.map((s) => rigOf(p, s.id)))) { const d = RIGS[rig]; if (d.role) out.push({ roleId: d.role, reason: d.why! }); }
  if (live.some((s) => s.dialogue.length)) for (const x of soundsOf(p)) { const d = SOUNDS[x]; if (d.role) out.push({ roleId: d.role, reason: d.why! }); }
  return out;
}

/** Whether the script's interiors need a gaffer under the light chosen. Night exteriors always do. */
export function gafferNeeded(p: Project, live: Scene[]): boolean {
  return live.some((s) => (s.heading.time === 'NIGHT' && s.heading.intExt === 'EXT') || (lit(s) && LIGHTS[lightOf(p)].gafferForInteriors));
}

/** Rented kit for a shoot day: the dearest rig among its scenes, once. */
export function rigDayCost(p: Project, scenes: Scene[]): number {
  return scenes.reduce((a, s) => Math.max(a, RIGS[rigOf(p, s.id)].dayCost), 0);
}

/** Rehearsal days the rigs add, across the scenes on them. */
export function rigRehearsalDays(p: Project, live: Scene[]): number {
  return Math.ceil(live.reduce((a, s) => a + RIGS[rigOf(p, s.id)].rehearsal, 0));
}

/** Days of camera tests before the shoot, from the light chosen. Macro tests are for stop-motion; the others for live scenes. */
export function cameraTestDays(p: Project, hasLive: boolean, hasStopMotion: boolean): number {
  const light = lightOf(p);
  if (light === 'macro') return hasStopMotion ? LIGHTS.macro.testDays : 0;
  return hasLive ? LIGHTS[light].testDays : 0;
}

/** Whether dialogue recorded on a compromised day still needs replacing: with a boom on every dialogue scene, only when there is no boom operator after all. */
export function dialogueHolds(p: Project): boolean {
  return soundsOf(p).includes('clarity') && crewed(p, 'boom-operator');
}

/** Post-production days against the usual, from the sound plan, the score and the light. */
export const postFactors = (p: Project): { foley: number; effects: number; score: number; mix: number; grade: number } =>
  ({ foley: product(p, 'foley'), effects: product(p, 'effects'), score: product(p, 'score') * SCORES[scoreOf(p)].days, mix: product(p, 'mix'), grade: LIGHTS[lightOf(p)].grade });

/** Recording sessions for the score, for an episode of this many minutes, and what each costs. */
export function scoreSessions(p: Project, minutes: number): { sessions: number; each: number } {
  const d = SCORES[scoreOf(p)];
  return { sessions: d.minutesPerSession ? Math.max(1, Math.ceil(minutes / d.minutesPerSession)) : 0, each: d.session };
}
