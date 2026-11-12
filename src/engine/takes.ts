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
//
// Contextual directing (directing 2, projects from November 8, 2026). Under the rules above full coverage scored +5 for
// every scene and a master only -6, whatever the scene needed, and the best of six takes always beat the best of three,
// so the most coverage and the most takes won whenever money allowed, and a restrained one-shot scene was penalised for
// using fewer shots. Now:
// - What a scene needs is declared, not assumed: an exchange between two or more speakers needs singles to cut between
//   them; a stunt, an effect or a planted detail needs inserts; the player's emphasis can ask for either, or play the
//   scene in one shot on purpose, which then needs nothing more (requiredSetups). The plan's coverage defaults to that.
// - Coverage that supplies what the scene needs scores nothing extra; coverage it lacks costs the edit, until a pickup
//   supplies it or the player accepts it. Surplus coverage gives options instead: with singles the editor can cut
//   between takes for the performance, and inserts let a continuity break be cut around.
// - Takes are recorded until the plan's rule stops them: one, until one is usable (up to four), or five for the best.
//   A take has an identifiable issue when a side falls clearly below what the crew and cast can do: a performance issue,
//   or a technical one (sound where the scene has dialogue and sound can't be trusted, else camera). A usable first take
//   ends the scene's takes under the usual rule; more takes use more of the day and can still disappoint.
// - Time is setups times takes: each setup costs a reset and each take its running time, so more coverage and more takes
//   fit fewer scenes in a day (setupTime). The schedule plans with the rule's expected takes; the day uses what happened.
// - After the day, the edit sees what exists, what is missing and what each issue's fixes cost (directing.ts).
// A script supervisor's daily notes record coverage, set-ups and pickup shots for the editor (IATSE Local 634's
// description of the role, docs/depth/DIRECTING-RESEARCH.md); the times, spreads and thresholds are game calibration.
import { craftTime, takeSpread } from './craft';
import { gaussian, stream } from './rng';
import type { Project, Scene, SceneCapture } from './types';

export type Coverage = 'master' | 'standard' | 'full';
export type TakePolicy = 'one' | 'few' | 'many';
export type Setup = 'master' | 'singles' | 'inserts';
export type Emphasis = 'scene' | 'performances' | 'detail' | 'one-shot';
export type TakeIssue = 'performance' | 'camera' | 'sound';

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
/** Directing 2's take rules: the most takes each allows, and the takes the schedule plans for. */
export const TAKE_RULES: Record<TakePolicy, { label: string; max: number; planned: number }> = {
  one: { label: 'One Take, Then Move On', max: 1, planned: 1 },
  few: { label: 'Until One Is Usable (Up To Four)', max: 4, planned: 2 },
  many: { label: 'Keep Going For The Best (Five)', max: 5, planned: 5 },
};
export const EMPHASIS: Record<Emphasis, string> = {
  scene: 'What The Scene Needs',
  performances: 'The Performances (Singles On Each)',
  detail: 'A Detail (Inserts)',
  'one-shot': 'Play It In One Shot',
};
export const SETUPS_OF: Record<Coverage, Setup[]> = { master: ['master'], standard: ['master', 'singles'], full: ['master', 'singles', 'inserts'] };
/** A setup's reset and each take's running time, as shares of a scene's standard load (master and singles, two takes each). */
export const SETUP_RESET = 0.2;
export const TAKE_RUN = 0.15;
/** A side this far below what the crew and cast can do is a visible problem in the take. */
export const ISSUE_GAP = 8;
const SPREAD_V2 = 6;

/** How far below the old single result the takes are centred (the best of three balanced takes is about this much higher). */
export const TAKE_CENTRE = 4;

export const isDirecting2 = (p: Project) => p.directing === 2;

/** What a scene needs to be cut, from its declared facts and the player's emphasis, with the reason for each setup. */
export function requiredSetups(p: Project, s: Scene): { setup: Setup; reason: string }[] {
  const emphasis = p.shotPlans?.[s.id]?.emphasis ?? 'scene';
  if (emphasis === 'one-shot') return [{ setup: 'master', reason: 'You chose to play it in one shot.' }];
  const out: { setup: Setup; reason: string }[] = [{ setup: 'master', reason: 'The whole scene, to cut from.' }];
  const speakers = new Set(s.dialogue.map((d) => d.characterId)).size;
  if (speakers >= 2) out.push({ setup: 'singles', reason: `An exchange between ${speakers} speakers needs a single on each to cut between them.` });
  else if (emphasis === 'performances') out.push({ setup: 'singles', reason: 'You put the emphasis on the performances.' });
  const planted = (p.setups ?? []).some((x) => x.plantedIn === s.id);
  const why = s.stunts.trim() ? 'A stunt needs inserts to cut around the action.' : s.vfx.length ? 'An effect needs inserts for its plates and details.' : planted ? 'A detail planted here has to be seen: it needs an insert.' : emphasis === 'detail' ? 'You put the emphasis on a detail.' : null;
  if (why) out.push({ setup: 'inserts', reason: why });
  return out;
}

