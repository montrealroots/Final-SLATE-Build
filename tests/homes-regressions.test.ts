// Three findings against main at 20563b1 (the owner's brief of November 17, 2026, section 1), reproduced before they
// were fixed: a change order charged twice; a deposit that covered part of the rent owed wiped all of it; a design
// edited while its approval was pending left the project waiting for a decision that would never come.
import { describe, expect, it } from 'vitest';
import { marketEvidence, offersIn } from '../src/engine/homes/market';
import { homesOf } from '../src/engine/homes/core';
import { applyToRent, giveNotice, moveIn, payArrears, signLease } from '../src/engine/homes/renting';
import { makeOffer } from '../src/engine/homes/buying';
import { applyForApproval, investigate, saveDesign, signBuild, startDesign } from '../src/engine/homes/building';
import { bankSpendable } from '../src/engine/bank';
import { processUntil } from '../src/engine/state';
import { deserialize, serialize } from '../src/engine/save';
import { DAY } from '../src/engine/time';
import type { GameState } from '../src/engine/types';
import type { Home } from '../src/engine/homes/model';
import { startLife } from './helpers';

const advance = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'advance', 100000);
async function offers(s: GameState, placeId: string) {
  const day = new Date(s.now).toISOString().slice(0, 10);
  return offersIn(s.seed, await marketEvidence(placeId, day), day);
}

/** The first home a pick finds on the market, waiting a month at a time, as a player would, when none is listed now. */
async function listed(s: GameState, placeId: string, pickIt: (h: Home) => boolean): Promise<Home> {
  for (let i = 0; i < 12; i++) {
    const h = (await offers(s, placeId)).find(pickIt);
    if (h) return h;
    processUntil(s, s.now + 30 * DAY, 'advance', 100000);
  }
  throw new Error(`Nothing listed in ${placeId} in a year`);
}
/** A plot in Austin, surveyed, with a design started on it. */
async function plotWithDesign(tag: string, inheritanceUsd?: number) {
  const s = startLife(tag, 'us-austin', { startDate: '2026-03-02', ...(inheritanceUsd ? { inheritance: { currency: 'USD' as const, amountMinor: inheritanceUsd * 100 } } : {}) });
  const land = await listed(s, 'us-austin', (h) => h.form === 'land');
  makeOffer(s, land, land.priceMinor, { finance: 'cash', inspect: false });
  advance(s, 35);
  investigate(s, land.id, 'survey');
  advance(s, 8);
  return { s, b: startDesign(s, land.id) };
}
const paidFor = (b: { payments: { key: string; minor: number; kind: string }[] }) => b.payments.filter((p) => p.kind === 'paid').reduce((a, p) => a + p.minor, 0);

describe('a change order during construction', () => {
  it('is paid once: what it adds to work already paid for now, and the stages still to come at their new cost', async () => {
    const { s, b } = await plotWithDesign('reg-change');
    applyForApproval(s, b.id);
    advance(s, 31);
    signBuild(s, b.id);
    advance(s, 9); // Site Work done, Foundations under way and paid
    expect(b.current).toBe(1);
    const before = bankSpendable(s);
    saveDesign(s, b.id, { design: { garage: 'double' } }); // the garage is built in a stage to come
    // Nothing of it was in work already paid for, so nothing is charged now.
    expect(bankSpendable(s)).toBeCloseTo(before, 2);
    // A repeated save with nothing changed charges nothing.
    saveDesign(s, b.id, { design: { garage: 'double' } });
    expect(bankSpendable(s)).toBeCloseTo(before, 2);
    advance(s, 200);
    expect(b.stage).toBe('complete');
    // Every stage and change order together: exactly the final cost plan, not the change twice.
    expect(paidFor(b)).toBe(b.quoteMinor);
  });

  it('charges now what a change adds to a stage already paid for, once, and survives a reload', async () => {
    const { s, b } = await plotWithDesign('reg-change-paid');
    applyForApproval(s, b.id);
    advance(s, 31);
    signBuild(s, b.id); // Site Work paid (it carries the design fee)
    saveDesign(s, b.id, { floorAreaM2: 150, design: { widthM: 10.5, depthM: 7.2 }, rooms: [...b.rooms, { kind: 'storage', areaM2: 6 }] });
    const changeKeys = b.payments.filter((p) => p.key.includes(':change:'));
    expect(changeKeys).toHaveLength(1); // the larger house's design fee, on a stage already paid
    const back = deserialize(serialize(s));
    const b2 = homesOf(back).builds[0];
    advance(back, 230);
    expect(b2.stage).toBe('complete');
    expect(paidFor(b2)).toBe(b2.quoteMinor);
  });

  it("refuses a change that adds to work already paid for when the money isn't there, and changes nothing", async () => {
    const { s, b } = await plotWithDesign('reg-change-short', 900_000);
    applyForApproval(s, b.id);
    advance(s, 31);
    signBuild(s, b.id);
    // Leave too little to pay what a much larger design adds to Site Work.
    const design = JSON.stringify(b.design);
    const stages = JSON.stringify(b.stages);
    const payments = b.payments.length;
    const spendable = bankSpendable(s);
    let refused = false;
    try {
      saveDesign(s, b.id, { floorAreaM2: 60000, design: { floors: 4, widthM: 60, depthM: 250 } });
    } catch { refused = true; }
    expect(refused).toBe(true);
    expect(JSON.stringify(b.design)).toBe(design);
    expect(JSON.stringify(b.stages)).toBe(stages);
    expect(b.payments).toHaveLength(payments);
    expect(bankSpendable(s)).toBeCloseTo(spendable, 2);
  });
});

