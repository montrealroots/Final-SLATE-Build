// SLATE-01-04.05: handing an episode's writing or directing to someone else keeps the authorship of work already done.
import { describe, expect, it } from 'vitest';
import { assignEpisodeRole, computeCredits, makeOffer, roleCandidates } from './engine-api';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

function series(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Tidewater', format: 'limited-series', medium: 'live-action', episodes: 2, runtime: 20 },
    [{ name: 'Mara' }], [{ place: 'Pier', chars: ['Mara'], extra: { episode: 1 } }, { place: 'Lighthouse', chars: ['Mara'], extra: { episode: 2 } }]);
  return { s, p };
}

/** Labelled fixture: an accepted episode writer or director. Hiring is tested elsewhere; the handover is under test. */
function hired(s: GameState, p: Project, roleId: 'episode-writer' | 'episode-director'): string {
  const who = roleCandidates(s, p, roleId)[0];
  const h = makeOffer(s, p, { personId: who.id, roleId, dayRate: who.dayRate });
  h.status = 'accepted';
  return who.id;
}

const writing = (s: GameState, p: Project) => computeCredits(s, p).filter((c) => c.contribution === 'Written By').map((c) => [c.person, c.episodes]);

describe('handing over an episode keeps who did the work', () => {
  it('a writer replaced after their draft was approved keeps the credit beside the new writer; before, they had none to keep', () => {
    const { s, p } = series('handover-write');
    approve(s, p);
    const pro = hired(s, p, 'episode-writer');
    // From November 11, 2026 a writer is handed an episode for a draft or a rewrite the player accepted (writing-jobs.ts).
    expect(() => assignEpisodeRole(p, 2, 'writer', pro)).toThrow("They haven't delivered a draft or a rewrite of it that you accepted.");
    // Labelled fixture: their accepted rewrite of episode 2, as commissioning, the work and acceptance would leave it.
    p.writing!.push({ id: 'w1', hireId: p.hires.find((h) => h.personId === pro)!.id, personId: pro, scope: 'rewrite', episode: 2, status: 'accepted', acceptedOn: '2026-02-02', passes: [{ days: 2, done: 2, askedOn: '2026-01-26', deliveredOn: '2026-01-28', read: 60 }] });
    assignEpisodeRole(p, 2, 'writer', pro);
    // You wrote the approved draft of both episodes: you stay credited on both, the new writer on episode 2.
    expect(writing(s, p)).toEqual([['player', [1, 2]], [pro, [2]]]);
    // Handing it back does not credit them for what they never wrote... unless their draft was approved meanwhile.
    assignEpisodeRole(p, 2, 'writer', 'player');
    expect(writing(s, p)).toEqual([['player', [1, 2]], [pro, [2]]]);
    expect(p.episodes[1].formerWriters).toEqual([pro]);
  });

  it('a director replaced after a day of their episode was shot keeps a directing credit; one with nothing shot does not', () => {
    const { s, p } = series('handover-direct');
    approve(s, p);
    const pro = hired(s, p, 'episode-director');
    const pro2 = roleCandidates(s, p, 'episode-director')[1];
    makeOffer(s, p, { personId: pro2.id, roleId: 'episode-director', dayRate: pro2.dayRate }).status = 'accepted';
    // Nothing shot: you hand episode 1 over and lose nothing you did, because you did nothing on it yet.
    assignEpisodeRole(p, 1, 'director', pro);
    expect(p.episodes[0].formerDirectors).toBeUndefined();
    // Labelled fixture: a shot day of episode 1, as a shoot would leave it.
    p.schedule.days.push({ id: 'd1', date: '2026-02-02', episode: 1, sceneIds: [], locationLabel: 'Pier', interior: false, night: false, status: 'shot', playerActing: false, conflicts: [] });
    assignEpisodeRole(p, 1, 'director', pro2.id);
    const directing = computeCredits(s, p).filter((c) => c.contribution === 'Directed By').map((c) => [c.person, c.episodes]);
    expect(directing).toEqual([['player', [2]], [pro2.id, [1]], [pro, [1]]]); // the director now first, then the one replaced
  });

  it('a delivered project can no longer be handed over, and only someone hired for it can take it', () => {
    const { s, p } = series('handover-rules');
    approve(s, p);
    expect(() => assignEpisodeRole(p, 1, 'director', 'np_actor_GB_0')).toThrow('Hire them as an episode director first.');
    expect(() => assignEpisodeRole(p, 9, 'writer', 'player')).toThrow('That episode no longer exists.');
    p.delivered = { at: s.now, runtimeMin: 40 };
    expect(() => assignEpisodeRole(p, 1, 'writer', 'player')).toThrow('This project has been delivered.');
  });
});
