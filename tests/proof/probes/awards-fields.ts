// The fields that decide which award categories a film may enter (awards-rules.ts, script-effects.ts): where it
// competes, what it is adapted from and who it is for. On the feature released in American cinemas
// through a booking partner (songs.ts inUsCinemas), entered each week in every category of every open edition it is
// eligible for, so each field shows as a change in which kinds of category it enters, and what the entries cost.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { categoriesFor, checkEligibility, institution } from '../../../src/engine/awards';
import { submitEntry } from '../../../src/engine/awards-actions';
import { feature } from './script';
import { inUsCinemas } from './songs';

/** Weekly: each delivered film entered in every category it is eligible for, in each open edition. */
const lastLook = new WeakMap<GameState, number>();
const enterAll = (s: GameState) => {
  if (s.now - (lastLook.get(s) ?? -Infinity) < 7 * 86_400_000) return;
  lastLook.set(s, s.now);
  for (const p of s.projects.filter((x) => x.delivered && !x.shelved)) {
    for (const ed of s.editions.filter((e) => e.status === 'open' && e.deadline > s.now)) {
      for (const cat of categoriesFor(institution(ed.institutionId), ed.year)) {
        if (ed.entries.some((e) => e.projectId === p.id && e.categoryId === cat.id)) continue;
        if (!checkEligibility(s, p, ed, cat).eligible) continue;
        try { submitEntry(s, p, ed.id, cat.id); } catch { /* its fee, its form, or its recipients */ }
      }
    }
  }
};
const kinds = (s: GameState) => {
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId)));
  const n = (re: RegExp) => mine.filter((e) => re.test(e.categoryId)).length;
  return {
    entries: mine.length, entryFees: mine.reduce((a, e) => a + e.fee, 0),
    selected: mine.filter((e) => ['selected', 'nominated', 'won', 'mention'].includes(e.status)).length,
    comedyEntries: n(/comedy|musical/), adaptedEntries: n(/adapt/), childrenEntries: n(/child|famil/), periodEntries: n(/period/),
  };
};
/** The US-released feature, changed by `fn` before the script is approved. */
const film = (fn: (p: Project) => void = () => {}) => (s: GameState, year: number): Project => { const p = feature()(s, year); fn(p); return p; };
const US = (fn?: (p: Project) => void) => ({ years: 3, project: film(fn), takeDistribution: false, release: false, afterDelivery: inUsCinemas, daily: enterAll });

export const PROBES: Probe[] = [
  { id: 'competes-comedy', features: ['field:Projects.tsx#"Competes As"#1', 'field:ScriptViews.tsx#"Competes As"#1'], decision: 'Enter the feature as a comedy rather than a drama where awards split them', reads: ['src/engine/script-effects.ts#competesAs'],
    base: US((p) => { p.axes.register = 'drama'; }), variant: US((p) => { p.axes.register = 'comedy'; }), measure: kinds, bites: ['comedyEntries'], downstream: ['selected'] },
  { id: 'source-adapted', features: ['field:ScriptViews.tsx#"Source Material"#1'], decision: 'Declare the feature adapted from a work rather than original', reads: ['src/engine/awards-rules.ts#requirementProblems'],
    base: US(), variant: US((p) => { p.source = { kind: 'adapted', work: 'The Lighthouse Diaries' }; }), measure: kinds, bites: ['adaptedEntries'], downstream: ['entryFees', 'entries'] },
  { id: 'audience-family', features: ['field:Projects.tsx#"Intended Audience"#1'], decision: 'Make the feature for families rather than a general audience', reads: ['src/engine/awards-rules.ts#requirementProblems'],
    base: US(), variant: US((p) => { p.axes.audience = 'Family'; }), measure: kinds, bites: ['entries'], downstream: ['entryFees', 'selected'] },
];
