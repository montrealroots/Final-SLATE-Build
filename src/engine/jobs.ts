// Paid work on someone else's production (the v4 package, 01 "Hired work and representation"; ledger V4-010.01, .02, .04).
// Built November 12, 2026. Until then the player only ever worked on their own projects.
//
// An offer comes from the career, not a timer: weeks after one of the player's projects is delivered (someone saw it),
// or from an agent looking while the player is represented. The production and its company are invented by the game, and
// say so. An offer names the part, the days and the day rate, and is open for a week. Accepted, the days go on the
// calendar; the player must be there, awake and in the town, each morning, or the day is missed and unpaid. When the
// days are done the pay comes into the player's own account, less the agent's commission when an agent found it, and
// the credit is kept. The same days can't hold a shoot day of the player's own project, or another job. Withdrawing
// costs the pay and makes later offers rarer; so does missing days. Rates, odds and lengths are game calibration.
import { personalBalance, postPersonal } from './personal';
import { agentById, recordFor, representedBy } from './representation';
import { stream } from './rng';
import { addLog, cancelEvents, currentPlace, newId, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, DAY, formatDateKey, localToInstant, parseYmd, weekdayOfKey } from './time';
import { money } from './budget';
import type { GameState } from './types';

export type JobRole = 'acting' | 'writing' | 'directing';
export interface OutsideJob {
  id: string;
  role: JobRole;
  /** Invented by the game, and labelled so wherever it is shown. */
  production: string;
  company: string;
  dayRate: number;
  /** Working days, as date keys in the job's place. */
  days: string[];
  placeId: string;
  zone: string;
  status: 'offered' | 'accepted' | 'declined' | 'lapsed' | 'withdrawn' | 'done';
  offeredAt: number;
  answerBy: number;
  /** An agent found it: their share of the pay. */
  viaAgent?: { agentId: string; rate: number };
  attended: string[];
  missed: string[];
  planIds?: string[];
}

export const JOB_ROLES: Record<JobRole, { label: string; doing: string; days: [number, number]; base: number; perDelivered: number }> = {
  acting: { label: 'Acting', doing: 'a part in', days: [2, 6], base: 350, perDelivered: 150 },
  writing: { label: 'Writing', doing: 'the writers\' room of', days: [5, 10], base: 300, perDelivered: 120 },
  directing: { label: 'Directing', doing: 'directing', days: [8, 14], base: 500, perDelivered: 200 },
};
/** Game calibration: how an offer is priced and how likely one is. */
export const JOB_WIN_BONUS = 300;
export const JOB_RATE_CAP = 2_500;
export const AGENT_JOB_UPLIFT = 0.15;
export const JOB_ANSWER_DAYS = 7;
export const AGENT_SEARCH_DAYS = 30;
export const JOB_CHANCE = { delivery: 0.5, agent: 0.6 };
const PRODUCTIONS = ['The Long Quiet', 'Salt And Iron', 'A House Of Doors', 'Night Ferry', 'The Glass Orchard', 'Low Tide', 'Paper Kings', 'The Last Signal', 'Winter Harbour', 'Small Hours'];
const COMPANIES = ['Halfmoon Pictures', 'Copperline Films', 'Northlight Television', 'Fieldwork Productions', 'Gannet Media', 'Stillwater Studios'];

const jobs = (s: GameState): OutsideJob[] => (s.jobs ??= []);
export const jobById = (s: GameState, id: string) => (s.jobs ?? []).find((j) => j.id === id);

/** How reliable the record says the player is: each withdrawal, and each day missed, makes offers rarer. Game calibration. */
export const WITHDRAWAL_COST = 0.25;
export const MISSED_DAY_COST = 0.08;
export function reliability(s: GameState): number {
  const js = s.jobs ?? [];
  const missed = js.reduce((a, j) => a + j.missed.length, 0);
  return Math.max(0.2, 1 - WITHDRAWAL_COST * js.filter((j) => j.status === 'withdrawn').length - MISSED_DAY_COST * missed);
}

/** The roles the record supports: anyone can act; writing and directing for hire once a project of their own is delivered. */
export function rolesOffered(s: GameState): JobRole[] {
  return recordFor(s).delivered > 0 ? ['acting', 'writing', 'directing'] : ['acting'];
}

