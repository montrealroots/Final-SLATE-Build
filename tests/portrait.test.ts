// Ported from 1221's tests/portrait.test.ts with the headshot code (November 8, 2026); only the import path changed.
/**
 * Making any photo fit.
 *
 * A player brings whatever they have — a nine-thousand-pixel phone picture, a
 * tiny avatar, a wide landscape, a tall portrait, a one-pixel sliver. All of
 * them have to come out as the same headshot shape with no empty space at the
 * edges. That is arithmetic, so it is tested rather than eyeballed.
 */

import { describe, expect, it } from 'vitest';
import {
  CENTRED, MAX_UPLOAD_BYTES, MAX_ZOOM, PORTRAIT_HEIGHT, PORTRAIT_WIDTH,
  clampPlacement, coverScale, dataUrlBytes, describeRejection, drawRect, slack,
} from '../src/ui/portrait';

/** Every shape of photo somebody might realistically hand it. */
const SOURCES: [string, number, number][] = [
  ['a phone photo, portrait', 3024, 4032],
  ['a phone photo, landscape', 4032, 3024],
  ['a DSLR headshot', 4000, 5000],
  ['an ultra-wide panorama', 9000, 1200],
  ['a tall banner', 800, 6000],
  ['a small square avatar', 64, 64],
  ['a huge square', 8000, 8000],
  ['exactly the frame', PORTRAIT_WIDTH, PORTRAIT_HEIGHT],
  ['one pixel', 1, 1],
  ['a single-pixel sliver', 1, 4000],
];

describe('any photo covers the frame', () => {
  for (const [what, w, h] of SOURCES) {
    it(`covers it with ${what} (${w}x${h})`, () => {
      const rect = drawRect(w, h);

      // Never smaller than the frame in either direction, so no empty edges.
      expect(rect.width, 'too narrow').toBeGreaterThanOrEqual(PORTRAIT_WIDTH - 0.001);
      expect(rect.height, 'too short').toBeGreaterThanOrEqual(PORTRAIT_HEIGHT - 0.001);

      // And it actually overlaps the frame rather than sitting beside it.
      expect(rect.x).toBeLessThanOrEqual(0.001);
      expect(rect.y).toBeLessThanOrEqual(0.001);
      expect(rect.x + rect.width).toBeGreaterThanOrEqual(PORTRAIT_WIDTH - 0.001);
      expect(rect.y + rect.height).toBeGreaterThanOrEqual(PORTRAIT_HEIGHT - 0.001);
    });
  }

  it('keeps the photo covering the frame however it is zoomed and dragged', () => {
    for (const [what, w, h] of SOURCES) {
      for (const zoom of [1, 1.5, 2.7, MAX_ZOOM]) {
        for (const offsetX of [-1, -0.4, 0, 0.6, 1]) {
          for (const offsetY of [-1, 0, 1]) {
            const rect = drawRect(w, h, { zoom, offsetX, offsetY });
            const label = `${what} at zoom ${zoom}, offset ${offsetX}/${offsetY}`;
            expect(rect.x, label).toBeLessThanOrEqual(0.001);
            expect(rect.y, label).toBeLessThanOrEqual(0.001);
            expect(rect.x + rect.width, label).toBeGreaterThanOrEqual(PORTRAIT_WIDTH - 0.001);
            expect(rect.y + rect.height, label).toBeGreaterThanOrEqual(PORTRAIT_HEIGHT - 0.001);
          }
        }
      }
    }
  });

  it('never distorts the photo', () => {
    for (const [what, w, h] of SOURCES) {
      const rect = drawRect(w, h, { zoom: 2.2, offsetX: 0.3, offsetY: -0.7 });
      expect(rect.width / rect.height, `${what} was stretched`).toBeCloseTo(w / h, 5);
    }
  });
});