export const coverageFor = (setups: Setup[]): Coverage => (setups.includes('inserts') ? 'full' : setups.includes('singles') ? 'standard' : 'master');

export function shotPlan(p: Project, sceneId: string): { coverage: Coverage; takes: TakePolicy; emphasis: Emphasis } | null {
  if (!p.takesModel) return null;
  // Scripted scenes only: interviews, actuality and unscripted segments aren't shot in takes.
  const s = p.scenes.find((x) => x.id === sceneId);
  if (s?.kind !== 'scripted') return null;
  const saved = p.shotPlans?.[sceneId] ?? {};
  // Directing 2: the coverage starts at what the scene needs (the player can choose more or less).
  const coverage = saved.coverage ?? (isDirecting2(p) ? coverageFor(requiredSetups(p, s).map((x) => x.setup)) : 'standard');
  return { coverage, takes: saved.takes ?? 'few', emphasis: saved.emphasis ?? 'scene' };
}

/** Setups times takes, as a share of a scene's standard load (directing 2). */
export function setupTime(setups: number, takes: number, reset = 1, run = 1): number {
  return setups * (SETUP_RESET * reset + TAKE_RUN * run * takes);
}

/** How much of the day a scene's plan takes, against the standard plan. 1 for projects without shot plans. */
export function planTime(p: Project, s: Scene): number {
  const plan = shotPlan(p, s.id);
  if (!plan) return 1;
  // The rig, the light and the sound plan change how long a setup takes to reset and a take to run (craft.ts).
  const craft = craftTime(p, s);
  if (isDirecting2(p)) return setupTime(SETUPS_OF[plan.coverage].length, TAKE_RULES[plan.takes].planned + craft.extraTakes, craft.reset, craft.run);
  return COVERAGE[plan.coverage].time * TAKES[plan.takes].time;
}

/** A take's identifiable issue, against what the crew and cast can do (directing 2). */
export function takeIssue(t: { perf: number; tech: number }, base: number, soundAtRisk: boolean): TakeIssue | undefined {
  if (t.perf < base - ISSUE_GAP) return 'performance';
  if (t.tech < base - ISSUE_GAP) return soundAtRisk ? 'sound' : 'camera';
  return undefined;
}

/** The takes of a scene, around what the crew and cast can do; the best balanced one is used. */
export function recordTakes(seed: number, p: Project, s: Scene, date: string, base: number, soundAtRisk = false): { takes: { perf: number; tech: number; issue?: TakeIssue }[]; chosen: number } {
  const plan = shotPlan(p, s.id)!;
  const r = stream(seed, 'takes', p.id, s.id, date);
  const clamp = (n: number) => Math.round(Math.max(5, Math.min(100, n)));
  const best = (xs: { perf: number; tech: number; issue?: TakeIssue }[], among: number[]) => among.reduce((b, i) => (xs[i].perf + xs[i].tech > xs[b].perf + xs[b].tech ? i : b), among[0]);
  if (isDirecting2(p)) {
    // Takes until the rule stops them: each is its own draw around what the crew and cast can do, never improving by
    // itself; the first usable one ends the usual rule's takes.
    const takes: { perf: number; tech: number; issue?: TakeIssue }[] = [];
    for (let i = 0; i < TAKE_RULES[plan.takes].max; i++) {
      // The technical side varies with the rig: a handheld or long moving take more, a dolly's less (craft.ts).
      const t = { perf: clamp(gaussian(r, base, SPREAD_V2)), tech: clamp(gaussian(r, base, SPREAD_V2 * takeSpread(p, s))) };
      const issue = takeIssue(t, base, soundAtRisk);
      takes.push(issue ? { ...t, issue } : t);
      if (plan.takes === 'few' && !issue) break;
    }
    const usable = takes.map((t, i) => (t.issue ? -1 : i)).filter((i) => i >= 0);
    return { takes, chosen: best(takes, usable.length ? usable : takes.map((_, i) => i)) };
  }
  // Centred below what the old single result gave, so that the best of the standard few takes matches it on average:
  // one take is worse and quicker, many are a little better and slower (the best of six, against the best of three).
  const takes = Array.from({ length: TAKES[plan.takes].n }, () => ({ perf: clamp(gaussian(r, base - TAKE_CENTRE, 7)), tech: clamp(gaussian(r, base - TAKE_CENTRE, 7)) }));
  return { takes, chosen: best(takes, takes.map((_, i) => i)) };
}

/** The capture's figures for a chosen take: its technical side and the balance of both, and its performance side. */
export function takeFigures(t: { perf: number; tech: number }): Pick<SceneCapture, 'quality' | 'perf'> {
  return { quality: Math.round((t.perf + t.tech) / 2), perf: t.perf };
}

