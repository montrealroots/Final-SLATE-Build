// Real people's grades and pay in the game (November 15, 2026): a capability and a rate read from how the industry has
// judged their work (recognition.ts), the same in every save; recognised crew offered in the hiring lists; a makeup
// artist's or a gaffer's catalog credits counted for that job; and SAG-AFTRA's minimum on every performer's offer.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { candidatesFor, makeOffer, roleCandidates } from './engine-api';
import { considerPerson, jobsOf, realPerson, type RecordedPerson } from '../src/engine/guests';
import { gradeOf } from '../src/engine/grades';
import { personById } from '../src/engine/people';
import { applyRecognition, standingOf } from '../src/engine/recognition';
import { considerRecognised } from '../src/engine/recognition-hire';
import { crewAskFrom } from '../src/engine/recognition-pay';
import { setFinanceTarget } from '../src/engine/finance';
import { approve, buildProject, startLife } from './helpers';
import type { GameState } from '../src/engine/types';

applyRecognition(JSON.parse(readFileSync('src/data/recognition.json', 'utf8')));
const today = (s: GameState) => new Date(s.now).toISOString().slice(0, 10);
const film = (s: GameState, budget: number) => {
  const p = buildProject(s, { title: 'Salt Line', format: 'feature', medium: 'live-action', runtime: 90 }, [{ name: 'Mara', patch: { roleSize: 'lead' } }], [{ place: 'Harbour Office', chars: ['Mara'] }]);
  approve(s, p);
  setFinanceTarget(p, budget);
  return p;
};

describe('a real person graded by how the industry has judged them', () => {
  it('a makeup artist recognised by the Academy is offered for makeup, graded A, at a recognised rate', () => {
    const s = startLife('recognised-1');
    const p = film(s, 10_000_000);
    // Rick Baker (TMDB 16178): seven Academy Awards for makeup, recorded on Wikidata.
    considerRecognised(s, p, 16178, { roleId: 'hair-makeup' }, today(s));
    const rb = realPerson(s, 'tp_16178')!;
    expect(rb.rec?.awards).toBe(true);
    expect(jobsOf(rb)).toContain('hair-makeup');
    const g = gradeOf(s, personById(s, 'tp_16178', 'hair-makeup'), 'hair-makeup');
    expect(g.grade).toBe('A');
    expect(g.madeOf.join(' ')).toMatch(/Academy Award win/);
    const st = standingOf(16178, 'hair-makeup', 2026)!;
    expect(rb.sim.jobs['hair-makeup'].rate).toBe(crewAskFrom('hair-makeup', rb.sim.jobs['hair-makeup'].exp, st.points));
    expect(candidatesFor(s, p, 'hair-makeup').some((c) => c.id === 'tp_16178')).toBe(true);
  });

  it('is the same in every save: nothing about them is drawn at random', () => {
    const one = startLife('recognised-a');
    const two = startLife('recognised-b');
    considerRecognised(one, film(one, 500_000), 16178, { roleId: 'hair-makeup' }, today(one));
    considerRecognised(two, film(two, 500_000), 16178, { roleId: 'hair-makeup' }, today(two));
    expect(realPerson(one, 'tp_16178')!.sim.jobs).toEqual(realPerson(two, 'tp_16178')!.sim.jobs);
  });

  it("counts a makeup artist's and a gaffer's catalog credits for those jobs", () => {
    const s = startLife('recognised-2');
    const crew: RecordedPerson = { id: 900001, name: 'Nell Ashby (Fixture)', details: { birthday: '1975-01-01', deathday: null, retrievedAt: '2026-01-02' },
      credits: [{ kind: 'crew', role: 'Makeup Artist', date: '2020-01-01' }, { kind: 'crew', role: 'Key Makeup Artist', date: '2022-01-01' }, { kind: 'crew', role: 'Gaffer', date: '2023-01-01' }] };
    const p = considerPerson(s, crew, '2026-01-02');
    expect(jobsOf(p)).toEqual(expect.arrayContaining(['hair-makeup', 'gaffer']));
    expect(p.rec?.ev['hair-makeup'].n).toBe(2);
  });
});

describe("SAG-AFTRA's minimum on every performer's offer", () => {
  it('lifts what performers ask on a production above $2 million to $1,246 a day, and refuses an offer below it', () => {
    const s = startLife('scale-1');
    const p = film(s, 10_000_000);
    const actors = roleCandidates(s, p, 'actor');
    expect(Math.min(...actors.map((a) => a.dayRate))).toBeGreaterThanOrEqual(1246);
    const mara = p.characters[0].id;
    expect(() => makeOffer(s, p, { personId: actors[0].id, roleId: 'actor', dayRate: 1000, characterId: mara, method: 'on-camera' }))
      .toThrow("Under the SAG-AFTRA Theatrical Agreement, which a production of this budget works under, a performer's day is at least $1,246.");
    expect(() => makeOffer(s, p, { personId: actors[0].id, roleId: 'actor', dayRate: 1246, characterId: mara, method: 'on-camera' })).not.toThrow();
  });

  it('asks less of a low-budget production, under its own agreement', () => {
    const s = startLife('scale-2');
    const p = film(s, 250_000); // the fixture's budget is $400,000: the target only raises it
    const actors = roleCandidates(s, p, 'actor');
    expect(actors.some((a) => a.dayRate < 1246)).toBe(true); // nobody lifted to the full agreement's minimum
    expect(() => makeOffer(s, p, { personId: actors[0].id, roleId: 'actor', dayRate: 200, characterId: p.characters[0].id, method: 'on-camera' }))
      .toThrow(/Moderate Low Budget Agreement.*at least \$436\./);
  });
});
