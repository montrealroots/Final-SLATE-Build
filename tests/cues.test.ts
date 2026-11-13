// A project's music brief and cue plan (engine/cues.ts; the v4 package, 03; ledger V4-023, V4-025). Each comparison
// changes one input and reads what the plan does with it.
import { describe, expect, it } from 'vitest';
import { FIT_PER_ROUND, OUT_OF_SYNC, UNDER_DIALOGUE, UNREVIEWED_FIT, applyBrief, approveThemes, editCue, giveThemeNotes, judgeScore, onThemesDone, proposeBrief, proposeCues, scoreMinutes, themesGate, timeCues } from '../src/engine/cues';
import { buildTasks } from '../src/engine/production/tasks';
import { neededRoles } from '../src/engine/hiring';
import { createSong, attachSong, syncMusicTasks } from '../src/engine/song-actions';
import type { GameState, Project } from '../src/engine/types';
import { approvedScenes } from '../src/engine/projects';
import { approve, buildProject, castAll, runDays, staffAll, startLife, startProduction } from './helpers';

/** Four scenes: a talky office, a night street, a quiet quay, a talky ending. */
function film(tag: string, over: { genres?: string[]; scenario?: string; storyYear?: number } = {}): { s: GameState; p: Project } {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'Cue Fixture', format: 'feature', medium: 'live-action', genres: over.genres ?? ['drama'], scenario: over.scenario }, [{ name: 'Wren' }, { name: 'Dale' }],
    [{ place: 'Office', chars: ['Wren', 'Dale'], minutes: 10 }, { place: 'Street', intExt: 'EXT', time: 'NIGHT', chars: ['Wren'], minutes: 8 }, { place: 'Quay', intExt: 'EXT', chars: ['Dale'], minutes: 6 }, { place: 'Kitchen', chars: ['Wren', 'Dale'], minutes: 10 }]);
  for (const i of [0, 3]) p.scenes[i].dialogue = Array.from({ length: 80 }, (_, k) => ({ id: `l${i}-${k}`, characterId: p.characters[k % 2].id, text: 'A line.' })) as Project['scenes'][number]['dialogue'];
  if (over.storyYear !== undefined) p.axes.storyYear = over.storyYear;
  approve(s, p);
  return { s, p };
}
const units = (p: Project, kind: string) => buildTasks(p).filter((t) => t.kind === kind).reduce((a, t) => a + t.units, 0);

describe('the brief', () => {
  it('is proposed from the genre, the period, the dialogue, the pace and the budget, and says why for each', () => {
    const drama = proposeBrief(film('cue-drama').p, 0);
    expect(drama).toMatchObject({ approach: 'score', style: 'chamber' });
    expect(drama.why.some((w) => /lines a minute/.test(w))).toBe(true);
    expect(proposeBrief(film('cue-thriller', { genres: ['thriller'] }).p, 0).style).toBe('percussive');
    expect(proposeBrief(film('cue-period', { genres: ['thriller'], storyYear: 1932 }).p, 0)).toMatchObject({ style: 'chamber', why: expect.arrayContaining([expect.stringMatching(/^Set in 1932/)]) });
    expect(proposeBrief(film('cue-micro', { genres: ['thriller'], scenario: 'micro' }).p, 0).style).toBe('synth');
    const { s, p } = film('cue-songs');
    const song = createSong(s, p, { title: 'Lantern', source: 'write' });
    attachSong(p, song.id, p.scenes[2].id, 'background', 2);
    expect(proposeBrief(p, 0).approach).toBe('mixed');
  });
});

