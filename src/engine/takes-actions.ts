// Setting a scene's shot plan and choosing a take in the edit (takes.ts says how takes work and why). Loaded with the
// Schedule and Edit pages, not at startup (the startup JavaScript budget).
import { coverageFor, requiredSetups, shotPlan, takeFigures, type Coverage, type Emphasis, type TakePolicy } from './takes';
import type { Project } from './types';

export function setShotPlan(p: Project, sceneId: string, patch: Partial<{ coverage: Coverage; takes: TakePolicy; emphasis: Emphasis }>): void {
  if (!p.takesModel) throw new Error('This project captures each scene as one result.');
  if (p.captures.some((c) => c.sceneId === sceneId && c.captured >= 1)) throw new Error('That scene is shot already.');
  const plan = { ...shotPlan(p, sceneId)!, ...patch };
  (p.shotPlans ??= {})[sceneId] = plan;
  // A new emphasis brings the coverage it needs, unless the coverage is chosen in the same change.
  const s = p.scenes.find((x) => x.id === sceneId);
  if (patch.emphasis && !patch.coverage && s && p.directing === 2) plan.coverage = coverageFor(requiredSetups(p, s).map((x) => x.setup));
}

/** Use another take of a scene in the edit, until picture is locked. */
export function chooseTake(p: Project, sceneId: string, index: number): void {
  if (p.edit.pictureLocked) throw new Error('Picture is locked.');
  const c = p.captures.find((x) => x.sceneId === sceneId);
  const t = c?.takes?.[index];
  if (!c || !t) throw new Error('That take no longer exists.');
  c.chosenTake = index;
  Object.assign(c, takeFigures(t));
}
