// The casting director's mandate (the v3 package, 02; requirement V3-L01): one search for one part, paid for, with the
// people brought, the people left out and why, and advice that the player may take or not.
import { describe, expect, it } from 'vitest';
import { DAY, makeOffer, personById, processUntil, roleCandidates } from '../src/engine';
import { AUDITION_NOTICE_DAYS } from '../src/engine/casting-calls';
import { castingDirector, searchAdvice, searchFee, searchLine, searchPreview, searchRefusal, searchSize, searchStatus, shortlistAdvice, startSearch } from '../src/engine/casting-director';
import { ledgerTotals, obligation } from '../src/engine/budget';
import { computeCredits } from '../src/engine/finish';
import { releaseHire } from '../src/engine/hiring';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function film(tag: string): { s: GameState; p: Project; ines: string } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 10 },
    [{ name: 'Ines', patch: { roleSize: 'lead' } }, { name: 'Marco', patch: { roleSize: 'supporting' } }, { name: 'Crowd', patch: { roleSize: 'background' } }],
    [{ place: 'Dock', chars: ['Ines', 'Marco', 'Crowd'], minutes: 3 }]);
  approve(s, p);
  return { s, p, ines: p.characters.find((c) => c.name === 'Ines')!.id };
}
/** A casting director on the production. The offer is the game's own; its answer is set here (a labelled fixture: hired), as other tests do. */
function hire(s: GameState, p: Project): void {
  const c = roleCandidates(s, p, 'casting-director')[0];
  makeOffer(s, p, { personId: c.id, roleId: 'casting-director', dayRate: c.dayRate }).status = 'accepted';
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);

