// Builds src/data/equipment.json: the equipment the shop sells (the v4 package, 02; ledger V4-018). Run:
//   node tools/equipment/catalog.mjs
// Specifications are only those the game reads (a mount, the media a camera records to, the battery it takes, its
// audio inputs, a microphone's connector and pickup), each from the maker's page named in `specFrom` or from the
// product's own name. Prices are one US retailer's public listing (Glazer's Camera), read on the date written; an
// item it no longer lists gets no price, and the game does not sell it at a made-up one. Rental day rates, resale
// values and wear are the game's own calibration, kept in engine/equipment.ts, never in this file.
import { writeFileSync } from 'node:fs';

const BMD_POCKET = 'https://www.blackmagicdesign.com/products/blackmagicpocketcinemacamera/techspecs/W-CIN-12';
const BMD_PYXIS = 'https://www.blackmagicdesign.com/products/blackmagicpyxis/techspecs';
const NAME = 'the product name';
const ITEMS = [
  // Cameras: the mount, media and battery the maker lists, and whether one battery comes in the box; each has mini XLR
  // inputs (`xlr`) and one 3.5 mm input (`mini`).
  { id: 'bmpcc-4k', handle: 'blackmagic-pocket-cinema-4k', kind: 'camera', name: 'Blackmagic Pocket Cinema Camera 4K', mount: 'mft', media: ['cfast', 'sd'], battery: 'lp-e6', batteryIncluded: true, xlr: 1, mini: 1, specFrom: BMD_POCKET },
  { id: 'bmpcc-6k-g2', handle: 'blackmagic-pocket-cine-6k-g2', kind: 'camera', name: 'Blackmagic Pocket Cinema Camera 6K G2', mount: 'ef', media: ['cfast', 'sd'], battery: 'np-f', batteryIncluded: true, xlr: 2, mini: 1, specFrom: BMD_POCKET },
  { id: 'pyxis-6k-ef', handle: 'bmd-pyxis-6k-cine-box-cam-ef', kind: 'camera', name: 'Blackmagic PYXIS 6K (EF Mount)', mount: 'ef', media: ['cfexpress-b'], battery: 'bp-u', xlr: 1, mini: 1, specFrom: BMD_PYXIS },
  { id: 'pyxis-12k-l', handle: 'bmd-pyxis-12k-cine-box-cam-lmt', kind: 'camera', name: 'Blackmagic PYXIS 12K (L-Mount)', mount: 'l', media: ['cfexpress-b'], battery: 'bp-u', xlr: 1, mini: 1, specFrom: BMD_PYXIS },
  // Lenses: the mount is in the name.
  { id: 'canon-ef-50-18', handle: 'lens-ef-50-f1-8-stm', kind: 'lens', name: 'Canon EF 50mm f/1.8 STM', mount: 'ef', specFrom: NAME },
  { id: 'lumix-12-35', handle: 'lumix-s-12-35mm-f2-8-leica-dg', kind: 'lens', name: 'Lumix G 12-35mm f/2.8 Leica DG Vario-Elmarit (Micro Four Thirds)', mount: 'mft', specFrom: NAME },
  { id: 'sigma-24-70-l', handle: 'sigma-24-70mm-f2-8-ii-art-l-mt', kind: 'lens', name: 'Sigma 24-70mm f/2.8 DG DN II Art (L-Mount)', mount: 'l', specFrom: NAME },
  // Media: the card type is in the name.
  { id: 'sd-uhs2-256', handle: 'extreme-pro-256gb-sdxc-uhs-ii', kind: 'media', name: 'SanDisk 256GB Extreme PRO UHS-II SDXC', media: 'sd', specFrom: NAME },
  { id: 'cfast-256', handle: 'extreme-pro-256gb-cfast-2-0', kind: 'media', name: 'SanDisk 256GB Extreme PRO CFast 2.0', media: 'cfast', specFrom: NAME },
  { id: 'cfx-b-256', handle: 'extreme-pro-256gb-cfx-b-4-0', kind: 'media', name: 'SanDisk 256GB Extreme PRO CFexpress 4.0 Type B', media: 'cfexpress-b', specFrom: NAME },
  // Batteries: the type is in the name. No LP-E6 type is sold: Canon's current LP-E6P is not documented for a
  // Blackmagic body, and the Pocket 4K comes with its own.
  { id: 'np-f970', handle: 'np-f970-batt-10500mah', kind: 'battery', name: 'Tilta NP-F970 Battery', battery: 'np-f', specFrom: NAME },
  { id: 'bp-u35', handle: 'sony-bp-u30-battery', kind: 'battery', name: 'Sony BP-U35 Battery', battery: 'bp-u', specFrom: NAME },
  // Sound.
  { id: 'zoom-f3', handle: 'zoom-f3-multitrack-rec-32bit', kind: 'recorder', name: 'Zoom F3 Field Recorder (2 XLR Inputs)', xlr: 2, specFrom: NAME },
  { id: 'mke-600', handle: 'mke600-microphone', kind: 'microphone', name: 'Sennheiser MKE 600 Shotgun Microphone', connector: 'xlr', pickup: 'shotgun', specFrom: 'https://www.sennheiser.com/globalassets/digizuite/41788-en-sp_1302_v1.0_mke_600_product_specification_en.pdf' },
  { id: 'videomic-ntg', handle: 'rode-videomic-ntg', kind: 'microphone', name: 'Rode VideoMic NTG On-Camera Microphone', connector: 'mini', pickup: 'on-camera', specFrom: 'https://rode.com/en-us/microphones/on-camera/videomic-ntg' },
  { id: 'boompole', handle: 'rode-boom-pole', kind: 'boom', name: 'Rode Boompole', specFrom: NAME },
  // Light: a lamp needs a stand.
  { id: 'halo-200x', handle: 'amaran-halo-200x', kind: 'light', name: 'Amaran Halo 200x Bi-Color Light (200W)', specFrom: NAME },
  { id: 'halo-100x', handle: 'amaran-halo-100x', kind: 'light', name: 'Amaran Halo 100x Bi-Color Light (100W)', specFrom: NAME },
  { id: 'stand-300f', handle: 'godox-300f-12-5-hd-lt-stand', kind: 'stand', name: 'Godox 300F Light Stand', specFrom: NAME },
  // Support.
  { id: 'befree-video', handle: 'befree-advanced-live-video-kit', kind: 'tripod', name: 'Manfrotto Befree Live Video Tripod Kit', specFrom: NAME },
  { id: 'rs4-pro', handle: 'dji-rs-4-pro', kind: 'gimbal', name: 'DJI RS 4 Pro Gimbal Stabilizer', specFrom: NAME },
];

const SHOP = 'https://www.glazerscamera.com/products/';
const retrieved = new Date().toISOString().slice(0, 10);
const out = [];
for (const { handle, ...item } of ITEMS) {
  let price = null;
  try {
    const r = await fetch(`${SHOP}${handle}.json`, { headers: { 'User-Agent': 'slate-source-catalog/1.0' } });
    if (r.ok) price = Math.round(Number((await r.json()).product.variants[0].price) * 100) / 100;
  } catch { /* unlisted: no price, not sold */ }
  out.push({ ...item, price, priceFrom: price === null ? null : `${SHOP}${handle}` });
  console.log(item.id, price);
}
writeFileSync(new URL('../../src/data/equipment.json', import.meta.url), JSON.stringify({
  source: "Glazer's Camera, a US retailer's public product listings", currency: 'USD', retrieved, items: out,
}, null, 1) + '\n');