describe('a deposit kept against rent owed', () => {
  it('covers only what it can: the rest of the rent stays owed, is shown, and can still be paid once', async () => {
    // Labelled fixture: an inheritance small enough that the rent fails after a few months.
    const s = startLife('reg-arrears', 'gb-london', { startDate: '2026-03-02', inheritance: { currency: 'USD', amountMinor: 1_200_000 } });
    const home = (await offers(s, 'gb-london')).filter((h) => h.market === 'rent').sort((a, b) => a.priceMinor - b.priceMinor)[0];
    const t = applyToRent(s, home);
    advance(s, 4);
    expect(t.stage).toBe('approved');
    signLease(s, t.id);
    advance(s, Math.max(0, (Date.parse(`${t.start}T12:00:00Z`) - s.now) / DAY) + 1);
    moveIn(s, home.id);
    giveNotice(s, t.id);
    advance(s, (Date.parse(`${t.endsOn}T23:00:00Z`) - s.now) / DAY);
    expect(t.stage).toBe('ended');
    const held = t.payments.filter((p) => p.kind === 'held').reduce((a, p) => a + p.minor, 0);
    const damage = (t.deductions ?? []).filter((d) => !d.wear).reduce((a, d) => a + d.minor, 0);
    const owedRent = t.arrearsMinor;
    expect(owedRent).toBeGreaterThan(held); // the deposit can't cover it
    // Reload before the settlement: it happens once, the same way.
    const back = deserialize(serialize(s));
    const t2 = homesOf(back).tenancies[0];
    advance(back, 15);
    advance(back, 15);
    expect(t2.keptMinor).toBe(held);
    expect(t2.refundedMinor).toBe(0);
    // What the deposit didn't cover is still owed: until November 17, 2026 it was wiped to nothing.
    expect(t2.arrearsMinor).toBe(owedRent + damage - held);
    expect(t2.payments.filter((p) => p.key === `dep:${t2.id}:kept`)).toHaveLength(1);
  });

  it('settles a deposit that covers all the rent owed, and leaves nothing owed', async () => {
    const s = startLife('reg-arrears-covered', 'gb-london', { startDate: '2026-03-02' });
    const home = (await offers(s, 'gb-london')).find((h) => h.market === 'rent')!;
    const t = applyToRent(s, home);
    advance(s, 4);
    signLease(s, t.id);
    advance(s, Math.max(0, (Date.parse(`${t.start}T12:00:00Z`) - s.now) / DAY) + 1);
    moveIn(s, home.id);
    giveNotice(s, t.id);
    advance(s, (Date.parse(`${t.endsOn}T23:00:00Z`) - s.now) / DAY);
    t.arrearsMinor = 10000; // labelled fixture: a hundred pounds of rent owed at move-out, less than the deposit
    advance(s, 15);
    expect(t.arrearsMinor).toBe(0);
    expect(() => payArrears(s, t.id)).toThrow('You owe no rent');
  });
});

describe('a design changed while its approval is pending', () => {
  it('withdraws the application for the old design: the project can be applied for again and is decided', async () => {
    const { s, b } = await plotWithDesign('reg-pending');
    applyForApproval(s, b.id);
    expect(b.stage).toBe('awaiting-permission');
    saveDesign(s, b.id, { design: { wallColor: 'sage' } });
    // Until November 17, 2026 it stayed awaiting a decision that would never come.
    expect(b.stage).toBe('designing');
    advance(s, 31);
    expect(b.stage).toBe('designing'); // the old application's decision doesn't land on the new design
    const back = deserialize(serialize(s));
    const b2 = homesOf(back).builds[0];
    applyForApproval(back, b2.id);
    advance(back, 31);
    expect(b2.stage).toBe('permitted');
    expect(b2.design.wallColor).toBe('sage');
  });
});

