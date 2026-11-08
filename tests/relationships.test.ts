// SLATE-18-02: a person's own history with you changes how they answer your offers; nothing else does.
import { describe, expect, it } from 'vitest';
import { COUNTER_OPEN_DAYS, DAY, declineCounter, historyWith, ledgerTotals, makeOffer, processUntil, recordHistory, releaseHire, resolveOffer, roleCandidates, willingness } from './engine-api';
import type { Project } from '../src/engine/types';
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
