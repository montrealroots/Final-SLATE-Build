// Motion capture (mocap.ts): a booking cancelled, a retake asked for, the weakest take approved instead of the best, and
// the body booked without the face. The career books the stage and approves the best take itself (career.ts manageDay);
// each proof acts before the day's management, as a player would on the Production page. On a five-minute 3D CG short
// whose lead is performed in motion capture.
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { unfunded } from '../career';
import { buildProject } from '../../helpers';
import { approveTake, bookMocap, cancelMocapBooking, mocapRecord, requestRetake } from '../../../src/engine/mocap';
import { putInOwnMoney } from '../../../src/engine/personal';
import { financeSummary, setFinanceTarget } from '../../../src/engine/finance';

const captured = (s: GameState, year: number): Project => unfunded(buildProject(s, { title: `Year ${year + 1}`, format: 'short', medium: 'animation', technique: '3d-cg', quality: 'tv', scenario: 'micro', genres: ['drama'], runtime: 5 },
  [{ name: 'Lead', patch: { roleSize: 'lead', methods: ['voice', 'motion-capture'] } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
  [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 2 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 3 }]));
const lead = (p: Project) => p.characters.find((c) => c.name === 'Lead')!.id;
/** Money for a retake or a second booking: the player raises the target by what is short and puts it in. */
const cover = (s: GameState, p: Project, need: number) => { try { setFinanceTarget(p, financeSummary(p).target + need); putInOwnMoney(s, p, need); } catch { /* not that much */ } };
const once = (fn: (s: GameState, p: Project) => void) => { const done = new WeakSet<Project>(); return (s: GameState, p: Project) => { if (done.has(p) || p.delivered) return; try { fn(s, p); done.add(p); } catch { /* not yet */ } }; };

const measure = (_s: GameState, projects: Project[]) => ({
  bookings: projects.reduce((a, p) => a + Object.values(p.mocap ?? {}).filter((r) => r.status === 'booked' || r.bookingId).length, 0),
  takes: projects.reduce((a, p) => a + Object.values(p.mocap ?? {}).reduce((b, r) => b + r.takes.length, 0), 0),
  retakes: projects.reduce((a, p) => a + Object.values(p.mocap ?? {}).reduce((b, r) => b + r.retakes, 0), 0),
  approvedTake: projects.reduce((a, p) => a + Object.values(p.mocap ?? {}).reduce((b, r) => b + (r.takes.find((t) => t.id === r.approvedTakeId)?.quality ?? 0), 0), 0),
  // A booking cancelled: one with a cancellation posting (budget.ts cancel); with a fee kept it ends settled, not cancelled.
  cancelled: projects.reduce((a, p) => a + p.obligations.filter((o) => o.ref?.startsWith('mocap:') && o.postings.some((x) => x.kind === 'cancel')).length, 0),
  // What the stage kept of a cancelled booking (mocap.ts MOCAP_CANCEL_SHARE), paid from the project.
  cancellationFees: projects.reduce((a, p) => a + p.obligations.reduce((b, o) => b + o.postings.filter((x) => x.key.endsWith(':cancellation-fee')).reduce((c, x) => c + x.amount, 0), 0), 0),
});

export const PROBES: Probe[] = [
  {
    id: 'cancel-mocap', features: ['action:mocap.cancelMocapBooking'], decision: 'Cancel the capture booking once it is made (the career books again)',
    reads: ['src/engine/mocap.ts#cancelMocapBooking'],
    base: { project: captured }, variant: { project: captured, beforeManage: once((s, p) => { if (mocapRecord(p, lead(p)).status !== 'booked') throw new Error('not yet'); cancelMocapBooking(s, p, lead(p)); }) },
    // The booking is cancelled; its fee is paid (mocap.ts cancelMocapBooking), and the stage is booked again. Until
    // November 15, 2026 the money spent was the bite and the career's end balance the downstream, where the fee is lost
    // among two years of income: no downstream effect at 40 seeds.
    measure, bites: ['cancelled'], downstream: ['cancellationFees', 'spent', 'daysToDeliver'],
  },
  {
    id: 'mocap-retake', features: ['action:mocap.requestRetake'], decision: 'Ask for a retake once the capture is done',
    reads: ['src/engine/mocap.ts#requestRetake', 'src/engine/finish.ts#assessQuality'],
    seeds: 20, base: { project: captured },
    variant: { project: captured, beforeManage: once((s, p) => { const r = mocapRecord(p, lead(p)); if (!r.takes.length) throw new Error('not yet'); cover(s, p, 20_000); requestRetake(s, p, lead(p)); }) },
    measure, bites: ['retakes', 'takes'], downstream: ['spent', 'daysToDeliver'],
  },
  {
    id: 'approve-weak-take', features: ['action:mocap.approveTake'], decision: 'Approve the weakest capture take rather than the best',
    reads: ['src/engine/mocap.ts#approveTake', 'src/engine/finish.ts#assessQuality'],
    seeds: 20, base: { project: captured },
    variant: { project: captured, beforeManage: once((_s, p) => { const r = mocapRecord(p, lead(p)); if (!r.takes.length || p.tasks.find((t) => t.kind === 'anim:mocap' && t.assetRef === lead(p))?.status !== 'done') throw new Error('not yet'); approveTake(p, lead(p), [...r.takes].sort((a, b) => a.quality - b.quality)[0].id); }) },
    measure, bites: ['approvedTake'], downstream: ['overall', 'quality.direction'],
  },
  {
    id: 'book-body-only', features: ['action:mocap.bookMocap'], decision: "Book the stage for the lead's body only, not the face",
    reads: ['src/engine/mocap.ts#bookMocap'],
    seeds: 20, base: { project: captured },
    variant: { project: captured, beforeManage: once((s, p) => { bookMocap(s, p, lead(p), ['body']); }) },
    measure, bites: ['spent'], downstream: ['overall', 'money'],
  },
];
