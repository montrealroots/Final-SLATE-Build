import { describe, expect, it } from 'vitest';
import {
  SaveFormatError, SaveTooNewError, deserialize, listSaves, memoryStore, newGame, openSave, readSave, serialize, writeSave,
} from '../src/engine';
import { hashString } from '../src/engine/rng';
import type { GameState } from '../src/engine/types';
import { draft } from './fixtures';

const KEY = 'slate.v1.save.r1';

/** A store that can fail writes to keys matching a pattern, to simulate a full or failing disk part-way through. */
function flakyStore() {
  const kv = memoryStore();
  let failOn: RegExp | null = null;
  const real = kv.setItem;
  kv.setItem = (k: string, v: string) => {
    if (failOn && failOn.test(k)) throw new Error('QuotaExceededError');
    real(k, v);
  };
  return { kv, failOn: (r: RegExp | null) => { failOn = r; } };
}

function game(): GameState {
  return newGame(draft(), 1, 'r1');
}

/** Re-wrap state as a stored save with a correct checksum, however damaged its contents. */
function wrap(state: unknown): string {
  const data = JSON.stringify(state);
  return JSON.stringify({ format: 'slate-save', version: (state as { version: number }).version, checksum: hashString(data), data });
}

describe('save recovery and integrity', () => {
  it('keeps the previous good save as a backup after every successful write', () => {
    const kv = memoryStore();
    const s = game();
    expect(writeSave(kv, s, 1).ok).toBe(true);
    s.saveName = 'Second';
    expect(writeSave(kv, s, 2).ok).toBe(true);
    expect(deserialize(kv.getItem(`${KEY}.bak`)!).saveName).not.toBe('Second');
    expect(kv.getItem(`${KEY}.tmp`)).toBeNull();
  });

  it('recovers from the backup when the main save is corrupted, and keeps the damaged copy', () => {
    const kv = memoryStore();
    const s = game();
    writeSave(kv, s, 1);
    s.saveName = 'Later';
    writeSave(kv, s, 2);
    kv.setItem(KEY, kv.getItem(KEY)!.slice(0, 200)); // truncated by an interrupted write
    const damaged = kv.getItem(KEY)!;
    const { state, recovery } = openSave(kv, 'r1', 3);
    expect(state.saveId).toBe('r1');
    expect(recovery?.source).toBe('backup');
    expect(kv.getItem(recovery!.damagedKey!)).toBe(damaged);
    expect(kv.getItem(KEY)).toBe(damaged); // never overwritten on open
    // The next save keeps the damaged copy where it was put.
    writeSave(kv, state, 4);
    expect(kv.getItem(recovery!.damagedKey!)).toBe(damaged);
  });

  it('recovers when the main save is readable but fails validation', () => {
    const kv = memoryStore();
    const s = game();
    writeSave(kv, s, 1);
    writeSave(kv, s, 2);
    const bad = JSON.parse(JSON.stringify(s));
    bad.now = 'tomorrow';
    kv.setItem(KEY, wrap(bad));
    const { recovery } = openSave(kv, 'r1', 3);
    expect(recovery?.source).toBe('backup');
    expect(recovery?.problem).toMatch(/clock/);
  });

  it('uses a complete temporary copy left by a write that stopped before replacing the save', () => {
    const kv = memoryStore();
    const s = game();
    writeSave(kv, s, 1);
    s.saveName = 'Interrupted';
    kv.setItem(`${KEY}.tmp`, serialize(s));
    kv.setItem(KEY, 'garbage');
    const { state, recovery } = openSave(kv, 'r1', 2);
    expect(recovery?.source).toBe('interrupted-write');
    expect(state.saveName).toBe('Interrupted');
  });

  it('refuses a save from a newer version without falling back to an older backup or changing it', () => {
    const kv = memoryStore();
    const s = game();
    writeSave(kv, s, 1);
    writeSave(kv, s, 2);
    const newer = { ...JSON.parse(JSON.stringify(s)), version: 99 };
    kv.setItem(KEY, wrap(newer));
    const before = kv.getItem(KEY);
    expect(() => openSave(kv, 'r1', 3)).toThrow(SaveTooNewError);
    expect(kv.getItem(KEY)).toBe(before);
  });

  it('a write that fails part-way leaves the last good save readable and reports failure', () => {
    const { kv, failOn } = flakyStore();
    const s = game();
    expect(writeSave(kv, s, 1).ok).toBe(true);
    s.saveName = 'Never Saved';
    failOn(/^slate\.v1\.save\.r1$/); // the final replace fails
    expect(writeSave(kv, s, 2).ok).toBe(false);
    failOn(null);
    expect(readSave(kv, 'r1').saveName).not.toBe('Never Saved');
  });

  it('reports failure when only the index write fails, and the index is rebuilt from the saves', () => {
    const { kv, failOn } = flakyStore();
    const s = game();
    failOn(/index$/);
    const res = writeSave(kv, s, 1);
    expect(res.ok).toBe(false); // "Saved" is never reported for a partial save
    failOn(null);
    expect(listSaves(kv).map((x) => x.saveId)).toEqual(['r1']);
    kv.setItem('slate.v1.index', '{not json');
    expect(listSaves(kv).map((x) => x.saveId)).toEqual(['r1']);
  });

  it('explains malformed nested data instead of accepting it', () => {
    const cases: [string, (x: Record<string, any>) => void, RegExp][] = [
      ['character birth date', (x) => { x.character.birth = { year: 1999, month: 2, day: 30 }; }, /birth date/],
      ['pronouns', (x) => { x.character.pronouns = 'xe'; }, /pronouns/],
      ['settings', (x) => { x.settings.theme = 'neon'; }, /settings/],
      ['event time', (x) => { x.events[0].at = Infinity; }, /scheduled event/],
      ['place coordinates', (x) => { x.places['gn:1'] = { id: 'gn:1', name: 'X', lat: 200, lon: 0, zone: 'UTC', country: 'GB' }; }, /place/],
      ['travel', (x) => { x.travel = { to: 1, from: 'gb-london', arriveAt: 0 }; }, /trip/],
    ];
    for (const [name, damage, msg] of cases) {
      const x = JSON.parse(JSON.stringify(game()));
      damage(x);
      expect(() => deserialize(wrap(x)), name).toThrow(SaveFormatError);
      expect(() => deserialize(wrap(x)), name).toThrow(msg);
    }
  });
});

