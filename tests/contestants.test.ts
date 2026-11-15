// Who competes (unscripted.ts contestantTraits): a contestant's skill weighs on who goes through, and their screen
// presence is the show's performance. Until November 15, 2026 results were a draw unrelated to who competed, and
// nothing outside the competition read who did.
import { describe, expect, it } from 'vitest';
import { contestantPresence, contestantTraits, decideCompetition, setFamily, setupCompetition } from '../src/engine/unscripted';
import type { GameState, Project } from '../src/engine/types';
import { assessQuality } from '../src/engine/finish';
import { approve, buildProject, startLife } from './helpers';

const seg = (id: string, ep: number, who: string[]) => ({
  id, episode: ep, heading: { intExt: 'INT' as const, place: 'Tent', time: 'DAY' as const }, storyLocation: 'Tent', participants: [], objective: 'The challenge', action: '', dialogue: [], turningPoint: '',
  estMinutes: 6, props: [], animals: [], vehicles: [], stunts: '', crowd: 0, intimacy: false, water: false, vfx: [], songs: [], dance: false, kind: 'segment' as const,
  basis: 'sourced' as const, contributorIds: who, evidenceIds: [], intentionalDiscontinuity: false,
});
const show = (s: GameState): Project => {
  const p = buildProject(s, { title: 'Bake Or Break', format: 'unscripted-series', medium: 'live-action', episodes: 3, runtime: 20 }, [], []);
  p.contributors.push(...['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({ id, name: `Baker ${id}`, role: 'Contestant', consent: 'given' as const })));
  setFamily(p, 'competition');
  setupCompetition(p, ['a', 'b', 'c', 'd'], 1);
  return p;
};

describe('contestants', () => {
  it('have a skill and a screen presence, the same every time they are read', () => {
    const s = startLife('contestants-traits');
    const p = show(s);
    const t = contestantTraits(s, p, 'a');
    expect(t).toEqual(contestantTraits(s, p, 'a'));
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) for (const v of Object.values(contestantTraits(s, p, id))) { expect(v).toBeGreaterThanOrEqual(30); expect(v).toBeLessThanOrEqual(90); }
  });

  it('a stronger contestant usually goes through further', () => {
    let skilledLonger = 0, runs = 0;
    for (let i = 0; i < 60; i++) {
      const s = startLife(`contestants-skill-${i}`);
      const p = show(s);
      p.worldRules.push({ id: 'fr1', rule: 'Four bakers, one tent.', limit: 'One day per episode.' });
      p.scenes.push(...[1, 2, 3].map((e) => seg(`s${e}`, e, ['a', 'b', 'c', 'd'])) as never[]);
      approve(s, p);
      decideCompetition(s, p, () => true);
      const c = p.unscripted!.competition!;
      if (c.results.length < 3) continue;
      const lasted = (id: string) => c.results.filter((r) => r.advancing.includes(id)).length + (c.results.at(-1)!.advancing[0] === id ? 1 : 0);
      const ids = ['a', 'b', 'c', 'd'].sort((x, y) => contestantTraits(s, p, y).skill - contestantTraits(s, p, x).skill);
      runs++;
      if (lasted(ids[0]) > lasted(ids[3])) skilledLonger++;
    }
    expect(runs).toBeGreaterThan(40);
    expect(skilledLonger / runs).toBeGreaterThan(0.6);
  });

  it('the contestants in the cut are what viewers watch: their presence, not the others\'', () => {
    const s = startLife('contestants-presence');
    const p = show(s);
    const scenes = [{ contributorIds: ['a', 'b', 'e'] }];
    const want = (contestantTraits(s, p, 'a').presence + contestantTraits(s, p, 'b').presence) / 2;
    expect(contestantPresence(s, p, scenes)).toBe(want); // e is a participant who isn't competing
    setFamily(p, 'observational');
    expect(contestantPresence(s, p, scenes)).toBeNull();
  });

  it('a show cast for presence is assessed better than one cast against it', () => {
    const s = startLife('contestants-quality');
    const p = show(s);
    p.worldRules.push({ id: 'fr1', rule: 'Four bakers, one tent.', limit: 'One day per episode.' });
    p.scenes.push(...[1, 2, 3].map((e) => seg(`s${e}`, e, ['a', 'b', 'c', 'd', 'e', 'f'])) as never[]);
    approve(s, p);
    const ids = ['a', 'b', 'c', 'd', 'e', 'f'].sort((x, y) => contestantTraits(s, p, y).presence - contestantTraits(s, p, x).presence);
    setupCompetition(p, ids.slice(0, 4), 1);
    const strong = assessQuality(s, p).overall;
    setupCompetition(p, ids.slice(2), 1);
    expect(strong).toBeGreaterThan(assessQuality(s, p).overall);
  });
});
