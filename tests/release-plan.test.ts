// The Release Plan (src/engine/release-plan.ts; the owner's v5 brief, 6). A delivered project here is a labelled fixture:
// built, its pitch written, marked delivered and received as given, with money in its budget, so each test is about
// the plan. Controlled comparisons: one film, one ask higher than the next; one reception under a buyer's bar and over.
import { describe, expect, it } from 'vitest';
import { DAY, acceptDistribution, deserialize, ledgerTotals, planRelease, processUntil, serialize } from './engine-api';
import {
  AGENT_SHARE, AGGREGATOR_FEE, BUYERS, PARTNER_FEE, SCREEN_RENTAL, alternatives, buyerValue, planRefusal, proposalRefusal, proposeLicence, releaseYourself,
  selfCosts, selfRefusal, setReleasePlan,
} from '../src/engine/release-plan';
import { promoLift, reportedGross } from '../src/engine/distribution';
import { dateKey } from '../src/engine/time';
import { getPlace } from '../src/data/places';
import type { Format, GameState, Project, ReleasePlan } from '../src/engine/types';
import { buildProject, startLife, writePitch } from './helpers';

function film(tag: string, reception: number, format: Format = 'feature'): { s: GameState; p: Project } {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Tidewater', format, medium: 'live-action', runtime: 90 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'] }]);
  writePitch(p);
  p.delivered = { at: s.now, runtimeMin: 90 };
  p.phase = 'delivered';
  p.quality = { reception };
  p.funding.fund += 60_000; // labelled fixture: money raised and unspent
  return { s, p };
}
const today = (s: GameState, p: Project) => dateKey(s.now, getPlace(p.axes.basePlaceId).zone);
const plan = (s: GameState, p: Project, over: Partial<ReleasePlan> = {}) => ({ routes: [], territories: ['GB'], date: addDays(today(s, p), 40), festivalUntil: null, version: 'subtitled' as const, promo: 0, ...over });
const addDays = (k: string, n: number) => new Date(Date.parse(k) + n * DAY).toISOString().slice(0, 10);
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);

describe('a plan', () => {
  it('needs a delivered project, a route, real territories and a date; a festival-first plan says until when', () => {
    const { s, p } = film('rp-plan', 70);
    expect(planRefusal(s, p, plan(s, p))).toBe('Choose at least one route.');
    expect(planRefusal(s, p, plan(s, p, { routes: ['direct'], territories: ['XX'] }))).toBe("Choose countries by their two-letter codes, such as GB or US. XX isn't one.");
    expect(planRefusal(s, p, plan(s, p, { routes: ['festival-first'] }))).toBe('Say until when festivals hold it: a date on or before the release date.');
    const series = film('rp-plan-series', 70, 'series').p;
    expect(planRefusal(s, series, plan(s, series, { routes: ['distributor-sales'] }))).toMatch(/^Distributor Sales is for films\./);
    p.delivered = null;
    expect(planRefusal(s, p, plan(s, p, { routes: ['direct'] }))).toBe('Deliver the project first.');
  });

  it('festival-first holds every public release until its date, an offer\'s too', () => {
    const { s, p } = film('rp-hold', 70);
    setReleasePlan(s, p, plan(s, p, { routes: ['festival-first', 'direct'], festivalUntil: addDays(today(s, p), 30) }));
    expect(() => planRelease(s, p, { route: 'digital', date: addDays(today(s, p), 10), territories: ['GB'] })).toThrow(/keeps Tidewater for festivals until/);
    p.offers.push({ id: 'o1', distributor: 'Northlight Pictures', route: 'streaming', minimumGuarantee: 10_000, territories: ['GB'], releaseWindowDays: 10, expiresAt: s.now + 20 * DAY, status: 'open' });
    expect(() => acceptDistribution(s, p, 'o1')).toThrow(/keeps Tidewater for festivals/);
    expect(p.offers[0].status).toBe('open'); // nothing was signed
    expect(planRelease(s, p, { route: 'digital', date: addDays(today(s, p), 31), territories: ['GB'] }).status).toBe('planned');
  });
});

