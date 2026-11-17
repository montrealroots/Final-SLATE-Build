// US prices and rents from each place's own Census figures, moved by FHFA's index (the owner's request of November 17,
// 2026). Each test changes an input (the place, the day) and checks the outcome moves with it, not only the words.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { findPlace, getPlace, registerPlace } from '../src/data/places';
import { marketEvidence, offersIn, priceTrend } from '../src/engine/homes/market';

const FORT_WORTH = 'gn:4691930';
const fhfa = JSON.parse(readFileSync('src/data/homes/fhfa.json', 'utf8')) as { series: Record<string, { from: [number, number]; index: number[] }> };
const idx = (code: string, y: number, q: number) => { const s = fhfa.series[code]; return s.index[y * 4 + q - 1 - (s.from[0] * 4 + s.from[1] - 1)]; };
const avg = (code: string, y: number) => [1, 2, 3, 4].reduce((a, q) => a + idx(code, y, q), 0) / 4;
const HOME_M2 = 1800 * 0.092903;
const place = (id: string, name: string, region: string) => { if (!findPlace(id)) registerPlace({ ...getPlace('us-austin'), id, name, region, geonameId: id.slice(3) }); };

describe('US homes from Census figures', () => {
  place(FORT_WORTH, 'Fort Worth', 'Texas');
  place('gn:5110302', 'Brooklyn', 'New York');
  place('gn:4705191', 'Lancaster', 'Texas');

  it("prices Fort Worth from its own median value, moved by its metro division's index to the latest quarter published", async () => {
    const ev = await marketEvidence(FORT_WORTH, '2026-11-17');
    expect(ev.sale?.evidence.sourceId).toBe('US-ACS-2024');
    expect(ev.sale?.scope).toBe('place');
    // 2026 Q2 is the latest published by November (Q3 only from December 1), over the 2024 average.
    const factor = idx('23104', 2026, 2) / avg('23104', 2024);
    expect(ev.sale?.houseM2).toBe(Math.round((303000 * 100 * factor) / HOME_M2));
    expect(ev.sale?.evidence.says).toContain('Fort Worth city, Texas');
    expect(ev.sale?.evidence.says).toContain('Fort Worth-Arlington-Grapevine, TX (MSAD)');
    // Its rents are its own, by bedrooms.
    expect(ev.rent?.evidence.sourceId).toBe('US-ACS-2024');
    expect(ev.rent?.byBedrooms).toEqual([137500, 125200, 148300, 182300]);
  });

  it('moves the price with each quarter FHFA publishes, and only from when it is published', async () => {
    const aug = await marketEvidence(FORT_WORTH, '2026-08-31');
    const sep = await marketEvidence(FORT_WORTH, '2026-09-01');
    expect(aug.sale!.houseM2! / sep.sale!.houseM2!).toBeCloseTo(idx('23104', 2026, 1) / idx('23104', 2026, 2), 4); // whole cents
    const t = await priceTrend('48439', 'TX', '2024', '2026-09-01');
    expect(t.quarter).toBe('2026 Q2');
    expect((await priceTrend('48439', 'TX', '2024', '2026-08-31')).quarter).toBe('2026 Q1');
    // The homes on sale move with it: the same home's price follows the index.
    const before = offersIn(7, aug, '2026-08-31').filter((h) => h.market === 'sale' && h.form !== 'land');
    const after = new Map(offersIn(7, sep, '2026-09-01').map((h) => [h.id, h.priceMinor]));
    const both = before.filter((h) => after.has(h.id));
    expect(both.length).toBeGreaterThan(0);
    expect(both.some((h) => after.get(h.id) !== h.priceMinor)).toBe(true);
  });

  it('uses only the Census release published by the game day, and says when a figure came later', async () => {
    const early = await marketEvidence(FORT_WORTH, '2025-06-01');
    expect(early.sale?.evidence.sourceId).toBe('US-ACS-2023');
    expect(early.rent?.byBedrooms).toEqual([131000, 119100, 139300, 172100]);
    expect(early.sale?.evidence.retrospective).toBeUndefined();
    const before = await marketEvidence(FORT_WORTH, '2020-03-02');
    expect(before.sale?.evidence.retrospective).toBe(true);
    // In March 2020 the latest quarter published was 2019 Q4: the price is the 2023 median taken back by the index.
    expect(before.sale?.houseM2).toBe(Math.round((277300 * 100 * (idx('23104', 2019, 4) / avg('23104', 2023))) / HOME_M2));
  });

  it("falls back to the county's median where the place has none of its own, and says so", async () => {
    const ev = await marketEvidence('gn:5110302', '2026-11-17');
    expect(ev.sale?.scope).toBe('county');
    expect(ev.sale?.evidence.says).toContain('Kings County, New York');
    expect(ev.sale?.evidence.says).toContain('as Brooklyn has no figure of its own');
  });

  it('keeps HUD county rents where the place has a value but no rent figure good enough, as Lancaster, Texas', async () => {
    const ev = await marketEvidence('gn:4705191', '2026-11-17');
    expect(ev.sale?.evidence.sourceId).toBe('US-ACS-2024');
    expect(ev.sale?.scope).toBe('place');
    expect(ev.rent?.evidence.sourceId).toBe('US-HUD');
  });

  it("keeps NAHB's national average where neither the place nor a county has a Census figure", async () => {
    place('gn:999999901', 'Nowhere In Particular', '');
    const ev = await marketEvidence('gn:999999901', '2026-11-17');
    expect(ev.sale?.evidence.sourceId).toBe('US-NAHB');
  });
});
