// Reviewing the day's material and deciding what to do about it (contextual directing, November 8, 2026; takes.ts says
// how scenes are covered and takes recorded). After a scene is shot the edit shows what exists (setups and takes, each
// take with any identifiable issue), what the scene needed and lacks, and, for each problem, the fixes that fit it with
// what each costs: use another take already shot, replace the lines in post, shoot a pickup of just the missing take,
// singles or inserts, or accept it and move on. Nothing here reads the scene's free-written text; every issue comes from
// the scene's declared facts, the shot plan and the takes' recorded figures. A script supervisor's daily notes to the
// editor record coverage, set-ups and pickup shots (IATSE Local 634, docs/depth/DIRECTING-RESEARCH.md). Loaded with the
// Edit page, not at startup.
import { ledgerTotals, money } from './budget';
import { addDialogueReplacement, dayFees, nextWorkingDay, schedulePickups } from './production';
import { SHOOT_CREW } from './production/shoot';
import { approvedScenes, sceneLabel } from './projects';
import { chooseTake } from './takes-actions';
import { isDirecting2, missingMaterial, requiredSetups, type Setup, type TakeIssue } from './takes';
import { addDaysToKey } from './time';
import type { GameState, Project, Scene, SceneCapture } from './types';

export type Fix =
  | { action: 'use-take'; take: number; label: string }
  | { action: 'adr'; label: string }
  | { action: 'pickup'; kind: 'take' | 'singles' | 'inserts'; label: string }
  | { action: 'accept'; what: Setup | 'continuity' | 'take'; label: string };

export interface SceneIssue { text: string; fixes: Fix[] }

export interface Dailies {
  sceneId: string;
  label: string;
  needed: { setup: Setup; reason: string }[];
  setups: Setup[];
  takes: { n: number; perf: number; tech: number; issue?: TakeIssue; inCut: boolean }[];
  issues: SceneIssue[];
}

const ISSUE_WORDS: Record<TakeIssue, string> = { performance: 'the performance falls short', camera: 'a camera problem (focus or framing)', sound: 'the sound is unusable' };
const SETUP_WORDS: Record<Setup, string> = { master: 'master', singles: 'singles', inserts: 'inserts' };

/** What a pickup day costs and when it would be (the location and gear for a day, the shoot crew's day, the cast in it). */
export function pickupCost(p: Project, sceneId: string): { cost: number; date: string } {
  const s = approvedScenes(p).find((x) => x.id === sceneId);
  const fees = dayFees(p);
  const crew = p.hires.filter((h) => h.status === 'accepted' && SHOOT_CREW.has(h.roleId)).reduce((a, h) => a + h.dayRate, 0);
  const cast = p.hires.filter((h) => h.status === 'accepted' && h.kind === 'cast' && h.method !== 'voice' && s?.participants.includes(h.characterId ?? '')).reduce((a, h) => a + h.dayRate, 0);
  const last = p.schedule.days.reduce((m, d) => (d.date > m ? d.date : m), p.schedule.startDate ?? '');
  return { cost: fees.location + fees.equipment + crew + cast, date: last ? nextWorkingDay(p, addDaysToKey(last, 1)) : '' };
}

const pickupLabel = (p: Project, s: Scene, what: string) => {
  const { cost } = pickupCost(p, s.id);
  return `Shoot ${what} on a pickup day (about ${money(cost)}: the location, gear, crew and cast for a day)`;
};

/** The day's material for each shot scene that has it, with its issues and their fixes (directing 2 projects only). */
export function dailies(p: Project): Dailies[] {
  if (!isDirecting2(p)) return [];
  const out: Dailies[] = [];
  for (const s of approvedScenes(p)) {
    const c = p.captures.find((x) => x.sceneId === s.id && x.version === p.approvedDraft && x.captured > 0 && x.takes?.length);
    if (!c) continue;
    out.push({ sceneId: s.id, label: sceneLabel(p, s), needed: requiredSetups(p, s), setups: c.setups ?? [], takes: c.takes!.map((t, i) => ({ n: i + 1, ...t, inCut: c.chosenTake === i })), issues: sceneIssues(p, s, c) });
  }
  return out;
}

