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
import { SERIES } from './scheduled';
import { castSelf } from './creation-fields';
import { commission } from './project-fields';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';

/** Weekly: each delivered film entered in every category it is eligible for, in each open edition. */
const lastLook = new WeakMap<GameState, number>();
export const enterAll = (s: GameState) => {
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
export const kinds = (s: GameState) => {
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId)));
  const n = (re: RegExp) => mine.filter((e) => re.test(e.categoryId)).length;
  return {
    entries: mine.length, entryFees: mine.reduce((a, e) => a + e.fee, 0),
    selected: mine.filter((e) => ['selected', 'nominated', 'won', 'mention'].includes(e.status)).length,
    // Entries the members or jury went on to decide, after the deadline: the judging that follows an entry.
    decided: mine.filter((e) => ['nominated', 'not-nominated', 'selected', 'not-selected', 'won', 'lost', 'mention'].includes(e.status)).length,
    comedyEntries: n(/comedy|musical/), adaptedEntries: n(/adapt/), childrenEntries: n(/child|famil/), periodEntries: n(/period/),
  };
};
/** The US-released feature, changed by `fn` before the script is approved. */
const film = (fn: (p: Project) => void = () => {}) => (s: GameState, year: number): Project => { const p = feature()(s, year); fn(p); return p; };
/** The feature released by the career itself (career.ts: a digital release a fortnight after delivery), entered in everything. */
/** A commissioned American season of two 45-minute episodes, streamed in the US, entered in everything; changed by `fn`. */
export const HOUR = (fn: (p: Project) => void = () => {}) => ({
  ...SERIES, years: 3, placeId: 'us-los-angeles', territories: ['US'], releaseRoute: 'streaming' as never,
  project: (s: GameState, year: number) => { const p = commission(s, unfunded(buildProject(s, { title: `Season ${year + 1}`, format: 'limited-series', medium: 'live-action', scenario: 'micro', genres: ['drama'], episodes: 2, runtime: 90 },
    [{ name: 'Mara', patch: { roleSize: 'lead' } }], [1, 2].flatMap((e) => [1, 2, 3].map((k) => ({ place: k === 2 ? 'Quay' : 'Pier', chars: ['Mara'], minutes: 15, extra: { episode: e } })))))); fn(p); return p; },
  daily: enterAll,
});
const SELF = { years: 3, project: feature(), takeDistribution: false, daily: enterAll };
/** The entries in categories for actresses and for actors, with kinds(). */
const billed = (s: GameState) => {
  const title = (instId: string, year: number, catId: string) => categoriesFor(institution(instId), year).find((c) => c.id === catId)?.actingTitle;
  const mine = s.editions.flatMap((ed) => ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId)).map((e) => title(ed.institutionId, ed.year, e.categoryId)));
  return { ...kinds(s), actressEntries: mine.filter((t) => t === 'Actress').length, actorEntries: mine.filter((t) => t === 'Actor').length };
};
/** The feature opened by the career in cinemas in Britain, France and Germany. */
const THREE = { ...SELF, releaseRoute: 'theatrical' as const, territories: ['GB', 'FR', 'DE'] };
const US = (fn?: (p: Project) => void) => ({ years: 3, project: film(fn), takeDistribution: false, release: false, afterDelivery: inUsCinemas, daily: enterAll });

