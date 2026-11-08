// Stage 11 of the gameplay-depth package: proposals that a well received delivery brings (SLATE-18-03).
import { describe, expect, it } from 'vitest';
import { DAY, OPPORTUNITY_DELAY_DAYS, OPPORTUNITY_DELIVER_DAYS, OPPORTUNITY_OPEN_DAYS, acceptOpportunity, declineOpportunity, processUntil, scheduleOpportunity } from '../src/engine';
import { deserialize, serialize } from '../src/engine/save';
import { stream } from '../src/engine/rng';
import type { GameState, Project } from '../src/engine/types';
import { buildProject, startLife } from './helpers';

function deliveredWith(tag: string, reception: number): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.quality = { overall: reception, reception }; // labelled fixture: the assessment made at delivery
  p.delivered = { at: s.now, runtimeMin: 10 };
  scheduleOpportunity(s, p);
  return { s, p };
}
const wait = (s: GameState, days: number) => processUntil(s, s.now + days * DAY, 'tick', 100_000);
/** Whether the rule says a proposal comes, read from the same stream the handler reads. */
const comes = (s: GameState, p: Project, reception: number) => reception >= 60 && stream(s.seed, 'opportunity', p.id)() <= (reception - 55) / 32;

describe('a proposal after a delivery', () => {
  it('comes only for well received work, decided by reception and the world seed, and at most once', () => {
    const outcomes = new Set<boolean>();
    for (const reception of [40, 59, 62, 70, 78, 90]) {
      for (let i = 0; i < 6; i++) {
        const { s, p } = deliveredWith(`opp-${reception}-${i}`, reception);
        wait(s, OPPORTUNITY_DELAY_DAYS - 1);
        expect(s.opportunities ?? []).toEqual([]);
        wait(s, 2);
        const got = (s.opportunities ?? []).filter((o) => o.fromProjectId === p.id);
        expect(got.length).toBe(comes(s, p, reception) ? 1 : 0);
        if (reception < 60) expect(got.length).toBe(0);
        outcomes.add(got.length === 1);
        if (got.length) {
          expect(got[0].amount).toBe(Math.round((40_000 + (reception - 60) * 6000) / 1000) * 1000);
          expect(got[0].reason).toContain('Night Ferry');
          scheduleOpportunity(s, p); // a second chance for the same project brings nothing more
          wait(s, OPPORTUNITY_DELAY_DAYS + 1);
          expect((s.opportunities ?? []).filter((o) => o.fromProjectId === p.id).length).toBe(1);
        }
      }
    }
    expect([...outcomes].sort()).toEqual([false, true]);
  });

  it('lapses unanswered after its open days', () => {
    const { s } = firstWithProposal('opp-lapse');
    const o = s.opportunities![0];
    wait(s, OPPORTUNITY_OPEN_DAYS + 1);
    expect(o.status).toBe('lapsed');
    expect(() => acceptOpportunity(s, o.id, 'Too Late')).toThrow('That proposal is no longer open.');
  });

  it('accepted, starts a project funded by the commission with its delivery deadline; that project brings no proposal of its own', () => {
    const { s } = firstWithProposal('opp-accept');
    const o = s.opportunities![0];
    const q = acceptOpportunity(s, o.id, 'Second Crossing');
    expect(o.status).toBe('accepted');
    expect(o.projectId).toBe(q.id);
    expect(q.title).toBe('Second Crossing');
    expect(q.axes.format).toBe(o.format);
    const deal = q.finance!.deals.find((d) => d.backer === o.commissioner)!;
    expect(deal.status).toBe('accepted');
    expect(deal.amount).toBe(o.amount);
    expect(deal.terms.deliverBy).toBe(s.now + OPPORTUNITY_DELIVER_DAYS * DAY);
    expect(s.events.some((e) => e.kind === 'finance-deadline' && e.payload.projectId === q.id)).toBe(true);
    expect(() => acceptOpportunity(s, o.id, 'Again')).toThrow('That proposal is no longer open.');
    const before = s.events.length;
    scheduleOpportunity(s, q);
    expect(s.events.length).toBe(before);
    const back = deserialize(serialize(s));
    expect(back.opportunities).toEqual(s.opportunities);
    expect(back.projects.find((x) => x.id === q.id)!.fromOpportunity).toBe(o.id);
  });

  it('declined, is closed and starts nothing', () => {
    const { s } = firstWithProposal('opp-decline');
    const o = s.opportunities![0];
    const n = s.projects.length;
    declineOpportunity(s, o.id);
    expect(o.status).toBe('declined');
    expect(s.projects.length).toBe(n);
    expect(() => declineOpportunity(s, o.id)).toThrow('That proposal is no longer open.');
  });
});

/** The first world seed (by tag suffix) whose delivery at reception 90 draws a proposal. */
function firstWithProposal(tag: string): { s: GameState; p: Project } {
  for (let i = 0; i < 20; i++) {
    const r = deliveredWith(`${tag}-${i}`, 90);
    wait(r.s, OPPORTUNITY_DELAY_DAYS + 1);
    if (r.s.opportunities?.length) return r;
  }
  throw new Error('No seed drew a proposal.');
}
