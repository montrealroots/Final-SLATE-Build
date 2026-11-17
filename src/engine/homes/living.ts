// Living in a home: belongings and appliances, work done to it, its bills, its insurance, and somewhere to stay while
// it can't be lived in (from November 17, 2026; the package's 05-ROOMS-APPLIANCES-IMPROVEMENTS, 02-RESEARCH-TO-ENGINE
// "Rooms, appliances and fixtures", "Utilities and operating costs", "Insurance and hazards").
//
// Appliances are real models from EPA's ENERGY STAR records (src/data/homes/appliances): brand, model and the technical
// facts EPA gives. EPA gives no price, stock, picture or installation clearance: the price here is the game's
// estimate, said as one, and where a depth isn't recorded the fit can't be confirmed until someone measures. A model is
// sold only where EPA lists its market and from the day it came on the market. Items EPA doesn't cover (beds, desks)
// are the game's own generic items, said as such, never given a real brand.
import { newId } from '../state';
import { unit } from '../rng';
import type { GameState } from '../types';
import { HOME_RULES } from './market';
import { RUNNING_USD, WORK, WORK_COST_USD, badDesignValue, gardenOf, inBuilding, permissionFor, type Design, type Home, type Room, type WorkKind } from './model';
import {
  BOOK, addDaysToKey, addMonths, book, canPay, days, document, dollarsOf, formatDateKey, homeOf, homesOf, instantOn, money, note, payOut,
  record, refund, scheduleHome, todayAt, type Item, type Job, type Policy, type Stay,
} from './core';

/** A product the player can choose: a real EPA model, or the game's generic furniture. */
export interface CatalogItem {
  category: 'refrigerators' | 'washers' | 'dryers' | 'dishwashers' | 'room_ac' | 'furniture';
  name: string;
  /** 'EPA-refrigerators' and its record id; null for the game's generic items. */
  sourceId: string | null; recordId: string | null;
  brand: string | null; model: string | null;
  markets: string | null; onMarketFrom: string | null;
  widthIn: number | null; depthIn: number | null; heightIn: number | null;
  annualKwh: number | null; fuel: string | null; venting: string | null;
}
/** The game's estimates in dollars: EPA records carry no prices, so none of these is a retailer's. */
export const ITEM_PRICE_USD: Record<CatalogItem['category'], { price: number; delivery: number; install: number }> = {
  refrigerators: { price: 1400, delivery: 80, install: 0 }, washers: { price: 900, delivery: 80, install: 150 }, dryers: { price: 850, delivery: 80, install: 150 },
  dishwashers: { price: 800, delivery: 60, install: 250 }, room_ac: { price: 450, delivery: 40, install: 120 }, furniture: { price: 600, delivery: 90, install: 0 },
};
/** Generic furniture: the game's own, with no brand and no claim to be a product on sale anywhere. */
export const GENERIC_FURNITURE: CatalogItem[] = [
  ['Desk', 47, 24, 30], ['Office Chair', 26, 26, 40], ['Double Bed', 57, 79, 40], ['Sofa', 84, 36, 34], ['Wardrobe', 40, 24, 79], ['Dining Table', 60, 36, 30],
].map(([name, w, d, h]) => ({ category: 'furniture' as const, name: name as string, sourceId: null, recordId: null, brand: null, model: null, markets: null, onMarketFrom: null, widthIn: w as number, depthIn: d as number, heightIn: h as number, annualKwh: null, fuel: null, venting: null }));
export const DOOR_WIDTH_M = 0.8;
const inchM = (x: number) => x * 0.0254;

/** What an appliance needs from the room it goes in. */
export function needsOf(c: CatalogItem): Room['services'] {
  switch (c.category) {
    case 'refrigerators': return ['power'];
    case 'washers': case 'dishwashers': return ['power', 'water', 'drain'];
    case 'dryers': return c.fuel === 'Gas' ? ['power', 'gas', 'vent'] : c.venting === 'Ventless' ? ['power'] : ['power', 'vent'];
    case 'room_ac': return ['power', 'window'];
    default: return [];
  }
}
export const isBuiltIn = (c: CatalogItem) => c.category === 'dishwashers' || c.category === 'washers';

