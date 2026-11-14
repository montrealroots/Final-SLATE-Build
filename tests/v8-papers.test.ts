// Papers for working abroad, and where a story is set apart from where it is filmed (src/engine/papers.ts,
// destinations.ts; the owner's v8 package, 05 and 06; A16, A17).
import { describe, expect, it } from 'vitest';
import { DAY, processUntil } from './engine-api';
import { applyForPermit, permitRefusal, workRight, PERMIT_VALID_DAYS } from '../src/engine/papers';
import { filmPlace, setFilmedAt } from '../src/engine/destinations';
import { schedule } from '../src/engine/state';
import { approve, buildProject, startLife } from './helpers';

// The fixture player is Japanese and French and lives in London.
describe('A16: a passport lets you travel; it doesn\'t let you work', () => {
  it('reads citizenship, where you live, a treaty right, and the permit everyone else needs', () => {
    const s = startLife('papers');
    expect(workRight(s, 'FR')).toMatchObject({ can: true, why: 'You are a citizen of France.' });
    expect(workRight(s, 'GB').can).toBe(true); // where you live, a simulation choice the game says
    expect(workRight(s, 'NO')).toMatchObject({ can: true, why: 'Your France passport lets you work in Norway.' }); // the shared market
    const us = workRight(s, 'US');
    expect(us).toMatchObject({ can: false, route: 'O-1 (extraordinary ability in the arts, or extraordinary achievement in motion pictures or television)' });
    expect(us.why).toMatch(/Visiting isn't working\.$/);
  });

  it('a permit applied for lets you do nothing until granted, then a year, then nothing again', () => {
    const s = startLife('papers-permit');
    const p = applyForPermit(s, 'US');
    expect([p.status, workRight(s, 'US').can, permitRefusal(s, 'US')]).toEqual(['pending', false, 'Your application is being decided.']);
    processUntil(s, s.now + 31 * DAY, 'tick', 100_000);
    expect([p.status, workRight(s, 'US').can]).toEqual(['granted', true]);
    processUntil(s, s.now + PERMIT_VALID_DAYS * DAY, 'tick', 1_000_000);
    expect(workRight(s, 'US').can).toBe(false);
  });

  it('on a day filmed where you may not work, the day starts without you, even when you are there', () => {
    const s = startLife('papers-call');
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Quay', intExt: 'EXT', chars: ['Wren'] }]);
    approve(s, p);
    setFilmedAt(p, 'Quay', { placeId: 'us-los-angeles', kind: 'port' });
    // Labelled fixture: a scheduled day at the Quay, and you are in Los Angeles for it.
    const d = { id: 'day-1', date: '2026-01-20', sceneIds: [p.scenes[0].id], locationLabel: 'Quay', status: 'scheduled', episode: 1, interior: false, playerActing: true } as never as (typeof p.schedule.days)[number];
    p.schedule.days.push(d);
    s.locationId = 'us-los-angeles';
    schedule(s, s.now + 1, 'shoot-call', { projectId: p.id, dayId: 'day-1' });
    processUntil(s, s.now + 2, 'tick', 1000);
    expect(d.late).toBe(true);
    expect(s.log[0].text).toMatch(/^You can't work in Los Angeles: To work in United States you need a permit/);
  });
});

describe('A17: where the story is set and where it is filmed are two things', () => {
  it('changing one never changes the other', () => {
    const s = startLife('setting-filmed');
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action' }, [{ name: 'Wren' }], [{ place: 'Quay', intExt: 'EXT', chars: ['Wren'] }]);
    Object.assign(p.axes, { storySetting: 'Port Venn, a made-up harbour town', settingPlaceId: 'no-tromso' }); // as the brief sets them
    approve(s, p);
    setFilmedAt(p, 'Quay', { placeId: 'us-los-angeles', kind: 'port' });
    expect([p.axes.storySetting, p.axes.settingPlaceId, filmPlace(p, 'Quay').id]).toEqual(['Port Venn, a made-up harbour town', 'no-tromso', 'us-los-angeles']);
    p.axes.storySetting = 'Port Venn, years later'; // the player rewrites the setting
    expect(filmPlace(p, 'Quay').id).toBe('us-los-angeles');
    setFilmedAt(p, 'Quay', null);
    expect([p.axes.storySetting, p.axes.settingPlaceId]).toEqual(['Port Venn, years later', 'no-tromso']);
  });
});
