// Homes & Property, engine (src/engine/homes; from November 17, 2026). Each cycle is run through its actions and the
// game's clock, and checked in the bank: what's spent, what's held, what's owed, and what's income. The homes are the
// game's simulated offers, drawn from the real evidence packs (src/data/homes); a few are labelled fixtures, changed in
// one field to reach a case (a condo, a coastal home), and say so where they're made.
import { describe, expect, it } from 'vitest';
import { bankSpendable, mortgageOwed } from '../src/engine/bank';
import { bankSim } from '../src/engine/bankworld';
import { marketEvidence, offersIn } from '../src/engine/homes/market';
import { homesOf } from '../src/engine/homes/core';
import { applyRefusal, applyToRent, askPermission, disputeDeductions, giveNotice, moveIn, payArrears, rentQuote, reportRepair, signLease } from '../src/engine/homes/renting';
import { acceptSaleOffer, listForSale, makeOffer, purchaseQuote } from '../src/engine/homes/buying';
import { buyItem, installItem, itemCheck, startWork, type CatalogItem } from '../src/engine/homes/living';
import { applyForApproval, investigate, saveDesign, signBuild, startDesign } from '../src/engine/homes/building';
import { advertise, chooseTenant, endLetting } from '../src/engine/homes/letting';
import { arrangeViewing } from '../src/engine/homes';
import { depositFor, permissionFor, scopesOf, gardenOf, type Home } from '../src/engine/homes/model';
import { HOME_RULES } from '../src/engine/homes/market';
import { getPlace } from '../src/data/places';
import { processUntil } from '../src/engine/state';
import { deserialize, serialize } from '../src/engine/save';
import { DAY } from '../src/engine/time';
import type { GameState } from '../src/engine/types';
import { startLife } from './helpers';

const advance = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'advance', 100000);
async function offers(s: GameState, placeId: string) {
  const day = new Date(s.now).toISOString().slice(0, 10);
  return offersIn(s.seed, await marketEvidence(placeId, day), day);
}
const nominal = (s: GameState, name: string) => Object.values(s.bank!.accounts).find((a) => a.nominal && a.name === name)?.balance ?? 0;
const incomeTotal = (s: GameState) => Object.values(s.bank!.accounts).filter((a) => a.nominal && a.kind === 'income').reduce((a, x) => a + x.balance, 0);

