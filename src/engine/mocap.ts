// Motion capture as its own flow (Gap Completion Package, section 1):
// book the stage -> rehearse and calibrate -> capture takes (retakes allowed) -> approve a take -> cleanup and
// retargeting -> the scenes' animation. Only characters assigned to motion capture use it; manual animation stays valid.
// Contract terms are explicit: a booking reserves every planned session's stage cost; sessions draw it down once each;
// cancelling releases what is unused except a cancellation fee of MOCAP_CANCEL_SHARE of it.

import { dependents } from './production/tasks';
import { FundsError, cancel, ledgerTotals, money, obligation, reserve, settle } from './budget';
import { getPlace } from '../data/places';
import { personById } from './people';
import { approvedScenes } from './projects';
import { isWorkingDay } from './production/schedule';
import { stream } from './rng';
import { addLog, registerCommitmentSource } from './state';
import { addDaysToKey, dateKey, formatDateKey, localToInstant, parseYmd } from './time';
import type { CapturePart, GameState, MocapRecord, MocapSession, MocapTake, Project, Task } from './types';

export const MOCAP_SESSION_STAGE = 1500;
/** Extra per session when the face is captured: head-mounted cameras and facial tracking (simulation assumption). */
export const FACIAL_RIG_PER_SESSION = 500;
/** Facial solve days per capture session (simulation assumption). */
export const FACIAL_SOLVE_PER_SESSION = 0.5;
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

/** The stage cost of one session for this character: more when the face is captured. */
export function sessionCost(p: Project, characterId: string, parts?: CapturePart[]): number {
  const ps = parts ?? p.mocap?.[characterId]?.parts;
  // A booking from before body and facial capture were told apart keeps the price it was reserved at.
  if (!ps) return MOCAP_SESSION_STAGE;
  return MOCAP_SESSION_STAGE + (ps.includes('face') ? FACIAL_RIG_PER_SESSION : 0);
}

export function bookingCost(p: Project, characterId: string, parts: CapturePart[] = ['body', 'face']): number {
  return sessionsLeft(p, characterId) * sessionCost(p, characterId, parts);
}

/** How a capture performance is credited. */
export function captureCredit(parts: CapturePart[] | undefined): string {
  const ps = parts ?? ['body', 'face'];
  return ps.includes('body') && ps.includes('face') ? 'Performance Capture' : ps.includes('face') ? 'Facial Capture' : 'Motion Capture';
}

const performerOf = (p: Project, characterId: string) => p.cast.find((c) => c.characterId === characterId && c.method === 'motion-capture')?.performer;
const performerName = (state: GameState, who: string) => (who === 'player' ? 'You' : personById(state, who).name);

/** Whether a performer is on set in a project on a date (any role they play there, any method but voice). */
function onSet(p: Project, who: string, date: string): boolean {
  const theirs = new Set(p.cast.filter((c) => c.performer === who && c.method !== 'voice' && c.method !== 'motion-capture').map((c) => c.characterId));
  if (!theirs.size) return false;
  return p.schedule.days.some((d) => d.date === date && d.status !== 'lost' && d.status !== 'moved' && approvedScenes(p).some((s) => d.sceneIds.includes(s.id) && s.participants.some((cid) => theirs.has(cid))));
}

/**
 * Why a capture session for this character can't be on a date, or null when it can: not a working day at the base,
 * the stage booked for another character, or the performer shooting or capturing elsewhere that day.
 */
export function sessionConflict(state: GameState, p: Project, characterId: string, date: string): string | null {
  if (!isWorkingDay(p, date)) return 'not a working day here';
  for (const [cid, r] of Object.entries(p.mocap ?? {})) {
    if (cid !== characterId && r.sessions?.some((x) => x.date === date && x.status === 'booked')) return `the stage is booked for ${p.characters.find((c) => c.id === cid)?.name ?? 'another character'}`;
  }
  const who = performerOf(p, characterId);
  if (!who) return null;
  for (const q of state.projects) {
    if (q.delivered) continue;
    if (onSet(q, who, date)) return `${performerName(state, who)} ${who === 'player' ? 'are' : 'is'} shooting ${q.title}`;
    if (q.id !== p.id) for (const [cid, r] of Object.entries(q.mocap ?? {})) {
      if (performerOf(q, cid) === who && r.sessions?.some((x) => x.date === date && x.status === 'booked')) return `${performerName(state, who)} ${who === 'player' ? 'have' : 'has'} a capture session for ${q.title}`;
    }
  }
  return null;
}

