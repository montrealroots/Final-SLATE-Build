// Where a script location is filmed (src/engine/destinations.ts; the Creative Depth package, milestone E). Controlled
// comparisons: the same film with one location filmed somewhere else, against the film as it was. The places are real
// entries of the game's registry; every site is a candidate the game makes up, and the tests check that it says so.
import { describe, expect, it } from 'vitest';
import { getPlace, registerPlace } from '../src/data/places';
import {
  AWAY_DAY_SHARE, AWAY_KM, SITE_KINDS, awayCosts, awayDayCost, candidateSite, dayPlace, filmPlace, filmedAtPreview, isAway, kindFee, kmFromBase, moveCost, noisyDay, permitWork, setFilmedAt, underCover,
} from '../src/engine/destinations';
import { dayFees } from '../src/engine/production/rates';
import { approvedScenes, buildTasks, costBreakdown, deserialize, serialize } from './engine-api';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction, summary } from './helpers';

function film(seed = 'destinations'): { s: GameState; p: Project } {
  const s = startLife(seed);
  const p = buildProject(s, { title: 'Destinations Fixture', format: 'short', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Office', chars: ['Wren'] }, { place: 'Quay', intExt: 'EXT', chars: ['Wren'] }]);
  approve(s, p);
  return { s, p };
}
const NEAR = { ...getPlace('gb-london'), id: 'x-near-london', name: 'Nearby (Fixture)', lat: getPlace('gb-london').lat + 0.3 };

describe('where a script location is filmed', () => {
  it('nothing chosen is the base, with nothing added', () => {
    const { s, p } = film();
    expect(filmPlace(p, 'Quay').id).toBe(p.axes.basePlaceId);
    expect([isAway(p, 'Quay'), kindFee(p, 'Quay'), awayDayCost(p, 'Quay'), moveCost(p, 'Quay'), underCover(p, 'Quay'), candidateSite(p, 'Quay')]).toEqual([false, 1, 0, 0, false, null]);
    expect(permitWork(p, approvedScenes(p))).toEqual([]);
    expect(noisyDay(s.seed, p, { locationLabel: 'Quay', date: '2026-03-02' })).toBe(false);
    expect(buildTasks(p).some((t) => t.kind === 'prep:permit')).toBe(false);
  });

  it('a place far from the base: its own place for the day, a fee by the kind of site, a move once and housing each day, and permits first', () => {
    const { s, p } = film();
    const plain = film().p;
    setFilmedAt(p, 'Quay', { placeId: 'no-tromso', kind: 'port' });
    expect(dayPlace(p, { locationLabel: 'Quay' }).name).toBe(getPlace('no-tromso').name);
    expect(dayPlace(p, { locationLabel: 'Office' }).id).toBe(p.axes.basePlaceId); // the other location stays at the base
    expect(kmFromBase(p, 'Quay')).toBeGreaterThan(1500);
    expect(isAway(p, 'Quay')).toBe(true);
    expect(kindFee(p, 'Quay')).toBe(SITE_KINDS.port.fee);
    const f = dayFees(p);
    expect(awayDayCost(p, 'Quay')).toBe(Math.round((f.location + f.equipment) * AWAY_DAY_SHARE));
    expect(moveCost(p, 'Quay')).toBe(Math.round(f.equipment * Math.min(4, 0.5 + kmFromBase(p, 'Quay') / 1000)));
    expect(awayCosts(p, [{ locationLabel: 'Quay' }, { locationLabel: 'Quay' }, { locationLabel: 'Office' }])).toEqual([{ label: 'Quay', place: getPlace('no-tromso').name, days: 2, move: moveCost(p, 'Quay'), housing: 2 * awayDayCost(p, 'Quay') }]);
    // Permits are work before the shoot, for that place alone.
    const permit = buildTasks(p).filter((t) => t.kind === 'prep:permit');
    expect(permit.map((t) => [t.label, t.units, t.roleId])).toEqual([[`Permits And Arrangements: Quay, In ${getPlace('no-tromso').name}`, SITE_KINDS.port.permitDays, 'location-manager']]);
    // The estimate names it, and is larger by exactly the move and the housing for its days.
    const line = costBreakdown(s, p).toCome.find((l) => l.label.startsWith('Filming in'))!;
    expect(line.label).toBe(`Filming in ${getPlace('no-tromso').name}: Quay`);
    expect(line.amount).toBe(moveCost(p, 'Quay') + awayDayCost(p, 'Quay'));
    expect(costBreakdown(s, plain).toCome.some((l) => l.label.startsWith('Filming in'))).toBe(false);
  });

  it('a place near the base moves and houses nobody, and still has its own fee and permits', () => {
    registerPlace(NEAR);
    const { p } = film();
    setFilmedAt(p, 'Quay', { placeId: NEAR.id, kind: 'coast' });
    expect(kmFromBase(p, 'Quay')).toBeLessThan(AWAY_KM);
    expect([isAway(p, 'Quay'), awayDayCost(p, 'Quay'), moveCost(p, 'Quay')]).toEqual([false, 0, 0]);
    expect(kindFee(p, 'Quay')).toBe(SITE_KINDS.coast.fee);
    expect(permitWork(p, approvedScenes(p))).toEqual([{ label: 'Quay', days: 2, where: 'Nearby (Fixture)' }]);
  });

  it('the kind of site decides whether rain can stop it and how often noise spoils dialogue, the same on every run', () => {
    const { s, p } = film();
    const days = Array.from({ length: 400 }, (_, i) => `2027-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}x${i}`);
    const share = (kind: keyof typeof SITE_KINDS) => { setFilmedAt(p, 'Quay', { placeId: 'no-tromso', kind }); return days.filter((date) => noisyDay(s.seed, p, { locationLabel: 'Quay', date })).length / days.length; };
    expect(share('soundstage')).toBe(0);
    expect(underCover(p, 'Quay')).toBe(true);
    const market = share('market');
    expect(underCover(p, 'Quay')).toBe(false);
    expect(Math.abs(market - SITE_KINDS.market.noise)).toBeLessThan(0.08);
    expect(share('forest')).toBeLessThan(market);
    expect(share('market')).toBe(market); // decided by the seed, the place and the date: asking again changes nothing
  });

  it('the candidate site says it is made up, and the place it is in is real', () => {
    const { p } = film();
    setFilmedAt(p, 'Quay', { placeId: 'no-tromso', kind: 'port' });
    const words = candidateSite(p, 'Quay')!;
    expect(words).toContain(`A working port in ${getPlace('no-tromso').name}, ${getPlace('no-tromso').countryName}.`);
    expect(words).toContain('is a real place; the site is a candidate the game made up, not a real venue');
    const pre = filmedAtPreview(p, 'Quay', 'no-tromso', 'soundstage');
    expect(pre.away).toBe(true);
    expect(pre.lines.join(' ')).toMatch(/km from .+\. Each day there has .+'s weather, daylight and public holidays/);
    expect(pre.lines.join(' ')).toContain('A day at a soundstage costs 160% of the usual location fee.');
    expect(pre.lines.join(' ')).toContain('Under a roof: rain and snow do not stop the day.');
    expect(pre.lines.join(' ')).toContain('You have to be there for the call.');
  });

  it('is refused for a place that isn\'t in the registry or a kind that isn\'t one, kept across a save, and undone by going back to the base', () => {
    const { s, p } = film();
    expect(() => setFilmedAt(p, 'Quay', { placeId: 'nowhere-at-all', kind: 'port' })).toThrow('That place is not in the world registry.');
    expect(() => setFilmedAt(p, 'Quay', { placeId: 'no-tromso', kind: 'volcano' as never })).toThrow('Choose a kind of site.');
    setFilmedAt(p, 'Quay', { placeId: 'no-tromso', kind: 'port' });
    expect(deserialize(serialize(s)).projects[0].locationChoices!.Quay.at).toEqual({ placeId: 'no-tromso', kind: 'port' });
    setFilmedAt(p, 'Quay', null);
    expect(filmPlace(p, 'Quay').id).toBe(p.axes.basePlaceId);
  });
});

describe('a film with a location filmed far away, made', () => {
  it('pays the move once and the housing each day there, calls the day where it is filmed, and can\'t be moved once shot', () => {
    const { s, p } = film('destinations-made');
    setFilmedAt(p, 'Quay', { placeId: 'no-tromso', kind: 'port' });
    p.tasks = buildTasks(p);
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 300);
    expect(summary(p)).toMatchObject({ delivered: true });
    const postings = p.obligations.flatMap((o) => o.postings).filter((x) => x.kind === 'settle');
    const quayDays = p.schedule.days.filter((d) => d.locationLabel === 'Quay' && d.status !== 'scheduled');
    expect(quayDays.length).toBeGreaterThan(0);
    expect(postings.filter((x) => x.key.startsWith('move:')).map((x) => x.amount)).toEqual([moveCost(p, 'Quay')]);
    expect(postings.filter((x) => x.key.startsWith('away:')).length).toBe(quayDays.length);
    expect(postings.filter((x) => x.key.startsWith('away:')).every((x) => x.amount === awayDayCost(p, 'Quay'))).toBe(true);
    // You stayed at the base, so the day there started without you, and the log names where.
    expect(s.log.some((e) => e.text.includes(`You weren't in ${getPlace('no-tromso').name} for the call`))).toBe(true);
    expect(p.tasks.find((t) => t.kind === 'prep:permit')).toMatchObject({ status: 'done' });
    expect(() => setFilmedAt(p, 'Quay', null)).toThrow(/has been delivered|has been shot already/);
  }, 60_000);
});

describe('a roof over an exterior', () => {
  // The same film three times, one seed, the Quay filmed in Tromsø from early January: in the open at a port, on a
  // soundstage, and at a port whose chosen site is the stage set built to match. Only the roof differs.
  const made = (roof: 'none' | 'soundstage' | 'stage-set') => {
    const { s, p } = film('destinations-roof');
    setFilmedAt(p, 'Quay', { placeId: 'no-tromso', kind: roof === 'soundstage' ? 'soundstage' : 'port' });
    if (roof === 'stage-set') p.locationChoices!.Quay.main = 'stage';
    p.tasks = buildTasks(p);
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    runDays(s, p, 300);
    const stopped = p.schedule.days.filter((d) => d.locationLabel === 'Quay' && /(Rain|Snow) stopped|enough daylight/.test(d.result ?? '')).length;
    const warned = s.log.filter((e) => /is expected during your exterior shoot/.test(e.text)).length;
    return { delivered: !!p.delivered, stopped, warned };
  };
  it('in the open the weather or the dark stops days there; under a soundstage roof or on a stage set none is stopped and no warning is sent', () => {
    const open = made('none');
    expect(open.delivered).toBe(true);
    expect(open.stopped).toBeGreaterThan(0);
    expect(made('soundstage')).toEqual({ delivered: true, stopped: 0, warned: 0 });
    expect(made('stage-set')).toEqual({ delivered: true, stopped: 0, warned: 0 });
  }, 120_000);
});

