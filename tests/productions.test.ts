// Other people's productions, kept (src/engine/productions.ts; jobs.ts; the owner's v5 brief, 7). Names, companies and
// results are the game's, labelled; these tests are about what persists and what follows from what.
import { describe, expect, it } from 'vitest';
import { KILL_FEE_DAYS, SLATE_SIZE, industryStanding, productionById, slateHere } from '../src/engine/productions';
import { personalPostings } from '../src/engine/personal';
import { stream } from '../src/engine/rng';
import { acceptJob, acceptRefusal, askBetterRate, evidenceFor, reliability, rolesOffered, type OutsideJob } from '../src/engine/jobs';
import { deserialize, serialize } from '../src/engine/save';
import { processUntil, schedule } from '../src/engine/state';
import { DAY, addDaysToKey } from '../src/engine/time';
import type { GameState } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

/** What SLATE has posted to the bank, in dollars at each day's rate: a balance held in pounds moves with the rate, and this doesn't. */
const posted = (x: GameState) => Math.round(personalPostings(x).reduce((a, p) => a + p.amount, 0) * 100) / 100;

function offered(s: GameState, via?: string): OutsideJob {
  for (let i = 0; i < 60 && !(s.jobs ?? []).some((j) => j.status === 'offered'); i++) {
    schedule(s, s.now + 1000, 'job-offer', via ? { via } : { after: 'fixture' }, { attention: 'silent', priority: 70 });
    processUntil(s, s.now + 2000, 'tick', 1000);
  }
  return (s.jobs ?? []).find((x) => x.status === 'offered')!;
}

describe('a slate of productions', () => {
  it('is kept: the same save makes the same productions, a later one never changes an earlier one, and a save keeps them', () => {
    const a = startLife('prod-slate');
    const b = startLife('prod-slate');
    const one = slateHere(a, a.locationId, 'Europe/London');
    expect(one).toHaveLength(SLATE_SIZE);
    expect(slateHere(b, b.locationId, 'Europe/London').map((p) => p.title)).toEqual(one.map((p) => p.title));
    expect(slateHere(a, a.locationId, 'Europe/London')).toEqual(one); // asked again, nothing new
    for (const p of one) expect([p.shootsFrom < p.wrapsOn, p.wrapsOn < p.releasesOn, p.parts.length >= 3]).toEqual([true, true, true]);
    expect(deserialize(serialize(a)).productions).toEqual(a.productions);
  });

  it('comes out on its dates and is received; it is topped up as productions wrap, never reset', () => {
    const s = startLife('prod-life');
    const first = slateHere(s, s.locationId, 'Europe/London').map((p) => p.id);
    const last = first.map((id) => productionById(s, id)!).sort((x, y) => (x.releasesOn < y.releasesOn ? 1 : -1))[0];
    processUntil(s, Date.parse(`${last.releasesOn}T12:00:00Z`) + DAY, 'tick', 1_000_000);
    expect(first.every((id) => productionById(s, id)!.result!.reception >= 35)).toBe(true);
    const now = slateHere(s, s.locationId, 'Europe/London');
    expect(now.every((p) => !first.includes(p.id))).toBe(true); // the old ones wrapped and stay recorded
    expect(s.productions!.filter((p) => first.includes(p.id))).toHaveLength(first.length);
  });
});

