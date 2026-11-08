// Setups, coverage and takes on a live-action shoot (SLATE-12-02.02 and 12-03, November 8, 2026). A shoot day used to
// capture each scene as one result. Now each scene has a shot plan: how much coverage (a master only, the standard
// master and singles, or full coverage with inserts) and how many takes (move on after one, a few, or keep going).
// More coverage and more takes use more of the day, so fewer scenes fit and the shoot runs longer, which costs days and
// money. Each take is recorded with a performance and a technical quality, drawn from the world seed around what the
// crew and cast can do, so more takes give the edit more to choose from, with diminishing returns, never perfection.
// The best balanced take is used unless the edit chooses another: the performance side feeds the performances, the
// technical side the direction. Coverage gives the editor options: a master only is harder to cut, full coverage
// easier (finish.ts). Projects started before this capture each scene as one result, as they always did (takesModel
// unset). Time factors, take counts and spreads are game calibration.
import { gaussian, stream } from './rng';
import type { Project, Scene, SceneCapture } from './types';

export type Coverage = 'master' | 'standard' | 'full';
export type TakePolicy = 'one' | 'few' | 'many';

export const COVERAGE: Record<Coverage, { label: string; time: number; edit: number }> = {
  master: { label: 'A Master Only', time: 0.7, edit: -6 },
  standard: { label: 'Master And Singles', time: 1, edit: 0 },
  full: { label: 'Full Coverage With Inserts', time: 1.4, edit: 5 },
};
export const TAKES: Record<TakePolicy, { label: string; n: number; time: number }> = {
  one: { label: 'Move On After One Take', n: 1, time: 0.85 },
  few: { label: 'A Few Takes', n: 3, time: 1 },
  many: { label: 'Keep Going Until It Is Right', n: 6, time: 1.3 },
};

/** How far below the old single result the takes are centred (the best of three balanced takes is about this much higher). */
export const TAKE_CENTRE = 4;

export function shotPlan(p: Project, sceneId: string): { coverage: Coverage; takes: TakePolicy } | null {
  if (!p.takesModel) return null;
  // Scripted scenes only: interviews, actuality and unscripted segments aren't shot in takes.
  if (p.scenes.find((s) => s.id === sceneId)?.kind !== 'scripted') return null;
  return { coverage: 'standard', takes: 'few', ...(p.shotPlans?.[sceneId] ?? {}) };
}

/** How much of the day a scene's plan takes, against the standard plan. 1 for projects without shot plans. */
export function planTime(p: Project, s: Scene): number {
  const plan = shotPlan(p, s.id);
  return plan ? COVERAGE[plan.coverage].time * TAKES[plan.takes].time : 1;
}

/** The takes of a scene, around what the crew and cast can do; the best balanced one is used. */
export function recordTakes(seed: number, p: Project, s: Scene, date: string, base: number): { takes: { perf: number; tech: number }[]; chosen: number } {
  const plan = shotPlan(p, s.id)!;
  const r = stream(seed, 'takes', p.id, s.id, date);
  const clamp = (n: number) => Math.round(Math.max(5, Math.min(100, n)));
  // Centred below what the old single result gave, so that the best of the standard few takes matches it on average:
  // one take is worse and quicker, many are a little better and slower (the best of six, against the best of three).
  const takes = Array.from({ length: TAKES[plan.takes].n }, () => ({ perf: clamp(gaussian(r, base - TAKE_CENTRE, 7)), tech: clamp(gaussian(r, base - TAKE_CENTRE, 7)) }));
  const chosen = takes.reduce((best, t, i) => (t.perf + t.tech > takes[best].perf + takes[best].tech ? i : best), 0);
  return { takes, chosen };
}

/** The capture's figures for a chosen take: its technical side and the balance of both, and its performance side. */
export function takeFigures(t: { perf: number; tech: number }): Pick<SceneCapture, 'quality' | 'perf'> {
  return { quality: Math.round((t.perf + t.tech) / 2), perf: t.perf };
}

/** The editor's options from coverage, for the editing score: the average over captured scenes. 0 without shot plans. */
export function coverageEdit(p: Project, sceneIds: string[]): number {
  if (!p.takesModel) return 0;
  const xs = sceneIds.filter((id) => p.captures.some((c) => c.sceneId === id && c.captured > 0)).flatMap((id) => { const plan = shotPlan(p, id); return plan ? [COVERAGE[plan.coverage].edit] : []; });
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}
