// SLATE-16-01.02, 16-04.02, 16-05: territories and exclusivity, reported earnings apart from money received, later windows.
import { describe, expect, it } from 'vitest';
import { DAY, DISTRIBUTOR_FEE, LATER_WINDOW_DAYS, REPORT_MONTHS, acceptDistribution, exclusiveHolder, laterWindowTerritories, offerConflicts, offerScope, processUntil, reportedGross } from './engine-api';
import type { DistributionOffer, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

function delivered(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Tidewater', format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', intExt: 'INT', chars: ['Ada'], minutes: 2 }]);
  approve(s, p);
  castAll(s, p); staffAll(s, p);
  for (let i = 0; i < 6; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 5);
  runDays(s, p, 200);
  p.offers = [];
  return { s, p };
}
const offer = (p: Project, id: string, route: DistributionOffer['route'], territories: string[], exclusive = false, now = 0): DistributionOffer => {
  const o: DistributionOffer = { id, distributor: `Distributor ${id}`, route, minimumGuarantee: 10_000, territories, releaseWindowDays: 20, expiresAt: now + 30 * DAY, status: 'open', ...(exclusive ? { exclusive } : {}) };
  p.offers.push(o);
  return o;
};

describe('territories and exclusivity', () => {
  it('offers range from the home country to worldwide; theatrical is exclusive; wider rights pay more', () => {
    const { p } = delivered('terr-scope');
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const route of ['theatrical', 'streaming', 'digital', 'broadcast'] as const) {
        const t = offerScope(7, p, 'delivery', i, route);
        seen.add(t.territories.length === 1 ? 'home' : t.territories.length > 6 ? 'world' : 'wide');
        expect(t.territories[0]).toBe('GB');
        if (route === 'theatrical') expect(t.exclusive).toBe(true);
        if (t.territories.length > 6) expect(['streaming', 'digital']).toContain(route);
        expect(t.factor).toBe(Math.min(2.5, 1 + 0.25 * (t.territories.length - 1)));
      }
    }
    expect([...seen].sort()).toEqual(['home', 'wide', 'world']);
  });

  it('accepting ends overlapping offers on the same route, or on any route if exclusive; an exclusive deal holds its territories', () => {
    const { s, p } = delivered('terr-conflict');
    const ex = offer(p, 'a', 'streaming', ['GB', 'US'], true, s.now);
    const bc = offer(p, 'b', 'broadcast', ['GB'], false, s.now);
    const fr = offer(p, 'c', 'digital', ['FR'], false, s.now);
    expect(offerConflicts(p, ex).map((x) => x.id)).toEqual(['b']);
    expect(offerConflicts(p, bc).map((x) => x.id)).toEqual(['a']);
    acceptDistribution(s, p, ex.id);
    expect([bc.status, fr.status]).toEqual(['declined', 'open']);
    const later = offer(p, 'd', 'digital', ['US'], false, s.now);
    expect(exclusiveHolder(p, later, '2026-06-01')).toMatch(/^Distributor a holds exclusive rights in US until \d{4}-\d{2}-\d{2}\.$/);
    expect(exclusiveHolder(p, later, '2099-01-01')).toBeNull();
    expect(() => acceptDistribution(s, p, later.id)).toThrow('holds exclusive rights in US');
    // A later window offers only what isn't held, and not what this route has already released.
    expect(laterWindowTerritories(p, 'digital', ['GB', 'US', 'FR'], '2026-06-01')).toEqual(['FR']);
    expect(laterWindowTerritories(p, 'streaming', ['GB', 'US', 'FR'], '2099-01-01')).toEqual(['FR']);
  }, 60000);
});

describe('reported earnings and money received', () => {
  it('monthly reports recoup the guarantee first; only the overage reaches you, kept apart from what is reported', () => {
    const { s, p } = delivered('terr-report');
    const o = offer(p, 'r', 'theatrical', ['GB'], true, s.now);
    o.minimumGuarantee = 1000; // labelled fixture: a small guarantee, so the reports pass it
    p.quality = { ...(p.quality ?? {}), reception: 80 } as Record<string, number>;
    const before = p.revenue;
    acceptDistribution(s, p, o.id);
    expect(p.revenue - before).toBe(1000);
    processUntil(s, s.now + (o.releaseWindowDays + 2) * DAY, 'tick', 200000);
    // Released: the later window is scheduled on a wave of its own.
    expect(s.events.some((e) => e.kind === 'distribution-offer' && e.payload.wave === `window:${o.id}`)).toBe(true);
    processUntil(s, s.now + (REPORT_MONTHS * 31 + 2) * DAY, 'tick', 200000);
    const gross = Array.from({ length: REPORT_MONTHS }, (_, i) => reportedGross(s.seed, p, o, i + 1)).reduce((a, b) => a + b, 0);
    expect(o.reported!.gross).toBe(gross);
    expect(o.reported!.overagePaid).toBe(Math.max(0, o.reported!.net - 1000));
    expect(o.reported!.net).toBeLessThanOrEqual(Math.round(gross * (1 - DISTRIBUTOR_FEE)) + REPORT_MONTHS);
    expect(p.revenue - before).toBe(1000 + o.reported!.overagePaid);
    // Its later window found nothing GB's exclusive deal doesn't hold, and says so rather than reading as no interest.
    expect(p.offers.filter((x) => x.laterWindow)).toEqual([]);
    expect(s.log.map((l) => l.text)).toContain('Distributors looked at a later window of Tidewater, but your earlier deals still hold the rights they wanted, so there is nothing to accept.');
  }, 60000);
});

describe('later windows', () => {
  it('come some months after a release, marked as a later window, and never offer what the first release already covers', () => {
    const { s, p } = delivered('terr-window');
    const o = offer(p, 'w', 'digital', ['GB'], false, s.now);
    p.quality = { ...(p.quality ?? {}), reception: 80 } as Record<string, number>; // labelled fixture: a film distributors want
    acceptDistribution(s, p, o.id);
    processUntil(s, s.now + (o.releaseWindowDays + LATER_WINDOW_DAYS + 3) * DAY, 'tick', 200000);
    const later = p.offers.filter((x) => x.laterWindow);
    expect(later.length).toBeGreaterThan(0);
    for (const x of later) expect(x.route === 'digital' && x.territories.includes('GB')).toBe(false);
    expect(s.log.some((l) => /made (an offer|offers) for a later window of Tidewater\. Offers stay open for three weeks\.$/.test(l.text))).toBe(true);
  }, 60000);
});