/** The day rate an offer for this role carries, from the record; an agent negotiates it up. */
export function jobDayRate(s: GameState, role: JobRole, viaAgent: boolean): number {
  const r = recordFor(s);
  const base = Math.min(JOB_RATE_CAP, JOB_ROLES[role].base + JOB_ROLES[role].perDelivered * r.delivered + JOB_WIN_BONUS * Math.min(r.wins, 3));
  return Math.round(base * (viaAgent ? 1 + AGENT_JOB_UPLIFT : 1));
}

/** Consecutive weekdays from about two weeks out, in the place the player is now. */
function jobDays(s: GameState, zone: string, n: number, lead: number): string[] {
  let k = addDaysToKey(dateKey(s.now, zone), lead);
  const out: string[] = [];
  while (out.length < n) { if (weekdayOfKey(k) !== 0 && weekdayOfKey(k) !== 6) out.push(k); k = addDaysToKey(k, 1); }
  return out;
}

/** A trigger has fired (a delivery, or an agent looking): an offer may follow. */
registerHandler('job-offer', (state, ev) => {
  const via = ev.payload.via as string | undefined;
  const rep = representedBy(state);
  if (via && rep?.agent.id !== via) return { suppressInterrupt: true }; // no longer represented by them: they stop looking
  const rng = stream(state.seed, 'job-offer', ev.id);
  // Ids here are derived, not drawn from the shared counter, so an offer of work moves no other seeded draw (finish.ts).
  if (via) schedule(state, state.now + AGENT_SEARCH_DAYS * DAY, 'job-offer', { via }, { attention: 'silent', priority: 70, id: `job-offer:${via}:${state.now}` });
  if (rng() >= (via ? JOB_CHANCE.agent : JOB_CHANCE.delivery) * reliability(state)) return { suppressInterrupt: true };
  const roles = rolesOffered(state);
  const role = roles[Math.floor(rng() * roles.length)];
  const def = JOB_ROLES[role];
  const n = def.days[0] + Math.floor(rng() * (def.days[1] - def.days[0] + 1));
  const place = currentPlace(state);
  const job: OutsideJob = {
    id: `job-${ev.id}`, role, production: PRODUCTIONS[Math.floor(rng() * PRODUCTIONS.length)], company: COMPANIES[Math.floor(rng() * COMPANIES.length)],
    dayRate: jobDayRate(state, role, !!via), days: jobDays(state, place.zone, n, 14 + Math.floor(rng() * 14)), placeId: place.id, zone: place.zone,
    status: 'offered', offeredAt: state.now, answerBy: state.now + JOB_ANSWER_DAYS * DAY, ...(via ? { viaAgent: { agentId: via, rate: agentById(via).rate } } : {}), attended: [], missed: [],
  };
  jobs(state).push(job);
  schedule(state, job.answerBy, 'job-lapse', { jobId: job.id }, { attention: 'silent', priority: 70, id: `job-lapse:${job.id}` });
  const text = `${via ? `${agentById(via).name} found you work: ` : 'An offer of work: '}${def.label.toLowerCase()} on ${job.production}, ${money(job.dayRate)} a day for ${n} days from ${formatDateKey(job.days[0])}. Answer by ${formatDateKey(dateKey(job.answerBy, job.zone))}.`;
  addLog(state, text, 'personal', { route: { view: 'profile' } });
  return { message: text };
});

registerHandler('job-lapse', (state, ev) => {
  const j = jobById(state, ev.payload.jobId as string);
  if (!j || j.status !== 'offered') return { suppressInterrupt: true };
  j.status = 'lapsed';
  addLog(state, `The offer of work on ${j.production} lapsed unanswered.`, 'personal', { route: { view: 'profile' } });
  return { suppressInterrupt: true };
});

/** The player's own shoot days, and other jobs, on any of these dates: why the job can't be taken, or null. */
export function jobClash(state: GameState, j: OutsideJob): string | null {
  const dates = new Set(j.days);
  for (const p of state.projects) {
    if (p.delivered) continue;
    const d = p.schedule.days.find((x) => x.status === 'scheduled' && dates.has(x.date));
    if (d) return `Your own project ${p.title} shoots on ${formatDateKey(d.date)}.`;
  }
  const other = (state.jobs ?? []).find((x) => x.id !== j.id && x.status === 'accepted' && x.days.some((k) => dates.has(k)));
  return other ? `You're working on ${other.production} on ${formatDateKey(other.days.find((k) => dates.has(k))!)}.` : null;
}

