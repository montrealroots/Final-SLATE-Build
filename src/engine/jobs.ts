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
import { hasLeverage, standingIn, standingRate, standingWeight } from './reputation';
import { personalBalance, postPersonal } from './personal';
import { agentById, recordFor, representedBy } from './representation';
import { stream } from './rng';
import { addLog, cancelEvents, currentPlace, newId, registerHandler, schedule } from './state';
import { addDaysToKey, dateKey, DAY, formatDateKey, localToInstant, parseYmd, weekdayOfKey } from './time';
import { money } from './budget';
import { getPlace } from '../data/places';
import { KILL_FEE_DAYS, PRODUCTION_KIND_LABELS, daysUntil, industryStanding, shootingDays, slateHere, type Production } from './productions';
import type { GameState } from './types';

export type JobRole = 'acting' | 'writing' | 'directing';
export interface OutsideJob {
  id: string;
  role: JobRole;
  /** Invented by the game, and labelled so wherever it is shown. */
  production: string;
  company: string;
  /**
   * The production it is on (productions.ts), what the work is in it, what the player is given to prepare from, and what
   * is asked of them. Offers made before November 13, 2026 have none: their production existed only in the offer.
   */
  productionId?: string;
  part?: string;
  material?: string;
  requirement?: string;
  /** The one request for a better rate an offer allows, and the answer. */
  counter?: { askedAt: number; answerAt: number; rate: number; outcome?: 'agreed' | 'held' };
  dayRate: number;
  /** Working days, as date keys in the job's place. */
  days: string[];
  placeId: string;
  zone: string;
  /** 'cancelled': the production was cancelled under it (productions.ts), from November 13, 2026; the player is paid a fee for it. */
  status: 'offered' | 'accepted' | 'declined' | 'lapsed' | 'withdrawn' | 'done' | 'cancelled';
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

/**
 * The roles the record supports, each on evidence a hirer would ask for (the owner's v5 brief, 7: "credible entry routes
 * based on appropriate evidence"). Anyone can act. Writing: an approved script of their own (a sample), a delivered
 * project, or writing done for others. Directing: a delivered project, or two jobs on others' sets. Until November 13,
 * 2026 writing and directing came only with a delivered project of the player's own.
 */
export function rolesOffered(s: GameState): JobRole[] {
  const r = recordFor(s);
  const done = (role?: JobRole) => (s.jobs ?? []).filter((j) => j.status === 'done' && j.attended.length > 0 && (!role || j.role === role)).length;
  return ['acting', ...(r.scripts > 0 || r.delivered > 0 || done('writing') > 0 ? ['writing' as const] : []), ...(r.delivered > 0 || done() >= 2 ? ['directing' as const] : [])];
}
/** Why the record supports a role, in words, for the offer and the Profile. */
export function evidenceFor(s: GameState, role: JobRole): string {
  const r = recordFor(s);
  if (role === 'acting') return 'Anyone can be cast.';
  if (role === 'writing') return r.scripts > 0 ? `Your approved ${r.scripts === 1 ? 'script stands' : 'scripts stand'} as a writing sample.` : r.delivered > 0 ? 'Your delivered work stands as a writing sample.' : 'Your writing for others is on your record.';
  return r.delivered > 0 ? 'Your delivered work shows you can direct.' : 'Your days on others\' sets count as experience.';
}

/** The day rate an offer for this role carries, from the record; an agent negotiates it up. */
export function jobDayRate(s: GameState, role: JobRole, viaAgent: boolean): number {
  const r = recordFor(s);
  const base = Math.min(JOB_RATE_CAP, JOB_ROLES[role].base + JOB_ROLES[role].perDelivered * r.delivered + JOB_WIN_BONUS * Math.min(r.wins, 3));
  // The role's own standing moves it, within bounds (reputation.ts): a strong director is paid more to direct, not to act.
  return Math.round(base * standingRate(standingIn(s, role)) * (viaAgent ? 1 + AGENT_JOB_UPLIFT : 1));
}

/** The first n weekdays of a production's shoot: fewer if it wraps first. */
function workDays(p: Production, n: number): string[] {
  return shootingDays(p).filter((k) => weekdayOfKey(k) !== 0 && weekdayOfKey(k) !== 6).slice(0, n);
}

/** What the work is on this production, what the player gets to prepare from, and what is asked of them. */
function workOn(state: GameState, p: Production, role: JobRole, rng: () => number): Pick<OutsideJob, 'part' | 'material' | 'requirement'> {
  const where = getPlace(p.placeId).name;
  const taken = new Set((state.jobs ?? []).filter((j) => j.productionId === p.id && j.status !== 'declined' && j.status !== 'lapsed').map((j) => j.part));
  if (role === 'acting') {
    const part = p.parts.filter((x) => x.size !== 'lead' && !taken.has(`The part of ${x.name}`))[Math.floor(rng() * Math.max(1, p.parts.length - 1))] ?? p.parts[p.parts.length - 1];
    return { part: `The part of ${part.name}`, material: `Sides for ${part.name}, a ${part.size} part in ${PRODUCTION_KIND_LABELS[p.kind].toLowerCase()} (${p.genre}).`, requirement: `Lines learned by the first day, in ${where} each morning at nine.` };
  }
  if (role === 'writing') {
    const ep = p.episodes ? 1 + Math.floor(rng() * p.episodes) : 0;
    return ep
      ? { part: `Writing episode ${ep}`, material: `The series bible and the outline for episode ${ep}.`, requirement: `In the writers' room in ${where}; the draft is due on the last day.` }
      : { part: 'A rewrite of the second act', material: 'The current draft and the director\'s notes on it.', requirement: `In ${where} with the director; the pages are due on the last day.` };
  }
  const ep = p.episodes ? 1 + Math.floor(rng() * p.episodes) : 0;
  return ep
    ? { part: `Directing episode ${ep}`, material: `The episode's script and the series' look book.`, requirement: `Prep from the first day in ${where}; the shoot follows the series' schedule.` }
    : { part: 'Directing the second unit', material: 'The second unit\'s shot list and the storyboards.', requirement: `In ${where} from the first day, with the second unit's crew.` };
}

/** Ask once for a better rate: a fifth more. The production answers in two days; the offer stays open until then. */
export const JOB_COUNTER_DAYS = 2;
export function askBetterRate(state: GameState, id: string): void {
  const j = jobById(state, id);
  if (!j || j.status !== 'offered' || state.now > j.answerBy) throw new Error('That offer is no longer open.');
  if (j.counter) throw new Error('You have asked once already.');
  const rate = Math.round(j.dayRate * 1.2);
  j.counter = { askedAt: state.now, answerAt: state.now + JOB_COUNTER_DAYS * DAY, rate };
  j.answerBy = Math.max(j.answerBy, j.counter.answerAt + 3 * DAY);
  cancelEvents(state, (e) => e.id === `job-lapse:${j.id}`);
  schedule(state, j.answerBy, 'job-lapse', { jobId: j.id }, { attention: 'silent', priority: 70, id: `job-lapse:${j.id}` });
  schedule(state, j.counter.answerAt, 'job-counter', { jobId: j.id }, { attention: 'notify', priority: 60, id: `job-counter:${j.id}` });
  addLog(state, `You asked ${j.company} for ${money(rate)} a day on ${j.production}.`, 'personal', { route: { view: 'profile' } });
}
registerHandler('job-counter', (state, ev) => {
  const j = jobById(state, String(ev.payload.jobId));
  if (!j || j.status !== 'offered' || !j.counter || j.counter.outcome) return { suppressInterrupt: true };
  // It pays more for an agent's client, or for a grade of Established or more in the role (from November 14, 2026; until
  // then a craft average of 65 was enough). Game calibration.
  const agreed = !!j.viaAgent || hasLeverage(standingIn(state, j.role));
  j.counter.outcome = agreed ? 'agreed' : 'held';
  if (agreed) j.dayRate = j.counter.rate;
  const text = agreed ? `${j.company} agreed to ${money(j.dayRate)} a day on ${j.production}.` : `${j.company} kept its rate of ${money(j.dayRate)} a day on ${j.production}. The offer is still open.`;
  addLog(state, text, 'personal', { route: { view: 'profile' } });
  return { message: text };
});

/** A trigger has fired (a delivery, or an agent looking): an offer may follow. */
registerHandler('job-offer', (state, ev) => {
  const via = ev.payload.via as string | undefined;
  const rep = representedBy(state);
  if (via && rep?.agent.id !== via) return { suppressInterrupt: true }; // no longer represented by them: they stop looking
  const rng = stream(state.seed, 'job-offer', ev.id);
  // Ids here are derived, not drawn from the shared counter, so an offer of work moves no other seeded draw (finish.ts).
  if (via) schedule(state, state.now + AGENT_SEARCH_DAYS * DAY, 'job-offer', { via }, { attention: 'silent', priority: 70, id: `job-offer:${via}:${state.now}` });
  if (rng() >= (via ? JOB_CHANCE.agent : JOB_CHANCE.delivery) * reliability(state) * industryStanding(state)) return { suppressInterrupt: true };
  // Which role: weighted by the craft the record shows in each (reputation.ts). Until November 13, 2026 each was as
  // likely as the next, whatever the work said.
  const roles = rolesOffered(state);
  const weights = roles.map((r) => standingWeight(standingIn(state, r)));
  let pick = rng() * weights.reduce((a, b) => a + b, 0);
  const role = roles.find((_, i) => (pick -= weights[i]) < 0) ?? roles[roles.length - 1];
  const def = JOB_ROLES[role];
  const n = def.days[0] + Math.floor(rng() * (def.days[1] - def.days[0] + 1));
  const place = currentPlace(state);
  // A production on the slate where the player is, shooting far enough ahead to prepare and long enough for the work.
  const slate = slateHere(state, place.id, place.zone).filter((p) => daysUntil(state, p) >= 10 && workDays(p, n).length === n && (role !== 'writing' || p.kind !== 'short'));
  if (!slate.length) return { suppressInterrupt: true };
  const prod = slate[Math.floor(rng() * slate.length)];
  const what = workOn(state, prod, role, rng);
  const job: OutsideJob = {
    id: `job-${ev.id}`, role, production: prod.title, company: prod.company, productionId: prod.id, ...what,
    dayRate: jobDayRate(state, role, !!via), days: workDays(prod, n), placeId: prod.placeId, zone: prod.zone,
    status: 'offered', offeredAt: state.now, answerBy: state.now + JOB_ANSWER_DAYS * DAY, ...(via ? { viaAgent: { agentId: via, rate: agentById(via).rate } } : {}), attended: [], missed: [],
  };
  jobs(state).push(job);
  schedule(state, job.answerBy, 'job-lapse', { jobId: job.id }, { attention: 'silent', priority: 70, id: `job-lapse:${job.id}` });
  const text = `${via ? `${agentById(via).name} found you work: ` : 'An offer of work: '}${job.part} on ${job.production}, ${money(job.dayRate)} a day for ${n} days from ${formatDateKey(job.days[0])}. Answer by ${formatDateKey(dateKey(job.answerBy, job.zone))}.`;
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
  if (j.counter && !j.counter.outcome) return `${j.company} is answering the rate you asked for.`;
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
export function pay(state: GameState, j: OutsideJob): void {
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

/**
 * The production let the work go (productions.ts): an offer closes; work taken is paid the kill fee for it (two days),
 * its days come off the calendar, and nothing counts against the player.
 */
export function releaseJob(state: GameState, j: OutsideJob, why: string): void {
  if (j.status === 'offered') { j.status = 'lapsed'; cancelEvents(state, (e) => e.id === `job-lapse:${j.id}` || e.id === `job-counter:${j.id}`); addLog(state, `${why} Its offer of work is closed.`, 'personal', { route: { view: 'profile' } }); return; }
  j.status = 'cancelled';
  for (const pid of j.planIds ?? []) { const plan = state.plans.find((x) => x.id === pid); if (plan?.status === 'upcoming') plan.status = 'cancelled'; }
  cancelEvents(state, (e) => e.kind === 'job-day' && e.payload.jobId === j.id);
  pay(state, j); // the days already worked
  const fee = j.dayRate * KILL_FEE_DAYS;
  postPersonal(state, 'paid-work', fee, `Kill Fee: ${j.production}`, `job-kill:${j.id}`);
  if (j.viaAgent) postPersonal(state, 'commission', -Math.round(fee * j.viaAgent.rate), `Commission To ${agentById(j.viaAgent.agentId).name}: ${Math.round(j.viaAgent.rate * 100)}% Of ${money(fee)}`, `job-kill-commission:${j.id}`);
  addLog(state, `${why} You are paid ${money(fee)} for the work it let go, and nothing counts against you.`, 'personal', { route: { view: 'profile' } });
}

/** The production was put back: the work's days move with it, unless the new days clash, when the work is let go. */
export function moveJob(state: GameState, j: OutsideJob, by: number): void {
  const moved = { ...j, days: j.days.map((k) => addDaysToKey(k, by)) };
  if (j.status === 'accepted' && jobClash(state, moved)) return releaseJob(state, j, `${j.production} was put back ${by} days, onto days you already have work.`);
  const was = j.status;
  if (was === 'accepted') {
    for (const pid of j.planIds ?? []) { const plan = state.plans.find((x) => x.id === pid); if (plan?.status === 'upcoming') plan.status = 'cancelled'; }
    cancelEvents(state, (e) => e.kind === 'job-day' && e.payload.jobId === j.id);
  }
  j.days = moved.days;
  if (was === 'accepted') { j.status = 'offered'; j.answerBy = Math.max(j.answerBy, state.now); acceptJob(state, j.id); }
  addLog(state, `${j.production} was put back ${by} days. Your work on it moves with it: ${formatDateKey(j.days[0])} to ${formatDateKey(j.days.at(-1)!)}.`, 'personal', { route: { view: 'profile' } });
}

/** Credits from work for others: a job with a day worked. */
export const jobCredits = (s: GameState): OutsideJob[] => (s.jobs ?? []).filter((j) => (j.status === 'done' || j.status === 'withdrawn') && j.attended.length > 0);
