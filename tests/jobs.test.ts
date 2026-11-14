// Paid work on others' productions (engine/jobs.ts; the v4 package, 01; ledger V4-010.01, .02, .04).
import { describe, expect, it } from 'vitest';
import { AGENT_JOB_UPLIFT, JOB_ROLES, acceptJob, acceptRefusal, declineJob, jobClash, jobCredits, jobDayRate, reliability, rolesOffered, withdrawJob, type OutsideJob } from '../src/engine/jobs';
import { personalPostings, personalStatement } from '../src/engine/personal';
import { deserialize, serialize } from '../src/engine/save';
import { processUntil, schedule } from '../src/engine/state';
import { DAY } from '../src/engine/time';
import type { GameState } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';
import { planShootDays } from '../src/engine/production/schedule';

/** What SLATE has posted to the bank, in dollars at each day's rate: a balance held in pounds moves with the rate, and this doesn't. */
const posted = (x: GameState) => Math.round(personalPostings(x).reduce((a, p) => a + p.amount, 0) * 100) / 100;

/** Labelled fixture: the triggers a delivery or an agent would schedule, fired until one brings an offer (the odds are the seed's). */
function offered(s: GameState, via?: string): OutsideJob {
  for (let i = 0; i < 40 && !(s.jobs ?? []).some((j) => j.status === 'offered'); i++) {
    schedule(s, s.now + 1000, 'job-offer', via ? { via } : { after: 'fixture' }, { attention: 'silent', priority: 70 });
    processUntil(s, s.now + 2000, 'tick', 1000);
  }
  const j = (s.jobs ?? []).find((x) => x.status === 'offered');
  if (!j) throw new Error('no offer in forty triggers');
  return j;
}
/** Run the clock to two days past the job's last day: a production's shoot can be months out (productions.ts). */
const workAll = (s: GameState, j: OutsideJob) => {
  // A production can be put back a week before it shoots (productions.ts), and the job's days with it: run on until
  // its last day as it stands.
  for (let i = 0; i < 4 && (j.status === 'accepted' || j.status === 'offered'); i++) processUntil(s, Date.parse(`${j.days[j.days.length - 1]}T00:00:00Z`) + 2 * DAY, 'tick', 100000);
};

describe('an offer of work', () => {
  it('is priced from the record, never more than the cap; an agent negotiates it up', () => {
    const s = startLife('jobs-rate', 'gb-london', { savings: 0 });
    expect(rolesOffered(s)).toEqual(['acting']); // writing and directing for hire need a delivered project first
    expect(jobDayRate(s, 'acting', false)).toBe(JOB_ROLES.acting.base);
    expect(jobDayRate(s, 'acting', true)).toBe(Math.round(JOB_ROLES.acting.base * (1 + AGENT_JOB_UPLIFT)));
  });

  it('is open for a week, names an invented production, and lapses unanswered', () => {
    const s = startLife('jobs-lapse');
    const j = offered(s);
    expect(j).toMatchObject({ role: 'acting', status: 'offered', placeId: s.locationId });
    expect(j.days.length).toBeGreaterThanOrEqual(JOB_ROLES.acting.days[0]);
    processUntil(s, j.answerBy + 1000, 'tick', 100000);
    expect(j.status).toBe('lapsed');
    expect(acceptRefusal(s, j.id)).toBe('That offer is no longer open.');
  });
});

