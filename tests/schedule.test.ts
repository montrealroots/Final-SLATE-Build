import { describe, expect, it } from 'vitest';
import { DAY, isWorkingDay, ledgerTotals, moveShootDay, personById, processUntil } from './engine-api';
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