/** The next free dates for sessions, from a date on, and the dates passed over with the reason. */
export function planSessions(state: GameState, p: Project, characterId: string, kinds: MocapSession['kind'][], from: string, except?: MocapSession): { sessions: MocapSession[]; skipped: { date: string; reason: string }[] } {
  const sessions: MocapSession[] = [];
  const skipped: { date: string; reason: string }[] = [];
  // One session a day per character: dates this character already has are passed over.
  const own = new Set((p.mocap?.[characterId]?.sessions ?? []).filter((x) => x.status === 'booked' && x !== except).map((x) => x.date));
  let date = from;
  for (let i = 0; i < 365 && sessions.length < kinds.length; i++, date = addDaysToKey(date, 1)) {
    if (own.has(date)) continue;
    const why = sessionConflict(state, p, characterId, date);
    if (why) {
      if (why !== 'not a working day here') skipped.push({ date, reason: why });
      continue;
    }
    sessions.push({ date, kind: kinds[sessions.length], status: 'booked' });
  }
  if (sessions.length < kinds.length) throw new Error('No free stage dates were found in the next year.');
  return { sessions, skipped };
}

const today = (state: GameState, p: Project) => dateKey(state.now, getPlace(p.axes.basePlaceId).zone);

/**
 * Book the capture stage for a character's remaining sessions, on dated sessions that avoid the performer's other
 * work and the stage's other bookings. Reserves the stage cost now. Capturing the face adds rig cost per session and a
 * facial solve after cleanup. Returns the dates passed over and why.
 */
export function bookMocap(state: GameState, p: Project, characterId: string, parts: CapturePart[] = ['body', 'face']): { date: string; reason: string }[] {
  if (!taskOf(p, 'anim:mocap', characterId)) throw new Error('Build the schedule first; capture sessions come from it.');
  const cast = p.cast.find((c) => c.characterId === characterId && c.method === 'motion-capture');
  if (!cast) throw new Error('Cast a capture performer for this character first.');
  if (!parts.length || parts.some((x) => x !== 'body' && x !== 'face')) throw new Error('Choose body, face, or both.');
  const rec = mocapRecord(p, characterId);
  if (rec.status === 'booked') throw new Error('The capture stage is already booked.');
  const cost = bookingCost(p, characterId, parts);
  if (cost <= 0) throw new Error('Every capture session is already done.');
  const calib = taskOf(p, 'anim:mocap-calib', characterId);
  const cap = taskOf(p, 'anim:mocap', characterId)!;
  const kinds: MocapSession['kind'][] = [
    ...Array.from({ length: Math.max(0, calib ? calib.units - calib.done : 0) }, () => 'calibration' as const),
    ...Array.from({ length: Math.max(0, cap.units - cap.done) }, () => 'capture' as const),
  ];
  const plan = planSessions(state, p, characterId, kinds, addDaysToKey(today(state, p), 1));
  const o = reserve(state, p, `Capture Stage Booking`, 'post', cost, `mocap:${characterId}`);
  rec.bookingId = o.id;
  rec.status = 'booked';
  rec.parts = [...parts];
  rec.sessions = [...(rec.sessions ?? []).filter((x) => x.status === 'done'), ...plan.sessions];
  if (parts.includes('face')) addFacialSolve(p, characterId, cap.units);
  const name = p.characters.find((c) => c.id === characterId)?.name ?? 'the character';
  addLog(state, `The capture stage is booked for ${name}: ${plan.sessions.map((x) => formatDateKey(x.date)).join(', ')}.${plan.skipped.length ? ` Passed over: ${plan.skipped.slice(0, 3).map((x) => `${formatDateKey(x.date)} (${x.reason})`).join('; ')}${plan.skipped.length > 3 ? '...' : ''}.` : ''}`, 'project', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'production' } });
  return plan.skipped;
}

/** Facial capture needs a facial solve after cleanup; the character's animation waits for it. */
function addFacialSolve(p: Project, characterId: string, captureSessions: number): void {
  const id = `anim:mocap-face:${characterId}`;
  const cleanup = taskOf(p, 'anim:mocap-cleanup', characterId);
  if (p.tasks.some((t) => t.id === id) || !cleanup) return;
  const name = p.characters.find((c) => c.id === characterId)?.name ?? 'Character';
  p.tasks.push({
    id, kind: 'anim:mocap-face', label: `Facial Solve: ${name}`, dept: 'Animation', roleId: 'animator', units: Math.max(1, Math.ceil(captureSessions * FACIAL_SOLVE_PER_SESSION)),
    unitLabel: 'days', done: 0, dependsOn: [cleanup.id], status: 'waiting', episode: cleanup.episode, sceneIds: cleanup.sceneIds, assetRef: characterId, workedDays: 0,
  });
  for (const t of p.tasks) if (t.kind === 'anim:animation' && t.dependsOn.includes(cleanup.id) && !t.dependsOn.includes(id)) t.dependsOn.push(id);
}

/** The session booked for a task's kind today, if any (dated bookings only). */
export function sessionToday(p: Project, characterId: string, kind: MocapSession['kind'], date: string): MocapSession | undefined {
  return p.mocap?.[characterId]?.sessions?.find((x) => x.date === date && x.kind === kind && x.status === 'booked');
}

