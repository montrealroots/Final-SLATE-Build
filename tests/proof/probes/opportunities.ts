// Proposals (opportunities.ts): a commissioner who saw a well-received film offers to fund the next of its kind. Taking
// it starts a commissioned project with its money and its deadline (finance.ts finance-deadline).
import type { Probe } from '../probe';
import { acceptOpportunity, declineOpportunity } from '../../../src/engine/opportunities';
import type { GameState } from '../../../src/engine/types';

const answer = (how: 'accept' | 'decline') => (s: GameState) => {
  for (const o of (s.opportunities ?? []).filter((x) => x.status === 'open' && x.expiresAt > s.now)) {
    if (how === 'accept') acceptOpportunity(s, o.id, `Commissioned ${o.id}`); else declineOpportunity(s, o.id);
  }
};
const measure = (s: GameState) => ({
  proposalsAccepted: (s.opportunities ?? []).filter((o) => o.status === 'accepted').length,
  proposals: (s.opportunities ?? []).length,
  commissioned: s.projects.filter((p) => p.fromOpportunity).length,
  commissionMoney: s.projects.filter((p) => p.fromOpportunity).reduce((a, p) => a + (p.finance?.deals ?? []).reduce((b, d) => b + d.received - d.repaid, 0), 0),
});

export const PROBES: Probe[] = [
  {
    id: 'accept-opportunity',
    features: ['action:opportunities.acceptOpportunity'],
    decision: 'Take each commissioner\'s proposal that a well-received film brings, or decline it',
    reads: ['src/engine/opportunities.ts#acceptOpportunity', 'src/engine/finance.ts#acceptDeal'],
    seeds: 30,
    base: { years: 3, daily: answer('decline') },
    variant: { years: 3, daily: answer('accept') },
    measure,
    bites: ['proposalsAccepted', 'commissioned'],
    downstream: ['commissionMoney', 'money'],
  },
  {
    id: 'decline-opportunity',
    features: ['action:opportunities.declineOpportunity'],
    decision: 'Decline each commissioner\'s proposal rather than take it',
    reads: ['src/engine/opportunities.ts#declineOpportunity'],
    seeds: 30,
    base: { years: 3, daily: answer('accept') },
    variant: { years: 3, daily: answer('decline') },
    measure,
    bites: ['proposalsAccepted', 'commissioned'],
    downstream: ['commissionMoney', 'money'],
  },
];
