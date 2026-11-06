import { describe, expect, it } from 'vitest';
import { DAY, DELIVERY_MATERIALS, acceptDistribution, cancelRelease, declineDistribution, ledgerTotals, processUntil, releaseCancelTerms } from './engine-api';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';
import type { DistributionOffer, GameState, Project } from '../src/engine/types';

function delivered(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Tidewater', format: 'short', medium: 'live-action', scenario: 'micro' },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', intExt: 'INT', chars: ['Ada'], minutes: 2 }]);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 6; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
  startProduction(s, p, 5);
  runDays(s, p, 200);
  expect(p.delivered).not.toBeNull();
  return { s, p };
}

const offer = (p: Project, id: string, route: DistributionOffer['route'], mg: number, now: number): DistributionOffer => {
  const o: DistributionOffer = { id, distributor: `Distributor ${id}`, route, minimumGuarantee: mg, territories: ['GB'], releaseWindowDays: 20, expiresAt: now + 30 * DAY, status: 'open' };
  p.offers.push(o);
  return o;
};

describe('distribution contracts and release', () => {
  it('accepting reserves delivery materials; cancelling before release returns the guarantee and frees the reservation', () => {
    const { s, p } = delivered('rel-cancel');
    const revenue = p.revenue;
    const available = ledgerTotals(p).available;
    offer(p, 'a', 'streaming', 20000, s.now);
    const other = offer(p, 'b', 'streaming', 15000, s.now);
    const r = acceptDistribution(s, p, 'a');
    expect(other.status).toBe('declined'); // one deal per route
    expect(p.revenue).toBe(revenue + 20000);
    expect(ledgerTotals(p).available).toBe(available + 20000 - DELIVERY_MATERIALS.streaming); // guarantee in, materials held
    expect(releaseCancelTerms(p, r.id)).toMatch(/minimum guarantee of \$20,000 is returned/);
    cancelRelease(s, p, r.id);
    expect(r.status).toBe('cancelled');
    expect(p.revenue).toBe(revenue);
    expect(ledgerTotals(p).available).toBe(available);
    expect(s.events.some((e) => e.kind === 'release' && e.payload.releaseId === r.id)).toBe(false);
    expect(() => cancelRelease(s, p, r.id)).toThrow(/already cancelled/);
    processUntil(s, s.now + 40 * DAY, 'tick', 100000);
    expect(r.status).toBe('cancelled'); // nothing releases it later
  }, 120000);

  it('a contracted release happens on its date and pays the materials once; declining frees nothing because nothing was held', () => {
    const { s, p } = delivered('rel-go');
    offer(p, 'c', 'digital', 5000, s.now);
    offer(p, 'd', 'theatrical', 30000, s.now);
    declineDistribution(p, 'd');
    const r = acceptDistribution(s, p, 'c');
    processUntil(s, s.now + 25 * DAY, 'tick', 100000);
    expect(r.status).toBe('released');
    expect(p.phase).toBe('released');
    const ob = p.obligations.find((o) => o.id === r.obligationId)!;
    expect(ob.state).toBe('settled');
    expect(ob.settled).toBe(DELIVERY_MATERIALS.digital);
    expect(ob.postings.filter((x) => x.kind === 'settle')).toHaveLength(1);
    expect(p.history.some((h) => h.text.startsWith('Released: Digital'))).toBe(true);
    expect(() => cancelRelease(s, p, r.id)).toThrow(/already happened/);
  }, 120000);
});
