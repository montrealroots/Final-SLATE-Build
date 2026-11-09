// Episode-specific assessment (finish.ts assessQuality with an episode, assessEpisodes; November 9, 2026). An entry for one
// episode used to be judged on the season's scores. Now it is judged on that episode's own work, locked at delivery, and
// two episodes differ only where their work differs.
import { describe, expect, it } from 'vitest';
import { assessEpisodes, assessQuality } from '../src/engine/finish';
import { personById } from '../src/engine/people';
import { EFFECTS_REVISION_GAIN } from '../src/engine/revisions';
import { checkEligibility, entryScore, institution, playerScore, submitEntry } from './engine-api';
import { approve, buildProject, startLife } from './helpers';
import type { GameState, Hire, Project } from '../src/engine/types';

/** The first generated person in a role whose capability is in a range (people are generated from the seed). */
function someone(s: GameState, role: string, min: number, max: number): string {
  for (let i = 1; i < 400; i++) {
    const id = `np_${role}_US_${i}`;
    const c = personById(s, id).capability;
    if (c >= min && c <= max) return id;
  }
  throw new Error(`no ${role} with capability ${min}-${max}`);
}

const hire = (id: string, personId: string, roleId: string, episodes: number[] | 'all'): Hire => ({
  id, personId, roleId, kind: 'crew', episodes, dayRate: 500, estDays: 5, status: 'accepted', offeredAt: 0, responseAt: 0, obligationId: null, daysWorked: 5,
});

/**
 * A two-episode drama (labelled fixture: captures, episode roles and hires set directly): Ines in both episodes, Marcus
 * only in the second; each episode one scene, captured at the given quality.
 */
function season(tag: string, q1 = 70, q2 = 70): { s: GameState; p: Project } {
  const s = startLife(tag, 'us-los-angeles');
  const p = buildProject(s, { title: 'Harbor Lights', format: 'series', medium: 'live-action', runtime: 30, episodes: 2 },
    [{ name: 'Ines', patch: { roleSize: 'lead' } }, { name: 'Marcus', patch: { roleSize: 'supporting' } }],
    [{ place: 'Harbor', chars: ['Ines'], minutes: 30 }, { place: 'Dock', chars: ['Ines', 'Marcus'], minutes: 30, extra: { episode: 2 } }]);
  approve(s, p);
  const [one, two] = p.scenes;
  // Its cast: two hired performers (labelled fixture).
  p.cast = p.characters.map((c, i) => ({ characterId: c.id, performer: `np_actor_US_${i + 1}`, method: 'on-camera' as const, note: '' }));
  p.captures.push({ sceneId: one.id, captured: 1, quality: q1, version: 1, weatherCompromised: false }, { sceneId: two.id, captured: 1, quality: q2, version: 1, weatherCompromised: false });
  return { s, p };
}

describe('an episode is assessed on its own work', () => {
  it('a stronger and a weaker episode differ where their footage differs, and only there; the same inputs give the same scores', () => {
    const { s, p } = season('ep-strong-weak', 85, 55);
    const [e1, e2] = [assessQuality(s, p, 1), assessQuality(s, p, 2)];
    // Direction is 0.7 of the footage's quality plus what both share: 30 points of footage is 21 of direction.
    expect(e1.direction - e2.direction).toBe(21);
    // Writing, crafts and music are shared here, so they are equal.
    expect(e1.script).toBe(e2.script);
    expect(e1.craft).toBe(e2.craft);
    expect(e1.music).toBe(e2.music);
    expect(assessQuality(s, p, 1)).toEqual(e1); // no draw per episode
    // Make the second episode's footage as good: the difference goes, because it followed the work.
    p.captures[1].quality = 85;
    expect(assessQuality(s, p, 2).direction).toBe(e1.direction);
  });

  it('who wrote and directed each episode counts for that episode; the season weighs them by running time', () => {
    const { s, p } = season('ep-roles');
    const before = { e1: assessQuality(s, p, 1), e2: assessQuality(s, p, 2), all: assessQuality(s, p) };
    const director = someone(s, 'episode-director', 80, 100);
    const writer = someone(s, 'episode-writer', 0, 45);
    p.hires.push(hire('h1', director, 'episode-director', [2]), hire('h2', writer, 'episode-writer', [2]));
    p.episodes[1].director = director;
    p.episodes[1].writer = writer;
    const after = { e1: assessQuality(s, p, 1), e2: assessQuality(s, p, 2), all: assessQuality(s, p) };
    const dGain = (personById(s, director).capability - 50) / 4;
    const wLoss = (personById(s, writer).capability - 50) / 4;
    expect(after.e1).toEqual(before.e1); // episode 1's people didn't change
    expect(Math.abs(after.e2.direction - (before.e2.direction + dGain))).toBeLessThanOrEqual(1);
    expect(after.e2.direction).toBeGreaterThan(before.e2.direction);
    expect(after.e2.script).toBeLessThan(before.e2.script);
    expect(Math.abs(after.e2.script - (before.e2.script + wLoss))).toBeLessThanOrEqual(1);
    // The season: half of each (two 30-minute episodes).
    expect(Math.abs(after.all.direction - (before.all.direction + dGain / 2))).toBeLessThanOrEqual(1);
  });

  it('crew hired for one episode count for it alone; crew for the season count for each; a performer only where they appear', () => {
    const { s, p } = season('ep-crew');
    const editor = someone(s, 'editor', 85, 100);
    const composer = someone(s, 'composer', 60, 100);
    p.hires.push(hire('h1', editor, 'editor', [1]), hire('h2', composer, 'composer', 'all'));
    const [e1, e2] = [assessQuality(s, p, 1), assessQuality(s, p, 2)];
    expect(e1['craft:editor']).toBeDefined();
    expect(e2['craft:editor']).toBeUndefined();
    expect(e1.editing).toBeGreaterThan(e2.editing);
    expect(e1['craft:composer']).toBe(e2['craft:composer']); // shared work counts for both
    expect(e1.music).toBe(e2.music);
    const marcus = p.characters.find((c) => c.name === 'Marcus')!.id;
    const keys = (q: Record<string, number>) => Object.keys(q).filter((k) => k.startsWith('performance:')).map((k) => k.split(':')[1]);
    expect(keys(e1)).not.toContain(marcus); // not in episode 1: nothing of his to assess
    expect(keys(e2)).toContain(marcus);
  });

  it('a revised episode changes alone: an effects revision of its scene lifts its direction, not the other\'s', () => {
    const { s, p } = season('ep-revised');
    const [e1, e2] = [assessQuality(s, p, 1), assessQuality(s, p, 2)];
    p.tasks.push({ id: `post:vfx-rev:${p.scenes[0].id}`, kind: 'post:vfx-rev', label: 'Revise', dept: 'Post Production', roleId: 'vfx-artist', units: 1, unitLabel: 'days', done: 1, dependsOn: [], status: 'done', episode: 1, sceneIds: [p.scenes[0].id], workedDays: 1 });
    expect(Math.abs(assessQuality(s, p, 1).direction - (e1.direction + EFFECTS_REVISION_GAIN * 0.7))).toBeLessThanOrEqual(1);
    expect(assessQuality(s, p, 2)).toEqual(e2);
  });
});

