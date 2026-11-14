// Career-wide choices: an agent, a studio's first-look deal, and a project shelved and taken up again.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import type { StudioProfile } from '../../../src/engine/studios';
import { approachAgent, signWith } from '../../../src/engine/representation';
import { acceptFirstLook, askMoreOverhead, declineFirstLook, endFirstLook, firstLooks } from '../../../src/engine/first-look';
import { resumeProject, shelveProject } from '../../../src/engine/shelve';
import { DAY, processUntil } from '../../engine-api';

/** Approaches the first agent until one offers, then signs. */
const withAgent = (agentId: string) => (s: GameState) => {
  const r = s.representation;
  if (r?.approaches.some((a) => a.status === 'signed')) return;
  const offered = r?.approaches.find((a) => a.status === 'offered');
  if (offered) { signWith(s, offered.agentId); return; }
  if (r?.approaches.some((a) => a.status === 'asked')) return;
  try { approachAgent(s, agentId); } catch { /* not yet: a script to show first */ }
};
const answerFirstLooks = (how: 'accept' | 'decline' | 'ask' | 'accept-then-end') => (s: GameState) => {
  for (const fl of firstLooks(s)) {
    if (fl.status === 'active' && how === 'accept-then-end' && s.now - (fl.startsAt ?? s.now) > 90 * DAY) endFirstLook(s, fl.id);
    if (fl.status !== 'offered') continue;
    if (how === 'decline') declineFirstLook(s, fl.id);
    else if (how === 'ask' && !fl.counter) askMoreOverhead(s, fl.id);
    else if (how !== 'ask' || fl.counter?.outcome) { try { acceptFirstLook(s, fl.id); } catch { /* one running already */ } }
  }
};
/** Labelled fixture studios (as tests/first-look.test.ts's), drama and thriller, where the career's shorts fit. */
const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
export const STUDIOS: StudioProfile[] = [
  { c: 'company:fixture-drama', name: 'Long Light Pictures (Fixture)', n: 8, g: [['Drama', 10], ['Thriller', 6]], m: EVEN, ann: {} },
  { c: 'company:fixture-broad', name: 'Meridian (Fixture)', n: 12, g: [['Drama', 6], ['Comedy', 6], ['Action', 6]], m: EVEN, ann: {} },
];
const measure = (s: GameState) => ({
  viaAgent: (s.jobs ?? []).filter((j) => j.viaAgent).length,
  commission: (s.jobs ?? []).filter((j) => j.viaAgent && j.status === 'done').reduce((a, j) => a + Math.round(j.dayRate * j.attended.length * (j.viaAgent!.rate)), 0),
  firstLookActive: firstLooks(s).filter((f) => f.status === 'active' || f.status === 'ended' || f.status === 'ended-early').length,
  firstLookDeclined: firstLooks(s).filter((f) => f.status === 'declined').length,
  overheadAsked: firstLooks(s).filter((f) => f.counter).length,
  firstLookEnded: firstLooks(s).filter((f) => f.status === 'ended-early').length,
});
/** Shelves the year's project once its script is approved, and takes it up again two months later. */
const shelveTwoMonths = (s: GameState, p: Project) => { shelveProject(s, p); processUntil(s, s.now + 60 * DAY, 'tick', 5_000_000); resumeProject(s, p); };

export const PROBES: Probe[] = [
  { id: 'agent', features: ['action:representation.approachAgent', 'action:representation.signWith', 'scheduled:agent-answer'], decision: 'Approach an agent and sign when they offer',
    reads: ['src/engine/representation.ts#approachAgent', 'src/engine/representation.ts#signWith'], base: { years: 3 }, variant: { years: 3, daily: withAgent('vale') }, measure,
    bites: ['viaAgent'], downstream: ['jobsOffered', 'commission', 'jobPay', 'money'] },
  { id: 'first-look-accept', features: ['action:first-look.acceptFirstLook', 'scheduled:first-look-overhead'], decision: 'Sign the first-look deal a studio offers',
    reads: ['src/engine/first-look.ts#acceptFirstLook'], base: { years: 3, studios: STUDIOS }, variant: { years: 3, studios: STUDIOS, daily: answerFirstLooks('accept') }, measure,
    bites: ['firstLookActive'], downstream: ['money', 'revenue'] },
  { id: 'first-look-decline', features: ['action:first-look.declineFirstLook'], decision: 'Decline a first-look deal rather than sign it',
    reads: ['src/engine/first-look.ts#declineFirstLook'], base: { years: 3, studios: STUDIOS, daily: answerFirstLooks('accept') }, variant: { years: 3, studios: STUDIOS, daily: answerFirstLooks('decline') }, measure,
    bites: ['firstLookDeclined', 'firstLookActive'], downstream: ['money'] },
  { id: 'first-look-overhead', features: ['action:first-look.askMoreOverhead', 'scheduled:first-look-counter'], decision: 'Ask for more overhead before signing a first-look deal',
    reads: ['src/engine/first-look.ts#askMoreOverhead'], base: { years: 3, studios: STUDIOS, daily: answerFirstLooks('accept') }, variant: { years: 3, studios: STUDIOS, daily: answerFirstLooks('ask') }, measure,
    bites: ['overheadAsked'], downstream: ['money', 'firstLookActive'] },
  { id: 'first-look-end', features: ['action:first-look.endFirstLook'], decision: 'End a first-look deal after three months',
    reads: ['src/engine/first-look.ts#endFirstLook'], base: { years: 3, studios: STUDIOS, daily: answerFirstLooks('accept') }, variant: { years: 3, studios: STUDIOS, daily: answerFirstLooks('accept-then-end') }, measure,
    bites: ['firstLookEnded'], downstream: ['money'] },
  { id: 'shelve-resume', features: ['action:shelve.shelveProject', 'action:shelve.resumeProject'], decision: 'Shelve the film after its script is approved and take it up two months later',
    reads: ['src/engine/shelve.ts#shelveProject', 'src/engine/shelve.ts#resumeProject'], variant: { decide: shelveTwoMonths },
    bites: ['daysToDeliver', 'delivered'], downstream: ['revenue', 'money', 'released'] },
];
