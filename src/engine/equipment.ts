// Your equipment, and a project's kit (the v4 package, 02 "Shop, rentals and inventory"; ledger V4-016.02, V4-018,
// V4-019). Built November 12, 2026. Until then every live-action shoot day paid one flat equipment package, scaled by
// budget size, and nothing was owned.
//
// The loop: compare in the shop, buy from your own account (or have your family lend), put items in a project's kit or
// rent them for it, check the kit against what each shoot day needs, shoot, wear, service, sell. A project with no kit
// still hires the rental house's package, as before. A project with a kit pays only the day rates of what it rents:
// owned and lent items cost nothing to use. A day the kit can't cover (a missing light for a night scene, an item
// booked on another shoot that date, an item worn out or away being serviced) hires the house package for that day
// and says why, so a shoot never stops for gear and never pays twice.
//
// Specifications are read only where they change something: a lens must fit the camera's mount, a card its slots, a
// battery its type; lights need stands; a scene with dialogue needs a microphone and the camera and recorders inputs
// for each; Dialogue Clarity needs a shotgun microphone on a boom; a scene on a tripod needs a tripod; a stabilizer in
// the kit replaces the rented one for long moving takes. Nothing here makes a picture better: an expensive camera is
// as good as a cheap one that fits.
import { GEAR, RESALE_SHARE, SERVICE_BELOW, SERVICE_DAYS, SERVICE_SHARE, WEAR_PER_DAY, gearById, rentDayRate, type Gear } from './gear-catalog';
import { lightOf, rigOf, soundsOf } from './craft';
import { personalBalance, postPersonal } from './personal';
import { approvedScenes } from './projects';
import { newId, onDraftCheck, onNewGame } from './state';
import { DAY } from './time';
import { money } from './budget';
import type { GameState, Project, Scene, ShootDay } from './types';

export interface OwnedGear {
  id: string;
  gearId: string;
  /** Yours, bought; or your family's, lent for as long as you need it (it can't be sold). */
  owner: 'you' | 'family';
  at: number;
  /** What you paid; 0 for a family loan. */
  paid: number;
  /** 100 new; a point less for each shoot day; under SERVICE_BELOW it isn't used until serviced. */
  condition: number;
  /** Away being serviced until this instant. */
  awayUntil?: number;
  sold?: number;
}
export interface GearInventory { items: OwnedGear[] }
export interface KitItem {
  id: string;
  gearId: string;
  how: 'owned' | 'rented';
  /** An owned item: which one. */
  itemId?: string;
  /** A rental: what each shoot day it is used costs. 0 for an owned item. */
  dayRate: number;
  at: number;
}
export interface ProjectKit { items: KitItem[] }

const live = (s: GameState) => (s.gear?.items ?? []).filter((x) => !x.sold);
export const ownedItem = (s: GameState, id: string) => (s.gear?.items ?? []).find((x) => x.id === id);
export const gearOf = (k: { gearId: string }): Gear => gearById(k.gearId)!;

// ---------------- Buying, servicing, selling: your own account ----------------

export function buyRefusal(state: GameState, gearId: string): string | null {
  const g = gearById(gearId);
  if (!g) return 'That isn\'t in the shop.';
  if (g.price === null) return 'No price is recorded for this, so it isn\'t sold.';
  if (!state.money) return 'This story began before your own money was part of the game: you have no account to buy from.';
  if (personalBalance(state) < Math.round(g.price)) return `It costs ${money(g.price)} and you have ${money(personalBalance(state))} in your own account.`;
  return null;
}

export function buyGear(state: GameState, gearId: string): OwnedGear {
  const no = buyRefusal(state, gearId);
  if (no) throw new Error(no);
  const g = gearById(gearId)!;
  const item: OwnedGear = { id: newId(state, 'gr'), gearId, owner: 'you', at: state.now, paid: Math.round(g.price!), condition: 100 };
  (state.gear ??= { items: [] }).items.push(item);
  postPersonal(state, 'equipment', -item.paid, `Bought: ${g.name}`, `gear:${item.id}`);
  return item;
}

/** The undelivered projects whose kit holds this item. */
const kitsHolding = (state: GameState, itemId: string) => state.projects.filter((p) => !p.delivered && p.kit?.items.some((k) => k.itemId === itemId));

