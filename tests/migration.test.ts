import { describe, expect, it } from 'vitest';
import { backupKey, deserialize, memoryStore, migrate, readSave, serialize, writeSave, SaveFormatError } from '../src/engine/save';
import { hashString } from '../src/engine/rng';
import { newGame } from '../src/engine/state';
import { getPlace } from '../src/data/places';
import { draft } from './fixtures';

/** A save as version 1 wrote it: no place registry, version 1. */
function v1Text(): { text: string; saveId: string } {
  const s = newGame(draft(), 0, 'old1') as unknown as Record<string, unknown>;
  delete s.places;
  s.version = 1;
  const data = JSON.stringify(s);
  return { text: JSON.stringify({ format: 'slate-save', version: 1, checksum: hashString(data), data }), saveId: 'old1' };
}

describe('save migration', () => {
  it('backs up a version-1 save, then migrates it to version 2 without losing anything', () => {
    const store = memoryStore();
    const { text, saveId } = v1Text();
    store.setItem(`slate.v1.save.${saveId}`, text);
    const s = readSave(store, saveId);
    expect(s.version).toBe(2);
    expect(s.places).toEqual({});
    expect(store.getItem(backupKey(saveId, 1))).toBe(text);
    expect(getPlace(s.locationId).geonameId).toBe('2643743'); // London's catalog ID is aliased to GeoNames
    // Writing it back stores version 2; reading again doesn't touch the backup.
    expect(writeSave(store, s, 5).ok).toBe(true);
    readSave(store, saveId);
    expect(store.getItem(backupKey(saveId, 1))).toBe(text);
  });
  it('is idempotent: migrating a version-2 save changes nothing', () => {
    const s = newGame(draft(), 0, 'new2');
    const once = migrate(JSON.parse(JSON.stringify(s)));
    expect(migrate(JSON.parse(JSON.stringify(once)))).toEqual(once);
    expect(deserialize(serialize(s))).toEqual(JSON.parse(JSON.stringify(s)));
  });
  it('refuses to migrate when no backup can be kept, leaving the save as it was', () => {
    const store = memoryStore();
    const { text, saveId } = v1Text();
    store.setItem(`slate.v1.save.${saveId}`, text);
    store.failWrites = true;
    expect(() => readSave(store, saveId)).toThrow(SaveFormatError);
    expect(store.getItem(`slate.v1.save.${saveId}`)).toBe(text);
  });
});

describe('saves that mention places the game can’t find', () => {
  it('refuse to open silently, then open after a repair that keeps a backup and changes only the places', async () => {
    const { MissingPlacesError, memoryStore, newGame, readSave, repairSave, writeSave } = await import('../src/engine');
    const { getPlace } = await import('../src/data/places');
    const { draft } = await import('./fixtures');
    const kv = memoryStore();
    const s = newGame(draft(), 1, 'rp');
    writeSave(kv, s, 1);
    // Damage it: the current location points at a place the game doesn't know.
    const env = JSON.parse(kv.getItem('slate.v1.save.rp')!);
    const data = JSON.parse(env.data);
    data.locationId = 'gn:999999999';
    const { serialize } = await import('../src/engine');
    kv.setItem('slate.v1.save.rp', serialize(data));
    let caught: InstanceType<typeof MissingPlacesError> | null = null;
    try { readSave(kv, 'rp'); } catch (e) { caught = e as InstanceType<typeof MissingPlacesError>; }
    expect(caught).toBeInstanceOf(MissingPlacesError);
    expect(caught!.ids).toEqual(['gn:999999999']);
    expect(caught!.uses['gn:999999999']).toEqual(['Where you are']);
    const damaged = kv.getItem('slate.v1.save.rp');
    const fixed = repairSave(kv, 'rp', { 'gn:999999999': getPlace('gb-london') }, 2);
    expect(fixed.locationId).toBe('gb-london');
    expect(kv.getItem('slate.v1.save.rp.backup-repair')).toBe(damaged);
    expect(readSave(kv, 'rp').character.name).toBe(s.character.name);
  });
});
