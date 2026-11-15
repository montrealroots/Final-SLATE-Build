// Your day (state.ts): a plan booked over a shoot call, cancelled; sleeping through a call; a trip away on a shoot day.
// Each is checked where the shoot reads it (production/shoot.ts `runShootDay`): the call on a day you're needed.
import type { Probe } from '../probe';
import { DAY, processUntil } from '../../engine-api';
import { addPlan, cancelPlan, startSleep, travelTo } from '../../../src/engine/state';
import { localToInstant, parseYmd } from '../../../src/engine/time';
import { getPlace } from '../../../src/data/places';
import type { GameState, Project } from '../../../src/engine/types';

/** The first scheduled shoot day of an undelivered project of yours, at a local hour, once a schedule exists. */
function firstShootAt(s: GameState, hour: number): { p: Project; at: number } | undefined {
  for (const p of s.projects.filter((x) => !x.delivered)) {
    const d = p.schedule.days.find((x) => x.status === 'scheduled');
    if (!d) continue;
    const { year, month, day } = parseYmd(d.date);
    const at = localToInstant(getPlace(p.axes.basePlaceId).zone, year, month, day, hour).instant;
    if (at > s.now + DAY) return { p, at };
  }
  return undefined;
}
/** Once per career: `fn` with the first shoot day ahead, the day a schedule exists. */
export const onceWithShoot = (fn: (s: GameState, at: (hour: number) => number) => void) => {
  const done = new WeakSet<GameState>();
  // Hours count from the shoot day's local midnight, fixed once: -2 is ten the night before.
  return (s: GameState) => { if (done.has(s)) return; const f = firstShootAt(s, 0); if (!f) return; done.add(s); fn(s, (h) => f.at + h * 3_600_000); };
};

const bookOverCall = (s: GameState, at: (h: number) => number) => { addPlan(s, { title: 'A Dentist Appointment', start: at(6), durationMin: 240, remindMin: null }); };

const measure = (_s: GameState, projects: Project[]) => ({
  lateDays: projects.reduce((a, p) => a + p.schedule.days.filter((d) => d.late).length, 0),
});

export const PROBES: Probe[] = [
  {
    id: 'plan-over-call',
    features: ['action:state.addPlan', 'scheduled:plan-start'],
    decision: 'Book an appointment over the first shoot day\'s call',
    reads: ['src/engine/state.ts#addPlan', 'src/engine/production/shoot.ts#runShootDay'],
    variant: { daily: onceWithShoot(bookOverCall) },
    measure,
    bites: ['lateDays'],
    downstream: ['quality.direction', 'overall', 'reception'],
  },
  {
    id: 'cancel-plan',
    features: ['action:state.cancelPlan'],
    decision: 'Cancel the appointment booked over the first shoot day\'s call',
    reads: ['src/engine/state.ts#cancelPlan', 'src/engine/production/shoot.ts#runShootDay'],
    base: { daily: onceWithShoot(bookOverCall) },
    variant: { daily: onceWithShoot((s, at) => { bookOverCall(s, at); cancelPlan(s, s.plans[s.plans.length - 1].id); }) },
    measure,
    bites: ['lateDays'],
    downstream: ['quality.direction', 'overall', 'reception'],
  },
  {
    id: 'sleep-through-call',
    features: ['action:state.startSleep', 'scheduled:shoot-call'],
    // Without being woken for obligations, which since November 15, 2026 wakes you an hour before the call (state.ts startSleep).
    decision: 'Go to sleep the night before the first shoot day without an alarm, until ten, not woken for obligations',
    reads: ['src/engine/state.ts#startSleep', 'src/engine/production/shoot.ts#runShootDay', 'src/engine/production/shoot.ts#handler:shoot-call'],
    variant: { daily: onceWithShoot((s, at) => { s.settings.wakeForObligations = false; processUntil(s, at(-2), 'tick', 1_000_000); startSleep(s, at(10), false); }) },
    measure,
    bites: ['lateDays'],
    downstream: ['quality.direction', 'overall', 'reception'],
  },
  {
    id: 'travel-away',
    features: ['action:state.travelTo', 'scheduled:arrive'],
    decision: 'Go to Paris the day before the first shoot day',
    reads: ['src/engine/state.ts#travelTo', 'src/engine/production/shoot.ts#runShootDay'],
    variant: { daily: onceWithShoot((s, at) => { processUntil(s, at(-12), 'tick', 1_000_000); try { travelTo(s, 'fr-paris'); } catch { /* asleep or away already */ } }) },
    measure,
    bites: ['lateDays'],
    downstream: ['quality.direction', 'overall', 'reception'],
  },
];
