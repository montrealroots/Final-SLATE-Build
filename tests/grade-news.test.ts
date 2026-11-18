// Grade news (grade-news.ts; the owner, November 18, 2026: "so I know when I level up"). A grade is read from the record;
// the grade last told is kept, and each change is told once, with what moved it and what it opens. Labelled fixtures:
// delivered films are written into the save with their assessments, as tests/studio-projects.test.ts does.
import { describe, expect, it } from 'vitest';
import { createProject, setFinanceTarget } from './engine-api';
import { noticeGrades } from '../src/engine/grade-news';
import { standingIn } from '../src/engine/reputation';
import { deserialize, serialize } from '../src/engine/save';
import type { GameState, Project } from '../src/engine/types';
import { approve, buildProject, startLife, writePitch } from './helpers';

function film(s: GameState, score: number, title: string): Project {
  const p = createProject(s, { title, scenarioId: 'low', axes: { format: 'feature', medium: 'live-action', targetRuntimeMin: 90 } });
  const q = buildProject(s, { title: 'tmp', format: 'short', medium: 'live-action', runtime: 10 }, [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
  p.characters = q.characters; p.scenes = q.scenes; writePitch(p);
  s.projects = s.projects.filter((x) => x.id !== q.id);
  approve(s, p); setFinanceTarget(p, 400_000);
  p.delivered = { at: s.now, runtimeMin: 90 }; p.phase = 'delivered'; p.quality = { reception: score, script: score, direction: score } as Project['quality'];
  return p;
}

describe('grade news', () => {
  it('a new life starts Emerging in every role, and nothing is told until a grade moves', () => {
    const s = startLife('gn-new');
    expect(s.gradesHeard).toEqual({ writing: 'Emerging', directing: 'Emerging', acting: 'Emerging', producing: 'Emerging' });
    expect(noticeGrades(s)).toEqual([]);
  });

  it('tells a rise once, with what moved it and what it opens; and a fall', () => {
    const s = startLife('gn-rise');
    film(s, 70, 'Salt Road');
    expect(noticeGrades(s, 'the reception of Salt Road')).toEqual([]); // one work: Established needs two
    film(s, 76, 'Harbour Lights');
    expect(standingIn(s, 'directing').grade).toBe('Established');
    const told = noticeGrades(s, 'the reception of Harbour Lights');
    expect(told).toContain("You're now Established as a director, up from Emerging, after the reception of Harbour Lights. Studios may now offer you pictures of up to $160,000,000. When you ask for a better rate for this work, it is now agreed.");
    expect(told).toContain("You're now Established as a producer, up from Emerging, after the reception of Harbour Lights.");
    expect(s.log[0].route).toEqual({ view: 'profile' });
    expect(noticeGrades(s, 'nothing new')).toEqual([]);
    // A poorly received film brings the standing back under Established.
    film(s, 5, 'Low Tide');
    expect(noticeGrades(s, 'the reception of Low Tide')).toContain("Your standing as a director has slipped from Established to Emerging, after the reception of Low Tide. Studios won't offer you their own pictures in this role until it's back. A request for a better rate is no longer agreed as a matter of course.");
  });

  it('a save from before grade news starts from the grades it has, telling nothing old as new', () => {
    const s = startLife('gn-old');
    film(s, 70, 'Salt Road'); film(s, 76, 'Harbour Lights');
    delete s.gradesHeard;
    const loaded = deserialize(serialize(s));
    expect(loaded.gradesHeard?.directing).toBe('Established');
    expect(loaded.log.some((l) => l.text.startsWith("You're now"))).toBe(false);
  });
});
