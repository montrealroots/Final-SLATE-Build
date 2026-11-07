// World map arithmetic, adapted from SLATE-REBUILD (Natural Earth 1:110m outlines, public domain). The projection is
// equirectangular: a way to point at places, not a claim about area. Nothing in the simulation reads map positions;
// travel distance comes from coordinates.

import mapUrl from './world-map.json?url';

export interface Box { x: number; y: number; width: number; height: number }
export interface WorldMapData { width: number; height: number; countries: Record<string, string>; bounds: Record<string, [number, number, number, number]> }

export function projectPoint(lat: number, lon: number, s: { width: number; height: number }): { x: number; y: number } {
  const la = Math.max(-90, Math.min(90, lat));
  const lo = ((((lon + 180) % 360) + 360) % 360) - 180;
  return { x: ((lo + 180) / 360) * s.width, y: ((90 - la) / 180) * s.height };
}

/** A view of a box at the surface's shape: padded, never smaller than a floor, never larger than the world, kept inside it. */
export function frameBox(t: Box, s: { width: number; height: number }, padding = 0.25, minWidth = s.width * 0.06): Box {
  const aspect = s.width / s.height;
  const cx = t.x + t.width / 2;
  const cy = t.y + t.height / 2;
  let width = Math.max(t.width * (1 + padding * 2), minWidth);
  let height = Math.max(t.height * (1 + padding * 2), minWidth / aspect);
  if (width / height < aspect) width = height * aspect;
  else height = width / aspect;
  if (width > s.width) { width = s.width; height = width / aspect; }
  return { x: Math.max(0, Math.min(s.width - width, cx - width / 2)), y: Math.max(0, Math.min(s.height - height, cy - height / 2)), width, height };
}

/** The smallest box around a set of points. */
export function boxAround(points: readonly { x: number; y: number }[]): Box | null {
  if (!points.length) return null;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}

export const viewBoxOf = (b: Box): string => [b.x, b.y, b.width, b.height].map((n) => Number(n.toFixed(2))).join(' ');
/** Hairline borders and same-size markers at any zoom. */
export const strokeAt = (v: Box, s: { width: number }): number => Math.max(0.25, 1.4 / (s.width / Math.max(v.width, 1)));
export const markerRadiusAt = (v: Box, s: { width: number }): number => Math.max(1.2, 9 / (s.width / Math.max(v.width, 1)));

/** The line under every map, shown while it loads too so nothing below it moves when the map arrives. */
export const MAP_CREDIT = "Outlines: Natural Earth. Small countries and territories that can't be drawn at this scale are still in the list.";

let pending: Promise<WorldMapData> | undefined;
/** The outlines, fetched once when a map is first shown; a failed fetch is tried again next time. */
export function loadMap(): Promise<WorldMapData> {
  if (!pending) {
    pending = fetch(mapUrl).then((r) => {
      if (!r.ok) throw new Error(`Couldn't load the map (${r.status}).`);
      return r.json() as Promise<WorldMapData>;
    });
    pending.catch(() => { pending = undefined; });
  }
  return pending;
}
