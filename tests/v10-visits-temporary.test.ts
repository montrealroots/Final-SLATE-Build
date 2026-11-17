// Visit rules that end on a date (src/data/papers/visits-temporary.json; from November 17, 2026). Until then the game
// applied China's unilateral visa-free list, Korea's K-ETA exemption and Brazil's waiver for Chinese passports for ever,
// though each ends on 31 December 2026 (Russia's in China a year later). Each case changes only the day and reads the
// outcome.
import { describe, expect, it } from 'vitest';
import { entryRight } from '../src/engine/papers';
import { startLife } from './helpers';
import type { GameState } from '../src/engine/types';
import TEMP from '../src/data/papers/visits-temporary.json';

/** A life in London on the given passport (labelled fixture), on the given day at noon UTC. */
function on(passport: string, day: string): GameState {
  const s = startLife(`visits-temp-${passport}`, 'gb-london', { nationalities: [passport, 'GB'].filter((x, i, a) => a.indexOf(x) === i) });
  s.now = Date.parse(`${day}T12:00:00Z`);
  return s;
}
// A British passport only: GB is the fixture's own, so a life with a British passport and no other.
const british = (day: string) => { const s = on('GB', day); return s; };

describe('a visit rule that ends on a date', () => {
  it("China's unilateral list: a British passport enters without a visa through 31 December 2026, and needs one after", () => {
    expect(entryRight(british('2026-12-31'), 'CN')).toMatchObject({ kind: 'free', days: 30 });
    expect(entryRight(british('2027-01-01'), 'CN')).toMatchObject({ kind: 'needs', entry: 'visa' });
  });

  it("a mutual agreement doesn't end: a Singaporean passport enters China without a visa in 2027 too", () => {
    const s = startLife('visits-temp-sg', 'gb-london', { nationalities: ['SG'] });
    s.now = Date.parse('2027-06-01T12:00:00Z');
    expect(entryRight(s, 'CN')).toMatchObject({ kind: 'free' });
  });

  it("Korea's K-ETA exemption: free in 2026, a K-ETA from 2027", () => {
    expect(entryRight(british('2026-12-31'), 'KR')).toMatchObject({ kind: 'free', days: 90 });
    expect(entryRight(british('2027-01-01'), 'KR')).toMatchObject({ kind: 'needs', entry: 'eta', days: 90 });
  });

  it("Brazil's waiver for Chinese passports ends with 2026; Russia's in China a year later", () => {
    const cn = (day: string) => { const s = startLife('visits-temp-cn', 'gb-london', { nationalities: ['CN'] }); s.now = Date.parse(`${day}T12:00:00Z`); return s; };
    expect(entryRight(cn('2026-06-01'), 'BR')).toMatchObject({ kind: 'free', days: 30 });
    expect(entryRight(cn('2027-01-01'), 'BR')).toMatchObject({ kind: 'needs', entry: 'visa' });
    const ru = (day: string) => { const s = startLife('visits-temp-ru', 'gb-london', { nationalities: ['RU'] }); s.now = Date.parse(`${day}T12:00:00Z`); return s; };
    expect(entryRight(ru('2027-12-31'), 'CN')).toMatchObject({ kind: 'free' });
    expect(entryRight(ru('2028-01-01'), 'CN')).toMatchObject({ kind: 'needs', entry: 'visa' });
  });

  it('every temporary rule names its source and a date, and lists only passports the record gives that destination', () => {
    for (const r of TEMP.rules) {
      expect(r.until, r.destination).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.source.url, r.destination).toMatch(/^https:\/\//);
      expect(r.passports.length, r.destination).toBeGreaterThan(0);
    }
    // China's unilateral list is the 45 countries, Sweden, Canada and the United Kingdom.
    expect(TEMP.rules.find((r) => r.destination === 'CN' && r.until === '2026-12-31')!.passports).toHaveLength(48);
  });
});
