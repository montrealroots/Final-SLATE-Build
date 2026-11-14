// A long run of the world (the owner's v6 package, J19, "no unbounded event growth"; from November 13, 2026). Ten years of
// days, the world left to itself: the queue of pending events rises and falls with the seasons and doesn't climb year on
// year, and the save grows by about the same each year rather than faster. Measured: 253 to 373 events across six years,
// and about 37 KB of save a year.
import { describe, expect, it } from 'vitest';
import { approve, buildProject, startLife } from './helpers';
import { planRelease } from '../src/engine/finish';
import { standings } from '../src/engine/reputation';
import { addDaysToKey, dateKey } from '../src/engine/time';
import { deserialize } from '../src/engine/save';
import { processUntil } from './engine-api';
import { serialize } from '../src/engine/save';

const DAY = 86_400_000;

describe('ten years of the world', () => {
  it('keeps the event queue bounded and the save growing evenly', () => {
    const s = startLife('long-run');
    const events: number[] = [];
    const size: number[] = [];
    for (let y = 0; y < 10; y++) {
      for (let d = 0; d < 365; d++) processUntil(s, s.now + DAY, 'tick', 100_000);
      events.push(s.events.length);
      size.push(serialize(s).length);
    }
    // The same day each year: no more pending than in the second year, give or take a tenth.
    for (const n of events.slice(2)) expect(n).toBeLessThanOrEqual(Math.ceil(events[1] * 1.1));
    // Each later year adds no more to the save than the second did, give or take a quarter.
    const growth = size.slice(1).map((n, i) => n - size[i]);
    for (const g of growth.slice(2)) expect(g).toBeLessThanOrEqual(growth[1] * 1.25);
  }, 120_000);

  it('three years of the player\'s own releases: each released once, each counted once, the queue still bounded', () => {
    const s = startLife('long-run-career');
    const zone = 'Europe/London';
    const day = () => processUntil(s, s.now + DAY, 'tick', 100_000);
    for (let y = 0; y < 3; y++) {
      const p = buildProject(s, { title: `Year ${y + 1}`, format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 3 }]);
      approve(s, p);
      // Labelled fixture: made and delivered, written and directed by the player, received well.
      p.delivered = { at: s.now, runtimeMin: 8 };
      p.phase = 'delivered';
      p.quality = { script: 70, direction: 70, reception: 70 } as never;
      for (const e of p.episodes) { e.writer = 'player'; e.director = 'player'; }
      planRelease(s, p, { route: 'digital', date: addDaysToKey(dateKey(s.now, zone), 7), territories: ['GB'] });
      for (let d = 0; d < 365; d++) day();
    }
    const mine = s.projects.filter((p) => /^Year \d$/.test(p.title));
    expect(mine.map((p) => p.releases.filter((r) => r.status === 'released').length)).toEqual([1, 1, 1]);
    const writing = standings(s).find((x) => x.role === 'writing')!;
    expect(writing.works).toBe(3);
    expect(standings(deserialize(serialize(s)))).toEqual(standings(s)); // read again, the same: nothing counted twice
    // The queue holds what is still to come, not every release ever made: under 500, where the world alone ranges 253 to 373.
    expect(s.events.length).toBeLessThan(500);
  }, 120_000);
});