describe('local and dated evidence', () => {
  it("prices a town from its own county's HUD rents, not a placeholder: Lancaster, Texas, in Dallas County", async () => {
    const { registerPlace, getPlace } = await import('../src/data/places');
    // The world catalog's Lancaster, Texas (GeoNames 4705191), as the game registers it when it's chosen.
    registerPlace({ ...getPlace('us-austin'), id: 'gn:4705191', name: 'Lancaster', region: 'Texas', regionKey: 'US.TX', lat: 32.59208, lon: -96.75611, geonameId: '4705191' } as never);
    const ev = await marketEvidence('gn:4705191', '2026-03-02');
    // HUD FY2026 for Dallas County, revised: studio to four bedrooms (src/data/homes/hud/TX.json).
    expect(ev.rent?.byBedrooms).toEqual([158200, 164800, 193100, 243100, 309100]);
    expect(ev.rent?.evidence.says).toContain('Dallas County');
    expect(ev.rent?.evidence.retrospective).toBeUndefined(); // FY2026 was in force from October 1, 2025
  });

  it('says a figure is retrospective when the game date is before it was published, and uses it as a reconstruction', async () => {
    // ONS's September 2026 rents were published on October 21, 2026; EIA's 2025 prices on October 21, 2026.
    const before = await marketEvidence('gb-london', '2026-03-02');
    const after = await marketEvidence('gb-london', '2026-11-01');
    expect(before.rent?.evidence.retrospective).toBe(true);
    expect(before.rent?.evidence.says).toContain('only available from 2026-10-21');
    expect(after.rent?.evidence.retrospective).toBeUndefined();
    expect(after.rent?.byBedrooms).toEqual(before.rent?.byBedrooms); // the same figures, only labelled differently
    const la = await marketEvidence('us-los-angeles', '2026-03-02');
    expect(la.electricity?.evidence.retrospective).toBe(true);
    expect(la.sale?.evidence.retrospective).toBeUndefined(); // NAHB's 2024 survey, published January 2025
  });
});

describe("each place's own market", () => {
  it('keeps the same fifty homes month to month, each listed in its own windows, and some change each month', async () => {
    const s = startLife('reg-market', 'us-chicago', { startDate: '2026-03-02' });
    const { marketPool, MARKET_SIZE } = await import('../src/engine/homes/market');
    const months = ['2026-03-02', '2026-04-02', '2026-05-02', '2026-06-02', '2026-09-02'];
    const pools = await Promise.all(months.map(async (d) => marketPool(s.seed, await marketEvidence('us-chicago', d), d)));
    for (const p of pools) expect(p).toHaveLength(MARKET_SIZE);
    // The same homes by id, and the same home is the same size and design whenever it's seen.
    expect(pools[4].map((h) => h.id)).toEqual(pools[0].map((h) => h.id));
    expect(pools[4].map((h) => `${h.form}:${h.floorAreaM2}:${h.design.style}`)).toEqual(pools[0].map((h) => `${h.form}:${h.floorAreaM2}:${h.design.style}`));
    // What's listed changes, but never all at once.
    for (let i = 1; i < pools.length; i++) {
      const a = new Set(pools[i - 1].filter((h) => h.listed).map((h) => h.id));
      const b = new Set(pools[i].filter((h) => h.listed).map((h) => h.id));
      const kept = [...b].filter((id) => a.has(id)).length;
      expect(kept).toBeGreaterThan(0);
    }
    const everListed = new Set(pools.flatMap((p) => p.filter((h) => h.listed).map((h) => h.id)));
    expect(everListed.size).toBeGreaterThan(pools[0].filter((h) => h.listed).length);
  });

  it("fits the place: no private pool in Anchorage's climate, and a small town's homes are mostly houses", async () => {
    const { marketPool, localMix } = await import('../src/engine/homes/market');
    const { getPlace, registerPlace } = await import('../src/data/places');
    const s = startLife('reg-fit', 'us-anchorage', { startDate: '2026-03-02' });
    const cold = marketPool(s.seed, await marketEvidence('us-anchorage', '2026-03-02'), '2026-03-02');
    expect(cold.some((h) => h.design.outdoor.includes('pool'))).toBe(false);
    expect(cold.some((h) => h.privateAmenities.includes('Private Pool'))).toBe(false);
    registerPlace({ ...getPlace('us-austin'), id: 'gn:4705191', name: 'Lancaster', region: 'Texas', population: 38801, geonameId: '4705191' } as never);
    expect(localMix(getPlace('gn:4705191')).label).toBe('a town');
    const town = marketPool(s.seed, await marketEvidence('gn:4705191', '2026-03-02'), '2026-03-02').filter((h) => h.form !== 'land');
    expect(town.filter((h) => h.form === 'detached').length).toBeGreaterThan(town.length / 2);
  });

  it('a relisted home comes back with its new listing, unless you are renting, buying or own it', async () => {
    const { pin } = await import('../src/engine/homes/core');
    const s = startLife('reg-relist', 'gb-london', { startDate: '2026-03-02' });
    const home = (await offers(s, 'gb-london')).find((h) => h.market === 'rent')!;
    pin(s, home); // seen (a favourite or a viewing): not agreed
    const relisted = { ...home, priceMinor: home.priceMinor + 5000, validUntil: '2026-09-30' };
    expect(pin(s, relisted).priceMinor).toBe(home.priceMinor + 5000);
    const t = applyToRent(s, relisted);
    expect(t.rentMinor).toBe(home.priceMinor + 5000);
    const again = { ...home, priceMinor: home.priceMinor + 99900, validUntil: '2026-12-31' };
    expect(pin(s, again).priceMinor).toBe(home.priceMinor + 5000); // applied for: the terms stand
  });
});
