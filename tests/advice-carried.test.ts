// The player's words the game shows back as advice and never scores (structure.ts: "Advice only: nothing here blocks
// approval or scores"; finish.ts assessQuality: advisory prompts "neither cost nor earn"). Each reaches the advice or
// the plan it is written for. These are the matrix rows carried rather than proven (tests/v10-features.test.ts), from
// November 15, 2026.
import { describe, expect, it } from 'vitest';
import type { Project } from '../src/engine/types';
import { scriptIssues } from '../src/engine/projects';
import { structureNotes, threadCutConsequences } from '../src/engine/structure';
import { addResearch, researchNotes, updateResearch } from '../src/engine/research';
import { setSeriesPlan, updateWorldRule } from '../src/engine/season';
import { breakdownComplete, spokenMinutes } from '../src/engine/script-explain';
import { buildProject, startLife } from './helpers';

const film = (genres: string[] = ['drama']): Project => buildProject(startLife('advice'), { title: 'The Pier', format: 'short', medium: 'live-action', genres, runtime: 10 },
  [{ name: 'Mara', patch: { roleSize: 'lead' } }, { name: 'Ivo', patch: { roleSize: 'supporting' } }],
  [{ place: 'Pier', chars: ['Mara', 'Ivo'], minutes: 5 }, { place: 'Quay', chars: ['Mara'], minutes: 5 }]);
const texts = (p: Project) => scriptIssues(p).map((i) => i.text);

describe('words shown back as advice', () => {
  it('reach the advice they are written for, and are scored by nothing', () => {
    // A scene's objective, tonal intention and who is recording: each empty one is a note of advice, gone once written.
    const p = film(['comedy', 'found-footage']);
    const s = p.scenes[0];
    s.objective = '';
    const about = (t: string) => texts(p).filter((x) => x.includes(t) && x.startsWith('Scene 1')).length;
    expect(about('no stated objective')).toBe(1);
    expect(about('no tonal intention')).toBe(1);
    expect(about('in-story camera operator')).toBe(1);
    expect(scriptIssues(p).filter((i) => /objective|tonal intention|camera operator/.test(i.text)).every((i) => i.advisory)).toBe(true);
    Object.assign(s, { objective: 'Get the boat out before the storm.', tone: 'Dry, then sudden.', operator: 'Ivo, on his phone' });
    expect(about('no stated objective') + about('no tonal intention') + about('in-story camera operator')).toBe(0);

    // A line's words set how long it takes to say: shown as a guide.
    const q = film();
    q.scenes[0].dialogue = [{ id: 'l1', characterId: q.characters[0].id, text: 'Go.', language: 'en' }];
    const short = spokenMinutes(q.scenes[0]);
    q.scenes[0].dialogue[0].text = 'Go, and do not look back at the pier, whatever you hear behind you, whoever calls your name. '.repeat(20);
    expect(spokenMinutes(q.scenes[0])).toBeGreaterThan(short);

    // An act, a thread and how it ends, and a character's change in a scene: each shown in the structure advice.
    q.acts = [{ id: 'a1', name: 'The Storm' }];
    expect(structureNotes(q).map((n) => n.text)).toContain('The Storm has no scenes yet.');
    q.threads = [{ id: 't1', name: 'The Debt', characterIds: [], sceneIds: [q.scenes[0].id], resolution: 'resolves', resolvedIn: null }];
    expect(structureNotes(q).map((n) => n.text)).toContain('The thread "The Debt" has no resolving scene yet. Choose one, or mark it left open on purpose.');
    q.characters[0].beats = [{ id: 'b1', sceneId: q.scenes[0].id, change: 'she forgives him' }];
    expect(threadCutConsequences(q, q.scenes[0].id)).toContain("Mara changes here (she forgives him): cut, the audience doesn't see it.");

    // A research question, its reference and its status: an open question is advice on the scenes it informs.
    const s2 = startLife('research');
    const r = film();
    const note = addResearch(s2, r, 'Did the ferry run in winter?');
    updateResearch(r, note.id, { reference: 'Harbour timetable, 1961', sceneIds: [r.scenes[0].id] });
    expect(researchNotes(r).map((n) => n.text)).toContain('Scene 1 (Pier) rests on a question still open: Did the ferry run in winter?');
    expect(r.research![0].reference).toBe('Harbour timetable, 1961');
    updateResearch(r, note.id, { status: 'reviewed' });
    expect(researchNotes(r)).toEqual([]);

    // A casting breakdown goes with offers once its three parts are written; it changes who accepts nothing.
    const c = film().characters[0];
    expect(breakdownComplete(c)).toBe(false);
    Object.assign(c, { description: 'A lighthouse keeper.', wants: 'To keep the light.', fears: 'The automation.' });
    expect(breakdownComplete(c)).toBe(true);

    // A season's plan and its world rules: kept as written, and shown in the season plan.
    const show = buildProject(startLife('season'), { title: 'Lock Keepers', format: 'limited-series', medium: 'live-action', genres: ['drama'], episodes: 2, runtime: 20 },
      [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Lock', chars: ['Mara'], minutes: 3, extra: { episode: 1 } }, { place: 'Lock', chars: ['Mara'], minutes: 3, extra: { episode: 2 } }]);
    setSeriesPlan(show, { engine: 'A boat comes through each week.', changes: 'Mara learns to leave.', recurring: ['The lock'], continuation: 'It ends when the lock closes.' });
    expect(show.series).toMatchObject({ engine: 'A boat comes through each week.', changes: 'Mara learns to leave.', recurring: ['The lock'], continuation: 'It ends when the lock closes.' });
    show.worldRules.push({ id: 'w1', rule: 'The lock opens twice a day.', limit: 'Never at night.' });
    updateWorldRule(show, 'w1', { rule: 'The lock opens at dawn and dusk.', limit: 'Never in a storm.' });
    expect(show.worldRules[0]).toMatchObject({ rule: 'The lock opens at dawn and dusk.', limit: 'Never in a storm.' });
  });
});
