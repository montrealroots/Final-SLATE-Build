// Delivering a series an episode at a time (November 10, 2026, after #59): a finished episode is cut, locked, delivered
// and released while a later one is still being shot; an episode whose day comes before its delivery is held back and
// rescheduled; the season is still delivered whole at the end. Engine run: the shoot, post and work are the game's own.
// Labelled fixture: the money is agreed up front (helpers.ts buildProject uses agreedFunding), as other engine journeys do.
import { describe, expect, it } from 'vitest';
import { DAY, airings, approvedScenes, deliver, planRelease, processUntil, setEpisodeDates } from '../src/engine';
import { deliverEpisode, episodeDeliveryBlockers, episodeLockBlockers, episodeWork, lockEpisode, startEpisodeCutPass } from '../src/engine/episode-delivery';
import { approveDraft, saveDraft } from '../src/engine/projects';
import { cutFromEdit } from '../src/engine/finish';
import { unlockPicture } from '../src/engine/edit-actions';
import { dateKey, addDaysToKey } from '../src/engine/time';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, castAll, manage, staffAll, startLife, startProduction } from './helpers';

/** A two-episode drama: a short first episode, and a second with three places to shoot. */
function season(tag: string): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Grey Water', format: 'series', medium: 'live-action', episodes: 2, runtime: 40 }, [{ name: 'Maya', patch: { roleSize: 'lead' } }], [
    { place: 'Harbour', chars: ['Maya'], minutes: 6, extra: { episode: 1 } },
    { place: 'Lighthouse', chars: ['Maya'], minutes: 10, extra: { episode: 2 } },
    { place: 'Quarry', chars: ['Maya'], minutes: 10, extra: { episode: 2 } },
    { place: 'Chapel', chars: ['Maya'], minutes: 10, extra: { episode: 2 } },
  ]);
  approve(s, p);
  staffAll(s, p);
  castAll(s, p);
  processUntil(s, s.now + 3 * DAY, 'tick', 100_000);
  startProduction(s, p, 5);
  return { s, p };
}
const today = (s: GameState) => dateKey(s.now, 'Europe/London');

/** Days pass, with the producer's routine (helpers.ts manage), cutting, locking and delivering episode 1 as soon as each is possible. */
function untilEpisodeOneDelivered(s: GameState, p: Project): { episodeTwoStillOpen: string[] } {
  for (let i = 0; i < 200; i++) {
    if (!p.episodeDeliveries?.[1]) {
      if (p.tasks.find((t) => t.id === 'post:assembly:1')?.status === 'done' && !p.edit.lockedEpisodes?.includes(1) && !p.edit.pictureLocked && !(p.edit.episodeCutPasses?.[1]) && !p.tasks.some((t) => t.kind === 'post:cutpass-ep')) startEpisodeCutPass(s, p, 1);
      if (!episodeLockBlockers(p, 1).length && !p.edit.pictureLocked) lockEpisode(s, p, 1);
      if (!episodeDeliveryBlockers(p, 1).length) { deliverEpisode(s, p, 1); return { episodeTwoStillOpen: episodeDeliveryBlockers(p, 2) }; }
    }
    manage(s, p);
    processUntil(s, s.now + DAY, 'tick', 100_000);
  }
  throw new Error(`Episode 1 was never ready: ${episodeDeliveryBlockers(p, 1).join(' ')}`);
}