describe('entries for an episode are judged on that episode; whole-season categories on the season', () => {
  /** Delivered (labelled fixture): the season's and each episode's assessments as delivery locks them. */
  function delivered(tag: string) {
    const { s, p } = season(tag, 85, 50);
    p.quality = assessQuality(s, p);
    p.quality.reception = p.quality.overall;
    p.episodeQuality = assessEpisodes(s, p, p.quality);
    p.delivered = { at: s.now, runtimeMin: 60 };
    p.axes.episodeCount = 6; // a full season for the Emmys' six episodes; the first two are the ones assessed here
    p.credits = [{ id: 'd', person: 'player', personName: 'You', contribution: 'Directed By', roleId: 'director', episodes: [1, 2], billing: 1 }, { id: 'pr', person: 'player', personName: 'You', contribution: 'Executive Producer And Showrunner', roleId: 'producer', episodes: 'all', billing: 2 }];
    p.releases.push({ id: 'r1', route: 'streaming', date: '2026-03-01', territories: ['US'], distributor: 'D', note: '', status: 'released' });
    return { s, p };
  }

  it('directing entered for episode 1 and for episode 2 score their own direction; the drama series scores the season', () => {
    const { s, p } = delivered('ep-entries');
    const e = s.editions.find((x) => x.id === 'emmys-2026')!;
    const directing = institution('emmys').categories.find((c) => c.id === 'directing')!;
    const drama = institution('emmys').categories.find((c) => c.id === 'drama')!;
    expect(p.episodeQuality![1].direction).toBeGreaterThan(p.episodeQuality![2].direction);
    expect(playerScore(p, directing, ['d'], directing.judging, { episode: 1 })).toBe(p.episodeQuality![1].direction);
    expect(playerScore(p, directing, ['d'], directing.judging, { episode: 2 })).toBe(p.episodeQuality![2].direction);
    expect(playerScore(p, drama, ['pr'], drama.judging)).toBe(p.quality!.overall);
    // The reception carries over by the season's margin: no draw of its own.
    expect(p.episodeQuality![1].reception - p.episodeQuality![1].overall).toBe(p.quality!.reception - p.quality!.overall);
    // Entered, the snapshot keeps the episode's score and says where it came from.
    s.now = e.submissionOpens + 1;
    expect(checkEligibility(s, p, e, directing, undefined, undefined, 2).eligible).toBe(true);
    const entry = submitEntry(s, p, e.id, directing.id, undefined, undefined, 2);
    expect(entry.episode).toBe(2);
    expect(entry.snapshot).toMatchObject({ score: p.episodeQuality![2].direction, assessed: "Judged on episode 2's own work: its scenes, takes, writer, director, cast and crew." });
    // Later changes to the project don't rewrite what it is judged on.
    p.episodeQuality![2].direction = 99;
    expect(entryScore(p, directing, entry)).toBe(entry.snapshot!.score);
  });

  it('a project delivered before episodes were assessed apart is judged on the season, and says so', () => {
    const { s, p } = delivered('ep-old');
    delete p.episodeQuality;
    const directing = institution('emmys').categories.find((c) => c.id === 'directing')!;
    expect(playerScore(p, directing, ['d'], directing.judging, { episode: 2 })).toBe(p.quality!.direction);
    const e = s.editions.find((x) => x.id === 'emmys-2026')!;
    s.now = e.submissionOpens + 1;
    const entry = submitEntry(s, p, e.id, directing.id, undefined, undefined, 2);
    expect(entry.snapshot!.assessed).toBe("Judged on the whole season: Harbor Lights was delivered before episodes were assessed on their own, so episode 2's own work wasn't recorded.");
  });
});
