// SLATE-11-05.03: a call sheet for each shoot day, read from what the day runs on.
import { describe, expect, it } from 'vitest';
import { DAY, localToInstant, parseYmd, personById, processUntil } from './engine-api';
import { callSheet } from '../src/engine/callsheet';
import { getPlace } from '../src/data/places';
import { approve, buildProject, castAll, manage, staffAll, startLife, startProduction } from './helpers';

function scheduled(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Weathered', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Ben', patch: { roleSize: 'supporting' } }],
    [{ place: 'Cliff', intExt: 'EXT', chars: ['Ada'], minutes: 3 }, { place: 'Kitchen', chars: ['Ada', 'Ben'], minutes: 3, extra: { crowd: 4 } }]);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 8; i++) {
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100000);
  }
  startProduction(s, p, 7);
  return { s, p };
}

describe('call sheets', () => {
  it('says the call the game schedules, who is called for which scenes, the crew, and the day\'s notes', () => {
    const { s, p } = scheduled('callsheet');
    const kitchen = p.schedule.days.find((d) => d.locationLabel === 'Kitchen' && d.status === 'scheduled')!;
    const cs = callSheet(s, p, kitchen.id);
    // The call is the hour the shoot-call event fires.
    const call = s.events.find((e) => e.kind === 'shoot-call' && e.payload.dayId === kitchen.id)!;
    const { year, month, day } = parseYmd(kitchen.date);
    expect(call.at).toBe(localToInstant(getPlace(p.axes.basePlaceId).zone, year, month, day, 7).instant);
    expect([cs.call, cs.wrap, cs.where]).toEqual(['7:00 AM', '7:00 PM', 'Kitchen, interior']);
    const performer = (name: string) => { const c = p.characters.find((x) => x.name === name)!; const a = p.cast.find((x) => x.characterId === c.id)!; return a.performer === 'player' ? 'You' : personById(s, a.performer).name; };
    expect(cs.cast.map((c) => [c.part, c.who])).toEqual([['Ada', performer('Ada')], ['Ben', performer('Ben')]]);
    expect(cs.crew.length).toBeGreaterThan(0);
    expect(cs.notes).toContain('4 background performers.');
    // An exterior gets its daylight; an uncast part is named with its scenes.
    const cliff = p.schedule.days.find((d) => d.locationLabel === 'Cliff' && d.status === 'scheduled')!;
    expect(callSheet(s, p, cliff.id).notes.some((n) => /^Sunrise \d+:\d\d [AP]M, sunset \d+:\d\d [AP]M\.$/.test(n))).toBe(true);
    p.cast = p.cast.filter((x) => p.characters.find((c) => c.id === x.characterId)!.name !== 'Ben'); // labelled fixture: Ben's performer released
    const after = callSheet(s, p, kitchen.id);
    expect(after.cast.map((c) => c.part)).toEqual(['Ada']);
    expect(after.uncast).toEqual([`Ben isn't cast yet (${after.scenes.join(', ')}).`]);
  }, 60000);
});
