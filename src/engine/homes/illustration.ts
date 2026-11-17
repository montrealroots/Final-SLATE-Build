// A home's exterior picture (from November 17, 2026; the package's 04-REALISM-CASES-AND-UI "Exterior illustration
// contract" and foundation 07 "Exterior-image pipeline").
//
// The picture is made from the home's design record, the same one gameplay reads: style, floors, footprint, roof,
// walls and their colors, windows, door, balconies, garage, drive, garden and outdoor features. It is checked against
// that record before it's kept (a feature drawn wrongly, or drawn that the record doesn't have, is a mismatch, and the
// picture is redrawn or refused), kept with the revision and the design's hash, and shown again from the save rather
// than remade each time the home is opened. A finished change to the outside (a repaint, a pool) is a new revision and
// a new picture; nothing else changes it.
//
// Which provider draws it: an AI image service would be one, through the provider interface below, but none is
// installed or configured in this game, and none is assumed (no key, no account). The one provider here is the game's
// own drawing from the record. It is labelled as what it is, an illustration drawn by the game: not a photograph, not
// an AI image, and never a depiction of any real address. Housing works the same with pictures switched off.
import { badDesignValue, designHash, inBuilding, type Design, type Home } from './model';
import { homesOf } from './core';
import type { GameState } from '../types';

export interface ExteriorBrief { homeId: string; revision: number; hash: string; design: Design; building: boolean; plotAreaM2: number | null; label: string }
export interface DrawResult { svg: string; drawn: Record<string, string | number | boolean | string[]> }
export interface IllustrationProvider {
  id: string;
  /** What the picture is, said with it. */
  label: string;
  available: () => boolean;
  draw: (brief: ExteriorBrief) => DrawResult;
}

const COLOR: Record<string, string> = {
  white: '#f4f1ea', cream: '#efe3c6', grey: '#a9adb3', terracotta: '#c56a4a', sage: '#a7b89a', navy: '#2f3d5c', sand: '#d8c39a', charcoal: '#3b3e44', red: '#9b3b2f', brown: '#6b4a34',
  green: '#4f6b4a', black: '#1f2023', oak: '#9a7349', yellow: '#d9b440',
};
const col = (c: string) => COLOR[c] ?? '#bbbbbb';
const WALL_TEXTURE: Record<Design['walls'], string> = { brick: 'brick', render: 'render', timber: 'timber', concrete: 'concrete', stone: 'stone', glass: 'glass' };

