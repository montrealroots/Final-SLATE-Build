// The equipment the shop sells (the v4 package, 02 "Shop, rentals and inventory"; ledger V4-018). Built November 12, 2026.
// src/data/equipment.json is written by tools/equipment/catalog.mjs: each item's modeled specifications are from its
// maker's page or its own name, and its price is one US retailer's public listing on the date the file records. The
// rental day rate, resale value and wear below are this game's calibration, not market data, and are labelled so.
import data from '../data/equipment.json';
import { money } from './budget';

export type GearKind = 'camera' | 'lens' | 'media' | 'battery' | 'recorder' | 'microphone' | 'boom' | 'light' | 'stand' | 'tripod' | 'gimbal';
export interface Gear {
  id: string;
  kind: GearKind;
  name: string;
  /** A camera's or lens's mount. */
  mount?: string;
  /** A camera: the card types it records to (an array). A card: its type (a string). */
  media?: string | string[];
  /** A camera: the battery type it takes. A battery: its type. */
  battery?: string;
  /** A camera that comes with one battery of its type. */
  batteryIncluded?: boolean;
  /** Microphone inputs: a camera's mini XLR inputs and a recorder's XLR inputs. */
  xlr?: number;
  /** A camera's 3.5 mm inputs. */
  mini?: number;
  /** A microphone: what it picks up. */
  pickup?: 'shotgun' | 'on-camera';
  specFrom: string;
  /** US dollars; null when no listing was found, and then it isn't sold. */
  price: number | null;
  priceFrom: string | null;
}

export const GEAR: Gear[] = data.items as Gear[];
export const GEAR_SOURCE = { source: data.source, currency: data.currency, retrieved: data.retrieved };
export const gearById = (id: string): Gear | undefined => GEAR.find((g) => g.id === id);

export const GEAR_KIND_LABELS: Record<GearKind, string> = {
  camera: 'Cameras', lens: 'Lenses', media: 'Recording Media', battery: 'Batteries', recorder: 'Sound Recorders', microphone: 'Microphones',
  boom: 'Boom Poles', light: 'Lights', stand: 'Light Stands', tripod: 'Tripods', gimbal: 'Stabilizers',
};
export const MOUNT_LABELS: Record<string, string> = { ef: 'EF', mft: 'Micro Four Thirds', l: 'L-Mount' };
export const MEDIA_LABELS: Record<string, string> = { sd: 'SD', cfast: 'CFast 2.0', 'cfexpress-b': 'CFexpress Type B' };
export const BATTERY_LABELS: Record<string, string> = { 'lp-e6': 'Canon LP-E6', 'np-f': 'Sony NP-F', 'bp-u': 'Sony BP-U' };

/** A rental house's day rate: this share of the listed price for each shoot day, at least the floor. Game calibration. */
export const RENT_SHARE = 0.04;
export const RENT_LEAST = 5;
export const rentDayRate = (g: Gear): number => Math.max(RENT_LEAST, Math.round((g.price ?? 0) * RENT_SHARE));
/** What a used item sells for: this share of its listed price, less its wear. Game calibration. */
export const RESALE_SHARE = 0.5;
/** Wear: each shoot day takes a point of condition; under the floor it isn't used until serviced. Servicing takes days
 *  and costs a share of the price for the condition restored. Game calibration. */
export const WEAR_PER_DAY = 1;
export const SERVICE_BELOW = 50;
export const SERVICE_DAYS = 3;
export const SERVICE_SHARE = 0.25;

/** The few facts a player compares, in words. */
export function gearFacts(g: Gear): string[] {
  const out: string[] = [];
  if (g.mount) out.push(`${MOUNT_LABELS[g.mount] ?? g.mount} mount`);
  if (Array.isArray(g.media)) out.push(`records to ${g.media.map((m) => MEDIA_LABELS[m] ?? m).join(' or ')}`);
  else if (g.media) out.push(`${MEDIA_LABELS[g.media] ?? g.media} card`);
  if (g.battery) out.push(g.kind === 'camera' ? `takes ${BATTERY_LABELS[g.battery] ?? g.battery} batteries${g.batteryIncluded ? ', one in the box' : ', none in the box'}` : `${BATTERY_LABELS[g.battery] ?? g.battery} type`);
  if (g.kind === 'camera') out.push(`${g.xlr} mini XLR and ${g.mini} 3.5 mm audio ${(g.xlr ?? 0) + (g.mini ?? 0) === 1 ? 'input' : 'inputs'}`);
  if (g.kind === 'recorder') out.push(`${g.xlr} XLR inputs`);
  if (g.pickup) out.push(g.pickup === 'shotgun' ? 'a shotgun microphone, for a boom' : 'mounts on the camera');
  if (g.kind === 'light') out.push('needs a stand');
  return out;
}

export const priceLine = (g: Gear): string => (g.price === null ? 'No price recorded: not sold' : `${money(g.price)} (listed ${GEAR_SOURCE.retrieved})`);