/** Whether it can be bought for this home, and whether it can go in this room: each reason in words. */
export function itemCheck(state: GameState, home: Home, c: CatalogItem, roomId: string | null): { buy: string | null; install: string | null; needsMeasurement: boolean } {
  const today = todayAt(state, home);
  if (c.sourceId && c.markets && !/United States|Canada/.test(c.markets)) return { buy: 'This model isn\'t recorded as sold here.', install: null, needsMeasurement: false };
  if (c.sourceId && !(home.country === 'US' || home.country === 'CA')) return { buy: `EPA records this model for ${c.markets}; it isn't recorded as sold in this country.`, install: null, needsMeasurement: false };
  if (c.onMarketFrom && c.onMarketFrom > today) return { buy: `This model doesn't come on the market until ${formatDateKey(c.onMarketFrom)}.`, install: null, needsMeasurement: false };
  // An appliance comes through the door whole; furniture is delivered flat or turned on its end.
  if (c.category !== 'furniture' && c.widthIn !== null && inchM(c.widthIn) > DOOR_WIDTH_M + 0.1) return { buy: `At ${Math.round(inchM(c.widthIn) * 100)} cm wide it won't fit through a standard door (the game's ${DOOR_WIDTH_M * 100} cm).`, install: null, needsMeasurement: false };
  const room = roomId ? home.rooms.find((r) => r.id === roomId) : undefined;
  if (!room) return { buy: null, install: 'Choose a room for it.', needsMeasurement: false };
  const missing = needsOf(c).filter((n) => !room.services.includes(n));
  if (missing.length) return { buy: null, install: `This model needs a connection the room doesn't have: ${missing.map((m) => ({ power: 'power', water: 'a water supply', drain: 'a drain', vent: 'a vent to the outside', gas: 'a gas supply', window: 'a window' })[m]).join(', ')}.`, needsMeasurement: false };
  if (c.widthIn !== null && inchM(c.widthIn) > room.widthM - 0.3) return { buy: null, install: `It's ${Math.round(inchM(c.widthIn) * 100)} cm wide; the room's free wall isn't wide enough.`, needsMeasurement: false };
  if (c.depthIn === null && c.category !== 'furniture') return { buy: null, install: null, needsMeasurement: true };
  return { buy: null, install: null, needsMeasurement: false };
}
export function itemPrices(state: GameState, home: Home, c: CatalogItem): { price: number; delivery: number; install: number } {
  const p = ITEM_PRICE_USD[c.category];
  const local = (usd: number) => Math.round(usd * 100 / (dollarsOf(state, home.currency, 10000) / 100) / 100) * 100;
  return { price: local(p.price), delivery: local(p.delivery), install: isBuiltIn(c) || c.category === 'dryers' || c.category === 'room_ac' ? local(p.install) : 0 };
}

