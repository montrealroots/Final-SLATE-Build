// The game's own people age (src/engine/people.ts, November 10, 2026): each has a date of birth drawn from the save's seed,
// their age turns on their birthday, and a performer's playing range follows their age. Nothing about them is stored, so
// a save made before this keeps every person exactly as it was, now with a date of birth.
import { describe, expect, it } from 'vitest';
import { candidates, personAge, personById, playingAgeAt } from '../src/engine/people';
import { roleCandidates } from '../src/engine';
import { fitNotes } from '../src/engine/casting-notes';
import { DAY } from '../src/engine/time';
import { approve, buildProject } from './helpers';
import { dateKey } from '../src/engine/time';
import { startLife } from './helpers';

describe('the game\'s own people age', () => {
  const s = startLife('people-ages');
  const start = dateKey(s.startedAt, 'UTC');
  const actors = candidates(s, 'actor', 'GB');
  const crew = candidates(s, 'editor', 'GB');

  it('gives everyone a date of birth from the save\'s seed, the same each time', () => {
    for (const p of [...actors, ...crew]) expect(p.born).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const again = startLife('people-ages');
    expect(candidates(again, 'actor', 'GB').map((p) => p.born)).toEqual(actors.map((p) => p.born));
    expect(personById(s, actors[3].id)).toBe(actors[3]);
  });

  it('puts an adult performer\'s age inside the range they play when the story begins, and keeps that range as it was', () => {
    for (const p of actors) {
      const age = personAge(p, start);
      if (age < 18) continue;
      expect(age).toBeGreaterThanOrEqual(p.playingAge![0]);
      expect(age).toBeLessThanOrEqual(p.playingAge![1]);
      expect(playingAgeAt(p, start)).toEqual([Math.max(16, p.playingAge![0]), p.playingAge![1]]);
    }
  });

  it('ages crew with their experience: someone leading in their role is older than someone new to it, on average', () => {
    const pool = ['editor', 'dop', 'composer', 'production-designer', 'gaffer', 'line-producer', 'animator', 'sound-mixer'].flatMap((r) => candidates(s, r, 'GB'));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const byLevel = (lo: number, hi: number) => mean(pool.filter((p) => p.experience >= lo && p.experience <= hi).map((p) => personAge(p, start)));
    expect(byLevel(4, 5)).toBeGreaterThan(byLevel(1, 2) + 8);
    for (const p of pool) expect(personAge(p, start)).toBeGreaterThanOrEqual(18);
  });

  it('turns their age on their birthday, and moves the ages they play with it', () => {
    const p = actors.find((x) => personAge(x, start) >= 25)!;
    // Their birthday ten years after the story begins, and the day before it.
    const year = Number(start.slice(0, 4)) + 10;
    const birthday = `${year}${p.born.slice(4) === '-02-29' ? '-02-28' : p.born.slice(4)}`;
    const dayBefore = new Date(Date.parse(`${birthday}T12:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
    const turning = year - Number(p.born.slice(0, 4));
    expect(personAge(p, dayBefore)).toBe(turning - 1);
    expect(personAge(p, birthday)).toBe(turning);
    const before = birthday;
    const then = playingAgeAt(p, start)!;
    const later = playingAgeAt(p, before)!;
    expect(later[1] - later[0]).toBe(p.playingAge![1] - p.playingAge![0]);
    expect(later[0]).toBeGreaterThan(then[0]);
  });

  it('keeps a child\'s range narrow, and an adult from playing under 16', () => {
    const child = { ...actors[0], born: '2016-03-01', playingAge: [8, 22] as [number, number] };
    expect(playingAgeAt(child, '2026-06-01')).toEqual([8, 12]);
    expect(playingAgeAt({ ...child, born: '2026-01-01' }, '2026-06-01')).toEqual([0, 2]); // a baby plays a baby
    expect(playingAgeAt(child, '2035-06-01')).toEqual([16, 25]); // 19: a range as wide as the start's, none of it under 16
  });

  it('has no playing range for anyone who isn\'t a performer', () => {
    expect(playingAgeAt(crew[0], start)).toBeUndefined();
  });

  it('reads the ages a performer plays today when casting: one right for a part when the story began has aged out of it ten years on', () => {
    const t = startLife('people-ages-cast');
    const p = buildProject(t, { title: 'Night Ferry', format: 'short', medium: 'live-action', runtime: 10 },
      [{ name: 'Ines', patch: { roleSize: 'lead' } }], [{ place: 'Dock', chars: ['Ines'], minutes: 3 }]);
    const actor = roleCandidates(t, p, 'actor').find((c) => personAge(c, dateKey(t.startedAt, 'UTC')) >= 25)!;
    const then = playingAgeAt(actor, dateKey(t.now, 'UTC'))!;
    const ines = p.characters.find((c) => c.name === 'Ines')!;
    ines.ageInStory = String(then[0]); // written into the script before it is approved: casting reads the approved script
    approve(t, p);
    const note = (x: string) => x.startsWith('Usually plays ages');
    expect(fitNotes(t, p, actor, ines.id).filter(note)).toEqual([]);
    t.now += 3653 * DAY;
    const later = playingAgeAt(actor, dateKey(t.now, 'UTC'))!;
    expect(fitNotes(t, p, actor, ines.id).filter(note)).toEqual([`Usually plays ages ${later[0]} to ${later[1]}; the part is ${then[0]}.`]);
  });
});