export const resaleValue = (it: OwnedGear): number => Math.round((gearById(it.gearId)?.price ?? 0) * RESALE_SHARE * it.condition / 100);

export function sellRefusal(state: GameState, itemId: string): string | null {
  const it = ownedItem(state, itemId);
  if (!it || it.sold) return 'You don\'t have that.';
  if (it.owner === 'family') return 'Your family lent you this; it isn\'t yours to sell.';
  const held = kitsHolding(state, itemId);
  if (held.length) return `It's in the kit for ${held.map((p) => p.title).join(' and ')}. Take it out first.`;
  return null;
}

export function sellGear(state: GameState, itemId: string): number {
  const no = sellRefusal(state, itemId);
  if (no) throw new Error(no);
  const it = ownedItem(state, itemId)!;
  const value = resaleValue(it);
  it.sold = state.now;
  postPersonal(state, 'equipment-sale', value, `Sold: ${gearOf(it).name}`, `gear-sale:${it.id}`);
  return value;
}

export const serviceCost = (it: OwnedGear): number => Math.round((gearById(it.gearId)?.price ?? 0) * SERVICE_SHARE * (100 - it.condition) / 100);

export function serviceRefusal(state: GameState, itemId: string): string | null {
  const it = ownedItem(state, itemId);
  if (!it || it.sold) return 'You don\'t have that.';
  if (it.awayUntil && it.awayUntil > state.now) return 'It\'s already away being serviced.';
  if (it.condition >= 100) return 'It\'s in good order.';
  if (personalBalance(state) < serviceCost(it)) return `Servicing costs ${money(serviceCost(it))} and you have ${money(personalBalance(state))} in your own account.`;
  return null;
}

/** Sends an item away to be serviced: paid now from your account, back in SERVICE_DAYS days in good order. */
export function serviceGear(state: GameState, itemId: string): void {
  const no = serviceRefusal(state, itemId);
  if (no) throw new Error(no);
  const it = ownedItem(state, itemId)!;
  const cost = serviceCost(it);
  if (cost > 0) postPersonal(state, 'equipment', -cost, `Serviced: ${gearOf(it).name}`, `gear-service:${it.id}:${state.now}`);
  it.condition = 100;
  it.awayUntil = state.now + SERVICE_DAYS * DAY;
}

// ---------------- A project's kit ----------------

const theCamera = (p: Project) => p.kit?.items.find((k) => gearOf(k).kind === 'camera');

/** Shoot dates this project has still to film, or is filming today. */
const scheduledDates = (p: Project): Set<string> => new Set(p.schedule.days.filter((d) => d.status === 'scheduled').map((d) => d.date));

/** Another project's shoot that has this owned item on a date this one is also shooting, or null. */
function bookedElsewhere(state: GameState, p: Project, itemId: string, dates: Set<string>): string | null {
  for (const q of kitsHolding(state, itemId)) {
    if (q.id === p.id) continue;
    const clash = q.schedule.days.find((d) => d.status === 'scheduled' && dates.has(d.date));
    if (clash) return `${gearOf(ownedItem(state, itemId)!).name} is booked for ${q.title} on ${clash.date}.`;
  }
  return null;
}

export function kitAddRefusal(state: GameState, p: Project, add: { itemId?: string; gearId?: string }): string | null {
  if (p.delivered) return 'This project is delivered.';
  if (p.axes.medium === 'animation') return 'An animated project has no shoot days: it needs no camera kit.';
  const g = add.itemId ? gearById(ownedItem(state, add.itemId)?.gearId ?? '') : gearById(add.gearId ?? '');
  if (!g) return 'That isn\'t equipment you can use.';
  if (add.itemId) {
    const it = ownedItem(state, add.itemId);
    if (!it || it.sold) return 'You don\'t have that.';
    if (p.kit?.items.some((k) => k.itemId === add.itemId)) return 'It\'s in this kit already.';
    const clash = bookedElsewhere(state, p, add.itemId, scheduledDates(p));
    if (clash) return clash;
  } else if (g.price === null) return 'No rental rate can be set without a recorded price.';
  if (g.kind === 'camera' && theCamera(p)) return `This kit has a camera, the ${gearOf(theCamera(p)!).name}. Take it out first.`;
  return null;
}

