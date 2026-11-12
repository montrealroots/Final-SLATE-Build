// Guide Me (the v4 package, 01: "Provide Guide Me and Manual controls per department ... It may complete routine in-game
// actions only within an explicitly approved mandate. Major spending, binding contracts, changed creative intent and
// overruns return for approval."; ledger V4-006). Built November 12, 2026, for crew departments first.
//
// A crew department set to Guide Me is staffed on the player's behalf inside a mandate the player approved after reading
// the plan: a spending ceiling for that department's hires. Inside it the game does only routine things, each an
// ordinary in-game action that takes its time: it offers the plan's people at their asking rate, tries the next person
// when one declines (never the same person twice), and accepts a counteroffer that still fits under the ceiling. Every
// offer reserves its money on the project's ledger under a line that says Guide Me. Nothing is completed instantly:
// answers take days, and the people hired still do their work.
//
// What falls outside the mandate is returned to the player, once each: a counteroffer that would break the ceiling, a
// role nobody free can take, a role nobody free fits within what remains. The player then acts on the Crew page as
// always, or approves a new mandate with a higher ceiling. Back To Manual ends the mandate; offers already sent stay.
//
// The money a mandate has committed is never stored: it is the sum of what its live hires hold on the ledger.
import { ledgerTotals, money } from './budget';
import { acceptCounter, estimateDays, makeOffer, productionWindow, requiredCrewPlan, roleCandidates } from './hiring';
import { isAvailable, roleLabel } from './people';
import { addLog, newId, registerHandler, schedule } from './state';
import { DAY } from './time';
import type { GameState, Hire, Mandate, Project } from './types';

/** How often a mandate looks again at its department: a day, the shortest an offer takes to be answered. */
export const GUIDE_ME_LOOK_DAYS = 1;

export const activeMandate = (p: Project, dept: string): Mandate | undefined => (p.mandates ?? []).find((m) => m.dept === dept && m.endedAt === undefined);
const hiresOf = (p: Project, m: Mandate): Hire[] => p.hires.filter((h) => h.guided === m.id);
const live = (h: Hire) => h.status === 'offered' || h.status === 'accepted' || h.status === 'countered';
/** What a mandate has committed: the money its live hires hold on the ledger. Never stored. */
export const mandateCommitted = (p: Project, m: Mandate): number => hiresOf(p, m).filter(live).reduce((a, h) => a + (p.obligations.find((o) => o.id === h.obligationId)?.amount ?? 0), 0);

/** The department's required roles still to fill, with whoever is free and cheapest who fits, skipping anyone who already said no to this mandate. */
export function guideMePlan(state: GameState, p: Project, dept: string, m?: Mandate) {
  const room = m ? m.ceiling - mandateCommitted(p, m) : Infinity;
  const refused = new Set(m ? hiresOf(p, m).filter((h) => h.status === 'declined').map((h) => h.personId) : []);
  const win = productionWindow(state, p);
  let left = room;
  const picks: { roleId: string; personId: string; name: string; dayRate: number; days: number; total: number }[] = [];
  const gaps: string[] = [];
  for (const { nr } of requiredCrewPlan(state, p).filter((x) => x.nr.dept === dept)) {
    const days = estimateDays(p, nr.roleId, undefined, undefined, state);
    const pool = roleCandidates(state, p, nr.roleId).filter((c) => c.experience >= 2 && !refused.has(c.id) && isAvailable(state, c, win.from, win.to, p.id).ok).sort((a, b) => a.dayRate - b.dayRate);
    const pick = pool.find((c) => c.dayRate * days <= left);
    if (!pick) { gaps.push(pool.length ? `${roleLabel(nr.roleId)}: nobody free fits within what remains${m ? ` of the ${money(m.ceiling)} ceiling` : ''}.` : `${roleLabel(nr.roleId)}: nobody free can take it in your production window.`); continue; }
    left -= pick.dayRate * days;
    picks.push({ roleId: nr.roleId, personId: pick.id, name: pick.name, dayRate: pick.dayRate, days, total: pick.dayRate * days });
  }
  return { picks, gaps, total: picks.reduce((a, x) => a + x.total, 0) };
}