describe('a licence proposal', () => {
  it('is accepted at or under what the buyer would pay, countered up to half again, rejected beyond; the offer still waits for you', () => {
    const value = buyerValue(film('rp-v', 70).p, 'broadcast-licence', ['GB'], false);
    expect(value).toBe(180_000); // (70 - 40) x 6,000, a feature's full length, one territory: game calibration
    for (const [ask, status, guarantee] of [[value, 'accepted', value], [value * 1.4, 'countered', value], [value * 2, 'rejected', null]] as const) {
      const { s, p } = film(`rp-ask-${status}`, 70);
      setReleasePlan(s, p, plan(s, p, { routes: ['broadcast-licence'] }));
      const pr = proposeLicence(s, p, { route: 'broadcast-licence', buyer: 'Channel Meridian', territories: ['GB'], ask, exclusive: false });
      wait(s, 22);
      expect(pr.status).toBe(status);
      const o = p.offers.find((x) => x.id === pr.offerId);
      expect(o ? [o.status, o.minimumGuarantee] : null).toEqual(guarantee === null ? null : ['open', guarantee]);
      if (status === 'rejected') expect(alternatives(p, pr)[0]).toBe('Ask Channel Meridian again for less: rights like these sell for about $180,000.');
    }
  });

  it('is turned down on the work under a buyer\'s bar, finally for that buyer, with the routes that remain', () => {
    const { s, p } = film('rp-bar', 60);
    setReleasePlan(s, p, plan(s, p, { routes: ['streaming-licence', 'transactional'] }));
    const pr = proposeLicence(s, p, { route: 'streaming-licence', buyer: 'Cobalt Stream', territories: ['GB'], ask: 1_000, exclusive: false });
    wait(s, 29);
    expect([pr.status, pr.over, pr.answer]).toEqual(['rejected', 'reception', 'It takes work received at 65 or better, and Tidewater was received at 60.']);
    expect(proposalRefusal(s, p, { route: 'streaming-licence', buyer: 'Cobalt Stream', territories: ['GB'], ask: 1_000, exclusive: false })).toBe("Cobalt Stream turned it down on how it was received. It won't read it again.");
    const alt = alternatives(p, pr).join(' ');
    expect(alt).toContain('Buyers who work to a lower bar: Distributor Sales, Broadcast Licence.');
    expect(alt).toContain('Release it yourself: Transactional Digital, Direct To Audience, Partner-Assisted Theatrical.');
  });

  it('to a streaming service goes through a sales agent, whose share of the guarantee is taken when you sign', () => {
    const { s, p } = film('rp-agent', 80);
    setReleasePlan(s, p, plan(s, p, { routes: ['streaming-licence'] }));
    const pr = proposeLicence(s, p, { route: 'streaming-licence', buyer: 'Night Owl Streaming', territories: ['GB'], ask: 50_000, exclusive: true });
    wait(s, 29);
    expect(pr.status).toBe('accepted');
    const o = p.offers.find((x) => x.id === pr.offerId)!;
    expect([o.agentShare, o.exclusive, o.releaseWindowDays]).toEqual([AGENT_SHARE, true, 30]);
    acceptDistribution(s, p, o.id);
    expect(p.obligations.find((x) => x.ref === `agent:${o.id}`)!.settled).toBe(50_000 * AGENT_SHARE);
    // Its exclusive rights keep the territory from any other proposal.
    expect(proposalRefusal(s, p, { route: 'streaming-licence', buyer: 'Cobalt Stream', territories: ['GB'], ask: 10_000, exclusive: false })).toBe('An exclusive deal holds United Kingdom.');
  });

  it('takes a season, worth more for more episodes', () => {
    const a = film('rp-season-a', 75, 'series').p;
    const b = film('rp-season-b', 75, 'series').p;
    a.axes.episodeCount = 4;
    b.axes.episodeCount = 8;
    expect(buyerValue(b, 'streaming-licence', ['GB'], false)).toBeGreaterThan(buyerValue(a, 'streaming-licence', ['GB'], false));
  });
});

