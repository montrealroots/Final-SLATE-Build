// Shelving a project (SLATE-03-04.02, 18-05.03; November 8, 2026). Until then a project could only be left idle, with its
// people booked, its shoot days still coming and its money reserved. Shelving settles those commitments instead of
// deleting anything: open offers are withdrawn, everyone hired is released (paid for work done, as releaseHire always
// was), future shoot days are cancelled, money reserved but not owed is freed, and a capture-stage booking is cancelled
// on its stated terms. What is owed stays owed: backers' terms and deadlines run on, and nothing already paid comes
// back. The script, drafts, footage, credits and history stay. A shelved project can be taken up again.
import { cancel } from './budget';
import { cancelMocapBooking, mocapRecord } from './mocap';
import { releaseHire, withdrawOffer } from './hiring';
import { addLog, cancelEvents } from './state';
import type { GameState, Project } from './types';

/** Events that belong to the project's own work. Backers' answers and deadlines are theirs, and keep running. */
const WORK_EVENTS = new Set(['work-day', 'shoot-call', 'shoot-wrap', 'weather-check', 'offer-response', 'revision-done', 'consent-response']);

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** What shelving will do, said before it is done. */
export function shelveImpact(state: GameState, p: Project): string[] {
  if (p.delivered) return ['This project has been delivered, so there is nothing to shelve.'];
  const out: string[] = [];
  const offers = p.hires.filter((h) => h.status === 'offered' || h.status === 'countered');
  const hired = p.hires.filter((h) => h.status === 'accepted');
  const days = p.schedule.days.filter((d) => d.status === 'scheduled');
  const reserved = p.obligations.filter((o) => o.state === 'reserved' && !hired.some((h) => h.obligationId === o.id)).reduce((a, o) => a + (o.amount - o.settled), 0);
  const booked = Object.values(p.mocap ?? {}).filter((r) => r.status === 'booked').length;
  if (offers.length) out.push(`${plural(offers.length, 'open offer')} will be withdrawn.`);
  if (hired.length) out.push(`${plural(hired.length, 'person', 'people')} you hired will be released, paid for the work they have done.`);
  if (days.length) out.push(`${plural(days.length, 'shoot day')} will be cancelled.`);
  if (booked) out.push(`${plural(booked, 'capture-stage booking')} will be cancelled on its terms, keeping the cancellation fee.`);
  if (reserved > 0) out.push(`$${reserved.toLocaleString('en')} set aside for planned work will be freed.`);
  const owed = (p.finance?.deals ?? []).filter((d) => d.status === 'accepted' && (d.terms.recoup > d.repaid || d.terms.deliverBy !== null));
  if (owed.length) out.push(`What you agreed with ${owed.map((d) => d.backer).join(' and ')} still stands, including any repayment and deadline.`);
  out.push('Your script, drafts, footage and history stay, and you can take the project up again.');
  void state;
  return out;
}

export function shelveProject(state: GameState, p: Project): void {
  if (p.delivered) throw new Error('This project has been delivered, so there is nothing to shelve.');
  if (p.shelved) throw new Error('This project is already shelved.');
  for (const h of p.hires.filter((x) => x.status === 'offered')) withdrawOffer(state, p, h.id);
  for (const h of p.hires.filter((x) => x.status === 'countered')) {
    h.status = 'declined';
    if (h.obligationId) cancel(state, p, h.obligationId);
  }
  for (const h of p.hires.filter((x) => x.status === 'accepted')) releaseHire(state, p, h.id);
  for (const [characterId, rec] of Object.entries(p.mocap ?? {})) if (rec.status === 'booked' && mocapRecord(p, characterId).bookingId) cancelMocapBooking(state, p, characterId);
  for (const d of p.schedule.days.filter((x) => x.status === 'scheduled')) d.status = 'cancelled';
  for (const o of p.obligations.filter((x) => x.state === 'reserved')) cancel(state, p, o.id);
  cancelEvents(state, (e) => e.payload.projectId === p.id && WORK_EVENTS.has(e.kind));
  p.revision = null;
  p.shelved = { at: state.now };
  p.history.push({ at: state.now, text: 'Shelved.' });
  addLog(state, `You shelved ${p.title}. Its commitments are settled; its script and history are kept.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'overview' } });
}

/** Take a shelved project up again. Cancelled days stay in its history; plan, hire and schedule again from here. */
export function resumeProject(state: GameState, p: Project): void {
  if (!p.shelved) throw new Error('This project is not shelved.');
  delete p.shelved;
  p.history.push({ at: state.now, text: 'Taken up again.' });
  addLog(state, `You took ${p.title} up again. Hire and schedule it afresh.`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'overview' } });
}
