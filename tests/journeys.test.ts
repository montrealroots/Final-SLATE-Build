import { describe, expect, it } from 'vitest';
import {
  DAY, checkEligibility, institution, ledgerTotals, processUntil, submitEntry, readSave, writeSave, memoryStore, approvedCharacters,
} from './engine-api';
import { approve, buildProject, castAll, manage, runDays, staffAll, startLife, startProduction, summary } from './helpers';

describe('live-action feature: player writes, produces, directs and acts', () => {
  it('runs from script to delivery with consistent money, credits and saves', () => {
    const s = startLife('la1', 'gb-london');
    const p = buildProject(s, { title: 'Dust And Teeth', format: 'feature', medium: 'live-action', genres: ['western', 'zombie', 'comedy'], scenario: 'low' },
      [
        { name: 'Ruth Calloway', patch: { roleSize: 'lead', functions: ['protagonist'] } },
        { name: 'Deadeye Pike', patch: { roleSize: 'supporting', functions: ['antagonist'], entity: 'undead', realization: 'prosthetics', entityNote: 'Slow, hungry, remembers his old grudges.' } },
        { name: 'Sheriff Amos', patch: { roleSize: 'supporting', functions: ['ally'] } },
      ],
      [
        { place: 'Calloway Ranch', intExt: 'EXT', chars: ['Ruth Calloway'], minutes: 3, extra: { animals: ['Horse'], stunts: 'Ruth is thrown from her horse' } },
        { place: 'Saloon', intExt: 'INT', time: 'NIGHT', chars: ['Ruth Calloway', 'Sheriff Amos'], minutes: 4 },
        { place: 'Main Street', intExt: 'EXT', chars: ['Ruth Calloway', 'Deadeye Pike'], minutes: 3, extra: { crowd: 30 } },
        { place: 'Jailhouse', intExt: 'INT', chars: ['Sheriff Amos', 'Deadeye Pike'], minutes: 3 },
      ]);
    approve(s, p);
    const kinds = p.requirements.map((r) => r.kind);
    expect(kinds).toEqual(expect.arrayContaining(['animal', 'stunt', 'crowd', 'creature', 'location', 'performer']));
    // A zombie label alone does not demand a crowd: only the Main Street scene creates one.
    expect(p.requirements.filter((r) => r.kind === 'crowd').map((r) => r.qty)).toEqual([30]);
    castAll(s, p, [{ character: 'Ruth Calloway', method: 'on-camera' }]);
    staffAll(s, p);
    const reservedBefore = ledgerTotals(p).reserved;
    expect(reservedBefore).toBeGreaterThan(0);
    expect(ledgerTotals(p).settled).toBe(0); // offers never spend
    processUntil(s, s.now + 4 * DAY, 'tick', 100000);
    for (let i = 0; i < 4; i++) {
      manage(s, p);
      processUntil(s, s.now + 3 * DAY, 'tick', 100000);
    }
    startProduction(s, p, 7);
    expect(p.schedule.days.length).toBeGreaterThan(0);
    // Player acts and directs on the days with Ruth.
    expect(p.schedule.days.some((d) => d.playerActing)).toBe(true);
    runDays(s, p, 220);
    const sm = summary(p);
    expect(sm.openTasks).toEqual([]);
    expect(p.delivered).not.toBeNull();
    // Money: no double settlement keys, cash never negative.
    const keys = p.obligations.flatMap((o) => o.postings.filter((x) => x.kind === 'settle').map((x) => x.key));
    expect(new Set(keys).size).toBe(keys.length);
    expect(ledgerTotals(p).cash).toBeGreaterThanOrEqual(0);
    // Credits: all four professions only where earned.
    const contribs = p.credits.filter((c) => c.person === 'player').map((c) => c.contribution);
    expect(contribs).toEqual(expect.arrayContaining(['Written By', 'Directed By', 'Produced By', 'Cast']));
    expect(p.credits.find((c) => c.person === 'player' && c.contribution === 'Cast')?.characterName).toBe('Ruth Calloway');
    // Save and reload mid-life without changes.
    const store = memoryStore();
    expect(writeSave(store, s, 1).ok).toBe(true);
    expect(readSave(store, s.saveId)).toEqual(JSON.parse(JSON.stringify(s)));
  }, 60000);

  it('the player behind the camera only gets no acting credit', () => {
    const s = startLife('la2', 'us-atlanta');
    const p = buildProject(s, { title: 'Glass Harbor', format: 'short', medium: 'live-action', genres: ['drama'], scenario: 'low', runtime: 10 },
      [{ name: 'Nell', patch: { roleSize: 'lead' } }, { name: 'Bo', patch: { roleSize: 'supporting' } }],
      [{ place: 'Kitchen', chars: ['Nell', 'Bo'], minutes: 4 }, { place: 'Porch', intExt: 'EXT', chars: ['Nell'], minutes: 3 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    processUntil(s, s.now + 5 * DAY, 'tick', 100000);
    startProduction(s, p, 7);
    runDays(s, p, 200);
    expect(p.delivered).not.toBeNull();
    const mine = p.credits.filter((c) => c.person === 'player').map((c) => c.contribution);
    expect(mine).toEqual(expect.arrayContaining(['Written By', 'Directed By', 'Produced By']));
    expect(mine).not.toContain('Cast');
    expect(p.credits.filter((c) => c.contribution === 'Cast').map((c) => c.characterName).sort()).toEqual(['Bo', 'Nell']);
    // Festival routing: a short can be entered in an open short-film section.
    const open = s.editions.find((e) => s.now >= e.submissionOpens && s.now < e.deadline && institution(e.institutionId).categories.some((c) => c.formats.includes('short') && c.recipient === 'project' && checkEligibility(s, p, e, c).eligible));
    if (open) {
      const cat = institution(open.institutionId).categories.find((c) => c.formats.includes('short') && checkEligibility(s, p, open, c).eligible)!;
      submitEntry(s, p, open.id, cat.id);
      processUntil(s, open.end + 2 * DAY, 'tick', 100000);
      const entry = open.entries.find((e) => e.projectId === p.id)!;
      expect(['selected', 'not-selected', 'won', 'lost', 'withdrawn', 'rejected']).toContain(entry.status);
      // Results are locked: reprocessing cannot reroll them.
      const before = JSON.stringify(open.results);
      processUntil(s, s.now + DAY, 'tick', 100000);
      expect(JSON.stringify(open.results)).toBe(before);
    }
    expect(approvedCharacters(p).length).toBe(2);
  }, 60000);
});