/** Buy an item for a home: paid as How You Pay says (card or cash), delivered in a few days, then installed. */
export function buyItem(state: GameState, homeId: string, c: CatalogItem, roomId: string): Item {
  const hs = homesOf(state);
  const home = homeOf(state, homeId);
  const renting = hs.tenancies.find((t) => t.homeId === homeId && t.stage === 'active');
  const owns = hs.owned.some((o) => o.homeId === homeId && !o.soldAt);
  if (!renting && !owns) throw new Error("You don't live in or own this home.");
  const check = itemCheck(state, home, c, roomId);
  if (check.buy) throw new Error(check.buy);
  if (check.install) throw new Error(check.install);
  const p = itemPrices(state, home, c);
  if (!canPay(state, home.currency, p.price + p.delivery)) throw new Error(`You need ${money(home.currency, p.price + p.delivery)} available.`);
  const id = newId(state, 'item');
  // The payment first: if the bank refuses it, nothing is ordered.
  payOut(state, home, `item:${id}`, p.price + p.delivery, `${c.brand ? `${c.brand} ${c.model}` : c.name}, delivered: ${home.title}`, 'Furniture And Appliances', true);
  const deliverAt = instantOn(home, addDaysToKey(todayAt(state, home), c.category === 'furniture' ? 7 : 4));
  const builtIn = isBuiltIn(c);
  const it: Item = {
    id, homeId, roomId, name: c.brand ? `${c.brand} ${c.model}` : c.name, category: c.category, sourceId: c.sourceId, model: c.recordId,
    priceMinor: p.price, deliveryMinor: p.delivery, installMinor: p.install, currency: home.currency, stage: 'ordered', orderedAt: state.now, deliverAt,
    annualKwh: c.annualKwh, fuel: c.fuel, needs: needsOf(c), builtIn, owner: 'you', payments: [], ...(check.needsMeasurement ? { measureFirst: true } : {}),
    says: c.sourceId ? `A real model (EPA ENERGY STAR record ${c.recordId}); its price is the game's estimate.` : "The game's own generic item, not a real product.",
  };
  record(it.payments, { key: `item:${id}`, label: 'Bought, with delivery', minor: p.price + p.delivery, kind: 'paid' }, state);
  hs.items.push(it);
  scheduleHome(state, deliverAt, 'delivery', { id });
  note(state, homeId, `You bought ${it.name} for ${home.title}: ${money(home.currency, p.price + p.delivery)} with delivery. It arrives on ${formatDateKey(addDaysToKey(todayAt(state, home), c.category === 'furniture' ? 7 : 4))}.`, 'money');
  return it;
}
export function deliver(state: GameState, it: Item): void {
  if (it.stage !== 'ordered') return;
  it.stage = it.measureFirst && !it.measured ? 'needs-measurements' : it.installMinor || it.builtIn ? 'delivered' : 'installed';
  if (it.stage === 'installed') { it.installedAt = state.now; it.warrantyUntil = state.now + days(365); }
  const home = homeOf(state, it.homeId!);
  note(state, home.id, `${it.name} was delivered to ${home.title}.${it.stage === 'delivered' ? ' It needs installing before it can be used.' : ' It is in place.'}`);
}
/** Why an item can't be installed now, or null: permission for a plumbed-in appliance in a rental, measurements, payment. */
export function installRefusal(state: GameState, it: Item): string | null {
  if (it.stage === 'needs-measurements') return 'Installation measurements still needed: the depth and clearances for this model aren\'t recorded.';
  if (it.stage !== 'delivered') return it.stage === 'installed' ? "It's already installed." : 'It hasn\'t been delivered yet.';
  const hs = homesOf(state);
  const home = homeOf(state, it.homeId!);
  const renting = hs.tenancies.some((t) => t.homeId === home.id && t.stage === 'active');
  if (renting && it.builtIn && !hs.permissions.some((p) => p.homeId === home.id && p.work === 'plumbed-appliance' && p.stage === 'granted')) return "This change needs your landlord's approval: ask to Plumb In An Appliance first.";
  if (!canPay(state, home.currency, it.installMinor)) return `You need ${money(home.currency, it.installMinor)} available for the installation.`;
  return null;
}
export function installItem(state: GameState, id: string): void {
  const hs = homesOf(state);
  const it = hs.items.find((x) => x.id === id);
  if (!it) throw new Error('That item is no longer on record.');
  // An item whose depth isn't recorded needs measuring first: the installer's survey, paid as part of installing it.
  if (it.stage === 'delivered' && it.measureFirst && !it.measured) it.stage = 'needs-measurements';
  const no = installRefusal(state, it);
  if (no) throw new Error(no);
  const home = homeOf(state, it.homeId!);
  payOut(state, home, `install:${it.id}`, it.installMinor, `Installation: ${it.name}`, 'Furniture And Appliances');
  record(it.payments, { key: `install:${it.id}`, label: 'Installation', minor: it.installMinor, kind: 'paid' }, state);
  it.stage = 'installed'; it.installedAt = state.now; it.warrantyUntil = state.now + days(365);
  const t = hs.tenancies.find((x) => x.homeId === home.id && x.stage === 'active');
  if (t && it.builtIn) t.changes.push({ work: 'plumbed-appliance', restore: true, restored: false });
  note(state, home.id, `${it.name} is installed and working in ${home.title}.`);
}
/** The installer measures the space and the appliance: the game's assumption that a depth of 80 cm free is enough. */
export function measureForInstall(state: GameState, id: string): void {
  const it = homesOf(state).items.find((x) => x.id === id);
  if (!it || it.stage !== 'needs-measurements') throw new Error('Nothing is waiting on measurements.');
  const home = homeOf(state, it.homeId!);
  const room = home.rooms.find((r) => r.id === it.roomId);
  const fee = Math.round(it.installMinor * 0.3 / 100) * 100;
  if (!canPay(state, home.currency, fee)) throw new Error(`You need ${money(home.currency, fee)} available for the visit.`);
  payOut(state, home, `measure:${it.id}`, fee, `Installer's survey: ${it.name}`, 'Furniture And Appliances');
  if (!room || room.depthM < 0.8) { it.says = `${it.says} The installer measured: there isn't 80 cm of depth free, so it can't go there.`; note(state, home.id, `The installer measured ${room ? 'the room' : 'the space'}: ${it.name} won't fit there.`, 'warning'); return; }
  it.stage = 'delivered';
  it.measured = true;
  it.says = `${it.says} Measured on site: it fits (the installer's survey; EPA records no clearances).`;
  note(state, home.id, `The installer measured the space for ${it.name}: it fits. You can have it installed.`);
}
/** Return within 30 days of delivery (the game's returns terms): the price back, never as income; delivery isn't refunded. */
export function returnItem(state: GameState, id: string): void {
  const hs = homesOf(state);
  const it = hs.items.find((x) => x.id === id);
  if (!it || !['delivered', 'needs-measurements', 'installed'].includes(it.stage)) throw new Error('This item can\'t be returned.');
  if (it.deliverAt && state.now > it.deliverAt + days(30)) throw new Error('The 30 days for returns have passed.');
  const home = homeOf(state, it.homeId!);
  refund(state, home, `item:${it.id}:refund`, it.priceMinor, `Refund: ${it.name} returned`, 'Furniture And Appliances');
  record(it.payments, { key: `item:${it.id}:refund`, label: 'Refunded on return', minor: it.priceMinor, kind: 'refunded' }, state);
  it.stage = 'returned';
  note(state, home.id, `You returned ${it.name}. ${money(home.currency, it.priceMinor)} is back in your account; the delivery charge isn't refunded.`, 'money');
}
/** Dispose of an item: collected for recycling at a fee (the game's estimate). It is gone from the home. */
export function disposeItem(state: GameState, id: string): void {
  const it = homesOf(state).items.find((x) => x.id === id);
  if (!it || ['returned', 'disposed', 'sold'].includes(it.stage)) throw new Error('This item can\'t be disposed of.');
  const home = homesOf(state).homes[it.homeId ?? ''];
  const cur = home?.currency ?? it.currency;
  const fee = Math.round(it.deliveryMinor / 100) * 100;
  if (!canPay(state, cur, fee)) throw new Error(`You need ${money(cur, fee)} available for the collection.`);
  payOut(state, { currency: cur }, `dispose:${it.id}`, fee, `Collection for recycling: ${it.name}`, 'Furniture And Appliances');
  it.stage = 'disposed';
  note(state, home?.id, `${it.name} was collected for recycling, for ${money(cur, fee)}.`);
}
/** A fault: under warranty the maker repairs it free; after, a repair is quoted as any other of yours. */
export function itemFault(state: GameState, it: Item): void {
  if (it.stage !== 'installed') return;
  const home = homeOf(state, it.homeId!);
  it.stage = 'faulty';
  const warranty = (it.warrantyUntil ?? 0) > state.now;
  if (warranty) { scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), 3)), 'warranty-repair', { id: it.id }); note(state, home.id, `${it.name} stopped working. It's under warranty: the maker's engineer comes in three days, at no cost.`, 'warning'); }
  else note(state, home.id, `${it.name} stopped working. Its warranty has run out: report it under Repairs for a quote, or replace it.`, 'warning');
}
export function warrantyRepair(state: GameState, it: Item): void {
  if (it.stage !== 'faulty') return;
  it.stage = 'installed';
  note(state, it.homeId ?? undefined, `${it.name} was repaired under warranty.`);
}