export function sceneIssues(p: Project, s: Scene, c: SceneCapture): SceneIssue[] {
  const out: SceneIssue[] = [];
  const pickingUp = p.schedule.days.some((d) => d.status === 'scheduled' && d.pickups?.[s.id]);
  const locked = p.edit.pictureLocked;
  const chosen = c.chosenTake !== undefined ? c.takes?.[c.chosenTake] : undefined;
  if (chosen?.issue && !(c.accepted ?? []).includes('take')) {
    const clean = (c.takes ?? []).map((t, i) => ({ t, i })).filter((x) => !x.t.issue).sort((a, b) => b.t.perf + b.t.tech - (a.t.perf + a.t.tech))[0];
    const fixes: Fix[] = [];
    if (clean) fixes.push({ action: 'use-take', take: clean.i, label: `Use take ${clean.i + 1}, which has no such problem` });
    if (chosen.issue === 'sound' && s.dialogue.length && !p.tasks.some((x) => x.id === `post:adr:${s.id}`)) fixes.push({ action: 'adr', label: 'Replace the lines in post (a sound designer\'s day; the performers come back to record them)' });
    if (!pickingUp && !locked) fixes.push({ action: 'pickup', kind: 'take', label: pickupLabel(p, s, 'another take') });
    fixes.push({ action: 'accept', what: 'take', label: 'Keep it and move on' });
    out.push({ text: `The take in the cut (take ${c.chosenTake! + 1}): ${ISSUE_WORDS[chosen.issue]}.`, fixes });
  }
  for (const m of missingMaterial(p, s, c)) {
    const what = m.continuity ? 'inserts to cut around it' : SETUP_WORDS[m.setup!];
    const fixes: Fix[] = [];
    if (!pickingUp && !locked) fixes.push({ action: 'pickup', kind: m.continuity ? 'inserts' : (m.setup as 'singles' | 'inserts'), label: pickupLabel(p, s, what) });
    fixes.push({ action: 'accept', what: m.continuity ? 'continuity' : m.setup!, label: m.continuity ? 'Accept the mismatch' : `Cut it without ${SETUP_WORDS[m.setup!]}` });
    out.push({ text: m.continuity ? `Continuity: ${m.reason}` : `No ${SETUP_WORDS[m.setup!]}: ${m.reason}`, fixes });
  }
  return out;
}

/** Act on an issue: use a take, book dialogue replacement, schedule a pickup, or accept it. */
export function applyFix(state: GameState, p: Project, sceneId: string, fix: Fix): string {
  const s = approvedScenes(p).find((x) => x.id === sceneId);
  const c = p.captures.find((x) => x.sceneId === sceneId);
  if (!s || !c) throw new Error('That scene has no material to work with.');
  if (fix.action === 'use-take') { chooseTake(p, sceneId, fix.take); return `The edit now uses take ${fix.take + 1} of ${sceneLabel(p, s)}.`; }
  if (fix.action === 'adr') { addDialogueReplacement(p, s); return `Dialogue replacement for ${sceneLabel(p, s)} is added to post.`; }
  if (fix.action === 'accept') { c.accepted = [...new Set([...(c.accepted ?? []), fix.what])]; return `${sceneLabel(p, s)}: accepted as it is.`; }
  if (p.edit.pictureLocked) throw new Error('The picture is locked. Unlock it to shoot a pickup.');
  if (p.schedule.days.some((d) => d.status === 'scheduled' && d.pickups?.[sceneId])) throw new Error('A pickup is already scheduled for that scene.');
  // A pickup day is paid like any other; it isn't booked when the money for it isn't there (the day would be lost).
  const { cost } = pickupCost(p, sceneId);
  const free = ledgerTotals(p).available;
  if (free < cost) throw new Error(`A pickup day costs about ${money(cost)}, and ${money(free)} is uncommitted. Add funding first.`);
  schedulePickups(state, p, [sceneId], { [sceneId]: fix.kind });
  return `A pickup of ${sceneLabel(p, s)} is scheduled.`;
}