/** Puts one of your items in this project's kit, or rents one for it. The first item makes the kit replace the house package. */
export function addToKit(state: GameState, p: Project, add: { itemId?: string; gearId?: string }): KitItem {
  const no = kitAddRefusal(state, p, add);
  if (no) throw new Error(no);
  const gearId = add.itemId ? ownedItem(state, add.itemId)!.gearId : add.gearId!;
  const k: KitItem = add.itemId
    ? { id: newId(state, 'ki'), gearId, how: 'owned', itemId: add.itemId, dayRate: 0, at: state.now }
    : { id: newId(state, 'ki'), gearId, how: 'rented', dayRate: rentDayRate(gearById(gearId)!), at: state.now };
  (p.kit ??= { items: [] }).items.push(k);
  return k;
}

/** Takes an item out: an owned item goes back on your shelf, a rental back to the house. What was charged stays charged. */
export function removeFromKit(p: Project, kitItemId: string): void {
  if (!p.kit) return;
  p.kit.items = p.kit.items.filter((k) => k.id !== kitItemId);
  if (!p.kit.items.length) delete p.kit;
}

/** What a shoot day with this kit costs in rentals; owned items cost nothing. */
export const kitDayRate = (p: Project): number => (p.kit?.items ?? []).reduce((a, k) => a + k.dayRate, 0);

export interface KitProblem { need: string; text: string; fix: string[] }

const has = (p: Project, pred: (g: Gear) => boolean) => (p.kit?.items ?? []).filter((k) => pred(gearOf(k)));
const fits = (pred: (g: Gear) => boolean) => GEAR.filter((g) => g.price !== null && pred(g)).map((g) => g.id);
const lit = (s: Scene) => s.heading.intExt !== 'EXT' || s.heading.time === 'NIGHT';

/** What the kit can't do for these scenes (all the approved ones when none are given), with what in the shop would fix it. */
export function kitProblems(p: Project, scenes: Scene[] = approvedScenes(p)): KitProblem[] {
  if (!p.kit) return [];
  const out: KitProblem[] = [];
  const cam = theCamera(p) ? gearOf(theCamera(p)!) : undefined;
  if (!cam) return [{ need: 'camera', text: 'The kit has no camera.', fix: fits((g) => g.kind === 'camera') }];
  const media = Array.isArray(cam.media) ? cam.media : [];
  if (!has(p, (g) => g.kind === 'lens' && g.mount === cam.mount).length) out.push({ need: 'lens', text: `No lens in the kit fits the ${cam.name}.`, fix: fits((g) => g.kind === 'lens' && g.mount === cam.mount) });
  if (!has(p, (g) => g.kind === 'media' && media.includes(g.media as string)).length) out.push({ need: 'media', text: `No card in the kit fits the ${cam.name}.`, fix: fits((g) => g.kind === 'media' && media.includes(g.media as string)) });
  if (!cam.batteryIncluded && !has(p, (g) => g.kind === 'battery' && g.battery === cam.battery).length) out.push({ need: 'battery', text: `The ${cam.name} comes without a battery, and none in the kit fits it.`, fix: fits((g) => g.kind === 'battery' && g.battery === cam.battery) });
  const lights = has(p, (g) => g.kind === 'light').length;
  if (lightOf(p) !== 'available' && scenes.some(lit) && !lights) out.push({ need: 'light', text: 'Interiors and night scenes are lit as usual, and the kit has no lights.', fix: fits((g) => g.kind === 'light') });
  if (lights > has(p, (g) => g.kind === 'stand').length) out.push({ need: 'stand', text: `The kit has ${lights} ${lights === 1 ? 'light' : 'lights'} and fewer stands.`, fix: fits((g) => g.kind === 'stand') });
  const talk = scenes.some((s) => s.dialogue.length > 0);
  const mics = has(p, (g) => g.kind === 'microphone');
  const inputs = (cam.xlr ?? 0) + (cam.mini ?? 0) + has(p, (g) => g.kind === 'recorder').reduce((a, k) => a + (gearOf(k).xlr ?? 0), 0);
  if (talk && !mics.length) out.push({ need: 'microphone', text: 'Scenes have dialogue, and the kit has no microphone.', fix: fits((g) => g.kind === 'microphone') });
  if (mics.length > inputs) out.push({ need: 'inputs', text: `The kit has ${mics.length} microphones and inputs for ${inputs}.`, fix: fits((g) => g.kind === 'recorder') });
  if (talk && soundsOf(p).includes('clarity')) {
    if (!mics.some((k) => gearOf(k).pickup === 'shotgun')) out.push({ need: 'shotgun', text: 'Dialogue Clarity booms every dialogue scene, and the kit has no shotgun microphone.', fix: fits((g) => g.pickup === 'shotgun') });
    if (!has(p, (g) => g.kind === 'boom').length) out.push({ need: 'boom', text: 'Dialogue Clarity booms every dialogue scene, and the kit has no boom pole.', fix: fits((g) => g.kind === 'boom') });
  }
  if (scenes.some((s) => rigOf(p, s.id) === 'sticks') && !has(p, (g) => g.kind === 'tripod').length) out.push({ need: 'tripod', text: 'Scenes are shot on a tripod, and the kit has none.', fix: fits((g) => g.kind === 'tripod') });
  return out;
}

