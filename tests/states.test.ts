// Appearance states with names, scene by scene (src/engine/looks.ts; the Creative Depth package, milestone C: costume
// and makeup continuity states). Controlled comparisons: one assignment changed at a time.
import { describe, expect, it } from 'vitest';
import { setLook } from '../src/engine/brief';
import { COSTUME_CHANGE_MIN, DAY_WORK_MIN, STATE_CHANGE_SHARE, changeMinutes, costumeCopies, makeup, makeupShare, stateIn, stateNames, statesOf, statesUsed } from '../src/engine/looks';
import { deserialize, serialize } from './engine-api';
import type { GameState, Project } from '../src/engine/types';
import { buildProject, startLife } from './helpers';

function film(): { s: GameState; p: Project } {
  const s = startLife('states');
  const p = buildProject(s, { title: 'States Fixture', format: 'feature', medium: 'live-action' }, [{ name: 'Wren' }, { name: 'Dale' }],
    [{ place: 'Office', chars: ['Wren', 'Dale'] }, { place: 'Office', chars: ['Wren'] }, { place: 'Street', intExt: 'EXT', chars: ['Wren', 'Dale'] }]);
  return { s, p };
}
const wren = (p: Project) => p.characters[0];

describe('named looks, scene by scene', () => {
  it('names set the number of looks, are kept as written, and survive a save', () => {
    const { s, p } = film();
    setLook(p, wren(p).id, { named: [' Clean ', 'Bloodied', '', 'Turned'] });
    expect(wren(p).look).toEqual({ named: ['Clean', 'Bloodied', 'Turned'], states: 3 });
    expect([statesOf(wren(p)), stateNames(wren(p))]).toEqual([3, ['Clean', 'Bloodied', 'Turned']]);
    expect(deserialize(serialize(s)).projects[0].characters[0].look).toEqual(wren(p).look);
    // A count with no names is numbered; one name alone is not a set of looks.
    setLook(p, wren(p).id, { states: 2 });
    expect(stateNames(wren(p))).toEqual(['Look 1', 'Look 2']);
    setLook(p, wren(p).id, { named: ['Only'] });
    expect(wren(p).look).toBeUndefined();
  });

  it('a scene is in the first look until it says otherwise, and a look that is removed falls back to the first', () => {
    const { p } = film();
    setLook(p, wren(p).id, { named: ['Clean', 'Bloodied', 'Turned'] });
    expect(p.scenes.map((sc) => stateIn(sc, wren(p)))).toEqual([0, 0, 0]);
    p.scenes[1].states = { [wren(p).id]: 2 };
    expect(statesUsed(wren(p), p.scenes)).toEqual([0, 2]);
    setLook(p, wren(p).id, { named: ['Clean', 'Bloodied'] });
    expect(p.scenes[1].states).toBeUndefined();
    expect(stateIn(p.scenes[1], wren(p))).toBe(0);
  });

  it('only the looks that appear are made, once a scene says which it is in', () => {
    const { p } = film();
    setLook(p, wren(p).id, { named: ['Clean', 'Bloodied', 'Turned'] });
    expect(costumeCopies(wren(p), p.scenes)).toBe(3); // declared, nothing assigned: every look is taken to be used
    p.scenes[1].states = { [wren(p).id]: 1 };
    expect(costumeCopies(wren(p), p.scenes)).toBe(2); // clean and bloodied appear; turned never does
    p.scenes[2].states = { [wren(p).id]: 2 };
    expect(costumeCopies(wren(p), p.scenes)).toBe(3);
    // A stunt still doubles them.
    p.scenes[2].stunts = 'A fall';
    expect(costumeCopies(wren(p), p.scenes)).toBe(6);
  });

  it('changing looks inside a shooting day takes time out of it; a day in one look loses nothing', () => {
    const { p } = film();
    setLook(p, wren(p).id, { named: ['Clean', 'Bloodied'] });
    const day = [p.scenes[0], p.scenes[1]];
    expect(changeMinutes(day, p.characters)).toBe(0);
    expect(makeupShare(day, p.characters, 1)).toBe(1);
    p.scenes[1].states = { [wren(p).id]: 1 };
    expect(changeMinutes(day, p.characters)).toBe(COSTUME_CHANGE_MIN);
    expect(makeupShare(day, p.characters, 1)).toBeCloseTo(1 - COSTUME_CHANGE_MIN / DAY_WORK_MIN, 10);
    // With makeup, the change is half the chair time again as well.
    setLook(p, wren(p).id, { named: ['Clean', 'Bloodied'], makeup: 'wounds' });
    p.scenes[1].states = { [wren(p).id]: 1 };
    expect(changeMinutes(day, p.characters)).toBe(COSTUME_CHANGE_MIN + makeup('wounds')!.chairMin * STATE_CHANGE_SHARE);
    // The other scene of that look alone, on another day, costs no change; nor does someone else's day.
    expect(changeMinutes([p.scenes[1]], p.characters)).toBe(0);
    expect(changeMinutes([p.scenes[0], p.scenes[2]], p.characters)).toBe(0);
  });
});
