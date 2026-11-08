// SLATE-11-02.02: choose among scouted sites, keep a backup, lose one and fall back.
import { chooseSite } from '../src/engine/locations-actions';
import { describe, expect, it } from 'vitest';
import { DAY, addDaysToKey, dayFees, processUntil } from './engine-api';
import { scoutedPlaces, siteFactor, siteOnTheDay } from '../src/engine/locations';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

function scouted(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Weathered', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }],
    [{ place: 'Cliff', intExt: 'EXT', chars: ['Ada'], minutes: 3 }, { place: 'Kitchen', chars: ['Ada'], minutes: 3 }]);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 8; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 3);
  const scout = p.tasks.find((t) => t.kind === 'prep:locations')!;
  for (let i = 0; i < 40 && scout.status !== 'done'; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  return { s, p };
}

describe('location sites', () => {
  it('after scouting, a chosen site sets the day fee paid on the shoot', () => {
    const { s, p } = scouted('sites');
    expect(scoutedPlaces(p)).toEqual(['Cliff', 'Kitchen']);
    expect(siteFactor(p, 'Kitchen')).toBe(1); // nothing chosen: the real place at the old fee
    chooseSite(p, 'Kitchen', 'main', 'stage');
    expect(() => chooseSite(p, 'Kitchen', 'backup', 'stage')).toThrow('The main site and the backup must be different.');
    runDays(s, p, 40);
    const kitchen = p.schedule.days.find((d) => d.locationLabel === 'Kitchen' && d.status === 'shot')!;
    const fee = p.obligations.flatMap((o) => o.postings).filter((x) => x.key === `loc:${kitchen.id}`).reduce((a, x) => a + x.amount, 0);
    expect(fee).toBe(Math.round(dayFees(p).location * 1.6));
  }, 60000);

  it('a site that falls through goes to the backup; without one the day is lost and the place needs a new choice', () => {
    const { p } = scouted('sites-lose');
    p.locationChoices = { Kitchen: { main: 'standin', backup: 'stage' } };
    // Deterministic for the seed: find the first date the stand-in falls through.
    let date = '2026-03-02';
    for (let i = 0; i < 400 && !siteOnTheDay(p.id.length, { ...p, locationChoices: { Kitchen: { main: 'standin' } } }, 'Kitchen', date).lost; i++) date = addDaysToKey(date, 1);
    const fell = siteOnTheDay(p.id.length, p, 'Kitchen', date);
    expect(fell).toEqual({ lost: false, text: 'A Cheaper Stand-In for Kitchen fell through this morning. The shoot went to your backup, a stage set built to match.' });
    expect(p.locationChoices.Kitchen).toEqual({ main: 'stage', lost: ['standin'] });
    expect(siteFactor(p, 'Kitchen')).toBe(1.6);
    expect(() => chooseSite(p, 'Kitchen', 'backup', 'standin')).toThrow('That site fell through and is no longer available.');
    // The stage never falls through; with no backup, a real place that falls through loses the day.
    p.locationChoices.Cliff = { main: 'real' };
    let d2 = '2026-03-02';
    for (let i = 0; i < 2000 && !siteOnTheDay(p.id.length, p, 'Cliff', d2).lost; i++) d2 = addDaysToKey(d2, 1);
    expect(p.locationChoices.Cliff).toEqual({ lost: ['real'] });
    expect(siteOnTheDay(p.id.length, p, 'Cliff', addDaysToKey(d2, 1))).toEqual({ lost: true, text: 'No site is chosen for Cliff since the last one fell through, so the day is lost. Choose one on the Schedule page.' });
    // Nothing chosen never falls through.
    expect(siteOnTheDay(p.id.length, { ...p, locationChoices: {} }, 'Kitchen', date)).toEqual({ lost: false });
  }, 60000);

  it('on the shoot, a place with no site after a loss loses its day and its scenes move; choosing again lets it shoot', () => {
    const { s, p } = scouted('sites-day');
    p.locationChoices = { Cliff: { lost: ['real'] } }; // labelled fixture: the real cliff fell through, nothing chosen since
    for (let i = 0; i < 30 && !p.schedule.days.some((d) => d.locationLabel === 'Cliff' && d.status === 'lost'); i++) runDays(s, p, 1);
    const lost = p.schedule.days.find((d) => d.locationLabel === 'Cliff' && d.status === 'lost')!;
    expect(lost.result).toBe('No site is chosen for Cliff since the last one fell through, so the day is lost. Choose one on the Schedule page.');
    expect(p.schedule.days.some((d) => d.locationLabel === 'Cliff' && d.status === 'scheduled' && d.date > lost.date)).toBe(true);
    chooseSite(p, 'Cliff', 'main', 'stage');
    runDays(s, p, 60);
    expect(p.schedule.days.some((d) => d.locationLabel === 'Cliff' && d.status === 'shot')).toBe(true);
  }, 60000);
});
