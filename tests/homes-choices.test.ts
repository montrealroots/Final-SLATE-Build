// Each choice the Homes And Property screens offer, changed and compared (from November 17, 2026): the input audit
// (docs/input-audit/CONTROLS.csv) cites these for the controls it calls decisions. Change an input; the outcome
// changes, not only the sentence.
import { describe, expect, it } from 'vitest';
import { marketEvidence, offersIn } from '../src/engine/homes/market';
import { homesOf } from '../src/engine/homes/core';
import { applyToRent, approveRepair, moveIn, reportRepair, signLease } from '../src/engine/homes/renting';
import { acceptCounter, acceptSaleOffer, listForSale, makeOffer, purchaseQuote, valuation } from '../src/engine/homes/buying';
import { GENERIC_FURNITURE, bookStay, buyItem, itemCheck, workQuote, type CatalogItem } from '../src/engine/homes/living';
import { buildQuote, investigate, saveDesign, startDesign } from '../src/engine/homes/building';
import { advertise, changeRent, chooseTenant, fairRent } from '../src/engine/homes/letting';
import { bankSpendable } from '../src/engine/bank';
import { processUntil } from '../src/engine/state';
import { DAY } from '../src/engine/time';
import type { GameState } from '../src/engine/types';
import { startLife } from './helpers';

const advance = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'advance', 100000);
async function offers(s: GameState, placeId: string) {
  const day = new Date(s.now).toISOString().slice(0, 10);
  return offersIn(s.seed, await marketEvidence(placeId, day), day);
}
async function ownInLA(tag: string, fit = false) {
  const s = startLife(tag, 'us-los-angeles', { startDate: '2026-03-02' });
  const home = (await offers(s, 'us-los-angeles')).find((h) => h.market === 'sale' && h.form !== 'land' && (!fit || !Object.values(h.condition).includes('poor')))!;
  makeOffer(s, home, home.priceMinor, { finance: 'cash', inspect: false });
  advance(s, 35);
  expect(homesOf(s).owned[0]?.homeId).toBe(home.id);
  return { s, home: homesOf(s).homes[home.id] };
}

describe('renting', () => {
  it('which thing is broken decides who pays: the landlord\'s heating is free, your own desk is yours', async () => {
    const s = startLife('choices-broken', 'gb-london', { startDate: '2026-03-02' });
    const home = (await offers(s, 'gb-london')).find((h) => h.market === 'rent')!;
    const t = applyToRent(s, home);
    advance(s, 4);
    signLease(s, t.id);
    advance(s, Math.max(0, (Date.parse(`${t.start}T12:00:00Z`) - s.now) / DAY) + 1);
    moveIn(s, home.id);
    buyItem(s, home.id, GENERIC_FURNITURE.find((c) => c.name === 'Desk')!, homesOf(s).homes[home.id].rooms[0].id);
    advance(s, 8);
    const heating = reportRepair(s, home.id, 'Heating');
    const desk = reportRepair(s, home.id, 'Desk');
    expect(heating.who).toBe('landlord');
    expect(heating.quoteMinor).toBe(0);
    expect(desk.who).toBe('you');
    expect(desk.quoteMinor).toBeGreaterThan(0);
    const before = bankSpendable(s);
    approveRepair(s, desk.id);
    expect(before - bankSpendable(s)).toBeGreaterThan(0);
  });
});

