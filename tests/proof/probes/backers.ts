// Backers (finance.ts, negotiation-actions.ts): an investor's offer refused, or taken after asking for better terms.
// Each career approaches an investor for the year's short before it raises the rest (career.ts raise, from its own money
// here), so the one thing that differs is what is done with the investor's offer.
import type { Probe } from '../probe';
import { DAY, processUntil } from '../../engine-api';
import { acceptDeal, approachBacker, backerOptions, refuseDeal } from '../../../src/engine/finance';
import { askForBetterTerms } from '../../../src/engine/negotiation-actions';
import { betterTerms } from '../../../src/engine/negotiation';
import type { GameState, Project } from '../../../src/engine/types';

/** Ask the investor; wait for their offer; then accept it, refuse it, or ask for a smaller share of income first. */
const investor = (how: 'accept' | 'refuse' | 'better') => (s: GameState, p: Project) => {
  if (!backerOptions(s, p).find((o) => o.kind === 'investor')?.ready) return;
  const d = approachBacker(s, p, 'investor');
  for (let i = 0; i < 30 && d.status === 'considering'; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000);
  if (d.status !== 'offered') return;
  if (how === 'refuse') { refuseDeal(s, p, d.id); return; }
  if (how === 'better') {
    const term = betterTerms(d).find((t) => t.term === 'share') ?? betterTerms(d)[0];
    if (term) { askForBetterTerms(s, p, d.id, term.term); for (let i = 0; i < 20 && d.counter && !d.counter.outcome; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000); }
    if (d.status !== 'offered') return;
  }
  acceptDeal(s, p, d.id);
};
const measure = (_s: GameState, projects: Project[]) => ({
  investorIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'investor' && d.status === 'accepted').reduce((b, d) => b + d.amount, 0), 0),
  investorShare: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'investor' && d.status === 'accepted').reduce((b, d) => b + d.terms.incomeShare, 0), 0),
  refused: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.status === 'refused').length, 0),
  asked: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.counter).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'refuse-deal',
    features: ['action:finance.refuseDeal'],
    decision: 'Turn down the investor\'s offer and pay for the short yourself',
    reads: ['src/engine/finance.ts#refuseDeal'],
    base: { decide: investor('accept') },
    variant: { decide: investor('refuse') },
    measure,
    bites: ['refused', 'investorIn'],
    downstream: ['ownIn', 'money', 'leftInProjects'],
  },
  {
    id: 'better-terms',
    features: ['action:negotiation-actions.askForBetterTerms', 'scheduled:finance-counter'],
    decision: 'Ask the investor for a smaller share of income before taking their offer',
    reads: ['src/engine/negotiation-actions.ts#askForBetterTerms'],
    base: { decide: investor('accept') },
    variant: { decide: investor('better') },
    measure,
    bites: ['asked', 'investorShare'],
    downstream: ['money', 'investorIn', 'ownIn'],
  },
];
