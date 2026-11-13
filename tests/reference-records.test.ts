// The v7 package's camera and composer records (src/engine/reference-records.ts): a mode, not a model, decides capture;
// a missing price is not free; a credit is identity, not a fee or availability.
import { describe, expect, it } from 'vitest';
import { CAMERAS, COMPOSER_CREDITS, captureFeasible, scoredBy } from '../src/engine/reference-records';

const cam = (id: string) => CAMERAS.find((x) => x.id === id)!;
describe('reference records', () => {
  it('decide capture by recording mode, never by combining maxima', () => {
    expect(captureFeasible(cam('camera:bmpcc6kpro'), { width: 6144, height: 3456, max_fps: 50 })).toBe('yes');
    expect(captureFeasible(cam('camera:bmpcc6kpro'), { width: 6144, height: 3456, max_fps: 60 })).toBe('unknown'); // higher rates use other formats, not recorded here
    expect(captureFeasible(cam('camera:bmpcc6kpro'), { width: 8192, height: 4320, max_fps: 60 })).toBe('no');
    expect(captureFeasible(cam('camera:fx3'), { width: 3840, height: 2160, max_fps: 120 })).toBe('yes');
    expect(captureFeasible(cam('camera:alexa35'), { width: 3840, height: 2160, max_fps: 24 })).toBe('unknown'); // its modes weren't recorded
    for (const c of CAMERAS) { expect(c.price).toBeNull(); expect(c.source.url).toMatch(/^https:\/\//); }
  });
  it('link composers to works and nothing more', () => {
    expect(scoredBy('Max Richter')).toEqual(['Hamnet']);
    for (const c of COMPOSER_CREDITS) { expect([c.fee, c.availability]).toEqual([null, null]); expect(c.source.checked).toBe('2026-11-13'); }
  });
});
