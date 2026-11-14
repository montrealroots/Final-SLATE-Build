// A played career, seeded (the owner's command of November 14, 2026: proof "monte carlo level", measured on a played
// career, never an idle save). A player who does what the screens let a player do and nothing else: no fixture money,
// no project marked delivered by hand. Each year they write and approve a short, put their own money in and approach a
// backer for the rest, cast, staff and shoot it, cut it, deliver it and release it, take the outside work they're offered
// when it doesn't clash, and let the world run. A policy decides each choice a feature can change, so a probe changes one
// decision and keeps the rest.
import { DAY, approachBacker, ledgerTotals, processUntil } from '../engine-api';
import { acceptDeal, backerOptions, financeSummary } from '../../src/engine/finance';
import { putInOwnMoney, personalBalance, takeHome, takeHomeAvailable } from '../../src/engine/personal';
import { acceptDistribution, declineDistribution, planRelease } from '../../src/engine/finish';
import { acceptJob, acceptRefusal, askBetterRate, declineJob, withdrawJob } from '../../src/engine/jobs';
import { standings } from '../../src/engine/reputation';
import { recordBook } from '../../src/engine/box-office';
import { addDaysToKey, dateKey } from '../../src/engine/time';
import { approve, buildProject, staffAll, startLife, startProduction } from '../helpers';
import { approvedCharacters, approvedScenes, castPlayer, castRoleFor, isAvailable, makeOffer, productionWindow, roleCandidates } from '../engine-api';
import { samePart, stagesOf } from '../../src/engine/parts';
import { personAge, playingAgeAt, type Person } from '../../src/engine/people';
import { storyAge } from '../../src/engine/story-age';
import { acceptCounter, assemblyComplete, bookMocap, bringInCoProducer, declineCounter, deliver, deliveryBlockers, generatePlan, getProjectZone, mocapRecord, approveTake } from '../engine-api';
import { lockBlockers, lockPicture, startCutPass, unlockPicture } from '../../src/engine/edit-actions';
import { approveDesign } from '../../src/engine/designs-actions';
import { designStatus, designsToReview } from '../../src/engine/designs';
import { showCut } from '../../src/engine/documentary-actions';
import { cutFromEdit, editScenes } from '../../src/engine/finish';
import type { CreationDraft, GameState, PerformanceMethod, Project } from '../../src/engine/types';

export interface Policy {
  years: number;
  placeId: string;
  creation: Partial<CreationDraft>;
  /** Builds the year's project; a probe may change one thing about it. */
  project: (s: GameState, year: number) => Project;
  /** Runs after the script is approved and before money is raised: where a probe makes its decision. */
  decide?: (s: GameState, p: Project, year: number) => void;
  /** Share of what is still to raise the player puts in from their own account (the rest is asked of a backer). */
  ownShare: number;
  takeJobs: boolean;
  /** How the player answers an outside job offer, when takeJobs: take it; ask once for a better rate and take the answer; turn it down; or take it and withdraw before its first day. */
  jobAnswer: 'accept' | 'ask' | 'decline' | 'withdraw';
  /** Take the best distributor's guarantee when one is offered, rather than releasing it yourself. */
  takeDistribution: boolean;
  /** Turn down every distributor's offer, on the screen's Decline. */
  declineOffers: boolean;
  /** Release a delivered project at all. */
  release: boolean;
  /** Take home what each delivered project allows at the end of each year. */
  takeHome: boolean;
  releaseRoute: 'theatrical' | 'digital';
  territories: string[];
  /** Runs every day, after the player's management and before time passes. */
  daily?: (s: GameState, day: number) => void;
  /** Runs once the cast and crew are asked and before the shoot is planned. */
  beforeShoot?: (s: GameState, p: Project, year: number) => void;
  /** Runs once the project is delivered, before it is sold or released. */
  afterDelivery?: (s: GameState, p: Project, year: number) => void;
  /** Answer to a counter-offer from someone you offered work: take it, or turn it down. */
  counters: 'accept' | 'decline';
  /** Cut passes the player asks for before locking the picture, beyond any the lock needs. */
  cutPasses: number;
  /** The share of each performer's asking rate the player offers. */
  castRate: number;
  /** Lock the picture once the cut allows it. */
  lock: boolean;
  /** Deliver once the picture is locked and nothing blocks delivery. */
  deliver: boolean;
}