// ---------------- Work on a home ----------------

export function workQuote(state: GameState, home: Home, work: WorkKind): number {
  const c = WORK_COST_USD[work];
  const usd = (c.fixed ?? 0) + (c.perM2 ?? 0) * (WORK[work].exterior ? home.design.widthM * 2 + home.design.depthM * 2 * 3 * Math.max(1, home.design.floors) : home.floorAreaM2);
  return Math.round(usd * 100 / (dollarsOf(state, home.currency, 10000) / 100) / 100) * 100;
}
export const DISRUPTIVE: WorkKind[] = ['wall-removal', 'kitchen-refit', 'new-roof', 'tile-floor'];
/** How long each approval takes, the game's model: an engineer's review, an association's meeting, an authority's decision. */
export const APPROVAL_DAYS = { landlord: 0, association: 14, structural: 7, authority: 30, 'registered-contractor': 0 } as const;

export function workRefusal(state: GameState, homeId: string, work: WorkKind): string | null {
  const hs = homesOf(state);
  const home = hs.homes[homeId];
  if (!home) return 'That home is no longer on record.';
  const owns = hs.owned.some((o) => o.homeId === homeId && !o.soldAt);
  const renting = hs.tenancies.some((t) => t.homeId === homeId && t.stage === 'active');
  const check = permissionFor(HOME_RULES, home, owns ? 'owner' : renting ? 'tenant' : 'none', work, gardenOf(home));
  if (!check.allowed) return check.steps.at(-1)!.says;
  if (renting && !owns && !hs.permissions.some((p) => p.homeId === homeId && p.work === work && p.stage === 'granted')) return "This change needs your landlord's approval: ask them first.";
  if (hs.jobs.some((j) => j.homeId === homeId && j.work === work && ['awaiting-permission', 'scheduled', 'working'].includes(j.stage))) return 'That work is already under way.';
  if (hs.lettings.some((l) => l.homeId === homeId && (l.stage === 'let' || l.stage === 'notice'))) return 'Your tenant lives here: work waits until the tenancy ends.';
  const q = workQuote(state, home, work);
  if (!canPay(state, home.currency, Math.round(q * 0.3))) return `You need ${money(home.currency, Math.round(q * 0.3))} available for the deposit on this work.`;
  return null;
}
/**
 * Commission work: 30% paid now, the rest on completion. Any approval it needs comes first (the game's model of how long
 * each takes, where the research has no figure); the work can't start until it's given. A change to what the house looks
 * like makes a new design revision, and with it a new picture, only when the work is finished.
 */