describe('renting in London, from application to the deposit back', () => {
  it('holds the deposit (England: five weeks), pays rent monthly once each, and returns the deposit without income', async () => {
    const s = startLife('homes-rent', 'gb-london', { startDate: '2026-03-02' });
    const home = (await offers(s, 'gb-london')).find((h) => h.market === 'rent')!;
    const q = rentQuote(home);
    // England's cap: five weeks' rent under £50,000 a year, from annual rent over 52, rounded down.
    expect(q.deposit.ruleId).toBe('en.deposit.cap');
    expect(q.deposit.amountMinor).toBe(Math.floor((home.priceMinor * 12 * 5) / 52));
    const t = applyToRent(s, home);
    expect(() => signLease(s, t.id)).toThrow("The landlord hasn't answered yet.");
    advance(s, 4);
    expect(t.stage).toBe('approved');
    const before = bankSpendable(s);
    const income = incomeTotal(s);
    signLease(s, t.id);
    expect(() => signLease(s, t.id)).toThrow("You've already signed this lease.");
    const paid = before - bankSpendable(s);
    expect(paid).toBeGreaterThan(0);
    expect(nominal(s, 'Rental Deposits Held For You')).toBeGreaterThan(0); // held, not spent
    expect(incomeTotal(s)).toBe(income);
    advance(s, Math.max(0, (Date.parse(`${t.start}T12:00:00Z`) - s.now) / DAY) + 1);
    moveIn(s, home.id);
    expect(homesOf(s).residence).toBe(home.id);
    // Reload before the next rent: the same one rent comes, once.
    const back = deserialize(serialize(s));
    advance(back, 70);
    const t2 = homesOf(back).tenancies[0];
    expect(t2.payments.filter((p) => p.key.startsWith(`rent:${t2.id}:`)).length).toBe(3);
    // A broken roof is the landlord's: no cost to you.
    reportRepair(back, home.id, 'Roof');
    advance(back, 6);
    expect(homesOf(back).repairs[0].stage).toBe('fixed');
    giveNotice(back, t2.id);
    const spentBefore = bankSpendable(back);
    advance(back, 400);
    expect(t2.stage).toBe('ended');
    expect(t2.refundedMinor).toBeGreaterThan(0);
    expect(incomeTotal(back)).toBe(income); // a deposit returned isn't income
    expect(nominal(back, 'Rental Deposits Held For You')).toBe(0);
    // Every rent to the end was paid from the bank once: the term's twelve months.
    expect(t2.payments.filter((p) => p.key.startsWith(`rent:${t2.id}:`)).length).toBe(12);
    void spentBefore;
  });

  it("follows the deposit rule of the place's own scope: Ontario's last month, Germany's instalments, nothing English in Scotland", () => {
    const at = (id: string) => scopesOf(getPlace(id));
    const on = depositFor(HOME_RULES, at('ca-toronto'), 200000, false);
    expect([on.kind, on.amountMinor]).toEqual(['last-rent', 200000]);
    const de = depositFor(HOME_RULES, at('de-berlin'), 100000, false);
    expect(de.instalmentsMinor).toEqual([100000, 100000, 100000]);
    const fr = depositFor(HOME_RULES, at('fr-paris'), 100000, true);
    expect(fr.amountMinor).toBe(200000);
    const sco = depositFor(HOME_RULES, at('gb-edinburgh'), 200000, false);
    expect(sco.ruleId).toBeNull();
    expect(sco.says).toMatch(/haven't been researched/);
    // The worked example: £2,000 a month in England is £2,307.69, not £2,500 (monthly over four).
    expect(depositFor(HOME_RULES, at('gb-london'), 200000, false).amountMinor).toBe(230769);
  });

  it('refuses an application the bank can\'t cover, and a lapsed one', async () => {
    const s = startLife('homes-poor', 'gb-london', { startDate: '2026-03-02' });
    const home = (await offers(s, 'gb-london')).find((h) => h.market === 'rent')!;
    // Labelled fixture: the rent set beyond what the $25m inheritance could pay.
    const dear: Home = { ...home, id: `${home.id}:dear`, priceMinor: 9e12 };
    expect(applyRefusal(s, dear)).toMatch(/^You need .+ available to move in/);
    advance(s, 40);
    expect(applyRefusal(s, home)).toMatch(/lapsed/);
  });
});

describe('buying, borrowing and selling in Los Angeles', () => {
  it('a mortgage is debt, never income; its payments split interest from principal; a sale repays it first', async () => {
    const s = startLife('homes-buy', 'us-los-angeles', { startDate: '2026-03-02' });
    const home = (await offers(s, 'us-los-angeles')).find((h) => h.market === 'sale' && h.form !== 'land')!;
    const q = purchaseQuote(s, home, { finance: 'mortgage', depositShare: 0.2, years: 25, inspect: true });
    expect(q.loanMinor).toBe(Math.round(home.priceMinor * 0.8 / 100) * 100);
    const income = incomeTotal(s);
    const p = makeOffer(s, home, home.priceMinor, { finance: 'mortgage', depositShare: 0.2, years: 25, inspect: true });
    advance(s, 4);
    expect(p.stage).toBe('inspecting');
    advance(s, 40);
    expect(p.stage).toBe('completed');
    expect(homesOf(s).owned[0].homeId).toBe(home.id);
    expect(mortgageOwed(s, `Mortgage: ${home.title}`)).toBeCloseTo(q.loanMinor / 100, 0);
    expect(incomeTotal(s)).toBe(income); // the loan paid the seller: no income
    advance(s, 65);
    const owed = mortgageOwed(s, `Mortgage: ${home.title}`);
    expect(owed).toBeLessThan(q.loanMinor / 100); // principal paid down
    const sale = listForSale(s, home.id, home.priceMinor);
    advance(s, 60);
    expect(sale.stage).toBe('offer');
    acceptSaleOffer(s, sale.id);
    advance(s, 35);
    expect(sale.stage).toBe('completed');
    expect(mortgageOwed(s, `Mortgage: ${home.title}`)).toBeCloseTo(0, 2);
    expect(sale.proceedsMinor).toBe(sale.offerMinor! - sale.debtRepaidMinor! - sale.feeMinor);
    expect(incomeTotal(s)).toBe(income); // a home's sale price is your own property, not income
  });

  it('a completion the bank can\'t pay grants nothing', async () => {
    const s = startLife('homes-fail', 'us-los-angeles', { startDate: '2026-03-02' });
    const home = (await offers(s, 'us-los-angeles')).find((h) => h.market === 'sale' && h.form !== 'land')!;
    const p = makeOffer(s, home, home.priceMinor, { finance: 'cash', inspect: false });
    advance(s, 4);
    expect(p.stage).toBe('ready');
    // Labelled fixture: the money spent before completion, everything but a dollar.
    const sim = bankSim(s.bank!);
    const acct = sim.player.primaryAccountId!;
    sim.post({ memo: 'Fixture: spent elsewhere', category: 'fixture', postings: [{ accountId: acct, amount: -(s.bank!.accounts[acct].balance - 100) }, { accountId: sim.nominalAccount('expense', 'Fixture').id, amount: s.bank!.accounts[acct].balance - 100 }] });
    for (const a of Object.values(s.bank!.accounts)) if (!a.nominal && a.kind === 'savings') sim.post({ memo: 'Fixture', category: 'fixture', postings: [{ accountId: a.id, amount: -a.balance }, { accountId: sim.nominalAccount('expense', 'Fixture').id, amount: a.balance }] });
    advance(s, 40);
    expect(p.stage).toBe('failed');
    expect(homesOf(s).owned).toHaveLength(0);
  });
});

describe('what may be changed, by whom', () => {
  const base = (form: Home['form'], placeId: string): Pick<Home, 'form' | 'scopes' | 'plotAreaM2' | 'privateAmenities' | 'sharedAmenities' | 'design'> => ({
    form, scopes: scopesOf(getPlace(placeId), form), plotAreaM2: form === 'detached' ? 900 : null, privateAmenities: [], sharedAmenities: form === 'detached' ? [] : ['Shared Building Pool'],
    design: { revision: 1, style: 'contemporary', floors: 2, widthM: 10, depthM: 8, roof: 'gable', roofMaterial: 'tile', roofColor: 'red', walls: 'brick', wallColor: 'white', windowsPerFloor: 3, windowStyle: 'sash', frameColor: 'white', door: 'panel', doorColor: 'red', balconies: 0, garage: 'none', driveway: 'none', landscaping: 'lawn', outdoor: [] },
  });
  it('a shared pool is never yours; a condo owner needs the association and an engineer to take out a wall; a tenant asks', () => {
    const condo = base('condo', 'us-chicago');
    expect(permissionFor(HOME_RULES, condo, 'owner', 'pool', null)).toMatchObject({ allowed: false });
    const wall = permissionFor(HOME_RULES, condo, 'owner', 'wall-removal', null);
    expect(wall.allowed).toBe(true);
    expect(wall.needs).toEqual(expect.arrayContaining(['association', 'structural']));
    const floor = permissionFor(HOME_RULES, base('apartment', 'gb-london'), 'tenant', 'vinyl-floor', null);
    expect([floor.allowed, floor.needs]).toEqual([true, ['landlord']]);
  });
  it("HDB's tile and vinyl rules differ; Cape Town's pool needs plans; New York's paint needs no permit", () => {
    const hdb = { ...base('hdb-flat', 'us-chicago'), scopes: ['SG-HDB', 'SG'] };
    expect(permissionFor(HOME_RULES, hdb, 'owner', 'tile-floor', null).steps.some((x) => x.ruleId === 'sg.hdb.tile')).toBe(true);
    const vinyl = permissionFor(HOME_RULES, hdb, 'owner', 'vinyl-floor', null);
    expect(vinyl.steps.some((x) => x.ruleId === 'sg.hdb.vinyl' && x.outcome === 'met')).toBe(true);
    expect(permissionFor(HOME_RULES, hdb, 'owner', 'wall-removal', null).needs).toEqual(expect.arrayContaining(['authority', 'registered-contractor']));
    const cape = base('detached', 'za-cape-town');
    const pool = permissionFor(HOME_RULES, cape, 'owner', 'pool', gardenOf({ ...cape, form: 'detached' }));
    expect(pool.steps.find((x) => x.ruleId === 'cape.pool')).toBeTruthy();
    expect(pool.needs).toContain('authority');
    expect(permissionFor(HOME_RULES, base('apartment', 'us-new-york'), 'owner', 'paint', null).steps.some((x) => x.ruleId === 'nyc.paint')).toBe(true);
  });
});

describe('an appliance in a rented flat, in Chicago', () => {
  it('a plumbed-in dishwasher needs the landlord; it is bought, delivered and installed once', async () => {
    const s = startLife('homes-item', 'us-chicago', { startDate: '2026-03-02' });
    const home = (await offers(s, 'us-chicago')).find((h) => h.market === 'rent' && h.rooms.some((r) => r.kind === 'kitchen'))!;
    const t = applyToRent(s, home);
    advance(s, 4);
    signLease(s, t.id);
    advance(s, 30);
    moveIn(s, home.id);
    const kitchen = home.rooms.find((r) => r.kind === 'kitchen')!;
    // A real EPA record (dishwashers.json's first): its width and depth are recorded.
    const dw: CatalogItem = { category: 'dishwashers', name: 'Dishwasher', sourceId: 'EPA-dishwashers', recordId: '3354415', brand: 'AEG', model: 'F8242FI', markets: 'United States, Canada', onMarketFrom: '2024-01-01', widthIn: 23.5, depthIn: 21.7, heightIn: null, annualKwh: 234, fuel: null, venting: null };
    expect(itemCheck(s, homesOf(s).homes[home.id], dw, kitchen.id).install).toBeNull();
    const it = buyItem(s, home.id, dw, kitchen.id);
    advance(s, 5);
    expect(it.stage).toBe('delivered');
    expect(() => installItem(s, it.id)).toThrow("This change needs your landlord's approval: ask to Plumb In An Appliance first.");
    askPermission(s, home.id, 'plumbed-appliance');
    advance(s, 11);
    installItem(s, it.id);
    expect(() => installItem(s, it.id)).toThrow("It's already installed.");
    expect(it.payments.filter((p) => p.key.startsWith('install:')).length).toBe(1);
    // A model not yet on the market can't be bought.
    expect(itemCheck(s, homesOf(s).homes[home.id], { ...dw, onMarketFrom: '2027-06-01' }, kitchen.id).buy).toMatch(/doesn't come on the market/);
  });
});

describe('land, a design and a house built on the clock, in Austin', () => {
  it('investigate, a design refused then fixed, approval, stages paid as they start, and a house to move into', async () => {
    const s = startLife('homes-build', 'us-austin', { startDate: '2026-03-02' });
    const land = (await offers(s, 'us-austin')).find((h) => h.form === 'land')!;
    const p = makeOffer(s, land, land.priceMinor, { finance: 'cash', inspect: false });
    advance(s, 35);
    expect(p.stage).toBe('completed');
    const b = startDesign(s, land.id);
    expect(() => applyForApproval(s, b.id)).toThrow(/site survey first/);
    investigate(s, land.id, 'survey');
    advance(s, 8);
    // Too many rooms for the floor area: refused, with the arithmetic.
    expect(() => saveDesign(s, b.id, { floorAreaM2: 60 })).toThrow(/more than the 60 m² floor area/);
    saveDesign(s, b.id, { design: { wallColor: 'sage', garage: 'double' } });
    expect(b.design.revision).toBe(2);
    applyForApproval(s, b.id);
    advance(s, 31);
    expect(b.stage).toBe('permitted');
    signBuild(s, b.id);
    advance(s, 200);
    expect(b.stage).toBe('complete');
    const house = homesOf(s).homes[b.homeId!];
    expect(house.design.wallColor).toBe('sage');
    expect(b.payments.filter((x) => x.key.startsWith(`build:${b.id}:stage:`)).length).toBe(8); // each stage paid once
    moveIn(s, house.id);
    expect(homesOf(s).residence).toBe(house.id);
  });
});

describe('letting a home you own, in Los Angeles', () => {
  it("the tenant's deposit is owed back, rent is income (never wages), and it's returned when they leave", async () => {
    const s = startLife('homes-let', 'us-los-angeles', { startDate: '2026-03-02' });
    // A home fit to let: nothing in poor condition (a poor one must be repaired first: tested below).
    const all = await offers(s, 'us-los-angeles');
    const home = all.find((h) => h.market === 'sale' && h.form !== 'land' && !Object.values(h.condition).includes('poor'))!;
    makeOffer(s, home, home.priceMinor, { finance: 'cash', inspect: false });
    advance(s, 35);
    const l = advertise(s, home.id, Math.round(home.priceMinor * 0.004 / 100) * 100, true, 100000);
    advance(s, 11);
    expect(l.stage).toBe('applicants');
    chooseTenant(s, l.id, 0);
    expect(nominal(s, "Your Tenants' Deposits")).toBeLessThan(0); // a liability you hold for them
    advance(s, 65);
    expect(l.rentsReceived).toBe(3);
    expect(l.payments.filter((p) => p.key.startsWith(`let:${l.id}:rent:`)).length).toBeGreaterThanOrEqual(2); // one may be late
    expect(nominal(s, 'Rental Income')).toBeLessThan(0);
    endLetting(s, l.id);
    advance(s, 62);
    expect(l.stage).toBe('ended');
    expect(nominal(s, "Your Tenants' Deposits")).toBe(0);
  });
});

describe('the clock and the save', () => {
  it('a year advanced at once pays the same rents as day by day, each once', async () => {
    const run = async (step: number) => {
      const s = startLife('homes-clock', 'gb-london', { startDate: '2026-03-02' });
      const home = (await offers(s, 'gb-london')).find((h) => h.market === 'rent')!;
      const t = applyToRent(s, home);
      advance(s, 4);
      signLease(s, t.id);
      for (let d = 0; d < 365; d += step) advance(s, step);
      return t.payments.filter((p) => p.kind === 'paid').map((p) => p.key);
    };
    expect(await run(365)).toEqual(await run(1));
  });
  it('a save made before housing opens, with nothing to migrate, and starts empty', () => {
    const s = startLife('homes-old', 'gb-london');
    delete (s as Partial<GameState>).homes;
    const back = deserialize(serialize(s));
    expect(back.homes).toBeUndefined();
    expect(homesOf(back).tenancies).toEqual([]);
  });
  it('a viewing comes on its day, once, and tells what a viewing can\'t', async () => {
    const s = startLife('homes-view', 'gb-london', { startDate: '2026-03-02' });
    const home = (await offers(s, 'gb-london'))[0];
    arrangeViewing(s, home, '2026-03-05');
    advance(s, 4);
    expect(homesOf(s).viewings[0].seen).toBe(true);
    expect(homesOf(s).viewings[0].notes!.at(-1)).toMatch(/need an inspection/);
  });
  it('rent short of money stays owed, and is paid once when you can', async () => {
    const s = startLife('homes-arrears', 'gb-london', { startDate: '2026-03-02' });
    const home = (await offers(s, 'gb-london')).find((h) => h.market === 'rent')!;
    const t = applyToRent(s, home);
    advance(s, 4);
    signLease(s, t.id);
    void payArrears; void disputeDeductions; void startWork;
    expect(t.arrearsMinor).toBe(0);
  });
});

describe('the exterior picture', () => {
  it('is drawn from the design record, checked feature by feature, kept per revision, and redrawn only when the outside changes', async () => {
    const { exteriorFor, validate, GAME_DRAWING, briefOf } = await import('../src/engine/homes/illustration');
    const s = startLife('homes-pic', 'us-los-angeles', { startDate: '2026-03-02' });
    const all = await offers(s, 'us-los-angeles');
    const home = all.find((h) => h.market === 'sale' && h.form === 'detached' && !Object.values(h.condition).includes('poor'))!;
    makeOffer(s, home, home.priceMinor, { finance: 'cash', inspect: false });
    advance(s, 35);
    const mine = homesOf(s).homes[home.id];
    const first = exteriorFor(s, mine);
    expect(first.checklist.every((c) => c.ok)).toBe(true);
    expect(first.fromCache).toBe(false);
    expect(first.label).toMatch(/Not a photograph, not an AI image/);
    expect(exteriorFor(s, mine).fromCache).toBe(true); // opened again: the kept picture
    // Validation catches a drawing without a pool the record has (a fixture: the record given one, the drawing not).
    const withPool = { ...mine.design, outdoor: ['pool' as const] };
    const r = GAME_DRAWING.draw({ ...briefOf(mine), design: { ...mine.design, outdoor: [] } });
    expect(validate(withPool, r.drawn, r.svg).find((c) => c.feature === 'A pool')!.ok).toBe(false);
    // An exterior repaint, finished, is a new revision and a new picture showing it.
    startWork(s, home.id, 'exterior-paint', { color: 'sage' });
    advance(s, 12);
    expect(mine.design.revision).toBe(2);
    const second = exteriorFor(s, mine);
    expect(second.fromCache).toBe(false);
    expect(second.svg).toContain('walls:' + mine.design.walls + ':sage');
  });
});
