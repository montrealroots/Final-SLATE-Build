// Motion capture as its own flow (Gap Completion Package, section 1):
// book the stage -> rehearse and calibrate -> capture takes (retakes allowed) -> approve a take -> cleanup and
// retargeting -> the scenes' animation. Only characters assigned to motion capture use it; manual animation stays valid.
// Contract terms are explicit: a booking reserves every planned session's stage cost; sessions draw it down once each;
// cancelling releases what is unused except a cancellation fee of MOCAP_CANCEL_SHARE of it.

import { FundsError, cancel, ledgerTotals, money, obligation, reserve, settle } from './budget';
import { stream } from './rng';
import type { GameState, MocapRecord, MocapTake, Project, Task } from './types';

export const MOCAP_SESSION_STAGE = 1500;
/** Share of the unused stage reservation kept as a fee when a booking is cancelled (simulation assumption). */
export const MOCAP_CANCEL_SHARE = 0.25;
/** Cleanup and retargeting days per capture session (simulation assumption). */
export const MOCAP_CLEANUP_PER_SESSION = 0.5;

export function mocapRecord(p: Project, characterId: string): MocapRecord {
  p.mocap ??= {};
  return (p.mocap[characterId] ??= { bookingId: null, status: 'unbooked', takes: [], approvedTakeId: null, retakes: 0 });
}

const taskOf = (p: Project, kind: string, characterId: string): Task | undefined => p.tasks.find((t) => t.id === `${kind}:${characterId}`);

/** Stage sessions still to run: calibration plus capture sessions not yet done. */
export function sessionsLeft(p: Project, characterId: string): number {
  const calib = taskOf(p, 'anim:mocap-calib', characterId);
  const cap = taskOf(p, 'anim:mocap', characterId);
  return Math.max(0, (calib ? calib.units - calib.done : 0) + (cap ? cap.units - cap.done : 0));
}

export function bookingCost(p: Project, characterId: string): number {
  return sessionsLeft(p, characterId) * MOCAP_SESSION_STAGE;
}

/** Book the capture stage for a character's remaining sessions. Reserves the stage cost now. */
export function bookMocap(state: GameState, p: Project, characterId: string): void {
  if (!taskOf(p, 'anim:mocap', characterId)) throw new Error('Build the schedule first; capture sessions come from it.');
  const cast = p.cast.find((c) => c.characterId === characterId && c.method === 'motion-capture');
  if (!cast) throw new Error('Cast a capture performer for this character first.');
  const rec = mocapRecord(p, characterId);
  if (rec.status === 'booked') throw new Error('The capture stage is already booked.');
  const cost = bookingCost(p, characterId);
  if (cost <= 0) throw new Error('Every capture session is already done.');
  const o = reserve(state, p, `Capture Stage Booking`, 'post', cost, `mocap:${characterId}`);
  rec.bookingId = o.id;
  rec.status = 'booked';
}

/** Cancel the booking: the unused reservation is released, less the cancellation fee, which is paid now. */
export function cancelMocapBooking(state: GameState, p: Project, characterId: string): { fee: number; released: number } {
  const rec = mocapRecord(p, characterId);
  if (rec.status !== 'booked' || !rec.bookingId) throw new Error('There is no capture booking to cancel.');
  const o = obligation(p, rec.bookingId);
  const unused = Math.max(0, o.amount - o.settled);
  const fee = Math.round(unused * MOCAP_CANCEL_SHARE);
  if (fee > 0) settle(state, p, o.id, fee, `${o.id}:cancellation-fee`);
  cancel(state, p, o.id);
  rec.status = 'cancelled';
  rec.bookingId = null;
  return { fee, released: unused - fee };
}

export function cancellationTerms(p: Project, characterId: string): string {
  const rec = mocapRecord(p, characterId);
  if (rec.status !== 'booked' || !rec.bookingId) return '';
  const o = obligation(p, rec.bookingId);
  const unused = Math.max(0, o.amount - o.settled);
  return `Cancelling releases ${money(unused - Math.round(unused * MOCAP_CANCEL_SHARE))} and keeps a ${money(Math.round(unused * MOCAP_CANCEL_SHARE))} fee (${Math.round(MOCAP_CANCEL_SHARE * 100)}% of the unused booking).`;
}