describe('a series delivered an episode at a time', () => {
  it('episode 1 is cut, locked and delivered while episode 2 is still being made; its work is its own and what it shares', () => {
    const { s, p } = season('roll-one');
    const own = episodeWork(p, 1).map((t) => t.id);
    expect(own).toContain('post:mix:1');
    expect(own.some((id) => id.endsWith(':2'))).toBe(false); // episode 2's own work doesn't hold episode 1 back
    const ep2Scenes = new Set(approvedScenes(p).filter((x) => x.episode === 2).map((x) => x.id));
    expect(episodeWork(p, 1).some((t) => t.sceneIds.some((id) => ep2Scenes.has(id)))).toBe(false);
    const { episodeTwoStillOpen } = untilEpisodeOneDelivered(s, p);
    expect(p.delivered).toBeNull();
    expect(p.episodeDeliveries![1].runtimeMin).toBe(6);
    expect(episodeTwoStillOpen.length).toBeGreaterThan(0);
    expect(s.log.some((l) => l.text === 'Episode 1 of Grey Water is delivered. It runs 6 minutes; later episodes are still being made.')).toBe(true);
    // A delivered episode is final: its picture, its scenes and its place in the edit.
    expect(() => unlockPicture(s, p)).toThrow();
    const ep1 = approvedScenes(p).find((x) => x.episode === 1)!;
    expect(() => cutFromEdit(s, p, ep1.id)).toThrow();
    const d = saveDraft(s, p);
    d.scenes.find((x) => x.id === ep1.id)!.estMinutes = 9;
    expect(() => approveDraft(s, p, d.number)).toThrow("Episode 1 is delivered, so its scenes can't change. Change only episodes still being made.");
  }, 120_000);

  it('releases what is delivered, holds back what is not and says so, then releases it on a new day; the season is delivered whole at the end', () => {
    const { s, p } = season('roll-two');
    untilEpisodeOneDelivered(s, p);
    const tomorrow = addDaysToKey(today(s), 1);
    const r = planRelease(s, p, { route: 'streaming', date: tomorrow, territories: ['GB'], episodeDates: [tomorrow, addDaysToKey(tomorrow, 1)] });
    processUntil(s, s.now + 3 * DAY, 'tick', 100_000);
    expect(r.episodes!.map((e) => `${e.status}${e.held ? ':held' : ''}`)).toEqual(['released', 'planned:held']);
    expect(s.log.some((l) => l.text === "Episode 2 of Grey Water isn't delivered, so it didn't come out today on streaming. Choose a new day on the Release tab.")).toBe(true);
    expect(airings(p)[1].held).toBe(true); // no airing until it has a new day
    expect(setEpisodeDates.bind(null, s, p, r.id, r.episodes!.map((e) => e.date))).toThrow(/Episode 2 wasn't delivered in time for .*Choose a new day for it\./);
    // Saved and opened again mid-season: the same.
    const back = deserialize(serialize(s));
    expect(back.projects.find((x) => x.id === p.id)!.releases[0].episodes!.map((e) => !!e.held)).toEqual([false, true]);
    // Episode 2 is finished; delivered; given a day; out on it. Then the whole season.
    for (let i = 0; i < 200 && episodeDeliveryBlockers(p, 2).length; i++) {
      if (p.tasks.find((t) => t.id === 'post:assembly:2')?.status === 'done' && !p.edit.lockedEpisodes?.includes(2) && !p.tasks.some((t) => t.kind.startsWith('post:cutpass') && t.status !== 'done') && !(p.edit.episodeCutPasses?.[2])) startEpisodeCutPass(s, p, 2);
      if (!episodeLockBlockers(p, 2).length) lockEpisode(s, p, 2);
      manage(s, p);
      processUntil(s, s.now + DAY, 'tick', 100_000);
    }
    deliverEpisode(s, p, 2);
    const day = addDaysToKey(today(s), 2);
    setEpisodeDates(s, p, r.id, [r.episodes![0].date, day]);
    expect(r.episodes![1].held).toBeUndefined();
    processUntil(s, s.now + 4 * DAY, 'tick', 100_000);
    expect(r.episodes!.map((e) => e.status)).toEqual(['released', 'released']);
    expect(s.log.filter((l) => /^Episode 2 of Grey Water is out today/.test(l.text)).length).toBe(1);
    for (let i = 0; i < 30 && p.tasks.some((t) => t.status !== 'done'); i++) { manage(s, p); processUntil(s, s.now + DAY, 'tick', 100_000); }
    deliver(s, p);
    expect(p.delivered).not.toBeNull();
    expect(p.credits.length).toBeGreaterThan(0);
    expect(p.episodeDeliveries![1].at).toBeLessThan(p.episodeDeliveries![2].at); // the history of when each was ready stays
  }, 180_000);

  it('a release can only be planned once something is delivered, and says so', () => {
    const { s, p } = season('roll-none');
    expect(() => planRelease(s, p, { route: 'streaming', date: addDaysToKey(today(s), 5), territories: ['GB'] })).toThrow('Deliver the season, or at least one episode, before planning a release.');
  });
});