export function startWork(state: GameState, homeId: string, work: WorkKind, choice?: { color?: string; roofMaterial?: string }): Job {
  const bad = badDesignValue({ ...(choice?.color ? { wallColor: choice.color } : {}), ...(choice?.roofMaterial ? { roofMaterial: choice.roofMaterial as Design['roofMaterial'] } : {}) });
  if (bad) throw new Error(bad);
  const no = workRefusal(state, homeId, work);
  if (no) throw new Error(no);
  const hs = homesOf(state);
  const home = homeOf(state, homeId);
  const owns = hs.owned.some((o) => o.homeId === homeId && !o.soldAt);
  const check = permissionFor(HOME_RULES, home, owns ? 'owner' : 'tenant', work, gardenOf(home));
  const q = workQuote(state, home, work);
  const id = newId(state, 'job');
  const first = Math.round(q * 0.3 / 100) * 100;
  payOut(state, home, `job:${id}:1`, first, `${WORK[work].label}, deposit: ${home.title}`, 'Home Improvements');
  const needs = check.needs.filter((n) => n !== 'landlord' && n !== 'registered-contractor');
  const wait = Math.max(0, ...needs.map((n) => APPROVAL_DAYS[n]));
  const today = todayAt(state, home);
  const startOn = addDaysToKey(today, wait + 3);
  const job: Job = {
    id, homeId, work, stage: needs.length ? 'awaiting-permission' : 'scheduled', quoteMinor: q, paidMinor: first, startOn, doneOn: addDaysToKey(startOn, WORK[work].days), needs, check,
    payments: [{ key: `job:${id}:1`, at: state.now, label: 'Deposit, 30%', minor: first, kind: 'paid' }], disruptive: DISRUPTIVE.includes(work),
  };
  (job as Job & { choice?: typeof choice }).choice = choice;
  hs.jobs.push(job);
  scheduleHome(state, instantOn(home, startOn, 8), 'work-start', { id });
  note(state, homeId, `${WORK[work].label} at ${home.title}: ${money(home.currency, q)}, ${money(home.currency, first)} paid now. ${needs.length ? `It needs ${needs.map((n) => ({ association: "the owners' association's approval", structural: "an engineer's review", authority: "the local authority's approval" } as Record<string, string>)[n] ?? n).join(' and ')} first; work` : 'Work'} starts on ${formatDateKey(startOn)} and should finish on ${formatDateKey(job.doneOn)}.${job.disruptive ? " You won't be able to stay there while it's done." : ''}`, 'money');
  return job;
}
export function workStart(state: GameState, j: Job): void {
  if (j.stage !== 'scheduled' && j.stage !== 'awaiting-permission') return;
  const home = homeOf(state, j.homeId);
  j.stage = 'working';
  scheduleHome(state, instantOn(home, j.doneOn, 17), 'work-done', { id: j.id });
  note(state, home.id, `${WORK[j.work].label} has started at ${home.title}.${j.disruptive && homesOf(state).residence === home.id ? " You can't stay there during this stage: book somewhere under Your Home." : ''}`);
}
export function workDone(state: GameState, j: Job): void {
  if (j.stage !== 'working') return;
  const hs = homesOf(state);
  const home = homeOf(state, j.homeId);
  const rest = j.quoteMinor - j.paidMinor;
  try {
    payOut(state, home, `job:${j.id}:2`, rest, `${WORK[j.work].label}, balance: ${home.title}`, 'Home Improvements');
    record(j.payments, { key: `job:${j.id}:2`, label: 'Balance on completion', minor: rest, kind: 'paid' }, state);
    j.paidMinor += rest;
  } catch {
    // The work is done; what's unpaid is owed to the contractor and said so (the game doesn't undo finished work).
    record(j.payments, { key: `job:${j.id}:2:owed`, label: 'Balance owed', minor: rest, kind: 'failed' }, state);
    note(state, home.id, `${WORK[j.work].label} is finished, but the balance of ${money(home.currency, rest)} couldn't be paid. It is owed to the contractor.`, 'warning');
  }
  j.stage = 'done';
  const choice = (j as Job & { choice?: { color?: string; roofMaterial?: string } }).choice ?? {};
  const d = home.design;
  const bump = () => { d.revision += 1; };
  switch (j.work) {
    case 'paint': case 'vinyl-floor': case 'tile-floor': case 'kitchen-refit': home.condition.finishes = 'good'; break;
    case 'wall-removal': { const dining = home.rooms.find((r) => r.kind === 'dining'); const living = home.rooms.find((r) => r.kind === 'living'); if (dining && living) { living.areaM2 += dining.areaM2; home.rooms = home.rooms.filter((r) => r !== dining); } break; }
    case 'workroom': if (!home.privateAmenities.includes('Soundproofed Workroom')) home.privateAmenities.push('Soundproofed Workroom'); break;
    case 'pool': d.outdoor.push('pool'); home.privateAmenities.push('Private Pool'); bump(); break;
    case 'exterior-paint': d.wallColor = choice.color ?? 'white'; bump(); break;
    case 'new-roof': d.roofMaterial = (choice.roofMaterial as typeof d.roofMaterial) ?? d.roofMaterial; home.condition.roof = 'good'; bump(); break;
    case 'porch': d.outdoor.push('porch'); bump(); break;
    case 'landscaping': d.landscaping = 'garden'; bump(); break;
    case 'driveway': d.driveway = 'paved'; bump(); break;
  }
  const t = hs.tenancies.find((x) => x.homeId === home.id && x.stage === 'active');
  if (t) t.changes.push({ work: j.work, restore: WORK[j.work].reversible, restored: false });
  document(state, home.id, `Completed Work: ${WORK[j.work].label}`, [`Finished on ${formatDateKey(todayAt(state, home))}.`, `Cost ${money(home.currency, j.quoteMinor)}.`, ...j.check.steps.map((s) => `${s.step}: ${s.says}`)]);
  note(state, home.id, `${WORK[j.work].label} at ${home.title} is finished.${WORK[j.work].exterior ? ' Its exterior picture shows the change.' : ''}`);
}
export function cancelWork(state: GameState, id: string): void {
  const j = homesOf(state).jobs.find((x) => x.id === id);
  if (!j || !['awaiting-permission', 'scheduled'].includes(j.stage)) throw new Error('This work can no longer be cancelled.');
  // Cancelled before it starts: the deposit is the contractor's (the game's contract), nothing else is owed.
  j.stage = 'cancelled';
  note(state, j.homeId, `You cancelled ${WORK[j.work].label}. The contractor keeps the deposit.`);
}
/** Put back a change you agreed to undo when you leave a rental: done now, at the cost of the original work's tenth. */
export function restoreChange(state: GameState, tenancyId: string, work: WorkKind): void {
  const t = homesOf(state).tenancies.find((x) => x.id === tenancyId);
  const c = t?.changes.find((x) => x.work === work && x.restore && !x.restored);
  if (!t || !c) throw new Error('There is nothing to put back.');
  const home = homeOf(state, t.homeId);
  const cost = Math.max(10000, Math.round(workQuote(state, home, work) * 0.1 / 100) * 100);
  if (!canPay(state, home.currency, cost)) throw new Error(`You need ${money(home.currency, cost)} available.`);
  payOut(state, home, `restore:${t.id}:${work}`, cost, `Putting back: ${WORK[work].label}`, 'Home Improvements');
  c.restored = true;
  note(state, home.id, `You put back ${WORK[work].label.toLowerCase()} as you agreed, for ${money(home.currency, cost)}.`);
}

