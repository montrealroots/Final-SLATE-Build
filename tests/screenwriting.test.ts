import { attachSong, createSong } from '../src/engine/song-actions';
import { describe, expect, it } from 'vitest';
import {
  addNote, assessQuality, buildTasks, estimatedShootDays, neededRoles, noteFromIssue, processUntil, scriptIssues, setNoteStatus, startRevision,
} from '../src/engine';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife } from './helpers';

const script = (s: GameState, p: Project) => assessQuality(s, p).script;
const revise = (s: GameState, p: Project) => {
  const { endsAt } = startRevision(s, p);
  processUntil(s, endsAt + 60_000, 'tick', 100_000);
};

function mystery(tag: string) {
  const s = startLife(tag);
  const p = buildProject(s, { title: 'The Quiet Ledger', format: 'short', medium: 'live-action', genres: ['mystery'], runtime: 10 },
    [{ name: 'Vera', patch: { roleSize: 'lead' } }, { name: 'Clerk' }],
    [{ place: 'Archive', chars: ['Vera', 'Clerk'], minutes: 3 }, { place: 'Street', chars: ['Vera'], minutes: 3, intExt: 'EXT' }]);
  approve(s, p);
  return { s, p };
}

describe('modeled script quality cannot be manufactured', () => {
  it('filling every text field with anything moves the score only a little, and not to excellent', () => {
    const { s, p } = mystery('sw-text');
    for (const sc of p.scenes) sc.objective = '';
    const before = script(s, p);
    for (const sc of p.scenes) sc.objective = 'x';
    for (const k of Object.keys(p.story) as (keyof Project['story'])[]) p.story[k] = 'lorem ipsum';
    p.genreNotes = Object.fromEntries(['q1', 'q2', 'q3', 'q4'].map((k) => [k, 'whatever']));
    approve(s, p);
    const after = script(s, p);
    expect(after - before).toBeLessThanOrEqual(10);
    expect(after).toBeLessThan(75);
  });

  it('your own notes and repeated revision passes add nothing', () => {
    const { s, p } = mystery('sw-passes');
    const before = script(s, p);
    for (let round = 0; round < 3; round++) {
      for (let i = 0; i < 4; i++) setNoteStatus(p, addNote(s, p, `Make it better ${round}-${i}`, 'pacing', null).id, 'accepted');
      revise(s, p);
    }
    expect(p.revisionPasses).toBe(3);
    expect(script(s, p)).toBe(before);
  });

  it('a readiness check counts only once revised and actually resolved in the script', () => {
    const { s, p } = mystery('sw-ready');
    const issue = scriptIssues(p).find((i) => i.severity === 'note' && i.text === 'Add the clues your audience can follow.');
    expect(issue).toBeDefined();
    const n = noteFromIssue(s, p, issue!.text);
    expect(() => noteFromIssue(s, p, issue!.text)).toThrow('already in your revision notes');
    expect(() => noteFromIssue(s, p, 'Something the script does not have.')).toThrow('no longer applies');
    const before = script(s, p);
    setNoteStatus(p, n.id, 'accepted');
    revise(s, p);
    expect(p.notes.find((x) => x.id === n.id)!.status).toBe('addressed');
    expect(script(s, p)).toBe(before); // marked addressed, but the script still has the problem
    // Fix it in the script: a clue planted in the archive and paid off in the street.
    p.setups.push({ id: 'su1', kind: 'clue', label: 'The torn receipt', plantedIn: p.scenes[0].id, paidIn: p.scenes[1].id } as Project['setups'][number]);
    approve(s, p);
    expect(scriptIssues(p).some((i) => i.text === issue!.text)).toBe(false);
    expect(script(s, p)).toBeGreaterThan(before);
  });
});

describe('structured scene choices reach staffing, tasks, the schedule and the budget', () => {
  function oneScene(tag: string, extra: Record<string, unknown>) {
    const s = startLife(tag);
    const p = buildProject(s, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }],
      [{ place: 'Harbour', chars: ['Ines'], minutes: 6, intExt: 'EXT', extra }]);
    approve(s, p);
    return { s, p, roles: neededRoles(p, s).map((r) => r.roleId), tasks: buildTasks(p).map((t) => t.id), days: estimatedShootDays(p) };
  }

  it('the same scene with and without a stunt, water, a crowd, animals, or a licensed song', () => {
    const plain = oneScene('sw-plain', {});
    const cases: [string, Record<string, unknown>, string][] = [
      ['stunt', { stunts: 'Ines falls from the pier' }, 'stunt-coordinator'],
      ['water', { water: true }, 'marine-coordinator'],
      ['crowd', { crowd: 40 }, 'extras-casting'],
      ['animals', { animals: ['Dog'] }, 'animal-wrangler'],
      ['intimacy', { intimacy: true }, 'intimacy-coordinator'],
    ];
    expect(plain.roles).not.toEqual(expect.arrayContaining(cases.map((c) => c[2])));
    for (const [what, extra, role] of cases) {
      const v = oneScene(`sw-${what}`, extra);
      expect(v.roles, what).toContain(role); // staffing
      if (what !== 'intimacy') expect(v.days, what).toBeGreaterThanOrEqual(plain.days); // slower shooting
    }
    expect(oneScene('sw-stunt2', { stunts: 'Ines falls from the pier' }).tasks).toContain('prep:stunts:all'); // a rehearsal task
    // A licensed song is a work of the project's (songs.ts), used in the scene; its clearance is the music supervisor's.
    const ls = startLife('sw-song');
    const lp = buildProject(ls, { title: 'Harbour', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Harbour', chars: ['Ines'], minutes: 6, intExt: 'EXT' }]);
    const lights = createSong(ls, lp, { title: 'Harbour Lights', source: 'licensed', holder: 'Tidewater Music', writers: [{ name: 'Ada Brook', music: true, lyrics: true }] });
    attachSong(lp, lights.id, lp.scenes[0].id, 'background');
    approve(ls, lp);
    const song = { tasks: buildTasks(lp).map((t) => t.id), roles: neededRoles(lp, ls).map((r) => r.roleId) };
    expect(song.tasks).toContain('post:clearance:all'); // music clearance work for the music supervisor
    expect(song.roles).toContain('music-supervisor');
    expect(plain.tasks).not.toContain('post:clearance:all');
  });

  it('nothing is guessed from prose: describing a stunt in the action text changes nothing downstream', () => {
    const plain = oneScene('sw-prose-a', {});
    const prose = oneScene('sw-prose-b', { action: 'Ines leaps from the burning pier into the sea as a crowd of forty watches.' });
    expect(prose.roles.sort()).toEqual(plain.roles.sort());
    expect(prose.tasks.sort()).toEqual(plain.tasks.sort());
  });
});
