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
import { setEpisodeDates } from '../../../src/engine/episode-releases';
import { addDaysToKey } from '../../../src/engine/time';
import { moveEpisode } from '../../../src/engine/season';
import { addScene, updateScene } from '../../engine-api';

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
export const hireDirector = (s: GameState, p: Project) => {
  fund(s, p);
  const best = [...roleCandidates(s, p, 'episode-director')].sort((a, b) => b.capability - a.capability)[0];
  if (best) try { makeOffer(s, p, { personId: best.id, roleId: 'episode-director', dayRate: best.dayRate }); } catch { /* not this one */ }
};
export const assignDirector = (s: GameState) => {
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

// Episode dates (episode-releases.ts setEpisodeDates): a season sold to air, its episodes put out four weeks later than
// planned. The commissioner's renewal reads the weeks it is watched (continuation.ts season-decision), so it waits.
const moved = new WeakSet<object>();
const later = (s: GameState, day: number) => {
  SERIES.daily(s);
  for (const p of s.projects) for (const r of p.releases.filter((x) => x.episodes?.length && x.status === 'planned' && !moved.has(x))) {
    moved.add(r);
    try { setEpisodeDates(s, p, r.id, r.episodes!.map((e) => (e.status === 'released' ? e.date : addDaysToKey(e.date, 28)))); } catch { /* not now */ }
  }
  void day;
};
PROBES.push({
  id: 'episode-dates', features: ['action:episode-releases.setEpisodeDates'], decision: "Put a sold season's episodes out four weeks later than planned",
  reads: ['src/engine/episode-releases.ts#setEpisodeDates', 'src/engine/continuation.ts#handler:season-decision'],
  base: SERIES, variant: { ...SERIES, daily: later }, measure: (_s, projects) => ({
    episodesMoved: projects.reduce((a, p) => a + p.releases.filter((r) => r.pattern === 'custom').length, 0),
    renewalWait: projects.filter((p) => p.renewal && p.delivered).reduce((a, p) => a + (p.renewal!.decidedAt - p.delivered!.at) / 86_400_000, 0),
    renewed: projects.filter((p) => p.renewal?.outcome === 'renewed').length,
  }),
  bites: ['episodesMoved'], downstream: ['renewalWait', 'renewed', 'money'],
});

// An episode moved (season.ts moveEpisode): a season of a short first episode (one scene) and a long second (three),
// the long one moved first. Streaming hours fall week by week from each episode's own first day (audiences.ts
// observeWeek), so what comes out first is watched longest.
const uneven = (s: GameState, year: number): Project => {
  const p = SERIES.project(s, year);
  // The fixture's season, its second episode given a third scene of its own: six minutes, then nine.
  const ep2 = p.scenes.find((x) => x.episode === 2)!;
  const extra = addScene(s, p, 2);
  updateScene(p, extra.id, { heading: { intExt: 'INT', place: 'Boathouse', time: 'DAY' }, storyLocation: 'Boathouse', participants: [...ep2.participants], objective: 'Move the story forward.', action: 'Action.', estMinutes: 3 } as never);
  return p;
};
const audienceOf = (p: Project, metric: 'hours' | 'viewers') => p.offers.flatMap((o) => o.audience ?? []).reduce((a, x) => a + (x.metric === metric ? x.value : 0), 0);
PROBES.push({
  id: 'move-episode', features: ['action:season.moveEpisode'], decision: 'Put the longer episode first',
  reads: ['src/engine/season.ts#moveEpisode', 'src/engine/audiences.ts#observeWeek'],
  base: { ...SERIES, project: uneven }, variant: { ...SERIES, project: uneven, decide: (_s, p) => moveEpisode(p, 2, -1) },
  measure: (_s, projects) => ({
    firstEpisodeMinutes: projects.reduce((a, p) => a + p.scenes.filter((x) => x.episode === 1).reduce((b, x) => b + x.estMinutes, 0), 0),
    // Streaming hours (each episode's from its own first day) and broadcast viewers (each kept from the one before), apart.
    hours: projects.reduce((a, p) => a + audienceOf(p, 'hours'), 0),
    viewers: projects.reduce((a, p) => a + audienceOf(p, 'viewers'), 0),
    renewed: projects.filter((p) => p.renewal?.outcome === 'renewed').length,
  }),
  bites: ['firstEpisodeMinutes'], downstream: ['hours', 'viewers', 'renewed'],
});