/** Takes away the helper's labelled fixture money (helpers.ts agreedFunding): a played career raises its own. */
export function unfunded(p: Project): Project {
  const fixture = (p.finance?.deals ?? []).filter((d) => d.backer === 'Test fixture: agreed funding');
  for (const d of fixture) p.funding.fund -= d.amount;
  if (p.finance) p.finance.deals = p.finance.deals.filter((d) => !fixture.includes(d));
  return p;
}

export const defaultProject = (s: GameState, year: number) => unfunded(buildProject(s, { title: `Year ${year + 1}`, format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 10 },
  [{ name: 'Lead', patch: { roleSize: 'lead' } }, { name: 'Friend', patch: { roleSize: 'supporting' } }],
  [{ place: 'Flat', chars: ['Lead', 'Friend'], minutes: 3 }, { place: 'Street', intExt: 'EXT', chars: ['Lead'], minutes: 3 }, { place: 'Cafe', chars: ['Lead', 'Friend'], minutes: 4 }]));

export const DEFAULT_POLICY: Policy = { years: 2, placeId: 'gb-london', creation: {}, project: defaultProject, ownShare: 1, takeJobs: true, jobAnswer: 'accept', takeDistribution: true, declineOffers: false, release: true, takeHome: true, releaseRoute: 'digital', territories: ['GB'], counters: 'accept', castRate: 1, cutPasses: 0, lock: true, deliver: true };

export interface CareerResult {
  seed: string;
  state: GameState;
  projects: Project[];
  metrics: Record<string, number>;
}

/**
 * Raises what is still to raise. With ownShare below 1 the player first asks the backers the screen offers, in its
 * order, and takes each offer that comes (the starting backing for a first project, an investor, then a co-producer
 * matching what is promised); then they put in their own share, and their own money covers what is still missing.
 */
function raise(s: GameState, p: Project, ownShare: number): void {
  const left = () => financeSummary(p).stillToRaise;
  if (ownShare < 1) {
    for (const kind of ['starting', 'investor', 'co-producer'] as const) {
      if (left() <= 0) break;
      if (!backerOptions(s, p).find((o) => o.kind === kind)?.ready) continue;
      const d = approachBacker(s, p, kind);
      for (let i = 0; i < 30 && d.status === 'considering'; i++) processUntil(s, s.now + DAY, 'tick', 1_000_000);
      if (d.status === 'offered') acceptDeal(s, p, d.id);
    }
  }
  const own = Math.min(Math.floor(left() * ownShare), Math.floor(personalBalance(s)));
  if (own > 0) putInOwnMoney(s, p, own);
  const rest = Math.min(left(), Math.floor(personalBalance(s)));
  if (rest > 0) putInOwnMoney(s, p, rest);
}

/** One management day, as tests/helpers.ts manage, with the lock and the delivery the policy's to make. */
function manageDay(state: GameState, p: Project, policy: Policy): string[] {
  const did: string[] = [];
  for (const h of p.hires.filter((x) => x.status === 'countered')) {
    try {
      acceptCounter(state, p, h.id);
      did.push('counter');
    } catch {
      /* ignore */
    }
  }
  if (!p.delivered) {
    staffAll(state, p);
    castEveryone(state, p, policy.castRate);
    // Designs: approve each one as it is finished, as a producer would (designs.ts).
    for (const cid of designsToReview(p)) if (designStatus(p, cid) === 'awaiting') { approveDesign(p, cid); did.push('design-approved'); }
    // Motion capture: book the stage once the schedule exists, then approve the best take when capture is done.
    for (const t of p.tasks.filter((x) => x.kind === 'anim:mocap' && x.assetRef)) {
      const rec = mocapRecord(p, t.assetRef!);
      if (rec.status !== 'booked' && t.status !== 'done') {
        try {
          bookMocap(state, p, t.assetRef!);
          did.push('mocap-booked');
        } catch {
          /* not cast yet or short of funds */
        }
      }
      if (t.status === 'done' && !rec.approvedTakeId && rec.takes.length) {
        approveTake(p, t.assetRef!, [...rec.takes].sort((a, b) => b.quality - a.quality)[0].id);
        did.push('take-approved');
      }
    }
    // Recovery a player would choose when money runs out: bring in a partner, then rebuild the schedule.
    const broke = p.tasks.some((t) => t.status === 'blocked' && /money/.test(t.blockedReason ?? '')) || p.schedule.days.some((d) => d.status === 'lost' && /enough money/.test(d.result ?? ''));
    if (broke && !p.funding.extra.length) {
      bringInCoProducer(state, p);
      did.push('co-producer');
      if (p.schedule.startDate && !p.schedule.days.some((d) => d.status === 'scheduled')) {
        try {
          generatePlan(state, p, addDaysToKey(dateKey(state.now, getProjectZone(p)), 2));
        } catch {
          /* still short: stays blocked */
        }
      }
    }
  }
  if (policy.lock && assemblyComplete(p) && !p.edit.pictureLocked && !p.tasks.some((t) => t.kind === 'post:cutpass' && t.status !== 'done')) {
    if (lockBlockers(p).length === 0) {
      lockPicture(state, p);
      did.push('lock');
    } else if (p.edit.cutPasses < 2 && !p.schedule.days.some((d) => d.status === 'scheduled')) {
      try {
        startCutPass(state, p);
        did.push('cut');
      } catch {
        /* ignore */
      }
    }
  }
  // Contributors who approve how they appear: show them the locked cut; after a refusal, unlock and cut their scenes.
  for (const c of p.contributors.filter((x) => x.consent === 'given' && x.restrictions?.includes('approval') && editScenes(p).some((s) => s.contributorIds.includes(x.id)))) {
    if (p.edit.pictureLocked && !c.cutApproval) { showCut(state, p, c.id); did.push('cut-shown'); }
    else if (c.cutApproval?.status === 'refused') {
      if (p.edit.pictureLocked) unlockPicture(state, p);
      for (const sc of editScenes(p).filter((x) => x.contributorIds.includes(c.id))) cutFromEdit(state, p, sc.id);
      did.push('contributor-cut');
    }
  }
  if (policy.deliver && p.edit.pictureLocked && !p.delivered && deliveryBlockers(p).length === 0) {
    deliver(state, p);
    did.push('deliver');
  }
  return did;
}