describe("a casting director's search", () => {
  it('is refused without a casting director, for a background part and for a part already cast, each with its reason', () => {
    const { s, p, ines } = film('cd-refuse');
    expect(castingDirector(p)).toBeNull();
    expect(searchPreview(s, p)).toBeNull();
    expect(searchRefusal(p, ines, 'on-camera')).toBe('Hire a casting director first (Crew, Casting And Performance).');
    expect(() => startSearch(s, p, ines, 'on-camera')).toThrow('Hire a casting director first');
    hire(s, p);
    const crowd = p.characters.find((c) => c.name === 'Crowd')!.id;
    expect(searchRefusal(p, crowd, 'on-camera')).toBe('Background parts are covered by the crowd budget, without auditions.');
    expect(searchRefusal(p, ines, 'on-camera')).toBeNull();
  });

  it('says first who runs it, how many they bring, when and what it costs; then costs exactly that and arranges those readings', () => {
    const { s, p, ines } = film('cd-run');
    hire(s, p);
    const cd = castingDirector(p)!;
    const who = personById(s, cd.personId, 'casting-director');
    const pre = searchPreview(s, p)!;
    expect(pre).toMatchObject({ by: who.name, brings: searchSize(who.experience), fee: cd.dayRate * 2 });
    expect(searchSize(1)).toBe(3); expect(searchSize(3)).toBe(5); expect(searchSize(9)).toBe(6);
    // Their agreement reserved one search when they were hired, so the first is paid from their own line and the
    // uncommitted money doesn't move; nothing was paid before it.
    const line = obligation(p, cd.obligationId!);
    expect(line).toMatchObject({ amount: searchFee(cd), settled: 0 });
    const before = ledgerTotals(p).available;
    const search = startSearch(s, p, ines, 'on-camera');
    expect(line.settled).toBe(searchFee(cd));
    expect(ledgerTotals(p).available).toBe(before);
    expect(cd.daysWorked).toBe(2);
    expect(search).toMatchObject({ characterId: ines, method: 'on-camera', by: cd.personId, byName: who.name, fee: pre.fee });
    expect(search.auditionIds.length).toBeGreaterThan(0);
    expect(search.auditionIds.length).toBeLessThanOrEqual(pre.brings);
    // The people brought are ordinary auditions, on the day the preview said.
    const mine = p.auditions!.filter((a) => search.auditionIds.includes(a.id));
    expect(mine.every((a) => a.characterId === ines && a.date === pre.on)).toBe(true);
    // The most experienced who could be asked, first.
    const pool = roleCandidates(s, p, 'actor').sort((a, b) => b.experience - a.experience || a.name.localeCompare(b.name));
    expect(personById(s, mine[0].personId).experience).toBe(pool[0].experience);
    // A second search for the part waits for the first one's readings.
    expect(searchRefusal(p, ines, 'on-camera')).toBe(searchStatus(p, search).waiting ? "A search for Ines is under way: its readings haven't all happened yet." : null);
    // It is in the save.
    expect(deserialize(serialize(s)).projects[0].castingSearches).toEqual(p.castingSearches);
  });

  it('advises only once everyone has read, from the readings the player sees, and shortlists nobody until the player says so', () => {
    const { s, p, ines } = film('cd-advice');
    hire(s, p);
    const search = startSearch(s, p, ines, 'on-camera');
    expect(searchAdvice(p, search)).toEqual({ auditions: [], left: false });
    expect(() => shortlistAdvice(p, search.id)).toThrow('There is no advice to take yet.');
    wait(s, AUDITION_NOTICE_DAYS + 4);
    const st = searchStatus(p, search);
    expect(st.done).toBe(true);
    expect(st.seen + st.declined + st.missed).toBe(st.invited);
    const advice = searchAdvice(p, search).auditions;
    expect(advice.length).toBe(Math.min(3, st.seen));
    // Best reading first, by the middle of the range shown.
    const mid = (a: { read?: [number, number] }) => (a.read![0] + a.read![1]) / 2;
    expect(advice.map(mid)).toEqual([...advice.map(mid)].sort((a, b) => b - a));
    expect(p.auditions!.some((a) => a.shortlisted)).toBe(false);
    expect(p.cast.some((c) => c.characterId === ines)).toBe(false);
    if (advice.length) {
      expect(shortlistAdvice(p, search.id)).toBe(advice.length);
      expect(p.auditions!.filter((a) => a.shortlisted).map((a) => a.id).sort()).toEqual(advice.map((a) => a.id).sort());
    }
    // Still nobody is offered the part: that is the player's to do.
    expect(p.hires.some((h) => h.kind === 'cast')).toBe(false);
    expect(searchLine(p, search, () => 'that day')).toMatch(/ ran a search on that day for \$[\d,]+: \d+ asked, \d+ read/);
  });

  it('adds a further search to their line, refuses one the production cannot pay for, and credits nobody who ran none', () => {
    const { s, p, ines } = film('cd-second');
    hire(s, p);
    const cd = castingDirector(p)!;
    expect(computeCredits(s, p).some((c) => c.roleId === 'casting-director')).toBe(false);
    startSearch(s, p, ines, 'on-camera');
    const marco = p.characters.find((c) => c.name === 'Marco')!.id;
    const before = ledgerTotals(p).available;
    startSearch(s, p, marco, 'on-camera');
    expect(ledgerTotals(p).available).toBe(before - searchFee(cd));
    expect(obligation(p, cd.obligationId!)).toMatchObject({ settled: 2 * searchFee(cd), amount: 2 * searchFee(cd) });
    expect(cd.daysWorked).toBe(4);
    // With nothing uncommitted, a third is refused before anyone is asked to read.
    wait(s, AUDITION_NOTICE_DAYS + 4);
    const left = ledgerTotals(p).available;
    p.obligations.push({ id: 'fixture', label: 'Fixture: everything else is committed', category: 'contingency', amount: left, state: 'reserved', settled: 0, postings: [] });
    const asked = p.auditions!.length;
    expect(() => startSearch(s, p, ines, 'on-camera')).toThrow(/^This search needs \$[\d,]+ more than .+'s agreement holds, but only \$0 is uncommitted\./);
    expect(p.auditions!.length).toBe(asked);
    expect(cd.daysWorked).toBe(4);
  });

  it('ends with them: a casting director who has left gives no advice, and the readings they arranged still happened', () => {
    const { s, p, ines } = film('cd-left');
    hire(s, p);
    const search = startSearch(s, p, ines, 'on-camera');
    wait(s, AUDITION_NOTICE_DAYS + 4);
    const cd = castingDirector(p)!;
    const paid = obligation(p, cd.obligationId!).settled;
    releaseHire(s, p, cd.id);
    // What they were paid stays paid, and the search they ran still credits them.
    expect(obligation(p, cd.obligationId!)).toMatchObject({ settled: paid, amount: paid, state: 'settled' });
    expect(computeCredits(s, p).filter((c) => c.roleId === 'casting-director').map((c) => c.contribution)).toEqual(['Casting Director']);
    expect(searchAdvice(p, search)).toEqual({ auditions: [], left: true });
    expect(searchStatus(p, search).done).toBe(true);
    expect(() => shortlistAdvice(p, search.id)).toThrow('There is no advice to take yet.');
    expect(searchRefusal(p, ines, 'on-camera')).toBe('Hire a casting director first (Crew, Casting And Performance).');
  });
});