describe('the cue plan', () => {
  it('scores the first and last scenes, then the ones that most want music, and gives each song its own cue', () => {
    const { s, p } = film('cue-plan');
    const song = createSong(s, p, { title: 'Lantern', source: 'write' });
    attachSong(p, song.id, p.scenes[2].id, 'background', 2);
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5 });
    const cues = p.music!.cues!;
    const scored = cues.filter((c) => c.source === 'score').map((c) => p.scenes.findIndex((x) => x.id === c.sceneId));
    expect(scored.sort()).toEqual([0, 3]); // two of four: the first and the last
    expect(cues.find((c) => c.source === 'song')).toMatchObject({ songId: song.id, layer: 'background', sceneId: p.scenes[2].id });
    expect(cues.map((c) => c.code)).toEqual(['1M1', '1M2', '1M3']);
    expect(p.axes.score).toBe(p.music!.brief!.style);
  });

  it('decides the composer\'s work: the minutes scored, not the running time; silence has none and needs no composer', () => {
    const { s, p } = film('cue-work');
    const noPlan = units(p, 'post:music');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.25 });
    const sparse = units(p, 'post:music');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.9 });
    const dense = units(p, 'post:music');
    expect(sparse).toBeLessThan(dense);
    expect(dense).toBeLessThan(noPlan); // even a dense plan scores less than every minute
    expect(scoreMinutes(p, 1)).toBeGreaterThan(0);
    applyBrief(s, p, { ...proposeBrief(p, s.now), approach: 'silence' });
    expect(buildTasks(p).some((t) => t.kind === 'post:music' || t.kind === 'post:score-session')).toBe(false);
    expect(neededRoles(p, s).some((r) => r.roleId === 'composer')).toBe(false);
  });

  it('a cue under dialogue adds to the mix', () => {
    const { s, p } = film('cue-mix');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.9 });
    p.music!.cues!.forEach((c) => { c.underDialogue = false; }); // labelled fixture: no cue under dialogue
    const before = units(p, 'post:mix');
    p.music!.cues!.forEach((c) => { c.underDialogue = true; }); // and then every one
    expect(units(p, 'post:mix')).toBeGreaterThan(before);
  });

  it('a scene whose length changes after the score is written is conformed alone; before it is written, cues just follow', () => {
    const { s, p } = film('cue-conform');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5 });
    const office = approvedScenes(p)[0]; // the script the production follows
    office.estMinutes = 12; // the cut changes before the score: nothing to conform
    expect(buildTasks(p).some((t) => t.kind === 'post:conform')).toBe(false);
    timeCues(p, 1); // the score is written
    office.estMinutes = 7; // and then the cut changes
    const conform = buildTasks(p).find((t) => t.kind === 'post:conform')!;
    expect(conform.sceneIds).toEqual([office.id]);
    expect(conform.units).toBe(0.5); // a quarter-day for the one cue, and no task is less than half a day
    expect(conform.units).toBeLessThan(units(p, 'post:music'));
    expect(buildTasks(p).find((t) => t.kind === 'post:mix')!.dependsOn).toContain(conform.id);
    timeCues(p, 1); // conformed
    expect(buildTasks(p).some((t) => t.kind === 'post:conform')).toBe(false);
  });

  it('keeps the player\'s changes through a new proposal, and a project with no brief scores its running time as before', () => {
    const { s, p } = film('cue-edit');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5 });
    const first = p.music!.cues![0];
    editCue(p, first.id, { intensity: 3 });
    p.music!.cues = proposeCues(s, p);
    expect(p.music!.cues.find((c) => c.id === first.id)?.intensity).toBe(3);
    editCue(p, first.id, { remove: true });
    expect(p.music!.cues.some((c) => c.id === first.id)).toBe(false);
    const old = film('cue-old').p;
    expect(scoreMinutes(old, 1)).toBeNull();
  });
});

