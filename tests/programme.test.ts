// What cinemas show (src/world/programme.ts): the catalog's films in their run where they opened, the player's theatrical
// releases in their territories, and a fixed simulated booking per cinema.
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Cinema } from '../src/world/cinemas';
import { BOOKED, SCREENS, draw, inCinemas, openingSoon, programme, yourShare, type Opening } from '../src/world/programme';
import type { GameState, Project } from '../src/engine/types';

const cinema = (id: string, x: Partial<Cinema> = {}): Cinema => ({ id, name: id, lat: 51.5, lon: -0.1, opened: null, closed: null, state: null, seats: null, operator: null, in: null, site: 'https://cinema.example', ...x });
const OPENINGS: Opening[] = [
  ['movie:1', 'Wide (Fixture)', 'GB', '2026-01-02', 0],
  ['movie:2', 'Limited (Fixture)', 'GB', '2026-01-02', 1],
  ['movie:3', 'Elsewhere (Fixture)', 'FR', '2026-01-02', 0],
  ['movie:4', 'Soon (Fixture)', 'GB', '2026-01-10', 0],
];
const yours = (releases: Project['releases'], reception?: number) => ({ projects: [{ id: 'p1', title: 'Your Film', releases, quality: reception === undefined ? null : { reception } } as unknown as Project] }) as Pick<GameState, 'projects'>;
const release = (x: Partial<Project['releases'][number]>) => ({ id: 'r1', route: 'theatrical', date: '2026-01-05', territories: ['GB'], distributor: null, note: '', status: 'planned', ...x }) as Project['releases'][number];

describe('films in their run', () => {
  it('plays a film in the country it opened in, from that day, for a wide or a limited run', () => {
    expect(inCinemas(OPENINGS, null, 'GB', '2026-01-01')).toEqual([]);
    expect(inCinemas(OPENINGS, null, 'GB', '2026-01-02').map((s) => s.title)).toEqual(['Limited (Fixture)', 'Wide (Fixture)']);
    expect(inCinemas(OPENINGS, null, 'GB', '2026-01-30').map((s) => s.title)).toEqual(['Soon (Fixture)', 'Wide (Fixture)']); // the limited run's 28 days are over
    expect(inCinemas(OPENINGS, null, 'GB', '2026-02-27').map((s) => s.ref)).not.toContain('movie:1'); // and the wide run's 56
    expect(inCinemas(OPENINGS, null, 'FR', '2026-01-05').map((s) => s.title)).toEqual(['Elsewhere (Fixture)']);
    expect(openingSoon(OPENINGS, 'GB', '2026-01-02').map((o) => o[1])).toEqual(['Soon (Fixture)']);
  });

  it('plays the player\'s theatrical release as the release system has it: released, in its territories, for its run', () => {
    const out = release({ status: 'released' });
    expect(inCinemas([], yours([out]), 'GB', '2026-01-04')).toEqual([]);
    expect(inCinemas([], yours([out]), 'GB', '2026-01-05')).toMatchObject([{ title: 'Your Film', projectId: 'p1' }]);
    expect(inCinemas([], yours([out]), 'GB', '2026-03-01')).toMatchObject([{ title: 'Your Film' }]); // day 55 of 56
    expect(inCinemas([], yours([out]), 'GB', '2026-03-02')).toEqual([]); // the run is over
    expect(inCinemas([], yours([out]), 'FR', '2026-01-05')).toEqual([]);
    // Still planned on its date (not yet released by the release system), cancelled, or not theatrical: not in cinemas.
    expect(inCinemas([], yours([release({})]), 'GB', '2026-01-05')).toEqual([]);
    expect(inCinemas([], yours([release({ status: 'cancelled' })]), 'GB', '2026-01-05')).toEqual([]);
    expect(inCinemas([], yours([release({ status: 'released', route: 'digital' })]), 'GB', '2026-01-05')).toEqual([]);
  });

  it('changes no money: nothing in the engine reads cinemas or their bookings, so earnings are only what distributors report', () => {
    const engine = readdirSync('src/engine', { recursive: true }).map(String).filter((f) => /\.ts$/.test(f));
    expect(engine.length).toBeGreaterThan(50);
    for (const f of engine) expect(readFileSync(`src/engine/${f}`, 'utf8'), f).not.toMatch(/world\/(programme|cinemas)/);
  });

  it('books more cinemas for a film that was received well', () => {
    expect(yourShare(30)).toBe(0.04);
    expect(yourShare(90)).toBeGreaterThan(yourShare(60));
    expect(yourShare(100)).toBeLessThanOrEqual(0.6);
    expect(inCinemas([], yours([release({ status: 'released' })], 90), 'GB', '2026-01-05')[0].share).toBe(yourShare(90));
  });
});

describe('a cinema\'s programme', () => {
  const showings = inCinemas(OPENINGS, null, 'GB', '2026-01-05');
  const many = Array.from({ length: 2000 }, (_, i) => cinema(`Q${i}`));

  it('books each film at about its share of cinemas, the same way on every visit', () => {
    const wide = many.filter((c) => programme(c, showings, '2026-01-05').some((s) => s.ref === 'movie:1')).length / many.length;
    const limited = many.filter((c) => programme(c, showings, '2026-01-05').some((s) => s.ref === 'movie:2')).length / many.length;
    expect(wide).toBeGreaterThan(BOOKED.wide - 0.05);
    expect(wide).toBeLessThan(BOOKED.wide + 0.05);
    expect(limited).toBeLessThan(BOOKED.limited + 0.03);
    expect(programme(many[7], showings, '2026-01-05')).toEqual(programme(many[7], showings, '2026-01-05'));
    expect(draw('Q1', 'movie:1')).not.toBe(draw('Q2', 'movie:1'));
  });

  it('shows nothing in a closed cinema or one not yet open, and no more films than its screens, the player\'s first', () => {
    const always = showings.map((s) => ({ ...s, share: 1 }));
    expect(programme(cinema('Qx', { closed: '1999' }), always, '2026-01-05')).toEqual([]);
    expect(programme(cinema('Qx', { state: 'permanently closed' }), always, '2026-01-05')).toEqual([]);
    expect(programme(cinema('Qx', { opened: '2027' }), always, '2026-01-05')).toEqual([]);
    // No closure recorded, but no website or operator either: no sign it still shows films.
    expect(programme(cinema('Qx', { site: null }), always, '2026-01-05')).toEqual([]);
    expect(programme(cinema('Qx', { site: null, operator: 'Fixture Cinemas' }), always, '2026-01-05')).toHaveLength(always.length);
    const lots = Array.from({ length: 12 }, (_, i) => ({ ref: `movie:${i + 10}`, title: `F${i}`, opened: '2026-01-01', limited: false, share: 1 }));
    const mine = { ref: 'project:p1', title: 'Your Film', opened: '2026-01-01', limited: false, share: 1, projectId: 'p1' };
    const shown = programme(cinema('Qy'), [...lots, mine], '2026-01-05');
    expect(shown).toHaveLength(SCREENS);
    expect(shown[0].title).toBe('Your Film');
  });
});