/** As tests/helpers.ts castAll, offering the policy's share of each candidate's asking rate. */
function castEveryone(state: GameState, p: Project, rate: number): void {
  const playerRoles: { character: string; method: PerformanceMethod }[] = [];
  for (const pr of playerRoles) {
    const c = approvedCharacters(p).find((x) => x.name === pr.character)!;
    castPlayer(state, p, c.id, pr.method);
  }
  const win = productionWindow(state, p);
  for (const c of approvedCharacters(p)) {
    if (c.roleSize === 'background') continue;
    if (!approvedScenes(p).some((s) => s.participants.includes(c.id))) continue;
    const animated = p.axes.medium === 'animation' || (['cg', 'drawn', 'puppet'].includes(c.realization) && c.methods.includes('voice'));
    const methods: PerformanceMethod[] = animated ? ['voice', ...(c.methods.includes('motion-capture') ? ['motion-capture' as const] : [])] : ['on-camera'];
    // The part and each of its stages (parts.ts), a stage by its own age where it has one.
    for (const [method, stage] of methods.flatMap((m) => [[m, undefined] as const, ...stagesOf(p, c.id).map((st) => [m, st.id] as const)])) {
      if (p.cast.some((a) => samePart(a, c.id, method, stage))) continue;
      if (p.hires.some((h) => samePart(h, c.id, method, stage) && ['offered', 'countered', 'accepted'].includes(h.status))) continue;
      const roleId = castRoleFor(method);
      const tried = new Set(p.hires.filter((h) => samePart(h, c.id, method, stage)).map((h) => h.personId));
      // As a producer would: someone who plays the part's age, or for a part with no age written, an adult. Until the pool
      // had children (November 11, 2026), the cheapest experienced performer was always one.
      const today = dateKey(state.now, 'UTC');
      const stageAge = stagesOf(p, c.id).find((x) => x.id === stage)?.age;
      const want = stageAge !== undefined ? { min: stageAge, max: stageAge } : storyAge(c.ageInStory);
      const suits = (x: Person) => {
        const plays = playingAgeAt(x, today);
        return want ? !!plays && want.max >= plays[0] && want.min <= plays[1] : personAge(x, today) >= 18;
      };
      const pool = roleCandidates(state, p, roleId).filter((x) => !tried.has(x.id) && isAvailable(state, x, win.from, win.to, p.id).ok && x.experience >= (want && want.max < 16 ? 1 : 3) && suits(x)).sort((a, b) => a.dayRate - b.dayRate);
      for (const pick of pool) {
        try {
          makeOffer(state, p, { personId: pick.id, roleId, dayRate: Math.round(pick.dayRate * rate), characterId: c.id, method, ...(stage ? { stage } : {}) });
          break;
        } catch {
          /* clash or funds: try the next candidate */
        }
      }
    }
  }
}

