// A series' own decisions (episode-delivery.ts, projects.ts): an extra cut pass on one episode, an episode locked and
// delivered before the rest, and an episode handed to a director the player hired. On the commissioned two-episode
// limited series the scheduled proofs use (scheduled.ts SERIES).
import type { Probe } from '../probe';
import type { GameState, Project } from '../../../src/engine/types';
import { SERIES } from './scheduled';
import { deliverEpisode, episodeDeliveryBlockers, episodeLockBlockers, episodeLocked, startEpisodeCutPass, lockEpisode } from '../../../src/engine/episode-delivery';
import { assignEpisodeRole } from '../../../src/engine/projects';
import { makeOffer, roleCandidates } from '../../../src/engine/hiring';
import { fund } from './casting';

const live = (s: GameState) => s.projects.filter((p) => !p.delivered && !p.shelved);
const both = (...fns: ((s: GameState, day: number) => void)[]) => (s: GameState, day: number) => { for (const f of fns) f(s, day); };
/** Once per project: an extra cut pass on episode 1 as soon as its assembly allows. */
const cutPassOne = () => { const done = new WeakSet<Project>(); return (s: GameState) => {
  for (const p of live(s)) if (!done.has(p)) { try { startEpisodeCutPass(s, p, 1); done.add(p); } catch { /* not yet */ } }
}; };
/** Episode 1 locked and delivered on its own, as soon as each is allowed. */
const deliverOne = (s: GameState) => {
  for (const p of live(s)) {
    if (!episodeLocked(p, 1) && !episodeLockBlockers(p, 1).length) try { lockEpisode(s, p, 1); } catch { /* not yet */ }
    if (episodeLocked(p, 1) && !p.episodeDeliveries?.[1] && !episodeDeliveryBlockers(p, 1).length) try { deliverEpisode(s, p, 1); } catch { /* not yet */ }
  }
};
/** Before the money is raised: the best episode director asked at their rate; once they accept, episode 2 is theirs. */
const hireDirector = (s: GameState, p: Project) => {
  fund(s, p);
  const best = [...roleCandidates(s, p, 'episode-director')].sort((a, b) => b.capability - a.capability)[0];
  if (best) try { makeOffer(s, p, { personId: best.id, roleId: 'episode-director', dayRate: best.dayRate }); } catch { /* not this one */ }
};
const assignDirector = (s: GameState) => {
  for (const p of live(s)) {
    const h = p.hires.find((x) => x.roleId === 'episode-director' && x.status === 'accepted');
    const e = p.episodes.find((x) => x.number === 2);
    if (h && e && e.director !== h.personId) try { assignEpisodeRole(p, 2, 'director', h.personId); } catch { /* not now */ }
  }
};

const measure = (_s: GameState, projects: Project[]) => ({
  episodeCutPasses: projects.reduce((a, p) => a + Object.values(p.edit.episodeCutPasses ?? {}).reduce((b, n) => b + n, 0), 0),
  episodesDeliveredAlone: projects.reduce((a, p) => a + Object.keys(p.episodeDeliveries ?? {}).length, 0),
  directedByHire: projects.reduce((a, p) => a + p.episodes.filter((e) => e.director && e.director !== 'player').length, 0),
});
const daily = SERIES.daily as (s: GameState, day: number) => void;

export const PROBES: Probe[] = [
  {
    id: 'episode-cut-pass', features: ['action:episode-delivery.startEpisodeCutPass'], decision: 'Give episode 1 a cut pass of its own',
    reads: ['src/engine/episode-delivery.ts#startEpisodeCutPass', 'src/engine/finish.ts#assessQuality'],
    base: SERIES, variant: { ...SERIES, daily: both(daily, cutPassOne()) }, measure,
    bites: ['episodeCutPasses'], downstream: ['quality.editing', 'spent', 'daysToDeliver'],
  },
  {
    id: 'deliver-episode', features: ['action:episode-delivery.lockEpisode', 'action:episode-delivery.deliverEpisode'], decision: 'Lock and deliver episode 1 before the rest',
    reads: ['src/engine/episode-delivery.ts#deliverEpisode', 'src/engine/episode-delivery.ts#lockEpisode'],
    base: SERIES, variant: { ...SERIES, daily: both(daily, deliverOne) }, measure,
    bites: ['episodesDeliveredAlone'], downstream: ['releaseDelay', 'revenue', 'daysToDeliver'],
  },
  {
    id: 'episode-director', features: ['action:projects.assignEpisodeRole'], decision: 'Hire the best episode director and give them episode 2',
    reads: ['src/engine/projects.ts#assignEpisodeRole', 'src/engine/finish.ts#assessQuality'],
    base: { ...SERIES, decide: (s, p) => hireDirector(s, p) }, variant: { ...SERIES, decide: (s, p) => hireDirector(s, p), daily: both(daily, assignDirector) }, measure,
    bites: ['directedByHire'], downstream: ['quality.direction', 'overall', 'spent'],
  },
];
