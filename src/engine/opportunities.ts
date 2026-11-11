// Opportunities (SLATE-18-03, November 8, 2026). Work only ever started from the player. Now a delivered project that was
// well received can bring one proposal, tied to it and saying why: a commissioner who saw it offers to fund a new project
// of the same kind, with an amount and a delivery deadline. It is open for a month. Accepting starts an ordinary project,
// funded by that commission on the commissioner's terms, so it has to be written, cast, staffed, shot and delivered like
// any other, and its deadline is enforced (finance.ts finance-deadline). There is at most one per delivered project, and
// whether one comes is decided from the project's reception and the world seed, so they are neither guaranteed nor
// endless. Thresholds and amounts are game calibration.
import { acceptDeal } from './finance';
import { createProject } from './projects';
import { stream } from './rng';
import { careerStudio } from './studios';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { FinanceDeal, GameState, Opportunity, Project } from './types';

export const OPPORTUNITY_DELAY_DAYS = 45;
export const OPPORTUNITY_OPEN_DAYS = 30;
export const OPPORTUNITY_DELIVER_DAYS = 540;
const COMMISSIONERS = ['Northgate Broadcasting', 'Arclight Streaming', 'Kingfisher Films', 'Palisade Pictures'];

/** On delivery: a proposal may follow, some weeks on. */
export function scheduleOpportunity(state: GameState, p: Project): void {
  if (p.fromOpportunity) return; // work that came from a proposal doesn't chain another
  schedule(state, state.now + OPPORTUNITY_DELAY_DAYS * DAY, 'opportunity', { projectId: p.id }, { attention: 'notify', priority: 50 });
}

registerHandler('opportunity', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  if (!p?.delivered || !p.quality || (state.opportunities ?? []).some((o) => o.fromProjectId === p.id)) return { suppressInterrupt: true };
  // Prizes it won count as well as its reception, five points each up to fifteen (November 10, 2026: until then a win
  // changed nothing here). Game calibration.
  const wins = state.editions.reduce((n, e) => n + e.entries.filter((x) => x.projectId === p.id && x.status === 'won').length, 0);
  const reception = p.quality.reception + Math.min(15, wins * 5);
  const r = stream(state.seed, 'opportunity', p.id);
  // Only work that was well received draws one, and not always: half the time at 65, nearly always at 85.
  if (reception < 60 || r() > (reception - 55) / 32) return { suppressInterrupt: true };
  // A followed studio may be the commissioner (docs/WORLD.md, "Careers"), drawn apart from `r` so the rest is as before.
  const drawn = COMMISSIONERS[Math.floor(r() * COMMISSIONERS.length)];
  const commissioner = careerStudio(state, `opportunity:${p.id}`) ?? drawn;
  const amount = Math.round((40_000 + (reception - 60) * 6000) / 1000) * 1000;
  const o: Opportunity = {
    id: newId(state, 'op'), fromProjectId: p.id, commissioner, amount, format: p.axes.format, medium: p.axes.medium, technique: p.axes.technique,
    expiresAt: state.now + OPPORTUNITY_OPEN_DAYS * DAY, status: 'open',
    reason: `${commissioner} saw ${p.title} and liked how it was received${wins ? ` and what it won` : ''}. They propose to fund your next project of the same kind.`,
  };
  (state.opportunities ??= []).push(o);
  schedule(state, o.expiresAt, 'opportunity-expire', { id: o.id }, { attention: 'silent', priority: 60 });
  const text = `${commissioner} proposes to fund a new project after ${p.title}. The proposal is open for ${OPPORTUNITY_OPEN_DAYS} days.`;
  addLog(state, text, 'money', { route: { view: 'home' } });
  return { message: text };
});

registerHandler('opportunity-expire', (state, ev) => {
  const o = (state.opportunities ?? []).find((x) => x.id === ev.payload.id);
  if (o?.status === 'open') o.status = 'lapsed';
  return { suppressInterrupt: true };
});

/** Accept: a new project on the commission's terms, funded and with its delivery deadline. */
export function acceptOpportunity(state: GameState, id: string, title: string): Project {
  const o = (state.opportunities ?? []).find((x) => x.id === id);
  if (!o || o.status !== 'open' || o.expiresAt <= state.now) throw new Error('That proposal is no longer open.');
  const p = createProject(state, { title, scenarioId: 'low', axes: { format: o.format, medium: o.medium, technique: o.technique } });
  p.fromOpportunity = o.id;
  const deal: FinanceDeal = {
    id: newId(state, 'fd'), kind: 'commissioner', backer: o.commissioner, amount: o.amount, status: 'offered', askedAt: state.now, received: 0, repaid: 0,
    reason: o.reason, terms: { recoup: 0, incomeShare: 0.85, approvalRights: ['Picture Approval'], credit: 'Commissioned By', onDelivery: Math.round(o.amount * 0.2), deliverBy: state.now + OPPORTUNITY_DELIVER_DAYS * DAY },
  };
  (p.finance ??= { estimate: p.funding.fund, target: o.amount, deals: [] }).deals.push(deal);
  acceptDeal(state, p, deal.id);
  o.status = 'accepted';
  o.projectId = p.id;
  return p;
}

export function declineOpportunity(state: GameState, id: string): void {
  const o = (state.opportunities ?? []).find((x) => x.id === id);
  if (!o || o.status !== 'open') throw new Error('That proposal is no longer open.');
  o.status = 'declined';
}