function takeOffers(s: GameState, answer: Policy['jobAnswer']): number {
  let n = 0;
  for (const j of (s.jobs ?? []).filter((x) => x.status === 'offered')) {
    if (answer === 'decline') { declineJob(s, j.id); continue; }
    if (answer === 'ask' && !j.counter) { askBetterRate(s, j.id); continue; }
    if (answer === 'ask' && !j.counter?.outcome) continue; // waiting for the answer
    if (!acceptRefusal(s, j.id)) { acceptJob(s, j.id); n++; if (answer === 'withdraw') withdrawJob(s, j.id); }
  }
  return n;
}

export function playCareer(seed: string, policy: Policy = DEFAULT_POLICY): CareerResult {
  const s = startLife(seed, policy.placeId, policy.creation);
  const start = personalBalance(s);
  const projects: Project[] = [];
  let jobsTaken = 0;
  let day = 0;
  const delivery = new Map<string, number>();
  const tick = (p?: Project) => {
    if (p) {
      if (policy.counters === 'decline') for (const h of p.hires.filter((x) => x.status === 'countered')) declineCounter(s, p, h.id);
      if (!p.delivered && assemblyComplete(p) && !p.edit.pictureLocked && p.edit.cutPasses < policy.cutPasses && !p.tasks.some((t) => t.kind === 'post:cutpass' && t.status !== 'done')) {
        try { startCutPass(s, p); } catch { /* not now: tomorrow */ }
      }
      manageDay(s, p, policy);
    }
    if (policy.takeJobs) jobsTaken += takeOffers(s, policy.jobAnswer);
    policy.daily?.(s, day++);
    processUntil(s, s.now + DAY, 'tick', 1_000_000);
  };
  for (let y = 0; y < policy.years; y++) {
    const yearEnd = s.now + 365 * DAY;
    const p = policy.project(s, y);
    approve(s, p);
    policy.decide?.(s, p, y);
    raise(s, p, policy.ownShare);
    castEveryone(s, p, policy.castRate);
    staffAll(s, p);
    for (let i = 0; i < 7; i++) tick(p);
    policy.beforeShoot?.(s, p, y);
    const shootFrom = s.now;
    try { startProduction(s, p, 7); } catch { /* not ready: the year runs on, and it's counted as undelivered */ }
    while (!p.delivered && s.now < yearEnd - 30 * DAY) tick(p);
    if (p.delivered) delivery.set(p.id, Math.round((p.delivered.at - shootFrom) / DAY));
    if (p.delivered) policy.afterDelivery?.(s, p, y);
    if (p.delivered && policy.release) {
      // A player waits a few weeks for distributors and takes the best guarantee they can; failing that, releases it themselves.
      // A proposal the player sent is waited for: its answer can be the best offer.
      const waiting = () => (p.releasePlan?.proposals ?? []).some((x) => x.status === 'sent');
      for (let i = 0; i < 45 && (waiting() || (i < 30 && !p.offers.some((o) => o.status === 'open'))); i++) tick();
      if (policy.declineOffers) for (const o of p.offers.filter((x) => x.status === 'open')) declineDistribution(p, o.id);
      const best = p.offers.filter((o) => o.status === 'open').sort((a, b) => b.minimumGuarantee - a.minimumGuarantee);
      let released = false;
      for (const o of policy.takeDistribution ? best : []) { try { acceptDistribution(s, p, o.id); released = true; break; } catch { /* its terms can't be met: the next */ } }
      const zone = 'Europe/London';
      // A release the player already made (a probe's own route) isn't made again.
      if (!released && !p.releases.some((r) => r.status !== 'cancelled')) try { planRelease(s, p, { route: policy.releaseRoute, date: addDaysToKey(dateKey(s.now, zone), 14), territories: policy.territories }); } catch { /* no release: counted */ }
    }
    projects.push(p);
    while (s.now < yearEnd) tick();
    // Year end: the player takes home what each delivered project lets them.
    for (const q of policy.takeHome ? projects : []) {
      const a = takeHomeAvailable(q);
      if (a.earnings > 0) takeHome(s, q, 'earnings', a.earnings);
      if (a.capital > 0) takeHome(s, q, 'capital', takeHomeAvailable(q).capital);
    }
  }
  const mine = new Set(projects.map((p) => p.id));
  const book = recordBook(s).filter((r) => mine.has(r.projectId));
  const st = Object.fromEntries(standings(s).map((x) => [`standing.${x.role}`, x.standing]));
  const delivered = projects.filter((p) => p.delivered);
  return {
    seed, state: s, projects,
    metrics: {
      delivered: delivered.length,
      released: projects.reduce((a, p) => a + p.releases.filter((r) => r.status === 'released').length, 0),
      reception: delivered.length ? delivered.reduce((a, p) => a + (p.quality?.reception ?? 0), 0) / delivered.length : 0,
      overall: delivered.length ? delivered.reduce((a, p) => a + (p.quality?.overall ?? 0), 0) / delivered.length : 0,
      gross: book.reduce((a, r) => a + r.lifetime, 0),
      revenue: projects.reduce((a, p) => a + p.revenue, 0),
      distributed: projects.filter((p) => p.offers.some((o) => o.status === 'accepted')).length,
      money: personalBalance(s),
      moneyChange: personalBalance(s) - start,
      jobsTaken,
      jobsOffered: (s.jobs ?? []).length,
      jobPay: (s.jobs ?? []).filter((j) => j.status === 'done').reduce((a, j) => a + j.dayRate * j.attended.length, 0),
      offeredDayRate: (s.jobs ?? []).length ? (s.jobs ?? []).reduce((a, j) => a + j.dayRate, 0) / (s.jobs ?? []).length : 0,
      ownIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind === 'savings').reduce((b, d) => b + d.amount, 0), 0),
      backerIn: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind !== 'savings' && d.status === 'accepted').reduce((b, d) => b + d.amount, 0), 0),
      backerDeals: projects.reduce((a, p) => a + (p.finance?.deals ?? []).filter((d) => d.kind !== 'savings').length, 0),
      leftInProjects: projects.reduce((a, p) => a + Math.max(0, ledgerTotals(p).available), 0),
      jobsDone: (s.jobs ?? []).filter((j) => j.status === 'done').length,
      jobsWithdrawn: (s.jobs ?? []).filter((j) => j.status === 'withdrawn').length,
      jobsDeclined: (s.jobs ?? []).filter((j) => j.status === 'declined').length,
      ratesAgreed: (s.jobs ?? []).filter((j) => j.counter?.outcome === 'agreed').length,
      logLines: s.log.length,
      hired: projects.reduce((a, p) => a + p.hires.filter((h) => h.status === 'accepted' || h.status === 'released').length, 0),
      castRates: projects.reduce((a, p) => a + p.hires.filter((h) => h.characterId && h.status === 'accepted').reduce((b, h) => b + h.dayRate, 0), 0),
      releaseDelay: (() => {
        const d = projects.filter((p) => p.delivered && p.releases.length).map((p) => {
          const first = [...p.releases].sort((a, b) => a.date.localeCompare(b.date))[0].date;
          return (Date.parse(`${first}T00:00:00Z`) - p.delivered!.at) / DAY;
        });
        return d.length ? d.reduce((a, b) => a + b, 0) / d.length : 0;
      })(),
      licenceDeals: projects.reduce((a, p) => a + p.offers.filter((o) => o.proposalId && o.status === 'accepted').length, 0),
      licenceFee: projects.reduce((a, p) => a + p.offers.filter((o) => o.proposalId && o.status === 'accepted').reduce((b, o) => b + o.minimumGuarantee, 0), 0),
      offersDeclined: projects.reduce((a, p) => a + p.offers.filter((o) => o.status === 'declined').length, 0),
      countersSeen: projects.reduce((a, p) => a + p.hires.filter((h) => h.counterRate !== undefined).length, 0),
      countersDeclined: projects.reduce((a, p) => a + p.hires.filter((h) => h.status === 'declined').length, 0),
      // What the films cost: settled lines, less money taken home (personal.ts takeHome settles a "Taken Home" line).
      spent: projects.reduce((a, p) => a + ledgerTotals(p).settled - p.obligations.filter((o) => o.label === 'Taken Home').reduce((b, o) => b + o.postings.filter((x) => x.kind === 'settle').reduce((c, x) => c + x.amount, 0), 0), 0),
      shootDays: projects.reduce((a, p) => a + p.schedule.days.length, 0),
      lostDays: projects.reduce((a, p) => a + p.schedule.days.filter((d) => d.status === 'lost').length, 0),
      daysToDeliver: delivery.size ? [...delivery.values()].reduce((a, b) => a + b, 0) / delivery.size : 0,
      ...Object.fromEntries(['script', 'direction', 'craft', 'editing', 'music'].map((k) => [`quality.${k}`, delivered.length ? delivered.reduce((a, p) => a + (Number((p.quality as Record<string, number> | undefined)?.[k]) || 0), 0) / delivered.length : 0])),
      ...st,
    },
  };
}
