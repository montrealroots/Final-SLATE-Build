// A documentary's contributors (documentary.ts): their consent asked for, which delivery waits on (finish.ts
// deliveryBlockers), and, for one with approval over the cut, the locked cut shown (the career shows it, career.ts).
// A documentary short of an interview, actuality and an archive scene, as tests/media.test.ts's (labelled fixtures).
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';
import { requestConsent } from '../../../src/engine/documentary';
import { withdrawRelease } from '../../../src/engine/unscripted';
import { cutFromEdit, editScenes } from '../../../src/engine/finish';

const blank = (id: string) => ({
  id, episode: 1, heading: { intExt: 'EXT' as const, place: 'Beach', time: 'DAY' as const }, storyLocation: 'Beach', participants: [], objective: '', action: '', dialogue: [],
  turningPoint: '', estMinutes: 3, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false,
  kind: 'interview' as const, basis: 'sourced' as const, contributorIds: [] as string[], evidenceIds: [] as string[], intentionalDiscontinuity: false,
});
/** Two contributors, the coach with approval over how they appear. */
export const doc = (s: GameState, year: number): Project => {
  const p = unfunded(buildProject(s, { title: `Tide Keepers ${year + 1}`, format: 'documentary-short', medium: 'live-action', genres: ['documentary', 'sports'], runtime: 15 }, [], []));
  p.contributors.push({ id: 'ct1', name: 'A Lifeguard (Fixture)', role: 'Lifeguard', consent: 'not-asked' }, { id: 'ct2', name: 'A Coach (Fixture)', role: 'Coach', consent: 'not-asked', restrictions: ['approval'] } as never);
  p.evidence.push({ id: 'ev1', claim: 'The club has run since 1952.', status: 'established', sourceNote: 'Club archive', verified: false });
  p.scenes.push(
    { ...blank('a1'), contributorIds: ['ct1'] } as never,
    { ...blank('a2'), contributorIds: ['ct2'] } as never,
    { ...blank('a3'), kind: 'actuality', evidenceIds: ['ev1'] } as never,
  );
  return p;
};
/** Once the script is approved: every contributor asked for consent. */
export const askAll = (s: GameState, p: Project) => { for (const c of p.contributors) if (c.consent === 'not-asked') requestConsent(s, p, c.id); };
/** Each day, once research or fact checking is done: every claim marked as checked (ScriptViews.tsx "Mark As Checked"). */
export const checkClaims = (_s: GameState, p: Project) => {
  if (!p.tasks.some((t) => (t.kind === 'doc:factcheck' || t.kind === 'doc:research') && t.status === 'done')) return;
  for (const e of p.evidence) if (e.status !== 'dramatized') e.verified = true;
};

/** Each day, once the lifeguard's interview is filmed and before picture is locked: they withdraw (unscripted.ts withdrawRelease). */
const lifeguardWithdraws = (s: GameState, p: Project) => {
  checkClaims(s, p);
  const c = p.contributors.find((x) => x.id === 'ct1');
  if (!c || c.consent !== 'given' || p.edit.pictureLocked || !((p.captures.find((x) => x.sceneId === 'a1')?.captured ?? 0) > 0)) return;
  withdrawRelease(s, p, 'ct1');
};

/** Each day before picture is locked: the scenes of anyone who approves how they appear cut from the edit, so there is no cut to show them. */
const cutApprovers = (s: GameState, p: Project) => {
  checkClaims(s, p);
  if (p.edit.pictureLocked) return;
  for (const c of p.contributors.filter((x) => x.consent === 'given' && x.restrictions?.includes('approval'))) {
    for (const sc of editScenes(p).filter((x) => x.contributorIds.includes(c.id))) try { cutFromEdit(s, p, sc.id); } catch { /* locked */ }
  }
};

const measure = (_s: GameState, projects: Project[]) => ({
  redactions: projects.reduce((a, p) => a + p.tasks.filter((t) => t.kind === 'doc:redact').length, 0),
  runtime: projects.reduce((a, p) => a + (p.delivered?.runtimeMin ?? 0), 0),
  consentGiven: projects.reduce((a, p) => a + p.contributors.filter((c) => c.consent === 'given').length, 0),
  cutApproved: projects.reduce((a, p) => a + p.contributors.filter((c) => (c as { cutApproval?: { status: string } }).cutApproval?.status === 'approved').length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'request-consent', features: ['action:documentary.requestConsent'], decision: 'Ask every contributor for their consent to appear',
    reads: ['src/engine/documentary.ts#requestConsent', 'src/engine/finish.ts#deliveryBlockers'],
    seeds: 20, base: { project: doc, beforeManage: checkClaims }, variant: { project: doc, decide: askAll, beforeManage: checkClaims }, measure,
    bites: ['consentGiven'], downstream: ['delivered', 'revenue'],
  },
  {
    id: 'show-cut', features: ['action:documentary-actions.showCut'], decision: 'Show the locked cut to a contributor who approves how they appear, rather than cutting their scenes',
    reads: ['src/engine/documentary-actions.ts#showCut', 'src/engine/finish.ts#deliveryBlockers'],
    // The career shows the cut itself (career.ts); the base cuts the scenes out first. Approval is drawn with consent, so 120 careers.
    seeds: 120, base: { project: doc, decide: askAll, beforeManage: cutApprovers }, variant: { project: doc, decide: askAll, beforeManage: checkClaims }, measure,
    bites: ['cutApproved'], downstream: ['runtime', 'daysToDeliver'],
  },
  {
    id: 'withdraw-release', features: ['action:unscripted.withdrawRelease'], decision: 'A filmed contributor withdraws from the documentary before picture is locked',
    reads: ['src/engine/unscripted.ts#withdrawRelease', 'src/engine/finish.ts#deliveryBlockers', 'src/engine/finish.ts#editScenes'],
    // The redaction is an editor's day or two against careers whose documentaries vary widely, so 120 careers (November 15, 2026: at 20 the intervals touched none).
    seeds: 120, base: { project: doc, decide: askAll, beforeManage: checkClaims }, variant: { project: doc, decide: askAll, beforeManage: lifeguardWithdraws }, measure,
    // A scene with nobody left in it who agreed leaves the cut (unscripted.ts withdrawRelease), so the film delivered is shorter.
    bites: ['redactions'], downstream: ['runtime', 'daysToDeliver', 'spent'],
  },
];