describe('the score\'s own steps', () => {
  it('with a brief: spotting, themes, composition after both, and stems before the final mix', () => {
    const { s, p } = film('cue-steps');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5 });
    const tasks = buildTasks(p);
    const by = (id: string) => tasks.find((x) => x.id === id)!;
    expect(by('post:spotting:1').roleId).toBe('composer');
    expect(by('post:themes:all').dependsOn).toEqual(['post:spotting:1']);
    expect(by('post:music:1').dependsOn).toEqual(expect.arrayContaining(['post:spotting:1', 'post:themes:all']));
    expect(by('post:stems:1').dependsOn).toContain('post:music:1');
    expect(by('post:mix:1').dependsOn).toContain('post:stems:1');
    // Without a brief, none of it: the score is one task, as it was.
    const old = buildTasks(film('cue-steps-old').p);
    expect(old.some((x) => ['post:spotting', 'post:themes', 'post:stems'].includes(x.kind))).toBe(false);
  });

  it('the themes wait for you: approved, composition goes on; notes add a round of revision that comes back to you', () => {
    const { s, p } = film('cue-themes');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5 });
    expect(themesGate(p)).toBeNull(); // nothing written yet: the tasks before it hold composition
    onThemesDone(p, s.now);
    expect(themesGate(p)).toBe('Waiting for you to approve the themes, or give notes, on the Music page.');
    let rebuilt = 0;
    giveThemeNotes(p, 'Less brass; the harbour is quieter than this.', s.now, () => { rebuilt += 1; });
    expect(rebuilt).toBe(1);
    expect(themesGate(p)).toBe('The composer is revising the themes after your notes.');
    const rev = buildTasks(p).find((x) => x.kind === 'post:themes-revision')!;
    expect(rev).toMatchObject({ id: 'post:themes-revision:1', dependsOn: ['post:themes:all'] });
    expect(buildTasks(p).find((x) => x.id === 'post:music:1')!.dependsOn).toContain('post:themes-revision:1');
    onThemesDone(p, s.now);
    approveThemes(p, s.now);
    expect(themesGate(p)).toBeNull();
    expect(p.music!.themes).toMatchObject({ status: 'approved', rounds: 1, notes: ['Less brass; the harbour is quieter than this.'] });
    expect(() => approveThemes(p, s.now)).toThrow('There are no themes waiting for you.');
  });

  it('handed to the composer, the themes stand as written', () => {
    const { s, p } = film('cue-delegate');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5, delegateReview: true });
    onThemesDone(p, s.now);
    expect(p.music!.themes!.status).toBe('approved');
    expect(themesGate(p)).toBeNull();
  });

  it('a whole production stops at the themes until they are approved, then is delivered', () => {
    const { s, p } = film('cue-made');
    p.scenes.forEach((x) => { x.dialogue = []; }); // labelled fixture: quick to shoot
    p.drafts.at(-1)!.scenes.forEach((x) => { x.dialogue = []; });
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.25 });
    castAll(s, p);
    staffAll(s, p);
    runDays(s, p, 30);
    startProduction(s, p);
    for (let i = 0; i < 400 && p.music!.themes?.status !== 'awaiting'; i++) runDays(s, p, 1);
    expect(p.music!.themes?.status).toBe('awaiting');
    runDays(s, p, 5);
    expect(p.tasks.find((x) => x.id === 'post:music:1')).toMatchObject({ status: 'waiting', blockedReason: 'Waiting for you to approve the themes, or give notes, on the Music page.' });
    expect(p.delivered).toBeNull();
    approveThemes(p, s.now);
    runDays(s, p, 300);
    expect(p.delivered).not.toBeNull();
    expect(['post:spotting:1', 'post:themes:all', 'post:music:1', 'post:stems:1'].every((id) => p.tasks.find((x) => x.id === id)?.status === 'done')).toBe(true);
  }, 120_000);
});

describe('a brief taken once production has a task list', () => {
  it('adds the score\'s steps, and a silent brief drops score work not yet started; work done stays done', () => {
    const { s, p } = film('cue-sync');
    p.tasks = buildTasks(p); // labelled fixture: production planned before any brief
    expect(p.tasks.some((x) => x.kind === 'post:themes')).toBe(false);
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5 });
    syncMusicTasks(p);
    expect(['post:spotting:1', 'post:themes:all', 'post:stems:1'].every((id) => p.tasks.some((x) => x.id === id))).toBe(true);
    expect(p.tasks.find((x) => x.id === 'post:mix:1')!.dependsOn).toContain('post:stems:1');
    const spot = p.tasks.find((x) => x.id === 'post:spotting:1')!;
    spot.done = spot.units; spot.status = 'done'; // labelled fixture: spotting finished
    applyBrief(s, p, { ...proposeBrief(p, s.now), approach: 'silence' });
    syncMusicTasks(p);
    expect(p.tasks.some((x) => x.id === 'post:music:1' || x.id === 'post:themes:all')).toBe(false);
    expect(p.tasks.find((x) => x.id === 'post:spotting:1')?.status).toBe('done');
    expect(p.tasks.find((x) => x.id === 'post:mix:1')!.dependsOn).not.toContain('post:music:1');
  });
});

