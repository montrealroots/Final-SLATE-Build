// Which followed studio makes an offer, over many worlds (the Creative Depth package, 06-TESTING-AND-DELIVERY.md,
// "studio offer concentration"). One hundred seeds, five kinds of film, forty offers each: twenty thousand draws. The
// thresholds were written before the first run, as design expectations, and are not fitted to it:
//   1. about half of offers come from a followed studio (45% to 55%);
//   2. over all kinds together, no one studio makes more than 60% of the studios' offers;
//   3. for each kind, the studio whose record is nearest makes the most;
//   4. a studio never makes an offer for work its medium rules out;
// The first run failed 3: the label with a thin record made more drama offers than the drama label, and 36% of all
// offers. The rule was changed (strategy.ts fitWeight), not the thresholds. One check was added for the fault that run
// showed, and it is not a threshold chosen beforehand:
//   5. a studio with a thin record makes some offers of every kind, and the most of none.
// The distribution is written to docs/creative-depth/OFFER-CONCENTRATION.json when SLATE_WRITE_AUDIT=1. Every studio is
// a made-up fixture.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fitWeight } from '../src/engine/strategy';
import { careerStudio, type StudioProfile } from '../src/engine/studios';
import type { Medium } from '../src/engine/types';
import { startLife } from './helpers';

const EVEN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
const STUDIOS: StudioProfile[] = [
  { c: 'company:fixture-horror', name: 'Night Shift Pictures (Fixture)', n: 5, g: [['Horror', 10], ['Thriller', 6], ['Drama', 2]], m: EVEN, ann: {} },
  { c: 'company:fixture-animation', name: 'Lantern Animation (Fixture)', n: 12, g: [['Animation', 9], ['Family', 9], ['Comedy', 6]], m: EVEN, ann: {} },
  { c: 'company:fixture-family', name: 'Sunday Matinee (Fixture)', n: 4, g: [['Family', 8], ['Comedy', 8], ['Romance', 4]], m: EVEN, ann: {} },
  { c: 'company:fixture-drama', name: 'Long Room Films (Fixture)', n: 3, g: [['Drama', 12], ['History', 4], ['Documentary', 2], ['Romance', 3]], m: EVEN, ann: {} },
  { c: 'company:fixture-tiny', name: 'Two Desks (Fixture)', n: 0.5, g: [['Drama', 2]], m: EVEN, ann: {} },
];
const KINDS: { name: string; families: string[]; medium: Medium; nearest: string }[] = [
  { name: 'a horror film', families: ['horror'], medium: 'live-action', nearest: 'Night Shift Pictures (Fixture)' },
  { name: 'an animated family film', families: ['family', 'animation'], medium: 'animation', nearest: 'Lantern Animation (Fixture)' },
  { name: 'a live-action comedy', families: ['comedy'], medium: 'live-action', nearest: 'Sunday Matinee (Fixture)' },
  { name: 'a drama', families: ['drama'], medium: 'live-action', nearest: 'Long Room Films (Fixture)' },
  { name: 'a documentary', families: ['documentary'], medium: 'live-action', nearest: 'Long Room Films (Fixture)' },
];
const SEEDS = 100;
const OFFERS = 40;
const FILE = 'docs/creative-depth/OFFER-CONCENTRATION.json';

describe('which studio makes an offer, over a hundred worlds', () => {
  it('is spread by fit and never by size, within thresholds set before the run', () => {
    const byKind: Record<string, Record<string, number>> = {};
    let studio = 0;
    let all = 0;
    for (let i = 0; i < SEEDS; i++) {
      const s = startLife(`offers-${i}`);
      s.industry = { horizon: '2026-11-10', builtAt: '2026-11-10T00:00:00Z', series: {}, studios: STUDIOS };
      for (const k of KINDS) {
        const counts = (byKind[k.name] ??= {});
        for (let j = 0; j < OFFERS; j++) {
          const who = careerStudio(s, `offer:${k.name}:${j}`, (x) => fitWeight(x, k.families, k.medium));
          all += 1;
          if (who) { studio += 1; counts[who] = (counts[who] ?? 0) + 1; }
        }
      }
    }
    const total: Record<string, number> = {};
    for (const counts of Object.values(byKind)) for (const [who, n] of Object.entries(counts)) total[who] = (total[who] ?? 0) + n;
    const share = (n: number, of: number) => Math.round((n / of) * 1000) / 10;
    const report = {
      seeds: SEEDS, offersEachKind: OFFERS, draws: all, fromAStudio: share(studio, all),
      overall: Object.fromEntries(Object.entries(total).sort((a, b) => b[1] - a[1]).map(([who, n]) => [who, share(n, studio)])),
      byKind: Object.fromEntries(KINDS.map((k) => [k.name, Object.fromEntries(Object.entries(byKind[k.name]).sort((a, b) => b[1] - a[1]).map(([who, n]) => [who, share(n, Object.values(byKind[k.name]).reduce((a, x) => a + x, 0))]))])),
    };
    if (process.env.SLATE_WRITE_AUDIT === '1') writeFileSync(FILE, `${JSON.stringify(report, null, 1)}\n`);
    // 1. About half from a studio.
    expect(report.fromAStudio).toBeGreaterThanOrEqual(45);
    expect(report.fromAStudio).toBeLessThanOrEqual(55);
    // 2. No studio above 60% of the studios' offers over all kinds, the busiest one included.
    expect(Math.max(...Object.values(report.overall))).toBeLessThanOrEqual(60);
    // 3. The nearest record makes the most for each kind.
    for (const k of KINDS) expect(Object.keys(report.byKind[k.name])[0], k.name).toBe(k.nearest);
    // 4. Nothing its medium rules out: the animation house makes no live-action offer, and the others no animated one.
    for (const k of KINDS) {
      const who = Object.keys(byKind[k.name]);
      if (k.medium === 'animation') expect(who.filter((w) => !['Lantern Animation (Fixture)', 'Two Desks (Fixture)'].includes(w)), k.name).toEqual([]);
      else expect(who, k.name).not.toContain('Lantern Animation (Fixture)');
    }
    // 5. The thin label is there for every kind, and never the bulk of any.
    for (const k of KINDS) { expect(report.byKind[k.name]['Two Desks (Fixture)'], k.name).toBeGreaterThan(0); expect(Object.keys(report.byKind[k.name])[0], k.name).not.toBe('Two Desks (Fixture)'); }
    // The committed distribution is this run's.
    expect(existsSync(FILE), `${FILE} is missing: run with SLATE_WRITE_AUDIT=1`).toBe(true);
    expect(JSON.parse(readFileSync(FILE, 'utf8'))).toEqual(report);
  }, 120_000);
});