/** Why a mandate can't be approved, or null. */
export function guideMeRefusal(p: Project, dept: string, ceiling: number): string | null {
  if (p.approvedDraft === null) return 'Approve a draft before hiring.';
  if (p.delivered) return 'This project has been delivered.';
  if (activeMandate(p, dept)) return 'Guide Me is already staffing this department. Take it back to manual first to set another ceiling.';
  if (!(ceiling > 0) || !Number.isFinite(ceiling)) return 'Set a spending ceiling above zero.';
  const available = ledgerTotals(p).available;
  if (ceiling > available) return `A ceiling of ${money(ceiling)} is more than the ${money(available)} uncommitted. Raise the rest first, or set a lower ceiling.`;
  return null;
}

/** Approve Guide Me for a department with a ceiling: it acts at once, then looks again each day until the department is staffed. */
export function approveGuideMe(state: GameState, p: Project, dept: string, ceiling: number): Mandate {
  const no = guideMeRefusal(p, dept, ceiling);
  if (no) throw new Error(no);
  const m: Mandate = { id: newId(state, 'gm'), dept, ceiling: Math.round(ceiling), approvedAt: state.now, told: [] };
  (p.mandates ??= []).push(m);
  addLog(state, `Guide Me is staffing ${dept} on ${p.title} within ${money(m.ceiling)}. It sends offers at asking rates, tries someone else when one declines, and brings you anything over that.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
  runMandate(state, p, m);
  return m;
}

/** Back to manual: the mandate ends, and offers it already sent stay as they are. */
export function endGuideMe(state: GameState, p: Project, dept: string): void {
  const m = activeMandate(p, dept);
  if (!m) throw new Error('Guide Me is not staffing this department.');
  m.endedAt = state.now; m.ended = 'manual';
  addLog(state, `${dept} on ${p.title} is back to manual. Offers already sent stay open.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
}

const tell = (state: GameState, p: Project, m: Mandate, text: string) => {
  if (m.told.includes(text)) return;
  m.told.push(text);
  addLog(state, `Guide Me, ${m.dept} on ${p.title}: ${text}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
};

/** One look at the department: counters, then offers for what is still open, then done or tomorrow. */
export function runMandate(state: GameState, p: Project, m: Mandate): void {
  if (m.endedAt !== undefined) return;
  if (p.delivered || p.shelved) { m.endedAt = state.now; m.ended = 'manual'; return; }
  // A counteroffer it may accept: the extra still fits under the ceiling and in the money. Otherwise it is the player's.
  for (const h of hiresOf(p, m).filter((x) => x.status === 'countered' && x.counterRate)) {
    const held = p.obligations.find((o) => o.id === h.obligationId)?.amount ?? 0;
    const extra = h.counterRate! * h.estDays - held;
    if (mandateCommitted(p, m) + extra <= m.ceiling && extra <= ledgerTotals(p).available) acceptCounter(state, p, h.id);
    else tell(state, p, m, `${roleLabel(h.roleId)}: the counteroffer of ${money(h.counterRate!)} a day needs ${money(extra)} more, beyond the ceiling. Accept or decline it on the Crew page, or approve a higher ceiling.`);
  }
  const { picks, gaps } = guideMePlan(state, p, m.dept, m);
  for (const x of picks) {
    const h = makeOffer(state, p, { personId: x.personId, roleId: x.roleId, dayRate: x.dayRate });
    h.guided = m.id;
    const o = p.obligations.find((y) => y.id === h.obligationId);
    if (o) o.label = `${o.label} (Guide Me)`;
  }
  for (const g of gaps) tell(state, p, m, g);
  const open = requiredCrewPlan(state, p).filter((x) => x.nr.dept === m.dept).length;
  const waiting = hiresOf(p, m).some((h) => h.status === 'offered' || h.status === 'countered');
  if (!open && !waiting) {
    m.endedAt = state.now; m.ended = 'done';
    addLog(state, `Guide Me finished staffing ${m.dept} on ${p.title}: ${money(mandateCommitted(p, m))} of the ${money(m.ceiling)} ceiling committed.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'crew' } });
    return;
  }
  schedule(state, state.now + GUIDE_ME_LOOK_DAYS * DAY, 'guide-me', { projectId: p.id, mandateId: m.id }, { attention: 'silent', priority: 40, id: `guide-me:${m.id}:${state.now + GUIDE_ME_LOOK_DAYS * DAY}` });
}

registerHandler('guide-me', (state, ev) => {
  const p = state.projects.find((x) => x.id === ev.payload.projectId);
  const m = p?.mandates?.find((x) => x.id === ev.payload.mandateId);
  if (p && m) runMandate(state, p, m);
  return { suppressInterrupt: true };
});
