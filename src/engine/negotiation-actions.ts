// Asking a backer for better terms (negotiation.ts says how negotiation works and why). Loaded with the Budget page,
// not at startup; the backer's answer is handled at startup, in negotiation.ts.
import { COUNTER_DAYS, NOT_NEGOTIABLE, betterTerms, type BetterTerm } from './negotiation';
import { theBacker } from './backer-words';
import { deals } from './finance';
import { addLog, schedule } from './state';
import { DAY } from './time';
import type { FinanceDeal, GameState, Project } from './types';

/** Why you can't ask this backer for better terms now, or null when you can. */
export function askRefusal(state: GameState, d: FinanceDeal): string | null {
  if (d.status !== 'offered') return 'That offer is no longer open.';
  if (NOT_NEGOTIABLE.has(d.kind)) return d.kind === 'grant' ? "A grant's terms are the fund's rules; they aren't negotiated." : 'These terms were agreed when your story began.';
  if (d.counter) return d.counter.outcome ? 'You have asked them once already.' : 'They are considering what you asked.';
  if (d.expiresAt !== undefined && state.now + COUNTER_DAYS * DAY > d.expiresAt) return `There isn't time: they take ${COUNTER_DAYS} days to answer, and the offer lapses first.`;
  return null;
}

/** Ask for one better term. They answer in COUNTER_DAYS; meanwhile the offer can't be accepted as it stands. */
export function askForBetterTerms(state: GameState, p: Project, dealId: string, term: BetterTerm): void {
  const d = deals(p).find((x) => x.id === dealId);
  if (!d) throw new Error('That offer is no longer open.');
  const why = askRefusal(state, d);
  if (why) throw new Error(why);
  if (!betterTerms(d).some((x) => x.term === term)) throw new Error("They don't offer that term, so there is nothing to ask.");
  d.counter = { term, askedAt: state.now, answerAt: state.now + COUNTER_DAYS * DAY };
  schedule(state, d.counter.answerAt, 'finance-counter', { projectId: p.id, dealId: d.id }, { attention: 'notify', priority: 40 });
  addLog(state, `You asked ${theBacker(d)} for better terms on ${p.title}. They will answer in about ${COUNTER_DAYS} days.`, 'money', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'budget' } });
}