describe('releasing it yourself', () => {
  it('names every cost first, books with nobody to accept it, and earns from its reports, more with promotion', () => {
    const { s, p } = film('rp-self', 70);
    expect(selfCosts(p, 'partner-theatrical', ['GB', 'IE'], 0).map((c) => c.amount)).toEqual([PARTNER_FEE, 2 * SCREEN_RENTAL, 6_000]);
    setReleasePlan(s, p, plan(s, p, { routes: ['transactional'], promo: 20_000 }));
    expect(selfCosts(p, 'transactional', ['GB'], 20_000)).toEqual([{ label: "The Aggregator's Fee, Encoding And Quality Check", amount: AGGREGATOR_FEE, when: 'now' }, { label: 'Promotion', amount: 20_000, when: 'release' }]);
    const free = ledgerTotals(p).available;
    const o = releaseYourself(s, p, 'transactional');
    expect([o.status, o.self, o.fee, o.minimumGuarantee]).toEqual(['accepted', 'transactional', 0.3, 0]);
    expect(ledgerTotals(p).available).toBe(free - AGGREGATOR_FEE - 20_000);
    expect(selfRefusal(s, p, 'transactional')).toBe('Your transactional digital release is already booked.');
    wait(s, 41 + 31);
    expect(o.reported!.gross).toBeGreaterThan(0);
    expect(p.revenue).toBeGreaterThan(0); // until November 13, 2026 a self-release earned nothing
    // Promotion widens what the same release reports; none, and it reports less.
    const bare = { ...o, promo: 0 };
    expect(reportedGross(s.seed, p, o, 1)).toBeGreaterThan(reportedGross(s.seed, p, bare, 1));
    expect(promoLift(0)).toBe(1);
    // With limits, never a guarantee: each dollar reaches fewer new people than the last, and no spend lifts it past 2.5x.
    expect(promoLift(160_000) - promoLift(40_000)).toBeLessThan(promoLift(40_000) - promoLift(0));
    expect(promoLift(1e9)).toBe(2.5);
  });

  it('can\'t be booked without the money, or where an exclusive deal holds the rights', () => {
    const { s, p } = film('rp-self-no', 70);
    setReleasePlan(s, p, plan(s, p, { routes: ['partner-theatrical', 'direct'], territories: ['GB', 'US', 'FR', 'DE', 'ES', 'IT', 'JP', 'BR', 'CA'], promo: 500_000 }));
    expect(selfRefusal(s, p, 'partner-theatrical')).toMatch(/^It costs \$\d[\d,]+, and Tidewater has \$[\d,]+ free\./);
    p.offers.push({ id: 'x', distributor: 'Kestrel Media', route: 'streaming', minimumGuarantee: 0, territories: ['FR'], releaseWindowDays: 0, expiresAt: s.now, status: 'accepted', exclusive: true, exclusiveUntil: addDays(today(s, p), 300) });
    expect(selfRefusal(s, p, 'direct')).toBe('An exclusive deal holds France. Take it out of the plan\'s territories, or wait until the deal ends.');
  });

  it('keeps the plan and its proposals through a save', () => {
    const { s, p } = film('rp-save', 70);
    setReleasePlan(s, p, plan(s, p, { routes: ['broadcast-licence'] }));
    proposeLicence(s, p, { route: 'broadcast-licence', buyer: BUYERS['broadcast-licence'][1], territories: ['GB'], ask: 10_000, exclusive: false });
    expect(deserialize(serialize(s)).projects.find((x) => x.id === p.id)!.releasePlan).toEqual(p.releasePlan);
  });
});