/** Why a stage session can't run, or null when it can. */
export function stageBlock(p: Project, characterId: string): string | null {
  const rec = mocapRecord(p, characterId);
  if (rec.status === 'cancelled') return 'The capture booking was cancelled. Book the stage again to continue.';
  if (rec.status !== 'booked') return 'Book the capture stage first.';
  return null;
}

/** Pay one stage session from the booking, once per key. Returns false when the booking can't cover it. */
export function payStageSession(state: GameState, p: Project, characterId: string, key: string): boolean {
  const rec = mocapRecord(p, characterId);
  if (!rec.bookingId) return false;
  const o = obligation(p, rec.bookingId);
  if (o.postings.some((x) => x.key === key)) return true;
  if (o.amount - o.settled < MOCAP_SESSION_STAGE) return false;
  return settle(state, p, o.id, MOCAP_SESSION_STAGE, key);
}

/** A finished capture session produces one take; calibration raises its quality. Deterministic per save and day. */
export function recordTake(state: GameState, p: Project, characterId: string, date: string): MocapTake {
  const rec = mocapRecord(p, characterId);
  const calibrated = taskOf(p, 'anim:mocap-calib', characterId)?.status === 'done';
  const r = stream(state.seed, 'mocap-take', p.id, characterId, date, rec.takes.length);
  const take: MocapTake = {
    id: `${characterId}:take${rec.takes.length + 1}`,
    date,
    quality: Math.round(Math.min(98, 52 + r() * 34 + (calibrated ? 8 : 0))),
    retake: rec.takes.length >= (taskOf(p, 'anim:mocap', characterId)?.units ?? 0) - rec.retakes,
  };
  rec.takes.push(take);
  return take;
}

/** Ask for another capture session. The booking grows by one session's stage cost. */
export function requestRetake(state: GameState, p: Project, characterId: string): void {
  const rec = mocapRecord(p, characterId);
  const cap = taskOf(p, 'anim:mocap', characterId);
  if (!cap) throw new Error('There are no capture sessions for this character.');
  if (rec.status !== 'booked' || !rec.bookingId) throw new Error('Book the capture stage before asking for a retake.');
  const o = obligation(p, rec.bookingId);
  const { available } = ledgerTotals(p);
  if (MOCAP_SESSION_STAGE > available) throw new FundsError(`A retake needs ${money(MOCAP_SESSION_STAGE)} of stage time, but only ${money(available)} is uncommitted.`, MOCAP_SESSION_STAGE - available);
  // The booking line grows by one session, so one booking keeps one balance.
  o.amount += MOCAP_SESSION_STAGE;
  o.postings.push({ at: state.now, kind: 'reserve', amount: MOCAP_SESSION_STAGE, key: `${o.id}:retake${rec.retakes + 1}` });
  cap.units += 1;
  if (cap.status === 'done') cap.status = 'waiting';
  rec.retakes += 1;
}

/** Tasks that would lose progress if the approved take changed now. */
export function takeChangeImpact(p: Project, characterId: string): Task[] {
  const cleanup = taskOf(p, 'anim:mocap-cleanup', characterId);
  if (!cleanup || cleanup.done <= 0) return [];
  const anim = p.tasks.filter((t) => t.kind === 'anim:animation' && t.dependsOn.includes(cleanup.id) && t.done > 0);
  return [cleanup, ...anim];
}

/** Choose the take that goes forward. Changing it after cleanup started resets cleanup and the animation built on it. */
export function approveTake(p: Project, characterId: string, takeId: string): Task[] {
  const rec = mocapRecord(p, characterId);
  if (!rec.takes.some((t) => t.id === takeId)) throw new Error('That take was not recorded.');
  if (rec.approvedTakeId === takeId) return [];
  const reset = takeChangeImpact(p, characterId);
  for (const t of reset) {
    t.done = 0;
    t.workedDays = 0;
    t.status = 'waiting';
    t.doneAt = undefined;
  }
  rec.approvedTakeId = takeId;
  return reset;
}

export function approvedTake(p: Project, characterId: string): MocapTake | undefined {
  const rec = p.mocap?.[characterId];
  return rec?.takes.find((t) => t.id === rec.approvedTakeId);
}