/** The game's own drawing, from the record: every visible field is drawn, and nothing the record doesn't have. */
export const GAME_DRAWING: IllustrationProvider = {
  id: 'slate-drawing',
  label: 'Illustration drawn by the game from the design record. Not a photograph, not an AI image, and not a depiction of any real address.',
  available: () => true,
  draw: (b) => {
    const d = b.design;
    const W = 640, H = 400, ground = 330;
    const floors = d.floors;
    const scale = Math.min(26, 420 / Math.max(8, d.widthM));
    const bw = Math.round(Math.min(440, d.widthM * scale));
    const fh = b.building ? Math.min(22, 250 / floors) : Math.min(70, 250 / floors);
    const bh = fh * floors;
    const x0 = Math.round((W - bw) / 2) - (d.garage !== 'none' ? 50 : 0);
    const top = ground - bh;
    const parts: string[] = [];
    const drawn: DrawResult['drawn'] = { floors: d.floors, roof: d.roof, roofMaterial: d.roofMaterial, roofColor: d.roofColor, walls: d.walls, wallColor: d.wallColor, windowsPerFloor: d.windowsPerFloor, windowStyle: d.windowStyle, frameColor: d.frameColor, door: d.door, doorColor: d.doorColor, balconies: 0, garage: d.garage, driveway: d.driveway, landscaping: d.landscaping, outdoor: [] as string[] };
    parts.push(`<rect width="${W}" height="${H}" fill="#dfe9f2"/><rect y="${ground}" width="${W}" height="${H - ground}" fill="${d.landscaping === 'none' ? '#b9b2a6' : '#8fb27a'}" data-feature="landscaping:${d.landscaping}"/>`);
    // The walls, with their material's texture.
    parts.push(`<rect x="${x0}" y="${top}" width="${bw}" height="${bh}" fill="${col(d.wallColor)}" stroke="#333" data-feature="walls:${d.walls}:${d.wallColor}"/>`);
    if (d.walls === 'brick') for (let y = top + 8; y < ground; y += 8) parts.push(`<line x1="${x0}" y1="${y}" x2="${x0 + bw}" y2="${y}" stroke="#00000018"/>`);
    if (d.walls === 'timber') for (let x = x0 + 10; x < x0 + bw; x += 10) parts.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${ground}" stroke="#00000020"/>`);
    if (d.walls === 'stone') for (let y = top + 12; y < ground; y += 14) parts.push(`<line x1="${x0}" y1="${y}" x2="${x0 + bw}" y2="${y}" stroke="#00000026" stroke-dasharray="9 5"/>`);
    // The roof.
    const rc = col(d.roofColor);
    if (d.roof === 'flat') parts.push(`<rect x="${x0 - 6}" y="${top - 10}" width="${bw + 12}" height="10" fill="${rc}" data-feature="roof:flat:${d.roofMaterial}:${d.roofColor}"/>`);
    else if (d.roof === 'gable') parts.push(`<polygon points="${x0 - 12},${top} ${x0 + bw / 2},${top - 70} ${x0 + bw + 12},${top}" fill="${rc}" stroke="#222" data-feature="roof:gable:${d.roofMaterial}:${d.roofColor}"/>`);
    else parts.push(`<polygon points="${x0 - 12},${top} ${x0 + bw * 0.25},${top - 55} ${x0 + bw * 0.75},${top - 55} ${x0 + bw + 12},${top}" fill="${rc}" stroke="#222" data-feature="roof:hip:${d.roofMaterial}:${d.roofColor}"/>`);
    if (d.roofMaterial === 'tile' || d.roofMaterial === 'shingle') parts.push(`<line x1="${x0}" y1="${top - 8}" x2="${x0 + bw}" y2="${top - 8}" stroke="#00000030" stroke-dasharray="6 3"/>`);
    // Windows: the record's number on every floor, in its style and frame colour. On the ground floor they share the
    // front with the door: half each side of it, so none is left out (a building's ground floor lost two of eight to the
    // door until November 17, 2026, and the checklist refused its picture).
    let windows = 0;
    const dx = x0 + bw / 2 - 14;
    const spans = (f: number): [number, number, number][] => {
      const n = d.windowsPerFloor;
      if (f > 0) return [[x0, x0 + bw, n]];
      const left = Math.floor(n / 2);
      return [[x0, dx - 4, left], [dx + 32, x0 + bw, n - left]];
    };
    for (let f = 0; f < floors; f++) {
      const y = ground - (f + 1) * fh + fh * 0.25;
      for (const [a, z, n] of spans(f)) {
        const slot = (z - a) / Math.max(1, n);
        for (let i = 0; i < n; i++) {
          const cx = a + slot * (i + 0.5);
          const ww = Math.min(d.windowStyle === 'ribbon' ? slot * 0.85 : d.windowStyle === 'picture' ? 34 : 22, slot * 0.8);
          const wh = d.windowStyle === 'ribbon' ? fh * 0.35 : fh * 0.45;
          parts.push(`<rect x="${cx - ww / 2}" y="${y}" width="${ww}" height="${wh}" fill="#b8d3e6" stroke="${col(d.frameColor)}" stroke-width="${Math.min(3, Math.max(1, wh / 6))}" data-feature="window:${d.windowStyle}:${d.frameColor}"/>`);
          if (d.windowStyle === 'sash') parts.push(`<line x1="${cx - ww / 2}" y1="${y + wh / 2}" x2="${cx + ww / 2}" y2="${y + wh / 2}" stroke="${col(d.frameColor)}" stroke-width="2"/>`);
          windows += 1;
        }
      }
    }
    drawn.windowsDrawn = windows;
    drawn.floorsDrawn = floors;
    parts.push(`<rect x="${dx}" y="${ground - 52}" width="28" height="52" fill="${col(d.doorColor)}" stroke="#222" data-feature="door:${d.door}:${d.doorColor}"/>`);
    if (d.door === 'glazed') parts.push(`<rect x="${dx + 6}" y="${ground - 46}" width="16" height="20" fill="#b8d3e6"/>`);
    if (d.door === 'panel') parts.push(`<rect x="${dx + 5}" y="${ground - 46}" width="18" height="16" fill="none" stroke="#00000055"/><rect x="${dx + 5}" y="${ground - 26}" width="18" height="16" fill="none" stroke="#00000055"/>`);
    // Balconies: every one the record has, on the floors above the ground, side by side where a floor has more than one.
    const upper = Math.max(0, floors - 1);
    const balconies = upper ? d.balconies : 0;
    for (let i = 0; i < balconies; i++) {
      const floor = i % upper, k = Math.floor(i / upper), per = Math.ceil(d.balconies / upper);
      const y = ground - (floor + 2) * fh + fh * 0.75;
      const w = (bw * 0.8) / per;
      parts.push(`<rect x="${x0 + bw * 0.1 + k * w + w * 0.1}" y="${y}" width="${w * 0.8}" height="${Math.max(2, Math.min(6, fh / 5))}" fill="#555" data-feature="balcony"/>`);
    }
    drawn.balconies = balconies;
    // Garage, drive, porch, pool, terrace, fence: only those the record has.
    if (d.garage !== 'none') {
      const gw = d.garage === 'double' ? 90 : 55;
      if (d.garage === 'carport') parts.push(`<rect x="${x0 + bw + 8}" y="${ground - 50}" width="${gw}" height="6" fill="#555" data-feature="garage:carport"/><line x1="${x0 + bw + 10}" y1="${ground - 44}" x2="${x0 + bw + 10}" y2="${ground}" stroke="#555" stroke-width="3"/><line x1="${x0 + bw + 6 + gw}" y1="${ground - 44}" x2="${x0 + bw + 6 + gw}" y2="${ground}" stroke="#555" stroke-width="3"/>`);
      else parts.push(`<rect x="${x0 + bw + 6}" y="${ground - 56}" width="${gw}" height="56" fill="${col(d.wallColor)}" stroke="#333" data-feature="garage:${d.garage}"/><rect x="${x0 + bw + 14}" y="${ground - 40}" width="${gw - 16}" height="40" fill="#cfcfcf" stroke="#777"/>`);
    }
    if (d.driveway !== 'none') parts.push(`<polygon points="${x0 + bw + 8},${ground} ${x0 + bw + 100},${ground} ${x0 + bw + 130},${H} ${x0 + bw - 10},${H}" fill="${d.driveway === 'paved' ? '#8d8d8d' : '#c9b99a'}" data-feature="driveway:${d.driveway}"/>`);
    if (d.landscaping === 'trees' || d.landscaping === 'garden') { parts.push(`<circle cx="${x0 - 50}" cy="${ground - 36}" r="30" fill="#5e8c4f" data-feature="planting:${d.landscaping}"/><rect x="${x0 - 53}" y="${ground - 10}" width="6" height="10" fill="#6b4a34"/>`); }
    if (d.landscaping === 'garden') parts.push(`<rect x="${x0 - 10}" y="${ground + 6}" width="${bw * 0.4}" height="10" fill="#c97fa0" data-feature="beds"/>`);
    const outdoor: string[] = [];
    for (const o of d.outdoor) {
      if (o === 'pool') parts.push(`<ellipse cx="${x0 + 70}" cy="${ground + 40}" rx="60" ry="14" fill="#5bb4d6" stroke="#fff" stroke-width="3" data-feature="outdoor:pool"/>`);
      if (o === 'porch') parts.push(`<rect x="${dx - 22}" y="${ground - 64}" width="72" height="8" fill="#555" data-feature="outdoor:porch"/>`);
      if (o === 'terrace') parts.push(`<rect x="${x0}" y="${ground}" width="${bw * 0.5}" height="8" fill="#b9a68a" data-feature="outdoor:terrace"/>`);
      if (o === 'fence') parts.push(`<line x1="0" y1="${ground + 2}" x2="${W}" y2="${ground + 2}" stroke="#6b4a34" stroke-width="3" stroke-dasharray="4 6" data-feature="outdoor:fence"/>`);
      outdoor.push(o);
    }
    drawn.outdoor = outdoor;
    if (d.stage) parts.push(`<rect x="${x0 - 14}" y="${top - 80}" width="${bw + 28}" height="${bh + 80}" fill="none" stroke="#e0a030" stroke-width="3" stroke-dasharray="6 4" data-feature="stage:${d.stage}"/>`);
    const title = `${b.building ? 'The building' : 'The house'}: ${d.floors} floor${d.floors > 1 ? 's' : ''}, ${d.walls} walls in ${d.wallColor}, a ${d.roof} roof`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${title}" data-revision="${b.revision}" data-hash="${b.hash}">${parts.join('')}<text x="8" y="${H - 8}" font-size="11" fill="#333">Illustration drawn by the game · revision ${b.revision}</text></svg>`;
    return { svg, drawn };
  },
};

