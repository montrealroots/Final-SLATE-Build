// What an award entry is entered as (FinishViews.tsx "Version To Enter"): a version is judged and timed as its own cut
// (awards.ts checkEligibility, awards-actions.ts entrySnapshot). A short of three sixteen-minute scenes runs 48 minutes,
// too long for any short category (40 or fewer); its Short Cut, without the last scene, runs 32.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { categoriesFor, checkEligibility, institution } from '../../../src/engine/awards';
import { submitEntry } from '../../../src/engine/awards-actions';
import { editScenes } from '../../../src/engine/finish';
import { addVersion } from '../../../src/engine/versions';
import { ACTING, feature, short } from './script';
import { kinds } from './awards-fields';

/** Once picture is locked: the Short Cut, without the last scene. */
const shortCut = () => { const made = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of s.projects.filter((x) => x.edit.pictureLocked && !x.delivered && !made.has(x))) { made.add(p); try { addVersion(s, p, 'Short Cut', [editScenes(p).at(-1)!.id]); } catch { /* not now */ } }
}; };
/** Weekly: each delivered film entered in every category it is eligible for, as the Short Cut where `asCut`. */
const enter = (asCut: boolean) => { const cut = shortCut(); const last = new WeakMap<GameState, number>(); return (s: GameState) => {
  cut(s);
  if (s.now - (last.get(s) ?? -Infinity) < 7 * 86_400_000) return;
  last.set(s, s.now);
  for (const p of s.projects.filter((x) => x.delivered && !x.shelved)) {
    const v = asCut ? (p.versions ?? []).find((x) => x.label === 'Short Cut')?.id : undefined;
    for (const ed of s.editions.filter((e) => e.status === 'open' && e.deadline > s.now)) for (const cat of categoriesFor(institution(ed.institutionId), ed.year)) {
      if (ed.entries.some((e) => e.projectId === p.id && e.categoryId === cat.id) || !checkEligibility(s, p, ed, cat, undefined, v).eligible) continue;
      try { submitEntry(s, p, ed.id, cat.id, undefined, v); } catch { /* its fee or form */ }
    }
  }
}; };
const LONG = short({ minutes: 16 });
/** The feature, its friend placed in the lead categories too. */
const twoLeads = (s: GameState, year: number): Project => { const p = feature()(s, year); p.characters.find((c) => c.name === 'Friend')!.awardPlacement = 'lead'; return p; };
/** Weekly: each delivered film entered in every acting category it is eligible for; for the lead ones, the friend alone where `friendOnly`. */
const enterActs = (friendOnly: boolean) => { const last = new WeakMap<GameState, number>(); return (s: GameState) => {
  if (s.now - (last.get(s) ?? -Infinity) < 7 * 86_400_000) return;
  last.set(s, s.now);
  for (const p of s.projects.filter((x) => x.delivered && !x.shelved)) {
    const friend = p.credits.find((c) => c.characterName === 'Friend' && c.contribution === 'Cast')?.id;
    for (const ed of s.editions.filter((e) => e.status === 'open' && e.deadline > s.now)) for (const cat of categoriesFor(institution(ed.institutionId), ed.year).filter((c) => ACTING.includes(c.recipient))) {
      const who = friendOnly && cat.recipient === 'lead' && friend ? [friend] : undefined;
      if (ed.entries.some((e) => e.projectId === p.id && e.categoryId === cat.id) || !checkEligibility(s, p, ed, cat, who).eligible) continue;
      try { submitEntry(s, p, ed.id, cat.id, who); } catch { /* its fee or form */ }
    }
  }
}; };
/** The lead categories' entries: how many are named on each, the score they were judged on, and what came of them. */
const leadScores = (s: GameState) => {
  const lead = s.editions.flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId) && categoriesFor(institution(ed.institutionId), ed.year).find((c) => c.id === e.categoryId)?.recipient === 'lead'));
  return {
    leadRecipients: lead.reduce((a, e) => a + e.recipients.length, 0),
    leadScore: lead.length ? lead.reduce((a, e) => a + (e.snapshot?.score ?? 0), 0) / lead.length : 0,
    leadHonours: lead.filter((e) => ['selected', 'nominated', 'won', 'mention'].includes(e.status)).length,
    leadDecided: lead.filter((e) => ['nominated', 'not-nominated', 'selected', 'not-selected', 'won', 'lost', 'mention'].includes(e.status)).length,
  };
};

export const PROBES: Probe[] = [
  { id: 'version-entry', features: ['field:FinishViews.tsx#"Version To Enter"#1'], decision: 'Enter the 48-minute short as its 32-minute Short Cut', reads: ['src/engine/awards.ts#checkEligibility', 'src/engine/versions.ts#versionRuntime'],
    base: { years: 3, project: LONG, daily: enter(false) }, variant: { years: 3, project: LONG, daily: enter(true) }, measure: kinds, bites: ['entries'], downstream: ['decided', 'entryFees', 'selected'] },
  // A performance entry is for whoever is named (awards-results.ts playerScore: the best of them is judged). The friend
  // placed as a lead too, so both are in the lead categories: entered for the friend alone, rather than both.
  { id: 'performer-entry', features: ['field:FinishViews.tsx#{performerLabel(c)}#1'], decision: 'Enter the friend\'s performance alone in the lead categories, rather than the lead\'s and the friend\'s', reads: ['src/engine/awards-actions.ts#submitEntry', 'src/engine/awards-results.ts#playerScore'],
    seeds: 30, base: { years: 3, project: twoLeads, daily: enterActs(false) }, variant: { years: 3, project: twoLeads, daily: enterActs(true) }, measure: leadScores, bites: ['leadRecipients'], downstream: ['leadScore', 'leadHonours'] },
];