export const PROBES: Probe[] = [
  { id: 'competes-comedy', features: ['field:Projects.tsx#"Competes As"#1', 'field:ScriptViews.tsx#"Competes As"#1'], decision: 'Enter the feature as a comedy rather than a drama where awards split them', reads: ['src/engine/script-effects.ts#competesAs'],
    base: US((p) => { p.axes.register = 'drama'; }), variant: US((p) => { p.axes.register = 'comedy'; }), measure: kinds, bites: ['comedyEntries'], downstream: ['selected'] },
  { id: 'source-adapted', features: ['field:ScriptViews.tsx#"Source Material"#1'], decision: 'Declare the feature adapted from a work rather than original', reads: ['src/engine/awards-rules.ts#requirementProblems'],
    base: US(), variant: US((p) => { p.source = { kind: 'adapted', work: 'The Lighthouse Diaries' }; }), measure: kinds, bites: ['adaptedEntries'], downstream: ['entryFees', 'entries'] },
  { id: 'audience-family', features: ['field:Projects.tsx#"Intended Audience"#1'], decision: 'Make the feature for families rather than a general audience', reads: ['src/engine/awards-rules.ts#requirementProblems'],
    base: US(), variant: US((p) => { p.axes.audience = 'Family'; }), measure: kinds, bites: ['entries'], downstream: ['entryFees', 'selected'] },
  // Where it is released decides whose qualifying rules it meets (awards.ts checkEligibility: a release in the
  // institution's country).
  { id: 'release-in-us', features: ['field:FinishViews.tsx#"Territory Code"#1'], decision: 'Release the feature in Britain and the United States rather than Britain alone', reads: ['src/engine/finish.ts#planRelease', 'src/engine/awards.ts#checkEligibility'],
    base: SELF, variant: { ...SELF, territories: ['GB', 'US'] }, measure: kinds, bites: ['entries'], downstream: ['entryFees', 'selected'] },
  { id: 'release-route', features: ['field:FinishViews.tsx#"Route"#1'], decision: 'Release the feature as a festival premiere rather than in the digital stores', reads: ['src/engine/finish.ts#planRelease', 'src/engine/awards.ts#checkEligibility'],
    base: SELF, variant: { ...SELF, releaseRoute: 'festival-premiere' as never }, measure: kinds, bites: ['entries'], downstream: ['entryFees', 'revenue'] },
  // A subject declared on the Overview opens the categories that ask for it (awards-rules.ts requirementProblems): the
  // Writers Guild's award for writing about civil rights, on the US-released feature you wrote.
  { id: 'subject-civil-rights', features: ['field:ScriptViews.tsx#{x.label}#1'], decision: 'Declare the feature is about civil rights', reads: ['src/engine/awards-rules.ts#requirementProblems'],
    base: US(), variant: US((p) => { p.subjects = ['civil-rights']; }), measure: kinds, bites: ['entries'], downstream: ['decided', 'entryFees', 'selected'] },
  // When it is set decides the period and contemporary categories (awards-rules.ts requirementProblems): the Emmys'
  // period crafts take one-hour series made in the United States and streamed there. A commissioned season of two
  // 45-minute episodes, made in Los Angeles, streamed in the US a fortnight after delivery, entered in everything.
  { id: 'set-in-period', features: ['field:ScriptViews.tsx#"When It Is Set"#1'], decision: 'Set the season in the past rather than the present day', reads: ['src/engine/awards-rules.ts#requirementProblems'],
    base: HOUR(), variant: HOUR((p) => { p.storyTime = 'period'; }), measure: kinds, bites: ['periodEntries'], downstream: ['decided', 'entryFees', 'entries'] },
  // Where you were born is your citizenship (identity.ts citizenshipOf), which the European Film Awards read for the
  // director: born in Europe or holding a European passport (awards-rules.ts nationalitiesOf). On the feature made in
  // London, which you direct, opened by the career in cinemas in three countries (the awards ask for three, or a festival).
  { id: 'born-in-paris', features: ['field:Creation.tsx#"Place Of Birth"#1'], decision: 'Be born in Paris rather than Tokyo', reads: ['src/engine/identity.ts#citizenshipOf', 'src/engine/awards-rules.ts#nationalitiesOf'],
    base: THREE, variant: { ...THREE, creation: { birthplaceId: 'fr-paris' } }, measure: (s) => ({ ...kinds(s), efaEntries: s.editions.filter((e) => e.institutionId === 'european-film-awards').reduce((a, ed) => a + ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId)).length, 0) }),
    bites: ['efaEntries'], downstream: ['decided', 'entryFees', 'entries'] },
  // He/Him and She/Her settle how you are billed (state.ts newGame: Actor, Actress); the gendered acting categories take
  // your own performance under that title (awards.ts creditedRecipients). On the US-released feature, its lead played by
  // you: She/Her rather than the default draft's They/Them billed as an actor.
  { id: 'pronouns-she', features: ['field:Creation.tsx#"Pronouns"#1'], decision: 'Choose She/Her, then play the lead of your feature yourself', reads: ['src/engine/state.ts#newGame', 'src/engine/awards.ts#creditedRecipients'],
    base: { ...US(), decide: castSelf }, variant: { ...US(), decide: castSelf, creation: { pronouns: 'she' } }, measure: billed, bites: ['actressEntries'], downstream: ['actorEntries', 'decided'] },
];
