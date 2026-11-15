// The release's own fields (FinishViews.tsx "Which Cut", "Release Date"), each on a release the career plans itself the
// day the film is delivered, rather than the fortnight-later digital release of career.ts. A release with no
// distributor earns nothing itself (finish.ts: money comes through a deal or your own release plan); what it decides is
// which awards the film may enter, so each film is entered weekly in everything it is eligible for.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { editScenes, planRelease } from '../../../src/engine/finish';
import { addVersion } from '../../../src/engine/versions';
import { addDaysToKey, dateKey } from '../../../src/engine/time';
import { feature } from './script';
import { EVERYWHERE, licensedFor, track } from './song-fields';
import { enterAll, kinds } from './awards-fields';
import { institution } from '../../../src/engine/awards';

const F = (label: string) => `field:FinishViews.tsx#${label}#1`;
const today = (s: GameState) => dateKey(s.now, 'Europe/London');
/** Once picture is locked: a US Cut without the first scene, where the track licensed for Britain alone plays. */
const usCut = () => { const made = new WeakSet<Project>(); return (s: GameState) => {
  licensedFor({ ...EVERYWHERE, territories: ['GB'] })(s);
  for (const p of s.projects.filter((x) => x.edit.pictureLocked && !x.delivered && !made.has(x))) { made.add(p); try { addVersion(s, p, 'US Cut', [editScenes(p)[0].id]); } catch { /* not now */ } }
}; };
/** Delivered: released online in the United States a fortnight on, as the main cut or as the US Cut. */
const inUs = (cut: 'main' | 'us') => (s: GameState, p: Project) => {
  const v = (p.versions ?? []).find((x) => x.label === 'US Cut');
  try { planRelease(s, p, { route: 'digital', date: addDaysToKey(today(s), 14), territories: ['US'], ...(cut === 'us' && v ? { cut: v.id } : {}) }); } catch { /* refused: no release */ }
};
/** Delivered: released online in Britain `days` on. */
const after = (days: number) => (s: GameState, p: Project) => { try { planRelease(s, p, { route: 'digital', date: addDaysToKey(today(s), days), territories: ['GB'] }); } catch { /* no release */ } };
/** Each day: `f`, then every delivered film entered in everything it is eligible for. */
const both = (f: (s: GameState) => void) => (s: GameState) => { f(s); enterAll(s); };
/** kinds(), and the entries at American institutions, which a release in the United States opens. */
const american = (s: GameState) => ({ ...kinds(s), usEntries: s.editions.filter((e) => institution(e.institutionId).placeId.startsWith('us-')).reduce((a, ed) => a + ed.entries.filter((e) => s.projects.some((p) => p.id === e.projectId)).length, 0) });
const OWN = { years: 2, takeDistribution: false, release: false };

export const PROBES: Probe[] = [
  // A release plays the songs of the cut it names, and each must be licensed for where and how it goes out (music.ts
  // releaseLicenceRefusal): the main cut's track is licensed for Britain alone, the US Cut has none.
  { id: 'which-cut', features: [F('"Which Cut"')], decision: 'Release the US Cut in the United States rather than the main cut', reads: ['src/engine/finish.ts#planRelease', 'src/engine/music.ts#releaseLicenceRefusal'],
    base: { ...OWN, years: 3, project: feature(), decide: track('background', 2), daily: both(usCut()), afterDelivery: inUs('main') },
    variant: { ...OWN, years: 3, project: feature(), decide: track('background', 2), daily: both(usCut()), afterDelivery: inUs('us') },
    measure: american, bites: ['released'], downstream: ['usEntries', 'entries', 'decided'] },
  // A release opens the awards whose window takes its date (awards.ts checkEligibility): six months later, a later year's.
  { id: 'release-date', features: [F('"Release Date"')], decision: 'Release the short online six months after delivery rather than a fortnight', reads: ['src/engine/finish.ts#planRelease'],
    base: { ...OWN, years: 3, afterDelivery: after(14), daily: enterAll }, variant: { ...OWN, years: 3, afterDelivery: after(180), daily: enterAll }, measure: kinds, bites: ['releaseDelay'], downstream: ['entries', 'decided', 'entryFees'] },
];