/** What a scene's material is missing against what it needs, for the edit (directing 2): setups, and a continuity break. */
export function missingMaterial(p: Project, s: Scene, c: SceneCapture): { setup?: Setup; continuity?: true; reason: string }[] {
  if (!isDirecting2(p) || !c.setups) return [];
  const out: { setup?: Setup; continuity?: true; reason: string }[] = [];
  for (const need of requiredSetups(p, s)) if (!c.setups.includes(need.setup)) out.push({ setup: need.setup, reason: need.reason });
  // A scene shot across more than one day has to match from day to day; inserts let the editor cut around a mismatch.
  if ((c.days ?? 1) > 1 && !c.setups.includes('inserts')) out.push({ continuity: true, reason: 'It was shot over more than one day, and the days don\'t match; an insert would let the editor cut around it.' });
  return out.filter((m) => !(c.accepted ?? []).includes(m.setup ?? 'continuity'));
}

/** The performance the edit can make of a scene: with singles, the editor cuts between takes for the best usable moments. */
export function editPerformance(p: Project, c: SceneCapture): number | undefined {
  if (!isDirecting2(p) || !c.takes?.length || c.chosenTake === undefined) return c.perf;
  if (!c.setups?.includes('singles')) return c.takes[c.chosenTake].perf;
  const usable = c.takes.filter((t) => t.issue !== 'performance');
  return Math.max(c.takes[c.chosenTake].perf, ...usable.map((t) => t.perf));
}

/** The editor's options from coverage, for the editing score: the average over captured scenes. 0 without shot plans. */
export function coverageEdit(p: Project, sceneIds: string[]): number {
  if (!p.takesModel) return 0;
  const captured = sceneIds.filter((id) => p.captures.some((c) => c.sceneId === id && c.captured > 0));
  if (isDirecting2(p)) {
    // Only what the scene needed and lacks costs the edit: 6 for each missing setup, 3 for a continuity break.
    const costs = captured.flatMap((id) => {
      const s = p.scenes.find((x) => x.id === id);
      const c = p.captures.find((x) => x.sceneId === id)!;
      if (!s || !c.setups) return [];
      return [-missingMaterial(p, s, c).reduce((a, m) => a + (m.continuity ? 3 : 6), 0)];
    });
    return costs.length ? costs.reduce((a, b) => a + b, 0) / costs.length : 0;
  }
  const xs = captured.flatMap((id) => { const plan = shotPlan(p, id); return plan ? [COVERAGE[plan.coverage].edit] : []; });
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** A pickup's share of a day (directing 2): one setup, two takes, of the scene's minutes at its complexity. */
export function pickupLoad(s: Scene, complexity: number): number {
  return (s.estMinutes / complexity) * setupTime(1, 2);
}

/**
 * What a pickup adds to a scene's material (directing 2): another take, kept beside the earlier ones and used if it is
 * better and usable, or the singles or inserts the scene lacked. Returns what the day's report says.
 */
export function applyPickup(seed: number, p: Project, s: Scene, c: SceneCapture, kind: 'take' | 'singles' | 'inserts', date: string, base: number, soundAtRisk: boolean): string {
  if (kind === 'take') {
    const r = stream(seed, 'pickup-takes', p.id, s.id, date);
    const clamp = (n: number) => Math.round(Math.max(5, Math.min(100, n)));
    const fresh: { perf: number; tech: number; issue?: TakeIssue }[] = [];
    for (let i = 0; i < TAKE_RULES.few.max; i++) {
      const t = { perf: clamp(gaussian(r, base, SPREAD_V2)), tech: clamp(gaussian(r, base, SPREAD_V2)) };
      const issue = takeIssue(t, base, soundAtRisk);
      fresh.push(issue ? { ...t, issue } : t);
      if (!issue) break;
    }
    const takes = [...(c.takes ?? []), ...fresh];
    const current = c.chosenTake !== undefined ? takes[c.chosenTake] : undefined;
    const better = fresh.map((t, i) => ({ t, i: (c.takes ?? []).length + i })).filter((x) => !x.t.issue).sort((a, b) => b.t.perf + b.t.tech - (a.t.perf + a.t.tech))[0];
    c.takes = takes;
    if (better && (!current || current.issue || better.t.perf + better.t.tech > current.perf + current.tech)) {
      c.chosenTake = better.i;
      Object.assign(c, takeFigures(better.t));
      return `The pickup of ${s.heading.place || 'the scene'} gave a usable take; the edit now uses it.`;
    }
    return `The pickup of ${s.heading.place || 'the scene'} added ${fresh.length} more ${fresh.length === 1 ? 'take' : 'takes'}, none better than what the edit has; it keeps the take it had.`;
  }
  c.setups = [...new Set([...(c.setups ?? ['master']), kind])];
  c.accepted = (c.accepted ?? []).filter((x) => x !== kind && !(kind === 'inserts' && x === 'continuity'));
  return `The pickup of ${s.heading.place || 'the scene'} shot its ${kind}.`;
}