// ---------------- Somewhere to stay ----------------

export const STAY_NIGHT_USD = 140;
export function bookStay(state: GameState, nights: number, reason: string): Stay {
  const hs = homesOf(state);
  const home = hs.residence ? hs.homes[hs.residence] : undefined;
  const placeId = home?.placeId ?? state.character.livesIn ?? state.locationId;
  const cur = home?.currency ?? 'USD';
  if (!(nights >= 1 && nights <= 90)) throw new Error('Book between 1 and 90 nights.');
  const nightly = Math.round(STAY_NIGHT_USD * 100 / (dollarsOf(state, cur, 10000) / 100) / 100) * 100;
  if (!canPay(state, cur, nightly * nights)) throw new Error(`You need ${money(cur, nightly * nights)} available for ${nights} nights.`);
  const id = newId(state, 'stay');
  payOut(state, { currency: cur }, `stay:${id}`, nightly * nights, `Temporary stay, ${nights} nights`, 'Temporary Accommodation');
  const from = home ? todayAt(state, home) : addDaysToKey('2026-01-01', 0);
  const s: Stay = { id, placeId, from, to: addDaysToKey(from, nights), nightlyMinor: nightly, currency: cur, paidMinor: nightly * nights, reason };
  hs.stays.push(s);
  note(state, home?.id, `You booked ${nights} nights nearby, ${money(cur, nightly * nights)} (the game's ${money(cur, nightly)} a night), until ${formatDateKey(s.to)}.`, 'money');
  return s;
}

// ---------------- Insurance ----------------

