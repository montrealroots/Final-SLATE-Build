// SLATE-03-04.02 and 18-05.03: shelving a project settles its commitments and keeps its history; it can be taken up again.
import { describe, expect, it } from 'vitest';
import { DAY, approachBacker, createProject, ledgerTotals, makeOffer, processUntil, resumeProject, roleCandidates, shelveImpact, shelveProject, updateScene } from './engine-api';
import { approve, buildProject, castAll, manage, staffAll, startLife, startProduction, writePitch } from './helpers';

function underway(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Weathered', format: 'short', medium: 'live-action', scenario: 'micro', genres: ['drama'], runtime: 8 },
    [{ name: 'Ada', patch: { roleSize: 'lead' } }],
    [{ place: 'Cliff', intExt: 'EXT', chars: ['Ada'], minutes: 3 }, { place: 'Kitchen', chars: ['Ada'], minutes: 3 }]);
  approve(s, p);
  castAll(s, p);
  staffAll(s, p);
  for (let i = 0; i < 8; i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100000); }
  startProduction(s, p, 7);
  return { s, p };
}

describe('shelving a project', () => {
  it('says what it will do; then releases people, cancels days, frees reserved money and stops the work, keeping the history', () => {
    const { s, p } = underway('shelve');
    const hired = p.hires.filter((h) => h.status === 'accepted');
    expect(hired.length).toBeGreaterThan(0);
    const days = p.schedule.days.filter((d) => d.status === 'scheduled').length;
    const impact = shelveImpact(s, p);
    expect(impact).toContain(`${hired.length} people you hired will be released, paid for the work they have done.`);
    expect(impact).toContain(`${days} shoot days will be cancelled.`);
    expect(impact[impact.length - 1]).toBe('Your script, drafts, footage and history stay, and you can take the project up again.');
    const settledBefore = ledgerTotals(p).settled;
    shelveProject(s, p);
    expect(p.hires.filter((h) => h.status === 'accepted')).toHaveLength(0);
    expect(p.schedule.days.filter((d) => d.status === 'scheduled')).toHaveLength(0);
    expect(p.schedule.days.filter((d) => d.status === 'cancelled')).toHaveLength(days); // kept, not deleted
    expect(ledgerTotals(p).reserved).toBe(0);
    expect(ledgerTotals(p).settled).toBe(settledBefore); // nothing paid comes back, nothing new is paid
    expect(s.events.some((e) => e.payload.projectId === p.id && ['work-day', 'shoot-call'].includes(e.kind))).toBe(false);
    for (const h of hired) expect(s.people[h.personId]?.bookings.some((b) => b.projectId === p.id) ?? false).toBe(false);
    // Time passes and nothing happens to it.
    const tasks = JSON.stringify(p.tasks);
    processUntil(s, s.now + 10 * DAY, 'tick', 100000);
    expect(JSON.stringify(p.tasks)).toBe(tasks);
    expect(p.history.at(-1)?.text).toBe('Shelved.');
  }, 60000);

  it('a shelved project refuses changes and hiring until it is taken up again; a delivered one cannot be shelved', () => {
    const { s, p } = underway('shelve-locks');
    shelveProject(s, p);
    expect(() => shelveProject(s, p)).toThrow('This project is already shelved.');
    expect(() => updateScene(p, p.scenes[0].id, { estMinutes: 4 })).toThrow('This project is shelved. Take it up again to make changes.');
    const who = roleCandidates(s, p, 'gaffer')[0];
    expect(() => makeOffer(s, p, { personId: who.id, roleId: 'gaffer', dayRate: who.dayRate })).toThrow('This project is shelved. Take it up again to hire for it.');
    resumeProject(s, p);
    expect(p.shelved).toBeUndefined();
    updateScene(p, p.scenes[0].id, { estMinutes: 4 });
    expect(() => resumeProject(s, p)).toThrow('This project is not shelved.');
    p.delivered = { at: s.now, runtimeMin: 8 };
    expect(() => shelveProject(s, p)).toThrow('This project has been delivered, so there is nothing to shelve.');
  }, 60000);

  it("a backer's answer still arrives, and what was agreed still stands", () => {
    const s = startLife('shelve-backer');
    const p = createProject(s, { title: 'Night Ferry', scenarioId: 'micro', axes: { format: 'short', medium: 'live-action', targetRuntimeMin: 10 } });
    const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
    Object.assign(p, { characters: q.characters, scenes: q.scenes });
    s.projects = s.projects.filter((x) => x.id !== q.id);
    writePitch(p);
    approve(s, p);
    const d = approachBacker(s, p, 'investor');
    shelveProject(s, p);
    processUntil(s, s.now + 30 * DAY, 'tick', 100000);
    expect(d.status).not.toBe('considering');
  });
});
