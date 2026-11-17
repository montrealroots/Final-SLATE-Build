// A season planned as the last (the v6 package, J10: "renewal versus planned ending"; from November 17, 2026). Until then
// a player's commissioned series always went to the commissioner's renewal decision. A season you plan as the series'
// last ends as planned: nobody decides on another, and none is made. The plan can be dropped until the commissioner
// would decide. Each case changes only the plan and reads the outcome.
import { describe, expect, it } from 'vitest';
import { DAY, RENEWAL_DECISION_DAYS, processUntil, scheduleRenewal } from './engine-api';
import { continueProject } from '../src/engine/sequel';
import { planFinalSeason, finalSeasonRefusal } from '../src/engine/continuation';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function commissioned(tag: string, overall = 72): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Tidewater', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 20 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }],
    [{ place: 'Pier', chars: ['Mara'], minutes: 2, extra: { episode: 1 } }, { place: 'Lighthouse', chars: ['Mara'], minutes: 2, extra: { episode: 2 } }]);
  approve(s, p);
  // Labelled fixtures: a commissioner's accepted agreement, and the assessment made at delivery.
  p.finance = { estimate: 1, target: 1, deals: [{ id: 'fd1', kind: 'commissioner', backer: 'A Broadcaster', amount: 900_000, status: 'accepted', askedAt: 0, reason: '', received: 900_000, repaid: 0, terms: { recoup: 0, incomeShare: 0, approvalRights: [], credit: null, onDelivery: 0, deliverBy: null } }] } as never;
  p.quality = { overall } as Record<string, number>;
  return { s, p };
}
const decide = (s: GameState, p: Project) => { p.delivered = { at: s.now, runtimeMin: 40 }; scheduleRenewal(s, p); processUntil(s, s.now + (RENEWAL_DECISION_DAYS + 1) * DAY, 'tick', 100000); };

describe('a season planned as the last', () => {
  it('ends as planned: the commissioner who would have renewed it decides nothing, and no next season can be made', () => {
    const renewed = commissioned('final-control');
    decide(renewed.s, renewed.p);
    expect(renewed.p.renewal?.outcome).toBe('renewed');

    const { s, p } = commissioned('final-planned');
    planFinalSeason(s, p, true);
    decide(s, p);
    expect(p.renewal?.outcome).toBe('ended');
    expect(p.renewal?.reason).toMatch(/^Tidewater ended as you planned/);
    expect(() => continueProject(s, p)).toThrow('You planned this season as the last.');
  });

  it('can be dropped before the commissioner decides, and the decision is theirs again', () => {
    const { s, p } = commissioned('final-dropped');
    planFinalSeason(s, p, true);
    planFinalSeason(s, p, false);
    decide(s, p);
    expect(p.renewal?.outcome).toBe('renewed');
  });

  it('is refused for a film, and once the commissioner has decided', () => {
    const film = startLife('final-film');
    const f = buildProject(film, { title: 'One Night', format: 'short', medium: 'live-action', runtime: 8 }, [{ name: 'Ada' }], [{ place: 'Pier', chars: ['Ada'], minutes: 2 }]);
    expect(finalSeasonRefusal(f)).toBe('Only a series has seasons to end.');
    const { s, p } = commissioned('final-late');
    decide(s, p);
    expect(finalSeasonRefusal(p)).toBe('The commissioner has already decided on another season.');
    expect(() => planFinalSeason(s, p, true)).toThrow('The commissioner has already decided on another season.');
  });
});