export function insuranceQuote(state: GameState, home: Home, cover: Policy['cover']): { monthlyMinor: number; excessMinor: number; refused?: string } {
  const hs = homesOf(state);
  const owns = hs.owned.some((o) => o.homeId === home.id && !o.soldAt);
  if (cover === 'buildings' && !owns) return { monthlyMinor: 0, excessMinor: 0, refused: "Only the owner insures the building: your landlord's insurance covers it." };
  if (cover === 'buildings' && inBuilding(home.form)) return { monthlyMinor: 0, excessMinor: 0, refused: "The building is insured by its owners' association; your share is in the building's charges." };
  const local = (usd: number) => Math.round(usd * 100 / (dollarsOf(state, home.currency, 10000) / 100) / 100) * 100;
  const monthly = cover === 'contents' ? local(RUNNING_USD.insuranceContentsMonthly) : local((RUNNING_USD.insuranceBuildingsPerM2Year * home.floorAreaM2) / 12);
  return { monthlyMinor: monthly, excessMinor: local(cover === 'contents' ? 250 : 1000) };
}
export function buyInsurance(state: GameState, homeId: string, cover: Policy['cover']): Policy {
  const hs = homesOf(state);
  const home = homeOf(state, homeId);
  if (hs.policies.some((p) => p.homeId === homeId && p.cover === cover && !p.endedAt)) throw new Error('You already have this cover.');
  const q = insuranceQuote(state, home, cover);
  if (q.refused) throw new Error(q.refused);
  if (!canPay(state, home.currency, q.monthlyMinor)) throw new Error(`You need ${money(home.currency, q.monthlyMinor)} available for the first month.`);
  const p: Policy = { id: newId(state, 'pol'), homeId, cover, monthlyMinor: q.monthlyMinor, excessMinor: q.excessMinor, since: state.now, claims: [] };
  payOut(state, home, `pol:${p.id}:1`, q.monthlyMinor, `${cover === 'contents' ? 'Contents' : 'Buildings'} insurance: ${home.title}`, 'Insurance');
  hs.policies.push(p);
  note(state, homeId, `You insured ${home.title} (${cover === 'contents' ? 'your belongings' : 'the building'}): ${money(home.currency, q.monthlyMinor)} a month, ${money(home.currency, q.excessMinor)} excess. The cover and its price are the game's model, not a real insurer's.`, 'money');
  return p;
}
/** Claim for a repair you paid: buildings cover pays the repair less the excess, once, as a refund of the repair's cost. */
export function claimRepair(state: GameState, repairId: string): void {
  const hs = homesOf(state);
  const r = hs.repairs.find((x) => x.id === repairId);
  if (!r || r.who !== 'you' || !['booked', 'fixed'].includes(r.stage)) throw new Error('There is no repair of yours to claim for.');
  if (r.claimed) throw new Error('You have already claimed for this.');
  const p = hs.policies.find((x) => x.homeId === r.homeId && x.cover === 'buildings' && !x.endedAt && x.since <= r.reportedAt);
  if (!p) throw new Error('No buildings cover was in force when this happened.');
  r.claimed = true;
  p.claims.push({ repairId, stage: 'assessing', says: 'The insurer is assessing it.' });
  const home = homeOf(state, r.homeId);
  scheduleHome(state, instantOn(home, addDaysToKey(todayAt(state, home), 5)), 'claim-decision', { policyId: p.id, repairId });
  note(state, home.id, `You claimed on your buildings insurance for ${r.component.toLowerCase()} at ${home.title}. The insurer decides within five days.`);
}
export function decideClaim(state: GameState, policyId: string, repairId: string): void {
  const hs = homesOf(state);
  const p = hs.policies.find((x) => x.id === policyId);
  const r = hs.repairs.find((x) => x.id === repairId);
  const c = p?.claims.find((x) => x.repairId === repairId);
  if (!p || !r || !c || c.stage !== 'assessing') return;
  const home = homeOf(state, r.homeId);
  // Wear and tear isn't an insured event: a component that was only fair when cover began is refused, the game's model.
  const pay = Math.max(0, (r.quoteMinor ?? 0) - p.excessMinor);
  if (r.component === 'Floors And Walls' || pay === 0) { c.stage = 'refused'; c.says = r.component === 'Floors And Walls' ? 'Refused: wear to floors and walls isn\'t covered.' : 'Refused: the repair cost less than the excess.'; }
  else { refund(state, home, `claim:${p.id}:${repairId}`, pay, `Insurance payout: ${r.component}, ${home.title}`, 'Home Repairs'); c.stage = 'paid'; c.paidMinor = pay; r.claimPaidMinor = pay; c.says = `Paid ${money(home.currency, pay)}: the repair less your ${money(home.currency, p.excessMinor)} excess.`; }
  note(state, home.id, `Your insurance claim for ${r.component.toLowerCase()}: ${c.says}`, c.stage === 'paid' ? 'money' : 'warning');
}