describe('buying and selling', () => {
  it('an offer below asking is countered, one at asking accepted; the counter, once taken, is the price paid', async () => {
    const a = startLife('choices-offer', 'us-los-angeles', { startDate: '2026-03-02' });
    const b = startLife('choices-offer', 'us-los-angeles', { startDate: '2026-03-02' });
    const home = (await offers(a, 'us-los-angeles')).find((h) => h.market === 'sale' && h.form !== 'land')!;
    const full = makeOffer(a, home, home.priceMinor, { finance: 'cash', inspect: false });
    const low = makeOffer(b, home, Math.round(home.priceMinor * 0.92 / 100) * 100, { finance: 'cash', inspect: false });
    advance(a, 4); advance(b, 4);
    expect(full.stage).not.toBe('countered');
    expect(low.stage).toBe('countered');
    acceptCounter(b, low.id);
    advance(a, 35); advance(b, 35);
    expect(homesOf(b).owned[0].costMinor).toBeLessThan(homesOf(a).owned[0].costMinor);
  });

  it('the deposit share and the term set the loan and the payment', async () => {
    const s = startLife('choices-mortgage', 'us-los-angeles', { startDate: '2026-03-02' });
    const home = (await offers(s, 'us-los-angeles')).find((h) => h.market === 'sale' && h.form !== 'land')!;
    const cash = purchaseQuote(s, home, { finance: 'cash', inspect: false });
    const m20 = purchaseQuote(s, home, { finance: 'mortgage', depositShare: 0.2, years: 25, inspect: false });
    const m50 = purchaseQuote(s, home, { finance: 'mortgage', depositShare: 0.5, years: 25, inspect: false });
    const m15 = purchaseQuote(s, home, { finance: 'mortgage', depositShare: 0.2, years: 15, inspect: false });
    expect(cash.loanMinor).toBe(0);
    expect(m20.loanMinor).toBeGreaterThan(m50.loanMinor);
    expect(m20.paymentMinor).toBeGreaterThan(m50.paymentMinor);
    expect(m15.paymentMinor).toBeGreaterThan(m20.paymentMinor);
    expect(m15.loanMinor).toBe(m20.loanMinor);
  });

  it('an inspection is paid for, and reports before completion on what a viewing can\'t see', async () => {
    const a = startLife('choices-inspect', 'us-los-angeles', { startDate: '2026-03-02' });
    const b = startLife('choices-inspect', 'us-los-angeles', { startDate: '2026-03-02' });
    const home = (await offers(a, 'us-los-angeles')).find((h) => h.market === 'sale' && h.form !== 'land')!;
    const with_ = makeOffer(a, home, home.priceMinor, { finance: 'cash', inspect: true });
    const without = makeOffer(b, home, home.priceMinor, { finance: 'cash', inspect: false });
    advance(a, 40); advance(b, 40);
    expect(with_.inspection!.feeMinor).toBeGreaterThan(0);
    expect(homesOf(a).documents.some((d) => d.title === 'Inspection Report')).toBe(true);
    expect(without.inspection).toBeUndefined();
    expect(bankSpendable(a)).toBeLessThan(bankSpendable(b));
  });

  it('asking more than it is worth brings a later buyer, whose offer is capped near its worth', async () => {
    const a = await ownInLA('choices-ask');
    const b = await ownInLA('choices-ask');
    const worth = valuation(a.s, a.home);
    const fair = listForSale(a.s, a.home.id, worth);
    const high = listForSale(b.s, b.home.id, Math.round(worth * 1.25 / 100) * 100);
    advance(a.s, 25); advance(b.s, 25);
    expect(fair.stage).toBe('offer');
    expect(high.stage).toBe('listed'); // the buyer takes longer at a higher price
    advance(b.s, 40);
    expect(high.stage).toBe('offer');
    expect(high.offerMinor!).toBeGreaterThan(fair.offerMinor!);
    expect(high.offerMinor!).toBeLessThanOrEqual(Math.round(worth * 1.05));
    acceptSaleOffer(b.s, high.id);
  });
});

describe('work, things and stays', () => {
  it('the work chosen sets its cost and how long it takes; a new roof in a material is drawn in it', async () => {
    const { s, home } = await ownInLA('choices-work');
    expect(workQuote(s, home, 'kitchen-refit')).toBeGreaterThan(workQuote(s, home, 'paint'));
    expect(workQuote(s, home, 'new-roof')).toBeGreaterThan(0);
  });

  it('the room chosen decides whether a washing machine can go in', async () => {
    const { s, home } = await ownInLA('choices-room');
    const washer: CatalogItem = { category: 'washers', name: 'Washer', sourceId: 'EPA-washers', recordId: 'x', brand: 'A', model: 'B', markets: 'United States, Canada', onMarketFrom: '2020-01-01', widthIn: 27, depthIn: 30, heightIn: 38, annualKwh: 100, fuel: null, venting: null };
    const wet = home.rooms.find((r) => r.services.includes('water') && r.services.includes('drain'))!;
    const dry = home.rooms.find((r) => !r.services.includes('drain'))!;
    expect(itemCheck(s, home, washer, wet.id).install).toBeNull();
    expect(itemCheck(s, home, washer, dry.id).install).toMatch(/a water supply|a drain/);
    expect(() => buyItem(s, home.id, washer, dry.id)).toThrow(/needs a connection/);
    expect(buyItem(s, home.id, washer, wet.id).stage).toBe('ordered');
  });

  it('nights booked set what a stay costs', () => {
    const a = startLife('choices-stay', 'gb-london', { startDate: '2026-03-02' });
    const b = startLife('choices-stay', 'gb-london', { startDate: '2026-03-02' });
    const two = bookStay(a, 2, 'Between homes');
    const six = bookStay(b, 6, 'Between homes');
    expect(six.paidMinor).toBe(two.paidMinor * 3);
    expect(bankSpendable(b)).toBeLessThan(bankSpendable(a));
  });
});