describe('a job taken', () => {
  it('goes on the calendar, is worked each morning in the town, and is paid for the days worked once they are done', () => {
    // The world 'jobs-work' had its production cancelled a week out once productions could be (November 13, 2026);
    // that case is tests/productions.test.ts's. This one is about the work done.
    const s = startLife('jobs-work-2');
    const j = offered(s);
    acceptJob(s, j.id);
    expect(s.plans.filter((p) => j.planIds!.includes(p.id)).map((p) => p.status)).toEqual(j.days.map(() => 'upcoming'));
    const before = posted(s);
    workAll(s, j);
    expect(j).toMatchObject({ status: 'done', missed: [] });
    expect(j.attended).toEqual(j.days);
    expect(posted(s) - before).toBe(j.dayRate * j.days.length);
    expect(personalStatement(s)).toContainEqual({ kind: 'paid-work', total: j.dayRate * j.days.length });
    expect(jobCredits(s).map((x) => x.id)).toEqual([j.id]);
    // Paid once: a repeated morning changes nothing.
    schedule(s, s.now + 1000, 'job-day', { jobId: j.id, date: j.days[0], planId: j.planIds![0] }, { attention: 'silent', priority: 30 });
    processUntil(s, s.now + 2000, 'tick', 1000);
    expect(posted(s) - before).toBe(j.dayRate * j.days.length);
  });

  it('a morning asleep or out of town is missed and unpaid, and makes later offers rarer', () => {
    const s = startLife('jobs-miss');
    const j = offered(s);
    acceptJob(s, j.id);
    s.locationId = 'fr-paris'; // labelled fixture: the player is away for the whole job
    workAll(s, j);
    expect(j.attended).toEqual([]);
    expect(j.missed).toEqual(j.days);
    expect(personalStatement(s).some((x) => x.kind === 'paid-work')).toBe(false);
    expect(jobCredits(s)).toEqual([]);
    expect(reliability(s)).toBeLessThan(1);
  });

  it('can\'t take days a shoot of the player\'s own project holds, or another job\'s', () => {
    const s = startLife('jobs-clash');
    const j = offered(s);
    const p = buildProject(s, { title: 'My Own Short', format: 'short', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Office', chars: ['Wren'] }]);
    p.schedule.days.push({ id: 'd-fixture', date: j.days[1], episode: 1, sceneIds: [], locationLabel: 'Office', interior: true, night: false, status: 'scheduled', playerActing: true, conflicts: [] }); // labelled fixture
    expect(acceptRefusal(s, j.id)).toMatch(/^Your own project My Own Short shoots on /);
    expect(() => acceptJob(s, j.id)).toThrow(/^Your own project My Own Short shoots on /);
    p.schedule.days = [];
    acceptJob(s, j.id);
    const other: OutsideJob = { ...j, id: 'job-other', status: 'offered', planIds: undefined }; // labelled fixture: a second offer for the same days
    s.jobs!.push(other);
    expect(jobClash(s, other)).toMatch(/^You're working on /);
  });

  it('withdrawn, the days worked are paid, the rest come off the calendar, and offers come less often', () => {
    const s = startLife('jobs-withdraw');
    const j = offered(s);
    acceptJob(s, j.id);
    processUntil(s, s.now + 15 * DAY, 'tick', 100000); // before the first day
    withdrawJob(s, j.id);
    expect(j.status).toBe('withdrawn');
    expect(s.plans.filter((p) => j.planIds!.includes(p.id)).every((p) => p.status === 'cancelled' || p.status === 'done')).toBe(true);
    processUntil(s, s.now + 60 * DAY, 'tick', 100000);
    expect(j.attended.length + j.missed.length).toBeLessThan(j.days.length); // nothing more is worked
    expect(reliability(s)).toBe(0.75);
    expect(() => withdrawJob(s, 'nope')).toThrow('You are not working on that.');
    // Declined instead, nothing is owed either way, and the record is unchanged.
    const t = startLife('jobs-decline');
    const k = offered(t);
    declineJob(t, k.id);
    expect(acceptRefusal(t, k.id)).toBe('That offer is no longer open.');
    expect(reliability(t)).toBe(1);
  });
});

describe('found by an agent', () => {
  it('is priced up, and the agent\'s commission comes out of the pay once', () => {
    const s = startLife('jobs-agent');
    s.representation = { current: { agentId: 'montoya', signedAt: s.now, until: s.now + 365 * DAY, renewed: 0 }, approaches: [], past: [] }; // labelled fixture: signed
    const j = offered(s, 'montoya');
    expect(j.viaAgent).toMatchObject({ agentId: 'montoya' });
    expect(j.dayRate).toBe(jobDayRate(s, j.role, true));
    acceptJob(s, j.id);
    workAll(s, j);
    const gross = j.dayRate * j.days.length;
    expect(personalStatement(s)).toContainEqual({ kind: 'commission', total: -Math.round(gross * j.viaAgent!.rate) });
  });
});

describe('saving', () => {
  it('keeps offers and jobs as they were', () => {
    const s = startLife('jobs-save');
    const j = offered(s);
    acceptJob(s, j.id);
    expect(deserialize(serialize(s)).jobs).toEqual(s.jobs);
  });
});

describe('the player can\'t be in two places', () => {
  it('a shoot planned after outside work is taken skips its days; a job over a planned shoot day is refused', () => {
    const s = startLife('jobs-both', 'gb-london');
    const p = buildProject(s, { title: 'Pier', format: 'short', medium: 'live-action', runtime: 6 }, [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'], minutes: 3 }, { place: 'Quay', chars: ['Mara'], minutes: 3 }]);
    approve(s, p);
    // Labelled fixture: an accepted job on the very days the shoot would otherwise take.
    const first = planShootDays(s, p, '2026-03-02').map((d) => d.date);
    (s.jobs ??= []).push({ id: 'job-x', role: 'acting', production: 'Fixture', company: 'Fixture', dayRate: 300, days: first, placeId: s.locationId, zone: 'Europe/London', status: 'accepted', offeredAt: s.now, answerBy: s.now, attended: [], missed: [] });
    const planned = planShootDays(s, p, '2026-03-02').map((d) => d.date);
    expect(planned.some((d) => first.includes(d))).toBe(false);
    // And the other way: an offer over a planned shoot day says why it can't be taken.
    s.jobs!.pop();
    p.schedule.days = planShootDays(s, p, '2026-03-02');
    const offer = { id: 'job-y', role: 'acting' as const, production: 'Fixture', company: 'Fixture', dayRate: 300, days: [p.schedule.days[0].date], placeId: s.locationId, zone: 'Europe/London', status: 'offered' as const, offeredAt: s.now, answerBy: s.now + 7 * DAY, attended: [], missed: [] };
    s.jobs!.push(offer);
    expect(acceptRefusal(s, 'job-y')).toMatch(/^Your own project Pier shoots on /);
  });
});