describe('the fit itself', () => {
  it('scales by whichever side needs the most to cover', () => {
    // Wider than the frame: height is the binding side.
    expect(coverScale(1000, 500)).toBeCloseTo(PORTRAIT_HEIGHT / 500, 6);
    // Taller than the frame: width binds.
    expect(coverScale(500, 5000)).toBeCloseTo(PORTRAIT_WIDTH / 500, 6);
    // Exactly the frame: no scaling at all.
    expect(coverScale(PORTRAIT_WIDTH, PORTRAIT_HEIGHT)).toBeCloseTo(1, 6);
  });

  it('gives the short side no room to move at rest', () => {
    // A photo the frame's own shape has nowhere to slide.
    const square = slack(PORTRAIT_WIDTH, PORTRAIT_HEIGHT, CENTRED);
    expect(square.x).toBeCloseTo(0, 6);
    expect(square.y).toBeCloseTo(0, 6);

    // A wide one can slide sideways but not vertically.
    const wide = slack(4000, 1000, CENTRED);
    expect(wide.x).toBeGreaterThan(0);
    expect(wide.y).toBeCloseTo(0, 6);
  });

  it('gives room in both directions once zoomed in', () => {
    const room = slack(PORTRAIT_WIDTH, PORTRAIT_HEIGHT, { zoom: 2, offsetX: 0, offsetY: 0 });
    expect(room.x).toBeGreaterThan(0);
    expect(room.y).toBeGreaterThan(0);
  });

  it('survives nonsense dimensions rather than producing nonsense', () => {
    // A decode that went wrong can report any of these. None of them may
    // become a NaN rectangle that silently draws nothing.
    for (const [w, h] of [
      [0, 0], [-100, 200], [Number.NaN, 500], [500, Number.NaN],
      [Number.POSITIVE_INFINITY, 500], [500, Number.NEGATIVE_INFINITY],
    ]) {
      const rect = drawRect(w as number, h as number);
      const label = `${w}x${h}`;
      expect(Number.isFinite(rect.x), label).toBe(true);
      expect(Number.isFinite(rect.y), label).toBe(true);
      expect(Number.isFinite(rect.width), label).toBe(true);
      expect(Number.isFinite(rect.height), label).toBe(true);
      // And it still fills the frame rather than collapsing.
      expect(rect.width, label).toBeGreaterThanOrEqual(PORTRAIT_WIDTH - 0.001);
      expect(rect.height, label).toBeGreaterThanOrEqual(PORTRAIT_HEIGHT - 0.001);
    }
  });
});

describe('placement is kept sane', () => {
  it('will not zoom out past the fit, or in past the limit', () => {
    expect(clampPlacement({ zoom: 0.1, offsetX: 0, offsetY: 0 }).zoom).toBe(1);
    expect(clampPlacement({ zoom: 99, offsetX: 0, offsetY: 0 }).zoom).toBe(MAX_ZOOM);
  });

  it('will not let the photo be dragged off the frame', () => {
    const p = clampPlacement({ zoom: 2, offsetX: 8, offsetY: -8 });
    expect(p.offsetX).toBe(1);
    expect(p.offsetY).toBe(-1);
  });

  it('repairs a placement that is not numbers at all', () => {
    const p = clampPlacement({ zoom: Number.NaN, offsetX: Number.POSITIVE_INFINITY, offsetY: Number.NaN });
    expect(p).toEqual(CENTRED);
  });
});

describe('what it refuses, and why', () => {
  it('accepts the formats a browser can actually re-encode', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(describeRejection({ type, size: 2_000_000, name: 'headshot' })).toBeNull();
    }
  });

  it('explains a refusal instead of just failing', () => {
    expect(describeRejection({ type: 'application/pdf', size: 100, name: 'resume.pdf' }))
      .toMatch(/n[o’]t an image/);
    expect(describeRejection({ type: 'image/tiff', size: 100, name: 'scan.tiff' }))
      .toMatch(/n[o’]t supported/);
    expect(describeRejection({ type: 'image/jpeg', size: MAX_UPLOAD_BYTES + 1, name: 'huge.jpg' }))
      .toMatch(/over the \d+MB limit/);
    expect(describeRejection({ type: 'image/png', size: 0, name: 'empty.png' }))
      .toMatch(/empty/);
  });
});

describe('measuring what gets stored', () => {
  it('reads the real size out of a data url', () => {
    // 'hello' is aGVsbG8= — five bytes with one of padding.
    expect(dataUrlBytes('data:image/jpeg;base64,aGVsbG8=')).toBe(5);
    expect(dataUrlBytes('not a data url')).toBe(0);
  });
});