export const PROVIDERS: IllustrationProvider[] = [GAME_DRAWING];

/** Every visible field of the record, checked against what was drawn: a missing, extra or wrong feature is a mismatch. */
export function validate(design: Design, drawn: DrawResult['drawn'], svg: string): { feature: string; ok: boolean }[] {
  const has = (tag: string) => svg.includes(`data-feature="${tag}`);
  const checks: { feature: string; ok: boolean }[] = [
    { feature: `${design.floors} floor${design.floors > 1 ? 's' : ''}`, ok: drawn.floorsDrawn === design.floors },
    { feature: `A ${design.roof} roof in ${design.roofMaterial}, ${design.roofColor}`, ok: has(`roof:${design.roof}:${design.roofMaterial}:${design.roofColor}`) },
    { feature: `${design.walls[0].toUpperCase()}${design.walls.slice(1)} walls, ${design.wallColor}`, ok: has(`walls:${design.walls}:${design.wallColor}`) },
    { feature: `${design.windowsPerFloor} ${design.windowStyle} windows a floor, ${design.frameColor} frames`, ok: drawn.windowsDrawn === design.windowsPerFloor * design.floors && has(`window:${design.windowStyle}:${design.frameColor}`) },
    { feature: `A ${design.door} door, ${design.doorColor}`, ok: has(`door:${design.door}:${design.doorColor}`) },
    { feature: design.balconies ? `${design.balconies} balcon${design.balconies > 1 ? 'ies' : 'y'}` : 'No balcony', ok: (drawn.balconies as number) === design.balconies },
    { feature: design.garage === 'none' ? 'No garage' : `${design.garage === 'carport' ? 'A carport' : `A ${design.garage} garage`}`, ok: design.garage === 'none' ? !has('garage:') : has(`garage:${design.garage}`) },
    { feature: design.driveway === 'none' ? 'No driveway' : `A ${design.driveway} driveway`, ok: design.driveway === 'none' ? !has('driveway:') : has(`driveway:${design.driveway}`) },
    { feature: `Landscaping: ${design.landscaping}`, ok: has(`landscaping:${design.landscaping}`) },
    ...(['pool', 'porch', 'terrace', 'fence'] as const).map((o) => ({ feature: design.outdoor.includes(o) ? `A ${o}` : `No ${o}`, ok: design.outdoor.includes(o) === has(`outdoor:${o}`) })),
  ];
  void WALL_TEXTURE;
  return checks;
}

