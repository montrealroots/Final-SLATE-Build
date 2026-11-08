// SLATE-18-02: a person's own history with you changes how they answer your offers; nothing else does.
import { describe, expect, it } from 'vitest';
import { COUNTER_OPEN_DAYS, DAY, addDaysToKey, dateKey, isWorkingDay, buildTasks, computeCredits, declineCounter, teamFor, historyWith, ledgerTotals, makeOffer, processUntil, recordHistory, releaseHire, resolveOffer, roleCandidates, willingness } from './engine-api';
import type { Project } from '../src/engine/types';
import { runWorkDay } from '../src/engine/production/workday';
import { approve, buildProject, startLife } from './helpers';

function project(tag: string) {
  const s = startLife(tag, 'gb-london');
  const p = buildProject(s, { title: 'Tidewater', format: 'short', medium: 'live-action', runtime: 6 }, [{ name: 'Ada', patch: { roleSize: 'supporting' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 3 }]);
  approve(s, p);
  p.funding.fund = 1_000_000; // labelled fixture: money for the offers
  return { s, p };
}
const answer = (s: ReturnType<typeof project>['s'], p: Project, personId: string, ratio: number) => {
  const person = roleCandidates(s, p, 'editor').find((x) => x.id === personId)!;
  const h = makeOffer(s, p, { personId, roleId: 'editor', dayRate: Math.round(person.dayRate * ratio) });
  resolveOffer(s, p, h);
  return h;
};

describe('working relationships', () => {
  it('someone who saw a project through with you takes a fair offer without haggling; a stranger may not', () => {
    const { s, p } = project('rel-done');
    const [friend, stranger] = roleCandidates(s, p, 'editor').filter((x) => x.experience >= 2);
    recordHistory(s, friend.id, { ...p, id: 'old', title: 'Old Film' }, 'Editor', 'completed'); // labelled fixture: an earlier project
    expect(willingness(s, friend.id)).toEqual({ minRatio: 0.9, refuses: false, reason: 'They worked with you on Old Film.' });
    expect(answer(s, p, friend.id, 0.9).status).toBe('accepted');
    expect(willingness(s, stranger.id).minRatio).toBeNull(); // nothing about anyone else changes them
  });

  it('letting someone go makes them ask for more, and twice makes them refuse', () => {
    const { s, p } = project('rel-letgo');
    const ed = roleCandidates(s, p, 'editor').filter((x) => x.experience >= 2)[0];
    const h = answer(s, p, ed.id, 1);
    expect(h.status).toBe('accepted');
    releaseHire(s, p, h.id);
    expect(historyWith(s, ed.id).map((x) => x.kind)).toEqual(['let-go']);
    const again = answer(s, p, ed.id, 1);
    expect(again.status).toBe('countered');
    expect(again.counterRate).toBe(Math.round(ed.dayRate * 1.15));
    declineCounter(s, p, again.id);
    recordHistory(s, ed.id, p, 'Editor', 'let-go'); // labelled fixture: let go a second time
    expect(answer(s, p, ed.id, 1.5).status).toBe('declined');
  });

  it("turning down someone's counteroffer means they won't take less than their rate next time", () => {
    const { s, p } = project('rel-counter');
    const ed = roleCandidates(s, p, 'editor').filter((x) => x.experience >= 2)[1];
    const first = answer(s, p, ed.id, 0.8);
    expect(first.status).toBe('countered');
    declineCounter(s, p, first.id);
    const strict = answer(s, p, ed.id, 0.95);
    expect(strict.status).toBe('countered');
    strict.status = 'declined'; // labelled fixture: let the counter lapse without recording another refusal
    expect(answer(s, p, ed.id, 1).status).toBe('accepted');
  });
});

// SLATE-09-03: an unanswered counteroffer doesn't hold the part for good.
describe('a counteroffer left unanswered', () => {
  it('waits its open days, then lapses, releasing the money it held and the part', () => {
    const { s, p } = project('rel-lapse');
    const ed = roleCandidates(s, p, 'editor').filter((x) => x.experience >= 2)[0];
    const before = ledgerTotals(p).available;
    const h = answer(s, p, ed.id, 0.8); // below the rate, above the floor: a stranger counters
    expect(h.status).toBe('countered');
    expect(h.counterUntil).toBe(s.now + COUNTER_OPEN_DAYS * DAY);
    expect(ledgerTotals(p).available).toBeLessThan(before);
    processUntil(s, s.now + (COUNTER_OPEN_DAYS - 1) * DAY, 'tick', 100_000);
    expect(h.status).toBe('countered');
    processUntil(s, s.now + 2 * DAY, 'tick', 100_000);
    expect(h.status).toBe('declined');
    expect(ledgerTotals(p).available).toBe(before);
    expect(s.log.some((l) => l.text === `${ed.name}'s counteroffer for editor on Tidewater lapsed unanswered. The part is open again.`)).toBe(true);
    expect(historyWith(s, ed.id)).toEqual([]); // letting it lapse isn't turning them down
    expect(answer(s, p, ed.id, 1).status).toBe('accepted');
  });
});

// SLATE-10-05: a replacement takes over work in progress; nothing done is lost and both are credited for what they did.
describe('a handover mid-task', () => {
  it('releasing someone keeps the work they did and their credit; the replacement carries on from there', () => {
    const { s, p } = project('rel-handover');
    p.tasks = buildTasks(p); // as production start builds them
    const [first, second] = roleCandidates(s, p, 'editor').filter((x) => x.experience >= 2);
    const h1 = answer(s, p, first.id, 1.2);
    expect(h1.status).toBe('accepted');
    const task = p.tasks.find((t) => t.roleId === 'editor')!;
    task.done = 2; task.status = 'active'; h1.daysWorked = 2; // labelled fixture: two days of their work so far
    releaseHire(s, p, h1.id);
    expect(teamFor(p, 'editor', 1)).toEqual([]);
    expect(task.done).toBe(2);
    const h2 = answer(s, p, second.id, 1.2);
    expect(h2.status).toBe('accepted');
    expect(teamFor(p, 'editor', 1)).toEqual([second.id]);
    expect(task.done).toBe(2);
    const editors = computeCredits(s, p).filter((c) => c.roleId === 'editor').map((c) => c.person);
    expect(editors).toContain(first.id);
  });
});

// SLATE-10-04: someone covering two roles works one task a day, not both.
describe('a combined role', () => {
  it('an editor who also covers the grade works one of the two tasks each day, paid once', () => {
    const { s, p } = project('rel-combined');
    const ed = roleCandidates(s, p, 'editor').filter((x) => x.experience >= 2)[0];
    const h = answer(s, p, ed.id, 1.2);
    expect(h.status).toBe('accepted');
    const all = buildTasks(p);
    // Labelled fixture: the assembly and the grade both ready to work at once.
    p.tasks = ['editor', 'colorist'].map((r) => ({ ...all.find((t) => t.roleId === r)!, dependsOn: [], status: 'waiting' as const, done: 0, units: 5 }));
    expect(teamFor(p, 'colorist', 1)).toEqual([ed.id]); // the editor covers the grade
    const day = (n: number) => { let d = addDaysToKey(dateKey(s.now, 'Europe/London'), n); while (!isWorkingDay(p, d)) d = addDaysToKey(d, 1); return d; };
    runWorkDay(s, p, day(1));
    expect(p.tasks.reduce((a, t) => a + t.done, 0)).toBe(1);
    expect(h.daysWorked).toBe(1);
    runWorkDay(s, p, day(3));
    expect(p.tasks.reduce((a, t) => a + t.done, 0)).toBe(2);
    expect(h.daysWorked).toBe(2);
    // With the assembly finished, the same person works the grade: it was only ever waiting for them.
    const [cut, grade] = p.tasks;
    cut.done = cut.units; cut.status = 'done';
    const before = grade.done;
    runWorkDay(s, p, day(5));
    expect(grade.done).toBe(before + 1);
  });
});
