// The career's own loop: raising money, selling or releasing, taking money home, and outside work.
import type { Probe } from '../probe';
import { withAgent } from './career-wide';

export const PROBES: Probe[] = [
  {
    id: 'own-money-or-backer',
    features: ['action:personal.putInOwnMoney', 'action:finance.approachBacker', 'action:finance.acceptDeal'],
    decision: 'Pay for the film yourself, or ask a backer for the money first',
    reads: ['src/engine/personal.ts#putInOwnMoney', 'src/engine/finance.ts#approachBacker', 'src/engine/finance.ts#acceptDeal'],
    variant: { ownShare: 0 },
    bites: ['ownIn', 'backerDeals'],
    downstream: ['money', 'moneyChange', 'revenue'],
  },
  {
    id: 'distributor-or-self',
    features: ['action:finish.acceptDistribution'],
    decision: 'Take a distributor\'s guarantee, or release it yourself',
    reads: ['src/engine/finish.ts#acceptDistribution'],
    variant: { takeDistribution: false },
    bites: ['distributed'],
    downstream: ['revenue', 'money'],
  },
  {
    id: 'release-or-not',
    features: ['action:finish.planRelease'],
    decision: 'Release a finished film, or keep it on the shelf',
    reads: ['src/engine/finish.ts#planRelease'],
    variant: { release: false },
    bites: ['released'],
    downstream: ['revenue', 'money'],
  },
  {
    id: 'take-money-home',
    features: ['action:personal.takeHome'],
    decision: 'Take your earnings home from a finished film, or leave them in its account',
    reads: ['src/engine/personal.ts#takeHome'],
    variant: { takeHome: false },
    bites: ['leftInProjects'],
    downstream: ['money'],
  },
  {
    id: 'outside-work',
    features: ['action:jobs.acceptJob'],
    decision: 'Take the outside work you are offered',
    reads: ['src/engine/jobs.ts#acceptJob', 'src/engine/jobs.ts#pay'],
    variant: { takeJobs: false },
    bites: ['jobsDone', 'jobPay'],
    // The pay reaches your bank (money). Later offers' count and rate moved too until November 16, 2026, but only because
    // one counter numbered everything, so the work taken renumbered every later offer: since each kind of id counts on its
    // own, they don't move at all.
    downstream: ['money', 'offeredDayRate', 'jobsOffered'],
  },
  {
    id: 'ask-better-rate',
    features: ['action:jobs.askBetterRate', 'scheduled:job-counter'],
    decision: 'Ask once for a better rate before taking outside work',
    reads: ['src/engine/jobs.ts#askBetterRate', 'src/engine/reputation.ts#hasLeverage'],
    // With an agent, who gets a client the higher rate (jobs.ts job-counter): without one the young career asked with
    // no leverage, was agreed one time in eight, and the pay that followed was lost in the noise (until November 14, 2026).
    seeds: 60,
    base: { daily: withAgent('vale') },
    variant: { jobAnswer: 'ask', daily: withAgent('vale') },
    bites: ['ratesAgreed'],
    downstream: ['jobPay', 'money', 'jobsDone'],
  },
  {
    id: 'decline-job',
    features: ['action:jobs.declineJob'],
    decision: 'Turn down the outside work you are offered',
    reads: ['src/engine/jobs.ts#declineJob'],
    variant: { jobAnswer: 'decline' },
    bites: ['jobsDeclined', 'jobsDone'],
    downstream: ['jobPay', 'money'],
  },
  {
    id: 'withdraw-job',
    features: ['action:jobs.withdrawJob'],
    decision: 'Take outside work and then withdraw from it',
    reads: ['src/engine/jobs.ts#withdrawJob', 'src/engine/jobs.ts#reliability'],
    variant: { jobAnswer: 'withdraw' },
    bites: ['jobsWithdrawn', 'jobsDone'],
    downstream: ['jobsOffered', 'offeredDayRate', 'jobPay', 'money'],
  },
];
