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
import { planRelease } from '../../../src/engine/finish';
import { dateKey } from '../../../src/engine/time';

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

// An episode moved (season.ts moveEpisode): the episode a hired director directs, received better, put first. On
// broadcast each episode keeps the audience of the one before it (audiences.ts retention), so the better one first keeps
// more; on streaming what comes out first is watched longest (audiences.ts observeWeek).
const audienceOf = (p: Project, metric: 'hours' | 'viewers') => p.offers.flatMap((o) => o.audience ?? []).reduce((a, x) => a + (x.metric === metric ? x.value : 0), 0);
/**
 * Each day: the hired director given the episode the season was written to end on (the one holding its last scene),
 * wherever it now falls, and that episode given an extra cut pass. Until November 15, 2026 this proof moved a longer episode first, and which of two episodes is
 * received better wasn't settled by its length, so the audience moved both ways (21 of 40 careers aired).
 */
const lastScene = new WeakMap<Project, string>();
const directLast = (s: GameState) => {
  for (const p of live(s)) {
    const h = p.hires.find((x) => x.roleId === 'episode-director' && x.status === 'accepted');
    const last = p.scenes.find((x) => x.id === lastScene.get(p))?.episode;
    const e = p.episodes.find((x) => x.number === last);
    if (h && e && e.director !== h.personId) try { assignEpisodeRole(p, e.number, 'director', h.personId); } catch { /* not now */ }
    // And an extra cut pass on it as soon as its assembly allows (episode-delivery.ts startEpisodeCutPass).
    if (e && !cutOn.has(p)) try { startEpisodeCutPass(s, p, e.number); cutOn.add(p); } catch { /* not yet */ }
  }
};
const cutOn = new WeakSet<Project>();
/**
 * Each day, once a season is sold: its two episodes put out on the same calendar days in both arms, the 300th and 307th
 * of its year, so the weeks it airs in (audiences.ts weekCompetition, seasonFactor) are the same and only the order differs.
 */
const started = new WeakMap<GameState, number>();
const fixedDates = new WeakSet<object>();
const sameWeeks = (s: GameState) => {
  if (!started.has(s)) started.set(s, s.now);
  for (const p of s.projects) for (const r of p.releases.filter((x) => x.episodes?.length === 2 && x.status === 'planned' && !fixedDates.has(x))) {
    const year = Number(/Season (\d+)/.exec(p.title)?.[1] ?? 1) - 1;
    const day = (n: number) => dateKey(started.get(s)! + (year * 365 + n) * 86_400_000, 'UTC');
    try { setEpisodeDates(s, p, r.id, [day(300), day(307)]); fixedDates.add(r); } catch { /* past, or not now */ }
  }
};
/** The season with its second episode's last scene marked, and the most capable director offered the job. */
const directed = (move: boolean) => (s: GameState, p: Project) => {
  lastScene.set(p, p.scenes.filter((x) => x.episode === 2).at(-1)!.id);
  if (move) moveEpisode(p, 2, -1);
  hireDirector(s, p);
};
PROBES.push({
  id: 'move-episode', features: ['action:season.moveEpisode'], decision: 'Put the episode a hired director directs, and cuts again, first',
  reads: ['src/engine/season.ts#moveEpisode', 'src/engine/audiences.ts#observeWeek'],
  // Only a season that airs has an audience to move: about half do.
  seeds: 120,
  base: { ...SERIES, decide: directed(false), daily: both(SERIES.daily, directLast, sameWeeks) }, variant: { ...SERIES, decide: directed(true), daily: both(SERIES.daily, directLast, sameWeeks) },
  measure: (_s, projects) => ({
    firstEpisodeDirected: projects.filter((p) => { const e = p.episodes.find((x) => x.number === 1); return !!e?.director && e.director !== 'player'; }).length,
    // Streaming hours (each episode's from its own first day) and broadcast viewers (each kept from the one before), apart.
    hours: projects.reduce((a, p) => a + audienceOf(p, 'hours'), 0),
    viewers: projects.reduce((a, p) => a + audienceOf(p, 'viewers'), 0),
    renewed: projects.filter((p) => p.renewal?.outcome === 'renewed').length,
  }),
  bites: ['firstEpisodeDirected'], downstream: ['hours', 'viewers', 'renewed'],
});

// A season streamed by you (finish.ts planRelease) can be planned once an episode is delivered (episode-delivery.ts),
// not only the whole season: each day, a release a week on is tried for every season not yet released, so a first
// episode delivered on its own comes out before the rest are finished.
const streamSoon = (s: GameState) => {
  for (const p of s.projects.filter((x) => !x.shelved && !x.releases.some((r) => r.status !== 'cancelled'))) {
    try { planRelease(s, p, { route: 'streaming', date: addDaysToKey(dateKey(s.now, 'Europe/London'), 7), territories: ['GB'] }); } catch { /* nothing delivered yet */ }
  }
};
const DAY_MS = 86_400_000;
PROBES.push({
  id: 'deliver-episode-release', features: ['action:episode-delivery.lockEpisode', 'action:episode-delivery.deliverEpisode'], decision: 'Lock and deliver episode 1 before the rest, and stream the season as soon as it can be',
  reads: ['src/engine/episode-delivery.ts#deliverEpisode', 'src/engine/finish.ts#planRelease'],
  base: { ...SERIES, release: false, daily: streamSoon }, variant: { ...SERIES, release: false, daily: both(streamSoon, deliverOne) },
  measure: (s, projects) => ({
    ...measure(s, projects),
    // How long after each season was made its first episode came out.
    firstOut: projects.reduce((a, p) => { const at = p.releases.flatMap((r) => (r.episodes ?? []).filter((e) => e.status === 'released').map((e) => Date.parse(`${e.date}T12:00:00Z`))).sort((x, y) => x - y)[0]; return a + (at ? (at - Number(p.createdAt)) / DAY_MS : 0); }, 0),
    episodesOut: projects.reduce((a, p) => a + p.releases.reduce((b, r) => b + (r.episodes ?? []).filter((e) => e.status === 'released').length, 0), 0),
  }),
  bites: ['episodesDeliveredAlone'], downstream: ['firstOut', 'episodesOut'],
});

