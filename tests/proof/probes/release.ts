// Selling and releasing a finished film: the release plan, your own routes, licence proposals and what they ask.
import type { Probe } from '../probe';
import { BUYERS, buyerValue, proposeLicence, releaseYourself, setReleasePlan } from '../../../src/engine/release-plan';
import { addDaysToKey, dateKey } from '../../../src/engine/time';
import type { GameState, Project, ReleasePlan } from '../../../src/engine/types';

const today = (s: GameState) => dateKey(s.now, 'Europe/London');
const plan = (s: GameState, over: Partial<ReleasePlan>): Omit<ReleasePlan, 'proposals'> => ({ routes: ['transactional'], territories: ['GB'], date: addDaysToKey(today(s), 20), festivalUntil: null, version: 'subtitled', promo: 0, ...over });
/** The player runs one route themselves, as the Release Plan page lets them. */
const selfRelease = (over: Partial<ReleasePlan> = {}) => (s: GameState, p: Project) => {
  setReleasePlan(s, p, plan(s, over));
  try { releaseYourself(s, p, (over.routes ?? ['transactional'])[0] as 'transactional'); } catch { /* refused: what it says is counted as no release */ }
};
/** The player proposes a licence to the first buyer of a route, asking what the plan page suggests times `ask`. */
const propose = (route: 'distributor-sales' | 'broadcast-licence', ask = 1, exclusive = false) => (s: GameState, p: Project) => {
  setReleasePlan(s, p, plan(s, { routes: [route] }));
  try { proposeLicence(s, p, { route, buyer: BUYERS[route][0], territories: ['GB'], ask: Math.max(1000, buyerValue(p, route, ['GB'], exclusive) * ask), exclusive }); } catch { /* refused */ }
};

export const PROBES: Probe[] = [
  {
    id: 'self-release-stores',
    features: ['action:release-plan.setReleasePlan', 'action:release-plan.releaseYourself', 'field:ReleasePlan.tsx#{PLAN_ROUTES[r].label}#1'],
    decision: 'Put the film in the digital stores yourself, rather than only announcing a release',
    reads: ['src/engine/release-plan.ts#setReleasePlan', 'src/engine/release-plan.ts#releaseYourself'],
    base: { takeDistribution: false },
    variant: { takeDistribution: false, afterDelivery: selfRelease() },
    bites: ['revenue'],
    downstream: ['money', 'spent'],
  },
  {
    id: 'promotion-budget',
    features: ['field:ReleasePlan.tsx#"Promotion Budget"#1'],
    decision: 'Spend $3,000 promoting your own release',
    reads: ['src/engine/release-plan.ts#selfCosts'],
    base: { takeDistribution: false, afterDelivery: selfRelease() },
    variant: { takeDistribution: false, afterDelivery: selfRelease({ promo: 3000 }) },
    bites: ['spent'],
    downstream: ['revenue', 'money'],
  },
  {
    id: 'licence-proposal',
    features: ['action:release-plan.proposeLicence', 'field:ReleasePlan.tsx#{`${label}: Buyer`}#1'],
    decision: 'Send a distributor a licence proposal',
    reads: ['src/engine/release-plan.ts#proposeLicence', 'src/engine/release-plan.ts#answerProposal'],
    variant: { afterDelivery: propose('distributor-sales') },
    bites: ['licenceDeals'],
    downstream: ['revenue', 'money'],
  },
  {
    id: 'licence-ask',
    features: ['field:ReleasePlan.tsx#{`${label}: Your Ask`}#1'],
    decision: 'Ask twice what the buyer would pay',
    seeds: 100,
    reads: ['src/engine/release-plan.ts#answerProposal'],
    base: { afterDelivery: propose('distributor-sales', 1) },
    variant: { afterDelivery: propose('distributor-sales', 2) },
    bites: ['licenceDeals'],
    downstream: ['releaseDelay', 'licenceFee', 'revenue', 'money'],
  },
  {
    id: 'licence-exclusive',
    features: ['field:ReleasePlan.tsx#{`${label}: Exclusive`}#1'],
    decision: 'Offer the licence as exclusive',
    seeds: 100,
    reads: ['src/engine/release-plan.ts#buyerValue'],
    base: { afterDelivery: propose('distributor-sales', 1, false) },
    variant: { afterDelivery: propose('distributor-sales', 1, true) },
    bites: ['licenceFee'],
    downstream: ['money'],
  },
  {
    id: 'decline-distribution',
    features: ['action:finish.declineDistribution'],
    decision: 'Turn down the distributors\' offers',
    reads: ['src/engine/finish.ts#declineDistribution'],
    variant: { declineOffers: true },
    bites: ['offersDeclined', 'distributed'],
    downstream: ['revenue', 'money'],
  },
];