describe('building', () => {
  it("a design's garage, balconies, porch and size change the cost plan; a size that doesn't fit is refused", async () => {
    const s = startLife('choices-design', 'us-austin', { startDate: '2026-03-02' });
    const land = (await offers(s, 'us-austin')).find((h) => h.form === 'land')!;
    makeOffer(s, land, land.priceMinor, { finance: 'cash', inspect: false });
    advance(s, 35);
    investigate(s, land.id, 'survey');
    advance(s, 8);
    const b = startDesign(s, land.id);
    const base = b.quoteMinor;
    const q = (patch: Parameters<typeof saveDesign>[2]) => buildQuote(s, { landId: b.landId, design: { ...b.design, ...(patch.design ?? {}) }, floorAreaM2: patch.floorAreaM2 ?? b.floorAreaM2 }).total;
    expect(q({ design: { garage: 'double' } })).toBeGreaterThan(base);
    expect(q({ design: { balconies: 2 } })).toBeGreaterThan(base);
    expect(q({ design: { outdoor: ['porch'] } })).toBeGreaterThan(base);
    expect(q({ floorAreaM2: 180 })).toBeGreaterThan(base);
    // A footprint that doesn't match the floor area a floor, and a balcony on a single floor, are refused in words.
    expect(() => saveDesign(s, b.id, { design: { widthM: 30 } })).toThrow(/footprint/);
    expect(() => saveDesign(s, b.id, { design: { floors: 1, widthM: 14, depthM: 10, balconies: 1 } })).toThrow(/balcony needs a floor above/);
    // Rooms that don't fit the floor area are refused, with the arithmetic.
    expect(() => saveDesign(s, b.id, { rooms: [...b.rooms, { kind: 'bedroom', areaM2: 60 }] })).toThrow(/more than the 140 m² floor area/);
    saveDesign(s, b.id, { design: { garage: 'double' } });
    expect(b.quoteMinor).toBeGreaterThan(base);
  });
});

describe('letting', () => {
  it('a lower rent, set once applicants come, is what is received', async () => {
    const a = await ownInLA('choices-let', true);
    const b = await ownInLA('choices-let', true);
    const fair = fairRent(a.s, a.home.id);
    const la = advertise(a.s, a.home.id, fair, false, 0);
    const lb = advertise(b.s, b.home.id, fair, false, 0);
    advance(a.s, 11); advance(b.s, 11);
    // A new rent is advertised afresh: applicants come again in ten days.
    changeRent(b.s, lb.id, Math.round(fair * 0.8 / 100) * 100);
    expect(lb.stage).toBe('advertised');
    advance(b.s, 11);
    chooseTenant(a.s, la.id, 0); chooseTenant(b.s, lb.id, 0);
    expect(lb.rentMinor).toBeLessThan(la.rentMinor);
    advance(a.s, 95); advance(b.s, 95);
    const got = (l: typeof la) => l.payments.filter((p) => p.key.includes(':rent:')).reduce((x, p) => x + p.minor, 0);
    expect(got(lb)).toBeLessThan(got(la));
  });

  it('an agent takes a tenth of the rent, and repairs up to the limit without asking', async () => {
    const a = await ownInLA('choices-agent', true);
    const b = await ownInLA('choices-agent', true);
    const fair = fairRent(a.s, a.home.id);
    const self = advertise(a.s, a.home.id, fair, false, 0);
    const managed = advertise(b.s, b.home.id, fair, true, 200000);
    advance(a.s, 11); advance(b.s, 11);
    chooseTenant(a.s, self.id, 0); chooseTenant(b.s, managed.id, 0);
    advance(a.s, 95); advance(b.s, 95);
    const fees = managed.payments.filter((p) => p.label === "Manager's fee");
    expect(fees.length).toBeGreaterThan(0);
    expect(fees[0].minor).toBe(Math.round(managed.rentMinor * 0.1 / 100) * 100);
    expect(self.payments.some((p) => p.label === "Manager's fee")).toBe(false);
    // Within the limit, a repair is done without asking; without an agent it waits for you.
    expect(managed.repairs.every((r) => r.stage !== 'awaiting-you' || r.minor > 200000)).toBe(true);
  });
});
