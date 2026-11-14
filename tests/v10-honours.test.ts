// Honours are recognition (from November 14, 2026, after the feature proofs found festival results reached no offer,
// rate or grade). A selection, nomination or win of the player's own work is an event in the role its category honours,
// worth a work scored 70, 80 or 95; it is never a completed work, so no grade's count is met by prizes alone.
import { describe, expect, it } from 'vitest';
import { HONOUR_SCORE, honourScores, standingFrom, standingIn } from '../src/engine/reputation';
import { institution } from '../src/engine/awards';
import { approve, buildProject, startLife } from './helpers';
import type { Edition } from '../src/engine/types';

describe('honours as recognition', () => {
  it('weighs a win above a nomination above a selection, and never counts one as a work', () => {
    expect(standingFrom('producing', [60], [HONOUR_SCORE.won]).standing).toBeGreaterThan(standingFrom('producing', [60], [HONOUR_SCORE.selected]).standing);
    expect(standingFrom('producing', [60], [HONOUR_SCORE.selected]).standing).toBeGreaterThan(standingFrom('producing', [60]).standing);
    expect(standingFrom('producing', [60], [95, 95, 95, 95]).works).toBe(1);
    expect(standingFrom('producing', [60], [95, 95, 95, 95]).grade).toBe('Emerging'); // Established needs two works
  });

  it('a won entry of the player\'s film raises their producing standing; a lost one doesn\'t', () => {
    const s = startLife('honours');
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ada', patch: { roleSize: 'lead' } }], [{ place: 'Pier', chars: ['Ada'], minutes: 4 }]);
    approve(s, p);
    // Labelled fixture: a delivered film and an edition's entry for it, in a category that honours the work.
    p.delivered = { at: s.now, runtimeMin: 10 }; p.phase = 'delivered'; p.quality = { reception: 60, script: 60, direction: 60 } as never;
    const ed = s.editions.find((e) => institution(e.institutionId).categories.some((c) => c.recipient === 'project'))!;
    const cat = institution(ed.institutionId).categories.find((c) => c.recipient === 'project')!;
    const before = standingIn(s, 'producing').standing;
    (ed as Edition).entries.push({ id: 'e1', projectId: p.id, categoryId: cat.id, status: 'lost', submittedAt: s.now, recipients: [], fee: 0 } as never);
    expect(standingIn(s, 'producing').standing).toBe(before);
    ed.entries[ed.entries.length - 1].status = 'won';
    expect(honourScores(s, 'producing')).toEqual([95]);
    expect(standingIn(s, 'producing').standing).toBeGreaterThan(before);
    expect(honourScores(s, 'directing')).toEqual([]); // a prize for the work isn't one for its direction
  });
});
