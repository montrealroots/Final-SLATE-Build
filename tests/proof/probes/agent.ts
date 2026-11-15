// Your agent (representation.ts): notice given, a mandate renewed or turned down. Each career signs with Vale as the
// agent probe does (career-wide.ts), and one thing about the mandate changes; what an agent does is find outside work
// and take commission on it (jobs.ts), so that's what each later measure reads.
import type { Probe } from '../probe';
import { approachAgent, declineMandate, giveNotice, renewMandate, renewRefusal, signWith, submitThrough, submitRefusal } from '../../../src/engine/representation';
import { DAY, processUntil } from '../../engine-api';
import { acceptDeal, approachBacker, backerOptions } from '../../../src/engine/finance';
import type { FinanceDeal, Project } from '../../../src/engine/types';
import type { GameState } from '../../../src/engine/types';

const DAYMS = 86_400_000;
/** Each day: approach Vale until they offer, then sign; or, `decline`, turn the offer down. */
const agentDay = (answer: 'sign' | 'decline') => (s: GameState) => {
  const r = s.representation;
  if (r?.approaches.some((a) => a.status === 'signed' || a.status === 'refused')) return;
  const offered = r?.approaches.find((a) => a.status === 'offered');
  if (offered) { (answer === 'sign' ? signWith : declineMandate)(s, offered.agentId); return; }
  if (r?.approaches.some((a) => a.status === 'asked')) return;
  try { approachAgent(s, 'vale'); } catch { /* not yet: a script to show first */ }
};
const both = (...fns: ((s: GameState, day: number) => void)[]) => (s: GameState, day: number) => { for (const f of fns) f(s, day); };
/** Notice given 60 days after signing. */
const noticeAfter60 = (s: GameState) => { const c = s.representation?.current; if (c && !c.noticeUntil && s.now - c.signedAt > 60 * DAYMS) giveNotice(s); };
/** Renewed as soon as the agent says they would. */
const renewWhenAsked = (s: GameState) => { if (s.representation?.current && !renewRefusal(s)) renewMandate(s); };

/**
 * Before the money is raised, once represented: the investor approached, through the agent (`via`) or directly, and
 * their offer taken. A career signs with Vale in its first months, so the later years' shorts are the ones submitted.
 */
const investorVia = (via: boolean) => (s: GameState, p: Project) => {
  let d: FinanceDeal;
  if (via) { if (submitRefusal(s, p, 'investor')) return; d = submitThrough(s, p, 'investor'); }
  else { if (!s.representation?.current || !backerOptions(s, p).find((o) => o.kind === 'investor')?.ready) return; d = approachBacker(s, p, 'investor'); }
  for (let i = 0; i < 30 && d.status === 'considering'; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000);
  if (d.status === 'offered') acceptDeal(s, p, d.id);
};

const measure = (s: GameState) => ({
  submitted: s.projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.via).length, 0),
  investorIn: s.projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'investor' && d.status === 'accepted').reduce((b, d) => b + d.amount, 0), 0),
  dealCommission: s.projects.reduce((a, p) => a + p.obligations.filter((o) => o.ref?.startsWith('commission:')).reduce((b, o) => b + o.settled, 0), 0),
  viaAgent: (s.jobs ?? []).filter((j) => j.viaAgent).length,
  commission: (s.jobs ?? []).filter((j) => j.viaAgent && j.status === 'done').reduce((a, j) => a + Math.round(j.dayRate * j.attended.length * j.viaAgent!.rate), 0),
  represented: Number(!!s.representation?.current),
  renewals: s.representation?.current?.renewed ?? 0,
});

export const PROBES: Probe[] = [
  {
    id: 'agent-notice',
    features: ['action:representation.giveNotice', 'scheduled:agent-notice-end'],
    decision: 'Give your agent notice two months after signing',
    reads: ['src/engine/representation.ts#giveNotice', 'src/engine/jobs.ts#acceptJob'],
    base: { years: 3, daily: agentDay('sign') },
    variant: { years: 3, daily: both(agentDay('sign'), noticeAfter60) },
    measure,
    // Whether you're represented at the career's end isn't the measure: an unrenewed mandate lapses in either.
    bites: ['viaAgent'],
    downstream: ['jobsOffered', 'jobPay', 'commission', 'money'],
  },
  {
    id: 'agent-renew',
    features: ['action:representation.renewMandate', 'scheduled:agent-renewal', 'scheduled:agent-term-end'],
    decision: 'Renew with your agent when their twelve months come up, or let it lapse',
    reads: ['src/engine/representation.ts#renewMandate', 'src/engine/jobs.ts#acceptJob'],
    base: { years: 3, daily: agentDay('sign') },
    variant: { years: 3, daily: both(agentDay('sign'), renewWhenAsked) },
    measure,
    bites: ['renewals', 'represented'],
    downstream: ['viaAgent', 'jobsOffered', 'jobPay', 'money'],
  },
  {
    id: 'agent-decline',
    features: ['action:representation.declineMandate'],
    decision: 'Turn down the agent\'s offer to represent you',
    reads: ['src/engine/representation.ts#declineMandate', 'src/engine/jobs.ts#acceptJob'],
    base: { years: 3, daily: agentDay('sign') },
    variant: { years: 3, daily: agentDay('decline') },
    measure,
    bites: ['viaAgent'],
    downstream: ['jobsOffered', 'jobPay', 'money'],
  },
  {
    id: 'submit-through-agent',
    features: ['action:representation.submitThrough'],
    decision: 'Have your agent submit the short to an investor, rather than approaching them yourself',
    reads: ['src/engine/representation.ts#submitThrough', 'src/engine/finance.ts#payCommission'],
    base: { years: 3, daily: agentDay('sign'), decide: investorVia(false) },
    variant: { years: 3, daily: agentDay('sign'), decide: investorVia(true) },
    measure,
    bites: ['submitted'],
    downstream: ['dealCommission', 'investorIn', 'money'],
  },
];