/** Everything that stops the kit serving this shoot day: what it lacks for the day's scenes, and owned items booked
 *  elsewhere that date, away being serviced, or worn out. Empty when the kit can shoot the day. */
export function dayKitProblems(state: GameState, p: Project, d: ShootDay, at: number): KitProblem[] {
  if (!p.kit) return [];
  const scenes = approvedScenes(p).filter((s) => d.sceneIds.includes(s.id));
  const out = kitProblems(p, scenes);
  for (const k of p.kit.items) {
    if (!k.itemId) continue;
    const it = ownedItem(state, k.itemId);
    const name = gearOf(k).name;
    if (!it || it.sold) { out.push({ need: 'gone', text: `The ${name} is no longer yours.`, fix: [] }); continue; }
    if (it.awayUntil && it.awayUntil > at) out.push({ need: 'away', text: `The ${name} is away being serviced.`, fix: [] });
    else if (it.condition < SERVICE_BELOW) out.push({ need: 'worn', text: `The ${name} needs servicing before it's used again.`, fix: [] });
    const clash = bookedElsewhere(state, p, k.itemId, new Set([d.date]));
    if (clash) out.push({ need: 'booked', text: clash, fix: [] });
  }
  return out;
}

/** Shoot days on these dates would put an owned item on two shoots at once: why, or null. Read when a schedule is made. */
export function kitClash(state: GameState, p: Project, dates: string[]): string | null {
  const set = new Set(dates);
  for (const k of p.kit?.items ?? []) {
    if (!k.itemId) continue;
    const why = bookedElsewhere(state, p, k.itemId, set);
    if (why) return `${why} One item can't be on two shoots at once: take it out of one kit, or rent another.`;
  }
  return null;
}

/** After a day shot on the kit: each owned item wears a little. */
export function wearKit(state: GameState, p: Project): void {
  for (const k of p.kit?.items ?? []) {
    const it = k.itemId ? ownedItem(state, k.itemId) : undefined;
    if (it) it.condition = Math.max(0, it.condition - WEAR_PER_DAY);
  }
}

export const ownedGear = (state: GameState): OwnedGear[] => live(state);

// ---------------- What your family lends ----------------

/** Lent equipment's value, at its listed prices: what a family's circumstances bound. */
export const lentValue = (gearIds: string[]): number => gearIds.reduce((a, id) => a + Math.round(gearById(id)?.price ?? 0), 0);

onDraftCheck((d) => {
  const f = d.family;
  if (f?.support !== 'equipment') return [];
  const ids = f.gear ?? [];
  if (!ids.length) return [{ field: 'family', step: 'starting-point', message: 'Choose what your family lends.' }];
  if (ids.some((id) => !gearById(id) || gearById(id)!.price === null)) return [{ field: 'family', step: 'starting-point', message: 'Your family can lend only equipment with a recorded price.' }];
  return [];
});
onNewGame((state, d) => {
  if (d.family?.support !== 'equipment') return;
  state.gear = { items: (d.family.gear ?? []).map((gearId) => ({ id: newId(state, 'gr'), gearId, owner: 'family' as const, at: state.now, paid: 0, condition: 100 })) };
});