export function briefOf(home: Home): ExteriorBrief {
  return { homeId: home.id, revision: home.design.revision, hash: designHash(home.design), design: home.design, building: inBuilding(home.form), plotAreaM2: home.plotAreaM2, label: home.title };
}

/**
 * The picture for a home's current revision: the kept one if it's for this revision and design, else drawn, checked
 * and kept (for a home in the save; an offer's is drawn when shown and not kept). A mismatch is redrawn once, then
 * refused with what didn't match, and the home shows no picture rather than a wrong one.
 */
export function exteriorFor(state: GameState | null, home: Home, provider: IllustrationProvider = GAME_DRAWING): { svg: string | null; label: string; checklist: { feature: string; ok: boolean }[]; fromCache: boolean; refused?: string } {
  const pinned = state ? homesOf(state).homes[home.id] === home : false;
  const kept = pinned ? homesOf(state!).images[home.id] : undefined;
  const brief = briefOf(home);
  if (kept && kept.revision === brief.revision && kept.hash === brief.hash) return { svg: kept.svg, label: kept.label, checklist: kept.checklist, fromCache: true };
  // Only the design's own choices are drawn: a record with anything else (a save edited by hand) gets no picture.
  const bad = badDesignValue(home.design);
  if (bad) return { svg: null, label: provider.label, checklist: [], fromCache: false, refused: `No picture: ${bad}` };
  if (!provider.available()) return { svg: null, label: 'No picture: the illustration provider is unavailable. The home is unaffected.', checklist: [], fromCache: false };
  let attempts = 0;
  let last: { svg: string; checklist: { feature: string; ok: boolean }[] } | null = null;
  while (attempts < 2) {
    attempts += 1;
    const r = provider.draw(brief);
    const checklist = validate(brief.design, r.drawn, r.svg);
    last = { svg: r.svg, checklist };
    if (checklist.every((c) => c.ok)) {
      if (pinned) homesOf(state!).images[home.id] = { homeId: home.id, revision: brief.revision, hash: brief.hash, provider: provider.id, label: provider.label, acceptedAt: state!.now, checklist, svg: r.svg, attempts };
      return { svg: r.svg, label: provider.label, checklist, fromCache: false };
    }
  }
  const wrong = last!.checklist.filter((c) => !c.ok).map((c) => c.feature);
  return { svg: null, label: provider.label, checklist: last!.checklist, fromCache: false, refused: `The picture didn't match the design (${wrong.join('; ')}), so it isn't shown.` };
}

/** Keep the accepted picture of a home in the save for its current revision (the page asks once when it shows one). */
export function keepExterior(state: GameState, homeId: string): void {
  const home = homesOf(state).homes[homeId];
  if (home) exteriorFor(state, home);
}
