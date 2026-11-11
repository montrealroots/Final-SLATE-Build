// Cinemas as Wikidata records them (src/world/cinemas.ts, docs/CINEMAS.md): how one stood on a date, never claimed open,
// and the ones near a place.
import { describe, expect, it } from 'vitest';
import { cinemaOn, cinemasNear, showsFilms, type Cinema } from '../src/world/cinemas';

const c = (x: Partial<Cinema>): Cinema => ({ id: 'Q1', name: 'Fixture', lat: 51.5, lon: -0.12, opened: null, closed: null, state: null, seats: null, operator: null, in: null, ...x });

describe('a cinema at a date', () => {
  it('is not counted before it opens, and a year or month opening counts from its start', () => {
    expect(cinemaOn(c({ opened: '1932-05-07' }), '1932-05-06').kind).toBe('not-yet');
    expect(cinemaOn(c({ opened: '1932-05-07' }), '1932-05-07').kind).toBe('no-closure');
    expect(cinemaOn(c({ opened: '1932' }), '1932-01-01').kind).toBe('no-closure');
    expect(cinemaOn(c({ opened: '1932-05' }), '1932-04-30').kind).toBe('not-yet');
  });

  it('is closed from its closing day, or once a closing year or month is over, so a part-known date never tells the future', () => {
    expect(cinemaOn(c({ closed: '1999-06-30' }), '1999-06-29')).toEqual({ kind: 'no-closure' });
    expect(cinemaOn(c({ closed: '1999-06-30' }), '1999-06-30')).toEqual({ kind: 'closed', on: '1999-06-30' });
    expect(cinemaOn(c({ closed: '1999' }), '1999-12-31')).toEqual({ kind: 'no-closure' });
    expect(cinemaOn(c({ closed: '1999' }), '2000-01-01')).toEqual({ kind: 'closed', on: '1999' });
    expect(cinemaOn(c({ closed: '1999-06' }), '1999-07-01')).toEqual({ kind: 'closed', on: '1999-06' });
  });

  it('is closed with no date when Wikidata records it as closed but not when, and is otherwise never called open', () => {
    expect(cinemaOn(c({ state: 'permanently closed' }), '2026-01-05')).toEqual({ kind: 'closed-undated' });
    expect(cinemaOn(c({ state: 'demolished or destroyed' }), '1950-01-01')).toEqual({ kind: 'closed-undated' });
    expect(cinemaOn(c({ state: 'in use' }), '2026-01-05')).toEqual({ kind: 'no-closure' });
  });
});

describe('a cinema that shows films', () => {
  it('needs no closure recorded and a website or operator: an old cinema nobody recorded closing shows nothing', () => {
    expect(showsFilms(c({}), '2026-01-05')).toBe(false);
    expect(showsFilms(c({ site: 'https://cinema.example' }), '2026-01-05')).toBe(true);
    expect(showsFilms(c({ operator: 'Fixture Cinemas' }), '2026-01-05')).toBe(true);
    expect(showsFilms(c({ site: 'https://cinema.example', closed: '1999' }), '2026-01-05')).toBe(false);
    expect(showsFilms(c({ site: 'https://cinema.example', opened: '2030' }), '2026-01-05')).toBe(false);
  });
});

describe('cinemas near a place', () => {
  it('lists those within the distance, nearest first, leaving out those not yet open', () => {
    const list = [c({ id: 'far', lat: 52.5, lon: -0.12 }), c({ id: 'near', lat: 51.51, lon: -0.12 }), c({ id: 'here', lat: 51.5, lon: -0.12 }), c({ id: 'later', opened: '2030' })];
    const near = cinemasNear(list, 51.5, -0.12, 20, '2026-01-05');
    expect(near.map((x) => x.c.id)).toEqual(['here', 'near']);
    expect(near[1].km).toBeCloseTo(1.11, 1);
    expect(cinemasNear(list, 51.5, -0.12, 20, '2031-01-01').map((x) => x.c.id)).toEqual(['here', 'later', 'near']);
    // Cinemas that show films come first, nearest first, then the rest.
    const mixed = [c({ id: 'old-near', lat: 51.5 }), c({ id: 'working-far', lat: 51.58, site: 'https://cinema.example' }), c({ id: 'working-near', lat: 51.52, operator: 'Fixture Cinemas' })];
    expect(cinemasNear(mixed, 51.5, -0.12, 20, '2026-01-05').map((x) => x.c.id)).toEqual(['working-near', 'working-far', 'old-near']);
  });
});
