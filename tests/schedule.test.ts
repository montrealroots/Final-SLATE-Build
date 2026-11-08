import { describe, expect, it } from 'vitest';
import { DAY, castPlayer, isWorkingDay, keepWeatherPlan, ledgerTotals, moveShootDay, personById, processUntil, swapWithInteriorDay } from './engine-api';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction } from './helpers';

function scheduled(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Weathered', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }],
    [{ place: 'Cliff', intExt: 'EXT', chars: ['Ada'], minutes: 3 }, { place: 'Kitchen', chars: ['Ada'], minutes: 3 }]);
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

describe('Move the Shoot', () => {
  it('moves a day to the first free working day after the shoot, keeps costs, moves its events and still delivers', () => {
    const { s, p } = scheduled('move');
    const ext = p.schedule.days.find((d) => !d.interior && d.status === 'scheduled')!;
    const last = p.schedule.days.reduce((m, d) => (d.date > m ? d.date : m), '');
    const planned = ledgerTotals(p).reserved + ledgerTotals(p).committedOutstanding + ledgerTotals(p).settled;
    const to = moveShootDay(s, p, ext.id);
    expect(to > last).toBe(true);
    expect(isWorkingDay(p, to)).toBe(true);
    expect(p.schedule.days.filter((d) => d.date === to)).toHaveLength(1);
    expect(ledgerTotals(p).reserved + ledgerTotals(p).committedOutstanding + ledgerTotals(p).settled).toBe(planned);
    const call = s.events.find((e) => e.kind === 'shoot-call' && e.payload.dayId === ext.id);
    expect(call).toBeDefined();
    // Everyone on set is booked through the new date.
    for (const h of p.hires.filter((x) => x.status === 'accepted' && x.kind === 'cast')) {
      expect(s.people[h.personId].bookings.find((b) => b.projectId === p.id)!.to >= to).toBe(true);
    }
    runDays(s, p, 200);
    expect(p.delivered).not.toBeNull();
    expect(ext.status).not.toBe('scheduled');
  }, 60000);

  it("refuses when someone needed on set is busy that day, and changes nothing", () => {
    const { s, p } = scheduled('move-busy');
    const ext = p.schedule.days.find((d) => !d.interior && d.status === 'scheduled')!;
    const cast = p.hires.find((h) => h.status === 'accepted' && h.kind === 'cast')!;
    const person = personById(s, cast.personId)!;
    const before = ext.date;
    person.busy.push({ from: '2026-01-01', to: '2027-12-31' });
    expect(() => moveShootDay(s, p, ext.id)).toThrow(/can't move to/);
    expect(ext.date).toBe(before);
  }, 60000);
});

// SLATE-02-04.03: a wet exterior day can be swapped with a later interior day, or shot anyway; either way the record says so.
describe('weather choices for an exterior day', () => {
  it('swaps dates with the next interior day, moving both days\' calls, and keeps the scenes together', () => {
    const { s, p } = scheduled('swap');
    const ext = p.schedule.days.find((d) => !d.interior && d.status === 'scheduled')!;
    const int = p.schedule.days.find((d) => d.interior && d.status === 'scheduled' && d.date > ext.date)!;
    expect(int).toBeDefined(); // the cliff day is planned before the kitchen day
    const [a, b, scenes] = [ext.date, int.date, [...ext.sceneIds]];
    expect(swapWithInteriorDay(s, p, ext.id)).toBe(a);
    expect([ext.date, int.date]).toEqual([b, a]);
    expect(ext.sceneIds).toEqual(scenes);
    const calls = s.events.filter((e) => e.kind === 'shoot-call' && (e.payload.dayId === ext.id || e.payload.dayId === int.id));
    expect(calls).toHaveLength(2);
    expect(s.log.some((l) => l.text.includes('exterior with the'))).toBe(true);
  }, 60000);

  it('shooting anyway is recorded on the day; a day that has gone can no longer be swapped', () => {
    const { s, p } = scheduled('anyway');
    const ext = p.schedule.days.find((d) => !d.interior && d.status === 'scheduled')!;
    keepWeatherPlan(s, p, ext.id);
    expect(ext.weatherAnyway).toBe(true);
    // The last interior day has no later interior day to swap with: refused with the way out, and nothing changes.
    const int = p.schedule.days.find((d) => d.interior && d.status === 'scheduled')!;
    const before = int.date;
    p.schedule.days.filter((d) => d !== int && d.interior).forEach((d) => { d.interior = false; });
    int.interior = false;
    expect(() => swapWithInteriorDay(s, p, ext.id)).toThrow('There is no later interior day to swap with.');
    expect([int.date, ext.date].includes(before)).toBe(true);
    ext.status = 'shot'; // labelled fixture: the day has been shot
    expect(() => swapWithInteriorDay(s, p, ext.id)).toThrow('That shoot day can no longer be changed.');
  }, 60000);

  it('a day you act on is marked, so directing and acting at once is visible on the schedule', () => {
    const s = startLife('acting-day', 'gb-london');
    const p = buildProject(s, { title: 'Weathered', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
      [{ name: 'Ada', patch: { roleSize: 'lead' } }, { name: 'Bo' }],
      [{ place: 'Cliff', intExt: 'EXT', chars: ['Ada'], minutes: 3 }, { place: 'Kitchen', chars: ['Bo'], minutes: 3 }]);
    approve(s, p);
    castPlayer(s, p, p.characters.find((c) => c.name === 'Ada')!.id, 'on-camera');
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 8; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 7);
    const mine = p.schedule.days.filter((d) => d.playerActing);
    const theirs = p.schedule.days.filter((d) => !d.playerActing);
    expect(mine.length).toBeGreaterThan(0);
    for (const d of mine) expect(d.sceneIds.some((id) => p.scenes.find((x) => x.id === id)!.participants.includes(p.characters.find((c) => c.name === 'Ada')!.id))).toBe(true);
    for (const d of theirs) expect(d.sceneIds.every((id) => !p.scenes.find((x) => x.id === id)!.participants.includes(p.characters.find((c) => c.name === 'Ada')!.id))).toBe(true);
  }, 60000);
});

// SLATE-02-04.05: daylight at the place and date decides whether an exterior day scene can be shot.
describe('daylight', () => {
  it('in Tromsø\'s polar night an exterior day scene is not shot for want of light, while the interior one is', () => {
    const s = startLife('polar', 'no-tromso', { startDate: '2026-11-25', startTime: '09:00' });
    const p = buildProject(s, { title: 'Mørketid', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
      [{ name: 'Ada', patch: { roleSize: 'lead' } }],
      [{ place: 'Harbour', intExt: 'EXT', time: 'DAY', chars: ['Ada'], minutes: 3 }, { place: 'Kitchen', chars: ['Ada'], minutes: 3 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    for (let i = 0; i < 8; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
    startProduction(s, p, 3);
    for (const d of p.schedule.days) d.weatherAnyway = true; // labelled fixture: rain is not under test, only light
    runDays(s, p, 20);
    const harbour = p.scenes.find((x) => x.heading.place === 'Harbour')!;
    const kitchen = p.scenes.find((x) => x.heading.place === 'Kitchen')!;
    expect(p.captures.find((c) => c.sceneId === harbour.id)?.captured ?? 0).toBe(0);
    expect(p.captures.find((c) => c.sceneId === kitchen.id)?.captured).toBe(1);
    expect(s.log.some((l) => l.text.includes("There wasn't enough daylight"))).toBe(true);
  }, 60000);
});