// ---------------- Bills ----------------

/** The month's household costs for a home you live in: electricity by its use, the rest by the game's model. */
export function billLines(state: GameState, home: Home): { what: string; minor: number; basis: string }[] {
  const hs = homesOf(state);
  const lines: { what: string; minor: number; basis: string }[] = [];
  const local = (usd: number) => Math.round(usd * 100 / (dollarsOf(state, home.currency, 10000) / 100));
  const items = hs.items.filter((i) => i.homeId === home.id && i.stage === 'installed');
  const electricItems = items.filter((i) => i.fuel !== 'Gas' && i.annualKwh !== null);
  const kwh = Math.round((home.floorAreaM2 * RUNNING_USD.kwhBasePerM2Year) / 12 + electricItems.reduce((a, i) => a + (i.annualKwh ?? 0), 0) / 12);
  if (!home.included.includes('electricity')) {
    const price = home.electricity?.minorPerKwh ?? local(RUNNING_USD.placeholderKwhPrice);
    lines.push({ what: `Electricity, about ${kwh} kWh`, minor: Math.round(kwh * price), basis: `${home.electricity?.says ?? 'Placeholder price.'} Use: ${home.floorAreaM2} m² by the game's 32 kWh a square metre a year, plus your appliances' certified test energy.` });
  }
  const gas = items.filter((i) => i.fuel === 'Gas');
  if (gas.length) lines.push({ what: 'Gas for your gas appliances', minor: 0, basis: "Not estimated: the EPA figure for a gas dryer combines gas and electricity, and isn't priced as electricity." });
  if (!home.included.includes('water')) lines.push({ what: 'Water', minor: local(RUNNING_USD.waterMonthly), basis: "The game's placeholder: no water tariff has been researched." });
  if (!home.included.includes('heating')) lines.push({ what: 'Heating', minor: local(RUNNING_USD.heatingPerM2Month * home.floorAreaM2), basis: "The game's placeholder, by floor area." });
  if (!home.included.includes('internet')) lines.push({ what: 'Internet', minor: local(RUNNING_USD.internetMonthly), basis: "The game's placeholder." });
  const owns = hs.owned.some((o) => o.homeId === home.id && !o.soldAt);
  if (owns && home.buildingChargeMinor) lines.push({ what: "The building's charges", minor: home.buildingChargeMinor, basis: 'As offered with the home (simulated).' });
  if (owns && home.design.outdoor.includes('pool')) lines.push({ what: 'Pool upkeep', minor: local(RUNNING_USD.poolMonthly), basis: "The game's estimate for your private pool." });
  for (const p of hs.policies.filter((x) => x.homeId === home.id && !x.endedAt)) lines.push({ what: `${p.cover === 'contents' ? 'Contents' : 'Buildings'} insurance`, minor: p.monthlyMinor, basis: "The game's model." });
  return lines;
}
/** The month's bill for the home you live in, paid from the bank once; anything unpaid stays owed and is said. */
export function monthlyBill(state: GameState, homeId: string): void {
  const hs = homesOf(state);
  const home = hs.homes[homeId];
  if (!home || hs.residence !== homeId) return;
  const period = todayAt(state, home).slice(0, 7);
  const key = `bill:${homeId}:${period}`;
  if (hs.bills.some((b) => b.key === key)) return;
  const lines = billLines(state, home);
  const total = lines.reduce((a, l) => a + l.minor, 0);
  let paid = true;
  try { payOut(state, home, key, total, `Household bills, ${period}: ${home.title}`, 'Household Bills'); } catch { paid = false; }
  hs.bills.unshift({ key, homeId, period, lines, totalMinor: total, paid });
  if (hs.bills.length > 120) hs.bills.length = 120;
  // An installed appliance can develop a fault, a seeded draw kept per item and month: reloading can't change it.
  for (const it of hs.items.filter((i) => i.homeId === homeId && i.stage === 'installed')) if (unit(state.seed, 'item-fault', it.id, period) < 0.02) itemFault(state, it);
  note(state, homeId, paid ? `Household bills for ${period}: ${money(home.currency, total)}, paid.` : `Household bills for ${period}, ${money(home.currency, total)}, couldn't be paid. They're owed; services aren't cut off by the game.`, paid ? 'money' : 'warning');
  scheduleHome(state, instantOn(home, addMonths(todayAt(state, home), 1)), 'bill', { homeId }, 'silent', `home-bill:${homeId}:${addMonths(todayAt(state, home), 1).slice(0, 7)}`);
}
export { BOOK, book };
