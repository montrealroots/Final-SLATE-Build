// Making the film: who you hire on their counter-terms, how long you cut, and whether you lock and deliver.
import type { Probe } from '../probe';

export const PROBES: Probe[] = [
  {
    id: 'counter-offers',
    features: ['action:hiring.acceptCounter', 'action:hiring.declineCounter'],
    decision: 'Take a counter-offer from someone you offered work, or turn it down',
    reads: ['src/engine/hiring.ts#acceptCounter', 'src/engine/hiring.ts#declineCounter'],
    base: { castRate: 0.8 },
    variant: { castRate: 0.8, counters: 'decline' },
    bites: ['countersDeclined'],
    downstream: ['spent', 'quality.craft', 'overall', 'daysToDeliver'],
  },
  {
    id: 'offered-rate',
    features: ['action:hiring.makeOffer'],
    decision: 'Offer performers a little less than they ask (92%)',
    reads: ['src/engine/hiring.ts#makeOffer'],
    variant: { castRate: 0.92 },
    bites: ['castRates'],
    downstream: ['spent', 'countersSeen', 'money'],
  },
  {
    id: 'cut-passes',
    features: ['action:edit-actions.startCutPass'],
    decision: 'Ask for two more passes of the cut before locking the picture',
    reads: ['src/engine/edit-actions.ts#startCutPass'],
    variant: { cutPasses: 2 },
    bites: ['quality.editing', 'daysToDeliver'],
    downstream: ['overall', 'reception', 'revenue', 'spent'],
  },
  {
    id: 'lock-picture',
    features: ['action:edit-actions.lockPicture'],
    decision: 'Lock the picture when the cut allows it, or keep it open',
    reads: ['src/engine/edit-actions.ts#lockPicture'],
    variant: { lock: false },
    bites: ['delivered'],
    downstream: ['released', 'revenue', 'standing.producing'],
  },
  {
    id: 'deliver',
    features: ['action:finish.deliver'],
    decision: 'Deliver the locked film, or hold it back',
    reads: ['src/engine/finish.ts#deliver'],
    variant: { deliver: false },
    bites: ['delivered'],
    downstream: ['released', 'revenue', 'standing.producing'],
  },
];