/** A session that couldn't run because of a clash is marked missed and rebooked on the next free date after it. */
export function rebookMissed(state: GameState, p: Project, characterId: string, s: MocapSession, why: string): MocapSession {
  s.status = 'missed';
  s.note = why;
  const [next] = planSessions(state, p, characterId, [s.kind], addDaysToKey(s.date, 1), s).sessions;
  mocapRecord(p, characterId).sessions!.push(next);
  const name = p.characters.find((c) => c.id === characterId)?.name ?? 'the character';
  addLog(state, `The capture session for ${name} on ${formatDateKey(s.date)} couldn't run (${why}). It is rebooked for ${formatDateKey(next.date)}.`, 'warning', { projectId: p.id, route: { view: 'project', projectId: p.id, tab: 'production' } });
  return next;
}

/**
 * Sessions whose date passed while the work wasn't ready (an earlier step unfinished) move to the next free date from
 * today. Nothing was lost, so no missed session is recorded; the calendar shows the new date.
 */
export function rebookPassed(state: GameState, p: Project, date: string): void {
  for (const [cid, r] of Object.entries(p.mocap ?? {})) {
    if (r.status !== 'booked') continue;
    for (const s of (r.sessions ?? []).filter((x) => x.status === 'booked' && x.date < date).sort((a, b) => (a.date < b.date ? -1 : 1))) {
      s.date = planSessions(state, p, cid, [s.kind], date, s).sessions[0].date;
    }
  }
}

/** Whether the character's capture performer is on set anywhere on a date (they can't be on the stage too). */
export function performerOnSet(state: GameState, p: Project, characterId: string, date: string): string | null {
  const who = performerOf(p, characterId);
  if (!who) return null;
  const q = state.projects.find((x) => !x.delivered && onSet(x, who, date));
  return q ? `${performerName(state, who)} ${who === 'player' ? 'were' : 'was'} shooting ${q.title}` : null;
}

// Booked capture sessions are on the shared calendar.
registerCommitmentSource((state, from, to) => state.projects.flatMap((p) => Object.entries(p.mocap ?? {}).flatMap(([cid, r]) => (r.sessions ?? [])
  .filter((x) => x.status === 'booked')
  .map((x) => {
    const { year, month, day } = parseYmd(x.date);
    const at = localToInstant(getPlace(p.axes.basePlaceId).zone, year, month, day, 9).instant;
    const who = performerOf(p, cid);
    const label = `${x.kind === 'calibration' ? 'Capture Calibration' : 'Capture Session'}: ${p.characters.find((c) => c.id === cid)?.name ?? 'Character'}${who ? ` (${performerName(state, who)})` : ''}, ${p.title}`;
    return { at, label, route: { view: 'project' as const, projectId: p.id, tab: 'production' }, kind: 'project' as const };
  })
  .filter((c) => c.at >= from && c.at <= to))));

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
  if (rec.sessions) rec.sessions = rec.sessions.filter((x) => x.status !== 'booked');
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
  const cost = sessionCost(p, characterId);
  if (o.amount - o.settled < cost) return false;
  return settle(state, p, o.id, cost, key);
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
    ...(performerOf(p, characterId) ? { performer: performerOf(p, characterId) } : {}),
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
  const cost = sessionCost(p, characterId);
  if (cost > available) throw new FundsError(`A retake needs ${money(cost)} of stage time, but only ${money(available)} is uncommitted.`, cost - available);
  // A dated session for it, where the booking has dates.
  if (rec.sessions) {
    const last = rec.sessions.map((x) => x.date).sort().at(-1) ?? today(state, p);
    const from = [last, today(state, p)].sort()[1];
    rec.sessions.push(...planSessions(state, p, characterId, ['capture'], addDaysToKey(from, 1)).sessions);
  }
  // The booking line grows by one session, so one booking keeps one balance.
  o.amount += cost;
  o.postings.push({ at: state.now, kind: 'reserve', amount: cost, key: `${o.id}:retake${rec.retakes + 1}` });
  cap.units += 1;
  if (cap.status === 'done') cap.status = 'waiting';
  rec.retakes += 1;
}

/** Tasks that would lose progress if the approved take changed now. */
export function takeChangeImpact(p: Project, characterId: string): Task[] {
  const cleanup = taskOf(p, 'anim:mocap-cleanup', characterId);
  if (!cleanup || cleanup.done <= 0) return [];
  // Everything built on the cleanup, however far down (animation, then lighting, rendering and compositing on it): from
  // November 13, 2026 (the v7 package's transitive rework); until then only the animation straight after it.
  const hit = dependents(p.tasks, cleanup.id);
  return [cleanup, ...p.tasks.filter((t) => t !== cleanup && hit.has(t.id) && t.done > 0)];
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