describe('work on one', () => {
  it('names the production, the part, the material and what is asked, inside its shooting dates', () => {
    const s = startLife('prod-job');
    const j = offered(s);
    const p = productionById(s, j.productionId!)!;
    expect([j.production, j.company]).toEqual([p.title, p.company]);
    expect(j.part).toMatch(/^The part of /);
    expect(j.material).toMatch(/^Sides for /);
    expect(j.requirement).toMatch(/^Lines learned by the first day/);
    expect(j.days.every((k) => k >= p.shootsFrom && k <= p.wrapsOn)).toBe(true);
  });

  it('opens writing on a writing sample and directing on days on others\' sets, not only a delivered film', () => {
    const s = startLife('prod-entry');
    expect(rolesOffered(s)).toEqual(['acting']);
    const p = buildProject(s, { title: 'Sample', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada' }], [{ place: 'Pier', chars: ['Ada'] }]);
    approve(s, p);
    expect(rolesOffered(s)).toEqual(['acting', 'writing']);
    expect(evidenceFor(s, 'writing')).toBe('Your approved script stands as a writing sample.');
    (s.jobs ??= []).push(...[1, 2].map((i) => ({ id: `done-${i}`, role: 'acting' as const, production: 'Fixture', company: 'Fixture', dayRate: 300, days: ['2026-01-01'], placeId: s.locationId, zone: 'Europe/London', status: 'done' as const, offeredAt: 0, answerBy: 0, attended: ['2026-01-01'], missed: [] })));
    expect(rolesOffered(s)).toEqual(['acting', 'writing', 'directing']);
  });

  it('can be asked once for a better rate: held for a newcomer with no agent, and the offer waits for the answer', () => {
    const s = startLife('prod-counter');
    const j = offered(s);
    const rate = j.dayRate;
    askBetterRate(s, j.id);
    expect(acceptRefusal(s, j.id)).toMatch(/is answering the rate you asked for\.$/);
    expect(() => askBetterRate(s, j.id)).toThrow('You have asked once already.');
    processUntil(s, s.now + 3 * DAY, 'tick', 100000);
    expect([j.counter!.outcome, j.dayRate, j.status]).toEqual(['held', rate, 'offered']);
  });

  it('counts how the productions worked on were received toward the next offers', () => {
    const s = startLife('prod-standing');
    expect(industryStanding(s)).toBe(1);
    const p = slateHere(s, s.locationId, 'Europe/London')[0];
    (s.jobs ??= []).push({ id: 'w', role: 'acting', production: p.title, company: p.company, productionId: p.id, dayRate: 300, days: [p.shootsFrom], placeId: s.locationId, zone: 'Europe/London', status: 'done', offeredAt: 0, answerBy: 0, attended: [p.shootsFrom], missed: [] });
    p.result = { reception: 80 };
    expect(industryStanding(s)).toBeCloseTo(1.2);
    p.result = { reception: 40 };
    expect(industryStanding(s)).toBeCloseTo(0.8);
  });
});

describe('confirmed, put back or cancelled', () => {
  /** A production of the slate whose confirmation draw says what is asked for, and a job taken on it (labelled fixture). */
  function withJob(tag: string, want: (r: number) => boolean) {
    for (let i = 0; i < 400; i++) {
      const s = startLife(`${tag}-${i}`);
      const p = slateHere(s, s.locationId, 'Europe/London').find((x) => want(stream(s.seed, 'production-confirm', x.id)()));
      if (!p) continue;
      const days = [p.shootsFrom, addDaysToKey(p.shootsFrom, 1)];
      (s.jobs ??= []).push({ id: 'taken', role: 'acting', production: p.title, company: p.company, productionId: p.id, part: `The part of ${p.parts[1].name}`, dayRate: 400, days, placeId: s.locationId, zone: 'Europe/London', status: 'offered', offeredAt: s.now, answerBy: s.now + 7 * DAY, attended: [], missed: [] });
      acceptJob(s, 'taken');
      return { s, p, j: s.jobs!.find((x) => x.id === 'taken')! };
    }
    throw new Error('no such production in 400 worlds');
  }

  it('cancelled, the work taken on it is released and paid its kill fee, with nothing against the player', () => {
    const { s, p, j } = withJob('prod-cancel', (r) => r < 0.05);
    const before = posted(s);
    processUntil(s, Date.parse(`${p.shootsFrom}T00:00:00Z`) - DAY, 'tick', 100_000);
    expect([p.cancelled, j.status]).toEqual([true, 'cancelled']);
    expect(posted(s) - before).toBe(400 * KILL_FEE_DAYS);
    expect(s.events.some((e) => e.kind === 'job-day' && e.payload.jobId === j.id)).toBe(false);
    expect(reliability(s)).toBe(1);
    expect(slateHere(s, s.locationId, 'Europe/London').some((x) => x.id === p.id)).toBe(false); // the slate moves on
  });

  it('put back, its dates move and so do the days of the work taken on it', () => {
    const { s, p, j } = withJob('prod-delay', (r) => r >= 0.05 && r < 0.15);
    const first = j.days[0];
    processUntil(s, Date.parse(`${p.shootsFrom}T00:00:00Z`) - DAY, 'tick', 100_000);
    expect(p.delayedDays).toBeGreaterThanOrEqual(21);
    expect(j.days[0]).toBe(addDaysToKey(first, p.delayedDays!));
    expect(j.status).toBe('accepted');
    expect(s.events.filter((e) => e.kind === 'job-day' && e.payload.jobId === j.id).map((e) => e.payload.date)).toEqual(j.days);
  });
});