export function acceptRefusal(state: GameState, id: string): string | null {
  const j = jobById(state, id);
  if (!j || j.status !== 'offered') return 'That offer is no longer open.';
  if (state.now > j.answerBy) return 'That offer has lapsed.';
  return jobClash(state, j);
}

/** Take the job: its days go on the calendar, and each morning the player is expected there. */
export function acceptJob(state: GameState, id: string): void {
  const no = acceptRefusal(state, id);
  if (no) throw new Error(no);
  const j = jobById(state, id)!;
  j.status = 'accepted';
  j.planIds = j.days.map((k) => {
    const { year, month, day } = parseYmd(k);
    const start = localToInstant(j.zone, year, month, day, 9).instant;
    const planId = newId(state, 'p');
    state.plans.push({ id: planId, title: `${JOB_ROLES[j.role].label} On ${j.production}`, start, durationMin: 540, remindMin: null, placeId: j.placeId, kind: 'personal', status: 'upcoming' });
    schedule(state, start, 'job-day', { jobId: j.id, date: k, planId }, { attention: 'notify', priority: 30 });
    return planId;
  });
  addLog(state, `You took the work on ${j.production}: ${j.days.length} days from ${formatDateKey(j.days[0])}.`, 'personal', { route: { view: 'profile' } });
}

export function declineJob(state: GameState, id: string): void {
  const j = jobById(state, id);
  if (!j || j.status !== 'offered') throw new Error('That offer is no longer open.');
  j.status = 'declined';
}

/** Leave a job taken: no pay for days not yet worked, and offers come less often. Days worked are still paid. */
export function withdrawJob(state: GameState, id: string): void {
  const j = jobById(state, id);
  if (!j || j.status !== 'accepted') throw new Error('You are not working on that.');
  j.status = 'withdrawn';
  for (const pid of j.planIds ?? []) { const plan = state.plans.find((x) => x.id === pid); if (plan?.status === 'upcoming') plan.status = 'cancelled'; }
  cancelEvents(state, (e) => e.kind === 'job-day' && e.payload.jobId === j.id);
  pay(state, j);
  addLog(state, `You withdrew from ${j.production}. Offers will come less often for a while.`, 'warning', { route: { view: 'profile' } });
}

/** What the job pays for the days worked, less commission, posted once. */
function pay(state: GameState, j: OutsideJob): void {
  const gross = j.dayRate * j.attended.length;
  if (gross <= 0) return; // earned pay opens an account even in a story from before one existed
  postPersonal(state, 'paid-work', gross, `Paid For ${JOB_ROLES[j.role].label} On ${j.production}`, `job:${j.id}`);
  if (j.viaAgent) postPersonal(state, 'commission', -Math.round(gross * j.viaAgent.rate), `Commission To ${agentById(j.viaAgent.agentId).name}: ${Math.round(j.viaAgent.rate * 100)}% Of ${money(gross)}`, `job-commission:${j.id}`);
}

/** A job morning: there, awake and not travelling, or the day is missed. After the last, the job is paid and credited. */
registerHandler('job-day', (state, ev) => {
  const j = jobById(state, ev.payload.jobId as string);
  const date = ev.payload.date as string;
  if (!j || j.status !== 'accepted' || j.attended.includes(date) || j.missed.includes(date)) return { suppressInterrupt: true };
  const there = !state.sleep.asleep && !state.travel && state.locationId === j.placeId;
  (there ? j.attended : j.missed).push(date);
  let text = there ? `A day's ${JOB_ROLES[j.role].label.toLowerCase()} on ${j.production}.` : `You missed a day on ${j.production}${state.sleep.asleep ? ': you slept through the call' : ': you weren\'t there'}. It isn't paid.`;
  if (j.attended.length + j.missed.length === j.days.length) {
    j.status = 'done';
    const before = personalBalance(state);
    pay(state, j);
    text += ` That was the last day: ${money(personalBalance(state) - before)} comes to your account${j.viaAgent ? ', after your agent\'s commission' : ''}.`;
  }
  addLog(state, text, there ? 'personal' : 'warning', { route: { view: 'profile' } });
  return { message: text, suppressInterrupt: there };
});

/** Credits from work for others: a job with a day worked. */
export const jobCredits = (s: GameState): OutsideJob[] => (s.jobs ?? []).filter((j) => (j.status === 'done' || j.status === 'withdrawn') && j.attended.length > 0);
