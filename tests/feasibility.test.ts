// Can it go ahead (src/engine/feasibility.ts; the owner's v6 package, 03 §6, V6-023): each check is what the project
// actually lacks, the first that fails is the bottleneck, and fixing it moves the bottleneck on. Each step changes one
// input and reads the decision.
import { describe, expect, it } from 'vitest';
import { feasibility } from '../src/engine/feasibility';
import { castPlayer } from '../src/engine/hiring';
import { approvedCharacters } from '../src/engine/projects';
import { projectedCost } from '../src/engine/estimate';
import { financeSummary } from '../src/engine/finance';
import { approve, buildProject, staffAll, startLife, startProduction } from './helpers';

describe('whether a project can go ahead', () => {
  it('names what holds it, lead first, and moves on as each is fixed', () => {
    const s = startLife('feasibility');
    const p = buildProject(s, { title: 'Ledger', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }, { name: 'Ben', patch: { roleSize: 'supporting' } }], [{ place: 'Pier', chars: ['Mara', 'Ben'], minutes: 3 }]);
    p.approvedDraft = null; // labelled fixture: nothing approved yet
    expect(feasibility(s, p).bottleneck!.label).toBe('Script');

    approve(s, p);
    const cast = feasibility(s, p).bottleneck!;
    expect(cast.label).toBe('Cast');
    expect(cast.detail).toBe('2 parts are not cast: Mara (a lead), Ben.'); // the lead named first
    expect(cast.options[0]).toMatch(/^Cast Mara on the Cast page/);

    for (const c of approvedCharacters(p)) castPlayer(s, p, c.id, 'on-camera');
    expect(feasibility(s, p).bottleneck!.label).toBe('Crew');

    staffAll(s, p);
    for (const h of p.hires) h.status = 'accepted'; // labelled fixture: every offer answered yes
    // Labelled fixture: none of the money the test helper promises every project.
    p.funding.extra = [];
    if (p.finance) p.finance.deals = [];
    const money = feasibility(s, p);
    expect(money.checks.find((c) => c.label === 'Crew')!.ok).toBe(true);
    const short = Math.round(projectedCost(s, p).total - financeSummary(p).promised);
    expect(short).toBeGreaterThan(0); // nothing is promised yet
    expect(money.bottleneck!.label).toBe('Money');
    expect(money.bottleneck!.detail).toMatch(/short\.$/);
    p.funding.extra.push({ source: 'Labelled fixture', amount: short + 1 } as never); // the rest promised
    const ready = feasibility(s, p);
    expect([ready.ready, ready.bottleneck]).toEqual([true, null]);
    expect(ready.checks.map((c) => c.label)).toEqual(['Script', 'Cast', 'Crew', 'Designs', 'Money']);
  });

  it('holds a project whose work would finish after a backer\'s date, and says what lateness costs', () => {
    const s = startLife('feasibility-late');
    const p = buildProject(s, { title: 'Ledger', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Mara'], minutes: 3 }]);
    approve(s, p);
    castPlayer(s, p, approvedCharacters(p)[0].id, 'on-camera');
    staffAll(s, p);
    for (const h of p.hires) h.status = 'accepted';
    startProduction(s, p, 2);
    p.funding.extra.push({ source: 'Labelled fixture', amount: 10_000_000 } as never);
    // Labelled fixture: a grant accepted with delivery due tomorrow.
    p.finance!.deals.push({ id: 'fd-late', kind: 'grant', backer: 'Harbour Arts Fund', amount: 5_000, status: 'accepted', askedAt: s.now, reason: '', received: 5_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: s.now + 86_400_000, unspent: 'stays' } } as never);
    const f = feasibility(s, p);
    expect(f.bottleneck!.label).toBe('Delivery Date');
    expect(f.bottleneck!.detail).toMatch(/^The work would finish around .+, after .+, when Harbour Arts Fund expects delivery\.$/);
    expect(f.bottleneck!.options.at(-1)).toBe('Deliver late: what Harbour Arts Fund paid in, $5,000 so far, must then be repaid.');
  });
});