describe('malformed projects inside a save', () => {
  it('names the damaged part of a project', async () => {
    const { approve, buildProject, castAll, staffAll, startLife, startProduction } = await import('./helpers');
    const s = startLife('mal', 'gb-london');
    const p = buildProject(s, { title: 'Glass', format: 'short', medium: 'live-action', scenario: 'micro' }, [{ name: 'A', patch: { roleSize: 'lead' } }], [{ place: 'Room', chars: ['A'], minutes: 2 }]);
    approve(s, p);
    castAll(s, p);
    staffAll(s, p);
    startProduction(s, p, 10);
    expect(() => deserialize(serialize(s))).not.toThrow(); // the sound save opens
    const cases: [string, (x: Record<string, any>) => void, RegExp][] = [
      ['NaN amount', (x) => { x.projects[0].obligations[0].amount = null; }, /budget line .* invalid amount/],
      ['duplicate payment', (x) => { const o = x.projects[0].obligations[0]; o.postings.push({ ...o.postings[0] }); }, /same payment twice/],
      ['missing dependency', (x) => { x.projects[0].tasks[x.projects[0].tasks.length - 1].dependsOn.push('no:such:task'); }, /depends on work that does not exist/],
      ['dangling hire', (x) => { x.projects[0].hires[0].obligationId = 'o-missing'; }, /budget line that does not exist/],
      ['impossible shoot date', (x) => { x.projects[0].schedule.days[0].date = '2026-02-30'; }, /shoot day .* impossible date/],
      ['unknown format', (x) => { x.projects[0].axes.format = 'opera'; }, /unknown format/],
    ];
    for (const [name, damage, msg] of cases) {
      const x = JSON.parse(JSON.stringify(s));
      damage(x);
      expect(() => deserialize(wrap(x)), name).toThrow(msg);
    }
  });
});