describe('how the score is judged', () => {
  it('a project with no brief is judged on the composer as before; silence and songs only have no score to judge', () => {
    const { s, p } = film('judge-none');
    expect(judgeScore(p, 70)).toEqual({ score: 70 * 0.9 + 5, execution: 68, fit: 0, sync: 0, dialogue: 0 });
    applyBrief(s, p, { ...proposeBrief(p, s.now), approach: 'silence' });
    expect(judgeScore(p, 70)).toBeNull();
    applyBrief(s, p, { ...proposeBrief(p, s.now), approach: 'songs' });
    expect(judgeScore(p, 70)).toBeNull();
  });

  it('reads the composer\'s capability for execution and nothing else about them', () => {
    const { s, p } = film('judge-exec');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.25 });
    expect(judgeScore(p, 80)!.execution - judgeScore(p, 60)!.execution).toBe(18);
    expect(judgeScore(p, 80)!.score - judgeScore(p, 60)!.score).toBe(18); // the rest doesn't move with who wrote it
  });

  it('a loud cue under dialogue costs the lines it covers; lowered, it costs nothing', () => {
    const { s, p } = film('judge-talk');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.9 });
    const talk = p.music!.cues!.filter((c) => c.source === 'score' && c.underDialogue);
    expect(talk.length).toBeGreaterThan(0);
    for (const c of talk) editCue(p, c.id, { intensity: 1 });
    const quiet = judgeScore(p, 60)!;
    expect(quiet.dialogue).toBe(0);
    editCue(p, talk[0].id, { intensity: 3 });
    expect(judgeScore(p, 60)!.dialogue).toBe(-UNDER_DIALOGUE.loud);
    expect(judgeScore(p, 60)!.score).toBe(quiet.score - UNDER_DIALOGUE.loud);
  });

  it('a cue left out of time by a changed scene is judged lower until it is conformed', () => {
    const { s, p } = film('judge-sync');
    applyBrief(s, p, { ...proposeBrief(p, s.now), density: 0.5 });
    timeCues(p, 1);
    const before = judgeScore(p, 60)!.score;
    const scored = p.music!.cues!.find((c) => c.source === 'score')!;
    approvedScenes(p).find((x) => x.id === scored.sceneId)!.estMinutes += 2;
    expect(judgeScore(p, 60)!.sync).toBe(-OUT_OF_SYNC);
    expect(judgeScore(p, 60)!.score).toBe(before - OUT_OF_SYNC);
    timeCues(p, 1);
    expect(judgeScore(p, 60)!.score).toBe(before);
  });

  it('themes you gave notes on come closer to the brief, two rounds counted; themes nobody reviewed stand as the composer read it', () => {
    const { s, p } = film('judge-fit');
    applyBrief(s, p, proposeBrief(p, s.now));
    onThemesDone(p, s.now);
    approveThemes(p, s.now);
    expect(judgeScore(p, 60)!.fit).toBe(0);
    for (const rounds of [1, 2, 3]) {
      p.music!.themes = { status: 'approved', rounds, notes: [], at: s.now };
      expect(judgeScore(p, 60)!.fit).toBe(FIT_PER_ROUND * Math.min(2, rounds));
    }
    p.music!.brief!.delegateReview = true;
    expect(judgeScore(p, 60)!.fit).toBe(UNREVIEWED_FIT);
  });
});
